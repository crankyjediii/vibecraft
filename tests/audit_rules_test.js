'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  COLOR_REGEX,
  RULES_META,
  audit,
  auditPaths,
  tokenScore,
} = require('../scripts/audit/engine.js');
const { fixSource } = require('../scripts/audit/fixer.js');
const { toSarif } = require('../scripts/audit/sarif.js');

const ROOT_DIR = path.join(__dirname, '..');
const SHIPPED_CODE = [
  'templates/generative-ui',
  'scripts',
  'install.sh',
  'package.json',
  'claude_desktop_config.json',
  '.mcp.json',
];
const PROSE_DIRS = ['skills', 'commands', 'docs', 'README.md', 'system_prompt.md'];
const UNFINISHED_PROSE = /\b(TBD|coming soon|to be written)\b/i;

function walk(target) {
  const full = path.join(ROOT_DIR, target);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full).flatMap((name) => walk(path.join(target, name)));
}

const cases = [];
const test = (name, fn) => cases.push({ name, fn });

// --- Legacy v0.1 contract tests (10/10 preserved) ---

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

test('requires explicit TypeScript return types (single-line and multi-line)', () => {
  const bad = 'export function total(items: number[]) {\n  return items.length;\n}';
  const good = 'export function total(items: number[]): number {\n  return items.length;\n}';
  assert.equal(audit(bad, 'a.ts').filter((f) => f.rule === 'missing-return-type').length, 1);
  assert.equal(audit(good, 'a.ts').length, 0);
  const arrow = 'export const total = (items: number[]) => items.length;';
  assert.equal(audit(arrow, 'a.ts').filter((f) => f.rule === 'missing-return-type').length, 1);
  assert.equal(audit(bad, 'a.js').length, 0);

  const multiLineBad = [
    'export async function computeInvoice(',
    '  items: Array<{ cents: number; qty: number }>,',
    '  discountRate = 0',
    ') {',
    '  return items.reduce((s, i) => s + i.cents * i.qty, 0) * (1 - discountRate);',
    '}',
  ].join('\n');
  const multiLineGood = [
    'export async function computeInvoice(',
    '  items: Array<{ cents: number; qty: number }>,',
    '  discountRate = 0',
    '): Promise<number> {',
    '  return items.reduce((s, i) => s + i.cents * i.qty, 0) * (1 - discountRate);',
    '}',
  ].join('\n');
  assert.equal(audit(multiLineBad, 'invoice.ts').filter((f) => f.ruleId === 'VC012').length, 1);
  assert.equal(audit(multiLineGood, 'invoice.ts').filter((f) => f.ruleId === 'VC012').length, 0);
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
  assert.ok(files.length >= 15, 'expected shipped code files to exist');
  const problems = files.flatMap((file) =>
    audit(fs.readFileSync(file, 'utf8'), file).map(
      (f) => `${path.relative(ROOT_DIR, file)}:${f.line} ${f.ruleId} (${f.rule})`
    )
  );
  assert.deepEqual(problems, []);
});

test('prose files exist and contain no unfinished markers', () => {
  const files = PROSE_DIRS.flatMap(walk).filter(
    (f) => f.endsWith('.md') && !f.includes(`${path.sep}audits${path.sep}`)
  );
  assert.ok(files.length >= 12, 'expected prose files to exist');
  const problems = files.filter((f) => UNFINISHED_PROSE.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(problems, []);
});

// --- Audit Engine v2 comprehensive fixture & CLI tests ---

test('all 19 rules (VC000..VC018) pass positive fixtures and trigger negative fixtures', () => {
  assert.equal(RULES_META.length, 19);
  const fixturesDir = path.join(__dirname, 'fixtures', 'rules');
  const entries = fs.readdirSync(fixturesDir);

  for (const meta of RULES_META) {
    if (meta.id === 'VC015') {
      const passRes = auditPaths([path.join(fixturesDir, 'VC015-pass')]);
      assert.deepEqual(
        passRes.findings.filter((f) => f.ruleId === 'VC015'),
        [],
        'VC015-pass directory should produce 0 dead-export findings'
      );
      const failRes = auditPaths([path.join(fixturesDir, 'VC015-fail')]);
      const deadHits = failRes.findings.filter((f) => f.ruleId === 'VC015');
      assert.ok(deadHits.length >= 1, 'VC015-fail directory should report unused export');
      continue;
    }

    const passFile = entries.find((e) => e.startsWith(`${meta.id}.pass.`));
    const failFile = entries.find((e) => e.startsWith(`${meta.id}.fail.`));
    assert.ok(passFile, `missing pass fixture for ${meta.id}`);
    assert.ok(failFile, `missing fail fixture for ${meta.id}`);

    const passPath = path.join(fixturesDir, passFile);
    const failPath = path.join(fixturesDir, failFile);

    const passFindings = audit(fs.readFileSync(passPath, 'utf8'), passPath);
    assert.deepEqual(
      passFindings,
      [],
      `${passFile} expected 0 findings, got: ${JSON.stringify(passFindings)}`
    );

    const failFindings = audit(fs.readFileSync(failPath, 'utf8'), failPath);
    assert.ok(
      failFindings.some((f) => f.ruleId === meta.id),
      `${failFile} expected ${meta.id}, got: ${JSON.stringify(failFindings)}`
    );
  }
});

test('VC018 detects dynamically assembled provider token prefixes without false positives on env refs', () => {
  const anth = ['sk', 'ant', 'api03', 'A'.repeat(28)].join('-');
  const ghp = 'gh' + 'p_' + 'B'.repeat(36);
  const aws = 'AK' + 'IA' + '0123456789ABCDEF';
  for (const tok of [anth, ghp, aws]) {
    const src = `export const KEY = "${tok}";\n`;
    const hits = audit(src, 'secrets.ts').filter((f) => f.ruleId === 'VC018');
    assert.equal(hits.length, 1);
  }
  const safeEnv = '{\n  "BRAVE_API_KEY": "${BRAVE_API_KEY}"\n}\n';
  assert.deepEqual(audit(safeEnv, '.mcp.json'), []);
});

test('fixer.js repairs mechanical rules VC006, VC014, and VC017 cleanly without altering types or tokens', () => {
  const dirtyCss = '.btn { transition: all 150ms ease; }\n';
  const cssFixed = fixSource(dirtyCss, 'ui.css');
  assert.equal(cssFixed.changed, true);
  assert.equal(cssFixed.applied.length, 1);
  assert.deepEqual(audit(cssFixed.output, 'ui.css'), []);

  const dirtyTs = [
    '// increment counter by one',
    'export function nextId(n: number): number {',
    '  console.log(n);',
    '  return n + 1;',
    '}',
    '',
  ].join('\n');
  const tsFixed = fixSource(dirtyTs, 'counter.ts');
  assert.equal(tsFixed.changed, true);
  assert.equal(tsFixed.applied.length, 2);
  assert.deepEqual(audit(tsFixed.output, 'counter.ts'), []);
});

test('SARIF 2.1.0 output and CLI flags (--json, --sarif, --fix, --min-severity, exit codes 0/1/2)', () => {
  const cliPath = path.join(ROOT_DIR, 'scripts', 'audit', 'cli.js');

  // Exit 0 on clean templates
  const cleanRun = spawnSync(process.execPath, [cliPath, 'templates/generative-ui', '--json'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(cleanRun.status, 0);
  const parsedJson = JSON.parse(cleanRun.stdout);
  assert.equal(parsedJson.ok, true);
  assert.equal(parsedJson.scannedFiles, 4);
  assert.equal(parsedJson.summary.total, 0);

  // Exit 1 on fail fixture + valid SARIF 2.1.0
  const failFixture = path.join('tests', 'fixtures', 'rules', 'VC001.fail.tsx');
  const sarifRun = spawnSync(process.execPath, [cliPath, failFixture, '--sarif'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(sarifRun.status, 1);
  const sarif = JSON.parse(sarifRun.stdout);
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.rules.length, 19);
  assert.ok(sarif.runs[0].results.some((r) => r.ruleId === 'VC001'));

  // Direct toSarif helper check
  const directSarif = toSarif({ findings: audit('.x { color: #123456; }', 'x.css') }, ROOT_DIR);
  assert.equal(directSarif.version, '2.1.0');
  assert.equal(directSarif.runs[0].results.length, 1);

  // --min-severity error suppresses warning-only fixture (VC017 is warning)
  const warnFixture = path.join('tests', 'fixtures', 'rules', 'VC017.fail.ts');
  const warnDefault = spawnSync(process.execPath, [cliPath, warnFixture], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(warnDefault.status, 1);
  const warnFiltered = spawnSync(process.execPath, [cliPath, warnFixture, '--min-severity', 'error'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(warnFiltered.status, 0);

  // CLI --fix in isolated temp directory
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-audit-fix-'));
  try {
    const tmpFile = path.join(tmpDir, 'sample.ts');
    fs.writeFileSync(
      tmpFile,
      '// increment the value\nexport function id(v: number): number {\n  console.debug(v);\n  return v;\n}\n'
    );
    const fixRun = spawnSync(process.execPath, [cliPath, tmpFile, '--fix'], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    });
    assert.equal(fixRun.status, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // Exit 2 on unknown flag and non-existent target path
  const badFlag = spawnSync(process.execPath, [cliPath, '--not-a-real-flag'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(badFlag.status, 2);

  const badPath = spawnSync(process.execPath, [cliPath, 'nonexistent-dir-xyz'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
  });
  assert.equal(badPath.status, 2);
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
