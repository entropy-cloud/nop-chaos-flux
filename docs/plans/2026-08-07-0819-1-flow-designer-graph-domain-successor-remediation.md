# 01 flow-designer/graph 域 successor 承接与修复

> Plan Status: completed（2026-08-07 执行完毕：5 Phase 全 completed；closure-audit 由独立 fresh session 收口 approved（首轮 needs-fixes：1 Major（plan 执行态未回写）+ 3 Minor，修复后复检 approved），证据见 Closure 节）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/multi-audit-r2-verdicts.md`（successor 5 项）、`docs/audits/2026-08-06-0711-open-audit-component-audit.md`（O-P2-1）、`docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（13-01）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog
> Related: `docs/plans/2026-08-06-0556-1-followup-backlog-and-r1-p2-routing.md`（successor 登记源）、`docs/plans/2026-08-04-2030-1-g1-graph-viewer-plan.md`（graph 域）
> Mission: component-audit
> Work Item: flow-designer/graph 域 successor 承接（O-P2-1: 14-4/15-1/15-2/17-2/19-3 + 13-01）

## Purpose

承接 multi-audit R2 裁决表登记为 successor 的 5 项 flow-designer/graph 域工作（14-4/15-1/15-2/17-2/19-3，原登记 owner 链 453/workbench-shell/G1 均已 completed，无 active 承接）与 13-01（flow-designer tree mode 键盘路径），建立真实 owner 链（本 plan），同 plan 修复已确认缺陷（15-2 NaN fail-closed 缺口、13-01 键盘坐标 NaN、19-3 JSON.parse 静默 null、17-2 graph 事件 type 命名空间），完成 14-4 测试重构与 15-1 变更检测优化裁决。收口后 O-P2-1 与 13-01 两个 roadmap backlog 条目翻转 `[x]`。

## Current Baseline

- **O-P2-1（successor 无 owner 链）**：`docs/audits/multi-audit-r2-verdicts.md:151-185` 将 14-4/15-1/15-2/17-2/19-3 登记为 successor，指向「flow-designer owner plan 链（453 后续 / workbench-shell）与 graph G1 plan 链」，但 `docs/plans/453-dingflow-single-tree-layout-unification-plan.md`、`docs/plans/2026-08-04-2030-1-g1-graph-viewer-plan.md` 均为 `completed`，`docs/backlog/` 仅 3 份 roadmap，无任何 active 载体可见这 5 项。
- **15-2（confirmed defect，live 复核）**：
  - `packages/flow-designer-core/src/core/shell-controls.ts:17-24` `clampShellWidth` 为 `Math.min(Math.max(width, min), max)`，无 `Number.isFinite` 守卫——`Math.max(NaN, min) === NaN`。
  - `packages/flow-designer-renderers/src/designer-action-provider.ts:450` `typeof args.paletteWidth === 'number'` 对 NaN 放行（NaN 是 number）。
  - `packages/flow-designer-renderers/src/designer-command-adapter.ts:256-264` `!== undefined` 继续放行 → `core.setPaletteWidth(NaN)` → `shell-controls.ts:112-120` 幂等守卫恒 false → 每次 dispatch 都 emit NaN。
- **13-01（confirmed defect，live 复核）**：`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:197-203,224-229`——`onKeyDown` Enter/Space 路径把 `KeyboardEvent` `as unknown as React.MouseEvent` 传入 `handleSlotAffordanceClick`，其内部读 `e.clientX/clientY`（KeyboardEvent 恒 undefined）→ `onPlusButtonClick` 收到 `undefined` 坐标 → 菜单 `DOMRect.fromRect({x: undefined})` 定位 NaN。该文件无键盘路径测试。
- **19-3（live 复核）**：`packages/flow-designer-renderers/src/designer-page-body.tsx:193-200` `JSON.parse(core.exportDocument())` catch→null，dialog 打开但内容空，无上报；同文件 `:219` 已有 `reportHostIssue` 且 `:267,:301` 为真实调用点（`:292,:332` 为依赖数组引用；可用性确认）。
- **17-2（live 复核）**：`packages/flux-renderers-graph/src/graph-renderer.tsx:157-165` `fullPayload.type` = 事件字段名（`'onNodeClick'`），非命名空间值（约定 `graph:node-click`）；`docs/components/graph/design.md:166-170` payload 表未含 type 字段；`docs/architecture/renderer-runtime.md:696-697` 要求对象 payload 携带字符串 `type`（事件字段名不构成命名空间 type 值）。
- **14-4（live 复核）**：`packages/flow-designer-renderers/src/canvas-bridge.test.tsx` 588 行，`:1-212` 为 mock/常量/渲染辅助区（约 36%，含 setup 至 ~:230 则约 39%），`:91` `useDesignerSnapshotSelector` mock 固定空快照 `{ doc: { nodes: [], edges: [] } }`；全文件 8 个测试用例。
- **15-1（live 复核）**：`packages/flow-designer-core/src/tree-session-impl.ts:310-311` relayoutTree 对 `{nodes, edges}` 两次全文档 `JSON.stringify` 做变更检测（:310 previous / :311 next / :312 比较）；用户触发路径（非渲染热循环）；同文件已有 `treeVersion.version` 计数（:277,:465 使用）。
- **roadmap backlog 现状**：`docs/backlog/component-audit-roadmap.md` Follow-up Backlog 的 `O-P2-1` 与 `13-01` 两行均为 `[ ]`。

## Goals

- 为 5 项 successor + 13-01 建立真实 owner 链：本 plan 承接并在 `docs/audits/multi-audit-r2-verdicts.md` 终态列与 roadmap O-P2-1/13-01 行回写收口证据。
- 修复 15-2：`clampShellWidth` 加 `Number.isFinite` fail-closed 守卫；action-provider/command-adapter 对 NaN 拒绝（`{ok:false}` 语义），NaN 注入不再污染 shell 状态。
- 修复 13-01：键盘激活路径不再伪装 MouseEvent，菜单定位使用显式坐标（元素中心 `getBoundingClientRect`），键盘与鼠标路径行为一致。
- 修复 19-3：`JSON.parse` 失败走 `reportHostIssue` + 用户可见错误文案，不再静默空内容。
- 修复 17-2：graph schema 事件 payload `type` 命名空间化（`graph:node-click`/`graph:node-double-click`/`graph:selection-change`），与 `normalizeActionEvent` 合成规则对齐，`design.md` payload 表同步。
- 完成 14-4：`canvas-bridge.test.tsx` 提取共享 test-support 与真实 fixture，setup 区压缩。
- 15-1 裁决：若修订计数/浅比较可证明等价则落地优化，否则显式记录为 watch-only residual（非热路径，不阻塞）。

## Non-Goals

- 不重审 flow-designer/graph 域组件全部维度（非 component-audit 113 组件逐卡授权面；本 plan 只承接已登记 successor 项）。
- 不改 graph 注册面、事件名、公共 API 签名（17-2 仅改 payload `type` 值语义，事件键名 `onNodeClick` 等不变）。
- 不处理 backlog 其余开放项：13-02（kanban helpers any）、18-01/18-02（flux-bundle）、O-P2-2（audit-renderer-browser-io 脚本范围）——归后续计划轮次。
- 不重跑 flow-designer/graph 全量 e2e 基线（仅本 plan 触及路径的 focused 验证 + 相关 e2e 回归）。

## Scope

### In Scope

- `packages/flow-designer-core/src/core/shell-controls.ts`、`packages/flow-designer-core/src/core/shell-state.ts`（15-2）
- `packages/flow-designer-renderers/src/designer-action-provider.ts:450`、`designer-command-adapter.ts:256-264`（15-2 拒绝路径）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`（13-01）
- `packages/flow-designer-renderers/src/designer-page-body.tsx:193-200`（19-3）
- `packages/flux-renderers-graph/src/graph-renderer.tsx:157-165` + `graph-definitions.ts` eventContracts（17-2）
- `docs/components/graph/design.md:160-172`（17-2 payload 表同步）
- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`（14-4 测试重构）
- `packages/flow-designer-core/src/tree-session-impl.ts:310-311`（15-1 裁决）
- 台账：`docs/audits/multi-audit-r2-verdicts.md`、`docs/backlog/component-audit-roadmap.md` O-P2-1/13-01 行

### Out Of Scope

- flow-designer/graph 域其他未经 R2 登记的问题（新审计发现归独立 successor）。
- 13-02/18-01/18-02/O-P2-2（roadmap backlog 其余开放项，后续计划轮次）。
- `check:oversized-code-files` 治理债清单（12 文件 pre-existing，登记于 `docs/logs/2026/08-06.md` 0529-1 Phase 2，归独立 successor）。

## Failure Paths

| 场景            | 触发                                                  | 行为（含状态码/错误码）                                                            | 可重试           | 用户可见表现                      |
| --------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------- | --------------------------------- |
| 15-2 NaN 注入   | schema action `setPanelWidths` 传 `paletteWidth: NaN` | action-provider 拒绝：`{ok:false, reason:'invalid-width'}`，不调用 setPaletteWidth | 是（修正后重发） | 面板宽度不变，无 NaN 状态污染     |
| 15-2 拖拽路径   | 正常 pointer 拖拽                                     | 恒有限数，`Number.isFinite` 守卫不拦截，行为不变                                   | —                | 宽度正常更新                      |
| 13-01 键盘激活  | tree mode 空槽位 Enter/Space                          | 以槽位元素中心坐标定位菜单                                                         | 是               | 菜单出现在槽位处，不再 0,0/视口外 |
| 19-3 parse 失败 | `exportDocument()` 输出非法 JSON                      | `reportHostIssue` 上报 + dialog 显示错误文案                                       | 是（修复后重开） | 不再静默空内容                    |
| 17-2 事件消费   | 宿主 action 读 `event.type`                           | `'graph:node-click'`（命名空间），事件键名不变                                     | —                | action 按命名空间 type 过滤生效   |

## Test Strategy

本档选择：`必须自动化`（15-2/13-01/19-3 为已确认 live defect，17-2 为事件 payload 契约变更，均须先写失败测试再实现；Proof 项在 Fix 项之前）。

## Execution Plan

### Phase 1 - Proof：focused 测试先红

Status: completed
Targets: `packages/flow-designer-core/src/__tests__/`、`packages/flow-designer-renderers/src/`、`packages/flux-renderers-graph/src/` 测试文件

- Item Types: `Proof`

- [x] 15-2：`shell-controls`/`shell-state` focused 测试——`clampShellWidth(NaN)` 返回有限兜底或拒绝；`setPaletteWidth(NaN)` 不 emit `paletteWidthChanged`（先红：当前 `Math.max(NaN,min)===NaN` 后 emit）。
- [x] 15-2：action-provider 契约测试——`paletteWidth: NaN` 请求返回 `{ok:false, reason:'invalid-width'}` 且 `setPaletteWidth` 未被调用（先红：当前 `typeof NaN === 'number'` 放行）。
- [x] 13-01：`designer-xyflow-node` 键盘路径测试——空槽位 Enter/Space 触发 `onPlusButtonClick` 且坐标为有限数（先红：当前 KeyboardEvent cast 后 clientX undefined）。
- [x] 19-3：`designer-page-body` parse 失败路径测试——非法 JSON 时 `reportHostIssue` 被调用且 UI 显示错误文案（先红：当前 catch→null 无上报）。
- [x] 17-2：graph 事件契约测试——`onNodeClick`/`onNodeDoubleClick`/`onSelectionChange` 派发 payload `type` 为命名空间值（先红：当前为事件字段名）。

Exit Criteria:

- [x] 5 组 focused 测试全部先红（live 复现断言失败），失败原因与缺陷描述一一对应。
- [x] 测试文件位于各包既有测试目录，`pnpm --filter @nop-chaos/flow-designer-core typecheck` 与 `pnpm --filter @nop-chaos/flow-designer-renderers typecheck`、`pnpm --filter @nop-chaos/flux-renderers-graph typecheck` 通过（新测试可编译）。

### Phase 2 - flow-designer-core 修复（15-2 + 15-1）

Status: completed
Targets: `packages/flow-designer-core/src/core/shell-controls.ts`、`packages/flow-designer-core/src/core/shell-state.ts`、`packages/flow-designer-core/src/tree-session-impl.ts`

- Item Types: `Fix | Decision`

- [x] 15-2：`clampShellWidth` 加 `Number.isFinite(width)` fail-closed 守卫（非有限数 → 返回当前已存宽度兜底，不改变状态、不 emit），`setPaletteWidth`/`setInspectorWidth` 对 NaN 拒绝（守卫后自然不 emit）。
- [x] 15-2：`designer-action-provider.ts:450` 与 `designer-command-adapter.ts:256-264` 的校验升级为 `Number.isFinite`，NaN → `{ok:false, reason:'invalid-width'}` 返回路径（对齐包内既有 `{ok:false}` 错误形状先例）。
- [x] 15-1：`relayoutTree` 变更检测裁决——Phase 2 内新增等价测试（覆盖「变更」与「不变更」两分支，既有 `tree-session.test.ts:361-372` 仅覆盖 no-op 分支），若 `treeVersion.version` 修订计数 + 引用/长度浅比较可证明等价则落地为计数比较；若证明不可等价，`Decision` 记录为 watch-only residual（非热路径，`Why Not Blocking Closure` 写实）。
- [x] 15-2 回归：Phase 1 两组测试转绿。

Exit Criteria:

- [x] `clampShellWidth(NaN)` 不再返回 NaN；`setPaletteWidth(NaN)` 不 emit；action-provider 对 NaN 返回 `{ok:false, reason:'invalid-width'}`。
- [x] 15-1 项有明确落点：要么 `tree-session-impl.ts` 变更检测已优化且等价测试绿，要么 Decision 记录于 `Deferred But Adjudicated`。
- [x] flow-designer-core 包 `pnpm --filter @nop-chaos/flow-designer-core test` 全绿（含既有 core-ui-state/tree-session 测试回归）。

### Phase 3 - flow-designer-renderers 修复（13-01 + 19-3）

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`、`packages/flow-designer-renderers/src/designer-page-body.tsx`

- Item Types: `Fix`

- [x] 13-01：键盘路径拆出显式坐标传递——`onKeyDown` 不再 cast `KeyboardEvent as MouseEvent`；`handleSlotAffordanceClick` 改为接收 `source: 'keyboard' | 'pointer'` 或显式坐标（槽位元素 `getBoundingClientRect` 中心点），菜单定位使用有限坐标。
- [x] 13-01 回归：Phase 1 键盘路径测试转绿；鼠标路径行为不变（既有交互回归）。
- [x] 19-3：`designer-page-body.tsx:193-200` catch 分支改 `reportHostIssue` + 错误文案展示（`jsonOpen` 时显示错误状态而非空内容）。
- [x] 19-3 回归：Phase 1 parse 失败测试转绿；正常路径 `JSON.parse` 成功行为不变。

Exit Criteria:

- [x] 空槽位 Enter/Space 打开菜单定位在槽位处（测试断言坐标为有限数且等于元素中心）。
- [x] `JSON.parse` 失败时 `reportHostIssue` 被调用且 UI 不再静默空内容。
- [x] flow-designer-renderers 包 `pnpm --filter @nop-chaos/flow-designer-renderers test` 全绿（含既有 xyflow/canvas-bridge 测试回归）。

### Phase 4 - graph 事件 type 命名空间（17-2）

Status: completed
Targets: `packages/flux-renderers-graph/src/graph-renderer.tsx`、`packages/flux-renderers-graph/src/graph-definitions.ts`、`docs/components/graph/design.md`

- Item Types: `Fix`

- [x] `fireNodeEvent` payload `type` 改为命名空间值（`graph:node-click`/`graph:node-double-click`/`graph:selection-change`），事件键名（`onNodeClick` 等）与 `props.events[type]` 索引不变。
- [x] 17-2 回归：Phase 1 契约测试转绿；既有 graph 事件消费测试（若有按事件键名索引的断言）保持绿。
- [x] `docs/components/graph/design.md:160-172` payload 表补 `type` 字段说明（命名空间值 + 与 `normalizeActionEvent` 字符串 type 契约的关系）。

Exit Criteria:

- [x] graph 三类事件 payload `type` 均为命名空间值，契约测试绿。
- [x] `design.md` payload 表已含 type 字段且与 live 派发一致。

### Phase 5 - 14-4 测试重构 + 台账收口

Status: completed
Targets: `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`（+ 提取的 test-support）、`docs/audits/multi-audit-r2-verdicts.md`、`docs/backlog/component-audit-roadmap.md`

- Item Types: `Fix`

- [x] 14-4：`canvas-bridge.test.tsx` 提取共享 test-support（mock/渲染辅助区）为独立模块（如 `canvas-bridge-test-support.tsx` 或并入既有 test-utils），`:91` 固定空快照 mock 改为真实 fixture（至少一个非空文档快照用例），setup 区压缩至主文件 40% 以下。
- [x] 14-4 回归：8 个既有用例语义保持（mock 改造后全绿），新增 fixture 用例至少 1 条（非空快照渲染断言）。
- [x] 台账：`multi-audit-r2-verdicts.md` 5 行 successor 终态更新为「fixed + plan 引用（本 plan 路径 + Phase 落点）」；roadmap Follow-up Backlog `O-P2-1` 与 `13-01` 两行翻转 `[x]` 附收口注记。
- [x] daily log `docs/logs/2026/08-07.md` 追加本 plan 收口条目（含 15-1 裁决结果）。

Exit Criteria:

- [x] `canvas-bridge.test.tsx` 主文件 setup 区占比 < 40%（wc + 目视核对），全部用例绿，含 ≥1 条真实 fixture 用例。
- [x] `multi-audit-r2-verdicts.md` 5 项终态已更新（无「registered（无 owner 链）」残留）；roadmap 两行 `[x]`。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02663ed16ffe9kDXLP2qsgAc6W`）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 零 Blocker/零 Major；Minor 已全部处理——(1) 15-1 等价测试归属从 Phase 1 改到 Phase 2（Phase 1 无 relayoutTree 测试，既有 tree-session.test.ts:361-372 仅覆盖 no-op 分支）；(2) clampShellWidth fallback 语义钉死为「返回当前已存宽度、不 emit」；(3) reportHostIssue `:292,:332` 改为依赖数组引用注记；(4) renderer-runtime.md 引用行号修正为 :696-697；(5) canvas-bridge setup 区 36%/39% 双口径注明。

## Closure Gates

- [x] 15-2 NaN fail-closed 已修复（clampShellWidth + action-provider + command-adapter 三处）
- [x] 13-01 键盘路径已修复（不再 cast KeyboardEvent，坐标有限）
- [x] 19-3 JSON.parse 失败已走 reportHostIssue + 错误文案
- [x] 17-2 graph 事件 type 已命名空间化且 design.md 同步
- [x] 14-4 canvas-bridge 测试重构完成（setup < 40% + 真实 fixture 用例）
- [x] 15-1 已落地或已显式裁决（watch-only residual 附理由）
- [x] 台账同步完成（multi-audit-r2-verdicts.md 5 项终态 + roadmap O-P2-1/13-01 `[x]` + daily log）
- [x] 不存在被静默降级到 deferred 的 in-scope confirmed live defect（15-2/13-01/19-3 必须同 plan 修复）
- [x] 受影响的 owner docs 已同步（graph design.md 已更新；flow-designer 无 owner-doc 变更面则核实时注明）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中；flow-designer 相关包如新增大文件需先拆分）

## Deferred But Adjudicated

### 15-1 relayoutTree JSON.stringify 变更检测（Phase 2 已裁决：watch-only residual）

- Classification: `optimization candidate` → **已裁决：watch-only residual（不落地优化）**，落点见 Phase 2 决策记录与 `docs/audits/multi-audit-r2-verdicts.md` 终态。
- **裁决证据（Phase 2 等价测试实证）**：`tree-session-impl.ts:310-311` 变更检测的计数/浅比较替代不可等价——(1) `version` 为 semver 字符串（`normalizeTreeDocumentVersion` 仅归一化），relayout/命令路径均不 bump，修订计数无法检测坐标漂移；(2) 节点坐标嵌套在 node 对象内，引用/长度浅比较必然漏检「changed」分支；(3) 新增双分支等价测试 3 条（`packages/flow-designer-core/src/tree-session.test.ts`「relayoutTree change detection branches (15-1)」：同步对 relayout 不 emit / 失同步对 emit `presentationChanged` 并恢复投影坐标 / version 不变仍 emit 实证计数比较不可等价）。
- Why Not Blocking Closure: 非热路径（用户触发式 relayout，非渲染循环），`JSON.stringify` 语义正确且被既有测试锁定（`tree-session.test.ts:364-376` no-op 分支）；优化失败不影响任何 live contract。
- Successor Required: `no`（等价测试已锁定语义，future 若引入 doc/tree 失同步路径再评估指纹化）。

## Non-Blocking Follow-ups

- flow-designer/graph 域若后续 deep-audit 发现新问题，走独立 successor（本 plan 只承接已登记项）。
- `check:oversized-code-files` 12 文件治理债清单归独立 successor（登记于 `docs/logs/2026/08-06.md` 0529-1 Phase 2）。

## Closure

Status Note: 2026-08-07 完成。5 Phase 全 completed；15-2/13-01/19-3 三个 confirmed defect 同 plan 修复（test-first 先红后绿）；17-2 命名空间化 + design.md 同步；14-4 测试重构达标（setup ~18.5% < 40% + 真实 fixture）；15-1 已裁决 watch-only residual（等价测试实证不可等价）；台账同步完成（verdicts 5 行终态 + roadmap O-P2-1/13-01 `[x]` + daily log）。验证：`pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59 task 全绿（flow-designer-core 180 / flow-designer-renderers 235 / flux-renderers-graph 48）；`pnpm check` 仅 `check:oversized-code-files` 红（12 既有 pre-existing 命名清单零新增），其余 11 项 exit 0。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_0263b5fe1ffeFJPlgUNVKw8TtG`）
- Evidence: 首轮 audit 输出 needs-fixes（1 Major：plan 文件执行态未回写（执行后补勾）；3 Minor：Deferred 段未显式化、verdicts 裁决总表 5 行终态列仍 registered、行数口径 227）；修复后复检 approved。live 复核全部通过：15-2 三处 fail-closed（shell-controls.ts:22-24 / command-adapter.ts:256-262 / action-provider.ts:157-167）、13-01 无 KeyboardEvent cast（designer-xyflow-node.tsx:205-216,237-241）、19-3 reportHostIssue + error slot（designer-page-body.tsx:193-207,240-255,552-558）、17-2 payload type 命名空间（graph-renderer.tsx:39-42,169）、15-1 等价测试 3 条、14-4 setup ~18.5%、台账无「registered（无 owner 链）」残留；typecheck 32/32 复跑绿。

Follow-up:

- （无 confirmed live defect 残留）`check:oversized-code-files` 12 文件治理债清单归独立 successor（登记于 `docs/logs/2026/08-06.md` 0529-1 Phase 2），与本 plan 无关。
