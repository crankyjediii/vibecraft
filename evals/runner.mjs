#!/usr/bin/env node
/**
 * VibeCraft Behavioral & Structural Evaluation Runner (`evals/runner.mjs`).
 *
 * Modes:
 *   node evals/runner.mjs            # Deterministic structural + scenario + negative-control suite
 *   node evals/runner.mjs --write    # Also write evals/results/latest.{json,md}
 *   node evals/runner.mjs --live     # Run N=3 live Anthropic Messages API trials per scenario (requires ANTHROPIC_API_KEY)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeRepoInvariants, gradeResponse } from './graders.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    live: argv.includes('--live') || process.env.VIBECRAFT_LIVE_EVALS === '1',
    json: argv.includes('--json'),
    trials: Number(process.env.VIBECRAFT_EVAL_TRIALS || 3),
    model: process.env.VIBECRAFT_EVAL_MODEL || 'claude-sonnet-4-5-20250929',
  };
}

async function callAnthropicTrial(systemPrompt, scenario, model, apiKey) {
  const userContent = scenario.contextSummary
    ? `[Prior session context: ${scenario.contextSummary}]\n\n${scenario.userPrompt}`
    : scenario.userPrompt;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const blocks = Array.isArray(data.content) ? data.content : [];
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}

function renderMarkdownSummary(report) {
  const lines = [
    '# VibeCraft Evaluation Results',
    '',
    `- **Suite version:** \`${report.suiteVersion}\``,
    `- **Structural repo invariants:** \`${report.invariants.passedCount}/${report.invariants.totalCount}\` passed`,
    `- **Reference golden & adversarial scenarios:** \`${report.scenarios.referencePassed}/${report.scenarios.total}\` passed`,
    `- **Negative-control rejection calibration:** \`${report.scenarios.negativeRejected}/${report.scenarios.total}\` defective responses caught`,
    `- **Live Anthropic API trials:** \`${report.live.status}\` (${report.live.note})`,
    '',
    '## 1. Structural Invariant Checks',
    '',
    '| Check ID | Result | Evidence |',
    '| :--- | :--- | :--- |',
    ...report.invariants.checks.map(
      (c) => `| \`${c.id}\` | ${c.pass ? 'PASS' : 'FAIL'} | ${c.detail} |`
    ),
    '',
    '## 2. Behavioral & Adversarial Scenario Matrix',
    '',
    '| Scenario ID | Phase | Category | Reference Grade | Negative Control Caught | Live Pass Rate |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |',
    ...report.scenarios.items.map((s) => {
      const liveCell = s.livePassRate !== null ? s.livePassRate : 'not run (offline CI)';
      return `| \`${s.id}\` | \`${s.phase}\` | ${s.category} | ${s.referencePass ? 'PASS' : 'FAIL'} | ${s.negativeCaught ? 'PASS' : 'FAIL'} | ${liveCell} |`;
    }),
    '',
  ];
  return lines.join('\n');
}

export async function runEvalSuite(opts = {}) {
  const scenariosPath = path.join(__dirname, 'scenarios.json');
  const scenarios = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));

  const inv = gradeRepoInvariants(ROOT_DIR);
  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  const systemPrompt = fs.readFileSync(path.join(ROOT_DIR, 'system_prompt.md'), 'utf8');

  const items = [];
  let liveExecuted = false;

  for (const scenario of scenarios) {
    const refGrade = gradeResponse(scenario.referenceResponse, scenario);
    const negGrade = gradeResponse(scenario.negativeControlResponse, scenario);
    const negativeCaught = !negGrade.pass;

    let livePassRate = null;
    const liveFailures = [];

    if (opts.live && apiKey) {
      liveExecuted = true;
      let passedTrials = 0;
      for (let t = 0; t < opts.trials; t += 1) {
        const reply = await callAnthropicTrial(systemPrompt, scenario, opts.model, apiKey);
        const g = gradeResponse(reply, scenario);
        if (g.pass) passedTrials += 1;
        else liveFailures.push({ trial: t + 1, failures: g.failures });
      }
      livePassRate = `${passedTrials}/${opts.trials}`;
    }

    items.push({
      id: scenario.id,
      phase: scenario.phase,
      category: scenario.category,
      title: scenario.title,
      referencePass: refGrade.pass,
      referenceFailures: refGrade.failures,
      negativeCaught,
      negativeTriggeredChecks: negGrade.failures,
      livePassRate,
      liveFailures,
    });
  }

  const refPassed = items.filter((i) => i.referencePass).length;
  const negRejected = items.filter((i) => i.negativeCaught).length;
  const invPassedCount = inv.checks.filter((c) => c.pass).length;

  const liveStatus = liveExecuted
    ? 'executed'
    : opts.live && !apiKey
      ? 'skipped'
      : 'not-requested';
  const liveNote = liveExecuted
    ? `Ran ${opts.trials} trial(s)/scenario against ${opts.model}`
    : !apiKey
      ? 'ANTHROPIC_API_KEY not set in environment; deterministic structural + calibrated scenario graders executed'
      : 'Pass --live to run live Anthropic API trials';

  const allDeterministicPass =
    inv.passed && refPassed === scenarios.length && negRejected === scenarios.length;

  const report = {
    suiteVersion: '1.0.0',
    ok: allDeterministicPass,
    invariants: {
      passed: inv.passed,
      passedCount: invPassedCount,
      totalCount: inv.checks.length,
      checks: inv.checks,
    },
    scenarios: {
      total: scenarios.length,
      referencePassed: refPassed,
      negativeRejected: negRejected,
      items,
    },
    live: {
      status: liveStatus,
      note: liveNote,
    },
  };

  if (opts.write) {
    const outDir = path.join(__dirname, 'results');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(outDir, 'latest.md'), renderMarkdownSummary(report), 'utf8');
  }

  return report;
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : '';
if (invokedPath === fs.realpathSync(__filename)) {
  const opts = parseArgs(process.argv.slice(2));
  runEvalSuite(opts)
    .then((report) => {
      if (opts.json) {
        process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      } else {
        process.stdout.write(
          [
            `VibeCraft Eval Suite v${report.suiteVersion}`,
            `  Structural invariants : ${report.invariants.passedCount}/${report.invariants.totalCount} passed`,
            `  Reference scenarios   : ${report.scenarios.referencePassed}/${report.scenarios.total} passed`,
            `  Negative calibration  : ${report.scenarios.negativeRejected}/${report.scenarios.total} defective responses rejected`,
            `  Live LLM API trials   : ${report.live.status} (${report.live.note})`,
            '',
          ].join('\n')
        );
        if (!report.ok) {
          for (const c of report.invariants.checks.filter((x) => !x.pass)) {
            process.stderr.write(`  FAIL invariant ${c.id}: ${c.detail}\n`);
          }
          for (const s of report.scenarios.items) {
            if (!s.referencePass) {
              process.stderr.write(`  FAIL reference ${s.id}: ${s.referenceFailures.join('; ')}\n`);
            }
            if (!s.negativeCaught) {
              process.stderr.write(`  FAIL negative-control ${s.id}: defective response was not caught!\n`);
            }
          }
        }
      }
      process.exitCode = report.ok ? 0 : 1;
    })
    .catch((err) => {
      process.stderr.write(`Eval suite crashed: ${err.stack || err.message}\n`);
      process.exit(1);
    });
}
