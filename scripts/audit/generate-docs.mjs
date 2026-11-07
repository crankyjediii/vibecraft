#!/usr/bin/env node
/**
 * Deterministically generates `docs/rules.md` from `scripts/audit/rules.js` (`RULES_META`).
 * Supports `--check` in CI to verify zero documentation drift.
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { RULES_META } = require('./rules.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const TARGET_DOC = path.join(ROOT_DIR, 'docs', 'rules.md');

export function renderRulesMarkdown() {
  const lines = [
    '<!-- Generated from scripts/audit/rules.js by scripts/audit/generate-docs.mjs; do not edit directly. -->',
    '',
    '# VibeCraft Audit Engine v2 Rule Reference',
    '',
    'Run the zero-dependency analyzer locally or in CI:',
    '',
    '```bash',
    'node scripts/audit/cli.js [paths...] [--json] [--sarif] [--fix] [--min-severity warning|error]',
    '```',
    '',
    '- **Exit codes:** `0` clean, `1` findings detected, `2` invalid CLI usage.',
    '- **Inline suppression:** `// vibecraft-ignore VC001: <concrete technical reason>` (bare suppressions without `: <reason>` fail `VC000`).',
    '',
    '## Rule Summary Matrix',
    '',
    '| ID | Slug | Default Severity | `--fix` | File Kinds |',
    '|---|---|---|---|---|',
  ];

  for (const r of RULES_META) {
    lines.push(
      `| \`${r.id}\` | \`${r.slug}\` | \`${r.severity}\` | ${r.fixable ? 'Yes' : 'No'} | ${r.kinds.map((k) => `\`${k}\``).join(', ')} |`
    );
  }

  lines.push('', '## Detailed Rule Specifications', '');
  for (const r of RULES_META) {
    lines.push(`### \`${r.id}\` · \`${r.slug}\``);
    lines.push('');
    lines.push(`- **Severity:** \`${r.severity}\``);
    lines.push(`- **Auto-fixable (\`--fix\`):** ${r.fixable ? 'Yes' : 'No'}`);
    lines.push(`- **Applies to:** ${r.kinds.map((k) => `\`${k}\``).join(', ')}`);
    lines.push(`- **What it checks:** ${r.summary}`);
    lines.push(`- **How to fix:** ${r.remediation}`);
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const expected = renderRulesMarkdown();

  if (checkOnly) {
    if (!fs.existsSync(TARGET_DOC)) {
      process.stderr.write('docs/rules.md is missing. Run `node scripts/audit/generate-docs.mjs`.\n');
      process.exit(1);
    }
    const actual = fs.readFileSync(TARGET_DOC, 'utf8').replace(/\r\n/g, '\n');
    if (actual !== expected) {
      process.stderr.write('docs/rules.md is out of sync with scripts/audit/rules.js. Run `node scripts/audit/generate-docs.mjs`.\n');
      process.exit(1);
    }
    process.stdout.write('docs/rules.md --check passed.\n');
    process.exit(0);
  }

  fs.mkdirSync(path.dirname(TARGET_DOC), { recursive: true });
  fs.writeFileSync(TARGET_DOC, expected, 'utf8');
  process.stdout.write(`Generated ${path.relative(ROOT_DIR, TARGET_DOC)} (${RULES_META.length} rules).\n`);
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)) {
  main();
}
