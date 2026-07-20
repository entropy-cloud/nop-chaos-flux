# 主题与样式

> Flux 主题是 **纯 CSS 契约**：**没有** `ThemeProvider`、`useTheme`、`setTheme` 等 runtime API（这是显式 Non-Goal，见 `docs/architecture/theme-compatibility.md`）。宿主通过 CSS 变量、`data-*` 属性、Tailwind preset 切换主题，flux 渲染器自身只读 CSS 变量与固定 marker/slot 类。

---

## 三层 CSS

| 层                  | 来源                                 | 作用                                                                                         |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| **基础 tokens**     | `@nop-chaos/theme-tokens/styles.css` | shadcn 风格 CSS 变量（`--primary`、`--background` 等，**无 `--flux-` 前缀**）+ 4 个主题变体  |
| **Tailwind preset** | `@nop-chaos/tailwind-preset`         | 把 Tailwind 颜色/圆角/阴影 utility 映射到 `hsl(var(--token))`；含 `tailwindcss-animate`      |
| **包内局部变量**    | 各包 `*.css`                         | `--nop-*`（app/playground/code-editor/notice-bar 等）、`--fd-*`（flow-designer）等 namespace |

---

## CSS 变量

### 通用 `:root`（`packages/theme-tokens/src/styles.css:1-69`）

- **颜色（HSL 三元组）**：`--background` / `--foreground` / `--card` / `--card-foreground` / `--popover` / `--popover-foreground` / `--muted` / `--muted-foreground` / `--accent` / `--accent-foreground` / `--border` / `--input` / `--ring` / `--primary` / `--primary-foreground`
- **侧栏**：`--sidebar` / `--sidebar-foreground` / `--sidebar-primary` / `--sidebar-primary-foreground` / `--sidebar-accent` / `--sidebar-accent-foreground` / `--sidebar-border` / `--sidebar-ring`
- **危险/语义**：`--destructive` / `--destructive-foreground`
- **表面（rgba）**：`--surface-primary` / `--surface-secondary` / `--surface-ghost` / `--surface-highlight` / `--surface-hover` / `--surface-overlay`
- **尺寸**：`--radius-sm/md/lg/xl`（`--radius` 是 `--radius-md` 别名）、`--shadow-xs/sm/md/lg/xl`、`--shadow-primary-sm/md`、`--icon-sm/md/lg/xl`
- **过渡**：`--transition-fast/base/slow`
- **间距**：`--space-page-body` / `--space-section-gap` / `--space-form-item-gap` / `--space-fieldset-body-gap` / `--space-form-actions-gap` / `--space-form-body-to-actions` / `--space-field-internal` / `--space-field-label-gap` / `--space-field-label-h-gap` / `--space-tabs-content-gap`
- **图表**：`--chart-1` ... `--chart-5`

### 4 个主题变体（`styles.css:71-309`）

每个变体都重新定义上述全部 token 的扩展超集（额外含 `--primary-dark/light/bg`、`--secondary`、`--info`、`--success`、`--danger`、`--warning`、`--gray-50..900`、`--glass-blur`、`--app-topbar-bg`、`--app-sidebar-bg`、`--app-tabs-bg`、`--card-surface`、`--border-surface` 等）：

| 主题    | 模式  | 选择器                                           |
| ------- | ----- | ------------------------------------------------ |
| classic | light | `:root[data-theme='classic'][data-mode='light']` |
| classic | dark  | `:root[data-theme='classic'][data-mode='dark']`  |
| glass   | light | `:root[data-theme='glass'][data-mode='light']`   |
| glass   | dark  | `:root[data-theme='glass'][data-mode='dark']`    |

### 其他 namespace

- `--nop-*`：playground 应用层（`apps/playground/src/styles.css:71-150`），覆盖 `--nop-app-bg` / `--nop-accent` / `--nop-surface` / `--nop-border` / `--nop-nav-*` / `--nop-hero-*` / `--nop-dialog-backdrop` 等
- `--nop-code-editor-*`：code-editor 包私有（`packages/flux-code-editor/src/code-editor-styles.css`），自带 `[data-theme='dark']` 覆盖
- `--nop-notice-bar-*`：notice-bar 包私有（`packages/flux-renderers-mobile/src/styles.css`），含 `.dark` / `:root[data-mode='dark']` 覆盖
- `--fd-*`：flow-designer（`packages/flow-designer-renderers/src/designer-theme.css`），仅在用法点带 fallback（`var(--fd-page-bg, <literal>)`）
- `--nop-hairline-color`：移动端 hairline 边（`packages/ui/src/styles/mobile.css:8`）

> 全仓**不存在** `--flux-*` 前缀的 CSS 变量（已 grep 确认）。

---

## 主题切换：纯 CSS 属性

flux 不提供切换 API。宿主在 `:root` 或任何祖先节点设置以下任一组合即可：

```html
<!-- 方式 1：data-theme + data-mode -->
<html data-theme="glass" data-mode="dark">
  <!-- 方式 2：.dark 类（驱动 Tailwind dark: 变体 + .dark 选择器覆盖） -->
  <html class="dark"></html>
</html>
```

两种方式可混用。Tailwind preset 用 `darkMode: ['class', '.dark']`（`packages/tailwind-preset/src/index.ts:134`）。

> Playground **运行时**未给任何节点加 `.dark` 类或 `data-mode='dark'` 属性（仅在 CSS 中预留相关选择器，见 `apps/playground/src/styles-theme-utilities.css:107,198`），仅作契约演示。生产宿主可自行启用。

---

## `data-slot` 协议

每个 shadcn 原子组件与 flux 渲染器在 DOM 上发**稳定**的 `data-slot="<component>-<role>"` 属性（全仓约 **124 个唯一 slot 名**、约 2500 次使用）。宿主 CSS 可基于这些选择器做精细定制，**接口稳定性有保证**（约定文档：`docs/architecture/renderer-markers-and-selectors.md`）。

```css
[data-slot='dialog-overlay'] {
  background: rgba(0, 0, 0, 0.5);
}
[data-slot='page-body'] {
  padding: 24px;
}
[data-slot='field-label'] {
  font-weight: 600;
}
```

### data-slot 基线样式

| 文件                                                       | 覆盖                                           |
| ---------------------------------------------------------- | ---------------------------------------------- |
| `packages/flux-react/src/default-spacing.css:11-79`        | page / form / fieldset / tabs 的 slot 间距基线 |
| `packages/flux-renderers-form/src/form-renderers.css:1-71` | 表单控件 slot 基线                             |
| `packages/ui/src/styles/base.css`                          | ui 原子组件 slot 基线                          |

---

## `nop-*` marker 类

每个渲染器在根 DOM 上发 `nop-<name>` marker，用于全局选择与样式覆盖：`nop-page` / `nop-form` / `nop-card` / `nop-text` / `nop-crud` / `nop-pagination` / `nop-tabs` / `nop-container` / `nop-designer` / `nop-list` / `nop-chart` / `nop-icon` / `nop-button` / `nop-field` / `nop-dialog` / `nop-drawer` 等。

---

## schema 上的样式字段

| 字段             | 作用位置                                            | 备注                                                                                 |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `className`      | 渲染器根 DOM（与 `nop-<name>` marker 并列）         | 标准 Tailwind 类                                                                     |
| `frameClassName` | 外层 `FieldFrame` 包装 `<Tag>`（仅 field 形渲染器） | 当组件定义 `frameWrap === 'none'` 时跳过                                             |
| `classAliases`   | 编译期展开（非运行时）                              | `Record<string, string>`，递归展开；定义见 `packages/flux-core/src/class-aliases.ts` |

### `cn()` 合并工具

`packages/ui/src/lib/utils.ts:4` 导出 `cn() = twMerge(clsx(inputs))`，从 `@nop-chaos/ui` 或 `@nop-chaos/ui/lib/utils` 导入。Tailwind 类冲突时 `twMerge` 自动去重（后者胜）。

---

## 移动端 helper（`packages/ui/src/styles/mobile.css`）

| 类/变量                                                    | 用途                             |
| ---------------------------------------------------------- | -------------------------------- |
| `.nop-hairline` / `.nop-hairline--{top,right,bottom,left}` | 0.5px hairline 边框（高 DPI 屏） |
| `.nop-haptic`                                              | 触觉反馈标记                     |
| `.nop-safe-{top,bottom,left,right}`                        | 安全区 inset                     |
| `--nop-hairline-color`                                     | hairline 颜色                    |

### reduced-motion

`packages/ui/src/styles/base.css:31-40` 在 `@media (prefers-reduced-motion: reduce)` 下零化所有动画/过渡。

---

## 宿主集成步骤

```tsx
// 1. 引入基础 token（一次性）
import '@nop-chaos/theme-tokens/styles.css';

// 2. tailwind 配置消费 preset
import { createNopTailwindPreset } from '@nop-chaos/tailwind-preset';
export default {
  presets: [createNopTailwindPreset()],
  content: ['./src/**/*.{ts,tsx}', '../node_modules/@nop-chaos/flux-renderers-*/src/**/*.{ts,tsx}'],
};
```

```tsx
// 3. 把渲染子树挂到 .nop-theme-root（flux 共享主题作用域）
<div className="nop-theme-root">
  <SchemaRenderer ... />
</div>
```

```css
/* 4. 自定义 token 覆盖（无 JS bridge） */
.host-shell {
  --nop-surface: hsl(var(--card));
  --nop-app-text: hsl(var(--foreground));
  --nop-primary: hsl(var(--primary));
}

/* 5. 暗色切换：纯 CSS 属性 */
html.dark {
  /* Tailwind dark: 变体生效 */
}
html[data-mode='dark'] {
  /* theme-tokens 的 dark 变体生效 */
}
```

### 标准做法清单

| 想做的事           | 标准做法                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| 切换主题           | 在 `:root` 设 `data-theme='classic'\|'glass'` + `data-mode='light'\|'dark'`，或加 `.dark` 类        |
| 整页换色           | 在祖先节点覆盖 `--primary` / `--background` 等 CSS 变量                                             |
| 单组件微调         | schema 上写 `className`（渲染器根）或 `frameClassName`（外层 field 包装）                           |
| 跨组件复用类组合   | schema 上声明 `classAliases: { myBtn: 'px-4 py-2 rounded-md bg-primary' }`，再 `className: 'myBtn'` |
| 全局重写某组件样式 | 在宿主 CSS 里用 `[data-slot='xxx']` 或 `.nop-<name>` 选择器                                         |
| 嵌入式局部主题     | 在包裹节点设 `.nop-theme-root` + 局部 CSS 变量覆盖                                                  |

### 显式 Non-Goal

- ❌ 不提供 `ThemeProvider` / `useTheme` / `setTheme`
- ❌ 不在 `RendererEnv` 里存主题状态
- ❌ 不在 `ActionScope` / `ScopeRef` / page runtime / form runtime 里存主题状态
- ❌ 不需要任何 JavaScript bridge（CSS 变量本身即契约）
