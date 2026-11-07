# Support

## 1. Run Self-Diagnostics First

Before opening an issue, run the built-in diagnostic check:

```bash
node scripts/doctor.mjs
```

Or check installer status without modifying files:

```bash
bash install.sh --check
```

On Windows PowerShell:

```powershell
pwsh -ExecutionPolicy Bypass -File .\install.ps1 -Check
```

## 2. Documentation Index

- **Quickstart & Troubleshooting:** [README.md](README.md)
- **Documentation Hub:** [docs/index.md](docs/index.md)
- **User Interaction Guide:** [docs/interaction_guide.md](docs/interaction_guide.md)
- **Audit Rule Catalog (`VC000`..`VC018`):** [docs/rules.md](docs/rules.md)
- **Skill Authoring Guide:** [docs/skill-authoring.md](docs/skill-authoring.md)

## 3. Opening an Issue

Use the matching structured template on GitHub Issues (`https://github.com/crankyjediii/vibecraft/issues/new/choose`):

- **Bug Report:** installer errors, broken HTML artifacts, Audit Engine false positives, or CLI crashes. Paste `node scripts/doctor.mjs --json` output (redact any paths you prefer to keep private).
- **Skill Quality Regression:** phase-skipping, verbose replies, weak stack/gotcha recommendations, or contrast issues in generated output.
- **Feature Request:** new domain archetypes, Brand Studio themes, or static audit rules.

For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
