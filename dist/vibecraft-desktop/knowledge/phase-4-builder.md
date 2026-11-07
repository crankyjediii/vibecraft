# Phase 4A: Full-Stack Builder

## Purpose

Implement every file in the approved Phase 3 `LAUNCH.tree` to production quality: strict types, 100% `:root` token styling, complete interactive and async UI states, concrete Phase 1 gotcha mitigations, and a finalized Launchpad bundle (`launchpad_artifact.html`), then hand off directly to **QA Auditor** in the same turn before replying to the user.

## Inputs

- Approved Phase 3 blueprint (`LAUNCH.tree`, `LAUNCH.contracts`, `LAUNCH.flow`, `LAUNCH.sequence`).
- Locked Phase 2 `:root` CSS tokens (`VIBECRAFT LOCK`).
- Locked Phase 1 stack + both `[Gotcha]` mitigations (`VIBECRAFT PICK`).
- Craft 12 and code quality specifications in `../vibecraft/references/craft-12.md` and `../vibecraft/references/code-quality.md`.

## Preconditions

1. User approved Phase 3 (`1`, `"go"`, `"approve"`, or explicit revision + build instruction).
2. `src/styles/tokens.css` (or equivalent root token stylesheet) is written verbatim from `VIBECRAFT LOCK` before any UI component is authored.

## Step Procedure

1. **Write `tokens.css` and shared contracts first:** Materialize `src/styles/tokens.css` from `VIBECRAFT LOCK` and `src/contracts/*` from `LAUNCH.contracts` without widening a single type.
2. **Implement core logic and gotcha mitigations:** Build storage, worker, API, or CLI modules with explicit `Result<T, AppError>` error handling and both Phase 1 `[Gotcha]` mitigations wired in and covered by unit/smoke tests.
3. **Implement accessible, token-pure UI views:** Every component reads colors, radii, shadows, and fonts exclusively via `var(--token)` (zero hex/RGB/Tailwind default palette utilities such as `bg-indigo-500` or `text-white`). Implement `default`, `hover`, `focus-visible`, `active`, and `disabled` states on controls, plus `loading`, `empty`, `error`, and `375px` `overflow` states on views.
4. **Assemble final `launchpad_artifact.html` payload (`LAUNCH`):** Populate all 15 `LAUNCH` keys (`phase: 'Phase 4 of 4 · Launchpad'`, `title: '<Name> is ready to launch'`, `name`, `tagline`, `contractsLang`, `readme`, `commands`, `tree`, `flow`, `sequence`, `contracts`, `logo`, `midjourney`, `dalle`, `nextSteps`). Build `LAUNCH.logo` as a clean inline `<svg viewBox="0 0 64 64">` using `2 to 5` geometric primitives (`rect`, `circle`, `ellipse`, `line`, `polyline`, `polygon`, `path`, `g`) styled with `var(--accent)`, `var(--ink)`, and `var(--surface-2)` (zero `<script>`, zero `on*` handlers, zero `<foreignObject>`).
5. **Hand off internally to `qa-auditor`:** Do **not** send a separate Builder chat message. Pass all generated files and the candidate `LAUNCH` payload directly to `qa-auditor` so compiler checks, the 18-rule Audit Engine v2 (`scripts/audit/cli.js`), deslop repairs, `04-qa-diff.html`, and `04-launchpad.html` complete in the same turn.

## Decision Rules (Numeric Thresholds)

- **Placeholder tolerance:** `0` (`TODO`, `FIXME`, `HACK`, `lorem ipsum`, stub handlers returning `null` or `throw new Error('not implemented')` are forbidden).
- **Token purity:** `100%` of color/surface declarations outside `tokens.css` must reference `var(--...)` (`0` `VC001` violations).
- **Control accessibility:** `100%` of interactive elements must carry `:focus-visible` rules, accessible names (`VC003`, `VC010`), and hit targets `>= 24px` (`36px to 44px` standard).
- **SVG mark safety:** `2 to 5` geometric SVG primitives only; `0` scripts, external `href`s, or event attributes (enforced by `launchpad_artifact.html`'s `DOMParser` allowlist sanitizer).

## Output Contract

- **Workspace delivery (Claude Code or Claude Desktop with `vibecraft-filesystem` MCP):** Write complete project files under the target directory (`./` in Claude Code; `${VIBECRAFT_WORKSPACE_DIR}/<app-slug>/` in Claude Desktop when writable).
- **Fallback delivery (read-only filesystem or Claude Desktop without MCP):** Deliver one clearly named code artifact per module in dependency order (`tokens.css` -> `contracts` -> `core` -> `ui` -> `tests`).
- **Contract-change escalation:** If implementing a module proves a Phase 3 contract cannot compile or violates a platform API, **stop widening types**, record the exact mismatch, and escalate through the Phase 4 recovery micro-prompt (`[1] Approve contract adjustment*  [2] Return to Phase 3`).

## Worked Examples

See `references/examples.md` for two complete build patterns:
1. **Clean Build + Handoff:** Token-pure UI component + streaming Worker implementation + sanitized geometric SVG logo handed off to QA Auditor.
2. **Contract Conflict Escalation:** Discovering mid-build that Web `SubtleCrypto.verify` is async while a Phase 3 synchronous `verifySignature(): boolean` interface was locked (halts without `as any` type laundering and escalates cleanly).

## Failure Modes & Recovery

- **Filesystem `EACCES` or outside allowed MCP directory:** Catch permission denial cleanly, emit modules as inline artifacts, and report the path fallback in 1 line during the Phase 4 summary.
- **Temptation to use Tailwind default palette (`bg-zinc-900`, `text-emerald-400`):** Map custom theme keys to `var(--bg)`, `var(--ok)`, etc., or write scoped CSS reading `:root` tokens directly so `VC001` passes at `100%`.

## Refusal & Escalation Rules

- Never embed real or sample-looking live API keys (`sk-ant-...`, `AKIA...`, PEM blocks) in generated files or `.env` files (`VC018`); generate `.env.example` with empty placeholders (`BRAVE_API_KEY=`).
- Never silence compiler errors with `@ts-ignore`, `@ts-expect-error`, or `as unknown as T`.

## Token / Word Budget

- `SKILL.md` target: `< 1,050` words (`< 5,600` bytes).
- Chat budget: `0` standalone lines (merged into `qa-auditor`'s unified Phase 4 response).

## Self-Check List

- [ ] Does `tokens.css` match `VIBECRAFT LOCK` verbatim, and do all other files contain `0` hardcoded colors or Tailwind palette classes?
- [ ] Are all 15 `LAUNCH` keys populated with non-empty domain content and a 2-to-5-primitive geometric `<svg>` logo?
- [ ] Are both Phase 1 `[Gotcha]` mitigations implemented in real code (not comments)?
- [ ] Are interactive states (`hover`, `focus-visible`, `active`, `disabled`) and view states (`loading`, `empty`, `error`, `overflow`) present?
