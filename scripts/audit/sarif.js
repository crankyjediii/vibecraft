'use strict';

/**
 * SARIF 2.1.0 serializer for VibeCraft Audit Engine v2 (`--sarif`).
 * Compatible with GitHub Code Scanning (`github/codeql-action/upload-sarif`) and IDE SARIF viewers.
 */

const path = require('node:path');
const { RULES_META } = require('./rules.js');

function toSarif(report, rootDir = process.cwd()) {
  const rulesList = report.rulesMeta || RULES_META;
  const rules = rulesList.map((r) => ({
    id: r.id,
    name: r.slug,
    shortDescription: { text: r.summary },
    help: { text: r.remediation },
    defaultConfiguration: {
      level: r.severity === 'error' ? 'error' : 'warning',
    },
    properties: {
      tags: ['vibecraft', ...r.kinds],
    },
  }));

  const results = report.findings.map((f) => {
    const relUri = path.isAbsolute(f.file)
      ? path.relative(rootDir, f.file).replace(/\\/g, '/')
      : f.file.replace(/\\/g, '/');

    return {
      ruleId: f.ruleId,
      level: f.severity === 'error' ? 'error' : 'warning',
      message: { text: f.message },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: relUri,
              uriBaseId: '%SRCROOT%',
            },
            region: {
              startLine: f.line,
              startColumn: f.column || 1,
              snippet: { text: f.text },
            },
          },
        },
      ],
    };
  });

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'VibeCraft Audit Engine',
            version: '2.0.0',
            informationUri: 'https://github.com/crankyjediii/vibecraft',
            rules,
          },
        },
        results,
      },
    ],
  };
}

module.exports = {
  toSarif,
};
