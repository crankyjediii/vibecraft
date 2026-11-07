# QA Auditor Worked Examples

## Example 1: Clean 2-Pass Phase 4 Audit & Launchpad Publication

### Pass 1 Measurements (`tsc --noEmit` + `node scripts/audit/cli.js src --json`)
- `tsc --noEmit`: `0` errors.
- `scripts/audit/cli.js`: `3` findings (`VC001` `#10b981` badge in `src/ui/status-pill.tsx`, `VC006` `transition: all 0.2s` in `src/ui/drawer.css`, `VC017` `// set state` in `src/ui/dashboard.tsx`).
- Repair Pass 1 replaces `#10b981` with `var(--ok)`, scopes `transition` to `transform 180ms ease, opacity 180ms ease`, removes the narrating comment, and re-runs both tools -> `0` syntax errors, `0` audit findings (`48/48` styled refs validated = `100%`).

### Emitted Chat Turn (3-line HUD + 2 prose lines + Stamp Footer)
```text
╭─ VIBECRAFT · HookDrain
│  ✓ Scout   ✓ Artisan   ✓ Architect   ✓ Builder+QA
╰─ Phase 4/4 · Build & QA complete · ready to run
```

Wrote 8 modules under `src/`, recorded 3 Pass-1 repairs in `vibecraft/04-qa-diff.html`, and published the operator bundle in `vibecraft/04-launchpad.html`.
Run `npm test && npx wrangler dev` to start the local edge ingest worker.

```text
✓ VibeCraft QA · [Syntax: 0 Errors] · [Tokens: 100% Validated] · [Slop: Scrubbed]
```

---

## Example 2: Messy Standalone Repo Audit (`/vibecraft:audit` on Legacy App)

### User Input
`/vibecraft:audit ./apps/checkout-web`

### Measured State After Safe Auto-Repairs
- Safe repairs applied: `6` (`4` `console.log` leftovers `VC014`, `2` `transition-all` `VC006`).
- Remaining behavior-sensitive / structural findings left open:
  - `tsc --noEmit`: `2` errors in `src/api/charge.ts` (`Property 'idempotencyKey' is missing`).
  - `VC001`: `9` hardcoded hex values across `56` styled lines (`84%` validated; repo has no `--danger` token yet).
  - `VC013`: `1` empty `catch {}` around `localStorage.setItem` in `src/cart/persist.ts` (`openSlop: 1`).

### Emitted Chat Turn (Honest Failing Stamp + Actionable Escalation)
```text
╭─ VIBECRAFT · checkout-web
│  ✓ Scout   ✓ Artisan   ✓ Architect   ● Builder+QA
╰─ Phase 4/4 · Audit complete (3 blockers) · Choose 1 or 2
```

Scrubbed 6 safe `VC006`/`VC014` issues and wrote the full report to `vibecraft/04-qa-diff.html`; 2 `tsc` errors in `src/api/charge.ts`, 9 untokenized colors, and 1 swallowed `catch {}` (`VC013`) require behavior/token approval.

```text
! VibeCraft QA · [Syntax: 2 Errors] · [Tokens: 84% Validated] · [Slop: 1 Remaining]
```

```text
Next step: [1] Fix charge.ts types, add --danger token & typed catch*  [2] Leave code as-is (keep report only)
```
