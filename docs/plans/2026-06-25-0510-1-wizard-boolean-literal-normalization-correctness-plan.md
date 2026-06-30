# Wizard Boolean-Literal Normalization Correctness

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/audits/2026-06-24-2213-open-audit-components.md` ([F1] — HEADLINE)
> Related: `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md`（{2}，open-audit 其余 F2/F3/F4/S2/S3），`docs/plans/449-*.md`、`docs/plans/450-*.md`（multi-audit C-findings，与本计划无文件重叠）
> Execution Order: {1} of the 2-plan open-audit remediation set（重写后的 open-audit F-findings）。本计划动 wizard（disabled/optional）+ 一个共享 unwrap helper 及其现有消费者（collapse/tabs/variant-field-matching）。**同文件协调**：`wizard-renderer.tsx` 也被 `{2}` 的 WS-A 触碰（ownership `valueOwnership`/`valueStatePath` 字段，与本计划的 disabled 解包是不同关注点、不同字段）；两者须顺序执行或显式协调（建议 `{2}` WS-A 排在本计划之后），避免同文件冲突。不触碰 448/449/450 的任何文件，故可与 multi-audit 队列并行。

## Purpose

收口 open-audit 的 HEADLINE finding [F1]：wizard 的 `step.disabled` 在编译器 boolean normalization（`__nopPreserveLiteral` 包裹）之后被渲染器**静默忽略**——`isStepDisabled` 只比较裸 `true/'true'/1`，永远匹配不到编译产出的 `{__nopPreserveLiteral:true, value:true}` 对象，导致声明的 `disabled` 步骤仍可进入/可点/计入 `canGoNext`。这是多步提交流程里的流程门禁 correctness 缺陷，类型系统与 CI 都看不见。根因不是「补 wizard」，而是「`__nopPreserveLiteral` 是一个 4 个消费者里只有 wizard 忘记解包、且没有共享 helper、也没有 compile-through-to-renderer 契约测试」。

## Current Baseline

起草者已 live 核对全部引用（行号见下），结论成立：

- **booleanKeys 包裹（生产路径）**：`packages/flux-renderers-layout/src/layout-renderer-definitions.ts:171` 声明 `booleanKeys: ['disabled','optional']`；`:213-220` 的 `deepFields.normalize` for-loop（包裹对象字面量在 `:215-218`）把每个 step 的 `disabled`/`optional` 包成 `{ __nopPreserveLiteral: true, value: <boolean> }`。该 normalize 在 `packages/flux-compiler/src/schema-compiler/node-compiler.ts:399-402` 于**schema-compile 时**执行（非 editor-only），故生产渲染路径必然收到包裹对象。
- **`__nopPreserveLiteral` 消费者全貌（5 处，其中 4 处 renderer 侧）**：wizard（破损，本计划修）、`collapse-renderer.tsx:24-30`（`isItemDisabled`，解包在 `:25-29`，参考实现）、`tabs.tsx:41-42`、`variant-field-matching.ts:13-14` 共 4 个 **renderer 侧**消费者；另有 `packages/flux-formula/src/compile/compile-node.ts:50` 是**编译层**消费者（返回 `CompiledValueNode` 而非 boolean，语义不同，不在本 helper 收敛范围）。即「renderer 侧 4 消费者、wizard 唯一破损」成立。
- **wizard 破损点**：`packages/flux-renderers-layout/src/wizard-renderer.tsx:63-64` `isStepDisabled(step)` = `step.disabled === true || step.disabled === 'true' || step.disabled === 1`——三者都匹配不到包裹**对象**，编译后恒返回 `false`。`isStepDisabled` 被 `:90` `canGoTo`、`:216/:299` 线性可达性、`:412` nav 可点、`:429` `data-disabled` 消费，故影响面 = 整条 step 门禁链。
- **死字段 `optional`**：与 `disabled` 同属 `booleanKeys` 一起被包裹，但 `wizard-renderer.tsx` 全文 0 处读取 `optional`，文档化的「可跳过步骤」语义在 `computeCanGoTo` 里也未实现——是暗示了未提供能力的死 schema 字段。
- **正确的兄弟消费者（同一 `__nopPreserveLiteral` 契约）**：
  - `packages/flux-renderers-layout/src/collapse-renderer.tsx:24-30` `isItemDisabled` 内联解包（`wrapped.__nopPreserveLiteral === true && wrapped.value === true`，解包在 `:25-29`）——参考实现。
  - `packages/flux-renderers-basic/src/tabs.tsx:41-42` 同样内联解包。
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:154` 构造包裹字面量；审计另指 `variant-field-matching.ts:13-14` 解包。
  - 即 renderer 侧 4 个消费者里 wizard 是唯一忘记解包的。
- **测试盲区（为何一直绿）**：`wizard-renderer.test.tsx` 从未在任何 step 上设过 `disabled`；`:230-260` 那条「点击被禁用的 step 2」实际测的是**线性门禁**（step 2 因越过 `furthestReached` 不可达），不是 `step.disabled`。故包裹形态的代码路径从未被覆盖。`packages/flux-renderers-layout/src/test-support.tsx:289,368` 手工构造包裹字面量，但没有穿过生产 normalize 的端到端断言。

真正剩余的 gap：wizard `disabled` 门禁失效；无共享解包 helper；无 compile-through-to-renderer 契约测试；`optional` 死字段未裁定。

## Goals

- 修复 wizard `isStepDisabled`（并核对 `isStepVisible` 若也读包裹字段）使其正确解包 `__nopPreserveLiteral`，编译后 `disabled:true` 的 step 真正不可进入/不可点/不计入可达性。
- 提取**唯一**共享 `unwrapBooleanLiteral(value)` helper，让 wizard / collapse / tabs / variant-field-matching 全部消费它（消除「同一契约 4 套内联实现、1 套写错」的根因）。
- 裁定死字段 `optional`：实现「可跳过步骤」语义，或从 `booleanKeys`+schema 移除（不得保留暗示了未实现能力的死字段）。
- 新增 compile-through-to-renderer 契约测试（编译 `disabled:true` 的 step/panel，断言渲染器收到 `true`）+ wizard disabled-step 组件测试。

## Non-Goals

- 不改编译器的包裹格式 `__nopPreserveLiteral` 本身（只改消费侧）。
- 不重新设计 wizard 步骤门禁模型（仅修复 `disabled`/`optional` 的既定语义）。
- 不处理 open-audit 其余 finding（F2/F3/F4/S2/S3 归 `{2}`），不处理 multi-audit C-findings（归 448/449/450）。
- **同文件边界**：`{2}` WS-A 也改 `wizard-renderer.tsx`，但只动 ownership 字段（`valueOwnership`/`valueStatePath`），不动 disabled/optional——见 Execution Order 的协调约定。
- 不做 `visible` 字段（不在 `booleanKeys` 内，走另一条表达式路径，未受影响）。

## Scope

### In Scope

- `packages/flux-renderers-layout/src/wizard-renderer.tsx`（`isStepDisabled`/`isStepVisible` 解包 + `optional` 裁定落地）。
- `packages/flux-renderers-layout/src/layout-renderer-definitions.ts`（仅当 `optional` 裁定为「移除」时改 `booleanKeys`/schema 描述；`disabled` 包裹逻辑不动）。
- `packages/flux-renderers-layout/src/schemas.ts:21`（`WizardStepSchema.optional` 字段 + JSDoc，仅当 `optional` 选移除）。
- `packages/flux-renderers-layout/src/test-support.tsx:77,286-293`（镜像生产 `booleanKeys:['disabled','optional']` + 包裹 loop，仅当 `optional` 选移除须同步）。
- 新增共享 helper（位置见 Phase 1 Decision，倾向 `@nop-chaos/flux-react`）。
- `packages/flux-renderers-layout/src/collapse-renderer.tsx`、`packages/flux-renderers-basic/src/tabs.tsx`、`packages/flux-renderers-form-advanced/src/variant-field/variant-field-matching.ts`（迁移到共享 helper，行为零变化）。
- 新增 compile-through 契约测试 + wizard disabled-step 测试。

### Out Of Scope

- `{2}` / 448 / 449 / 450 范围的任何文件。
- 编译器 normalize 逻辑、`__nopPreserveLiteral` 包裹格式。
- `visible`/其它非 booleanKeys 字段。

## Failure Paths

| 场景                       | 触发                             | 行为                                                                                       | 可重试 | 用户可见表现                          |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ | ------ | ------------------------------------- |
| 禁用步骤仍可进入（本 bug） | schema 写 `disabled:true` 并编译 | 修复后：`isStepDisabled` 返回 `true`，step 不可点、nav `data-disabled`、不计入 `canGoNext` | —      | 被禁用的步骤在 nav 中不可激活         |
| `optional` 移除            | schema 作者曾写 `optional:true`  | 移除死字段无行为变化（语义本就未实现）                                                     | 否     | 无可见变化；schema 不再暗示未提供能力 |
| 解包 helper 迁移回归       | collapse/tabs 改用 helper        | 行为零变化，既有测试兜底                                                                   | 否     | 无                                    |

## Test Strategy

档位选择：**必须自动化**

理由：F1 是隐性的流程门禁 correctness bug（编译器↔渲染器契约的取值通道），且根因是「无共享 helper + 无 compile-through 契约测试」，属核心回归路径。按 guide，Proof 项须在对应 Fix 之前/同 PR 内先行（TDD：先红后绿）。

- 先写失败测试：compile-through（生产 normalize 后断言渲染器侧收到 `true`）+ wizard disabled-step 不可进入。
- 再改 `isStepDisabled` 解包使测试转绿。
- helper 迁移 collapse/tabs/variant-field 以既有测试兜底（行为零变化）。

## Execution Plan

### Phase 1 - Decision 与失败证明（Proof-first）

Status: completed
Targets: 新增测试文件；本 plan 记录 Decision

- Item Types: `Decision | Proof`

- [x] `Decision`：共享 helper 落点——**选 (A) `@nop-chaos/flux-react`**。理由：4 个 renderer 侧消费者（wizard/collapse 在 `flux-renderers-layout`、tabs 在 `flux-renderers-basic`、variant-field-matching 在 `flux-renderers-form-advanced`）均已在依赖图中依赖 `@nop-chaos/flux-react`（layer 6，renderer-facing 契约面）。`flux-react` 已有非-hook 纯工具的先例（`resolve-gap.ts` 导出 `resolveGap`/`GAP_TOKENS`），故放置纯函数 helper 与既有约定一致。`flux-core`（layer 1）过于基础，不宜承载 renderer/compiler-interop 的 `__nopPreserveLiteral` 解包语义；编译层消费者 `flux-formula/compile-node.ts:50` 语义不同（返回 `StaticValueNode`，不复用本 helper），故无需为它下沉到 core。helper 模块：`packages/flux-react/src/preserve-literal.ts`，导出两个函数（见 Phase 2）。
- [x] `Decision`：死字段 `optional` 裁定——**选 (B) 移除**。理由：`wizard-renderer.tsx` 全文 0 处读取 `optional`，`computeCanGoTo` 未实现「可跳过」语义，是暗示了未实现能力的死字段。live grep 确认仓库内（playground/e2e/各 schema）无任何 wizard step 作者写过 `optional`，v1 无 compat 负担。移除最诚实，落点：`layout-renderer-definitions.ts:171` `booleanKeys` + `:213` normalize loop + `:22` 描述、`schemas.ts:21` `WizardStepSchema.optional`、`test-support.tsx:77,286-293` 镜像。
- [x] `Proof`：新增 compile-through-to-renderer 契约测试（`packages/flux-renderers-layout/src/__tests__/wizard-boolean-literal-compile-through.test.ts`）——直接调用**生产** `layoutRendererDefinitions` 中 wizard 的 `deepFields.normalize`，断言 `disabled:true` step 归一化为 `{__nopPreserveLiteral:true, value:true}` 形态；并断言 `isStepDisabled(归一化后step)` 返回 `true`（先红：当前返回 `false`）。
- [x] `Proof`：新增 wizard disabled-step 组件测试（追加到 `wizard-renderer.test.tsx`）——经 `createLayoutSchemaRenderer()`（走生产 `wizardStepsNormalize` 包裹）渲染含 `disabled:true` step 的 wizard，断言该 step nav `data-disabled=true` 且不可点、Next 跳过它直接到下一可达 step（先红）。

Exit Criteria:

- [x] 两条 Decision 已在本 plan/日志记录裁定与理由。
- [x] 两条 Proof 在修复前为红（TDD 证据），且引用生产 normalize 路径而非手搓包裹对象。（Proof 1 直接调用生产 `layoutRendererDefinitions` 的 `deepFields.normalize`；Proof 2 经 `createLayoutSchemaRenderer()` 走生产 `wizardStepsNormalize` 包裹路径；运行确认两条目标断言先红：`isStepDisabled`→false、`data-disabled`→null；envelope 形态断言已绿，证明编译契约成立。）

### Phase 2 - 修复 wizard + 提取共享 helper

Status: completed
Targets: `wizard-renderer.tsx`、新增 helper 模块、`layout-renderer-definitions.ts`（仅当 optional 选移除）

- Item Types: `Fix`

- [x] `Fix`：按 Phase 1 Decision 落点新增 `unwrapBooleanLiteral(value): boolean`（语义：解包 `{__nopPreserveLiteral:true, value}` 并兼容裸 `true/'true'/1` 与 `false`，参考 `collapse-renderer.tsx:24-28`）。实现于 `packages/flux-react/src/preserve-literal.ts`，同时导出通用核心 `unwrapPreservedLiteral(value): unknown`（供 string 解包消费者 variant-field 使用），二者均从 `@nop-chaos/flux-react` 入口导出。
- [x] `Fix`：`wizard-renderer.tsx` `isStepDisabled` 改用 `unwrapBooleanLiteral(step.disabled)`（并 export 以供契约测试）；核对 `isStepVisible`——`visible` 不在 `booleanKeys`、走表达式路径、非 `__nopPreserveLiteral` 字段，无需改动；Phase 1 两条 Proof 转绿（58/58 layout 测试通过）。
- [x] `Fix`：按 Phase 1 `optional` Decision（移除）落地——`schemas.ts` 删除 `WizardStepSchema.optional`、`layout-renderer-definitions.ts` `booleanKeys:['disabled']` + normalize loop + 描述去掉 optional、`test-support.tsx` 镜像同步。

Exit Criteria:

- [x] `isStepDisabled` 经 helper 正确解包；Phase 1 两条 Proof 转绿。
- [x] `optional` 裁定已落地（移除），无残留死字段（grep 确认 wizard 上下文无 `optional` 残留）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-layout test` 全绿（58/58）；既有 wizard 线性门禁测试不回归。

### Phase 3 - 兄弟消费者收敛到共享 helper

Status: completed
Targets: `collapse-renderer.tsx`、`tabs.tsx`、`variant-field-matching.ts`

- Item Types: `Fix | Proof`

- [x] `Fix`：`collapse-renderer.tsx` `isItemDisabled`、`tabs.tsx` `isTabDisabled` 改用共享 `unwrapBooleanLiteral`（行为零变化）；`variant-field-matching.ts` `unwrapPreservedMatchWhen` 改用通用核心 `unwrapPreservedLiteral`（解包 string 形态 `match.when`，签名/行为零变化——该消费者是 string 解包而非 boolean，故走通用核心而非 boolean helper）。
- [x] `Proof`：collapse/tabs/variant-field 既有测试全绿（layout 58/58、basic 386/386 含 tabs、form-advanced 834/834 含 variant-field）；helper 唯一来源——grep 确认 renderer 侧不再有任何内联 `__nopPreserveLiteral` 解包实现（剩余引用均为 helper 自身、编译层消费者 compile-node.ts、或 envelope 生产者/测试断言）。

Exit Criteria:

- [x] 4 个 `__nopPreserveLiteral` 消费点（wizard/collapse/tabs/variant-field-matching）全部走同一 helper 家族（3 个 boolean 消费者走 `unwrapBooleanLiteral`；variant-field string 消费者走通用核心 `unwrapPreservedLiteral`）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-layout test`、`--filter @nop-chaos/flux-renderers-basic test`、`--filter @nop-chaos/flux-renderers-form-advanced test` 相关用例全绿。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session (ses_10480d36affe1yNpgBIN8bAGI9)，round 1
- Verdict: `pass-with-minors`（零 Blocker / 零 Major，5 条 Minor 已全部吸收）
- Rounds: 1
- Findings addressed（Minor，全部吸收）:
  - `:213-216` 行范围不精确 → 改为 `:213-220`（loop）/包裹对象 `:215-218`。
  - `collapse-renderer.tsx:24-28` → 校正为 `:24-30`（解包 `:25-29`）。
  - 「4 消费者」补 `compile-node.ts:50`（编译层第 5 消费者，不同语义，不在 helper 范围）→ 已写入 Current Baseline。
  - `optional` 选移除时须同步 `test-support.tsx:77,286-293` 镜像 → 已补入 In Scope 与 Phase 1 Decision。
  - `optional` Decision 显式点名 `schemas.ts:21`（`WizardStepSchema.optional`）→ 已补。
- 引用核对（reviewer live 核对）：`layout-renderer-definitions.ts:171`✓、`wizard-renderer.tsx:63-64`（被 :90/:216/:299/:412/:429 消费）✓、`tabs.tsx:41-42`✓、`variant-field-matching.ts:13-14`✓、`variant-field.tsx:154`✓、`node-compiler.ts:399-402`✓、wizard 内 `optional`=0 引用✓、`visible`∉booleanKeys✓、测试盲区✓、`test-support.tsx:289,368`✓；并确认 steps/button-group/dropdown-button 等纯 value-prop 项的 `item.disabled===true` 读取**未破损**（无第 5 个破损 renderer）。
- 共识达成（零 Blocker/Major）→ 升级为 `active`。

## Closure Gates

- [x] wizard `isStepDisabled` 经共享 helper 正确解包；编译后 `disabled:true` step 真正被门禁（nav 不可激活、不计入 `canGoNext`）。
- [x] 共享 `unwrapBooleanLiteral` helper 已提取；4 个消费者（wizard/collapse/tabs/variant-field-matching）全部消费它。
- [x] compile-through-to-renderer 契约测试 + wizard disabled-step 组件测试存在并通过。
- [x] 死字段 `optional` 已裁定并落地（实现语义或移除），无残留死字段。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect。
- [x] 受影响 owner docs 已同步（若 helper 成为新公共导出或 wizard 门禁语义文档化）；否则明确无需更新。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草时无。若 Phase 1 `optional` Decision 选「实现」但发现与既有线性门禁语义冲突无法在本计划内收口，则在此登记 residual 并写 `Why Not Blocking Closure`（不得静默降级）。

## Non-Blocking Follow-ups

- 若未来出现更多 `booleanKeys` 消费者，强制走共享 helper 可考虑沉淀为一条 lint/audit 规则（`__nopPreserveLiteral` 解包不得内联）。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / compile-through 测试 + 4 消费者迁移证据>>

Follow-up:

- <<helper lint 规则 successor（条件性），或明确 no remaining plan-owned work>>
