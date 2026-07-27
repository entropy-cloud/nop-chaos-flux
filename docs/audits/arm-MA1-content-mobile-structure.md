# MA1.4 Content + Mobile 结构审计报告

> Audit Date: 2026-07-27
> Plan: `docs/plans/2026-07-27-0800-2-ma1-structure-architecture-audit.md`
> Packages: flux-renderers-content, flux-renderers-mobile
> Owner Docs: `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md`

## 审计范围

审计 content 和 mobile 包，覆盖：

1. 包边界合规性
2. 样式契约合规性

## 1. 包边界合规性

### flux-renderers-content

| 依赖                    | 方向 | 状态 |
| ----------------------- | ---- | ---- |
| `@nop-chaos/flux-core`  | 下游 | ✅   |
| `@nop-chaos/flux-i18n`  | 下游 | ✅   |
| `@nop-chaos/flux-react` | 下游 | ✅   |
| `@nop-chaos/ui`         | 下游 | ✅   |

所有 8 个依赖方向正确。无向上依赖。✅

### flux-renderers-mobile

| 依赖                   | 方向 | 状态 |
| ---------------------- | ---- | ---- |
| `@nop-chaos/flux-core` | 下游 | ✅   |
| `@nop-chaos/flux-i18n` | 下游 | ✅   |
| `@nop-chaos/ui`        | 下游 | ✅   |

注意：不依赖 `@nop-chaos/flux-react`。移动端渲染器直接从 `props` 获取数据，不使用标准 flux-react hooks。这是有意为之，在当前架构下可接受。✅

### 渲染器定义完整性

**content**（19 个渲染器）：全部包含 `type`、`displayName`、`category`、`sourcePackage`、`defaultSchema`、`component`、`fields`。✅
**mobile**（5 个渲染器）：全部包含 `type`、`displayName`、`category`、`sourcePackage`、`defaultSchema`、`component`、`fields`。✅

## 2. 样式契约合规性

### cn() 使用

- **content**: 所有 19 个渲染器一致使用 `cn()`。✅
- **mobile**: 所有 5 个渲染器一致使用 `cn()`。✅

### data-slot 使用

- **content**: 大多数根元素有 `data-slot`（如 `data-slot="separator"`、`data-slot="alert"`、`data-slot="status-root"`）。见下方发现 F4-002。
- **mobile**: 一致使用 `data-slot`（如 `data-slot="pull-refresh"`、`data-slot="swipe-cell"`）。✅

### BEM 检查

两个包中均未发现 BEM 风格命名。✅

### @nop-chaos/ui 组件使用

- **content**: 在适用时使用 shadcn 组件（`Separator`、`Spinner`、`Progress`、`Alert`、`Card`、`Button`、`Badge`、`Dialog`、`Carousel` 等）。✅
- **mobile**: 使用 `Spinner`、`Button`。✅

## 发现列表

### P0 — 无

### P1 — 无

### P2 — 2 个

#### F4-001: DiffView 根元素缺少 data-slot

- **文件**: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx`
- **严重程度**: P2（不一致性）
- **现状**: `DiffViewRenderer` 根 `<div>` 缺少 `data-slot` 属性，而其他 18 个 content 渲染器均在其根元素上设置 `data-slot`。
- **风险**: 低。CSS 选择器正常工作（通过 `.nop-diff-view [data-slot='...']` 定位子元��），但与项目惯例不一致。
- **建议**: 在根 `<div>` 上添加 `data-slot="diff-view"`。

#### F4-002: Content CSS 文件体积（641 行，主要为 DiffView）

- **文件**: `packages/flux-renderers-content/src/styles.css`
- **严重程度**: P2（代码组织）
- **现状**: 641 行 CSS 文件，其中 ~600 行专用于 DiffView 渲染器。代码组织上应将 DiffView CSS 提取到单独文件。
- **风险**: 低。样式已正确作用域。加载大小适中。
- **建议**: 提取 DiffView CSS 到 `src/diff-view/styles.css`。

### P3 — 无

## 合规项摘要

| 检查项             | content                | mobile    |
| ------------------ | ---------------------- | --------- |
| 包依赖合规         | ✅                     | ✅        |
| 渲染器定义完整性   | ✅（19/19）            | ✅（5/5） |
| cn() 一致使用      | ✅                     | ✅        |
| data-slot 使用     | 大部分 ✅（见 F4-001） | ✅        |
| 无 BEM             | ✅                     | ✅        |
| @nop-chaos/ui 使用 | ✅                     | ✅        |

## 总结

Content 和 mobile 包对样式契约的遵循良好。cn()、data-slot 和 UI 组件使用一致。两个 P2 发现均为内容包中的小不一致性（DiffView 缺 data-slot + CSS 文件组织），不构成即时风险。Mobile 包完全干净。
