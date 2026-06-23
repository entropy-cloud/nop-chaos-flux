# W2b 日期族（input-date/input-datetime/input-time/date-range）

> Plan Status: completed
> Last Reviewed: 2026-06-24
> Source: `docs/components/roadmap.md` W2b；`docs/components/{input-date,input-datetime,input-time,date-range}/design.md`（契约已立约）
> Related: 解锁 W3d（高级输入族，roadmap 依赖图 `W2b → W3d`）→ 进而解锁 W4c（复合表单组）。本 plan 落地共享日期底层，W3d 的 `input-month`/`input-quarter`/`input-year` 复用该底层。
> Mission: components
> Work Item: W2b

## Purpose

把 roadmap W2b（日期族：`input-date`/`input-datetime`/`input-time`/`date-range`）从"design.md 已立约、代码 0%"推进到"4 个 renderer 实现 + 共享日期底层 + 注册 + playground + e2e + roadmap W2b 标 done"。本 plan 是一个 owner plan 覆盖同一结果面（日期时间字段家族），核心 closure 单元是**首次建立共享日期格式化/解析/校验底层**（4 个组件复用），这是独立于单个字段适配的高风险一致性问题，故合成一个 plan（遵循 guide Rule 26：组件级能力族优先合成 owner plan）。

本 plan 落地后解锁 W3d（`input-month`/`input-quarter`/`input-year` 复用日期底层），进而解锁 W4c（`combo`/`picker`/`transfer`/`input-table`）。

## Current Baseline

> 截至 2026-06-24 的 live repo 核查结论（read-only）：

- **目标包已存在**：`flux-renderers-form` 已落地（已注册 input-text/input-number/select 等基础字段），alias+project ref 就绪——4 个日期字段直接追加，**无新包工作**。
- **4 个 renderer 均未实现**：`packages/flux-renderers-form/src/renderers/` 无 date/time 相关 renderer；`amis-baseline-matrix.md` L153-156 四组件均标 `targetContract`/wave 2。
- **日期底层已就绪（零新依赖）**：`@nop-chaos/ui` 已依赖 `react-day-picker@^9.14.0`（`packages/ui/package.json`）并导出 `Calendar`（`packages/ui/src/components/ui/calendar.tsx`）。4 个字段复用 `react-day-picker` + ui `Calendar`，**无需引入 date-fns/dayjs/luxon 等新第三方库**（roadmap Reuse "共享日期格式化/校验底层"即指在本包内建立薄 helper 层，不引入重型日期库）。
- **field bridge 模式可复用**：`input-text`/`input-number`（form 包已落地）提供标准字段写回路径（`useFormFieldController`→`handlers.onChange`→scope write，`packages/flux-renderers-form/src/renderers/input.tsx`）。日期字段遵循同一 field frame（`wrap:true`，design §6 复用统一 field frame）。注：`valueFormat`/`displayFormat` 是日期族**新引入**的字段惯例（design §4 列为日期字段），非既有字段；本 plan Phase 1 建立其 format/parse 转换。
- **date-range 是 canonical range owner**：design §1/§6 明确 `date-range` 统一承接 `input-date-range`/`input-datetime-range`/`input-time-range` 三个历史 type，用 `rangeKind`（`date`/`datetime`/`time`）区分——**不保留三个并行 canonical type**（design §12 最大风险：防 contract 分裂）。
- **owner-doc 无 drift**：4 份 design.md §3 均写 `flux-renderers-form`，与 roadmap 一致（区别于 W2a 的 3 处 drift）。
- **字段分类已立约**（design §5）：4 组件的 `label` 为 `value-or-region`，其余格式/限制字段为 `value`，`onChange` 为 `event`。

## Goals

- **建立共享日期底层**：纯 helper（format/parse/validate + valueFormat↔displayFormat 转换 + min/max 约束校验），4 个字段复用，集中测试。
- `input-date`：单值日期字段（`valueFormat`/`displayFormat`/`minDate`/`maxDate`/`utc`/`clearable`/`required`），复用 `react-day-picker` + ui `Calendar`，`nop-input-date` marker。
- `input-datetime`：单值日期时间字段（日期 + 时间精度），复用共享底层，`nop-input-datetime` marker。
- `input-time`：单值时间字段（`valueFormat`/`displayFormat`/`minTime`/`maxTime`/`required`），`nop-input-time` marker。
- `date-range`：canonical range owner（`rangeKind`: `date`/`datetime`/`time` + `valueFormat`/`displayFormat`/`delimiter`/`minDate`/`maxDate`/`utc`/`shortcuts`），**一个 type 统一承接三种 range**，不分裂成三个 type，`nop-date-range` marker。
- 4 个 `RendererDefinition` 合入 `flux-renderers-form` 注册；playground 演示页 + e2e（程序化断言，非截图）。
- roadmap W2b 标 done + amis-baseline-matrix 4 组件标 runtime。

## Non-Goals

- 不引入 date-fns/dayjs/luxon 等重型日期库（复用既有 `react-day-picker` + 原生 `Intl`/`Date`）。
- 不实现时区选择器/时区转换 UI（`utc` 仅控制存储格式，非时区切换器）。
- 不实现复杂排班/多值日期集合（design §1：单值字段职责）。
- 不把 `date-range` 拆成三个 canonical type（design §1/§12 明确收敛为一个）。
- 不实现 W3d 的周期字段（input-month/quarter/year 复用本 plan 底层，但实现归 W3d）。
- 不实现 W3d 的富文本/上传族。

## Scope

### In Scope

- 共享日期底层 helper（format/parse/validate + valueFormat↔displayFormat + min/max 约束）+ focused 单测。
- 4 个 renderer（input-date/input-datetime/input-time/date-range）实现，遵循 `RendererComponentProps` + 标准 field bridge（复用 input-text 写回路径）。
- 4 个 `RendererDefinition` 合入 `form-renderer-definitions` 注册；playground 演示页 + e2e。
- date-range 的 `rangeKind` 三态统一（date/datetime/time），`delimiter` 范围值归一化。
- roadmap W2b 标 done + amis-baseline-matrix 4 组件 `targetContract→runtime`。

### Out Of Scope

- date-fns/dayjs 引入与迁移。
- 时区选择器 UI。
- W3d 周期字段（month/quarter/year）。
- W3d 上传/富文本族。
- 排班/多值日期集合。

## Failure Paths

> 日期字段有格式解析、范围归一化、约束校验可测失败路径。

| 场景编号           | 触发                         | 行为                                             | 可重试 | 用户可见表现      |
| ------------------ | ---------------------------- | ------------------------------------------------ | ------ | ----------------- |
| date-format-parse  | `valueFormat` 与存储值不匹配 | 解析失败回退到 null/原值，不抛错；校验标 invalid | 否     | 字段标红/校验错误 |
| date-min-max       | 选择超出 `minDate`/`maxDate` | 禁用超界日期 + 校验拦截                          | 否     | 超界日不可选      |
| date-utc-roundtrip | `utc:true` 存读往返          | 存储为 UTC 字符串，显示按本地，往返一致          | 否     | 无时区漂移        |
| time-format        | `input-time` 时间格式解析    | `valueFormat`↔`displayFormat` 转换正确           | 否     | 显示/存储一致     |
| range-kind-date    | `rangeKind:'date'`           | 只选日期范围，delimiter 拼接起止                 | 否     | 日期范围值        |
| range-kind-time    | `rangeKind:'time'`           | 只选时间范围                                     | 否     | 时间范围值        |
| range-normalize    | 起止顺序颠倒（start>end）    | 归一化（交换）或校验拦截                         | 否     | 不产生非法范围    |
| field-writeback    | 选择变更                     | 经标准 field bridge 写回 scope + 触发 `onChange` | 否     | scope 值更新      |

## Test Strategy

本档选择：**建议有测**

理由：4 个组件均为一般表单字段，无鉴权/对外 API 契约风险。按 tier 表属"建议有测"。但日期底层（format/parse/validate/utc 往返）是一致性高风险点，必须 focused 单测覆盖（不仅是字段不报错）。focused 单测覆盖：底层 helper 的 format/parse 往返、min/max 约束、utc 往返、date-range 的 rangeKind 三态 + delimiter 归一化 + 起止顺序归一。e2e 覆盖 playground 演示页渲染 + 选择 + 写回 scope（程序化断言，非截图）。

## Execution Plan

### Phase 1 - 共享日期底层（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/date/`（新建：`date-utils.ts` + colocated `date-utils.test.ts`）

- Item Types: `Proof` + `Fix`

- [x] **Proof**：focused 单测——format/parse 往返（多种 `valueFormat`/`displayFormat` 组合）；min/max 约束校验（超界拒绝）；`utc:true` 存读往返一致（无时区漂移）；解析失败回退（不抛错）。
- [x] **Fix**：`date-utils.ts`——纯 helper（基于原生 `Date` + `Intl` + `react-day-picker` 既有 date utils，不引入新库）：`formatDate(value, fmt)`/`parseDate(str, fmt)`/`isWithinRange(date, min, max)`/`toUtc(value)`/`fromUtc(value)`；valueFormat↔displayFormat 转换；range 起止归一化（`normalizeRange`，start>end 时交换或拒绝）。

Exit Criteria:

- [x] 共享日期底层 helper 落地，focused 单测通过（验证 format/parse 往返 + 约束 + utc 往返，非仅不报错）。
- [x] 无新日期库引入（grep 确认无 date-fns/dayjs/luxon 新增依赖）。

### Phase 2 - `input-date` + `input-datetime` + `input-time`（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/{input-date,input-datetime,input-time}-renderer.tsx`（新建，colocated `*.test.tsx`）

- Item Types: `Proof` + `Fix`

- [x] **Proof**：input-date focused 单测——选择写回 scope + `onChange`；min/max 超界禁用；utc 往返；clearable 清空；displayFormat 显示。
- [x] **Fix**：`input-date-renderer.tsx`——`nop-input-date` marker；复用 ui `Calendar`/`react-day-picker`；消费 `valueFormat`/`displayFormat`/`minDate`/`maxDate`/`utc`/`clearable`/`required`；经共享 `date-utils` format/parse；标准 field bridge（复用 input-text 写回路径，`label` 复用 field frame）。
- [x] **Fix**：`input-datetime-renderer.tsx`——`nop-input-datetime` marker；日期 + 时间精度组合（复用 input-date 底层 + 时间输入）；`valueFormat` 含时间部分。
- [x] **Proof**：input-time focused 单测——时间 format/parse（`valueFormat`↔`displayFormat`）；minTime/maxTime 约束；写回 scope。
- [x] **Fix**：`input-time-renderer.tsx`——`nop-input-time` marker；单值时间字段（一天内时间点）；`minTime`/`maxTime` 约束；标准 field bridge。

Exit Criteria:

- [x] 3 个单值字段实现复用共享底层 + 标准 field bridge，focused 单测通过（验证 format/parse + 约束 + 写回）。
- [x] 3 个组件根节点 marker 齐全（`nop-input-date`/`nop-input-datetime`/`nop-input-time`），只使用 `@nop-chaos/ui`（无裸 HTML）。

### Phase 3 - `date-range`（Proof + Fix）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/date-range-renderer.tsx`（新建，colocated `*.test.tsx`）；`src/definitions.ts`（既有，导出 `formRendererDefinitions` 数组 + `registerFormRenderers`）

- Item Types: `Proof` + `Fix`

- [x] **Proof**：date-range focused 单测——`rangeKind:'date'`/`'datetime'`/`'time'` 三态范围选择；`delimiter` 起止拼接；起止顺序颠倒归一化（`normalizeRange`）；min/max 约束；写回 scope + `onChange`。
- [x] **Fix**：`date-range-renderer.tsx`——`nop-date-range` marker；canonical range owner（**一个 type 统一 date/datetime/time**，经 `rangeKind` 切换，不分裂三个 type）；复用共享 `date-utils`（`normalizeRange`）；`valueFormat`/`displayFormat`/`delimiter`/`minDate`/`maxDate`/`utc`/`shortcuts`；标准 field bridge。
- [x] **Fix**：`definitions.ts` 增 4 个 `RendererDefinition`（category `form`；4 组件 label value-or-region + 格式/限制字段 value + onChange event；date-range 含 rangeKind value），随 `registerFormRenderers` 注册。

Exit Criteria:

- [x] date-range 实现 rangeKind 三态统一（grep 确认无 `input-date-range`/`input-datetime-range`/`input-time-range` 三个并行 type 残留），focused 单测通过。
- [x] 4 个 definition 合入注册。

### Phase 4 - playground + e2e + owner-doc 同步

Status: completed
Targets: `apps/playground/src/`；`tests/e2e/`；`docs/components/roadmap.md`；`docs/components/amis-baseline-matrix.md`

- Item Types: `Fix` + `Proof` + `Follow-up`

- [x] **Fix**：playground 增 W2b 演示页（input-date 限制/utc 往返、input-datetime、input-time 格式、date-range 三 rangeKind + shortcuts）并注册路由（route-model.ts/App.tsx）；`registerFormRenderers` 已接入 playground（确认）。
- [x] **Proof**：e2e（`tests/e2e/w2b-date-family.spec.ts`）——程序化断言：input-date 选择写回 scope（`page.evaluate` 读 scope）、min/max 超界禁用、date-range rangeKind 切换、delimiter 拼接。**不靠截图**（遵循 AGENTS.md）。
- [x] **Follow-up**：roadmap W2b 标 done（closure 阶段）+ amis-baseline-matrix L153-156 四组件 `targetContract→runtime`（4 份 design.md §3 无 drift，无需改归属）。

Exit Criteria:

- [x] 4 个 definition 合入注册，playground 可渲染 4 个 type（`input-date`/`input-datetime`/`input-time`/`date-range`）。
- [x] playground W2b 演示页可访问、4 组件交互可用。
- [x] e2e 通过（程序化断言，非截图）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: `ses_10a016055ffecLgp4OYfqD13TE`（fresh session，独立初评）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major；4 维度全 pass）
- Rounds: 1
- Findings addressed（Minor，已采纳修正）:
  - definitions 文件名由 `form-renderer-definitions.ts` 更正为实际的 `src/definitions.ts`（导出 `formRendererDefinitions` + `registerFormRenderers`，Phase 3 Targets/Fix 已修正）。
  - Current Baseline 中 `valueFormat`/`displayFormat` 原称既有"字段惯例"，核实为日期族**新引入**惯例（form 包无既有用法），已修正措辞并指向 Phase 1 建立；field bridge 复用（`useFormFieldController`→`handlers.onChange`）经 `input.tsx:235/256/282/379` 验证准确。
- 引用准确性：全部经 live repo 核对通过（react-day-picker@^9.14.0 已在 ui；无 date-fns/dayjs/luxon 新依赖；4 份 design.md §3/§5/§10 无 drift；date-range 为 canonical range owner；roadmap `W2b→W3d→W4c` 依赖图属实；matrix L153-156 = targetContract/wave 2）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后才能 `Plan Status: completed`。全量验证归此处（plan 收口跑一次），非每 Phase 默认项。

- [x] 共享日期底层 helper 落地并集中测试（format/parse/validate/utc 往返）。
- [x] 4 个 W2b renderer 实现并注册，遵循 `RendererComponentProps` + 标准 field bridge。
- [x] **date-range contract 不分裂**：一个 type 统一 date/datetime/time（grep 确认无三个并行 canonical type）。
- [x] 无新日期库引入（grep 确认无 date-fns/dayjs/luxon 新增依赖）。
- [x] 4 个 focused 单测 + e2e 通过（验证行为，非仅不报错）。
- [x] roadmap W2b 标 done + amis-baseline-matrix 4 组件标 runtime。
- [x] 不存在被静默降级到 deferred 的 in-scope 项（尤其 date-range contract 收敛、共享底层不得降级）。
- [x] 受影响的 owner docs 已同步到 live baseline（4 份 design.md §3 无 drift，无需改归属）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 无。本 plan scope 聚焦日期族单一结果面，无确认的 live defect / contract drift 需延期（4 份 design.md §3 无 drift）。

## Non-Blocking Follow-ups

- 时区选择器 UI（`utc` 仅控制存储格式，非完整时区切换器）——out-of-scope improvement。
- W3d 周期字段（input-month/quarter/year）复用本 plan 共享底层的评估——watch-only residual（归 W3d）。
- date-range 的 `shortcuts` 预设库扩展（首版支持字段传入 shortcuts）——optimization candidate。

## Closure

Status Note: 完成。4 个 W2b renderer（input-date/input-datetime/input-time/date-range）+ 共享日期底层（token format/parse + min/max + utc 往返 + calendar↔UTC 时区桥接 + range 归一化）落地于 `flux-renderers-form`，零重型日期库依赖；`date-range` 以 `rangeKind` 统一 date/datetime/time 三态（grep 确认无并行 canonical type）；roadmap W2b→done、amis-baseline-matrix 4 组件→runtime。

Closure Audit Evidence:

- Auditor / Agent: `ses_109822590ffe9VFWdPrRe15kFz`（fresh session，独立 closure-audit）
- Verdict: `pass`（零失败 gate）
- Evidence: 独立复核 live repo——`date-utils.test.ts` 30 passed；4 个 renderer focused 单测 23 passed；W2b e2e 6 passed（程序化断言，非截图）；`pnpm typecheck` 55/55、`pnpm build` 29/29、`pnpm lint` 29/29（0 error）、`pnpm test` 29 包全绿（form 468 / playground 88）；date-range contract 未分裂（grep 仅命中自身 guard 测试）；无 date-fns/dayjs/luxon 新依赖；4 份 design.md §3 无 drift。

Follow-up:

- 时区选择器 UI（`utc` 仅控制存储格式，非完整时区切换器）——out-of-scope improvement。
- W3d 周期字段（input-month/quarter/year）复用本 plan 共享底层的评估——watch-only residual（归 W3d）。
- date-range 的 `shortcuts` 预设库扩展（首版支持字段传入 shortcuts）——optimization candidate。
