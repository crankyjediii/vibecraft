'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/;
const TOKEN_DECLARATION = /^\s*--[\w-]+\s*:/;
const TOKEN_BLOCK_START = /@tokens:start/;
const TOKEN_BLOCK_END = /@tokens:end/;

const RULES = [
  { id: 'hardcoded-color', test: (l) => COLOR_REGEX.test(l), kinds: ['css', 'html', 'js', 'ts'] },
  { id: 'placeholder', test: (l) => /(\/\/|\/\*|<!--)\s*(TODO|FIXME|XXX|HACK)\b|lorem ipsum|john doe|implement me|your code here|rest of (the )?code/i.test(l), kinds: ['css', 'html', 'js', 'ts', 'sh'] },
  { id: 'type-laundering', test: (l) => /\bas any\b|\bas unknown as\b|:\s*any\b|<any>/.test(l), kinds: ['ts'] },
  { id: 'comment-slop', test: (l) => /\/\/\s*(increment|decrement|loop through|iterate over|return the|set the|call the)\b/i.test(l), kinds: ['js', 'ts'] },
  { id: 'transition-all', test: (l) => /transition(-property)?\s*:\s*all\b/.test(l) || /\btransition-all\b/.test(l), kinds: ['css', 'html'] },
  { id: 'gradient', test: (l) => /(linear|radial|conic)-gradient\(/.test(l) || /\bbg-gradient-to-/.test(l), kinds: ['css', 'html'] },
  { id: 'z-index-arms-race', test: (l) => /z-index\s*:\s*\d{4,}/.test(l), kinds: ['css', 'html'] },
  { id: 'missing-return-type', test: (l) => hasUntypedExport(l), kinds: ['ts'] },
];

// shortcut: single-line signatures only; multi-line signatures with nested parens are not seen. Upgrade to the TypeScript compiler API if that matters.
function hasUntypedExport(line) {
  const fn = /export\s+(?:default\s+)?(?:async\s+)?function\s+\w*\s*(?:<[^>]*>)?\s*\([^)]*\)\s*\{/;
  const arrow = /export\s+const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/;
  return fn.test(line) || arrow.test(line);
}

function kindOf(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return 'ts';
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'jsx') return 'js';
  if (ext === 'css') return 'css';
  if (ext === 'html') return 'html';
  if (ext === 'sh') return 'sh';
  return 'other';
}

function audit(source, filename = 'input.ts') {
  const kind = kindOf(filename);
  const findings = [];
  let inTokenBlock = false;
  source.split('\n').forEach((text, index) => {
    if (TOKEN_BLOCK_START.test(text)) inTokenBlock = true;
    const exempt = inTokenBlock || TOKEN_DECLARATION.test(text);
    if (TOKEN_BLOCK_END.test(text)) inTokenBlock = false;
    for (const rule of RULES) {
      if (!rule.kinds.includes(kind)) continue;
      if (rule.id === 'hardcoded-color' && exempt) continue;
      if (rule.test(text)) findings.push({ rule: rule.id, line: index + 1, text: text.trim() });
    }
  });
  return findings;
}

function tokenScore(source, filename) {
  const lines = source.split('\n').filter((l) => /color|background|border|fill|stroke|shadow/i.test(l)).length;
  const bad = audit(source, filename).filter((f) => f.rule === 'hardcoded-color').length;
  return lines === 0 ? 100 : Math.max(0, Math.round(100 * (1 - bad / lines)));
}

const SHIPPED_CODE = ['templates/generative-ui', 'install.sh', 'package.json', 'claude_desktop_config.json'];
const PROSE_DIRS = ['skills', 'docs', 'README.md', 'system_prompt.md'];
const UNFINISHED_PROSE = /\b(TBD|coming soon|to be written)\b/i;

function walk(target) {
  const full = path.join(__dirname, '..', target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full).flatMap((name) => walk(path.join(target, name)));
}

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

test('rejects hardcoded hex colors outside token definitions', () => {
  const css = '.card { color: #ff0000; background: rgba(0,0,0,0.5); }';
  const found = audit(css, 'card.css').filter((f) => f.rule === 'hardcoded-color');
  assert.equal(found.length, 1);
});

test('accepts hex inside token declarations and @tokens blocks', () => {
  const css = ':root {\n  --bg-primary: #09090b;\n}\n.card { color: var(--bg-primary); }';
  assert.deepEqual(audit(css, 'tokens.css'), []);
  const js = '// @tokens:start\nconst T = { bg: "#09090b" };\n// @tokens:end\nconst x = "#abc123";';
  const found = audit(js, 'theme.js').filter((f) => f.rule === 'hardcoded-color');
  assert.equal(found.length, 1);
  assert.equal(found[0].line, 4);
});

test('rejects TODO and placeholder comments', () => {
  assert.equal(audit('// TODO wire this up\nexport const a = 1;', 'a.js').length, 1);
  assert.equal(audit('<!-- FIXME -->', 'a.html').length, 1);
  assert.equal(audit('<h1>Lorem ipsum</h1>', 'a.html').length, 1);
});

test('requires explicit TypeScript return types', () => {
  const bad = 'export function total(items: number[]) {\n  return items.length;\n}';
  const good = 'export function total(items: number[]): number {\n  return items.length;\n}';
  assert.equal(audit(bad, 'a.ts').filter((f) => f.rule === 'missing-return-type').length, 1);
  assert.equal(audit(good, 'a.ts').length, 0);
  const arrow = 'export const total = (items: number[]) => items.length;';
  assert.equal(audit(arrow, 'a.ts').filter((f) => f.rule === 'missing-return-type').length, 1);
  assert.equal(audit(bad, 'a.js').length, 0);
});

test('rejects type laundering', () => {
  assert.equal(audit('const x = y as any;', 'a.ts').length, 1);
  assert.equal(audit('const x = y as unknown as Foo;', 'a.ts').length, 1);
});

test('rejects craft violations: transition all, gradients, z-index wars', () => {
  const css = 'a { transition: all 200ms; background: linear-gradient(red, blue); z-index: 9999; }';
  const ids = audit(css, 'a.css').map((f) => f.rule).sort();
  assert.deepEqual(ids, ['gradient', 'transition-all', 'z-index-arms-race']);
});

test('rejects comments that restate code', () => {
  assert.equal(audit('// increment count by 1\ncount += 1;', 'a.js').length, 1);
});

test('passes clean, token-compliant sample', () => {
  const sample = [
    ':root {',
    '  --bg-primary: #09090b;',
    '  --accent: #6366f1;',
    '}',
    '.btn { background: var(--accent); transition: background-color 150ms ease, transform 150ms ease; isolation: isolate; }',
    '',
  ].join('\n');
  assert.deepEqual(audit(sample, 'clean.css'), []);
  const ts = 'export function clamp(value: number, min: number, max: number): number {\n  return Math.min(max, Math.max(min, value));\n}\n';
  assert.deepEqual(audit(ts, 'clean.ts'), []);
  assert.equal(tokenScore(sample, 'clean.css'), 100);
});

test('shipped code files are free of violations', () => {
  const files = SHIPPED_CODE.flatMap(walk);
  assert.ok(files.length >= 7, 'expected shipped code files to exist');
  const problems = files.flatMap((file) =>
    audit(fs.readFileSync(file, 'utf8'), file).map((f) => `${path.relative(path.join(__dirname, '..'), file)}:${f.line} ${f.rule}`)
  );
  assert.deepEqual(problems, []);
});

test('prose files exist and contain no unfinished markers', () => {
  const files = PROSE_DIRS.flatMap(walk).filter((f) => f.endsWith('.md'));
  assert.ok(files.length >= 9, 'expected prose files to exist');
  const problems = files.filter((f) => UNFINISHED_PROSE.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(problems, []);
});

function run() {
  let failed = 0;
  for (const { name, fn } of cases) {
    try {
      fn();
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${name}\n     ${error.message.split('\n').join('\n     ')}`);
    }
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

if (require.main === module) run();

module.exports = { audit, tokenScore, COLOR_REGEX };
