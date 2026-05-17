# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] API cache 默认 key 忽略请求 headers，可能把不同上下文请求错误复用到同一缓存项

- **文件**: `packages/flux-runtime/src/async-data/api-cache.ts:168-175`
- **证据片段**:
  ```ts
  export function generateCacheKey(api: ExecutableApiRequest): string {
    const method = api.method ?? 'get';
    const url = api.url;
    const dataStr = api.data !== undefined ? stableStringify(api.data) : '';
    return `${method}:${url}:${dataStr}`;
  }
  ```
- **严重程度**: P1
- **现状**: 默认 cache identity 只看 method/url/body，不看 `api.headers`。
- **风险**: 不同 `Authorization` / tenant / locale / feature header 的请求会命中同一缓存项，形成跨上下文数据泄漏或错误复用。
- **建议**: 把 headers 纳入默认 cache key，或在 headers 存在时强制要求显式 `cacheKey`。
- **为什么值得现在做**: 这是直接影响 correctness 与隔离性的 live cache bug。
- **误报排除**: 不是简单的 `JSON.stringify` 性能疑点；问题是 cache key 语义不完整。
- **历史模式对应**: cache identity incomplete.
- **参考文档**: `docs/architecture/security-design-requirements.md`
- **复核状态**: 未复核

### [维度15-02] debugger inspector 在 form-state enrich 失败时完全吞掉错误且不做 telemetry

- **文件**: `packages/nop-debugger/src/controller-component-inspector.ts:174-180`
- **证据片段**:
  ```ts
  result.scopeData = state.values ?? {};
  } catch {
    void 0;
  }
  ```
- **严重程度**: P2
- **现状**: inspector 获取 capability store 失败时只返回 partial data，没有任何结构化记录。
- **风险**: 调试面板会把真实 wiring failure 表现成“没有数据”，降低诊断可信度。
- **建议**: 至少附加 `inspectError` 或 debugger-specific structured telemetry。
- **为什么值得现在做**: 这是 diagnostics surface 自己的 observability 缺口。
- **误报排除**: 复核已降级，不把它当成核心 runtime 正常路径故障；但在 debugger 面仍是有效问题。
- **历史模式对应**: diagnostics failure silently flattened。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-03] designer palette render 中每个 `ntId` 都线性 `.find()` 一次 `nodeTypes`

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx:117-119`
- **证据片段**:
  ```tsx
  {group.nodeTypes.map((ntId) => {
    const nt = nodeTypes.find((n) => n.id === ntId);
    if (!nt) return null;
  ```
- **严重程度**: P3
- **现状**: render 路径里存在避免不了的重复 id lookup。
- **风险**: palette 规模增大时会形成不必要的 O(n^2)-style render work。
- **建议**: 预先 `useMemo(() => new Map(...))` 建 index。
- **为什么值得现在做**: 复核确认它更像低影响微优化，因此保留为 P3 观察项。
- **误报排除**: 不把它夸大为已证明热点，只保留模式本身。
- **历史模式对应**: avoidable repeated lookup in render loop。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度15-01]：保留 (P1)。默认 cache key 忽略 headers 的语义缺口成立。
- [维度15-02]：降级为 P2。影响限定在 optional debugger enrichment。
- [维度15-03]：降级为 P3。更多是低影响 micro-optimization。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                             |
| ----- | -------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| 15-01 | P1       | `packages/flux-runtime/src/async-data/api-cache.ts:168-175`           | API cache 默认 key 忽略 headers                        |
| 15-02 | P2       | `packages/nop-debugger/src/controller-component-inspector.ts:174-180` | debugger inspector enrich 失败时完全吞错且无 telemetry |
| 15-03 | P3       | `packages/flow-designer-renderers/src/designer-palette.tsx:117-119`   | palette render 对 `nodeTypes` 做重复线性查找           |
