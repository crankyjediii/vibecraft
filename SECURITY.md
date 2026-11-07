# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.x` | Yes |
| `< 1.0.0` | No |

## Reporting a Vulnerability

Do **not** open a public GitHub issue for suspected security vulnerabilities.

Report vulnerabilities privately through GitHub Security Advisories:

- **Private Advisory Form:** https://github.com/crankyjediii/vibecraft/security/advisories/new

Include:

1. Affected file path(s) and commit SHA or release tag.
2. Minimal reproduction commands or payload (for example a crafted `LAUNCH.logo` SVG, `claude_desktop_config.json` input, or shell environment).
3. Impact assessment (local file overwrite, XSS inside rendered HTML artifacts, MCP supply-chain execution, or credential exposure).

## Response Targets

- **Initial acknowledgement:** within 48 hours.
- **Triage and severity classification:** within 7 calendar days.
- **Coordinated fix and advisory publication:** within 14 calendar days for high/critical findings.

## Security Model & Scope

VibeCraft ships zero runtime npm dependencies and enforces four hard boundaries:

1. **Pinned MCP packages:** `.mcp.json` and `claude_desktop_config.json` pin exact package versions (`@modelcontextprotocol/server-filesystem@2.2.0`, `@brave/brave-search-mcp-server@2.1.4`, `mcp-server-fetch==2026.11.4`). Unpinned `@latest` tags are blocked in CI.
2. **Environment-only credentials:** API keys use `${BRAVE_API_KEY}` environment indirection or local `0600` config files written outside git repositories.
3. **Offline CSP-safe HTML artifacts:** `templates/generative-ui/*.html` inline all CSS, block external font/JIT scripts, verify optional Mermaid `11.4.1` with `sha384` Subresource Integrity, and sanitize `LAUNCH.logo` through an allowlisted geometric SVG cloner (`SEC-02`).
4. **Least-privilege installers:** `install.sh` and `install.ps1` preserve symlinks, validate JSON before backup or mutation, write user configs with `0600` permissions on POSIX, and support `--dry-run` and `--uninstall`.
