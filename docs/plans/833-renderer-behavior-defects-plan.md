# 833 渲染层行为缺陷修复（deep-audit 2026-11-01 U1-U6）

> Plan Status: active
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §5（U1-U6）
> Related: plan 785（input-table onRowChange 引入）、`transfer-renderer.tsx:419-432`（虚拟列表 scrollToIndex 先例）

## Purpose

修复渲染层审计确认的六处行为缺陷：document 级监听泄漏、input-table 重排误派 `onRowChange`、虚拟化 combobox 键盘高亮不可见、两处 React key 冲突、扫码遮罩重复订阅。

## Current Baseline

- **U1**：`packages/flux-renderers-form/src/field-utils/field-handlers.tsx:64-96`——`armControlEngagement` 在 focus 时向 document 注册 `pointerdown`/`keydown` capture 监听，仅 `disarmControlEngagement`（同元素 onBlur，:187/:190）移除。聚焦元素被直接卸载时浏览器不派发 blur → 监听永驻并钉住脱离 DOM 的元素。arm 发生在 `createFieldHandlers`（:118，经 `index.tsx:29` 公开导出）返回的 onFocus 中；包内唯一调用方是 hook `useFieldHandlers`（:219，经 `useFormFieldController` :468 及两个 test-support 使用）。engagement WeakMap 位于 flux-renderers-form，`FieldFrame`（flux-react）无法向上引用，故清理须落在本包 hook 层。
- **U2**：`packages/flux-renderers-form-advanced/src/input-table-renderer.tsx:192-224`——diff effect 仅以 `prev.length !== items.length` 排除增删；上移/下移（等长）命中 `findIndex(item !== prev[index])`，派发 record/index/name 错配的 `input-table:row-change`（同时 controller 派发正确的 onReorder）。
- **U3**：`packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx:120-172` `VirtualizedComboboxList` 无 `scrollToIndex`，键盘高亮越过渲染窗口后不可见；先例 `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:419-432`、同包 `tree-option-list.tsx:286`。消费点 `input-choice-renderers.tsx:413-422`。无现成 e2e 承载虚拟化 select。
- **U4**：`packages/flux-renderers-content/src/carousel.tsx:23-26` `toSlideKey` = `slide:${image ?? title ?? index}`，同图无标题项 key 冲突（:256、:309 使用）。
- **U5**：`select-combobox-lists.tsx:37-47` `highlightText` 以片段文本作 `<mark key>`，重复匹配产生重复 key。
- **U6**：`packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:78-89` `useSyncExternalStore` 的 `subscribe` 为内联闭包，每次渲染重订阅 window online/offline。

## Goals

- 焦点元素以任何方式卸载后不残留 document 监听。
- `onRowChange` 只在行内容编辑时派发，重排只派发 `onReorder`。
- 虚拟化 combobox 键盘导航时高亮项始终滚动入视。
- 消除两处重复 key；扫码遮罩订阅稳定。

## Non-Goals

- 不改 engagement 判定语义本身（何为"已交互"）；不改 onReorder/onRowChange 的 payload 形状；不重构 combobox 组件结构。

## Scope

### In Scope

- U1-U6 修复与对应测试；U3 新增一条 e2e：在 playground component-lab 的 `apps/playground/src/component-lab/renderers/select-lab-page.tsx` 增加 500 选项 `virtual` 变体（虚拟化阈值 `virtual && >100`）作为承载面。

### Out Of Scope

- 其他虚拟列表组件；carousel 自动播放逻辑。

## Failure Paths

不适用：纯前端行为修复，无错误处理/API 契约变更。

## Test Strategy

必须自动化：每项先写在旧实现下失败的测试。

## Execution Plan

### Phase 1 - 监听泄漏与误派事件（U1、U2）

Status: planned
Targets: `field-handlers.tsx`、`input-table-renderer.tsx`、对应包测试

- Item Types: `Proof | Fix`

- [ ] Proof（U1-a 主路径）：经 `useFieldHandlers` 渲染字段 → focus → 不经 blur 直接卸载 → **卸载后立即**断言该元素的 `pointerdown`/`keydown` capture 监听已从 document 移除（spy `document.removeEventListener`；旧实现残留 → 挂）
- [ ] Fix（U1-a）：`useFieldHandlers` 以 ref 记录最近 arm 的目标元素（经 `createFieldHandlers` 新增的内部回调参数），卸载 effect 中 `disarmControlEngagement(ref.current)`
- [ ] Proof+Fix（U1-b 兜底，覆盖直接调用公开 `createFieldHandlers` 的消费者）：`markEngaged` 发现 `!target.isConnected` 时自清理——测试：直接用 `createFieldHandlers` arm 后移除元素，派发一次合成 document pointerdown，断言监听已移除（残留窗口为一次事件，属有意取舍，记入执行记录）
- [ ] Proof（U2）：input-table 绑定 `onRowChange` 与 `onReorder`，执行上移 → 断言 `onRowChange` 零次、`onReorder` 一次；再编辑单元格 → `onRowChange` 一次且 record/index/name 正确（旧实现重排时 onRowChange 派发 → 挂）
- [ ] Fix（U2）：快照行身份（`itemIdentity` 列表）；身份多重集合不变而顺序变化时不派发 onRowChange

Exit Criteria:

- [ ] U1-a/U1-b/U2 判别性测试通过且反向验证
- [ ] `flux-renderers-form` 包测试通过；`flux-renderers-form-advanced` 以 focused 测试（input-table 相关文件）为 Phase 退出口径（并行会话正在该包 input-table 校验面推进 bug 171，全包回归归 Closure Gates）

### Phase 2 - 虚拟化 combobox 键盘可达（U3）

Status: planned
Targets: `select-combobox-lists.tsx`、`input-choice-renderers.tsx`、新增/扩展 e2e

- Item Types: `Decision | Proof | Fix`

- [ ] Decision：已核 `@base-ui/react@1.3.0` `ComboboxRoot` 暴露 `onItemHighlighted?: (highlightedValue, eventDetails) => void`（`ComboboxRoot.d.ts:78`），渲染器 `<Combobox>` 即该 Root——执行时确定 value→index 映射与传入 `VirtualizedComboboxList` 的 prop 形态
- [ ] Proof：单测——高亮索引变化时 `virtualizer.scrollToIndex(index)` 被调用（旧实现无调用 → 挂）
- [ ] Fix：高亮变化 → `scrollToIndex`（对齐 transfer 先例）
- [ ] Proof：e2e——500 选项 virtual select，键盘 ArrowDown 越过首窗后高亮项 `isVisible`/位于列表视口内（programmatic 断言）

Exit Criteria:

- [ ] 单测与 e2e（`--retries=0`）通过；单测反向验证

### Phase 3 - key 冲突与订阅抖动（U4-U6）

Status: planned
Targets: `carousel.tsx`、`select-combobox-lists.tsx`、`barcode-scanner-overlay.tsx`

- Item Types: `Proof | Fix`

- [ ] Proof（U4，先写）：两张同图无标题 slide 渲染无 React duplicate-key 警告（spy console.error）→ Fix：key 纳入 index
- [ ] Proof（U5，先写）：`highlightText('aaa','a')` 渲染无重复 key 警告 → Fix：key 用 `${part}-${i}`
- [ ] Proof（U6，先写）：遮罩多次重渲染期间 window `online` 监听注册次数恒为 1 → Fix：subscribe/getSnapshot 提升为模块级或稳定引用

Exit Criteria:

- [ ] 三条测试通过且反向验证；三包测试通过

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_0a6bf7d3-a101-46e8-861d-acc40c774969；round-2 agent_9160090e-b0db-4c2f-90a6-4d2ee1f178ce）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，2 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 U1 两方案与 Proof 不一致（markEngaged 自清理只在下一次 document 事件触发；flux-react FieldFrame 够不到 form 包内 WeakMap）→ 定为 U1-a hook 层 ref+卸载 effect 主路径（卸载即断言）+ U1-b isConnected 兜底（合成事件断言）。

## Closure Gates

- [ ] U1-U6 修复且判别性测试反向验证
- [ ] U3 e2e `--retries=0` 通过
- [ ] 若 onRowChange 契约文本（renderer-runtime.md 或 input-table 组件文档）提及重排行为，已同步；`createFieldHandlers` args 新增的可选内部回调（additive）记入 daily log
- [ ] 不存在被静默降级的 in-scope 缺陷
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
