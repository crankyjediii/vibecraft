#!/usr/bin/env node
/**
 * Deterministically builds and drift-checks (`--check`) all four VibeCraft Generative UI
 * HTML artifacts in `templates/generative-ui/`:
 *   1. `stack_matrix_artifact.html`
 *   2. `brand_studio_artifact.html`
 *   3. `qa_diff_artifact.html`
 *   4. `launchpad_artifact.html`
 *
 * Security, accessibility, and offline invariants:
 * - Zero `cdn.tailwindcss.com` JIT scripts and zero `fonts.googleapis.com` trackers (`SEC-03`, `SEC-09`)
 * - Pin Mermaid 11.4.1 with verified `sha384` SRI + offline `<pre>` diagram fallback (`SEC-04`, `COR-02`)
 * - Strict `DOMParser` geometric SVG allowlist sanitizer on `LAUNCH.logo` (`SEC-02`)
 * - Semantic `<header>`, `<main>`, `<footer>` landmarks + sequential `<h1>` -> `<h2>` -> `<h3>` (`A11Y-03`)
 * - WCAG 2.2 AA calibrated `:root` light/dark tokens + 6 pre-verified Brand Studio archetypes (`A11Y-01`, `A11Y-02`)
 * - Closed + open keyboard navigation on Brand Studio listbox (`A11Y-04`)
 * - CSS logical properties + `dir="auto"` + `375px` word-wrap resilience (`COR-09`)
 * - Empty, Error, and `0/0` latency guards + `#fallback` clipboard `<textarea>` + Download + `@media print`
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'templates', 'generative-ui');

const MERMAID_URL = 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js';
const MERMAID_SRI = 'sha384-rbtjAdnIQE/aQJGEgXrVUlMibdfTSa4PQju4HDhN3sR2PmaKFzhEafuePsl9H/9I';

const SHARED_BASE_CSS = `
:root {
  --bg-primary: #0b0c0e;
  --bg-surface: #121417;
  --bg-raised: #191c21;
  --fg-primary: #f4f5f8;
  --fg-muted: #8c93a3;
  --border: rgba(244, 245, 248, 0.10);
  --border-strong: rgba(244, 245, 248, 0.22);
  --accent: #7c89ff;
  --accent-fg: #0b0c0e;
  --accent-soft: rgba(124, 137, 255, 0.12);
  --success: #3dd68c;
  --success-soft: rgba(61, 214, 140, 0.12);
  --warn: #f5a623;
  --warn-soft: rgba(245, 166, 35, 0.12);
  --danger: #ff7373;
  --danger-soft: rgba(255, 115, 115, 0.12);
  --radius: 8px;
  --radius-sm: 6px;
  --shadow-overlay: 0 10px 28px rgba(0, 0, 0, 0.42);
  --font-sans: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
  --font-display: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #f6f6f4;
    --bg-surface: #fcfcfa;
    --bg-raised: #ebebea;
    --fg-primary: #161618;
    --fg-muted: #525259;
    --border: rgba(22, 22, 24, 0.12);
    --border-strong: rgba(22, 22, 24, 0.26);
    --accent: #3b46b8;
    --accent-fg: #fcfcfa;
    --accent-soft: rgba(59, 70, 184, 0.09);
    --success: #136c2e;
    --success-soft: rgba(19, 108, 46, 0.10);
    --warn: #854800;
    --warn-soft: rgba(133, 72, 0, 0.10);
    --danger: #b01c12;
    --danger-soft: rgba(176, 28, 18, 0.10);
    --shadow-overlay: 0 8px 24px rgba(22, 22, 24, 0.08);
  }
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
.shell {
  max-width: 1120px;
  margin-inline: auto;
  padding-block: 24px 40px;
  padding-inline: 16px;
}
@media (min-width: 768px) {
  .shell { padding-inline: 28px; }
}
.eyebrow {
  margin: 0 0 4px 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.35rem, 2.4vw, 1.75rem);
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
h3 {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
p { margin: 0; overflow-wrap: anywhere; }
.muted { color: var(--fg-muted); }
.mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.tabular { font-variant-numeric: tabular-nums; }
.header-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: 20px;
  padding-block-end: 16px;
  border-block-end: 1px solid var(--border);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  min-width: 38px;
  padding-block: 8px;
  padding-inline: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 550;
  text-align: start;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, opacity 140ms ease;
}
.btn:hover:not(:disabled) {
  background: var(--bg-raised);
  border-color: var(--border-strong);
}
.btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: transparent;
  font-weight: 600;
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent);
  border-color: var(--fg-primary);
  opacity: 0.92;
}
.btn-primary:focus-visible {
  outline: 2px solid var(--fg-primary);
  outline-offset: 2px;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding-block: 2px;
  padding-inline: 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}
.tag-verified { background: var(--success-soft); color: var(--success); }
.tag-inferred { background: var(--accent-soft); color: var(--accent); }
.tag-gotcha, .tag-warn { background: var(--warn-soft); color: var(--warn); }
.tag-danger { background: var(--danger-soft); color: var(--danger); }
.panel {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  min-width: 0;
}
.empty-state {
  background: var(--bg-surface);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
  color: var(--fg-muted);
}
.fallback-wrap {
  margin-block-start: 12px;
}
.fallback-box {
  width: 100%;
  min-height: 110px;
  margin-block-start: 6px;
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-strong);
  background: var(--bg-raised);
  color: var(--fg-primary);
  font-family: var(--font-mono);
  font-size: 12.5px;
}
.fallback-box:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.footer-bar {
  margin-block-start: 24px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 0.84rem;
  color: var(--fg-muted);
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition: none !important;
    animation: none !important;
  }
}
@media print {
  body { background: var(--bg-surface); }
  .no-print { display: none !important; }
  .shell { max-width: 100%; padding: 0; }
  .panel { break-inside: avoid; }
}
`.trim();

const SHARED_CLIPBOARD_JS = `
const $ = (id) => document.getElementById(id);
let flashTimer = 0;

function announceStatus(msg, btn, doneLabel) {
  const statusEl = $('live-status');
  if (statusEl) statusEl.textContent = msg;
  if (btn && doneLabel) {
    if (!btn.dataset.origLabel) btn.dataset.origLabel = btn.textContent;
    btn.textContent = doneLabel;
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(() => {
      btn.textContent = btn.dataset.origLabel;
    }, 1600);
  }
}

async function copyWithFallback(text, btn, doneLabel) {
  const fbWrap = $('fallback-wrap');
  const fb = $('fallback');
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      if (fbWrap) fbWrap.hidden = true;
      announceStatus('Copied to clipboard.', btn, doneLabel || 'Copied ✓');
      return;
    }
    throw new Error('Clipboard API unavailable');
  } catch (_err) {
    if (fb && fbWrap) {
      fbWrap.hidden = false;
      fb.value = text;
      fb.focus();
      fb.select();
    }
    announceStatus('Clipboard blocked by sandbox; select and copy from the text box below.', btn, 'Select below');
  }
}

function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  announceStatus('Downloaded ' + filename + '.');
}
`.trim();

function buildStackMatrixHtml() {
  return `<!doctype html>
<html lang="en" dir="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>VibeCraft · Phase 1 Stack Matrix</title>
<style>
${SHARED_BASE_CSS}
.cards-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 860px) {
  .cards-grid { grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); }
}
.option-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  cursor: pointer;
  text-align: start;
  min-width: 0;
  transition: border-color 140ms ease, background-color 140ms ease;
}
.option-card:hover {
  border-color: var(--border-strong);
}
.option-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.option-card[aria-checked="true"] {
  border-color: var(--accent);
  background: var(--bg-raised);
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.stack-line {
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--accent);
  overflow-wrap: anywhere;
}
.metric-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-block: 10px;
  border-block: 1px solid var(--border);
  font-size: 0.85rem;
}
.metric-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.bar-track {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--bg-primary);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
}
.gotcha-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.83rem;
}
.gotcha-box {
  padding: 10px;
  border-radius: var(--radius-sm);
  background: var(--bg-primary);
  border: 1px solid var(--border);
}
</style>
</head>
<body>
<div class="shell">
  <header class="header-row">
    <div>
      <p class="eyebrow">Phase 1 of 4 · Research Scout</p>
      <h1>Choose a software stack</h1>
      <p class="muted" id="subtitle">Select a candidate stack, inspect its gotchas, and copy your lock block for Claude.</p>
    </div>
    <div class="toolbar no-print">
      <button type="button" class="btn btn-primary" id="copy-pick-btn">Copy selection for Claude</button>
      <button type="button" class="btn" id="download-pick-btn">Download stack-pick.txt</button>
    </div>
  </header>

  <main id="main-content">
    <div id="matrix-root" class="cards-grid" role="radiogroup" aria-label="Candidate software stacks"></div>

    <div id="fallback-wrap" class="fallback-wrap no-print" hidden>
      <label for="fallback" class="muted mono">Manual copy fallback (Ctrl/Cmd+C):</label>
      <textarea id="fallback" class="fallback-box" readonly></textarea>
    </div>
  </main>

  <footer class="footer-bar">
    <span id="live-status" role="status" aria-live="polite">Ready. Arrow keys switch candidate stacks.</span>
    <span class="mono">VIBECRAFT PICK v2</span>
  </footer>
</div>

<script>
// @vibecraft-data:start
// Scout agent: replace STACKS only (3 to 4 candidates, lowercase 'verified' | 'inferred' | 'gotcha' tags).
const STACKS = [
  {
    id: 'hono-workers-d1',
    name: 'Edge API + Node CLI',
    recommended: true,
    stack: 'Hono v4 + Cloudflare Workers (D1 + R2) + Node 22 CLI',
    why: 'Sub-15 ms idempotent edge ingest with SQLite UNIQUE keys on D1 and shared strict Zod contracts across Worker and terminal.',
    latencyMs: 14,
    latencyNote: 'P95 edge isolate + D1 INSERT OR IGNORE',
    latencyTag: 'inferred',
    offlineLabel: 'CLI works offline; ingest on edge',
    offlineTag: 'verified',
    cost: '$0 idle free tier',
    costTag: 'verified',
    gotcha: 'Workers enforce a 128 MB isolate memory cap; buffering large NDJSON exports crashes the isolate.',
    mitigation: 'Enforce 2 MB bodyLimit() on ingest and stream R2 rollups via TransformStream.',
    gotchas: [
      {
        issue: 'Workers enforce a 128 MB isolate memory cap; buffering large NDJSON exports crashes the isolate.',
        mitigation: 'Enforce 2 MB bodyLimit() on ingest and stream R2 rollups via TransformStream.'
      },
      {
        issue: 'CLI banners written to stdout break piped JSON workflows.',
        mitigation: 'Send progress and warnings to stderr only; keep stdout strictly structured data.'
      }
    ]
  },
  {
    id: 'tauri-sqlite',
    name: 'Local-First Desktop',
    recommended: false,
    stack: 'Tauri v2 + React 19 + Rust rusqlite (FTS5)',
    why: '8 MB native OS webview binary with zero cloud dependency and sub-5 ms local full-text search.',
    latencyMs: 4,
    latencyNote: 'P95 local FTS5 query on 10k rows',
    latencyTag: 'inferred',
    offlineLabel: 'Full local R/W offline',
    offlineTag: 'verified',
    cost: '$0 local binary',
    costTag: 'verified',
    gotcha: 'Unsigned macOS builds trigger Gatekeeper quarantine warnings for external testers.',
    mitigation: 'Sign with Developer ID + notarytool in CI before external release.',
    gotchas: [
      {
        issue: 'Unsigned macOS builds trigger Gatekeeper quarantine warnings for external testers.',
        mitigation: 'Sign with Developer ID + notarytool in CI before external release.'
      },
      {
        issue: 'JSON-serializing multi-MB payloads over invoke() spikes IPC memory 3x.',
        mitigation: 'Return raw binary ArrayBuffer responses via tauri::ipc::Response.'
      }
    ]
  },
  {
    id: 'expo-sqlite-mobile',
    name: 'Mobile Offline-First',
    recommended: false,
    stack: 'Expo SDK 52 + React Native + expo-sqlite (WAL)',
    why: 'Synchronous JSI SQLite reads on iOS and Android with opportunistic outbox sync on reconnect.',
    latencyMs: 9,
    latencyNote: 'P95 indexed JSI query (LIMIT 50)',
    latencyTag: 'inferred',
    offlineLabel: 'Full offline queue + sync',
    offlineTag: 'verified',
    cost: '$0 local + EAS free tier',
    costTag: 'verified',
    gotcha: 'Unindexed scans > 2,000 rows on the JS thread drop gesture animations below 60 fps.',
    mitigation: 'Enable WAL mode, FTS5 indexes, and keyset pagination (LIMIT 50).',
    gotchas: [
      {
        issue: 'Unindexed scans > 2,000 rows on the JS thread drop gesture animations below 60 fps.',
        mitigation: 'Enable WAL mode, FTS5 indexes, and keyset pagination (LIMIT 50).'
      },
      {
        issue: 'iOS BGAppRefreshTask caps background execution at 30 seconds.',
        mitigation: 'Flush outbox mutations on foreground transitions and chunk sync batches under 5 s.'
      }
    ]
  }
];
// @vibecraft-data:end

${SHARED_CLIPBOARD_JS}

const TAG_MAP = {
  verified: { text: '[Verified]', cls: 'tag tag-verified' },
  inferred: { text: '[Inferred]', cls: 'tag tag-inferred' },
  gotcha: { text: '[Gotcha]', cls: 'tag tag-gotcha' }
};

function resolveTag(raw) {
  const key = String(raw || '').replace(/[\\[\\]]/g, '').trim().toLowerCase();
  return TAG_MAP[key] || TAG_MAP.inferred;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let selectedId = null;

function normalizeGotchas(item) {
  if (Array.isArray(item.gotchas) && item.gotchas.length > 0) {
    return item.gotchas.filter((g) => g && g.issue);
  }
  if (item.gotcha) {
    return [{ issue: String(item.gotcha), mitigation: String(item.mitigation || '') }];
  }
  return [];
}

function selectionText() {
  const list = Array.isArray(STACKS) ? STACKS : [];
  const item = list.find((s) => s && s.id === selectedId) || list[0];
  if (!item) return 'VIBECRAFT PICK v2 · Phase 1 · Research Scout\\nError: No stack candidates loaded.';
  const lines = [
    'VIBECRAFT PICK v2 · Phase 1 · Research Scout',
    'ArchetypeId: ' + (item.id || 'custom'),
    'Stack: ' + (item.stack || 'Unspecified') + ' (' + (item.name || 'Candidate') + ')',
    'Why: ' + (item.why || ''),
    'Performance: ' + (Number(item.latencyMs) || 0) + ' ms ' + resolveTag(item.latencyTag).text,
    'Offline: ' + (item.offlineLabel || '') + ' ' + resolveTag(item.offlineTag).text,
    'Cost: ' + (item.cost || '') + ' ' + resolveTag(item.costTag).text,
    ''
  ];
  const gotchas = normalizeGotchas(item);
  gotchas.forEach((g, idx) => {
    const label = gotchas.length > 1 ? '[Gotcha ' + (idx + 1) + '] ' : '[Gotcha] ';
    lines.push(label + g.issue);
    lines.push('Fix: ' + (g.mitigation || 'Document mitigation in Phase 3'));
  });
  return lines.join('\\n');
}

function renderMatrix() {
  const root = $('matrix-root');
  root.replaceChildren();

  if (!Array.isArray(STACKS) || STACKS.length === 0) {
    const empty = el('div', 'empty-state', 'No stack candidates available in STACKS. Re-run Phase 1 Research Scout to populate 3 to 4 options.');
    root.appendChild(empty);
    $('copy-pick-btn').disabled = true;
    $('download-pick-btn').disabled = true;
    return;
  }

  $('copy-pick-btn').disabled = false;
  $('download-pick-btn').disabled = false;

  if (!selectedId || !STACKS.some((s) => s && s.id === selectedId)) {
    const rec = STACKS.find((s) => s && s.recommended) || STACKS[0];
    selectedId = rec ? rec.id : null;
  }

  const maxLatency = Math.max(1, ...STACKS.map((s) => Math.max(0, Number(s && s.latencyMs) || 0)));

  STACKS.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const isSelected = item.id === selectedId;
    const card = el('div', 'option-card');
    card.setAttribute('role', 'radio');
    card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
    card.tabIndex = isSelected ? 0 : -1;
    card.dataset.id = item.id || String(index);

    const top = el('div', 'card-top');
    const titleWrap = el('div');
    titleWrap.appendChild(el('h2', '', item.name || 'Candidate ' + (index + 1)));
    titleWrap.appendChild(el('p', 'stack-line', item.stack || ''));
    top.appendChild(titleWrap);
    if (item.recommended) {
      top.appendChild(el('span', 'tag tag-verified', 'Recommended'));
    }
    card.appendChild(top);
    card.appendChild(el('p', 'muted', item.why || ''));

    const metrics = el('div', 'metric-list');
    const latVal = Math.max(0, Number(item.latencyMs) || 0);
    const pct = Math.min(100, Math.max(4, Math.round((latVal / maxLatency) * 100)));

    const latRow = el('div', 'metric-row');
    latRow.appendChild(el('span', 'mono', latVal + ' ms · ' + (item.latencyNote || 'critical path')));
    const latBadge = resolveTag(item.latencyTag);
    latRow.appendChild(el('span', latBadge.cls, latBadge.text));
    metrics.appendChild(latRow);

    const barTrack = el('div', 'bar-track');
    const barFill = el('div', 'bar-fill');
    barFill.style.width = pct + '%';
    barTrack.appendChild(barFill);
    metrics.appendChild(barTrack);

    const offRow = el('div', 'metric-row');
    offRow.appendChild(el('span', '', 'Offline: ' + (item.offlineLabel || 'Unspecified')));
    const offBadge = resolveTag(item.offlineTag);
    offRow.appendChild(el('span', offBadge.cls, offBadge.text));
    metrics.appendChild(offRow);

    const costRow = el('div', 'metric-row');
    costRow.appendChild(el('span', 'tabular', 'Cost: ' + (item.cost || 'Unspecified')));
    const costBadge = resolveTag(item.costTag);
    costRow.appendChild(el('span', costBadge.cls, costBadge.text));
    metrics.appendChild(costRow);

    card.appendChild(metrics);

    const gotchaWrap = el('div', 'gotcha-list');
    normalizeGotchas(item).forEach((g, gIdx) => {
      const box = el('div', 'gotcha-box');
      const gHead = el('span', 'tag tag-gotcha', 'Gotcha ' + (gIdx + 1));
      box.appendChild(gHead);
      box.appendChild(el('p', '', g.issue));
      if (g.mitigation) {
        box.appendChild(el('p', 'muted', 'Mitigation: ' + g.mitigation));
      }
      gotchaWrap.appendChild(box);
    });
    card.appendChild(gotchaWrap);

    card.addEventListener('click', () => {
      selectedId = item.id;
      renderMatrix();
      const active = root.querySelector('[aria-checked="true"]');
      if (active) active.focus();
    });

    card.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        selectedId = item.id;
        renderMatrix();
        return;
      }
      if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(ev.key)) {
        ev.preventDefault();
        const dir = ev.key === 'ArrowRight' || ev.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (index + dir + STACKS.length) % STACKS.length;
        selectedId = STACKS[nextIdx].id;
        renderMatrix();
        const active = root.querySelector('[aria-checked="true"]');
        if (active) active.focus();
      }
    });

    root.appendChild(card);
  });
}

$('copy-pick-btn').addEventListener('click', () => {
  copyWithFallback(selectionText(), $('copy-pick-btn'), 'Copied lock ✓');
});

$('download-pick-btn').addEventListener('click', () => {
  downloadBlob('stack-pick.txt', selectionText() + '\\n', 'text/plain;charset=utf-8');
});

renderMatrix();
</script>
</body>
</html>
`;
}

function buildBrandStudioHtml() {
  return `<!doctype html>
<html lang="en" dir="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>VibeCraft · Phase 2 Brand Studio</title>
<style>
${SHARED_BASE_CSS}
.studio-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 900px) {
  .studio-layout { grid-template-columns: 330px minmax(0, 1fr); }
}
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.preset-btn {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  min-height: 44px;
  padding: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--fg-primary);
  text-align: start;
  cursor: pointer;
  transition: border-color 140ms ease, background-color 140ms ease;
}
.preset-btn:hover {
  border-color: var(--border-strong);
  background: var(--bg-raised);
}
.preset-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.preset-btn[aria-checked="true"] {
  border-color: var(--accent);
  background: var(--bg-raised);
}
.preset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}
.swatches {
  display: inline-flex;
  gap: 4px;
}
.swatch-dot {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 1px solid var(--border-strong);
}
.stage {
  border-radius: var(--stage-radius, 8px);
  border: 1px solid var(--stage-border, var(--border));
  background: var(--stage-bg, var(--bg-primary));
  color: var(--stage-fg, var(--fg-primary));
  font-family: var(--stage-font-sans, var(--font-sans));
  padding: 20px;
  min-width: 0;
}
.stage-card {
  border-radius: var(--stage-radius, 8px);
  border: 1px solid var(--stage-border, var(--border));
  background: var(--stage-surface, var(--bg-surface));
  box-shadow: var(--stage-shadow, none);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.stage-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.stage-title {
  font-family: var(--stage-font-display, var(--font-display));
  font-size: 1.3rem;
  font-weight: 650;
}
.stage-chip {
  display: inline-flex;
  align-items: center;
  padding-block: 3px;
  padding-inline: 10px;
  border-radius: var(--stage-radius-btn, 6px);
  background: var(--stage-chip-bg);
  color: var(--stage-success);
  font-family: var(--stage-font-mono, var(--font-mono));
  font-size: 12px;
  font-weight: 600;
}
.stage-kpi {
  font-family: var(--stage-font-display, var(--font-display));
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.stage-progress-track {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: var(--stage-raised);
  overflow: hidden;
}
.stage-progress-fill {
  height: 100%;
  background: var(--stage-accent-2);
}
.stage-controls {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 640px) {
  .stage-controls { grid-template-columns: 1fr 1fr; }
}
.stage-label {
  display: block;
  font-size: 0.8rem;
  margin-block-end: 4px;
  color: var(--stage-muted);
}
.stage-input, .dd-trigger {
  width: 100%;
  min-height: 38px;
  padding-block: 7px;
  padding-inline: 11px;
  border-radius: var(--stage-radius-btn, 6px);
  border: 1px solid var(--stage-border);
  background: var(--stage-raised);
  color: var(--stage-fg);
  font-family: var(--stage-font-sans);
  font-size: 0.88rem;
  text-align: start;
}
.stage-input:focus-visible, .dd-trigger:focus-visible {
  outline: 2px solid var(--stage-accent);
  outline-offset: 2px;
}
.dd-wrap { position: relative; }
.dd-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.dd-trigger:hover {
  border-color: var(--stage-fg);
}
.dd-menu {
  position: absolute;
  inset-inline: 0;
  margin-block-start: 4px;
  padding: 4px;
  list-style: none;
  border-radius: var(--stage-radius, 8px);
  border: 1px solid var(--stage-border);
  background: var(--stage-surface);
  box-shadow: var(--stage-shadow);
  z-index: 30;
}
.dd-option {
  padding-block: 8px;
  padding-inline: 10px;
  min-height: 36px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.86rem;
}
.dd-option:hover, .dd-option[aria-selected="true"] {
  background: var(--stage-raised);
}
.dd-option:focus-visible {
  outline: 2px solid var(--stage-accent);
  outline-offset: -2px;
}
.stage-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.stage-btn-primary, .stage-btn-secondary {
  min-height: 38px;
  padding-block: 8px;
  padding-inline: 14px;
  border-radius: var(--stage-radius-btn, 6px);
  font-family: var(--stage-font-sans);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 140ms ease, border-color 140ms ease;
}
.stage-btn-primary {
  background: var(--stage-accent);
  color: var(--stage-accent-fg);
  border: 1px solid transparent;
}
.stage-btn-primary:hover { opacity: 0.9; }
.stage-btn-primary:focus-visible {
  outline: 2px solid var(--stage-fg);
  outline-offset: 2px;
}
.stage-btn-secondary {
  background: var(--stage-raised);
  color: var(--stage-fg);
  border: 1px solid var(--stage-border);
}
.stage-btn-secondary:hover:not(:disabled) { border-color: var(--stage-fg); }
.stage-btn-secondary:focus-visible {
  outline: 2px solid var(--stage-accent);
  outline-offset: 2px;
}
.stage-btn-secondary:disabled { opacity: 0.48; cursor: not-allowed; }
.contrast-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-start: 14px;
  padding-block-start: 12px;
  border-block-start: 1px solid var(--border);
  font-size: 0.8rem;
}
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
  gap: 8px;
  margin-block-start: 14px;
}
.token-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  font-size: 0.78rem;
}
.color-picker {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--border-strong);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
}
.color-picker:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
</head>
<body>
<div class="shell">
  <header class="header-row">
    <div>
      <p class="eyebrow">Phase 2 of 4 · Brand Artisan</p>
      <h1>Lock your design tokens</h1>
      <p class="muted">Compare dark and light archetypes, verify live WCAG 2.2 AA contrast, and copy your 19-key CSS contract.</p>
    </div>
    <div class="toolbar no-print">
      <button type="button" class="btn btn-primary" id="lock-btn">Lock &amp; copy tokens</button>
      <button type="button" class="btn" id="download-css-btn">Download tokens.css</button>
    </div>
  </header>

  <main id="main-content" class="studio-layout">
    <section aria-labelledby="presets-heading">
      <h2 id="presets-heading" style="margin-block-end: 10px;">Archetypes (3 dark · 3 light)</h2>
      <div id="preset-list" class="preset-list" role="radiogroup" aria-labelledby="presets-heading"></div>
    </section>

    <section aria-labelledby="preview-heading" style="min-width: 0;">
      <h2 id="preview-heading" class="sr-only">Interactive component preview and token inspector</h2>
      <div id="stage" class="stage">
        <div class="stage-card">
          <div class="stage-top">
            <div>
              <p class="eyebrow" id="pv-product" style="color: var(--stage-muted);">VibeCraft Studio</p>
              <h3 class="stage-title" id="pv-theme-name">Linear Dark</h3>
            </div>
            <span class="stage-chip" id="pv-chip">WCAG AA Verified</span>
          </div>

          <div>
            <p class="stage-label" id="pv-metric-label">Active pipeline throughput</p>
            <p class="stage-kpi" id="pv-metric-value">99.98%</p>
          </div>

          <div>
            <div class="stage-progress-track" role="progressbar" aria-labelledby="pv-batch-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="76" id="pv-progress">
              <div class="stage-progress-fill" id="pv-progress-fill" style="width: 76%;"></div>
            </div>
            <p class="stage-label" id="pv-batch-label" style="margin-block-start: 6px; margin-block-end: 0;">Release verification gate · 76%</p>
          </div>

          <div class="stage-controls">
            <div>
              <label class="stage-label" for="pv-input" id="pv-field-label">Workspace slug</label>
              <input id="pv-input" class="stage-input" type="text" value="acme-core">
            </div>
            <div class="dd-wrap">
              <span class="stage-label" id="pv-dd-label">Deployment region</span>
              <button type="button" id="dd-btn" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="pv-dd-label dd-btn-text">
                <span id="dd-btn-text">us-east-1 (Virginia)</span>
                <span aria-hidden="true">▾</span>
              </button>
              <ul id="dd-list" class="dd-menu" role="listbox" aria-labelledby="pv-dd-label" hidden></ul>
            </div>
          </div>

          <div class="stage-actions">
            <button type="button" class="stage-btn-primary" id="pv-primary-cta">Deploy release</button>
            <button type="button" class="stage-btn-secondary" id="pv-secondary-cta">Inspect diff</button>
            <button type="button" class="stage-btn-secondary" id="pv-disabled-cta" disabled>Locked</button>
          </div>
        </div>
      </div>

      <div id="contrast-strip" class="contrast-strip" aria-label="Live WCAG 2.2 contrast ratios"></div>
      <div id="token-grid" class="token-grid"></div>

      <div id="fallback-wrap" class="fallback-wrap no-print" hidden>
        <label for="fallback" class="muted mono">Manual copy fallback (Ctrl/Cmd+C):</label>
        <textarea id="fallback" class="fallback-box" readonly></textarea>
      </div>
    </section>
  </main>

  <footer class="footer-bar">
    <span id="live-status" role="status" aria-live="polite">Ready. Select an archetype or customize color swatches.</span>
    <span class="mono">VIBECRAFT LOCK v2 · 19 tokens</span>
  </footer>
</div>

<script>
// @vibecraft-data:start
// @tokens:start
const PREVIEW = {
  defaultTheme: 'linear',
  productLabel: 'Live preview · HookDrain telemetry',
  metricLabel: 'Events deduplicated (24h)',
  metricValue: '128,490',
  progressPct: 82,
  batchLabel: '41 of 50 R2 archive partitions synced',
  fieldLabel: 'Endpoint namespace',
  fieldValue: 'prod-billing-webhooks',
  dropdownLabel: 'Retention policy',
  dropdownOptions: ['90 days · R2 NDJSON', '30 days · Hot D1 only', '365 days · Compliance lock'],
  primaryCta: 'Deploy route',
  secondaryCta: 'Replay sample',
  disabledCta: 'Purge archive'
};

const THEMES = {
  linear: {
    name: 'Linear Dark',
    scheme: 'dark',
    tagline: 'Deep obsidian zinc, crisp periwinkle accent, 1px hairline borders.',
    'bg-primary': '#0b0c0e', 'bg-surface': '#121417', 'bg-raised': '#191c21',
    'fg-primary': '#f4f5f8', 'fg-muted': '#8c93a3',
    border: 'rgba(244, 245, 248, 0.09)',
    accent: '#6e7bf2', 'accent-2': '#38bdf8', 'accent-fg': '#0b0c0e',
    success: '#3dd68c', danger: '#ff7373',
    radius: '8px', 'radius-btn': '6px',
    'font-sans': '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif',
    'font-display': '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'shadow-overlay': '0 8px 24px rgba(0, 0, 0, 0.42)',
    blur: '0px', 'shape-opacity': '0'
  },
  apple: {
    name: 'Apple Clean',
    scheme: 'light',
    tagline: 'Soft alabaster surfaces, SF system blue, pill controls, subtle elevation.',
    'bg-primary': '#f5f5f7', 'bg-surface': '#fafafa', 'bg-raised': '#ebebf0',
    'fg-primary': '#1d1d1f', 'fg-muted': '#54545a',
    border: 'rgba(29, 29, 31, 0.12)',
    accent: '#005bb8', 'accent-2': '#146c2e', 'accent-fg': '#fafafa',
    success: '#146c2e', danger: '#b82018',
    radius: '14px', 'radius-btn': '9999px',
    'font-sans': '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
    'font-display': '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, monospace',
    'shadow-overlay': '0 10px 28px rgba(29, 29, 31, 0.10)',
    blur: '16px', 'shape-opacity': '0'
  },
  editorial: {
    name: 'Editorial Warmth',
    scheme: 'light',
    tagline: 'Warm rag paper, literary serif display, terracotta ink, crisp rules.',
    'bg-primary': '#faf6f0', 'bg-surface': '#f4efe6', 'bg-raised': '#e8e0d3',
    'fg-primary': '#1c1917', 'fg-muted': '#575049',
    border: 'rgba(28, 25, 23, 0.15)',
    accent: '#a33010', 'accent-2': '#186636', 'accent-fg': '#faf6f0',
    success: '#186636', danger: '#a61d14',
    radius: '4px', 'radius-btn': '4px',
    'font-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    'font-display': '"Iowan Old Style", "Palatino Linotype", Georgia, serif',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, monospace',
    'shadow-overlay': '0 8px 20px rgba(28, 25, 23, 0.12)',
    blur: '0px', 'shape-opacity': '0'
  },
  brutalist: {
    name: 'Cyber Brutalist',
    scheme: 'dark',
    tagline: 'Stark carbon surfaces, electric volt punch, zero radius, tabular mono.',
    'bg-primary': '#0c0c0c', 'bg-surface': '#141414', 'bg-raised': '#1e1e1e',
    'fg-primary': '#f2f2ee', 'fg-muted': '#9e9e96',
    border: 'rgba(242, 242, 238, 0.82)',
    accent: '#d4ff33', 'accent-2': '#f2f2ee', 'accent-fg': '#0c0c0c',
    success: '#4ade80', danger: '#fb7185',
    radius: '0px', 'radius-btn': '0px',
    'font-sans': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'font-display': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'shadow-overlay': '0 0 0 1px rgba(242, 242, 238, 0.82)',
    blur: '0px', 'shape-opacity': '0'
  },
  swiss: {
    name: 'Swiss Grid',
    scheme: 'light',
    tagline: 'Archival warm grey, neo-grotesque hierarchy, signal vermilion, 2px grid.',
    'bg-primary': '#f4f4f0', 'bg-surface': '#fbfbf9', 'bg-raised': '#e6e6df',
    'fg-primary': '#141413', 'fg-muted': '#50504b',
    border: 'rgba(20, 20, 19, 0.16)',
    accent: '#bd2419', 'accent-2': '#14692e', 'accent-fg': '#fbfbf9',
    success: '#14692e', danger: '#b01c12',
    radius: '2px', 'radius-btn': '2px',
    'font-sans': '"Helvetica Neue", -apple-system, Arial, system-ui, sans-serif',
    'font-display': '"Helvetica Neue", -apple-system, Arial, system-ui, sans-serif',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, monospace',
    'shadow-overlay': '0 6px 18px rgba(20, 20, 19, 0.09)',
    blur: '0px', 'shape-opacity': '0'
  },
  nocturne: {
    name: 'Nocturne Terminal',
    scheme: 'dark',
    tagline: 'Deep mineral slate, phosphor emerald signal, high-legibility console.',
    'bg-primary': '#080c0a', 'bg-surface': '#0f1613', 'bg-raised': '#16201c',
    'fg-primary': '#e6f2ed', 'fg-muted': '#88a096',
    border: 'rgba(230, 242, 237, 0.12)',
    accent: '#34d399', 'accent-2': '#38bdf8', 'accent-fg': '#07130e',
    success: '#4ade80', danger: '#f87171',
    radius: '6px', 'radius-btn': '4px',
    'font-sans': '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    'font-display': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'font-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    'shadow-overlay': '0 10px 26px rgba(0, 0, 0, 0.48)',
    blur: '0px', 'shape-opacity': '0'
  }
};
// @tokens:end
// @vibecraft-data:end

${SHARED_CLIPBOARD_JS}

const TOKEN_KEYS = [
  'bg-primary', 'bg-surface', 'bg-raised', 'fg-primary', 'fg-muted',
  'border', 'accent', 'accent-2', 'accent-fg', 'success', 'danger',
  'radius', 'radius-btn', 'font-sans', 'font-display', 'font-mono',
  'shadow-overlay', 'blur', 'shape-opacity'
];
const HEX_EDITABLE = new Set(['bg-primary', 'bg-surface', 'bg-raised', 'fg-primary', 'fg-muted', 'accent', 'accent-2', 'accent-fg', 'success', 'danger']);

const themeKeys = THEMES && typeof THEMES === 'object' ? Object.keys(THEMES) : [];
let currentKey = (PREVIEW && PREVIEW.defaultTheme && THEMES[PREVIEW.defaultTheme])
  ? PREVIEW.defaultTheme
  : (themeKeys[0] || '');
let ddIndex = 0;

function parseRgba(str) {
  const s = String(str || '').trim();
  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16), 1];
    if (h.length >= 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1];
  }
  const m = s.match(/rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] !== undefined ? +m[4] : 1];
  return [128, 128, 128, 1];
}

function composite(fg, bg) {
  const a = fg[3];
  return [fg[0]*a + bg[0]*(1-a), fg[1]*a + bg[1]*(1-a), fg[2]*a + bg[2]*(1-a), 1];
}

function lum(c) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

function wcagRatio(a, b) {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function cssRootText() {
  const t = THEMES[currentKey];
  if (!t) return ':root {}\\n';
  return [':root {', ...TOKEN_KEYS.map((k) => '  --' + k + ': ' + t[k] + ';'), '}'].join('\\n') + '\\n';
}

function lockBlockText() {
  const t = THEMES[currentKey];
  if (!t) return 'VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan\\nError: No theme loaded.';
  const lines = [
    'VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan',
    'Archetype: ' + (t.name || currentKey),
    'ThemeId: ' + currentKey
  ];
  if (t.scheme) lines.push('Scheme: ' + t.scheme);
  lines.push('', cssRootText().trimEnd());
  return lines.join('\\n');
}

function applyPreviewCopy() {
  const p = PREVIEW && typeof PREVIEW === 'object' ? PREVIEW : {};
  $('pv-product').textContent = p.productLabel || 'Live preview';
  $('pv-metric-label').textContent = p.metricLabel || 'Primary metric';
  $('pv-metric-value').textContent = p.metricValue || '1,024';
  const pct = Math.max(0, Math.min(100, Number(p.progressPct) || 72));
  $('pv-progress').setAttribute('aria-valuenow', String(pct));
  $('pv-progress-fill').style.width = pct + '%';
  $('pv-batch-label').textContent = p.batchLabel || pct + '% complete';
  $('pv-field-label').textContent = p.fieldLabel || 'Workspace';
  $('pv-input').value = p.fieldValue || 'production';
  $('pv-dd-label').textContent = p.dropdownLabel || 'Profile';
  $('pv-primary-cta').textContent = p.primaryCta || 'Save changes';
  $('pv-secondary-cta').textContent = p.secondaryCta || 'Preview';
  $('pv-disabled-cta').textContent = p.disabledCta || 'Archive';

  const opts = Array.isArray(p.dropdownOptions) && p.dropdownOptions.length > 0
    ? p.dropdownOptions
    : ['Standard profile', 'Strict mode', 'Read-only'];
  const list = $('dd-list');
  list.replaceChildren();
  opts.forEach((optText, idx) => {
    const li = document.createElement('li');
    li.className = 'dd-option';
    li.setAttribute('role', 'option');
    li.id = 'dd-opt-' + idx;
    li.tabIndex = -1;
    li.setAttribute('aria-selected', idx === ddIndex ? 'true' : 'false');
    li.textContent = optText;
    li.addEventListener('click', () => selectDropdownIndex(idx, true));
    li.addEventListener('keydown', (ev) => onOptionKeydown(ev, idx, opts.length));
    list.appendChild(li);
  });
  $('dd-btn-text').textContent = opts[ddIndex] || opts[0];
}

function openDropdown(focusIdx) {
  const list = $('dd-list');
  const btn = $('dd-btn');
  list.hidden = false;
  btn.setAttribute('aria-expanded', 'true');
  const items = list.querySelectorAll('[role="option"]');
  const target = items[Math.max(0, Math.min(items.length - 1, focusIdx))];
  if (target) target.focus();
}

function closeDropdown(returnFocus) {
  $('dd-list').hidden = true;
  $('dd-btn').setAttribute('aria-expanded', 'false');
  if (returnFocus) $('dd-btn').focus();
}

function selectDropdownIndex(idx, closeAfter) {
  const items = $('dd-list').querySelectorAll('[role="option"]');
  if (items.length === 0) return;
  ddIndex = (idx + items.length) % items.length;
  items.forEach((el, i) => el.setAttribute('aria-selected', i === ddIndex ? 'true' : 'false'));
  $('dd-btn-text').textContent = items[ddIndex].textContent;
  if (closeAfter) closeDropdown(true);
}

function onOptionKeydown(ev, idx, total) {
  if (ev.key === 'Escape') {
    ev.preventDefault();
    closeDropdown(true);
  } else if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    openDropdown((idx + 1) % total);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    openDropdown((idx - 1 + total) % total);
  } else if (ev.key === 'Home') {
    ev.preventDefault();
    openDropdown(0);
  } else if (ev.key === 'End') {
    ev.preventDefault();
    openDropdown(total - 1);
  } else if (ev.key === 'Enter' || ev.key === ' ') {
    ev.preventDefault();
    selectDropdownIndex(idx, true);
  }
}

$('dd-btn').addEventListener('click', () => {
  const isOpen = !$('dd-list').hidden;
  if (isOpen) closeDropdown(false);
  else openDropdown(ddIndex);
});

// Handle ArrowDown / ArrowUp when closed (A11Y-04)
$('dd-btn').addEventListener('keydown', (ev) => {
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    const items = $('dd-list').querySelectorAll('[role="option"]');
    if (items.length === 0) return;
    const next = ev.key === 'ArrowDown' ? ddIndex : (ddIndex - 1 + items.length) % items.length;
    openDropdown(next);
  }
});

document.addEventListener('click', (ev) => {
  if (!$('dd-list').hidden && !ev.target.closest('.dd-wrap')) {
    closeDropdown(false);
  }
});

function renderStageAndTokens() {
  const keys = THEMES && typeof THEMES === 'object' ? Object.keys(THEMES) : [];
  const presetList = $('preset-list');
  presetList.replaceChildren();

  if (keys.length === 0) {
    $('stage').replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No theme presets found in THEMES.';
    $('stage').appendChild(empty);
    $('lock-btn').disabled = true;
    $('download-css-btn').disabled = true;
    return;
  }

  const t = THEMES[currentKey] || THEMES[keys[0]];
  keys.forEach((k, idx) => {
    const item = THEMES[k];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', k === currentKey ? 'true' : 'false');
    btn.tabIndex = k === currentKey ? 0 : -1;

    const head = document.createElement('div');
    head.className = 'preset-head';
    const nameSpan = document.createElement('span');
    nameSpan.style.fontWeight = '600';
    nameSpan.textContent = item.name || k;
    head.appendChild(nameSpan);

    const dots = document.createElement('span');
    dots.className = 'swatches';
    ['bg-primary', 'accent', 'success'].forEach((sk) => {
      const d = document.createElement('span');
      d.className = 'swatch-dot';
      d.style.background = item[sk];
      dots.appendChild(d);
    });
    head.appendChild(dots);
    btn.appendChild(head);

    const desc = document.createElement('span');
    desc.className = 'muted';
    desc.style.fontSize = '0.78rem';
    desc.textContent = item.tagline || '';
    btn.appendChild(desc);

    btn.addEventListener('click', () => {
      currentKey = k;
      renderStageAndTokens();
    });
    btn.addEventListener('keydown', (ev) => {
      if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(ev.key)) {
        ev.preventDefault();
        const dir = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : -1;
        currentKey = keys[(idx + dir + keys.length) % keys.length];
        renderStageAndTokens();
        const active = presetList.querySelector('[aria-checked="true"]');
        if (active) active.focus();
      }
    });
    presetList.appendChild(btn);
  });

  const stage = $('stage');
  const okRgb = parseRgba(t.success);
  stage.style.setProperty('--stage-bg', t['bg-primary']);
  stage.style.setProperty('--stage-surface', t['bg-surface']);
  stage.style.setProperty('--stage-raised', t['bg-raised']);
  stage.style.setProperty('--stage-fg', t['fg-primary']);
  stage.style.setProperty('--stage-muted', t['fg-muted']);
  stage.style.setProperty('--stage-border', t.border);
  stage.style.setProperty('--stage-accent', t.accent);
  stage.style.setProperty('--stage-accent-2', t['accent-2']);
  stage.style.setProperty('--stage-accent-fg', t['accent-fg']);
  stage.style.setProperty('--stage-success', t.success);
  stage.style.setProperty('--stage-chip-bg', 'color-mix(in srgb, ' + t.success + ' 12%, transparent)');
  stage.style.setProperty('--stage-radius', t.radius);
  stage.style.setProperty('--stage-radius-btn', t['radius-btn']);
  stage.style.setProperty('--stage-shadow', t['shadow-overlay']);
  stage.style.setProperty('--stage-font-sans', t['font-sans']);
  stage.style.setProperty('--stage-font-display', t['font-display']);
  stage.style.setProperty('--stage-font-mono', t['font-mono']);
  $('pv-theme-name').textContent = t.name || currentKey;

  // Live WCAG 2.2 AA contrast readout
  const bgC = parseRgba(t['bg-primary']);
  const surfRaw = parseRgba(t['bg-surface']);
  const surfC = surfRaw[3] < 1 ? composite(surfRaw, bgC) : surfRaw;
  const fgC = parseRgba(t['fg-primary']);
  const mutC = parseRgba(t['fg-muted']);
  const accC = parseRgba(t.accent);
  const accFgC = parseRgba(t['accent-fg']);
  const chipBgC = composite([okRgb[0], okRgb[1], okRgb[2], 0.12], surfC);

  const pairs = [
    ['Body / Surface', wcagRatio(fgC, surfC), 4.5],
    ['Muted / Surface', wcagRatio(mutC, surfC), 4.5],
    ['CTA Text / Accent', wcagRatio(accFgC, accC), 4.5],
    ['Status Chip', wcagRatio(okRgb, chipBgC), 4.5]
  ];
  const strip = $('contrast-strip');
  strip.replaceChildren();
  const allPass = pairs.every((p) => p[1] >= p[2]);
  $('pv-chip').textContent = allPass ? 'WCAG AA Pass' : 'Contrast Warning';

  pairs.forEach(([label, ratio, min]) => {
    const pass = ratio >= min;
    const badge = document.createElement('span');
    badge.className = pass ? 'tag tag-verified' : 'tag tag-danger';
    badge.textContent = label + ': ' + ratio.toFixed(2) + ':1 ' + (pass ? '✓' : '(<' + min + ')');
    strip.appendChild(badge);
  });

  // Token inspector cells with live color inputs
  const grid = $('token-grid');
  grid.replaceChildren();
  TOKEN_KEYS.forEach((tk) => {
    const cell = document.createElement('div');
    cell.className = 'token-cell';
    const meta = document.createElement('div');
    meta.style.minWidth = '0';
    const keyEl = document.createElement('div');
    keyEl.className = 'mono';
    keyEl.textContent = '--' + tk;
    const valEl = document.createElement('div');
    valEl.className = 'muted mono';
    valEl.style.fontSize = '0.72rem';
    valEl.style.overflow = 'hidden';
    valEl.style.textOverflow = 'ellipsis';
    valEl.style.whiteSpace = 'nowrap';
    valEl.textContent = t[tk];
    meta.appendChild(keyEl);
    meta.appendChild(valEl);
    cell.appendChild(meta);

    if (HEX_EDITABLE.has(tk) && /^#[0-9a-fA-F]{6}$/.test(String(t[tk]).trim())) {
      const inp = document.createElement('input');
      inp.type = 'color';
      inp.className = 'color-picker no-print';
      inp.value = String(t[tk]).trim();
      inp.setAttribute('aria-label', 'Edit token --' + tk);
      inp.addEventListener('input', (ev) => {
        t[tk] = ev.target.value;
        renderStageAndTokens();
      });
      cell.appendChild(inp);
    }
    grid.appendChild(cell);
  });
}

$('lock-btn').addEventListener('click', () => {
  copyWithFallback(lockBlockText(), $('lock-btn'), 'Locked & copied ✓');
});

$('download-css-btn').addEventListener('click', () => {
  downloadBlob('tokens.css', cssRootText(), 'text/css;charset=utf-8');
});

applyPreviewCopy();
renderStageAndTokens();
</script>
</body>
</html>
`;
}

function buildQaDiffHtml() {
  return `<!doctype html>
<html lang="en" dir="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>VibeCraft · Phase 4 QA Audit Report</title>
<style>
${SHARED_BASE_CSS}
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
  margin-block-end: 20px;
}
.kpi-val {
  font-size: 1.55rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-block-top: 4px;
}
.stamp-banner {
  padding: 12px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border-strong);
  background: var(--bg-raised);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  margin-block-end: 20px;
  overflow-x: auto;
}
.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 14px;
}
.chip-btn {
  min-height: 36px;
  padding-block: 6px;
  padding-inline: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
.chip-btn:hover {
  border-color: var(--border-strong);
  background: var(--bg-raised);
}
.chip-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.chip-btn[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.diff-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.diff-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  overflow: hidden;
}
.diff-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-raised);
  border-block-end: 1px solid var(--border);
}
.diff-pre {
  margin: 0;
  padding: 12px 14px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.55;
}
.diff-pre:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.line-del {
  display: block;
  background: var(--danger-soft);
  color: var(--danger);
  padding-inline: 6px;
}
.line-add {
  display: block;
  background: var(--success-soft);
  color: var(--success);
  padding-inline: 6px;
}
.line-ctx {
  display: block;
  color: var(--fg-muted);
  padding-inline: 6px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-block-start: 20px;
}
@media (min-width: 820px) {
  .two-col { grid-template-columns: 1fr 1fr; }
}
.file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-block: 6px;
  border-block-end: 1px solid var(--border);
  font-size: 0.84rem;
}
</style>
</head>
<body>
<div class="shell">
  <header class="header-row">
    <div>
      <p class="eyebrow">Phase 4 of 4 · QA Auditor</p>
      <h1 id="report-title">QA Audit &amp; Deslop Report</h1>
      <p class="muted" id="verdict-line"></p>
    </div>
    <div class="toolbar no-print">
      <button type="button" class="btn btn-primary" id="copy-stamp-btn">Copy QA stamp</button>
      <button type="button" class="btn" id="download-json-btn">Download qa-report.json</button>
    </div>
  </header>

  <main id="main-content">
    <div id="stamp-banner" class="stamp-banner" role="region" aria-label="Measured QA stamp"></div>

    <section aria-labelledby="metrics-heading">
      <h2 id="metrics-heading" class="sr-only">Audit summary metrics</h2>
      <div id="kpi-grid" class="kpi-grid"></div>
    </section>

    <section aria-labelledby="diffs-heading">
      <h2 id="diffs-heading" style="margin-block-end: 10px;">Automated repair hunks</h2>
      <div id="filter-row" class="filter-row no-print" role="toolbar" aria-label="Filter repairs by category"></div>
      <div id="diff-list" class="diff-stack"></div>
    </section>

    <div class="two-col">
      <section class="panel" aria-labelledby="tokens-heading">
        <h2 id="tokens-heading" style="margin-block-end: 10px;">Token adherence by file</h2>
        <div id="token-files"></div>
      </section>
      <section class="panel" aria-labelledby="gotchas-heading">
        <h2 id="gotchas-heading" style="margin-block-end: 10px;">Verified gotcha mitigations</h2>
        <div id="gotcha-fixes"></div>
      </section>
    </div>

    <div id="fallback-wrap" class="fallback-wrap no-print" hidden>
      <label for="fallback" class="muted mono">Manual copy fallback (Ctrl/Cmd+C):</label>
      <textarea id="fallback" class="fallback-box" readonly></textarea>
    </div>
  </main>

  <footer class="footer-bar">
    <span id="live-status" role="status" aria-live="polite">Measured QA report loaded.</span>
    <span class="mono">Audit Engine v2 (VC000..VC018)</span>
  </footer>
</div>

<script>
// @vibecraft-data:start
// @audit-data:start
// Auditor agent: replace REPORT with real measured counts only.
const REPORT = {
  project: 'HookDrain · Phase 4 QA Audit',
  passesRun: 2,
  openSlop: 0,
  openGotchas: 0,
  syntax: {
    files: 8,
    errors: 0,
    warnings: 0,
    checker: 'tsc --noEmit --strict'
  },
  tokens: {
    files: [
      { file: 'src/worker/index.ts', refs: 12, hardcoded: 0 },
      { file: 'src/ui/dashboard.tsx', refs: 34, hardcoded: 0 },
      { file: 'src/ui/filter-bar.css', refs: 18, hardcoded: 0 }
    ]
  },
  diffs: [
    {
      category: 'tokens',
      file: 'src/ui/dashboard.tsx',
      why: 'Replaced literal hex badge border with semantic var(--success) token (VC001).',
      lines: [
        { t: 'del', s: '  <span style={{ borderColor: "#10b981" }}>Healthy</span>' },
        { t: 'add', s: '  <span style={{ borderColor: "var(--success)" }}>Healthy</span>' }
      ]
    },
    {
      category: 'style',
      file: 'src/ui/filter-bar.css',
      why: 'Scoped wildcard transition to explicit properties (VC006).',
      lines: [
        { t: 'del', s: '  transition: all 150ms ease;' },
        { t: 'add', s: '  transition: background-color 150ms ease, border-color 150ms ease;' }
      ]
    },
    {
      category: 'comments',
      file: 'src/worker/rollup-stream.ts',
      why: 'Removed self-restating narration comment (VC017).',
      lines: [
        { t: 'del', s: '  // increment row counter by 1' },
        { t: 'ctx', s: '  rowCount += 1;' }
      ]
    }
  ],
  gotchas: [
    {
      issue: '128 MB Worker isolate memory ceiling on NDJSON archive rollups',
      mitigation: '2 MB bodyLimit() on /ingest + TransformStream chunked R2 multipart upload.',
      file: 'src/worker/rollup-stream.ts',
      verified: true
    },
    {
      issue: 'CLI progress output corrupting piped JSON stdout',
      mitigation: 'Diagnostics routed exclusively to process.stderr; stdout emits NDJSON only.',
      file: 'src/cli/drain.ts',
      verified: true
    }
  ]
};
// @audit-data:end
// @vibecraft-data:end

${SHARED_CLIPBOARD_JS}

const CATEGORY_LABELS = {
  all: 'All',
  comments: 'Comments',
  defensive: 'Defensive checks',
  types: 'Type safety',
  helpers: 'Helpers',
  tokens: 'Tokens',
  placeholder: 'Placeholders',
  style: 'Craft & motion',
  prose: 'Prose scrub'
};

let activeCategory = 'all';

function computeSummary() {
  if (!REPORT || typeof REPORT !== 'object') {
    return { valid: false };
  }
  const syntax = REPORT.syntax || {};
  const checker = String(syntax.checker || 'not run').trim();
  const checkerRan = checker.length > 0 && !/^not\\s+run\\b/i.test(checker);
  const syntaxErrors = Math.max(0, Number(syntax.errors) || 0);

  const rawFiles = (REPORT.tokens && Array.isArray(REPORT.tokens.files)) ? REPORT.tokens.files : [];
  // Exclude token definition files from denominator so definitions do not inflate score (PRM-11)
  const componentFiles = rawFiles.filter((f) => {
    const fname = String(f.file || f.name || '');
    return f.note !== 'definitions' && !/tokens\\.css$/i.test(fname);
  });

  const totalRefs = componentFiles.reduce((s, f) => s + Math.max(0, Number(f.refs) || 0), 0);
  const hardcoded = componentFiles.reduce((s, f) => s + Math.max(0, Number(f.hardcoded) || 0), 0);
  const tokenPct = totalRefs === 0
    ? (hardcoded === 0 ? 100 : 0)
    : Math.max(0, Math.round(((totalRefs - hardcoded) / totalRefs) * 100));

  const openSlop = Math.max(0, Number(REPORT.openSlop) || 0);
  const openGotchas = Math.max(0, Number(REPORT.openGotchas) || 0);
  const remainingSlop = openSlop + openGotchas;

  const syntaxSlot = !checkerRan
    ? '[Syntax: Not Run]'
    : '[Syntax: ' + syntaxErrors + (syntaxErrors === 1 ? ' Error]' : ' Errors]');
  const tokenSlot = '[Tokens: ' + tokenPct + '% Validated]';
  const slopSlot = remainingSlop === 0 ? '[Slop: Scrubbed]' : '[Slop: ' + remainingSlop + ' Remaining]';

  const allClean = checkerRan && syntaxErrors === 0 && hardcoded === 0 && remainingSlop === 0;
  const prefix = allClean ? '✓ VibeCraft QA' : '! VibeCraft QA';
  const stamp = prefix + ' · ' + syntaxSlot + ' · ' + tokenSlot + ' · ' + slopSlot;

  return {
    valid: true,
    checker,
    checkerRan,
    syntaxErrors,
    componentFiles,
    totalRefs,
    hardcoded,
    tokenPct,
    remainingSlop,
    allClean,
    stamp
  };
}

function makeCard(label, value, detail, badgeCls, badgeText) {
  const box = document.createElement('div');
  box.className = 'panel';
  const top = document.createElement('div');
  top.style.display = 'flex';
  top.style.justifyContent = 'space-between';
  top.style.alignItems = 'center';
  top.style.gap = '6px';
  const lbl = document.createElement('span');
  lbl.className = 'muted';
  lbl.style.fontSize = '0.82rem';
  lbl.textContent = label;
  top.appendChild(lbl);
  if (badgeText) {
    const b = document.createElement('span');
    b.className = badgeCls;
    b.textContent = badgeText;
    top.appendChild(b);
  }
  box.appendChild(top);
  const val = document.createElement('div');
  val.className = 'kpi-val mono';
  val.textContent = value;
  box.appendChild(val);
  const sub = document.createElement('p');
  sub.className = 'muted';
  sub.style.fontSize = '0.78rem';
  sub.textContent = detail;
  box.appendChild(sub);
  return box;
}

function renderDiffs() {
  const diffs = Array.isArray(REPORT && REPORT.diffs) ? REPORT.diffs : [];
  const filterRow = $('filter-row');
  const diffList = $('diff-list');
  filterRow.replaceChildren();
  diffList.replaceChildren();

  const presentCats = ['all', ...new Set(diffs.map((d) => d.category || 'style'))];
  presentCats.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip-btn';
    btn.setAttribute('aria-pressed', cat === activeCategory ? 'true' : 'false');
    btn.textContent = CATEGORY_LABELS[cat] || cat;
    btn.addEventListener('click', () => {
      activeCategory = cat;
      renderDiffs();
    });
    filterRow.appendChild(btn);
  });

  const visible = activeCategory === 'all' ? diffs : diffs.filter((d) => (d.category || 'style') === activeCategory);
  if (visible.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = diffs.length === 0
      ? 'Zero repair diffs needed; code passed all static checks on the first pass.'
      : 'No repair hunks in this category.';
    diffList.appendChild(empty);
    return;
  }

  visible.forEach((d) => {
    const card = document.createElement('article');
    card.className = 'diff-card';
    const head = document.createElement('div');
    head.className = 'diff-head';
    const fileSpan = document.createElement('span');
    fileSpan.className = 'mono';
    fileSpan.style.fontSize = '0.82rem';
    fileSpan.textContent = d.file || 'unknown-file';
    const catSpan = document.createElement('span');
    catSpan.className = 'tag tag-inferred';
    catSpan.textContent = CATEGORY_LABELS[d.category] || d.category || 'Repair';
    head.appendChild(fileSpan);
    head.appendChild(catSpan);
    card.appendChild(head);

    if (d.why || d.reason) {
      const why = document.createElement('p');
      why.className = 'muted';
      why.style.padding = '8px 14px 0 14px';
      why.style.fontSize = '0.82rem';
      why.textContent = d.why || d.reason;
      card.appendChild(why);
    }

    const pre = document.createElement('pre');
    pre.className = 'diff-pre';
    pre.tabIndex = 0;
    const lines = Array.isArray(d.lines)
      ? d.lines
      : [
          ...(d.before ? String(d.before).split('\\n').map((s) => ({ t: 'del', s })) : []),
          ...(d.after ? String(d.after).split('\\n').map((s) => ({ t: 'add', s })) : [])
        ];
    lines.forEach((ln) => {
      const span = document.createElement('span');
      const prefix = ln.t === 'del' ? '- ' : ln.t === 'add' ? '+ ' : '  ';
      span.className = ln.t === 'del' ? 'line-del' : ln.t === 'add' ? 'line-add' : 'line-ctx';
      span.textContent = prefix + (ln.s || '');
      pre.appendChild(span);
    });
    card.appendChild(pre);
    diffList.appendChild(card);
  });
}

function renderReport() {
  const s = computeSummary();
  if (!s.valid) {
    $('stamp-banner').textContent = 'Error: REPORT object is missing or invalid.';
    return;
  }

  $('report-title').textContent = REPORT.project || 'QA Audit Report';
  $('verdict-line').textContent = s.allClean
    ? 'All compiler, token, gotcha, and anti-slop gates passed.'
    : !s.checkerRan
      ? 'Static checks evaluated; compiler check was not run in this environment.'
      : 'Action required: unresolved findings remain open.';
  $('stamp-banner').textContent = s.stamp;

  const kpi = $('kpi-grid');
  kpi.replaceChildren();
  kpi.appendChild(
    makeCard(
      'Syntax & Types',
      s.checkerRan ? String(s.syntaxErrors) + ' err' : 'Not Run',
      s.checker,
      !s.checkerRan ? 'tag tag-warn' : s.syntaxErrors === 0 ? 'tag tag-verified' : 'tag tag-danger',
      !s.checkerRan ? 'Not Run' : s.syntaxErrors === 0 ? 'Pass' : 'Blocked'
    )
  );
  kpi.appendChild(
    makeCard(
      'Token Adherence',
      s.tokenPct + '%',
      s.hardcoded + ' hardcoded across ' + s.totalRefs + ' styled refs',
      s.hardcoded === 0 ? 'tag tag-verified' : 'tag tag-danger',
      s.hardcoded === 0 ? 'Validated' : s.hardcoded + ' Violations'
    )
  );
  kpi.appendChild(
    makeCard(
      'Open Slop & Gotchas',
      String(s.remainingSlop),
      (Array.isArray(REPORT.diffs) ? REPORT.diffs.length : 0) + ' automated repairs applied',
      s.remainingSlop === 0 ? 'tag tag-verified' : 'tag tag-warn',
      s.remainingSlop === 0 ? 'Scrubbed' : 'Needs Review'
    )
  );

  renderDiffs();

  const tfRoot = $('token-files');
  tfRoot.replaceChildren();
  if (s.componentFiles.length === 0) {
    tfRoot.appendChild(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'No styled component files recorded.' }));
  } else {
    s.componentFiles.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'file-row';
      const nameEl = document.createElement('span');
      nameEl.className = 'mono';
      nameEl.textContent = f.file || f.name || 'file';
      const bad = Math.max(0, Number(f.hardcoded) || 0);
      const statEl = document.createElement('span');
      statEl.className = bad === 0 ? 'tag tag-verified' : 'tag tag-danger';
      statEl.textContent = bad === 0 ? (f.refs || 0) + ' refs · clean' : bad + ' hardcoded';
      row.appendChild(nameEl);
      row.appendChild(statEl);
      tfRoot.appendChild(row);
    });
  }

  const gfRoot = $('gotcha-fixes');
  gfRoot.replaceChildren();
  const gotchaList = Array.isArray(REPORT.gotchas)
    ? REPORT.gotchas
    : Array.isArray(REPORT.fixes)
      ? REPORT.fixes.map((x) => ({ issue: x.title, mitigation: x.detail, verified: true }))
      : [];
  if (gotchaList.length === 0) {
    gfRoot.appendChild(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'No gotcha items recorded.' }));
  } else {
    gotchaList.forEach((g) => {
      const item = document.createElement('div');
      item.style.paddingBlock = '8px';
      item.style.borderBlockEnd = '1px solid var(--border)';
      const top = document.createElement('div');
      top.style.display = 'flex';
      top.style.justifyContent = 'space-between';
      top.style.gap = '8px';
      const title = document.createElement('strong');
      title.style.fontSize = '0.85rem';
      title.textContent = g.issue || 'Gotcha';
      const badge = document.createElement('span');
      badge.className = g.verified === false ? 'tag tag-danger' : 'tag tag-verified';
      badge.textContent = g.verified === false ? 'Open' : 'Verified';
      top.appendChild(title);
      top.appendChild(badge);
      item.appendChild(top);
      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.style.fontSize = '0.8rem';
      detail.style.marginBlockStart = '4px';
      detail.textContent = (g.mitigation || '') + (g.file ? ' (' + g.file + ')' : '');
      item.appendChild(detail);
      gfRoot.appendChild(item);
    });
  }
}

$('copy-stamp-btn').addEventListener('click', () => {
  const s = computeSummary();
  copyWithFallback(s.valid ? s.stamp : 'QA report invalid', $('copy-stamp-btn'), 'Copied stamp ✓');
});

$('download-json-btn').addEventListener('click', () => {
  const s = computeSummary();
  const out = JSON.stringify({ stamp: s.stamp, report: REPORT }, null, 2) + '\\n';
  downloadBlob('qa-report.json', out, 'application/json;charset=utf-8');
});

renderReport();
</script>
</body>
</html>
`;
}

function buildLaunchpadHtml() {
  return `<!doctype html>
<html lang="en" dir="auto">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:,">
<title>VibeCraft · Launchpad</title>
<script src="${MERMAID_URL}" integrity="${MERMAID_SRI}" crossorigin="anonymous"></script>
<style>
${SHARED_BASE_CSS}
.hero-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-block-end: 20px;
  padding-block-end: 16px;
  border-block-end: 1px solid var(--border);
}
.hero-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.logo-frame {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--radius);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
}
.logo-frame svg {
  width: 100%;
  height: 100%;
}
.tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-block-end: 16px;
}
.tab-btn {
  min-height: 38px;
  padding-block: 8px;
  padding-inline: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 550;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
.tab-btn:hover {
  border-color: var(--border-strong);
  background: var(--bg-raised);
}
.tab-btn:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.tab-btn[aria-selected="true"] {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--accent);
}
.code-block {
  margin: 0;
  padding: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  color: var(--fg-primary);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre;
}
.code-block:focus-visible, .diagram-box:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.diagram-box {
  padding: 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-primary);
  overflow-x: auto;
}
.sec-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-block-end: 10px;
}
.stack-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.steps-list {
  margin: 0;
  padding-inline-start: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
@media print {
  .tab-panel[hidden] { display: block !important; margin-block-start: 16px; }
}
</style>
</head>
<body>
<div class="shell">
  <header class="hero-row">
    <div class="hero-brand">
      <div id="logo-box" class="logo-frame" aria-hidden="true"></div>
      <div style="min-width: 0;">
        <p class="eyebrow" id="phase-label">Phase 4 of 4 · Launchpad</p>
        <h1 id="title-heading">Project Launchpad</h1>
        <p class="muted" id="tagline-text"></p>
      </div>
    </div>
    <div class="toolbar no-print">
      <button type="button" class="btn btn-primary" id="copy-all-btn">Copy full bundle</button>
      <button type="button" class="btn" id="download-md-btn">Download launchpad-bundle.md</button>
    </div>
  </header>

  <main id="main-content">
    <div id="tablist" class="tab-list no-print" role="tablist" aria-label="Launchpad sections"></div>
    <div id="panels-root"></div>

    <div id="fallback-wrap" class="fallback-wrap no-print" hidden>
      <label for="fallback" class="muted mono">Manual copy fallback (Ctrl/Cmd+C):</label>
      <textarea id="fallback" class="fallback-box" readonly></textarea>
    </div>
  </main>

  <footer class="footer-bar">
    <span id="live-status" role="status" aria-live="polite">Launchpad ready.</span>
    <span class="mono" id="mermaid-mode">Sanitized SVG · Offline-ready</span>
  </footer>
</div>

<script>
// @vibecraft-data:start
// Architect (Phase 3 draft) or Builder (Phase 4 final): replace LAUNCH object only.
const LAUNCH = {
  phase: 'Phase 4 of 4 · Launchpad',
  title: 'HookDrain is ready to launch',
  name: 'HookDrain',
  tagline: 'Idempotent edge webhook capture with streaming R2 NDJSON archives and local CLI replay.',
  contractsLang: 'ts',
  readme: 'HookDrain validates incoming webhook signatures at the Cloudflare edge, deduplicates deliveries in D1 SQLite, and streams daily NDJSON archives to R2 without buffering payloads in isolate RAM.',
  commands: 'npm install\\nnpm test\\nnpx wrangler d1 migrations apply hookdrain-db --local\\nnpx wrangler dev',
  tree: [
    'hookdrain/',
    '├── src/contracts/events.ts      # Strict WebhookEnvelope and Result<T, DrainError> types',
    '├── src/worker/index.ts          # Hono v4 routes + 2 MB bodyLimit + HMAC verification',
    '├── src/worker/rollup-stream.ts  # TransformStream NDJSON archive writer to R2',
    '├── src/cli/drain.ts             # Node 22 parseArgs CLI (stderr logs, stdout NDJSON)',
    '└── src/styles/tokens.css        # Locked 19-key :root design tokens'
  ].join('\\n'),
  flow: [
    'flowchart LR',
    '  Sender["Webhook Producer"] -->|"POST <= 2 MB + HMAC"| Worker["Hono Edge Worker"]',
    '  Worker -->|"INSERT OR IGNORE"| D1[("Cloudflare D1")]',
    '  D1 -->|"500-row cursor"| Stream["TransformStream"]',
    '  Stream -->|"Multipart NDJSON"| R2[("Cloudflare R2")]'
  ].join('\\n'),
  sequence: [
    'sequenceDiagram',
    '  participant P as Producer',
    '  participant W as Hono Worker',
    '  participant D as D1 SQLite',
    '  P->>W: POST /ingest (Idempotency-Key, X-Signature)',
    '  W->>W: Verify 2 MB cap + constant-time HMAC',
    '  W->>D: INSERT OR IGNORE event',
    '  D-->>W: changes (1 new | 0 duplicate)',
    '  W-->>P: 202 Accepted'
  ].join('\\n'),
  contracts: [
    'export type DrainError =',
    '  | { readonly code: "PAYLOAD_TOO_LARGE"; readonly limitBytes: number }',
    '  | { readonly code: "INVALID_SIGNATURE" };',
    '',
    'export interface WebhookEnvelope {',
    '  readonly idempotencyKey: string;',
    '  readonly source: string;',
    '  readonly receivedAtIso: string;',
    '  readonly payloadJson: string;',
    '}'
  ].join('\\n'),
  logo: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="52" height="52" rx="12" fill="var(--bg-raised)" stroke="var(--border-strong)" stroke-width="2"/><polygon points="18,20 46,20 35,34 35,46 29,42 29,34" fill="var(--accent)"/><circle cx="44" cy="44" r="4" fill="var(--fg-primary)"/></svg>',
  midjourney: 'Minimalist geometric developer tool emblem, flat vector shapes on deep mineral slate background, crisp phosphor emerald accent, zero gradients --v 6.1',
  dalle: 'Flat geometric app icon for a webhook pipeline tool named HookDrain, clean vector funnel and node mark on dark slate card, no text, no gradients.',
  nextSteps: [
    'Configure production HMAC signing secret via wrangler secret put WEBHOOK_SECRET.',
    'Schedule a 15-minute Cron Trigger to flush unarchived D1 batches to R2.',
    'Add dead-letter replay filtering by event source in drain CLI.'
  ]
};
// @vibecraft-data:end

${SHARED_CLIPBOARD_JS}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SAFE_SVG_TAGS = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path']);
const SAFE_SVG_ATTRS = new Set([
  'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
  'cx', 'cy', 'r', 'rx', 'ry', 'd', 'points',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-opacity',
  'opacity', 'transform', 'role', 'aria-label', 'aria-hidden', 'focusable'
]);

function fallbackLogoSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', '8');
  rect.setAttribute('y', '8');
  rect.setAttribute('width', '48');
  rect.setAttribute('height', '48');
  rect.setAttribute('rx', '10');
  rect.setAttribute('fill', 'var(--bg-raised)');
  rect.setAttribute('stroke', 'var(--accent)');
  rect.setAttribute('stroke-width', '2');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M20 22 L31 44 L44 22');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--fg-primary)');
  path.setAttribute('stroke-width', '5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(rect);
  svg.appendChild(path);
  return svg;
}

/**
 * Strict allowlist SVG sanitizer (SEC-02): blocks script, on* handlers, foreignObject,
 * external hrefs, and HTML injection while preserving safe geometric primitives.
 */
function renderSanitizedLogo(rawSvg) {
  const box = $('logo-box');
  box.replaceChildren();
  if (typeof rawSvg !== 'string' || !rawSvg.trim()) {
    box.appendChild(fallbackLogoSvg());
    return;
  }
  try {
    const parser = new DOMParser();
    let doc = parser.parseFromString(rawSvg, 'image/svg+xml');
    let root = doc.querySelector('parsererror') ? null : doc.documentElement;
    if (!root || root.tagName.toLowerCase() !== 'svg') {
      // Inert HTML document parse fallback (never executes scripts or fetches images)
      doc = parser.parseFromString(rawSvg, 'text/html');
      root = doc.querySelector('svg');
    }
    if (!root || root.tagName.toLowerCase() !== 'svg') {
      box.appendChild(fallbackLogoSvg());
      return;
    }

    const cloneClean = (srcNode) => {
      const tag = srcNode.tagName ? srcNode.tagName.toLowerCase() : '';
      if (!SAFE_SVG_TAGS.has(tag)) return null;
      const cleanEl = document.createElementNS(SVG_NS, tag);
      for (const attr of Array.from(srcNode.attributes || [])) {
        const name = attr.name;
        const val = String(attr.value || '').trim();
        if (!SAFE_SVG_ATTRS.has(name)) continue;
        if (/^(?:javascript|data|vbscript):/i.test(val) || /url\\s*\\(/i.test(val)) continue;
        cleanEl.setAttribute(name, val);
      }
      for (const child of Array.from(srcNode.children || [])) {
        const cleanChild = cloneClean(child);
        if (cleanChild) cleanEl.appendChild(cleanChild);
      }
      return cleanEl;
    };

    const safeSvg = cloneClean(root);
    if (!safeSvg || safeSvg.children.length === 0) {
      box.appendChild(fallbackLogoSvg());
      return;
    }
    if (!safeSvg.getAttribute('viewBox')) {
      safeSvg.setAttribute('viewBox', '0 0 64 64');
    }
    box.appendChild(safeSvg);
  } catch (_err) {
    box.appendChild(fallbackLogoSvg());
  }
}

const CONTRACT_LABELS = {
  ts: 'TypeScript contracts',
  rust: 'Rust type contracts',
  python: 'Python schema contracts',
  go: 'Go interface contracts',
  sql: 'SQL schema contracts'
};

function bundleMarkdown() {
  const d = LAUNCH && typeof LAUNCH === 'object' ? LAUNCH : {};
  const projectName = d.name || d.title || 'Project';
  const lang = String(d.contractsLang || 'ts').toLowerCase();
  const steps = Array.isArray(d.nextSteps) ? d.nextSteps : [];
  return [
    '# ' + projectName + ' Launchpad',
    '',
    d.tagline || '',
    '',
    '## Quickstart',
    '',
    d.readme || '',
    '',
    '\`\`\`sh',
    d.commands || '',
    '\`\`\`',
    '',
    '## File Tree',
    '',
    '\`\`\`text',
    d.tree || '',
    '\`\`\`',
    '',
    '## System Flow (Mermaid)',
    '',
    '\`\`\`mermaid',
    d.flow || '',
    '\`\`\`',
    '',
    '## Critical Sequence (Mermaid)',
    '',
    '\`\`\`mermaid',
    d.sequence || '',
    '\`\`\`',
    '',
    '## ' + (CONTRACT_LABELS[lang] || 'Domain contracts'),
    '',
    '\`\`\`' + lang,
    d.contracts || '',
    '\`\`\`',
    '',
    '## Next Steps',
    '',
    ...steps.map((s, i) => (i + 1) + '. ' + s)
  ].join('\\n') + '\\n';
}

function makeCodeSection(title, codeText, copyLabel) {
  const wrap = document.createElement('section');
  wrap.className = 'panel';
  const head = document.createElement('div');
  head.className = 'sec-head';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  head.appendChild(h2);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn no-print';
  btn.textContent = copyLabel || 'Copy';
  btn.addEventListener('click', () => copyWithFallback(codeText || '', btn, 'Copied ✓'));
  head.appendChild(btn);
  wrap.appendChild(head);

  const pre = document.createElement('pre');
  pre.className = 'code-block';
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', title + ' code block');
  pre.textContent = codeText || '(empty)';
  wrap.appendChild(pre);
  return wrap;
}

async function renderDiagramInto(container, idSuffix, sourceText) {
  container.replaceChildren();
  const src = String(sourceText || '').trim();
  if (!src) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No diagram defined.';
    container.appendChild(p);
    return;
  }

  if (typeof window.mermaid !== 'undefined' && window.mermaid && typeof window.mermaid.render === 'function') {
    try {
      const out = await window.mermaid.render('vc-mmd-' + idSuffix, src);
      const parser = new DOMParser();
      const doc = parser.parseFromString(out.svg, 'image/svg+xml');
      if (!doc.querySelector('parsererror') && doc.documentElement) {
        container.appendChild(document.importNode(doc.documentElement, true));
        $('mermaid-mode').textContent = 'Mermaid 11.4.1 (SRI verified) · Sanitized SVG';
        return;
      }
    } catch (err) {
      container.dataset.mermaidFallback = String((err && err.message) || 'render-error');
    }
  }

  $('mermaid-mode').textContent = 'Offline diagram source view · Sanitized SVG';
  const note = document.createElement('p');
  note.className = 'muted mono';
  note.style.fontSize = '0.76rem';
  note.style.marginBlockEnd = '8px';
  note.textContent = 'Mermaid source (offline / fallback view):';
  container.appendChild(note);
  const pre = document.createElement('pre');
  pre.className = 'code-block';
  pre.tabIndex = 0;
  pre.setAttribute('aria-label', 'Mermaid diagram source');
  pre.textContent = src;
  container.appendChild(pre);
}

let activeTabIdx = 0;

async function initLaunchpad() {
  if (!LAUNCH || typeof LAUNCH !== 'object') {
    $('panels-root').appendChild(
      Object.assign(document.createElement('div'), {
        className: 'empty-state',
        textContent: 'LAUNCH payload is missing or malformed.'
      })
    );
    $('copy-all-btn').disabled = true;
    $('download-md-btn').disabled = true;
    return;
  }

  const projectName = LAUNCH.name || LAUNCH.title || 'Project';
  $('phase-label').textContent = LAUNCH.phase || 'Phase 4 of 4 · Launchpad';
  $('title-heading').textContent = LAUNCH.title || (projectName + ' is ready to launch');
  $('tagline-text').textContent = LAUNCH.tagline || '';
  renderSanitizedLogo(LAUNCH.logo);

  if (typeof window.mermaid !== 'undefined' && window.mermaid) {
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: prefersLight ? 'neutral' : 'dark'
    });
  }

  const langKey = String(LAUNCH.contractsLang || 'ts').toLowerCase();
  const contractsTitle = CONTRACT_LABELS[langKey] || 'Domain contracts';

  const tabs = [
    { id: 'overview', label: 'Runbook & Tree' },
    { id: 'architecture', label: 'Architecture Diagrams' },
    { id: 'contracts', label: contractsTitle },
    { id: 'brand', label: 'Brand & Next Steps' }
  ];

  const tablist = $('tablist');
  const panelsRoot = $('panels-root');
  tablist.replaceChildren();
  panelsRoot.replaceChildren();

  const panelEls = [];

  tabs.forEach((tab, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn';
    btn.id = 'tab-' + tab.id;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-controls', 'panel-' + tab.id);
    btn.setAttribute('aria-selected', idx === activeTabIdx ? 'true' : 'false');
    btn.tabIndex = idx === activeTabIdx ? 0 : -1;
    btn.textContent = tab.label;

    btn.addEventListener('click', () => activateTab(idx, false));
    btn.addEventListener('keydown', (ev) => {
      if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) {
        ev.preventDefault();
        let next = idx;
        if (ev.key === 'ArrowRight') next = (idx + 1) % tabs.length;
        else if (ev.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
        else if (ev.key === 'Home') next = 0;
        else if (ev.key === 'End') next = tabs.length - 1;
        activateTab(next, true);
      }
    });
    tablist.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'panel-' + tab.id;
    panel.className = 'tab-panel stack-sections';
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', btn.id);
    panel.hidden = idx !== activeTabIdx;
    panelEls.push(panel);
    panelsRoot.appendChild(panel);
  });

  function activateTab(idx, moveFocus) {
    activeTabIdx = idx;
    const btns = tablist.querySelectorAll('[role="tab"]');
    btns.forEach((b, i) => {
      b.setAttribute('aria-selected', i === idx ? 'true' : 'false');
      b.tabIndex = i === idx ? 0 : -1;
      if (i === idx && moveFocus) b.focus();
    });
    panelEls.forEach((p, i) => {
      p.hidden = i !== idx;
    });
  }

  // Panel 0: Runbook & Tree
  const readmePanel = document.createElement('section');
  readmePanel.className = 'panel';
  const rHead = document.createElement('h2');
  rHead.style.marginBlockEnd = '8px';
  rHead.textContent = 'Operator summary';
  readmePanel.appendChild(rHead);
  const rBody = document.createElement('p');
  rBody.textContent = LAUNCH.readme || 'No operator summary provided.';
  readmePanel.appendChild(rBody);
  panelEls[0].appendChild(readmePanel);
  panelEls[0].appendChild(makeCodeSection('Commands', LAUNCH.commands, 'Copy commands'));
  panelEls[0].appendChild(makeCodeSection('Project file tree', LAUNCH.tree, 'Copy tree'));

  // Panel 1: Architecture Diagrams
  const flowSec = document.createElement('section');
  flowSec.className = 'panel';
  const flowHead = document.createElement('div');
  flowHead.className = 'sec-head';
  flowHead.appendChild(Object.assign(document.createElement('h2'), { textContent: 'Component & data flow' }));
  const copyFlowBtn = document.createElement('button');
  copyFlowBtn.type = 'button';
  copyFlowBtn.className = 'btn no-print';
  copyFlowBtn.textContent = 'Copy Mermaid';
  copyFlowBtn.addEventListener('click', () => copyWithFallback(LAUNCH.flow || '', copyFlowBtn, 'Copied ✓'));
  flowHead.appendChild(copyFlowBtn);
  flowSec.appendChild(flowHead);
  const flowBox = document.createElement('div');
  flowBox.className = 'diagram-box';
  flowSec.appendChild(flowBox);
  panelEls[1].appendChild(flowSec);

  const seqSec = document.createElement('section');
  seqSec.className = 'panel';
  const seqHead = document.createElement('div');
  seqHead.className = 'sec-head';
  seqHead.appendChild(Object.assign(document.createElement('h2'), { textContent: 'Critical-path sequence' }));
  const copySeqBtn = document.createElement('button');
  copySeqBtn.type = 'button';
  copySeqBtn.className = 'btn no-print';
  copySeqBtn.textContent = 'Copy Mermaid';
  copySeqBtn.addEventListener('click', () => copyWithFallback(LAUNCH.sequence || '', copySeqBtn, 'Copied ✓'));
  seqHead.appendChild(copySeqBtn);
  seqSec.appendChild(seqHead);
  const seqBox = document.createElement('div');
  seqBox.className = 'diagram-box';
  seqSec.appendChild(seqBox);
  panelEls[1].appendChild(seqSec);

  // Panel 2: Contracts
  panelEls[2].appendChild(makeCodeSection(contractsTitle, LAUNCH.contracts, 'Copy contracts'));

  // Panel 3: Brand & Next Steps
  panelEls[3].appendChild(makeCodeSection('Sanitized geometric SVG mark', LAUNCH.logo, 'Copy SVG'));
  if (LAUNCH.midjourney) {
    panelEls[3].appendChild(makeCodeSection('Midjourney exploration prompt', LAUNCH.midjourney, 'Copy prompt'));
  }
  if (LAUNCH.dalle) {
    panelEls[3].appendChild(makeCodeSection('Icon generation prompt', LAUNCH.dalle, 'Copy prompt'));
  }
  const stepsSec = document.createElement('section');
  stepsSec.className = 'panel';
  stepsSec.appendChild(Object.assign(document.createElement('h2'), { textContent: 'Recommended next steps', style: 'margin-block-end: 8px;' }));
  const steps = Array.isArray(LAUNCH.nextSteps) ? LAUNCH.nextSteps : [];
  if (steps.length === 0) {
    stepsSec.appendChild(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'No post-launch steps listed.' }));
  } else {
    const ol = document.createElement('ol');
    ol.className = 'steps-list';
    steps.forEach((st) => {
      const li = document.createElement('li');
      li.textContent = st;
      ol.appendChild(li);
    });
    stepsSec.appendChild(ol);
  }
  panelEls[3].appendChild(stepsSec);

  await renderDiagramInto(flowBox, 'flow', LAUNCH.flow);
  await renderDiagramInto(seqBox, 'seq', LAUNCH.sequence);
}

$('copy-all-btn').addEventListener('click', () => {
  copyWithFallback(bundleMarkdown(), $('copy-all-btn'), 'Copied bundle ✓');
});

$('download-md-btn').addEventListener('click', () => {
  downloadBlob('launchpad-bundle.md', bundleMarkdown(), 'text/markdown;charset=utf-8');
});

initLaunchpad();
</script>
</body>
</html>
`;
}

export function computeExpectedTemplates() {
  return new Map([
    ['stack_matrix_artifact.html', buildStackMatrixHtml()],
    ['brand_studio_artifact.html', buildBrandStudioHtml()],
    ['qa_diff_artifact.html', buildQaDiffHtml()],
    ['launchpad_artifact.html', buildLaunchpadHtml()],
  ]);
}

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const expected = computeExpectedTemplates();

  if (checkOnly) {
    const drifts = [];
    for (const [name, content] of expected.entries()) {
      const p = path.join(OUT_DIR, name);
      if (!fs.existsSync(p)) {
        drifts.push(`missing: templates/generative-ui/${name}`);
        continue;
      }
      const actual = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
      if (sha256(actual) !== sha256(content)) {
        drifts.push(`out-of-sync: templates/generative-ui/${name}`);
      }
    }
    if (drifts.length > 0) {
      process.stderr.write(
        `build-templates --check failed:\n${drifts.map((d) => `  - ${d}`).join('\n')}\nRun \`node scripts/build-templates.mjs\`.\n`
      );
      process.exit(1);
    }
    process.stdout.write(`build-templates --check passed (${expected.size} artifacts verified).\n`);
    process.exit(0);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, content] of expected.entries()) {
    fs.writeFileSync(path.join(OUT_DIR, name), content, 'utf8');
  }
  process.stdout.write(`Built ${expected.size} offline CSP-safe HTML artifacts in templates/generative-ui/.\n`);
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)) {
  main();
}
