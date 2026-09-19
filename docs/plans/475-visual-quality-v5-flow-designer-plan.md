# 475 视觉质量 V5：Flow Designer 交互补齐与主题化 Plan

> Plan Status: active
> Last Reviewed: 2026-09-20
> Source: `docs/analysis/visual-quality/V5-flow-designer.md`（已独立核实，2 Major + 8 Minor 修订后零 Blocker/Major）、`docs/backlog/visual-quality-roadmap.md` V5、`docs/architecture/flow-designer/design.md`
> Related: `docs/plans/471-visual-quality-v1-theme-darkmode-foundation-plan.md`（V1 dark 触发器契约）、`docs/plans/474-visual-quality-v4-scada-visuals-plan.md`（并行在途，industrial 域零交集）

## Purpose

把路线图 V5 收口：框选 + 多选 + 多节点剪贴板（选择体系补齐）、拖拽对齐辅助线（最小实现）、节点实测尺寸（假值持续冲掉机制修复）、钉钉系 hex 与玻璃拟态令牌化 + dark 变体（激活 `--fd-*` 死令牌面）、树模式常量单源、FDC-GAP 直测补齐、bugs/12 换形态风险显式裁决。

## Current Baseline

- master @ d0fdfa088 + plan 474（V4/industrial）工作区在途改动（零交集）。
- 选择体系：`selectionOnDrag|onSelectionDrag` 两包 0 命中；`multiSelect:false`（`config.ts:36`）为**死开关**（两包无消费方）；`use-xyflow-interactions.ts:165-193` 只上报 `selection.nodes[0].id`（且鼠标 event 被丢弃 ：175/:184）；剪贴板单节点——真实路径 `core/shell-controls.ts:42-51`（copy）/`:53-72`（paste +48 偏移）+ `core/shell-state.ts:11` `clipboard: GraphNode | null`，`core.ts:357/:366` 调用；**`core-shell-commands.ts` 是死代码**（无生产消费方，`vitest.config.ts:6-8` 明注排除覆盖率）。选择回写坍缩点：`xyflow-utils.ts:75`（节点 `selected` 只映射单 `activeNodeId`）/:112（边 `activeEdgeId`）+ sync 整体替换——多选活不过一个 sync 周期。单选写入竞争：`designer-canvas.tsx:203-209/:211-217` `onNodeClick/onEdgeClick` 无条件 dispatch 单选。底座多选就绪：`selectedNodeIds: string[]` + `selection-controller.ts:46-57` + `core.ts:607-608` 公共 API；多删除已单事务（`designer-command-adapter.ts:58-74` `beginTransaction('delete-selection')` 先例）。graph 包「先例」实为关闭态（`xyflow-canvas.tsx:110-112`），只可参照接线方式。
- 辅助线：对齐/分布辅助线零实现；`snapToGrid` 网格吸附在（`config.ts:53` + `designer-xyflow-canvas.tsx:296-297`）。
- 边中点：`designer-xyflow-edge.tsx`（188 行）无 midpoint 实现，边工具条仅选择/删除。
- 节点假尺寸：`xyflow-utils.ts:70` 预填 `measured`（回退链终值 220×80，bugs/11 演化）；`use-xyflow-sync.ts:6-12` 快照整体替换**持续冲掉**实测值；树分支（:62-71）不设 `measured`（error#015 残留风险）。
- 令牌/dark：`designer-theme.css`（62 行）7 处玻璃拟态 rgba 白、无 dark 选择器；两包 25 处 `var(--fd-*, fallback)`（24 消费 + 1 测试断言，5 处 fallback 已语义值）而 `--fd-*` **全仓无定义点**（死令牌面）；`designer-node-appearance.ts:23-40` 钉钉系 accent hex 6 消费点；`ding-flow-edge.tsx:100` `bg-white border-[#15bc83] text-[#15bc83]`；MiniMap 四色（canvas:368-379）；`--xy-*` 库变量零覆盖；`designer-theme.test.ts:7-12` 锁死现行 fallback 契约；**`theme-compatibility.md:91-103` 现行契约含直接禁令（:103「package defaults do not re-publish those tokens on `.fd-theme-root` or `.nop-designer`」、:97 防遮蔽祖先覆盖）——A5 激活令牌面 = 显式契约变更，修订范围须覆盖 :97/:103 并重述宿主覆盖新方式**。宿主侧 `flow-designer-nodes.css`（219 行浅色 hex）+ `styles-theme-utilities.css:78-100`。
- 树模式：core `tree-projection.ts:37-42` 与 renderers `dingflow-constants.ts:4-9` 常量双份手工同步；交互边界 §17.7 非目标在案。
- 审计：`selectAllNodes/copySelection/pasteClipboard` 零直测（`core.test.ts` 13 it 无一调用；adapter 6 直测无 selection）；间接覆盖 3 处在。
- e2e：flow 族 12 spec（dingtalk-visual 6 test 把 hex 钉进 computed style 断言 ：81-98）；`toHaveScreenshot` 0 命中；ui.spec 2 个深度视觉用例 skip。
- 门禁：`find-ui-consistency-gaps.mjs` 扫描集仅 `packages/flux-renderers-*/`（:290）——**flow 两包不在扫描集**，「新值走令牌」无自动门禁，须单测承接。

## Goals

- 框选 + 多选默认可用：`selectionOnDrag`/`multiSelectionKeyCode` 接线、全量上报、多节点剪贴板（copy/paste N 节点按序偏移）。
- 拖拽对齐辅助线（最小实现）：兄弟节点边/中点候选线 + 阈值吸附 + ViewportPortal 渲染。
- 实测 `measured` 不再被冲掉：sync 合并保全 + 树分支预填，bugs/11 语义收敛为「预填估计 + 实测保全」。
- 令牌化 + dark：`--fd-*` 死令牌面激活（作用域化定义 + dark 块）、玻璃拟态/`bg-white`/MiniMap/`--xy-*` 最小集令牌化、宿主两 css 同令牌化。
- 树模式几何常量单源（core 导出、renderers 消费）。
- FDC-GAP-04 直测补齐（多节点语义）。
- 边中点插入显式否决落卡、bugs/12 换形态裁决落 design.md 契约段。

## Non-Goals

- 分布辅助线、边中点插入（A3 否决，登记 flow-designer roadmap 候选）。
- 树模式折叠展开/自由连线/重连（design.md §17.7 非目标维持）。
- `proOptions hideAttribution` 处置（授权合规事项，登记待人工确认，V5 不动）。
- 悬停定时器调参、魔法数字治理（watch-only）。
- flux-renderers-graph 包任何改动（只读参照）。
- 扩展 `find-ui-consistency-gaps.mjs` 扫描范围（独立事项提案，不入本 plan）。

## Scope

### In Scope

- `packages/flow-designer-core/src`：`core/shell-state.ts`（clipboard 状态形状）、`core/shell-controls.ts`（copy/paste 数组化）、`core.ts`、树常量导出、`multiSelect` 转真消费（types + config 默认值）、`core-shell-commands.ts` 删除（死代码裁决）。
- `packages/flow-designer-renderers/src`：`designer-xyflow-canvas`（selection props/全量上报/辅助线层/MiniMap/`--xy-*`）、`use-xyflow-sync.ts`（measured 保全）、`xyflow-utils.ts`（树分支预填）、`designer-theme.css`（`--fd-*` 定义 + dark 块）、`designer-node-appearance.ts`（accent 走令牌）、`ding-flow-edge.tsx`、`dingflow-constants.ts`（re-import）、`flow-designer-core` 消费点同步。
- `apps/playground/src`：`flow-designer-nodes.css`、`styles-theme-utilities.css` 令牌化（demo dark 可验证最小面）。
- 测试：`flow-designer-core` 直测（剪贴板/全选多节点语义）、`designer-theme.test.ts` 契约改写 + 无裸 hex 断言、bugs/11 回归测试；`tests/e2e/flow-designer-*.spec.ts`（框选几何/多选/辅助线/dark 计算样式；dingtalk-visual hex 合同核对同步）。
- Owner docs：`docs/architecture/flow-designer/design.md`（§17.7 边界核对注记 + 宿主扫描契约段）、`docs/architecture/theme-compatibility.md`（:91-103 fallback 契约段修订：:97/:103 改述与新覆盖契约）、证据卡 `flow-designer.md`（F1-F6 + C1-C7 裁决回写）、`docs/analysis/2026-07-27-ma43-*/01-flow-designer-contracts.md`（FDC-GAP-04「never invoked」过时表述勘误）、roadmap/daily log。

### Out Of Scope

- graph 包、industrial 域（V4 在途）、theme-tokens 包新增令牌、ui 包公共导出、`docs/bugs/11`/`12` 原文改写（修复记录经 plan 引用登记，不重写历史 bug 文档）。

## Failure Paths

| 场景                | 触发                           | 行为                                                                                                                                                                                                                                       | 可重试 | 用户可见表现                     |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------- |
| box-select-vs-pan   | 空白区拖动                     | **钉死配方**：`selectionOnDrag` + `panOnDrag={[1, 2]}`（中键/右键平移）、`selectionKeyCode` 默认 Shift；默认拖动=框选                                                                                                                      | 否     | 框选矩形出现                     |
| multi-select-write  | ctrl/meta 点击节点             | **单一写入方**：`handleSelectionChange` 全量上报为唯一选择写入口；`onNodeClick/onEdgeClick` 单选 dispatch 在修饰键激活时抑制（mouse event 穿透到交互层）；`lastSelectionRef` 退役（全量上报后无去重职责）                                  | 否     | ctrl 点击累加选择，不坍缩        |
| multi-paste-overlap | 多节点粘贴                     | 按选择序 `+48*i` 阶梯偏移，id 重生成；**`beginTransaction` 包裹=一次 undo**（沿 delete-selection 先例）                                                                                                                                    | 否     | 粘贴 N 个错位副本，单次撤销      |
| measure-preserve    | 快照同步期间用户拖拽           | merge 保全 `measured`/`position`/`dragging`/选择旗标，文档态不承载 DOM 值                                                                                                                                                                  | 否     | 拖拽无尺寸跳变、多选不坍缩       |
| guide-threshold     | 拖拽靠近兄弟节点边/中点 6px 内 | 吸附并对齐线高亮；离开即消失；网格吸附共存（对齐线优先）                                                                                                                                                                                   | 否     | 参考线闪现                       |
| token-dark          | `[data-mode='dark']` 切换      | `--fd-*` 于 `.nop-designer` 作用域定义（**显式契约变更**：原 :103 禁令解除、:97 防遮蔽条款改述）——宿主覆盖 `--fd-*` 须命中 `.nop-designer` 内层或更高优先级选择器；dark 块与宿主覆盖按源序+特异性层叠（dark 块声明在后、宿主内层覆盖优先） | 否     | 画布暗色可读，宿主可按新契约覆盖 |
| tree-constant-drift | 树布局常量改动                 | 单源导出后 core/renderers 自动同值（单测断言同源性）                                                                                                                                                                                       | 否     | overlay 不再错位                 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——选择体系/剪贴板是用户可感知交互行为变更 + 公共 API 语义升级；令牌化/dark 是样式契约变更（V0 helper L3 计算样式断言）。Proof 先行（多节点剪贴板直测先红）。

## Execution Plan

### Phase 1 - 选择体系：框选 + 多选 + 多节点剪贴板

Status: in progress
Targets: `flow-designer-core/src/core/shell-controls.ts`、`core/shell-state.ts`（clipboard 状态形状）、`core.ts`、`core-shell-commands.ts`（死代码裁决）、`flow-designer-renderers/src/designer-xyflow-canvas`、`use-xyflow-interactions.ts`、`xyflow-utils.ts`（selected 映射）、core 直测

- Item Types: `Proof | Fix | Decision`

- [x] Proof：core 直测先红——①`selectAllNodes` 后 `selectedNodeIds` 为全量；②多选态 `copySelection` → `pasteClipboard` 产出 N 节点（id 重生成 + 簇保形 +48 偏移 + **`beginTransaction` 单次 undo 粒度断言**，沿 `delete-selection` 先例）；③空选/单选回归路径；④树模式 paste 拒绝路径保持（clipboard-selection.test.ts 7 用例：多选粘贴先红——单节点剪贴板仅产出 1 节点——后绿 7/7）
- [x] Fix：剪贴板多节点——`shell-state.ts` `clipboard: GraphNode | null` → 数组形态；`shell-controls.ts` copy/paste 数组化（簇保形偏移：每节点各自 +48,+48，保持相对几何——修正 plan 初稿的 `+48*i` 阶梯措辞，阶梯会扭曲簇形状）；`core.ts` 传全量 + `beginTransaction('paste-selection')`/`commitTransaction` 单次 undo。**Decision：死文件 `core-shell-commands.ts` 已删除**（无生产消费方、vitest.config 排除注释在案；vitest.config.ts 注释同步清理）
- [x] Fix：**选择回写全量化**（防 sync 坍缩，review M-2）：`xyflow-utils.ts` `selected` 改由全量 `selectedNodeIds`/`selectedEdgeIds` Set 映射；Proof「多选经快照同步不坍缩」断言随 clipboard-selection 用例覆盖（selection 状态经 sync 重映射后保持）
- [x] Fix：renderers 接线——`selectionOnDrag` + `panOnDrag={[1,2]}`（pannable 门控）+ `multiSelectionKeyCode`（feature 关闭时显式 null）；`handleSelectionChange` 全量上报为**唯一选择写入口**：`onNodeClick/onEdgeClick` 修饰键抑制、`lastSelectionRef` 退役（review M-3）。**执行期发现并修复：hadSelectionRef 转换守卫承重**——RF 在每次 store nodes 更新后重发空 selection 事件（新节点对象身份），无「有→无」转换守卫的 onPaneClick 会形成 setNodes→空事件→dispatch 无限风暴（tree-history 测试以 Maximum update depth 暴露）；另在 handleSelectionReport 入口加内容等价守卫防相同选择回写
- [x] Fix：`multiSelect` 死开关**转真消费**（review m-3）：默认值翻 `true`（config.ts），`features.multiSelect` 驱动画布接线；designer-canvas 新增 `handleSelectionReport`（dispatch setSelection 命令）+ `features` 传递；delete/undo 多选作用面核对（多删除已单事务在案）
- [x] Fix：树模式适用面钉死（review m-4）：框选/多选仅 graph 模式行为差异经 RF props 门控；paste 拒绝维持（直测覆盖）；tree deleteSelection 多节点已就绪

Exit Criteria:

- [ ] core 直测先红后绿有记录（含 undo 粒度与 sync 不坍缩断言）；flow-designer-core 包既有测试零回归
- [ ] 死文件 `core-shell-commands.ts` 删除后无残留引用（grep 证）；e2e：框选矩形几何（L2）+ ctrl 点击多选不坍缩 + 多选后批量 delete 断言（新用例，断言代码本 Phase 落、跑绿后置 Phase 4）

### Phase 2 - 画布交互：对齐辅助线 + 实测尺寸

Status: in progress
Targets: `designer-xyflow-canvas`（辅助线层）、`use-xyflow-sync.ts`、`xyflow-utils.ts`、bugs/11 回归测试

- Item Types: `Proof | Fix`

- [x] Proof：单测先红——①`mergeSnapshotNode` 合并后 `measured` 保全（构造带实测值的 RF 节点经 sync 不丢，use-xyflow-sync.test 先红后绿）；②树分支预填 `measured` 存在（xyflow-utils.test）
- [x] Fix：`use-xyflow-sync.ts` merge 保全 `measured`（local 节点层，core 文档态不承载 DOM 值）；`xyflow-utils.ts` 树分支补预填（`resolveNodeSize` 同链）
- [ ] Fix：对齐辅助线最小实现——拖拽期兄弟节点 left/center/right × top/middle/bottom 候选线、6px 阈值吸附、ViewportPortal 渲染 1px 参考线（包内在库先例 canvas:106-128）；`snapToGrid` 共存（对齐线优先）
- [ ] Fix：bugs/11 回归测试（拖拽初始化无 error#015：预填 + 保全双路径断言补齐拖拽语义面）

Exit Criteria:

- [ ] 单测先红后绿；`use-xyflow-sync` 既有测试零回归
- [ ] e2e：拖拽节点贴近兄弟节点时辅助线可见断言（L1/L4；后置 Phase 4 统一跑绿）

### Phase 3 - 令牌化 + dark + 常量单源

Status: planned
Targets: `designer-theme.css`、`designer-theme.test.ts`、`designer-node-appearance.ts`、`ding-flow-edge.tsx`、`designer-xyflow-canvas.tsx`（MiniMap/--xy-\*）、`dingflow-constants.ts`/`tree-projection.ts`、`designer-inspector/palette/canvas` 消费点、宿主两 css

- Item Types: `Proof | Fix`

- [ ] Proof：`designer-theme.test.ts` 先红——新契约（`--fd-*` 作用域化定义存在 + `[data-mode='dark']` 块重声明 + 消费点无新增裸 hex/rgba 断言）
- [ ] Fix：`designer-theme.css` 定义 `--fd-*` 族（`.nop-designer` 祖先块接 theme-tokens 语义值 + `[data-mode='dark']` 后代块；`--fd-node-accent-*` light/dark 双值）；玻璃拟态 7 处 → `--surface-*`
- [ ] Fix：消费点迁移——accent 6 点、`ding-flow-edge.tsx:100` 三类、MiniMap 四色、`--xy-*` dark 最小集（Controls/选框/选中色）
- [ ] Fix：树常量单源（core 导出、`dingflow-constants.ts` re-import + 同源单测）；宿主 `flow-designer-nodes.css`/`styles-theme-utilities.css` 同令牌化（fallback 保宿主覆盖优先级）
- [ ] Fix：`theme-compatibility.md` 契约段同步修订——**范围 :91-103 全段**（含 :97 防遮蔽条款改述、:103 「不在 `.nop-designer` 再发布」禁令的显式解除与新宿主覆盖方式重述：命中 `.nop-designer` 内层或更高优先级 + dark 块层叠关系）；dingtalk-visual spec hex 合同核对/同步改写

Exit Criteria:

- [ ] 单测先红后绿（新契约测试 + 同源单测）；两包既有测试零回归（锁死值断言同步后）
- [ ] e2e：dark 模式计算样式断言（L3，V0 helper：切 dark 后画布面/节点 accent 解析值变化）；dingtalk-visual 全绿

### Phase 4 - FDC-GAP 收尾 + docs 落卡 + 全量验证

Status: planned
Targets: core 直测收尾、证据卡 flow-designer.md、design.md、ma43 审计文档、roadmap、daily log

- Item Types: `Proof | Decision | Fix`

- [ ] Proof：flow 族既有 e2e 全量回归（dingtalk-visual 同步后全绿）；新增 Phase 1-3 e2e 用例统一跑绿（框选/多选 delete/辅助线/dark）
- [ ] Decision：A3 边中点插入否决 + C3 hideAttribution 待人工确认，双双落证据卡（含理由与去向）
- [ ] Fix：证据卡 flow-designer.md 全量回写（F1-F6 + C1-C7 三态裁定）；design.md 补宿主扫描契约段（A8）+ §17.7 核对注记；ma43 文档「never invoked」勘误；roadmap V5 行、`Last Updated`、daily log
- [ ] Fix：全仓验证链（typecheck/build/lint/test/check——flow 两包零新 hit 核对）

Exit Criteria:

- [ ] flow 族 e2e 全绿（含改写后 dingtalk-visual）；全仓验证链绿
- [ ] 证据卡无 pending 裁决残留；owner docs 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-20，一轮）
- Verdict: `revised`（0 Blocker / 4 Major / 5 Minor；审查员明示按最小修订清单修订后可达 `active`）
- Rounds: 1
- Findings addressed: M-1——剪贴板落点勘误（`core-shell-commands.ts` 系死代码、真实路径 `shell-controls.ts`/`shell-state.ts`/`core.ts:357`）+ 死文件显式裁决（删除）；M-2——多选 sync 坍缩缺口补齐（`xyflow-utils.ts:75/:112` selected 全量映射 + merge 保全 + Proof 断言）；M-3——selection 单一写入方钉死（handleSelectionChange 唯一写入口、onNodeClick/onEdgeClick 修饰键抑制、event 穿透、lastSelectionRef 退役）；M-4——token-dark 契约重述（`.nop-designer` 定义与 :103 禁令的冲突如实化、宿主覆盖新方式、theme-compatibility.md 修订范围扩至 :91-103）。Minor 1-5 全部吸收：beginTransaction 单次 undo 断言、框选/平移键位配方钉死（panOnDrag=[1,2]）、multiSelect 钉「转真消费」、树模式适用面钉死、Failure Paths 可重列补「否」。

## Closure Gates

- [ ] 全部 in-scope 交付落地（Phase 1–4 Exit Criteria 全勾）
- [ ] in-scope contract drift 已收敛：multiSelect 死开关、剪贴板单节点、假 measured 持续冲掉、`--fd-*` 死令牌面、树常量双份
- [ ] A3/C3 显式裁决落卡（非静默 deferred）；C4/C6 watch-only 有据
- [ ] 行为/契约结果已达成：框选/多选/多节点粘贴、辅助线、dark 画布在 e2e 成立
- [ ] 必要 focused verification 已完成（core 直测先红后绿 + theme 契约测试 + flow 族 e2e 全量）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（A3/A8 为显式裁决，C3 待人工确认事项已登记）
- [ ] 受影响 owner docs 已同步：design.md、theme-compatibility.md、ma43 勘误、证据卡、roadmap、daily log
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新 hit）

## Deferred But Adjudicated

### 边中点插入（A3）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 与树模式 §17.7 非目标（禁自由连线/重连）冲突；graph 模式插入需 core 复合命令原语（删边+双连线+落位事务），超视觉修复域；既有边工具条可承载后续迭代
- Successor Required: `no`（登记 flow-designer roadmap 候选）

### bugs/12 shim 换形态风险（A8）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 机制性根因（schema utility 类依赖宿主扫描面）属设计器-宿主契约，当前恰被宿主 v4 自动扫描覆盖（无失效实例）；dev warn 属行为变更；交付=design.md 契约段 + 证据卡登记
- Successor Required: `no`（宿主契约随 design.md 段落常驻）

### xyflow hideAttribution 授权合规（C3）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 授权合规事项非视觉修复，需人工确认订阅/许可状态后方可处置（两处在案：designer-xyflow-canvas.tsx:314、graph xyflow-canvas.tsx:120）
- Successor Required: `yes`
- Successor Path: 人工确认后独立处置（移除或合规）

## Non-Blocking Follow-ups

- 分布辅助线、悬停定时器手感调参（C4）、魔法数字治理（C6）：watch-only。
- `find-ui-consistency-gaps.mjs` 扫描范围扩展提案（覆盖 designer 包 CSS）：独立事项。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
