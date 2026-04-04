# NodeRenderer 降压式重构计划

> Plan Status: completed
> Created: 2026-04-04
> Source: `packages/flux-react/src/node-renderer.tsx` (346 行)

> **Implementation Status: ✅ COMPLETED (2026-04-04)**

Implemented scope:

- completed `node-renderer-utils.ts`
- completed `useNodeImports.ts`
- completed `useFormComponentHandleRegistration.ts`
- completed `useNodeDebugData.ts`
- completed optional `node-frame-wrapper.tsx`
- kept `useNodeEvents`, `useNodeRegions`, `useRenderMonitor`, and provider composition inline by design

Verification summary:

- `pnpm --filter @nop-chaos/flux-react typecheck` ✅
- `pnpm --filter @nop-chaos/flux-react test` ✅
- `pnpm typecheck` ✅
- `pnpm build` ✅
- `pnpm lint` blocked by a pre-existing unrelated workspace lint error in `packages/flux-runtime/src/form-runtime.ts:515` (`prefer-const`)

---

## Problem

`NodeRenderer` 是 `flux-react` 的核心 orchestration boundary。当前实现没有明显架构错误，但已经同时承担了订阅/解析、执行边界创建、副作用注册、调试接线、import 生命周期、FieldFrame 包裹、Context 提供等多类职责。

当前问题不在于“文件大就是错”，而在于：

- 最重的副作用逻辑和主渲染路径混在一起，读代码时容易被 import/debug/registry 细节打断
- 一些 effect 逻辑与 React 生命周期强绑定，但没有独立命名边界，后续继续加功能时容易把 `NodeRenderer` 继续推向“总控组件”
- 少量 schema 扩展字段访问 (`xui:imports`、`classAliases`、`_cid`) 仍散落在主文件中，降低可读性

这不是一次“推倒重写”问题，而是一次**最小化职责降压**问题。

## Root Cause

`NodeRenderer` 天然是一个边界组件，所以它必须同时知道：

- 当前 compiled node 的订阅与解析结果
- 当前 subtree 的 data/action/component execution boundary
- renderer props/event/region 的组装方式

这部分聚合是合理的。

真正导致文件继续变重的原因是：后续为 import、debugger、component handle、monitor 等横切能力加接线时，都顺手落在了同一个组件里。于是一个本来就需要承担“节点编排职责”的组件，又额外承担了太多**生命周期副作用实现细节**。

因此这次重构的目标不是追求极小文件，也不是把一切都拆成 hook，而是把最重、最独立、最容易继续膨胀的副作用逻辑移出主文件。

## Main Decision

本计划采用**收缩版重构**，不采用“大拆分 + 跨包上提 + 强行 100 行”的方案。

明确决策：

- 不把 `_cid`、`xui:imports`、`classAliases` 访问 helper 上提到 `flux-core`
- 不把 `NodeRenderer` 压到固定行数目标
- 不为了“每段代码都独立文件”而拆出大量低收益 hook
- 不默认扩大 `flux-react` public API

本计划只抽离最重的副作用逻辑，并保留 `NodeRenderer` 作为主编排边界。

## Fix Plan

### Step 1 — 提取本地工具函数

目标文件：

- `packages/flux-react/src/node-renderer-utils.ts`

提取内容：

- `getNodeImports(node)`
- `getNodeClassAliases(node)`
- `getNodeCompiledCid(node)`
- `getNodeSchemaFrameWrap(node)`
- `resolveFrameWrapMode(...)`
- `shouldWarnOnImportFailure()`
- `isReportedImportError(...)`

原则：

- 保持这些 helper 为 `flux-react` 内部实现细节
- 不移动到 `flux-core`
- 目的只是消除主文件里的散布式 `as` 访问和小工具噪音

### Step 2 — 提取最重的 import 生命周期 effect

目标文件：

- `packages/flux-react/src/useNodeImports.ts`

提取来源：`node-renderer.tsx:158-198`

职责：

- 调用 `runtime.ensureImportedNamespaces()`
- 保留当前 loader 变更时的重跑语义
- 保留开发期 `console.warn`、`env.notify`、`monitor.onError` 行为
- 卸载时调用 `runtime.releaseImportedNamespaces()`

注意：

- hook 依赖必须显式覆盖 `runtime.env.importLoader` 的变化语义
- 这是当前最值得抽离的副作用块，优先级最高

### Step 3 — 提取 component handle 注册 effect

目标文件：

- `packages/flux-react/src/useFormComponentHandleRegistration.ts`

提取来源：`node-renderer.tsx:121-134`

职责：

- 仅处理 form handle 注册与清理
- 使用本地 `getNodeCompiledCid()` helper 读取 `_cid`

命名说明：

- 不使用泛化的 `useNodeComponentHandle`
- 当前逻辑实际上只处理 form handle，命名应反映真实职责

### Step 4 — 提取 debug data effect

目标文件：

- `packages/flux-react/src/useNodeDebugData.ts`

提取来源：`node-renderer.tsx:136-156`

职责：

- 向 `activeComponentRegistry.setHandleDebugData` 注册/清理调试数据
- 保持当前调试 payload 与清理语义不变

### Step 5 — 视结果决定是否提取 `NodeFrameWrapper`

可选目标文件：

- `packages/flux-react/src/node-frame-wrapper.tsx`

提取来源：`node-renderer.tsx:299-327`

判断标准：

- 如果完成前三个 effect 提取后，主文件仍然明显被 FieldFrame 分支干扰，再提取
- 如果主文件已经足够清楚，则保留内联实现，不为了“组件更少行”而继续拆

### Step 6 — 保持其余逻辑暂不拆分

本计划明确暂不提取：

- `useNodeEvents`
- `useNodeRegions`
- `useRenderMonitor`
- `NodeContextProviders`

原因：

- 这些逻辑目前体量较小，且与主编排路径关系更近
- 提取收益暂时不高，容易把一次降压重构演变成碎片化拆分

### Step 7 — 更新 `node-renderer.tsx`

重构后的 `NodeRenderer` 仍保留这些核心职责：

- runtime + subscription
- meta/props resolution
- class alias 合并
- `useNodeForm()` / `useNodeScopes()`
- helpers / events / regions 组装
- visibility guard
- 最终 provider boundary + component render

目标不是把它变成 100 行，而是让它重新聚焦在“节点编排”本身。

## Scope

本计划只涉及：

- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-renderer-utils.ts`（新增）
- `packages/flux-react/src/useNodeImports.ts`（新增）
- `packages/flux-react/src/useFormComponentHandleRegistration.ts`（新增）
- `packages/flux-react/src/useNodeDebugData.ts`（新增）
- `packages/flux-react/src/node-frame-wrapper.tsx`（可选新增）

默认不涉及：

- `packages/flux-core`
- `packages/flux-runtime`
- `packages/flux-react/src/index.ts`

只有在实施过程中确认已有测试无法覆盖新增内部模块时，才补最小测试，不顺手扩 scope。

## Effort

- 代码调整：中等
- 风险：中低
- 预计工作量：0.5 - 1 天

## Verification

每一步局部验证：

- `pnpm --filter @nop-chaos/flux-react typecheck`
- `pnpm --filter @nop-chaos/flux-react test`

最终验证：

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

## 变动文件清单

| File | Change | Lines affected |
|------|--------|---------------|
| `packages/flux-react/src/node-renderer.tsx` | 移出主要副作用逻辑，保留编排主线 | ~60-100 |
| `packages/flux-react/src/node-renderer-utils.ts` | 新增本地 accessor 与纯工具函数 | ~30-60 |
| `packages/flux-react/src/useNodeImports.ts` | 新增 import 生命周期 hook | ~40-70 |
| `packages/flux-react/src/useFormComponentHandleRegistration.ts` | 新增 form handle 注册 hook | ~15-30 |
| `packages/flux-react/src/useNodeDebugData.ts` | 新增 debug data hook | ~20-40 |
| `packages/flux-react/src/node-frame-wrapper.tsx` | 可选：提取 FieldFrame 包裹逻辑 | ~25-40 |

## Risks And Rollback

主要风险：

- `useNodeImports` 如果漏掉 `importLoader` 相关依赖，可能导致 loader 切换时 import namespace 不重建
- handle/debug data effect 如果依赖数组变化不一致，可能导致注册/清理时机漂移
- `NodeFrameWrapper` 若被提取，可能遗漏 `frameWrap`、label、fieldName 分支

缓解措施：

- effect 依赖逐项对照原实现，不做语义重写
- 优先保留现有逻辑形状，只移动位置，不顺手“优化”
- 每一步提取后先跑 `flux-react` 局部验证，再做下一步

回退策略：

- 这是单包内重构，不涉及 public API；若某一步收益不明显或出现行为回归，可直接回退该步提取，保留主文件内联实现

## Out Of Scope

- 把 schema accessor 上提到 `flux-core`
- 将 `NodeRenderer` 行数压到固定阈值
- 提取 `useNodeEvents` / `useNodeRegions` / `useRenderMonitor` / `NodeContextProviders`
- 合并或重组 Context 体系
- 调整运行时行为、ActionScope 语义、import 语义或调试协议
- 扩大 `flux-react` 公共导出面

## Acceptance Criteria

- [ ] `NodeRenderer` 主文件明显减少副作用噪音，主线重新聚焦在节点编排
- [ ] `useNodeImports`、form handle 注册、debug data 注册三块 effect 已迁出主文件
- [ ] 提取后行为与当前实现一致，包括 import loader 变化时的重跑语义
- [ ] 未向 `flux-core` 新增仅服务于 `NodeRenderer` 的内部 accessor API
- [ ] 未无必要扩大 `packages/flux-react/src/index.ts` 导出面
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
