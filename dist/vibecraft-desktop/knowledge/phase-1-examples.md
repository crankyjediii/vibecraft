# Research Scout Worked Examples

## Example 1: Clean Detailed Input (CLI / Edge Log Drainer)

### Input
`"Build an open-source CLI and optional Cloudflare Worker endpoint that ingests JSON webhook payloads, validates schemas, deduplicates events by idempotency key, and exports daily NDJSON archives. Needs < 20 ms P95 ingest and $0 idle cost."`

### Populated `STACKS` Data Block (Excerpt)
```js
const STACKS = [
  {
    id: 'hono-workers-d1',
    name: 'Edge API + Node CLI',
    recommended: true,
    stack: 'Hono v4 + Cloudflare Workers (D1 + R2) + Node 22 parseArgs CLI',
    why: 'Sub-15 ms edge ingest with SQLite UNIQUE idempotency constraints on D1 and zero-egress R2 NDJSON rollups; shared Zod schemas compile into both Worker and local CLI.',
    latencyMs: 14,
    latencyNote: 'P95 edge isolate + single D1 INSERT OR IGNORE',
    latencyTag: 'inferred',
    offlineLabel: 'CLI works offline; ingest requires edge',
    offlineTag: 'verified',
    cost: '$0 idle (Workers + D1 + R2 free tiers)',
    costTag: 'verified',
    gotcha: 'Workers enforce a 128 MB isolate memory ceiling; buffering multi-megabyte NDJSON exports in RAM crashes the isolate (Error 1102).',
    mitigation: 'Enforce 2 MB bodyLimit() on webhook ingest and stream R2 multipart rollups via TransformStream.',
    gotchas: [
      {
        issue: 'Workers enforce a 128 MB isolate memory ceiling; buffering multi-megabyte NDJSON exports in RAM crashes the isolate (Error 1102).',
        mitigation: 'Enforce 2 MB bodyLimit() on webhook ingest and stream R2 multipart rollups via TransformStream.'
      },
      {
        issue: 'CLI progress logs written to stdout corrupt piped `hookdrain export --json | jq` workflows.',
        mitigation: 'Route banners, spinners, and warnings to stderr only; keep stdout strictly NDJSON/JSON and respect NO_COLOR.'
      }
    ]
  },
  {
    id: 'fastify-fly-sqlite',
    name: 'Single-Node LiteFS',
    recommended: false,
    stack: 'Fastify v5 + Node 22 + better-sqlite3 (WAL) on Fly.io',
    why: 'Synchronous C++ SQLite hits ~2 ms writes on local NVMe without serverless row quotas.',
    latencyMs: 6,
    latencyNote: 'P95 WAL insert inside single region',
    latencyTag: 'inferred',
    offlineLabel: 'Identical binary runs locally offline',
    offlineTag: 'verified',
    cost: '~$3 to $5/mo persistent volume + VM',
    costTag: 'inferred',
    gotcha: 'Scale-to-zero machines drop incoming webhooks during 400-900 ms boot unless Fly proxy holds connections.',
    mitigation: 'Keep 1 shared-cpu-1x machine warm or front with an edge queue.',
    gotchas: [
      {
        issue: 'Scale-to-zero machines drop incoming webhooks during 400-900 ms boot unless Fly proxy holds connections.',
        mitigation: 'Keep 1 shared-cpu-1x machine warm or front with an edge queue.'
      },
      {
        issue: 'Unbounded synchronous JSON.parse on 10 MB payloads blocks the Node event loop across all sockets.',
        mitigation: 'Cap Fastify bodyLimit at 1 MB and stream NDJSON exports with pipeline().'
      }
    ]
  },
  {
    id: 'local-cli-only',
    name: 'Pure Local Tunnel CLI',
    recommended: false,
    stack: 'Node 22 util.parseArgs + node:sqlite + Cloudflare Quick Tunnel',
    why: 'Zero cloud account or deployment required for local webhook debugging and replay.',
    latencyMs: 38,
    latencyNote: 'P95 tunnel relay to localhost SQLite',
    latencyTag: 'inferred',
    offlineLabel: 'Full local replay and export offline',
    offlineTag: 'verified',
    cost: '$0 local binary',
    costTag: 'verified',
    gotcha: 'Ephemeral tunnel URLs rotate whenever the developer laptop sleeps, breaking registered webhook endpoints.',
    mitigation: 'Persist named tunnel credentials or restrict this stack to dev/staging replay.',
    gotchas: [
      {
        issue: 'Ephemeral tunnel URLs rotate whenever the developer laptop sleeps, breaking registered webhook endpoints.',
        mitigation: 'Persist named tunnel credentials or restrict this stack to dev/staging replay.'
      },
      {
        issue: 'Experimental node:sqlite flags differ between Node 22 minor releases.',
        mitigation: 'Pin engines.node >= 22.5.0 and wrap the storage adapter behind a 4-method repository interface.'
      }
    ]
  }
];
```

### Chat Reply (41 words, 2 prose lines)
```text
╭─ VIBECRAFT · HookDrain
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Stack Matrix ready · Paste VIBECRAFT PICK or name a stack
```

Compared three webhook ingest stacks in `vibecraft/01-stack-matrix.html`; **Hono v4 + Workers D1/R2 + Node 22 CLI** wins for `$0` idle cost `[Verified]` and shared Zod schemas across edge and terminal.
Copy your selection from the matrix (`VIBECRAFT PICK`) and paste it here.

---

## Example 2: Messy / Contradictory Input (Impossible Zero-Server Constraint)

### Input
`"yo make me a real-time 10-person collaborative video editor hosted 100% free on GitHub Pages with zero backend servers at all, needs instant 4K export"`

### Resolution Strategy
GitHub Pages serves static assets only; WebRTC peers still require a lightweight signaling channel to exchange SDP offers, and 4K browser encoding is memory-bound by WebCodecs hardware encoders. Scout states the constraint in 1 plain line and compares 3 honest architectures (P2P WebRTC with free-tier Worker signaling, local single-user WebCodecs studio on GitHub Pages, and LiveKit + Remotion cloud renderer).

### Chat Reply (48 words, 2 prose lines)
```text
╭─ VIBECRAFT · CutMesh
│  ● Scout   ○ Artisan   ○ Architect   ○ Builder+QA
╰─ Phase 1/4 · Stack Matrix ready · Paste VIBECRAFT PICK or name a stack
```

Pure static GitHub Pages cannot broker WebRTC peer discovery without a signaling relay, so `vibecraft/01-stack-matrix.html` compares **Pages + free-tier Worker SDP relay + WebCodecs** (`$0` `[Verified]`) against offline single-editor and cloud-render options.
Paste your `VIBECRAFT PICK` block or name a stack to continue.
