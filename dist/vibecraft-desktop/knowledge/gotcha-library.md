# Research Scout Archetype & Gotcha Starter Library

Load only the domain section matching the user's product angle. Every `[Verified]` fact cites its specification or vendor documentation baseline as of 2026; re-verify pricing tiers with live search when available.

## 1. Local-First Web PWA (OPFS + IndexedDB + Web Workers)

- **Reference stack:** Vite 6 + TypeScript + React 19 (or Svelte 5) + `wa-sqlite` / official SQLite3 WASM over Origin Private File System (`FileSystemSyncAccessHandle`).
- **Verified baseline `[Verified]`:** `FileSystemSyncAccessHandle` requires running inside a dedicated Web Worker (MDN File System API spec, verified 2026); Safari iOS evicts non-persistent script-created origin storage after 7 days of non-interaction unless installed to Home Screen or granted `navigator.storage.persist()` (WebKit Storage Policy).
- **Gotcha 1:** Concurrent tabs opening the same OPFS SQLite file fail with `NoModificationAllowedError` because `createSyncAccessHandle()` acquires an exclusive lock.
  - **Mitigation:** Route all database reads/writes through a single `SharedWorker` (with `Web Locks API` leader election fallback on browsers lacking `SharedWorker` on mobile).
- **Gotcha 2:** Bundling `.wasm` assets without `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` disables `SharedArrayBuffer` threads and silently breaks third-party embeds.
  - **Mitigation:** Use single-threaded synchronous OPFS inside a dedicated Worker (`coi` headers not required for `FileSystemSyncAccessHandle`), reserving COOP/COEP only when multi-threaded WASM DSP is mandatory.

## 2. Desktop Native-Shell (Tauri v2 + Rust Core)

- **Reference stack:** Tauri v2 + React 19 / Solid + Rust command layer + `rusqlite` (bundled SQLite with FTS5).
- **Verified baseline `[Verified]`:** Tauri v2 uses OS webviews (`WKWebView` on macOS, `WebView2` on Windows, `WebKitGTK` on Linux), keeping installer binaries around `4 to 10 MB` vs `90+ MB` for bundled Chromium (Tauri v2 docs, verified 2026).
- **Gotcha 1:** Unsigned macOS `.dmg` builds trigger Gatekeeper `"app is damaged and can't be opened"` for external testers due to `com.apple.quarantine` xattrs.
  - **Mitigation:** Configure Apple Developer ID signing + `xcrun notarytool` in CI before external distribution, or document local build compilation for developer-only prototypes.
- **Gotcha 2:** Passing multi-megabyte binary buffers through JSON-serialized `invoke()` calls blocks the IPC bridge and spikes memory 3x.
  - **Mitigation:** Use Tauri v2 raw binary `tauri::ipc::Response` (`ArrayBuffer`) or custom `tauri://` asset protocol streaming for audio, images, and exports.

## 3. Cloud Web SaaS (Full-Stack SSR + Managed Postgres)

- **Reference stack:** Next.js 15 App Router (or SvelteKit 2) + Drizzle ORM + Neon Serverless Postgres + Auth.js / Better Auth.
- **Verified baseline `[Verified]`:** Serverless TCP connection storms exhaust Postgres `max_connections` unless routed through transaction-mode PgBouncer or HTTP/WebSocket serverless drivers (Neon / Supabase docs, verified 2026).
- **Gotcha 1:** Next.js Server Actions expose public HTTP POST endpoints; checking auth only in middleware or layouts leaves mutations callable via direct `curl` replay.
  - **Mitigation:** Verify session identity and resource ownership inside every mutation handler before touching Drizzle queries, validated with Zod input schemas.
- **Gotcha 2:** Cold-starting serverless Postgres compute after scale-to-zero adds `300 to 800 ms` `[Inferred]` on the first request after idle.
  - **Mitigation:** Render optimistic shell states immediately with skeleton tokens and warm critical read paths via edge-cached stale-while-revalidate headers.

## 4. Mobile Offline-First (Expo / React Native + Expo SQLite)

- **Reference stack:** Expo SDK 52+ (React Native New Architecture) + `expo-router` + `expo-sqlite` (synchronous JSI API) + background sync queue.
- **Verified baseline `[Verified]`:** `expo-sqlite` next-gen JSI bindings execute synchronous prepared statements on the native thread/JSI without legacy async bridge serialization, supporting WAL mode and FTS5 on iOS and Android (Expo SQLite docs, verified 2026).
- **Gotcha 1:** Running synchronous SQLite queries returning `> 2,000` rows or unindexed `LIKE '%term%'` scans on the JS thread drops React Native frame rates below `60 fps` and freezes gesture animations.
  - **Mitigation:** Enable `PRAGMA journal_mode = WAL`, use async `getAllAsync()` with keyset pagination (`LIMIT 50`) for list views, and index search columns with FTS5.
- **Gotcha 2:** iOS `BGAppRefreshTask` schedules background sync opportunistically (`15+ min` to several hours depending on battery and app usage) and terminates tasks exceeding `30 seconds` wall time `[Verified]` (Apple `BGTaskScheduler` documentation).
  - **Mitigation:** Flush mutation outbox queues immediately on foreground/connectivity transitions (`NetInfo`) and chunk background sync batches so each checkpoint commits in `< 5 seconds`.

## 5. Edge API / CLI Tool (Hono + Node / Bun / Workers TypeScript Strict)

- **Reference stack (Edge API):** Hono v4 + `@hono/zod-validator` + Cloudflare Workers + D1 / KV (or Node 22 `--experimental-strip-types` / `tsx` + `commander` / `util.parseArgs` for local CLI tools).
- **Verified baseline `[Verified]`:** Cloudflare Workers enforce a `128 MB` isolate memory ceiling and CPU-time limits per invocation (`10 ms` free tier, `30 s` standard unbound paid tier; Cloudflare Workers Limits docs, verified 2026), and omit Node native C++ addons (`fs` disk persistence, `sharp` native binaries).
- **Gotcha 1 (Edge API):** Buffering large request uploads or JSON payloads (`> 25 MB`) in memory inside a Worker trips the `128 MB` isolate limit (`Error 1102: Worker exceeded memory limit`) and kills concurrent requests sharing the isolate.
  - **Mitigation:** Stream bodies via Web `ReadableStream` / multipart presigned R2 URLs and enforce `bodyLimit()` middleware (`<= 5 MB`) on API routes.
- **Gotcha 2 (Node CLI):** Writing progress spinners, banners, or debug logs to `stdout` corrupts machine-readable `--json` output when users pipe `my-cli --json | jq`.
  - **Mitigation:** Send all human progress indicators, warnings, and interactive prompts strictly to `process.stderr`, reserving `process.stdout` exclusively for data payloads and honoring `NO_COLOR=1` and non-TTY detection (`!process.stdout.isTTY`).

## 6. Browser Media, Canvas & WebAudio Studio

- **Reference stack:** Vite + TypeScript + WebAudio `AudioWorklet` + OffscreenCanvas + IndexedDB blob chunks.
- **Verified baseline `[Verified]`:** Chrome, Safari, and Firefox suspend `AudioContext` until a user gesture invokes `audioCtx.resume()` (W3C Web Audio autoplay policy, verified 2026), and `AudioWorkletProcessor.process()` runs on a real-time quantum (`128` frames = `2.67 ms` at `48 kHz`) where garbage collection causes audible clicks.
- **Gotcha 1:** Allocating typed arrays or objects inside `AudioWorkletProcessor.process()` triggers V8/JSC minor GC pauses on the audio thread, producing deterministic glitches.
  - **Mitigation:** Pre-allocate ring buffers and scratch `Float32Array` slabs inside the `AudioWorkletProcessor` constructor and communicate control parameters via `AudioParam` or lock-free shared ring buffers.
- **Gotcha 2:** `MediaRecorder` defaults to `audio/webm;codecs=opus` in Chromium/Firefox while Safari defaults to `audio/mp4` (`aac`), breaking naive file extensions and decoders.
  - **Mitigation:** Probe `MediaRecorder.isTypeSupported()` in priority order at startup and store the exact MIME string alongside every recorded blob.
