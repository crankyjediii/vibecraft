# VibeCraft Orchestrator Worked Examples

## Example 1: Clean End-to-End Turn Progression (Brief Idea to Phase 4 Stamp)

### User Turn 1 (Brief: 6 words, omits platform, user, features, constraints)
`Build a local markdown invoice generator.`

### Assistant Turn 1 (Adaptive Input Gate -> Brief; zero web searches yet)
```text
╭─ VIBECRAFT · Invoice Generator
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Scoping brief · Pick 2 numbers (or "go")
```

```text
Q1 · Angle:    [1] Local-first desktop*  [2] Static browser app  [3] CLI PDF tool  [4] Cloud web SaaS
Q2 · Ambition: [1] Focused weekend MVP*  [2] Multi-currency v1   [3] Polish existing repo
```

### User Turn 2
`2 1`

### Assistant Turn 2 (Phase 1 Research Scout -> `vibecraft/01-stack-matrix.html`)
```text
╭─ VIBECRAFT · LedgerSlip
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Stack Matrix ready · Paste VIBECRAFT PICK or name a stack
```

Compared three static browser stacks in `vibecraft/01-stack-matrix.html`; SvelteKit + Typst WASM leads for offline PDF rendering under 45 ms `[Inferred]`, with `window.print()` `@page` CSS as zero-bundle runner-up.
Click **Copy selection for Claude** in the matrix and paste the `VIBECRAFT PICK` block here.

---

## Example 2: Messy Input, Out-of-Range Digit, and Truncated Lock-Block Recovery

### User Turn 1 (Messy / Contradictory 14-word prompt with no platform or stack)
`idk maybe something for tracking sourdough starters?? super fast no login needed maybe`

### Assistant Turn 1 (Brief -> 2 micro-prompts)
```text
╭─ VIBECRAFT · Sourdough Tracker
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Scoping brief · Pick 2 numbers (or "go")
```

```text
Q1 · Angle:    [1] Mobile offline PWA*   [2] Native iOS/Android  [3] Desktop kitchen log
Q2 · Ambition: [1] Feeding timer MVP*    [2] Recipe + hydration calc  [3] Bakery batch log
```

### User Turn 2 (Out-of-range digit on Q1)
`9 1`

### Assistant Turn 2 (Single-line re-prompt without adding a third question)
```text
╭─ VIBECRAFT · Sourdough Tracker
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Clarify Q1 · Pick 1, 2, or 3 (Q2=1 locked)
```

`9` is outside Q1's options; Q2 (`Feeding timer MVP`) is locked.
```text
Q1 · Angle: [1] Mobile offline PWA*  [2] Native iOS/Android  [3] Desktop kitchen log
```

### User Turn 4 (Truncated `VIBECRAFT LOCK` paste-back missing closing `}` and 14 tokens)
```text
VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan
Archetype: Editorial (editorial)
:root {
  --bg-primary: #faf6f0;
  --bg-surface: #f4efe6;
```

### Assistant Turn 4 (Hold Phase 2 gate; report exact missing keys)
```text
╭─ VIBECRAFT · CrumbLog
│  ✓ Scout   ● Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 2/4 · Incomplete lock block · Choose 1 or re-paste
```

Your pasted `VIBECRAFT LOCK` block is truncated after `--bg-surface` (missing closing `}` and 17 of 19 required `TOKEN_KEYS`).
```text
Fix lock: [1] Complete missing keys from Editorial preset*  [2] Re-paste full VIBECRAFT LOCK block
```
