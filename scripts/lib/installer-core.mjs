#!/usr/bin/env node
/**
 * Shared cross-platform installer engine for `install.sh` and `install.ps1`.
 * Zero runtime dependencies.
 *
 * Security & robustness guarantees:
 * - Strips UTF-8 BOM before JSON.parse (`COR-07`)
 * - Validates existing `claude_desktop_config.json` BEFORE creating any `.bak-*` file (`COR-07`)
 * - Resolves symlinks via `fs.realpathSync` so atomic rename updates symlink target in-place (`COR-06`)
 * - Enforces `0o600` permissions on backups and written configs (`SEC-06`)
 * - Never expands arbitrary `process.env` keys or writes plaintext API keys (`SEC-05`, `SEC-07`)
 * - Supports `--dry-run`, `--check`, `--uninstall`, `--no-desktop`, `--no-cli`, `--workspace`
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeExpectedArtifacts } from '../build-dist.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const VIBECRAFT_SERVER_KEYS = [
  'vibecraft-filesystem',
  'vibecraft-brave-search',
  'vibecraft-fetch',
];

export function resolvePaths(options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const homedir = options.homedir || os.homedir();

  let desktopConfig;
  if (options.desktopConfig) {
    desktopConfig = path.resolve(options.desktopConfig);
  } else if (env.CLAUDE_DESKTOP_CONFIG) {
    desktopConfig = path.resolve(env.CLAUDE_DESKTOP_CONFIG);
  } else if (platform === 'darwin') {
    desktopConfig = path.join(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
    desktopConfig = path.join(appData, 'Claude', 'claude_desktop_config.json');
  } else {
    const xdg = env.XDG_CONFIG_HOME || path.join(homedir, '.config');
    desktopConfig = path.join(xdg, 'Claude', 'claude_desktop_config.json');
  }

  const skillsBase = options.skillsDir
    ? path.resolve(options.skillsDir)
    : env.CLAUDE_SKILLS_DIR
      ? path.resolve(env.CLAUDE_SKILLS_DIR)
      : path.join(homedir, '.claude', 'skills');

  const workspaceDir = options.workspaceDir
    ? path.resolve(options.workspaceDir)
    : env.VIBECRAFT_WORKSPACE_DIR
      ? path.resolve(env.VIBECRAFT_WORKSPACE_DIR)
      : path.join(homedir, 'Projects');

  return {
    desktopConfig,
    skillTargetDir: path.join(skillsBase, 'vibecraft'),
    workspaceDir,
  };
}

function stripBom(raw) {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function readAndValidateJsonObject(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const clean = stripBom(raw);
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (err) {
    throw new Error(`Existing config at "${filePath}" is not valid JSON (${err.message}). Fix or move it before running the installer.`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Existing config at "${filePath}" must be a top-level JSON object.`);
  }
  return { raw, parsed };
}

function loadTemplateServers(repoRoot, workspaceDir) {
  const tplPath = path.join(repoRoot, 'claude_desktop_config.json');
  const { parsed } = readAndValidateJsonObject(tplPath);
  const servers = {};
  for (const [name, cfg] of Object.entries(parsed.mcpServers || {})) {
    const cloned = JSON.parse(JSON.stringify(cfg));
    if (Array.isArray(cloned.args)) {
      cloned.args = cloned.args.map((arg) =>
        arg === '${VIBECRAFT_WORKSPACE_DIR}' ? workspaceDir : arg
      );
    }
    servers[name] = cloned;
  }
  return servers;
}

function writeAtomic0600(logicalPath, content) {
  // Resolve symlink target if the file already exists (`COR-06`)
  let writeTarget = logicalPath;
  if (fs.existsSync(logicalPath)) {
    writeTarget = fs.realpathSync(logicalPath);
  }
  const parentDir = path.dirname(writeTarget);
  fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });

  const suffix = `${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const tmpPath = path.join(parentDir, `.vibecraft-tmp-${suffix}.json`);
  try {
    fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
    fs.chmodSync(tmpPath, 0o600);
    fs.renameSync(tmpPath, writeTarget);
    fs.chmodSync(writeTarget, 0o600);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch {
      // Ignore secondary cleanup error
    }
    throw err;
  }
}

function createBackup0600(logicalPath, rawBytesOrText) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${logicalPath}.bak-${stamp}`;
  fs.writeFileSync(backupPath, rawBytesOrText, { encoding: 'utf8', mode: 0o600 });
  fs.chmodSync(backupPath, 0o600);
  return backupPath;
}

function installStandaloneSkill(repoRoot, skillTargetDir, dryRun) {
  const { standaloneSkillMd, knowledgeFiles } = computeExpectedArtifacts();
  const templateNames = [
    'stack_matrix_artifact.html',
    'brand_studio_artifact.html',
    'qa_diff_artifact.html',
    'launchpad_artifact.html',
  ];

  const plannedWrites = [
    { rel: 'SKILL.md', content: standaloneSkillMd },
    ...Object.entries(knowledgeFiles).map(([name, content]) => ({
      rel: `references/${name}`,
      content,
    })),
    ...templateNames.map((tpl) => ({
      rel: `templates/${tpl}`,
      content: fs.readFileSync(path.join(repoRoot, 'templates', 'generative-ui', tpl), 'utf8'),
    })),
  ];

  if (dryRun) {
    return { wroteCount: plannedWrites.length, targetDir: skillTargetDir };
  }

  // Clean legacy nested `skills/` subfolder if upgrading from v0.1 prototype (`PRM-31`)
  fs.rmSync(path.join(skillTargetDir, 'skills'), { recursive: true, force: true });

  for (const item of plannedWrites) {
    const dest = path.join(skillTargetDir, item.rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, item.content, 'utf8');
  }

  // Copy scripts/doctor.mjs and scripts/audit/ (if present) so standalone skill can invoke them locally
  const scriptsSrc = path.join(repoRoot, 'scripts');
  const doctorSrc = path.join(scriptsSrc, 'doctor.mjs');
  if (fs.existsSync(doctorSrc)) {
    const destDoctor = path.join(skillTargetDir, 'scripts', 'doctor.mjs');
    fs.mkdirSync(path.dirname(destDoctor), { recursive: true });
    fs.copyFileSync(doctorSrc, destDoctor);
  }
  const auditDirSrc = path.join(scriptsSrc, 'audit');
  if (fs.existsSync(auditDirSrc)) {
    const destAudit = path.join(skillTargetDir, 'scripts', 'audit');
    fs.mkdirSync(destAudit, { recursive: true });
    for (const ent of fs.readdirSync(auditDirSrc, { withFileTypes: true })) {
      if (ent.isFile()) {
        fs.copyFileSync(path.join(auditDirSrc, ent.name), path.join(destAudit, ent.name));
      }
    }
  }

  return { wroteCount: plannedWrites.length, targetDir: skillTargetDir };
}

function uninstallStandaloneSkill(skillTargetDir, dryRun) {
  const resolved = path.resolve(skillTargetDir);
  if (path.basename(resolved) !== 'vibecraft' || resolved.length < 12) {
    throw new Error(`Refusing to remove unsafe skill path: "${resolved}"`);
  }
  if (!fs.existsSync(resolved)) {
    return { removed: false, targetDir: resolved };
  }
  if (!dryRun) {
    fs.rmSync(resolved, { recursive: true, force: true });
  }
  return { removed: true, targetDir: resolved };
}

export function executeInstaller(opts = {}) {
  const repoRoot = opts.repoRoot ? path.resolve(opts.repoRoot) : REPO_ROOT;
  const mode = opts.uninstall ? 'uninstall' : opts.check ? 'check' : 'install';
  const dryRun = Boolean(opts.dryRun);
  const doDesktop = !opts.noDesktop;
  const doCli = !opts.noCli;

  const { desktopConfig, skillTargetDir, workspaceDir } = resolvePaths(opts);
  const logs = [];

  if (mode === 'check') {
    let ok = true;
    if (doDesktop) {
      if (!fs.existsSync(desktopConfig)) {
        ok = false;
        logs.push(`[FAIL] Claude Desktop config missing at ${desktopConfig}`);
      } else {
        const { parsed } = readAndValidateJsonObject(desktopConfig);
        const servers = parsed.mcpServers && typeof parsed.mcpServers === 'object' ? parsed.mcpServers : {};
        const missing = VIBECRAFT_SERVER_KEYS.filter((k) => !(k in servers));
        if (missing.length > 0) {
          ok = false;
          logs.push(`[FAIL] Desktop config missing MCP server(s): ${missing.join(', ')}`);
        } else {
          logs.push(`[PASS] Desktop config verified (${VIBECRAFT_SERVER_KEYS.length} vibecraft MCP servers at ${desktopConfig})`);
        }
      }
    }
    if (doCli) {
      const skillMd = path.join(skillTargetDir, 'SKILL.md');
      const craftRef = path.join(skillTargetDir, 'references', 'craft-12.md');
      if (!fs.existsSync(skillMd) || !fs.existsSync(craftRef)) {
        ok = false;
        logs.push(`[FAIL] Standalone skill missing at ${skillTargetDir}`);
      } else {
        logs.push(`[PASS] Standalone skill verified at ${skillTargetDir}`);
      }
    }
    return { ok, mode, logs };
  }

  if (mode === 'uninstall') {
    if (doDesktop) {
      if (!fs.existsSync(desktopConfig)) {
        logs.push(`Desktop config not present at ${desktopConfig}; nothing to remove.`);
      } else {
        const { raw, parsed } = readAndValidateJsonObject(desktopConfig);
        const servers = parsed.mcpServers && typeof parsed.mcpServers === 'object' ? parsed.mcpServers : {};
        let removedCount = 0;
        for (const k of VIBECRAFT_SERVER_KEYS) {
          if (k in servers) {
            delete servers[k];
            removedCount += 1;
          }
        }
        if (removedCount === 0) {
          logs.push(`No vibecraft-* MCP entries found in ${desktopConfig}.`);
        } else if (dryRun) {
          logs.push(`[dry-run] Would back up ${desktopConfig} and remove ${removedCount} vibecraft-* MCP server(s).`);
        } else {
          const backupPath = createBackup0600(desktopConfig, raw);
          writeAtomic0600(desktopConfig, `${JSON.stringify(parsed, null, 2)}\n`);
          logs.push(`Backed up Desktop config to ${backupPath} (0600) and removed ${removedCount} vibecraft-* MCP server(s).`);
        }
      }
    }
    if (doCli) {
      const res = uninstallStandaloneSkill(skillTargetDir, dryRun);
      if (!res.removed) {
        logs.push(`Standalone skill not present at ${res.targetDir}; nothing to remove.`);
      } else if (dryRun) {
        logs.push(`[dry-run] Would remove ${res.targetDir}.`);
      } else {
        logs.push(`Removed standalone skill directory ${res.targetDir}.`);
      }
    }
    return { ok: true, mode, logs };
  }

  // mode === 'install'
  if (doDesktop) {
    const incomingServers = loadTemplateServers(repoRoot, workspaceDir);
    let currentObj = {};
    let existingRaw = null;

    if (fs.existsSync(desktopConfig)) {
      const validated = readAndValidateJsonObject(desktopConfig);
      existingRaw = validated.raw;
      currentObj = validated.parsed;
    }

    if (!currentObj.mcpServers || typeof currentObj.mcpServers !== 'object' || Array.isArray(currentObj.mcpServers)) {
      currentObj.mcpServers = {};
    }

    for (const [k, v] of Object.entries(incomingServers)) {
      currentObj.mcpServers[k] = v;
    }

    const serialized = `${JSON.stringify(currentObj, null, 2)}\n`;

    if (dryRun) {
      logs.push(`[dry-run] Would merge ${Object.keys(incomingServers).length} pinned vibecraft-* MCP server(s) into ${desktopConfig} (workspace: ${workspaceDir}).`);
    } else {
      if (!fs.existsSync(workspaceDir)) {
        fs.mkdirSync(workspaceDir, { recursive: true });
      }
      if (existingRaw !== null && existingRaw !== serialized) {
        const backupPath = createBackup0600(desktopConfig, existingRaw);
        logs.push(`Backed up existing Desktop config to ${backupPath} (mode 0600).`);
      }
      writeAtomic0600(desktopConfig, serialized);
      logs.push(`Merged ${Object.keys(incomingServers).length} pinned vibecraft-* MCP server(s) into ${desktopConfig} (mode 0600).`);
    }
  }

  if (doCli) {
    const res = installStandaloneSkill(repoRoot, skillTargetDir, dryRun);
    if (dryRun) {
      logs.push(`[dry-run] Would install ${res.wroteCount} skill files into ${res.targetDir}.`);
    } else {
      logs.push(`Installed ${res.wroteCount} progressive-loading skill files into ${res.targetDir}.`);
    }
  }

  return { ok: true, mode, logs };
}

function parseCliArgs(argv) {
  const opts = {
    dryRun: false,
    uninstall: false,
    check: false,
    noDesktop: false,
    noCli: false,
    workspaceDir: undefined,
    desktopConfig: undefined,
    skillsDir: undefined,
    repoRoot: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--uninstall') opts.uninstall = true;
    else if (a === '--check') opts.check = true;
    else if (a === '--no-desktop') opts.noDesktop = true;
    else if (a === '--no-cli') opts.noCli = true;
    else if (a === '--workspace' && argv[i + 1]) {
      opts.workspaceDir = argv[++i];
    } else if (a === '--desktop-config' && argv[i + 1]) {
      opts.desktopConfig = argv[++i];
    } else if (a === '--skills-dir' && argv[i + 1]) {
      opts.skillsDir = argv[++i];
    } else if (a === '--repo-root' && argv[i + 1]) {
      opts.repoRoot = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete flag: ${a}`);
    }
  }
  return opts;
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)) {
  try {
    const opts = parseCliArgs(process.argv.slice(2));
    const result = executeInstaller(opts);
    for (const line of result.logs) {
      process.stdout.write(`${line}\n`);
    }
    process.exit(result.ok ? 0 : 1);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }
}
