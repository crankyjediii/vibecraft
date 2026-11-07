---
description: Run VibeCraft Phase 2 (Brand Artisan) standalone to explore 6 WCAG 2.2 AA-verified design-token archetypes (dark and light) with domain microcopy, writing vibecraft/02-brand-studio.html.
argument-hint: "[product-description-or-brand-hex]"
---

Execute **Phase 2: Brand Artisan** (`${CLAUDE_PLUGIN_ROOT}/skills/brand-artisan/SKILL.md`) and `${CLAUDE_PLUGIN_ROOT}/skills/vibecraft/references/craft-12.md` standalone on:

```text
$ARGUMENTS
```

1. Infer the product domain from `$ARGUMENTS` or the current workspace `README.md` / `package.json`.
2. Populate `PREVIEW` with domain-specific microcopy and verify all 6 `THEMES` (`linear`, `apple`, `editorial`, `brutalist`, `swiss`, `nocturne`, customized if the user named a hex color) pass WCAG 2.2 AA contrast (`>= 4.5:1` text, `>= 3.0:1` UI components).
3. Write `vibecraft/02-brand-studio.html` from `${CLAUDE_PLUGIN_ROOT}/templates/generative-ui/brand_studio_artifact.html` and reply with the 3-line HUD plus `1 to 3` prose lines (`<= 60` words).
