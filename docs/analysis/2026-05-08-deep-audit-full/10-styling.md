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

## 深挖第 3 轮追加

### [维度10-05] `default-spacing.css` 使用裸 `data-slot` 选择器，把 Flux layout 默认间距泄漏到 shadcn/ui 同名 slot

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\default-spacing.css:71-75`, `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\tabs.tsx:68-74`, `C:\can\nop\nop-chaos-flux\packages\ui\src\components\ui\field.tsx:98-125`
- **行号范围**: `default-spacing.css:71-75`, `tabs.tsx:68-74`, `field.tsx:98-125`
- **证据片段**:
  ```css
  [data-slot='tabs-content'] {
    display: flex;
    flex-direction: column;
    gap: var(--space-tabs-content-gap);
  }
  ```
- **严重程度**: P2
- **违规类别**: marker / 间距 / theme selector scope
- **现状**: Flux 的默认间距 CSS 对 `[data-slot='tabs-content']`、`[data-slot='field-label']`、`[data-slot='field-error']` 等使用裸全局选择器；但 `@nop-chaos/ui` 的基础 `TabsContent` 和 `FieldLabel` / `FieldDescription` / `FieldError` 也使用相同 `data-slot`，因此这些 Flux layout 默认规则会影响非 Flux renderer 的 shadcn/ui 组件。
- **风险**: `default-spacing.css` 的 layout 默认值本应服务 Flux renderer / FieldFrame，却会在任何导入该样式的宿主中改变普通 UI Tabs/Field 的 display、gap、字号、颜色等，形成隐式全局样式耦合；后续 UI 组件或宿主页面只要复用同名 `data-slot` 就可能被意外套上 Flux renderer 间距。
- **建议**: 将 Flux-owned 默认间距收口到 root marker 下，例如 `.nop-tabs [data-slot='tabs-content']`、`.nop-field > [data-slot='field-label']`、`.nop-field > [data-slot='field-error']`；确需共享给 ui 组件的基础样式应迁移到 `@nop-chaos/ui/base.css` 并作为 UI 层契约声明。
- **为什么值得现在做**: 这是样式系统核心 CSS，且 `@nop-chaos/ui` 已经存在同名 slot；修复 selector scope 能避免 Flux 默认间距继续作为全局 shadcn slot override 扩散。
- **误报排除**: 不是反对 `@layer base` 提供 theme-tunable 默认间距；文档允许 package-owned base CSS 以 root marker + slot selector 提供默认值。本问题是缺少 root marker 限定，导致裸 `data-slot` 选择器跨出 Flux renderer 边界。
- **历史模式对应**: 与已保存的 code-editor 裸 `data-slot` 问题同属 selector scope 漂移，但文件、影响面和 owner 不同；不是重复报告 code-editor CSS。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

### [维度10-06] per-slot `*ClassName` props 不参与 `classAliases` 解析，layout slot 无法使用文档承诺的 alias 机制

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-resolved.tsx:139-149`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\page.tsx:41-55`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\container.tsx:37-57`
- **行号范围**: `node-renderer-resolved.tsx:139-149`, `page.tsx:41-55`, `container.tsx:37-57`
- **证据片段**:
  ```tsx
  const resolvedMeta = useMemo(() => {
    const resolvedClassName = mergedClassAliases
      ? resolveClassAliases(baseMeta.className, mergedClassAliases)
      : baseMeta.className;
    const nextMeta =
      resolvedClassName !== baseMeta.className
        ? { ...baseMeta, className: resolvedClassName }
        : baseMeta;
  ```
- **严重程度**: P2
- **违规类别**: classAlias
- **现状**: `NodeRenderer` 只对 `baseMeta.className` 执行 `resolveClassAliases`；而 layout renderer 的 `bodyClassName`、`headerClassName`、`footerClassName`、`toolbarClassName`、`contentClassName` 等 slot class props 作为普通 props 传入 renderer，随后直接 `cn(slotProps.bodyClassName)` / `cn(schemaProps.contentClassName)` 输出，未经过 alias 展开。
- **风险**: 文档定义 layout containers 支持 per-slot className props，且 `classAliases` 是 reusable class definition；但 schema 作者在 `bodyClassName: "card"` 或 `contentClassName: "stack-sm"` 中使用页面级 alias 时不会被展开，导致 root `className` 与 slot `*ClassName` 行为不一致。问题尤其影响 layout renderer，因为 slot className 正是控制内部布局/间距的推荐入口。
- **建议**: 在 runtime/React 层提供统一的 slot className alias 解析 helper，或在 `useSchemaProps` / renderer props resolution 阶段对所有约定的 `*ClassName` 字段执行 `resolveClassAliases`；同时补充 page/container/form/tabs/fieldset 的 alias regression tests。
- **为什么值得现在做**: 这是 classAliases 与 per-slot styling 两个当前样式契约的交叉缺口；修复后 schema 作者可以用同一 alias 机制控制 root 与 slot，避免回退到重复 Tailwind 长字符串。
- **误报排除**: 不是要求所有任意字符串 prop 都走 alias 展开；本发现只针对文档明确列为 per-slot className 的 props。当前代码已有 root `className` alias 解析，证明机制存在，但没有覆盖这些同属样式契约的 slot className。
- **历史模式对应**: 不属于“过渡中未接线模块”或“纯一致性建议”；这是 live renderer styling contract 的功能缺口，会直接导致 schema 中合法 alias 写法在 slot className 上失效。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/renderer-markers-and-selectors.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度10-07] form-renderers 包级 CSS 使用裸 `data-slot` 选择器，输入控件默认样式会泄漏到任意同名 slot

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\form-renderers.css:1-12`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\index.tsx:1`
- **行号范围**: `form-renderers.css:1-12`, `index.tsx:1`
- **证据片段**:

  ```css
  [data-slot='select-wrapper'] {
    display: grid;
    gap: 0.5rem;
  }

  [data-slot='select-wrapper'] [data-slot='select-trigger'] {
    width: 100%;
  }

  [data-slot='select-wrapper'] [data-slot='select-error'] {
  ```

- **严重程度**: P2
- **违规类别**: selector scope / marker / 间距
- **现状**: `form-renderers.css` 通过包入口 side-effect import 生效，但所有规则都以裸 `[data-slot='select-wrapper']`、`[data-slot='checkbox-wrapper']`、`[data-slot='radio-group-wrapper']` 等选择器开头，没有限定在 Flux form renderer root 或 `nop-*` renderer identity 下。
- **风险**: 任意宿主页面或 `@nop-chaos/ui`/其他渲染器只要复用同名 `data-slot`，就会被 form-renderers 的 display/gap/font/color 规则命中，形成跨包隐式全局样式耦合；这和“root marker + internal data-slot”的 selector scope 契约不一致。
- **建议**: 将包级规则收口到 renderer root scope，例如 `.nop-select [data-slot='select-wrapper']`、`.nop-checkbox [data-slot='checkbox-wrapper']`，或在迁移 wrapper marker时同步引入稳定 root marker；避免裸 `data-slot` 作为全局样式入口。
- **为什么值得现在做**: 这是和已发现 `default-spacing.css` / code-editor CSS 相同类型但不同 owner 的 selector scope 漏洞；form 包入口会广泛导入，影响面比单个 demo schema 更大。
- **误报排除**: 不是重复报告已有的 `nop-*-wrapper` marker 残留；本条关注的是 CSS 选择器未限定 root scope，即使移除 wrapper class 后仍会存在的全局 `data-slot` 泄漏问题。
- **历史模式对应**: package CSS 裸 `data-slot` selector 泄漏到跨包同名 slot。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/theme-compatibility.md`
- **复核状态**: 未复核

### [维度10-08] Flow Designer `edgeType.body` 渲染未发布 `config.classAliases`，边标签 schema 的 alias scope 与节点 body 不一致

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\designer-xyflow-edge.tsx:104-111`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\designer-xyflow-node.tsx:228-233`
- **行号范围**: `designer-xyflow-edge.tsx:104-111`, `designer-xyflow-node.tsx:228-233`
- **证据片段**:
  ```tsx
  <RenderNodes
    input={edgeType!.body!}
    options={{
      bindings: edgeRenderData,
      scopeKey: `edge:${props.id}`,
      pathSuffix: 'edge',
    }}
  />
  ```
- **严重程度**: P2
- **违规类别**: classAlias / selector scope
- **现状**: Flow Designer 节点 `body` 和 `quickActions` 渲染时显式包裹 `ClassAliasesContext.Provider value={config.classAliases}`，但 edge label 的 `edgeType.body` 直接调用 `RenderNodes`，没有发布同一份 `config.classAliases`。
- **风险**: `DesignerConfig.classAliases` 对 node body 可用、对 edge body 不可用，导致同一设计器配置中的边标签 schema 写 `className: "stack-sm"` / 自定义 alias 时无法展开；配置作者会遇到 node/edge 样式行为不一致。
- **建议**: 在 edge body 渲染处与 node body 一样包裹 `ClassAliasesContext.Provider value={config.classAliases}`，并增加 edge body classAliases 继承/覆盖回归测试。
- **为什么值得现在做**: `EdgeTypeConfig.body` 是文档化的 Flux JSON 表示，和 node body 属于同一类 schema authoring surface；现在只是漏接 alias provider，修复面小但能消除配置层样式契约不一致。
- **误报排除**: 不是要求 Flow Designer 所有 chrome 类都走 alias；问题仅限用户/配置作者提供的 `edgeType.body` Flux schema，已有 node body 对照实现证明该 scope 应被发布。
- **历史模式对应**: renderer-local nested schema 渲染遗漏 classAliases provider，导致 alias scope 不一致。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

### [维度10-09] Flow Designer palette 图标外观硬编码 node type id 到固定渐变，绕过 `nodeTypes[].appearance` 与主题 token

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-palette.tsx:9-24`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-theme.css:48-80`
- **行号范围**: `designer-palette.tsx:9-24`, `designer-theme.css:48-80`
- **证据片段**:
  ```tsx
  const PALETTE_APPEARANCE_BY_ID: Record<string, string> = {
    start: 'fd-palette-appearance-start',
    end: 'fd-palette-appearance-end',
    task: 'fd-palette-appearance-task',
    process: 'fd-palette-appearance-process',
    condition: 'fd-palette-appearance-condition',
  };
  ```
- **严重程度**: P2
- **违规类别**: 主题 / classAlias / hardcoded visual
- **现状**: Palette icon 外观由固定 node type id 映射到 `fd-palette-appearance-*` CSS class；CSS 中这些 class 直接写死 `#22c55e`、`#3b82f6`、`#ef4444` 等渐变色。相比之下，inspector/canvas 其他路径已通过 `resolveNodeTypeAccent(..., nodeTypeConfig)` 读取 `nodeType.appearance.borderColor`。
- **风险**: 自定义 `nodeTypes[].appearance`、host theme token 或 designer config 的 classAliases 无法统一驱动 palette 中的节点视觉；同一个 node type 在画布/inspector/palette 上可能显示不同色系，形成 theme token 与配置视觉漂移。
- **建议**: Palette 优先使用 `nodeType.appearance.className` / `borderColor` 或统一的 `resolveNodeTypeAccent`，固定渐变只作为 token 化 fallback；CSS 颜色迁移到 `--fd-palette-*` / `--fd-node-*` 变量，并允许 host 在 `.fd-theme-root` 下覆盖。
- **为什么值得现在做**: Palette 是配置作者选择节点的入口，视觉漂移会直接误导用户；当前已经有 `resolveNodeTypeAccent` 可复用，收敛成本低。
- **误报排除**: Flow Designer 允许包级 fallback visuals，但文档要求 node/edge 可见元数据和外观优先归属 `config.nodeTypes[].appearance`；本条不是反对 fallback，而是指出当前 fallback 覆盖了配置驱动路径。
- **历史模式对应**: host config appearance/token 已有 owner，但局部 UI 仍以 hardcoded class/color 形成第二套视觉来源。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

### [维度10-10] spreadsheet `canvas-styles.css` 混入 toolbar 外壳 `rd-*` 样式与硬编码颜色，超出 canvas hybrid CSS 边界

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\canvas-styles.css:201-253`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-toolbar.tsx:9-19`
- **行号范围**: `canvas-styles.css:201-253`, `spreadsheet-toolbar.tsx:9-19`
- **证据片段**:
  ```css
  .rd-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    background: #f6f7fa;
    border-bottom: 1px solid rgb(226, 232, 240);
  }
  ```
- **严重程度**: P2
- **违规类别**: spreadsheet / 主题 / marker
- **现状**: `canvas-styles.css` 文档定位为 spreadsheet canvas 的高性能 `ss-*`/data-_ hybrid stylesheet，但文件中包含 toolbar 外壳 `.rd-toolbar`、`.rd-toolbar-group`、`.rd-toolbar-frozen-badge`、`.bg-btn` 等非 `ss-_` 类，并直接写死背景、边框、激活态颜色。
- **风险**: Spreadsheet 外壳 toolbar 被错误纳入 canvas CSS 例外区，绕过“outer shell 继续使用 shadcn/ui + Tailwind / token”的样式契约；后续 host theme 只能接管 canvas 部分，toolbar 仍停留在固定浅色视觉，且 `rd-*` 命名也不是文档声明的 canvas namespace。
- **建议**: 将 toolbar 外壳样式从 `canvas-styles.css` 拆出到 package-owned toolbar stylesheet 或改为 shadcn/ui/Tailwind 语义色；稳定颜色迁移到 `--nop-*` / `--fd-*` / spreadsheet 专用 token，保留 `canvas-styles.css` 只服务 `ss-*` canvas subtree。
- **为什么值得现在做**: spreadsheet 文档明确把 canvas 例外和外壳层分开；当前同一 CSS 文件混合两类 owner，会让后续主题迁移和 selector scope 审核误把 toolbar 当成 canvas 特例放行。
- **误报排除**: 不把 spreadsheet canvas 内部 `ss-*`、单元格连续值 inline style 或性能导向硬编码判为违规；本条只针对 toolbar 外壳样式混入 canvas 专用 CSS 且使用非 token 固定色。
- **历史模式对应**: high-performance canvas CSS exception 被外壳 UI 样式复用，导致 owner boundary/theme token 漂移。
- **参考文档**: `docs/architecture/styling-system.md`, `docs/architecture/theme-compatibility.md`, `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核
