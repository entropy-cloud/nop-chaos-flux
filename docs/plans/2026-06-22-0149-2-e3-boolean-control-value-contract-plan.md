# E3 布尔控件值契约规范化（checkbox/switch/radio-group trueValue-falseValue）

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「radio-group/checkbox/switch trueValue-falseValue」）、`docs/components/checkbox/design.md` §4、`docs/components/switch/design.md` §4
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5 未覆盖 checkbox/switch/radio-group，本 plan 需扩展）

## Purpose

把 `checkbox` / `switch`（并裁定 `radio-group` 是否需要）的布尔值映射从**硬编码 `true`/`false`**（`input-choice-renderers.tsx:486,531` 的 `Boolean(checked)`）规范化为**schema 可配的 `trueValue`/`falseValue` 契约**，消除「控件只能存布尔」的限制，使布尔控件可存 `1/0`、`"yes"/"no"`、`"Y"/"N"` 等业务值。同时补齐这三个组件缺失的 X5 Flux 决策表（roadmap 硬前置：「启动任一项前需先确认其 design.md 决策表」）。

## Current Baseline

- `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:464-492`（CheckboxRenderer）：用 `booleanValueAdapter`，`onCheckedChange` 直接 `handlers.onChange(Boolean(checked))`，存硬编码 `true`/`false`。
- `input-choice-renderers.tsx:494-539`（SwitchRenderer）：同上，`handlers.onChange(Boolean(nextChecked))`。
- `input-choice-renderers.tsx:541-615`（RadioGroupRenderer）：用 `stringValueAdapter`，存 option 的 `value`（已支持任意字符串值，trueValue/falseValue 相关性待裁定）。
- `packages/flux-renderers-form/src/schemas.ts:191-203`：`CheckboxSchema` / `SwitchSchema` 只有 `option`，**无 `trueValue`/`falseValue` 字段**；`RadioGroupSchema`(L123-125) 只有 `options`。
- `docs/components/checkbox/design.md` §4 L23：「建议后续允许 `trueValue`、`falseValue` 和 `indeterminate`」；`switch/design.md` §4 L23：「建议后续允许 `trueValue`、`falseValue`」。三者均**无 Flux 决策表节（§2 格式）**——X5 未覆盖。
- E2c（checkbox-group）已落地 `checkAll`/`maxSelected`/`minSelected`；本 plan 不动 checkbox-group（其 deferred 极端组合 `watch-only residual`，见 E2c plan）。

## Goals

- `checkbox` / `switch` 支持 schema 级 `trueValue` / `falseValue`，runtime 按此映射存取值（缺省回退 `true`/`false`，无回归）。
- 裁定 `radio-group` 是否需要 `trueValue`/`falseValue`（options 是否已 subsume），并在 design.md 记录裁决理由。
- checkbox/switch/radio-group 三个 design.md 补齐 Flux 决策表（X5 扩展），`trueValue`/`falseValue` 行从「建议后续」翻转为「实现」或显式「不采纳 + 理由」。
- focused 单测覆盖：自定义值映射、缺省回退、表单初始值识别、与 `booleanValueAdapter` 的兼容。

## Non-Goals

- 不实现 checkbox 的 `indeterminate` 半选态（design.md §4 列为后续，本 plan 只做值映射维度；半选态归独立增强）。
- 不改 checkbox-group（E2c 已收口选择增强）。
- 不引入 amis 的 `option`/`value` 旧式 trueValue 数组语法；新字段用 shadcn/X3 命名基线（扁平 `trueValue`/`falseValue` 标量）。
- 不覆盖 input-number/radio-group 之外的 E3 组件（text/icon/input-number 等归其它 E3 plans）。

## Scope

### In Scope

- `CheckboxSchema` / `SwitchSchema` 新增 `trueValue?` / `falseValue?`（标量，类型 `SchemaValue`）。
- runtime 值映射：checkbox/switch 读取 schema 的 trueValue/falseValue，`onChange` 写入对应值，`checked` 由「当前值 === trueValue」判定；缺省回退 `true`/`false`。
- radio-group 裁定（Decision）：确认 options 是否 subsume 布尔场景；若需要，加最小 trueValue/falseValue 便利字段，否则 design.md 显式「不采纳 + 理由」。
- checkbox/switch/radio-group design.md 新建 Flux 决策表节（§2 格式，参考 `input-number/design.md:13-31` 范本）。
- focused 单测（RED→GREEN）。
- playground 示例 + `examples.manifest.json` 登记。

### Out Of Scope

- checkbox `indeterminate` 半选态（独立增强）。
- checkbox-group 选择增强（E2c 已收口）。
- 布尔控件的 schema 级 `valueType` 强类型推断（归 form runtime 独立评估）。

## Failure Paths

| 场景编号             | 触发                                 | 行为                                                | 可重试 | 用户可见表现                           |
| -------------------- | ------------------------------------ | --------------------------------------------------- | ------ | -------------------------------------- |
| only-trueValue-set   | 只配 `trueValue` 无 `falseValue`     | `falseValue` 缺省为 `false`；design.md 注明对称缺省 | 否     | 未选中时存 `false`                     |
| initial-value-custom | 表单初始值为自定义 trueValue 字符串  | 控件识别为 checked（值 === trueValue）              | 否     | 控件初始勾选                           |
| value-neither        | 当前值既非 trueValue 也非 falseValue | 按「不等于 trueValue」判为 unchecked，不抛错        | 否     | 控件未勾选，值原样保留待 onChange 覆盖 |

## Test Strategy

本档选择：`必须自动化`

理由：布尔控件值映射是表单数据正确性问题（存什么值进 form runtime），属核心回归路径，必须 Proof-before-Fix。自定义值映射的初始值识别与缺省回退是易回归点。

## Execution Plan

### Phase 1 - X5 决策表扩展 + radio-group 裁定

Status: completed
Targets: `docs/components/checkbox/design.md`、`docs/components/switch/design.md`、`docs/components/radio-group/design.md`

- Item Types: `Decision`、`Fix`

- [x] **Fix**：`checkbox/design.md` 新建 §2 Flux 决策表节（参考 `input-number/design.md:13-31` 范本），列：`trueValue`/`falseValue`（实现）、`indeterminate`（不采纳/后续 + 理由）、amis `option` 数组语法（不采纳 + 理由）。
- [x] **Fix**：`switch/design.md` 新建 §2 Flux 决策表节，列：`trueValue`/`falseValue`（实现）、与 checkbox 的语义边界（switch=即时开关 / checkbox=勾选项）、amis 旧字段（不采纳 + 理由）。
- [x] **Fix**：`radio-group/design.md` 新建 §2 Flux 决策表节。
- [x] **Decision**：裁定 radio-group 是否需要 trueValue/falseValue —— 核对 `RadioGroupRenderer` 已用 `stringValueAdapter` + options 任意值；若 boolean-radio 场景已被 options 覆盖，则 design.md 显式记「不采纳 trueValue/falseValue + 理由（options 已 subsume）」，本 plan 不加字段；否则加最小字段。结论写入三个 design.md。

Exit Criteria:

- [x] 三个 design.md 各含 §2 Flux 决策表节（live repo 可读，列含采纳/不采纳/理由三列）。
- [x] radio-group 裁定结论明确（采纳加字段 / 不采纳 + 理由），无歧义。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/boolean-control-value-contract.test.tsx`（新建）

- Item Types: `Proof`

- [x] 新建测试文件，先写失败用例（RED）：
  - checkbox 配 `trueValue: 1, falseValue: 0` → 勾选存 `1`、取消存 `0`。
  - checkbox 缺省 trueValue/falseValue → 存 `true`/`false`（无回归）。
  - checkbox 表单初始值 `1`（=== trueValue）→ 控件初始 checked。
  - checkbox 当前值既非 trueValue 也非 falseValue → unchecked，值原样保留（Failure Path `value-neither`）。
  - 只配 trueValue 无 falseValue → unchecked 存 `false`（Failure Path `only-trueValue-set`）。
  - switch 配 `trueValue: "yes", falseValue: "no"` → 切换存 `"yes"`/`"no"`，onLabel/offLabel 与值映射正交。
  - switch 缺省 → 存 `true`/`false`（无回归）。
  - （若 Phase 1 裁定 radio-group 加字段）radio-group boolean 场景 trueValue/falseValue 映射；否则本条删除。

Exit Criteria:

- [x] 测试文件存在，运行 grep 全部 RED（断言未实现行为）。
- [x] 用例覆盖 Goals 中值映射维度所有可观测行为 + 三条 Failure Path。
- [x] 注：radio-group 相关用例依 Phase 1 裁定结论启用/删除；Phase 1 裁定不加字段时本 Phase 不含 radio-group 用例。

### Phase 3 - schema + runtime 实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`

- Item Types: `Fix`

- [x] `schemas.ts`：`CheckboxSchema` / `SwitchSchema` 新增 `trueValue?: SchemaValue` / `falseValue?: SchemaValue`（参考 X3 命名基线，扁平标量）。
- [x] `input-choice-renderers.tsx`：CheckboxRenderer / SwitchRenderer 读取 trueValue/falseValue，`checked = (value === trueValue ?? true)`，`onChange` 写入 `checked ? trueValue : falseValue`（缺省回退 `true`/`false`）；保持 `booleanValueAdapter` 兼容或引入轻量映射适配器（Decision in phase）。
- [x] （若 Phase 1 裁定加字段）RadioGroupSchema + RadioGroupRenderer 对应改动。
- [x] Phase 2 RED 用例全部转 GREEN。

Exit Criteria:

- [x] Phase 2 全部用例 GREEN；既有 `input-choice-renderers` 测试套件无回归（`pnpm --filter @nop-chaos/flux-renderers-form test` 全过）。
- [x] live repo 核对：`CheckboxRenderer`/`SwitchRenderer` 真实读 trueValue/falseValue（grep 非空），runtime 路径调用映射逻辑（非空壳）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form typecheck`）。

### Phase 4 - owner-doc 同步与 playground 示例

Status: completed
Targets: `docs/components/{checkbox,switch,radio-group}/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [x] 三个 design.md §4（schema 设计）/§5（字段分类）/§10（DOM marker，如新增）同步 trueValue/falseValue 落地内容，与 runtime 行为一致。
- [x] playground 新增「布尔控件值契约」示例页（演示 checkbox/switch 自定义 trueValue/falseValue + 缺省回退），注册路由。
- [x] `examples.manifest.json` 登记新示例。
- [x] **e2e**：新增 `tests/e2e/boolean-control-value-contract.spec.ts`，覆盖 checkbox/switch 自定义 trueValue/falseValue 勾选后表单值映射 + 缺省回退的关键交互路径（满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。

Exit Criteria:

- [x] 三个 design.md §4/§5 与 runtime 一致（live repo 可读）。
- [x] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_114af2636ffekCjUy7trf7cGw2）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major（e2e 义务缺失）→ 已在 Phase 4 + Closure Gates 新增 `tests/e2e/boolean-control-value-contract.spec.ts` 条目。
  - Minor（`input-choice-renderers.tsx:541+` 上界不精确）→ 改为 `541-615`。
  - Minor（Phase 2/3 radio-group 用例条件依赖 Phase 1 裁定）→ Phase 2 Exit Criteria 显式注明「radio-group 用例依 Phase 1 裁定启用/删除」。
  - 引用准确性：`input-choice-renderers.tsx:464-492/494-539/541-615`、`schemas.ts:191-203/123-125`、checkbox/switch design.md §4 L23、三组件 design.md 缺 §2 Flux 决策表 全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major（修复后），Plan Status 升级为 `active`。

## Closure Gates

- [x] checkbox/switch trueValue/falseValue 值映射已落地且 focused 测试 GREEN
- [x] radio-group 裁定结论已落地（加字段 or 显式不采纳 + 理由）
- [x] checkbox/switch/radio-group 三个 design.md 含 Flux 决策表（X5 扩展完成）
- [x] 缺省回退 `true`/`false` 无回归（既有测试套件全过）
- [x] playground 示例 + `examples.manifest.json` 登记
- [x] `tests/e2e/boolean-control-value-contract.spec.ts` 存在并覆盖关键交互路径
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（design.md §2/§4/§5）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### checkbox indeterminate 半选态

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: design.md §4 列为后续；半选态是 UI 显示维度，与值映射维度正交；当前无明确业务需求驱动。
- Successor Required: no

### checkbox-group 全选+maxSelected 极端组合替代语义

- Classification: `watch-only residual`
- Why Not Blocking Closure: E2c 已实现「全选只选到上限并显示 indeterminate」；本 plan 不动 checkbox-group。归 E2c plan Deferred 已记。
- Successor Required: no

## Non-Blocking Follow-ups

- 布尔控件 schema 级 `valueType` 强类型推断（让表单 metadata 自动推断布尔字段）归 form runtime 独立评估。
- amis `trueValue`/`falseValue` 兼容层（旧 schema 迁移）显式拒绝，归 migration 评估。

## Closure

Status Note: 4 个 Phase 全部 `completed`，所有 Closure Gates 与 Exit Criteria 已勾选。独立 fresh-session 子 agent 已对 live repo 做完整 closure audit（schema/runtime 行为、focused 单测、e2e、design.md 决策表、playground 登记、roadmap/log 同步），未发现 hollow 实现或隐藏的 in-scope defect。plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，closure-audit，不复用执行 session 上下文）
- Live repo 核对清单（逐 Phase）：
  - Phase 1：`docs/components/checkbox/design.md:13` / `switch/design.md:13` / `radio-group/design.md:13` 均含 §2 Flux 决策表；radio-group 显式「不采纳 trueValue/falseValue（options 已 subsume）+ 理由」（`radio-group/design.md:18`）。
  - Phase 2/3：`packages/flux-renderers-form/src/schemas.ts:196-197`（CheckboxSchema）、`:205-206`（SwitchSchema）新增 `trueValue?: SchemaValue` / `falseValue?: SchemaValue`；`RadioGroupSchema:123-125` 无此字段（与裁决一致）。`input-choice-renderers.tsx:465-467`（Checkbox）/`:498-500`（Switch）读取 schema 并构造 `booleanMappingAdapter`。`packages/flux-core/src/value-adapter.ts:220-232` 双向映射（`in` 用 `Object.is`，`out` 按 `checked ? trueValue : falseValue`）。Anti-hollow 核对：`field-handlers.tsx:197-222` `setValue` 在 `onChange` 时调用 `adapter.out`，运行时映射真实触发（非空壳）；缺省 `true`/`false` 字节兼容旧契约。
  - Phase 2 用例文件：`packages/flux-renderers-form/src/__tests__/boolean-control-value-contract.test.tsx`（11 用例，覆盖 only-trueValue-set / initial-value-custom / value-neither 三条 Failure Path + 缺省无回归）。
  - Phase 4：`apps/playground/src/pages/boolean-control-value-contract-demo.tsx` 存在，注册于 `App.tsx:18,137` + `route-model.ts:430`；`docs/components/examples.manifest.json` 的 `runtime` 数组含 checkbox/switch/radio-group，对应 `example.json` 已含 trueValue/falseValue；e2e `tests/e2e/boolean-control-value-contract.spec.ts`（4 用例）+ `tests/e2e/playground-entry-pages.spec.ts:86` route assertion。
- 全量验证基线（`docs/logs/2026/06-22.md`）：`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26、`pnpm test` 49/49 tasks（flux-renderers-form 38 files / 360 tests 含新增 11 用例全绿）；e2e `boolean-control-value-contract.spec.ts` 4/4 全过。
- Owner-doc 同步：checkbox/switch `design.md` §4/§5 已记 `booleanMappingAdapter` 映射语义；roadmap `existing-components-improvement-roadmap.md:58` 标记本子项 ✅ done。

Follow-up:

- 布尔控件 schema 级 `valueType` 强类型推断（Non-Blocking Follow-ups，归 form runtime 独立评估）。
- checkbox `indeterminate` 半选态（Deferred But Adjudicated，out-of-scope improvement）。
- 无剩余 plan-owned work，无被静默降级的 in-scope live defect 或 contract drift。
