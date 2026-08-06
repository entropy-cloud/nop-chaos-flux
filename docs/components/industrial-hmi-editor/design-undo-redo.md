# undo-redo 设计 design-undo-redo.md

> 日期：2026-08-06
> 版本：v1（E2.4 产出）
> 上游：编辑器架构 `design-architecture.md`（E2.1，§4.4 引擎层衔接扩展 + §4.5 编辑会话模型 + §4.6 事件派发链策略 + §8.5 句柄面扩展）、连线设计 `design-connection.md`（E2.3，§4.4 联动算法重算 connection.x/y）、属性面板 `design-property-panel.md`（E2.2，§4.5 声明结构写入语义）、runtime 序列化 `docs/components/industrial-hmi/design-renderer.md`（§4.3 diff + §12.3 R4 内存上限）、立项材料 `docs/components/industrial-hmi/editor-initiation.md`（§2.1 undo-redo 功能域 + §6 R4）、spike 报告 `docs/analysis/industrial-hmi-editor/spike-2026-08-05.md`（§2.5 transform 节流）
> 下游：E7.2 多选/框选 + undo-redo diff 命令栈实现（消费本档命令栈 + 事务语义 + 内存上限）；E2.6 renderer 契约（消费句柄面 undo/redo + 测试句柄）；E9.1 撤销深化（跨操作合并/边界提示 M3 完善）
> 依据：roadmap `docs/components/roadmap-industrial-hmi-editor.md`（E2.4 + Cross-Cutting 平台能力复用）+ E2 plan `docs/plans/2026-08-06-1931-2-e2-editor-design-documents.md`

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent（fresh session，不复用编写者上下文）反复审查直到共识（判据：连续一轮 0 新增修正项；≤3 轮，超限升级人工）。轮次记录如下：

- **Round 1（2026-08-06，fresh session 独立子 agent `ses_028f4f00fff8KfEzJfHjXaChAq9`）**：判定 `REVISE`——0 Blocker / **1 Major** / 0 Minor / 2 Nit。9 项核对 8 PASS / 1 FAIL（#4 内存上限不用全量快照 R4）。**M-1（Major，已落地）**：§4.1.2 `UndoStackEntry.prevSnapshot: ScadaConfig`（per-entry 全量快照）+ §12.1 U1「总体内存预算 ≤10MB」数学不一致——10 万图元组态单份 ≈ 11.6MB（design-renderer.md:353），100 entry × 11.6MB ≈ 1.16GB 远超 ≤10MB 预算（差距 ~116×）；且与 `editor-initiation.md:34,127`「不采用全量快照 / diff 命令栈替代全量快照」缓解方向矛盾。**修正（采纳评审建议 a）**：移除 `prevSnapshot` 字段，push 时一次性预计算 `inverse: ScadaConfigDiff`（§4.1.1 `computeInverse(forward, prevSnapshot)`），栈元素只持 forward + inverse 两条增量 diff；§4.1/§4.3/§5/§7/§8/§11/§12 全部联动更新（invertDiff→computeInverse、prevSnapshot 行移除/改写、§12.1 U1 预算数学修正为 ≈100KB 量级）。**n-1 / n-2（Nit，已落地）**：§12.1 U1 + §4.1.2 备注 引用「§5 内存上限 / 栈深度」实际在 §2 决策表，修正为「§2」。Round 2 由独立 fresh-session sub-agent 复核。
- **Round 2（2026-08-06，fresh session 独立子 agent `ses_028e75657ffe5FPe0Luq8et8Qh`）**：判定 `REVISE`——M-1 + n-1/n-2 三项修正**全部 ✅ 真实落地无回退**，但全文复扫发现 **1 项新增 Major**：**NEW-1** §4.1 line 79 redo 路径写「`{forward: inverse, inverse: forward}` 推入 redoStack（swap）」与 line 80 + §8.1 「redo apply 原 forward」直接矛盾——swap 后 entry.forward = 原 inverse，redo apply 该字段 = apply 原 inverse（B→A）而非期望的原 forward（A→B），redo 路径崩溃。**修正（NEW-1，已落地）**：移除 swap，改为「entry 在两栈间原样移动（字段不变）」+ §4.1 末增「undo-of-redo / redo-of-undo 自动正确：entry 永远持原始 forward + inverse，undo 永远 apply inverse 字段，redo 永远 apply forward 字段，语义对称无歧义」。评审同时指出 Round 2 判定记录预填违反 AGENTS.md「执行 session 不自审」纪律（NEW-2 Nit），已移除预填条目，本 Round 2 真实判定由独立 fresh-session sub-agent 给出。Round 3 由独立 fresh-session sub-agent 复核。
- **Round 3（2026-08-06，fresh session 独立子 agent `ses_028e05d9dffeAB0cJscmquhZeL`）**：判定 `AGREE`——0 Blocker / 0 Major / 0 Minor / 1 Nit（NEW-3，见下）。Round 1（M-1/n-1/n-2）+ Round 2（NEW-1/NEW-2）共 5 项修正**全部 ✅ 真实落地无回退**：① §4.1.2 栈元素只持 forward + inverse（无 prevSnapshot）；② §4.1.1 computeInverse push 时预计算；③ §4.1 撤销/重做 entry 原样移动（无 swap，line 79 已修正）+ undo-of-redo / redo-of-undo 对称性证明；④ §12.1 U1 预算 ≈100KB（非 ≤10MB），§2 ref；⑤ §5/§7 字段表移除 prevSnapshot 行；⑥ §11 invert-diff.ts→compute-inverse.ts。**端到端 trace 验证 PASS**（state A→B→A→B→A 全 cycle + 新操作截断 redoStack 正确，`forward ∘ inverse = identity`，entry immutability 保证对称性）。9 项 mandatory 核对全部 PASS：① diff 载荷与 ScadaConfigDiff live 一致；② 事务语义防逐属性泄漏；③ group/ungroup 结构 diff 路径正确；④ **内存上限不用全量快照（R4 严格满足）**；⑤ transform 节流与 spike §2.5 一致；⑥ scope discipline；⑦ citation fidelity；⑧ failure paths coverage；⑨ AGENTS.md conventions。**1 Nit 落地**：**NEW-3** Round 3 verdict 在独立 review 之前预填（执行 session 不能自审，重蹈 Round 2 NEW-2 覆辙），已回填实际 fresh-session 独立 review 结果（session id `ses_028e05d9dffeAB0cJscmquhZeL`，本条记录）。**Round 3 达成共识（连续最终轮 0 新增 Blocker/Major，仅 1 项 review-record 卫生 Nit 当场回填，未超 3 轮上限）**。本文件可作为 E7.2 undo-redo 实现的契约依据。E3 设计 gate（独立 plan）为终轮复核。

---

## 1. 组件定位

- 本文档定义**编辑器 undo-redo 设计**：diff 命令栈（逆 diff 撤销，载荷复用 runtime `serialization/diff.ts` 的 `ScadaConfigDiff`）、编辑操作→diff 事务语义（一次拖拽 = 一个 diff，防逐属性 applyAttrs 泄漏；transform 事件族节流起止帧）、group/ungroup 结构 diff（addSymbol/removeSymbol）、跨操作合并/边界提示、内存上限（不用全量快照 R4）、引擎层扩展衔接（applyDiff + undo 栈）。
- undo-redo 是编辑器的**P1 M2 功能域**（`editor-initiation.md §2.1` P1 M2）：M2 与多选/框选 + 端点吸附连线同期落地（roadmap §2.2）；M1 不实现 undo-redo（M1 范围见 roadmap §2.2）。
- 边界：本档**只定义 diff 命令栈契约 + 事务语义 + 内存上限 + 引擎层扩展衔接**，不定义具体编辑操作的 diff 计算（基于 runtime `diffScadaConfig` 已落地，编辑器复用）、不实现任何代码（E7.2+）。
- 非目标：不修改 runtime `serialization/diff.ts`（`diffScadaConfig` + `ScadaConfigDiff` 已落地，编辑器复用）；不重新实现 runtime `applyDiff`（`scada-engine.ts` applyDiff 已落地，编辑器扩展 undo/redo 句柄）；不定义多选/框选交互（M2 但与本档正交，E7.2 多选范围）；不定义「撤销历史面板」UI（M3 工具箱 E9 后可选项）。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无 canvas 编辑 undo-redo 先例。对照调研结论：
  - **maxGraph**（supplement §4.3 :133）：`undoable-change`（ChildChange/GeometryChange/...）——命令式可撤销操作模型（命令栈 + 逆命令），本档 diff 命令栈借鉴此模型；
  - **meta2d**（editor-initiation §2.1）：内置 undo/redo 历史栈（`store.histories`/`historyIndex` + `EditType.Add/Delete/Update`，canvas.ts:4024-4048 + core.ts:2512-2517）——设计蓝本（编辑操作→历史栈→逆操作），但实现走 diff 命令栈（复用 runtime ScadaConfigDiff，不用 meta2d 全量快照模型）；
  - **leafer Editor**（render-engines §5 + spike §2.5）：Editor 事件族（EditorMove/Scale/Rotate/Skew/Group）经适配层抽纯 payload + nodeId 映射后入栈——事件族是 undo-redo 的入栈源（不是 Editor 内置 undo-redo，Editor 不提供 undo-redo）。

### Flux 决策表（undo-redo 层）

| 能力                                                              | 采纳                   | 不采纳                               | 理由（依据                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ---------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| diff 命令栈（逆 diff 撤销）                                       | **P0 采用**            | 全量快照（每次操作存全量组态）       | R4 内存上限（`editor-initiation.md §6 R4` + design-renderer.md §12.3）：10 万图元组态可达 MB 级，全量快照栈不可承受；diff 增量每操作 KB 级；载荷复用 runtime `ScadaConfigDiff`（已落地 `serialization/diff.ts`）                          |
| 编辑操作→diff 事务语义（一次操作 = 一个 diff）                    | **P0 采用**            | 逐属性 applyAttrs（每属性一个 diff） | spike §2.5 + design-architecture.md §4.6：transform 事件族高频每帧（editor.move 8 帧/缩放 10 帧），逐帧入栈导致栈爆炸 + 撤销粒度过细；事务语义 = 一次拖拽只入栈 1 个 diff（节流起止帧）                                                   |
| transform 事件族节流起止帧                                        | **P0 采用**            | 每帧入栈                             | spike §2.5 + selection-gate §5 约束 #3：editor.move/scale/rotate/skew 高频，节流只入栈起始帧（`editor.before_move`）+ 终止帧（最后一帧 `editor.move` 或 `pointerup`）的累计 diff                                                          |
| group/ungroup 结构 diff                                           | **P0 采用**            | 仅属性增量                           | spike §2.5 + selection-gate §5 约束 #7：group/ungroup 改变场景树结构，需结构 diff（addSymbol=added 数组 / removeSymbol=removed id 列表），非属性增量；ScadaConfigDiff 已支持结构 diff（`added: ScadaSymbolNode[]` + `removed: string[]`） |
| 跨操作合并/边界提示                                               | **P0 采用（M3 完善）** | 频繁边界提示                         | M2 提供基础合并（连续文本输入合并）+ 边界提示（栈空/栈满提示）；M3 完善（E9.1）跨操作合并策略                                                                                                                                             |
| 内存上限守护                                                      | **P0 采用**            | 无上限                               | R4 + design-renderer.md §12.3：栈深度上限 100（可配置）+ 单 diff 大小估计 + 满栈丢弃最旧；总体内存预算 ≤10MB（10 万图元场景）                                                                                                             |
| 引擎层扩展：applyDiff + undo 栈衔接（runtime 复用点 #1 衔接扩展） | **P0 采用**            | 编辑器独立实现 diff 应用             | runtime `scada-engine.ts` applyDiff 已落地（design-engine.md §8.2）；编辑器扩展 undo/redo 句柄经 applyDiff 应用 diff + 逆 diff（不重复实现增量应用）                                                                                      |

## 3. Flux 中的 renderer/type 定义

- undo-redo**不是独立 renderer type**：undo-redo 是编辑会话模型（`design-architecture.md §4.5` ScadaEditorSession）的核心能力，经 `component:undo()` / `component:redo()` 句柄（`design-architecture.md §8.5`）触发；
- undo-redo 状态（undoStack/redoStack/canUndo/canRedo）属编辑会话模型域核心（无 React 依赖）；
- 包归属：与编辑器 renderer 同包（**待 E4.1 裁定**）。

### 与既有 flux 架构的边界（E2.4 Decision）

| 边界         | 约定                                                                                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React 依赖   | 命令栈 + 逆 diff 算法 + 事务语义属域核心（无 React 依赖，纯逻辑，Vitest 单测先行）；UI 反馈（undo/redo 按钮态）属 React 视图结构层                                                                                                              |
| 数据流       | 编辑操作（适配层入栈）→ undoStack（域内部 ref 持有）→ undo/redo 句柄 → 经 runtime `engine.applyDiff` 应用 → 触发 working copy 更新 + 适配层重新装配 Editor 选区；**不直接读 flux scope**                                                        |
| 事件流       | 编辑操作入栈后派发 `onSessionChange`（schema 级事件，载荷含 canUndo/canRedo）；undo/redo 触发后同样派发 `onSessionChange`；不派发 `symbol:*` action（R5 隔离）                                                                                  |
| 注册机制     | undo-redo 不进 `renderer-definitions.ts` 注册（属 component handles）；命令栈 + 逆 diff 算法属编辑器域核心                                                                                                                                      |
| 测试句柄     | undo/redo 经 `window.__flux_scada_editor_<cid>.undo()` / `.redo()` 程序化驱动（`design-architecture.md §8.4`）；e2e 经测试句柄断言 working copy + undoStack 深度（不截图判定）                                                                  |
| 平台能力复用 | 复用 runtime `serialization/diff.ts`（`diffScadaConfig` 计算 diff + `ScadaConfigDiff` 类型）+ runtime `scada-engine.ts` applyDiff（增量应用）+ runtime `serialization/validate.ts`（diff 应用后校验）；**禁止重复实现** diff 计算/增量应用/校验 |

## 4. schema 设计（diff 命令栈契约）

### 4.1 diff 命令栈载荷（复用 runtime `ScadaConfigDiff`，live 一致）

**runtime `ScadaConfigDiff`**（`serialization/config-types.ts:108-113`，design-renderer.md §4.3）：

```typescript
export interface ScadaConfigDiff {
  added: ScadaSymbolNode[]; // 新增图元（完整节点）
  removed: string[]; // 删除图元（id 列表）
  updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }>; // 更新图元（id + 属性 patch）
  variables?: ScadaVariablesDiff; // 点表声明 diff
}
```

**undo 栈元素 = `ScadaConfigDiff` 配对（forward + inverse）**（直接复用 runtime 类型，不新建栈元素类型）：

- 入栈（push 时）：编辑操作产出 `forward: ScadaConfigDiff`（基于 `diffScadaConfig(prevWorkingCopy, newWorkingCopy)`，runtime 已落地）；**同时**经 `computeInverse(forward, prevWorkingCopy)`（§4.1.1，push 时 prev + current 同时在内存，可一次性提取反查片段）计算 `inverse: ScadaConfigDiff`，与 forward 配对存入栈（栈元素仅含两条增量 diff，无全量快照字段）；
- 撤销：从 undoStack pop `{forward, inverse}` entry → apply `inverse` 到 working copy → **同一个 entry（字段不变）**推入 redoStack（**不调换** forward/inverse 字段；entry 在两栈间原样移动）；
- 重做：从 redoStack pop `{forward, inverse}` entry → apply `forward` 到 working copy → **同一个 entry（字段不变）**推回 undoStack；
- undo-of-redo / redo-of-undo 自动正确：entry 永远持原始 forward（A→B）+ 原始 inverse（B→A），无论它在 undoStack 还是 redoStack；undo 永远 apply `inverse` 字段，redo 永远 apply `forward` 字段，语义对称无歧义。

> **R4 内存约束（关键 Decision）**：栈元素**不存储全量 `prevSnapshot`**（10 万图元组态 ≈ 11.6MB/份，100 份全量快照 ≈ 1.16GB 远超内存预算）。push 时一次性预计算 `inverse`（增量 diff）后，prevWorkingCopy 即可丢弃；栈元素只持有 forward + inverse 两条**增量** diff，内存占用正比于 diff 大小（典型 KB 级/操作）而非组态大小。`editor-initiation.md §6 R4`「不采用全量快照 / diff 命令栈替代全量快照」+ `design-renderer.md §12.3`（10 万 symbol 11.6 MB 数据点）由此满足。

#### 4.1.1 `computeInverse(forward, prevSnapshot)` 算法（纯逻辑，Vitest 单测先行）

> 算法在 **push 时**调用（不是 undo 时），此时 `prevSnapshot` + `newWorkingCopy` 同时在内存，可一次性提取反查片段；返回的 `inverse: ScadaConfigDiff` 是与 forward 配对的增量逆 diff，存入栈后 prevSnapshot 即可丢弃。

```typescript
/**
 * 计算一条 ScadaConfigDiff 的逆 diff（用于撤销）。
 *
 * 逆 diff 规则（每条增量，无全量快照需求）：
 * - forward.added（新增节点）→ inverse.removed（删除这些 id）
 * - forward.removed（删除 id 列表）→ inverse.added（恢复原节点，从 prevSnapshot 一次性提取）
 * - forward.updated（id + patch）→ inverse.updated（id + 反推原值 patch，从 prevSnapshot 一次性提取原值）
 * - forward.variables 同规则
 *
 * 调用时机：push 入栈时（prevSnapshot 可用）。返回后 prevSnapshot 不再被引用，
 * 栈元素只持有 forward + inverse 两条增量 diff（R4 内存约束）。
 */
export function computeInverse(
  forward: ScadaConfigDiff,
  prevSnapshot: ScadaConfig,
): ScadaConfigDiff {
  const inverse: ScadaConfigDiff = { added: [], removed: [], updated: [] };

  // 逆 added = removed（删除新增的节点；只存 id 列表，不存全量节点）
  inverse.removed = forward.added.map((node) => node.id);

  // 逆 removed = added（恢复被删除的节点；从 prevSnapshot 一次性提取原节点）
  for (const id of forward.removed) {
    const prevNode = findNodeById(prevSnapshot, id);
    if (prevNode) inverse.added.push(prevNode);
  }

  // 逆 updated = updated（反推原值 patch；从 prevSnapshot 一次性提取被 patch 字段的原始值）
  for (const update of forward.updated) {
    const prevNode = findNodeById(prevSnapshot, update.id);
    if (prevNode) {
      const inversePatch: Record<string, unknown> = {};
      for (const key of Object.keys(update.patch)) {
        inversePatch[key] = (prevNode as Record<string, unknown>)[key];
      }
      inverse.updated.push({ id: update.id, patch: inversePatch as Partial<ScadaSymbolNode> });
    }
  }

  // variables 逆 diff（同规则，从 prevSnapshot.variables 一次性提取原值）
  if (forward.variables) {
    inverse.variables = computeVariablesInverse(forward.variables, prevSnapshot);
  }

  return inverse;
}
```

**关键约束**：

1. `computeInverse` 在 push 时调用（prevSnapshot 可用）；返回后 prevSnapshot 不再被栈引用（栈元素只持 forward + inverse 两条增量）；
2. `findNodeById` 经 runtime `ConfigAdapter.nodeById` O(1) 索引（design-engine.md §8.2），不重复实现节点查询；
3. `inverse.added` / `inverse.updated` 字段值**从 prevSnapshot 一次性提取**（提取后 prevSnapshot 即可丢弃）——内存占用 = inverse 这条增量 diff 的大小（与 forward 同量级，典型 KB 级/操作），而非 11.6MB 全量组态。

#### 4.1.2 undo 栈元素结构（设计期契约）

```typescript
interface UndoStackEntry {
  /**
   * 编辑操作产出的 forward diff（apply 到 working copy 使 working copy 前进）。
   * 增量 diff（典型 KB 级/操作）。
   */
  forward: ScadaConfigDiff;
  /**
   * forward 的逆 diff（apply 到 working copy 使 working copy 回退到此 entry 入栈前的状态）。
   * 增量 diff（典型 KB 级/操作）；push 时经 computeInverse(forward, prevSnapshot) 预计算。
   */
  inverse: ScadaConfigDiff;
  /** 操作类型标签（用于跨操作合并 §4.4 + 边界提示 §4.5） */
  operationKind: EditorOperationKind;
  /** 操作时间戳（用于跨操作合并时间窗口判定 §4.4） */
  timestamp: number;
}

type EditorOperationKind =
  | 'transform-move'
  | 'transform-scale'
  | 'transform-rotate'
  | 'transform-skew'
  | 'add-symbol'
  | 'remove-symbol'
  | 'update-symbol'
  | 'group'
  | 'ungroup'
  | 'connection-update'
  | 'connection-link'
  | 'property-edit';
```

> **prevSnapshot 不进栈**：栈元素**仅含 forward + inverse 两条增量 diff**（外加 operationKind + timestamp 元数据）。`prevSnapshot`（push 时的 working copy 全量）只在 `computeInverse` 调用期间临时存在（编辑会话模型在 push 时持有当前 working copy 引用），调用结束即可被下一次 push 的 working copy 覆盖——栈本身不持久化任何全量快照，内存占用正比于「栈深度 × 平均 diff 大小」（100 × KB 级 ≈ 100KB 量级，远低于 R4 内存预算）。`editor-initiation.md §6 R4`「不采用全量快照」+ §2.1「diff 命令栈替代全量快照」由此严格满足。

### 4.2 编辑操作→diff 事务语义（防逐属性 applyAttrs 泄漏）

> 对齐 spike §2.5 + selection-gate §5 约束 #3：transform 事件族高频每帧，需节流起止帧。

**事务边界规则**：

| 操作类型                            | 事务边界（一个 diff 的范围）                                                                           | 入栈触发                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `transform-move`（拖拽图元）        | 从 `editor.before_move` 起始到最后一帧 `editor.move`（或 `pointerup`）；整个拖拽过程累计 1 个 diff     | pointerup（节流终止帧）                                    |
| `transform-scale`（缩放）           | 从 `editor.before_scale` 到最后一帧 `editor.scale`                                                     | pointerup                                                  |
| `transform-rotate`（旋转）          | 从 `editor.before_rotate` 到最后一帧 `editor.rotate`（rotateGap:45 吸附后）                            | pointerup                                                  |
| `transform-skew`（斜切）            | 从 `editor.before_skew` 到最后一帧 `editor.skew`                                                       | pointerup                                                  |
| `add-symbol` / `remove-symbol`      | 单次添加/删除 = 1 个 diff（结构 diff，§4.3）                                                           | `component:addSymbol` / `removeSymbol` 句柄调用时          |
| `update-symbol`（属性面板编辑）     | 单次属性编辑 = 1 个 diff（属性增量）；连续文本输入（如 fill 输入）经跨操作合并（§4.4）合并为 1 个 diff | `component:updateSymbol` 句柄调用时（去抖，§4.4 时间窗口） |
| `group` / `ungroup`                 | 单次成组/解组 = 1 个 diff（结构 diff，§4.3）                                                           | `editor.group` / `ungroup` 事件（spike §2.2 ⑤）            |
| `connection-update`（端点吸附）     | 单次端点拾起→释放 = 1 个 diff（属性增量，custom.connections 改变，design-connection.md §4.2）          | pointerup（端点释放时）                                    |
| `connection-link`（图元移动联动）   | 与 `transform-move` 同事务（图元移动的 diff 同时含 connection.x/y 的增量）                             | pointerup                                                  |
| `property-edit`（属性面板字段编辑） | 单字段编辑 = 1 个 diff（属性增量）；连续编辑同字段经跨操作合并（§4.4）                                 | `component:updateSymbol` 句柄调用时                        |

**事务语义实现**（适配层节流）：

1. transform 事件族：适配层监听 `editor.before_<op>`（起始）→ 累计期间所有 `editor.<op>` 帧 → pointerup 时计算 `diffScadaConfig(prevAtOpStart, currentWorkingCopy)` → 入栈 1 个 diff（operationKind=transform-<op>）；
2. 高频每帧的 `editor.move`/`scale`/`rotate`/`skew` **不入栈**，只更新 working copy + Editor 选区视觉反馈；
3. 入栈的 diff 是「事务起点 → 事务终点」的累计 diff（runtime `diffScadaConfig` 计算）。

**防逐属性 applyAttrs 泄漏**：

- 编辑会话模型在事务期间只更新 working copy（不调 `engine.applyDiff`），事务终止时一次性产出 1 个 diff 入栈；
- 工作流：适配层事件 → 修改 working copy（内存操作，无 applyDiff） → 事务终止时 diffScadaConfig + 入栈 + 经 `engine.applyDiff` 应用到下游 scada-canvas（仅在 commit/save 时）；
- 即编辑期 working copy 与下游 scada-canvas 解耦（design-architecture.md §4.5 编辑会话模型）。

### 4.3 group/ungroup 结构 diff（addSymbol/removeSymbol，spike 约束 #7）

> 对齐 spike §2.2 ⑤ EditorGroupEvent + §2.5 group/ungroup 需结构 diff + nodeId 重映射；design-architecture.md §8.5 句柄面扩展。

**group 操作 diff 结构**：

- 适配层监听 `editor.group` 事件（spike §2.2 ⑤：editTarget=新 Group）；
- diff：
  - `removed` = 被成组的子图元 id 列表（从顶层 symbols 数组移除）；
  - `added` = 新的 Group 节点（含 `children: [...原子图元]`，type=`scada-group`）；
  - `updated` = []（无属性更新）；
- nodeId 重映射：子图元 id 不变（仍是原 id），但其 parentContext 从顶层变为 Group（编辑会话模型维护父子关系索引）；
- operationKind = `group`。

**ungroup 操作 diff 结构**（逆）：

- 适配层监听 `editor.ungroup` 事件（editTarget=Group）；
- diff：
  - `removed` = 被解组的 Group 节点 id；
  - `added` = 子图元列表（从 Group.children 提升到顶层 symbols 数组）；
  - `updated` = []（无属性更新）；
- nodeId 重映射：子图元 id 不变，parentContext 改回顶层；
- operationKind = `ungroup`。

**`computeInverse`（§4.1.1，push 时预计算）自动处理逆**：

- group 的逆 = ungroup（computeInverse 在 push 时把 added→removed + removed→added，从当时的 prevSnapshot 一次性提取原结构，存为 inverse diff）；
- ungroup 的逆 = group；
- 无需特殊处理结构 diff 的逆。

**addSymbol/removeSymbol**（属性面板 + 工具箱触发，非 Editor 事件族）：

- `component:addSymbol(node)` 句柄 → push 时 forward diff = `{added: [node], removed: [], updated: []}`，computeInverse 产 inverse diff = `{added: [], removed: [node.id], updated: []}`，operationKind=`add-symbol`；
- `component:removeSymbol(nodeId)` 句柄 → push 时 forward diff = `{added: [], removed: [nodeId], updated: []}`，computeInverse 经当时 prevSnapshot 取原节点产 inverse diff = `{added: [原节点], removed: [], updated: []}`，operationKind=`remove-symbol`；
- 撤销时 apply inverse diff 即恢复原状（无需运行时再反查）。

### 4.4 跨操作合并（M2 基础 + M3 完善）

**M2 基础合并规则**：

| 合并场景                                    | 合并规则                                                                                                                | M2 落地 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------- |
| 连续文本输入（同字段，时间窗口内）          | 同 nodeId + 同字段 + 时间窗口 ≤500ms 内的多个 `update-symbol` 合并为 1 个 diff（最终值）；operationKind=`property-edit` | ✅      |
| 连续数值微调（同字段，时间窗口内）          | 同上                                                                                                                    | ✅      |
| 连续 transform（同 op，时间窗口内）         | **不合**（每次 pointerup 是独立事务，spike §2.5 节流起止帧已隐含事务边界）                                              | —       |
| 连续 connection 端点拖动（同 connectionId） | **不合**（每次 pointerup 是独立事务）                                                                                   | —       |

**M3 完善（E9.1 落地）**：

- 更复杂的合并策略（如连续同向 transform 合并为「连续 N 次移动」可撤销为一组）；
- 用户可配置合并窗口（500ms 默认值可调）；
- 跨操作合并的「撤销粒度」用户感知优化。

### 4.5 边界提示（M2 基础）

**M2 边界提示**（statusBar region 显示，design-architecture.md §4.1）：

| 边界场景                      | 提示                                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| undoStack 空（canUndo=false） | statusBar 显示「无可撤销操作」+ undo 按钮 disabled                          |
| redoStack 空（canRedo=false） | statusBar 显示「无可重做操作」+ redo 按钮 disabled                          |
| undoStack 满（达到深度上限）  | statusBar 显示「已达撤销历史上限（100），最旧操作被丢弃」（可配置关闭提示） |
| undo 后新操作（截断 redo）    | statusBar 显示「新操作已截断重做历史」（提示用户 redo 链已断）              |

**实现**：状态栏 UI 经 React 渲染层（statusBar region），状态来源编辑会话模型 canUndo/canRedo/undoStackDepth 字段（onSessionChange 事件派发触发 React 重渲染）。

### 4.6 引擎层扩展衔接（runtime 复用点 #1 衔接扩展，editor-initiation §3）

> 对齐 design-architecture.md §4.4 引擎层衔接 trade-off：方案 A（复用 scada-engine + applyDiff 扩展）vs 方案 B（独立 editor-engine）。本节设计 undo-redo 层衔接契约，E4.1 裁定包结构后落地。

**方案 A（复用 scada-engine，倾向方案）扩展点**：

1. `scada-engine.ts` 增加 undo 栈管理（不修改既有 18 命令面，新增 undo/redo 命令）：
   ```typescript
   class ScadaCanvasEngine {
     // 既有 18 命令面 + applyDiff 不变

     // 新增（编辑器扩展，E7.2 落地）
     private undoStack: UndoStackEntry[] = [];
     private redoStack: UndoStackEntry[] = [];

     /** 入栈（编辑器适配层调用） */
     pushUndo(entry: UndoStackEntry): void {
       /* ... */
     }
     /** 撤销：从 undoStack pop → apply inverse diff（push 时已预计算） */
     undo(): ScadaConfigDiff | undefined {
       /* ... */
     }
     /** 重做：从 redoStack pop → apply forward diff */
     redo(): ScadaConfigDiff | undefined {
       /* ... */
     }
     /** 查询可撤销/重做状态 */
     canUndo(): boolean {
       /* ... */
     }
     canRedo(): boolean {
       /* ... */
     }
   }
   ```
2. 编辑器适配层经 `engine.pushUndo(entry)` 入栈，经 `engine.undo()` / `engine.redo()` 触发；
3. `engine.applyDiff` 既有逻辑复用（增量应用到组态模型 + 触发渲染）。

**方案 B（独立 editor-engine）扩展点**：

- 新建 `ScadaEditorEngine` 类（继承或独立），持有 undoStack/redoStack + Editor 实例 + 编辑会话模型；
- 复用 runtime `scada-engine.ts` applyDiff 实现（经继承或组合）。

**两方案 undo-redo 契约一致**（差异仅在引擎类结构，undo-redo 算法 + 栈结构 + diff 载荷完全相同）。

## 5. 字段分类（undo-redo 相关字段）

| 字段                          | 归属                       | 说明                                                                            |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| `undoStack: UndoStackEntry[]` | 编辑会话模型域内部         | §4.1.2                                                                          |
| `redoStack: UndoStackEntry[]` | 编辑会话模型域内部         | §4.1.2                                                                          |
| `canUndo: boolean`            | 编辑会话模型域内部（派生） | undoStack.length > 0                                                            |
| `canRedo: boolean`            | 编辑会话模型域内部（派生） | redoStack.length > 0                                                            |
| `undoStackDepth: number`      | 编辑会话模型域内部（派生） | undoStack.length（statusBar 边界提示用）                                        |
| `operationKind` / `timestamp` | UndoStackEntry 元素        | §4.1.2（跨操作合并 + 边界提示用）                                               |
| `forward: ScadaConfigDiff`    | UndoStackEntry 元素        | runtime 类型复用（`config-types.ts:108-113`）；apply 到 working copy 使其前进   |
| `inverse: ScadaConfigDiff`    | UndoStackEntry 元素        | forward 的逆（push 时经 computeInverse 预计算）；apply 到 working copy 使其回退 |

## 6. 图层与场景树（对应 regions 约定）

- undo-redo 不产生新图层：undo/redo 经 `engine.applyDiff` 应用到下游 scada-canvas（重建/增量渲染，design-renderer.md §8.3）；
- 边界提示 UI（statusBar）属编辑器 DOM regions（design-architecture.md §4.1 + §6 HTML 覆盖层）。

## 7. 运行期状态归属

| 状态                 | Owner                               | 说明                                                                             |
| -------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| undoStack/redoStack  | **域内部（编辑会话模型 ref 持有）** | 不进 scope；ref 持有；undo/redo 句柄修改 + onSessionChange 派发触发 React 重渲染 |
| canUndo/canRedo      | **域内部（派生）**                  | undoStack/redoStack 长度派生                                                     |
| forward/inverse diff | **域内部（栈元素）**                | 配对存入 UndoStackEntry（增量，无全量快照，§4.1.2 R4 内存约束）                  |
| 边界提示状态         | **local（React）**                  | statusBar region 派生展示                                                        |

## 8. 事件、动作与组件句柄能力

### 8.1 undo/redo 事件流（不派发运行态 action）

- 入栈（编辑操作）：适配层 → 编辑会话模型 pushUndo（含 computeInverse 预计算）→ 派发 `onSessionChange`（schema 级事件，载荷含 canUndo/canRedo）；
- undo：`component:undo()` 句柄 → 编辑会话模型 pop undoStack → apply `inverse`（push 时已预计算，无需运行时反查）→ 派发 `onSessionChange`；
- redo：`component:redo()` 句柄 → 编辑会话模型 pop redoStack → apply `forward`（redo 栈元素的 forward 字段对应原 undo 操作的 forward）→ 派发 `onSessionChange`；
- 全部不派发 `symbol:*` action（R5 隔离）。

### 8.2 句柄（消费 design-architecture.md §8.5）

| 句柄                     | 说明                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `component:undo()`       | 撤销（栈顶 inverse diff 经 applyDiff 应用）                                  |
| `component:redo()`       | 重做（栈顶 forward diff 经 applyDiff 应用）                                  |
| `component:save()`       | 提交（不修改 undoStack；保存基线 committedBaseline 更新为当前 working copy） |
| `component:load(config)` | 加载（替换 working copy + **重置 undoStack/redoStack**，编辑历史不保留）     |

### 8.3 测试句柄（架构层声明，完整契约属 E2.6）

```typescript
interface ScadaEditorUndoRedoTestHandle {
  /** 程序化 undo/redo（e2e 用） */
  undo(): void;
  redo(): void;
  /** 查询栈状态 */
  getStackState(): {
    canUndo: boolean;
    canRedo: boolean;
    undoStackDepth: number;
    redoStackDepth: number;
    /** 栈顶 operationKind（用于合并/边界测试） */
    topOperationKind?: EditorOperationKind;
  };
  /** 程序化入栈（用于构造测试场景） */
  pushUndo(entry: UndoStackEntry): void;
}
```

经 `window.__flux_scada_editor_<cid>.undoRedo` 暴露（E2.6 完整契约）。

## 9. 数据源、表达式、导入能力接入点

- undo-redo **不接数据源**：栈元素 + diff 载荷全部内存态；
- undo-redo **不参与表达式求值**；
- 序列化：undo-redo 状态**不入组态 JSON 序列化**（undoStack/redoStack 是编辑会话临时态，提交后清空或不持久化）；
- 保存（commit）：working copy → 序列化为 config（不含 undo-redo 状态）；加载：外部 config 装入 + 重置 undo-redo 栈。

## 10. 样式与 DOM marker 约定

- undo/redo 按钮 UI（toolbar/statusBar）：使用 `@nop-chaos/ui` Button + Tooltip（AGENTS.md「UI Component Usage」）；
- 边界提示：`@nop-chaos/ui` 内联文本组件（不新增 token 命名空间）；
- 不产生 canvas 内 DOM marker（undo-redo 是状态层不是渲染层）。

## 11. 实现拆分建议（设计期契约，完整拆分属 E7.2）

```
packages/flux-renderers-industrial-editor/src/   （方案 B；E4.1 裁定最终归属）
OR packages/flux-renderers-industrial/src/editor/（方案 A）
├── undo-redo/
│   ├── compute-inverse.ts      # computeInverse(forward, prevSnapshot) 算法（push 时预计算 inverse diff，纯逻辑单测先行）
│   ├── undo-stack.ts           # UndoStackEntry 栈管理（push/pop/canUndo/canRedo/深度上限）
│   ├── operation-coalesce.ts   # 跨操作合并规则（M2 基础 + M3 完善）
│   └── undo-redo-adapter.ts    # 适配层：编辑操作事件 → 入栈（事务语义 + 节流起止帧）
└── （编辑器主 renderer / 适配层 / 编辑会话模型 等，见 design-architecture.md §11）
```

- 拆分依据：`renderer-implementation-guidelines.md` Case 4（invert-diff + undo-stack + operation-coalesce 为域核心，纯逻辑单测先行；undo-redo-adapter 为编辑器视图层）。
- 实现阶段映射：E4.1（包结构裁定）→ E4.2（注册空壳）→ E7.2（undo-redo diff 命令栈实现，M2 基础合并 + 边界提示）→ E9.1（M3 完善，跨操作合并策略 + 用户配置）。

## 12. 风险、取舍与后续阶段

### 12.1 风险清单

| #   | 风险                                                          | 本档防护/接受                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | R4 内存上限（undo-redo 栈占用过大）                           | **防护**：§2 栈深度上限 100 + 栈元素只持 forward + inverse 两条增量 diff（不存全量 prevSnapshot，§4.1.2 R4 内存约束）；总体内存预算 ≈ 100 × 平均 diff 大小（典型 KB 级/操作）≈ 100KB 量级，远低于 R4 预算（10 万图元组态本身 ≈ 11.6MB，design-renderer.md §12.3） |
| U2  | 逐属性 applyAttrs 泄漏（每属性一个 diff）                     | **防护**：§4.2 事务语义（一次操作 = 一个 diff，transform 节流起止帧 + update-symbol 去抖）                                                                                                                                                                        |
| U3  | group/ungroup 结构 diff 错误（nodeId 重映射错乱）             | **防护**：§4.3 显式声明 nodeId 不变（仅 parentContext 变化）+ computeInverse 在 push 时自动处理结构逆（无需运行时反查）；E7.2 实现期单测覆盖 group→ungroup 往返                                                                                                   |
| U4  | forward/inverse 配对不一致（push 时 computeInverse 计算错误） | **防护**：computeInverse 在 push 时调用（prevSnapshot 与 forward 同步可见，无跨操作复用风险）；E7.2 实现期单测覆盖 undo/redo 后 working copy 一致性（forward.apply ∘ inverse.apply === identity）                                                                 |
| U5  | 跨操作合并误合并（不同字段/不同图元的操作误合）               | **防护**：§4.4 合并规则严格（同 nodeId + 同字段 + 时间窗口 ≤500ms，三条件全中才合）；不合场景显式列举                                                                                                                                                             |
| U6  | undo 截断 redo 链（undo 后新操作丢弃 redoStack）              | **接受 + 提示**：§4.5 边界提示「新操作已截断重做历史」；标准 undo-redo 模型（与 maxGraph/meta2d 蓝本一致）                                                                                                                                                        |
| U7  | 栈深度上限丢弃最旧（用户感知丢失历史）                        | **接受 + 提示**：§4.5 边界提示；100 深度上限可配置（M3 工具箱 E9 提供 UI 调节）                                                                                                                                                                                   |

### 12.2 风险与取舍

- **R4 内存上限已严格防护**：§2 + §4.1.2 显式声明栈元素**不持全量 prevSnapshot**（push 时 computeInverse 一次性预计算 inverse diff，prevSnapshot 即可丢弃）；栈元素只持 forward + inverse 两条增量 diff + 元数据，内存占用 ≈ 100 × KB 级 ≈ 100KB 量级（远低于 11.6MB 组态本身）；满足 `editor-initiation.md §6 R4`「不采用全量快照」+「diff 命令栈替代全量快照」+ `design-renderer.md §12.3`。
- **不重复实现 runtime diff**：本档显式声明编辑器复用 runtime `diffScadaConfig` + `ScadaConfigDiff` + `applyDiff`（runtime 复用点 #1 #4 衔接扩展，editor-initiation §3）；computeInverse 是编辑器域核心算法（runtime 不提供，因 runtime 无 undo-redo 需求）。
- **架构冲突记录**：若 E7.2 实现期发现 undo-redo 需 runtime `scada-engine.ts` 增加 `undo()` / `redo()` 方法（方案 A 扩展点），属 runtime mission 同步（本档 Non-Goals 不预改 runtime）；按 plan Failure Paths `design-contract-conflict` 记录。

### 12.3 后续阶段

| 阶段 | 内容                                                                                        |
| ---- | ------------------------------------------------------------------------------------------- |
| E2.6 | renderer 契约（消费本档 undo/redo 句柄 + 测试句柄）                                         |
| E3   | 设计 gate（独立 plan，6 份设计文档终轮复核）                                                |
| E4.1 | 包结构裁定（决定方案 A 复用 scada-engine vs 方案 B 独立 editor-engine，影响 §4.6 落地路径） |
| E4.2 | 注册 `scada-editor-canvas` 空壳 + 引入依赖                                                  |
| E7.2 | undo-redo diff 命令栈实现（M2 基础合并 + 边界提示，落地本档契约）                           |
| E9.1 | M3 完善（跨操作合并策略 + 用户配置 + 「撤销历史面板」UI 可选项）                            |
