# Web Print 代码变更集深度审核（架构边界/状态生命周期/类型安全/错误传播/显示定位/测试有效性）

- 审核对象：`packages/flux-print-core/src/`、`packages/flux-print-renderers/src/`、`apps/playground/src/pages/print-designer-demo.tsx`、`apps/playground/src/App.tsx` 与 `domain-route-entries.ts` 接线、`tests/e2e/print-designer.spec.ts`。
- 基线参照：`packages/editor-core`（事务/提交语义）、`packages/flux-renderers-dashboard/src/editor/`（会话生命周期模式）、`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts`（导出模式）。
- 方法：两轮审核。第一轮按维度初审；第二轮针对暴露文件追盲区，并用 `_tmp/print-audit-probe.test.ts` 数值探针（vitest 实跑 layoutPrintTemplate）实证 D21 全部关键论断。探针为临时产物，审核完成后已删除；结论中引用的具体数字均来自实跑输出。
- 严重程度：P0=数据错误/崩溃/注入；P1=核心场景错误行为；P2=边缘场景或维护性；P3=观察项。

---

## D01 包边界与 API 表面积

依赖方向实查：`flux-print-core` 仅依赖 `@nop-chaos/flux-core`（type-only）、`@nop-chaos/flux-formula`（createFormulaCompiler）+ jsbarcode/qrcode/jspdf/html2canvas 浏览器库；不依赖 React、flux-react、flux-runtime。`flux-print-renderers` 依赖 editor-core/flux-i18n/flux-print-core/@nop-chaos/ui + react peer。方向干净，无跨层违规。`src/index.ts` 导出面与 dist `index.d.ts` 一致。

### [D01-01] 测试专用 `resetPrintElementIdSeq` 暴露在生产 barrel（export \* 连带）

- **文件**: `packages/flux-print-renderers/src/index.ts:1`、`packages/flux-print-renderers/src/schemas.ts:15-17`
- **严重程度**: P3
- **证据**:
  ```ts
  // index.ts
  export * from './schemas.js';
  // schemas.ts
  export function resetPrintElementIdSeq(): void {
    elementSeq = 0;
  }
  ```
  全仓 grep 确认 `resetPrintElementIdSeq` 仅被 `renderer-definitions.test.tsx` 使用，无生产调用方。
- **现状**: `export *` 把测试复位钩子带进了公共 API。
- **风险**: 低。外部消费者可把全局 id 计数器清零，诱发重复 id（与 D07-02 叠加）。
- **建议**: schemas.ts 改为具名导出清单，或把 reset 移到测试工具路径。
- **为什么值得现在做**: D07-02（id 撞号）一旦修复，此导出更无存在理由，趁 barrel 未被外部依赖时收敛成本为零。
- **误报排除**: 已确认 dist/index.d.ts 同步导出（非构建泄漏），是源码层选择。
- **复核状态**: 待复核

**维度结论：1 个发现（P3×1）；依赖方向无违规，无高价值发现。**

---

## D04/D07 状态所有权与生命周期

### [D04-01] PrintDesigner 无视 template prop 变化，偏离 dashboard 基线的"换文档即 dispose 重建"模式

- **文件**: `packages/flux-print-renderers/src/print-designer.tsx:25-27`；基线对照 `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:145-158`
- **严重程度**: P2
- **证据**:
  ```tsx
  // print-designer.tsx — template 仅作初值，之后 prop 变化被静默忽略
  const [controller] = useState<PrintEditorController>(() =>
    createPrintEditorController({ template, onTemplateChange }),
  );
  ```
  ```tsx
  // dashboard-editor-renderer.tsx — 基线：incoming 变化 → dispose 旧会话重建
  current.dispose();
  coreRef.current = buildSession(incoming, commitPolicy, initialMode, notifySave);
  ```
- **现状**: props 类型 `template: PrintTemplateSchema`（必填、无名为主）暗示受控，实现是"仅初值"非受控。
- **风险**: 消费者传入新模板（如"打开另一张模板"）时界面不动、无诊断无告警；demo 侧被迫发明 `key={templateKey}` 重挂载补丁（见 D07-03）。
- **建议**: 二选一并写进 JSDoc：① 监听 template 引用变化 → dispose+重建（对齐 dashboard）；② prop 改名 `initialTemplate` 并在文档标注非受控。
- **为什么值得现在做**: 该组件即将被宿主页面复用（mission P5 集成），API 语义错了以后改是破坏性变更。
- **误报排除**: StrictMode 下不 dispose 的注释（print-designer.tsx:23-24）只解释了"卸载不 dispose"，不解释"prop 变化被忽略"。
- **复核状态**: 待复核

### [D04-02] onTemplateChange 回调被首帧闭包永久捕获，后续渲染传入的新回调失效

- **文件**: `packages/flux-print-renderers/src/print-designer.tsx:25-27`、`packages/flux-print-renderers/src/editor/use-print-editor.ts:76-80`
- **严重程度**: P3
- **证据**:
  ```ts
  // use-print-editor.ts — controller 创建时捕获 options.onTemplateChange 引用
  onCommitted: (result) => {
    if (result.ok && result.serialized) {
      options.onTemplateChange?.(core.getState().working, result.serialized);
    }
  },
  ```
- **现状**: 父组件每次渲染传新的内联箭头函数是 React 惯例；这里只有第一次的引用生效。
- **风险**: 回调若捕获父组件状态（如 `() => setTemplate(next, someLatestRef)`）将读到旧值；当前 demo 恰好只用稳定 setState 才未爆雷。
- **建议**: 用 ref 转发最新回调（对齐 dashboard 的 `helpersRef/eventsRef` 纪律），或文档声明回调必须稳定。
- **为什么值得现在做**: 与 D04-01 同源（会话与 props 脱钩），修 D04-01 时顺手消除。
- **误报排除**: 非 React Compiler 问题；是命令式 controller 的固有捕获。
- **复核状态**: 待复核

### [D07-01] 元素 id 计数器模块级且不与载入模板同步：载入旧模板后新增/粘贴必然撞号，且撞号会让 auto-commit 静默失败

- **文件**: `packages/flux-print-renderers/src/schemas.ts:8-13`、`packages/flux-print-renderers/src/editor/use-print-editor.ts:163-176`、`packages/editor-core/src/editor-core.ts:120-127`
- **严重程度**: P2
- **证据**:
  ```ts
  // schemas.ts — 计数器从 0 开始，与已加载模板的 id 空间无感知
  let elementSeq = 0;
  export function nextPrintElementId(type: PrintElementType): string {
    elementSeq += 1;
    return `${type}_${elementSeq}`;
  }
  ```
  ```ts
  // editor-core runCommit — validate 出错时 working 已改、committed 不更新、onCommitted 不回调，update() 丢弃该结果
  const validation = adapter.validate(working);
  if (!validation.ok) { ...; return { ok: false, error }; }
  ```
- **现状**: 页面刷新后计数器归零；载入含 `text_1..text_N` 的模板后再点面板/粘贴，生成 `text_1` → `PRINT_ID_DUPLICATE`（error 级）→ 每次 update 的 auto-commit 失败。
- **风险**: 画布照常显示（working 已变），但 `onTemplateChange` 不再触发 → demo 的打印/导出按钮用的是旧模板（见 D07-03），且无任何用户可见错误。当前 playground 无持久化所以未触发，属于"接上保存/载入即爆"的地雷。
- **建议**: createPrintEditorController 初始化时扫描 template.elements 把 elementSeq 顶到最大；同时 controller.validate() 的 error 数非零时在工具条给出常驻提示（现在 errorCount 只在点按钮时刷新）。
- **为什么值得现在做**: mission 下一步就是模板持久化（roadmap P5），这是载入路径的第一颗雷。
- **误报排除**: 当前 demo 模板 id（title/items 等）不含 `_N` 后缀，现状复现不了，故 P2 而非 P1。
- **复核状态**: 待复核

### [D07-02] 画布拖拽未用 pointer capture：指针离开纸面即提前 endDrag，pointercancel 使事务永久悬挂

- **文件**: `packages/flux-print-renderers/src/print-designer-canvas.tsx:118-156,211-214`
- **严重程度**: P2
- **证据**:
  ```tsx
  <div ... onPointerMove={handlePaperPointerMove}
          onPointerUp={handlePaperPointerUp}
          onPointerLeave={handlePaperPointerUp}   // 拖拽中划出纸面 = 提前提交
          onPointerDown={() => controller.setSelection([])}
          ...>
  ```
  全文件无 `setPointerCapture`，也无 `onPointerCancel` 处理。
- **现状**: ① 快速拖动到页边（放置元素的常规操作）触发 pointerLeave → endDrag 把半程位置落成一步 undo；② 触控/系统打断触发 pointercancel 时 dragRef 残留、beginDrag 的事务不闭合，后续所有编辑并入同一个巨大 undo 步。
- **风险**: undo 历史破碎 + 一次拖拽拆成两步；触屏场景事务悬挂后 undo/redo 语义错乱。
- **建议**: handleElementPointerDown 内 `event.currentTarget.setPointerCapture(event.pointerId)`，并补 `onPointerCancel` → abortDrag()。
- **为什么值得现在做**: 是交互正确性缺陷，与 DOM 框架无关，越晚修回归面越大。
- **误报排除**: pointerleave 不因子元素进入而误触发（非 pointerout），已排除该误报路径；问题仅在离开纸面与 cancel。
- **复核状态**: 待复核

### [D07-03] demo 镜像回路：`onTemplateChange→setTemplate→prop`（被忽略）+ key 重挂载补丁；auto-commit 失败时打印按钮用到过期模板

- **文件**: `apps/playground/src/pages/print-designer-demo.tsx:59-67,105-109`
- **严重程度**: P2
- **证据**:
  ```tsx
  const [template, setTemplate] = useState<PrintTemplateSchema>(a4OrderTemplate);
  const [templateKey, setTemplateKey] = useState(0);
  ...
  <PrintDesigner
    key={templateKey}                 // 换模板靠重挂载补丁
    template={template}               // 该 prop 变化被 PrintDesigner 忽略（D04-01）
    onTemplateChange={(next) => setTemplate(next)}
  />
  ```
  ```tsx
  const handlePrint = () => { printPrintTemplate(template, template.testData ?? {}); ... };
  ```
- **现状**: `template` state 唯一作用是给 handlePrint/handleExport 供数；它与设计器 working 的同步完全依赖 auto-commit 成功。D07-01 所述 validate 失败（或未来 manual policy）会让镜像静默过期。
- **风险**: 用户在画布上看到 A，点"打印"输出 B；无提示、无对账手段。
- **建议**: 打印/导出改从设计器会话取数（给 PrintDesigner 暴露 `getTemplate()` 或经 ref 拿 controller），demo 不再自己镜像；或至少在 commit 失败路径上让镜像侧可感知。
- **为什么值得现在做**: 这是 mission 的样板集成代码，后续宿主页会照抄该模式。
- **误报排除**: 当前全happy-path 下镜像与 working 一致，故非 P1；风险在异常路径。
- **复核状态**: 待复核

### [D07-04] 组件卸载不 dispose controller —— 已有注释裁定，GC 可回收，属可接受观察项

- **文件**: `packages/flux-print-renderers/src/print-designer.tsx:23-27`
- **严重程度**: P3
- **证据**:
  ```tsx
  // StrictMode 双挂载会触发 effect 清理——editor-core dispose 不可恢复，故不在卸载时 dispose
  //（controller 随组件引用释放由 GC 回收；dispose 仅供测试显式调用）
  const [controller] = useState<PrintEditorController>(() =>
    createPrintEditorController({ template, onTemplateChange }),
  );
  ```
- **现状**: controller 无定时器/全局注册表，唯一外部引用是 core 的 subscribe 闭包，随组件树释放。
- **风险**: 无实际泄漏；仅当未来有人给 controller 加全局副作用（如 localStorage 自动保存定时器）时该裁定失效。
- **建议**: 保持现状；在 use-print-editor.ts 顶部把"无外部副作用"写成不变量注释。
- **为什么值得现在做**: 防止后来者误判此处是泄漏而引入错误的 dispose-重建逻辑。
- **误报排除**: 已核对 editor-core dispose 仅置标志位，无需要显式释放的资源。
- **复核状态**: 待复核（观察项）

**维度结论：6 个发现（P2×4 / P3×2）。**

---

## D13 类型安全

### [D13-01] updateElement 以 `Partial<PrintElementSchema>`（联合的 Partial）+ `as PrintElementSchema` 合并，允许跨型补丁静默产出非法形状

- **文件**: `packages/flux-print-renderers/src/editor/use-print-editor.ts:129-133`
- **严重程度**: P2
- **证据**:
  ```ts
  updateElement(id, patch) {
    updateElements((elements) =>
      elements.map((element) =>
        (element.id === id ? ({ ...element, ...patch } as PrintElementSchema) : element)),
    );
  },
  ```
  `Partial<PrintElementSchema>` 是各成员 Partial 的联合，`{ text }` 可合法传入并展开到 table/barcode 元素上，产出 `{ type: 'table', text: 'x', ... }` 这类运行时形状与类型不符的元素；diff/序列化照单全收，validate 不查多余字段。
- **现状**: 现有调用方（inspector/canvas）按类型守卫分流，未触发；但 API 面向公开。
- **风险**: 模板 JSON 里出现幽灵字段；后续按 type 窄化的消费逻辑读不到语义，排查困难。
- **建议**: 提供 `updateElement<T extends PrintElementType>(id, patch: Partial<Extract<PrintElementSchema, { type: T }>>)` 重载，或运行时校验 patch 的允许键。
- **为什么值得现在做**: 打印模板的契约核心就是可判别联合，这个口子会随调用方增多被固化。
- **误报排除**: `as PrintElementSchema` 在此处不是冗余断言而是逃逸口（联合展开后 TS 本会报错），已验证。
- **复核状态**: 待复核

### [D13-02] 类型逃逸口清点：`ComponentType<any>`、`type as never`、DragEvent 双重断言、applySlice 内部突变断言

- **文件**: `packages/flux-print-renderers/src/renderer-definitions.tsx:8`、`packages/flux-print-renderers/src/print-designer-canvas.tsx:163,173`、`packages/flux-print-core/src/layout.ts:310-315`、`packages/flux-print-core/src/layout.ts:322`
- **严重程度**: P3
- **证据**:
  ```ts
  export type PrintElementRendererComponent = React.ComponentType<PrintElementRendererProps<any>>; // any props
  ```
  ```tsx
  const paperPoint = paperPointFromEvent(event as unknown as React.PointerEvent); // DragEvent → PointerEvent
  controller.addElement(type as never, { left: ..., top: ... });                  // string → PrintElementType
  ```
  ```ts
  function applySlice(page: PrintLayoutPage, elementId: string, text: string): void {
    const target = page.body.find((element) => element.id === elementId);
    if (target) {
      (target as { text?: string }).text = text;
    } // 绕过联合窄化直接改字段
  }
  ```
  另有 `computeAggregate` 的 `table.element.columns as PrintTableColumn[]`（冗余，列已是该类型）。同源错误风险排查：这些断言两侧语义一致（DragEvent 有 clientX；body 元素含 text 仅对 text 型成立，applySlice 仅用于 auto-grow-text 切分），未发现运行时形状与类型不符的实际暗坑；`buildDefaultElement` 的 switch 是穷尽返回，无 cast。
- **现状**: 均为局部、低危逃逸。
- **风险**: `type as never` 使 palette MIME 被篡改时可注入任意字符串为"类型"（会被 UnknownRenderer 兜底，风险低）。
- **建议**: 顺手收敛：renderer props 泛型化去掉 any；`addElement` 收 `PrintElementType`（drop 处先 `PRINT_ELEMENT_TYPES.includes` 守卫）；applySlice 用 `Extract<…, { type: 'text' }>` 窄化。
- **为什么值得现在做**: 均为机械修改，宜在类型面被更多代码依赖前清理。
- **误报排除**: 已排除"断言掩盖真 bug"的情形（逐一核对运行时形状）。
- **复核状态**: 待复核（观察项）

**维度结论：2 个发现（P2×1 / P3×1）。**

---

## D15 安全与性能红线

### [D15-01] schema 字符串未转义直插 `style="..."` 属性与 SVG `fill`：可属性逃逸注入（模板 JSON 不可信时升级为同源 XSS）

- **文件**: `packages/flux-print-core/src/render-html.ts:37-51,76,83,106`
- **严重程度**: P2
- **证据**:
  ```ts
  if (style.color) parts.push(`color:${style.color}`);
  if (style.backgroundColor) parts.push(`background:${style.backgroundColor}`);
  ```
  ```ts
  return `<div ${frame}><img class="fmt-img" src="${escapeHtml(element.src)}" .../></div>`; // src 有转义
  const svg = createQrcodeSvg(element.value ?? '', {
    level: element.level,
    foreground: element.foreground,
  });
  // barcode.ts:47  rects += `<rect ... fill="${darkColor}"/>`;  → foreground 无转义
  return `<div class="fmt-page" ... style="...;background:${template.page.background ?? '#fff'}">${all}</div>`;
  ```
  `style.color = 'red" onmouseover="alert(1)'` 会在 `style="..."` 处断开属性；qrcode `foreground` 直接进 svg 标记串，且该串未转义嵌入 iframe srcdoc（同源文档）。
- **现状**: 文本内容、表头/单元格、图片 src、title 均已 escapeHtml（含属性上下文的五种字符），仅 schema 样式字符串通道未覆盖。
- **风险**: 当前模板仅设计器本地生成 → 半可信；一旦接入"模板库/导入 JSON/服务端下发"，即成为把数据通道变成代码通道的注入点（srcdoc iframe 与宿主同源，无 sandbox）。
- **建议**: 对所有进属性/SVG 的 schema 字符串做白名单校验（颜色限定 `#rgb/#rrggbb/rgba()/命名色`），或在拼接处统一 escape；为 iframe 补 `sandbox` 评估。
- **为什么值得现在做**: escape 通道要在一处收口，等样式字段增多（D22-01 还欠着 fontFamily/borderColor）再收口成本翻倍。
- **误报排除**: 条码/二维码 value 路径安全——jsbarcode 经 DOM textContent 写入、qrcode value 只进 modules 位图，已排除；`escapeHtml` 本身 `&` 先行的顺序正确。
- **复核状态**: 待复核

### [D15-02] 旋转元素在分页/渲染链路中被当作未旋转 AABB：不做碰撞、不做页缘回收

- **文件**: `packages/flux-print-core/src/layout.ts:234-265`、`packages/flux-print-core/src/render-html.ts:23-35`
- **严重程度**: P3
- **证据**:
  ```ts
  if (startY + item.height > contentBottom) {   // 用未旋转 height 判定翻页
    page = null;
    ...
  ```
  ```ts
  if (rotate) parts.push(`transform:rotate(${rotate}deg)`); // 渲染期整体旋转，transform-origin 默认 center
  ```
- **现状**: 旋转 45° 的元素对角线超出声明 frame，贴近页缘/页底时被 `.fmt-page` overflow hidden 裁切，且可能与相邻元素视觉重叠；分页判定完全无感。
- **风险**: 低频（旋转是低频操作），后果是打印件视觉裁切。
- **建议**: v1 可接受；在 validate.ts 加一条 warning（rotate ≠ 0 且元素贴近区域边界），或文档标注已知限制。
- **为什么值得现在做**: 只需 warning 级提示即可防止用户困惑，成本极低。
- **误报排除**: `.fmt-el` overflow hidden 裁的是子内容不是自身 transform，已确认旋转框整体生效。
- **复核状态**: 待复核（观察项）

**维度结论：2 个发现（P2×1 / P3×1）。分页 while 循环死循环风险复核为阴性：`rowsThisPage<1` 的强保一行分支保证每轮 `rowIndex` 至少 +1（layout.ts:192-199），配合 maxPages 上限，双保险成立。**

---

## D19 错误传播保真度

### [D19-01] interpolate 两段 catch 均丢弃原始 error：非语法类编译失败被误报为 PRINT_BIND_SYNTAX，诊断无错误细节

- **文件**: `packages/flux-print-core/src/bind.ts:98-114,208-221`
- **严重程度**: P2
- **证据**:
  ```ts
  let compiled;
  try {
    compiled = compiler.compileTemplate<string>(source);
  } catch {
    return { value: '', syntaxError: true, evalError: false, missingPaths };
  }
  try {
    return { value: compiled.exec(createEvalContext(scope), evalEnv), ... };
  } catch {
    return { value: '', syntaxError: false, evalError: true, missingPaths };
  }
  ```
  ```ts
  if (result.syntaxError) {
    diagnostics.push({ level: 'error', code: 'PRINT_BIND_SYNTAX',
      message: `表达式语法错误：${source}`, ... });   // 只有 source，没有 error.message
  ```
- **现状**: compile 阶段任何异常（含编译器内部错误）一律定性为"语法错误"；exec 阶段一律"求值失败"；真实 error 对象（含位置/原因）全部丢弃。
- **风险**: 用户与维护者都无法从诊断定位真实原因；编译器 bug 会被伪装成模板错误，误导修复方向。
- **建议**: `catch (error)` 捕获后把 `error instanceof Error ? error.message : String(error)` 拼进 message，并区分"编译器异常"与"确认的语法错误"两个 code。
- **为什么值得现在做**: 表达式诊断是打印模板的核心调试通道，格式定了之后下游（UI 呈现）会依赖。
- **误报排除**: 缺路径走 `onUndefinedVariable` 回调（不抛错），与 catch 路径无重叠，已核实不重复上报。
- **复核状态**: 待复核

### [D19-02] table source 的 compile 与 exec 共用一个 try：运行期求值失败被误报为"表达式非法"

- **文件**: `packages/flux-print-core/src/bind.ts:245-267`
- **严重程度**: P2
- **证据**:
  ```ts
  try {
    const compiled = compiler.compileExpression<unknown>(element.source);
    const evaluated = compiled.exec(createEvalContext(elementScope), env);
    if (Array.isArray(evaluated)) { rows = evaluated; } else { /* NOT_ARRAY warning */ }
  } catch {
    diagnostics.push({ level: 'error', code: 'PRINT_BIND_SYNTAX',
      message: `table source 表达式非法：${element.source}`, ... });
  }
  ```
- **现状**: exec 抛出的运行时异常（与 D19-01 的文本路径不同，这里 exec 在 try 内）统统落进 `PRINT_BIND_SYNTAX`。
- **风险**: 数据问题（如求值器对某类型抛错）被报告成模板语法问题；与 text 元素的行为（eval 失败 → PRINT_BIND_EVAL）不一致，同类问题两种诊断语义。
- **建议**: 拆成两段 try，exec 失败复用 `PRINT_BIND_EVAL` code；附带 error.message。
- **为什么值得现在做**: 与 D19-01 同一次改动可完成，保证诊断 code 语义表稳定。
- **误报排除**: 非数组结果确有独立 warning（PRINT_BIND_SOURCE_NOT_ARRAY），未与 catch 混淆。
- **复核状态**: 待复核

### [D19-03] header/footer 逐页重绑定时 `now` 每次取 `new Date()`：printDate 跨页漂移且渲染结果不可复现

- **文件**: `packages/flux-print-core/src/layout.ts:268-280`、`packages/flux-print-core/src/bind.ts:175`
- **严重程度**: P3
- **证据**:
  ```ts
  for (const layoutPage of pages) {
    const pageBound = bindPrintTemplate(regionTemplate, data, { page: pageNo, pages: total });
    // bindPrintTemplate 内部：const now = context.now ?? new Date();  ← 每页各取一次
  ```
- **现状**: 初始 bind（body 元素）与每页 header/footer 重绑定各自取当前时间；正文 printDate 与页眉 printDate 可能相差数毫秒到数秒，且同一模板两次 layout 输出不同。
- **风险**: 打印契约上"打印时间"应单一；对账/快照测试（未来加 HTML golden 时）会随机抖动。
- **建议**: layoutPrintTemplate 增加 `now?: Date` 选项（透传给两次 bind），或首次 bind 的 now 复用到逐页重绑定。
- **为什么值得现在做**: 一行改动；等 golden 测试落地后就是 flaky 源。
- **误报排除**: pageNumber 不受影响（$page/$pages 显式传入），仅 printDate 通道受影响。
- **复核状态**: 待复核（观察项）

**维度结论：3 个发现（P2×2 / P3×1）。print.ts/export-pdf.ts 的 try-finally 未吞错（printFrame rethrow、export-pdf 无 catch），demo catch 将 error.message 呈现到 `data-testid="print-demo-output"`，用户可见性达标，无发现。**

---

## D21 显示与定位正确性（重点）

以下 D21-01/02/03 均经 `_tmp/print-audit-probe.test.ts` 实跑验证（A4 页面，margins [10,10,10,10]，header/footer 10mm，contentTop=20，contentBottom=277）。

### [D21-01] 跨页表格之后的普通元素被钉到新页页底而非紧跟表格：绝对 target 跨页后不重锚定

- **文件**: `packages/flux-print-core/src/layout.ts:177,234,253-261`
- **严重程度**: P1
- **证据**:
  ```ts
  const targetTopAbs = contentRect.top + item.baseTop + shift;   // shift 跨页累计，不因翻页归零
  ...
  const startY = Math.max(targetTopAbs, cursorY);
  if (startY + item.height > contentBottom) {
    page = null;
    const next = ensurePage();
    if (!next) break;
    const restarted = Math.max(contentRect.top + item.baseTop + shift, cursorY); // 新页上仍取巨型 target
    const clipped = restarted + item.height > contentBottom ? contentBottom - item.height : restarted;
    place(item.element, { pageTop: Math.max(clipped, contentRect.top), pageHeight: item.height });
  ```
  探针实测（表格 40 行 ×10mm + 下方 `top:100` 文本）：`below` 落在第 3 页 `pageTop=267 = contentBottom(277) - height(10)`——被钉在页底；而表格末片在第 2 页 `top=20` 处结束（cursorY≈176），正确位置应是紧跟其后。
- **现状**: 只要表格跨页（`shift` ≥ 内容高），其后所有 body 元素依次被钉到各新页底部。
- **风险**: 出库单/发票类核心场景（长明细表 + 落款/合计行）排版整体错位；落款悬在页底远离表格。
- **建议**: 翻页后对 target 做重锚定：新页上 `restarted` 应取 `Math.max(cursorY, contentRect.top)`，仅当未翻页时才尊重 `baseTop + shift`；或 shift 在翻页时衰减为"该页内已消费量"。
- **为什么值得现在做**: 这是分页引擎的核心数学错误，测试 ⑩（见 D23-02）只断言存在性没断言位置，越晚修修复窗口越大。
- **误报排除**: 死循环已排除（每轮 rowIndex 至少 +1）；单页内膨胀下移（规则 3 同页场景）经探针与用例 ⑩ 前半段验证正确，不受本条影响。
- **复核状态**: 待复核（探针数字可复现）

### [D21-02] 新页上表格起点被 `Math.min(targetTopAbs, contentBottom)` 钉到页底：产生越界孤行，切片侵入页脚区

- **文件**: `packages/flux-print-core/src/layout.ts:187-201`
- **严重程度**: P1
- **证据**:
  ```ts
  const start = firstPageOfTable ? Math.max(cursorY, Math.min(targetTopAbs, contentBottom)) : contentRect.top;
  const reservedHeader = rowIndex === 0 || repeatHeader ? headerHeightMm : 0;
  const avail = contentBottom - start - reservedHeader;
  let rowsThisPage = Math.floor(Math.max(0, avail) / rowHeightMm);
  if (rowsThisPage < 1) {
    const onFreshPage = !firstPageOfTable || page!.body.length === 0;
    if (onFreshPage) {
      rowsThisPage = 1; // 页顶强保一行（防死循环）
  ```
  探针实测（两个 15 行表格，tb2.baseTop=120，tb1 膨胀后 shift=132 → targetTopAbs=272）：翻到新页后 `start` 仍是 272（`max(20, min(272,277))`=272），强保一行把"表头+1 行"（高 16mm）放在 272–288mm——超出 contentBottom 277 约 11mm，压进页脚区。
- **现状**: 防孤行分支把整表移新页后，新页上的 start 计算又把表格钉回页底，随即触发强保一行，产出"页底孤行 + 区域越界"。
- **风险**: 多表格单据（明细表 + 汇总表）是打印模板常规形态；输出在页脚区出现越界孤行。
- **建议**: `start` 的 targetTopAbs 分支只在"本表未因翻页重启"时生效；翻页续排的首片 start 一律用 `cursorY`（新页即 contentRect.top）。
- **为什么值得现在做**: 与 D21-01 同根（target 跨页不重锚定），一次重构应同时覆盖并补两组回归断言。
- **误报排除**: `contentRect.top` 续片分支（非首页）正确；防死循环分支本身逻辑成立，问题在 start 取值而非循环推进。
- **复核状态**: 待复核（探针数字可复现）

### [D21-03] footerAggregate 行永不可见：placedHeight 不含聚合行，`.fmt-el` overflow:hidden 恒将 tfoot 裁掉

- **文件**: `packages/flux-print-core/src/layout.ts:202,214-219`、`packages/flux-print-core/src/render-html.ts:66-72`
- **严重程度**: P1
- **证据**:
  ```ts
  const placedHeight = reservedHeader + sliceCount * rowHeightMm;   // 不含 aggregateHeightMm
  ...
  if (isLastSlice && aggregateHeightMm > 0) {
    placed.totalsAggregate = computeAggregate(item.table, rows);
  }
  ```
  ```ts
  const aggregateRow = aggregate ? `<tfoot><tr>${...}</tr></tfoot>` : '';
  return `<div ${frame}><table ...>${header}${body}${aggregateRow}</table></div>`;  // frame 高度 = placedHeight，且 elementFrameStyle 含 overflow:hidden
  ```
  探针实测（5 行 + lastPage 合计）：`placed pageHeight = 56`（6+5×10），表格实际视觉高度 = 6+50+6 = 62 → tfoot 恒在被裁区。
- **现状**: 聚合数据被正确计算（探针 `totals = {"名称":"0"}` 证明链路通），但渲染层永远展示不出来；`everyPage` 同理。
- **风险**: "合计行"是 v1 明确交付的特性（demo A4 模板金额列 sum），在预览/打印/PDF 三条输出通道全部失效——特性 DOA。
- **建议**: 末片/每片的 `placedHeight` 加上 `aggregateHeightMm`（sliceAggregate 时对中间页需允许溢出或相应减少本页行数）；并给 render-html.test 补 `<tfoot>` 可见性断言。
- **为什么值得现在做**: P3 计划（renderer）已结束，这是交付物与设计文档 §6 的直接背离，应在 PDF/打印被真实使用前修掉。
- **误报排除**: cursorY 对聚合高度的记账（layout.ts:228）本身正确，同页后续元素不重叠——问题纯在 frame 高度与裁切。
- **复核状态**: 待复核（探针数字可复现）

### [D21-04] 行高数学与渲染不闭环：render-html 不设 tr 高度也不设 td 字号，浏览器默认 16px 使实际行高 ≈7.4mm，超出排版的 6/7mm 估计 → 满页切片底部行被静默裁掉（打印件丢数据）

- **文件**: `packages/flux-print-core/src/render-html.ts:63-72,124-131`、`packages/flux-print-core/src/layout.ts:6,79`
- **严重程度**: P0
- **证据**:
  ```ts
  const body = `<tbody>${rows
    .map(
      (row) =>
        `<tr>${columns
          .map((column) => `<td class="fmt-td">${escapeHtml(row[column.label] ?? '')}</td>`)
          .join('')}</tr>`,
    )
    .join('')}</tbody>`;
  // .fmt-th, .fmt-td { border: 1px solid #999; padding: 1mm 2mm; text-align: left; word-break: break-all; }
  // 全文档无任何 font-size / tr 高度约束 → td 继承浏览器默认 16px
  ```
  ```ts
  export const ESTIMATE_ROW_HEIGHT_MM = 6; // 无 rowHeight 时按 6mm/行切页
  const rowHeightMm = element.rowHeight ?? measured ?? ESTIMATE_ROW_HEIGHT_MM;
  ```
  数值核对：16px 字号行高 ≈18.4px + 2mm padding(7.56px) + 2px 边框 ≈ 28px ≈ 7.40mm。demo A4 出库单（rowHeight:7，40 行）：第 1 页切 31 行，frame 高 6+31×7=223mm，实际表格高 6+31×7.4≈235mm → 溢出 ≈12mm，被 `.fmt-el` overflow:hidden 裁掉 ≈1.5–2 行；第 2 页从第 32 行续排 → **第 30–31 行在打印/PDF/预览的任何一页都不可见**。无 rowHeight 的设计器新建表格（estimate 6mm）差距更大（≈23%）。
- **现状**: 切页几何与渲染几何是两套真值，渲染侧无任何机制收敛到排版侧。
- **风险**: 打印输出的静默数据缺失（不是显示瑕疵，是交付物丢行）；预览与打印同源所以预览也发现不了。
- **建议**: render-html 按排版行高闭环：`<tr style="height:${rowHeightMm}mm">` + `.fmt-table { font-size: 12px; line-height: 1.2 }`（或按 measure 结果注入）；同时给 render-html.test 增加"实际行高 ≤ 排版行高"的约束断言。
- **为什么值得现在做**: P0 定级依据是"交付物数据错误且默认 demo 即触发"；该修复是渲染侧一行 CSS 级改动，越晚修历史输出越不可信。
- **误报排除**: 已排除 `measure` 缺失因素（demo/print/preview 全链路确实都没传 measure，但即便传了，渲染侧仍不执行该行高）；已确认裁切者是 `.fmt-el` 的 overflow:hidden 而非分页逻辑。
- **复核状态**: 待复核（几何推演 + 既有 CSS 常量核对；建议修复前用真实 Chromium 打印快照复证一次）

### [D21-05] autoGrow 续片 pageHeight 用声明高度而非余文实测高度，续排 cursorY 与实际不符

- **文件**: `packages/flux-print-core/src/layout.ts:244-249`
- **严重程度**: P3
- **证据**:
  ```ts
  const tail = ensurePage();
  if (!tail) break;
  place(item.element, { pageTop: contentRect.top, pageHeight: item.height }); // item.height 是整段声明高
  applySlice(tail, item.element.id, split.rest);
  cursorY = contentRect.top + item.height; // 余文实际高度可能远小于/大于声明高
  ```
- **现状**: 切分首片用 measure 精确算可容纳字符，续片却按声明高度占位。
- **风险**: 余文短时下方元素间距虚增；余文长（仅当 measure 对首片/余文不一致时）可能再溢出。同页内后续元素靠 cursorY 兜底，一般无重叠。
- **建议**: 对 rest 再跑一次 `measure.textHeight` 得实际高度参与 cursorY；或文档声明续片占位语义。
- **为什么值得现在做**: 与 measure 合同相关，等宿主真正注入 measure 前把语义定死。
- **误报排除**: binarySplitText 本身（二分 + `?? POSITIVE_INFINITY` 兜底）正确，用例 ⑪ 覆盖到位。
- **复核状态**: 待复核（观察项）

**维度结论：5 个发现（P0×1 / P1×3 / P3×1）。@page 与分页 CSS 核对为正确：`@page { margin:0 }` + 绝对 mm 定位自洽，`page-break-after:always` 只加在前 N-1 页、末页不留白（render-html.ts:102），无发现。**

---

## D22/D23 集成接线与测试有效性

### [D22-01] 设计器可编辑字段 vs render-html 打印态输出：字段语义漂移清点（8 项静默丢弃）

- **文件**: `packages/flux-print-renderers/src/print-inspector.tsx:246-247,300-310,183`、`packages/flux-print-core/src/render-html.ts:57-96`、`packages/flux-print-core/src/schemas.ts:66-80,225`
- **严重程度**: P2
- **证据**（inspector 暴露 → render-html 消费情况逐一核对）:
  ```tsx
  <NumberField label={...rowHeight} value={selected.rowHeight} .../>        // 排版用，渲染不设 tr 高（D21-04）
  <SwitchField label={...zebra} .../>                                        // render-html 无任何引用
  <NumberField label={...columnWidth} .../> <SelectField label={...columnAlign} .../>
  // render-html 表格：style="width:100%;border-collapse:collapse"，无 colgroup/无 align/无斑马纹
  ```
  grep 全量核对结果——打印态静默丢弃：① `style.fontFamily`；② `style.borderWidth/borderColor/borderStyle`（text 元素不输出边框，rect/line 硬编码 `1px solid #000`）；③ `style.borderRadius`；④ 列 `width`；⑤ 列 `align`（CSS 硬编码 text-align:left）；⑥ `zebra`；⑦ `page.watermark`；⑧ `paper.direction`（除 inspector 下拉外全仓无消费者——"横向"开关不产生任何效果，@page 尺寸只由 width/height 决定）。
- **现状**: 用户在设计器里设置的这 8 类属性不报错、不警告、输出不变。
- **风险**: 设计态所见即所信，打印态静默走样——比报错更伤信任；direction 死控件还会误导纸张设置心智。
- **建议**: 短期在 PrintPreview 诊断面板加"打印态暂不支持字段"warning 清单；中期按 roadmap 逐项落地（colgroup/align/zebra 是纯 HTML 工作，成本低）；direction 要么实现（交换宽高）要么从 inspector 移除。
- **为什么值得现在做**: 清单先登记，避免每个字段被当作"已支持"重复排查；其中 align/zebra/列宽修复成本极低。
- **误报排除**: 已核对非漂移项：barcode `textVisible`（displayValue 已接）、qrcode `foreground/level`、image `fit`（object-fit 已接）、line `direction`、text `field` 优先级（设计骨架 TextRenderer 与 bind 同为 field 优先）——均一致。
- **复核状态**: 待复核

### [D22-02] PrintPreview 把同一 bind 诊断打两遍，且每次渲染重复跑 4 次绑定管线

- **文件**: `packages/flux-print-renderers/src/print-preview.tsx:28-33`、`packages/flux-print-core/src/layout.ts:103-104`
- **严重程度**: P2
- **证据**:
  ```tsx
  const html = renderPrintTemplateToHtml(template, template.testData ?? {}); // 内含 bind+layout
  const layout = layoutPrintTemplate(template, template.testData ?? {}); // 再 bind+layout（bind 诊断并入 layout.diagnostics）
  const diagnostics: PrintDiagnostic[] = [
    ...bindPrintTemplate(template, template.testData ?? {}).diagnostics, // 第三次 bind
    ...layout.diagnostics, // 与上一行完全重叠
  ];
  ```
  layoutPrintTemplate 内部 `diagnostics.push(...bound.diagnostics)`（layout.ts:104），故显式 bindPrintTemplate 的每条诊断在面板中出现两次。
- **现状**: 诊断重复 + 每次打开预览（及编辑触发重渲）做 3 次 layout、4 次 bind。
- **风险**: 用户看到成对重复报错误以为两个问题；大模板/多页时预览卡顿放大。
- **建议**: `diagnostics = layout.diagnostics`（已含 bind）；html 复用同一次 layout 结果（renderPrintPages 已返回逐页产物，可拼装）。是否记忆化（memo by template 引用）一并考虑。
- **为什么值得现在做**: 诊断面板是当前唯一的错误呈现通道，重复会训练用户忽略它。
- **误报排除**: 已确认不是 layout 诊断本身重复——两处来源是两次独立 bind 调用。
- **复核状态**: 待复核

### [D22-03] 设计骨架 ImageRenderer 不反映 `fit`；设计态 img 直接以 `element.src` 展示而打印态优先 `field`

- **文件**: `packages/flux-print-renderers/src/renderer-definitions.tsx:20-27`、`packages/flux-print-core/src/bind.ts:227-234`
- **严重程度**: P3
- **证据**:
  ```tsx
  const ImageRenderer = ({ element }: ...) =>
    element.src ? (
      <img className="fmt-design-image" src={element.src} alt="" draggable={false} />   // 无 object-fit
  ```
  ```ts
  // bind.ts — 打印态：field 优先于 src
  src: element.field ? interpolate(...).value : element.src,
  ```
- **现状**: src 与 field 同时设置时，设计画布显示 src 图（contain 拉伸语义），打印显示 field 绑定图——所见非所得；fit 在设计态完全不可感知。
- **风险**: 低（图片模板占比小），但属"同一 schema 两实现漂移"清单项。
- **建议**: 骨架 img 补 `style.objectFit = element.fit`；field 存在时显示占位符（对齐 TextRenderer 的 `${field}` 惯例）。
- **为什么值得现在做**: 与 D22-01 同批收敛，两行改动。
- **误报排除**: 文本 field 优先级两态一致（已核对），无需整改。
- **复核状态**: 待复核（观察项）

### [D23-01] print 单测把 contentWindow mock 成同步可打印，恰好固化了"srcdoc 未加载即 print"竞态；无任何测试断言 load 后才打印

- **文件**: `packages/flux-print-core/src/print.test.ts:52-72`、`packages/flux-print-core/src/print.ts:50-58`
- **严重程度**: P2（其掩盖的实现缺陷为 P1）
- **证据**:
  ```ts
  if (tag === 'iframe') {
    Object.defineProperty(element, 'contentWindow', {
      value: { print: printSpy },   // mock 掉真实时序：sync 分支必然命中
      configurable: true,
    });
  }
  ...
  expect(printSpy).toHaveBeenCalledTimes(1);   // 断言"同步打印"这一恰是缺陷行为
  ```
  ```ts
  // print.ts —— srcdoc 赋值后同步取 contentWindow 打印；浏览器中 srcdoc 导航是异步的，
  // contentWindow.print() 会打印 about:blank；load 监听兜底几乎不可达
  iframe.srcdoc = html;
  const win = iframe.contentWindow as { print: () => void } | null;
  if (win && typeof win.print === 'function') { printFrame(iframe, ...); return; }
  iframe.addEventListener('load', () => printFrame(...), { once: true });
  ```
- **现状**: 测试断言的正是"设置 srcdoc 后同步调用 print"，把竞态固化成契约；`load` 兜底分支无测试。
- **风险**: 真机打印出空白页/间歇空白（核心交付路径），且测试全绿给出虚假信心；e2e 也刻意不点打印按钮（见 D23-04），三道防线同时缺位。
- **建议**: printPrintTemplate 改为无条件等 `load`（`iframe.addEventListener('load', ...)` 后 printFrame）；测试改为可等待的 load 契约（fake timer 或注入 win 的时机延后），并补"srcdoc 未完成时不得 print"的反向断言。
- **为什么值得现在做**: 这是浏览器打印主路径上的正确性缺陷，修复窗口在任何人依赖现行为之前。
- **误报排除**: 已确认 `mountPrintFrame` 同步 appendChild 后 contentWindow 即存在（标准行为），sync 分支在真实浏览器命中，不是 happy-dom 假象。
- **复核状态**: 待复核

### [D23-02] layout.test ⑩ 只断言"below 在末页存在/不在首页"，未断言 pageTop——同源弱断言放行了 D21-01 页底钉死

- **文件**: `packages/flux-print-core/src/layout.test.ts:165-175`
- **严重程度**: P2
- **证据**:
  ```ts
  const lastPage = result.pages[result.pages.length - 1]!;
  expect(lastPage.body.some((placed) => placed.id === 'below' && placed.text === '落款')).toBe(
    true,
  );
  expect(result.pages[0]?.body.some((placed) => placed.id === 'below')).toBe(false);
  ```
  探针显示该场景实际输出 `below.pageTop = 267`（页底钉死，应为紧跟表格末片的 ≈176）——断言恒真，bug 畅通。
- **现状**: 关键分页规则 3 的用例断言的是"存在性"而非"定位"。
- **风险**: 分页定位类回归（D21-01/02）全部能在现有套件下绿灯；同类弱断言还有 ⑦（`toBe(false)` + `>=1` 组合）。
- **建议**: ⑩ 补 `expect(below.pageTop).toBeCloseTo(176)`（或与 cursorY 的关系断言）；新增两表 + 下方元素用例断言各片 pageTop 区间；⑦ 补"表格任一片不越 contentBottom"断言。
- **为什么值得现在做**: D21-01/02 的修复必须由这些断言守护，先改测试再改实现（plan 的 Test Strategy 语义）。
- **误报排除**: 用例 ②③④⑨ 的边界断言（covered=30、片高 %10、绝对坐标展开）经核为真实边界断言，非恒真。
- **复核状态**: 待复核

### [D23-03] export-pdf 测试 mock 掉 html2canvas/jspdf：隔离合理（DOM 挂载/清理仍实跑），但位图化失败传播零覆盖

- **文件**: `packages/flux-print-core/src/export-pdf.test.ts:11-45,65-85`、`packages/flux-print-core/src/export-pdf.ts:10-21`
- **严重程度**: P3
- **证据**:
  ```ts
  const html2canvasMock = vi.fn(async () => fakePage('data:image/jpeg;base64,page'));
  vi.mock('html2canvas', () => ({ default: html2canvasMock }));
  ...
  expect(html2canvasMock).toHaveBeenCalledTimes(2); // 30 行 × 10mm → 2 页
  ```
  ```ts
  // export-pdf.ts — renderPageToCanvas 无 catch：html2canvas 抛错（CORS 图、字体、内存）原样上抛
  const canvas = await renderPageToCanvas(item.html, item.widthMm, item.heightMm);
  ```
- **现状**: 与基线 use-calendar-export 的全局 `window.html2canvas` 脆弱模式相比，本实现用动态 import + mock 是正确做法；容器 innerHTML 注入、finally 清理都走了真路径。缺口仅在失败路径：第 N 页 canvas 失败时异常无页码上下文，且前 N-1 页已渲染的内存产物直接丢弃（无部分导出/提示）。
- **风险**: 大模板导出中途失败时用户只看到裸异常，无法定位第几页。
- **建议**: 循环内 try-catch 包装 `Error(\`page ${index + 1} render failed: ...\`, { cause })`；补一条 reject 传播测试。
- **为什么值得现在做**: 与 D19 的错误上下文标准对齐，改动局部。
- **误报排除**: 已确认 mock 未绕过 `renderPrintPages` 真实分页（用例 2 走 actual），页数断言 2 为真实边界结果。
- **复核状态**: 待复核（观察项）

### [D23-04] e2e 对打印主路径零执行（仅按钮可见性）、无模板往返切换用例、预览只做 srcdoc 子串断言

- **文件**: `tests/e2e/print-designer.spec.ts:59-61,28-40`
- **严重程度**: P3
- **证据**:
  ```ts
  test('print button is present without opening a print dialog', async ({ page }) => {
    await expect(
      page
        .locator('[data-testid="print-demo-actions"]')
        .getByRole('button', { name: '打印', exact: true }),
    ).toBeVisible();
  });
  ```
  预览用例断言 `srcdoc` 含 '出库单'/'CK-2026-0901'/'货物-40' 与 `pageCount >= 2`（真实分页边界，有效），但整个 spec 没有：① 点击打印后校验 iframe 内容时序（可用 `page.on('console')`/打印 mock 前提下验证 load 后才 print）；② A4→小票→A4 往返（key 重挂载路径，D07-03 的回归场）；③ 预览诊断不重复断言（可捕获 D22-02）。
- **现状**: e2e 覆盖了路由、拖放新增、预览内容、PDF 下载事件、条码 svg 真机渲染——骨架完整，缺口集中在打印时序与往返状态。
- **风险**: D23-01（打印竞态）与 D07-03（镜像过期）这两类"测试全绿但真机坏"的问题正是当前 e2e 形态的盲区。
- **建议**: ① 打印用例：`page.exposeFunction` 或 init script 替换 `HTMLIFrameElement.prototype.contentWindow` 不可行，可改为断言"点击打印后出现 `iframe[data-print-frame]` 且其 contentDocument readyState 为 complete 时才发生 print 标记"（借 print.ts 的 win 注入口做测试钩子）；② 补往返切换用例；③ 断言 `print-preview-diagnostics` 内同 code 只出现一次。
- **为什么值得现在做**: e2e 是该 mission 唯一的真机浏览器防线，应在 D21/D23 修复落地时同步补齐，形成闭环。
- **误报排除**: PDF 下载用例（waitForEvent download + 文件名断言）是有效的真机行为断言，非假绿。
- **复核状态**: 待复核（观察项）

**维度结论：4 个发现（P2×2 / P3×2）。canvas 单测坐标断言经与实现独立换算核对（区域原点、px 换算、clamp 边界），未见同源错；renderer-definitions/canvas-math/adapter 测试覆盖真实边界，无发现。**

---

## 汇总

| 编号   | 严重程度 | 文件                                                                             | 一句话摘要                                                                                                                |
| ------ | -------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| D21-04 | P0       | flux-print-core/src/render-html.ts, layout.ts                                    | 行高排版与渲染不闭环（无 tr 高度/td 字号），实际行高超排版估计，满页切片底部行被静默裁掉——demo 模板即丢行，打印件数据缺失 |
| D21-01 | P1       | flux-print-core/src/layout.ts:177,234,253-261                                    | 跨页表格后元素被钉到新页页底（探针实测 pageTop=267=contentBottom−h），target 跨页不重锚定                                 |
| D21-02 | P1       | flux-print-core/src/layout.ts:187-201                                            | 新页上表格 start 被 min(targetTopAbs, contentBottom) 钉到页底，强保一行产出越界孤行侵入页脚区                             |
| D21-03 | P1       | flux-print-core/src/layout.ts:202,214-219, render-html.ts:66-72                  | placedHeight 不含聚合行 + overflow:hidden → footerAggregate 合计行在所有输出通道恒不可见（特性 DOA）                      |
| D04-01 | P2       | flux-print-renderers/src/print-designer.tsx:25-27                                | template prop 变化被静默忽略，偏离 dashboard 基线的 dispose+重建模式，API 语义误导                                        |
| D07-01 | P2       | flux-print-renderers/src/schemas.ts:8-13, editor/use-print-editor.ts:163-176     | 元素 id 计数器不与载入模板同步，撞号导致 auto-commit 静默失败（接持久化即爆）                                             |
| D07-02 | P2       | flux-print-renderers/src/print-designer-canvas.tsx:118-156,211-214               | 拖拽无 pointer capture：划出纸面提前提交，pointercancel 使事务悬挂                                                        |
| D07-03 | P2       | apps/playground/src/pages/print-designer-demo.tsx:59-67,105-109                  | demo 镜像回路 + key 重挂载补丁；commit 失败时打印用到过期模板且无提示                                                     |
| D13-01 | P2       | flux-print-renderers/src/editor/use-print-editor.ts:129-133                      | updateElement 允许跨型补丁合并，可静默产出形状非法的元素                                                                  |
| D15-01 | P2       | flux-print-core/src/render-html.ts:37-51,76,83,106                               | style.color/backgroundColor/background/qrcode.foreground 未转义进属性/SVG，模板不可信时可属性逃逸注入                     |
| D19-01 | P2       | flux-print-core/src/bind.ts:98-114,208-221                                       | interpolate catch 丢原始 error，非语法编译失败误报 PRINT_BIND_SYNTAX 且无细节                                             |
| D19-02 | P2       | flux-print-core/src/bind.ts:245-267                                              | table source compile/exec 共用 try，运行期失败误报为"表达式非法"                                                          |
| D22-01 | P2       | flux-print-renderers/src/print-inspector.tsx, flux-print-core/src/render-html.ts | 设计器 8 类可编辑字段打印态静默丢弃（列宽/对齐/zebra/fontFamily/边框/圆角/watermark/paper.direction 死控件）              |
| D22-02 | P2       | flux-print-renderers/src/print-preview.tsx:28-33                                 | 预览诊断面板同条诊断显示两遍，且每次渲染重复跑 3 次 layout 4 次 bind                                                      |
| D23-01 | P2       | flux-print-core/src/print.test.ts:52-72, print.ts:50-58                          | 单测 mock 同步 contentWindow 固化"srcdoc 未加载即 print"竞态（实现缺陷 P1），无 load 契约测试                             |
| D23-02 | P2       | flux-print-core/src/layout.test.ts:165-175                                       | 用例 ⑩ 只断言存在性不断言 pageTop，同源弱断言放行页底钉死缺陷                                                             |
| D01-01 | P3       | flux-print-renderers/src/index.ts:1, schemas.ts:15-17                            | 测试专用 resetPrintElementIdSeq 经 export \* 暴露在生产 barrel                                                            |
| D04-02 | P3       | flux-print-renderers/src/print-designer.tsx:25-27                                | onTemplateChange 首帧闭包被永久捕获，后续新回调失效                                                                       |
| D07-04 | P3       | flux-print-renderers/src/print-designer.tsx:23-27                                | 卸载不 dispose 已注释裁定、GC 可回收，属可接受观察项                                                                      |
| D13-02 | P3       | renderer-definitions.tsx:8, print-designer-canvas.tsx:163,173, layout.ts:310-315 | 类型逃逸口清点：ComponentType<any>/as never/DragEvent 双断言/applySlice 突变断言（未发现运行时暗坑）                      |
| D15-02 | P3       | flux-print-core/src/layout.ts:234-265, render-html.ts:23-35                      | 旋转元素按未旋转 AABB 参与分页，页缘旋转内容可能被裁切                                                                    |
| D19-03 | P3       | flux-print-core/src/layout.ts:268-280, bind.ts:175                               | 逐页重绑定各取 new Date()，printDate 跨页漂移且输出不可复现                                                               |
| D21-05 | P3       | flux-print-core/src/layout.ts:244-249                                            | autoGrow 续片按声明高度占位，cursorY 与余文实际高度不符                                                                   |
| D22-03 | P3       | flux-print-renderers/src/renderer-definitions.tsx:20-27                          | 设计骨架 img 不反映 fit、field 优先级与打印态不一致（文本 field 优先已一致）                                              |
| D23-03 | P3       | flux-print-core/src/export-pdf.test.ts, export-pdf.ts:10-21                      | html2canvas/jspdf mock 隔离合理，但位图化失败无页码上下文、零失败路径覆盖                                                 |
| D23-04 | P3       | tests/e2e/print-designer.spec.ts:59-61                                           | e2e 不执行真实打印时序、无模板往返切换用例、诊断重复无断言                                                                |

**总计：26 个发现 —— P0×1、P1×3、P2×12、P3×10。**

复核说明：D21-01/02/03 经 `_tmp` 数值探针实跑确认（探针已删除，数字可按汇总中参数复现）；D21-04 为几何推演 + CSS 常量核对，修复前建议用真实 Chromium 打印快照复证。文档维度由专人另行审核，本文件不含文档结论。
