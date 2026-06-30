# {1} Table Cluster Selection / Drag / Dotted-Path / Render-Equivalence Convergence

> Plan Status: completed
> Last Reviewed: 2026-06-27
> Mission: amis-bug-driven-improvements
> Source: remediation bundle for the table-renderer cluster findings (M-01/G2/G6/G7/G8/G10/M-04/M-10) of the 2026-06-26-1859 audit round
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md, audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md
> Related: docs/plans/2026-06-26-0520-1-b31-table-row-identity-pagination-clamp-sort-selection-plan.md, docs/plans/2026-06-26-0830-1-b33-table-advanced-tree-aggregate-perf-plan.md

## Purpose

收口 `flux-renderers-data` 的 table-renderer 子簇（及 chart 兄弟）在本 mission（`amis-bug-driven-improvements`，B3.1/T6/B3.2 波次）中引入或暴露的选择 / 拖拽 / 点号路径 / 列等价契约不一致，使 display、event payload、API、响应式展开行、列变更后渲染的 cell chrome 这五条可观测通道彼此一致，并补齐缺失的回归测试。

## Current Baseline

核对自 HEAD `77bd50b6`（与两份审计的快照一致，无代码漂移）：

- **M-01 / G7（selection 不回写）**：`use-table-selection.ts:65-95` 的 `selectedRowKeys` 剪枝 memo 返回新 `Set` 但**从不 `setLocalSelectedRowKeys`**。`localSelectedRowKeys` 因此终身保留幻影 key；`handleSelectRow`（`:230+`）在 `'local'`（默认）分支以**未剪枝的** `localSelectedRowKeys` 为 `baseSet` 构造 payload，导致 `onSelectionChange` 重新带入已删行的 key。只要存在一个幻影 key，`changed === true` 每次渲染都成立 → 每渲染分配新 Set → `selectedRowKeys` 引用每渲染变化 → 下游 memo（`useTableHandle` 的 registry 注册、virtualizer 的 flattenedItems）每渲染重算。
- **G2（tree 子行不可选）**：`currentRowKeySet` 取自 `normalizedRows = rows`（`use-table-selection.ts:58-63`，仅顶层），而 tree 子节点在更下游 `use-table-tree.ts:81-99` 才被 flatten 出来。勾选展开的子行时 `onSelectionChange` **会**发出子 key（M-01 路径），但下一渲染的剪枝 memo 因 `currentRowKeySet.has(childKey)===false` 把它丢掉 → 复选框弹回未选。`handleSelectAll`/`allSelected` 同样只遍历顶层。现有 `table-tree-selection-no-cascade.test.tsx:25-29` 把子行建模成 source 的顶层行，恰好落入 `currentRowKeySet`，故测试通过而 G2 仍活。
- **M-04（dotted-column 断裂）**：新文件 `table-expanded-row.tsx:74-80` 在响应式 expand 模式下用 `record[column.name]` 读隐藏列值；对 `"user.address"` 解析为 `record["user.address"]`（通常 `undefined`）。同波次 B3.1/T6 已把 `table-cell-chrome.tsx:35` 改为 `getIn`，但没覆盖这条新提取的分支。`table-dotted-column-paths.test.tsx` 无响应式隐藏列用例。
- **G6（列等价 memo 漏字段）**：新文件 `table-flattened-items.ts:84-94` 的 `areColumnsRenderEquivalent` 比较 `name,type,width,fixed,cellRegionKey,buttonsRegionKey,labelRegionKey,popOver`，但**不含** `quickEdit/quickEditBodyRegionKey/copyable`；而 `table-body-row-rendering.tsx:299` 与 `table-cell-chrome.tsx:35,51` 会读这些字段。运行时列 schema 变更只动这些未比较字段时，比较器返回 `true` → `MemoizedDataRow` 跳过重渲染 → cell 保留旧（无编辑/无复制）UI。
- **G8（chart pie/scatter 点号路径）**：`chart-renderer.tsx:182,238,310-311` 用裸 `record[key]`；与 M-04 同类缺陷（同 B3.1/T6 契约），但 chart 的 cartesian 路径（`:337,364,389`）正确交给 recharts 解析点号 `dataKey`，pie/scatter 不一致。
- **G10（controlled 拖拽静默回退）**：`use-row-drag-sort.ts:154-155` 的 `controlled` 分支不设 `localOrderKeys` → `orderedKeys===natural` → `displayData` 忽略落点 → 行落回原位；`onReorder` 缺失时整次交互是静默空操作，dev warning（`:101-107`）只在缺 `orderField` 时触发。`controlled` 分支为本 mission 新增。
- **M-10（手写 useMemo 无 Compiler 逃逸）**：`use-row-drag-sort.ts:71,88,96` 与 `use-table-selection.ts:60,65` 新增手写 `useMemo`，无 `eslint-disable-next-line react-compiler/react-compiler`。仓库以 React Compiler error 级别运行，AGENTS.md 默认不加 memo。
- 绿基线：`pnpm typecheck`/`test`/`lint` 全过（lint 仅 1 条与 mission 无关的 `useVirtualizer` 警告）。

## Goals

- 选择状态的三条通道（`api.selectedRowKeys` 展示值、`onSelectionChange` payload、内部 `localSelectedRowKeys`）对已删/已过滤行保持一致，幻影 key 既不出现在展示也不出现在 payload。
- tree-table 展开子行可被勾选并持久；`handleSelectAll`/`allSelected` 覆盖被渲染的扁平行。
- 响应式展开行、chart pie/scatter 的点号 `column.name`/`dataRegionKey` 解析与桌面态一致。
- 列 schema 仅变更 `quickEdit/copyable` 等字段时，cell chrome 随之刷新。
- `controlled` 拖拽缺 `onReorder` 时有可观测告警或乐观本地落序，落点不再静默回退。
- 上述每条契约都有 focused 回归测试钉死。
- 文件级 memo 遵守 React Compiler 约定。

## Non-Goals

- 不重写 selection ownership 模型（`local`/`scope`/`controlled` 三态语义保持）。
- 不引入虚拟化或大规模性能重构（G7 的 re-render 风暴随回写修复自然消失，不单独做 profiling 基准）。
- 不改 CRUD `autoClearSelectionOnRefresh`（属 list 端 G12，归 Plan {3}）。
- 不动 `crud-renderer.tsx:447` 的 raw-schema `item/card` regions（已 open 的 C-03）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`（剪枝回写 / payload 基源 / tree 扁平源）
- `packages/flux-renderers-data/src/table-renderer/table-renderer.tsx`（selection 接入的扁平行源）
- `packages/flux-renderers-data/src/table-renderer/use-table-tree.ts`（子 key 源核对）
- `packages/flux-renderers-data/src/table-renderer/table-expanded-row.tsx`（getIn）
- `packages/flux-renderers-data/src/table-renderer/table-flattened-items.ts`（列等价字段）
- `packages/flux-renderers-data/src/chart-renderer.tsx`（pie/scatter getIn）
- `packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts`（controlled 告警 + memo 约定）
- 上述各文件的 `__tests__` 回归用例

### Out Of Scope

- list/tree/upload/composite-field 簇（归 Plan {3}）
- 校验 / 诊断 / contract-honesty / i18n（归 Plan {2}）

## Failure Paths

| 场景                             | 触发                                           | 行为                                            | 可重试 | 用户可见表现       |
| -------------------------------- | ---------------------------------------------- | ----------------------------------------------- | ------ | ------------------ |
| selection-payload-phantom (M-01) | 删行后勾选存活行                               | payload 仅含存活 key，无 404/no-op 风险         | 否     | 父组件收到合法 key |
| child-unselectable (G2)          | 展开并勾选子行                                 | 子 key 进展示+payload 且持久                    | 否     | 复选框保持勾选     |
| dotted-expanded (M-04)           | 窄屏 + `column.name="a.b"`                     | 展开行显示 `record.a.b`                         | 否     | 单元格非空         |
| controlled-drag-noop (G10)       | `orderOwnership:'controlled'` 且无 `onReorder` | dev 告警；落点可见（乐观落序）或明确 no-op 提示 | 否     | 拖拽行为可诊断     |

## Test Strategy

档位选择：**必须自动化**（覆盖 headline 契约项 M-01/G2/M-04/G6/G8/G7/G10）；M-10 为 P3 lint/约定项，其退出标准是 `pnpm lint` 无新增 react-compiler 报错，不强制 failing-test-first。

理由：headline 项都是 mission 刚锚定契约的回归，且现有测试恰好给出虚假信心（剪枝只断言展示、tree 测试把子行建成顶层行、dotted-path 测试无响应式分支）。每条 Proof 必须先于 Fix 写出失败用例。

## Execution Plan

### Phase 1 - 选择回写与 payload 一致性（M-01 + G7 根因）

Status: completed
Targets: `use-table-selection.ts`, `__tests__/table-selection-invariants.test.tsx`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：新增回归测试——选中行 → 删除该行 → 再勾选一个存活行 → 断言 `onSelectionChange` payload 不含任何幻影 key，且连续两次渲染后 `selectedRowKeys` 引用稳定（无风暴）。先确认失败。
- [x] **Fix**：让 `localSelectedRowKeys` 始终干净——优先在 `handleSelectRow`/`handleSelectAll` 写入位点剪枝（mutation-site prune），使渲染时 memo 退化为直通；若保留渲染期剪枝则必须在 `changed===true` 时通过 `useEffect` 回写 `setLocalSelectedRowKeys(pruned)`。所有 ownership 分支的 payload `baseSet` 统一取自干净后的 `selectedRowKeys`。
- [x] **Proof**：上述测试转绿；保留并扩充原 `table-selection-invariants.test.tsx`（不得削弱已有展示断言）。

Exit Criteria:

- [x] `onSelectionChange` payload 在删行后再选择时不含已删 key（repo 可见测试断言）。
- [x] 存在幻影被清理后，`selectedRowKeys` 引用不再每渲染变化（引用稳定性断言）。
- [x] 既有 `api.selectedRowKeys` 展示断言仍通过。

### Phase 2 - tree-table 子行可选性（G2）

Status: completed
Targets: `use-table-selection.ts`, `table-renderer.tsx`, `use-table-tree.ts`, `__tests__/table-tree-selection-no-cascade.test.tsx`

- Item Types: `Proof` / `Fix`

- [x] **Proof**：新增测试，子行是经 `flattenTreeRows` 真实嵌套展开的记录（非 source 顶层行）；展开父行 → 勾选子行 → 断言子 key 出现在展示与 `onSelectionChange` 且持久到下一渲染。
- [x] **Fix**：把 `currentRowKeySet`（及 `handleSelectAll`/`allSelected` 的遍历源）改取自被渲染的扁平行集（`treeFlattenedData`/`displayData`），而非顶层 `filteredData`；或将扁平行透传给 selection。**接线提示**：`table-renderer.tsx` 中 `useTableSelection`（`:253`）在 `useTableTree`（`:259`）之前调用，故 flatten 在 selection 构建 `currentRowKeySet` 时尚未可得——需将 flatten 步骤上提（在 selection 之前算出 `treeFlattenedData`），或把扁平行作为参数透传给 `useTableSelection`。Phase 1 先让 `localSelectedRowKeys` 始终干净、使渲染期剪枝退化为直通，正是为了在 Phase 2 改 `currentRowKeySet` 源时不引入新的交互副作用。
- [x] **Proof**：测试转绿；核对 `keepOnPageChange` 语义未被破坏。

Exit Criteria:

- [x] 真实嵌套子行可被勾选并持久（测试断言展示+payload）。
- [x] `select all` 覆盖扁平可见行（含子行）。

### Phase 3 - controlled 拖拽可观测性（G10）

Status: completed
Targets: `use-row-drag-sort.ts`

- Item Types: `Proof` / `Fix` / `Decision`

- [x] **Decision**：裁定 `controlled` + 缺 `onReorder` 的行为——采用受控组件惯例：乐观本地落序并调用 `onReorder?.()`；当 `onReorder` 缺失时发 dev 告警（与缺 `orderField` 的现有告警同通道）。**执行裁定（落实）**：保留真正的受控语义（不在本地持久落序——`orderedKeys` 仍跟随父端 rows；`onReorder?.()` 通知父端），仅当 `controlled && !onReorder` 时发 dev 告警，使原先的静默空操作变为可观测。退出标准为 OR 语义（“落点可见**或**告警可观测”），由告警满足；既有 controlled-ownership 回归测试（自然序保留 + `onReorder` 触发 + 不写 scope）不削弱。
- [x] **Proof**：测试 `orderOwnership:'controlled'` 无 `onReorder` 时落点不再静默回退（乐观落序生效或可观测告警已发出）。
- [x] **Fix**：在 `controlled` 分支落地上述裁定。

Exit Criteria:

- [x] `controlled` 缺 `onReorder` 时落点可见或告警可观测（测试断言）。

### Phase 4 - dotted-path 与列等价一致性（M-04 + G6 + G8）

Status: completed
Targets: `table-expanded-row.tsx`, `chart-renderer.tsx`, `table-flattened-items.ts`, `__tests__/table-dotted-column-paths.test.tsx`, chart 测试

- Item Types: `Proof` / `Fix`

- [x] **Proof**：为 `table-dotted-column-paths.test.tsx` 增加响应式 expand 隐藏列分支（`column.name="user.address"`）；为 chart 增加 pie/scatter 点号 `dataRegionKey` 用例。均先确认失败。
- [x] **Fix (M-04)**：`table-expanded-row.tsx` 引入 `getIn`，用 `getIn(record, column.name)`（优先经 `bindings` 透传 `record`/`index` 而非 render 期回读 scope）。
- [x] **Fix (G8)**：`chart-renderer.tsx:182,238,310-311` 三处改用 `getIn(item, key)`。
- [x] **Fix (G6)**：`areColumnsRenderEquivalent` 增加 `quickEdit`/`quickEditBodyRegionKey`/`copyable`（或对 chrome 相关字段做深度比较），并加测试：仅切换 `quickEdit`/`copyable` 后 `MemoizedDataRow` 重渲染。
- [x] **Proof**：全部转绿。

Exit Criteria:

- [x] 窄屏展开行显示点号列正确值（测试断言）。
- [x] pie/scatter 点号 `dataRegionKey` 解析正确（测试断言）。
- [x] 仅变更 `quickEdit`/`copyable` 时 cell chrome 刷新（测试断言）。

### Phase 5 - React Compiler memo 约定（M-10）

Status: completed
Targets: `use-row-drag-sort.ts`, `use-table-selection.ts`

- Item Types: `Fix`

- [x] **Fix**：对 Phase 1-4 之后仍存在的派生态 memo，逐个裁定——能交由 Compiler 的删除手写 memo；确有 profiling 依据的保留并补 `eslint-disable-next-line react-compiler/react-compiler` + 理由注释。

Exit Criteria:

- [x] 两文件内新增手写 `useMemo` 要么删除、要么带合规逃逸注释（`pnpm lint` 无新增 react-compiler 报错）。

## Draft Review Record

- Reviewer / Agent: fresh-session general sub-agent (ses_0faa66c7fffeB4bjavqzO1KimJ)，独立通读 + live repo 核对。
- Verdict: `pass-with-minors`（零 Blocker、零 Major）。
- Rounds: 1。
- Findings addressed:
  - 所有引用（HEAD `77bd50b6`、各文件/行号、函数名）经 live 核对一致；唯一 chart cartesian 对比行 `:363`→`:364`（Area `dataKey`）off-by-one，已修正（非承重）。
  - Minor：顶部状态块补 `> Source:` 行以符合模板；M-10 在 `必须自动化` 档位下的范围已加注（退出标准为 `pnpm lint`，不强制 failing-test-first）；Phase 2 补 hook 接线提示（`useTableSelection` 先于 `useTableTree`，需上提 flatten）。
  - 捆绑评估：8 项全部落在 `flux-renderers-data`（table-renderer 簇 + chart 兄弟），G7 是 M-01 的结构根因（同剪枝 memo）、G8 与 M-04 同 dotted-path 契约，捆绑连贯，非 grab-bag。
- 共识：达成。Plan 状态 `draft` → `active`。

## Closure Gates

- [x] M-01：删行后再选，payload 无幻影 key（focused 测试 + live 抽查）。
- [x] G7：选择回写后无逐渲染重算风暴（引用稳定性测试）。
- [x] G2：真实嵌套 tree 子行可选且持久（focused 测试）。
- [x] M-04：响应式展开行点号列正确（focused 测试）。
- [x] G6：列仅变 `quickEdit`/`copyable` 时 cell chrome 刷新（focused 测试）。
- [x] G8：pie/scatter 点号 `dataRegionKey` 解析（focused 测试）。
- [x] G10：controlled 缺 `onReorder` 行为可观测（focused 测试）。
- [x] M-10：手写 memo 合规（lint 无新报错）。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect。
- [x] 受影响 owner docs（`docs/architecture/renderer-runtime.md` 若选择语义有变）已同步或明确无需更新。（明确：选择 ownership 三态语义未变，fixes 为对既有契约（T6 getIn / T10 prune / 三通道等价）的完成性收口；已同步至 `docs/components/table/design.md` §7 “选择 / 拖拽 / 点号 等价收敛（2026-06-27）”小节。`renderer-runtime.md` 无选择 payload/prune 契约面，无需更新。）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- **M-10 handwritten memo 裁定（non-blocking，保留）**：`use-table-selection.ts` 的 `currentRowKeySet` / `selectedRowKeys` 与 `use-row-drag-sort.ts` 的 `orderedKeys` / `rowsByKey` / `orderedRows` 经 react-compiler 规则实跑（已用探针确认规则在本仓处于激活态）**未被标记**（`pnpm lint` 全绿）。裁定保留而非删除：
  - `selectedRowKeys` 是承重 memo——G7 引用稳定性 Proof 直接依赖其 identity 稳定；删除后在上游 ref 不稳（如 SelectionProbe 每渲染重建 `normalizedRows`）的场景会每渲染分配新 Set，使 G7 Proof 倒退，属行为变更而非纯优化。
  - 其余 memo 为避免每渲染重分配 Set/Map/Array 并稳定下游依赖 identity。
  - 不可加 `eslint-disable-next-line react-compiler/react-compiler`：规则未报错，加注会变成 unused directive，而 `reportUnusedDisableDirectives: 'error'` 将其升级为 lint error。
  - 本计划所有改动**未新增任何 `useMemo`/`useCallback`**，故“无新增 react-compiler 报错”退出标准天然满足。

## Non-Blocking Follow-ups

- 若 Phase 2 发现 `keepOnPageChange` 与 tree 扁平源存在边界交互，作为 watch-only 记录，不阻塞 closure（当前无证据）。

## Closure

Status Note: 全部 5 Phase 完成，8 项 findings（M-01/G7/G2/M-04/G6/G8/G10/M-10）经独立 fresh-session closure-audit 逐条 live 复核 confirmed-fixed；workspace typecheck/build/lint/test 全绿（flux-renderers-data 74 files / 607 tests，+16 focused 回归测试，均 proof-first）。选择 ownership 三态语义不变；fixes 为对既有契约的完成性收口。M-10 派生 memo 裁定保留（见 `## Deferred But Adjudicated`）。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session general sub-agent `ses_0fa792c55ffeh2FSzL9HkvHcLh`（非执行者；live repo 复核）。
- Verdict: `pass-with-minors`（0 blocker / 0 major）。
- Evidence: 三条 minor 已处置——(1) daily log 已补（`docs/logs/2026/06-27.md` 本计划条目）；(2) owner-doc gate 已显式裁定并同步至 `docs/components/table/design.md` §7；(3) G10 Phase-3 Decision 文本已与落实的“告警-only”裁定对齐。Gate 实跑：`pnpm --filter @nop-chaos/flux-renderers-data typecheck` PASS、`lint` PASS（0 errors）、`build` PASS、`npx vitest run` 74 files / 607 tests PASS（与执行者声明一致）。逐 finding live 复核：M-01 `handleSelectRow` baseSet 取 pruned `selectedRowKeys`（`use-table-selection.ts:242`）、`localSelectedRowKeys` 已出 deps；G7 identity 测试对 churn 敏感（真）；G2 `useTableTree` 先于 `useTableSelection`、selection 收 `treeFlattenedData`、非树表 passthrough；G10 告警条件恰为 `controlled && !onReorder`、既有 controlled 测试不削弱；M-04/G8 两文件无残留 raw 点号查找；G6 比较器含三新字段。Scope 干净：所有 code delta 在 `packages/flux-renderers-data/src/`，无 build artifact 入 `src/`。

Follow-up:

- no remaining plan-owned work. 姊妹 plan `docs/plans/2026-06-27-1030-2-validation-i18n-diagnostics-contract-honesty-anchor-plan.md`（M-02/M-03 等）与 `2026-06-27-1030-3-composite-field-data-lifecycle-form-control-correctness-plan.md`（M-05 等）各自拥有剩余 findings。
