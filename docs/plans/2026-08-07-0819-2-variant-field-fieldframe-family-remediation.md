# 02 variant-field/FieldFrame 家族修复

> Plan Status: completed（draft → active：独立子 agent 两轮审查，首轮 revised（1 Major）已修订解决，复检 pass，零 Blocker/零 Major，共识达成；2026-08-07 执行完毕，2 Phase 全 completed，roadmap 三行 ❌→✅，closure-audit 由独立 fresh session 执行，证据见 Closure 节）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（12-01/12-02/12-03）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog
> Related: `docs/plans/2026-08-07-0421-2-scope-subscription-gating-and-state-sync.md`（同批审计执行先例）
> Mission: component-audit
> Work Item: variant-field/FieldFrame 家族（12-01/12-02/12-03）

## Purpose

修复 variant-field/FieldFrame 家族三条 open P2：12-01（label region 形式静默丢失，confirmed contract gap）、12-02（fieldframe-bypass allowlist 登记路径过期）、12-03（`field-frame.md` 接口文档缺 `renderer` prop）。收口后 roadmap Follow-up Backlog 三行翻转 `[x]`。

## Current Baseline

- **12-01（confirmed contract gap，live 复核）**：
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:222` `label={schemaProps.label as React.ReactNode}`——仅读 props 通道的值形式。
  - 编译器 `node-compiler-helpers.ts:270` 对 `label: { type: 'text' }` fragment 提取到 `regions.label` 并用 region key 替换 `props.label` → FieldFrame 拿到占位串或 undefined → label 静默不渲染。
  - 同渲染器 hint/description 走 `resolveRendererSlotContent(props, 'hint')`（`variant-field.tsx:72-75`）正确；`detail-view.tsx:52` 用 `resolveFieldLabelContent`（`flux-renderers-form/src/field-utils/field-reading.tsx:38`）正确处理；`formLabelFieldRule`（`field-reading.tsx:10-14`）声明 label 为 value-or-region。
  - `variant-field-owner-contract.test.tsx` 既有用例仅覆盖字符串 label，且 harness 有 mock 链（`:19` FieldFrame mock 仅渲染 children、`:37/:65-68` resolve 通道 mock 返回 undefined）——green 可观测需要同步改 mock。
  - 包边界已核实：`@nop-chaos/flux-renderers-form` 是 `flux-renderers-form-advanced` 既有依赖（package.json:24），且 `detail-view.tsx:19-23`、`variant-field.tsx:17` 已有同包跨包导入先例——导入 `resolveFieldLabelContent` 不产生新依赖边。
- **12-02（live 复核）**：`scripts/audit/rules.mjs:16-18` `documentedFieldFrameBypassAllowlist` 登记 `variant-field.tsx`，但实际 FieldFrame 使用位于 `variant-field-view.tsx:12,220,242` → `check:audit-fieldframe-bypasses` 持续输出 3 处候选命中（informational，非 gate 失败）。
- **12-03（live 复核）**：`packages/flux-react/src/field-frame.tsx:47` `renderer?: string`（:82 解构、:227 `data-renderer={renderer || undefined}`）；`docs/architecture/field-frame.md:97-116` 接口列表未列出该 prop。
- **roadmap backlog 现状**：`docs/backlog/component-audit-roadmap.md` Follow-up Backlog `12-01`/`12-02`/`12-03` 三行均为 `[ ]`。

## Goals

- 修复 12-01：variant-field label 支持 region 形式（`resolveFieldLabelContent(props)` 或等价通道），fragment label 正常渲染，补 region label 测试用例。
- 修复 12-02：allowlist 登记路径更新为 `variant-field-view.tsx`（或双登记），`check:audit-fieldframe-bypasses` 零候选命中。
- 修复 12-03：`field-frame.md` 接口文档补 `renderer?: string`（data-renderer debugger 锚点说明）。

## Non-Goals

- 不迁移 variant-field 到其他 FieldFrame 路径（已裁定为手动 FieldFrame owner，保持既有架构选择）。
- 不处理 backlog 其余开放项（13-02/18-01/18-02/O-P2-2/10-xx 归其他计划轮次）。
- 不改 FieldFrame 实现语义（仅文档补项）。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:222`（12-01）
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx`（12-01 region label 测试）
- `scripts/audit/rules.mjs:16-18`（12-02）
- `docs/architecture/field-frame.md:97-116`（12-03）

### Out Of Scope

- FieldFrame 其他接口缺项（仅 12-03 登记项）。
- `docs/backlog/component-audit-roadmap.md` 其余 open backlog 行。

## Failure Paths

| 场景                   | 触发                                                                          | 行为                           | 可重试 | 用户可见表现        |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------ | ------ | ------------------- |
| 12-01 region label     | schema 按 field-metadata-slot-modeling Pattern 3 写 `label: { type: 'text' }` | 渲染器解析 region label 并渲染 | —      | 字段 label 正常显示 |
| 12-01 值 label（回归） | 既有字符串 label schema                                                       | 行为不变                       | —      | label 正常显示      |
| 12-02 工具             | 跑 `pnpm check:audit-fieldframe-bypasses`                                     | 零候选命中                     | —      | 无输出/exit 0       |

## Test Strategy

本档选择：`必须自动化`（12-01 为已确认 contract gap，测试先行；12-02 由门禁脚本验证）。

## Execution Plan

### Phase 1 - Proof：region label 测试先红

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx`

- Item Types: `Proof`

- [x] 新增 region label 测试用例：`label: { type: 'text', text: '自定义' }` 形式下 variant-field 渲染 label 文本（先红：当前 `schemaProps.label` 被编译器替换为 region key → 断言失败）。
- [x] **red 用例需手工模拟编译产物**：单测不跑编译器（编译管线行为 `node-compiler-helpers.ts:270` 在单测外），red 用例必须直接构造 `props.label = region key 占位串 + regions.label render handle` 模拟编译后输入。
- [x] **测试 harness mock 更新与 green 可观测性**：`variant-field-owner-contract.test.tsx:19` 的 `FieldFrame` mock 目前只渲染 children（label prop 被丢弃）、`:65-68` 把 `@nop-chaos/flux-renderers-form` mock 成 `resolveFieldLabelContent: () => undefined`、`:37` 把 `resolveRendererSlotContent` mock 成 `() => undefined`——无论修复走哪条通道 mock 链都返回 undefined。需同步更新 mock：FieldFrame mock 渲染 label、resolve 通道委托 regions，否则修复后测试仍红。
- [x] 值 label 回归用例确认存在（既有字符串 label 用例保持绿）。

Exit Criteria:

- [x] region label 用例先红（断言失败复现 12-01，且失败根因不是 mock 链返回 undefined，而是 label 解析通道缺失）；既有字符串 label 用例仍绿。
- [x] 测试文件的 FieldFrame mock 与 resolve 通道 mock 已按「green 可观测」要求更新（FieldFrame mock 渲染 label、resolve 委托 regions）。

### Phase 2 - 修复 12-01/12-02/12-03

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx`、`scripts/audit/rules.mjs`、`docs/architecture/field-frame.md`

- Item Types: `Fix`

- [x] 12-01：**按组件既有先例走 prop threading，而非在 view 内直接调用 helper**——`VariantFieldView` 只接收 `schemaProps`（`props.props`）与 `meta`（`variant-field-view.tsx:59-75`），没有 `regions` 也没有完整 `props`，而 `resolveFieldLabelContent` 签名要求 `Pick<RendererComponentProps, 'props'|'meta'|'regions'>`（`field-reading.tsx:38-40`）。照抄 `variant-field.tsx:72-75` 解析 hint/description 的先例（`:82-84` 作为 prop 下传）：在 `variant-field.tsx` 用 `resolveFieldLabelContent` 或 `resolveRendererSlotContent(props, 'label')` 解析 label（region/值双形式），新增 `VariantFieldViewProps.labelContent` prop 传入，`variant-field-view.tsx:222` 改用它（或传 `regions` 进 view 由 view 内解析）。
- [x] 12-01 回归：Phase 1 region label 用例转绿（含 mock 更新后）。
- [x] 12-02：`scripts/audit/rules.mjs:16-18` allowlist 路径更新为 `variant-field-view.tsx`（或双登记），跑 `pnpm check:audit-fieldframe-bypasses` 零候选命中。
- [x] 12-03：`docs/architecture/field-frame.md:97-116` 补 `renderer?: string`（说明：渲染为 `data-renderer`，供 debugger 锚点；`node-frame-wrapper.tsx:62` 实传 `renderer={props.templateNode.rendererType}`）。

Exit Criteria:

- [x] region label 用例转绿；form-advanced 包 `pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿。
- [x] `pnpm check:audit-fieldframe-bypasses` 零命中（不再输出 variant-field 3 处候选）。
- [x] `field-frame.md` 接口列表含 `renderer?: string`，与 `field-frame.tsx:47` 一致。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02663d934ffe0wSVd1wLX7U8Hn` 首轮 revised → `ses_0265eb88fffezRo0PS7OCRnpX9` 复检 pass）
- Verdict: pass（首轮 revised 的 M-1 已全部解决）
- Rounds: 2
- Findings addressed: M-1（Major）——(a) Phase 2 补 prop threading 机制（variant-field.tsx 按 hint/description 先例解析 + VariantFieldViewProps.labelContent 下传，view 无 regions/完整 props）；(b) Phase 1 补 mock 更新项（FieldFrame mock 渲染 label、resolve 通道委托 regions，否则 green 不可观测）+ 对应 Exit Criteria；(c) red 用例补手工模拟编译产物说明；(d) baseline 补包边界核实（flux-renderers-form 为既有依赖，detail-view.tsx:19-23 先例）。Minor 1 条（node-compiler-helpers.ts 全路径注记）不阻塞。

## Closure Gates

- [x] 12-01 region label 已修复且有测试（先红后绿）
- [x] 12-02 allowlist 路径已更新，`check:audit-fieldframe-bypasses` 零命中
- [x] 12-03 `field-frame.md` 已补 `renderer` prop
- [x] roadmap Follow-up Backlog 12-01/12-02/12-03 三行已翻转 `[x]` 附收口注记
- [x] daily log 已记录（`docs/logs/2026/08-07.md`）
- [x] 不存在被静默降级到 deferred 的 in-scope confirmed live defect
- [x] 受影响的 owner docs 已同步（field-frame.md 已更新；`docs/architecture/variant-field.md` 补 label value-or-region 解析注记；无其他 owner-doc 变更面）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- `docs/backlog/component-audit-roadmap.md` 其余 open backlog 行（13-02/18-01/18-02/O-P2-2/10-xx）归后续计划轮次。

## Closure

Status Note: 2026-08-07 执行完毕——2 Phase 全 completed（Phase 1 region label 用例先红后绿 + mock 更新；Phase 2 12-01 labelContent prop-threading / 12-02 allowlist 路径 / 12-03 field-frame.md renderer prop）；roadmap Follow-up Backlog 12-01/12-02/12-03 三行翻转 `[x]`；全量验证 typecheck/build/lint 32/32、test 59/59 task、`check:audit-fieldframe-bypasses` 零命中、`pnpm check` 仅 12 既有 pre-existing 超限命名零新增。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，task `ses_0261d9ed1ffe2SDKWfamEOPsO3`）
- Evidence: 复检 3 项修复面（12-01 `variant-field.tsx:76-77` resolveFieldLabelContent → labelContent 下传 `view:66,85,224`；12-02 `rules.mjs:17` allowlist 路径 live 跑零命中；12-03 `field-frame.tsx:47,82,227` ↔ `field-frame.md:113,137` 一致）；自跑 `pnpm check:audit-fieldframe-bypasses` exit 0、`npx vitest run variant-field-owner-contract.test.tsx` 7 passed、`node scripts/check-oversized-code-files.mjs` 12 ERROR 名全在登记 14 名清单减 2 内零新增、`git diff` 9 文件全部 in-scope；plan 一致性全勾选、roadmap/daily log/owner docs 已同步、无静默降级。verdict **approved-with-minors**：Minor 1（本 Closure 证据节原为占位、gate 勾选先于证据记录——本次已回填 Auditor/Evidence）；Minor 2（informational：test 文件 429→571 行仅入 >500 WARN 区，未新增 >700 ERROR 登记债，daily log 已注明）。

Follow-up:

- （只记录 non-blocking follow-up；confirmed live defect 不得出现在这里）无——非阻塞项均已处理（Closure 证据回填；WARN 行数已在 daily log 注明，归既有超限治理节奏）。
