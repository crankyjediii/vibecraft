# The Craft 12 and Token Contract

Every VibeCraft HTML artifact and every generated UI module follows these twelve rules and the 19-key CSS custom property contract.

## 1. Linter-Enforced Invariants (Checked by `scripts/audit/cli.js`)

| Rule | Invariant | Audit Rule IDs | Concrete Requirement |
|---|---|---|---|
| R1 | Flat deliberate color | `VC007` | Zero CSS gradients (`linear-gradient`, `radial-gradient`, `conic-gradient`, `bg-gradient-to-*`) unless the user explicitly waives R1 in chat. |
| R2 | Structural depth, zero neon glow | `VC008` | Separate surfaces with 1px hairline borders (`var(--border)`) and neutral elevation shadows (`var(--shadow)`). Colored neon `box-shadow` and `drop-shadow` are forbidden. |
| R3 | Explicit motion | `VC006` | Never write `transition: all` or `transition-all`. Name exact animated properties (`background-color`, `border-color`, `color`, `transform`, `opacity`) and honor `prefers-reduced-motion: reduce`. |
| R5 | Domain microcopy only | `VC016` | Zero `TODO`, `FIXME`, `lorem ipsum`, `John Doe`, `acme@example.com`, or generic placeholder labels. Use realistic copy for the user's product. |
| R6 | Semantic tokens only | `VC001`, `VC002` | Hex (`#...`), `rgb()`, `hsl()`, `oklch()`, named CSS colors (`white`, `black`), and default Tailwind palette classes (`bg-indigo-500`, `text-zinc-400`) appear only inside `:root` token blocks or `@tokens:start..@tokens:end`. Every component reads `var(--token)`. |
| R7 | Calibrated contrast | `VC002` | Avoid pure `#000000` on `#ffffff`. Body text pairs (`--ink` and `--muted` over `--bg`, `--surface`, `--surface-2`, and `--accent-fg` over `--accent`) must measure `>= 4.5:1` WCAG 2.2 relative luminance contrast. Non-text UI indicators (`--ok`, `--warn`, `--danger`, active borders) must measure `>= 3.0:1`. |
| A11Y | Keyboard focus and hit targets | `VC003`, `VC004`, `VC005`, `VC010` | Every interactive control defines `:focus-visible`, never strips outlines (`outline: none`) without a visible replacement in the same rule, keeps hit dimensions `>= 24px` (`36px` to `44px` target), and carries an accessible label. |
| Z-Scale | Bounded stacking context | `VC009` | Keep `z-index` on a documented 2-digit scale (`10`, `20`, `30`, `40`, `50`); values `>= 1000` fail audit. |

## 2. Design-Review Heuristics (Checked by Brand Artisan and Builder Self-Check)

| Rule | Heuristic | Concrete Requirement |
|---|---|---|
| R4 | Squint-test hierarchy | One primary focal element and one primary CTA (`background: var(--accent); color: var(--accent-fg)`) per screen. |
| R8 | Rhythm spacing scale | Stick to `4, 8, 12, 16, 20, 24, 32, 48, 64, 96 px` steps and CSS logical properties (`padding-inline`, `margin-inline`, `text-align: start`) so LTR and RTL layouts hold cleanly. |
| R9 | Constrained typography | At most 2 font families (`--font-display` and `--font-sans`, plus `--font-mono` for metrics/code) and at most 4 font weights (`400, 500, 600, 700`). Enable `font-variant-numeric: tabular-nums` on counters, prices, latencies, and timestamps. |
| R10 | Cohesive icon geometry | Stroke icons share one stroke width (`1.5px` or `1.75px`) and optical box (`16px` or `20px`) across a view; decorative SVGs carry `aria-hidden="true"`. |
| R11 | Complete state coverage | Interactive controls implement `default`, `hover`, `focus-visible`, `active`, and `disabled`. Async or collection views implement `loading`, `empty`, `error`, and `overflow` (long text wrapping at `375px` without horizontal scroll). |
| R12 | Scoped elevation | Reserve `--shadow` for floating overlays (menus, dialogs, popovers) or raised cards on light themes; inline rows use borders instead of drop shadows. |

## 3. Canonical 19-Key Token Contract (`TOKEN_KEYS`)

Every Brand Studio archetype and generated `src/styles/tokens.css` defines all 19 CSS custom properties inside `:root`:

- **Surfaces & Borders (5):** `--bg`, `--surface`, `--surface-2`, `--border`, `--border-strong`
- **Typography Colors (2):** `--ink`, `--muted`
- **Brand Accent (3):** `--accent`, `--accent-fg`, `--accent-soft`
- **Semantic Status (3):** `--ok`, `--warn`, `--danger`
- **Geometry & Elevation (3):** `--radius`, `--radius-sm`, `--shadow`
- **Font Stacks (3):** `--font-display`, `--font-sans`, `--font-mono`
