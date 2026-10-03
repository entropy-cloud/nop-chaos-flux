# 529 flux-renderers-form 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W2）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）；`docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md`（引用本包产出的字段族口径）

## Purpose

把 flux-renderers-form 全部 renderer type 的 DOM 结构收口到契约 6 维（字段族 D6 全部 n-a），核心是确认 **FieldFrame / node-frame-wrapper 注入链**把 `nop-field` + `data-field` + `data-renderer` + `data-cid` 送达每个 wrapped 控件根，裁定 form-body 等包装层的付租问题，产出字段族审计口径（供 W3 引用）并冻结包级契约测试。

## Current Baseline

> **执行发现（2026-10-03，W2 核心交付之一：注入链精化）**：链路确认——wrapped 字段（wrap:true）可见根 = FieldFrame（nop-field，自带 data-field/data-renderer/data-cid）；schema `frameWrap:false` 为作者显式退出帧契约；无 wrap 键的定义走无帧通道。stamp 机制最终态（`packages/flux-react/src/auto-renderer.tsx`）：ensure 级对渲染输出 clone 补章 `data-renderer`——递归下钻 context Provider 链至宿主根（owner 渲染器根常是 Provider 树，form.tsx:525 实证）；组件元素根 clone 后经透传 props 的 ui 组件落到 DOM；`wrap: true` 字段族跳过（帧根自带锚，防双层标记，input-number.test.tsx 实证）；`data-cid` 不由 stamp 补（field-frame 唯一性契约）；WeakMap 记忆化保注册表身份语义。unwrap 模式实例锚豁免为显式退出（卡面登记）。

- 组件清单：form（canvas，`renderers/form-definition.ts:98` 注册）、fieldset（composite）、hidden（leaf，刻意裸 input，`hidden-renderer.tsx:17`）、input-text/email/password、select、textarea、checkbox、switch、radio-group、checkbox-group、button-group-select、input-number、input-date/datetime/time、date-range、input-month/quarter/year、markdown-editor、slider、rating、input-color、user-select、department-select、input-city、input-signature、verification-code（type 注册散布于 `src/renderers/input.tsx:466-688`、`date-renderer-definitions.ts`、`form-atoms-renderer-definitions.ts`、`org/org-renderer-definitions.ts`、`renderers/signature-renderer-definitions.ts`、`renderers/verification-renderer-definitions.ts`，无 signature/ 子目录）。
- FieldFrame 已输出 `nop-field` + `data-field` + `data-renderer`（`packages/flux-react/src/field-frame.tsx:230-243`）并被契约测试冻结。
- `data-cid` 手写仅 3 处（`form.tsx:533`、`fieldset.tsx:73`、`input-choice-renderers.tsx:319`），其余控件依赖 node-frame-wrapper 注入链——链上是否送达**每个** wrapped 根待确认。
- 嫌疑包装层：`renderers/form.tsx:531-541` `section.nop-form` → `form-body` 纯 gap 布局 div（已带 `data-slot="form-body"`，:541）→ 字段自身 wrapper（到真实 input 隔 3-4 层）；checkbox/switch 以 `Label` 为根包原生控件（`input-choice-renderers.tsx:465,517`）；suggest.wrap 按需条件层。
- 盘点未发现本包自带 frame（FieldFrame 走 node-frame-wrapper 契约）。

## Goals

- 全部 type 六维判定落卡；确认注入链完整性（每个 wrapped 控件根可查到 D1 三件套 + `data-field`）
- form-body / Label 根 / suggest.wrap 等包装层逐层归因裁定（fix 或 exempt+理由）
- hidden 裸 input 豁免登记落卡
- 产出字段族审计口径（注入链断言方法、wrapped/unwrap 分支矩阵）写回 checklist，供 W3 引用
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；表单校验行为变更（`docs/architecture/form-validation.md` 域）
- FieldFrame 属性语义变更（`data-field`/`data-renderer` 既有冻结契约不动）
- 其它包的结构问题

## Scope

### In Scope

- `packages/flux-renderers-form/src/` 全部 renderer type 的审计卡、整改、契约测试
- `docs/audits/dom-structure-checklist.md` 的字段族口径补充

### Out Of Scope

- node-frame-wrapper / FieldFrame 的注入机制重构（仅验证与按需补点）
- 校验、事件、数据流行为

## Failure Paths

| 场景 | 触发 | 行为 | 可重试 | 用户可见表现 |
| ---- | ---- | ---- | ------ | ------------ |
| 注入链断点 | 某控件 wrap:false / frameWrap 分支绕过 node-frame-wrapper | 审计卡登记 bypass 分支并裁定该分支标记挂点 | 是 | 无 |

## Test Strategy

档位选择：`建议有测`——注入链完整性（每个 wrapped 根 D1 三件套 + `data-field`）为契约测试必修断言；包装层裁定以卡面 + focused 断言覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡与注入链确认

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 30 张已落盘）；注入链经探针实证（field-frame.tsx:229-243、node-frame-wrapper.tsx、node-renderer-utils.ts:3-20）

- Item Types: `Proof`

- [x] 逐 type 落卡（30 张，六维判定齐全）；wrapped 与 unwrap 分支挂点结论：wrapped → FieldFrame 帧根；unwrap → 显式退出、锚豁免登记
- [x] 注入链确认：wrapped 字段三件套由帧根自带；断点不在链上而在 stamp 架构（W1 ensure 版对 Provider 树/组件元素根失效）——精化为 Provider 链下钻 + 字段族跳过（flux-react，测试 540/540）
- [x] form-body（带 slot）裁定保留；checkbox/switch Label 根裁定保留（可访问性惯例）；suggest 浮层带 input-suggest-* slot
- [x] hidden 裁定：data-renderer 由 stamp 落裸输入，data-cid/data-field 豁免登记

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（30/30）；bypass 分支全部有挂点结论
- [x] 字段族口径写回 `docs/audits/dom-structure-checklist.md`（custom 通道 W2 精化口径 + 字段族 class 命名口径）

### Phase 2 - 整改

Status: completed
Targets: `packages/flux-react/src/auto-renderer.tsx`（stamp 架构精化）；卡面裁定项

- Item Types: `Fix | Proof`

- [x] stamp 架构精化：Provider 链下钻 + 组件元素兜底 + `wrap:true` 字段族跳过 + WeakMap 记忆化——flux-react 新增 `auto-renderer-stamp.test.tsx` 7 用例（含 Provider 链下钻、字段族跳过、forwardRef、Fragment、identity 语义）
- [x] form-body / Label 根 / 日期族 D4 均为裁定保留或 exempt（无 in-scope fix 级包装整改项；卡面留痕）

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言
- [x] 既有 form 包测试无回归（form 953/953、basic 643/643、flux-react 541/541、scheduling 1072/1072、data 1204/1204、form-advanced 1144/1144）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/__tests__/dom-structure-contract.test.tsx`（10 用例）

- Item Types: `Proof`

- [x] 契约测试冻结五通道：wrapped 帧根三件套 + 控件根干净（input-text）、unwrap 豁免（frameWrap:false）、label 帧（checkbox）、group 帧（radio-group）、select 单点 cid、hidden 裸输入 stamp、form/fieldset owner 根、name-control id 钩子、marker 唯一性语义（使用 527 helper）

Exit Criteria:

- [x] 契约测试落位并通过（10/10）
- [x] roadmap W2 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R1（fresh session）
- Verdict: pass-with-minors（4 项 Minor 已修订，达成共识）
- Rounds: 1
- Findings addressed: ①form 注册处修至 form-definition.ts:98 ②注入链确认对象标注 flux-react 包路径 ③signature/verification 定义文件路径修正 ④form-body 已带 data-slot 的事实入基线

## Closure Gates

- [x] 全部 type 审计卡六维收口（30/30）
- [x] 注入链完整性经契约测试证明（10 用例五通道）
- [x] 全部 in-scope fix 已落地并有 focused proof（stamp 架构精化 7 用例）
- [x] 字段族口径已写回 checklist
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（Universal Root Anchors 注入规则已同步 W2 精化）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；form 953/953、flux-react 541/541、basic 643/643）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。注入链确认与精化完成（ensure 级 stamp：Provider 链下钻 + 组件元素兜底 + wrap:true 字段族跳过 + WeakMap 身份语义；data-cid 保持既有通道单点）；30 张审计卡落盘；五通道契约测试冻结（10 用例）；字段族 class 命名与日期族 D4 口径裁定落卡；owner doc 注入规则同步。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_231cb0df）
- Evidence: approved 判定——30/30 卡对齐注册 type、auto-renderer.tsx 六行为逐条在码（Provider 下钻 L76-84、wrap:true 跳过 L115-118 等）、契约测试真断言、renderUnframedAnchored 零残留；审计提出 owner doc 注入规则同步项已收口前完成。
