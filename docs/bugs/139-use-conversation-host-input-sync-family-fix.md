# 139 useConversation Host-Input Sync Family: Connector Fan-out + Bootstrap Deps + createEngineOptions Type Narrowing (open P2-1/P2-2 + multi P2-7)

## Problem

- Three related host-input sync defects in `useConversation`:
  1. **open P2-1** — `buildEngine` captured `connectorRef.current` at build time and the hook had ZERO `setConnector` call sites: a host swapping the connector left every cached self-built engine on stale credentials/model (old sessions), while new sessions used the new connector (2151 hot-swap family member).
  2. **multi P2-7** — the mount bootstrap effect put `storage` directly in its deps (contrast: `connector` uses a ref mirror): a host constructing the storage inline re-ran `loadConversations()` on every render, each run aborting the previous controller.
  3. **open P2-2** — `createEngineOptions?: Omit<UseMessageOptions, 'connector'>` allowed `engine`, but `buildEngine` forwards only 8 fields and silently dropped it — a type-contract silent no-op.
- Evidence: open-audit `docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md` P2-1/P2-2 + multi-audit P2-7.

## Diagnostic Method

- Diagnosis difficulty: low — each is a direct contract-vs-implementation read: grep for `setConnector` in use-conversation.ts (zero calls), effect deps list, and the Omit type vs the buildEngine forward list.
- Decisive evidence: `it.fails` RED members — connector swap followed by sends on the active AND a cached idle engine both flowed through the OLD connector (counting-connector observation); fresh-storage-each-render ran `loadConversations` 3×; typecheck flagged the `@ts-expect-error` negative assertion as unused while `engine` was still allowed.

## Root Cause

- `connector` / `storage` were build-time / effect-dep captured with no post-mount sync surface, and the `engine` option type never matched what `buildEngine` actually forwards.

## Fix

- **connector fan-out (open P2-1)**: an effect fans out `setConnector(connector)` to every engine in `engineCache` on connector change (idempotent per reference, so the mount-time run is a no-op). m4 does not apply — the cache holds only SELF-BUILT engines; external engines are never cached here. Newly built engines keep reading the latest `connectorRef.current`.
- **bootstrap deps (multi P2-7)**: `storageRef` mirror added (synced by an effect, `connectorRef` precedent); the mount bootstrap effect reads `storageRef.current` and keeps stable deps — `loadConversations` runs once.
- **type narrowing (open P2-2)**: `createEngineOptions` narrowed to `Omit<UseMessageOptions, 'connector' | 'engine'>`; the remaining fields (plugins/tools/toolExecutor/systemPrompt/…) are intentionally build-time captured (engines are built lazily per conversation; a host changing options builds a new engine — same documented contract as use-message's hot-swap scope). Negative type assertion via `@ts-expect-error` guards the narrowing.

## Tests

- `use-conversation-switch.test.ts` — connector fan-out member (`it.fails` → `it`; behavioral observation via counting connectors on active + cached idle engines).
- `use-conversation-storage.test.ts` — bootstrap stability member (`it.fails` → `it`; fresh storage object per render, `loadConversations` once).
- `use-conversation-controller.test.ts` — `@ts-expect-error` negative type assertion (RED at typecheck pre-fix, GREEN post-fix).
- AI package suite 620 green + `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` green (playground `ai-persistence-demo.tsx` etc. unaffected — no host passes `createEngineOptions.engine`).

## Affected Files

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-switch.test.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-storage.test.ts`
- `packages/flux-renderers-ai/src/adapters/__tests__/use-conversation-controller.test.ts`

## Notes For Future Refactors

- Host-input sync surface sweep (recorded): connector (ref mirror + fan-out) and storage (ref mirror) are synced; `onStorageError` uses its own ref mirror; `createEngineOptions` fields are intentionally build-time captured; `initialConversations` is mount-only by design. A new hot-swappable host input must either get a ref mirror + sync effect or be documented as build-time.
- The connector fan-out must NEVER touch external engines — if a future refactor ever caches host-supplied engines, filter the fan-out by build source.
- The `@ts-expect-error` negative assertion is the compile-time tripwire for the Omit narrowing: re-widening the Omit without updating it breaks typecheck.
