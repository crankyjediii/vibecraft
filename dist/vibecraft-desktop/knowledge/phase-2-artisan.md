# Phase 2: Brand Artisan

## Purpose

Translate the locked product concept into an interactive Brand Studio (`brand_studio_artifact.html`) containing domain-accurate preview copy (`PREVIEW`) and `4 to 6` WCAG 2.2 AA-verified token presets (`THEMES`), locking the exact 19-key `:root` CSS contract before architecture or UI implementation begins.

## Inputs

- Locked Phase 1 stack (`VIBECRAFT PICK` block or chat selection), or existing CSS/Tailwind theme files when invoked standalone via `/vibecraft:brand`.
- Canonical token and Craft 12 specification in `../vibecraft/references/craft-12.md`.
- User aesthetic preferences (dark vs light, editorial vs utilitarian, custom brand hex), if stated.

## Preconditions

1. Phase 1 gate passed (or standalone `/vibecraft:brand` invoked).
2. Target product includes a user interface, documentation site, or styled terminal view (headless tools offered Phase 2 skip per orchestrator Section 0.4).

## Step Procedure

1. **Select or customize 6 balanced archetypes (3 dark, 3 light):** Start from the six calibrated presets (`linear`, `apple`, `editorial`, `brutalist`, `swiss`, `nocturne`), setting `PREVIEW.defaultTheme` to the best-fit key for the user's product and audience. If the user named a brand color, tune `--accent`, `--accent-fg`, and `--accent-soft` to pass WCAG 2.2 AA.
2. **Author domain microcopy (`PREVIEW`):** Replace every preview label (`productLabel`, `metricLabel`, `metricValue`, `progressPct`, `batchLabel`, `fieldLabel`, `fieldValue`, `dropdownOptions`, `primaryCta`, `secondaryCta`, `disabledCta`) with realistic domain strings for the user's product. Zero voice-memo leftovers on non-audio products.
3. **Verify contrast ratios mathematically:** Every text token pair (`--ink` and `--muted` on `--bg`, `--surface`, `--surface-2`; `--accent-fg` on `--accent`; `--accent` on alpha-composited `--accent-soft`; `--ok` on composited chip background) must measure `>= 4.5:1`. Non-text UI strokes/bars (`--ok` progress bar on `--surface-2`) must measure `>= 3.0:1`.
4. **Emit `brand_studio_artifact.html`:** Read `templates/generative-ui/brand_studio_artifact.html` and replace only the `PREVIEW` and `THEMES` blocks inside `@tokens:start .. @tokens:end`. Write to `vibecraft/02-brand-studio.html` in Claude Code or render as an Artifact in Claude Desktop.
5. **Reply in chat:** Emit the 3-line HUD (`Phase 2/4 · Brand Studio ready · Paste VIBECRAFT LOCK or name a theme`) plus `1 to 3` prose lines (`<= 60` words) naming the default archetype, light/dark coverage, and the lock instruction.

## Decision Rules (Numeric Thresholds)

- **Contrast floors (WCAG 2.2 AA):** Normal text `< 24px` (`< 18.66px` bold) requires contrast `>= 4.5:1`; large display headings and interactive boundaries/progress fills require `>= 3.0:1`. Target `>= 5.0:1` to preserve margin under subpixel anti-aliasing.
- **Pure-extreme guard (Craft R7):** Never emit `#000000` or `#ffffff` when paired directly; keep dark backgrounds `>= #080808` and light surfaces `<= #fbfbf9` (or `#fafafa`).
- **Palette balance:** Include at least `2` dark and `2` light themes (default `3` dark: `linear`, `brutalist`, `nocturne`; `3` light: `apple`, `editorial`, `swiss`) so users can test ambient lighting extremes immediately.

## Output Contract

```ts
interface BrandPreviewCopy {
  defaultTheme: string;       // Key in THEMES, e.g. 'swiss' or 'linear'
  productLabel: string;       // e.g. 'Live preview · LedgerSlip invoicing'
  metricLabel: string;        // e.g. 'Invoices paid (30d)'
  metricValue: string;        // Tabular figure, e.g. '$42,850'
  progressPct: number;        // Integer 0..100
  batchLabel: string;         // e.g. '14 of 16 settled on time'
  fieldLabel: string;         // e.g. 'Client workspace'
  fieldValue: string;         // e.g. 'Kestrel Hardware Co.'
  dropdownLabel: string;      // e.g. 'Tax profile'
  dropdownOptions: [string, string, string];
  primaryCta: string;         // e.g. 'Issue invoice'
  secondaryCta: string;       // e.g. 'Preview PDF'
  disabledCta: string;        // e.g. 'Send reminder'
}

interface ThemeTokens {
  name: string;               // Display name, e.g. 'Swiss Grid'
  scheme: 'dark' | 'light';
  tagline: string;            // 1-line typographic/surface summary
  'bg-primary': string;
  'bg-surface': string;
  'bg-raised': string;
  'fg-primary': string;
  'fg-muted': string;
  border: string;
  accent: string;
  'accent-2': string;
  'accent-fg': string;
  success: string;
  danger: string;
  radius: string;
  'radius-btn': string;
  'font-sans': string;
  'font-display': string;
  'font-mono': string;
  'shadow-overlay': string;
  blur: string;
  'shape-opacity': string;
}
```

Pasting `VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan` locks all 19 CSS custom properties verbatim for Phase 4's `src/styles/tokens.css`.

## Worked Examples

See `references/examples.md` for two complete runs:
1. **Clean Product Theme Run:** B2B invoice tool defaulting to **Swiss Grid** (`swiss`) with tabular financial figures (`min contrast 5.11:1`).
2. **Ambiguous / Conflicting Brand Input:** `"make it neon cyberpunk yellow text on white background with rainbow gradients"` (calculates exact `1.07:1` WCAG failure, offers a compliant high-contrast electric acid-on-obsidian alternative or ink-on-acid swap, and records explicit R1 waiver only if confirmed).

## Failure Modes & Recovery

- **User-supplied hex fails `4.5:1` contrast:** Preserve the user's hue angle in OKLCH/HSL while adjusting lightness until `ratio >= 4.5:1` on both `--surface` and `--accent-soft`, noting the exact contrast delta in 1 prose line.
- **Truncated `VIBECRAFT LOCK` paste-back:** If fewer than 19 `--<key>:` lines or no closing `}` appear, hold Phase 2 and offer `[1] Fill missing tokens from <Archetype> preset*  [2] Re-paste block`.

## Refusal & Escalation Rules

- Refuse deceptive dark-pattern UI requests (hidden unsubscribe buttons, low-contrast `1.3:1` fee disclosures, spoofed bank login themes) in 1 plain line.
- If the user explicitly insists on a CSS gradient after seeing Craft R1, record `Waiver: VC007 (user-requested gradient)` inside the lock state so Phase 4 honors their choice transparently.

## Token / Word Budget

- `SKILL.md` target: `< 1,100` words (`< 5,800` bytes).
- Chat reply budget: 3-line HUD + `1 to 3` prose lines (`<= 60` words).

## Self-Check List

- [ ] Are all 19 `TOKEN_KEYS` populated in every `THEMES` entry with zero `undefined` values?
- [ ] Does every text pair measure `>= 4.5:1` and every UI bar/border pair `>= 3.0:1` (alpha-composited)?
- [ ] Is `PREVIEW` 100% tailored to the user's domain (zero leftover demo strings)?
- [ ] Are both dark and light archetypes included, with `PREVIEW.defaultTheme` matching a valid key in `THEMES`?
