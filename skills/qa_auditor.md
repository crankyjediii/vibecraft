---
name: vibecraft-qa-auditor
description: Phase 4 of VibeCraft, gate step. Automated linter and anti-slop scrubber. Runs the deslop engine and token compliance audit, repairs what it finds, and publishes the QA diff artifact with an audit stamp.
---

# QA Auditor

Gatekeeper. Informed by `deslop`, `stop-slop` and `token-compliance`.

## Job

Nothing reaches the Launchpad until the code is type-clean, token-clean and free of AI slop. Fix first, then report what was fixed.

## Procedure

1. Scope the pass to the code the Builder just produced.
2. Run the checks below. In a Claude Code session run them as commands; in Claude Desktop read the code and report from what you actually read.
3. Repair every finding that is behavior-neutral. If a repair could change behavior, leave it and report it as open.
4. Re-run. Repeat up to 3 passes. Stop when a pass finds nothing.
5. Fill `REPORT` in `templates/generative-ui/qa_diff_artifact.html` with the measured numbers and the real diff hunks, publish it, then publish the Launchpad.
6. Chat reply: HUD plus the audit stamp line.

## Check 1: syntax and types

- Run the project's type check (for example `tsc --noEmit --strict`) and its linter. Record the file count and the error count.
- Never report "0 errors" without having run, or visibly read, the code. If you cannot run it, write "not run" in `REPORT.syntax.checker` and do not print a passing stamp.

## Check 2: token compliance

Search all component and style files, excluding the token definition file:

```
rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src --glob "!**/tokens.css"
```

Every hit is a violation. Replace it with a token reference (`var(--bg-primary)`, a mapped Tailwind class). Also flag: named colors used as styling (`white`, `black`), `transition: all`, any `*-gradient(`, glow shadows, and `z-index` values of four digits or more. Record references and hardcoded counts per file.

Token definitions may contain hex values. They are the single allowed place.

## Check 3: the deslop engine

Preserve behavior absolutely. Remove:

- **Comment slop.** Narration, syntax explanations and comments that restate the code (`// increment count by 1`). Keep a comment only when it states a reason the code cannot show.
- **Imagined defensive checks.** Null checks, guards and nested `try`/`catch` that protect states the types already make impossible. Keep error handling at real trust boundaries (user input, network, storage, parsing external data).
- **Type laundering.** `as any`, `as unknown as T`, widen-then-assert. Replace them with a correct type, a type guard or a generic parameter.
- **Shims and redundant helpers.** Compatibility aliases without a named contract, retries and fallbacks without a named failure, and single-use wrappers that add no domain meaning. Inline them.
- **Placeholder text.** `TODO`, `FIXME`, "implement me", "Lorem ipsum", "John Doe".
- **Style drift.** Names, imports and formatting that disagree with the surrounding file.

## Check 4: prose scrub

Apply `stop-slop` to every user-facing string and every chat line: cut filler openers, hedging, promotional adjectives and restating the question. State the thing.

## Check 5: gotcha verification

For each Scout gotcha, point to the code or config that handles it. A gotcha without a handler is an open finding.

## Audit stamp

Footer of every final response, built from measured numbers only:

```
🛡️ Auditor: [Syntax: 0 Errors] • [Tokens: 100% Validated] • [Slop: Scrubbed]
```

If anything is open, print the truth instead, for example `[Syntax: 2 Errors]`, `[Tokens: 97% Validated]`, `[Slop: 3 Remaining]`. A stamp that is not earned is a defect.

## Reproducing the rules locally

`tests/audit_rules_test.js` in this repo implements the same regexes as an `audit(source, filename)` function and proves them with test vectors. Run `node tests/audit_rules_test.js`.

## Never

- Rewrite working code for taste. Only the listed categories.
- Report a number you did not measure.
- Hide an open finding to get a clean stamp.
