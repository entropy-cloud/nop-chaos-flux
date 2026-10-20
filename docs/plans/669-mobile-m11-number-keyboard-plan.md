# 669 Mobile M11 安全输入组计划

> Plan Status: completed
> Last Reviewed: 2026-10-20
> Source: `docs/components/mobile-native-components-roadmap.md` M11（M11a NumberKeyboard / M11b verification-code 联动契约）；形态参照 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.10（zarm keyboard 金融级）
> Related: `docs/plans/666-mobile-m8-bottom-panels-plan.md`（弹层壳先例）

## Purpose

交付安全输入能力：M11a `number-keyboard`（自绘虚拟数字键盘 renderer：数字/小数点/删除/确认键布局 + 乱序防窥）为新增 mobile 渲染器；M11b 与既有 `verification-code` 渲染器对账——核实联动契约边界，避免双实现。

## Current Baseline

- M6–M10 已落地（最新 commit d2203cc88）；包测试基线 mobile 33 文件/366 用例全绿；定义面 15 类型（MM-11 钉死）。
- 既有 `verification-code` 渲染器（flux-renderers-form 或 mobile——执行时 grep 定位）：输入框 + 分格 UI，无虚拟键盘联动。
- 弹层壳先例（action-sheet）：useGlobalZIndex + useLockScroll + safe-bottom + mask/cancel。
- 无任何 number-keyboard 既有代码（grep 零命中）。

## Goals

- **M11a `number-keyboard`**：受控打开的虚拟数字键盘弹层：①键布局 4 行 `[1,2,3][4,5,6][7,8,9][.,0,delete]` + confirm 键（右侧独立列，参照 antd-mobile/vant）；②`randomOrder`（乱序防窥，数字键每 mount Fisher-Yates 重排，键集不变）；③触摸按键统一派发 `onKey({ key, value })`——数字/`.`/`delete`；④confirm 键仅派发 `onConfirm`（不复派 onKey）；⑤`decimal: false` 时不渲染小数点（该位置空置或 delete 占位——实现钉死为小数点隐去、delete 恒在）；⑥弹层壳复用（z-index 栈 + useLockScroll + safe-bottom + mask/cancel）。
- **M11b 对账 Decision**：核实并记录与 `verification-code`（flux-renderers-form，InputOTP 域字段：全长度提交不变式 + 刻意 uncontrolled cells）的联动边界——`number-keyboard` 为独立输入面，消费方经 form value 通道集成即可，不改造 verification-code 内部；passcode 无既有实现（roadmap M11b 行 passcode 字样无对账对象，一并记录）。结论以核实后记录为准，落 design.md。
- MM-11 演进（15→16；MM-11 = mobile-renderer-definitions.test.tsx declares-N 定义面门禁）+ playground `/m11-number-keyboard` + e2e。

## Non-Goals

- 不改 `verification-code` 渲染器内部（对账记录即可）。
- 不做金融级安全键盘全套（防截屏/防录屏等 native 能力）。
- 不做身份证/银行卡专用键盘布局变体。
- 触感反馈（vibration）不进 v1（无 navigator.vibrate 契约与测试通道），移 Non-Blocking Follow-ups。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/`：`number-keyboard.tsx` + 测试、schemas/extended 注册/导出/styles。
- `docs/components/number-keyboard/design.md`（含 M11b 对账记录）。
- playground 演示页 + e2e。

### Out Of Scope

- `verification-code` 渲染器内部改动；native 安全能力。

## Failure Paths

| 可测场景编号                 | 触发                    | 行为                                      | 可重试 | 用户可见表现 |
| ---------------------------- | ----------------------- | ----------------------------------------- | ------ | ------------ |
| `keyboard-mask-close`        | 点击遮罩                | 关闭键盘 + onCancel                       | 是     | 关闭         |
| `random-order-deterministic` | randomOrder=true        | 乱序布局（键集不变 {0-9}，每 mount 重洗） | 是     | 乱序布局     |
| `decimal-disabled`           | schema `decimal: false` | 小数点键不渲染                            | 是     | 3×3+确认     |
| `confirm-disabled-state`     | `confirmDisabled` 受控  | 确认键禁用态                              | 是     | 灰置         |

## Test Strategy

档位选择：**必须自动化**（键布局矩阵与乱序确定性是正确性契约）。

## Execution Plan

### Phase 1 - M11a number-keyboard + M11b 对账

Status: completed
Targets: `packages/flux-renderers-mobile/src/number-keyboard.{tsx,test.tsx}`、schemas/extended 注册、MM-11（15→16）、design.md

- Item Types: `Proof`、`Fix`

- [x] Proof: `number-keyboard.test.tsx` 先行——键布局渲染（4 行 [1-9][.][0][delete] + confirm 列）、`randomOrder` 键集不变断言（mount 后键集合 = {0-9}，重 mount 仍为排列）、数字/`.`/delete 按键派发 `onKey`（delete 省略 value）、confirm 仅派发 `onConfirm`（onKey 不复派）、遮罩关闭 + onCancel、disabled、decimal:false 小数点隐去
- [x] Fix: `number-keyboard.tsx`——弹层壳复用 + 键盘矩阵渲染 + 乱序（Fisher-Yates per mount）+ `NumberKeyboardSchema`（open/decimal/randomOrder/confirmDisabled/title/onKey/onConfirm/onCancel；delete 走 onKey 通道——M2 裁定）+ 注册 + i18n（confirm/删除键 aria）
- [x] Decision: M11b 对账记录——核实 verification-code（form 包 InputOTP 域：全长度提交不变式 + uncontrolled cells）与 number-keyboard 的联动边界；passcode 无既有实现一并记录（roadmap M11b 字样无对账对象）
- [x] Proof: MM-11 16 类型门禁

Exit Criteria:

- [x] `number-keyboard.test.tsx` 全绿；包测试零回归；MM-11 16 类型通过
- [x] 对账记录落 design.md

### Phase 2 - 集成面：演示页、e2e、roadmap 勘误

Status: completed
Targets: playground `/m11-number-keyboard`、`tests/e2e/mobile-number-keyboard.spec.ts`、roadmap M11 行勘误

- Item Types: `Fix`、`Proof`

- [x] Fix: 演示页（触发键盘 + 按键回显 + 确认值展示）
- [x] Proof: e2e——打开键盘、按键输入回显、确认关闭（CDP 触摸）；`setViewportSize` 冒烟
- [x] Fix: roadmap M11 行就地勘误——随收口提交

Exit Criteria:

- [x] e2e 全绿；局部 typecheck 通过（全量 `pnpm check` 归 Closure Gates）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 2；Round 1 fail 2 Major + 5 Minor）
- Rounds: 2
- Findings addressed:
  - R1-Major M1 键集/布局自洽（3×4 容不下 delete）→ 钉死 4 行布局 + confirm 独立列；M2 confirm 通道二义 → 数字/`.`/delete 统一 onKey、confirm 仅 onConfirm、delete 省略 value
  - R1-Minor m1 触感反馈移 Follow-ups；m2 Phase 2 Exit 收窄；m3 乱序措辞收敛键集不变；m4 M11b Decision 中性化 + passcode 无对账对象记录；m5 MM-11 映射注明
  - R2-nit 三处措辞（乱序键集不变性、decimal-disabled 表现、Goal ⑤ 行文）随手收敛

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope contract drifts 已收敛（M11b 对账记录在案）
- [x] 行为/契约结果已达成（Phase 1–2 Exit Criteria 全勾）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（number-keyboard design.md + roadmap M11 行勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照既有红集合；零新增）

## Deferred But Adjudicated

（执行中裁决当场落本节。）

## Non-Blocking Follow-ups

- 身份证/银行卡布局变体；防截屏 native 能力；按键触感反馈（navigator.vibrate，v1 无契约与测试通道）。

## Closure

Status Note: M11a–M11b 全部交付——number-keyboard（4 行数字网格 + confirm 独立列、randomOrder 乱序防窥键集不变、decimal 开关、confirmDisabled、弹层壳复用 z-index 栈/滚动锁/safe-bottom；通道契约：数字/`.`/delete 统一 onKey（delete 省略 value）、confirm 仅 onConfirm）；M11b 对账记录落 design.md §2（verification-code InputOTP 域经 form value 通道集成、passcode 无既有实现）。全量门禁：typecheck/build/lint 绿、test 82/82（mobile 34 文件 376 用例）、check 唯一红 = 既有 knip xlang（master 同红）、e2e number-keyboard 5/5。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），三轮：R1 `issues`（2 Blocker：演示页死脚手架 lint 3 错下虚假绿、number-keyboard 锌字面 2 处未登记新红；1 Minor 组）→ 回修 → R2 `issues`（1 Major：日志 scanner 数字勘误声称落地实未落）→ 修复 → R3 `approved`（收口订正清单随本提交载入）
- Evidence: R1 发现演示页死脚手架（createFormulaCompiler/SchemaRenderer/env 孤儿声明）与 number-keyboard 锌字面类未登记；回修后 R2 逐项亲证 B1/B2 关闭（lint 44/44、ui-consistency 零新增），但 M1 日志数字勘误声称落地实未落（blob 哈希同 R1）；R3 确认一行勘误真实落地且归因口径与 baseline 一致。审计会话 id（agent_5208e2ce-12b2-466c-8ecb-700111212197）。
