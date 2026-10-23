# Arc Gap G1I — `input-password` `showStrength` 强度指示实现

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G1 / §6 Wave 1 G1I / §7 G1I（roadmap work item G1I，依赖 G1D `done`）
> Related: `docs/plans/arc-gap-g1d-password-strength-design-plan.md`（completed——契约唯一事实源）、`missions/arc-component-gap.json`（commitFormat：`feat(arc-component-gap): <description>`）

## Purpose

按 G1D 定稿的契约（`docs/components/input-password/design.md` §4/§7/§10）落地 `showStrength`：字段接线 + 强度条渲染 + i18n + focused 单测 + e2e + 交付铁律 3/5/6/8 收口。

## Current Baseline（live 实测 2026-10-22，worktree `arc-component-gap` @ a278fdcba）

- G1D 已 `done`：`docs/components/input-password/design.md` §4 承载完整协议（字段/算法/meter 解剖/颜色/a11y/校验关系）、§10 承载 marker 与 6 个 i18n key 词表。
- `revealPassword` 同构先例全部在位：`schemas.ts:67` 共享 `InputSchema` 字段、`input.tsx:71` field rule、`input.tsx:139` 仅 password 消费、`__tests__/input-password-reveal.test.tsx` 测试骨架（renderForm harness + en-US i18n init）。
- i18n 载体：`packages/flux-i18n/src/locales/zh-CN.ts` / `en-US.ts` 的 `common:` 命名空间（`flux.common.showPassword` 先例 :40-41/:39-40）。
- 消费端挂载点齐备：`apps/playground/src/component-lab/renderers/input-password-lab-page.tsx`（3 场景，route `/#/lab/input-password`）；`docs/components/input-password/example.json`（无 showStrength 字段）；`tests/e2e/renderer-lab-interaction-state.spec.ts:115` 有 lab 页 e2e 先例。
- 铁律 5 登记面：`docs/components/examples.manifest.json:43` 与 `docs/components/index.md:334,496` 均已含 input-password（能力扩展不新增行，仅核对无需变更）。
- G1D closure audit 4 Minor 随本 plan 消化：design.md:13 "已由 showStrength 落地"措辞、算法"长度"读法钉死（JS `.length`，UTF-16 code units）、未填充段颜色钉入 design.md §4（R1-Minor-3）；第 4 项（熵计算理由归类位置）裁定**无需 G1I 动作**——design.md §2 理由列已承载语义，容器 data-slot 超集属 repo 惯例维持。
- Tailwind v4 monorepo 扫描面：`apps/playground/src/styles.css` `@source "../../../packages"` 覆盖 renderer 包新类名；`bg-destructive`/`bg-warning`/`bg-success`/`bg-muted` 为在用工具类。

## Goals

- `showStrength: true` 的 input-password 在输入框（组）下方渲染 4 段强度条 + 等级词，行为逐条符合 design.md §4（算法/meter 解剖/颜色/aria/校验关系）。
- input-text / input-email 声明 `showStrength` 不渲染强度条（schema 层不阻止，renderer 层不消费——revealPassword 同款）。
- 6 个 i18n key（zh-CN/en-US）落地；lab 页新增演示场景；e2e 程序化断言。
- 全量门禁 full-green：`pnpm typecheck` / `build` / `lint` / `test` / `check`。

## Non-Goals

- 不新增 ui primitive（G1D 裁定：renderer 包内自绘；不触 `packages/ui/src/index.ts` ask-first 区域）。
- 不做强度阈值/文案/段数的 schema 化（design.md §12 首版固定）。
- 不改校验链（强度条与 `pattern`/`validate` 零耦合）。
- 不新增 renderer type / 不动 matrix。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`（`showStrength?: boolean`）
- `packages/flux-renderers-form/src/renderers/input.tsx`（field rule + password 分支接线）
- 新文件 `packages/flux-renderers-form/src/renderers/input-password-strength.tsx`（等级计算纯函数 + meter 组件）
- `packages/flux-i18n/src/locales/zh-CN.ts` / `en-US.ts`（6 keys）
- `packages/flux-renderers-form/src/__tests__/input-password-strength.test.tsx`（新 focused 单测）
- `tests/e2e/input-password-strength.spec.ts`（新 e2e）
- `apps/playground/src/component-lab/renderers/input-password-lab-page.tsx`（新场景）
- `docs/components/input-password/example.json`（加 `showStrength` 演示字段）
- `docs/components/input-password/design.md`（G1D audit Minor 消化：:13 措辞、§4 长度读法与未填充段颜色钉死）
- `docs/components/existing-components-improvement-analysis.md`（G1 登记行补 ✅ 实现完成标记）

### Out Of Scope

- `packages/ui/`（零改动）
- `examples.manifest.json` / `docs/components/index.md` / `docs/references/quick-reference.md`（已登记，能力扩展无需变更——执行时核对并记录）
- schema-file-validator / capability manifest（`showStrength` 走 `inputEnhancementFieldRules` 既有通道，无新 validator 面；如执行中发现校验器枚举需同步，就地补齐并在 plan 记录）

## Failure Paths

| 可测场景编号           | 触发                                       | 行为                                                                 | 可重试 | 用户可见表现             |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------- | ------ | ------------------------ |
| strength-non-password  | input-text/email 声明 `showStrength: true` | schema 层不阻止；renderer 不渲染强度条                               | 是     | 普通输入框               |
| strength-empty         | 值为空 / 清空                              | 强度条整体不渲染                                                     | 是     | 无强度条                 |
| strength-typing        | 输入中间态                                 | 等级随 value 重算（派生值），无延迟/去抖                             | 是     | 段数/颜色/等级词实时变化 |
| strength-error-coexist | 值触发校验错误                             | 强度条与 field frame 错误并存；input `aria-describedby` 仍指错误元素 | 是     | 二者同时可见             |

## Test Strategy

档位选择（三选一）：`必须自动化 / 建议有测 / 不适用：理由`

本档选择：`建议有测`（表单通用能力，非鉴权/外部契约；roadmap G1I 明确要求 focused 单测 + e2e，全部自动化落地）。判别性测试点名：`input-password-strength.test.tsx` 的算法边界用例（空/len5/len6 全小写/四条目组合）在旧实现（无此模块）下必然无法通过导入编译——判别机制 = 纯函数单测直接 pin 等级输出；渲染用例 pin data-slot/aria/颜色类，任何 meter 解剖回归即红。

## Execution Plan

### Phase 1 — 代码接线（schema + renderer + i18n）

Status: completed
Targets: `packages/flux-renderers-form/src/`、`packages/flux-i18n/src/locales/`

- Item Types: `Fix | Proof`

- [x] `schemas.ts`：`InputSchema` 增 `showStrength?: boolean`（`revealPassword` 同位同形）
- [x] `input.tsx`：`inputEnhancementFieldRules` 增 `{ key: 'showStrength', kind: 'prop', valueType: 'boolean' }`
- [x] 新文件 `input-password-strength.tsx`：导出 `computePasswordStrengthLevel(value: string): 0|1|2|3|4`（空串返回约定见实现：调用方保证非空才调用，函数对空串返回 0 以保总函数性；长度读法 = JS `.length`）+ `PasswordStrengthMeter` 组件（容器 `nop-input-password-strength` marker + `data-slot="input-password-strength"` + `role="meter"` + `aria-valuemin={0}`/`aria-valuemax={4}`/`aria-valuenow`/`aria-valuetext`=等级词/`aria-label`=`t('flux.common.passwordStrength')`；4 个 `data-slot="input-password-strength-segment"` aria-hidden span，填充数 = `max(1, level)`，填充类 level 0–1 `bg-destructive` / 2 `bg-warning` / 3–4 `bg-success`，未填充 `bg-muted`；`data-slot="input-password-strength-label"` 等级词）
- [x] `input.tsx` password 分支：`strengthEnabled = inputType === 'password' && props.props.showStrength === true`；值非空时在 Input/InputGroupFieldControl 之下渲染 meter（保持 `suggest.wrap` 包裹语义与 `nop-input-password` root marker 不变）
- [x] i18n：`flux.common.passwordStrength` + `passwordStrengthTooShort`/`passwordStrengthWeak`/`passwordStrengthFair`/`passwordStrengthGood`/`passwordStrengthStrong`（zh：密码强度/太短/弱/一般/良好/强；en：Password strength/Too short/Weak/Fair/Good/Strong）
- [x] design.md 消化 G1D audit Minor：:13 措辞改"已定稿（实现随 G1I 落地）"式表述；§4 算法"长度"补"（JS `.length`，UTF-16 code units）"；§4 meter 解剖补未填充段颜色 `bg-muted`（保持契约唯一事实源完整）

Exit Criteria:

- [x] focused 单测 `input-password-strength.test.tsx` 全绿（26 用例；执行补充：连续 change 断言需 `await waitFor` 等 store 传播——本仓既有先例同款）：算法表驱动用例（'' / 'abcde' / 'abcdef' / 'Abcdef1' / 'abc123!' / 'Abcdef1!' / 'Ab1!' + 'x'\*7 组合等逐 level 边界）、渲染断言（data-slot 三件套、段数=4、填充数、颜色类、aria 三值 + valuetext、label）、空值不渲染、disabled/readOnly 照常渲染、input-text/email 不渲染、与 reveal/clearable/counter 共存、`aria-describedby` 不受强度条影响
- [x] 既有 `input-password-reveal.test.tsx` / `input-text-enhancements.test.tsx` 等回归全绿（零行为漂移）
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿 + `pnpm --filter @nop-chaos/flux-i18n test` 全绿（如有）

### Phase 2 — example / lab / e2e 与登记核对

Status: completed
Targets: `apps/playground/src/component-lab/renderers/input-password-lab-page.tsx`、`tests/e2e/input-password-strength.spec.ts`、`docs/components/input-password/`

- Item Types: `Proof`

- [x] lab 页新增 "Password strength meter" 场景（`showStrength: true`，intro 同步移除 "strength affordances are separate future enhancements" 表述）
- [x] `example.json` 增 `"showStrength": true`（展示新字段）
- [x] 新 e2e `tests/e2e/input-password-strength.spec.ts` 全绿（playground 为 zh-CN，valuetext 断言用 design.md §10 钉死的 zh 词表 太短/一般/强）：playwright 程序化断言（lab 页路由）——输入分级值后 `role="meter"` 出现、`aria-valuenow`/`aria-valuetext` 随输入变化、清空后消失；**不使用截图作为证明**
- [x] 铁律 5 核对记录：`examples.manifest.json` / `docs/components/index.md` 无需新增（input-password 已登记），quick-reference 无 input-password 条目（与 E2a-bis 先例一致，能力扩展不强制补条目）——结论记入 plan Closure

Exit Criteria:

- [x] `npx playwright test tests/e2e/input-password-strength.spec.ts` 全绿
- [x] lab 场景在 `/#/lab/input-password` 可见（e2e 断言即证）
- [x] 铁律 5 核对结论写入本 plan Closure 证据节

## Closure Gates

- [x] 所有 in-scope 行为结果已达成（Phase 1/2 Exit 全 [x]）
- [x] dev log 记录（`docs/logs/2026/10-23.md`，铁律 8）
- [x] necessary focused verification 完成（单测 + e2e + 回归）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响 owner docs 已同步（design.md Minor 消化两处；improvement-analysis G1 登记行补 ✅ 实现完成标记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增 red；登记 2 条 HEAD 既有未注册 knip 命中——非本 plan 引入，证据 `_tmp/knip-head.json` stash 复测；oversized 3 条均为既有 registered 豁免）

## Draft Review Record

- Reviewer / Agent: 独立子 agent R1（fresh session `agent_8c27d335`，general-purpose，review-only）
- Verdict: `pass`（0 Blocker / 0 Major / 5 Minor）
- Rounds: 1
- Findings addressed:
  - R1-Minor-1 improvement-analysis 补入 In Scope
  - R1-Minor-2 G1D 第 4 项 Minor 处置写明（无需 G1I 动作，理由已承载）
  - R1-Minor-3 未填充段颜色 `bg-muted` 钉入 design.md §4 执行项
  - R1-Minor-4 单测补显式 level-3 输入 `'Abcdefg1'`
  - R1-Minor-5 补本节 + Closure Gates 补 dev log 项

## Deferred But Adjudicated

（无——本计划无执行中改判）

## Non-Blocking Follow-ups

- （无）

## Closure

Status Note: 2026-10-23 关闭。`showStrength` 全链落地（schema 字段 + 强度条组件 + i18n + 26 focused 单测 + e2e + lab/example + design.md 契约同步），五门禁 full-green（typecheck/build/lint/test/check 均 exit 0）。执行发现一处 DOM 身份约束：strengthEnabled 生命周期内 wrapper div 必须恒定挂载（空↔非空切换时更换包裹结构会重挂 input、使交互中断），已实现 + 代码注释 + 单测钉住（recomputes-level 用例）。铁律 5 核对结论（audit Minor-1 誊抄）：`examples.manifest.json:43` 与 `docs/components/index.md` 均已含 input-password（能力扩展无需新增行）；`docs/references/quick-reference.md` 无 input-password 条目，与 E2a-bis 先例一致（能力扩展不强制补条目）——三项均无需变更。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `agent_ecc9f3c2`，general-purpose，review-only）
- Evidence: closure audit 报告：26 用例 live 复跑全绿（含逐个手算算法期望值）、e2e live 复跑 1 passed（反证 dev server 服务本树）、五门禁日志核对（`_tmp/gate-*.log`）、knip 登记 honesty 复证（两条均在 knip@HEAD 出现、surgical 编辑合规、新模块零基线吸收）；verdict `approved`（0 Blocker / 0 Major / 5 Minor，其中 Minor-1 誊抄入 Status Note、Minor-2 记入本 Note、Minor-3 排序整理、Minor-4 \_tmp 清理随手、Minor-5 本提交逐文件 add 不卷入并行 G2D 草稿）

Follow-up:

- （无剩余 plan-owned work）
