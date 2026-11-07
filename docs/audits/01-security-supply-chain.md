# Track 1 Audit: Security & Supply Chain

Audited commit: `13e02b15ab998e10b42a64bb36f6640725bd2614` (`overhaul/v1`)
Tools executed: `shellcheck`, `/bin/bash -n`, `sh -n`, `npm audit`, `npm view`, PyPI JSON API, `openssl dgst -sha384`, headless Chromium XSS & network request capture, isolated `mktemp -d` installer probes.

## Dependency & License Inventory

| Component | Kind | Current Spec | Verified Latest | License | Integrity / Pinning Status |
|---|---|---|---|---|---|
| `vibecraft-claude-plugin` | Root `package.json` | `1.0.0` | Local | `MIT` | Zero npm runtime dependencies; no lockfile (`npm audit` exits `ENOLOCK`) |
| `@modelcontextprotocol/server-filesystem` | MCP server (`npx -y`) | Unpinned | `2.2.0` | MIT (`SEE LICENSE IN LICENSE`) | **Unpinned** (`npx -y` fetches arbitrary future `latest`) |
| `@brave/brave-search-mcp-server` | MCP server (`npx -y`) | Unpinned | `2.1.4` | `MIT` | **Unpinned** (`npx -y` fetches arbitrary future `latest`) |
| `mcp-server-fetch` | MCP server (`uvx`) | Unpinned | `2026.11.4` | `MIT` | **Unpinned** (`uvx` resolves unpinned PyPI latest) |
| `https://cdn.tailwindcss.com` | Browser `<script>` | Unpinned (`3.4.17` redirect) | N/A (dev JIT) | MIT | **Unpinned remote JS execution, zero SRI** |
| `https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js` | Browser `<script>` | `11.4.1` | `11.4.1` | MIT | Versioned URL, **missing `integrity` SRI & `crossorigin`** |
| `https://fonts.googleapis.com/css2?...` | Browser `<link>` | Unpinned | N/A | OFL | External font requests leak client IP + Referer on every open |

---

## Findings

```text
ID: SEC-01        Severity: high
Where: claude_desktop_config.json:5,9,16
What: MCP server entries invoke `npx -y` and `uvx` without pinned package versions.
Evidence: `"args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/Projects"]`, `"args": ["-y", "@brave/brave-search-mcp-server"]`, `"args": ["mcp-server-fetch"]`.
Impact: A compromised or breaking upstream publish to npm or PyPI executes automatically with user privileges (and filesystem read/write access) the next time Claude Desktop or Claude Code starts.
Fix: Pin exact verified versions: `@modelcontextprotocol/server-filesystem@2.2.0`, `@brave/brave-search-mcp-server@2.1.4`, and `uvx --from mcp-server-fetch==2026.11.4 mcp-server-fetch`.
Verify: Inspect `.mcp.json` and `claude_desktop_config.json` with an automated test asserting every `npx` and `uvx` package carries an exact semver/PEP-440 version pin.
```

```text
ID: SEC-02        Severity: high
Where: templates/generative-ui/launchpad_artifact.html:451
What: `buildAssets()` injects `LAUNCH.logo` into four DOM containers via raw `box.innerHTML = LAUNCH.logo` without sanitization.
Evidence: Headless Chromium test with `logo: '<svg viewBox="0 0 64 64"><img src="x" onerror="window.__vcXss = (window.__vcXss || 0) + 1"></svg>'` executed inline JavaScript 4 times (`launchpadLogoInnerHtmlXssCount: 4`).
Impact: Prompt injection or untrusted model output inside `LAUNCH.logo` achieves arbitrary script execution inside the browser or artifact webview context.
Fix: Parse `LAUNCH.logo` with `DOMParser` (`image/svg+xml`) and clone only allowlisted geometric SVG elements (`svg`, `g`, `rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`) and safe non-event attributes (`viewBox`, `width`, `height`, `rx`, `ry`, `x`, `y`, `cx`, `cy`, `r`, `d`, `points`, `x1`, `y1`, `x2`, `y2`, `fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `style` restricted to `var(--...)` tokens, `role`, `aria-label`).
Verify: Run Playwright XSS test with `<script>`, `<img onerror>`, `<foreignObject>`, `onload`, and `javascript:` `href` payloads in `LAUNCH.logo` and assert zero script execution and clean fallback rendering.
```

```text
ID: SEC-03        Severity: high
Where: templates/generative-ui/brand_studio_artifact.html:10, launchpad_artifact.html:10, qa_diff_artifact.html:10, stack_matrix_artifact.html:10
What: All four HTML artifacts execute unpinned remote JavaScript from `https://cdn.tailwindcss.com` without Subresource Integrity (SRI).
Evidence: Network capture recorded `https://cdn.tailwindcss.com/` -> `302` redirect to `https://cdn.tailwindcss.com/3.4.17` on every artifact open, plus console warning `cdn.tailwindcss.com should not be used in production`.
Impact: CDN compromise injects arbitrary JS into every local or hosted artifact; strict artifact sandbox CSPs block external `<script>` execution and break layout (`gridDisplay: "block"`, `bodyPadding: "0px"`).
Fix: Remove `cdn.tailwindcss.com` from all four templates and inline a deterministic compiled utility and component stylesheet via `scripts/build-templates.mjs`.
Verify: Block all external requests in Playwright (`context.route('https://**', r => r.abort())`) and assert zero external script requests (except SRI-pinned optional Mermaid with fallback), zero console warnings, and intact CSS Grid layout.
```

```text
ID: SEC-04        Severity: medium
Where: templates/generative-ui/launchpad_artifact.html:11
What: External Mermaid script (`https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js`) lacks `integrity` and `crossorigin="anonymous"` attributes.
Evidence: `<script src="https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js"></script>` has no `integrity` hash; computed SHA-384 of the exact artifact is `sha384-rbtjAdnIQE/aQJGEgXrVUlMibdfTSa4PQju4HDhN3sR2PmaKFzhEafuePsl9H/9I`.
Impact: If jsDelivr is compromised or MITM-tampered, tampered script code executes in `launchpad_artifact.html` without browser SRI rejection.
Fix: Add `integrity="sha384-rbtjAdnIQE/aQJGEgXrVUlMibdfTSa4PQju4HDhN3sR2PmaKFzhEafuePsl9H/9I" crossorigin="anonymous"` and preserve `<pre>` source fallback when blocked or offline.
Verify: Test `launchpad_artifact.html` in Chromium both with valid SRI (renders SVG) and with corrupted SRI / blocked network (rejects tampered script and renders clean `<pre>` Mermaid source).
```

```text
ID: SEC-05        Severity: medium
Where: install.sh:146-147,171,193
What: `install.sh` expands arbitrary `${VAR}` placeholders from `process.env` and persists plaintext `BRAVE_API_KEY` into `claude_desktop_config.json`.
Evidence: Probe with `"args": ["${UNINTENDED_SECRET_VAR}"]` printed `"LEAKED_ENV_VALUE_123"`; probe with `BRAVE_API_KEY="TEST_DUMMY_KEY_DO_NOT_USE"` wrote the literal secret into `claude_desktop_config.json` (`Plaintext key occurrences in config: 1`) and copied it into subsequent `.bak-*` files.
Impact: Any `${NAME}` token in config templates leaks caller environment variables into disk files, and `BRAVE_API_KEY` is persisted in cleartext JSON and backups unless masked or explicitly requested for Claude Desktop (which does not expand shell env vars natively).
Fix: Remove generic `process.env[name]` expansion completely; in `.mcp.json` (Claude Code) keep `${BRAVE_API_KEY}` literal env-var reference; in `install.sh` / `install.ps1` only write Desktop Brave key when explicitly passed via `--persist-brave-key` or interactive confirmation with `0600` enforced on both config and backups, defaulting to env reference or skipping when unset.
Verify: Run installer E2E test verifying arbitrary `${OTHER_VAR}` is never expanded from `process.env`, `.mcp.json` retains `${BRAVE_API_KEY}`, and both config and backup files strictly have mode `0600`.
```

```text
ID: SEC-06        Severity: medium
Where: install.sh:130
What: Backup creation `cp -p "$CONFIG_PATH" "$BACKUP_PATH"` preserves permissive `0644` file modes on existing `claude_desktop_config.json` files.
Evidence: Fuzz test starting from a `0644` `claude_desktop_config.json` produced `-rw-r--r-- claude_desktop_config.json.bak-20261106224607-85565` (`0644` world-readable), whereas the merged config was written as `0600`.
Impact: Pre-existing secrets in `claude_desktop_config.json` (such as other MCP server tokens) remain world-readable in `.bak-*` files on multi-user systems.
Fix: Set `umask 077` before creating backups/temp files and explicitly `chmod 600 "$BACKUP_PATH"` after copying.
Verify: Seed a `0644` config in a throwaway `HOME`, run `./install.sh --yes`, and assert `stat` mode on both `claude_desktop_config.json` and `claude_desktop_config.json.bak-*` equals `0600`.
```

```text
ID: SEC-07        Severity: medium
Where: claude_desktop_config.json:5, install.sh:96
What: `vibecraft-filesystem` defaults to granting read/write MCP access across all of `${HOME}/Projects` instead of the active project workspace.
Evidence: `"args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/Projects"]`.
Impact: In Claude Code (which already has workspace-scoped tools) or in a shared `~/Projects` directory holding unrelated private repos and `.env` files, any prompt injection during a session can read or modify sibling repositories.
Fix: Scope `.mcp.json` for Claude Code to `.` (or omit redundant filesystem MCP where native tools apply, or scope to `${PWD}`), and in `install.sh` / `README.md` document dedicated empty workspace scoping (`~/Projects/vibecraft-workspace`) with clear security guidance.
Verify: Inspect `.mcp.json` and installer output in automated tests to confirm least-privilege directory scoping.
```

```text
ID: SEC-08        Severity: low
Where: install.sh:7
What: Executing `install.sh` via stdin (`curl -fsSL ... | bash`) crashes immediately with `BASH_SOURCE[0]: unbound variable` due to `set -u`.
Evidence: `$ cat install.sh | /bin/bash -s -- --help` -> `/bin/bash: line 7: BASH_SOURCE[0]: unbound variable` (exit code 1).
Impact: Users running a piped install command fail immediately; worse, partial script execution behavior under `sh` or `bash` without `BASH_SOURCE` guard is undefined.
Fix: Guard `${BASH_SOURCE[0]:-}`; when empty or when adjacent repo files are absent, safely download the pinned release archive over HTTPS into a `0700` `mktemp -d` directory cleaned up on `EXIT`, verify structure, and run from there (while documenting download-inspect-run first in `README.md`).
Verify: Pipe `cat install.sh | /bin/bash -s -- --help` and `cat install.sh | HOME="$TEST_HOME" /bin/bash -s -- --dry-run --yes` (with local tarball override for offline testing) and assert exit `0`.
```

```text
ID: SEC-09        Severity: low
Where: templates/generative-ui/*.html:8-9
What: All four templates load stylesheets and font binaries from `fonts.googleapis.com` and `fonts.gstatic.com` on every open.
Evidence: Playwright request log recorded requests to `https://fonts.googleapis.com/css2?...` and `https://fonts.gstatic.com/s/...` across all 4 artifacts.
Impact: Every local HTML artifact open discloses the user's IP address and User-Agent to Google servers and slows offline/air-gapped loads.
Fix: Remove external Google Fonts `<link>` tags and use high-craft local/system font stacks (`"Geist", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`, `"Source Serif 4", "Iowan Old Style", Georgia, serif`, `"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace`).
Verify: Assert zero requests to `fonts.googleapis.com` or `fonts.gstatic.com` in Playwright network logs across all 4 templates.
```

```text
ID: SEC-10        Severity: low
Where: install.sh:103,111
What: `shellcheck` reports `SC2088` (quoted `"~/"*` pattern warning) and `SC2015` (`A && B || C` short-circuit hazard where `mkdir -p` runs if `say` ever fails).
Evidence: `shellcheck install.sh` output lines 103 (`SC2088`) and 111 (`SC2015`).
Impact: On line 111, `A && B || C` violates defensive shell scripting because failure in branch `B` falls through into destructive/mutating branch `C` (`mkdir -p`) even during `--dry-run`.
Fix: Replace `A && B || C` with explicit `if [ "$DRY_RUN" -eq 1 ]; then ... else ... fi` and rewrite tilde stripping cleanly so `shellcheck` passes with zero warnings or infos.
Verify: Run `shellcheck install.sh` and assert exit code `0` with zero output.
```
