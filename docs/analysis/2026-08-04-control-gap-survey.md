# Flux 控件缺口调研：~/sources 与 ~/ai 项目控件提取候选

> 日期：2026-08-04
> 调研范围：`~/sources`（UI 组件库 + 低代码/工作流平台 + 业务/电商/数据平台 + 专业控件）
> 排除（按用户指定）：工业 HMI（`industrial-hmi-research`）、AI 工具 Web UI（`~/ai/*`）
> 对照基准：`docs/components/index.md` 已注册 renderer 清单（~120 个）+ 已知 targetContract（gantt/kanban/calendar/barcode/diff-view/graph）
> 方法：4 个独立子代理分组扫描源码/README/组件目录 → 候选去重合并 → 跨组信号叠加评级

## TL;DR

扫描 40+ 项目后，**Flux 现有 ~120 renderer 覆盖度已很高**，AMIS/Formily/Vant/Ant 的多数原子控件均已映射。真正缺口的集中在三类：**①一批行业标准原子控件 Flux 尚无对应物**；**②数据/BI 场景的可视化与编排控件空白**；**③若干已有控件的能力增强**（非新控件）。

**Tier 1 高价值候选（14 个，建议优先立项）**——多库通用 + 原子独立 + 与 ERP 业务强相关：

| 建议 type      | 简述                                  | 跨项目信号                                         |
| -------------- | ------------------------------------- | -------------------------------------------------- |
| `cascader`     | 逐级懒加载级联选择（省市区/分类）     | formily + vant + nocobase（3 处）                  |
| `slider`       | 数值/区间拖拽滑块                     | amis + vant                                        |
| `rating`       | 星级打分                              | amis/vant/ant/prime（4 库）                        |
| `breadcrumb`   | 层级面包屑导航                        | amis（后台刚需）                                   |
| `avatar`       | 用户头像 + 头像组 + 状态点            | amis + DataHub avatar-stack                        |
| `tag`          | 可着色/可删除标签芯片（≠ badge 计数） | amis                                               |
| `skeleton`     | 加载骨架屏                            | vant                                               |
| `signature`    | 手写签名板（Canvas）                  | amis + vant + signature_pad（ERP 审批/收货强需求） |
| `descriptions` | 只读分组键值描述列表                  | amis + Superset + Chat2DB（详情页刚需）            |
| `sparkline`    | 内联迷你走势图（表格/卡片）           | amis（chart 过重）                                 |
| `pdf-viewer`   | PDF 文档预览（页码/缩放/搜索）        | amis + 行业标准 pdf.js                             |
| `iframe`       | 沙箱嵌入外部 URL/页面（≠ html 片段）  | amis + nocobase                                    |
| `org-tree`     | 组织架构图（折叠/搜索/层级）          | d3-org-chart/orgchart（HR 强需求）                 |
| `mind-map`     | 放射/树状思维导图                     | jsmind/simple-mind-map                             |

完整候选见下文 §候选清单（按主题分组）。

## 调研方法

1. **对照基准建立**：先读 `docs/components/index.md` 取得 Flux 全量已注册 renderer 清单（结构/内容/数据/表单/复合/移动端/领域），作为"已覆盖"判定依据。
2. **分组并行扫描**：4 个独立子代理（fresh session，只读）按项目簇分头扫描源码 README/组件目录/package.json，对照清单输出"Flux 缺失候选 + 评级"。
3. **跨组去重合并**：多组共同命名的候选信号叠加（如 cascader/iframe/map/signature/cron-editor 等被 ≥2 组独立报出，升级为高信心）。
4. **评级维度**：通用性（跨业务复用）× 独立性（原子控件 > 整页模板）× 信号强度（多项目/多库复现）× 与 nop-app-erp 业务相关性。

### 已扫描项目（有前端、产出候选）

- **UI 组件库**：amis、ant-design、primereact、vant、tanstack-table、xyflow、formily
- **低代码/工作流**：nocobase、tiny-engine、flowlong-designer、Juggle、magic-api
- **业务/电商/数据**：erp、litemall、newbee-mall-vue3-app、yudao-mall-uniapp、c-shopping-rn、Chat2DB、bi（Grafana/Metabase/Superset/Redash/DataEase 等）
- **专业控件**：x-sheet、ui-predicate、complex-controls

### 跳过（纯后端 / 无有意义前端）

`flowlong`（纯 Java 工作流）、`olap/*`（clickhouse/doris/druid/starrocks，数据库内核）、`metadata/*`（atlas/dbt/marquez/amundsen）、`data-quality/*`（great-expectations/griffin/OpenRefine）、`ai-data/*`（langchain/llamaindex/pandas-ai）、`beam`（Apache Beam SDK）、`query`（TanStack Query JS 库）、`react-doctor`（dev 工具）、`data-integration/*`（meltano/seatunnel/airbyte/nifi，主体后端）、`data-platform-open-web`（实为 Java 后端模块）。

### 按用户指定排除

- 工业 HMI：`industrial-hmi-research`
- AI 工具 Web UI：`~/ai/*` 全部（ArbiterOS、langfuse、mlflow、helicone、Flowise、rivet 等）

## 候选清单（按主题分组）

> 评级：高 = 多库通用 + 原子 + Flux 明显空白；中 = 通用但可由现有控件近似或场景较窄；低 = 业务专用/装饰/可组合实现。
> 落点 = 建议归入的 Flux 包（参照 `package-splitting-strategy.md`）。

### A. 原子表单控件缺失（落点：`flux-renderers-form`）

| 建议 type      | 来源                    | 简述                                                 | 最接近的 Flux           | 价值 | 理由                             |
| -------------- | ----------------------- | ---------------------------------------------------- | ----------------------- | ---- | -------------------------------- |
| `cascader`     | formily/vant/nocobase   | 逐级懒加载级联单选（路径式，≠ tree-select 扁平路径） | tree-select（形态不同） | 高   | 3 处独立信号；级联是独立交互形态 |
| `slider`       | amis/vant               | 数值/区间拖拽滑块                                    | input-number            | 高   | 拖拽定值无法被 input-number 替代 |
| `rating`       | amis/vant/ant/prime     | 星级/打分选择                                        | 无                      | 高   | 4 库通用，质检/评价通用          |
| `signature`    | amis/vant/signature_pad | 手写签名板（Canvas）                                 | input-image             | 高   | ERP 审批/物流收货强需求          |
| `color-picker` | amis(`input-color`)/ant | 颜色选择器（调色板/取色）                            | 无                      | 中   | 主题/标签配色                    |
| `input-otp`    | amis/Carbon InputOTP    | 分格验证码输入（粘贴填充）                           | input-text              | 中   | 认证/B2C 场景                    |
| `stepper`      | vant                    | +/- 数量步进器                                       | input-number            | 中   | 移动端购物/数量，交互形态不同    |

### B. 导航与信息展示（落点：`flux-renderers-content` / `flux-renderers-layout`）

| 建议 type      | 来源                  | 简述                                  | 最接近的 Flux                  | 价值 | 理由                                      |
| -------------- | --------------------- | ------------------------------------- | ------------------------------ | ---- | ----------------------------------------- |
| `breadcrumb`   | amis                  | 层级面包屑导航                        | 无                             | 高   | 后台导航刚需，几乎每页                    |
| `avatar`       | amis/DataHub          | 用户头像（文字回退/状态点/头像组 +N） | image（无语义）                | 高   | 独立语义控件，协作/审批通用               |
| `tag`          | amis                  | 可着色/可删除标签芯片                 | badge（计数语义）              | 高   | 标签≠徽标，删除/着色/选择是独立能力       |
| `skeleton`     | vant                  | 加载骨架屏（avatar/image/text 变体）  | spinner（仅转圈）              | 高   | 现代加载 UX 标配                          |
| `descriptions` | amis/Superset/Chat2DB | 只读分组键值描述列表                  | detail-view（渲染实体，更重）  | 高   | 业务详情页高频，轻量 label-value 网格原语 |
| `sparkline`    | amis                  | 内联迷你折线（无坐标轴）              | chart（过重）                  | 高   | 表格/卡片内嵌趋势，chart 太重             |
| `anchor-nav`   | amis/ant Anchor       | 长内容锚点侧栏导航                    | tabs（语义不同）               | 中   | 长表单/详情页导航                         |
| `popover`      | amis                  | 锚点轻量浮动内容                      | dialog/drawer（过重）          | 中   | 轻量悬浮提示                              |
| `watermark`    | vant                  | 全屏/区域水印覆盖                     | 无                             | 中   | 安全/版权合规                             |
| `circle`       | vant                  | 环形进度                              | progress（疑似仅线性，待确认） | 中   | 独立可视化形态                            |

### C. 嵌入与文档（落点：`flux-renderers-content` 或独立）

| 建议 type    | 来源                      | 简述                                 | 最接近的 Flux                  | 价值 | 理由                                   |
| ------------ | ------------------------- | ------------------------------------ | ------------------------------ | ---- | -------------------------------------- |
| `pdf-viewer` | amis/pdf.js               | PDF 预览（页码/缩放/搜索/书签）      | word-editor-page（编辑，不同） | 高   | 文档驱动 ERP 必备，只读预览            |
| `iframe`     | amis/nocobase             | 沙箱嵌入外部 URL/页面（postMessage） | html（仅片段，不隔离）         | 高   | 外部系统集成，低代码高频               |
| `map`        | nocobase/leaflet/maplibre | 地图视图 + 坐标点字段（标注/定位）   | 无                             | 中高 | 物流/DRP/CRM，但依赖地图 SDK（重量级） |

### D. 数据展示与 BI 编排（落点：`flux-renderers-data`）

| 建议 type                       | 来源                             | 简述                                                | 最接近的 Flux                | 价值 | 理由                                     |
| ------------------------------- | -------------------------------- | --------------------------------------------------- | ---------------------------- | ---- | ---------------------------------------- |
| `stat-tile`                     | Grafana/Metabase/DataEase        | KPI 大数字 + 同比/环比 + sparkline                  | card+text（无原生）          | 高   | BI/运营看板通用                          |
| `panel-chrome`                  | Grafana/Metabase/Chat2DB         | 图表面板外壳（标题/菜单/刷新/展开/拖拽）            | card（无 chrome）            | 中高 | 仪表盘卡片通用                           |
| `data-grid`                     | Chat2DB（Canvas/VTable）         | 高性能网格（百万行+冻结+选区聚合+右键菜单）         | table（DOM）                 | 中高 | DB GUI/大数据表格；亦可作 table 增强     |
| `conditional-formatting-editor` | Superset                         | 条件格式规则编辑器（比较符+色阶）                   | 无                           | 中高 | 表格/BI 通用                             |
| `pivot-table`                   | pivot-table-uni                  | 透视表/多维分析                                     | table/chart                  | 中   | 财务/报表交叉分析                        |
| `tree-table`                    | Metabase                         | 树形+表格混合                                       | tree/table（无合并）         | 中   | 层级数据通用                             |
| `dashboard-filter`              | Redash/Metabase/Superset/Grafana | 参数化筛选器（date/range/text/query-dropdown+联动） | form（无统一 filter-widget） | 中   | 4 个 BI 都有，属组合模式（可作编排模式） |

### E. 时间与调度（落点：`flux-renderers-form` / `flux-renderers-layout`）

| 建议 type                    | 来源                             | 简述                                          | 最接近的 Flux            | 价值 | 理由                                    |
| ---------------------------- | -------------------------------- | --------------------------------------------- | ------------------------ | ---- | --------------------------------------- |
| `cron-editor`                | DataEase/react-js-cron           | 可视化 Cron 表达式构建                        | 无                       | 中高 | notify 子系统/定时任务/告警             |
| `relative-time-range-picker` | Grafana/Redash/Metabase/Superset | 时间范围含相对预设（近7天/近1小时）+ 绝对区间 | date-range（无相对预设） | 中高 | 仪表盘/监控通用；亦可作 date-range 增强 |

### F. 协作与采集（落点：`flux-renderers-content` / `flux-renderers-data`）

| 建议 type        | 来源             | 简述                                       | 最接近的 Flux        | 价值 | 理由                             |
| ---------------- | ---------------- | ------------------------------------------ | -------------------- | ---- | -------------------------------- |
| `comments`       | nocobase         | 评论流（列表+引用回复+提交，可挂任意实体） | 无                   | 中高 | 协作通用复合控件                 |
| `qrcode-scanner` | nocobase         | 摄像头扫码采集（与 qrcode 生成互补）       | qrcode（仅生成）     | 中   | 移动端数据采集                   |
| `file-dropzone`  | Grafana/DataHub  | 拖拽上传区                                 | input-file（无拖区） | 中   | 上传通用；亦可作 input-file 增强 |
| `excel-importer` | Chat2DB          | Excel 预览 + 表头行映射                    | input-file           | 中   | 数据导入通用                     |
| `log-viewer`     | amis/@patternfly | 实时日志流（ANSI/自动滚/过滤高亮）         | 无                   | 中   | 运维/调试场景                    |
| `filter-bar`     | Grafana/DataEase | 筛选芯片行/pill                            | 无                   | 中   | 列表/仪表盘通用                  |

### G. 复杂可视化（落点：独立包，参照 graph/gantt 先例）

| 建议 type            | 来源                   | 简述                                | 最接近的 Flux                         | 价值 | 理由                                   |
| -------------------- | ---------------------- | ----------------------------------- | ------------------------------------- | ---- | -------------------------------------- |
| `org-tree`           | d3-org-chart/orgchart  | 组织架构图（折叠/搜索/层级渲染）    | tree/graph（形态不同）                | 高   | ERP HR/审批/成本中心强需求             |
| `mind-map`           | jsmind/simple-mind-map | 放射/树状思维导图编辑               | graph（偏画布，非放射树）             | 高   | 知识/计划梳理，跨产品                  |
| `flowchart-designer` | bpmn-js/logicflow      | BPMN/流程图设计器（含泳道，编辑态） | graph（只读查看）/designer-\*         | 中高 | 审批/工艺路线设计；与运行时 graph 区分 |
| `image-editor`       | tui-image-editor       | 图片裁剪/标注/旋转                  | input-image                           | 中   | 质量检验图片标注、单据纠偏             |
| `whiteboard`         | excalidraw/tldraw      | 自由手绘白板                        | graph                                 | 中   | 协同绘图（ERP 信号弱）                 |
| `structure-builder`  | magic-editor           | 可视化构建带类型嵌套对象/数组契约   | json-view（只读）/code-editor（文本） | 中   | 接口/数据契约定义，形态独特            |

## 能力增强建议（强化已有控件，非新控件）

下列由 tanstack-table / Chat2DB / BI 组反复出现的信号，建议作为**已有控件的能力增强**而非新建 type：

| 控件          | 缺口能力                                                                                  | 信号来源                         |
| ------------- | ----------------------------------------------------------------------------------------- | -------------------------------- |
| `table`       | 行虚拟化、列拖拽排序、列可见性切换、列宽拖拽、列固定、右键菜单、选区聚合（sum/avg/count） | tanstack-table + Chat2DB         |
| `date-range`  | 相对时间预设（近7天/近1小时）                                                             | Grafana/Redash/Metabase/Superset |
| `progress`    | 环形/circle 变体（待确认是否已支持）                                                      | vant                             |
| `input-file`  | 拖拽区 dropzone                                                                           | Grafana/DataHub                  |
| `code-editor` | SQL/语言增强配方（执行/校验/补全）                                                        | Chat2DB/Superset                 |

## 已覆盖确认（无新增控件）

下列经源码对照确认 Flux **已覆盖**，相关项目仅作参考实现/重构借鉴，**不新增 type**：

| 项目/来源                                                                                         | 结论                                                           | 说明                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `x-sheet`                                                                                         | → `spreadsheet-page` 已覆盖                                    | x-sheet 是纯 JS 电子表格参考实现（MPL）；其公式/筛选/CSV 等多为"处理中"，成熟度低于 spreadsheet-page；内部 colorpicker/filterdata 子模块缺乏跨产品通用性，不建议单独提取 |
| `ui-predicate`                                                                                    | → `condition-builder` 已覆盖核心                               | 嵌套 AND/OR、目标-类型-算子三段配置 condition-builder 已有；ui-predicate 的 dataclass 化算子注册表（operator_id/type_id 解耦）仅作 condition-builder 插件化重构参考      |
| `formily` array-cards/array-collapse/array-items/array-tabs、editable、preview-text、select-table | → array-editor/array-field、detail-field、picker、table 已覆盖 | 均为已有 Flux 控件的布局变体，无新增原子控件价值                                                                                                                         |
| `xyflow` 60+ 示例（Subflow/NodeResizer/NodeToolbar/EdgeRouting/Figma）                            | → `graph` targetContract 覆盖                                  | 均为 graph 引擎原语，无独立新控件形态                                                                                                                                    |
| `complex-controls` 现有立项（gantt/kanban/calendar/barcode/diff-view/graph）                      | 无遗漏变体                                                     | 同一缺口的多参考项目已收齐                                                                                                                                               |
| `vant` 移动端组件（90+）                                                                          | 多数与 Flux mobile 已有对应                                    | 仅 index-bar/number-keyboard/floating-panel 等少量缺失（见 B/F 组）                                                                                                      |

## 优先级建议

**Tier 1（建议优先立项，14 个）**——多库通用 + 原子 + ERP 强相关：

```
cascader, slider, rating, breadcrumb, avatar, tag, skeleton,
signature, descriptions, sparkline, pdf-viewer, iframe, org-tree, mind-map
```

**Tier 2（中高价值，11 个）**——通用但场景较窄或可由现有控件近似：

```
map, stat-tile, panel-chrome, conditional-formatting-editor, pivot-table,
cron-editor, relative-time-range-picker, comments, flowchart-designer,
data-grid, watermark
```

**Tier 3（中等，~15 个）**——可入 form/content 全套或作能力增强：

```
color-picker, input-otp, stepper, anchor-nav, popover, circle,
structure-builder, qrcode-scanner, file-dropzone, excel-importer,
log-viewer, filter-bar, tree-table, dashboard-filter, image-editor
```

**能力增强（非新控件）**：table 虚拟化/列拖拽/列固定/右键菜单/选区聚合、date-range 相对预设、progress 环形、input-file 拖拽区。

### 建议下一步

1. **Tier 1 立项决策**：本报告是候选清单，具体哪些进入 roadmap 需结合 nop-app-erp 实际业务需求裁决（如 signature/org-tree 与 ERP 强相关，优先级可上调）。
2. **新控件立项流程**：按 `complex-component-design-process.md`，每个 Tier 1 候选立项时需产出 `docs/components/<type>/design.md` + `example.json`，经 INV 审计后进 roadmap。
3. **能力增强优先**：table 的虚拟化/列固定/右键菜单等是高频痛点，作为已有控件增强比新控件投入产出比更高，建议并行推进。
4. **复杂可视化（org-tree/mind-map/flowchart-designer）** 依赖重型三方库（d3/bpmn-js/jsmind），参照 graph/gantt 独立包先例，立项时需评估包级依赖隔离。

## 附：候选统计

- 候选总数：~40（去重合并后）
- Tier 1：14；Tier 2：11；Tier 3：~15
- 能力增强项：5 类
- 已覆盖确认（无新增）：6 类
- 高价值跨组复现（≥2 组独立报出）：cascader、iframe、map、signature、cron-editor、descriptions、avatar/avatar-stack、pdf-viewer
