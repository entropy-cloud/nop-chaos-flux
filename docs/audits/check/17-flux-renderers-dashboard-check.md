# 17 flux-renderers-dashboard 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-dashboard/src/`，排除 `*.test.*` 与 `__tests__/` 后共 14 个实现文件约 1970 行（`index.ts` / `schemas.ts` / `dashboard-definitions.ts` / `layout-math.ts` / `dashboard-renderer.tsx` / `styles.css` + `editor/` 下 8 个）。全部文件精读。
- 任务背景假设该包是 chart 图表包装（recharts/echarts），**实际 src 不符**：`package.json` 依赖仅 `editor-core` / `flux-core` / `flux-i18n` / `flux-react` / `ui`，无任何图表库。该包是「dashboard 网格布局运行态（`dashboard`）+ 编辑器（`dashboard-editor`，基于 editor-core 会话：拖拽/八向 resize/网格吸附/undo/保存）」。审计按实际实现面执行，任务给定的"图表包装经典缺陷面"映射为：实例生命周期 → editor-core 会话生命周期；容器尺寸竞态 → 画布宽度测量；更新策略 → 事务/undo 粒度；监听清理 → ResizeObserver。
- 结论概览：**P0 x2 / P1 x2 / P2 x9 / P3 x7**。两条 P0 都是确定性的正确性硬伤：`resizePanel` 对含 `w`/`n` 轴的 5/8 个句柄方向反转（且被单元测试固化为"预期"）；运行态像素换算硬编码 `canvasWidth = 1200` 而画布是 `width:'100%'` 流式，任何非 1200px 宿主必错位。整体骨架质量不差——纯函数层可单测、事务=单 undo 步、RO disconnect 配对、i18n key 双语齐全、面板内容有节点级错误边界——但交互层（键盘重复触发、inspector 状态同步、滚动后拖拽坐标）与生命周期（会话不 dispose、prop 变更被忽略）存在成片隐患。

## P0 缺陷

### F-01 `resizePanel` 西/北轴方向反转：8 个句柄中 5 个行为颠倒，单元测试固化了错误方向

- 位置：`packages/flux-renderers-dashboard/src/layout-math.ts:180-197`（实现）；`src/editor/editor-canvas.tsx:94-103`（调用点直传原始指针位移）；`src/layout-math.test.ts:144-159`（测试固化错误语义）
- 摘录（layout-math.ts:180-197）：
  ```ts
  const dW = Math.round(dxPixels / (cw + gap));
  const dH = Math.round(dyPixels / (rowHeight + gap));
  if (handle.includes('e')) {
    next.w = clamp(target.w + dW, minW, cols - target.x);
  } else if (handle.includes('w')) {
    next.x = clamp(target.x - dW, 0, target.x + target.w - minW);
    next.w = target.x + target.w - next.x;
  }
  if (handle.includes('s')) {
    next.h = clamp(target.h + dH, minH, Infinity);
  } else if (handle.includes('n')) {
    next.y = clamp(target.y - dH, 0, target.y + target.h - minH);
    next.h = target.y + target.h - next.y;
  }
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：用户抓起 `w`（或 `n`/`nw`/`ne`/`sw`）句柄向左/上拖动（`dx < 0` / `dy < 0`，物理语义=扩大面板）。
  2. 路径：`editor-canvas.tsx:95-96` 传入原始位移 `dx = clientX - startClientX`；`resizePanel` 对 `w` 轴执行 `next.x = target.x - dW` —— `dW` 为负时 `x` 反而增大，`next.w = 右缘 - next.x` 随之变小。
  3. 错误结果：向左拖西缘，面板向右收缩；向右拖西缘，面板向左膨胀。`n` 轴同理（向上拖北缘反而压扁）。与物理方向完全相反。
- 波及面：`e`/`s`/`se` 正确；`w`/`n`/`nw` 两轴皆反；`ne`/`sw` 各有一轴反。即 8 句柄中 5 个不可用。
- 测试固化证据（layout-math.test.ts:148-150）：`resizePanel(base, 'a', 'w', 101, 0, ...)` 断言 `w` 从 4 变 5、`x` 从 2 变 1 —— 向右拖西缘期望"变宽+左移"，把反转语义写成了预期。交互测试只覆盖 `se`（editor 测试 127 行），恰好是唯一全对的方向组合之一，故全绿掩盖缺陷。
- 影响：编辑器 resize 交互对多数句柄不可用（反向）；依赖该纯函数的任何后续消费方继承错误语义。
- 修复方向：`w` 轴改为 `next.x = clamp(target.x + dW, 0, target.x + target.w - minW)`（`n` 轴同理 `target.y + dH`），保持"右缘/底缘固定"推导；同步修正 layout-math.test.ts 中 w/n/nw 断言与方向注释；为 editor 交互层补 `nw`/`w` 句柄的位移方向回归测试。

### F-02 运行态像素换算硬编码 `canvasWidth = 1200`，与 `width:'100%'` 流式画布矛盾：任何非 1200px 宿主必错位，且违背"编辑/运行同构"设计裁定

- 位置：`packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:80`（硬编码）、`:117-121`（流式画布）、`:122-128`（换算）；对照 `src/editor/editor-canvas.tsx:39-56`（编辑态实测宽度）；`apps/playground/src/pages/dashboard-demo.tsx:192`（宿主恰好 `max-w-[1200px]` 掩盖问题）
- 摘录（dashboard-renderer.tsx:80,117-127）：
  ```tsx
  const canvasWidth = 1200;
  ...
  <div
    data-slot="dashboard-canvas"
    className="relative"
    style={{ width: '100%', minWidth: 320, height: Math.max(height, 120) }}
  >
    {panels.map((panel) => {
      const rect = panelToPixels(panel, { cols: layout.cols, rowHeight: layout.rowHeight, gap: layout.gap, canvasWidth });
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：任意宿主容器宽度 ≠ 1200px（画布 `width:'100%'` 明确表达流式意图；playground demo 用 `max-w-[1200px]` 才恰好对齐）。
  2. 路径：`panelToPixels` 以 1200 为基线算 `cw = (1200 - 11*gap)/cols ≈ 92.7`（12 列），输出绝对像素 `left/width`；真实容器是 100% 宽。
  3. 错误结果：800px 容器中满宽面板宽 1112px，横向溢出（根节点无 overflow 裁剪，撑破页面）；1600px 容器中全部面板压缩在左侧 1112px，右侧 ~390px 永久空白；列间距也按错误基线放大/缩小。同一布局在编辑态（RO 实测宽度换算）与运行态呈现完全不同。
- 设计冲突：design.md §2.2 裁定"自研绝对定位 + 网格对齐渲染……编辑态坐标 → 运行态渲染零转换，`DashboardPanelSchema` 为坐标模型单一来源"。编辑态 `useCanvasWidth` 用 ResizeObserver 实测，运行态却用常量，"同构"只存在于 1200px 容器中。
- 影响：运行态 `dashboard` renderer 在常规流式布局中不可用；编辑器保存的布局在真实页面错位。
- 修复方向：运行态复用编辑态的测量方案（`useCanvasWidth` 提升到共享 hook，`width>0` 门控 + RO + disconnect，jsdom/SSR 回退默认值）；或改用百分比定位（`left: x/cols*100%`）彻底消除宽度依赖；`minWidth:320` 语义需与换算基准一致。

## P1 隐患

### F-03 键盘快捷键双触发：panel 与 canvas-body 都挂 `handleKeyDown` 且无 stopPropagation，Tab 聚焦面板后 Ctrl+Z 一次退两步、Ctrl+D 翻倍复制

- 位置：`packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:142-168`（handler）、`:204`（body `onKeyDown={handleKeyDown}`）、`:231`（panel `onKeyDown={handleKeyDown}`）
- 摘录（editor-canvas.tsx:153-167）：
  ```tsx
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    event.preventDefault();
    core.undo();
  } else if (
    (event.metaKey || event.ctrlKey) &&
    (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))
  ) {
    event.preventDefault();
    core.redo();
  } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    duplicateSelected(core, sel);
  ```
- 触发条件：panel div 有 `tabIndex={0}`，键盘用户 Tab 聚焦面板后按键，事件 target=panel、经 React 合成事件冒泡先后命中 panel 与 body 两处同名 handler。`preventDefault()` 不阻断传播，handler 内亦无 `stopPropagation()`。
- 后果（按 editor-core 语义核实）：`core.undo()` 被同步调用两次 → 一次 Ctrl+Z 回退两个 undo 步；`core.redo()` 同理；`duplicateSelected` 第二次调用读取已更新的 `working`（`editor-canvas.tsx:296`），为每个选中面板再生成一份 `-copy-2` → 复制数量翻倍；Delete 分支因过滤幂等而无害。
- 修复方向：只保留一处键盘层（body），panel 上的 `onKeyDown` 删除或改为仅处理 Enter/Space 语义；或在 handler 首行 `event.stopPropagation()` 后仅在 panel 层处理；补"面板聚焦时 Ctrl+Z 只退一步"的交互测试。

### F-04 Inspector `NumberInput` 的 draft 不随 props 同步：切换选中面板或 undo 后显示旧值，误导直接改错面板

- 位置：`packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:131-155`
- 摘录（editor-inspector.tsx:140-152）：
  ```tsx
  function NumberInput({ value, onChange, testId }: { value: number; onChange: (value: number) => void; testId: string }) {
    const [draft, setDraft] = useState(String(value));
    const effectiveValue = Number.isFinite(value) ? value : 0;
    return (
      <Input
        type="number"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        onBlur={() => setDraft(String(effectiveValue))}
  ```
- 特定条件与后果：`draft` 仅在挂载时取一次 `value`，之后外部一切变化（切换选中面板 A→B——`InspectorField` 无 `key`，组件按位置复用不重挂载；画布拖拽/resize 改坐标；Ctrl+Z 回退）都不会反映到输入框，直到 blur 才回填。用户看到 B 面板的坐标实为 A 的旧值（或 undo 前的值）；此时直接输入新值虽按 `onChange` 写给当前面板，但显示与实际不一致，且"看错→改错"路径真实存在（例如以为 W=5 实为 W=2，少改了）。
- 同族问题：`JsonPropsEditor`（`:157-206`）的 pending `draft` 跨面板保留——为 A 编辑了未 Apply 的 JSON，切换到 B 点 Apply 会把 A 的 props 写进 B（见 F-12 详述，本条聚焦显示层）。
- 修复方向：`NumberInput` 受控化——`value={draft ?? String(value)}` 且在 `value` 外部变化（比较 `lastPropValue` ref）时重置 draft；或对选中面板 id 加 `key` 强制重挂载 inspector 字段组；`JsonPropsEditor` 在 `selectedPanel.id` 变化时丢弃 draft。

## P2 风险

### F-05 编辑会话 unmount 不 dispose：违反"runtime owner 显式 teardown"纪律

- 位置：`packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:139-161`
- 摘录（:145-160）：
  ```tsx
  useEffect(() => {
    const incoming = resolveInitialDocument(schemaProps.layout);
    const current = coreRef.current;
    if (!current) {
      coreRef.current = buildSession(incoming, commitPolicy, initialMode, notifySave);
      ...
    }
    if (incoming === lastLayoutPropRef.current) return;
    ...
    if (diffDashboardDocument(current.getState().committed, incoming) !== null) {
      current.dispose();
      ...
  ```
- 问题：effect 只在 layout prop 推回路径调用 `current.dispose()`，组件卸载路径没有 cleanup 函数，`core.dispose()`（editor-core.ts:281-286，负责清 listeners/undo 栈/中止事务）永不执行。`renderer-runtime.md` 架构纪律要求 "runtime owners must expose explicit teardown for long-lived resources"。
- 影响：当前后果有限（`useEditorCoreSession` 自行退订、句柄注册 effect 返回反注册、core 可被 GC），但处于事务中的拖拽被卸载打断时 `txStart` 悬置，且该模式一旦 editor-core 增加定时器/全局注册即成泄漏；属生命周期契约缺口。StrictMode 下双跑因 identity guard 早退而无害（已核实）。
- 修复方向：effect 返回 cleanup，对"组件真实卸载"（可借助 ref + deferred dispose 区分 StrictMode 重放，参照 renderer-runtime.md:59 的 commit-safe 纪律）调用 `coreRef.current?.dispose()` 并置空。

### F-06 `commitPolicy` / `mode` prop 运行期变更被静默忽略

- 位置：`packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:136-137、145-161`
- 问题：effect 依赖数组含 `[schemaProps.layout, commitPolicy, initialMode]`，但函数体第二行 `if (incoming === lastLayoutPropRef.current) return;` 使得 layout 引用不变时（对象 prop 常见），commitPolicy 从 manual 改 auto、mode 改 preview 都不重建/更新会话；这些值只作为 `buildSession` 的一次性构造参数被闭包捕获。
- 影响：host 按 schema 契约（propContracts 明示两字段可编辑）动态切换提交策略或初始模式时无任何生效，也无警告——"看起来支持受控，实际只在挂载时读取"。
- 修复方向：依赖变化时重建会话（与 layout 推回同路径），或至少对不支持运行期变更 dev-warn 并在文档/propContracts 标注 mount-only。

### F-07 面板内容 fragment 每次渲染重建，击穿"compile once"缓存：编辑态拖拽每帧全量重编译所有面板

- 位置：`packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:188-201（renderPanelContent 内联构造 fragment）、:305-307（inline arrow prop 每渲染新引用）`；`src/dashboard-renderer.tsx:97-105`（运行态同模式）
- 摘录（dashboard-editor-renderer.tsx:193-200）：
  ```tsx
  const fragment: BaseSchema = {
    type: panel.type,
    ...(panel.props !== undefined && panel.props !== null && typeof panel.props === 'object'
      ? (panel.props as object)
      : {}),
    ...(panel.source !== undefined ? { data: panel.source, source: panel.source } : {}),
  } as unknown as BaseSchema;
  return asReactNode(helpers.render(fragment, { pathSuffix: 'editor-panel' }));
  ```
- 机制（对照 `packages/flux-react/src/render-nodes.tsx:283-286`）：`RenderNodes` 以 `useMemo([runtime, props.input, compileOptions])` 缓存编译结果，而 `props.input` 是每次渲染新建的对象字面量 → memo 恒失效 → `runtime.schemaCompiler.compile` 每次重跑。编辑态拖拽时 `core.update` 每个 pointermove 触发全树重渲染，`renderPanelContent` 又经 inline arrow（:305-307）每帧换引用，全部 N 个面板（含未拖动面板，其 panel 对象引用虽稳定但被新建的 fragment 对象遮蔽）每帧重编译 + 子树重渲染。60fps × N 面板（chart/table 均为重 schema）明显超出编辑器应有的每帧成本。
- 运行态影响较弱（重渲染频率低）但同源：任何 scope 变化引发的重渲染都重编译全部面板。
- 修复方向：以 `panel.id` + `panel.props/source` 引用为键 memo 化 fragment 构造（或直接 memo `helpers.render` 结果元素）；`renderPanelContent` prop 用稳定引用（组件外提或 useCallback——此处属"解决具体问题"的合理场景）；更彻底的做法是把 panel fragment 编译下沉为按 panel.id 的缓存表。

### F-08 编辑器允许产生并保存越界/零值几何，运行态 `sanitizePanels` 再静默 clamp："所存即所视"被破坏

- 位置：`src/editor/dashboard-domain-adapter.ts:124-155`（validate 只查数值性不查边界）；`src/editor/editor-inspector.tsx:146-151`（清空输入框 → `Number('') === 0` → `onChange(0)`，w/h 可被置 0）；`src/editor/editor-canvas.tsx:310`（duplicate `x+1/y+1` 不 clamp，可超 cols）；`src/editor/editor-canvas.tsx:176-178` + `:317-328`（drop 坐标可负、不 clamp）；对照 `src/layout-math.ts:245-248`（运行态 clamp）
- 后果链：inspector 清空 W → `w=0` 进入 working → `panelToPixels` 算出 `width = 0*cw + (0-1)*gap = -8px`（负宽度 style）→ validate 通过（0 是有限数）→ commit 保存 `w:0` → 运行态 sanitize clamp 回 1。同理 x=999 保存后在编辑器画布溢出右侧、运行态被拉回 `cols-w`。编辑视图、保存数据、运行视图三者不一致，且全程无告警。
- 修复方向：`validate` 增加 `0 <= x, 1 <= w, x+w <= cols, y >= 0, h >= 1` 边界断言（需把 cols 传入 adapter 或经 options）；`updatePanel` patch 落盘前经 `clampPanelSize/clampPanelPosition`；`duplicateSelected` 与 drop 落点 clamp；`NumberInput` 空串不派发 0。

### F-09 `component:save()` 句柄双派发 `dashboard-editor:save` 事件

- 位置：`src/editor/use-dashboard-editor-handles.ts:46-50`；根因组合 `src/editor/dashboard-editor-renderer.tsx:80-84（buildSession options.onCommitted → notifySave）+ :185（onCommitted: notifySave 传入句柄）`；editor-core 侧 `packages/editor-core/src/editor-core.ts:132`（runCommit 内 `options.onCommitted?.(result)`）
- 摘录（use-dashboard-editor-handles.ts:46-50）：
  ```ts
  case 'save': {
    const result = current.commit();
    if (!result.ok) return { ok: false, error: result.error ?? new Error('commit failed') };
    latest.current.onCommitted?.(result.serialized as string, current.getState().working);
    return { ok: true, data: result.serialized };
  }
  ```
- 推理：`current.commit()` → `runCommit` 已同步调用 `options.onCommitted`（即 notifySave #1，派发 `dashboard-editor:save`）；随后句柄又显式调用 `latest.current.onCommitted`（notifySave #2）→ 同一次 save 派发两次 schema 事件。头部 Save 按钮路径（`core.commit()` 直调）只有一次，测试只覆盖按钮路径。
- 影响：host 若经 `component:save()` 触发保存并监听 `onSave` 做下游同步（写库/广播），会双写。
- 修复方向：句柄内去掉显式 `onCommitted` 调用（runCommit 已回调），或 buildSession 不再传 onCommitted 而统一由句柄/按钮路径显式通知——二选一，保证单一出口；补 `component:save` 路径的事件次数断言。

### F-10 `buildPanelFragment` 展开顺序允许 `panel.props` 覆盖 `type`/`data`/`source`，运行态与编辑态两份同构代码共享该缺陷

- 位置：`src/dashboard-renderer.tsx:55-63`；`src/editor/dashboard-editor-renderer.tsx:193-199`（复制版）
- 摘录（dashboard-renderer.tsx:56-62）：
  ```ts
  return {
    type: panel.type,
    ...(panel.props !== undefined && panel.props !== null && typeof panel.props === 'object'
      ? (panel.props as object)
      : {}),
    ...(panel.source !== undefined ? { data: panel.source, source: panel.source } : {}),
  } as unknown as BaseSchema;
  ```
- 问题：`props` 在 `type` 之后展开——面板 `props: { type: 'xxx' }` 会静默改写面板内容 renderer 类型（sanitize/validate 均不剥离）；`props` 中的 `data`/`source` 键会被 `panel.source` 覆盖（若面板内容 renderer 自身契约使用这些键名，语义被劫持）。`as unknown as BaseSchema` 双重断言掩盖了这一切。
- 修复方向：展开顺序调整为 props 先、`type`/`source` 注入后；或从 props 中显式剔除保留键；抽取单一共享的 `buildPanelFragment`（同时消除 F-16 的复制）。

### F-11 raw `<button>` 违反 MANDATORY UI 组件规则

- 位置：`src/editor/editor-palette.tsx:48-62`（palette 条目）；`src/editor/editor-canvas.tsx:239-252`（面板删除按钮）
- 问题：AGENTS.md "NEVER use raw HTML elements when `@nop-chaos/ui` provides a component"——两处均为可用 `Button` 替代的裸 `<button>`（含手写 hover/边框类）。`editor-inspector.tsx:56` 在 `NativeSelect` 内使用 raw `<option>` 属合理用法（原生 select 语义），不计。
- 影响：样式体系脱钩（不走 ui 的 variant/token 契约），hover/focus 态与全局按钮不一致。
- 修复方向：palette 条目改 `Button variant="outline"` + 自定义 className（draggable 属性照挂）；删除按钮改 `Button variant="outline" size="icon"`。

### F-12 `JsonPropsEditor` pending draft 跨面板串写

- 位置：`src/editor/editor-inspector.tsx:157-206`
- 条件与后果：为面板 A 编辑 props JSON 未 Apply（draft 非 null）→ 直接点选面板 B（inspector 不重挂载、draft 不清）→ 文本框仍显示 A 的草稿，点 Apply 将 A 的 props JSON 写入 B（`onChange(parsed)` 目标是当前选中面板）。与 F-04 同根（选中目标切换不重置局部编辑态），但后果是数据串写而非仅显示错。
- 修复方向：`JsonPropsEditor`/`NumberInput` 感知 `selectedPanel.id` 变化即丢弃 draft（对字段组加 `key={selectedPanel.id}` 最直接）。

### F-13 拖拽坐标基准缺陷：不保留抓取偏移（原点跳到光标格）+ 画布滚动后拖拽/落点错位

- 位置：`src/editor/editor-canvas.tsx:88-106（move 用 cursor 直接当原点）、:128-133（canvasRect 拖拽期不更新）`；`src/layout-math.ts:142-157（dragPanel 语义）`；`:317-328（clientToGrid 同样用视口 rect，未加 scrollTop/scrollLeft）`
- 条件与后果：
  1. 抓取偏移：pointerdown 未记录光标在面板内的偏移，首个 move 即把面板原点吸附到光标所在格——从 6x4 面板右下角抓起时面板瞬移约 5 列 3 行。测试（editor 测试 :102-119）只断言"移动了"，跳变不可见。
  2. 滚动错位：外层 canvas `overflow-auto`，面板可超出 body 高度（如 inspector 输入 y=20 → 960px > 600px 默认高）产生滚动；`drag.canvasRect`/`clientToGrid` 的 `getBoundingClientRect` 是视口坐标，`y = clientY - rect.top` 未加 `scrollTop` → 滚动后拖拽/落点系统性偏移滚动量。
- 修复方向：pointerdown 记录 `grabOffset`（光标 - 面板左上），move 时 `dragPanel(..., x - grabOffsetX, y - grabOffsetY)`；坐标系统一改为 body（内容）坐标系：用 `bodyRect` 或 `clientX - canvasRect.left + canvas.scrollLeft`。

## P3 提示

### F-14 `helpersRef` 死代码

- 位置：`src/editor/dashboard-editor-renderer.tsx:109、112-114`。`helpersRef` 声明并每帧赋值但全文无读取点。删除。

### F-15 编辑态全部面板共享 `pathSuffix: 'editor-panel'`

- 位置：`src/editor/dashboard-editor-renderer.tsx:200`。运行态用 `panel.${panel.id}`（dashboard-renderer.tsx:103）保证唯一；编辑态共用常量使所有面板 fragment 的编译 basePath/诊断路径重名（`render-nodes.tsx:276` 以 pathSuffix 拼 basePath），debugger/监控路径歧义。无功能损坏（fragment scope 缓存键为 useId，已核实不串）。改为 `editor-panel.${panel.id}`。

### F-16 默认值与 fragment 构造的重复实现

- 位置：`src/dashboard-renderer.tsx:24-39`（`resolveLayoutProps` 以字面量 12/40/8 重复 `resolveCols/resolveRowHeight/resolveGapPx` 的默认，绕开单一来源 `DEFAULT_*`）；`dashboard-renderer.tsx:55-63` 与 `dashboard-editor-renderer.tsx:193-199` 两份同构 `buildPanelFragment`（已致 F-10 双修）。收敛到 layout-math 与共享模块。

### F-17 i18n 覆盖不一致：部分用户可见文案与 aria-label 硬编码英文

- 位置：`src/editor/editor-inspector.tsx:45-116`（"Id"/"Type"/"Title"/"X/Y/W/H"/"Source (data expression)"/"Props (JSON)" 直接字面量，而同文件 reset/apply 走 `t()`）；`src/editor/editor-palette.tsx:13-26`（Chart/Table/Stat Tile 等用户可见标签）；`src/editor/dashboard-editor-renderer.tsx:339、346`（`leftLabel="Collapse panel palette"` 等 aria-label）；`src/editor/editor-canvas.tsx:200、222、241`（aria-label 英文）。已核对 `flux-i18n` zh-CN/en-US locale 的 `flux.dashboard.editor.*` 14 个 key 双语齐全——问题只在新增文案未走 i18n。属 D7 一致性债。

### F-18 controlled push-back 以 `committed` 为比对基准，可能丢弃 working 未提交编辑（suspect，或为设计取舍）

- 位置：`src/editor/dashboard-editor-renderer.tsx:156`。host 推回与 committed 不同但与 working 等价的 layout（如保存回执回写）→ 会话重建，undo 历史与未提交 working 一并丢失。若设计意图即"host 为唯一真相"可接受，建议在 design.md 明示该语义，否则改比 `working`。

### F-19 `sanitizePanels` 渲染期 console.warn 无 DEV 门控

- 位置：`src/layout-math.ts:223-242`。重复 id/非法项在每次渲染（含生产）都告警一遍；文档定位是"dev warn"。建议 `import.meta.env.DEV` 门控或聚合计数一次。

### F-20 杂项观察

- `src/editor/editor-canvas.tsx:143-146`：键盘守卫漏 `HTMLSelectElement`（面板内容若嵌入原生 select，Backspace 删除面板）。同类：select 元素聚焦时 Delete 会误删面板。
- `src/editor/dashboard-editor-renderer.tsx:53-63`：layout 为非法 JSON 字符串时静默回退空文档（空 catch 有注释但无 warn），用户配置损坏无任何提示。
- 编辑态画布高度缺省固定 600（`dashboard-editor-renderer.tsx:106-107`），运行态按面板底沿推导（`layout-math.ts:266-279`）：超出 600px 的面板在编辑器中溢出 body 边界（可视但无边界参照），编辑/运行观感不一致。
- `src/editor/editor-canvas.tsx:121`：`event.button === 2` 之外未挡中键（button 1）拖拽。
- `findOverlappingPanels`（layout-math.ts:130-136）在生产代码无调用点（仅测试）：编辑器 drop/drag/duplicate 均不做重叠检测，重叠布局可保存，运行态按数组序叠放。若"允许重叠"是自由画布设计请在 design.md 记录，否则接线。
- 空状态时根节点无 `data-panel-count`（dashboard-renderer.tsx:84-95 vs :115）——测试断言口径需注意。

## 检查过程记录

1. 预读：`docs/references/quick-reference.md`、`docs/architecture/renderer-runtime.md`（渲染契约/事件转发/生命周期纪律/error boundary 基线）、`docs/components/dashboard-editor/design.md`（坐标模型与裁定）、`docs/audits/check/12-flux-renderers-form-check.md`（对齐报告格式）。
2. 包结构核实：`package.json` 依赖确认无图表库（任务假设与实际不符，按实际面审计）；`wc -l` 核对实现体量（14 文件约 1970 行，与任务给的 2135/14 口径基本一致——差异为排除 test-support）。
3. 全部 14 个实现文件精读；3 个测试文件（layout-math.test.ts / dashboard-renderer.test.tsx / dashboard-editor-renderer.test.tsx）通读以核对断言语义（F-01 的"测试固化错误方向"、F-13 的"跳变不可见"、F-02 的"1200 假设 baked-in"均由此核实）。
4. 交叉验证依赖契约：`packages/editor-core/src/editor-core.ts`（update/事务/undo/commit/dispose 语义——确认空事务不入栈、非事务 update 一步一栈、runCommit 回调 onCommitted）；`packages/flux-react/src/render-nodes.tsx`（fragment 编译 memo 依赖 input 引用 → F-07；pathSuffix 语义 → F-15）；`node-renderer.tsx:231`（NodeErrorBoundary 包裹每个节点 → 面板内容崩溃有 containment，D5 由框架层覆盖，未列为缺陷）；`flux-core/src/types/renderer-core.ts:174`（RendererEventHandler 签名与 `action(normalized, { scope })` 调用匹配，合规）；`workbench-shell.tsx`（leftLabel 为 aria-label）。
5. i18n 核对：grep `flux.dashboard.editor` 初判"缺失"后改查 locale 嵌套结构，zh-CN.ts:1346 / en-US.ts:1348 均含全部 14 key——**反误报撤销**，仅存 F-17 一致性问题。
6. grep 扫描（均排除 test/test-support）：`addEventListener/removeEventListener`（0 处，无泄漏面）；`ResizeObserver`（仅 editor-canvas，observe/disconnect 配对且 `width>0` 门控，合规）；`setOption`（0 处）；`as any/: any/<any>`（0 处，仅 `as unknown as BaseSchema` 双断言 → F-10）；空 `catch {}`（3 处均有注释且语义有意：JSON parse 回退、invalid JSON 保 draft、pointer capture 测试宿主容错，不列为缺陷，JSON 静默吞错入 F-20）；硬编码中文（实现代码 0 处，注释除外）；`dispose`（仅 layout 推回路径 → F-05）。
7. 环境核对：playground demo `dashboard-demo.tsx:192` 的 `max-w-[1200px]` 解释了 F-02 为何在 demo 中不可见。
8. 反误报清单（查证后不列为缺陷）：StrictMode 双挂载（identity guard 早退，安全）；pointerdown `stopPropagation` 已有（panel 点击不会误触 body 清选区）；`endTransaction` 空事务（editor-core 返回 false 不入栈，remove 按钮的 pointerdown 事务不污染 undo）；`EMPTY_STATE` 类型断言（有 `!core` 早退守卫）；`getSnapshot` 缓存（notify 先行更新，无 tearing）。
