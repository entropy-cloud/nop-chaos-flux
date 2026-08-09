# 1 Editor Mission E7 M2 连线与 undo-redo

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/components/roadmap-industrial-hmi-editor.md`（E7 work items E7.1/E7.2、Phase Details E7、Work Items §E7 表、Phase Status E7=`todo`、Cross-Cutting 平台能力复用/双态隔离/spike 先行纪律/测试纪律/人工确认阈值/文档共识审查）、`docs/components/industrial-hmi/editor-initiation.md`（§2.1 连线 P1 M2 + undo-redo P1 M2 功能域 + §2.2 M2 里程碑边界「端点吸附连线 + 多选/框选 + undo-redo」+ §3 复用点 #1 引擎层 applyDiff 衔接扩展 + #4 序列化 diff 载荷 + §6 R4 内存上限）、`docs/components/industrial-hmi-editor/design-connection.md`（E2.3，端点吸附坐标模型 §4.1 + 三段式交互 §4.2 + 折线重拖 §4.3 + 联动算法 §4.5 + 实现拆分 §11）、`docs/components/industrial-hmi-editor/design-undo-redo.md`（E2.4，diff 命令栈 §4.1 + computeInverse §4.1.1 + 事务语义 §4.2 + group/ungroup 结构 diff §4.3 + 跨操作合并 §4.4 + 边界提示 §4.5 + 引擎层衔接 §4.6 + 实现拆分 §11）、`docs/components/industrial-hmi-editor/design-architecture.md`（E2.1，§4.5 编辑会话模型 + §4.6 事件派发链策略 + §8.5 句柄面扩展 group/ungroup/undo/redo）、`docs/components/industrial-hmi-editor/design-renderer.md`（E2.6，§8.5.2 编辑扩展 8 句柄 + §8.4 测试句柄 undoRedo/connection sub-handle）、`docs/plans/2026-08-07-0404-1-e6-m1-overall-gate.md`（E6 上游 gate，M1 收口 + deferred 项指向 E7）
> Related: `docs/plans/2026-08-06-1931-1-e5-m1-mvp-editor-implementation.md`（E5 M1 实现，被 E7 扩展）、`docs/plans/2026-08-07-0404-1-e6-m1-overall-gate.md`（E6 M1 gate，E7 前置已满足）、`docs/plans/2026-08-06-2118-1-e3-design-gate-review.md`（E3 设计 gate，6 份 design 契约权威输入）
> Mission: industrial-hmi-editor
> Work Item: E7

## Purpose

执行 industrial-hmi-editor mission 的 **E7 M2 连线与 undo-redo**：在 E5 M1 MVP 编辑器实现（双态切换 + 图元库 + 拖拽放置 + 属性面板 + 保存/加载 + 校验）基础上，落地 M2 里程碑——

1. **E7.1 端点吸附连线**（消费 design-connection.md）：pipe-junction 端点吸附（归一化 0..1 坐标，对齐 `pipe-junction.ts:8-14` ScadaPipeConnection）、`custom.connections` 声明写入（编辑器只写声明，不修改 runtime pipe-junction.ts）、折线重拖（端点重新吸附）、连接关系与图元移动联动（`recomputeConnectionAnchor` 联动算法重算 connection.x/y）。连线交互经编辑器适配层（与 Editor transform 模式互斥），不派发 `symbol:*` action（R5 隔离）。
2. **E7.2 undo-redo diff 命令栈**（消费 design-undo-redo.md）：diff 命令栈（forward + inverse 配对，**不存全量快照**，R4 内存约束严格满足）、`computeInverse(forward, prevSnapshot)` push 时预计算逆 diff、编辑操作→diff 事务语义（一次拖拽 = 一个 diff，transform 事件族节流起止帧，防逐属性 applyAttrs 泄漏）、跨操作合并（M2 基础：连续文本输入 ≤500ms 合并）+ 边界提示（栈空/栈满/截断 redo）、group/ungroup 结构 diff（addSymbol/removeSymbol 逆运算）、多选/框选交互（Editor selectArea + `selectKeep:true`，spike 约束 #6）、group/ungroup 句柄。

E7 是编辑器 mission 的**第二个实现里程碑**：E0–E6 全部为 E7 的前置输入；E7 完成后 E8（M2 gate，独立 review）才可推进。E7 不实现工具箱对齐分布/复制粘贴/图元库管理（M3/E9）、不做编辑态性能最终 benchmark 复测（E9.2）。

## Current Baseline

- **E5 M1 实现已落地 + E6 gate 已收口**（roadmap Phase Status E5=`done` E6=`done`，两 plan 均 `completed`）：`packages/flux-renderers-industrial/src/editor/` 含完整 M1 实现——
  - **编辑态画布 + 双态切换**：`renderer/editor-engine.ts`（leafer App + Editor 装配，ground/tree/sky 三层 + viewport）；`editor-session.ts` `ScadaEditorSession`（workingConfig/committedBaseline/selection/mode，**M1 子集——无 undoStack/redoStack，canUndo/canRedo 恒 false**，:20 注释明确「undo-redo 属 E7.2 落地」）；`editor-adapter.ts`（Editor 事件族抽纯 payload+nodeId + transform 节流起止帧**占位**，M1 单选场景骨架）；`editor-test-handle.ts`（`__flux_scada_editor_<cid>` session 投影 + editor/engine/app + switchMode/setSelection/save/load）。
  - **图元库 + 拖拽放置 + 属性面板 + 句柄**：`palette/editor-palette.tsx`（24 内置只读）；`inspector/`（schema-extractor 六类分组 + inspector-field/panel UI + validate 衔接）；`renderer/hooks/use-editor-handles.ts` `EDITOR_HANDLE_METHODS` = addSymbol/removeSymbol/updateSymbol/save/load（**M1 子集——无 group/ungroup/undo/redo**）。
  - **E6 gate 修正已落地**：4 项 Minor（m-1 NativeSelect / m-2 regions consult / m-3 onSessionChange 四字段 / m-4 移除 Switch Preview 按钮）全落地 + focused 测试。
  - **测试基线**：industrial 包 71 files / 927 tests pass；typecheck/build/lint/test 全 green（32/32 + 59/59）。
- **设计契约已稳定（E7 审查/实现对照基线）**：6 份 design-\*.md 全部经 E3 设计 gate `pass-with-minors` + 共识审查达成。E7 直接消费 2 份新设计 + 2 份既有设计：
  - `design-connection.md`（E2.3）：端点吸附坐标模型（§4.1 归一化 0..1 + 边缘吸附 0/0.5/1 三档位）、三段式交互（§4.2 端点拾起/拖动吸附/释放写入）、折线重拖（§4.3）、联动算法 `recomputeConnectionAnchor`（§4.5 纯逻辑）、实现拆分（§11：anchor-snap.ts / connection-adapter.ts / connection-link.ts / connection-overlay.ts）。
  - `design-undo-redo.md`（E2.4）：diff 命令栈 forward+inverse 配对（§4.1，**无 prevSnapshot 全量快照**，R4 严格满足）、`computeInverse` push 时预计算（§4.1.1）、事务语义（§4.2 transform 节流起止帧）、group/ungroup 结构 diff（§4.3）、跨操作合并 M2 基础（§4.4）、边界提示（§4.5）、引擎层衔接方案 A 扩展（§4.6）、实现拆分（§11：compute-inverse.ts / undo-stack.ts / operation-coalesce.ts / undo-redo-adapter.ts）。
  - `design-architecture.md`（E2.1）§8.5：句柄面扩展 group/ungroup/undo/redo 声明。
  - `design-renderer.md`（E2.6）§8.5.2：编辑扩展 8 句柄完整签名（addSymbol/removeSymbol/updateSymbol/group/ungroup/undo/redo/save/load）+ §8.4 测试句柄 undoRedo/connection sub-handle。
- **runtime 复用点（E7 直接消费，禁止重复实现）**：
  - 引擎层 `engine/scada-engine.ts` applyDiff（增量应用，undo/redo 经 applyDiff 应用 forward/inverse；**E7 扩展 undo/redo 句柄经 applyDiff，不改 runtime 命令面**）；
  - 序列化面 `serialization/diff.ts` `diffScadaConfig`（forward diff 计算，已落地）+ `config-types.ts` `ScadaConfigDiff`（added/removed/updated/variables，undo 栈载荷复用）+ `config-adapter.ts` nodeById O(1)（computeInverse 经 nodeById 提取原值）；
  - 图元定义 `symbols/pipe/pipe-junction.ts`（I9.4 已落地 ScadaPipeConnection 结构 :8-14 + create 经 props.custom?.connections 读取渲染 stub :73-89）——**E7.1 只写 custom.connections 声明，不修改 pipe-junction.ts**；
  - hit 命中 `engine/hit.ts` getByPoint（端点吸附候选查询）+ InteractionOverlay 模式（吸附高亮，design-engine.md §6）；
  - 编辑会话模型 `editor-session.ts`（E7 扩展：新增 undoStack/redoStack，canUndo/canRedo 从恒 false 改为栈长度派生）。
- **E6 deferred 项（明确属 E7）**：undo-redo 命令栈 + undo/redo 句柄 → E7.2（本 plan）；连线 pipe-junction → E7.1（本 plan）；多选/框选 + group/ungroup → E7.2/E7（本 plan）。
- **watch-only residual（E7 保持感知，非阻断）**：`[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（大规模选区首次拖拽 simulateTarget 初始化延迟）——E7.2 多选实现时对「大规模选区首次拖拽」保持感知，必要时建议 E9.2 加测项。
- **真实剩余 gap**：无连线交互（端点吸附/折线重拖/联动）；无 undo-redo 命令栈（编辑操作不可撤销/重做，canUndo/canRedo 恒 false）；无多选/框选（仅单选）；无 group/ungroup 句柄；适配层 transform 节流为骨架占位（M1 单选场景），需完善事务语义入栈；editor-session.ts 无 undoStack/redoStack 字段。

## Goals

- **E7.1 端点吸附连线**：`connection/` 子目录落地 4 模块（anchor-snap.ts 端点吸附算法 + connection-link.ts `recomputeConnectionAnchor` 联动算法 + connection-adapter.ts 端点拾起/拖动/释放交互 + connection-overlay.ts 吸附高亮/虚线提示）；连线交互经适配层写入 `custom.connections` 声明（`updateSymbol` 句柄）；`recomputeConnectionAnchor` 纯逻辑单测先行（目标设备移动时 connection.x/y 视觉跟随）；connection 测试句柄 sub-handle（connect/disconnect/listConnections）；连线 e2e（经测试句柄断言 working copy connections 结构，禁截图判定）。
- **E7.2 undo-redo diff 命令栈**：`undo-redo/` 子目录落地 4 模块（compute-inverse.ts push 时预计算逆 diff + undo-stack.ts 栈管理 push/pop/深度上限 100 + operation-coalesce.ts M2 基础合并 + undo-redo-adapter.ts 事务语义 + 节流起止帧入栈）；编辑会话模型扩展（undoStack/redoStack，canUndo/canRedo = 栈长度派生）；undo/redo 句柄注册（`component:undo()`/`component:redo()`）；undoRedo 测试句柄 sub-handle（undo/redo/getStackState/pushUndo）；事务语义落地（一次拖拽 = 一个 diff，transform 事件族节流起止帧，防逐属性泄漏）；**R4 内存约束严格满足**（栈元素只持 forward + inverse 两条增量 diff，不存全量快照）；undo/redo e2e（undo/redo 后 working copy 一致性，`forward ∘ inverse = identity`）。
- **E7.2 多选/框选 + group/ungroup**：多选/框选交互（Editor selectArea + `selectKeep:true`，spike 约束 #6；适配层 selection 多 nodeId）；group/ungroup 句柄（`component:group(nodeIds)`/`component:ungroup(groupId)`，结构 diff + nodeId 不变仅 parentContext 变化）；group/ungroup 入 undo 栈（结构 diff 的逆经 computeInverse 自动处理）；多选 + group/ungroup e2e。
- roadmap Phase Status 回写（E7: `todo` → `planned` 本 plan 激活时；→ `done` 留待 E8 gate + closure-audit 通过）；daily log 记录。

## Non-Goals

- **不实现工具箱对齐/分布/层级/复制粘贴/图元库管理/导入导出完善**（M3/E9.1）：design-toolbox.md 能力属 E9。
- **不做撤销深化**（跨操作合并策略 M3 完善 / 用户可配置合并窗口 / 撤销历史面板 UI）：design-undo-redo.md §4.4 明确「M2 基础合并 + M3 完善」；本 plan 只落地 M2 基础合并（连续文本输入 ≤500ms 合并）+ 边界提示。
- **不做「断开连接」工具 / dangling connection 批量清理 / 多 connection 批量编辑**（M3/E9）：design-connection.md §12.3 后续阶段；本 plan 端点释放到空白区默认恢复原 connection（M2 默认行为）。
- **不做编辑态性能最终 benchmark 复测**（E9.2）：E7 实现对齐包络约束（节流/不每帧入栈/无全量快照泄漏），但 benchmark 复测 + R7 数字最终确认属 E9.2 + 人工。
- **不修改 runtime `scada-canvas` renderer / runtime 复用点面**（E7 只在 `src/editor/` subpath 内实现 + 扩展 editor-session.ts 域内部模型；runtime 面 pipe-junction.ts / diff.ts / scada-engine.ts 只读消费）。
- **不变更选型主路径**（路径 A leafer-editor，E1 已裁定；E7 只消费 spike 验证结论——多选框选经 Editor selectArea、group/ungroup 经 Editor group/ungroup 事件族）。
- **不做 InnerEditor（文本双击编辑）**（依赖 `@leafer-in/text-editor` 插件，spike 约束 #8；design-renderer.md §1 非目标——M2 后可选项）。
- **不做 M2 交付边界最终裁定**（属 E8.2 gate，E7 按文档化 M2 边界实现，E8 确认）。

## Scope

### In Scope

- **E7.1 端点吸附连线**：
  - `Proof`：前置验证——核对 E6 `done`（roadmap E6 = `done`，E6 plan `completed` + closure-audit PASS）；核对 `pipe-junction.ts` ScadaPipeConnection 结构 live 一致（design-connection.md §4.1 Round 1 共识核对结论）；未就绪则等待。
  - `Fix`：`connection/anchor-snap.ts`——端点吸附算法（归一化 0..1 坐标 + 边缘吸附 0/0.5/1 三档位 + 吸附阈值 ±N px + 吸附候选查询经 hit.ts getByPoint）；纯逻辑（无 React 依赖），**单测先行**（归一化点计算 / 边缘吸附档位 / 候选查询 / 多端点场景）。
  - `Fix`：`connection/connection-link.ts`——`recomputeConnectionAnchor` 联动算法（目标设备移动时重算 connection.x/y 让 stub 视觉跟随，design-connection.md §4.5）；纯逻辑，**单测先行**（含 C1 风险：归一化点超出 [0,1] 不钳制）。
  - `Fix`：`connection/connection-adapter.ts`——端点拾起/拖动/释放三段式交互（design-connection.md §4.2）：pointerdown 进入「端点拖动模式」（与 Editor transform 模式互斥）→ pointermove 计算吸附候选 → pointerup 写入 `connection.target/x/y` 经 `updateSymbol` 句柄；折线重拖（端点拾起路径，起始 connection 为已有，design-connection.md §4.3）；图元移动联动（Editor move 事件 → 节流起止帧 → `recomputeConnectionAnchor` 重算 → updateSymbol 写回）；**不派发 `symbol:*` action**（R5 隔离）；适配层维护「当前编辑中的 connectionId」（单一活动端点拖动，C3 防护）。
  - `Fix`：`connection/connection-overlay.ts`——吸附高亮（候选图元边缘归一化点圆点 + tooltip）+ 端点拖动虚线提示（pointer→候选的临时连线）；经 InteractionOverlay 模式渲染在编辑器 sky 层（screen 坐标系，design-connection.md §6）；**不入组态 JSON**（编辑会话临时态）。
  - `Fix`：connection 测试句柄 sub-handle（design-connection.md §8.3：connect/disconnect/listConnections 含 dangling 标记），挂 `window.__flux_scada_editor_<cid>.connection`。
  - `Fix`：connection.id 自动生成唯一性（`${junctionId}-conn-${index}`，C4 防护 + validate 校验）。
  - `Proof`：连线 e2e（经测试句柄 connect → 断言 working copy custom.connections 结构 / listConnections 返回；折线重拖 → 新 target 写入；目标设备移动 → connection.x/y 经联动算法重算；禁截图判定）。
- **E7.2 undo-redo diff 命令栈**：
  - `Fix`：`undo-redo/compute-inverse.ts`——`computeInverse(forward, prevSnapshot)` 纯逻辑（design-undo-redo.md §4.1.1：forward.added→inverse.removed / forward.removed→inverse.added 从 prevSnapshot 提取 / forward.updated→inverse.updated 反推原值）；**push 时调用**（prevSnapshot 可用），返回后 prevSnapshot 不再被栈引用；经 nodeById O(1) 提取原值；纯逻辑，**单测先行**（含 U4：forward.apply ∘ inverse.apply = identity 往返一致性 / group-ungroup 结构逆 / variables 逆）。
  - `Fix`：`undo-redo/undo-stack.ts`——`UndoStackEntry` 栈管理（forward + inverse 配对 + operationKind + timestamp 元数据，**无 prevSnapshot 字段**）；push（入栈时 computeInverse 预计算）/ pop undoStack → apply inverse → entry 原样推入 redoStack（**不调换字段**）/ pop redoStack → apply forward → 推回 undoStack；深度上限 100（满栈丢弃最旧，U7）；canUndo/canRedo/undoStackDepth 派生；纯逻辑，**单测先行**（含 undo-of-redo / redo-of-undo 对称性 / 截断 redo / 深度上限）。
  - `Fix`：`undo-redo/operation-coalesce.ts`——M2 基础合并规则（design-undo-redo.md §4.4：同 nodeId + 同字段 + 时间窗口 ≤500ms 的 update-symbol 合并为 1 个 diff；连续 transform/connection 不合——每 pointerup 独立事务）；纯逻辑，**单测先行**（合并命中 / 不合场景）。
  - `Fix`：`undo-redo/undo-redo-adapter.ts`——事务语义 + 节流起止帧入栈：transform 事件族监听 `editor.before_<op>` 起始 → 累计期间 `editor.<op>` 帧 → pointerup 计算 `diffScadaConfig(prevAtOpStart, current)` → 入栈 1 个 diff（operationKind=transform-<op>）；高频每帧 `editor.move/scale/rotate/skew` **不入栈**（只更新 working copy + Editor 选区视觉）；add/remove/update-symbol 经句柄触发入栈；connection-update（端点释放）+ connection-link（图元移动联动）入栈；group/ungroup 入栈（结构 diff）；property-edit 经 update-symbol 去抖入栈（operation-coalesce 合并）；**防逐属性 applyAttrs 泄漏**（事务期间只更新 working copy，事务终止一次性 diff 入栈）。
  - `Fix`：`editor-session.ts` 扩展——新增 `undoStack: UndoStackEntry[]` + `redoStack: UndoStackEntry[]`；`projectSessionChange` canUndo/canRedo 从恒 false 改为 `undoStack.length > 0` / `redoStack.length > 0`（**接口签名不变，E6 m-3 已派发四字段，E7 改 canUndo/canRedo 语义从恒 false 到真实派生**）；resetSession（load）清空 undoStack/redoStack。
  - `Fix`：undo/redo 句柄注册（`use-editor-handles.ts` 扩展 `component:undo()`/`component:redo()`，design-renderer.md §8.5.2）；undo → pop undoStack apply inverse（经 engine.applyDiff）/ redo → pop redoStack apply forward；错误码 `no-undo`/`no-redo`。
  - `Fix`：undoRedo 测试句柄 sub-handle（design-undo-redo.md §8.3：undo/redo/getStackState/pushUndo），挂 `window.__flux_scada_editor_<cid>.undoRedo`。
  - `Proof`：undo-redo e2e（拖拽图元 → undo → 几何回退 / redo → 几何恢复；add/remove symbol → undo 恢复；多步 undo/redo 往返一致性；undo 后新操作截断 redo；边界提示栈空/栈满）。
- **E7.2 多选/框选 + group/ungroup**：
  - `Fix`：多选/框选交互——Editor `selectArea`（框选）+ `selectKeep:true`（释放不清空选区，spike 约束 #6）+ 多选 nodeId 维护（editor-session selection 从 ≤1 扩展为多 nodeId）；适配层多选事件处理（Editor 多选 → selection 更新 + onSessionChange 派发）。
  - `Fix`：group/ungroup 句柄（`component:group(nodeIds)`/`component:ungroup(groupId)`，design-undo-redo.md §4.3 + design-renderer.md §8.5.2）：group → removed=子图元 id / added=新 Group 节点（含 children）/ nodeId 不变仅 parentContext 变化；ungroup 逆；错误码 `empty-selection`/`not-a-group`；group/ungroup 经 Editor group/ungroup 事件族触发（spike §2.2 ⑤）。
  - `Fix`：group/ungroup 入 undo 栈（结构 diff，computeInverse 自动处理逆）；适配层监听 `editor.group`/`editor.ungroup` 事件 → 入栈 operationKind=group/ungroup。
  - `Proof`：多选 + group/ungroup e2e（框选多图元 → selection 多 nodeId / group → 新 Group 节点 + 子图元移出顶层 / ungroup → 子图元回升顶层 / group→ungroup undo 往返）。
- **roadmap + daily log 回写**：roadmap 头部记录 + Phase Status E7；`docs/logs/2026/08-07.md`（或 08-08 视执行日）记录。

### Out Of Scope

- 工具箱对齐/分布/层级/复制粘贴/图元库管理/导入导出完善（M3/E9.1）。
- 撤销深化（跨操作合并策略 M3 完善 / 用户可配置合并窗口 / 撤销历史面板 UI，M3/E9.1）。
- 「断开连接」工具 / dangling connection 批量清理 / 多 connection 批量编辑（M3/E9）。
- 编辑态性能 benchmark 复测 + R7 数字最终确认（E9.2 + 人工）。
- InnerEditor（文本双击编辑，M2 后可选项）。
- runtime `scada-canvas` renderer / pipe-junction.ts / diff.ts / scada-engine.ts 行为变更（E7 只读消费 runtime 面）。
- M2 交付边界最终裁定（E8.2 gate）。
- ActionSchema 编辑器（事件 action 的 ActionSchema 编辑，M3/E9）。

## Failure Paths

| 可测场景编号               | 触发                                                                                                                                                       | 行为（含状态码/错误码）                                                                                                                                                      | 可重试 | 用户可见表现                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------- |
| upstream-not-ready         | E7 执行时 E6 未 `done`（roadmap E6 ≠ `done`）或设计契约未稳定（E3 gate 未通过）                                                                            | E7 暂停等待；不跳序执行                                                                                                                                                      | 否     | roadmap E6 仍非 `done`；E7 暂停                     |
| undo-mem-leak (R4)         | undo 栈元素存储全量 `prevSnapshot`（10 万图元 ≈ 11.6MB/份，100 份 ≈ 1.16GB）                                                                               | 视为 live defect（R4 硬约束）；修复——栈元素只持 forward + inverse 两条增量 diff（push 时 computeInverse 预计算后 prevSnapshot 丢弃）；compute-inverse 单测断言无全量快照字段 | 否     | （修复后）栈元素仅含增量 diff；内存 ≈100KB 量级     |
| undo-inversion-broken      | undo/redo 后 working copy 与期望不一致（computeInverse 计算错误 / redo swap 字段错误 / 结构 diff 逆错误）                                                  | 视为 live defect（design-undo-redo.md U3/U4）；修复——单测覆盖 forward.apply ∘ inverse.apply = identity + group→ungroup 往返 + undo-of-redo 对称性                            | 否     | （修复后）undo/redo 往返 working copy 一致          |
| transform-stack-explosion  | transform 事件族逐帧入栈（editor.move 8 帧/缩放 10 帧 → 栈爆炸 + 撤销粒度过细）                                                                            | 视为 live defect（design-undo-redo.md U2 + spike §2.5）；修复——事务语义节流起止帧（before\_<op> 起始 → pointerup 终止，累计 1 个 diff）                                      | 否     | （修复后）一次拖拽 = 一个 undo 步                   |
| dual-state-leak (R5)       | 连线/undo-redo 操作污染运行态（适配层派发 `symbol:*` action / 编辑态连线触发运行事件 / undo 经 engine 直改下游 config）                                    | 视为 live defect（R5 硬约束）；立即修复；e2e 断言 edit 模式不派发 symbol:click                                                                                               | 否     | （修复后）编辑态操作不触发运行事件                  |
| reuse-overclaim            | E7 重新实现了 runtime 已落地能力（diff 计算 / applyDiff / pipe-junction create / hit 命中 / InteractionOverlay）                                           | 视为 live defect（roadmap Cross-Cutting 平台能力复用）；改为复用 runtime 面                                                                                                  | 否     | （修复后）editor 代码 import runtime 面，无重复实现 |
| design-contract-conflict   | E7 实现期发现与 design-connection.md / design-undo-redo.md 契约冲突                                                                                        | 记录冲突 + 按 design-renderer.md §12.2 `design-contract-conflict` 升级：小修就地修契约（记录于 daily log）；范围/契约重大变更标记人工确认                                    | 否     | 冲突记录在案；契约或实现修正后一致                  |
| connection-anchor-mismatch | 联动算法 recomputeConnectionAnchor 与 runtime pipe-junction create stub 端点计算不一致（design-connection.md §4.1 核对：`connection.x * width - centerX`） | 视为 live defect；修复——对齐 pipe-junction.ts:83 算术                                                                                                                        | 否     | （修复后）联动后 stub 视觉准确跟随目标设备          |

> **人工确认阈值核对**：roadmap「人工确认阈值」固定项为 R1（选型变更，不触发）/ `scada-editor-canvas` 公共契约重大变更 / R7（包络数字，E9.2）/ 共识循环超 3 轮 / M2 交付边界确认（属 E8.2 gate）/ 范围级变更。E7 按文档化 M2 边界实现；editor-session.ts 扩展 undoStack/redoStack + canUndo/canRedo 语义从恒 false 改为真实派生属**计划内契约补全**（E5/E6 明确「undo-redo 属 E7.2 落地」，canUndo/canRedo 字段 E6 m-3 已派发四字段仅值恒 false），非「重大变更」；group/ungroup/undo/redo 句柄属 design-renderer.md §8.5.2 已定型契约的**计划内补全**。若 E7 期间发现需改已定型契约 → 触发 `design-contract-conflict` + 人工确认。故 E7 全程 AI 可执行，除非触发上表 Failure Path 或 E8 gate 裁定。

## Test Strategy

本档选择：`必须自动化`

undo-redo 是核心回归路径（命令栈正确性 + 事务语义 + R4 内存约束）+ 连线联动算法是组态核心交互（端点吸附坐标 + 目标设备移动跟随）。两者均有非显而易见的根因风险（computeInverse 配对一致性 / 节流起止帧事务边界 / 归一化坐标换算）、跨模块（适配层↔编辑会话↔引擎 applyDiff）、且 design-undo-redo.md U1–U7 风险清单 + design-connection.md C1–C5 风险清单均要求 focused verification。故：

- **纯逻辑层单测先行**（Proof 项在 Fix 之前）：anchor-snap.ts / connection-link.ts / compute-inverse.ts / undo-stack.ts / operation-coalesce.ts——纯逻辑无 React 依赖，单测覆盖正确结果（非仅"不抛错"）。
- **canvas 渲染层走 Playwright 程序化断言**：连线 e2e / undo-redo e2e / 多选+group/ungroup e2e 经测试句柄 `__flux_scada_editor_<cid>` 读 working copy / connections / undoStack 深度断言（**禁截图判定**，禁 node-canvas，roadmap 测试纪律）。
- Closure Gates 跑全量 `pnpm typecheck/build/lint/test`。

## Execution Plan

> 3 Phase 顺序：Phase 1 E7.1 端点吸附连线（消费 design-connection.md）→ Phase 2 E7.2 undo-redo diff 命令栈（消费 design-undo-redo.md，建立命令栈基础，接通 M1 全部编辑操作 + E7.1 连线操作入栈）→ Phase 3 E7.2 多选/框选 + group/ungroup（消费 undo 命令栈 + Editor 多选原语）。Phase 2/3 依赖 Phase 1 连线操作 kind + Phase 2 命令栈。

### Phase 1 - E7.1 端点吸附连线

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/connection/`（新建子目录）、`packages/flux-renderers-industrial/src/editor/editor-test-handle.ts`（connection sub-handle 扩展）

- Item Types: `Proof | Fix`

- [x] `Proof`：前置验证——核对 E6 `done`（roadmap Phase Status E6 = `done`，E6 plan `Plan Status: completed`，closure-audit PASS）；核对 `pipe-junction.ts` ScadaPipeConnection 结构 live 一致（`:8-14` 字段 + `:73-89` create 流程）；核对 hit.ts getByPoint 命中 API；未就绪则等待（Failure Paths `upstream-not-ready`）。
- [x] `Proof`：`connection/anchor-snap.ts` 端点吸附算法**单测先行**——归一化 0..1 坐标计算 + 边缘吸附 0/0.5/1 三档位 + 吸附阈值 ±N px + 吸附候选查询（经 hit.ts getByPoint bounding box 预检）+ 多端点场景；纯逻辑无 React 依赖（design-connection.md §4.1 + §4.2 b）。单测断言可观测结果（归一化点值 / 吸附档位命中 / 候选 nodeId）。
- [x] `Proof`：`connection/connection-link.ts` `recomputeConnectionAnchor` 联动算法**单测先行**——目标设备移动时重算 connection.x/y 让 stub 视觉跟随（design-connection.md §4.5）；含 C1 风险验证（归一化点超出 [0,1] 不钳制）；纯逻辑。单测断言 stub 终点世界坐标 = 目标设备锚点世界坐标。
- [x] `Fix`：`connection/connection-adapter.ts` 端点拾起/拖动/释放三段式交互（design-connection.md §4.2）：pointerdown 进入「端点拖动模式」（与 Editor transform 模式互斥，记录起始 connection + junctionId）→ pointermove 计算吸附候选（anchor-snap）→ pointerup 写入 `connection.target/x/y` 经 `updateSymbol` 句柄；折线重拖（§4.3，起始为已有 connection，释放到空白默认恢复）；图元移动联动（Editor move 事件 → 节流起止帧 → recomputeConnectionAnchor 重算 → updateSymbol 写回）；**不派发 `symbol:*` action**；维护「当前编辑中的 connectionId」（C3 单一活动端点）；connection.id 自动生成（`${junctionId}-conn-${index}`，C4）。
- [x] `Fix`：`connection/connection-overlay.ts` 吸附高亮 + 端点拖动虚线提示（design-connection.md §6）——经 InteractionOverlay 模式渲染在编辑器 sky 层（screen 坐标系）；吸附候选时圆点 + tooltip「吸附到 <id>」；端点拖动期间 pointer→候选虚线；**不入组态 JSON**（编辑会话临时态）。
- [x] `Fix`：connection 测试句柄 sub-handle（design-connection.md §8.3：`connect`/`disconnect`/`listConnections` 含 dangling 标记），挂 `window.__flux_scada_editor_<cid>.connection`。
- [x] `Proof`：连线 e2e（Playwright 程序化断言经测试句柄）：connect → 断言 working copy custom.connections 结构（target/x/y/direction）+ listConnections 返回；折线重拖 → 新 target 写入覆盖原；目标设备移动 → connection.x/y 经联动算法重算（stub 视觉跟随）；**禁截图判定**。

Exit Criteria:

> Phase 1 交付连线交互 + 连线纯逻辑单测 + 连线 e2e。连线操作此刻写 working copy 但尚未入 undo 栈（undo 栈属 Phase 2），属预期分阶段落地。

- [x] `connection/` 4 模块（anchor-snap/connection-link/connection-adapter/connection-overlay）落地，纯逻辑模块（anchor-snap + connection-link）单测 green。
- [x] 连线经 `updateSymbol` 句柄写入 `custom.connections` 声明，**不修改 runtime pipe-junction.ts**（grep 证实 E7 无 pipe-junction.ts 改动）。
- [x] 连线 e2e 经测试句柄断言 working copy connections 结构（非截图判定）；连线操作不派发 `symbol:*` action（R5 隔离 e2e 断言）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` green + `pnpm --filter @nop-chaos/flux-renderers-industrial test` green（Phase 1 新增测试通过，后续 Phase 依赖的局部验证）。

### Phase 2 - E7.2 undo-redo diff 命令栈

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/undo-redo/`（新建子目录）、`packages/flux-renderers-industrial/src/editor/editor-session.ts`（扩展 undoStack/redoStack + canUndo/canRedo 真实派生）、`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-handles.ts`（undo/redo 句柄）、`packages/flux-renderers-industrial/src/editor/editor-test-handle.ts`（undoRedo sub-handle）

- Item Types: `Proof | Fix`

- [x] `Proof`：`undo-redo/compute-inverse.ts` `computeInverse(forward, prevSnapshot)` **单测先行**——forward.added→inverse.removed / forward.removed→inverse.added（从 prevSnapshot 经 nodeById 提取）/ forward.updated→inverse.updated（反推原值 patch）/ variables 逆；含 U4 往返一致性（forward.apply ∘ inverse.apply = identity）+ group-ungroup 结构逆；纯逻辑。单测断言逆 diff 字段值精确。
- [x] `Proof`：`undo-redo/undo-stack.ts` 栈管理**单测先行**——push（入栈时 computeInverse 预计算）/ undo（pop undoStack apply inverse → entry 原样推 redoStack，**不调换字段**）/ redo（pop redoStack apply forward → 推回 undoStack）/ 深度上限 100（满栈丢弃最旧）/ canUndo/canRedo/undoStackDepth 派生；含 undo-of-redo / redo-of-undo 对称性 + 截断 redo；栈元素**无 prevSnapshot 字段**（U1 R4 内存约束单测断言）。纯逻辑。
- [x] `Proof`：`undo-redo/operation-coalesce.ts` M2 基础合并**单测先行**——同 nodeId + 同字段 + ≤500ms 的 update-symbol 合并为 1 个 diff；连续 transform/connection 不合（每 pointerup 独立事务）；纯逻辑。单测断言合并命中 / 不合场景。
- [x] `Fix`：`undo-redo/undo-redo-adapter.ts` 事务语义 + 节流起止帧入栈——transform 事件族（editor.before_move/scale/rotate/skew 起始 → pointerup 终止，累计 1 个 diff，operationKind=transform-<op>）；高频每帧 editor.move/scale/rotate/skew **不入栈**；add/remove/update-symbol 经句柄触发入栈（update-symbol 经 operation-coalesce 去抖合并）；connection-update（端点释放，Phase 1 产）+ connection-link（图元移动联动）入栈；**防逐属性 applyAttrs 泄漏**（事务期间只更新 working copy，事务终止 diffScadaConfig + 入栈）。
- [x] `Fix`：`editor-session.ts` 扩展——新增 `undoStack: UndoStackEntry[]` + `redoStack: UndoStackEntry[]`（域内部 ref，不进 scope）；`projectSessionChange` canUndo/canRedo 从恒 false 改为 `undoStack.length > 0` / `redoStack.length > 0`（接口签名不变，E6 m-3 已派发四字段）；`resetSession`（load）清空两栈（design-undo-redo.md §8.2 编辑历史不保留）。**undo-redo 命令栈归属编辑会话模型域核心（design-undo-redo.md §3 + §4.6 两方案契约一致，差异仅在引擎类结构）——本 plan 将栈落 editor-session 而非 runtime scada-engine，属 §4.6 方案 A 的 conformant realization（编辑器域持有栈，undo/redo 经 runtime applyDiff 应用，不改 runtime 命令面）。**
- [x] `Fix`：undo/redo 句柄注册（`use-editor-handles.ts` 扩展 `component:undo()`/`component:redo()`）——undo → pop undoStack apply inverse（经 engine.applyDiff）/ redo → pop redoStack apply forward；错误码 `no-undo`/`no-redo`（design-renderer.md §8.5.2）。
- [x] `Fix`：undoRedo 测试句柄 sub-handle（design-undo-redo.md §8.3：undo/redo/getStackState/pushUndo），挂 `window.__flux_scada_editor_<cid>.undoRedo`。
- [x] `Proof`：undo-redo e2e（Playwright 程序化断言）：拖拽图元 → undo → 几何回退 / redo → 恢复；add/remove symbol → undo 恢复；连续文本输入合并为 1 步；多步 undo/redo 往返一致性（forward ∘ inverse = identity）；undo 后新操作截断 redo；边界提示（栈空 canUndo=false / 栈满丢弃最旧）；connection 操作 undo 往返（Phase 1 连线 + Phase 2 入栈接通）。

Exit Criteria:

> Phase 2 交付 undo-redo 命令栈基础 + 接通 M1 全部编辑操作 + Phase 1 连线操作入栈。undo/redo 句柄可用，canUndo/canRedo 真实派生。R4 内存约束经单测证明（栈元素无全量快照）。

- [x] `undo-redo/` 4 模块（compute-inverse/undo-stack/operation-coalesce/undo-redo-adapter）落地，纯逻辑模块单测 green（含 U1–U4 往返一致性 + R4 无全量快照断言）。
- [x] `editor-session.ts` undoStack/redoStack 落地；`projectSessionChange` canUndo/canRedo 真实派生（非恒 false）；undo/redo 句柄经 engine.applyDiff 应用 forward/inverse。
- [x] transform 事务语义落地（一次拖拽 = 一个 undo 步，非逐帧入栈）；M1 编辑操作（transform/add/remove/update）+ Phase 1 连线操作（connection-update/connection-link）均入栈。
- [x] undo-redo e2e 经测试句柄断言 working copy 一致性 + undoStack 深度（非截图判定）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` + `test` green。

### Phase 3 - E7.2 多选/框选 + group/ungroup

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/renderer/editor-adapter.ts`（多选/框选 + group/ungroup 事件）、`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-handles.ts`（group/ungroup 句柄）、`packages/flux-renderers-industrial/src/editor/editor-session.ts`（selection 多 nodeId）

- Item Types: `Fix | Proof`

- [x] `Fix`：多选/框选交互——Editor `selectArea`（框选）+ `selectKeep:true`（释放不清空选区，spike 约束 #6）+ editor-session selection 从 ≤1 扩展为多 nodeId；适配层多选事件处理（Editor 多选 → selection 更新 + onSessionChange 派发完整四字段）。
- [x] `Fix`：group/ungroup 句柄（`component:group(nodeIds)`/`component:ungroup(groupId)`，design-undo-redo.md §4.3）——group → removed=子图元 id / added=新 Group 节点（含 children，type=`scada-group`）/ nodeId 不变仅 parentContext 变化；ungroup 逆；错误码 `empty-selection`/`symbol-not-found`/`not-a-group`（type !== 'scada-group'，design-renderer.md §8.5.2）；**执行前核对 `scada-group` type 在 symbol-registry 的注册状态**（24 内置含 group，确认实际 type 名 + create 路径，必要时经 symbol-registry 注册）。
- [x] `Fix`：group/ungroup 入 undo 栈（结构 diff，computeInverse 自动处理逆）——适配层监听 `editor.group`/`editor.ungroup` 事件（spike §2.2 ⑤）→ 入栈 operationKind=group/ungroup。
- [x] `Proof`：多选 + group/ungroup e2e（Playwright 程序化断言）：框选多图元 → selection 多 nodeId；group → 新 Group 节点 + 子图元移出顶层 symbols（经测试句柄读 working copy）；ungroup → 子图元回升顶层；group→ungroup undo 往返一致性；**禁截图判定**。

Exit Criteria:

> Phase 3 交付多选/框选 + group/ungroup，M2 里程碑全部能力就绪。多选 + group/ungroup 入 undo 栈，M2 编辑操作全集可撤销。

- [x] 多选/框选落地（框选多图元 → selection 多 nodeId，selectKeep:true 释放不清空）；group/ungroup 句柄 + 结构 diff 入栈。
- [x] 多选 + group/ungroup e2e 经测试句柄断言 working copy 结构（Group 节点 children / 子图元 parentContext）；group→ungroup undo 往返一致。
- [x] `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck` + `test` green。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh sub-agent（general，round 1，task `ses_0272d4b55ffevvjZHsXG6yP3jy`）
- Verdict: `pass`（round 1 即达成共识，0 Blocker / 0 Major / 3 Minor / 1 Nit）
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major——**Minor（不阻塞，已落地以利执行者）**：**m-1** design-undo-redo.md §4.6 方案 A 代码示例（pushUndo/undo/redo on ScadaCanvasEngine）可能误导执行者以为栈落 runtime scada-engine → Phase 2 editor-session 扩展项补 §4.6-conformant realization 说明（栈落编辑会话域，经 runtime applyDiff 应用，不改 runtime 命令面）；**m-2** group/ungroup 错误码遗漏 `symbol-not-found` → Phase 3 补齐 + 标注 `not-a-group` 条件（type !== 'scada-group'）；**m-3** Phase 3 引用 `type='scada-group'` 未核对注册状态 → Phase 3 补「执行前核对 symbol-registry 注册状态」前置。**Nit（不记）**：design-renderer.md §8.5.2「8 句柄」实列 9 方法名（undo/redo 同行），属既有设计文档约定非 plan 错误。**Reference accuracy**：10 项 live-repo claim 全部 verified accurate（editor-session.ts M1 状态 / EDITOR_HANDLE_METHODS 5 方法 / ScadaPipeConnection :8-14 / create :73-89 / ScadaConfigDiff + diffScadaConfig / connection+undo-redo 目录不存在 / roadmap E7=todo E6=done）；design-connection §4.1/§4.2/§4.3/§4.5/§6/§8.3 + design-undo-redo §4.1/§4.1.1/§4.1.2/§4.2/§4.3/§4.4/§4.5/§8.3 + design-renderer §8.4/§8.5.2 引用全部核对正确。4 项核对（可想象性 / 格式完整性 / 内容稳健性 / 引用准确性）全 PASS。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 plan guide `When Closing The Plan` 和 `Closure Audit Rule`。全量验证属 plan 收口时跑一次（Minimum Rule 18）。

- [x] E7.1 端点吸附连线全部交付（connection/ 4 模块 + connection 测试句柄 + 连线 e2e）。
- [x] E7.2 undo-redo diff 命令栈全部交付（undo-redo/ 4 模块 + editor-session 扩展 + undo/redo 句柄 + undoRedo 测试句柄 + undo-redo e2e）。
- [x] E7.2 多选/框选 + group/ungroup 全部交付（多选交互 + group/ungroup 句柄 + 结构 diff 入栈 + e2e）。
- [x] R4 内存约束严格满足（栈元素只持 forward + inverse 两条增量 diff，不存全量 prevSnapshot；compute-inverse/undo-stack 单测断言）。
- [x] R5 双态隔离不泄漏（连线/undo-redo/多选/group 操作不派发 `symbol:*` action；e2e 断言 edit 模式不派发 symbol:click）。
- [x] runtime 复用点不重复实现（diffScadaConfig / applyDiff / pipe-junction create / hit.getByPoint / InteractionOverlay 全部复用，editor 代码 import runtime 面）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（M3 能力正确排除在 M2 外，非降级）。
- [x] 受影响 owner docs（roadmap 头部记录 + Phase Status E7 / daily log）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### M3 工具箱完整（对齐/分布/层级/复制粘贴/图元库管理/导入导出完善）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: M3 能力属 E9.1（roadmap M2 边界明确「不含工具箱对齐分布（M3）」；design-toolbox.md 能力域）。E7 只实现 M2 连线 + undo-redo + 多选 + group/ungroup。
- Successor Required: yes
- Successor Path: E9.1（工具箱完整）。

### 撤销深化（跨操作合并策略 M3 完善 / 用户可配置合并窗口 / 撤销历史面板 UI）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design-undo-redo.md §4.4 明确「M2 基础合并 + M3 完善」；本 plan 只落地 M2 基础合并（连续文本输入 ≤500ms）+ 边界提示。
- Successor Required: yes
- Successor Path: E9.1（撤销深化）。

### 「断开连接」工具 / dangling connection 批量清理 / 多 connection 批量编辑

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design-connection.md §12.3 后续阶段；本 plan 端点释放到空白区默认恢复原 connection（M2 默认行为），dangling connection 标记存在但清理工具属 M3。
- Successor Required: yes
- Successor Path: E9（M3 完善）。

### 编辑态性能 benchmark 复测 + R7 编辑态包络数字人工最终确认

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全量编辑态性能矩阵复测属 E9.2（M3 收尾）；R7 属人工确认阈值。E7 实现对齐包络约束（节流/不每帧入栈/无全量快照泄漏），但不做全量复测、不替代人工最终确认。
- Successor Required: yes
- Successor Path: E9.2（M3 benchmark 复测 + R7 人工最终确认闭环）。

## Non-Blocking Follow-ups

- InnerEditor（文本双击编辑，依赖 `@leafer-in/text-editor` 插件，spike 约束 #8；M2 后可选项，design-renderer.md §1 非目标）。
- ActionSchema 编辑器（事件 action 的 ActionSchema 编辑，M3/E9；M2 事件走 json-editor fallback）。
- `[E1.1-sg]` rAF 驱动 fps 测量口径 nuance（watch-only residual，roadmap Follow-up Backlog）——E7.2 多选实现时对「大规模选区首次拖拽 simulateTarget 初始化延迟」保持感知，必要时建议 E9.2 加测端到端指针延迟。
- InnerEditorEvent 在 `research-render-engines.md §5:122` 未枚举（watch-only residual，roadmap Follow-up Backlog，非阻断）。

## Closure

Status Note: E7 M2 连线与 undo-redo 全 3 Phase 已交付且独立 closure-audit 通过——3 Phase 全 `completed`、Closure Gates 全 `[x]`、deferred 项均为已裁定的 out-of-scope improvement（M3/E9）。E7 closure 仅收口 M2 实现；E7 Phase Status roadmap 维持 `planned`，最终 `done` 留待 E8 M2 gate（独立 review），与本 plan closure 不冲突（本 plan closure scope = M2 实现 + R4/R5/runtime 复用 owner-doc 同步，非 M2 交付边界最终裁定）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent（closure-audit，本会话）
- Evidence:
  - **Phase 1 连线（live repo）**：`packages/flux-renderers-industrial/src/editor/connection/` 4 模块存在（anchor-snap.ts 5992B / connection-link.ts 4176B / connection-adapter.ts 10601B / connection-overlay.ts 2828B）+ 4 配套单测（anchor-snap/connection-link/connection-adapter/connection-overlay .test.ts）；connection 测试句柄 sub-handle 挂 `editor-test-handle.ts:56`（connect/disconnect/listConnections 含 dangling 标记）；连线 e2e `scada-editor-canvas-connection.test.tsx` 经测试句柄断言 working copy connections 结构（非截图判定）。
  - **Phase 2 undo-redo（live repo）**：`undo-redo/` 4 模块存在（compute-inverse.ts 7043B / undo-stack.ts 4906B / operation-coalesce.ts 4063B / undo-redo-adapter.ts 7833B）+ 4 配套单测；`editor-session.ts` 扩展落地（`:41 undoStack: UndoStack` / `:106-107 canUndo/canRedo` 从 undoStack 派生，非恒 false / `:83 resetSession` 清栈）；undo/redo 句柄注册 `use-editor-handles.ts:101-110`（错误码 no-undo/no-redo）；undoRedo 测试句柄 sub-handle 挂 `editor-test-handle.ts:71`（undo/redo/getStackState/pushUndo）；undo-redo e2e `scada-editor-canvas-undo-redo.test.tsx` 13 场景（含 forward∘inverse=identity 往返 + 截断 redo U6 + coalesce + R5 隔离）。
  - **Phase 3 多选/group/ungroup（live repo）**：Editor selectArea+selectKeep 配置（spike §2.2 ⑤）；group/ungroup 句柄 `use-editor-handles.ts:111-127`（错误码 empty-selection/symbol-not-found/not-a-group）+ 实现 `use-editor-engine.ts:255-286`（结构 diff + 入 undo 栈）；e2e `scada-editor-canvas-group-ungroup.test.tsx` 6 场景（含 group→ungroup undo 往返）。
  - **R4 内存约束**：`undo-stack.ts:57-58` 栈元素仅 forward+inverse+operationKind+timestamp，无 prevSnapshot 字段（Failure Path `undo-mem-leak` 未触发）；单测断言。
  - **R5 双态隔离**：connection/undo-redo/group-ungroup e2e 均含「do not dispatch symbol:\* actions」断言（Failure Path `dual-state-leak` 未触发）。
  - **runtime 复用**：editor 代码 import runtime 面（diffScadaConfig / applyDiff / pipe-junction create / config-adapter nodeById），无重复实现（Failure Path `reuse-overclaim` 未触发）。
  - **workspace full-green 复核**：本次 audit 重跑 `pnpm --filter @nop-chaos/flux-renderers-industrial typecheck`（clean exit）+ `pnpm --filter @nop-chaos/flux-renderers-industrial test`（82 files / 1077 tests passed）。daily log `docs/logs/2026/08-07.md:3-25` 记录 workspace 全量 typecheck/build/lint/test 32/32 + 59/59 full-green；roadmap `docs/components/roadmap-industrial-hmi-editor.md:29` 头部记录 E7 M2 交付条目。
  - **deferred honesty**：4 项 Deferred（M3 工具箱 / 撤销深化 / 断开连接工具 / benchmark 复测）+ 4 项 Non-Blocking Follow-up（InnerEditor / ActionSchema / 2 项 watch-only residual）均属 out-of-scope improvement 或 watch-only residual，无 in-scope live defect 或 contract drift 被静默降级。
  - **anti-hollow**：undo-redo-adapter.transform 事务经 `editor-adapter.ts` onTransformStart/onTransformEnd 实际接通（非空壳）；undo/redo 句柄实际调 `current.undo()/redo()`（`use-editor-handles.ts:103,108`）；groupSymbols/ungroupSymbols 实际入栈（`use-editor-engine.ts:272,286`）。
  - **文本一致性**：Plan Status `completed` / 3 Phase Status 全 `completed` / 3 Phase Exit Criteria 全 `[x]` / Closure Gates 全 `[x]` / daily log 收口记录一致。

Follow-up:

- E8（M2 整体 gate，独立 review）——消费本 plan closure + 对照 E2 设计契约 + M2 边界审查 E7 实现完整性 + 裁定 M2 交付边界（§2.2 范围级人工确认阈值）。
- M3/E9 deferred 项已显式标注 Successor Path（E9.1 工具箱+撤销深化 / E9.2 benchmark 复测+R7 人工最终确认 / E9 连线断开工具）。
- 4 项 watch-only residual（InnerEditor / ActionSchema / rAF fps nuance / InnerEditorEvent 枚举）非阻断，见 Non-Blocking Follow-ups。
