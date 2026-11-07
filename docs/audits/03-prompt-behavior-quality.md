# Track 3 Audit: Prompt & Behavior Quality (`PRM-01` – `PRM-32`)

All findings below cover `system_prompt.md`, `skills/*.md` (`research_scout.md`, `brand_artisan.md`, `system_architect.md`, `fullstack_builder.md`, `qa_auditor.md`), cross-references in `docs/architecture.md`, `docs/interaction_guide.md`, `README.md`, `install.sh`, `tests/audit_rules_test.js`, `tests/test_scenarios.md`, and the four HTML templates in `templates/generative-ui/`.

---

## 1. Cross-File Contradictions (`PRM-01` – `PRM-16`)

```
ID: PRM-01        Severity: high
Where: system_prompt.md:41-43, docs/interaction_guide.md:34, skills/research_scout.md:17,23-24, docs/architecture.md:35-39
What: Brief-idea Scout research is ordered BEFORE micro-prompts in `system_prompt.md` and `docs/interaction_guide.md`, but AFTER micro-prompt answers in `docs/architecture.md` and `skills/research_scout.md`.
Evidence: `system_prompt.md:41-43`: "1. Start the Scout's research immediately and without asking (web search and fetch if available). 2. Before building any artifact, ask exactly two micro-prompts to lock the product angle, then stop and wait. 3. After the answers, run Phase 1." vs `docs/architecture.md:35-39`: `alt brief / C-->>U: HUD + 2 micro-prompts / U->>C: "1 2" / end / C->>C: Scout research (silent)` vs `skills/research_scout.md:17`: "Inputs: ... The answers to the micro-prompts, if the idea was brief (angle, ambition)."
Impact: Models either burn search/fetch tool calls on Turn 1 researching the wrong platform before `Q1 Angle` (offline web vs cloud SaaS vs native desktop) is known, or defer research until Turn 2 in violation of `system_prompt.md:41` and `tests/test_scenarios.md:7`.
Fix: Defer live stack/limit web research for brief ideas until after the two micro-prompts lock `Q1 Angle` and `Q2 Ambition` (or restrict Turn 1 to quick domain disambiguation only), and align `system_prompt.md:41-43`, `docs/interaction_guide.md:34`, `skills/research_scout.md:17`, and `docs/architecture.md:35-39` to the same sequence.
Verify: Inspect all four files to confirm Turn 1 brief sequence and Turn 2 research sequence appear in identical order across prose and Mermaid `sequenceDiagram`.
```

```
ID: PRM-02        Severity: high
Where: system_prompt.md:7,91,129, skills/brand_artisan.md:20, skills/system_architect.md:25, skills/fullstack_builder.md:47, skills/qa_auditor.md:21, docs/interaction_guide.md:22-26, README.md:8-14, tests/test_scenarios.md:13,36,42
What: `system_prompt.md:7` enforces a strict 3-line minimum ("3 to 5 lines per turn") that contradicts 0-to-3-line, 1-line, and 0-line chat contracts across every role file, doc table, README example, and test scenario.
Evidence: `system_prompt.md:7`: "Chat prose is 3 to 5 lines per turn. Never more." (`:8`: HUD and micro-prompts "do not count") vs `system_prompt.md:129`: "Is the prose at most 5 lines?" vs `README.md:8-14` (0 prose lines) vs `docs/interaction_guide.md:22-26` ("0 to 1 line", "2 to 3 lines", "1 to 2 lines") vs `skills/brand_artisan.md:20` ("up to 3 lines") vs `skills/system_architect.md:25` ("one line naming the riskiest decision") vs `skills/qa_auditor.md:21` ("HUD plus the audit stamp line", 0 prose lines) vs `tests/test_scenarios.md:13` ("Prose is 0 to 3 lines").
Impact: Conscientious models pad 0–1 line turns with filler sentences to hit the 3-line floor in `system_prompt.md:7`, directly triggering anti-filler violations (`system_prompt.md:12`) or failing `qa_auditor.md:21` and `system_architect.md:25`.
Fix: Change `system_prompt.md:7` (and `docs/interaction_guide.md:11`, `README.md:3,89`) from "3 to 5 lines" to "0 to 5 lines (at most 5 lines; shorter when a role specifies fewer)".
Verify: Grep for `3 to 5 lines` across the repo; confirm only `system_prompt.md:11` (explicit user explanation requests) retains a 3-line floor if desired, while the global turn cap is `0 to 5 lines` (`<= 5`).
```

```
ID: PRM-03        Severity: high
Where: skills/fullstack_builder.md:47, skills/qa_auditor.md:21, docs/interaction_guide.md:26, docs/architecture.md:51, system_prompt.md:77,88
What: Phase 4 executes Builder and Auditor in one turn (`system_prompt.md:77`), yet four files specify four mutually incompatible chat outputs for that turn.
Evidence: `skills/fullstack_builder.md:47`: "Chat: HUD plus up to 3 lines." vs `skills/qa_auditor.md:21`: "6. Chat reply: HUD plus the audit stamp line." (and `docs/architecture.md:51`: `C-->>U: HUD + audit stamp`) vs `docs/interaction_guide.md:26`: `| Phase 4 | 3 lines | 2 to 3 lines + stamp | QA Diff, Launchpad |` vs `system_prompt.md:88`: "In Claude Code, write it to `vibecraft/<phase>.html` in the project and tell the user the path."
Impact: In Phase 4, obeying `qa_auditor.md:21` (HUD + stamp only) makes it impossible for Claude Code to report artifact/code file paths (`system_prompt.md:88`) or summarize deliverables (`fullstack_builder.md:47`).
Fix: Remove the separate `Chat:` instruction from `skills/fullstack_builder.md:47` (since Builder hands off internally to Auditor before replying) and update `skills/qa_auditor.md:21` and `docs/architecture.md:51` to: "HUD, 1 to 3 prose lines naming the generated paths/artifacts, and the audit stamp line last."
Verify: Confirm Phase 4 turn format matches identically across `system_prompt.md:77`, `fullstack_builder.md:47`, `qa_auditor.md:21`, `docs/architecture.md:51`, and `docs/interaction_guide.md:26`.
```

```
ID: PRM-04        Severity: medium
Where: system_prompt.md:22,77,120-124,131, skills/qa_auditor.md:61, docs/interaction_guide.md:104
What: Phase 4 has no gate (`Gate: None`) and requires the audit stamp to be the final footer line, contradicting HUD line 3 (`<what you need from the user>`) and Turn Checklist item 4 ("one thing the user must do next, stated last").
Evidence: `system_prompt.md:77`: "None; end with the audit stamp" and `skills/qa_auditor.md:61`: "Footer of every final response, built from measured numbers only" vs `system_prompt.md:22`: `╰─ Phase <n>/4 · <what is happening now> · <what you need from the user>` and `system_prompt.md:131`: "- Is there exactly one thing the user must do next, stated last?"
Impact: Models in Phase 4 either append a redundant prompt after the audit stamp (breaking the stamp-as-footer invariant) or invent a fake gate in HUD line 3 when the pipeline is already complete.
Fix: Specify in `system_prompt.md:22` and `:131` that in Phase 4 (terminal turn), HUD slot 3 shows `ready to run` (or `review open findings` if QA failed) and the audit stamp replaces the final user-action prompt as the last line.
Verify: Check `system_prompt.md:22,77,131` and `tests/test_scenarios.md:60` to ensure Phase 4 termination has an unambiguous last line and HUD slot 3 value.
```

```
ID: PRM-05        Severity: medium
Where: skills/research_scout.md:28,74, system_prompt.md:7, docs/interaction_guide.md:23
What: `skills/research_scout.md` constrains chat prose by word count ("under 60 words") while `system_prompt.md` and all other roles constrain prose by line count.
Evidence: `skills/research_scout.md:28`: "7. **Chat reply:** HUD plus under 60 words." and `:74`: "Chat (under 60 words):" vs `system_prompt.md:7`: "Chat prose is 3 to 5 lines per turn. Never more." vs `docs/interaction_guide.md:23`: `| Phase 1 | 3 lines | 2 to 3 lines | Stack Matrix |`.
Impact: A 55-word reply formatted across 6 short lines passes `research_scout.md:28` while violating `system_prompt.md:7`; conversely, the 1-line template at `research_scout.md:77` (18 words, 1 line) violates the 3-line minimum in `system_prompt.md:7`.
Fix: Standardize `skills/research_scout.md:28,74` to "HUD plus 1 to 3 lines (under 60 words)" once `system_prompt.md:7` is updated to `0 to 5 lines`.
Verify: Confirm every role file expresses chat length in both compatible line bounds (`<= 5` lines) and optional word bounds.
```

```
ID: PRM-06        Severity: high
Where: skills/brand_artisan.md:28,66, system_prompt.md:99, docs/architecture.md:100, skills/qa_auditor.md:36, tests/audit_rules_test.js:18,50
What: Craft 12 Rule 1 on gradients contradicts itself within `brand_artisan.md` and across `system_prompt.md`, `qa_auditor.md`, and `tests/audit_rules_test.js`.
Evidence: `skills/brand_artisan.md:28`: "A gradient is allowed only if it is the brand itself, used once." vs `skills/brand_artisan.md:66` (`## Never`): "- Add a gradient, glow, or `transition: all` 'just this once'." vs `system_prompt.md:99`: "1. No random gradients: flat deliberate color." vs `docs/architecture.md:100`: "R1 and R2 forbid glow and gradients." vs `skills/qa_auditor.md:36`: "Every hit is a violation... any `*-gradient(`" vs `tests/audit_rules_test.js:18`: `{ id: 'gradient', test: (l) => /(linear|radial|conic)-gradient\(/.test(l) || /\bbg-gradient-to-/.test(l), kinds: ['css', 'html'] }` (with line 50 only exempting `hardcoded-color` in token blocks).
Impact: If Artisan or Builder applies the explicit R1 brand-gradient exception in `brand_artisan.md:28`, `qa_auditor.md` and `tests/audit_rules_test.js` deterministically flag it as a violation and fail the QA gate.
Fix: Either ban CSS gradients unconditionally across `system_prompt.md:99` ("1. No gradients: flat deliberate color.") and `skills/brand_artisan.md:28` (removing "A gradient is allowed only if it is the brand itself, used once"), or add an explicit `@tokens` single-token exemption in `qa_auditor.md` and `tests/audit_rules_test.js`.
Verify: Run `node tests/audit_rules_test.js` and grep `gradient` across `system_prompt.md`, `skills/*.md`, and `docs/architecture.md` to confirm zero conflicting gradient policies.
```

```
ID: PRM-07        Severity: high
Where: skills/research_scout.md:43-45,80, system_prompt.md:95, templates/generative-ui/stack_matrix_artifact.html:161-187,199,209,279-281
What: `research_scout.md` documents epistemic tags only as `[Verified]`, `[Inferred]`, and `[Gotcha]` and never tells the Scout that `STACKS[*].latencyTag`, `offlineTag`, and `costTag` must be lowercase `'verified' | 'inferred' | 'gotcha'`.
Evidence: `skills/research_scout.md:43-45`: "`[Verified]` ... `[Inferred]` ... `[Gotcha]`" and `:80`: "Every `STACKS` entry needs: ... `latencyTag`, ... `offlineTag`, ... `costTag`" vs `templates/generative-ui/stack_matrix_artifact.html:199`: `const TAG_TEXT = { verified: '[Verified]', inferred: '[Inferred]', gotcha: '[Gotcha]' };` and `:279`: `'Performance: ' + item.latencyMs + ' ms ' + TAG_TEXT[item.latencyTag]`.
Impact: When a model sets `latencyTag: '[Inferred]'` or `'Inferred'` per `research_scout.md:43-45` (especially when building from spec without the template per `system_prompt.md:91`), `TAG_TEXT[kind]` evaluates to `undefined`, rendering blank tag badges in the UI and `"Performance: 40 ms undefined"` in the `VIBECRAFT PICK` block.
Fix: Document the exact enum type `latencyTag | offlineTag | costTag: 'verified' | 'inferred' | 'gotcha'` in `skills/research_scout.md:80`, and add case/bracket normalization (`TAG_TEXT[String(kind).replace(/[\[\]]/g, '').toLowerCase()] || kind`) in `stack_matrix_artifact.html:199-210`.
Verify: Test `stack_matrix_artifact.html` with both `'inferred'` and `'[Inferred]'` and verify `skills/research_scout.md:80` explicitly lists `'verified' | 'inferred' | 'gotcha'`.
```

```
ID: PRM-08        Severity: high
Where: skills/fullstack_builder.md:47, skills/system_architect.md:24, templates/generative-ui/launchpad_artifact.html:133-135,489,544-546
What: `fullstack_builder.md:47` omits `name` and `tagline` from the `LAUNCH` fields to populate, while `system_architect.md:24` instructs setting `phase` and `title` keys that do not exist in the template's `LAUNCH` object.
Evidence: `skills/fullstack_builder.md:47`: "Fill the `LAUNCH` object in `templates/generative-ui/launchpad_artifact.html`: `readme`, `commands`, `tree`, `flow`, `sequence`, `contracts`, `logo`, `midjourney`, `dalle`, `nextSteps`." vs `launchpad_artifact.html:133-135`: `const LAUNCH = { name: 'Murmur', tagline: '...', ... }` and `:545-546`: `$('title').textContent = LAUNCH.title || LAUNCH.name + ' is ready to launch'; $('tagline').textContent = LAUNCH.tagline;` and `:489`: `return LAUNCH.name + ' launchpad\n\n' + ...` vs `skills/system_architect.md:24`: "set `phase` to `'Phase 3 of 4 · Architecture'` and `title` to `'Review the architecture'`".
Impact: A Builder replacing `LAUNCH` with the 10 keys listed in `fullstack_builder.md:47` leaves `LAUNCH.name` and `LAUNCH.tagline` as `undefined`, rendering `"undefined is ready to launch"` in `<h1>` and `"undefined launchpad"` on Copy All; in Phase 3 draft mode (`name: ""`), Copy All outputs `" launchpad"`.
Fix: Include `name`, `tagline`, `phase`, and `title` in both `launchpad_artifact.html:133-136` and `skills/fullstack_builder.md:47` / `skills/system_architect.md:24`, and guard `LAUNCH.name || LAUNCH.title || 'Project'` in `launchpad_artifact.html:489,545-546`.
Verify: Load `launchpad_artifact.html` in both Phase 3 draft shape and Phase 4 full shape and verify `<h1>`, `#tagline`, and `allText()` never emit `"undefined"` or leading spaces.
```

```
ID: PRM-09        Severity: high
Where: skills/qa_auditor.md:26,57,61-67, system_prompt.md:119-124, templates/generative-ui/qa_diff_artifact.html:284-297,321
What: `qa_diff_artifact.html` calculates `[Slop: X Remaining]` from hardcoded color counts (`t.bad`) instead of open slop/gotcha findings, and renders a green `"100% pass"` / `"All gates passed"` stamp even when `REPORT.syntax.checker` is `"not run"`.
Evidence: `qa_diff_artifact.html:286,289-296`: `const bad = REPORT.tokens.files.reduce((sum, f) => sum + f.hardcoded, 0); ... const syntaxOk = REPORT.syntax.errors === 0; return { ..., ok: syntaxOk && bad === 0 }; ... const slop = t.bad === 0 ? 'Scrubbed' : t.bad + ' Remaining';` vs `skills/qa_auditor.md:26`: "If you cannot run it, write 'not run' in `REPORT.syntax.checker` and do not print a passing stamp." and `:67`: "for example `[Syntax: 2 Errors]`, `[Tokens: 97% Validated]`, `[Slop: 3 Remaining]`."
Impact: In Claude Desktop (where `tsc` cannot execute and `checker` is `"not run"` with `errors: 0`), `qa_diff_artifact.html` prints a false clean stamp `[Syntax: 0 Errors]` and `"All gates passed"`, directly violating `system_prompt.md:119-120` and `qa_auditor.md:26`; meanwhile open deslop or unhandled-gotcha findings cannot be represented in the stamp at all.
Fix: Add `openSlop: number` and `openGotchas: number` (or `syntax.ran: boolean`) to `REPORT` in `qa_diff_artifact.html` and `skills/qa_auditor.md`, treat `checker === 'not run'` as `[Syntax: Not Run]` with `ok: false`, and compute `[Slop: ...]` from `REPORT.openSlop` rather than `t.bad`.
Verify: Test `qa_diff_artifact.html` with `checker: 'not run', errors: 0` and with `openSlop: 2, hardcoded: 0`, asserting verdict is `Needs fixes` and stamp reads `[Syntax: Not Run]` and `[Slop: 2 Remaining]`.
```

```
ID: PRM-10        Severity: medium
Where: skills/qa_auditor.md:20,44-54, templates/generative-ui/qa_diff_artifact.html:273,347,372
What: `skills/qa_auditor.md` defines deslop/prose categories (`Placeholder text`, `Style drift`, `prose scrub`) that are missing from `CATEGORY_LABELS` in `qa_diff_artifact.html`, and never documents the `REPORT` object schema.
Evidence: `skills/qa_auditor.md:48-53`: "- **Placeholder text.** ... - **Style drift.** ... ## Check 4: prose scrub" vs `templates/generative-ui/qa_diff_artifact.html:273`: `const CATEGORY_LABELS = { all: 'All', comments: 'Comments', defensive: 'Defensive checks', types: 'Type laundering', helpers: 'Helpers', tokens: 'Tokens' };` and `:347`: `node('span', 'muted', CATEGORY_LABELS[d.category])`.
Impact: When the Auditor records a diff hunk for `placeholder`, `style`, or `prose`, `CATEGORY_LABELS[d.category]` resolves to `undefined`, producing blank filter chips and missing category labels in the QA Diff artifact.
Fix: Add `placeholder: 'Placeholders'`, `style: 'Style drift'`, `prose: 'Prose scrub'`, and a fallback `CATEGORY_LABELS[key] || key` to `qa_diff_artifact.html:273`, and document the `REPORT` schema and allowed `category` keys in `skills/qa_auditor.md:20`.
Verify: Render `qa_diff_artifact.html` with hunks in all 8 categories and confirm every chip and hunk header displays a non-empty label.
```

```
ID: PRM-11        Severity: medium
Where: skills/qa_auditor.md:30-38,71, docs/architecture.md:82-95, tests/audit_rules_test.js:12-21,30-38,57-61, templates/generative-ui/qa_diff_artifact.html:206,285-287
What: `qa_auditor.md:71` and `docs/architecture.md:82` claim `tests/audit_rules_test.js` implements the same rules as the Auditor role, but the script omits named colors and glow shadows, skips `.ts`/`.tsx`/`.js`/`.jsx` for CSS/Tailwind craft rules, and computes token percentage differently.
Evidence: `skills/qa_auditor.md:71`: "`tests/audit_rules_test.js` in this repo implements the same regexes as an `audit(source, filename)` function" and `:36`: "Also flag: named colors used as styling (`white`, `black`), `transition: all`, any `*-gradient(`, glow shadows, and `z-index` values of four digits or more" vs `tests/audit_rules_test.js:17-19`: `transition-all`, `gradient`, and `z-index-arms-race` restrict `kinds: ['css', 'html']` (skipping `.tsx`/`.jsx` JSX `className` and inline `style={{ background: "white" }}` shown in `qa_diff_artifact.html:261`), and have zero rule for named colors or glow shadows; plus `qa_auditor.md:30` excludes `tokens.css` while `qa_diff_artifact.html:206` includes `tokens.css` (`refs: 90`) in `REPORT.tokens.files` and `audit_rules_test.js:58` counts lines matching `/color|background|border|fill|stroke|shadow/i`.
Impact: React/Solid `.tsx` components containing `className="transition-all bg-gradient-to-r ..."` or `style={{ background: "white" }}` pass `node tests/audit_rules_test.js` with 0 violations, and token adherence percentages vary depending on whether `tokens.css` is included.
Fix: Extend `transition-all`, `gradient`, and `z-index-arms-race` in `tests/audit_rules_test.js` to `['css', 'html', 'js', 'ts']`, add a named-color style rule, and unify the token-score denominator rule across `qa_auditor.md`, `qa_diff_artifact.html`, and `audit_rules_test.js`.
Verify: Add `.tsx` test vectors for `transition-all`, `bg-gradient-to-r`, and `style={{ background: "white" }}` to `tests/audit_rules_test.js` and verify `npm test` catches all three.
```

```
ID: PRM-12        Severity: medium
Where: system_prompt.md:87,97,103, skills/brand_artisan.md:18,24,32, templates/generative-ui/brand_studio_artifact.html:184-229,452-475
What: `system_prompt.md:87` forbids modifying anything outside `THEMES` in `brand_studio_artifact.html`, forcing every non-voice-memo project to display hardcoded "Voice memo app" copy in violation of Craft 12 R5 ("real microcopy for this product").
Evidence: `system_prompt.md:87`: "Change only the data block: ... the `THEMES` block between `@tokens:start` and `@tokens:end` (brand studio) ... Keep all code, styles and structure as they are." and `:97,103`: "The Craft 12 (applies to every artifact and every UI line you write) ... 5. No placeholder copy: real microcopy for this product." vs `brand_studio_artifact.html:184,188,196,205,219,225`: `"Live preview · Voice memo app"`, `"Memos transcribed"`, `"34 of 50 memos"`, `"Field recordings"`, `"Group by project"`, `"Export audio"`.
Impact: For any user building an e-commerce store, habit tracker, or developer tool, Brand Studio either displays irrelevant voice-memo UI copy (breaking R5) or requires editing HTML/JS outside `@tokens:start..@tokens:end` (breaking `system_prompt.md:87`).
Fix: Extract the preview strings (`productLabel`, `metricLabel`, `metricValue`, `batchLabel`, `fieldLabel`, `fieldValue`, `dropdownOptions`, `secondaryCta`, `disabledCta`) into a `PREVIEW` data object at the top of `brand_studio_artifact.html` and list `PREVIEW` alongside `THEMES` in `system_prompt.md:87` and `brand_artisan.md:18`.
Verify: Replace `PREVIEW` in `brand_studio_artifact.html` for a non-audio product and verify zero "memo"/"transcribe"/"audio" strings appear in the rendered DOM.
```

```
ID: PRM-13        Severity: medium
Where: system_prompt.md:95, skills/research_scout.md:3,25,80,84, templates/generative-ui/stack_matrix_artifact.html:164-165,282-283
What: The Scout is instructed to find **two** non-obvious gotchas, but the `STACKS` data contract and `VIBECRAFT PICK` output only accept a single `gotcha` and `mitigation` string per stack.
Evidence: `system_prompt.md:95`: "and two non-obvious failure modes specific to the idea." and `skills/research_scout.md:25`: "4. **Find two gotchas** that are non-obvious and specific to this idea plus this stack." vs `skills/research_scout.md:80`: "Every `STACKS` entry needs: ... `gotcha`, `mitigation`." and `:84`: "Read the `Stack:` line as the locked stack and the `[Gotcha]` line as a requirement".
Impact: Either the second researched gotcha is silently dropped from the artifact and lock block (losing half the Scout's risk analysis before Phase 3/4), or the model crams two unrelated issues into one string or breaks the template with an unexpected `gotchas: []` array.
Fix: Either change `gotchas` in `stack_matrix_artifact.html` (and `research_scout.md:80,84`) to a 2-item array `gotchas: [{ issue, mitigation }, ...]` rendered and copied into `VIBECRAFT PICK`, or align `system_prompt.md:95` and `research_scout.md:3,25` to "one non-obvious failure mode per candidate stack".
Verify: Check `system_prompt.md:95`, `research_scout.md:3,25,80,84`, and `stack_matrix_artifact.html` to confirm cardinality matches across prose, schema, and `selectionText()`.
```

```
ID: PRM-14        Severity: medium
Where: system_prompt.md:76-77,88, README.md:45
What: `system_prompt.md:88` tells Claude Code to write every artifact to `vibecraft/<phase>.html`, which collides when Phase 4 emits two separate HTML artifacts (`qa_diff_artifact.html` and `launchpad_artifact.html`).
Evidence: `system_prompt.md:88`: "In Claude Code, write it to `vibecraft/<phase>.html` in the project and tell the user the path." vs `system_prompt.md:77`: `| 4 | Builder + Auditor | Code, then qa_diff_artifact.html, then the full launchpad_artifact.html |`.
Impact: In Claude Code, writing both Phase 4 deliverables to `vibecraft/phase-4.html` (or `vibecraft/4.html`) overwrites the QA Diff report with the Launchpad, and `<phase>` itself has no canonical slug format (`1` vs `phase-1` vs `scout`).
Fix: Specify explicit deterministic output filenames in `system_prompt.md:88`: `vibecraft/01-stack-matrix.html`, `vibecraft/02-brand-studio.html`, `vibecraft/03-architecture.html`, `vibecraft/04-qa-diff.html`, and `vibecraft/04-launchpad.html`.
Verify: Confirm all 5 pipeline artifact emissions map 1-to-1 to distinct filenames under `vibecraft/`.
```

```
ID: PRM-15        Severity: low
Where: install.sh:216, system_prompt.md:70
What: The `SKILL.md` frontmatter generated by `install.sh` triggers VibeCraft for standalone single-phase requests ("stack comparison, brand and theme picker, architecture diagrams, or a QA audit"), which `system_prompt.md:70` forbids running without passing all prior gates.
Evidence: `install.sh:216`: `description: ... or asks for a stack comparison, brand and theme picker, architecture diagrams, or a QA audit. Runs a 4-phase gated pipeline...` vs `system_prompt.md:70`: "Do not start a phase until the previous gate is passed. Gates are passed by the user's paste-back (artifact lock text) or a digit answer."
Impact: A user invoking VibeCraft on an existing repo with "run a QA audit on `src/`" or "draw architecture diagrams for this codebase" is forced back to Phase 1 Stack Matrix or blocked by missing `VIBECRAFT PICK` / `VIBECRAFT LOCK` blocks.
Fix: Add a single-phase entry exception in `system_prompt.md:70`: "If the user explicitly asks for only one phase on an existing codebase (e.g., QA audit or architecture review), infer stack and tokens from the repo and run that phase directly."
Verify: Add a standalone QA audit scenario to `tests/test_scenarios.md` verifying direct Phase 4 entry on an existing project.
```

```
ID: PRM-16        Severity: low
Where: system_prompt.md:9,47,66,122-124, skills/system_architect.md:28,31, skills/fullstack_builder.md:37, templates/generative-ui/launchpad_artifact.html:234-242, skills/brand_artisan.md:34, templates/generative-ui/brand_studio_artifact.html:298-301
What: Four minor rule-vs-example contradictions exist across the prompt suite: (a) chat code-block ban vs fenced audit stamp, (b) missing `*` default and `"go"` support on Phase 3's micro-prompt, (c) `"2 or 3 shapes"` logo rule vs 5-shape reference SVG, and (d) pure `#ffffff`/`#000` in the `apple` archetype vs Craft 12 R7.
Evidence: (a) `system_prompt.md:9`: "no code blocks in chat, except the HUD and micro-prompts" vs `:122-124` (fenced audit stamp); (b) `system_prompt.md:47,66`: "accept the marked defaults... Mark the recommended option with `*`" vs `system_architect.md:28,31`: `[1] Approve and build  [2] Change the flow  [3] Change the data model` / "until the user answers `1`"; (c) `fullstack_builder.md:37`: "2 or 3 shapes" vs `launchpad_artifact.html:234-242` (`<rect>`, 3 `<path>`s, `<circle>` = 5 shapes); (d) `brand_artisan.md:34`: "No pure `#000` on `#fff`" vs `brand_studio_artifact.html:298-301`: `'accent-fg': '#ffffff'`, `'border': 'rgba(0, 0, 0, 0.08)'`.
Impact: Examples teach the model to break its own rules (emitting fenced stamps, omitting `*` defaults in Phase 3, drawing 5-shape logos, and outputting `#ffffff`).
Fix: Exempt the audit stamp (or render it unfenced) in `system_prompt.md:9,122-124`; add `*` to `[1] Approve and build*` and accept `"go"` in `system_architect.md:28,31`; change `fullstack_builder.md:37` to "2 to 5 geometric primitives"; and tune `#ffffff` to `#fafafa` in `brand_studio_artifact.html:301`.
Verify: Inspect all four sites and run `node tests/audit_rules_test.js` to confirm examples conform strictly to prose rules.
```

---

## 2. Ambiguous or Unverifiable Instructions (`PRM-17` – `PRM-22`)

```
ID: PRM-17        Severity: high
Where: system_prompt.md:20-31
What: HUD line 2 defines status glyphs only for `current` (`●`) and `pending` (`○`), leaving completed phases in Phases 2, 3, and 4 undefined across the entire repository.
Evidence: `system_prompt.md:21`: `│  <● current, ○ pending>  Scout  <●○> Artisan  <●○> Architect  <●○> Builder+QA` (with only a Phase 1 example at lines 28–31, and no Phase 2–4 HUD example anywhere in `system_prompt.md`, `docs/`, or `README.md`).
Impact: Starting in Phase 2, models guess inconsistently between `✓`, `●`, `◉`, or `○` for completed roles—either making completed roles look active (`●`), making them look unstarted (`○`), or inventing unapproved symbols.
Fix: Define all three state glyphs explicitly in `system_prompt.md:21`: `<✓ done, ● current, ○ pending>` and include a one-line Phase 3 HUD example showing `✓  Scout   ✓  Artisan   ●  Architect   ○  Builder+QA`.
Verify: Check `system_prompt.md:21` for explicit `done`, `current`, and `pending` glyphs so HUD line 2 can be validated by regex in every phase.
```

```
ID: PRM-18        Severity: medium
Where: system_prompt.md:7,10,129, skills/brand_artisan.md:20, skills/fullstack_builder.md:47
What: Chat brevity is specified in `"lines"` without defining whether a line is a `\n`-delimited logical line or a viewport-wrapped line, nor capping words/characters per line.
Evidence: `system_prompt.md:7`: "- Chat prose is 3 to 5 lines per turn. Never more." and `:10`: "Anything longer than 5 lines ... goes into an Artifact".
Impact: A model can emit three 90-word paragraphs separated by single newlines (`3` logical lines in raw output) that wrap into 18 visual lines in Claude Desktop, defeating the Anti-Wall-of-Text rule while technically satisfying `\n` line counts.
Fix: Define a chat prose line deterministically in `system_prompt.md:7`: "At most 5 newline-separated prose lines per turn, and at most 80 words of prose total (excluding the HUD, micro-prompts, and audit stamp)."
Verify: Validate any turn trace deterministically with `proseLines <= 5 && proseWords <= 80`.
```

```
ID: PRM-19        Severity: medium
Where: system_prompt.md:37-38, docs/interaction_guide.md:30
What: The Adaptive Input Gate uses fuzzy thresholds ("fewer than about 30 words") and overlapping boolean conditions that match both `Brief` and `Detailed` simultaneously when a short message names a stack or aesthetic.
Evidence: `system_prompt.md:37-38`: "- **Brief:** two sentences or fewer, or fewer than about 30 words, and it leaves out at least two of: platform, target user, core features, constraints. - **Detailed:** everything else, or any message that includes a stack, a design direction, a feature list, or a pasted spec."
Impact: An input like `"Build a dark minimal habit tracker in Astro"` (8 words, 1 sentence, omits target user and constraints, yet names a stack and design direction) satisfies both `Brief` and `Detailed`, making Turn 1 behavior (micro-prompts vs immediate Stack Matrix) non-deterministic.
Fix: Make `Detailed` win first with crisp integer bounds: "**Detailed:** > 30 words, > 2 sentences, includes a stack/feature list/pasted spec, or specifies at least 3 of {platform, target user, core features, constraints}. **Brief:** everything else."
Verify: Test boundary inputs (e.g., 8-word prompt with stack, 30-word prompt, 31-word prompt) against the predicate to confirm mutual exclusivity and totality.
```

```
ID: PRM-20        Severity: medium
Where: skills/fullstack_builder.md:23, skills/qa_auditor.md:30-37, tests/audit_rules_test.js:7,13
What: Allowing `"Tailwind classes mapped to [tokens]"` while auditing only `#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(` makes hardcoded Tailwind palette colors and colored glow utilities undetectable.
Evidence: `skills/fullstack_builder.md:23`: "Components read colors, radius, fonts and shadows from tokens only (`var(--accent)`, or Tailwind classes mapped to them)." and `skills/qa_auditor.md:33`: `rg -n "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(" src --glob "!**/tokens.css"`.
Impact: Generated code using standard Tailwind palette/glow utilities (`bg-zinc-950`, `text-indigo-500`, `bg-white`, `shadow-lg shadow-cyan-500/50`) bypasses both the `rg` check and `audit_rules_test.js`, earning a false `[Tokens: 100% Validated]` stamp without using `:root` tokens.
Fix: Add a Tailwind default-color/arbitrary-color regex check (`\b(bg|text|border|ring|fill|stroke|from|via|to|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(-\d{2,3})?\b`) to `skills/qa_auditor.md:33` and `tests/audit_rules_test.js`.
Verify: Add a test vector `<div className="bg-indigo-500 text-white shadow-indigo-500/50">` in `tests/audit_rules_test.js` and verify it fails `hardcoded-color`.
```

```
ID: PRM-21        Severity: medium
Where: skills/brand_artisan.md:24,31,35-39,52, system_prompt.md:102,106-110
What: `brand_artisan.md:24` asserts that all Craft 12 rules "are checked by the QA Auditor", yet seven Craft 12 rules and the WCAG contrast floor lack any Auditor check, and the shipped HTML templates themselves violate R8's spacing scale.
Evidence: `skills/brand_artisan.md:24`: "Every artifact and every line of UI code obeys these. They are checked by the QA Auditor." and `:35`: `| R8 | Spacing on a scale | 4, 8, 16, 24, 48, 96 px. |` vs shipped templates using `gap: 20px; padding: 0 20px; gap: 6px; padding: 12px` (`stack_matrix_artifact.html:61,89,99,103`), `padding: 10px 14px` (`qa_diff_artifact.html:91`), and Tailwind `gap-3` (12px), `p-5` (20px), `py-10` (40px); meanwhile R4 ("read at squint distance"), R8, R9, R10, R11 ("every state" without scoping to interactive vs data-fetching views), R12, and WCAG 4.5:1/3:1 (`:52`) have zero checks in `qa_auditor.md` or `tests/audit_rules_test.js`.
Impact: Claiming deterministic QA enforcement for uncheckable aesthetic heuristics (`"read at squint distance"`) misleads users, while an overly narrow spacing scale (`4,8,16,24,48,96` omitting `12,20,32,64`) contradicts the repo's own reference templates.
Fix: Split Craft 12 in `brand_artisan.md:24` into **Linter-enforced invariants** (R1, R2, R3, R5, R6, R7, tokens) and **Design-review heuristics** (R4, R8–R12), widen R8 to include `12, 20, 32, 64` (matching Tailwind/templates), scope R11 states by component kind (interactive controls: hover/focus-visible/active/disabled; async data views: loading/empty/error), and add a WCAG contrast helper to `tests/audit_rules_test.js`.
Verify: Run `node tests/audit_rules_test.js` including a WCAG contrast check on `THEMES` and confirm `brand_artisan.md:24` accurately names which rules are mechanically audited.
```

```
ID: PRM-22        Severity: low
Where: skills/research_scout.md:8, skills/brand_artisan.md:8, skills/system_architect.md:8, skills/fullstack_builder.md:8,22,27,34, skills/qa_auditor.md:8,44-49,53
What: Every role file cites unbundled external skill names—including an imperative `Apply stop-slop` command in `qa_auditor.md:53`—and relies on subjective code heuristics ("domain meaning", "trivial presentational", "style drift") without linter configuration.
Evidence: `skills/qa_auditor.md:53`: "Apply `stop-slop` to every user-facing string and every chat line" and line 8 across all 5 files referencing `competitive-research`, `market-research`, `craft`, `pro-design`, `apple-ui-design`, `uiux-ui-design-basics`, `senior-frontend`, `architecture-review`, `logo-design`, `deslop`, `stop-slop`, and `token-compliance` (none shipped in this repo).
Impact: In Claude Code or Claude Desktop environments without those external skills installed, the model may waste tool calls searching for `stop-slop` / `logo-design` skill files or apply inconsistent guesses for undefined external rules.
Fix: Remove backticked external skill invocations (especially `Apply stop-slop` in `qa_auditor.md:53`), replacing them with self-contained inline rules or a local `references/` file shipped inside the plugin.
Verify: Grep `skills/*.md` for external skill names (`stop-slop`, `deslop`, `senior-frontend`, `logo-design`, `pro-design`, `competitive-research`) and confirm zero unbundled skill references remain.
```

---

## 3. Missing Refusal, Escalation, and Error-Recovery Paths (`PRM-23` – `PRM-28`)

```
ID: PRM-23        Severity: high
Where: system_prompt.md:80, skills/research_scout.md:84, skills/brand_artisan.md:62, templates/generative-ui/stack_matrix_artifact.html:139,289-292
What: Neither `system_prompt.md` nor the role files define validation or recovery when a user pastes a truncated, malformed, out-of-order, or `"Copy gotchas only"` lock block.
Evidence: `system_prompt.md:80`: "Treat a pasted `VIBECRAFT PICK` or `VIBECRAFT LOCK` block as authoritative state. Restate nothing from it in chat." and `skills/brand_artisan.md:62`: "Copy the `:root { ... }` block verbatim into `src/styles/tokens.css`"; meanwhile `stack_matrix_artifact.html:139` provides a second button `"Copy gotchas only"` producing `[Gotcha] ...\nFix: ...` with no `VIBECRAFT PICK` header or `Stack:` line.
Impact: A truncated manual copy of `VIBECRAFT LOCK` (missing closing `}` or missing required `TOKEN_KEYS`) produces invalid CSS in `src/styles/tokens.css` when copied verbatim; pasting `"Copy gotchas only"` or pasting `VIBECRAFT LOCK` during Phase 1 stalls or corrupts pipeline state.
Fix: Add a gate-validation rule in `system_prompt.md:80-83`: if a paste-back is truncated, missing `Stack:` or any of the 19 `TOKEN_KEYS`, comes from `"Copy gotchas only"`, or skips an uncompleted phase, do not advance—state what is missing in 1 line and offer a 2-option micro-prompt (`[1] Use recommended default*  [2] Re-paste block`).
Verify: Add malformed/truncated paste-back and `"Copy gotchas only"` recovery cases to `tests/test_scenarios.md`.
```

```
ID: PRM-24        Severity: high
Where: system_prompt.md:17,41,70
What: `system_prompt.md` contains no refusal or scope-exit rules for harmful/illegal build requests or non-product/headless tasks, instructing the model to display the VibeCraft HUD and run unprompted web searches on every Turn 1 prompt.
Evidence: `system_prompt.md:17`: "Start every response in a studio session with exactly three lines [HUD]" and `:41`: "1. Start the Scout's research immediately and without asking (web search and fetch if available)."
Impact: On malicious requests (phishing pages, credential harvesters, malware/stalkerware), the directive instructs running live web searches and rendering a studio HUD before refusing; on headless CLI/API or bug-fix prompts inside a VibeCraft Project, the user is forced through UI Brand Studio archetypes and app-icon prompts that do not apply.
Fix: Add a Scope & Safety Gate before Section 2 in `system_prompt.md`: (1) refuse harmful, illegal, or abusive requests in 1 plain line with no HUD, no research tool calls, and no artifacts; (2) for headless/CLI/API ideas with no UI, skip Phase 2 (Brand Artisan) after `VIBECRAFT PICK` or offer `[1] Skip UI branding (headless)*  [2] Include docs/landing theme`; (3) for unrelated Q&A, step outside the pipeline cleanly.
Verify: Add refusal and headless-CLI test vectors to `tests/test_scenarios.md` confirming zero tool calls and zero HUD on unsafe inputs.
```

```
ID: PRM-25        Severity: high
Where: skills/qa_auditor.md:12,18-21,67, skills/fullstack_builder.md:20
What: Phase 4 contradicts itself on whether unresolved errors block the Launchpad and defines no escalation protocol when 3 QA repair passes fail or when Builder encounters an unworkable Phase 3 contract.
Evidence: `skills/qa_auditor.md:12`: "Nothing reaches the Launchpad until the code is type-clean, token-clean and free of AI slop." vs `:18-20`: "If a repair could change behavior, leave it and report it as open. ... publish it, then publish the Launchpad." and `skills/fullstack_builder.md:20`: "If a type must change, stop and tell the user rather than widening it."
Impact: If `tsc` errors or unhandled gotchas remain after 3 passes, the model faces contradictory orders (withhold Launchpad per line 12 vs publish Launchpad anyway per line 20); if Builder stops per `fullstack_builder.md:20`, neither HUD state nor resume gate is defined.
Fix: Reconcile `skills/qa_auditor.md:12,18-21`: if syntax/type errors remain after 3 passes, publish `qa_diff_artifact.html` ONLY, withhold the final Launchpad, print the failing stamp, and emit a recovery micro-prompt (`[1] Approve behavior-changing fix*  [2] Return to Phase 3 contracts`); apply the same micro-prompt when `fullstack_builder.md:20` triggers.
Verify: Check `skills/qa_auditor.md:12,20` and `skills/fullstack_builder.md:20` to confirm blocked-gate escalation is consistent and deterministic.
```

```
ID: PRM-26        Severity: medium
Where: skills/system_architect.md:28-31, system_prompt.md:47,60-64
What: Phase 3 offers `[2] Change the flow` and `[3] Change the data model` with no instruction on how to elicit the specific revision, and micro-prompts lack handling for out-of-range digits (`4`, `0`) or contradictory choices.
Evidence: `skills/system_architect.md:28-31`: `[1] Approve and build  [2] Change the flow  [3] Change the data model` / "Do not start Phase 4 until the user answers `1`." and `system_prompt.md:47`: "Never ask a third question to 'make sure'."
Impact: When a user replies `"2"` or `"3"` alone, the Architect has no specification of *what* to change in the flow or schema and must either guess blindly or ask an unformatted follow-up question; if a user types `"4"` in Turn 1, `system_prompt.md:47` forbids asking a clarifying question.
Fix: Specify in `skills/system_architect.md:31` that on `2` or `3` without details, Claude asks one targeted 1-line question or 3-option micro-prompt naming the main fork, updates the draft Launchpad, and re-presents `[1]* [2] [3]`; in `system_prompt.md:47`, map invalid digits to a 1-line re-prompt of the same micro-prompt (exempt from the "third question" ban).
Verify: Add a Phase 3 `"2"` revision-loop scenario to `tests/test_scenarios.md`.
```

```
ID: PRM-27        Severity: medium
Where: system_prompt.md:5,81,97,116, docs/architecture.md:63, skills/brand_artisan.md:41,66
What: `docs/architecture.md:63` states `"Chat wins over the artifact"` and `system_prompt.md:81` accepts plain-chat edits, but no precedence hierarchy resolves direct user overrides that conflict with `"absolute"` rules (non-TypeScript stacks, requested gradients, pure `#000`, or inline chat explanations).
Evidence: `system_prompt.md:81`: "If the user edits their choice in chat instead (for example 'use Astro'), accept it, update the plan, and continue." and `docs/architecture.md:63`: "Chat wins over the artifact." vs `system_prompt.md:5`: "The Anti-Wall-of-Text Rule (absolute)", `:116`: "TypeScript strict", and `brand_artisan.md:66`: "Never: Add a gradient, glow, or `transition: all` 'just this once'."
Impact: If a user asks for a Rust/Python/Go backend, plain JS, or a brand gradient, the model either refuses a valid user requirement or complies and then fails its own Phase 4 QA Auditor (`TypeScript contracts` hardcoded at `launchpad_artifact.html:354`, gradient regex at `audit_rules_test.js:18`).
Fix: Add an explicit 3-tier precedence rule in `system_prompt.md`: (1) **Non-overridable:** safety, honest epistemic tags (`[Verified]`/`[Inferred]`), and honest QA stamp measurements; (2) **User-overridable with recorded waiver:** stack language (adapting `contracts` label/checker to Rust/Python/SQL when non-TS), brand palette/gradient; (3) **Default studio style:** chat length and Craft 12 defaults when not overridden by the user.
Verify: Confirm `system_prompt.md` documents the 3-tier override precedence and `launchpad_artifact.html:354` supports non-TS contract labels (`LAUNCH.contractsLang`).
```

```
ID: PRM-28        Severity: medium
Where: claude_desktop_config.json:3-18, system_prompt.md:88,95, skills/fullstack_builder.md:30, docs/architecture.md:22-23
What: Missing fallback paths when MCP filesystem/search/fetch calls error at runtime (e.g., paths outside `${HOME}/Projects`, read-only directories, network/API errors), and `docs/architecture.md:23` wires MCP filesystem to Builder while `fullstack_builder.md:30` tells Claude Desktop never to write files.
Evidence: `claude_desktop_config.json:5`: `"args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/Projects"]` and `docs/architecture.md:22-23`: `MCP --> R4` vs `skills/fullstack_builder.md:30`: "In a Claude Code session, write files into the project. In Claude Desktop, deliver the code as code artifacts, one per module".
Impact: Users who install `vibecraft-filesystem` in Claude Desktop per `install.sh` never get files written to `~/Projects` unless they ask (or get `Access denied` errors if they name another path), and transient Brave Search `401/429` or `mcp-server-fetch` timeouts lack a silent downgrade rule (`system_prompt.md:95` only covers "no research tool is available", not tool runtime failure).
Fix: Expand `system_prompt.md:95` to cover runtime search/fetch errors ("if research tools are unavailable or error, downgrade affected claims to `[Inferred]` and note why in the artifact"), clarify `fullstack_builder.md:30` so Claude Desktop writes to `${PROJECTS_DIR}/<app-slug>/` when `vibecraft-filesystem` is available (falling back to code artifacts on permission error or absence), and handle `EACCES`/read-only errors in Claude Code by falling back to inline artifacts.
Verify: Check `system_prompt.md:88,95`, `fullstack_builder.md:30`, and `docs/architecture.md:22-23` for consistent MCP filesystem and tool-error fallback behavior.
```

---

## 4. Exact Byte / Word / Token Cost & Lazy-Loading Audit (`PRM-29` – `PRM-32`)

### Exact Measured File & Bundle Inventory

| File / Bundle | Bytes | Chars | Words | Lines | Est. Tokens (`chars/4`) | Est. Tokens (`words*1.33`) |
|---|---:|---:|---:|---:|---:|---:|
| Generated `SKILL.md` YAML frontmatter only (`install.sh:214-218`) | 407 | 407 | 66 | 5 | 101.8 | 87.8 |
| `system_prompt.md` (Desktop Project Instructions, always loaded) | 8,097 | 8,038 | 1,326 | 132 | 2,009.5 | 1,763.6 |
| Generated `SKILL.md` (`frontmatter` + `system_prompt.md`) | 8,504 | 8,445 | 1,392 | 137 | 2,111.2 | 1,851.4 |
| `skills/research_scout.md` (incl. 231 B frontmatter) | 5,514 | 5,514 | 843 | 90 | 1,378.5 | 1,121.2 |
| `skills/brand_artisan.md` (incl. 241 B frontmatter) | 4,622 | 4,622 | 753 | 68 | 1,155.5 | 1,001.5 |
| `skills/system_architect.md` (incl. 231 B frontmatter) | 3,073 | 3,072 | 495 | 68 | 768.0 | 658.4 |
| `skills/fullstack_builder.md` (incl. 277 B frontmatter) | 3,826 | 3,826 | 612 | 53 | 956.5 | 814.0 |
| `skills/qa_auditor.md` (incl. 253 B frontmatter) | 4,060 | 4,051 | 628 | 77 | 1,012.8 | 835.2 |
| **All 5 `skills/*.md` combined** | **21,095** | **21,085** | **3,331** | **356** | **5,271.2** | **4,430.2** |
| **`system_prompt.md` + 5 `skills/*.md` combined** | **29,192** | **29,123** | **4,657** | **488** | **7,280.8** | **6,193.8** |
| **Generated `SKILL.md` + 5 `skills/*.md` combined** | **29,599** | **29,530** | **4,723** | **493** | **7,382.5** | **6,281.6** |
| `templates/generative-ui/stack_matrix_artifact.html` | 15,579 | 15,576 | 1,741 | 343 | 3,894.0 | 2,315.5 |
| `templates/generative-ui/brand_studio_artifact.html` | 22,921 | 22,917 | 2,276 | 534 | 5,729.2 | 3,027.1 |
| `templates/generative-ui/qa_diff_artifact.html` | 20,299 | 20,285 | 2,308 | 441 | 5,071.2 | 3,069.6 |
| `templates/generative-ui/launchpad_artifact.html` | 23,526 | 23,524 | 2,749 | 556 | 5,881.0 | 3,656.2 |
| **All 4 HTML templates combined** | **82,325** | **82,302** | **9,074** | **1,874** | **20,575.5** | **12,068.4** |
| **Desktop Project total (`system_prompt` + `skills` + `templates`)** | **111,517** | **111,425** | **13,731** | **2,362** | **27,856.2** | **18,262.2** |
| `docs/architecture.md` (repo doc) | 5,334 | 5,334 | 788 | 103 | 1,333.5 | 1,048.0 |
| `docs/interaction_guide.md` (repo doc) | 4,959 | 4,955 | 866 | 108 | 1,238.8 | 1,151.8 |

```
ID: PRM-29        Severity: high
Where: README.md:32-33, install.sh:237-238, system_prompt.md:3,86
What: Claude Desktop setup instructs uploading all 5 role files and all 4 HTML templates into Project Knowledge alongside `system_prompt.md`, injecting 111,517 bytes (~27,856 `chars/4` tokens / ~18,262 `words*1.33` tokens) into context on every turn.
Evidence: `README.md:32-33`: "2. Create a Project named 'VibeCraft' and paste the whole of `system_prompt.md` into its Instructions. 3. Upload Project Knowledge: everything in `skills/` and `templates/generative-ui/`." Measured total: `system_prompt.md` (8,097 B / 1,326 w / ~2,009.5 `c/4` tok / ~1,763.6 `w*1.33` tok) + 5 `skills/*.md` (21,095 B / 3,331 w / ~5,271.2 `c/4` tok / ~4,430.2 `w*1.33` tok) + 4 `templates/generative-ui/*.html` (82,325 B / 9,074 w / ~20,575.5 `c/4` tok / ~12,068.4 `w*1.33` tok) = 111,517 B / 111,425 chars / 13,731 words / 2,362 lines (~27,856.2 `c/4` tok / ~18,262.2 `w*1.33` tok).
Impact: Because Claude Desktop Projects inline all Project Knowledge files when below the RAG threshold, every single turn—even a 2-question Turn 1 micro-prompt—pays ~18k–28k input tokens and exposes all five role personas simultaneously (increasing cross-phase instruction bleed).
Fix: For Claude Code and MCP-enabled Claude Desktop, keep templates and phase references on disk under `~/.claude/skills/vibecraft/` (or read via `vibecraft-filesystem` MCP on demand) rather than uploading 82,325 B of HTML into Project Knowledge; where Project Knowledge must be used without MCP, document the ~28k token cost and trim template whitespace/demo payloads.
Verify: Measure always-loaded Project Instructions + skill entrypoint size and confirm Turn 1 loads only `system_prompt.md` / `SKILL.md` (< 6,500 B after lazy-loading).
```

```
ID: PRM-30        Severity: medium
Where: system_prompt.md:97-125, skills/brand_artisan.md:22-59, skills/system_architect.md:33-53, skills/fullstack_builder.md:18-29, skills/qa_auditor.md:23-68
What: Always-loaded `system_prompt.md` (8,097 B; `SKILL.md` 8,504 B) embeds 1,699 B (21.0%) of Craft 12 and TypeScript/QA rules that are unused in Turn 1 / Phase 1 and duplicated across four role files (6,345 B of redundant rule text).
Evidence: `system_prompt.md:97-113` (`## 7. The Craft 12`: 1,042 B, 161 words, ~260.5 `c/4` tok / ~214.1 `w*1.33` tok) + `system_prompt.md:114-125` (`## 8. Code quality`: 657 B, 118 words, ~162.0 `c/4` tok / ~156.9 `w*1.33` tok) = 1,699 B / 279 words (~422.5 `c/4` tok / ~371.1 `w*1.33` tok) repeated in `brand_artisan.md:22-59` (2,217 B), `system_architect.md:33-53` (826 B), `fullstack_builder.md:18-29` (1,253 B), and `qa_auditor.md:23-68` (2,049 B).
Impact: Every turn pays ~371–423 tokens in `system_prompt.md`/`SKILL.md` for UI styling and TypeScript strictness rules before any UI or code phase begins, and maintaining Craft 12 / TS rules in 5 places directly caused the gradient and linter drift in `PRM-06` and `PRM-11`.
Fix: Move canonical Craft 12 + token rules into `references/craft-12.md` (loaded only in Phases 2 and 4) and canonical TypeScript/deslop rules into `references/code-quality.md` (loaded only in Phases 3 and 4), replacing `system_prompt.md:97-125` with a 3-line pointer (~220 B, saving ~1,480 B / ~370 `c/4` tokens on every turn and eliminating cross-file rule drift).
Verify: Confirm `system_prompt.md` drops below 6,650 B (~1,660 `c/4` tokens) and Craft 12 / TS rules each have a single canonical file under `references/`.
```

```
ID: PRM-31        Severity: medium
Where: skills/research_scout.md:1-4,49-71, skills/brand_artisan.md:1-4,22-53, skills/system_architect.md:1-4, skills/fullstack_builder.md:1-4, skills/qa_auditor.md:1-4, install.sh:212,221
What: The five phase files live under `skills/*.md` with unused AgentSkills YAML frontmatter (1,233 B) instead of `references/`, and inline static lookup catalogs (`Gotcha starter library`: 1,569 B) that should be lazy-loaded on demand.
Evidence: YAML frontmatter across the 5 `skills/*.md` files totals 1,233 B / 170 words / 25 lines (~308.2 `c/4` tok / ~226.1 `w*1.33` tok) even though `install.sh:212,221` nests them inside `~/.claude/skills/vibecraft/skills/` where Claude Code's skill loader ignores nested frontmatter (and if placed at top-level `~/.claude/skills/`, they would trigger standalone phases without `system_prompt.md`); `skills/research_scout.md:49-71` (`## Gotcha starter library`) alone is 1,569 B / 232 words / 23 lines (28.5% of `research_scout.md`, ~392.2 `c/4` tok / ~308.6 `w*1.33` tok) across 4 domains when any single project uses at most 1–2 domains.
Impact: Non-standard `skills/` nesting with `name:`/`description:` frontmatter violates AgentSkills progressive-disclosure layout (`SKILL.md` + `references/` + `assets/`/`templates/` + `scripts/`), wastes ~308 tokens of dead frontmatter, and loads irrelevant domain gotchas (e.g., macOS code-signing and WebAudio rules when scouting a Next.js content blog).
Fix: Relocate phase playbooks and domain catalogs to `references/` (`references/phase-1-scout.md`, `references/gotcha-library.md`, `references/phase-2-artisan.md`, `references/phase-3-architect.md`, `references/phase-4-builder.md`, `references/phase-4-auditor.md`), strip the unused YAML frontmatter from reference files, and update `system_prompt.md:3` and `install.sh:212,221` accordingly.
Verify: Confirm only the root `SKILL.md` carries AgentSkills YAML frontmatter, all phase/reference docs reside in `references/`, and `research_scout` shrinks by ~1,800 B (~33%).
```

```
ID: PRM-32        Severity: low
Where: templates/generative-ui/stack_matrix_artifact.html:148-191, templates/generative-ui/brand_studio_artifact.html:248-311, templates/generative-ui/qa_diff_artifact.html:195-271, templates/generative-ui/launchpad_artifact.html:132-263
What: Three of the four HTML templates embed 12,667 bytes (~3,167 `chars/4` tokens / ~2,350 `words*1.33` tokens) of single-project "Murmur / Voice memo app" demo data that Claude must read into context only to completely overwrite.
Evidence: Replaceable demo blocks measure: `stack_matrix_artifact.html:148-191` = 2,834 B / 394 w (~708.5 `c/4` tok / ~524.0 `w*1.33` tok); `qa_diff_artifact.html:195-271` = 3,538 B / 496 w (~884.2 `c/4` tok / ~659.7 `w*1.33` tok); `launchpad_artifact.html:132-263` = 6,295 B / 877 w (~1,573.8 `c/4` tok / ~1,166.4 `w*1.33` tok) — 12,667 B / 1,767 words total (plus 3,312 B / 345 w for `THEMES` in `brand_studio_artifact.html:248-311`, totaling 15,979 B / 2,112 words / ~3,994.5 `c/4` tok / ~2,809.0 `w*1.33` tok across all 4 data blocks).
Impact: Reading `launchpad_artifact.html` twice (Phase 3 draft + Phase 4 final) plus `stack_matrix` and `qa_diff` wastes ~4,740 `chars/4` input tokens on "Murmur" voice-memo sample copy and risks domain-bleed ("Murmur", "voice memo") into unrelated builds if a field is overlooked.
Fix: Replace the verbose "Murmur" demo payloads in the production templates under `templates/generative-ui/` with minimal 1-item schema stubs (~600 B total, saving ~12 KB per full pipeline run), and move the full "Murmur" populated demo HTML snapshots to `examples/` or `tests/fixtures/` for visual testing.
Verify: Confirm `templates/generative-ui/*.html` retain valid rendering with compact schema stubs, `node tests/audit_rules_test.js` passes, and full-run template read tokens drop by ~3,000 `chars/4` tokens.
```
