# Track 5 Audit — Documentation & Claims Verification

Scope audited (strictly read-only): `README.md`, `docs/architecture.md`, `docs/interaction_guide.md`, `tests/test_scenarios.md` cross-checked against `install.sh`, `package.json`, `claude_desktop_config.json`, `system_prompt.md`, `skills/*.md`, `templates/generative-ui/*.html`, `tests/audit_rules_test.js`, and live npm/PyPI package metadata.

---

## (a) Complete Claim Verification Ledger

| Source | Claim / Command | Status | Code / Evidence |
|---|---|---|---|
| `README.md:3` | Autonomous vibecoding studio for Claude Desktop and Claude Code turning a one-line idea into researched stack, locked design system, typed architecture, audited code, and launchpad (docs, logo prompts, next-step prompts). | `verified` | Matches `system_prompt.md:3`, `skills/*.md`, and all 4 templates in `templates/generative-ui/*.html`. |
| `README.md:3,89` | "Claude replies in 3 to 5 lines per turn" / "Chat is 3 to 5 lines." | `false` | Matches `system_prompt.md:7`, but directly contradicts `README.md:8-14` (0 prose lines), `docs/interaction_guide.md:22-26` (`0 to 1`, `1 to 2`, `2 to 3` lines), `tests/test_scenarios.md:13,36` (`0 to 3` / `1 to 3` lines), `skills/system_architect.md:25` (`one line`), `skills/qa_auditor.md:21` (`HUD plus the audit stamp line`), and `install.sh:216` (`at most 5 lines`). |
| `README.md:8-14` | Sample Turn 1 output: 3-line HUD (`Phase 1/4`) + 2 micro-prompts (`Q1 Angle`, `Q2 Ambition`) with `*` defaults and digit/`"go"` reply hint. | `verified` | Matches `system_prompt.md:28-30` and `system_prompt.md:61-63` verbatim. |
| `README.md:21` | `system_prompt.md` contains chat limits, input gate, pipeline, and Craft 12. | `verified` | Present in `system_prompt.md:5` (§1), `:33` (§3), `:68` (§5), and `:97` (§7). |
| `README.md:22` | `skills/*.md` contains five roles: Scout, Artisan, Architect, Builder, Auditor. | `verified` | `skills/{research_scout,brand_artisan,system_architect,fullstack_builder,qa_auditor}.md` all exist. |
| `README.md:23` | `templates/generative-ui/*.html` contains Stack Matrix, Brand Studio, QA Diff, Launchpad artifacts. | `verified` | `templates/generative-ui/{stack_matrix,brand_studio,qa_diff,launchpad}_artifact.html` all exist. |
| `README.md:24` | `claude_desktop_config.json` defines MCP servers: filesystem, Brave Search, fetch. | `verified` | `claude_desktop_config.json:3-18` defines `vibecraft-filesystem`, `vibecraft-brave-search`, and `vibecraft-fetch`. |
| `README.md:25` | `install.sh` is a "One-step installer for macOS and Linux". | `false` | Supports `Darwin` and `Linux` (`install.sh:65-68`), but is **not** one-step for Claude Desktop (`README.md:29-33` and `install.sh:236-238` require 2 additional manual Project creation + 9-file upload steps), and Windows is unsupported. |
| `README.md:26` | `tests/audit_rules_test.js` implements "The Auditor's rules as runnable tests". | `false` | Implements only a partial subset: omits named colors (`white`/`black`) and glow shadows (`skills/qa_auditor.md:36`), omits `.ts`/`.tsx`/`.js`/`.jsx` from `transition-all`/`gradient`/`z-index-arms-race` (`tests/audit_rules_test.js:17-19`), skips `.json` files (`kindOf` -> `'other'`), and misses `# TODO` in `.sh` (`tests/audit_rules_test.js:14`). |
| `README.md:27` | `docs/` holds architecture and interaction protocol references. | `verified` | `docs/architecture.md` and `docs/interaction_guide.md` exist. |
| `README.md:31` | Command `./install.sh` backs up existing `claude_desktop_config.json` (if agreed), merges three MCP servers, asks for a folder and optional Brave Search key. | `verified` | `install.sh:96-192` prompts interactively on TTY, backs up to `.bak-$TIMESTAMP`, merges 3 servers (or 2 if Brave key is blank, `install.sh:172-175`). |
| `README.md:32-33` | Claude Desktop Project setup: create "VibeCraft" Project, paste `system_prompt.md` into Instructions, upload `skills/` and `templates/generative-ui/` to Project Knowledge. | `unverified` | Manual external GUI workflow in Claude Desktop; matches `system_prompt.md:86` and `install.sh:237-238`. |
| `README.md:37` | Manual `claude_desktop_config.json` setup: copy `mcpServers`, replace `${HOME}/Projects` with absolute path, remove `vibecraft-brave-search` or replace `${BRAVE_API_KEY}`. | `verified` | Matches placeholders in `claude_desktop_config.json:5,11`. |
| `README.md:42,45` | Command `./install.sh` installs `~/.claude/skills/vibecraft/` (`SKILL.md`, 5 roles, 4 templates, audit script). | `verified` | `install.sh:212-224` writes `SKILL.md` and copies `skills/*.md`, `templates/generative-ui/*.html`, and `tests/audit_rules_test.js`. |
| `README.md:45` | "In any Claude Code session, describe an app or type `/vibecraft`." | `false` | (1) Repo has no `.claude-plugin/plugin.json` or `commands/`; `/vibecraft` only resolves via `~/.claude/skills/vibecraft/SKILL.md` after running `./install.sh` (not via `--plugin-dir .`). (2) In any normal project directory outside the repo/skill dir, `SKILL.md` (`install.sh:219`) contains bare CWD-relative paths (`skills/...`, `templates/generative-ui/...`) without `${CLAUDE_SKILL_DIR}`, so role/template file reads fail against CWD. |
| `README.md:45` | "Artifacts are written to `vibecraft/` in your project as HTML files you open in a browser." | `false` | `system_prompt.md:88` instructs writing to `vibecraft/<phase>.html`, which causes Phase 4's two HTML artifacts (`qa_diff_artifact.html` and `launchpad_artifact.html`) to overwrite one another if named by phase. |
| `README.md:47` | Commands `./install.sh --dry-run` ("to see every change first") and `./install.sh --no-desktop` ("if you only want the Claude Code skill"). | `verified` | `install.sh:36-37,83,182-183,205-206` implement both flags (note: `--dry-run` without `--yes` still prompts interactively on TTY). |
| `README.md:49` | Requirements: Node.js 18+, `npx` for filesystem/Brave, `uv` for fetch (`brew install uv` on macOS). | `verified` | Matches `package.json:8`, `claude_desktop_config.json:4,8,15`, `install.sh:92-94` (note: `install.sh:92` checks `command -v node` existence only, not major version `>=18`). |
| `README.md:53-83` | 4-phase gated workflow: Scout (`Stack Matrix` -> `VIBECRAFT PICK`), Artisan (`Brand Studio` -> `VIBECRAFT LOCK`), Architect (`Launchpad` draft + `[1]/[2]/[3]`), Builder+Auditor (`QA Diff` + `Launchpad` with 4 tabs & `Copy All` + stamp). | `verified` | Matches `system_prompt.md:68-78` and the 4 templates in `templates/generative-ui/*.html`. |
| `README.md:85` | "Detailed idea? Phase 1 starts at once; the two questions are only for brief ideas." | `verified` | Matches `system_prompt.md:45`. |
| `README.md:90` | "**Craft 12** for every UI line: no gradients, no glow, no `transition: all`, tuned neutrals, spaced on a scale, every state designed, motion as physics, tokens only." | `false` | Contradicted across docs and shipped templates: `skills/brand_artisan.md:28` permits a brand gradient used once; R12 requires animating `transform` and `opacity` only (`system_prompt.md:110`, `brand_artisan.md:39`), yet `brand_artisan.md:30` and all 4 templates transition `background-color`, `border-color`, and `color`; templates use off-scale spacings (`6,10,12,14,20,32,40px`) and heading line-heights `1.25`/`1.3`/`1.55`. |
| `README.md:91` | Claims tagged `[Verified]`, `[Inferred]`, or `[Gotcha]`; estimates never presented as measurements. | `verified` | Enforced in `system_prompt.md:95`, `skills/research_scout.md:43-47`, and `stack_matrix_artifact.html:199`. |
| `README.md:92` | "The stamp is earned. The Auditor prints real numbers; a failing check shows as failing." | `false` | `qa_diff_artifact.html:295` computes `[Slop: ...]` from `t.bad` (hardcoded colors) instead of open slop findings, and `qa_diff_artifact.html:289,321` treats `checker: 'not run'` with `errors: 0` as `100% pass` / `All gates passed` / `[Syntax: 0 Errors]`. |
| `README.md:97` | Command `npm test`. | `verified` | `package.json:11` runs `node tests/audit_rules_test.js`; exits `0` with `10/10 passed`. |
| `README.md:100` | `tests/audit_rules_test.js` verifies audit rules, scans shipped templates and installer, and has no dependencies. | `verified` | Zero `dependencies`/`devDependencies` in `package.json`; runs with Node built-ins (`assert`, `fs`, `path`), though `.json` files in `SHIPPED_CODE` and `# TODO` in `.sh` bypass checks. |
| `README.md:104` | "Change an archetype: edit the `THEMES` block in `brand_studio_artifact.html` (between `@tokens:start` and `@tokens:end`)." | `false` | `brand_studio_artifact.html:319` hardcodes `let current = 'linear';` (and lines `171,239` hardcode `Linear Dark`); renaming or replacing the `linear` key inside `THEMES` crashes `applyTheme(current)` with a `TypeError`. |
| `README.md:105` | "Change what Claude researches or how it behaves: edit the matching file in `skills/`." | `verified` | Role instructions live in `skills/*.md` (requires re-running `./install.sh` for Claude Code or re-uploading Project Knowledge for Desktop). |
| `README.md:106` | "Each has one data block at the top of its script (`STACKS`, `THEMES`, `REPORT`, `LAUNCH`) that Claude replaces; the code below it never changes." | `false` | (1) `stack_matrix_artifact.html:149-191` has two constants (`CONCEPT` and `STACKS`). (2) `brand_studio_artifact.html:184-229,452-475` hardcodes Voice Memo UI copy in HTML and JS outside `THEMES`, so leaving everything else unchanged shows Voice Memo preview UI on unrelated apps. |
| `README.md:110` | `@modelcontextprotocol/server-brave-search` is deprecated on npm; config uses `@brave/brave-search-mcp-server`; fetch server is Python `mcp-server-fetch` started with `uvx`. | `verified` | Confirmed live against npm (`@modelcontextprotocol/server-brave-search` marked deprecated; `@brave/brave-search-mcp-server` HTTP 200) and PyPI (`mcp-server-fetch` HTTP 200), matching `claude_desktop_config.json:7-17`. |
| `README.md:111` | Templates load Tailwind (CDN), Google Fonts, and Mermaid (jsdelivr). "If a network is blocked, layout degrades and diagrams show their source text; the copy buttons keep working." | `false` | Mermaid source fallback (`launchpad_artifact.html:425-438`) and copy JS work offline, but layout does **not** merely degrade—zero fallback CSS exists for Tailwind layout classes (`grid`, `flex`, `gap-*`, `p-*`, `px-*`, `py-*`, `contents`), collapsing all grids/padding and exposing a raw browser groove `<fieldset class="contents">` border in `stack_matrix_artifact.html:131`. |
| `README.md:112` | "Clipboard access can be blocked inside some artifact sandboxes. The templates then select the text and show it for manual copying." | `false` | True in 3 templates, **false** in `launchpad_artifact.html`: no fallback `<textarea>` exists; `copyAll()` (`:536-542`) neither selects nor shows `allText()`, and diagram `Copy source` (`:378-383`) flashes `Press Ctrl/Cmd+C` without selecting or showing the Mermaid source when SVG is rendered. |
| `README.md:113` | "Latency, cost and capacity figures in the Stack Matrix are `[Inferred]` estimates unless marked `[Verified]`." | `verified` | Matches `skills/research_scout.md:44` and `stack_matrix_artifact.html:161-187` (note: template rows are Performance/latency, Offline, and Cost—no separate capacity row). |
| `docs/architecture.md:3` | VibeCraft is instructions + templates (5 role files, 4 HTML templates, wiring tooling), not a server; Claude is the runtime. | `verified` | Matches repository file structure. |
| `docs/architecture.md:7-24` | Component map Mermaid diagram (`system_prompt.md` -> 5 roles -> 4 templates; `VIBECRAFT PICK`/`LOCK` -> User; `MCP --> R1` and `MCP --> R4`). | `false` | `MCP --> R4` (Builder, line 23) contradicts `skills/fullstack_builder.md:30` and `tests/test_scenarios.md:60`, which instruct Builder in Claude Desktop (where `claude_desktop_config.json` MCP servers run) to deliver code as **code artifacts**, not via MCP `filesystem`. |
| `docs/architecture.md:28-52` | Session sequence diagram across brief check and Phases 1–4. | `verified` | Matches `system_prompt.md:33-78`. |
| `docs/architecture.md:56-63` | State travels via pasted `VIBECRAFT PICK` and `VIBECRAFT LOCK` blocks; plain chat overrides artifact. | `verified` | Matches `stack_matrix_artifact.html:273-287`, `brand_studio_artifact.html:390-404`, and `system_prompt.md:80-81`. |
| `docs/architecture.md:67` | "Each template is one self-contained HTML file: Tailwind (CDN) for layout utilities, hand-written CSS driven by custom properties for components, and vanilla JavaScript." | `false` | Templates are **not** self-contained: all 4 require external runtime fetches to `cdn.tailwindcss.com` and `fonts.googleapis.com` (plus `cdn.jsdelivr.net` for Mermaid in `launchpad_artifact.html:11`). |
| `docs/architecture.md:67-74` | "Each has exactly one data block that Claude replaces" + table (`CONCEPT, STACKS`, `THEMES`, `REPORT`, `LAUNCH`). | `false` | `brand_studio_artifact.html` cannot adapt its "Voice memo app" preview (`:184-229,452-475`) by replacing `THEMES` alone. |
| `docs/architecture.md:76` | Common behavior: tokens only for color; hover, focus-visible, active, disabled states; `prefers-reduced-motion` honored; `navigator.clipboard` -> `execCommand` -> text selected and shown for manual copying. | `false` | Manual-copy selection/display is missing on `launchpad_artifact.html` `Copy All` (`:536-542`) and `Copy source` (`:378-383`); radio cards/chips/tabs lack `:disabled` styles; `brand_studio_artifact.html:109,160` leaves `infinite` spin running at `0.01ms` under `prefers-reduced-motion`. |
| `docs/architecture.md:78` | Launchpad skips empty fields and empty tabs so Architect can publish a draft with only diagrams and contracts. | `verified` | `launchpad_artifact.html:317,339-345,507-508` filters out null blocks and empty tabs. |
| `docs/architecture.md:82` | "`tests/audit_rules_test.js` exports `audit(source, filename)`; the Auditor role describes the same rules." | `false` | `audit_rules_test.js` exports `audit`, but omits named colors (`white`/`black`), glow shadows, defensive-check slop, single-use helpers, style drift, prose scrub, and gotcha handlers from `skills/qa_auditor.md:36-57`, and skips craft CSS rules on `.ts`/`.tsx`/`.js`/`.jsx`. |
| `docs/architecture.md:84-93` | Audit rules table (`hardcoded-color`, `placeholder`, `type-laundering`, `comment-slop`, `transition-all`, `gradient`, `z-index-arms-race`, `missing-return-type`). | `false` | Row `placeholder` claims `Applies to: all code` (`:87`), but `audit_rules_test.js:14,30-38` excludes `.json` (`kind: 'other'`) and its regex `(\/\/|\/\*|<!--)` fails to detect `# TODO` comments in `.sh` files. Row `gradient` (`:91`) says `*-gradient(` while code matches `/(linear|radial|conic)-gradient\(/`. Other 6 rows match `audit_rules_test.js`. |
| `docs/architecture.md:95` | Token definitions exempt via `--name: value` lines and `@tokens:start`..`@tokens:end` markers. | `verified` | Matches `tests/audit_rules_test.js:8-10,45-47` (though `skills/qa_auditor.md:33` uses `--glob "!**/tokens.css"` instead). |
| `docs/architecture.md:99` | Gating beats parallel artifacts: questions first for brief ideas, then Stack Matrix, then Brand Studio. | `verified` | Matches `system_prompt.md:40-43,68-78`. |
| `docs/architecture.md:100` | Linear Dark implemented with flat indigo/cyan accents; "R1 and R2 forbid glow and gradients." | `false` | Linear Dark tokens are flat (`brand_studio_artifact.html:250-264`), but "R1 and R2 forbid glow and gradients" contradicts `skills/brand_artisan.md:28` ("A gradient is allowed only if it is the brand itself, used once."). |
| `docs/architecture.md:101` | Archetype hex values sit inside `@tokens` blocks exempted by audit; everything else uses `var(--token)`. | `verified` | Matches `brand_studio_artifact.html:248,311` and passes `tests/audit_rules_test.js:138-145`. |
| `docs/architecture.md:102` | Installer builds `SKILL.md` from `system_prompt.md` and places role files, templates, and audit script beside it "so the relative paths in the directive keep working." | `false` | `install.sh:219` copies bare relative paths (`skills/...`, `templates/generative-ui/...`) without `${CLAUDE_SKILL_DIR}`; Claude Code resolves bare paths against the user's project CWD, not `~/.claude/skills/vibecraft/`. |
| `docs/architecture.md:103` | Old npm Brave Search server is deprecated and `server-fetch` is not an npm package; config uses `@brave/brave-search-mcp-server` and `uvx mcp-server-fetch`. | `verified` | Confirmed via live npm registry (`@modelcontextprotocol/server-fetch` returns HTTP `404`; `@modelcontextprotocol/server-brave-search` is deprecated) and PyPI (`mcp-server-fetch` HTTP `200`). |
| `docs/interaction_guide.md:11,20-26` | "3 to 5 lines of prose per turn" (`:11`) vs Typical turn budget table (`0 to 1`, `2 to 3`, `1 to 2`, `2 to 3` lines, `:20-26`). | `false` | Self-contradictory within 15 lines: none of the turn budgets in `:22-26` ever reach 4–5 lines, and two turns budget `<3` lines (`0 to 1` and `1 to 2`). |
| `docs/interaction_guide.md:12-14,16` | Artifacts hold large content (`system_prompt.md` §1/§5); artifact content never retyped (§5); pasted lock blocks are state (§5); HUD is 3 fixed lines (§2). | `verified` | Matches `system_prompt.md:10,17-23,80,89` (minor note: line 12 cites §5 whereas the >5-line rule is in §1 line 10). |
| `docs/interaction_guide.md:15` | "One data block per template \| Only the changed data is generated; code and styles are reused" | `false` | `system_prompt.md:88` instructs Claude to `"Publish the whole file as an HTML artifact"` / write `vibecraft/<phase>.html`—the LLM must emit the entire 344–557 line HTML file every time, not just the data block. |
| `docs/interaction_guide.md:30` | Brief = "two sentences or fewer (about 30 words), and it omits at least two of: platform, target user, core features, constraints. Otherwise it is detailed." | `false` | Drifts from `system_prompt.md:37-38`, which uses `"or fewer than about 30 words"` and classifies **any** message naming `"a stack, a design direction, a feature list, or a pasted spec"` as **Detailed** regardless of length. |
| `docs/interaction_guide.md:32-39` | Input gate examples + "Only a brief idea ever gets questions, and never more than two." | `verified` | Matches `system_prompt.md:40-47`. |
| `docs/interaction_guide.md:43-58` | Micro-prompt protocol: <=2 questions, <=3 options, `*` default, accepts `1 2`, `1,2`, `go`, or plain language; visual artifacts for comparative/aesthetic choices. | `verified` | Matches `system_prompt.md:47,51-66`. |
| `docs/interaction_guide.md:64-95` | `VIBECRAFT PICK` and `VIBECRAFT LOCK` formats and hand-off rules (`:root` copied verbatim to token file). | `verified` | Matches `stack_matrix_artifact.html:275-286`, `brand_studio_artifact.html:393-403`, `skills/research_scout.md:84`, and `skills/brand_artisan.md:62` verbatim. |
| `docs/interaction_guide.md:99-108` | Changing mind in chat or artifact re-runs invalidated phases; plain chat style with action last. | `verified` | Matches `system_prompt.md:12,81-82,131`. |
| `tests/test_scenarios.md:3,95` | Command `node tests/audit_rules_test.js` ends with `10/10 passed` and exit code `0`. | `verified` | Executed read-only; exited `0` with `10/10 passed`. |
| `tests/test_scenarios.md:7-55` | Manual LLM scenarios `A1`–`A7` (brief idea, digits, detailed idea, paste pick, chat override, short explanation, paste lock -> draft Launchpad). | `unverified` | Live LLM prompt compliance scenarios; draft Launchpad tab hiding in `A7` is `verified` in `launchpad_artifact.html:507-508`, while prose line counts (`0 to 3` in `A1`, `1 line` in `A5`) conflict with `system_prompt.md:7` (`3 to 5 lines`). |
| `tests/test_scenarios.md:56-68` | Scenarios `A8` & `A9`: Fail on "a clean stamp when a check was not run"; Pass on honest failure stamp counts. | `false` | `qa_diff_artifact.html:289-297,321` produces a clean `[Syntax: 0 Errors]` / `100% pass` / `All gates passed` when `checker: 'not run'` (`errors: 0`), and ignores open slop findings when `hardcoded === 0`. |
| `tests/test_scenarios.md:72` | "Open each file in a browser (or publish as an artifact) and check. No console errors in any step." | `unverified` | Clean of `console.error` online (Tailwind CDN logs a console warning), but logs network/CSP errors when offline or inside CSP-restricted sandboxes. |
| `tests/test_scenarios.md:76-79` | `brand_studio_artifact.html` checks: 4 archetypes re-theme live, batch button spins ~1s and adds 8, dropdown works by mouse/keyboard (`Enter`, arrows, `Escape`) returning focus, lock copies `VIBECRAFT LOCK` + `:root` or selects fallback. | `verified` | Verified in `brand_studio_artifact.html:379-524` (note: `"Geist"`/`"Geist Mono"` in Linear Dark are not fetched in `:9`, falling back to `Inter`/system mono). |
| `tests/test_scenarios.md:80-81` | `stack_matrix_artifact.html` checks: mouse/arrow radio selection moves active ring/indicator; `Select Stack & Proceed` copies `VIBECRAFT PICK`; `Copy gotchas only` copies gotcha+fix. | `verified` | Verified in `stack_matrix_artifact.html:69-80,223-229,273-292,339-340`. |
| `tests/test_scenarios.md:82` | `qa_diff_artifact.html`: "Click each diff filter chip \| Hunks filter; an empty category shows the empty message". | `false` | `renderFilters()` (`qa_diff_artifact.html:364`) builds chips from `['all', ...new Set(REPORT.diffs.map((d) => d.category))]`; empty categories never get a chip, and all 5 categories in `REPORT.diffs` are populated. |
| `tests/test_scenarios.md:83` | `qa_diff_artifact.html`: "Edit `REPORT.tokens.files[0].hardcoded` to 3 and reload \| Token percent drops, meter turns red, verdict reads `Needs fixes`, stamp shows the real values". | `false` | `stampText()` (`qa_diff_artifact.html:295`) maps `t.bad` (hardcoded color count) into `[Slop: 3 Remaining]`, corrupting the stamp's slop metric when `hardcoded` is set to `3`. |
| `tests/test_scenarios.md:84` | `qa_diff_artifact.html`: `Copy audit stamp` and `Copy full report` copy stamp line and report. | `verified` | Verified in `qa_diff_artifact.html:437-438` (inherits `stampText()` bug). |
| `tests/test_scenarios.md:85-87,89` | `launchpad_artifact.html`: tabs switch via mouse + `Left`/`Right`/`Home`/`End`; Architecture toggles `User journey`/`Lifecycle` with color-scheme Mermaid or source fallback; logo renders at `16, 32, 64, 512 px`; `LAUNCH.nextSteps = []` hides Next Steps tab. | `verified` | Verified in `launchpad_artifact.html:361-371,421-467,492-534,550-553`. |
| `tests/test_scenarios.md:88` | `launchpad_artifact.html`: "Click each Copy button and `Copy All` \| Buttons read `Copied` for about 2 seconds; Copy All text contains every populated section". | `false` | `Copy All` (`launchpad_artifact.html:536-542`) **never** sets its button text to `Copied`—it stays `"Copy All"` and writes to `#status` instead (only per-block buttons call `flashButton` for 1800 ms). |
| `tests/test_scenarios.md:91` | 375 px viewport has no horizontal page scroll; OS reduced motion has no animated transitions. | `verified` | Verified in CSS when Tailwind CDN loads (note: `brand_studio_artifact.html:109,160` leaves `infinite` spinner running at `0.01ms` duration). |
| `tests/test_scenarios.md:97-104` | `audit_rules_test.js` unit test vectors 1–8. | `verified` | Verified in `tests/audit_rules_test.js:77-136`. |
| `tests/test_scenarios.md:105` | Vector 9: "All shipped templates, the installer, `package.json` and the MCP config pass the rules." | `false` | `kindOf('package.json')` and `kindOf('claude_desktop_config.json')` return `'other'` (`tests/audit_rules_test.js:30-38`), which matches **0 rules** in `RULES`—those JSON files are never checked against any rule. |
| `tests/test_scenarios.md:106` | Vector 10: "No shipped prose file contains an unfinished marker." | `false` | `PROSE_DIRS` (`tests/audit_rules_test.js:64`) omits `tests/test_scenarios.md`. |
| `tests/test_scenarios.md:110,113-116` | Commands: `export TEST_HOME="$(mktemp -d)"`, `HOME="$TEST_HOME" ./install.sh --dry-run --yes`, `HOME="$TEST_HOME" BRAVE_API_KEY=example-key ./install.sh --yes`, `HOME="$TEST_HOME" ./install.sh --yes` ("Use a throwaway home so nothing real is touched"). | `false` | On Linux when `XDG_CONFIG_HOME` is set in the environment, `install.sh:67` (`${XDG_CONFIG_HOME:-$HOME/.config}/Claude/...`) ignores `HOME="$TEST_HOME"` and overwrites the user's real Claude Desktop config. |
| `tests/test_scenarios.md:120` | "Dry run prints the merged JSON with the key masked and writes nothing." | `false` | Line 114 (`HOME="$TEST_HOME" ./install.sh --dry-run --yes`) passes no `BRAVE_API_KEY`, so `vibecraft-brave-search` is skipped and no key is masked in its output. |
| `tests/test_scenarios.md:121` | First real run creates Desktop config (`vibecraft-filesystem`, `vibecraft-brave-search`, `vibecraft-fetch`) and `$TEST_HOME/.claude/skills/vibecraft/SKILL.md` (`name: vibecraft`) + `skills/`, `templates/generative-ui/`, `tests/`. | `verified` | Matches `install.sh:170-189,212-224` (when `XDG_CONFIG_HOME` is unset). |
| `tests/test_scenarios.md:122-123` | Second run backs up config (`.bak-<timestamp>`), moves previous skill folder aside, keeps other `mcpServers` entries, leaves one entry per VibeCraft server; without Brave key, Brave server is skipped and summary says so. | `false` | In the sequence on `:115-116`, run 1 writes `vibecraft-brave-search` into the config; run 2 (without `BRAVE_API_KEY`) copies `current.mcpServers` (`install.sh:167,173-174`), leaving `vibecraft-brave-search` with `"example-key"` **active in the config** even though the summary prints `Brave Search: skipped (no key)`. Also, `:113-116` never seed any non-VibeCraft `mcpServers` entry to verify preservation. |
| `tests/test_scenarios.md:124` | "An existing config that is not valid JSON makes the installer stop without modifying it." | `verified` | `install.sh:154-160` exits `2` without modifying `$CONFIG_PATH` (note: `$PROJECTS_DIR` and `$CONFIG_PATH.bak-$TIMESTAMP` are created beforehand at `:111,130`, and `:113-116` include no command exercising invalid JSON). |
| `skills/qa_auditor.md:33` vs `qa_diff_artifact.html:326` | Command `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src --glob "!**/tokens.css"` vs `rg -n "..." src`. | `false` | `qa_diff_artifact.html:326` omits `--glob "!**/tokens.css"`, causing `rg` to flag all 90 valid token definitions in `src/styles/tokens.css` (contradicting row 5 of its own table at `:206`). |

---

## (b) Formal Findings (`DOC-01` .. `DOC-18`)

```
ID: DOC-01        Severity: high
Where: tests/test_scenarios.md:83
What: Setting REPORT.tokens.files[0].hardcoded to 3 corrupts the QA Diff audit stamp into reporting "[Slop: 3 Remaining]" because stampText() conflates hardcoded color violations with open slop findings.
Evidence: Doc (tests/test_scenarios.md:83): "Edit `REPORT.tokens.files[0].hardcoded` to 3 and reload | Token percent drops, meter turns red, verdict reads `Needs fixes`, stamp shows the real values" + Code (templates/generative-ui/qa_diff_artifact.html:286,295): "const bad = REPORT.tokens.files.reduce((sum, f) => sum + f.hardcoded, 0);" ... "const slop = t.bad === 0 ? 'Scrubbed' : t.bad + ' Remaining';"
Impact: Users and auditors get false "[Slop: N Remaining]" stamps whenever hardcoded colors exist, and false "[Slop: Scrubbed]" / "All gates passed" verdicts whenever open slop findings remain with zero hardcoded colors.
Fix: Add an explicit open-slop count field (e.g., `REPORT.slopRemaining = 0`, or sum open findings) in `qa_diff_artifact.html`, use it in `totals().ok` and `stampText()` instead of `t.bad`, and verify `hardcoded: 3` keeps `[Slop: Scrubbed]`.
Verify: Set `REPORT.tokens.files[0].hardcoded = 3` with `slopRemaining: 0` in `qa_diff_artifact.html` and confirm `stampText()` outputs `[Tokens: 99% Validated] • [Slop: Scrubbed]`, then set `slopRemaining: 2` and confirm `[Slop: 2 Remaining]` and `Needs fixes`.
```

```
ID: DOC-02        Severity: high
Where: skills/qa_auditor.md:26
What: Documented "not run" syntax-check handling claims no passing stamp is printed, but qa_diff_artifact.html treats `checker: "not run"` with `errors: 0` as 100% passing.
Evidence: Doc (skills/qa_auditor.md:26 & tests/test_scenarios.md:62): "If you cannot run it, write \"not run\" in `REPORT.syntax.checker` and do not print a passing stamp." / "Fail: a clean stamp when a check was not run" + Code (templates/generative-ui/qa_diff_artifact.html:289,296,321): "const syntaxOk = REPORT.syntax.errors === 0;" ... "return '🛡️ Auditor: [Syntax: ' + REPORT.syntax.errors + ' Errors]...'" ... "$('syntax-pct').textContent = t.syntaxOk ? '100% pass' : REPORT.syntax.errors + ' errors';"
Impact: In Claude Desktop or environments where `tsc` cannot run, following `qa_auditor.md:26` (`checker: 'not run', errors: 0`) produces a deceptive green "All gates passed", "100% pass", and `[Syntax: 0 Errors]` stamp.
Fix: In `qa_diff_artifact.html`, detect `!/^not run$/i.test(REPORT.syntax.checker)` (or `REPORT.syntax.ran !== false`) before setting `syntaxOk = true`, rendering `[Syntax: Not Run]` in `stampText()` and `Needs verification` in the verdict when not run.
Verify: Set `REPORT.syntax.checker = 'not run'` with `errors: 0` in `qa_diff_artifact.html` and verify `#verdict-text` is not `All gates passed`, `#syntax-pct` reads `Not run`, and `#stamp` reads `[Syntax: Not Run]`.
```

```
ID: DOC-03        Severity: high
Where: docs/architecture.md:102
What: Architecture docs claim copying role files, templates, and the audit script beside SKILL.md keeps bare relative paths working in Claude Code, which fails when invoked from any normal project directory.
Evidence: Doc (docs/architecture.md:102 & README.md:45): "The installer builds it from `system_prompt.md` and places the role files, templates and audit script beside it, so the relative paths in the directive keep working." / "In any Claude Code session, describe an app or type `/vibecraft`." + Code (install.sh:219 & system_prompt.md:3,86): `cat "$SCRIPT_DIR/system_prompt.md" > "$SKILL_DEST/SKILL.md"` containing bare paths `skills/research_scout.md` and `templates/generative-ui/`.
Impact: Any Claude Code user invoking `/vibecraft` inside their own app folder (`~/Projects/my-app`) has CWD set to their app, so bare paths `skills/*.md`, `templates/generative-ui/*.html`, and `node tests/audit_rules_test.js` fail to resolve unless rewritten to `${CLAUDE_SKILL_DIR}/...` or `$SKILL_DEST/...`.
Fix: Have `install.sh` (or the canonical `SKILL.md` source) prefix bundled skill asset paths with `${CLAUDE_SKILL_DIR}/` (or rewrite `skills/`, `templates/generative-ui/`, and `tests/audit_rules_test.js` to `$SKILL_DEST/...` at install time).
Verify: Install to a temp skill directory, inspect generated `SKILL.md`, and confirm every bundled file path resolves from an empty `/tmp/my-app` working directory.
```

```
ID: DOC-04        Severity: high
Where: README.md:111
What: README claims artifact layout gracefully "degrades" when network access is blocked (and architecture.md calls templates "self-contained"), whereas blocking Tailwind CDN collapses all layout utilities and exposes unstyled browser chrome.
Evidence: Doc (README.md:111 & docs/architecture.md:67): "If a network is blocked, layout degrades and diagrams show their source text; the copy buttons keep working." / "Each template is one self-contained HTML file: Tailwind (CDN) for layout utilities..." + Code (templates/generative-ui/stack_matrix_artifact.html:10,130-131 & brand_studio_artifact.html:10,165,174,186): `<script src="https://cdn.tailwindcss.com"></script>` and `<form id="matrix" class="grid gap-4 lg:grid-cols-3"><fieldset class="contents">` with no fallback CSS for `.grid`, `.flex`, `.gap-*`, `.p-*`, or `.contents`.
Impact: Offline users and users inside CSP-restricted artifact sandboxes see zero-padding cards jammed together, single-column collapse, console network/CSP errors, and a raw browser 2px groove border around `<fieldset class="contents">` in Stack Matrix.
Fix: Inline the minimal layout utility CSS rules actually used by the four templates (`.grid`, `.flex`, `.contents`, spacing/gaps, responsive columns) removing the `cdn.tailwindcss.com` script dependency, or update `README.md:111` and `docs/architecture.md:67` to stop claiming self-contained files and graceful offline layout.
Verify: Load all four HTML templates in headless Chromium with all external network requests aborted (`route('https://**', r => r.abort())`) and verify layout grids, padding, `<fieldset>` reset, and zero console errors.
```

```
ID: DOC-05        Severity: medium
Where: README.md:45
What: Repository metadata and README market VibeCraft as a Claude plugin with a `/vibecraft` command, despite having no `.claude-plugin/plugin.json`, no `commands/` directory, and flat `skills/*.md` files that Claude Code ignores as skills.
Evidence: Doc (README.md:45 & package.json:2,12): "In any Claude Code session, describe an app or type `/vibecraft`." / `"name": "vibecraft-claude-plugin"`, `"install:plugin": "bash install.sh"` + Code (install.sh:215-221 & skills/brand_artisan.md:1-4): No `.claude-plugin/plugin.json` or `commands/` exists; `skills/*.md` carry `name: vibecraft-*` frontmatter in flat files rather than `<skill>/SKILL.md` directories, so `/vibecraft` only exists after `install.sh` synthesizes `~/.claude/skills/vibecraft/SKILL.md`.
Impact: Users loading the repo via `claude --plugin-dir .` or `/plugin` get neither `/vibecraft` nor any of the five `vibecraft-*` sub-skills, and developers inspecting the repo find non-standard skill layout.
Fix: Add `.claude-plugin/plugin.json` and canonical `skills/vibecraft/SKILL.md` (and/or `commands/vibecraft.md`) or document clearly in `README.md` that `/vibecraft` is registered solely as a personal skill via `./install.sh` rather than a native Claude Code plugin manifest.
Verify: Check that either `claude --plugin-dir .` discovers `/vibecraft` via standard plugin layout or `README.md` and `package.json` accurately describe the standalone skill installation mechanism.
```

```
ID: DOC-06        Severity: medium
Where: README.md:112
What: README and architecture docs claim all templates select and display text for manual copying when clipboard access is blocked, but `launchpad_artifact.html` fails to do so for `Copy All` and diagram `Copy source`.
Evidence: Doc (README.md:112 & docs/architecture.md:76): "Clipboard access can be blocked inside some artifact sandboxes. The templates then select the text and show it for manual copying." / "if both fail, the text is selected and shown for manual copying." + Code (templates/generative-ui/launchpad_artifact.html:380-383,536-542): `btn.addEventListener('click', async () => { const ok = await copyText(LAUNCH[diagramKind]); flashButton(btn, ok, 'Copy source'); });` and `status.textContent = ok ? ... : 'Clipboard is blocked here. Use the Copy buttons on each block, or select the text.';` (with no `<textarea id="fallback">`).
Impact: Inside sandboxed artifact iframes where clipboard APIs are blocked, clicking `Copy All` neither shows nor selects the combined bundle, and clicking `Copy source` on a rendered Mermaid diagram tells the user `Press Ctrl/Cmd+C` while nothing is selected and the Mermaid source is hidden behind the SVG.
Fix: Add a hidden readonly `<textarea id="fallback">` to `launchpad_artifact.html` and populate, reveal, focus, and `.select()` it whenever `copyText()` returns `false` in `copyAll()` and the diagram `Copy source` handler.
Verify: Stub `navigator.clipboard.writeText` to reject and `document.execCommand` to return `false`, click `Copy All` and `Copy source` in `launchpad_artifact.html`, and assert `#fallback` is visible and `window.getSelection()` / `fallback.selectionEnd` contains the full text.
```

```
ID: DOC-07        Severity: medium
Where: tests/test_scenarios.md:82
What: Test scenario B for `qa_diff_artifact.html` instructs testers to verify that clicking an empty category filter chip shows the empty message, which is impossible because empty categories never render a chip.
Evidence: Doc (tests/test_scenarios.md:82): "`qa_diff_artifact.html` | Click each diff filter chip | Hunks filter; an empty category shows the empty message" + Code (templates/generative-ui/qa_diff_artifact.html:362-365): `function renderFilters() { const host = $('filters'); const present = ['all', ...new Set(REPORT.diffs.map((d) => d.category))]; present.forEach((key, i) => { ...`
Impact: QA testers following `tests/test_scenarios.md:82` cannot pass the stated criterion as written because all 5 categories are populated in `REPORT.diffs` and removing hunks from a category removes its chip rather than showing `.empty`.
Fix: Either render filter chips for all `Object.keys(CATEGORY_LABELS)` in `qa_diff_artifact.html:364` so empty categories can be clicked to show `.empty`, or update `tests/test_scenarios.md:82` to test setting `REPORT.diffs = []` for the empty state.
Verify: Open `qa_diff_artifact.html` with one category absent from `REPORT.diffs` (or `REPORT.diffs = []` per updated doc) and confirm the documented step triggers `"Nothing was scrubbed in this category."`.
```

```
ID: DOC-08        Severity: medium
Where: tests/test_scenarios.md:88
What: Test scenario B claims clicking `Copy All` in `launchpad_artifact.html` makes the button read `Copied` for about 2 seconds, whereas `Copy All` never changes its button label.
Evidence: Doc (tests/test_scenarios.md:88): "Click each Copy button and `Copy All` | Buttons read `Copied` for about 2 seconds; Copy All text contains every populated section" + Code (templates/generative-ui/launchpad_artifact.html:536-542): `async function copyAll() { const ok = await copyText(allText()); const status = $('status'); ... status.textContent = ok ? 'Everything copied. Paste it into a new file or chat.' : ... }`
Impact: Manual and automated browser tests checking `tests/test_scenarios.md:88` fail because `#copy-all` continues to read `"Copy All"` instead of `"Copied"`.
Fix: Call `flashButton($('copy-all'), ok, 'Copy All')` inside `copyAll()` in `launchpad_artifact.html` (or update `tests/test_scenarios.md:88` to expect `#status` confirmation for `Copy All`).
Verify: Click `#copy-all` in `launchpad_artifact.html` and verify its button text and `#status` match `tests/test_scenarios.md:88`.
```

```
ID: DOC-09        Severity: medium
Where: skills/qa_auditor.md:33
What: The token compliance `rg` command in `skills/qa_auditor.md:33` excludes `tokens.css`, whereas `qa_diff_artifact.html:326` displays an unfiltered `rg` command that flags `tokens.css` itself, and `docs/architecture.md:95` specifies line/marker exemptions instead.
Evidence: Doc (skills/qa_auditor.md:33 & docs/architecture.md:95): `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src --glob "!**/tokens.css"` / "Token definitions are exempt in two ways: a line that declares a custom property (`--name: value`), and everything between `@tokens:start` and `@tokens:end` markers." + Code (templates/generative-ui/qa_diff_artifact.html:206,326): `{ name: 'src/styles/tokens.css', refs: 90, hardcoded: 0, note: 'definitions' }` and `$('regex-line').textContent = 'rg -n "' + REPORT.tokens.regex + '" src';`
Impact: Running the command displayed in the QA Diff report (`rg -n "..." src`) produces 90 false-positive violations in `src/styles/tokens.css`, directly contradicting the `0` hardcoded count shown in the table immediately below it.
Fix: Append ` --glob "!**/tokens.css"` to `#regex-line` in `qa_diff_artifact.html:326` and note both the CLI `--glob` exclusion and `@tokens`/`--custom-property` line exemptions consistently in `docs/architecture.md` and `skills/qa_auditor.md`.
Verify: Compare the rendered `#regex-line` in `qa_diff_artifact.html` with `skills/qa_auditor.md:33` and confirm running it against a sample `src/styles/tokens.css` yields 0 hits.
```

```
ID: DOC-10        Severity: medium
Where: docs/architecture.md:82
What: Docs claim `tests/audit_rules_test.js` implements the same rules as `qa_auditor.md` and audits `package.json`, `claude_desktop_config.json`, `install.sh`, and all prose files, but multiple file types and rules silently bypass inspection.
Evidence: Doc (docs/architecture.md:82,87 & tests/test_scenarios.md:105-106): "`tests/audit_rules_test.js` exports `audit(source, filename)`; the Auditor role describes the same rules." / "`placeholder` ... Applies to: all code" / "9. All shipped templates, the installer, `package.json` and the MCP config pass the rules. 10. No shipped prose file contains an unfinished marker." + Code (tests/audit_rules_test.js:14-19,30-38,64): `kindOf` returns `'other'` for `.json` (matching 0 rules); `placeholder` checks `(\/\/|\/\*|<!--)` (missing `# TODO` in `.sh`); `transition-all`, `gradient`, and `z-index-arms-race` omit `'ts'`/`'js'` (`.tsx`/`.jsx`); named colors (`white`/`black`) and glow shadows (`qa_auditor.md:36`) have no rules; `PROSE_DIRS` omits `tests/test_scenarios.md`.
Impact: Violations in `.tsx`/`.jsx` Tailwind classes, `# TODO` comments in shell scripts, named CSS colors like `"white"`, `.json` files, and `tests/test_scenarios.md` pass `npm test` undetected despite docs claiming coverage.
Fix: Extend `audit_rules_test.js` (`kindOf` for `.json`, `#` comment support in `placeholder` for `'sh'`, `'ts'`/`'js'` in Tailwind craft rules, `tests/test_scenarios.md` in `PROSE_DIRS`) and document in `docs/architecture.md:82` which `qa_auditor.md` checks are semantic LLM checks vs static regex checks.
Verify: Add unit assertions in `tests/audit_rules_test.js` for `# TODO` in `.sh`, `placeholder` in `.json`, `transition-all` in `.tsx`, and `tests/test_scenarios.md` in `PROSE_DIRS`, then run `npm test`.
```

```
ID: DOC-11        Severity: medium
Where: tests/test_scenarios.md:110
What: The documented throwaway-home installer test block can overwrite a real Linux user's `XDG_CONFIG_HOME` config, fails to exercise key masking on the dry-run line, and leaves `vibecraft-brave-search` enabled on the no-key re-run.
Evidence: Doc (tests/test_scenarios.md:110,114-116,120,122-123): "Use a throwaway home so nothing real is touched:" / `HOME="$TEST_HOME" ./install.sh --dry-run --yes` / `HOME="$TEST_HOME" BRAVE_API_KEY=example-key ./install.sh --yes` / `HOME="$TEST_HOME" ./install.sh --yes` / "Dry run prints the merged JSON with the key masked" / "Without a Brave key the Brave server is skipped" + Code (install.sh:67,167,173-174): `Linux) DEFAULT_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json"` and `const servers = { ...(current.mcpServers || {}) }; ... if (env && Object.values(env).some((v) => v === '')) { skipped.push(name); continue; }`.
Impact: Linux developers with `XDG_CONFIG_HOME` set who run the test snippet modify their real Claude Desktop config; testers running line 114 see no masked key; and running line 116 after line 115 silently retains `vibecraft-brave-search` in `claude_desktop_config.json` despite reporting it skipped.
Fix: In `tests/test_scenarios.md:113-116`, unset/override `XDG_CONFIG_HOME="$TEST_HOME/.config"`, pass `BRAVE_API_KEY=example-key` on the `--dry-run` command, seed a dummy `mcpServers.existing` entry to verify preservation, and test the no-key run against a clean config (or remove stale `vibecraft-brave-search` when no key is supplied if intentional).
Verify: Run the updated command sequence on macOS and Linux (with `XDG_CONFIG_HOME` pre-set to a sentinel dir) and verify sentinel files are untouched and all pass criteria hold.
```

```
ID: DOC-12        Severity: medium
Where: README.md:106
What: Docs claim each template has a single replaceable data block (`STACKS`, `THEMES`, `REPORT`, `LAUNCH`) with unchanged code/HTML and "Only the changed data is generated", but `brand_studio_artifact.html` hardcodes Voice Memo UI outside `THEMES`, `stack_matrix_artifact.html` has two constants, and Claude must emit the whole HTML file.
Evidence: Doc (README.md:104,106 & docs/interaction_guide.md:15): "Change an archetype: edit the `THEMES` block in `brand_studio_artifact.html`" / "Each has one data block at the top of its script (`STACKS`, `THEMES`, `REPORT`, `LAUNCH`) that Claude replaces; the code below it never changes." / "Only the changed data is generated; code and styles are reused" + Code (brand_studio_artifact.html:184-229,319,452-475; stack_matrix_artifact.html:149,154; system_prompt.md:88): Hardcoded `Live preview · Voice memo app`, `Memos transcribed`, `let current = 'linear';`, separate `CONCEPT` + `STACKS`, and `"Publish the whole file as an HTML artifact."`
Impact: Following `system_prompt.md:87` / `README.md:106` causes Brand Studio to render Voice Memo microcopy for every unrelated product (violating Craft 12 R5), crashes `brand_studio_artifact.html` if the `linear` key is renamed in `THEMES`, and misstates token cost in `docs/interaction_guide.md:15`.
Fix: Move Brand Studio preview microcopy into a `PREVIEW` / `BRAND_DATA` object alongside `THEMES`, initialize `current = Object.keys(THEMES)[0]`, list `CONCEPT` in `README.md:106`, and reword `docs/interaction_guide.md:15` to say "Only the data block is edited; structure and styles stay fixed".
Verify: Replace only the data block in `brand_studio_artifact.html` (renaming `linear` and changing product copy to a habit tracker) and confirm the page renders without errors or leftover "Voice memo" strings.
```

```
ID: DOC-13        Severity: low
Where: README.md:90
What: Craft 12 documentation contradicts itself on gradients and motion properties, and the four shipped templates violate the stated Craft 12 motion, spacing-scale, and heading line-height invariants.
Evidence: Doc (README.md:90, docs/architecture.md:100, system_prompt.md:106-110, skills/brand_artisan.md:28,30,39,66): "no gradients ... spaced on a scale ... motion as physics" / "R1 and R2 forbid glow and gradients." / "A gradient is allowed only if it is the brand itself, used once." / "R3 ... `transition: background-color 150ms ease, transform 150ms ease`" vs "R12 ... Animate `transform` and `opacity` only" / "Spacing on a scale: 4, 8, 16, 24, 48, 96" / "headings 1.1 to 1.2 line-height" + Code (brand_studio_artifact.html:44,79; launchpad_artifact.html:50-51,60; qa_diff_artifact.html:52): Templates transition `background-color`, `border-color`, and `color`, use `6, 10, 12, 14, 20, 32, 40 px` spacing, and set `h3 { line-height: 1.3 }` / `1.25` and `h2` inheriting `1.55`.
Impact: Claude receives conflicting instructions in its prompt context (e.g., whether a brand gradient is allowed vs banned by `audit_rules_test.js`, and whether `background-color` transitions are required by R3 or forbidden by R12).
Fix: Align R1 across `brand_artisan.md:28` and `audit_rules_test.js` (ban gradients consistently), update R12 to allow color/border transitions on hover/theme switches (matching R3 and the templates) while restricting layout/positional motion to `transform` and `opacity`, and include `12` and `32` in the documented spacing scale or tighten template CSS.
Verify: Diff `system_prompt.md`, `skills/brand_artisan.md`, `README.md`, `docs/architecture.md`, and `templates/generative-ui/*.html` to confirm zero contradictions across R1–R12.
```

```
ID: DOC-14        Severity: low
Where: docs/interaction_guide.md:11
What: Top-level rules mandate "3 to 5 lines of prose per turn" (minimum 3), contradicting the turn budgets and role instructions that require 0 to 3 lines.
Evidence: Doc (README.md:3,89, system_prompt.md:7, docs/interaction_guide.md:11): "Chat prose is 3 to 5 lines per turn. Never more." + Contradicting Docs/Code (docs/interaction_guide.md:22-26, skills/system_architect.md:25, skills/qa_auditor.md:21, install.sh:216): Turn budgets list `0 to 1 line`, `1 to 2 lines`, `2 to 3 lines`; Architect specifies `HUD plus one line`; Auditor specifies `HUD plus the audit stamp line`; `install.sh:216` says `at most 5 lines`.
Impact: Strict models pad 1-line gate turns (Phase 1 brief, Phase 3 approval, Phase 4 stamp) with unnecessary prose to hit a 3-line floor, defeating token preservation.
Fix: Change `"3 to 5 lines"` to `"at most 5 lines (typically 1 to 3)"` in `system_prompt.md:7`, `README.md:3,89`, and `docs/interaction_guide.md:11`.
Verify: Grep for `3 to 5 lines` across the repo and confirm all prose limits specify an upper bound (`<= 5 lines`) consistent with role files and `tests/test_scenarios.md`.
```

```
ID: DOC-15        Severity: low
Where: docs/interaction_guide.md:30
What: `docs/interaction_guide.md` defines the Brief vs Detailed input gate differently from `system_prompt.md`, omitting both the word-count disjunction and the stack/design-direction override.
Evidence: Doc (docs/interaction_guide.md:30): "A message is **brief** when it is two sentences or fewer (about 30 words), and it omits at least two of: platform, target user, core features, constraints. Otherwise it is **detailed**." + Code/Directive (system_prompt.md:37-38): "**Brief:** two sentences or fewer, or fewer than about 30 words, and it leaves out at least two of: platform, target user, core features, constraints. **Detailed:** everything else, or any message that includes a stack, a design direction, a feature list, or a pasted spec."
Impact: Readers of `docs/interaction_guide.md` expect short stack-specific prompts (e.g., `"Build a dark brutalist habit tracker in Astro"`) to trigger micro-prompts, whereas `system_prompt.md:38` skips straight to Phase 1.
Fix: Update `docs/interaction_guide.md:30` to match `system_prompt.md:37-38` verbatim (including `"or fewer than about 30 words"` and the stack/design-direction/feature-list/spec override).
Verify: Compare `docs/interaction_guide.md:30` and `system_prompt.md:37-38` side-by-side to confirm identical classification logic.
```

```
ID: DOC-16        Severity: low
Where: docs/architecture.md:23
What: The architecture diagram wires MCP servers (`filesystem, search, fetch`) into the Builder role (`R4`), contradicting `skills/fullstack_builder.md:30` which instructs Claude Desktop to emit code artifacts rather than writing to the filesystem.
Evidence: Doc (docs/architecture.md:22-23): `MCP[(MCP servers<br/>filesystem, search, fetch)] --> R1` and `MCP --> R4` + Code (skills/fullstack_builder.md:30 & tests/test_scenarios.md:60): "In a Claude Code session, write files into the project. In Claude Desktop, deliver the code as code artifacts, one per module, plus the file tree in the Launchpad." / "code is produced (files in Claude Code; code artifacts in Desktop)".
Impact: Users prompted by `install.sh` (`Folder Claude may read and write [~/Projects]`) and `docs/architecture.md:23` expect Claude Desktop's Builder phase to scaffold files into `~/Projects`, when `fullstack_builder.md:30` tells it not to.
Fix: Either instruct `skills/fullstack_builder.md:30` to write project files via `vibecraft-filesystem` in Claude Desktop when that MCP tool is available (falling back to code artifacts otherwise), or remove `MCP --> R4` from `docs/architecture.md:23`.
Verify: Check `docs/architecture.md:23`, `skills/fullstack_builder.md:30`, and `tests/test_scenarios.md:60` for consistent Desktop file-output behavior.
```

```
ID: DOC-17        Severity: low
Where: README.md:45
What: Claude Code artifact output instructions specify `vibecraft/<phase>.html`, which causes Phase 4's two distinct HTML artifacts (`qa_diff_artifact.html` and `launchpad_artifact.html`) to overwrite each other.
Evidence: Doc (README.md:45): "Artifacts are written to `vibecraft/` in your project as HTML files you open in a browser." + Code/Directive (system_prompt.md:77,88): Phase 4 produces `"Code, then qa_diff_artifact.html, then the full launchpad_artifact.html"` while line 88 states `"In Claude Code, write it to vibecraft/<phase>.html in the project and tell the user the path."`
Impact: In Phase 4 (and between Phase 3 draft Launchpad and Phase 4 full Launchpad), naming files by `<phase>.html` (`vibecraft/phase-4.html`) overwrites `qa_diff_artifact.html` when `launchpad_artifact.html` is written immediately afterwards.
Fix: Specify distinct filenames in `system_prompt.md:88` and `README.md:45` (e.g., `vibecraft/01-stack-matrix.html`, `vibecraft/02-brand-studio.html`, `vibecraft/03-architecture.html`, `vibecraft/04-qa-diff.html`, `vibecraft/04-launchpad.html`).
Verify: Check `system_prompt.md:88` and `README.md:45` to ensure every deliverable across Phases 1–4 maps to a unique filename under `vibecraft/`.
```

```
ID: DOC-18        Severity: info
Where: templates/generative-ui/launchpad_artifact.html:157
What: The sample `LAUNCH.readme` inside `launchpad_artifact.html` gives the exact incomplete `AudioContext` advice that `skills/research_scout.md:52` explicitly flags as wrong.
Evidence: Doc/Skill (skills/research_scout.md:52): "Mic indicator stays on until every `MediaStreamTrack` is stopped; closing only the `AudioContext` is not enough. `[Verified]`" + Code (templates/generative-ui/launchpad_artifact.html:157): `'- Close the AudioContext when the tab is hidden, or the mic indicator stays on.'`
Impact: Because Claude reads `launchpad_artifact.html` as its structural/few-shot template before filling `LAUNCH`, the defective sample bullet encourages Claude to repeat the exact WebAudio mistake `research_scout.md` warns against.
Fix: Update `templates/generative-ui/launchpad_artifact.html:157` to `'- Stop every MediaStreamTrack and close the AudioContext when recording ends or the tab is hidden, or the mic indicator stays on.'` (matching `qa_diff_artifact.html:268`).
Verify: Read `launchpad_artifact.html:157`, `qa_diff_artifact.html:268`, and `skills/research_scout.md:52` and confirm all three state that `MediaStreamTrack`s must be stopped.
```
