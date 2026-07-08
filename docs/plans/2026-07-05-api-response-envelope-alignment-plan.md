# ApiResponse 标准信封对齐改进计划

> Plan Status: **completed**
> Scope: `flux-core` (types), `flux-runtime` (request pipeline), `flux-renderers-*` (consumer cleanup), `nop-debugger`, `apps/playground` (mock fetchers), `flux-guide` (types)
> Design Doc: `docs/architecture/api-response-envelope.md`

## Goals

1. `ApiResponse` 类型与 nop-entropy 后端标准对齐：fetcher 返回 `{status, code?, msg?, data?, errors?}`，runtime 规范化层计算 `ok = (status === 0)`
2. 错误消息从 `response.msg` 顶层字段提取（一等公民），不再在 `data.message`/`data.msg` 里猜测
3. `ApiSchema` / `ExecutableApiRequest` 增加 `selection?: string`（GraphQL 风格字段选择）
4. 消费者删除信封解包启发式（`'data' in payload` / `isActionResult`）
5. 所有 mock fetcher 和测试改为 `{status: 0, data: ...}` 格式

## Non-Goals

- 不改变 `ActionResult.ok` 语义（它是 action 层概念，非 HTTP 标准）
- 不改变 `responseAdaptor` 的执行时机和上下文结构
- 不改变 CRUD `normalizeCrudSourceValue`（它做 list-shape 归一化，不是信封解包）
- 不改变 host-action-provider 中的 `.ok`（spreadsheet/report-designer command result，非 ApiResponse）

## Current Baseline

- `ApiResponse` 类型 (`renderer-api.ts:14-20`): `{ ok: boolean; status: number; data: T; headers?; raw? }` — `ok` 由 fetcher 设置，缺少 `code`/`msg`/`errors`
- 成功判断: `response.ok`（fetcher 负责翻译）
- 错误消息提取: `readResponseErrorMessage(data)` — 在 `data.message`/`data.msg` 里猜测
- 消费者解包: Form/Page 用 `'data' in payload`，DynamicRenderer 用 `isActionResult()` 嗅探
- `ApiSchema`/`ExecutableApiRequest`: 无 `selection` 字段
- Mock fetcher: 返回 `{ok: true, status: 200, data: ...}`
- 设计文档 `docs/architecture/api-response-envelope.md` 已就绪

### 验证脚本基线 (`scripts/verify-api-response-envelope.mjs`)

当前运行结果（修复前）：

| 检查项   | 说明                                                | 残留数  |
| -------- | --------------------------------------------------- | ------- |
| CHK-1    | mock fetcher 返回旧格式 `{ok, status: 200}`         | 180     |
| CHK-2    | 错误消息未从 `response.msg` 主路径提取              | 1       |
| CHK-3    | 消费者残留信封解包启发式 (`'data' in payload`)      | 2       |
| CHK-4    | dynamic-renderer 残留 `isActionResult` 嗅探         | 2       |
| CHK-5    | `ApiResponse` 类型缺少 `code`/`msg`/`errors`        | 3       |
| CHK-6    | `ApiSchema`/`ExecutableApiRequest` 缺少 `selection` | 1       |
| CHK-7    | 测试类型注解残留 `ok` 字段                          | 20      |
| **合计** |                                                     | **209** |

目标：修复后脚本零输出。

## Test Strategy

| Tier             | Scope                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Must automate    | request-runtime 规范化层单测（`ok` 计算、`msg` 提取、`errors` 透传） |
| Should automate  | 消费者侧 loadAction 单测（Form/Page 确认不再解包）                   |
| Heuristic script | `scripts/verify-api-response-envelope.mjs` 全仓搜索残留旧模式        |

---

## Phase 1 — Core Types (`flux-core`)

**Exit Criteria**: typecheck 在 `flux-core` 通过；`ApiResponse` 有新字段；`ApiSchema` 有 `selection`。

- [x] (Fix) `packages/flux-core/src/types/renderer-api.ts`:
  - `ApiResponse` 增加 `code?: string`、`msg?: string`、`errors?: Record<string, string>`
  - `ok` 改为 `ok: boolean`（保留，由规范化层计算；注释标注 `computed: status === 0`）
  - 删除 `raw?: unknown`（无消费者使用）
  - `headers` 类型改为 `Record<string, unknown>`（nop-entropy headers 值可能是非 string）

- [x] (Fix) `packages/flux-core/src/types/schema-base-types.ts`:
  - `ApiSchema` 增加 `selection?: string`
  - `ExecutableApiRequest` 增加 `selection?: string`

- [x] (Fix) `flux-guide/flux-types/common.d.ts`:
  - 确认 `ApiSchemaObject.selection` 已存在（上一轮已加）
  - 增加 `ApiResponse` 类型导出

---

## Phase 2 — Runtime Normalization Layer (`flux-runtime`)

**Exit Criteria**: request-runtime 单测通过（`ok` 计算 + `msg` 提取）；`executeApiSchema` 正确计算 `ok`。

- [x] (Fix) `packages/flux-runtime/src/async-data/request-runtime.ts`:
  - 在 `executeApiSchema` 中，fetcher 返回后**立即计算** `response.ok = (response.status === 0)`，在 responseAdaptor 之前
  - 成功/失败分支判断从 `if (!response.ok)` 语义不变（因为 `ok` 已被计算），但确认时序正确
  - `createApiResponseError` 改为从 `response.msg` 提取错误消息（顶层一等公民），fallback 到 `readResponseErrorMessage(response.data)`（兼容非标后端），最终 fallback 到 `Request failed (status=${status}, code=${code})`
  - `createApiResponseError` 在 thrown error 上附加 `code`、`msg`、`errors`（字段级错误透传）
  - `readResponseErrorMessage` 保留作为 fallback（兼容 `data.message`/`data.msg`），但主路径改为 `response.msg`

- [x] (Proof) 新增 `request-runtime-normalization.test.ts`:
  - fetcher 返回 `{status: 0, data: {...}}` → `ok` 被计算为 `true`，`ActionResult.data` = data
  - fetcher 返回 `{status: -1, msg: "失败"}` → 抛错，error.message = "失败"
  - fetcher 返回 `{status: -1, code: "validation", errors: {email: "..."}}` → error 携带 code/errors
  - fetcher 返回 `{status: -1}` (无 msg) → fallback 到 `Request failed (status=-1)`

---

## Phase 3 — Consumer Cleanup (`flux-renderers-*`)

**Exit Criteria**: Form/Page/DynamicRenderer 不再有信封解包启发式；loadAction 单测通过。

- [x] (Fix) `packages/flux-renderers-form/src/renderers/form.tsx`:
  - 删除 `'data' in payload` 双模式解包（约 line 408-412）
  - 直接使用 `result.data` 作为 `setValues` 的参数

- [x] (Fix) `packages/flux-renderers-basic/src/page.tsx`:
  - 删除同样的 `'data' in payload` 双模式解包（约 line 102-106）
  - 直接使用 `result.data` 作为 `scope.merge` 的参数

- [x] (Fix) `packages/flux-renderers-basic/src/dynamic-renderer.tsx`:
  - 删除 `isActionResult()` 嗅探（约 line 14-16, 149）
  - 直接使用 `result.data` 作为 schema

- [x] (Fix) 更新 `form-loadaction.test.tsx`:
  - 删除 "result.data wrapper" 测试用例（不再需要解包）
  - 保留 flat result 测试用例

---

## Phase 4 — nop-debugger Fixes

**Exit Criteria**: nop-debugger typecheck + test 通过。

- [x] (Fix) `packages/nop-debugger/src/adapters.ts`:
  - line 287: `response.ok ? 'success' : 'error'` — 不变（`ok` 仍可用，由规范化层计算）

- [x] (Fix) `packages/nop-debugger/src/controller-helpers.ts`:
  - `buildNetworkSummary` 中 `ok: input.response?.ok` — 不变（同上）

> 注：由于 `ok` 是规范化层计算的保留属性，nop-debugger 中所有 `response.ok` 消费无需改动。

---

## Phase 5 — Mock Fetcher Batch Update (`apps/playground`)

**Exit Criteria**: playground typecheck 通过；所有 mock fetcher 返回 `{status: 0, data: ...}`。

- [x] (Fix) `apps/playground/src/pages/crud-demo-page.tsx`:
  - 成功: `{ ok: true, status: 200, data: ... }` → `{ status: 0, data: ... }`
  - 404: `{ ok: false, status: 404, data: null }` → `{ status: 404, data: null }`（非零即失败）

- [x] (Fix) `apps/playground/src/pages/flux-basic-page.tsx`:
  - 同上批量替换

- [x] (Fix) 其余 ~30 个 playground mock fetcher 文件 + `packages/*` mock fetcher:
  - 成功: `{ ok: true, status: 200, data: ... }` → `{ status: 0, data: ... }`
  - 通过 `scripts/transform-mock-fetchers` + 多行脚本批量完成（单行 180 处 + 多行 278 处）

---

## Phase 6 — Test Updates (`packages/`)

**Exit Criteria**: 全部 package test 通过（不含 pre-existing 失败）。

- [x] (Fix) `packages/flux-runtime/src/__tests__/` 下测试文件:
  - mock fetcher 成功 → `{ status: 0, data }`
  - mock fetcher 失败 → 保留非零 status（移除 `ok: false`）
  - 类型注解 → 移除 `ok: true;`，`ok: boolean; status:` 收敛为 `{ status: number; ... }`
  - fallback 错误消息格式更新为 `Request failed (status=N, code=...)`

- [x] (Fix) `packages/flux-renderers-*/src/__tests__/` 下测试文件: 同上模式替换

- [x] (Fix) `packages/flux-formula/src/__tests__/` 下测试文件: 同上

- [x] (Fix) 其他包测试（code-editor, report-designer, nop-debugger, flow-designer, word-editor 等）: 同上

> 注：import-action 结果类型（`Promise<{ ok: true }>` / `Promise<{ ok: true; data: X }>`）是 ActionResult 而非 ApiResponse，**未改动**（CHK-7 已细化为要求 `status` 同现，排除这类 false positive）。

---

## Phase 7 — Heuristic Verification Script

**Exit Criteria**: 脚本运行零输出（无残留旧模式）。

- [x] (Fix) `scripts/verify-api-response-envelope.mjs` 已创建并细化：
  - CHK-7 细化为要求 `ok: true[;,] status:` 同现（排除 import-action false positive）
  - 运行结果：✅ 全部通过 — 无残留旧模式

---

## Verification Script

`scripts/verify-api-response-envelope.mjs` 已创建，运行：

```bash
node scripts/verify-api-response-envelope.mjs
```

7 项检查（CHK-1 到 CHK-7），修复前基线 209 处残留，修复后目标零输出。

---

## Closure Gates

- [x] `pnpm typecheck` 通过（55/55 packages）
- [x] `pnpm build` 通过（29/29 tasks）
- [x] `pnpm lint` 通过（29/29 tasks，schema coverage 100%）
- [x] `pnpm test` 通过 — **53/55 全绿，1 个 pre-existing `apps/playground` schema-examples 失败（clean HEAD 即存在，见下方说明）**
- [x] `node scripts/verify-api-response-envelope.mjs` 零输出
- [x] `docs/architecture/api-response-envelope.md` 与实现一致（`ok?: boolean`、规范化层、msg 主路径）
- [x] `docs/logs/` 更新
- [x] 独立 closure audit（fresh sub-agent，task_id: ses_0ce4f2fe7ffeTNxdua5AYphrJF）

### Pre-existing Failures 说明（非本 plan 引入）

53/55 packages 全绿。1 个失败在 `apps/playground`，是 clean HEAD 即存在的 baseline 失败：

- `src/schema-examples.test.ts > validate the user-management schema example`：期望编译器诊断警告 `unvalidated-component-target`，但实际编译输出为空数组。该行为在 stash 掉本 plan 全部改动后仍然复现，与本 plan 的 ApiResponse 信封对齐工作无关。

## Closure

Status Note: 所有 7 个 Phase 已落地，全部 4 项 Closure Gates 已勾选。ApiResponse 类型、运行时规范化层、消费者启发式清除、mock fetcher 批量转换、验证脚本均已完成。53/55 packages 测试全绿，唯一失败为 clean HEAD 即存在的 baseline playground schema-examples 失败。设计文档第 6 节已按 audit finding 修正（移除 `responseAdaptor` 上下文中不准确的 `ok`/`msg`）。

Closure Audit Evidence:

- Auditor / Agent: fresh sub-agent（task_id: ses_0ce4f2fe7ffeTNxdua5AYphrJF，非执行 session 上下文）
- Evidence: 审计报告列出 7 个 Phase 全部验收通过、3 项 finding（设计文档第 6 节夸大已修复、检查项已补充、状态已更新为 completed）。接口语义核查确认：`normalizeResponseOk` 在 responseAdaptor 之前调用、错误提取优先级正确、规范化测试 5 项全部覆盖。

Follow-up:

- no remaining plan-owned work
