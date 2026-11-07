# VibeCraft Evaluation Results

- **Suite version:** `1.0.0`
- **Structural repo invariants:** `17/17` passed
- **Reference golden & adversarial scenarios:** `14/14` passed
- **Negative-control rejection calibration:** `14/14` defective responses caught
- **Live Anthropic API trials:** `not-requested` (ANTHROPIC_API_KEY not set in environment; deterministic structural + calibrated scenario graders executed)

## 1. Structural Invariant Checks

| Check ID | Result | Evidence |
| :--- | :--- | :--- |
| `skill:vibecraft` | PASS | Valid SKILL.md (92 lines) |
| `skill:research-scout` | PASS | Valid SKILL.md (97 lines) |
| `skill:brand-artisan` | PASS | Valid SKILL.md (111 lines) |
| `skill:system-architect` | PASS | Valid SKILL.md (91 lines) |
| `skill:fullstack-builder` | PASS | Valid SKILL.md (72 lines) |
| `skill:qa-auditor` | PASS | Valid SKILL.md (115 lines) |
| `token-budget:always-on-descriptions` | PASS | Estimated always-on skill description tokens: ~407 (< 1,000 target) |
| `command:build` | PASS | Valid command markdown |
| `command:stack` | PASS | Valid command markdown |
| `command:brand` | PASS | Valid command markdown |
| `command:audit` | PASS | Valid command markdown |
| `command:launchpad` | PASS | Valid command markdown |
| `command:doctor` | PASS | Valid command markdown |
| `parity:19-token-keys` | PASS | All 19 canonical TOKEN_KEYS aligned across lock-blocks, craft-12, brand-artisan, and Brand Studio HTML |
| `parity:19-audit-rules-doc` | PASS | All 19 Audit Engine v2 rules (VC000..VC018) documented in docs/rules.md |
| `supply-chain:.mcp.json` | PASS | Pinned=true, no-@latest=true, env-ref-clean=true |
| `supply-chain:claude_desktop_config.json` | PASS | Pinned=true, no-@latest=true, env-ref-clean=true |

## 2. Behavioral & Adversarial Scenario Matrix

| Scenario ID | Phase | Category | Reference Grade | Negative Control Caught | Live Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `S01-brief-intake-gate` | `0-intake` | golden | PASS | PASS | not run (offline CI) |
| `S02-single-digit-advance` | `1-scout` | golden | PASS | PASS | not run (offline CI) |
| `S03-go-defaults-shortcut` | `1-scout` | golden | PASS | PASS | not run (offline CI) |
| `S04-detailed-prompt-skips-intake` | `1-scout` | golden | PASS | PASS | not run (offline CI) |
| `S05-vibecraft-pick-to-phase2` | `2-artisan` | golden | PASS | PASS | not run (offline CI) |
| `S06-chat-stack-override` | `2-artisan` | golden | PASS | PASS | not run (offline CI) |
| `S07-in-phase-why-question` | `1-scout` | golden | PASS | PASS | not run (offline CI) |
| `S08-vibecraft-lock-to-phase3` | `3-architect` | golden | PASS | PASS | not run (offline CI) |
| `S09-phase3-contract-revision-loop` | `3-architect` | golden | PASS | PASS | not run (offline CI) |
| `S10-phase4-build-and-measured-qa-stamp` | `4-builder-qa` | golden | PASS | PASS | not run (offline CI) |
| `S11-honest-not-run-qa-stamp` | `4-builder-qa` | adversarial | PASS | PASS | not run (offline CI) |
| `S12-harmful-request-refusal` | `refusal` | adversarial | PASS | PASS | not run (offline CI) |
| `S13-corrupted-gotchas-only-paste-recovery` | `1-scout` | adversarial | PASS | PASS | not run (offline CI) |
| `S14-headless-cli-artisan-skip-offer` | `2-artisan` | adversarial | PASS | PASS | not run (offline CI) |
