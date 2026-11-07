# Changelog

All notable changes to VibeCraft are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-07

### Added

- **Claude Code Native Plugin & Marketplace Packaging:** Added `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.claude-plugin/icon.png`, `.mcp.json`, six slash commands (`commands/{build,stack,brand,audit,launchpad,doctor}.md`), and opt-in `hooks/hooks.example.json`, cutting idle session context from `~18.3k-27.9k` tokens to `~734` tokens.
- **Claude Desktop Skill ZIP & Project Bundle:** Added deterministic `scripts/build-dist.mjs` producing `dist/vibecraft-desktop/vibecraft-skill.zip`, Project Knowledge bundle, `SHA256SUMS.txt`, and synchronized `system_prompt.md`.
- **Cross-Platform Installers & Doctor CLI:** Hardened `install.sh` (`--yes`, `--dry-run`, `--uninstall`, `--check`, `--no-desktop`, `--no-cli`, `--workspace`, `curl | bash` support, `0600` permissions, symlink preservation), added Windows PowerShell `install.ps1` with full flag parity, and added `scripts/doctor.mjs` (`vibecraft-doctor`).
- **Zero-Dependency Audit Engine v2 (`vibecraft-audit`):** Added `scripts/audit/` enforcing 19 rules (`VC000`..`VC018`) across CSS, HTML, JS/TS, shell, and JSON with WCAG 2.2 AA `:root` token contrast math, multi-line TypeScript return-type scanning, cross-module dead-export detection, mechanical `--fix`, SARIF 2.1.0 (`--sarif`), JSON (`--json`), generated `docs/rules.md`, and 38 pass/fail rule fixtures.
- **Versioned Handoff Block Parser (`VIBECRAFT PICK` / `LOCK` v2):** Added `scripts/lib/lock-blocks.js` with `v1`/`v2` round-trip serialization, 19-token validation, and 1-based line diagnostics for truncated or `"Copy gotchas only"` paste-backs.
- **Expanded Studio Archetypes & Reference Library:** Added `edge-api` and `mobile-offline` Scout archetypes, `swiss` and `nocturne` Brand Studio themes (6 WCAG 2.2 AA verified palettes total), 28 concrete engineering gotchas (`gotcha-library.md`), and 4 Architecture Decision Records (`docs/decisions/0001..0004.md`).
- **Behavioral & Browser Verification Suites:** Added `scripts/verify-templates-browser.mjs` (Playwright + `axe-core` + offline route blocking + XSS + `375px` RTL fuzzing) and `evals/` (`17` repo invariants + `14` calibrated golden/adversarial scenarios).
- **CI, Release & CodeQL Workflows:** Added SHA-pinned GitHub Actions workflows (`.github/workflows/{ci,release,codeql}.yml`), community governance files, and high-DPI artifact screenshots (`docs/assets/*.png`).

### Changed

- **Self-Contained Offline Generative UI Artifacts:** Rebuilt all four `templates/generative-ui/*.html` templates via `scripts/build-templates.mjs` with inlined logical CSS, system typography stacks, zero `cdn.tailwindcss.com` or `fonts.googleapis.com` network calls, SRI-pinned optional Mermaid `11.4.1` with offline `<pre>` source fallback, and download/copy/print affordances.
- **Strict Supply-Chain Pinning:** Replaced unpinned `-y` MCP server invocations and deprecated packages with exact pinned versions (`@modelcontextprotocol/server-filesystem@2.2.0`, `@brave/brave-search-mcp-server@2.1.4`, `mcp-server-fetch==2026.11.4`) and `${BRAVE_API_KEY}` environment indirection.

### Fixed

- **Launchpad SVG XSS (`SEC-02`):** Replaced raw `innerHTML` injection of `LAUNCH.logo` with `DOMParser` + allowlisted geometric SVG cloning.
- **QA Stamp Honesty (`COR-01`, `PRM-09`):** Updated `qa_diff_artifact.html` and `qa-auditor` to emit `! VibeCraft QA · [Syntax: Not Run]` when no shell compiler ran and to report `openSlop + openGotchas` separately from token adherence.
- **WCAG 2.2 AA Contrast & Listbox Keyboard Access (`A11Y-01`..`A11Y-04`):** Calibrated light-mode `--success` tokens (`3.90:1` -> `>= 5.15:1`), `THEMES.apple` chip contrast (`3.70:1` -> `>= 5.40:1`), landmark regions, sequential headings, focusable `<pre>` blocks, and closed `#dd-btn` `ArrowDown` navigation.
