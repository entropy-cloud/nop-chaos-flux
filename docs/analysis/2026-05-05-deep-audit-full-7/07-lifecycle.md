# 维度 07：生命周期与副作用归属

## 第1轮初审

### [维度07] `tabs` 仍使用局部重复的 `statusPath` effect，cleanup 在每次依赖变化时先写 `undefined`

- **文件**: `packages/flux-renderers-basic/src/status-hooks.ts:10-16`
- **严重程度**: P2
- **effect 职责**: `statusPath` 生命周期发布
- **应归属层级**: React 层，但应归到共享 helper，而不是 renderer 包内重复实现。
- **建议**: 改用共享 `useStatusPathPublication(...)`。

### [维度07] `form` 的外部状态摘要发布仍由 React effect 订阅 `FormRuntime` store 并手工聚合

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts:46-53`
- **严重程度**: P3
- **effect 职责**: 订阅 `FormRuntime` store、聚合并发布外部 `statusPath`
- **应归属层级**: runtime 层
- **建议**: 将 `statusPath` 对外发布下沉到 `FormRuntime` 或共享 owner-publication 基础设施。

### [维度07] `form` 的 `valuesPath` 外部值快照发布仍由 React effect 订阅 store 并直接写父 scope

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts:83-90`
- **严重程度**: P3
- **effect 职责**: 订阅 values 并发布外部 `valuesPath`
- **应归属层级**: runtime 层
- **建议**: 为 `valuesPath` 提供 runtime-side publication 入口。

## 深挖第2轮追加

### [维度07] `NodeRenderer` 在 render 阶段通过 `useMemo` 注册 `__xui_actions__` namespace

- **文件**: `packages/flux-react/src/node-renderer.tsx:445-461`
- **严重程度**: P1
- **effect 职责**: named actions namespace 安装/卸载
- **应归属层级**: runtime 层或 commit/effect 阶段；不能在 render 阶段执行。
- **建议**: 将注册迁移到 `useEffect`/`useLayoutEffect` 或 runtime-owned lifecycle。

### [维度07] `NodeRenderer` 在 render 阶段同步安装 prepared imports

- **文件**: `packages/flux-react/src/node-renderer.tsx:414-444`, `packages/flux-runtime/src/import-stack.ts:395-424`
- **严重程度**: P1
- **effect 职责**: import frame / namespace 生命周期安装与清理
- **应归属层级**: runtime 层或 commit/effect 阶段
- **建议**: 改为 commit 后注册，或提供可回滚 runtime API。

## 深挖第3轮追加

### [维度07] `word-editor-page` 用 React effect 反复重灌 `dataset-store`

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:208-217`
- **严重程度**: P2
- **effect 职责**: 初始化/回灌 owner 数据
- **应归属层级**: runtime owner 初始化层
- **建议**: 将 initial datasets 与持久化数据的种入收敛到 owner 创建阶段；若需要外部重置，改显式命令。

## 深挖第4轮追加

### [维度07] declarative surface renderer 在 close/unmount 时重复发布 closed summary

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:197-215`, `packages/flux-runtime/src/surface-runtime.ts:162-180`
- **严重程度**: P2
- **effect 职责**: surface close/unmount 生命周期发布
- **应归属层级**: `SurfaceRuntime`
- **建议**: declarative surface close/unmount 只调用 `surfaceRuntime.close(...)`。

## 深挖第5轮追加

### [维度07] `DynamicRenderer` 仍在 renderer `useEffect` 中直接承载 schema 请求生命周期

- **文件**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:38-71`
- **严重程度**: P3
- **effect 职责**: 远端 schema 拉取与取消管理
- **应归属层级**: 更偏 runtime 层
- **建议**: 收敛到 runtime-owned schema loader/source controller。

## 深挖统计

- 第1轮发现数：3
- 第2轮新增：2
- 第3轮新增：1
- 第4轮新增：1
- 第5轮新增：1

## 维度复核结论

- 初审与深挖共 8 项，独立复核后保留 3 项、降级 3 项、驳回 2 项。
- 真正需要优先处理的是 render 期副作用和重复生命周期发布；React 层对 runtime 状态做桥接的几项更多属于收敛债。

## 子项复核结论

- `[维度07] tabs 仍使用局部重复的 statusPath effect，cleanup 在每次依赖变化时先写 undefined`: 驳回。`tabs` 已复用共享 `status-hooks.ts`，不再构成“局部重复 effect”问题。
- `[维度07] form 的外部状态摘要发布仍由 React effect 订阅 FormRuntime store 并手工聚合`: 降级。这是 React 层把 owned form 生命周期桥接到 `parentScope/statusPath` 的实现，偏架构收敛问题。
- `[维度07] form 的 valuesPath 外部值快照发布仍由 React effect 订阅 store 并直接写父 scope`: 降级。做法可优化，但当前生命周期归属仍可自洽。
- `[维度07] NodeRenderer 在 render 阶段通过 useMemo 注册 __xui_actions__ namespace`: 保留。`registerNamespace()` 是 render 期副作用，应移到 commit/effect 阶段。
- `[维度07] NodeRenderer 在 render 阶段同步安装 prepared imports`: 保留。prepared import 安装/清理会改动 runtime 状态，放在 render 期不安全。
- `[维度07] word-editor-page 用 React effect 反复重灌 dataset-store`: 降级。这里确有重复 `load()` 风险，但更像初始化策略粗糙而非严重归属错误。
- `[维度07] declarative surface renderer 在 close/unmount 时重复发布 closed summary`: 保留。renderer 在 close 与 unmount 两处都手动 `publishClosed()`，应收敛到 `SurfaceRuntime.close()`。
- `[维度07] DynamicRenderer 仍在 renderer useEffect 中直接承载 schema 请求生命周期`: 驳回。组件内用 `useEffect` 管理远端 schema 请求/取消是标准 React 模式，证据不足以要求必须下沉到 runtime。
