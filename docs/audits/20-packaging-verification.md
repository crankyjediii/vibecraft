# Phase 2 Packaging & Installer Verification Report

Date: 2026-11-06
Branch: `overhaul/v1`
Claude Code CLI: `2.1.319` (`claude plugin validate`, `marketplace add`, `install`, `list`, `details`)

## 1. Manifest & Directory Validation (`PKG-01`, `PKG-02`, `PKG-03`)

Commands executed:
```bash
claude plugin validate --strict --profile directory --json .claude-plugin/plugin.json
claude plugin validate --strict --json .claude-plugin/marketplace.json
claude plugin validate --strict --json skills
claude plugin validate --strict --json commands
```

Measured result:
- `.claude-plugin/plugin.json`: `"success": true`, `"strict": true`, `"errors": []`, `"warnings": []`, `"directory.findings": []` (`.claude-plugin/icon.png` `512x512` RGBA PNG verified at `7,414` bytes). One advisory note (`advice[0]`) reminds adding `/plugin install vibecraft --marketplace crankyjediii/vibecraft` to `README.md` (scheduled for Phase 4 `README.md` overhaul).
- `.claude-plugin/marketplace.json`: `"success": true`, `"strict": true`, `"errors": []`, `"warnings": []`, `"advice": []`.
- `skills/` (`6` skills: `vibecraft`, `research-scout`, `brand-artisan`, `system-architect`, `fullstack-builder`, `qa-auditor`) and `commands/` (`6` slash commands: `build`, `stack`, `brand`, `audit`, `launchpad`, `doctor`): `"success": true`, `"contents": []` (`0` errors, `0` warnings).

## 2. Isolated `HOME` Native Claude Code Marketplace Install & Token Cost (`PRM-29`..`PRM-31`)

Commands executed in isolated `mktemp -d` (`HOME="$ISO_HOME" XDG_CONFIG_HOME="$ISO_HOME/.config"`):
```bash
claude plugin marketplace add "$PWD"
claude plugin install vibecraft@vibecraft
claude plugin list
claude plugin details vibecraft@vibecraft
```

Measured output summary:
```text
✔ Successfully added marketplace: vibecraft (declared in user settings)
✔ Successfully installed plugin: vibecraft@vibecraft (scope: user)

Component inventory
  Skills (12): audit, brand, brand-artisan, build, doctor, fullstack-builder,
               launchpad, qa-auditor, research-scout, stack, system-architect, vibecraft
  Agents (0)
  Hooks (0)
  MCP servers (3): vibecraft-filesystem, vibecraft-brave-search, vibecraft-fetch

Projected token cost
  Always-on: ~734 tok added to every session
  On-invoke: vibecraft ~1.8k, research-scout ~1.7k, brand-artisan ~1.7k,
             system-architect ~1.7k, fullstack-builder ~1.6k, qa-auditor ~1.8k,
             slash commands ~90-200 tok each
```

Idle session token footprint dropped from `~18,262 to 27,856` tokens (full Project Knowledge preload in Phase 1 `PRM-29`) to **`~734` tokens always-on** (`> 96%` reduction).

## 3. Desktop Distribution Bundle & Reproducible ZIP (`PKG-05`)

Commands executed:
```bash
node scripts/build-dist.mjs
node scripts/build-dist.mjs --check
unzip -t dist/vibecraft-desktop/vibecraft-skill.zip
```

Measured output:
```text
Built 19 synchronized artifacts (system_prompt.md + dist/vibecraft-desktop/).
build-dist --check passed (19 generated artifacts verified).
No errors detected in compressed data of dist/vibecraft-desktop/vibecraft-skill.zip.
```

`vibecraft-skill.zip` uses a deterministic pure-Node PKZIP builder (`1980-01-01 00:00:00` DOS timestamp, sorted UTF-8 entries) with top-level `vibecraft/SKILL.md`, `vibecraft/references/*.md` (frontmatter stripped), and `vibecraft/templates/*.html`.

## 4. Shell Analysis, Doctor Diagnostics & Isolated E2E Installer Suite (`SEC-01`, `SEC-05`..`SEC-08`, `SEC-10`, `COR-06`..`COR-08`, `PKG-06`)

Commands executed:
```bash
shellcheck install.sh
/bin/bash -n install.sh
node tests/installer_e2e.test.js
CLAUDE_DESKTOP_CONFIG=/tmp/nonexistent-vibecraft-cfg.json node scripts/doctor.mjs
```

Measured output:
- `shellcheck install.sh`: `0` warnings, `0` errors, exit `0`.
- `/bin/bash -n install.sh` (macOS Bash `3.2.57`): exit `0`.
- `node tests/installer_e2e.test.js`: `6/6` passed (`1,505 ms`):
  1. `darwin`, `linux` (`XDG_CONFIG_HOME`), and `win32` (`APPDATA`) path resolution.
  2. `--dry-run`, pre-install `--check` failure, UTF-8 BOM merge, `0600` config + backup permissions, `BRAVE_API_KEY` environment isolation (zero plaintext leak), progressive-loading skill layout, post-install `--check` pass, idempotent re-run without duplicate backups, and `--uninstall` preserving unrelated MCP servers.
  3. Pre-backup JSON syntax validation (zero orphan `.bak-*` files on malformed JSON) and symlink preservation via `fs.realpathSync`.
  4. Piped `curl | bash` (`bash -s -- --yes`) execution outside a repository checkout (`BASH_SOURCE[0]` unbound under `set -u`, local tarball extraction in `0700` temp dir, and macOS `/var/folders` -> `/private/var/folders` symlink resolution).
  5. `scripts/doctor.mjs --json` exit `0` on healthy state and exit `1` with actionable `fix` command on malformed Desktop JSON.
  6. `scripts/build-dist.mjs --check` drift verification and `unzip -Z1` archive structure check.

## 5. Honest Platform Coverage Note

- **macOS (`darwin`) & POSIX Linux paths:** Executed and verified locally in isolated sandboxes (`tested`).
- **Windows (`install.ps1`):** `win32` path and merge logic in `scripts/lib/installer-core.mjs` is unit-tested locally; `install.ps1` wrapper execution and `PSScriptAnalyzer` are `untested locally` because `pwsh` is not installed on this macOS host, and will run on `windows-latest` in GitHub Actions CI (`Phase 4/5`).
- **Claude Desktop Electron GUI:** `claude_desktop_config.json` syntax, permissions, and `vibecraft-skill.zip` layout are verified deterministically; live GUI upload inside the proprietary Electron client requires manual user smoke testing (`untested in headless automation`).
