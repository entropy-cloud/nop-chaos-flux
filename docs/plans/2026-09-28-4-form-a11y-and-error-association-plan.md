# 2026-09-28-4 表单可访问性与错误关联修复

> Plan Status: draft
> Last Reviewed: 2026-09-28
> Source: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（U1-U3、U6-U8 + 浏览器实测）
> Related: `packages/flux-react/src/field-frame.tsx`、`packages/flux-renderers-form/src/renderers/form.tsx`、`packages/ui/src/components/ui/dialog.tsx`

## Purpose

收口表单族已证实的可访问性缺陷：组合行重复 DOM id 破坏错误关联（已运行时复现）、`aria-required` 无法到达控件、同步校验失败时首错聚焦不触发（已运行时复现）、Dialog 初始焦点未移入（已运行时复现）、key-value 硬编码英文 aria-label、`min-h-touch` 未定义 token 导致移动端触控目标失效。

## Current Baseline

- **U1 重复 id（实测证实）**：`packages/flux-react/src/field-frame.tsx:169-171` 的 `errorId=${name}-error`/`controlId=${name}-control` 仅按 schema name 派生（`reactId` 只用于 label 兜底）；`node-frame-wrapper.tsx:26-27,61` 直传 name。playground `#/lab/combo` 两行实测出现 `name-control`×4、`phone-control`×4 → `aria-describedby` 解析到文档序第一个匹配 id，读屏为第 3 行播报第 1 行错误，且为无效 HTML。`array-editor.tsx:74-75` 已用 `${name}-${item.id}-value` 规避同类问题。
- **U2 同步校验失败无首错聚焦（实测证实）**：空必填表单点击 Submit 后错误提示、`aria-invalid`、`aria-describedby=username-error` 关联均正确，但 `document.activeElement` 停在 BODY。代码 `form.tsx:347-388` 的 focus-first-invalid 订阅 `justStoppedSubmitting && state.submitAttempted`——同步校验失败路径 `submitting` 可能未翻 true，转换不发生。待以失败测试证实精确时序后修复。
- **U3 min-h-touch 未定义**：`select-mobile-renderer.tsx:69` 唯一使用处；tailwind-preset/theme-tokens/mobile.css 均无 `--spacing-touch` → Tailwind v4 丢弃该类，移动端 select 选项行 ≥44px 触控高度从未生效。
- **U6 aria-required 缺失**：`field-frame.tsx:190-206` cloneElement 注入 id/labelledby/describedby/errormessage/invalid 唯独无 aria-required；`:236` 挂在 wrapper label/fieldset（AT 不暴露）；`:241-245` 可见 `*` 为 aria-hidden；date/time/picker/tree-select/transfer/combo 等控件无任何 aria-required（grep 证实）；FieldFrame 已算出含动态 required 规则的 `effectiveRequired`（`:119-168`）但不与控件共享。
- **U7 Dialog 初始焦点（实测证实）**：打开后焦点仍在触发按钮；Esc 关闭后焦点恢复触发按钮（该半边正确）。base-ui 1.3.0 具备 `defaultInitialFocus` 机制（`node_modules/@base-ui/react/esm/dialog/popup/DialogPopup.js:75`），flux Dialog 未生效，根因待定位（`wrap-surface-tab-focus.ts`/portal 时序/initialFocus 配置）。
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

Status: planned
Targets: `packages/flux-react/src/__tests__/`、`packages/flux-renderers-form/src/__tests__/`、`packages/ui`（dialog 测试所在层）

- Item Types: `Proof`

- [ ] Proof: combo 双行场景测试：两行同名字段的 control/error id 互不相同且各自 aria-describedby 指向本行错误节点（当前应红）
- [ ] Proof: 同步校验失败提交测试：提交后 `document.activeElement` 为首个无效控件（当前应红；若测试证实焦点逻辑其实已触发则记录时序证据并转 Phase 3 为复核项）
- [ ] Proof: Dialog 初始焦点测试：打开后 activeElement 在 dialog 内（当前应红）
- [ ] Proof: aria-required 测试：含动态 required 规则的字段在 required 生效后控件带 `aria-required="true"`（当前应红）

Exit Criteria:

- [ ] 四类失败测试就位且当前为红（红证据记录）
- [ ] 测试放置于对应包的既有测试布局中并通过 lint

### Phase 2 - FieldFrame id 唯一化

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`、`node-frame-wrapper.tsx`

- Item Types: `Fix`

- [ ] Fix: `errorId`/`controlId` 并入 reactId/cid 保证同页唯一（如 `${name}-${cid}-error`），label htmlFor、aria-labelledby/controls 同步
- [ ] Fix: 核对既有依赖旧 id 形态的调用点（grep `*-error`/`*-control` 消费面）并同步；array-editor 既有唯一 id 方案保持兼容
- [ ] Phase 1 combo 测试转绿；`packages/flux-react` 全量单测绿

Exit Criteria:

- [ ] combo 双行测试绿；无重复 id（DOM 断言）
- [ ] `pnpm --filter @nop-chaos/flux-react test` 全绿；消费该 id 的包（form/form-advanced/data 抽查）测试绿

### Phase 3 - 提交失败首错聚焦修复

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/form.tsx`

- Item Types: `Fix`

- [ ] Fix: 校验失败路径（含 submitting 未翻转的同步失败）触发首错聚焦；保留既有 bounded-rAF 重试与 scrollToFirstError 语义
- [ ] Phase 1 同步失败聚焦测试转绿；既有 G2-R5 系列 focus 测试保持绿

Exit Criteria:

- [ ] 同步校验失败后焦点落至首错控件（测试绿）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-form test` 全绿

### Phase 4 - aria-required 注入

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`

- Item Types: `Fix`

- [ ] Fix: cloneElement 注入 `'aria-required': effectiveRequired || undefined`；移除 `:236` wrapper 上的无效 aria-required 挂载
- [ ] Fix: 各渲染器静态 `aria-required`/`required` 声明与注入的优先级核对（注入值为准，静态声明不冲突）
- [ ] Phase 1 aria-required 测试转绿；动态 required（规则触发/解除）联动断言

Exit Criteria:

- [ ] 静态与动态 required 场景测试均绿
- [ ] `pnpm --filter @nop-chaos/flux-react test` + form/form-advanced 抽查绿

### Phase 5 - Dialog 初始焦点 + i18n 标签 + min-h-touch token

Status: planned
Targets: `packages/ui/src/components/ui/dialog.tsx`、`packages/flux-renderers-form-advanced/src/key-value.tsx`、`packages/tailwind-preset/src/index.ts`、`packages/theme-tokens/src/styles.css`

- Item Types: `Fix`

- [ ] Fix: 定位 Dialog 初始焦点失效根因（wrapSurfaceTabFocus 时序 / initialFocus 传递 / portal 挂载）并修复；base-ui `defaultInitialFocus` 语义生效（焦点入对话框），Esc 焦点恢复保持
- [ ] Fix: key-value 移动按钮 aria-label 改用 `t('flux.form.moveUp'/'flux.form.moveDown')`（+entry 序数）与 array-editor 同构；缺失 i18n 键补齐（flux-i18n 各 locale）
- [ ] Fix: 新增 `--spacing-touch: 2.75rem` token（tailwind-preset/theme-tokens 既有 token 布局处），`min-h-touch` 类真实产出；select-mobile 选项行高度生效断言
- [ ] Phase 1 Dialog 测试转绿；新增 token/类产出与 aria-label 断言测试

Exit Criteria:

- [ ] Dialog 初始焦点测试绿；Esc 恢复测试保持绿
- [ ] key-value aria-label 断言绿；`pnpm --filter @nop-chaos/flux-i18n test`（如存在）或 i18n 键检查脚本绿
- [ ] 编译后 CSS 含 min-height: 2.75rem 的 touch 类产物（构建产物或样式测试断言）
- [ ] `pnpm --filter @nop-chaos/ui test`、`pnpm --filter @nop-chaos/flux-renderers-form-advanced test` 全绿

## Draft Review Record

- Reviewer / Agent: <<待独立子 agent 填写>>
- Verdict: <<pass | pass-with-minors | revised | degraded>>
- Rounds: <<审查轮数>>
- Findings addressed: <<Blocker/Major 处理记录>>

## Closure Gates

- [ ] 所有 in-scope confirmed live defects（U1/U2/U7 实测缺陷 + U3/U6/U8 静态证实缺陷）已修复且失败测试转绿
- [ ] 行为/契约结果已达成：错误关联、必填播报、首错聚焦、Dialog 初始焦点、触控高度、i18n 标签全部有 focused proof
- [ ] 必要 focused verification 已完成（Phase 1-5 Exit Criteria 全勾）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（hint 常显 U11 在分析报告层已裁定，非本 plan in-scope）
- [ ] 受影响的 owner docs 已同步（`docs/architecture/form-validation.md` 若描述错误关联/id 约定需更新；`--spacing-touch` 若引入新 token 约定更新 styling-system 文档；无变化则明确写 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### hint 常显（U11）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 与 AMIS parity 的既有设计取舍（hint/description 互斥、focus-only），改动属产品视觉决策而非缺陷。
- Successor Required: `no`
- Successor Path: 产品裁定后再立 UI 决策项

## Non-Blocking Follow-ups

- 读屏全流程人工复核清单（错误提交 → 逐字段播报）作为 QA 抽查项记录。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- <<见 Non-Blocking Follow-ups>>
