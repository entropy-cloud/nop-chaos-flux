# 复杂交互组件显示与可操作性审计 Skill

> 用途：对复杂度超过阈值的交互渲染器做**事后功能正确性验证**——确认它真的"显示正确且可操作"，而非"能跑就行"。
> 审查对象：已实现的渲染器组件 + 其 design.md + playground demo + 单测。
> 前置阅读：`docs/components/index.md`、`docs/architecture/renderer-runtime.md`、被审组件的 `docs/components/<type>/design.md`、（若有）`~/sources/complex-controls/` 下对应开源参考
> 与其他 skill 的关系：
>
> - 本 skill 是**事后验证**；`flux-component-design-review-prompt.md` 是**事前设计审查**（审 design.md 合规性）。两者互补：设计审查过了不代表实现渲染正确。
> - 本 skill 是 `deep-audit-prompts.md` 维度 21/22/23 的**轻量单 pass 独立版**。**若本次审计已在跑 deep-audit 的 G 组（维度 21/22/23），勿重复跑本 skill**——二者检查项同源，重复执行纯属浪费。
>   触发词：组件显示不对、渲染错位、交互失灵、拖拽无效、视图切换无效、组件操作不了、显示效果差、complex component audit、display operability audit
>   起源：`docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md`——scheduling 包曾通过多维度审计（维度 05/06/19/20）+ 600+ 单测全绿却带 12 个 P0 发布。**该盲区不局限于特定组件类型**，而是所有满足复杂度阈值（≥3 项 C1-C10）的组件共有的风险。

---

## 适用范围：复杂度阈值

本 skill **不限定组件类型**，而是按复杂度阈值判断是否适用。满足以下 **任意 3 项及以上**的组件应接受本审计：

| #   | 复杂度特征                                                                   | 示例                                                                |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| C1  | **多视图/多模式切换**（split/unified、月/周/日、grid/timeline）              | diff-view 视图切换、calendar 视图切换、gantt 缩放级别               |
| C2  | **定位算法**（数据→坐标/尺寸的纯函数，非简单 flex 布局）                     | gantt 任务条定位、calendar 事件定位、diff 行号 gutter               |
| C3  | **拖拽/指针交互**（pointer 事件、自定义拖拽、DnD 库集成）                    | gantt 任务拖拽、kanban 卡片拖拽、calendar 班次交换                  |
| C4  | **虚拟滚动/大列表**（@tanstack/react-virtual 或自建虚拟化）                  | calendar 行虚拟化、kanban 卡片虚拟化、diff 大文件虚拟滚动           |
| C5  | **语法高亮/富内容渲染**（dangerouslySetInnerHTML、预渲染 HTML）              | diff-view 语法高亮、code-editor                                     |
| C6  | **跨组件/跨文件协调**（文件列表+主视图、多面板联动）                         | diff-view 跨文件导航、gantt grid↔timeline 滚动同步                  |
| C7  | **状态机/阶段管理**（loading→ready→error、phase 管理）                       | barcode-overlay 相机生命周期、service 数据加载                      |
| C8  | **外部库深度集成**（DnD 库、解码库、diff 库、虚拟化库）                      | kanban 用 pragmatic-dnd、barcode 用 zxing、diff 用 diff-match-patch |
| C9  | **键盘导航/无障碍**（roving tabindex、方向键语义、ARIA）                     | gantt 键盘导航、kanban 键盘移动、diff 行点击                        |
| C10 | **事件/句柄/region 复杂接线**（onXxx 事件、component:xxx 句柄、region 模板） | gantt onTaskDragEnd、kanban columnHeader region、diff onLineClick   |

**判断规则**：若组件满足 ≥3 项 C1-C10，且已有实现代码（非纯设计文档），则本审计适用。简单展示组件（text、badge、icon）或纯布局容器（flex、container）不适用。

---

## ⚠️ 核心反模式：本 skill 要排除的三类"假绿"

复杂交互组件最危险的失败不是"崩溃"，而是"静默地显示错误/操作无效，但测试全绿"。三类模式必须逐一排除：

| #   | 反模式              | 典型症状                                                                     | 本 skill 对应检查 |
| --- | ------------------- | ---------------------------------------------------------------------------- | ----------------- |
| F1  | **固化缺陷断言**    | 测试把当前(错误)实现值拷进 `expect()`；修了 bug 反而让测试红                 | §3 测试有效性     |
| F2  | **mock 掉被测边界** | 测 X 组件却 mock 掉 X 的全部子组件/hook；测 DnD 只验回调被调不验落位         | §3 测试有效性     |
| F3  | **接线漏接**        | store 接受字段但顶层组件漏传；内部 state 不驱动渲染；事件声明却从不 dispatch | §2 集成接线       |

---

## 使用方法

1. 加载本 skill，先读一遍全部检查类别与三类反模式表。
2. 读取待审组件的：实现源码、`design.md`、playground demo、`example.json`、全部 `*.test.ts(x)`。
3. 若有开源参考（`~/sources/complex-controls/` 下），读取对应参考实现作为"正确性基线"。
4. 按 §1 显示正确性 → §2 集成接线与可操作性 → §3 测试有效性 顺序核查，每条给 file:line 证据。
5. 每条结论须独立读源码确认，不信任"看起来对了"；对坐标/日期/宽度等数值，**手算正确值再对照实现**。
6. 汇总：按 P0/P1/P2/P3 分级，P0 = 组件在默认/demo 配置下不可用或核心交互无反馈。

---

## §1 显示正确性核查

> 对应深度审计维度 21。查"渲染结果是否正确"。

### 1.1 定位算法（最高频缺陷源）

- [ ] 对每个"数据→坐标/尺寸"纯函数（layout/scale/_-layout-utils/_-time-utils），手算 2-3 个代表输入的正确输出，对照实现。
- [ ] **日期/单位边界**：end 是 inclusive 还是 exclusive？同日任务（start===end）宽度是否塌成最小值？（曾发现 `diffInDays(end,start)` 使同日任务宽=4px、所有条短 1 天）
- [ ] **并发/重叠分配**：宽度按"实际并发数"还是"配置上限 maxConcurrent"算？（曾发现单事件只占 100/maxConcurrent=25%，75% 留白）
- [ ] **左右面板行高一致**：左网格行高与右时间线行高是否同源？（曾发现网格行高随内容撑开、时间线固定 40px，两侧纵向错位）

### 1.2 渲染数量与结构

- [ ] 实际渲染的行列数是否符合 design.md 的布局范式？（曾发现"资源×日期矩阵"被渲染成 42 列通用日历，每格 ~28px 标签截断为空）
- [ ] 虚拟列表行是否有 `position:absolute`+`top:0`/transform 定位？（曾发现仅 transform 无 absolute 致行距翻倍）

### 1.3 刻度/标签/格式

- [ ] 时间刻度格式 token（strftime 的 `%V`/`%W`/`%q` 等）是否真正实现？未知 token 是否原样输出乱码？（曾发现 `%V` 渲染成 `V`）

### 1.4 特殊元素（逐类核查，勿合并）

- [ ] **里程碑**（零宽）：定位正确、可点选/选中/连线（pointer-events 未关）？
- [ ] **多日拆分块**（is-split）：每块定位正确、is-split 标记正确？
- [ ] **今日/周末标记**：x 坐标对、周末按正确起始日高亮？
- [ ] **依赖线（4 类型路由）**：FS/SS/FF/SF 各自锚点与路由正确（非全按 FS 画）？
- [ ] **跨日连接线**：单位一致（%/px 不混）、有 viewBox？

### 1.5 时区/日期运算

- [ ] 日期是否统一 UTC 构造却用 local getter 格式化？（`toISODateString`/`isToday`/`isSameDay` 用 `getUTC*` 还是 `get*`？）CI 在 UTC 下会掩盖此类 bug。需强制非 UTC 时区验证。

### 1.6 CSS marker 与视觉契约

- [ ] design.md §10 列出的每个 data-slot/marker 是否在 CSS 中有对应规则？
- [ ] 拖拽反馈（ghost opacity/scale、drop indicator 指示线）的 CSS 选择器是否能命中？（曾发现 `data-dragging` 放根节点、CSS 用后代选择器永不匹配）

### 1.7 空/加载态

- [ ] design.md 规定的骨架/空态是否实现（非仅"不崩"）？

---

## §2 集成接线与可操作性核查

> 对应深度审计维度 22。查"schema→store→DOM→事件 全链路是否通、核心交互是否成立"。

### 2.1 schema→store 接线

- [ ] 凡 store/config 接受的字段，顶层组件是否真的从 resolved props 透传了？（曾发现 zoomLevels/ownership/regions 全部声明却漏传给 store，致时间线全空）

### 2.2 内部 state 是否驱动渲染

- [ ] 顶层组件用 hook 维护交互态（activeView/currentDate/expandedSet）时，渲染分支读的是"hook 返回值"还是"schema resolved 值"？（曾发现 calendar 渲染分支读 schema view 而非内部 activeView，切换完全失效）
- [ ] store bump 的 revision 是否有生产组件订阅？（曾发现 toggleOpen bump treeRevision，但无任何生产组件订阅它，展开/收起全死）

### 2.3 controlled/uncontrolled

- [ ] 是否把"prop 已提供"等同于"外部受控"而无回推机制？（曾发现 kanban 传 data 即 controlled、setBoardData 恒空操作，所有拖拽/增删失效）
- [ ] `*Ownership`/`*StatePath` 字段是否被消费？三态（local/controlled/scope）是否在顶层落地？

### 2.4 事件派发

- [ ] schema 声明的每个 event（onXxx）是否在对应交互点真的 dispatch？（曾发现 onTaskDragEnd/onLinkDragEnd/onEventCreate 等全部声明却从不派发，致拖拽无法持久化）

### 2.5 句柄/region 接线

- [ ] `component:xxx` reaction 是否接入 useImperativeHandle？（曾发现 exportPNG/importICal 声明为 reaction 但 handle 未实现）
- [ ] 声明的 region（taskBar/columnHeader/cardTemplate 等）是否真的下传给子组件渲染？（曾发现 board 从不把 regions 传给 column）

### 2.6 核心交互通断（最高优先，逐环核查）

**拖拽**（曾发现 scrollTo\* 滚错元素、ArrowLeft/Right 语义相同、video 在 phase=scanning 才挂载致永久黑屏）：

- [ ] 拖拽源已注册？
- [ ] 放置目标已注册（含空列/空格后备目标）？
- [ ] edge 检测（attachClosestEdge 或等价）能区分 before/after？
- [ ] 落位后状态真的更新（非弹回）？视觉反馈（ghost/drop indicator）选择器能命中？
- [ ] 句柄元素滚的是对的容器吗？
- CSS 选择器存在性和语法正确性归此处；ghost/drop indicator 实际视觉效果（透明度/阴影/定位精度）归 §4.2/4.6。

**键盘导航**：

- [ ] 焦点随选择移动（roving tabindex）？
- [ ] 箭头语义不冲突（Left≠Right；Up/Down 不与日期移动同时触发）？

**打开/关闭/覆盖层时序**：

- [ ] 依赖 DOM 挂载的副作用（如 video.srcObject、ResizeObserver）是否在目标元素已挂载后才执行？

### 2.7 降级与错误反馈

- [ ] 失败路径（相机不可用/权限拒绝/数据为空/WASM 失败）是否给可见反馈，而非静默黑屏/空白？（曾发现 start() 吞掉相机错误，权限拒绝时黑屏无反馈、onScanError 永不触发）

---

## §3 测试有效性核查

> 对应深度审计维度 23。查"测试是否真的保护正确行为，还是假绿"。

### 3.1 固化缺陷断言（最高危）

- [ ] 对每个断言实际计算值/渲染值的测试：断言值是"当前实现值"还是"正确值"？（曾发现 layout.test 断言同日 $w===4、calendar-layout-utils.test 标题写 full width 却断言 width===25、drag-create.test 断言 start===end）
- [ ] 测试标题/描述与断言是否矛盾？
- [ ] **关键判据**：该断言若被修正为正确值，测试是否反而失败？若是 → 固化缺陷，必须随修复合改。

### 3.2 集成边界 mock

- [ ] 测 X 组件是否 mock 掉 X 的全部子组件/hook？（曾发现 gantt.test/calendar.test/barcode-overlay.test 全 mock，使 P0 不可测）
- [ ] 测 DnD 是否 mock 掉库后只验"回调被调"而不验"实际落位"？
- [ ] store/纯函数测试是否用直接构造绕过顶层组件，掩盖"顶层漏传字段"？（曾发现 zoom 测试全绿但 gantt.tsx 从不透传 zoomLevels）
- [ ] **要求**：至少有一个"渲染真实组件 + 断言具体 DOM 输出（style.width/列数/视图切换后子组件出现/卡片落位）"的集成冒烟测试。

### 3.3 同义反复/零断言

- [ ] 是否有 `expect(true).toBe(true)`、仅 `not.toThrow()` 作为唯一断言、调用函数后无结果断言？

### 3.4 死代码带测试

- [ ] 被测模块在生产中是否有导入方？无导入方却带完整测试套件 = 假覆盖。（曾发现 useKanbanAdder/useKanbanCollab/KanbanWipBadge/CalendarResourceGroup/ResourceLoadView 全是死代码带测试）

### 3.5 环境敏感

- [ ] 日期测试是否仅在 CI(UTC) 下通过？是否强制过非 UTC 时区？

---

## §4 交互品质与视觉流畅度核查

> 对应深度审计维度 21/22 中"功能正确"与"接线正确"之后的第三层——**"不仅能用，而且好用"**。交互品质缺陷不导致功能断裂，但使用户感知到粗糙感、迟缓感或不一致感，长期降低产品信任度。
> 本节的检查对象不是"是否实现了功能"，而是"用户实际操控时的感受"。
> **判断原则**：以行业成熟竞品（DHTMLX Gantt、SVAR Gantt、Trello/Kanban、Google Calendar、Asana）的实际交互行为为基准。本项目的设计文档不覆盖交互品质细节（属于实现质量），因此不以 design.md 为唯一依据，而以竞品交互手感为参照。
> **无竞品退路**：若被审组件为新型组件无直接竞品，以操作系统原生控件交互行为（macOS/Windows 原生拖拽、文件管理器拖拽反馈）或 Material Design / shadcn/ui 交互指南为基线。
>
> **执行前准备**：
>
> - Chrome DevTools Performance tab（用于 §4.5 帧率核查 + 动画 timeline 录制）
> - 触摸设备 或 DevTools 触摸模拟（用于 §4.4 触控一致性）
> - 竞品参考示例：DHTMLX Gantt demo、SVAR Gantt demo、Trello board、Google Calendar
> - 建议在 production build 下测试（避免 React StrictMode 双渲染干扰动画测量）
> - 热身交互（warm-up）：§4.5 帧率测量前先执行一次拖拽以消除 JIT 冷启动偏差

### 4.1 拖拽启动与阈值

- [ ] 拖拽激活是否有合理的起始延迟（行业惯例 100-200ms，避免鼠标单击误触）？激活前是否提供指针悬停视觉暗示（cursor 变化、微高亮）？
- [ ] 激活距离（pointer 移动多少 px 后触发 drag）是否合理？过小→误触发，过大→用户觉得迟钝。
- [ ] 拖拽启动是否有明显的视觉确认（元素轻微抬升/阴影加深/缩放）？曾有实现：松手后才显示阴影，拖拽全程无反馈。
- [ ] 单击 vs 拖拽的区分是否可靠（mouseDown+mouseUp 不触发拖拽）？

### 4.2 拖拽预览（ghost）品质

- [ ] ghost 元素定位是否与指针精确对齐？是否出现 ghost 偏离指针、闪烁或跳跃？
- [ ] ghost 透明度/阴影/缩放是否合理（行业惯例：透明度 0.8~0.9 + 轻微阴影 + 缩放 1.02~1.05）？
- [ ] ghost 尺寸是否与被拖拽元素一致？是否出现 ghost 截断/变形/样式丢失？
- [ ] 跨容器/跨列拖拽时 ghost 的 z-index 是否保证始终在顶层（不被容器 overflow:hidden 裁剪）？
- [ ] 多选批量拖拽时 ghost 是否标识选中数量（badge / count 标签）？

### 4.3 落位动画与过渡

- [ ] 拖拽落位后，元素是否平滑过渡到目标位置（非瞬间闪跳）？动画时长 150-300ms 为行业惯例。
- [ ] 拖拽中其他元素的避让动画是否流畅（被挤压的行/列应有过渡动画，非瞬间重新排列）？
- [ ] 落位失败/被拒绝时是否有回弹动画（元素回到原位，伴随淡出/缩放动画），而非瞬间跳回？
- [ ] 动画 easing 曲线是否自然（cubic-bezier 而非 linear）？禁止使用 `transition-all` 导致的意外动画。
- [ ] 快速连续拖拽时动画队列是否稳定（不积累、不闪烁、不覆盖前一次动画）？

### 4.4 指针与设备一致性

- [ ] 鼠标拖拽和触摸拖拽的手感是否一致？触摸拖拽的 ghost 偏移量是否校正了手指遮挡？
- [ ] 触摸设备上拖拽的滚动冲突是否处理（拖拽时不触发页面滚动）？
- [ ] 触控笔输入是否被正确处理（PointerEvent vs TouchEvent vs MouseEvent 统一）？
- [ ] 右键拖拽是否被阻止（防止意外触发）？

### 4.5 大量数据下的交互性能

- [ ] 100+ 条任务/卡片时拖拽是否掉帧（frame drop > 20%）？使用 `performance.now()` 或 Chrome DevTools Performance tab 验证。先执行一次热身交互（warm-up）消除 JIT 冷启动偏差，取第 2-5 次交互的测量值。若 demo 默认数据不足 100 条，先用脚本生成 seed data 或从组件 example.json 加载。
- [ ] 虚拟滚动组件中拖拽的行/卡是否在虚拟化容器中正确定位（不因虚拟 DOM 复用导致 ghost 错位）？
- [ ] 拖拽过程中的实时计算（落位预测、冲突检测、依赖链重算）是否在 worker 中执行或 debounce 到空闲时？禁止在主线程同步阻塞。

### 4.6 视觉反馈的即时性与精度

- [ ] 拖拽落位预测指示线（drop indicator）是否在被拖入目标区域后 **立即** 出现（肉眼不可察觉延迟，>100ms 应报告；精确测量用 Chrome DevTools Performance 录制 + 慢动作回放）？
- [ ] indicator 的渲染位置是否精确（线在行间 vs 线上 vs 线下）？指示线是否随拖拽位置实时更新（非仅 mouseUp 时校验）？
- [ ] 拖拽进行中的非目标区域是否提供"不可落位"的视觉反馈（cursor not-allowed、区域变灰、ghost 变红）？
- [ ] 操作完成后的成功/失败反馈是否可见（toast、行闪烁、状态标记），而非仅数据层静默更新？
- [ ] 禁用状态下的组件是否全态反映不可交互（拖拽、点击、键盘均被阻止，且有视觉指示）？

### 4.7 边缘操作稳定性

- [ ] 拖拽到边界时是否自动滚动容器（auto-scroll）？速度是否与距离边界的距离成比例（非匀速跳跃）？
- [ ] 拖拽到空区域/空列是否自动展开后备落位区（如空列高亮为可落位目标）？
- [ ] 拖拽中途按 Escape 键是否取消拖拽并回滚到原位（伴随回弹动画）？
- [ ] 拖拽过程中组件 unmount（tab 切换、dialog 关闭）是否优雅处理（不报错、不遗留 ghost）？
- [ ] 快速连续操作（1 秒内 3+ 次拖拽/排序/调整）是否状态一致（不出现中间态残留、数据错位或 ghost 幽灵残留）？使用 DevTools Record/Replay 回放高速操作序列，或编写自动化测试脚本模拟快速触发，避免纯手动不可复现的测量。

### 4.8 触感一致性（跨组件）

- [ ] 同类型交互（如甘特图任务拖拽与看板卡片拖拽）的拖拽阈值、ghost 透明度、落位动画时长是否一致？
- [ ] 同类型交互的 keyboard shortcut（如 Escape 取消、Enter 确认、方向键微调）是否跨组件一致？
- [ ] 同一组件内部不同模式（甘特图天/周/月视图）下的拖拽手感是否一致？视图切换不应改变拖拽阈值或动画曲线。

### 4.9 键盘交互品质

> 本节检查"键盘用户能否流畅操作"，不同于 §2.6 只检查"键盘导航通不通"。本节检查"好不好用"。

- [ ] 焦点指示器（focus ring）是否有足够的对比度和可见性？在深色/浅色主题下均是否可见？是否被相邻元素的 overflow:hidden 裁剪？
- [ ] 键盘重复率（长按方向键）下的行为是否稳定？不跳格、不重复触发后状态错乱、不丢失中间状态。
- [ ] Tab 顺序是否与视觉顺序直觉一致（在表格/看板中从左到右、从上到下）？自定义控件的 Tab 位置是否合理（不跳过核心操作、不陷入不可操作元素）？
- [ ] 屏幕阅读器在拖拽操作中是否提供实时状态播报（如 aria-live="assertive" 播报"拖拽中""可落位""已落位"）？非拖拽状态下焦点元素是否有足够的 aria-label 描述其操作方式？
- [ ] 键盘操作的视觉反馈是否与鼠标一致（如 Shift+箭头多选后选中的元素高亮样式与鼠标框选一致）？

### 4.10 视图/模式切换过渡品质

- [ ] 多视图切换（甘特图天/周/月、日历月/周/日、看板列展开/折叠）是否有过渡动画（非生硬跳变）？有无 layout shift / CLS（Cumulative Layout Shift）？
- [ ] 视图切换后关键上下文是否合理保持（滚动位置、选中项、展开状态）？切换后回到原视图是否恢复切换前的状态？
- [ ] 切换动画的时长和 easing 是否与其他同类切换一致（不出现某些视图切换有动画、某些生硬跳变）？
- [ ] 视图切换期间是否提供 loading 指示（如数据量大时需异步加载的视图显示 skeleton/spinner）？

---

## 输出格式

按 P0/P1/P2/P3 分级输出。每条发现：

```
### [P级别] 简短标题
- 类别：显示(§1.x) / 接线(§2.x) / 测试(§3.x) / 交互品质(§4.x)
- 位置：file:line
- 证据：3-10 行代码原文
- 应为之值：对照 design.md / 开源参考 / 数学定义 / 竞品行为
- 用户可见症状：如"点切换无反应""拖拽后卡片弹回""拖拽ghost偏离指针20px"
- 修复方向：一句话
```

结尾给出：

1. 三类反模式（F1 固化缺陷 / F2 边界 mock / F3 接线漏接）各自的命中数。
2. 显示正确性、可操作性、测试有效性、交互品质 四项总评（通过/有风险/不通过）。
3. 若有 P0，明确标注"组件在默认/demo 配置下不可用"。

---

## 误报排除

- 设计上明确为"只读展示 v1"的组件，拖拽/编辑不实现不算缺陷（但需 design.md 明确）。
- "悲观更新"（等数据源确认才更新 DOM）与"controlled no-op"（永不更新）是不同问题，后者才是缺陷。
- 合理 mock（外部依赖 getUserMedia/html2canvas/DnD 底层）不算缺陷；缺陷是 mock 掉**被测对象本身**。
- needs-runtime 项（如 mid-drag 适配器销毁是否硬断裂）标注清楚，不当确定结论。
- "我觉得不好看"不算缺陷；须有数学/契约/开源对照/竞品行为证据。
- **交互品质误报特别排除**：
  - "动画不如竞品华丽"不算缺陷；只当动画缺失、掉帧、错位、或不一致时才报告。
  - "和我习惯的产品不一样"不算缺陷；须有明确的可测量差异（如延迟 >100ms、ghost 偏移 >5px、落位无过渡）。
  - 已知性能基线（如经 `pnpm check:perf-baseline` 验证的组件）在基线阈值内可接受，但基线覆盖范围不足时仍需报告。
  - 已知跨浏览器渲染差异（Safari vs Chrome 的动画时间曲线差异、Firefox 的 `backdrop-filter` 行为等）不算缺陷，除非该差异导致功能断裂或用户可见的操作失败。
  - 首次交互的 JIT 冷启动帧率下降不算缺陷（§4.5 已要求热身交互后取测量值）。
