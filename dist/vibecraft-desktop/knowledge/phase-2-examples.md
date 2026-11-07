# Brand Artisan Worked Examples

## Example 1: Clean Run (LedgerSlip Static Browser Invoicing)

### Input State
Locked Phase 1 stack: `SvelteKit 2 + Typst WASM (Static Browser App)`. Audience: independent industrial designers sending itemised PDF invoices.

### Populated `PREVIEW` + Selected `swiss` Preset (Excerpt inside `@tokens:start .. @tokens:end`)
```js
const PREVIEW = {
  defaultTheme: 'swiss',
  productLabel: 'Live preview · LedgerSlip invoicing',
  metricLabel: 'Settled this quarter',
  metricValue: '$38,400',
  progressPct: 86,
  batchLabel: '12 of 14 invoices paid within Net-15',
  fieldLabel: 'Recipient studio',
  fieldValue: 'Atelier Nord GmbH',
  dropdownLabel: 'Currency & tax',
  dropdownOptions: ['EUR · Reverse charge 0%', 'USD · Export exempt', 'GBP · Standard 20%'],
  primaryCta: 'Compile PDF',
  secondaryCta: 'Duplicate draft',
  disabledCta: 'Mark settled'
};
```
`swiss` preset contrast verification: `ink` (`#141413`) on `surface` (`#fbfbf9`) = `18.15:1`; `muted` (`#52524d`) on `surface-2` (`#e8e8e2`) = `6.41:1`; `accent` (`#bd2419`) on composited `accent-soft` = `5.11:1`; `ok` (`#156d30`) on composited chip = `5.44:1`.

### Chat Reply (42 words, 2 prose lines)
```text
╭─ VIBECRAFT · LedgerSlip
│  ✓ Scout   ● Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 2/4 · Brand Studio ready · Paste VIBECRAFT LOCK or name a theme
```

Built six WCAG AA presets (3 light, 3 dark) in `vibecraft/02-brand-studio.html`, defaulting to **Swiss Grid** (`5.11:1+` contrast, tabular figures, archival `#f4f4f0` paper).
Tune tokens if needed, click **Lock & copy tokens**, and paste the `VIBECRAFT LOCK` block here.

---

## Example 2: Messy / Low-Contrast Input (`#ffff00` Yellow Text on White + Gradient Ask)

### User Input
`"use bright #ffff00 yellow text on #ffffff white cards so it feels energetic!! and slap a purple-to-cyan gradient across every card"`

### Resolution Strategy
1. `#ffff00` on `#ffffff` measures `1.07:1` WCAG contrast (unreadable, failing the `4.5:1` AA floor by `4.2x`).
2. Keep the user's high-energy yellow hue in two WCAG-passing ways inside `THEMES`:
   - **Brutalist Volt (`brutalist`, dark):** `#d4ff33` electric volt accent on `#0c0c0c` obsidian (`16.8:1` contrast, `#0c0c0c` ink on volt CTA = `16.8:1`).
   - **Solar Editorial (`editorial`, light):** warm `#faf6f0` card with `#1c1917` primary text (`16.4:1`), `#7a5900` dark ochre badge text (`5.6:1`), and crisp `1px` volt-amber highlight border.
3. Note Craft R1's flat-surface default in 1 line and offer an explicit R1 gradient waiver if they still want a header gradient.

### Chat Reply (53 words, 3 prose lines)
```text
╭─ VIBECRAFT · PulseBoard
│  ✓ Scout   ● Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 2/4 · Brand Studio ready · Paste VIBECRAFT LOCK (add "waive R1" for gradient)
```

`#ffff00` on `#ffffff` scores `1.07:1` contrast (WCAG AA requires `4.5:1`), so `vibecraft/02-brand-studio.html` pairs your electric yellow with `#0c0c0c` obsidian (**Brutalist**, `16.8:1`) and a light dark-ochre alternative (`5.6:1`).
Craft R1 defaults to flat surfaces; paste `VIBECRAFT LOCK` as-is, or add `"waive R1"` in chat to enable a hero gradient.
