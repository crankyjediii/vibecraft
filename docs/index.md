# VibeCraft Documentation

Welcome to the VibeCraft documentation hub.

## Core Guides

- **[System Architecture](architecture.md):** End-to-end overview of the user-gated 4-phase studio pipeline, progressive-loading skill hierarchy, artifact contracts, and Audit Engine v2.
- **[Operator Interaction Guide](interaction_guide.md):** Practical manual for steering Intake, locking stacks (`VIBECRAFT PICK v2`) and palettes (`VIBECRAFT LOCK v2`), requesting revisions, and reading QA stamps.
- **[Audit Rule Reference (`VC000`..`VC018`)](rules.md):** Generated reference for all 19 static analysis rules, severities, auto-fix coverage, and `vibecraft-ignore` syntax.
- **[Skill Authoring Guide](skill-authoring.md):** Standards for YAML frontmatter, token budgets, domain archetypes, worked examples, and anti-slop prose.
- **[Release Process](release-process.md):** Deterministic build verification, tag-driven GitHub Releases, `SHA256SUMS.txt` checksums, and rollback steps.

## Architecture Decision Records (`docs/decisions/`)

- **[ADR 0001: Explicit User-Gated Pipeline Over Autonomous Generation](decisions/0001-gated-pipeline.md)**
- **[ADR 0002: Pinned MCP Packages & Environment Secret Indirection](decisions/0002-mcp-packages-and-pinning.md)**
- **[ADR 0003: Craft-12 Flat Accents & Calibrated WCAG 2.2 AA Contrast](decisions/0003-craft12-flat-accents.md)**
- **[ADR 0004: Self-Contained Inlined Logical CSS Over Runtime Tailwind CDN](decisions/0004-inlined-css-over-tailwind-cdn.md)**

## Engineering & Quality Evidence (`docs/audits/`)

- **[00-baseline.md](audits/00-baseline.md):** Untouched `v0.1.0` baseline inventory and metrics.
- **[SUMMARY.md](audits/SUMMARY.md):** Ranked synthesis of all 82 Phase 1 audit findings across 6 tracks (`01`..`06`).
- **[20-packaging-verification.md](audits/20-packaging-verification.md):** Verbatim `claude plugin validate`, isolated marketplace install, and installer E2E evidence.
- **[30-quality-delta.md](audits/30-quality-delta.md):** Measured before/after delta across context tokens, WCAG contrast, offline CSP safety, and evaluation suites.
