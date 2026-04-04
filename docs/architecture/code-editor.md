# CodeMirror 6 代码编辑器设计文档

## Purpose

本文档定义基于 CodeMirror 6 的 `code-editor` 渲染器的 JSON Schema 设计，包括语言模式选择、只读控制、语法补全配置等。

本编辑器用于两个核心场景：
1. **表达式编辑器**：JavaScript 子集，支持变量/属性/方法补全
2. **SQL 编辑器**：基于表名和别名提供字段补全

## Current Code Anchors

实现阶段参考：
- `packages/flux-renderers-form/src/renderers/` — 表单控件渲染器
- `packages/flux-core/src/types.ts` — `BaseSchema` 及核心类型
- `docs/analysis/amis-editor-rearchitecture-reResearch.md` — amis 编辑器架构调研

---

## 一、设计目标

### 对比 amis 的改进

| amis 问题 | Flux 改进 |
|----------|----------|
| 无内联补全 — 变量/函数选择完全依赖侧边面板 | CM6 `@codemirror/autocomplete` 原生弹出补全 |
| 无 SQL 编辑器 | 基于 `@codemirror/lang-sql` + 自定义 schema 补全 |
| `modeRegisted` 全局可变状态 | 无全局状态，每次实例独立创建 |
| `evalMode` 布尔值混淆（表达式 vs 模板） | 明确的 `mode` 字段：`'expression' | 'template' | 'readonly'` |
| Class 组件 + 复杂生命周期 | React Hooks + `useCodeMirror` |
| FormulaPlugin 混合职责（高亮 + 插入 + 验证） | CM6 Extension 拆分：补全源、装饰器、linter 各自独立 |
| `markText` 原子标记编辑时干扰 | CM6 `Decoration.widget` + 按需启用（仅在 `readonly` 或失焦时） |

### 设计原则

1. **Schema 驱动**：编辑器行为完全由 JSON 配置描述，无需写代码
2. **关注点分离**：语言、补全、样式各自独立配置
3. **渐进增强**：最小配置即可工作，高级功能按需开启
4. **框架无关核心**：CM6 逻辑不依赖 React，通过 Hook 桥接

---

## 二、JSON Schema 定义

### 2.1 CodeEditorSchema

```typescript
interface CodeEditorSchema extends BaseSchema {
  type: 'code-editor';

  // --- 必填：语言模式 ---
  language: EditorLanguage;

  // --- 编辑模式 ---
  mode?: EditorMode;

  // --- 值 ---
  value?: string;

  // --- 占位提示 ---
  placeholder?: string;

  // --- 尺寸 ---
  width?: number | string;
  height?: number | string;

  // --- 行号 ---
  lineNumbers?: boolean;

  // --- 折叠 ---
  folding?: boolean;

  // --- 自动高度 ---
  autoHeight?: boolean;

  // --- 全屏 ---
  allowFullscreen?: boolean;

  // --- 语言特有配置 ---
  expressionConfig?: ExpressionEditorConfig;
  sqlConfig?: SQLEditorConfig;

  // --- 主题 ---
  editorTheme?: 'light' | 'dark';

  // --- 原生选项透传 ---
  options?: Record<string, unknown>;

  // --- 事件 ---
  onChange?: string;
  onFocus?: string;
  onBlur?: string;
}

type EditorLanguage =
  | 'expression'       // 表达式（JS 子集，变量/函数补全）
  | 'sql'              // SQL
  | 'json'             // JSON
  | 'javascript'       // 完整 JavaScript
  | 'typescript'       // TypeScript
  | 'html'             // HTML
  | 'css'              // CSS
  | 'plaintext';       // 纯文本（无语法高亮）

type EditorMode =
  | 'expression'       // 纯表达式模式：整个内容是一个表达式
  | 'template'         // 模板模式：${...} 内嵌表达式，外部为普通文本
  | 'code';            // 代码模式：完整代码编辑（默认）
```

### 2.2 字段说明

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `language` | `EditorLanguage` | — (必填) | 激活对应的 CM6 语言扩展和补全策略 |
| `mode` | `EditorMode` | `'code'` | 仅 `language: 'expression'` 时有意义 |
| `value` | `string` | `''` | 编辑器初始值，支持表达式绑定 |
| `placeholder` | `string` | `''` | 空内容时的提示文字 |
| `width` | `number \| string` | `'100%'` | 编辑器宽度 |
| `height` | `number \| string` | 语言相关 | 编辑器高度（表达式默认 `'auto'`，其他默认 `300`） |
| `lineNumbers` | `boolean` | `language !== 'expression'` | 是否显示行号 |
| `folding` | `boolean` | `false` | 是否启用代码折叠 |
| `autoHeight` | `boolean` | `language === 'expression'` | 自动高度（根据内容调整） |
| `allowFullscreen` | `boolean` | `false` | 允许全屏编辑 |
| `expressionConfig` | `ExpressionEditorConfig` | — | 表达式编辑器配置 |
| `sqlConfig` | `SQLEditorConfig` | — | SQL 编辑器配置 |
| `editorTheme` | `'light' \| 'dark'` | `'light'` | 编辑器主题 |
| `options` | `Record<string, unknown>` | `{}` | CM6 原生扩展选项透传 |
| `onChange` | `string` | — | 值变化时触发的动作 |
| `onFocus` | `string` | — | 获得焦点时触发的动作 |
| `onBlur` | `string` | — | 失去焦点时触发的动作 |

### 2.3 与 BaseSchema 的交互

`BaseSchema` 提供的通用字段行为：

| BaseSchema 字段 | 在 code-editor 中的语义 |
|----------------|----------------------|
| `readOnly` | 编辑器只读模式（CM6 `EditorState.readOnly`） |
| `visible` / `hidden` | 控制编辑器可见性 |
| `disabled` | 等同于 `readOnly`，且禁用焦点 |
| `className` | 附加到编辑器容器 |
| `label` | 通过 FieldFrame 显示标签 |
| `validateOn` | 校验触发时机（`'change'` / `'blur'` / `'submit'`） |

---

## 三、表达式编辑器配置

### 3.1 ExpressionEditorConfig

```typescript
interface ExpressionEditorConfig {
  // --- 变量源 ---
  variables?: VariableItem[] | VariableSourceRef;

  // --- 函数源 ---
  functions?: FuncGroup[] | FuncSourceRef;

  // --- 变量友好名标记 ---
  showFriendlyNames?: boolean;

  // --- 语法校验 ---
  lint?: boolean | ExpressionLintConfig;

  // --- 函数文档 ---
  showFunctionDocs?: boolean;
}
```

### 3.2 VariableItem（变量数据模型）

```typescript
interface VariableItem {
  label: string;
  value: string;
  type?: string;
  children?: VariableItem[];
  description?: string;
  tags?: string[];
}
```

**示例**：

```json
{
  "variables": [
    {
      "label": "用户名",
      "value": "data.username",
      "type": "string"
    },
    {
      "label": "订单",
      "value": "data.order",
      "type": "object",
      "children": [
        { "label": "订单号", "value": "data.order.id", "type": "string" },
        { "label": "金额", "value": "data.order.amount", "type": "number" },
        {
          "label": "商品列表",
          "value": "data.order.items",
          "type": "array",
          "children": [
            { "label": "商品名", "value": "data.order.items.name", "type": "string" },
            { "label": "单价", "value": "data.order.items.price", "type": "number" }
          ]
        }
      ]
    },
    {
      "label": "当前角色",
      "value": "role",
      "type": "string",
      "tags": ["system"]
    }
  ]
}
```

### 3.3 FuncGroup（函数数据模型）

```typescript
interface FuncGroup {
  groupName: string;
  items: FuncItem[];
}

interface FuncItem {
  name: string;
  description?: string;
  example?: string;
  returnType?: string;
  params?: FuncParam[];
}

interface FuncParam {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
}
```

**示例**：

```json
{
  "functions": [
    {
      "groupName": "逻辑函数",
      "items": [
        {
          "name": "IF",
          "description": "条件判断",
          "example": "IF(condition, trueValue, falseValue)",
          "returnType": "any",
          "params": [
            { "name": "condition", "type": "boolean", "required": true },
            { "name": "trueValue", "required": true },
            { "name": "falseValue", "required": true }
          ]
        }
      ]
    },
    {
      "groupName": "文本函数",
      "items": [
        {
          "name": "CONCAT",
          "description": "连接多个字符串",
          "example": "CONCAT(str1, str2, ...)",
          "returnType": "string"
        },
        {
          "name": "UPPER",
          "description": "转大写",
          "example": "UPPER(str)",
          "returnType": "string",
          "params": [
            { "name": "str", "type": "string", "required": true }
          ]
        }
      ]
    }
  ]
}
```

### 3.4 变量源引用

变量数据除了直接内联，还支持通过数据源引用动态获取：

```typescript
type VariableSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiObject;
  dataPath?: string;
};

type FuncSourceRef = {
  source: 'builtin' | 'api';
  builtinSet?: string[];
  api?: ApiObject;
  dataPath?: string;
};
```

**示例 — 从 scope 取变量**：

```json
{
  "expressionConfig": {
    "variables": {
      "source": "scope",
      "scopePath": "editorVariables"
    }
  }
}
```

运行时从当前 scope 的 `editorVariables` 路径读取 `VariableItem[]`。

**示例 — 从 API 获取函数列表**：

```json
{
  "expressionConfig": {
    "functions": {
      "source": "api",
      "api": {
        "url": "/api/editor/functions",
        "method": "GET"
      },
      "dataPath": "data.functions"
    }
  }
}
```

### 3.5 ExpressionLintConfig

```typescript
interface ExpressionLintConfig {
  enabled: boolean;
  showOnEdit?: boolean;
  debounceMs?: number;
  customRules?: ExpressionLintRule[];
}

interface ExpressionLintRule {
  name: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  validate: string;
}
```

---

## 四、SQL 编辑器配置

### 4.1 SQLEditorConfig

```typescript
interface SQLEditorConfig {
  // --- 数据库 schema ---
  tables?: TableSchema[] | SQLSchemaSourceRef;

  // --- SQL 方言 ---
  dialect?: SQLDialect;

  // --- 关键字补全 ---
  keywords?: boolean;

  // --- 自动大写关键字 ---
  uppercaseKeywords?: boolean;

  // --- SQL 格式化 (Phase 1) ---
  format?: boolean | SQLFormatConfig;

  // --- 代码片段模板 (Phase 2) ---
  snippets?: CodeSnippetTemplate[];

  // --- 变量面板 (Phase 3) ---
  variablePanel?: VariablePanelConfig;

  // --- SQL 执行 + 结果预览 (Phase 4) ---
  execution?: SQLExecutionConfig;
}

interface SQLFormatConfig {
  enabled: boolean;
  language?: 'sql' | 'mysql' | 'postgresql' | 'mariadb' | 'tsql' | 'plsql';
  tabWidth?: number;
  keywordCase?: 'upper' | 'lower' | 'preserve';
  indentStyle?: 'standard' | 'tabularLeft' | 'tabularRight';
  logicalOperatorNewline?: 'before' | 'after';
}

interface CodeSnippetTemplate {
  name: string;
  template: string;
  description?: string;
  icon?: string;
}

interface VariablePanelConfig {
  enabled: boolean;
  variables?: VariableItem[] | VariableSourceRef;
  insertTemplate?: string;
}

interface SQLExecutionConfig {
  enabled: boolean;
  onExecute?: string | ApiObject;
  resultPath?: string;
  params?: Record<string, string>;
  showPreview?: boolean;
}

type SQLDialect = 'standard' | 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
```

### 4.2 TableSchema（表结构数据模型）

```typescript
interface TableSchema {
  name: string;
  alias?: string;
  description?: string;
  columns: ColumnSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  defaultValue?: string;
}
```

**示例**：

```json
{
  "sqlConfig": {
    "tables": [
      {
        "name": "users",
        "description": "用户表",
        "columns": [
          { "name": "id", "type": "BIGINT", "description": "主键" },
          { "name": "username", "type": "VARCHAR(64)", "description": "用户名" },
          { "name": "email", "type": "VARCHAR(128)", "nullable": true },
          { "name": "role", "type": "VARCHAR(32)", "defaultValue": "'user'" }
        ]
      },
      {
        "name": "orders",
        "alias": "o",
        "description": "订单表",
        "columns": [
          { "name": "id", "type": "BIGINT" },
          { "name": "user_id", "type": "BIGINT" },
          { "name": "amount", "type": "DECIMAL(10,2)" },
          { "name": "status", "type": "VARCHAR(16)" }
        ]
      }
    ],
    "dialect": "mysql",
    "uppercaseKeywords": true
  }
}
```

### 4.3 SQL Schema 数据源

```typescript
type SQLSchemaSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiObject;
  dataPath?: string;
};
```

**示例 — 动态获取表结构**：

```json
{
  "sqlConfig": {
    "tables": {
      "source": "api",
      "api": {
        "url": "/api/editor/sql-schema",
        "method": "GET",
        "params": { "dataSourceId": "${dataSourceId}" }
      },
      "dataPath": "data.tables"
    },
    "dialect": "postgresql"
  }
}
```

---

## 五、JSON Schema 示例

### 5.1 表单内嵌表达式编辑器（最简配置）

```json
{
  "type": "form",
  "body": [
    {
      "type": "code-editor",
      "name": "expression",
      "label": "过滤条件",
      "language": "expression",
      "mode": "expression",
      "placeholder": "输入过滤表达式，如 data.age > 18",
      "expressionConfig": {
        "variables": [
          { "label": "姓名", "value": "data.name", "type": "string" },
          { "label": "年龄", "value": "data.age", "type": "number" },
          { "label": "角色", "value": "data.role", "type": "string" }
        ],
        "lint": true
      }
    }
  ]
}
```

### 5.2 模板模式表达式编辑器

```json
{
  "type": "code-editor",
  "name": "template",
  "label": "消息模板",
  "language": "expression",
  "mode": "template",
  "placeholder": "输入文本，用 ${...} 插入变量",
  "expressionConfig": {
    "variables": {
      "source": "scope",
      "scopePath": "templateVariables"
    },
    "showFriendlyNames": true,
    "lint": true
  }
}
```

### 5.3 SQL 编辑器

```json
{
  "type": "code-editor",
  "name": "sql",
  "label": "SQL 查询",
  "language": "sql",
  "height": 400,
  "lineNumbers": true,
  "sqlConfig": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "type": "BIGINT" },
          { "name": "name", "type": "VARCHAR(64)" },
          { "name": "email", "type": "VARCHAR(128)" }
        ]
      }
    ],
    "dialect": "mysql",
    "uppercaseKeywords": true
  }
}
```

### 5.4 SQL 编辑器增强（格式化 + 代码片段 + 变量面板 + 执行预览）

```json
{
  "type": "code-editor",
  "name": "sqlEnhanced",
  "label": "SQL 查询（增强版）",
  "language": "sql",
  "height": 400,
  "lineNumbers": true,
  "sqlConfig": {
    "tables": [
      {
        "name": "users",
        "columns": [
          { "name": "id", "type": "BIGINT" },
          { "name": "username", "type": "VARCHAR(64)" }
        ]
      }
    ],
    "dialect": "mysql",
    "uppercaseKeywords": true,
    "format": {
      "enabled": true,
      "keywordCase": "upper",
      "tabWidth": 2
    },
    "snippets": [
      {
        "name": "IF 条件",
        "template": "<if test=\"${condition}\">\n  AND ${column} = #{${param}}\n</if>",
        "description": "MyBatis 动态 SQL 条件块"
      },
      {
        "name": "FOREACH 循环",
        "template": "<foreach collection=\"${list}\" item=\"${item}\" open=\"(\" separator=\",\" close=\")\">\n  #{${item}}\n</foreach>"
      }
    ],
    "variablePanel": {
      "enabled": true,
      "variables": [
        { "label": "用户ID", "value": "userId", "type": "number" },
        { "label": "用户名", "value": "userName", "type": "string" }
      ],
      "insertTemplate": "<if test=\"${value} != null\">\n  AND ${value} = #{${value}}\n</if>"
    },
    "execution": {
      "enabled": true,
      "onExecute": {
        "url": "/api/report/execSql",
        "method": "POST",
        "data": { "tplSql": "${value}" }
      },
      "resultPath": "responseData",
      "showPreview": true
    }
  }
}
```

### 5.5 只读代码查看器

```json
{
  "type": "code-editor",
  "name": "generatedCode",
  "label": "生成的代码",
  "language": "javascript",
  "readOnly": true,
  "lineNumbers": true,
  "folding": true,
  "editorTheme": "dark"
}
```

### 5.6 JSON Schema 编辑器

```json
{
  "type": "code-editor",
  "name": "schema",
  "label": "Schema 定义",
  "language": "json",
  "height": 500,
  "lineNumbers": true,
  "folding": true,
  "allowFullscreen": true
}
```

---

## 六、渲染器定义

### 6.1 RendererRegistration

```typescript
const codeEditorDefinition: RendererDefinition<CodeEditorSchema> = {
  type: 'code-editor',
  component: CodeEditorRenderer,
  wrap: true,                              // 使用 FieldFrame 包裹
  fields: [
    { key: 'value', kind: 'prop' },
    { key: 'language', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'placeholder', kind: 'prop' },
    { key: 'expressionConfig', kind: 'prop' },
    { key: 'sqlConfig', kind: 'prop' },
    { key: 'editorTheme', kind: 'prop' },
    { key: 'lineNumbers', kind: 'prop' },
    { key: 'folding', kind: 'prop' },
    { key: 'autoHeight', kind: 'prop' },
    { key: 'allowFullscreen', kind: 'prop' },
    { key: 'options', kind: 'prop' },
    { key: 'height', kind: 'prop' },
    { key: 'width', kind: 'prop' },
    { key: 'onChange', kind: 'event' },
    { key: 'onFocus', kind: 'event' },
    { key: 'onBlur', kind: 'event' },
  ],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    collectRules(schema) {
      const rules: ValidationRule[] = [];
      if (schema.required) {
        rules.push({ kind: 'required', message: `${schema.label || '代码'}不能为空` });
      }
      return rules;
    },
  },
};
```

### 6.2 组件接收的 Props

`CodeEditorRenderer` 通过 `RendererComponentProps<CodeEditorSchema>` 接收：

```typescript
// props.props 中可用的属性（经过编译和表达式求值后）
interface CodeEditorResolvedProps {
  language: EditorLanguage;
  mode: EditorMode;
  value: string;
  placeholder: string;
  readOnly: boolean;
  expressionConfig?: ExpressionEditorConfig;
  sqlConfig?: SQLEditorConfig;
  editorTheme: 'light' | 'dark';
  lineNumbers: boolean;
  folding: boolean;
  autoHeight: boolean;
  allowFullscreen: boolean;
  height: number | string;
  width: number | string;
  options: Record<string, unknown>;
}
```

---

## 七、CM6 Extension 架构

### 7.1 Extension 组合策略

每种 `language` 对应一组 CM6 Extension：

```
code-editor
├── Base Extensions (所有语言共享)
│   ├── history()
│   ├── keymap.of([indentWithTab])
│   ├── EditorView.lineWrapping (if autoHeight)
│   └── placeholder()
│
├── Language Extensions (language 决定)
│   ├── 'expression' → javascript({ expression: true }) + expressionCompletions + expressionLinter
│   ├── 'sql'        → sql() + sqlCompletions
│   ├── 'json'       → json() + jsonLinter
│   ├── 'javascript' → javascript()
│   ├── 'typescript' → javascript({ typescript: true })
│   ├── 'html'       → html()
│   ├── 'css'        → css()
│   └── 'plaintext'  → (none)
│
└── Feature Extensions (按需启用)
    ├── lineNumbers() (if lineNumbers)
    ├── foldGutter() (if folding)
    ├── autocompletion() (if completions available)
    ├── linter() (if lint enabled)
    ├── EditorState.readOnly (if readOnly/disabled)
    └── oneDark / defaultTheme (if editorTheme)
```

### 7.2 Compartment 热替换

使用 CM6 `Compartment` 实现运行时动态切换：

```typescript
const languageCompartment = new Compartment();
const completionCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

// 运行时切换只读
function setReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(
      EditorState.readOnly.of(readOnly)
    ),
  });
}
```

---

## 八、补全系统设计

### 8.1 表达式补全

补全触发条件：
- 输入 `.` 后 — 属性补全
- 输入字母后 — 变量/函数名补全
- 输入 `(` 后 — 函数参数提示

补全源解析逻辑：
1. 获取光标前的标识符链（如 `data.order.items.n`）
2. 按 `.` 拆分为路径段
3. 在 `VariableItem` 树中逐级查找
4. 返回当前层级的子项作为补全选项

```typescript
function expressionCompletionSource(variables: VariableItem[], functions: FuncGroup[]) {
  return function(context: CompletionContext): CompletionResult | null {
    const textBefore = context.state.doc.sliceString(0, context.pos);

    // 场景1：属性访问补全 "xxx.xxx"
    const dotMatch = textBefore.match(/([\w.]+)\.(\w*)$/);
    if (dotMatch) {
      const path = dotMatch[1];
      const partial = dotMatch[2];
      const resolved = resolveVariablePath(variables, path);
      if (resolved) {
        return {
          from: context.pos - partial.length,
          options: resolved.children
            ?.filter(c => c.label.toLowerCase().startsWith(partial.toLowerCase()))
            .map(c => ({
              label: c.label,
              detail: c.type,
              apply: lastSegment(c.value),
              type: c.children ? 'class' : 'property',
            })) ?? [],
        };
      }
    }

    // 场景2：顶层变量/函数补全
    const word = context.matchBefore(/\w+/);
    if (!word) return null;

    const partial = word.text.toLowerCase();
    const varOptions = flattenVariables(variables)
      .filter(v => v.label.toLowerCase().startsWith(partial))
      .map(v => ({
        label: v.label,
        detail: v.type,
        apply: lastSegment(v.value),
        type: 'variable',
      }));

    const funcOptions = flattenFunctions(functions)
      .filter(f => f.name.toLowerCase().startsWith(partial))
      .map(f => ({
        label: f.name,
        detail: f.description,
        apply: `${f.name}()`,
        type: 'function',
      }));

    return { from: word.from, options: [...varOptions, ...funcOptions] };
  };
}
```

### 8.2 SQL 补全

补全触发条件：
- 输入 `alias.` 后 — 列名补全
- 输入字母后 — 表名/关键字补全
- 在 `FROM`/`JOIN` 后 — 表名补全

SQL 补全核心需要解析当前文本中已有的表别名：

```typescript
function sqlCompletionSource(tables: TableSchema[]) {
  return function(context: CompletionContext): CompletionResult | null {
    const doc = context.state.doc.toString();
    const textBefore = doc.slice(0, context.pos);
    const aliasMap = parseTableAliases(textBefore, tables);

    // 场景1：列名补全 "alias.column"
    const dotMatch = textBefore.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
      const table = aliasMap.get(dotMatch[1]);
      if (table) {
        const partial = dotMatch[2].toLowerCase();
        return {
          from: context.pos - partial.length,
          options: table.columns
            .filter(c => c.name.toLowerCase().startsWith(partial))
            .map(c => ({
              label: c.name,
              detail: `${c.type}${c.nullable ? ' (nullable)' : ''}`,
              info: c.description,
              type: 'property',
            })),
        };
      }
    }

    // 场景2：表名/别名/关键字补全
    const word = context.matchBefore(/\w+/);
    if (!word) return null;

    const partial = word.text.toLowerCase();
    return {
      from: word.from,
      options: [
        ...tables.map(t => ({
          label: t.name,
          detail: t.description || 'table',
          type: 'type',
        })),
        ...SQL_KEYWORDS.filter(kw => kw.toLowerCase().startsWith(partial))
          .map(kw => ({ label: kw, type: 'keyword' })),
      ],
    };
  };
}
```

---

## 八.5 SQL 增强功能

### 8.5.1 SQL 格式化（Phase 1）

通过 `sql-formatter` 库实现一键美化 SQL。配置通过 `sqlConfig.format` 控制：

```typescript
// packages/flux-code-editor/src/extensions/sql/format.ts
import { format as sqlFormat } from 'sql-formatter';

const DIALECT_MAP: Record<SQLDialect, string> = {
  standard: 'sql',
  mysql: 'mysql',
  postgresql: 'postgresql',
  sqlite: 'sqlite',
  mssql: 'tsql',
};

export function formatSQL(
  sql: string,
  config: boolean | SQLFormatConfig | undefined,
  dialect?: SQLDialect,
): string {
  if (!config) return sql;
  const resolved = config === true ? { enabled: true } : config;
  return sqlFormat(sql, {
    language: resolved.language ?? DIALECT_MAP[dialect ?? 'standard'] ?? 'sql',
    tabWidth: resolved.tabWidth ?? 2,
    keywordCase: resolved.keywordCase ?? 'upper',
    indentStyle: resolved.indentStyle ?? 'standard',
    logicalOperatorNewline: resolved.logicalOperatorNewline ?? 'before',
  });
}
```

Toolbar 按钮：当 `language === 'sql'` 且 `sqlConfig.format` 为 truthy 时显示。

### 8.5.2 代码片段模板（Phase 2）

`SnippetPanel` 组件提供下拉菜单显示可配置的代码片段。点击后通过 `view.dispatch` 在光标位置插入模板文本：

```tsx
// packages/flux-code-editor/src/extensions/snippet-panel.tsx
export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  // 下拉菜单，点击调用 onInsert(template)
}
```

模板中的 `${var}` 占位符直接插入文本（简单版），后续可扩展为 CM6 placeholder tab-stop。

### 8.5.3 变量面板（Phase 3）

`VariablePanel` 组件在编辑器左侧显示变量列表，支持：
- **复制**：将变量值复制到剪贴板
- **插入**：将变量值插入到光标位置
- **模板渲染**：当配置了 `insertTemplate` 时，插入操作会渲染模板（`${value}` → 变量值，`${label}` → 变量名）

```
┌─────────────────────────────────────────────────┐
│ [变量面板]  │  [CodeMirror Editor]               │
│ 系统变量    │  SELECT * FROM users                │
│ ├ userId    │  WHERE 1=1                          │
│ └ userName  │  <if test="userId != null">         │
│ [复制][插入]│    AND user_id = #{userId}          │
└─────────────────────────────────────────────────┘
```

### 8.5.4 SQL 执行 + 结果预览（Phase 4）

通过 Flux 动作系统执行 SQL 并展示结果：
1. 用户点击"执行"按钮
2. 获取当前 SQL 文本
3. 通过 `props.helpers.dispatch` 发送 API 请求（复用 `ApiObject` 或 action string）
4. 响应通过 `execution.resultPath` 提取
5. 结果展示在编辑器下方的预览表格中

`SQLResultPanel` 组件支持四种状态：`idle` / `loading` / `success`（数据表格）/ `error`（错误信息）。

---

## 九、友好名标记（Decoration）

### 9.1 设计决策

amis 在失焦后将变量名替换为友好名（如 `data.username` → `用户名`）。这在 CM5 中通过 `markText({ atomic: true, replacedWith: dom })` 实现。

**Flux 方案改进**：

| 特性 | amis (CM5) | Flux (CM6) |
|------|-----------|-----------|
| 触发时机 | 仅失焦后 | 失焦后 或 `mode: 'readonly'` 时持续显示 |
| 编辑时行为 | 隐藏标记，显示原始代码 | 始终显示原始代码 |
| 标记机制 | `markText` + DOM 替换 | `Decoration.widget` + `WidgetType` |
| 全局状态 | 是 | 否（每个 ViewPlugin 实例独立） |

### 9.2 实现

```typescript
class FriendlyNameWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly raw: string,
    readonly className: string,
  ) { super(); }

  toDOM() {
    const span = document.createElement('span');
    span.className = this.className;
    span.textContent = this.label;
    span.title = this.raw;
    return span;
  }

  ignoreEvent() { return false; }
}
```

标记由 `ViewPlugin` 驱动，利用 `flux-formula` 的 parser 生成 AST，遍历 AST 节点映射位置到 CM6 decoration。

---

## 十、包归属

### 10.1 新包建议

```
packages/flux-code-editor/
├── src/
│   ├── index.ts                        # 公共导出
│   ├── types.ts                        # CodeEditorSchema, 配置类型
│   ├── use-code-mirror.ts              # CM6 React Hook
│   ├── code-editor-renderer.tsx         # 渲染器组件
│   ├── variable-panel.tsx              # 变量面板组件 (Phase 3)
│   ├── sql-result-panel.tsx            # SQL 执行结果预览 (Phase 4)
│   ├── extensions/
│   │   ├── expression/
│   │   │   ├── completion.ts           # 表达式补全源
│   │   │   ├── decoration.ts           # 变量友好名装饰器
│   │   │   └── linter.ts               # 表达式语法校验
│   │   │   └── template-mode.ts        # 模板模式 StreamLanguage
│   │   ├── sql/
│   │   │   ├── completion.ts           # SQL 补全源
│   │   │   ├── format.ts               # SQL 格式化 (Phase 1)
│   │   │   └── index.ts                # SQL 扩展 barrel
│   │   ├── snippet-panel.tsx           # 代码片段面板 (Phase 2)
│   │   └── base.ts                     # 通用 Extension 工厂
├── package.json
├── tsconfig.json
└── tsconfig.build.json
```

### 10.2 依赖关系

```
flux-core (类型)
  ↓
flux-formula (表达式 parser/AST)
  ↓
flux-code-editor (CM6 编辑器逻辑)
  ↓
flux-react (React Hook 桥接、渲染器注册)
  ↓
flux-renderers-form (表单场景集成)
```

---

## 十一、与 amis Schema 的对照

| amis Schema | Flux Schema | 改进说明 |
|-------------|-------------|---------|
| `type: 'editor'` + `language: 'javascript'` | `type: 'code-editor'` + `language: 'javascript'` | 语义更清晰 |
| `type: 'editor'` + `language: 'json'` | `type: 'code-editor'` + `language: 'json'` | 同上 |
| 无 SQL 支持 | `type: 'code-editor'` + `language: 'sql'` + `sqlConfig` | 新增 |
| `type: 'input-formula'` | `type: 'code-editor'` + `language: 'expression'` | 统一为同一组件 |
| `type: 'input-formula'` + `evalMode: true` | `mode: 'expression'` | 命名更明确 |
| `type: 'input-formula'` + `evalMode: false` | `mode: 'template'` | 命名更明确 |
| `variables: VariableItem[]` | `expressionConfig.variables: VariableItem[] \| VariableSourceRef` | 支持数据源引用 |
| `functions: FuncGroup[]` | `expressionConfig.functions: FuncGroup[] \| FuncSourceRef` | 支持数据源引用 |
| `editorTheme: 'dark'` | `editorTheme: 'dark'` | 兼容 |
| 侧边面板选择变量 | 内联 autocomplete 补全 | 核心交互改进 |

---

## Related Documents

- `docs/analysis/amis-editor-rearchitecture-reResearch.md` — amis 编辑器架构调研
- `docs/architecture/renderer-runtime.md` — 渲染器运行时契约
- `docs/architecture/flux-core.md` — 核心架构
- `docs/references/flux-json-conventions.md` — JSON 约定
- `docs/architecture/field-metadata-slot-modeling.md` — 字段元数据
- `docs/architecture/complex-control-host-protocol.md` — 复杂控件平台协议

---

## 十二、当前实现状态校准

> 更新于 2026-04-04（Phase 6 完成），基于 `packages/flux-code-editor/src/` 实际代码

本节明确区分"当前代码已落地"和"文档设计目标（尚未落地）"，避免将 code-editor 误认为平台级设计器。

### 12.1 已落地

- `CodeEditorSchema` 完整类型定义（`types.ts`）
- `useCodeMirror` Hook：初始值注入、change/focus/blur 回调、extensions 创建
- `code-editor-renderer.tsx`：渲染器已注册，支持 `language`、`mode`、`lineNumbers`、`folding`、`autoHeight`、`editorTheme`、`placeholder`
- change 事件：在 form context 中调用 `currentForm.setValue(name, newValue)`；无 form 时调用 `scope.update(name, newValue)`；同时触发 `props.events.onChange` — 与其他字段控件对齐
- focus 事件：调用 `currentForm.visitField(name)`（如在表单中），并触发 `props.events.onFocus`
- blur 事件：调用 `currentForm.touchField(name)`（如在表单中），并触发 `props.events.onBlur`
- **source-ref 解析**（`source-resolvers.ts`）：
  - `useResolvedVariables`：`source: 'scope'` 同步从 scope 读取；`source: 'api'` 通过 `dispatch` 异步拉取，cancelled flag 防止 unmount 后 setState
  - `useResolvedFunctions`：`source: 'api'` 通过 `dispatch` 异步拉取
  - `useResolvedTables`：`source: 'scope'` 同步；`source: 'api'` 异步
  - `useResolvedSQLVariables`：`source: 'scope'` 同步；`source: 'api'` 异步
- 全部 4 个 source-resolver hooks 已从 `index.ts` 导出
- `expressionConfig.variables`（内联或 source-ref）、`expressionConfig.functions`（内联或 source-ref）可驱动 autocomplete 补全
- SQL 增强：format、snippets、variablePanel、execution（SQL 执行 + 结果预览）全部已实现
- 全屏模式：`allowFullscreen` + ESC 退出

### 12.2 尚未落地（未来可选扩展）

以下功能在文档中设计了接口，但当前无实现计划（不影响已有功能）：

- `ExpressionLintConfig.customRules`：自定义 lint 规则（`validate: string` 回调）
- CM6 `Compartment` 热替换：language/theme 运行时切换（当前 extensions 通过 `useMemo` 重建）
- `FuncSourceRef.source: 'builtin'`：内置函数集合按名称过滤（`builtinSet` 字段）
- 友好名装饰器（`showFriendlyNames`）：CM6 `Decoration.widget` 实现（接口已定义，extensions 已有占位）

### 12.3 定位说明

`code-editor` 是字段级 renderer，不是页面级设计器：

- 不拥有自己的 `DomainBridge` 或 host scope
- 不需要 session/dirty/leave-guard
- 不需要 workbench shell 或 namespaced action namespace
- SQL 执行结果预览通过组件内部状态管理，不引入新的 page shell

所有 source-ref 路径和事件接线已与其他字段控件对齐（Phase 6 完成）。
