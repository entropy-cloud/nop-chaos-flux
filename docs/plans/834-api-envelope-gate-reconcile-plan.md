# 834 API 信封契约门禁对账与接线（deep-audit 2026-11-01 G1）

> Plan Status: active
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §6 G1
> Related: `docs/plans/2026-07-05-api-response-envelope-alignment-plan.md`（completed，门禁原始来源）、commit `01770f770`（2026-08-27 ApiResponse 删除 `ok`）、owner doc `docs/architecture/api-response-envelope.md`

## Purpose

把 API 响应信封的三个面重新对齐到同一个现行契约：owner doc、`scripts/verify-api-response-envelope.mjs` 规则、仓库代码；然后把该门禁接入 `pnpm check`，让它不再"存在但不运行"。

## Current Baseline

- 门禁脚本 `scripts/verify-api-response-envelope.mjs`（CHK-1..CHK-7）在 2026-07-05 plan 收口时零输出（其 Closure Gates 明列），但**不在任何 npm script / CI**（根 `package.json` 与 `.github/workflows/` 均无引用）。
- 2026-11-01 审计快照实跑 **exit 1、30 处**（评审复跑已 32 处——并行会话新增的未跟踪测试带来 +2，计数随并行改动浮动；本计划以**接线前最新实跑的全部命中**为处置对象）：CHK-1「mock fetcher 返回 `{ok, status}` 旧格式」27 处（分布：`dialog-form-submit-refresh-crud.test.tsx` 3、`tree-lazy-children.test.tsx` 2、`input-suggest.test.tsx`、`upload-field.test.tsx`、`tree-remote-search.test.tsx`、`markdown-src.test.tsx`、`w3d-advanced-input-family-demo.tsx` 各 1 处等，原始输出 `_tmp/envelope.log`）；CHK-4「`dynamic-renderer.tsx` 残留 `isActionResult` 嗅探」2 处（`packages/flux-renderers-basic/src/dynamic-renderer.tsx:14,164`）；CHK-5「ApiResponse 类型缺少 `ok` 字段」1 处。
- 契约演进：commit `01770f770`（2026-08-27）从 `ApiResponse` 删除冗余 `ok`，成功判定统一为 `status === 0`，`data: T | null`；`ActionResult.ok` 保留（控制流信号）。live 类型 `packages/flux-core/src/types/renderer-api.ts:16-28` 注明"按 status 分支、不用单独 ok"。
- **owner doc 漂移**：`docs/architecture/api-response-envelope.md` 仍规定 `ok?: boolean` 为规范化层计算属性（:53-67、:72-89、§5.1 :279-287），与 live 契约不符。
- 由此，CHK-5 规则已过时（要求已被删除的字段）；CHK-1 的"旧格式"判据需按现行契约重定义：`ok` 现为被忽略的冗余字段；**真正的语义风险**是以 HTTP 风格 status（如 `status: 200`）表示成功的 mock——现行契约下 `status !== 0` 即失败（owner doc §1.1：0=成功、-1=失败、400/401/403/404/408=HTTP 错误映射），去掉 `ok` 后仍是"把失败当成功"的数据（live 实例：并行 WIP `input-table-revalidate-after-fix.test.tsx:65,73`）。
- ApiResponse 形判别：ApiResponse 形对象含 `status` 键，`ActionResult`（`actions.ts:286`）无 `status`——现行 CHK-1 以 `ok` 与 `status:` 同现为必要条件，结构上不命中纯 ActionResult。
- 现有 `scripts/__tests__` 唯一 runner 为 `pnpm test:scripts`（`vitest.scripts.config.ts` include 仅 `.ts`）；其接入 `pnpm check` 由 plan 830 T7 承担。

## Goals

- owner doc 描述现行契约（无 `ok`、`status === 0` 成功、`data: T | null`、ActionResult 与 ApiResponse 区分）。
- 门禁规则与现行契约一致：过时规则删除/改写，每条规则都有命中/不命中的脚本测试。
- 仓库零残留（每处按新规则裁决：修复或证明规则误报并收紧规则）。
- 门禁接入 `pnpm check`。

## Non-Goals

- 不改 `ApiResponse`/`ActionResult` 类型本身；不改请求规范化层行为。
- 不重写 2026-07-05 历史 plan 文本（Rule 21）。

## Scope

### In Scope

- owner doc 改写为现行契约；脚本规则对账 + `scripts/__tests__` 用例；接线前最新实跑的全部残留逐条裁决与修复；`check:api-envelope` 接入 check 链。

### Out Of Scope

- 与信封无关的 mock fetcher 风格统一。

## Failure Paths

不适用：门禁与文档对账，不改运行时行为（若裁决发现某 mock 语义错误导致测试断言了错误行为，修复其测试数据而非运行时）。

## Test Strategy

必须自动化：门禁规则本身需脚本测试（命中/不命中样例），否则无法证明接线后的门禁不是空转。

## Execution Plan

### Phase 1 - 契约定稿（owner doc）

Status: planned
Targets: `docs/architecture/api-response-envelope.md`

- Item Types: `Fix`

- [ ] Fix：按 live 类型与 `request-runtime` 规范化层实现改写——删除 `ok` 计算属性设计（:53-67、:72-89 流程图、§5.1、§对照表与改动清单中的 ok 条目），写明 `status === 0` 成功判定、`data: T | null`、ActionResult.ok 与 ApiResponse 的语义区分及原因；只写最终设计

Exit Criteria:

- [ ] owner doc 不再出现 `ApiResponse.ok` 设计；与 `renderer-api.ts:16-28` 及规范化层代码逐条一致

### Phase 2 - 规则对账与残留收敛

Status: planned
Targets: `scripts/verify-api-response-envelope.mjs`、`scripts/__tests__/verify-api-response-envelope.test.ts`（新）、接线前最新实跑的全部命中文件

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：逐条审定 CHK-1..CHK-7 在现行契约下的保留/改写/删除并记录。已定方向：CHK-5 改为"ApiResponse 类型不得含 `ok`"；CHK-1 拆为两条——(a) ApiResponse 形 mock（判别式：返回对象字面量含 `status` 键）不得含冗余 `ok` 键；(b) ApiResponse 形 mock 的 `status` 必须**严格属于** owner doc §1.1 合法集合（0、-1、400、401、403、404、408）——集合外取值（`200`、`500`，以及遗留失败约定 `status: 1`）一律命中；默认修法为改写为合法值（失败改 `-1` 并以 `msg` 承载消息，成功改 `0`），仅有意构造的异常信封以行内豁免注释 + 规则测试显式覆盖；同步修正脚本内仍推荐 `{ status: 1, msg }` 的修复提示文案
- [ ] Proof：脚本可测化（导出检查函数或支持 `--root` 指向 fixture），在 `scripts/__tests__/verify-api-response-envelope.test.ts`（`.ts`，由 `pnpm test:scripts` 收集）为每条保留规则写命中/不命中用例，含 ActionResult 形不命中、`status: 200` 命中两个判别用例
- [ ] Fix：逐条处理全部命中——CHK-1(a) mock 去掉冗余 `ok`；CHK-1(b) 集合外 status 按上述默认修法改写（确认是 ApiResponse 形而非 ActionResult 形；ActionResult 形属误报则收紧规则）；CHK-4 核对 `dynamic-renderer.tsx` 的 `isActionResult` 嗅探在现行数据流下是否仍必要（必要则规则改为允许并注明依据，不必要则删除嗅探并补测试）
- [ ] Proof：受影响包测试全绿（mock 改动不改变断言语义）

Exit Criteria:

- [ ] `node scripts/verify-api-response-envelope.mjs` exit 0；`pnpm test:scripts` 下新脚本测试通过
- [ ] 受影响包测试通过

### Phase 3 - 接线

Status: planned
Targets: 根 `package.json`

- Item Types: `Fix`

- [ ] Fix：新增 `check:api-envelope` script 并接入 `check` 链（与既有 `&&` 链同形）；plan 830 T7 同样改根 `package.json` check 链——按执行顺序在其改动之上追加，提交前核对两处接线均在

Exit Criteria:

- [ ] `pnpm check` 链包含并执行该门禁（输出中可见）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_c852b52d-d029-4770-b556-12543f1abd32；round-2 agent_24b0a5d5-3b32-49bf-93ba-7af8004f01f3）
- Verdict: pass（round-1 fail：2 Major + 2 Minor → 修订 → round-2 零 Blocker/Major，3 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 CHK-1 仅禁 `ok` 会让"HTTP 风格 status 表示成功"的语义风险类对门禁永久不可见 → 拆 (a) 冗余 ok / (b) status 严格属于 §1.1 合法集合；Major-2 脚本测试改 `.test.ts`（由 `pnpm test:scripts` 收集，接线归 830 T7）。

## Closure Gates

- [ ] owner doc 与 live 契约一致（owner-doc drift 已收敛）
- [ ] 门禁规则与契约一致且有脚本测试；仓库零残留
- [ ] 门禁已接入 `pnpm check`
- [ ] 不存在被静默降级的 in-scope 残留
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
