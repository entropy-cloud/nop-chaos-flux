# R2 第 5 轮递归扩展发现（round-05 · G6 收敛确认轮）

> 组号: G6（@nop-chaos/ui 62 非 test 模块） · 轮次: Round 05（递归扩展，收敛确认轮） · 审查日期: 2026-08-28 · agent = general（fresh session） · HEAD `0f183874a`
> 盲区覆盖说明: 前 4 轮已闭合焦点环/i18n/滚动契约/悬空 CSS 变量/aria 关联链五大盲区（G6 趋势 16 → 6 → 1 → 1）。本轮按派发指令对两大残余建议盲区做收敛确认：①表单族受控/非受控切换警告面；②orientation/RTL 方向性。盲区①确认干净（零发现，见"核对过不立案"节）；盲区②检出 1 条新根因——且该根因已被 `flux-renderers-content` 包内注释官方确认为已知问题（仅被局部补偿，未根治）。
> 去重口径: 与 R1–R4 全部 253 条按根因比对，零重复（详见去重自检节）。

---

### [G6-R5-视角6-01] `data-horizontal:`/`data-vertical:` 方向条件类全族失效：Base UI 1.3.0 只发射 `data-orientation="值"`，从不发射 `data-horizontal`/`data-vertical` 存在性属性——ScrollBar 渲染为 0 宽不可见不可拖，Separator/Slider/ToggleGroup 的方向几何全部落空

- **文件**: `packages/ui/src/components/ui/scroll-area.tsx:31-39`（主受害面）；同根因：`separator.tsx:10-13`、`slider.tsx:20,29,32,36`、`toggle-group.tsx:28,47,50,76`、`button-group.tsx:60-75`；官方佐证：`packages/flux-renderers-content/src/styles.css:3-16`
- **证据片段**:
  ```tsx
  // scroll-area.tsx:36 — 垂直滚动条的宽度/高度全部押在失效变体上
  'flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent',
  ```
  ```html
  <!-- @base-ui/react@1.3.0 Separator SSR 实测输出：只有 data-orientation 值属性，无 data-vertical -->
  <div data-orientation="vertical" role="separator" aria-orientation="vertical"></div>
  ```
  ```css
  /* flux-renderers-content/src/styles.css:3-6 — 包内注释官方承认该缺陷并仅做局部补偿 */
  /*   ...(the underlying primitive keys its orientation sizing on data-attributes
       that are not always emitted, so the marker owns the visual contract here
       via the stable aria-orientation). */
  .nop-separator[aria-orientation='vertical'] {
    width: 1px;
    align-self: stretch;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 三段证据链闭合（均经本机实证）：① Tailwind 4.2.2 实测编译 `data-horizontal:w-px` → `.data-horizontal\:w-px[data-horizontal]`（存在性属性选择器）；② `@base-ui/react` 1.3.0 全量枚举其 `*DataAttributes.d.ts` 并对 `esm/` 全树 grep，`"data-horizontal"`/`"data-vertical"` 字面量**零命中**——方向一律以 `data-orientation="horizontal|vertical"` 值属性发射（getStateAttributesProps 只把布尔 state 转存在性属性，`orientation` 是字符串 state）；Separator 经 renderToString 运行时实测证实；③ workspace 无任何 `@custom-variant` 重映射。结果是 5 个模块 16+22 处方向条件类全部永不匹配：**ScrollBar** 的 `w-2.5`（10px 宽）失效 → Base UI 内联定位（top/bottom/insetInlineEnd，已核实 ScrollAreaScrollbar.js:157-175）下宽度收缩至 ~2px padding，垂直滚动条视觉不可见且无拖拽热区（word-editor 6 个面板/对话框、flux-code-editor variable-panel 均消费）；**Separator** 的 `h-px w-full`/`w-px self-stretch` 失效 → 裸用法渲染 0px——playground 运行时被 content 包的 `.nop-separator[aria-orientation]` 补偿 CSS 意外救回（该补偿挂在 ui 组件自带的 `nop-separator` marker 上，随 content styles 全局加载），但补偿与组件分属两包、无契约绑定；**Slider** Track `h-1`/Indicator `h-full` 失效 → 轨道变粗、已选区间填充条高度为 0 不可见；**ToggleGroup** 的 `data-vertical:flex-col` 失效且 `orientation` 在 :28 被解构后未透传给 `ToggleGroupPrimitive`（Base UI 收不到该 prop，键盘导航/aria-orientation 恒为 horizontal）——`orientation="vertical"` 是公开类型 API 上的完全死参数；**ButtonGroupSeparator** 同死。与 [G6-R3-视角6-01]（Drawer resize 死链：变量无消费方）同属"交互供龄/几何链路终点断裂"表现族，但根因不同（彼为 CSS 变量零消费，本为变体选择器指向不存在的 DOM 属性），修复点独立。
- **行业惯例**: shadcn/ui（Base UI 迁移版）的 separator/scroll-area/slider/toggle-group 同类方向条件样式依赖基元实际发射的 data 属性；任何组件库中"宽度/高度/布局随 orientation 切换"是 ScrollArea/Slider/ToggleGroup 的基础契约（Radix ScrollArea 垂直滚动条 `h-full w-2.5` 恒成立；Ant Design 滚动条可拖拽）。类选择器与运行时 DOM 属性名不一致属功能缺陷，非风格取舍。
- **用户影响**: 使用 word-editor 图表/数据集对话框、字段/大纲/片段面板或代码编辑器变量面板的用户：列表可滚轮滚动但**看不到任何滚动条**，也无法用鼠标拖拽滚动条快速跳转（0 宽热区）——长列表只能逐轮滚动；这与本仓其他使用原生滚动/`no-scrollbar` 有意取舍的面板观感分裂。Slider/ToggleGroup 的 vertical 形态则让 schema 作者/宿主传参后渲染与声明完全不符（参数静默失效）。Separator 在脱离 content 包样式的独立 `@nop-chaos/ui` 宿主中渲染为 0px 隐形线（补偿 CSS 不随 ui 包分发）。
- **建议**: 统一改为匹配 Base UI 实际发射的值属性（最小改动、零新增依赖）：`separator.tsx:11`、`scroll-area.tsx:36`、`slider.tsx:20,29,32,36`、`button-group.tsx:70` 的 `data-horizontal:`→`data-[orientation=horizontal]:`、`data-vertical:`→`data-[orientation=vertical]:`；`toggle-group.tsx:50,76` 同改，并将 :28 解构出的 `orientation` 透传回 `<ToggleGroupPrimitive orientation={orientation} {...props}>`（同时修复键盘导航与 aria-orientation）。修复后将 content 包 `styles.css:8-16` 的 `.nop-separator[aria-orientation]` 补偿收敛为防御性或删除（保留亦可，双保险无害），并补两条 DOM 断言测试：垂直 ScrollBar `getComputedStyle().width === '10px'`；`<Separator />` 高度 1px。
- **复核状态**: 未复核

---

## 去重自检（与 R1+R2+R3+R4 全部 253 条按根因比对）

- **[G6-R5-视角6-01] vs [G6-R3-视角6-01]**（Drawer resizable 死链）：同族"交互链路终点断裂"（R3 的 G6 唯一条目），但根因不同——彼为 `--drawer-resize-size` 变量无任何 CSS 消费方；本为 Tailwind 变体选择器（`[data-horizontal]`）与 Base UI 实际 DOM 属性（`data-orientation="…"`）名不匹配。R3 修复（给宽度类接上变量）不覆盖本条；本条修复（改选择器写法）不覆盖 R3。
- **[G6-R5-视角6-01] vs [G6-R2-视角6-01]**（DrawerBody 无滚动契约）：彼为 body 缺 overflow 类，本为滚动条自身几何失效；不同文件不同机制。
- **[G6-R5-视角6-01] vs [G6-视角11-01]**（Item size="sm" 空档）：同属"API 发虚"表现面（ToggleGroup vertical 分支），但彼根因是 cva 两档类串逐字相同，本根因是选择器永不匹配 + prop 未透传，涉及 5 个文件与运行时可见缺陷（ScrollBar），不合并。
- **[G6-R5-视角6-01] vs G1-R4-视角8-01**（timeline 水平轴零宽）：同表现族（元素渲染为零尺寸）跨包实例，机制不同（彼为 flex 收缩无宽度来源，本为 CSS 选择器失配），按 dedup §1 兄弟实例口径分立。
- R4 滚动契约扫描（弹层族 `max-h`/`overflow` 组合）与悬空 CSS 变量双向扫描均未覆盖"data-\* 变体 × 基元发射属性"交叉面，R2-R4 疑点清单零记录，无重复申报风险。

## 转 C2 候选（dedup §2 规则，不计入发现）

无。`direction.tsx` 对 Base UI `DirectionProvider`/`useDirection` 的 re-export 目前包内零消费，属"RTL 能力未接线"，与已登记 16 项缺口（G-A~G-M）同性质，不计入一致性发现，登记供 P 系列规划参考。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- **盲区①表单族受控/非受控切换警告面：零发现**。全目录 grep `useState(props.*)`/`useEffect(→set*)` 镜像模式零命中；逐文件核对 slider/checkbox/switch/toggle/toggle-group/radio-group/combobox/select/tabs/accordion/collapsible/input/textarea/input-otp——全部直接透传 Base UI 原语或原生 input（受控/非受控由 Base UI `value`/`defaultValue` 原生双模支持，无组件级同步逻辑，不存在"切换警告"面）；`sidebar-context.tsx:51-52` 的 `openProp ?? _open` 是正确的受控优先模式（上游 shadcn 同款）；无一处动态增删 value prop 导致 React 受控性告警的代码路径。
- **盲区②RTL 方向性（除上条外）：零发现**。`calendar.tsx:30-31` 的 `rtl:*` 旋转规则、`sidebar-layout.tsx:48` 的 `dir` 透传、`:153` 的 `ltr:/rtl:` 修饰均为上游 shadcn 逐字同款（沿 R2/R3"上游一致不报"先例）；carousel/pagination 的物理方向类同样上游一致；本仓无 RTL 宿主，方向类失配无真实用户影响面。
- **data-\* 变体全量交叉核对**：ui 模块使用的其余变体（data-open/closed/instant/popup-open、data-checked/unchecked/indeterminate、data-highlighted、data-pressed、data-empty、data-active/selected、data-starting/ending-style）逐一在 `@base-ui/react` 的 DataAttributes 声明或 dist 字面量中证实存在（cmdk/react-day-picker/sonner 同理）；死变体仅 data-horizontal/data-vertical 一族，已立案。
- `field.tsx:126` `group-has-data-horizontal/field:` 变体：FieldFieldset 自产 `data-horizontal` 布尔属性（field.tsx 内 set+consume 闭环），非 Base UI 依赖，链路完整，不涉本条。
- Separator 裸用法在 playground 中不可见的表象被 content 包补偿 CSS 掩盖——该掩盖关系本身即 [G6-R5-视角6-01] 现状段的一部分，不另立"补偿缺失"条目。

## 检查范围

- **目标**: `packages/ui/src/components/ui/` 62/62 非 test 模块（与 R1–R4 同口径），收敛确认重点 = 派发指令指定的两大残余盲区：①表单族受控/非受控切换；②orientation/RTL 方向性。
- **逐文件核对**: direction、sidebar-context、slider、checkbox、switch、toggle-group、toggle、pagination、carousel、input、textarea、combobox、input-otp、separator、scroll-area、button-group（盲区全量）；其余 47 模块经 data-\* 变体全量 grep + 受控/非受控模式 grep 定向复核（零命中归档）。
- **消费链交叉核实**: `@base-ui/react@1.3.0` esm 全树（Separator/SliderRoot/ToggleGroup/ScrollArea 各 DataAttributes 声明 + getStateAttributesProps + ScrollAreaScrollbar 内联样式段）；Separator/ToggleGroup/Slider SSR 运行时输出实测；Tailwind 4.2.2 compile 实测（data-horizontal: 编译产物）；`.nop-separator`/`nop-scroll-area` 补偿 CSS 全仓反查；Separator/ScrollArea/ToggleGroup/Slider 全仓消费方枚举（spreadsheet-toolbar ×10、crud-renderer、word-editor ×6、flux-code-editor、scada toolbox ×6、word-editor toolbar、ui 内部 SidebarSeparator/ItemSeparator/FieldSeparator/ButtonGroupSeparator）。

## 检查方法

1. **受控/非受控盲区**：`useState(props.*)`/`useEffect(→setState)` 镜像模式全量 grep → 零命中后对全部含 value/checked/open 语义 prop 的模块逐个通读，确认无组件级同步逻辑、无受控性动态切换路径。
2. **方向性盲区**：以 `direction.tsx` 为起点反查 `useDirection`/`dir` 消费链 → 再以 `data-vertical/data-horizontal` 变体清单为线索，对每个变体三段实证：Tailwind 编译产物（build API 实测选择器形态）× Base UI dist 属性枚举（DataAttributes.d.ts 全量 + esm 字面量 grep）× SSR 渲染实测 DOM——三者交叉判定变体死活，并全仓枚举受害组件的生产消费方定级。
3. **去重**：新发现与 253 条逐根因比对（重点 G6 组 24 条），并核对 R2-R4 "核对过不立案"清单确认该交叉面未被前轮覆盖。

## 结论

新发现 **1 条**（HIGH 0 / MEDIUM 1 / LOW 0）。R1–R5 G6 组累计 16+6+1+1+1 = **25 条**；全审累计 253 + 1 = **254 条**。G6 收敛趋势：16 → 6 → 1 → 1 → 1。两大残余建议盲区之一（受控/非受控）经全量核对确认干净；另一（方向性）产出的唯一新根因具备跨包注释级佐证与三段运行时实证，非机械重复。G6 组在既有方法面（焦点环/滚动契约/悬空变量/aria 链/受控性/方向性）均已闭合，**建议 G6 组审查收敛**——继续递归预计只能产生低于价值门槛的零散细节。
