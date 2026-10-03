# 529 flux-renderers-form 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W2）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）；`docs/plans/2026-10-03-530-dom-structure-form-advanced-plan.md`（引用本包产出的字段族口径）

## Purpose

把 flux-renderers-form 全部 renderer type 的 DOM 结构收口到契约 6 维（字段族 D6 全部 n-a），核心是确认 **FieldFrame / node-frame-wrapper 注入链**把 `nop-field` + `data-field` + `data-renderer` + `data-cid` 送达每个 wrapped 控件根，裁定 form-body 等包装层的付租问题，产出字段族审计口径（供 W3 引用）并冻结包级契约测试。

## Current Baseline

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

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 ~33 张）；`packages/flux-react/src/field-frame.tsx`、`packages/flux-react/src/node-frame-wrapper.tsx` 只读确认

- Item Types: `Proof`

- [ ] 逐 type 落卡；wrapped 与 unwrap（`wrap:false`）分支分别记录标记挂点
- [ ] 确认 node-frame-wrapper 链把 `data-cid`/`data-renderer` 送达全部 wrapped 控件根（发现断点记 fix）
- [ ] form-body（已有 slot，裁定该层去留）/ Label 根 / suggest.wrap 逐层归因裁定
- [ ] hidden 豁免登记

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全；bypass 分支全部有挂点结论
- [ ] 字段族口径写回 `docs/audits/dom-structure-checklist.md`

### Phase 2 - 整改

Status: planned
Targets: 卡面 fix 项（预期涉及 `renderers/form.tsx`、`input-choice-renderers.tsx`）

- Item Types: `Fix | Proof`

- [ ] 注入链断点补点（依赖 527 Phase 1）
- [ ] form-body 等被裁为 fix 的包装层整改（合并/加 `data-slot`/去层）
- [ ] 逐项 test-first 落地

Exit Criteria:

- [ ] 每个 fix 项落地且有 focused 断言；既有 form 包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: `src/__tests__/dom-structure` 契约测试（该包为 `__tests__` 多数派）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type 的注入链完整性断言 + 本包登记的关键 D3/D4 项（使用 527 helper，模式参照既有 `field-controls-dom-contract.test.tsx`）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W2 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R1（fresh session）
- Verdict: pass-with-minors（4 项 Minor 已修订，达成共识）
- Rounds: 1
- Findings addressed: ①form 注册处修至 form-definition.ts:98 ②注入链确认对象标注 flux-react 包路径 ③signature/verification 定义文件路径修正 ④form-body 已带 data-slot 的事实入基线

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] 注入链完整性经契约测试证明
- [ ] 全部 in-scope fix 已落地并有 focused proof
- [ ] 字段族口径已写回 checklist
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 同步核对完成
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 待收口

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 见 Non-Blocking Follow-ups
