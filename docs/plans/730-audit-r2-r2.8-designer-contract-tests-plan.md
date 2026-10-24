# 730 审计修复 R2·R2.8：契约补测—designer 族（P1-MA4.4-001/002/003/004）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.8（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-2001-arm2-MA4.4-designer-office-tests.md` §P1-MA4.4-001/002/003/004（各含最小补强规格；003 前置裁决「补实现 or 降 doc」）；owner doc `docs/architecture/flow-designer/design.md`（§3.4 readonly、§8 六步校验、canvas-adapters.md:139-153）
> Related: 先例 plan 723-729（同构契约补测链）；003 与 MA4.2 B-06 doc↔impl↔test 三方错位同族第三例
> 编号 runway：729 为 R2.7（本线）；730 本 plan；ARC 线从 731 起避开

## Purpose

四条 designer 族契约补测：001 flow readonly 全链（~20 入口守卫零拒绝方向执行）；002 xyflow remove→delete 翻译（canvas-adapters 明文回归面实际为空）；003 端口连接六步校验 **doc↔impl↔test 三层脱节**（impl 仅 3 条、PortConfig.roles/direction/maxConnections 零消费——最小补强前置裁决「补实现 or 降 doc」）；004 page-designer transient 意图与命令通道分离负面证明（hover 改坏为 dispatch 时全绿）。四 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `ecce01625` 实测）

- **001**：`packages/flow-designer-core/src/core.ts:130-136` assertReadonly（isReadonly→emit lifecycleHookError+true）；守卫入口 :306 undo/:330 redo/:353 copySelection/:362 pasteClipboard/:433 replaceDocumentFromHost；`options.readonly ?? false`（:90）。`grep "readonly: true"` 两包测试 0 命中。工厂 `createDesignerCore(initialDoc, config, options?)`（:59）。
- **002**：`packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts`——handleNodesChange :71-76 remove→onDeleteNode(change.id)、handleEdgesChange :99-103 remove→onDeleteEdge；`grep "type: 'remove'"` renderers 49 测试 0 命中；该 hook 无既有测试文件（renderHook 直驱可行——全参数回调注入）。
- **003**：`packages/flow-designer-core/src/core/constraints.ts:62-88` validateEdgeConnection 实现 3 条（EDGE_MISSING_NODE_ERROR/EDGE_SELF_LOOP_ERROR/EDGE_DUPLICATE_ERROR）；design.md §8 承诺六步；PortConfig.roles/direction/maxConnections（types.ts:147-160）非测试代码零消费。
- **004**：`packages/page-designer-renderers/src/page-designer-page.tsx`——hover/dragover 走 `setHoverNodeId/setDropHint` React state（:125-128 clearTransient），非命令通道；命令通道 = session.dispatch（updateProps transient 包 beginTransaction 事务收口 1 条 undo 步）；undo 按钮 `disabled={!state.canUndo}`（:396）为 undoDepth 外部可观面。22 测试 grep undoDepth 0 命中。
- roadmap R2.8 行 `todo`（:105）；arm2-index :155/:156/:157/:158（001-004）状态 `open`、修复列 R2.8。

## Goals

- 四条契约测试落地（flow-core unit 1 + flow-renderers hook unit 1 + flow-core constraints unit 1 + page-designer integration 1），各带红证。
- 003 前置裁决落地：**降 doc**（design.md §8 六步承诺收窄至实现 3 步 + 六步未实现项显式登记为候选）+ 判别测试钉实现 3 条。
- 四 finding 回填 `closed`；roadmap R2.8 翻转。

## Non-Goals

- 不补 003 未实现的 3 步校验（roles/direction/maxConnections 语义未定义，补实现需设计决策——登记候选留人审/MV）；不处理 MA4.4 其余 finding（R2.9 独立行）；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flow-designer-core/src/core-readonly.test.ts`（新建，001）
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.test.tsx`（新建，002）
- `packages/flow-designer-core/src/core/constraints.test.ts`（新建或扩展，003 判别测试）
- `docs/architecture/flow-designer/design.md`（003 裁决：§8 六步承诺降级为实现 3 步 + 未实现步显式登记）
- `packages/page-designer-renderers/src/page-designer-transient-channel.test.tsx`（新建，004）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.8 翻转（激活/收口两提交）

### Out Of Scope

- 003 未实现 3 步的补实现；R2.9-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号       | 触发                                                              | 行为                                            | 可重试 | 用户可见表现         |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------- | ------ | -------------------- |
| api-shape          | 集成/hook API 形状与规格不符                                      | 以既有同类测试先例校正规格，plan 补记           | 是     | 不适用（测试行为面） |
| adjudication-block | 003 降 doc 裁决执行时发现 §8 六步有其他消费面（代码引用六步语义） | 停：升级裁决（改判补实现路线需人审），plan 记录 | 否     | 不适用               |
| flake              | 004 hover 序列在 jsdom 下不稳定                                   | 确定性 fireEvent 序列 + canUndo 直断言          | 是     | 不适用               |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异：001 删 undo 入口 assertReadonly 守卫 → 拒绝断言红；002 删 remove 翻译分支 → onDeleteNode 断言红；003 删 validateEdgeConnection 既有 3 分支之一 → 对应拒绝断言红；004 将 hover 处理改坏为 session.dispatch（审计原文改坏方向）→ undoDepth/canUndo 断言红。判别机制（Rule 13）：各变异即旧实现缺陷面本体。

## Execution Plan

### Phase 1 - 四测试落地（各先红后绿）

Status: completed
Targets: 四测试文件 + design.md

- Item Types: `Fix | Proof`

- [x] T1（001，core-readonly.test.ts）：`createDesignerCore(doc, config, { readonly: true })` → 驱动 undo/redo/copySelection/pasteClipboard/replaceDocumentFromHost → 各自被拒（lifecycleHookError 事件载荷 **hook** 字段断言——review R1 m1：载荷无 method 字段 + 文档/状态不变；**对照组**（落地实态，closure m1 对账）：空历史非 readonly core 断言 lifecycleHookError 缺席——seeded history 变体未实现，判别力不受影响）。红证：**M-A** 删 ：306 undo 的 assertReadonly 守卫 → undo 拒绝断言红。
- [x] T2（002，use-xyflow-interactions.test.tsx，renderHook 全参注入）：handleNodesChange([{type:'remove', id:'n1'}]) → onDeleteNode('n1', undefined) 恰一次；handleEdgesChange([{type:'remove', id:'e1'}]) → onDeleteEdge 同构。红证：**M-B** 删 remove 分支 → 断言红。
- [x] T3（003，constraints 测试 + design.md §8 降级）：裁决=降 doc（Deferred 节详述；§8 编辑=checklist 替换为三项已实现检查 EDGE*MISSING_NODE_ERROR/EDGE_SELF_LOOP_ERROR/EDGE_DUPLICATE_ERROR〔含 rules.allowSelfLoop/allowMultiEdge 门，defaults config.ts:54-55〕——review R1 m2：missing-node 非六步之一、self/multi 同属第 5 步内；候选登记留 plan/roadmap 不入 architecture doc，Minimum Rule 14 现状原则）→ 判别测试钉实现 3 条：missing node / self-loop（allowSelfLoop false）/ duplicate（allowMultiEdge false）各自断言拒绝（toBeDefined——closure m2 注记：未断言具体 EDGE*\*\_ERROR 常量，分支级判别成立；常量级断言留增强）。红证：**M-C** 删 self-loop 分支 → 对应断言红。
- [x] T4（004，page-designer-transient-channel.test.tsx）：沿既有 page-designer harness 渲染 → hover/dragover/dragleave 风暴（多条跨节点序列）→ 断言 undo 按钮 `disabled` 保持（canUndo false/undoDepth 0）→ 控制组：真实命令（如 inspector updateProps commit 或 insertNode）后按钮 enabling（canUndo 翻真——证断言面 live 非空转）。红证：**M-D** hover 处理改坏为 session.dispatch updateProps **并带 commit 收口**（review R1 m3：transient-only 事务延后 undo 记录，须含 commit 或改结构命令保证 canUndo 翻真）→ hover 风暴后 canUndo 翻真 → 红。

Exit Criteria:

- [x] 四测试绿证 + 四红证留痕：**M-A** 红 1（undo 拒绝断言）/ **M-B** 红 1（node remove 翻译）/ **M-C** 红 1（self-loop 分支）/ **M-D** 红 1（hover 风暴后 canUndo 翻真）——变异均复员，实现文件 diff 空（design.md §8 裁决编辑为唯一非测试 diff）。〔执行注记二则：①T4 风暴经 elementsFromPoint stub 命中节点语义（canvas-bridge hit-test），初版风暴未触发 hover 故 M-D 首跑未翻红——stub 后 M-D 红 1 判别成立；②control 腿用 palette 插入（S3/S4 惯用法）证断言面 live〕
- [x] 三包套件全绿：flow-designer-core 16 文件/220 用例、flow-designer-renderers 51 文件/314 用例、page-designer-renderers 24 文件/181 用例

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 四行回填：:155（001）/:156（002）/:157（003）/:158（004）→ `closed` + 注记（003 附裁决结论）；Last Updated 滚动（open 45→41）
- [x] roadmap R2.8 `planned`→`done` 翻转（IN closure commit；激活提交 20301b001 已先行翻转）

Exit Criteria:

- [x] arm2-index 四行状态与注记实测一致（open 45→41 grep 复核）；roadmap R2.8 行 `done`（收口提交内）
- [x] daily log R2.8 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82（lint 修 2 处测试未用导入/助手）
- [x] `pnpm check` 零失败全链绿
- [x] 四红证全部复员（core.ts / use-xyflow-interactions.ts / constraints.ts / page-designer-page.tsx git diff HEAD 空；design.md §8 裁决编辑除外）
- [x] 独立 closure audit（fresh sub-agent `agent_69dc26d5`，输入=plan+diff summary+验证输出）：**approved** 0B/0M/3m（m1 T1 对照组文本对账、m2 T3 常量级断言增强注记、m3 design.md 候选指针修正——均随收口提交）——checklist 1-8 全 PASS，auditor 独立重演 M-A/M-C（红 1 各自精确）+ 复员 diff 空 + open 41 程序化验证
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **003 六步校验裁决：降 doc**（审计前置裁决「补实现 or 降 doc」）：impl 仅 3 条（missing-node/self-loop/duplicate），PortConfig.roles/direction/maxConnections 零消费且语义未定义——补实现需设计决策（角色/方向/上限的产品语义），超出补测行授权（contract-gap Failure Path：不静默改实现）。裁决：design.md §8 收窄至实现 3 步 + 未实现 3 步显式登记为候选（MV/人审输入）；判别测试钉实现面。Classification: watch-only residual。Why Not Blocking Closure: doc↔impl 对齐即审计最小补强的裁决面。Successor Required: 候选登记（非本 plan 新设行，留 MV/人审）。
- **004 transient 语义边界**：updateProps transient 走事务批量（1 条 undo 步）是设计语义（S1 §8.3）而非缺陷——004 钉的是 HOVER/DRAGOVER 纯 UI 态不进命令通道，与 inspector transient 事务批量并存。Classification: watch-only residual。Why Not Blocking Closure: 两通道语义正交。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_e05b6291，2026-10-24）：**PASS** 0B/0M/4m——T1 可行性（GraphDocument/DesignerConfig 最小构造、subscribe 事件观、M-A 判别链 :306→空历史早退无 lifecycleHookError）；T2 renderHook 纯回调无 react-flow 上下文依赖；T3 降 doc 裁决 sound（§8 :275-293 自包含、无其他消费面、constraints.test.ts 不存在=新建）；T4 harness 先例（s3-s4 无 props 渲染、branch-fill-2:107 undo disabled 断言、interactions:91-97 dragover、canvas-bridge 50ms 节流、M-D 经 applyUpdateProps→ctx.core.update 可行）。m1 hook 字段+对照组、m2 行号+§8 编辑精确化+候选不入 architecture、m3 M-D 配方。随激活落。

## Non-Blocking Follow-ups

- 003 未实现 3 步校验候选（roles/direction/maxConnections）——登记 MV/人审输入。

## Closure

- [x] R1 共识（PASS pass-with-minors，m1-m3 随激活落）后激活提交（Status→`active` + roadmap R2.8 `todo`→`planned` IN commit `20301b001`）
- [x] 执行 Phase 1/2 → Closure Gates 全过 → closure audit **approved**（`agent_69dc26d5`，0B/0M/3m）→ 收口提交（Status→`completed`、flip `done` IN commit）
- [x] Closure audit 记录：M-A/M-C 独立重演红 1 各自精确 + 四源文件复员 diff 空 + open 41 程序化验证 + §8 编辑与 constraints.ts 实现逐字一致（grep 六步仅裁决注记自指）；m1 对照组文本对账/m2 常量级断言留增强/m3 候选指针改指 plan+arm2-index（roadmap 无候选行——指针修正随收口提交）。
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
