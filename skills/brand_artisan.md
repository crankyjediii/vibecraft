---
name: vibecraft-brand-artisan
description: Phase 2 of VibeCraft. Creative director and design-systems architect. Applies the Craft 12 invariants, offers four aesthetic archetypes in the Brand Studio artifact, and locks a token set.
---

# Brand Artisan

Creative direction and tokenized design systems. Informed by `craft`, `pro-design`, `apple-ui-design` and `uiux-ui-design-basics`.

## Job

Give the product a visual identity as design tokens, chosen by the user from four live archetypes, and guarantee that everything built afterwards uses only those tokens.

## Procedure

1. Read the locked stack from the `VIBECRAFT PICK` block.
2. Choose which archetype fits the product best and why in one line (the Brand Studio cards stay neutral, the pick is stated in chat).
3. If the product needs a different feel than the four archetypes give, adjust values in the `THEMES` data block (inside the `@tokens:start` and `@tokens:end` markers) while keeping the same token keys. Do not add new keys without also updating `TOKEN_KEYS`.
4. Publish `templates/generative-ui/brand_studio_artifact.html` as an HTML artifact.
5. Chat reply: HUD plus up to 3 lines: your archetype pick and the reason, and the instruction to click Lock in.

## The Craft 12 invariants

Every artifact and every line of UI code obeys these. They are checked by the QA Auditor.

| # | Rule | In practice |
|---|---|---|
| R1 | No random gradients | Flat, deliberate color. A gradient is allowed only if it is the brand itself, used once. |
| R2 | No glow or halo shadows | No neon `box-shadow`, no colored outer glow. Shadows mean physical elevation only. |
| R3 | No `transition: all` | Name properties: `transition: background-color 150ms ease, transform 150ms ease`. |
| R4 | Break monotony | One element per view is allowed to be big. Vary rhythm. It must read at squint distance. |
| R5 | No placeholder copy | Real microcopy for the product. No "Lorem ipsum", no "John Doe". |
| R6 | `isolation: isolate` | Contain stacking contexts. No `z-index: 9999`. |
| R7 | Tuned neutrals | No pure `#000` on `#fff`. Use deep zincs such as `#09090b` or `#18181b` and off-whites. |
| R8 | Spacing on a scale | 4, 8, 16, 24, 48, 96 px. Proximity defines grouping. |
| R9 | Type hierarchy | Headings line-height 1.1 to 1.2, body 1.5 to 1.6, `tabular-nums` for numbers. |
| R10 | Borders vs shadows | Hairline borders for structure (`1px solid` at low alpha). Soft layered low-alpha shadows for overlays only. |
| R11 | Every state designed | `:hover`, `:focus-visible`, `:active`, `:disabled`, loading, empty and error. |
| R12 | Motion as physics | 150 to 250 ms. `ease-out` to enter, `ease-in` to exit. Animate `transform` and `opacity` only. Honor `prefers-reduced-motion`. |

Where an archetype description seems to conflict with a rule, the rule wins. Example: Linear Dark is described with an indigo and cyan accent; it is implemented as flat accent fills and hairline borders, never as glow.

## The four archetypes

| Archetype | Surface | Accent | Type | Shape |
|---|---|---|---|---|
| Linear Dark | Deep zinc (`#09090b`, `#18181b`) | Indigo with cyan secondary | Geist or Inter sans | 8 px radius, hairline borders |
| Editorial Warmth | Warm parchment (`#fbfbfa`), charcoal text | Terracotta with forest secondary | Serif display, sans body | 4 px radius, soft paper tones |
| Cyber Brutalist | Stark monochrome | Canary `#facc15` | Monospace throughout | 0 radius, strong 1 px borders |
| Apple Clean | Neutral grays, translucent glass (`backdrop-filter: blur(20px)`) | SF blue | SF or Inter | Large radius, pill buttons |

Contrast floor: body text 4.5:1, large text and UI parts 3:1. Check the accent against its foreground token before locking.

## Token contract

The locked token set always contains these keys: `bg-primary`, `bg-surface`, `bg-raised`, `fg-primary`, `fg-muted`, `border`, `accent`, `accent-2`, `accent-fg`, `success`, `danger`, `radius`, `radius-btn`, `font-sans`, `font-display`, `font-mono`, `shadow-overlay`, `blur`, `shape-opacity`.

Components reference tokens only: `color: var(--fg-primary)`, never a hex, `rgb()`, `hsl()` or `oklch()` value. Hex values live in exactly one place, the token definitions.

## Hand-off

The user pastes back a block starting with `VIBECRAFT LOCK`. Copy the `:root { ... }` block verbatim into `src/styles/tokens.css` (or the equivalent) and pass the archetype name to the Architect and Builder. Then start Phase 3.

## Never

- Add a gradient, glow, or `transition: all` "just this once".
- Describe the palette in chat. The artifact shows it.
- Put a hex value in a component file.
