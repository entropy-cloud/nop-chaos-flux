# Condition Builder Design

## Purpose

This document defines the architecture and JSON configuration contract for the `condition-builder` renderer — a highly configurable compound condition editor that allows users to visually compose boolean expressions through a structured UI.

Use it when changing:

- condition builder schema or renderer component
- field type definitions, operator mappings, or value input behavior
- drag-and-drop, nested groups, or conjunction logic
- visual styling or layout of the condition builder
- condition builder validation or serialization

For renderer contracts in general, see `docs/architecture/renderer-runtime.md`.
For form validation integration, see `docs/architecture/form-validation.md`.
For styling conventions, see `docs/architecture/styling-system.md`.

## Background: AMIS Condition Builder

This component is a redesign of the AMIS `condition-builder` control. The AMIS implementation provides the functional baseline:

| Capability | AMIS Status |
|------------|-------------|
| Field types (text, number, date, time, datetime, select, boolean, custom) | Supported |
| Operators per field type | Supported |
| AND/OR nested groups | Supported |
| NOT toggle per group | Supported |
| Drag-and-drop reordering | Supported |
| Simple mode (flat list) and full mode (nested) | Supported |
| Embedded and picker (popup) mode | Supported |
| Remote field options via `source` | Supported |
| Field search | Supported |
| Field selection mode (list, tree, chained) | Supported |
| Formula integration | Supported |
| Condition trigger (`showIf`) | Supported |
| Unique fields constraint | Supported |

The goal is **functional parity** with improved visual design using Tailwind + shadcn/ui.

## Design Goals

1. **JSON-driven configuration** — every behavior and visual aspect is configurable through schema, matching AMIS flexibility
2. **Beautiful by default** — modern card-based layout, pill-style toggles, clear hierarchy, proper spacing
3. **Tailwind + shadcn/ui** — consistent with the project styling system, no custom CSS
4. **Framework-aligned** — uses `RendererDefinition`, `RendererComponentProps`, form hooks, and scope model
5. **Tree-structured value** — supports arbitrary nesting of condition groups

## JSON Schema

### Top-Level Schema

```typescript
interface ConditionBuilderSchema extends BaseSchema {
  type: 'condition-builder';
  name: string;

  fields: ConditionField[];
  source?: string | ApiObject;

  builderMode?: 'full' | 'simple';
  embed?: boolean;
  title?: string;

  selectMode?: 'list' | 'tree' | 'chained';
  searchable?: boolean;

  draggable?: boolean;
  showANDOR?: boolean;
  showNot?: boolean;
  showIf?: boolean;
  uniqueFields?: boolean;

  formulas?: ConditionFormulaConfig;
  formulaForIf?: ConditionFormulaConfig;

  operators?: ConditionOperatorOverrides;
  addBtnVisibleOn?: string;
  addGroupBtnVisibleOn?: string;

  placeholder?: string;
  addConditionLabel?: string;
  addGroupLabel?: string;
  removeConditionLabel?: string;
  removeGroupLabel?: string;

  maxDepth?: number;
  maxItemsPerGroup?: number;
}
```

### Field Definitions

Fields define what the user can filter on. Each field has a type, a name, and type-specific configuration.

```typescript
type ConditionField =
  | TextField
  | NumberField
  | DateField
  | TimeField
  | DateTimeField
  | SelectField
  | BooleanField
  | CustomField
  | FieldGroup;

interface BaseConditionField {
  name: string;
  label: string;
  type: ConditionFieldType;
  placeholder?: string;
  operators?: (string | CustomOperator)[];
  defaultOp?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  valueTypes?: Array<'value' | 'field' | 'func'>;
}

interface CustomOperator {
  label: string;
  value: string;
  values?: CustomOperatorValueField[];
}

interface CustomOperatorValueField {
  type: string;
  name: string;
  label?: string;
  placeholder?: string;
}

interface TextField extends BaseConditionField {
  type: 'text';
  minLength?: number;
  maxLength?: number;
}

interface NumberField extends BaseConditionField {
  type: 'number';
  minimum?: number;
  maximum?: number;
  step?: number;
  precision?: number;
}

interface DateField extends BaseConditionField {
  type: 'date';
  format?: string;
  inputFormat?: string;
  minDate?: string;
  maxDate?: string;
}

interface TimeField extends BaseConditionField {
  type: 'time';
  format?: string;
  inputFormat?: string;
  minTime?: string;
  maxTime?: string;
}

interface DateTimeField extends BaseConditionField {
  type: 'datetime';
  format?: string;
  inputFormat?: string;
  timeFormat?: string;
}

interface SelectField extends BaseConditionField {
  type: 'select';
  options?: Array<{ label: string; value: unknown }>;
  source?: string | ApiObject;
  searchable?: boolean;
  multiple?: boolean;
  autoComplete?: string | ApiObject;
  maxTagCount?: number;
}

interface BooleanField extends BaseConditionField {
  type: 'boolean';
  trueLabel?: string;
  falseLabel?: string;
}

interface CustomField extends BaseConditionField {
  type: 'custom';
  value: BaseSchema;
}

interface FieldGroup {
  type: 'group';
  label: string;
  children: ConditionField[];
}

type ConditionFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime'
  | 'select'
  | 'boolean'
  | 'custom';
```

### Operator System

The operator system is fully configurable at three levels:

1. **Built-in defaults** — each field type has a default operator set
2. **Schema-level overrides** — `operators` on the schema overrides defaults globally
3. **Field-level overrides** — `operators` on a specific field overrides everything

#### Built-in Operators

```typescript
type BuiltInOperator =
  | 'equal' | 'not_equal'
  | 'less' | 'less_or_equal'
  | 'greater' | 'greater_or_equal'
  | 'between' | 'not_between'
  | 'is_empty' | 'is_not_empty'
  | 'like' | 'not_like'
  | 'starts_with' | 'ends_with'
  | 'select_equals' | 'select_not_equals'
  | 'select_any_in' | 'select_not_any_in';
```

#### Default Operator Map Per Field Type

```typescript
const DEFAULT_OPERATORS: Record<ConditionFieldType, { defaultOp: string; operators: string[] }> = {
  text: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'is_empty', 'is_not_empty', 'like', 'not_like', 'starts_with', 'ends_with'],
  },
  number: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  date: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  time: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  datetime: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'is_empty', 'is_not_empty'],
  },
  select: {
    defaultOp: 'select_equals',
    operators: ['select_equals', 'select_not_equals', 'select_any_in', 'select_not_any_in'],
  },
  boolean: {
    defaultOp: 'equal',
    operators: ['equal', 'not_equal'],
  },
  custom: {
    defaultOp: 'equal',
    operators: [],
  },
};
```

#### Schema-Level Operator Overrides

```typescript
interface ConditionOperatorOverrides {
  labels?: Record<string, string>;
  operatorsByType?: Record<ConditionFieldType, string[]>;
  defaultOpByType?: Record<ConditionFieldType, string>;
}
```

When provided, `operatorsByType[type]` replaces the built-in list for that type, and `defaultOpByType[type]` replaces the built-in default.

### Formula Configuration

```typescript
interface ConditionFormulaConfig {
  mode?: 'input-group' | 'formula';
  inputSettings?: FormulaInputSettings;
  allowInput?: boolean;
  mixedMode?: boolean;
  variables?: FormulaVariable[];
}

interface FormulaInputSettings {
  type?: 'text' | 'number' | 'boolean' | 'date' | 'time' | 'datetime' | 'select';
  step?: number;
  min?: number;
  max?: number;
  precision?: number;
  format?: string;
  inputFormat?: string;
  timeFormat?: string;
  options?: Array<{ label: string; value: unknown }>;
  multiple?: boolean;
  trueLabel?: string;
  falseLabel?: string;
  defaultValue?: unknown;
}

interface FormulaVariable {
  label: string;
  value?: string;
  tag?: string;
  children?: FormulaVariable[];
}
```

### Value Data Structure

The value produced and consumed by the condition builder is a tree:

```typescript
interface ConditionGroupValue {
  id: string;
  conjunction: 'and' | 'or';
  not?: boolean;
  if?: string;
  children: Array<ConditionGroupValue | ConditionItemValue>;
}

interface ConditionItemValue {
  id: string;
  left: {
    type: 'field';
    field: string;
  };
  op: string;
  right?: unknown;
}
```

Example value:

```json
{
  "id": "root",
  "conjunction": "and",
  "children": [
    {
      "id": "item1",
      "left": { "type": "field", "field": "age" },
      "op": "greater",
      "right": 18
    },
    {
      "id": "group1",
      "conjunction": "or",
      "children": [
        {
          "id": "item2",
          "left": { "type": "field", "field": "status" },
          "op": "select_equals",
          "right": "active"
        },
        {
          "id": "item3",
          "left": { "type": "field", "field": "role" },
          "op": "select_any_in",
          "right": ["admin", "editor"]
        }
      ]
    }
  ]
}
```

### Complete JSON Example

```json
{
  "type": "condition-builder",
  "name": "conditions",
  "label": "筛选条件",
  "placeholder": "请添加筛选条件",
  "builderMode": "full",
  "searchable": true,
  "draggable": true,
  "showNot": true,
  "selectMode": "list",
  "fields": [
    {
      "name": "username",
      "label": "用户名",
      "type": "text",
      "placeholder": "输入用户名"
    },
    {
      "name": "age",
      "label": "年龄",
      "type": "number",
      "minimum": 0,
      "maximum": 150
    },
    {
      "name": "status",
      "label": "状态",
      "type": "select",
      "searchable": true,
      "options": [
        { "label": "激活", "value": "active" },
        { "label": "禁用", "value": "inactive" },
        { "label": "待审核", "value": "pending" }
      ]
    },
    {
      "name": "created_at",
      "label": "创建时间",
      "type": "datetime"
    },
    {
      "name": "vip",
      "label": "VIP",
      "type": "boolean"
    },
    {
      "type": "group",
      "label": "扩展信息",
      "children": [
        {
          "name": "score",
          "label": "评分",
          "type": "number",
          "minimum": 0,
          "maximum": 100,
          "operators": ["equal", "greater", "less", "between"]
        },
        {
          "name": "tags",
          "label": "标签",
          "type": "select",
          "multiple": true,
          "source": "/api/tags"
        }
      ]
    }
  ]
}
```

### Simple Mode Example

```json
{
  "type": "condition-builder",
  "name": "filters",
  "builderMode": "simple",
  "showANDOR": true,
  "draggable": false,
  "fields": [
    { "name": "name", "label": "名称", "type": "text" },
    { "name": "level", "label": "级别", "type": "number" },
    { "name": "enabled", "label": "启用", "type": "boolean" }
  ]
}
```

### Picker (Non-Embedded) Mode Example

```json
{
  "type": "condition-builder",
  "name": "conditions",
  "embed": false,
  "title": "条件组合设置",
  "fields": [
    { "name": "field_a", "label": "字段A", "type": "text" },
    { "name": "field_b", "label": "字段B", "type": "number" }
  ]
}
```

### Remote Fields Example

```json
{
  "type": "condition-builder",
  "name": "conditions",
  "source": "/api/condition-fields"
}
```

The API response should return:

```json
{
  "data": {
    "fields": [
      { "name": "dynamic_field", "label": "动态字段", "type": "text" }
    ]
  }
}
```

### Custom Field Example

```json
{
  "type": "condition-builder",
  "name": "conditions",
  "fields": [
    {
      "name": "color",
      "label": "颜色",
      "type": "custom",
      "defaultOp": "equal",
      "defaultValue": "#ff0000",
      "operators": [
        "equal",
        { "label": "属于范围", "value": "in_range", "values": [
          { "type": "input-text", "name": "color1", "placeholder": "起始颜色" },
          { "type": "tpl", "tpl": "~" },
          { "type": "input-text", "name": "color2", "placeholder": "结束颜色" }
        ]}
      ],
      "value": { "type": "input-color" }
    }
  ]
}
```

### Formula Integration Example

```json
{
  "type": "condition-builder",
  "name": "conditions",
  "searchable": true,
  "formulas": {
    "mode": "input-group",
    "allowInput": true,
    "mixedMode": true,
    "variables": [
      {
        "label": "表单字段",
        "children": [
          { "label": "文章名", "value": "name", "tag": "文本" },
          { "label": "作者", "value": "author", "tag": "文本" },
          { "label": "售价", "value": "price", "tag": "数字" }
        ]
      }
    ]
  },
  "fields": [
    { "name": "title", "label": "标题", "type": "text" },
    { "name": "price", "label": "价格", "type": "number" }
  ]
}
```

## Component Architecture

### File Layout

```
packages/flux-renderers-form/src/renderers/condition-builder/
├── index.tsx                    # Renderer registration (RendererDefinition)
├── types.ts                     # TypeScript type definitions
├── operators.ts                 # Built-in operator map, label resolution
├── ConditionBuilder.tsx         # Root component (embed + picker mode)
├── ConditionGroup.tsx           # Group component (AND/OR logic, add/remove)
├── ConditionItem.tsx            # Item component (field + op + value)
├── ConditionLine.tsx            # GroupOrItem wrapper (drag, delete, if)
├── FieldSelect.tsx              # Field selection (list/tree/chained)
├── OperatorSelect.tsx           # Operator dropdown
├── ValueInput.tsx               # Right-side value input dispatcher
├── value-inputs/                # Type-specific value inputs
│   ├── text-input.tsx
│   ├── number-input.tsx
│   ├── date-input.tsx
│   ├── select-input.tsx
│   ├── boolean-input.tsx
│   └── custom-input.tsx
└── hooks/
    ├── use-condition-value.ts   # Value state management
    ├── use-field-resolve.ts     # Field resolution from config
    └── use-operator-resolve.ts  # Operator resolution
```

### Component Hierarchy

```
ConditionBuilder (root)
├── [PickerContainer] (non-embed mode)
│   └── ConditionGroup (root group)
│       ├── ConjunctionBar (AND/OR/NOT)
│       ├── ConditionLine[] (children)
│       │   ├── [DragHandle]
│       │   ├── ConditionGroup (nested)
│       │   │   └── ...
│       │   ├── ConditionItem (leaf)
│       │   │   ├── FieldSelect (left)
│       │   │   ├── OperatorSelect (middle)
│       │   │   └── ValueInput (right)
│       │   │       └── [type-specific input]
│       │   ├── [IfTrigger] (showIf)
│       │   └── [DeleteButton]
│       └── Toolbar (add condition, add group)
```

### Renderer Registration

The condition builder registers as a standard `RendererDefinition`:

```typescript
export const conditionBuilderDefinition: RendererDefinition = {
  type: 'condition-builder',
  component: ConditionBuilderRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema) { return schema.name; },
    collectRules(schema) {
      const rules: ValidationRule[] = [];
      if (schema.required) {
        rules.push({ kind: 'required', message: '请至少添加一个有效条件' });
      }
      return rules;
    },
  },
  wrap: true,
};
```

Complex value validation will use `RuntimeFieldRegistration` to register a custom validator that checks whether any condition item has a complete `left + op + right` triplet.

### State Management

The condition builder is a controlled component — its value flows through the form's `name` binding:

- `useBoundFieldValue(name, currentForm)` reads the current `ConditionGroupValue`
- `currentForm.setValue(name, nextValue)` writes changes
- The component handles all internal mutations (add/remove/change items, conjunction toggles) and calls `setValue` on each change

No internal Zustand store is needed — the form runtime owns the value.

### Drag and Drop

Use a lightweight approach:

- **Option A**: Native HTML drag-and-drop (like AMIS), with `data-id` attributes for identification
- **Option B**: `@dnd-kit/core` for better accessibility and touch support

Recommendation: **Option A** for initial implementation, with a note that Option B can be adopted later. The drag logic is self-contained within the builder and does not need to interact with external state.

### Remote Field Loading

When `source` is provided:

1. On mount, the component resolves the source through the scope's data source mechanism
2. The API response's `fields` key (or root if no `fields` key) becomes the field configuration
3. While loading, the builder is disabled with a loading indicator
4. The resolved fields are cached for the component's lifetime
5. If `source` is a pure variable expression (e.g. `"${fieldConfig}"`), it resolves from scope data reactively

## Visual Design

### Design Principles

1. **Card-based grouping** — each condition group is visually distinct with a rounded card
2. **Pill-style conjunction** — AND/OR toggle uses a compact pill button, not a full dropdown
3. **Clear hierarchy** — indentation + left border for nested groups
4. **Inline editing** — all editing happens inline, no modal popups (except picker mode)
5. **Smooth interactions** — subtle transitions on hover, collapse/expand

### Layout: Full Mode

```
┌─────────────────────────────────────────────────────┐
│  [▼] [AND ▾]                                        │  ← Conjunction bar
│  ┌─────────────────────────────────────────────────┐ │
│  │ ⠿  [字段A ▾]  [等于 ▾]  [值输入___]    ✕  🔥  │ │  ← Condition item
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ⠿  [字段B ▾]  [大于 ▾]  [值输入___]    ✕      │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────┐   │
│  │ │ [OR ▾]                                      │   │  ← Nested group
│  │ │ [字段C ▾] [等于 ▾] [值输入___]        ✕    │   │
│  │ │ [字段D ▾] [包含 ▾] [值输入___]        ✕    │   │
│  │ └─────────────────────────────────────────────┘   │
│  └───────────────────────────────────────────────┘   │
│  [+ 添加条件]  [+ 添加条件组]                         │  ← Toolbar
└─────────────────────────────────────────────────────┘
```

### Layout: Simple Mode

```
┌─────────────────────────────────────────────────────┐
│  [AND ▾]                                             │  ← showANDOR toggle (optional)
│  ┌─────────────────────────────────────────────────┐ │
│  │  [字段A ▾]  [等于 ▾]  [值输入___]         ✕    │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  [字段B ▾]  [大于 ▾]  [值输入___]         ✕    │ │
│  └─────────────────────────────────────────────────┘ │
│  [+ 添加条件]                                         │  ← No group button
└─────────────────────────────────────────────────────┘
```

### Styling Conventions

Per `docs/architecture/styling-system.md`:

- Use marker classes (`nop-condition-builder`, `nop-cb-group`, `nop-cb-item`) for external targeting
- Use Tailwind utility classes for all visual styling — no custom CSS file
- Spacing follows `stack-*`/`hstack-*` conventions where applicable
- Use shadcn/ui components: `Select`, `Popover`, `Button`, `Input`, `Badge`, `Collapsible`
- No implicit layout injection from the renderer — all spacing is explicit

### Tailwind Classes (Reference)

```tsx
// Group card
<div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">

// Conjunction bar
<div className="flex items-center gap-2 mb-2">
  <button className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
    bg-primary/10 text-primary hover:bg-primary/20 transition-colors">

// Condition item row
<div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2
  hover:shadow-sm transition-shadow group">

// Drag handle
<div className="cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100
  transition-opacity">

// Delete button
<button className="text-muted-foreground hover:text-destructive transition-colors
  opacity-0 group-hover:opacity-100">

// Toolbar
<div className="flex items-center gap-4 pt-2">
  <button className="text-sm text-primary hover:text-primary/80 transition-colors">
```

## Configuration Reference

### ConditionBuilderSchema Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `'condition-builder'` | required | Renderer type identifier |
| `name` | `string` | required | Form field name for value binding |
| `fields` | `ConditionField[]` | `[]` | Field definitions. Required unless `source` is set. |
| `source` | `string \| ApiObject` | — | Remote field config endpoint or variable expression |
| `builderMode` | `'full' \| 'simple'` | `'full'` | Full mode supports nested groups; simple mode is flat |
| `embed` | `boolean` | `true` | `true` = inline; `false` = popup picker mode |
| `title` | `string` | — | Popup title for picker mode |
| `selectMode` | `'list' \| 'tree' \| 'chained'` | `'list'` | Field selection display mode |
| `searchable` | `boolean` | `false` | Enable search in field selector |
| `draggable` | `boolean` | `true` | Enable drag-and-drop reordering |
| `showANDOR` | `boolean` | `false` | Show AND/OR toggle in simple mode (always shown in full mode) |
| `showNot` | `boolean` | `false` | Show NOT toggle per group |
| `showIf` | `boolean` | `false` | Show condition trigger (if-expression) per item |
| `uniqueFields` | `boolean` | `false` | Prevent the same field from appearing in multiple conditions |
| `formulas` | `ConditionFormulaConfig` | — | Enable formula editing for value inputs |
| `formulaForIf` | `ConditionFormulaConfig` | — | Formula config for `showIf` expressions |
| `operators` | `ConditionOperatorOverrides` | — | Global operator label and set overrides |
| `addBtnVisibleOn` | `string` | — | Expression controlling "Add Condition" visibility. Variables: `depth`, `breadth` |
| `addGroupBtnVisibleOn` | `string` | — | Expression controlling "Add Group" visibility. Variables: `depth`, `breadth` |
| `placeholder` | `string` | — | Empty state placeholder text |
| `addConditionLabel` | `string` | — | Custom label for add-condition button |
| `addGroupLabel` | `string` | — | Custom label for add-group button |
| `removeConditionLabel` | `string` | — | Custom label for remove button (accessible label) |
| `removeGroupLabel` | `string` | — | Custom label for remove-group button (accessible label) |
| `maxDepth` | `number` | — | Maximum nesting depth for groups |
| `maxItemsPerGroup` | `number` | — | Maximum conditions per group |
| `required` | `boolean` | `false` | Require at least one complete condition |

### ConditionField Properties (Common)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | required | Field identifier |
| `label` | `string` | required | Display label |
| `type` | `ConditionFieldType` | required | Field data type |
| `placeholder` | `string` | — | Input placeholder |
| `operators` | `(string \| CustomOperator)[]` | built-in per type | Override available operators |
| `defaultOp` | `string` | built-in per type | Default operator when field is selected |
| `defaultValue` | `unknown` | — | Default value when field is selected |
| `disabled` | `boolean` | `false` | Disable this field in the selector |
| `valueTypes` | `('value' \| 'field' \| 'func')[]` | `['value']` | Allowed value input modes |

### ConditionField Properties (Type-Specific)

| Property | Field Types | Description |
|----------|-------------|-------------|
| `minLength` / `maxLength` | `text` | String length constraints |
| `minimum` / `maximum` / `step` / `precision` | `number` | Numeric constraints |
| `format` / `inputFormat` | `date`, `time`, `datetime` | Date/time format strings |
| `minDate` / `maxDate` | `date`, `datetime` | Date range boundaries |
| `minTime` / `maxTime` | `time` | Time range boundaries |
| `timeFormat` | `datetime` | Time portion format |
| `options` | `select` | Static options |
| `source` | `select` | Dynamic options from API |
| `searchable` | `select` | Enable search in select |
| `multiple` | `select` | Allow multiple selection |
| `autoComplete` | `select` | Auto-complete API |
| `maxTagCount` | `select` | Max visible tags in multi-select |
| `trueLabel` / `falseLabel` | `boolean` | Custom boolean labels |
| `value` | `custom` | Schema for custom value renderer |

## Operator Reference

### Built-in Operators

| Operator | Label (zh-CN) | Applicable Types | Value Required |
|----------|---------------|-------------------|----------------|
| `equal` | 等于 | text, number, date, time, datetime, boolean, custom | Yes |
| `not_equal` | 不等于 | text, number, date, time, datetime, boolean, custom | Yes |
| `less` | 小于 | number, date, time, datetime | Yes |
| `less_or_equal` | 小于等于 | number, date, time, datetime | Yes |
| `greater` | 大于 | number, date, time, datetime | Yes |
| `greater_or_equal` | 大于等于 | number, date, time, datetime | Yes |
| `between` | 范围内 | number, date, time, datetime | Yes (array of 2) |
| `not_between` | 范围外 | number, date, time, datetime | Yes (array of 2) |
| `is_empty` | 为空 | text, number, date, time, datetime | No |
| `is_not_empty` | 不为空 | text, number, date, time, datetime | No |
| `like` | 包含 | text | Yes |
| `not_like` | 不包含 | text | Yes |
| `starts_with` | 开头是 | text | Yes |
| `ends_with` | 结尾是 | text | Yes |
| `select_equals` | 等于 | select | Yes |
| `select_not_equals` | 不等于 | select | Yes |
| `select_any_in` | 包含任意 | select | Yes (array) |
| `select_not_any_in` | 不包含任意 | select | Yes (array) |

## Validation

### Required Validation

When `required: true`:

- The value must have at least one `children` entry
- At least one child must have a complete condition (`left` with a valid field + `op` + `right` where applicable)
- Operators `is_empty` and `is_not_empty` count as complete even without `right`

### Field Uniqueness

When `uniqueFields: true`:

- A field name cannot appear in more than one condition item
- Already-used fields are shown as disabled in the field selector
- Removing a condition re-enables its field

### Depth and Breadth Limits

When `maxDepth` is set:

- "Add Group" button is hidden when the current depth reaches `maxDepth`
- Enforced via `addGroupBtnVisibleOn` semantics

When `maxItemsPerGroup` is set:

- "Add Condition" button is hidden when the current group reaches `maxItemsPerGroup`
- Enforced via `addBtnVisibleOn` semantics

### Runtime Registration

The condition builder registers as a `RuntimeFieldRegistration`:

```typescript
{
  path: schema.name,
  getValue: () => formValue,
  validate: async () => {
    if (!schema.required) return [];
    const value = formValue as ConditionGroupValue;
    if (!hasCompleteCondition(value)) {
      return [{ path: schema.name, message: '请至少添加一个有效条件', rule: 'required' }];
    }
    return [];
  },
}
```

## Internationalization

All user-facing strings support i18n through the standard framework mechanism:

- Default labels (operators, buttons) are provided in a locale map
- Schema can override any label via explicit properties (`addConditionLabel`, etc.)
- Operator labels can be overridden via `operators.labels`

Default locale keys:

```
condition-builder.add_condition = "添加条件"
condition-builder.add_group = "添加条件组"
condition-builder.remove = "删除"
condition-builder.remove_group = "删除组"
condition-builder.placeholder = "请添加筛选条件"
condition-builder.blank = "未设置条件"
condition-builder.and = "且"
condition-builder.or = "或"
condition-builder.not = "非"
condition-builder.configured = "已配置"
condition-builder.collapse = "展开"
condition-builder.op.equal = "等于"
condition-builder.op.not_equal = "不等于"
...
```

## Implementation Plan

### Phase 1: Core Structure

1. Create type definitions (`types.ts`, `operators.ts`)
2. Implement `ConditionBuilder` root with embed mode
3. Implement `ConditionGroup` with conjunction bar and toolbar
4. Implement `ConditionItem` with field/operator/value triad
5. Implement basic value input types (text, number, select, boolean)
6. Register as `RendererDefinition`

### Phase 2: Interaction Features

7. Add drag-and-drop reordering
8. Add field search
9. Add tree and chained select modes for fields
10. Add picker (non-embed) mode
11. Add collapse/expand for groups

### Phase 3: Advanced Features

12. Add date/time/datetime value inputs
13. Add formula integration
14. Add `showIf` condition trigger
15. Add custom field type support
16. Add `uniqueFields` constraint
17. Add remote field loading via `source`
18. Add `addBtnVisibleOn` / `addGroupBtnVisibleOn` expressions
19. Add `maxDepth` / `maxItemsPerGroup` enforcement

### Phase 4: Polish

20. Visual refinements and animation
21. Accessibility audit (keyboard navigation, ARIA)
22. Mobile responsiveness
23. Dark mode verification

## Related Documents

- `docs/architecture/renderer-runtime.md` — renderer component contract
- `docs/architecture/form-validation.md` — validation integration
- `docs/architecture/styling-system.md` — styling conventions
- `docs/architecture/bem-removal.md` — marker class and data-slot patterns
- `docs/references/flux-json-conventions.md` — JSON schema conventions
- `docs/architecture/api-data-source.md` — remote data loading patterns
