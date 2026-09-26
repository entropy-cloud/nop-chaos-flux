# L4 交互残留共享底座 mini-design（density / kanban 手势 / graph 状态色 / cardTemplate bindings / 列拖拽 / gantt selectedClass）

> Date: 2026-09-26
> Owner plan: `docs/plans/513-missing-components-l4-substrate-and-quick-wins-plan.md`（Phase 1 design gate）
> Sources: `docs/backlog/missing-components-and-designer-roadmap.md` §7；`docs/analysis/visual-quality/2026-09-24-page-archetype-coverage-audit.md` §3.6（共享底座规则）；`docs/analysis/ui-review/C2-capability-gaps.md` 回写③⑤⑧⑨⑩⑪⑫⑭⑮
> Review: r1 独立 fresh 审阅（0B/**1M**/6m，2026-09-26）——M1 density 消费面断言不成立（tbody 行高 padding 驱动，档位规则须落 ui table.css）+ 6 Minor；全部当轮修订落字（§1 重写 ui 包规则路径 + plan 513 In-Scope 扩 `packages/ui`；m1 hsl() 公式；m2 keyboard.ts 别名表面声明；m3 锚点 :26/:63 + gantt-bars bindings 先例；m4 DropdownMenu dragstart 风险与回退；m5 §3.6 六条逐条对齐表；m6 roadmap §13 L4.3/L4.4 裁决注记落盘）。r2 复核 <<待填>>

本文是 plan 513 六个实现项的统一 substrate 契约，与五项挂起裁决记录。原则遵循 archetype §3.6：统一 substrate + 编译面 + 共享 helper + N 采纳方；禁止 per-renderer bespoke。

## 0. 挂起项裁决（Decision，含出处）

| 项                                  | 裁决                                                               | 依据                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L4.3 range/fill-handle 选区模型     | **demand-gated**（`optimization candidate`，沿用回写⑮原档 C2:373） | 双前置（G-B2/G-B3）就位后的重评已由回写⑮完成：「零 consuming 复刻页，时点实现属投机基础设施」；spreadsheet 独立编辑器面已有 range/fill 能力（spreadsheet-core types.ts:167 / use-fill-handle.ts）。successor = D1 输入池，消费诉求出现时在 table 编辑双态矩阵之上叠加 |
| L4.4 hover-peek                     | **watch-only residual**（回写⑫ deferred ④，C2:330）                | Space hover 保持计时事件 = 交互态状态源缺口，无消费登记；回写⑤明令禁止全局 keydown 注入/焦点劫持绕道（C2:156）；「视图↔peek 联动」回写⑭①裁定作者侧创作约定（successor: no，C2:359）                                                                                   |
| L4.11c calendar drop-target CSS     | **销项**                                                           | 已被 plan 481 V11a 消费：`calendar/calendar.css:71-80` `[data-drop-target]` 主色描边 + `.drag-ok`/`.drag-conflict` token 驱动规则（本 Phase 2 落盘前已由 QA.1-L3 审计档独立复核 file:line 证实）；`data-drop-valid` 属性由 class 通道替代，不再单独立项               |
| L4.11d 共享 roving helper           | **维持 deferred**（回写⑫⑮双重 not adopted）                        | 触发条件「≥2 renderer 需网格键盘导航」未满足（当前落地消费方 <2：table 方向键漫游显式 deferred、kanban 已有自带 roving、calendar 6 周格未实现——归 plan 514，若 514 落地后计数 ≥2 再抽取）                                                                             |
| L4.11e command-palette 三 successor | **demand-gated**（fuzzy 自定义评分 / 最近使用排序 / app 级单例）   | 回写⑩（C2:299）登记以来无消费诉求登记；cmdk 内建评分现役可用；app-singleton 属页面壳层候选池（跨包治理），出现多页面共享命令注册诉求时再立项                                                                                                                          |

## 1. L4.1 table density 语义档

- **词表**（Carbon size / AntD `size` 词汇对照后定稿）：`density?: 'compact' | 'default' | 'relaxed'`——三档与 stripe replica 已实测锁定的 32/40/48px 阶梯一一对应（`--st-row-compact/default/relaxed`，P7a），不用 Carbon 四档（本仓无第 4 档实测参照值）。
- **Substrate**（review M1 修订：tbody 行高为 padding 驱动，`--table-row-height` 在库唯一消费者是 ui table.css thead th height——档位规则必须落在 ui 包）：
  - theme-tokens 增档位 token：`--table-row-height-compact: 32px` / `--table-row-height-relaxed: 48px`；default 档沿用既有 `--table-row-height: 40px`（不新增 default 别名，避免第二事实源）。
  - `packages/ui` table.css（`.nop-table` 样式属地）：非 default 档局部覆写 `--table-row-height`（`[data-density='compact']` / `[data-density='relaxed']` 两块）+ 增 `[data-density] tbody td { height: var(--table-row-height); }`（td height 即行高最小值语义，body 行从 padding 驱动切到 height 驱动——仅当显式设档时生效，base 行为零改动）。
- **消费面**：table 根元素输出 `data-density="<档>"`（default 档不输出属性）——renderer 侧改动仅一个 attribute，样式全部在 ui 包 table.css 与 theme-tokens。
- **编译/契约面**：`TableSchema` 增 `density` 字段（`schemas.ts`）；非法值（枚举外）按 default 处理（归一化在 schema props 解析层做，Failure Path density-invalid-value）。
- **采纳方**：table（roadmap 行指定范围）。list/cards 形态不采纳（复刻层已有各自密度面，YAGNI）。

## 2. L4.5 kanban 手势 schema 配置面

- **现状语义**（use-kanban-dnd.ts / use-kanban-board-effects.ts:76）：键盘重排固定 Space+←/→，挂接以 `draggable` 为门。
- **Schema 形状**：kanban schema 增 `keyboardReorder?: boolean | { enabled?: boolean; keys?: { prev?: string; next?: string } }`。
  - 缺省（字段缺省/`undefined`）：行为与现状逐字节一致——键盘重排可用当且仅当 `draggable: true`，键位 Space+←/→（零回归红线）。
  - 对象形：`enabled`（缺省 true）与 `draggable` 解耦——`draggable: false` + `keyboardReorder: { enabled: true }` = 仅键盘重排（无指针拖拽）；`keys.prev/next` 覆写默认键位（`parseKeyCombo` 既有解析器，复用 flux-react keyboard helper，不发明第二套 combo 语法）。
  - boolean 形：`keyboardReorder: true` ≙ `{ enabled: true }`；`false` 显式关闭键盘重排。
- **实现锚点**：`use-kanban-board-effects.ts` 的 `draggable` 门改为 `draggable || keyboardReorderEnabled`；键位匹配走 `comboMatchesKey` 既有 helper。
- **flux-react 改动面（review m2 补声明）**：默认键位 Space 在现 combo 语法不可表达（`comboMatchesKey` 以 `event.key.toLowerCase()` 精确比较，`" "` ≠ `"space"`）——`flux-react/src/keyboard.ts` 增 key 别名表（`"space" → " "`，顺带 `"esc"` 等常见别名），别名归一在 `parseKeyCombo` 内完成，对既有调用方透明（focused 单测钉住）。

## 3. L4.7 graph 节点状态色消费面扩展

- **既有链**：`levelField`/`levelMap`（schemas.ts:40-63，DEFAULT_LEVEL_MAP 四语义级）→ 节点 `data-level` marker（graph-node.tsx:30）→ CSS 仅 border-color 三规则（styles.css:42/:46/:50），填充恒 `--card`（styles.css:23）。
- **裁决**：**不新增第二套色词汇**（禁发明 colorMap/colorField 并行通道——G-E colorLadder 属 D1 输入池②，未立项）。扩展方式 = 同一 levelMap 语义四档的消费面加深：
  - 节点填充改语义色调 tint（review m1 修正公式——语义 token 为 HSL 三元组，须包 `hsl()`，随 graph styles.css:43 既有先例）：`background: color-mix(in srgb, hsl(var(--<level-token>)) 12%, var(--card))`（level token 对应 `--success`/`--warning`/`--destructive`/info 语义变量，实现时以 theme-tokens 实际变量名为准）。
  - 节点 `data-selected` 高亮与 `data-matching` 既有规则不动。
- **兼容红线**：未配置 levelField 的图（无 `data-level`）渲染输出与现状逐字节一致；levelMap 自定义映射（非四语义级）走 fallback neutral tint。
- **G-K 销项口径**：archetype B2 行「G-K open」在本项落地后回写 closed（数据驱动着色 = levelMap 全语义面消费）。

## 4. L4.8 cardTemplate per-card params（region bindings 通道）

- **根因**（已核实）：`RenderRegionHandle.render(options)` 契约含 `bindings?: Record<string, unknown>`（render-fragment-types.ts:26），bindings 经 `$slot` frame 进入 region 表达式（flux-react/slot-frame.ts `buildSlotFrame`）；而 `kanban-card.tsx:84` 把 `{ card, column, index }` 作 options 对象整体传入（`options.bindings` 为 undefined）→ region 内表达式拿不到卡片 scope。通道可行性已有在库先例：`gantt-bars.tsx:201` 即以 `render({ bindings: { task } })` 传任务数据（review 补引）。
- **修复**：kanban-card 改 `cardTemplateRegion.render({ bindings: { card, column, index } })`。**flux-core/flux-react 零改动**（通道在库）——plan Phase 5 的 Targets 修订为 scheduling 包单面。
- **表达式面**：region schema 以 `${$slot.card.title}` 形态消费（与 list item region 同一 slot-frame 语义——作者心智一致）。
- **兼容红线**：`config?.render` 自定义渲染分支与其余 region 消费方零改动；旧位置参数调用形态无其它在库使用（grep 证实唯一）。
- **linear 复刻绕行回灌评估**：`mock-backend-linear-issues.ts:255-263` 注释记载「cardTemplate region 无 card scope → 标题与 estimate 挤进 description 行」。回灌 = 该卡面 schema 改用 `$slot.card.*` 表达式恢复独立字段排版。裁定：**回灌**（现役绕行正是本缺陷的活证据，修复后不回灌则缺陷证据长存；schema 改动限 cardTemplate 模板块内，e2e 面断言随动）。

## 5. L4.11a table 列拖拽排序（消解 `columnSettings.draggable` 死配置）

- **现状**：`TableColumnSettingsConfig.draggable`（schemas.ts:58）全包零消费；列序通道 = 设置浮层上移/下移按钮（table-column-settings.tsx:102-121）+ `orderedColumnsStatePath` 顺序 state。固定列 `fixed` 已在库（roadmap 行该子句已被 live 超越，不需实现）。
- **裁定**：**接线而非删除**（schema 字段已发布，删除 = 契约破坏）。
- **Substrate**：columnSettings 浮层列行支持指针拖拽重排（HTML5 draggable 属性 + dragover/drop，局部于浮层面板，非全局事件岛——生命周期随浮层开关），drop = 计算新序写入既有 `orderedColumnsStatePath`（单写入口 `moveColumn → scope.update(orderedStatePath)`，use-table-visible-columns.ts:145-152——与上移/下移按钮同一写入口，后写胜出）。**无新 state 通道、无新 schema 字段**。
- **风险与缓解（review m4）**：浮层载体是 Radix DropdownMenu（table-column-settings.tsx:3-17），其 modal 焦点/指针管理层可能干扰原生 HTML5 dragstart——实现时优先在菜单 content（portal 面）内用原生 DnD 并以 focused 单测 + e2e 钉住；若 Radix 拦截成立，回退为指针事件重排（pointerdown/move 局部实现），两类实现都仅存在于浮层开窗生命周期内。
- **键盘等效**：既有 moveUp/moveDown 按钮保留（键盘路径不退化）；拖拽把手补 `aria-label`（flux.i18n 键，zh/en）。
- **冲突矩阵**：与列显隐 toggle、固定列协同 = 重排仅改顺序不改 hidden/fixed 位（顺序通道语义不变）。

## 6. L4.11b gantt 选中态 schema 通道（selectedClass 采纳）

- **现状**：选中态 = renderer 内部 store `selectedTaskId`（gantt-store.ts:26/:63）；bar 输出 `data-selected` + token CSS（防回归测试 gantt-selection-critical.test.tsx 在案）。bindings 求值通道先例：`gantt-bars.tsx:201` 已以 `render({ bindings: { task } })` 向 region 传任务数据——`selectedClass` 的每任务表达式求值沿用同一任务数据面。
- **裁定**：**不硬套 optionRow 绑定模型**（任务无「选中值绑定」语义；内部 store 选中是 gantt 交互域的正解）。采纳面 = task schema 增 `selectedClass?: string`（每任务表达式求值，task 数据可见），bar 选中时追加该 class（`data-selected` 与 token CSS 不动）。
- **契约**：缺省（未配置）零回归；与既有 `className`（常态 class）叠加而非替代；schema 契约落点随实现落在 gantt task 定义文件（gantt/ 目录无独立 schemas 文件，Targets 以实现时实际文件为准）。
- **销项口径**：回写⑨（C2:287）「gantt selectedClass 按价值可后续采纳」→ 本项落地后销项。

## 7. L4.10 docs-only 两处

- `flux-guide/examples/wizard-values-path.md`：增「footgun：未开 `mountOnEnter` 时离开步即丢已发布值」警示节（锚 `flux-runtime/src/form-runtime.ts` external publication 清理语义——`parentScope.update(valuesPath, undefined)`），不重写既有懒渲染说明（:18/:120 保留）。
- `flux-guide/design-patterns/data-source.md`：增「刷新上游数据源的正确姿势」节：`refreshSource` scoped lookup 无父链回退（source-registry.ts:440-457，仅查本 scope 桶）→ form 内按钮刷新页面级 source 用 `component:refresh` + `componentId`；`refreshSource` 适用面 = 同 scope 内注册的 source。
- 纯文档变体：无代码改动；`check:active-doc-code-anchors` 过锚点有效性。

## 8. 横切约束（全部实现项）

0. **archetype §3.6 六条规则逐条对齐**（review m5）：
   1. 禁 per-renderer bespoke 交互岛 → density/selectedClass 为纯 schema 字段 + token 消费；列拖拽仅浮层内局部生命周期；kanban 手势配置面复用存量 window keydown（shipped 交互，`closest('[data-dnd-card]')` 局部化）加配置，不新增事件面。
   2. 交互态必须 schema 可表达 → 四个新字段（density/keyboardReorder/selectedClass/syncLocation 式样延续）全部落 schema 契约面。
   3. 复用 action 词汇/既有通道 → cardTemplate 走 bindings 既有通道（规则 4 点名通道）；键位覆写复用 parseKeyCombo 解析器。
   4. 禁第二套并行词汇 → graph 显式拒绝 colorMap/colorField 并行通道；density 词表对齐 stripe 已实测阶梯而非新造。
   5. token 优先 → density 档全部经 theme-tokens custom property；graph tint 经语义 token + hsl() 包装先例。
   6. 单写入口/单事实源 → 列序复用 orderedColumnsStatePath 单写入口；行高 default 档不新增别名 token。

1. **i18n**：新增用户可见文案（aria-label 等）一律 flux-i18n 键 zh/en。
2. **oversized**：改动文件当前 warn 档在案（table-renderer 面、kanban 面），新增逻辑优先提取新模块而非内联膨胀。
3. **测试档**：必须自动化——各实现 Phase focused 单测先于或随实现；行为面 e2e/程序化断言随后。
4. **登记**：quick-reference schema 字段行（density/keyboardReorder/selectedClass/syncLocation 式样）；flux-guide 仅 L4.10 两处 + kanban 手势配置面（若 §2 定稿含作者可写面）。
