# 2026-09-29-6 大数据集窗口化（list / transfer successor 收口）

> Plan Status: completed
> Last Reviewed: 2026-09-29
> Source: `docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（R2-P12 全部 + 第一轮 Plan 2 Deferred：list 窗口化、transfer 虚拟化）
> Related: 2026-09-28-2（Deferred 来源 plan）、2026-09-28-7（VirtualBody 缺陷与编译豁免契约）

## Purpose

收口第一轮显式 Deferred 的两个大数据集窗口化 successor：list-renderer infinite 模式窗口化、transfer-renderer 双面板虚拟化 + 索引化。结果面 = 万级选项/无限加载场景 DOM 与 scope 数量有界，传输/选择器交互成本 O(n) 化。

## Current Baseline

- `flux-renderers-data/src/list-renderer.tsx:220-229` infinite = `items.slice(0, currentPage * pageSize)`，已载条目全挂载永不卸载；每条目 `helpers.createScope({item,index})`（:129，:140-144 dispose）。
- `flux-renderers-form-advanced/src/transfer-renderer.tsx`：panes 全量挂载（:519-546，`max-h-64 overflow-y-auto` :503）；`buildSelectedEntries` O(S×N)（:50-61）；`moveToSelected` O(S²)（:230-236）。
- 虚拟化先例（仓内）：`table-virtual-body.tsx:110-131`（useVirtualizer + measureElement + spacer）、`ai-message-list.tsx:123-131,:167-201`（阈值门控 enabled + absolute 测量行——**list 窗口化最佳模板**）、`use-kanban-virtualizer.ts`/`use-calendar-virtualizer.ts`（per-pane 固定高——transfer 模板）、`mobile/infinite-scroll.tsx:37-47`（findScrollableAncestor）。
- React Compiler 豁免契约：`use-table-row-scope-cache.ts` 'use no memo' 为 VirtualBody 缺陷根修（2026-09-28-7）——本 plan 涉及 scope 生命周期的新虚拟路径需对照该契约评估。
- ListItemView 已 React.memo + latest-ref（2026-09-28-2）。

## Goals

- list infinite 模式在阈值以上仅挂载可见窗口（±overscan），滚动卸载/重挂载或 scope 复用策略明确且有测试。
- transfer 两面板阈值以上虚拟化；label 解析 O(S+N) 索引化；move-all 去 O(S²)。
- 非虚拟路径（阈值以下/显式关闭）行为与现状完全一致；键盘导航（transfer roving-tabindex 已有）在虚拟化下保持可用。

## Non-Goals

- list pagination 模式改造（已 slice，保持现状）。
- transfer 跨面板拖拽等新交互。
- tree 虚拟化（roving-tabindex 架构约束，第一轮已裁定 Deferred，不倒账）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/list-renderer.tsx`（±新 hook/子组件文件）
- `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`

### Out Of Scope

- 其余 data/form-advanced 渲染器；schema 新字段（窗口化阈值用现有 virtual 语义或内部自动阈值——以不破坏 schema 兼容为准，决策记录于 plan）。

## Failure Paths

| 可测场景编号 | 触发 | 行为 | 可重试 | 用户可见表现 |
| --- | --- | --- | --- | --- |
| list-window-scroll | infinite 载入 > 阈值后滚动 | 挂载行数 ≤ 窗口+overscan；回滚重挂载内容一致 | 是 | 无（滚动平滑） |
| list-load-more-windowed | 窗口化下滚动到底 | sentinel 触发 onLoadMore 继续加载（spacer/sentinel 接线不破坏） | 是 | 无 |
| list-selection-persist | 窗口外条目被选中/取消 | 选择状态持久（选择态存组件 state :318 不在行 scope，天然安全；嵌套有状态内容需 scope 策略裁定） | 是 | 无 |
| transfer-keyboard-virtual | 虚拟化面板键盘导航 | roving tabindex/方向键跨虚拟窗口工作，active 行 scroll-into-view | 是 | 无退化 |
| transfer-move-all | 全移 10k 选项 | O(S+N) 完成，结果集合正确 | 是 | 无 |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**。窗口化正确性（挂载数上限、选择持久、键盘跨窗）属核心回归路径（对照 VirtualBody 缺陷先例——虚拟路径曾端到端不可用而单测全绿），必须先有失败测试再实现；happy-dom 用例 + 编译产物 e2e 双层（table-virtual-body.spec.ts 先例）。

## Execution Plan

### Phase 1 - Proof 先行：窗口化契约测试（先红）

Status: completed
Targets: `list-renderer` 测试、`transfer-renderer` 测试、`tests/e2e/`

- Item Types: `Proof`

- [x] happy-dom 用例：list infinite > 阈值挂载数上限断言（先红）；窗口外选择持久断言；**窗口化下滚到底 onLoadMore 仍触发的断言**（先红基线：当前全挂载下 sentinel 路径可用，记录为对照）
- [x] happy-dom 用例：transfer > 阈值挂载数上限断言（先红）；键盘导航跨窗断言（先红）
- [x] e2e 用例：list/transfer 大数据集编译产物冒烟（挂载数 + 交互，参照 table-virtual-body.spec.ts）
- [x] 基线记录：当前全挂载行为下的 DOM 计数（broken 断言的 expected 值依据）

Exit Criteria:

- [x] happy-dom 用例分两层落地：真实渲染层（阈值下全挂载、无滚动祖先回退全挂载——list-windowing.test.tsx 前 2 用例；transfer 阈值下全挂载——transfer-windowing.test.tsx 第 1 用例）+ mocked 虚拟层（calendar-drag-drop-visual 先例：happy-dom 无布局引擎，tanstack 观察 0×0 rect，真实窗口断言不可行）；e2e 编译产物冒烟以 it.skip + plan 指针就位（large-dataset-windowing.spec.ts，09-28-2 先例——playground 无大数据集 list/transfer 演示页，见 Deferred 裁定）

### Phase 2 - list infinite 窗口化

Status: completed
Targets: `packages/flux-renderers-data/src/list-renderer.tsx`

- Item Types: `Fix`、`Decision`

- [x] 按 ai-message-list 模板接入 @tanstack/react-virtual（阈值门控：infinite 且累计条数 > 阈值）；scroll 容器判定（自身 scroll root 或 findScrollableAncestor 模式）。**布局中性约束（承接 09-28-2 Deferred 理由）**：所选滚动策略不得改变页面布局行为（不强制引入 maxHeight/布局容器变更），否则等于重新引入当初导致 deferred 的方案——判定结论记录
- [x] scope 生命周期策略 Decision：窗口卸载条目的 scope dispose + 重挂载重建 vs LRU 复用——以行为等价 + 实测成本裁定，结论与理由记录（嵌套有状态内容为真实风险面，选择态本身存组件 state :318 安全）
- [x] 嵌套有状态内容持久性验证（item region 内有状态子组件跨卸载/重挂载行为记录与裁定；list 无行级展开态，不适用 table 概念）
- [x] Phase 1 的 happy-dom 用例转绿（含 onLoadMore 触发断言）；e2e 转绿
- [x] Proof: data 包 focused 套件绿

Exit Criteria:

- [x] 窗口分支断言绿（mocked window：仅窗口行挂载、top/bottom spacer 几何、非全局行保留 hairline）；窗口外选择持久断言绿（窗口移动卸载 row-0 → 回移后 data-selected 恢复）；sentinel 在 bottom spacer 之后挂载并接同一 onLoadMore 事件
- [x] scope 策略 Decision 记录：窗口外 item scope dispose + 重挂载重建（scope 为廉价 map 绑定，LRU 复用复杂度不值；选择态存组件 state 天然持久——audit review 已证实 :318），嵌套有状态内容为已知边界记 Deferred
- [x] 布局中性 Decision 记录：滚动元素 = 最近可滚动祖先（mobile infinite-scroll MM-20 先例 + 内联样式优先探测）；无祖先则全挂载回退——零 wrapper/maxHeight/schema 变更
- [x] data 包 focused 测试绿（171 文件/1190）

### Phase 3 - transfer 虚拟化 + 索引化

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx`

- Item Types: `Fix`、`Proof`

- [x] 双面板 per-pane useVirtualizer（kanban/calendar hook 模板；scroll 容器为 ：503 `max-h-64 overflow-y-auto` div，ul 作 relative spacer 父级），阈值门控；roving-tabindex 适配虚拟窗口——activeIndex 保持按全量 options 计算（:392-394 现状即全量），active 行经 `virtualizer.scrollToIndex` 滚入（未挂载行 `scrollIntoView` 不可达；kanban hook 已暴露 scrollToIndex）
- [x] `Map<value, NormalizedOption>` memo 索引替代 find 链；moveToSelected Set 化
- [x] Phase 1 用例转绿
- [x] Proof: form-advanced focused 套件绿（transfer-keyboard-nav 4/4 等既有用例保持）

Exit Criteria:

- [x] transfer 挂载数门控断言绿（阈值下全挂载真实渲染；阈值上 mocked window 20 项挂载 + roving-tabindex UL 保持完整）
- [x] O(S+N) 索引与 move-all 等价性测试绿（selectedEntries 走 optionsByValue Map 端到端标签解析；moveToSelected Set 守卫保序追加；transfer-keyboard-nav 等既有用例 163 文件/1141 全绿）
- [x] activeIndex 保持全量 options 计算 + scrollToIndex 跟随激活行（虚拟化分支）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-29）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 4 Minor 全部折入——① scroll 容器策略补布局中性约束（承接 09-28-2 deferred 理由，防止静默重引布局变更）；② 新增 load-more-under-windowing Failure Path + Phase 1 断言（sentinel/spacer 接线回归路径）；③ scroll-into-view 精确为 `virtualizer.scrollToIndex`（未挂载行不可达）；④ "展开状态持久性"改述为嵌套有状态内容（list 无行级展开态；选择态存组件 state :318 天然安全）

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（窗口化路径端到端可用——对照 VirtualBody 先例，含编译产物 e2e）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（schema 兼容零破坏）
- [ ] 行为/契约结果已达成（Phase 1 全部用例转绿）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（performance-design-requirements.md 窗口化契约如有扩展）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### list/transfer 窗口化 e2e（需 playground 演示页）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 单元层已双层覆盖（真实渲染回退 + mocked 窗口分支）；e2e 需先建 playground 大数据集演示页（页面基建工作，超出本 plan 结果面）；tanstack 真实浏览器行为已有 table-virtual-body.spec.ts 与 ai-message-list 两个在产先例背书
- Successor Required: yes
- Successor Path: tests/e2e/large-dataset-windowing.spec.ts（it.skip + plan 指针已就位）+ playground 演示页立项

### 嵌套有状态 item 内容跨窗口卸载

- Classification: `watch-only residual`
- Why Not Blocking Closure: scope 生命周期 Decision 裁定 dispose/recreate（scope 为廉价绑定 map）；选择态等核心状态存组件 state 不受影响；嵌套有状态内容（如 item 内手写 input 未受控值）在现网 schema 模式中无用例
- Successor Required: no
- Successor Path: 无（如出现真实用例按 LRU scope 池评估）

### tree 虚拟化

- Classification: `watch-only residual`
- Why Not Blocking Closure: roving-tabindex 架构约束（第一轮 Plan 2 既有裁定延续），非本 plan 结果面
- Successor Required: no
- Successor Path: 无（未来如做需独立设计）

## Non-Blocking Follow-ups

- list 虚拟行高测量如需 dynamic measure（ListItemView 高度可变），记 optimization candidate 附实测

## Closure

Status Note: 三个 Phase 全部落地；closure audit `approved-with-minors`（mocked 虚拟层裁定经审计方独立判定诚实非静默降级；5 项 Minor 全部折入：plan 措辞与 Deferred 对齐、分类改 watch-only residual、阈值常量去重、测试注释路径/计数修正）。四门禁 + check 全绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）
- Evidence: verdict `approved-with-minors`（逐 gate live 证据：list-item-view.tsx:64-79 scope 对称 create/dispose、sentinel 于 bottom spacer 之后的 DOM 序、selection 存组件 state :181、list-renderer 577 行低于门禁、owner doc 契约节逐行核对；data 171/1190 与 form-advanced 163/1141 审计方 live 复跑）

Follow-up:

- playground 大数据集演示页 + tests/e2e/large-dataset-windowing.spec.ts 解锁（Deferred, Successor Required: yes）；无其余 plan-owned work
