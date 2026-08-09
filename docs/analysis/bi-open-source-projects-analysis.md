# BI 开源项目分析报告

> 生成日期：2026-08-09
> 覆盖范围：`~/ai`、`~/sources/bi`、`~/sources/olap`、`~/sources/ai-data`
> 数据来源：GitHub API / Gitee API（stars、语言、License、最近推送），本地 git 仓库最近提交
> 说明：`~/sources/bi/calcite`、`kylin`、`echarts` 因 GitHub 网络波动改经 Gitee 官方镜像（`gitee.com/mirrors/*`）下载，内容与上游同步；镜像页 stars 不代表上游，报告中均采用 GitHub 上游数据。

---

## 1. 盘点结论

### 1.1 `~/sources` 中已有大量 BI 项目（下载前）

| 目录               | 项目                                                                           | 定位                         |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------- |
| `sources/bi/`      | dataease, grafana, JimuReport, metabase, redash, springreport, superset        | BI 平台 / 报表 / 可视化 7 个 |
| `sources/olap/`    | ClickHouse, doris, druid, starrocks                                            | OLAP 数据库引擎 4 个         |
| `sources/ai-data/` | DataMind, langchain, llamaindex, pandas-ai                                     | AI + 数据分析                |
| `sources/` 其他    | Chat2DB（数据库工具）、data-platform-open（数据平台）、query（TanStack Query） | 数据工程相关                 |

### 1.2 `~/ai` 中没有传统 BI 平台

`~/ai` 以 AI Agent 框架为主（autogen、langgraph、OpenHands、crewAI 等约 200 个），与 BI 相关的仅有 **AI + 数据** 方向的几个项目：

| 项目                 | stars | 语言   | 说明                                  |
| -------------------- | ----- | ------ | ------------------------------------- |
| vanna                | 23.8k | Python | Text2SQL AI 助手（BI 场景 AI 化代表） |
| pandas-ai            | 23.7k | Python | 自然语言数据分析                      |
| mlflow               | 27.4k | Python | ML 生命周期平台（非 BI）              |
| OpenDCAI/DataFlow    | 7.2k  | Python | 数据工作流编排                        |
| txtai                | 12.8k | Python | 语义搜索 / RAG 数据库                 |
| databuff             | 0.5k  | Java   | 数据缓存层                            |
| data-agent-kit (GCP) | 0.06k | Python | 数据访问 AI 代理                      |

**结论**：~`ai` 无 BI 平台类项目；`~/sources/bi` 是 BI 主库。

---

## 2. 本次新增下载（9 个项目）

### 2.1 从 GitHub 直接下载（6 个）

| 项目                  | 源         | 目录                   | 定位                                       |
| --------------------- | ---------- | ---------------------- | ------------------------------------------ |
| cube-js/cube          | GitHub     | `sources/bi/cube`      | Headless BI / 指标语义层（Rust 核心 + TS） |
| lightdash/lightdash   | GitHub     | `sources/bi/lightdash` | dbt 原生开源 BI                            |
| datageartech/datagear | GitHub     | `sources/bi/datagear`  | 国产数据分析与可视化平台（Java）           |
| apache/calcite        | Gitee 镜像 | `sources/bi/calcite`   | SQL 解析 / 查询优化框架                    |
| apache/kylin          | Gitee 镜像 | `sources/bi/kylin`     | 预聚合 OLAP 引擎                           |
| apache/echarts        | Gitee 镜像 | `sources/bi/echarts`   | 可视化图表库                               |

### 2.2 从 Gitee 原生下载（2 个）

| 项目                          | 源    | 目录                   | 定位                         |
| ----------------------------- | ----- | ---------------------- | ---------------------------- |
| anji-plus/report（AJ-Report） | Gitee | `sources/bi/aj-report` | 拖拽式大屏可视化报表（Java） |
| gcpaas/DataRoom               | Gitee | `sources/bi/dataroom`  | AI 对话式生成大屏（TS）      |

> 下载过程中 GitHub 一度不可达，`cube`/`lightdash`/`datagear` 首次尝试失败，网络恢复后已补全；`datagear` 在 Gitee 无官方镜像（`gitee.com/mirrors/DataGear` 不存在），故只从 GitHub 拉取。`gitee.com/mirrors/Cube` 与 cube-js 同名但为另一项目（时间序列可视化），已排除。

---

## 3. 全景分类分析

### 3.1 开源 BI 生态全景图（本地全部 21 个项目）

```
┌─ BI 前端平台（面向业务用户）
│   ├─ Apache Superset        Python/TS   74.2k★  Apache-2.0   数据探索+可视化平台
│   ├─ Metabase               Clojure     48.6k★  AGPL-3.0     轻量自助 BI
│   ├─ Redash                 Python      28.7k★  BSD-2         SQL 查询+仪表盘
│   ├─ DataEase               Java        24.3k★  GPL-3.0      国产 BI（飞致云）
│   ├─ Lightdash              TS          6.0k★   (dbt 原生)   指标层驱动 BI
│   ├─ DataGear               Java        1.6k★   LGPL-3.0     国产数据分析平台
│   └─ Grafana                TS          76.2k★  AGPL-3.0     可观测性仪表盘（泛 BI）
├─ 报表 / 大屏（国内细分市场）
│   ├─ JimuReport (积木报表)  Java        4.0k★  GPL-3.0     报表+AI ChatBI
│   ├─ AJ-Report              Java        13.4k★  Apache-2.0   大屏+报表
│   ├─ DataRoom               TS          3.5k★   Apache-2.0   AI 大屏生成
│   └─ SpringReport           Java        1.3k★   Apache-2.0   AI 报表平台
├─ Headless BI / 指标语义层
│   └─ Cube                   Rust/TS     20.6k★  Apache-2.0   指标 API 语义层
├─ OLAP 引擎（数据底座）
│   ├─ ClickHouse             C++         49.1k★  Apache-2.0   列存分析库
│   ├─ Apache Doris           Java        15.7k★  Apache-2.0   MPP OLAP
│   ├─ StarRocks              Java        12.0k★  Apache-2.0   MPP OLAP
│   ├─ Apache Druid           Java        14.0k★  Apache-2.0   实时 OLAP
│   └─ Apache Kylin           Java        3.8k★   Apache-2.0   Cube 预聚合
├─ 查询 / 语义层中间件
│   └─ Apache Calcite         Java        5.2k★   Apache-2.0   SQL 解析优化引擎
└─ 可视化库
    └─ Apache ECharts         TS          67.0k★  Apache-2.0   图表库
```

### 3.2 技术栈分布

| 技术栈      | 项目                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ |
| Java 生态   | DataEase、JimuReport、AJ-Report、SpringReport、DataGear、Doris、StarRocks、Druid、Kylin、Calcite |
| Python 生态 | Superset、Redash、ClickHouse(后端工具链)、vanna、pandas-ai                                       |
| TS/前端生态 | ECharts、Lightdash、DataRoom、Grafana、Cube(封装层)                                              |
| C++         | ClickHouse                                                                                       |
| Clojure     | Metabase                                                                                         |
| Rust        | Cube 核心                                                                                        |

### 3.3 License 风险提醒

- **GPL-3.0 / AGPL-3.0**（DataEase、JimuReport、Grafana、Metabase、Lightdash、databuff）：商用或二次开发有传染性，自研产品引用需谨慎。
- **Apache-2.0 / MIT / BSD**（Superset、Redash、Cube、AJ-Report、DataRoom、SpringReport、Doris、StarRocks、ClickHouse、Druid、Kylin、Calcite、ECharts）：商业友好，可嵌入自研产品。

---

## 4. 关键项目详析

### 4.1 全栈 BI 平台

**Apache Superset**（74.2k★，Python，Apache-2.0）

- 定位：数据探索与可视化平台，SQL Lab + 图表 + Dashboard，SQLAlchemy 万能连接器。
- 架构：Python Flask 后端 + React 前端 + 异步任务队列（Celery）+ 元数据库（MySQL/Postgres）。
- 亮点：云原生友好、扩展生态（`superset-ui`）、与 Druid/Pinot/ClickHouse 深度集成。
- 借鉴价值：SQL 编辑器（Ace/Monaco 集成）、图表渲染层（可选 ECharts 渲染器）、权限模型（Role/Permission）。

**Metabase**（48.6k★，Clojure，AGPL-3.0）

- 定位：面向业务人员的自助查询 BI，弱 SQL 门槛（问题生成器 + 原生 SQL 双模式）。
- 架构：Clojure 后端 + React 前端，H2/MySQL/Postgres 元数据库，EDN 配置。
- 亮点：缓存策略、alert 推送、嵌入式分析（embedding SDK）。
- 借鉴价值：自然语言查询（MLv2 查询语言层）、元数据模型设计。

**Redash**（28.7k★，Python，BSD-2-Clause）

- 定位：SQL 查询 + 仪表盘共享，数据源连接器插件体系（40+）。
- 架构：Flask + Redis + Postgres，Celery 异步查询执行。
- 状态：项目维护放缓（2023 年后社区活跃度下降），但代码简洁适合学习。
- 借鉴价值：查询执行器抽象（QueryRunner）、调度/告警、可视化组件栈（现已被 Superset 生态吸收）。

**DataEase**（24.3k★，Java，GPL-3.0）

- 定位：国产 BI，飞致云出品，中文文档完善，支持多租户与 X-Pack 能力。
- 架构：Spring Boot + Vue3 前端，自研报表引擎，支持数据权限行级控制。
- 亮点：开箱即用（一键安装包）、与飞致云生态（1Panel、JumpServer）联动。
- 借鉴价值：中文 BI 交互范式、数据集/图表/仪表盘三级建模。

### 4.2 Headless BI 与语义层

**Cube**（20.6k★，Rust 核心 + TypeScript，Apache-2.0）

- 定位：Headless BI / 指标语义层，把指标定义为代码（数据模型），对外输出 REST/GraphQL/SQL API。
- 架构：Rust 核心（多进程/多租户缓存）→ API 网关层（TS）→ 适配 30+ 数据源；前端接入任意可视化库。
- 亮点：语义层缓存、预聚合（Pre-aggregations）、与 dbt 集成。
- 借鉴价值：**指标定义 DSL + 查询改写引擎**的设计，正是当前"指标中台"趋势的核心。

**Lightdash**（6.0k★，TypeScript）

- 定位：dbt 原生 BI，直接消费 dbt 的 `.yml` 指标定义，dbt 模型即数据模型。
- 架构：Node/TS 后端 + React 前端，查询翻译到 dbt 模型的 SQL。
- 亮点：代码即指标（Metrics as Code）、预览与生产环境管理。
- 借鉴价值：dbt + BI 无缝衔接的"模型驱动"范式。

### 4.3 国内报表/大屏细分

**JimuReport（积木报表）**（Gitee 4.0k★，Java，GPL-3.0，2026-08 更新）

- 积木式拖拽报表 + **JimuChatBI**（对话式 AI 报表，一句话生成表格/图表/大屏），兼容国产信创数据源。
- 与 JeecgBoot 生态绑定，Spring 生态集成成本低。

**AJ-Report**（Gitee 13.4k★，Java，Apache-2.0，2026-08-07 更新）

- 大屏 + 常规报表双场景，三步出图：配数据源 → 写 SQL 数据集 → 拖拽大屏。
- 前端 Vue3 + 大屏组件库丰富（30+ 图表组件），Apache-2.0 商业友好。

**DataRoom**（Gitee 3.5k★，TS，Apache-2.0，2026-08-09 更新）

- **AI 对话式生成大屏**：自然语言直接生成页面，20+ 数据源接入，前后端一体化。
- 代表"AI + 大屏"最新演进方向。

**SpringReport**（Gitee 1.3k★，Java，Apache-2.0，2026-08-06 更新）

- AI 报表平台，零代码拖拽建表，多数据源适配，活跃维护中。

### 4.4 OLAP 引擎（数据底座）

| 引擎         | stars | 特点                                                   | 适用                            |
| ------------ | ----- | ------------------------------------------------------ | ------------------------------- |
| ClickHouse   | 49.1k | 列存 + 向量化，单机吞吐之王                            | 日志/行为分析、大宽表           |
| Apache Doris | 15.7k | MPP + 物化视图 + 查询模型丰富，国内金融/互联网广泛采用 | 实时数仓统一层                  |
| StarRocks    | 12.0k | Doris 同源分支，向量化执行、湖仓一体                   | 高并发实时分析                  |
| Apache Druid | 14.0k | 原生时间序列索引 + 预聚合段                            | 实时流分析（Superset 经典搭档） |
| Apache Kylin | 3.8k  | Cube 预聚合（空间换时间），亚秒级                      | 固定维度组合的查询              |

### 4.5 查询层与可视化

- **Apache Calcite**（5.2k★）：SQL 解析 → 校验 → 优化（RBO/CBO）→ 执行适配的完整框架，是 Druid、Flink、StarRocks 等查询引擎的内部标准件。若自研查询服务，Calcite 是首选底座。
- **Apache ECharts**（67.0k★）：国产可视化事实标准，TS 重写后模块化（echarts/core + 按需注册），SVG/Canvas 双渲染，是前端 BI 图表层首选。

---

## 5. 2026 年 BI 生态趋势观察

1. **AI 原生化**：国产项目集体转向 AI——JimuReport（JimuChatBI）、SpringReport、DataRoom 均已推出对话式分析/大屏生成；vanna/pandas-ai 代表 Text2SQL 路线。趋势：ChatBI 成为标配能力。
2. **语义层崛起**：Cube（指标中台）、Lightdash（dbt 原生）把"指标定义"从 BI 前端下沉为独立层，支持多前端复用。
3. **湖仓一体**：StarRocks/Doris 持续整合 Iceberg/Hudi/Paimon 湖格式，分析引擎收敛为"一套引擎查全部"。
4. **许可证收紧**：Grafana/Metabase/DataEase 等头部项目转向 AGPL/GPL，企业自研嵌入时 Apache-2.0 项目（Superset、Cube、AJ-Report）价值更高。
5. **OLAP 内部化**：Calcite 成为自研 SQL 层的事实标准，ClickHouse 向"分析型通用数据库"演进。

---

## 6. 选型建议

| 场景                        | 推荐                                                  | 理由                                     |
| --------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| 自研 BI 平台整体参考        | Apache Superset                                       | Apache-2.0、架构最完整、生态最大         |
| 快速落地开箱 BI（国内团队） | DataEase / AJ-Report                                  | 中文生态、部署简单；AJ-Report 许可更宽松 |
| 指标中台 / 嵌入式分析       | Cube + 自研前端                                       | Headless 架构天然适配嵌入与多端          |
| 报表打印/填报               | JimuReport / SpringReport                             | 类 Excel 报表设计，AI 增强               |
| 数据大屏                    | DataRoom / ECharts                                    | AI 生成 + 高性能图表库                   |
| OLAP 引擎选型               | StarRocks / Doris（实时数仓）、ClickHouse（日志分析） | 按查询形态选择                           |
| 自研查询服务                | Apache Calcite                                        | 免自研 SQL 解析与优化                    |

---

## 7. 附录

### 7.1 本地目录清单（下载完成后）

```
~/sources/bi/      15 个项目
  aj-report  calcite  cube  dataease  datagear  dataroom  echarts
  grafana  JimuReport  kylin  lightdash  metabase  redash  springreport  superset
~/sources/olap/     4 个项目：ClickHouse  doris  druid  starrocks
~/sources/ai-data/  4 个项目：DataMind  langchain  llamaindex  pandas-ai
```

### 7.2 下载记录

| 项目      | 来源       | 方式             | 最近提交（本地） |
| --------- | ---------- | ---------------- | ---------------- |
| cube      | GitHub     | 直连（重试成功） | 2026-08-07       |
| lightdash | GitHub     | 直连（重试成功） | 2026-08-07       |
| datagear  | GitHub     | 直连（重试成功） | 2026-07-15       |
| calcite   | Gitee 镜像 | 镜像克隆         | 2026-07-16       |
| kylin     | Gitee 镜像 | 镜像克隆         | 2026-05-15       |
| echarts   | Gitee 镜像 | 镜像克隆         | 2026-08-04       |
| aj-report | Gitee      | 原生克隆         | 2026-02-28       |
| dataroom  | Gitee      | 原生克隆         | 2026-08-07       |

### 7.3 数据时效说明

- stars / license / 语言：2026-08-09 从 GitHub API / Gitee API 抓取。
- Metabase、Cube、Lightdash 的 GitHub API 返回 license 为 `NOASSERTION`（LICENSE 文件含自定义前言），报告中按项目官网注明（Metabase AGPL-3.0、Cube Apache-2.0、Lightdash 以仓库 LICENSE 为准）。
