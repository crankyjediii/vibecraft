# Contributing to VibeCraft

Thank you for contributing to VibeCraft. Every change must keep the repository zero-dependency at runtime, verifiable offline, and compliant with Audit Engine v2.

## Prerequisites

- **Node.js:** `>= 18.18.0` (`node -v`)
- **ShellCheck (optional locally, required in CI):** `shellcheck install.sh`
- **Google Chrome or Chromium (optional locally, required in CI):** for `npm run test:browser`

VibeCraft uses **zero npm runtime or dev dependencies** in `package.json`. Do not add packages to `dependencies` or `devDependencies` without opening an Architecture Decision Record (`docs/decisions/`) first.

## Local Development Workflow

```bash
# 1. Run unit, lock-block, installer E2E, and markdown link tests
npm test

# 2. Run Audit Engine v2 (VC000..VC018) across shipped files
npm run audit

# 3. Verify generated templates, rule docs, and Desktop bundle have zero drift
npm run check:drift

# 4. Run structural and calibrated scenario evaluations
npm run evals
```

## Source-of-Truth Build Generators

Three directories/files are generated deterministically from source scripts. Edit the generator first, then run `npm run build`:

1. **Generative UI HTML templates (`templates/generative-ui/*.html`):**
   - Source: `scripts/build-templates.mjs`
   - Rebuild: `node scripts/build-templates.mjs`
2. **Audit rule reference (`docs/rules.md`):**
   - Source: `scripts/audit/rules.js` + `scripts/audit/generate-docs.mjs`
   - Rebuild: `node scripts/audit/generate-docs.mjs`
3. **Claude Desktop bundle (`dist/vibecraft-desktop/` + `system_prompt.md`):**
   - Source: `skills/**` + `templates/generative-ui/*.html` + `scripts/build-dist.mjs`
   - Rebuild: `node scripts/build-dist.mjs`

CI runs `npm run check:drift` and fails if any generated artifact drifts from its source.

## Adding or Modifying an Audit Rule

1. Define rule metadata (`id`, `slug`, `severity`, `fixable`, `kinds`, `summary`, `remediation`) in `scripts/audit/rules.js`.
2. Wire the check in `scripts/audit/engine.js` (and `scripts/audit/fixer.js` only if the repair is 100% mechanical and behavior-preserving).
3. Add both `<ID>.pass.<ext>` and `<ID>.fail.<ext>` fixtures under `tests/fixtures/rules/`.
4. Run `node scripts/audit/generate-docs.mjs` and `npm test`.

## Writing & Skill Style Standards

- Write in direct active voice with concrete numeric thresholds.
- Never use em dashes (`U+2014`) in skills, commands, or documentation; use colons, commas, parentheses, or periods.
- Never use hardcoded hex, `rgb()`, `hsl()`, `oklch()`, or Tailwind color utilities outside `:root` token blocks or `@tokens:start..@tokens:end`.
- See `docs/skill-authoring.md` for frontmatter, token-budget, and worked-example rules.
