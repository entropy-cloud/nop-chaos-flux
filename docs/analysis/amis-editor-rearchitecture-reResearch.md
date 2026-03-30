# amis 编辑器架构调研报告：CodeMirror 与 Monaco Editor 的集成细节

> 本文档基于对 `~/sources/amis` 源码的深入分析，梳理 amis 如何集成 CodeMirror 5 和 Monaco Editor，以及公式编辑器的完整设计，为基于 CodeMirror 6 实现类似功能提供参考。

---

## 一、总体架构

amis 采用**双编辑器架构**，不同场景使用不同编辑器：

| 编辑器 | 包 | 用途 | 依赖形式 |
|------|---------|------|------|
| **CodeMirror 5** | `codemirror ^5.63.0` | 公式/表达式编辑 — 重量级，支持自定义语法模式、变量标记、函数高亮 |
| **Monaco Editor** | `monaco-editor` (动态 import) | 通用代码编辑 (JSON/JS/HTML/CSS/TS) Diff 对比) 按需加载,功能全面 |

**核心结论**: amis **没有 SQL 编辑器实现**，SQL 场景需要从零构建。

### 源码位置索引

```
packages/amis-ui/src/components/
├── CodeMirror.tsx                          # CM5 React 封装组件
├── Editor.tsx                            # Monaco Editor React 封装组件
├── DiffEditor.tsx                       # Monaco Diff Editor 封装组件
├── JSONSchemaEditor.tsx                  # Schema 编辑器入口（重导出）
├── formula/
│   ├── plugin.ts                       # CM5 公式语言模式注册 + FormulaPlugin 核心
│   ├── CodeEditor.tsx                 # CM5 公式编辑器 React 组件
│   ├── Editor.tsx                     # 公式编辑器完整 UI（三栏布局）
│   ├── Input.tsx                     # 公式输入框（内嵌 CodeEditor）
│   ├── Picker.tsx                    # 公式选择器弹窗（Modal + FormulaEditor）
│   ├── FuncList.tsx                  # 函数列表面板
│   └── VariableList.tsx              # 变量列表面板

packages/amis-formula/src/
├── lexer.ts                              # 手写词法分析器
├── parser.ts                            # 递归下降解析器
├── evalutor.ts                           # AST 执行器
├── evalutorForAsync.ts                   # 异步执行器
├── filter.ts                             # 管道过滤器
├── function.ts                           # 内置函数
├── doc.ts                                # 函数文档（自动生成）
├── types.ts                              # 类型定义
```

---

## 二、Monaco Editor 集成

### 2.1 组件层级

```
Editor.tsx  →  通用代码编辑器 (单文件编辑)
DiffEditor.tsx  →  差异对比编辑器 (双文件 diff)
```

两者共享 `EditorBaseProps` 接口，通过 `editorFactory` 工厂函数模式创建编辑器实例。

### 2.2 EditorBaseProps 接口

```typescript
interface EditorBaseProps {
  value?: string;
  defaultValue?: string;
  width?: number | string;
  height?: number | string;
  onChange?: (value: string, event: any) => void;
  disabled?: boolean;
  language?: string;         // 'javascript' | 'json' | 'css' | 'html' | 'typescript'
  editorTheme?: string;        // 'vs' | 'vs-dark'
  allowFullscreen?: boolean;
  options?: Record<string, any>;  // Monaco 原生选项透传
  context?: any;               // 自定义 monaco 实例来源 (默认 window)
  placeholder?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  editorDidMount?: (editor: any, monaco: any) => void;
  editorWillMount?: (monaco: any) => void;
  editorWillUnmount?: (editor: any, monaco: any) => void;
  editorFactory?: (container: HTMLElement, monaco: any, options: any) => any;
}
```

### 2.3 加载策略

Monaco 采用**动态 import**，避免首屏加载大体积编辑器：

```typescript
loadMonaco() {
  // 全局 locale 设置（仅初始化前有效）
  (window as any).__amis_monaco_editor_locale = this.props.locale;
  import('monaco-editor').then(monaco => this.initMonaco(monaco));
}
```

### 2.4 Worker 配置

Monaco 需要 Web Worker 提供语言服务（语法检查、补全等），amis 配置了 `MonacoEnvironment.getWorkerUrl`：

```typescript
(window as any).MonacoEnvironment = {
  getWorkerUrl: function (moduleId: string, label: string) {
    let url = '/pkg/editor.worker.js';
    if (label === 'json') url = '/pkg/json.worker.js';
    else if (label === 'css') url = '/pkg/css.worker.js';
    else if (label === 'html') url = '/pkg/html.worker.js';
    else if (label === 'typescript' || label === 'javascript') url = '/pkg/ts.worker.js';

    // CDN 部署：用 importScripts 内联加载
    if (/^https?/.test(url)) {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(`importScripts('${url}');`)}`;
    }
    return url;
  }
};
```

### 2.5 默认工厂函数

```typescript
export function monacoFactory(container, monaco, options) {
  return monaco.editor.create(container, {
    autoIndent: true,
    formatOnType: true,
    formatOnPaste: true,
    selectOnLineNumbers: true,
    scrollBeyondLastLine: false,
    folding: true,
    minimap: { enabled: false },
    scrollbar: { alwaysConsumeMouseWheel: false },
    bracketPairColorization: { enabled: true },
    ...options,
  });
}
```

### 2.6 编辑器生命周期

```
mount 阶段:
  1. editorWillMount(monaco)          → 挂载前回调
  2. factory(container, monaco, opts)  → 创建编辑器实例
  3. JSON 默认开启验证和 schema 请求
  4. editorDidMount(editor, monaco)   → 挂载完成回调

update 阶段:
  - value 变化时: model.pushEditOperations 同步值（保持 undo 栈）
  - readOnly 变化时: editor.updateOptions

unmount 阶段:
  - editorWillUnmount(editor, monaco)
  - dispose 所有 disposes（事件监听器）
  - editor.dispose() + editor.getModel().dispose()
```

### 2.7 事件绑定模式

```typescript
editorDidMount(editor, monaco) {
  // 内容变化
  this.disposes.push(
    editor.onDidChangeModelContent((event) => {
      if (!this.preventTriggerChangeEvent) {
        onChange?.(editor.getValue(), event);
      }
    }).dispose
  );
  // 焦点事件
  onFocus && this.disposes.push(editor.onDidFocusEditorWidget(onFocus).dispose);
  onBlur  && this.disposes.push(editor.onDidBlurEditorWidget(onBlur).dispose);
}
```

### 2.8 DiffEditor 扩展

`DiffEditor.tsx` 复用 `Editor` 组件，通过自定义 `editorFactory` 创建 DiffEditor：

```typescript
editorFactory(container, monaco, options) {
  return monaco.editor.createDiffEditor(container, options);
}

editorDidMount(editor, monaco) {
  this.editor = editor;
  this.modifiedEditor = editor.getModifiedEditor();
  this.originalEditor = editor.getOriginalEditor();

  // 监听修改侧内容变化
  this.toDispose.push(
    this.modifiedEditor.onDidChangeModelContent(this.handleModifiedEditorChange).dispose
  );
  // 自动调整高度（根据行数动态 resize）
  this.toDispose.push(
    this.modifiedEditor.onDidChangeModelDecorations(() => {
      this.updateContainerSize(this.modifiedEditor, monaco);
    }).dispose
  );

  // 设置 diff 模型
  this.editor.setModel({
    original: monaco.editor.createModel(originValue, language),
    modified: monaco.editor.createModel(value, language),
  });
}
```

DiffEditor 的**自动高度调整**值得注意——它根据修改侧行数动态设置容器高度：

```typescript
updateContainerSize(editor, monaco) {
  const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
  const lineCount = editor.getModel()?.getLineCount() || 1;
  const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight;
  if (this.prevHeight !== height && dom.parentElement) {
    dom.parentElement.style.height = `${height}px`;
    editor.layout();
  }
}
```

### 2.9 全屏模式

`Editor.tsx` 内置全屏切换，退出全屏时自动 `editor.layout()` 恢复尺寸：

```typescript
handleFullscreenModeChange() {
  this.setState({ isFullscreen: !this.state.isFullscreen }, () =>
    !this.state.isFullscreen &&
    this.editor.layout({ width: this.state.innerWidth, height: this.state.innerHeight })
  );
}
```

### 2.10 设计总结

| 设计要点 | 实现方式 |
|---------|---------|
| 按需加载 | `import('monaco-editor')` 动态导入 |
| Worker 管理 | `MonacoEnvironment.getWorkerUrl` + CDN `importScripts` 回退 |
| 工厂模式 | `editorFactory` prop 允许外部自定义创建逻辑 |
| 生命周期钩子 | `editorWillMount` / `editorDidMount` / `editorWillUnmount` |
| 值同步 | `model.pushEditOperations` 保持 undo 栈完整 |
| 焦点/失焦 | `onDidFocusEditorWidget` / `onDidBlurEditorWidget` |
| 自动布局 | `automaticLayout: true` |
| 全屏模式 | 切换 CSS class + `editor.layout()` |
| JSON 特殊处理 | 自动格式化 + 开启 schema 验证 |
| placeholder | 自定义 `<span>` 覆盖层（非 Monaco 原生） |

---

## 三、CodeMirror 5 集成

### 3.1 组件层级

```
CodeMirror.tsx     →  CM5 React 封装（底层）
formula/plugin.ts   →  公式语言模式 + FormulaPlugin 核心逻辑
formula/CodeEditor.tsx →  公式编辑器 React 组件（连接 CM5 + Plugin）
formula/Editor.tsx   →  公式编辑器完整 UI（三栏布局 + 运行面板）
formula/Input.tsx   →  公式内联输入框（单行模式）
formula/Picker.tsx  →  公式选择器弹窗（Modal/PopUp + FormulaEditor）
```

### 3.2 CodeMirror.tsx — CM5 React 封装

这是 amis 对 CodeMirror 5 的最小化 React 封装，职责单一：管理 DOM、加载 CM5、同步值。

```typescript
interface CodeMirrorEditorProps {
  className?: string;
  style?: any;
  value?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  editorFactory?: (dom: HTMLElement, cm: typeof CodeMirror, props?: any) => CodeMirror.Editor;
  editorDidMount?: (cm: typeof CodeMirror, editor: CodeMirror.Editor) => void;
  editorWillUnMount?: (cm: typeof CodeMirror, editor: CodeMirror.Editor) => void;
}
```

**异步加载模式**（与 Monaco 相同思路）：

```typescript
async componentDidMount() {
  const cm = (await import('codemirror')).default;
  await import('codemirror/mode/javascript/javascript');   // JS 语法
  await import('codemirror/mode/htmlmixed/htmlmixed');     // HTML 混合模式
  await import('codemirror/addon/mode/simple');             // 简单模式定义工具
  await import('codemirror/addon/mode/multiplex');          // 多路复用模式
  await import('codemirror/addon/display/placeholder');     // placeholder 支持

  this.editor = this.props.editorFactory?.(this.dom.current!, cm, this.props)
    ?? cm(this.dom.current!, { value, readOnly });

  this.props.editorDidMount?.(cm, this.editor);
  this.editor.on('change', this.handleChange);
  this.editor.on('blur', this.handleBlur);
  this.editor.on('focus', this.handleFocus);

  // resize 传感器 → 自动 refresh
  this.toDispose.push(resizeSensor(this.dom.current, () => this.editor?.refresh()));
  // 弹窗内首次渲染光标可能太小，延迟 refresh
  setTimeout(() => this.editor?.refresh(), 350);
}
```

**值同步策略**：

```typescript
setValue(value?: string) {
  const doc = this.editor!.getDoc();
  if (value !== doc.getValue()) {
    const cursor = doc.getCursor();  // 保存光标位置
    doc.setValue(value || '');
    doc.setCursor(cursor);          // 恢复光标位置
  }
}
```

**设计要点**：
- `resizeSensor` 监听容器尺寸变化，触发 `editor.refresh()`
- 弹窗场景延迟 350ms refresh，解决初次渲染光标异常
- 值同步时保存并恢复光标位置，避免光标跳动

### 3.3 formula/plugin.ts — 核心插件

这是整个公式编辑器最核心的文件，包含语言模式注册、变量/函数标记、智能插入、错误提示等功能。

#### 3.3.1 自定义语言模式

```typescript
let modeRegisted = false;
function registerLaunguageMode(cm: typeof CodeMirror) {
  if (modeRegisted) return;
  modeRegisted = true;

  // evalMode：纯表达式，直接复用 JavaScript 高亮
  cm.defineMode('formula', (config, parserConfig) => {
    var formula = cm.getMode(config, 'javascript');
    if (!parserConfig || !parserConfig.base) return formula;

    // 模板模式：外层 htmlmixed，${...} 内部切换到 JavaScript
    return cm.multiplexingMode(cm.getMode(config, parserConfig.base), {
      open: '${',
      close: '}',
      mode: formula,
    });
  });
  cm.defineMIME('text/formula', { name: 'formula' });
  cm.defineMIME('text/formula-template', { name: 'formula', base: 'htmlmixed' });
}
```

**两种运行模式**：
- `text/formula`（evalMode=true）：纯表达式，直接用 JS 语法高亮
- `text/formula-template`（evalMode=false）：模板模式，`${...}` 内用 JS 高亮，外面当 HTML 文本

**工厂函数**：

```typescript
export function editorFactory(dom, cm, props, options?) {
  registerLaunguageMode(cm);
  return cm(dom, {
    value: props.value || '',
    autofocus: false,
    mode: props.evalMode ? 'text/formula' : 'text/formula-template',
    readOnly: props.readOnly ? 'nocursor' : false,
    ...options,
  });
}
```

#### 3.3.2 FormulaPlugin 类

`FormulaPlugin` 是公式编辑器的核心逻辑类，管理变量/函数数据、AST 解析、文本标记和智能插入。

**数据模型**：

```typescript
interface VariableItem {
  label: string;                // 显示名（如 "用户名"）
  value?: string;               // 变量路径（如 "data.user.name"）
  path?: string;                // 路径标签
  children?: VariableItem[];    // 子属性（支持嵌套对象）
  type?: string;                // 类型描述
  tag?: string;                 // 标签
  isMember?: boolean;           // 是否是数组成员（用于 items[0].field 场景）
}

interface FuncGroup {
  groupName: string;             // 分组名（如 "逻辑函数"、"文本函数"）
  items: FuncItem[];
}

interface FuncItem {
  name: string;                  // 函数名（如 "IF"、"SUM"）
  example?: string;
  description?: string;
}
```

#### 3.3.3 autoMark — AST 遍历 + 智能标记

这是 amis 公式编辑器最精巧的设计。它**利用 amis-formula 的 parser 生成 AST，然后遍历 AST 节点进行标记替换**：

```typescript
autoMark() {
  const editor = this.editor;
  const value = editor.getValue();

  // 清除旧标记
  this.marks.forEach(mark => mark.clear());
  this.marks = [];
  this.widgets.forEach(widget => editor.removeLineWidget(widget));
  this.widgets = [];

  try {
    // 1. 用 amis-formula parser 解析表达式
    const ast = parse(value, { evalMode: this.evalMode, variableMode: false });

    // 2. 递归遍历 AST
    traverseAst(ast, (ast) => {
      // --- 表达式整体高亮模式 ---
      if (highlightMode === 'expression') {
        if (ast.type === 'script') {
          // 整个 ${...} 标记为一个表达式块
          this.markText(from, to, innerContent, 'cm-expression', value);
        }
        return;
      }

      // --- 公式内部高亮模式 ---
      if (ast.type === 'func_call') {
        // 标记已知函数名
        const exists = functions.some(g => g.items.some(i => i.name === funName));
        if (exists) this.markText(from, to, funName, 'cm-func');
      }
      else if (ast.type === 'getter') {
        // 解析属性访问链: host.key1.key2...
        // 收集从根到叶的 getter 链
        const list = [ast];
        let current = ast;
        while (current?.type === 'getter') {
          current = current.host;
          list.unshift(current);
        }
        const host = list.shift();  // 根变量
        if (host?.type === 'variable') {
          const variable = findTree(variables, item => item.value === host.name);
          if (variable) {
            // 标记根变量
            this.markText(host.start, host.end, variable.label, 'cm-field', host.name);

            // 逐级标记子属性
            let path = host.name + '.';
            let vars = variable.children || [];
            for (const item of list) {
              if (item.key?.type === 'identifier') {
                // data.name 形式
                const v = findTree(vars, v => v.value === path + item.key.name);
                if (v) {
                  this.markText(item.key.start, item.key.end, v.label, 'cm-field', item.key.name);
                  path += item.key.name + '.';
                  vars = v.children || [];
                }
              } else if (item.key?.type === 'literal' && typeof item.key.value === 'string') {
                // data['name'] 形式
                // 查找 + 标记逻辑同上
              } else if (typeof item.key?.value === 'number') {
                // data[0] 形式 — 数组索引
                // 查找 isMember=true 的数组项，继续处理后续属性
              }
            }
          }
        }
        return false;  // 停止遍历此分支
      }
      else if (ast.type === 'variable') {
        // 简单变量引用
        const variable = findTree(variables, item => item.value === ast.name);
        if (variable) {
          this.markText(ast.start, ast.end, variable.label, 'cm-field', ast.name);
        }
        return false;
      }
    });
  } catch (e) {
    // 3. 错误处理 — 在出错行显示 lineWidget
    const reg = /^Unexpected\stoken\s(.+)\sin\s(\d+):(\d+)$/.exec(e.message);
    if (reg) {
      const icon = msg.appendChild(document.createElement('span'));
      icon.innerText = '!!';
      icon.className = 'lint-error-icon';
      msg.appendChild(document.createTextNode(`Unexpected token \`${token}\``));
      msg.className = 'lint-error';
      this.widgets.push(editor.addLineWidget(line - 1, msg, { coverGutter: false, noHScroll: true }));
      this.marks.push(this.markText(from, to, token, 'cm-error-token'));
    }
  }
}
```

#### 3.3.4 markText — DOM 替换标记

```typescript
markText(from, to, label, className = 'cm-func', rawString?) {
  const text = document.createElement('span');
  text.className = className;           // cm-func | cm-field | cm-expression | cm-error-token
  text.innerText = label;              // 显示友好名称
  if (rawString) {
    text.setAttribute('data-tooltip', rawString);   // tooltip 显示原始变量名
    text.setAttribute('data-position', 'bottom');
  }
  return this.editor.markText(from, to, {
    atomic: true,          // 原子标记：不可部分选中/编辑
    replacedWith: text,    // DOM 元素替换原始文本
  });
}
```

**三种标记类型**：
- `cm-func`：函数名标记（如 `IF` → 蓝色高亮）
- `cm-field`：变量/属性标记（如 `data.name` → 显示为 "用户名"）
- `cm-expression`：整个 `${...}` 表达式块标记（模板模式）
- `cm-error-token`：语法错误 token 标记

#### 3.3.5 insertContent — 智能插入

```typescript
insertContent(value, type?) {
  let from = this.editor.getCursor();
  const evalMode = this.evalMode;

  if (type === 'variable') {
    this.editor.replaceSelection(value.key);
    const to = this.editor.getCursor();
    // 模板模式下自动包裹 ${...}
    !evalMode && this.insertBraces(from, to);
  }
  else if (type === 'func') {
    this.editor.replaceSelection(`${value}()`);
    const to = this.editor.getCursor();
    // 光标放到括号内
    this.editor.setCursor({ line: to.line, ch: to.ch - 1 });
    // 模板模式下包裹 ${...}
    if (!evalMode) {
      this.insertBraces(from, to);
      this.editor.setCursor({ line: to.line, ch: to.ch + 1 });
    }
  }
  else if (typeof value === 'string') {
    this.editor.replaceSelection(value);
  }
  this.editor.focus();
}
```

**`insertBraces`** — 在模板模式下为非 `${...}` 内的变量自动插入 `${` 和 `}`：

```typescript
insertBraces(originFrom, originTo) {
  const str = this.editor.getValue();
  const braces = this.computedBracesPosition(str);  // 计算已有 ${...} 位置
  if (!this.checkStrIsInBraces([originFrom.ch, originTo.ch], braces)) {
    // 不在任何 ${...} 内，自动包裹
    this.editor.setCursor(originFrom);
    this.editor.replaceSelection('${');
    this.editor.setCursor({ line: originTo.line, ch: originTo.ch + 2 });
    this.editor.replaceSelection('}');
  }
}
```

#### 3.3.6 autoMarkText 防抖

`autoMarkText` 被包装为防抖函数（250ms trailing），仅在 `blur` 事件时触发完整标记刷新：

```typescript
constructor(editor, cm) {
  this.autoMarkText = debounce(this.autoMarkText.bind(this), 250, {
    leading: false,
    trailing: true,
  });
  editor.on('blur', () => this.autoMarkText());
}
```

**设计意图**：编辑过程中不做标记替换（避免干扰输入），失焦后再标记，显示友好名称。

### 3.4 formula/CodeEditor.tsx — React 组件层

`CodeEditor` 是连接 `CodeMirror.tsx` 和 `FormulaPlugin` 的桥梁组件：

```typescript
interface CodeEditorProps extends ThemeProps {
  readOnly?: boolean;
  singleLine?: boolean;         // 单行模式（禁止换行）
  evalMode?: boolean;           // 表达式模式 vs 模板模式
  autoFocus?: boolean;
  editorTheme?: 'dark' | 'light';
  editorOptions?: any;
  highlightMode?: 'expression' | 'formula';  // 高亮策略
  variables?: VariableItem[];
  functions?: FuncGroup[];
  placeholder?: string;
  editorDidMount?: (cm, editor, plugin: FormulaPlugin) => void;
}
```

**核心实现**：

```typescript
function CodeEditor(props, ref) {
  const pluginRef = useRef<FormulaPlugin>();

  // 工厂函数：确定主题 + 调用 plugin.ts 的 createEditor
  const editorFactory = useCallback((dom, cm) => {
    let theme = editorTheme === 'dark' ? 'base16-dark' : 'idea';
    let options = { autoFocus, indentUnit: 2, lineNumbers: true, lineWrapping: true, theme, placeholder, ...editorOptions };
    if (singleLine) {
      options = { lineNumbers: false, indentWithTabs: false, indentUnit: 4, lineWrapping: false, scrollbarStyle: null, theme, placeholder, ...editorOptions };
    }
    return createEditor(dom, cm, props, options);
  }, []);

  // 编辑器挂载时创建 Plugin 实例
  const onEditorMount = useCallback((cm, editor) => {
    const plugin = (pluginRef.current = new FormulaPlugin(editor, cm));
    plugin.setEvalMode(!!evalMode);
    plugin.setFunctions(functions || []);
    plugin.setVariables(variables || []);
    plugin.setHighlightMode(highlightMode || 'formula');
    editorDidMount?.(cm, editor, plugin);
    plugin.autoMarkText();  // 初始标记
  }, [evalMode, functions, variables]);

  // 变量/函数变化时更新 Plugin 并重新标记
  useEffect(() => {
    plugin.setEvalMode(!!evalMode);
    plugin.setFunctions(functions || []);
    plugin.setVariables(variables || []);
    plugin.autoMarkText();
  }, [evalMode, functions, variables, value]);

  // 暴露命令式 API
  useImperativeHandle(ref, () => ({
    insertContent: (value, type) => pluginRef.current?.insertContent(value, type),
    setValue: (value) => pluginRef.current?.setValue(value),
    getValue: () => pluginRef.current?.getValue(),
    setDisableAutoMark: (value) => pluginRef.current?.setDisableAutoMark(value),
  }));

  return (
    <CodeMirrorEditor
      className={cx('FormulaCodeEditor', className, singleLine ? 'FormulaCodeEditor--singleLine' : '')}
      value={value}
      onChange={onChange}
      editorFactory={editorFactory}
      editorDidMount={onEditorMount}
      onFocus={onFocus}
      onBlur={onBlur}
      readOnly={readOnly}
    />
  );
}
```

**单行模式**：通过 `beforeChange` 拦截换行符输入和粘贴：

```typescript
const onEditorBeforeChange = useCallback((cm, event) => {
  // 拦截回车输入
  if (event.origin === '+input' && event.text.join('') === '') {
    return event.cancel();
  }
  // 粘贴时将换行替换为空格
  if (event.origin === 'paste' && event.text.length > 1) {
    return event.update(null, null, [event.text.join(' ')]);
  }
}, []);
```

### 3.5 formula/Editor.tsx — 公式编辑器完整 UI

三栏布局 + 功能面板：

```
┌──────────┬────────────────────────────────┬──────────┐
│ 函数列表  │  编辑器头部                      │ 变量列表  │
│          │  [运行面板开关] [源码模式开关]      │          │
│ FuncList  │  ┌──────────────────────────┐  │Variable  │
│          │  │   CodeEditor (CM5)        │  │  List    │
│          │  │                           │  │          │
│          │  └──────────────────────────┘  │          │
│          │  ┌──────────────────────────┐  │          │
│          │  │  运行面板 (可选)            │  │          │
│          │  │  JSON上下文 → 执行结果     │  │          │
│          │  └──────────────────────────┘  │          │
└──────────┴────────────────────────────────┴──────────┘
```

**关键功能**：

1. **函数列表** (`FuncList`)：从 `amis-formula` 的 `getFunctionsDoc()` 加载内置函数，支持自定义扩展
2. **变量列表** (`VariableList`)：树形/标签模式，支持 `selfVariableName` 防循环引用
3. **源码模式**：`isCodeMode` 开关 — 关闭时变量/函数显示友好名（`autoMark`），开启时显示原始代码
4. **运行面板**：输入 JSON 上下文，实时执行公式显示结果（`resolveVariableAndFilterForAsync`）
5. **运行面板中的上下文编辑器**：使用 **Monaco Editor**（language='json'），展示双编辑器共存

### 3.6 formula/Input.tsx — 内联公式输入框

`FormulaInput` 是 `FormulaPicker` 中嵌入的输入控件。它**根据值类型动态切换输入控件**：

```typescript
// 判断是否为表达式
const isExpr = isExpression(cmptValue);  // /^[\s\S]*\$\{.*\}[\s\S]*$/.test(value)

if (!isExpr && schemaType === 'number') return <NumberInput .../>;
if (!isExpr && schemaType === 'date') return <DatePicker .../>;
if (!isExpr && schemaType === 'select') return <Select .../>;
// ... 其他类型

// 默认：文本输入框 + 内嵌 CodeEditor（单行模式）
return (
  <InputBox
    inputRender={({ value, onChange, onFocus, onBlur, placeholder }) => (
      <CodeEditor singleLine value={value} onChange={onChange} functions={functions} variables={variables} evalMode={evalMode} placeholder={placeholder} />
    )}
  />
);
```

**设计意图**：非表达式值用原生控件（NumberInput、DatePicker 等），表达式值自动切换到 CodeEditor。

### 3.7 formula/Picker.tsx — 公式选择器弹窗

`FormulaPicker` 是最外层组件，整合了 `FormulaInput` + `FormulaEditor` 弹窗：

**三种显示模式**：
- `button`：纯按钮，点击弹窗
- `input-button`：输入框 + 按钮（默认）
- `input-group`：输入框 + 图标

**弹窗内容**：Modal（桌面）或 PopUp（移动端）内嵌 `FormulaEditor`。

**变量数据源支持**：
```typescript
variables?: VariableItem[] | string | ((props: any) => VariableItem[]);
// - 直接数组
// - 表达式字符串（运行时解析）
// - 异步函数（延迟加载）
```

**混合模式** (`mixedMode`)：
- 允许用户输入普通文本或 `${表达式}`
- 自动检测值是否为表达式，如果是则提取 `${` `}` 内部内容给编辑器
- 确认时根据 AST 类型决定是否包裹 `${...}`

### 3.8 amis-formula 解析器

amis-formula 提供完整的 **Lexer → Parser → Evaluator** 管线。

#### Lexer（词法分析器）

文件：`packages/amis-formula/src/lexer.ts`

手写状态机驱动的词法分析器，主要状态：

| 状态 | 含义 |
|------|------|
| `START` | 初始状态，扫描普通文本 |
| `SCRIPT` | 进入 `${...}` 内部 |
| `EXPRESSION` | 纯表达式模式（evalMode） |
| `BLOCK` | `{...}` 块 |
| `Template` | 模板字符串 `` `...` `` |
| `Filter` | 管道过滤器 `\| filter` |

Token 类型：

| Token | 含义 |
|-------|------|
| `BooleanLiteral` | `true` / `false` |
| `RAW` | 普通文本（模板模式下的非表达式部分） |
| `Variable` | 旧式 `$varName` 变量 |
| `OpenScript` / `CloseScript` | `${` / `}` |
| `Identifier` | 标识符 |
| `NumericLiteral` / `StringLiteral` | 数字/字符串字面量 |
| `Punctuator` | 运算符（`===`, `&&`, `.` 等） |
| `OpenFilter` | 管道符 `\|`（过滤器） |
| `TemplateRaw` / `TemplateLeftBrace` / `TemplateRightBrace` | 模板字符串内部 token |

#### Parser（解析器）

文件：`packages/amis-formula/src/parser.ts`

递归下降解析器，支持的 AST 节点类型：

| AST 类型 | 含义 | 示例 |
|----------|------|------|
| `variable` | 变量引用 | `data` |
| `getter` | 属性访问 | `data.name`, `data['name']`, `items[0]` |
| `func_call` | 函数调用 | `IF(a, b, c)` |
| `filter` | 管道过滤器 | `${value \| html}` |
| `conditional` | 三元表达式 | `a ? b : c` |
| `binary` | 二元运算 | `a + b`, `a && b` |
| `unary` | 一元运算 | `!a`, `-a` |
| `template` | 模板字符串 | `` `hello ${name}` `` |
| `object` | 对象字面量 | `{a: 1, b: 2}` |
| `array` | 数组字面量 | `[1, 2, 3]` |
| `script` | `${...}` 包裹 | `${expression}` |
| `document` | 文档根节点 | 多个 script/raw 的容器 |
| `ns-variable` | 命名空间变量 | `window:xxx`, `cookie:xxx` |

**关键设计**：所有 AST 节点都携带 `start/end` 位置信息（`{index, line, column}`），这是 `autoMark` 标记高亮的基础。

**解析模式**（由 options 控制）：
- `evalMode=true`：输入直接作为表达式解析
- `evalMode=false`：输入作为模板解析（`${...}` 内为表达式，外部为普通文本）
- `variableMode=true`：仅解析变量路径（`xxx.yyy.zzz`）

---

## 四、CodeMirror 5 → CodeMirror 6 迁移对照

| 功能 | CM5 实现 | CM6 对应方案 |
|------|---------|-------------|
| **语法模式定义** | `cm.defineMode()` + `cm.multiplexingMode()` | Lezer grammar 文件（`@lezer/generator`），或复用 `@codemirror/lang-javascript` |
| **模板多路复用** | `cm.multiplexingMode(base, {open, close, mode})` | `@lezer/html` 的 `parseMixed` 或自定义 `StreamParser` |
| **文本标记替换** | `editor.markText(from, to, {atomic, replacedWith})` | `Decoration.replace({widget, atomic})` + `WidgetType` |
| **行内小部件** | `editor.addLineWidget()` | `Gutter` 扩展或 `BlockType` 装饰 |
| **错误 lint** | `addLineWidget` + 自定义 DOM | `@codemirror/lint` 的 `linter()` 扩展 |
| **事件监听** | `editor.on('change'/'blur'/'focus')` | `EditorView.updateListener` / `focusChangeEffect` |
| **值同步** | `doc.setValue()` + `doc.setCursor()` | `view.dispatch({changes: ...})` |
| **光标操作** | `editor.setCursor()` / `editor.getCursor()` | `view.dispatch({selection: ...})` |
| **文本替换** | `editor.replaceSelection()` | `view.dispatch(view.state.replaceSelection(...))` |
| **自动补全** | 无内置（靠侧边面板） | `@codemirror/autocomplete` 内置补全弹出菜单 |
| **配置更新** | `editor.setOption()` | `StateEffect.reconfigure` / `Compartment` |
| **只读模式** | `readOnly: 'nocursor'` | `EditorState.readOnly` facet |
| **主题** | CM5 主题字符串（'idea'/'base16-dark'） | `@codemirror/theme-one-dark` 或自定义 `Theme` |
| **placeholder** | `addon/display/placeholder` | `@codemirror/view` 的 placeholder 扩展 |

### 推荐 CM6 包依赖

```json
{
  "dependencies": {
    "@codemirror/state": "^6.x",
    "@codemirror/view": "^6.x",
    "@codemirror/language": "^6.x",
    "@codemirror/autocomplete": "^6.x",
    "@codemirror/commands": "^6.x",
    "@codemirror/lint": "^6.x",
    "@codemirror/lang-javascript": "^6.x",
    "@codemirror/lang-sql": "^6.x",
    "@codemirror/lang-json": "^6.x",
    "@codemirror/theme-one-dark": "^6.x",
    "@lezer/generator": "^1.x",
    "@lezer/lr": "^1.x",
    "@lezer/highlight": "^1.x"
  }
}
```

---

## 五、基于 CodeMirror 6 的实现方案

### 5.1 表达式编辑器

#### 5.1.1 语法高亮

**方案 A（推荐）**：复用 `@codemirror/lang-javascript` + 自定义高亮样式

```typescript
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const expressionHighlightStyle = HighlightStyle.define([
  { tag: tags.variableName, class: 'cm-expression-var' },
  { tag: tags.propertyName, class: 'cm-expression-prop' },
  { tag: tags.function(tags.variableName), class: 'cm-expression-func' },
  { tag: tags.number, class: 'cm-expression-num' },
  { tag: tags.string, class: 'cm-expression-str' },
]);

const expressionLanguage = javascript({ expression: true });
```

**方案 B**：JS 子集需要更精细控制时，用 Lezer grammar 自定义：

```
// expression.grammar
@top Expression { expression }
expression { unaryExpr }
unaryExpr { PostfixExpr | "!" unaryExpr | "-" unaryExpr }
PostfixExpr { PrimaryExpr ( MemberAccess )* }
MemberAccess { "." !identifier | "[" Expression "]" }
PrimaryExpr { Number | String | Boolean | Identifier | "(" Expression ")" | FuncCall }
FuncCall { Identifier "(" ArgList? ")" }
ArgList { Expression ("," Expression)* }
@skip { space }
```

#### 5.1.2 上下文感知自动补全

核心功能：输入 `data.` 后提示 `data` 的子属性。

```typescript
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';

function buildVariableCompletions(variables: VariableItem[]) {
  return function variableCompletion(context: CompletionContext) {
    // 匹配光标前的标识符链（含 . 和 [] 访问）
    const word = context.matchBefore(/[\w.\u4e00-\u9fa5\[\]'"]+$/);
    if (!word) return null;

    const text = word.text;
    const parts = text.split(/\.|\[/);

    // 在变量树中定位到当前层级
    let currentVars = variables;
    let resolvedPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i].replace(/['"\]]/g, '');
      const found = currentVars.find(v => {
        const vName = v.value?.split('.').pop();
        return vName === part;
      });
      if (found?.children) {
        currentVars = found.children;
        resolvedPath = found.value + '.';
      } else return null;
    }

    // 补全当前层级的属性
    const lastPart = parts[parts.length - 1].replace(/['"\]]/g, '');
    return {
      from: word.from + text.lastIndexOf(lastPart),
      options: currentVars
        .filter(v => v.label?.toLowerCase().startsWith(lastPart.toLowerCase()))
        .map(v => ({
          label: v.label,
          detail: v.type,
          apply: v.value?.split('.').pop() || v.label,
          type: v.children ? 'variable' : 'property' as any,
        })),
    };
  };
}
```

#### 5.1.3 变量/函数标记（Decoration 替代 markText）

```typescript
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

class VariableWidget extends WidgetType {
  constructor(readonly label: string, readonly raw: string) { super(); }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-field';
    span.textContent = this.label;
    span.title = this.raw;
    return span;
  }
  ignoreEvent() { return false; }
}

const formulaMarkerPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet = Decoration.none;

  constructor(view: EditorView) {
    this.decorations = this.build(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.build(update.view);
    }
  }

  build(view: EditorView): DecorationSet {
    const doc = view.state.doc.toString();
    const builder = new RangeSetBuilder<Decoration>();
    try {
      const ast = parse(doc, { evalMode: true });
      traverseAst(ast, (node) => {
        // 同 amis plugin.ts 的逻辑，使用 AST position 映射到 CM6 position
        if (node.type === 'variable') {
          const from = node.start.index;
          const to = node.end.index;
          const varDef = findVariable(variables, node.name);
          if (varDef) {
            builder.add(from, to, Decoration.replace({
              widget: new VariableWidget(varDef.label, varDef.value),
              atomic: true,
            }));
          }
        }
        // ... getter chains, func_calls 等
      });
    } catch (e) { /* 语法错误忽略 */ }
    return builder.finish();
  }
}, { decorations: v => v.decorations });
```

#### 5.1.4 错误诊断

```typescript
import { linter, Diagnostic } from '@codemirror/lint';

const formulaLinter = linter((view): Diagnostic[] => {
  const doc = view.state.doc.toString();
  const diagnostics: Diagnostic[] = [];
  try {
    parse(doc, { evalMode: true });
  } catch (e) {
    const match = /^Unexpected token (.+) in (\d+):(\d+)$/.exec(e.message);
    if (match) {
      const line = view.state.doc.line(parseInt(match[2]));
      const col = parseInt(match[3]) - 1;
      diagnostics.push({
        from: line.from + col,
        to: line.from + col + match[1].length,
        severity: 'error',
        message: e.message,
      });
    }
  }
  return diagnostics;
});
```

### 5.2 SQL 编辑器

amis 没有实现 SQL 编辑器。以下是基于 `@codemirror/lang-sql` 的方案：

```typescript
import { sql, SQLDialect } from '@codemirror/lang-sql';
import { autocompletion, CompletionContext } from '@codemirror/autocomplete';

interface TableSchema {
  name: string;
  alias?: string;
  columns: { name: string; type: string; description?: string }[];
}

// 解析 SQL 中已输入的表别名
function parseTableAliases(sql: string, tables: TableSchema[]): Map<string, TableSchema> {
  const aliasMap = new Map<string, TableSchema>();
  const fromRegex = /(?:FROM|JOIN)\s+(\w+)(?:\s+(?:AS\s+)?(\w+))?/gi;
  let match;
  while ((match = fromRegex.exec(sql)) !== null) {
    const table = tables.find(t => t.name === match[1]);
    if (table) aliasMap.set(match[2] || match[1], table);
  }
  return aliasMap;
}

function sqlCompletionSource(schemas: TableSchema[]) {
  return function(context: CompletionContext) {
    const doc = context.state.doc.toString();
    const textBefore = doc.slice(0, context.pos);
    const aliasMap = parseTableAliases(textBefore, schemas);

    // 检测 "alias." 模式 → 补全列名
    const dotMatch = textBefore.match(/(\w+)\.\w*$/);
    if (dotMatch) {
      const table = aliasMap.get(dotMatch[1]);
      if (table) {
        const partial = textBefore.slice(textBefore.lastIndexOf('.') + 1);
        return {
          from: context.pos - partial.length,
          options: table.columns
            .filter(c => c.name.toLowerCase().startsWith(partial.toLowerCase()))
            .map(col => ({ label: col.name, detail: col.type, type: 'property' as any })),
        };
      }
    }

    // 否则补全表名、别名、关键字
    const word = context.matchBefore(/\w+/);
    if (!word) return null;

    return {
      from: word.from,
      options: [
        ...schemas.map(t => ({ label: t.name, type: 'type' as any })),
        ...[...aliasMap.entries()].map(([alias, table]) => ({
          label: alias, detail: `alias for ${table.name}`, type: 'variable' as any,
        })),
        ...['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'AS', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'SET', 'INTO', 'VALUES', 'TABLE', 'INDEX']
          .map(kw => ({ label: kw, type: 'keyword' as any })),
      ],
    };
  };
}

function createSQLEditor(schemas: TableSchema[]) {
  return [
    sql({ dialect: SQLDialect.define({ keywords: '...' }) }),
    autocompletion({ override: [sqlCompletionSource(schemas)] }),
  ];
}
```

### 5.3 React Hook 封装

```typescript
import { useEffect, useRef } from 'react';
import { EditorState, StateEffect, Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

const dynamicExtensions = new Compartment();

function useCodeMirror({
  value, onChange, extensions = [], placeholder, readOnly, elementRef,
}: {
  value?: string;
  onChange?: (value: string) => void;
  extensions?: any[];
  placeholder?: string;
  readOnly?: boolean;
  elementRef: React.RefObject<HTMLDivElement>;
}) {
  const viewRef = useRef<EditorView>();

  useEffect(() => {
    if (!elementRef.current) return;

    const state = EditorState.create({
      doc: value ?? '',
      extensions: [
        dynamicExtensions.of(extensions),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange?.(update.state.doc.toString());
        }),
        EditorState.readOnly.of(readOnly ?? false),
        // placeholder, keymap, history, etc.
      ],
    });

    viewRef.current = new EditorView({ state, parent: elementRef.current });
    return () => viewRef.current?.destroy();
  }, []); // 仅 mount 时创建

  // 外部 value → 编辑器同步
  useEffect(() => {
    const view = viewRef.current;
    if (view && value !== undefined && value !== view.state.doc.toString()) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        selection: { anchor: Math.min(view.state.selection.main.anchor, value.length) },
      });
    }
  }, [value]);

  // extensions 变化 → 重新配置
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: dynamicExtensions.reconfigure(extensions),
    });
  }, [extensions]);

  return viewRef;
}
```

---

## 六、总结

### amis 设计亮点

1. **AST 驱动的标记系统**：利用 parser 生成精确的位置信息，实现了变量友好名替换、函数高亮、错误定位
2. **双模式编辑**：`evalMode` 纯表达式 + 模板模式 `${...}`，通过 `multiplexingMode` 实现语法切换
3. **防抖标记**：编辑中不干扰，失焦后标记友好名
4. **智能插入**：模板模式下自动包裹 `${...}`，函数插入后光标定位到括号内
5. **类型感知输入**：`FormulaInput` 根据值类型动态切换输入控件
6. **运行面板**：内置表达式调试能力

### amis 设计不足（CM6 可改进）

1. **无内联补全**：变量/函数选择完全依赖侧边面板，无 CodeMirror 内 autocomplete
2. **CM5 限制**：`markText` 的原子标记在编辑时可能导致意外行为
3. **无 SQL 支持**：完全缺失 SQL 编辑能力
4. **全局状态**：`modeRegisted` 全局变量，多次实例可能冲突
5. **Class 组件**：React Class 组件生命周期管理复杂
