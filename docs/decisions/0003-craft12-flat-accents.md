# ADR 0003: Flat Deliberate Accents, Calibrated Contrast, and Explicit Craft Waivers

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

LLM-generated interfaces default to multi-stop purple/cyan gradients, colored neon `box-shadow` glows, `transition: all`, and unverified pastel badge colors that fail WCAG 2.2 AA `4.5:1` contrast (`A11Y-01`, `A11Y-02`). Earlier prompt drafts contradicted themselves by allowing a "brand gradient once" in prose while failing every `*-gradient(` in the static auditor (`PRM-06`).

## Options Considered

1. **Allow heuristic brand gradients everywhere:** Impossible to distinguish intentional brand surfaces from generic AI gradient slop in a deterministic static analyzer.
2. **Hard-ban gradients with zero user override:** Breaks legitimate brand requirements when a user explicitly asks for a gradient hero.
3. **Default to flat single-accent surfaces enforced by `VC007`/`VC008`, with an explicit Tier-2 user waiver (`vibecraft-ignore VC007: <reason>`):** Deterministic static enforcement by default, paired with auditable per-line waivers when requested by the user.

## Decision

Adopt Option 3, and split the Craft 12 into **Linter-Enforced Invariants** (`VC001`..`VC010`, `VC016`) and **Design-Review Heuristics** (`R4`, `R8`..`R12`). Pre-verify all six Brand Studio presets (`linear`, `apple`, `editorial`, `brutalist`, `swiss`, `nocturne`) to `>= 5.11:1` WCAG 2.2 relative luminance contrast across text and chip pairs.

## Consequences

- **Positive:** Zero contradiction between Brand Artisan and QA Auditor; every suppression requires an explicit human-readable justification (`VC000`).
- **Negative / Trade-off:** Default UI aesthetics favor crisp borders and flat typographic hierarchy over decorative gradients unless waived.
