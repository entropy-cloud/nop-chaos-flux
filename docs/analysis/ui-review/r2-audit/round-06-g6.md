# R2 第 6 轮发现（round-06 · G6 收敛终判轮）

> 组号: G6（@nop-chaos/ui 62 非 test 模块） · 轮次: Round 06（收敛终判轮，最严格价值判据） · 审查日期: 2026-08-29 · agent = general（fresh session） · HEAD = 本 worktree live code
> 轮次性质: 前 5 轮已系统闭合五大盲区（焦点环 / i18n / 滚动契约 / 悬空 CSS 变量双向扫描 / aria 关联链逐链核对）+ R5 补查（受控性零发现、方向性检出 data-horizontal/data-vertical 失效族）。本轮只接受**前 5 轮所有方法面都未触及的全新根因**（或注明引根且修复互不覆盖的新实例），且必须通过真实用户影响检验。
> 输入清单: `AGENTS.md`、`dispatch-shared-prefix.md`（全部强制）、`dispatch-recursive-extension.md`、`dedup-baseline.md` §1–§4、round-01 G6 段（16 条）、round-02-compact / round-03-compact 全文、round-04 G6 段（含 6 项低于门槛留档）、round-05-g6 全文（含"核对过不立案"清单）。去重基线 = 全审累积 269 条（G6 组 25 条）。

---

### [G6-R6-视角3-01] TableRow 选中态样式通道全仓零生产方：`data-[state=selected]` 类串 + `--table-selected-bg(-strong)` 令牌三环齐备却永不匹配，数据表选中行（checkbox/radio/行点击勾选）无任何行级高亮

- **文件**: `packages/ui/src/components/ui/table-row-class-name.ts:2-7`（死通道）；令牌定义 `packages/theme-tokens/src/styles.css:85-86`；生产方缺失实证 `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:110,217-234,309`
- **证据片段**:
  ```ts
  // table-row-class-name.ts:3,5 — 选中态高亮押在 data-state="selected" 属性上
  default:
    'border-b transition-colors duration-200 hover:bg-[var(--table-hover-bg)] data-[state=selected]:bg-[var(--table-selected-bg)]',
  interactive:
    'cursor-pointer hover:bg-[var(--table-hover-bg-gradient)] data-[state=selected]:bg-[var(--table-selected-bg-strong)]',
  ```
  ```tsx
  // table-body-row-rendering.tsx:217-227 — 渲染器把 9 个 data-* 状态写到 ui TableRow 上，唯独没有选中态（isSelected 在 :110 解构、:309 只喂给 checkbox 的 checked）
  <TableRow
    data-slot="table-row"
    data-row-toggleable={toggleOnRowClick || undefined}
    data-interactive={isRowClickable || undefined}
    data-expanded={isExpanded || undefined}
    data-striped={isStriped && isEven ? true : undefined}
    data-tree-row={treeMode || undefined}
    ...
  ```
- **严重程度**: MEDIUM
- **现状**: 三段式链路中前两环齐备、第三环断裂：① ui `TableRow`（table.tsx:46-49 经 `getTableRowClassName`）为 default/interactive 两变体内建了选中态高亮类 `data-[state=selected]:bg-*`——这是上游 shadcn/ui Table 的公开契约（官方 DataTable 示例即 `<TableRow data-state={row.getIsSelected() && "selected"}>`）；② 设计令牌 `--table-selected-bg`/`--table-selected-bg-strong`（theme-tokens/src/styles.css:85-86，primary 10%/12% color-mix）为该通道专门定义；③ 但全仓 grep 证实 `data-state="selected"` 字面量、`data-state={...}` 表达式生产方（11 处命中全部是 swipe-cell/graph/ai/content 等无关值）、`setAttribute("data-state")` 三类写法**零命中**——没有任何代码在任何表行上落过该属性。数据表渲染器（flux-renderers-data table-body-row-rendering.tsx）计算了 `isSelected`（:110），却只用于 checkbox `checked`（:309）、maxSelection 钳制（:171-173）与 memo 比较（:589），行元素上落了 9 个 data-_ 状态唯独没有选中标记；ui styles/table.css、renderers 各 css、playground styles.css 亦无任何 `:has(input:checked)` 等替代选中行样式通道。净效果：**选中行与未选行除 checkbox 勾选点外视觉完全相同**，两个专属令牌成为"有定义、有消费类串、但消费选择器永不匹配"的三环断链（R4 悬空变量扫描验证到"消费串存在"即判非悬空，未穿透第三环——选择器→属性生产方；R5 的 data-_ 变体交叉核对按 Base UI 发射属性验证，而 `<tr>` 是普通元素、生产方必须是应用代码，两类既有方法面均结构性覆盖不到此处）。
- **行业惯例**: shadcn/ui Table 官方约定即行级 `data-state="selected"` + `data-[state=selected]:bg-muted/50`（本仓 ui TableRow 类串正是该契约的移植，令牌也备好了）；Ant Design Table 选中行有 `ant-table-row-selected` 蓝底高亮；AG Grid 选中行默认高亮。主流表格库一致把"行级选中高亮"作为选中反馈的基线通道，仅靠行首小尺寸 checkbox 勾选点承担全部选中反馈不在任何主流实现的默认行为内。
- **用户影响**: 在 CRUD 列表（本仓最高频 surface）勾选/点选多行后（如批量删除、批量导出前核对选择集），行本身无任何高亮，鼠标移开后 hover 底色消失，用户只能沿 checkbox 列逐行扫视确认"我到底选了哪几行"；radio 单选场景勾选点更小，误读选中行的概率更高。用户会真实注意到"选完了看不出选了哪些"，并通过真实用户影响检验。
- **建议**: 最小修复在生产方一行打通既有通道——`table-body-row-rendering.tsx:221` 起的 `TableRow` 属性串追加 `data-state={isSelected ? 'selected' : undefined}`，ui 侧类串与令牌零改动即生效；同时把两个 `data-[state=selected]` 命中位（table-row-class-name.ts:3,5）登记为该通道的唯一消费契约。修复后补一条断言测试（勾选后 `row.dataset.state === 'selected'` 且 computed background 含 color-mix 值）。切勿反向修复（删 ui 侧类串/令牌）——那会把"设计系统已声明的选中反馈契约"降级为永久缺口。
- **引根说明（新实例去重）**: 与 [G6-R5-视角6-01]（data-horizontal/vertical 失效族）同属"变体选择器指向不存在的 DOM 属性"大类，但机制不同——彼为 Base UI 发射**值不同**的属性（`data-orientation`），本为普通元素**全仓无任何生产方**；R5 修复清单（5 文件选择器改名）不触及 table-row-class-name.ts，本条修复（renderer 补生产方）不覆盖 R5 五文件，修复互不覆盖，按新实例分立。
- **复核状态**: 未复核

---

## 去重自检（与全部 269 条逐根因比对）

- **[G6-R6-视角3-01] vs [G6-R5-视角6-01]**：同大类不同机制、不同文件、修复互不覆盖（见引根说明），分立。
- **[G6-R6-视角3-01] vs [G4-R2-视角3-02]**（gantt 时间线任务条选中态无视觉指示）：同"选中态无视觉指示"表现族，跨包新实例（scheduling gantt vs data table），修复互不覆盖，按 dedup §1 兄弟实例口径分立。
- **[G6-R6-视角3-01] vs [G6-R4] 悬空变量扫描结论**（`--table-*` 全族"非悬空"）：R4 只验证了"消费串存在"，本轮新事实是该消费串的选择器全仓零生产方——第三链环（selector→producer）为 R4/R5 方法面均未触及的全新检查维度，非对既有结论的复述。
- **[G6-R6-视角3-01] vs G3 各轮**（rowSelection maxSelectionLength 静默禁用 / radio 脱离 RadioGroup / 全选 checked 判定）：G3 已报条目均为选择**行为/逻辑**缺陷，无一条涉及选中**行视觉反馈**；本条为独立缺口。
- 其余探查面（事件处理器覆写、type 默认值、z-index 分层、aria-invalid 家族、calendar locale、硬编码调色板、drawer swipe×resize 冲突、分页 aria 名、json-viewer、dialog drag 边界、焦点陷阱）逐一与 269 条比对，零重复（详见下方弃报留档）。

## 本轮核对过且不构成发现的疑点（防复核重复提问 + 弃报留档）

- **`field.tsx:126` `group-has-data-horizontal/field:text-balance` 为死变体——修正 R5 的错误放行记录**：R5"核对过不立案"节称该行"FieldFieldset 自产 data-horizontal、set+consume 闭环、链路完整"。本轮实读 field.tsx 全文（226 行）证实：**文件内不存在任何 `data-horizontal` setter**（Field 落的是 `data-orientation`，FieldSet/FieldGroup 均不落该属性），全仓亦零 setter，该 text-balance 规则永不生效。因属纯排版细节（横向 Field 描述行失去 text-wrap: balance）、真实用户不可感知，按收敛轮价值判据**不立案**，仅在此修正 R5 的事实错误：R5 主发现的修复批次应顺带把 :126 改为 `group-has-data-[orientation=horizontal]/field:text-balance`（上游 shadcn 同位规则即按 data-orientation 值判断）。
- **`data-[state=...]` 死类双生兄弟（视觉被孪生选择器完全覆盖，零用户影响，登记清理批次）**：`toggle.tsx:7` `data-[state=on]:bg-muted`（Base UI Toggle 只发 data-pressed；同串 `aria-pressed:bg-muted` 已提供相同视觉）；`tooltip.tsx:45` `data-[state=delayed-open]:animate-in/fade-in-0/zoom-in-95` 三连（Base UI Tooltip 无 data-state，见 TooltipPopupDataAttributes.d.ts 仅 open/closed/starting/ending/side/align/instant；同串 `data-open:*` 已提供相同入场动画）；`navigation-menu.tsx:144` `data-[state=hidden]/data-[state=visible]` 四连（NavigationMenuIcon 经 triggerOpenStateMapping 发 data-open/data-closed）——仅指示器淡入淡出微动画缺失，纯外观细节。
- **Drawer swipe×resize 手势冲突：实证不存在**。Base UI DrawerViewport.onPointerDown（DrawerViewport.js:708-720）以 `isDrawerContentTarget(elementAtPoint)` 排除抽屉内容内部（含 resize 把手）的按点起 swipe，把手另有 preventDefault+stopPropagation+pointerCapture 双保险，两手势互不劫持。
- **`handleOnly` 死参数**（drawer.tsx:42 解构丢弃）：Base UI 1.3.0 Drawer 无此 prop，workspace 零消费方，无用户可见后果——与 R4 `--drawer-direction` 同档登记供 API 清理批次顺带删除。
- **`DrawerContent` 函数式 `style` 被静默丢弃**（drawer.tsx:143 `typeof style === 'function' ? undefined : style`）：全仓无函数式 style 传参方，死路径。
- **已核对干净的面**：① 显式事件处理器均在 `{...props}` 展开前链式调用（SidebarTrigger `onClick?.(event)` 模式），无覆写丢失；② Button `type` 默认 `'button'`（button.tsx:47），SidebarRail 显式 `type="button"`，Base UI 基元经 useButton 自带 type 语义，无表单误提交面；③ z-index 分层为刻意的 `useGlobalZIndex` 全局计数系统（基线 2000 > 内容层 z-50，后开者恒更高，注释声明设计意图），非缺陷；④ aria-invalid 破坏态样式在 input/textarea/select/native-select/checkbox/radio/switch/toggle/button/badge/input-group/input-otp/combobox 全家族一致在位；⑤ calendar locale 为宿主透传（locale prop → DayPicker/toLocaleString），无硬编码语种；⑥ 硬编码 Tailwind 调色板仅 badge.tsx:19-20 两行，已由 [G6-视角7-01] 覆盖；⑦ 分页 prev/next/first/last 全部 aria-label+title+ i18n、ellipsis 有 sr-only；⑧ json-viewer 的 react-json-view-lite defaultStyles 为第三方浅色默认（与 sonner 默认 light 同类，维持 R1 C2 记录不升格）；⑨ use-dialog-drag 拖拽边界钳制完备（minVisible 30px，:63-88）、body user-select 卸载兜底在位（:227-231）；⑩ wrap-surface-tab-focus 过滤逻辑（offsetParent + tabindex 白名单）健全。

## 检查范围

- **目标**: `packages/ui/src/components/ui/` **62/62 非 test 模块**（清单逐一核对：accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, hover-card, input-group, input-otp, input, item, json-viewer, kbd, label, menubar, native-select, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar-context, sidebar-layout, sidebar-menu, sidebar, skeleton, slider, sonner, spinner, switch, table-row-class-name, table, tabs, textarea, toggle-group, toggle, tooltip, use-dialog-drag, wrap-surface-tab-focus），与 R1–R5 同口径。
- **消费链交叉核实**: `@base-ui/react@1.3.0` esm（DrawerViewport swipe 守卫 / Tooltip·Toggle·NavigationMenu·Drawer DataAttributes 声明 / useButton 语义）、`packages/theme-tokens/src/styles.css`、`packages/ui/src/styles/{table,base,index,mobile}.css`、`data-state` 三类写法全仓反查（字面量/JSX 表达式/setAttribute）、`data-horizontal` setter 全仓反查、`getTableRowClassName`/`TableRow` 消费方枚举、flux-renderers-data table-renderer 全套行渲染链（table-body-rows / table-body-row-rendering）。

## 检查方法

本轮为"新根因面"定向终判，不重走前 5 轮已闭合方法面。逐一探测前 5 轮未触及的根因类别：① 事件处理器覆写/展开顺序；② button type 默认与表单误提交；③ z-index 分层机制完整性（含 useGlobalZIndex 全链验证）；④ aria-invalid 状态族一致性；⑤ 第三方样式默认值（calendar locale / json-viewer / sonner 图标）；⑥ 手势组合冲突（drawer swipe×resize）；⑦ 公开 API 死参数（handleOnly / 函数式 style）；⑧ **"选择器→属性生产方"第三链环穿透**——沿 R4 悬空变量扫描与 R5 data-\* 变体交叉核对均验证过/放行过的消费串，反查其属性在本仓的生产方（由此检出唯一立案条目，并顺带证伪 R5 对 field.tsx:126 的放行依据）。每条候选先过"非设计师用户正常使用可感知"检验，再过 269 条逐根因比对，未过双检的一律落入弃报留档。

## 结论

新发现 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。R1–R6 G6 组累计 16+6+1+1+1+1 = **26 条**；全审累计 269 + 1 = **270 条**。G6 收敛趋势：16 → 6 → 1 → 1 → 1 → 1。本轮唯一立案条目来自既有两类扫描（悬空变量、data-\* 变体）都结构性覆盖不到的第三链环（选择器→应用侧生产方），属方法面增量而非递归挖掘；其余全部候选经真实用户影响检验降入弃报留档（含对 R5 一处放行记录的事实修正）。**确认 G6 组审查收敛**——在 12 视角 + 已闭合盲区 + 本轮新增链环穿透的组合方法面下，未再发现高价值候选，建议 G6 组终止递归。
