# 维度07：生命周期与副作用归属

## 审核日期: 2026-04-20

> Historical Note: This audit captures the runtime/lifecycle state from 2026-04-20. Any references to `use-node-imports.ts` describe a retired path; later work removed that hook in favor of schema-level import preparation/preload plus synchronous prepared-import installation.

## 发现清单（经初审+维度复核+子项复核）

### [P1] F01: DynamicRenderer mountedRef 竞态条件

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:29-57`
- **严重程度**: P1（已通过 3 次独立复核确认）
- **effect 职责**: 异步加载动态 schema
- **应归属层级**: React 层（触发时机正确），但取消机制有缺陷
- **现状**: 使用单个 `mountedRef` 布尔标记代替 `AbortController`。当 schemaApi 快速变化时：
  1. Effect A 启动，mountedRef=true，发起加载 A
  2. Cleanup A: mountedRef=false
  3. Effect B 启动，mountedRef=true，发起加载 B
  4. 加载 A 完成，检查 mountedRef → true（被 B 重置）→ **过期数据写入 state**
- **根因**: 单一布尔标记无法区分"当前 effect 已清理"和"新 effect 已挂载"
- **建议**: 替换为 AbortController 模式，cleanup 时 abort。executeApiObject 已支持 AbortSignal（request-runtime.ts:273），调用时传入 signal 即可。

### [P2→P3] F02: ChartRenderer 三合一 effect

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:53-101`
- **严重程度**: P3（维度复核降级）
- **effect 职责**: echarts.init + setOption + resize 监听合并为单个 effect
- **现状**: 三种职责合并，每次 option 变化都重注册 resize 监听器。功能正确（cleanup 移除旧监听），但代码组织可改善。
- **建议**: 拆分为 init / option update / resize 三个独立 effect。非功能缺陷。

### [P2→P3] F03: useContainerDomRegistration ref 依赖

- **文件**: `packages/flux-react/src/container-hooks.ts:15-31`
- **严重程度**: P3（维度复核降级）
- **effect 职责**: 将 DOM 元素注册到 ComponentHandleRegistry
- **现状**: `elementRef` 在依赖数组中但 ref 对象引用永不变。实际场景中 container 首次渲染即存在，几乎不会触发问题。
- **建议**: 代码规范问题，非运行时缺陷。

### [P2→P3] F04: FormRenderer status 手动 dirty-check

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:264-326`
- **严重程度**: P3（维度复核降级）
- **effect 职责**: 订阅 form store → 计算 FormStatusSummary → 发布到 parentScope
- **现状**: 手动 dirty-check（lastSummary 逐字段比较）是必要的防护，防止无限循环。此桥接依赖渲染层提供的 statusPath/parentScope，移入 FormRuntime 会引入对 scope 层级的反向依赖。
- **建议**: 可提取为可复用 hook `useFormStatusPublisher`，但无需移入 runtime 层。

### [P2→P3] F05: CrudRenderer $crud 硬编码魔术键

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:156-160`
- **严重程度**: P3（维度复核降级）
- **现状**: `$crud` 是有意设计的 API（JSDoc 和测试明确），子树表达式通过 `$crud` 访问摘要。内联 effect 缺少 equality guard 是轻微效率问题。
- **建议**: 将 `'$crud'` 提取为命名常量。

### [P3] F06: NodeRenderer 和 field-utils 重复 hidden field notification

- **文件**: `node-renderer.tsx:266-276` 和 `field-utils.tsx:296-306`
- **严重程度**: P3
- **现状**: 两处实现相同功能（通知 form runtime 字段隐藏状态）。`useHiddenFieldPolicy` 在源码中无导入方（死代码）。因包依赖方向限制，flux-react 不能依赖 flux-renderers-form。
- **建议**: 将 `useHiddenFieldPolicy` 移至 flux-react 包，NodeRenderer 改为调用该 hook。

### [驳回] F07: ReportDesignerPage refreshFieldSources on mount

- **排除理由**: 构造 core → effect 触发异步初始化是 React 标准模式。useMemo 不应触发副作用。

### [P3] F08: ref-sync effect 无依赖数组

- **文件**: `use-node-source-props.ts:26-32`
- **严重程度**: P3
- **现状**: 无依赖 effect 每次 render 同步 props/scope 到 ref。"latest ref" 模式确保其他 effect 中 controller.run() 读取最新值。成本极低（引用赋值）。
- **注意**: `use-node-imports.ts:57-59` 有依赖数组 `[nodeInstance]`，初审描述不准确。
- **建议**: 可提取为 `useLatestRef(value)` 工具 hook 并加注释。

### [P2] F09: variant-field runDetectVariantAction 异步 useCallback 无取消机制

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:98-128`
- **严重程度**: P2（同类问题扫描新增）
- **effect 职责**: 检测 variant 类型变更并同步到 store
- **现状**: `runDetectVariantAction` 是 async useCallback，内部 await 后执行状态更新。当组件卸载或 variant 快速切换时，过期的异步结果仍会写入 store。
- **与 F01 的关系**: 与已修复的 DynamicRenderer mountedRef 问题同属"异步操作缺少取消"类别。但此处使用 useCallback 而非 useEffect，模式略有不同。
- **建议**: 将 async 逻辑移入 useEffect + AbortController，或添加 stale generation check。

## 同类问题扫描备注

- **mountedRef 模式**: 全项目扫描确认 mountedRef 已全部清除（DynamicRenderer 已修复为 AbortController），无遗留实例。
- **新增竞态**: 仅发现 variant-field.tsx 这一处新的异步竞态风险。

## 统计

| 严重程度 | 数量        |
| -------- | ----------- |
| P1       | 1（已修复） |
| P2       | 1（新增）   |
| P3       | 5           |
| 驳回     | 1           |
