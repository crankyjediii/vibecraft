## Summary

<!-- Describe what changed and why in 1-3 direct sentences. -->

## Verification Checklist

- [ ] `npm test` passes (`audit_rules_test`, `lock_blocks.test`, `installer_e2e.test`, `docs_links.test`)
- [ ] `npm run audit` exits `0` (`0` findings across shipped files)
- [ ] `npm run check:drift` exits `0` (templates, `docs/rules.md`, and `dist/` in sync)
- [ ] `npm run evals` exits `0` (`17/17` invariants, `14/14` scenarios, `14/14` negative controls)
- [ ] Zero runtime or dev dependencies added to `package.json` (or linked ADR included)
- [ ] Zero hardcoded colors outside `:root` / `@tokens` and zero em dashes (`U+2014`) in prose
