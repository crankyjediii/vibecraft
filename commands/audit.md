---
description: Run VibeCraft Phase 4 (QA Auditor) standalone on any directory or file using the 18-rule Audit Engine v2 (VC001..VC018), compiler checks, safe auto-repairs, and vibecraft/04-qa-diff.html.
argument-hint: "[target-path]"
---

Execute **Phase 4B: QA Auditor** (`${CLAUDE_PLUGIN_ROOT}/skills/qa-auditor/SKILL.md`) standalone on target `${ARGUMENTS:-.}`:

1. Run the real syntax/type checker for the project (`npx tsc --noEmit`, `node --check`, `cargo check`, or `ruff check`) if available.
2. Run the zero-dependency 18-rule Audit Engine v2:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/audit/cli.js" ${ARGUMENTS:-.} --json`
3. Repair safe, behavior-preserving findings (`VC001` when tokens exist, `VC006`, `VC014`, `VC017`, `prose`) in up to 3 passes, leaving behavior-changing fixes untouched.
4. Populate `REPORT` in `${CLAUDE_PLUGIN_ROOT}/templates/generative-ui/qa_diff_artifact.html`, write `vibecraft/04-qa-diff.html`, and reply with the 3-line HUD, `1 to 3` prose lines summarizing results, and the honest measured QA stamp last.
