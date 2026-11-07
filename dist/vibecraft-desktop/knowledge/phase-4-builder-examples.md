# Full-Stack Builder Worked Examples

## Example 1: Token-Pure Accessible Component + Sanitized Geometric Logo

### Context
Building `HookDrain`'s event filter bar under locked `Nocturne Terminal` tokens (`src/styles/tokens.css`). Notice explicit `:focus-visible`, named `transition` properties (zero `transition: all`), logical CSS properties (`padding-inline`), `>= 36px` hit targets, and `0` hardcoded colors.

### Generated `src/ui/filter-bar.css`
```css
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding-block: 12px;
  padding-inline: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.filter-chip {
  min-height: 36px;
  padding-inline: 12px;
  background: var(--surface-2);
  color: var(--ink);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}

.filter-chip:hover:not(:disabled) {
  border-color: var(--border-strong);
}

.filter-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.filter-chip[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}

.filter-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (prefers-reduced-motion: reduce) {
  .filter-chip {
    transition: none;
  }
}
```

### Generated `LAUNCH.logo` (3 Geometric Primitives, Sanitizer-Safe)
```html
<svg viewBox="0 0 64 64" role="img" aria-label="HookDrain emblem" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="6" width="52" height="52" rx="12" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/>
  <polygon points="18,20 46,20 35,34 35,46 29,42 29,34" fill="var(--accent)"/>
  <circle cx="44" cy="44" r="4" fill="var(--ink)"/>
</svg>
```

---

## Example 2: Honest Contract Conflict Escalation (Zero Type Laundering)

### Scenario
Phase 3 locked a synchronous signature check `verifyWebhook(raw: string, sig: string): boolean`, but Cloudflare Workers Web Crypto (`crypto.subtle.verify`) returns a `Promise<boolean>` and Node's synchronous `crypto.createHmac` is unavailable without `nodejs_compat`.

### Builder Action
Instead of casting `crypto.subtle.verify(...) as unknown as boolean` (which violates `VC011` and breaks runtime behavior), Builder records the signature change (`Promise<boolean>`), runs QA Auditor on the compiled modules to produce `vibecraft/04-qa-diff.html`, withholds `04-launchpad.html`, and escalates in 2 lines:

```text
╭─ VIBECRAFT · HookDrain
│  ✓ Scout   ✓ Artisan   ✓ Architect   ● Builder+QA
╰─ Phase 4/4 · Contract mismatch · Reply 1 to update async signature
```

Web Crypto `crypto.subtle.verify` in Workers is asynchronous, so `verifyWebhook` must return `Promise<boolean>` instead of Phase 3's synchronous `boolean` (`vibecraft/04-qa-diff.html` details the 1-line contract diff).
`! VibeCraft QA · [Syntax: 1 Error] · [Tokens: 100% Validated] · [Slop: 1 Remaining]`

```text
Escalate: [1] Approve async verifyWebhook(): Promise<boolean>*  [2] Enable nodejs_compat sync HMAC
```
