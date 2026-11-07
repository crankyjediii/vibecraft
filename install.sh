#!/usr/bin/env bash
# VibeCraft installer for macOS and Linux.
# Merges the VibeCraft MCP servers into Claude Desktop's config and installs the
# VibeCraft skill into Claude Code (~/.claude/skills/vibecraft).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)-$$"

ASSUME_YES=0
DRY_RUN=0
DO_DESKTOP=1
DO_CLI=1

usage() {
  cat <<'USAGE'
Usage: ./install.sh [options]

  -y, --yes        Accept defaults, never prompt (backups on, ~/Projects used)
      --dry-run    Show what would change and write nothing
      --no-desktop Skip the Claude Desktop MCP config merge
      --no-cli     Skip the Claude Code skill install
  -h, --help       Show this help

Environment overrides:
  CLAUDE_DESKTOP_CONFIG    Path to claude_desktop_config.json
  CLAUDE_SKILLS_DIR        Claude Code skills directory (default ~/.claude/skills)
  VIBECRAFT_PROJECTS_DIR   Folder the filesystem server may access (default ~/Projects)
  BRAVE_API_KEY            Enables the Brave Search server without a prompt
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    -y|--yes) ASSUME_YES=1 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-desktop) DO_DESKTOP=0 ;;
    --no-cli) DO_CLI=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 64 ;;
  esac
  shift
done

say() { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

ask_yes() {
  local question="$1" default="$2" reply
  if [ "$ASSUME_YES" -eq 1 ] || [ ! -t 0 ]; then
    [ "$default" = "y" ]
    return
  fi
  read -r -p "$question " reply || reply=""
  reply="${reply:-$default}"
  case "$reply" in
    [Yy]*) return 0 ;;
    *) return 1 ;;
  esac
}

[ -n "${HOME:-}" ] || die "HOME is not set."

case "$(uname -s)" in
  Darwin) DEFAULT_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json" ;;
  Linux) DEFAULT_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/Claude/claude_desktop_config.json" ;;
  *) die "Unsupported OS: $(uname -s). Use macOS or Linux, or follow the manual steps in README.md." ;;
esac

CONFIG_PATH="${CLAUDE_DESKTOP_CONFIG:-$DEFAULT_CONFIG}"
SKILLS_ROOT="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
SKILL_DEST="$SKILLS_ROOT/vibecraft"

for required in system_prompt.md claude_desktop_config.json skills templates/generative-ui; do
  [ -e "$SCRIPT_DIR/$required" ] || die "Missing $required next to install.sh. Run it from a complete copy of the repo."
done

say "VibeCraft installer"
say "  OS:              $(uname -s)"
say "  Desktop config:  $CONFIG_PATH"
say "  Claude Code dir: $SKILL_DEST"
[ "$DRY_RUN" -eq 1 ] && say "  Mode:            dry run, nothing will be written"
say ""

DESKTOP_RESULT="skipped"
CLI_RESULT="skipped"
BACKUP_PATH=""
BRAVE_STATE="not configured"

if [ "$DO_DESKTOP" -eq 1 ]; then
  command -v node >/dev/null 2>&1 || die "Node.js 18 or newer is required to merge the Desktop config. Install it from https://nodejs.org and re-run."
  command -v npx >/dev/null 2>&1 || warn "npx not found: the filesystem and Brave servers will not start until Node.js is installed."
  command -v uvx >/dev/null 2>&1 || warn "uvx not found: the fetch server needs uv (macOS: brew install uv; Linux: https://docs.astral.sh/uv/)."

  PROJECTS_DIR="${VIBECRAFT_PROJECTS_DIR:-$HOME/Projects}"
  if [ -z "${VIBECRAFT_PROJECTS_DIR:-}" ] && [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; then
    read -r -p "Folder Claude may read and write [$PROJECTS_DIR]: " reply || reply=""
    PROJECTS_DIR="${reply:-$PROJECTS_DIR}"
  fi
  case "$PROJECTS_DIR" in
    "~") PROJECTS_DIR="$HOME" ;;
    "~/"*) PROJECTS_DIR="$HOME/${PROJECTS_DIR#"~/"}" ;;
  esac
  case "$PROJECTS_DIR" in
    /*) ;;
    *) die "Folder must be an absolute path: $PROJECTS_DIR" ;;
  esac
  if [ ! -d "$PROJECTS_DIR" ]; then
    if ask_yes "$PROJECTS_DIR does not exist. Create it? [Y/n]" y; then
      [ "$DRY_RUN" -eq 1 ] && say "[dry run] would create $PROJECTS_DIR" || mkdir -p "$PROJECTS_DIR"
    else
      warn "The filesystem server will fail to start until $PROJECTS_DIR exists."
    fi
  fi

  BRAVE_KEY="${BRAVE_API_KEY:-}"
  if [ -z "$BRAVE_KEY" ] && [ "$ASSUME_YES" -eq 0 ] && [ -t 0 ]; then
    read -r -s -p "Brave Search API key for live research (Enter to skip): " BRAVE_KEY || BRAVE_KEY=""
    printf '\n'
  fi
  [ -n "$BRAVE_KEY" ] && BRAVE_STATE="configured" || BRAVE_STATE="skipped (no key)"

  if [ -f "$CONFIG_PATH" ]; then
    if ask_yes "Back up the existing Claude Desktop config first? [Y/n]" y; then
      BACKUP_PATH="$CONFIG_PATH.bak-$TIMESTAMP"
      if [ "$DRY_RUN" -eq 1 ]; then
        say "[dry run] would copy config to $BACKUP_PATH"
      else
        cp -p "$CONFIG_PATH" "$BACKUP_PATH"
        say "Backed up to $BACKUP_PATH"
      fi
    else
      warn "Continuing without a backup."
    fi
  fi

  MERGE_JS="$(mktemp "${TMPDIR:-/tmp}/vibecraft-merge.XXXXXX")"
  trap 'rm -f "$MERGE_JS"' EXIT
  cat > "$MERGE_JS" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [templatePath, targetPath, projectsDir, dryRun] = process.argv.slice(2);
const braveKey = process.env.VC_BRAVE_KEY || '';

const expand = (text) =>
  text.replace(/\$\{(\w+)\}/g, (_, name) => (name === 'BRAVE_API_KEY' ? braveKey : process.env[name] || ''));

const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
let current = {};
if (fs.existsSync(targetPath)) {
  const raw = fs.readFileSync(targetPath, 'utf8');
  if (raw.trim()) {
    try {
      current = JSON.parse(raw);
    } catch (error) {
      console.error('Existing config is not valid JSON, left untouched: ' + targetPath);
      process.exit(2);
    }
  }
}
if (typeof current !== 'object' || current === null || Array.isArray(current)) {
  console.error('Existing config is not a JSON object, left untouched: ' + targetPath);
  process.exit(2);
}

const servers = { ...(current.mcpServers || {}) };
const added = [];
const skipped = [];
for (const [name, def] of Object.entries(template.mcpServers)) {
  const env = def.env ? Object.fromEntries(Object.entries(def.env).map(([k, v]) => [k, expand(v)])) : undefined;
  if (env && Object.values(env).some((v) => v === '')) {
    skipped.push(name);
    continue;
  }
  const args = (def.args || []).map((arg) => (arg === '${HOME}/Projects' ? projectsDir : expand(arg)));
  servers[name] = env ? { ...def, args, env } : { ...def, args };
  added.push(name);
}

const out = JSON.stringify({ ...current, mcpServers: servers }, null, 2) + '\n';
if (dryRun === '1') {
  console.log(braveKey ? out.split(braveKey).join('***') : out);
} else {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = targetPath + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, out, { mode: 0o600 });
  fs.renameSync(tmp, targetPath);
}
console.log('MERGED ' + added.join(','));
console.log('SKIPPED ' + skipped.join(','));
NODE
  MERGE_OUT="$(VC_BRAVE_KEY="$BRAVE_KEY" node "$MERGE_JS" "$SCRIPT_DIR/claude_desktop_config.json" "$CONFIG_PATH" "$PROJECTS_DIR" "$DRY_RUN")" || die "Could not merge the Desktop config. Nothing was changed${BACKUP_PATH:+; backup is at $BACKUP_PATH}."

  printf '%s\n' "$MERGE_OUT" | grep -v -e '^MERGED ' -e '^SKIPPED ' || true
  MERGED_LIST="$(printf '%s\n' "$MERGE_OUT" | sed -n 's/^MERGED //p')"
  DESKTOP_RESULT="servers: ${MERGED_LIST:-none}"
fi

if [ "$DO_CLI" -eq 1 ]; then
  case "$SKILL_DEST" in
    */vibecraft) ;;
    *) die "Refusing to manage unexpected skill path: $SKILL_DEST" ;;
  esac
  if [ "$DRY_RUN" -eq 1 ]; then
    say "[dry run] would install the skill to $SKILL_DEST"
  else
    if [ -e "$SKILL_DEST" ]; then
      mv "$SKILL_DEST" "$SKILL_DEST.bak-$TIMESTAMP"
      say "Moved the previous install to $SKILL_DEST.bak-$TIMESTAMP"
    fi
    mkdir -p "$SKILL_DEST/skills" "$SKILL_DEST/templates/generative-ui" "$SKILL_DEST/tests"
    {
      printf '%s\n' '---'
      printf '%s\n' 'name: vibecraft'
      printf '%s\n' 'description: Autonomous vibecoding studio. Use when the user wants to build an app or product from an idea ("build me ...", "vibecode ..."), or asks for a stack comparison, brand and theme picker, architecture diagrams, or a QA audit. Runs a 4-phase gated pipeline (Scout, Artisan, Architect, Builder and Auditor), replies in at most 5 lines, and puts everything else in artifacts.'
      printf '%s\n' '---'
      printf '\n'
      cat "$SCRIPT_DIR/system_prompt.md"
    } > "$SKILL_DEST/SKILL.md"
    cp "$SCRIPT_DIR"/skills/*.md "$SKILL_DEST/skills/"
    cp "$SCRIPT_DIR"/templates/generative-ui/*.html "$SKILL_DEST/templates/generative-ui/"
    cp "$SCRIPT_DIR/tests/audit_rules_test.js" "$SKILL_DEST/tests/"
  fi
  CLI_RESULT="$SKILL_DEST"
fi

say ""
say "VibeCraft install summary"
say "  Claude Desktop MCP config: $DESKTOP_RESULT"
[ -n "$BACKUP_PATH" ] && say "  Config backup:             $BACKUP_PATH"
say "  Brave Search:              $BRAVE_STATE"
say "  Claude Code skill:         $CLI_RESULT"
say ""
say "Next steps"
say "  1. Restart Claude Desktop so it loads the MCP servers."
say "  2. Claude Desktop: create a Project, paste system_prompt.md into its Instructions,"
say "     and upload skills/*.md and templates/generative-ui/*.html to Project Knowledge."
say "  3. Claude Code: start a session and describe an app, or type /vibecraft."
say "  4. Check the rules locally any time with: node tests/audit_rules_test.js"
[ "$DRY_RUN" -eq 1 ] && say "  (dry run: no files were written)"
exit 0
