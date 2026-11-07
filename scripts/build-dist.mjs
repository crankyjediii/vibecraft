#!/usr/bin/env node
/**
 * Deterministically synchronizes `system_prompt.md` and builds `dist/vibecraft-desktop/`
 * (`PROJECT_INSTRUCTIONS.md`, `knowledge/*.md`, `vibecraft-skill.zip`, and `SHA256SUMS.txt`).
 *
 * Zero external dependencies and zero OS `zip` binary dependency: uses a reproducible
 * pure-Node PKZIP writer with fixed DOS timestamps so `--check` produces identical
 * SHA-256 digests on macOS, Linux, and Windows.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'vibecraft-desktop');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function normalizeLf(text) {
  return text.replace(/\r\n/g, '\n');
}

function stripFrontmatter(markdown) {
  const norm = normalizeLf(markdown);
  const match = norm.match(/^---\n[\s\S]*?\n---\n+/);
  return match ? norm.slice(match[0].length) : norm;
}

/**
 * Builds a reproducible PKZIP buffer from `{ name, data }` entries sorted lexicographically.
 * Uses fixed DOS date/time 1980-01-01 00:00:00 (date=0x0021, time=0x0000) for zero timestamp drift.
 */
export function buildDeterministicZip(entries) {
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of sorted) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const rawBuf = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const compressed = zlib.deflateRawSync(rawBuf, { level: 9 });
    const useDeflate = compressed.length < rawBuf.length;
    const payload = useDeflate ? compressed : rawBuf;
    const method = useDeflate ? 8 : 0;
    const sum = crc32(rawBuf);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // UTF-8 filename flag
    localHeader.writeUInt16LE(method, 8);     // compression method
    localHeader.writeUInt16LE(0x0000, 10);    // mod time 00:00:00
    localHeader.writeUInt16LE(0x0021, 12);    // mod date 1980-01-01
    localHeader.writeUInt32LE(sum, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(rawBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);         // extra len

    localParts.push(localHeader, nameBuf, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4);         // version made by
    centralHeader.writeUInt16LE(20, 6);         // version needed
    centralHeader.writeUInt16LE(0x0800, 8);     // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0x0000, 12);
    centralHeader.writeUInt16LE(0x0021, 14);
    centralHeader.writeUInt32LE(sum, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(rawBuf.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);         // extra len
    centralHeader.writeUInt16LE(0, 32);         // comment len
    centralHeader.writeUInt16LE(0, 34);         // disk start
    centralHeader.writeUInt16LE(0, 36);         // internal attrs
    centralHeader.writeUInt32LE(0, 38);         // external attrs
    centralHeader.writeUInt32LE(offset, 42);    // relative offset of local header

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(sorted.length, 8);
  eocd.writeUInt16LE(sorted.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function readUtf8(relPath) {
  return normalizeLf(fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf8'));
}

export function computeExpectedArtifacts() {
  const orchestratorRaw = readUtf8('skills/vibecraft/SKILL.md');
  const orchestratorBody = stripFrontmatter(orchestratorRaw);

  // 1. Root system_prompt.md (synchronized single source of truth)
  const systemPrompt =
    '<!-- Generated from skills/vibecraft/SKILL.md by scripts/build-dist.mjs; do not edit directly. -->\n\n' +
    orchestratorBody;

  // 2. Stripped specialist playbooks and shared references
  const knowledgeFiles = {
    'craft-12.md': readUtf8('skills/vibecraft/references/craft-12.md'),
    'code-quality.md': readUtf8('skills/vibecraft/references/code-quality.md'),
    'orchestrator-examples.md': readUtf8('skills/vibecraft/references/examples.md'),
    'phase-1-scout.md': stripFrontmatter(readUtf8('skills/research-scout/SKILL.md')),
    'gotcha-library.md': readUtf8('skills/research-scout/references/gotcha-library.md'),
    'phase-1-examples.md': readUtf8('skills/research-scout/references/examples.md'),
    'phase-2-artisan.md': stripFrontmatter(readUtf8('skills/brand-artisan/SKILL.md')),
    'phase-2-examples.md': readUtf8('skills/brand-artisan/references/examples.md'),
    'phase-3-architect.md': stripFrontmatter(readUtf8('skills/system-architect/SKILL.md')),
    'phase-3-examples.md': readUtf8('skills/system-architect/references/examples.md'),
    'phase-4-builder.md': stripFrontmatter(readUtf8('skills/fullstack-builder/SKILL.md')),
    'phase-4-builder-examples.md': readUtf8('skills/fullstack-builder/references/examples.md'),
    'phase-4-auditor.md': stripFrontmatter(readUtf8('skills/qa-auditor/SKILL.md')),
    'phase-4-auditor-examples.md': readUtf8('skills/qa-auditor/references/examples.md'),
  };

  // 3. Standalone skill SKILL.md for Claude Desktop Custom Skills zip & ~/.claude/skills/vibecraft
  const standaloneSkillMd = normalizeLf(
    orchestratorRaw
      .replace(/`research-scout\/SKILL\.md`/g, '`references/phase-1-scout.md`')
      .replace(/`gotcha-library\.md`/g, '`references/gotcha-library.md`')
      .replace(/`brand-artisan\/SKILL\.md`/g, '`references/phase-2-artisan.md`')
      .replace(/`craft-12\.md`/g, '`references/craft-12.md`')
      .replace(/`system-architect\/SKILL\.md`/g, '`references/phase-3-architect.md`')
      .replace(/`code-quality\.md`/g, '`references/code-quality.md`')
      .replace(/`fullstack-builder\/SKILL\.md`/g, '`references/phase-4-builder.md`')
      .replace(/`qa-auditor\/SKILL\.md`/g, '`references/phase-4-auditor.md`')
      .replace(/`templates\/generative-ui\/`/g, '`templates/`')
  );

  const templateNames = [
    'stack_matrix_artifact.html',
    'brand_studio_artifact.html',
    'qa_diff_artifact.html',
    'launchpad_artifact.html',
  ];

  const zipEntries = [
    { name: 'vibecraft/SKILL.md', data: Buffer.from(standaloneSkillMd, 'utf8') },
  ];
  for (const [kName, kContent] of Object.entries(knowledgeFiles)) {
    zipEntries.push({
      name: `vibecraft/references/${kName}`,
      data: Buffer.from(kContent, 'utf8'),
    });
  }
  for (const tpl of templateNames) {
    zipEntries.push({
      name: `vibecraft/templates/${tpl}`,
      data: Buffer.from(readUtf8(`templates/generative-ui/${tpl}`), 'utf8'),
    });
  }

  const zipBuffer = buildDeterministicZip(zipEntries);

  const desktopReadme = normalizeLf(`# VibeCraft for Claude Desktop

Choose one of two setup paths depending on how you use Claude Desktop:

## Option A (Recommended): Upload Custom Skill Archive (Progressive Loading)

1. Open **Claude Desktop -> Settings -> Capabilities -> Skills**.
2. Click **Upload skill** and select \`vibecraft-skill.zip\` from this folder.
3. Optional local MCP tools: run \`./install.sh\` (macOS/Linux) or \`.\\install.ps1\` (Windows) from the repository root to register \`vibecraft-filesystem\`, \`vibecraft-brave-search\`, and \`vibecraft-fetch\`.

Why Option A wins: Claude loads \`vibecraft/SKILL.md\` (~1.5k tokens) first and reads \`references/*.md\` and \`templates/*.html\` on demand instead of paying ~25k tokens on every turn.

## Option B: Dedicated Claude Project

1. Create a Project named **VibeCraft** and paste \`PROJECT_INSTRUCTIONS.md\` into **Project Instructions**.
2. Upload the playbooks from \`knowledge/\` (and any HTML templates from \`../../templates/generative-ui/\` you want rendered without local MCP filesystem access).
`);

  // Map of relative path (from repo root) -> Buffer
  const files = new Map();
  files.set('system_prompt.md', Buffer.from(systemPrompt, 'utf8'));
  files.set('dist/vibecraft-desktop/PROJECT_INSTRUCTIONS.md', Buffer.from(orchestratorBody, 'utf8'));
  files.set('dist/vibecraft-desktop/README.md', Buffer.from(desktopReadme, 'utf8'));
  files.set('dist/vibecraft-desktop/vibecraft-skill.zip', zipBuffer);

  for (const [kName, kContent] of Object.entries(knowledgeFiles)) {
    files.set(`dist/vibecraft-desktop/knowledge/${kName}`, Buffer.from(kContent, 'utf8'));
  }

  // Compute SHA256SUMS.txt over all files inside dist/vibecraft-desktop/
  const distEntries = [...files.entries()]
    .filter(([rel]) => rel.startsWith('dist/vibecraft-desktop/'))
    .map(([rel, buf]) => ({
      relInDist: rel.slice('dist/vibecraft-desktop/'.length),
      hash: sha256Hex(buf),
    }))
    .sort((a, b) => (a.relInDist < b.relInDist ? -1 : a.relInDist > b.relInDist ? 1 : 0));

  const shaSumsText = `${distEntries.map((e) => `${e.hash}  ${e.relInDist}`).join('\n')}\n`;
  files.set('dist/vibecraft-desktop/SHA256SUMS.txt', Buffer.from(shaSumsText, 'utf8'));

  return { files, standaloneSkillMd, knowledgeFiles };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const { files } = computeExpectedArtifacts();

  if (checkOnly) {
    const drifts = [];
    for (const [relPath, expectedBuf] of files.entries()) {
      const absPath = path.join(ROOT_DIR, relPath);
      if (!fs.existsSync(absPath)) {
        drifts.push(`missing: ${relPath}`);
        continue;
      }
      const actualBuf = fs.readFileSync(absPath);
      if (sha256Hex(actualBuf) !== sha256Hex(expectedBuf)) {
        drifts.push(`out-of-sync: ${relPath}`);
      }
    }
    // Also detect stray untracked files inside dist/vibecraft-desktop/
    if (fs.existsSync(DIST_DIR)) {
      const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) walk(full);
          else {
            const rel = path.relative(ROOT_DIR, full).replace(/\\/g, '/');
            if (!files.has(rel)) drifts.push(`unexpected file: ${rel}`);
          }
        }
      };
      walk(DIST_DIR);
    }

    if (drifts.length > 0) {
      process.stderr.write(
        `build-dist --check failed (${drifts.length} drift item(s)):\n` +
          drifts.map((d) => `  - ${d}`).join('\n') +
          '\nRun `node scripts/build-dist.mjs` to regenerate.\n'
      );
      process.exit(1);
    }
    process.stdout.write(`build-dist --check passed (${files.size} generated artifacts verified).\n`);
    process.exit(0);
  }

  // Clean dist/vibecraft-desktop before writing so stale files never linger
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  for (const [relPath, buf] of files.entries()) {
    const absPath = path.join(ROOT_DIR, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, buf);
  }
  process.stdout.write(
    `Built ${files.size} synchronized artifacts (system_prompt.md + dist/vibecraft-desktop/).\n`
  );
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)) {
  main();
}
