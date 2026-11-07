---
description: Run VibeCraft Phase 1 (Research Scout) standalone to compare 3 to 4 software stacks with epistemic tags and two domain gotchas per option, writing vibecraft/01-stack-matrix.html.
argument-hint: "<idea-or-existing-repo-path>"
---

Execute **Phase 1: Research Scout** (`${CLAUDE_PLUGIN_ROOT}/skills/research-scout/SKILL.md`) standalone on:

```text
$ARGUMENTS
```

1. If `$ARGUMENTS` points to an existing directory or is empty inside an existing repository, inspect `package.json`, `Cargo.toml`, or `pyproject.toml` first and compare the current stack against 2 to 3 viable alternatives.
2. Load only the relevant domain section from `${CLAUDE_PLUGIN_ROOT}/skills/research-scout/references/gotcha-library.md`.
3. Populate `STACKS` in `${CLAUDE_PLUGIN_ROOT}/templates/generative-ui/stack_matrix_artifact.html`, write `vibecraft/01-stack-matrix.html`, and reply with the 3-line HUD plus `1 to 3` prose lines (`<= 60` words).
