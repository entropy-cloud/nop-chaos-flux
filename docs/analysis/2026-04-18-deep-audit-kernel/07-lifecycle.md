# 维度07：生命周期与副作用归属 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-react/src 全部非测试文件中的 useEffect 和 useLayoutEffect（共 21 个 effect）

> Historical Note: This report reflects an older `flux-react` baseline. Mentions of `useNodeImports` / `use-node-imports.ts` refer to a path that was later retired; they should not be read as the current import lifecycle implementation.

---

## 发现清单

### [维度07-1] schema-renderer import 预加载 effect 中 props.env 导致不必要的重复执行

- **文件**: `packages/flux-react/src/schema-renderer.tsx:115-180`
- **严重程度**: P2
- **effect 职责**: 预加载 schema 根级 import namespace
- **应归属层级**: React 层（触发层正确，但依赖项有问题）
- **现状**: 依赖数组包含 `props.env` 对象引用。如果父组件每次渲染创建新 env 对象，effect 会重新执行导致所有 namespace import 从头开始。同文件已有 `envRef` 模式但此 effect 未使用。
- **建议**: 在 effect 内部用 `envRef.current` 替换 `props.env`，从依赖数组中移除

### [维度07-2] useSourceValue 在 effect 中直接管理 AbortController，缺少 controller 抽象

- **文件**: `packages/flux-react/src/useSourceValue.ts:32-63`
- **严重程度**: P2
- **effect 职责**: 执行 source 数据获取 + AbortController 管理 + loading/error 状态
- **应归属层级**: AbortController 生命周期管理应提取到 runtime 层 controller
- **现状**: 同包内 node-source-prop-controller.ts 已实现 vanilla JS controller 模式，useSourceValue 仍内联所有逻辑到 effect 中。两个文件做相同的事但用不同模式。
- **建议**: 创建类似的 createSourceValueController() vanilla JS controller

### [维度07-3] use-node-source-props ref 更新 effect 无依赖数组

- **文件**: `packages/flux-react/src/use-node-source-props.ts:26-32`
- **严重程度**: P3
- **effect 职责**: 保持 propsValueRef 和 scopeRef 为最新值
- **现状**: 两个无依赖数组的 effect 每次 render 后都执行。"latest ref" 模式功能正确但有微小开销。
- **建议**: 考虑将 ref 更新移到 render 体中

### [维度07-4] useNodeImports 依赖数组包含冗余派生值

- **文件**: `packages/flux-react/src/useNodeImports.ts:62-135`
- **严重程度**: P3
- **现状**: requestKey 与 runtime, activeScope 等存在重叠。冗余 deps 不导致额外执行但依赖语义不清晰。
- **建议**: 保留当前实现，低优先级

### [维度07-5] 生命周期 action 依赖范围偏宽

- **文件**: `packages/flux-react/src/node-renderer-effects.ts:65-79`
- **严重程度**: P3
- **现状**: helpers 引用变化会导致伪 unmount/mount 周期。当前实际运行中通常稳定。
- **建议**: 使用 useRef 稳定化 onMount/onUnmount 的首次/末次调用逻辑

---

## 已验证无问题

| 维度 | 结果 |
|------|------|
| 渲染阶段 store 变更（Bug 15） | **已收敛** — 所有 setSnapshot/setState 均在 useEffect 内 |
| 组件卸载清理完整性 | **全部 effect 有正确 cleanup** |
| useLayoutEffect vs useEffect | **选择合理** — 仅 workbench 中的同步 scope 操作使用 useLayoutEffect |
| 正确位于 React 层的 effect | **16 个** — 无问题 |

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| 07-1: import预加载props.env依赖 | 保留降级P3 | **成立P3** | P3 |
| 07-2: useSourceValue缺少controller | **驳回** | — | — |
| 07-3: ref更新effect无依赖数组 | **驳回** | — | — |
| 07-4: useNodeImports依赖冗余 | 保留P3 | **成立P3** | P3 |
| 07-5: 生命周期action依赖偏宽 | 保留P3 | **降级Info**（依赖对象实际稳定） | Info |
