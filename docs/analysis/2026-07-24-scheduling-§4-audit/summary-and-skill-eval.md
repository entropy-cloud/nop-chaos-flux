# 审计汇总与 §4 skill 有效性评估

> 日期：2026-07-24
> 范围：Phase 1（Gantt）、Phase 2（AI）、Phase 3（Kanban）、Phase 4（Calendar）
> 输出位置：`docs/analysis/2026-07-24-scheduling-§4-audit/`

---

## 一、跨组件交互品质问题总表

### 1.1 发现数分布

| 包       | P0    | P1     | P2     | P3     | 小计   |
| -------- | ----- | ------ | ------ | ------ | ------ |
| Gantt    | 0     | 3      | 9      | 8      | 20     |
| AI       | 0     | 2      | 7      | 2      | 11     |
| Kanban   | 1     | 3      | 10     | 5      | 19     |
| Calendar | 1     | 4      | 13     | 3      | 21     |
| **合计** | **2** | **12** | **39** | **18** | **71** |

### 1.2 P0 发现（核心反馈不可见）

| #    | 组件     | 发现                                       | 证据                                                                           |
| ---- | -------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| P0-1 | Kanban   | 虚拟化（默认）路径下 drop indicator 不渲染 | `kanban-column.tsx:237-271`（虚拟化分支）vs `:276-300`（非虚拟化）             |
| P0-2 | Calendar | drop indicator 属性已设但 CSS 零规则       | `calendar.tsx:251-258` 设属性 vs `calendar.css` 无 `[data-drop-target]` 等规则 |

### 1.3 P1 发现（高影响）

| #        | 组件     | 发现                                                |
| -------- | -------- | --------------------------------------------------- |
| Gantt-1  | Gantt    | 缺 `touch-action`（触摸拖拽失效）                   |
| Gantt-2  | Gantt    | 键盘改任务日期为死代码（move/resize case 未接线）   |
| Gantt-3  | Gantt    | 缩放切换丢滚动位置（中心锚定走死分支）              |
| AI-1     | AI       | 无 IME 组合保护（CJK 误发）                         |
| AI-2     | AI       | 附件上传 status 类型声明但不渲染（无进度/错误反馈） |
| Kanban-1 | Kanban   | 缺 `touch-action`                                   |
| Kanban-2 | Kanban   | 缺 `autoScrollForElements`（包未装）                |
| Kanban-3 | Kanban   | WIP 仅列级校验，卡片 target 可绕过                  |
| Cal-1    | Calendar | 缺 `touch-action`                                   |
| Cal-2    | Calendar | 拖拽创建无实时预览                                  |
| Cal-3    | Calendar | 长按 timer 无提前清除（松手后仍可能触发）           |
| Cal-4    | Calendar | 键盘双重提交（箭头即提交 + Enter 再提交）           |

### 1.4 跨组件共性问题（按 best-practices.md §五）

| 共性                                   | 命中组件                                 | 优先级  |
| -------------------------------------- | ---------------------------------------- | ------- |
| 缺 `touch-action`                      | Gantt、Kanban、Calendar（3/3 拖拽组件）  | blocker |
| 拖拽 affordance 三套各异（无共享原语） | Gantt、Kanban、Calendar                  | major   |
| pointermove 无 RAF 节流                | Gantt、Kanban、Calendar                  | major   |
| 拖拽无 ARIA live 播报                  | Gantt、Calendar（Kanban 有）             | minor   |
| 无激活阈值                             | Gantt、Kanban（Calendar move-drag 也无） | minor   |
| 零 transition（无过渡基础设施）        | AI（全包）                               | major   |

---

## 二、§4 skill 首次实战有效性评估

### 2.1 检出效率

- **总发现数**：71 条（4 个组件、10 个子节）
- **检出速率**：约 0.7 条/检查项（10 子节 × 4 组件 ≈ 40 检查项；但 AI 按子组件分组更细）
- **严重性分布**：P0=2.8%、P1=16.9%、P2=54.9%、P3=25.4%。P0+P1 占 19.7%，属"有价值发现"区间合理。
- **skill 区分度**：§4 成功将"功能正确（§1-3 已过）但交互粗糙"的组件识别为"有风险/不通过"——Kanban 与 Calendar 因核心反馈不可见被判"不通过"，这正是 §4 相对 §2.6"拖拽通不通"的增量价值。

### 2.2 误报估算

- **疑似误报数**：约 3 条（均为 P3）
  - Gantt "easing 用 CSS keyword `ease`"——`ease` 实为 `cubic-bezier(0.25,0.1,0.25,1)`，并非 linear，skill §4.3 禁止的是 linear，此处报告偏严。
  - Gantt/Kanban "无 toast 成功反馈"——skill 标注为可选，宿主可补，报告为 P3 属边界。
- **误报率**：3/71 ≈ 4.2%，可接受。
- **误报根因**：§4.3 "禁止 `transition-all`" 与 "easing 应 cubic-bezier" 两条对 CSS keyword `ease` 的判定有歧义。

### 2.3 漏报估算

- **已知漏报区**：
  - **§4.5 帧率**：本次为纯源码审计，未做 production build + Chrome DevTools Performance 录制。所有 §4.5 发现是"结构推断"（无 RAF → 可能掉帧），非实测帧率。真实掉帧情况需运行时测量补齐。
  - **§4.4 触摸手感**：未在真实触摸设备/模拟器验证，touch-action 缺失是从 CSS 零命中推断，逻辑可靠但未实测。
  - **§4.7 快速连续操作**：未用 DevTools Record/Replay 回放高速序列。
- **漏报风险**：中等。功能性缺陷（P0/P1）多为静态可见的"接线漏接"，漏报风险低；性能/手感类（§4.5/4.4/4.7 部分）需运行时补充。

### 2.4 skill 改进建议（Decision）

| 建议                                                | 类型     | 说明                                                                                                                                    |
| --------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| §4.3 明确 `ease` keyword 不等于 `linear`            | 过严修正 | 当前表述易致误报；应写明"禁止 linear 和无过渡，`ease`/`ease-out` 等 keyword 可接受"                                                     |
| §4.5 区分"源码结构核查"与"运行时帧率测量"两档       | 可操作性 | 当前要求 production build + DevTools，但源码审计阶段即可报告"无 RAF 节流"等结构问题。建议分两档：结构档（静态可判）、帧率档（需运行时） |
| §4.6 增"JS 设属性 vs CSS 有无对应规则"交叉检查项    | 补充     | 本次 P0-2（Calendar）即此类——JS 设了 data-drop-target 但 CSS 无规则。这是高价值检查，应显式列出                                         |
| §4.1/4.4 的 `touch-action` 检查提升为显式必查项     | 强化     | 3/3 拖拽组件全缺，高频高影响，应从"指针一致性"子项提升为独立必查                                                                        |
| §4.9 增加"死代码接线"检查（声明但未调用的 handler） | 补充     | 本次 Gantt 键盘 move/resize 死代码即此类——`handleBarKeyAction` 定义了分支但无 key 事件触发                                              |
| 增加"跨组件 affordance 一致性"检查                  | 补充     | §4.8 现仅查同类组件，建议增"共享原语是否抽取"检查                                                                                       |
| AI 类组件的 §4 适用性说明                           | 澄清     | §4 原为拖拽密集型设计，AI 组件大多无拖拽；本次按子组件映射 4.1/4.3/4.5/4.6/4.10 适用项，其余 N/A。skill 应给出"非拖拽组件的 §4 映射表"  |

---

## 三、Remediation 优先级清单

按 blocker → major → minor 排序，每条标注参考依据与估计工作量（S=0.5d, M=1-2d, L=3-5d）。

### Blocker（核心交互不可用/反馈不可见）

| #   | 组件     | 发现                                                                                          | 参考                           | 工作量 |
| --- | -------- | --------------------------------------------------------------------------------------------- | ------------------------------ | ------ |
| R1  | Kanban   | 虚拟化路径补 drop indicator 渲染                                                              | best-practices §二             | S      |
| R2  | Calendar | 补 drop indicator CSS（`[data-drop-target]`/`[data-drop-valid]`/`.drag-ok`/`.drag-conflict`） | best-practices §三、kanban.css | S      |

### Major（高影响，影响可用设备/数据完整性）

| #   | 组件                  | 发现                                                             | 参考                                | 工作量 |
| --- | --------------------- | ---------------------------------------------------------------- | ----------------------------------- | ------ |
| R3  | Gantt+Kanban+Calendar | 统一加 `touch-action`（共享修复）                                | best-practices §五.1                | S      |
| R4  | Gantt                 | 键盘 move/resize 死代码接线                                      | best-practices §一、DHTMLX 键盘插件 | M      |
| R5  | Gantt                 | 缩放中心锚定修复（header 传 scrollLeft 或 scroll hook 写 store） | best-practices §一                  | S      |
| R6  | Kanban                | 装 `autoScrollForElements` + 注册                                | best-practices §二                  | S      |
| R7  | Kanban                | WIP 卡片级 target 也校验                                         | best-practices §二                  | S      |
| R8  | Calendar              | 拖拽创建实时预览矩形                                             | best-practices §三、Google Calendar | M      |
| R9  | Calendar              | 长按 timer 提前清除（单元格 onPointerUp/onPointerLeave）         | best-practices §三                  | S      |
| R10 | Calendar              | 键盘双重提交修复（箭头暂存 or Enter 不重发）                     | best-practices §三                  | S      |
| R11 | AI                    | IME 组合保护（`isComposing`）                                    | best-practices §四                  | S      |
| R12 | AI                    | 附件上传 status 渲染（进度/spinner/错误）                        | best-practices §四                  | M      |
| R13 | Gantt+Kanban+Calendar | pointermove RAF 节流（共享修复）                                 | best-practices §五.3                | M      |
| R14 | AI                    | 补基础 transition 基础设施（消息入场/对话切换/选中态）           | best-practices §四                  | M      |

### Minor（一致性/无障碍/打磨）

| #   | 组件                  | 发现                                                   | 参考                 | 工作量 |
| --- | --------------------- | ------------------------------------------------------ | -------------------- | ------ |
| R15 | Gantt+Kanban+Calendar | 抽共享拖拽 affordance（ghost/indicator/data 标记+CSS） | best-practices §五.2 | L      |
| R16 | Gantt+Calendar        | 补 ARIA live 拖拽播报（参照 Kanban dndAnnouncement）   | best-practices §五.4 | M      |
| R17 | Gantt+Kanban+Calendar | 补激活阈值（距离/延迟）                                | best-practices §五.5 | M      |
| R18 | Kanban                | ArrowUp/Down 列内重排序                                | best-practices §二   | S      |
| R19 | Calendar              | week/day 视图虚拟化 + roving tabindex                  | best-practices §三   | M      |
| R20 | Calendar              | 视图切换过渡 + 状态保持                                | best-practices §三   | M      |
| R21 | 各组件                | cursor grab/grabbing、`:focus-visible` 等打磨项        | 行业基线             | S×N    |

**合计工作量估算**：Blocker 2×S，Major 含 5×S+4×M，Minor 含 4×S+4×M+1×L ≈ 11×S + 8×M + 1×L。

---

## 四、后续 Remediation 计划建议

按 Non-Blocking Follow-ups，建议拆分为两份 remediation 计划（符合"多 Phase 单计划"模式）：

1. **`2026-07-24-2301-1-scheduling-interaction-quality-remediation`**：覆盖 Gantt/Kanban/Calendar 的 R1-R10、R13、R15-R17、R18-R21（scheduling 部分）。以组件为 Phase：Phase 1 Kanban（P0+touch+WIP+auto-scroll）、Phase 2 Calendar（P0+预览+timer+双重提交）、Phase 3 Gantt（键盘+缩放）、Phase 4 共享基建（touch-action/RAF/affordance/ARIA）。
2. **`2026-07-24-2301-2-ai-interaction-quality-remediation`**：覆盖 AI 的 R11、R12、R14。以子组件为 Phase。
