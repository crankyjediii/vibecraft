#!/usr/bin/env node
/**
 * Headless browser smoke, WCAG 2.2 AA (`axe-core`), offline CSP, XSS sanitization,
 * and adversarial data-block fuzz verifier for all four VibeCraft Generative UI templates.
 *
 * Also supports `--screenshots <dir>` to capture real 2x retina PNG screenshots of the
 * four templates for documentation (`docs/assets/`).
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates', 'generative-ui');

const require = createRequire(import.meta.url);
const { parsePickBlock, parseLockBlock, TOKEN_KEYS } = require('./lib/lock-blocks.js');

const TEMPLATE_FILES = [
  'stack_matrix_artifact.html',
  'brand_studio_artifact.html',
  'qa_diff_artifact.html',
  'launchpad_artifact.html',
];

const VIEWPORTS = [
  { width: 375, height: 812, label: 'mobile-375' },
  { width: 768, height: 1024, label: 'tablet-768' },
  { width: 1440, height: 900, label: 'desktop-1440' },
];

function resolvePlaywrightModule() {
  if (process.env.PLAYWRIGHT_MODULE_PATH && fs.existsSync(process.env.PLAYWRIGHT_MODULE_PATH)) {
    return process.env.PLAYWRIGHT_MODULE_PATH;
  }
  const localNm = path.join(ROOT_DIR, 'node_modules', 'playwright');
  if (fs.existsSync(localNm)) return localNm;

  const npxRoot = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npxRoot)) {
    for (const dir of fs.readdirSync(npxRoot)) {
      const candidate = path.join(npxRoot, dir, 'node_modules', 'playwright');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return 'playwright';
}

function resolveChromeExecutable() {
  if (process.env.CHROME_EXECUTABLE_PATH && fs.existsSync(process.env.CHROME_EXECUTABLE_PATH)) {
    return process.env.CHROME_EXECUTABLE_PATH;
  }
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

function resolveAxeScriptPath() {
  if (process.env.AXE_MIN_JS && fs.existsSync(process.env.AXE_MIN_JS)) {
    return process.env.AXE_MIN_JS;
  }
  const localAxe = path.join(ROOT_DIR, 'node_modules', 'axe-core', 'axe.min.js');
  if (fs.existsSync(localAxe)) return localAxe;

  const npxRoot = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npxRoot)) {
    for (const dir of fs.readdirSync(npxRoot)) {
      const candidate = path.join(npxRoot, dir, 'node_modules', 'axe-core', 'axe.min.js');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function replaceDataBlock(html, replacementJs) {
  const re = /\/\/ @vibecraft-data:start[\s\S]*?\/\/ @vibecraft-data:end/;
  assert.ok(re.test(html), 'Template missing @vibecraft-data:start..end markers');
  return html.replace(
    re,
    `// @vibecraft-data:start\n${replacementJs}\n// @vibecraft-data:end`
  );
}

async function openOfflinePage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    colorScheme: options.colorScheme || 'dark',
    deviceScaleFactor: options.deviceScaleFactor || 1,
  });

  // Strictly block all external network traffic to prove 100% offline CSP safety
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });

  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      // Ignore expected ERR_BLOCKED_BY_CLIENT notice from our offline route blocker on optional Mermaid CDN
      if (!txt.includes('ERR_BLOCKED_BY_CLIENT') && !txt.includes('Failed to load resource')) {
        consoleErrors.push(txt);
      }
    }
  });

  return { context, page, pageErrors, consoleErrors };
}

async function runAxeAudit(page, axeSource, label) {
  if (!axeSource) return 0;
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    return await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
    });
  });

  if (results.violations.length > 0) {
    const summary = results.violations
      .map((v) => `${v.id} (${v.impact}): ${v.help} -> ${v.nodes.map((n) => n.html).join(' | ')}`)
      .join('\n  ');
    assert.fail(`axe-core violations on ${label}:\n  ${summary}`);
  }
  return results.passes.length;
}

function parseCliArgs(argv) {
  const opts = { screenshotsDir: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--screenshots') {
      opts.screenshotsDir = argv[++i] || 'docs/assets';
    } else if (arg === '--json') {
      opts.json = true;
    }
  }
  return opts;
}

export async function verifyAllTemplates(opts = {}) {
  const pwSpec = resolvePlaywrightModule();
  const pwUrl = pwSpec === 'playwright' ? 'playwright' : pathToFileURL(path.join(pwSpec, 'index.mjs')).href;
  const { chromium } = await import(pwUrl);

  const axePath = resolveAxeScriptPath();
  const axeSource = axePath ? fs.readFileSync(axePath, 'utf8') : null;

  const launchOpts = { headless: true };
  const chromeExec = resolveChromeExecutable();
  try {
    // Prefer Playwright's managed Chromium if installed; fall back to local OS Chrome
    const testBrowser = await chromium.launch(launchOpts);
    await testBrowser.close();
  } catch (err) {
    if (chromeExec) {
      launchOpts.executablePath = chromeExec;
    } else {
      throw err;
    }
  }

  const browser = await chromium.launch(launchOpts);
  const checks = [];

  try {
    // 1. Offline viewport, console/pageerror, and light+dark axe-core checks across all 4 templates
    for (const file of TEMPLATE_FILES) {
      const fullPath = path.join(TEMPLATES_DIR, file);
      const fileUrl = pathToFileURL(fullPath).href;

      for (const scheme of ['dark', 'light']) {
        for (const vp of VIEWPORTS) {
          const { context, page, pageErrors, consoleErrors } = await openOfflinePage(browser, {
            viewport: { width: vp.width, height: vp.height },
            colorScheme: scheme,
          });
          try {
            await page.goto(fileUrl, { waitUntil: 'load' });
            assert.deepEqual(pageErrors, [], `${file} (${scheme}, ${vp.label}) pageerror`);
            assert.deepEqual(consoleErrors, [], `${file} (${scheme}, ${vp.label}) console.error`);

            const overflow = await page.evaluate(() => ({
              scrollWidth: document.documentElement.scrollWidth,
              innerWidth: window.innerWidth,
            }));
            assert.ok(
              overflow.scrollWidth <= overflow.innerWidth,
              `${file} (${scheme}, ${vp.label}) horizontal overflow: ${overflow.scrollWidth} > ${overflow.innerWidth}`
            );

            if (vp.width === 1440) {
              const passes = await runAxeAudit(page, axeSource, `${file} (${scheme})`);
              checks.push({ check: `axe:${file}:${scheme}`, ok: true, axePasses: passes });
            }
          } finally {
            await context.close();
          }
        }
      }
      checks.push({ check: `viewports-offline:${file}`, ok: true });
    }

    // 2. Brand Studio: all 6 archetypes pass axe-core + closed listbox ArrowDown + VIBECRAFT LOCK roundtrip
    {
      const brandUrl = pathToFileURL(path.join(TEMPLATES_DIR, 'brand_studio_artifact.html')).href;
      const { context, page, pageErrors } = await openOfflinePage(browser, {
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      });
      try {
        await page.goto(brandUrl, { waitUntil: 'load' });
        const radioCount = await page.locator('#preset-list [role="radio"]').count();
        assert.equal(radioCount, 6, 'Expected 6 Brand Studio archetypes');

        for (let i = 0; i < radioCount; i += 1) {
          const btn = page.locator('#preset-list [role="radio"]').nth(i);
          const label = await btn.innerText();
          await btn.click();
          const chipText = await page.locator('#pv-chip').innerText();
          assert.equal(chipText.trim(), 'WCAG AA Pass', `Expected WCAG AA Pass on preset ${label}`);
          await runAxeAudit(page, axeSource, `brand_studio preset #${i + 1}`);
        }

        // Closed listbox keyboard ArrowDown test (A11Y-04)
        await page.locator('#dd-btn').focus();
        assert.equal(await page.locator('#dd-btn').getAttribute('aria-expanded'), 'false');
        await page.keyboard.press('ArrowDown');
        assert.equal(await page.locator('#dd-btn').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator('#dd-list').isHidden(), false);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#dd-btn').getAttribute('aria-expanded'), 'false');

        // Force clipboard failure so #fallback receives the exact VIBECRAFT LOCK block
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
        });
        await page.locator('#lock-btn').click();
        const lockPayload = await page.locator('#fallback').inputValue();
        const parsedLock = parseLockBlock(lockPayload);
        assert.equal(parsedLock.ok, true, `parseLockBlock failed: ${JSON.stringify(parsedLock.errors)}`);
        assert.equal(Object.keys(parsedLock.data.tokens).length, TOKEN_KEYS.length);
        assert.deepEqual(pageErrors, []);
        checks.push({ check: 'brand-studio-6-archetypes-listbox-lock', ok: true });
      } finally {
        await context.close();
      }
    }

    // 3. Stack Matrix: VIBECRAFT PICK roundtrip via lock-blocks parser
    {
      const stackUrl = pathToFileURL(path.join(TEMPLATES_DIR, 'stack_matrix_artifact.html')).href;
      const { context, page, pageErrors } = await openOfflinePage(browser);
      try {
        await page.goto(stackUrl, { waitUntil: 'load' });
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
        });
        await page.locator('#copy-pick-btn').click();
        const pickPayload = await page.locator('#fallback').inputValue();
        const parsedPick = parsePickBlock(pickPayload);
        assert.equal(parsedPick.ok, true, `parsePickBlock failed: ${JSON.stringify(parsedPick.errors)}`);
        assert.ok(parsedPick.data.gotchas.length >= 2);
        assert.deepEqual(pageErrors, []);
        checks.push({ check: 'stack-matrix-pick-roundtrip', ok: true });
      } finally {
        await context.close();
      }
    }

    // 4. Launchpad: SVG XSS payload sanitization (SEC-02) + offline Mermaid fallback (COR-02)
    {
      const rawHtml = fs.readFileSync(path.join(TEMPLATES_DIR, 'launchpad_artifact.html'), 'utf8');
      const maliciousJs = `
const LAUNCH = {
  phase: 'Phase 4 of 4 · Launchpad',
  title: 'XSS Sanitizer Check',
  name: 'SafeLaunch',
  tagline: 'Verifying geometric SVG sanitizer.',
  contractsLang: 'ts',
  readme: 'README body.',
  commands: 'npm test',
  tree: 'safelaunch/\\n└── index.ts',
  flow: 'flowchart LR\\n  A["Client"] --> B["Worker"]',
  sequence: 'sequenceDiagram\\n  A->>B: ping',
  contracts: 'export interface Ping { readonly ok: boolean; }',
  logo: '<svg viewBox="0 0 64 64" onload="window.__xss=1"><script>window.__xss=2<\\/script><foreignObject><img src="x" onerror="window.__xss=3"><\\/foreignObject><circle id="safe-circle" cx="32" cy="32" r="14" fill="var(--accent)"/><\\/svg>',
  midjourney: 'prompt',
  dalle: 'prompt',
  nextSteps: ['Step one']
};`;
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-xss-'));
      const tmpHtmlPath = path.join(tmpDir, 'launchpad_xss.html');
      fs.writeFileSync(tmpHtmlPath, replaceDataBlock(rawHtml, maliciousJs), 'utf8');

      const { context, page, pageErrors } = await openOfflinePage(browser);
      try {
        await page.goto(pathToFileURL(tmpHtmlPath).href, { waitUntil: 'load' });
        const xssState = await page.evaluate(() => ({
          xssGlobal: window.__xss,
          scriptCount: document.querySelectorAll('#logo-box script').length,
          foreignCount: document.querySelectorAll('#logo-box foreignObject').length,
          safeCircleCount: document.querySelectorAll('#logo-box #safe-circle, #logo-box circle').length,
          mermaidMode: document.getElementById('mermaid-mode')?.textContent || '',
        }));
        assert.equal(xssState.xssGlobal, undefined, 'XSS payload executed in LAUNCH.logo');
        assert.equal(xssState.scriptCount, 0);
        assert.equal(xssState.foreignCount, 0);
        assert.equal(xssState.safeCircleCount, 1);

        // Switch to System Diagram tab (index 1) and verify offline <pre> fallback rendered cleanly
        await page.locator('[role="tab"]').nth(1).click();
        const diagramText = await page.locator('#panels-root').innerText();
        assert.ok(diagramText.includes('flowchart LR'), 'Expected offline Mermaid source fallback');
        assert.deepEqual(pageErrors, []);
        checks.push({ check: 'launchpad-svg-xss-and-offline-mermaid', ok: true });
      } finally {
        await context.close();
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    // 5. QA Diff: Honest stamp when checker is "not run" and when openSlop > 0 (COR-01, PRM-09)
    {
      const rawQa = fs.readFileSync(path.join(TEMPLATES_DIR, 'qa_diff_artifact.html'), 'utf8');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-qa-'));
      try {
        const notRunJs = `
const REPORT = {
  project: 'Desktop Headless Check',
  passesRun: 1,
  openSlop: 2,
  openGotchas: 1,
  syntax: { files: 4, errors: 0, warnings: 0, checker: 'not run' },
  tokens: { files: [{ file: 'tokens.css', refs: 19, hardcoded: 0, note: 'definitions' }, { file: 'app.tsx', refs: 10, hardcoded: 0 }] },
  diffs: [],
  gotchas: []
};`;
        const notRunPath = path.join(tmpDir, 'qa_not_run.html');
        fs.writeFileSync(notRunPath, replaceDataBlock(rawQa, notRunJs), 'utf8');

        const { context, page, pageErrors } = await openOfflinePage(browser);
        try {
          await page.goto(pathToFileURL(notRunPath).href, { waitUntil: 'load' });
          const stamp = await page.locator('#stamp-banner').innerText();
          assert.ok(stamp.startsWith('! VibeCraft QA'), `Expected warning prefix, got: ${stamp}`);
          assert.ok(stamp.includes('[Syntax: Not Run]'), `Expected [Syntax: Not Run], got: ${stamp}`);
          assert.ok(stamp.includes('[Slop: 3 Remaining]'), `Expected [Slop: 3 Remaining], got: ${stamp}`);
          assert.deepEqual(pageErrors, []);
          checks.push({ check: 'qa-diff-honest-stamp', ok: true });
        } finally {
          await context.close();
        }
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    // 6. Adversarial data-block fuzzing (empty arrays, zero latency, RTL + 120-char unbroken tokens at 375px)
    {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-fuzz-'));
      try {
        const rawStack = fs.readFileSync(path.join(TEMPLATES_DIR, 'stack_matrix_artifact.html'), 'utf8');
        const emptyStackPath = path.join(tmpDir, 'stack_empty.html');
        fs.writeFileSync(emptyStackPath, replaceDataBlock(rawStack, 'const STACKS = [];'), 'utf8');

        const longToken = 'X'.repeat(120);
        const zeroRtlStackJs = `
const STACKS = [{
  id: 'rtl-zero',
  name: 'معمارية حافة سريعة · תשתית קצה',
  recommended: true,
  stack: '${longToken}',
  why: 'اختبار النصوص العربية والعبرية الطويلة بدون كسر التخطيط على شاشات الهاتف.',
  latencyMs: 0,
  latencyNote: '0 ms local',
  latencyTag: 'verified',
  offlineLabel: 'كامل بدون إنترنت',
  offlineTag: 'verified',
  cost: '$0',
  costTag: 'verified',
  gotcha: 'حد الذاكرة',
  mitigation: 'تدفق البيانات'
}];`;
        const rtlStackPath = path.join(tmpDir, 'stack_rtl.html');
        fs.writeFileSync(rtlStackPath, replaceDataBlock(rawStack, zeroRtlStackJs), 'utf8');

        const rawBrand = fs.readFileSync(path.join(TEMPLATES_DIR, 'brand_studio_artifact.html'), 'utf8');
        const emptyBrandPath = path.join(tmpDir, 'brand_empty.html');
        fs.writeFileSync(
          emptyBrandPath,
          replaceDataBlock(rawBrand, 'const PREVIEW = {};\nconst THEMES = {};'),
          'utf8'
        );

        for (const fPath of [emptyStackPath, rtlStackPath, emptyBrandPath]) {
          const { context, page, pageErrors } = await openOfflinePage(browser, {
            viewport: { width: 375, height: 812 },
          });
          try {
            await page.goto(pathToFileURL(fPath).href, { waitUntil: 'load' });
            assert.deepEqual(pageErrors, [], `Fuzz pageerror in ${path.basename(fPath)}`);
            const htmlBody = await page.content();
            assert.ok(!htmlBody.includes('NaN%'), `Found NaN% in ${path.basename(fPath)}`);
            const dims = await page.evaluate(() => ({
              sw: document.documentElement.scrollWidth,
              iw: window.innerWidth,
            }));
            assert.ok(dims.sw <= dims.iw, `Fuzz horizontal overflow in ${path.basename(fPath)}: ${dims.sw} > ${dims.iw}`);
          } finally {
            await context.close();
          }
        }
        checks.push({ check: 'adversarial-fuzz-empty-zero-rtl-375px', ok: true });
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    // 7. Optional high-DPI documentation screenshot generation (`--screenshots <dir>`)
    if (opts.screenshotsDir) {
      const outDir = path.resolve(ROOT_DIR, opts.screenshotsDir);
      fs.mkdirSync(outDir, { recursive: true });
      const shots = [
        { file: 'stack_matrix_artifact.html', out: 'stack-matrix.png', scheme: 'dark' },
        { file: 'brand_studio_artifact.html', out: 'brand-studio.png', scheme: 'dark' },
        { file: 'qa_diff_artifact.html', out: 'qa-diff.png', scheme: 'dark' },
        { file: 'launchpad_artifact.html', out: 'launchpad.png', scheme: 'dark' },
      ];
      for (const s of shots) {
        const { context, page } = await openOfflinePage(browser, {
          viewport: { width: 1360, height: 860 },
          colorScheme: s.scheme,
          deviceScaleFactor: 2,
        });
        try {
          await page.goto(pathToFileURL(path.join(TEMPLATES_DIR, s.file)).href, { waitUntil: 'load' });
          await page.screenshot({ path: path.join(outDir, s.out), fullPage: false });
        } finally {
          await context.close();
        }
      }
      checks.push({ check: `screenshots:${opts.screenshotsDir}`, ok: true });
    }

    return { ok: true, axeEnabled: Boolean(axeSource), checks };
  } finally {
    await browser.close();
  }
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : '';
if (invokedPath === fs.realpathSync(__filename)) {
  const cliOpts = parseCliArgs(process.argv.slice(2));
  verifyAllTemplates(cliOpts)
    .then((res) => {
      if (cliOpts.json) {
        process.stdout.write(`${JSON.stringify(res, null, 2)}\n`);
      } else {
        process.stdout.write(
          `✓ Browser verification passed (${res.checks.length} suites, axe-core=${res.axeEnabled ? 'active' : 'skipped'}).\n`
        );
      }
    })
    .catch((err) => {
      process.stderr.write(`✗ Browser verification failed: ${err.stack || err.message}\n`);
      process.exit(1);
    });
}
