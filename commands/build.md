---
description: Launch VibeCraft's gated four-phase design and full-stack engineering pipeline (Scout, Brand Artisan, System Architect, Builder + QA Auditor) on a new or existing product idea.
argument-hint: "<product-idea-or-spec>"
---

Run the **VibeCraft Studio Orchestrator** (`${CLAUDE_PLUGIN_ROOT}/skills/vibecraft/SKILL.md`) on the user's input:

```text
$ARGUMENTS
```

1. Apply **Section 0 (Scope & Safety Gate)** and **Section 3 (Adaptive Input Gate)** immediately.
2. If `$ARGUMENTS` is empty, emit the 3-line HUD (`Phase 1/4 · Ready · Describe what we are building`) and ask 1 crisp line for the product idea.
3. If `$ARGUMENTS` is **Brief** (`<= 30` words, `<= 2` sentences, missing `>= 2` of platform/user/features/constraints), emit the 3-line HUD and at most 2 Hick's Law micro-prompts (`Q1 · Angle`, `Q2 · Ambition`), then stop and wait.
4. If `$ARGUMENTS` is **Detailed**, execute **Phase 1 (`research-scout`)** immediately and write `vibecraft/01-stack-matrix.html`.
