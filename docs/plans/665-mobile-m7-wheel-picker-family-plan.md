# 665 Mobile M7 Picker 滚轮家族计划

> Plan Status: completed
> Last Reviewed: 2026-10-19
> Source: `docs/components/mobile-native-components-roadmap.md` M7（共识度最高 8/11 库）；内核路线依据 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.5/§8（TDesign rAF quartEaseOut 可打断 + vant/arco/nutui 惯性参数组）
> Related: `docs/plans/664-mobile-m6-gesture-infrastructure-plan.md`（M6 算法底座：MomentumAnimator/gesture-math/useLockScroll，已 completed）

## Purpose

交付移动端滚轮选择家族：`picker-view` 内核（惯性 + 吸附 + 越界回弹 + 受控回写抑制）与三个派生 renderer（`wheel-picker` 弹出选择字段、`wheel-date-picker`/`wheel-time-picker` 纯配置派生、`wheel-cascader` 级联列联动），全部落 `flux-renderers-mobile`，复用 M6 手势基建，零新依赖。

## Current Baseline

- **类型名占用（本计划命名约束的成因）**：`type: 'picker'` 已被 `flux-renderers-form-advanced` 占用（桌面字段选择壳，dialog/drawer 弹层 + 任意 pickerSchema 内容，见 `docs/components/picker/design.md` §3）；`cascader` 名字被 missing-components roadmap L2.6 裁决保留（demand-gated，桌面列式懒加载形态，决策文档 `docs/analysis/cascader-vs-tree-select-decision.md`）；`picker-view`/`date-picker`/`time-picker` 未被任何注册类型占用（2026-10-19 全仓 grep）。
- **M6 底座已落地**（plan 664 completed，commit 249821d7f）：`MomentumAnimator`（rAF quartEaseOut 可打断）、`momentumDistance/momentumDuration/nearest`、`VelocityTracker`、`useTouch`（velocity 内建）、`useLockScroll`、`useGlobalZIndex`（`@nop-chaos/ui`，M0.1d）、safe-area 辅助类（`@nop-chaos/ui` mobile.css）。
- **表单绑定基座**：`flux-react` 导出 `FieldFrame`（`field-frame.tsx`）与 `useCurrentForm`/`useCurrentFormState`/`useFieldError`/`useRendererRuntime` 等 hooks；`flux-renderers-mobile` 已依赖 `flux-react` 与 `@nop-chaos/ui`，无需新增包依赖。表单值写入走 FormRuntime（`flux-core`）+ `shouldValidateOn` 门控在 `flux-renderers-form`（mobile 不依赖它——本计划字段写入后调用 `owner.validateField(name, 'change')` 的简化路径，无 GATE 路径需求）。
- **滚轮几何参数基线**（调研 §5）：惯性触发 300ms/15px、减速度 0.003（vant/arco/nutui 同参）、`nearest` 锚点吸附、行高默认 44px（M0 触摸目标基线）。
- **既有滚轮先例（对账对象现状）**：missing-components L2.2 已落地为 `input-city`（省市区字段，plan 506，2026-09-25 `done`，注册于 `flux-renderers-form/src/renderers/org/org-renderer-definitions.ts:89`），其移动 wheel 分支已存在（`packages/flux-renderers-form/src/renderers/org/region-wheel.tsx`，CSS scroll-snap `snap-y snap-mandatory` 实现，非 M6 rAF 内核）；M7d 对账小节以其为对准对象。
- `flux-renderers-mobile` 现有 5 renderer + 手势层导出；注册走 `mobile-renderer-definitions.ts`；`check-renderer-definition-fields-only` 门禁在册。
- 包测试基线 24 文件 / 283 用例全绿（plan 664 收口值）。

## Goals

- **命名契约**：移动滚轮家族类型名为 `picker-view`（内联滚轮）/ `wheel-picker`（弹出选择字段）/ `wheel-date-picker` / `wheel-time-picker`（纯配置派生）/ `wheel-cascader`（级联列）——避开已占用与被保留名；在 plan 与 design.md 中记录命名裁定理由。
- **M7a 内核**：单列滚轮（多列 = 内核并列）：触摸拖拽跟手、松手惯性（300ms/15px 触发、deceleration 0.003、rAF 可打断）、`nearest` 行吸附、顶部/底部越界 rubberband 回弹、受控 `value` 回写抑制（拖拽中外部 value 变化不打断手势，落定后受控对齐）、`change` 事件在**动画落定帧**派发一次。
- **M7b 弹出字段**：`wheel-picker` = 触发展示（当前 label）+ 底部弹层（useGlobalZIndex + safe-area + useLockScroll + 取消/确认）+ 列配置 `columns`；受控 `value`（数组，按列）+ `onChange` payload `{ value, labels }`。
- **M7c 派生**：`wheel-date-picker`（年/月/日列，`min`/`max` 日期界，value `YYYY-MM-DD`）与 `wheel-time-picker`（时/分列，value `HH:mm`）以纯列配置生成器实现，内核零改动。
- **M7d 级联**：`wheel-cascader` 列联动（第 n 列 options 由前 n-1 列选中值的 `children` 派生；父列变更时子列重置为该父下首项）；与 missing-components L2.2 落地物 `input-city` 的 region-wheel 分支（CSS scroll-snap）对账记录落 design.md（含「迁移复用 wheel-cascader/picker-view 内核」候选方向）。
- 单元层：内核吸附/惯性/受控抑制 focused 测试（纯函数 + hook/组件级）；派生层列配置生成器测试。
- playground `/m7-wheel-pickers` 演示页 + `tests/e2e/mobile-wheel-pickers.spec.ts`。

## Non-Goals

- 不做桌面 `picker`（form-advanced 选择壳）的任何改动，不与其共享代码。
- 不做 `input-city`（原 L2.2 region 省市区）本体改动；其已落地的 region-wheel 分支（CSS scroll-snap）与本家族的关系在 M7d 对账小节记录。
- 不引入循环滚动（vant options 少时首尾相接）与 3D 变换（nutui rotate3d）——v1 平移滚轮。
- 不做键盘/桌面交互增强（滚轮家族为 mobile-native 组件，桌面端浏览器中可用鼠标拖拽属自然回退，不做专门适配）。
- 不改 `@nop-chaos/ui`、不新增 i18n 键以外的文案通道（确认/取消按钮走 flux-i18n 新键）。
- 不做 async options 加载（columns 为静态 schema 数据；异步源由 host 层组装后传入）。

## Scope

### In Scope

- `packages/flux-renderers-mobile/src/`：`picker-view.tsx`、`wheel-picker.tsx`、`wheel-date-picker.tsx`、`wheel-time-picker.tsx`、`wheel-cascader.tsx`、`wheel-column-logic.ts`（纯函数：位移→索引、索引→位移、momentum 落点、越界回弹）、`wheel-date-columns.ts`（日期/时间列配置生成）、各 `*.test.ts(x)`、`schemas.ts` 增补、`mobile-renderer-definitions.ts` 注册、`index.ts` 导出、`styles.css` 滚轮视觉。
- `docs/components/wheel-picker/design.md`（picker-view 契约并入其 §1/§3/§5，不单独立文件——执行裁定，避免 60 行 thin-wrapper 文档碎片化；含 wheel-date-picker/wheel-time-picker/wheel-cascader 小节与 input-city/L2.6 对账记录）。
- playground 演示页 + e2e spec。

### Out Of Scope

- `picker`（form-advanced）、`input-city`、桌面 `cascader` 的任何改动。
- 循环滚动、3D 滚筒、惯性中 schema 变更外的动画需求。
- 渲染器定义字段之外的编译器/运行时改动。

## Failure Paths

| 可测场景编号                   | 触发                        | 行为                                                                              | 可重试 | 用户可见表现 |
| ------------------------------ | --------------------------- | --------------------------------------------------------------------------------- | ------ | ------------ |
| `controlled-write-during-drag` | 拖拽进行中外部 `value` 变化 | 不打断手势；落定后若受控值与落点不一致以**落点**派发 change（非受控优先完成手势） | 是     | 手势不跳变   |
| `momentum-into-boundary`       | 惯性落点越出首/尾索引       | clamp 到边界索引并 rubberband 回弹到位                                            | 是     | 回弹动画     |
| `columns-shrunk-below-index`   | options 缩短后当前索引越界  | 索引 clamp 到新末项并派发 change                                                  | 是     | 选中最后一项 |
| `cascader-branch-change`       | 级联中父列换选              | 子列重置为新父下首项并联动派发                                                    | 是     | 子列刷新     |
| `popup-open-scroll-through`    | 弹层打开后滚动页面          | useLockScroll 阻止 body 滚动穿透                                                  | 是     | 无穿透       |
| `empty-columns`                | columns 为空数组            | 渲染空滚轮占位，不抛错、不派发                                                    | 是     | 空态         |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**。理由：滚轮内核是索引↔位移↔动量的状态机（受控抑制/落定派发是正确性契约，M7c/d 与 input-city region-wheel 分支迁移等 region 类消费方都压在其上），核心回归路径；Proof 项先于派生 Fix。

## Execution Plan

### Phase 1 - M7a 内核（wheel-column-logic + picker-view）

Status: completed
Targets: `packages/flux-renderers-mobile/src/{wheel-column-logic,picker-view}.{ts,tsx}`、`wheel-column-logic.test.ts`、`picker-view.test.tsx`、`schemas.ts`、`mobile-renderer-definitions.ts`

- Item Types: `Proof`、`Fix`

- [x] Proof: `wheel-column-logic.test.ts` 先行——`offsetForIndex(index,rowHeight)`、`indexForOffset`（round + clamp）、`momentumTargetIndex({ releaseOffset, velocityPxMs, gestureDurationMs, travelPx, rowCount, rowHeight })`（MomentumTargetInput 对象参数；300ms/15px 触发条件、`momentumDistance` 0.003、`nearest` 吸附、clamp [0,rowCount-1]）、`snapBackOffset`（越界 rubberband，dim=rowHeight、c=0.15）基准值表
- [x] Proof: `picker-view.test.tsx` 先行——拖拽跟手（transform 随 touchmove）、松手过阈值吸附变更行并恰派发一次 change、受控抑制（拖拽中重渲染 value 不打断、落点赢 payload.index=1）、columns 缩短 clamp（不派发）、空 columns 空态；审计回修增补：受控写入打断落定动画（stopMomentum 契约）与 rubberband 越界视觉阻尼判别用例
- [x] Fix: `wheel-column-logic.ts` 纯函数实现（复用 M6 `momentumDistance/nearest/rubberband`）
- [x] Fix: `picker-view.tsx`——单列滚轮渲染（可视窗口 + 位移 transform + M6 MomentumAnimator 惯性）、受控 value 回写抑制（draggingRef 模式，对齐调研 antd-mobile `draggingRef` 范式）、落定帧派发；当前行携带 `data-index`（Phase 5 e2e 断言通道）；`PickerViewSchema`（columns/rowHeight/value/onChange…）+ 注册
- [x] Proof: 多列 = `columns` 数组逐列独立内核实例的并列断言（两列联动选择互不影响）

Exit Criteria:

- [x] `wheel-column-logic.test.ts` 基准值表全绿且含旧式「CSS transition 不可打断」实现的判别注释路径（rAF 可打断有 focused 用例：动画中 stop 后受控值立即对齐）
- [x] `picker-view.test.tsx` 全绿；`change` 落定帧恰一次（StrictMode 双发防护有用例）
- [x] `pnpm --filter @nop-chaos/flux-renderers-mobile test` 全绿（283+ 新增零回归）

### Phase 2 - M7b wheel-picker 弹出字段

Status: completed
Targets: `packages/flux-renderers-mobile/src/wheel-picker.tsx`、`wheel-picker-family.test.tsx`（Phase 2–4 弹层家族测试合并文件，执行裁定）、`docs/components/wheel-picker/design.md`（含 picker-view 小节）

- Item Types: `Proof`、`Fix`

- [x] Proof: `wheel-picker.test.tsx` 先行——弹层开/关（display 状态 + useGlobalZIndex 递增）、useLockScroll 生效（弹层开时 body 有 nop-scroll-lock）、确认写回（确认时以滚轮当前行派发 change 并关弹层）、取消不写回、受控回显（value→列定位）
- [x] Fix: `wheel-picker.tsx`——触发展示（当前选中 labels join，空值 placeholder）、底部弹层（`useGlobalZIndex` + `nop-safe-top`?（底部弹层为 safe-bottom）+ `useLockScroll` + M6 点击抑制不适用）、确认/取消（flux-i18n 新键 `flux.mobile.wheelPicker.confirm/cancel`）、`WheelPickerSchema`（columns/value/placeholder/disabled/onChange…）+ 注册 + FieldFrame 字段包裹（label/name 经 flux-react form hooks）
- [x] Fix: `docs/components/wheel-picker/design.md`——schema 契约、markers（`nop-wheel-picker`/`nop-picker-view`/data-slot 族 + 当前行 data-index）、命名裁定记录（`picker` 被 form-advanced 占用、`cascader` 被 L2.6 保留、`wheel-` 前缀同时避让 form 包 `input-date`/`input-time`/`input-datetime` 近邻族）、事件 payload、i18n 键
- [x] Proof: `pnpm check:i18n-keys` 门禁对新键通过

Exit Criteria:

- [x] `wheel-picker.test.tsx` 全绿（开/关/确认/取消/受控回显/滚动锁）
- [x] design.md 契约与实现可对账（schema 字段、markers、payload、i18n 键、命名裁定）
- [x] `pnpm check:i18n-keys` 与 `pnpm check:renderer-definition-fields-only` 零新增红（整链 `pnpm check` 留 Phase 5/Closure Gates 一次）

### Phase 3 - M7c wheel-date-picker / wheel-time-picker 派生

Status: completed
Targets: `packages/flux-renderers-mobile/src/{wheel-date-columns,wheel-date-picker,wheel-time-picker}.{ts,tsx}`、`wheel-date-columns.test.ts`、`wheel-date-picker.test.tsx`、`wheel-time-picker.test.tsx`

- Item Types: `Proof`、`Fix`

- [x] Proof: `wheel-date-columns.test.ts` 先行——年月日列生成（min/max 界、闰年二月天数、月变更后日列收敛）、`YYYY-MM-DD` ↔ 列值编解码、时间列（00-23/00-59 步进 minuteStep?）与 `HH:mm` 编解码
- [x] Fix: `wheel-date-columns.ts` 纯配置生成器（输出 picker-view 列结构；月份天数联动=日列 options 随年月重算）
- [x] Fix: `wheel-date-picker.tsx`/`wheel-time-picker.tsx`——复用 wheel-picker 弹层壳 + 派生列配置 + 值编解码，内核零改动；注册 + 测试（选择日期→value 字符串、min/max 裁剪、月切换日列收敛）
- [x] Proof: 三者共享弹层壳的断言（wheel-picker 内核组件被 date/time 渲染器复用——以 data-slot 断言）

Exit Criteria:

- [x] 闰年/月末边界用例全绿（2024-02→29 天、2023-02→28 天、1/31→2 月收敛 28）
- [x] date/time value 编解码往返一致；min/max 界外选择被 clamp
- [x] 包测试全绿零回归

### Phase 4 - M7d wheel-cascader 级联 + 对账记录

Status: completed
Targets: `packages/flux-renderers-mobile/src/wheel-cascader.tsx`、`wheel-cascader.test.tsx`、`docs/components/wheel-picker/design.md` 对账小节

- Item Types: `Proof`、`Fix`

- [x] Proof: `wheel-cascader.test.tsx` 先行——列联动（第 n 列 = 前 n-1 选中值的 children）、父列换选子列重置首项、叶子选中 payload `{ value: 级联值数组, labels }`、`options` 树形 schema
- [x] Fix: `wheel-cascader.tsx`——`WheelCascaderSchema`（options 树 {label,value,children?}、value、onChange）+ 注册；弹层壳复用 wheel-picker
- [x] Fix: design.md 对账小节——与 `input-city`（L2.2 落地物，region-wheel 分支为 CSS scroll-snap 形态；迁移到 picker-view/wheel-cascader rAF 内核列为 optimization candidate）与 L2.6（桌面 cascader 裁决独立、本组件不占用 `cascader` 类型名）的关系记录

Exit Criteria:

- [x] 级联联动/重置/payload 用例全绿；叶子节点提前选中的行为有定义与测试（选中即完成，不再展开空列）
- [x] 对账小节落 design.md 且引用 input-city（org-renderer-definitions.ts:89 / region-wheel.tsx）与 L2.6 决策文档路径可对账

### Phase 5 - 集成面：演示页、e2e、契约同步

Status: completed
Targets: `apps/playground/src/pages/m7-wheel-pickers-demo.tsx`、`apps/playground/src/home-families.ts`、`apps/playground/src/domain-route-{entries,pages}.tsx`、`tests/e2e/mobile-wheel-pickers.spec.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix: playground `/m7-wheel-pickers` 演示页（picker-view 内联、wheel-picker 字段、date/time、cascader；含表单绑定示例）
- [x] Proof: `tests/e2e/mobile-wheel-pickers.spec.ts`——framed-showcase 1280×900 + CDP 触摸：picker-view 拖拽吸附换行（data-index 断言）、wheel-picker 打开弹层→确认→回显、滚动锁 class；`setViewportSize` 响应式冒烟
- [x] Fix: `docs/components/mobile-native-components-roadmap.md` M7 行就地勘误（状态回写 `done` 于收口时；行内「picker/date-picker/cascader 派生」命名勘误为 wheel- 家族实名 + M7a「transitionend 对齐 emit」勘误为 rAF MomentumAnimator 落定派发）
- [x] Proof: `pnpm check` 除既有 knip xlang 红外零新增红；`check-renderer-definition-fields-only` 对 5 个新定义通过

Exit Criteria:

- [x] 演示页路由可达，e2e 全绿
- [x] `pnpm check` 与 master 基线红集合一致（不新增）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（Round 2；Round 1 fail 1 Major）
- Rounds: 2
- Findings addressed:
  - R1-Major-1 L2.2 基线漂移（input-city 已落地且自带 region-wheel CSS scroll-snap 分支）→ Baseline/Non-Goals/M7d Goal/Phase 4 对账/Follow-ups 五处对准 input-city 现状
  - R1-Minor m1 roadmap M7 行勘误义务入 Phase 5 + Closure Gates；m2 data-index 断言通道钉进 Phase 1/2；m3 Phase 2 Exit 点名 check:i18n-keys / check:renderer-definition-fields-only；m5 命名裁定补 input-date/input-time/input-datetime 近邻避让；m4 执行注意项（validateField 能力判断）保留
  - R2-Minor m-r1/m-r2（Out Of Scope 与 Test Strategy 的 region 旧称措辞）本轮顺手收敛

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复
- [x] 所有 in-scope contract drifts 已收敛（design.md 与实现数值/字段一致；命名裁定记录在案）
- [x] 行为/契约结果已达成（Phase 1–5 Exit Criteria 全勾）
- [x] 必要 focused verification 已完成（内核状态机 + 受控抑制 + 派生边界 + e2e）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步（wheel-picker/design.md 新立 + input-city/L2.6 对账记录 + roadmap M7 行状态与命名勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（对照既有红集合：knip xlang mock-server 一项；零新增）

## Deferred But Adjudicated

### WheelView 越界回弹的实现形态（snapBackOffset 独立函数不设）

- Classification: `out-of-scope improvement`（相对计划原文的函数级交付形态）
- Why Not Blocking Closure: 计划 Proof 项原点名 `snapBackOffset` 纯函数 + rubberband 基准值表；执行中裁定把 rubberband 阻尼实装在 WheelView.onTouchMove 的视觉层（复用 M6 共享 `rubberband(distance, dimension, c)` 函数——「复用 M6 rubberband」的实质声明成立），释放判定始终运行在原始位移上（阻尼 visual-only），越界回弹动画由吸附动画承载。用户可见的「越界阻尼 + 回弹」行为已交付且有其判别测试（picker-view.test.tsx：damped ≈ (200·44·0.15)/(44+0.15·200) ≠ raw 200）；独立纯函数 snapshot 只是形态差异，不构成行为缺口。
- Successor Required: `no`
- Successor Path: —

### 弹层家族测试文件合并（wheel-picker-family.test.tsx）

- Classification: `out-of-scope improvement`（相对计划点名的 4 个独立测试文件）
- Why Not Blocking Closure: Phase 2/3/4 的 Proof 用例合并交付于单文件（wheel-picker/date/time/cascader 共享弹层壳，交互面同构），断言覆盖完整（审计逐条核实）；文件名漂移不构成覆盖缺口。
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 循环滚动（options 首尾相接）与 3D 滚筒视觉（调研 §4.3 nutui）——视觉增强候选
- wheel-picker 异步 options 加载通道（依赖 host 数据面形态，出现真实需求后立项）
- `input-city` region-wheel 分支（CSS scroll-snap）迁移到 picker-view/wheel-cascader rAF 内核——optimization candidate，出现手感一致性需求后立项

## Closure

Status Note: M7a–M7d 全部交付——WheelView 内核（惯性/吸附/rubberband 越界阻尼/受控回写抑制/受控写入打断落定动画）+ wheel-picker 弹出字段（z-index 栈/滚动锁/safe-area/表单写入能力守卫）+ wheel-date-picker/wheel-time-picker 纯配置派生（闰年月长收敛/min-max 钳制）+ wheel-cascader 级联联动（父换选子列重置/确认补全叶子路径）；10 定义注册面（MM-11 门禁演进）、playground /m7-wheel-pickers、CDP 触摸 e2e 4/4。命名裁定（picker/cascader 冲突 → wheel- 家族实名）经 draft review 特别裁决 pass 并落 design.md §2。全量门禁：typecheck/build/lint 绿、test 82/82、check 唯一红 = 既有 knip xlang（master 同红）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），两轮：R1 `issues`（1 Blocker + 5 Major 退回）→ 回修 → R2 `approved`（附 3 项收口 commit 生效条件，全部随本提交载入）
- Evidence: R1 发现 B1（knip 7 符号新红未登记，Closure Gates 虚假勾选）+ M1（受控中途 stop 契约未实现未测）+ M2（snapBackOffset/rubberband 声称与实况漂移）+ M3（roadmap 勘误时序）+ M4（基线注解数值）+ M5（探针残留）；回修后 R2 逐项亲证：7 符号转私有后 knip 仅剩 master 同红既有债、stopMomentum 契约判别测试（rAF 手动队列 + 动画中受控写入 + 取消帧不覆盖）、rubberband 视觉阻尼判别测试（damped ≈24.16 ≠ raw 200）、探针删除（28 文件/321 用例）、基线注解三值订正。审计会话 id（agent_6558bb4a-1a35-41e2-a8b9-b18943e6ecf4）。

Follow-up:

- 见 Non-Blocking Follow-ups 节；除此之外 no remaining plan-owned work
