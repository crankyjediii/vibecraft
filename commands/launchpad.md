---
description: Generate architecture Mermaid diagrams, strict domain type contracts, geometric SVG emblem, and operator runbook for an existing project in vibecraft/04-launchpad.html.
argument-hint: "[project-path]"
---

Generate a standalone **VibeCraft Launchpad** (`${CLAUDE_PLUGIN_ROOT}/skills/system-architect/SKILL.md` + `fullstack-builder` Launchpad assembly) for `${ARGUMENTS:-.}`:

1. Inspect the workspace directory tree, entrypoints, database/storage adapters, and public interfaces.
2. Build accurate `LAUNCH.tree`, quoted Mermaid `LAUNCH.flow` (`<= 12` nodes) and `LAUNCH.sequence`, strict `LAUNCH.contracts` (matching the repo's language via `LAUNCH.contractsLang`), runbook `LAUNCH.readme` + `LAUNCH.commands`, and a 2-to-5-primitive geometric `<svg viewBox="0 0 64 64">` in `LAUNCH.logo`.
3. Populate `${CLAUDE_PLUGIN_ROOT}/templates/generative-ui/launchpad_artifact.html`, write `vibecraft/04-launchpad.html`, and reply with the 3-line HUD plus `1 to 3` prose lines naming the output path and key architectural boundary.
