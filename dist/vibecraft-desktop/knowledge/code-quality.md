# Code Quality, Anti-Slop, and QA Stamp Contract

Phase 3 (System Architect) and Phase 4 (Full-Stack Builder + QA Auditor) enforce these mechanical code and prose rules.

## 1. TypeScript and Runtime Safety (`VC011`..`VC018`)

1. **Strict types (`VC011`, `VC012`):** Compile under `"strict": true`. Zero `: any`, `as any`, `as unknown as`, or `<any>`. Every exported function, async handler, and custom hook declares an explicit parameter and return type. When the user selects a non-TypeScript stack (Rust, Python, Go, SQL), apply the language's strictest native checker (`cargo check`, `ruff`/`mypy`, `go vet`) and set `LAUNCH.contractsLang` accordingly.
2. **Typed error boundaries (`VC013`):** Return discriminated unions (`{ ok: true; data: T } | { ok: false; error: AppError }`) across I/O boundaries. Empty `catch {}` blocks and swallowed errors fail `VC013`.
3. **Clean module graph (`VC014`, `VC015`):** Remove leftover `console.log` and `console.debug` calls from UI and library code (`VC014`), and delete unreferenced named exports (`VC015`).
4. **Zero placeholders or secrets (`VC016`, `VC018`):** Zero stub markers (`TODO`, `FIXME`, `HACK`, `XXX`, `implement me`) and zero hardcoded API keys, tokens, or PEM blocks (`VC018`). Read credentials from `process.env` or runtime secret stores only.
5. **Auditable suppressions (`VC000`):** Any inline suppression must carry a concrete reason: `// vibecraft-ignore VC001: canvas pixel buffer palette`. Bare ignores without `: <reason>` fail `VC000`.

## 2. Deslop Categories (Phase 4 Scrub)

Every automated or manual repair recorded in `qa_diff_artifact.html` uses one of eight canonical `category` keys:

- `comments`: Delete narrating comments that restate the next line (`// increment count`, `// render button`). Keep comments only when documenting a non-obvious invariant, browser quirk, or `[Gotcha]` mitigation (`VC017`).
- `defensive`: Remove redundant runtime guards that TypeScript types already guarantee inside trusted internal call sites; keep schema validation at external I/O boundaries.
- `types`: Replace widened types, `any` casts, and missing return annotations with exact domain types.
- `helpers`: Inline one-line pass-through wrappers called once unless they isolate an external dependency.
- `tokens`: Replace hardcoded hex/RGB/Tailwind palette classes with `var(--token)` references.
- `placeholder`: Replace stub strings, sample names, and unfinished handlers with working domain logic.
- `style`: Match file naming, import order, and component patterns across the repository.
- `prose`: Rewrite user-facing copy and chat lines in active voice. Cut filler openers (`Great question`, `Certainly`, `Let's dive in`), cut vague intensifiers (`seamless`, `cutting-edge`, `robust`), and avoid em dashes.

## 3. Honest QA Stamp Contract

The Phase 4 footer stamp reports measured results only:

```text
✓ VibeCraft QA · [Syntax: 0 Errors] · [Tokens: 100% Validated] · [Slop: Scrubbed]
```

- **Syntax slot:** Run the real compiler/checker (`tsc --noEmit`, `node --check`, `cargo check`) whenever shell execution is available. If execution is unavailable (for example in Claude Desktop without shell access), set `REPORT.syntax.checker = "not run"` and print `[Syntax: Not Run]` with prefix `! VibeCraft QA`. Never print `[Syntax: 0 Errors]` when no checker ran.
- **Tokens slot:** Compute `(styledLines - hardcodedViolations) / styledLines * 100` across non-token source files using `scripts/audit/cli.js`.
- **Slop slot:** Count remaining open findings (`REPORT.openSlop + REPORT.openGotchas`). Print `[Slop: Scrubbed]` only when `0` open items remain; otherwise print `[Slop: <N> Remaining]`.
