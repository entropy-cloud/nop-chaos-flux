# 1 事件派发 ctx 全量扫描（dialog/drawer surface + upload-field + graph + wizard + carousel/tabs type 命名空间）

> Plan Status: completed
> Mission: component-audit
> Work Item: 事件 ctx 全量扫描（follow-up backlog 家族：O-P2-3 / O-P2-4 / 22-09 / 22-11 / 09-03）
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-06-0711-open-audit-component-audit.md`（[P2] O-P2-3 / O-P2-4）、`docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P2] 22-09 / 22-11 / 09-03）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-06-0711-1-scheduling-family-p1-remediation.md`（completed，P1 收口）、CX-10 家族约定（`docs/plans/2026-08-05-1314-2-c8-1-ai-conversation-main-chain-audit.md`）、`docs/bugs/83.md`、`docs/architecture/renderer-runtime.md:685-690`（Event Passthrough Contract）

## Purpose

把 schema 事件派发 `{ event, evaluationBindings, scope }` ctx 约定（CX-10 / bug-83 家族约定，renderer-runtime.md:685-690）扩展到 mission 审计仍遗留的单参派发点：dialog/drawer surface 事件（5 点）、upload-field 家族（7 点）、graph（1 点）、wizard（6 点），使 action args 模板键（`${surfaceId}`/`${item.url}`/`${nodeId}`/`${currentStepKey}` 等）在全部 schema 事件上可解析；同时把 carousel/tabs 裸 `'change'` type 命名空间化（09-03）并补 tabs 派发缺 `scope` 键的残余，沉淀机械扫描门禁 `check:audit-event-dispatch-ctx` 防止回归。

## Current Baseline

- **契约**：renderer-runtime.md:685-690（Event Passthrough Contract）规定 schema 事件派发第二参 ctx 必须为 `{ event, evaluationBindings, scope }`（payload 兼作 bindings）；`getEvaluationScope`（`flux-action-core/src/action-core.ts:206-208`）只合并 `evaluationBindings` + scope，args 模板只读 evaluationBindings——单参派发时 `args: { id: "${id}" }` 类模板键静默空值，成员访问模板（`${item.url}`）甚至抛 TypeError（CX-11 先例，`docs/bugs/89`）。
- **已修复面**（live 核对）：scheduling 全家（CX-12）、ai 会话主链 + 工具内容（CX-10）、mobile 族（C7 bug-83 家族）、timeline/steps/button-group/collapse（全量 ctx 先例）均已在派发点带全量 ctx。
- **剩余单参派发点**（live 逐一核对，2026-08-06；共 19 点）：
  - `packages/flux-renderers-basic/src/use-surface-renderer.ts:176,181,224-226`——onClose/onOpen/onConfirm **5 处**单参派发（`:176` onClose、`:181` onOpen、`:224` onOpen、`:225` onClose、`:226` onConfirm；审计 O-P2-3 记「4 处」漏计 `:225`，以 live 5 处为准；契约 `surface-renderer-definitions.ts:5-43` 定义 payload `{surfaceId, kind, open}`）；dialog/drawer 卡（`docs/audits/per-component/dialog.md:22`、`drawer.md:22`）dim 7 只对账 payload 形状，未查 ctx。
  - `packages/flux-renderers-form-advanced/src/upload-field.tsx:261,281,300,367,381,386,393`——onUploadSuccess/onUploadError/onReject/onDelete/onDeleteSuccess/onDeleteFail 7 处单参派发（input-file/input-image 共用）；CG「design §8.1 豁免」依据为循环引用（design §8.1 未文档化单参豁免）。
  - `packages/flux-renderers-graph/src/graph-renderer.tsx:158`——`void handler(fullPayload, { scope: props.node.scope })` 缺 event/evaluationBindings。
  - `packages/flux-renderers-layout/src/wizard-renderer.tsx:259-266,321-329,336-343,354-362,374-381,395-404`——onChange/onStepError/onStepCommit/onComplete 6 点缺 ctx；同文件 beforeEnter/beforeLeave（:199-223）已带 evaluationBindings（证明是遗漏而非设计差异）。
- **09-03 type 命名空间**（live 核对）：`carousel.tsx:70` payload `{ type: 'change', ... }`、`tabs.tsx:105-115` 同型裸 `'change'`；同包 cards（`'cards:item-click'`）/alert（`'alert:close'`）已命名空间化，renderer-runtime.md:697-700 要求 meaningful namespaced type。
- **既有测试**：各组件既有事件测试（如 `wizard-renderer` 测试覆盖 onChange 派发但不断言 args 模板解析；dialog/drawer 无 ctx 断言；graph 无 ctx 契约测试）。无任何测试断言单参派发点能解析 `${...}` 模板键。
- **工具基线**：`scripts/audit/` 已有 14 个审计脚本（`find-renderer-browser-io.mjs` 等），`package.json` 以 `check:*` 注册；尚无事件 ctx 完整性扫描（multi-audit §9 建议新增）。
- **验证基线**：CV full-green（2026-08-06：typecheck/build/lint 32/32、test 59/59 10,397 passed / 0 failed、e2e 1054/43/6 watch-only）。

## Goals

- 上述 4 个族共 19 个单参派发点全部补齐 `{ event, evaluationBindings, scope }` ctx（payload 兼作 bindings），action args 模板键可解析。
- carousel/tabs 事件 payload type 命名空间化（`carousel:change`/`tabs:change`），同步源文锁断言与 design.md。
- 新增机械扫描门禁 `check:audit-event-dispatch-ctx`（扫描 `props.events.xxx?.(payload, {` 后缺 `event`/`evaluationBindings` 键的派发点），修复后基线零命中并注册进 `pnpm check` 或独立命令。
- 每族补契约测试（test-first 先红后绿）：实证 `${surfaceId}`/`${url}`/`${nodeId}`/`${currentStepKey}` 等在 action args 模板中解析为真实值。

## Non-Goals

- 不审计 `component:*` 句柄与 reaction dispatch 接线（22-05/22-12 归 plan 3）。
- 不处理 upload-field 的 payload 形状本身（design §8.1 已一致，仅补 ctx）。
- 不改动 scheduler/ai/mobile 已修复派发点（仅扫描验证零回归）。
- 不做 09-03 之外的 mobile 家族裸 type 基线变更（审计卡锁定基线，不拉入）。

## Scope

### In Scope

- `use-surface-renderer.ts` 5 点（onOpen/onClose/onConfirm）+ dialog/drawer 相关契约测试。
- `upload-field.tsx` 7 点 + 契约测试。
- `graph-renderer.tsx:158` + 契约测试。
- `wizard-renderer.tsx` 6 点 + 契约测试。
- `carousel.tsx:70` / `tabs.tsx:105-115` type 命名空间化 + 源文锁断言/design.md 同步。
- `scripts/audit/find-event-dispatch-without-ctx.mjs`（或等价命名）门禁脚本 + `package.json` 注册 + 基线扫描。
- 各组件 design.md 若声明事件契约（wizard/carousel/tabs）同步 ctx/type 描述；renderer-runtime.md 不须改（契约已存在）。

### Out Of Scope

- 22-04/22-05/22-06/22-07/22-08/22-10/22-12（scheduling/graph 接线与 phantom 契约，plan 3）。
- 09-01/09-02（createScope/disposeScope 配对，plan 2）。
- 05-01/05-02/05-03（useScopeSelector 门控，后续轮次）。
- 其余 2026-08-06-0711 P2 条目（02-xx/04-01/10-xx/11-xx/12-xx/13-xx/18-xx/20-xx，后续轮次）。
- O-P2-1（successor 登记）/O-P2-2（browser-io 门禁范围）——另行登记，不入本 plan。

## Failure Paths

> 不适用：本 plan 为事件契约一致性修复，无外部 IO/鉴权/错误码契约。风险形态为「模板键静默空值」与「成员访问 TypeError」，由契约测试实证覆盖（Failure Paths 表展开见下，作为测试场景清单）。

| 场景编号 | 触发                                           | 行为                                | 可重试 | 用户可见表现                            |
| -------- | ---------------------------------------------- | ----------------------------------- | ------ | --------------------------------------- |
| evt-1    | dialog onConfirm action args 含 `${surfaceId}` | 解析为真实 surfaceId                | 否     | 宿主收到正确参数（修复前为空）          |
| evt-2    | upload onUploadSuccess args 含 `${item.url}`   | 解析为真实 URL                      | 否     | 宿主收到正确参数（修复前 TypeError/空） |
| evt-3    | graph onNodeClick args 含 `${nodeId}`          | 解析为真实节点 id                   | 否     | 宿主收到正确参数                        |
| evt-4    | wizard onChange args 含 `${currentStepKey}`    | 解析为真实 step key                 | 否     | 宿主收到正确参数                        |
| evt-5    | carousel/tabs onChange 事件 payload type       | `'carousel:change'`/`'tabs:change'` | 否     | 调试器/监控可按命名空间区分来源         |

## Test Strategy

本档选择：`必须自动化`（契约/公共层修复——事件派发 ctx 是 renderer-runtime.md 文档化公共契约，action args 模板键可解析性是可断言行为；Proof 项先于 Fix 项）。

## Execution Plan

### Phase 1 - 机械扫描门禁与基线登记

Status: completed
Targets: `scripts/audit/`、`package.json`

- Item Types: `Proof | Fix`

- [x] **Proof（先红）**：编写 `scripts/audit/find-event-dispatch-without-ctx.mjs`——扫描 `packages/flux-renderers-*/src` 下 schema 事件派发点，命中条件：派发第二参缺失，或第二参对象 `{` 内无 `evaluationBindings`/`event` 键。**必须覆盖三种形态**：①直接调用 `props.events.xxx?.(`/`eventHandlers.xxx?.(`；②动态索引 `props.events[type](`（graph `fireNodeEvent` 形态，graph-renderer.tsx:153 经局部 `handler` 变量间接派发——脚本对 `props.events[...]` 形态按其解析出的 handler 调用点（`void handler(fullPayload, ...)`）同样捕获第二参缺键）；③`.?.(` 可选链调用。运行确认命中清单 ≥19 点（5+7+1+6 本 plan 范围 + 可能的额外残留），作为回归基线。
- [x] **Fix**：`package.json` 注册 `check:audit-event-dispatch-ctx`（独立命令，不强制并入 `pnpm check` 聚合——沿用 `check:audit-*` 族模式，聚合与否在 Phase 5 裁决）。

Exit Criteria:

- [x] 扫描脚本命中清单与本 plan Current Baseline 的 19 点逐项对齐（file:line 可 grep 复现；graph 动态索引形态由脚本显式覆盖或登记为手维护条目）。**live 基线实测 23 点 = 19 点全数 + 4 点同根因扫描发现（list-renderer.tsx:368、pagination-renderer.tsx:163,178,188），裁决并入本 plan 修复（见 Deferred But Adjudicated 更新）；form.tsx lifecycle 派发（`submitAction(undefined, {scope, form...})`）与 ai-bubble `ctx` 变量形态由脚本排除；零参通知事件（combo/input-table/picker/transfer 20 点）与原生 DOM 转发（button/notice-bar/chart 7 点）登记 allowlist。**
- [x] `node scripts/audit/find-event-dispatch-without-ctx.mjs` 可独立运行且输出含 file:line。

### Phase 2 - basic surface 事件（dialog/drawer）ctx 补齐

Status: completed
Targets: `packages/flux-renderers-basic/src/use-surface-renderer.ts`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] **Proof（test-first）**：新增/扩展契约测试——dialog onConfirm/onClose/onOpen 派发 ctx 含 `{ event, evaluationBindings, scope }` 且 `evaluationBindings.surfaceId === id`（`${surfaceId}` 可解析）；先红（修复前 ctx 缺失断言失败）。**先红实测：3 条新用例 URL 解析为空（`/confirm-`），9 处聚合断言失败；修复后全绿。**
- [x] **Fix**：`:176,181,224-226` **5 处**派发补 `eventCtx(payload)`（payload 兼作 bindings，对齐 kanban `eventCtx` 模式；event 侧按 `{ ...payload, type: 'custom' }` 合成 type，与 normalizeActionEvent 归一化语义一致）。
- [x] **Proof**：受影响测试全绿 + `pnpm --filter @nop-chaos/flux-renderers-basic typecheck && test`。**实测 488/488 全绿 + 包 typecheck 0 error（收口阶段契约测试拆分至 `surface-event-ctx.test.tsx` 独立文件后 basic 485/485，见 Closure 注记）。**

Exit Criteria:

- [x] basic 包单测绿，新增 ctx 契约用例全绿（实证 `${surfaceId}` 解析）。
- [x] 扫描脚本对 basic 包该 5 点零命中。**实测命中清单 23 → 18 点（surface 5 点已清零）。**

### Phase 3 - upload-field 家族 ctx 补齐

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/upload-field.tsx`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] **Proof（test-first）**：新增契约测试——onUploadSuccess/onUploadError/onReject/onDelete/onDeleteSuccess/onDeleteFail 派发 ctx 含 `{ event, evaluationBindings, scope }`，`${item.url}` 模板键解析为真实值（payload 无裸 `url` 键，仅 `item.url`/`file.url`）；先红。**先红实测：5 条新用例全红——`${item.url}`/`${error}`/`${reason}`/`${file.url}` 解析为空（`/success-`、`/error-`、`/reject-`、`/delete-`）；修复后全绿。**
- [x] **Fix**：`:261,281,300,367,381,386,393` 7 处派发补 ctx（payload 兼作 bindings）。**实现：组件内 `eventCtx(payload)` helper（event 保留 payload 既有 type，`{...payload, type: typeof payload.type === 'string' ? payload.type : 'custom'}`；evaluationBindings = payload；scope = parentScope），7 处派发点全部经 eventCtx 二参派发。**
- [x] **Proof**：form-advanced 包 typecheck + 单测全绿。**实测 1038/1038 全绿 + 包 typecheck 0 error。**

Exit Criteria:

- [x] form-advanced 包单测绿，新增 ctx 契约用例全绿（实证 `${url}` 解析）。
- [x] 扫描脚本对 upload-field 该 7 点零命中。**实测命中清单 18 → 11 点（upload-field 7 点已清零）。**

### Phase 4 - graph + wizard ctx 补齐

Status: completed
Targets: `packages/flux-renderers-graph/src/graph-renderer.tsx`、`packages/flux-renderers-layout/src/wizard-renderer.tsx`、各自 `__tests__/`

- Item Types: `Fix | Proof`

- [x] **Proof（test-first）**：graph 契约测试——onNodeClick/onSelectionChange 派发 ctx 含 event/evaluationBindings，`${nodeId}` 解析；wizard 契约测试——6 个派发点（onChange/onStepError/onStepCommit/onComplete）`${currentStepKey}`/`${currentStepIndex}` 解析；均先红。**先红实测：graph 2 条（ctx undefined）+ wizard 2 条（`/commit-`、`/change-`、`/step-error-` 空替换）；修复后全绿。**
- [x] **Fix**：graph-renderer.tsx:158 补 `event: fullPayload, evaluationBindings: fullPayload`；wizard-renderer.tsx 6 点补 `{ event, evaluationBindings, scope }`。
- [x] **Proof**：graph/layout 包 typecheck + 单测全绿。**实测 graph 44/44、layout 105/105（含新增用例）、data 725/725（含 4 点同根因并入的 list/pagination 契约测试）；三包 typecheck 0 error。**
- [x] **同根因并入（Phase 1 裁决落地）**：list-renderer.tsx:368（onSelectionChange）+ pagination-renderer.tsx:163,178,188（onChange/onPageSizeChange）4 点补全量 ctx，契约测试 `${selectionMode}`/`${currentPage}` 解析实证，先红后绿。

Exit Criteria:

- [x] graph/layout 包单测绿，新增 ctx 契约用例全绿。
- [x] 扫描脚本对 graph/wizard 该 7 点零命中。**实测全仓零命中（含 list/pagination 4 点一并清零）。**

### Phase 5 - carousel/tabs type 命名空间 + 门禁收口

Status: completed
Targets: `packages/flux-renderers-content/src/carousel.tsx`、`packages/flux-renderers-basic/src/tabs.tsx`、源文锁断言、design.md

- Item Types: `Fix | Proof | Decision`

- [x] **Proof（test-first）**：carousel/tabs 事件 payload type 断言改为 `'carousel:change'`/`'tabs:change'`；先红（修复前为裸 `'change'`）。**先红实测：carousel-autoplay.test.tsx:436 断言红（`expected 'change' to be 'carousel:change'`）+ carousel.test.tsx 源文锁正则红 + 新 tabs 契约用例红（URL `/type-change-value-second`）；修复后全绿。**
- [x] **Fix**：`carousel.tsx:70`、`tabs.tsx:105-115` payload type 命名空间化；同步源文锁断言与各 design.md（若声明事件契约）。**落地：carousel.tsx `'carousel:change'`；tabs.tsx `createTabsChangePayload` `'tabs:change'`；carousel.test.tsx 源文锁正则改 `type:\s*'carousel:change'`；carousel/tabs/wizard 三份 design.md 事件契约节同步命名空间 type + ctx 描述。**
- [x] **Fix**：tabs 派发点（`tabs.tsx:313-317,:418-423`）现有 `{ event, evaluationBindings }` 缺 `scope` 键——补 `scope: props.node.scope`（对齐全量 ctx 契约；已由运行时 scope 回退兜底，本次一并对齐，纳入扫描门禁覆盖）。
- [x] **Decision**：裁决 `check:audit-event-dispatch-ctx` 是否并入 `pnpm check` 聚合（以修复后基线零命中为前提；并入则回写 package.json `check` 链，不并入则登记为独立命令并在 `docs/context/project-context.md` 工具基线登记）。**裁决：并入聚合。依据：修复后全仓零命中；事件 ctx 属零容忍契约门禁（静默空值/TypeError 失败形态），与 `check:audit-renderer-browser-io` 并入先例（CG plan）一致；`check` 链追加 `pnpm check:audit-event-dispatch-ctx`；project-context.md 工具基线登记。**
- [x] **Proof**：扫描脚本全仓零命中复跑；content/basic 包测试绿。**实测：`node scripts/audit/find-event-dispatch-without-ctx.mjs` 零命中 exit 0（allowlist 7 条原生 DOM 转发）；`pnpm check:audit-event-dispatch-ctx` exit 0；content 285/285、basic 491/491（收口拆分后 485/485，见 Closure 注记）。**

Exit Criteria:

- [x] 扫描脚本全仓零命中（登记为门禁基线，CG 风格回写）。**实测零命中 + package.json `check` 聚合链已含新门禁。**
- [x] carousel/tabs type 契约测试 + 源文锁断言绿；design.md 同步完成。
- [x] `pnpm check`（或独立命令）含新增脚本且 exit 0。**实测 `pnpm check:audit-event-dispatch-ctx` exit 0（聚合链中该项绿；`pnpm check` 整链仍受 pre-existing `check:oversized-code-files` 14 文件红限制，与 CV 基线一致）。**

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh session（task `ses_0285f2a2dffeYC0PjkpWsVhJ5M` 轮 1 + `ses_02855f08affe6TWojBU1LERqAR` 轮 2）
- Verdict: pass（两轮：轮 1 Major「扫描脚本无法覆盖 graph 动态索引派发」+ Minor 计数/evt-2/tabs scope，已全部修订；轮 2 复审 pass，0 Blocker / 0 Major，4 Minor 已处理）
- Rounds: 2
- Findings addressed: Major-1 扫描脚本三形态覆盖（direct/dynamic-index/optional-call）+ graph 间接 handler 显式登记；Minor-1 surface 5 处计数全文件对齐（4→5，总数 18→19）；Minor-2 evt-2 模板键改 `${item.url}`；Minor-3 tabs 派发补 `scope` 键；Minor-4 Goals/Scope 计数与 `${url}` 表述清理

## Closure Gates

- [x] 所有 in-scope 单参派发点（19 点）已补 `{ event, evaluationBindings, scope }` ctx，扫描门禁全仓零命中（graph 动态索引形态已覆盖）——**实测 23 点（19 + 同根因并入 4 点 list/pagination）全部修复，`find-event-dispatch-without-ctx.mjs` 全仓零命中 exit 0**
- [x] carousel/tabs type 命名空间化落地 + 源文锁/design.md 同步
- [x] 各族契约测试全绿（`${surfaceId}`/`${url}`/`${nodeId}`/`${currentStepKey}`/type 实证解析）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（4 点同根因已并入修复；allowlist 仅登记已裁决契约类别）
- [x] 受影响的 owner docs 已同步（各 design.md 事件契约描述；renderer-runtime.md 契约已存在无需改；daily log 收口记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项——**独立 fresh-session closure-audit（task `ses_027fd7880ffemLtavczgfHCxIU`）approved，零 Blocker/零 Major，4 Minor 非阻塞（计数口径、ID 映射、空白行、Closure 占位——均已处理），证据见 Closure 节**
- [x] `pnpm typecheck`（32/32）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32）
- [x] `pnpm test`（59/59 task）

## Deferred But Adjudicated

### 事件 ctx 全量扫描的剩余单参派发（扫描脚本发现的本 plan 范围外点）

- Classification: `watch-only residual` → **已执行（Phase 1 裁决落地，2026-08-06）**：扫描脚本 live 基线 23 点，逐点裁决结果——
  - **同根因并入本 plan 修复（4 点）**：`list-renderer.tsx:368`（onSelectionChange payload 派发缺 ctx）、`pagination-renderer.tsx:163,178,188`（onChange/onPageSizeChange payload 派发缺 ctx）——与 22-09（graph）同根同型，Phase 4 一并补全量 ctx + 契约测试。
  - **零参通知事件（20 点，不纳入）**：combo/input-table（onAdd/onRemove/onReorder）、picker（onPick）、transfer（onSelectAll/onChange）——零参派发无 payload、无绑定键可丢失，C3.x 空参契约裁决成立；脚本对零参调用天然放行，不需 allowlist。
  - **原生 DOM/React 合成事件转发（7 点，allowlist 登记）**：button.tsx:220（onClick）、notice-bar.tsx:160,166,172（onClose/onClick）、chart-renderer.tsx:605,609,612（onClick/onHover + 空 `{}` ctx）——renderer-runtime.md:673-675 要求 DOM 入口转发原生事件，normalizeActionEvent 归一化，C3.x 裁决 pass；已登记脚本 ALLOWLIST 留档。
  - **脚本排除形态（非命中）**：form.tsx lifecycle 派发（`props.events['initAction']` 等括号索引 + `undefined` 首参 + 全量 lifecycle ctx，动态索引形态按首参 `undefined` 排除）；ai-bubble `ctx` 变量携带全量 ctx（第二参裸标识符含 `ctx`/`event` 判定合规）。
- Why Not Blocking Closure: 4 点同根因已并入修复（见上）；零参/原生转发为已裁决契约类别，allowlist 留档；无剩余未裁决点
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- 事件 ctx 完整性检查作为 `check:audit-*` 族常态门禁，后续审计轮次可直接复用（若 Phase 5 裁决未并入 `pnpm check` 聚合）。
- `docs/audits/2026-08-06-0711-open-audit-component-audit.md` 的 O-P2-3/O-P2-4 与 multi-audit 22-09/22-11/09-03 条目修复后回写状态（卡/审计文档标记 fixed）。

## Closure

Status Note: 2026-08-07 关闭——19 点 in-scope 单参派发 + 4 点同根因并入（list/pagination）全部补 `{ event, evaluationBindings, scope }` ctx；carousel/tabs type 命名空间化 + 源文锁/design.md 同步；`check:audit-event-dispatch-ctx` 门禁并入 `pnpm check` 聚合且全仓零命中；各族契约测试先红后绿全绿（basic 485、graph 44、layout 105、data 725、form-advanced 1038、content 285）；typecheck/build/lint 32/32、test 59/59 task；`pnpm check` 仅 pre-existing oversized 14 文件红（基线一致，零新增——契约测试拆分独立文件避免自增超限）。注记：basic 包计数 Phase 2 执行时 488 → Phase 5 后 491（新增 tabs 契约测试）→ 收口拆分 `surface-event-ctx.test.tsx`/`wizard-event-ctx.test.tsx` 后 485（表面测试由聚合三文件各跑 3 次变为单跑 1 次，覆盖不变）；roadmap O-P2-3/O-P2-4/22-09/22-11/09-03 五行 ✅ + 两份审计文档 5 条 finding 标记 fixed + daily log 2026-08-07 收口记录。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh session（task `ses_027fd7880ffemLtavczgfHCxIU`）
- Evidence: **approved**，零 Blocker/零 Major；逐 Phase live 复核——Phase 1 门禁三形态覆盖 + 注册进 `pnpm check` 链 + exit 0；Phase 2 五处派发 eventCtx（:167-174 helper，:188/:194/:239/:243/:247）+ surface-event-ctx.test.tsx 3 用例；Phase 3 七处派发（:279/:300/:320/:387/:402/:409/:417）+ upload-field.test.tsx 5 用例；Phase 4 graph :161-165 + wizard 6 点 + list/pagination 4 点 + 各自契约测试；Phase 5 carousel/tabs 命名空间 + tabs scope 键 + 源文锁 + 三 design.md；deferred 分类诚实（4 点并入修复非延期，零参/原生转发含裁决理由）；4 Minor 非阻塞（计数口径/ID 映射/空白行/占位符——计数与占位已处理）

Follow-up:

- no remaining plan-owned work
- Non-Blocking Follow-ups（上节）保持：`check:audit-event-dispatch-ctx` 常态门禁可复用；审计文档已标记 fixed
