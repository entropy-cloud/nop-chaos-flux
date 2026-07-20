# 复杂控件组织与文档规范

> 状态：proposal
> 日期：2026-07-20
> 相关：`package-splitting-strategy.md`、`index.md`、`roadmap.md`
> 参考输入：nop-app-erp 复杂控件清单分析（分析文档路径待定）

---

## 1. 问题陈述

nop-app-erp 项目识别出 3 个当前 flux 未覆盖的核心复杂控件需求：**甘特图（Gantt）**、**看板（Kanban）**、**排班日历（Calendar）**。另有 2 个次级需求：条码扫描输入（Barcode-input）和版本对比视图（Diff-view）。

这些控件的共同特征：

| 特征                 | 说明                                                                           |
| -------------------- | ------------------------------------------------------------------------------ |
| **交互复杂度高**     | 需要拖拽、缩放、自定义渲染引擎，非简单的表单/展示组件                          |
| **重量级依赖可能性** | 可能需要 `dnd-kit`、日期库、或自定义渲染引擎（Canvas/SVG）                     |
| **领域偏向**         | ERP/项目管理/排产场景，非通用 UI 模式                                          |
| **代码量大**         | 每个预计超 1000 行，Gantt 预计 3000-5000 行                                    |
| **与现有类别正交**   | 不参与 form value/validation 通道，不是纯展示，不是数据驱动 CRUD，不是布局容器 |

核心问题：

1. 这些控件应放在哪个包？是否新建包？
2. 文档如何组织才能与现有规范一致？

---

## 2. 决策树分析

按 `package-splitting-strategy.md §6` 决策树逐项判定：

### 2.1 甘特图（Gantt）

| 决策节点                     | 答案                 | 理由                                                                        |
| ---------------------------- | -------------------- | --------------------------------------------------------------------------- |
| 领域宿主集成？               | → 否                 | 不是 designer/report/spreadsheet/word                                       |
| 重量级外部依赖？             | → 否                 | 可能使用 dnd-kit（已在 form-advanced 中使用），无 ECharts/CodeMirror 级依赖 |
| 参与 form value/validation？ | → 否                 | 甘特图是只读+交互式调度工具，不是表单字段                                   |
| 以数据驱动为主？             | → 否                 | 不从内置数据源管理分页/排序，数据由外部提供                                 |
| 布局编排或流程控制？         | → 否                 | 不是 grid/wizard/steps 类布局容器                                           |
| **结论**                     | → 不属于现有任何类别 | **需要新建包**                                                              |

### 2.2 看板（Kanban）

| 决策节点                     | 答案         | 理由                                                                                                                                                                                         |
| ---------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 领域宿主集成？               | → 否         |                                                                                                                                                                                              |
| 重量级外部依赖？             | → 否         | dnd-kit 已在 form-advanced 中使用                                                                                                                                                            |
| 参与 form value/validation？ | → 否         | 看板是卡片式交互展示，字段值写入通过 action 完成                                                                                                                                             |
| 以数据驱动为主？             | → 否         | 不从内置数据源管理分页/排序                                                                                                                                                                  |
| 布局编排或流程控制？         | → 部分是     | 看板本质是多列布局+卡片流控制，与 layout 的职责接近                                                                                                                                          |
| **深入分析**                 |              | 看板的核心价值是业务状态可视化+拖拽状态迁移，不同于 layout 的纯布局编排（grid/collapse/wizard）。`layout` 包中的组件（wizard/steps/timeline）是线性/顺序流程，看板是非线性、多并行的卡片编排 |
| **结论**                     | → 需要新建包 | 放入 layout 会造成职责混杂（layout 现有组件不涉及业务状态可视化）                                                                                                                            |

### 2.3 排班日历（Calendar）

| 决策节点                     | 答案         | 理由                         |
| ---------------------------- | ------------ | ---------------------------- |
| 领域宿主集成？               | → 否         |                              |
| 重量级外部依赖？             | → 否         | 日期库（date-fns）已在项目中 |
| 参与 form value/validation？ | → 否         | 日历是交互式调度展示         |
| 以数据驱动为主？             | → 否         |                              |
| 布局编排或流程控制？         | → 否         |                              |
| **结论**                     | → 需要新建包 |                              |

### 2.4 条码扫描输入（Barcode-input）

| 决策节点         | 答案                         | 理由                                                                                                                         |
| ---------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 领域宿主集成？   | → 否                         |                                                                                                                              |
| 重量级外部依赖？ | → 是                         | 需要 `@zxing/library` 或 `quagga2`（浏览器扫码解码库）                                                                       |
| **结论**         | → 独立包或放入 form-advanced | 它是表单输入字段，参与 value 通道。如果是 input 子类型，可归入 form-advanced；如果有独立依赖，可模仿 `flux-code-editor` 模式 |

### 2.5 版本对比视图（Diff-view）

| 决策节点                     | 答案         | 理由                                                                |
| ---------------------------- | ------------ | ------------------------------------------------------------------- |
| 领域宿主集成？               | → 否         |                                                                     |
| 重量级外部依赖？             | → 否         | 可集成 diff-match-patch（小型纯算法库）                             |
| 参与 form value/validation？ | → 否         | 纯展示组件                                                          |
| 以数据驱动为主？             | → 否         |                                                                     |
| 布局编排或流程控制？         | → 否         |                                                                     |
| **结论**                     | → content 包 | 它是纯展示组件，与 content 包的定位一致（card/mapping/status 同族） |

---

## 3. 包组织建议

### 3.1 新建 `@nop-chaos/flux-renderers-scheduling`

**包名**：`@nop-chaos/flux-renderers-scheduling`

**职责**：交互式排程/调度/计划类组件的渲染器包。包含时间线可视化、资源排布、卡片编排等需要复杂交互（拖拽、缩放、自定义渲染）的非标准 UI 组件。

**包含组件**：

| type       | 组件     | 复杂度 | 交互                                    | 预估行数  |
| ---------- | -------- | ------ | --------------------------------------- | --------- |
| `gantt`    | 甘特图   | ★★★    | 资源行×时间线、拖拽调任务、依赖线、缩放 | 3000-5000 |
| `kanban`   | 看板     | ★★★    | 多列拖拽卡片、动态列、卡片模板          | 1500-3000 |
| `calendar` | 排班日历 | ★★★    | 月/周矩阵、事件渲染、日期导航           | 2000-4000 |

**分组理由**：

这三个组件虽然内部机制不同，但有共同的特征使其不适合放入任何现有包：

1. **都需要拖拽** — 不像现有组件（只有 form-advanced 的 array-editor 等少量使用 dnd-kit）
2. **都需要自己的渲染引擎** — 不是标准 DOM 排版（table/card），需要 SVG/Canvas 或自定义布局
3. **都不参与 form value/validation 通道** — 不从 form family
4. **都不是纯展示** — 不从 content（content 是只读展示，这些是交互式编排）
5. **都不以数据驱动为主** — 不从 data（data 组件管理数据获取/分页/排序，这些组件从外部接收数据）
6. **共享基础设施潜力** — 日期工具、拖拽上下文、缩放控制可以共用

**不放入 layout 的理由**：
`package-splitting-strategy.md §2.4` 定义 layout 的职责是"布局编排或流程控制"（grid/wizard/steps/timeline/button-group）。看板虽然有"卡片编排"的一面，但核心价值是**业务状态可视化+状态迁移触发**，不是布局。甘特图/日历也与布局无关。

**打包判据检查**（§1.2 合理上限）：

| 指标                 | 建议上限 | scheduling 预估               |
| -------------------- | -------- | ----------------------------- |
| 源码行数（不含测试） | ~5,000   | ~6,500–12,000（3 个控件合计） |
| 注册 renderer 数     | ~20      | 3                             |
| 子系统数             | ~5       | 3（gantt/kanban/calendar）    |

源码行数可能超上限。建议采用**子系统目录结构**（参考 form-advanced），未来超过 12,000 行时考虑逐个拆分独立包。

**依赖**：

```
flux-react, flux-runtime, flux-formula, flux-core,
ui, lucide-react,
@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities,
date-fns
```

**依赖分析**：

- `dnd-kit` 已在 form-advanced 中使用，复用不增加总依赖
- `date-fns` 已在项目中，部分包已直接依赖
- 无需 echarts/codemirror 类重量级依赖

**内部结构建议**：

```
src/
├── index.ts                          # 统一导出
├── schemas.ts                        # 全部三个组件的 schema 接口
├── scheduling-renderer-definitions.ts # 注册定义
├── gantt/
│   ├── index.ts                      # 导出 GanttRenderer
│   ├── gantt.tsx                     # 主渲染器
│   ├── gantt-utils.ts                # 时间线/坐标计算工具
│   ├── gantt-task-bar.tsx            # 任务条子组件
│   ├── gantt-dependency-line.tsx     # 依赖线子组件
│   ├── gantt-header.tsx              # 时间轴头部
│   ├── gantt-row.tsx                 # 资源行
│   └── use-gantt-drag.ts            # 拖拽 hook
├── kanban/
│   ├── index.ts                      # 导出 KanbanRenderer
│   ├── kanban.tsx                    # 主渲染器
│   ├── kanban-column.tsx             # 单列
│   ├── kanban-card.tsx               # 单卡片
│   └── use-kanban-drag.ts           # 跨列拖拽 hook
├── calendar/
│   ├── index.ts                      # 导出 CalendarRenderer
│   ├── calendar.tsx                  # 主渲染器
│   ├── calendar-month.tsx            # 月视图
│   ├── calendar-week.tsx             # 周视图
│   ├── calendar-event.tsx            # 事件块
│   ├── calendar-utils.ts             # 日期计算工具
│   └── use-calendar-drag.ts         # 拖拽创建/移动事件 hook
└── __tests__/
    ├── gantt.test.tsx
    ├── kanban.test.tsx
    └── calendar.test.tsx
```

### 3.2 条码扫描：放入 `flux-renderers-form-advanced` 或独立包

**推荐：放入 `flux-renderers-form-advanced`**

理由：

- 它是表单输入字段（`type: "barcode-input"`），参与 value 通道
- 属于 `input-*` 家族，与 input-text/input-number/input-file 同类
- `@zxing/library` 的浏览器扫码 API 是纯前端，不涉及后端集成
- 如果后续依赖膨胀，可仿 `flux-code-editor` 模式独立

### 3.3 版本对比视图：放入 `flux-renderers-content`

**推荐：放入 `flux-renderers-content`**

理由：

- 它是纯展示组件（`type: "diff-view"`），不参与 value 通道
- 与 content 包的定位一致（只读渲染、jsong-view/html/markdown 同类）
- diff-match-patch 是小型纯算法库（~30KB），非重量级依赖

---

## 4. 文档组织规范

### 4.1 文档应放哪里

nop-chaos-flux 现有 3 层文档体系：

| 层级         | 位置                            | 用途                                 | 必须包含                     |
| ------------ | ------------------------------- | ------------------------------------ | ---------------------------- |
| 组件设计文档 | `docs/components/<type>/`       | 面向开发/设计器/AI 产码的组件契约    | `design.md` + `example.json` |
| 设计模式文档 | `flux-guide/design-patterns/`   | 面向 schema 作者/AI agent 的用法指南 | 自包含 Markdown + JSON 示例  |
| 架构决策文档 | `docs/` 或 `docs/architecture/` | 跨组件架构决策和规范                 | Markdown                     |

新控件需要全部 3 层。

### 4.2 组件设计文档（`docs/components/<type>/`）

每个组件一个目录。目录名使用 schema `type`：

```
docs/components/
  gantt/
    design.md
    example.json
  kanban/
    design.md
    example.json
  calendar/
    design.md
    example.json
  barcode-input/
    design.md
    example.json
  diff-view/
    design.md
    example.json
```

`design.md` 按 `docs/components/index.md` 的 12 段模板：

```
1. 组件定位
2. 与 AMIS / 竞品的能力对照
3. Flux 中的 renderer/type 定义
4. schema 设计
5. 字段分类（静态值 | 表达式值 | region | event | source-enabled value）
6. regions 与 slot 约定
7. 运行期状态归属（local | controlled | scope）
8. 事件、动作与组件句柄能力
9. 数据源、表达式、导入能力接入点
10. 样式与 DOM marker 约定
11. 实现拆分建议（哪些逻辑在 renderer 层，哪些抽 helper/controller）
12. 风险、取舍与后续阶段
```

`example.json` 至少包含：

- 一个最小可用示例
- 一个带全功能的示例
- 按 `docs/components/examples.manifest.json` 标注状态

### 4.3 设计模式文档（`flux-guide/design-patterns/`）

每个组件一个 `.md` 文件：

```
flux-guide/design-patterns/
  gantt.md
  kanban.md
  calendar.md
  barcode-input.md
  diff-view.md
```

格式：自包含 Markdown + JSON schema 示例 + 字段参考表。

遵循 `flux-guide/design-patterns/` 的现有风格：

- 中文
- 每个 pattern 编号
- 完整可运行的 JSON 片段
- 需要引用 `flux-types/schema.d.ts` 类型定义

完成后更新 `flux-guide/design-patterns/README.md` 的目录表。

### 4.4 schema.d.ts 类型

在 `flux-guide/flux-types/schema.d.ts` 中增加这 5 个新组件的 schema interface。`index.ts` 中的 `FluxSchema` union 由 `pnpm generate-types` 自动生成，无需手写。

### 4.5 与现有规范的异同

| 规范            | 现有组件              | 新控件                           | 原因                                      |
| --------------- | --------------------- | -------------------------------- | ----------------------------------------- |
| 包归属          | 按职责分到 7 个现有包 | 新增 `flux-renderers-scheduling` | 现有类别无法容纳（§2 分析）               |
| 组件设计文档    | 12 段模板             | 相同                             | 复用现有规范                              |
| example.json    | 必须                  | 相同                             | 复用现有规范                              |
| design-patterns | 30 个文件             | 新增 5 个                        | 复用现有规范                              |
| 分包判据        | §6 决策树             | 需补充新分支                     | `scheduling` 是 "交互式编排可视化" 新类别 |

---

## 5. 对现有规范的补充建议

### 5.1 更新 `package-splitting-strategy.md` 决策树

在 §6 决策树中，`"否则：flux-renderers-content"` 之前，增加新分支：

```
...

否则是否是布局编排或流程控制？
  → 是：flux-renderers-layout（如 grid, wizard）
否则是否是交互式编排可视化（拖拽/缩放/时间线/卡片编排）？
  → 是：flux-renderers-scheduling（如 gantt, kanban, calendar）
否则：flux-renderers-content（纯展示/反馈，如 card, cards, badge）
```

### 5.2 更新 `docs/components/roadmap.md`

在 W1-W4 + D1a 之后，新增 `Scheduling` 波次：

| Wave | Count | Components    | 预估工作量   |
| ---- | ----- | ------------- | ------------ |
| S1   | 1     | gantt         | 3000-5000 行 |
| S2   | 1     | kanban        | 1500-3000 行 |
| S2   | 1     | calendar      | 2000-4000 行 |
| S3   | 1     | barcode-input | 500-1000 行  |
| S3   | 1     | diff-view     | 500-1000 行  |

### 5.3 更新 `docs/components/index.md`

在目录约定中补充 scheduling 新包的说明。

---

## 6. 实施阶段

### Phase 0：基建

- [ ] 创建 `packages/flux-renderers-scheduling/`（package.json、tsconfig、vitest.config）
- [ ] 编写 `docs/components/gantt/design.md`
- [ ] 编写 `docs/components/kanban/design.md`
- [ ] 编写 `docs/components/calendar/design.md`
- [ ] 编写 `flux-guide/design-patterns/gantt.md`
- [ ] 编写 `flux-guide/design-patterns/kanban.md`
- [ ] 编写 `flux-guide/design-patterns/calendar.md`
- [ ] 在 `flux-guide/flux-types/schema.d.ts` 声明类型
- [ ] 更新 `package-splitting-strategy.md` 决策树
- [ ] 更新 `docs/components/examples.manifest.json`

### Phase 1：甘特图实现

- [ ] 实现 `src/gantt/` 子系统
- [ ] 注册到 playground registry
- [ ] playground 中验证
- [ ] `pnpm typecheck && pnpm build && pnpm test`

### Phase 2：看板实现

- [ ] 实现 `src/kanban/` 子系统
- [ ] 注册到 playground registry
- [ ] 验证
- [ ] `pnpm typecheck && pnpm build && pnpm test`

### Phase 3：排班日历实现

- [ ] 实现 `src/calendar/` 子系统
- [ ] 注册到 playground registry
- [ ] 验证
- [ ] `pnpm typecheck && pnpm build && pnpm test`

### Phase 4：轻量控件

- [ ] 实现 `barcode-input` → `flux-renderers-form-advanced`
- [ ] 实现 `diff-view` → `flux-renderers-content`
- [ ] 各自设计文档 + design-patterns
- [ ] 验证

---

## 7. 参考

- `docs/components/package-splitting-strategy.md` — 现有分包规范
- `docs/components/index.md` — 组件文档规范
- `package-reorganization-analysis.md` — 现有包的稳定性分析
- `nop-app-erp/docs/analysis/2026-07-20-complex-ui-controls-inventory-for-flux.md` — ERP 控件缺口分析
- `~/sources/complex-controls/` — 开源参考项目（SVAR Gantt、Schedule-X、react-kanban-kit 等）
