'use strict';

/**
 * Safe deterministic auto-fixer (`--fix`) for mechanical VibeCraft audit violations:
 * - `VC006`: rewrites Tailwind `transition-all` -> `transition-colors` and CSS `transition: all ...` -> explicit safe properties
 * - `VC014`: removes standalone `console.log(...)` / `console.debug(...)` statement lines
 * - `VC017`: removes standalone narrating `// increment ...` / `// set the ...` comment lines
 *
 * Never touches behavior-bearing error handling, types, or token definitions.
 */

const fs = require('node:fs');
const { kindOf } = require('./engine.js');

const NARRATING_COMMENT_LINE_RE =
  /^\s*\/\/\s*(?:increment|decrement|loop through|iterate over|return the|set the|call the|initialize the|import the|export the)\b.*$/i;

const STANDALONE_CONSOLE_LINE_RE = /^\s*console\.(?:log|debug)\s*\([^;()\n]*\)\s*;?\s*$/;

function fixSource(source, filename = 'input.ts') {
  const kind = kindOf(filename);
  const hasCrlf = source.includes('\r\n');
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const outLines = [];
  const applied = [];

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    if (kind === 'js' || kind === 'ts') {
      if (NARRATING_COMMENT_LINE_RE.test(line)) {
        applied.push({ ruleId: 'VC017', line: lineNo, description: 'Removed narrating comment line' });
        return;
      }
      if (STANDALONE_CONSOLE_LINE_RE.test(line)) {
        applied.push({ ruleId: 'VC014', line: lineNo, description: 'Removed standalone console debug line' });
        return;
      }
    }

    let updated = line;
    if (['css', 'html', 'js', 'ts'].includes(kind)) {
      if (/\btransition-all\b/.test(updated)) {
        updated = updated.replace(/\btransition-all\b/g, 'transition-colors');
        applied.push({ ruleId: 'VC006', line: lineNo, description: 'Replaced wildcard transition utility with transition-colors' });
      }
      if (/transition-property\s*:\s*all\b/.test(updated)) {
        updated = updated.replace(
          /transition-property\s*:\s*all\b/g,
          'transition-property: background-color, border-color, color, opacity, transform'
        );
        applied.push({ ruleId: 'VC006', line: lineNo, description: 'Scoped wildcard transition-property to explicit properties' });
      }
      const transShorthand = updated.match(/transition\s*:\s*all\s+([^;}"']+)/);
      if (transShorthand) {
        const timing = transShorthand[1].trim();
        updated = updated.replace(
          /transition\s*:\s*all\s+[^;}"']+/,
          `transition: background-color ${timing}, border-color ${timing}, color ${timing}, opacity ${timing}, transform ${timing}`
        );
        applied.push({ ruleId: 'VC006', line: lineNo, description: 'Scoped wildcard transition shorthand to explicit properties' });
      }
    }

    outLines.push(updated);
  });

  const joined = outLines.join(hasCrlf ? '\r\n' : '\n');
  return {
    changed: applied.length > 0 && joined !== source,
    output: joined,
    applied,
  };
}

function fixFiles(filePaths) {
  const edits = [];
  for (const file of filePaths) {
    const original = fs.readFileSync(file, 'utf8');
    const res = fixSource(original, file);
    if (res.changed) {
      fs.writeFileSync(file, res.output, 'utf8');
      edits.push({ file, applied: res.applied });
    }
  }
  return edits;
}

module.exports = {
  fixSource,
  fixFiles,
};
