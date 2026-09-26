# 508 Missing Components L2.4 — verification-code（OTP 验证码输入）

> Plan Status: active
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.4 行——「纯 registration：ui `InputOtp` 已存在（同 L1.1 debt 模式）」）；§1 交付铁律
> Related: `docs/plans/503-missing-components-l1-p0-form-atoms-plan.md`（registration-debt 模式先例）；`docs/plans/507-missing-components-l2-3-input-signature-plan.md`（同线模板）

## Purpose

按交付铁律 8 项收口 roadmap L2.4：`verification-code` OTP 验证码输入控件——ui `InputOtp` 基元已存在（registration debt），注册 renderer + schema + 契约 + 分组输入行为（自动跳格/粘贴分发/完成事件）+ 全套交付面。

## Current Baseline

2026-09-25 live repo 核对：

- **ui 基元**：`packages/ui/src/components/ui/input-otp.tsx` 存在且经 `packages/ui/src/index.ts:29` 导出（registration debt，同 L1.1 slider 模式）——零 ui 改动。
- **matrix**：`docs/components/amis-baseline-matrix.md` 无 `verification-code` 行（Form Core 增行即 flip，505 判例）。
- **renderer 模式**：`renderers/input.tsx` `createFieldValidation`/`validateInputFieldSchema`；底座 `useFormFieldFromProps`（`stringAdapter`）；definitions 聚合 `src/definitions.ts`。
- **测试/接线**：route-matrix 守卫（form-route-entries + RENDERER_LAB_REGISTRY）；lab 页 MultiScenarioLabPage；e2e fixtures。
- **验证基线**：master 6666ab922 干净；e2e 失败面 = 502 存量台账 9 + watch-only 1。

## Goals

- 命名 pass（`verification-code` 名不变：语义直指、与 AMIS `input-verification-code` 源对齐注记——`InputOTP` 系 antd/shadcn 名）+ matrix Form Core 增行。
- `verification-code` renderer：消费 ui `InputOTP`（薄封装 input-otp@1.4.2，透传 props）。API 映射：`length` → `maxLength={n}` + 渲染 n × `InputOTPSlot`（ui 无 `length` prop）；`masked` → renderer 自建（`render` prop 替换字符为 •，零 ui 改动成立）；`placeholder` → 原生 placeholder 通路。
- **值语义不变式（draft review r1 M1 裁决）**：`输入长度 < length ⇔ 值 undefined`——齐位提交后再回退删位，值一律回落 `undefined`（不保留陈旧已提交码、不提交短值）；`length` 位齐 ⇔ 值 = 完整码字符串。required 校验与提交契约由该不变式唯一决定；e2e「回退修改」断言按此写。
- focused 单测 + e2e + 登记 + i18n + INV 审计 + roadmap 回写 + dev log。

## Non-Goals

- 不做发送倒计时/重发按钮（发送动作属 host `xui:actions` 编排，非控件职责）。
- 不做校验规则内置（长度由 `length` prop 决定格式，业务校验走 form validate）。

## Scope

### In Scope

- matrix Form Core 增 `verification-code` 行。
- `packages/flux-renderers-form/src/`：`schemas-verification.ts`（`VerificationCodeSchema`：`length`（默认 6；非正数或非整数 → 6，产品裁决不设上界——lib `maxLength` 无上界，与 vc-length-clamp 口径统一）/`masked`/`placeholder`，extends InputSchema）+ `renderers/verification-code-renderer.tsx` + `verification-renderer-definitions.ts` + contracts + 聚合。
- i18n（aria 标签 zh/en）+ playground lab 页 + route/registry。
- 测试：focused 单测（渲染 length 格/值提交/清空/禁用）+ e2e（键入分发至各格/完成提交/回退修改）。
- docs：design.md + example.json + 三处登记 + roadmap §13 + dev log。

### Out Of Scope

- L2.5–L2.6；ui 包改动。

## Failure Paths

| 可测场景编号         | 触发                                  | 行为                                                         | 可重试 | 用户可见表现  |
| -------------------- | ------------------------------------- | ------------------------------------------------------------ | ------ | ------------- |
| vc-length-clamp      | `length: 0` / 负数 / 非整数           | 运行时钳制为 6（容错不崩；无上界钳制，lib maxLength 无上界） | 否     | 6 格渲染      |
| vc-partial-no-commit | 输入长度 < length（含齐位后回退删位） | 值一律回落 undefined（不提交半截码/陈旧码，§值语义不变式）   | 否     | required 正常 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（铁律 4；Proof 单测先于或随 Fix 项落地，507 先例同序注记）

## Execution Plan

### Phase 1 - 命名 pass + matrix flip + 实现 + 分层验证

Status: planned
Targets: 本 plan、matrix、`packages/flux-renderers-form/src/`、playground lab、`docs/components/verification-code/`

- Item Types: `Decision`、`Fix`、`Proof`

- [ ] 命名决议落本 plan（`verification-code` 名不变；AMIS 源 type 为 `input-verification-code`——gap-analysis :97 权威，`InputOTP` 系 antd/shadcn 命名；裁决权威 `docs/references/naming-conventions.md` + naming pass 规则）；matrix Form Core 增行
- [ ] schema + contracts + definition（capability: clear/reset/focus）+ renderer（ui InputOtp 消费、length 钳制、masked、齐位提交）
- [ ] focused 单测（渲染 length 格/齐位提交/回退回落 undefined/清空/禁用态/初值回显归一（非齐位初值 → undefined、齐位初值回填各格）——Proof 项，随 Fix 落地并先行编写）
- [ ] e2e `verification-code.spec.ts`（键入分发/完成提交/回退回落 undefined/清空）
- [ ] `design.md` + `example.json`；i18n 键；lab 页 + 路由注册

Exit Criteria:

- [ ] focused 单测绿；route-matrix 守卫绿；e2e spec 全绿

### Phase 2 - 登记 + INV 审计 + 收口验证与状态回写

Status: planned
Targets: 三处登记、roadmap §13、dev log

- Item Types: `Proof`、`Follow-up`（登记性）

- [ ] 登记：examples.manifest.json / quick-reference.md / components/index.md
- [ ] INV 审计（铁律 7）结论按 §4 模板落 Closure 节
- [ ] 全量验证 + roadmap §13 L2.4 回写 `done`（grep 复核）+ dev log

Exit Criteria:

- [ ] 三处登记 diff 可见；roadmap/dev log 落盘一致

## 授权记录（human gate）

- 用户 2026-09-25 指令执行 roadmap 至彻底完成为 L2.4 行授权；matrix flip 随指令签认（先例：503/505/506/507）。ui 包零改动。

## Draft Review Record

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-26，两轮）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Round 1 `fail`（1M/4m）：M1 回退路径值语义未裁决 → 「值语义不变式」裁决段（长度 < length ⇔ undefined 双向充分）；m1 ui API 映射写实（length → maxLength + n×Slot、masked → render prop 自建）；m2 钳制口径统一（非正数/非整数 → 6、无上界）；m3 命名源名改 AMIS `input-verification-code`（gap-analysis :97）+ naming-conventions 权威；m4 Proof 先行注记。Round 2 确认闭合；n1 Goals 残留旧源名与 n2 初值回显用例已顺手修入。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复
- [ ] 所有 in-scope confirmed contract drifts 已收敛
- [ ] 行为/契约结果已达成（`verification-code` `runtime` 八项交付面齐）
- [ ] 必要 focused verification 已完成（focused 单测 + e2e 真浏览器断言）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步（design.md、matrix、三处登记）
- [ ] new-renderer-introduction-audit 已过且结论按 §4 模板记录于 Closure 节
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红）
- [ ] `pnpm test:e2e`（全量零新增红；失败面 = 502 存量台账 9 + 1 在册 watch-only）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
