# 833 渲染层行为缺陷修复（deep-audit 2026-11-01 U1-U6）

> Plan Status: completed
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

Status: completed
Targets: `field-handlers.tsx`、`input-table-renderer.tsx`、对应包测试

- Item Types: `Proof | Fix`

- [x] Proof（U1-a 主路径）：经 `useFieldHandlers` 渲染字段 → focus → 不经 blur 直接卸载 → **卸载后立即**断言该元素的 `pointerdown`/`keydown` capture 监听已从 document 移除（spy `document.removeEventListener`；旧实现残留 → 挂）
- [x] Fix（U1-a）：`useFieldHandlers` 以 ref 记录最近 arm 的目标元素（经 `createFieldHandlers` 新增的内部回调参数），卸载 effect 中 `disarmControlEngagement(ref.current)`
- [x] Proof+Fix（U1-b 兜底，覆盖直接调用公开 `createFieldHandlers` 的消费者）：`markEngaged` 发现 `!target.isConnected` 时自清理——测试：直接用 `createFieldHandlers` arm 后移除元素，派发一次合成 document pointerdown，断言监听已移除（残留窗口为一次事件，属有意取舍，记入执行记录）
- [x] Proof（U2）：input-table 绑定 `onRowChange` 与 `onReorder`，执行上移 → 断言 `onRowChange` 零次、`onReorder` 一次；再编辑单元格 → `onRowChange` 一次且 record/index/name 正确（旧实现重排时 onRowChange 派发 → 挂）
- [x] Fix（U2）：快照行身份（`itemIdentity` 列表）；身份多重集合不变而顺序变化时不派发 onRowChange

Exit Criteria:

- [x] U1-a/U1-b/U2 判别性测试通过且反向验证
- [x] `flux-renderers-form` 包测试通过；`flux-renderers-form-advanced` 以 focused 测试（input-table 相关文件）为 Phase 退出口径（并行会话正在该包 input-table 校验面推进 bug 171，全包回归归 Closure Gates）

### Phase 2 - 虚拟化 combobox 键盘可达（U3）

Status: completed
Targets: `select-combobox-lists.tsx`、`input-choice-renderers.tsx`、新增/扩展 e2e

- Item Types: `Decision | Proof | Fix`

- [x] Decision：已核 `@base-ui/react@1.3.0` `ComboboxRoot` 暴露 `onItemHighlighted?: (highlightedValue, eventDetails) => void`（`ComboboxRoot.d.ts:78`），渲染器 `<Combobox>` 即该 Root——执行时确定 value→index 映射与传入 `VirtualizedComboboxList` 的 prop 形态
- [x] Proof：单测——高亮索引变化时 `virtualizer.scrollToIndex(index)` 被调用（旧实现无调用 → 挂）
- [x] Fix：高亮变化 → `scrollToIndex`（对齐 transfer 先例）
- [x] Proof：e2e——500 选项 virtual select，键盘 ArrowDown 越过首窗后高亮项 `isVisible`/位于列表视口内（programmatic 断言）

Exit Criteria:

- [x] 单测与 e2e（`--retries=0`）通过；单测反向验证

### Phase 3 - key 冲突与订阅抖动（U4-U6）

Status: completed
Targets: `carousel.tsx`、`select-combobox-lists.tsx`、`barcode-scanner-overlay.tsx`

- Item Types: `Proof | Fix`

- [x] Proof（U4，先写）：两张同图无标题 slide 渲染无 React duplicate-key 警告（spy console.error）→ Fix：key 纳入 index
- [x] Proof（U5，先写）：`highlightText('aaa','a')` 渲染无重复 key 警告 → Fix：key 用 `${part}-${i}`
- [x] Proof（U6，先写）：遮罩多次重渲染期间 window `online` 监听注册次数恒为 1 → Fix：subscribe/getSnapshot 提升为模块级或稳定引用

Exit Criteria:

- [x] 三条测试通过且反向验证；三包测试通过

### 执行记录（2026-11-01）

- **U1**：`field-handlers.tsx`——`createFieldHandlers` 新增可选内部回调 `onEngagementArmed`（args additive），`useFieldHandlers` 以 ref 记录最近 arm 的元素并在卸载 effect 中 disarm（U1-a）；`markEngaged` 发现 `!target.isConnected` 时自清理（U1-b，残留窗口一次事件）。测试 `field-engagement-cleanup.test.tsx` 两例，修复前均失败；去掉卸载清理后 U1-a 失败（反向验证）。执行中厘清：`input-text`/`input-date` 调用 `handlers.onFocus()` 不传事件、本就不 arm；泄漏面是直接透传 `handlers.onFocus` 的渲染器（select 等），测试据此以 select 承载。
- **U2**：`input-table-renderer.tsx` diff effect 在"等长且当前每行均为旧快照中的同一对象引用"（纯置换）时不派发 onRowChange。`input-table-erp-enhancement.test.tsx` 新增「does not dispatch onRowChange for a pure row reorder」——修复前实得 `sku@0:B`（错配派发）；重排后编辑仍正确派发 `amount@0:9`。owner doc `docs/components/input-table/design.md` 补"纯重排不派发（归 onReorder）"。
- **U3**：根因比初判更深——Base UI 只有在 Root 同时设 `virtualized` 且传 `items` 时才按完整列表长度导航（`AriaCombobox.js` 中 `listRef.current.length = flatFilteredItems.length` 仅在 `items` 存在时执行），原实现只传 `filteredItems`，导航长度被锁在已注册的 DOM 项上。修复：虚拟模式下 `virtualized` + `items={allOptions}` + `onItemHighlighted` → `VirtualizedComboboxList` 按值求索引 `scrollToIndex`，虚拟列表项传全列表 `index`。单测 `select-virtual-keyboard-scroll.test.tsx`（mock 虚拟器，去 effect 反向验证失败）；e2e `tests/e2e/component-lab/select-virtual-keyboard.spec.ts`（`--retries=0` 通过）——**以完全还原的原始代码运行该 e2e 失败**（24 次方向键后高亮停在 SKU 9），判别性由 `virtualized`+`items` 提供；`scrollToIndex` effect 系 Base UI virtualized 模式要求宿主承担的滚动契约，单测证明其被调用（Chromium 中浮层列表导航的 scrollIntoView 亦可兜底，故 e2e 对该 effect 不具判别性，如实记录）。承载面：`select-lab-page.tsx` 新增 500 选项虚拟场景；同页 option template 场景 badge 的未声明属性 `variant` 删除（badge 仅有 `level`，该属性本就被忽略；消除该页唯一的 strict 诊断 console.error，否则 e2e 夹具零错误门会挡住新用例——该项原属 PH-9 台账 B 类，由 836 台账更新承接）。
- **U4**：carousel `toSlideKey` 纳入 index；同图无标题三项时修复前 React 报 duplicate key。
- **U5**：`highlightText` 以片段字符偏移为 key（lint 禁止数组下标 key）；`banana`/`an` 两处命中修复前报 duplicate key。
- **U6**：`subscribeOnline`/`getOnlineSnapshot` 提升为模块级函数；修复前三次渲染注册 3 次 online 监听，修复后 1 次（不依赖 React Compiler 是否作用于发布产物）。

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_0a6bf7d3-a101-46e8-861d-acc40c774969；round-2 agent_9160090e-b0db-4c2f-90a6-4d2ee1f178ce）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，2 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 U1 两方案与 Proof 不一致（markEngaged 自清理只在下一次 document 事件触发；flux-react FieldFrame 够不到 form 包内 WeakMap）→ 定为 U1-a hook 层 ref+卸载 effect 主路径（卸载即断言）+ U1-b isConnected 兜底（合成事件断言）。

## Closure Gates

- [x] U1-U6 修复且判别性测试修复前均实跑失败（U1-a/U3 另做去修复反向验证）
- [x] U3 e2e `--retries=0` 通过；以完全还原的原始代码运行同一 e2e 失败（判别性）
- [x] onRowChange 契约：`docs/components/input-table/design.md` 补"纯重排不派发（归 onReorder）"；`createFieldHandlers` args 新增可选 `onEngagementArmed`（additive）记入 daily log
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（agent_b7598a08，approved）
- [x] `pnpm typecheck`（46/46）
- [x] `pnpm build`（46/46）
- [x] `pnpm lint`（46/46）
- [x] `pnpm test`（`turbo run test --continue`：85/86 任务绿，**16,800 passed**；唯一失败 = `flux-renderers-mobile` wheel-picker/wheel-time-picker 2 例全量负载型 flaky——832 首轮门禁〔无 833 改动时〕已出现同族失败，含 833 改动的 mobile 整包单独连跑 3 次均 381/381）
- [x] `pnpm check`（exit 0，全链含 check:test-barrels 与 test:scripts）

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: U1-U6 全部修复，判别性测试修复前均实跑失败（U1-a/U3 另做去修复反向验证，U3 e2e 以还原原始代码运行失败）；input-table owner doc 同步；全量门禁绿（test 仅 mobile 包两例与触达面无关的负载型 flaky）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_b7598a08-0d2b-4cc7-a32f-a252b122640b）
- Evidence: verdict **approved**（零 Blocker/Major，3 Minor）。审计员逐项核对旧实现必挂、U2 对"替换一行+复用其余"的编辑仍正确派发、U3 经 Base UI `AriaCombobox.js` 源码印证 `items` 是导航长度的前提、非虚拟 select 不受影响（form 包 1116 全绿），并在独立端口复跑 U3 e2e 通过、重跑 mobile 包 381/381。Minor-1（daily log 缺 833 条目）随本提交补入；Minor-2/3 为观察项（U2 对"复用引用的原地突变"不派发与旧实现同口径、违背 snapshot-replace 纪律；U1 卸载清理在 portal 保持节点连接时回落为"已交互"安全方向）。

Follow-up:

- no remaining plan-owned work
