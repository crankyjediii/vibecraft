# VibeCraft

An autonomous vibecoding studio for Claude Desktop and Claude Code. Type a one-line idea; get a researched stack, a locked design system, typed architecture, audited code and a launchpad of docs, logo prompts and next-step prompts. Claude replies in 3 to 5 lines per turn and puts everything else in interactive artifacts.

```
 you: "Build me a voice memo app that transcribes and groups notes by project."

 ╭─ VIBECRAFT · voice memos, auto-transcribed, grouped by project
 │  ●  Scout   ○  Artisan   ○  Architect   ○  Builder+QA
 ╰─ Phase 1/4 · matching stacks · answer 2 quick questions

 Q1 Angle     [1] Private, offline-first*  [2] Multi-user cloud  [3] Native desktop
 Q2 Ambition  [1] Weekend MVP*  [2] Polished v1  [3] Launch-ready
 Reply with digits (e.g. "1 2"), or "go" for the starred defaults.
```

## What is in the box

| File | Purpose |
|---|---|
| `system_prompt.md` | The studio directive: chat limits, input gate, pipeline, Craft 12 |
| `skills/*.md` | Five roles: Scout, Artisan, Architect, Builder, Auditor |
| `templates/generative-ui/*.html` | Stack Matrix, Brand Studio, QA Diff, Launchpad artifacts |
| `claude_desktop_config.json` | MCP servers: filesystem, Brave Search, fetch |
| `install.sh` | One-step installer for macOS and Linux |
| `tests/audit_rules_test.js` | The Auditor's rules as runnable tests |
| `docs/` | Architecture and interaction protocol references |

## Setup for Claude Desktop (3 steps, about 3 minutes)

1. **Install the tools.** Run `./install.sh`. It backs up your existing `claude_desktop_config.json` (if you agree), merges three MCP servers, and asks for a folder Claude may use and an optional Brave Search key. Restart Claude Desktop afterwards.
2. **Create a Project** named "VibeCraft" and paste the whole of `system_prompt.md` into its Instructions.
3. **Upload Project Knowledge:** everything in `skills/` and `templates/generative-ui/`.

Start a chat in that Project and describe an app. Nothing else to configure.

If you skip the installer, copy the contents of `mcpServers` from `claude_desktop_config.json` into your own config by hand, replace `${HOME}/Projects` with an absolute folder path, and remove `vibecraft-brave-search` unless you have a key (replace `${BRAVE_API_KEY}` with it).

## Setup for Claude Code

```bash
./install.sh
```

This installs the skill to `~/.claude/skills/vibecraft/` (the instructions as `SKILL.md`, the five roles, the four templates and the audit script). In any Claude Code session, describe an app or type `/vibecraft`. Artifacts are written to `vibecraft/` in your project as HTML files you open in a browser.

Use `./install.sh --dry-run` to see every change first, and `./install.sh --no-desktop` if you only want the Claude Code skill.

Requirements: Node.js 18 or newer (installer and tests), `npx` for the filesystem and Brave servers, `uv` for the fetch server (`brew install uv` on macOS).

## The 4-phase gated workflow

Each phase ends at a gate. Claude does not move on until you pass it, and you pass it by pasting a line from the artifact or answering with a digit.

```
 Phase 1 · Scout ──────────────────────────────────────────────  Stack Matrix
 ┌──────────────────┬──────────────────┬──────────────────┐
 │ ◉ Local-First    │ ○ Cloud SaaS     │ ○ Desktop        │   3 stacks, latency,
 │ 40 ms · offline  │ 220 ms · online  │ 12 ms · offline  │   offline, cost,
 │ $0               │ ~$45/mo          │ $99/yr signing   │   and the gotcha that
 │ [Gotcha] Safari  │ [Gotcha] 4.5 MB  │ [Gotcha] mic     │   would bite you
 │ evicts storage   │ body limit       │ entitlement      │
 └──────────────────┴──────────────────┴──────────────────┘
        [ Select Stack & Proceed ]  → copies "VIBECRAFT PICK" to paste in chat

 Phase 2 · Artisan ────────────────────────────────────────────  Brand Studio
 ┌─ archetypes ─┐  ┌─ live preview (re-themes :root as you click) ─────────┐
 │ ◉ Linear Dark│  │  [ metric card ]  [ progress ]  [ inputs ] [ dropdown ]│
 │ ○ Editorial  │  │  buttons: primary · secondary · loading · disabled     │
 │ ○ Brutalist  │  └────────────────────────────────────────────────────────┘
 │ ○ Apple Clean│  [ Lock in Linear Dark & Continue ] → "VIBECRAFT LOCK" tokens
 └──────────────┘

 Phase 3 · Architect ──────────────────────────────────────────  Launchpad (draft)
   flowchart TD of the user journey · sequence diagram of the lifecycle ·
   TypeScript contracts with Idle / Loading / Success / Error states
   Claude asks:  [1] Approve and build  [2] Change the flow  [3] Change the data model

 Phase 4 · Builder + Auditor ──────────────────────────────────  QA Diff + Launchpad
   code written · deslop and token audit run · fixes applied · report published
   Documentation | Architecture | Asset Prompts | Next Steps      [ Copy All ]
   🛡️ Auditor: [Syntax: 0 Errors] • [Tokens: 100% Validated] • [Slop: Scrubbed]
```

Detailed idea? Phase 1 starts at once; the two questions are only for brief ideas.

## Rules Claude follows

- **Chat is 3 to 5 lines.** Explanations, diagrams, design systems and code live in artifacts.
- **Craft 12** for every UI line: no gradients, no glow, no `transition: all`, tuned neutrals, spaced on a scale, every state designed, motion as physics, tokens only.
- **Claims are tagged** `[Verified]`, `[Inferred]` or `[Gotcha]`. Estimates are never presented as measurements.
- **The stamp is earned.** The Auditor prints real numbers; a failing check shows as failing.

## Run the tests

```bash
npm test
```

`tests/audit_rules_test.js` verifies the audit rules (hardcoded colors, placeholder comments, explicit return types, type laundering, craft violations) and scans the shipped templates and installer with them. It has no dependencies.

## Customizing

- Change an archetype: edit the `THEMES` block in `brand_studio_artifact.html` (between `@tokens:start` and `@tokens:end`).
- Change what Claude researches or how it behaves: edit the matching file in `skills/`.
- The templates are data-driven. Each has one data block at the top of its script (`STACKS`, `THEMES`, `REPORT`, `LAUNCH`) that Claude replaces; the code below it never changes.

## Notes and limits

- `@modelcontextprotocol/server-brave-search` is deprecated on npm, so the config uses Brave's own `@brave/brave-search-mcp-server`. The fetch server is the Python package `mcp-server-fetch`, started with `uvx`.
- The artifact templates load Tailwind (CDN), Google Fonts and, for diagrams, Mermaid from jsdelivr. If a network is blocked, layout degrades and diagrams show their source text; the copy buttons keep working.
- Clipboard access can be blocked inside some artifact sandboxes. The templates then select the text and show it for manual copying.
- Latency, cost and capacity figures in the Stack Matrix are `[Inferred]` estimates unless marked `[Verified]`.
