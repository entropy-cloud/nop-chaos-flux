# 197 Architecture Evolution — Formula DI, Tree-shaking, Build Config

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/analysis/2026-05-04-adversarial-review-8.md` (R8-F1 to F6), `docs/analysis/2026-05-04-adversarial-review-7.md` (R7-F8 to F11), `docs/analysis/2026-05-04-adversarial-review-2.md` (R2-F2,F3,F4,F5)
> Related: plan-192 (Phase 2.3 covers formula registry decision; this plan covers full DI + build + architecture)

## Purpose

消除阻塞 SSR/多实例/plugin 隔离的全局单例，改善 tree-shaking 支持，修复构建配置问题，为平台的可扩展性和可部署性奠定架构基础。

## Current Baseline

- Formula registry 是全局可变单例，阻塞 SSR 和多实例隔离（R8-F1, R8-F6）
- Renderer barrel files 无条件导入所有 renderer（R8-F2）
- `flux-core/src/index.ts` 使用 `export *` 影响 tree-shaking（R8-F3）
- `SchemaRenderer` 使用 `queueMicrotask` dispose hack（R8-F4）
- 无 validated `defineRenderer()` helper API（R8-F5）
- 双 TypeScript 版本（6.0 + 7.0-dev）（R7-F8）
- `ignoreDeprecations: "6.0"` 抑制迁移警告（R7-F9）
- 无 project references（R7-F10）
- tsconfig paths 缺少部分包（R7-F11）
- Action dispatcher 无全局并发限制（R2-F2）
- Parallel actions 无并发上限（R2-F3）
- API cache 无 mutation-aware invalidation（R2-F4）
- Module cache 无淘汰策略（R2-F5）

## Goals

- Formula registry 支持 per-runtime 实例化（解决 SSR + 多实例 + 插件隔离）
- Renderer registration 支持 lazy/按需加载
- Build 配置清晰一致
- Action 系统有并发限制选项

## Non-Goals

- 完整的 SSR/RSC 支持（仅消除阻塞性单例）
- SWR/stale-while-revalidate 缓存策略（仅记录方向）
- 完整的 plugin API 设计

## Scope

### In Scope

- `packages/flux-formula/src/registry.ts` — DI 化
- `packages/flux-renderers-*/src/index.ts` — lazy registration 支持
- `packages/flux-core/src/index.ts` — tree-shaking 优化
- `packages/flux-react/src/schema-renderer.tsx` — dispose hack 审查
- Build config：tsconfig.base.json, 根 package.json TS 版本
- Action dispatcher 并发限制选项
- Module cache 淘汰策略

### Out Of Scope

- API cache mutation-aware invalidation（记录为 architecture direction）
- 完整的 defineRenderer helper API（记录为后续方向）
- React RSC 支持

## Closure Gates

- [ ] Formula registry 支持 per-runtime 实例化且有 focused test
- [ ] Build config 问题已修复
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] Architecture docs 已更新
- [ ] `docs/logs/` 已更新

## Deferred But Adjudicated

### API Cache Mutation-Aware Invalidation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 功能增强而非 defect；当前消费者通过手动 refresh 工作
- Successor Required: yes（建议单独计划）
- Successor Path: <<future plan>>

### defineRenderer Helper API

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 当前 `RendererDefinition[]` 可用，只是 DX 不友好
- Successor Required: no

### SchemaRenderer queueMicrotask Dispose

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当前 React 19 下正常工作；仅在 React 未来版本改变 StrictMode 时序时有风险
- Successor Required: no

## Execution Plan

### Phase 1 - Formula Registry DI 化

Status: planned
Targets: `packages/flux-formula/src/registry.ts`, `packages/flux-runtime/src/runtime-factory.ts`

- Item Types: Fix, Decision

- [ ] [Decision] 选择 DI 方案：(A) registry 实例化传入 createRendererRuntime (B) 冻结 builtins + 运行时自定义挂 runtime context (C) 两层 registry：immutable global builtins + per-runtime custom functions
- [ ] [Fix] 重构 `registry.ts` 使 function/namespace/filter 注册支持实例化（非全局 Map）
- [ ] [Fix] `createRendererRuntime` 接受可选的 formula registry 参数
- [ ] [Fix] 保留全局便捷 API 作为默认（向后兼容）
- [ ] [Proof] 测试：两个 runtime 实例注册不同自定义函数，互不影响
- [ ] [Proof] 测试：全局注册的 builtin 函数在所有实例中可用

Exit Criteria:

- [ ] Formula registry DI 化已 landed
- [ ] 多实例隔离有 focused test
- [ ] `docs/architecture/flux-core.md` 更新 formula registry 架构
- [ ] `docs/logs/` 已更新

### Phase 2 - Renderer Lazy Registration & Tree-Shaking

Status: planned
Targets: `packages/flux-renderers-*/src/index.ts`, `packages/flux-core/src/index.ts`

- Item Types: Fix

- [ ] [Fix] 为 renderer registry 添加 `registerLazy(type, () => import('./renderer'))` 方法
- [ ] [Fix] 各 renderer 包的 `registerXxxRenderers` 改为 lazy 注册（实际 import 延迟到首次使用时）
- [ ] [Fix] `flux-core/src/index.ts` — 将 `export *` 改为 named re-exports，确保 types-only module 不产生 runtime import
- [ ] [Proof] 测试：lazy registered renderer 在首次渲染时正确加载
- [ ] [Proof] 测试：未使用的 renderer 不出现在 bundle 中（或 bundle size 减小）

Exit Criteria:

- [ ] Lazy registration 可用
- [ ] `export *` 消除
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

### Phase 3 - Build Config Cleanup

Status: planned
Targets: `tsconfig.base.json`, 根 `package.json`

- Item Types: Fix

- [ ] [Fix] 根 `package.json` — 明确选择单一 TypeScript 版本；如果使用 TS 6，移除 `@typescript/native-preview`；记录决策原因（R7-F8）
- [ ] [Fix] `tsconfig.base.json:19` — 审查 `ignoreDeprecations: "6.0"` 是否仍需要，如不需要则移除（R7-F9）
- [ ] [Fix] `tsconfig.base.json` paths — 添加缺失的 `@nop-chaos/flux-renderers-form-advanced` 和 `@nop-chaos/flux-i18n`（R7-F11）
- [ ] [Decision] 是否引入 project references + composite mode 以实现类型错误级联检查（R7-F10）

Exit Criteria:

- [ ] TypeScript 版本唯一且明确
- [ ] tsconfig paths 完整
- [ ] Decision 记录在 `docs/architecture/frontend-baseline.md`
- [ ] `docs/logs/` 已更新

### Phase 4 - Action Concurrency & Cache Eviction

Status: planned
Targets: `packages/flux-action-core/src/action-dispatcher/`, `packages/flux-runtime/src/runtime-factory.ts`

- Item Types: Fix

- [ ] [Fix] `createActionDispatcher` 添加可选 `maxConcurrentDispatches` 参数，超出时排队或拒绝（R2-F2）
- [ ] [Fix] `runParallelActions` 添加可选 `maxParallelActions` 限制（R2-F3），默认无限（向后兼容）
- [ ] [Fix] `createModuleCache` 添加 LRU 淘汰策略（R2-F5），参考 `api-cache.ts` 的 MAX_ENTRIES 模式
- [ ] [Proof] 测试：超过并发限制时 action 排队而非全部立即执行
- [ ] [Proof] 测试：module cache 超过上限时旧条目被淘汰

Exit Criteria:

- [ ] Action 并发可配置
- [ ] Module cache 有淘汰机制
- [ ] No owner-doc update required
- [ ] `docs/logs/` 已更新

## Validation Checklist

- [ ] Formula registry 多实例隔离正确
- [ ] Build 配置清晰一致
- [ ] Action 并发有限制选项
- [ ] 不存在被降级的 in-scope live defect
- [ ] 独立子 agent closure-audit 已完成并记录
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者>>
- Evidence: <<task id / findings>>

Follow-up:

- API Cache mutation-aware invalidation（建议单独计划）
- defineRenderer helper API（DX 改善方向）
