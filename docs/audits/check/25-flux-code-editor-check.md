# 25 flux-code-editor 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-code-editor/src/` 排除 `*.test.*` 与 `__tests__/` 后 26 个 .ts/.tsx 实现文件（约 3347 行）+ `code-editor-styles.css`（306 行）。**精读覆盖率 100%**（26 文件逐行 + CSS 通读）。另核对了 `docs/references/quick-reference.md`（契约基线）、`package.json`（CodeMirror 6 全家桶 + `@codemirror/merge`，无 monaco/slate）、flux-i18n zh-CN/en-US locale（key 存在性）、`packages/flux-react/src/node-renderer-resolved.tsx`（可见性归属反误报）、`apps/playground/vite.config.ts`（React Compiler 开关）、已安装 `@codemirror/state`/`@codemirror/commands` dist 源码（重复 StateField/Compartment 行为、history 实现反误报），并扫读 `code-editor-handles.test.tsx`、`use-merge-view.test.tsx` 佐证反误报。
- 结论概览：**P0 x1 / P1 x4 / P2 x6 / P3 x6**。总评：包结构清晰、契约面总体合规（数据一律走 `props.props`/`props.meta`/`props.events`/`props.helpers`，无 store 直连，表单绑定用 `useCurrentForm`/`useScopeSelector` 标准链路，样式走 `data-slot` 标记 + CSS 变量，无 BEM，i18n key 双语齐全，UI 组件来自 `@nop-chaos/ui`）。**核心风险集中在"双编辑器 hook 恒定挂载 + mount-only effect + 共用 ref 槽位"这一架构**：diffValue/sqlConfig 在运行时出现或消失时，目标编辑器根本不会被创建（P0 F-01）；同一架构下 `reset` 句柄的"初始值"被持续改写为最新受控值，变成 no-op（F-02）。受控 value 同步链路（外部→编辑器）缺少事务标注/组合输入防护，撤销栈被程序化更新污染（F-03）。

## P0 缺陷

### F-01 运行时切换 diffValue / sqlConfig 后目标编辑器永不创建：`useCodeMirror`/`useMergeView` 均为 mount-only effect，容器 ref 槽位切换不会触发重建

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer.tsx:205-206`（editorRef/view 按 `isDiffMode` 切换）、`:204`（`isSQL` 按 sqlConfig 存在性切换）、`:307`（`{isSQL ? sqlSlots.body : <div ref={editorRef} />}` 共用槽位）
  - `packages/flux-code-editor/src/use-code-mirror.ts:83-110`（mount effect，依赖 `[]`，容器为 null 时 early return 且无 cleanup）
  - `packages/flux-code-editor/src/use-merge-view.ts:109-159`（同构 mount effect，依赖 `[]`）
  - `packages/flux-code-editor/src/code-editor-renderer/sql-editor-body.tsx:30-39`（SQL 模式的 editor div 嵌在 SQLEditorBody 子树内）
- 关键源码摘录（code-editor-renderer.tsx:204-206, 307；use-code-mirror.ts:83-84）：
  ```tsx
  const isSQL = !isDiffMode && language === 'sql' && Boolean(sqlConfig);
  const editorRef = isDiffMode ? mergeEditor.editorRef : singleEditor.editorRef;
  const view = isDiffMode ? mergeEditor.view : singleEditor.view;
  // ...
  {
    isSQL ? sqlSlots.body : <div ref={editorRef} />;
  }
  ```
  ```ts
  useEffect(() => {
    if (!containerRef.current) return; // 挂载时容器未附着 → 永不创建
    // ... new EditorView({ state, parent: containerRef.current })
  }, []); // 依赖为空，ref 后续附着不会重跑
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：schema 声明 `diffValue: "${oldVersion}"`（propContracts 自述"Original text for side-by-side diff rendering"，典型用法是绑异步加载的旧版本文本）；页面初始 `oldVersion` 为 undefined，ajax 返回后变为字符串。或 `sqlConfig: "${sqlCfg}"` 同样晚到/晚走。
  2. 路径（diffValue 变体）：首帧 `isDiffMode=false` → `<div ref={singleEditor.editorRef}>` 附着 → `useCodeMirror` mount effect 创建单编辑器。`oldVersion` 到达后 `isDiffMode=true` → React 对**同一个 div** 先以 null 回调旧 ref、再回调 `mergeEditor.editorRef` → 单编辑器 DOM 仍留在 div 内；`useMergeView` 的 mount effect 早在首帧已执行且当时容器为 null（early return、无 cleanup 可重入），依赖 `[]` 使其永不重跑 → **MergeView 永不创建**。
  3. 路径（sqlConfig 变体）：`isSQL` 翻转使 `{isSQL ? <SQLEditorBody/> : <div/>}` 分支切换 → SQLEditorBody 整棵卸载，承载 EditorView DOM 的 div 被移出文档（且未调用 `view.destroy()`）；新挂的纯 div 虽被 ref 附着，但 `useCodeMirror` mount effect 同样不会重跑。
  4. 错误结果：diffValue 变体——界面上永远显示普通单编辑器，diff 双栏静默不出现，`data-diff` 属性却已置位，`view` 变为 null（component:clear/focus 等句柄全部返回 "view not ready"）；sqlConfig 变体——编辑器连同 DOM 直接消失且泄漏一个未 destroy 的 EditorView。
- 为什么现有测试没有抓到：`use-merge-view.test.tsx` 只测"挂载后 original/modified 变化的 effect 同步"（diff 模式从挂载起就成立），没有"运行时从单编辑器切到 diff"的用例。
- 修复方向：把模式纳入重建键——或在 renderer 层按 `isDiffMode`/`isSQL` 给挂载点加 `key` 强制子树重建；或在两个 hook 的 mount effect 依赖中加入"容器是否附着"的 state（ref attach 回调触发 setState 再建）；至少在 renderer 里用单一 hook 按 mode 分支创建，避免两个僵尸 hook。

## P1 隐患

### F-02 `reset` 组件句柄在 form/scope 绑定模式下是 no-op："初始值" ref 被持续同步为最新受控值，"captured at mount" 契约失效

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer.tsx:208-211`（initialValueRef 持续跟随 value）
  - `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-handle.ts:55-60`（reset 读取该 ref）
- 关键源码摘录：
  ```ts
  const initialValueRef = useRef(value);
  useEffect(() => {
    initialValueRef.current = value;      // 每次受控值变化都改写"初始值"
  }, [value]);
  // use-code-editor-handle.ts
  case 'reset': {
    const initial = initialValueRef.current;   // == 当前 doc
    editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: initial } });
  ```
- 问题：组件能力契约自述 "Reset the editor content to its initial value"、hook 注释自述 "captured at mount"。但 form 绑定链路（`handleChange` → `currentForm.setValue` → 受控 `value` 返回同值 → effect 改写 ref）使 `initialValueRef.current` 任何时刻都等于编辑器当前 doc，`reset` dispatch 一个"替换为自身"的事务。
- 影响：`component:reset` 动作在表单/作用域绑定（主用法）下静默无效；仅当 `value` 为非响应式静态 prop（无 name）时 reset 才真正回退。`code-editor-handles.test.tsx` 用静态 initialValue 的探针组件复刻了同样的 ref 跟随逻辑，因此测不出。
- 修复方向：把"mount 时快照"与"受控值"分开——`initialValueRef` 只在首次挂载（或表单 reset 生命周期）写入，不受后续 value effect 改写；或明确语义改为"重置到上次外部值"并同步修正契约文案与实现（当前实现两者都不是）。

### F-03 外部受控值同步无事务标注：程序化全文替换进入撤销历史，Ctrl+Z 会逐步回滚外部更新；无 IME 组合期防护

- 位置：
  - `packages/flux-code-editor/src/use-code-mirror.ts:112-123`（单编辑器外部同步）
  - `packages/flux-code-editor/src/use-merge-view.ts:161-185`（merge 左/右两侧外部同步，同构）
- 关键源码摘录（use-code-mirror.ts:116-122）：
  ```ts
  const currentDoc = editorView.state.doc.toString();
  const incoming = options.initialValue ?? '';
  if (currentDoc !== incoming) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: incoming },
    });
  }
  ```
- 问题：dispatch 未加 `annotations`/`userEvent` 标注，也未配 history 过滤。每次 `form.reset()`、异步初值加载、联动 `setValue` 产生的全文替换都会成为一条可 undo 的历史记录；同时全文替换会把光标/选区折叠到映射边界（外部更新时光标跳动）；同步也未检查 `editorView.composing`——IME 组合输入期间若外部值恰好变化，dispatch 全文替换会打断/撕裂组合会话。
- 影响：用户按一次 Ctrl+Z 期望撤销自己刚才的输入，实际可能先回滚一次"外部程序化更新"，且回滚本身经 updateListener → `handleChange` 回写 form（见 F-06），表单值跟着在历史态之间跳；大文档下全文替换（而非增量 diff）也放大重排成本。
- 修复方向：外部同步事务加 `annotations: Transaction.annotation` 类自定义标记 + `history({ newGroupDelay })` 配合 `filter`/`isolateHistory` 把程序化更新排除出撤销栈；dispatch 前检查 `view.composing`（组合期挂起或合并到组合结束）；可选：用最小 diff 变更集替代 0..length 全量替换。

### F-04 scope 来源的 variables/tables/SQL 变量非响应式：`useMemo + scope.get/readVisible` 而非 `useScopeSelector`，异步加载的补全数据永不刷新

- 位置：`packages/flux-code-editor/src/source-resolvers.ts:123-139`（variables）、`:153-169`（tables）、`:171-187`（SQL 变量面板）
- 关键源码摘录（source-resolvers.ts:129-138）：
  ```ts
  return useMemo<VariableItem[]>(() => {
    if (!raw) return [];
    if (!isVariableSourceRef(raw)) return sanitizeVariableItems(raw);
    if (raw.source === 'scope') {
      const data = raw.scopePath ? scope.get(raw.scopePath) : scope.readVisible(); // 一次性快照
      const items = getDataAtPath(data, resolveSourceRefPath(raw));
      return sanitizeVariableItems(items);
    }
    return [];
  }, [raw, scope]); // 依赖里没有任何"scope 数据变了"的信号
  ```
- 问题：`ScopeRef` 对象身份在 scope 数据变化时保持稳定，`raw`（schema 侧配置对象）也稳定 → memo 永不重算。对照同包 `use-code-editor-binding.ts:25-29`，value 绑定正确使用了 `useScopeSelector`（契约要求"Reactive scope data → useScopeSelector"），补全数据却退化为挂载瞬间的快照。
- 影响：`variables: { source: 'scope', scopePath: 'dict.vars' }` 或 `tables: {source:'scope'...}` 且数据异步到达/后续变化时，表达式补全、friendly-name 装饰、SQL 表列补全、SQL 变量面板全部停留在空/旧数据，除非组件因无关原因重渲染且 resolved props 恰好换了 `raw` 身份（不可依赖）。同时违反渲染器契约 D2（reactive scope 读取必须走标准 hook）。
- 修复方向：四个 resolver 改用 `useScopeSelector`（带 `paths: [scopePath]` 订阅），在 selector 内完成 sanitize；或对 `source:'scope'` 分支单独包一层 `useScopeSelector` 取原始数据后再 useMemo sanitize。

### F-05 readOnly 编辑器的工具栏/句柄仍可改文档：dispatch 绕过 `EditorState.readOnly`，而 `handleChange` 被 readOnly 早退，造成 doc 与 store 永久失同步

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:150-160`（insertAtCursor）、`:162-172`（handleFormatSQL）
  - `packages/flux-code-editor/src/code-editor-renderer/sql-editor-toolbar.tsx:38-76`（按钮无 disabled）
  - `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-handle.ts:49-53`（clear）
  - `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:66-69`（readOnly 早退）
- 关键源码摘录：
  ```ts
  const handleChange = (newValue: string) => {
    if (readOnly) {
      return;               // 外部 store 不再跟随 doc
    }
  // insertAtCursor / handleFormatSQL / clear：
  view.dispatch({ changes: { from: pos, to: pos, insert: text } });  // 绕过 readOnly
  ```
- 问题：`EditorState.readOnly` 只拦截用户输入，不拦截程序 dispatch。SQL 工具栏的格式化/插入 snippet/插入变量按钮未随 readOnly 禁用，component:clear/reset 句柄也无 readOnly 防护；这些通道改了 doc 后 updateListener 触发的 `handleChange` 又被 readOnly 挡住。
- 影响：特定条件（`readOnly: true` 或 `disabled: true` 的 SQL/普通编辑器）下点击工具栏或派发句柄——编辑器内容 visibly 变了（格式化/插入/清空），但 form/scope 值保持旧值，二者永久失同步（直到下一次外部值变化才被拉回，中间的提交会提交旧值）；对"只读展示原始 SQL"场景是数据正确性问题。
- 修复方向：两条任选或并用——(1) 工具栏按钮与句柄 invoke 入口统一加 readOnly 判断直接拒绝；(2) `handleChange` 的 readOnly 早退只跳过 store 写入前先判断"变更是否来自用户输入"（事务标注区分），保证 doc 与 store 单一事实源。

## P2 风险

### F-06 受控回环 echo：外部值同步经 updateListener 反向触发 onChange → `validateField('change')` 与 schema onChange 动作在程序化更新时误触发

- 位置：`packages/flux-code-editor/src/use-code-mirror.ts:47-50`（docChanged 即回调）；`use-code-editor-binding.ts:71-79`
- 关键源码摘录：
  ```ts
  EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      callbacks.onChange(update.state.doc.toString());   // 不区分事务来源
    }
  // binding:
  currentForm.setValue(name, newValue);
  void currentForm.validateField(name, 'change');        // 程序化 reset 也会触发
  props.events.onChange?.({ value: newValue });          // 加载/重置时误派动作
  ```
- 问题：F-03 的外部同步 dispatch 同样命中此 listener。`form.reset()`/异步初值/联动 setValue 会触发 change 原因的校验与 schema onChange 动作链（若 onChange 里配了 setValue/提交类动作，会在数据加载完成时意外执行一次）。事件契约文案"Runs when the editor value changes"字面上含外部变更，但 touch/validate('change') 语义被污染是实际副作用。
- 影响：特定条件——表单绑定 + onChange 动作有副作用（自动保存、级联 setValue）时，程序化赋值引发一次多余动作派发；循环会在值稳定后收敛（编辑器层有字符串相等守卫），不会死循环。
- 修复方向：与 F-03 同一事务标注方案——外部同步事务标注后，updateListener 内跳过 onChange（或以 `{source:'external'}` 参数上抛，由 binding 决定是否触发事件）。

### F-07 渲染期重建 extensions/contentAttributes 身份：非 React Compiler 消费路径下每次 render 触发多次 compartment reconfigure dispatch

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer.tsx:93-101`（`Object.fromEntries` 每渲染新对象）、`:146-158`（`createBaseExtensions` 在渲染体内直接调用，无 useMemo）
  - `packages/flux-code-editor/src/use-code-mirror.ts:134-141, 154-163`（按身份 diff 的 reconfigure effects）
- 关键源码摘录：
  ```ts
  const extensions = createBaseExtensions({ language, mode /* ... */ }); // 每渲染新数组
  // use-code-mirror.ts
  useEffect(() => {
    const editorView = viewRef.current;
    if (!editorView) return;
    editorView.dispatch({ effects: extensionsCompartment.reconfigure(options.extensions ?? []) });
  }, [options.extensions]); // 身份每渲染都变 → 每渲染 dispatch
  ```
- 问题：本包按 `tsc` 构建产物分发（无编译期记忆化）；只有 playground 走 `reactCompilerPreset`（已核实 `apps/playground/vite.config.ts:15`）可能稳定身份。dist 消费者每次 render 都会触发 extensions + contentAttributes 两次 reconfigure（merge 模式翻倍到 a/b 双侧四次），reconfigure 使 CodeMirror 重建语言/补全 facet，大文档 + 高频重渲染（如表单其他字段联动）下有可测开销。
- 影响：D6 性能风险，条件=消费方未启用 React Compiler 或任何测试环境（vitest 不经编译器）。
- 修复方向：`extensions`/`contentAttributes` 在 renderer 层显式 `useMemo`（按 language/mode/theme/补全数据等真实输入），或 hook 内先做浅结构相等守卫再 reconfigure。**suspect 标注**：playground 路径因编译器记忆化可能无症状，需以 dist 消费场景复测确认量级。

### F-08 表达式顶层补全对多级变量只插入最后一段：`apply: lastSegment(c.value)` 使选中的补全产生错误引用

- 位置：`packages/flux-code-editor/src/extensions/expression/completion.ts:84-91`
- 关键源码摘录：
  ```ts
  const varOptions = flattenVariables(variables)
    .filter((v) => lastSegment(v.value).toLowerCase().startsWith(partial))
    .map((v) => ({
      label: lastSegment(v.value),
      apply: lastSegment(v.value), // 变量 value 为 "order.customer.name" 时只插入 "name"
      type: 'variable' as const,
    }));
  ```
- 问题：点号后续补全路径（dotMatch 分支）语义正确；但顶层（`word` 分支）把深层变量按最后一段匹配并只插入最后一段，产出不含前缀的表达式（如 `name` 而非 `order.customer.name`），公式求值时解析为不存在的标识符。
- 影响：配置了层级变量树的表达式编辑器，用户接受补全即得到静默求值失败的表达式（配合 lint 才可见错误）。**suspect 标注**：若产品语义是"顶层只允许按叶子短名补全、前缀由用户补"，则该行为是有意设计，但 `label` 与 `apply` 均无任何前缀提示，倾向视为缺陷。
- 修复方向：顶层补全 `apply` 使用完整 `v.value`（`from` 相应前移到词首），label 可保留短名 + detail 显示全路径。

### F-09 `ExpressionLintConfig.customRules` 声明于 schema 类型但 linter 完全未实现（dead config）

- 位置：`packages/flux-code-editor/src/types.ts:107-112`（规则类型）；`packages/flux-code-editor/src/extensions/expression/linter.ts:35-39`（仅用 debounceMs）
- 关键源码摘录：
  ```ts
  export interface ExpressionLintRule extends SchemaObject {
    name: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    validate: string; // 声明的自定义规则
  }
  // linter.ts —— 只消费 debounceMs：
  export function createExpressionLinter(config?: boolean | ExpressionLintConfig): Extension {
    const obj = typeof config === 'object' ? config : undefined;
    const debounceMs = obj?.debounceMs ?? 300;
    return linter(lintExpression, { delay: debounceMs });
  }
  ```
- 问题：`customRules`（含 `validate` 表达式、severity）在包内零消费（已 grep 确认无其他引用）；`showOnEdit` 同样未消费。
- 影响：schema 作者按类型声明配置自定义 lint 规则永远不生效，静默失效；属 D2 契约-实现缺口。
- 修复方向：要么在 `lintExpression` 中执行 customRules（`validate` 需经 runtime 求值，注意上下文注入），要么从类型中移除/标注 `@deprecated` 并在文档登记。

### F-10 SQL 执行缺省回退硬编码 `/api/report/execSql`；`mergeExecutionData` 参数展开顺序允许名为 `sql` 的参数覆盖真实 SQL

- 位置：`packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:193-204`、`:82-91`
- 关键源码摘录：
  ```ts
  } else {
    const action: ActionSchema = {
      action: 'ajax',
      args: { url: '/api/report/execSql', method: 'POST', /* ... */ },
    };
  // mergeExecutionData：
  return { ...action, args: { ...(action.args ?? {}), sql, ...(params ?? {}) } };
  ```
- 问题：(1) 未配置 `executeAction` 时向固定的业务端点发 POST——通用渲染器包内嵌魔法 URL，host 未部署该端点时报错信息（"Execution returned no data"/HTTP 错误）无法指引配置缺失；(2) params 在 `sql` 之后展开，execution.params 里名为 `sql` 的映射会覆盖真实 SQL 文本。
- 影响：D5 错误处理 + 契约风险：默认路径在多数宿主下必然失败且原因隐晦；参数名碰撞静默替换执行内容。
- 修复方向：缺省回退改为显式报错（"sqlConfig.execution.executeAction 未配置"）或要求 schema 声明端点；`mergeExecutionData` 把 `sql` 放在 params 之后展开或过滤保留字。

### F-11 非 SQL 编辑器全屏时编辑区无高度约束：全屏浮层内编辑器不撑开

- 位置：`packages/flux-code-editor/src/code-editor-renderer.tsx:276`（fullscreen 丢弃 containerStyle）、`:307`（非 SQL 分支裸 div 无样式）；`code-editor-styles.css:80-87`（`[data-fullscreen]` 仅约束容器自身）
- 关键源码摘录：
  ```tsx
  style={!isFullscreen ? containerStyle : undefined}
  // ...
  {isSQL ? sqlSlots.body : <div ref={editorRef} />}   // 非 SQL：无 flex/height
  ```
- 问题：SQL 分支由 `SQLEditorBody` 提供 `flex:1/overflow:auto`；非 SQL 全屏分支的编辑器 div 无任何尺寸样式，`.cm-editor` 高度退化为内容高度。全屏后得到一个巨大的固定浮层 + 一条窄编辑器。
- 影响：`allowFullscreen + 非 SQL` 场景视觉破版（P2 视觉缺陷，条件明确）。
- 修复方向：给非 SQL 分支编辑器 div 加 `style={{ flex: 1, minHeight: 0 }}`（fullscreen 时），或 CSS `[data-fullscreen] > div:last-child` 类规则统一兜底。

## P3 提示

### F-12 i18n 残留硬编码英文（D7）

- 位置与摘录：
  - `packages/flux-code-editor/src/code-editor-renderer/snippet-panel.tsx:27`：`title="Insert snippet"`（邻近按钮全部用 `t('flux.codeEditor.*')`）
  - `packages/flux-code-editor/src/sql-result-panel.tsx:46,64`：`aria-label="Close"` x2
  - `packages/flux-code-editor/src/code-editor-renderer.tsx:477`：`` `${schema.label || 'Code'} cannot be empty` ``（required 校验消息硬编码英文）
- 影响：中文界面出现英文 tooltip/无障碍标签/校验消息。`flux.codeEditor.*` 其余 24 个 key 双语齐全（已核对 zh-CN.ts:964-989 / en-US.ts:965-988），仅这几处漏网，静态 i18n 检查只扫 key 不扫字面量。
- 修复方向：补 key（如 `flux.codeEditor.insertSnippet` / `close` / required 消息走校验文案通道）。

### F-13 `history()` 双重注册冗余

- 位置：`packages/flux-code-editor/src/extensions/base.ts:148` 与 `use-code-mirror.ts:40`、`use-merge-view.ts:74`（同一 state 内两次 `history()`）
- 核实结论：已读 `@codemirror/commands` dist——`history()` 返回模块级单例 `historyField_`；`@codemirror/state` 的 `resolve` 对重复 StateField **不去重**（`fields.push(ext)` 后 `address[field.id]` 被后者覆盖），行为上无害但产生冗余 slot 与重复 keymap 提供者。
- 修复方向：从 `createBaseExtensions` 或 `createEditorState/buildEditorConfig` 二者之一移除 `history()`，单一来源。

### F-14 ColorizeView 与变量面板的小型风险

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer/colorize.tsx:90-105`——每个实例注入整份 `highlightStyle.module.getRules()` 到 `<style>`；多实例页面规则重复；`buildColorize` 对 value 每次变化同步全文 parse（只读展示可接受，超大文档有单帧卡顿风险）。
  - `packages/flux-code-editor/src/variable-panel.tsx:81`——`key={variable.value}`，兄弟变量 value 重复时 React key 冲突（scope 来源数据不受控）。
  - `variable-panel.tsx:39-45`——`navigator.clipboard` 失败静默吞掉，无 `env.notify` 提示。
- 修复方向：style 规则提升为模块级一次注入；key 改 `label+value` 或索引兜底；复制失败给轻提示。

### F-15 friendly-name 装饰全文扫描性能

- 位置：`packages/flux-code-editor/src/extensions/expression/decoration.ts:76-123`
- 摘要：每次 `docChanged/focusChanged` 对全文档按每个变量路径 `doc.indexOf` 扫描（O(paths×doc)），overlap 检测 `matches.some` 嵌套为 O(matches²)；开启 `showFriendlyNames` + 多变量 + 长文档时每次击键全量重扫。
- 修复方向：用 `SearchCursor` + 只在可见视口范围建装饰（`view.viewportLineBlocks`），或用正则一次遍历多路径。

### F-16 杂项：onEditorMount 一次性标志 / 死配置 / 执行参数 value 特例

- 位置：
  - `packages/flux-code-editor/src/code-editor-renderer.tsx:216-222`——`mountedRef` 使 `onEditorMount` 只在首个 view 上触发一次；view 因 StrictMode 双挂载或（F-01 修复后的）模式切换重建时不再触发，且无 view 销毁时的重置。
  - `packages/flux-code-editor/src/use-code-mirror.ts:18`——`UseCodeMirrorOptions.theme` 声明但从未消费（主题实际走 extensions），死参数误导调用方。
  - `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:37-56`——`readScopePath` 的 `value`/`value.*` 特例只读 `props.props.value`；form 绑定编辑器的受控值在 form store 而非 props，`execution.params` 映射 `value` 将得到 undefined。**suspect**：取决于 node scope 是否镜像 form 值，建议改读绑定链路的实际 value。

### F-17 执行结果映射的粗糙边界

- 位置：`packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:93-123`；`sql-result-panel.tsx:85`
- 摘要：`result.ok===true && result.data==null` 被判为 error（"Execution returned no data"），合法空结果与失败混同；非数组成功值一律 `String(data)`，对象呈 `[object Object]`（表格单元格 `String(row[col] ?? '')` 同病）。
- 修复方向：区分"成功但空"状态；对象值 JSON 序列化展示。

## 检查过程记录

1. 基线：读 `docs/references/quick-reference.md`（RendererComponentProps/标准 hooks/契约表）、`AGENTS.md` 渲染器规约。
2. 结构与依赖：`package.json`（CodeMirror 6 系 + merge + sql-formatter；react/lucide 为 peer）、`index.ts`（lazy 双导出模式：`CodeEditorRenderer` 直出 + `codeEditorRendererDefinition` 用 `createLazyRendererComponent` 包装，与 scheduling 等包一致）。
3. 精读 26 个实现文件（`code-editor-renderer.tsx` 483 行为最大文件，全部逐行；其余按模块精读），按 D1/D2/D3(React19)/D5/D6/D7/D8 记录候选问题。
4. 交叉验证（反误报）：
   - `meta.visible` 未在 renderer 内检查——核实 `packages/flux-react/src/node-renderer-resolved.tsx:422` 框架层统一裁剪，非缺陷；
   - code-editor→flux-renderers-form 的 `formFieldChromeRules` 跨包引用已有 Adjudication 01-06 注记，合规；
   - i18n：zh-CN/en-US 双 locale 的 `flux.codeEditor.*` 24 key 全部存在，`t(key, {count})` 签名支持插值；仅 F-12 三处字面量漏网；
   - 重复 `history()`/重复 Compartment 行为：直读已安装 `@codemirror/state`/`@codemirror/commands` dist 确认 StateField 不去重但地址覆盖、同 compartment 重复会抛 RangeError（本包各 compartment 均单处使用，无触发）；
   - MergeView `revertControls` 缺省不渲染回退按钮（读 dist .d.ts 确认），最初怀疑的"左栏回退不同步"不成立，已剔除；
   - `useCurrentFormState(selector, eq, {enabled, path})`、`ComponentHandleRegistry.register→unregister`、`isAbortError`、`createLazyRendererComponent`、`resolveRendererSlotContent` 等依赖 API 签名均已核实存在且用法正确；
   - React Compiler：playground vite 配置启用 `reactCompilerPreset({target:'19'})`，但包构建为纯 `tsc`——F-07 按"dist 消费无记忆化"定级。
5. D8 行数：非测试源文件最大 `code-editor-renderer.tsx` 483 行 < 500 警告线，`scripts/check-oversized-code-files.mjs`（WARN_LINES=500）无需新增注册；css 306 行。
6. 未运行任何 pnpm 命令与测试（只读审计约束）；所有结论基于源码静态推理 + 依赖包 dist 源码核实，suspect 项已在正文标注。
