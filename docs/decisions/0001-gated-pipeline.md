# ADR 0001: Gated Four-Phase Studio Pipeline with Structured Paste-Back Locks

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

Unstructured one-shot "build me an app" prompts regularly fail in three ways: the model picks an unverified stack that hits browser/serverless limits mid-build, invents generic blue-purple Tailwind UI without a token contract, and emits walls of chat prose mixing architecture guesses with half-finished code.

## Options Considered

1. **Single-turn autonomous build:** Fast initial output, but high rework rate when stack assumptions or visual direction miss user intent.
2. **Multi-agent background swarm:** High token burn (`4x to 8x`), opaque intermediate state, and incompatible with Claude Desktop's single-session Generative UI model.
3. **Four-phase gated pipeline with versioned lock blocks (`VIBECRAFT PICK` / `VIBECRAFT LOCK`):** Explicit human-in-the-loop checkpoints between Stack Matrix, Brand Studio, System Blueprint, and Build + QA, paired with standalone single-phase entrypoints (`/vibecraft:stack`, `/vibecraft:brand`, `/vibecraft:audit`, `/vibecraft:launchpad`).

## Decision

Adopt Option 3. Each phase emits a visual HTML artifact and pauses at a deterministic gate (`VIBECRAFT PICK v2`, `VIBECRAFT LOCK v2`, or a 3-option Hick's Law micro-prompt), while allowing direct single-phase entry on existing repositories and skipping UI branding for headless CLI/API targets.

## Consequences

- **Positive:** Stack limits and all 19 `:root` CSS tokens are locked before code generation; sessions can resume cleanly in a new chat by pasting a `VIBECRAFT PICK` + `VIBECRAFT LOCK` pair; idle plugin context stays at `~734` tokens.
- **Negative / Trade-off:** Full greenfield builds take 4 turns (5 turns if the initial idea is Brief) rather than 1 turn. Users wanting single-step checks use standalone `/vibecraft:*` commands.
