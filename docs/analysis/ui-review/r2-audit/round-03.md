# R2 第 3 轮递归扩展发现（round-03）

> 轮次: Round 03（递归扩展） · 审查日期: 2026-08-28 · HEAD `0f183874a`
> 派发机制: opencode `task` / general × 7（fresh session）；提示词 = `dispatch-shared-prefix.md` + `dispatch-recursive-extension.md`（含 round-01/02 全文读取指令；累积发现文本已超 2000 行，**第 4 轮起按 skill 上下文管理节启用压缩摘要策略**）
> session 证据链: G1 ses_fb765f547ffe51ZB2BEVQbTAJb · G2 ses_fb765ddbeffek47LI45tc52RWe · G3 ses_fb765c8bcffe1HrYZ9CHYn5utJ · G4 ses_fb765b2f2ffenB30QBNWPZ1vwL · G5 ses_fb7659807ffeUlPwCUGuQ0mlrl · G6 ses_fb7657fd3ffeCf3x4D3h27lIVk · G7 ses_fb758fbb5ffeQx0hNw5tJBkMnO
> 主 agent 完整性检查: 34/34 条通过六要素程序化校验
> 主 agent 轮间去重校验: 与 R1+R2 共 190 条逐根因比对——**零完全重复**；同根因新实例（保留独立条目、打共性标记，复核阶段合并裁定）：[G2-R3-视角3-01]←[G2-R2-视角3-01]（disabled 门禁绕过族）、[G3-R3] draggable 列错位←[G3-视角5-01]（快速编辑保存条列错位同根因）、[G4-R3] 缩放边界无禁用←[G5-R2-视角3-04]（graph 缩放边界同根因）、[G4-R3] 裸 error message←[G5-R2-视角5-02]（map 同根因）、[G7-R3-视角4-01]←[G7-R2-视角4-01]（筛选无 clearable 锁死）；各组文件内去重自检记录已随文落盘

## 覆盖率与发现汇总

| 组  | 目标                                 | 发现                               | 覆盖与口径                                                                                                                                                                                                                              | session                                                                                                                            |
| --- | ------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| G1  | basic / content / layout             | HIGH 0 / MEDIUM 2 / LOW 0，共 2 条 | 三包非 test 文件全覆盖复核；兄弟实例 grep 先行（除已报外零新命中）+ UI 承载文件逐个通读 + 组合场景走查（tabs×表格/slider、wizard×表单×导航、page×Sheet、image×preview）。                                                               | ses_fb765f547ffe51ZB2BEVQbTAJb                                                                                                     |
| G2  | form / form-advanced                 | HIGH 1 / MEDIUM 2 / LOW 0，共 3 条 | 两包 114 个非 test 文件定向深挖；6 组兄弟实例 grep 全扫 + 组合与边缘态逐控件核对 + 响应式同包 useIsMobile 基线比对；2 项同根因并入去重备忘、1 项归 G-H 转 C2。                                                                          | ses_fb765ddbeffek47LI45tc52RWe                                                                                                     |
| G3  | data / dashboard / pivot             | HIGH 2 / MEDIUM 3 / LOW 2，共 7 条 | 21 个 data UI 承载文件逐行精读 + 组合专项（header/colgroup/body 列契约、selection 数据基准）+ 边缘态与响应式触摸；关键结论经 @base-ui/react 1.3.0 RadioRoot 源码核实；1 条标注 [G3-视角5-01] 同根因兄弟实例。                           | ses_fb765c8bcffe1HrYZ9CHYn5utJ                                                                                                     |
| G4  | mobile / scheduling                  | HIGH 0 / MEDIUM 6 / LOW 2，共 8 条 | calendar×dialog、kanban×拖拽+批量、gantt×缩放+滚动 组合精读 + 边缘态 + 响应式兄弟实例 grep；关键结论以 locale 表、theme-tokens 令牌值、tailwind-preset 映射交叉核实；graph 缩放边界、map 裸 error 等 2 处按同根因新实例上报并互相引用。 | ses_fb765b2f2ffenB30QBNWPZ1vwL                                                                                                     |
| G5  | ai / graph / map / industrial+editor | HIGH 0 / MEDIUM 4 / LOW 1，共 5 条 | 跨组件组合聚焦（ai-chat×sender×attachments×feedback 嵌套会话、editor×inspector×toolbox×palette 联动）+ 兄弟实例 + 边缘态 + 响应式；全仓 CSS/属性消费 grep；静态口径声明沿 R1/R2；另 2 项转 C2 候选、7 项经真实用户影响检验弃报留档。    | ses_fb7659807ffeUlPwCUGuQ0mlrl                                                                                                     |
| G6  | @nop-chaos/ui 62 模块                | HIGH 1 / MEDIUM 0 / LOW 0，共 1 条 | 62/62 全覆盖（32 个 UI 组件全文逐行重读 + 30 个已深查文件定向 grep 归档）；悬空 CSS 变量全量反查零命中；唯一新高价值发现经 3 组 grep 证实死链。                                                                                         | ses_fb7657fd3ffeCf3x4D3h27lIVk                                                                                                     |
| G7  | playground 19 页                     | HIGH 0 / MEDIUM 3 / LOW 5，共 8 条 | 19/19 schema 全量通读（sundial 5 页视角 11/12 复读）；渲染器能力与 mock 运行时经 showcase-env/mock-backend/渲染器源码交叉核实；4 条为已立根因的新实例（均已标注），无完全重复。                                                         | ses_fb758fbb5ffeQx0hNw5tJBkMnO（首派 ses_fb76560deffeuck6m4Xy1j9Lpp 因速率限制失败，按 Failure Path audit-subagent 重试 1 次成功） |

汇总: HIGH 4 / MEDIUM 20 / LOW 10，共 **34 条**。累积（R1+R2+R3）: **224 条**（HIGH 13 / MEDIUM 134 / LOW 77）。收敛趋势: 127 → 63 → 34。

---

## G1 — basic / content / layout（HIGH 0 / MEDIUM 2 / LOW 0，共 2 条）

### [G1-R3-视角3-01] wizard 提交锁定期"上一步"与步骤导航按钮无禁用视觉，点击静默无效——同栏 next 却正确禁用

- **文件**: `packages/flux-renderers-layout/src/wizard-renderer.tsx:572-583,278,315`；`packages/flux-renderers-layout/src/wizard-step-nav.tsx:77-83`
- **证据片段**:
  ```tsx
  // wizard-renderer.tsx:572-579 —— prev 按钮只看 canGoPrev，无 committing 条件
  <Button
    type="button"
    variant="outline"
    size="sm"
    data-testid="wizard-prev"
    data-slot="wizard-prev-button"
    onClick={goPrev}
    disabled={!canGoPrev}            // 提交中仍为 false → 按钮保持可用外观
  >
  ```
  ```tsx
  // wizard-renderer.tsx:314-316 —— 点击后 JS 层静默 return（P1-03 有意锁）
  const goPrev = (): Promise<void> => {
    if (lifecycle.committing) return Promise.resolve();
  // wizard-step-nav.tsx:77 —— 步骤导航可点性同样不考虑 committing
  const clickable = reachable && !isActive && !isStepDisabled(step);
  ```
- **严重程度**: MEDIUM
- **现状**: `commitStep` 期间（表单校验 + 远端 step-commit 动作，弱网可达数秒）导航锁是既定设计（`wizard-commit-navigation-lock.test.tsx:121-122` 明确断言 "Prev must be locked while committing"），`goToStep`/`goPrev` 均 guard 静默 return。但视觉层只有 next 按钮反映了锁（`disabled={lifecycle.committing}` + "提交中"文案，:591-593）："上一步"按钮与全部步骤导航项（WizardStepNavItem）保持完整可用外观（无 opacity、无 disabled、hover 反馈照常）。点击后 JS 吞掉、界面零反应。同一动作条内两套状态语言：next 明确告知"锁了"，prev/nav 装作可点。
- **行业惯例**: Ant Design Steps/分步表单在异步步进提交期间禁用全部导航入口（含步骤条点击）；shadcn/ui 生态 pending 态惯例是禁用同一操作区的竞争动作（本仓 next 按钮即正确基线）。同一交互组内"一个禁用一个可点但点了没反应"被普遍视为状态指示缺陷。
- **用户影响**: 提交耗时的向导（典型：每步保存远端）里，用户点"上一步"想回头改前一屏内容——按钮看起来正常，点击毫无反应，反复点击仍无反馈，只能等 next 按钮从"提交中"恢复才知道刚才处于锁定；步骤条点击同理。"看起来能点、点了没反应"是可复现的交互困惑，且发生在向导主路径。
- **建议**: ① prev 按钮：`disabled={!canGoPrev || lifecycle.committing}`（一行改动，复用 ui Button 既有 `disabled:opacity-50 disabled:pointer-events-none` 基类）；② WizardStepNavItem 增加 `committing` 入参并纳入可点性：`const clickable = reachable && !isActive && !isStepDisabled(step) && !committing;`（Button `disabled={!clickable && !isActive || committing}`），使步骤条与 next 同步进入禁用视觉；配套在 `wizard-commit-navigation-lock.test.tsx` 补 `wizard-prev` 的 disabled 断言。
- **复核状态**: 未复核

---

### [G1-R3-视角8-01] tabs 移动端滑动手势未排除嵌套横向滚动/拖拽目标：表格横滑、滑块拖动约 50px 即被劫持为切换页签

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:30-31,280-318,431-452`
- **证据片段**:
  ```tsx
  const TABS_SWIPE_THRESHOLD = 50;          // :30 —— 无任何目标排除
  // :292-303 —— touchend 只要横向位移达阈值即切页签
  const handleSwipeEnd = (clientX: number) => {
    ...
    const deltaX = clientX - state.startX;
    swipeStateRef.current = null;
    if (Math.abs(deltaX) < TABS_SWIPE_THRESHOLD) {
      return;
    }
    const nextIndex = deltaX < 0 ? activeIndex + 1 : activeIndex - 1;
  ```
  ```tsx
  // :431-451 —— wrapper 裸包全部 panels，无 touch-action、无嵌套滚动/交互目标检查
  <div
    data-slot="tabs-panels-swipe"
    onTouchStart={(event) => { ... swipeStateRef.current = { startX, startY, tracking: true }; }}
    onTouchMove={(event) => { ... }}
    onTouchEnd={(event) => { ... }}
  >
    {tabsPanels}
  </div>
  ```
- **严重程度**: MEDIUM
- **现状**: 移动端（`useIsMobile()`）时 swipe wrapper 包住全部 tab 面板，touch 事件从面板内容冒泡到 wrapper；手势判定只有 50px 阈值 + "纵向位移主导才取消"（:287-289），没有排除任何嵌套目标：① tabs 内嵌横向滚动表格（`overflow-x-auto`，master-detail 详情 tabs 即此形态）时，用户横向滑动表格查看右侧列，原生滚动与手势追踪同时进行，位移过 50px 后松手 → 页签被突然切换，用户上下文丢失；② 拖动面板内 ui Slider / input[type=range] 的滑块（水平拖拽手势）同样会在拖动 ~50px 后触发切页；③ 从交互控件（按钮/链接）起手的滑动也无排除。同仓 `carousel.tsx` 用 embla 的手势引擎处理滑动（尊重嵌套滚动边界），tabs 手写 tracker 无此类保护——同仓两套移动端横滑实现健壮性不一致。现有测试仅覆盖裸面板滑动（`tabs-responsive.test.tsx:81-137`），无嵌套滚动用例。
- **行业惯例**: Vant Tabs `swipeable` / Ant Design Mobile Tabs 对嵌套原生滚动区域做目标排除与 touch-action 处理，横向滚动内容区不触发切页；swiper/embla 生态默认尊重嵌套可滚动子元素。手势切换不得劫持内容区自身的横向滚动是移动端 Tab 组件的基线要求。
- **用户影响**: 手机上使用 tabs+宽表格页面（本仓库演示页的旗舰组合）时，用户横滑表格想看"操作"列，滑到一半整个面板被切换到隔壁页签——内容突变、滚动位置丢失，需切回并重新滚动；滑块场景下调节数值时页签跳走，操作被截断。触屏高频路径上可复现。
- **建议**: ① 最小修复：`onTouchStart` 记录 `event.target`，`handleSwipeEnd` 切页前检查 `(target as HTMLElement).closest('[data-slot="table-container"], [role="slider"], input[type="range"], [data-slot="slider"], [data-slot="carousel"]')` 命中则放弃切换；② 或在 touchmove 阶段检测 `deltaX` 与面板内首个可横向滚动祖先的 `scrollLeft` 变化，滚动发生时置 `tracking = false`（与既有纵向取消分支同构）；③ 中期可复用 carousel 的 embla 实例做受控 swipe，获得与 carousel.tsx 一致的嵌套滚动兼容。修复后补一条"表格内滑动不切页"的 fireEvents 用例。
- **复核状态**: 未复核

---

## 检查范围

- **目标**: `packages/flux-renderers-basic/src/`、`packages/flux-renderers-content/src/`、`packages/flux-renderers-layout/src/` 全部非 test 文件（`*.test.*`、`test-support*`、`*.test-support.*` 不入审），与 R1/R2 同口径。
- **前轮已报条目不重复**: R1 G1 15 条（button variant/href、button-group 选中态、image/markdown loading、dynamic/markdown 错误态、carousel 指示点、diff-header 文本箭头、bg-gray-50、progress oklch、text maxLineToggle、wizard committing 无 Spinner、scope-debug i18n、json-view 复制、page resize 键盘、info 色）+ R2 G1 6 条（button href chrome、collapse disabled、button active、媒体族错误态、steps 连接线、diff-view 响应式）。
- **本轮逐文件复核**: basic — button.tsx（全文含 countDown/tooltip/锚点）、page.tsx（aside/移动端 Sheet/fixed footer）、tabs.tsx、text.tsx、badge.tsx、icon.tsx、container.tsx、flex.tsx、dynamic-renderer.tsx（现状复核）、loop/structural-loop/recurse/fragment/reaction/utils/status-hooks/interaction-owner/copy-to-clipboard/use-fixed-footer-visual-viewport/use-surface-renderer（grep 确认零 UI 面）；content — alert-renderer.tsx、audio.tsx、video.tsx、image.tsx、markdown.tsx、json-view.tsx、qrcode（R2 已报，现状核对）、carousel.tsx、card.tsx、cards-renderer.tsx、empty.tsx、status.tsx、mapping.tsx、html.tsx、progress.tsx、link.tsx、separator.tsx、spinner.tsx、styles.css、diff-view（header/file-list/hunk/line/gutter/unified/three-column/split 全组件 + diff-view.css 消费核对）；layout — wizard-renderer.tsx（全文）、wizard-step-nav.tsx、wizard-step-body.tsx、wizard-step-helpers.ts、steps-renderer.tsx（全文）、collapse-renderer.tsx（全文）、timeline-renderer.tsx（全文）、button-group（R1 已报）、dropdown-button-renderer.tsx、grid-renderer.tsx、responsive-renderer.tsx、styles.css。

## 检查方法

- **兄弟实例 grep 先行**: 调色板类/裸 hex、文本字符图标（↑↓‹›×✕&times;）、硬编码英文 aria/title/placeholder、`tabIndex`/`focus-visible`、`data-*` 状态属性 → 逐命中定位确认；四条 grep 除已报条目外零新命中。
- **逐文件通读**: 三包 UI 承载组件全部通读，重点按盲区清单核对每个可交互元素的 disabled/hover/focus/selected/active 态视觉、每个异步路径的 loading/error 呈现、每个列表/容器的空态兜底。
- **组合场景走查**: tabs×表格/slider、wizard×表单校验×导航、page×aside×Sheet、image×preview dialog、cards×selection×键盘、diff×文件列表×冲突导航。
- **测试基线交叉核对**: `tabs-responsive.test.tsx`（swipe 无嵌套滚动用例）、`wizard-commit-navigation-lock.test.tsx`（锁行为有意、断言仅覆盖 JS guard）、`page-responsive.test.tsx`、`button-count-down.test.tsx`，确认两条发现均处于"行为已实现/锁定、状态指示或组合边界缺失"的盲区。
- **全仓 CSS 消费核对**: diff-view.css 状态类（flash/conflict/clickable/hunk）、layout/content styles.css 全文，排除"属性无消费方"类误报。

## 转移与归属说明

- **`[scope-conflict]` 条目**: 无。两条发现均以用户可见交互/状态指示为主影响归属。
- **转 C2 候选（dedup §2，不计入发现）**: 无。本轮未撞见已登记 16 项能力缺口的新表象。

## 明确核对过且不构成发现的疑点（防复核重复提问）

- dropdown-button 空 items 渲染空菜单、tabs 空 items 渲染空 TabsList——纯配置错误边缘（无动态绑定主路径），未达真实用户影响门槛。
- diff-file-list 文件名 240px 侧栏内截断无 title——可通过点击（header 回显全名）与搜索框恢复，弱于误报 #5 例外门槛（对照 [G4-视角5-03] 的"不可恢复"要件）。
- image preview Dialog 无 DialogTitle——R1 视角 6 已核对通过；主要影响属维度 20（全量 WCAG）范围。
- 可点击 image/flex/container/collapse trigger/diff 行的键盘焦点为 UA 默认 outline（均未 suppress）——沿 R2 "存在默认指示 → LOW 低于报告门槛"（[G7-视角3-15]）先例。
- page remark info 图标 16px 触发热区——tooltip 触发器（非操作按钮），Ant Design QuestionCircle 14px 同款行业惯例。
- cards `columns` 数字档不随断点收缩——styling-system.rs Decision B 既定裁决（responsiveColumns 对象为声明通道）。
- badge 空文本渲染空 pill——schema 作者显式通道缺失属配置边缘，未达门槛。
- carousel 指示点无 aria-current（有 data-active + aria-label）——视觉态在位，AT 细节属维度 20。
- timeline 水平模式 `overflow-x: auto` 与 `flex-1` 压缩——标题可换行、语义可达，无阻断。
- steps 任意未禁用步骤可点击跳转——steps 无 linear 契约，点击即 onChange 为既定行为（wizard 才有 linear/allowStepJump 模型）。

## G2 — form / form-advanced（HIGH 1 / MEDIUM 2 / LOW 0，共 3 条）

### [G2-R3-视角3-01] period 家族（month/quarter/year）快捷区间按钮不接 disabled 门禁：灰显锁定字段仍可被改值并随提交持久化

- **文件**: `packages/flux-renderers-form/src/renderers/period-renderers.tsx:230-244`（对照同文件 `:245` 清除按钮、`:143-149` applyShortcut、`field-utils/field-handlers.tsx:87-91`）
- **证据片段**:
  ```tsx
  // period-renderers.tsx:231-243 — 快捷按钮无 disabled、无 interactive 判定
  {shortcuts.map((shortcut) => (
    <Button
      key={shortcut.label}
      type="button"
      variant="outline"
      size="sm"
      data-testid={`period-shortcut-${kind}`}
      onClick={() => applyShortcut(shortcut)}     // applyShortcut → commitSingle/commitRange → handlers.onChange
    >
      {shortcut.label}
    </Button>
  ))}
  // :245 — 同一组件内清除按钮却正确检查了 interactive：
  {clearable && hasValue && interactive ? (
  ```
  ```ts
  // field-handlers.tsx:87-91 — onChange 仅拦截 readOnly，不拦截 disabled
  onChange(nextValue: unknown) {
    if (readOnly) {
      return;
    }
  ```
- **严重程度**: HIGH
- **现状**: period 三个渲染器（input-month/input-quarter/input-year）的 `shortcuts` 快捷区间按钮没有任何 `disabled={!interactive}` 也没有 `presentation.interactive` 守卫；`applyShortcut → commitSingle/commitRange → handlers.onChange` 链路中 onChange 只拦 `readOnly`（field-handlers.tsx:88-90），`disabled` 直接放行写入表单状态。`disabled: true` 的 period 字段：三个 period 输入框（Input/NativeSelect，`:305/:328/:361/:381` 均传 `disabled={!interactive}`）灰显锁定，但旁边的快捷按钮照常可点，点击即改写"已锁定"字段的值——字段以灰显（禁用）外观展示着一个被静默改掉的值，并随表单提交持久化。同组件内清除按钮（`:245`）与全部输入控件都正确消费了 interactive，唯独快捷按钮漏接，说明该门禁是本组件既有契约而非未实现能力。本轮已核实 quarter 的年份输入变更（`:370-377`）走同一 `onChange(undefined/组合值)` 路径——快捷按钮是 period 唯一的绕过通道。与 round-02 [G2-R2-视角3-01]（input-time steppers 绕过 disabled，HIGH）同根因的兄弟实例，按递归指令"修一处必须查全类"上报；区别于该条：readOnly 通道在 handlers 层已被拦截，本条实际绕过面为 disabled 通道，period 快捷按钮从未接线。
- **行业惯例**: Ant Design 禁用表单控件的全部交互入口（输入、快捷项、清除）统一阻断；shadcn/ui 生态由原生 `disabled` + 基类禁用样式保证。次要交互通道（快捷预设）不得绕过主控件的禁用态——与 [G2-R2-视角3-01] 引用的同一基线一致。
- **用户影响**: 只读/无权限表单里的月份、季度、年份字段（带快捷区间配置）灰显呈现，用户点击"本月/本季度"等快捷按钮后字段值在灰显状态下被改写并随提交落库——权限边界在 UI 层被无声击穿；按钮外观与可用态完全相同，禁用语义零提示。判定说明：与 R2 同类条目同理，配置面（period + shortcuts + disabled）较窄，但后果是静默数据变更，维持 HIGH。
- **建议**: `<Button ... disabled={!interactive} onClick={() => interactive && applyShortcut(shortcut)}>`（快捷按钮补 disabled 透传 + 双重守卫，样式与 ui Button 基类 `disabled:opacity-50` 自动生效）；并在 `applyShortcut` 入口补 `if (!interactive) return;`（对齐 input-number 的双层模式）；同时为三个 period 输入容器补 `aria-disabled`/`data-disabled`（沿 R2 同类条目的修复建议）。
- **复核状态**: 未复核

---

### [G2-R3-视角3-02] editor（富文本）运行时转 disabled 后可编辑态被同步效应错误恢复：同步条件漏算 disabled，"已禁用"字段仍可继续输入并提交

- **文件**: `packages/flux-renderers-form-advanced/src/editor-renderer.tsx:256,293,328-334`（对照 `:392` `data-readonly` 与 `:395` 工具栏门控均用合并后的 `readOnly`）
- **证据片段**:
  ```tsx
  // :256 — 挂载与 UI 门控用的是合并口径（readOnly ∥ !interactive，即含 disabled）
  const readOnly = presentation.readOnly || !presentation.interactive;
  // :293 — 初始可编辑态正确
  editable: !readOnly,
  ...
  // :328-334 — 运行时同步却只比对 presentation.readOnly，漏掉 disabled
  useEffect(() => {
    if (!editor) {
      return;
    }
    if (presentation.readOnly !== editor.isEditable) {
      editor.setEditable(!presentation.readOnly);
    }
  ```
- **严重程度**: MEDIUM
- **现状**: 组件内存在两套"锁定"口径：`:256` 合并口径（含 disabled，用于初始 `editable`、工具栏显隐 `:395`、`data-readonly` `:392`），而值同步 effect（`:332-334`）只比对 `presentation.readOnly`。当字段经表达式在运行时从可用转为 `disabled`（复杂表单级联禁用是该包公开用法）时：`presentation.readOnly` 仍为 false、`editor.isEditable` 为 true → 判不等 → `setEditable(!presentation.readOnly)` = `setEditable(true)`，把本应锁定的编辑器重新打开并停留在此状态；此后 contenteditable 无任何置灰视觉（root 仅有 `data-readonly`，此时不落值），用户可继续输入并随提交持久化。静态 disabled 挂载（初始即禁用）不受影响（isEditable=false 与 readOnly=false 判等，no-op），缺陷仅在"可用 → disabled"运行时迁移路径显现。与 [G2-R3-视角3-01]/round-02 [G2-R2-视角3-01] 同属"disabled 门禁在次要通道失效"根因族，但机制不同（门禁条件收窄导致的状态回写，而非通道未接线），且 R2 该条核查范围为 input-time/input-number，editor 未在核查面内。
- **行业惯例**: Ant Design / MUI 禁用富文本控件在 disabled 生效时立即阻断输入并置灰，不因任何状态同步路径回退；单一锁定口径（disabled 状态源）驱动全部可编辑性判断是表单控件基线。
- **用户影响**: 表单联动把富文本字段置为禁用后，输入框类字段全部灰显，唯富文本框光标仍可聚焦输入——用户以为仍在填写有效字段，提交时内容被带上；与相邻字段的锁定状态自相矛盾，权限/级联场景下产生静默数据变更。
- **建议**: `:332-334` 同步条件改用合并口径并与 `:256` 单一状态源对齐：`if (readOnly !== editor.isEditable) { editor.setEditable(!readOnly); }`（依赖数组同步加入 `readOnly`）；可补一条运行时 disabled 迁移的回归测试（`setProps` 级联后断言 `editor.isEditable === false`）。
- **复核状态**: 未复核

---

### [G2-R3-视角4-01] editor 链接动作：取消（dismiss）prompt 反而移除已有链接 + 依赖原生 window.prompt，非白名单 scheme 静默忽略

- **文件**: `packages/flux-renderers-form-advanced/src/editor-renderer.tsx:108-122`
- **证据片段**:
  ```tsx
  link: {
    id: 'link',
    label: '🔗',
    isActive: (e) => e.isActive('link'),
    canRun: () => true,
    run: (e) => {
      const url = typeof window !== 'undefined' ? window.prompt(t('flux.editor.linkPrompt')) : null;
      if (url === null) {
        // Prompt dismissed → remove the link on the current range.
        e.chain().focus().extendMarkRange('link').unsetLink().run();
      } else if (isSafeLinkUrl(url)) {
        e.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
      }
      // Unsafe scheme (javascript:/data:/vbscript:) → ignored; nothing is set.
    },
  },
  ```
- **严重程度**: MEDIUM
- **现状**: 富文本工具栏的链接动作存在三重交互缺陷：① **取消即破坏**——`window.prompt` 返回 null（用户点"取消"或按 Esc）时执行 `unsetLink()`，把选区上已有的超链接直接移除。取消的普遍语义是"我改主意了、什么都不做"，此处却产生破坏性副作用：用户打开链接对话框只想查看/放弃编辑，取消后链接静默丢失（仅可靠工具栏 undo 找回，且无任何提示）。② **原生 prompt 承载输入**——URL 输入用阻塞式浏览器原生对话框，与本项目 Dialog/Popover 体系（同包 picker-dropdown 的链接类输入均走 Dialog）及宿主主题完全脱节，且 prompt 无法校验、无法展示当前值。③ **非法 scheme 静默忽略**——输入 `javascript:`/`ftp:` 等非白名单 URL 时既不设置也不提示（`:121` 注释确认"ignored"），用户点确定后毫无反应，无法区分"设置成功"与"被拒绝"，属"非法输入静默失败无反馈"已知根因（round-01 [G2-视角5-02]、round-02 [G3-R2-视角4-03] 同族）在本组件的实例。同文件工具栏其余 11 个动作均为纯 tiptap 命令、无此问题。
- **行业惯例**: 主流富文本编辑器（Tiptap 官方示例、Notion、Confluence）的链接编辑走 Popover/Dialog 内嵌输入框，预填当前 href，取消为纯 no-op；安全校验拒绝时给出内联错误提示。原生 `window.prompt` 在任何现代组件库中均不作为产品输入通道。
- **用户影响**: 用户编辑带链接的正文：想改链接 → 打开输入框 → 反悔点取消 → 链接没了（且无提示）；想粘贴 `ftp://` 内网地址 → 点确定 → 毫无反应，反复重试。两个方向都落在"操作结果与预期相反/无反馈"的交互障碍上；富文本是复合表单高频字段。
- **建议**: ① 取消分支改为纯返回（删除 `unsetLink()` 调用；若需保留"清空输入即移除链接"能力，应以显式空串提交为信号而非 dismiss）；② 用 ui `Popover` + `Input`（预填 `editor.getAttributes('link').href`，确认/取消双钮，沿 `styling-system.md` Dialog 按钮约定）替换 `window.prompt`；③ `isSafeLinkUrl` 失败分支在输入框下方渲染 `text-xs text-destructive` 提示（i18n 键可新增 `flux.editor.linkRejected`），替代静默忽略。
- **复核状态**: 未复核

---

## 去重自检（与全部 190 条按根因比对）

- **[G2-R3-视角3-01]** vs round-02 [G2-R2-视角3-01]（input-time steppers 绕过 disabled）：同根因（次要通道未接 disabled 门禁）的兄弟实例。R2 明确其核查范围为 input-time steppers 分支并预留"input-number 已有门禁"的备忘；period 家族从未进入该核查面，且 readOnly 通道行为不同（本条 disabled-only），修复点独立，故按递归指令第 2/4 条保留为新条目。
- **[G2-R3-视角3-02]** vs 上述同根因族：机制不同（同步条件漏算 disabled 导致可编辑态被回写，非通道未接线），且发生在"运行时状态迁移"场景，前轮未覆盖 editor，保留为新条目。
- **[G2-R3-视角4-01]**：`window.prompt` + 取消破坏链接 + scheme 静默忽略在 R1/R2 均无先例；其第③重缺陷与 [G2-视角5-02]/[G3-R2-视角4-03] 同根因（非法输入静默），已在条目内标注随主缺陷一并呈现，不另立条目。
- 其余深挖命中但同根因/低价值项未另立条目，见下方"去重备忘"。

## 去重备忘（同根因合并项，不另立条目；供汇总/修复阶段归并）

1. **select 移动端 sheet 选项行为孤儿 role="option"**（`select-mobile-renderer.tsx:211-214` 选项容器 `data-slot="select-mobile-options"` 为无 role 的普通 div，而 `:62` 选项行携带 `role="option"`）——与 round-01 [G2-视角9-01]（picker 容器声明 listbox 而子项无 option）互为镜像半边，同属"自定义选择器 listbox/option 配对断裂"根因；修复 [G2-视角9-01] 时应一并给该容器补 `role="listbox"` + `aria-multiselectable={multiple||undefined}`。孤儿 option 在部分读屏下会被移出可达树，实际影响较 picker 侧轻，故不单独立条。
2. **condition-group 达 maxItemsPerGroup 后直接隐藏新增按钮**（`condition-group.tsx:411-424` `{!atMaxItems && ...}`）——与 round-02 [G2-R2-视角4-02]（composite 家族 maxItems 静默禁用无计数）同根因（上限静默、无 n/max 反馈），隐藏比置灰更不可解释；修复该条时应把 condition-group 的隐藏分支并入同一"maxItems 计数 + 说明"批次。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

1. **G-H（移动端适配能力）表象**：`transfer-renderer.tsx:258` 固定 `grid-cols-[1fr_auto_1fr]` 双面板网格无任何窄容器/移动适配（同包 tree-controls.tsx:252/376/435、form 包 select/checkbox-group 均已用 `useIsMobile` 切 Sheet/堆叠）。375px 视口下两 pane 各约 160px，功能可用但明显局促；因"移动端形态"属 G-H 已登记能力缺口范畴（沿 round-02 G7 将"无断点处理"归 G-H 表象的先例），不作为一致性发现登记，仅提示：若 P 系列落地移动适配原语，transfer 是 form-advanced 包内除 picker 外最需要的消费方。
2. **G-H 表象（顺带核对，不立案）**：input-table 已有 `overflow-x-auto` 包裹（`input-table-renderer.tsx:341`）、condition-item 单行四控件无换行断点——前者已有横向滚动兜底、后者桌面为主，均不达登记门槛。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- `t('date.hour')/t('date.minute')/t('date.second')`（date-field-control.tsx:319/331/345）与 `t('flux.date.hour')` 命名不一——经 flux-i18n 源码核实 `defaultNS='flux'` + `normalizeTranslationKey` 双向归一，两形态均解析成功，非缺陷。
- date-field-control / date-range popover 内的 StepperButton 与"清除"按钮未传 disabled——Popover 以 `open={open && presentation.interactive}`（date-field-control.tsx:232、date-range-renderer.tsx:275）门控，禁用字段不可达弹层，无绕过面。
- field-handlers.tsx onChange 的 readOnly 拦截意味着 R2 [G2-R2-视角3-01] 所述"readOnly 绕过"实际被 handlers 层兜住——该条修复时仅需处理 disabled 通道；此为对已立条目的范围澄清，非新发现。
- input-suggest（listbox/option/activedescendant/Escape/空态俱全）、tree-option-list（focus-visible ring/Empty/懒加载 Spinner+重试）、fieldset（focus-visible + chevron 换向）、button-group-select（选中 variant 切换 + Spinner + disabled）、tag-list（active 态视觉 + disabled）、textarea/input（footer 槽位计数与清除，无重叠）、icon-picker（listbox/option 配对正确，ma5-ux 修复保持有效）、select-mobile（loading/error/空态三态齐全，除备忘 1 外无新缺陷）、checkbox-group（checkAll 走 indeterminate prop 正确基线）、input-table（overflow-x-auto、空行、Add 带 PlusIcon）、detail-surface（[outline 取消, default 确认] + confirming Spinner，为包内正确基线）、combo/array-editor/key-value 行操作（R1/R2 已报条目之外无新增）。
- 全量 grep 复核：文本字符图标（✕/×/›/‹）与硬编码调色板类在两包仅剩 R1 已报的 `input-time-renderer.tsx:226`（✕）与 `select-combobox-lists.tsx:26`（bg-yellow-200）两处，无新命中；硬编码英文 aria/placeholder/label 仅剩 R1 已报与 R2 备忘已登记实例；`window.confirm/alert` 全包零使用（唯一 `window.prompt` 即本条视角4-01）。

## 检查范围与方法

- **范围**: `packages/flux-renderers-form/src` 与 `packages/flux-renderers-form-advanced/src` 非 test 文件（114 个；与 R1/R2 同一口径，`*.test.*`/`test-support`/`test-dom-polyfills` 不入审）。R1/R2 已逐文件通读，本轮以盲区定向深挖为主、未覆盖面补读为辅：本轮全文精读 period-renderers.tsx、field-handlers.tsx（onChange 门禁段）、editor-renderer.tsx（全文 474 行）、select-mobile-renderer.tsx、date-range-renderer.tsx、date-field-control.tsx（弹层交互段）、tree-option-list.tsx、input-suggest.tsx、condition-group.tsx、tag-list.tsx、transfer-renderer.tsx（动作/pane 段）、detail-surface.tsx、fieldset.tsx、button-group-select-renderer.tsx、input-number-renderer.tsx（stepper 段）、textarea-renderer.tsx、icon-picker.tsx（弹层段）、input-table-renderer.tsx（响应式/空态段）、markdown-editor-renderer.tsx、form.tsx（actions 段）；其余文件经 6 组定向 grep 复核（文本字符图标 / 调色板与 hex / 硬编码英文 aria·title·placeholder / tabIndex 与 focus-visible / window.prompt·confirm / useIsMobile 适配面）。
- **对照基线**: `dedup-baseline.md` §1-§4 全部生效——ma5-ux 6 条已修复项未重报；G-A~G-M 16 项缺口表象仅落"转 C2 候选"；误报对照 8 条（opacity-0 trigger、ml-auto、ghost、icon-xs/sm、截断、role=button div、destructive 验证钮、transition-all）全部规避；维度 09-12 与全量 WCAG 未涉及。
- **去重方法**: 3 条新发现逐条与 round-01（127 条）+ round-02（63 条）按根因比对（重点比对 G2 组 27 条、G1-视角5-05/G1-R2-视角3-01 等关联根因），兄弟实例按"修一处必须查全类"规则标注根因关系后报告；其余命中按根因并入去重备忘或转 C2。

## G3 — data / dashboard / pivot（HIGH 2 / MEDIUM 3 / LOW 2，共 7 条）

### [G3-R3-视角4-01] 虚拟化表格 + radio 行选择：RadioGroupItem 脱离 RadioGroup 容器，单选控件完全失效（点击无效、选中态恒不显示）

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:288-299,390-391`；`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:301-306`；`packages/flux-renderers-data/src/table-renderer.tsx:417-420`
- **证据片段**:
  ```tsx
  // table-body-rows.tsx:288-299 — 非虚拟化路径：TableBody 被 RadioGroup 包裹（value/onValueChange 受控）
  if (schemaProps.rowSelection?.type === 'radio') {
    return (
      <RadioGroup
        render={<TableBody />}
        value={radioSelectionValue ?? ''}
        onValueChange={(value) => onSelectRow(String(value), true)}
      >
  ```
  ```tsx
  // table-body-rows.tsx:390-391 — 虚拟化路径：裸 <TableBody>，无任何 RadioGroup（下方渲染 radio 项）
  return (
    <TableBody>
  ```
  ```ts
  // @base-ui/react@1.3.0 esm/radio/root/RadioRoot.js — 无 group context 时 checked 恒 false、写入为 NOOP
  const setCheckedValue = groupContext?.setCheckedValue ?? NOOP;
  const checked = groupContext ? checkedValue === value : value === '';
  ```
- **严重程度**: HIGH
- **现状**: 表格同时满足 `rowSelection.type === 'radio'` 与虚拟化条件（`virtualThreshold` 为数字且 `source.length > virtualThreshold`、未开分页，`table-renderer.tsx:417-420`）时，行选择渲染 `RadioGroupItem`（`table-body-row-rendering.tsx:301-306`）却处于虚拟化 `TableBody` 之下——`VirtualBody` 分支没有复用非虚拟化分支的 `RadioGroup` 包裹。经 Base UI 1.3.0 源码核实：无 group context 时 radio 的 `checked = (value === '')`（rowKey 永远非空串 → 恒 false，`data-checked`/primary 填充永不出现），点击派发到隐藏 input 的 `onChange` 最终调用 `setCheckedValue = NOOP`——单选控件视觉与交互双重失效（`toggleOnRowClick` 行点击通道可绕过写入数据层，但 radio 本体始终显示未选中且不可点）。
- **行业惯例**: shadcn/ui RadioGroup 必须以 group 容器提供受控 `value`；Ant Design Table `rowSelection type:'radio'` 在任意渲染路径下选中态均可见可点。同一行选择机制不应因虚拟化开关而失效。
- **用户影响**: 数据量较大（超过虚拟阈值）的单选表格里，用户点击行首圆形单选钮毫无反应，已选行也没有任何视觉标记——"选择"这一表格主操作完全不可用，用户会判定组件损坏。
- **建议**: `VirtualBody` 对 `rowSelection?.type === 'radio'` 同样包一层受控 `RadioGroup`（`render={<TableBody />}`、`value={Array.from(selectedRowKeys)[0] ?? ''}`、`onValueChange={(v) => onSelectRow(String(v), true)}`，与非虚拟化分支同构）；虚拟化该项渲染于窗口内，group 容器放窗口行外层即可覆盖当前虚拟片段；补一条"virtualThreshold + radio"DOM 契约测试（点击后 `data-checked` 出现）。
- **复核状态**: 未复核

---

### [G3-R3-视角8-01] draggable 表格的行拖拽列只有 body 单元格，表头 `<th>` 与 colgroup `<col>` 均无配对列 → 整表列错位（[G3-视角5-01] 同根因新实例）

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:235-248`；对照 `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:389-453`、`packages/flux-renderers-data/src/table-renderer.tsx:332-345,377-381`、`packages/flux-renderers-data/src/table-renderer/fixed-columns.ts:61-76`
- **证据片段**:
  ```tsx
  // table-body-row-rendering.tsx:235-248 — body 行首渲染拖拽单元格
  {draggable && dragHandleProps ? (
    <TableCell
      data-slot="table-drag-cell"
      className="w-10 text-center text-muted-foreground"
      style={{ cursor: 'grab' }}
    >
  ```
  ```tsx
  // table-header-row.tsx:398-426 — 表头仅有 expand / selection / 数据列，无 drag th
  {showExpandColumn ? (<TableHead data-slot="table-expand-column" ... />) : null}
  {schemaProps.rowSelection ? (<TableHead data-slot="table-select-column" ... />) : null}
  // table-renderer.tsx:377-381 — columnCount 计入了 draggable（证明该列本应有全套配对）
  const columnCount = ... + (schemaProps.draggable ? 1 : 0);
  ```
- **严重程度**: HIGH
- **现状**: `draggable: true` 时每个 body 行在最前渲染 40px 宽的拖拽单元格，但：①表头行（flat 与 nested 两条路径）不渲染对应 `<th>`；②colgroup（`table-renderer.tsx:332-345`）不渲染对应 `<col>`；③`createFixedColumnLayout`（`fixed-columns.ts:61-76` 只消费 rowSelection/expandable）也没有 `__drag__` 条目，左侧固定列偏移不包含拖拽列。结果与 round-01 [G3-视角5-01]（行保存条 `__row_save_bar__` 列无配对表头，HIGH）同一根因——"body 额外列缺 header/colgroup 配对"——的拖拽列新实例：开启拖拽的表格表头 N 列对正文 N+1 列，**永久错位**（每个表头都悬在其数据列左侧一列的位置上）；与固定列组合时 sticky 偏移同样错位。
- **行业惯例**: AG Grid / Ant Design Table 中任何 body 额外列（拖拽把手、展开、选择）都必须有配对的 header 列定义与列宽定义；colgroup + 固定布局表格头/体列数不一致会直接产生视觉断裂。
- **用户影响**: 开启行拖拽排序的表格（常见于优先级/队列管理页）所有列标题与列数据对不上，首个数据列的表头悬在拖拽把手列上方，用户按表头理解数据必然错位；筛选/排序按钮也随之挂错列。
- **建议**: 与 [G3-视角5-01] 同批修复"查全类"：①`table-header-row.tsx` 在 draggable 时渲染空 `<th data-slot="table-drag-column" data-column-width-key="__drag__">`；②colgroup push `{ key: '__drag__', width: measuredWidths.get('__drag__') ?? 40 }`；③`createFixedColumnLayout` 增加 `__drag__` 控制列条目（含 left-fixed 偏移参与）；复核阶段与 `__row_save_bar__` 合并裁定同一修复批次。
- **复核状态**: 未复核

---

### [G3-R3-视角4-02] 树表 + 行选择：表头全选框 checked 判定混用"顶层行数"与"扁平化选择计数"，展开子节点后点全选表头框不勾选

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:592,598`；`packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:416-424,551-561`；`packages/flux-renderers-data/src/table-renderer/use-table-tree.ts:86-107`
- **证据片段**:
  ```tsx
  // table-renderer.tsx:592,598 — sourceLength 用顶层 filteredData；selectedRowCount 用扁平化选择集
  sourceLength={filteredData.length}
  selectedRowCount={selectedRowKeys.size}
  // table-header-row.tsx:418 — checked 要求两个不同基准相等
  checked={allSelected && selectedRowCount === sourceLength && sourceLength > 0}
  // use-table-selection.ts:145-153 — allSelected 按 normalizedRows（= treeFlattenedData，含子节点）判定
  ```
- **严重程度**: MEDIUM
- **现状**: 树表（`rowChildrenField` 配置）经 `flattenTreeRows` 把展开的子节点并入 `treeFlattenedData`，`useTableSelection` 的选择集与 `allSelected` 均基于该扁平化数组（含子节点）；而表头收到的 `sourceLength` 是**未扁平化**的顶层 `filteredData.length`。于是"1 父 + 2 已展开子节点"全部选中后：`allSelected=true` 但 `selectedRowCount(3) === sourceLength(1)` 为假 → `checked=false`、`indeterminate=false`——用户点下全选、所有行都勾上了，表头复选框却显示完全未勾选；再次点击会重新触发一次全选（先"看似无效"再"看似无法取消"）。扁平表两基准相等无此问题，缺陷仅在树表+展开+行选择组合中复现。
- **行业惯例**: AG Grid / Ant Design Tree 表的表头全选态一律与真实选择集（含子节点语义）一致；shadcn/ui Checkbox 的 checked/indeterminate 必须反映真实状态。同一动作的视觉反馈不得与实际效果相反。
- **用户影响**: 用户在树表里点表头全选后看到勾选框仍是空的，第一反应是"全选没生效"而反复点击或放弃使用批量操作；批量导出/删除场景下对"到底选中了没有"失去确认感。
- **建议**: 树表场景将 `sourceLength` 改为与选择集同基准：`sourceLength={treeFlattenedData.length}`（或在表头 checked 条件中去掉 `selectedRowCount === sourceLength` 的行数交叉校验，仅用 `allSelected` 表达全选、`selectedRowCount > 0 && !allSelected` 表达半选），flat 表行为不变；补一条树表+rowSelection 全选后 `checked === true` 的断言。
- **复核状态**: 未复核

---

### [G3-R3-视角5-01] 行级快速编辑保存失败零反馈：hook 调用未接 onSaveError，同包单元格级保存的 env.notify 基线未复用

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:125-130`；`packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:224-233,273-291`；对照 `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:93-98`
- **证据片段**:
  ```tsx
  // table-body-row-rendering.tsx:125-130 — 行级草稿 hook 未传 onSaveError
  const rowDraft = useRowQuickEditDraft({
    record: entry.record,
    rowScope,
    helpers,
    saveAction: schemaProps.quickSaveItemAction ?? schemaProps.quickSaveAction,
  });
  ```
  ```tsx
  // table-quick-edit-cell.tsx:93-98 — 同包既有基线：单元格级保存失败有 notify
  onSaveError(error) {
    env.notify?.(
      'warning',
      error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'),
    );
  },
  // use-row-quick-edit-draft.tsx:224-226 — 行级路径 catch 后仅 onSaveError?.(error)，无任何 UI 出口
  ```
- **严重程度**: MEDIUM
- **现状**: 行级快速编辑（inline quickEdit + quickSaveAction/quickSaveItemAction）经 `RowQuickEditSaveBar` 的"保存"触发 `runSave`：失败（action 抛错或返回 `ok:false`）时 catch 分支只调用可选的 `onSaveError`，而唯一的 hook 调用点（`table-body-row-rendering.tsx:125-130`）没有传该回调——spinner 停止、保存条恢复为 [保存/取消]，界面与点击前完全相同：无 toast、无错误文案、无重试提示。同包单元格级/dialog 级保存（`useTableQuickEditController` 的 `onSaveError`）在失败时会 `env.notify('warning', …)`，同一张表里两种保存通道失败行为双标；CRUD 查询提交失败同样有 `env.notify` 兜底（`crud-renderer.tsx:474-484`）。
- **行业惯例**: Ant Design Table 可编辑行保存失败以 message.error 提示并保留编辑态；shadcn 生态表单保存失败必须有可见错误反馈。数据写入失败的静默化属明显交互模式缺陷。
- **用户影响**: 用户改完一行点"保存"，网络/服务端失败时界面毫无动静——用户以为已保存成功而离开，脏数据丢失；或以为点击没生效而反复提交。
- **建议**: `table-body-row-rendering.tsx:125` 的 `useRowQuickEditDraft({...})` 补 `onSaveError: (error) => env.notify?.('warning', error instanceof Error && error.message ? error.message : t('flux.common.saveFailed'))`（`useRendererEnv` 已在该包可用，照抄 `table-quick-edit-cell.tsx:93-98` 同款），行保存条在失败后保持 dirty 态即可自然支持重试。
- **复核状态**: 未复核

---

### [G3-R3-视角11-01] dashboard 编辑器新增面板固定落 (0,0)、拖拽/缩放无任何碰撞处理：新面板与既有面板完全重叠，旧面板被静默遮盖

- **文件**: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:165-178`；`packages/flux-renderers-dashboard/src/layout-math.ts:125-157,163-210`；`packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:211-285`
- **证据片段**:
  ```tsx
  // dashboard-editor-renderer.tsx:175 — addPanel 无视既有面板，恒落原点
  const panel = { id, type, title: type, x: 0, y: 0, w: Math.min(4, cols), h: 2 };
  core.update((doc) => ({ panels: [...doc.panels, panel] }));
  ```
  ```ts
  // layout-math.ts:142-157 — dragPanel 只做吸附+边界 clamp，无碰撞检测；findOverlappingPanels(:130) 仅被测试引用
  const snapped = snapToGrid(x, y, options);
  const clamped = clampPanelPosition({ ...target, x: snapped.x, y: snapped.y }, options);
  ```
- **严重程度**: MEDIUM
- **现状**: 包内已实现 `rectsOverlap`/`findOverlappingPanels`（`layout-math.ts:125-136`）但**无任何交互路径消费**（仅 index 导出与单测引用）：①palette 点击新增面板固定 `{x:0,y:0}`，画布上已有面板占据原点时新面板精确叠在其上；②`dragPanel`/`resizePanel` 只做吸附与边界 clamp，允许把面板拖成/缩成完全重叠。渲染层按数组顺序绝对定位（后加入者画在上层，`editor-canvas.tsx:211-285`），被覆盖面板不渲染任何提示——用户视角是"点了一下 Chart，原来的面板不见了"。undo 可回退，但界面从未解释发生了什么。
- **行业惯例**: 网格仪表盘编辑器（Grafana、gridstack.js、react-grid-layout）新增元件放入首个空闲格或自动压实（compact），拖拽重叠时下推/交换而不是允许完全覆盖；重叠静默发生且无视觉提示被普遍视为编辑器完成度缺口。
- **用户影响**: 用户连续添加两块面板时第二块恰好压住第一块，误以为第一块被替换/删除；拖动面板到已占用区域松手后两块叠在一起，只能靠拖开才能发现下面还有一块——布局结果与所见网格直觉不符，编辑产物（保存到 schema）含隐性重叠，运行态同样叠放。
- **建议**: 最小修复：`addPanel` 落点改为首个空闲网格位（复用 `findOverlappingPanels` 从 y=0 起逐行探测，画布 maxY 内无空位再落 0,0 并允许重叠但立即选中+滚动画布到该面板）；中期在 `dragPanel`/`resizePanel` 提交（endTransaction）时对重叠做压实下推（gridstack compact 语义）或至少给重叠面板加 `ring-destructive` 预览提示。
- **复核状态**: 未复核

---

### [G3-R3-视角4-03] 列设置可把所有列逐个隐藏且无最小可见保护：表格坍缩为只剩控制列的空壳，无任何"列已全部隐藏"提示

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:74-96,98-132`；`packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:202-207`
- **证据片段**:
  ```ts
  // use-table-visible-columns.ts:100-102 — toggleColumn 无"至少保留一列"守卫
  const next = visible
    ? Array.from(new Set([...visibleColumns, columnKey]))
    : visibleColumns.filter((value) => value !== columnKey);
  // table-renderer.tsx:89-96 — tableColumns 过滤后可为空数组，照常渲染
  ```
- **严重程度**: LOW
- **现状**: 列设置（overlay/inline 两种形态）允许把全部列取消勾选：`tableColumns` 过滤为空数组后表头只剩 selection/expand 控制列、数据行只剩控制列单元格（或全空行）；空态分支 `processedData.length === 0` 不触发（数据仍在），因此用户看到的是一条 ~40px 宽、有勾选框没数据的"表格残骸"，无"所有列已隐藏，去列设置恢复"之类的提示。AG Grid/AntD 的列显隐普遍禁止隐藏最后一列或在空列时给出占位说明。
- **行业惯例**: AG Grid column controller 对最后一列默认禁止取消；Ant Design Table 自定义列面板通常保留"全选/默认"复位入口。空渲染面必须有解释。
- **用户影响**: 用户在列设置里连续取消勾选后表格突然变成一条窄条，看起来像渲染故障；需要自己想起"是列设置的问题"再重开菜单勾回，期间无任何文字引导。
- **建议**: `toggleColumn` 增加最小可见守卫：`if (!visible && visibleColumns.length <= 1) return;`（AG Grid 同款策略）；或在 `tableColumns.length === 0` 时于表格位置渲染 `<div className="px-3 py-6 text-sm text-muted-foreground">{t('flux.table.allColumnsHidden')}</div>`（新增 i18n 键）并提供"恢复默认列"按钮（复用 `clearFilters` 通道语义清空 toggledColumns 状态）。
- **复核状态**: 未复核

---

### [G3-R3-视角8-02] dashboard 编辑器画布根节点 `touch-none` + `overflow-auto` 并用：触摸设备完全无法滚动画布，视口外面板不可达

- **文件**: `packages/flux-renderers-dashboard/src/editor/editor-canvas.tsx:188-196`
- **证据片段**:
  ```tsx
  <div
    ref={canvasRef}
    data-slot="dashboard-editor-canvas"
    className="relative h-full min-h-0 w-full touch-none overflow-auto bg-muted/30"
    style={{ minWidth: 320 }}
    onPointerMove={handleCanvasPointerMove}
  ```
- **严重程度**: LOW
- **现状**: 画布滚动容器同时声明 `touch-action: none`（`touch-none`，禁用该元素上的一切触摸平移）与 `overflow-auto`（依赖滚动来浏览超出视口的画布）。面板拖拽需要 touch-action:none 防止拖动时页面滚动，但把该类挂在整个滚动容器上意味着**在画布任意位置（包括空白区）起手的触摸滑动都不会产生滚动**——平板上无法平移画布，超出首屏（高度 600px 起）的面板不可见也不可达；与 R2 已报的 hover-only 删除钮（[G3-R2-视角8-01]）共同构成触摸端编辑器不可用的两面，但根因不同（本条是触摸滚动通道被整体关闭，非可见性）。
- **行业惯例**: tldraw/excalidraw/figma 类画布把 `touch-action: none` 限定在绘制/拖拽目标元素上，画布平移由手势层（双指/空白区单指）自行实现；web 滚动容器不禁用自身 touch-action。
- **用户影响**: 平板/触屏用户打开 dashboard 编辑器后只能看到首屏面板，向下滑动毫无反应，也无法通过滚动触达下方面板进行编辑；鼠标滚轮路径不受影响。
- **建议**: 把 `touch-none` 从滚动容器移到面板根（`data-slot="dashboard-editor-panel"` 与 resize handles）——拖拽手势仍不被页面滚动打断，空白区恢复原生触摸滚动；若需"空白区拖动画布"能力，再在容器 `onPointerDown`（target 为容器自身）补指针平移逻辑。
- **复核状态**: 未复核

---

## 去重自检（与 round-01 127 条 + round-02 63 条按根因比对）

- **视角4-01**（虚拟化 radio 失效）: R1 [G3-视角5-06] 为虚拟化空态样式差异、R2 无相关——不同根因，零重复。Base UI 行为经 node_modules 源码核实（R2 G3 曾用同法核实 MenuItem closeOnClick，先例一致）。
- **视角8-01**（draggable 列无配对表头）: [G3-视角5-01] 已立根因"body 额外列缺 header/colgroup 配对"，本条为该根因在拖拽列上的兄弟实例，按 dedup §1"同类根因新实例算新发现"与递归盲区 1"修一处必须查全类"申报，标注复核阶段与 `__row_save_bar__` 合并裁定。
- **视角4-02**（树表全选基准错位）: R2 [G3-R2-视角4-01] 为 maxSelectionLength 静默禁用（无反馈），本条是 checked 判定基准不一致（反馈错误），根因不同。
- **视角5-01**（行保存失败静默）: R1/R2 无表格行保存失败类条目；与本包 [G3-视角4-03]（inspector JSON Apply 静默失败）表面相近但根因不同（后者是编辑器面板解析吞错，前者是数据动作失败无通知通道接线）。
- **视角11-01**（面板重叠无处理）: R1 [G3-视角8-01]（运行态 1200px 固定宽）为坐标模型缺陷；本条是编辑态碰撞语义缺失，`findOverlappingPanels` 已实现未接线，非已登记缺口（G-D 为数据网格编辑深度，不涉 dashboard）。
- **视角4-03**（列全隐藏无守卫）: 前两轮无列设置空态类条目。
- **视角8-02**（touch-none 阻断滚动）: R2 [G3-R2-视角8-01]（hover-only 删除钮）为可见性/触达根因；本条为触摸滚动通道被整体禁用，根因不同，已注明区别。

## 误报与边界自查（dedup §3 / §4）

- 列筛选/列设置 `DropdownMenuCheckboxItem` 点击不关菜单：Base UI `MenuCheckboxItem` 默认 `closeOnClick=false`，R2 已登记为正确行为，未报。
- 分页禁用按钮 `pointer-events-none opacity-50`：R1 视角3-03 已修复口径内的既有基线，未重复。
- CrudListPagination 空数据仍显示"第 1 / 1 页"vs 表格分页栏空数据隐藏：R2 已登记为 [G3-视角10-01] 同根因表象（含"空页无分页栏"后果），本轮不重复申报。
- 行选择 checkbox 因 `checkableWhen`/maxSelection 静默置灰：R2 [G3-R2-视角4-01] 已立根因（含 title 缺失），checkableWhen 为同根因表象未另立。
- 树表折叠 chevron 20px 热区、lazy spinner 手写圆环：分别沿 [G2-R2-视角8-01]、[G3-R2-视角10-02] 已报根因，未重复。
- stat-tile 内联 sparkline `role="img"+aria-hidden`、pivot `FALLBACK_THEME_TOKENS` hex 兜底、stat-tile emerald/red：R1 [G3-视角9-04]/R2 误报自查/[G3-视角7-01] 已覆盖，未重复。
- chart 画布 `role="img"` + sr-only 摘要的 AT 展开行为、原生 focus outline（palette 原生 button）：涉及全量 WCAG/存在默认指示（[G7-视角3-15] LOW 先例），未达发现门槛。
- `table-pagination-bar` 的静态 `pageSizeLabelId` 多表同页 id 重复：文本相同、用户无可感知影响，未达真实用户影响检验，弃报。
- 本组三条 R2"不构成发现"复核项（quick-edit dialog footer 顺序、filterToggle 折叠条、responsive expand）本轮复读维持原判。

## 覆盖记录

- **flux-renderers-data**: 21 个 UI 承载文件精读 + 组合场景专项核对（列设置×排序×筛选×选择×树表×虚拟化×拖拽×固定列 的 header/colgroup/body 列契约、selection 三通道数据基准、radio/checkbox 控件链路、行保存失败路径）；纯逻辑文件（_-state/_-load/_-delegate/table-data/combine-cells/column-settings-state/use-infinite-scroll/use-crud-_/tree-focus-nav 等）经 grep 定向复查无新 UI 表面。
- **flux-renderers-dashboard**: 13 文件全读；编辑器交互链路（addPanel/dragPanel/resizePanel/键盘/触摸/inspector 写回）逐段核对，layout-math 纯函数消费方全量 grep。
- **flux-renderers-pivot**: 7 文件复读，无新发现（R2 已覆盖画布契约/主题兜底/loading-empty-error 三态齐备）。
- **依赖源码核实**: `@base-ui/react@1.3.0` `esm/radio/root/RadioRoot.js`（无 group context 时 `checked = value === ''`、`setCheckedValue ?? NOOP`），用于 [G3-R3-视角4-01] 结论支撑。

## 转 C2 候选（dedup §2 规则，不计入发现）

无。本轮未撞见已登记 16 项能力缺口的新表象（面板键盘移动沿 R2 G-B2 口径不再重复登记）。

## G4 — mobile / scheduling（HIGH 0 / MEDIUM 6 / LOW 2，共 8 条）

### [G4-R3-视角10-01] gantt 缩放视口锚定断链：`store.scrollLeft` 无生产写入方，setZoom 的中心锚定分支永不生效，缩放后可见日期窗口跳变

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:354-369`；`packages/flux-renderers-scheduling/src/gantt/gantt.tsx:216-219`
- **证据片段**:
  ```ts
  // gantt-store.ts:354-368 — setZoom 实现了"按视口中心日期重锚定"
  setZoom(zoomKey: string, anchorScrollLeft?: number, anchorContainerWidth?: number): void {
    ...
    const sl = anchorScrollLeft ?? _scrollLeft;   // _scrollLeft = config?.scrollLeft ?? 0
    const cw = anchorContainerWidth ?? state.containerWidth;  // 恒为 config 默认 800
    if (sl > 0 && cw > 0) {
      const centerDate = pixelToDate(sl + cw / 2, state.scaleRange, oldCellWidth);
      api.recalcLayout();
      _scrollLeft = Math.max(0, newCenterX - cw / 2);
    } else { api.recalcLayout(); }                // 生产环境恒走此分支
  ```
  ```ts
  // gantt.tsx:216-219 — 滚动监听只派发 schema 事件，从不回写 store.scrollLeft
  useGanttScroll(
    gridRef,
    timelineRef,
    (scrollLeft, scrollTop) => {
      const payload = { scrollLeft, scrollTop };
      void eventsRef.current.onScroll?.(payload, eventCtx(payload));
    },
    ganttReady,
  );
  ```
- **严重程度**: MEDIUM
- **现状**: `setZoom` 写好了中心锚定逻辑，但两个锚定输入在生产链路上均为死值：全仓 grep 证实 `store.scrollLeft` 与 `store.containerWidth` 的 setter 只有测试文件调用（`gantt-interactions.test.tsx:89-90`、`gantt-store.test.ts:382-390`），滚动监听（gantt.tsx:216）只向 schema 派发事件，不回写 store。因此 `_scrollLeft` 恒为初始 0，`if (sl > 0)` 永假，缩放只 `recalcLayout()` 后放任 DOM `scrollLeft` 保持原数值——而内容总宽 = 天数 × cellWidth 已随 zoom 改变，同一像素偏移换算到的日期完全不同。放大时原视野内任务整体右移出屏、缩小时内容骤缩（若总宽小于视口还会被浏览器钳到 0），且计算出的新 `_scrollLeft` 也没有任何代码应用到 DOM。工具栏 −/+ 与键盘路径（handleZoomIn/Out）均受影响。
- **行业惯例**: dhtmlxGantt / MS Project / Google Charts Gantt 缩放时一律以视口中心（或鼠标位置）日期为锚点换算新 scrollLeft，"缩放后正在看的任务留在原位"是排期组件的基线交互；本项目 store 内已实现该算法（354-368 行），仅因集成断链未生效。
- **用户影响**: 用户对准某条任务反复点 −/+ 调整粒度时，画面内容水平跳动、正在查看的任务瞬间滑出视野，需要每次缩放后重新寻找任务或点"今天"复位；大项目（数月跨度）上每次缩放都是一次视野丢失。非设计师用户必然注意到并感到"缩放失控"。
- **建议**: 在 gantt.tsx 的滚动回调中回写 `store.scrollLeft = timelineRef.current.scrollLeft`（或在 doZoomIn/doZoomOut 调 `store.setZoom(key, timelineRef.current?.scrollLeft, timelineRef.current?.clientWidth)`），并把锚定后 `_scrollLeft` 应用回 `timelineRef.current.scrollLeft`；顺带在 ResizeObserver 中同步 `store.containerWidth`，使 364 行 `pixelToDate` 使用真实视口宽。补一条"zoom 后视口中心日期不变"的断言测试。
- **复核状态**: 未复核

---

### [G4-R3-视角11-01] gantt 工具栏"适应/Fit"按钮不执行任何适配计算，仅跳到中间缩放档位，文案承诺的行为不存在

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:37-44,58`；`packages/flux-i18n/src/locales/zh-CN.ts:1125`、`en-US.ts:1126`
- **证据片段**:
  ```tsx
  // gantt-header.tsx:37-44 — "ZoomToFit" 的全部实现：取缩放档位数组的中位元素
  const handleZoomToFit = () => {
    const zooms = store.getAvailableZooms();
    if (zooms.length > 0) {
      const fit = zooms[Math.floor(zooms.length / 2)];
      store.setZoom(fit.key);
      onZoomChange?.(fit.key);
    }
  };
  // :58 — 按钮
  <Button variant="ghost" size="sm" onClick={handleZoomToFit}>
    {t('scheduling.gantt.zoomFit')}
  </Button>;
  ```
  ```ts
  // zh-CN.ts:1125 / en-US.ts:1126 — 文案承诺"适应/Fit"
  zoomFit: '适应',   // en: 'Fit'
  ```
- **严重程度**: MEDIUM
- **现状**: 按钮文案是"适应"（Fit），但实现只是 `zooms[Math.floor(zooms.length / 2)]`——无条件切到缩放档位列表的正中间一档，与任务时间范围、视口宽度均无关。全包 grep `zoomToFit|fitRange|fitTo` 仅命中该按钮，不存在任何"按内容范围适配"的计算。缩放档两端（如"月/日"）无论项目跨 2 周还是 2 年，点"适应"永远得到同一档位；配合 [G4-R3-视角10-01]（缩放无锚定），点击后视口还会跳到不可预期的日期位置。
- **行业惯例**: "Zoom to fit" 在 MS Project / dhtmlxGantt / GanttProject 中的契约是"缩放到使整个项目时间范围可见"（按 scaleRange 与视口宽计算 cellWidth 或反向选档）；Google Charts gantt 的 fit 系列方法同理。以固定中位档位冒充 fit 属"trigger 文案与行为不符"。
- **用户影响**: 项目跨度小于一档粒度时点"适应"看不到全貌、跨度大时依旧只能看到片段——按钮看起来"随机切了一档"或"坏了"；用户无法建立对工具栏的信任，只能手动反复点 −/+。
- **建议**: 二选一：① 真实现：按 `store.scaleRange` 总天数与 `timelineRef.current.clientWidth` 反推所需 cellWidth，再就近映射到 zoomLevels 档位（`dateToPixel(range.end) - dateToPixel(range.start) <= clientWidth` 的最小粒度档）；② 若短期不做适配，将按钮文案改为中性（如"默认缩放"）或直接移除该按钮，消除"Fit"承诺。
- **复核状态**: 未复核

---

### [G4-R3-视角3-01] gantt 缩放按钮到达最小/最大档位后仍呈可用态，点击静默无效（graph 缩放边界缺陷的同型兄弟实例）

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:19-35,56-57`
- **证据片段**:
  ```tsx
  const handleZoomIn = () => {
    const zooms = store.getAvailableZooms();
    const idx = zooms.findIndex((z) => z.key === store.currentZoom);
    if (idx < zooms.length - 1) {
      onZoomIn?.();            // 已到最大档时静默跳过，按钮外观不变
    }
  };
  ...
  <Button variant="ghost" size="sm" onClick={handleZoomOut}>−</Button>
  <Button variant="ghost" size="sm" onClick={handleZoomIn}>+</Button>
  ```
- **严重程度**: LOW
- **现状**: 两个缩放按钮不接收任何 disabled/视觉边界信息：`doZoomIn`/`doZoomOut`（gantt.tsx:343-359）在越界时直接 return，按钮保持可点外观，点击无任何反应也无提示。这是 round-02 [G5-R2-视角3-04]（graph 缩放按钮越界静默无禁用态，LOW）的同根因跨包新实例——graph 侧的修复（从 viewport 派生 canZoomIn/canZoomOut + disabled）不会覆盖 gantt，按"修一处必须查全类"上报。同工具栏的"适应/今天"为带文案按钮不受影响；另 gantt.tsx:361-370 的 `zoomIn/zoomOut` 组件句柄同样无边界反馈。
- **行业惯例**: Figma / Mapbox / MUI Stepper 在边界档位禁用对应按钮（灰化 + pointer-events 关闭）；round-02 [G5-R2-视角3-04] 已引用同先例并给出 Base UI Button `disabled:opacity-50 disabled:pointer-events-none` 的对齐方向。
- **用户影响**: 用户放大/缩小到极限后继续点击，画面无变化，会认为按钮失灵而连点数次；边界状态完全不可感知。影响限于缩放辅助控件，故 LOW。
- **建议**: 在 GanttHeader 内以 `store.getAvailableZooms()` 与 `store.currentZoom` 派生 `canZoomIn = idx < zooms.length - 1` / `canZoomOut = idx > 0`，给两个按钮加 `disabled={!canZoomIn}` 等（ui Button 基类自带禁用样式），点击守卫保留为兜底。
- **复核状态**: 未复核

---

### [G4-R3-视角10-02] calendar 月视图单元格 Enter/Space 的键盘"创建排班"是死路：长按模型依赖 pointerup，键盘会话永不完成，且遗留已武装会话劫持下一次任意点击

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:113-124`；`packages/flux-renderers-scheduling/src/calendar.tsx:341-358`；`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag-create.ts:130-145,174-191`
- **证据片段**:
  ```tsx
  // calendar-month-view.tsx:116-123 — 键盘 Enter/Space 合成 PointerEvent 启动长按会话
  case 'Enter':
  case ' ':
    e.preventDefault();
    {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const syntheticEvent = { clientX: ..., clientY: ..., button: 0 } as React.PointerEvent;
      onCellDragStart?.(dateStr, resourceId, syntheticEvent);
    }
  ```
  ```ts
  // use-calendar-drag-create.ts:178-190 — 500ms 定时器置位后，唯一出口是 pointerup
  longPressTimer.current = setTimeout(() => {
    activeRef.current = true;
    startInfoRef.current = { date, resourceId };
    ...
  }, longPressMs);
  // :135-141 — handlePointerUp 是 showTypeSelector(true) 的唯一调用点（键盘无 pointerup）
  if (!activeRef.current) { resetSession(); return; }
  const start = startInfoRef.current;
  if (start) { setShowTypeSelector(true); }
  ```
- **严重程度**: MEDIUM
- **现状**: 月视图给空单元格接了键盘创建入口（Enter/Space → `startCellDrag`），但 `useCalendarDragCreate` 是纯指针长按模型：班次选择器（`showTypeSelector`）只在 `handlePointerUp` 中打开，键盘路径永远不会产生 pointerup——聚焦单元格按 Enter 后 500ms 仅内部状态置位，界面零反馈，创建流程死路。更糟的是会话就此"武装"：`pressing=true` 挂着全局 pointerup 监听、`activeRef=true` 且 `startInfoRef` 指向该单元格，此后用户在页面**任意位置**的下一次点击（如点头部"今天"按钮）都会触发 `handlePointerUp` → 班次选择器意外弹出，此时选择班次即以陈旧的 Enter 时单元格日期派发 `onEventCreate`，制造用户未预期的排班。round-02 [G4-R2-视角10-01] 报的是拖"移动"会话（ghost 定位 + Enter 回退派发），根因在 `use-calendar-drag`；本条在拖"创建"hook，且根因是长按模型与键盘通道的结构性不匹配，属不同根因。
- **行业惯例**: FullCalendar 键盘 select 回车即打开新建弹窗；键盘可达的创建流程不得依赖指针事件完成（WAI-ARIA APG：所有以指针提供的操作须有键盘等价完成路径）；"后台状态劫持下一次无关点击"在一切主流组件中均为缺陷。
- **用户影响**: 键盘用户在月视图按 Enter 创建排班：毫无反应（功能不可用）；随后任意一次普通点击突然弹出"选择班次类型"浮层，若顺手选了一个班次，就会在几分钟前聚焦的单元格上多出一条非预期排班——视觉与数据双重意外。
- **建议**: 为键盘路径提供直达分支：`handleDateCellKeyDown` 的 Enter/Space 改为携带 `{ date, resourceId }` 直接 `setShowTypeSelector(true)` 并预置 `startInfoRef`（绕过长按定时器）；或在 hook 内区分输入来源，键盘会话以再次 Enter 确认/Escape 取消。同时给 `pressing` 会话补 Escape 兜底清理，防指针路径中 `pointercancel` 缺失时的残留武装。
- **复核状态**: 未复核

---

### [G4-R3-视角9-01] calendar 周/日视图的时段 gridcell 全部 `tabIndex={0}` 且无任何键盘行为：Tab 序被约 100 个惰性焦点停留点淹没，与月视图 roving 模型同组件分裂

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:127-135`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-day-view.tsx:107-115`
- **证据片段**:
  ```tsx
  // calendar-week-view.tsx:127-135 — 每个时段格：tabIndex=0、无 onKeyDown、无箭头导航
  <div
    key={dateStr}
    role="gridcell"
    tabIndex={0}
    aria-label={`${dateStr} ${resource.title || resource.text}`}
    data-slot="calendar-cell"
    data-date={dateStr}
    data-resource={resource.id}
    className="flex-1 relative border-r last:border-r-0"
  >
  // calendar-day-view.tsx:107-115 — 12 个小时格同款（dayStartHour 8→20）
  ```
- **严重程度**: MEDIUM
- **现状**: 周视图每个资源行渲染 7 天 × 12 小时 = 84 个 `tabIndex={0}` 的 gridcell（多资源线性叠加），日视图每资源 12 个；这些单元格没有 onKeyDown、没有箭头键导航、没有 Enter 动作（创建/拖拽入口均未接线），也没有 `aria-selected`——是纯粹的惰性 Tab 停留点。对照同组件月视图：roving tabIndex（`focusedCell` 状态 + `cellTabIndex`，month-view:219-221）、Arrow 四向导航（:92-112）、空/周末格以 `data-empty` 排除出键盘序列（:89）、Enter/Space 触发创建（:113-124）——同一组件三种视图两套键盘模型，周/日视图是缺席的那套。round-02 [G4-R2-视角3-03] 报的是这些自定义可聚焦元素**缺 focus-visible 样式**（视觉层）；本条根因是**键盘交互模型缺失 + Tab 序污染**（行为层），修样式不会治愈。
- **行业惯例**: ARIA grid pattern：可聚焦 gridcell 必须支持方向键漫游且可激活（FullCalendar 日/周视图键盘单元格导航 + Enter 打开创建）；不可交互元素不应进入 Tab 序（聚焦但不动作的 tab stop 被视为键盘陷阱噪声）。
- **用户影响**: 键盘用户在周视图按 Tab，需要穿过 84+ 个按下去毫无反应的空格子才能到达事件块（事件块自身又是零散 tabIndex=0），焦点指示还不可见（R2-3-03）；期望方向键浏览日程（月视图的习惯）也完全无效。周/日视图事实上对键盘用户不可用，而月视图可用——同一组件行为分裂。
- **建议**: 把月视图的键盘模型移植到周/日视图：容器级 roving tabIndex（首格 0 其余 -1）+ 箭头键按天/小时步进 + Enter 打开创建流程（配合视角10-02 的键盘创建修复）；最小改法是先将时段格降为 `tabIndex={-1}` 仅保留事件块可聚焦，消除 Tab 序淹没，后续再补导航。
- **复核状态**: 未复核

---

### [G4-R3-视角7-01] 排班事件块与班次选择按钮以固定白色前景配任意背景色：默认班次色 amber/blue/green 上白字对比度 1.7~2.9:1，事件标题难以辨认

- **文件**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-event-block.tsx:19-30,113-120`；`packages/flux-renderers-scheduling/src/calendar/components/calendar-drag-type-selector.tsx:35-45`；`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:46-51`
- **证据片段**:
  ```tsx
  // calendar-event-block.tsx:113-120 — 背景可变（schema color / 班次色），前景恒白
  style={{
    left: `${left}%`, width: `${width}%`, top: ..., height: ...,
    backgroundColor: color,
    color: 'var(--color-primary-foreground)',   // 主题 4 套调色板均为 0 0% 100%（纯白）
  }}
  // calendar-drag-type-selector.tsx:36-41 — ui Button 默认 variant（白字）+ 内联背景班次色
  <Button key={st.type} type="button" className="nop-calendar-type-selector-btn"
    style={{ backgroundColor: st.color }} onClick={() => onSelectType(st.type)}>
  ```
  ```ts
  // calendar.tsx:46-51 — 默认班次色（calendar.css 未定义 --color-calendar-*，fallback 生效）
  { type: 'shift', ..., color: 'var(--color-calendar-shift, #4ade80)' },
  { type: 'maintenance', ..., color: 'var(--color-calendar-maintenance, #fbbf24)' },
  ```
- **严重程度**: MEDIUM
- **现状**: 事件块背景色三源可变（schema `event.color`、四种默认班次色、muted 兜底），前景色却固定为 `--color-primary-foreground`（theme-tokens 四套调色板全部 `0 0% 100%` = 白）。默认配置下：maintenance `#fbbf24`（琥珀）上白字对比度约 1.7:1、shift `#4ade80` 约 1.9:1、appointment `#60a5fa` 约 2.9:1——四种默认班次中三种低于可读下限；宿主传入浅色 `event.color` 时同样白字。班次选择浮层的四个按钮（同一组色）继承 ui Button 白字，同病。round-01 [G4-视角7-01] 报的是"语义色应令牌化而非硬编码"；本条根因是**固定前景与可变背景的配对缺陷**（即使全部令牌化，白字配浅底依旧存在），二者修复路径不同。
- **行业惯例**: FullCalendar 事件块默认浅色底 + 继承正文色；Ant Design Calendar/Tag 对浅底用深字或提供反色计算（`colorTextLightSolid` 仅用于深底）；shadcn Badge 语义变体均为"深底白字/浅底深字"成对设计，不出现浅底白字组合。
- **用户影响**: 排班表中"设备维护"（琥珀）与"早班"（绿）事件里的标题文字与底色近乎融为一体，正常视距下难以读出内容，密集排班时基本靠猜；班次选择浮层中琥珀按钮上的白字同样难辨认。该缺陷在默认配置、日常排班主路径上必然可见。
- **建议**: 成对设计：① 班次色改浅底深字（如 `color-mix(in srgb, ${color} 22%, var(--color-background))` 底 + `color-mix(... 70%, black)` 字）；② 或为每个班次色配对声明前景（shift/maintenance 配 `#1f2937` 系深字，leave 保持白字），事件块与选择器按钮共用同一映射表；③ 兜底：给事件块文字加 `text-shadow` 或半透明深色遮罩层不推荐（治标）。
- **复核状态**: 未复核

---

### [G4-R3-视角5-01] barcode 扫描浮层相机初始化失败（error 相位）无重试入口，且直出原始异常英文 message（map 错误文案同根因的 scheduling 实例）

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:127-133,186-189,262-267`
- **证据片段**:
  ```tsx
  // :127-133 — init 失败：err.message 优先入库，UI 只展示不提供动作
  } catch (err: any) {
    if (signal.aborted) return;
    setPhase('error');
    const msg = err?.message ?? t('flux.cameraUnavailable');
    setErrorMessage(msg);
  // :186-189 — restartCamera 能力存在，但无任何 UI 调用（仅 torch 内部换流使用）
  const restartCamera = async () => { stop(); await start(); };
  // :262-267 — error 相位渲染：图标 + 文本，无按钮
  <div data-slot="barcode-scanner-error" className="flex flex-col items-center gap-3 text-white/70">
    <ScanLine className="w-12 h-12 opacity-40" />
    <span className="text-sm">{errorMessage ?? t('flux.cameraUnavailable')}</span>
  ```
- **严重程度**: LOW
- **现状**: 相机授权被拒、设备占用、WASM 加载失败时，全屏浮层只显示一行图标+文案，唯一出路是点右上 X 关闭后重新打开扫码（重走入口→重新授权引导）。`restartCamera` 已在浮层内实现却没有任何错误路径消费。叠加两个次生问题：① `err?.message` 优先于本地化 `flux.cameraUnavailable`——权限拒绝时用户看到的是英文异常原文（"Permission denied"类），这是 round-02 [G5-R2-视角5-02]（map 错误层直出 `error.message`，MEDIUM）的同根因新实例，按 dedup §1 上报但与 map 不同包不共用修复；② 错误文案白色/70 无 destructive 语义。与 round-02 [G4-R2-视角4-01]（校验拒绝结果被浮层遮蔽）根因不同——那条是"错误在浮层之下不可见"，本条是"错误可见但无恢复动作"。
- **行业惯例**: 移动扫码场景（Vant Scan 实践、微信/Zebra 扫码）相机失败标配"重试"按钮 + 授权引导提示；错误文案走 locale，异常原文只进控制台（同 G5-R2-视角5-02 引用）。
- **用户影响**: 首次使用未授权相机（移动端常见）的用户看到一行英文异常，点屏幕无反应，只能关闭浮层从头再来；重试本可一步完成授权后恢复。属边缘路径（相机失败）+ 有关闭重开兜底，故 LOW。
- **建议**: error 相位补 `<Button variant="outline" size="sm" className="text-white" onClick={restartCamera}>{t('flux.common.retry')}</Button>`（init 链路需抽为可重入函数）；文案改为 `t('flux.cameraUnavailable')` 固定本地化键、`err.message` 移交 `console.error` 与 `onScanError` payload。
- **复核状态**: 未复核

---

### [G4-R3-视角11-02] calendar 拖拽创建排班仅月视图可用：周/日视图长按空单元格零反应、无任何创建入口，同组件三种视图能力分裂

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:473-504`
- **证据片段**:
  ```tsx
  // :475-483 — 仅月视图接收 onCellDragStart（长按创建 + 键盘创建入口）
  <CalendarMonthView ... onDragStart={dragSwap.startDrag} onCellDragStart={dragCreate.startCellDrag} ... />
  // :487-495 — 周视图：只有拖动已有事件，无 onCellDragStart
  <CalendarWeekView ... onDragStart={dragSwap.startDrag} onEventKeyDown={handleEventKeyDown} ... />
  // :497-504 — 日视图：同周视图
  <CalendarDayView ... onDragStart={dragSwap.startDrag} onEventKeyDown={handleEventKeyDown} ... />
  ```
- **严重程度**: MEDIUM
- **现状**: 拖拽创建（`useCalendarDragCreate`：长按空位 → 班次选择器 → `onEventCreate`）是 calendar 唯一的"新建排班"内置入口，但 `dragCreate.startCellDrag` 只传给月视图；周/日视图（排班场景的日常操作视图）中长按/拖动空白区域无任何反应，也没有新建按钮兜底——创建排班必须先切回月视图。而 `getCellFromPoint` 对周/日的 `data-slot="calendar-cell"` 同样生效，hook 层并无视图障碍，纯接线缺失。事件"移动"（dragSwap.startDrag）三视图齐备，创建单缺其二，同组件内能力矩阵自相矛盾。
- **行业惯例**: FullCalendar 的 select/长按创建在 month/timeGrid 周/日视图一律可用；Ant Design Calendar、Google Calendar 日/周视图均可点空白新建。同组件多视图共享同一创建入口是排班组件基线。
- **用户影响**: 排班员在周视图发现某时段空缺，长按/点按想新建班次——毫无反应，会认为"这里不能建"或组件失灵，被迫切月视图再切回来；周/日恰是排班核对的高频视图，能力缺口每次操作都撞见。
- **建议**: 给 `CalendarWeekView`/`CalendarDayView` 增加 `onCellDragStart` 透传（时段 gridcell 补 onPointerDown 长按判定，复用 `dragCreate.startCellDrag`，`getCellFromPoint` 已兼容其 data 属性）；键盘入口配合 [G4-R3-视角10-02] 的直接打开选择器分支一并接线。
- **复核状态**: 未复核

---

## 汇总

| 严重程度 | 数量 | 编号                                                           |
| -------- | ---- | -------------------------------------------------------------- |
| HIGH     | 0    | —                                                              |
| MEDIUM   | 6    | 视角10-01、视角11-01、视角10-02、视角9-01、视角7-01、视角11-02 |
| LOW      | 2    | 视角3-01、视角5-01                                             |

共 **8 条**（HIGH 0 / MEDIUM 6 / LOW 2）。

## 去重自检（与 R1 127 条 + R2 63 条按根因比对）

- **视角10-01**（缩放锚定断链）：R1/R2 均未触及 gantt 缩放-滚动联动；[G5-R2-视角3-04] 是 graph 缩放"边界禁用"问题，根因不同。
- **视角11-01**（Fit 名不符实）：新根因（文案-行为不符）；R1 [G4-视角1-01] 仅覆盖同工具栏 −/+ 的文本字符图标与 aria 缺失。
- **视角3-01**（缩放边界无禁用）：[G5-R2-视角3-04] 同根因跨包兄弟实例，按 dedup §1 新实例规则上报，已互相引用。
- **视角10-02**（键盘创建死路）：[G4-R2-视角10-01] 是拖"移动"会话（ghost (0,0) + Enter 回退派发，`use-calendar-drag`）；本条在拖"创建"（`use-calendar-drag-create` 长按模型 + 武装会话劫持），根因与修复互不覆盖。[G4-视角11-01]（"+N more" 假可供性）亦不同根因。
- **视角9-01**（周/日惰性 tab stop）：[G4-R2-视角3-03] 是"roving 元素缺 focus-visible 样式"（视觉层，月视图格/事件块/kanban 卡）；本条是"键盘交互模型缺失 + Tab 序淹没"（行为层，周/日视图格），样式修复不治愈行为缺失，已注明关系。
- **视角7-01**（白字配可变底）：[G4-视角7-01] 是"语义色硬编码未令牌化"；本条是"固定前景 vs 可变背景配对"，令牌化后依旧存在，根因不同。
- **视角5-01**（相机错误无重试）：[G4-R2-视角4-01] 是"校验错误渲染在浮层之下"；本条是"相机 error 相位可见但无恢复动作 + 原始 message 直出（[G5-R2-视角5-02] 同根因实例）"，不同根因。
- **视角11-02**（周/日无创建入口）：R1/R2 均未申报；不属 dedup §2 已登记 16 项缺口（G-A~G-M）任一表象。

## 转 C2 候选（dedup §2 规则，不计入发现）

无新增。本轮未撞见已登记 16 项能力缺口的新表象（kanban 批量选择缺位属 G-B3、swipe-cell 键盘等价属 G-B2，均沿 R1 已登记口径，无新表现）。

## 误报与边界自查（dedup §3/§4）

- calendar header ‹ › 文本字符、`hover:bg-gray-100/200`：R1 [G4-视角1-01]/[G4-视角7-01] 已报，不重复。
- week/day 视图 `bg-blue-50`/`border-gray-100`、markers `bg-red-400`、overlay `bg-yellow-600`、baseline hex：R2 自查已归并 R1 [G4-视角7-01] 包级根因，不重复。
- GanttLayout 分隔条：`role="separator"` + tabIndex + 方向键 + `focus:ring-2` + aria-valuenow 全齐，为包内正确基线（与 page.tsx 把手问题 [G1-视角8-14] 对照成立），不报。
- CalendarConfirmDialog 按钮序 [取消(outline), 确认(default)]、焦点陷阱、Escape 双通道：合规，不报。
- kanban 拖拽视觉反馈链（drop-target 描边 / drop-indicator / dragging / keyboard-dragging outline）：kanban.css 在位，不报。
- notice-bar/swipe-cell/countdown/infinite-scroll：R1/R2 已覆盖其缺陷面，本轮复核无新实例。
- gantt 移动端响应式：沿 R1 "gantt 属桌面优先组件"先例不报；GanttLayout min-width 200px 可手动让出时间线。
- calendar-month-view aria-label 的 `', today'/', weekend'` 英文碎片（:228）：i18n 同根因家族实例，但为 sr-only 单点碎片、可见用户零影响，按 R2 "transfer pane placeholder" 弃报先例低于门槛，登记于此供 i18n 修复批次顺带清理。

## 覆盖记录

- **flux-renderers-mobile**（12 非 test 文件）：pull-refresh / infinite-scroll / swipe-cell / notice-bar / countdown / use-touch / styles.css 本轮全读复核（R1/R2 已报缺陷面不重复）；schemas / mobile-renderer-definitions / index 定向 grep（图标/颜色/aria/loading）确认无未检 UI 表面。
- **flux-renderers-scheduling**：本轮深读 calendar 12 文件（calendar.tsx 全文 / month·week·day view / event-block / header / confirm-dialog / drag-type-selector / overlay / use-focus-trap / use-calendar-drag-create / use-calendar-virtualizer / date-utils / print.css / calendar.css 关键段）；gantt 11 文件（gantt.tsx 全文 / store 全文 / header / layout / timescale / cellgrid / markers / editor / use-gantt-scroll）；kanban 7 文件（use-kanban-dnd / use-column-dnd / kanban.css 全文 / board·column·toolbar 复核）；barcode-input 3 文件（scanner-overlay 全文 / input 复核）；其余纯逻辑文件（undo-stack / utils/\* / hooks 无 JSX 输出者）经 `scrollLeft`/`containerWidth`/`focus`/`zoomFit`/`aria-label`/硬编码色定向 grep 闭合。
- **交叉验证**：`store.scrollLeft`/`store.containerWidth` 生产写入方经全包 rg 闭合（仅测试写入）；`zoomToFit|fitRange|fitTo` 全包唯一命中按钮；`--color-calendar-*` 无定义处（fallback hex 生效）；`--primary-foreground` 四套调色板均为白色（theme-tokens styles.css:52/151/211/271）；i18n 键 `scheduling.gantt.zoomFit`、`flux.cameraUnavailable` 于 locales 双语核对。
- 静态口径：纯源码静态审查（无浏览器运行时验证）；[G4-R3-视角10-01] 的"视口跳变"结论基于 setZoom 代码路径 + 浏览器 scrollLeft 保持语义推理，建议复核阶段以 Playwright 缩放前后 `scrollLeft`/可见日期断言确认。

## G5 — ai / graph / map / industrial+editor（HIGH 0 / MEDIUM 4 / LOW 1，共 5 条）

### [G5-R3-视角3-01] scada 编辑器 `meta.disabled` 仅 inert 画布区，工具箱/图元库/属性面板完全未门控，"禁用编辑器"仍可增删改图元

- **文件**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:217-219,267-271,283-289`（对照 `toolbox/toolbox-panel.tsx:9-14`、`palette/editor-palette.tsx:7-10`、`inspector/inspector-panel.tsx:10-14` 的 props 均无 disabled 通道）
- **证据片段**:
  ```tsx
  // scada-editor-canvas.tsx:219,288-289 —— disabled 只落到画布 div
  const disabled = props.meta.disabled === true;
  ...
      aria-disabled={disabled || undefined}
      inert={disabled || undefined}
  // :267-270 —— 工具箱照常全套渲染，未传任何 disabled
  {showLayoutBody
    ? asReactNode(toolbox?.render({ bindings: { selection } })) ?? (
        <EditorToolboxPanel runtime={runtime} selection={selection} onError={handleError} />
      )
  : null}
  ```
- **严重程度**: MEDIUM
- **现状**: `meta.disabled` 的编辑器消费点只有画布容器（`inert` + keydown/drop 守卫）；`EditorToolboxPanel`（删除/对齐/复制粘贴/导入）、`EditorPalettePanel`（点击即加图元）、`EditorInspectorPanel`（字段写入 working copy）的 props 接口根本没有 disabled 通道，禁用态下全部可交互。配套测试 `scada-editor-canvas-disabled-meta.test.tsx` 也只断言画布表面。这是 P2-5 跨包 `meta.disabled` 契约（ai-conversations/ai-sender/ai-attachments/ai-tool-call 等均"disable 整个交互面"）在编辑器上的半量实现；与 round-02 [G5-R2-视角3-03]（preview 态 mutator 未按 mode 门控）同向但门控信号不同（mode vs meta.disabled），属独立代码路径的新实例。
- **行业惯例**: shadcn/ui 生态禁用控件统一 `disabled` + `disabled:opacity-50` 置灰并阻断一切子交互；Figma/WinCC 类编辑器的只读/无权限态隐藏或禁用全部编辑 chrome。P2-5 契约本身（同包 ai 系组件的实现）即本仓内部基线。
- **用户影响**: 宿主把编辑器标为 disabled（无权限/只读场景）后，画布拖拽被冻结、呈现"已禁用"预期，但用户点击工具箱 Del/粘贴、点图元库、改属性面板，图元照样被删/增/改——权限边界在 UI 层被无声绕过，且被禁用的表面与可用面板并存让用户无法判断当前到底能不能编辑。
- **建议**: `EditorToolboxPanelProps`/`EditorPalettePanelProps`/`EditorInspectorPanelProps` 增加 `disabled?: boolean` 并由 canvas 渲染处透传 `disabled`（工具箱 `btn()` 已有 disabled 参数可直接接入；palette Button、inspector Input/Switch/NativeSelect 透传 ui 基类禁用态），同时给三个面板容器补 `data-disabled` + `opacity-60 pointer-events-none` 的面板级禁用视觉；`runtime-mutators` 写入口可加 `session.disabled` 二次守卫兜底（对齐 R2 视角3-03 建议的双层模式）。
- **复核状态**: 未复核

---

### [G5-R3-视角3-02] ai-feedback 赞/踩投票选中态仅落 `data-active`/`aria-pressed`，全仓无任何样式消费，投票后按钮外观零变化

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:157-171`（全仓 grep：`ai-feedback` 在任何 `.css` 零命中；ui `button.tsx` 基类无 `aria-pressed:*`/`data-active:*` 分支）
- **证据片段**:
  ```tsx
  const common = {
    type: 'button' as const,
    variant: 'ghost' as const,
    size: 'sm' as const,
    'data-slot': `ai-feedback-${action}`,
    'data-active':
      (action === 'like' && voted === 'like') || (action === 'dislike' && voted === 'dislike')
        ? ''
        : undefined,
    'aria-pressed': action === 'like' || action === 'dislike' ? voted === action : undefined,
  ```
- **严重程度**: MEDIUM
- **现状**: 赞/踩是 ai-feedback 的持久化语义动作（D4：写 `message.metadata.feedback`），投票状态通过 `data-active` 与 `aria-pressed` 落 DOM，但 ui Button 基类无 `aria-pressed`/`data-active` 样式分支、ai 包 styles.css 无任何 `ai-feedback` 规则、宿主 CSS 也未约定——选中与未选中像素级相同。这是 round-02 [G1-R2-视角3-02]（button `active` 态 data-only 无消费方，同条已注明"修一处必须查全类"）在 G5 范围的新实例：属性词汇不同（`data-active`+`aria-pressed` vs `data-active`+`aria-pressed` 同型），G1 修复不会覆盖本处。
- **行业惯例**: shadcn/ui Toggle 以 `data-[state=on]:bg-accent data-[state=on]:text-accent-foreground` 表达按压态；ChatGPT/Claude 的点赞按钮选中后有明确填充/变色；本项目审查口径"选中/按压状态必须有可见指示"（视角 3）。
- **用户影响**: 用户点"赞"后按钮毫无变化，无法确认投票是否已记录（数据层写了 metadata、视觉层全盲），再点一次又会取消投票——用户在"没点上/已点上/被取消了"三种可能间反复点击，反馈闭环断裂。
- **建议**: 在 `common` 追加视觉类：`className: (action === 'like' && voted === 'like') || (action === 'dislike' && voted === 'dislike') ? 'bg-accent text-accent-foreground' : undefined`（ghost 基类可叠加）；或按 shadcn 惯例在 ui Button 基类补 `aria-pressed:bg-accent aria-pressed:text-accent-foreground`（与既有 `aria-expanded:` 同位，惠及全仓 aria-pressed 使用方，呼应 G1-R2-视角3-02 的合并裁定）。
- **复核状态**: 未复核

---

### [G5-R3-视角5-01] ai-attachments "发送"不闭环：非图片附件点击后静默无效果，发送成功后列表不清理可重复发送

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:187-204,250-260,386-390`（对照同包 `ai-sender.tsx:91-96` 发送后 `clearOnSubmit` 清空草稿的既有闭环）
- **证据片段**:
  ```tsx
    const parts = buildImageContentParts(attachments);   // 仅过滤图片
    if (parts.length > 0 && ctx) {
      await ctx.sendMessage(parts);
    }                                                    // parts 为空 → 什么都不发生
  ...
        {attachments.length > 0 ? (
          <Button
            type="button"
            size="sm"
            data-slot="ai-attachments-upload"
            disabled={disabled || (ctx?.isProcessing ?? false)}
            onClick={handleUpload}
          >
            {t('flux.ai.send')}
          </Button>
  ```
  ```ts
  // :386-390 —— 非图片条目被静默过滤，无任何反馈通道
  export function buildImageContentParts(attachments: AiAttachment[]): ChatMessageContentPart[] {
    return attachments
      .filter((a) => isImageMime(a.contentType) || isImageExt(a.name))
      .map((a) => ({ type: 'image_url' as const, image_url: { url: a.url } }));
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 两个发送闭环缺口：① `accept` 缺省不限制文件类型（card 模式也按"任意文件"渲染名称/大小列表），但 `handleUpload` 只组装图片 parts——用户附了 PDF/文档后点"发送"，`parts.length===0` 时既不 sendMessage 也不报错不给提示，按钮点击零效果；混合场景下非图片文件被静默排除，用户以为已随消息发出。② 发送成功后 `internalAttachments` 不清理、object URL 不撤销，列表原样保留且按钮恢复可点——再点一次即把同一批图片作为新消息重复发送。同组合面里 ai-sender 的发送有 `clearOnSubmit`（默认清空）闭环，attachments 的同名"发送"按钮没有，构成同 surface 双"发送"行为分裂。
- **行业惯例**: ChatGPT/Claude/Gemini 附件在消息发出后即从输入区清空；Ant Design Upload 对不可上传/被排除的文件给出逐文件原因（error 条目）。"点击发送无任何反应"在所有主流聊天产品中均为缺陷。
- **用户影响**: 附错类型文件的用户点"发送"后界面毫无动静，会反复点击或以为页面卡死；发图成功的用户看到附件还挂在列表里，无法判断"发没发出去"，误点即重发重复消息——多模态发送主路径上的反馈与状态断裂。
- **建议**: ① `handleUpload` 在 `parts.length === 0` 时给出反馈：`toast.error(t('flux.ai.noImageAttachment'))`（新增 i18n 键）或复用 `onError` 通道新增 `unsupported-type` reason 并在列表项上以现有 `AttachmentStatus` error 形态标注；② 发送成功后与 ai-sender 对齐：`reportChange([])` 清空列表（受控模式由 host 经 onChange 接管，docstring 注明），并同步撤销已发送项的本地 object URL。
- **复核状态**: 未复核

---

### [G5-R3-视角8-01] scada 编辑器工具箱 30+ 按钮单行不换行不滚动，窄容器下尾部按钮（撤销/重做/导出/导入）被 `overflow:hidden` 裁剪且无替代入口

- **文件**: `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:158-214`（7 组 ButtonGroup 约 28 个按钮单行排布）；`packages/flux-renderers-industrial/src/editor/styles.css:44-51,90-97,117-119`
- **证据片段**:
  ```css
  /* styles.css:44-51 —— 无 flex-wrap、无 overflow-x */
  .nop-scada-editor-toolbox {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: var(--nop-surface, #ffffff);
    border-bottom: 1px solid var(--nop-border, #e2e8f0);
  }
  /* styles.css:90-97 —— 根容器 overflow:hidden 静默裁剪溢出 */
  .nop-scada-editor-layout {
    display: flex;
    flex-direction: column;
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  ```
- **严重程度**: MEDIUM
- **现状**: 工具箱 = 删除/组/解组 + 视图 5 钮 + 对齐 6 钮 + 分布 2 钮 + 层级 4 钮 + 复制/剪切/粘贴 + 撤销/重做 + 导出/导入 + 状态 span，全部在一条 `display:flex`（不换行）的 ButtonGroup 行内；ui `ButtonGroup` 基类为 `flex w-fit`（同样不换行），按钮 `whitespace-nowrap` 不可收缩，整行 min-content 约 1100–1300px。外层 `.nop-scada-editor-layout > .nop-scada-editor-toolbox { flex: 0 0 auto }` 且根容器 `overflow:hidden`——容器窄于该宽度时尾部组被硬裁剪，无横向滚动条、无折叠、无溢出指示。1366px 笔记本或编辑器嵌入带侧栏的页面时（可用宽度 <1100px 常见）即触发；撤销/重做尚有画布 Ctrl+Z/Y 替代，导出/导入没有任何键盘或菜单替代路径。
- **行业惯例**: Figma/Excalidraw/dhtmlxGantt 工具条在窄容器下换行（flex-wrap）或收敛进「更多」溢出菜单；任何工具栏都不允许"按钮存在但永久点不到"。
- **用户影响**: 中低宽度屏幕上使用编辑器时，导出/导入/撤销/重做按钮不可见也不可达（无滚动挽救），用户无法完成导出配置等操作，且因无溢出指示会以为功能不存在；不同窗口宽度下工具栏能力悄然不同。
- **建议**: 最小修复：`.nop-scada-editor-toolbox` 追加 `flex-wrap: wrap; row-gap: 4px;`（分组 ButtonGroup 保持完整换行，状态 span 加 `margin-left:auto` 落行尾）；或在 toolbox 根加 `overflow-x: auto` 保底可滚。若要保单行紧凑，可把导出/导入与撤销/重做收进一个 `DropdownMenu`「更多」钮（`MoreHorizontal` 图标）。
- **复核状态**: 未复核

---

### [G5-R3-视角11-01] 流式生成期间用户上滑回看后无"回到底部"入口，hook 已导出 `scrollToBottom` 但消息列表从未消费

- **文件**: `packages/flux-renderers-ai/src/adapters/use-auto-scroll.ts:42-47,60-65`；`packages/flux-renderers-ai/src/renderers/ai-message-list.tsx:90`（仅解构 `containerRef, onScroll`）
- **证据片段**:
  ```ts
  // use-auto-scroll.ts:42-47 —— 契约明确导出 scrollToBottom/isAtBottom
  function scrollToBottom() {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    pinnedRef.current = true;
  }
  ```
  ```tsx
  // ai-message-list.tsx:90 —— 消费面只有两个成员，scrollToBottom/isAtBottom 全仓无使用方
  const { containerRef, onScroll } = useAutoScroll(autoScrollEnabled ? trigger : null);
  ```
- **严重程度**: LOW
- **现状**: 自动滚动契约刻意实现了"用户上滑即暂停、底部 +80px 内恢复 pin"的聊天标准模型，也导出了 `scrollToBottom`/`isAtBottom`，但唯一的内置消费方 `ai-message-list` 没有渲染任何"回到底部"浮钮或新内容指示：长回答流式期间用户上滑回看上文后，新内容持续在视口外追加，用户只能手动长距离滚回底部，且无任何"下方有新内容"提示。ChatGPT/Claude/vercel-ai 聊天模板均配备跳底浮钮（本仓 auto-scroll 即按该模型设计，属接线缺失而非能力缺失）。
- **行业惯例**: ChatGPT/Claude/antd-x/vercel-ai 模板：滚离底部时出现常驻「↓」浮钮，点击回底并恢复 auto-scroll；无该入口的长流式对话被视为交互半成品。
- **用户影响**: 长对话+长回答（该组件的主场景）中，用户回看后想跟上最新输出必须连续滚动大量距离，部分用户会误以为"回答停了"；影响为操作摩擦而非阻断，判 LOW。
- **建议**: 在 `AiMessageListView` 消费 `isAtBottom`（需把 pinned 态改为可渲染状态或在 hook 暴露订阅）：非底部时在滚动容器尾部叠加 `<Button size="icon-sm" variant="outline" aria-label={t('flux.ai.scrollToBottom')} onClick={scrollToBottom}><ChevronDownIcon /></Button>` 浮层（绝对定位 `bottom-3 right-3`），点击调 hook 已有的 `scrollToBottom()`；i18n 键新增。
- **复核状态**: 未复核

---

## 去重自检（与 round-01 127 条 + round-02 63 条按根因比对）

- **视角3-01**（meta.disabled 半量门控）≠ [G5-R2-视角3-03]（preview 态零指示 + mutator 未按 **session.mode** 门控）：门控信号不同（`meta.disabled` vs `session.mode`）、代码路径不同（canvas inert vs mutator 入口），且本条是 P2-5 disabled 契约家族（ai 系组件均已全量消费）的编辑器侧缺口，round-01/02 的 disabled 类发现（[G1-视角3-02] href 锚点、[G2-R2-视角3-01] time steppers）均非编辑器面板。按"修一处必须查全类"上报为新实例。
- **视角3-02**（feedback 选中态无样式消费）= [G1-R2-视角3-02]/[G1-视角3-03] 已立根因（"状态属性落 DOM 但无样式消费方"）在 ai 包的新实例，dedup §1 允许申报；属性消费面（`data-active`+`aria-pressed`）与 G1 两处均不同，G1 的修复不覆盖本处。
- **视角5-01**（attachments 发送不闭环）≠ [G5-R2-视角5-01]（maxSize/maxFiles **添加时**静默拒绝）：前者是**发送时**行为（parts 过滤 + 发送后状态不转换），根因不同；与 [G2-R2-视角5-01]（upload 单选重选在飞覆盖）亦不同根因。
- **视角8-01**（toolbox 单行裁剪）≠ [G5-R2-视角3-03]（preview 指示）/R1 工具箱各条（字形图标、ghost 取消、状态 span）：round-01/02 的工具箱条目均未涉及布局溢出；与 [G1-R2-视角8-02]（diff-view 窄容器）同属"响应式降级缺失"根因族，但组件与表现（裁剪不可达 vs 半宽堆叠）不同，为跨包新实例。
- **视角11-01**（无跳底入口）：round-01/02 未报告过 auto-scroll/滚动类条目，无根因重合。

## 转 C2 候选（dedup §2 规则，不计入发现）

1. **map choropleth 无图例（legend）**：`MapVisualMapSchema` 仅为色阶配置（min/max/colors/defaultColor，无 `show` 之类声明未实现项），renderer 亦不渲染任何图例——region/pin 按值着色后用户无法从界面读出"颜色↔数值"映射（ECharts visualMap/AntV L7 图例为标配）。属**能力缺失**而非一致性缺陷，登记为 C2 候选。
2. **editor 状态栏空壳**：`scada-editor-canvas.tsx:405-410` statusBar 兜底为永久空 div（CSS 注释自述"M1 占位"，design-undo-redo.md §4.5 声明的视口显示/undo 边界提示未实现）——声明未实现的能力缺口，随本条登记，不计入发现。

## 误报与边界自查（dedup §3/§4）

- **scada 工具箱 +/− 缩放到 0.1/20 边界后不置灰**（`engine/viewport.ts:24-30,87-95` clamp 后静默返回）：与 graph 缩放（[G5-R2-视角3-04]）同象限，但 toolbox 点击后 `handleView` 始终回显视口坐标（有弱反馈）且钳位区间宽、按钮连点到边界需数十次，真实用户影响检验不通过——不报，留此防复核。
- **editor 画布 `tabIndex=0` 无 focus-visible 类**：未移除 UA 默认 outline（存在默认指示），沿 [G7-视角3-15]"存在默认指示 → LOW"先例与 G1-R2 自查口径，低于报告门槛——不报。
- **ai-feedback refresh 在 isProcessing 期间静默 no-op**（`ai-feedback.tsx:142-149`，Failure Path `busy-regenerate` 注释自述）：瞬态窗口内的次要路径死点，真实影响检验勉强——不报，留此防复核。
- **ai-voice-input 权限拒绝/无结果仅走 onError 事件、组件内无反馈**：schema 契约显式声明 onError 为唯一通道（Failure Path `voice-permission-denied`/`voice-no-result`），且无组件内列表可承载——沿 C2 口径不报。
- **ai-conversations 行内重命名无显式取消钮（仅 Esc/blur）**：常见 inline-edit 模式，低于门槛。
- **attachments 计数 span 与 tiptap 内容重叠**：与 [G5-视角4-02] 同一根因同一样式（该条建议已覆盖两条路径），不另立。
- **rich-text tiptap `editable: !(disabled || loading)`**：即 R1 [G5-视角3-01] 已报根因的富文本路径，其建议已明列该处，不重复。
- dimension 09-12（props 契约/marker 视觉/原生 HTML 替代/field 建模）未涉及；视角 9 无新条目（画布 role/label 契约、icon-only 命名均已由 R1 覆盖且本轮未见新缺口）。

## 本轮核对过且不构成发现的疑点（防复核重复提问）

- ai-chat `engineNullSwitch`/`connector-missing` 分支不渲染 sender/header：设计声明的 Failure Path（§Failure Paths），empty/error 均有 i18n + CSS 语义色（styles.css:93-104）。
- graph 搜索 0 命中显示裸 "0" 计数、Enter 无效果：计数反馈存在（`graph-renderer.tsx:580-587`），低于门槛。
- graph 节点选中/搜索命中/语义级均有 CSS 消费（styles.css:33-52），R2 已报其色值字面量问题，无新缺口。
- map loading（Spinner+role=status）/empty（i18n + region 兜底）/retry 按钮结构完整；R1/R2 已报其错误层颜色与 role 缺口。
- scada inspector `nop-scada-editor-field-error` 有 danger 令牌样式（editor/styles.css:156-160）；json-editor parse 失败不写库有局部错误提示——边缘态闭环。
- scada palette `aria-disabled` 样式已备（editor/styles.css:151-154）；空场景 overlay 有 i18n 提示且 `pointer-events:none`。
- ai-conversations 空列表/重命名/删除确认、ai-sender Stop/Send、ai-message-list error/aborted/loop-limit、ai-citations 无 source 空卡片、ai-tool-call 无 handler 禁用+title、ai-welcome/suggestions/prompts/token-usage 空态——R1/R2 已覆盖或本轮核对通过，无新发现。
- ai/g 包生产代码 grep 调色板类（red-/blue-/gray- 等）零新命中；文本字符图标 grep 仅剩 R1 已报实例（graph ×、ai ‹›/✎/×）。

## 覆盖记录

- **flux-renderers-ai（源码口径）**：组合面精读——ai-chat（engine 注入/null 切换/projection/事件桥全文）、ai-message-list、ai-sender（含 extension 分支）、ai-attachments（全文）、ai-conversations、ai-feedback、ai-suggestions、ai-prompts、ai-tool-call（含 ApprovalFooter/focus trap/highlightJson）、ai-welcome、ai-citations、ai-token-usage、ai-voice-input（全失败路径）、user-edit、bubble renderers（loading/error/image/tools/data-part/reasoning/text）、rich-text（tiptap-sender 全文、tiptap-sender-surface、template-bar、suggestion-popup）、adapters/use-auto-scroll、styles.css 全文；engine/adapters 逻辑面定向 grep（aborted/loading/disabled/className 输出）确认无未检 UI 表面。
- **flux-renderers-graph**：graph-renderer 全文复读（搜索/缩放/控制簇/空态/句柄）、graph-node、styles.css；xyflow-canvas/graph-store/graph-search 定向复查；静态口径。
- **flux-renderers-map**：map-renderer 全文复读（loading/empty/error/主题/图层装配）、schemas 全文、map-color/layer-manager/geojson 定向 grep（legend/visualMap 消费面）；静态口径。
- **flux-renderers-industrial（含 src/editor/）**：scada-editor-canvas 全文复读（region 兜底/键盘层/disabled 门控/drop 校验）、toolbox-panel/inspector-panel/inspector-field/editor-palette 全文、editor/styles.css 全文、engine/viewport.ts（缩放钳位）、disabled-meta/affordance/reactivity 测试断言面核对、runtime scada-canvas 的 disabled 契约对照、symbols/sensor-control/button 抽读；其余序列化/binding 纯逻辑文件经 disabled/focus/wrap/overflow 定向 grep 复核无新 UI 表面；静态口径。

## G6 — @nop-chaos/ui 62 模块（HIGH 1 / MEDIUM 0 / LOW 0，共 1 条）

### [G6-R3-视角6-01] Drawer `resizable` 拖拽缩放是死链：把手全套 resize 供龄（光标/hover/aria-label），但尺寸变量无任何消费方，拖动后抽屉分毫不变

- **文件**: `packages/ui/src/components/ui/drawer.tsx:143-149,178,183-195,306-311`（消费链: `packages/flux-react/src/dialog-host.tsx:455,519`；schema 声明: `packages/flux-renderers-basic/src/schemas.ts:108`、`surface-renderer-definitions.ts:228,246`）
- **证据片段**:
  ```tsx
  // drawer.tsx:144-149 — 拖拽结果只写入自定义 CSS 变量
  const resizeStyle: React.CSSProperties = resizeController.sizeVar
    ? ({
        ['--drawer-resize-size' as string]: resizeController.sizeVar,
        ...resolvedStyle,
      } as React.CSSProperties)
    : resolvedStyle ?? {};
  // drawer.tsx:178 — 承载该变量的元素没有任何宽/高类消费它
  className={cn('group/drawer-content flex h-full flex-col', className)}
  // drawer.tsx:137-140 — 把手呈现完整"可拖拽"供龄
  direction === 'left' && 'right-0 top-0 h-full w-1 cursor-ew-resize',
  ```
- **严重程度**: HIGH
- **现状**: `resizable: true` 时（surface schema 公开能力，designer 可编辑，`dialog-host.tsx:519` 真实消费）渲染出带 `cursor-ew-resize`、`hover:bg-muted/40`、`role="separator"` + `aria-label="调整大小"` 的拖拽把手；`useDrawerResize` 的指针逻辑完整运行（pointer capture、窗口级 move 监听、`Math.max(160, …)` 钳制），终点是 `setSize → sizeVar → style["--drawer-resize-size"]`。但全仓 grep 证实：① `--drawer-resize-size` 仅此一处出现（setter），没有任何 CSS 规则/类消费它（自身 className 无 `w-(--drawer-resize-size)`，定位宽度 `w-3/4 sm:max-w-sm` 写在父级 Popup 上）；② `[data-resizable]` 属性无任何样式/逻辑消费方；③ `nop-drawer` 在全仓 CSS 中零规则。结果：用户拖动把手，状态在更新、变量在变化，抽屉宽度/高度分毫不变——交互结果恒为零。关联提示：round-01 [G6-视角3-03]（同一把手键盘不可达）建议"复用 useDrawerResize 的 setSize 通道"——该修复需以本条为先决（setSize 通道本身不产生视觉结果）。边界说明：round-01 G1 组曾把 dialog `draggable`/`allowFullscreen` "声明未实现"归入转 C2；本条不同——`resizable` 已被组件层消费（把手真实渲染、指针逻辑真实运行），缺陷是消费链最后一环（CSS 变量 → 几何）断裂，属已实现能力内的功能缺陷。
- **行业惯例**: shadcn/ui 生态的可拖拽把手（react-resizable-panels 的 `ResizableHandle`、vaul Drawer 的 snap 把手）拖动即产生可见尺寸变化；Base UI Dialog 自带的 CSS 变量消费模式（如 `--available-height`）也均被内置类消费。"呈现拖拽供龄但拖动无效果"在 Ant Design Drawer（resize.minWidth/onResize 回调驱动真实宽度）与 MUI Drawer 场景中均不成立。
- **用户影响**: 宿主开启 `resizable: true` 的抽屉（侧栏详情、可调宽面板等）里，用户把鼠标移到把手看到 ew-resize 光标与 hover 高亮，拖动后抽屉纹丝不动，重试数次后判定"把手是坏的"；读屏用户聚焦把手听到"调整大小"后按提示方向操作同样无果。触发面受 `resizable: true` 配置限制，但一旦配置即 100% 复现且无任何替代手段完成该操作。
- **建议**: 三步修复：① 让宽度真正消费变量——在 `DrawerPrimitive.Popup` 或 `DrawerPrimitive.Content` 的类串按方向追加 `data-[swipe-direction=left]:w-(--drawer-resize-size) data-[swipe-direction=right]:w-(--drawer-resize-size)`（top/bottom 用 `h-(--drawer-resize-size)`），并把 `resizeStyle` 上移到 Popup（现宽度类在 Popup、变量在 Content，层级错位）；② `useDrawerResize` 增加 max 钳制（左右 ≤ `sm:max-w-sm` 对应值或容器宽，bottom ≤ 80vh）防止修复后拖拽溢出视口；③ 补一条 DOM 断言测试（pointer 拖动后 `getBoundingClientRect().width` 变化），并顺带闭合 round-01 [G6-视角3-03] 的键盘步进（其 setSize 建议在本条修复后才可生效）。
- **复核状态**: 未复核

---

## 去重自检（与 R1 127 条 + R2 63 条逐根因比对）

- **[G6-R3-视角6-01] ≠ [G6-视角3-03]**（R1，Drawer 把手键盘不可达）：根因分别为"键盘操作路径缺失"与"指针操作链路终点断裂（变量无消费方）"；修 R1 不治愈本条，修本条是修 R1 的先决。同组件不同根因，按新发现上报。
- **[G6-R3-视角6-01] ≠ [G6-R2-视角6-01]**（R2，DrawerBody 无滚动契约）：根因分别为 body 滚动类缺失与 resize 尺寸变量无消费方。
- **[G6-R3-视角6-01] ≠ R1 G1 转 C2 #2**（dialog `draggable`/`allowFullscreen` 声明未实现）：`resizable` 已实现到把手与指针逻辑层，属"已实现能力断裂"而非"声明未实现"；如复核倾向按 C2 归类，请与本条对照裁定（本组立场：功能缺陷，留在发现清单）。
- 其余本轮全部候选（Sheet 无 Body 原语、Sheet bottom 无 max-h、ComboboxList/CommandList `no-scrollbar`、carousel `onKeyDownCapture`、`item.tsx` ItemGroup `role="list"`、breadcrumb Page `role="link" aria-disabled`、`isEditableTarget` 覆盖面、pagination `data-active` 布尔序列化）均未达"新发现"门槛——或上游 shadcn 逐字一致、或现网消费方已自行兜底、或真实用户影响检验不通过，明细见下节。

## 本组核对过且不构成发现的疑点（防复核重复提问）

- **Sheet 无 SheetBody 原语 / bottom 无 max-h**: SheetContent（`h-full`/`h-auto`）确实没有 Dialog 式 body 滚动契约，但三个现网消费方（kanban-activity-log `flex-1 overflow-y-auto`、select-mobile `max-h-[80vh]` + 内滚、sidebar `SidebarContent overflow-auto`）均已自行兜底，无现网用户影响； DrawerBody 高危条目为"原语存在但缺类"，本条为"原语缺失但消费方自洽"，性质更弱，仅建议后续补 `SheetBody`（不立案）。
- **ComboboxList/CommandList `no-scrollbar` + `overflow-y-auto`**: 有意隐藏滚动条（可滚、键盘/滚轮可用），设计取舍而非缺陷。
- **carousel `onKeyDownCapture` 方向键劫持**: `isEditableTarget`（`lib/focus-target.ts`）已覆盖 input/textarea/select/contenteditable/slider/spinbutton，幻灯片内表控的方向键行为有守卫；非编辑型控件内嵌 carousel 属低频组合。
- **sidebar mobile sheet `[&>button]:hidden`（隐藏内建关闭钮）**: 与上游 shadcn sidebar 移动端实现逐字一致（遮罩点击关闭兜底）。
- **`item.tsx` ItemGroup `role="list"` 子项无 listitem / breadcrumb Page `role="link" aria-disabled`**: 均为上游 shadcn 逐字一致范式，沿 R2"上游一致不报"先例。
- **AlertDialogAction 点击不关弹窗**: R1 [G6-视角6-01] 已报，本轮确认仍未修复，归并不重复。
- **悬空 CSS 变量排查**: `--dialog-size-xs/sm/base/md/lg/xl`、`--dialog-content-border-radius`、`--dialog-top-offset`、`--dialog-body-padding-x`、`--dialog-footer-gap`、`--dialog-footer-button-min-width`、`--dialog-title-font-size`、`--dialog-overlay-bg`、`--surface-overlay` 在 `theme-tokens/src/styles.css` 全部有定义（沿 R2 table-row 令牌核对方法）；`--drawer-snap-point-offset`/`--drawer-swipe-movement-*` 为 Base UI 内部变量且带 0px 回退。
- **暗色 token 双源 / i18n 硬编码 / 焦点环 / icon-only 无名**: 全量 grep 零新命中（badge success/warning、SidebarRail、CommandDialog、Spinner、InputGroupAddon、Card、DialogHeader、MenubarTrigger、combobox 族均为 R1/R2 已报条目）。

## 检查范围与方法

- **范围**: `packages/ui/src/components/ui/` 62/62 非 test 模块（含 `direction.tsx`、`sidebar-context.tsx`、`use-dialog-drag.ts`、`wrap-surface-tab-focus.ts`、`table-row-class-name.ts` 五个逻辑件），无未扫模块；`*.test.*` 按口径不在范围。
- **方法**: ① 32 个 UI 组件文件全文逐行重读（重点：drawer/dialog/sheet/alert-dialog/combobox/select/command/menubar/context-menu/dropdown-menu/navigation-menu/carousel/chart/field/input-otp/json-viewer/sonner/sidebar-layout/sidebar-menu/table/pagination/kbd/skeleton/separator/aspect-ratio/breadcrumb/empty/label/scroll-area/item/card/tooltip）；② 30 个已由 R1/R2 深查且本轮 grep 复核零新命中的文件按定向 grep 归档（focus-visible/aria/i18n/调色板类/hex/rgba/oklch/var(--…) 悬空变量）；③ 消费链交叉核实：drawer resizable 链路追至 `dialog-host.tsx`/`surface-renderer-definitions.ts`/`schemas.ts` 并全仓反查变量消费方（3 组 grep 证实死链）；Sheet 消费方 5 处逐一核实滚动兜底；Base UI 1.3.0 语义沿 R2 已核实结论，未重复核对。
- **静态口径声明**: 本轮为源码静态审查（无浏览器运行时验证）；[G6-R3-视角6-01] 的"拖动无效果"结论基于变量消费方零命中的全仓 grep 事实 + 类串推理，建议复核阶段以 Playwright 拖拽断言确认。

## 结论

新发现 **1 条**（HIGH 1 / MEDIUM 0 / LOW 0）。R1+R2+R3 累计 191 条。G6 组经三轮（16+6+1）后盲区清单各项均已闭合，残余候选全部落"核对过不立案"。

## G7 — playground 19 页（HIGH 0 / MEDIUM 3 / LOW 5，共 8 条）

### [G7-R3-视角4-01] advanced-query 日期范围筛选未启用 clearable，范围选定后无任何清空路径

- **文件**: `apps/playground/src/complex-pages/page-schemas/advanced-query.json:56-61`（对照同文件 `:40-47`、`:48-55` 两个 select 均有 `clearable: true`）
- **证据片段**:
  ```json
  // :56-61 —— 同一查询表单里唯一没有 clearable 的筛选器
  {
    "type": "date-range",
    "name": "dateRange",
    "label": "创建时间",
    "placeholder": "选择日期范围"
  },
  // :41-47 —— 同表单的 select 兄弟节点
  { "type": "select", "name": "status", "label": "状态", "dict": "userStatus",
    "clearable": true, "placeholder": "全部状态" },
  ```
  ```tsx
  // packages/flux-renderers-form/src/renderers/date-range-renderer.tsx:99,420 —— 渲染器支持且默认关闭
  const clearable = props.props.clearable === true;
  ...
  {clearable && hasValue && presentation.interactive ? ( /* XIcon 清除按钮 */ ) : null}
  // packages/flux-renderers-form/src/schemas.ts:395 —— DateRangeSchema.clearable?: boolean 合法
  ```
- **严重程度**: MEDIUM
- **现状**: 渲染器与 schema 均支持 `clearable`（含清除按钮渲染分支），但 advanced-query 的 date-range 未配置，缺省为 false——用户选定日期范围后，控件上不出现清除按钮，也没有任何一键回到"全部时间"的路径；而同一查询表单里的"状态""角色"两个 select 都配置了 `clearable: true` 且 placeholder 语义为"全部状态/全部角色"。date-range 是该表单中最难重设的筛选器（需重新弹出并改写两端日期），却唯一不可清空。这是第 2 轮 [G7-R2-视角4-01]（tree-crud input-tree 未启用 clearable 致筛选锁死，MEDIUM）的同根因新实例：同一"筛选器可施加必须可撤销"契约在另一页面、另一控件类型上再度缺失。
- **行业惯例**: Ant Design RangePicker 标配 allowClear；shadcn/ui 日期筛选惯例提供清除动作回到"全部"；同表单内筛选器的可清空能力应一致（本表单自己已经用两个 select 确立了该基线）。
- **用户影响**: 用户按创建时间筛出一批用户后想看全部数据：状态、角色都能一键清掉，日期范围只能重新打开选择器手动改写，或者刷新页面。用户会认为日期筛选"坏了"或"故意的"，在两个能清、一个不能清的并排控件间反复尝试。通过真实用户影响检验。
- **建议**: 在 `advanced-query.json:60` 的 date-range 节点补 `"clearable": true`（渲染器零改动即出现清除按钮）；同时全量复查其余 18 页的 date-range/date 筛选器 clearable 配置，与 [G7-R2-视角4-01] 的 input-tree 修复同批落地（树筛选 + 日期筛选 = 本仓仅有的两个不可清空筛选器实例）。
- **复核状态**: 未复核

---

### [G7-R3-视角4-02] advanced-query / tree-crud 部门列渲染原始部门 ID（d1/d1-1），同表角色/状态列均为中文标签

- **文件**: `apps/playground/src/complex-pages/page-schemas/advanced-query.json:76-84`；`apps/playground/src/complex-pages/page-schemas/tree-crud.json:79-88`；`apps/playground/src/complex-pages/shared/mock-backend.ts:148-163,285`
- **证据片段**:
  ```json
  // advanced-query.json:80-82 —— 同一 columns 数组：role 走 label、deptId 走原始值
  { "name": "role.label", "label": "角色", "width": 100 },
  { "name": "status_label", "label": "状态", "width": 90 },
  { "name": "deptId", "label": "部门", "width": 110 },
  ```
  ```ts
  // mock-backend.ts:150-162 —— toUserListRecord：role/status 都做了 {value,label} 映射，deptId 原样透传
  role: { value: record.role, label: ROLE_LABELS[record.role] ?? record.role },
  status_label: STATUS_LABELS[record.status] ?? record.status,
  ...
  deptId: record.deptId,            // 'd1' | 'd1-1' | ...（:285 deptId: deptIds[i % deptIds.length]）
  ```
- **严重程度**: MEDIUM
- **现状**: mock 层为 role/status 建立了完整的 value→label 映射（`role.label`、`status_label`），唯独 deptId 无任何标签映射，两张以部门为筛选/展示主题的页面表格里"部门/部门ID"列整列渲染 `d1`、`d1-1-2` 这类内部 ID，与同行的中文"角色/状态"列形成刺眼反差。用户通过左侧部门树（显示"研发中心/前端组"等中文名）筛选后，表格部门列显示的却是 `d1-1`，两边对不上号。第 1 轮 [G7-视角4-17] 已报 tree-crud 过滤回显行显示原始 ID（LOW）；本条是其数据面兄弟实例——根因从"回显表达式"变为"列表数据无部门标签映射"，波及整列 30+ 行，且 advanced-query 的列头就叫"部门"（非"部门ID"），显示 ID 属明确缺口。
- **行业惯例**: AG Grid/Ant Design Table 的外键列惯例渲染关联实体名称（或 value+label 复合对象）；本仓 mock 自己已经为 role/status 确立了 `{value,label}` / `*_label` 的正确先例，deptId 是同一响应模型中唯一的漏网字段。
- **用户影响**: 用户在部门树里点"前端组"，表格"部门"列显示 `d1-1-2`，无法确认筛选是否生效；导出/核对场景下部门列完全不可读。通过真实用户影响检验。
- **建议**: 在 `toUserListRecord` 中补 `dept_label`（按 `db.depts` 查表，`DEPT_LABELS[record.deptId] ?? record.deptId`，与 :159 的 ROLE_LABELS 写法同构），两页列改为 `{ "name": "dept_label", "label": "部门" }`；tree-crud 的列头可一并从"部门ID"改为"部门"。该映射同时天然修复 [G7-视角4-17] 的回显行（可在其修复中复用同一查表表达式）。
- **复核状态**: 未复核

---

### [G7-R3-视角11-01] sundial-workbench 侧边栏计数与压力卡数字同屏自相矛盾，且与 settings/analytics 跨页矛盾

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:145,358,442,526,610`（侧边栏计数）、`:843-972`（压力卡图例）、`:1057,1198,1339,1416,1493`（分区 count）、`:1589,1658`（完成/垃圾箱计数行）；对照 `sundial-settings.json:1445`、`sundial-analytics.json:100`
- **证据片段**:
  ```json
  // :883-886 / :905-908 / :906-972 —— 压力卡写死：逾期 3、今天 5、未来 4、无日期 2、总计 14
  { "text": "逾期", ... }, { "text": "3", "className": "text-[10px] text-[#d25151] sd-mono" }
  ...
  { "text": "总计", ... }, { "text": "14", ... }
  // :990-1058 —— 但"逾期"分区 count 为 "1"，且只渲染 1 行任务
  { "key": "overdue", "title": "逾期", ..., "tone": "danger", "count": "1" }
  // :610 侧边栏 —— "已完成 6"；:1589 完成看板却自述 ——
  { "text": "共 2 条已完成任务", ... }
  ```
- **严重程度**: MEDIUM
- **现状**: 同一工作台首屏上三套数字互斥：① 侧边栏（工作台 14 / 全部 14 / 今天 5 / 计划 4 / 已完成 6）；② 压力卡（逾期 3 / 今天 5 / 未来 4 / 无日期 2 / 总计 14）；③ 实际分区列表（逾期 1、今天 2、未来 2、无日期 1、待整理 1，共 7 行未完成任务，另有已完成 2、垃圾箱 1）。切到"已完成"视图，侧边栏仍显示"已完成 6"，而看板列出 2 条并自述"共 2 条已完成任务"。mock 源头同样分裂：`Sundial__pressure` 返回 3/5/4/2（showcase-env.ts:527-539），而任务库 `createSundialTasks` 实际为逾期 1/今天 3/未来 2/无日期 1/完成 2（mock-backend-sundial.ts:34-45）；`Sundial__summary.todayCompleted=6`（showcase-env.ts:485）又与任务库 done=2 矛盾——analytics 页"今天完成 6 件"与 workbench"共 2 条已完成"跨页互斥。sundial-settings"10 条任务 / 4 个列表"（:1445）与任务库一致，反证 14/5/6 系陈旧数据。判定说明：属静态演示数据集间不一致，非交互断链，故 MEDIUM。
- **行业惯例**: 同屏计数必须同源（TodoMVC/TickTick 的侧栏计数=列表过滤结果数；Ant Design Pro 概览卡与明细列表数字一致）；数字互相矛盾的仪表盘在所有参照系统中都按完成度缺陷处理。
- **用户影响**: 用户看到压力卡"逾期 3"，展开逾期分区只有 1 条、计数徽标也是 1；点"已完成"看到侧栏 6、列表 2——同一界面两个答案，无法判断哪个可信，对整个看板的数字失去信任。通过真实用户影响检验。
- **建议**: 以 `createSundialTasks` 任务库为唯一事实源重新推导全部静态数字：侧边栏 14→10（或 9 未删）、今天 5→3、计划 4→3、已完成 6→2；压力卡 3/5/4/2→1/3/2/1（总计 7），并补齐看板缺失的 t10「和家人看展览」行；`Sundial__summary.todayCompleted` 6→2、`Sundial__pressure` 改为由任务库实时聚合（`filterSundialTasks` 已具备该能力）。
- **复核状态**: 未复核

---

### [G7-R3-视角11-02] form-wizard 确认步「角色」回显原始枚举值 admin/user/guest 而非字典标签

- **文件**: `apps/playground/src/complex-pages/page-schemas/form-wizard.json:115-119`；`apps/playground/src/complex-pages/shared/mock-backend.ts:448-452`
- **证据片段**:
  ```json
  // form-wizard.json:116-118 —— 确认步直接输出 step2.role 存储值
  {
    "type": "text",
    "text": "角色：${wizardData.step2.role || \"-\"}",
  ```
  ```ts
  // mock-backend.ts:448-452 —— 该字段的展示标签明明存在（step2 的 select 即经 dict="role" 渲染中文）
  export const DICT_ROLE = [
    { label: '管理员', value: 'admin' },
    { label: '用户', value: 'user' },
    { label: '访客', value: 'guest' },
  ];
  ```
- **严重程度**: LOW
- **现状**: 第二步"角色"下拉经 `dict: "role"` 渲染为"管理员/用户/访客"，确认核对页却直接插值存储值 `admin/user/guest`——用户在第二步选"管理员"，核对页显示"角色：admin"。第 1 轮 [G7-视角4-17]（tree-crud 过滤回显原始 ID）已确立"回显必须用人类可读标签"的发现根因；本条是该根因在 form-wizard 确认步的新实例（不同页面、不同控件）。与第 2 轮 [G7-R2-视角11-02]（该页部门字段未回显、未提交）互补：dept 是"整字段漏掉"，role 是"字段在但值未翻译"，两个根因不同，需分别修复。
- **行业惯例**: Ant Design Steps/向导确认页惯例回显 `label`（或经 valueEnum 反查）；shadcn multi-step 演示同样回显选项文案而非 value。确认页的使命就是让用户核对所见即所得。
- **用户影响**: 用户核对信息时看到没见过的英文枚举值，无法确认"admin 是不是我刚选的那个"，核对环节失去意义；与第二步显示的中文名互相矛盾。通过真实用户影响检验（影响限于一行核对文案，故 LOW）。
- **建议**: 确认行改为按字典查表的表达式（与 [G7-R2-视角11-02] 建议的 deptId 查表模式同款）：`${wizardData.step2.role === 'admin' ? '管理员' : wizardData.step2.role === 'user' ? '用户' : wizardData.step2.role === 'guest' ? '访客' : '-'}`，或在 mock 暴露 `role_label` 后直接插值。修复 [G7-R2-视角11-02] 时建议同批处理（同一确认步 fieldset）。
- **复核状态**: 未复核

---

### [G7-R3-视角11-03] tree-crud 启用 selection 但全页无任何批量动作消费选择集

- **文件**: `apps/playground/src/complex-pages/page-schemas/tree-crud.json:73-88`（全文 94 行无 toolbar/listActions）；对照 `standard-crud.json:170-189`
- **证据片段**:
  ```json
  // tree-crud.json:73-79 —— 表格启用行选择，页面再无任何消费选择集的节点
  {
    "type": "crud",
    "id": "tree-crud",
    "testid": "tree-crud-table",
    "rowKey": "id",
    "source": "${usersDS}",
    "selection": {},
  // 对照 standard-crud.json:170-189 —— 同一能力配对批量删除：listActions + $crud.selectedRowKeys
  "listActions": [ { "type": "button", "label": "批量删除", ...
    "data": { "ids": "${$crud.selectedRowKeys}" }, ...
  ```
- **严重程度**: LOW
- **现状**: `selection: {}` 使表格渲染表头全选框与每行复选框，但整张页面（部门树 + 表格，共 94 行）没有任何 `listActions`/toolbar/按钮引用 `$crud.selectedRowKeys`——勾选与全选是纯死交互。这是"邀请交互但无闭环"家族（第 1 轮 [G7-视角11-14] 添加子任务输入无提交路径、第 2 轮 [G7-R2-视角11-07] workbench 搜索框无消费方）在表格选择面上的新实例。对照 standard-crud：同一 selection 能力标配了"批量删除"按钮，说明本仓 selection 的既定用法就是承载批量动作。
- **行业惯例**: AG Grid/Ant Design Table 启用行选择即提供批量操作栏（或显式说明选择用途）；无消费方的选择框在数据表格惯例中视为未完成的能力暴露。
- **用户影响**: 用户勾选几行、点了全选，期待出现批量操作，界面毫无响应也无处查看已选集合——只能猜测复选框是装饰。通过真实用户影响检验（该页为部门筛选演示页，选择非主路径，故 LOW）。
- **建议**: 二选一：① 删除 `"selection": {}`，页面回归纯筛选浏览定位（最小改动）；② 补一个消费选择集的 listAction（如 `"批量删除"`，照抄 `standard-crud.json:170-189` 结构，`User__delete` 已支持 `ids` 数组入参）。
- **复核状态**: 未复核

---

### [G7-R3-视角11-04] dashboard「今日订单」KPI 恒为 0（mock createTime 2024-07 与运行时"今天"不匹配）

- **文件**: `apps/playground/src/complex-pages/page-schemas/dashboard.json:142-155`；`apps/playground/src/complex-pages/shared/showcase-env.ts:401-403`；`apps/playground/src/complex-pages/shared/mock-backend.ts:227-229,310`
- **证据片段**:
  ```json
  // dashboard.json:147-151 —— 第二张 KPI 卡
  { "text": "今日订单", "className": "text-xs text-muted-foreground font-medium" },
  { "text": "${summary?.todayOrders ?? 0}", "className": "text-3xl font-bold leading-none" },
  ```
  ```ts
  // showcase-env.ts:402-403 —— "今日"按运行时真实日期过滤
  const today = nowStamp().slice(0, 10);
  const todayOrders = db.orders.filter((o) => o.createTime.startsWith(today)).length;
  // mock-backend.ts:228 —— 但订单时间戳全部生成为 2024-07-xx，永不等 today
  return `2024-07-${pad2((day % 31) + 1)} ${pad2(8 + (hour % 12))}:${pad2(min % 60)}:00`;
  ```
- **严重程度**: LOW
- **现状**: "今日订单"是仪表盘六张 KPI 卡的第二张，但其数据链路注定恒等于 0：mock 订单的 `createTime` 全部硬编码在 2024-07，而 `Dashboard__summary` 用运行时当天日期（`nowStamp()`，随真实时钟走）做前缀匹配——任何日期打开页面该卡都是"今日订单 0"。同卡片区"累计订单 30 / 待付款 N"等均有真实数值，唯独这一张是死数字，且与"最近订单"列表里订单排布（2024-07）视觉上无关联。属"看起来完整实际发虚"的数据真实度缺口：卡片永远呈现最坏值，用户无法区分"今天确实没单"与"统计坏了"。
- **行业惯例**: 演示/样例仪表盘（Grafana sample dashboards、Ant Design Pro mock）惯例让相对时间类指标（今日/本周）基于随当前时钟滚动的数据集生成，避免"今日"类指标呈永久零值。
- **用户影响**: 用户看到"今日订单 0"不会立刻怀疑数据集，但对照"累计订单 30"与活跃/待付款数值会感到矛盾；作为演示页，第二张 KPI 永久归零削弱了"实时业务概览"副标题的可信度。通过真实用户影响检验（非阻断、无操作失败，故 LOW）。
- **建议**: 让 mock 订单时间戳相对当前时间生成：`ts()` 改为 `now - (30-i)天`（如 `new Date(Date.now() - (29 - i) * 86400000)` 格式化），使最近订单落入"今天"，`todayOrders` 自然非零；或最低限度在 `Dashboard__summary` 中将 `todayOrders` 改为聚合近 24h 订单并同步调整 createTime 生成窗口。运行时行为建议复核阶段以 Playwright 快照确认（本轮为静态推断，置信度高：`startsWith(today)` 与字面 `2024-07` 前缀不可能相交）。
- **复核状态**: 未复核

---

### [G7-R3-视角7-01] sundial-workbench 已完成看板「昨天」徽标复用红色 error 语义

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:1567-1585`（对照 `:1554-1558`、`:1041-1045`）；`apps/playground/src/sundial-replica/sundial-replica.css:102-105`
- **证据片段**:
  ```json
  // :1575-1584 —— 已完成看板第 2 行：划线完成任务 + 红色 error 徽标
  { "type": "text", "text": "采购办公耗材",
    "className": "flex-1 min-w-0 text-sm text-[#636363] line-through truncate" },
  { "type": "text", "text": "昨天", "className": "sd-badge sd-badge-error" }
  // :1554-1558 —— 同看板第 1 行「今天」用 brand（正确基线）
  { "type": "text", "text": "今天", "className": "sd-badge sd-badge-brand" }
  ```
  ```css
  /* sundial-replica.css:102-105 —— error 徽标 = 红色警示 */
  .sd-badge-error {
    background: rgba(210, 81, 81, 0.08);
    color: var(--sd-error);
  }
  ```
- **严重程度**: LOW
- **现状**: 已完成看板中"采购办公耗材（昨天完成）"的日期徽标使用 `sd-badge-error`（红），与逾期分区"整理季度报税材料 昨天"（:1043-1045）用同一红色样式。同页红色的既定语义是逾期/危险/已删除（逾期徽标、"已删除"徽标、垃圾箱横幅）；一条已划线完成的历史任务挂红色警示徽标，与同看板"今天"的 brand 徽标并排，红/橙对比暗示"这条有问题"。mock 数据源将完成任务的 `dueTone` 留为 `'overdue'`（mock-backend-sundial.ts:42），schema 照抄了该 tone——完成态未收敛日期徽标的语义色。
- **行业惯例**: Todo 类应用（TickTick/Things）完成任务的日期徽标一律转中性/成功色，红色仅保留给未完成的逾期项；iOS HIG/HIG 派生规范中红色 = 破坏性/警示，不用于已完成条目的时间戳。
- **用户影响**: 用户在"已完成"归档列表里看到红色"昨天"徽标，第一反应是该任务出了问题（逾期未办？），与划线完成的视觉自相矛盾；红色警示在该列表中失去预警价值。通过真实用户影响检验（单条目、次要视图，故 LOW）。
- **建议**: `:1583` 的徽标类改为中性：完成项日期统一 `sd-badge sd-badge-neutral`（或沿用 brand 与第 1 行一致）；若保留按 dueTone 上色的机制，应在 done 分支覆写为 neutral（数据侧 `createSundialTasks` t8 的 `dueTone` 改 `'none'` 亦可，但 schema 侧改类更直接）。
- **复核状态**: 未复核

---

### [G7-R3-视角6-01] workbench 任务详情日期选择器初始选中值（今天）与行内徽标回退值（8/18）不一致

- **文件**: `apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:1790-1795,1815-1830`
- **证据片段**:
  ```json
  // :1791-1794 —— 行内徽标的回退显示
  { "type": "text",
    "text": "${taskDetailDate ?? '8/18'}",
    "className": "sd-badge sd-badge-warning ml-auto", ... },
  // :1816-1818 —— 打开选择器时表单的初始选中值回退却是另一个值
  "data": { "taskDetailDate": "${taskDetailDate ?? '今天'}" },
  ...
  "options": [
    { "label": "今天", "value": "今天" }, { "label": "明天", "value": "明天" },
    { "label": "下周", "value": "下周" }, { "label": "无日期", "value": "无日期" } ]
  ```
- **严重程度**: LOW
- **现状**: 任务详情对话框的日期字段行首次显示"8/18"（徽标回退值），但点开后选择器的预选中项是"今天"（表单回退值 `'今天'`），且选项列表（今天/明天/下周/无日期）中根本不存在"8/18"——用户看到的当前值在弹层里不可见，弹层里预选的又是一个与显示值不同的值。对照同仓 detail 页同场景的正确写法（`sundial-detail.json:148`/`:202`：徽标回退 `'8/18'` ↔ 表单回退 `"2026-08-18 14:00"`，显示值与预选值同源一致），workbench 这对回退值是脱节的。后果：用户只想查看当前日期而打开弹层，直接点"确定"，显示值无操作地从"8/18"变为"今天"。
- **行业惯例**: 受控选择器的预选值必须等于当前生效值（shadcn Select/Radix 惯例：打开即高亮当前项）；显示值不在选项集内时应在弹层中以"当前：X"呈现或将其纳入选项。
- **用户影响**: 查看型打开（最高频动机）会得到一个错误的高亮项；一次顺手的确认就在用户无意图的情况下改写了任务日期，且界面上没有任何"值已变化"的提示。通过真实用户影响检验（单对话框、需确认才生效，故 LOW）。
- **建议**: 两处回退值对齐：将 `:1817` 的表单回退改为与显示一致的锚点（如选项集增加 `{ "label": "8/18", "value": "8/18" }` 并以 `"${taskDetailDate ?? '8/18'}"` 作为预选回退），或将徽标回退值改为"今天"使两者一致（照抄 `sundial-detail.json:148,202` 的同源写法亦可）。sundial-todo-dialog 页同族选择器（radio 值与行内回退同源枚举）可作为对齐参照。
- **复核状态**: 未复核

---

## 去重自检记录（与 round-01/round-02 全部 190 条按根因比对）

- **视角4-01**（date-range 无 clearable）← [G7-R2-视角4-01]（tree-crud input-tree 无 clearable）：同根因（筛选器 clearable 未启用致筛选态锁死）的新实例（不同页面、不同控件类型），按 dedup §1"同类根因新实例算新发现"上报；R2 条目的修复建议仅覆盖 input-tree，不会治愈本处。
- **视角4-02**（部门列原始 ID）← [G7-视角4-17]（tree-crud 回显行显示 d1）：回显行 vs 表格列数据面，根因分别为"回显表达式取 value"与"列表数据无部门标签映射"，且 R1 条目未覆盖 advanced-query；上报并在条目内注明修复可复用同一查表表达式。
- **视角11-01**（workbench 数字自相矛盾）≠ [G7-视角11-12]（settings 同步状态卡与 mode 不联动）：彼条是"静态文案与活交互脱节"，本条是"多组静态数字/数据集互斥"，页面与根因均不同。
- **视角11-02**（wizard 角色原始值回显）← [G7-视角4-17] 同根因新实例；≠ [G7-R2-视角11-02]（同页部门字段未回显/未提交）：漏字段 vs 值未翻译，两根因并存于同一确认步，建议同批修复。
- **视角11-03**（selection 无消费方）← [G7-视角11-14]/[G7-R2-视角11-07]（"邀请交互但无闭环"家族）的新实例（表格选择面）；对照 standard-crud 的标配批量删除确立消费契约。
- **视角11-04 / 视角7-01 / 视角6-01**：经逐条比对，R1/R2 的 190 条中无同组件同根因条目（dashboard 数据真实度、sundial 语义色误用、workbench 选择器初始态均为首次覆盖）。

## 转 C2 候选（dedup-baseline §2 规则，不计入发现）

无。本轮 8 条均为已实现能力的一致性/完成度缺陷，未撞见 G-A~G-M 已登记缺口的新表象；视角11-01 的修复属数据对齐而非"状态驱动绑定原语"（G-F）范畴——静态数字写错值即使 G-F 落地也不会自愈。

## 本轮明确核对过且不构成发现的疑点（防复核重复提问）

- **其余 queryForm 的筛选器一致性**：standard-crud/approval-tasks 的 select 均已 `clearable: true` + "全部状态" placeholder，与 advanced-query 一致；keyword 输入框全仓统一不配 clearable（文本可键入清空），弃报。
- **排序配置**：advanced-query（id/name/createTime sortable）与 standard-crud（name/createTime）均为 `loadAllData: true` 客户端排序，能力可用；其余页面不配 sortable 属每表设计取舍，非不一致。
- **validation/required**：complex-form 的 `phone required:"${notify}"` 有 placeholder 自释、"company required 企业态"随 visible 自解释；form-wizard/business-document/master-detail 新增表单 required 集合与提交链一致；校验文案 i18n 问题已由 R1 [G2-视角9-02] 在 renderer 层覆盖，schema 层无新实例。
- **加载/错误 schema 态**：R2 已确认"error/loading schema 态无 schema 级新实例，由 renderer 层覆盖"（round-02 G7 检查范围节）；本轮复核 dashboard/detail-subtables/tree-crud 的 source 驱动表格空态文案齐全，维持该结论。
- **Budget\_\_save 后"年度合计"是否失真**：`Budget__find` 服务端重算 total（showcase-env.ts:358-364）+ quickSaveItemAction `then: component:refresh`（inline-edit-table.json:31），保存后合计正确刷新——非缺陷。
- **business-document `rowKey:"name"` 重名冲突**：沿 R2 去重备忘口径（需运行时构造重名行，静态证据不足），留待运行时复核阶段，不重复立案。
- **master-detail 订单 radio 无反选**：页面初始态即"请选择左侧订单"、无"全部订单"语义，锁死影响不成立（与 tree-crud 的筛选锁死不同构），弃报。
- **sundial-settings 侧栏 footer「本地模式」静态文案 / sundial-todo-dialog 列表行静态灰点 / sundial-detail 子任务对话框 ghost 删除钮**：分别为 [G7-视角11-12]、[G7-R2-视角11-05]（含 C2 G-F 记录）、[G7-R2-视角10-01] 修复范围可覆盖的同根因次要表面，随原条目一并修复，不另立条目。
- **workbench t7 checkbox 与 completed t7 重名**：checkbox 均不在 form 内且勾选无联动（R1 [G7-视角3-06] 已报勾选脱钩），重名不可观测，弃报。

## 本轮检查范围与方法

- **范围**: `apps/playground/src/complex-pages/page-schemas/` 全部 19 张 schema 全量通读（advanced-query / approval-tasks / business-document / combo-editor / complex-form / crud-views-export / dashboard / detail-subtables / dynamic-tabs / form-wizard / inline-edit-table / master-detail / standard-crud / sundial-analytics / sundial-detail / sundial-settings / sundial-todo-dialog / sundial-workbench / tree-crud；其中 dynamic-tabs、standard-crud、sundial-todo-dialog、sundial-workbench 为 2026-08-28 11:07-11:08 变动后版本）；sundial 5 页按视角 11/12 验收复读。
- **盲区对照**: ① 分页/排序/筛选 schema 配置（各页 queryForm clearable/placeholder、sortable 列、selection 消费链、pagination 配置面）——发现视角4-01/4-02/11-03；② validation/required（conditional required、占位自释、校验链）——核对通过零发现；③ 加载与错误 schema 态（source 驱动表格空态、data-source sendOn 链）——维持 R2"renderer 层已覆盖"结论；④ 跨页术语与文案一致性（垃圾箱/垃圾桶外的剩余面：徽标语义色、计数口径、确认步回显）——发现视角11-01/11-02/7-01/6-01/11-04。
- **方法**: 逐页通读 + 运行时源码交叉核实：`shared/showcase-env.ts`（User**findPage/Budget**find/Budget**save/Dashboard**summary/Sundial**summary/Sundial**pressure/Order\_\_pickerOptions）、`shared/mock-backend.ts`（toUserListRecord、DICT_ROLE、depts/users 数据形态、ts() 时间戳）、`shared/mock-backend-sundial.ts`（createSundialTasks/filterSundialTasks/createSundialSettings）、`packages/flux-renderers-form/src/renderers/date-range-renderer.tsx` 与 `src/schemas.ts`（clearable 支持面）、`sundial-replica/sundial-replica.css`（sd-badge 语义色）。
- **静态口径声明**: 本轮为 schema 静态审查（无浏览器运行时验证）；[G7-R3-视角11-04] 的"今日订单恒 0"基于 `nowStamp()`（运行时时钟）与字面 `2024-07` 前缀的静态不可能相交推断，置信度高，已标注复核阶段以运行时快照确认；其余条目的渲染形态均经 renderer/运行时源码核实。
