# Track 6 Audit: Packaging & Distribution Gap Analysis

Audited commit: `13e02b15ab998e10b42a64bb36f6640725bd2614` (`overhaul/v1`)
Tools & sources verified: Local `claude` CLI `2.1.319 (Claude Code)` (`claude plugin validate --help`, `claude plugin init`, `claude plugin validate --strict --profile directory --json`), Anthropic Claude Code plugin & marketplace documentation (`plugin.schema.json`, `marketplace.schema.json`), and Anthropic Claude Desktop documentation (Projects + Settings > Capabilities > Skills `.zip` upload + MCP `claude_desktop_config.json`).

## Verified Claude Code Plugin & Marketplace Specification (`claude 2.1.319`)

Running `claude plugin init` and `claude plugin validate --strict --profile directory --json` on this machine confirmed the exact current schema and directory expectations:

1. **Plugin Manifest (`.claude-plugin/plugin.json`):**
   - `$schema`: `"https://anthropic.com/claude-code/plugin.schema.json"`
   - Required/validated metadata: `name` (`"vibecraft"`), `version` (`"1.0.0"`), `description`, `author` (`{ "name": "...", "url": "..." }`), `homepage`, `repository`, `license` (`"MIT"`), `keywords`, and `icon` (or `.claude-plugin/icon.png`, square PNG `512px`–`2048px` under `2 MB` required by `--profile directory --strict` to clear `ICON_MISSING`).
2. **Self-Hosted Marketplace Manifest (`.claude-plugin/marketplace.json`):**
   - `$schema`: `"https://anthropic.com/claude-code/marketplace.schema.json"`
   - Structure verified clean under `claude plugin validate --strict --json`:
     - `name`: `"vibecraft"`
     - `owner`: `{ "name": "Jimmy Mullen" }`
     - `metadata`: `{ "description": "...", "version": "1.0.0" }`
     - `plugins`: `[ { "name": "vibecraft", "source": "./", "description": "...", "version": "1.0.0", "license": "MIT" } ]`
   - Supports both two-command install (`/plugin marketplace add crankyjediii/vibecraft` followed by `/plugin install vibecraft@vibecraft`) and Claude Code `2.1.275+` single-command install (`/plugin install vibecraft --marketplace crankyjediii/vibecraft`). Note: `claude plugin validate` specifically checks `README.md` for `/plugin install vibecraft --marketplace <owner>/<repo>` in its `advice` array!
3. **Skills Layout (`skills/<skill-name>/SKILL.md`):**
   - Each skill must live in its own subdirectory (`skills/vibecraft/SKILL.md`, `skills/research-scout/SKILL.md`, `skills/brand-artisan/SKILL.md`, `skills/system-architect/SKILL.md`, `skills/fullstack-builder/SKILL.md`, `skills/qa-auditor/SKILL.md`) with YAML frontmatter (`name` lowercase hyphenated <=64 chars, no reserved words `claude`/`anthropic`; `description` containing concrete trigger conditions).
   - Supporting examples and deep catalogs live in `skills/<skill-name>/references/*.md` so progressive loading keeps idle context small.
4. **Slash Commands (`commands/*.md`):**
   - Markdown files in `commands/{build,audit,brand,stack,launchpad,doctor}.md` with `description` frontmatter automatically register as `/vibecraft:build`, `/vibecraft:audit`, `/vibecraft:brand`, `/vibecraft:stack`, `/vibecraft:launchpad`, and `/vibecraft:doctor`.
5. **MCP Servers (`.mcp.json`) & Optional Hooks (`hooks/`):**
   - `.mcp.json` at plugin root declares `"mcpServers"` using `${VAR}` environment variable references and `${CLAUDE_PLUGIN_ROOT}` where needed.
   - `hooks/hooks.json` auto-activates hooks; because an audit-on-write hook should be **opt-in / default off**, shipping `hooks/hooks.example.json` (plus helper script) avoids unexpected latency on every write while letting users opt in with one copy command.

## Verified Claude Desktop Distribution Options

Claude Desktop currently provides three complementary integration mechanisms:
1. **Claude Desktop Custom Skills (`.zip` upload):** Settings -> Capabilities -> Skills -> "Upload skill" accepts a `.zip` archive whose top-level folder contains `SKILL.md` and `references/` (e.g., `vibecraft-skill.zip` containing `vibecraft/SKILL.md`, `vibecraft/references/*.md`, and `vibecraft/templates/*.html`). Once toggled on, it works across chats with progressive loading.
2. **Claude Desktop Projects:** Project Instructions (`PROJECT_INSTRUCTIONS.md`) + Project Knowledge files (`knowledge/*.md` and HTML templates) scope VibeCraft to a dedicated Project workspace.
3. **Claude Desktop MCP Configuration (`claude_desktop_config.json`):** Connects local `vibecraft-filesystem`, `vibecraft-brave-search`, and `vibecraft-fetch` stdio MCP servers (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, `%APPDATA%\Claude\claude_desktop_config.json` on Windows, `${XDG_CONFIG_HOME:-~/.config}/Claude/claude_desktop_config.json` on Linux).

**Recommendation:** Support **all three** deterministically from `scripts/build-dist.mjs` into `dist/vibecraft-desktop/`:
- `dist/vibecraft-desktop/vibecraft-skill.zip` (one-upload Custom Skill archive with top-level `vibecraft/SKILL.md`)
- `dist/vibecraft-desktop/PROJECT_INSTRUCTIONS.md` + `dist/vibecraft-desktop/knowledge/` (for Project-scoped users)
- Hardened `install.sh` + `install.ps1` for merging `claude_desktop_config.json` safely.

---

## Findings

```text
ID: PKG-01        Severity: high
Where: (repository root)
What: Repository lacks `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`, failing `claude plugin validate .` immediately.
Evidence: `$ claude plugin validate .` -> `✘ Found 1 error: directory: No manifest found in directory. Expected .claude-plugin/marketplace.json or .claude-plugin/plugin.json` (exit code `1`).
Impact: Users cannot install VibeCraft from GitHub via `/plugin marketplace add crankyjediii/vibecraft` or `/plugin install`.
Fix: Create validated `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and `.claude-plugin/icon.png` (512x512 PNG) passing `claude plugin validate --strict --profile directory`.
Verify: Run `claude plugin validate --strict --profile directory .claude-plugin/plugin.json` and `claude plugin validate --strict .claude-plugin/marketplace.json` and assert exit code `0` with zero errors/warnings.
```

```text
ID: PKG-02        Severity: high
Where: skills/*.md
What: Existing skills are flat `skills/<name>.md` files instead of `skills/<name>/SKILL.md` directories, and `system_prompt.md` has no `skills/vibecraft/SKILL.md` source in the repo.
Evidence: `ls skills/` lists `brand_artisan.md`, `fullstack_builder.md`, `qa_auditor.md`, `research_scout.md`, `system_architect.md`; `install.sh:214-220` fabricates `SKILL.md` on the fly via shell `printf` + `cat`.
Impact: Native Claude Code plugin skill discovery does not load flat `skills/*.md` files without `<skill>/SKILL.md`, and hand-concatenating `SKILL.md` inside bash prevents Marketplace installs from working at all.
Fix: Restructure into `skills/vibecraft/SKILL.md` plus `skills/{research-scout,brand-artisan,system-architect,fullstack-builder,qa-auditor}/SKILL.md` (with `references/`), and synchronize `system_prompt.md` + `dist/` deterministically via `scripts/build-dist.mjs`.
Verify: Validate discovery via `claude plugin validate --strict .` and `claude plugin details` in an isolated home directory.
```

```text
ID: PKG-03        Severity: medium
Where: (repository root)
What: Repository defines zero slash commands (`commands/*.md`), even though `README.md:45` tells users to "type `/vibecraft`".
Evidence: No `commands/` directory exists; only an ad-hoc `~/.claude/skills/vibecraft/SKILL.md` is created when running `install.sh`.
Impact: Users have no explicit slash entrypoints for standalone workflows (`/vibecraft:build`, `/vibecraft:audit`, `/vibecraft:brand`, `/vibecraft:stack`, `/vibecraft:launchpad`, `/vibecraft:doctor`).
Fix: Create `commands/{build,audit,brand,stack,launchpad,doctor}.md` with valid frontmatter and clear argument contracts.
Verify: Run `claude plugin validate --strict .` and verify all 6 command files parse cleanly and appear in plugin component inventory.
```

```text
ID: PKG-04        Severity: medium
Where: package.json:1-14
What: `package.json` sets `"private": true` and omits `repository`, `homepage`, `bugs`, `author`, `files`, `bin`, and `build`/`lint`/`audit`/`evals`/`validate`/`doctor` scripts.
Evidence: `package.json` contains only `name`, `version`, `description`, `private`, `license`, `engines`, and two scripts (`test`, `install:plugin`).
Impact: Contributors, CI pipelines, and `npm pack` lack standard verification entrypoints, CLI bin mappings, and accurate package file allowlists.
Fix: Populate complete metadata (`crankyjediii/vibecraft`), explicit `files` allowlist, `bin` entries (`vibecraft-audit`, `vibecraft-doctor`), and full npm scripts (`test`, `lint`, `build`, `audit`, `evals`, `validate`, `doctor`).
Verify: Run `npm pack --dry-run` and every `npm run <script>` target, confirming exit code `0` and clean tarball contents.
```

```text
ID: PKG-05        Severity: medium
Where: (repository root)
What: Claude Desktop users must manually copy-paste `system_prompt.md` and drag 9 loose files from two directories instead of uploading a ready-made Desktop bundle or `vibecraft-skill.zip`.
Evidence: `README.md:32-33`: "paste the whole of `system_prompt.md` into its Instructions" and "Upload Project Knowledge: everything in `skills/` and `templates/generative-ui/`."
Impact: Manual multi-folder file picking is error-prone and misses Claude Desktop's native `vibecraft-skill.zip` upload path.
Fix: Build `dist/vibecraft-desktop/` via `scripts/build-dist.mjs` containing `vibecraft-skill.zip` (top-level `vibecraft/SKILL.md` + `references/` + `templates/`), `PROJECT_INSTRUCTIONS.md`, `knowledge/`, and `SHA256SUMS.txt`, enforced in CI with `--check`.
Verify: Unzip `dist/vibecraft-desktop/vibecraft-skill.zip` in an automated test to assert top-level `vibecraft/SKILL.md` structure and run `node scripts/build-dist.mjs --check`.
```

```text
ID: PKG-06        Severity: low
Where: (repository root)
What: No diagnostic tool (`/vibecraft:doctor` / `scripts/doctor.mjs`) exists to verify Node version, `npx`, `uvx`, manifests, templates, and Desktop config validity.
Evidence: Neither `scripts/` nor any `doctor` command exists in the baseline 18-file inventory.
Impact: When an MCP server fails to start (for instance missing `uvx` or invalid JSON in `claude_desktop_config.json`), users get opaque client startup failures with no actionable remediation command.
Fix: Implement `scripts/doctor.mjs` (supporting human table + `--json`, exit `0` healthy / `1` broken) and wire `/vibecraft:doctor` to it.
Verify: Automated test running `node scripts/doctor.mjs` against both a healthy isolated setup (exit `0`) and a broken setup missing tools/invalid config (exit `1` with actionable fix command).
```
