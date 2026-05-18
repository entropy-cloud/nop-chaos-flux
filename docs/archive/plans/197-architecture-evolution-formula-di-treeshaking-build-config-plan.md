# 197 Architecture Evolution — Formula DI And Build Config Cleanup

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — Formula registry factory pattern (createFormulaRegistry()), global wrappers preserved for backward compat, exported from flux-formula index. tsconfig.base.json: ignoreDeprecations kept (still needed), allowSyntheticDefaultImports removed (redundant). Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-adversarial-review-8.md`, `docs/analysis/2026-05-04-adversarial-review-7.md`
> Related: `docs/plans/193-expression-evaluator-security-hardening-plan.md`, `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

## Purpose

收敛 2026-05-04 已确认的 formula registry 全局单例与 build config 问题，为多实例隔离和稳定构建基线打基础。

## Current Baseline

- formula registry 仍是全局可变单例，05-04 已确认这会阻塞多 runtime 隔离。
- 根 `package.json` 仍保留双 TypeScript 版本依赖。
- `tsconfig.base.json` 仍保留 `ignoreDeprecations: "6.0"`。
- `tsconfig.base.json` 仍缺少部分 workspace package path 映射。
- 根 `tsconfig.json` 虽有 references，但 05-04 已确认 project references / composite baseline 仍未真正收敛到可用的 workspace build contract。
- `queueMicrotask` dispose hack 仍在 `SchemaRenderer` 中，但 05-04 只把它作为 watch-only 风险，而非当前 closure blocker。

## Goals

- formula registry 支持 runtime 级隔离
- TypeScript/build 配置收敛到单一、可解释的基线
- project references / composite baseline 有明确裁定并落地
- 补齐缺失的 workspace path 映射

## Non-Goals

- 在本计划内完成 renderer lazy registration / tree-shaking 全量架构重做
- 在本计划内完成 action concurrency/backpressure 设计
- 在本计划内完成 module cache eviction 策略

## Scope

### In Scope

- `packages/flux-formula/src/registry.ts`
- `packages/flux-formula/src/compile/formula-compiler.ts`
- `packages/flux-formula/src/evaluator.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- 根 `package.json`
- 根 `tsconfig.json`
- `tsconfig.base.json`
- package-level `tsconfig.json` / `tsconfig.build.json` where needed for project-references decision
- `docs/architecture/frontend-baseline.md`
- `docs/architecture/flux-core.md`

### Out Of Scope

- renderer lazy registration / bundle-level tree-shaking redesign
- action dispatcher 全局并发限制
- parallel actions 并发上限
- module cache 淘汰策略
- `defineRenderer()` DX helper

## Closure Gates

- [x] formula registry 的 confirmed global-state defect 已修复
- [x] build config 的 confirmed drift 已修复
- [x] project references / composite baseline 已裁定并落地到支持状态
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/architecture/frontend-baseline.md` 与相关 owner docs 已同步

## Deferred But Adjudicated

### Renderer Lazy Registration / Tree-Shaking Redesign

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 05-04 的证据更接近架构演进方向，不是本计划必须落地的单点 defect 修复。
- Successor Required: yes
- Successor Path: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`

### QueueMicrotask Dispose Risk

- Classification: `watch-only residual`
- Why Not Blocking Closure: 05-04 已将其降为 watch-only 风险，而非当前 live defect。
- Successor Required: no

## Execution Plan

### Phase 1 - Formula Registry Isolation

Status: completed
Targets: `packages/flux-formula/src/registry.ts`, `packages/flux-formula/src/compile/formula-compiler.ts`, `packages/flux-formula/src/evaluator.ts`, `packages/flux-runtime/src/runtime-factory.ts`

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] 确认 formula registry 的 runtime isolation 方案，并记录与现有 global convenience API 的关系。
- [x] [Fix] formula registry 不再依赖单一全局可变实例。
- [x] [Fix] runtime 创建路径能够接入隔离后的 registry owner。
- [x] [Proof] 测试：两个 runtime 实例注册不同自定义函数时互不污染。
- [x] [Proof] 测试：默认 builtin 行为仍对现有消费者保持兼容。

Exit Criteria:

- [x] formula registry global-state defect 已收敛
- [x] `docs/architecture/flux-core.md` 已更新相关 baseline
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Build Config Baseline Cleanup

Status: completed
Targets: 根 `package.json`, 根 `tsconfig.json`, `tsconfig.base.json`, package-level `tsconfig.json`, `docs/architecture/frontend-baseline.md`

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] 选择单一 TypeScript 基线，并删除不再需要的并行版本依赖。
- [x] [Fix] 重新裁定并处理 `ignoreDeprecations: "6.0"`。
- [x] [Fix] 补齐缺失的 workspace package path 映射。
- [x] [Decision] project references / composite mode 是否作为支持基线启用；若保留为 supported baseline，则补齐缺口并修正相关 tsconfig。
- [x] [Proof] 验证：唯一 TypeScript 基线下 workspace typecheck/build 正常工作。

Exit Criteria:

- [x] build config drift 已收敛
- [x] project references / composite baseline 已有明确结论并落地
- [x] `docs/architecture/frontend-baseline.md` 已同步
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] formula registry 多实例隔离已落地
- [x] TypeScript/build 配置已收敛到单一基线
- [x] project references / composite baseline 已完成裁定并落地
- [x] 不存在被降级的 in-scope live defect
- [x] 独立子 agent closure-audit 已完成并记录
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All in-scope items landed with focused verification. Independent closure audit (2 rounds) confirmed code changes + test coverage. Full verification: typecheck ✅ build ✅ lint ✅ test ✅ (48/48).

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent closure audit (round 1: identified gaps; round 2: confirmed remediation)
- Evidence: Round 1 found formula registry factory pattern and build config cleanup properly landed. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
