# 453 事件字段显式声明驱动 + 编译校验强化 + ROUND builtin

> Plan Status: completed
> Last Reviewed: 2026-08-04
> Source: `docs/architecture/field-onchange-event-dispatch.md` §3、`nop-app-erp/docs/analysis/2026-08-03-gen-control-special-cases-and-flux-solution.md`
> Related: `docs/architecture/nested-schema-field-classification.md` §3.5.2、`flux-formula` builtins
> 依赖顺序：本计划（453）→ 454（字段控件统一事件派发）

## Purpose

1. **事件字段显式声明驱动**：废除 `classifyField` 正则 `/^on[A-Z]/` 的启发式合法化——合法事件 = renderer.fields 显式声明（`kind:'event'`）**∪** flux-core 新增 `COMMON_EVENT_FIELDS` 词表。
2. **编译校验报错**：未声明/不在词表的 onXxx（如 AMIS 遗留 `onEvent`、拼写错误事件名）→ 落回 prop → unknown-property 检测（closedModel/strictMode 下报错，带完整 schema 路径），不再静默放行。
3. **ROUND builtin**：flux-formula 补 `ROUND` 函数（ERP view.xml 58 处联动模板依赖 `ROUND(x, 4)`；当前未知函数运行时抛 `Call target is not a function`）。

## Current Baseline

- `fields.ts:44`：`if (/^on[A-Z]/.test(key)) return { key, kind: 'event' };` —— 任何 onXxx 归为 event；`shape-validation-node-fields.ts:221` 对 event kind `continue`，**跳过 unknown-property 检测**（onEvent 被合法化的根因，实证见设计文档 §2.2）。
- renderer 已显式声明 20+ 事件字段（onChange 18 / onClick 14 / onError 9 / onSelectionChange 8 / onLoadError 8 / onClose 8 / onUnmount 7 / onMount 7 / onRefresh 6 / onItemClick 6 等）。
- flux-core 无事件词表（仅 `META_FIELDS`，constants.ts:1）；`LIFECYCLE_KEYS`（onMount/onUnmount）在 fields.ts:27 本地定义。
- `getAcceptedSchemaKeys`（shape-validation-utils.ts:34）只含 type/META/defaultSchema/propSchema/propContracts/fields 键，**不含通用事件词表**（补词表后需同步）。
- flux-formula builtins 无 `ROUND`（有 `$Math.round` 等，`$Math.round(x*10000)/10000` 是等价改写，但不如注册 ROUND 干净）。

## Goals

- `COMMON_EVENT_FIELDS` 词表（flux-core constants.ts 导出）：onChange / onBlur / onFocus / onKeyDown / onKeyUp / onInput（值控件通用事件）
- `classifyField` 声明驱动：正则匹配时查词表/声明 → event；否则落回 prop（unknown-property 路径）
- `getAcceptedSchemaKeys` 补词表（closedModel 下词表事件不误报）
- 编译校验：未声明 onXxx → unknown-property（closedModel/strictMode 下报错）；AMIS 遗留 onEvent → 报错；词表事件 + renderer 声明事件 → 合法（event kind，validateActionShape 校验 action）
- flux-formula `ROUND(value, precision)` builtin（等价 `$Math.round(value * 10^p) / 10^p`）+ 测试
- 全量回归 + owner docs 同步

## Non-Goals

- 不实现字段控件事件派发（计划 454）
- 不改 ERP view.xml（应用层暂缓）
- 不改变 LIFECYCLE_KEYS 的 ignored 处理

## Scope

### In Scope

- `flux-core/src/constants.ts`：`COMMON_EVENT_FIELDS` 词表 + 导出
- `flux-compiler/src/schema-compiler/fields.ts`：classifyField 改造
- `flux-compiler/src/schema-compiler/shape-validation-utils.ts`：getAcceptedSchemaKeys 补词表
- `flux-compiler` 测试：事件声明驱动 + 未声明报错
- `flux-formula`：ROUND builtin + 测试
- 现有 renderer 事件声明审计（依赖词表/声明的 schema 不误报）

### Out of Scope

- `useFormFieldController`/`useFormFieldFromProps` 事件派发（454）
- ERP view.xml 迁移（应用层）

## Execution Plan

### Phase 1 - flux-core `COMMON_EVENT_FIELDS` 词表

Status: completed
Targets: `flux-core/src/constants.ts`、`flux-core/src/index.ts`

- Item Types: `Fix | Proof`

- [x] (Fix) constants.ts 新增 `COMMON_EVENT_FIELDS`（onChange/onBlur/onFocus/onKeyDown/onKeyUp/onInput，与 `META_FIELDS` 同风格）并从包入口导出
- [x] (Proof) 词表内容断言：6 个值控件通用事件齐全

Exit Criteria:

- [x] flux-core 导出 `COMMON_EVENT_FIELDS`，单测断言词表含 6 个值控件通用事件
- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过（Phase 2/3 依赖该公共导出）

### Phase 2 - 编译校验契约测试先行（红）

Status: completed
Targets: `flux-compiler` 测试

- Item Types: `Proof`

- [x] (Proof) 失败测试：未声明 onXxx（如拼写错误事件名）→ unknown-property（带完整 schema 路径）
- [x] (Proof) 失败测试：AMIS 遗留 `onEvent` → unknown-property 报错
- [x] (Proof) 测试：词表事件/声明事件 → event kind 合法 + `validateActionShape` 校验 action 格式

Exit Criteria:

- [x] 上述测试已提交且当前为 red（与现状正则合法化行为不符：未声明 onXxx 不报 unknown-property）

### Phase 3 - classifyField 声明驱动改造（转绿）

Status: completed
Targets: `flux-compiler/src/schema-compiler/fields.ts`

- Item Types: `Fix`

- [x] (Fix) classifyField：onXxx 分支命中 `COMMON_EVENT_FIELDS` → event；否则落回 `DEFAULT_FIELD_RULES[key] ?? prop`（explicit/META/LIFECYCLE 优先级与 ignored 处理不变）
- [x] (Fix) 既有行为回归：显式声明事件、META_FIELDS、LIFECYCLE_KEYS 路径断言保持

Exit Criteria:

- [x] Phase 2 的 unknown-property / onEvent 测试转绿
- [x] 既有 classifyField 行为测试不回归（声明事件 / meta / 生命周期）

### Phase 4 - getAcceptedSchemaKeys 补词表 + renderer 事件声明审计

Status: completed
Targets: `flux-compiler/src/schema-compiler/shape-validation-utils.ts`、全仓 renderer 定义

- Item Types: `Fix | Proof`

- [x] (Fix) getAcceptedSchemaKeys 合并 `COMMON_EVENT_FIELDS`（closedModel 下词表事件不误报）
- [x] (Proof) 全仓 renderer 事件声明审计：依赖事件的 renderer 特有事件（onClick/onSelectionChange/onRowClick/onPageChange 等）已显式声明；缺失的补声明
- [x] (Proof) 审计结论：现有 schema / playground 样例编译 0 新增误报；onEvent 遗留样例（debugger-lab / calendar-demo / calendar-perf-scale-demo）预期报错，标注为非回归

Exit Criteria:

- [x] getAcceptedSchemaKeys 含词表事件的断言通过
- [x] 审计记录完成：无 renderer 特有事件依赖词表之外的隐式合法化；onEvent 样例预期报错已注明

**审计记录（2026-08-04）**：

- 声明审计：`comm(events.onXxx 运行时使用 ∪ declared kind:'event')` 对比全仓 renderer 定义——发现 1 处缺口：`upload-field.tsx` 运行时派发 `onUploadSuccess`/`onUploadError`，但 `uploadFieldRules` 未声明（此前依赖正则隐式合法化）→ 已补声明（`upload-schemas.ts`，input-file/input-image 共用）。其余所有运行时派发事件均有显式声明。
- 词表外事件依赖：0 处。playground/e2e JSON schema 使用的全部 onXxx（onClick/onItemClick/onCreate/onItemDelete/onItemRename/onRefresh/onComplete/onKeyDown 等）均在 COMMON_EVENT_FIELDS ∪ renderer.fields 声明内；`onLabel`/`onSuccess` 等为 prop/action 嵌套数据键，不走 classifyField。
- onEvent 遗留样例：playground 无字面 AMIS `onEvent:` schema 用法（仅 docs 记录 ERP 案例）。calendar-demo / calendar-perf-scale-demo 使用声明的 `onEventClick`/`onEventChange`（HEAD 即已声明，分类不变，非回归）；其 `actionType` 旧格式 action 产生的 `invalid-action-shape` 为既有行为，与本计划无关。debugger-lab-page 无 schema onEvent 用法（仅 React 组件 props）。
- 0 新增误报：分类对既有 schema 全部事件键保持 event kind 或合法 prop，无新 unknown-property。

### Phase 5 - flux-formula `ROUND` builtin

Status: completed
Targets: `flux-formula/src/builtins.ts`、`flux-formula` 测试

- Item Types: `Fix | Proof`

- [x] (Proof) 失败测试：`ROUND(value, precision)` 正/负 precision、整数/小数、与 `$Math.round(x*10^p)/10^p` 等价
- [x] (Fix) 注册 `ROUND` builtin（等价 `$Math.round(value * 10^p) / 10^p`，支持负 precision）

Exit Criteria:

- [x] flux-formula ROUND 测试全过（含负 precision 边界）

### Phase 6 - 依赖包回归 + owner docs 同步

Status: completed
Targets: `flux-runtime`/`flux-react`/`flux-renderers-*`、`docs/architecture/field-onchange-event-dispatch.md`、`docs/architecture/nested-schema-field-classification.md`、`docs/logs/`

- Item Types: `Fix`

- [x] (Fix) 依赖包 focused 回归：依赖词表/声明的 renderer schema 编译无新报错
- [x] (Fix) owner docs 同步：`field-onchange-event-dispatch.md` §3 标 completed；`nested-schema-field-classification.md` §3.5.2「待后续」条目更新为已落地；daily log 记录

Exit Criteria:

- [x] 依赖包回归测试通过（0 新增误报，onEvent 样例预期报错除外）
- [x] owner docs 已同步 live baseline（§3 设计→实现；§3.5.2 待后续→已落地）

## Test Strategy

档位选择：`必须自动化`

理由：classifyField 声明驱动 + unknown-property 报错路径是编译校验的核心回归路径，且改变公共编译契约；`COMMON_EVENT_FIELDS` 与 `ROUND` 均为公开 API。按档位要求，Proof 先于 Fix 落地（Phase 2 红测试先行、Phase 5 测试先行）。

## Draft Review Record

> 2026-08-04 由独立 review session 填写（mission-driver 2026-08-02-204353-mission-driver，fresh session，不复用起草者上下文）。

- Reviewer / Agent: mission-driver 2026-08-02-204353-mission-driver
- Verdict: `pass`
- Rounds: 1
- Findings addressed:
  - Major：`## Phases` 原为裸 bullet 列表，缺 slice `Status` / `Targets` / Item Types / checkbox 执行项 / `Exit Criteria`（guide Minimum Rules 4、19 + 模板）→ 已重构为完整 Phase 块
  - Major：缺 `> Last Reviewed`（Required Status Markers 必填）→ 已补
  - Major：缺 `## Test Strategy` 档位声明（guide「How To Use The Template」第 12 条）→ 已补（必须自动化，Proof 先行）
  - Major：Closure Gates 缺 `pnpm typecheck`/`build`/`lint`/`test` 全量验证项（Minimum Rule 18）→ 已补
  - Major：缺 `## Draft Review Record`（Plan Review Rule）→ 已补
  - Minor：Purpose/Goals「报错」表述收窄为「closedModel/strictMode 下报错」（对齐 shape-validation-node-fields.ts:242-253 的 severity 语义）

## Closure Gates

> **关闭条件**：本 section 所有条目 + 每个 Phase 的 Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处（Minimum Rule 18）；closure-audit 必须由独立子 agent（fresh session）执行，执行 session 不得自审勾选。

- [x] flux-compiler 全量测试通过（含新事件声明驱动测试）
- [x] flux-formula 测试通过（ROUND）
- [x] 依赖词表/声明的 renderer schema 编译无新报错（审计结果 0 误报，onEvent 样例预期报错除外）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（onEvent 报错路径以 Fix 落地，非 Follow-up）
- [x] owner docs 已同步到 live baseline（`field-onchange-event-dispatch.md` §3 completed、`nested-schema-field-classification.md` §3.5.2 待后续条目更新）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: 本计划可关闭——事件字段显式声明驱动 + 编译校验强化（未声明 onXxx / AMIS 遗留 onEvent → unknown-property 报错）+ flux-formula ROUND builtin 已全部落地；六个 Phase 全部 `completed`、Exit Criteria 与 Closure Gates 全勾；全量验证（typecheck/build/lint/test）绿；owner docs 已同步 live baseline。closure-audit 由独立 fresh session 执行并记录证据（执行 session 未自审）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session（plan-453 closure-audit agent，2026-08-04）
- Verdict: `pass`
- Evidence（live repo 独立复核，非仅信任状态标记）：
  - COMMON_EVENT_FIELDS：`flux-core/src/constants.ts:13-21` 恰 6 个值控件事件（onChange/onBlur/onFocus/onKeyDown/onKeyUp/onInput），经 `index.ts` `export * from './constants.js'` 导出；`constants.test.ts:62-85` 断言齐全（含 size=6、排除 onClick/onSelectionChange/onEvent）。flux-core 测试重跑 512/512 绿。
  - classifyField：`fields.ts:44-50` onXxx 分支查 `COMMON_EVENT_FIELDS`，未命中落回 `DEFAULT_FIELD_RULES[key] ?? {kind:'prop'}`；explicit/META_FIELDS/LIFECYCLE_KEYS 优先级不变，LIFECYCLE_KEYS 仍为 `kind:'ignored'`（fields.ts:27,40-42）。
  - getAcceptedSchemaKeys：`shape-validation-utils.ts:41-43` 合并 COMMON_EVENT_FIELDS。
  - 新契约测试：`schema-compiler-event-declaration.test.ts` 13/13 绿（文件级单独重跑确认）：未声明 onXxx（`onChnage`）→ unknown-property 于 `/onChnage` 与嵌套 `/columns/0/onChnage`；AMIS `onEvent` → unknown-property `/onEvent`；词表/声明事件合法 + `invalid-action-shape`（`/onChange`、声明 onClick 缺 action 字段）；META_FIELDS/LIFECYCLE_KEYS/自定义声明事件回归保持；getAcceptedSchemaKeys 词表覆盖断言。flux-compiler 全量重跑 549/549 绿。
  - ROUND：`builtins.ts` 注册（`Math.round(value*10^p)/10^p`，precision 缺省 0，支持负 precision，非有限返回 NaN）；`builtins.test.ts` 5 用例（正/负 precision、缺省、`$Math.round` 等价 6 组、字符串强转/NaN）。flux-formula 全量重跑 202/202 绿。
  - 声明补齐：`upload-schemas.ts` uploadFieldRules 补 onUploadSuccess/onUploadError + InputFileSchema/InputImageSchema 文档；`schema-renderer-registry-debug.test.tsx` openDialogButtonRenderer 补 `{key:'onClick',kind:'event'}`（fixture 8/8 绿；form-advanced 1014/1014 绿）。
  - docs 同步：`field-onchange-event-dispatch.md` 状态行 §3 落地 plan 453 + §3.4 已落地；`nested-schema-field-classification.md` §3.5.2 classifyField 正则条目 待后续→已落地；`docs/logs/2026/08-04.md` 顶部 plan 453 执行记录。
  - 全量验证（独立 fresh --force 重跑，0 cached）：typecheck 31/31、build 31/31、lint 31/31、test 58/58 全绿；lint 仅 1 个既有 warning（flux-renderers-scheduling `gantt-grid.tsx` useVirtualizer React Compiler 不兼容库警告，0 errors，与本计划改动文件无关，非回归）。
  - git status：改动文件与 diff summary 完全一致（13 modified + 1 untracked），src 下无 `.js`/`.d.ts`/`.js.map` 残留。
  - 无 in-scope 静默降级：onEvent 报错路径以 fields.ts Fix 落地；454 事件派发与 ERP view.xml 迁移为显式 Non-Goals。

Follow-up:

- 无 remaining plan-owned work：字段控件事件派发（plan 454）与 ERP view.xml 迁移为显式 Non-Goals / successor ownership，非本 plan debt。
