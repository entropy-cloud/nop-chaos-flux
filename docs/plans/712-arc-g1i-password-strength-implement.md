# 712 Arc G1I — input-password 强度指示实现（`showStrength`）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G1 / §7 G1I（roadmap item G1I，依赖 G1D done）
> Related: plan `710-arc-g1d-password-strength-design.md`（协议权威：`docs/components/input-password/design.md` §4a/§4b）

## Purpose

按 G1D 协议落地 `showStrength` 能力扩展：renderer 字段接线、强度评分与强度条渲染、i18n 文案、focused 单测、e2e、交付铁律 3/5/6/8，全量验证 full-green。

## Current Baseline（live 核对 2026-10-24）

- 协议已定稿：`docs/components/input-password/design.md` §4a（四档评分/语义 token/`flux.common.pwdStrength*` i18n key/`role="meter"` a11y/DOM marker `input-password-strength(-segment|-label)`/校验链独立）；§4b 命名 pass。
- 实现落点：`packages/flux-renderers-form/src/renderers/input.tsx`（`createInputRenderer`，`revealEnabled` 分支在 `:139`，字段规则表 `inputEnhancementFieldRules:63-84`）；组路径 `input-group-field-control.tsx`（addon 顺序 suffix → counter → clear → reveal）。
- `InputSchema` 在 `packages/flux-renderers-form/src/schemas.ts`；`revealPassword` 字段先例（共享 InputSchema、仅 password renderer 消费）。
- i18n：`packages/flux-i18n/src/locales/en-US.ts:39-40` 与 `zh-CN.ts:40-41` 有 `showPassword`/`hidePassword`；`pwdStrength*` 五个 key 尚不存在。
- ui 无 StrengthMeter primitive；**本实现不新增 ui primitive**（4 段轨道是纯 div/span，协议未裁定需要 ui 原语）→ 不触碰 `packages/ui/src/index.ts`，无 ask-first 事项。
- 测试先例：`packages/flux-renderers-form/src/__tests__/input-password-reveal.test.tsx`（renderForm harness、`data-slot` 查询）；e2e 先例 `tests/e2e/renderer-lab-interaction-state.spec.ts`（`/#/lab/input-password` 路由 + `scenario-stage-*` 定位 + 程序化读数）。
- 交付面现状：`docs/components/input-password/example.json` 存在（无 strength 场景）；lab 页 `apps/playground/src/component-lab/renderers/input-password-lab-page.tsx` 有 3 场景（basic/confirm/reveal）；`examples.manifest.json:43` 已含 `input-password`；`docs/components/index.md:334,496` 已含条目。
- quick-reference 无任何 input-\* 家族条目（`input-text`/`input-email` 也零命中）——capability 字段不入 quick-reference 是该文件既有粒度约定，plan 710 的 quick-reference Deferred 在本 plan 就地改判为 watch-only（见 Deferred But Adjudicated）。

## Goals

- `showStrength: true` 时 input-password 渲染四段强度条 + 档位文案（i18n），评分/配色/a11y/DOM marker 与 design.md §4a 逐条一致。
- 空值不渲染强度行；`input-text`/`input-email` 声明 `showStrength` 不渲染（password-only 消费）；与 reveal toggle 共存；强度展示与校验链互不干扰。
- 交付铁律：3（example.json + lab 场景）、5（manifest/index 已有则核对无需改）、6（zh-CN/en-US 五个 i18n key）、8（`pnpm typecheck/build/lint/test/check` full-green + dev log）。
- focused 单测 + e2e 程序化断言。

## Non-Goals

- 不新增 ui primitive、不改 `packages/ui`；不改 `flux-core`（无 schema validation 规则新增——strength 不参与校验链）。
- 不改其他 renderer 行为；不做自定义档位阈值/文案的 schema 扩展（首版固定，归后续按需）。
- 不动 quick-reference（见 Deferred 改判）。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`：`InputSchema` 增 `showStrength?: boolean`。
- `packages/flux-renderers-form/src/renderers/input.tsx`：字段规则 + password-only 强度分支 + `aria-describedby` 拼接强度 label id。
- 新文件 `packages/flux-renderers-form/src/renderers/input-password-strength.tsx`：评分函数 + 强度条组件。
- `input-group-field-control.tsx`：新增 `strengthSlot` 槽（渲染在 `InputGroup` 下方独立行，返回 `<>{InputGroup}{strengthSlot}</>`；仅 showStrength 启用时结构变化，未启用时 DOM 逐字节不变）；`showStrength` 启用时强制走 group 路径（保证唯一包裹结构，marker 保持在 group 根）。
- `packages/flux-i18n/src/locales/{en-US,zh-CN}.ts`：5 个 `pwdStrength*` key。
- 测试：`__tests__/input-password-strength.test.tsx`；e2e 场景 `input-password-lab-page.tsx` + `tests/e2e/renderer-lab-interaction-state.spec.ts` 新 case。
- `docs/components/input-password/example.json` 增 strength 示例；design.md §11 实现拆分如有必要微调。

### Out Of Scope

- 其他 13 个 work item；ui 包；matrix；quick-reference。

## Failure Paths

（design.md §4a 已定：空值不渲染 / pattern 校验独立并存 / disabled-readOnly 静态展示——本 plan 的 Failure Paths 即测试断言面，不另立表。）

## Test Strategy

本档选择：**必须自动化**（renderer 公共契约新增字段）。Proof 项（focused 单测先行）与 Fix/Implement 并行落地，closure 前全绿。

## Execution Plan

### Phase 1 — Renderer 实现 + focused 单测

Status: completed
Targets: `packages/flux-renderers-form/src`、`packages/flux-i18n/src/locales`

- Item Types: `Fix | Proof`

- [x] `InputSchema` 增 `showStrength?: boolean`；`inputEnhancementFieldRules` 增 `{ key: 'showStrength', kind: 'prop', valueType: 'boolean' }`。
- [x] 新建 `input-password-strength.tsx`：`computePasswordStrength(value): 'weak'|'fair'|'good'|'strong'|null`（§4a 规则，strong 判定（len≥12 且 ≥3 类）先于 good 的 "len≥10 且 2 类" 分支求值；空/undefined→null）+ `PasswordStrengthMeter` 组件（4 段轨道 `data-slot="input-password-strength"` / `-segment`（`data-level`/`data-active`）/ `-label`，`role="meter"` + `aria-label={t('flux.common.pwdStrengthLabel')}` + valuemin/max/now，label 元素 `aria-live="polite"`；档位色按 §4a token 表（good 档经 G1I 审查勘误落 `muted-foreground`）——segment 用 `bg-destructive`/`bg-warning`/`bg-muted-foreground`/`bg-success`，label 文字色 `text-*` 同步）。
- [x] `input.tsx`：password 且 `showStrength===true` 时计算档位并渲染强度行；强度行随值变化重渲染（纯派生无 state）；input `aria-describedby` 拼接 `${name}-strength`（strength 启用时）；`showStrength` 启用强制 group 路径；`input-group-field-control.tsx` 增 `strengthSlot` 槽。
- [x] i18n：en-US/zh-CN 各增 `pwdStrengthLabel`/`pwdStrengthWeak`/`pwdStrengthFair`/`pwdStrengthGood`/`pwdStrengthStrong`。
- [x] focused 单测 `input-password-strength.test.tsx`（先写，Proof）：**判别性断言（正向渲染，无实现时必挂）**——声明 `showStrength` 且输入 `abc` 后 `[data-slot="input-password-strength"]` 出现、`data-level="weak"`、`aria-valuenow="1"`、label 文案为 i18n "Password strength"；**回归防护断言（负向）**——未声明 `showStrength` 不渲染；空值不渲染；`abcd1234`→fair、`Abcd1234`→good、`abcd123456`→good（len10+2类）、`Abcd1234abcd`→strong（len12 恰 3 类，钉死"≥3 类"语义；实现侧以等判别力字符串落地）、`Abcd1234!@#$`→strong；4 段轨道 + `data-active` 计数与档位一致；label 元素 `aria-live="polite"`；`aria-describedby` 含强度 id；`input-text` 声明不渲染；与 revealPassword 共存；disabled 下静态渲染；未声明时 DOM 契约零变化（既有 `input-classname-contract` 套件背书）。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-form test -- input-password-strength` 全绿，且既有 `input-password-reveal` 套件不回归（判别性：正向渲染断言（声明 `showStrength` 后强度行出现且档位正确）在无实现时必挂）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过。

### Phase 2 — 交付铁律 3/5 + e2e

Status: completed
Targets: `docs/components/input-password/example.json`、`apps/playground/src/component-lab/renderers/input-password-lab-page.tsx`、`tests/e2e/renderer-lab-interaction-state.spec.ts`

- Item Types: `Proof | Follow-up`

- [x] example.json 增 `showStrength: true` 场景示例（保留原示例，追加或扩展字段）。
- [x] lab 页增第 4 场景 `showStrength`（typing 展示四档变化），并修正页首 introDescription 中"strength 属 future enhancements"的过时表述。
- [x] e2e：`renderer-lab-interaction-state.spec.ts` 增 case——导航 `/#/lab/input-password`，定位 strength 场景 stage，程序化断言：空值无强度行；`page.fill` 弱密码后 `[data-slot="input-password-strength"]` 出现且 `aria-valuenow="1"`；强密码后 `aria-valuenow="4"`、4 段全 `data-active="true"`（纯 locator/evaluate 断言，不用截图）。
- [x] 核对铁律 5：`examples.manifest.json` 与 `docs/components/index.md` 已含 `input-password`（live 已确认），无增量改动则记录核对结论。

Exit Criteria:

- [x] e2e 新 case 通过（`npx playwright test renderer-lab-interaction-state --grep strength`）。
- [x] example.json 合法 JSON 且 schema 字段与实现契约一致。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 2 Major / 3 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 good 档 token `--secondary` 在 live 主题无映射 → 改判 `muted-foreground` 并在 design.md §4a 就地勘误；M2 判别性声称写反（负向断言无实现时必过）→ 改正向渲染断言为判别性、负向降为回归防护；m1 aria-live 断言显式化；m2 strong"≥3 类"语义钉死（`Abcd1234!!!` 测试 + strong 先于 good 求值）；m3 strengthSlot 包裹层与"未声明时 DOM 零变化"契约写明

## Closure Gates

- [x] 所有 in-scope 行为已落地且 focused 单测/e2e 证明（判别性断言存在）
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（design.md §11 如需；dev log 记录）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（82/82 task 全绿，含 form 包 1142 passed）
- [x] `pnpm check`（零新增未登记红项：knip 仅剩 2 条 HEAD 既有漂移 `tests/e2e/xlang-debug-mock-server.mjs`、`flux-renderers-3d …UseDataSourcesArgs`，git stash 对照验证非本 diff 引入；本 diff 的 `PasswordStrengthLevel` 未导出命中已修）

## Deferred But Adjudicated

### quick-reference input-password 条目（承 plan 710 Deferred）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: quick-reference 无任何 input-\* 家族条目（input-text/input-email 同样零命中），为既有粒度约定；单为 strength 加条目反而破坏一致性。归 quick-reference 治理线（L7 P-1）统一裁决。
- Successor Required: `no`
- Successor Path: —（归 missing-components L7 文档维护债）

## Non-Blocking Follow-ups

- 自定义阈值/档位文案 schema（首版固定协议，demand 出现再评估）。

## Closure

Status Note: G1I 全部交付面落地（实现 + focused 单测 8 case + e2e + 铁律 3/5/6/8）；closure audit 首轮 approved（0B/0M/3m，全部当场修复：悬空 describedby 改为随强度行存在性设置、design.md strong 措辞"≥3"、plan 测试字符串对齐）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24）
- Evidence: approved（零 Blocker）：live 代码逐条核对（评分规则/强制 group 路径/strengthSlot fragment/DOM 零变化契约）、测试断言真实性（判别性正向断言）、独立复跑 form 包 1142 passed + playwright strength case 1 passed、knip 2 条 HEAD 既有漂移 stash 对照复验、§4a/§4b 一致性、quick-reference 零条目复核。
