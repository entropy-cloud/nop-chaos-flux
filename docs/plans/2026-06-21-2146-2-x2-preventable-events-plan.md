# X2 可阻止事件（schema-driven preventDefault / stopPropagation）

> Plan Status: active
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（X2 行）、`docs/components/existing-components-improvement-analysis.md` §2.8、`docs/references/naming-conventions.md` §4.4、`docs/architecture/renderer-runtime.md` "Event Passthrough Contract"（L650-671）
> Mission: components-improvement
> Work Item: X2 可阻止事件
> Related: `2026-06-21-0254-x3-naming-conventions-baseline-plan.md`（done，§4.4 已预留 X2 裁定）、`2026-06-21-1000-2-e2g-form-shell-enhancement-plan.md`（done，含 form 专用 `preventEnterSubmit`）

## Purpose

把 Flux 事件系统从「runtime contract 已暴露 `preventDefault`/`stopPropagation`，但 author 无法在 schema 声明式请求」收敛为「schema-level 声明 + 同步阻塞 native default + 既有命令式路径继续工作」。

本 plan 收口 X2 工作项，按 Flux 自有事件系统设计 preventDefault 语义（不照搬 amis `rendererEvent`）。

## Current Baseline

### Runtime contract 已就绪（author-facing 缺口）

- `FluxActionEvent` 类型在 `packages/flux-core/src/types/actions.ts:261-269` 已含 `preventDefault?()` / `stopPropagation?()`：
  ```ts
  export interface FluxActionEvent {
    type: string;
    nativeEvent?: Event;
    currentTarget?: HTMLElement | null;
    target?: HTMLElement | null;
    preventDefault?(): void;
    stopPropagation?(): void;
    [key: string]: unknown;
  }
  ```
- `ActionContext.event?: FluxActionEvent` 在同文件 L281。
- DOM → action dispatch 桥接（关键路径）：
  - `packages/flux-react/src/node-renderer-resolved.tsx:237-256` —— per-event-key handler 工厂。当前 handler **直接** `helpers.dispatch(action, { event: createNormalizedActionEvent(event), ... })`，**未**在 dispatch 前 sync 调用 `event.preventDefault()`。
  - `packages/flux-react/src/renderer-helpers.ts:26-72` —— `normalizeActionEvent`（L26 起；L16-24 是前置谓词 `isFluxActionEventCandidate`）从 native event rebind `preventDefault`/`stopPropagation`（L63-70）；`createNormalizedActionEvent`（L109-111）exported。
  - `mergeActionContext`（`renderer-helpers.ts:74-107`）在 L102 调用 `normalizeActionEvent`。
- 既有命令式路径：action body 内 `ctx.event?.preventDefault?.()` 可工作，但有 **timing hazard** —— `helpers.dispatch` 返回 `Promise<ActionResult>`，async dispatch 完成前 native default 可能已触发。

### Compiler 消费 action shape

- `ActionShapeFields` 在 `packages/flux-core/src/types/actions.ts:125-145` 定义。已有字段：`when?: boolean | string`（L139，gate action run）、`continueOnError`、`then`、`onError`、`onSettled` 等。**无** `preventDefault` / `stopPropagation` 字段。
- Compiler action-shape 验证入口：`packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts:164` 的 `validateActionShape()`。该函数对**已知字段逐一 type-validate**（非 allowedKeys 拒绝模型），例如 `when` 的类型规则在 L259-269（`'Action when must be a boolean or expression string when provided.'`），`parallel` 在 L271+，`args`/`action` 在 L191-235；未知字段当前**穿透不报错**（无 allowedKeys 检查）。新增 `preventDefault`/`stopPropagation` 需在此函数内追加两条与 `when` 同形的 type-validation 规则（boolean-or-string），不需要修改 `shape-validation-traversal.ts`（后者只负责 validation 遍历状态/组件 target 收集，不持有字段 whitelist）。

### 已有的 schema-level prevention（form-specific）

- `FormSchema.preventEnterSubmit?: boolean` 在 `packages/flux-renderers-form/src/schemas.ts:96`；contract 见 `form-definition.ts:202-209`；消费于 `form.tsx:372, 469-491`：true 时 form 的 `onKeyDown` handler 在 Enter 上 early-return（不调 `event.preventDefault()`，只是不触发 form 自有的 submit 逻辑）。test：`__tests__/form-shell-enhancements.test.tsx:163`。
- 这是 form-specific、非通用机制。

### 硬编码的 `preventDefault()`（不在本 plan scope）

- `input-number-renderer.tsx:70, 73`（ArrowUp/ArrowDown step）
- `chart-renderer.tsx:334`（resize）
- `tree-controls.tsx:241-242`、`tree-control-controllers.ts:416-478`（键盘导航）
- `wrapped-field-action.tsx:44-62`
- 这些是 renderer-internal UX 决策，不在本 plan 迁移目标内。

### 真正剩余 gap

1. **无 schema field**：author 无法在 action node 上声明「触发此 action 时同步阻止 native default」。
2. **Timing hazard**：既有命令式 `ctx.event?.preventDefault?.()` 在 async dispatch 后才执行，对 sync native default（form submit、link 跳转、键盘 scroll）无效。
3. **`preventEnterSubmit` 语义割裂**：form 用专用字段，其他组件（input-number、button link、自定义 keydown）只能硬编码。

## Goals

- 在 `ActionShapeFields` 新增 `preventDefault?: boolean | string` 与 `stopPropagation?: boolean | string`，语义对齐既有 `when`（boolean literal 或 expression string）。
- 在 `packages/flux-react/src/node-renderer-resolved.tsx:237-256` 的 per-event-key handler 中，**sync** 调用 `event.preventDefault()` / `event.stopPropagation()`（在 `helpers.dispatch` await 之前），gate 由新字段求值决定。
- Compiler whitelist 新字段，action-shape traversal 正常处理。
- 既有命令式 `ctx.event?.preventDefault?.()` 路径继续工作（不破坏 backward compat）。
- `preventEnterSubmit` 的关系裁定（保留作为 form 便捷 shorthand / 标 deprecated alias / 保留独立语义），写入 design.md。
- `docs/architecture/renderer-runtime.md` 的 Event Passthrough Contract 章节增加 schema-driven prevention 子节，写清 sync-vs-async timing 模型。
- Focused tests 覆盖关键 timing 与 expression 求值路径。

## Non-Goals

- **不替换既有命令式 `ctx.event?.preventDefault?.()`**（继续作为 runtime contract 提供；本 plan 只补 schema-level declaration）。
- **不迁移既有硬编码 `preventDefault()` 调用**（input-number ArrowUp/ArrowDown、tree 键盘导航、chart resize 等；这些是 renderer-internal UX 决策，迁移归各自 renderer 的 P2 enhancement）。
- **不实现 amis `rendererEvent` 兼容层**（roadmap 明确拒绝，见 analysis §2.8）。
- **不重写事件系统**（`FluxActionEvent` shape、`normalizeActionEvent` plumbing 保持稳定；只新增字段 + sync gate）。
- **不改 `when` 语义**（`when` gate action 是否 RUN，`preventDefault` gate native default 是否 BLOCK；二者正交，不重载）。
- **不做触屏/手势系统改动**（归 `mobile-roadmap.md`）。
- **不改 host/domain capability event 路径**（namespace event 不在本 plan scope）。

## Scope

### In Scope

- `ActionShapeFields.preventDefault?: boolean | string` 新字段。
- `ActionShapeFields.stopPropagation?: boolean | string` 新字段。
- `node-renderer-resolved.tsx:237-256` event handler 工厂更新：sync 求值 expression → sync 调用 native `preventDefault`/`stopPropagation` → 再调 `helpers.dispatch`。
- Compiler action-shape validation 追加 per-field type-validation 规则（`shape-validation-rules.ts` 的 `validateActionShape` L164+，紧邻 `when` L259-269）。
- Expression 求值复用既有 `when` 的 evaluation path（`shouldRunActionWhen` parallel：`shouldPreventDefault` / `shouldStopPropagation`）。
- design.md 同步：`docs/architecture/renderer-runtime.md` Event Passthrough Contract、`docs/components/form/design.md`（`preventEnterSubmit` 关系裁定）、`docs/references/naming-conventions.md` §4.4（X2 裁定落地）。
- Focused tests：sync timing 验证、expression 求值、非事件上下文兜底、与 `when` 正交性。
- Playground 示例：演示 schema-driven `preventDefault` 阻止 form submit / link 跳转 / 自定义 keydown。
- e2e 测试覆盖关键交互路径。

### Out Of Scope

- amis `rendererEvent` 兼容（roadmap 拒绝）。
- Per-renderer 硬编码 preventDefault 迁移。
- `when` 字段语义变更。
- 手势/touch 事件系统改动。
- `ActionShapeFields` 其他字段新增（如 `stopImmediatePropagation` —— 默认不做，Phase 1 裁定若需要再加）。

## Failure Paths

| 场景编号                           | 触发                                                                                                | 行为                                                                                                  | 可重试 | 用户可见表现                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| `x2-no-native-event`               | action 配 `preventDefault:true` 但运行在非事件上下文（lifecycle/init）                              | no-op；dev console warn `preventDefault requested but no native event`                                | 否     | 无变化                             |
| `x2-expr-non-boolean`              | `preventDefault: "${someExpr}"` 求值结果非 boolean                                                  | 按 `when` 字段同样规则 coerce（truthy/falsy）+ dev console warn                                       | 否     | 按 coerce 结果决定是否阻止         |
| `x2-expr-eval-error`               | expression 求值抛异常                                                                               | catch；fallback 到 falsy（不阻止）+ dev console error                                                 | 否     | native default 触发                |
| `x2-already-prevented-by-renderer` | renderer 内部已调 `event.preventDefault()`（如 input-number ArrowUp），action 也配 `preventDefault` | idempotent；二次调用无副作用                                                                          | 否     | 无额外变化                         |
| `x2-async-action-chain`            | action 含 `then` chain，首层配 `preventDefault`                                                     | sync preventDefault 只对首层触发事件生效；then chain 后续 action 不再 access 同一 native event timing | 否     | 首层 sync 阻止，后续无 timing 保证 |

## Test Strategy

档位选择：**必须自动化**

理由：本 plan 改变核心事件/action 桥接 timing（sync vs async dispatch ordering），属于公共契约变更，且历史上有 timing hazard 类 bug（命令式路径不可靠）。按 plan guide Rule 12 + AGENTS.md「Test Strategy Tiers」，核心回归路径必须自动化，且 Proof（RED test）必须先于 Fix（GREEN impl）。

## Execution Plan

### Phase 1 - Decision：字段命名、timing 模型、preventEnterSubmit 关系

Status: planned
Targets: `docs/architecture/renderer-runtime.md`（Event Passthrough Contract 子节）、`docs/components/form/design.md`（preventEnterSubmit 关系）、`docs/references/naming-conventions.md` §4.4（X2 裁定落地）

- Item Types: `Decision`、`Follow-up`

- [ ] **Decision**：字段命名裁定 —— `preventDefault?: boolean | string` + `stopPropagation?: boolean | string` on `ActionShapeFields`。命名理由：(1) 与 DOM API 一致（不发明新词）；(2) 与既有 `when` 形状一致（boolean | expr string）；(3) 拒绝 amis `rendererEvent`（roadmap §5 已 refuse）。
- [ ] **Decision**：timing 模型裁定 —— sync prevention 发生点必须在 `node-renderer-resolved.tsx:237-256` 的 per-event-key handler 内、`helpers.dispatch(...)` call 之前。求值顺序：先 normalize event → 求 `preventDefault` expression → sync 调 native `event.preventDefault()`（若 truthy）→ 求 `stopPropagation` expression → sync 调 native `event.stopPropagation()`（若 truthy）→ 再 `helpers.dispatch`。这一顺序写入 `renderer-runtime.md`。**同时裁定 `when:false ∧ preventDefault:true` 的语义**：默认建议 `preventDefault`/`stopPropagation` 在 `when` 之前求值且独立生效（即 `when:false` 不 RUN action 但仍 sync 阻止 native default，因为 prevention 是事件级声明，与 action body 是否执行无关）；若审查认为应耦合（`when:false` 时也跳过 prevention），在此 Decision 显式翻转。
- [ ] **Decision**：`preventEnterSubmit` 关系裁定 —— 三选一：(a) 保留作为 form 便捷 shorthand（语义 = "form 不自动拦截 Enter 提交"，与 `preventDefault` 在 action 上的语义正交，不冲突）；(b) 标 `@deprecated`，引导用 `preventDefault` on Enter keydown action；(c) 删除（破坏 backward compat，默认拒绝）。倾向 (a)：form `preventEnterSubmit` 控制 form 自己的 enter-submit 逻辑，而 `preventDefault` on action 控制 native default，二者层级不同。
- [ ] **Decision**：是否同时引入 `stopImmediatePropagation` —— 默认 **不引入**（roadmap scope 最小化）；如 Phase 1 审查认为必要，加 `stopImmediatePropagation?: boolean | string`。
- [ ] **Follow-up**：把裁定写入 `docs/architecture/renderer-runtime.md` Event Passthrough Contract 子节（L650-671 之后新增 "Schema-Driven Prevention" 小节）、`docs/components/form/design.md`（preventEnterSubmit 关系段落）、`docs/references/naming-conventions.md` §4.4（X2 裁定行）。

Exit Criteria:

- [ ] 4 条 Decision 已显式裁定（含选 (a)/(b)/(c) 与理由）。
- [ ] `renderer-runtime.md` Event Passthrough Contract 含新 "Schema-Driven Prevention" 子节。
- [ ] `form/design.md` 含 `preventEnterSubmit` 与 `preventDefault` 关系段落。
- [ ] `naming-conventions.md` §4.4 X2 裁定行落地。

### Phase 2 - Proof（RED 测试基线）

Status: planned
Targets: `packages/flux-react/src/__tests__/event-prevention.test.tsx`（新建）

- Item Types: `Proof`

- [ ] **Proof**：写 RED 测试覆盖：
  - `preventDefault: true` on form submit action → 表单不提交（`event.preventDefault)` 被 sync 调用，即使 action body async）
  - `preventDefault: "${expr}"` 求值 truthy → 同步阻止
  - `preventDefault: "${expr}"` 求值 falsy → 不阻止
  - `stopPropagation: true` → parent `onClick` 不触发（DOM 冒泡验证）
  - 非事件上下文（lifecycle action）配 `preventDefault` → no-op + dev warn（Failure path `x2-no-native-event`）
  - expression 求值抛异常 → fallback falsy + dev error（Failure path `x2-expr-eval-error`）
  - 与 `when` 正交性：`when:false` + `preventDefault:true` → action 不 RUN 但 native default 仍被阻止（裁定：`preventDefault`/`stopPropagation` 在 `when` 之前求值，独立生效；若裁定相反则改测试）。这条裁定写入 Phase 1 决策文档。
  - 既有命令式 `ctx.event?.preventDefault?.()` 路径继续工作（backward compat）

Exit Criteria:

- [ ] RED 测试文件存在，所有 case 当前 fail（impl 未上）。
- [ ] 测试名清晰反映每种 timing / expression / failure path。

### Phase 3 - Fix（实现 GREEN）

Status: planned
Targets: `packages/flux-core/src/types/actions.ts`（`ActionShapeFields`）、`packages/flux-react/src/node-renderer-resolved.tsx`（event handler 工厂）、`packages/flux-action-core/src/action-core.ts`（求值 helper，如需要）、`packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`（`validateActionShape` L164+，追加 type-validation 规则）

- Item Types: `Fix`、`Proof`

- [ ] **Fix**：在 `packages/flux-core/src/types/actions.ts:125-145` 的 `ActionShapeFields` 新增 `preventDefault?: boolean | string` 与 `stopPropagation?: boolean | string`。
- [ ] **Fix**：在 `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts` 的 `validateActionShape()`（L164+）内，紧邻 `when` 规则（L259-269）追加两条同形 type-validation 规则：`preventDefault`/`stopPropagation` 提供时必须是 boolean 或 expression string（错误码沿用 `invalid-action-shape`）。任务性质是**追加 per-field type-validation 规则**，不是注册 allowed-key（该函数本身不做 allowedKeys 拒绝）。
- [ ] **Fix**：在 `packages/flux-action-core/src/action-core.ts` 新增 `shouldPreventDefault(action, ctx, evaluator)` 与 `shouldStopPropagation(action, ctx, evaluator)`，复用 `shouldRunActionWhen`（L363-371）的 expression 求值 path。
- [ ] **Fix**：在 `packages/flux-react/src/node-renderer-resolved.tsx:237-256` 更新 per-event-key handler 工厂：normalize event → 求 `preventDefault` → sync `event.preventDefault()` → 求 `stopPropagation` → sync `event.stopPropagation()` → 再 dispatch。注意 expression evaluator 需要在 dispatch context 之外 sync 取得（可能需要在事件触发瞬间 sync evaluate，不能等 dispatch 内部）。
- [ ] **Fix**：求值顺序裁定（Phase 1 决定 `preventDefault` vs `when`）：在 handler 内按 Phase 1 裁定的顺序 sync 求值 `preventDefault`/`stopPropagation`，与 `when`（action RUN gate）正交。
- [ ] **Proof**：Phase 2 RED 测试转 GREEN；补充 compiler payload validation 测试（新字段 typecheck）。

Exit Criteria:

- [ ] `ActionShapeFields` 含两个新字段，compiler whitelist 通过。
- [ ] `node-renderer-resolved.tsx` event handler 在 dispatch 前 sync 阻止 native default。
- [ ] Phase 2 全部 RED 测试转 GREEN。
- [ ] 局部 typecheck 通过：`pnpm --filter @nop-chaos/flux-react typecheck && pnpm --filter @nop-chaos/flux-core typecheck && pnpm --filter @nop-chaos/flux-action-core typecheck && pnpm --filter @nop-chaos/flux-compiler typecheck`。

### Phase 4 - Owner-doc 同步 + playground + e2e

Status: planned
Targets: `apps/playground/src/`、`tests/e2e/`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/{year}/`

- Item Types: `Follow-up`

- [ ] **Follow-up**：新建 playground 示例 `apps/playground/src/pages/event-prevention-demo.tsx`：3 个 demo（form submit 阻止、link 点击阻止、自定义 keydown 阻止），每个 demo 配 toggle 让用户对比 `preventDefault:true/false` 效果。注册到 playground 路由。
- [ ] **Follow-up**：新建 e2e 测试 `tests/e2e/event-prevention.spec.ts`：验证 form 不提交、link 不跳转、keydown 不触发默认 scroll。
- [ ] **Follow-up**：更新 `docs/components/existing-components-improvement-roadmap.md`：X2 状态 `todo` → `done`；Phase Status 表同步。
- [ ] **Follow-up**：更新 `docs/components/amis-baseline-matrix.md`（如 retained 决策变化；本 plan 默认无变化则注明 "No update required"）。
- [ ] **Follow-up**：更新 `docs/logs/{year}/06-21.md`（或当日 log），记录 X2 closure。

Exit Criteria:

- [ ] playground 示例存在并注册路由；e2e 测试文件存在并通过。
- [ ] roadmap X2 状态翻 `done`。
- [ ] 当日 dev log 已记录。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh-session sub-agent（Round 1: `ses_1158c7ec8ffem65qjnToepEjqz`；Round 2: `ses_115857ea1ffeohLkD8QibpjkKr`；均独立 general agent，不复用起草者上下文）
- Verdict: `pass-with-minors`（Round 2 共识达成：零 Blocker、零 Major）
- Rounds: 2
- Findings addressed:
  - **Blocker B1（Round 1 → 已处理）**：Compiler whitelist 文件引用错误。原 draft 把 `shape-validation-traversal.ts` 当作 action-field whitelist，并写「与 `when` 同路径」。Live repo 核对：该文件无 whitelist、无 `when` 处理；真实 `when` validation 在 `shape-validation-rules.ts:259-269` 内的 `validateActionShape()`（L164+）。已修正 Current Baseline + Phase 3 Fix item #2 + Phase 3 Targets，并澄清任务性质是「追加 per-field type-validation 规则」（`validateActionShape` 不做 allowedKeys 拒绝，未知字段穿透）。
  - **Minor M1（Round 1 → 已处理）**：`normalizeActionEvent` 行号 `L16-72` 修正为 `L26-72`（L16-24 是前置谓词 `isFluxActionEventCandidate`），rebind 行号 `L48-71` 修正为 `L63-70`。
  - **Minor M4（Round 1 → 已处理）**：Phase 1 Decision item #2（timing 模型）显式裁定 `when:false ∧ preventDefault:true` 的语义，不再只在 Phase 2 Proof 隐式 presuppose。默认建议 prevention 在 `when` 之前求值且独立生效。
  - **Minor Mi-A（Round 2 → 已处理）**：In Scope 第 4 项仍残留 `shape-validation-traversal.ts` 旧引用，与 L42 + Phase 3 Fix 矛盾。已修正为 `shape-validation-rules.ts` 的 `validateActionShape` L164+。
  - Minor M2（Round 1 → 知悉，不改）：Phase 3 sync-eval mechanics 表述偏 hand-wavy（「可能需要」），但实际 wiring 受 Phase 1 timing Decision 约束，属实现细节。
  - Minor M3（Round 1 → 知悉，不改）：Phase 1 写 `renderer-runtime.md` 在 Phase 3 impl 之前，符合 Rule 14（Phase 1 记录 Decision = 最终设计，非 Proposed vs Current 叙事）。
- 审查范围：Round 1 16 处 cited file:line（15 准确 + 1 drift = B1）；Round 2 9 处复核（全部准确，含新引用 `action-core.ts:363` `shouldRunActionWhen`）。Test Strategy「必须自动化」+ Proof-before-Fix（Phase 2 RED → Phase 3 GREEN）满足 Rule 12。全量验证归 Closure Gates 满足 Rule 18。Owner-doc 按 Phase 实际职责分配满足 Rule 17。

## Closure Gates

- [ ] Phase 1-4 所有 Exit Criteria 全勾。
- [ ] `ActionShapeFields.preventDefault` 与 `stopPropagation` 已落地，被 compiler whitelist + runtime event handler sync 消费。
- [ ] 不存在 in-scope 已确认 live defect 或 contract drift 被静默降级（X2 无 deferred 来源项，本 plan 为 clean-slate 设计）。
- [ ] 受影响 owner docs（`renderer-runtime.md` Event Passthrough Contract + `form/design.md` preventEnterSubmit 关系 + `naming-conventions.md` §4.4 + roadmap）已同步。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### `stopImmediatePropagation`

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Phase 1 默认裁定不引入（roadmap scope 最小化）。`stopPropagation` 已覆盖绝大多数冒泡控制场景；`stopImmediatePropagation` 是同层 listener 顺序的细粒度控制，低频需求。
- Successor Required: no
- Successor Path: 若后续有具体用例（如同一 element 上多 listener 顺序控制），独立加字段。

### 硬编码 `preventDefault()` 迁移（input-number ArrowUp/ArrowDown、tree 键盘导航、chart resize）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 这些是 renderer-internal UX 决策（特定键盘事件的默认行为阻止），与 author-facing schema-driven prevention 是不同 concern。迁移它们不会改变 author 可见行为，且增加本 plan 的 churn 风险。
- Successor Required: no
- Successor Path: 各 renderer 的 P2 enhancement（E3 批）独立评估。

## Non-Blocking Follow-ups

- 若发现 `preventDefault` expression 求值需要 access action context（如 `args`、`scope`），需在 Phase 3 同步评估 sync evaluation 是否有性能/数据 hazard（目前 Phase 1 裁定 expression 只 access `event` + `scope`，不 access `args`）。
- `preventEnterSubmit` 若裁定 (a) 保留，后续可在 form design.md 加 cross-reference 段落；若裁定 (b) deprecated，按 Feature Deprecation 流程。
- Playground demo 如需对比 `when` vs `preventDefault` 行为差异（教学价值），可在 demo 页加第 4 个示例。

## Closure

Status Note: _待 plan 关闭时填写_

Closure Audit Evidence:

- Auditor / Agent: _待独立 closure audit_
- Evidence: _待 closure audit_

Follow-up:

- _待 plan 关闭时填写；当前 follow-up 已在 Non-Blocking Follow-ups 与 Deferred But Adjudicated 记录。_
