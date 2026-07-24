# 综合最佳实践（跨组件交互品质标尺）

> 日期：2026-07-24
> 来源：汇总 Phase 1–4 的参考分析（`docs/analysis/complex-controls/research-*.md`、`docs/analysis/ai-survey/*`）+ 本次审计发现
> 用途：作为后续 remediation 的"标尺"——每条最佳实践都经多个开源实现验证，标注哪些模式可靠、哪些反模式应避免

---

## 一、Gantt 交互最佳实践

### 可靠模式（多方验证，应采用）

| 模式                                          | 证据来源                              | 说明                                                                               |
| --------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| **命令式 DOM 拖拽（非 React DnD 库）**        | SVAR §2.4、DHTMLX §4、Flux 现状       | 甘特图需精细像素控制+性能，React DnD 库不适用。Flux 已采用，正确。                 |
| **像素坐标预计算**（`$x/$y/$w/$h`）           | SVAR §2.2、DHTMLX DataStore           | 渲染层直接 absolute 定位，避免布局重算。Flux 已采用（`gantt-store.ts` computed）。 |
| **拖拽中不触发 React 渲染，pointerup 才提交** | SVAR/DHTMLX、Flux `use-gantt-drag.ts` | 用 ref bridge 命令式更新 ghost，落位才 setState。Flux 已采用。                     |
| **滚动锚定（保持聚焦日期位置）**              | DHTMLX smart_scales、SVAR zoom config | 切换缩放级别时保持中心日期不变。Flux **已实现逻辑但 UI 调用路径走死分支**（P1）。  |
| **双虚拟化（grid + bars 各自）**              | DHTMLX smart_render、Flux 现状        | Flux 已采用双系统。                                                                |

### 反模式（应避免）

| 反模式                        | 证据                                  | Flux 是否命中 |
| ----------------------------- | ------------------------------------- | ------------- |
| 拖拽无激活阈值（误触）        | Schedule-X 用 150ms 延迟区分点击/拖拽 | 是（P2）      |
| 缺 `touch-action`（触摸冲突） | 行业基线                              | 是（P1）      |
| 键盘移动功能写死代码不接线    | DHTMLX 有完整键盘导航插件             | 是（P1）      |

---

## 二、Kanban 交互最佳实践

### 可靠模式

| 模式                                               | 证据来源                                   | 说明                                           |
| -------------------------------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **`@atlaskit/pragmatic-drag-and-drop`**            | react-kanban-kit §2.1（已验证）、Flux 现状 | 对 React 生命周期友好，非 HOC。Flux 选型正确。 |
| **扁平字典数据模型**（`BoardData`）                | RKK §2.1                                   | 归一化、地址化、支持懒加载。Flux 已采用。      |
| **`monitorForElements` + `canMonitor` 区分源类型** | pragmatic-dnd 官方推荐、Flux 现状          | 集中处理 card/column。Flux 已采用。            |
| **`attachClosestEdge` 精确 before/after**          | RKK §2.1、pragmatic-dnd hitbox 包          | Flux **未采用**（手写中点法，P3）。            |
| **`setCustomNativeDragPreview` 自定义 ghost**      | RKK §2.1                                   | Flux **未采用**（默认预览，P2）。              |
| **`autoScrollForElements`**                        | pragmatic-dnd autoscroll 包                | Flux **未采用**（包未装，P1）。                |
| **纯函数 helpers（moveCard 等）**                  | react-kanban-simple §2.2                   | 可直接作 reducer。Flux 已采用。                |
| **roving tabindex + 键盘移动 + ARIA 播报**         | 行业基线、Flux 部分采用                    | Flux 键盘跨列已实现（缺 Up/Down）。            |

### 反模式

| 反模式                          | 证据     | Flux 是否命中 |
| ------------------------------- | -------- | ------------- |
| 虚拟化路径漏渲染 drop indicator | —        | 是（P0）      |
| WIP 仅列级校验不校验卡片 target | —        | 是（P1）      |
| 缺 `touch-action`               | 行业基线 | 是（P1）      |

---

## 三、Calendar 交互最佳实践

### 可靠模式

| 模式                                                    | 证据来源                                   | 说明                                                             |
| ------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| **Temporal API 日期计算**                               | Schedule-X §2.7                            | 未来标准，避免 moment 时区坑。Flux 用本地 date utils（可接受）。 |
| **插件式视图系统**                                      | Schedule-X §2.6                            | 视图可组合。Flux 用条件挂载（简单但无过渡）。                    |
| **`positionInTimeGrid`/`positionInMonth` 并发宽度分配** | Schedule-X §2.5                            | Flux 已采用（`calendar-layout-utils.ts`）。                      |
| **拖拽创建用长按延迟区分点击**                          | Schedule-X `createDragStartTimeout(150ms)` | Flux 用 500ms（偏长但可接受），**但 timer 无提前清除**（P1）。   |
| **拖拽中实时预览扫过范围**                              | Google Calendar 行业基线                   | Flux **未采用**（P1）。                                          |
| **PointerEvent 统一输入**                               | Schedule-X、Flux 现状                      | 正确。但 Flux 缺 touch-action（P1）。                            |

### 反模式

| 反模式                            | 证据        | Flux 是否命中     |
| --------------------------------- | ----------- | ----------------- |
| JS 设拖拽属性但 CSS 无对应规则    | —           | 是（P0）          |
| 源事件拖拽中不降低透明度          | Kanban 对比 | 是（P2）          |
| 键盘每次箭头即提交 + Enter 再提交 | —           | 是（P1 双重提交） |

---

## 四、AI 交互最佳实践

### 可靠模式

| 模式                                          | 证据来源                                 | 说明                                           |
| --------------------------------------------- | ---------------------------------------- | ---------------------------------------------- | --------------------------- |
| **消息分组策略**（`groupStrategy: consecutive | divider`）                               | tiny-robot BubbleList                          | Flux 未实现分组（可后续）。 |
| **渲染器注册制**（priority + matcher）        | tiny-robot `BubbleRendererMatchPriority` | Flux 用 content type 分发（可接受）。          |
| **全局 store 共享配置**                       | tiny-robot `BubbleProvider`              | Flux 用 React context（与 Zustand 对齐）。     |
| **流式逐字渲染 = 全 buffer 重解析 + 光标**    | tiny-robot、Flux `markdown.tsx`          | 性能可接受（markdown 缓冲保护）。Flux 已采用。 |
| **虚拟化阈值**（>N 条才虚拟化）               | 行业基线                                 | Flux 阈值 200，已采用。                        |
| **`role="log" aria-live="polite"`**           | WAI-ARIA                                 | Flux 已采用（message-list）。                  |

### 反模式

| 反模式                           | 证据           | Flux 是否命中 |
| -------------------------------- | -------------- | ------------- |
| 无 IME 组合输入保护              | 所有主流输入框 | 是（P1）      |
| 上传 status 类型声明但不渲染     | —              | 是（P1）      |
| 零 transition 声明（全包无过渡） | —              | 是（P2 多处） |

---

## 五、跨组件通用最佳实践（最高优先）

以下模式经 Gantt/Kanban/Calendar/AI 四类组件一致验证，应作为**共享基础设施**抽取：

1. **`touch-action` 策略**：所有可拖拽元素必须设 `touch-action`（pan-y 或 none）。四类组件全部缺失 → 触摸设备统一失效。这是本次审计**最高频、最高影响**的共性缺陷。
2. **共享拖拽 affordance**：ghost 透明度/阴影/scale、drop indicator 样式、`data-dragging`/`data-drop-target` 标记 + 对应 CSS，应跨组件一致（抽 `useDragGhost` hook + 共享 CSS 类）。当前 Gantt/Kanban/Calendar 三套各异。
3. **RAF 节流拖拽 move**：所有 pointermove 处理应经 `requestAnimationFrame` coalesce。当前 Gantt/Kanban/Calendar 三处都裸跑。
4. **ARIA live 拖拽播报**：拖拽中应有 `aria-live` 播报状态。仅 Kanban 有（`dndAnnouncement`），Gantt/Calendar 无。
5. **激活阈值**：拖拽应有距离/延迟阈值区分点击。仅 Calendar drag-create 有（500ms），其余无。
6. **IME 保护**：所有文本输入提交需 `isComposing` 守卫。AI sender 缺失。
