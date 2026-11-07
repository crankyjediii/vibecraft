# Track 2 Audit: Correctness & Robustness

Audited commit: `13e02b15ab998e10b42a64bb36f6640725bd2614` (`overhaul/v1`)
Tools executed: Headless Chromium (`375x812`, `768x1024`, `1440x900`, light/dark, `prefers-reduced-motion: reduce`, blocked-network route, data-block fuzzer), `/bin/bash` `3.2.57`, `/bin/sh -n`, isolated `mktemp -d` installer fuzzer.

## Browser Matrix Summary (Default Data)

| Template | `375px` Overflow | `768px` Overflow | `1440px` Overflow | Page Errors | Console Warnings | Offline Grid Survival |
|---|---|---|---|---:|---:|---|
| `stack_matrix_artifact.html` | `false` (`375px`) | `false` (`768px`) | `false` (`1440px`) | 0 | 1 (Tailwind CDN) | **BROKEN** (`display: block`, `padding: 0px`) |
| `brand_studio_artifact.html` | `false` (`375px`) | `false` (`768px`) | `false` (`1440px`) | 0 | 1 (Tailwind CDN) | **BROKEN** (`display: block`, `padding: 0px`) |
| `qa_diff_artifact.html` | `false` (`375px`) | `false` (`768px`) | `false` (`1440px`) | 0 | 1 (Tailwind CDN) | **BROKEN** (`display: block`, `padding: 0px`) |
| `launchpad_artifact.html` | `false` (`375px`) | `false` (`768px`) | `false` (`1440px`) | 0 | 1 (Tailwind CDN) | **BROKEN** (`display: block`, `padding: 0px`) |

---

## Findings

```text
ID: COR-01        Severity: high
Where: templates/generative-ui/qa_diff_artifact.html:293-297
What: `stampText()` computes the `[Slop: ...]` field from `t.bad` (hardcoded color count) instead of open slop findings.
Evidence: Setting `REPORT.tokens.files[0].hardcoded = 3` (with zero remaining slop findings) rendered `#stamp` as: `🛡️ Auditor: [Syntax: 0 Errors] • [Tokens: 99% Validated] • [Slop: 3 Remaining]`. Conversely, open slop findings with `hardcoded: 0` falsely print `[Slop: Scrubbed]`.
Impact: The QA Diff artifact corrupts the earned audit stamp in both directions: hardcoded colors are double-counted as slop, while un-scrubbed slop is hidden behind `[Slop: Scrubbed]`.
Fix: Add explicit `REPORT.slop = { scrubbed: <n>, open: <n> }` (with backward-compatible fallback to `0` open when omitted), compute `verdict` `ok` from `syntaxOk && bad === 0 && slopOpen === 0`, and format `stampText()` `[Slop: ...]` strictly from `slopOpen`.
Verify: Unit + Playwright test asserting `hardcoded: 3, slop.open: 0` renders `[Tokens: 99% Validated] • [Slop: Scrubbed]` with `Needs fixes`, and `hardcoded: 0, slop.open: 2` renders `[Tokens: 100% Validated] • [Slop: 2 Remaining]`.
```

```text
ID: COR-02        Severity: high
Where: templates/generative-ui/*.html:10
What: Offline or CSP-restricted environments lose all layout padding, flexbox, and responsive grids because layout depends entirely on `cdn.tailwindcss.com` runtime JS.
Evidence: Aborting `https://**` in Chromium reduced wrapper `paddingLeft` to `"0px"` and `<main>` / `<form>` `display` to `"block"` across all 4 templates.
Impact: Claude Code users opening local `vibecraft/*.html` files offline on a plane or inside CSP-restricted artifact viewers get unstyled vertical stacks that contradict `README.md:111`.
Fix: Inline all layout and utility CSS directly into every template via `scripts/build-templates.mjs` and remove `cdn.tailwindcss.com`.
Verify: Playwright offline test (`context.route('https://**', r => r.abort())`) asserting `display: grid` and non-zero responsive padding across all 4 templates.
```

```text
ID: COR-03        Severity: medium
Where: templates/generative-ui/stack_matrix_artifact.html:196,268
What: Empty `STACKS = []` throws an uncaught `TypeError`, and `latencyMs: 0` across stacks divides by zero producing `--ratio: NaN`.
Evidence: Fuzzing `STACKS = []` threw `TypeError: Cannot read properties of undefined (reading 'id')`; fuzzing `latencyMs: 0` produced `stackMatrixZeroLatencyRatios: ["NaN", "NaN", "NaN"]`.
Impact: Partial, draft, or zero-latency CLI/library stack comparisons crash the entire Stack Matrix script before rendering header text or empty-state guidance, or break latency bars.
Fix: Guard empty/invalid `STACKS` with a clean `.empty` state and disabled action buttons, and clamp `const maxLatency = Math.max(1, ...STACKS.map((s) => Number(s.latencyMs) || 0))`.
Verify: Playwright fuzz tests with `STACKS = []`, missing fields, and `latencyMs = 0` asserting zero `pageerror` events and numeric `--ratio` in `[0, 1]`.
```

```text
ID: COR-04        Severity: medium
Where: templates/generative-ui/launchpad_artifact.html:548
What: `launchpad_artifact.html` crashes with `TypeError` when all `LAUNCH` sections are empty (`TABS` filters down to `[]`).
Evidence: Fuzzing empty `LAUNCH` fields threw `Cannot read properties of undefined (reading 'key')` at `selectTab(TABS[0].key, false)`.
Impact: An empty or malformed draft `LAUNCH` payload leaves a blank page and throws an uncaught runtime exception instead of rendering an explicit empty/error notice.
Fix: When `TABS.length === 0`, render a clear empty-state panel inside `#panels`, disable `#copy-all`, and skip `selectTab`.
Verify: Playwright fuzz test with empty `LAUNCH` object asserting zero `pageerror` events and visible empty-state message.
```

```text
ID: COR-05        Severity: medium
Where: templates/generative-ui/brand_studio_artifact.html:380-388
What: `applyTheme()` crashes with `TypeError` if `THEMES` is empty or does not include the hardcoded `'linear'` key.
Evidence: Fuzzing `THEMES = {}` or custom keys without `linear` threw `Cannot read properties of undefined (reading 'bg-primary')` because `let current = 'linear'` is hardcoded on line 319.
Impact: If Brand Artisan customizes archetype keys (for example `editorial_custom`, `swiss`, `nocturne`) without keeping a `linear` key, Brand Studio crashes on load.
Fix: Derive initial `current = Object.keys(THEMES)[0] || null`, guard `if (!current || !THEMES[current])` with a clear empty/error state, and guard missing individual token keys with `:root` defaults.
Verify: Playwright fuzz test with `THEMES = {}` and `THEMES = { customOnly: {...} }` asserting zero `pageerror` events and full interactive rendering.
```

```text
ID: COR-06        Severity: medium
Where: install.sh:186-188
What: `install.sh` replaces symlinked `claude_desktop_config.json` files with a regular file via `fs.renameSync(tmp, targetPath)`.
Evidence: Installer fuzz test #4 (`ln -s $SANDBOX/dotfiles/claude_desktop_config.json .../claude_desktop_config.json`) output: `Symlink preserved: NO (symlink destroyed by fs.renameSync!)`.
Impact: Developers managing `claude_desktop_config.json` via GNU Stow, chezmoi, Nix Home Manager, or a dotfiles git symlink lose their symlink linkage silently on install.
Fix: Resolve `const realTarget = fs.existsSync(targetPath) ? fs.realpathSync(targetPath) : targetPath;` and perform the atomic temp-file write + `renameSync` in `path.dirname(realTarget)` targeting `realTarget`.
Verify: Run `tests/installer_e2e.test.js` with a symlinked `claude_desktop_config.json` and assert `fs.lstatSync(configPath).isSymbolicLink() === true` and target dotfile contains merged servers.
```

```text
ID: COR-07        Severity: medium
Where: install.sh:152-159
What: `install.sh` rejects UTF-8 BOM-prefixed `claude_desktop_config.json` files as invalid JSON and leaves an orphaned `.bak-*` file behind on failure.
Evidence: Installer fuzz test #2 (`\xef\xbb\xbf{"mcpServers": {}}`) created `.bak-20261106224607-85516` and then exited `1` with `Existing config is not valid JSON`.
Impact: Config files edited by Windows tools or certain macOS editors with UTF-8 BOM fail to install, and repeated failed attempts accumulate `.bak-*` clutter even though nothing changed.
Fix: Strip leading `\uFEFF` (`raw.replace(/^\uFEFF/, '')`) before `JSON.parse`, validate JSON *before* creating a backup copy, and catch filesystem `EACCES` errors cleanly without raw Node stack traces (seen in fuzz test #7 lines 206-227).
Verify: Run installer test with UTF-8 BOM config (exits `0`), invalid trailing-comma JSON (exits non-zero with zero `.bak-*` clutter), and read-only target dir (clean single-line error, no stack trace).
```

```text
ID: COR-08        Severity: medium
Where: install.sh:65-69,229-242
What: `install.sh` has no `--uninstall` flag, no `--check` mode, and no Windows PowerShell (`install.ps1`) counterpart.
Evidence: `install.sh:68` dies on `MINGW*`/`MSYS*`/`CYGWIN*`, and `usage()` supports only `-y`, `--dry-run`, `--no-desktop`, `--no-cli`, `-h`.
Impact: Users cannot cleanly remove VibeCraft's `vibecraft-*` MCP entries without hand-editing JSON, cannot verify installation health non-destructively, and Windows users have no automated installer.
Fix: Add `--uninstall` and `--check` to `install.sh` (removing only `vibecraft-*` keys while preserving user's other MCP servers), and ship `install.ps1` with full flag parity (`-Yes`, `-DryRun`, `-Uninstall`, `-Check`, `-NoDesktop`, `-NoCli`).
Verify: Automated roundtrip test: install -> `--check` (exit 0) -> idempotent re-install -> `--uninstall` -> verify non-VibeCraft MCP servers remain intact and `--check` exits non-zero.
```

```text
ID: COR-09        Severity: low
Where: templates/generative-ui/stack_matrix_artifact.html:55,130, brand_studio_artifact.html:155, qa_diff_artifact.html:74-76
What: Long unbroken strings in `.mono` overflow at `375px` (`scrollWidth: 1877`), and templates lack `dir="auto"` and CSS logical alignment properties for RTL text.
Evidence: Fuzzing `stack_matrix_artifact.html` at `375x812` with a 200-char unbroken identifier and Arabic headline produced `scrollWidth: 1877` (`overflows: true`) and `htmlDir: null`; `qa_diff` and `brand_studio` hardcode `text-align: left` / `right` and `left` / `right` positioning.
Impact: Long package specs, URLs, or RTL (Arabic/Hebrew) product descriptions cause horizontal viewport scrolling on mobile widths and backwards alignment.
Fix: Add `dir="auto"` on `<html>` (keeping `dir="ltr"` on code/diff/token blocks), add `overflow-wrap: anywhere` on `.option`, `.card`, and `.mono` prose containers, and replace physical `left`/`right` text-align and inset properties with CSS logical properties (`text-align: start`/`end`, `inset-inline-start`/`end`, `padding-inline`, `margin-inline`).
Verify: Re-run the `375px` 10x unbroken-string + Arabic RTL Playwright fuzz test across all 4 templates and assert `scrollWidth <= 375`.
```

```text
ID: COR-10        Severity: low
Where: tests/audit_rules_test.js:23-28,44-54
What: The prototype audit script inspects single lines with regexes, missing multi-line TypeScript signatures, flagging colors inside comments or strings, and providing zero machine-readable output or CLI interface.
Evidence: Comment on `tests/audit_rules_test.js:23`: `// shortcut: single-line signatures only; multi-line signatures with nested parens are not seen.` Passing `export function foo(\n  x: number\n) {\n  return x;\n}` returns `[]`.
Impact: Multi-line untyped exports, contrast failures, `outline: none`, unlabeled controls, swallowed errors, console leftovers, dead exports, and hardcoded secrets pass `audit_rules_test.js` undetected.
Fix: Implement zero-dependency Audit Engine v2 (`scripts/audit/`) with comment/string/scope stripping, multi-line balanced-paren signature parsing, 18 rules (`VC001`..`VC018`), `--json`/`--sarif`/`--fix`, and auditable `vibecraft-ignore` comments while preserving `tests/audit_rules_test.js` exports.
Verify: Run passing + failing fixture tests for all 18 rules plus multi-line TS signature and comment/string false-positive tests.
```
