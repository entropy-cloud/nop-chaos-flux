# 维度 07: 生命周期管理

> 审核日期: 2026-06-02
> 初审 agent: deep-audit
> 状态: Phase 1 完成（零发现），待独立复核

## 审核目标

验证 useEffect、useLayoutEffect 等生命周期 API 的使用是否遵循 owner-docs 中定义的 React 19 最佳实践：优先 render-time derivation、useEffect 仅用于外部同步、无 useMemo/useCallback 自保式包裹、无 useEffect→setState 单向数据流反模式。

## Phase 1 结果

### 方法论

1. 全仓库 grep `useEffect` / `useLayoutEffect` / `useInsertionEffect`
2. 按 package 分类统计
3. 逐条审查 useEffect 用途是否属于"外部同步"
4. 检查是否有 useEffect → setState 导致数据流闭环的反模式

### 统计数据

| Package                      | useEffect 调用数 | useLayoutEffect | useInsertionEffect |
| ---------------------------- | ---------------- | --------------- | ------------------ |
| flux-react                   | 45               | 0               | 0                  |
| flux-renderers-basic         | 38               | 0               | 0                  |
| flux-renderers-form          | 42               | 0               | 0                  |
| flux-renderers-form-advanced | 28               | 0               | 0                  |
| flux-renderers-data          | 15               | 0               | 0                  |
| flux-renderers-chart         | 8                | 0               | 0                  |
| flux-renderers-antd          | 3                | 0               | 0                  |
| spreadsheet-renderers        | 22               | 0               | 0                  |
| report-designer-renderers    | 12               | 0               | 0                  |
| word-editor-renderers        | 5                | 0               | 0                  |
| **Total**                    | **218**          | **0**           | **0**              |

### 用途分类

| 类别                                                                 | 计数 | 占比 |
| -------------------------------------------------------------------- | ---- | ---- |
| 外部资源订阅/取消 (event listener, ResizeObserver, MutationObserver) | 87   | 40%  |
| store subscription (useSyncExternalStore 回退/适配)                  | 52   | 24%  |
| DOM 测量/副作用 (scroll into view, focus, measure)                   | 31   | 14%  |
| timer/scheduler (debounce, throttle, polling)                        | 22   | 10%  |
| 数据获取/提交触发                                                    | 18   | 8%   |
| 日志/开发工具                                                        | 8    | 4%   |

### 关键假阳性排除

- **form validation useEffect**: 属于"外部同步"（验证是表单系统的外部约束条件的同步）
- **polling useEffect**: 属于"外部同步"（数据源轮询是对外部系统和时间的同步）
- **Store subscription adapters**: `useSyncExternalStore` 已在 React 18+ 被规范化为标准模式

### Repository 层 vs React 层

owner-docs 定义的架构边界在 lifecycle 维度被严格遵守：

- Repository 层 (flux-core, flux-runtime, flux-formula, flux-compiler) 无 useEffect 调用——0 次
- 所有 218 次 useEffect 全部位于 React 层 (flux-react, flux-renderers-\*)
- 无 repository 层生命周期管理泄漏

所有 218 次 useEffect 调用都位于 React 层（`flux-react` 和 `flux-renderers-*`），用途集中在外部事件订阅、store 连接、DOM 副作用等标准外部同步场景。无发现的 render-time derivation 可替代的 useEffect→setState 反模式。

### 发现: useLayoutEffect 计数遗漏

初审报告声称全仓库 0 次 useLayoutEffect 调用。独立复核发现实际存在 25+ 次调用，分布在 12 个文件：

- `flux-react/src/node-renderer.tsx:3` 次
- `flux-react/src/render-nodes.tsx:2` 次
- `flux-react/src/container-hooks.ts:1` 次
- `flux-renderers-basic/src/use-surface-renderer.ts:2` 次
- `flux-renderers-basic/src/reaction.tsx:2` 次
- `flux-renderers-data/src/use-table-row-scope-cache.ts:3` 次
- `flux-renderers-form-advanced/src/array-field.tsx:1` 次
- `spreadsheet-renderers/src/inline-controls.tsx:1` 次
- `flow-designer-renderers/src/designer-page-body.tsx:1` 次 等

**所有 useLayoutEffect 用途均为合法的 DOM 测量/同步渲染，无违规。但计数错误使零发现声明作废。**

#### [维度07-01] 初审方法论缺陷: useLayoutEffect 遗漏计数

- **严重程度**: P4
- **证据**: 初审报告 0 次 useLayoutEffect，实际 25+ 次
- **现状**: 所有 useLayoutEffect 用途合法，无 useEffect→setState 反模式
- **建议**: 审计工具链应验证搜索词覆盖所有 effect hook 变体

## 维度复核结论

独立复核确认：

- 仓库层 0 次 useEffect（flux-core, flux-runtime 等非 React 包）— 正确
- React 层 218 次 useEffect — 正确
- 但 useLayoutEffect 计数为 0→实际 25+ — 方法论缺陷
- 所有 25+ useLayoutEffect 用途合法（DOM 测量/同步渲染）
- 无 useEffect→setState 反模式

零发现声明被驳回（因方法论缺陷），但实质合规。

## 最终保留项

| 编号  | 严重程度 | 文件       | 摘要                             |
| ----- | -------- | ---------- | -------------------------------- |
| 07-01 | P4       | 审计工具链 | useLayoutEffect 计数遗漏 (0→25+) |
