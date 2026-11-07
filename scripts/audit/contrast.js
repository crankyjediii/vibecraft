'use strict';

/**
 * Deterministic WCAG 2.2 relative luminance and alpha-composited contrast evaluator.
 * Supports `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, and `hsla()`.
 * Zero runtime dependencies.
 */

function clampByte(v) {
  return Math.max(0, Math.min(255, v));
}

function hslToRgb(h, s, l) {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const lig = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

function parseColor(raw) {
  if (typeof raw !== 'string') return null;
  const str = raw.trim();

  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return [r, g, b, a];
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return [r, g, b, a];
    }
    return null;
  }

  const rgbMatch = str.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (rgbMatch) {
    const r = clampByte(Number.parseFloat(rgbMatch[1]));
    const g = clampByte(Number.parseFloat(rgbMatch[2]));
    const b = clampByte(Number.parseFloat(rgbMatch[3]));
    let a = 1;
    if (rgbMatch[4] !== undefined) {
      a = rgbMatch[4].endsWith('%')
        ? Number.parseFloat(rgbMatch[4]) / 100
        : Number.parseFloat(rgbMatch[4]);
    }
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return [r, g, b, Math.max(0, Math.min(1, a))];
  }

  const hslMatch = str.match(
    /^hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i
  );
  if (hslMatch) {
    const [r, g, b] = hslToRgb(
      Number.parseFloat(hslMatch[1]),
      Number.parseFloat(hslMatch[2]) / 100,
      Number.parseFloat(hslMatch[3]) / 100
    );
    let a = 1;
    if (hslMatch[4] !== undefined) {
      a = hslMatch[4].endsWith('%')
        ? Number.parseFloat(hslMatch[4]) / 100
        : Number.parseFloat(hslMatch[4]);
    }
    return [r, g, b, Math.max(0, Math.min(1, a))];
  }

  return null;
}

function compositeOver(fg, bg) {
  const alpha = fg[3];
  if (alpha >= 1) return [fg[0], fg[1], fg[2], 1];
  return [
    fg[0] * alpha + bg[0] * (1 - alpha),
    fg[1] * alpha + bg[1] * (1 - alpha),
    fg[2] * alpha + bg[2] * (1 - alpha),
    1,
  ];
}

function relativeLuminance(rgba) {
  const linearize = (channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgba[0]) + 0.7152 * linearize(rgba[1]) + 0.0722 * linearize(rgba[2]);
}

function contrastRatio(colorA, colorB) {
  const lumA = relativeLuminance(colorA);
  const lumB = relativeLuminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates a map of token key -> raw CSS value (e.g. `{ bg: '#0b0c0e', ink: '#f4f5f8', ... }`)
 * against WCAG 2.2 AA contrast thresholds (`4.5:1` for text pairs, `3.0:1` for UI indicator pairs).
 */
function evaluateTokenMapContrast(tokenMap, scopeLabel = ':root') {
  const issues = [];
  const firstKey = (...keys) => keys.find((k) => tokenMap[k] !== undefined);
  const resolveFirst = (...keys) => {
    const k = firstKey(...keys);
    return k ? { key: k, raw: tokenMap[k], rgba: parseColor(tokenMap[k]) } : null;
  };

  const bgTok = resolveFirst('bg-primary', 'bg');
  const bg = bgTok?.rgba || null;
  const surfTok = resolveFirst('bg-surface', 'surface');
  const surface = surfTok?.rgba ? (surfTok.rgba[3] < 1 && bg ? compositeOver(surfTok.rgba, bg) : surfTok.rgba) : bg;
  const surfKey = surfTok?.key || bgTok?.key || 'bg-surface';
  const surfRaw = surfTok?.raw || bgTok?.raw || '';

  const surf2Tok = resolveFirst('bg-raised', 'surface-2');
  const surface2 = surf2Tok?.rgba
    ? surf2Tok.rgba[3] < 1 && bg
      ? compositeOver(surf2Tok.rgba, bg)
      : surf2Tok.rgba
    : surface;
  const surf2Key = surf2Tok?.key || surfKey;
  const surf2Raw = surf2Tok?.raw || surfRaw;

  const checkPair = (fgTok, bgName, bgRaw, bgColor, minRatio, kindLabel) => {
    if (!fgTok?.rgba || !bgColor) return;
    const effectiveFg = fgTok.rgba[3] < 1 ? compositeOver(fgTok.rgba, bgColor) : fgTok.rgba;
    const ratio = contrastRatio(effectiveFg, bgColor);
    if (ratio < minRatio) {
      issues.push({
        scope: scopeLabel,
        fgKey: fgTok.key,
        bgKey: bgName,
        ratio: Number(ratio.toFixed(2)),
        minRatio,
        message: `${scopeLabel} ${kindLabel} contrast --${fgTok.key} (${fgTok.raw}) on --${bgName} (${bgRaw}) is ${ratio.toFixed(2)}:1 (< ${minRatio.toFixed(1)}:1 WCAG 2.2 AA).`,
      });
    }
  };

  const inkTok = resolveFirst('fg-primary', 'ink');
  const mutedTok = resolveFirst('fg-muted', 'muted');
  const accentTok = resolveFirst('accent');
  const accent2Tok = resolveFirst('accent-2');
  const accentFgTok = resolveFirst('accent-fg');
  const accentSoftTok = resolveFirst('accent-soft');
  const okTok = resolveFirst('success', 'ok');
  const warnTok = resolveFirst('warn');
  const dangerTok = resolveFirst('danger');

  if (inkTok && bg) checkPair(inkTok, bgTok.key, bgTok.raw, bg, 4.5, 'text');
  if (inkTok && surface) checkPair(inkTok, surfKey, surfRaw, surface, 4.5, 'text');
  if (mutedTok && bg) checkPair(mutedTok, bgTok.key, bgTok.raw, bg, 4.5, 'muted text');
  if (mutedTok && surface) checkPair(mutedTok, surfKey, surfRaw, surface, 4.5, 'muted text');
  if (mutedTok && surface2) checkPair(mutedTok, surf2Key, surf2Raw, surface2, 4.5, 'muted text');
  if (accentFgTok && accentTok?.rgba) {
    const effAccent = accentTok.rgba[3] < 1 && surface ? compositeOver(accentTok.rgba, surface) : accentTok.rgba;
    checkPair(accentFgTok, accentTok.key, accentTok.raw, effAccent, 4.5, 'CTA text');
  }

  if (accentTok?.rgba && accentSoftTok?.rgba && surface) {
    const compositedSoft = compositeOver(accentSoftTok.rgba, surface);
    const r = contrastRatio(compositeOver(accentTok.rgba, compositedSoft), compositedSoft);
    if (r < 4.5) {
      issues.push({
        scope: scopeLabel,
        fgKey: accentTok.key,
        bgKey: accentSoftTok.key,
        ratio: Number(r.toFixed(2)),
        minRatio: 4.5,
        message: `${scopeLabel} badge contrast --${accentTok.key} (${accentTok.raw}) on composited --${accentSoftTok.key} (${accentSoftTok.raw}) is ${r.toFixed(2)}:1 (< 4.5:1 WCAG 2.2 AA).`,
      });
    }
  }

  if (okTok?.rgba && surface) {
    const okSoft = compositeOver([okTok.rgba[0], okTok.rgba[1], okTok.rgba[2], 0.12], surface);
    const rOk = contrastRatio(compositeOver(okTok.rgba, okSoft), okSoft);
    if (rOk < 4.5) {
      issues.push({
        scope: scopeLabel,
        fgKey: okTok.key,
        bgKey: surfKey,
        ratio: Number(rOk.toFixed(2)),
        minRatio: 4.5,
        message: `${scopeLabel} chip text contrast --${okTok.key} (${okTok.raw}) on tinted --${surfKey} (${surfRaw}) is ${rOk.toFixed(2)}:1 (< 4.5:1 WCAG 2.2 AA).`,
      });
    }
  }
  if (okTok && surface2) checkPair(okTok, surf2Key, surf2Raw, surface2, 3.0, 'UI indicator');
  if (accent2Tok && surface2) checkPair(accent2Tok, surf2Key, surf2Raw, surface2, 3.0, 'UI progress/accent-2');
  if (warnTok && surface) checkPair(warnTok, surfKey, surfRaw, surface, 4.5, 'status text');
  if (dangerTok && surface) checkPair(dangerTok, surfKey, surfRaw, surface, 4.5, 'status text');

  return issues;
}

/**
 * Extracts CSS custom property scopes (`:root`, `[data-theme=...]`, `@media (prefers-color-scheme: ...)`)
 * and `@tokens:start .. @tokens:end` JS theme maps, returning `{ line, issues }` contrast findings.
 */
function auditSourceTokenContrast(source, kind) {
  const findings = [];

  if (kind === 'css' || kind === 'html') {
    const blockRegex = /(:root|\[data-theme[^\]]*\]|@media\s*\(\s*prefers-color-scheme\s*:\s*\w+\s*\)\s*\{\s*:root)\s*\{([\s\S]*?)\}/g;
    let match;
    while ((match = blockRegex.exec(source)) !== null) {
      const scopeLabel = match[1].replace(/\s+/g, ' ').trim();
      const body = match[2];
      const startLine = source.slice(0, match.index).split('\n').length;
      const map = {};
      const propRegex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
      let pm;
      while ((pm = propRegex.exec(body)) !== null) {
        map[pm[1]] = pm[2].trim();
      }
      for (const issue of evaluateTokenMapContrast(map, scopeLabel)) {
        findings.push({
          line: startLine,
          message: issue.message,
          text: `${scopeLabel} { --${issue.fgKey}: ${map[issue.fgKey]} }`,
        });
      }
    }
  }

  if (kind === 'html' || kind === 'js' || kind === 'ts') {
    const tokenSectionRegex = /@tokens:start([\s\S]*?)@tokens:end/g;
    let tm;
    while ((tm = tokenSectionRegex.exec(source)) !== null) {
      const blockText = tm[1];
      const baseOffset = tm.index;
      // Match individual theme object blocks: `themeKey: { ... 'bg-primary'|bg: ... }`
      const themeObjRegex = /\b([a-zA-Z0-9_-]+)\s*:\s*\{([^{}]*?['"]?(?:bg-primary|bg)['"]?\s*:\s*['"][^'"]+['"][^{}]*)\}/g;
      let om;
      while ((om = themeObjRegex.exec(blockText)) !== null) {
        const themeKey = om[1];
        const objBody = om[2];
        const line = source.slice(0, baseOffset + om.index).split('\n').length;
        const map = {};
        const kvRegex = /['"]?([a-zA-Z0-9-]+)['"]?\s*:\s*(['"])(.*?)\2/g;
        let kvm;
        while ((kvm = kvRegex.exec(objBody)) !== null) {
          map[kvm[1]] = kvm[3];
        }
        for (const issue of evaluateTokenMapContrast(map, `THEMES.${themeKey}`)) {
          findings.push({
            line,
            message: issue.message,
            text: `${themeKey}: { ${issue.fgKey}: '${map[issue.fgKey]}' }`,
          });
        }
      }
    }
  }

  return findings;
}

module.exports = {
  parseColor,
  compositeOver,
  relativeLuminance,
  contrastRatio,
  evaluateTokenMapContrast,
  auditSourceTokenContrast,
};
