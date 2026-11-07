'use strict';

/**
 * Verifies that all relative Markdown links and embedded image paths across
 * repository documentation resolve to real files on disk.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..');

const DOC_TARGETS = [
  'README.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  'docs',
  'skills',
  'commands',
  'tests/test_scenarios.md',
];

function collectMarkdownFiles(relTarget) {
  const full = path.join(REPO_ROOT, relTarget);
  if (!fs.existsSync(full)) return [];
  const stat = fs.statSync(full);
  if (stat.isFile()) return full.endsWith('.md') ? [full] : [];
  return fs
    .readdirSync(full)
    .flatMap((entry) => collectMarkdownFiles(path.join(relTarget, entry)));
}

function stripCodeBlocksAndSpans(md) {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]+`/g, '');
}

test('all relative markdown links and image assets resolve cleanly on disk', () => {
  const mdFiles = DOC_TARGETS.flatMap(collectMarkdownFiles);
  assert.ok(mdFiles.length >= 20, `Expected >= 20 markdown files, found ${mdFiles.length}`);

  const broken = [];
  const linkRe = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const file of mdFiles) {
    const raw = fs.readFileSync(file, 'utf8');
    const clean = stripCodeBlocksAndSpans(raw);
    let m;
    while ((m = linkRe.exec(clean)) !== null) {
      const rawHref = m[1].trim().split(/\s+/)[0];
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        /^(?:https?|mailto|file|conversation):/i.test(rawHref)
      ) {
        continue;
      }
      const withoutHash = rawHref.split('#')[0];
      if (!withoutHash) continue;

      const resolved = path.resolve(path.dirname(file), withoutHash);
      if (!fs.existsSync(resolved)) {
        broken.push(`${path.relative(REPO_ROOT, file)} -> ${rawHref}`);
      }
    }
  }

  assert.deepEqual(broken, [], `Broken relative links:\n  ${broken.join('\n  ')}`);
});
