# 1 ui-review 审计 P1 交互/行为缺陷修复（批次一：data / basic / form-advanced / flux-react / ui 五包 10 项）

> Plan Status: completed（2026-08-31 执行完毕：Phase 1–5 全部 completed，10 条 P1 交互/行为缺陷先红后绿修复收口，closure audit 通过——见 Closure Audit Evidence）
> Last Reviewed: 2026-08-31
> Source: `docs/audits/2026-08-28-1659-multi-audit-ui-review.md`（P1 组 A「Interaction / behavior defects」全部 10 条：22-01 / 06-01 / 22-04 / 22-05 / 13-03 / 13-02 / 19-01 / 15-03 / 05-02 / 06-02，均为独立 review 后 retained 的 verified live defect）
> Mission: ui-review
> Related: `docs/plans/2026-08-31-1941-2-ui-review-p1-contract-styling-drift-remediation.md`（契约漂移批次）、`docs/plans/2026-08-31-1941-3-ui-review-p1-a11y-and-test-protection.md`（a11y + 测试保护批次）

## Purpose

把 ui-review 双阶段审计（driver tag `2026-08-28-165941`）组 A 的 10 条 verified P1 交互/行为缺陷全部修复并锁定回归测试：每条缺陷先红后绿单测锁定，修复方式对齐同文件/同包既有 sibling 守卫模式，收口后 ui-review 分支不残留已确认的行为级 live defect。

## Current Baseline

- 审计基线（2026-08-31 审计执行时全绿）：`pnpm check` / `lint` / `typecheck`(37/37) / `build` exit 0；本计划引用的全部 finding 均经独立 review agent 逐条 live 复核（行号在起草时经 executor 抽查再证实，见下）。
- **22-01**：`packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx` `toggleCheckbox`（:351-398）无 `if (saving) return` 在途门禁；`onKeyDown`（:411-426）对 Enter/F2/Space 触发无 `event.repeat` 过滤且不查 saving；同文件 text/number/date 编辑器分支有 `disabled={saving}`（:468/:489）；`++saveGenerationRef` 只丢弃 stale 结果不丢弃 dispatch。全目录交叉核对：checkbox 是唯一缺口（`table-quick-edit-controller.ts:327`、`use-row-quick-edit-draft.tsx:204` 均有门禁）。
- **06-01**：`packages/ui/src/components/ui/drawer.tsx:278-314` `useDrawerResize` 的 pointer 监听在 `onPointerDown` 内注册（非 effect），只在 `pointerup` 移除；`handleMove` 仅 guard `dragStateRef` 不校验按钮；无 `pointercancel`/blur 分支、无卸载清理。同包 `use-dialog-drag.ts:186-189, 222-227` 具备全部卫生措施；resize handle 无 `touch-action`，触屏上浏览器手势接管（→ pointercancel）是常见路径，取消后出现 ghost-resize 窗口（孤儿监听有界自愈，持续缺陷是 ghost-resize）。`drawer-body-scroll-resize.test.tsx` 对 cancel 零覆盖。
- **22-04**：`packages/flux-renderers-data/src/query-filter.tsx:62` `{!collapsed || !enabled ? <div>…{formContent}</div> : null}` 真实卸载内嵌 form；`crud-renderer.tsx:595-604` 同模式卸载 `queryFormRegion`。内嵌 form runtime 无 `valuesPath`，值只存于 runtime store，`dispose()` 即丢弃。`docs/references/renderer-interfaces.md:540-542` 只记载 collapsed/expanded 标签，未记载 draft 丢弃。两宿主一致（uniform design gap）。
- **22-05**：`packages/flux-renderers-basic/src/tabs-view-management.ts:66-90` `runAddTab` 只查 controlled/item-shape/title，不查 value 重复（`runRemoveTab`/`runRenameTab`/`runMoveTab` 均有守卫）；重复 value → 重复 React `key={value}` + 重复 Radix TabsTrigger value，findIndex 寻址只命中第一个副本。契约 `docs/references/renderer-interfaces.md:783-790` 为 remove/rename 定义了失败路径，addTab-duplicate 未定义。
- **13-03**：同文件 `:54` `generateTabValue = \`tab-${Date.now()}\``（同毫秒自碰撞）；`runAddTab`读 render-closure`items` 快照、`commitCollection(next)`写绝对值——同一 tick 两次`invoke('addTab')` 共享 stale ops，第二次 commit 覆盖第一个 tab。
- **13-02**：`packages/flux-renderers-data/src/table-renderer/table-flattened-items.ts:148-165` 比较器比较 `quickEdit`/`quickEditBodyRegionKey`/`copyable` 但遗漏 `editable`；`table-body-row-rendering.tsx:430-439` 由 `column.editable` 驱动单元格 chrome 分支、`:571-609` `MemoizedDataRow` 以该比较器 bail out。运行时动态列已支持（`table-renderer.tsx:82-105`、`table-t28-dynamic-columns.test.tsx`），schema 更新只切换 `editable` 时比较器返回 true → 行跳过重渲染 → 编辑 chrome 陈旧。G6 注释自述"these fields drive cell chrome … Omitting them left the comparator blind"——本缺陷是同构回归（本分支新引入）。
- **19-01**：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:398-437` `applyCommitResult`：`applyCommittedWrites(writes)` 先落、rollback 只在显式 `!settled`/`!draftValid` 分支执行；若 `applyCommittedWrites` 或 `settleParentValidation` 抛异常（异常源已证实：`form-runtime-validation.ts:446-455, 551-558` 校验错误 normalize 后 rethrow），异常直达 `handleConfirm().catch` → "保存失败" notify，但父 form/scope 已含 committed writes 且 `previousValues` 随栈帧丢失。
- **15-03**：`packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx` 全文件无 `measureElement`（`estimateSize` 固定 44px/展开 120px，:113 起）；`ui/src/styles/table.css:17-19` 对 `tbody td` 只设 padding 无固定高度/truncate，换行行高超过估算 → scroll spacer/估算漂移。同仓先例 `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:141`（另有 `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-virtualizer.ts:26`）使用 `ref={virtualizer.measureElement}`。design.md 已裁决的 virtual limitations（E1b combine、E1c tree）不覆盖行高实测。
- **05-02**：`packages/flux-renderers-data/src/batch-bar.tsx:25-26, 39-43, 45-52`：文件注释承诺 "missing path … resolve to an empty array … never throws"，但 `useScopeSelector(..., { enabled: selectionPath.length > 0 })` 在 disabled 分支返回 `options?.fallback` = `undefined`；`selectionPath?: string` 类型可选；`packages/flux-runtime/src/runtime-factory.ts:269-270` 生产编译不带 validation options → `validateBatchBarSchema` 不在生产路径 → `selection.length` TypeError 可达。sibling（`tabs.tsx:67-73`、`use-table-selection.ts:110`）均 null-guard。
- **06-02**：`packages/flux-react/src/use-keyboard-bindings.ts:97-101` attach-time gate 从 `optionsRef` 快照读 `enabled` 一次；effect deps `[signature, surfaceState]`（:192）不含 `enabled`，signature（:54-60）也排除 `enabled` → mount 时 false、后翻 true 永不挂监听（true→false 经 optionsRef 正常关闭）。该 hook 是 `flux-react/src/index.tsx:133-137` 公共导出，语义半 ref 驱动半 assembly 冻结、不对称。当前唯一调用方未传 `enabled`（latent）。
- 工具基线全绿；worktree 纪律：全部改动在 worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），commit 格式 `feat(ui-review): <description>`。

## Goals

- 10 条 P1 缺陷全部修复，每条先红后绿回归测试锁定（测试先失败证明缺陷存在，再修复转绿），修复方式对齐各文件既有 sibling 守卫模式，不引入新抽象面。
- 22-05 附带契约收口：`docs/references/renderer-interfaces.md` tabs handle 契约补 addTab-duplicate 失败路径定义（`{ok:false}` + dev warn 语义）。
- 收口后全部 10 个原始 finding 的触发路径在仓库中可复验为已关闭（对应测试用例即证据）。

## Non-Goals

- 不修复 16 条 P2 与 3 条 P2 观察（已登记 `docs/backlog/audit-followups-2026-08-28-1659.md`，含 07-01 手写 memo 收敛、15-01 warnOnce dev gate 等同文件邻接项——本计划不顺手扩围）。
- 不重构 virtualization 架构、不新增 fixed-row-height CSS 方案裁决（15-03 采用同仓 `measureElement` 先例；CSS 备选仅在实测 `measureElement` 与 `useVirtualizer` 集成冲突时经 Decision 落字切换）。
- 不改 tabs addTab 的对外调用契约形状（`invoke('addTab')` 签名不变，只补守卫与更新语义）。
- 不处理 22-04 的 confirm-before-collapse 备选（统一采用 keep-mounted + hidden 方案，保持两宿主一致）。
- 不动 a11y 属性与 i18n（归批次三 plan）、不动契约/样式漂移项（归批次二 plan）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/`（table-editable-cell.tsx、table-flattened-items.ts、table-virtual-body.tsx、batch-bar.tsx）+ `query-filter.tsx` + `crud-renderer.tsx` + 对应 `__tests__/` 回归测试
- `packages/flux-renderers-basic/src/`（tabs-view-management.ts、tabs.tsx）+ 对应测试
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` + 对应测试
- `packages/flux-react/src/use-keyboard-bindings.ts` + 对应测试
- `packages/ui/src/components/ui/drawer.tsx` + `drawer-body-scroll-resize.test.tsx`
- `docs/references/renderer-interfaces.md`（tabs handle 契约小节：addTab 失败路径补写 + auto value 生成规则句同步，两处均随 13-03/22-05 行为变更）

### Out Of Scope

- 上述 Non-Goals 全部；`packages/ui` 其他组件；table CSS 固定行高方案；`use-row-quick-edit-draft`/`table-quick-edit-controller` 等已正确文件。

## Failure Paths

| 可测场景编号              | 触发                                                   | 行为                                                                                            | 可重试             | 用户可见表现                         |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------ |
| edit-22-01-double-toggle  | saving 进行中再次 toggle（连点/长按 repeat）           | 第二次 toggle 被 `saving` 门禁吞掉，仅一次 save dispatch                                        | 否（无需重试语义） | spinner 存续，无重复写               |
| resize-06-01-cancel       | resize 拖拽中触发 `pointercancel`                      | 执行与 `handleUp` 相同的 teardown，ghost-resize 窗口关闭                                        | 是                 | 尺寸停在取消瞬间，鼠标乱动不再改尺寸 |
| qf-22-04-draft-loss       | 展开的查询 form 已输入未提交 → 点 collapse             | form 保持挂载（hidden），再展开草稿仍在                                                         | 是                 | 草稿不丢                             |
| tabs-22-05-dup-value      | `addTab({value: 'x'})` 而值 'x' 已存在                 | 返回 `{ok:false}` + dev warn；集合不变                                                          | 是                 | 无重复 key/无坏 tab                  |
| tabs-13-03-same-tick      | 同一 tick 两次 `invoke('addTab')`                      | 两个 tab 都存在（managed/local 分支函数式更新 + scope 分支 read-merge-write；value 单调不碰撞） | 是                 | 两个新 tab 都出现                    |
| tbl-13-02-editable-toggle | 动态列 schema 仅切换 `editable`                        | 比较器返回 false → 行重渲染，chrome 更新                                                        | 是                 | 编辑入口立即出现/消失                |
| dv-19-01-validate-throw   | `applyCommittedWrites`/`settleParentValidation` 抛异常 | finally 等价路径执行 rollback 后 re-throw；父 scope 无残留写入                                  | 是                 | "保存失败"提示且界面无幽灵提交值     |
| vt-15-03-tall-row         | 行内容换行超过 44px 估算                               | `measureElement` 实测行高，spacer 不漂移                                                        | 是                 | 滚动无跳动/无空白带                  |
| bb-05-02-no-path          | 合法 schema 未配 `selectionPath`                       | selection 解析为 `[]`，bar 不渲染、零异常                                                       | 是                 | 无崩溃（与注释承诺一致）             |
| kb-06-02-late-enable      | mount 时 `enabled:false` → 后翻 `true`                 | effect 重新运行，监听挂载、快捷键生效                                                           | 是                 | 快捷键可用                           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（10 条均为独立 review 证实的 live defect；每条先红后绿回归测试，Proof 在 Fix 之前；缺陷跨渲染器包与公共导出面，符合"核心回归路径"档）。

## Execution Plan

### Phase 1 - flux-renderers-data 行为缺陷批（22-01 / 22-04 / 13-02 / 15-03 / 05-02）

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx`、`table-flattened-items.ts`、`table-virtual-body.tsx`、`batch-bar.tsx`、`packages/flux-renderers-data/src/query-filter.tsx`、`crud-renderer.tsx`

- Item Types: `Fix | Proof`

- [x] Proof（22-01）：`table-editable-cell` 测试——saving 在途时第二次 checkbox toggle（含 keydown Enter/Space repeat 路径）不产生第二次 save dispatch（先红）
- [x] Fix（22-01）：`toggleCheckbox` 入口加 `if (saving) return`，Checkbox 加 `disabled={saving}`（对齐 :468/:489 sibling）；keydown 路径复用同一门禁
- [x] Proof（22-04）：query-filter / crud 两宿主测试——输入查询草稿 → collapse → expand，草稿值保留、form runtime 未 dispose（先红）
- [x] Fix（22-04）：两宿主 collapsed 分支改 keep-mounted + `hidden`（collapsed 呈现不变——不再卸载而是隐藏，region 保持挂载；不引入确认弹层）
- [x] Proof（13-02）：动态列测试——schema 更新仅切换某列 `editable` → 行重渲染、编辑 chrome 更新（先红；沿 `table-t28-dynamic-columns.test.tsx` 同构用例）
- [x] Fix（13-02）：`table-flattened-items.ts` 比较器补 `column.editable === nextColumn.editable`（沿 G6 注释口径补注释一句）
- [x] Proof（15-03）：virtual body 测试——行内容超高（换行）时 `measureElement` 生效（先红）。测试策略：jsdom 无 ResizeObserver 且 `getBoundingClientRect` 为 0，采用 mock 实测尺寸策略（stub `ResizeObserver` + 行 ref 挂载后注入非估算高度，断言 virtualizer 采纳实测值），并断言行 ref 绑定 `measureElement`（参照 `ai-message-list.tsx` 与 `use-kanban-virtualizer.ts` 先例的接线断言）
- [x] Fix（15-03）：`table-virtual-body.tsx` 行 ref 接 `virtualizer.measureElement`（展开态行同理）；如与既有 estimateSize 缓存冲突，按 Failure Paths 落 Decision 切 CSS 固定行高备选
- [x] Proof（05-02）：batch-bar 测试——不配 `selectionPath` 渲染零异常、bar 不渲染（先红：当前 TypeError）
- [x] Fix（05-02）：`useScopeSelector` options 补 `fallback: []`（或 `selection` 空值 guard），使注释承诺成立

Exit Criteria:

- [x] 5 条缺陷的先红测试在修复前失败、修复后全部转绿（`pnpm --filter @nop-chaos/flux-renderers-data test` 相关文件绿）
- [x] 22-04 两宿主行为一致（query-filter 与 crud-renderer 同一测试断言覆盖）
- [x] 局部 typecheck 通过（后续 Phase 依赖 shared 工作区）

### Phase 2 - flux-renderers-basic tabs addTab 守卫与更新语义（22-05 / 13-03）

Status: completed
Targets: `packages/flux-renderers-basic/src/tabs-view-management.ts`、`tabs.tsx`、`docs/references/renderer-interfaces.md`

- Item Types: `Fix | Proof | Decision`

- [x] Proof（22-05）：tabs 测试——`addTab` 传已存在 value 返回 `{ok:false}`、集合与 active 指针不变、dev warn 触发一次（先红）
- [x] Proof（13-03）：tabs 测试——同一 tick 两次 `invoke('addTab')` 后两个 tab 均存在且 value 互不相同（先红；当前第二次 commit 丢第一个、同毫秒 value 碰撞）；**两个所有权分支各一条**：managed/local 分支 + `itemsOwnership:'scope'` 分支（当前 scope 分支同样从 render-closure `items` 快照构建绝对值写回，缺陷同在）
- [x] Fix（13-03）：**两个分支都消除 stale 快照写**——managed/local 分支改函数式更新（`setManagedItems(prev => …)` 等价物）；scope 分支改为写前从 scope 当前真值重读集合（read-merge-write，不使用 render-closure `items` 构建 `next`）；`generateTabValue` 改单调计数器（如 `tab-<n>` 递增，避免 `Date.now()` 碰撞；落地格式若非 `tab-<ts>`，随本 Phase 的契约句同步更新）
- [x] Fix（22-05）：`runAddTab` 补重复 value 守卫——命中已存在 value 返回 `{ok:false}` + dev warn（对齐 remove/rename 守卫与 dev-warn 模式）
- [x] Decision（22-05 契约面）：addTab-duplicate 语义定为拒绝式（`{ok:false}` + dev warn），落字 `docs/references/renderer-interfaces.md` tabs handle 契约（:783-790 区域）：①与 remove/rename 失败路径并列补 addTab-duplicate 失败路径一句；②同步修订 `:783-784` 的 auto value 生成规则句（现文 `tab-<ts>`，如 value 格式改为计数器则一并更新）——两句属同一契约小节，随本次行为变更一起收口

Exit Criteria:

- [x] 先红测试转绿（13-03 两分支用例 + 22-05 用例，共 3 条先红；`pnpm --filter @nop-chaos/flux-renderers-basic test` tabs 相关文件绿）
- [x] `docs/references/renderer-interfaces.md` addTab 失败路径条目与实现行为逐字一致
- [x] 既有 tabs 测试（含 22-05 相关受控/非受控分支）零回归

### Phase 3 - flux-renderers-form-advanced detail-view 回滚收敛（19-01）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`

- Item Types: `Fix | Proof`

- [x] Proof（19-01）：detail-view 测试——沿已证实的 rethrow 路径构造异常（校验 action 抛错 → `form-runtime-validation.ts:446-455, 551-558` normalize 后 rethrow，经 `settleParentValidation` 到达 `applyCommitResult`）→ 断言父 scope/form 无 committed writes 残留、confirm 以失败收敛（先红：当前异常路径残留写入；模块内部函数不可直接 stub，异常必须走真实校验 action 路径）
- [x] Fix（19-01）：`applyCommitResult` 的 apply→validate→rollback 包 try/catch：异常路径先 `rollbackCommittedWrites(previousValues)` 再 re-throw（保留调用方 `.catch` 的"保存失败"通知语义）

Exit Criteria:

- [x] 先红测试转绿：异常路径父值回滚 + 失败通知路径不回归
- [x] 正常保存 / `!settled` / `!draftValid` 三条既有分支行为不变（既有 detail-view 测试零回归）

### Phase 4 - flux-react useKeyboardBindings enabled 接线（06-02）

Status: completed
Targets: `packages/flux-react/src/use-keyboard-bindings.ts`

- Item Types: `Fix | Proof`

- [x] Proof（06-02）：hook 测试（新建 `packages/flux-react/src/__tests__/use-keyboard-bindings-enabled.test.tsx`，需 provider harness 提供 surface runtime；与 `flux-renderers-basic/src/__tests__/keyboard-bindings.test.tsx` 是不同文件不同层）——`enabled:false` mount → 翻 `true`（`rerender`）→ 键盘事件匹配生效（先红：当前永不挂监听）；同时锁定 `true→false` 关闭路径不回归
- [x] Fix（06-02）：`enabled` 加入 attach effect 依赖（`signature, surfaceState` 之外补 `enabled`；signature 计算保持排除 `enabled` 以免重复重挂），或等价解耦方案落字选择理由

Exit Criteria:

- [x] 先红测试转绿（`pnpm --filter @nop-chaos/flux-react test` keyboard-bindings 相关文件绿）
- [x] 公共导出（`flux-react/src/index.tsx:133-137`）API 形状不变；`enabled` 双向翻转语义对称

### Phase 5 - ui drawer resize 指针生命周期（06-01）

Status: completed
Targets: `packages/ui/src/components/ui/drawer.tsx`

- Item Types: `Fix | Proof`

- [x] Proof（06-01）：`drawer-body-scroll-resize.test.tsx` 补 cancel 用例——pointerdown → pointermove → `pointercancel` → 后续无按钮 pointermove 不再改尺寸（先红）
- [x] Fix（06-01）：`useDrawerResize` 注册 `pointercancel` 监听（teardown 与 `handleUp` 同体），或按同包 `use-dialog-drag.ts:186-189, 222-227` 模式把注册迁入 effect + cleanup；两种实现任选，落字选择；`handleMove` 补按钮按下校验（对齐 dialog-drag 卫生）

Exit Criteria:

- [x] cancel 用例转绿；resize 正常路径（pointerdown/move/up、min/max clamp）既有测试零回归
- [x] `pnpm --filter @nop-chaos/ui test` 相关文件绿

> Fix 落字（06-01 实现选择）：保留 onPointerDown 内注册的既有结构，teardown 抽取为单一函数并被 pointerup / pointercancel / lostpointercapture 三路共用（对齐 use-dialog-drag 卫生），另补 unmount mid-drag 的 cleanup effect（teardownRef）与 handleMove 的 buttons===0 按钮按下校验；既有测试仅将 pointermove 事件补全为 buttons:1 的真实指针状态，断言未改动。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session R1 `ses_fa85589e2ffe0QlcnEJNg08QUr`（VERDICT: issues，0 Blocker / 2 Major / 7 Minor）；R2 scoped re-check `ses_fa84bb8e8ffewKgJRbS7HRBqQ0`（VERDICT: pass-with-minors，全部 Major/Minor 确认 resolved，零新 Blocker/Major）
- Verdict: `pass-with-minors`（共识达成：零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: R1 Major-1（13-03 scope 分支未覆盖 → 改为双分支 Proof + scope 分支 read-merge-write Fix）；R1 Major-2（owner-doc auto-value 句自相矛盾 → Scope/Decision 扩为两句同步）；R1 Minor a-g（runtime-factory 路径 / ai-message-list 路径 + kanban 先例 / crud 行号 / 15-03 mock 实测策略 / 19-01 真实 rethrow seam / 06-02 新测试文件名 / 22-04 措辞）随修订落实；R2 剩余 3 Minor（`:786`→`:783-784`、先红计数 3 条、Failure Path 措辞）已就地修正。

## Closure Gates

- [x] 全部 10 条 in-scope confirmed live defects 已修复（10 条 finding ID 逐条对应测试证据）
- [x] 不适用：本计划无 contract drift 收口项（22-05 契约补写归 Goals 第二条，随 Phase 2 验收）
- [x] 行为/契约结果已达成（Failure Paths 表 10 行全部有对应用例且绿）
- [x] 必要 focused verification 已完成（先红后绿证据落 Phase Exit Criteria）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（`docs/references/renderer-interfaces.md` addTab 契约；其余无 owner-doc 改动项不写凑数条目）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——本计划不设 deferred 项；全部 finding 为 Fix，不可降级。）

## Non-Blocking Follow-ups

- 审计交叉模式 1 提到的"async-saving / pointer-drag listener 卫生 lint"门禁候选：登记为 optimization candidate，不在本计划落地（归后续 D2 类门禁轮次评估）。

## Closure

Status Note: 2026-08-31 收口。10 条 in-scope verified live defect 全部修复并先红后绿单测锁定（22-01 / 06-01 / 22-04 / 22-05 / 13-03 / 13-02 / 19-01 / 15-03 / 05-02 / 06-02）；22-05 契约收口落字 `docs/references/renderer-interfaces.md`（addTab auto value `tab-<n>` 单调计数器 + duplicate 拒绝式失败路径）。执行期两项在案发现：①22-04 深挖出同源缺陷（crudScope 每渲染换 identity 致内嵌查询 form runtime 重建丢草稿）并以 `use-crud-query-form-scope.ts` identity-stable 绑定一并修复；②22-04 修复使 `crud-renderer.tsx` 触发 oversized 700 行硬线，按 MUST split 抽取该模块收敛回 698 行。验证基线 full-green：typecheck/build/lint 37/37、test 68/68 任务全绿、`pnpm check` exit 0（oversized 硬线仅 2 exempt locale，与登记基线一致）。批次二/批次三 plan 依执行序另行推进；三批全收口后源审计 `> Audit Status:` 方按起草轮规则 `planned` → `closed`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session `ses_fa7cfbc73ffeOY4K3D7ojfG8x3`（VERDICT: ISSUES，1 Major docs-placement only + 3 Informational；全部 10 处修复点逐一比对通过、10 个测试文件逐一对齐 Failure Paths、五包测试独立重跑全绿（data 1036 / basic 594 / form-advanced 1063 / flux-react 517 / ui 165）、四门禁独立重跑 exit 0、红态抽查两条真实复现（stash 复原 byte-identical）、scope 干净）
- Evidence: Major finding（执行记录误落 `docs/logs/2026-08-31.md` 游离文件）已随共识修复——8 行执行记录迁入 `docs/logs/2026/08-31.md`、游离文件删除；auditor 明示修复后本审计证据支持收口（审计记录原文："once done, this audit's evidence ... supports closure, and this audit may be cited in the plan's Closure Audit Evidence section"）。执行记录含 full-green verification 语句，见 `docs/logs/2026/08-31.md` 批次一条目。

Follow-up:

- oversized WARN 治理候选：本批次四个既有 over-limit 文件行数小幅增长（crud-renderer.tsx 696→698、table-body-row-rendering.tsx 680→688、table-editable-cell.tsx 525→532、detail-view.tsx 638→650），均在 500 行 WARN 区登记口径内；crud-renderer.tsx 距 700 硬线余量仅 2 行，后续触碰该文件的 plan 应优先评估再抽取（22-04 的 `use-crud-query-form-scope.ts` 抽取先例）。
