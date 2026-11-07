#!/usr/bin/env node
/**
 * VibeCraft environment, manifest, and configuration health check.
 * Zero runtime dependencies. Supports human table output and `--json`.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const REQUIRED_SKILLS = [
  'vibecraft',
  'research-scout',
  'brand-artisan',
  'system-architect',
  'fullstack-builder',
  'qa-auditor',
];

const REQUIRED_COMMANDS = [
  'build.md',
  'stack.md',
  'brand.md',
  'audit.md',
  'launchpad.md',
  'doctor.md',
];

const REQUIRED_TEMPLATES = [
  'stack_matrix_artifact.html',
  'brand_studio_artifact.html',
  'qa_diff_artifact.html',
  'launchpad_artifact.html',
];

function defaultDesktopConfigPath(platform = process.platform, env = process.env, homedir = os.homedir()) {
  if (env.CLAUDE_DESKTOP_CONFIG) {
    return path.resolve(env.CLAUDE_DESKTOP_CONFIG);
  }
  if (platform === 'darwin') {
    return path.join(homedir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(homedir, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  const xdg = env.XDG_CONFIG_HOME || path.join(homedir, '.config');
  return path.join(xdg, 'Claude', 'claude_desktop_config.json');
}

function stripBom(raw) {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function checkBinary(cmd, args = ['--version']) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    timeout: 5000,
    shell: process.platform === 'win32',
  });
  if (res.error || res.status !== 0) {
    return { found: false, version: null };
  }
  const firstLine = `${res.stdout || ''}${res.stderr || ''}`.trim().split(/\r?\n/)[0] || 'present';
  return { found: true, version: firstLine };
}

function parseFrontmatter(markdown) {
  const match = stripBom(markdown).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      fields[key] = val;
    }
  }
  return fields;
}

function validateMcpFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    return {
      id: label,
      status: 'fail',
      detail: `Missing ${path.relative(ROOT_DIR, filePath)}`,
      fix: `Restore ${path.relative(ROOT_DIR, filePath)} from git: git checkout -- ${path.relative(ROOT_DIR, filePath)}`,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(stripBom(fs.readFileSync(filePath, 'utf8')));
  } catch (err) {
    return {
      id: label,
      status: 'fail',
      detail: `Invalid JSON in ${path.basename(filePath)}: ${err.message}`,
      fix: `Fix JSON syntax in ${path.relative(ROOT_DIR, filePath)}`,
    };
  }
  const servers = parsed && typeof parsed === 'object' ? parsed.mcpServers : null;
  if (!servers || typeof servers !== 'object') {
    return {
      id: label,
      status: 'fail',
      detail: `Missing "mcpServers" object in ${path.basename(filePath)}`,
      fix: `Ensure ${path.relative(ROOT_DIR, filePath)} defines "mcpServers"`,
    };
  }
  const unpinned = [];
  const leakedSecrets = [];
  for (const [name, cfg] of Object.entries(servers)) {
    const args = Array.isArray(cfg.args) ? cfg.args : [];
    if (cfg.command === 'npx') {
      const pkgArg = args.find((a) => !a.startsWith('-') && (a.startsWith('@') || /^[a-z0-9]/.test(a)));
      if (!pkgArg || !/@\d+\.\d+\.\d+/.test(pkgArg)) {
        unpinned.push(`${name} (${pkgArg || 'missing package'})`);
      }
    } else if (cfg.command === 'uvx') {
      const pinned = args.some((a) => /==\d+/.test(a));
      if (!pinned) {
        unpinned.push(`${name} (unpinned uvx package)`);
      }
    }
    if (cfg.env && typeof cfg.env === 'object') {
      for (const [envKey, envVal] of Object.entries(cfg.env)) {
        if (
          typeof envVal === 'string' &&
          /KEY|TOKEN|SECRET/i.test(envKey) &&
          envVal.length > 0 &&
          !/^\$\{[A-Z0-9_]+\}$/.test(envVal)
        ) {
          leakedSecrets.push(`${name}.env.${envKey}`);
        }
      }
    }
  }
  if (unpinned.length > 0) {
    return {
      id: label,
      status: 'fail',
      detail: `Unpinned MCP package(s): ${unpinned.join(', ')}`,
      fix: `Pin exact package versions in ${path.relative(ROOT_DIR, filePath)}`,
    };
  }
  if (leakedSecrets.length > 0) {
    return {
      id: label,
      status: 'fail',
      detail: `Literal secret value detected in ${leakedSecrets.join(', ')}`,
      fix: `Replace literal secrets with \${ENV_VAR} references in ${path.relative(ROOT_DIR, filePath)}`,
    };
  }
  return {
    id: label,
    status: 'pass',
    detail: `${Object.keys(servers).length} pinned MCP server(s) verified`,
    fix: null,
  };
}

export function runDoctor(options = {}) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : ROOT_DIR;
  const checks = [];

  // 1. Node.js runtime >= 18
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (Number.isNaN(major) || major < 18) {
    checks.push({
      id: 'node-runtime',
      status: 'fail',
      detail: `Node.js ${process.versions.node} detected (< 18.0.0)`,
      fix: 'Install Node.js 20 LTS or 22 LTS from https://nodejs.org',
    });
  } else {
    checks.push({
      id: 'node-runtime',
      status: 'pass',
      detail: `Node.js v${process.versions.node}`,
      fix: null,
    });
  }

  // 2. npx availability
  const npxCheck = checkBinary('npx', ['--version']);
  if (!npxCheck.found) {
    checks.push({
      id: 'npx-cli',
      status: 'fail',
      detail: 'npx not found on PATH (required for MCP filesystem and search servers)',
      fix: 'Install Node.js + npm so `npx` is on your PATH',
    });
  } else {
    checks.push({
      id: 'npx-cli',
      status: 'pass',
      detail: `npx ${npxCheck.version}`,
      fix: null,
    });
  }

  // 3. uvx availability (optional fetch server)
  const uvxCheck = checkBinary('uvx', ['--version']);
  if (!uvxCheck.found) {
    checks.push({
      id: 'uvx-cli',
      status: 'warn',
      detail: 'uvx not found on PATH (optional: needed only for vibecraft-fetch MCP server)',
      fix:
        process.platform === 'win32'
          ? 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
          : 'curl -LsSf https://astral.sh/uv/install.sh | sh',
    });
  } else {
    checks.push({
      id: 'uvx-cli',
      status: 'pass',
      detail: uvxCheck.version,
      fix: null,
    });
  }

  // 4. Plugin & Marketplace manifests
  const pluginManifestPath = path.join(rootDir, '.claude-plugin', 'plugin.json');
  const marketManifestPath = path.join(rootDir, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(pluginManifestPath) || !fs.existsSync(marketManifestPath)) {
    checks.push({
      id: 'plugin-manifests',
      status: 'fail',
      detail: 'Missing .claude-plugin/plugin.json or .claude-plugin/marketplace.json',
      fix: 'Run from a complete VibeCraft checkout containing .claude-plugin/',
    });
  } else {
    try {
      const pj = JSON.parse(stripBom(fs.readFileSync(pluginManifestPath, 'utf8')));
      const mj = JSON.parse(stripBom(fs.readFileSync(marketManifestPath, 'utf8')));
      const iconPath = path.resolve(rootDir, pj.icon || '.claude-plugin/icon.png');
      if (!pj.name || !pj.version || !Array.isArray(mj.plugins) || mj.plugins.length === 0) {
        checks.push({
          id: 'plugin-manifests',
          status: 'fail',
          detail: 'Manifest missing required name, version, or plugins[] entry',
          fix: 'Run `claude plugin validate --strict .` to inspect schema errors',
        });
      } else if (!fs.existsSync(iconPath)) {
        checks.push({
          id: 'plugin-manifests',
          status: 'fail',
          detail: `Plugin icon missing at ${path.relative(rootDir, iconPath)}`,
          fix: 'Restore .claude-plugin/icon.png',
        });
      } else {
        checks.push({
          id: 'plugin-manifests',
          status: 'pass',
          detail: `${pj.name}@${pj.version} (${mj.plugins.length} marketplace plugin)`,
          fix: null,
        });
      }
    } catch (err) {
      checks.push({
        id: 'plugin-manifests',
        status: 'fail',
        detail: `Manifest JSON parse error: ${err.message}`,
        fix: 'Fix JSON syntax in .claude-plugin/*.json',
      });
    }
  }

  // 5. MCP configurations
  checks.push(validateMcpFile(path.join(rootDir, '.mcp.json'), 'plugin-mcp-config'));
  checks.push(validateMcpFile(path.join(rootDir, 'claude_desktop_config.json'), 'desktop-mcp-template'));

  // 6. Skills inventory
  const missingSkills = [];
  for (const skill of REQUIRED_SKILLS) {
    const skillPath = path.join(rootDir, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      missingSkills.push(skill);
      continue;
    }
    const fm = parseFrontmatter(fs.readFileSync(skillPath, 'utf8'));
    if (!fm || !fm.name || !fm.description) {
      missingSkills.push(`${skill} (invalid frontmatter)`);
    }
  }
  checks.push(
    missingSkills.length === 0
      ? {
          id: 'skills-inventory',
          status: 'pass',
          detail: `${REQUIRED_SKILLS.length}/${REQUIRED_SKILLS.length} skills verified`,
          fix: null,
        }
      : {
          id: 'skills-inventory',
          status: 'fail',
          detail: `Missing or invalid skill(s): ${missingSkills.join(', ')}`,
          fix: 'Restore skills/<name>/SKILL.md files with valid name and description frontmatter',
        }
  );

  // 7. Slash commands inventory
  const missingCommands = [];
  for (const cmdFile of REQUIRED_COMMANDS) {
    const cmdPath = path.join(rootDir, 'commands', cmdFile);
    if (!fs.existsSync(cmdPath)) {
      missingCommands.push(cmdFile);
      continue;
    }
    const fm = parseFrontmatter(fs.readFileSync(cmdPath, 'utf8'));
    if (!fm || !fm.description) {
      missingCommands.push(`${cmdFile} (missing description)`);
    }
  }
  checks.push(
    missingCommands.length === 0
      ? {
          id: 'commands-inventory',
          status: 'pass',
          detail: `${REQUIRED_COMMANDS.length}/${REQUIRED_COMMANDS.length} slash commands verified`,
          fix: null,
        }
      : {
          id: 'commands-inventory',
          status: 'fail',
          detail: `Missing or invalid command(s): ${missingCommands.join(', ')}`,
          fix: 'Restore commands/*.md files with description frontmatter',
        }
  );

  // 8. Generative UI templates inventory
  const missingTemplates = REQUIRED_TEMPLATES.filter((tpl) => {
    const p = path.join(rootDir, 'templates', 'generative-ui', tpl);
    return !fs.existsSync(p) || fs.statSync(p).size < 256;
  });
  checks.push(
    missingTemplates.length === 0
      ? {
          id: 'templates-inventory',
          status: 'pass',
          detail: `${REQUIRED_TEMPLATES.length}/${REQUIRED_TEMPLATES.length} HTML artifacts present`,
          fix: null,
        }
      : {
          id: 'templates-inventory',
          status: 'fail',
          detail: `Missing or empty template(s): ${missingTemplates.join(', ')}`,
          fix: 'Run `node scripts/build-templates.mjs` or restore templates/generative-ui/*.html',
        }
  );

  // 9. User Claude Desktop config health (if file exists on disk)
  const desktopCfgPath = options.desktopConfigPath || defaultDesktopConfigPath();
  if (fs.existsSync(desktopCfgPath)) {
    try {
      const parsed = JSON.parse(stripBom(fs.readFileSync(desktopCfgPath, 'utf8')));
      const servers = parsed && typeof parsed === 'object' && parsed.mcpServers ? Object.keys(parsed.mcpServers) : [];
      const vcServers = servers.filter((k) => k.startsWith('vibecraft-'));
      checks.push({
        id: 'user-desktop-config',
        status: vcServers.length > 0 ? 'pass' : 'warn',
        detail:
          vcServers.length > 0
            ? `Valid JSON (${vcServers.length} vibecraft MCP server(s) active at ${desktopCfgPath})`
            : `Valid JSON at ${desktopCfgPath} (no vibecraft-* MCP servers installed yet)`,
        fix:
          vcServers.length > 0
            ? null
            : process.platform === 'win32'
              ? '.\\install.ps1'
              : './install.sh',
      });
    } catch (err) {
      checks.push({
        id: 'user-desktop-config',
        status: 'fail',
        detail: `Malformed JSON in ${desktopCfgPath}: ${err.message}`,
        fix: `Repair JSON syntax in "${desktopCfgPath}" or restore its .bak-* backup`,
      });
    }
  } else {
    checks.push({
      id: 'user-desktop-config',
      status: 'pass',
      detail: `No Claude Desktop config at ${desktopCfgPath} (optional; run installer to configure Desktop)`,
      fix: null,
    });
  }

  const counts = {
    pass: checks.filter((c) => c.status === 'pass').length,
    warn: checks.filter((c) => c.status === 'warn').length,
    fail: checks.filter((c) => c.status === 'fail').length,
  };

  return {
    ok: counts.fail === 0,
    summary: counts,
    checks,
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(
      'Usage: node scripts/doctor.mjs [--json] [--desktop-config <path>]\n' +
        'Checks Node runtime, npx/uvx CLIs, manifests, skills, commands, templates, and Desktop MCP config.\n'
    );
    process.exit(0);
  }

  const jsonMode = args.includes('--json');
  const cfgIdx = args.indexOf('--desktop-config');
  const desktopConfigPath = cfgIdx >= 0 && args[cfgIdx + 1] ? path.resolve(args[cfgIdx + 1]) : undefined;

  const report = runDoctor({ desktopConfigPath });

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(report.ok ? 0 : 1);
  }

  const glyphs = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
  process.stdout.write('VibeCraft Doctor\n');
  process.stdout.write('────────────────\n');
  for (const c of report.checks) {
    const badge = glyphs[c.status] || c.status.toUpperCase();
    process.stdout.write(`[${badge}] ${c.id.padEnd(22)} ${c.detail}\n`);
    if (c.fix) {
      process.stdout.write(`       Fix: ${c.fix}\n`);
    }
  }
  process.stdout.write('────────────────\n');
  process.stdout.write(
    `Result: ${report.summary.pass} passed, ${report.summary.warn} warning(s), ${report.summary.fail} failed.\n`
  );
  process.exit(report.ok ? 0 : 1);
}

if (process.argv[1] && fs.realpathSync(path.resolve(process.argv[1])) === fs.realpathSync(__filename)) {
  main();
}
