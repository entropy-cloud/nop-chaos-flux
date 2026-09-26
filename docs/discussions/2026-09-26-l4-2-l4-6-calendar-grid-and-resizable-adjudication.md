# L4.2 calendar grid 视图档 + L4.6 Resizable schema 化 — 双项裁决

> Date: 2026-09-26
> Owner plan: `docs/plans/514-missing-components-l4-deep-calendar-grid-resizable-plan.md`（Phase 1 design gate）
> Sources: roadmap §7 L4.2/L4.6 行；V11a-scheduling.md A3 否决先例；C1:36 / C2:31 / D2-closure.md:72（G-J 登记链）；calendar.tsx / calendar-date-utils.ts / ui resizable.tsx live 核对
> Review: 独立 fresh 审阅（2026-09-26）：通过（有保留意见）——L4.2/L4.6 可行性全部核实（分流点/empty 门/dateOwnership/react-resizable-panels API/matrix 零先例行）；4 minor（a Review 头注回填、b schema↔底层 API 名映射补记、c body region 优先级显式化、d dateOwnership 收窄留痕）已当轮落字，0B/0M 共识达成

## 1. L4.2 — calendar `monthShape` 双档 + date-cell 选中 API

### 1.1 与 V11a A3 否决先例的关系（重裁）

V11a A3（plan 481）否决的是「把既有月视图改成 6 周网格」——理由是排班月视图（资源行 × 日期列矩阵）的设计意图。本裁决**不改既有月视图语义**：新增形态档 `monthShape: 'resource' | 'grid'`，resource 为缺省且逐字节保持现状；grid 档是 month 视图下的并存形态（Booker 式 6 周竖网格）。A3 的「设计意图」论据只约束 resource 档，grid 档服务日期选择 archetype（B4/booking 类），两者并存无冲突。

### 1.2 Schema 契约

```jsonc
{
  "type": "calendar",
  "view": "month",
  "monthShape": "grid", // 缺省 'resource'；仅 view=month 时有意义
  "onDateSelect": { "action": "..." }, // grid 档日期格选中事件
}
```

- `monthShape` 值域外/缺省 → 'resource'（归一化，Failure Path 同 density 模式）。
- view ≠ month 时 monthShape 被忽略（header 切到 week/day 照旧；切回 month 恢复 grid 形态）。

### 1.3 grid 档渲染契约

- **6×7 = 42 格固定**：含首日前补位与末日后补位（相邻月日期，弱化视觉 `data-outside-month`）；周起点沿用既有 `firstDayOfWeek`。新 util `getSixWeekGrid(currentDate, firstDayOfWeek)` 落 calendar-date-utils.ts（不回写既有 getMonthStartEnd/getDateRange）。
- **格子语义**：`role="grid"`/`role="row"`/`role="gridcell"`，cell 内 button 聚焦（自然 tab 序），Enter/Space 派发选中；aria-label 用完整本地化日期。今日 `data-today`、选中 `data-selected`、补位 `data-outside-month`。
- **纯选择面**：不渲染事件/资源/拖拽创建/键盘创建（Non-Goal 重申）；resource 档零改动。

### 1.4 onDateSelect 事件与所有权

- payload：`{ date: '<ISO yyyy-mm-dd>', inMonth: boolean }`，经既有 `eventCtx` 分发（CX-10 惯例，action args 可读 `${date}`/`${inMonth}`）。
- **不接 dateOwnership**：选中 ≠ 导航（currentDate 不变、不发 onDateChange）；dateOwnership:'scope' 通道保持只由 header 导航驱动（既有 e2e 零影响）。选中态为 grid 档内部 state（`data-selected` 标记）；持久化需求出现时走 onDateSelect action 写 scope，不建第二所有权通道。
- **empty 早退门处置**（calendar.tsx:432-445）：`monthShape: 'grid'` 时**绕过**该门（grid 是纯日期面，零事件/资源 schema 也应渲染）——在门条件上加 `resolved.monthShape !== 'grid'`；resource 档行为逐字节不变。
- **body region 优先级**（review c）：`regions.body` 分支（calendar.tsx:459）先于视图渲染——grid 档同样被 body region 覆盖（body 在即 body 赢，grid 不渲染）；显式声明此优先级为既有 body 语义的自然延伸，不另设例外。

### 1.5 兼容红线（可测）

1. 缺省 schema（无 monthShape）渲染输出与现状一致（既有 calendar e2e 全绿）。
2. resource 档显式声明与缺省一致。
3. header 切换器、`CalendarHandle.setView`、viewOwnership、`data-view` 属性不受影响。

## 2. L4.6 — `resizable` 布局 renderer type（G-J）

### 2.1 路由裁决：新 flux-native 布局 type，落 `flux-renderers-layout`

- 三选项比较：①flex/panel 增语义字段——把分栏强塞进既有容器语义，方向/尺寸/手柄正交于 flex 语义，字段面纠结；②page 级 slot——超出页面壳层职责；③**新 type `resizable`**——语义自洽（分栏是独立布局原语），与 D1 的 keyboard/batch-bar/command-palette 等 flux 原生扩展 type 同构。**裁定 ③**。
- **matrix flip 裁定：不需要**。`resizable` 非 AMIS 基线类型（AMIS 无对应 type，matrix 无行可翻；flux 原生扩展先例 keyboard/batch-bar 均无 matrix 行）——roadmap Rule 3 的「matrix flip 硬前置」只约束 AMIS 基线 retained type。514 plan Phase 1 的 flip 条款据此落空并记录。
- 包落点：`flux-renderers-layout`（包章程即 layout/actions；ui `ResizablePanelGroup/Panel/Handle` 为底座）。

### 2.2 Schema 契约

```jsonc
{
  "type": "resizable",
  "direction": "horizontal", // 缺省 horizontal；vertical 可选
  "persistStatePath": "$page.layout", // 可选；面板尺寸百分比数组回写 scope（拖拽结束时机）
  "panels": [
    { "key": "nav", "defaultSize": 25, "min": 10, "max": 40 },
    { "key": "main" }, // 缺省：剩余空间（react-resizable-panels 语义）
    { "key": "side", "defaultSize": 20, "min": 10 },
  ],
}
```

- `panels[].key` 必填唯一；`defaultSize/min/max` 为**百分比**（终裁，实施勘误两轮：初裁百分比 → 误改 flex-grow 权重 → 按 v4 `minSize/maxSize` typings 与实测行为终裁回百分比，renderer 以 percent 字符串钳制与传参；min/max 约束拖拽域，非法值钳制——Failure Path resizable-schema-invalid）；相邻 panel 间自动渲染 `ResizableHandle`（`withHandle` 视觉把手）。`persistStatePath` 持久化内容 = 面板尺寸百分比数组（settle 时由 flexGrow 归一化）。
- 面板内容：每 panel 的 `body` 走编译 region（`panels` 为 region 化字段，与 tabs/flex 的子节点模式一致——实现时按 layout 包既有 region 惯例落）。

### 2.3 持久化与 bespoke 统一口径

- 持久化：拖拽结束把面板尺寸百分比数组（由 flexGrow 归一化）写 `persistStatePath`（scope.merge；可选字段，缺省不持久化）；初始挂载读该 path 覆盖 defaultSize（读取失败/损坏回落 default——Failure Path 行 4）。**schema↔底层 API 映射**（实现时按此记录，勿照抄底层名）：schema `min`/`max` → `minSize`/`maxSize`；schema 层「拖拽结束回调」→ `Group.onLayoutChanged`。
- **bespoke 三处（workbench/flow-designer/dashboard）裁定：保留声明豁免，不迁移**——均为设计器/workbench 内部壳层 UI（非 schema 消费面），迁移无 schema 侧收益且回归面大；本 type 的 closure 对象是「schema 可表达的 resizable 布局能力成立」（roadmap 513 移交注记同口径）。

### 2.4 交付面（交付铁律裁度）

flux 原生新 type 无 AMIS 对照 → design.md 以 layout 包内文档节承载（`docs/components/resizable/design.md` 按 12 节先例新写）+ example.json + playground layout lab 场景 + home 入口（L0 注册表自动露出）+ quick-reference/flux-guide 登记 + focused 单测 + e2e（拖把手 → 尺寸变化 getComputedStyle/bounding 断言）+ i18n（把手 aria-label，zh/en）。

## 3. 横切

- 两项均为「必须自动化」档（plan 514 Test Strategy 预声明）。
- 登记：quick-reference（monthShape/onDateSelect；resizable type 行）+ flux-guide（calendar schema 节增 monthShape；layout 新 type 节）+ calendar design.md §12 与 resizable design.md 新建。
- oversized：改动面含 calendar.tsx（大文件）——grid 视图独立组件文件（calendar-grid-view.tsx），calendar.tsx 只加分流与门条件最小 diff。
