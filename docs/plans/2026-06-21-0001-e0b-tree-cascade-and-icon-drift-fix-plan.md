# E0b 树级联与图标漂移修复

> Plan Status: completed
> Package: components-improvement
> Work Item: E0b 树级联漂移修复
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md` (E0b), `docs/components/existing-components-improvement-analysis.md` §4 漂移登记表 #5/#6/#7, `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form-advanced/src/tree-options.ts`, `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
> Related: 后续 `docs/components/existing-components-improvement-roadmap.md` 中 E2d（树族异步与级联）以本计划为前置

## Purpose

让 `InputTreeSchema` / `TreeSelectSchema` 已声明的 `cascade`、`showIcon`（及 `InputTreeSchema` 专属的 `showOutline`）真正在 `input-tree` / `tree-select` 两个 renderer 中生效或按 Q3 裁决降级；删除"声明了但设了无效"的契约漂移，并把两个 owner design.md 同步到实际实现。

## Current Baseline

- `InputTreeSchema`（`packages/flux-renderers-form/src/schemas.ts:69-82`）声明 `cascade?: boolean`、`showIcon?: boolean`、`showOutline?: boolean`。
- `TreeSelectSchema`（同文件 `:84-98`）声明 `cascade?: boolean`、`showIcon?: boolean`（**无** `showOutline`）。
- `packages/flux-renderers-form-advanced/src/tree-options.ts:141-154` 的 `toggleTreeSelection(value, candidate, multiple)` 仅在 `multiple=true` 时翻转单个候选值；**没有**父子传播、**没有**indeterminate 半选态。
- `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:104` 调用 `toggleTreeSelection(value, option.value, multiple)` 时**没有**传入 `cascade` 或派生 cascade 行为的参数。
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx` 中的 `InputTreeRenderer` / `TreeSelectRenderer` 节点渲染**不消费** `showIcon` / `showOutline`（不渲染图标，不渲染引导线）。
- 两个 owner design.md 都已显式标注契约漂移：
  - `docs/components/input-tree/design.md:22-26` + 决策表 `:36-37` 列出"计划实现（E0b）"。
  - `docs/components/tree-select/design.md:22-26` + 决策表 `:35-36` 列出"计划实现（E0b）"，并明确 `showOutline` 不适用于 tree-select。
- 历史漂移登记：`docs/components/existing-components-improvement-analysis.md:165-167`（#5 input-tree cascade；#6 input-tree showIcon/showOutline；#7 tree-select cascade/showIcon）。
- roadmap 顶部状态：`E0b 树级联漂移修复: todo`。
- 前置 Q3（漂移字段策略）的裁决方向已在 design.md 中体现为"`cascade` 补实现 + `showIcon`/`showOutline` 实现或删字段"，本计划需在 Phase 1 把"`showIcon`/`showOutline` 实现还是删字段"做明确裁定并固化为最终设计状态。

## Goals

- `cascade: true` 在 `input-tree` / `tree-select` 的多选模式下产生真正的父子传播：
  - 选中父节点 → 所有可选子孙节点加入当前值；
  - 取消父节点 → 所有子孙节点从当前值移除；
  - 子节点部分（但非全部）选中时父节点处于 indeterminate 半选态；全部子节点选中时父节点被自动选中。
- `cascade` 仅在多选（`treeMode: 'checkbox'`，或 `treeMode` 缺省且 multiple 语义成立）下生效；单选模式（`treeMode: 'radio'` / `'normal'`）不受影响。
- `onlyLeaf: true` 与 `cascade: true` 同时存在时，按 design.md 与 analysis 的现行"onlyLeaf 优先"语义裁定一致行为（Phase 1 决策固化）。
- `showIcon` / `showOutline` 按 Phase 1 裁定执行：实现或删除字段（含 schema、design.md、renderer、tests 同步）。
- 两个 owner design.md 更新为最终设计状态：删除"漂移待 E0b 修复"的警告；决策表条目改为"实现"或显式"不采纳（删字段）"。
- 增加 focused 单测证明 cascade 行为、indeterminate 状态派生、`onlyLeaf` 优先级，以及（若 Phase 1 裁定为实现）图标/引导线渲染。

## Non-Goals

- 不引入异步懒加载（`deferApi` / `deferField`）、远程搜索（`searchApi`）、虚拟滚动（`virtualThreshold`）等 E2d 范围能力。
- 不重构 `tree-options` 模型为通用 platform 层；保持其当前作为 form-advanced 内 helper 模块的定位。
- 不调整 `treeMode` 的取值集合或 single/multiple 推断规则。
- 不改 `tree`（通用树 renderer）的契约；E0b 仅覆盖 `input-tree` / `tree-select`。
- 不改 `useTableSelection` 或其他无关 selection hook。
- 不为 `cascade` 增加新 schema 字段（如 `cascadeDirection: 'down' | 'up' | 'both'`）；如 Phase 1 评估认为需要，应记录为 Non-Blocking Follow-up 并指向 E2d。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/tree-options.ts`（cascade helpers：parent-child propagation、indeterminate derivation；可基于现有 `flattenTreeOptions` / `toggleTreeSelection` 演进，不破坏现有签名调用者）。
- `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`（调用点接入 cascade 行为；传入 `cascade` 与 `options` 上下文）。
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`（`InputTreeRenderer` / `TreeSelectRenderer` 节点 UI：indeterminate 半选态、`showIcon` / `showOutline` 裁定后的渲染或字段删除）。
- `packages/flux-renderers-form/src/schemas.ts`（若 Phase 1 裁定为删除 `showIcon` / `showOutline` 字段，则同步移除；若裁定为实现则保持现状）。
- `docs/components/input-tree/design.md`（漂移注记、决策表、相关 schema 章节）。
- `docs/components/tree-select/design.md`（漂移注记、决策表、相关 schema 章节）。
- 新增/更新 focused tests。
- `docs/logs/{year}/06-21.md` 收口记录。
- `docs/components/existing-components-improvement-roadmap.md` 顶部 `E0b` 状态由 `todo` 改为 `done`（closure audit 通过后）。

### Out Of Scope

- `tree`（通用树 renderer）的 cascade / showIcon / showOutline。
- 异步/lazy/remote search/virtual scroll 等 E2d 范围。
- `input-tree` / `tree-select` 的 trigger / popup / popover 视觉重做（保留现有交互壳）。
- 新增 `cascadeDirection` / `autoCascadeUp` 等扩展字段。

## Failure Paths

| 场景编号                         | 触发                                          | 行为                                                                       | 可重试                       | 用户可见表现                               |
| -------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------ |
| cascade-select-parent            | `cascade: true` + 多选，点击父节点            | 父 + 所有可选子孙加入 value                                                | 是（再次点击父节点取消整族） | 父节点 checked；子孙节点 checked           |
| cascade-deselect-parent          | 在上一场景下再次点击父节点                    | 父 + 所有子孙从 value 移除                                                 | 是                           | 父节点 unchecked；子孙 unchecked           |
| cascade-partial-children         | 手动只选中部分子孙                            | 父节点进入 indeterminate 半选态；不写入 value                              | 是                           | 父节点显示半选视觉；不参与提交值           |
| cascade-all-children             | 手动逐个选中所有子孙                          | 父节点自动进入 checked 并写入 value                                        | 是                           | 父节点 checked                             |
| cascade-single-mode              | `treeMode: 'radio'` 或 `'normal'`，点击父节点 | `cascade` 不生效，按单选语义翻转当前节点                                   | n/a                          | 单选语义保留                               |
| cascade-only-leaf-conflict       | `cascade: true` + `onlyLeaf: true`            | 按 Phase 1 裁定：onlyLeaf 优先；父节点不可直接选中，cascade 仅向 leaf 传播 | n/a                          | 父节点不响应 click-selection；仅 leaf 可选 |
| show-icon-implemented-or-deleted | `showIcon: true` / `showOutline: true`        | 按 Phase 1 裁定：渲染图标/引导线，或字段已删除不出现                       | n/a                          | 渲染一致或 schema 校验期就拒绝             |

## Test Strategy

档位选择：必须自动化

本档选择：必须自动化。理由：cascade 父子传播与 indeterminate 是多选树的头号正确性需求，且原漂移正是"声明了但设了无效"，必须用 focused test 锁定真实传播行为；否则未来 refactor 极易回归。

依本档要求，Proof 项先于 Fix 项落地（见 Execution Plan：Phase 2 = Focused Proof / Red，Phase 3 = Implementation / Green）。

## Execution Plan

### Phase 1 - Q3 决策与契约固化

Status: completed
Targets: `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`

- Item Types: `Decision`

- [x] 在 `docs/components/input-tree/design.md` 与 `docs/components/tree-select/design.md` 中明确裁定 `showIcon` / `showOutline`（仅 input-tree）的归属：**实现**（在节点渲染中按字段渲染图标 / 引导线）或**删除字段**（从 schema 与 design.md 一并移除，归入"不采纳"）。裁定依据须写入文档。
- [x] 在两个 design.md 中固化 `cascade` 最终语义：父子传播方向（默认 down + up，即子全选则父自动选中）、indeterminate 触发条件、与 `onlyLeaf` 的优先级（`onlyLeaf: true` 优先，cascade 仅在 leaf 之间有效）。
- [x] 删除两个 design.md 中"漂移待 E0b 修复"的过渡措辞，把 Flux 决策表对应行改为"实现"或"不采纳（删字段）"，描述与 Phase 3 实际行为一致。
- [x] 若裁定为删除字段，需同步说明 schema 层移除时机（Phase 3 内同步）。

Exit Criteria:

- [x] 两个 design.md 已无"漂移"/"待 E0b"/"计划实现（E0b）"过渡措辞。
- [x] `cascade` 的传播方向、indeterminate 触发条件、与 `onlyLeaf` 的优先级在两个 design.md 中描述一致。
- [x] `showIcon` / `showOutline` 的最终归属（实现或删除）在两个 design.md 中显式陈述，并有理由。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目记录本次决策。

### Phase 2 - Focused Proof（test-first，Red）

Status: completed
Targets: 新增/更新 focused tests（建议放 `packages/flux-renderers-form-advanced/src/__tests__/` 或在 `tree-options` helper 同包加 `.test.ts`）

- Item Types: `Proof`

- [x] 新增 helper-level proof：给定 options 树与 value，`cascadeSelectParent(options, value, parent)` 选中父节点后包含所有可选子孙；`cascadeDeselectParent(...)` 取消父节点后子孙全部移除。
- [x] 新增 helper-level proof：给定部分子孙选中，父节点 `deriveCheckedState(...)` 返回 `indeterminate: true`；全部子孙选中返回 `checked: true`；无子孙选中返回 `checked: false, indeterminate: false`。
- [x] 新增 renderer-level proof：`input-tree` + `cascade: true` + checkbox 模式下，点击父节点 → DOM 中父与所有子孙 checkbox 进入 checked；再次点击 → 全部 unchecked。
- [x] 新增 renderer-level proof：`tree-select` + `cascade: true` 多选模式下，部分子孙选中 → 父节点 checkbox 视觉与 `aria-checked="mixed"` 反映 indeterminate。
- [x] 新增 negative proof：`cascade: false`（或缺省）下行为与现行完全一致（无父子传播、无 indeterminate 派生）。
- [x] 新增 negative proof：`treeMode: 'radio'` 下 `cascade: true` 不影响单选语义。
- [x] 新增 proof 覆盖 Phase 1 裁定方向：若裁定为实现 → proof 验证 `showIcon` / `showOutline` 渲染；若裁定为删除 → proof 验证 schema 不再接受这些字段（schema 校验失败或字段已从类型消失）。
- [x] 本 phase 为 test-first：proof 预期在 Phase 3 实现落地前为 Red（失败）。允许为解析 import 创建 helper / renderer 的最小模块签名壳（仅占位、不含 cascade 逻辑），实际语义在 Phase 3 实现。

Exit Criteria:

- [x] 上述 focused proof 已写入仓库，编码了 cascade 选中 / 取消 / indeterminate / onlyLeaf 优先 / 单选不受影响 / `showIcon`/`showOutline` 裁定方向的预期语义。
- [x] helper-level 与 renderer-level proof 同时存在；不存在仅依赖"接口存在"判定完成的项。
- [x] proof 当前为 Red（失败），等待 Phase 3 实现转 Green；运行 `pnpm --filter @nop-chaos/flux-renderers-form-advanced test -- <新增测试路径>` 确认失败原因与"未实现 cascade"一致，而非 import / 配置错误。
- [x] No owner-doc (design.md) update required（design.md 已在 Phase 1 裁定）；`docs/logs/{year}/06-21.md` 对应日期条目已更新。

### Phase 3 - 实现 cascade 与 showIcon/showOutline 裁定（Green）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-options.ts`, `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`, （若裁定删字段）`packages/flux-renderers-form/src/schemas.ts`

- Item Types: `Fix`

- [x] 在 `tree-options.ts` 新增或扩展纯 helper：给定 options 与当前 value（数组形式），计算 (a) 选中父节点后的完整 value 集合；(b) 取消父节点后的 value 集合；(c) 给定 value 集合下每个节点的 `checked` / `indeterminate` 派生态。helper 保持 pure，便于单独测试。签名与 Phase 2 proof 中 `cascadeSelectParent` / `cascadeDeselectParent` / `deriveCheckedState` 对齐。
- [x] 在 `tree-control-controllers.ts` 调用 `toggleTreeSelection(...)` 时，根据 schema 的 `cascade` 与 `onlyLeaf` 选择走 cascade 路径或保留现有单点翻转路径；不破坏 `onlyLeaf: true` 现行行为。
- [x] 在 `tree-controls.tsx` 节点渲染中按 helper 派生的 `checked` / `indeterminate` 设置 checkbox `checked` 与 `aria-checked="mixed"`（或等价 indeterminate 视觉）；保留现有 keyboard / roving focus / searchable 行为。
- [x] 按 Phase 1 裁定执行 `showIcon` / `showOutline`：若实现，在节点渲染中按字段渲染图标 / 引导线；若删除，则从 `InputTreeSchema` / `TreeSelectSchema` 移除字段并清理调用点。
- [x] cascade 仅在多选下生效；`treeMode: 'radio'` / `'normal'` 路径保留现有单选行为。
- [x] `input-tree` 与 `tree-select` 两个 renderer 共享同一套 cascade helper 派生态，不允许各自维护一套不一致的派生逻辑。

Exit Criteria:

- [x] `cascade: true` + 多选时，`input-tree` 与 `tree-select` 均产生父子传播与 indeterminate 派生，可通过 live DOM 或 controller 行为观察。
- [x] `treeMode: 'radio'` / `'normal'` 下 `cascade` 不改变现有单选行为。
- [x] `onlyLeaf: true` 优先于 `cascade`，行为与 Phase 1 裁定一致。
- [x] `showIcon` / `showOutline` 落地为 Phase 1 裁定的方向，schema / renderer / design.md 三处一致。
- [x] Phase 2 的 focused proof 由 Red 转 Green（全绿）。
- [x] 现有 `packages/flux-renderers-form-advanced/src/__tests__/tree-*.test.tsx`（tree-structure / tree-values / form-tree-\*）全绿。
- [x] Owner design.md 描述与本 phase 实际行为一致（Phase 1 文本与 Phase 3 代码在同一 closure 周期内对齐）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 全过。
- [x] `docs/logs/{year}/06-21.md` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据（由独立审阅者或独立子 agent 在 `REVIEW_PLANS` 阶段填写，fresh session）。

- Reviewer / Agent: opencode plan-review subagent (fresh session, REVIEW_PLANS)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Major — 必须自动化档要求 Proof 先于 Fix：原 Phase 2(Fix)/Phase 3(Proof) 顺序违反 guide drafting rule 12；已对调为 Phase 2(Proof/Red) → Phase 3(Fix/Green)，并在 Test Strategy 补注 test-first 顺序。
  - 引用核对：schemas.ts、tree-options.ts、tree-control-controllers.ts、两份 design.md、analysis §4 #5/#6/#7、roadmap E0b=todo 行号与路径均与 live repo 一致，无需修改。

## Closure Gates

> 只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `input-tree` 与 `tree-select` 在 `cascade: true` + 多选下产生父子传播与 indeterminate 派生；`cascade: false`（或缺省）下行为与现行一致。
- [x] `treeMode: 'radio'` / `'normal'` 下 `cascade` 不影响单选语义；`onlyLeaf: true` 优先于 `cascade`。
- [x] `showIcon` / `showOutline` 已按 Phase 1 裁定方向落地（实现或字段删除），schema / renderer / design.md 三处一致。
- [x] 两个 owner design.md 已无"漂移待 E0b"措辞，Flux 决策表条目状态为"实现"或"不采纳（删字段）"。
- [x] Focused 自动化 proof 覆盖 cascade 选中 / 取消 / indeterminate / onlyLeaf 优先 / 单选不受影响 / `showIcon`/`showOutline` 裁定方向。
- [x] roadmap `E0b` 在 closure audit 通过后由 `todo` 改为 `done`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响的 owner docs（`input-tree/design.md`、`tree-select/design.md`、`existing-components-improvement-roadmap.md`，必要时 `existing-components-improvement-analysis.md`）已同步到 live baseline。
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划为单一漂移修复 owner plan，closure 阶段未识别出非阻塞残余。`cascade` 当前不支持 `up-only` / `down-only` 方向控制（无 `cascadeDirection` 字段）—— 这是 Non-Goals 明确排除项（指向 E2d），不构成 closure-blocking residual。

## Non-Blocking Follow-ups

- 若未来需要 `cascadeDirection` / `autoCascadeUp` / `partialCascadeStrategy` 等扩展字段，指向 E2d；本计划不引入。
- 若未来需要图标/引导线能力，须以独立 feature plan 提供完整图标来源设计（含 `iconField`/`iconKey` 解析）后再加 `showIcon`/`showOutline` 字段；E0b 已裁定当前删字段。
- `input-tree` 与 `tree-select` 之外其他树族 renderer（如通用 `tree`）若需共享 cascade helper，指向 E2d；本计划不扩展范围。
- `existing-components-improvement-analysis.md` §4 漂移登记表 #5/#6/#7 是历史 v2 报告条目，保留为历史记录；当前 live baseline 以两份 owner design.md Flux 决策表 + `schemas.ts` 为准。

## Closure

Status Note: E0b 收口。`cascade` 父子传播 + indeterminate 派生 + `onlyLeaf` 优先语义已在 `input-tree` / `tree-select` 双 renderer 落地并共享同一套 `tree-options` cascade helper；`showIcon`/`showOutline` 按 Phase 1 裁定从 schema 删除（消除"声明了但设了无效"的契约漂移）。两份 owner design.md 已同步为最终设计状态。roadmap E0b 由 `todo` 改 `done`。无 in-scope live defect 残留；所有非阻塞项已指向 E2d / 独立 feature plan。

Closure Audit Evidence:

- Reviewer / Agent: opencode (mission-driver 驱动的 EXEC_PLANS → closure 验证；live-repo 复核)
- Live-repo 验证：
  - `packages/flux-renderers-form-advanced/src/tree-options.ts`：`cascadeSelectParent` / `cascadeDeselectParent` / `deriveCheckedState` 已实现（pure helper）。
  - `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`：`useTreeOptionNodeController` 按 `cascade`/`onlyLeaf` 分流，返回 `indeterminate`。
  - `packages/flux-renderers-form-advanced/src/tree-controls.tsx`：`TreeOptionNode`/`TreeOptionList` 串接 cascade，checkbox `indeterminate`，treeitem `aria-checked="mixed"`。
  - `packages/flux-renderers-form/src/schemas.ts`：`InputTreeSchema` 无 `showIcon`/`showOutline`；`TreeSelectSchema` 无 `showIcon`。
  - `docs/components/input-tree/design.md` / `tree-select/design.md`：无"漂移待 E0b"措辞；Flux 决策表 cascade="实现"、showIcon/showOutline="不采纳（删字段）"；cascade 语义节固化。
  - `docs/components/existing-components-improvement-roadmap.md`：E0b = `done`。
- Focused proof：`packages/flux-renderers-form-advanced/src/__tests__/tree-cascade.test.tsx` = 19/19 全绿（helper + renderer + 负向 + 删字段结构守卫）。
- 全 workspace 验证：`pnpm typecheck` 49/49、`pnpm build` 26/26、`pnpm lint` 26/26、`pnpm test` 49 tasks 全过（`docs/logs/2026/06-21.md` 记录）。注：未运行 e2e/Playwright，非 AGENTS.md full-green（unit+e2e）定义。
- 注：closure-audit 由本次 EXEC_PLANS session 内完成（mission-driver 显式授权"complete the entire plan"）；按 guide Closure Audit Rule，独立 fresh-session closure-audit 可后续追加，但所有 in-scope exit criteria + closure gates 已逐条经 live-repo 核对成立。

Follow-up:

- no remaining plan-owned work（所有 in-scope 项已 landed；非阻塞 follow-up 指向 E2d / 独立 icon feature plan）。
