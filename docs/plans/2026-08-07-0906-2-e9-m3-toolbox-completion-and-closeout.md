# 2 Editor Mission E9 M3 工具箱完整 + 收尾

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E9 work items E9.1/E9.2、Phase Details E9、Work Items §E9 表、Phase Status E9=`todo`、Cross-Cutting 平台能力复用/双态隔离/spike 先行纪律/测试纪律/人工确认阈值/文档共识审查/组件注册）、`docs/components/industrial-hmi/editor-initiation.md`（§2.1 画布工具箱 P2 M3 功能域 + §2.2 M3 里程碑边界「对齐/分布/层级/复制粘贴/图元库管理 + 导入导出完善 + 撤销深化」+ §3 复用点 #1 引擎层视口命令 + #3 图元注册表只读 + #5 句柄面 exportConfig/importConfig + §6 R5 双态隔离/R7 编辑态包络）、`docs/components/industrial-hmi-editor/design-toolbox.md`（E2.5，五项工具复用映射 §4.1 视图工具/§4.2 对齐分布层级/§4.3 复制粘贴/§4.4 导入导出/§4.5 图元库只读 + 实现拆分 §11 + 风险清单 T1–T5 §12.1）、`docs/components/industrial-hmi-editor/design-undo-redo.md`（E2.4，§4.4 跨操作合并 M3 完善 + §4.5 边界提示）、`docs/components/industrial-hmi-editor/design-renderer.md`（E2.6，§8.4 toolbox sub-handle + §3 同步清单「组件注册：examples.manifest.json / playground registry / i18n / quick-reference 组件表」）、`docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（编辑态包络裁定建议值 §3，E9.2 benchmark 复测对照基线）
> Related: `docs/plans/2026-08-07-0443-1-e7-m2-connections-and-undo-redo.md`（E7 M2 实现，E9 消费 undo 栈 + 句柄面）、`docs/plans/2026-08-07-0906-1-e8-m2-overall-gate.md`（E8 M2 gate，E9 前置）、`docs/plans/2026-08-06-1931-1-e5-m1-mvp-editor-implementation.md`（E5 M1 实现，工具箱 region 占位来源）
> Mission: industrial-hmi-editor
> Work Item: E9

## Purpose

执行 industrial-hmi-editor mission 的 **E9 M3 工具箱完整 + 收尾**——在 E5 M1 + E7 M2 编辑器实现（双态切换 + 图元库 + 拖拽放置 + 属性面板 + 保存/加载 + 校验 + 连线 + undo-redo + 多选 + group/ungroup）基础上，落地 M3 里程碑——

1. **E9.1 工具箱完整**（消费 design-toolbox.md E2.5）：五项工具落地——视图工具（缩放/平移/fit/center/reset 复用 runtime `scada-engine.ts` 18 命令面，**不重复实现**）/ 对齐分布（基于 selection 包围盒的编辑器适配层算法，纯逻辑单测先行）/ 层级（toTop/toBottom/moveUp/moveDown 经 working copy `symbols` 数组重排，**不调 leafer Editor toTop**，防双源化 T3）/ 复制粘贴（编辑器内 clipboard，粘贴分配新 id 防 T4）/ 图元库管理（`listScadaSymbols()` 只读浏览，禁止写入 registerScadaSymbol）/ 导入导出完善（复用 runtime `exportConfig`/`importConfig` 句柄，导入前弹确认对话框提示清空编辑历史 T5）/ 撤销深化（operation-coalesce M3 完善：跨操作合并策略 + 用户可感知边界提示）。工具箱操作经编辑器扩展句柄（addSymbol/removeSymbol/updateSymbol）+ undo 栈（E7 已落地），不派发 `symbol:*` action（R5 隔离）。
2. **E9.2 M3 收尾**：编辑态 benchmark 复测（对照 `editing-envelope-2026-08-06.md §3` 包络裁定建议值，runtime 3 层 App 下编辑器本体复测，推进 R7 人工最终确认——AI 产出复测报告 + 标记，人工最终确认）+ 文档收尾（`docs/index.md` 导航新增 editor 篇 / 架构文档增量 / quick-reference 组件表新增 `scada-editor-canvas` / flux-guide design-patterns 新增 editor 篇）。

E9 是编辑器 mission 的**第三个也是最后一个实现里程碑**：E0–E8 全部为 E9 的前置输入；E9 完成后 E10（M3 gate + 整体收尾，独立 review）才可推进。E9 不做整体 gate（属 E10）、不重新仲裁选型（路径 A 已裁定）、不实现 InnerEditor（M3 后可选项）。

## Current Baseline

- **E5 M1 + E7 M2 实现已落地 + E6/E8 gate（E8 待执行，本 plan 假设 E8 收口后启动）**（roadmap Phase Status E5=`done` E6=`done` E7=`planned`→E8 后 `done`）：`packages/flux-renderers-industrial/src/editor/` 含完整 M1+M2 实现——
  - **M1（E5）**：编辑态画布 + 双态切换（`editor-engine.ts` leafer App + Editor 装配 / `editor-session.ts` 编辑会话模型 / `editor-adapter.ts` Editor 事件族抽纯 payload+nodeId + transform 节流起止帧）；图元库面板（`palette/editor-palette.tsx` 24 内置只读）+ 拖拽放置；属性面板 schema（`inspector/` 六类分组 + editor hints + validate 衔接）；句柄扩展（`use-editor-handles.ts` addSymbol/removeSymbol/updateSymbol/save/load M1 子集）；playground demo（`apps/playground/src/pages/scada-editor-demo.tsx`）。
  - **M2（E7）**：连线（`connection/` 4 模块 + connection 测试句柄 sub-handle）；undo-redo diff 命令栈（`undo-redo/` 4 模块 + `editor-session.ts` undoStack/redoStack，canUndo/canRedo 真实派生 + undo/redo 句柄 + undoRedo 测试句柄 sub-handle）；多选/框选 + group/ungroup（selectArea+selectKeep:true + group/ungroup 句柄 + 结构 diff 入栈）。R4 内存约束严格满足（栈元素只持 forward+inverse 增量，无全量快照）+ R5 双态隔离不泄漏。
  - **工具箱 region 占位已声明**：`renderer-definitions.ts:41` `{ key: 'toolbox', kind: 'region' }` + `scada-editor-canvas.tsx:248` 注释「toolbox/statusBar regions reserved for M3/E9.1（design-renderer.md §4.4）；M1 无默认内容，host 经 region override 注入」——E9.1 将消费此 region 落地工具箱 UI（toolbox/statusBar 两 region）。
- **E7 测试基线**：industrial 包 82 files / 1077 tests pass；typecheck/build/lint/test 全 green（32/32 + 59/59，roadmap E7 记录 + daily log）。
- **设计契约已稳定（E9 审查/实现对照基线）**：`design-toolbox.md`（E2.5）经 E2 共识审查 Round 1 AGREE + E3 设计 gate `pass-with-minors` 终轮复核。E9.1 直接消费 design-toolbox.md 五项工具复用映射 + 实现拆分（§11：`toolbox/` 子目录 align-distribute.ts / z-order.ts / clipboard.ts / toolbox-panel.tsx）+ 风险清单 T1–T5（§12.1）+ 测试句柄契约（§8.3 `ScadaEditorToolboxTestHandle`）。
- **runtime 复用点（E9 直接消费，禁止重复实现）**：
  - 引擎层 `engine/scada-engine.ts` 18 命令面（design-engine.md §8.2 live）——视图工具复用 `fit()`/`center()`/`setViewport()`/`zoomAt()`/`getViewport()`（design-toolbox.md §4.1 逐项映射 :269/:275/:281/:287/:302）；
  - 句柄面 `renderer/hooks/use-scada-handles.ts:11-21` 既有 `exportConfig`/`importConfig`（design-renderer.md §8.5，design-toolbox.md §4.4）——导入导出复用；
  - 图元注册表 `symbols/symbol-registry.ts` + `listScadaSymbols()`（design-toolbox.md §4.5 只读浏览，禁止 registerScadaSymbol 写入）；
  - 编辑器扩展句柄 addSymbol/removeSymbol/updateSymbol（E5 落地）——粘贴（addSymbol）/ 剪切（removeSymbol）/ 对齐分布层级（updateSymbol 结构 diff）经现有句柄；
  - undo 栈（E7 落地）——对齐/分布/层级/剪切/粘贴入栈（结构 diff，computeInverse 自动处理逆）；
  - ConfigAdapter nodeById O(1)（`config-adapter.ts:16`）——对齐算法查图元当前几何。
- **E8 deferred 项（明确属 E9）**：M3 工具箱完整（对齐/分布/层级/复制粘贴/图元库管理/导入导出完善）→ E9.1（本 plan）；撤销深化（跨操作合并 M3 完善 / 可配置合并窗口 / 撤销历史面板 UI）→ E9.1（本 plan）；编辑态性能 benchmark 复测 + R7 数字最终确认 → E9.2（本 plan）；`docs/index.md` 导航 + quick-reference 组件表新增 → E9.2（本 plan）；「断开连接」工具 / dangling connection 批量清理 → E9（本 plan 可选 / M3 后）；ActionSchema 编辑器 → E9（本 plan M3 事件走 json-editor fallback 完善）。
- **watch-only residual（E9 保持感知，非阻断）**：`[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（大规模选区首次拖拽 simulateTarget 初始化延迟）——E9.2 benchmark 复测时对「大规模选区首次拖拽」保持感知，必要时加测端到端指针延迟。
- **真实剩余 gap**：无工具箱 UI（toolbox region 占位但无默认内容）；无对齐/分布/层级算法；无复制粘贴（编辑器内 clipboard）；无导入导出完善（runtime 句柄已注册但工具箱 UI 未接）；撤销深化未完善（M2 基础合并 + §4.5 边界提示逻辑已随 E7 落地，design-undo-redo.md §4.4 M3 跨操作合并策略待扩展 + 边界提示与新工具栈条目集成，非重写 §4.5）；编辑态 benchmark 未全量复测；编辑器文档收尾未做（docs/index.md / quick-reference / flux-guide 无 editor 篇）。

## Goals

- **E9.1 工具箱完整**：`toolbox/` 子目录落地 4 模块（align-distribute.ts 对齐/分布算法 + z-order.ts 层级 symbols 数组重排 + clipboard.ts copy/cut/paste + id 重新分配 + toolbox-panel.tsx 工具箱 UI 消费 `@nop-chaos/ui`）；视图工具复用 runtime 引擎命令面（fit/center/setViewport/zoomAt/getViewport，**不重复实现**）；导入导出复用 runtime 句柄（exportConfig/importConfig，导入前确认对话框 T5）；图元库管理只读（listScadaSymbols）；对齐/分布/层级/剪切/粘贴入 undo 栈（复用 E7 栈）；撤销深化（operation-coalesce M3 完善：跨操作合并策略 + 边界提示）；toolbox 测试句柄 sub-handle（design-toolbox.md §8.3）；工具箱 e2e（经测试句柄断言 working copy 结构 + clipboard 状态 + undo 栈，禁截图判定）。
- **E9.2 编辑态 benchmark 复测**：对照 `editing-envelope-2026-08-06.md §3` 包络裁定建议值，在 runtime 3 层 App 下复测编辑器本体性能（拖拽响应 fps / 编辑操作响应延迟 / 选区规模 / 内存），产出复测报告；推进 R7 人工最终确认（AI 产出复测数据 + 标记，人工最终确认阈值）。
- **E9.2 文档收尾**：`docs/index.md` 导航新增 editor 篇；架构文档增量（roadmap「组件注册」+ design-toolbox.md 实现收口）；quick-reference 组件表新增 `scada-editor-canvas`；flux-guide design-patterns 新增 editor 篇。
- roadmap Phase Status 回写（E9: `todo` → `planned` 本 plan 激活时；→ `done` 留待 E10 gate + closure-audit 通过）；daily log 记录。

## Non-Goals

- **不做 M3 整体 gate**（属 E10）：E9 按 M3 边界实现，E10 独立 review 审查整体完整性。
- **不做 InnerEditor（文本双击编辑）**（依赖 `@leafer-in/text-editor` 插件，spike 约束 #8；design-renderer.md §1 非目标——M3 后可选项）。
- **不做 OS clipboard 桥接**（design-toolbox.md T2：M3 编辑器内 clipboard，不接 OS clipboard；M3 后可选项）。
- **不做「断开连接」工具 / dangling connection 批量清理 / 多 connection 批量编辑的完整实现**（design-connection.md §12.3 后续阶段；本 plan 仅保持 dangling 标记存在，完整清理工具属 M3 后）。
- **不修改 runtime `scada-canvas` renderer / runtime 复用点面**（E9 只在 `src/editor/` subpath 内实现；runtime 面 scada-engine.ts / serialize.ts / use-scada-handles.ts 只读消费）。
- **不变更选型主路径**（路径 A leafer-editor，E1 已裁定；E9 只消费 runtime 命令面 + 句柄面）。
- **不替代 R7 人工最终确认**（编辑态包络数字属 benchmark 验收阈值类，E9.2 产出复测报告 + 标记，人工最终确认；E9.2 推进 R7 状态但不自确认）。
- **不做 M3 交付边界最终裁定**（属 E10.2 gate，E9 按文档化 M3 边界实现，E10 确认）。

## Scope

### In Scope

- **E9.1 工具箱完整**：
  - `Proof`：前置验证——核对 E8 `done`（roadmap Phase Status E8 = `done`，E8 plan `Plan Status: completed`，closure-audit PASS）；未就绪则等待（Failure Paths `upstream-not-ready`）。
  - `Fix`：`toolbox/align-distribute.ts`——对齐（左/右/水平居中/顶/底/垂直居中）+ 分布（水平等距/垂直等距）算法（design-toolbox.md §4.2.1）：基于 selection（≥2 对齐 / ≥3 分布）包围盒重排各图元 x/y（保持 width/height 不变）；产出 forward diff = `{updated: [{id, patch: {x, y}}, ...]}`，operationKind=`transform-move`（多图元，整组对齐 = 1 个 diff 入栈）；复用 `engine.getSymbol(id)` 查当前几何（runtime 复用点 #1）。纯逻辑（无 React 依赖），**单测先行**（对齐六方向 / 分布两方向 / selection 不足时的 `insufficient-selection` 错误码 / T1 group 嵌套场景边界处理）。
  - `Fix`：`toolbox/z-order.ts`——层级 toTop/toBottom/moveUp/moveDown 经 working copy `symbols` 数组重排（design-toolbox.md §4.2.2，**不调 leafer Editor toTop**，防 T3 双源化）：toTop 移到数组末尾（顶层）/ toBottom 移到数组开头（底层）/ moveUp 与前一元素交换 / moveDown 与后一元素交换；产出结构 diff（removed=[id] + added=[node]，对齐 design-undo-redo.md §4.3 结构 diff 模式）入栈。纯逻辑，**单测先行**（四方向重排 / 单元素场景 / 数组边界）。
  - `Fix`：`toolbox/clipboard.ts`——copy/cut/paste（design-toolbox.md §4.3）：copy 深拷贝 selection → clipboard（不修改 working copy）；cut 深拷贝 + 移除 selection（forward diff = `{removed: [...ids]}` 入栈）；paste 读 clipboard → 为每个图元分配新 id（`${原id}-copy-${counter}`，编辑会话维护 counter，防 T4 冲突）+ 位移偏移（+20px/+20px 避免重叠）→ forward diff = `{added: [...新节点]}` 入栈 + 新 selection = 新 id 列表。clipboard 域内部 ref 持有（不进 scope，不接 OS clipboard T2）。纯逻辑核心 + 单测（id 唯一性 / 多次粘贴 / copy-cut-paste 组合）。
  - `Fix`：`toolbox/toolbox-panel.tsx`——工具箱 UI（design-toolbox.md §10 + §11）：消费 `@nop-chaos/ui`（Button / ButtonGroup / Tooltip / DropdownMenu / Separator）；五项工具按钮编排（视图工具组 / 对齐分布组 / 层级组 / 复制粘贴组 / 导入导出组 / 图元库浏览）；按钮 disabled 状态（selection 为空时禁用对齐/分布/层级/复制剪切工具）；根容器 marker `nop-scada-editor-toolbox` + `data-slot="scada-editor-toolbox"`；经 `props.regions.toolbox?.render(...) ?? <内置>` consult（与 E6 m-2 palette/inspector override 同模式，host 可 override）。
  - `Fix`：视图工具接通——缩放（toolbox 按钮 + wheel）调 `engine.zoomAt()`（minScale/maxScale 钳制 + statusBar 边界提示）/ fit 调 `engine.fit()`（空场景 `not-visible`）/ center 调 `engine.center()` / reset 调 `engine.setViewport({x:0,y:0,scale:1})` / statusBar 显示当前视口（`engine.getViewport()`）；**不重复实现** runtime 命令面（复用点 #1）。
  - `Fix`：导入导出完善——导出按钮调 `component:exportConfig()`（复用 runtime 句柄，返回序列化 config 字符串）；导入按钮弹确认对话框（提示「导入将清空当前编辑历史」T5，默认取消）→ host 文件选择/clipboard 读取 config → 经 `validateScadaConfig` 校验 → 调 `component:importConfig(config)`（重置 undo/redo 栈，design-undo-redo.md §8.2）；错误码 `invalid-config`。
  - `Fix`：图元库管理只读浏览——toolbox 图元库面板复用 `listScadaSymbols()`（runtime 复用点 #3，24 内置只读）；**禁止** registerScadaSymbol/unregisterScadaSymbol 写入路径（design-toolbox.md §4.5）。
  - `Fix`：撤销深化（design-undo-redo.md §4.4 M3 完善）——扩展 `undo-redo/operation-coalesce.ts`（E7 M2 基础合并已落地）：跨操作合并策略完善（连续同方向对齐/分布合并窗口 / 层级连续操作合并）+ 用户可感知边界提示（栈空/栈满/截断 redo 的 statusBar 或 toast 提示，design-undo-redo.md §4.5）；**不实现撤销历史面板 UI**（design-undo-redo.md §4.5 M3 可选项，本 plan 标 optimization candidate）。
  - `Fix`：toolbox 测试句柄 sub-handle（design-toolbox.md §8.3 `ScadaEditorToolboxTestHandle`）：fit/center/zoomAt + align/distribute/toTop/toBottom + copy/cut/paste/getClipboard + exportConfig/importConfig + listSymbolLibrary，挂 `window.__flux_scada_editor_<cid>.toolbox`。
  - `Proof`：工具箱 e2e（Playwright 程序化断言经测试句柄）：对齐 → 断言 working copy 各图元 x/y 重排 + undo 栈深度 +1；分布 → 等间距重排；层级 toTop → symbols 数组顺序变化 + undo 往返；复制粘贴 → 新 id 分配 + clipboard 状态 + undo 往返；导入 → 确认对话框 + 重置 undo 栈；视图工具 → viewport 变化（经 getViewport 断言）；撤销深化边界提示；**禁截图判定**；R5 隔离断言（工具箱操作不派发 `symbol:*` action）。
- **E9.2 编辑态 benchmark 复测**：
  - `Proof`：编辑态 benchmark 复测——对照 `editing-envelope-2026-08-06.md §3` 五项包络裁定建议值（① 拖拽响应 fps ≥30fps @ 选区 ≤1k primary / ≤10k extended；② 编辑操作响应 <100ms；③ 覆盖物密集场景上限（选区规模）≤1k primary / ≤10k extended；④ 内存 ≤320MB；⑤ 编辑器本体 runtime 最终验证 meta-item），在 runtime 3 层 App（非 scratch）下复测编辑器本体性能；**另加测端到端指针延迟抽查**（来自 `[E1.1-sg]` watch-only residual，非 §3 ⑤）；产出复测报告（fps 矩阵 + per-call 延迟 + 内存 + 与 E1.2 裁定建议值对比 + 指针延迟抽查记录）；推进 R7 人工最终确认标记（AI 产出复测数据 + 标记，人工最终确认）。
- **E9.2 文档收尾**：
  - `Fix`：`docs/index.md` 导航新增 editor 篇（industrial-hmi-editor 设计文档 + spike 报告 + gate 文档索引）。
  - `Fix`：quick-reference 组件表新增 `scada-editor-canvas`（renderer type + fields/events/regions/handles 摘要）。
  - `Fix`：flux-guide design-patterns 新增 editor 篇（编辑态画布 + 双态隔离 + 工具箱使用示例）。
  - `Fix`：架构文档增量（roadmap「组件注册」同步 `examples.manifest.json` + playground registry + i18n 文案校验；design-toolbox.md 实现收口标注）。
- **roadmap + daily log 回写**：roadmap 头部记录 + Phase Status E9；`docs/logs/2026/08-07.md`（或后续日期）记录。

### Out Of Scope

- M3 整体 gate + 整体收尾（E10）。
- InnerEditor（文本双击编辑，M3 后可选项）。
- OS clipboard 桥接（M3 后可选项）。
- 「断开连接」工具 / dangling connection 批量清理完整实现（M3 后）。
- 撤销历史面板 UI（design-undo-redo.md §4.5 M3 可选项）。
- runtime `scada-canvas` renderer / scada-engine.ts / serialize.ts / use-scada-handles.ts 行为变更（E9 只读消费 runtime 面）。
- M3 交付边界最终裁定（E10.2 gate）。
- R7 编辑态包络数字人工最终确认（AI 标记，人工最终确认）。

## Failure Paths

| 可测场景编号                | 触发                                                                                                                                                                | 行为（含状态码/错误码）                                                                                                                   | 可重试 | 用户可见表现                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| upstream-not-ready          | E9 执行时 E8 未 `done`（roadmap E8 ≠ `done`）或设计契约未稳定                                                                                                       | E9 暂停等待；不跳序执行                                                                                                                   | 否     | roadmap E8 仍非 `done`；E9 暂停                     |
| reuse-overclaim             | E9 重新实现了 runtime 已落地能力（视口命令 fit/center/setViewport/zoomAt / 序列化 serialize / 图元注册表写入 registerScadaSymbol / exportConfig/importConfig 句柄） | 视为 live defect（roadmap Cross-Cutting 平台能力复用）；改为复用 runtime 面                                                               | 否     | （修复后）editor 代码 import runtime 面，无重复实现 |
| dual-state-leak (R5)        | 工具箱操作污染运行态（适配层派发 `symbol:*` action / 编辑态工具箱触发运行事件）                                                                                     | 视为 live defect（R5 硬约束）；立即修复；e2e 断言工具箱操作不派发 symbol:click                                                            | 否     | （修复后）编辑态操作不触发运行事件                  |
| zorder-double-source (T3)   | 层级实现调 leafer Editor toTop/toBottom（绕过 symbols 数组，双源化风险）                                                                                            | 视为 live defect（design-toolbox.md T3）；修复——改为经 working copy symbols 数组重排（与 runtime 序列化往返一致）                         | 否     | （修复后）层级经 symbols 数组顺序                   |
| clipboard-id-collision (T4) | 粘贴时未分配新 id 导致冲突（保留原 id）                                                                                                                             | 视为 live defect（design-toolbox.md T4）；修复——粘贴分配新 id（`${原id}-copy-${counter}`）；单测断言唯一性                                | 否     | （修复后）多次粘贴无 id 冲突                        |
| import-history-loss (T5)    | 导入未弹确认对话框直接清空编辑历史                                                                                                                                  | 视为 live defect（design-toolbox.md T5）；修复——导入前弹确认对话框（提示清空编辑历史，默认取消）                                          | 否     | （修复后）导入需用户显式确认                        |
| design-contract-conflict    | E9 实现期发现与 design-toolbox.md 契约冲突                                                                                                                          | 记录冲突 + 按 design-renderer.md §12.2 `design-contract-conflict` 升级：小修就地修契约（记录于 daily log）；范围/契约重大变更标记人工确认 | 否     | 冲突记录在案；契约或实现修正后一致                  |
| envelope-below-candidate    | E9.2 benchmark 复测发现编辑器本体明显违背包络裁定建议值（如拖拽 fps 远低于 30 / 内存超 320MB）                                                                      | 标记 R7 人工确认 + 在复测报告记录违背项；若需降档（primary→extended）标记人工；修复属 E10 gate 范围或标记 M3 后优化                       | 是     | 复测报告记录违背；R7 标记推进                       |
| regression-fail             | E9 落地后全量 typecheck/build/lint/test 出现回归                                                                                                                    | 定位回归源，修复或回退直至全量 green；不允许带 failing 关闭                                                                               | 是     | Closure Gates 未勾选；plan 维持 in progress         |

> **人工确认阈值核对**：roadmap「人工确认阈值」固定项为 R1（选型变更，不触发）/ `scada-editor-canvas` 公共契约重大变更 / R7（包络数字，E9.2 复测后推进人工最终确认）/ 共识循环超 3 轮 / 范围级变更。E9 按文档化 M3 边界实现；toolbox 测试句柄 sub-handle + toolbox region 默认内容属 design-renderer.md §8.4 + §4.4 已定型契约的**计划内补全**（E6 m-2 已 consult region 模式，E9 补默认内容），非「重大变更」。若 E9 期间发现需改已定型契约 → 触发 `design-contract-conflict` + 人工确认。R7 在 E9.2 复测后推进人工最终确认（AI 不自确认）。故 E9 全程 AI 可执行，除非触发上表 Failure Path 或 E10 gate 裁定。

## Test Strategy

本档选择：`必须自动化`

工具箱对齐/分布/层级算法是组态核心交互（多图元相对位置 + z 序与 runtime 序列化往返一致），clipboard id 唯一性是数据完整性关键，撤销深化是核心回归路径。均有非显而易见的根因风险（对齐算法基于 selection 包围盒 / z 序 symbols 数组重排与序列化往返 / clipboard id 冲突 / 跨操作合并边界）、跨模块（工具箱↔编辑会话↔undo 栈↔runtime 命令面）、且 design-toolbox.md T1–T5 风险清单要求 focused verification。故：

- **纯逻辑层单测先行**（Proof 项在 Fix 之前）：align-distribute.ts / z-order.ts / clipboard.ts 核心逻辑——纯逻辑无 React 依赖，单测覆盖正确结果（非仅"不抛错"）。
- **canvas 渲染层走 Playwright 程序化断言**：工具箱 e2e 经测试句柄 `__flux_scada_editor_<cid>.toolbox` 读 working copy / clipboard / undoStack 深度 / viewport 断言（**禁截图判定**，禁 node-canvas，roadmap 测试纪律）。
- **E9.2 benchmark 复测**走真实浏览器性能测量（runtime 3 层 App 下编辑器本体，对照 editing-envelope §3 包络）。
- Closure Gates 跑全量 `pnpm typecheck/build/lint/test`。

## Execution Plan

> 2 Phase 顺序：Phase 1 E9.1 工具箱完整（消费 design-toolbox.md 五项工具 + 撤销深化）→ Phase 2 E9.2 M3 收尾（benchmark 复测 + 文档收尾）。Phase 2 依赖 Phase 1 工具箱实现（benchmark 复测编辑器本体含工具箱）。

### Phase 1 - E9.1 工具箱完整

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/toolbox/`（新建子目录）、`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-handles.ts`（工具箱句柄扩展，若需）、`packages/flux-renderers-industrial/src/editor/editor-test-handle.ts`（toolbox sub-handle）、`packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（toolbox region 默认内容）、`packages/flux-renderers-industrial/src/editor/undo-redo/operation-coalesce.ts`（撤销深化扩展）

- Item Types: `Proof | Fix`

- [x] `Proof`：前置验证——核对 E8 `done`（**具体判定：roadmap Phase Status E8 = `done`，E8 plan `Plan Status: completed`，closure-audit PASS**）；核对 runtime `scada-engine.ts` 18 命令面 fit/center/setViewport/zoomAt/getViewport live（design-toolbox.md §4.1 映射）；核对 `use-scada-handles.ts` exportConfig/importConfig live；核对 `listScadaSymbols()` live；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Proof`：`toolbox/align-distribute.ts` 对齐/分布算法**单测先行**——对齐六方向（左/右/水平居中/顶/底/垂直居中）+ 分布两方向（水平等距/垂直等距）；基于 selection（≥2 对齐 / ≥3 分布）包围盒重排 x/y（保持 width/height）；forward diff `{updated:[...]}` operationKind=`transform-move`；selection 不足返回 `insufficient-selection`；T1 group 嵌套场景边界处理（M3 扁平算法，跨 group 嵌套对齐可选限制）。纯逻辑无 React 依赖（design-toolbox.md §4.2.1）。单测断言可观测结果（重排后各图元 x/y 精确值 + diff 结构）。
- [x] `Proof`：`toolbox/z-order.ts` 层级算法**单测先行**——toTop/toBottom/moveUp/moveDown 经 symbols 数组重排（design-toolbox.md §4.2.2，**不调 leafer Editor toTop**，Failure Paths `zorder-double-source`）；产出结构 diff（removed=[id]+added=[node]）；单元素场景 + 数组边界。纯逻辑。单测断言重排后数组顺序 + 结构 diff。
- [x] `Proof`：`toolbox/clipboard.ts` copy/cut/paste 核心**单测先行**——copy 深拷贝不修改 working copy；cut 深拷贝 + removed diff；paste 分配新 id（`${原id}-copy-${counter}`，编辑会话 counter，Failure Paths `clipboard-id-collision`）+ 位移偏移 + added diff + 新 selection；多次粘贴 id 唯一（design-toolbox.md §4.3 + T4）。纯逻辑核心。单测断言 id 唯一性 + diff 结构 + clipboard 状态。
- [x] `Fix`：`toolbox/toolbox-panel.tsx` 工具箱 UI——消费 `@nop-chaos/ui`（Button/ButtonGroup/Tooltip/DropdownMenu/Separator）；五项工具按钮编排（视图/对齐分布/层级/复制粘贴/导入导出/图元库浏览）；disabled 状态（selection 为空禁用对齐/分布/层级/复制剪切）；根 marker `nop-scada-editor-toolbox`+`data-slot="scada-editor-toolbox"`；经 `props.regions.toolbox?.render(...) ?? <内置>` consult（与 E6 m-2 override 同模式）。
- [x] `Fix`：视图工具接通——缩放（按钮 + wheel）调 `engine.zoomAt()`（minScale/maxScale 钩制 + statusBar 边界提示）/ fit `engine.fit()`（空场景 `not-visible`）/ center `engine.center()` / reset `engine.setViewport({x:0,y:0,scale:1})` / statusBar 显示 `engine.getViewport()`；**不重复实现** runtime 命令面（复用点 #1，Failure Paths `reuse-overclaim`）。
- [x] `Fix`：导入导出完善——导出调 `component:exportConfig()`；导入弹确认对话框（提示清空编辑历史，默认取消，Failure Paths `import-history-loss`）→ host 文件选择/clipboard → `validateScadaConfig` 校验 → `component:importConfig(config)`（重置 undo/redo 栈）；错误码 `invalid-config`。
- [x] `Fix`：图元库管理只读浏览——复用 `listScadaSymbols()` 24 内置只读；**禁止** registerScadaSymbol/unregisterScadaSymbol 写入（design-toolbox.md §4.5）。
- [x] `Fix`：撤销深化——扩展 `undo-redo/operation-coalesce.ts`（E7 M2 基础合并 + §4.5 边界提示逻辑已落地）：design-undo-redo.md §4.4 跨操作合并策略 M3 完善（连续同方向对齐/分布合并窗口 / 层级连续操作合并）+ §4.5 边界提示与新工具栈条目集成（栈空/栈满/截断 redo statusBar 或 toast，已落地逻辑接通工具箱新操作 kind）；对齐/分布/层级/剪切/粘贴入 undo 栈（复用 E7 栈 + computeInverse 自动处理结构 diff 逆）。
- [x] `Fix`：toolbox 测试句柄 sub-handle（design-toolbox.md §8.3 `ScadaEditorToolboxTestHandle`）：fit/center/zoomAt + align/distribute/toTop/toBottom + copy/cut/paste/getClipboard + exportConfig/importConfig + listSymbolLibrary，挂 `window.__flux_scada_editor_<cid>.toolbox`。
- [x] `Proof`：工具箱 e2e（Playwright 程序化断言经测试句柄）：对齐 → working copy x/y 重排 + undo 栈 +1；分布 → 等间距；层级 toTop → symbols 数组顺序变化 + undo 往返；复制粘贴 → 新 id + clipboard 状态 + undo 往返；导入 → 确认对话框 + 重置栈；视图工具 → viewport 变化（getViewport 断言）；撤销深化边界提示；**禁截图判定**；R5 隔离断言（工具箱操作不派发 `symbol:*` action，Failure Paths `dual-state-leak`）。

Exit Criteria:

> Phase 1 交付工具箱五项工具 + 撤销深化 + 工具箱 e2e。工具箱操作入 undo 栈，复用 runtime 命令面/句柄面，R5 隔离不泄漏。

- [x] `toolbox/` 4 模块（align-distribute/z-order/clipboard/toolbox-panel）落地，纯逻辑模块（align-distribute+z-order+clipboard 核心）单测 green。
- [x] 视图工具复用 runtime `scada-engine.ts` 命令面（fit/center/setViewport/zoomAt/getViewport），导入导出复用 runtime 句柄（exportConfig/importConfig），图元库复用 `listScadaSymbols()` 只读——**无重复实现**（grep 证实 E9 无 runtime 命令面/serialize/registerScadaSymbol 重写）。
- [x] 工具箱操作入 undo 栈（对齐/分布/层级/剪切/粘贴）；撤销深化（跨操作合并 + 边界提示）落地。
- [x] 工具箱 e2e 经测试句柄断言 working copy/clipboard/undoStack/viewport（非截图判定）；R5 隔离断言（不派发 `symbol:*` action）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` green + `test` green（Phase 1 新增测试通过）。

### Phase 2 - E9.2 M3 收尾（benchmark 复测 + 文档收尾）

Status: completed
Targets: `docs/analysis/industrial-hmi-editor/`（benchmark 复测报告，新建）、`docs/index.md`（导航）、`docs/references/quick-reference.md`（组件表）、`flux-guide/`（design-patterns editor 篇）、`docs/components/roadmap-industrial-hmi-editor.md`（头部记录 + Phase Status）、`docs/logs/2026/`

- Item Types: `Proof | Fix`

- [x] `Proof`：编辑态 benchmark 复测——对照 `editing-envelope-2026-08-06.md §3` 五项包络裁定建议值（① 拖拽响应 fps 阈值 ≥30fps @ 选区 ≤1k primary + ≤10k extended；② 编辑操作响应延迟 <100ms；③ 覆盖物密集场景上限（选区规模）≤1k primary / ≤10k extended；④ 内存 ≤320MB；⑤ 编辑器本体 runtime 最终验证 meta-item），在 runtime 3 层 App（`apps/playground` 编辑器 demo，非 scratch）下复测编辑器本体性能（fps 矩阵 + per-call 延迟 + 内存 + 选区规模验证）；**另加测端到端指针延迟抽查**（来自 `[E1.1-sg]` watch-only residual，非 §3 ⑤，复核「大规模选区首次拖拽 simulateTarget 初始化延迟」）。产出复测报告 `docs/analysis/industrial-hmi-editor/editing-envelope-retest-<date>.md`（fps 矩阵 + 延迟 + 内存 + 与 E1.2 裁定建议值对比 + 违背项记录 + 指针延迟抽查记录）。Failure Paths `envelope-below-candidate` 若触发则标记 R7 人工确认。
- [x] `Proof`：推进 R7 人工最终确认标记——基于复测报告，在 roadmap 头部 + 复测报告标记 R7 当前状态「E9.2 runtime 3 层 App 复测完成，数据见复测报告，待人工最终确认」（AI 产出数据 + 标记，人工最终确认阈值，不自确认）。
- [x] `Fix`：`docs/index.md` 导航新增 editor 篇——industrial-hmi-editor 设计文档（design-\*.md 6 份）+ spike 报告 + selection-gate + editing-envelope + 各 gate review 文档索引。
- [x] `Fix`：`docs/references/quick-reference.md` 组件表新增 `scada-editor-canvas`（renderer type + fields/events/regions/handles 摘要 + 双态隔离说明）。
- [x] `Fix`：flux-guide design-patterns 新增 editor 篇（编辑态画布 schema 示例 + 双态切换 + 工具箱使用 + save/load 提交语义）。
- [x] `Fix`：架构文档增量——roadmap「组件注册」同步核对（`examples.manifest.json` + playground registry + i18n 文案 `scada-editor-canvas` 键完整）；design-toolbox.md 实现收口标注（E9.1 落地标注）。
- [x] `Fix`：roadmap 头部「文档共识审查记录」块新增 E9 记录条目（工具箱完整 + 撤销深化 + benchmark 复测 + 文档收尾摘要 + R7 状态推进）；daily log 记录本 plan 产出摘要。

Exit Criteria:

> Phase 2 交付 benchmark 复测报告 + 文档收尾。R7 状态推进至「复测完成待人工最终确认」。

- [x] 编辑态 benchmark 复测报告产出（对照 editing-envelope §3 五项包络，runtime 3 层 App 复测数据 + 违背项记录）；R7 状态推进标记（待人工最终确认）。
- [x] 文档收尾完成：`docs/index.md` 导航 editor 篇 + quick-reference 组件表 `scada-editor-canvas` + flux-guide design-patterns editor 篇 + 架构文档增量。
- [x] roadmap 头部 + daily log 已记录；E10 输入交接清单（M3 实现 + benchmark 复测报告 + R7 待人工 + 文档收尾 + deferred 指向 InnerEditor/OS clipboard/断开连接工具 M3 后）就绪。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，round 1，task `ses_026399c55ffeEKYfDJm5iAZdmR`）
- Verdict: `pass-with-minors`（round 1 即达成共识，0 Blocker / 0 Major / 2 Minor / 1 Nit）
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major——**Minor（不阻塞，已落地以利执行者）**：**M-1** editing-envelope §3 维度枚举与 live 源 ③/④ 错位（live §3：①fps/②延迟/③选区规模/④内存/⑤runtime 最终验证 meta-item；plan 原文 ③/④ 互换 + ⑤ 误替为指针延迟抽查）→ Goals + Phase 2 Proof 两处已修正为 §3 正确顺序 + 指针延迟抽查标注为 `[E1.1-sg]` watch-only 附加测项（非 §3 ⑤）；**M-2** design-undo-redo §4.5 边界提示误标为 M3 待实现（§4.5 边界提示逻辑实为 M2 基础已随 E7 落地，M3 真实工作是 §4.4 跨操作合并扩展 + §4.5 逻辑与新工具栈条目集成）→ Current Baseline 真实剩余 gap + Phase 1 撤销深化 Fix 两处已澄清（非重写 §4.5）。**Nit（不记）**：N-1 Failure Path reuse-overclaim 列举 pipe-junction（连线概念，非 E9 工具箱复用面）→ 已从 reuse-overclaim 触发行移除 pipe-junction（连线复用面属 E7 范围）。**Reference accuracy**：20 项 material claim 全部 CONFIRMED（renderer-definitions.ts:41 toolbox region / scada-editor-canvas.tsx:248 region 注释 / use-scada-handles exportConfig/importConfig / scada-engine fit:269/center:275/setViewport:281/zoomAt:287/getViewport:302 / use-editor-handles addSymbol/removeSymbol/updateSymbol / listScadaSymbols / config-adapter nodeById / toolbox 目录不存在 / operation-coalesce E7 已落地 / design-toolbox §4.2.2 symbols 数组 z-order + §8.3 test handle + §11 拆分 + §12.1 T1-T5 / design-undo-redo §4.4 M3 完善 / design-renderer §8.4+§3 / editing-envelope §3 / roadmap E9=todo E8=todo E7=planned / E7 plan completed 82 files/1077 tests / editor-initiation §2.1 P2 M3+§2.2+§3+§6 R5 R7）。4 项核对（可想象性 / 格式完整性 / 内容稳健性 / 引用准确性）全 PASS——E9 作为单个 owner plan 2 Phase（E9.1 工具箱→E9.2 收尾）符合 Rule 22-26 不过度拆分；五项工具复用映射 faithful；z-order 经 symbols 数组 / clipboard id 唯一 / 导入确认对话框 / R5 隔离 / R7 人工确认 framing 均正确。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证属 plan 收口时跑一次（Minimum Rule 18）。

- [x] E9.1 工具箱五项工具全部交付（视图工具复用 / 对齐分布 / 层级 / 复制粘贴 / 图元库只读 / 导入导出完善 + 撤销深化 + toolbox 测试句柄 + 工具箱 e2e）。
- [x] runtime 复用点不重复实现（视口命令 fit/center/setViewport/zoomAt / 序列化 serialize / exportConfig/importConfig 句柄 / listScadaSymbols 只读全部复用，editor 代码 import runtime 面）。
- [x] R5 双态隔离不泄漏（工具箱操作不派发 `symbol:*` action；e2e 断言）。
- [x] design-toolbox.md T1–T5 风险防护落地（T3 z 序经 symbols 数组 / T4 clipboard id 唯一 / T5 导入确认对话框；T1/T2 接受 + M3 后选项标注）。
- [x] E9.2 编辑态 benchmark 复测报告产出（对照 editing-envelope §3）；R7 状态推进至「复测完成待人工最终确认」。
- [x] 文档收尾完成（docs/index.md 导航 / quick-reference 组件表 / flux-guide design-patterns / 架构文档增量）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（E10 gate 能力 / InnerEditor / OS clipboard / 断开连接工具正确排除，非降级）。
- [x] 受影响 owner docs（roadmap 头部 + Phase Status E9 / design-toolbox.md 收口 / daily log）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`（32/32 ✓）
- [x] `pnpm build`（32/32 ✓）
- [x] `pnpm lint`（`turbo run lint` 32/32 ✓ + 全部 check 脚本（react19/anchors/css/fields/finite/schema-prop）通过；`check-i18n-keys` 为**预先存在**的 workspace 级 failure——经 `git stash` + checkout E8 commit d9763c63 核实，该 check 在 E8 baseline 即 exit 1，报告的 133+ 未定义键全部为 AI/code-editor 等无关包的 `flux.*` 键，E9 改动新增 0 个 `flux.*` 键，非 E9 引入、非 E9 范围）
- [x] `pnpm test`（59/59 tasks ✓；industrial 89 files / 1199 tests，coverage 90.25% branches ≥ 90% threshold）

## Deferred But Adjudicated

### E10 M3 整体 gate + 整体收尾

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: M3 整体 gate（第五个固定 review gate）+ 整体收尾（功能/性能/测试/文档四面 + 风险清单关闭 + 人工确认项闭环）属 E10（roadmap Phase Status E10）。E9 只实现 M3 + 收尾，不做整体 gate。
- Successor Required: yes
- Successor Path: E10.1（M3 整体 review）/ E10.2（修正落地 + 收尾验证）。

### InnerEditor（文本双击编辑）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 依赖 `@leafer-in/text-editor` 插件（spike 约束 #8）；design-renderer.md §1 非目标——M3 后可选项。
- Successor Required: no
- Successor Path: M3 后可选项（无强制 successor）。

### OS clipboard 桥接

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design-toolbox.md T2：M3 编辑器内 clipboard（不接 OS）；M3 后可选项（host 提供 OS clipboard 桥接）。
- Successor Required: no
- Successor Path: M3 后可选项。

### 「断开连接」工具 / dangling connection 批量清理 / 撤销历史面板 UI

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design-connection.md §12.3 后续阶段（断开连接工具完整实现）/ design-undo-redo.md §4.5 M3 可选项（撤销历史面板 UI）。本 plan 仅保持 dangling 标记 + 撤销深化边界提示，完整工具属 M3 后。
- Successor Required: no
- Successor Path: M3 后可选项。

## Non-Blocking Follow-ups

- `[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（watch-only residual，roadmap Follow-up Backlog）——E9.2 benchmark 复测加测端到端指针延迟抽查，复核「大规模选区首次拖拽 simulateTarget 初始化延迟」。
- InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（watch-only residual，roadmap Follow-up Backlog，非阻断）。
- ActionSchema 编辑器（事件 action 的 ActionSchema 编辑，M3 事件走 json-editor fallback 完善；完整 ActionSchema 编辑器属 M3 后）。

## Closure

Status Note: E9 M3 工具箱完整 + 收尾全交付。Phase 1（E9.1 工具箱 4 模块 + 句柄 + 测试句柄 + operation-coalesce M3 完善 + e2e）与 Phase 2（E9.2 benchmark 复测报告 + 文档收尾 + R7 推进）均已落地。closure-audit 由独立 fresh-session sub-agent（MISSION_DRIVER closure-audit task）执行：live repo 核对五项工具复用映射无重复实现、模块非空且已接线（toolbox-panel 经 scada-editor-canvas.tsx:250 渲染可达）、R5 隔离断言成立、deferred 项分类诚实（E10/InnerEditor/OS clipboard/断开连接工具均为 out-of-scope improvement）、owner-docs 同步（roadmap 头部 + design-toolbox.md 收口标注 + daily log 08-07 + docs/index.md + quick-reference + flux-guide）。R7 编辑态包络经 runtime 3 层 App 复测 primary ①②④ 全部达标，**待人工最终确认**（AI 不自确认）。无剩余 plan-owned work；E10 输入交接清单就绪。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session sub-agent（MISSION_DRIVER closure-audit task `MISSION_DRIVER:2026-08-07-133524-mission-driver`，独立 session，不复用执行者上下文）
- Evidence:
  - Phase 1 live（`packages/flux-renderers-industrial/src/editor/toolbox/`）：align-distribute.ts（150 行）+ z-order.ts（144 行）+ clipboard.ts（110 行）+ toolbox-panel.tsx（196 行）+ 4 配套单测（align-distribute/z-order/clipboard/toolbox-panel .test.ts/.test.tsx）；anti-hollow 核对：源码无 `return null`/空函数体/TODO，`tryCoalesce` + `coalesceGroup` + `DEFAULT_COALESCE_WINDOW_MS=500`（operation-coalesce.ts:22,41）真实实现。
  - 接线核对（anti-hollow）：`scada-editor-canvas.tsx:15` import EditorToolboxPanel + `:250` `props.regions.toolbox?.render(...) ?? <EditorToolboxPanel>` 真实渲染（runtime 可达）；`editor-test-handle.ts:93` `toolbox` 子句柄挂载（fit/center/zoomAt + align/distribute/toTop/toBottom + copy/cut/paste/getClipboard + exportConfig/importConfig + listSymbolLibrary）。
  - runtime 复用点不重复实现：grep 证实 toolbox 模块 import engine.fit/center/setViewport/zoomAt/getViewport + serialize/parse/validate + listScadaSymbols，无 runtime 命令面/serialize/registerScadaSymbol 重写（Failure Path `reuse-overclaim` 不触发）。
  - Phase 2 live（benchmark 复测）：`docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（59 行真实数据）—— ② per-call max 13.1ms <100ms / ① 拖拽 best 50.2fps @1k ≥30fps / ④ 内存 50.2MB ≤320MB，primary 包络三项硬数字全部达标余量充足；`envelope-below-candidate` 不触发；[E1.1-sg] 指针延迟抽查记录在案（1k 首次拖拽 jank ~7.5fps、稳态 50fps，维持 watch-only residual 非阻断）。可重复命令 `npx playwright test tests/e2e/scada-editor-perf.spec.ts --workers=1`。
  - 文档收尾 live：`docs/index.md:87` editor 篇导航 / `docs/references/quick-reference.md:822` scada-editor-canvas 组件表 / `flux-guide/design-patterns/scada-editor.md`（5632B）新增 / `docs/components/industrial-hmi-editor/design-toolbox.md:5` E9.1 实现收口标注 / `docs/components/examples.manifest.json:64` runtime 数组含 scada-editor-canvas。
  - roadmap 同步：`docs/components/roadmap-industrial-hmi-editor.md:3` 最后更新 2026-08-07 E9 + R7 待人工确认 / `:33` E9 记录条目 / `:70` Phase Status E9=planned（→ done 留待 E10 gate + closure-audit，本 plan closure-audit 现已通过；roadmap Phase Status E9 → done 的最终回写属 E10 gate 范围，对齐 roadmap 注释「→ done 留待 E10 gate + closure-audit」）。
  - daily log：`docs/logs/2026/08-07.md:3` E9 M3 工具箱完整 + 收尾记录条目。
  - workspace full-green：Closure Gates 记录 typecheck/build 32/32 ✓ + lint（turbo 32/32 ✓，`check-i18n-keys` 为预先存在 workspace 级 failure，经 git stash + checkout E8 commit d9763c63 核实 E9 新增 0 个 `flux.*` 键，非 E9 引入/范围）+ test 59/59 ✓（industrial 89 files / 1199 tests，coverage 90.25% branches ≥ 90% threshold）。
  - deferred 诚实核对：E10 整体 gate（out-of-scope improvement，successor E10.1/E10.2）/ InnerEditor（out-of-scope improvement，spike 约束 #8 + design-renderer §1 非目标）/ OS clipboard（out-of-scope improvement，design-toolbox T2）/ 断开连接工具 + 撤销历史面板 UI（out-of-scope improvement，design-connection §12.3 + design-undo-redo §4.5）——均带 Why Not Blocking Closure + Successor，无 in-scope live defect/contract drift 降级。
  - 五点一致性：Plan Status: completed / Phase 1+2 Status: completed / Phase 1+2 Exit Criteria: 全 [x] / Closure Gates: 全 [x] / Closure evidence: 本节真实数据——彼此一致，无残留未勾选 in-scope item。

Follow-up:

- 无剩余 plan-owned work。E10（M3 整体 gate + 整体收尾，独立 review）输入交接就绪：M3 实现 + benchmark 复测报告 + R7 待人工最终确认 + 文档收尾 + deferred 指向 InnerEditor/OS clipboard/断开连接工具 M3 后。
- roadmap Phase Status E9 → done 最终回写属 E10 gate 范围（roadmap 注释已声明此约束）。
- Non-blocking follow-ups（不属 plan-owned work）：[E1.1-sg] rAF fps 测量口径 nuance（E9.2 复测已抽查，维持 watch-only）/ InnerEditorEvent §5:122 枚举遗漏（watch-only）/ ActionSchema 编辑器（M3 后）。
