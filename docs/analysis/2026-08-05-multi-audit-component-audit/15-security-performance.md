# 维度 15: 安全与性能红线（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c80c4c3ffeRuv0PzQ6d0wp6F`）

## 第 1 轮（初审）

### [维度15-1] relayoutTree 使用全文档 JSON.stringify 做变更检测（P1 规则边界）

- **文件**: `packages/flow-designer-core/src/tree-session-impl.ts:310-311`
- **严重程度**: P2（非热路径，但违反 P1 模式意图）
- **证据片段**:
  ```ts
  const previousSnapshot = JSON.stringify({ nodes: ctx.doc.nodes, edges: ctx.doc.edges });
  const nextSnapshot = JSON.stringify({ nodes: nextDoc.nodes, edges: nextDoc.edges });
  if (previousSnapshot === nextSnapshot) {
    return makeTreeCommandResult(true);
  }
  ```
- **现状**: relayoutTree 对全 doc nodes+edges 做两次全量 stringify + clone 判定"布局是否实际变化"。
- **风险**: 大文档每次 relayout 两次 O(n) 序列化；与同文件 setDocument 引用比较方案不一致。
- **建议**: 用布局修订计数或长度+id 列表浅比较。
- **误报排除**: 非热路径（用户触发），故不按 P1 上报；但同桶其他命中均为稳定 cache-key 已排除。

### [维度15-2] designer:setPanelWidths 对 NaN 宽度无防护（fail-closed 缺口）

- **文件**: `packages/flow-designer-core/src/core/shell-controls.ts:17-24,112-130`；`packages/flow-designer-renderers/src/designer-action-provider.ts:447-453`
- **严重程度**: P2
- **证据片段**:
  ```ts
  function clampShellWidth(panel, width) {
    return Math.min(Math.max(width, min), max); // Math.max(NaN, min) === NaN
  }
  // action provider: typeof args.paletteWidth === 'number' → NaN 是 number，放行
  ```
- **现状**: typeof number 检查放行 NaN；clamp 对 NaN 不设防；幂等守卫对 NaN 恒 false → 每次 dispatch 都 emit；NaN 进 gridTemplateColumns 产生无效 CSS。
- **风险**: schema 表达式解析出 NaN 注入时面板宽度跳默认值、aria-valuenow 为 NaN、重复 emit。
- **建议**: Number.isFinite 守卫，非有限值返回 { ok:false, reason:'invalid-width' }（fail-closed）。
- **误报排除**: 拖拽路径产生的宽度恒为有限数，live 拖拽不受影响；仅 schema-callable action 路径可注入 NaN。

### [维度15-3] barcode WASM 默认 URL 硬编码第三方 CDN endpoint（R5 文档化缺口）

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/utils/prepare-wasm-utils.ts:3`
- **严重程度**: P2
- **证据片段**:
  ```ts
  const DEFAULT_WASM_URL = 'https://unpkg.com/@zxing/library@0.21.3/umd/zxing_reader.wasm';
  ```
- **现状**: 包内硬编码 unpkg CDN 默认地址；IO 已正确经注入 env.fetcher（fail-closed：无 fetcher 直接 throw），live 路径仅 schema 提供 wasmUrl 才调用，默认值实际不可达。
- **风险**: 违反 INV-1"不在 schema/渲染器硬编码 endpoint"；若调用方把 undefined 传入，请求打到 unpkg，宿主无法代码层面阻止；假设未在任何架构文档记录（违反 R5）。
- **建议**: 删除默认 URL 改抛错（fail-closed），或文档化该默认值与宿主覆盖义务。
- **误报排除**: fetcher 注入已强制（契约测试锁定），非 INV-1 IO 直调违规；仅硬编码 endpoint + 文档化缺口。

## 维度 15 零发现结论（R1）

- INV-1 env IO 边界：packages 生产代码 fetch/WebSocket/localStorage 等零命中；markdown src 走 env.fetcher；barcode wasm 走注入 fetcher；camera getUserMedia 已文档化例外。
- fail-closed：graph-command-gate 全部命令先查 isTreeMode 再查 assertReadonly；tree-session 对 readonly/非 tree 模式返回 unavailable。
- O(n²)：tree-projection/tree-structure/graph-layout/timeline/gantt 虚拟化均无热点。
- 不可变更新：tree-structure 全部先 cloneTreeDocument 再改；graph-store set({...})。
- React Compiler：新包零 React.memo；graph-renderer useCallback([]) 有注释记载的 xyflow 依据。

## 维度复核结论

待复核。
