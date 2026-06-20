# E2b Textarea 自动高度与共享输入增强

> Plan Status: completed
> Package: components-improvement
> Work Item: E2b textarea 自动高度
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（E2b 行）、`docs/components/textarea/design.md` §2 Flux 决策表、`docs/components/input-text/design.md` §2（共享输入增强面）、live-repo audit（`TextareaRenderer` + `TextareaSchema` + `@nop-chaos/ui` Textarea）
> Related: E2a（文本输入增强，done — 已建立 `inputEnhancementFieldRules` + `InputGroupFieldControl` 共享面）、X3 naming-conventions（done）、X5 textarea Flux 决策表（done）

## Purpose

把 roadmap 工作项 **E2b textarea 自动高度** 从 `todo` 推进到 `done`：为 `textarea` 补齐 `minRows`/`maxRows` 自动高度（含跨浏览器的高度钳制与超出滚动），并让 textarea 复用 E2a 已落地的共享输入增强面（`showCounter` 字数计数、`clearable` 清空、`trimContents` blur trim、原生 `maxLength` 透传）。当前 `TextareaSchema` 仅多一个 `rows`，且 textarea renderer definition 只注册 `formFieldRules`，E2a 的增强字段对 textarea 完全未接线。

## Current Baseline

经 live-repo audit（2026-06-21）：

- **Schema**：`TextareaSchema extends InputSchema`（`packages/flux-renderers-form/src/schemas.ts:79-81`）只新增 `rows?: number`，无 `minRows`/`maxRows`。`InputSchema`（同文件 L24-42）已含 `showCounter`/`clearable`/`trimContents`/`maxLength`/`prefix`/`suffix`/`nativeAutoComplete`（E2a 落地），`TextareaSchema` 通过继承得到这些**类型**，但 renderer 不消费。
- **Renderer**：`TextareaRenderer`（`packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:421-452`）使用 `@nop-chaos/ui` `Textarea`，硬编码 `rows` 默认 4（L437），**未**透传 `maxLength`/`showCounter`/`clearable`/`trimContents`，无自动高度钳制。
- **Definition 接线**：textarea renderer definition（`packages/flux-renderers-form/src/renderers/input.tsx:370-378`）`fields: formFieldRules` —— **未**注册 `inputEnhancementFieldRules`（E2a 在 `input.tsx:39-52` 建立的常量，仅 input-text/email/password 三 definition 共用，L335/345）。所以增强字段即便写在 schema 里也不会进入 `props` 通道。
- **UI 原语**：`@nop-chaos/ui` `Textarea`（`packages/ui/src/components/ui/textarea.tsx`）是 bare `<textarea data-slot="textarea">`，其 className 已含 `field-sizing-content min-h-16`（L8）。`field-sizing: content` 在 Chromium 123+ 提供基于内容的自动高度，但 Firefox/Safari 支持不全，且无 minRows/maxRows 钳制、无超出滚动。
- **E2a 共享面**：`inputEnhancementFieldRules`（`renderers/input.tsx:39-52`）注册 prefix/suffix/clearable/trimContents/showCounter/nativeAutoComplete/revealPassword；`InputGroupFieldControl`（`renderers/input.tsx:79-152`）渲染 InputGroup addon（prefix/suffix/counter/clear）。textarea 复用前需裁定哪些增强适用于多行（prefix/suffix 视觉上通常不用于 textarea；clearable/trimContents/showCounter/maxLength 适用）。
- **测试先例**：`packages/flux-renderers-form/src/__tests__/input-text-enhancements.test.tsx`（E2a，28 `it()`）覆盖增强面；`input-password-reveal.test.tsx`（E2a-bis）覆盖共存顺序。textarea 现有零散覆盖在 `form-validation-ui.test.tsx`、`input-classname-contract.test.tsx`。
- **图标/依赖**：`lucide-react` 已是 `flux-renderers-form` 依赖（`XIcon` 用于 clear button，E2a 已引入）。

## Goals

- `TextareaSchema` 新增 `minRows?: number`、`maxRows?: number`，作为自动高度的钳制区间。
- 自动高度行为：内容增长时 textarea 高度跟随，到达 `maxRows` 后转为竖向滚动；`minRows` 保证最小可见行数。跨浏览器一致（不依赖 `field-sizing: content` 的有限支持）。
- textarea definition 注册适用的共享增强字段（`showCounter`/`clearable`/`trimContents`/`maxLength`），`TextareaRenderer` 消费它们：
  - `showCounter`：字数计数（有/无 `maxLength` 两种格式），与 input-text 共享命名与格式。
  - `clearable`：值非空且非 disabled/readOnly 时显示清空按钮。
  - `trimContents`：blur 时自动 trim 首尾空白，不污染输入过程。
  - 原生 `maxLength`：透传给 `<textarea maxlength=...>`（E0a 已有编译期校验，此处补原生属性透传）。
- `textarea/design.md` §2 决策表中 `计划实现（E2b）` 行全部翻转为 `实现`；§4/§5/§7/§10/§12 同步。
- 每项能力配有 focused 单测。

## Non-Goals

- `prefix`/`suffix` 用于 textarea（多行前后缀视觉不典型，且 InputGroup 包裹多行控件会破坏 `field-sizing`/auto-height 测量；决策表未列为 E2b 项，标 `暂不实现`）。
- 富文本/Markdown 模式（决策表 `不采纳`，用独立 markdown renderer）。
- amis `borderMode`（决策表 `不采纳`）。
- 字数统计的「统计汉字为 2 字符」等加权规则（首版为字符数 length，与 input-text 一致）。
- E2a deferred 的 autoComplete（data-source 异步建议下拉）—— 独立 successor（X4/autocomplete-suggestions），不并入本 plan。

## Scope

### In Scope

- `packages/flux-renderers-form/src/schemas.ts`：`TextareaSchema` 新增 `minRows?: number`、`maxRows?: number`。
- `packages/flux-renderers-form/src/renderers/input.tsx`：textarea renderer definition 注册适用的增强字段（新增 `textareaEnhancementFieldRules` 或复用 `inputEnhancementFieldRules` 的子集 —— Phase 1 裁定）。
- `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`：`TextareaRenderer` 增强 —— auto-height 钳制（ref 测量 scrollHeight 或 CSS min/max-height，Phase 1 裁定）、`showCounter` 渲染、`clearable` 清空按钮、`trimContents` blur trim、原生 `maxLength` 透传。
- `packages/flux-renderers-form/src/__tests__/textarea-enhancements.test.tsx`（新建或扩既有）：focused 用例。
- `docs/components/textarea/design.md`：§2 决策表翻转 + §4 schema + §5 字段分类 + §7 自动高度 local state 约束 + §10 DOM marker + §12 风险。
- `docs/components/existing-components-improvement-roadmap.md`：E2b `todo`→`done`（closure 后）。
- `docs/logs/2026/06-21.md`（或执行当日）：E2b 收口条目。

### Out Of Scope

- 见 Non-Goals 全部条目。
- e2e/Playwright（单测覆盖足够；auto-height 是纯前端 local 测量/样式）。

## Failure Paths

| 场景编号                 | 触发                                      | 行为                                             | 可重试 | 用户可见表现      |
| ------------------------ | ----------------------------------------- | ------------------------------------------------ | ------ | ----------------- |
| e2b-autoheight-grow      | 内容行数从 2 增到 10，`maxRows: 5`        | 高度增长到 5 行后停止，超出部分出现竖向滚动      | 否     | 5 行可见 + 滚动条 |
| e2b-autoheight-min       | 内容为空，`minRows: 3`                    | textarea 保持 3 行最小高度                       | 否     | 至少 3 行高       |
| e2b-clearable-disabled   | `clearable: true` + `disabled: true`      | 不渲染清空按钮                                   | 否     | 无清空入口        |
| e2b-clearable-readonly   | `clearable: true` + `readOnly: true`      | 不渲染清空按钮                                   | 否     | 无清空入口        |
| e2b-trim-all-whitespace  | `trimContents: true`，blur 时值为 `"   "` | trim 后值为 `""`                                 | 否     | 输入框清空        |
| e2b-counter-no-maxlength | `showCounter: true` 但无 `maxLength`      | 显示 `当前字数`                                  | 否     | `12` 格式         |
| e2b-counter-maxlength    | `showCounter: true` + `maxLength: 100`    | 显示 `当前 / 上限`                               | 否     | `12 / 100` 格式   |
| e2b-native-maxlength     | `maxLength: 100`，输入到第 101 字符       | 原生截断（`<textarea maxlength>` 生效）          | 否     | 无法继续输入      |
| e2b-maxrows-without-min  | 仅 `maxRows: 6`，无 `minRows`             | 最小高度退回 `rows`（默认 4）或 1，上限钳制 6 行 | 否     | 1-6 行区间自适应  |

## Test Strategy

档位选择：**建议有测**

本档选择：`建议有测`

理由：textarea 自动高度 + 共享增强是 P1 高频字段，但非鉴权/对外 API/核心回归。auto-height 的「maxRows 钳制 + 超出滚动」与「trimContents 不污染输入过程」是易回归契约，必须有 focused 单测验证行为结果（如 `scrollHeight` 钳制、blur trim 时机、disabled/readOnly 隐藏清空）。Proof 紧随 Fix，不强制 test-first。

## Execution Plan

### Phase 1 - schema 字段 + 自动高度机制裁定 + 决策表准备

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`、`packages/flux-renderers-form/src/renderers/input.tsx`、`docs/components/textarea/design.md`

- Item Types: `Decision | Fix`

- [x] **Decision**：自动高度实现机制裁定 —— 采用 (A) JS ref 测量 `scrollHeight`（跨浏览器一致，主动 set height）为权威路径，`minRows`/`maxRows` 同时换算为 `min-height`/`max-height` CSS 兜底。理由：Firefox/Safari 无 `field-sizing: content` 支持，纯 CSS 方案 (B) 无法主动 set height 导致测量不一致；保留既有 `field-sizing-content` 作为 Chromium 渐进增强。最终裁定写入 design.md §7/§12。
- [x] **Decision**：增强字段接线裁定 —— 新建 `textareaEnhancementFieldRules` 显式子集常量（注册 `{ rows, minRows, maxRows, clearable, trimContents, showCounter, placeholder, minLength, maxLength, pattern, validate, hiddenFieldPolicy }`），不复用 `inputEnhancementFieldRules`（prefix/suffix/nativeAutoComplete/revealPassword 不适用于多行）。理由：显式子集避免 schema 误用且 self-documenting。
- [x] `TextareaSchema` 新增 `minRows?: number`、`maxRows?: number`
- [x] textarea renderer definition（`input.tsx:370-378`）`fields` 注册增强字段子集
- [x] `textarea/design.md` §2 决策表 `计划实现（E2b）` 行翻 `实现中（E2b）`；§4 补 `minRows`/`maxRows`；§5 字段分类同步

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-form typecheck` 通过，`TextareaSchema.minRows`/`maxRows` 类型可见
- [x] textarea definition `fields` 含 showCounter/clearable/trimContents/maxLength 注册项
- [x] design.md §2 标 `实现中（E2b）`；§4/§5 同步；当日 log 记录两项 Decision 理由

### Phase 2 - 自动高度（minRows/maxRows 钳制）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`docs/components/textarea/design.md`

- Item Types: `Fix | Proof`

- [x] `TextareaRenderer` 接入 auto-height：ref 持有 `<textarea>`，useEffect 在 textareaValue/autoHeightEnabled/minRows/maxRows 变化时将其 `height` 设为 `auto` 再读 `scrollHeight`，按 `minRows`/`maxRows` × `resolveTextareaLineHeightPx()` 像素区间钳制后写回 `height`；lineHeight 取 `getComputedStyle` 解析值，回退 `fontSize*1.5`，再回退常量 24px（Phase 1 Decision 1 裁定 (A) JS 测量为权威路径）
- [x] 超过 `maxRows` 时 `<textarea>` 出现竖向滚动（`overflow-y: auto`）；不足 `minRows` 时保持最小高度
- [x] 无 `minRows`/`maxRows` 时回退当前行为（`rows` 默认 4，effect early-return，无主动测量，不破坏 E2a 前的 baseline）
- [x] auto-height 测量状态为 local（不写表单值，`form-state-probe` 断言 form store 值不变；design.md §7 约束）
- [x] focused 单测覆盖 Failure Path `e2b-autoheight-grow` / `e2b-autoheight-min` / `e2b-maxrows-without-min`（`installScrollHeightMock` 在 `HTMLTextAreaElement.prototype.scrollHeight` 上 mock lines × lineHeight；jsdom `lineHeight='normal'` → fallback fontSize 16px × 1.5 = 24px）

Exit Criteria:

- [x] `maxRows` 声明时内容超出后高度被钳制并出现滚动；`minRows` 保证最小高度
- [x] 无 minRows/maxRows 时 textarea 渲染与当前 baseline 一致（无行为漂移）
- [x] auto-height 测量不触发 form value change
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` auto-height 用例全过；design.md §2 auto-height 行翻 `实现`

### Phase 3 - 共享增强消费（showCounter / clearable / trimContents / 原生 maxLength）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`、`docs/components/textarea/design.md`

- Item Types: `Fix | Proof`

- [x] `showCounter: true` 时渲染计数元素（`<span data-slot="textarea-counter">`），有 `maxLength` 显示 `当前 / max`，无 `maxLength` 仅显示 `当前`；随 onChange 实时更新；位置置于 textarea 下方独立行（`data-slot="textarea-footer"`，flex justify-end），避免 InputGroup 包裹破坏 auto-height
- [x] `clearable: true` 且值非空且非 disabled/readOnly 时渲染清空按钮（`data-slot="textarea-clear"`，XIcon），点击清值为 `''`；disabled/readOnly 不渲染
- [x] `trimContents: true` 时 onBlur 对值 `String(value).trim()` 再写入 form runtime；不影响 onChange
- [x] 原生 `maxLength` 声明时透传 `<textarea maxlength=...>`（与编译期校验双重生效，对齐 input-text E0a 模式）
- [x] counter/clear 与 auto-height 共存（counter 行在 textarea 外，不参与 auto-height 测量）

Exit Criteria:

- [x] `showCounter`/`clearable`/`trimContents`/原生 `maxLength` 各自行为成立且与 auto-height 共存（Failure Path 全覆盖）
- [x] `clearable` + disabled/readOnly 不渲染清空按钮（`e2b-clearable-disabled`/`e2b-clearable-readonly`）
- [x] `trimContents` 仅 blur 时 trim，输入过程保留（`e2b-trim-all-whitespace`）
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 增强用例全过；design.md §2 对应行翻 `实现`

### Phase 4 - owner-doc 同步 + roadmap 收口

Status: completed
Targets: `docs/components/textarea/design.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/components/amis-baseline-matrix.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] anti-hollow 抽查：auto-height 测量（useEffect 命令式 style）+ 各增强字段（counterText/showClearButton/footer JSX 真实渲染 + textareaEnhancementFieldRules 注册可达）真实在 textarea 运行时路径生效（非注册不可达）
- [x] `textarea/design.md` §2 无残留 `计划实现（E2b）`/`实现中（E2b）`；§4/§5/§7（auto-height local state）/§10（`data-slot="textarea-counter"`/`textarea-clear`/`textarea-wrapper`/`textarea-footer` marker）/§12（auto-height 跨浏览器风险、不写表单值）同步
- [x] `existing-components-improvement-roadmap.md`：E2b `todo`→`done`（closure audit 通过后；不在本 phase 提前改）
- [x] `amis-baseline-matrix.md` textarea 行 retained 决策同步（capability addition 不改变 retained/folded 决策 → No update required）
- [x] `docs/logs/` 当日条目汇总 E2b 全 phase + 验证结果

Exit Criteria:

- [x] design.md 无残留 E2b 占位标签
- [x] anti-hollow 抽查写入当日 log
- [x] `docs/logs/` 当日条目含 E2b 收口段

## Draft Review Record

> 待 `REVIEW_PLANS` flow step 由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh REVIEW_PLANS sub-agent (2026-06-21)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 无 Blocker / Major。Minor（不阻塞）：(1) Phase 2/3 Exit Criteria 将 design.md 同步与 docs/logs 条目合并进既有 bullet 而非独立 checkbox，由 Phase 4 统一日志兜底；(2) `## Test Strategy` 同时出现「档位选择」与「本档选择」两行，文本冗余。两者保留给下游 closure/deep audit 处理。

## Closure Gates

> 关闭条件：本 section + 每 Phase Exit Criteria 全 `[x]`，且独立 closure audit 通过。

- [x] `minRows`/`maxRows` 自动高度（含超出滚动、最小高度）live 且 focused 单测齐全
- [x] `showCounter`/`clearable`/`trimContents`/原生 `maxLength` 在 textarea live 且 focused 单测齐全
- [x] 自动高度与共享增强共存无冲突（counter 行不污染 auto-height 测量）
- [x] 无 `minRows`/`maxRows` 时 textarea 行为与 E2a 前 baseline 一致（无漂移）
- [x] 自动高度测量为 local state，不写表单值
- [x] `textarea/design.md` §2/§4/§5/§7/§10/§12 同步，决策表 E2b 行全 `实现`
- [x] `existing-components-improvement-roadmap.md` E2b `todo`→`done`
- [x] `amis-baseline-matrix.md` textarea 行同步（No update required — capability addition）
- [x] anti-hollow：auto-height + 增强字段运行时可达，无空壳
- [x] 不存在被静默降级到 deferred 的 in-scope live defect / contract drift
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### textarea 的 prefix/suffix（多行前后缀）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 多行控件的前后缀视觉不典型，且 InputGroup 包裹会破坏 auto-height 的 scrollHeight 测量与 `field-sizing` 行为。决策表未列为 E2b 项。需求窄，独立于自动高度能力。
- Successor Required: no
- Successor Path: 归 E3 P2 体验完善按需评估。

## Non-Blocking Follow-ups

- 字数统计的加权规则（汉字计 2 字符等）后续若有需求归 counter formatter 层独立评估（首版为 `String(value).length`）。
- `field-sizing: content` 在不支持浏览器是否完全等价于 JS 测量路径，可后续 a11y/视觉一致性复盘时抽查。

## Closure

Status Note: E2b 全 4 Phase 执行完成并收口。textarea 已具备 minRows/maxRows 自动高度（JS ref 测量 scrollHeight 为权威路径，含超出滚动与最小高度钳制，跨浏览器一致）+ showCounter/clearable/trimContents/原生 maxLength 共享增强消费。所有 in-scope checklist 已勾选；roadmap E2b `todo`→`done`；amis-baseline-matrix textarea 行 No update required（capability addition）；design.md §2/§4/§5/§7/§10/§12 全同步；daily log 记录证据。

Closure Audit Evidence:

- Reviewer / Agent: EXEC_PLANS executor (2026-06-21)
- Evidence:
  - live code: `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx` `TextareaRenderer`（auto-height useEffect + footer counter/clear/trim/maxLength）；`packages/flux-renderers-form/src/renderers/input.tsx` `textareaEnhancementFieldRules` + textarea definition `fields`；`packages/flux-renderers-form/src/schemas.ts` `TextareaSchema.minRows/maxRows`
  - focused proof: `packages/flux-renderers-form/src/__tests__/textarea-enhancements.test.tsx`（23 用例：Phase 2 auto-height 7 + Phase 3 增强 16，覆盖全部 Failure Path `e2b-autoheight-grow`/`e2b-autoheight-min`/`e2b-maxrows-without-min`/`e2b-clearable-disabled`/`e2b-clearable-readonly`/`e2b-trim-all-whitespace`/`e2b-counter-no-maxlength`/`e2b-counter-maxlength`/`e2b-native-maxlength`）
  - 验证：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26（1 pre-existing useVirtualizer warning，与本 plan 无关）；`pnpm --filter @nop-chaos/flux-renderers-form test` = 33 files / 291 tests 全过（apps/playground 1 例 pre-existing 失败与本 plan 无关）
  - daily log: `docs/logs/2026/06-21.md`（E2b 收口段）
  - roadmap: `docs/components/existing-components-improvement-roadmap.md` E2b `done`

Follow-up:

- prefix/suffix 多行前后缀归 E3 P2 评估（见 `Deferred But Adjudicated`，多行不典型 + InputGroup 包裹破坏 auto-height 测量）
- 字数统计加权规则（汉字计 2 字符等）首版为 `String(value).length`，后续若有需求归 counter formatter 层独立评估
