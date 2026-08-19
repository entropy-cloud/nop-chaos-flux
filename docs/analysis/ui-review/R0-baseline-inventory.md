# R0 — UI 资产盘点与基线实测

> Last Updated: 2026-08-19（live 实测，worktree `nop-chaos-flux-ui-review`，基点 66476513d）
> Mission: `missions/ui-review.json` · Roadmap: `docs/backlog/ui-review-roadmap.md`（R0 产出文档）
> 口径声明：计数类事实全部 live 实测；方法随条目注明，复测命令见 §5。

## 1. Renderer 注册数（运行时 registry 口径）——**122**

roadmap Current Baseline 原记 88（`rg "type: '[a-z0-9-]+'"` 限 `*-definitions.ts` 口径，漏计散装注册）。本节按运行时 registry 口径重测：对每个 renderer 包调用其 `register*Renderers(createRendererRegistry())` 后 `registry.list().length`（与 playground `App.tsx` 的组装方式一致）。industrial 两项因 leafer-ui 需真实 canvas（jsdom 下 import 即初始化）改用定义文件静态口径（`type: 'xxx'` 唯一值），ai 同法复核。

| 包                               |  注册数 | 备注                                                                           |
| -------------------------------- | ------: | ------------------------------------------------------------------------------ |
| flux-renderers-basic             |      16 | page/container/flex/text/icon/…（运行时）                                      |
| flux-renderers-form              |      22 | input-\* 族（运行时）                                                          |
| flux-renderers-form-advanced     |      19 | combo/input-table/transfer/picker/condition-builder（运行时）                  |
| flux-renderers-content           |      19 | 内容/反馈/媒体（运行时）                                                       |
| flux-renderers-data              |      10 | table/crud/chart/list…（运行时）                                               |
| flux-renderers-layout            |       8 | 布局/流程/actions（运行时）                                                    |
| flux-renderers-mobile            |       5 | 移动交互（运行时）                                                             |
| flux-renderers-scheduling        |       4 | gantt/kanban/calendar/barcode-input（运行时）                                  |
| flux-renderers-graph             |       1 | flow/designer 入口（运行时）                                                   |
| flux-renderers-map               |       1 | 地图入口（运行时）                                                             |
| flux-renderers-pivot             |       1 | 透视入口（运行时）                                                             |
| flux-renderers-industrial        |       1 | `scada-canvas`（静态口径；symbols 为其内部数据非独立 type）                    |
| flux-renderers-industrial/editor |       1 | `scada-editor-canvas`（静态口径）                                              |
| flux-renderers-ai                |      14 | ai-chat/bubble/sender/conversations/…（静态口径复核=运行时路由清单 14 条一致） |
| **合计**                         | **122** | registry 无跨包重名（逐包独立注册无 duplicate 报错）                           |

**Roadmap Current Baseline 修正**：注册 renderer 实测 **122 个**（运行时 registry 口径），原 88 为旧口径下限。

## 2. `@nop-chaos/ui` 组件基座

- **62 个组件模块**（`packages/ui/src/components/ui/` 非 test 文件实测；含 94 文件总数中剔除 32 个 `*.test.*`）。`index.ts` 以 `export * from` 逐模块导出——公共面大于 AGENTS.md 精选清单（40+），AGENTS.md 清单为"写作 JSX 前先查"的常用面而非全集。
- 模块覆盖面（超出 AGENTS.md 清单的部分，R2 审查范围候选）：accordion、alert/alert-dialog、aspect-ratio、avatar、breadcrumb、calendar、carousel、chart、collapsible、command、context-menu、direction、hover-card、input-group、input-otp、item、json-viewer、menubar、navigation-menu、pagination、sonner（toast 基座）、table-row-class-name、sidebar-context/sidebar-layout/sidebar-menu、theme-contract、toggle-group、use-dialog-drag、wrap-surface-tab-focus 等。
- 工具/hooks（16）：`cn`、`toast`、icon 解析族（resolveLucideIcon\* 等 5）、z-index 治理族（4）、`useBreakpoint(s)`/`useIsMobile`、i18n getter/setter。
- **R1/R2 输入**：62 模块中 AGENTS.md 未列的 ~22 个属于"未宣传能力"，R1 对标 shadcn/ui 原生集时按同源性归类；R2 一致性审查需覆盖全部 62（含 sidebar 族与 navigation 族的边界）。

## 3. `packages/theme-tokens` 令牌覆盖

- **4 套调色板**：`classic`/`glass` × `light`/`dark`（`styles.css` `[data-theme][data-mode]` 四块，实测行号 112/172/232/292）。
- **324 个 CSS 变量**（`grep -c '^\s*--'`），平均每调色板 81 个；语义含 color（8 大类）、radius、spacing 等。
- 暗色完整度：两主题均有 dark 变体（结构对称，逐变量对齐度留 R2 抽查）。
- 消费方式：playground `main.tsx` 挂 `data-theme="classic"` + `data-mode="light"` 默认值；无 React ThemeProvider（主题独立契约）。

## 4. Playground 复杂页 19 张（复杂度分级）

复杂度分级沿 sundial 分析 §3 口径：★ 数 = 结构密度 + 数据源 + 多区协同 + 交互回路 + 跨视图状态的叠加（★★★★★ = 全部具备）。

| 页面                | 行数 | 特征                                                           | 复杂度 |
| ------------------- | ---: | -------------------------------------------------------------- | ------ |
| sundial-workbench   | 2210 | 三栏 shell + 5 视图状态机 + 任务行 + 详情 dialog + 嵌套 picker | ★★★★★  |
| sundial-settings    | 1643 | 5 section 切换 + 模式卡 + 保存写后端                           | ★★★★☆  |
| sundial-detail      | 1320 | 字段行 + 4 类 picker + 子任务 CRUD + 移动写后端                | ★★★★☆  |
| sundial-analytics   |  731 | 4 KPI + 3 图表 + drill-down focus                              | ★★★★☆  |
| dashboard           |  474 | KPI + chart + table 组合                                       | ★★★☆☆  |
| master-detail       |  367 | 主从 + 4 tabs + 表单/表格协同                                  | ★★★☆☆  |
| standard-crud       |  360 | 查询 + 表格 + 新增/编辑 dialog + 删除确认                      | ★★★☆☆  |
| sundial-todo-dialog |  329 | 360dp 表单 dialog + 3 字段行 picker（嵌套表面）                | ★★★☆☆  |
| detail-subtables    |  242 | 主表 + 3 子表 tabs                                             | ★★★☆☆  |
| approval-tasks      |  188 | 待办列表 + 批量审批表单                                        | ★★☆☆☆  |
| form-wizard         |  165 | 分步表单                                                       | ★★☆☆☆  |
| complex-form        |  159 | 分组表单（3 个并列 fieldset）                                  | ★★☆☆☆  |
| business-document   |  131 | 单据 + 公式列合计                                              | ★★☆☆☆  |
| crud-views-export   |  121 | crud 视图切换 + 导出                                           | ★★☆☆☆  |
| tree-crud           |   94 | 树 + crud                                                      | ★★☆☆☆  |
| advanced-query      |   87 | 条件构建查询                                                   | ★★☆☆☆  |
| combo-editor        |   78 | 复合字段编辑                                                   | ★☆☆☆☆  |
| inline-edit-table   |   71 | 行内编辑                                                       | ★★☆☆☆  |
| dynamic-tabs        |   51 | 动态/远程 tab                                                  | ★☆☆☆☆  |

**C1 去重基线**：企业向 14 页集中在 ★★~★★★（表格/表单/主从/向导族），Sundial 5 页占据 ★★★★+（表面嵌套/状态机/跨视图交互）——C1 构想的 8-12 页应避开这两个已覆盖簇（构想焦点：命令面板、多视图数据库、高密度金融表、看板拖拽重排、预约流程、审批中心流程图、图表门户、移动 shell——见 roadmap C1 节）。

## 5. 复测命令（口径可再现）

```bash
# renderer 注册数（运行时口径；industrial/editor/ai 用静态口径见 §1 备注）
#   逐包: import register*Renderers -> createRendererRegistry() -> list().length
rg "type: '[a-z0-9-]+'" packages/flux-renderers-{ai}/src/*-definitions.ts -o | sort -u
ls packages/ui/src/components/ui/*.* | grep -v '.test.' | wc -l     # = 62（含 3 个 .ts 工具模块）
grep -c '^\s*--' packages/theme-tokens/src/styles.css               # = 324
ls apps/playground/src/complex-pages/page-schemas/ | wc -l          # = 19
```

## 6. R 系列文档脚手架

本目录（`docs/analysis/ui-review/`）为 R 系列产出根：R0（本文）→ R1-framework-benchmark.md → R2-consistency-audit.md（后续工作项产出）。模板约定：标题 + Last Updated（含基点 commit）+ 口径声明 + 分节实测数据/评分 + 复测命令 + 喂给下一工作项的输入清单。

## 7. 对 roadmap 的回写

- Current Baseline「注册 renderer 实测 88」→ **122（运行时 registry 口径，方法见 §1）**；「漏计 form-advanced 等散装注册」备注撤销（本口径已含）。
- Current Baseline「plan 460 在途」→ **plan 460 已 completed（2026-08-19，commit 66476513d，两轮独立 closure audit approved）**；R0 前置满足。
- `@nop-chaos/ui` 导出描述修正：64 行导出清单 → **62 组件模块（export \* 全量）+ 16 工具/hooks**。
