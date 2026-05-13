# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] 报表设计器用 `JSON.stringify` 做主路径文档变更检测

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:124-126,302-337`
- **证据片段**:

  ```ts
  function serializeSpreadsheetDocument(document: SpreadsheetRuntimeSnapshot['document']): string {
    return JSON.stringify(document);
  }

  const lastSyncedSpreadsheetRef = useRef(serializeSpreadsheetDocument(spreadsheetSnapshot.document));
  const lastAppliedReportSpreadsheetRef = useRef(
    serializeSpreadsheetDocument(snapshot.document.spreadsheet),
  );

  useEffect(() => {
    const nextReportSpreadsheet = serializeSpreadsheetDocument(snapshot.document.spreadsheet);
  ```

- **严重程度**: P1
- **类别**: 性能
- **规则编号**: P1
- **现状**: 报表设计器页面在报表文档与 spreadsheet 子文档双向同步时，使用整份文档 `JSON.stringify` 结果做相等性/去重判断。
- **风险**: 每次 spreadsheet 文档变化都会触发整树序列化，文档越大越容易把编辑、选择、同步链路拖入主线程重负载；这正是规范明确禁止的“热路径 stringify 变更检测”。
- **建议**: 改为版本号/修订号/递增 dirty token，或在 core 层暴露稳定的文档 revision；至少不要在交互同步 effect 中对整份文档做字符串化比较。
- **为什么值得现在做**: 这是报表设计器主路径，不是调试/测试代码；v1 基线不允许把明显的热路径退化留在当前主实现里。
- **误报排除**: 这里不是序列化用于存储/导出，而是直接参与运行时同步去重；调用点位于 live renderer 的 `useEffect` 同步链路中。
- **历史模式对应**: 命中性能规范中的历史高频坏味道：`Deep JSON.stringify comparisons on every interactive update`。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-02] Flow Designer 画布边渲染存在 `edges.map + nodes.find + nodes.find` 的 O(E×N) 扫描

- **文件**: `apps/playground/src/flow-designer/flow-designer-canvas.tsx:184-191`
- **证据片段**:
  ```tsx
  {doc.edges.map((edge) => {
    const sourceNode = doc.nodes.find((n) => n.id === edge.source);
    const targetNode = doc.nodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **现状**: 每条边渲染时都会对整份 `doc.nodes` 做两次线性查找。
- **风险**: 图规模增大后，单次画布重渲染会退化为 O(E×N)；节点拖动、缩放、选择等高频刷新会明显放大卡顿。
- **建议**: 在渲染前用 `useMemo` 预建 `Map<nodeId, node>`，边循环内改为 O(1) 查表。
- **为什么值得现在做**: 这是直接位于渲染阶段的集合查找红线，修复局部、收益立刻、不会改变外部契约。
- **误报排除**: 不是测试代码，也不是一次性初始化逻辑；线性查找就在 JSX 渲染循环内部，属于当前 live 交互路径。
- **历史模式对应**: 命中性能规范中的历史模式：图编辑/渲染路径里“loop 内 repeated id-based lookup”。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-03] 报表设计器关键异步加载失败仅通知 UI，缺少结构化观测

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:272-278`; `packages/report-designer-core/src/core.ts:52,246-249,372-373`
- **证据片段**:
  ```ts
  useEffect(() => {
    void core.refreshFieldSources().catch((error) => {
      env.notify?.(
        'warning',
        error instanceof Error && error.message
          ? error.message
          : t('flux.reportDesigner.loadPanelsFailed'),
      );
    });
  }, [core, env]);
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P6
- **现状**: 报表设计器首屏/切换时的 `refreshFieldSources()` 失败只走 `env.notify`，没有 `monitor.onError` / `reportRuntimeHostIssue` / `onError` 这类结构化诊断上报。
- **风险**: 字段面板/派生状态加载失败会进入“用户看到降级，但运行时诊断面板拿不到关键失败上下文”的状态，后续定位性能退化、适配器故障、环境差异都会变慢。
- **建议**: 在创建 `createReportDesignerCore(...)` 时显式接入 `onError`，并在 renderer catch 中补 `reportRuntimeHostIssue` 或 `env.monitor?.onError?.(...)`；UI 通知可保留，但不应成为唯一观测渠道。
- **为什么值得现在做**: 这是设计器主页面的关键异步启动路径，架构文档已明确要求关键失败路径必须可观测。
- **误报排除**: 我已交叉检查 `report-designer-core`，其 core 层本身预留了 `onError` 钩子；因此这里不是“框架没有观测能力”，而是 live renderer 没有把关键失败接入该能力。
- **历史模式对应**: 命中“Observable failure paths / Observability for performance-sensitive failures” 历史约束。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/security-design-requirements.md`
- **复核状态**: 未复核

## 补充检查范围（已覆盖但无可报告项）

- `packages/**/src`, `apps/**/src` 中 `eval(` / `new Function(` 搜索：无命中
- `JSON.stringify(` 全仓扫描后，剔除了存储/测试/导出场景，仅保留主路径变更检测实例
- Zustand/store 更新、`sort/splice`、共享状态可变更新抽查：未发现达到本轮“红线”标准的 live 主路径违规
- 长列表虚拟化抽查：表格与调试器时间线已存在明确虚拟化实现，未形成可报告缺口

## 深挖第 2 轮追加

### [维度15-04] Flow Designer 生命周期 hook 异常缺少结构化可观测性

- **文件**: `packages/flow-designer-core/src/core-node-commands.ts`; `packages/flow-designer-core/src/core-edge-commands.ts`; `packages/flow-designer-renderers/src/designer-context.ts`; `packages/flow-designer-renderers/src/designer-page-inner.tsx`
- **证据片段**:

  ```ts
  export function notifyCommandFailure(
    notify: import('@nop-chaos/flux-core').RendererEnv['notify'] | undefined,
    error: string | undefined,
    reason?: string,
  ) {
    if (!error || reason === 'unchanged') {
      return;
    }

    notify?.('warning', error);
  }
  ```

- **严重程度**: P2
- **类别**: 安全
- **规则编号**: R3
- **现状**: `flow-designer-core` 在 `beforeCreateNode` / `beforeConnect` / `beforeDelete` 抛错时会 `emit({ type: 'lifecycleHookError', hook, error })` 后返回失败；但 renderer 侧将 `core.subscribe` 仅当作 `useSyncExternalStore` 的失效通知使用，没有消费 `DesignerEvent` 明细，最终只通过 `notifyCommandFailure(..., error, reason)` 弹出泛化 warning。
- **风险**: 这类 hook 正处在 host 约束/策略边界上，异常虽然当前是 fail-closed，但 hook 名称、原始错误、上下文都没有进入结构化诊断面，现场只剩“失败了”的 UI 提示。后续一旦接入 host 校验、外部约束或安全相关前置钩子，问题会变成“能力被拒绝但不可诊断”，违反策略类检查失败必须可监控的要求。
- **建议**: 为 `lifecycleHookError` 建立明确的观测出口：至少把 `hook`、`error`、当前命令/目标 id 通过 monitor/diagnostic hook 或统一 `reportHostIssue` 上报；UI toast 仅作用户提示，不应替代结构化日志。若继续复用 `core.subscribe`，则 renderer 侧需要单独订阅并转发 `lifecycleHookError` 事件。
- **为什么值得现在做**: 这是 live 主路径上的失败场景，不是未来能力预留；而且 core 已经生成了结构化错误事件，补上最后一跳成本低、收益高，能直接提升 host 集成排障效率。
- **误报排除**: 这不是泛泛而谈的“最好多打一条日志”。证据上，core 已定义并发射 `lifecycleHookError` 事件，但 live renderer 没有任何结构化消费，只剩 generic warning；因此是现成诊断信号被主路径丢弃，不是风格建议。
- **历史模式对应**: 与已保存的 `[维度15-03] report designer async load failure only notifies UI without structured observability` 属于同一类“关键失败路径只有 UI 提示、没有结构化观测”的新实例，但这里发生在 Flow Designer 生命周期 hook 边界。
- **参考文档**: `docs/architecture/security-design-requirements.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度15-05] DingTalk Flow overlay 计算保留 O(E×N) 重复节点查找热路径

- **文件**: `apps/playground/src/pages/ding-talk-flow-demo.tsx`; `packages/flow-designer-renderers/src/dingflow/dingflow-overlays.ts`
- **证据片段**:
  ```ts
  for (const [sourceId, outs] of sourceGroups) {
    if (outs.length < 2) continue;
    const sourceNode = nodes.find((n) => n.id === sourceId);
    if (!sourceNode) continue;
    const firstTarget = nodes.find((n) => n.id === outs[0].target);
    if (!firstTarget) continue;
    const branchLineY = firstTarget.position.y - BRANCH_SHORT_LEG;
    const cx = sourceNode.position.x + W / 2;
    result.push({ x: cx, y: branchLineY, type: 'addCondition', sourceId });
  }
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1
- **现状**: `ding-talk-flow-demo.tsx` 的 `overlays` `useMemo` 在每次 `nodes` / `edges` 变更时都会重算，并在按边分组后重复执行 `nodes.find(...)` 获取 source/target 节点；同仓正式实现 `dingflow-overlays.ts` 已先构建 `nodeMap` 再做同类计算，说明这里是未收敛的相邻热路径残留。
- **风险**: 该路径会随着每次插入节点、插入分支、重排边关系而反复触发，复杂度退化为 O(E×N)。当 demo 图规模上升时，overlay 重算会和交互更新叠加，带来明显卡顿，并持续放大此前已确认的 id 查找型性能红线。
- **建议**: 参照 `packages/flow-designer-renderers/src/dingflow/dingflow-overlays.ts`，先对 `nodes` 建一次 `Map<string, Node>`，后续所有 overlay 计算都走 O(1) id lookup；同时把两处实现收敛到共享 helper，避免相同退化模式继续分叉复制。
- **为什么值得现在做**: 这是高频交互重算路径，且修复非常局部；同仓已经有现成 Map-based 模式，迁移成本低，不需要额外设计。
- **误报排除**: 这不是“偶尔几次 `find` 可以接受”的样式噪音。这里的 `find` 位于按 edge/sourceGroup/targetGroup 的循环内部，且在 live 页面每次图编辑后都会执行；旁边正式实现已经用 `nodeMap` 规避同类问题，证明这不是理论优化，而是仓内已确认的热路径做法差异。
- **历史模式对应**: 与已保存的 `[维度15-02] flow designer canvas edge rendering does O(E×N) repeated node lookup` 属于同一类“图编辑热路径中的 repeated id lookup”新实例，但本次命中的是 DingTalk playground overlay 计算。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度15-01]: 保留 (P1)。`report-designer` 主路径仍用整份 `JSON.stringify` 做同步去重，直接命中热路径变更检测红线。
- [维度15-02]: 驳回。`apps/playground/src/flow-designer/flow-designer-canvas.tsx` 当前不在 live 页面调用链中，证据不足以认定为当前主路径红线。
- [维度15-03]: 保留 (P2)。`refreshFieldSources()` 失败仍只走 UI 通知，未接入已有结构化上报通道。
- [维度15-04]: 保留 (P2)。Flow Designer lifecycle hook 异常事件在 live renderer 路径中没有结构化消费与上报，只剩泛化 warning 或直接静默。
- [维度15-05]: 保留 (P2)。DingTalk playground demo 当前路由可达，overlay 计算仍保留 O(E×N) 的重复节点查找。

## 子项复核结论

- [维度15-04]: 成立 (P2)。`lifecycleHookError` 事件已在 core 发出，但 renderer 未转发到 `reportRuntimeHostIssue` / `env.monitor`；且 delete hook 失败时连 warning 都可能没有，缺少结构化可观测性。

## 最终保留项

| 编号  | 严重程度 | 文件                                                               | 一句话摘要                                          |
| ----- | -------- | ------------------------------------------------------------------ | --------------------------------------------------- |
| 15-01 | P1       | `packages/report-designer-renderers/src/page-renderer.tsx:124-126` | 主路径用 `JSON.stringify` 做整份文档变更检测        |
| 15-03 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx:272-278` | `refreshFieldSources()` 失败仅通知 UI，未结构化上报 |
| 15-04 | P2       | `packages/flow-designer-core/src/core-node-commands.ts`            | lifecycle hook 异常未进入结构化观测链路             |
| 15-05 | P2       | `apps/playground/src/pages/ding-talk-flow-demo.tsx:56-99`          | DingTalk overlay 计算仍有 O(E×N) 重复节点查找       |
