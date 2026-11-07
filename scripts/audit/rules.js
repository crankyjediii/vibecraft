'use strict';

/**
 * Canonical catalog and scanners for all 18 VibeCraft Audit Engine v2 rules (`VC001`..`VC018`)
 * plus `VC000` (`unjustified-ignore`). Zero runtime dependencies.
 */

const { parseColor, auditSourceTokenContrast } = require('./contrast.js');

const COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/;
const TAILWIND_PALETTE_REGEX =
  /\b(?:bg|text|border|ring|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)(?:\/\d+)?\b/;
const NAMED_STYLE_COLOR_REGEX =
  /(?:^|[;{,\s])(?:color|background(?:-color)?|border(?:-color)?)\s*:\s*['"]?\b(?:white|black|red|blue|green|yellow|purple|orange|pink|magenta|cyan)\b/i;

// Constructed via character classes so this file itself never triggers placeholder matching
const PLACEHOLDER_COMMENT_REGEX = new RegExp(
  '(?:\\/\\/|\\/\\*|<!--|^\\s*#)\\s*(?:[T]ODO|[F]IXME|[X]XX|[H]ACK)\\b',
  'i'
);
const PLACEHOLDER_COPY_REGEX = new RegExp(
  '[l]orem\\s+ipsum|\\b[j]ohn\\s+doe\\b|\\b[i]mplement\\s+me\\b|[y]our\\s+code\\s+here|[r]est\\s+of\\s+(?:the\\s+)?code|throw\\s+new\\s+Error\\(\\s*[\'"][n]ot\\s+implemented[\'"]\\s*\\)',
  'i'
);

const SECRET_PATTERNS = [
  { label: 'Anthropic API key', re: /\bsk-ant-(?:api\d+-)?[A-Za-z0-9_-]{20,}\b/ },
  { label: 'OpenAI API key', re: /\bsk-(?:proj-)?[A-Za-z0-9]{24,}\b/ },
  { label: 'AWS Access Key ID', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { label: 'GitHub Personal Access Token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/ },
  { label: 'Stripe Live Secret Key', re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { label: 'Slack Token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { label: 'Private Key PEM Block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  {
    label: 'Hardcoded API key assignment',
    re: /\b(?:api[_-]?key|client[_-]?secret|auth[_-]?token|brave_api_key)\s*[:=]\s*['"](?!\$\{[A-Z0-9_]+\})[A-Za-z0-9/+_-]{20,}['"]/i,
  },
];

// @audit-data:start
const RULES_META = Object.freeze([
  {
    id: 'VC000',
    slug: 'unjustified-ignore',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts', 'sh', 'json'],
    summary: 'Inline `vibecraft-ignore` directive must name at least one rule ID/slug and `: <reason>` (>= 4 chars).',
    remediation: 'Write `// vibecraft-ignore VC001: canvas heatmap lookup table` with a concrete technical reason.',
  },
  {
    id: 'VC001',
    slug: 'hardcoded-color',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Forbids raw hex, rgb(), hsl(), oklch(), named CSS colors, and default Tailwind palette utilities outside `:root` custom properties or `@tokens:start..@tokens:end`.',
    remediation: 'Define the color once in `:root` (`tokens.css`) and reference `var(--token)` in components.',
  },
  {
    id: 'VC002',
    slug: 'token-contrast',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Computes WCAG 2.2 relative luminance ratios across defined token pairs (`>= 4.5:1` text, `>= 3.0:1` UI indicators).',
    remediation: 'Darken light-mode foregrounds or lighten dark-mode foregrounds until text pairs exceed 4.5:1.',
  },
  {
    id: 'VC003',
    slug: 'missing-focus-visible',
    severity: 'warning',
    fixable: false,
    kinds: ['css', 'html'],
    summary: 'Flags interactive CSS selectors styling `:hover` or `:focus` without a corresponding `:focus-visible` rule.',
    remediation: 'Add a `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` rule for the selector.',
  },
  {
    id: 'VC004',
    slug: 'outline-none-without-replacement',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Forbids `outline: none` / `outline: 0` or `focus:outline-none` unless a replacement focus ring (`box-shadow`, `border-color`, or `focus-visible:ring`) appears in the same scope.',
    remediation: 'Keep the native outline or pair `outline: none` with `box-shadow: 0 0 0 2px var(--accent)` on `:focus-visible`.',
  },
  {
    id: 'VC005',
    slug: 'touch-target-size',
    severity: 'warning',
    fixable: false,
    kinds: ['css', 'html'],
    summary: 'Flags interactive control selectors (`button`, `.btn`, `[role="tab"]`, `input`, `select`) with explicit `width` or `height` `< 24px` (WCAG 2.2 SC 2.5.8).',
    remediation: 'Set `min-height: 36px` (or at least `24px`) and `min-width: 24px` on interactive controls.',
  },
  {
    id: 'VC006',
    slug: 'transition-all',
    severity: 'error',
    fixable: true,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Forbids `transition: all`, `transition-property: all`, and Tailwind `transition-all` (Craft R3).',
    remediation: 'Animate explicit properties only (`background-color`, `border-color`, `color`, `opacity`, `transform`).',
  },
  {
    id: 'VC007',
    slug: 'gradient',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Forbids `linear-gradient()`, `radial-gradient()`, `conic-gradient()`, and `bg-gradient-to-*` unless explicitly waived (Craft R1).',
    remediation: 'Use flat deliberate surface and accent tokens (`var(--surface)`, `var(--accent)`), or add an explicit user waiver.',
  },
  {
    id: 'VC008',
    slug: 'glow-shadow',
    severity: 'warning',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Flags colored neon `box-shadow` / `drop-shadow` blurs and colored Tailwind shadow utilities (Craft R2).',
    remediation: 'Use crisp 1px borders (`var(--border)`) and neutral elevation shadows (`var(--shadow)`).',
  },
  {
    id: 'VC009',
    slug: 'z-index-arms-race',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts'],
    summary: 'Forbids `z-index >= 1000` and arbitrary `z-[9999]` stacking hacks.',
    remediation: 'Use `isolation: isolate` and a bounded 2-digit stacking scale (`10`, `20`, `30`, `40`, `50`).',
  },
  {
    id: 'VC010',
    slug: 'unlabeled-control',
    severity: 'error',
    fixable: false,
    kinds: ['html', 'js', 'ts'],
    summary: 'Flags `<button>`, `<input>`, `<select>`, and `<textarea>` elements lacking visible text, `<label for>`, `aria-label`, or `aria-labelledby`.',
    remediation: 'Add visible text inside `<button>`, associate a `<label for="...">`, or set `aria-label`.',
  },
  {
    id: 'VC011',
    slug: 'type-laundering',
    severity: 'error',
    fixable: false,
    kinds: ['ts'],
    summary: 'Forbids `: any`, `as any`, `as unknown as`, and `<any>` in TypeScript modules.',
    remediation: 'Use concrete interfaces, generics, or `unknown` narrowed via type guards.',
  },
  {
    id: 'VC012',
    slug: 'missing-return-type',
    severity: 'error',
    fixable: false,
    kinds: ['ts'],
    summary: 'Requires explicit return type annotations on exported TypeScript functions and arrow functions (multi-line signature aware).',
    remediation: 'Declare the explicit return type after the closing parameter parenthesis: `export function parse(raw: string): Result<Doc> {`.',
  },
  {
    id: 'VC013',
    slug: 'swallowed-error',
    severity: 'error',
    fixable: false,
    kinds: ['js', 'ts'],
    summary: 'Forbids empty `catch {}` blocks and catch blocks that silently discard caught exceptions.',
    remediation: 'Return a typed `{ ok: false, error }` union, rethrow with context, or log to `stderr` in CLI entrypoints.',
  },
  {
    id: 'VC014',
    slug: 'console-leftover',
    severity: 'warning',
    fixable: true,
    kinds: ['html', 'js', 'ts'],
    summary: 'Flags `console.log()` and `console.debug()` calls left in application or template scripts.',
    remediation: 'Remove debug logging or route structured CLI output through `process.stdout.write` / `process.stderr.write`.',
  },
  {
    id: 'VC015',
    slug: 'dead-export',
    severity: 'warning',
    fixable: false,
    kinds: ['js', 'ts'],
    summary: 'Flags named exports in non-entrypoint modules that are never imported or referenced across the scanned project.',
    remediation: 'Remove the unused `export` keyword or delete the dead symbol.',
  },
  {
    id: 'VC016',
    slug: 'placeholder',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts', 'sh'],
    summary: 'Forbids `TODO`, `FIXME`, `XXX`, `HACK`, `lorem ipsum`, `John Doe`, and unimplemented stub markers.',
    remediation: 'Implement the complete domain behavior and replace placeholder copy before shipping.',
  },
  {
    id: 'VC017',
    slug: 'comment-slop',
    severity: 'warning',
    fixable: true,
    kinds: ['js', 'ts'],
    summary: 'Flags narrating comments that restate obvious operations (`// increment count`, `// return the result`).',
    remediation: 'Delete self-evident narration comments; comment only non-obvious invariants or `[Gotcha]` mitigations.',
  },
  {
    id: 'VC018',
    slug: 'hardcoded-secret',
    severity: 'error',
    fixable: false,
    kinds: ['css', 'html', 'js', 'ts', 'sh', 'json'],
    summary: 'Detects hardcoded Anthropic, OpenAI, AWS, GitHub, Stripe, Slack, PEM private keys, and literal secret assignments.',
    remediation: 'Read secrets from `process.env.SECRET_NAME` or `${SECRET_NAME}` config placeholders and rotate exposed keys immediately.',
  },
]);
// @audit-data:end

const RULE_BY_ID = new Map(RULES_META.map((r) => [r.id, r]));
const RULE_BY_SLUG = new Map(RULES_META.map((r) => [r.slug, r]));

function stripJsCommentsOnLine(line) {
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (ch === "'" && !inDouble && !inTemplate && prev !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inTemplate && prev !== '\\') inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble && prev !== '\\') inTemplate = !inTemplate;
    else if (!inSingle && !inDouble && !inTemplate && ch === '/' && line[i + 1] === '/') {
      return line.slice(0, i);
    }
  }
  return line;
}

function stripStringsAndCommentsOnLine(line) {
  const noComment = stripJsCommentsOnLine(line);
  // Preserve `${...}` expressions inside template literals so variable references are retained
  const keepTemplateExprs = noComment.replace(/`(?:\\.|[^`\\])*`/g, (tpl) => {
    const exprs = [];
    tpl.replace(/\$\{([^}]*)\}/g, (_, inner) => {
      exprs.push(inner);
      return '';
    });
    return exprs.length > 0 ? `(${exprs.join(' ')})` : '``';
  });
  return keepTemplateExprs
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function isSaturationGlow(line) {
  if (!/(?:box-shadow|drop-shadow)\s*:/i.test(line) && !/\bshadow-(?:indigo|violet|purple|fuchsia|pink|rose|cyan|sky|blue|emerald|green|amber|red)-\d+/.test(line)) {
    return false;
  }
  if (/\bshadow-(?:indigo|violet|purple|fuchsia|pink|rose|cyan|sky|blue|emerald|green|amber|red)-\d+/.test(line)) {
    return true;
  }
  // Check blur >= 10px + saturated color
  const blurMatch = line.match(/(-?\d+)px\s+(-?\d+)px\s+(\d+)px/);
  if (!blurMatch || Number.parseInt(blurMatch[3], 10) < 10) return false;
  const colorPart = line.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/);
  if (!colorPart) return false;
  const rgba = parseColor(colorPart[0]);
  if (!rgba) return false;
  const spread = Math.max(rgba[0], rgba[1], rgba[2]) - Math.min(rgba[0], rgba[1], rgba[2]);
  return spread > 40;
}

function extractCssBlocks(source, kind) {
  const regions = [];
  if (kind === 'css') {
    regions.push({ css: source, baseOffset: 0 });
  } else if (kind === 'html') {
    const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    let sm;
    while ((sm = styleRe.exec(source)) !== null) {
      const innerStart = sm.index + sm[0].indexOf('>') + 1;
      regions.push({ css: sm[1], baseOffset: innerStart });
    }
  }

  const blocks = [];
  for (const reg of regions) {
    const clean = reg.css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    let depth = 0;
    let selStart = 0;
    let bodyStart = -1;
    let currentSel = '';

    for (let i = 0; i < clean.length; i += 1) {
      const ch = clean[i];
      if (ch === '{') {
        if (depth === 0) {
          currentSel = clean.slice(selStart, i).trim();
          bodyStart = i + 1;
          // Descend into @media / @supports wrapper blocks so inner rules are parsed cleanly
          if (/^@(?:media|supports|layer|container)\b/i.test(currentSel)) {
            selStart = i + 1;
            bodyStart = -1;
            continue;
          }
        }
        depth += 1;
      } else if (ch === '}') {
        if (depth > 0) {
          depth -= 1;
          if (depth === 0 && bodyStart >= 0) {
            const body = clean.slice(bodyStart, i);
            const absOffset = reg.baseOffset + selStart;
            const line = source.slice(0, absOffset).split('\n').length;
            blocks.push({ selector: currentSel, body, line });
            selStart = i + 1;
            bodyStart = -1;
          }
        } else {
          selStart = i + 1;
        }
      }
    }
  }
  return blocks;
}

function scanCssInteractiveRules(source, kind) {
  const findings = [];
  if (kind !== 'css' && kind !== 'html') return findings;

  const blocks = extractCssBlocks(source, kind);
  const hoverFocusBases = new Map();
  const focusVisibleBases = new Set();
  let hasGlobalFocusVisible = false;

  for (const b of blocks) {
    const parts = b.selector.split(',').map((s) => s.trim()).filter(Boolean);
    for (const sel of parts) {
      if (sel === ':focus-visible' || sel === '*:focus-visible') {
        hasGlobalFocusVisible = true;
      }
      if (/:focus-visible\b/.test(sel)) {
        const base = sel.replace(/:focus-visible\b.*$/, '').replace(/:not\([^)]*\)/g, '').trim();
        focusVisibleBases.add(base || '*');
      } else if (/:(?:hover|focus)\b/.test(sel) && !/:focus-within\b/.test(sel)) {
        const base = sel.replace(/:(?:hover|focus)\b.*$/, '').replace(/:not\([^)]*\)/g, '').trim();
        if (base && !hoverFocusBases.has(base)) {
          hoverFocusBases.set(base, { line: b.line, selector: sel });
        }
      }
    }

    // VC004: outline: none / 0 without replacement indicator in same rule body
    if (/\boutline\s*:\s*(?:none|0(?:px)?)\b/i.test(b.body)) {
      const hasReplacement = /\b(?:box-shadow|border(?:-color)?)\s*:/i.test(b.body);
      if (!hasReplacement) {
        findings.push({
          ruleId: 'VC004',
          line: b.line,
          text: `${b.selector} { outline: none }`,
          message: `Selector "${b.selector}" removes focus outline without a replacement border or box-shadow.`,
        });
      }
    }

    // VC005: interactive selector with width/height < 24px (ignoring pseudo-elements ::before/::after)
    const isPseudoElement = /::(?:before|after|placeholder|webkit-|moz-)/.test(b.selector);
    const isInteractiveSelector =
      !isPseudoElement &&
      /(?:^|[\s>+~,])(?:button|input|select|textarea|\.(?:btn|button|tab|chip-btn|icon-btn|preset)|\[role=['"]?(?:button|tab|option|switch|checkbox|radio|menuitem)['"]?\])(?=$|[\s.:#\[,])/i.test(
        b.selector
      );
    if (isInteractiveSelector) {
      const dimRe = /\b(min-height|height|min-width|width)\s*:\s*(\d+(?:\.\d+)?)px\b/gi;
      let dm;
      while ((dm = dimRe.exec(b.body)) !== null) {
        const px = Number.parseFloat(dm[2]);
        if (px > 0 && px < 24) {
          findings.push({
            ruleId: 'VC005',
            line: b.line,
            text: `${b.selector} { ${dm[1]}: ${dm[2]}px }`,
            message: `Interactive control "${b.selector}" sets ${dm[1]}: ${dm[2]}px (< 24px WCAG 2.2 AA minimum target size).`,
          });
        }
      }
    }
  }

  // VC003: hover/focus without :focus-visible
  if (!hasGlobalFocusVisible) {
    for (const [base, info] of hoverFocusBases.entries()) {
      const tagFallback = base.match(/^[a-z]+/i)?.[0] || '';
      if (!focusVisibleBases.has(base) && !(tagFallback && focusVisibleBases.has(tagFallback))) {
        findings.push({
          ruleId: 'VC003',
          line: info.line,
          text: info.selector,
          message: `Selector "${base}" defines :hover/:focus without a matching "${base}:focus-visible" keyboard focus rule.`,
        });
      }
    }
  }

  return findings;
}

function scanUnlabeledControls(source, kind, filename = '') {
  const findings = [];
  const ext = String(filename).split('.').pop().toLowerCase();
  if (kind !== 'html' && ext !== 'jsx' && ext !== 'tsx') return findings;

  // Strip <script> and <style> regions in HTML so JS template strings inside <script> are not misread as static HTML tags
  let markup = source;
  if (kind === 'html') {
    markup = source
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  } else {
    // Only scan JSX/TSX or explicit HTML markup tags, skipping comments
    markup = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  }

  const labelForIds = new Set();
  const labelForRe = /<label\b[^>]*(?:for|htmlFor)\s*=\s*['"]([^'"]+)['"][^>]*>/gi;
  let lm;
  while ((lm = labelForRe.exec(markup)) !== null) {
    labelForIds.add(lm[1]);
  }

  // Mark ranges enclosed by <label>...</label>
  const labelRanges = [];
  const wrapLabelRe = /<label\b[^>]*>[\s\S]*?<\/label>/gi;
  while ((lm = wrapLabelRe.exec(markup)) !== null) {
    labelRanges.push([lm.index, lm.index + lm[0].length]);
  }
  const insideLabel = (idx) => labelRanges.some(([s, e]) => idx >= s && idx <= e);

  // Check <input>, <select>, <textarea>
  const fieldRe = /<(input|select|textarea)\b([^>]*?)\/?>/gi;
  let fm;
  while ((fm = fieldRe.exec(markup)) !== null) {
    // Skip regex literals or comparison operators in JS/TS like `a < input && b > 0`
    if (kind !== 'html' && !/^\s*(?:id|class|className|type|value|name|placeholder|aria-|on[A-Z]|ref|disabled|readOnly|rows|style|$)/i.test(fm[2])) {
      continue;
    }
    const tag = fm[1].toLowerCase();
    const attrs = fm[2];
    if (tag === 'input' && /\btype\s*=\s*['"](?:hidden|submit|reset|button|image)['"]/i.test(attrs)) {
      continue;
    }
    const hasAria = /\baria-(?:label|labelledby)\s*=\s*(?:['"][^'"]+['"]|\{[^}]+\})/i.test(attrs);
    const idMatch = attrs.match(/\bid\s*=\s*['"]([^'"]+)['"]/i);
    const hasForLabel = idMatch && labelForIds.has(idMatch[1]);
    if (!hasAria && !hasForLabel && !insideLabel(fm.index)) {
      const line = markup.slice(0, fm.index).split('\n').length;
      findings.push({
        ruleId: 'VC010',
        line,
        text: `<${tag}${attrs}>`.trim().slice(0, 80),
        message: `<${tag}> control has no associated <label for="...">, wrapping <label>, aria-label, or aria-labelledby.`,
      });
    }
  }

  // Check <button>...</button> and self-closing <button />
  const btnRe = /<button\b([^>]*?)(?:\/>|>([\s\S]*?)<\/button>)/gi;
  let bm;
  while ((bm = btnRe.exec(markup)) !== null) {
    const attrs = bm[1] || '';
    const inner = bm[2] || '';
    const hasAria = /\b(?:aria-label|aria-labelledby|title)\s*=\s*(?:['"][^'"]+['"]|\{[^}]+\})/i.test(attrs);
    const textContent = inner
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]*\}/g, (expr) => (expr.trim().length > 2 ? 'dynamic' : ''))
      .trim();
    const hasImgAlt = /<(?:img|svg)\b[^>]*(?:alt|aria-label)\s*=\s*['"][^'"]+['"]/i.test(inner);
    // In HTML templates, buttons with an `id` whose textContent is populated immediately on boot can still carry fallback text or aria-label
    if (!hasAria && !textContent && !hasImgAlt) {
      const line = markup.slice(0, bm.index).split('\n').length;
      findings.push({
        ruleId: 'VC010',
        line,
        text: bm[0].replace(/\s+/g, ' ').trim().slice(0, 80),
        message: '<button> has no accessible text content, aria-label, or aria-labelledby.',
      });
    }
  }

  return findings;
}

/**
 * Multi-line balanced-parenthesis scanner for `VC012 missing-return-type` in TypeScript.
 */
function scanMissingReturnTypes(source, kind) {
  const findings = [];
  if (kind !== 'ts') return findings;

  const scrubbed = source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const exportStartRe =
    /\bexport\s+(?:default\s+)?(?:(?:async\s+)?function\s*(\w*)\s*(?:<[^>{;]*>)?\s*\(|const\s+(\w+)\s*=\s*(?:async\s*)?(?:<[^>{;=]*>)?\s*\()/g;

  let m;
  while ((m = exportStartRe.exec(scrubbed)) !== null) {
    const fnName = m[1] || m[2] || 'default';
    const openParenIdx = m.index + m[0].length - 1;
    let depth = 1;
    let idx = openParenIdx + 1;
    while (idx < scrubbed.length && depth > 0) {
      const ch = scrubbed[idx];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      idx += 1;
    }
    if (depth !== 0) continue;

    // Inspect text between closing `)` and `{` or `=>`
    const afterParen = scrubbed.slice(idx, idx + 240);
    const isArrow = m[2] !== undefined;
    if (isArrow) {
      const arrowIdx = findTopLevelArrow(afterParen);
      if (arrowIdx < 0) continue;
      const between = afterParen.slice(0, arrowIdx).trim();
      if (!between.startsWith(':')) {
        const line = source.slice(0, m.index).split('\n').length;
        findings.push({
          ruleId: 'VC012',
          line,
          text: source.split('\n')[line - 1].trim(),
          message: `Exported arrow function "${fnName}" is missing an explicit return type annotation.`,
        });
      }
    } else {
      const braceMatch = afterParen.match(/^(\s*:\s*[^{;]+)?\s*\{/);
      if (braceMatch && !braceMatch[1]) {
        const line = source.slice(0, m.index).split('\n').length;
        findings.push({
          ruleId: 'VC012',
          line,
          text: source.split('\n')[line - 1].trim(),
          message: `Exported function "${fnName}" is missing an explicit return type annotation.`,
        });
      }
    }
  }
  return findings;
}

function findTopLevelArrow(segment) {
  let angle = 0;
  let paren = 0;
  let brace = 0;
  for (let i = 0; i < segment.length - 1; i += 1) {
    const ch = segment[i];
    if (ch === '<') angle += 1;
    else if (ch === '>' && angle > 0) angle -= 1;
    else if (ch === '(') paren += 1;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '{') brace += 1;
    else if (ch === '}') brace = Math.max(0, brace - 1);
    else if (ch === '=' && segment[i + 1] === '>' && angle === 0 && paren === 0 && brace === 0) {
      return i;
    }
    if (ch === ';' && angle === 0 && paren === 0 && brace === 0) return -1;
  }
  return -1;
}

function scanSwallowedErrors(source, kind) {
  const findings = [];
  if (kind !== 'js' && kind !== 'ts') return findings;

  const noBlockComments = source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((line) => stripStringsAndCommentsOnLine(line))
    .join('\n');
  const catchRe = /\bcatch\s*(?:\(\s*([A-Za-z_$][\w$]*)[^)]*\))?\s*\{/g;
  let cm;
  while ((cm = catchRe.exec(noBlockComments)) !== null) {
    const paramName = cm[1] || null;
    const bodyOpen = cm.index + cm[0].length - 1;
    let depth = 1;
    let i = bodyOpen + 1;
    while (i < noBlockComments.length && depth > 0) {
      if (noBlockComments[i] === '{') depth += 1;
      else if (noBlockComments[i] === '}') depth -= 1;
      i += 1;
    }
    if (depth !== 0) continue;

    const rawBody = noBlockComments.slice(bodyOpen + 1, i - 1);
    const codeOnly = rawBody
      .split('\n')
      .map((l) => stripJsCommentsOnLine(l).trim())
      .filter(Boolean)
      .join(' ');

    const line = source.slice(0, cm.index).split('\n').length;
    if (codeOnly.length === 0) {
      findings.push({
        ruleId: 'VC013',
        line,
        text: source.split('\n')[line - 1].trim(),
        message: 'Empty catch block silently swallows exceptions.',
      });
      continue;
    }

    if (paramName && !paramName.startsWith('_')) {
      const usesParam = new RegExp(`\\b${paramName.replace(/\$/g, '\\$')}\\b`).test(codeOnly);
      const hasControlExit = /\b(?:return|throw|continue|break|process\.exit)\b/.test(codeOnly);
      if (!usesParam && !hasControlExit) {
        findings.push({
          ruleId: 'VC013',
          line,
          text: source.split('\n')[line - 1].trim(),
          message: `Catch parameter "${paramName}" is discarded without handling, returning, or rethrowing.`,
        });
      }
    }
  }
  return findings;
}

module.exports = {
  COLOR_REGEX,
  TAILWIND_PALETTE_REGEX,
  NAMED_STYLE_COLOR_REGEX,
  PLACEHOLDER_COMMENT_REGEX,
  PLACEHOLDER_COPY_REGEX,
  SECRET_PATTERNS,
  RULES_META,
  RULE_BY_ID,
  RULE_BY_SLUG,
  stripJsCommentsOnLine,
  stripStringsAndCommentsOnLine,
  isSaturationGlow,
  scanCssInteractiveRules,
  scanUnlabeledControls,
  scanMissingReturnTypes,
  scanSwallowedErrors,
  auditSourceTokenContrast,
};
