# Phase 3: System Architect

## Purpose

Convert the locked stack (`VIBECRAFT PICK`) and design tokens (`VIBECRAFT LOCK`) into an explicit, reviewable architectural blueprint (`vibecraft/03-architecture.html`) containing the module file tree, Mermaid component flow and sequence diagrams, strict domain type contracts, and concrete mitigations for both Phase 1 gotchas before a single line of application logic is written.

## Inputs

- Locked Phase 1 stack + two `[Gotcha]` items (`VIBECRAFT PICK`).
- Locked Phase 2 `:root` CSS custom properties (`VIBECRAFT LOCK`), unless skipped for a headless CLI/API build.
- Code quality rules in `../vibecraft/references/code-quality.md`.

## Preconditions

1. Phase 1 and Phase 2 gates passed (or standalone `/vibecraft:launchpad` invoked on an existing repository).
2. Every Phase 1 `[Gotcha]` mitigation maps to at least one named module and contract type in the blueprint.

## Step Procedure

1. **Design minimal module boundaries (`LAUNCH.tree`):** Keep MVP module count between `5` and `14` files. Separate pure domain logic and data adapters from UI components so business rules remain unit-testable without a DOM.
2. **Author strict domain contracts (`LAUNCH.contracts`):** Define every shared entity, state union, storage repository interface, and typed `Result<T, AppError>` boundary. Zero `any`, zero untyped `Record<string, unknown>` where fields are known. Set `LAUNCH.contractsLang` (`'ts'`, `'rust'`, `'python'`, `'go'`, or `'sql'`) to match the locked stack.
3. **Draw Mermaid system & sequence diagrams (`LAUNCH.flow`, `LAUNCH.sequence`):**
   - `flow`: `flowchart TD` or `flowchart LR` (`<= 12` quoted nodes) showing UI, state/worker boundary, storage, and external I/O. Quote every node label containing parentheses, slashes, or colons (`A["Worker (OPFS SQLite)"]`).
   - `sequence`: `sequenceDiagram` tracing the single riskiest end-to-end write or failure-recovery path, explicitly showing the Phase 1 `[Gotcha]` mitigation in action.
4. **Emit draft `launchpad_artifact.html`:** Read `templates/generative-ui/launchpad_artifact.html` and populate `LAUNCH` with `phase: 'Phase 3 of 4 · Architecture Draft'`, `title: 'Review the architecture'`, `name`, `tagline`, `contractsLang`, `tree`, `flow`, `sequence`, and `contracts` (setting `readme`, `commands`, `logo`, `midjourney`, `dalle`, `nextSteps` to concise draft placeholders noted as finalized in Phase 4). Write to `vibecraft/03-architecture.html` in Claude Code or render in Claude Desktop.
5. **Reply in chat + approval gate:** Emit the 3-line HUD (`Phase 3/4 · Architecture review · Reply 1 to build, or 2/3 to revise`), **1 to 2 prose lines** naming the single highest-risk architectural trade-off, and the gate micro-prompt:
   ```text
   Gate · Blueprint: [1] Approve and build*  [2] Change the flow  [3] Change the data model
   ```

## Decision Rules (Numeric Thresholds)

- **File-tree complexity cap:** Weekend MVPs (`Q2=1`) use `5 to 10` source files; production v1 (`Q2=2`) uses `8 to 16` source files. Never propose empty `utils/` grab-bags or > 3 directory nesting levels without justification.
- **Mermaid readability cap:** Keep `flow` to `<= 12` nodes and `sequence` to `<= 6` participants and `<= 14` messages so diagrams render legibly at `768px` and `1440px` without horizontal clipping.
- **Gotcha traceability (`100%`):** `100%` of `[Gotcha]` items from `VIBECRAFT PICK` must appear as explicit types, worker boundaries, or middleware steps in `contracts` and `sequence`.

## Output Contract

```ts
interface LaunchpadData {
  phase: string;          // 'Phase 3 of 4 · Architecture Draft' (or 'Phase 4 of 4 · Launchpad' in Phase 4)
  title: string;          // 'Review the architecture' (or '<Name> is ready to launch' in Phase 4)
  name: string;           // Non-empty product name, e.g. 'LedgerSlip'
  tagline: string;        // 1-sentence value proposition
  contractsLang: 'ts' | 'rust' | 'python' | 'go' | 'sql';
  readme: string;         // Draft summary in Phase 3; complete runbook in Phase 4
  commands: string;       // Exact install/dev/test commands
  tree: string;           // ASCII file tree with 1-phrase purpose per file
  flow: string;           // Valid Mermaid flowchart TD / LR (quoted labels)
  sequence: string;       // Valid Mermaid sequenceDiagram
  contracts: string;      // Compilable strict type definitions
  logo: string;           // Geometric SVG string (2 to 5 primitives, viewBox="0 0 64 64")
  midjourney: string;     // Optional brand imagery prompt (finalized in Phase 4)
  dalle: string;          // Optional icon exploration prompt (finalized in Phase 4)
  nextSteps: string[];    // 3 to 5 concrete post-MVP milestones
}
```

## Worked Examples

See `references/examples.md` for two complete runs:
1. **Clean Approval Flow:** Local-first OPFS SQLite note app showing `SharedWorker` lock serialization in `sequence` and strict `Result<Note, StorageError>` contracts.
2. **Revision Loop (`User replies "3"` without details):** Elicits the exact schema fork in 1 targeted micro-prompt, updates `LAUNCH.contracts` and `LAUNCH.sequence`, and re-presents `[1]* [2] [3]`.

## Failure Modes & Recovery

- **User replies `2` (`Change the flow`) or `3` (`Change the data model`) with no explanation:** Do **not** guess blindly and do **not** advance to Phase 4. Ask 1 targeted 1-line question or 3-option micro-prompt naming the main design fork, update `vibecraft/03-architecture.html`, and re-emit `Gate · Blueprint: [1] Approve and build*  [2] Change the flow  [3] Change the data model`.
- **Mermaid syntax hazard:** Unquoted parentheses `Node[Worker (OPFS)]` crash Mermaid's parser. Always wrap labels containing `(`, `)`, `[`, `]`, `:`, or `/` in double quotes: `Node["Worker (OPFS)"]`.

## Refusal & Escalation Rules

- Do not start Phase 4 code generation until the user replies `1`, `"go"`, `"approve"`, or approves a specific revision with `"do X and build"`.
- If a Phase 1 `[Gotcha]` contradicts a new user chat override (for example user asks to remove the Worker while keeping synchronous OPFS SQLite), state the browser spec blocker (`FileSystemSyncAccessHandle` throws on main thread `[Verified]`) in 1 line and offer `[1] Keep dedicated Worker*  [2] Switch to async IndexedDB`.

## Token / Word Budget

- `SKILL.md` target: `< 1,100` words (`< 5,800` bytes).
- Chat reply budget: 3-line HUD + `1 to 2` prose lines (`<= 45` words) + 1-line `Gate · Blueprint` micro-prompt.

## Self-Check List

- [ ] Are `LAUNCH.name`, `LAUNCH.tagline`, `LAUNCH.phase`, `LAUNCH.title`, and `LAUNCH.contractsLang` all non-empty?
- [ ] Are all Mermaid node labels containing special characters wrapped in `"..."`?
- [ ] Does `LAUNCH.contracts` have zero `any` types and explicit error union types for every I/O method?
- [ ] Are both Phase 1 `[Gotcha]` mitigations visible in `tree`, `sequence`, and `contracts`?
