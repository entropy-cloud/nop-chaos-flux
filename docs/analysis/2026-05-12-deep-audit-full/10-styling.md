# 维度 10：样式系统合规性

## 范围与状态

- 审核维度：样式系统合规性。
- 来源范围：仅汇总 `stage-1-full-findings-06-10.md`、`raw-findings-07-20.md`、`final-review-results-06-10.md` 与 `summary.md` 中本维度记录。
- 覆盖对象：BEM selector/class 残留、layout renderer hardcoded visual classes、playground 示例状态表达、renderer package theme token coupling。
- 最终状态：5 项全部保留；P2 3 项，P3 2 项。

## 深挖轮次与收敛说明

第 1 轮初审记录 3 项。第 2-5 轮追加 raw findings 补充 2 项。本次审核在第 5 轮达到执行上限时仍有新增，因此按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核确认本维度问题主要是 styling contract drift：production fallback UI 与 default CSS 仍使用 BEM-style classes/selectors，layout renderer 仍输出 hardcoded flex/gap/align visual classes，playground 示例重复使用 modifier class 与 `data-*` 状态，word editor package renderer 直接依赖 app-level `--nop-*` variables。

## 最终保留项

### [10-01] Error fallback JSX 保留 BEM 状态/内部类

- 文件：`packages/flux-react/src/node-error-boundary.tsx:42-50`, `packages/flux-react/src/node-error-boundary.tsx:138-155`
- 证据片段：

```tsx
<Alert
  data-slot={props.mode === 'loading' ? 'schema-root-status' : 'schema-root-error'}
  role={props.mode === 'loading' ? 'status' : 'alert'}
  variant={destructive ? 'destructive' : 'default'}
  className={cn('nop-schema-root-fallback', !destructive && 'nop-schema-root-fallback--status')}
>
  {destructive ? <AlertCircleIcon className="size-4 shrink-0" /> : null}
  <AlertDescription className="nop-schema-root-fallback__message">
```

- 严重程度：P2
- 当前行为：JSX 发出 `--status` modifier 与 `__message` element BEM classes。
- 风险：违背 styling guidance 中以 `data-slot`、semantic markers、Tailwind/utilities 替代 BEM 的约定。
- 建议：用 `data-slot` selectors 和 non-BEM semantic markers 替换 BEM modifier/element。
- 误报排除：这是 production fallback UI，不是测试/demo 样式。
- 最终复核结论：保留 P2。
- 修订标题/理由：最终理由扩展为 error fallback JSX emit BEM-style modifier/element classes，包括 root 与 node fallback。

### [10-02] `default-spacing.css` 保留 BEM selectors

- 文件：`packages/flux-react/src/default-spacing.css:146-187`
- 证据片段：

```css
.nop-schema-root-fallback {
  align-items: center;
}

.nop-schema-root-fallback--status {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
}

.nop-schema-root-fallback__message {
```

- 严重程度：P2
- 当前行为：package-level default CSS 使用 BEM modifier/element selectors。
- 风险：强化不支持的 selector 约定，并重复 `data-slot` 可表达的语义。
- 建议：转为 `data-slot` 与 non-BEM marker classes。
- 误报排除：selectors 位于 live package CSS，不是 legacy comments 或 dead docs。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 `default-spacing.css` 强化 BEM fallback selectors。

### [10-03] Playground Flow Designer modifier classes 与 `data-*` 状态重复

- 文件：`apps/playground/src/flow-designer/flow-designer-canvas.tsx:112-121`, `apps/playground/src/flow-designer/flow-designer-canvas.tsx:202-210`
- 证据片段：

```tsx
<div
  key={node.id}
  className={classNames(
    'fd-node',
    snapshot.selection.activeNodeId === node.id && 'fd-node--selected',
    node.type && `fd-node--${node.type}`,
  )}
  data-slot="flow-designer-node"
  data-selected={snapshot.selection.activeNodeId === node.id ? '' : undefined}
  data-type={node.type || undefined}
```

- 严重程度：P3
- 当前行为：playground nodes 同时发出 BEM-like modifier classes 与等价 `data-selected/data-type`。
- 风险：示例代码传播 duplicated styling pattern，与推荐 `data-*` selector model 冲突。
- 建议：使用 `data-selected/data-type` selectors，移除 modifier classes，除非明确标为 playground-only legacy。
- 误报排除：属 playground code，故严重程度较低；但仍是项目可见示例。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 playground Flow Designer 同时使用 BEM-like modifiers 与 data attributes 表达状态。

### [10-04] ContainerRenderer 作为 layout renderer 发出 hardcoded flex/gap/align visual classes

- 文件：`packages/flux-renderers-basic/src/container.tsx:24-52`
- 证据片段：

```tsx
const useFlexChild =
  wrap || align !== undefined || gap.className || gap.style || direction !== 'row';
return (
  <div
    className={cn('nop-container', props.meta.className)}
    data-testid={props.meta.testid || undefined}
    data-cid={props.meta.cid || undefined}
  >
    ...
    className={cn(
      'flex',
      resolveDirection(direction),
      wrap && 'flex-wrap',
      align === 'center' && 'items-center justify-center',
```

- 严重程度：P2
- 当前行为：container layout renderer 根据 semantic props 发出 `flex/flex-wrap/items-*/justify-*` 和 gap class/style。
- 风险：layout renderer 形成第二套样式事实来源，和“layout renderers emit marker classes only; styling comes from schema”契约冲突。
- 建议：只输出 marker/data attributes；布局由 schema className/slot class 和 `stack-*`/`hstack-*` aliases 指定。若保留 semantic props，需要在 styling contract 中明确 exception。
- 误报排除：第 1 轮 [09-01] 指向 `flex.tsx`，本条是另一个 layout renderer `container.tsx`。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 Container layout renderer emits hardcoded flex/gap/align classes。

### [10-05] Word editor package renderer 直接依赖 `--nop-*` app/theme variables

- 文件：`packages/word-editor-renderers/src/word-editor-page.tsx:80-103`
- 证据片段：

```tsx
const headerSlot = (
  <div className="flex flex-col">
    <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[var(--nop-nav-surface)]">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
...
        <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
        <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">
```

- 严重程度：P3
- 当前行为：package renderer 使用 `bg-[var(--nop-nav-surface)]`、`text-[var(--nop-accent)]`、`text-[var(--nop-text-strong)]` 等 app 层变量。
- 风险：可复用 renderer package 与 playground/app theme variable 名称耦合，在非 playground shell 下 theme compatibility 脆弱。
- 建议：改用共享 UI/token class，例如 `bg-background/text-foreground/text-muted-foreground`，或为 word editor 定义并文档化 package-local semantic tokens。
- 误报排除：widget renderer 可以自带视觉样式；问题是直接依赖非共享 `--nop-*` 变量名。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 Word editor renderer 依赖 app-level `--nop-*` variables。

## 驳回项

本维度最终复核没有驳回项。
