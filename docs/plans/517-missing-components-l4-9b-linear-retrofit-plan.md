# 517 Missing Components L4.9b — linear replica retrofit（keyboard + modifierSelect + optionRow 核实）

> Plan Status: completed
> Last Reviewed: 2026-09-26
> Source: `docs/discussions/2026-09-26-l4-9-replica-retrofit-scoping.md`（517 簇裁定）；C2 回写⑫⑬（缺口已由原语消解）
> Related: `docs/plans/516-missing-components-l4-9a-antdpro-retrofit-plan.md`（先行簇）

## Purpose

把 linear-issues 的键盘交互（chord G/O/M、J/K 指针、shift/meta 选区）从页内自建实现迁移到 D1 原语通道（`keyboard` renderer bindings + `rowSelection.modifierSelect`/`selectAllMode`），optionRow 格核实落终态；行为保持，e2e 随迁。

## Current Baseline

- linear-issues.json:2086 `rowSelection`（checkbox）；:2088/:2132 `selectedRowKeys`（clearSelection args 等）。
- 键盘面：chord G/O/M、J/K 指针移动、shift/meta 选区——页内自建 keydown 处理（宿主级 addEventListener 岛或宿主事件，子计划内核实落点）。
- `keyboard` renderer（flux-renderers-basic）+ 共享解析（flux-react keyboard.ts，含 space 别名）在库；`modifierSelect`/`selectAllMode` 已交付。

> **Phase 1 执行期核实更正（2026-09-26）**：「页内自建 keydown 处理」经核实**不存在**。grep（keydown/KeyboardEvent/chord/metaKey/shiftKey，apps/playground + complex-pages + schema）零命中；linear-issues 帮助弹窗原文记载「原版键盘原语（复刻未模拟……）」+「键盘序列监听与修饰键手势属运行时能力缺口（G-B2）」，e2e 头注亦裁决键盘手势不模拟（G-B2）。故本 Phase 实为**缺口消解式新接线**（scoping 回写⑫⑬口径），而非既有实现的等价迁移；无旧路径需要拆除，Exit Criteria「旧路径零残留」以 grep 零命中为证。

## Goals

- shift/meta 选区 → `rowSelection.modifierSelect: true`（+`selectAllMode` 按现行为选 all/page）；meta/ctrl+A 全选由 modifierSelect 内建。
- chord G/O/M 与 J/K → `keyboard` renderer bindings 表达（bindings/keys/chord/when/action；chord 用 parseKeySequence 语法）。
- optionRow 格核实落终态。
- e2e：linear 交互套全绿（键盘行为断言随通道迁移，语义不变）。

## Non-Goals

- 视觉重设计；testid 变更；OS clipboard；peek 触发链语义改动。

## Failure Paths

| 编号               | 触发                 | 行为                                       | 可重试 | 用户可见 |
| ------------------ | -------------------- | ------------------------------------------ | ------ | -------- |
| chord-in-input     | 焦点在输入框按 chord | bindings 不触发（allowInInput false 缺省） | —      | 正常输入 |
| modifier-selection | ⇧/meta 点击行        | 与原行为等价（锚点范围/独立切换）          | 是     | 行为一致 |

## Test Strategy

档位：**必须自动化**——既有 linear 交互套全绿 + 键盘行为断言迁移。

## Execution Plan

### Phase 1 - 键盘通道迁移 + 格核实

Status: completed（2026-09-26）
Targets: `apps/playground/src/complex-pages/page-schemas/linear-issues.json`（及 peek 触发链相关节点）

- Item Types: `Fix`、`Proof`
- [x] shift/meta 选区 → modifierSelect/selectAllMode；chord/J/K → keyboard bindings（逐键映射表见下方「Phase 1 逐键映射表」）
- [x] optionRow 格核实终态（结论：**适用**，已落 J/K 高亮通道；详见映射表注 4）
- [x] e2e 断言迁移 + linear 交互套全绿（新增 L5 describe 3 例；21 用例全绿，playground 单测 391 全绿）

Exit Criteria:

- [x] 旧键盘实现路径零残留（grep：complex-pages 内 keydown/KeyboardEvent/metaKey/shiftKey 实现级命中为 0——原就不存在；帮助文案 G-B2 缺口措辞 0 残留，改记「已由 D1 原语消解」）；linear 交互 e2e 全绿（21 用例末次验证 exit=0：19 首过 + 2 flaky 重试过、0 失败；flaky 为 openPage 冷启动超时，stash 掉本 plan 改动的基线树同复现，判定为预置基建噪声非本改动回归）；flux-playground 单测 391/391 全绿

#### Phase 1 逐键映射表

| 原版键位/手势                  | 迁移前落点                                                   | 终态通道                                                                                                                                                                                                                                                                                              | 裁决                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `G`+`I/M/A/D/C/P/S` chord 导航 | 未实现（G-B2；仅 cmdk kbd 提示与帮助文案）                   | `keyboard` bindings ×7 → `navigate` action（与 `cmd-nav-*` 命令同 href 同语义）；`allowInInput` 缺省 false（cmdk 输入内不触发，e2e 19 锁定）                                                                                                                                                          | 已接线                                                                                                                                                                                                            |
| `J`/`K` 高亮指针移动           | 未实现（G-B2）                                               | `keyboard` bindings（j/k → `setValue issueHighlightIdx`，表达式 `$Math.min/max + COUNT` 钳位，undefined→首行）+ `optionRow.value: "${issues?.items[issueHighlightIdx]?.id}"` + `selectedClass: ln-row-highlight`（CSS 左缘条，与 checkbox 选中紫底 `:has([data-checked])` 通道互不覆盖）；e2e 20 锁定 | 已接线（注 1）                                                                                                                                                                                                    |
| `X` 单键多选                   | 未实现（G-B2）                                               | —                                                                                                                                                                                                                                                                                                     | 不迁移：需「高亮行→选择集并集/差集」表达式（ARRAYINCLUDES/ARRAYFILTER+CONCAT 理论可行）但超出本 plan Goal 面（Goals 仅裁 chord+J/K+modifierSelect）；鼠标等价路径（行 checkbox）在位。登记 Non-Blocking Follow-up |
| `⇧click` 范围选                | 未实现（G-B2）；仅 checkbox 逐个点击                         | `rowSelection.modifierSelect: true`（加法区间并集 + 锚点规则，use-table-selection）；e2e 21 锁定（anchor 2 → ⇧click 5 → 4 行）                                                                                                                                                                        | 已接线                                                                                                                                                                                                            |
| `⌘A`/`ctrl+A` 全选             | 未实现（G-B2）；仅表头全选 checkbox                          | `modifierSelect` 容器 keydown 中继 + `selectAllMode: 'all'` 显式化                                                                                                                                                                                                                                    | 已接线（注 2）                                                                                                                                                                                                    |
| `meta/ctrl-click` 独立切换     | 未实现（G-B2）                                               | `modifierSelect` 内建（锚点不动）；e2e 21 锁定（⌘click 行 2 → 34→33）                                                                                                                                                                                                                                 | 已接线                                                                                                                                                                                                            |
| `⌥↑↓` 键盘重排                 | 未实现（G-B2）                                               | —                                                                                                                                                                                                                                                                                                     | 不迁移：复刻无行重排端点语义（看板拖拽是另一条 moveCard 链），语义等价面不存在                                                                                                                                    |
| `Space` 悬停预览（peek）       | 未实现（G-B2）；peek 走行尾按钮 `linear-issues-peek-trigger` | —                                                                                                                                                                                                                                                                                                     | 不迁移：行 hover 态无 schema 可观测通道；维持本 plan「Deferred But Adjudicated」watch-only residual                                                                                                               |

注：

1. J/K 指针按**源数据全序**（`${issues?.items}` 34 行）移动，客户端分页页切片不随指针翻页——与原版「可见列表内移动」存在此一处已知差异，已写入页内帮助文案与 e2e 20 口径；筛选后 items 变短时越界索引退化为无高亮（optionRowValueMatches 对 undefined 绑定不匹配，fail-quiet）。
2. `selectAllMode: 'all'` 裁决：现行为（e2e 05）表头全选覆盖源数据全量 34 行（客户端分页仅裁剪显示）= 原语 `'all'` 缺省语义，显式写入以记录裁决、零回归。
3. `keyboard` 节点全局（window）监听：浮层打开且焦点不在可编辑目标时 chord 理论可穿透（无 surface-open 态可观测通道供 `when` 守卫）——风险登记至 Non-Blocking Follow-ups。
4. optionRow 格核实终态（scoping 表「issues/board 行态 optionRow 落点核实」）：**table 适用**——`optionRow.value` 绑定驱动 `data-option-row/data-state/data-selected/aria-selected` + `selectedClass`，与 checkbox 选择视觉（CSS `:has([data-checked])`，不读 data-state）双通道并存互不覆盖；开发期 console.warn（optionRow.value 优先级提示）为 dev-only，e2e 仅采集 console.error 不受影响。**board（kanban）不适用本 Phase**：linear-board.json 不在本 plan Targets，未核实 kanban renderer optionRow 支持，维持 scoping 表「待核实」原样。

### Phase 2 - 收口

Status: completed
Targets: roadmap §13 L4.9 行、dev log

- Item Types: `Proof`
- [ ] 517 完成注记回写 + dev log

Exit Criteria:

- [ ] roadmap/dev log 落盘

- Reviewer / Agent: 批次合并模式——独立 fresh 子 agent closure audit 覆盖 draft-review 职能（实现 agent 按 scoping 裁决执行，r1 findings 见 Closure Evidence）
- Verdict: closure audit approved（见 Closure Audit Evidence）
- Rounds: 1（closure 合并审查）
- Findings addressed: 见 Closure Audit Evidence

## Closure Gates

- [ ] Phase 1-2 Exit Criteria 全勾
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（合并审计 approved，2026-09-27）
- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红；`pnpm test:e2e` 零新增红口径（随批次）

## Deferred But Adjudicated

### linear-board optionRow 半格（issues 已核，board 待核实）

- Classification: `watch-only residual` → D1 输入池（closure audit m1 路由）
- Why Not Blocking Closure: board 为 kanban 形态，optionRow 契约针对 list/table 行；核实义务随 L4.9 收口注记移交 D1 池
- Successor Required: `no`

### hover-peek（Space 保持预览）

- Classification: `watch-only residual`（C2 回写⑫④ 既有裁定）
- Why Not Blocking Closure: 交互态状态源缺口无消费登记；禁 hack 绕道
- Successor Required: `no`

### X 单键多选（高亮行切换选择集）

- Classification: `deferred`（Phase 1 逐键映射表裁决不迁移）
- Why Not Blocking Closure: 原版行为从未在复刻存在（G-B2 缺口）；鼠标等价路径（行 checkbox）在位且 e2e 锁定；表达式通道已探明（setSelection + ARRAYINCLUDES/ARRAYFILTER），后续 plan 可低成本接线
- Successor Required: `no`

### chord 浮层穿透守卫（surface-open `when` 通道）

- Classification: `watch-only residual`
- Why Not Blocking Closure: `keyboard` 节点 window 级监听在浮层打开且焦点不在可编辑目标时 chord 可触发；现浮层均以输入框为首焦点，实际触达面小；无 surface-open 态可观测通道，加守卫需新原语（记 D1 输入池）
- Successor Required: `no`

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27，516-519 合并审计）
- Evidence: verdict **approved**（9 绑定与 cmd-nav 逐字对齐 + modifierSelect/selectAllMode 缺省语义实证 + 基线更正诚实 + 新增 19/20/21 程序化锁定；m1 linear-board optionRow 半格路由 D1 池（已随 flips 落盘））

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
