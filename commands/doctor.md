---
description: Run VibeCraft's environment and plugin health check (Node, npx, uvx, manifests, skills, templates, MCP pins, and Claude Desktop config syntax) with exact fix commands.
---

Run the VibeCraft diagnostic script and present a concise pass/fail summary:

1. Execute `node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs" --json` (falling back to `node ./scripts/doctor.mjs --json` when invoked from a repository checkout).
2. Display the pass/warn/fail table concisely and list the exact remediation command for any warning or failure. Keep prose `<= 5` lines.
