# NEW-Package Advertised-Contract & Lifecycle Honesty

> Plan Status: completed
> Last Reviewed: 2026-06-25
> Source: `docs/audits/2026-06-24-2213-open-audit-components.md` ([F2],[F3],[F4],[S2],[S3])
> Related: `docs/plans/2026-06-25-0510-1-wizard-boolean-literal-normalization-correctness-plan.md`（{1}，F1），`docs/plans/450-*.md`（multi-audit cleanup，且已覆盖 [S1]↔O-03 carousel memo、[F3] 诊断部分↔C-22 qrcode console.warn）
> Execution Order: {2} of the 2-plan open-audit remediation set。本计划触及 `carousel.tsx`（S3，与 450 的 O-03/O-04 同文件）与 `qrcode.tsx`（F3-onLoadError，与 450 的 C-22 同文件），故排在 **450 之后**执行以减少同文件反复改动；WS 之间彼此独立可并行。

## Purpose

收口 open-audit 中「NEW 包（`flux-renderers-content` + `flux-renderers-layout`）发布了渲染器本体从未接线的契约 / 生命周期与 payload 不诚实」这一结果面。open-audit 的总评第 2、3 方向明确指出：manifest/propContract（schema 作者编译依据的契约面）承诺了渲染器本体从不实现的能力，是低代码场景里最伤信任的一类（作者不是缺契约，而是照着一个**错的**契约写）。按 Rules 22-26 不再 one-finding-per-plan，而在单个 owner plan 内用 workstream 分组收口。

## Current Baseline

起草者已 live 核对全部引用（行号见下），结论成立。所有 finding 均未修复：

- **[F2]（P-主）cards 撒谎契约**：`packages/flux-renderers-content/src/schemas.ts:176,178,181` 声明 `selectionOwnership?:'local'|'controlled'|'scope'`、`selectionStatePath?`、`onPageChange?: ActionSchema`；`content-renderer-definitions.ts:253`（`onPageChange` event 契约）、`:271-275`（把三者作为 fields 暴露）。但 `cards-renderer.tsx` + `cards-renderer.test.tsx` 对这三个名字 **0 引用**（grep 已证）：selection 只存于本地 `useState`（`cards-renderer.tsx:204`），`selectionOwnership`/`selectionStatePath` 被静默忽略；renderer 无任何分页逻辑，`onPageChange` 永不触发——是**全死事件契约**。
- **[F4]（跨切）ownership/reactive 词表分裂**（起草者 live 复核修正：审计原称 wizard「已实现」**有误**）：
  - `valueOwnership`/`valueStatePath`（local/controlled/scope，**真正实现**的只有 duo）：`steps`（`steps-renderer.tsx:90,92`）、`collapse`（`collapse-renderer.tsx:46,48`）——canonical 实现范式。
  - **wizard 也是 advertised-but-dead**：`schemas.ts:37,39`（`WizardSchema`）声明 `valueOwnership`/`valueStatePath`，但 `wizard-renderer.tsx` 对二者 **0 引用**（仅 `:175-176` 把 `schemaProps.value` 当受控种子读一次，`:172` 注释 "Local controlled"）——ownership mode 选择与 scope 发布均未实现，与 cards/button-group 同类。
  - `selectionOwnership`/`selectionStatePath`（cards，**死别名**，见 F2）。
  - `value` 声称「currently selected」但**非响应式**（无 ownership 字段）：`button-group-renderer.tsx:40-43` 仅从 `defaultValue ?? value` 播种一次本地 state，此后再不读 `value`——运行时改 `value` 不移动选中。
  - 即：steps/collapse 是唯一真正实现的 canonical duo；wizard/cards/button-group 三者形态各异但都是「advertised-but-dead/非响应式」。设 `value` 是否驱动组件无法从字段名预判。即「设 `value` 是否真的驱动组件」无法从字段名预判。
- **[F3]（P-主）qrcode 吞错 + `onLoadError` 家族不一致**：`packages/flux-renderers-content/src/qrcode.tsx:53-58` catch 里 `void error;` 丢弃生成错误（**诊断部分** = multi-audit [C-22]，已归 450 加 dev `console.warn`）；`QrCodeSchema`（`schemas.ts:309-322`）与 `content-renderer-definitions.ts`（~485-500）**无** `onLoadError`。对比：`image.tsx:79,84`、`audio.tsx:20,31`、`video.tsx:21,31` 均声明并触发 `onLoadError`（definitions `:147/:439/:457`）。对 schema 作者看来同族的 4 个组件实际有两套错误契约。
- **[S2]（P2-次）json-view 复制定时器卸载泄漏**：`packages/flux-renderers-content/src/json-view.tsx:49` `window.setTimeout(()=>setCopied(false),1500)` 无 cleanup；快速双击叠加定时器，卸载窗口期内留下 pending `setCopied`。
- **[S3]（P2-次）carousel `onChange` payload 重复键**：`packages/flux-renderers-content/src/carousel.tsx:59` 发 `{ type:'change', index: next, activeIndex: next, item }`，`index` 与 `activeIndex` 同值——已发布事件 payload 里的冗余双键。

边界说明（避免与 450 重复\_claim）：

- [S1]（carousel `useMemo(handle)` deps 含 `activeIndex`）= 450 的 O-03，**不在本计划**。
- [F3] 的**诊断**（qrcode `void error` → dev `console.warn`）= 450 的 C-22，**不在本计划**；本计划只负责 [F3] 的 **`onLoadError` 事件契约**部分。两计划同改 `qrcode.tsx`，靠「450 先行（已 active）、本计划其后」与 WS-B 内显式说明协调。

真正剩余的 gap：cards 三处死契约未裁定（实现或移除）；ownership 词表未统一（wizard/cards/button-group 均为 advertised-but-dead/非响应式，仅 steps/collapse 为 canonical duo）；qrcode 无 `onLoadError`；json-view 定时器泄漏；carousel payload 冗余键。

## Goals

- [F2]+[F4]：裁定 ownership 规范词表（`valueOwnership`/`valueStatePath` 是否为 canonical，以 steps/collapse 的实现为参照）；对 wizard / cards / button-group **三者各自**裁定——要么**收敛实现**（受控/scope 真正生效），要么**移除误导性框架**并文档化为 local-only（wizard 的 `valueOwnership`/`valueStatePath`、cards 的 `selectionOwnership`/`selectionStatePath`/`onPageChange`、button-group 的 `value` 受控语义）。结果：这三个组件不再有「advertised-but-dead」ownership 契约（canonical duo steps/collapse 不动）。
- [F3]：qrcode 声明并触发 `onLoadError`，与 image/audio/video 家族对齐（schema 作者加 `onLoadError` 不再被静默忽略）。
- [S2]：json-view 复制定时器在卸载时清理，无 pending setState。
- [S3]：carousel `onChange` payload 单一规范键，无冗余双键。

## Non-Goals

- 不为 cards 从零构建完整分页（`onPageChange` 的 Decision 是「实现桥接外部分页」或「移除死事件」，默认倾向移除；若选实现须另评估 scope）。
- 不动 carousel memo（[S1]/O-03）与 autoplay（O-04）——归 450。
- 不动 qrcode 的 dev `console.warn` 诊断——归 450（C-22）；本计划只加 `onLoadError` 事件。
- 不处理 multi-audit C-findings（归 448/449/450），不处理 [F1]（归 `{1}`）。
- 不重写既有已实现且正确的 canonical duo（steps/collapse 的 `valueOwnership`/`valueStatePath`）。

## Scope

### In Scope

- WS-A：`packages/flux-renderers-content/src/schemas.ts`、`content-renderer-definitions.ts`、`cards-renderer.tsx`（+ test）；`packages/flux-renderers-layout/src/button-group-renderer.tsx`（+ schema/definition）、`packages/flux-renderers-layout/src/wizard-renderer.tsx`（`valueOwnership`/`valueStatePath` 死字段，与 `{1}` 同文件不同关注点）、`packages/flux-renderers-layout/src/schemas.ts`（`WizardSchema` ownership 字段）、相关 design.md。
- WS-B：`packages/flux-renderers-content/src/qrcode.tsx`、`schemas.ts`（`QrCodeSchema`）、`content-renderer-definitions.ts`（qrcode 定义）。
- WS-C：`packages/flux-renderers-content/src/json-view.tsx`（S2）、`carousel.tsx`（S3）。

### Out Of Scope

- carousel memo/autoplay（450）、qrcode console.warn（450）。
- cards 全新分页实现（除非 WS-A Decision 选实现且 scope 可控）。
- 448/449/450/`{1}` 范围。

## Failure Paths

| 场景                               | 触发                    | 行为                                                                         | 可重试 | 用户可见表现                 |
| ---------------------------------- | ----------------------- | ---------------------------------------------------------------------------- | ------ | ---------------------------- |
| cards `selectionOwnership:'scope'` | schema 作者设受控/scope | 修复后：要么真正发布到 scope（兄弟可查），要么配置被移除/文档化为 local-only | —      | 不再被静默忽略               |
| cards `onPageChange`               | 设外部分页桥接          | 裁定后：要么真实触发，要么契约移除                                           | —      | 不再是永不触发的死事件       |
| qrcode 生成失败                    | payload 过大/颜色非法   | 触发 `onLoadError`（对齐 image 家族）+ 维持 failed UI                        | 否     | 失败态不变；作者可挂错误处理 |
| carousel `onChange` 消费者         | payload 键裁剪          | 单一规范键；若移除某键须先核内部/已知消费者                                  | —      | payload 形状确定             |

## Test Strategy

档位选择：**建议有测**（混合）

- WS-A：[F2]/[F4] 契约 Decision——测试断言「无 advertised-but-dead 契约」（grep renderer 引用每个暴露的 field/event）；若选「实现受控/scope」，补 selection 发布到 scope 的行为测试。
- WS-B：[F3] 加 `onLoadError` 触发测试（对齐 `image.test.tsx:61-71` / `video.test.tsx:72-81` 范式）。
- WS-C：[S2] 加「卸载后无 pending setState」断言（fake timers）；[S3] 加 payload 形状断言。

## Execution Plan

### Workstream 1 - ownership 词表统一与 advertised-but-dead 契约诚实（F2, F4）

Status: completed
Targets: `flux-renderers-content/src/{schemas.ts,content-renderer-definitions.ts,cards-renderer.tsx}`、`flux-renderers-layout/src/{button-group-renderer.tsx,wizard-renderer.tsx,schemas.ts + 其 definition}`、相关 `docs/components/*/design.md`

- Item Types: `Decision | Fix | Proof`

- [x] `Decision`（F4 词表，**per-component** 裁定）：以 steps/collapse 的 `valueOwnership`/`valueStatePath` canonical 实现为参照，对 wizard / cards / button-group **三者各自**裁定（A）收敛实现（受控/scope 真正生效，对齐 canonical duo）或（B）移除死框架并文档化为 local-only。**裁定记录：三者均选 (B) 移除/文档化**——cards 的 `selectionOwnership`/`selectionStatePath`/`onPageChange`（renderer 0 引用，selection 本地 `useState`，无分页逻辑）；wizard 的 `valueOwnership`/`valueStatePath`（renderer 0 引用，`value`/`defaultValue` 仅作 local-controlled 种子）；button-group 的 `value` 受控语义（非响应式种子，文档化为 seed-only）。canonical duo steps/collapse 不动。理由：能力从未实现，移除最诚实，v1 无 compat 负担；任一选 (A) 须评估实现 scope（本案无组件选 A）。
- [x] `Fix`（F2 cards）：选移除——删 `CardsSchema` 的 `selectionOwnership`/`selectionStatePath`/`onPageChange`（`schemas.ts`）与 cards definition 的 `onPageChange` eventContract + 三个 fields（`content-renderer-definitions.ts`）；保留实现的 `selectionMode`/`onSelectionChange`/`onItemClick`。
- [x] `Fix`（F4 wizard）：选移除——从 `WizardSchema` 与 wizard definition（propContracts + fields）移除 `valueOwnership`/`valueStatePath`（renderer 本就未读）；`value`/`defaultValue` 文档化为 local-controlled 种子（schema JSDoc + propContract description）；`statusPath` 保留。与 `{1}` 同文件（wizard-renderer.tsx）不同关注点（`{1}` 改 disabled 解包，本项改 ownership 字段），无冲突。
- [x] `Fix`（F4 button-group）：选文档化——`value`/`defaultValue` JSDoc + propContract description 由 "Currently selected" 改为 "Initial ... seed only ... non-reactive"；`button-group-renderer.tsx` 加 seed 注释；不声明 ownership 字段。
- [x] `Proof`：cards/wizard 各加 grep-style 契约↔renderer 一致性断言（死字段从 schema+definition+renderer 三处均消失、实现项 `selectionMode`/`onSelectionChange`/`statusPath` 保留）；button-group 断言无 `valueOwnership` + value 契约含 "seed" 不含 "currently selected" + 无 `useScopeSelector`。三者均选 (B)，无受控/scope 行为测试需补。

Exit Criteria:

- [x] cards 不再暴露未被 renderer 引用的 `selectionOwnership`/`selectionStatePath`/`onPageChange`（移除）。
- [x] wizard 的 `valueOwnership`/`valueStatePath` 已移除（local-controlled seed 文档化），`statusPath` 保留。
- [x] button-group `value` 误导性受控框架已文档化为 seed-only（非响应式）。
- [x] [F4] per-component 词表 Decision 已逐项记录（cards/wizard/button-group = (B)）；相关 design.md 反映裁定（cards §8.1、wizard §10.1、button-group §7）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-content test`（156）、`--filter @nop-chaos/flux-renderers-layout test`（60）相关用例全绿。

### Workstream 2 - qrcode onLoadError 事件契约（F3 事件部分）

Status: completed
Targets: `flux-renderers-content/src/{qrcode.tsx,schemas.ts,content-renderer-definitions.ts}`

- Item Types: `Fix | Proof`

- [x] `Fix`：`QrCodeSchema`（`schemas.ts:317`）加 `onLoadError?: ActionSchema`；qrcode 定义（`content-renderer-definitions.ts:484`）加 `{ key:'onLoadError', kind:'event' }`（对齐 image/audio/video 的 `:147/:439/:457`）。
- [x] `Fix`：`qrcode.tsx:60` catch 内 `void onLoadError?.()` 触发事件（保留 `void error;`；450 的 C-22 dev `console.warn` 不在此加——两者同处 catch，互不冲突，本项只加事件触发）。
- [x] `Proof`：加 `onLoadError` 触发测试（`qrcode.test.tsx`，对齐 `image.test.tsx:61-71` 范式：`vi.mock('qrcode')` controllable → flip `failGeneration` 注入失败 → 断言 `onLoadError` 被调用 1 次 + `data-state="error"` failed UI）。

Exit Criteria:

- [x] qrcode 声明并在失败时触发 `onLoadError`，与 image/audio/video 家族一致。
- [x] 与 450 的 C-22（console.warn）共存无冲突（同 catch，事件 + 诊断各司其职；本计划只加事件，`void error;` 保留待 450 替换为 console.warn）。
- [x] qrcode 测试全绿（content 包 20 files / 156 tests）。

### Workstream 3 - carousel/json-view 生命周期与 payload（S2, S3）

Status: completed
Targets: `flux-renderers-content/src/{json-view.tsx,carousel.tsx}`

- Item Types: `Decision | Fix | Proof`

- [x] `Decision`（S3 payload）：裁定 carousel `onChange` 规范键 = **(A) 仅保留 `activeIndex`**（对齐 schema/state 字段名）。核对 carousel `onChange` 内部/已知消费者（renderer 本体、注册 handle、既有测试）均不读 `index`；v1 无 compat 负担，选 (A)。
- [x] `Fix`（S3）：`carousel.tsx:59` 去掉冗余键 `index`，payload 改为 `{ type:'change', activeIndex: next, item }`（单一规范键）。
- [x] `Fix`（S2）：`json-view.tsx` 复制定时器迁入 `copiedResetRef`（`useRef<number|undefined>`）+ unmount `clearTimeout` cleanup effect，并在重新复制前 `clearTimeout` 旧 timer（消除 pending `setCopied` / 不叠加）。
- [x] `Proof`：[S3] `carousel.test.tsx` 源码 payload 形状断言（含 `activeIndex`、不含 `index:`）；[S2] `json-view.test.tsx` 用 `setTimeout`/`clearTimeout` spy 断言 unmount 清掉 copy-reset timer id（无 pending setState）。

Exit Criteria:

- [x] carousel `onChange` payload 单一规范键（`activeIndex`），无冗余双键；Decision (A) 已记录（carousel design.md §8）。
- [x] json-view 复制定时器卸载清理 + 重复制前清旧；快速双击/卸载无 pending setState。
- [x] 与 450 的 carousel（O-03/O-04）改动同文件但不同关注点，无冲突（本项只改 `onChange` payload 一行，450 改 memo/autoplay）；content 包测试全绿。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session
  - round 1: ses_104809c74ffevENCJz5bWUGMU5 → `revised`（1 Major + 2 Minor）
  - round 2: ses_10479ef85ffe85stKXkQroOi9 → `pass-with-minors`（零 Blocker / 零 Major，共识达成）
- Verdict: round 1 `revised` → 修复 → round 2 `pass-with-minors`（共识达成）
- Rounds: 2
- Findings addressed:
  - **Major（round 1，M1）**：F4 baseline 误称 wizard「已实现」valueOwnership。live 核对确认 `wizard-renderer.tsx` 对 `valueOwnership`/`valueStatePath`/`useScopeSelector` **0 引用**（仅 `:175-176` 读 `schemaProps.value` 作种子，`:172` 注释 "Local controlled"）；真正实现的 canonical 只有 steps（`:90,92`）+ collapse（`:46,48`）duo。已修正 F4 baseline/goals/WS-A/Exit/Closure 全部一致地把 wizard 列为 advertised-but-dead 并纳入 WS-A scope；canonical duo=steps/collapse。round 2 确认 M1 resolved、无残留 "trio/wizard implemented"。
  - Minor（round 1，m1）：Decision A/B/C 漏一种组合 → 重构为 **per-component** 裁定（wizard/cards/button-group 各自 A 收敛 / B 移除），穷尽无遗漏。round 2 确认 exhaustive。
  - Minor（round 1，m2）：测试档位 `建议有测` 对 mutate public schema 契约略偏低，但每个 WS 都有具体 Proof（grep 无死契约 + 实现时行为测试 + onLoadError 触发 + fake-timer/payload 断言），非 `不适用` 规避——保留。
  - Minor（round 2，m1）：sibling `{1}` 的协调注释因 M1 修复变得不精确（`wizard-renderer.tsx` 现为两计划共享）→ 已修正 `{1}` 的 Execution Order 与 Out Of Scope（同文件不同关注点，顺序协调）。
- 引用核对（round 1+2 live）：F2 `schemas.ts:176,178,181`+`content-renderer-definitions.ts:253,271-275`+cards-renderer/test 0 引用+`useState:204`✓；F4 wizard 0 引用+`schemas.ts:37,39`+steps/collapse 实现✓+button-group `:40-43` 非响应式✓；F3 `qrcode.tsx:53-58`+无 onLoadError+image/audio/video 声明触发✓；S2 `json-view.tsx:49`✓；S3 `carousel.tsx:59`✓；与 450（C-22/O-03/O-04）协调无重叠、无 finding 被静默丢弃或双重 claim✓。
- 共识达成（零 Blocker/Major）→ 升级为 `active`。

## Closure Gates

- [x] WS-A：wizard/cards/button-group 三者均无 advertised-but-dead ownership 契约（各自移除或文档化）；[F4] per-component 词表 Decision 落地并文档化；canonical duo（steps/collapse）未被动。
- [x] WS-B：qrcode 声明并触发 `onLoadError`，与 image/audio/video 一致。
- [x] WS-C：carousel payload 单一规范键；json-view 定时器卸载清理。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（WS-A 的 cards/button-group Decision、WS-C 的 S3 Decision 须显式裁定并记录）。
- [x] 受影响 owner docs 已同步（cards/button-group/qrcode/carousel/json-view/wizard 相关 design.md 反映裁定）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不自审本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 起草时无。若 WS-A [F4] per-component Decision 对某组件选「收敛实现受控/scope」但发现 scope 超出本计划（需重建该组件的 selection/value 发布管线），则在此登记 residual，写 `Why Not Blocking Closure` 并指明 successor；不得把已确认的「advertised-but-dead 契约」静默降级为 follow-up（至少须先移除死契约以满足诚实性）。

## Non-Blocking Follow-ups

- 若 WS-A 选「移除 cards 分页契约」，未来真正引入分页时另立 plan 实现 `onPageChange` 桥接。
- accessibility 专项（cards `role=listitem`+`aria-selected`+tabIndex、carousel 指示器键盘语义）——open-audit 自评盲区，另立 a11y pass。

## Closure

Status Note: 三 WS 全部落地。NEW 包（`flux-renderers-content` + `flux-renderers-layout`）不再有 advertised-but-dead ownership 契约（cards 三死字段、wizard valueOwnership/valueStatePath 已移除；button-group value 已文档化为 seed-only）；canonical duo steps/collapse 未动。qrcode 声明并触发 `onLoadError`（对齐 image/audio/video 家族，与 450/C-22 的 console.warn 同 catch 各司其职）。carousel `onChange` 单一规范键 `activeIndex`；json-view 复制定时器卸载清理。6 份 design.md 反映裁定。全量 typecheck/build/lint/test 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（`ses_102832098ffeiNSW6pBBYFfI86`，general subagent，不复用执行者上下文）
- Verdict: `approved`（零 Blocker / 零 Major）
- Evidence:
  - WS-A：cards 死三字段（selectionOwnership/selectionStatePath/onPageChange）从 CardsSchema/definition/renderer 三处消失（仅测试 `.not.toMatch`），实现项 selectionMode/onSelectionChange/onItemClick 保留（`schemas.ts:174-176`）；WizardSchema 无 valueOwnership/valueStatePath，value/defaultValue 文档化 "Seed only ... NOT reactive"，statusPath 保留；button-group value/defaultValue 文档化 seed-only non-reactive（`schemas.ts:184-187`、definition、`button-group-renderer.tsx:40` 注释），无 valueOwnership；canonical duo 未动（steps/collapse valueOwnership/valueStatePath + `useScopeSelector` 仍在）。
  - WS-B：QrCodeSchema 声明 onLoadError（`schemas.ts:317`）；qrcode definition `{key:'onLoadError',kind:'event'}`（`content-renderer-definitions.ts:484`）；`qrcode.tsx:60` 触发 `void onLoadError?.()`；`void error;` 仍在（450/C-22 诊断按 scope 不在此加）。
  - WS-C：carousel payload `{type:'change', activeIndex, item}` 单键无 index（`carousel.tsx:59`）；json-view timer ref-backed + unmount cleanup + clear-before-set（`json-view.tsx:20`/`:21-27`/`:59-60`）。
  - tests：flux-renderers-content 20 files/156、flux-renderers-layout 8 files/60 全绿；`pnpm typecheck` 55/55。
  - deferred honesty：无 in-scope live defect 静默降级（WS-A per-component 全裁定为 (B)，Non-Blocking Follow-ups 的 cards 分页 successor / a11y 专项确属 out-of-scope）。
  - owner-doc sync：6 份 design.md 均反映裁定并引用本 plan WS。
  - Non-blocking observation（trivial）：WS-A 契约诚实性测试用源码 grep 断言而非运行时捕获——对「证明死字段从源码消失」是恰当的（运行时无法轻易断言未实现字段的缺失），且运行时 Proof（qrcode onLoadError 触发、json-view timer 清理）正确使用 spy/mock。无需改动。

Follow-up:

- cards 分页 successor（条件性）：若未来真正引入分页，另立 plan 实现 `onPageChange` 外部分页桥接，再恢复事件声明。
- wizard/cards/button-group 受控/scope 能力 successor（条件性）：若未来需要运行时受控选中/步骤，引入显式 ownership 契约并同时实现 controlled/scope 读/写管线（对齐 steps/collapse canonical duo），再恢复字段声明。
- a11y 专项 successor：cards `role=listitem`+`aria-selected`+tabIndex、carousel 指示器键盘语义（open-audit 自评盲区，另立 a11y pass）。
- 450 计划：负责 qrcode catch 的 dev `console.warn`（C-22）与 carousel memo（O-03）/autoplay（O-04）——与本计划同文件不同关注点，互不冲突。
