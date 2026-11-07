'use strict';

/**
 * Versioned `VIBECRAFT PICK` and `VIBECRAFT LOCK` serializer and parser (`v1` & `v2`).
 * Zero runtime dependencies. Rejects truncated, malformed, or `"Copy gotchas only"`
 * paste-backs with exact 1-based line numbers and field diagnostics (`PRM-23`).
 */

const TOKEN_KEYS = Object.freeze([
  'bg-primary',
  'bg-surface',
  'bg-raised',
  'fg-primary',
  'fg-muted',
  'border',
  'accent',
  'accent-2',
  'accent-fg',
  'success',
  'danger',
  'radius',
  'radius-btn',
  'font-sans',
  'font-display',
  'font-mono',
  'shadow-overlay',
  'blur',
  'shape-opacity',
]);

const TAG_TEXT = Object.freeze({
  verified: '[Verified]',
  inferred: '[Inferred]',
  gotcha: '[Gotcha]',
});

function normalizeTag(raw) {
  const key = String(raw || '')
    .replace(/[\[\]]/g, '')
    .trim()
    .toLowerCase();
  return TAG_TEXT[key] || '[Inferred]';
}

function formatPickBlock(item, opts = {}) {
  if (!item || typeof item !== 'object') {
    throw new TypeError('formatPickBlock requires a stack candidate object');
  }
  const version = opts.version === 1 ? 1 : 2;
  const header =
    version === 1
      ? 'VIBECRAFT PICK · Phase 1 · Research Scout'
      : 'VIBECRAFT PICK v2 · Phase 1 · Research Scout';

  const lines = [header];
  if (version === 2 && item.id) {
    lines.push(`ArchetypeId: ${item.id}`);
  }
  lines.push(`Stack: ${item.stack} (${item.name})`);
  lines.push(`Why: ${item.why}`);
  lines.push(`Performance: ${item.latencyMs} ms ${normalizeTag(item.latencyTag)}`);
  lines.push(`Offline: ${item.offlineLabel} ${normalizeTag(item.offlineTag)}`);
  lines.push(`Cost: ${item.cost} ${normalizeTag(item.costTag)}`);

  const gotchas =
    Array.isArray(item.gotchas) && item.gotchas.length > 0
      ? item.gotchas
      : item.gotcha
        ? [{ issue: item.gotcha, mitigation: item.mitigation || '' }]
        : [];

  lines.push('');
  gotchas.forEach((g, idx) => {
    const label = version === 2 && gotchas.length > 1 ? `[Gotcha ${idx + 1}]` : '[Gotcha]';
    lines.push(`${label} ${g.issue}`);
    lines.push(`Fix: ${g.mitigation}`);
  });

  return lines.join('\n');
}

function formatLockBlock(themeKey, theme, opts = {}) {
  if (!theme || typeof theme !== 'object') {
    throw new TypeError('formatLockBlock requires a theme object');
  }
  const version = opts.version === 1 ? 1 : 2;
  const header =
    version === 1
      ? 'VIBECRAFT LOCK · Phase 2 · Brand Artisan'
      : 'VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan';

  const lines = [header, `Archetype: ${theme.name || themeKey}`];
  if (version === 2) {
    lines.push(`ThemeId: ${themeKey}`);
    if (theme.scheme) lines.push(`Scheme: ${theme.scheme}`);
    if (opts.waivers && opts.waivers.length > 0) {
      lines.push(`Waivers: ${opts.waivers.join(', ')}`);
    }
  }
  lines.push('', ':root {');
  for (const k of TOKEN_KEYS) {
    if (theme[k] === undefined || theme[k] === '') {
      throw new Error(`Theme "${themeKey}" is missing required token "--${k}"`);
    }
    lines.push(`  --${k}: ${theme[k]};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function parsePickBlock(rawText) {
  const errors = [];
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      ok: false,
      kind: 'pick',
      version: null,
      data: null,
      errors: [{ line: 1, field: 'header', message: 'Empty input; expected VIBECRAFT PICK block.' }],
    };
  }

  const lines = rawText.replace(/\r\n/g, '\n').trim().split('\n');
  const first = lines[0].trim();

  if (/^\[Gotcha/i.test(first)) {
    return {
      ok: false,
      kind: 'gotchas-only',
      version: null,
      data: null,
      errors: [
        {
          line: 1,
          field: 'header',
          message:
            'Detected "Copy gotchas only" snippet without a VIBECRAFT PICK header or Stack selection. Click "Copy selection for Claude" instead.',
        },
      ],
    };
  }

  const headerMatch = first.match(/^VIBECRAFT PICK(?:\s+v(\d+))?\s*·\s*Phase 1/i);
  if (!headerMatch) {
    return {
      ok: false,
      kind: 'pick',
      version: null,
      data: null,
      errors: [
        {
          line: 1,
          field: 'header',
          message: `Invalid header "${first}"; expected "VIBECRAFT PICK v2 · Phase 1 · Research Scout".`,
        },
      ],
    };
  }

  const version = headerMatch[1] ? Number.parseInt(headerMatch[1], 10) : 1;
  if (version !== 1 && version !== 2) {
    errors.push({ line: 1, field: 'version', message: `Unsupported VIBECRAFT PICK version v${version}.` });
  }

  const fields = {};
  const gotchas = [];
  let pendingGotcha = null;

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i].trim();
    if (!line) continue;

    const gotchaMatch = line.match(/^\[Gotcha(?:\s+\d+)?\]\s*(.+)$/i);
    if (gotchaMatch) {
      if (pendingGotcha && !pendingGotcha.mitigation) {
        errors.push({
          line: pendingGotcha.line,
          field: 'mitigation',
          message: 'Gotcha entry is missing its paired "Fix:" line.',
        });
      }
      pendingGotcha = { issue: gotchaMatch[1].trim(), mitigation: '', line: lineNo };
      gotchas.push(pendingGotcha);
      continue;
    }

    if (/^Fix:\s*/i.test(line)) {
      const fixVal = line.replace(/^Fix:\s*/i, '').trim();
      if (!pendingGotcha) {
        errors.push({ line: lineNo, field: 'mitigation', message: 'Orphan "Fix:" line without preceding [Gotcha].' });
      } else if (!fixVal) {
        errors.push({ line: lineNo, field: 'mitigation', message: 'Empty "Fix:" mitigation text.' });
      } else {
        pendingGotcha.mitigation = fixVal;
      }
      continue;
    }

    const kvMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (kvMatch) {
      fields[kvMatch[1].toLowerCase()] = { value: kvMatch[2].trim(), line: lineNo };
    } else {
      errors.push({ line: lineNo, field: 'syntax', message: `Unrecognized line format: "${line}"` });
    }
  }

  if (pendingGotcha && !pendingGotcha.mitigation) {
    errors.push({
      line: pendingGotcha.line,
      field: 'mitigation',
      message: 'Gotcha entry is truncated (missing "Fix:" line).',
    });
  }

  for (const reqKey of ['stack', 'why', 'performance', 'offline', 'cost']) {
    if (!fields[reqKey] || !fields[reqKey].value) {
      errors.push({
        line: fields[reqKey] ? fields[reqKey].line : lines.length,
        field: reqKey,
        message: `Missing required field "${reqKey[0].toUpperCase() + reqKey.slice(1)}:".`,
      });
    }
  }

  if (gotchas.length === 0) {
    errors.push({
      line: lines.length,
      field: 'gotchas',
      message: 'Missing required [Gotcha] + Fix pair.',
    });
  }

  return {
    ok: errors.length === 0,
    kind: 'pick',
    version,
    data:
      errors.length === 0
        ? {
            archetypeId: fields.archetypeid ? fields.archetypeid.value : null,
            stack: fields.stack.value,
            why: fields.why.value,
            performance: fields.performance.value,
            offline: fields.offline.value,
            cost: fields.cost.value,
            gotchas: gotchas.map(({ issue, mitigation }) => ({ issue, mitigation })),
          }
        : null,
    errors,
  };
}

function parseLockBlock(rawText) {
  const errors = [];
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return {
      ok: false,
      kind: 'lock',
      version: null,
      data: null,
      errors: [{ line: 1, field: 'header', message: 'Empty input; expected VIBECRAFT LOCK block.' }],
    };
  }

  const lines = rawText.replace(/\r\n/g, '\n').trim().split('\n');
  const first = lines[0].trim();
  const headerMatch = first.match(/^VIBECRAFT LOCK(?:\s+v(\d+))?\s*·\s*Phase 2/i);
  if (!headerMatch) {
    return {
      ok: false,
      kind: 'lock',
      version: null,
      data: null,
      errors: [
        {
          line: 1,
          field: 'header',
          message: `Invalid header "${first}"; expected "VIBECRAFT LOCK v2 · Phase 2 · Brand Artisan".`,
        },
      ],
    };
  }

  const version = headerMatch[1] ? Number.parseInt(headerMatch[1], 10) : 1;
  if (version !== 1 && version !== 2) {
    errors.push({ line: 1, field: 'version', message: `Unsupported VIBECRAFT LOCK version v${version}.` });
  }

  let archetype = null;
  let themeId = null;
  let scheme = null;
  let waivers = [];
  let inRoot = false;
  let closedRoot = false;
  const tokens = {};

  for (let i = 1; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const line = lines[i].trim();
    if (!line) continue;

    if (!inRoot && !closedRoot) {
      if (line === ':root {') {
        inRoot = true;
        continue;
      }
      const metaMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
      if (metaMatch) {
        const key = metaMatch[1].toLowerCase();
        const val = metaMatch[2].trim();
        if (key === 'archetype') archetype = val;
        else if (key === 'themeid') themeId = val;
        else if (key === 'scheme') scheme = val;
        else if (key === 'waivers') {
          waivers = val
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
        continue;
      }
      errors.push({ line: lineNo, field: 'syntax', message: `Unexpected line before :root {: "${line}"` });
      continue;
    }

    if (inRoot) {
      if (line === '}') {
        inRoot = false;
        closedRoot = true;
        continue;
      }
      const propMatch = line.match(/^--([a-z0-9-]+)\s*:\s*(.+?)\s*;$/);
      if (!propMatch) {
        errors.push({
          line: lineNo,
          field: 'token-syntax',
          message: `Malformed CSS custom property "${line}" (expected "--name: value;").`,
        });
        continue;
      }
      tokens[propMatch[1]] = propMatch[2];
    }
  }

  if (!archetype) {
    errors.push({ line: 2, field: 'Archetype', message: 'Missing "Archetype:" line.' });
  }
  if (!closedRoot) {
    errors.push({
      line: lines.length,
      field: ':root',
      message: inRoot
        ? 'Truncated :root { ... } block (missing closing "}").'
        : 'Missing ":root { ... }" CSS token block.',
    });
  }

  const missingKeys = TOKEN_KEYS.filter((k) => !tokens[k]);
  if (missingKeys.length > 0) {
    errors.push({
      line: lines.length,
      field: 'tokens',
      message: `Missing ${missingKeys.length} of ${TOKEN_KEYS.length} required TOKEN_KEYS: ${missingKeys.map((k) => `--${k}`).join(', ')}.`,
    });
  }

  return {
    ok: errors.length === 0,
    kind: 'lock',
    version,
    data:
      errors.length === 0
        ? {
            archetype,
            themeId,
            scheme,
            waivers,
            tokens,
          }
        : null,
    errors,
  };
}

function parseAnyGateBlock(rawText) {
  const trimmed = String(rawText || '').trim();
  if (/^VIBECRAFT PICK\b/i.test(trimmed) || /^\[Gotcha/i.test(trimmed)) {
    return parsePickBlock(trimmed);
  }
  if (/^VIBECRAFT LOCK\b/i.test(trimmed)) {
    return parseLockBlock(trimmed);
  }
  return {
    ok: false,
    kind: 'unknown',
    version: null,
    data: null,
    errors: [
      {
        line: 1,
        field: 'header',
        message: 'Input is neither a VIBECRAFT PICK nor a VIBECRAFT LOCK block.',
      },
    ],
  };
}

module.exports = {
  TOKEN_KEYS,
  formatPickBlock,
  formatLockBlock,
  parsePickBlock,
  parseLockBlock,
  parseAnyGateBlock,
};
