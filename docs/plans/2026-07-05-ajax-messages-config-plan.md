# Ajax Action `messages` Config

> Plan Status: **complete—all 6 phases done**
> Scope: `flux-core` (types), `flux-runtime` (ajax handler), `flux-renderers-data` (demo), `flux-renderers-form` (loadAction), `flux-renderers-basic` (loadAction), `docs`
> Exit Criteria: ajax action handler shows success/failure toast from schema config without requiring explicit `showToast` in `then` chain; `crud-demo.json` uses `messages` instead of `then`+`showToast`; docs updated.

## Motivation

Every ajax call in the current demo needs a `showToast` in the `then` chain:

```json
"then": [
  { "action": "component:refresh", "componentId": "user-crud" },
  { "action": "showToast", "args": { "level": "success", "message": "删除成功" } }
]
```

This is boilerplate — success/failure feedback is a standard concern of every mutation, not business logic. AMIS solves this with `messages: { success, failed }` on the action, which the ajax handler processes automatically.

## Design

Add a `messages` config to the action schema. The ajax handler reads it after the request completes and calls `env.notify()` accordingly.

```json
{
  "action": "ajax",
  "args": { "url": "/api/users", "method": "delete", "data": { "id": "${id}" } },
  "messages": { "success": "删除成功", "failed": "删除失败" },
  "then": { "action": "component:refresh", "componentId": "user-crud" }
}
```

Rules:

- `messages.success` → `env.notify('success', msg)` on `ok: true` result
- `messages.failed` → `env.notify('error', msg)` on `ok: false` result
- Messages are evaluated as template strings against the action scope
- No messages shown if `messages` field is absent (backward compatible)
- `messages` and `then`/`onError` are independent — both execute

## Changes

### Phase 1 — Types (`flux-core/src/types/actions.ts`)

Add `MessagesConfig` and add `messages` to `ActionShapeFields`:

```typescript
export interface MessagesConfig {
  success?: string;
  failed?: string;
}

export interface ActionShapeFields extends SchemaObject {
  // … existing fields …
  messages?: MessagesConfig;
}
```

This makes `messages` available on all action types, though only `ajax` (and potentially `submitForm` later) will process it.

### Phase 2 — Runtime (`flux-runtime/src/runtime-action-helpers.ts`)

In `executeRuntimeAjaxAction`, after the result is determined:

**Success path** (both cache and non-cache): if `action.source.messages?.success` is set, evaluate and call `env.notify('success', value)` before returning.

**Failure path** (catch block, HTTP failures): if `action.source.messages?.failed` is set, evaluate and call `env.notify('error', value)` before returning `{ ok: false, error }`.

Evaluation uses the existing `helpers.evaluate` function against `ctx.scope`.

### Phase 3 — Demo (`crud-demo.json`)

Replace `then` + `showToast` with `messages` on each mutation ajax action:

| Action      | Current                                  | New                                               |
| ----------- | ---------------------------------------- | ------------------------------------------------- |
| Create user | `then: [refresh, showToast("新增成功")]` | `messages.success: "新增成功"`, `then: [refresh]` |
| Update user | `then: [refresh, showToast("更新成功")]` | `messages.success: "更新成功"`, `then: [refresh]` |
| Delete user | `confirm + ajax(when)`                   | `ajax + confirmText + messages.success`           |
| Bulk delete | `confirm + ajax(when)`                   | `ajax + confirmText + messages.success`           |

### Phase 4 — Unit Tests

Add tests in `flux-runtime/src/__tests__/` for `executeRuntimeAjaxAction`:

| #   | Scenario                                 | Assertion                                                |
| --- | ---------------------------------------- | -------------------------------------------------------- |
| 1   | `messages.success` set, request succeeds | `env.notify` called with `'success'` and the message     |
| 2   | `messages.failed` set, request fails     | `env.notify` called with `'error'` and the message       |
| 3   | No `messages` set                        | `env.notify` not called                                  |
| 4   | Template evaluation in message           | `${name}` resolved from scope                            |
| 5   | `confirmText` set, user declines         | `env.confirm` called, request not sent, cancelled result |
| 6   | `confirmText` set, user confirms         | Request sent, succeeds normally                          |
| 7   | `confirmText` set, `env.confirm` missing | Error returned                                           |

### Phase 5 — Docs

- `docs/architecture/action-scope-and-imports.md`: Add `messages` to the built-in action schema table
- `docs/references/quick-reference.md`: Add `messages` to ActionSchema section

## Test Strategy

| Tier          | Scope                                                           |
| ------------- | --------------------------------------------------------------- |
| Must automate | Unit tests for messages processing (Phase 4)                    |
| Should have   | Verify crud-demo still works end-to-end (manual + existing e2e) |

## Execution Log

### Phase 1 — Types ✅

- `MessagesConfig` interface added to `flux-core/src/types/actions.ts`
- `messages?: MessagesConfig` added to `ActionShapeFields` and `ActionShapeLikeFields`
- `confirmText?: string` added to `ActionShapeFields` and `ActionShapeLikeFields` (and `flux-guide/flux-types/common.d.ts`)

### Phase 2 — Runtime ✅

- `executeRuntimeAjaxAction` patched at all 3 success return points + catch block's HTTP failure branch
- Bugfix: main code path (no sharing/cache) returned `runStandardAjaxRequest` result without checking `messages.success`
- `confirmText` check added at function entry: evaluates text, calls `env.confirm()`, returns cancelled on decline, error if `env.confirm` unconfigured

### Phase 3 — Demo ✅

- All `showToast` actions removed from `crud-demo.json`; replaced with `messages.success` on each mutation ajax action
- `messages` and `then` (for component:refresh) coexist independently

### Phase 4 — Tests ✅

- 7 unit tests in `packages/flux-runtime/src/__tests__/runtime-ajax-messages.test.ts` all passing:
  1. `messages.success` on success → `env.notify('success', msg)` ✓
  2. `messages.failed` on HTTP failure → `env.notify('error', msg)` ✓
  3. No `messages` → no `env.notify` call ✓
  4. Template evaluation `${name}` resolved from scope ✓
  5. `confirmText` → user declines: `env.confirm` called, `executeApiRequest` not called, `cancelled: true` ✓
  6. `confirmText` → user confirms: request sent, succeeds ✓
  7. `confirmText` → `env.confirm` missing: error returned ✓

### Phase 5 — Docs ✅

- `docs/architecture/action-scope-and-imports.md`: Added `messages` to the `ActionSchema` example interface
- `docs/references/quick-reference.md`: Added Notes column to action types table; ajax row notes `supports messages.success/failed`
- `docs/logs/2026/07-05.md`: Daily dev log created

### Phase 6 — Form/Page `loadAction` ✅

Added standardized `loadAction` + `autoLoad` to `form` and `page` renderers for mount-time data fetching, mirroring CRUD's pattern. Replaces `initAction + ajax + then.setValues` boilerplate.

- `FormSchema`/`PageSchema`: Added `loadAction?: ActionSchema | ActionSchema[]` and `autoLoad?: boolean`
- Form renderer definition: Added `loadAction` (`kind: 'prop'`) + `autoLoad` (`kind: 'prop', valueType: 'boolean'`) to `fields`, plus propContracts with shape/description
- Page renderer definition: Same two fields added
- `form.tsx`: New `useEffect` dispatches `loadAction` via `props.helpers.dispatch()` on mount (gated by `autoLoad`, default true). Result data is unwrapped from `{data:...}` envelope if present, or used flat, then merged via `ownedForm.setValues()`. Aborts on unmount, guards duplicate dispatch via activationKey ref. Coexists with `initAction`.
- `page.tsx`: New `useEffect` dispatches and merges result into page scope via `scope.merge()`.
- Demo: `crud-demo.json` edit form switched from `initAction + ajax + then.setValues` to `loadAction` (3 lines → 2 lines, no manual setValues).
- Tests: 6 unit tests in `packages/flux-renderers-form/src/__tests__/form-loadaction.test.tsx`:
  1. Dispatch on mount, populate via setValues with `{data:...}` wrapper ✓
  2. Dispatch on mount, populate via setValues with flat result ✓
  3. `autoLoad: false` → no dispatch ✓
  4. No `loadAction` → no dispatch ✓
  5. `ok: false` result → no setValues ✓
  6. `cancelled: true` result → no setValues ✓

## Verification Checklist

- [x] `pnpm typecheck` passes (pre-existing `crud-confirm-gate.test.tsx` TS errors excluded — verified by stash)
- [x] `pnpm build` passes
- [x] `pnpm test` passes (105/106 files, 1267/1268 tests; pre-existing benchmark skip)
- [x] crud-demo.json validates as JSON
- [x] `docs/architecture/action-scope-and-imports.md` updated
- [x] `docs/references/quick-reference.md` updated
- [x] Daily dev log updated
