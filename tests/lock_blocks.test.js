'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  TOKEN_KEYS,
  formatPickBlock,
  formatLockBlock,
  parsePickBlock,
  parseLockBlock,
  parseAnyGateBlock,
} = require('../scripts/lib/lock-blocks.js');

const SAMPLE_STACK = {
  id: 'hono-workers-d1',
  name: 'Edge API + Node CLI',
  stack: 'Hono v4 + Workers D1 + Node 22 CLI',
  why: 'Zero idle cost and sub-15ms edge deduplication.',
  latencyMs: 14,
  latencyTag: 'inferred',
  offlineLabel: 'CLI offline capable',
  offlineTag: 'verified',
  cost: '$0 free tier',
  costTag: 'verified',
  gotchas: [
    {
      issue: '128 MB isolate memory cap on exports',
      mitigation: 'Stream rows via TransformStream',
    },
    {
      issue: 'stdout pollution breaks --json pipes',
      mitigation: 'Route diagnostics to stderr only',
    },
  ],
};

const SAMPLE_THEME = {
  name: 'Swiss Grid',
  scheme: 'light',
  'bg-primary': '#f4f4f0',
  'bg-surface': '#fbfbf9',
  'bg-raised': '#e8e8e2',
  'fg-primary': '#141413',
  'fg-muted': '#52524d',
  border: 'rgba(20, 20, 19, 0.16)',
  accent: '#bd2419',
  'accent-2': '#156d30',
  'accent-fg': '#fbfbf9',
  success: '#14692e',
  danger: '#b01c12',
  radius: '2px',
  'radius-btn': '2px',
  'font-sans': 'system-ui, -apple-system, sans-serif',
  'font-display': '"Helvetica Neue", Arial, sans-serif',
  'font-mono': 'ui-monospace, SFMono-Regular, monospace',
  'shadow-overlay': '0 4px 12px rgba(20, 20, 19, 0.08)',
  blur: '0px',
  'shape-opacity': '0',
};

test('VIBECRAFT PICK v2 and v1 roundtrip cleanly', () => {
  const v2Text = formatPickBlock(SAMPLE_STACK);
  assert.match(v2Text, /^VIBECRAFT PICK v2 · Phase 1 · Research Scout/);
  const parsedV2 = parsePickBlock(v2Text);
  assert.equal(parsedV2.ok, true);
  assert.equal(parsedV2.version, 2);
  assert.equal(parsedV2.data.archetypeId, 'hono-workers-d1');
  assert.equal(parsedV2.data.gotchas.length, 2);

  const v1Text = formatPickBlock(SAMPLE_STACK, { version: 1 });
  const parsedV1 = parsePickBlock(v1Text);
  assert.equal(parsedV1.ok, true);
  assert.equal(parsedV1.version, 1);
  assert.equal(parsedV1.data.stack, 'Hono v4 + Workers D1 + Node 22 CLI (Edge API + Node CLI)');
});

test('parsePickBlock rejects "Copy gotchas only" and truncated gotchas with line diagnostics', () => {
  const gotchasOnly = '[Gotcha] Safari evicts OPFS after 7 days\nFix: Call navigator.storage.persist()';
  const res = parseAnyGateBlock(gotchasOnly);
  assert.equal(res.ok, false);
  assert.equal(res.kind, 'gotchas-only');
  assert.equal(res.errors[0].line, 1);
  assert.match(res.errors[0].message, /Copy gotchas only/);

  const truncated = [
    'VIBECRAFT PICK v2 · Phase 1 · Research Scout',
    'Stack: Astro + SQLite (Static)',
    'Why: Fast',
    'Performance: 12 ms [Inferred]',
    'Offline: Full [Verified]',
    'Cost: $0 [Verified]',
    '[Gotcha 1] Missing Fix line here',
  ].join('\n');
  const truncRes = parsePickBlock(truncated);
  assert.equal(truncRes.ok, false);
  assert.ok(truncRes.errors.some((e) => e.field === 'mitigation' && e.line === 7));
});

test('VIBECRAFT LOCK v2 and v1 roundtrip all 19 TOKEN_KEYS and waivers', () => {
  assert.equal(TOKEN_KEYS.length, 19);
  const v2Text = formatLockBlock('swiss', SAMPLE_THEME, { waivers: ['VC007'] });
  const parsedV2 = parseLockBlock(v2Text);
  assert.equal(parsedV2.ok, true);
  assert.equal(parsedV2.version, 2);
  assert.equal(parsedV2.data.themeId, 'swiss');
  assert.equal(parsedV2.data.scheme, 'light');
  assert.deepEqual(parsedV2.data.waivers, ['VC007']);
  assert.equal(parsedV2.data.tokens.accent, '#bd2419');

  const v1Text = formatLockBlock('swiss', SAMPLE_THEME, { version: 1 });
  const parsedV1 = parseLockBlock(v1Text);
  assert.equal(parsedV1.ok, true);
  assert.equal(parsedV1.version, 1);
});

test('parseLockBlock rejects truncated :root blocks and reports missing TOKEN_KEYS', () => {
  const truncatedLock = [
    'VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan',
    'Archetype: Swiss Grid',
    ':root {',
    '  --bg-primary: #f4f4f0;',
    '  --bg-surface: #fbfbf9;',
  ].join('\n');
  const res = parseAnyGateBlock(truncatedLock);
  assert.equal(res.ok, false);
  assert.equal(res.kind, 'lock');
  assert.ok(res.errors.some((e) => e.field === ':root' && /Truncated/.test(e.message)));
  assert.ok(res.errors.some((e) => e.field === 'tokens' && /Missing 17 of 19/.test(e.message)));
});
