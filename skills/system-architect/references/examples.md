# System Architect Worked Examples

## Example 1: Clean Blueprint Emission (HookDrain Edge + CLI)

### Locked Inputs
- Phase 1 `VIBECRAFT PICK`: `Hono v4 + Cloudflare Workers (D1 + R2) + Node 22 parseArgs CLI` with Gotchas: (1) `128 MB` Worker memory ceiling on exports -> `2 MB` `bodyLimit` + streaming `TransformStream`; (2) CLI stdout purity -> progress/warnings to `stderr` only.
- Phase 2 `VIBECRAFT LOCK`: `Nocturne Terminal` (`nocturne` dark phosphor tokens).

### Key `LAUNCH` Fields (`vibecraft/03-architecture.html`)
```js
const LAUNCH = {
  phase: 'Phase 3 of 4 · Architecture Draft',
  title: 'Review the architecture',
  name: 'HookDrain',
  tagline: 'Idempotent edge webhook capture with streaming NDJSON rollups and local CLI replay.',
  contractsLang: 'ts',
  tree: [
    'hookdrain/',
    '├── src/contracts/events.ts      # Shared WebhookEnvelope, IngestResult, DrainError types',
    '├── src/worker/index.ts          # Hono v4 routes + 2 MB bodyLimit + HMAC verification',
    '├── src/worker/rollup-stream.ts  # TransformStream NDJSON serializer to R2 (zero RAM buffering)',
    '├── src/cli/drain.ts             # Node 22 parseArgs CLI (stdout=NDJSON only, stderr=diagnostics)',
    '├── src/ui/dashboard.tsx         # Token-backed event inspector reading tokens.css',
    '└── src/styles/tokens.css        # Locked Nocturne Terminal 19-key :root contract'
  ].join('\n'),
  flow: [
    'flowchart LR',
    '  Src["Webhook Sender"] -->|"POST <= 2 MB + HMAC"| Edge["Hono Worker (Edge)"]',
    '  Edge -->|"INSERT OR IGNORE"| D1[("Cloudflare D1 (SQLite)")]',
    '  D1 -->|"Cursor pages (500 rows)"| Stream["TransformStream NDJSON"]',
    '  Stream -->|"Multipart upload"| R2[("Cloudflare R2 Archive")]',
    '  CLI["Node 22 CLI (stderr logs)"] -->|"Pull / Replay"| Edge'
  ].join('\n'),
  sequence: [
    'sequenceDiagram',
    '  participant S as Sender',
    '  participant W as Hono Worker',
    '  participant D as D1 SQLite',
    '  participant R as R2 Bucket',
    '  S->>W: POST /ingest (X-Signature, Idempotency-Key)',
    '  W->>W: Enforce 2 MB bodyLimit + timingSafeEqual HMAC',
    '  W->>D: INSERT OR IGNORE INTO events (idempotency_key, payload)',
    '  D-->>W: changes = 1 (accepted) or 0 (duplicate)',
    '  W-->>S: 202 Accepted { deduplicated: boolean }',
    '  W->>D: SELECT batch WHERE archived_at IS NULL LIMIT 500',
    '  W->>R: Pipe rows via TransformStream to NDJSON object'
  ].join('\n'),
  contracts: [
    'export type DrainError =',
    '  | { readonly code: "PAYLOAD_TOO_LARGE"; readonly limitBytes: number }',
    '  | { readonly code: "INVALID_SIGNATURE" }',
    '  | { readonly code: "STORAGE_UNAVAILABLE"; readonly cause: string };',
    '',
    'export type Result<T, E = DrainError> =',
    '  | { readonly ok: true; readonly data: T }',
    '  | { readonly ok: false; readonly error: E };',
    '',
    'export interface WebhookEnvelope {',
    '  readonly idempotencyKey: string;',
    '  readonly source: string;',
    '  readonly receivedAtIso: string;',
    '  readonly payloadJson: string;',
    '}',
    '',
    'export interface EventRepository {',
    '  ingest(event: WebhookEnvelope): Promise<Result<{ readonly deduplicated: boolean }>>;',
    '  streamUnarchived(batchSize: number): AsyncGenerator<readonly WebhookEnvelope[], void, void>;',
    '}'
  ].join('\n'),
  readme: 'Architecture draft under review; full operator runbook generated in Phase 4.',
  commands: 'npm test && npx wrangler dev',
  logo: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="8" width="48" height="48" rx="10" fill="var(--surface-2)" stroke="var(--border-strong)" stroke-width="2"/><path d="M22 22h20l-7 10v10l-6-4V32z" fill="var(--accent)"/><circle cx="44" cy="44" r="4" fill="var(--ink)"/></svg>',
  midjourney: 'Finalized in Phase 4.',
  dalle: 'Finalized in Phase 4.',
  nextSteps: ['Approve blueprint to generate implementation + QA Diff + final Launchpad.']
};
```

### Chat Reply (29 words, 1 prose line + Gate)
```text
╭─ VIBECRAFT · HookDrain
│  ✓ Scout   ✓ Artisan   ● Architect   ○ Builder+QA
╰─ Phase 3/4 · Architecture review · Reply 1 to build, or 2/3 to revise
```

Key trade-off in `vibecraft/03-architecture.html`: D1 batches `500` rows per cursor page through `TransformStream` so R2 exports stay under `16 MB` of Worker heap.

```text
Gate · Blueprint: [1] Approve and build*  [2] Change the flow  [3] Change the data model
```

---

## Example 2: Ambiguous Revision Input (User Replies `"3"` Alone)

### User Input
`3`

### Assistant Reply (Targeted Schema Fork Question, Holds Phase 3)
```text
╭─ VIBECRAFT · HookDrain
│  ✓ Scout   ✓ Artisan   ● Architect   ○ Builder+QA
╰─ Phase 3/4 · Revise data model · Pick 1, 2, or 3 (or describe change)
```

Which part of `WebhookEnvelope` should change before we build?

```text
Schema fork: [1] Extract typed headers + status columns*  [2] Add multi-tenant workspaceId  [3] Store raw binary blobs in R2
```
