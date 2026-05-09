# 09 Renderer Contract

- 深挖轮次: 1
- 深挖发现数: 2

## 第 1 轮初审

### [维度09-01] TabsRenderer 的 onChange 事件没有向 ActionContext 提供事件载荷

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\tabs.tsx:197-206`
- **行号范围**: 197-206
- **证据片段**:
  ```tsx
  onValueChange={(next) => {
    ownedAxis.setValue(String(next));
    const nextIndex = items.findIndex(
      (item, index) => getItemValue(item, index) === String(next),
    );
    void props.events.onChange?.(null, {
      scope: props.helpers.createScope(
        { value: next, index: nextIndex },
        { scopeKey: 'tabs', pathSuffix: 'tabs' },
  ```
- **严重程度**: P2
- **契约条款**: `docs/architecture/renderer-runtime.md` 的 Event Passthrough Contract 要求 DOM/React 事件入口转发事件；非 DOM 语义事件也应携带有意义的 `type` 字段。维度 09 还要求事件处理器使用 `void` 模式且不丢失事件契约。
- **现状**: `TabsRenderer` 在 Radix `onValueChange` 中触发 `props.events.onChange` 时传入 `null`，仅通过临时 scope 注入 `value/index`，没有提供 `ActionContext.event.type` 或语义事件对象。
- **风险**: schema 中的 `onChange` action、调试器、自动化或 imported namespace provider 无法通过统一事件合同判断这是 tabs change，也无法从 `ActionContext.event` 读取新值；后续开发容易继续复制“事件字段只靠 scope 传参”的模式。
- **建议**: 将第二参数保留为 scope 注入，同时把第一个参数改为结构化语义事件，例如 `{ type: 'change', value: String(next), index: nextIndex }`；若底层组件未来暴露原生事件，则优先转发原生事件。
- **为什么值得现在做**: tabs 是基础布局/交互 renderer，事件合同偏差会影响所有使用 tabs 切换驱动 action 的 schema；修复面小，能让事件字段和 renderer-runtime 文档重新对齐。
- **误报排除**: 这不是 widget-local UI state/style 问题，也不是今天 230 已收口的 slot/meta/readOnly/detail-view/name 类问题。问题点是 live renderer event field 的公开运行时载荷缺失；`void` 已使用，但传入 `null` 仍违反事件载荷契约。
- **历史模式对应**: 对应“renderer contract drift / event passthrough drift”模式；命中 calibration pattern 8 时不按局部 UI 状态处理，因为这里不是本地交互状态，而是 declarative event 对外合同。
- **参考文档**: `docs/architecture/renderer-runtime.md:465-487`, `docs/skills/deep-audit-prompts.md:1094-1123`, `AGENTS.md:116-141`
- **复核状态**: 未复核

### [维度09-02] Table 控制事件以 null 触发，分页等公开事件缺少原生或语义 event

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\use-table-pagination.ts:52-61`
- **行号范围**: 52-61
- **证据片段**:
  ```ts
  const handlePageChange = useCallback(
    (page: number) => {
      startTransition(() => {
        if (paginationOwnership === 'local') {
          setLocalCurrentPage(page);
        } else if (paginationOwnership === 'scope' && paginationStatePath) {
          renderScope.update(paginationStatePath, { currentPage: page, pageSize });
        }
      });
      onPageChange?.(null, {
  ```
- **严重程度**: P2
- **契约条款**: `RendererComponentProps.events` 是 declarative event handler 通道；`renderer-runtime.md` 要求 DOM/React 入口转发事件对象，非 DOM 语义事件也应携带有意义的 `type` 字段。
- **现状**: table 分页控制在 `handlePageChange` 中调用 `onPageChange?.(null, ...)`。同一 table 控制族中 selection/sort/filter 也采用 `null` 作为事件载荷，只把业务值放入 helper scope。
- **风险**: 表格分页、筛选、排序、选择这些公开事件无法通过统一 `ActionContext.event` 被调试器、自动化、namespace provider 或 action 链消费；schema 作者只能依赖临时 scope 约定，事件字段合同与其他 renderer 不一致。
- **建议**: 为 table 控制回调线程化原始 UI event，或在无法传递原生事件时构造结构化语义事件，例如 `{ type: 'pageChange', page, pageSize }`、`{ type: 'selectionChange', selectedRowKeys }`，并保留当前 scope 注入以兼容既有 action。
- **为什么值得现在做**: table/crud 是数据 renderer 的核心入口，事件字段多且常用于业务 action；统一事件载荷可减少后续组件能力、调试器和自动化集成的特殊分支。
- **误报排除**: 这不是 table 的本地分页/选择状态是否合理的问题，也不机械报告 widget-local UI state。问题是 live declarative event channel 以 `null` 破坏了 renderer-runtime 的事件载荷合同；与 230 已收口的 slot/meta/readOnly/detail-view/name 无重复。
- **历史模式对应**: 对应“公开 renderer event 合同与运行时 ActionContext 不一致”的历史高频漂移；calibration pattern 8 不适用为豁免，因为这里不是局部样式或瞬态 UI state。
- **参考文档**: `docs/architecture/renderer-runtime.md:465-487`, `docs/architecture/renderer-runtime.md:176-197`, `docs/skills/deep-audit-prompts.md:1094-1123`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度09-03] CodeEditorRenderer 的 onChange/onFocus/onBlur 未按事件合同提供 type/原生事件载荷

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:38-52`
- **行号范围**: 38-52
- **证据片段**:

  ```ts
  const handleChange = (newValue: string) => {
    if (readOnly) {
      return;
    }

    if (currentForm && hasName) {
      currentForm.setValue(name, newValue);
      void currentForm.validateField(name, 'change');
    } else if (hasName) {
      currentValidationScope?.touchField?.(name);
      scope.update(name, newValue);
      void currentValidationScope?.validateAt(name, 'change');
    }
    props.events.onChange?.({ value: newValue });
  };
  ```

- **严重程度**: P2
- **契约条款**: `docs/architecture/renderer-runtime.md` Event Passthrough Contract 要求 DOM/React 事件入口转发原生事件；非 DOM 语义 payload 也应携带有意义的 `type` 字段。维度 09 还要求事件处理器使用 `void` 返回模式。
- **现状**: CodeMirror 适配层只向 `onChange` 传 `{ value }`，没有 `type`；`onFocus?.()` / `onBlur?.()` 还完全不传 event 或语义 payload，且 `onChange` 没有使用 `void` 消化异步 action 返回。
- **风险**: schema action、debugger、automation 或 imported namespace provider 无法通过统一 `ActionContext.event.type` 判断 change/focus/blur 来源；异步 action 返回也可能形成未显式处理的 promise 漂移。
- **建议**: 为 CodeMirror 事件构造语义事件，例如 `{ type: 'change', value: newValue }`、`{ type: 'focus' }`、`{ type: 'blur' }`，并用 `void props.events.onXxx?.(...)` 保持 renderer event 调用模式一致。
- **为什么值得现在做**: code-editor 是复杂表单控件，事件常用于表达式、SQL、配置编辑等业务流；修复集中在一个 binding hook，兼容成本低。
- **误报排除**: 这不是要求第三方 CodeMirror 暴露 DOM 原生事件；合同明确允许非 DOM 语义 payload，但要求有 `type`。也不重复第 1 轮 tabs/table null payload，本条是独立 renderer 的残留事件合同漂移。
- **历史模式对应**: 对应 renderer event passthrough drift；命中 calibration pattern 8 时不按“局部 widget 状态”豁免，因为问题是公开 declarative event channel 的 `ActionContext.event` 形状。
- **参考文档**: `docs/architecture/renderer-runtime.md:473-495`, `docs/skills/deep-audit-prompts.md:1094-1123`
- **复核状态**: 未复核

### [维度09-04] Dialog/Drawer surface onOpen/onClose 事件以空载荷触发，缺少语义 event

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts:151-168`
- **行号范围**: 151-168
- **证据片段**:

  ```ts
  const handleSurfaceOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (controlledOpen === undefined) {
        surfaceRuntime?.store.setUncontrolledOpen(id, nextOpen);
      }

      if (!nextOpen) {
        if (closeHandledRef.current) {
          return;
        }

        closeHandledRef.current = true;
        void eventHandlers.onClose?.();
        return;
      }

      closeHandledRef.current = false;
      void eventHandlers.onOpen?.();
    },
  ```

- **严重程度**: P2
- **契约条款**: `onOpen` / `onClose` 在 renderer definition 中声明为 `kind: 'event'`，应通过 renderer event channel 提供原生或语义事件载荷；非 DOM 语义事件也应包含 `type`。
- **现状**: Dialog/Drawer 的 surface open-change 主路径调用 `eventHandlers.onClose?.()` / `onOpen?.()` 时不传任何 event；后续 `SurfaceEntry` 的 `onOpen/onClose` 包装也同样空载荷。
- **风险**: action 内无法从 `ActionContext.event` 区分 `open`、`close`、来源 surface id、kind 或当前 open 状态；debugger/automation 对 surface 生命周期事件只能依赖外部 scope/status 旁路推断。
- **建议**: 构造语义事件，例如 `{ type: 'open', surfaceId: id, kind }`、`{ type: 'close', surfaceId: id, kind }`；如果底层 close 控件可提供原生事件，则在线程允许处优先透传原生事件并补充语义字段。
- **为什么值得现在做**: surface 是基础交互边界，onOpen/onClose 常用于加载、清理、埋点；事件载荷补齐不会改变现有 scope/status 语义。
- **误报排除**: 这不是 reopened decision 2 中已裁定的 declarative surface 双状态旧问题；本条不讨论 open 状态 owner，只报告仍然 live 的 renderer event payload contract residual。
- **历史模式对应**: 对应 surface-family renderer event passthrough residual；属于已收口旧问题旁边的新事件载荷残留，而非复开旧生命周期所有权问题。
- **参考文档**: `docs/architecture/renderer-runtime.md:473-495`, `docs/references/reopened-design-decisions-and-audit-adjudications.md:38-49`
- **复核状态**: 未复核

### [维度09-05] CRUD 查询事件以 undefined 触发，query submit/reset 缺少事件 type

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-ownership.ts:129-143`
- **行号范围**: 129-143
- **证据片段**:

  ```ts
  const submitQueryValues = useCallback(
    (nextValues: Record<string, unknown>) => {
      if (scope) {
        scope.update(queryStatePath, {
          values: nextValues,
          refreshCount: queryState.refreshCount + 1,
        });
      }

      if (shouldFetchOnQueryChange) {
        onQuerySubmit?.(undefined, {
          scope,
          evaluationBindings: { query: nextValues },
        });
  ```

- **严重程度**: P2
- **契约条款**: `RendererComponentProps.events` 是 declarative event handler 通道；非 DOM 语义事件也应携带有意义的 `type` 字段。
- **现状**: CRUD query submit 以 `undefined` 作为事件载荷触发；同文件 reset 路径也用 `onQueryReset?.(undefined, ...)`，`crud-renderer.tsx` 的 refresh 路径使用 `onRefresh?.(undefined, ...)`。
- **风险**: CRUD 的查询、重置、刷新 action 只能读取临时 scope/evaluationBindings，无法通过统一 `ActionContext.event` 识别事件类型、query 值或刷新意图；与 table/tabs 等 renderer 事件合同继续分叉。
- **建议**: 保留当前 `scope` / `evaluationBindings` 兼容层，同时传入结构化语义事件，例如 `{ type: 'querySubmit', query: nextValues }`、`{ type: 'queryReset', query: defaultQuery }`、`{ type: 'refresh' }`。
- **为什么值得现在做**: CRUD 是数据 renderer 的核心入口，query/reset/refresh 是高频业务 action；补齐事件载荷可减少后续 action、调试器和自动化集成的特殊分支。
- **误报排除**: 这不是第 1 轮 table 分页/排序/筛选/选择 `null` payload 的重复报告；本条聚焦 CRUD 自有 query/refresh event，触发点和 action 语义不同。
- **历史模式对应**: 对应公开 renderer event 合同与 ActionContext.event 不一致的残留模式；calibration pattern 8 不作为豁免，因为这里不是局部 UI state。
- **参考文档**: `docs/architecture/renderer-runtime.md:473-495`, `docs/skills/deep-audit-prompts.md:1094-1123`
- **复核状态**: 未复核

### [维度09-06] Table expandedRow region 未声明 params，渲染时传入的 record/index 不进入 $slot 合同

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\tables.ts:189-196`
- **行号范围**: 189-196
- **证据片段**:
  ```ts
  return extractNestedSchemaRegions({
    candidate: value as Record<string, unknown>,
    itemRegionPath: `${path}.expandable`,
    itemRegionKeyPrefix: 'expandable',
    rules: [
      { key: 'expandedRow', regionKeySuffix: 'expandedRow', compiledKey: 'expandedRowRegionKey' },
    ],
    regions,
    compileSchema,
  }).value;
  ```
- **严重程度**: P2
- **契约条款**: scoped render slots 要求带局部参数的 region 通过 `params` 声明参数签名，并通过 `$slot.xxx` 暴露；renderer-runtime 要求 region rendering 使用显式 `bindings/instancePath` 合同。
- **现状**: `expandedRow` 被抽取成 region 时没有声明 `params: ['record', 'index']`，但 `table-body-row-rendering.tsx:376-385` 渲染该 region 时实际传入 `{ record, index }` bindings。由于缺少 params，运行时会按未参数化 region 处理，bindings 被平铺到普通 scope，而不是 `$slot.record/$slot.index`。
- **风险**: expanded row 与 table cell/buttons 的 `$slot.record/$slot.index` 合同不一致；schema 作者在不同 table 子区域需要记两套访问方式，嵌套 slot 时也更容易发生普通 scope 名称碰撞。
- **建议**: 为 `expandedRow` 的 deep-field normalizer 补齐 `params: ['record', 'index']`，必要时按性能/隔离要求同步声明 `isolate`，并保留 renderer 侧现有 `bindings`/`instancePath` 传递。
- **为什么值得现在做**: 这是 table 已完成 scoped slot 收口后的同族残留，修复点小且能让 expanded row 与 cell/buttons 的 authoring contract 对齐。
- **误报排除**: 这不是要求所有普通 region 都参数化；expandedRow 已经由 renderer 传入 row-local `record/index`，因此它是实际 parameterized region，只是 compiler metadata 遗漏。
- **历史模式对应**: 对应 renderer contract residual / scoped slot metadata drift；与 reopened decisions 中的 dual-state 或 surface owner 裁定无关。
- **参考文档**: `docs/architecture/scoped-render-slots.md:24-36`, `docs/architecture/scoped-render-slots.md:131-163`, `docs/architecture/renderer-runtime.md:631-645`
- **复核状态**: 未复核

### [维度09-07] DesignerPageRenderer 的错误 fallback 未透传 meta.testid/data-cid

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:26-44`
- **行号范围**: 26-44
- **证据片段**:

  ```tsx
  export function DesignerPageRenderer(props: RendererComponentProps<DesignerPageSchema>) {
    const config = readDesignerResolvedProp<DesignerConfig>(props, 'config');

    if (!config) {
      return <div>{t('flux.flowDesigner.configRequired')}</div>;
    }

    const documentMode = config.documentMode;

    if (documentMode === 'tree') {
      return <TreeModeLayoutWrapper {...props} config={config} />;
  ```

- **严重程度**: P3
- **契约条款**: 维度 09 要求 `data-testid` 和 `data-cid` 从 `props.meta` 正确传递；renderer-runtime 将 `meta.testid` 定义为 root element 的 `data-testid` 输出。
- **现状**: 正常 canvas 分支会在下游透传 root meta，但 `config` 缺失、`document` 缺失等 fallback 直接返回裸 `<div>`，没有 `className`、`data-testid`、`data-cid`。
- **风险**: misconfigured designer renderer 在 debugger、自动化和测试中失去节点定位能力；错误状态 DOM 与正常状态 root contract 不一致。
- **建议**: 在 fallback root 上复用 `getRootMetaProps(props.meta)`，或抽一个统一 error shell，确保所有返回分支都输出 `data-testid`/`data-cid`。
- **为什么值得现在做**: 修复成本很低，可避免错误状态刚好需要诊断时丢失 inspect/test 定位信息。
- **误报排除**: 这不是要求 error fallback 实现完整 UI 壳层；只要求 renderer root meta passthrough 在所有分支保持一致。也不同于 230 已收口的 field/readOnly/slot 类问题。
- **历史模式对应**: 对应 renderer meta passthrough residual；不命中 calibration pattern 8 的本地 UI 状态豁免。
- **参考文档**: `docs/architecture/renderer-runtime.md:177-214`, `docs/skills/deep-audit-prompts.md:1120-1121`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度09-08] FormRenderer 的表单生命周期事件以 `undefined` 触发，缺少语义 event payload

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form.tsx:202-211`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form-definition.ts:110-130`
- **行号范围**: 202-211；110-130
- **证据片段**:
  ```tsx
  ownedForm.setLifecycleHandlers({
    submitAction: submitAction
      ? (options) =>
          submitAction(undefined, {
            scope: lifecycleScope,
            form: ownedForm,
            interactionId: options?.interactionId,
            signal: options?.signal,
          })
      : undefined,
  ```
  ```ts
  eventContracts: {
    initAction: {
      displayName: 'Init',
      description: 'Runs after the form runtime is created.',
    },
    submitAction: {
      displayName: 'Submit',
      description: 'Primary submit pipeline for the form.',
    },
  ```
- **严重程度**: P2
- **契约条款**: `RendererComponentProps.events` 是 declarative event handler 通道；`docs/architecture/renderer-runtime.md` 要求非 DOM 语义 payload 也应携带有意义的 `type` 字段。
- **现状**: `FormRenderer` 将 `initAction`、`submitAction`、`onSubmitSuccess`、`onSubmitError`、`onValidateError` 均作为 renderer event 注册，但触发时第一个参数传 `undefined`，只通过第二参数传 scope/form/result。
- **风险**: 表单提交、初始化、成功、失败、校验失败这些核心事件在 `ActionContext.event` 中不可区分；调试器、自动化、imported namespace provider 或 action 链只能依赖旁路上下文推断事件语义。
- **建议**: 为表单生命周期事件传入结构化语义 payload，例如 `{ type: 'formSubmit' }`、`{ type: 'formInit' }`、`{ type: 'formSubmitSuccess', result }`、`{ type: 'formValidateError', error }`，同时保留现有 scope/form/result 上下文。
- **为什么值得现在做**: form lifecycle event 是核心业务 action 入口，补齐 payload 可以与 tabs/table/CRUD 等事件合同一起收敛。
- **误报排除**: 这不是重复报告已保存的 tabs/table/code-editor/surface/CRUD 事件载荷问题；本条聚焦独立的 form renderer lifecycle event channel。它也不是普通内部 callback，因为 `form-definition.ts` 明确把这些字段声明为 renderer `eventContracts` 和 `kind: 'event'`。
- **历史模式对应**: renderer event channel 以 scope 旁路替代 `ActionContext.event` 的同族 residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度09-09] TreeRenderer 的参数化 node region 未传递 per-node `instancePath`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\tree-renderer.tsx:86-90`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\data-renderer-definitions.ts:65-70`
- **行号范围**: 86-90；65-70
- **证据片段**:
  ```tsx
  const label = getIn(node, labelField);
  const nodeContent = owner.regions.node
    ? owner.regions.node.render({
        bindings: { node, index, depth, key: nodeKey, parentNode },
      })
    : null;
  ```
  ```ts
  {
    key: 'node',
    kind: 'region',
    params: ['node', 'index', 'depth', 'key', 'parentNode'],
    isolate: false,
  },
  ```
- **严重程度**: P2
- **契约条款**: `docs/architecture/renderer-runtime.md` 的 region rendering 规则要求 repeated renderers 优先使用显式 `instancePath` 与稳定 key 派生 bindings；`instancePath` 是重复子树实例身份合同。
- **现状**: `tree` 的 `node` region 已声明为参数化 region，并在每个树节点渲染时传入 node/index/depth/key，但没有把 `nodeKey`/depth 派生出的 `instancePath` 传给 `regions.node.render()`。
- **风险**: 自定义 tree node region 中挂载的子 renderer 无法获得 per-tree-node 的重复实例身份；调试、组件 handle 定位、节点实例路径、重复节点内生命周期和 action 归属都可能退化为同一结构节点身份。
- **建议**: 在 `TreeNodeRenderer` 中构造稳定 `InstanceFrame[]`，例如基于父路径 + `{ repeatedTemplateId: 'tree.node:<owner id>', instanceKey: nodeKey }`，并传入 `owner.regions.node.render({ bindings, instancePath })`；递归子节点继续追加路径。
- **为什么值得现在做**: tree node region 是递归重复渲染路径，修复可以避免后续在节点级 action、调试器和生命周期定位上引入更难排查的身份漂移。
- **误报排除**: 这不是要求普通 region 必须传 `instancePath`；`tree.node` 明确在递归/重复数据结构中按节点多次渲染，且已经声明 `params`，因此属于重复 region 身份遗漏。也不重复已保存的 `expandedRow` params 缺失问题：本条是 params 已存在但实例身份未传递。
- **历史模式对应**: repeated region 已有 scoped params 但缺少 instance identity 的 renderer contract residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/scoped-render-slots.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的问题。深挖结束。
