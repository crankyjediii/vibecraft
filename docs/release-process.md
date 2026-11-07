# Release Process

VibeCraft releases are reproducible, zero-dependency, and automated via SHA-pinned GitHub Actions (`.github/workflows/release.yml`).

## 1. Pre-Release Verification Gate

Run the complete local verification suite on a clean working tree before bumping versions:

```bash
# 1. Rebuild deterministic templates, rule docs, and Desktop Skill ZIP
npm run build
npm run check:drift

# 2. Run unit, lock-block, installer E2E, and markdown link suites
npm test

# 3. Run 19-rule Audit Engine v2 and SARIF 2.1.0 check
npm run audit
npm run --silent audit:sarif > /dev/null

# 4. Run ShellCheck and Claude Code plugin validation
shellcheck install.sh
claude plugin validate --strict --profile directory .

# 5. Run headless Chrome + axe-core WCAG 2.2 AA + XSS + fuzz verification
npm run test:browser

# 6. Run 17 structural invariants + 14 calibrated behavioral evaluations
npm run evals

# 7. Inspect npm package tarball allowlist
npm pack --dry-run
```

## 2. Version Bump Locations

Keep version strings synchronized across these four files:

1. `package.json` (`"version"`)
2. `.claude-plugin/plugin.json` (`"version"`)
3. `.claude-plugin/marketplace.json` (`plugins[0].version`)
4. `install.sh` (`VIBECRAFT_VERSION` default fallback) and `install.ps1` (`vX.Y.Z.zip` fallback URL)

After updating versions, run `npm run build` so `dist/vibecraft-desktop/` and `SHA256SUMS.txt` absorb the updated metadata, and add the matching `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md`.

## 3. Tagging & Automated Publication

Push the release commit to `main` and push an annotated SemVer tag:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --follow-tags
```

`.github/workflows/release.yml` automatically:

1. Re-runs `npm test`, `npm run audit`, `npm run check:drift`, `npm run evals`, and `shellcheck install.sh`.
2. Stages `vibecraft-skill.zip`, `vibecraft-desktop-bundle.zip`, and `SHA256SUMS.txt`.
3. Extracts the matching version section from `CHANGELOG.md`.
4. Publishes the GitHub Release via SHA-pinned `softprops/action-gh-release`.

## 4. Verifying Published Release Checksums

Users and maintainers can verify downloaded release archives with `shasum`:

```bash
shasum -a 256 -c SHA256SUMS.txt
```

## 5. Rollback Procedure

If a regression is discovered after tagging:

1. Mark the affected GitHub Release as pre-release or yank/delete the broken release asset only if it poses a security risk (prefer immutable patch forward `vX.Y.(Z+1)`).
2. Revert the offending commit on `main`, add a regression fixture under `tests/` or `evals/scenarios.json`, and cut a patch tag `vX.Y.(Z+1)`.
