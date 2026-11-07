#!/usr/bin/env node
'use strict';

/**
 * VibeCraft Audit Engine v2 CLI (`vibecraft-audit`).
 *
 * Usage:
 *   node scripts/audit/cli.js [paths...] [--json] [--sarif] [--fix] [--min-severity warning|error]
 *
 * Exit codes:
 *   0 - Zero findings at or above `--min-severity`
 *   1 - One or more findings detected
 *   2 - CLI usage or invalid argument error
 */

const fs = require('node:fs');
const path = require('node:path');
const { auditPaths, collectFiles } = require('./engine.js');
const { fixFiles } = require('./fixer.js');
const { toSarif } = require('./sarif.js');

function printHelp() {
  process.stdout.write(
    [
      'Usage: vibecraft-audit [paths...] [options]',
      '',
      'Options:',
      '  --json                        Emit structured JSON report to stdout',
      '  --sarif                       Emit SARIF 2.1.0 report to stdout',
      '  --fix                         Auto-repair safe mechanical rules (VC006, VC014, VC017)',
      '  --min-severity <warning|error> Minimum severity threshold (default: warning)',
      '  -h, --help                    Show this help message',
      '',
      'Exit codes: 0 = clean, 1 = findings reported, 2 = invalid usage.',
      '',
    ].join('\n')
  );
}

function parseArgs(argv) {
  const opts = {
    targets: [],
    json: false,
    sarif: false,
    fix: false,
    minSeverity: 'warning',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--sarif') {
      opts.sarif = true;
    } else if (arg === '--fix') {
      opts.fix = true;
    } else if (arg === '--min-severity') {
      const next = argv[++i];
      if (next !== 'warning' && next !== 'error') {
        return { error: `Invalid --min-severity "${next || ''}" (expected "warning" or "error").` };
      }
      opts.minSeverity = next;
    } else if (arg.startsWith('-')) {
      return { error: `Unknown flag "${arg}". Run with --help for usage.` };
    } else {
      opts.targets.push(arg);
    }
  }

  if (opts.json && opts.sarif) {
    return { error: 'Pass either --json or --sarif, not both.' };
  }
  if (opts.targets.length === 0) {
    opts.targets.push('.');
  }
  return { opts };
}

function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  if (parsed.error) {
    process.stderr.write(`Error: ${parsed.error}\n`);
    process.exit(2);
  }

  const { opts } = parsed;
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  for (const target of opts.targets) {
    if (!fs.existsSync(target)) {
      process.stderr.write(`Error: target path does not exist: ${target}\n`);
      process.exit(2);
    }
  }

  let fixesApplied = [];
  if (opts.fix) {
    const candidateFiles = collectFiles(opts.targets);
    fixesApplied = fixFiles(candidateFiles);
  }

  const report = auditPaths(opts.targets, { minSeverity: opts.minSeverity });
  const cwd = process.cwd();

  if (opts.sarif) {
    process.stdout.write(`${JSON.stringify(toSarif(report, cwd), null, 2)}\n`);
    process.exit(report.findings.length === 0 ? 0 : 1);
  }

  if (opts.json) {
    const payload = {
      ok: report.findings.length === 0,
      scannedFiles: report.scannedFiles,
      fixesApplied,
      summary: {
        errors: report.findings.filter((f) => f.severity === 'error').length,
        warnings: report.findings.filter((f) => f.severity === 'warning').length,
        total: report.findings.length,
      },
      findings: report.findings.map((f) => ({
        ...f,
        file: path.relative(cwd, f.file).replace(/\\/g, '/') || path.basename(f.file),
      })),
    };
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    process.exit(payload.ok ? 0 : 1);
  }

  if (fixesApplied.length > 0) {
    const count = fixesApplied.reduce((sum, f) => sum + f.applied.length, 0);
    process.stderr.write(`Auto-fixed ${count} issue(s) across ${fixesApplied.length} file(s).\n`);
  }

  if (report.findings.length === 0) {
    process.stdout.write(
      `✓ VibeCraft Audit clean: 0 findings across ${report.scannedFiles} scanned file(s).\n`
    );
    process.exit(0);
  }

  for (const f of report.findings) {
    const rel = path.relative(cwd, f.file).replace(/\\/g, '/') || path.basename(f.file);
    const sev = f.severity.toUpperCase().padEnd(7);
    process.stdout.write(`${rel}:${f.line}:${f.column}  ${sev}  ${f.ruleId} (${f.rule})  ${f.message}\n`);
  }
  const errCount = report.findings.filter((f) => f.severity === 'error').length;
  const warnCount = report.findings.filter((f) => f.severity === 'warning').length;
  process.stdout.write(
    `\n✗ ${report.findings.length} finding(s) (${errCount} error(s), ${warnCount} warning(s)) across ${report.scannedFiles} scanned file(s).\n`
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}

module.exports = { main, parseArgs };
