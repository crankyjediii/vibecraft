# Interaction guide

How VibeCraft keeps conversations short, and the protocols it uses to do it.

## Token preservation

Long chat replies bury decisions and use up the context window. VibeCraft spends tokens only where they change the outcome.

| Rule | Why | Where it lives |
|---|---|---|
| 3 to 5 lines of prose per turn | One decision per turn stays visible | `system_prompt.md` section 1 |
| Everything bigger goes into an artifact | The user reads it in a panel, not in the scroll | `system_prompt.md` section 5 |
| Artifact content is never retyped in chat | Saves the same tokens twice | `system_prompt.md` section 5 |
| Pasted lock blocks are state, not text to repeat | The model reads them once and acts | section 5, gate rules |
| One data block per template | Only the changed data is generated; code and styles are reused | `docs/architecture.md` |
| The HUD is three fixed lines | Orientation without prose | `system_prompt.md` section 2 |

Typical turn budget:

| Turn | HUD | Prose | Artifact |
|---|---|---|---|
| Brief idea, first reply | 3 lines | 0 to 1 line | none (micro-prompts instead) |
| Phase 1 | 3 lines | 2 to 3 lines | Stack Matrix |
| Phase 2 | 3 lines | 2 to 3 lines | Brand Studio |
| Phase 3 | 3 lines | 1 to 2 lines + approval prompt | Launchpad draft |
| Phase 4 | 3 lines | 2 to 3 lines + stamp | QA Diff, Launchpad |

## The input gate

A message is **brief** when it is two sentences or fewer (about 30 words), and it omits at least two of: platform, target user, core features, constraints. Otherwise it is **detailed**.

| Message | Class | Behavior |
|---|---|---|
| "Build me a voice memo app that transcribes and groups notes by project." | Brief | Research starts silently; two micro-prompts; then Phase 1 |
| "Make a habit tracker." | Brief | Same |
| "A Mac menubar app, Tauri and Solid, that records the mic on a hotkey and groups transcripts by project. Dark, minimal. Local only." | Detailed | Phase 1 immediately, no questions |
| A pasted multi-paragraph spec | Detailed | Phase 1 immediately |

Only a brief idea ever gets questions, and never more than two.

## The micro-prompt protocol

Use a micro-prompt for operational or architectural forks, where the choice is not visual.

```
Q1 Angle     [1] Private, offline-first*  [2] Multi-user cloud  [3] Native desktop
Q2 Ambition  [1] Weekend MVP*  [2] Polished v1  [3] Launch-ready
Reply with digits (e.g. "1 2"), or "go" for the starred defaults.
```

Rules (Hick's Law: fewer options, faster decisions):

- At most 2 questions per message, at most 3 options per question, one line per question.
- The recommended option carries `*`. Options come from the user's idea, not from a template.
- Accept `1 2`, `1,2`, `go`, or a plain-language answer ("cloud, polished"). Never ask a confirming follow-up.
- If the answer implies a different stack than the Scout expected, the Scout adapts; the user is not asked again.

Use a visual artifact instead when the choice is aesthetic or comparative (stacks, themes, layouts, logos).

## Lock blocks

Artifacts hand state back through a block the user pastes into chat.

`VIBECRAFT PICK` (from the Stack Matrix):

```
VIBECRAFT PICK · Phase 1 · Research Scout
Stack: Vite + React 19 + PGlite + Tailwind (Local-First Studio)
Why: Capture and search work with no network, and transcripts never leave the device.
Performance: 40 ms [Inferred]
Offline: Full offline [Verified]
Cost: $0 hosting [Inferred]
[Gotcha] IndexedDB quota eviction: Safari can purge script-written storage after 7 days without a visit.
Fix: Call navigator.storage.persist() on first record and add a one-tap export to a file.

Continue: start Phase 2 (Brand Artisan) with this stack.
```

`VIBECRAFT LOCK` (from the Brand Studio):

```
VIBECRAFT LOCK · Phase 2 · Brand Artisan
Archetype: Linear Dark

:root {
  --bg-primary: ...;
  --accent: ...;
  (all keys from the token contract)
}

Rules: Craft 12 enforced, tokens only, no hardcoded colors in components.
Continue: start Phase 3 (System Architect).
```

Claude reads `Stack:` and the `[Gotcha]` line from the first, and the archetype name and `:root` block from the second. The `:root` block goes verbatim into the project's token file.

## Changing your mind

- In chat: "use Astro instead" or "make it brutalist". Claude updates the plan and re-runs only the phases that change.
- In an earlier artifact: re-open it, choose again, paste the new block. Later gates that depended on the old choice are re-run.

## Writing style for chat lines

Plain, specific, no ceremony: no "Great question", no "I'll now", no restating what the user said, no sign-offs. One thing for the user to do, stated last.

Good: `Scout pick: Local-First Studio. Capture works offline and transcripts stay on the device. Compare all three and use "Select Stack & Proceed".`

Weak: `Great idea! I've done some research and put together a few options for you to consider, and I think you'll find that...`
