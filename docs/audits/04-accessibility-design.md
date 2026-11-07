# Track 4 Audit: Accessibility & Design Compliance

Audited commit: `13e02b15ab998e10b42a64bb36f6640725bd2614` (`overhaul/v1`)
Tools executed: Deterministic WCAG 2.2 relative-luminance calculator (`scratch/phase1_browser_audit.mjs`), `axe-core@4.10.2` in headless Chromium across every archetype and tab state, bounding-box hit-target measurement (`24px` AA floor / `44px` target), keyboard-only navigation walkthrough, `prefers-reduced-motion: reduce` computed-style verification, Craft 12 self-audit.

## Computed WCAG 2.2 Contrast Matrix

### Brand Studio Archetypes

| Pair | Requirement | Linear Dark | Editorial Warmth | Cyber Brutalist | Apple Clean |
|---|---:|---:|---:|---:|---:|
| `fg-primary` on `bg-primary` | >= 4.5:1 | 17.02 | 16.24 | 17.94 | 15.46 |
| `fg-primary` on `bg-surface` | >= 4.5:1 | 15.15 | 14.91 | 16.90 | 16.44 |
| `fg-primary` on `bg-raised` | >= 4.5:1 | 12.74 | 13.50 | 15.12 | 16.80 |
| `fg-muted` on `bg-primary` | >= 4.5:1 | 7.14 | 5.65 | 7.75 | 4.66 |
| `fg-muted` on `bg-surface` | >= 4.5:1 | 6.36 | 5.18 | 7.30 | 4.95 |
| `fg-muted` on `bg-raised` | >= 4.5:1 | 5.35 | 4.69 | 6.53 | 5.06 |
| `accent-fg` on `accent` (Primary Btn) | >= 4.5:1 | **4.50** (borderline) | 4.82 | 12.77 | 4.70 |
| `success` on `.chip` (14% tint) | >= 4.5:1 | 7.64 | 4.60 | 8.99 | **3.60 (FAIL)** |
| `danger` on `bg-surface` | >= 4.5:1 | 6.40 | 5.82 | 6.84 | 5.26 |
| `accent` on `bg-surface` (Focus/Ring) | >= 3.0:1 | 3.77 | 4.42 | 12.03 | 4.59 |
| `accent-2` on `bg-raised` (Progress) | >= 3.0:1 | 8.24 | 5.05 | 15.12 | **2.22 (FAIL)** |

### Shared Template Schemes (`stack_matrix`, `qa_diff`, `launchpad`)

| Pair | Requirement | Template Dark (`:root`) | Template Light (`@media light`) |
|---|---:|---:|---:|
| `fg-primary` on `bg-primary` | >= 4.5:1 | 17.02 | 17.11 |
| `fg-muted` on `bg-surface` | >= 4.5:1 | 6.36 | 7.01 |
| `fg-muted` on `bg-raised` | >= 4.5:1 | 5.35 | 6.35 |
| `accent-fg` on `accent` | >= 4.5:1 | **4.50** (borderline) | 5.88 |
| `success` on `bg-surface` (`.tag-verified`) | >= 4.5:1 | 10.17 | 4.55 |
| `bg-primary` on `success` (`.check` icon) | >= 4.5:1 | 11.42 | 4.84 |
| `info` on `bg-surface` (`.tag-inferred`) | >= 4.5:1 | 9.80 | 4.86 |
| `warn` on `bg-surface` (`.tag-gotcha`) | >= 4.5:1 | 10.61 | **4.47 (FAIL)** |
| `danger` on `bg-surface` | >= 4.5:1 | 6.40 | 5.87 |

---

## Findings

```text
ID: A11Y-01       Severity: high
Where: templates/generative-ui/brand_studio_artifact.html:301-302
What: The `Apple Clean` archetype fails WCAG 2.2 AA contrast on `.chip` (`3.60:1` < `4.5:1`) and `.fill` progress indicator (`2.22:1` < `3.0:1`).
Evidence: Relative luminance math measured `success` `#248a3d` over 14%-tinted `bg-surface` at `3.60:1` (confirmed independently by `axe-core` in Chromium: `3.66:1` on `<span class="chip num">+12%</span>`, impact `serious`) and `accent-2` `#34c759` on `bg-raised` at `2.22:1`.
Impact: Low-vision users cannot read positive metric chips or perceive progress bar fill boundaries when locking the Apple Clean token set, and downstream apps built from `VIBECRAFT LOCK` inherit failing tokens.
Fix: Darken Apple Clean `success` to `#1b7430` (`>= 5.1:1` on chip tint) and `accent-2` to `#1d8338` (`>= 4.6:1` on `bg-raised`), and enforce `VC002 token-contrast` in Audit Engine v2 so no failing token pair can ship.
Verify: Run `node scripts/audit/cli.js templates/` and `axe-core` across all Brand Studio archetypes; assert `0` contrast violations and all text pairs `>= 4.5:1` / UI pairs `>= 3.0:1`.
```

```text
ID: A11Y-02       Severity: medium
Where: templates/generative-ui/stack_matrix_artifact.html:40, qa_diff_artifact.html:39
What: Light-mode `--warn: #a16207` on `--bg-surface: #f4f4f1` achieves `4.47:1`, falling below the `4.5:1` WCAG 2.2 AA floor for `11px` `.tag-gotcha` text, and dark-mode `--accent: #5e6ad2` sits at `4.50:1` with zero rounding margin (`hover` color-mix shifts it further).
Evidence: Contrast script measured `warn on bg-surface` = `4.47:1` in `@media (prefers-color-scheme: light)` and `accent-fg (#fafafa) on accent (#5e6ad2)` = `4.50:1` in dark mode.
Impact: Small `11px` `[Gotcha]` epistemic tags in light mode fail WCAG 1.4.3 AA, and `#5e6ad2` leaves zero tolerance for subpixel antialiasing or hover color mixing.
Fix: Deepen light-mode `--warn` to `#92400e` (`6.02:1` on `#f4f4f1`) and adjust dark-mode `--accent` to `#5662cf` with `#ffffff` `accent-fg` (`>= 4.9:1`).
Verify: Automated WCAG 2.2 contrast check across both light and dark token blocks confirming `>= 4.8:1` on all text pairs.
```

```text
ID: A11Y-03       Severity: medium
Where: templates/generative-ui/stack_matrix_artifact.html:124-135, launchpad_artifact.html:116-128
What: `axe-core` flags `landmark-one-main` and `heading-order` on `stack_matrix_artifact.html` and `region` and `heading-order` on `launchpad_artifact.html`.
Evidence: `axe.run()` reported `landmark-one-main` (`stack_matrix` uses `<form>` with no `<main>`), `region` (`launchpad` `<div class="tabs" role="tablist">` is outside `<main>`), and `heading-order` (`<h2>Phase...</h2>` before `<h1>` and `<h1>` skipping directly to `<h3>` card/block titles).
Impact: Screen reader users navigating by landmarks or heading hierarchy (`H` / `1`-`3` keys in VoiceOver and NVDA) miss the main content region in Stack Matrix, miss the tab bar in Launchpad, and hear skipped heading levels across all artifacts.
Fix: Wrap primary content (including `#tablist` in Launchpad and `#matrix` in Stack Matrix) inside `<main>`, convert the uppercase phase eyebrow above `<h1>` to `<p class="eyebrow">` so `<h1>` opens the heading tree, and add semantic `<h2>` section headings (visually shown or `.sr-only`) above `<h3>` cards/blocks.
Verify: Run `axe.run()` across all 4 templates and all tab/archetype states in Chromium and assert `violations.length === 0`.
```

```text
ID: A11Y-04       Severity: medium
Where: templates/generative-ui/brand_studio_artifact.html:516-523
What: The custom Grouping dropdown button (`#dd-btn`, `aria-haspopup="listbox"`) ignores `ArrowDown` and `ArrowUp` keyboard events when closed.
Evidence: Playwright keyboard walkthrough focused `#dd-btn` and pressed `ArrowDown`; `ddArrowDownOpensWhenClosed` measured `false` because `keydown` is bound only to `#dd-list`, not `#dd-btn`.
Impact: Keyboard-only users expecting WAI-ARIA Listbox Button behavior (`ArrowDown` / `ArrowUp` to open and move focus into options) cannot open the dropdown with arrow keys.
Fix: Attach a `keydown` listener on `#dd-btn` handling `ArrowDown` (opens and highlights current/first option) and `ArrowUp` (opens and highlights last option).
Verify: Playwright keyboard test pressing `ArrowDown`, `ArrowDown`, `Enter`, and `Escape` starting from `#dd-btn` and asserting selection updates and focus returns to `#dd-btn`.
```

```text
ID: A11Y-05       Severity: low
Where: templates/generative-ui/brand_studio_artifact.html:91,116, qa_diff_artifact.html:82,106, launchpad_artifact.html:57,66,95
What: All interactive controls pass the `24x24px` WCAG 2.2 AA (`2.5.8`) minimum (`targetsUnder24: []`), but several buttons and chips measure `30px`–`40px` tall instead of the `44px` preferred touch target noted in `OVERHAUL.md`.
Evidence: Bounding-box scan measured `launchpad` `.seg span` at `30px` height and `.btn` at `36px`, `qa_diff` `.chip span` at `32px`, and `brand_studio` `.btn`/`.input` at `40px` (`targetsUnder44` count: 7 in `brand_studio`, 14 in `qa_diff`, 4 in `launchpad`).
Impact: While WCAG 2.2 AA `24px` is satisfied, `30px`–`36px` touch targets on `375px` mobile screens require tighter tap accuracy.
Fix: Keep compact desktop controls `>= 36px` (`>= 24px` AA floor strictly enforced by `VC005`) while expanding primary action buttons to `min-height: 44px` and increasing touch hit-area padding on mobile (`@media (pointer: coarse)` `min-height: 44px`).
Verify: Measure bounding boxes in Playwright under both fine pointer (`>= 32px`, zero `< 24px`) and coarse pointer emulation (`>= 44px` on primary controls).
```

```text
ID: A11Y-06       Severity: low
Where: templates/generative-ui/brand_studio_artifact.html:249-310
What: `Brand Studio` previews archetypes only in their single native polarity (3 dark or light fixed themes) with no way to inspect light/dark surface contrast or system-scheme behavior, whereas `stack_matrix`, `qa_diff`, and `launchpad` honor `prefers-color-scheme`.
Evidence: `brand_studio_artifact.html` sets inline `--bg-primary` on `:root` via JS without displaying polarity badges, computed contrast scores, or companion light/dark guidance.
Impact: Designers picking an archetype in Phase 2 cannot see its verified WCAG contrast ratio in the UI or distinguish dark-first vs light-first archetypes at a glance.
Fix: Add two additional WCAG-verified archetypes (`Swiss Grid` light and `Nocturne Terminal` dark, totaling 3 dark + 3 light balanced archetypes) and display each archetype's polarity badge (`Dark` / `Light`) and live computed AA contrast badge inside `Brand Studio`.
Verify: Playwright test selecting all 6 archetypes in `Brand Studio`, verifying polarity indicator, contrast readout, and zero `axe` violations in every state.
```
