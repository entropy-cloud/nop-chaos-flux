# 工业组态（HMI/SCADA）调研下载清单 research-download.md

> 日期：2026-08-03
> 版本：v1（I0.1 产出，随 I0 收口回写）
> 调研项目：leafer 系列 5 仓（leafer / leafer-ui / leafer-in / leafer-editor / LeaferJS 集成仓）+ meta2d.js + FUXA + SceneV + Konva.js + Fabric.js
> 参考仓库：`~/sources/industrial-hmi-research/`
> 上游依据：讨论文件 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §三/§五 Q5/§八；roadmap `docs/components/roadmap-industrial-hmi.md` I0
> 下游：`research-render-engines.md`（I0.2）、`research-scada-apps.md`（I0.3）、`research-summary.md`（I0.5）、I1.1 review gate

## 文档共识审查记录（本文件）

> 依据 roadmap Cross-Cutting「文档共识审查」条款，本文件定稿前须经独立子 agent 反复审查直到共识。记录如下：

- **Round 1（2026-08-03）**：独立 agent（fresh session，task `ses_0396a4cbeffeeSMu107Z3kfYSk`）审查，判定 `REVISE`——5 Major + 6 Minor 修正项（目录计数/子模块状态/FUXA Angular 版本/许可条款不实/>30% 判读口径/依赖项数/版本归属/校准基线/官方文档版本定性/审查记录占位/依赖示例），全部落地（见 §1-§5 修订后内容），未裁决项 0。
- **Round 2（2026-08-03）**：独立 agent（fresh session，task `ses_0393593e3ffes5Xh231I1FTzj7`）确认轮，判定 `REVISE`——R1 修正项复核：11/11 中 8 项已落地，3 项残留（§3 `Angular 19` 字样、§2.1 `dependencies 9 项` 字样、daily log 缺 I0.1 条目）＋新增 1 Minor（本记录块 R1 状态措辞过期）。本次修订全部落地（含 §3/§2.1 字样统一、本记录回填）；daily log 条目由本 plan 收口时统一写入。共识循环轮次：R1-R2 修正 2 轮（未超 3 轮上限）。
- **Round 3（2026-08-03）**：独立 agent（fresh session，task `ses_03915cd2effe8Lu8QYXalXhCxE`）确认轮，判定 `AGREE`——R2 残留项全部核验落地（§3 Angular 18（18.2.x）与实源 @angular/core 18.2.14 一致、§2.1 dependencies 10 项与实源一致、daily log 条目按收口约定写入并已落地），清单数字/哈希/体积/依赖与 live 文件系统逐一核对，**零新增修正项，达成共识**（共识循环：R1-R2 修正 2 轮 + R3 确认轮，未超轮次上限）。
- **终轮复核说明**：I1.1 review gate 为本文件「文档共识审查」的终轮复核（不叠加额外审查轮，roadmap Cross-Cutting）。

## 1. 下载总览与克隆状态

下载目录 `~/sources/industrial-hmi-research/` 于 2026-08-03 创建。全部 10 个仓库以 `git clone --depth 1`（浅历史、完整工作树）起步；除 SceneV 外均取得完整工作树（LeaferJS 的 6 个 submodule 未初始化，其中 `leafer-draw`/`leafer-game` 内容本地缺失，见 1.1 注）。

> **网络环境记录（clone-network-fail 处理）**：本机 github.com 默认 DNS（20.205.243.166）TCP 不可达，经 `--resolve`/`http.curloptResolve` 指向可达 IP（github.com 140.82.112.4 / codeload.github.com 140.82.112.10）完成 github 侧 clone；meta2d.js 首轮 github 直连 `invalid index-pack output`（传输损坏），换 **gitee 官方镜像** `gitee.com/le5le/meta2d.js` 重试成功（重试次数 2）；SceneV 交叉验证另克隆 gitee 镜像 `zy849082187/scene-v`（`scene-v/` 目录，commit `0e02bd4` "feat: init"，11 MB，同为 README+assets 占位仓）。SceneV 源码未公开（见 1.2），为唯一未能取得工作树的仓。

### 1.1 各仓清单

| 仓库               | 版本（tag/commit）                                                                        | 许可                                    | 工作树体积 | 依赖树（顶层）                                                                                                                                                                                                                                                                                                                                                                                | 源码入口目录                                                                |
| ------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| leafer             | v2.2.9 / `ae3881c`（2026-08-03）                                                          | MIT                                     | 1.8 MB     | 零外部依赖（root `dependencies` 27 项全为 leafer 系内部包：leafer-ui、`@leafer-ui/*`、`@leafer/web`、`@leafer-in/*` 等）                                                                                                                                                                                                                                                                      | `src/`（TS 场景图核心，monorepo `packages/`）                               |
| leafer-ui          | v2.2.9 / `1e624ff`（2026-08-03）                                                          | MIT                                     | 1.4 MB     | 零外部依赖（root `dependencies` 10 项全为 leafer 系内部包：`@leafer/core`/`@leafer/partner`/`@leafer/interface`/`@leafer-ui/draw`/`@leafer-ui/core`/`@leafer-ui/web`/`@leafer-ui/interaction-web`/`@leafer-ui/partner`/`@leafer-ui/interface`/`@leafer-in/interface`）                                                                                                                        | `src/`（聚合入口）+ 子仓                                                    |
| leafer-in          | v2.2.9 / `6b42e16`（2026-08-03）                                                          | MIT                                     | 1.3 MB     | 零外部依赖（leafer 系内部包）                                                                                                                                                                                                                                                                                                                                                                 | `src/`（官方插件：Editor/交互）                                             |
| leafer-editor      | v2.2.9 / `25e0fa1`（2026-08-03）                                                          | MIT                                     | 244 KB     | 零外部依赖（leafer 系内部包聚合）                                                                                                                                                                                                                                                                                                                                                             | `src/`（Editor 集成聚合）                                                   |
| LeaferJS（集成仓） | v2.2.9 / `d2614ae`（2026-08-03）                                                          | MIT                                     | 276 KB     | 零外部依赖；以 git submodule 引用 leafer/leafer-ui/leafer-in/leafer-draw/leafer-game/leafer-editor 子仓库（README 声明 `--recurse-submodules`）｜**注：本机 clone 未初始化 submodule**（`git submodule status` 6 项全 `-` 前缀，`src/` 下 6 子目录为空）；其中 draw/game 未单独 clone，本地缺失；leafer/ui/in/editor 内容以独立目录 `leafer/` `leafer-ui/` `leafer-in/` `leafer-editor/` 覆盖 | `src/`（运行官网示例/自定义打包）                                           |
| meta2d.js          | 聚合包 `v1.1.16`（root workspace 1.0.0，`@meta2d/core` v1.0.84）/ `f97477e`（2026-03-19） | MIT（LICENSE © le5le & Alsmile）        | 69 MB      | workspace 18 包：`@meta2d/core`、`@meta2d/class-diagram`、`@meta2d/sequence-diagram`、`@meta2d/activity-diagram`、`@meta2d/flow-diagram`、`@meta2d/chart-diagram`、`@meta2d/form-diagram`、`@meta2d/fta-diagram`、`@meta2d/le5le-charts`、`@meta2d/utils` 等；运行时依赖极少                                                                                                                  | `packages/meta2d.js/src/`                                                   |
| FUXA               | v1.3.4-2881 / `8b1ef89`（2026-07-30）                                                     | MIT（frangoteam，client/server 均 MIT） | 117 MB     | client（Angular 18.2.x）：rxjs、socket.io-client、@angular/material、angular-gridster2、chart.js/ng2-charts/uplot、leaflet、panzoom、pdfmake、qrcode、xgplayer 等；server（Node.js）：express、mqtt、node-red、@influxdata/influxdb-client、@questdb/nodejs-client、@tdengine/rest、async-mutex、jsonwebtoken 等                                                                              | `client/src/`（Angular 前端）+ `server/`（Node 后端）+ `node-red/`、`odbc/` |
| SceneV             | —（无源码 tag；2026-01-21 `27d3228` init 提交，仓库仅 README+assets）                     | 无 LICENSE 文件（README 未声明许可）    | 11 MB      | 无 package.json（无依赖树可列）                                                                                                                                                                                                                                                                                                                                                               | **源码未公开**（见 1.2）                                                    |
| konva              | v10.3.0 / `914acaf`（2026-07-27）                                                         | MIT                                     | 4.2 MB     | 零运行时依赖（devDeps：parcel/gulp/mocha/chai/typescript/size-limit 等构建测试链）                                                                                                                                                                                                                                                                                                            | `src/`（Core/Container/Layer/Shape/Factory/PointerEvents 等）               |
| fabric.js          | v7.4.0 / `f5d3cd9`（2026-07-31）                                                          | MIT                                     | 55 MB      | 依赖 `@fabricjs/*` 扩展包（aligning-guidelines/browser/cropping-controls/data-updaters/gradient-controls/westures-integration）；`@fabricjs/browser` 为浏览器环境适配核心                                                                                                                                                                                                                     | 根 `fabric.ts` + `packages/`（monorepo）                                    |

### 1.2 SceneV 源码不可获取（clone-failed，如实记录）

- **现象**：GitHub `siluozhang516/SceneV` 与 Gitee `zy849082187/scene-v`（同一作者）均为 README + assets（logo/预览图/gif）占位仓，仓库内无 `package.json`、无源码文件、无 LICENSE；仅 1 个 init 提交。
- **交叉验证**：掘金官方推广文（2026-03-04）声称"已在 GitHub 开源"，但文内 GitHub 链接残缺（`github.com/TheXiong/me…`），实际可达的 `siluozhang516/SceneV` 无源码。
- **裁定**：SceneV 属于「源码未公开发布」项目（商业化开源，源码可能仅随文档/商务渠道发放）。本 plan 按 Failure Paths `clone-failed` 处理：清单如实记录原因；I0.3 对 SceneV 的分析降级为**基于 README/官方文档/推广材料的浅层分析**（明确标注"非源码级"），不作为设计提取的主要依据；如需源码级分析，列入 I8/I9 或 I16 后继调研，不阻塞本 plan。
- **已知公开信息**（来自 README/推广文）：Vue3 + TypeScript + Vite + Element Plus；Canvas 渲染（部分场景 WebGL）；组态 + 大屏双场景；拖拽编辑器；对接 ThingsBoard；官网 `meta2dthingsboard.cn`。许可未知 → 商用前需人工确认（license-concern 记录）。

### 1.3 许可复核（license-concern 处理）

| 仓库             | 许可                          | 商用约束 | 裁定                                                                                                               |
| ---------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| leafer 系列 5 仓 | MIT                           | 无       | ✅ 与 MIT 假设一致                                                                                                 |
| meta2d.js        | MIT（© le5le & Alsmile）      | 无       | ✅ 与 MIT 假设一致（注意：其在线编辑器 2ds.le5le.com 另有条款，属编辑器产品，不影响引擎库本身）                    |
| FUXA             | MIT（© 2019-2025 frangoteam） | 无       | ✅ 与 MIT 假设一致（README 许可节为纯 MIT；README 中 €100 付费项为 FUXA Pro 白标/私有化功能说明，非 OSS 分发限制） |
| SceneV           | 未声明                        | 未知     | ⚠️ **license-concern 触发**：无 LICENSE 文件、无许可声明 → 不可直接复用其源码（也拿不到）；仅作设计参考            |
| konva            | MIT                           | 无       | ✅                                                                                                                 |
| fabric.js        | MIT                           | 无       | ✅                                                                                                                 |

> 选型影响全部留给 I1.2 裁定（本 plan 只记录，不裁决选型）。

## 2. 性能数字来源逐项标注与校准（I0.1 核心）

> 标注规则：`官方自报` = 项目方官方渠道（官方 README/官网/官方文档/官方 benchmark 站点）发布的数字；`第三方转述` = 非官方渠道（媒体/社区文章）复述的数字。

### 2.1 LeaferJS 官方自报数字（当前版 v2.2.9）

| 数字                    | 数值                             | 类型                      | 来源（链接/位置）                                                                                                                                        | 测试条件                                         |
| ----------------------- | -------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 百万可交互矩形首屏创建  | **1.28 秒**                      | 官方自报                  | leafer-ui README「性能表现」表（`~/sources/industrial-hmi-research/leafer-ui/README.md` L58-68；GitHub：https://github.com/leaferjs/leafer-ui#性能表现） | 100 万个可交互矩形 / 2K 屏笔记本 / Chrome V143.0 |
| 百万矩形内存占用        | **320 MB**                       | 官方自报                  | 同上 README L65                                                                                                                                          | 同上                                             |
| 百万矩形单元素拖拽帧率  | **60 FPS**（对比传统库 0-4 FPS） | 官方自报                  | 同上 README L66                                                                                                                                          | 同上                                             |
| 体积                    | **70KB min+gzip**                | 官方自报                  | 同上 README L20（"轻量 (70KB min+gzip)"）                                                                                                                | —                                                |
| 依赖                    | **零依赖**                       | 官方自报 + 本计划源码核对 | 同上 README L20；本计划核对 leafer-ui root `package.json`：`dependencies` 10 项全部为 `@leafer*` 内部包（2.2.9），无外部依赖 ✅ 成立                     | —                                                |
| 官方性能对比页 / 基准站 | —                                | —                         | https://www.leaferjs.com/#performance 、https://benchmark.leaferjs.com/leafer/                                                                           | —                                                |

### 2.2 第三方转述与跨版本出入（校准）

| 数字     | 官方 README（v2.2.9） | 第三方/官方文档站点                                      | 出处                                                                                                                                                                                                                                                            | 差异                                                                                    |
| -------- | --------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 内存占用 | 320 MB                | 350 MB                                                   | ① leaferjs.com 官方文档性能页（当前在线，内容未随 README 更新：`https://www.leaferjs.com/book/leafer-ui/start/performance.html`："创建100 万个可交互的矩形,仅占用350M 内存"）；② OSChina 转载 LeaferJS 1.0 发布稿（"1.5秒内创建百万可交互矩形，占用350MB内存"） | 以新口径 320MB 为基线：**9.4%**，<30%                                                   |
| 首屏创建 | 1.28 秒               | 1.5 秒（LeaferJS 1.0 发布稿转述；官方文档站点写 1.2 秒） | 同上 ②                                                                                                                                                                                                                                                          | 以 1.28s 为基线：1.5 偏差 **17.2%**；以 1.5s 为基线：1.28 偏差 **14.7%**——两口径均 <30% |

> 校准基线口径统一说明：跨来源冲突比较一律以**当前官方（v2.2.9 README）数字为基线**计算差异（内存 9.4%、首屏 17.2%）；两种基线下的结果均 <30%，结论不变。

**校准结论**：

1. 1.28s/320MB/60fps 为当前官方（v2.2.9 README，2026-08-03 clone 时点）自报数字；350MB/1.5s 出现在 leaferjs.com 官方文档站点（未随 README 更新，当前仍在线）与 1.0 发布稿转述中。差异（内存 9.4%、首屏 ≤17.2%）均为版本/渠道不一致，**均 <30% 人工确认阈值，不触发人工确认**。
2. 所有数字均为**官方自报**，无独立第三方 benchmark 复测——置信度判定：**中等**（来源唯一、自测环境 2K 屏 + Chrome V143 单一，非独立验证）。I1.2 spike 必须以本机复测（10 万/100 万图元）为最终依据。
3. **>30% 差异项判读口径**：按 mission 规则（讨论文件 §八"校准结果与验收阈值差距显著（>30%），触发人工确认"），>30% 触发仅适用于**不安全方向**——即官方数字**劣于**验收阈值（官方宣称达不到验收线）时。各数字对照：
   - 首屏：验收 <2s vs 官方 1.28s@100万 —— 官方比验收快 **36%**（方向**有利**：阈值比官方口径更宽松），不触发，记录为方向有利观察项；
   - 内存：验收 ≤320MB vs 官方 320MB@100万 —— **0% 差异**，不触发；但"验收阈值=官方自报上限"零余量，列为 I1.2 实测重点；
   - fps：验收 ≥45fps@10万 vs 官方 60fps@100万 —— 官方优于验收 25%（方向有利），不触发；
   - 1 万点刷新 <200ms：**官方无对应数字**，属自研目标，不可校准。
   - 结论：**无不安全方向 >30% 差异项，无人工确认触发**；方向有利差异（首屏 -36%）与零余量项（内存 0%）以观察项记录，交由 I1.1 review 与 I1.2 spike 复核。
4. 按 Cross-Cutting「性能红线」，I1.2 spike 前不将任何数字固化为设计依据。

### 2.3 其他项目性能相关公开数字（供对比，均非验收依据）

| 项目      | 数字                                                                | 类型                                            | 来源                           |
| --------- | ------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| SceneV    | "成千上万图元 60fps"                                                | 第三方转述（官方推广文自报，无 benchmark 链接） | 掘金 2026-03-04 推广文；README |
| Konva     | 无官方百万级 benchmark；社区普遍认为万级图元需手动优化（分层/裁剪） | 定性                                            | 社区共识（I0.2 报告中展开）    |
| Fabric.js | 无百万级 benchmark；官方文档声明"性能为设计权衡点"                  | 定性                                            | I0.2 报告中展开                |
| meta2d.js | 官方 README 未发布具体性能数字（面向 SCADA/IoT 场景，万级图元可用） | 定性                                            | meta2d.js README               |

## 3. 源码结构速览（供 I0.2/I0.3 深挖索引）

- **leafer 系列**：5 仓同版本（v2.2.9）同步发布；leafer 为核心引擎仓（`src/` 场景图/渲染/事件/hit），leafer-ui 为 UI 框架仓（`@leafer-ui/core`、`@leafer-ui/draw`、`@leafer-ui/web`、`@leafer-ui/interaction-web`、`@leafer-ui/partner`），leafer-in 为官方插件仓（Editor/交互），leafer-editor 为 Editor 聚合，LeaferJS 为官网集成仓（submodule 聚合）。
- **meta2d.js**：`packages/` 18 包 monorepo，核心 `@meta2d/core` + 各类图元图（class/sequence/activity/flow/chart/form/fta/particle/svg/transform/utils）+ `meta2d.js` 聚合包。
- **FUXA**：`client/` Angular 18（18.2.x）前端（gridster 布局、chart.js/uplot 图表、socket.io 实时） + `server/` Node.js（mqtt/influx/questdb/tdengine 数据源、node-red 逻辑编排）。
- **konva**：单仓单包，`src/` 全部源码（Node/Container/Shape/Layer/Factory/PointerEvents/DragAndDrop/Animation），零运行时依赖。
- **fabric.js**：v7 monorepo，根 `fabric.ts` + `packages/`（`@fabricjs/browser` 等），`lib/` 含历史构建产物。

## 4. 人工确认标记汇总

- **无不安全方向 >30% 性能数字差异**（跨来源最大差异 9.4%）。观察项（方向有利/零余量，交由 I1.1 review 与 I1.2 spike 复核）：
  1. 首屏验收 <2s 比官方 1.28s 宽松 36%（方向有利，不触发）。
  2. 内存验收阈值 ≤320MB 与官方自报数字完全重合（0% 余量），I1.2 spike 需确认 10 万图元实测内存余量。
  3. SceneV 许可未声明 + 源码不可获取（本 plan 已降级处理，不阻塞）。
- 本次下载无磁盘预算问题（未触发 clone-disk-space；FUXA 117MB/meta2d 69MB 在预算内，未启用额外 shallow 缩减）。

## 5. 下载清单与磁盘一致性核对（Exit Criteria 佐证）

`ls ~/sources/industrial-hmi-research/` 实际目录：`leafer/ leafer-ui/ leafer-in/ leafer-editor/ LeaferJS/ meta2d.js/ FUXA/ SceneV/ konva/ fabric.js/ scene-v/` —— 共 **11 个目录**：§1.1 清单 10 仓 + `scene-v/`（SceneV 交叉验证的 Gitee 镜像克隆，commit `0e02bd4`，README+assets 占位仓，与 §1.2 记录一致）；与 §1.1 清单一致。
