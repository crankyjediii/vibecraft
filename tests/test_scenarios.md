# End-to-end test scenarios

Golden vectors for checking a VibeCraft setup. The automated rules run with `node tests/audit_rules_test.js`; the scenarios below are run by hand in a Claude Desktop Project (instructions + knowledge uploaded) or a Claude Code session with the skill installed. Each scenario lists the input, the observable pass criteria, and what counts as a failure.

## A. Studio behavior

### A1. Brief idea starts with research and two questions

Input: `Build me a voice memo app that automatically transcribes and groups notes by project.`

Pass:
- The reply opens with the 3-line HUD, Phase 1.
- Prose is 0 to 3 lines; the reply ends with exactly two micro-prompts (`Q1`, `Q2`), each with at most 3 options and a `*` default, and a reply hint.
- No artifact yet. No third question.

Fail: more than 5 lines of prose; headings or tables; artifacts before the answers; more than two questions.

### A2. Digits answer the questions

Input: `1 2`

Pass: the Stack Matrix artifact is published with exactly 3 stacks, one marked as the Scout pick; chat is the HUD plus under 60 words; every claim row carries `[Verified]`, `[Inferred]` or `[Gotcha]`.

Fail: re-asking, a text comparison of the stacks in chat, untagged claims, invented benchmark figures presented as facts.

### A3. Detailed idea skips questions

Input: a message naming platform, user, features and stack (for example `A Mac menubar app in Tauri and Solid that records the mic on a hotkey, transcribes locally, groups transcripts by project. Dark, minimal, local only.`)

Pass: HUD, then the Stack Matrix in the same turn, no questions.

### A4. Pasting a pick advances the gate

Input: the text produced by `Select Stack & Proceed`.

Pass: Brand Studio published; chat does not restate the pick; 1 to 3 lines name the archetype the Artisan recommends and why.

### A5. Chat overrides the artifact

Input after a pick: `Actually use Astro.`

Pass: one line acknowledging the change, the plan updated, no demand to redo the artifact.

### A6. Explanation requests stay short

Input: `Explain how the whole architecture works.`

Pass: 3 to 5 lines and an offer to open the diagram, or the Launchpad Architecture tab. Fail: a multi-paragraph answer.

### A7. Lock advances to the architecture

Input: the text produced by `Lock in ... & Continue`.

Pass: Launchpad published in draft mode with a Mermaid flowchart, a sequence diagram and typed contracts; tabs with no content are absent; chat ends with `[1] Approve and build  [2] Change the flow  [3] Change the data model`. No code is written before `1`.

### A8. Approval triggers build and audit

Input: `1`

Pass: code is produced (files in Claude Code; code artifacts in Desktop); the QA Diff and the full Launchpad are published; the reply ends with an audit stamp built from measured numbers.

Fail: a clean stamp when a check was not run, a stamp with no QA Diff, an `any` or `// TODO` in the delivered code.

### A9. Honest failure

Setup: ask for a feature that forces a hardcoded color in a third-party snippet, or remove network access so research cannot run.

Pass: the stamp shows the true counts (for example `[Tokens: 97% Validated]`), or the artifacts say `[Inferred]` and state that no research tool was available. Fail: a fully green stamp or unmarked guesses.

## B. Artifact templates

Open each file in a browser (or publish as an artifact) and check. No console errors in any step.

| Template | Steps | Pass |
|---|---|---|
| `brand_studio_artifact.html` | Click each of the 4 archetype cards | `:root` variables change; page background, fonts, radius, buttons, inputs, metric card, progress bar and dropdown all re-theme; header pill and lock button text show the archetype name |
| | Click `Transcribe next batch` | Button shows a spinner and is disabled for about a second; progress advances by 8 |
| | Open the dropdown by mouse and by keyboard (Enter, arrows, Escape) | Options select; focus returns to the trigger on Escape and selection |
| | Click `Lock in ... & Continue` | The toast confirms the copy, or the token text is shown selected; clipboard text begins with `VIBECRAFT LOCK` and contains a `:root` block |
| `stack_matrix_artifact.html` | Select each card with mouse and keyboard (arrows) | Active ring and indicator move; one card is always selected |
| | Click `Select Stack & Proceed`, then `Copy gotchas only` | Clipboard text begins with `VIBECRAFT PICK` for the selected stack; the gotcha button copies just the gotcha and fix |
| `qa_diff_artifact.html` | Click each diff filter chip | Hunks filter; an empty category shows the empty message |
| | Edit `REPORT.tokens.files[0].hardcoded` to 3 and reload | Token percent drops, meter turns red, verdict reads `Needs fixes`, stamp shows the real values |
| | Click `Copy audit stamp` and `Copy full report` | Clipboard contains the stamp line and the report |
| `launchpad_artifact.html` | Switch tabs by mouse and by Left, Right, Home, End | Only one panel is visible; selected tab underline moves |
| | Open Architecture, toggle `User journey` and `Lifecycle` | Mermaid renders in the current color scheme, or the source text shows if the CDN is blocked |
| | Open Asset Prompts | The logo shows at 16, 32, 64 and 512 px and stays legible at 16 |
| | Click each Copy button and `Copy All` | Buttons read `Copied` for about 2 seconds; Copy All text contains every populated section |
| | Set `LAUNCH.nextSteps` to `[]` and reload | The Next Steps tab disappears |

Also check each template at a 375 px wide viewport (no horizontal page scroll) and with the OS set to reduced motion (no animated transitions).

## C. Rules script

Run `node tests/audit_rules_test.js`. Expected output ends with `10/10 passed` and exit code 0. Covered:

1. Hardcoded colors outside token definitions are rejected.
2. Hex inside `--custom-property` lines and `@tokens` blocks is accepted.
3. `TODO`/`FIXME` comments and lorem ipsum are rejected.
4. Missing explicit return types on exported functions are rejected (`function` and arrow forms).
5. `as any` and `as unknown as` are rejected.
6. `transition: all`, gradients and four-digit z-index are rejected.
7. Narrating comments are rejected.
8. A clean, token-compliant sample passes with a token score of 100.
9. All shipped templates, the installer, `package.json` and the MCP config pass the rules.
10. No shipped prose file contains an unfinished marker.

## D. Installer

Use a throwaway home so nothing real is touched:

```bash
export TEST_HOME="$(mktemp -d)"
HOME="$TEST_HOME" ./install.sh --dry-run --yes
HOME="$TEST_HOME" BRAVE_API_KEY=example-key ./install.sh --yes
HOME="$TEST_HOME" ./install.sh --yes
```

Pass:
- Dry run prints the merged JSON with the key masked and writes nothing.
- The first real run creates the Desktop config containing `vibecraft-filesystem`, `vibecraft-brave-search`, `vibecraft-fetch`, and `$TEST_HOME/.claude/skills/vibecraft/SKILL.md` with `name: vibecraft` frontmatter, plus `skills/`, `templates/generative-ui/` and `tests/`.
- The second run backs up the config (`.bak-<timestamp>`), moves the previous skill folder aside, keeps any other `mcpServers` entries, and leaves exactly one entry per VibeCraft server.
- Without a Brave key the Brave server is skipped and the summary says so.
- An existing config that is not valid JSON makes the installer stop without modifying it.
