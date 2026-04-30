# 维度15：安全与性能红线 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-core、flux-formula、flux-runtime、flux-react

---

## 复核结论

| 发现                           | 维度复核 | 子项复核       | 最终严重程度 |
| ------------------------------ | -------- | -------------- | ------------ |
| 发现1: field-frame values 订阅 | 降级P3   | **成立** P3    | P3           |
| 发现2: aggregateError 全量订阅 | 保留     | **成立** P3    | P3           |
| 发现3: 缺少 performance.mark   | 保留     | **降级为Info** | Info（备注） |
| 发现4: getSnapshot 未 memoize  | 保留     | **成立** P3    | P3           |

---

## 安全违规

**无安全违规发现。**

| 规则                      | 结果     | 说明                             |
| ------------------------- | -------- | -------------------------------- |
| R2 禁止 eval/new Function | **通过** | 四包源码中均无动态代码执行原语   |
| R3 Fail-closed            | **通过** | 11 处 catch 块全部 fail-closed   |
| R4 可观察失败             | **通过** | 错误路径均有 monitor/notify 覆盖 |

---

## 性能违规

### [维度15] field-frame.tsx 中 useCurrentFormState 订阅 values 导致 O(N) 级冗余重渲染

- **文件**: packages/flux-react/src/field-frame.tsx:81-85
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P7
- **现状**: `useCurrentFormState` 通过全量 store 广播订阅读取 `state.values`，用于计算 `requiredWhen`/`requiredUnless` 动态必填状态。`state.values` 在每次 `setIn` 后产生新引用，导致所有含动态必填规则的 `FieldFrame` 在任意字段值变化时重渲染。
- **风险**: 在含大量动态必填规则的表单中，每次击键触发 O(N) 次 FieldFrame 重渲染。
- **建议**:
  1. 短期：将 selector 改为仅选取规则依赖的具体路径值
  2. 长期：为 FormStoreApi 增加 `subscribeToPaths` 批量路径订阅能力

### [维度15] field-frame.tsx 中 aggregateError 使用全量 store 订阅

- **文件**: packages/flux-react/src/field-frame.tsx:70-74
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P7
- **现状**: `useCurrentFormState` 通过全量广播订阅，selector 为 O(1) 直接索引。`Object.is` 正确阻止了不相关变更的重渲染，但 selector 在每次 store 变更时都执行。
- **风险**: 在 1000 字段表单中，每次击键执行 1000 次 O(1) selector。当前影响可忽略，但作为公共 API 可能被下游放大。
- **建议**: 标注订阅粒度选择原因，未来考虑多路径精准订阅。

### [维度15] 运行时核心路径缺少结构化性能标记

- **文件**: packages/flux-runtime/src/action-runtime.ts（及整体）、packages/flux-react/src/hooks.ts（及整体）
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P6
- **现状**: 四个核心包未使用 `performance.mark`/`performance.measure`。action-runtime 通过 `Date.now()` 记录 duration 具备基础可观测性，但 scope resolution、node meta/props resolution、form validation traversal、expression evaluation 热路径缺少结构化计时。
- **风险**: 生产环境中无法精确定位热路径瓶颈。
- **建议**: 在 `RendererEnv.monitor` 接口中增加可选的结构化计时钩子，开发模式下插入 performance.mark/measure。

### [维度15] useOwnScopeSelector 的 getSnapshot 未 memoize

- **文件**: packages/flux-react/src/hooks.ts:166
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P7（关联）
- **现状**: `getSnapshot` 以内联箭头函数定义，每次渲染创建新函数引用。功能正确但不符合 React Compiler 最优优化路径。
- **风险**: React Compiler 开启时可能产生额外防御性记忆化开销。
- **建议**: 将 getSnapshot 包裹在 useCallback 中。

---

## 合规总结

| 规则                           | 结果         |
| ------------------------------ | ------------ |
| P1 禁止全图 stringify 变更检测 | **通过**     |
| P2 禁止 O(n^2)                 | **通过**     |
| P3 不可变更新                  | **通过**     |
| P5 可预测异步                  | **通过**     |
| P6 可观测性                    | **部分通过** |
| P7 per-path 订阅               | **部分通过** |

**自动化工具有效发现的项**: R2、P2、P3、P5
**需人工发现的项**: P7 订阅粒度、P6 热路径可观测性、React Compiler 兼容性
