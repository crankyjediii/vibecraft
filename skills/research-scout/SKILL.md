---
name: research-scout
description: Phase 1 Research Scout for VibeCraft. Compares 3 to 4 concrete software stacks with epistemic provenance tags (verified, inferred, gotcha), surfaces two non-obvious domain gotchas per stack, and populates stack_matrix_artifact.html. Activate on Phase 1 or /vibecraft:stack.
---

# Phase 1: Research Scout

## Purpose

Turn a scoped product brief into an interactive 3-to-4-option Stack Matrix (`stack_matrix_artifact.html`) backed by dated documentation evidence, honest epistemic tags, and two concrete failure modes per candidate stack.

## Inputs

- Product idea text (either Detailed on Turn 1, or Brief paired with locked `Q1 Angle` and `Q2 Ambition` answers).
- Existing repository `package.json`, `Cargo.toml`, or `pyproject.toml` when invoked standalone via `/vibecraft:stack`.
- Domain starter catalog in `references/gotcha-library.md` (load only the matching domain section).

## Preconditions

1. Safety and scope gate passed (zero harmful or credential-harvesting intent).
2. If the initial prompt was Brief (`<= 30` words, `<= 2` sentences, missing `>= 2` of platform/user/features/constraints), `Q1 Angle` and `Q2 Ambition` have already been answered before running stack web searches.

## Step Procedure

1. **Select 3 to 4 distinct stack candidates:** Include one pragmatic recommended default (`recommended: true`), one lighter zero-backend or static option when viable, and one scale/native alternative.
2. **Verify limits and APIs:** Use web search and fetch tools (when available) to check current SDK versions, browser/OS quotas, pricing tiers, and cold-start or binary size limits. Record the source domain and verification date in `why` or `notes`.
3. **Classify every metric honestly:** Assign lowercase enum strings `'verified' | 'inferred' | 'gotcha'` to `latencyTag`, `offlineTag`, and `costTag`. Never use `'verified'` unless checked against primary documentation or measured in the current session.
4. **Surface 2 non-obvious gotchas per stack:** Consult `references/gotcha-library.md` for baseline traps, then tailor two specific `{ issue, mitigation }` pairs to the user's data volume, offline needs, and platform. Populate `gotcha` + `mitigation` with the primary trap and `gotchas` with both pairs.
5. **Emit `stack_matrix_artifact.html`:** Read `templates/generative-ui/stack_matrix_artifact.html` (via `${CLAUDE_PLUGIN_ROOT}` or `${CLAUDE_SKILL_DIR}`) and replace only `const STACKS = [...]`. Write to `vibecraft/01-stack-matrix.html` in Claude Code or render as an HTML Artifact in Claude Desktop.
6. **Reply in chat:** Emit the 3-line HUD (`Phase 1/4 · Stack Matrix ready · Paste VIBECRAFT PICK or name a stack`) plus `1 to 3` prose lines (`<= 60` words) naming the recommended stack, its decisive advantage, and the paste-back instruction.

## Decision Rules (Numeric Thresholds)

- **Candidate count:** Emit `3` candidates for narrow single-platform tools; emit `4` candidates when cross-platform trade-offs (web PWA vs desktop Tauri vs mobile Expo) materially change architecture. Never emit `< 3` or `> 4`.
- **Recommendation tie-breaker:** Prefer the stack with `offlineCapable === true` when `Q1` requests local-first/offline, `latencyMs <= 100` for interactive input loops, and zero recurring monthly cost (`$0/mo` at MVP volume `< 1,000` MAU) when `Q2` is weekend MVP.
- **Latency bar sanity:** `latencyMs` must be an integer `>= 1` and `<= 10000` representing a named critical-path operation (for example P95 local query or cold-start TTFB), never `0` or `NaN`.

## Output Contract

```ts
type EpistemicTag = 'verified' | 'inferred' | 'gotcha';

interface GotchaPair {
  issue: string;      // Concrete failure mode with numeric limit or API name
  mitigation: string; // Architectural fix that Phase 3/4 must implement
}

interface StackCandidate {
  id: string;                 // Kebab-case slug, e.g. 'tauri-sqlite'
  name: string;               // Archetype label, e.g. 'Local-First Desktop'
  recommended: boolean;       // Exactly one candidate is true
  stack: string;              // Concrete frameworks + storage, e.g. 'Tauri v2 + React 19 + SQLite WASM'
  why: string;                // 1-2 sentences citing workload fit
  latencyMs: number;          // Integer >= 1
  latencyNote: string;        // Named operation, e.g. 'P95 FTS5 query on 10k rows'
  latencyTag: EpistemicTag;   // Lowercase only: 'verified' | 'inferred' | 'gotcha'
  offlineLabel: string;       // e.g. 'Full local R/W' or 'Online required'
  offlineTag: EpistemicTag;
  cost: string;               // e.g. '$0 local binary' or '$0 free tier (<50k req/mo)'
  costTag: EpistemicTag;
  gotcha: string;             // Primary gotcha summary (backward-compat mirror of gotchas[0].issue)
  mitigation: string;         // Primary mitigation (backward-compat mirror of gotchas[0].mitigation)
  gotchas: [GotchaPair, GotchaPair];
}
```

Pasted gate output (`VIBECRAFT PICK v2 · Phase 1 · Research Scout`) locks `Stack`, `ArchetypeId`, `Performance`, `Offline`, `Cost`, and both `[Gotcha]` items as mandatory Phase 3 and Phase 4 requirements.

## Worked Examples

See `references/examples.md` for two complete runs:
1. **Clean Detailed Prompt:** Local Markdown knowledge base with FTS5 search (`3` stacks compared, verified SQLite OPFS limits).
2. **Messy Contradictory Prompt:** `"real-time multiplayer video editor that runs 100% free on GitHub Pages with no server"` (resolves impossibility honestly via WebCodecs + WebRTC signaling trade-offs).

## Failure Modes & Recovery

- **Search / fetch unavailable or HTTP 401/429/timeout:** Do not stall or fabricate citations. Downgrade unconfirmed runtime/pricing claims to `'inferred'` and note `"Web verification unavailable in session"` inside `latencyNote` or `why`.
- **Contradictory user constraints (for example zero-server multiplayer):** Explain the physical constraint in 1 prose line (`<= 25` words) and compare the closest viable approximations in `STACKS`.
- **Read-only workspace (`EACCES`):** Emit the populated HTML inline and print the fallback notice in 1 line.

## Refusal & Escalation Rules

- Refuse scraping kits targeting authentication walls, CAPTCHA bypassers, or abuse automation in 1 plain line with zero HUD and zero searches.
- If the user asks to compare `> 4` stacks, group variants into the top `4` distinct architectures and explain the grouping in 1 prose line.

## Token / Word Budget

- `SKILL.md` target: `< 1,200` words (`< 6,000` bytes).
- Chat reply budget: 3-line HUD + `1 to 3` prose lines (`<= 60` words total).

## Self-Check List

- [ ] Exactly `3` or `4` candidates in `STACKS`, with `recommended: true` on exactly one?
- [ ] Are `latencyTag`, `offlineTag`, and `costTag` strictly lowercase `'verified' | 'inferred' | 'gotcha'`?
- [ ] Does every candidate include 2 specific `{ issue, mitigation }` entries in `gotchas` (and mirrored primary `gotcha`/`mitigation`)?
- [ ] Is chat prose `1 to 3` lines and `<= 60` words with zero code blocks outside the HUD?
