# VibeCraft for Claude Desktop

Choose one of two setup paths depending on how you use Claude Desktop:

## Option A (Recommended): Upload Custom Skill Archive (Progressive Loading)

1. Open **Claude Desktop -> Settings -> Capabilities -> Skills**.
2. Click **Upload skill** and select `vibecraft-skill.zip` from this folder.
3. Optional local MCP tools: run `./install.sh` (macOS/Linux) or `.\install.ps1` (Windows) from the repository root to register `vibecraft-filesystem`, `vibecraft-brave-search`, and `vibecraft-fetch`.

Why Option A wins: Claude loads `vibecraft/SKILL.md` (~1.5k tokens) first and reads `references/*.md` and `templates/*.html` on demand instead of paying ~25k tokens on every turn.

## Option B: Dedicated Claude Project

1. Create a Project named **VibeCraft** and paste `PROJECT_INSTRUCTIONS.md` into **Project Instructions**.
2. Upload the playbooks from `knowledge/` (and any HTML templates from `../../templates/generative-ui/` you want rendered without local MCP filesystem access).
