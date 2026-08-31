# D1-4 G-B2 键盘导航框架产品化（chord 绑定通道 + 选区修饰键 + 焦点管理裁定）

> Plan Status: completed（2026-08-31 执行期落字：Phase 1 契约裁定（前序 session）+ Phase 2/3/4 本 session 执行完毕；closure audit fresh session `ses_fab859cbcffeayVGaaF6ZRqz8n` 1 轮 APPROVED 零 Blocker/零 Major/零 Minor；全量验证 full-green——typecheck/build/lint 37/37、test 68/68 tasks、check exit 0 零新增红）
> Mission: ui-review
> Work Item: D1. 能力缺口产品化 plans —— G-B2 键盘导航框架（C2 §2 预清单第 4 位；第 1/2/3 位 G-F/G-B1/G-A 已产品化关闭，第 5 位 G-F2 已关闭被 G-F 吸收）
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（D1 条目 + Phase Details D1 + Cross-Cutting 4/5）；C2 裁决文档 `docs/analysis/ui-review/C2-capability-gaps.md`（初版裁决表 G-B2 行 + §2 预清单 4/6 + 回写 ①②⑤⑦ 素材）；`docs/context/ai-autonomy-policy.md` Protected Areas（renderer 定义字段 plan-first / flux-core plan-first / `ui/src/index.ts` ask-first）
> Related: `docs/plans/2026-08-30-1737-1-d1-gb1-command-palette-renderer-primitive.md`（hotkey 单键位先例 + parseHotkey 现状来源）；`docs/plans/2026-08-30-1333-2-d1-gf-option-row-primitive.md`（共享 helper 落 flux-react 先例 + J/K 组合验证的 optionRow 消费侧）；`docs/plans/2026-08-30-2312-2-d1-gb3-batch-bar-semantic-component.md`（同批起草；范围选区/fill handle 边界在本计划落字，彼计划 Non-Goal 引用）
> 执行顺序约束：D1 触发条件已满足（C2 `done` + P4b `done` + P6b `done`，回写 ⑨⑩⑪ 确认前三项产品化关闭）；本计划（N=1）按 C2 §2 排序先于 G-B3 plan（N=2）执行——两计划共写面 `packages/flux-renderers-data/src/data-renderer-definitions.ts`、`schemas.ts`/`data-schema-validation.ts`（本计划 Phase 3 选区字段 / 彼计划 Phase 2 定义登记）与 `use-table-selection.ts`（本计划 Phase 3 修饰键选区 / 彼计划 Phase 3 selectAllMode），顺序执行消除冲突。

## Purpose

把 C2 裁决为 **G-B2（键盘导航框架：chord/peek/多选/键盘重排，L4）** 的缺口产品化：为 schema 层提供键盘序列（单键位组合 + chord 序列）→ 动作派发的绑定通道，为 table 选择集补齐修饰键选区语义（shift 范围选/meta 增补/⌘A），并对 roving 焦点管理、kanban 键盘重排余量、hover-peek（hover 保持计时）、范围选区 + fill handle 编辑器选区模型四个维度作出显式终态裁定——消解 R2 族7「键盘等价路径缺失」的框架层缺口（P4b Linear 键盘缺口清单的产品化回应）。

## Current Baseline

- **C2 裁决与证据链（live 文档核对 2026-08-30）**：
  - 初版裁决表 G-B2 行：**L4**，理由「焦点管理与全局快捷键是运行时横切能力」，状态「待 P4 回写」→ 回写 ⑤ 已完成。
  - 回写 ①（R2）：族7「键盘等价路径缺失」（icon-picker 200+ Tab 停留点、dashboard 画布面板无方向键、page 侧栏拖拽把手不可聚焦）为 G-B2 追加实证面。
  - 回写 ②（R3）边界落字：**单控件 roving/方向键 = 一致性缺陷（renderer 层修复）**；**框架级能力（chord/peek/全局重排/修饰键选区）= 能力缺口（本计划）**。icon-picker 漫游、calendar 惰性焦点、键盘创建死路、画布面板方向键均登记候选未修，修复面在组件级，不在本计划。
  - 回写 ⑤（P4b 终态证据）：动作词汇无键盘序列监听通道（chord G/O/M、J/K 高亮指针不可表达）；table 选择列 checkbox 为普通 toggle，零 shift/meta 修饰键处理、无范围锚点逻辑（⇧click 范围选/⌘A/⇧↑↓ 扩展选择不可表达）；Space hover-peek 无 hover 保持计时事件；禁 hack（全局 keydown 注入/焦点劫持）绕道维持。鼠标等价路径已全部接线锁定。
  - 回写 ⑦（P6b 正面素材）：table renderer 行 keydown 中继**在库**——声明 `onRowClick` 后行 `tabIndex=0` 且 Enter/Space 内建中继派发行动作；**G-B2 缺口据此收敛在框架层（焦点管理/roving/chord/修饰键/选区扩展），非键盘事件通道完全缺失**。十五键位终态表见 P6b 处置表 A15/A16（内建锁定 1 / 复合 4 / 显式裁决 14）。
- **live 复核修正与现状实测（2026-08-30 本计划起草时）**：
  - **kanban 键盘重排大部分在库（修正回写 ⑤ 一处表述）**：roving tabindex 在库（`kanban-column.tsx:270,296`）；键盘手势在库——Space 拾起 + ←/→ 跨列移动 + Esc 取消，含 aria 公告与 `data-keyboard-dragging` 标记（`use-kanban-board-effects.ts:74-129`）；`moveCardKeyboard` **会派发 `onCardMove` schema 事件**（`use-kanban-dnd.ts:180-202` → `kanban-board.tsx:282-286` 统一 wrapper → `events.onCardMove`）。回写 ⑤「kanban 无 ⌥↑↓ 键盘重排 schema 通道（renderer 内部 moveCardKeyboard 存在但无 schema 事件面）」中「无 schema 事件面」表述不精确——事件面在库，真实余量收窄为：①手势变体固定为 Space+←/→（非 ⌥↑↓ 直移）且无 schema 配置面；②键盘重排挂接以 `draggable` 为门（`use-kanban-board-effects.ts:76`），拖拽关闭时键盘重排随之不可用，无独立开关。
  - **键盘监听现状全部为 renderer 局部 ad-hoc，零共享基础设施**：command-palette `hotkey` 单键位（`command-palette.tsx:370-409`，renderer 局部 window keydown + 卸载清理；`parseHotkey` 为文件内私有函数 `command-palette.tsx:154`，仅支持单键位 mod/ctrl/shift/alt+key，不支持序列）；kanban board effects 另有 ctrl+z undo 的 window keydown（`use-kanban-board-effects.ts:60-66`）。**零 chord 序列支持、零 page 级绑定通道、零跨 renderer 键位冲突协调**。
  - **table 选区零修饰键通道**：`use-table-selection.ts` 全文复核——`handleSelectRow(rowKey, checked)` 无事件修饰参数（:241-305）；`handleSelectAll` 作用于传入 rows，`keepOnPageChange` 保留跨页键（:155-239）；`setSelectionExternal` 句柄在库（:307-335）。行 keydown 中继仅 Enter/Space（`table-body-row-rendering.tsx:181-195`）。
- **先例模式**：command-palette `hotkey`（renderer 局部监听 + 卸载清理 + 受控 no-op 语义，flux-core 零改动）证明「键盘监听可在 renderer 层落地且过审」；G-F 共享 helper 落 `@nop-chaos/flux-react`（`option-row.ts`）证明「跨包共享纯逻辑 helper」的落点先例。
- **门禁与保护区域（live 实测）**：renderer 定义字段 **plan-first**（owner evidence = `docs/references/renderer-interfaces.md` 对齐，本计划即载体）；`packages/flux-core/src/` **plan-first**（本计划预期零改动——沿 command-palette 先例 renderer 层实现；若 Phase 1 实测撞内核边界，停止并按 Protected Areas 重开 plan）；`packages/ui/src/index.ts` **ask-first**（若共享键盘 helper 落 ui 则 Phase 1 显式标注理由并停门）；`check:audit-event-dispatch-ctx` 门禁覆盖 14 个 renderer 包——本计划新增动作派发点必须合规。
- **基线命令现状**：ui-review 分支 full-green 基线（G-A closure 记录：typecheck/build/lint 37/37、test 全绿、check exit 0 零新增红）——本计划启动时按惯例 live 复核。

## Goals

- **绑定通道契约落地**：schema 级键盘绑定通道（载体形态 Phase 1 Decision 裁定：page renderer 语义字段 / 独立不可见 renderer type），支持单键位组合（mod/ctrl/shift/alt+key）与 **chord 序列**（如 `g o`），绑定 → 动作派发沿 CX-10 ctx 约定；输入焦点门控、surface 层叠路由、键位冲突语义落字。
- **共享键盘解析 helper**：`parseHotkey` 从 command-palette 私有实现抽出泛化（单键位 + chord 序列匹配状态机 + 输入焦点门控判定），落共享层（Phase 1 裁定落点，flux-react 为默认候选沿 G-F 先例）；command-palette 回归零变化。
- **table 选区修饰键语义**：shift-click 范围选（视图行序锚点）、meta/ctrl-click 独立增补切换、⌘A 范围全选（聚焦表内）——字段面 Phase 1 Decision 裁定，与 `maxSelectionLength`/`checkableWhen`/`keepOnPageChange` 共存语义落字，先红后绿。
- **J/K 指针组合验证**：键盘绑定通道 + G-F `optionRow.value` 绑定的组合用例测试锁定（J/K 移动指针 → 行选中样式随动）——证明 P4b「J/K 高亮指针」手感缺口经原语组合可表达。
- **四个维度显式终态裁定**（Phase 1 Decision，逐项落字，无静默跳过）：①roving 焦点 helper 是否抽取共享（kanban ad-hoc 实现是否回归采纳）；②kanban 手势变体/draggable 解耦是否立项最小语义字段；③hover-peek（hover 保持计时事件）立项或 deferred；④「范围选区 + fill handle 编辑器选区模型」（回写 ⑦ 登记的编辑器选区维度——选区锚点/等差填充拖拽原语，独立于行级修饰键选区）立项或显式 deferred 并登记 successor。
- **owner docs 对齐**：`docs/references/renderer-interfaces.md`（Protected Areas owner evidence）+ flux-guide schema 作者条目 + C2 回写 ⑫（追加式：G-B2 终态 + 回写 ⑤ 表述修正 + successor 登记）。
- 全量验证 full-green + `pnpm check` 零新增红。

## Non-Goals

- **不做 G-B3 批量操作栏语义件**：后续独立 plan（`2026-08-30-2312-2`，同批起草）。
- **不做单控件级 roving/方向键一致性修复**：icon-picker、calendar、画布面板等 R2 族7 renderer 层成员归一致性修复流程（回写 ② 边界）；本计划对「共享 roving helper」只做裁定（抽或不抽均落字），不承担族7 成员逐个改造。
- **不做 G-C 多视图状态机 / G-D 网格编辑语义**（C2 §2 #6 其余成员，后续独立 plan；G-D 依赖 G-B2+G-B3 双前置）。
- **不做复刻页 retrofit**：linear 复刻页键盘缺口的接线改造（chord 导航/J-K 指针实际接入 antdpro/linear schema）登记 Non-Blocking Follow-up。
- **不做跨页 palette 单例/app 级命令注册中心**：G-B1 successor 登记（runtime/页面壳层候选池），本计划绑定通道不承担命令注册面。
- **不改 flux-core 编译器内核**：绑定表达式求值沿既有 propsProgram/compile 机制（command-palette 受控 open 捕获先例）；撞边界即停。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/page.tsx`（绑定通道候选载体 ①）或 flux-renderers-basic 新增不可见 type（候选载体 ②）+ `basic-renderer-definitions.ts`/`schemas.ts` 定义登记
- `packages/flux-renderers-basic/src/command-palette.tsx`（parseHotkey 抽出泛化 + 回归兼容）
- 共享键盘 helper 落点（Phase 1 裁定；flux-react 为默认候选）
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts` + `table-body-row-rendering.tsx`（修饰键选区）+ `data-renderer-definitions.ts`/`schemas.ts`（字段登记）
- `packages/flux-renderers-scheduling/src/kanban/`（仅 Phase 1 裁定范围内的最小改动或零改动）
- 各落点 `__tests__/` 先红后绿单测；`docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/analysis/ui-review/C2-capability-gaps.md`（回写 ⑫）、`docs/logs/`

### Out Of Scope

- `packages/flux-core/src/`（预期零改动；实测撞边界则按 Protected Areas 停止并重开 plan）
- `packages/ui/src/index.ts`（预期零新增导出；若 helper 落 ui 则 Phase 1 停 ask-first 门）
- 单控件 roving 族7 成员修复、复刻页 retrofit、G-B3/G-C/G-D、命令注册中心（见 Non-Goals）

## Failure Paths

| 可测场景编号         | 触发                                                                      | 行为（含契约语义）                                                                                  | 可重试 | 用户可见表现                  |
| -------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | ----------------------------- |
| kb-input-focus       | 焦点在 input/textarea/select/contenteditable 内按下绑定键                 | 不触发绑定（输入优先）；绑定声明 `allowInInput: true` 时豁免                                        | 否     | 正常输入，无动作派发          |
| kb-chord-timeout     | chord 序列首键后超时（默认时长 Phase 1 裁定）或中途按键无后续匹配         | 序列缓冲重置；已按下的前缀键不产生副作用（除非其自身为完整绑定，见 kb-prefix-conflict）             | 是     | 无动作                        |
| kb-prefix-conflict   | 短绑定 `g` 与长序列 `g o` 并存                                            | 最长匹配优先：存在可续序列时等待（超时窗口内）；超时且 `g` 为完整绑定则派发 `g`——语义 Phase 1 落字  | 否     | 按裁定行为                    |
| kb-conflict          | 多个绑定同键位，或与 renderer 内建键位（palette hotkey/kanban Space）冲突 | 登记顺序优先 + dev warn 一次（isDevRuntime 门）；内建键位行为不被绑定覆盖（内建优先），Phase 1 落字 | 否     | 控制台 dev warn，按优先级派发 |
| kb-surface-stack     | dialog/drawer 等 surface 打开时页面级绑定按键                             | Phase 1 裁定（候选：surface 栈非空时抑制页面级绑定 / 保持触发）——落字为契约                         | 否     | 按裁定行为                    |
| kb-action-error      | 绑定动作求值失败/派发异常                                                 | 走既有 renderer 错误约定（dev warn），监听器不解绑、不中断后续按键                                  | 是     | 控制台 dev warn               |
| kb-sel-modifier-edge | shift-click 跨 `checkableWhen` 不可选行/`maxSelectionLength` 上限         | 范围内不可选行跳过；上限截断（与 handleSelectAll 截断同口径）——语义 Phase 1 落字                    | 否     | 按裁定选择集                  |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（schema 公共契约 + 键盘交互核心回归路径；AGENTS.md Test Strategy Tiers「Must automate」——键盘绑定通道与选区修饰键均为 renderer 定义字段公共契约，Protected Areas 要求 owner-doc 对齐；P4b/P6b 键盘缺口均为先红后绿登记）。对应 Proof 先于 Fix：Phase 1 产出契约断言清单（键位矩阵/chord 时序矩阵/修饰键选区矩阵/兼容矩阵），Phase 2/3 按「先红后绿」实现。断言含：单键位与 chord 派发矩阵、输入焦点门控、序列超时重置、修饰键选区结果集、无声明时渲染与行为快照等价（兼容矩阵）。

## Phase 1 Contract Adjudications（裁定记录，2026-08-30 执行期落字）

> 本节为 Phase 1 产出本体：一项 Proof 实测 + 六项 Decision 终态。Phase 2/3 实现以本节为唯一契约依据。

### Proof——键盘面 inventory 实测（live 复核 2026-08-30，本节落字即证据）

`addEventListener('keydown'` 全仓 grep 命中 15 处 + React 合成 onkeydown 中继 1 处，全登记：

| 监听点                      | 位置                                                                                      | 键位                                        | 归属                                                                        |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| command-palette hotkey      | `command-palette.tsx:405`（window；`parseHotkey` 文件内私有 `:154`，仅单键位）            | `hotkey` 单键位（须含 ≥1 修饰键，裸键拒绝） | G-B1 内建                                                                   |
| kanban undo/redo            | `use-kanban-board-effects.ts:65`（window；board 含 focus 门 + editable 门）               | ctrl+z / ctrl+shift+z                       | 内建                                                                        |
| kanban 键盘重排             | `use-kanban-board-effects.ts:127`（board 元素；`draggable` 门 `:76`）                     | Space 拾起 + ←/→ 跨列 + Esc 取消            | 内建（aria 公告 + `data-keyboard-dragging`）                                |
| table 行 keydown 中继       | `table-body-row-rendering.tsx:181-195`（React 合成，行 `tabIndex=0` 门 `isRowClickable`） | Enter/Space → onRowClick/expand 中继        | 内建（P6b 正面素材，行号较回写 ⑦ 引用漂移 `:196-227`→`:181-195`，行为一致） |
| code-editor                 | `flux-code-editor/src/code-editor-renderer.tsx:177`（document）                           | Escape                                      | 组件局部                                                                    |
| spreadsheet                 | `spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:121`（window）        | 网格导航                                    | 组件局部                                                                    |
| flow-designer 快捷键        | `flow-designer-renderers/src/use-designer-shortcuts.ts:80`（window）                      | 设计器快捷键                                | 设计器局部                                                                  |
| nop-debugger inspect        | `nop-debugger/src/panel/use-inspect-mode.ts:176`（document）                              | inspect 开关                                | 调试器局部                                                                  |
| gantt drag/link-draw cancel | `use-gantt-drag.ts:185` / `use-gantt-link-draw.ts:113`（document）                        | Escape 取消                                 | 组件局部                                                                    |
| gantt 键盘导航              | `use-gantt-keyboard.ts:139`（元素）                                                       | 方向键导航                                  | 组件局部                                                                    |
| barcode overlay             | `barcode-scanner-overlay.tsx:222`（window）                                               | 扫码流                                      | 组件局部                                                                    |
| focus-trap                  | `scheduling/src/shared/hooks/use-focus-trap.ts:38`（container）                           | Tab 环                                      | 组件局部                                                                    |
| word-editor 快捷键          | `word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts:104`（document）            | 编辑器快捷键                                | 组件局部                                                                    |
| ui sidebar                  | `ui/src/components/ui/sidebar-context.tsx:81`（window）                                   | mod 开关侧栏                                | ui 内建                                                                     |
| diff-view                   | `flux-renderers-content/src/diff-view/diff-view-renderer.tsx:506`（window）               | diff 导航                                   | 组件局部                                                                    |

- P6b 十五键位终态表 live 复核：C2 回写 ⑦「G-B2/G-B3 键盘/批量终态」节结论与 live 一致（内建锁定 1 / 复合 4 / 显式裁决 14；行 keydown 中继在库）。
- 回写 ⑤ 断言逐项 live 复核：
  - chord（G/O/M）与 J/K 高亮指针零通道——**维持**（`parseHotkey` 仅单键位、无序列状态机；全仓无 page 级绑定通道）。
  - table 选择零修饰键——**维持**（`handleSelectRow(rowKey, checked)` 双参无修饰键入口 `use-table-selection.ts:241`；无锚点逻辑；行中继仅 Enter/Space）。
  - Space hover-peek 无 hover 保持计时事件——**维持**（option-row 契约明文 hover 为 CSS 瞬态，无计时事件通道）。
  - **「kanban 无 schema 事件面」表述修正（本 Proof 的落字义务）**：`moveCardKeyboard`（`use-kanban-dnd.ts:180-202`）**确实派发 schema 事件**——`moveEvent?.({cardId, fromColumnId, toColumnId, fromIndex, toIndex, overLimit})` → `kanban-board.tsx:282-286` 统一 wrapper → `events.onCardMove?.(movePayload, eventCtx(...))`。真实余量收窄为两条：①手势变体固定 Space+←/→（非 ⌥↑↓ 直移）且无 schema 配置面；②键盘重排挂接以 `draggable` 为门（`use-kanban-board-effects.ts:76`），无独立开关。roving tabindex 在库复核一致（`kanban-column.tsx:270,296`）。该修正随 Phase 4 C2 回写 ⑫ 落 C2。
- 禁 hack 维持：复刻页无全局 keydown 注入/焦点劫持绕道。

### Decision 1——绑定通道载体：**独立不可见 renderer type `keyboard`**（候选 ②，落 `@nop-chaos/flux-renderers-basic`，`category: 'logic'`）

- 采纳理由：①作用域局部语义天然对齐 CX-10 派发（binding action 在节点 scope 派发，dialog/drawer 内声明即 surface 内生效）；②任意节点可挂——page body 挂 = 页面级，子树挂 = 局部级，候选 ①（page `keyBindings` 字段）只是本载体的严格子集且把绑定与 page 壳耦合；③`reaction` renderer 先例证明「不可见 logic renderer」家族在 basic 包成立（zero DOM、注册面一致）；④listener 生命周期 = React effect 挂载/清理，strict 双挂载安全由 effect cleanup 承担。
- 候选 ③（runtime 级全局注册）否决理由落字：flux-runtime 保护区域 plan-first（本计划预期零 flux-core 改动）；跨 renderer 键位冲突协调是 G-B1 successor 登记项（Non-Goals 明示），runtime 注册中心非本计划承担面。
- 字段族（schema 契约）：

```jsonc
{
  "type": "keyboard",
  "chordTimeout": 1000,            // 可选；毫秒，>0，缺省 1000
  "bindings": [
    {
      "keys": "mod+shift+s",       // 单键位组合；或空格分隔 chord 序列 "g o"
      "when": "flags.canEdit",     // 可选；裸表达式（无 ${}，checkableWhen 先例），按键时对节点 scope 求值
      "allowInInput": false,       // 可选；缺省 false——焦点在 input/textarea/select/contenteditable 内不触发
      "preventDefault": true,      // 可选；缺省 true——命中后阻止默认行为
      "action": { ... }            // 可选；ActionSchema | ActionSchema[]，静态派发轨
    }
  ],
  "onTrigger": { ... }             // 可选；事件轨，每次命中派发 payload { keys, index, nativeEvent }
}
```

- 渲染输出：恒 `null`（不可见、零 DOM、零 marker——styling-system 零影响）。
- 与 command-palette `hotkey` 共存语义（内建优先）：共享派发器跳过 `event.defaultPrevented === true` 的事件（更早注册的 window listener 已消费即内建优先——palette hotkey/kanban undo 等内建均 preventDefault）；作者义务：不得在内建已占用键位上声明绑定（文档落字，无跨树运行时检测）。

### Decision 2——chord 语法与缓冲状态机

- 语法：`keys` 以空格分隔 token；每 token 为单键位组合 `[(mod|ctrl|shift|alt)+]key`（组合解析 = `parseKeyCombo`，裸键合法；palette 侧 `parseModifierHotkey` 保持「须含修饰键」契约回归零变化）。≥1 token；任一 token 非法 → 整条绑定挂载期 dev warn 一次并忽略。
- 缓冲状态机：idle →（首 token 命中且该 token 为某更长序列前缀，或仅前缀）→ waiting（缓冲前进，无副作用）→ 窗口内下一 keydown 匹配某进行中序列的下一 token → 继续前进/完整命中 → 派发并复位。失配或超时 → 复位；失配键随后按 idle 语义重新求值（重叠序列启动：`g o` 等待中按 `o` 复位后先尝试 `o` 为首 token）。
- 超时：缺省 1000ms，节点级 `chordTimeout` 可配置；窗口内无后续键 → 复位（kb-chord-timeout）。
- 前缀冲突最长匹配（kb-prefix-conflict）：短绑定 `g` 与长序列 `g o` 并存时——按 `g` 进入等待（无副作用）；窗口内续 `o` → 派发 `g o`；超时 → 兜底派发 `g`（fallback 语义）。若 token 仅为前缀非完整绑定 → 超时静默复位。
- 冲突（kb-conflict）：同一 `keyboard` 节点内两条绑定归一化 token 序列完全相同 → 登记序（数组序）优先 + 挂载期 dev warn 一次（isDevRuntime 门）。

### Decision 3——table 选区修饰键字段面：**`rowSelection` 扩展（候选 ①）**，字段 `modifierSelect?: boolean`（缺省 false）

- 采纳理由：修饰键选区与既有选择集语义（`maxSelectionLength`/`checkableWhen`/`keepOnPageChange`/`toggleOnRowClick`）同域同状态源，独立字段族（候选 ②）会复制选择配置面并产生双源一致性负担。
- 契约语义（`type !== 'radio'` 且 `modifierSelect === true` 时生效；radio 下修饰键惰性）：
  - **锚点**：每次无修饰键选区变更（checkbox 勾选/行点击 toggle/表头全选）将锚点置为被操作行；`setSelectionExternal` 不动锚点。
  - **⇧click 范围选（加法并集语义，裁定落字）**：选区 := 当前选区 ∪ [锚点..被点行]（视图行序，取当前 flatten 可见行序；无锚点时范围 = 被点行自身）。加法（Gmail/桌面多选惯例）而非替换——checkbox 范式选区为累积语义，且保 `keepOnPageChange` 跨页保留键永不被清除（与 `handleSelectAll` retainedKnown 口径一致）。
  - **kb-sel-modifier-edge**：范围内 `checkableWhen` 不可选行跳过；`maxSelectionLength` 上限截断（沿视图行序加至满即止，与 `handleSelectAll` 截断同口径）；⇧click 永不取消选择（取消走无修饰键 toggle/meta toggle）。
  - **meta/ctrl-click 增补切换**：独立 toggle 该行不动其余——checkbox 点击与 `toggleOnRowClick` 行点击的既有行为即此语义（零新码，契约落字）。
  - **⌘/ctrl+A 范围全选**：触发域 = 焦点在 table 容器内（容器级 React onKeyDown 冒泡天然限定）；editable target 门控（输入框内 ⌘A 不触发）；命中 → preventDefault + 复用 `handleSelectAll(true)`（本视图 checkable 行、上限截断、保留键保留）。
  - 派发：与既有选择变更同 payload（`table:selection-change`），经 `onSelectionChange`。
- 共存矩阵：与 `keepOnPageChange`（保留键 + 范围并集）、`maxSelectionLength`（截断）、`checkableWhen`（跳过）、`toggleOnRowClick`（行点击带修饰键同语义）逐项单测锁定；`modifierSelect` 缺省/false 时 ⇧click 行为与现状逐字节等价（兼容矩阵）。

### Decision 4——「范围选区 + fill handle 编辑器选区模型」终态：**deferred（Deferred But Adjudicated）**

- 分类 `out-of-scope improvement`；Why Not Blocking Closure：P6b 零承载实测维持（C2 回写 ⑦），无复刻页在等消费；其本体是**单元格坐标选区模型**（选区锚点 + 等差填充拖拽原语 + 键盘选区扩展），依赖 G-D 网格编辑语义件族（G-D 依赖 G-B2+G-B3 双前置）——在 G-B3 未产品化的时点实现该模型属空转基础设施。与 Decision 3 的行级修饰键选区**分列**（后者是行级选择集手势，已落地；前者是编辑器坐标选区，未落地）。
- Successor：D1 输入池 / G-D 语义件族 plan（依赖就位后重评）；随 C2 回写 ⑫ 登记。

### Decision 5——三维度终态 + 共享 helper 落点

- ①共享 roving helper：**不抽取（not adopted）**。理由：框架相邻的 roving 实现仅 kanban ad-hoc 一处（`kanban-column.tsx:270,296` roving tabindex），其余键盘漫游均属 R2 族7 单控件一致性缺陷（回写 ② 边界：修复面在组件级）；单采纳方的共享 helper 是投机基础设施。边界登记 Follow-up：≥2 个 renderer 需要网格键盘导航时（如 G-D 立项）再抽取，届时 kanban ad-hoc 实现回归采纳一并评估。
- ②kanban 手势变体/draggable 解耦：**deferred（`optimization candidate`）**。Why Not Blocking Closure：schema 事件面在库（moveCardKeyboard → onCardMove 已实证，本计划 Proof 节修正回写 ⑤）；Space+←/→ 手势功能完整；解耦字段（独立 `keyboardReorder` 开关 / ⌥↑↓ 变体）零现行消费方（无复刻页声明），additive 增强不阻塞绑定通道契约。Successor：D1 输入池 / kanban 迭代。
- ③hover-peek：**deferred（`watch-only residual`）**——沿 Deferred But Adjudicated 预登记终态化，Successor Path 维持 D1 输入池 / deep-audit 候选。
- 共享键盘 helper 落点：**`@nop-chaos/flux-react`（`src/keyboard.ts`）**，沿 G-F option-row 共享 helper 先例（纯逻辑模块 + 同包单测）；**不落 `packages/ui/src/index.ts`**——ask-first 门未触发，零 ui 改动。

### Decision 6——surface 层叠路由语义（kb-surface-stack 终态化）

- 契约：SurfaceRuntime 条目栈非空时——顶层 surface 的 scope（`SurfaceEntry.scope`）**是** keyboard 节点 scope 自身或其祖先 → 该节点绑定保持活跃（surface 内声明的绑定随 surface 生效）；**否则抑制**（页面级绑定在 dialog/drawer/sheet 打开期间暂停）。栈复位后自动恢复。实现面：`useCurrentSurfaceRuntime()` store 订阅 + scope 祖先链判定（`ScopeRef.parent` 链），零 runtime 改动。

### 契约断言清单（Phase 2/3 先红后绿依据）

- **键位派发矩阵**：裸键（`g`）/单修饰组合（`mod+k`、`shift+j`、`ctrl+alt+d`）/chord（`g o`）/chord 修饰 token（`g mod+i`）；命中 → action 派发 + onTrigger 派发 + preventDefault（缺省）；未命中 → 零副作用。
- **chord 时序矩阵**：`g`→`o` 窗口内派发；`g`→超时→`o` 不派发；`g`→`x` 复位后 `o` 按 idle 重评；`g`+`g o` 并存：`g` 等待、续 `o` 派发长、超时兜底派发短；`g o` 等待中失配键重启新序列。
- **选区修饰键矩阵**：⇧click 并集范围/锚点更新规则/不可选跳过/上限截断/keepOnPageChange 保留键共存/meta toggle 既有等价/⌘A 全选/输入框内 ⌘A 不触发/radio 惰性/`modifierSelect` 缺省兼容等价。
- **兼容矩阵**：无 `keyboard` 节点 → 渲染树零变化；palette 既有 31 条单测回归全绿（共享 helper 替换后行为零变化）；table 无 `modifierSelect` → 既有选区行为快照等价；input 门控（editable target 缺省不触发，`allowInInput: true` 豁免）；`defaultPrevented` 事件跳过（内建优先）；surface 栈抑制/豁免矩阵；conflict dev warn 一次 + 登记序优先。

## Execution Plan

> 顺序 Phase。Phase 1 契约裁定先行（Phase 2/3 全部依赖其断言清单）；Phase 4 文档与回写收口。

### Phase 1 - 契约设计与维度终态裁定

Status: completed
Targets: 本计划 Decision 注记、`docs/references/renderer-interfaces.md`（草案条目）

- Item Types: `Decision | Proof`

- [x] Proof——键盘面 inventory 实测落字：现状监听点全登记（command-palette hotkey / kanban board effects 双 handler / table 行 keydown 中继 / 其他 grep `addEventListener('keydown'` 命中点）；P6b 十五键位终态表 live 复核；回写 ⑤ 断言逐项 live 复核——**含「kanban 无 schema 事件面」表述修正落字**（moveCardKeyboard → onCardMove 派发链实测证据）
- [x] Decision——绑定通道载体裁定（候选 ①page renderer 语义字段 `keyBindings`（page 为 app 壳，listener 生命周期随页面挂载，G-A page 语义增强先例）；②独立不可见 renderer type（如 `keyboard`，任意节点可挂、作用域局部，dialog/drawer surface 家族注册先例）；③runtime 级全局注册（flux-runtime 保护区域，预期否决理由落字））——含字段族（keys 语法/action/when 门控/allowInInput/preventDefault）与 command-palette `hotkey` 的共存语义（内建优先）落字
- [x] Decision——chord 语法与缓冲状态机裁定：序列 token 语法（空格分隔，每 token 为单键位组合）、超时时长与可配置性、缓冲打断、前缀冲突最长匹配语义（Failure Paths kb-chord-timeout/kb-prefix-conflict 终态化）
- [x] Decision——table 选区修饰键字段面裁定（候选 ①`rowSelection` 扩展（如 `multiSelect` + 内建锚点语义）；②独立字段族）+ 锚点/视图行序/上限截断/checkableWhen 跳过语义 + ⌘A 触发域（聚焦表内）落字
- [x] Decision——「范围选区 + fill handle 编辑器选区模型」终态裁定（回写 ⑦ 并入观察面的编辑器选区维度——选区锚点 + 等差填充拖拽原语，与上行行级修饰键选区**分列**不得静默并入）：立项实现或显式 deferred（`Deferred But Adjudicated` 分类 + Why Not Blocking Closure + successor 登记，随 C2 回写 ⑫ 落字）
- [x] Decision——三维度终态裁定（逐项落字，不得留空）：①共享 roving helper 抽取与否（含 kanban ad-hoc 实现是否回归采纳；不抽则落字边界登记 Follow-up）；②kanban 手势变体/draggable 解耦最小语义字段立项与否；③hover-peek 立项或 `deferred`（分类 + Why Not Blocking Closure）；并同项裁定共享键盘 helper 落点（flux-react 默认候选；落 ui 则 ask-first 理由显式落字且未在门禁前改码）
- [x] Decision——surface 层叠路由语义裁定（Failure Path kb-surface-stack 终态化）

Exit Criteria:

- [x] 六项 Decision 与一项 Proof 全部落字本计划（契约断言清单可清单化：键位矩阵 + chord 时序矩阵 + 选区修饰键矩阵 + 兼容矩阵）
- [x] `docs/references/renderer-interfaces.md` 契约草案条目成形（Protected Areas owner evidence 就位）
- [x] 若触 `ui/src/index.ts`：ask-first 理由已落字且未在门禁前改码（裁定不触——helper 落 flux-react，ui 零改动）

### Phase 2 - 共享解析 helper + 绑定通道实现（先红后绿）

Status: completed
Targets: 共享 helper（Phase 1 裁定落点）、绑定通道载体（Phase 1 裁定）、`command-palette.tsx`、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof——契约断言清单测试先行（红）：键位派发矩阵 + chord 时序（超时/打断/最长匹配）+ 输入焦点门控 + surface 路由 + 冲突 dev warn + 无绑定兼容矩阵（`packages/flux-renderers-basic/src/__tests__/keyboard-bindings.test.tsx` 20 条，红态实测 16 failed → 实现后全绿；`packages/flux-react/src/keyboard.test.ts` 20 条 helper 纯逻辑单测）
- [x] Fix——`parseHotkey` 抽出泛化为共享键盘解析 helper（单键位 + chord 状态机 + 焦点门控判定），command-palette 改为消费共享实现（行为零变化，既有 31 条单测回归全绿）（`packages/flux-react/src/keyboard.ts`：`parseKeyCombo`/`parseModifierHotkey`/`parseKeySequence`/`comboMatchesKey`/`isEditableKeyboardTarget`/`createChordMatcher` + `use-keyboard-bindings.ts` window 监听 hook，经 `flux-react/src/index.tsx` 导出；`command-palette.tsx` 删除文件内私有 `parseHotkey`/`matchesHotkey` 改消费 `parseModifierHotkey`/`comboMatchesKey`）
- [x] Fix——绑定通道按裁定载体实现（监听生命周期挂载/清理 + strict 双挂载安全 + 动作派发 CX-10 ctx 合规）+ 定义字段登记（`*-definitions.ts`/schema 校验同步，`check:renderer-definition-fields-only` 门禁零红）（`flux-renderers-basic/src/keyboard.tsx` 恒渲染 null + `KeyboardSchema`/`KeyboardBindingConfig` 落 `schemas.ts` + `basic-renderer-definitions.ts` 登记 category `'logic'` + playground route-matrix 注册 121→122 + keyboard lab page）

Exit Criteria:

- [x] 先红后绿单测全绿（派发/时序/门控/路由/冲突/兼容全矩阵）+ command-palette 既有单测零回归
- [x] 受影响包局部 typecheck/test 通过（保证 Phase 3 可继续）
- [x] `check:renderer-definition-fields-only`（`scripts/check-renderer-definition-fields-only.mjs`）与 `check:audit-event-dispatch-ctx` 门禁零新增红

### Phase 3 - table 选区修饰键 + 组合验证与裁定执行

Status: completed
Targets: `use-table-selection.ts`、`table-body-row-rendering.tsx`、`data-renderer-definitions.ts`、kanban（仅裁定立项时）、`__tests__/`

- Item Types: `Fix | Proof`

- [x] Fix——table 选区修饰键按 Phase 1 裁定接入（shift-click 范围/meta 增补/⌘A + 锚点/截断/跳过语义），先红后绿单测（与 `maxSelectionLength`/`checkableWhen`/`keepOnPageChange` 共存矩阵）（`use-table-selection.ts`：`modifierSelect` 门 + `selectionAnchorRef` 锚点 + 行级 shift 范围并集/不可选跳过/上限截断/永不取消 + select-all 锚点规则；`table-row-leading-cells.tsx` 新件承接 mousedown 修饰键捕获 → checkbox onCheckedChange 消费；`table-renderer.tsx` 容器级 ⌘/ctrl+A（editable target 门控 + preventDefault + 复用 handleSelectAll）；红态实测 14 failed → 全绿；hook 级矩阵 11 条（`table-modifier-select-hook.test.tsx`）+ UI 手势矩阵 7 条（`table-modifier-select.test.tsx`）；行 memo 局部性以 ref 镜像 rows/anchor 保持 `handleSelectRow` 恒定身份，perf locality 诊断回归全绿）
- [x] Proof——J/K 指针组合用例测试锁定：绑定通道（J/K → setValue 指针变量）+ `optionRow.value` 绑定（行选中样式随动）；若组合中表达式能力不足（如数组下一元素定位），登记公式函数候选而非阻塞本计划（`packages/flux-renderers-data/src/__tests__/keyboard-pointer-option-row.test.tsx`——`keyboard` 定义 + `list` optionRow.value 三元投影组合，J 下移/K 上移/边界钳制/无关键不动，全绿；**结论：三元表达式投影已足，零公式函数候选需要**）
- [x] Proof——Phase 1 各维度裁定执行落字：立项项实现（先红后绿）；deferred 项按 Phase 1 裁定登记 `Deferred But Adjudicated`（含 fill-handle 裁定的落地或登记；kanban 零改动亦须落字确认）（四维度终态：roving helper 不抽取（Decision 5①）——kanban ad-hoc 实现零回归采纳、族7 成员归一致性修复流程；kanban 手势/draggable 解耦 deferred（Decision 5②）——本计划 **kanban 零改动确认**（`packages/flux-renderers-scheduling/src/kanban/` 全程未触）；hover-peek deferred（Decision 5③）；范围选区+fill handle 编辑器选区模型 deferred（Decision 4）——四项均已落字本计划 Deferred But Adjudicated 节）

Exit Criteria:

- [x] 选区修饰键先红后绿单测全绿（含共存矩阵）
- [x] J/K 组合用例结论落字（可达或公式候选登记）
- [x] 全部维度终态落字（roving/kanban 手势/hover-peek + 范围选区+fill handle，实现或 deferred，零静默跳过）；受影响包局部 typecheck/test 通过

### Phase 4 - 文档对齐与 C2 回写

Status: completed
Targets: `docs/references/renderer-interfaces.md`、`flux-guide/`、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/logs/`

- Item Types: `Proof | Follow-up`

- [x] `docs/references/renderer-interfaces.md` 契约条目终稿（与 live 行为逐项核对，区分「字段存在」与「语义落地」）（§Keyboard Binding Contract + §Table Modifier Selection Contract 状态改 implemented and verified；CX-10 evaluation bindings 表述精确化 = 命中 payload `{ keys, index, nativeEvent }`；全部语义均已落地，无「字段存在、语义未落地」条目）
- [x] flux-guide schema 作者条目（键位绑定 + chord 用法 + J/K 指针组合样例）（`07-structural-nodes.md` §Keyboard Bindings——绑定字段表 + 匹配语义七条 + J/K 指针组合样例；`design-patterns/table.md` §4 rowSelection 表新增 `modifierSelect` 条目）
- [x] `docs/architecture/styling-system.md` 核查：若绑定通道/选区修饰键引入新 marker 则同步（无改动不写凑条目）（核查结论：`keyboard` 恒渲染 null 零 DOM 零 marker（`keyboard-bindings.test.tsx` 断言锁定）；选区修饰键复用既有 `table-select-cell` slot/checkbox 通道零新增 marker——零改动，不写凑条目，结论落字本行 + 回写 ⑫）
- [x] C2 回写 ⑫（追加式）：G-B2 行落「已产品化（本 plan）」终态证据 + 回写 ⑤「无 schema 事件面」表述修正 + 未纳入维度 successor 登记 + 初版裁决表零改动
- [x] daily dev log 记录（`docs/logs/2026/08-30.md` 或实际执行日）（`docs/logs/2026/08-31.md`——实际执行日 2026-08-31）

Exit Criteria:

- [x] owner 文档落字/核查完成且与 live 行为一致
- [x] C2 回写完成（追加式，初版裁决表零改动）
- [x] daily log 已记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_facbb1049ffetuEd4jolrfhqX0`（R1 全量四查 review，全部文件路径/行号/符号引用逐项 live 核对）+ `ses_facb214a7ffeYtrTBuHr39e5S0`（R2 scoped re-check）
- Verdict: `pass`（R1 `revised`——1 Major + 3 Minor；全部修复后 R2 scoped re-check 零 Blocker/零 Major，2 Minor residual 随共识修复）
- Rounds: 2
- Findings addressed: R1 Major ①范围选区/fill handle 编辑器选区模型无 backing 执行项（Related 承诺与 Phase 1 清单脱节，C2 回写 ⑦ 维度将无人承接）——新增 Phase 1 专项 Decision（与行级修饰键选区分列，立项或显式 deferred + successor 登记），Goals/Phase 3/Closure Gates/Deferred 前言同步四维度口径；Minor ②共写面声明扩全（`data-renderer-definitions.ts`、`schemas.ts`/`data-schema-validation.ts`、`use-table-selection.ts`）；③门禁名改 colon 形式 `check:renderer-definition-fields-only`（附脚本路径）；④Phase 1 Exit 计数核对（「六项 Decision 与一项 Proof」= 实际 6+1）。R2 Minor residual：Purpose「三个维度」→ 四维度枚举——随共识修复，零残留 Blocker/Major

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] 绑定通道契约已落地且 Phase 1 断言清单全项有先红后绿证明（键位/chord/门控/路由/冲突/兼容矩阵）（`keyboard.test.ts` 20 + `keyboard-bindings.test.tsx` 20，红态实测 16 failed）
- [x] table 选区修饰键语义落地且共存矩阵单测全绿；J/K 组合验证结论落字（11+7 条，红态实测 14 failed；J/K 结论：三元投影足用、零公式函数候选——`keyboard-pointer-option-row.test.tsx`）
- [x] 四维度（roving helper/kanban 手势/hover-peek/范围选区+fill handle 编辑器选区模型）终态裁定全部落字，零静默跳过（plan Deferred But Adjudicated 节四条终态登记；kanban 零改动确认落字）
- [x] `docs/references/renderer-interfaces.md` 对齐完成（Protected Areas owner evidence）；styling-system 核查完成（或零改动落字）（两节 Status: implemented and verified；styling-system 零改动落字 Phase 4 + 回写 ⑫）
- [x] C2 回写 ⑫ 完成（追加式，含回写 ⑤ 表述修正）
- [x] 无 in-scope live defect 或 contract drift 被静默降级（deferred 项均已分类并附 Why Not Blocking Closure；执行期发现的行 memo 局部性回归当场修复 + perf locality 诊断回归锁定）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（fresh session `ses_fab859cbcffeayVGaaF6ZRqz8n` 1 轮 **APPROVED** 零 Blocker/零 Major/零 Minor，3 Informational——Closure 段占位符为审计时点正确协议状态 / build-lint-fulltest 未独立重跑但 typecheck 37/37 + check exit 0 + 分阶段记录佐证无矛盾 / 红态计量为历史不可复现但内部一致且终态绿态 live 验证；审计独立重跑 keyboard 单测 20/20 + data 修饰键 19/19 + flux-react helper 20/20 + 双门禁 exit 0 + `pnpm check` exit 0 基线一致 + git status 确认 scheduling/flux-core/ui 零改动）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增命中，红项仅限既有登记）（exit 0；oversized 194W/2E/2 exempt 与 08-30 注册基线一致）

## Deferred But Adjudicated

> Phase 1 已全部裁定终态（2026-08-31 执行期确认零修订），以下为终态登记。

### hover-peek（hover 保持计时事件，Space hover-peek 手势）

- Classification: `watch-only residual`（Phase 1 Decision 5③ 终态裁定 deferred）
- Why Not Blocking Closure: P4b/P6b 实测中 hover-peek 均为显式裁决不模拟；鼠标等价路径已锁定，计时事件无复刻页在等消费
- Successor Required: `yes`
- Successor Path: D1 输入池 / deep-audit 候选

### 范围选区 + fill handle 编辑器选区模型

- Classification: `out-of-scope improvement`（Phase 1 Decision 4 终态裁定 deferred）
- Why Not Blocking Closure: P6b 零承载实测维持；其本体是单元格坐标选区模型（选区锚点 + 等差填充拖拽原语 + 键盘选区扩展），依赖 G-D 网格编辑语义件族（G-D 依赖 G-B2+G-B3 双前置），G-B3 未产品化时点实现属空转基础设施。与已落地的行级修饰键选区（Decision 3，本计划 Phase 3）分列
- Successor Required: `yes`
- Successor Path: D1 输入池 / G-D 语义件族 plan（依赖就位后重评）

### 共享 roving helper（kanban ad-hoc 实现）

- Classification: `not adopted`（Phase 1 Decision 5① 终态裁定不抽取）
- Why Not Blocking Closure: 框架相邻 roving 实现仅 kanban ad-hoc 一处（`kanban-column.tsx:270,296`），其余键盘漫游属 R2 族7 单控件一致性缺陷（修复面在组件级）；单采纳方共享 helper 属投机基础设施
- Boundary Follow-up: ≥2 个 renderer 需要网格键盘导航时（如 G-D 立项）再抽取，届时 kanban ad-hoc 实现回归采纳一并评估

### kanban 手势变体 / draggable 解耦

- Classification: `optimization candidate`（Phase 1 Decision 5② 终态裁定 deferred）
- Why Not Blocking Closure: schema 事件面在库（moveCardKeyboard → onCardMove，Proof 节实测修正回写 ⑤）；Space+←/→ 手势功能完整；解耦字段（独立 `keyboardReorder` 开关 / ⌥↑↓ 变体）零现行消费方
- 执行确认: 本计划对 `packages/flux-renderers-scheduling/src/kanban/` **零改动**（2026-08-31 执行期确认）
- Successor Required: `yes`
- Successor Path: D1 输入池 / kanban 迭代

## Non-Blocking Follow-ups

- 复刻页（linear/antdpro）键盘缺口接线改造（chord 导航、J/K 指针实际接入复刻 schema）
- 跨页 palette 单例/app 级命令注册中心（G-B1 successor，runtime/页面壳层候选池）——与本绑定通道的关系在 Phase 1 落字
- 单控件 roving 族7 成员（icon-picker/calendar/画布面板）一致性修复（归一致性修复流程）

## Closure

Status Note: 2026-08-31 完成。Phase 1（契约裁定：载体 `keyboard` 不可见 logic renderer / chord 状态机 / `rowSelection.modifierSelect` 字段面 / fill-handle deferred / 三维度终态 / surface 路由）由前序 session 落字；Phase 2 落地共享键盘解析 helper（flux-react `keyboard.ts` + `use-keyboard-bindings.ts`，command-palette 换用共享实现零回归）与 `keyboard` renderer（flux-renderers-basic，恒渲染 null，59 条先红后绿单测中的 40 条）；Phase 3 落地 table 选区修饰键（⇧click 加法并集范围/锚点/meta 切换/⌘A，共存矩阵 18 条）+ J/K 指针组合验证成立（三元投影足用，零公式函数候选）+ 四维度裁定执行落字（roving 不抽取 / kanban 手势解耦 deferred / hover-peek deferred / fill-handle deferred；kanban 零改动确认）；Phase 4 文档对齐（renderer-interfaces 两节终稿 + flux-guide 两处条目 + styling-system 零改动核查 + C2 回写 ⑫ 含回写 ⑤ 表述修正 + dev log）。执行期修复两处自伤回归并落字：行 memo 局部性（`normalizedRows` 进 deps 击穿 `handleSelectRow` 恒定身份 → ref 镜像修复，perf locality 诊断回归全绿）与 oversized 第 3 条 ERROR（`table-body-row-rendering.tsx` 704 行 → 抽取 `table-row-leading-cells.tsx` 收敛，先例同轨）。全量验证 full-green：typecheck/build/lint 37/37、test 68/68 tasks（新增 59 条单测）、check exit 0 零新增红（oversized 与 08-30 注册基线一致）。

Closure Audit Evidence:

- Auditor / Agent: fresh session 独立子 agent `ses_fab859cbcffeayVGaaF6ZRqz8n`（1 轮 APPROVED 零 Blocker/零 Major/零 Minor；3 Informational——Closure 段占位符系审计时点正确协议状态、build/lint/fulltest 以 typecheck+check+分阶段记录佐证未独立重跑、红态计量历史不可复现但内部一致）
- Evidence: 审计独立重跑 keyboard-bindings 20/20 + data 修饰键/J/K 19/19 + flux-react helper 20/20 + `check-renderer-definition-fields-only`/`find-event-dispatch-without-ctx` 双 exit 0 + `pnpm check` exit 0（oversized 194W/2E/2exempt = 08-30 注册基线）+ `pnpm typecheck` 37/37 + command-palette 回归 31/31；git status 核对 diff summary 且 `packages/flux-renderers-scheduling/`、`packages/flux-core/src/`、`packages/ui/src/` 零改动；C2 回写 ⑫ append-only 0 删行、初版裁决表零改动；源码 spot-check 证实 allowInInput 分组门控/surface 祖先路由/defaultPrevented 内建优先/chord 超时兜底/shift 并集与截断/锚点规则/radio 惰性/setSelectionExternal 锚点不动。daily log：`docs/logs/2026/08-31.md`

Follow-up:

- 复刻页（linear/antdpro）键盘缺口接线改造（chord 导航、J/K 指针实际接入复刻 schema）——见 Non-Blocking Follow-ups
- 跨页 palette 单例/app 级命令注册中心（G-B1 successor，runtime/页面壳层候选池）——与本绑定通道的关系已在 Phase 1 落字（Decision 1 候选 ③ 否决理由：跨 renderer 键位冲突协调归 G-B1 successor 承担面）
- 单控件 roving 族7 成员（icon-picker/calendar/画布面板）一致性修复（归一致性修复流程）——Decision 5① 边界登记：≥2 renderer 需网格键盘导航时再评估共享 roving helper 抽取（届时 kanban ad-hoc 实现回归采纳一并评估）
- fill-handle 编辑器选区模型 successor = D1 输入池 / G-D 语义件族 plan（Decision 4）；kanban 手势变体/draggable 解耦 successor = D1 输入池 / kanban 迭代（Decision 5②）；hover-peek successor = D1 输入池 / deep-audit 候选（Decision 5③）
