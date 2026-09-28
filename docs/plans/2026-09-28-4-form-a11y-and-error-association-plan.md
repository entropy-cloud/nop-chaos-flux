# 2026-09-28-4 表单可访问性与错误关联修复

> Plan Status: completed
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（U1-U3、U6-U8 + 浏览器实测）
> Related: `packages/flux-react/src/field-frame.tsx`、`packages/flux-renderers-form/src/renderers/form.tsx`、`packages/ui/src/components/ui/dialog.tsx`

## Purpose

收口表单族已证实的可访问性缺陷：组合行重复 DOM id 破坏错误关联（已运行时复现）、`aria-required` 无法到达控件、同步校验失败时首错聚焦不触发（已运行时复现）、Dialog 初始焦点未移入（已运行时复现）、key-value 硬编码英文 aria-label、`min-h-touch` 未定义 token 导致移动端触控目标失效。

## Current Baseline

- **U1 重复 id（实测证实）**：`packages/flux-react/src/field-frame.tsx:169-171` 的 `errorId=${name}-error`/`controlId=${name}-control` 仅按 schema name 派生（`reactId` 只用于 label 兜底）；`node-frame-wrapper.tsx:26-27,61` 直传 name。playground `#/lab/combo` 两行实测出现 `name-control`×4、`phone-control`×4 → `aria-describedby` 解析到文档序第一个匹配 id，读屏为第 3 行播报第 1 行错误，且为无效 HTML。`array-editor.tsx:74-75` 已用 `${name}-${item.id}-value` 规避同类问题。
- **契约约束（执行期发现，修订 Phase 2 方案）**：`id = ${name}-control` 是冻结的 host-visible 契约（`flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx:50,104-130`，"变更必须在此显式更新"；checkbox/switch 变体 `${name}-control-label` 同冻结）。不能单方面改 control id 格式。因此 U1 修复收敛为：**errorId（及 hintId/descriptionId）按实例唯一化（cid 兜底 reactId 后缀）**——修复错误关联错乱这一实际伤害；controlId 保持 `${name}-control` 契约形态（重复 control id 在 combo 行内仍存在，属契约本身与动态行的张力，记 Non-Blocking Follow-up 转交契约 owner 裁定）。另有 11 个渲染器文件内部独立生成 `${name}-error`（input-number/markdown-editor/period/date-range/input-date/datetime/time/input/textarea/input-choice/upload-field），其 error id 同样需实例唯一化，随本 plan Phase 2 一并机械处理。
- **U2 同步校验失败无首错聚焦（实测证实）**：空必填表单点击 Submit 后错误提示、`aria-invalid`、`aria-describedby=username-error` 关联均正确，但 `document.activeElement` 停在 BODY。根因（独立 review 修正）：`submittingDelay` 默认 0（`form-runtime.ts:118`）时 `executeFormSubmit` 在校验前同步置 `submitting=true`（`form-runtime-submit-flow.ts:279`）并在 finally 复位（`:470-478`）——`justStoppedSubmitting` 转换在同步校验失败时确实发生。缺陷实际位于 `form.tsx:364-368`：转换触发后 `requestAnimationFrame(tryFocusFirstInvalid)` 运行时，React 尚未把含 `aria-invalid="true"` 的重渲染提交到 DOM，`querySelector` 落空即无重试早退（有界重试仅在"找到目标但未获焦"分支 `:377-380` 生效）→ 焦点从未落位。与浏览器实测一致（400ms 后错误已在 DOM、焦点仍在 BODY）。
- **U3 min-h-touch 未定义**：`select-mobile-renderer.tsx:69` 唯一使用处；tailwind-preset/theme-tokens/mobile.css 均无 `--spacing-touch` → Tailwind v4 丢弃该类，移动端 select 选项行 ≥44px 触控高度从未生效。
- **U6 aria-required 缺失**：`field-frame.tsx:190-206` cloneElement 注入 id/labelledby/describedby/errormessage/invalid 唯独无 aria-required；`:236` 挂在 wrapper label/fieldset（AT 不暴露）；`:241-245` 可见 `*` 为 aria-hidden；date/datetime/date-range/picker/tree-select/transfer/combo 等控件无任何 aria-required（10/23 form 渲染器已自行注入，input-time 在内——见 Phase 4 清单）；FieldFrame 已算出含动态 required 规则的 `effectiveRequired`（`:119-168`）但不与控件共享。
- **U7 Dialog 初始焦点（原"实测证实"，执行期改判为测量环境伪缺陷，证据链见 Phase 5 Fix 记录）**：原观察"打开后焦点仍在触发按钮；Esc 关闭后焦点恢复触发按钮"系遮挡视图 rAF 饥饿伪缺陷——真实前台标签页下 base-ui `defaultInitialFocus` 正常生效；flux 侧已加兜底加固（`use-dialog-initial-focus.ts`）+ 契约测试。
- **U8 硬编码英文 aria-label**：`flux-renderers-form-advanced/src/key-value.tsx:213,229`；同文件 `:246` 与 `array-editor.tsx:150,166` 均已用 `t('flux.form.*')`。
- 既有做得好的部分（不动）：错误 alert 角色与关联注入、busy live region、Enter 提交防呆、submitOnChange debounce、Dialog 焦点陷阱 + Tab 兜底 + Esc 焦点恢复。

## Goals

- FieldFrame 派生的 control/error id 在同页多实例（combo/combo 嵌套/array 场景）下全局唯一；错误关联指向本行错误文本。
- 含动态 required 在内的必填状态通过 `aria-required` 到达控件（读屏可感知）。
- 校验失败（无论 submitting 是否翻转）后焦点落至首个可聚焦的无效控件。
- Dialog 打开后初始焦点移入对话框（首焦点或内容元素），Esc 焦点恢复行为保持。
- key-value 移动按钮 aria-label 走 i18n；`min-h-touch` 有真实 token 支撑。

## Non-Goals

- 不改变错误显示的视觉设计、校验规则语义或表单提交流程。
- 不改 `packages/ui` 公共导出面（`packages/ui/src/index.ts` 不动；Dialog 仅内部行为修复）。
- 不处理 transfer 键盘导航、tree chevron 尺寸、scheduling 配色（Plan 5 结果面）。
- 不做 hint 常显（U11，已裁定 deferred，见分析报告）。

## Scope

### In Scope

- `packages/flux-react/src/field-frame.tsx`、`node-frame-wrapper.tsx`
- `packages/flux-renderers-form/src/renderers/form.tsx`（提交失败聚焦时序）
- `packages/ui/src/components/ui/dialog.tsx`（初始焦点根因修复，内部实现）
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/tailwind-preset/src/index.ts` 与/或 `packages/theme-tokens/src/styles.css`（`--spacing-touch` token）
- `packages/flux-i18n` 文案键核对（moveUp/entry 类键若缺则补）
- 上述包 colocated 单测

### Out Of Scope

- styling contract 的类命名体系变化（仅新增既有约定的 spacing token）
- flux-runtime 校验引擎行为
- 其它渲染器族的 a11y

## Failure Paths

| 可测场景编号            | 触发                          | 行为                                                    | 可重试 | 用户可见表现                     |
| ----------------------- | ----------------------------- | ------------------------------------------------------- | ------ | -------------------------------- |
| combo-error-association | combo ≥2 行且某行必填校验失败 | 每行 errorId 唯一，行控件 aria-describedby 指向本行错误 | 是     | 读屏播报本行错误；无重复 id 警告 |
| sync-validation-focus   | 提交时同步校验失败            | 焦点移至首个 aria-invalid 控件的可聚焦目标              | 是     | 键盘/读屏用户直接落在错误字段    |
| dialog-initial-focus    | 打开任意 modal Dialog         | 焦点移入对话框内（默认首焦点），Tab 循环保持            | 是     | 键盘用户 Tab 起点在对话框内      |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化。三类用户可见失败路径（上表）先写失败测试再修复；aria-required 注入与 min-h-touch token 以 DOM/class 断言测试覆盖。

## Execution Plan

### Phase 1 - 失败测试先行（Proof）

Status: completed
Targets: `packages/flux-react/src/__tests__/`、`packages/flux-renderers-form/src/__tests__/`、`packages/ui`（dialog 测试所在层）

- Item Types: `Proof`

- [x] Proof: FieldFrame ARIA 关联改为关联性断言（describedby === errorEl.id，不再锁字面 id）并验证实例唯一 id 生效（field-frame-layout.test.tsx 23/23 绿）
- [x] Proof: 同步校验失败提交测试：jsdom 单测（form-focus-first-error.test.tsx 3/3，断言提交后 activeElement=首错控件）+ 浏览器级 Playwright e2e（tests/e2e/form-sync-validation-focus.spec.ts，#/lab/form 首场景，断言 activeElement.id=username-control + aria-invalid 关联，Chromium 绿）。**修复前红证据结论（执行期如实记录）**：还原 retry 后 jsdom / 节流×8 e2e / 前台 live 全部仍然通过——修复前竞态窗口（rAF 先于 aria-invalid DOM commit）在任何可用环境均未复现；原 U2 "live 实测 activeElement=BODY" 观察与 U7 同源，判为遮挡视图 rAF 饥饿伪缺陷（焦点链 rAF 在无帧环境下永不执行）。retry 保留为机制可靠的加固（竞态窗口确实存在，只是未在可测环境打开），e2e 固化为修复行为的浏览器级回归锁。
- [x] Proof: Dialog 初始焦点测试：打开后 activeElement 在 dialog 内（happy-dom 契约用例 dialog.test.tsx "moves initial focus into the popup after opening via trigger" 绿；live 缺陷证据链与根因改写见 Phase 5 Fix 记录——原"live 已证红"经追查为遮挡视图 rAF 饥饿伪缺陷，见下）
- [x] Proof: aria-required 测试改为断言控件（而非 wrapper）携带注入值（field-frame-layout 修正用例；配合 Phase 4 注入已绿）

Exit Criteria:

- [x] 四类失败测试就位；红证据按执行期裁定记录（U2/U7 原 live 红证据经深查改判为遮挡视图 rAF 饥饿伪缺陷，证据链见 Phase 3/5 Fix 记录；happy-dom 契约测试 + 浏览器级 e2e 为最终门槛）
- [x] 测试放置于对应包的既有测试布局中并通过 lint

### Phase 2 - FieldFrame id 唯一化

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`、`node-frame-wrapper.tsx`

- Item Types: `Fix`

- [x] Fix: FieldFrame errorId/hintId/descriptionId/labelId 并入 `fieldUid`（cid 兜底 reactId）保证同页实例唯一；**controlId 保持 `${name}-control` 契约形态不变**（执行期发现：field-controls-dom-contract.test.tsx 冻结了 host-visible id 契约，单方面改格式会破坏下游——契约与动态行的张力转 Non-Blocking Follow-up 交契约 owner 裁定）
- [x] Fix: input-number 的 aria-describedby/errormessage 改用 FieldFrame 注入链（原自造 `${name}-error` 在 FieldFrame 唯一化后成为悬空引用——本次一并修复）；**其余渲染器内部 errorId 扫描已在本 plan 内完成（原"下一批"收敛回本项）**：注入链优先模式落到 textarea/markdown-editor/input/input-time/date-range/period(3 处)/input-date→DateFieldControl/input-datetime→DateFieldControl/upload-field（`${name}-error` 局部 id 仅作 bare-harness 回退）；自渲染错误 span 的 id 实例化（cid 限定 `${name}-${cid}-source-error`，id 与引用同源变量保持配对）落到 checkbox-group/button-group-select/input-choice(combobox+radio-group)——combo 双行场景不再互撞
- [x] Fix: 消费面同步——field-frame-layout（4 处字面断言改关联断言）、input-number（关联断言）、code-editor integration（关联断言）；array-editor 既有唯一 id 方案不受影响
- [x] Phase 1 combo 测试转绿；`packages/flux-react` 全量单测绿（field-frame-layout 24/24 含新增"同 name 双实例错误 id 互异 + 各行 describedby 指向本行"用例；flux-react 56 文件 521/521）

Exit Criteria:

- [x] combo 双行测试绿；无重复 id（DOM 断言，field-frame-layout.test.tsx "gives same-name instances distinct error ids (combo dual-row)"）
- [x] `pnpm --filter @nop-chaos/flux-react test` 全绿；消费该 id 的包测试绿（form 935/935、form-advanced 1131/1131）

### Phase 3 - 提交失败首错聚焦修复

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`

- Item Types: `Fix`

- [x] Fix: `tryFocusFirstInvalid` 未找到 `[aria-invalid]` 目标时进入有界 rAF 重试（上限 10 帧，覆盖 DOM commit 滞后）；既有"找到但未获焦"重试与 scrollToFirstError 语义保留
- [x] Phase 1 同步失败聚焦测试转绿；既有 G2-R5 系列 focus 测试保持绿（e2e 新增 + jsdom 3/3 + form-validation-ui 13/13）

Exit Criteria:

- [x] 同步校验失败后焦点落至首错控件（测试绿：jsdom form-focus-first-error 3/3 + Chromium e2e form-sync-validation-focus 1/1）
- [x] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿（111 文件/935 用例）

### Phase 4 - aria-required 注入

Status: completed
Targets: `packages/flux-react/src/field-frame.tsx`

- Item Types: `Fix`

- [x] Fix: cloneElement 注入 `'aria-required': effectiveRequired || undefined`；移除 `:236` wrapper 上的无效 aria-required 挂载
- [x] Fix: 各渲染器静态 `aria-required`/`required` 声明与注入的优先级核对（注入值为准，静态声明不冲突）。注意：23 个 form 渲染器中 10 个已自行注入（input-number/button-group-select/slider/checkbox-group/textarea/markdown-editor/input-choice/select-mobile/input-time 等），date/datetime/date-range/tree-select/transfer/combo/picker 确实缺失；且 cloneElement 注入落在渲染器元素 props 而非 DOM 控件——是否达 DOM 取决于各渲染器转发（如 select-mobile `:149` 读 `props.controlProps["aria-required"]`），行为测试即兜底
- [x] Phase 1 aria-required 测试转绿；动态 required（规则触发）联动断言（field-frame-layout "subscribes to dynamic required dependency paths" 扩展：规则触发时控件 aria-required=true）

Exit Criteria:

- [x] 静态与动态 required 场景测试均绿（field-frame-layout 24/24：forwards aria-required + 动态规则触发→控件 aria-required）
- [x] `pnpm --filter @nop-chaos/flux-react test` 全绿（56 文件/522 用例）+ form/form-advanced 抽查绿（935/935、1137/1137）

### Phase 5 - Dialog 初始焦点 + i18n 标签 + 触控高度

Status: completed
Targets: `packages/ui/src/components/ui/dialog.tsx`、`packages/flux-renderers-form-advanced/src/key-value.tsx`、`packages/tailwind-preset/src/index.ts`、`packages/theme-tokens/src/styles.css`

- Item Types: `Fix`

- [x] Fix: 定位 Dialog 初始焦点失效根因（wrapSurfaceTabFocus 时序 / initialFocus 传递 / portal 挂载）并修复；base-ui `defaultInitialFocus` 语义生效（焦点入对话框），Esc 焦点恢复保持。**根因记录（2026-09-28 执行期深查）**：三个原始嫌疑均排除——(1) flux 未传 initialFocus，`defaultInitialFocus` 返回 true 正常；(2) base-ui Dialog 走 `treatPopupAsFloatingElement`（popup 即 floating element），portal 挂载正常；(3) wrapSurfaceTabFocus 仅 keydown 不涉初始焦点。**实证**：happy-dom（未编译）确定性绿；live 可见窗口下反复绿（≥10 轮）；"复现失败"轮次的统一签名是 **rAF 饥饿**——`focus()` 零调用（base-ui 的 enqueueFocus 与 flux 侧兜底均依赖 rAF）、popup 挂载后停留但动画过渡不完成、或秒关并 returnFocus 回 trigger（base-ui 关闭路径正常执行）——均为遮挡/后台 webview（IAB 窗格失焦）下渲染帧停止的特征；`document.visibilityState` visible 时即恢复。**结论**：U7 原"live 已证红"为测量环境伪缺陷（真实用户前台标签页不成立），非产品代码缺陷。**仍落地的加固**：`use-dialog-initial-focus.ts` 兜底 effect（挂载后第 2 帧检查焦点未入 popup 则聚焦首个可 tab 元素；健康路径零操作）+ 3 个单测（丢失自愈/健康 no-op/隐藏候选跳过）+ happy-dom 契约用例；实验期间 vite.config 的 compiler exclude 诊断改动已全部还原。
- [x] Fix: key-value 移动按钮 aria-label 改用 `t('flux.form.moveUp'/'flux.form.moveDown')` + 序数（i18n 键已存在，flux-i18n zh-CN.ts:222-223）；测试定位器从字面名改 data-slot 查询（array-keyvalue-min-max-reorder 12/12 绿）
- [x] Fix: 触控高度落地方式修订（执行期确认）：不引入自定义 `--spacing-touch` token，`select-mobile-renderer.tsx:69` 选项行直接使用标准间距档 `min-h-11`（= 2.75rem = 44px，Tailwind v4 默认 scale 真实产出，等效满足触控目标且少一个自定义 token）；checkbox/switch/radio 触控适配既有断言（choice-touch-adaptation.test.tsx 10/10）+ 新增 select-mobile 选项行 `min-h-11` 断言（select-responsive.test.tsx，7/7 绿）
- [x] Phase 1 Dialog 测试转绿；新增 token/类产出与 aria-label 断言测试（Dialog happy-dom 契约用例 + 兜底 hook 3 单测绿；key-value aria-label 断言此前已绿）

Exit Criteria:

- [x] Dialog 初始焦点测试绿（happy-dom 契约 + 兜底 hook 3 单测）；Esc 恢复既有测试保持绿（ui 全量绿）
- [x] key-value aria-label 断言绿（array-keyvalue-min-max-reorder 12/12）；i18n 键存在（flux-i18n zh-CN.ts moveUp/moveDown，此前已核）
- [x] 触控高度产物修订：使用标准档 `min-h-11`（Tailwind v4 默认 scale = 2.75rem = 44px，无需自定义 token；类产出由 Tailwind 默认 scale 保证），select-mobile 选项行断言 + choice-touch-adaptation 既有断言覆盖（执行方式修订见 Phase 5 Fix 记录）
- [x] `pnpm --filter @nop-chaos/ui test`、`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿（ui 全量绿、form-advanced 1131/1131）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28；r2 为同 reviewer targeted 确认）
- Verdict: pass（r1 fail→修订，r2 确认 pass）
- Rounds: 2
- r2 附注：U6 baseline 的 stale "time" 措辞已于执行前更正（non-blocking cosmetic）
- Findings addressed: r1 Major-1——U2 根因假设（submitting 未翻转）被提交流程反驳，已按 reviewer 机制改写为"rAF 先于 aria-invalid DOM commit 的无重试早退"；移除降级条款（jsdom 意外通过时必须以浏览器级 e2e 为准，Phase 3 保持 Fix）；4 Minor 全部吸收（input-time 已注入的枚举更正、@theme 接线路径、cloneElement 到 DOM 的转发链说明、测试布局备注）。

## Closure Gates

- [x] 所有 in-scope confirmed live defects（U1/U2/U7 实测缺陷 + U3/U6/U8 静态证实缺陷）已修复且失败测试转绿（U2/U7 经执行期深查改判：原 live 复现为遮挡视图 rAF 饥饿伪缺陷，证据链见 Phase 3/5；happy-dom 契约 + e2e 全绿；加固保留）
- [x] 行为/契约结果已达成：错误关联（combo 双行实例唯一 + 12 渲染器注入链/实例化清扫）、必填播报（静态+动态 aria-required）、首错聚焦（e2e + jsdom）、Dialog 初始焦点（契约测试 + 兜底 hook）、触控高度（min-h-11 断言）、i18n 标签（array-keyvalue 12/12）全部有 focused proof
- [x] 必要 focused verification 已完成（Phase 1-5 Exit Criteria 全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（hint 常显 U11 在分析报告层已裁定，非本 plan in-scope；原"10 渲染器 errorId 下一批"已收敛回 Phase 2 完成，非降级）
- [x] 受影响的 owner docs 已同步核查：No owner-doc update required——form-validation.md 未记载错误 id 约定；`${name}-control` 契约未动且 flux-guide 13-testing.md 以 data-field 为主定位契约（id 无关）；未引入 `--spacing-touch` 新 token（用标准档 min-h-11），styling-system 无需更新
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（0 新增红；执行期发现 Plan 1/2 将 table-renderer.tsx 推过 700 行未注册门禁（699→721），本 plan gate 阶段已修复：抽离 use-table-column-layout.ts（纯移动）至 670 行，data 168 文件 1180/1180 绿）

## Deferred But Adjudicated

### hint 常显（U11）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 与 AMIS parity 的既有设计取舍（hint/description 互斥、focus-only），改动属产品视觉决策而非缺陷。
- Successor Required: `no`
- Successor Path: 产品裁定后再立 UI 决策项

## Non-Blocking Follow-ups

- 读屏全流程人工复核清单（错误提交 → 逐字段播报）作为 QA 抽查项记录。
- **`${name}-control` 契约与动态行的张力（交契约 owner 裁定）**：同 schema name 的多实例（combo/array 动态行）下 control id 仍重复（ frozen host-visible 契约，field-controls-dom-contract.test.tsx 冻结，本 plan 不单方面改格式）；本 plan 已使错误关联不再依赖 control id 唯一性（errorId/hintId/descriptionId 实例唯一），重复 control id 的残余影响收敛为"同名行控件 id 选择器不精确"——需契约 owner 权衡下游迁移成本后裁定格式演进（classification: `contract adjudication candidate`；Successor Required: 视 owner 裁定）。

## Closure

Status Note: 五 Phase 全部落地；U1/U3/U6/U8 修复 + U2/U7 经证据链改判为遮挡视图 rAF 饥饿伪缺陷并保留加固与契约测试；12 渲染器 errorId 清扫收敛回本 plan 完成；gate 阶段顺带修复 Plan 1/2 遗留的 table-renderer.tsx 700 行未注册门禁红（纯移动抽离）。audit r1 verdict: revised（2 Major 均为 plan 文本 reconciliation，已修复：Phase 3/4 Exit Criteria 勾选 + controlId 契约张力补记 Non-Blocking Follow-ups）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-09-28；自行复跑 form 935/935、flux-react 522/522、form-advanced 1137/1137、ui 230/230、typecheck/lint 42/42、check exit 0、e2e form-sync-validation-focus 1/1 Chromium）
- Evidence: field-frame.tsx:174-176 fieldUid/errorId/controlId 契约核验；form.tsx:364-391 有界重试；use-dialog-initial-focus.ts:47-71 兜底 + dialog.tsx 接线；errorId 清扫 8 文件抽查（注入链优先 + cid 限定两模式）；field-controls-dom-contract.test.tsx 未动且绿；table-renderer.tsx 670 行 + use-table-column-layout.ts 纯移动等价；U2/U7 改判证据链内部一致（plan :80-81/:144）；vite.config 无诊断残留。verdict revised → 文本修复后达标。

Follow-up:

- 见 Non-Blocking Follow-ups（读屏 QA 清单；`${name}-control` 契约张力待契约 owner 裁定）
