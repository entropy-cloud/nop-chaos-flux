# CodeMirror 6 ä»£ç ç¼–è¾‘å™¨è®¾è®¡æ–‡æ¡£

## Purpose

æœ¬æ–‡æ¡£å®šä¹‰åŸºäºŽ CodeMirror 6 çš„ `code-editor` æ¸²æŸ“å™¨çš„ JSON Schema è®¾è®¡ï¼ŒåŒ…æ‹¬è¯­è¨€æ¨¡å¼é€‰æ‹©ã€åªè¯»æŽ§åˆ¶ã€è¯­æ³•è¡¥å…¨é…ç½®ç­‰ã€‚

æœ¬ç¼–è¾‘å™¨ç”¨äºŽä¸¤ä¸ªæ ¸å¿ƒåœºæ™¯ï¼š
1. **è¡¨è¾¾å¼ç¼–è¾‘å™¨**ï¼šJavaScript å­é›†ï¼Œæ”¯æŒå˜é‡/å±žæ€§/æ–¹æ³•è¡¥å…¨
2. **SQL ç¼–è¾‘å™¨**ï¼šåŸºäºŽè¡¨åå’Œåˆ«åæä¾›å­—æ®µè¡¥å…¨

## Current Code Anchors

å®žçŽ°é˜¶æ®µå‚è€ƒï¼š
- `packages/flux-renderers-form/src/renderers/` â€” è¡¨å•æŽ§ä»¶æ¸²æŸ“å™¨
- `packages/flux-core/src/types.ts` â€” `BaseSchema` åŠæ ¸å¿ƒç±»åž‹
- `docs/analysis/2026-04-01-amis-editor-rearchitecture-reResearch.md` â€” amis ç¼–è¾‘å™¨æž¶æž„è°ƒç ”

---

## ä¸€ã€è®¾è®¡ç›®æ ‡

### å¯¹æ¯” amis çš„æ”¹è¿›

| amis é—®é¢˜ | Flux æ”¹è¿› |
|----------|----------|
| æ— å†…è”è¡¥å…¨ â€” å˜é‡/å‡½æ•°é€‰æ‹©å®Œå…¨ä¾èµ–ä¾§è¾¹é¢æ¿ | CM6 `@codemirror/autocomplete` åŽŸç”Ÿå¼¹å‡ºè¡¥å…¨ |
| æ—  SQL ç¼–è¾‘å™¨ | åŸºäºŽ `@codemirror/lang-sql` + è‡ªå®šä¹‰ schema è¡¥å…¨ |
| `modeRegisted` å…¨å±€å¯å˜çŠ¶æ€ | æ— å…¨å±€çŠ¶æ€ï¼Œæ¯æ¬¡å®žä¾‹ç‹¬ç«‹åˆ›å»º |
| `evalMode` å¸ƒå°”å€¼æ··æ·†ï¼ˆè¡¨è¾¾å¼ vs æ¨¡æ¿ï¼‰ | æ˜Žç¡®çš„ `mode` å­—æ®µï¼š`'expression' | 'template' | 'readonly'` |
| Class ç»„ä»¶ + å¤æ‚ç”Ÿå‘½å‘¨æœŸ | React Hooks + `useCodeMirror` |
| FormulaPlugin æ··åˆèŒè´£ï¼ˆé«˜äº® + æ’å…¥ + éªŒè¯ï¼‰ | CM6 Extension æ‹†åˆ†ï¼šè¡¥å…¨æºã€è£…é¥°å™¨ã€linter å„è‡ªç‹¬ç«‹ |
| `markText` åŽŸå­æ ‡è®°ç¼–è¾‘æ—¶å¹²æ‰° | CM6 `Decoration.widget` + æŒ‰éœ€å¯ç”¨ï¼ˆä»…åœ¨ `readonly` æˆ–å¤±ç„¦æ—¶ï¼‰ |

### è®¾è®¡åŽŸåˆ™

1. **Schema é©±åŠ¨**ï¼šç¼–è¾‘å™¨è¡Œä¸ºå®Œå…¨ç”± JSON é…ç½®æè¿°ï¼Œæ— éœ€å†™ä»£ç 
2. **å…³æ³¨ç‚¹åˆ†ç¦»**ï¼šè¯­è¨€ã€è¡¥å…¨ã€æ ·å¼å„è‡ªç‹¬ç«‹é…ç½®
3. **æ¸è¿›å¢žå¼º**ï¼šæœ€å°é…ç½®å³å¯å·¥ä½œï¼Œé«˜çº§åŠŸèƒ½æŒ‰éœ€å¼€å¯
4. **æ¡†æž¶æ— å…³æ ¸å¿ƒ**ï¼šCM6 é€»è¾‘ä¸ä¾èµ– Reactï¼Œé€šè¿‡ Hook æ¡¥æŽ¥

---

## äºŒã€JSON Schema å®šä¹‰

### 2.1 CodeEditorSchema

```typescript
interface CodeEditorSchema extends BaseSchema {
  type: 'code-editor';

  // --- å¿…å¡«ï¼šè¯­è¨€æ¨¡å¼ ---
  language: EditorLanguage;

  // --- ç¼–è¾‘æ¨¡å¼ ---
  mode?: EditorMode;

  // --- å€¼ ---
  value?: string;

  // --- å ä½æç¤º ---
  placeholder?: string;

  // --- å°ºå¯¸ ---
  width?: number | string;
  height?: number | string;

  // --- è¡Œå· ---
  lineNumbers?: boolean;

  // --- æŠ˜å  ---
  folding?: boolean;

  // --- è‡ªåŠ¨é«˜åº¦ ---
  autoHeight?: boolean;

  // --- å…¨å± ---
  allowFullscreen?: boolean;

  // --- è¯­è¨€ç‰¹æœ‰é…ç½® ---
  expressionConfig?: ExpressionEditorConfig;
  sqlConfig?: SQLEditorConfig;

  // --- ä¸»é¢˜ ---
  editorTheme?: 'light' | 'dark';

  // --- åŽŸç”Ÿé€‰é¡¹é€ä¼  ---
  options?: Record<string, unknown>;

  // --- äº‹ä»¶ ---
  onChange?: string;
  onFocus?: string;
  onBlur?: string;
}

type EditorLanguage =
  | 'expression'       // è¡¨è¾¾å¼ï¼ˆJS å­é›†ï¼Œå˜é‡/å‡½æ•°è¡¥å…¨ï¼‰
  | 'sql'              // SQL
  | 'json'             // JSON
  | 'javascript'       // å®Œæ•´ JavaScript
  | 'typescript'       // TypeScript
  | 'html'             // HTML
  | 'css'              // CSS
  | 'plaintext';       // çº¯æ–‡æœ¬ï¼ˆæ— è¯­æ³•é«˜äº®ï¼‰

type EditorMode =
  | 'expression'       // çº¯è¡¨è¾¾å¼æ¨¡å¼ï¼šæ•´ä¸ªå†…å®¹æ˜¯ä¸€ä¸ªè¡¨è¾¾å¼
  | 'template'         // æ¨¡æ¿æ¨¡å¼ï¼š${...} å†…åµŒè¡¨è¾¾å¼ï¼Œå¤–éƒ¨ä¸ºæ™®é€šæ–‡æœ¬
  | 'code';            // ä»£ç æ¨¡å¼ï¼šå®Œæ•´ä»£ç ç¼–è¾‘ï¼ˆé»˜è®¤ï¼‰
```

### 2.2 å­—æ®µè¯´æ˜Ž

| å­—æ®µ | ç±»åž‹ | é»˜è®¤å€¼ | è¯´æ˜Ž |
|------|------|--------|------|
| `language` | `EditorLanguage` | â€” (å¿…å¡«) | æ¿€æ´»å¯¹åº”çš„ CM6 è¯­è¨€æ‰©å±•å’Œè¡¥å…¨ç­–ç•¥ |
| `mode` | `EditorMode` | `'code'` | ä»… `language: 'expression'` æ—¶æœ‰æ„ä¹‰ |
| `value` | `string` | `''` | ç¼–è¾‘å™¨åˆå§‹å€¼ï¼Œæ”¯æŒè¡¨è¾¾å¼ç»‘å®š |
| `placeholder` | `string` | `''` | ç©ºå†…å®¹æ—¶çš„æç¤ºæ–‡å­— |
| `width` | `number \| string` | `'100%'` | ç¼–è¾‘å™¨å®½åº¦ |
| `height` | `number \| string` | è¯­è¨€ç›¸å…³ | ç¼–è¾‘å™¨é«˜åº¦ï¼ˆè¡¨è¾¾å¼é»˜è®¤ `'auto'`ï¼Œå…¶ä»–é»˜è®¤ `300`ï¼‰ |
| `lineNumbers` | `boolean` | `language !== 'expression'` | æ˜¯å¦æ˜¾ç¤ºè¡Œå· |
| `folding` | `boolean` | `false` | æ˜¯å¦å¯ç”¨ä»£ç æŠ˜å  |
| `autoHeight` | `boolean` | `language === 'expression'` | è‡ªåŠ¨é«˜åº¦ï¼ˆæ ¹æ®å†…å®¹è°ƒæ•´ï¼‰ |
| `allowFullscreen` | `boolean` | `false` | å…è®¸å…¨å±ç¼–è¾‘ |
| `expressionConfig` | `ExpressionEditorConfig` | â€” | è¡¨è¾¾å¼ç¼–è¾‘å™¨é…ç½® |
| `sqlConfig` | `SQLEditorConfig` | â€” | SQL ç¼–è¾‘å™¨é…ç½® |
| `editorTheme` | `'light' \| 'dark'` | `'light'` | ç¼–è¾‘å™¨ä¸»é¢˜ |
| `options` | `Record<string, unknown>` | `{}` | CM6 åŽŸç”Ÿæ‰©å±•é€‰é¡¹é€ä¼  |
| `onChange` | `string` | â€” | å€¼å˜åŒ–æ—¶è§¦å‘çš„åŠ¨ä½œ |
| `onFocus` | `string` | â€” | èŽ·å¾—ç„¦ç‚¹æ—¶è§¦å‘çš„åŠ¨ä½œ |
| `onBlur` | `string` | â€” | å¤±åŽ»ç„¦ç‚¹æ—¶è§¦å‘çš„åŠ¨ä½œ |

### 2.3 ä¸Ž BaseSchema çš„äº¤äº’

`BaseSchema` æä¾›çš„é€šç”¨å­—æ®µè¡Œä¸ºï¼š

| BaseSchema å­—æ®µ | åœ¨ code-editor ä¸­çš„è¯­ä¹‰ |
|----------------|----------------------|
| `readOnly` | ç¼–è¾‘å™¨åªè¯»æ¨¡å¼ï¼ˆCM6 `EditorState.readOnly`ï¼‰ |
| `visible` / `hidden` | æŽ§åˆ¶ç¼–è¾‘å™¨å¯è§æ€§ |
| `disabled` | ç­‰åŒäºŽ `readOnly`ï¼Œä¸”ç¦ç”¨ç„¦ç‚¹ |
| `className` | é™„åŠ åˆ°ç¼–è¾‘å™¨å®¹å™¨ |
| `label` | é€šè¿‡ FieldFrame æ˜¾ç¤ºæ ‡ç­¾ |
| `validateOn` | æ ¡éªŒè§¦å‘æ—¶æœºï¼ˆ`'change'` / `'blur'` / `'submit'`ï¼‰ |

---

## ä¸‰ã€è¡¨è¾¾å¼ç¼–è¾‘å™¨é…ç½®

### 3.1 ExpressionEditorConfig

```typescript
interface ExpressionEditorConfig {
  // --- å˜é‡æº ---
  variables?: VariableItem[] | VariableSourceRef;

  // --- å‡½æ•°æº ---
  functions?: FuncGroup[] | FuncSourceRef;

  // --- å˜é‡å‹å¥½åæ ‡è®° ---
  showFriendlyNames?: boolean;

  // --- è¯­æ³•æ ¡éªŒ ---
  lint?: boolean | ExpressionLintConfig;

  // --- å‡½æ•°æ–‡æ¡£ ---
  showFunctionDocs?: boolean;
}
```

### 3.2 VariableItemï¼ˆå˜é‡æ•°æ®æ¨¡åž‹ï¼‰

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

**ç¤ºä¾‹**ï¼š

```json
{
  "variables": [
    {
      "label": "ç”¨æˆ·å",
      "value": "data.username",
      "type": "string"
    },
    {
      "label": "è®¢å•",
      "value": "data.order",
      "type": "object",
      "children": [
        { "label": "è®¢å•å·", "value": "data.order.id", "type": "string" },
        { "label": "é‡‘é¢", "value": "data.order.amount", "type": "number" },
        {
          "label": "å•†å“åˆ—è¡¨",
          "value": "data.order.items",
          "type": "array",
          "children": [
            { "label": "å•†å“å", "value": "data.order.items.name", "type": "string" },
            { "label": "å•ä»·", "value": "data.order.items.price", "type": "number" }
          ]
        }
      ]
    },
    {
      "label": "å½“å‰è§’è‰²",
      "value": "role",
      "type": "string",
      "tags": ["system"]
    }
  ]
}
```

### 3.3 FuncGroupï¼ˆå‡½æ•°æ•°æ®æ¨¡åž‹ï¼‰

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

**ç¤ºä¾‹**ï¼š

```json
{
  "functions": [
    {
      "groupName": "é€»è¾‘å‡½æ•°",
      "items": [
        {
          "name": "IF",
          "description": "æ¡ä»¶åˆ¤æ–­",
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
      "groupName": "æ–‡æœ¬å‡½æ•°",
      "items": [
        {
          "name": "CONCAT",
          "description": "è¿žæŽ¥å¤šä¸ªå­—ç¬¦ä¸²",
          "example": "CONCAT(str1, str2, ...)",
          "returnType": "string"
        },
        {
          "name": "UPPER",
          "description": "è½¬å¤§å†™",
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

### 3.4 å˜é‡æºå¼•ç”¨

å˜é‡æ•°æ®é™¤äº†ç›´æŽ¥å†…è”ï¼Œè¿˜æ”¯æŒé€šè¿‡æ•°æ®æºå¼•ç”¨åŠ¨æ€èŽ·å–ï¼š

```typescript
type VariableSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiSchema;
  dataPath?: string;
};

type FuncSourceRef = {
  source: 'builtin' | 'api';
  builtinSet?: string[];
  api?: ApiSchema;
  dataPath?: string;
};
```

**ç¤ºä¾‹ â€” ä»Ž scope å–å˜é‡**ï¼š

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

è¿è¡Œæ—¶ä»Žå½“å‰ scope çš„ `editorVariables` è·¯å¾„è¯»å– `VariableItem[]`ã€‚

**ç¤ºä¾‹ â€” ä»Ž API èŽ·å–å‡½æ•°åˆ—è¡¨**ï¼š

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

## å››ã€SQL ç¼–è¾‘å™¨é…ç½®

### 4.1 SQLEditorConfig

```typescript
interface SQLEditorConfig {
  // --- æ•°æ®åº“ schema ---
  tables?: TableSchema[] | SQLSchemaSourceRef;

  // --- SQL æ–¹è¨€ ---
  dialect?: SQLDialect;

  // --- å…³é”®å­—è¡¥å…¨ ---
  keywords?: boolean;

  // --- è‡ªåŠ¨å¤§å†™å…³é”®å­— ---
  uppercaseKeywords?: boolean;

  // --- SQL æ ¼å¼åŒ– (Phase 1) ---
  format?: boolean | SQLFormatConfig;

  // --- ä»£ç ç‰‡æ®µæ¨¡æ¿ (Phase 2) ---
  snippets?: CodeSnippetTemplate[];

  // --- å˜é‡é¢æ¿ (Phase 3) ---
  variablePanel?: VariablePanelConfig;

  // --- SQL æ‰§è¡Œ + ç»“æžœé¢„è§ˆ (Phase 4) ---
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

### 4.2 TableSchemaï¼ˆè¡¨ç»“æž„æ•°æ®æ¨¡åž‹ï¼‰

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

**ç¤ºä¾‹**ï¼š

```json
{
  "sqlConfig": {
    "tables": [
      {
        "name": "users",
        "description": "ç”¨æˆ·è¡¨",
        "columns": [
          { "name": "id", "type": "BIGINT", "description": "ä¸»é”®" },
          { "name": "username", "type": "VARCHAR(64)", "description": "ç”¨æˆ·å" },
          { "name": "email", "type": "VARCHAR(128)", "nullable": true },
          { "name": "role", "type": "VARCHAR(32)", "defaultValue": "'user'" }
        ]
      },
      {
        "name": "orders",
        "alias": "o",
        "description": "è®¢å•è¡¨",
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

### 4.3 SQL Schema æ•°æ®æº

```typescript
type SQLSchemaSourceRef = {
  source: 'scope' | 'api';
  scopePath?: string;
  api?: ApiObject;
  dataPath?: string;
};
```

**ç¤ºä¾‹ â€” åŠ¨æ€èŽ·å–è¡¨ç»“æž„**ï¼š

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

## äº”ã€JSON Schema ç¤ºä¾‹

### 5.1 è¡¨å•å†…åµŒè¡¨è¾¾å¼ç¼–è¾‘å™¨ï¼ˆæœ€ç®€é…ç½®ï¼‰

```json
{
  "type": "form",
  "body": [
    {
      "type": "code-editor",
      "name": "expression",
      "label": "è¿‡æ»¤æ¡ä»¶",
      "language": "expression",
      "mode": "expression",
      "placeholder": "è¾“å…¥è¿‡æ»¤è¡¨è¾¾å¼ï¼Œå¦‚ data.age > 18",
      "expressionConfig": {
        "variables": [
          { "label": "å§“å", "value": "data.name", "type": "string" },
          { "label": "å¹´é¾„", "value": "data.age", "type": "number" },
          { "label": "è§’è‰²", "value": "data.role", "type": "string" }
        ],
        "lint": true
      }
    }
  ]
}
```

### 5.2 æ¨¡æ¿æ¨¡å¼è¡¨è¾¾å¼ç¼–è¾‘å™¨

```json
{
  "type": "code-editor",
  "name": "template",
  "label": "æ¶ˆæ¯æ¨¡æ¿",
  "language": "expression",
  "mode": "template",
  "placeholder": "è¾“å…¥æ–‡æœ¬ï¼Œç”¨ ${...} æ’å…¥å˜é‡",
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

### 5.3 SQL ç¼–è¾‘å™¨

```json
{
  "type": "code-editor",
  "name": "sql",
  "label": "SQL æŸ¥è¯¢",
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

### 5.4 SQL ç¼–è¾‘å™¨å¢žå¼ºï¼ˆæ ¼å¼åŒ– + ä»£ç ç‰‡æ®µ + å˜é‡é¢æ¿ + æ‰§è¡Œé¢„è§ˆï¼‰

```json
{
  "type": "code-editor",
  "name": "sqlEnhanced",
  "label": "SQL æŸ¥è¯¢ï¼ˆå¢žå¼ºç‰ˆï¼‰",
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
        "name": "IF æ¡ä»¶",
        "template": "<if test=\"${condition}\">\n  AND ${column} = #{${param}}\n</if>",
        "description": "MyBatis åŠ¨æ€ SQL æ¡ä»¶å—"
      },
      {
        "name": "FOREACH å¾ªçŽ¯",
        "template": "<foreach collection=\"${list}\" item=\"${item}\" open=\"(\" separator=\",\" close=\")\">\n  #{${item}}\n</foreach>"
      }
    ],
    "variablePanel": {
      "enabled": true,
      "variables": [
        { "label": "ç”¨æˆ·ID", "value": "userId", "type": "number" },
        { "label": "ç”¨æˆ·å", "value": "userName", "type": "string" }
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

### 5.5 åªè¯»ä»£ç æŸ¥çœ‹å™¨

```json
{
  "type": "code-editor",
  "name": "generatedCode",
  "label": "ç”Ÿæˆçš„ä»£ç ",
  "language": "javascript",
  "readOnly": true,
  "lineNumbers": true,
  "folding": true,
  "editorTheme": "dark"
}
```

### 5.6 JSON Schema ç¼–è¾‘å™¨

```json
{
  "type": "code-editor",
  "name": "schema",
  "label": "Schema å®šä¹‰",
  "language": "json",
  "height": 500,
  "lineNumbers": true,
  "folding": true,
  "allowFullscreen": true
}
```

---

## å…­ã€æ¸²æŸ“å™¨å®šä¹‰

### 6.1 RendererRegistration

```typescript
const codeEditorDefinition: RendererDefinition<CodeEditorSchema> = {
  type: 'code-editor',
  component: CodeEditorRenderer,
  wrap: true,                              // ä½¿ç”¨ FieldFrame åŒ…è£¹
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
        rules.push({ kind: 'required', message: `${schema.label || 'ä»£ç '}ä¸èƒ½ä¸ºç©º` });
      }
      return rules;
    },
  },
};
```

### 6.2 ç»„ä»¶æŽ¥æ”¶çš„ Props

`CodeEditorRenderer` é€šè¿‡ `RendererComponentProps<CodeEditorSchema>` æŽ¥æ”¶ï¼š

```typescript
// props.props ä¸­å¯ç”¨çš„å±žæ€§ï¼ˆç»è¿‡ç¼–è¯‘å’Œè¡¨è¾¾å¼æ±‚å€¼åŽï¼‰
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

## ä¸ƒã€CM6 Extension æž¶æž„

### 7.1 Extension ç»„åˆç­–ç•¥

æ¯ç§ `language` å¯¹åº”ä¸€ç»„ CM6 Extensionï¼š

```
code-editor
â”œâ”€â”€ Base Extensions (æ‰€æœ‰è¯­è¨€å…±äº«)
â”‚   â”œâ”€â”€ history()
â”‚   â”œâ”€â”€ keymap.of([indentWithTab])
â”‚   â”œâ”€â”€ EditorView.lineWrapping (if autoHeight)
â”‚   â””â”€â”€ placeholder()
â”‚
â”œâ”€â”€ Language Extensions (language å†³å®š)
â”‚   â”œâ”€â”€ 'expression' â†’ javascript({ expression: true }) + expressionCompletions + expressionLinter
â”‚   â”œâ”€â”€ 'sql'        â†’ sql() + sqlCompletions
â”‚   â”œâ”€â”€ 'json'       â†’ json() + jsonLinter
â”‚   â”œâ”€â”€ 'javascript' â†’ javascript()
â”‚   â”œâ”€â”€ 'typescript' â†’ javascript({ typescript: true })
â”‚   â”œâ”€â”€ 'html'       â†’ html()
â”‚   â”œâ”€â”€ 'css'        â†’ css()
â”‚   â””â”€â”€ 'plaintext'  â†’ (none)
â”‚
â””â”€â”€ Feature Extensions (æŒ‰éœ€å¯ç”¨)
    â”œâ”€â”€ lineNumbers() (if lineNumbers)
    â”œâ”€â”€ foldGutter() (if folding)
    â”œâ”€â”€ autocompletion() (if completions available)
    â”œâ”€â”€ linter() (if lint enabled)
    â”œâ”€â”€ EditorState.readOnly (if readOnly/disabled)
    â””â”€â”€ oneDark / defaultTheme (if editorTheme)
```

### 7.2 Compartment çƒ­æ›¿æ¢

ä½¿ç”¨ CM6 `Compartment` å®žçŽ°è¿è¡Œæ—¶åŠ¨æ€åˆ‡æ¢ï¼š

```typescript
const languageCompartment = new Compartment();
const completionCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

// è¿è¡Œæ—¶åˆ‡æ¢åªè¯»
function setReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({
    effects: readOnlyCompartment.reconfigure(
      EditorState.readOnly.of(readOnly)
    ),
  });
}
```

---

## å…«ã€è¡¥å…¨ç³»ç»Ÿè®¾è®¡

### 8.1 è¡¨è¾¾å¼è¡¥å…¨

è¡¥å…¨è§¦å‘æ¡ä»¶ï¼š
- è¾“å…¥ `.` åŽ â€” å±žæ€§è¡¥å…¨
- è¾“å…¥å­—æ¯åŽ â€” å˜é‡/å‡½æ•°åè¡¥å…¨
- è¾“å…¥ `(` åŽ â€” å‡½æ•°å‚æ•°æç¤º

è¡¥å…¨æºè§£æžé€»è¾‘ï¼š
1. èŽ·å–å…‰æ ‡å‰çš„æ ‡è¯†ç¬¦é“¾ï¼ˆå¦‚ `data.order.items.n`ï¼‰
2. æŒ‰ `.` æ‹†åˆ†ä¸ºè·¯å¾„æ®µ
3. åœ¨ `VariableItem` æ ‘ä¸­é€çº§æŸ¥æ‰¾
4. è¿”å›žå½“å‰å±‚çº§çš„å­é¡¹ä½œä¸ºè¡¥å…¨é€‰é¡¹

```typescript
function expressionCompletionSource(variables: VariableItem[], functions: FuncGroup[]) {
  return function(context: CompletionContext): CompletionResult | null {
    const textBefore = context.state.doc.sliceString(0, context.pos);

    // åœºæ™¯1ï¼šå±žæ€§è®¿é—®è¡¥å…¨ "xxx.xxx"
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

    // åœºæ™¯2ï¼šé¡¶å±‚å˜é‡/å‡½æ•°è¡¥å…¨
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

### 8.2 SQL è¡¥å…¨

è¡¥å…¨è§¦å‘æ¡ä»¶ï¼š
- è¾“å…¥ `alias.` åŽ â€” åˆ—åè¡¥å…¨
- è¾“å…¥å­—æ¯åŽ â€” è¡¨å/å…³é”®å­—è¡¥å…¨
- åœ¨ `FROM`/`JOIN` åŽ â€” è¡¨åè¡¥å…¨

SQL è¡¥å…¨æ ¸å¿ƒéœ€è¦è§£æžå½“å‰æ–‡æœ¬ä¸­å·²æœ‰çš„è¡¨åˆ«åï¼š

```typescript
function sqlCompletionSource(tables: TableSchema[]) {
  return function(context: CompletionContext): CompletionResult | null {
    const doc = context.state.doc.toString();
    const textBefore = doc.slice(0, context.pos);
    const aliasMap = parseTableAliases(textBefore, tables);

    // åœºæ™¯1ï¼šåˆ—åè¡¥å…¨ "alias.column"
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

    // åœºæ™¯2ï¼šè¡¨å/åˆ«å/å…³é”®å­—è¡¥å…¨
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

## å…«.5 SQL å¢žå¼ºåŠŸèƒ½

### 8.5.1 SQL æ ¼å¼åŒ–ï¼ˆPhase 1ï¼‰

é€šè¿‡ `sql-formatter` åº“å®žçŽ°ä¸€é”®ç¾ŽåŒ– SQLã€‚é…ç½®é€šè¿‡ `sqlConfig.format` æŽ§åˆ¶ï¼š

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

Toolbar æŒ‰é’®ï¼šå½“ `language === 'sql'` ä¸” `sqlConfig.format` ä¸º truthy æ—¶æ˜¾ç¤ºã€‚

### 8.5.2 ä»£ç ç‰‡æ®µæ¨¡æ¿ï¼ˆPhase 2ï¼‰

`SnippetPanel` ç»„ä»¶æä¾›ä¸‹æ‹‰èœå•æ˜¾ç¤ºå¯é…ç½®çš„ä»£ç ç‰‡æ®µã€‚ç‚¹å‡»åŽé€šè¿‡ `view.dispatch` åœ¨å…‰æ ‡ä½ç½®æ’å…¥æ¨¡æ¿æ–‡æœ¬ï¼š

```tsx
// packages/flux-code-editor/src/extensions/snippet-panel.tsx
export function SnippetPanel({ snippets, onInsert }: SnippetPanelProps) {
  // ä¸‹æ‹‰èœå•ï¼Œç‚¹å‡»è°ƒç”¨ onInsert(template)
}
```

æ¨¡æ¿ä¸­çš„ `${var}` å ä½ç¬¦ç›´æŽ¥æ’å…¥æ–‡æœ¬ï¼ˆç®€å•ç‰ˆï¼‰ï¼ŒåŽç»­å¯æ‰©å±•ä¸º CM6 placeholder tab-stopã€‚

### 8.5.3 å˜é‡é¢æ¿ï¼ˆPhase 3ï¼‰

`VariablePanel` ç»„ä»¶åœ¨ç¼–è¾‘å™¨å·¦ä¾§æ˜¾ç¤ºå˜é‡åˆ—è¡¨ï¼Œæ”¯æŒï¼š
- **å¤åˆ¶**ï¼šå°†å˜é‡å€¼å¤åˆ¶åˆ°å‰ªè´´æ¿
- **æ’å…¥**ï¼šå°†å˜é‡å€¼æ’å…¥åˆ°å…‰æ ‡ä½ç½®
- **æ¨¡æ¿æ¸²æŸ“**ï¼šå½“é…ç½®äº† `insertTemplate` æ—¶ï¼Œæ’å…¥æ“ä½œä¼šæ¸²æŸ“æ¨¡æ¿ï¼ˆ`${value}` â†’ å˜é‡å€¼ï¼Œ`${label}` â†’ å˜é‡åï¼‰

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ [å˜é‡é¢æ¿]  â”‚  [CodeMirror Editor]               â”‚
â”‚ ç³»ç»Ÿå˜é‡    â”‚  SELECT * FROM users                â”‚
â”‚ â”œ userId    â”‚  WHERE 1=1                          â”‚
â”‚ â”” userName  â”‚  <if test="userId != null">         â”‚
â”‚ [å¤åˆ¶][æ’å…¥]â”‚    AND user_id = #{userId}          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### 8.5.4 SQL æ‰§è¡Œ + ç»“æžœé¢„è§ˆï¼ˆPhase 4ï¼‰

é€šè¿‡ Flux åŠ¨ä½œç³»ç»Ÿæ‰§è¡Œ SQL å¹¶å±•ç¤ºç»“æžœï¼š
1. ç”¨æˆ·ç‚¹å‡»"æ‰§è¡Œ"æŒ‰é’®
2. èŽ·å–å½“å‰ SQL æ–‡æœ¬
3. é€šè¿‡ `props.helpers.dispatch` å‘é€ API è¯·æ±‚ï¼ˆå¤ç”¨ `ApiObject` æˆ– action stringï¼‰
4. å“åº”é€šè¿‡ `execution.resultPath` æå–
5. ç»“æžœå±•ç¤ºåœ¨ç¼–è¾‘å™¨ä¸‹æ–¹çš„é¢„è§ˆè¡¨æ ¼ä¸­

`SQLResultPanel` ç»„ä»¶æ”¯æŒå››ç§çŠ¶æ€ï¼š`idle` / `loading` / `success`ï¼ˆæ•°æ®è¡¨æ ¼ï¼‰/ `error`ï¼ˆé”™è¯¯ä¿¡æ¯ï¼‰ã€‚

---

## ä¹ã€å‹å¥½åæ ‡è®°ï¼ˆDecorationï¼‰

### 9.1 è®¾è®¡å†³ç­–

amis åœ¨å¤±ç„¦åŽå°†å˜é‡åæ›¿æ¢ä¸ºå‹å¥½åï¼ˆå¦‚ `data.username` â†’ `ç”¨æˆ·å`ï¼‰ã€‚è¿™åœ¨ CM5 ä¸­é€šè¿‡ `markText({ atomic: true, replacedWith: dom })` å®žçŽ°ã€‚

**Flux æ–¹æ¡ˆæ”¹è¿›**ï¼š

| ç‰¹æ€§ | amis (CM5) | Flux (CM6) |
|------|-----------|-----------|
| è§¦å‘æ—¶æœº | ä»…å¤±ç„¦åŽ | å¤±ç„¦åŽ æˆ– `mode: 'readonly'` æ—¶æŒç»­æ˜¾ç¤º |
| ç¼–è¾‘æ—¶è¡Œä¸º | éšè—æ ‡è®°ï¼Œæ˜¾ç¤ºåŽŸå§‹ä»£ç  | å§‹ç»ˆæ˜¾ç¤ºåŽŸå§‹ä»£ç  |
| æ ‡è®°æœºåˆ¶ | `markText` + DOM æ›¿æ¢ | `Decoration.widget` + `WidgetType` |
| å…¨å±€çŠ¶æ€ | æ˜¯ | å¦ï¼ˆæ¯ä¸ª ViewPlugin å®žä¾‹ç‹¬ç«‹ï¼‰ |

### 9.2 å®žçŽ°

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

æ ‡è®°ç”± `ViewPlugin` é©±åŠ¨ï¼Œåˆ©ç”¨ `flux-formula` çš„ parser ç”Ÿæˆ ASTï¼ŒéåŽ† AST èŠ‚ç‚¹æ˜ å°„ä½ç½®åˆ° CM6 decorationã€‚

---

## åã€åŒ…å½’å±ž

### 10.1 æ–°åŒ…å»ºè®®

```
packages/flux-code-editor/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ index.ts                        # å…¬å…±å¯¼å‡º
â”‚   â”œâ”€â”€ types.ts                        # CodeEditorSchema, é…ç½®ç±»åž‹
â”‚   â”œâ”€â”€ use-code-mirror.ts              # CM6 React Hook
â”‚   â”œâ”€â”€ code-editor-renderer.tsx         # æ¸²æŸ“å™¨ç»„ä»¶
â”‚   â”œâ”€â”€ variable-panel.tsx              # å˜é‡é¢æ¿ç»„ä»¶ (Phase 3)
â”‚   â”œâ”€â”€ sql-result-panel.tsx            # SQL æ‰§è¡Œç»“æžœé¢„è§ˆ (Phase 4)
â”‚   â”œâ”€â”€ extensions/
â”‚   â”‚   â”œâ”€â”€ expression/
â”‚   â”‚   â”‚   â”œâ”€â”€ completion.ts           # è¡¨è¾¾å¼è¡¥å…¨æº
â”‚   â”‚   â”‚   â”œâ”€â”€ decoration.ts           # å˜é‡å‹å¥½åè£…é¥°å™¨
â”‚   â”‚   â”‚   â””â”€â”€ linter.ts               # è¡¨è¾¾å¼è¯­æ³•æ ¡éªŒ
â”‚   â”‚   â”‚   â””â”€â”€ template-mode.ts        # æ¨¡æ¿æ¨¡å¼ StreamLanguage
â”‚   â”‚   â”œâ”€â”€ sql/
â”‚   â”‚   â”‚   â”œâ”€â”€ completion.ts           # SQL è¡¥å…¨æº
â”‚   â”‚   â”‚   â”œâ”€â”€ format.ts               # SQL æ ¼å¼åŒ– (Phase 1)
â”‚   â”‚   â”‚   â””â”€â”€ index.ts                # SQL æ‰©å±• barrel
â”‚   â”‚   â”œâ”€â”€ snippet-panel.tsx           # ä»£ç ç‰‡æ®µé¢æ¿ (Phase 2)
â”‚   â”‚   â””â”€â”€ base.ts                     # é€šç”¨ Extension å·¥åŽ‚
â”œâ”€â”€ package.json
â”œâ”€â”€ tsconfig.json
â””â”€â”€ tsconfig.build.json
```

### 10.2 ä¾èµ–å…³ç³»

```
flux-core (ç±»åž‹)
  â†“
flux-formula (è¡¨è¾¾å¼ parser/AST)
  â†“
flux-code-editor (CM6 ç¼–è¾‘å™¨é€»è¾‘)
  â†“
flux-react (React Hook æ¡¥æŽ¥ã€æ¸²æŸ“å™¨æ³¨å†Œ)
  â†“
flux-renderers-form (è¡¨å•åœºæ™¯é›†æˆ)
```

---

## åä¸€ã€ä¸Ž amis Schema çš„å¯¹ç…§

| amis Schema | Flux Schema | æ”¹è¿›è¯´æ˜Ž |
|-------------|-------------|---------|
| `type: 'editor'` + `language: 'javascript'` | `type: 'code-editor'` + `language: 'javascript'` | è¯­ä¹‰æ›´æ¸…æ™° |
| `type: 'editor'` + `language: 'json'` | `type: 'code-editor'` + `language: 'json'` | åŒä¸Š |
| æ—  SQL æ”¯æŒ | `type: 'code-editor'` + `language: 'sql'` + `sqlConfig` | æ–°å¢ž |
| `type: 'input-formula'` | `type: 'code-editor'` + `language: 'expression'` | ç»Ÿä¸€ä¸ºåŒä¸€ç»„ä»¶ |
| `type: 'input-formula'` + `evalMode: true` | `mode: 'expression'` | å‘½åæ›´æ˜Žç¡® |
| `type: 'input-formula'` + `evalMode: false` | `mode: 'template'` | å‘½åæ›´æ˜Žç¡® |
| `variables: VariableItem[]` | `expressionConfig.variables: VariableItem[] \| VariableSourceRef` | æ”¯æŒæ•°æ®æºå¼•ç”¨ |
| `functions: FuncGroup[]` | `expressionConfig.functions: FuncGroup[] \| FuncSourceRef` | æ”¯æŒæ•°æ®æºå¼•ç”¨ |
| `editorTheme: 'dark'` | `editorTheme: 'dark'` | å…¼å®¹ |
| ä¾§è¾¹é¢æ¿é€‰æ‹©å˜é‡ | å†…è” autocomplete è¡¥å…¨ | æ ¸å¿ƒäº¤äº’æ”¹è¿› |

---

## Related Documents

- `docs/analysis/2026-04-01-amis-editor-rearchitecture-reResearch.md` â€” amis ç¼–è¾‘å™¨æž¶æž„è°ƒç ”
- `docs/architecture/renderer-runtime.md` â€” æ¸²æŸ“å™¨è¿è¡Œæ—¶å¥‘çº¦
- `docs/architecture/flux-core.md` â€” æ ¸å¿ƒæž¶æž„
- `docs/references/flux-json-conventions.md` â€” JSON çº¦å®š
- `docs/architecture/field-metadata-slot-modeling.md` â€” å­—æ®µå…ƒæ•°æ®
- `docs/architecture/complex-control-host-protocol.md` â€” å¤æ‚æŽ§ä»¶å¹³å°åè®®

---

## åäºŒã€å½“å‰å®žçŽ°çŠ¶æ€æ ¡å‡†

> æ›´æ–°äºŽ 2026-04-04ï¼ˆPhase 6 å®Œæˆï¼‰ï¼ŒåŸºäºŽ `packages/flux-code-editor/src/` å®žé™…ä»£ç 

æœ¬èŠ‚æ˜Žç¡®åŒºåˆ†"å½“å‰ä»£ç å·²è½åœ°"å’Œ"æ–‡æ¡£è®¾è®¡ç›®æ ‡ï¼ˆå°šæœªè½åœ°ï¼‰"ï¼Œé¿å…å°† code-editor è¯¯è®¤ä¸ºå¹³å°çº§è®¾è®¡å™¨ã€‚

### 12.1 å·²è½åœ°

- `CodeEditorSchema` å®Œæ•´ç±»åž‹å®šä¹‰ï¼ˆ`types.ts`ï¼‰
- `useCodeMirror` Hookï¼šåˆå§‹å€¼æ³¨å…¥ã€change/focus/blur å›žè°ƒã€extensions åˆ›å»º
- `code-editor-renderer.tsx`ï¼šæ¸²æŸ“å™¨å·²æ³¨å†Œï¼Œæ”¯æŒ `language`ã€`mode`ã€`lineNumbers`ã€`folding`ã€`autoHeight`ã€`editorTheme`ã€`placeholder`
- change äº‹ä»¶ï¼šåœ¨ form context ä¸­è°ƒç”¨ `currentForm.setValue(name, newValue)`ï¼›æ—  form æ—¶è°ƒç”¨ `scope.update(name, newValue)`ï¼›åŒæ—¶è§¦å‘ `props.events.onChange` â€” ä¸Žå…¶ä»–å­—æ®µæŽ§ä»¶å¯¹é½
- focus äº‹ä»¶ï¼šè°ƒç”¨ `currentForm.visitField(name)`ï¼ˆå¦‚åœ¨è¡¨å•ä¸­ï¼‰ï¼Œå¹¶è§¦å‘ `props.events.onFocus`
- blur äº‹ä»¶ï¼šè°ƒç”¨ `currentForm.touchField(name)`ï¼ˆå¦‚åœ¨è¡¨å•ä¸­ï¼‰ï¼Œå¹¶è§¦å‘ `props.events.onBlur`
- **source-ref è§£æž**ï¼ˆ`source-resolvers.ts`ï¼‰ï¼š
  - `useResolvedVariables`ï¼š`source: 'scope'` åŒæ­¥ä»Ž scope è¯»å–ï¼›`source: 'api'` é€šè¿‡ `dispatch` å¼‚æ­¥æ‹‰å–ï¼Œcancelled flag é˜²æ­¢ unmount åŽ setState
  - `useResolvedFunctions`ï¼š`source: 'api'` é€šè¿‡ `dispatch` å¼‚æ­¥æ‹‰å–
  - `useResolvedTables`ï¼š`source: 'scope'` åŒæ­¥ï¼›`source: 'api'` å¼‚æ­¥
  - `useResolvedSQLVariables`ï¼š`source: 'scope'` åŒæ­¥ï¼›`source: 'api'` å¼‚æ­¥
- å…¨éƒ¨ 4 ä¸ª source-resolver hooks å·²ä»Ž `index.ts` å¯¼å‡º
- `expressionConfig.variables`ï¼ˆå†…è”æˆ– source-refï¼‰ã€`expressionConfig.functions`ï¼ˆå†…è”æˆ– source-refï¼‰å¯é©±åŠ¨ autocomplete è¡¥å…¨
- SQL å¢žå¼ºï¼šformatã€snippetsã€variablePanelã€executionï¼ˆSQL æ‰§è¡Œ + ç»“æžœé¢„è§ˆï¼‰å…¨éƒ¨å·²å®žçŽ°
- å…¨å±æ¨¡å¼ï¼š`allowFullscreen` + ESC é€€å‡º

### 12.2 å°šæœªè½åœ°ï¼ˆæœªæ¥å¯é€‰æ‰©å±•ï¼‰

ä»¥ä¸‹åŠŸèƒ½åœ¨æ–‡æ¡£ä¸­è®¾è®¡äº†æŽ¥å£ï¼Œä½†å½“å‰æ— å®žçŽ°è®¡åˆ’ï¼ˆä¸å½±å“å·²æœ‰åŠŸèƒ½ï¼‰ï¼š

- `ExpressionLintConfig.customRules`ï¼šè‡ªå®šä¹‰ lint è§„åˆ™ï¼ˆ`validate: string` å›žè°ƒï¼‰
- CM6 `Compartment` çƒ­æ›¿æ¢ï¼šlanguage/theme è¿è¡Œæ—¶åˆ‡æ¢ï¼ˆå½“å‰ extensions é€šè¿‡ `useMemo` é‡å»ºï¼‰
- `FuncSourceRef.source: 'builtin'`ï¼šå†…ç½®å‡½æ•°é›†åˆæŒ‰åç§°è¿‡æ»¤ï¼ˆ`builtinSet` å­—æ®µï¼‰
- å‹å¥½åè£…é¥°å™¨ï¼ˆ`showFriendlyNames`ï¼‰ï¼šCM6 `Decoration.widget` å®žçŽ°ï¼ˆæŽ¥å£å·²å®šä¹‰ï¼Œextensions å·²æœ‰å ä½ï¼‰

### 12.3 å®šä½è¯´æ˜Ž

`code-editor` æ˜¯å­—æ®µçº§ rendererï¼Œä¸æ˜¯é¡µé¢çº§è®¾è®¡å™¨ï¼š

- ä¸æ‹¥æœ‰è‡ªå·±çš„ `DomainBridge` æˆ– host scope
- ä¸éœ€è¦ session/dirty/leave-guard
- ä¸éœ€è¦ workbench shell æˆ– namespaced action namespace
- SQL æ‰§è¡Œç»“æžœé¢„è§ˆé€šè¿‡ç»„ä»¶å†…éƒ¨çŠ¶æ€ç®¡ç†ï¼Œä¸å¼•å…¥æ–°çš„ page shell

æ‰€æœ‰ source-ref è·¯å¾„å’Œäº‹ä»¶æŽ¥çº¿å·²ä¸Žå…¶ä»–å­—æ®µæŽ§ä»¶å¯¹é½ï¼ˆPhase 6 å®Œæˆï¼‰ã€‚

