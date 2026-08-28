# R2 全量 UI 一致性审查汇总报告（summary.md）

> 审查日期: 2026-08-28/29 · 基线 HEAD `0f183874a` · 方法: 8 轮迭代发现（R1 初扫 + R2–R8 递归扩展，第 8 轮零发现收敛）+ 独立复核（7 组 fresh-session 子 agent，先看代码后对结论）
> 本文件仅引用**已通过独立复核**的结论（见 `review.md` 与 `review-g1..g7.md`）。发现全文与证据片段见各轮次文件；逐条复核理由见各组复核报告。

## 审查范围

- 扫描对象: 14 个 renderer 包（ai / basic / content / dashboard / data / form / form-advanced / graph / industrial+editor / layout / map / mobile / pivot / scheduling）+ `@nop-chaos/ui` 62 个非 test 组件模块 + playground 19 张复杂页 schema
- 审查维度: 12 视角全量（视角 9 限定 ARIA 语义/role 的 UX 可见部分；deep-audit 维度 09–12、20 不在范围）
- 执行方式: 8 轮迭代发现 + 分组独立复核；收敛趋势 127 → 63 → 34 → 29 → 16 → 5 → 2 → 0（round-06 G4/G5/G7、round-07 G1/G3/G6、round-08 G2 零发现收敛，未触及 10 轮上限）
- 静态口径: graph / map / industrial+editor（leafer/OpenLayers/xyflow 运行时依赖）与 19 页 schema 按静态口径审查（沿 R0/R1 先例，覆盖率表见 round-01.md）

## 发现统计

| 项                         | 数量                                                 |
| -------------------------- | ---------------------------------------------------- |
| 总轮次                     | 8                                                    |
| 深挖总发现数               | 276                                                  |
| 复核后保留                 | 273（HIGH 17 / MEDIUM 172 / LOW 87，终判口径）       |
| 降级                       | 3（均 MEDIUM→LOW，G3 focus ring 三条，理由见复盘节） |
| 驳回                       | 0                                                    |
| 证据精度修正（不改变判定） | 9 处（G2×4、G1×2、G5×2、G3×1，详见 review.md）       |

## 快速修复项（Quick Wins，<30 分钟可修复，均为复核通过条目）

| 编号              | 文件                                                                   | 修复描述                                                                                                             |
| ----------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [G2-视角10-01]    | `form-advanced/composite-field/array-field.tsx:546-550`                | array-field Add 钮补 `<PlusIcon className="size-4" />`                                                               |
| [G2-视角1-01]     | `form/input-time-renderer.tsx:216-228`                                 | 清除钮文本 `✕` → `<XIcon />`（对齐 input/textarea/date 族基线）                                                      |
| [G5-R2-视角10-02] | `ai/ai-conversations`                                                  | 新建会话按钮补 PlusIcon（outline/ghost + PlusIcon 基线）                                                             |
| [G4-视角1-01]     | `scheduling/gantt-header、calendar-header、gantt-links、barcode-input` | 文本字符 `−/+/‹›/×` → Minus/Plus/ChevronLeft/Right/XIcon（zh-CN.ts `'+ 添加列'` 文案一并图标化）                     |
| [G4-视角2-01]     | `scheduling/gantt-grid.tsx:157`                                        | 树形展开文本 `>` → ChevronRight/ChevronDown（aria-expanded 联动）                                                    |
| [G2-视角9-03]     | `form-advanced/array-editor.tsx、key-value.tsx`                        | i18n 硬编码 → `t('flux.*')`                                                                                          |
| [G5-R2-视角9-01]  | `graph` 布局切换按钮                                                   | 枚举值直出文案 → i18n + 图标化（与同簇图标按钮统一）                                                                 |
| [G5-视角7-01]     | `graph/styles.css:47,51`                                               | HSL 字面量 → `var(--warning)` / `var(--success)`（danger 已走 token，同文件补齐）                                    |
| [G4-R5-视角3-01]  | `mobile/styles.css:35-79`                                              | notice-bar 变体规则（含暗色覆盖）移出无生产方的 `.nop-mobile` 作用域类                                               |
| [G6-R5-视角6-01]  | `ui/scroll-area、separator、slider、toggle-group、button-group`        | `data-horizontal:`/`data-vertical:` → Base UI 实际发射的 `data-orientation` 值选择器（ScrollBar 0 宽修复为其中最急） |
| [G3-视角9-03]     | `data/tree`                                                            | 移除失真的 `aria-multiselectable` 或补多选行为                                                                       |
| [G2-视角9-02]     | `form-advanced/combo、input-table、transfer、picker`                   | 4 处校验文案硬编码英文 → i18n                                                                                        |

## 最大影响修复（Top 3）

1. **disabled / 关闭语义门禁穿透族**（[G2-R2-视角3-01]、[G2-R3-视角3-01]、[G2-R4-视角3-01]、[G4-R4-视角3-01]、[G2-R6-视角6-01] 等同根因批）——禁用字段仍可经 steppers/快捷区间/上传完成通道/扫码通道改值并随提交持久化；草稿弹层三关闭通道静默丢弃多字段编辑。一批"全次要写入通道回溯 disabled/readOnly"的系统性修复可同时消除 5+ 条 HIGH。
2. **`variant: "primary"` 渲染断裂**（[G1-视角2-01] + [G7-视角2-01] 同根因跨层）——cva 无 `primary` 键且运行时无归一化，8 处演示 schema 的主操作按钮渲染为透明裸文本，与 outline 取消钮权重倒挂。改一处 cva/归一化即可修复两条产品线的主操作路径。
3. **虚拟化 × 行选择/列编辑组合损坏**（[G3-R3-视角4-01] radio 脱离 RadioGroup 单选恒失效、[G3-R4-视角5-01] scrollRef 恒 null 虚拟化空表、[G3-视角5-01]/[G3-R3-视角8-01] 列错位族）——数据密集场景的核心交互在组合态下静默损坏。

## HIGH 清单（17 条，全部维持 HIGH）

| [G1-视角2-01] | `packages/flux-renderers-basic/src/button.tsx:65,265-277；packages/flux-renderers-basic/src/basic-renderer-definitions.ts:228-243` | `variant: "primary"` 未被 ui Button 支持，主操作按钮渲染为透明无背景 | shadcn/ui / Ant Design / MUI 中 primary（主操作）按钮一律有最强视觉权重（实底色 + hover 态）；本项目文档亦将其定为强制约定。当前实际输… |
| [G1-视角3-02] | `packages/flux-renderers-basic/src/button.tsx:211-227,245-263` | Button `href` 锚点路径下 disabled/loading 完全不生效：仍可导航、无任何禁用视觉 | Ant Design Button（`disabled` 阻断一切交互并置灰）、shadcn/ui Button（`disabled:pointer-events-none dis… |
| [G1-视角3-03] | `packages/flux-renderers-layout/src/button-group-renderer.tsx:110-134`| button-group`selectionMode`选中态无任何视觉指示 | shadcn/ui ToggleGroup 选中项为`data-[state=on]:bg-accent data-[state=on]:text-accent-foregrou… |
| [G3-视角5-01] | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:548-556（对照 table-renderer.tsx:377-381、table-renderer/table-header-row.tsx:389-453）` | 行级快速编辑保存条单元格没有对应表头列，导致整表列错位 | AG Grid / Ant Design Table 中任何 body 额外列都必须有配对的 header 列定义；固定列宽表格（colgroup + fixed layout）头… |
| [G5-视角10-01] | `packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:138-151（控制链路 adapters/use-conversation.ts:61 deleteConversation 无确认层）` | 会话删除一键直达、无确认且不可逆（删除整段持久化对话） | ChatGPT/Claude/Poe 的会话删除均为显式确认（二次确认弹层或"点击再次确认"）；Ant Design Popconfirm 用于破坏性行操作。HIGH 判级依据共享… |
| [G7-视角2-01] | `apps/playground/src/complex-pages/page-schemas/standard-crud.json:47,160,319；master-detail.json:280；approval-tasks.json:152；complex-form.json:151；combo-editor.json:71；business-document.json:125` | 8 处 `variant:"primary"` 为非法 Button variant，主操作按钮渲染为无背景文本按钮 | shadcn/ui Dialog/AlertDialog 的确认钮为 filled primary（`bg-primary text-primary-foreground`）；An… |
| [G2-R2-视角3-01] | `packages/flux-renderers-form/src/renderers/input-time-renderer.tsx:142-189；packages/flux-renderers-form/src/renderers/date/stepper-button.tsx:11-25` | input-time 的 steppers 形态完全不接入 disabled/readOnly 门禁：禁用字段仍可步进改值且无任何禁用视觉 | Ant Design `TimePicker`/`InputNumber` 禁用后全部交互入口（输入、步进、清除）统一阻断并置灰；shadcn/ui 禁用控件由原生 `disabl… |
| [G6-R2-视角6-01] | `packages/ui/src/components/ui/drawer.tsx:343-347（容器 drawer.tsx:163-178；对照 dialog.tsx:294-298）`| DrawerBody 无滚动契约：长内容在 max-h-[80vh]/h-full 抽屉中溢出且不可达，与 DialogBody 的内建滚动不对称 | shadcn/ui Drawer/Sheet 组合内长内容标准做法是 body 区滚动（Radix/Base UI 示例均给内容区`overflow-y-auto`）；Ant D… |
| [G7-R2-视角11-01] | `apps/playground/src/complex-pages/page-schemas/crud-views-export.json:41-48；packages/flux-renderers-content/src/link.tsx:56-63；apps/playground/src/complex-pages/shared/showcase-env.ts:211-224；packages/flux-core/src/utils/url.ts:4-14`| 导出下载链接指向 data: URL 且无 download 属性，现代浏览器拦截顶层导航，「点击下载」点击无任何效果 | 文件下载一律用`download`属性（同源/blob/data:）或后端真实 URL（Content-Disposition: attachment）；Ant Design/… |
| [G2-R3-视角3-01] |`packages/flux-renderers-form/src/renderers/period-renderers.tsx:230-244（对照同文件 :245 清除按钮、:143-149 applyShortcut、field-utils/field-handlers.tsx:87-91）`| period 家族（month/quarter/year）快捷区间按钮不接 disabled 门禁：灰显锁定字段仍可被改值并随提交持久化 | Ant Design 禁用表单控件的全部交互入口（输入、快捷项、清除）统一阻断；shadcn/ui 生态由原生`disabled`+ 基类禁用样式保证。次要交互通道（快捷预设）… |
| [G3-R3-视角4-01] |`packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:288-299,390-391；packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:301-306；packages/flux-renderers-data/src/table-renderer.tsx:417-420`| 虚拟化表格 + radio 行选择：RadioGroupItem 脱离 RadioGroup 容器，单选控件完全失效（点击无效、选中态恒不显示） | shadcn/ui RadioGroup 必须以 group 容器提供受控`value`；Ant Design Table `rowSelection type:'radio'`… |
| [G3-R3-视角8-01] | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:235-248；对照 packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:389-453、packages/flux-renderers-data/src/table-renderer.tsx:332-345,377-381、packages/flux-renderers-data/src/table-renderer/fixed-columns.ts:61-76`| draggable 表格的行拖拽列只有 body 单元格，表头`<th>`与 colgroup`<col>`均无配对列 → 整表列错位（[G3-视角5-01] 同根因新实例） | AG Grid / Ant Design Table 中任何 body 额外列（拖拽把手、展开、选择）都必须有配对的 header 列定义与列宽定义；colgroup + 固定布局… |
| [G6-R3-视角6-01] |`packages/ui/src/components/ui/drawer.tsx:143-149,178,183-195,306-311（消费链: packages/flux-react/src/dialog-host.tsx:455,519；schema 声明: packages/flux-renderers-basic/src/schemas.ts:108、surface-renderer-definitions.ts:228,246）`| Drawer`resizable`拖拽缩放是死链：把手全套 resize 供龄（光标/hover/aria-label），但尺寸变量无任何消费方，拖动后抽屉分毫不变 | shadcn/ui 生态的可拖拽把手（react-resizable-panels 的`ResizableHandle`、vaul Drawer 的 snap 把手）拖动即产生可… |
| [G3-R4-视角8-01] | `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:153-163,174-182；packages/ui/src/components/ui/table.tsx:6-15；packages/ui/src/styles/table.css:5-11` | 列宽拖拽手柄绝对定位逃逸包含块：非固定列的 resize 手柄全部叠在整表右缘，列宽拖拽对默认表格不可用 | AG Grid / Ant Design Table 的列宽手柄一律锚定在各列表头右缘（`th`为定位上下文，手柄`right:-Npx`贴列边）；shadcn/ui 生态惯… |
| [G3-R4-视角5-01] |`packages/flux-renderers-data/src/table-renderer.tsx:417-423,549-558；packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:336,374-388；packages/flux-renderers-data/src/schemas.ts:150,159`|`autoFillHeight`×`virtualThreshold` 并用时 ref 路由互斥：虚拟滚动容器永为 null，表体静默渲染为零行且无空态提示 | AG Grid / Ant Design Table 的"容器自适应高度 + 虚拟滚动"是大数据表格的标配组合（`scroll-y`与`autoHeight`/flex 容器可… |
| [G4-R4-视角3-01] | `packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:55-61,66-73,105-127,173-187,275,290,300-322（对照 :290 输入框本体正确消费 meta.disabled）`| barcode-input 的扫码/清除/scanNow 通道未接`meta.disabled`门禁：灰显锁定字段仍可被扫码改值、一键清空并随提交持久化 | Ant Design 禁用表单控件的全部交互入口（输入、后缀按钮、清除）统一阻断；shadcn/ui 生态由原生`disabled`+`disabled:pointer-ev… |
| [G2-R6-视角6-01] | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:516-518,547-556；packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:347-355（同接线）；packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:124-128,156-160（Dialog/Drawer 关闭透传）；packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts:132-145（dispose 实现点）；packages/ui/src/components/ui/dialog.tsx:45-49（closeOnOutsideClick = true 默认值）` | detail-view / detail-field 草稿弹层无脏态守卫：X 钮、ESC、点击遮罩三条通道均静默 dispose 草稿表单，多字段编辑不可恢复丢失 | 多字段草稿弹层的关闭守卫是三套参照系统的共同惯例：GitHub（评论/issue 编辑框 ESC/外点弹"未保存更改"确认）、Linear/Notion（模态编辑一律 dirty-… |

## MEDIUM 清单（172 条，按发现顺序；终判严重度以本表为准）

| [G1-视角5-04] | packages/flux-renderers-content/src/image.tsx:177-192；packages/flux-renderers-content/src/markdown.tsx:69-80 | image / markdown 加载态为纯文本"加载中"，无 Spinner，与包内其他加载模式不一致 |
| [G1-视角5-05] | packages/flux-renderers-basic/src/dynamic-renderer.tsx:226-238；packages/flux-renderers-content/src/markdown.tsx:86-95 | dynamic-renderer / markdown 加载失败态为无样式纯文本，无 destructive 语义色与图标 |
| [G1-视角8-06] | packages/flux-renderers-content/src/carousel.tsx:305-317 | carousel 指示点按钮仅 8×8px，触摸目标过小 |
| [G1-视角1-07] | packages/flux-renderers-content/src/diff-view/components/diff-header.tsx:44-67 | diff 头部"上一文件/下一文件"按钮用文本字符 ↑/↓ 而非 lucide 图标 |
| [G1-视角7-08] | packages/flux-renderers-content/src/diff-view/components/diff-three-column-view.tsx:97；packages/flux-renderers-content/src/diff-view/diff-view.css:530-537 | diff 三栏导航栏硬编码 `bg-gray-50`，覆盖了包内已定义的 `--nop-diff-nav-bg` 令牌 |
| [G1-视角7-09] | packages/flux-renderers-content/src/styles.css:18-31 | progress success/warning/danger 变体色用 oklch 字面量而非语义令牌，与 alert/badge 的令牌路径不一致 |
| [G1-视角4-10] | packages/flux-renderers-basic/src/text.tsx:158-174 | text maxLineToggle 展开按钮把文字塞进 20px icon-xs 按钮，文字溢出按钮边界 |
| [G1-视角10-11] | packages/flux-renderers-layout/src/wizard-renderer.tsx:584-600 | wizard 提交中按钮仅文字"提交中"，无 Spinner，偏离 button loading 统一模式 |
| [G2-视角1-01] | packages/flux-renderers-form/src/renderers/input-time-renderer.tsx:216-228 | input-time 清除按钮使用文本字符 ✕ 而非 XIcon |
| [G2-视角3-01] | packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:369-378 | transfer 全选 Checkbox 的 indeterminate 用裸 data 属性传递，半选/全选视觉恒错 |
| [G2-视角4-01] | packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:239-243,262-300 | input-number 同时配置 suffix 与 stepper（默认开）时二者视觉重叠 |
| [G2-视角4-02] | packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:79-103,158-195 | checkbox-group 的 maxSelected/minSelected 限制无任何用户可见反馈 |
| [G2-视角5-01] | packages/flux-renderers-form-advanced/src/upload-field.tsx:536-574 | 上传进行中仅文本"上传中"，无 Spinner，违反本仓 Loading 约定 |
| [G2-视角5-02] | packages/flux-renderers-form-advanced/src/upload-field.tsx:314-356 | 超限文件被 maxSize/maxFiles 拒绝或截断时无任何界面反馈 |
| [G2-视角5-03] | packages/flux-renderers-form/src/renderers/form-load-action.ts:40-105（渲染面 form.tsx:296-307,476-513） | form autoLoad/loadAction 拉数期间无任何 loading 指示，值到达即静默覆盖 |
| [G2-视角6-01] | packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:187-259 | 移动端 select 多选 bottom sheet 无确认/完成按钮，showCloseButton=false 且仅靠点遮罩收起 |
| [G2-视角6-02] | packages/flux-renderers-form-advanced/src/picker-dropdown.tsx:68-81 | picker 对话框取消按钮用 ghost，违反本项目对话框按钮约定且与同包 detail 弹层不一致 |
| [G2-视角9-01] | packages/flux-renderers-form-advanced/src/picker-option-list.tsx:27-54 | picker 多选选项列表 `<ul role="listbox">` 但子项无 `role="option"`，listbox 语义空壳 |
| [G2-视角9-02] | packages/flux-renderers-form-advanced/src/combo-renderer.tsx:606-627（同根因实例：input-table-renderer.tsx:459-480、transfer-renderer.tsx:484-489、picker-renderer.tsx:547-556） | combo / input-table / transfer / picker 内置校验文案硬编码英文，未走 i18n（同包 condition-builder 已示范正确做法） |
| [G2-视角9-03] | packages/flux-renderers-form-advanced/src/array-editor.tsx:82-103,150-182（同根因实例：key-value.tsx:213-246,544-554） | array-editor / key-value 的行标签、占位符与 aria-label 硬编码英文（含中英混排与用户可见 placeholder） |
| [G2-视角10-01] | packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:546-550 | array-field 的 Add 按钮缺 PlusIcon（ma5-ux 同类问题在未修复路径上的新实例） |
| [G3-视角3-03] | packages/flux-renderers-data/src/pagination-renderer.tsx:238-249, 312-324 | 独立 pagination renderer 禁用态按钮无视觉禁用样式 |
| [G3-视角2-02] | packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:272-291 | 行级快速编辑保存条按钮顺序违反项目 [secondary, primary] 约定 |
| [G3-视角4-01] | packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:256-281 | 表头列筛选的关键词搜索 Input 内嵌在 DropdownMenuContent 中 |
| [G3-视角5-02] | packages/flux-renderers-data/src/crud-infinite-scroll-area.tsx:26-41、packages/flux-renderers-data/src/list-renderer.tsx:467-473 | 无限滚动加载状态为纯文本，无 Spinner 组件 |
| [G3-视角5-03] | packages/flux-renderers-data/src/list-renderer.tsx:405-413（对照 crud-infinite-scroll-area.tsx:50-82） | list 无限滚动加载失败无重试入口（CRUD 有，行为不一致） |
| [G3-视角5-04] | packages/flux-renderers-data/src/chart-renderer.tsx:567-568、packages/flux-renderers-data/src/tree-renderer.tsx:557-559 | chart 与 tree 空状态无样式，与 list/pivot 的居中 muted 空态不一致 |
| [G3-视角5-05] | packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:82-95 | dashboard 运行态空布局渲染完全空白，无默认空态提示 |
| [G3-视角7-01] | packages/flux-renderers-data/src/stat-tile-renderer.tsx:148-152 | stat-tile 涨跌语义色硬编码 emerald/red，未用 success/destructive 令牌 |
| [G3-视角8-01] | packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:80, 109-138 | dashboard 运行态画布按固定 1200px 计算面板坐标，容器却为 100% 宽 |
| [G3-视角9-01] | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:45-117、packages/flux-renderers-dashboard/src/editor/editor-palette.tsx:20-25、packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:200,222,241、packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:339,346 | dashboard 编辑器多处可见文案与 aria-label 硬编码英文，未走 i18n |
| [G3-视角9-03] | packages/flux-renderers-data/src/tree-renderer.tsx:549-572（对照 packages/flux-renderers-data/src/schemas.ts:244） | tree 声明 aria-multiselectable 但组件无任何多选行为 [scope-conflict] |
| [G3-视角10-01] | packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx:78-148、packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:121-156、packages/flux-renderers-data/src/crud-list-pagination.tsx:16-48 | 同包存在三种分页 UI 形态 |
| [G3-视角4-03] | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:185-202 | inspector JSON 编辑器 Apply 对非法 JSON 静默失败，无任何错误反馈 |
| [G4-视角1-01] | packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:56-57；packages/flux-renderers-scheduling/src/calendar/components/calendar-header.tsx:47-72；packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:148-158；packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx:110-120；packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:300-309；packages/flux-i18n/src/locales/en-US.ts:1100-1101 | scheduling 包多处方向/缩放/新增/清除控件用文本字符替代 lucide 图标，且同包内图标化程度不一致 |
| [G4-视角3-01] | packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:148-158 | gantt 树形任务展开/折叠指示符恒为文本 ">"，不随展开状态变化 |
| [G4-视角5-01] | packages/flux-renderers-scheduling/src/gantt/gantt.tsx:476-484（对照 kanban-board.tsx:546-550、calendar/calendar.tsx:428-435） | gantt 默认空状态渲染完全空白的 div，与 kanban/calendar 的空态提示不一致 |
| [G4-视角6-01] | packages/flux-renderers-scheduling/src/kanban/components/kanban-column-adder.tsx:51-68 | kanban 新增列内联表单"确认"在左、"取消"在右，违反项目自身 action 顺序规范 |
| [G4-视角7-01] | 多处（代表性证据 kanban/kanban-column.tsx:207-209、kanban/kanban-card.tsx:114、gantt/gantt-grid.tsx:130-133、gantt/hooks/use-gantt-drag.ts:36-39、gantt/hooks/use-gantt-link-draw.ts:48-52、gantt/components/baseline-bars.tsx:42-43,56,65、kanban/components/kanban-toolbar.tsx:34） | scheduling 包硬编码语义色（red/blue 调色板类 + 裸 hex/rgba），与同包 CSS 令牌基线并存，主题适配断裂 |
| [G4-视角9-01] | packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:62-73,105-121；packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:80-94,111-139 | kanban 卡片与列头 `role="button"` 内嵌套真实 `<button>`，形成交互元素嵌套 |
| [G4-视角9-02] | packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:243-309 | kanban `role="list"` 直接子项为 `role="button"`，缺少 `role="listitem"` 结构层 |
| [G4-视角11-01] | packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:265-274 | calendar 月视图溢出指示 "+N more" 呈可点击样式但无任何点击行为，被隐藏事件不可达 |
| [G5-视角1-01] | packages/flux-renderers-ai/src/renderers/ai-conversations.tsx:124-151 | ai-conversations 重命名/删除按钮使用文本字符 ✎/× 而非 lucide 图标 |
| [G5-视角1-04] | packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:174-190 | scada 编辑器工具箱对齐/分布/层级/缩放按钮使用生僻 Unicode 字形，与 graph 控制组 lucide 图标跨包不一致 |
| [G5-视角2-01] | packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:100-108 | 用户消息编辑的取消按钮复用 "Stop"（停止）文案，与同包取消语义不一致 |
| [G5-视角3-01] | packages/flux-renderers-ai/src/renderers/ai-sender.tsx:190-207 | 流式响应期间发送框 textarea 整体禁用，用户无法预输入下一条消息 |
| [G5-视角4-01] | packages/flux-renderers-industrial/src/editor/inspector/inspector-field.tsx:38-66 | scada 属性面板 Label 未与控件关联（无 htmlFor/id），Switch 标签不可点击 |
| [G5-视角5-01] | packages/flux-renderers-industrial/src/renderer/scada-canvas.tsx:332-333（配套 packages/flux-renderers-industrial/src/styles.css:14-19） | scada-canvas 默认 loading 态渲染空白区域，无 Spinner/文案，与同包 editor 及 map/ai 的 loading 模式不一致 |
| [G5-视角9-01] | packages/flux-renderers-map/src/map-renderer.tsx:365-367 | map 画布 viewport 缺 role="application"/aria-label，违反画布包装层 a11y 契约且与 scada 同型渲染器不一致 |
| [G5-视角11-01] | packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:130-149（配套 packages/flux-renderers-ai/src/styles.css 全文无 [data-slot='ai-bubble'] 容器规则） | ai-bubble 无任何出厂容器视觉：shape/placement 模式形同虚设，用户/AI 消息默认无视觉区分 |
| [G6-视角3-01] | packages/ui/src/components/ui/input-group.tsx:43-69（样式定义 24-41） | InputGroupAddon 键盘可达（tabIndex=0）但无可见 focus-visible 焦点态 |
| [G6-视角3-02] | packages/ui/src/components/ui/card.tsx:12-36 | 可点击 Card（role="button"）无 focus-visible ring |
| [G6-视角3-03] | packages/ui/src/components/ui/drawer.tsx:183-195（对照 resizable.tsx:21-39） | Drawer 拖拽缩放把手仅指针可达，键盘用户无法调整大小 |
| [G6-视角4-01] | packages/ui/src/components/ui/input.tsx:17（对照 select.tsx:45、button.tsx:24、input-group.tsx:16、native-select.tsx:23） | Input 默认高度 36px，与同排 Select/Button/InputGroup 的 32px 体系错位 |
| [G6-视角6-01] | packages/ui/src/components/ui/alert-dialog.tsx:136-155 | AlertDialogAction 点击不关闭弹窗，与 AlertDialogCancel 行为不对称 |
| [G6-视角7-02] | packages/ui/src/components/ui/dialog.tsx:98（对照 sheet.tsx:34、drawer.tsx:107、alert-dialog.tsx:29；令牌值 packages/theme-tokens/src/styles.css:68、104） | 弹层遮罩双令牌并存：Dialog 用 --dialog-overlay-bg（70% 黑），Sheet/Drawer/AlertDialog 用 --surface-overlay（40%） |
| [G6-视角9-01] | packages/ui/src/components/ui/sidebar-layout.tsx:148-151（对照同文件 135 行） | SidebarRail aria-label/title 硬编码英文 "Toggle Sidebar"（同文件其余文案已走 t()） |
| [G6-视角10-01] | packages/ui/src/components/ui/menubar.tsx:114、120（对照 dropdown-menu.tsx:195、202、context-menu.tsx:161、167、select.tsx:117、127、combobox.tsx:133、141） | 菜单族勾选指示位置分裂：Menubar 左置，DropdownMenu/ContextMenu/Select/Combobox 右置 |
| [G7-视角1-02] | sundial-workbench.json:199-204,232-237；sundial-detail.json:425-430；sundial-todo-dialog.json:184-189；sundial-settings.json:287-292,335-340 | `icon:"tray"` 在 lucide-react 中不存在，渲染为 Circle 占位图标 |
| [G7-视角11-03] | sundial-workbench.json:1715-1724；sundial-todo-dialog.json:309-318 | 新建待办主路径断链："添加"仅关对话框，无提交、无落库、无任何反馈 |
| [G7-视角11-04] | sundial-workbench.json:184-308（导航 onClick），:824-1665（主内容仅绑定 activeView） | workbench 侧边栏「列表/分析」导航切换后主内容区无任何变化 |
| [G7-视角11-05] | sundial-workbench.json:1730-1760（对话框），:995-1016,1083-1097,1224-1238,1365-1379,1442-1456（各行 onClick 写入不同 activeTaskId） | 任务详情对话框内容静态：点任意任务行都打开同一条"撰写季度复盘报告" |
| [G7-视角3-06] | sundial-workbench.json:1100-1121,1543-1578；sundial-detail.json:720-731 | 已完成任务自相矛盾：标题划线删除线 + 圆圈 checkbox 未勾选 |
| [G7-视角10-07] | sundial-detail.json:601-627,766-791,905-937；sundial-workbench.json:2173-2201 | sundial 破坏性操作无确认：子任务硬删除与"移到垃圾箱"立即执行 |
| [G7-视角10-08] | standard-crud.json:328-344；master-detail.json:211-227 | 行级"删除"按钮样式不一致：standard-crud 为 destructive，master-detail 为默认实心主色 |
| [G7-视角10-09] | sundial-detail.json:162-183（取消+确认）；sundial-workbench.json:1833-1854,1921-1942,2049-2070（取消+确定）；:2146-2167（取消+确认）；sundial-todo-dialog.json:119-130,254-265（仅"确定"） | sundial 对话框操作区模式不统一：确定/确认混用、单按钮与双按钮并存 |
| [G7-视角4-10] | sundial-settings.json:940-990（URL/key 输入），:992-1011（保存按钮） | settings「保存」提示"已写入演示后端"，但连接信息输入值不在保存范围 |
| [G7-视角6-11] | sundial-settings.json:964-983 | 「anon 公钥」旁的 eye 图标为纯展示，无显隐切换且不可点 |
| [G7-视角11-12] | sundial-settings.json:1017-1109（状态卡，无 mode 绑定），:580-933（模式切换），:1459-1466（数据分区静态文案） | 同步状态卡不随同步方式联动：切到「本地模式」仍显示"已连接 Supabase / 上次同步 刚刚" |
| [G7-视角11-13] | sundial-detail.json:206-229（清除按钮），:200-204（行内日期徽标），:1218-1224（被清的 demo-date 输入） | detail 页「清除」按钮清错状态：清的是底部演示卡字段，行内日期徽标不变且 toast 谎报成功 |
| [G7-视角11-14] | sundial-detail.json:797-803 | 「添加子任务…」输入框无提交路径：回车与按钮均无效 |
| [G1-R2-视角2-01] | packages/flux-renderers-basic/src/button.tsx:189-193,245-263 | button `href` 锚点分支完全丢失按钮视觉：variant/size 失效，渲染为 UA 默认超链接 |
| [G1-R2-视角3-01] | packages/flux-renderers-layout/src/collapse-renderer.tsx:206-233 | collapse 触发器 disabled 项无任何视觉禁用区分，且 hover 反馈照常出现 |
| [G1-R2-视角3-02] | packages/flux-renderers-basic/src/button.tsx:229-237；packages/ui/src/components/ui/button.tsx:7（基类） | button `active`（aria-pressed 按压态）仅落 data-active/aria-pressed，全仓无任何样式消费 [G1-视角3-03 同类新实例] |
| [G1-R2-视角5-01] | packages/flux-renderers-content/src/audio.tsx:47-49；video.tsx:57-59；image.tsx:203-209；qrcode.tsx:82-88 | audio/video/image/qrcode 失败态与空态同为 muted 灰字，无 destructive 语义 [G1-视角5-05 同类新实例] |
| [G1-R2-视角8-01] | packages/flux-renderers-layout/src/steps-renderer.tsx:230-251；packages/flux-renderers-layout/src/styles.css:13-17 | steps 水平连接线 absolute 定位缺少 relative 包含块，连接线脱离步骤项渲染 |
| [G1-R2-视角8-02] | packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:86；diff-view/diff-view-renderer.tsx:152-159,534；diff-view/diff-view.css:583-594 | diff-view 窄容器/移动端降级不完整：cross-file 固定 240px 侧栏无适配，split 移动端堆叠被内联 grid 打断 |
| [G2-R2-视角4-01] | packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:30-84 | select 移动端 bottom sheet 多选选项行沿用单选圆形指示器，与同包 tree-select 移动多选的方块 Checkbox 两套语言 |
| [G2-R2-视角4-02] | packages/flux-renderers-form-advanced/src/array-editor.tsx:564-596；packages/flux-renderers-form-advanced/src/combo-renderer.tsx:554-560；packages/flux-renderers-form-advanced/src/input-table-renderer.tsx:403-416 | composite 家族（array-editor / combo / input-table）到达 maxItems 后 Add 按钮静默禁用，无计数无提示——checkbox-group maxSelected 缺陷的同根因兄弟实例 |
| [G2-R2-视角5-01] | packages/flux-renderers-form-advanced/src/upload-field.tsx:350-356,267-273 | 单选上传进行中二次选择文件：在飞上传未中止，晚完成的被废弃文件静默覆盖字段值，UI 与提交值不一致 |
| [G2-R2-视角6-01] | packages/flux-renderers-form-advanced/src/tree-controls.tsx:394-416,435-454 | tree-select 选中后弹层无任何关闭路径：桌面 popover 单选不关闭、移动 sheet 无关闭钮也无确认钮（select 移动 sheet 缺陷的同病兄弟） |
| [G3-R2-视角3-01] | packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:113-114,175-215,230-233 | 行点击勾选（toggleOnRowClick）无键盘等价路径，Enter/Space 对该行为完全无效 |
| [G3-R2-视角4-01] | packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:138-143,259-261；packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:171-173；packages/flux-renderers-data/src/table-renderer.tsx:606 | rowSelection maxSelectionLength 达上限后全链路静默禁用，无计数、无原因说明 |
| [G3-R2-视角4-02] | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:45-117,122-129 | dashboard 编辑器 Inspector 全部字段 Label 未与控件关联（无 htmlFor/id/aria-label） |
| [G3-R2-视角6-01] | packages/flux-renderers-data/src/table-renderer.tsx:443-485（Base UI 默认值核实: @base-ui/react@1.3.0 esm/menu/item/MenuItem.js:25 closeOnClick = true） | 列设置下拉中"上移/下移"点击即关闭菜单，重排 N 列需重开 N 次菜单 |
| [G3-R2-视角9-01] | packages/flux-renderers-pivot/src/pivot-renderer.tsx:254-257（交互注入: packages/flux-renderers-pivot/src/pivot-events.ts attachPivotEvents） | pivot-table 画布包装层无 role/aria-label，违反画布表面 a11y 契约（同型渲染器不一致） |
| [G4-R2-视角3-01] | packages/flux-renderers-scheduling/src/calendar/calendar.tsx:362-386（对照 packages/flux-renderers-scheduling/src/calendar/calendar.css 全文 404 行无命中、packages/flux-renderers-scheduling/src/kanban/kanban.css:144-146 有实现） | calendar 拖拽悬停目标零视觉反馈：`data-drop-target`/`drag-ok`/`drag-conflict` 在 calendar.css 无任何对应规则 |
| [G4-R2-视角3-02] | packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:162-186；对照 packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx:128-133、packages/flux-renderers-scheduling/src/gantt/gantt.tsx:285-288、gantt/gantt.css 全文无 [aria-selected]/[data-selected] 规则 | gantt 时间线任务条的选中态无任何视觉指示（网格行有高亮、条形无） |
| [G4-R2-视角4-01] | packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:173-187,326-328；packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:245-249 | 扫码校验失败的错误提示渲染在全屏扫描浮层之下，扫描过程中用户零反馈 |
| [G4-R2-视角5-01] | packages/flux-renderers-mobile/src/pull-refresh.tsx:146-170（对照同包 infinite-scroll.tsx:253-267） | pull-refresh 刷新失败静默回弹：无错误文案、无重试，与同包 infinite-scroll 的错误态双标 |
| [G4-R2-视角5-02] | packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:12-15,67-78；packages/flux-renderers-scheduling/src/calendar/calendar.tsx:83,226-236 | calendar PNG 导出的 `exportError` 状态已备但从未渲染，导出全程亦无 busy 指示 |
| [G4-R2-视角9-01] | packages/flux-renderers-mobile/src/notice-bar.tsx:235-241,284-301 | notice-bar 绑定 onClick 时 `role="button"` 容器内嵌真实关闭 Button（kanban 同病兄弟实例） |
| [G4-R2-视角10-01] | packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts:192-210,222-224；packages/flux-renderers-scheduling/src/calendar/calendar.tsx:294-358,506-518 | calendar 键盘拖拽会话：幽灵卡固定渲染在视口左上角 (0,0)，Enter 确认还会把已移动的事件派发回原日期 |
| [G5-R2-视角3-01] | packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:87-88；packages/flux-renderers-ai/src/engine/create-engine.ts:508-520,570-584；packages/flux-renderers-ai/src/styles.css（全文无 data-state='aborted' 规则） | 流式中断（aborted）态无任何视觉反馈，与错误态（banner+重试）不对称 |
| [G5-R2-视角3-02] | packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:210-214（对照 packages/flux-renderers-industrial/src/editor/styles.css:44-51 工具箱样式段无 .nop-scada-editor-toolbox-status 规则） | 工具箱操作回显 span 无样式规则、无 role="status"，失败与成功文案视觉无差 |
| [G5-R2-视角3-03] | packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:283,267-271；packages/flux-renderers-industrial/src/editor/runtime-mutators.ts:92,254-258（对照 editor/styles.css 全文无 [data-mode] 规则） | 编辑器 preview 态零可见指示，且工具箱/属性面板 mutator 未按 mode 门控仍可改图元 |
| [G5-R2-视角5-01] | packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:100-136（对照同文件 AttachmentStatus :361-383 已具备 error 条目展示通道） | ai-attachments 超 maxSize/maxFiles 拒绝静默丢文件，界面零反馈 |
| [G5-R2-视角5-02] | packages/flux-renderers-map/src/map-renderer.tsx:174-180,379-388（样式 packages/flux-renderers-map/src/styles.css:47-60） | map 错误覆盖层用中性灰正文且直接渲染原始 error.message，与全仓错误语义色/文案链路不一致 |
| [G5-R2-视角6-01] | packages/flux-renderers-ai/src/renderers/ai-tool-call.tsx:221-251 | HITL 审批卡片按钮顺序为 [批准(实心), 驳回(outline)]，违反项目 [secondary, primary] 审批按钮约定 |
| [G5-R2-视角7-01] | packages/flux-renderers-graph/src/styles.css:42-52 | graph 节点 warning/success 语义级颜色硬编码 HSL 字面量，同文件 danger 却走 --destructive 令牌 |
| [G6-R2-视角3-01] | packages/ui/src/components/ui/dialog.tsx:265-291（类串 269-277，聚焦属性 278-281） | 可拖拽 DialogHeader（tabIndex=0，常为弹窗首个 Tab 停留点）无任何 focus-visible 焦点态 |
| [G6-R2-视角3-02] | packages/ui/src/components/ui/menubar.tsx:46-56（对照 dropdown-menu.tsx:39-41 无样式 trigger、menubar.tsx:92 MenubarItem 有 focus:bg-accent） | MenubarTrigger 用 `outline-hidden` 抹掉默认焦点轮廓且无 focus-visible 替代，菜单栏键盘导航焦点不可见 |
| [G6-R2-视角9-01] | packages/ui/src/components/ui/combobox.tsx:31-42（ComboboxClear）、combobox.tsx:56-70（ComboboxInput 内嵌 trigger+clear）、combobox.tsx:227-235（ChipRemove） | ComboboxInput 内嵌 trigger/clear 与 ComboboxChip 的移除钮均为 icon-only 无可访问名 |
| [G7-R2-视角4-01] | apps/playground/src/complex-pages/page-schemas/tree-crud.json:36-53；packages/flux-renderers-form-advanced/src/tree-controls.tsx:418-430；packages/flux-renderers-form-advanced/src/tree-options.ts:169-171 | tree-crud 部门筛选选中后无任何清除/重置路径：clearable 未启用且 radio 模式不可反选，用户被锁死在筛选态 |
| [G7-R2-视角10-01] | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:905-909；apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:2173-2178 | sundial 族「移到垃圾箱/垃圾桶」按钮样式跨页分裂：detail 页 destructive 红色实底，workbench 对话框内为 ghost 无警示色 |
| [G7-R2-视角11-02] | apps/playground/src/complex-pages/page-schemas/form-wizard.json:61-80,104-131,141-156 | form-wizard 第二步收集的「部门」在确认步不回显、提交时不上送，用户选择被静默丢弃 |
| [G7-R2-视角11-03] | apps/playground/src/complex-pages/page-schemas/master-detail.json:232-259；apps/playground/src/complex-pages/shared/showcase-env.ts:300-310 | master-detail 未选择订单时「新增明细」可点击且报「新增成功」，记录以空 orderId 落库后在界面上永久不可见 |
| [G7-R2-视角11-04] | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:645-648,1254-1266 | sundial-detail 子任务详情对话框内容映射错误：点「整理 OKR 回顾」显示「整理发票」，父任务归属文案也指向另一条任务 |
| [G7-R2-视角11-05] | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:418-451 | sundial-detail「列表」字段行动态值与静态色点标签同屏双显：初始即重复渲染「工作」，切换列表后同一行出现两个不同列表名 |
| [G7-R2-视角11-06] | apps/playground/src/complex-pages/page-schemas/sundial-settings.json:842-846,878-884,993-1010；apps/playground/src/complex-pages/shared/showcase-env.ts:610-618 | sundial-settings「自建服务器（即将推出）」选项可正常选中且保存成功，「即将推出」徽标与实际行为互相矛盾 |
| [G7-R2-视角11-07] | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:84-110 | sundial-workbench 侧边栏「搜索」输入框无任何消费方：输入不影响任务列表，属死交互 |
| [G1-R3-视角3-01] | packages/flux-renderers-layout/src/wizard-renderer.tsx:572-583,278,315；packages/flux-renderers-layout/src/wizard-step-nav.tsx:77-83 | wizard 提交锁定期"上一步"与步骤导航按钮无禁用视觉，点击静默无效——同栏 next 却正确禁用 |
| [G1-R3-视角8-01] | packages/flux-renderers-basic/src/tabs.tsx:30-31,280-318,431-452 | tabs 移动端滑动手势未排除嵌套横向滚动/拖拽目标：表格横滑、滑块拖动约 50px 即被劫持为切换页签 |
| [G2-R3-视角3-02] | packages/flux-renderers-form-advanced/src/editor-renderer.tsx:256,293,328-334（对照 :392 data-readonly 与 :395 工具栏门控均用合并后的 readOnly） | editor（富文本）运行时转 disabled 后可编辑态被同步效应错误恢复：同步条件漏算 disabled，"已禁用"字段仍可继续输入并提交 |
| [G2-R3-视角4-01] | packages/flux-renderers-form-advanced/src/editor-renderer.tsx:108-122 | editor 链接动作：取消（dismiss）prompt 反而移除已有链接 + 依赖原生 window.prompt，非白名单 scheme 静默忽略 |
| [G3-R3-视角4-02] | packages/flux-renderers-data/src/table-renderer.tsx:592,598；packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:416-424,551-561；packages/flux-renderers-data/src/table-renderer/use-table-tree.ts:86-107 | 树表 + 行选择：表头全选框 checked 判定混用"顶层行数"与"扁平化选择计数"，展开子节点后点全选表头框不勾选 |
| [G3-R3-视角5-01] | packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:125-130；packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:224-233,273-291；对照 packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:93-98 | 行级快速编辑保存失败零反馈：hook 调用未接 onSaveError，同包单元格级保存的 env.notify 基线未复用 |
| [G3-R3-视角11-01] | packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:165-178；packages/flux-renderers-dashboard/src/layout-math.ts:125-157,163-210；packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:211-285 | dashboard 编辑器新增面板固定落 (0,0)、拖拽/缩放无任何碰撞处理：新面板与既有面板完全重叠，旧面板被静默遮盖 |
| [G4-R3-视角10-01] | packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:354-369；packages/flux-renderers-scheduling/src/gantt/gantt.tsx:216-219 | gantt 缩放视口锚定断链：`store.scrollLeft` 无生产写入方，setZoom 的中心锚定分支永不生效，缩放后可见日期窗口跳变 |
| [G4-R3-视角11-01] | packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:37-44,58；packages/flux-i18n/src/locales/zh-CN.ts:1125、en-US.ts:1126 | gantt 工具栏"适应/Fit"按钮不执行任何适配计算，仅跳到中间缩放档位，文案承诺的行为不存在 |
| [G4-R3-视角10-02] | packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:113-124；packages/flux-renderers-scheduling/src/calendar.tsx:341-358；packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag-create.ts:130-145,174-191 | calendar 月视图单元格 Enter/Space 的键盘"创建排班"是死路：长按模型依赖 pointerup，键盘会话永不完成，且遗留已武装会话劫持下一次任意点击 |
| [G4-R3-视角9-01] | packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:127-135；packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:107-115 | calendar 周/日视图的时段 gridcell 全部 `tabIndex={0}` 且无任何键盘行为：Tab 序被约 100 个惰性焦点停留点淹没，与月视图 roving 模型同组件分裂 |
| [G4-R3-视角7-01] | packages/flux-renderers-scheduling/src/calendar/components/calendar-event-block.tsx:19-30,113-120；packages/flux-renderers-scheduling/src/calendar/components/calendar-drag-type-selector.tsx:35-45；packages/flux-renderers-scheduling/src/calendar/calendar.tsx:46-51 | 排班事件块与班次选择按钮以固定白色前景配任意背景色：默认班次色 amber/blue/green 上白字对比度 1.7~2.9:1，事件标题难以辨认 |
| [G4-R3-视角11-02] | packages/flux-renderers-scheduling/src/calendar/calendar.tsx:473-504 | calendar 拖拽创建排班仅月视图可用：周/日视图长按空单元格零反应、无任何创建入口，同组件三种视图能力分裂 |
| [G5-R3-视角3-01] | packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:217-219,267-271,283-289（对照 toolbox/toolbox-panel.tsx:9-14、palette/editor-palette.tsx:7-10、inspector/inspector-panel.tsx:10-14 的 props 均无 disabled 通道） | scada 编辑器 `meta.disabled` 仅 inert 画布区，工具箱/图元库/属性面板完全未门控，"禁用编辑器"仍可增删改图元 |
| [G5-R3-视角3-02] | packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:157-171（全仓 grep：ai-feedback 在任何 .css 零命中；ui button.tsx 基类无 aria-pressed:_/data-active:_ 分支） | ai-feedback 赞/踩投票选中态仅落 `data-active`/`aria-pressed`，全仓无任何样式消费，投票后按钮外观零变化 |
| [G5-R3-视角5-01] | packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:187-204,250-260,386-390（对照同包 ai-sender.tsx:91-96 发送后 clearOnSubmit 清空草稿的既有闭环） | ai-attachments "发送"不闭环：非图片附件点击后静默无效果，发送成功后列表不清理可重复发送 |
| [G5-R3-视角8-01] | packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:158-214（7 组 ButtonGroup 约 28 个按钮单行排布）；packages/flux-renderers-industrial/src/editor/styles.css:44-51,90-97,117-119 | scada 编辑器工具箱 30+ 按钮单行不换行不滚动，窄容器下尾部按钮（撤销/重做/导出/导入）被 `overflow:hidden` 裁剪且无替代入口 |
| [G7-R3-视角4-01] | apps/playground/src/complex-pages/page-schemas/advanced-query.json:56-61（对照同文件 :40-47、:48-55 两个 select 均有 clearable: true） | advanced-query 日期范围筛选未启用 clearable，范围选定后无任何清空路径 |
| [G7-R3-视角4-02] | apps/playground/src/complex-pages/page-schemas/advanced-query.json:76-84；apps/playground/src/complex-pages/page-schemas/tree-crud.json:79-88；apps/playground/src/complex-pages/shared/mock-backend.ts:148-163,285 | advanced-query / tree-crud 部门列渲染原始部门 ID（d1/d1-1），同表角色/状态列均为中文标签 |
| [G7-R3-视角11-01] | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:145,358,442,526,610（侧边栏计数）、:843-972（压力卡图例）、:1057,1198,1339,1416,1493（分区 count）、:1589,1658（完成/垃圾箱计数行）；对照 sundial-settings.json:1445、sundial-analytics.json:100 | sundial-workbench 侧边栏计数与压力卡数字同屏自相矛盾，且与 settings/analytics 跨页矛盾 |
| [G1-R4-视角8-01] | packages/flux-renderers-layout/src/timeline-renderer.tsx:301-307（父级 li 布局 :283-289）；对照同文件垂直轴 :291-300、packages/flux-renderers-layout/src/styles.css:24-35 | timeline 水平模式的连接轴线零宽不可见：axis span 无宽度来源，垂直模式同槽位实现正常 |
| [G1-R4-视角5-01] | packages/flux-renderers-content/src/json-view.tsx:30-44；packages/flux-renderers-content/src/markdown.tsx:83-97；packages/flux-renderers-content/src/html.tsx:21-35（对照同包基线 cards-renderer.tsx:199-201,242-246、image.tsx:195-210、qrcode.tsx:73-95、audio.tsx:35-52） | content 包空值态双轨：json-view / markdown / html 空值且未配 empty region 时渲染完全空白，cards / image / qrcode / audio 同场景均有 muted 兜底文案 |
| [G1-R4-视角6-01] | packages/flux-renderers-basic/src/page.tsx:260-266（对照同文件桌面 sticky 分支 :146-148、消费基类 packages/ui/src/components/ui/sheet.tsx:58-64） | page 移动端 aside 折叠进 Sheet 后无滚动契约：长侧栏内容在 h-full 弹层内溢出且不可达（[G6-R2-视角6-01] 同根因新实例） |
| [G1-R4-视角8-02] | packages/flux-renderers-layout/src/steps-renderer.tsx:262-310（对照同包基线 packages/flux-renderers-layout/src/wizard-step-nav.tsx:91-149） | steps 可点击区只有 28px 圆形指示器：标题/描述不在热区，点击标题静默无反应——与同仓 wizard-step-nav 整钮可点双轨 |
| [G2-R4-视角3-01] | packages/flux-renderers-form-advanced/src/upload-field.tsx:248-279（完成写入路径）、:544-563（pending 行取消钮）；对照 field-handlers.tsx:87-91（onChange 仅拦 readOnly）、docs/architecture/styling-system.md:94（disabled: "${$form.submitting}" 为文档化用法） | upload 在飞上传的完成写入与 pending 行取消钮均不接 disabled 门禁：字段运行时转禁用后值仍被静默改写 |
| [G2-R4-视角5-01] | packages/flux-renderers-form-advanced/src/editor-renderer.tsx:326-352（值同步 effect）、:298-309（onUpdate 提交链路）；对照 packages/flux-renderers-form/src/renderers/form-load-action.ts:40-105（autoLoad/loadAction setValues 是该 effect 的典型外部值来源） | editor 外部值同步在聚焦窗口被永久丢弃：加载/联动写入的值不落地，用户下一次输入反以陈旧内容覆盖 |
| [G2-R4-视角5-02] | packages/flux-renderers-form-advanced/src/upload-field.tsx:350-368（余量切片）、:209-211（committedItems 只读已提交值）、:267（完成时追加不再复查上限） | multiple 上传的 maxFiles 余量计算不含在飞条目：并发选择窗口内上限失效，超限文件静默全部上传 |
| [G3-R4-视角8-02] | packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:512-530 | 嵌套表头 + `affixHeader` 时所有表头行共用 `top: 0` 粘性定位：滚动后组表头被叶子表头完全覆盖，表头塌成一行 |
| [G3-R4-视角4-01] | packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:416-447；packages/flux-renderers-data/src/table-renderer/table-flattened-items.ts:51-64；packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:121-123；packages/flux-renderers-data/src/table-renderer/use-row-drag-sort.ts:185-199,208-224 | 虚拟化 × 展开行 × 拖拽排序：`virtualRow.index`（含展开行条目）被当作数据行索引参与重排，拖放/键盘移动落错位置 |
| [G4-R4-视角10-01] | packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-dnd.ts:130-133,156-178,93-104；对照文档契约 flux-guide/design-patterns/kanban.md（"n | 全局 WIP 严格模式（超限禁入）"）、docs/plans/2026-07-20-2100-2-s7-kanban-advanced-plan.md（"n: true prevents drop to full column … drag ghost cannot land"）；Add 通道 packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:352-364、packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:322-330 |
| [G4-R4-视角11-01] | packages/flux-renderers-scheduling/src/calendar/calendar.tsx:274-286,394-402；packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-confirm-dialog.ts:21-25；packages/flux-renderers-scheduling/src/calendar/components/calendar-confirm-dialog.tsx:33-39；文案 packages/flux-i18n/src/locales/zh-CN.ts:1062 | calendar 拖拽确认对话框显示原始 resource ID：宿主未配资源时每次移动都显示 "\_default?"，配置资源时显示 res-\* 内部 ID |
| [G4-R4-视角11-02] | packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:31-53,84-88；packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:419-436,654-658；文案 packages/flux-i18n/src/locales/zh-CN.ts:1111 | kanban 活动日志渲染原始列 ID：columnNames 恒等映射（id→id），真实列名在 board 内可得但从未传入 |
| [G4-R4-视角11-03] | packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:180-191,183,287-297,352-379,414-436；类型与文案 packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:7-9,40-49；packages/flux-i18n/src/locales/zh-CN.ts:1112-1116 | kanban 活动日志只记录 cardMove：六种动作类型中五类（增/删/更新/建列/删列）永不记录，删除卡片后日志毫无痕迹 |
| [G5-R4-视角3-01] | packages/flux-renderers-ai/src/renderers/ai-chat.tsx:568-577；packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:36-45,104-125 | ai-chat `meta.disabled` 半量门控：发送框灰显锁定，但消息级"编辑+重发"仍可发起新 turn——P2-5 禁用契约在组合根上的缺口 |
| [G5-R4-视角5-01] | packages/flux-renderers-ai/src/adapters/use-conversation.ts:439,447-473（对照 ai-chat.tsx:511-529 仅 engineNullSwitch 即 activeEngine===null 时渲染 emptyState） | 会话切换水合期间旧会话内容滞留显示且无加载指示：activeId 立即翻转、activeEngine 等 `loadMessages` 完成才切换 |
| [G5-R4-视角10-01] | packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/error.tsx:32-37,88-101；引擎侧 packages/flux-renderers-ai/src/engine/create-engine.ts:196-207,253-261 | 错误态"重试"按"重新提问"实现：失败的用户消息保留、重试再追加一条同文消息，用户提问在界面上重复上屏 |
| [G5-R4-视角11-01] | packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx:38-49（对照 packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:311-327 已修复的拖拽落点） | scada 图元库"点击添加"仍固定落点 (50,50)：连续点击产生完全重叠的图元栈，与已修复的"拖拽落点在指针处"同源不同路径 |
| [G6-R4-视角3-01] | packages/ui/src/components/ui/command.tsx:57-70（对照组件: packages/ui/src/components/ui/input-group.tsx:16、正确基线 packages/ui/src/components/ui/combobox.tsx:56-57） | CommandInput 的焦点环挂空：outline-hidden 抹掉默认轮廓，组级 ring 因 data-slot 不匹配永不触发——⌘K 命令面板键盘焦点不可见 |
| [G7-R4-视角11-01] | apps/playground/src/complex-pages/page-schemas/sundial-settings.json:1160-1259（列表分区 4 行计数，:1180/:1205/:1230/:1255）；对照 :1445（同页「数据」分区"10 条任务 / 4 个列表"）；apps/playground/src/complex-pages/shared/showcase-env.ts:556-568（Sundial**lists 返回 6/3/4/2）；apps/playground/src/complex-pages/shared/mock-backend-sundial.ts:33-46（任务库实际分布：工作 5、家庭 2、购物 1、收件箱 3） | settings「列表」分区四个列表计数与任务库及同页「数据」分区自相矛盾：6/3/4/2（合计 15）对 10 条任务库与"10 条任务"声明 |
| [G7-R4-视角6-01] | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:2084-2170（openDialog args.data 硬编码 list: "work" 于 :2097-2100；表单预选 :2129-2132；确认钮 :2157-2165；onSubmitSuccess 持久化 :2101-2123）；对照同对话框「列表」字段行 :2009（显示 taskDetailListLabel ?? '工作'） | workbench 任务详情「移到列表」选择器预选值硬编码 "work"：任意任务打开后直接点确认即被静默移入工作列表（ajax 持久化） |
| [G7-R4-视角3-01] | apps/playground/src/complex-pages/page-schemas/complex-form.json:25-30,140-145；combo-editor.json:15-20,60-65；business-document.json:19-24,113-118；form-wizard.json:141-156,158-163（四页同构：then: setValue X Saved true + ${X Saved ? "已保存 ✓" : "未保存"}） | 四张表单页「已保存 ✓/已提交 ✓」状态旗标为一次性置位：保存后继续编辑，状态行仍宣告"已保存" |
| [G1-R5-视角8-01] | packages/flux-renderers-content/src/markdown.tsx:107-119（渲染容器）、:116（remarkGfm 启用）；对照内部基线 packages/ui/src/components/ui/json-viewer.tsx:64、packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx:291 | markdown 渲染容器无溢出契约：GFM 表格与代码块在窄容器/移动端撑破布局，同仓两个 markdown 消费面均有 overflow 基线而本组件缺失 |
| [G2-R5-视角4-01] | packages/flux-renderers-form/src/renderers/form.tsx:328-344（消费方）；packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:588-616；packages/flux-renderers-form/src/renderers/button-group-select-renderer.tsx:95-124；packages/flux-react/src/field-frame.tsx:189-207,257-263（注入源） | 提交失败后的"聚焦首个错误字段"辅助对容器型 aria-invalid 控件静默失效：radio-group / button-group-select / 全部 wrap 复合字段的错误无法成为焦点目标 |
| [G2-R5-视角4-02] | packages/flux-renderers-form/src/renderers/fieldset.tsx:33-37,83-92；组合面 packages/flux-renderers-form/src/renderers/form.tsx:319-349；对照隐藏策略 packages/flux-react/src/node-renderer-resolved.tsx:414-422 | collapsible fieldset 折叠区内的字段照常参与校验并拦截提交，但错误提示渲染在 display:none 区内不可见：提交静默失败且无展开引导 |
| [G3-R5-视角4-01] | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:131-155（NumberInput）、:70-99（X/Y/W/H 字段）、:208-216（updatePanel）；对照 packages/flux-renderers-dashboard/src/layout-math.ts:84-112（clampPanelPosition/clampPanelSize）、:248（sanitizePanels 边界钳制）、packages/flux-renderers-dashboard/src/editor/dashboard-domain-adapter.ts:149-151（validate 仅校验 finite）、packages/flux-renderers-dashboard/src/dashboard-renderer.tsx:79（运行态消费 sanitizePanels） | Inspector 的 X/Y/W/H 数值写入绕过布局钳制层：负坐标/零尺寸面板从画布消失且不可点选，保存后与运行态渲染分歧 |
| [G3-R5-视角3-01] | packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:239-255（Delete 按钮）、:279-292（mode 切换）、:296-330（preview 分支不渲染 EditorCanvas）；packages/editor-core/src/editor-core.ts:261-265（setMode 不清 selection） | dashboard 编辑器 preview 态编辑通道未按 mode 门控：Delete 按钮随旧选中态保持可用，预览中一点即删面板（[G5-R2-视角3-03] 同根因新实例） |
| [G4-R5-视角3-01] | packages/flux-renderers-mobile/src/styles.css:35-79（变体规则全部以 .nop-mobile 为前缀）；packages/flux-renderers-mobile/src/notice-bar.tsx:239-252（渲染根只输出 nop-notice-bar，无 nop-mobile）；文案与契约 flux-guide/mobile/notice-bar.md:10-29,52-55（variant: "warning" 为一等 schema 能力） | notice-bar 的 variant 变体色板是死 CSS：全部变体规则（含暗色覆盖）挂在 `.nop-mobile` 作用域类下，而全仓没有任何渲染器或宿主输出该类 |
| [G4-R5-视角3-02] | packages/flux-renderers-scheduling/src/gantt/gantt.tsx:495（主容器仅消费 meta.className/testid/cid）；packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:561；packages/flux-renderers-scheduling/src/calendar/calendar.tsx:448-455；包内基线对照 packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx:290；契约佐证 packages/flux-renderers-scheduling/src/scheduling-boundary-narrowing.test.ts:109-114 | gantt / kanban / calendar 三个 board 类组件整体零消费 `meta.disabled`：P2-5"禁用整个交互面"契约在 scheduling 全部交互表面失效（barcode-input 为包内正确基线） |
| [G5-R5-视角3-01] | packages/flux-renderers-map/src/map-layer-manager.ts:194-205（buildPinStyle）、:165-192（buildClusterStyle）、对照 :117-133（buildRegionStyle 高亮分支）；接线点 packages/flux-renderers-map/src/map-renderer.tsx:295-300 | map pin/cluster 模式 hover 高亮链路死路：指针高亮基础设施对默认 mapType 完全无效，与 region 模式同组件双标 |
| [G5-R5-视角3-02] | packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx:215,308-312,411-413；packages/flux-renderers-ai/src/rich-text/components/tiptap-sender-surface.tsx:17-24；packages/flux-renderers-ai/src/rich-text/components/template-bar.tsx:25-38；对照 packages/flux-renderers-ai/src/renderers/ai-sender.tsx:196 与 packages/ui/src/components/ui/textarea.tsx:11 | tiptap 富文本发送框锁定态零视觉：`setEditable(false)` 后界面与可用态完全相同，击键静默失效；TemplateBar 在锁定态仍可向编辑器写入内容 |
| [G5-R5-视角8-01] | packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:261-276（样式消费 packages/flux-renderers-ai/src/styles.css:213-222） | 代码块复制钮以无底色文本钮悬浮在代码首行右上角：长行代码与按钮文字直接叠压 |
| [G6-R5-视角6-01] | packages/ui/src/components/ui/scroll-area.tsx:31-39（主受害面）；同根因：separator.tsx:10-13、slider.tsx:20,29,32,36、toggle-group.tsx:28,47,50,76、button-group.tsx:60-75；官方佐证：packages/flux-renderers-content/src/styles.css:3-16 | `data-horizontal:`/`data-vertical:` 方向条件类全族失效：Base UI 1.3.0 只发射 `data-orientation="值"`，从不发射 `data-horizontal`/`data-vertical` 存在性属性——ScrollBar 渲染为 0 宽不可见不可拖，Separator/Slider/ToggleGroup 的方向几何全部落空 |
| [G7-R5-视角4-01] | apps/playground/src/complex-pages/page-schemas/complex-form.json:90-106 | complex-form 省份→城市级联切换后城市保留旧省脏值并随表单提交 |
| [G7-R5-视角11-01] | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:1273-1301（对话框删除链）；对照行内删除链 :604-627 与行可见性旗标 :629,711,793 | sundial-detail 子任务详情对话框删除路径不同步行内列表：删除成功后行仍显示，可对同一子任务反复删除 |
| [G7-R5-视角11-02] | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:911-936（detail 移到垃圾箱写库）；sundial-workbench.json:2101-2123（对话框移到列表写库）、:2179-2201（对话框移到垃圾桶写库）、:1627-1663（垃圾箱看板静态 1 行+计数）；对照 shared/showcase-env.ts:570-581、shared/mock-backend-sundial.ts:33-46,60-66 | sundial 写库动作（移到垃圾箱/移到列表）后无任何视图消费变更：看板全部静态写死，已备的 `/r/Sundial**todos`视图过滤端点零消费（已立根因跨页新实例） |
| [G1-R6-视角8-01] | packages/flux-renderers-basic/src/tabs.tsx:320-329（mobile-only 溢出分支）、:258-268（mobile-only scrollIntoView）；对照基类 packages/ui/src/components/ui/tabs.tsx:23（TabsList 无 overflow/wrap）、:56（Trigger flex-1 + whitespace-nowrap 的 min-content 下限） | tabs 仅移动端水平形态有滚动契约：桌面端页签过多时 TabsList 溢出容器/被裁剪，右侧页签不可达——同组件移动分支已自证正确做法（宽内容无滚动契约族新实例） |
| [G1-R6-视角8-02] | packages/flux-renderers-content/src/alert-renderer.tsx:104-116；对照 ui 基类契约 packages/ui/src/components/ui/alert.tsx:7（has-data-[slot=alert-action]:pr-18）与 :65（AlertAction 槽位 absolute top-2 right-2） | closable alert 关闭钮 absolute 悬浮未给内容预留右内边距：ui Alert 已内建 AlertAction 让位契约（pr-18）而渲染器自绘按钮绕过了它，长文本尾部与关闭钮叠压且点击文本尾易误关 |
| [G3-R6-视角8-01] | packages/flux-renderers-data/src/table-renderer/combine-cells.ts:41-53（计划仅在 virtual 时降级）、:63-95（rowSpan 按纯数据行序列计数）；packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:192-199（非虚拟路径以 virtualEnabled: false 产出真实合并计划）、:209-284（数据行与展开详情行在同一 Fragment 内交错渲染）；packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:327-332、:517-529（rowSpan 原样下发到 <TableCell>）；packages/flux-renderers-data/src/table-renderer/table-expanded-row.tsx:29-31（展开行 = 单个 colSpan={columnCount} 单元格）；对照 docs/components/table/design.md:252（E1b 仅登记 combine×virtual 限制） |`combineNum` 单元格合并 × 展开行并用时 rowSpan 跨越交错的展开详情行：表格网格错位、详情行被合并单元格吞没（[G3-R4-视角4-01] 索引空间族的互补象限新实例） |
| [G6-R6-视角3-01] | packages/ui/src/components/ui/table-row-class-name.ts:2-7（死通道）；令牌定义 packages/theme-tokens/src/styles.css:85-86；生产方缺失实证 packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:110,217-234,309 | TableRow 选中态样式通道全仓零生产方：`data-[state=selected]`类串 +`--table-selected-bg(-strong)` 令牌三环齐备却永不匹配，数据表选中行（checkbox/radio/行点击勾选）无任何行级高亮 |
| [G2-R7-视角9-01] | packages/flux-renderers-form-advanced/src/icon-picker.tsx:39,213-244,246-258；对照基线 packages/flux-renderers-form-advanced/src/tree-option-list.tsx:89-91,345-352 | icon-picker 图标网格以 200+ 个独立 Tab 停留点承载 listbox 语义：无 roving、无方向键模型，键盘用户被 Tab 序淹没——与同包 tree-option-list 的 roving 基线同族分裂 |
| [G2-R7-视角4-01] | packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:161-168,186,411-437 | condition-group 的 maxItemsPerGroup 门禁只覆盖"添加条件"通道："添加分组"按钮无门禁且 handler 无检查，配置上限被静默绕过，同栏两按钮门禁语义自相矛盾 |

## 按组件分组

| 组件/包                    | 发现数              | HIGH | MEDIUM | LOW | 主要问题类别                                                           |
| -------------------------- | ------------------- | ---- | ------ | --- | ---------------------------------------------------------------------- |
| playground（19 页 schema） | 45                  | 2    | 30     | 13  | 产品完成度/主路径（视角 11）、死交互、跨页一致性                       |
| scheduling                 | 35                  | 1    | 24     | 10  | 文本字符图标、disabled 门禁、hover-only 触点、语义色硬编码             |
| data                       | 33                  | 5    | 18     | 10  | 虚拟化组合、列契约、focus ring、树表                                   |
| ai                         | 25                  | 1    | 14     | 10  | 会话组合边缘态、发送闭环、错误恢复                                     |
| ui（62 模块）              | 23                  | 2    | 12     | 9   | 滚动契约、方向条件类失效、死 CSS 变量                                  |
| form-advanced              | 22                  | 1    | 17     | 4   | 上传竞态/门禁、maxItems 族、i18n                                       |
| form                       | 17                  | 2    | 10     | 5   | disabled 门禁（HIGH）、步进控件、聚焦首错                              |
| dashboard                  | 17                  | 0    | 8      | 9   | 编辑器写入门控、面板几何、预览态                                       |
| basic                      | 14                  | 3    | 7      | 4   | variant 断裂（HIGH）、锚点禁用（HIGH）、选中态无样式（HIGH）           |
| industrial+editor          | 13                  | 0    | 8      | 5   | preview 门控、工具箱溢出、静态口径                                     |
| content                    | 11                  | 0    | 10     | 1   | 溢出契约、空值态双轨、媒体错误态                                       |
| layout                     | 7                   | 1    | 6      | 0   | timeline 轴线几何（连接线族）、选中态、页签滚动                        |
| graph                      | 5                   | 0    | 1      | 4   | 语义色硬编码、缩放边界                                                 |
| mobile                     | 4                   | 0    | 3      | 1   | 死 CSS 变体、board 类 disabled 零消费                                  |
| map                        | 4                   | 0    | 3      | 1   | 错误文案链路、hover 链路、视口适配                                     |
| pivot                      | 1                   | 0    | 1      | 0   | 画布 a11y 语义                                                         |
| flux-react / 跨层          | 0（条目计入触发包） | —    | —      | —   | field-frame aria-invalid 注入面在 G2 [G2-R5-视角4-01] 中作为修复面出现 |

（注: [G4-视角7-01] 为 scheduling 多文件证据，计入 scheduling 行。）

## 跨组件一致性问题（共性归类摘要）

> 完整归类（同根因模式聚合 + 涉及组件面 + 修复批次建议）见 owner doc `docs/analysis/ui-review/R2-consistency-audit.md` §共性归类。

1. **disabled / readOnly 门禁通道覆盖缺失**（5 HIGH + 多 MEDIUM）: 禁用态只在"主输入通道"生效，steppers、快捷区间、上传完成/取消、扫码、草稿弹层关闭等次要通道漏接——`presentation.interactive` 门控需要一次全通道审计。
2. **状态已发射、样式零消费**（"死状态"族）: `data-selected`/`aria-pressed`/`data-active`/`data-drop-target`/`--table-selected-bg`/notice-bar 变体 CSS/`data-horizontal:` 族——属性或变量在 DOM 里，但全仓无任何选择器消费；按钮选中态、拖拽悬停、表格行高亮、滚动条几何因此失效。
3. **长内容无滚动/溢出契约**: DrawerBody、桌面 TabsList、markdown 容器、steps/timeline 连接线几何——同族问题在 R5/R6 连续产出新实例，应建立"surface 容器 overflow 契约"规范。
4. **hover-only / 低触点 / 触摸不可达**: gantt 手柄（8-20px hover-only）、kanban 删除钮、附件缩略图移除钮、dashboard 编辑器面板删除钮——触摸设备上不可发现也不可达。
5. **失败/错误静默**: 复制失败零反馈、上传失败条目滞留、pull-refresh 静默回弹、导出错误态已备未渲染、附件超限静默丢弃、原始 `error.message` 直出。
6. **写后界面不同步**: sundial 写库动作后视图零消费、dashboard KPI 恒空、master-detail 空 orderId 落库——"写侧成功、读侧不动"。
7. **键盘等价路径缺失**: 行点击勾选、画布面板移动/缩放、拖拽把手、图标网格 roving、约 100 个惰性 `tabIndex={0}` 停留点。
8. **确认/取消按钮语义与顺序分裂**: `[secondary, primary]` 约定 vs kanban 确认在左、HITL 批准实心在前、sundial 确定/确认三形态。
9. **i18n / 语义色硬编码**: 枚举直出、`'+ 添加列'`、HSL/hex 字面量、浅色假设（`color-mix(..., white)`、固定白色前景）。
10. **空态/加载态标准分裂**: gantt 空 div vs kanban 文案 vs calendar 图标+文案；虚拟化与非虚拟化组件空态双轨。

## 建议的统一设计规范（由共性归类提炼）

1. **全写入通道门禁**: 任何 `disabled`/`readOnly` 字段，其全部写入通道（键盘步进、快捷操作、完成回调、外部动作、关闭丢弃）必须统一经 `presentation.interactive` 门控；草稿态弹层必须有脏态守卫。
2. **状态属性必须有消费方**: 发射 `data-*`/CSS 变量的组件，同 PR 必须有对应选择器消费（或注明消费方所在文件）；新增 CSS 变量禁止"仅 setter"落库（可加 lint：变量名全仓出现次数 = 2）。
3. **surface 滚动契约**: 一切可能超过视口的内容容器（抽屉体、页签栏、markdown、代码块）必须声明 overflow 行为；弹层 body 家族（Dialog/Drawer/Sheet）统一 `min-h-0 + overflow-auto` 基类。
4. **破坏性/不可逆操作确认**: 删除会话、清空、移出等不可逆操作必须有确认层（dialog 或至少 toast 撤销）；确认按钮顺序全仓统一 `[secondary, primary]`。
5. **错误反馈三通道**: 任何可能失败的异步操作（复制、上传、导出、发送、刷新）失败时必须有可见反馈（destructive 语义 + 文案），禁止静默 catch；错误文案走 i18n 错误码管线，禁止直出 `error.message`。
6. **键盘等价**: 所有 pointer-only 交互（拖拽排序、移动、缩放）提供键盘等价路径（方向键步进/roving）；`tabIndex={0}` 只给有键盘行为的元素。
7. **图标/语义映射表**: 删除=Trash2/X、新增=Plus、筛选=ListFilter、展开=Chevron 方向对、排序三态=ArrowUp/Down/UpDown；禁止文本字符（`× ‹ › > − +`）充当图标。
8. **颜色令牌化 + 暗色安全**: 语义色走 `--warning/--success/--danger/--info`；前景色禁止固定白/黑，必须用 `*-foreground` 令牌对；新增硬编码色需注明"有意品牌色"。
9. **触点与可见性**: 行内操作钮用 `size="icon-xs/icon-sm"` 且不隐藏于 hover 之后（或提供 focus-within + 长按等价）；拖拽手柄提供可见 affordance。
10. **空态规范**: 空态 = 图标 + 一句话引导（`regions.empty` 或组件默认文案），非空白 div；同一数据面在虚拟化/非虚拟化两种实现下空态一致。

## 被驳回 / 降级模式复盘

- **驳回: 0**。误报对照 8 条全程规避；dedup §2 已登记缺口 16 项全程未混入发现；维度 09–12 / 全量 WCAG 无越界（scope-conflict 4 条均裁定归属 UX，见 review.md）。
- **降级: 3 条（同根因模式）**: [G3-视角3-01]/[G3-视角3-02]/[G3-视角3-04] MEDIUM→LOW——"无任何焦点指示"与事实不符：元素未声明 `outline-none`，键盘聚焦存在 UA 默认 outline（探针实测）。**校准**: 视角 3 focus ring 类发现必须先排除 UA 默认 outline（沿 [G7-视角3-15] 先例：存在默认指示 → LOW）。
- **证据精度修正 9 处**（不改变判定）: 尺寸/行号/机制细节/失效面宽度的精确化，已落各组复核报告，供 R3 修复时直接采用。

## 对 deep-audit 的依赖

- 无阻断性依赖。以下修复在 deep-audit 对应维度收敛后更彻底，但不妨碍 R3 独立修复: ① [G2-R5-视角4-01] 聚焦首错辅助的失效面修复涉及 `field-frame.tsx`（flux-react 层），建议与 deep-audit 维度 12（field metadata）修复联动；② `data-horizontal:` 族（[G6-R5-视角6-01]）若 Base UI 升级修复发射行为，可整体回归为值选择器，无需逐组件改名。

## 可暂缓项（LOW 87 条）

- [G1-视角9-12] — scope-debug 默认标题与折叠提示为硬编码英文，未走 i18n
- [G1-视角10-13] — 复制失败反馈不一致：json-view 静默失败，text 走 toast.error
- [G1-视角8-14] — page 侧栏拖拽把手无键盘操作路径（role="separator" 不可聚焦）[scope-conflict]
- [G1-视角10-15] — `info` 语义级颜色跨组件不一致：timeline 用 `bg-info` 彩色点，alert/badge/status 均作中性灰处理
- [G2-视角4-03] — select 渲染器三种形态触发控件高度不一致（h-9 / h-8 / h-9）
- [G2-视角4-04] — picker 触发器 placeholder 无弱化样式，清除按钮空值时也常驻（禁用态）
- [G2-视角5-04] — radio-group / checkbox-group 选项源为空时渲染空白，与 select 的空态提示不一致
- [G2-视角7-01] — select 搜索命中高亮使用硬编码 bg-yellow-200/dark:bg-yellow-800，未走设计令牌
- [G2-视角8-01] — array-editor / key-value 行操作按钮 size="sm" 放图标，与 combo/input-table/condition 的 icon-sm 方形规范不一致
- [G2-视角10-02] — array-field 的移除操作用纯文本按钮，偏离复合家族"行级删除 = ghost + Trash2Icon"约定
- [G3-视角3-01] — 表格列宽拖拽手柄可键盘聚焦但无 focus-visible ring
- [G3-视角3-02] — 行拖拽排序手柄可键盘聚焦但无 focus-visible ring
- [G3-视角3-04] — dashboard 编辑画布面板与画布体 tabIndex=0 无 focus-visible ring
- [G3-视角2-01] — dashboard 编辑器头部 Save 主操作用 outline 变体，视觉权重低于模式切换按钮
- [G3-视角4-02] — 表头列搜索输入无清除按钮
- [G3-视角5-06] — 表格空态在虚拟化与非虚拟化路径下布局不一致
- [G3-视角5-07] — dashboard-editor 会话未就绪占位为孤立省略号
- [G3-视角7-02] — 图表标记点默认色硬编码十六进制 '#ef4444'
- [G3-视角9-02] — 面板移除按钮 aria-label 暴露内部 panel id，可读名无意义
- [G3-视角9-04] — 独立 sparkline 组件整体 aria-hidden，趋势信息对读屏完全不可达
- [G3-视角11-01] — dashboard 面板引用未注册类型时渲染空卡片壳，无任何提示
- [G3-视角11-02] — heatmap 单元格无数值提示手段
- [G4-视角4-01] — kanban 搜索输入无清除按钮，与同屏标签筛选器的"清除"能力不对称
- [G4-视角5-02] — countdown 缺少 time/targetTime 配置时静默渲染不可见空元素
- [G4-视角5-03] — kanban 卡片标签/成员溢出计数 "+N" 无任何提示手段，隐藏信息不可恢复
- [G4-视角8-01] — gantt 连线创建/删除命中区 8~20px 且 hover-only，触摸与触控板场景不可发现
- [G4-视角8-02] — kanban 卡片删除按钮 20px 且 hover-only，触摸设备上不可见不可达
- [G4-视角10-01] — Loading 骨架三种实现并存：手写 animate-pulse div、ui Skeleton、手写 border-circle spinner
- [G5-视角1-02] — graph 搜索清除按钮使用文本字符 × 而非 XIcon
- [G5-视角1-03] — 分支切换器 prev/next 使用文本字符 ‹/› 而非 Chevron 图标
- [G5-视角1-05] — ai-voice-input 使用手绘内联 SVG 麦克风而非 lucide MicIcon
- [G5-视角4-02] — ai-sender 字数计数悬浮在 textarea 内容区右下，长文本与计数重叠
- [G5-视角4-03] — 属性面板 number 输入清空即写 0，图元坐标跳零
- [G5-视角5-02] — ai-conversations 空列表无任何提示内容
- [G5-视角6-01] — 工具箱导入弹窗取消按钮 variant=ghost，偏离项目 Dialog 按钮约定（outline）
- [G5-视角7-01] — scada-canvas 运行时错误文案硬编码 #dc2626，同包 editor 同语义用 --nop-danger 令牌
- [G5-视角9-02] — graph 节点键盘不可达（tabIndex/role 均未下发），画布 wrapper 亦无 role="application"
- [G6-视角4-02] — NativeSelect 与 SelectTrigger 的 xs 档高度不一致（24px vs 28px）
- [G6-视角7-01] — Badge success/warning 变体硬编码 emerald/amber 调色板，未使用既有 --success/--warning 令牌
- [G6-视角8-01] — 三个浮层内建关闭按钮留白不一致（Sheet 12px，Dialog/Drawer 8px）
- [G6-视角9-02] — CommandDialog 默认 title/description 硬编码英文，未走 t()
- [G6-视角9-03] — Spinner aria-label="Loading" 硬编码英文
- [G6-视角9-04] — ChartContainer 图表面无 role/aria-label 锚点
- [G6-视角9-05] — 可拖拽 DialogHeader 对 SR 语义暴露为 role="toolbar"
- [G6-视角11-01] — Item size="sm" 与 default 变体类串完全相同，尺寸变体发虚
- [G7-视角3-15] — sundial 全部自定义可点击行无设计系统 focus-visible ring，仅剩浏览器默认描边
- [G7-视角1-16] — 同页术语混用：「垃圾箱」与「垃圾桶」交替出现
- [G7-视角4-17] — tree-crud 过滤状态回显原始 ID（"当前过滤：d1"）而非树节点标签
- [G7-视角1-18] — 子任务区头「chevron-down」为静态装饰，无折叠能力却暗示可折叠
- [G7-视角11-19] — 导航/视图切换高频弹 toast，反馈噪音
- [G2-R2-视角5-02] — 上传失败条目永久滞留列表：无移除钮、无重试，且"清空"按钮仅在存在成功项时渲染，失败行无法消失
- [G2-R2-视角8-01] — 步进类控件点击目标低于 24px 豁免基线：input-time StepperButton 实际 20×20px、input-number stepper 仅 16px 高
- [G2-R2-视角10-01] — 同组两套富文本格式工具栏按钮样式规范不一致：markdown-editor 用 outline/size-8，editor 用 ghost 加描边/h-7
- [G3-R2-视角4-03] — Inspector 数字输入清空即写 0，面板坐标/尺寸瞬间跳零
- [G3-R2-视角8-01] — dashboard 编辑器面板删除按钮 hover-only 且 display:none，触摸设备不可见不可达
- [G3-R2-视角10-01] — 表格单元格 copyable 复制失败零反馈（成功/失败双通道只剩一个）
- [G3-R2-视角10-02] — 树表懒加载 spinner 为包内唯一手写实现，偏离本包统一的 ui Spinner 基线
- [G4-R2-视角1-01] — 里程碑连线的两个 link handle 因缺少 `group` 祖先类永久不可见（与 R1 视角8-01 根因不同）
- [G4-R2-视角3-03] — scheduling 自定义 roving-focus 元素零设计系统 focus 指示，且与 gantt 的 focus ring 双轨并存
- [G4-R2-视角8-01] — gantt 任务条边缘 6px 拖拽缩放热区无任何可见 affordance 与光标提示
- [G5-R2-视角3-04] — graph 缩放按钮到达 min/max 边界后仍可点击，静默无效果且无禁用态
- [G5-R2-视角5-03] — ai-message-list 空消息且未配 emptyState region 时渲染空白面板，无默认提示
- [G5-R2-视角8-01] — 附件缩略图移除按钮 20px 且 hover 才可见（触摸设备不可发现），卡片态移除按钮同为 20px
- [G5-R2-视角9-01] — graph 布局切换按钮以原始枚举值 "flow"/"hierarchy" 作为可见文案，未走 i18n 且与同簇图标按钮语法不一
- [G5-R2-视角9-02] — 编辑器错误兜底直接渲染原始 error.message，未走运行态画布已有的错误码 i18n 管线
- [G5-R2-视角10-01] — ai-feedback 复制失败静默吞掉，与同仓"复制失败必须有反馈"基线不一致
- [G5-R2-视角10-02] — ai-conversations 新建会话按钮（outline）缺 PlusIcon，偏离本仓"新增 = ghost/outline + PlusIcon"基线
- [G6-R2-视角9-02] — Dialog 拖拽说明 sr-only 段落从未被 aria-describedby 引用（同 id 重复渲染两份），对辅助技术永久静默
- [G6-R2-视角10-01] — 列表高亮体系分裂：CommandItem 选中态用 bg-muted/text-foreground，Select/Combobox/Dropdown/ContextMenu 全族用 bg-accent
- [G7-R2-视角5-01] — master-detail 未选择订单时右侧三个数据面以「暂无日志/暂无收货地址/暂无数据」呈现，空态语义与「请选择左侧订单」引导矛盾
- [G3-R3-视角4-03] — 列设置可把所有列逐个隐藏且无最小可见保护：表格坍缩为只剩控制列的空壳，无任何"列已全部隐藏"提示
- [G3-R3-视角8-02] — dashboard 编辑器画布根节点 `touch-none` + `overflow-auto` 并用：触摸设备完全无法滚动画布，视口外面板不可达
- [G4-R3-视角3-01] — gantt 缩放按钮到达最小/最大档位后仍呈可用态，点击静默无效（graph 缩放边界缺陷的同型兄弟实例）
- [G4-R3-视角5-01] — barcode 扫描浮层相机初始化失败（error 相位）无重试入口，且直出原始异常英文 message（map 错误文案同根因的 scheduling 实例）
- [G5-R3-视角11-01] — 流式生成期间用户上滑回看后无"回到底部"入口，hook 已导出 `scrollToBottom` 但消息列表从未消费
- [G7-R3-视角11-02] — form-wizard 确认步「角色」回显原始枚举值 admin/user/guest 而非字典标签
- [G7-R3-视角11-03] — tree-crud 启用 selection 但全页无任何批量动作消费选择集
- [G7-R3-视角11-04] — dashboard「今日订单」KPI 恒为 0（mock createTime 2024-07 与运行时"今天"不匹配）
- [G7-R3-视角7-01] — sundial-workbench 已完成看板「昨天」徽标复用红色 error 语义
- [G7-R3-视角6-01] — workbench 任务详情日期选择器初始选中值（今天）与行内徽标回退值（8/18）不一致
- [G1-R4-视角5-02] — status / mapping 值未命中映射表时渲染空 span：已有值对用户不可见，无原始值回退（countdown 空壳同族新实例）
- [G5-R4-视角3-02] — 编辑会话跨流式锁定：流开始后编辑态"重发"按钮呈可用态但点击被 JS 静默吞掉（铅笔有禁用、提交键没有）
- [G5-R4-视角3-03] — scada 编辑器 `destroyed` 终态零视觉处理：画布区空白但工具箱/图元库/属性面板全套保活，mutator 仍写 working copy 并派发事件
- [G7-R4-视角10-01] — 「选择列表」选项集跨页不一致：todo-dialog 页含"购物"共 4 项，workbench/detail 页均只有 3 项（购物不可选）
- [G7-R4-视角2-01] — workbench 页面唯一主操作「添加待办」渲染为 ghost 透明文本钮：与 todo-dialog 页同入口的 brand 填充钮及企业页"新增"形成主操作权重倒挂
- [G3-R5-视角3-02] — 编辑画布面板的移动/缩放仅指针可操作：role=button 面板无方向键移动、resize 手柄无键盘通道，键盘用户无法执行编辑器的核心操作 [scope-conflict]
- [G5-R5-视角10-01] — region 图层运行时切换 geojson 数据集后视口不重适配：初始装配会 fitView，切换后停留在旧数据集的中心/缩放，新地图大部分在视口外

> LOW 条目均为视觉细节/边缘场景微调，不影响任务完成；建议随同根因 MEDIUM 修复批次顺带处理（各条目的"引根/同族"关系见发现全文）。
