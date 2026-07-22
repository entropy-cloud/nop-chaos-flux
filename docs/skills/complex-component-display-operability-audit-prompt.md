# 复杂交互组件显示与可操作性审计 Skill

> 用途：对 gantt / kanban / calendar / scheduler / 任意 designer 等"复杂交互渲染器"做**事后功能正确性验证**——确认它真的"显示正确且可操作"，而非"能跑就行"。
> 审查对象：已实现的渲染器组件 + 其 design.md + playground demo + 单测。
> 前置阅读：`docs/components/index.md`、`docs/architecture/renderer-runtime.md`、被审组件的 `docs/components/<type>/design.md`、（若有）`~/sources/complex-controls/` 下对应开源参考
> 与其他 skill 的关系：
>
> - 本 skill 是**事后验证**；`flux-component-design-review-prompt.md` 是**事前设计审查**（审 design.md 合规性）。两者互补：设计审查过了不代表实现渲染正确。
> - 本 skill 是 `deep-audit-prompts.md` 维度 21/22/23 的**轻量单 pass 独立版**。**若本次审计已在跑 deep-audit 的 G 组（维度 21/22/23），勿重复跑本 skill**——二者检查项同源，重复执行纯属浪费。
>   触发词：组件显示不对、渲染错位、交互失灵、拖拽无效、视图切换无效、组件操作不了、显示效果差、complex component audit、display operability audit
>   起源：`docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md`——scheduling 包曾通过多维度审计（维度 05/06/19/20）+ 600+ 单测全绿却带 12 个 P0 发布。

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

## 输出格式

按 P0/P1/P2/P3 分级输出。每条发现：

```
### [P级别] 简短标题
- 类别：显示(§1.x) / 接线(§2.x) / 测试(§3.x)
- 位置：file:line
- 证据：3-10 行代码原文
- 应为之值：对照 design.md / 开源参考 / 数学定义
- 用户可见症状：如"点切换无反应""拖拽后卡片弹回"
- 修复方向：一句话
```

结尾给出：

1. 三类反模式（F1 固化缺陷 / F2 边界 mock / F3 接线漏接）各自的命中数。
2. 显示正确性、可操作性、测试有效性 三项总评（通过/有风险/不通过）。
3. 若有 P0，明确标注"组件在默认/demo 配置下不可用"。

---

## 误报排除

- 设计上明确为"只读展示 v1"的组件，拖拽/编辑不实现不算缺陷（但需 design.md 明确）。
- "悲观更新"（等数据源确认才更新 DOM）与"controlled no-op"（永不更新）是不同问题，后者才是缺陷。
- 合理 mock（外部依赖 getUserMedia/html2canvas/DnD 底层）不算缺陷；缺陷是 mock 掉**被测对象本身**。
- needs-runtime 项（如 mid-drag 适配器销毁是否硬断裂）标注清楚，不当确定结论。
- "我觉得不好看"不算缺陷；须有数学/契约/开源对照证据。
