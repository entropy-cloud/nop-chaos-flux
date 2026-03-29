# CSS 标记与测试定位规范

## 1. 背景与目标

项目正在从 BEM CSS 迁移到 Tailwind + shadcn/ui。迁移的核心问题不是"删不删 CSS"，而是：

1. **flux renderer 体系需要一个稳定的 DOM 标记系统**，让自动化测试和 AI Agent 能定位、识别、操纵页面中的业务结构。
2. **shadcn/ui 组件已有自己的标记机制**（`data-slot`、`data-state`、`role`、`aria-*`），不需要额外包装。
3. **视觉样式完全由 Tailwind 工具类承担**，任何 class 名都不承担样式职责。

本文定义：什么标记该留、什么标记该删、新标记怎么设计、测试怎么用。

---

## 2. 标记分类体系

### 2.1 三层标记模型

```
┌─────────────────────────────────────────────────┐
│ Layer 1: shadcn/ui 原生标记（不动）               │
│   data-slot, data-state, role, aria-*            │
│   由 Radix/UI 组件自动生成                         │
├─────────────────────────────────────────────────┤
│ Layer 2: flux renderer 语义标记（保留）            │
│   nop-{renderer}  class 名                       │
│   data-field-*   data 属性                       │
│   标识 renderer 体系的业务结构                     │
├─────────────────────────────────────────────────┤
│ Layer 3: Tailwind 视觉类（替换所有 BEM 样式）      │
│   flex gap-4 rounded-xl border ...               │
│   纯视觉，不用于识别                               │
└─────────────────────────────────────────────────┘
```

**原则：Layer 2 的标记永远不包含视觉样式。** 它们只回答"这是什么业务结构"和"它处于什么状态"两个问题。

---

## 3. Layer 1: shadcn/ui 原生标记（只读）

shadcn/ui 组件（`@nop-chaos/ui`）已提供完整的识别机制。测试和 AI Agent 直接使用这些属性，**不包装、不覆盖**。

### 3.1 `data-slot` — 组件身份识别

每个 shadcn/ui 组件在根元素上设置 `data-slot`，值等于组件的 kebab-case 名称：

| 组件 | `data-slot` |
|---|---|
| `<Checkbox>` | `"checkbox"` |
| `<Checkbox Indicator>` | `"checkbox-indicator"` |
| `<Switch>` | `"switch"` |
| `<Switch Thumb>` | `"switch-thumb"` |
| `<RadioGroup>` | `"radio-group"` |
| `<RadioGroupItem>` | `"radio-group-item"` |
| `<Input>` | `"input"` |
| `<Textarea>` | `"textarea"` |
| `<Select>` | `"select"` |
| `<SelectTrigger>` | `"select-trigger"` |
| `<SelectContent>` | `"select-content"` |
| `<SelectItem>` | `"select-item"` |
| `<Button>` | `"button"` |
| `<Label>` | `"label"` |
| `<Badge>` | `"badge"` |
| `<Card>` | `"card"` |
| `<CardHeader>` | `"card-header"` |
| `<CardContent>` | `"card-content"` |
| `<Dialog>` | `"dialog"` |
| `<DialogContent>` | `"dialog-content"` |
| `<DialogOverlay>` | `"dialog-overlay"` |
| `<DialogTitle>` | `"dialog-title"` |
| `<DialogClose>` | `"dialog-close"` |
| `<Table>` | `"table"` |
| `<TableHeader>` | `"table-header"` |
| `<TableBody>` | `"table-body"` |
| `<TableRow>` | `"table-row"` |
| `<TableHead>` | `"table-head"` |
| `<TableCell>` | `"table-cell"` |
| `<Tabs>` | `"tabs"` |
| `<TabsList>` | `"tabs-list"` |
| `<TabsTrigger>` | `"tabs-trigger"` |
| `<TabsContent>` | `"tabs-content"` |
| `<Tooltip>` | `"tooltip"` |
| `<TooltipContent>` | `"tooltip-content"` |

### 3.2 `data-state` — 交互状态

由 Radix 运行时自动管理，CSS 通过 `data-[state=...]` 响应：

| 组件 | 可能的 `data-state` |
|---|---|
| Checkbox | `"checked"` / `"unchecked"` |
| Switch | `"checked"` / `"unchecked"` |
| Dialog Overlay/Content | `"open"` / `"closed"` |
| Select Content | `"open"` / `"closed"` |
| Tabs Trigger | `"active"` / `"inactive"` |
| Tooltip Content | `"open"` / `"closed"` |
| Table Row | `"selected"`（消费者设置） |

### 3.3 `role` — 无障碍语义角色

由 Radix 隐式设置，用于 `getByRole()` 查询：

| 组件 | `role` |
|---|---|
| Checkbox | `"checkbox"` |
| Switch | `"switch"` |
| RadioGroup | `"radiogroup"` |
| RadioGroupItem | `"radio"` |
| Dialog Content | `"dialog"` |
| Select Trigger | `"combobox"` |
| Select Content | `"listbox"` |
| Select Item | `"option"` |
| Tabs List | `"tablist"` |
| Tabs Trigger | `"tab"` |
| Tabs Content | `"tabpanel"` |
| Tooltip Content | `"tooltip"` |

### 3.4 `aria-invalid` — 验证错误状态

**这是 shadcn/ui 体系中表达"字段无效"的标准方式。** 组件自身不设置此属性，由消费者传入。组件通过 CSS 响应：

```css
aria-invalid:border-destructive
aria-invalid:ring-destructive/20
```

支持 `aria-invalid` 的组件：Checkbox、RadioGroupItem、Input、Textarea、SelectTrigger、Button、Badge。

### 3.5 结论：不需要 BEM 包装

以下 BEM 类全部删除，shadcn/ui 已提供等价或更好的识别：

| 删除的 BEM 类 | shadcn/ui 等价 |
|---|---|
| `nop-checkbox`, `nop-checkbox__input` | `data-slot="checkbox"` + `data-state` |
| `nop-switch`, `nop-switch__input` | `data-slot="switch"` + `data-state` |
| `nop-radio-group`, `nop-radio`, `nop-radio__input` | `data-slot="radio-group"` + `role` |
| `nop-input` | `data-slot="input"` |
| `nop-textarea` | `data-slot="textarea"` |

---

## 4. Layer 2: flux renderer 语义标记

### 4.1 设计原则

**何时需要语义标记？** 满足以下任一条件：

1. **renderer 产出的业务结构**需要被测试定位（如"找到用户表单的所有字段"）
2. **结构化的 region 边界**需要被识别（如"这是 page 的 header 区域"）
3. **跨组件的状态**需要被外部观察（如"这个字段被用户改过"）
4. **AI Agent 需要理解页面语义**以决定操纵策略（如"这是一个表格，我可以点击行"）

**何时不需语义标记？**

1. shadcn/ui 组件已能识别的（见 Layer 1）
2. 纯视觉布局（间距、颜色、边框）→ 用 Tailwind
3. 只有单个组件、没有子结构的简单渲染

### 4.2 class 名命名规范

```
nop-{renderer-type}              -- renderer 根标记
nop-{renderer-type}__{region}    -- renderer 内部区域
```

**规则：**

- 前缀统一为 `nop-`，标识这是 flux renderer 体系的标记
- `{renderer-type}` 用单词、kebab-case：`field`、`page`、`form`、`table`、`container`、`dialog-host`
- `{region}` 用 `__` 双下划线分隔：`__label`、`__header`、`__body`、`__actions`
- **不加视觉信息**：不用 `__red-label`、`__large-button`
- **不加状态修饰符**：状态用 `data-*` 属性（见 4.3）
- **例外约束**：允许保留极少数语义例外（如 `nop-table__row--interactive`、`nop-dynamic-renderer--error`），仅表达结构能力，不承载视觉样式；不再新增其他 `--` 修饰符。

### 4.3 状态用 `data-*` 属性，不用 class

**为什么？**

1. **行业通行做法**：`aria-*` 和 `data-*` 是表达元素状态的标准方式。Playwright 推荐 `data-testid`；Testing Library 推荐 `role` + `aria-*`；Radix/shadcn 用 `data-state`。
2. **shadcn/ui 一致性**：shadcn 组件用 `data-state`、`aria-invalid`、`data-variant` 表达状态。flux renderer 的自定义状态应遵循同一模式。
3. **AI Agent 最自然的方式**：大模型理解 `data-field-dirty`（属性存在）比 `className` 中解析 `nop-field--dirty` 更直接。`data-*` 属性是 key-value 对，不需要字符串匹配。
4. **Tailwind 兼容**：Tailwind 原生支持 `data-[field-dirty]:border-orange-300` 变体，不需要额外 CSS 规则。
5. **测试更清晰**：`el.hasAttribute('data-field-dirty')` 比 `el.className.includes('nop-field--dirty')` 语义更明确。

**规范格式：**

```
data-field-{state}           -- 顶层字段状态
data-child-field-{state}     -- 子字段状态（key-value、array-editor 的行级状态）
```

| 属性 | 含义 | 设置时机 |
|---|---|---|
| `data-field-visited` | 用户聚焦过此字段 | `onFocus` |
| `data-field-touched` | 用户修改过此字段后离开 | `onBlur` after change |
| `data-field-dirty` | 字段值与初始值不同 | value !== initial |
| `data-field-invalid` | 字段验证失败且错误应显示 | error && showError condition met |
| `data-child-field-visited` | 子字段被聚焦 | child onFocus |
| `data-child-field-touched` | 子字段被修改后离开 | child onBlur after change |
| `data-child-field-dirty` | 子字段值已变化 | child value !== initial |
| `data-child-field-invalid` | 子字段验证失败 | child error && showError |

**属性值约定**：在本项目中按“presence-only”使用 `data-*` 状态属性——存在即表示 true，缺失即表示 false。

```html
<!-- 正确 -->
<label class="nop-field" data-field-visited data-field-dirty data-field-invalid>

<!-- 不需要 -->
<label class="nop-field" data-field-visited="true" data-field-dirty="true">
```

在 React JSX 中，推荐写法为：

```tsx
<label
  data-field-visited={fieldState.visited ? '' : undefined}
  data-field-dirty={fieldState.dirty ? '' : undefined}
  data-field-invalid={showError ? '' : undefined}
/>
```

### 4.4 `testid` — schema-driven test anchoring

每个 renderer 通过 `BaseSchema.testid` 字段支持 `data-testid` DOM 属性。Schema author 在 JSON 中声明 `testid`，编译后通过 `ResolvedNodeMeta.testid` 传递给 renderer，renderer 在根元素上输出 `data-testid={testid}`。

**与 `id` / `name` 的区别：**

| 字段 | 职责 | DOM 属性 |
|------|------|----------|
| `id` | 组件身份标识（React key、scope 命名、组件寻址） | 不渲染到 DOM |
| `name` | 数据绑定路径（表单字段读写、校验路径） | 不渲染到 DOM |
| `testid` | 测试定位锚点（自动化测试查找 DOM 元素） | `data-testid="..."` |

**用法示例：**

```json
{
  "type": "form",
  "testid": "login-form",
  "body": [
    { "type": "input-text", "name": "username", "label": "Username", "testid": "username-input" },
    { "type": "input-text", "name": "password", "label": "Password", "testid": "password-input" }
  ]
}
```

```typescript
// 测试中
screen.getByTestId('login-form');
screen.getByLabelText('Username');
```

**Renderer 约定：** 所有 renderer 必须在根元素上应用 `data-testid={props.meta.testid || undefined}`。当 `testid` 为空时，不输出 `data-testid` 属性。

### 4.5 完整的语义标记清单

#### 结构标记（class 名）

| 标记 | 所在组件 | 含义 |
|---|---|---|
| `nop-field` | `FieldFrame` | 字段包装器 |
| `nop-field__label` | `FieldFrame` / `FieldLabel` | 字段标签 |
| `nop-field__control` | `FieldFrame` | 控件容器 |
| `nop-field__error` | `FieldFrame` / `FieldError` | 错误消息 |
| `nop-field__hint` | `FieldFrame` / `FieldHelpText` | 提示文本 |
| `nop-field__description` | `FieldFrame` | 字段描述 |
| `nop-field__required` | `FieldFrame` | 必填标记 |
| `nop-page` | `PageRenderer` | 页面根 |
| `nop-page__header` | `PageRenderer` | 页面标题区 |
| `nop-page__toolbar` | `PageRenderer` | 页面工具栏区 |
| `nop-page__body` | `PageRenderer` | 页面主体区 |
| `nop-page__footer` | `PageRenderer` | 页面底部区 |
| `nop-form` | `FormRenderer` | 表单根 |
| `nop-form__body` | `FormRenderer` | 表单主体区 |
| `nop-form__actions` | `FormRenderer` | 表单操作区 |
| `nop-container` | `ContainerRenderer` | 容器根 |
| `nop-container__header` | `ContainerRenderer` | 容器头部区 |
| `nop-container__footer` | `ContainerRenderer` | 容器底部区 |
| `nop-table-wrap` | `TableRenderer` | 表格外包装 |
| `nop-table` | `TableRenderer` | `<table>` 元素 |
| `nop-table__header` | `TableRenderer` | `<thead>` 区域 |
| `nop-table__footer` | `TableRenderer` | `<tfoot>` 区域 |
| `nop-table__row` | `TableRenderer` | 数据行 `<tr>` |
| `nop-table__row--interactive` | `TableRenderer` | 可点击行（保留，既是语义标记也暗示交互能力） |
| `nop-table__empty-row` | `TableRenderer` | 空数据行 |
| `nop-table__empty-cell` | `TableRenderer` | 空数据单元格 |
| `nop-table__actions` | `TableRenderer` | 行操作按钮容器 |
| `nop-dialog-host` | `DialogHost` | 对话框宿主层 |
| `nop-dialog-backdrop` | `DialogHost` | 对话框遮罩 |
| `nop-dialog-card` | `DialogHost` | 对话框内容卡片 |
| `nop-dialog-close` | `DialogHost` | 对话框关闭按钮 |
| `nop-text` | `TextRenderer` | 文本渲染器 |
| `nop-flex` | `FlexRenderer` | 弹性布局渲染器 |
| `nop-icon` | `IconRenderer` | 图标渲染器 |
| `nop-dynamic-renderer` | `DynamicRenderer` | 动态渲染器 |
| `nop-dynamic-renderer--error` | `DynamicRenderer` | 动态渲染器错误态 |
| `nop-report-designer` | ReportDesignerRenderers | 报表设计器根 |
| `nop-report-designer__*` | ReportDesignerRenderers | 报表设计器子区域 |
| `nop-designer` | `DesignerPageRenderer` | 流程设计器根 |
| `nop-designer__header` | `DesignerPageRenderer` | 工具栏区域容器 |
| `nop-designer__palette` | `DesignerPageRenderer` | 节点面板列 |
| `nop-designer__canvas` | `DesignerPageRenderer` | 画布列 |
| `nop-designer__inspector` | `DesignerPageRenderer` | 属性面板列 |
| `nop-designer-toolbar` | `DesignerToolbarContent` | 工具栏（含按钮、标题、徽章） |
| `nop-palette` | `DesignerPaletteContent` | 节点面板内容根 |
| `nop-palette__group-header` | `DesignerPaletteContent` | 面板分组标题 |
| `nop-palette__item` | `DesignerPaletteContent` | 面板节点项 |
| `nop-inspector` | `DefaultInspector` | 属性面板内容根 |
| `nop-designer-node` | `DesignerXyflowNode` | 画布上的节点包装器 |
| `nop-designer-node-toolbar` | `DesignerXyflowNode` | 节点悬停工具栏 |
| `nop-designer-edge__label` | `DesignerXyflowEdge` | 边标签 |
| `nop-designer-edge__actions` | `DesignerXyflowEdge` | 边悬停快捷操作 |

#### 状态标记（`data-*` 属性）

| 属性 | 所在组件 | 对应旧 BEM |
|---|---|---|
| `data-field-visited` | `FieldFrame` | `nop-field--visited` |
| `data-field-touched` | `FieldFrame` | `nop-field--touched` |
| `data-field-dirty` | `FieldFrame` | `nop-field--dirty` |
| `data-field-invalid` | `FieldFrame` | `nop-field--invalid` |
| `data-child-field-visited` | `field-utils` → `key-value.tsx` `array-editor.tsx` | `nop-child-field--visited` |
| `data-child-field-touched` | `field-utils` → `key-value.tsx` `array-editor.tsx` | `nop-child-field--touched` |
| `data-child-field-dirty` | `field-utils` → `key-value.tsx` `array-editor.tsx` | `nop-child-field--dirty` |
| `data-child-field-invalid` | `field-utils` → `key-value.tsx` `array-editor.tsx` | `nop-child-field--invalid` |

---

## 5. Layer 3: Tailwind 视觉类

**所有 BEM CSS 规则删除。** 视觉样式通过 Tailwind 工具类写在组件 JSX 中。

### 5.1 状态驱动的视觉样式

字段状态（dirty/invalid）的视觉反馈通过 Tailwind `data-*` 变体实现：

```tsx
<label
  className="nop-field grid gap-2"
  data-field-visited={fieldState.visited ? '' : undefined}
  data-field-dirty={fieldState.dirty ? '' : undefined}
  data-field-invalid={showError ? '' : undefined}
>
```

在 Tailwind 配置中（或通过 `@custom-variant`）：

```css
/* 如果需要全局状态样式，在 tailwind base 层定义 */
@layer utilities {
  [data-field-dirty] [data-slot="input"],
  [data-field-dirty] [data-slot="textarea"] {
    @apply border-orange-400;
  }
  [data-field-invalid] [data-slot="input"],
  [data-field-invalid] [data-slot="textarea"] {
    @apply border-destructive ring-destructive/20;
  }
}
```

这取代了旧的 BEM 规则：
```css
/* 删除 */
.nop-field--dirty .nop-input { border-color: var(--nop-dirty-border); }
.nop-field--invalid .nop-input { border-color: var(--nop-invalid-border); box-shadow: 0 0 0 3px var(--nop-invalid-ring); }
```

### 5.2 已删除的纯视觉 BEM 类 → Tailwind 替换示例

| 旧 BEM 类 | Tailwind 替换 |
|---|---|
| `.nop-field { display: grid; gap: 8px }` | `className="grid gap-2"` |
| `.nop-form__actions { display: flex; flex-wrap: wrap; gap: 12px }` | `className="flex flex-wrap gap-3"` |
| `.nop-tag-list { display: flex; flex-wrap: wrap; gap: 10px }` | `className="flex flex-wrap gap-2.5"` |
| `.nop-kv-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px }` | `className="grid grid-cols-[1fr_1fr_auto] gap-2.5"` |
| `.nop-dialog-backdrop { position: fixed; inset: 0; ... }` | 用 shadcn `<DialogOverlay>` |
| `.nop-dialog-card { width: min(560px, calc(100vw - 32px)); ... }` | 用 shadcn `<DialogContent>` |
| `.hero-card { max-width: 720px; padding: 40px; ... }` | 用 shadcn `<Card>` + Tailwind |

---

## 6. 自动化测试定位规范

### 6.1 优先级体系（从高到低）

| 优先级 | 策略 | 适用场景 | 示例 |
|---|---|---|---|
| 1 | `getByRole` + `name` | 交互控件（按钮、输入框、选择器） | `getByRole('button', { name: 'Submit' })` |
| 2 | `getByLabelText` | 表单字段（关联 label 的输入） | `getByLabelText('Email')` |
| 3 | `getByTestId` | Schema 中声明了 `testid` 的业务节点 | `getByTestId('login-form')` |
| 4 | `getByTestId` | 没有角色/标签的内部探针节点 | `getByTestId('form-state:flags')` |
| 5 | 语义 class + `closest()` | renderer 结构定位 | `input.closest('.nop-field')` |
| 6 | `data-*` 属性 | 状态断言 | `el.hasAttribute('data-field-dirty')` |

**AI Agent 最自然的方式是优先级 1-3**，因为它们直接描述"用户看到和操作的元素"。

### 6.2 按 renderer 类型的定位指南

#### 页面结构定位

```typescript
// 找到页面根
const page = container.querySelector('.nop-page');

// 找到页面的标题区
const header = page.querySelector('.nop-page__header');

// 找到页面主体
const body = page.querySelector('.nop-page__body');

// 找到页面底部
const footer = page.querySelector('.nop-page__footer');
```

#### 表单定位

```typescript
// 找到表单根
const form = container.querySelector('.nop-form');

// 找到表单操作区
const actions = form.querySelector('.nop-form__actions');

// 通过 role 找到提交按钮
const submitButton = screen.getByRole('button', { name: 'Submit' });
```

#### 字段定位

```typescript
// 方式 1：通过 label 文本找到输入框（最推荐）
const emailInput = screen.getByLabelText('Email');

// 方式 2：向上遍历到字段包装器
const field = emailInput.closest('.nop-field');

// 方式 3：在字段内找到标签、错误、提示
const label = field.querySelector('.nop-field__label');
const error = field.querySelector('.nop-field__error');
const hint = field.querySelector('.nop-field__hint');
```

#### 字段状态断言

```typescript
// 旧方式（删除）
expect(field.className).toContain('nop-field--dirty');
expect(field.className).toContain('nop-field--invalid');

// 新方式
expect(field.hasAttribute('data-field-dirty')).toBe(true);
expect(field.hasAttribute('data-field-invalid')).toBe(true);
expect(field.hasAttribute('data-field-touched')).toBe(true);
expect(field.hasAttribute('data-field-visited')).toBe(true);
```

#### 子字段（key-value / array-editor）定位

```typescript
// 找到子字段包装器
const childField = input.closest('[data-child-field-dirty]');

// 断言子字段状态
expect(childField.hasAttribute('data-child-field-dirty')).toBe(true);
expect(childField.hasAttribute('data-child-field-invalid')).toBe(true);
```

#### 表格定位

```typescript
// 找到表格外包装
const tableWrap = container.querySelector('.nop-table-wrap');

// 找到表格本身
const table = tableWrap.querySelector('.nop-table');

// 找到所有数据行
const rows = table.querySelectorAll('.nop-table__row');

// 找到可点击的行
const interactiveRows = table.querySelectorAll('.nop-table__row--interactive');

// 找到行内的操作按钮容器
const rowActions = row.querySelector('.nop-table__actions');
```

#### 对话框定位

```typescript
// 找到对话框宿主
const host = container.querySelector('.nop-dialog-host');

// 找到遮罩层
const backdrop = host.querySelector('.nop-dialog-backdrop');

// 找到内容卡片
const card = host.querySelector('.nop-dialog-card');

// 关闭按钮
const closeBtn = screen.getByRole('button', { name: 'Close' });
```

#### shadcn/ui 控件操作

```typescript
// Checkbox
const checkbox = screen.getByRole('checkbox', { name: 'Agree' });
fireEvent.click(checkbox);
expect(checkbox.getAttribute('data-state')).toBe('checked');

// Switch
const switchEl = screen.getByRole('switch');
fireEvent.click(switchEl);
expect(switchEl.getAttribute('data-state')).toBe('checked');

// Radio
fireEvent.click(screen.getByRole('radio', { name: 'Published' }));

// Select
fireEvent.click(screen.getByRole('combobox')); // 打开下拉
fireEvent.click(screen.getByRole('option', { name: 'Admin' })); // 选择

// Input
const input = screen.getByLabelText('Email');
fireEvent.change(input, { target: { value: 'test@example.com' } });
expect(input).toHaveAttribute('aria-invalid'); // 验证失败时

// Dialog
expect(screen.getByRole('dialog')).toBeVisible();
```

### 6.3 AI Agent 操纵指南

AI 大模型（如 GPT、Claude）通过 Playwright/Puppeteer 操纵页面时，最自然的定位方式：

| 想做什么 | 怎么定位 | 怎么操纵 |
|---|---|---|
| 点击按钮 | `getByRole('button', { name: 'xxx' })` | `click()` |
| 填写输入框 | `getByLabelText('字段名')` | `fill(value)` |
| 勾选复选框 | `getByRole('checkbox', { name: 'xxx' })` | `click()` → 检查 `data-state` |
| 切换开关 | `getByRole('switch')` | `click()` → 检查 `data-state` |
| 选择下拉项 | `getByRole('combobox')` → `getByRole('option', { name: 'xxx' })` | `click()` |
| 提交表单 | `getByRole('button', { name: 'Submit' })` | `click()` |
| 关闭对话框 | `getByRole('button', { name: 'Close' })` 或 `press('Escape')` | `click()` / `press()` |
| 检查字段错误 | 定位到 `closest('.nop-field')` → 检查 `data-field-invalid` | 观察属性 |
| 检查字段脏数据 | 同上 → 检查 `data-field-dirty` | 观察属性 |
| 阅读错误消息 | `.nop-field__error` 的 textContent | 读取文本 |
| 点击表格行 | `.nop-table__row--interactive` | `click()` |
| 点击行操作按钮 | 行内 `.nop-table__actions` 中的按钮 | `click()` |
| 识别页面结构 | `.nop-page` → `.nop-page__header/body/footer` | 遍历 |
| 识别表单结构 | `.nop-form` → `.nop-form__body/actions` | 遍历 |

---

## 7. 实现变更清单

### 7.1 `field-frame.tsx` 变更

**Before:**
```tsx
const stateClasses = [
  'nop-field',
  fieldState.visited ? 'nop-field--visited' : '',
  fieldState.touched ? 'nop-field--touched' : '',
  fieldState.dirty ? 'nop-field--dirty' : '',
  showError ? 'nop-field--invalid' : ''
].filter(Boolean).join(' ');

<Tag className={mergedClassName}>
```

**After:**
```tsx
<Tag
  className={classNames('nop-field grid gap-2', className)}
  data-field-visited={fieldState.visited ? '' : undefined}
  data-field-touched={fieldState.touched ? '' : undefined}
  data-field-dirty={fieldState.dirty ? '' : undefined}
  data-field-invalid={showError ? '' : undefined}
>
```

### 7.2 `field-utils.tsx` 变更

**`getFieldClassName`** → 删除，改为直接在 `FieldFrame` 上设 `data-*` 属性。

**`getChildFieldUiState`** — 返回类型变更：

**Before:**
```tsx
return {
  error, touched, dirty, visited, showError,
  className: ['nop-child-field', ...modifiers].filter(Boolean).join(' ')
};
```

**After:**
```tsx
return {
  error, touched, dirty, visited, showError,
  className: 'grid gap-1.5',
  'data-child-field-visited': visited || undefined,
  'data-child-field-touched': touched || undefined,
  'data-child-field-dirty': dirty || undefined,
  'data-child-field-invalid': showError || undefined,
};
```

消费方变更：
```tsx
// Before
<div className={childUi.className}>

// After
<div className={childUi.className} data-child-field-visited={childUi['data-child-field-visited']} ...>
```

或更优雅地定义一个 `DataSet` 类型：
```tsx
type ChildFieldDataAttrs = {
  'data-child-field-visited'?: '';
  'data-child-field-touched'?: '';
  'data-child-field-dirty'?: '';
  'data-child-field-invalid'?: '';
};
```

### 7.3 删除的 BEM wrapper

| 文件 | 删除的类 | 替换 |
|---|---|---|
| `input.tsx` | `nop-checkbox`, `nop-checkbox__input`, `nop-checkbox__label` | `inline-flex items-center gap-2.5` |
| `input.tsx` | `nop-switch`, `nop-switch__input`, `nop-switch__label` | `inline-flex items-center gap-3` |
| `input.tsx` | `nop-radio-group`, `nop-radio`, `nop-radio__input`, `nop-radio__label` | `grid gap-2.5` + `inline-flex items-center gap-2.5` |
| `input.tsx` | `nop-checkbox-group` | `grid gap-2.5` |
| `key-value.tsx` | `nop-input`, `nop-kv-row`, `nop-kv-list`, `nop-kv-add`, `nop-kv-remove` | Tailwind grid/flex + `<Button>` |
| `array-editor.tsx` | `nop-input`, `nop-array-editor`, `nop-array-editor__row`, `nop-kv-add`, `nop-kv-remove` | Tailwind grid/flex + `<Button>` |
| `tag-list.tsx` | `nop-tag`, `nop-tag--active`, `nop-tag-list` | `<Button variant>` + `flex flex-wrap gap-2.5` |
| `dialog-host.tsx` | 重构为使用 shadcn `<Dialog>` 组件 | `<Dialog>`, `<DialogContent>`, `<DialogClose>` |
| `table-renderer.tsx` | 重构为使用 shadcn `<Table>` 组件 | `<Table>`, `<TableHeader>`, `<TableBody>`, etc. |

### 7.4 CSS 文件处理

| 文件 | 操作 |
|---|---|
| `apps/playground/src/styles.css` | 保留 `@import "tailwindcss"`, `@theme inline`, `:root` CSS vars, `.nop-theme-root` vars, `*`, `body`, `#root` 重置。删除所有 BEM 规则 |
| `packages/flow-designer-renderers/src/styles.css` | 整文件删除 |
| `packages/report-designer-renderers/src/styles.css` | 整文件删除 |
| `packages/tailwind-preset/` | 保留全部 |
| `packages/ui/src/styles/` | 保留全部 |

### 7.5 测试断言迁移

| 旧断言 | 新断言 |
|---|---|
| `field.className.toContain('nop-field--visited')` | `field.hasAttribute('data-field-visited')` |
| `field.className.toContain('nop-field--dirty')` | `field.hasAttribute('data-field-dirty')` |
| `field.className.toContain('nop-field--touched')` | `field.hasAttribute('data-field-touched')` |
| `field.className.toContain('nop-field--invalid')` | `field.hasAttribute('data-field-invalid')` |
| `childField.className.toContain('nop-child-field--dirty')` | `childField.hasAttribute('data-child-field-dirty')` |
| `childField.className.toContain('nop-child-field--invalid')` | `childField.hasAttribute('data-child-field-invalid')` |
| `el.className.toContain('nop-field__error')` | 不变，`nop-field__error` 保留 |
| `el.className.toContain('nop-field__hint')` | 不变，`nop-field__hint` 保留 |
| `input.closest('.nop-field')` | 不变 |
| `input.closest('.nop-child-field')` | 改为 `input.closest('[data-child-field-dirty]')` 或保持结构查询 |
| `el.className.toContain('nop-field')` | 不变 |
| `el.className.toContain('nop-input')` | 改为 `el.getAttribute('data-slot') === 'input'` |

---

## 8. 新增语义标记的设计流程

未来在 flux renderer 体系中新增 renderer 时，按以下流程决定是否需要语义标记：

```
新增 renderer
  │
  ├─ 是否产出有业务含义的 DOM 结构？
  │   ├─ 否 → 不加标记，用 Tailwind
  │   └─ 是 ↓
  │
  ├─ shadcn/ui 组件已能标识？
  │   ├─ 是 → 不加标记，用 data-slot/role
  │   └─ 否 ↓
  │
  ├─ 是否需要被测试定位？
  │   ├─ 否 → 不加标记
  │   └─ 是 ↓
  │
  └─ 添加语义标记
      class="nop-{renderer-type}"        ← 结构
      class="nop-{renderer-type}__{region}" ← 区域
      data-field-{state}                 ← 状态（如果有）
```

**命名审批清单**（代码 review 时检查）：

- [ ] 前缀是否为 `nop-`？
- [ ] 是否只有结构/区域信息，没有视觉描述？
- [ ] 是否有对应的 shadcn/ui 组件可以替代？
- [ ] 状态是否用了 `data-*` 而非 class 修饰符？
- [ ] 在测试中使用是否比 `getByRole`/`getByLabelText` 更合适？
