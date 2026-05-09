# 10 Styling

- 深挖轮次: 1
- 深挖发现数: 2

## 第 1 轮初审

### [维度10-01] flux-react fallback/error surface 仍使用 `nop-*__*` / `nop-*--*` BEM 类作为内部区域与状态钩子

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-error-boundary.tsx:42-49`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\default-spacing.css:150-180`
- **行号范围**: `node-error-boundary.tsx:42-49`, `default-spacing.css:150-180`
- **证据片段**:
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
- **严重程度**: P2
- **违规类别**: BEM / marker
- **现状**: fallback/error UI 已使用 `data-slot`，但仍把状态和内部 message/retry 区域暴露为 `nop-schema-root-fallback--status`、`nop-schema-root-fallback__message`、`nop-node-error__message`、`nop-node-error__retry` 等 BEM 类，并在 CSS 中继续作为样式选择器。
- **风险**: `nop-*` marker 语义继续混入内部区域/状态选择器，会削弱“root marker + data-slot/data-\*”的稳定 DOM 协议；后续 refactor 或 host override 容易继续依赖 BEM hook，导致 marker contract 反复回退。
- **建议**: 保留 root marker（如 `nop-schema-root-fallback` / `nop-node-error`），把 `--status` 改为 `data-state` 或现有 `data-slot` 状态选择，把 `__message` / `__retry` 改为 `data-slot="...-message"` / `data-slot="...-retry"` 并同步 CSS。
- **为什么值得现在做**: 这是小范围、低风险的 marker 协议收口；当前代码已经有 `data-slot`，迁移成本低，但能避免 plan 228 后 fallback surface 继续作为 BEM 模式样板被复制。
- **误报排除**: 不是机械报告 fallback visual 或 `Alert`/`Button` 的 widget-owned internal styles；问题仅限 live code 中 `nop-*__*` / `nop-*--*` BEM hook 仍作为公共 CSS 选择器存在，直接命中 marker 文档“内部区域用 data-slot、状态用 data-\*”的契约。
- **历史模式对应**: 命中 plan 228 后的 fallback surface residual，但不是重报“fallback 视觉未 token 化”；本次 residual 是 marker/BEM contract 风险。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/plans/228-styling-and-css-surface-cleanup-plan.md`
- **复核状态**: 未复核

### [维度10-02] CRUD 内部区域继续暴露多个 `nop-crud-*` region marker，和已有 `data-slot` 并存

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer.tsx:396-444`
- **行号范围**: `396-444`
- **证据片段**:
  ```tsx
  <div
    className={cn('nop-crud', props.meta.className)}
    data-testid={props.meta.testid || undefined}
    data-cid={props.meta.cid || undefined}
  >
    {queryFormSchema ? (
      <div className="nop-crud-query" data-slot="crud-query">
  ```
- **严重程度**: P3
- **违规类别**: marker
- **现状**: CRUD root 正确使用 `nop-crud`，但内部 query/toolbar/table/footer 区域仍额外暴露 `nop-crud-query`、`nop-crud-toolbar`、`nop-crud-table`、`nop-crud-footer`，同时这些节点已经有 `data-slot="crud-*"`。
- **风险**: 内部 `nop-*` region marker 会扩大 host/test 可依赖的非规范 CSS hook 面，和“root marker only + internal data-slot”的 DOM 协议不一致；后续 CSS 或测试可能继续绑定 `nop-crud-*`，增加迁移成本。
- **建议**: 保留 root `nop-crud`；内部区域只保留 `data-slot="crud-query"` / `crud-toolbar` / `crud-table` / `crud-footer`，视觉类保留为普通 Tailwind 或迁入 package-owned slot selector。
- **为什么值得现在做**: 当前节点已经有 `data-slot`，去除冗余 marker 的改动面小；越早收口越能避免 `nop-crud-*` 被外部当成稳定公共 hook。
- **误报排除**: 不把 CRUD 作为 widget/composite renderer 的内部 `flex`/`gap` 自样式判为违规；本发现只针对内部 `nop-*` marker 扩散，而不是反对 widget-owned internal layout。
- **历史模式对应**: 对应 renderer marker migration 中“root semantic marker 保留、内部区域迁到 data-slot”的重复收口模式。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度10-03] form 输入类渲染器仍以 `nop-*-wrapper` 暴露 wrapper/内部结构 marker，并与 `data-slot` 重复

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:159-168`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:239-267`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:300-354`
- **行号范围**: `159-168`, `239-267`, `300-354`
- **证据片段**:
  ```tsx
  return (
    <div className={cn('nop-select-wrapper', props.meta.className)} data-slot="select-wrapper">
      <Select
        value={selectedValue}
        onValueChange={(nextValue) => handlers.onChange(nextValue)}
        disabled={loading || presentation.effectiveDisabled}
      >
  ```
- **严重程度**: P3
- **违规类别**: marker
- **现状**: `select`、`checkbox`、`switch`、`radio-group`、`checkbox-group` 渲染器继续暴露 `nop-select-wrapper`、`nop-checkbox-wrapper`、`nop-switch-wrapper`、`nop-radio-group-wrapper`、`nop-checkbox-group-wrapper` 这类 wrapper/结构 marker，同时相同节点已提供 `data-slot="*-wrapper"`。
- **风险**: `nop-*` 命名空间继续承担内部结构 / wrapper 语义，会让 host/test 依赖非规范 hook；后续若按“root marker + internal data-slot”收口，这些 wrapper marker 会形成额外迁移面。
- **建议**: 保留真正的 renderer root identity（如确需可改为 `nop-select` / `nop-checkbox-group`），wrapper 结构身份只使用现有 `data-slot`；避免 `nop-*` class 编码 wrapper/internal region。
- **为什么值得现在做**: 这些节点已经有 `data-slot`，迁移成本低；可和 CRUD 内部 region marker 的收口方向保持一致。
- **误报排除**: 不是反对 field/widget 自身使用 shadcn UI 或内部布局；问题仅限 `nop-*` 继续表达 wrapper/内部结构语义，和 marker 文档中“internal regions use data-slot”的规则不一致。
- **历史模式对应**: 对应 renderer marker migration 中“内部区域迁到 data-slot，`nop-*` 只保留 root identity”的残留模式。
- **参考文档**: `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/styling-system.md`
- **复核状态**: 未复核

### [维度10-04] code-editor 包级 CSS 多个内部 `data-slot` 选择器未限定 `.nop-code-editor` root，且直接写死 light/dark 色值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-styles.css:19-31`, `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-styles.css:68-90`
- **行号范围**: `19-31`, `68-90`
- **证据片段**:
  ```css
  [data-slot='code-editor-toolbar'] {
    display: flex;
    justify-content: flex-end;
    padding: 2px 4px;
    background: rgba(0, 0, 0, 0.03);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    flex-shrink: 0;
  }
  ```
- **严重程度**: P2
- **违规类别**: 主题 / marker / hardcoded style contract
- **现状**: code-editor 的 light-mode slot 样式大量使用裸 `[data-slot='code-editor-*']` 全局选择器，未统一限定在 `.nop-code-editor` root 下；同时 toolbar/header/button/panel 等包级视觉直接写 `rgba(...)`、`#999`、`#333` 等字面量色值。
- **风险**: 裸 `data-slot` 选择器会把 package-owned 样式泄漏到任何同名 slot 的 DOM；硬编码 light/dark 色值也绕过 `.nop-theme-root` / `--nop-*` token，host 很难通过主题变量统一接管 code-editor 外壳。
- **建议**: 将 package CSS 选择器统一收口为 `.nop-code-editor [data-slot='...']` 或 `.nop-code-editor[data-*] [data-slot='...']`，并把稳定颜色、边框、hover/focus 色提升为 `--nop-code-editor-*` 或共享 `--nop-*` token。
- **为什么值得现在做**: 这是包级 CSS 的公共选择器面，影响所有消费方；先收口 selector scope 和 token fallback，可降低后续主题兼容迁移风险。
- **误报排除**: 不把 CodeMirror/editor 自身的 widget-owned 内部样式判为违规；问题是 reusable package stylesheet 使用未 scoped 的全局 slot selector 与硬编码 host-theme 不可接管色值。
- **历史模式对应**: 对应 theme-compatibility 中“package-owned visuals read CSS variables”与 marker 文档中“root marker + data-slot”的组合契约残留。
- **参考文档**: `docs/architecture/theme-compatibility.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/styling-system.md`
- **复核状态**: 未复核
