# Phase 4B: QA Auditor

## Purpose

Verify generated or existing repository code with real compiler checks and the 19-rule VibeCraft Audit Engine v2 (`scripts/audit/cli.js`), repair mechanical defects without altering behavior, record every before/after hunk in `qa_diff_artifact.html`, gate final Launchpad publication on clean checks, and close the turn with a strictly measured QA stamp.

## Inputs

- Source files written by `fullstack-builder` (or an existing repository directory when invoked via `/vibecraft:audit`).
- Candidate `LAUNCH` payload from `fullstack-builder` (in full pipeline runs).
- Canonical rules in `../vibecraft/references/craft-12.md`, `../vibecraft/references/code-quality.md`, and `scripts/audit/cli.js` (`VC000`..`VC018`).

## Preconditions

1. Target source files exist on disk (or in module artifacts when running without filesystem access).
2. Audit checks measure actual file contents; never guess or hardcode `"100% Validated"` or `"0 Errors"`.

## Step Procedure

1. **Run syntax and type checker (`Check 1`):** Execute `npx tsc --noEmit` (or `node --check`, `cargo check`, `ruff check`) when shell execution is available. Record the exact command in `REPORT.syntax.checker` and exact error count in `REPORT.syntax.errors`. If shell execution is unavailable, set `REPORT.syntax.checker = 'not run'` and `REPORT.syntax.errors = 0`.
2. **Run 19-rule Audit Engine v2 (`Check 2`):** Execute `node "${CLAUDE_PLUGIN_ROOT}/scripts/audit/cli.js" <target-dir> --json` (or relative to `${CLAUDE_SKILL_DIR}`) covering `VC000..VC018` (`invalid-ignore`, `hardcoded-color`, `token-contrast`, `missing-focus-visible`, `outline-none-without-replacement`, `touch-target-size`, `transition-all`, `gradient`, `glow-shadow`, `z-index-arms-race`, `unlabeled-control`, `type-laundering`, `missing-return-type`, `swallowed-error`, `console-leftover`, `dead-export`, `placeholder`, `comment-slop`, `hardcoded-secret`).
3. **Verify Phase 1 gotcha mitigations & prose (`Check 3 & Check 4`):** Confirm each locked `[Gotcha]` from Phase 1 has a concrete implementation in code, and scrub user-facing strings and chat prose for filler openers, vague intensifiers, and em dashes.
4. **Repair loop (up to `3` passes):** Fix safe, behavior-preserving findings (`tokens`, `comments`, `defensive`, `types`, `helpers`, `placeholder`, `style`, `prose`), recording each repair hunk in `REPORT.diffs` and re-running Steps 1 and 2 after every pass. Leave behavior-changing fixes untouched and increment `REPORT.openSlop` or `REPORT.openGotchas`.
5. **Emit `qa_diff_artifact.html` and gate `launchpad_artifact.html`:**
   - Always write `vibecraft/04-qa-diff.html` (`qa_diff_artifact.html`).
   - **Clean pass (`checker !== 'not run'`, `syntax.errors === 0`, `hardcoded === 0`, `openSlop === 0`, `openGotchas === 0`):** Also write `vibecraft/04-launchpad.html` (`launchpad_artifact.html`), emit HUD (`✓ Scout   ✓ Artisan   ✓ Architect   ✓ Builder+QA` · `Phase 4/4 · Build & QA complete · ready to run`), `1 to 3` prose lines naming generated paths, and the `✓ VibeCraft QA` stamp line last.
   - **No-shell pass (`checker === 'not run'`, all static checks `0`):** Publish both artifacts, use `! VibeCraft QA · [Syntax: Not Run] · ...` so static-only status is explicit.
   - **Blocked gate (errors or open findings remain after 3 passes):** Publish `04-qa-diff.html` **only**, withhold `04-launchpad.html`, print `! VibeCraft QA` with exact nonzero counts, and end with `[1] Approve behavior-changing fix*  [2] Return to Phase 3`.

## Decision Rules (Numeric Thresholds)

- **Maximum repair iterations:** `3` passes maximum before halting and reporting remaining findings openly.
- **Token score formula:** `Math.round(((totalStyledRefs - hardcodedViolations) / Math.max(1, totalStyledRefs)) * 100)` across non-token source files (`tokens.css` excluded from denominator so token declarations never inflate the score).
- **WCAG token contrast (`VC002`):** Fail any theme/root block with normal text contrast `< 4.5:1` or UI indicator contrast `< 3.0:1`.

## Output Contract

```ts
type DiffCategory =
  | 'comments'
  | 'defensive'
  | 'types'
  | 'helpers'
  | 'tokens'
  | 'placeholder'
  | 'style'
  | 'prose';

interface QaReport {
  project: string;
  timestamp: string;
  passesRun: number;          // 1..3
  openSlop: number;           // Unresolved audit/deslop findings (>= 0)
  openGotchas: number;        // Unmitigated Phase 1 gotchas (>= 0)
  syntax: {
    checker: string;          // e.g. 'tsc --noEmit' or 'not run'
    errors: number;
    summary: string;
  };
  tokens: {
    files: Array<{
      file: string;           // Excludes tokens.css
      refs: number;           // Styled property lines
      hardcoded: number;      // VC001 violations remaining
    }>;
  };
  gotchas: Array<{
    issue: string;
    mitigation: string;
    file: string;
    verified: boolean;
  }>;
  diffs: Array<{
    file: string;
    category: DiffCategory;
    why: string;
    before: string;
    after: string;
  }>;
}
```

## Worked Examples

See `references/examples.md` for two complete audit runs:
1. **Clean 2-Pass Repair & Launchpad Release:** Catches 2 hardcoded hex colors (`VC001`), 1 `transition: all` (`VC006`), and 1 narrating comment (`VC017`) on Pass 1, repairs to `0` violations on Pass 2, and prints `✓ VibeCraft QA`.
2. **Standalone `/vibecraft:audit` on Messy Legacy Repo:** Surfaces `checker: 'tsc --noEmit'` with `4` type errors, `84%` token adherence, and `1` swallowed catch (`VC013`) that would alter error return behavior, emitting `! VibeCraft QA` and the approval prompt.

## Failure Modes & Recovery

- **`tsc` missing in target project:** Fall back to `node --check` on `.js`/`.mjs` files or workspace TypeScript if installed; if no compiler exists for `.ts`, set `checker: 'not run (typescript not installed)'` and print `[Syntax: Not Run]`.
- **Standalone `/vibecraft:audit` with no `tokens.css` in repo:** Report `VC001` findings accurately and offer to extract repeated hex literals into a starter `tokens.css` via `/vibecraft:brand`.

## Refusal & Escalation Rules

- Never fabricate a green `✓ VibeCraft QA` stamp when `checker === 'not run'`, `syntax.errors > 0`, `hardcoded > 0`, `openSlop > 0`, or `openGotchas > 0`.
- Never auto-delete code inside `catch` blocks or auth checks during deslop passes if removal could mask runtime failures.

## Token / Word Budget

- `SKILL.md` target: `< 1,150` words (`< 6,200` bytes).
- Chat reply budget: 3-line HUD + `1 to 3` prose lines (`<= 60` words) + 1-line QA stamp (plus 1-line escalation prompt only if blocked).

## Self-Check List

- [ ] Did `scripts/audit/cli.js` run on all generated/target files, excluding `tokens.css` from token denominator inflation?
- [ ] Are `REPORT.openSlop` and `REPORT.openGotchas` explicit integers separate from `REPORT.tokens`?
- [ ] Do all `REPORT.diffs[*].category` values belong to the 8 canonical `DiffCategory` keys?
- [ ] Is the QA stamp the final line of the turn (when passing), built strictly from measured counts?
