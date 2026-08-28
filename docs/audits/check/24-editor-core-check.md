# 24 editor-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/editor-core/src/` 排除 `*.test.*` 后 5 个实现文件共 593 行（index.ts 19 / types.ts 169 / undo-command-stack.ts 89 / domain-registry.ts 26 / editor-core.ts 290）。**精读覆盖率 100%**。另精读唯一消费者 `packages/flux-renderers-dashboard/src/editor/` 全部 7 个文件 + `layout-math.ts`（拖拽热路径上下文）、包内测试 `editor-core.test.ts`（305 行）与 `dashboard-domain-adapter.test.ts`、设计 owner doc `docs/architecture/editor-core.md`（契约基线）。
- 结论概览：**P0 x0 / P1 x1 / P2 x6 / P3 x8**。总评：内核体量小、结构清晰，undo/redo 双栈"entry 原样搬移不调换字段"的实现正确（undo-of-redo / redo 分支截断 / 满栈丢最旧 / apply 失败不移栈均正确且有单测锁定）；审查重点中的**布局数学不在本包**（grid 吸附/取整/clamp 全在消费侧 `flux-renderers-dashboard/src/layout-math.ts`，网格坐标为整数单位、逐帧从绝对指针位置重算，无浮点累积面）。核心风险集中在**提交链路的错误处理**（F-01：onCommitted 抛错被吞但基线已前进，状态失步 + 误报失败）与**热路径冗余计算**（F-02/F-03：auto 策略拖拽逐帧提交、事务内白算 diff）。合并（coalesce）缺口是设计文档明示的已知裁定，但"dashboard 无合并诉求"的断言与 inspector 逐击键入栈的现状矛盾（F-06）。

## P0 缺陷

无。未发现常规输入下必现的错误结果路径。

## P1 隐患

### F-01 onCommitted/notify 抛错被 catch 吞掉：committed 基线已前进却返回 ok:false，且订阅者永久失步

- 位置：`packages/editor-core/src/editor-core.ts:128-138`
- 关键源码摘录：
  ```ts
  try {
    const serialized = adapter.serialize(working);
    committed = cloneDocument(working); // 基线已推进
    pruneSelection();
    const result: EditorCommitResult = { ok: true, serialized };
    options.onCommitted?.(result); // host 回调，可抛错
    notify(); // 在回调之后
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
  ```
- 特定条件与后果（输入 → 路径 → 错误结果）：
  1. 输入：dashboard 编辑器（manual 策略）配置了 `onSave` schema action，host 的 action 实现抛错（下游同步异常是完全现实的输入；`onCommitted` 在消费侧即 `notifySave` → 派发 `dashboard-editor:save` 事件 → 执行任意 host action，见 `dashboard-editor-renderer.tsx:80-84,132-134`）。用户点击 Save。
  2. 路径：`commit()` → validate 通过 → serialize 成功 → `committed = cloneDocument(working)`（**基线已推进**）→ `pruneSelection()` 已执行 → `onCommitted` 抛错 → 落入 catch → 返回 `{ok:false, error}`，**`notify()` 永不执行**。
  3. 错误结果（三重叠加）：
     - **误报失败**：调用方收到 `ok:false`，消费侧随即派发 `dashboard-editor:error`（`dashboard-editor-renderer.tsx:262-274`），host 认为保存失败；
     - **状态失步**：实际 `committed` 已等于 working，下一次任意 notify 后 `dirty=false` → Save 按钮 `disabled={!session.dirty}` 置灰（`dashboard-editor-renderer.tsx:261`），用户看到"保存失败"却再也无法点击保存重试；
     - **revert 语义破坏**：此后 `revert()` 恢复到的是这条"失败"提交的新基线，用户彻底失去回退到保存前状态的能力（编辑内容对下游而言实际丢失）。
     - 附带：`onCommitted` 执行时 `notify()` 尚未运行，回调内调用 `core.getState()` 拿到的是旧快照（`lastSnapshot` 未刷新），与实际已推进的 `committed` 不一致。`notify()` 内 listener 抛错、`pruneSelection` 中 `getDocumentIds` 抛错同理落入同一 catch。
- 修复方向：把 `committed` 推进与不可信代码隔离——先 `serialize`（已包 try），再在独立的 try 中执行 `onCommitted`，回调抛错不应吞掉提交成功的事实（至少保证 `notify()` 在 finally 中执行、结果仍为 `ok:true` 或提供独立的 `onCommitError` 通道）；或把 `notify()` 移到 `onCommitted` 之前并让回调异常单独上报，绝不让"基线推进 + ok:false + 无通知"三者共存。

## P2 风险

### F-02 auto 策略下事务内 update 逐帧 runCommit：拖拽每个 pointermove 触发全量 commit + 下游保存事件风暴

- 位置：`packages/editor-core/src/editor-core.ts:176-178`（update 尾部无条件 auto 提交）；对照 `:204-206`（endTransaction 收口提交）
- 关键源码摘录：
  ```ts
  working = next;
  pruneSelection();
  notify();
  if (policy === 'auto') {
    runCommit(); // 不检查 txStart，事务内逐帧执行
  }
  return true;
  ```
- 问题：事务机制的目的是"一拖拽 = 一 undo 步"，而 auto 策略下 `update()` 在 `txStart !== null` 时仍每帧 `runCommit()`（validate 全量扫描 + `JSON.stringify` 全文档 + `structuredClone` 全文档 + `onCommitted`）。`endTransaction` 的 auto 收口提交（:204-206）说明设计意图本就是"事务边界提交一次"，逐帧提交对语义零增量。消费链实测可达：`DashboardEditorSchema.commitPolicy: 'auto'`（`dashboard-editor-renderer.tsx:42`，公开 schema 选项）→ 拖拽 `pointermove` → `core.update`（`editor-canvas.tsx:97-106`）→ 每帧 `notifySave` 派发一次 `dashboard-editor:save` schema action（可能触发 host 网络/store 写）。
- 影响：60Hz 拖拽 = 每秒 60 次全文档序列化 + 深拷贝 + host action 派发；下游收到风暴式保存事件，性能与语义双重危害。注：设计文档 `editor-core.md` §2.3"每次 working 变更即自动 commit"字面上认可了该行为，故不计 P1，但"含事务收口"一句恰恰说明事务边界提交才是本意，逐帧提交是实现选择而非必需。
- 修复方向：`update()` 中 auto 提交加 `txStart === null` 守卫，事务内的提交统一由 `endTransaction` 收口；一行改动，语义严格更优。

### F-03 拖拽热路径冗余计算：事务内 update 白算一次全量 diff，且每次 notify 都做 isDirty 全量 diff + getDocumentIds 全量重建

- 位置：`packages/editor-core/src/editor-core.ts:165-171`（diff 在事务判断之前计算）、`:85`（buildSnapshot → `dirty: isDirty()`）、`:68-74`（pruneSelection 每次 update 重建 id Set）
- 关键源码摘录：
  ```ts
  const diff = adapter.diff(prev, next); // 事务内计算后被丢弃
  if (txStart === null) {
    if (diff !== null) {
      const inverse = adapter.diff(next, prev);
      recordEntry(diff, inverse as TDiff);
    }
  }
  ```
- 问题：三处叠加在拖拽逐帧路径上——(1) `adapter.diff(prev, next)` 无论是否在事务内都先计算，事务内结果直接丢弃（dashboard 适配器每次 diff 需建 2 个 Map + 全面板扫描，`dashboard-domain-adapter.ts:48-49`）；(2) 每次 `notify()` 的 `buildSnapshot` 都跑 `isDirty()` = 又一次全量 diff（auto 策略下 update + runCommit 各 notify 一次 = 每帧 2 次）；(3) 每次 update 的 `pruneSelection` 全量 `getDocumentIds` + Set 重建。manual 策略下每帧至少 2 次全文档 diff + 1 次 id 集合重建，auto 下更多。
- 影响：面板数较大或 adapter diff 较重的领域（hmi 迁移后文档规模更大）拖拽掉帧风险；纯浪费，删除无任何语义损失。
- 修复方向：diff 计算移入 `txStart === null` 分支；`dirty` 可用脏标记增量维护（update/undo/redo/commit 时置位，而非每帧重算）或在文档引用未变时复用缓存；pruneSelection 可仅在 `adapter.getDocumentIds` 结果影响 selection 时执行（至少在事务内跳过——事务中途修剪无意义，endTransaction/abort 已会修剪）。

### F-04 开启事务期间 undo/redo/commit/revert 均无守卫：拖拽中 Cmd+Z 产生"合并越界"的撤销步，句柄 save 可提交半途状态

- 位置：`packages/editor-core/src/editor-core.ts:218-231`（undo 不检查 txStart）、`:248-259`（commit/revert 同）；消费侧可达入口 `editor-canvas.tsx:153-155`（键盘 undo，拖拽中 keydown 仍触发）、`use-dashboard-editor-handles.ts:46-50`（组件句柄 save）
- 问题：`undo()/redo()/commit()/revert()` 都不检查 `txStart !== null`。具体链：用户拖拽面板 B 中（事务开启，`txStart` = 拖拽前 working）按下 Cmd+Z → `undo()` 把上一条（拖拽前）命令的 inverse 应用到**半拖拽的 working** → pointerup → `endTransaction()` 以 stale 的 `txStart` 为基准 diff 出一条"混合了 A 撤销 + B 拖拽"的命令入栈。之后 undo 这一步会同时回退两件用户视为独立的事；`revert()` 在事务中执行则会让随后的 `endTransaction` 记录一条"回退本身"的怪异命令；句柄 `save()` 在拖拽中调用会把半途布局作为基线提交并触发下游同步。
- 影响：撤销历史边界与用户感知的操作边界错位；当前 dashboard 消费侧仅键盘 undo 与句柄 save 可达，但 editor-core 是领域无关内核，任何未来消费者（hmi 迁移）都会继承该未定义行为。
- 修复方向：`undo/redo/commit/revert` 遇 `txStart !== null` 时 no-op + dev warn（或自动 abortTransaction 后再执行，语义需裁定）；至少在文档中把事务期间的调用顺序约束写进 `EditorCore` 接口注释。

### F-05 cloneDocument 回退浅拷贝静默降级：双态隔离退化到一级深，无任何告警

- 位置：`packages/editor-core/src/editor-core.ts:31-40`
- 关键源码摘录：
  ```ts
  try {
    return structuredClone(document);
  } catch {
    if (isPlainCloneSupported(document)) {
      return { ...(document as object) } as TDocument; // 浅拷贝
    }
    return document; // 原引用
  }
  ```
- 问题：文档含任何不可克隆值（函数/symbol/DOM 节点等，违反"可序列化 JSON"契约的输入）时静默回退浅拷贝：`working` 与 `committed` 共享全部嵌套引用（如 `panels` 数组内对象），R5 双态隔离退化为仅顶层隔离；undo 栈中的 diff entry 也与活文档共享嵌套对象。此后任何一处就地修改（host 侧违反纯函数约定的 updater）会同时污染 working/committed/历史栈，且完全无感知——没有 console.warn，没有 dev 断言。另外 `isPlainCloneSupported` 实际上对几乎所有对象都为真（constructor 要么是函数要么是 undefined），判别意义有限；数组经此回退会变成无原型的普通对象。
- 影响：契约违反输入的失败模式从"快速失败"变成"静默腐坏"，排查成本极高；`cloneDocument` 是公开导出 API，消费侧也可能直接依赖。
- 修复方向：回退分支至少 `console.warn` 一次性提示隔离降级；更好是 dev 模式直接抛错（结构化克隆失败即文档非法），生产可选浅拷贝 + 告警。

### F-06 合并（coalesce）能力缺失，且设计断言"dashboard 无合并诉求"与消费现状矛盾：inspector 每击键一条 undo 记录

- 位置：`packages/editor-core/src/types.ts:26`（operationKind 注释"跨操作合并…用"但全包无合并实现）、`docs/architecture/editor-core.md` §6.1（"dashboard 域无合并诉求"）；消费证据 `flux-renderers-dashboard/src/editor/editor-inspector.tsx:63-69,208-216`
- 关键源码摘录（editor-inspector.tsx:208-216，每个 onChange 击键调用一次）：
  ```ts
  function updatePanel(core, panelId, patch) {
    core.update((doc) => ({
      panels: doc.panels.map((p) => (p.id === panelId ? { ...p, ...patch } : p)),
    }));
  }
  ```
- 问题：`EditorDiffEntry.operationKind` 的注释暗示支持跨操作合并，但 `UndoCommandStack` 与 `createEditorCore` 均无任何合并逻辑（无 replaceUndoTop / coalesceGroup，设计文档 §6.1 已承认是 hmi 迁移缺口，但同句断言 dashboard 不需要——不成立）。现实：inspector 的 Title/X/Y/W/H/source 输入框每次击键都触发独立 `core.update`，输入 30 字符标题 = 30 条 undo 记录 = 挤掉 30 条更早的历史（100 深栈），且撤销需按 30 次。
- 影响：undo 粒度在文本编辑场景不可用；历史栈被逐字符挤占导致更早操作提前不可撤销。
- 修复方向：补 `UndoCommandStack.replaceUndoTop(entry)`（hmi 迁移也需要）；消费侧对文本类字段做 debounce 或在 editor-core 增加 `(operationKind, timeWindow)` 合并策略（时间窗或同 kind 顶替）。

### F-07 消费侧契约观察（不计入本包缺陷）：组件句柄 save 双发保存事件；适配器对纯顺序调整 diff 盲

- 位置：`flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts:46-50`；`flux-renderers-dashboard/src/editor/dashboard-domain-adapter.ts:44-83`
- 问题一（双发）：handle `save` 先调 `current.commit()`（内部 `runCommit` 已触发 `options.onCommitted` → `notifySave` 派发一次 `dashboard-editor:save`），随后 handle 又显式调用 `latest.current.onCommitted?.(...)`（= 同一个 `notifySave`）再派发一次。同一保存动作下游收到两次保存事件。
- 问题二（顺序盲，latent）：dashboard `diff` 仅按 id 对比内容与增删，**忽略数组顺序变化**——两个面板仅交换位置时 diff 返回 `null`（不入栈、dirty=false，顺序调整静默不可撤销/不落盘）。当前消费侧所有写路径都不改顺序（drag 只改 x/y、增删按尾部/过滤），故为潜伏问题；一旦引入 z-order 调整即触发。设计文档 §6 已注明 `reordered` 语义由 adapter 承载，属已知适配责任。
- 修复方向：handle save 移除重复的 onCommitted 调用（或 buildSession 不再注册 options.onCommitted 而统一走 handle）；adapter 的 diff 增加 order 指纹（如 id 序列 join）。

## P3 提示

### F-08 领域注册表为模块级全局且当前全仓无运行时消费者

- 位置：`packages/editor-core/src/domain-registry.ts:10-14`
- `registerEditorDomain/getEditorDomain` 在 `packages/`、`apps/` 中除本包测试外零调用（已 grep 全仓确认）。模块级 `Map` 全局共享（多实例/多窗口共内存场景语义为"最后注册者赢"，覆盖裁定虽已单测锁定并写入设计文档，属有意行为）；`getEditorDomain` 返回 `EditorDomainAdapter<unknown, unknown>`，消费侧需自行断言类型。属面向 hmi 迁移的前置设施，保留可接受，但应在设计文档标注"暂无消费者"以防误判为活跃链路。

### F-09 record() 边角语义：事务内静默 no-op、auto 策略下不触发提交

- 位置：`packages/editor-core/src/editor-core.ts:182-186`
- `record()` 在事务内直接 return（无 warn，调用方无从得知被忽略）；auto 策略下 `record` 不像 `update`/`endTransaction` 那样触发 runCommit，三者行为不一致。当前消费侧无人调用 `record`（grep 确认），实际影响为零；若未来使用建议补齐：事务内 warn + auto 提交一致性。

### F-10 EditorDiffEntry 无命令 id 与不可逆标记；timestamp/operationKind 为只写元数据

- 位置：`packages/editor-core/src/types.ts:20-29`
- 审查重点中的"命令 id / 不可逆命令标记"均不存在：entry 仅 `forward/inverse/operationKind?/timestamp`，且栈不暴露 entry（`EditorSessionState` 只投影 canUndo/深度），两个元数据字段当前无处可读（write-only）。所有 entry 被一视同仁视为可逆——一旦某领域命令有外部副作用（不可逆），无任何机制阻止其入栈后被"撤销"。当前消费者无此需求；为 hmi 迁移与调试能力（如历史面板）预留时可考虑暴露只读栈视图。

### F-11 maxStackDepth 未校验：0/负数使栈恒空，NaN 使上限失效

- 位置：`packages/editor-core/src/editor-core.ts:56`、`undo-command-stack.ts:27-41`
- `options.maxStackDepth = 0` 或负数 → `push` 后立即 shift，undo 永不可用（静默）；`NaN` → `length > NaN` 恒 false，栈无限增长，`MAX_UNDO_STACK_DEPTH` 形同虚设。建议构造时归一：非有限或 <1 的值回退缺省 100。

### F-12 初始 selection 不修剪；setSelection 允许重复 id 且相同值仍 notify

- 位置：`packages/editor-core/src/editor-core.ts:54`（options.selection 直接拷贝）、`:267-279`
- 创建时传入的 selection 不经 `getDocumentIds` 修剪，与 `setSelection` 的修剪行为不一致（幽灵 id 会存活到第一次文档变更）；`setSelection(['a','a'])` 保留重复项；设置与当前完全相同的选区仍会 notify → 新快照对象 → `useSyncExternalStore` 触发一次无意义重渲染（消费侧每次 `startDrag` 都调 `setSelection`，指针按下即多一次渲染）。建议：创建时修剪 + setSelection 做去重与浅等价短路。

### F-13 防御不一致：validate 抛错未捕获、生产路径 console.warn 未门控、持续失败的栈顶卡死

- 位置：`packages/editor-core/src/editor-core.ts:120-121`（validate 在 try 外）、`:96-98,115`（warn）、`undo-command-stack.ts` peek/pop 设计
- `runCommit` 捕获了 serialize/onCommitted 的异常，但 `adapter.validate` 抛错会直接从 `commit()` 公开 API 逸出（消费侧 Save 按钮 onClick 无 try/catch，异常进入 React 事件层）；对比之下 `applyDiff` 抛错却被 `applyEntryToWorking` 捕获——同一适配器契约面的防御策略不一致。undo/redo 空栈与 applyDiff 失败的 `console.warn` 未按 DEV 门控，生产环境用户狂按 Cmd+Z 会刷警告。另外 applyDiff 持续失败（如非对称 diff 适配器）时 peek 不移栈的设计使 undo 永久卡在同一条失败 entry 上反复重试（设计文档 §6 已注明与 hmi dropUndoTop"行为等价"，实际是"等价但无逃生"）。

### F-14 diff 非对称适配器会把 null 强转为 inverse 入栈，无 dev 校验

- 位置：`packages/editor-core/src/editor-core.ts:168-169,199-202`
- `update`/`endTransaction` 均为 `const inverse = adapter.diff(next, prev); recordEntry(forward, inverse as TDiff)`——若适配器违反对称契约（forward 非 null 而 inverse 为 null），null 被静默入栈，undo 时 `applyDiff(working, null)` 产出垃圾或抛错（被捕获后卡死，见 F-13）。对称性契约仅靠类型注释与单测约定，运行时（哪怕仅 dev 模式）无校验。dashboard 适配器经推演是对称的，现网无影响。

## 检查过程记录

1. **范围界定**：`ls` + `wc -l` 确认 `packages/editor-core/src/` 共 6 文件（5 实现 + 1 测试），593 实现行；逐文件精读全部 5 个实现文件与测试文件。
2. **消费者追溯**：grep 全仓（packages/ apps/，排除 node_modules/dist）`@nop-chaos/editor-core` 及符号级 `createEditorCore|UndoCommandStack|registerEditorDomain|cloneDocument|EditorDomainAdapter`——唯一运行时消费者为 `packages/flux-renderers-dashboard/src/editor/`（7 文件，全部精读）。注意 `report-designer-core`/`flow-designer-core` 中的 `cloneDocument` 是各自包内同名函数，与本包无关（反误报排除）。注册表四函数全仓无运行时调用方。
3. **契约基线**：精读 `docs/architecture/editor-core.md`（owner doc）——确认"auto 每次变更即提交"（影响 F-02 定级）、"commit 不清栈 / revert 清栈"“合并缺口为已知裁定”（影响 F-06 定级）、"apply 失败不移栈与 hmi dropUndoTop 行为等价"（影响 F-13 定级）均为文档化裁定，据实降级而非误报为缺陷。
4. **undo/redo 栈正确性推演**：对"entry 原样搬移"设计做了 undo→undo→redo→undo、undo→update 截断 redo、满栈丢最旧（`maxStackDepth:3` 场景）、redo 回填再溢出等序列的手工推演，与 `editor-core.test.ts` 断言一致，未发现分支丢弃/字段调换错误。`applyDiff` 失败时 peek 不 pop 的失败路径正确（working 赋值前抛错不会半更新）。
5. **适配器对称性推演**：对 `DashboardLayoutDiff` 的 apply 顺序（先降序移除 → 按 id 打补丁 → 升序插入 clamp）做了多种 add/remove/patch 组合的 round-trip 手工验证，均对称成立；唯一盲区是纯顺序变化（记入 F-07，latent）。
6. **布局数学范围核实**：审计重点中的像素取整/浮点累积/grid 吸附 clamp 不在本包——位于 `flux-renderers-dashboard/src/layout-math.ts`（已通读确认：网格坐标全整数、`snapToGrid` 用 `Math.round` 从绝对指针位置重算而非增量累积、`clampPanelPosition`/`clampPanelSize` 边界完整），属 17 号审计（flux-renderers-dashboard）范围，本报告不重复计缺陷。
7. **选中模型范围核实**：多重选中 API 支持（`setSelection(string[])`，消费侧 duplicate 流程实际用到多选）；框选（marquee）与"undo 后选中恢复"在内核与消费侧均无实现也无契约承诺（undo 只修剪不恢复选区），如实记录为范围事实而非缺陷。
8. ** severity 校准**：F-01 曾考虑 P0，因触发条件需 host action 抛错（异常输入而非常规输入）定 P1；F-02 因设计文档字面认可定 P2；F-06 缺口本身是文档化裁定，但设计断言与消费现状矛盾且后果实在，定 P2。全部 finding 均基于源码行级证据，无推测性条目。
