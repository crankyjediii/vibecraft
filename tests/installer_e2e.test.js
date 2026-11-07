const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..');
const INSTALL_SH = path.join(REPO_ROOT, 'install.sh');
const DOCTOR_MJS = path.join(REPO_ROOT, 'scripts', 'doctor.mjs');
const BUILD_DIST_MJS = path.join(REPO_ROOT, 'scripts', 'build-dist.mjs');

function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibecraft-e2e-'));
  const home = path.join(root, 'home');
  const xdg = path.join(home, '.config');
  const desktopCfg = path.join(root, 'claude', 'claude_desktop_config.json');
  const skillsDir = path.join(home, '.claude', 'skills');
  const workspaceDir = path.join(home, 'Projects');
  fs.mkdirSync(home, { recursive: true });

  const env = {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    CLAUDE_DESKTOP_CONFIG: desktopCfg,
    CLAUDE_SKILLS_DIR: skillsDir,
    VIBECRAFT_WORKSPACE_DIR: workspaceDir,
    BRAVE_API_KEY: ['TEST', 'BRAVE', 'SENTINEL', 'DO', 'NOT', 'PERSIST'].join('_'),
  };

  return {
    root,
    home,
    desktopCfg,
    skillsDir,
    workspaceDir,
    env,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function runBash(args, env, input = undefined) {
  return spawnSync('/bin/bash', args, {
    cwd: REPO_ROOT,
    env,
    input,
    encoding: 'utf8',
    timeout: 15000,
  });
}

test('resolvePaths handles darwin, linux XDG_CONFIG_HOME, and win32 APPDATA accurately', async () => {
  const { resolvePaths } = await import('../scripts/lib/installer-core.mjs');
  const mac = resolvePaths({ platform: 'darwin', env: {}, homedir: '/Users/alice' });
  assert.equal(
    mac.desktopConfig,
    path.join('/Users/alice', 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
  );

  const linuxDefault = resolvePaths({ platform: 'linux', env: {}, homedir: '/home/alice' });
  assert.equal(
    linuxDefault.desktopConfig,
    path.join('/home/alice', '.config', 'Claude', 'claude_desktop_config.json')
  );

  const linuxXdg = resolvePaths({
    platform: 'linux',
    env: { XDG_CONFIG_HOME: '/tmp/custom-xdg' },
    homedir: '/home/alice',
  });
  assert.equal(
    linuxXdg.desktopConfig,
    path.join('/tmp/custom-xdg', 'Claude', 'claude_desktop_config.json')
  );

  const win = resolvePaths({
    platform: 'win32',
    env: { APPDATA: 'C:\\Users\\alice\\AppData\\Roaming' },
    homedir: 'C:\\Users\\alice',
  });
  assert.ok(win.desktopConfig.endsWith(path.join('Claude', 'claude_desktop_config.json')));
});

test(
  'install.sh full lifecycle: dry-run, fresh install, 0600 perms, secret isolation, check, idempotent re-run, uninstall',
  { skip: process.platform === 'win32' },
  () => {
  const sb = makeSandbox();
  try {
    // 1. --dry-run writes nothing
    const dry = runBash([INSTALL_SH, '--dry-run', '--yes'], sb.env);
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(fs.existsSync(sb.desktopCfg), false);
    assert.equal(fs.existsSync(path.join(sb.skillsDir, 'vibecraft')), false);

    // 2. --check before install exits 1
    const preCheck = runBash([INSTALL_SH, '--check'], sb.env);
    assert.equal(preCheck.status, 1);

    // 3. Seed unrelated existing config with 0644 permissions + UTF-8 BOM to test BOM + 0600 hardening
    fs.mkdirSync(path.dirname(sb.desktopCfg), { recursive: true });
    const seedJson =
      '\uFEFF' +
      JSON.stringify(
        {
          globalShortcut: 'CommandOrControl+Shift+Space',
          mcpServers: {
            'custom-git': { command: 'npx', args: ['-y', '@custom/git@1.0.0'] },
          },
        },
        null,
        2
      );
    fs.writeFileSync(sb.desktopCfg, seedJson, { mode: 0o644 });
    fs.chmodSync(sb.desktopCfg, 0o644);

    // 4. Run fresh install under macOS /bin/bash 3.2
    const ins = runBash([INSTALL_SH, '--yes'], sb.env);
    assert.equal(ins.status, 0, ins.stderr);

    // Verify 0600 on both config and backup (`SEC-06`)
    const cfgMode = fs.statSync(sb.desktopCfg).mode & 0o777;
    assert.equal(cfgMode, 0o600);
    const parentFiles = fs.readdirSync(path.dirname(sb.desktopCfg));
    const backups = parentFiles.filter((f) => f.startsWith('claude_desktop_config.json.bak-'));
    assert.equal(backups.length, 1);
    const bakMode = fs.statSync(path.join(path.dirname(sb.desktopCfg), backups[0])).mode & 0o777;
    assert.equal(bakMode, 0o600);

    // Verify merged JSON preserves custom-git, pins exact versions, and does NOT leak BRAVE_API_KEY (`SEC-05`, `SEC-07`)
    const mergedText = fs.readFileSync(sb.desktopCfg, 'utf8');
    assert.equal(mergedText.includes('TEST_BRAVE_SENTINEL_DO_NOT_PERSIST'), false);
    const merged = JSON.parse(mergedText);
    assert.equal(merged.globalShortcut, 'CommandOrControl+Shift+Space');
    assert.ok(merged.mcpServers['custom-git']);
    assert.deepEqual(merged.mcpServers['vibecraft-filesystem'].args, [
      '-y',
      '@modelcontextprotocol/server-filesystem@2.2.0',
      sb.workspaceDir,
    ]);
    assert.equal(merged.mcpServers['vibecraft-brave-search'].env.BRAVE_API_KEY, '${BRAVE_API_KEY}');

    // Verify progressive-loading skill layout (`PRM-31`: zero nested `skills/` dir)
    const vcSkillRoot = path.join(sb.skillsDir, 'vibecraft');
    assert.equal(fs.existsSync(path.join(vcSkillRoot, 'SKILL.md')), true);
    assert.equal(fs.existsSync(path.join(vcSkillRoot, 'references', 'craft-12.md')), true);
    assert.equal(fs.existsSync(path.join(vcSkillRoot, 'templates', 'brand_studio_artifact.html')), true);
    assert.equal(fs.existsSync(path.join(vcSkillRoot, 'skills')), false);

    // 5. --check exits 0
    const postCheck = runBash([INSTALL_SH, '--check'], sb.env);
    assert.equal(postCheck.status, 0, postCheck.stdout + postCheck.stderr);

    // 6. Idempotent re-run creates zero additional backups when config is unchanged
    const rerun = runBash([INSTALL_SH, '--yes'], sb.env);
    assert.equal(rerun.status, 0, rerun.stderr);
    const backupsAfterRerun = fs
      .readdirSync(path.dirname(sb.desktopCfg))
      .filter((f) => f.startsWith('claude_desktop_config.json.bak-'));
    assert.equal(backupsAfterRerun.length, 1);

    // 7. --uninstall removes vibecraft-* keys + skill dir while keeping custom-git
    const unins = runBash([INSTALL_SH, '--uninstall', '--yes'], sb.env);
    assert.equal(unins.status, 0, unins.stderr);
    const afterUnins = JSON.parse(fs.readFileSync(sb.desktopCfg, 'utf8'));
    assert.ok(afterUnins.mcpServers['custom-git']);
    assert.equal('vibecraft-filesystem' in afterUnins.mcpServers, false);
    assert.equal(fs.existsSync(vcSkillRoot), false);
    assert.equal(runBash([INSTALL_SH, '--check'], sb.env).status, 1);
  } finally {
    sb.cleanup();
  }
});

test(
  'install.sh preserves symlinked claude_desktop_config.json and rejects malformed JSON before creating backups',
  { skip: process.platform === 'win32' },
  () => {
  const sb = makeSandbox();
  try {
    // 1. Malformed JSON leaves zero orphan .bak-* files (`COR-07`)
    fs.mkdirSync(path.dirname(sb.desktopCfg), { recursive: true });
    fs.writeFileSync(sb.desktopCfg, '{ "mcpServers": { trailingComma: true, } }', 'utf8');
    const bad = runBash([INSTALL_SH, '--yes'], sb.env);
    assert.equal(bad.status, 1);
    const orphanBackups = fs
      .readdirSync(path.dirname(sb.desktopCfg))
      .filter((f) => f.includes('.bak-'));
    assert.equal(orphanBackups.length, 0);

    // 2. Symlinked config updates real target without replacing symlink (`COR-06`)
    fs.unlinkSync(sb.desktopCfg);
    const dotfilesDir = path.join(sb.root, 'dotfiles');
    fs.mkdirSync(dotfilesDir, { recursive: true });
    const realTarget = path.join(dotfilesDir, 'claude_config.json');
    fs.writeFileSync(realTarget, '{"mcpServers":{}}\n', { mode: 0o600 });
    fs.symlinkSync(realTarget, sb.desktopCfg);

    const ok = runBash([INSTALL_SH, '--yes'], sb.env);
    assert.equal(ok.status, 0, ok.stderr);
    assert.equal(fs.lstatSync(sb.desktopCfg).isSymbolicLink(), true);
    const updatedReal = JSON.parse(fs.readFileSync(realTarget, 'utf8'));
    assert.ok(updatedReal.mcpServers['vibecraft-filesystem']);
    assert.equal(fs.statSync(realTarget).mode & 0o777, 0o600);
  } finally {
    sb.cleanup();
  }
});

test(
  'install.sh works when piped via stdin (`curl | bash` mode with BASH_SOURCE unbound)',
  { skip: process.platform === 'win32' },
  () => {
  const sb = makeSandbox();
  try {
    // Build a local release-shaped tarball in sandbox temp space
    const stageParent = path.join(sb.root, 'tar-stage');
    const stageRepo = path.join(stageParent, 'vibecraft-1.0.0');
    fs.mkdirSync(stageRepo, { recursive: true });
    for (const item of [
      '.claude-plugin',
      'claude_desktop_config.json',
      '.mcp.json',
      'skills',
      'commands',
      'templates',
      'scripts',
    ]) {
      fs.cpSync(path.join(REPO_ROOT, item), path.join(stageRepo, item), { recursive: true });
    }
    const tarPath = path.join(sb.root, 'vibecraft-v1.0.0.tar.gz');
    const tarRes = spawnSync('tar', ['-czf', tarPath, '-C', stageParent, 'vibecraft-1.0.0'], {
      encoding: 'utf8',
    });
    assert.equal(tarRes.status, 0, tarRes.stderr);

    const scriptContent = fs.readFileSync(INSTALL_SH, 'utf8');
    const pipedEnv = {
      ...sb.env,
      VIBECRAFT_TARBALL_URL: `file://${tarPath}`,
    };
    const piped = spawnSync('/bin/bash', ['-s', '--', '--yes'], {
      cwd: sb.home, // Outside repository checkout!
      env: pipedEnv,
      input: scriptContent,
      encoding: 'utf8',
      timeout: 15000,
    });
    assert.equal(piped.status, 0, piped.stderr);
    assert.equal(fs.existsSync(sb.desktopCfg), true);
    assert.equal(fs.existsSync(path.join(sb.skillsDir, 'vibecraft', 'SKILL.md')), true);
  } finally {
    sb.cleanup();
  }
});

test('doctor.mjs passes on healthy setup and fails with actionable fix on broken Desktop JSON', () => {
  const sb = makeSandbox();
  try {
    const healthy = spawnSync(process.execPath, [DOCTOR_MJS, '--json', '--desktop-config', sb.desktopCfg], {
      cwd: REPO_ROOT,
      env: sb.env,
      encoding: 'utf8',
    });
    assert.equal(healthy.status, 0, healthy.stderr);
    const healthyReport = JSON.parse(healthy.stdout);
    assert.equal(healthyReport.ok, true);

    fs.mkdirSync(path.dirname(sb.desktopCfg), { recursive: true });
    fs.writeFileSync(sb.desktopCfg, '{broken json', 'utf8');
    const broken = spawnSync(process.execPath, [DOCTOR_MJS, '--json', '--desktop-config', sb.desktopCfg], {
      cwd: REPO_ROOT,
      env: sb.env,
      encoding: 'utf8',
    });
    assert.equal(broken.status, 1);
    const brokenReport = JSON.parse(broken.stdout);
    assert.equal(brokenReport.ok, false);
    const failedCheck = brokenReport.checks.find((c) => c.id === 'user-desktop-config');
    assert.equal(failedCheck.status, 'fail');
    assert.match(failedCheck.fix, /Repair JSON syntax/);
  } finally {
    sb.cleanup();
  }
});

function listZipEntriesPureNode(zipPath) {
  const buf = fs.readFileSync(zipPath);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break; // Local file header signature
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.subarray(offset + 30, offset + 30 + nameLen).toString('utf8');
    entries.push(name);
    offset += 30 + nameLen + extraLen + compSize;
  }
  return entries;
}

test(
  'install.ps1 full lifecycle on Windows PowerShell (-DryRun, -Yes, -Check, idempotent, -Uninstall)',
  { skip: process.platform !== 'win32' },
  () => {
    const sb = makeSandbox();
    const ps1Path = path.join(REPO_ROOT, 'install.ps1');
    const runPwsh = (extraArgs) =>
      spawnSync(
        'pwsh',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1Path, ...extraArgs],
        { cwd: REPO_ROOT, env: sb.env, encoding: 'utf8', timeout: 20000 }
      );

    try {
      const dry = runPwsh(['-DryRun', '-Yes']);
      assert.equal(dry.status, 0, dry.stderr);
      assert.equal(fs.existsSync(sb.desktopCfg), false);

      const ins = runPwsh(['-Yes', '-Workspace', sb.workspaceDir]);
      assert.equal(ins.status, 0, ins.stderr);
      assert.equal(fs.existsSync(sb.desktopCfg), true);
      assert.equal(fs.existsSync(path.join(sb.skillsDir, 'vibecraft', 'SKILL.md')), true);

      const merged = JSON.parse(fs.readFileSync(sb.desktopCfg, 'utf8'));
      assert.ok(merged.mcpServers['vibecraft-filesystem']);
      assert.equal(merged.mcpServers['vibecraft-brave-search'].env.BRAVE_API_KEY, '${BRAVE_API_KEY}');

      const chk = runPwsh(['-Check']);
      assert.equal(chk.status, 0, chk.stderr);

      const unins = runPwsh(['-Uninstall', '-Yes']);
      assert.equal(unins.status, 0, unins.stderr);
      assert.equal(fs.existsSync(path.join(sb.skillsDir, 'vibecraft')), false);
      assert.equal(runPwsh(['-Check']).status, 1);
    } finally {
      sb.cleanup();
    }
  }
);

test('build-dist.mjs --check passes and vibecraft-skill.zip contains valid top-level vibecraft/SKILL.md', () => {
  const check = spawnSync(process.execPath, [BUILD_DIST_MJS, '--check'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  assert.equal(check.status, 0, check.stderr);

  const zipPath = path.join(REPO_ROOT, 'dist', 'vibecraft-desktop', 'vibecraft-skill.zip');
  assert.equal(fs.existsSync(zipPath), true);

  const entries = listZipEntriesPureNode(zipPath);
  assert.ok(entries.includes('vibecraft/SKILL.md'));
  assert.ok(entries.includes('vibecraft/references/craft-12.md'));
  assert.ok(entries.includes('vibecraft/templates/launchpad_artifact.html'));
});
