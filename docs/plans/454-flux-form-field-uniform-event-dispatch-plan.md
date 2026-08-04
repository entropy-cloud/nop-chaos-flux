# 454 字段控件统一事件派发 + 23 调用点迁移

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/architecture/field-onchange-event-dispatch.md` §4/§5、`docs/plans/2026-07-30-field-default-value-and-surface-context-fix.md` Phase 6（deferred）、`nop-app-erp/docs/analysis/2026-08-03-gen-control-special-cases-and-flux-solution.md`
> Related: `docs/architecture/nested-schema-field-classification.md` §3.5.2
> 依赖顺序：依赖 453（事件字段声明驱动，词表事件合法化）→ 本计划（454）

## Purpose

1. **字段控件统一事件派发**：`useFormFieldController` 扩展 `events` 选项，值变化/失焦时统一派发 schema 声明的 `onChange`/`onBlur` action（事件载荷 `{name, value}`，非 undefined）。
2. **统一入口透传**：`useFormFieldFromProps` 透传 `props.events`（签名改 `RendererComponentProps<P>`）。
3. **完成 plan 07-30 Phase 6 遗留迁移**：**19 个 renderer 文件 / 23 个调用点**（flux-renderers-form 12 文件/15 调用点 + flux-renderers-form-advanced 7 文件/8 调用点，live 计数，2026-08-04 grep 复核）统一改走 `useFormFieldFromProps`——此前 deferred（optimization candidate，FromProps 是死代码），本次事件派发赋予实质动机。plan 07-30 时代计数为 22（form 14 + advanced 8，commit e4b4c247），此后 form 新增 button-group-select-renderer 1 个调用点，现为 23。

## Current Baseline

- 字段控件（**flux-renderers-form 12 个 renderer 文件 / 15 个调用点**：button-group-select/checkbox-group/date-range/input-choice(×4)/input-date/input-datetime/input-number/input-time/input/markdown-editor/period/textarea）值变化只走 `useFormFieldController` 的 `handlers.onChange`（`createFieldHandlers` field-handlers.tsx:84-128：setValue + shouldValidateOn('change') 校验），**不派发 `props.events.onChange`**（flux-renderers-form 内 `props.events` 仅 form.tsx 与 test-support.tsx 使用）。
- **flux-renderers-form-advanced 另有 7 个 renderer 文件 / 8 个调用点**使用 `useFormFieldController`（array-editor/condition-builder/editor-renderer/key-value/tag-list/tree-controls(×2)/upload-field），同样无事件派发。
- `useFormFieldFromProps`（field-handlers.tsx:383）：统一入口（封装 controller + defaultValue push），**仅 hidden-renderer 使用**；plan 07-30 Phase 6「迁移 22 个 renderer」Status: deferred，plan 记录"死代码——定义了但无人调用"。
- `props.events` 编译机制已存在：schema 声明事件（453 后 = 词表 ∪ renderer 声明）→ node-renderer-resolved.tsx:243-266（events useMemo）编译为派发函数；renderer 显式调用才派发（button.tsx:219 `props.events.onClick?.(event)` 先例）。
- 现有 `form-input-onchange.test.tsx` 只验证值绑定（store 更新 + 提交），不验证 action 派发。

## Goals

- `useFormFieldController` 扩展 `events` 选项；`wrappedHandlers.onChange`/`onBlur` 统一派发（载荷 `{name, value}`；readOnly gate；错误走 `reportRuntimeHostIssue`；顺序 setValue → events → validate）
- `useFormFieldFromProps` 透传 `events`（签名 `RendererComponentProps<P>`，调用点源码兼容）
- 23 个调用点迁移（plan 07-30 Phase 6 遗留，live 计数）
- 单元测试：onChange action 派发（载荷/顺序）/ onBlur 派发 / 默认值 push 不派发 / readOnly 不派发
- 全量回归（flux-renderers-form + 依赖包）

## Non-Goals

- 不改 flux-compiler 事件声明（453）
- 不改 ERP view.xml（应用层暂缓）
- 不实现"校验通过才触发"选项（`dispatchOn: 'valid-change'` 留作未来，默认直接触发）
- 不改 reaction/watch 系统（action 的 setValue 改他字段不回环触发 onChange，既有职责不变）
- 不改 flux-renderers-form-advanced 控件自身交互逻辑（仅迁移入口到 FromProps）

## Scope

### In Scope

- `flux-renderers-form/src/field-utils/field-handlers.tsx`：controller 扩展 events + wrappedHandlers 包装
- `flux-renderers-form/src/renderers/*.tsx`（12 文件 / 15 调用点）：迁移到 `useFormFieldFromProps`
- `flux-renderers-form-advanced/src/`（7 文件 / 8 调用点：array-editor/condition-builder/editor-renderer/key-value/tag-list/tree-controls/upload-field）：迁移到 `useFormFieldFromProps`（保留原 controller options 经 FromProps options 透传）
- `flux-renderers-form/src/__tests__/`：事件派发测试

### Out of Scope

- flux-compiler 事件声明（453）
- ERP view.xml 迁移（应用层）
- 上述 renderer 文件之外的 `useFormFieldController` 使用（field-handlers.tsx 定义/导出、**tests** 内测试脚手架）

## Failure Paths

| 可测场景编号          | 触发                                            | 行为                                                                                                    | 可重试                     | 用户可见表现                          |
| --------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------- |
| dispatch-action-error | onChange/onBlur 声明的 action 执行抛错          | 值绑定与校验不受影响；错误经 `reportRuntimeHostIssue({level:'warning', phase:'action'})` 上报，不向上抛 | 是（再次输入触发重新派发） | 值照常更新；host console 记录 warning |
| read-only-change      | readOnly 字段触发 onChange/onBlur               | 不 setValue、不派发事件（既有 readOnly gate 扩展至事件）                                                | —                          | 值不变、无联动                        |
| default-push-change   | 挂载时 defaultValue push（useDefaultValuePush） | 直接 setValue 不走 wrappedHandlers，不派发 onChange（避免挂载假联动）                                   | —                          | 无联动触发                            |
| async-adapter-stale   | 异步 adapter 场景 store 写入延后                | action 可能读到旧值（当前 adapter 均同步，无实际影响）                                                  | —                          | 无                                    |

## Test Strategy

本档选择：**必须自动化**（字段事件 → action 派发是 renderer 层公共契约，ERP 联动（purchase quantity→amount）依赖它；Proof 项先行——Phase 1 红、Phase 2 绿）

## Execution Plan

### Phase 1 - 事件派发契约测试先行（红）

Status: completed
Targets: `flux-renderers-form/src/__tests__/form-field-handlers.test.tsx`（或同目录新增）

- Item Types: `Proof`

- [x] 新增 controller 事件派发测试（针对当前实现为红）：onChange action 派发 + 载荷 `{name, value}`（非 undefined）；onBlur 派发；setValue → events → validate 顺序；默认值 push 不派发；readOnly 不派发；action 抛错走 reportRuntimeHostIssue 且值绑定不受影响

Exit Criteria:

- [x] 上述测试用例已写入且针对当前代码（无 events 选项）失败

### Phase 2 - controller 扩展 events + FromProps 透传（转绿）

Status: completed
Targets: `flux-renderers-form/src/field-utils/field-handlers.tsx`

- Item Types: `Fix`

- [x] `useFormFieldController` 增加 `events` 选项，包装 `wrappedHandlers.onChange`/`onBlur`（载荷 `{name, value}`；readOnly gate；dispatchFieldEvent 错误走 `reportRuntimeHostIssue`；顺序 setValue → events → validate）
- [x] `useFormFieldFromProps` 签名改为 `RendererComponentProps<P>`，透传 `props.events`（hidden-renderer 等既有调用点源码兼容，无需改动）

Exit Criteria:

- [x] Phase 1 红测试全部转绿（含载荷/顺序/默认值/readOnly/错误路径）
- [x] flux-renderers-form 局部 typecheck 通过；hidden-renderer 调用点无源码改动仍编译

### Phase 3 - 23 个调用点迁移

Status: completed
Targets: `flux-renderers-form/src/renderers/*.tsx`（12 文件/15 调用点）、`flux-renderers-form-advanced/src/*.tsx`（7 文件/8 调用点）

- Item Types: `Fix`

- [x] 12 个 flux-renderers-form renderer 文件迁移到 `useFormFieldFromProps`（保留原 controller options）
- [x] 7 个 flux-renderers-form-advanced renderer 文件迁移到 `useFormFieldFromProps`（保留原 controller options）
- [x] grep 验证：两包 renderer 源码中 `useFormFieldController(` 调用零残留（仅 field-handlers.tsx 定义/导出与 **tests** 脚手架）

Exit Criteria:

- [x] 迁移最终态必须是全部目标调用点走 `useFormFieldFromProps`（"先传 events 验证、再全量 FromProps"仅是分批执行策略，不是终态）
- [x] grep 复核无遗漏调用点（计数 = 0）

### Phase 4 - 全量回归 + owner docs 同步

Status: completed
Targets: `flux-renderers-form`、`flux-renderers-form-advanced`、`docs/architecture/field-onchange-event-dispatch.md`、`docs/plans/2026-07-30-field-default-value-and-surface-context-fix.md`

- Item Types: `Fix | Proof`

- [x] flux-renderers-form + flux-renderers-form-advanced 全量测试通过（含新事件派发测试）
- [x] 依赖包（flux-react 等）回归通过
- [x] `field-onchange-event-dispatch.md` §4/§5 由"设计（待实现）"改写为最终设计状态（删除演进叙事；§2.3/§2.4 计数口径修正为 23 调用点/19 文件；§5 步骤 1-2 属 453，标 453 归属）
- [x] plan 07-30 Phase 6 标记 completed（follow-up 关闭）
- [x] `docs/logs/` 对应日期条目更新

Exit Criteria:

- [x] 两包测试全绿；设计文档状态不再是"待实现"；plan 07-30 Phase 6 `Status: completed`

## Draft Review Record

- Reviewer / Agent: mission-driver review（fresh session，2026-08-04）
- Verdict: revised
- Rounds: 1
- Findings addressed: 调用点计数矛盾（22 vs 15）→ live 复核后统一为 19 文件/23 调用点并注明历史口径；补 `Last Reviewed`/`Test Strategy`/`Draft Review Record`/`Failure Paths`/`Closure` 段；补每 phase `Status`/`Targets`/`Item Types`/`Exit Criteria`；测试先行（红→绿）；"或先传 events"终态歧义→明确最终态全部 FromProps；Closure Gates 补 `pnpm typecheck`/`build`/`lint`/`test`；owner-doc 同步改为终态改写（Rule 14）并修正 design doc 计数口径

## Closure Gates

- [x] flux-renderers-form 全量测试通过（含新事件派发测试）
- [x] 依赖包（form-advanced 等）回归通过
- [x] 23 个调用点迁移完成（grep 验证两包 renderer 源码 `useFormFieldController(` 零残留）
- [x] plan 07-30 Phase 6 标记 completed（follow-up 关闭）
- [x] 独立子 agent closure-audit 完成并记录证据（执行 session 不得自审勾选本项）
- [x] owner docs 同步（设计文档终态改写 + docs/logs/ 收口）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 异步 adapter 下 action 读到旧值

- Classification: `watch-only residual`
- Why Not Blocking Closure: 当前 adapter 均同步（design doc §4.2 边界），store 写入延后时 action 读到旧值无实际影响
- Successor Required: `no`

## Non-Blocking Follow-ups

- ERP 应用层验证：purchase 弹窗 quantity → amount 联动重算（e2e，属 `nop-app-erp` 仓库，计划外）
- `dispatchOn: 'valid-change'` 选项（默认直接触发，留作未来）

## Closure

Status Note: 字段控件统一事件派发已落地（`useFormFieldController` events 选项 + wrappedHandlers onChange/onBlur 派发 `{name, value}` 载荷 + readOnly gate + 错误走 reportRuntimeHostIssue）；`useFormFieldFromProps` 签名改 `RendererComponentProps<P>` 透传 events；19 文件/23 调用点全部迁移（两包 renderer 源码 `useFormFieldController(` 零残留）；测试先行红→绿（form-field-event-dispatch.test.tsx 9 用例，含 schema 级端到端 onChange/onBlur 派发）；plan 07-30 Phase 6 deferred 关闭；owner docs 终态改写；全量验证 typecheck/build/lint/test 全绿（31/31/31/58）。应用层（ERP view.xml）与 `dispatchOn: 'valid-change'` 为显式 Non-Goals / follow-up，未静默降级任何 in-scope 项。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent closure-audit（task `ses_033d56af1ffeaTihomakE90A5S`，执行 session 之外）
- Evidence: verdict `approved`；逐项核对 A（guide 合规）/B（plan 文本一致性：四 Phase completed + 全部 [x]、无残留 [ ]）/C（live repo 落地：field-handlers.tsx:388-489 events 选项 + FromProps 透传、两包调用点 19 文件/23 处、adapter/areValuesEqual 经 options 保留、`useFormFieldController(` renderer 源码零残留）/D（docs 一致性：design doc 终态「最终设计（已落地）」+ 19/23 计数、plan 07-30 Phase 6 completed、daily log 收口）/E（deferred 诚实性：async-adapter-stale 为 watch-only residual，adapter 均同步）/F（接口↔语义：审计自跑 form 包 723/723 含事件派发测试，行为由断言证明非仅 API 存在）。无 Blocker。

Follow-up:

- ERP 应用层验证：purchase 弹窗 quantity → amount 联动重算（e2e，属 `nop-app-erp` 仓库，计划外）
- `dispatchOn: 'valid-change'` 选项（默认直接触发，留作未来）
