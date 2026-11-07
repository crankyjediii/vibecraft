'use strict';

/**
 * VibeCraft Audit Engine v2 core file & project analyzer.
 * Zero runtime dependencies. Supports single-file `audit(source, filename)`
 * (backward-compatible with v0.1 tests) and multi-file `auditPaths(paths, opts)`
 * including cross-module `VC015 dead-export` analysis.
 */

const fs = require('node:fs');
const path = require('node:path');
const {
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
} = require('./rules.js');

const TOKEN_DECLARATION_RE = /(?:^|\{)\s*--[\w-]+\s*:/;
const TOKEN_BLOCK_START_RE = /@tokens:start/;
const TOKEN_BLOCK_END_RE = /@tokens:end/;
const AUDIT_DATA_START_RE = /@audit-data:start/;
const AUDIT_DATA_END_RE = /@audit-data:end/;
const IGNORE_COMMENT_RE = /(?:\/\/|\/\*+|<!--|^\s*#)\s*vibecraft-ignore\b(.*)$/;

const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.claude',
  'prompts',
  'tests',
  'evals',
]);

const SUPPORTED_EXTS = new Set([
  '.css',
  '.html',
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.tsx',
  '.sh',
  '.json',
]);

function kindOf(filename) {
  const ext = path.extname(filename).slice(1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return 'ts';
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs' || ext === 'jsx') return 'js';
  if (ext === 'css') return 'css';
  if (ext === 'html') return 'html';
  if (ext === 'sh') return 'sh';
  if (ext === 'json') return 'json';
  return 'other';
}

function normalizeRuleRef(token) {
  const clean = token.trim();
  if (RULE_BY_ID.has(clean.toUpperCase())) return RULE_BY_ID.get(clean.toUpperCase()).id;
  if (RULE_BY_SLUG.has(clean.toLowerCase())) return RULE_BY_SLUG.get(clean.toLowerCase()).id;
  return null;
}

function parseIgnoreDirectives(lines) {
  const suppressedOnLine = new Map(); // lineNo (1-based) -> Set of ruleIds (or '*')
  const findings = [];

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1;
    const m = rawLine.match(IGNORE_COMMENT_RE);
    if (!m) return;

    const rest = m[1].replace(/\*\/\s*$/, '').replace(/-->\s*$/, '').trim();
    const colonIdx = rest.indexOf(':');
    if (colonIdx <= 0) {
      findings.push({
        ruleId: 'VC000',
        line: lineNo,
        text: rawLine.trim(),
        message: 'vibecraft-ignore directive must specify rule ID(s) and ": <reason>".',
      });
      return;
    }

    const rulesPart = rest.slice(0, colonIdx).trim();
    const reasonPart = rest.slice(colonIdx + 1).trim();
    if (reasonPart.length < 4) {
      findings.push({
        ruleId: 'VC000',
        line: lineNo,
        text: rawLine.trim(),
        message: 'vibecraft-ignore reason must be at least 4 characters explaining why suppression is safe.',
      });
      return;
    }

    const ids = rulesPart
      .split(',')
      .map(normalizeRuleRef)
      .filter(Boolean);
    if (ids.length === 0) {
      findings.push({
        ruleId: 'VC000',
        line: lineNo,
        text: rawLine.trim(),
        message: `Unknown rule identifier(s) "${rulesPart}" in vibecraft-ignore directive.`,
      });
      return;
    }

    for (const targetLine of [lineNo, lineNo + 1]) {
      if (!suppressedOnLine.has(targetLine)) suppressedOnLine.set(targetLine, new Set());
      for (const id of ids) suppressedOnLine.get(targetLine).add(id);
    }
  });

  return { suppressedOnLine, findings };
}

function isCommentOnlyLine(trimmed, kind) {
  if (!trimmed) return true;
  if (kind === 'js' || kind === 'ts' || kind === 'css') {
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return true;
  }
  if (kind === 'html' && trimmed.startsWith('<!--')) return true;
  if (kind === 'sh' && trimmed.startsWith('#')) return true;
  return false;
}

function hasHardcodedColorOnLine(rawLine, kind) {
  const trimmed = rawLine.trim();
  if (isCommentOnlyLine(trimmed, kind)) return false;

  // Strip trailing // comments in JS/TS and /* ... */ inline comments
  let line = rawLine.replace(/\/\*.*?\*\//g, '');
  if (kind === 'js' || kind === 'ts') {
    line = stripJsCommentsOnLine(line);
  }
  if (kind === 'html') {
    line = line.replace(/<!--.*?-->/g, '');
  }

  // Remove benign anchor/selector patterns (`href="#section"`, `querySelector('#id')`, `$('id')`)
  const sanitized = line
    .replace(/\b(?:href|xlink:href)\s*=\s*['"]#[A-Za-z0-9_-]+['"]/gi, '')
    .replace(/\b(?:querySelector|querySelectorAll)\s*\(\s*['"]#[^'"]+['"]\s*\)/g, '')
    .replace(/url\(\s*['"]?#[A-Za-z0-9_-]+['"]?\s*\)/gi, '');

  // In pure CSS, ignore selector region before `{` when checking `#hex` so ID selectors `#fade {` do not match
  const valueTarget =
    kind === 'css' && sanitized.includes('{')
      ? sanitized.slice(sanitized.indexOf('{') + 1)
      : kind === 'css' && !sanitized.includes(':')
        ? ''
        : sanitized;

  if (COLOR_REGEX.test(valueTarget)) return true;
  if (TAILWIND_PALETTE_REGEX.test(sanitized)) return true;
  if (NAMED_STYLE_COLOR_REGEX.test(valueTarget)) return true;
  return false;
}

function makeFinding(ruleId, line, text, customMessage, filename) {
  const meta = RULE_BY_ID.get(ruleId);
  return {
    ruleId,
    rule: meta ? meta.slug : ruleId,
    severity: meta ? meta.severity : 'warning',
    fixable: Boolean(meta && meta.fixable),
    file: filename,
    line,
    column: 1,
    message: customMessage || (meta ? meta.summary : ruleId),
    text: String(text || '').trim(),
  };
}

/**
 * Single-file analyzer. Returns array of findings sorted by `(line, ruleId)`.
 */
function auditFileSource(source, filename = 'input.ts') {
  const norm = String(source).replace(/\r\n/g, '\n');
  const kind = kindOf(filename);
  if (kind === 'other') return [];

  const lines = norm.split('\n');
  const { suppressedOnLine, findings: ignoreFindings } = parseIgnoreDirectives(lines);
  const rawFindings = [...ignoreFindings];

  const isSuppressed = (ruleId, lineNo) => {
    const set = suppressedOnLine.get(lineNo);
    return Boolean(set && set.has(ruleId));
  };

  let inTokenBlock = false;
  let inAuditDataBlock = false;
  let inBlockComment = false;

  lines.forEach((lineText, idx) => {
    const lineNo = idx + 1;
    const trimmed = lineText.trim();

    if (TOKEN_BLOCK_START_RE.test(lineText)) inTokenBlock = true;
    if (AUDIT_DATA_START_RE.test(lineText)) inAuditDataBlock = true;

    const tokenExempt = inTokenBlock || TOKEN_DECLARATION_RE.test(lineText);
    const dataExempt = inAuditDataBlock;

    if (TOKEN_BLOCK_END_RE.test(lineText)) inTokenBlock = false;
    if (AUDIT_DATA_END_RE.test(lineText)) inAuditDataBlock = false;

    if (dataExempt) return;

    // Track multi-line /* ... */ comments for code-only checks
    const startedInComment = inBlockComment;
    if (!inBlockComment && /\/\*/.test(lineText) && !/\*\//.test(lineText.slice(lineText.indexOf('/*') + 2))) {
      inBlockComment = true;
    } else if (inBlockComment && /\*\//.test(lineText)) {
      inBlockComment = false;
    }
    const isInsideBlockComment = startedInComment && !/\*\//.test(lineText);

    // VC016 placeholder (comments + copy)
    if (['css', 'html', 'js', 'ts', 'sh'].includes(kind)) {
      if (PLACEHOLDER_COMMENT_REGEX.test(lineText) || PLACEHOLDER_COPY_REGEX.test(lineText)) {
        rawFindings.push({ ruleId: 'VC016', line: lineNo, text: trimmed });
      }
    }

    // VC018 hardcoded-secret
    if (['css', 'html', 'js', 'ts', 'sh', 'json'].includes(kind)) {
      for (const pat of SECRET_PATTERNS) {
        if (pat.re.test(lineText)) {
          rawFindings.push({
            ruleId: 'VC018',
            line: lineNo,
            text: trimmed.slice(0, 60),
            message: `Potential ${pat.label} detected in source.`,
          });
          break;
        }
      }
    }

    // VC017 comment-slop
    if ((kind === 'js' || kind === 'ts') && !isInsideBlockComment) {
      if (
        /^\s*\/\/\s*(?:increment|decrement|loop through|iterate over|return the|set the|call the|initialize the|import the|export the)\b/i.test(
          lineText
        )
      ) {
        rawFindings.push({ ruleId: 'VC017', line: lineNo, text: trimmed });
      }
    }

    if (isInsideBlockComment || isCommentOnlyLine(trimmed, kind)) {
      return;
    }

    const codeNoComment =
      kind === 'js' || kind === 'ts'
        ? stripJsCommentsOnLine(lineText).replace(/(^|[=(,:!&|?]\s*)\/(?:\\.|[^/\r\n\\])+\/[gimsuy]*/g, '$1/re/')
        : lineText;
    const codeNoStrings = kind === 'js' || kind === 'ts' ? stripStringsAndCommentsOnLine(lineText) : lineText;

    // VC001 hardcoded-color
    if (['css', 'html', 'js', 'ts'].includes(kind) && !tokenExempt) {
      if (hasHardcodedColorOnLine(lineText, kind)) {
        rawFindings.push({ ruleId: 'VC001', line: lineNo, text: trimmed });
      }
    }

    // VC004 Tailwind focus:outline-none without ring replacement on JSX/HTML lines
    if (['html', 'js', 'ts'].includes(kind)) {
      if (/\b(?:focus:)?outline-none\b/.test(codeNoComment) && !/\b(?:focus|focus-visible):ring\b/.test(codeNoComment)) {
        rawFindings.push({
          ruleId: 'VC004',
          line: lineNo,
          text: trimmed,
          message: 'Utility class "outline-none" used without a focus-visible:ring replacement.',
        });
      }
    }

    // VC006 transition-all
    if (['css', 'html', 'js', 'ts'].includes(kind)) {
      if (/transition(?:-property)?\s*:\s*all\b/.test(codeNoComment) || /\btransition-all\b/.test(codeNoComment)) {
        rawFindings.push({ ruleId: 'VC006', line: lineNo, text: trimmed });
      }
    }

    // VC007 gradient
    if (['css', 'html', 'js', 'ts'].includes(kind)) {
      if (/(?:linear|radial|conic)-gradient\(/.test(codeNoComment) || /\bbg-gradient-to-(?:t|tr|r|br|b|bl|l|tl)\b/.test(codeNoComment)) {
        rawFindings.push({ ruleId: 'VC007', line: lineNo, text: trimmed });
      }
    }

    // VC008 glow-shadow
    if (['css', 'html', 'js', 'ts'].includes(kind) && !tokenExempt) {
      if (isSaturationGlow(codeNoComment)) {
        rawFindings.push({ ruleId: 'VC008', line: lineNo, text: trimmed });
      }
    }

    // VC009 z-index-arms-race
    if (['css', 'html', 'js', 'ts'].includes(kind)) {
      if (/z-index\s*:\s*\d{4,}/.test(codeNoComment) || /\bz-\[\d{4,}\]/.test(codeNoComment)) {
        rawFindings.push({ ruleId: 'VC009', line: lineNo, text: trimmed });
      }
    }

    // VC011 type-laundering
    if (kind === 'ts') {
      if (/\bas\s+any\b|\bas\s+unknown\s+as\b|:\s*any\b|<any>/.test(codeNoStrings)) {
        rawFindings.push({ ruleId: 'VC011', line: lineNo, text: trimmed });
      }
    }

    // VC014 console-leftover
    if (['html', 'js', 'ts'].includes(kind)) {
      if (/\bconsole\.(?:log|debug)\s*\(/.test(codeNoStrings)) {
        rawFindings.push({ ruleId: 'VC014', line: lineNo, text: trimmed });
      }
    }
  });

  // Structural / multi-line scanners
  for (const cf of auditSourceTokenContrast(norm, kind)) {
    rawFindings.push({ ruleId: 'VC002', line: cf.line, text: cf.text, message: cf.message });
  }
  rawFindings.push(...scanCssInteractiveRules(norm, kind));
  rawFindings.push(...scanUnlabeledControls(norm, kind, filename));
  rawFindings.push(...scanMissingReturnTypes(norm, kind));
  rawFindings.push(...scanSwallowedErrors(norm, kind));

  const filtered = rawFindings
    .filter((f) => f.ruleId === 'VC000' || !isSuppressed(f.ruleId, f.line))
    .map((f) => makeFinding(f.ruleId, f.line, f.text, f.message, filename));

  // Deduplicate identical (ruleId, line) hits
  const seen = new Set();
  const deduped = [];
  for (const item of filtered) {
    const key = `${item.ruleId}:${item.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => (a.line !== b.line ? a.line - b.line : a.ruleId.localeCompare(b.ruleId)));
  return deduped;
}

function tokenScore(source, filename = 'input.css') {
  const styledLines = String(source)
    .split('\n')
    .filter((l) => /color|background|border|fill|stroke|shadow/i.test(l)).length;
  const bad = auditFileSource(source, filename).filter((f) => f.ruleId === 'VC001').length;
  return styledLines === 0 ? 100 : Math.max(0, Math.round(100 * (1 - bad / styledLines)));
}

function collectFiles(targetPaths, ignoreDirs = DEFAULT_IGNORE_DIRS) {
  const out = [];
  const visit = (p, isExplicitRoot) => {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isFile()) {
      if (SUPPORTED_EXTS.has(path.extname(p).toLowerCase())) {
        out.push(path.resolve(p));
      }
      return;
    }
    if (stat.isDirectory()) {
      const base = path.basename(p);
      if (!isExplicitRoot && ignoreDirs.has(base)) return;
      for (const ent of fs.readdirSync(p, { withFileTypes: true })) {
        visit(path.join(p, ent.name), false);
      }
    }
  };

  for (const t of targetPaths) {
    visit(path.resolve(t), true);
  }
  return [...new Set(out)].sort();
}

/**
 * Cross-file `VC015 dead-export` analyzer across scanned JS/TS modules.
 */
function scanDeadExports(fileEntries) {
  const codeEntries = fileEntries.filter(({ file }) => {
    const k = kindOf(file);
    return k === 'js' || k === 'ts';
  });
  if (codeEntries.length < 2) return [];

  const exportsByFile = [];
  for (const { file, source } of codeEntries) {
    const base = path.basename(file);
    // Skip CLI entrypoints (`#!`), barrel index files, and test files
    if (
      source.startsWith('#!') ||
      /^index\.[cm]?[jt]sx?$/i.test(base) ||
      /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(base)
    ) {
      continue;
    }

    const lines = source.split('\n');
    const { suppressedOnLine } = parseIgnoreDirectives(lines);
    const declared = [];

    lines.forEach((line, idx) => {
      const lineNo = idx + 1;
      if (suppressedOnLine.get(lineNo)?.has('VC015')) return;
      const clean = stripJsCommentsOnLine(line);
      const declMatch = clean.match(
        /^\s*export\s+(?:async\s+)?(?:function|const|let|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)\b/
      );
      if (declMatch) {
        declared.push({ name: declMatch[1], line: lineNo, text: line.trim() });
      }
      const listMatch = clean.match(/^\s*export\s*\{([^}]+)\}(?!\s*from\b)/);
      if (listMatch) {
        for (const rawPart of listMatch[1].split(',')) {
          const part = rawPart.trim();
          if (!part) continue;
          const asParts = part.split(/\s+as\s+/);
          const exportedName = (asParts[1] || asParts[0]).trim();
          if (/^[A-Za-z_$][\w$]*$/.test(exportedName) && exportedName !== 'default') {
            declared.push({ name: exportedName, line: lineNo, text: line.trim() });
          }
        }
      }
    });

    // Also inspect CommonJS `module.exports = { a, b }` ONLY if file also uses ESM? No, keep VC015 focused on ESM named `export` declarations
    if (declared.length > 0) {
      exportsByFile.push({ file, declared });
    }
  }

  const deadFindings = [];
  for (const { file, declared } of exportsByFile) {
    const otherSources = codeEntries
      .filter((e) => e.file !== file)
      .map((e) => e.source)
      .join('\n');

    for (const sym of declared) {
      const refRe = new RegExp(`\\b${sym.name.replace(/\$/g, '\\$')}\\b`);
      if (!refRe.test(otherSources)) {
        deadFindings.push(
          makeFinding(
            'VC015',
            sym.line,
            sym.text,
            `Named export "${sym.name}" is never imported or referenced in any other scanned module.`,
            file
          )
        );
      }
    }
  }
  return deadFindings;
}

function auditPaths(targetPaths, options = {}) {
  const minSeverity = options.minSeverity || 'warning';
  const files = collectFiles(targetPaths, options.ignoreDirs || DEFAULT_IGNORE_DIRS);
  const fileEntries = files.map((file) => ({
    file,
    source: fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'),
  }));

  let allFindings = [];
  for (const entry of fileEntries) {
    allFindings.push(...auditFileSource(entry.source, entry.file));
  }
  allFindings.push(...scanDeadExports(fileEntries));

  if (minSeverity === 'error') {
    allFindings = allFindings.filter((f) => f.severity === 'error');
  }

  allFindings.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return {
    scannedFiles: files.length,
    findings: allFindings,
    rulesMeta: RULES_META,
  };
}

module.exports = {
  COLOR_REGEX,
  RULES_META,
  kindOf,
  audit: auditFileSource,
  auditFileSource,
  tokenScore,
  collectFiles,
  auditPaths,
};
