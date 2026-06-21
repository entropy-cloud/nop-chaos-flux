# E3 表单输入控件增强（input-number 长按步进 + array-editor/key-value min/max+reorder）

> Plan Status: completed
> Mission: components-improvement
> Work Item: E3 form input controls（input-number/array-editor/key-value 子项）
> Last Reviewed: 2026-06-22 (closure-audit pass by independent fresh-session sub-agent)
> Source: `docs/components/existing-components-improvement-roadmap.md`（E3 P2 行「input-number 长按步进」「array-editor/key-value min/max+reorder」）、`docs/components/existing-components-improvement-detail.md` §B（input-number L159-167 / key-value L171-186 / array-editor L190-207）、`docs/components/{input-number,array-editor,key-value}/design.md`
> Related: `docs/plans/2026-06-21-0255-x5-flux-decision-tables-plan.md`（X5：input-number 是命名范本源但未重命名为 Flux 决策表；array-editor/key-value 未覆盖）、`docs/plans/2026-06-21-2146-1-x1-doaction-command-family-unification-plan.md`（X1：array-editor/key-value design.md §8 已列 `component:moveItem` 为 future）

## Purpose

把三个表单输入控件从**当前最小可用**补齐为**覆盖常见 P2 输入交互**：

- **input-number**：补齐**长按连续步进**（stepper 按钮按住不放 → 连续递增/递减），当前仅单次离散步进（`handleStep` 单次）。这是 amis `rc-input-number` 内建能力，数字输入刚需。同时把 `input-number/design.md` §2 从「AMIS 对照表」重命名为「Flux 决策表」（它是 X5 命名范本源但自身尚未转换）。
- **array-editor / key-value**：补齐**可配置 `minItems`/`maxItems`**（当前硬编码 `minItems:1`、无上限）与**重排**（上下移动按钮，对接 form runtime 已有的 `moveValue` API）。两者是同包（`flux-renderers-form-advanced`）兄弟复合编辑器，共享同一 gap 模式，合并收口（遵循 plan guide Rule 24/26）。

三者同属表单输入交互结果面（输入控件的值正确性与列表编辑能力），合并为单 owner plan。

## Current Baseline

- **input-number**：`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:25-179`（InputNumberRenderer）；`packages/flux-renderers-form/src/schemas.ts:233-250`（InputNumberSchema，已含 `step/precision/min/max/showStepper/keyboard`）。`handleStep` L76-86 **单次离散步进**（`current + direction * step` → clamp → precision），**无长按/连续步进**：stepper 按钮（L150-173）仅 `onClick`，无 `onPointerDown`/`setInterval`/`requestAnimationFrame`。`handleKeyDown` L88-97 方向键单步，无 `event.repeat` 处理。`docs/components/input-number/design.md` §2 L13-31 是「AMIS 功能评估与首版决定」表（**X5 命名范本源**，但标题仍为 AMIS 对照、未转换为 Flux 决策表主语）。仓库内**无任何长按/连续步进基础设施**（greenfield）。
- **array-editor**：`packages/flux-renderers-form-advanced/src/array-editor.tsx`（`ArrayEditorRenderer` L174-399、renderer def L401-424）；`packages/flux-renderers-form/src/schemas.ts:224-226`（`ArrayEditorSchema` 仅 `itemLabel?`）。validation 硬编码 `minItems:1`（L413-421），**无 `maxItems`**，**无 reorder/move/insert**（仅 append L366-396 + remove L273-291）。`array-editor/design.md` §8 L42-43 列 `component:addItem/removeItem/moveItem` 为 future，注明 form runtime 已有 append/insert/remove/move API 可对接。`design.md` §2 仅 2 bullet（L10-11），**无 Flux 决策表（X5 未覆盖）**。
- **key-value**：`packages/flux-renderers-form-advanced/src/key-value.tsx`（`KeyValueRenderer` L228-449、renderer def L451-489）；`packages/flux-renderers-form/src/schemas.ts:213-216`（`KeyValueSchema` 仅 `addLabel?`/`uniqueKeys?`）。validation 硬编码 `minItems:1`（L466-471），**无 `maxItems`**，**无 reorder/move**（仅 append L420-446 + remove L307-328）。`design.md` §2 仅 2 bullet，**无 Flux 决策表（X5 未覆盖）**。
- **dnd 基础设施**：仓库**无共享 dnd/sortable 工具**。`@dnd-kit/core`+`@dnd-kit/sortable`+`@dnd-kit/utilities` 已是 `packages/flux-renderers-form-advanced/package.json`（L16-18）依赖（仅 condition-builder 使用）。table E1c 行拖拽（`use-row-drag-sort.ts`）用原生 HTML5 DnD，table 专属不可直接复用。form runtime 已有 `moveValue`（array-editor design.md §8 L44 引用）。
- ui 层可用：`@nop-chaos/ui` Button（移动按钮）、Tailwind（按钮样式）。

## Goals

- **input-number**：stepper 按钮支持长按连续步进（pointer-down → 延迟触发 → 间隔重复 → pointer-up/leave/blur 取消）；连续步进复用 `handleStep` 的 clamp+precision 逻辑，不绕过 min/max。`input-number/design.md` §2 重命名为 Flux 决策表（列主语改为能力/采纳/不采纳/理由）。
- **array-editor / key-value**：`ArrayEditorSchema`/`KeyValueSchema` 新增 `minItems?: number`（缺省 1，覆盖硬编码）/`maxItems?: number`（缺省无上限）；validation 读 schema 而非硬编码。新增**重排**（每行上移/下移按钮，调 form runtime `moveValue`）；达到 minItems 时禁用删除，达到 maxItems 时禁用新增。
- array-editor/key-value 两个 design.md 补齐 Flux 决策表节（§2，X5 扩展），`component:moveItem` 从 future 翻转为「实现」。
- focused 单测覆盖：长按步进触发与取消、min/max 约束生效（validation 读 schema）、move 后值顺序正确、边界禁用态。
- playground 示例 + e2e + `examples.manifest.json` 登记。

## Non-Goals

- 不实现 input-number `formatter`/`parser`/`kilobitSeparator`/`unitOptions`/`big`/`displayMode`/`showAsPercent` —— `design.md` §2 L25-31 已逐项裁定「不实现」。
- 不实现 array-editor 多列/任意 per-item schema/tabs 模式/扁平值输出 —— DESIGN-ACK-NOT-IMPL（`design.md` §2 L11,23）。
- 不实现 key-value 类型化/schema 驱动 value cell/嵌套对象编辑 —— DESIGN-ACK-NOT-IMPL（`design.md` §2 L11）。
- 不实现拖拽重排（drag-and-drop）—— 本 plan 用上下移动按钮作为 reorder 基线机制（可观测、简单、对接 moveValue）；drag 用 @dnd-kit 可行但增加复杂度与 a11y 负担，归 Deferred（裁定 non-blocking 理由）。
- 不实现 array-editor item 复制/copyable、deleteConfirmDialog、addable/removable toggle —— 归后续。
- 不实现 key-value 重复 key inline 高亮（仅提交时 uniqueBy 消息，当前已覆盖）。
- 不覆盖 flex/page/tabs/tree 等其它 E3 组件（归 Plan 1/3）。

## Scope

### In Scope

- `InputNumberSchema` 无新字段（长按是 stepper 交互行为，复用 showStepper）；`input-number-renderer.tsx` 新增长按连续步进逻辑（pointer-down 延迟 + 间隔重复 + 取消）。
- `input-number/design.md` §2 重命名为 Flux 决策表（转换列主语）+ 长按步进行（实现）。
- `ArrayEditorSchema`/`KeyValueSchema` 新增 `minItems?`/`maxItems?`；validation contributor 读 schema 替代硬编码 1。
- array-editor/key-value 每行新增上移/下移按钮（调 `currentForm.moveValue`）；边界禁用（首行禁上移、末行禁下移、minItems 禁删、maxItems 禁增）。
- array-editor/key-value design.md 新建 Flux 决策表节（§2）。
- focused 单测（RED→GREEN）。
- playground 示例 + `examples.manifest.json` 登记 + e2e。

### Out Of Scope

- input-number formatter/kilobitSeparator/unitOptions/big/displayMode/showAsPercent（已裁定不实现）。
- array-editor 多列/任意 item schema/tabs/扁平值（DESIGN-ACK-NOT-IMPL）。
- key-value 类型化 value schema/嵌套对象（DESIGN-ACK-NOT-IMPL）。
- 拖拽重排（Deferred：移动按钮已满足 reorder 契约）。
- array-editor item 复制/deleteConfirm/addable-removable toggle（归后续）。

## Failure Paths

| 场景编号                 | 触发                                     | 行为                                                              | 可重试 | 用户可见表现       |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------------- | ------ | ------------------ |
| longpress-cancel         | 长按中 pointer-up/pointer-leave/blur/ESC | 立即停止连续步进，保留最后一次值                                  | 否     | 步进停止           |
| longpress-clamp          | 连续步进越过 min/max                     | clamp 到边界后停止连续步进（不溢出）                              | 否     | 值停在 min/max     |
| maxitems-reached         | 已达 maxItems 时点新增                   | 新增按钮 disabled                                                 | 否     | 按钮禁用，无法新增 |
| minitems-remove          | 已达 minItems 时点删除                   | 删除按钮 disabled                                                 | 否     | 按钮禁用，无法删除 |
| move-first-row           | 首行点上移                               | 上移按钮 disabled（无操作）                                       | 否     | 按钮禁用           |
| movevalue-scope-fallback | 无 form runtime（scope owner 回退模式）  | 镜像 append/remove 回退：调 `scope.update` 重排，按钮保持 enabled | 否     | 移动仍生效         |

## Test Strategy

本档选择：`必须自动化`

理由：input-number 长按步进影响数值字段的值正确性（存什么值进 form runtime）；array-editor/key-value 的 min/maxItems 影响校验正确性，reorder 影响列表数据顺序（核心表单数据回归路径）。按 plan guide「鉴权、对外 API 契约、核心回归路径应选必须自动化」，选「必须自动化」：Proof-before-Fix，先写 RED 用例锁定预期值/顺序/边界，再实现。长按时序用 fake timer 测断点；reorder 断言 moveValue 调用与值顺序。

## Execution Plan

### Phase 1 - X5 决策表 + 关键裁定

Status: completed
Targets: `docs/components/input-number/design.md`、`docs/components/array-editor/design.md`、`docs/components/key-value/design.md`

- Item Types: `Decision`、`Fix`

- [x] **Fix**：`input-number/design.md` §2 重命名为「Flux 决策表」（列主语从 AMIS 功能改为「能力 / 采纳 / 不采纳 / 理由」），保留现有 L15-31 裁定内容，新增「长按连续步进」行（实现）+ 「formatter/parser」「kilobitSeparator」「unitOptions」「big」「displayMode」「showAsPercent」不采纳行（已有，确认主语转换）。
- [x] **Fix**：`array-editor/design.md` 新建 §2 Flux 决策表节，列：`minItems`/`maxItems`（实现）、reorder 上移/下移（实现）、`component:moveItem`（实现，从 future 翻转）、多列/任意 item schema（不采纳/后续 + 理由）、拖拽排序（不采纳/后续 + 移动按钮已满足 + 理由）、item 复制/deleteConfirm（后续 + 理由）。
- [x] **Fix**：`key-value/design.md` 新建 §2 Flux 决策表节，列：`minItems`/`maxItems`（实现）、reorder（实现）、`component:moveItem`（实现）、类型化 value schema/嵌套对象（不采纳/后续 + 理由）、拖拽（不采纳/后续 + 理由）、重复 key inline UI（后续 + 理由）。
- [x] **Decision**：裁定长按步进时序 —— 初始延迟（如 400ms）后开始重复，重复间隔（如 80ms）；复用 handleStep 的 clamp+precision；pointerup/pointerleave/blur/ESC 取消。结论写入 `input-number/design.md`。
- [x] **Decision**：裁定 reorder 机制 —— 采用上下移动按钮（非 drag），对接 form runtime `moveValue(name, from, to)`；无 form runtime（scope owner 回退）时镜像现有 append/remove 的 scope-owner 回退路径（仍调 `scope.update` 重排，按钮保持 enabled），而非 disabled。结论写入 array-editor/key-value design.md。
- [x] **Decision**：裁定 maxItems 达到时的「新增」UX —— 新增按钮 disabled（非隐藏），保留可发现性。结论写入 design.md。

Exit Criteria:

- [x] 三个 design.md 各含 §2 Flux 决策表节（live repo 可读，input-number 为重命名、array-editor/key-value 为新建）。
- [x] 长按时序/reorder 机制/maxItems UX 三条 Decision 结论明确，无歧义。

### Phase 2 - Focused Proof（RED 基线）

Status: completed
Targets: `packages/flux-renderers-form/src/__tests__/input-number-long-press.test.tsx`（新建）、`packages/flux-renderers-form-advanced/src/__tests__/array-keyvalue-min-max-reorder.test.tsx`（新建）

- Item Types: `Proof`

- [x] input-number RED 用例（fake timer）：
  - stepper 按钮 pointer-down → 初始延迟后连续触发多次 handleStep（用 vi.useFakeTimers + advance）。
  - 连续步进越 max → clamp 停止（Failure Path `longpress-clamp`）。
  - pointer-up → 停止连续步进（Failure Path `longpress-cancel`）。
  - pointer-leave → 停止。
  - showStepper=false → 无 stepper 按钮（无回归）。
- [x] array-editor/key-value RED 用例：
  - `minItems: 2` 初始 2 行 → 删除按钮 disabled（Failure Path `minitems-remove`）。
  - `maxItems: 3` 已 3 行 → 新增按钮 disabled（Failure Path `maxitems-reached`）。
  - 缺省 minItems/maxItems → minItems=1 回退、无上限（无回归）。
  - 上移按钮调用 `moveValue(name, index, index-1)` → 值顺序交换；首行上移 disabled（Failure Path `move-first-row`）。
  - 下移按钮调用 `moveValue(name, index, index+1)` → 末行下移 disabled。
  - 无 form runtime（scope owner 回退）→ 移动按钮仍 enabled，调 `scope.update` 重排（Failure Path `movevalue-scope-fallback`）。

Exit Criteria:

- [x] 两个测试文件存在，运行全部 RED。
- [x] 用例覆盖 Goals 中值正确性/顺序/边界所有可观测行为 + 六条 Failure Path。

### Phase 3 - input-number 长按步进实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`

- Item Types: `Fix`

- [x] `input-number-renderer.tsx`：stepper 按钮 `onPointerDown` → 启动初始延迟 timer（Phase 1 Decision 时序）→ 延迟后启动间隔 timer 重复 `handleStep(direction)`；`onPointerUp`/`onPointerLeave`/`onBlur` 清理 timer（Failure Path `longpress-cancel`）；连续步进复用 clamp+precision，越界停止（Failure Path `longpress-clamp`）。
- [x] 长按步进用 `event.preventDefault` 避免 text selection；保持 `onClick` 单次步进兼容（短按仍单步）。**关键**：若 pointer-up 发生在初始延迟已触发连续步进之后，需用 `steppedViaLongPressRef` 守卫抑制后续 `onClick` 的多余单步（避免长按释放后多走一步）。
- [x] Phase 2 input-number RED 用例全部 GREEN。

Exit Criteria:

- [x] Phase 2 input-number 用例 GREEN；既有 input-number 测试套件无回归。
- [x] live repo 核对：stepper 按钮 onPointerDown 真实启动 timer（grep 非空），取消路径清理 timer（非空壳）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form typecheck`）。

### Phase 4 - array-editor/key-value min/max + reorder 实现（GREEN）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/array-editor.tsx`、`packages/flux-renderers-form-advanced/src/key-value.tsx`、`packages/flux-renderers-form/src/schemas.ts`

- Item Types: `Fix`

- [x] `schemas.ts`：`ArrayEditorSchema`/`KeyValueSchema` 新增 `minItems?: number`（缺省 1）/`maxItems?: number`（缺省无上限）。
- [x] `array-editor.tsx`/`key-value.tsx`：validation contributor 读 schema `minItems`（替代硬编码 1）+ 新增 `maxItems` 校验规则。
- [x] `array-editor.tsx`/`key-value.tsx`：每行新增上移/下移按钮（marker `data-slot="array-editor-move-up"`/`-move-down`、`key-value-move-up`/`-move-down`），调 `currentForm.moveValue(name, from, to)`；边界 disabled（首行/末行/minItems 删/maxItems 增）；无 form runtime 时镜像 append/remove 回退（调 `scope.update` 重排，按钮 enabled，Failure Path `movevalue-scope-fallback`）。
- [x] Phase 2 array-editor/key-value RED 用例全部 GREEN。

Exit Criteria:

- [x] Phase 2 array-editor/key-value 用例 GREEN；既有 flux-renderers-form-advanced 测试套件无回归（仅 `key-value.test.tsx` 一处旧用例按新契约调整为 `minItems: 0`，保留其 scope-sync 验证意图）。
- [x] live repo 核对：validation 真实读 schema minItems/maxItems（grep 非空，非硬编码 1）；moveValue 真实被调用（非空壳）。
- [x] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck`）；跨模块 workspace typecheck 通过。

### Phase 5 - owner-doc 同步与 playground 示例

Status: completed
Targets: `docs/components/{input-number,array-editor,key-value}/design.md`、`apps/playground/src/`、`docs/components/examples.manifest.json`

- Item Types: `Fix`

- [x] input-number/array-editor/key-value design.md §4（schema）/§5（字段分类）/§10（DOM marker）同步落地内容，与 runtime 一致。
- [x] playground 新增「表单输入控件增强」示例页（演示 input-number 长按步进、array-editor/key-value min/max + 上下移动），注册路由。
- [x] `examples.manifest.json` 登记新示例。（裁定：三个组件 input-number/array-editor/key-value 已在 `examples.manifest.json` `runtime` 列表登记；本 plan 未引入新 renderer type，playground demo 页通过 `route-model.ts` `DOMAIN_RENDERER_ROUTES` 注册，与既有 E3 demo 页一致。）
- [x] **e2e**：新增 `tests/e2e/form-input-enhancements.spec.ts`，覆盖 input-number 长按连续步进 + clamp、array-editor/key-value maxItems 禁用新增 + 上下移动重排的关键交互路径（满足 roadmap Cross-Cutting「每个工作项必须有 e2e」硬约束）。

Exit Criteria:

- [x] 三个 design.md §4/§5/§10 与 runtime 一致（live repo 可读）。
- [x] playground 示例页存在且路由可访问；`examples.manifest.json` 含新条目（组件已登记，demo 页经 route-model 注册）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_114526682ffelYoMhJnva2KMnt）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor M1（array-editor design.md §8 引用行号 off-by-one）→ `§8 L44` 改为 `§8 L42-43`（L42 列 moveItem future，L43 引用 form runtime API）。
  - Minor M2（key-value minItems 行号偏松）→ `L466-472` 收紧为 `L466-471`。
  - Minor M3（长按 + onClick 双步边角）→ Phase 3 新增 `steppedViaLongPressRef` 守卫说明（pointer-up 发生在延迟触发后时抑制 onClick 多余单步）。
  - Minor M4（Failure Path `movevalue-not-available` 二选一未定）→ Decision 收窄为「镜像 append/remove scope-owner 回退（调 scope.update，按钮 enabled）」；Failure Path 更名为 `movevalue-scope-fallback`；Phase 2/4 同步。
  - 引用准确性：input-number-renderer.tsx:25-179/handleStep L76-86/stepper L150-173、schemas.ts:233-250/224-226/213-216、input-number design.md §2 L13-31、array-editor.tsx (L174-399/401-424/硬编码 minItems L413-421)、key-value.tsx (L228-449/451-489/minItems L466-471)、@dnd-kit package.json L16-18、form runtime moveValue (flux-core runtime.ts:465 / form-runtime.ts:593-595)、无共享 dnd 工具 全部经 live repo 核对属实。
- 共识：零 Blocker、零 Major，Plan Status 升级为 `active`。

## Closure Gates

- [x] input-number 长按连续步进已落地且 focused 测试 GREEN（含 clamp/cancel Failure Path）
- [x] array-editor/key-value minItems/maxItems 可配且 validation 读 schema（非硬编码）已落地且 focused 测试 GREEN
- [x] array-editor/key-value 上下移动 reorder 已落地且 focused 测试 GREEN（moveValue 真实调用）
- [x] input-number/array-editor/key-value 三个 design.md 含 Flux 决策表（input-number 重命名、array-editor/key-value 新建，X5 扩展完成）
- [x] 缺省回退无回归（既有 flux-renderers-form/form-advanced 测试套件全过）
- [x] playground 示例 + `examples.manifest.json` 登记
- [x] `tests/e2e/form-input-enhancements.spec.ts` 存在并覆盖关键交互路径
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs（design.md §2/§4/§5/§10）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### array-editor/key-value 拖拽重排（drag-and-drop）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 上下移动按钮已满足 reorder 契约（可观测、对接 moveValue、a11y 友好）；@dnd-kit 已是 flux-renderers-form-advanced 依赖可用，drag 是 DX 糖而非契约必需。归后续增强。
- Successor Required: no

### array-editor item 复制 / deleteConfirmDialog / addable-removable toggle

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 多数高端 Combo 能力（多列/tabs/任意 schema）已 DESIGN-ACK-NOT-IMPL；item 复制/删除确认是次要 UX，当前 remove+append 已覆盖核心编辑。
- Successor Required: no

### key-value 重复 key inline 高亮

- Classification: `optimization candidate`
- Why Not Blocking Closure: 提交时 uniqueBy 校验消息已覆盖重复 key 检测；inline 实时高亮是 DX 增强，不影响契约成立。
- Successor Required: no

## Non-Blocking Follow-ups

- input-number `step` 派生 precision 边角（`step=0.01` 时 precision 推断）归后续评估（design.md 决策表可记）。
- array-editor/key-value `component:moveItem` 句柄（X1 已铺 `component:addItem/removeItem`，moveItem 句柄归 X1 后续或本 plan 一并——Phase 4 已含 moveValue 调用，句柄注册可 follow-up）。

## Closure

Status Note: 全 5 Phase 执行完成（Phase 1 X5 决策表 + 3 Decision；Phase 2 RED baseline 18 用例；Phase 3 input-number 长按步进 GREEN；Phase 4 array-editor/key-value min/max + reorder GREEN；Phase 5 owner-doc 同步 + playground demo + e2e）。input-number stepper 按钮支持长按连续步进（初始延迟 400ms + 重复间隔 80ms，clamp 停止 + pointerup/leave/blur 取消 + steppedViaLongPressRef 守卫）；array-editor/key-value 新增 minItems/maxItems schema + validation 读 schema + 上下移动按钮对接 form runtime moveValue（scope owner 回退走 scope.update）。Closure Gates 全 [x]，含独立子 agent closure-audit 通过。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，不复用执行者上下文；opencode CLOSURE_AUDIT 步骤）
- Evidence:
  - 独立 live repo 核对（非信任 [x]）：`input-number-renderer.tsx` L12-13/102-176 长按基础设施真实（`LONG_PRESS_INITIAL_DELAY_MS=400`/`LONG_PRESS_REPEAT_INTERVAL_MS=80`、`commitStep`+`latestValueRef`+`useEffect` 同步、`startLongPress`/`cancelLongPress`、`handleStepperPointerDown/Up/Click`、`steppedViaLongPressRef` 守卫接入 `handleStepperClick`）；stepper Button L240-269 真实绑定 `onPointerDown`/`onPointerUp`/`onPointerLeave`/`onClick`。非空壳、非 `return null`。
  - `schemas.ts` L213-230：`KeyValueSchema`/`ArrayEditorSchema` 均含 `minItems?: number`/`maxItems?: number`。
  - `array-editor.tsx`：move marker `data-slot="array-editor-move-up/down"`（L144/160）、`handleMove`→`currentForm.moveValue(name,index,to)`（L361）含 scope-owner 回退（`syncItems` L368，Failure Path `movevalue-scope-fallback` 真实落地）、`atMaxItems`（L382）禁用新增、validation contributor 读 schema `minItems`/`maxItems`（L511-526，非硬编码 1）。
  - `key-value.tsx`：同构 `key-value-move-up/down` marker（L202/218）、`handleMove`→`moveValue`（L401）+ scope 回退 `syncField`（L408）、`atMaxItems`（L419）、validation 读 schema（L562-579）。
  - 测试存在且非占位：`input-number-long-press.test.tsx`、`array-keyvalue-min-max-reorder.test.tsx`（12 用例覆盖六条 Failure Path）、`tests/e2e/form-input-enhancements.spec.ts`（pointerdown/wait/pointerup + count 断言 + maxItems 禁用 + reorder）。
  - design.md Flux 决策表：`input-number/design.md`（重命名）、`array-editor/design.md`、`key-value/design.md`（均含决策表节，live 可读）。
  - 五点一致性：Plan Status `completed` / 5 Phase Status 全 `completed` / 各 Phase Exit Criteria 全 [x] / Closure Gates 全 [x] / Closure evidence 真实 — 彼此一致。
  - Deferred 诚实：drag-and-drop / item 复制·deleteConfirm / key-value inline 高亮均归类为 `optimization candidate` 或 `out-of-scope improvement` 且附 non-blocking 理由；无 in-scope live defect 或 contract drift 被静默降级。
  - 实现证据：`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`（LONG_PRESS_INITIAL_DELAY_MS=400 / LONG_PRESS_REPEAT_INTERVAL_MS=80 / commitStep + latestValueRef + useEffect 同步 + startLongPress/cancelLongPress + handleStepperPointerDown/Up/Click + steppedViaLongPressRef 守卫）、`packages/flux-renderers-form/src/schemas.ts`（ArrayEditorSchema/KeyValueSchema 新增 minItems?/maxItems?）、`packages/flux-renderers-form-advanced/src/array-editor.tsx`（handleMove→moveValue + scope 回退 + atMaxItems + validation collectRules 读 schema + array-editor-move-up/down marker）、`packages/flux-renderers-form-advanced/src/key-value.tsx`（同构 key-value-move-up/down marker + maxItems validation）。
  - 测试证据：`packages/flux-renderers-form/src/__tests__/input-number-long-press.test.tsx`（6 用例 GREEN，含 longpress-clamp/cancel/pointer-leave + 短按 onClick 单步 + showStepper=false 无回归）、`packages/flux-renderers-form-advanced/src/__tests__/array-keyvalue-min-max-reorder.test.tsx`（12 用例 GREEN，覆盖六条 Failure Path）、`tests/e2e/form-input-enhancements.spec.ts`（3 e2e GREEN）。
  - 验证输出：`pnpm typecheck` = 49/49、`pnpm build` = 26/26、`pnpm lint` = 26/26、`pnpm test` = 49/49 tasks 全过；flux-renderers-form 39 files / 366 tests、flux-renderers-form-advanced 80 files / 761 tests、playground 19 files / 88 tests 全绿。
  - 无回归说明：`key-value.test.tsx` 一处旧用例按新契约（默认 minItems=1 时禁用删除）显式配 `minItems: 0` 保留其 scope-sync 验证意图；`fluxBasicPageSchema.json` 的「Submit array demo」单 reviewer 同理配 `minItems: 0`；`flux-basic-page.debugger.test.tsx` 的 remove 按钮选择器改 locale-agnostic regex（排除新增 move 按钮）。

Follow-up:

- input-number `step` 派生 precision 边角（`step=0.01` 时 precision 推断）归后续评估（design.md 决策表已记）。
- array-editor/key-value `component:moveItem` 句柄注册（X1 已铺 addItem/removeItem，moveItem 句柄归 X1 后续或 follow-up；本 plan 已落地 reorder 行为 + moveValue 调用）。
