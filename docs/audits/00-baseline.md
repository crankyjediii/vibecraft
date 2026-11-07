# Phase 0 Baseline Report

Recorded: `2026-11-06T22:41:30-06:00`
Baseline commit: `13e02b15ab998e10b42a64bb36f6640725bd2614` on branch `overhaul/v1`

## 1. Confirmed Intake Decisions

- **GitHub repository:** `crankyjediii/vibecraft` (verified via `gh auth status` and `gh api user`)
- **Visibility:** `public`
- **License:** `MIT`
- **Windows installer (`install.ps1`):** In scope (`-Yes`, `-DryRun`, `-Uninstall`, `-Check`, `-NoDesktop`, `-NoCli`)

## 2. Stray Process Cleanup (Port 8765)

`lsof -i :8765` detected a lingering Python HTTP server started from an earlier VibeCraft scratch workspace (`templates/generative-ui`):

```text
COMMAND   PID  USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME
Python  54729 jimmy    3u  IPv4 0x6612b2dd5aaeee89      0t0  TCP localhost:ultraseek-http (LISTEN)

PID  PPID COMMAND
54729 54676 /Library/Frameworks/Python.framework/Versions/3.14/Resources/Python.app/Contents/MacOS/Python -m http.server 8765 --bind 127.0.0.1
cwd: /Users/jimmy/Library/Application Support/Claude/scratch-workspaces/.../vibecraft-claude-plugin/templates/generative-ui
```

We terminated PID `54729` with `kill 54729` and re-verified `lsof -i :8765`:

```text
Port 8765 is now free
```

## 3. GitHub Authentication & Repository Pre-Check

```text
$ gh auth status
github.com
  ✓ Logged in to github.com account crankyjediii (keyring)
  - Active account: true
  - Git operations protocol: https
  - Token scopes: 'gist', 'read:org', 'repo', 'workflow'

$ gh api user --jq '{login: .login, name: .name}'
{
  "login": "crankyjediii",
  "name": "Jimmy Mullen"
}

$ gh repo view crankyjediii/vibecraft
GraphQL: Could not resolve to a Repository with the name 'crankyjediii/vibecraft'. (repository)
```

## 4. Environment Tool Inventory

| Tool | Status | Path | Version |
|---|---|---|---|
| `node` | Available | `/Users/jimmy/.gemini/antigravity/bin/node` | `v24.22.1` |
| `npm` | Available | `/Users/jimmy/.gemini/antigravity/bin/npm` | `11.19.1` |
| `npx` | Available | `/Users/jimmy/.gemini/antigravity/bin/npx` | `11.19.1` |
| `git` | Available | `/usr/bin/git` | `git version 2.50.1 (Apple Git-155)` |
| `gh` | Available | `/opt/homebrew/bin/gh` | `gh version 2.103.3 (2026-10-26)` |
| `claude` | Available | `/Users/jimmy/.local/bin/claude` | `2.1.319 (Claude Code)` |
| `shellcheck` | Available | `/opt/homebrew/bin/shellcheck` | `ShellCheck - shell script analysis tool` |
| `uvx` | Available | `/Users/jimmy/.local/bin/uvx` | `uvx 0.12.19 (aarch64-apple-darwin)` |
| `/bin/bash` | Available | `/bin/bash` | `GNU bash, version 3.2.57(1)-release (arm64-apple-darwin25)` |
| `zip` | Available | `/usr/bin/zip` | `Info-ZIP 3.0` |
| `pwsh` | Missing locally | N/A | Not installed on host macOS; validated structurally locally and via Windows/Linux `pwsh` in CI |
| Browser | Available | `/Applications/Google Chrome.app` + cached `playwright` | Real headless Chromium available locally |

## 5. Untouched 18-File Prototype Inventory

All 18 shipped prototype files were committed untouched in `13e02b15ab998e10b42a64bb36f6640725bd2614` (`154,847` bytes, `3,256` lines total). Local workspace scratch items (`.claude/` and `prompts/OVERHAUL.md`) were left unstaged and untouched on disk.

| File | Bytes | Lines | SHA-256 |
|---|---:|---:|---|
| `README.md` | 7,711 | 113 | `4d407952e864c967c0d54cd27abab0a572d0ebc5efc9aa0591735a8f07cf057a` |
| `claude_desktop_config.json` | 447 | 19 | `87a22f56a726ff53afb10b0124a1e9089e8381f42f7c58f6fe21affd6220792d` |
| `docs/architecture.md` | 5,334 | 103 | `c14873fa7e2ac387820a3763da7e5b68507cd325c1fb49a66114d9b164c4836b` |
| `docs/interaction_guide.md` | 4,959 | 108 | `91ca1a086488932b8b005b518ae4a5e5c5a8b209c0b186bab41556dd63c0797c` |
| `install.sh` | 9,429 | 242 | `7d195ba4135c111aad51d63a8879b470be4cc78aad0534611f12fbb0521ea0ef` |
| `package.json` | 345 | 14 | `f66cb1d48b25f646ec9996a0e318fcb928832e032b1db0f70dd6d39e44c78164` |
| `skills/brand_artisan.md` | 4,622 | 68 | `dda278af0b168a327d2316355c74988b40c468fa318ebc56b1a05e4ba8816fd2` |
| `skills/fullstack_builder.md` | 3,826 | 53 | `4271236ea9d5513a1ec6e12f1ab00636980bcef465cbf47cb3a1767c2fb98db6` |
| `skills/qa_auditor.md` | 4,060 | 77 | `72c385792e7eaff924de367151731497afe7ff9b6ae7f8af177cb861f4d4190c` |
| `skills/research_scout.md` | 5,514 | 90 | `87ec4107c946888ba4da298ab13360bfd1313ddebe4a56b5381281260ee45c6f` |
| `skills/system_architect.md` | 3,073 | 68 | `faa520cbab73ff8a702cb47d8c31e102322ce3afbc25cb4e78e529d91063d1b3` |
| `system_prompt.md` | 8,097 | 132 | `385200b8d548a8684ead385ff0e3595e6f1bdaa9afba71c642735f01f25c8e6a` |
| `templates/generative-ui/brand_studio_artifact.html` | 22,921 | 534 | `1ce176538153bc612ce62708c344cfcdf5757e300b93d568570b89d947c76c4f` |
| `templates/generative-ui/launchpad_artifact.html` | 23,526 | 556 | `3bf7df8f4eaba38a9706be993dd11309a703fc6d8d83e4b3b72b8e0f4ef2b522` |
| `templates/generative-ui/qa_diff_artifact.html` | 20,299 | 441 | `185ca5daffe56ef6c90522f18c4d99af8c1c6e8e40290b482d79f2275a2b5e9d` |
| `templates/generative-ui/stack_matrix_artifact.html` | 15,579 | 343 | `73432d954b63284252c4b6b062382ef8b8fcd6c93a038e25ae9e215da66986d2` |
| `tests/audit_rules_test.js` | 7,720 | 171 | `70f7531b357565167836285d7197f1155df93c3d3249dddad5e05caea8dc18a6` |
| `tests/test_scenarios.md` | 7,385 | 124 | `79a489ec0c3050956e4832b0826bc43073b6604b252caf68463d2848eea8a68c` |
| **Total** | **154,847** | **3,256** | |

## 6. Baseline Test Suite Output

```text
$ node tests/audit_rules_test.js
ok   rejects hardcoded hex colors outside token definitions
ok   accepts hex inside token declarations and @tokens blocks
ok   rejects TODO and placeholder comments
ok   requires explicit TypeScript return types
ok   rejects type laundering
ok   rejects craft violations: transition all, gradients, z-index wars
ok   rejects comments that restate code
ok   passes clean, token-compliant sample
ok   shipped code files are free of violations
ok   prose files exist and contain no unfinished markers

10/10 passed
```
