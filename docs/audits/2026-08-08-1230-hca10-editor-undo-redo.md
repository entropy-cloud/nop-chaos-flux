# HCA10 Editor undo-redo 层审计记录

> 日期：2026-08-08
> Plan：`docs/plans/2026-08-08-1230-3-industrial-hmi-hca10-editor-undo-redo-audit.md`
> Work Item：HCA10. Editor undo-redo 审计
> 审计对象：`packages/flux-renderers-industrial/src/editor/undo-redo/`（4 源文件，`wc -l` 实测 257/161/218/114 = Σ750）
> 方法：`docs/skills/deep-audit-prompts.md` 23 维包级深审（复杂交互层，维度 21 显示与定位 / 22 集成接线 / 23 测试有效性 必选触发）
> 基线：`pnpm --filter @nop-chaos/flux-renderers-industrial test` = 97 文件 / 1311 测试全绿（HEAD）
> 结论：**零 P0；1 项 P1（U6 redo-after-coalesce-after-undo 截断违约）test-first 修复；1 项 P2 低成本（M2 合并 singleNodeUpdate 对 variables/reordered 过宽致载荷丢弃）test-first 修复；1 项 P3（时间戳时钟源）归 HCA-CR backlog**。

---

## 1. 逐文件 23 维深审 finding 表

> 每条 finding 含「维度 / 结论 / `文件:行` 证据 / P0-P3 triage」。维度族：A 架构边界(01-03) / B 运行时状态(04-08) / C 渲染器UI(09-12) / D 工程质量(13-15) / E 文档一致性(16-18) / F 运行时鲁棒性(19-20) / G 复杂交互正确性(21-23，必选)。

### 1.1 `compute-inverse.ts`（218 行）— 逆计算 + applyDiffToConfig

| 维度                    | 结论                                                                                                                                                                                                                                                                                                                                                               | 证据                             | Triage |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- | ------ |
| 21 逆计算正确性（必选） | added→removed：`inverse.removed = forward.added.map(n => n.id)`（只存 id 列表，符合 R4 增量约束）。removed→added：从 prevSnapshot 一次性提取原节点（含 group 子树经 findNodeById 递归）。updated→reverse：从 prevSnapshot 提取被 patch 字段原始值（字段穷尽性 = Object.keys(update.patch)）。variables 同规则。reordered→prevSnapshot 顶层 id 序。**对称性成立。** | `compute-inverse.ts:53-90`       | PASS   |
| 21 round-trip 恒等      | U4 `applyDiff(applyDiff(prev, forward), inverse) === prev`（图元集合 + 字段值），含 group 子结构（compute-inverse.test.ts:59-85 group→ungroup 往返）+ variables 往返（:87-111）+ reordered 往返（reorderSymbolsById 双射校验 + 退回原序防御）。**恒等成立。**                                                                                                      | `compute-inverse.test.ts:43-111` | PASS   |
| 21 缺失前值守卫         | forward.removed/updated 引用 prevSnapshot 不存在的 id（ghost）时，computeInverse 静默跳过该 entry（`if (prevNode)` 守卫）——对应 plan Failure Path `undo-updated-no-prev` 的「跳过」分支。round-trip 仍恒等（forward 对 ghost 节点 applyDiff 也是 no-op，inverse 跳过，双 no-op）。设计 §4.1.1 关键约束 + plan Failure Path 双重认可。                              | `compute-inverse.ts:60-76`       | PASS   |
| 21 事务原子性           | computeInverse 是纯函数（无中途失败可部分提交）：单次调用一次性产出整条 inverse diff，所有 entry 原子构造。multi-diff 事务的原子性由适配器层（一次 commitTransaction = 一条 forward + 一对 inverse）保证，computeInverse 自身无事务拆分点。plan Failure Path `undo-multi-diff-atomic` 由适配器事务模型满足。                                                       | `compute-inverse.ts:53-90`       | PASS   |
| 13 类型安全             | `inversePatch as Partial<ScadaSymbolNode>` cast（:74）/ `prevNode as unknown as Record<string, unknown>`（:70）——动态边界从 Object.keys(patch) 反查原值，cast 是低代码动态边界的合理窄化，符合通用审计口径 #4。                                                                                                                                                    | `compute-inverse.ts:69-74`       | PASS   |
| 19 错误处理             | reorderSymbolsById 三重防御：长度不等→原序；id 缺失→原序；重复 id→原序。applyDiffToConfig 空 diff / 无 variables 全降级安全。无 throw 路径。                                                                                                                                                                                                                       | `compute-inverse.ts:162-172`     | PASS   |

**该文件零 P0/P1/P2/P3。** 逆计算对称性、round-trip 恒等、缺失前值守卫、事务原子性逐项 PASS。

### 1.2 `undo-stack.ts`（161 行）— 命令栈 push/pop/peek/淘汰

| 维度                  | 结论                                                                                                                                                                                                                                                                                                                                                                                     | 证据                       | Triage                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------- |
| 21 栈正确性（必选）   | push：截断 redoStack（U6 标准模型，`this.redoStack = []`）+ FIFO 淘汰最旧（U7，`shift()`）。popForUndo/popForRedo：entry **原样**在两栈间移动（字段不调换，design §4.1 Round 2 NEW-1 修正后实现）。canUndo/canRedo 边界（空栈 false）。**栈结构正确。**                                                                                                                                  | `undo-stack.ts:75-125`     | PASS（除 P1-1）                              |
| 21 entry 不可变移动   | popForUndo 返回 `this.undoStack.pop()` 原对象（同一引用），推入 redoStack 不复制不调换字段。undo-of-redo / redo-of-undo 对称（A→B→A→B cycle 经 undo-stack.test.ts:54-69 验证）。design §4.1 line 84 一致。                                                                                                                                                                               | `undo-stack.test.ts:38-69` | PASS                                         |
| 21 U7 满栈淘汰        | maxDepth 默认 100（design §2 + §4.5）；超限时 shift 最旧；淘汰后 canUndo 仍 true（undo-stack.test.ts:87-103 断言淘汰 timestamp 1，保留 4/3/2）。plan Failure Path `undo-stack-overflow` 满足。                                                                                                                                                                                           | `undo-stack.ts:75-82`      | PASS                                         |
| 22 集成接线           | dropUndoTop（P2 #17 applyDiff 失败回滚专用）+ peekRedoTop（两段式 redo）接线完整：适配器 rollbackOnApplyFailure / peekRedoDiff / commitRedo 经这些原语组装失败可回滚的两段式 undo/redo。                                                                                                                                                                                                 | `undo-stack.ts:132-145`    | PASS                                         |
| 21 redo-after-commit  | **#HCA10-P1-1**：`replaceUndoTop`（合并替换栈顶）**不清空 redoStack**。push 路径清空（U6），但 coalesce-merge 走 replaceUndoTop 不清空 → undo 后做一次可合并的新编辑（同 nodeId + 同字段 + ≤500ms），redoStack 仍持旧 entry，redo 按钮错误可用，redo 会 apply 一个本应被丢弃的 forward diff。违反 plan Failure Path `redo-after-new-commit` + design U6「undo 后新操作丢弃 redoStack」。 | `undo-stack.ts:147-154`    | **P1**（→ Phase 2 test-first 修复）          |
| 23 测试有效性（必选） | 现有测试断言结果值（entry 引用相等 / 字段不调换 / 淘汰顺序 / canRedo 布尔），非 not.toThrow 唯一断言。覆盖：push/pop/canUndo/canRedo/depth/clear/replaceUndoTop。**缺口**：replaceUndoTop 与 redoStack 交互未测（即 P1-1 盲区）；dropUndoTop / peekRedoTop 未测（P2 #17 增量，适配器层覆盖但栈层无独立断言）。                                                                           | `undo-stack.test.ts:1-135` | P1-1 盲区（→ Phase 2 补 failing-first 测试） |

**该文件 1 项 P1（test-first 修复）。**

### 1.3 `operation-coalesce.ts`（114 行）— M2 属性合并 + M3 group 合并

| 维度                  | 结论                                                                                                                                                                                                                                                                                                                                                                                                                                    | 证据                                  | Triage                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| 21 合并窗口（必选）   | DEFAULT_COALESCE_WINDOW_MS = 500（design §4.4 表）。边界判定 `incoming.timestamp - top.timestamp > windowMs` → 不合（严格 >，恰等于 500ms 仍合，inclusive 合理，与 HCA9 anchor-snap 阈值边界同口径）。跨窗口不合（operation-coalesce.test.ts:64-68 断言 windowMs+1 不合）。plan Failure Path `undo-coalesce-cross-window` 满足。                                                                                                        | `operation-coalesce.ts:41-62`         | PASS                                         |
| 21 M2 属性合并        | 同 nodeId + 同字段集（sameFieldSet 经 sort 后逐键比）+ ≤500ms → 合并：forward 取最终值（incoming patch 覆盖 top patch），inverse 保留栈顶原值（top.inverse）。连续 N 次合并后 inverse 仍指向最初值（top.inverse 在每次合并后被保留为 merged.inverse，下一次合并再取该 merged.inverse 的 top）。撤销回到合并前最初。design §4.4 表 row 1 一致。                                                                                          | `operation-coalesce.ts:60-96`         | PASS（除 P2-1）                              |
| 21 M3 group 合并      | 同 coalesceGroup + ≤500ms → 合并：forward = incoming.forward（最新态），inverse = top.inverse（最初态），operationKind/coalesceGroup/timestamp 沿用 incoming。transform 族 drag 不设 group（operation-coalesce.test.ts:203-218 断言不合）。design §4.4 M3 一致。                                                                                                                                                                        | `operation-coalesce.ts:48-58`         | PASS                                         |
| 21 不合场景穷尽       | 不同 nodeId / 不同字段集 / 不同 group / transform 族 / connection 族 / 结构 diff（added/removed 非空）/ top undefined —— 逐项有测试断言 undefined（operation-coalesce.test.ts:51-107）。design §4.4 「不合」行全覆盖。                                                                                                                                                                                                                  | `operation-coalesce.test.ts:51-107`   | PASS                                         |
| 21 合并载荷完整性     | **#HCA10-P2-1**：`singleNodeUpdate`（:103-107）仅校验 `added/removed 空 + updated.length===1`，**未校验 `variables === undefined` 与 `reordered === undefined`**。M2 合并构造 mergedForward/mergedInverse 时只搬运 `updated` 字段（:71-88），若 top/incoming forward 携带 `variables` 或 `reordered`，合并后这些载荷被**静默丢弃**（merged.forward.variables = undefined）。违反「合并应保留载荷完整性」隐式契约；undo 不撤销被丢字段。 | `operation-coalesce.ts:71-88,103-107` | **P2 低成本**（→ Phase 2 test-first 修复）   |
| 13 类型安全           | `patch as Partial<ScadaSymbolNode>` cast（:77）——同 compute-inverse 动态边界合理窄化。sameFieldSet 用 `Record<string, unknown>` 入参，key 比较类型安全。                                                                                                                                                                                                                                                                                | `operation-coalesce.ts:77,109-113`    | PASS                                         |
| 19 错误处理           | top undefined → 直接 return undefined（不 throw）。所有不合路径返回 undefined，适配器据此走 push。无异常路径。                                                                                                                                                                                                                                                                                                                          | `operation-coalesce.ts:46`            | PASS                                         |
| 23 测试有效性（必选） | 测试断言合并 forward/inverse 字段值、timestamp、coalesceGroup、operationKind，以及所有不合场景返回 undefined。非 not.toThrow 唯一断言。**缺口**：variables/reordered 载荷经合并的完整性未测（即 P2-1 盲区）。                                                                                                                                                                                                                           | `operation-coalesce.test.ts:1-219`    | P2-1 盲区（→ Phase 2 补 failing-first 测试） |

**该文件 1 项 P2 低成本（test-first 修复）。**

### 1.4 `undo-redo-adapter.ts`（257 行）— 事务边界 + 入栈协调

| 维度                        | 结论                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 证据                                              | Triage                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------- |
| 21 事务边界（必选）         | beginTransaction：嵌套忽略（`if (this.inTransaction) return`，first-kind wins，undo-redo-adapter.test.ts:53-59 断言）。commitTransaction：非事务态→abort+undefined；空 diff→undefined（不入栈，hasChanges 守卫）；否则 diffScadaConfig(prev, current)→computeInverse→push 1 entry。事务期间每帧不入栈（host 只更新 working copy）。design §4.2 防逐属性泄漏满足。plan Failure Path `undo-empty-stack`（空栈 undo 返回 undefined，undo-redo-adapter.test.ts:89-93）满足。 | `undo-redo-adapter.ts:39-76`                      | PASS                                         |
| 21 commitPolicy 分流        | 事务路径（beginTransaction/commitTransaction，transform 族）vs 单操作路径（pushOperation/pushForward，add/remove/connection/update）。manual 模式事务累积（prevAtOpStart 快照）+ commit 一次性 diff；auto 模式即时入栈（pushOperation 每次 1 diff）。两路径入栈决策完整。design §4.2 表对齐。                                                                                                                                                                            | `undo-redo-adapter.ts:39-157`                     | PASS                                         |
| 22 集成接线（必选）         | 入栈链：host 调用 → diffScadaConfig → computeInverse → tryCoalesce → replaceUndoTop/push。undo/redo 链：popForUndo/popForRedo → 返回 inverse/forward diff（host 经 applyDiff 应用）。两段式失败可回滚链（plan 0900-1 P2 #17）：peekUndoDiff/commitUndo/peekRedoDiff/commitRedo + rollbackOnApplyFailure（事务中→abortTransaction；非事务→dropUndoTop）。applyDiffToConfig 经 applyDiff 复用。**接线完整。**                                                              | `undo-redo-adapter.ts:163-217`                    | PASS                                         |
| 21 commitTransaction 原子性 | 事务状态（inTransaction/transactionKind/prevAtOpStart）在 diff 计算前重置（local `prev` 已捕获）。若 diffScadaConfig/computeInverse 抛错，事务已清理（无 stuck transaction），栈未 push（无脏 entry）。plan Failure Path `undo-multi-diff-atomic` 事务模型满足。                                                                                                                                                                                                         | `undo-redo-adapter.ts:52-69`                      | PASS                                         |
| 13 类型安全                 | `structuredCloneSafe` 手写深拷贝（:243-251）覆盖 viewport/background/variables/symbols + 递归 children（cloneNodeDeep）。`hasChanges` 穷尽 added/removed/updated/variables/reordered。无 any 逃逸。                                                                                                                                                                                                                                                                      | `undo-redo-adapter.ts:220-257`                    | PASS                                         |
| 19 错误处理                 | 空 diff 守卫（hasChanges）遍布 commitTransaction/pushOperation/pushForward——空操作不入栈。rollbackOnApplyFailure 区分事务中/非事务。structuredCloneSafe 对 undefined viewport/background/variables 各自条件展开（不假设字段存在）。                                                                                                                                                                                                                                      | `undo-redo-adapter.ts:64,100,139,206-212,243-251` | PASS                                         |
| 23 测试有效性（必选）       | 事务语义 / pushOperation / pushForward / coalesce / undo-redo 边界 / applyDiff 不可变 / variables 事务 快照——均断言结果值（forward/inverse patch 值、stack depth、operationKind、isInTransaction）。**缺口**：peekUndoDiff/commitUndo/peekRedoDiff/commitRedo/rollbackOnApplyFailure 两段式路径在适配器层无独立测试（栈层有 dropUndoTop/peekRedoTop 原语，但适配器组装未测）；coalesce-after-undo 的 redo 截断未测（即 P1-1 盲区）。                                     | `undo-redo-adapter.test.ts:1-199`                 | P1-1 盲区（→ Phase 2 补 failing-first 测试） |

**该文件零 P0/P1/P2/P3。**（P1-1 根因在 undo-stack.ts:replaceUndoTop，适配器层是触发路径之一，fix 落栈层。）

---

## 2. 重点边界值抽查（plan Phase 1 第 2 条）

| 边界场景              | 触发构造                                                     | 期望行为                                       | live 结论                                                                                       |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 空 undo 栈            | `new UndoStack().popForUndo()`                               | undefined（no-op，不 throw）                   | PASS（undo-stack.test.ts:71-74）                                                                |
| 空 redo 栈            | `new UndoStack().popForRedo()`                               | undefined                                      | PASS（undo-stack.test.ts:76-79）                                                                |
| 单条命令              | push 1 → undo → redo                                         | undoStackDepth 1→0→1，entry 原样移动           | PASS（undo-stack.test.ts:38-52）                                                                |
| 栈满淘汰              | maxDepth=3，push 4                                           | 丢最旧（timestamp 1），保留 4/3/2              | PASS（undo-stack.test.ts:87-103）                                                               |
| 500ms 边界（恰等于）  | top.ts=1000, incoming.ts=1500                                | 合并（>500 才不合，=500 合）                   | PASS（`> windowMs` 严格大于，operation-coalesce.ts:50,62）                                      |
| 缺失前值 updated diff | forward.updated=[{ghost,{x:1}}], prev 无 ghost               | inverse.updated 跳过 ghost（无该 entry）       | PASS（compute-inverse.test.ts:214-220）                                                         |
| redo-after-commit     | undo 后 push 新 op                                           | 截断 redo（push 清空 redoStack）               | **push 路径 PASS；coalesce-merge 路径 FAIL（P1-1）**                                            |
| 事务中途失败          | commitTransaction 期间 diffScadaConfig 抛错                  | 事务清理（无 stuck），栈未 push                | PASS（事务状态先重置，local prev 已捕获；undo-redo-adapter.ts:57-68）                           |
| 10 万图元超大 diff    | forward.updated 含 10 万 entry                               | computeInverse O(n) 一次性构建，无递归爆栈     | PASS（compute-inverse.ts:53-90 纯迭代，findNodeById 是唯一递归但深度 = group 嵌套层非节点总数） |
| group 子结构逆计算    | forward.added=[groupNode{children:[c1,c2]}], removed=[c1,c2] | inverse.removed=[group], inverse.added=[c1,c2] | PASS（compute-inverse.test.ts:59-85）                                                           |

---

## 3. P1/P2 finding 详述（Phase 2 修复输入）

### P1-1：replaceUndoTop 不清空 redoStack（U6 redo-after-new-commit 违约）

- **文件**：`packages/flux-renderers-industrial/src/editor/undo-redo/undo-stack.ts:147-154`
- **证据**：
  ```ts
  replaceUndoTop(entry: UndoStackEntry): void {
    if (this.undoStack.length === 0) {
      this.undoStack.push(entry);
      return;
    }
    this.undoStack[this.undoStack.length - 1] = entry;
  }
  ```
  对比 `push`（:75-82）末尾 `this.redoStack = []`。replaceUndoTop 无此行。
- **现状**：coalesce-merge（pushOperation/pushForward 合并命中）走 replaceUndoTop 替换栈顶为新合并 entry。若此前刚发生过 undo（redoStack 非空），redoStack 不被清空。
- **复现 trace**：
  1. push update-symbol(a.x=10) → undoStack=[E1]
  2. push update-symbol(b.y=5)（不同 nodeId 不合）→ undoStack=[E1,E2]
  3. undo E2 → undoStack=[E1], redo=[E2]
  4. push update-symbol(a.x=20)（与 E1 同 nodeId 同字段 ≤500ms）→ tryCoalesce 合并 → replaceUndoTop → undoStack=[E1'], **redo=[E2] 残留**
  5. redo → apply E2.forward（b.y=5）——本应被 U6 丢弃的分支被错误重放
- **风险**：用户 undo 后微调同字段（属性面板常见流），redo 按钮错误可用，redo 重放一个本应不存在的分支，working copy 进入非预期状态。违反 plan Failure Path `redo-after-new-commit` + design U6 + §4.5 边界提示「新操作已截断重做历史」。
- **修复方向**：`replaceUndoTop` 末尾加 `this.redoStack = []`（与 push 一致：任何「新提交」操作——无论 push 还是合并替换——都截断 redo 分支）。replaceUndoTop 唯一调用方是 coalesce-merge（新提交），清空 redo 语义恒正确。
- **failing-first proof**：见 Phase 2 新增 `undo-stack.test.ts`「replaceUndoTop clears redo stack (U6: coalesce-merge is a new commit)」+ `undo-redo-adapter.test.ts` 端到端复现。修复前断言 `expected 1 to be 0`（redoStackDepth 未清空），修复后转绿。

### P2-1：singleNodeUpdate 未拒绝 variables/reordered 载荷（M2 合并载荷丢失）

- **文件**：`packages/flux-renderers-industrial/src/editor/undo-redo/operation-coalesce.ts:103-107`（合并产出 :71-88）
- **证据**：
  ```ts
  function singleNodeUpdate(
    diff: ScadaConfigDiff,
  ): { id: string; patch: Partial<ScadaSymbolNode> } | undefined {
    if (diff.added.length > 0 || diff.removed.length > 0) return undefined;
    if (diff.updated.length !== 1) return undefined;
    return diff.updated[0];
  }
  ```
  mergedForward/mergedInverse（:71-88）只构造 `{added:[],removed:[],updated:[...]}`，无 variables/reordered 字段。
- **现状**：M2 合并的「纯单节点属性更新」判定不完整。若 top/incoming forward 同时携带 `variables` 或 `reordered`（forward.updated 仍 length===1），singleNodeUpdate 误判为可合并，合并后 variables/reordered 载荷从 mergedForward 与 mergedInverse 双双丢失。
- **复现**：top.forward = {updated:[{a,{x:10}}], variables:{updated:[{v1,{value:2}}]}}, incoming.forward = {updated:[{a,{x:20}}], variables:{updated:[{v1,{value:3}}]}} → 合并命中 → mergedForward = {updated:[{a,{x:20}}]}（variables 丢失）。
- **风险**：合并后 forward 丢失 variables/reordered → host apply mergedForward 不应用这些变更 → working copy 与预期不符；inverse 同样丢失 → undo 不回退这些字段。载荷完整性违约。当前 host 用法（update-symbol mutator 只改 symbol 属性，不绑 variables；z-order 走 M3 group 不走 M2）下不触发，属防御性缺口；但 singleNodeUpdate 的职责是「判定是否纯单节点属性更新」，当前实现不完整，低成本即闭合。
- **修复方向**：singleNodeUpdate 增 `diff.variables === undefined && diff.reordered === undefined` 守卫（携带 variables/reordered 的 diff 不是纯单节点属性更新，不合，走 push）。低成本（+1 条件），无公共面变更。
- **failing-first proof**：见 Phase 2 新增 `operation-coalesce.test.ts`「does NOT coalesce when forward carries variables diff (payload integrity)」+ reordered 同类。修复前断言 `expected undefined to be defined`（merged.forward.variables 丢失），修复后合并不发生（tryCoalesce 返回 undefined），转绿。

---

## 4. owner doc 一致性核对（Phase 3）

| owner doc                                                   | 节                             | live 核对结论                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/components/industrial-hmi-editor/design-undo-redo.md` | §4.1.1 computeInverse 算法     | live `compute-inverse.ts:53-90` 与 §4.1.1 代码示例逐行对齐（added→removed/removed→added/updated→reverse/variables 同规则）。live 增量：reordered 逆（:85-87，plan 2026-08-07-1835-1 P1-E 落地，doc §4.1.2 line 182 + §1 文档共识审查记录已同步）。**无 drift。**                                                                                                                                     |
| 同上                                                        | §4.1.2 UndoStackEntry 结构     | live `undo-stack.ts:9-47` 与 §4.1.2 接口一致（forward/inverse/operationKind/timestamp + coalesceGroup?）。live 增量：coalesceGroup（M3，doc §4.4 + §1 审查记录已同步）+ EditorOperationKind 增 `'z-order'`（plan 2026-08-07-1835-1 P1-E）。doc §4.1.2 line 167-179 未列 `'z-order'`/`'property-edit'`（doc 写的是设计期契约，live 实现期增量已在 §1 审查记录 + plan 记录，非 drift）。**无 drift。** |
| 同上                                                        | §4.2 事务语义                  | live `undo-redo-adapter.ts:39-76` beginTransaction/commitTransaction 与 §4.2 事务边界表逐行对齐（嵌套忽略 / 空 diff 不入栈 / 事务期间不入栈）。**无 drift。**                                                                                                                                                                                                                                        |
| 同上                                                        | §4.4 跨操作合并                | live `operation-coalesce.ts` M2（同 nodeId+同字段+≤500ms）+ M3（同 group+≤500ms）与 §4.4 表 + M3 完善对齐。**无 drift。**                                                                                                                                                                                                                                                                            |
| 同上                                                        | §4.5 边界提示 + U6 截断 redo   | live `undo-stack.ts:75-82` push 截断 redoStack（U6）。**P1-1：replaceUndoTop 不截断 redo 是 live 实现缺口（doc U6 + §4.5「新操作已截断重做历史」要求所有新操作截断，包括合并）**。修复后 live 与 doc 一致。                                                                                                                                                                                          |
| `docs/components/industrial-hmi/editor-initiation.md`       | §2.1 M2 undo-redo + R4         | line 34「不采用全量快照，10 万图元组态可达 MB 级」+ line 127 R4「diff 命令栈（逆 diff 撤销）替代全量快照」。live 栈元素只持 forward+inverse 两条增量（undo-stack.ts:9-26 注释明示 R4 + 不存 prevSnapshot；undo-stack.test.ts:20-24 断言 entry 无 prevSnapshot 字段）。**无 drift。**                                                                                                                 |
| `docs/components/industrial-hmi/design-renderer.md`         | §12.3 R4 内存上限（10 万图元） | undo-redo 栈元素增量 diff（典型 KB 级/操作），100 × KB ≈ 100KB 量级（design-undo-redo.md §12.1 U1），远低于 11.6MB 组态本身。**无 drift。**                                                                                                                                                                                                                                                          |

**owner doc 同步**：P1-1 修复后 §4.5/U6 与 live 一致，无需 doc 改动（doc 本身正确，是 live 实现缺口）。

---

## 5. 载荷基线回归抽查（Phase 3，HCA4 基线依赖）

| 载荷契约                                                             | undo-redo 消费点                                                             | 回归结论                                                                                                                                                                                                                                |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ScadaConfigDiff` 形状（added/removed/updated/variables/reordered?） | compute-inverse.ts / operation-coalesce.ts / undo-redo-adapter.ts hasChanges | live 消费与 `serialization/config-types.ts:116-131` + `serialization/diff.ts` 产出形状一致。reordered 是 z-order 增量（plan 2026-08-07-1835-1 P1-E），undo-redo 三处消费（computeInverse/applyDiffToConfig/hasChanges）齐全。**一致。** |
| `diffScadaConfig` 产出（added→removed 对称 / updated 字段穷尽）      | undo-redo-adapter.ts:63,99 diffScadaConfig 调用                              | undo-redo 复用 runtime diffScadaConfig（不重实现），forward 由其产出，inverse 由 computeInverse 镜像。**一致。**                                                                                                                        |
| `engine.applyDiff` 增量应用顺序（removed→added→updated→reordered）   | compute-inverse.ts:129-154 applyDiffToConfig                                 | applyDiffToConfig 与 runtime config-adapter applyDiff 顺序一致（doc §4.1.1 注释明示）。**一致。**                                                                                                                                       |

**载荷基线回归通过。** undo-redo 是 ScadaConfigDiff 的消费者，未引入载荷形状变更。

---

## 6. 喂入 HCA-BL（bug 候选）/ HCA-CR

### 6.1 bug 候选（→ HCA-BL 正式归档）

**无复杂/跨层 bug 候选需归 `docs/bugs/`。** 本层 4 文件逐文件深审零 P0；P1-1（replaceUndoTop redo 截断）是单层局部 defect，test-first 修复（Phase 2），不跨层；P2-1（singleNodeUpdate 载荷完整性）同理。两者均在审计卡内留痕 + 回归测试覆盖即可，无需 `docs/bugs/` 卡片（按 `docs/bugs/00-bug-fix-note-writing-guide.md`「简单 bug 在审计卡内留痕即可」）。

> **HCA-BL 回链（已闭环）**：HCA-BL 独立复核**升级**裁定——P1-1 + P2-1 虽为单层，但均命中 writing-guide「非显然状态机根因 + 回归测试 + 易被 coalesce 重构再引入」，**合并归档**为 `docs/bugs/83-industrial-hmi-component-audit-undo-redo-coalesce-correctness.md`（同模块 / 同验证路径 / 同重构风险面，两 finding 合一卡）。源审计「留痕」推荐被 anti-slacking 安全机制覆盖（plan M-1）。

### 6.2 P3 backlog（→ HCA-CR 跨层集中修复）

| 编号       | 文件:行                                                 | 摘要                                                                                                                                                                                                                                                    | Triage |
| ---------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| HCA10-P3-1 | `undo-redo-adapter.ts:232` / `operation-coalesce.ts:44` | 合并窗口时间戳源 = `Date.now()`（wall clock，非 monotonic）。系统时钟回拨（NTP 调整 / 多 tab）时 `incoming.ts - top.ts` 可能为负 → 负数 ≤500ms → 误合并跨窗口操作。实际编辑器单 tab 短窗口场景概率极低；monotonic 时钟（performance.now）需 host 接入。 | P3     |

---

## 7. 维度覆盖统计

| 维度族                    | 覆盖 | 备注                                                                                                                               |
| ------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 01-03 架构边界            | ✓    | editor subpath 隔离；无跨包内部路径导入（全部 `../../serialization/` + `./` 相对导入）；公共面收敛（4 文件各司其职）。             |
| 04-08 运行时状态          | ✓    | 纯逻辑无 React state；适配器 inTransaction/transactionKind/prevAtOpStart 单实例持有，无双状态；无异步。                            |
| 09-12 渲染器/UI           | N/A  | 非注册 renderer（编辑器域核心纯逻辑，无 DOM marker / 表单 / slot）。                                                               |
| 13-15 工程质量            | ✓    | 类型安全（边界 cast 克制）；测试断言结果值；性能：computeInverse O(n) 纯迭代，findNodeById 递归深度 = group 嵌套层（非节点总数）。 |
| 16-18 文档/命名/跨包      | ✓    | owner doc 一致（§4，P1-1 修复后 §4.5/U6 完全一致）；命名与 design §4.1.2 EditorOperationKind 一致（live 增量 z-order 已记录）。    |
| 19-20 鲁棒性/a11y         | ✓    | 错误降级完整（空 diff / 缺失前值 / reorder id 不匹配 / 空栈 / 事务中止）；a11y N/A（纯逻辑层）。                                   |
| **21 显示与定位（必选）** | ✓    | 逆计算对称性 / round-trip 恒等 / 事务边界 / 合并窗口 / 栈淘汰 / canUndo 边界 逐项核对（P1-1 + P2-1 修复后全 PASS）。               |
| **22 集成接线（必选）**   | ✓    | host→adapter→stack→computeInverse/coalesce 接线完整；两段式 undo/redo（peek+commit）+ rollbackOnApplyFailure 接线完整。            |
| **23 测试有效性（必选）** | ✓    | 测试断言结果值（非 not.toThrow 唯一断言）；P1-1/P2-1 盲区补 failing-first 测试后无假绿；无固化缺陷断言；无死代码带测试。           |

---

## 8. Phase 2 修复记录

| 编号       | finding                                                                     | fix 落点                                                                                                                   | 状态                |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| HCA10-P1-1 | `undo-stack.ts:147-154` replaceUndoTop 不清空 redoStack（U6 违约）          | `undo-stack.ts` replaceUndoTop 末尾 `this.redoStack = []` + failing-first 测试（栈层 + 适配器层端到端）                    | fixed（test-first） |
| HCA10-P2-1 | `operation-coalesce.ts:103-107` singleNodeUpdate 未拒绝 variables/reordered | `operation-coalesce.ts` singleNodeUpdate 增 `variables === undefined && reordered === undefined` 守卫 + failing-first 测试 | fixed（test-first） |

> 零 P0 finding → Phase 2 第 1 条（P0 test-first 修复）vacuously satisfied。P1-1 + P2-1 test-first 修复落地。
