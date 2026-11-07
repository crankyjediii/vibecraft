#!/usr/bin/env bash
# VibeCraft cross-platform installer for macOS and Linux (Bash 3.2+ compatible).
#
# Configures pinned MCP servers in Claude Desktop (`claude_desktop_config.json`)
# and installs the progressive-loading standalone skill bundle (`~/.claude/skills/vibecraft`).
# For Claude Code native plugin installs, run inside Claude Code:
#   /plugin install vibecraft --marketplace crankyjediii/vibecraft

set -euo pipefail
umask 077

YES=0
DRY_RUN=0
UNINSTALL=0
CHECK=0
NO_DESKTOP=0
NO_CLI=0
WORKSPACE_DIR=""

usage() {
  cat <<'EOF'
Usage: ./install.sh [options]

Options:
  -y, --yes              Run non-interactively using safe defaults
      --dry-run          Preview planned changes without writing files
      --check            Verify installation health and exit 0 (ok) or 1 (missing/invalid)
      --uninstall        Remove vibecraft-* MCP entries and ~/.claude/skills/vibecraft
      --no-desktop       Skip Claude Desktop claude_desktop_config.json merge
      --no-cli           Skip standalone ~/.claude/skills/vibecraft installation
      --workspace <dir>  Workspace directory exposed to vibecraft-filesystem MCP
  -h, --help             Show this help text

Environment overrides:
  CLAUDE_DESKTOP_CONFIG    Custom path to claude_desktop_config.json
  CLAUDE_SKILLS_DIR        Custom base directory for standalone skills
  VIBECRAFT_WORKSPACE_DIR  Default workspace folder (default: $HOME/Projects)
  VIBECRAFT_TARBALL_URL    Release tarball URL when piped via curl | bash
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -y|--yes)
      YES=1
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    --uninstall)
      UNINSTALL=1
      ;;
    --check)
      CHECK=1
      ;;
    --no-desktop)
      NO_DESKTOP=1
      ;;
    --no-cli)
      NO_CLI=1
      ;;
    --workspace)
      if [ "$#" -lt 2 ] || [ -z "${2:-}" ]; then
        printf 'Error: --workspace requires a directory path.\n' >&2
        exit 1
      fi
      WORKSPACE_DIR="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Error: unknown option "%s". Run with --help for usage.\n' "$1" >&2
      exit 1
      ;;
  esac
  shift
done

if [ "$NO_DESKTOP" -eq 1 ] && [ "$NO_CLI" -eq 1 ]; then
  printf 'Nothing selected (--no-desktop and --no-cli both passed).\n'
  exit 0
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'Error: Node.js (>= 18) is required on PATH. Install from https://nodejs.org\n' >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || printf '0')"
if [ "${NODE_MAJOR:-0}" -lt 18 ]; then
  printf 'Error: Node.js >= 18 is required (found %s).\n' "$(node -v 2>/dev/null || printf 'unknown')" >&2
  exit 1
fi

TMP_FETCH_DIR=""
cleanup() {
  if [ -n "$TMP_FETCH_DIR" ] && [ -d "$TMP_FETCH_DIR" ]; then
    rm -rf "$TMP_FETCH_DIR"
  fi
}
trap cleanup EXIT INT TERM

# Resolve repository root safely even when piped via `curl -fsSL ... | bash` (`SEC-08`)
SCRIPT_SOURCE="${BASH_SOURCE[0]:-}"
REPO_DIR=""
if [ -n "$SCRIPT_SOURCE" ] && [ -f "$SCRIPT_SOURCE" ]; then
  CANDIDATE_DIR="$(cd "$(dirname "$SCRIPT_SOURCE")" && pwd)"
  if [ -f "$CANDIDATE_DIR/scripts/lib/installer-core.mjs" ] && [ -f "$CANDIDATE_DIR/claude_desktop_config.json" ]; then
    REPO_DIR="$CANDIDATE_DIR"
  fi
fi

if [ -z "$REPO_DIR" ]; then
  if ! command -v curl >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
    printf 'Error: curl and tar are required when running install.sh without a local repository checkout.\n' >&2
    exit 1
  fi
  TARBALL_URL="${VIBECRAFT_TARBALL_URL:-https://github.com/crankyjediii/vibecraft/archive/refs/tags/v1.0.0.tar.gz}"
  TMP_FETCH_DIR="$(mktemp -d "${TMPDIR:-/tmp}/vibecraft-install.XXXXXXXX")"
  chmod 700 "$TMP_FETCH_DIR"
  printf 'Downloading VibeCraft bundle from %s ...\n' "$TARBALL_URL"
  curl -fsSL "$TARBALL_URL" -o "$TMP_FETCH_DIR/vibecraft.tar.gz"
  tar -xzf "$TMP_FETCH_DIR/vibecraft.tar.gz" -C "$TMP_FETCH_DIR"
  for d in "$TMP_FETCH_DIR"/*; do
    if [ -d "$d" ] && [ -f "$d/scripts/lib/installer-core.mjs" ]; then
      REPO_DIR="$d"
      break
    fi
  done
  if [ -z "$REPO_DIR" ]; then
    printf 'Error: downloaded archive did not contain scripts/lib/installer-core.mjs.\n' >&2
    exit 1
  fi
fi

# Confirm interactively only when mutating state without --yes and attached to a TTY
if [ "$YES" -eq 0 ] && [ "$DRY_RUN" -eq 0 ] && [ "$CHECK" -eq 0 ]; then
  ACTION_LABEL="install VibeCraft"
  if [ "$UNINSTALL" -eq 1 ]; then
    ACTION_LABEL="uninstall VibeCraft"
  fi
  if [ -t 0 ]; then
    printf 'Proceed to %s? [Y/n] ' "$ACTION_LABEL"
    read -r REPLY || REPLY=""
    case "$REPLY" in
      ""|[Yy]|[Yy][Ee][Ss])
        ;;
      *)
        printf 'Aborted.\n'
        exit 0
        ;;
    esac
  else
    printf 'Non-interactive stdin detected without --yes; proceeding only if --yes is supplied.\n' >&2
    printf 'Re-run with "--yes" (for example: curl -fsSL ... | bash -s -- --yes).\n' >&2
    exit 1
  fi
fi

CORE_ARGS=(--repo-root "$REPO_DIR")
if [ "$DRY_RUN" -eq 1 ]; then
  CORE_ARGS+=(--dry-run)
fi
if [ "$UNINSTALL" -eq 1 ]; then
  CORE_ARGS+=(--uninstall)
fi
if [ "$CHECK" -eq 1 ]; then
  CORE_ARGS+=(--check)
fi
if [ "$NO_DESKTOP" -eq 1 ]; then
  CORE_ARGS+=(--no-desktop)
fi
if [ "$NO_CLI" -eq 1 ]; then
  CORE_ARGS+=(--no-cli)
fi
if [ -n "$WORKSPACE_DIR" ]; then
  CORE_ARGS+=(--workspace "$WORKSPACE_DIR")
fi

node "$REPO_DIR/scripts/lib/installer-core.mjs" "${CORE_ARGS[@]}"

if [ "$CHECK" -eq 0 ] && [ "$UNINSTALL" -eq 0 ] && [ "$DRY_RUN" -eq 0 ]; then
  if ! command -v uvx >/dev/null 2>&1; then
    printf 'Note: optional "uvx" CLI not found on PATH (needed only for vibecraft-fetch MCP server).\n'
    printf '      Install uv later if desired: curl -LsSf https://astral.sh/uv/install.sh | sh\n'
  fi
  printf 'Note: set BRAVE_API_KEY in your shell environment if you use vibecraft-brave-search.\n'
  printf 'Done. Run "node scripts/doctor.mjs" (or "/vibecraft:doctor" in Claude Code) to verify.\n'
fi
