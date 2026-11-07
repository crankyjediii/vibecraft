# Operator Interaction Guide

VibeCraft keeps you in control of stack, visual design, and module architecture with minimal typing. Every decision gate supports 1-character digit replies, copy-paste lock blocks from interactive HTML artifacts, or plain-English overrides.

## 1. Starting a Session

- **Claude Code:** Run `/vibecraft:build <your idea>` (or describe what you want to build in plain text).
- **Claude Desktop:** Upload `vibecraft-skill.zip` (or open your VibeCraft Project) and describe your idea.

### Phase 0 · Intake Gate

- **Brief prompt (`"Build a habit tracker"`):** VibeCraft asks at most `2` decision-unlocking questions with up to `4` numbered options each (`[1]*` marks the recommended default).
- **Fast replies:**
  - Reply `go` (or `defaults`) to accept all `[1]*` starred choices immediately.
  - Reply `1` or `1, 2` to pick specific options by number.
- **Detailed prompt:** If your opening message already names the target user, core workflow, and runtime constraints, VibeCraft skips Phase 0 and opens directly at Phase 1.

## 2. Phase 1 · Research Scout (`01-stack-matrix.html`)

Scout benchmarks `3 to 4` candidate architectures across latency, offline capability, hosting cost, and concrete failure-mode gotchas.

- **Artifact workflow:** Open `vibecraft/01-stack-matrix.html` (or view the rendered Artifact in Claude Desktop), click a stack card, click **Copy selection for Claude**, and paste the `VIBECRAFT PICK v2` block into chat.
- **Keyboard / quick reply:** Reply `1`, `2`, or `3` to lock the numbered stack directly.
- **Custom override:** Reply in plain English (for example `"Use FastAPI + Postgres 16 instead"`). Scout records `2` concrete gotchas for your chosen stack and advances to Phase 2.
- **Asking "Why?":** Ask trade-off questions (`"Why SQLite over Postgres here?"`) at any gate; Claude answers in `<= 4` concise lines without advancing prematurely.

## 3. Phase 2 · Brand Artisan (`02-brand-studio.html`)

Artisan generates domain-authentic preview copy and `4 to 6` WCAG 2.2 AA verified palettes (`Linear Dark`, `Apple Clean`, `Editorial Warmth`, `Cyber Brutalist`, `Swiss Grid`, `Nocturne Terminal`).

- **Artifact workflow:** Switch presets with click or arrow keys, fine-tune color swatches while watching the live WCAG contrast badges (`>= 4.5:1`), click **Lock & copy tokens**, and paste the 19-key `VIBECRAFT LOCK v2` block into chat.
- **Headless CLI / API-only projects:** If your Phase 1 stack has zero browser or GUI surface, Artisan offers `[1]* Lock NO_COLOR-safe ANSI defaults & enter Phase 3` so you never waste time styling unused web buttons.
- **Clipboard fallback:** If a sandboxed webview blocks clipboard access, copy from the revealed `#fallback` text box or click **Download tokens.css**.

## 4. Phase 3 · System Architect (`03-architecture.html`)

Architect emits a draft Launchpad containing the `5 to 14`-file module tree, Mermaid component and sequence diagrams, and strict domain contracts (`zero any`).

- Reply `1` (**Approve & build**) to trigger Full-Stack Builder + QA Auditor.
- Reply `2` (**Revise file tree**) or `3` (**Revise data contracts**) to adjust boundaries before any implementation code is written.

## 5. Phase 4 · Builder, QA Diff & Launchpad

Builder implements every file in the approved tree against your locked `:root` tokens and hands off internally to **QA Auditor** in the same turn. You receive:

1. Audited source files.
2. `04-qa-diff.html` showing exact automated repairs across `tokens`, `style`, `types`, `comments`, `defensive`, `helpers`, `placeholder`, and `prose`.
3. `04-launchpad.html` containing copyable run commands, architecture diagrams, contracts, sanitized geometric SVG mark, and next steps.
4. A measured terminal QA stamp:
   - `✓ VibeCraft QA · [Syntax: 0 Errors] · [Tokens: 100% Validated] · [Slop: Scrubbed]` when compiler and all 19 static checks pass cleanly.
   - `! VibeCraft QA · [Syntax: Not Run] · ...` when running inside a browser-only sandbox without shell compiler access.
