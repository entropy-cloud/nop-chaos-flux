# 22 Code Editor SQL Enhancement Plan

> Date: 2026-03-31
> Status: Completed
> Triggered by: SpringReport SQL Editor 功能对比分析
> Affects: `packages/flux-code-editor/`

---

## 0. Background

对比 `~/sources/springreport` 中基于 CodeMirror 5 的 SQL 编辑器，发现 Flux Code Editor (CM6) 在编辑器核心架构上领先一代，但在 SQL 场景的**实用性功能**上存在差距：

| 维度 | Flux (CM6) | SpringReport (CM5) |
|------|-----------|-------------------|
| 编辑器架构 | CM6 Extension/Compartment，领先 | CM5 老旧 |
| Schema 驱动 | JSON Schema 配置 | 硬编码 cmOptions |
| 表达式/模板模式 | 有 | 无 |
| SQL 格式化 | **无** | `sql-formatter` 一键美化 |
| SQL 执行+预览 | **无** | execSql API + 结果分页表格 |
| 变量面板 | **无** (仅 autocomplete popup) | 侧边变量列表 + 一键插入/复制 |
| 条件注释模板 | **无** | MyBatis `<if>` 条件块插入 |

**核心判断**：基础 JSON Schema 设计不改，纯增量扩展 `sqlConfig`。

---

## 1. Goals

1. **SQL 格式化** — 一键美化 SQL 语句
2. **SQL 执行集成** — 通过 Flux 动作系统执行 SQL 并展示结果
3. **变量面板** — 侧边变量/参数列表，支持插入到编辑器
4. **条件注释模板** — 可配置的代码片段模板（MyBatis `<if>` 等场景）

---

## 2. Schema Changes

所有改动在 `SQLEditorConfig` 上**增量扩展**，现有字段不变。

### 2.1 新增类型定义

```typescript
// --- packages/flux-code-editor/src/types.ts ---

/** SQL 格式化配置 */
export interface SQLFormatConfig {
  enabled: boolean;
  /** sql-formatter 语言，默认跟随 dialect */
  language?: 'sql' | 'mysql' | 'postgresql' | 'mariadb' | 'tsql' | 'plsql';
  tabWidth?: number;         // 默认 2
  keywordCase?: 'upper' | 'lower' | 'preserve';  // 默认 'upper'
  indentStyle?: 'standard' | 'tabular';           // 默认 'standard'
  logicalOperatorNewline?: 'before' | 'after';    // 默认 'before'
}

/** SQL 执行配置 — 复用 Flux 动作系统 */
export interface SQLExecutionConfig {
  enabled: boolean;
  /** 执行动作定义 — 复用 ApiObject 或 action 字符串 */
  onExecute?: string | ApiObject;
  /** 执行结果的字段路径，默认 'responseData' */
  resultPath?: string;
  /** 执行参数映射（从 scope 取值注入到请求参数） */
  params?: Record<string, string>;  // key=参数名, value=scope路径
  /** 是否显示结果预览表格 */
  showPreview?: boolean;
}

/** 条件注释/代码片段模板 */
export interface CodeSnippetTemplate {
  name: string;           // 显示名称，如 "IF 条件"
  template: string;       // 模板文本，${var} 为占位符
  description?: string;
  icon?: string;          // 可选图标
}

/** 变量面板配置 */
export interface VariablePanelConfig {
  enabled: boolean;
  /** 变量列表 — 复用 VariableItem 或引用 VariableSourceRef */
  variables?: VariableItem[] | VariableSourceRef;
  /** 变量插入时的模板，${value} 为变量路径，${label} 为显示名 */
  insertTemplate?: string;
}
```

### 2.2 扩展 SQLEditorConfig

```typescript
export interface SQLEditorConfig {
  // --- 现有字段，不变 ---
  tables?: TableSchema[] | SQLSchemaSourceRef;
  dialect?: SQLDialect;
  keywords?: boolean;
  uppercaseKeywords?: boolean;

  // --- 新增 ---
  format?: boolean | SQLFormatConfig;
  execution?: SQLExecutionConfig;
  snippets?: CodeSnippetTemplate[];
  variablePanel?: VariablePanelConfig;
}
```

### 2.3 JSON 使用示例

```json
{
  "type": "code-editor",
  "name": "sql",
  "label": "SQL Query",
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

    "execution": {
      "enabled": true,
      "onExecute": {
        "url": "/api/report/execSql",
        "method": "POST",
        "data": { "tplSql": "${value}", "datasourceId": "${scope.datasourceId}" }
      },
      "resultPath": "responseData",
      "showPreview": true
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
        { "label": "用户名", "value": "userName", "type": "string" },
        { "label": "商户号", "value": "merchantNo", "type": "string" }
      ],
      "insertTemplate": "<if test=\"${value} != null\">\n  AND ${value} = #{${value}}\n</if>"
    }
  }
}
```

---

## 3. Implementation Phases

```
Phase 1 (P0) ────────────────────────────────────────
  3.1 SQL 格式化
      - 新增 sql-formatter 依赖
      - 新增 SQLFormatConfig 类型
      - toolbar 增加格式化按钮
      - 扩展 SQLEditorConfig.format 字段

Phase 2 (P1) ────────────────────────────────────────
  3.2 条件注释/代码片段模板
      - 新增 CodeSnippetTemplate 类型
      - snippet 选择 UI（toolbar 下拉或侧边）
      - 光标位置插入 + 占位符 tab-stop

Phase 3 (P1) ────────────────────────────────────────
  3.3 变量面板
      - 新增 VariablePanelConfig 类型
      - 侧边变量列表面板组件
      - 点击插入 / 点击复制
      - insertTemplate 模板渲染

Phase 4 (P2) ────────────────────────────────────────
  3.4 SQL 执行 + 结果预览
      - 新增 SQLExecutionConfig 类型
      - 执行按钮 + loading 状态
      - 结果预览表格组件
      - 复用 Flux 动作系统 (ApiObject)
```

---

## 4. Phase 1: SQL Format — Detailed

### 4.1 Dependencies

```bash
pnpm --filter @nop-chaos/flux-code-editor add sql-formatter
```

`sql-formatter` 是纯 JS 库，无 Node/Browser 依赖，体积约 50KB gzip，适合前端引入。

### 4.2 Files to Change

| File | Change |
|------|--------|
| `packages/flux-code-editor/src/types.ts` | 新增 `SQLFormatConfig`，扩展 `SQLEditorConfig.format` |
| `packages/flux-code-editor/src/extensions/sql/format.ts` | **新增**，格式化逻辑 |
| `packages/flux-code-editor/src/extensions/sql/index.ts` | **新增**，SQL 扩展 barrel |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | toolbar 增加格式化按钮，调用 format |

### 4.3 Implementation Sketch

```typescript
// packages/flux-code-editor/src/extensions/sql/format.ts
import { format as sqlFormat } from 'sql-formatter';
import type { SQLFormatConfig, SQLDialect } from '../types';

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

  const resolved: SQLFormatConfig = config === true
    ? { enabled: true }
    : config;

  return sqlFormat(sql, {
    language: resolved.language ?? DIALECT_MAP[dialect ?? 'standard'] ?? 'sql',
    tabWidth: resolved.tabWidth ?? 2,
    keywordCase: resolved.keywordCase ?? 'upper',
    indentStyle: resolved.indentStyle ?? 'standard',
    logicalOperatorNewline: resolved.logicalOperatorNewline ?? 'before',
  });
}
```

### 4.4 Toolbar Button

在 `code-editor-renderer.tsx` 的 toolbar 区域，当 `language === 'sql'` 且 `sqlConfig.format` 为 truthy 时，显示格式化按钮：

```tsx
{language === 'sql' && resolveFormatConfig(sqlConfig) && (
  <span
    role="button"
    tabIndex={0}
    className="nop-code-editor__toolbar-btn"
    onClick={handleFormatSQL}
    title="格式化 SQL"
  >
    <FormatIcon />
  </span>
)}
```

### 4.5 Verification

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm test` 通过
- [ ] Playground SQL editor 格式化按钮可用
- [ ] 各方言 SQL 格式化结果正确

---

## 5. Phase 2: Code Snippet Templates — Detailed

### 5.1 Files to Change

| File | Change |
|------|--------|
| `packages/flux-code-editor/src/types.ts` | 新增 `CodeSnippetTemplate`，扩展 `SQLEditorConfig.snippets` |
| `packages/flux-code-editor/src/extensions/snippet-panel.tsx` | **新增**，snippet 选择 UI |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | 集成 snippet panel |

### 5.2 Implementation Notes

- Toolbar 下拉菜单显示可用 snippets
- 点击后通过 `view.dispatch` 在光标位置插入模板文本
- `${var}` 占位符：简单版直接插入文本；后续可考虑 CM6 placeholder tab-stop
- Snippets 可用于任何 `language`，不限于 SQL（但初始使用场景是 SQL 条件注释）

### 5.3 Verification

- [ ] 类型正确
- [ ] 插入位置正确（光标处）
- [ ] Playground 演示可用

---

## 6. Phase 3: Variable Panel — Detailed

### 6.1 Files to Change

| File | Change |
|------|--------|
| `packages/flux-code-editor/src/types.ts` | 新增 `VariablePanelConfig`，扩展 `SQLEditorConfig.variablePanel` |
| `packages/flux-code-editor/src/variable-panel.tsx` | **新增**，变量面板组件 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | 集成变量面板布局 |

### 6.2 Layout

```
┌─────────────────────────────────────────────────┐
│ [变量面板]  │  [CodeMirror Editor]               │
│             │                                     │
│ 系统变量    │  SELECT * FROM users                │
│ ├ userId    │  WHERE 1=1                          │
│ ├ userName  │  <if test="userId != null">         │
│ └ roleId    │    AND user_id = #{userId}          │
│             │  </if>                              │
│ [复制] [插入]│                                     │
└─────────────────────────────────────────────────┘
```

- 面板在编辑器左侧，可折叠
- 每个变量两个操作：复制到剪贴板 / 直接插入到光标位置
- 当配置了 `insertTemplate` 时，插入操作会渲染模板

### 6.3 Verification

- [ ] 变量列表正确渲染
- [ ] 复制到剪贴板可用
- [ ] 插入到光标位置可用
- [ ] insertTemplate 渲染正确
- [ ] 面板折叠/展开可用

---

## 7. Phase 4: SQL Execution + Preview — Detailed

### 7.1 Files to Change

| File | Change |
|------|--------|
| `packages/flux-code-editor/src/types.ts` | 新增 `SQLExecutionConfig`，扩展 `SQLEditorConfig.execution` |
| `packages/flux-code-editor/src/sql-result-panel.tsx` | **新增**，结果预览表格 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | 执行按钮 + 结果面板集成 |

### 7.2 Execution Flow

1. 用户点击"执行"按钮
2. 编辑器获取当前 SQL 文本
3. 通过 Flux 动作系统 (`ApiObject` 或 action string) 发送请求
4. 请求参数从 `execution.params` 配置映射 scope 值
5. 响应通过 `execution.resultPath` 提取
6. 结果展示在编辑器下方的预览表格中

### 7.3 与 Flux 动作系统的集成

复用 `@nop-chaos/flux-runtime` 的 action 执行机制，不自己实现 HTTP 请求：

```typescript
// 执行动作由 host 通过 action 系统注入
// code-editor 只负责触发和展示结果
```

### 7.4 Verification

- [ ] 执行按钮触发正确
- [ ] loading 状态显示
- [ ] 结果表格正确渲染
- [ ] 错误处理（网络错误、SQL 语法错误）

---

## 8. Affected Files Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `packages/flux-code-editor/src/types.ts` | 1-4 | 扩展类型 |
| `packages/flux-code-editor/src/extensions/sql/format.ts` | 1 | 新增 |
| `packages/flux-code-editor/src/extensions/sql/index.ts` | 1 | 新增 |
| `packages/flux-code-editor/src/code-editor-renderer.tsx` | 1-4 | 修改 |
| `packages/flux-code-editor/src/extensions/snippet-panel.tsx` | 2 | 新增 |
| `packages/flux-code-editor/src/variable-panel.tsx` | 3 | 新增 |
| `packages/flux-code-editor/src/sql-result-panel.tsx` | 4 | 新增 |
| `packages/flux-code-editor/package.json` | 1 | 新增 sql-formatter 依赖 |
| `docs/architecture/code-editor.md` | 1-4 | 更新文档 |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `sql-formatter` 增大 bundle | ~50KB gzip | Phase 1 only，tree-shakable，仅 sql 语言加载 |
| 变量面板影响编辑器布局 | 布局抖动 | 使用 CSS flex，面板绝对定位或固定宽度 |
| SQL 执行涉及后端 API | 需要后端配合 | Phase 4 纯前端预留接口，后端由 host 集成 |
| CM5→CM6 功能迁移差异 | API 不兼容 | 不迁移，重新实现，利用 CM6 Extension 架构 |

---

## 10. Acceptance Criteria

- [ ] 所有 Phase 完成后 `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] Playground 页面新增 SQL editor 完整演示（格式化 + snippets + 变量面板 + 执行预览）
- [ ] JSON Schema 向后兼容（现有配置不受影响）
- [ ] `docs/architecture/code-editor.md` 同步更新
