<!-- Generated from scripts/audit/rules.js by scripts/audit/generate-docs.mjs; do not edit directly. -->

# VibeCraft Audit Engine v2 Rule Reference

Run the zero-dependency analyzer locally or in CI:

```bash
node scripts/audit/cli.js [paths...] [--json] [--sarif] [--fix] [--min-severity warning|error]
```

- **Exit codes:** `0` clean, `1` findings detected, `2` invalid CLI usage.
- **Inline suppression:** `// vibecraft-ignore VC001: <concrete technical reason>` (bare suppressions without `: <reason>` fail `VC000`).

## Rule Summary Matrix

| ID | Slug | Default Severity | `--fix` | File Kinds |
|---|---|---|---|---|
| `VC000` | `unjustified-ignore` | `error` | No | `css`, `html`, `js`, `ts`, `sh`, `json` |
| `VC001` | `hardcoded-color` | `error` | No | `css`, `html`, `js`, `ts` |
| `VC002` | `token-contrast` | `error` | No | `css`, `html`, `js`, `ts` |
| `VC003` | `missing-focus-visible` | `warning` | No | `css`, `html` |
| `VC004` | `outline-none-without-replacement` | `error` | No | `css`, `html`, `js`, `ts` |
| `VC005` | `touch-target-size` | `warning` | No | `css`, `html` |
| `VC006` | `transition-all` | `error` | Yes | `css`, `html`, `js`, `ts` |
| `VC007` | `gradient` | `error` | No | `css`, `html`, `js`, `ts` |
| `VC008` | `glow-shadow` | `warning` | No | `css`, `html`, `js`, `ts` |
| `VC009` | `z-index-arms-race` | `error` | No | `css`, `html`, `js`, `ts` |
| `VC010` | `unlabeled-control` | `error` | No | `html`, `js`, `ts` |
| `VC011` | `type-laundering` | `error` | No | `ts` |
| `VC012` | `missing-return-type` | `error` | No | `ts` |
| `VC013` | `swallowed-error` | `error` | No | `js`, `ts` |
| `VC014` | `console-leftover` | `warning` | Yes | `html`, `js`, `ts` |
| `VC015` | `dead-export` | `warning` | No | `js`, `ts` |
| `VC016` | `placeholder` | `error` | No | `css`, `html`, `js`, `ts`, `sh` |
| `VC017` | `comment-slop` | `warning` | Yes | `js`, `ts` |
| `VC018` | `hardcoded-secret` | `error` | No | `css`, `html`, `js`, `ts`, `sh`, `json` |

## Detailed Rule Specifications

### `VC000` · `unjustified-ignore`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`, `sh`, `json`
- **What it checks:** Inline `vibecraft-ignore` directive must name at least one rule ID/slug and `: <reason>` (>= 4 chars).
- **How to fix:** Write `// vibecraft-ignore VC001: canvas heatmap lookup table` with a concrete technical reason.

### `VC001` · `hardcoded-color`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Forbids raw hex, rgb(), hsl(), oklch(), named CSS colors, and default Tailwind palette utilities outside `:root` custom properties or `@tokens:start..@tokens:end`.
- **How to fix:** Define the color once in `:root` (`tokens.css`) and reference `var(--token)` in components.

### `VC002` · `token-contrast`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Computes WCAG 2.2 relative luminance ratios across defined token pairs (`>= 4.5:1` text, `>= 3.0:1` UI indicators).
- **How to fix:** Darken light-mode foregrounds or lighten dark-mode foregrounds until text pairs exceed 4.5:1.

### `VC003` · `missing-focus-visible`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`
- **What it checks:** Flags interactive CSS selectors styling `:hover` or `:focus` without a corresponding `:focus-visible` rule.
- **How to fix:** Add a `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` rule for the selector.

### `VC004` · `outline-none-without-replacement`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Forbids `outline: none` / `outline: 0` or `focus:outline-none` unless a replacement focus ring (`box-shadow`, `border-color`, or `focus-visible:ring`) appears in the same scope.
- **How to fix:** Keep the native outline or pair `outline: none` with `box-shadow: 0 0 0 2px var(--accent)` on `:focus-visible`.

### `VC005` · `touch-target-size`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`
- **What it checks:** Flags interactive control selectors (`button`, `.btn`, `[role="tab"]`, `input`, `select`) with explicit `width` or `height` `< 24px` (WCAG 2.2 SC 2.5.8).
- **How to fix:** Set `min-height: 36px` (or at least `24px`) and `min-width: 24px` on interactive controls.

### `VC006` · `transition-all`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** Yes
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Forbids `transition: all`, `transition-property: all`, and Tailwind `transition-all` (Craft R3).
- **How to fix:** Animate explicit properties only (`background-color`, `border-color`, `color`, `opacity`, `transform`).

### `VC007` · `gradient`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Forbids `linear-gradient()`, `radial-gradient()`, `conic-gradient()`, and `bg-gradient-to-*` unless explicitly waived (Craft R1).
- **How to fix:** Use flat deliberate surface and accent tokens (`var(--surface)`, `var(--accent)`), or add an explicit user waiver.

### `VC008` · `glow-shadow`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Flags colored neon `box-shadow` / `drop-shadow` blurs and colored Tailwind shadow utilities (Craft R2).
- **How to fix:** Use crisp 1px borders (`var(--border)`) and neutral elevation shadows (`var(--shadow)`).

### `VC009` · `z-index-arms-race`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`
- **What it checks:** Forbids `z-index >= 1000` and arbitrary `z-[9999]` stacking hacks.
- **How to fix:** Use `isolation: isolate` and a bounded 2-digit stacking scale (`10`, `20`, `30`, `40`, `50`).

### `VC010` · `unlabeled-control`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `html`, `js`, `ts`
- **What it checks:** Flags `<button>`, `<input>`, `<select>`, and `<textarea>` elements lacking visible text, `<label for>`, `aria-label`, or `aria-labelledby`.
- **How to fix:** Add visible text inside `<button>`, associate a `<label for="...">`, or set `aria-label`.

### `VC011` · `type-laundering`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `ts`
- **What it checks:** Forbids `: any`, `as any`, `as unknown as`, and `<any>` in TypeScript modules.
- **How to fix:** Use concrete interfaces, generics, or `unknown` narrowed via type guards.

### `VC012` · `missing-return-type`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `ts`
- **What it checks:** Requires explicit return type annotations on exported TypeScript functions and arrow functions (multi-line signature aware).
- **How to fix:** Declare the explicit return type after the closing parameter parenthesis: `export function parse(raw: string): Result<Doc> {`.

### `VC013` · `swallowed-error`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `js`, `ts`
- **What it checks:** Forbids empty `catch {}` blocks and catch blocks that silently discard caught exceptions.
- **How to fix:** Return a typed `{ ok: false, error }` union, rethrow with context, or log to `stderr` in CLI entrypoints.

### `VC014` · `console-leftover`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** Yes
- **Applies to:** `html`, `js`, `ts`
- **What it checks:** Flags `console.log()` and `console.debug()` calls left in application or template scripts.
- **How to fix:** Remove debug logging or route structured CLI output through `process.stdout.write` / `process.stderr.write`.

### `VC015` · `dead-export`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `js`, `ts`
- **What it checks:** Flags named exports in non-entrypoint modules that are never imported or referenced across the scanned project.
- **How to fix:** Remove the unused `export` keyword or delete the dead symbol.

### `VC016` · `placeholder`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`, `sh`
- **What it checks:** Forbids `TODO`, `FIXME`, `XXX`, `HACK`, `lorem ipsum`, `John Doe`, and unimplemented stub markers.
- **How to fix:** Implement the complete domain behavior and replace placeholder copy before shipping.

### `VC017` · `comment-slop`

- **Severity:** `warning`
- **Auto-fixable (`--fix`):** Yes
- **Applies to:** `js`, `ts`
- **What it checks:** Flags narrating comments that restate obvious operations (`// increment count`, `// return the result`).
- **How to fix:** Delete self-evident narration comments; comment only non-obvious invariants or `[Gotcha]` mitigations.

### `VC018` · `hardcoded-secret`

- **Severity:** `error`
- **Auto-fixable (`--fix`):** No
- **Applies to:** `css`, `html`, `js`, `ts`, `sh`, `json`
- **What it checks:** Detects hardcoded Anthropic, OpenAI, AWS, GitHub, Stripe, Slack, PEM private keys, and literal secret assignments.
- **How to fix:** Read secrets from `process.env.SECRET_NAME` or `${SECRET_NAME}` config placeholders and rotate exposed keys immediately.
