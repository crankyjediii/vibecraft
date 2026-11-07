# ADR 0004: Deterministic Inlined CSS and Sanitized SVG Over Tailwind Play CDN and Google Fonts

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Phase 1 auditing (`SEC-02`, `SEC-03`, `SEC-04`, `SEC-09`, `COR-02`, `DOC-04`) proved that all four v0.1 HTML templates loaded `https://cdn.tailwindcss.com` (a ~400 KB runtime JavaScript JIT without Subresource Integrity that logs production warnings and collapses multi-column grids when offline or blocked by strict sandbox CSP) and `https://fonts.googleapis.com` (external IP leak and render-blocking stylesheet), while `launchpad_artifact.html` assigned `box.innerHTML = LAUNCH.logo` unsanitized and loaded unverified Mermaid JS without SRI.

## Options Considered

1. **Keep Tailwind Play CDN with SRI:** Impossible; `cdn.tailwindcss.com` serves dynamic redirects/scripts unsuitable for static SRI and violates `script-src` sandboxes that block remote eval/JIT.
2. **Add PostCSS + Tailwind CLI as `devDependencies`:** Adds third-party build packages when the templates use fewer than 55 utility classes.
3. **Compile deterministic token-backed CSS via zero-dependency `scripts/build-templates.mjs`, use system/local font stacks, pin Mermaid `11.4.1` with `sha384` SRI + `<pre>` fallback, and sanitize `LAUNCH.logo` via `DOMParser` allowlist:** Zero npm dependencies, 100% offline layout fidelity, zero console warnings, and strict XSS protection.

## Decision

Adopt Option 3. `scripts/build-templates.mjs` generates and drift-checks (`--check`) all four `templates/generative-ui/*.html` artifacts with inlined logical CSS (`padding-inline`, `margin-inline`, `dir="auto"`), system-first typographic stacks, SRI-pinned Mermaid `11.4.1` with offline `<pre>` diagram source fallback, and strict geometric SVG sanitization.

## Consequences

- **Positive:** All four artifacts render identically at `375px`, `768px`, and `1440px` with network completely disabled (`offline`), emit zero console warnings, and block `<script>`/`onerror`/`foreignObject` XSS payloads in `LAUNCH.logo`.
- **Negative / Trade-off:** Template utility classes are restricted to the curated token-backed stylesheet in `scripts/build-templates.mjs` rather than arbitrary runtime Tailwind JIT classes.
