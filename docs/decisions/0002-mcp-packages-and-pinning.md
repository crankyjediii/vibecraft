# ADR 0002: Exact MCP Version Pinning, Scoped Filesystem Access, and Environment Secret References

- **Status:** Accepted
- **Date:** 2026-11-06

## Context

The v0.1 prototype configured MCP servers using unpinned `npx -y @modelcontextprotocol/server-filesystem`, deprecated `@modelcontextprotocol/server-brave-search`, unpinned `uvx mcp-server-fetch`, broad `$HOME/Projects` root access, and plaintext `BRAVE_API_KEY` prompts written into `claude_desktop_config.json` (`SEC-01`, `SEC-05`, `SEC-06`, `SEC-07`).

## Options Considered

1. **Floating `@latest` tags via `npx -y` / `uvx`:** Zero maintenance, but exposes every session start to registry supply-chain compromise and upstream breaking changes.
2. **Vendor full MCP server node_modules in git:** Bloats repository size by dozens of megabytes and complicates native platform dependencies.
3. **Pin exact verified package versions, scope Claude Code filesystem to `.`, and reference secrets exclusively via `${BRAVE_API_KEY}`:** Deterministic package resolution with Dependabot monitoring, narrow directory scope, and `0600` file permissions on Desktop configs and backups.

## Decision

Adopt Option 3:
- `@modelcontextprotocol/server-filesystem@2.2.0` (scoped to `.` in `.mcp.json` and `${VIBECRAFT_WORKSPACE_DIR}` in Desktop config).
- `@brave/brave-search-mcp-server@2.1.4` (official replacement for deprecated `@modelcontextprotocol/server-brave-search@0.6.2`), referencing `"BRAVE_API_KEY": "${BRAVE_API_KEY}"` without ever writing plaintext keys to disk.
- `uvx --from mcp-server-fetch==2026.11.4 mcp-server-fetch`.

## Consequences

- **Positive:** Eliminates floating install-time version drift and plaintext credential persistence; `scripts/doctor.mjs` enforces version pins and secret-reference syntax automatically.
- **Negative / Trade-off:** Maintainers must bump pinned MCP versions deliberately during releases (verified in `docs/release-process.md`).
