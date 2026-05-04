# 193 Expression Evaluator Security Hardening

> Plan Status: planned
> Last Reviewed: 2026-05-04
> Source: `docs/analysis/2026-05-04-adversarial-review-4.md` (R4 findings 1-8)
> Related: plan-192 (Phase 5 covers $JSON.parse decision only; this plan covers the full sandbox hardening)

## Purpose

消除 expression evaluator 的 sandbox 逃逸路径和 prototype pollution 向量，使 formula 表达式在低信任 schema 来源下安全可用。

## Current Baseline

- Formula evaluator 使用 AST-based 解释器，无 `eval`/`Function`。
- Member access 使用 `(objectValue as any)[key]`，无属性黑名单。
- `constructor.constructor("return globalThis")()` 可完整逃逸 sandbox（R4-F1, R4-F2）。
- Object 字面量 `{["__proto__"]: {...}}` 通过 setter 修改对象原型（R4-F3）。
- `$JSON.parse` 结果可含深层 `__proto__` key（R4-F4）。
- `sanitizeSnapshot` 仅检查顶层 key（R4-F6）。
- `setIn` 工具无路径段 sanitization（R4-F5）。
- Formula→Scope→Props 全链路无运行时类型边界（R4-F7）。
- Renderer type 字段无格式校验（R4-F8）。
- Plan-192 Phase 5 仅将 `$JSON.parse` 和 `instanceof` 作为 Decision 处理，未覆盖核心逃逸路径。

## Goals

- 阻断通过原型链到达 `Function` 构造器的逃逸路径
- 阻断通过 Object 字面量/JSON.parse 的 prototype pollution
- 深化 `sanitizeSnapshot` 和 `setIn` 的防护深度
- 在 expression evaluator 层面建立安全边界文档

## Non-Goals

- 实现完整的 VM 隔离（如 SES/Compartment）
- Formula→Props 的完整运行时类型校验（记录为后续方向）
- 修改 schema 的信任模型定义（仅记录当前模型）

## Scope

### In Scope

- `packages/flux-formula/src/evaluator.ts` — member access 黑名单/Proxy
- `packages/flux-formula/src/evaluator.ts` — Object expression `__proto__` key 过滤
- `packages/flux-formula/src/builtins.ts` — `$JSON` 包装为 safe parse
- `packages/flux-runtime/src/scope.ts` — `sanitizeSnapshot` 深层 sanitization
- `packages/flux-core/src/utils/path.ts` — `setIn` 路径段 sanitization
- 安全边界设计文档

### Out Of Scope

- Renderer type 格式校验（R4-F8, LOW — defense-in-depth, 不阻塞 closure）
- 完整运行时类型边界（R4-F7, MEDIUM — 架构方向，非本计划收口）

## Closure Gates

- [ ] 所有 in-scope CRITICAL/HIGH defects 已修复
- [ ] 每项修复有 focused test 证明逃逸路径被阻断
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [ ] 安全边界文档已写入 `docs/architecture/`
- [ ] `docs/logs/` 已更新

## Deferred But Adjudicated

### Formula→Props 运行时类型边界

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 类型擦除是设计 trade-off，非 live defect；当前 schema 来源可信
- Successor Required: no

### Renderer type 格式校验

- Classification: `watch-only residual`
- Why Not Blocking Closure: 需要下游误用配合才可利用，当前无已知利用路径
- Successor Required: no

## Execution Plan

### Phase 1 - Member Access 黑名单与 Object Literal 防护

Status: planned
Targets: `packages/flux-formula/src/evaluator.ts`

- Item Types: Fix

- [ ] [Fix] 在 member access（evaluator.ts:248-250）添加属性名黑名单：`__proto__`, `constructor`, `prototype`。访问这些属性时返回 `undefined` 而非实际值
- [ ] [Fix] 对非 namespace 对象的 member access 返回值，如果 `typeof === 'function'`，返回 `undefined`（阻断任何原型链到达 Function 的路径）
- [ ] [Fix] ObjectExpression（evaluator.ts:160-170）使用 `Object.create(null)` 代替 `{}` 创建 result 对象，阻断 `__proto__` setter
- [ ] [Proof] 测试：`data.constructor.constructor("return 1")()` 返回 undefined 而非执行
- [ ] [Proof] 测试：`ARRAYMAP([1], x => x.constructor)` 返回 undefined
- [ ] [Proof] 测试：`{["__proto__"]: {a:1}}` 创建的对象不继承攻击者控制的原型

Exit Criteria:

- [ ] 上述 3 个 Fix 已 landed
- [ ] 3 个 Proof 测试通过
- [ ] No owner-doc update required（Phase 2 统一写文档）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - 深层 Sanitization 与 Safe Parse

Status: planned
Targets: `packages/flux-formula/src/builtins.ts`, `packages/flux-runtime/src/scope.ts`, `packages/flux-core/src/utils/path.ts`

- Item Types: Fix

- [ ] [Fix] `builtins.ts:51` — 将 `$JSON` 替换为 safe wrapper：`$JSON.parse` 使用 reviver 过滤 `__proto__`/`constructor`/`prototype` key
- [ ] [Fix] `scope.ts:sanitizeSnapshot` — 改为递归 sanitize，对嵌套对象也过滤危险 key
- [ ] [Fix] `path.ts:setIn` — 对每个路径段检查 `isDangerousPathHead`，遇到时 throw 或 skip
- [ ] [Proof] 测试：`$JSON.parse('{"__proto__":{"x":1}}')` 返回的对象无 `__proto__` 污染
- [ ] [Proof] 测试：`sanitizeSnapshot({a: {__proto__: {x:1}}})` 输出中嵌套 `__proto__` 被移除
- [ ] [Proof] 测试：`setIn(obj, "__proto__.x", 1)` throw 或不修改 `Object.prototype`

Exit Criteria:

- [ ] 上述 3 个 Fix 已 landed
- [ ] 3 个 Proof 测试通过
- [ ] `docs/architecture/` 中添加 expression-security.md 或在 flux-core.md 中新增 Security Boundary 章节
- [ ] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] CRITICAL 逃逸路径已阻断（`constructor.constructor` 返回 undefined）
- [ ] HIGH prototype pollution 路径已阻断（Object literal + JSON.parse + setIn）
- [ ] 安全边界文档已记录 threat model 和 defense 措施
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

- Formula→Props 运行时类型边界（architecture direction, not blocking）
