# Skill Authoring Guide

VibeCraft skills follow Anthropic's progressive-disclosure `SKILL.md` standard so Claude Code and Claude Desktop keep idle token usage under `1,000` tokens while loading rich domain schemas on demand.

## 1. Directory & Frontmatter Rules

Every skill lives in its own directory under `skills/<kebab-name>/SKILL.md`:

```yaml
---
name: research-scout
description: Benchmark 3-4 candidate software stacks with verified/inferred tags, concrete failure-mode gotchas, and an interactive Stack Matrix artifact.
---
```

- `name` must match the parent directory name (`^[a-z0-9-]+$`).
- `description` must be a single concise sentence (`<= 240` characters) explaining *when* and *why* to invoke the skill.
- Combined `description` text across all 6 skills must stay below `1,000` estimated tokens (`node evals/runner.mjs` enforces this invariant).
- Never nest a `skills/` subdirectory inside another skill (`PRM-31`). Put shared rubrics inside `skills/vibecraft/references/`.

## 2. Required Sections in Specialist `SKILL.md` Files

Each specialist skill (`research-scout`, `brand-artisan`, `system-architect`, `fullstack-builder`, `qa-auditor`) must include:

1. **Role Objective & Inputs:** Exact upstream lock block (`VIBECRAFT PICK v2`, `VIBECRAFT LOCK v2`, or `LAUNCH` draft) required before execution.
2. **Execution Steps:** Numbered deterministic steps referencing `${CLAUDE_PLUGIN_ROOT}` / `templates/generative-ui/*.html`.
3. **Output Schema & Numeric Thresholds:** TypeScript-style data block contract (`STACKS`, `PREVIEW` + `THEMES`, `LAUNCH`, or `REPORT`), contrast minimums (`>= 4.5:1`), file-count bounds (`5 to 14`), and prose caps (`<= 5` lines, `<= 80` words).
4. **Worked Examples (Minimum 2):** At least two realistic domain examples (including non-SaaS domains such as CLI, edge webhook, or mobile offline).
5. **Failure Modes & Recovery:** Handling contradictory constraints, headless CLI stacks, clipboard restrictions, or missing shell compilers.
6. **Pre-Delivery Checklist:** Binary pass/fail checks verified before emitting the response.

## 3. Anti-Slop Prose & Token Standards

- **Zero em dashes (`U+2014`):** `evals/graders.mjs` rejects any skill or command file containing the `U+2014` character. Use colons, parentheses, commas, or periods.
- **Zero filler openers:** Never instruct or model replies starting with `"Great choice!"`, `"Certainly!"`, `"Absolutely!"`, or `"Sure thing!"`.
- **Canonical 19 `TOKEN_KEYS`:** Any reference to `:root` design tokens must match the 19 keys in `scripts/lib/lock-blocks.js` (`bg-primary`, `bg-surface`, `bg-raised`, `fg-primary`, `fg-muted`, `border`, `accent`, `accent-2`, `accent-fg`, `success`, `danger`, `radius`, `radius-btn`, `font-sans`, `font-display`, `font-mono`, `shadow-overlay`, `blur`, `shape-opacity`).

## 4. Synchronizing Desktop Artifacts

After editing any `skills/**` file, regenerate `system_prompt.md` and `dist/vibecraft-desktop/` and run the evaluation harness:

```bash
npm run build
npm run check:drift
npm run evals
```
