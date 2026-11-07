# Phase 3 Verification: Studio Quality Delta, Audit Engine v2 & Offline Artifacts

## 1. Before / After Quantitative Delta

| Metric | Baseline (`v0.1.0` / `13e02b1`) | Overhaul (`v1.0.0` Phase 3) | Verification Command |
| :--- | :--- | :--- | :--- |
| Idle context budget (`CLAUDE.md` vs plugin skills) | `~18,300 to 27,900` tokens (`system_prompt.md` + flat `skills/*.md`) | `~734` tokens (`claude plugin details`; `~348` tokens in frontmatter descriptions) | `claude plugin details vibecraft@vibecraft` |
| Static audit rules enforced | `8` regex checks in `tests/audit_rules_test.js` only | `19` rules (`VC000`..`VC018`) in standalone CLI (`scripts/audit/cli.js`) with `--json`, `--sarif`, `--fix`, `--min-severity` | `node tests/audit_rules_test.js` (`14/14` suites, `38` pass/fail fixtures) |
| Brand Studio WCAG 2.2 AA verified presets | `3/4` (`apple` failed chip contrast at `3.70:1`) | `6/6` (`linear`, `apple`, `editorial`, `brutalist`, `swiss`, `nocturne`; contrast floor `>= 5.11:1`) | `node scripts/verify-templates-browser.mjs` |
| Research Scout domain archetypes | `4` web-centric defaults | `6` archetypes (`web-saas`, `local-desktop`, `cli-tool`, `edge-api`, `mobile-offline`, `static-content`) + `28` documented gotchas | `skills/research-scout/SKILL.md` + `skills/vibecraft/references/gotcha-library.md` |
| Unpinned external network requests per HTML artifact | `3 to 4` (`cdn.tailwindcss.com` JIT + `fonts.googleapis.com` + unpinned `mermaid@11`) | `0` required (`1` optional SRI-pinned `mermaid@11.4.1` with offline `<pre>` source fallback) | `node scripts/verify-templates-browser.mjs` (offline route abort) |
| `axe-core@4.10.2` WCAG 2.2 AA violations across all 4 templates | `12+` (`color-contrast`, `landmark-one-main`, `region`, `heading-order`) | `0` across dark + light schemes, `375px`/`768px`/`1440px` viewports, and all `6` Brand Studio presets | `AXE_MIN_JS=... node scripts/verify-templates-browser.mjs` (`17/17` suites) |
| `LAUNCH.logo` SVG XSS protection | Raw `innerHTML` injection (`SEC-02` High) | `DOMParser` + allowlisted geometric SVG element/attribute cloning (`window.__xss === undefined`) | `node scripts/verify-templates-browser.mjs` (`launchpad-svg-xss-and-offline-mermaid`) |
| `qa_diff_artifact.html` unverified compiler stamp | Reported `100% pass` when `checker: "not run"` (`COR-01`, `PRM-09`) | Emits `! VibeCraft QA · [Syntax: Not Run]` and separates `openSlop + openGotchas` from token adherence | `node scripts/verify-templates-browser.mjs` (`qa-diff-honest-stamp`) |
| `VIBECRAFT PICK` / `LOCK` contract parser | Unversioned free-text prose instructions | Deterministic `v1` + `v2` serializer/parser (`scripts/lib/lock-blocks.js`) with 1-based line diagnostics | `node tests/lock_blocks.test.js` (`4/4` suites) |
| Behavioral & structural evaluation suite | None (`0` scenarios) | `17` repo invariants + `14` golden/adversarial scenarios + `14` negative-control calibrations | `node evals/runner.mjs --write` (`17/17`, `14/14`, `14/14`) |

## 2. Regenerated Artifact Manifest

| Template | Size (Bytes) | SHA-256 | Audit Engine v2 | `axe-core` Violations |
| :--- | ---: | :--- | :--- | ---: |
| `templates/generative-ui/stack_matrix_artifact.html` | `21,018` | `c4f443773f8d21d097ca62bf8975c7af49682b65024d1af9b57bdea76948d3d2` | `0` findings | `0` (`35` rule passes) |
| `templates/generative-ui/brand_studio_artifact.html` | `36,262` | `f729c17c751ab986ad506df2d018b30eb382b58711eb727bf916d8fd8e699203` | `0` findings | `0` (`39` rule passes) |
| `templates/generative-ui/qa_diff_artifact.html` | `25,459` | `827df8c397576d22a80dbd070680b16134e4327af1e7e5a22573c571ea3e06ea` | `0` findings | `0` (`34` rule passes) |
| `templates/generative-ui/launchpad_artifact.html` | `29,498` | `8a75cad6431fae05126adbecabf9138439b2cd58684e4595bef3b9d045aaf1a3` | `0` findings | `0` (`40` rule passes) |

## 3. Architecture Decision Records Added

- `docs/decisions/0001-gated-pipeline.md`: Explicit user-gated phase handoffs over autonomous end-to-end code generation.
- `docs/decisions/0002-mcp-packages-and-pinning.md`: Exact semver pinning and environment-variable secret indirection across `.mcp.json` and `claude_desktop_config.json`.
- `docs/decisions/0003-craft12-flat-accents.md`: Flat `:root` semantic tokens and calibrated WCAG 2.2 AA contrast over decorative gradients and saturation glows.
- `docs/decisions/0004-inlined-css-over-tailwind-cdn.md`: Self-contained logical CSS and SRI-pinned optional Mermaid fallback over runtime CDN JIT scripts.

## 4. Verification Transcript Summary

```text
$ node scripts/build-templates.mjs --check
build-templates --check passed (4 artifacts verified).

$ node scripts/build-dist.mjs --check
build-dist --check passed (19 generated artifacts verified).

$ node scripts/audit/generate-docs.mjs --check
generate-docs --check passed (docs/rules.md is in sync with 19 rules).

$ node tests/lock_blocks.test.js
pass 4 / fail 0

$ node tests/audit_rules_test.js
14/14 passed

$ AXE_MIN_JS=... node scripts/verify-templates-browser.mjs
✓ Browser verification passed (17 suites, axe-core=active).

$ node evals/runner.mjs --write
VibeCraft Eval Suite v1.0.0
  Structural invariants : 17/17 passed
  Reference scenarios   : 14/14 passed
  Negative calibration  : 14/14 defective responses rejected
  Live LLM API trials   : not-requested (ANTHROPIC_API_KEY not set in environment; deterministic structural + calibrated scenario graders executed)
```
