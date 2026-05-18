# 193 Expression Evaluator Security Hardening

> Plan Status: completed
> Last Reviewed: 2026-05-04
> Completed: 2026-05-04 — DANGEROUS_MEMBER_KEYS blocklist in evaluator, Object.create(null) for object literals, instanceof operator blocked, deepSanitize for $JSON.parse, recursive sanitizeSnapshot, DANGEROUS_PATH_SEGMENTS guard in setIn/getIn. Full verification: typecheck ✅ build ✅ lint ✅ test ✅.
> Source: `docs/analysis/2026-05-04-adversarial-review-4.md`, `docs/analysis/2026-05-04-adversarial-review.md`
> Related: `docs/plans/192-deep-audit-full-6-and-adversarial-review-remediation-plan.md`, `docs/plans/197-architecture-evolution-formula-di-treeshaking-build-config-plan.md`

## Purpose

修复 2026-05-04 已确认的 formula evaluator sandbox 逃逸与 prototype pollution 路径，同时保留当前文档化的合法表达式能力。

## Current Baseline

- `packages/flux-formula/src/evaluator.ts` 仍允许通过危险属性访问原型链，05-04 已确认 `constructor.constructor(...)` 与 `instanceof`/`Symbol.hasInstance` 相关逃逸向量。
- `packages/flux-formula/src/evaluator.ts` 的 object literal 仍用普通对象承载结果，`__proto__` key 仍可能污染原型链。
- `packages/flux-formula/src/builtins.ts` 的 `$JSON.parse` 仍直接返回原生解析结果。
- `packages/flux-runtime/src/scope.ts` 的 `sanitizeSnapshot(...)` 仍只做浅层过滤。
- `packages/flux-core/src/utils/path.ts` 的 `setIn(...)` 仍未拒绝危险路径段。
- 当前 `docs/architecture/flux-formula.md` 和 `docs/architecture/security-design-requirements.md` 尚未写清 05-04 审计确认后的 threat model 与 evaluator 安全边界。

## Goals

- 阻断 05-04 已确认的 evaluator 原型链逃逸路径。
- 阻断 object literal、`$JSON.parse`、`sanitizeSnapshot`、`setIn(...)` 的 prototype pollution 入口。
- 让安全修复与现有文档化能力保持一致，不以“修复”为名删除合法表达式契约。
- 将当前安全边界写入 owner docs。

## Non-Goals

- 引入完整 VM/SES/Compartment 隔离。
- 在本计划内完成 Formula→Props 全链路运行时类型系统。
- 在本计划内新增 renderer type 格式校验规则。

## Scope

### In Scope

- `packages/flux-formula/src/evaluator.ts`
- `packages/flux-formula/src/builtins.ts`
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-core/src/utils/path.ts`
- `docs/architecture/flux-formula.md`
- `docs/architecture/security-design-requirements.md`

### Out Of Scope

- Formula→Props 运行时类型边界
- renderer type 格式校验
- formula registry 多实例隔离（由 plan 197 负责）

## Closure Gates

- [x] 所有 in-scope confirmed live security defects 已修复
- [x] 每个 confirmed defect 都有 focused proof test
- [x] 修复后仍保留当前文档化的合法表达式能力
- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `docs/architecture/flux-formula.md` 与 `docs/architecture/security-design-requirements.md` 已同步

## Deferred But Adjudicated

### Formula→Props Runtime Type Boundary

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 05-04 没有把它确认为当前 live security defect；它是更大的运行时边界设计问题。
- Successor Required: no

### Renderer Type Validation

- Classification: `watch-only residual`
- Why Not Blocking Closure: 05-04 将其归为 defense-in-depth 方向，而非当前已确认 exploit path。
- Successor Required: no

## Execution Plan

### Phase 1 - Evaluator Escape Paths

Status: completed
Targets: `packages/flux-formula/src/evaluator.ts`

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] 阻断 `constructor` / `prototype` / `__proto__` 相关的危险 member access 路径。
- [x] [Fix] 阻断 05-04 已确认的 `instanceof` / `Symbol.hasInstance` evaluator escape path。
- [x] [Fix] object literal 结果容器不再允许通过 `__proto__` 写入污染原型链。
- [x] [Decision] 明确“哪些对象方法调用仍属于合法表达式能力，哪些原型链方法必须屏蔽”，并把决策写入 owner docs。
- [x] [Proof] 测试：`constructor.constructor(...)` 无法执行逃逸代码。
- [x] [Proof] 测试：`instanceof` 路径无法借助自定义 `Symbol.hasInstance` 逃逸 evaluator。
- [x] [Proof] 测试：object literal 中的危险 key 不会污染返回对象或全局原型。
- [x] [Proof] 测试：既有文档化的 namespace/object method 用法仍保持可用。

Exit Criteria:

- [x] 所有 evaluator 逃逸 proof 测试通过
- [x] 当前文档化的合法表达式能力未被回归破坏
- [x] `docs/architecture/flux-formula.md` 已更新本阶段 owner 行为
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Pollution Barriers Outside Evaluator

Status: completed
Targets: `packages/flux-formula/src/builtins.ts`, `packages/flux-runtime/src/scope.ts`, `packages/flux-core/src/utils/path.ts`

- Item Types: `Fix | Proof`

- [x] [Fix] `$JSON.parse` 结果不再允许危险 key 进入 runtime object graph。
- [x] [Fix] `sanitizeSnapshot(...)` 升级为递归 sanitization，而不是只做浅层过滤。
- [x] [Fix] `setIn(...)` 拒绝危险路径段，阻断 `__proto__` / `constructor` / `prototype` 污染入口。
- [x] [Proof] 测试：`$JSON.parse(...)` 的危险 key 不会污染结果对象。
- [x] [Proof] 测试：深层 nested snapshot 里的危险 key 会被移除或拒绝。
- [x] [Proof] 测试：`setIn(obj, '__proto__.x', 1)` 不会修改 `Object.prototype`。

Exit Criteria:

- [x] 所有 prototype-pollution 入口都有 proof 测试
- [x] `docs/architecture/security-design-requirements.md` 已更新 threat model 与防护边界
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] `constructor.constructor` 与 `instanceof` 逃逸路径均已阻断
- [x] object literal / `$JSON.parse` / `sanitizeSnapshot` / `setIn(...)` 的污染入口均已收敛
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
- Evidence: Round 1 found all evaluator escape paths and pollution barriers properly blocked with proof tests. Round 2 confirmed all remediated. Daily log: `docs/logs/2026/05-04.md`.

Follow-up:

- no remaining plan-owned work
