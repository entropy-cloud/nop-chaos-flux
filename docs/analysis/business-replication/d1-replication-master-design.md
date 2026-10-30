# D1 复刻总体设计（21 页 playground 落地方案与验收标准）

> Created: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D1；执行 plan `docs/plans/792-business-replication-d1-master-design-plan.md`
> 输入: M1 交付（R1-R3 盘点、R4 矩阵含 §4.1 强制设计输入）；live 机制调研（route-model/complex-pages/axe/focus/e2e 设施，行号见各节）
> 用途: D2-D4 分域设计与 M3 实现的统一前置契约。本文只定规范与模板，不写具体页面 schema。

## 0. 设计总纲（六项落地决策）

- **D1-决策①（页面形态）**：21 个复刻页统一走 **complex-pages surface**（`#/complex-pages/<pageId>`）。依据（live 实证）：`apps/playground/src/complex-pages/schema-page.tsx` L10-16 以 `import.meta.glob('./page-schemas/*.json', { eager: true })` 自动装载——**新增 JSON 即新增页面，无组件注册步骤**；`COMPLEX_PAGE_ENTRIES`（complex-pages-model.ts L67 起，现 43 条，closure audit Major-1 勘误）加一条 entry（id/title/category/description/features）即可获得列表页收录；特殊 host 覆盖先例 `pih-workspace`（complex-pages-registry.tsx L19-21——D5 深审勘误 MIN-5：原引 L25-27，实读为注释 L19-20 + entry L21）备用。**例外（D6 开放审计裁决 MAJ-B/MAJ-C，2026-10-30）**：**K1（AI 会话 host 注入）与 W1/M3/S1（mobile 形态）为 host override 页，其余 17 页纯 JSON**——registry 特例覆盖通用 SchemaPage（即上列 pih-workspace 先例机制转正）。K1：`conversationController`/`engine` 是 host 注入 resolved prop（非 schema 表达式可造），裁决见 D3 §2.1；W1/M3/S1：mobile host 提供 **375×667 固定宽度移动画布**（居中手机框形态）——桌面壳（240px 固定侧栏 + p-6/p-4 双层 padding，complex-pages-showcase.tsx L133/L171 + page-frame.tsx L13）在 375px viewport 下内容带仅 ≈55px，host override 规避该挤压并给 F1「移动端页 viewport 适配验证」一个被设计出来的对象（见 §3 helper 约定、§4 分支 B）。
- **D1-决策②（路由命名）**：pageId = `<domain>-<slug>`（全小写连字符），21 页清单见 §1；complex-pages 新增分类 `business-replication`（与既有 `app-replica` 并列，complex-pages-model.ts L12-18 的 category 字段）。
- **D1-决策③（mock 数据）**：每域一个 mock-backend 模块，独占 `/r/Repl<Domain>__*` fetcher 面（先例 `mock-backend-airtable.ts` 头注释 L1-23 的"一模块独占一 fetcher 面"模式，规避 showcase-env 700 行硬门禁）；返回信封 `{ status: 0, data: { items, total } }`（flux-guide/03-api-config.md L50 契约）；会话状态由工厂闭包持有（同会话跨页可观察写入）；预置 `window.__repl<Domain>TestHooks` 观测钩子（生产不设置即 no-op，先例 `__airtableEndpointCalls`）。
- **D1-决策④（e2e 组织）**：spec 平铺 `tests/e2e/replication-<pageId>.spec.ts`（沿用仓库现行平铺惯例），统一从 `./fixtures.js` 导入 test/expect（console/pageerror 监控 + `assertTrackedPageErrors`）；每 spec 一个 `openReplicationPage(page, pageId)` helper：`page.goto('#/complex-pages/<id>', { waitUntil: 'commit' })` → 等 `[data-testid="complex-page-title"]` 含标题 → 等页面主 testid 可见（先例 crud-demo.spec.ts L3-10）。
- **D1-决策⑤（axe 策略）**：per-page 三分支，详见 §4；axe 门禁沿用 PH-17 棘轮（spec ROUTES 手工数组 + JSON 计数键，新路由 = 两个文件各加一行）。
- **D1-决策⑥（focus 断言）**：PH-18 focus ledger 是 `packages/ui` 源码静态分类台账 + `check:focus-ledger` 门禁（build-focus-ledger.mjs），**非运行时断言设施**——逐页 focus 断言为手写 e2e，台账用途是在设计 D2-D4 时为页面选用已分类的 focus 管理原语（base-ui/programmatic 族）。断言写法复用两先例：`toBeFocused()`（component-handles.spec.ts L34-42）与 `document.activeElement` 比对（form-sync-validation-focus.spec.ts L30-41）。

## 1. 路由规划（21 页清单）

| #   | pageId                      | 页面（R4 §1 结论）                      | 优先级 | 临时形态标注                                                                                           |
| --- | --------------------------- | --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| 1   | wms-pda-receiving           | W1 PDA 收货/上架（直接组合）            | P0     | 单手流以 floating-bubble/action-sheet 近似                                                             |
| 2   | wms-wave-picking            | W2 拣货路径看板/波次（直接组合）        | P1     | 路径以 gantt 时间轴形态验收                                                                            |
| 3   | wms-stock-ledger            | W3 库存台账（直接组合）                 | P1     | 导出走服务端报表下载按钮                                                                               |
| 4   | crm-opportunity-kanban      | C1 商机漏斗看板（直接组合）             | P0     | 漏斗图以水平 bar 近似；moveStage 绑定 D2 验证                                                          |
| 5   | crm-customer-360            | C2 客户 360（直接组合）                 | P1     | calendar 上游降级项回归验证                                                                            |
| 6   | crm-sales-dashboard         | C3 销售驾驶舱（直接组合）               | P1     | 钻取走 echarts 事件                                                                                    |
| 7   | itam-asset-inventory        | I1 资产台账与盘点（直接组合）           | P1     | diff-view 文本对照为 flux 侧预期形态                                                                   |
| 8   | itam-depreciation-dashboard | I2 折旧仪表盘（直接组合）               | P2     | 年度透视口径对齐度量目录                                                                               |
| 9   | ai-knowledge-chat           | K1 知识库对话（直接组合）               | P0     | 护栏提示 alert/status 组合                                                                             |
| 10  | ai-ticket-console           | K2 工单处理台（能力扩展）               | P1     | SLA 倒计时以静态剩余时长文本过验收（G9 未落地前）                                                      |
| 11  | ai-approval-trail           | K3 审批轨迹（直接组合）                 | P1     | 转办 user-select+ajax 组合                                                                             |
| 12  | mes-shopfloor-board         | M1 车间大屏（直接组合）                 | P1     | 翻牌器以 stat-tile 近似                                                                                |
| 13  | mes-work-reporting          | M2 工序报工（直接组合）                 | P0     | 无（plan 785 能力验收页；785 未落地时以现状验收并在页内标注——D6 开放审计 MIN-7 口径声明，见下 L43 段） |
| 14  | mes-andon-material          | M3 异常叫料移动页（直接组合）           | P1     | 拍照以 input-image accept 唤起相机                                                                     |
| 15  | mall-sku-picker             | S1 商品 SKU 选择（能力扩展）            | P1     | 价格文本 card/tpl 拼、吸底栏布局近似                                                                   |
| 16  | mall-distribution           | S2 分销后台（直接组合）                 | P2     | 租户裁剪 page 权限层                                                                                   |
| 17  | doc-ocr-workbench           | O1 OCR 校正工作台（新 type 临时形态）   | P0     | image-compare 整图对照 + detail-view 逐字段确认；bbox overlay（G19）不实现                             |
| 18  | doc-hitl-inbox              | O2 HITL 审批收件箱（能力扩展）          | P1     | diffTree 以 table/tree 承载                                                                            |
| 19  | iot-telemetry-device        | V1 遥测详情（直接组合）                 | P1     | 实时以 interval 轮询模拟                                                                               |
| 20  | iot-ota-rollout             | V2 OTA 灰度管理（直接组合）             | P2     | 断点续传上游未实现，不做                                                                               |
| 21  | iot-geofence-videowall      | V3 围栏地图与视频墙（新 type 临时形态） | P0     | pin/cluster/geojson 回显+video mp4 样例；绘制/轨迹/流媒体不做交互验收（收窄裁决见 R4 §1 V3 行）        |

优先级口径：**P0 = M3 首批**（每域代表页 + 高风险页：W1/C1/M2/O1/V3/K1）；**P1 = 次批 12 页**；**P2 = 低风险直接组合 3 页（I2/S2/V2）**。P0 先行以最快暴露模板/设施问题。**P0 内部增设「设施先行切片」（D6 开放审计勘误 MIN-7，2026-10-30）**：P0 六页全是新机制页，若无独立切片，首个 P0 页要同时背「设施搭建 + 最高风险页」双职。设施切片含：`tests/e2e/helpers/replication.ts`（openReplicationPage/dnd/swipe/mobile context 常量）、8 个 mock 模块 + showcase-env `createReplicaBranches` 装配、axe spec ROUTES 两处失效 id 修正（§4 自认项）、`business-replication` 分类常量——**可与最简 P0 页 M2 合并为首个切片**。**P0 内建议序：M2→C1→K1→W1→O1→V3**（把 axe 分支 C 不确定性最高的 V3 垫后）。M2 外挂 plan 785 依赖（roadmap §3「785 联动」行：input-table 合计行/从表联动/金额大写）——**785 未落地时以现状验收并在页内标注**（roadmap 既有口径转写），该口径由 M3 kickoff 一行裁决登记，不留静默。

## 2. Mock fixture 规范

- **位置与模块化**：`apps/playground/src/complex-pages/shared/mock-backend-repl-<domain>.ts`（domain ∈ wms/crm/itam/ai/mes/mall/doc/iot，共 8 个模块）；数据集大时拆 `-records.ts`（先例 mock-backend-airtable-records.ts）。模块导出 `createRepl<Domain>MockBackend(): { fetcher 分支 }`，在 `showcase-env.ts` 的 `createShowcaseEnv()` 装配点接入 `/r/Repl<Domain>__` 前缀分发。
- **端点命名**：对齐上游 BizModel 语义但加 Repl 前缀，如 `/r/ReplWms__asnFindPage`、`/r/ReplCrm__moveStage`、`/r/ReplMes__reportWork`。查询返回 `{ status: 0, data: { items, total } }`；mutation 返回 `{ status: 0, data: {...} }`；错误路径返回 `{ status: 1, msg }`（每模块至少 1 条错误分支供断言）。
- **数据量**：列表类每实体 ≥25 行（保证分页 ≥3 页，对齐 mock-backend.ts 头注释惯例）；时序类（V1 遥测/M1 趋势）预生成 24h×固定间隔序列（确定性生成函数，不用随机种子的运行时漂移）。
- **e2e 观测钩子**：每模块暴露 `window.__repl<Domain>Calls`（端点调用计数）与 `__repl<Domain>TestHooks`（如强制返回错误、推进倒计时），spec 用 `page.addInitScript` 预置（先例 airtable-replica-interactions.spec.ts L40-53）。
- **静态注入**：仅默认筛选值/远程选项类静态数据走 `PAGE_DATA['<pageId>']`（page-data.ts 先例），业务数据一律走 mock-backend，不内联进 schema JSON。

## 3. 验收断言模板（三支柱）

每页 spec 骨架（`tests/e2e/replication-<pageId>.spec.ts`）：

```
支柱一（交互断言，必须程序化）：
- 打开 helper：goto('#/complex-pages/<id>') → complex-page-title 断言 → 页面主 testid 可见
- 核心交互流 ≥3 条（从 R1-R3 该页交互要素清单的加粗要素中选取）：
  表格/列表类：locator 行计数 + 首行字段值；表单类：fill/选择→提交→结果文本断言；
  拖拽类：kanban/gantt 经 replication.ts dnd helper 做真实指针拖拽——封装仓内两条已验证先例
  （kanban-demo.spec.ts L101-111 page.mouse steps 12 / linear-replica-interactions.spec.ts L449
  locator.dragTo，并继承 L452 注：kanban 拖拽源注册在 React Compiler dev 双挂载下可能滞后一拍，
  spec 需带该等待经验）——D6 开放审计勘误 MIN-4：原「dispatchEvent 或专用 dnd helper」手段引用偏航，
  synthetic dispatchEvent 对 pointer 驱动的 dnd 管线未必生效；断言 onCardMove 后端点调用计数与行迁移；
  mock 观测：__repl<Domain>Calls 计数断言"动作真的发生了"（不接受的"看起来像"由此挡住）
- 状态可视化断言：getComputedStyleValue / expectCssVarResolves（helpers/visual-assert.ts）用于配色分级/置信度高亮类要素
- 收尾：assertTrackedPageErrors(page)

支柱二（axe 基线）：按 §4 策略执行（a11y-axe-baseline.spec.ts 扩展，不在页面 spec 内重复跑 axe）

支柱三（focus 断言）：
- 页面加载后首个可交互元素可达（tab 首站或显式 autofocus 断言）
- 打开 dialog/drawer 后焦点落入面板（先例 [data-slot="dialog-surface"] + toBeFocused）、Esc/关闭后焦点返回触发元素
- 移动页（W1/M3/S1）：底部动作面板展开后焦点管理抽样 1 条
- 断言写法：toBeFocused() 或 page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
```

**第四道网（事实生效的 schema 诊断门禁，D6 开放审计勘误 MIN-5 补记录，2026-10-30）**：e2e webServer 以 `__FLUX_STRICT_VALIDATION__=true __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true PLAYWRIGHT=true` 启动（playwright.config.ts L94-96），dev 下 strictMode 恒 true（strict-mode.ts L50-58 readDevMode）；**error 级 schema 诊断经 console.error 路由**（schema-renderer.tsx L62-64 注释），被 fixtures 的 console.error 跟踪捕获即**该页 spec 失败**——D5 属性矩阵之外实际存在的第四道网，任何 validator 硬校验失败（如 echarts dataset 非对象）都会挂 spec，设计片段必须过诊断语义。**warn 级诊断目前零观测**：console.warn 不进 assertTrackedPageErrors，`check:console-baseline` 只扫源码 console.log/debug 不覆盖运行时 warn——21 页可能静默积累 warn 级诊断债且无棘轮；M3 可选增强（二选一记入 M3 验收计划）：spec 骨架采集 warn 计数并在 JSON/日志登记（对齐 PH-17 棘轮语义），或一次性 sweep 登记存量。

**testid 约定**：页面主容器 `data-testid="<pageId>-root"`；关键交互元素 `data-testid="<pageId>-<element>"`（如 `wms-pda-receiving-scan-input`）；schema 内通过组件的 testid meta 传递（`props.meta.testid`）。

**spec 命名与归属**：一页一 spec；跨页共享 helper 放 `tests/e2e/helpers/replication.ts`（D6 开放审计勘误 MIN-8/MAJ-C 补全清单，2026-10-30）：`openReplicationPage` / swipe helper / **dnd helper**（真实指针拖拽先例封装，见支柱一 MIN-4 勘误）/ **`assertDialogFocusRoundTrip`**（dialog/drawer 焦点入 `[data-slot="dialog-surface"]` + Esc 返回触发元素——该模式在 D2-D4 重复 ~15 次，不进 helper 则 21 spec 各写各的）/ **`expectEndpointCall`**（`__repl*Calls` 计数断言封装，每页都有）/ **mobile context 常量 `{ viewport: { width: 375, height: 667 }, hasTouch: true }`** 供 `test.use` 整体消费（hasTouch 必需性先例 mobile-components.spec.ts L13-17，见 §4 分支 B）。**repl-\* 页面级 CSS 落点指名**（D4 §2.1/§2.3 的 `repl-price`/`repl-sticky-footer`/`repl-low-confidence` 类与 `--repl-low-confidence-bg` 变量是 §5 断言对象）：新建 `apps/playground/src/complex-pages/shared/replication.css`，经 `apps/playground/src/styles.css` `@import` 接入（先例 L22 sundial / L27 airtable 各自 replica css @import）。

## 4. axe 基线策略（per-page 三分支，承接 R4 §4.1-①）

PH-17 机制实况（live 核实）：`a11y-axe-baseline.spec.ts` L15-23 ROUTES 手工数组（现存 7 条，其中 gantt-demo/crud-demo 两 id 已失效实际扫描首页——**M3 扩展时一并修正为真实 hash id**）；基线 JSON `_header.excludedRoutes: Record<id, reason>`（纯文档元数据）+ 每路由 `Record<axeRuleId, count>`；新违规红、减少提示收紧；map-demo 因 >120s heavy SVG 已排除（spec L25-27 注释 + JSON \_header）。

| 分支       | 适用页                                                   | 做法                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A 标准     | 全部非移动非 map 页（17 页，closure audit Major-2 勘误） | spec ROUTES 加 `complex-pages/<pageId>`（真实 hash 段）+ JSON 加 `"<pageId>": {}` 从 0 起棘轮；首跑若有存量违规，实测回填计数并在 JSON 该键旁以 `_notes` 字段登记来源                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| B mobile   | W1/M3/S1（mobile 族零覆盖补建，R4 §4.1-①）               | 同分支 A，另在 spec 内以 `test.use({ viewport: { width: 375, height: 667 }, hasTouch: true })` 的新 describe 块扫描。**扫描对象 = mobile host override 移动画布内的 DOM**（三页由 registry 特例 host 以 375×667 居中手机框承载，见 §0 决策①例外注）。**勘误（D6 开放审计 MAJ-C，2026-10-30）**：原「mobile 布局 DOM 与桌面不同」前提失实——同一 schema、同一桌面壳层、无容器查询下 DOM 不随 viewport 变；本分支的真实前提是三页先经 host override 呈现为移动画布，画布内 DOM 才与桌面壳不同。基线键同 pageId、describe 名标注 mobile。**F1「移动端页 viewport 适配验证」（roadmap M4-F1）的设计落点 = mobile 画布内断言**：画布宽 375×667、组件随画布触达/换行，验收对象即该画布（非桌面壳里的 mobile 组件拼盘） |
| C map 重页 | V3                                                       | 先按分支 A 纳入；**实测 axe 分析 >30s 或超时则切换为排除裁决**：spec ROUTES 移除 + 注释（map-demo 同款措辞）+ JSON `_header.excludedRoutes` 登记；**axe 排除≠功能验收排除**——V3 的交互/focus 断言照常执行，排除决定记录进 M3 验收计划（开放审计 Minor-④ 的显式裁决要求）                                                                                                                                                                                                                                                                                                                                                                                                                                        |

分支 B helper 配套：`tests/e2e/helpers/replication.ts` 的 mobile 常量为**整体 context 选项** `{ viewport: { width: 375, height: 667 }, hasTouch: true }` 供 `test.use` 消费（hasTouch 为 mobile e2e 必需——swipe-cell/pull-refresh 全 TouchEvent 驱动，无 hasTouch 的 context 下交互断言无法触发；先例 `mobile-components.spec.ts` L13-17 "hasTouch is required" + `mobile-gesture-lab.spec.ts` L42-44 桌面 viewport+hasTouch 裁决）。

红线：禁止为让 axe 通过而删除页面功能；存量违规不修复时必须在 JSON 登记（对齐 PH-17"棘轮+登记"语义），修复归组件 owner 面。

## 5. D2-D4 分域设计模板

每份分域设计文档（D2 ERP 线/D3 AI+MES/D4 商城+智能单据+IoT）必须含以下章节，缺一不收口：

1. **页面清单与上游引用**：本域各页引用 R1-R3 对应节（不重抄交互要素，引用节名+行号）。
2. **Schema 结构设计**：组件树草图（type 级）、关键 schema 片段（数据绑定/事件/action 编排）、复用 `stack-*`/marker 类约定（styling contract）。
3. **R4 对照与双向核对记录**：本域各页 R4 §1 结论 → 本设计采用的 renderer 组合逐条对照；**R4 §2↔§4 双向核对表**（本域涉及的 G 缺口：分级列与登记去向列一致，引用缺口编号）；散落验证项归集表（ERP 域必须含：C1 kanban moveStage 绑定验证、C1 footer 统计带绑定验证、G2 拖拽绑定语义）。
4. **Mock backend 设计**：本域模块的端点清单（含 1 条错误分支）、数据集形状、测试钩子。
5. **验收断言清单**：逐页按 §3 模板列出三支柱断言点（≥3 交互流、axe 分支、focus 3 条）。
6. **临时形态标注**：本域 O1/V3 类临时形态页的实现边界（做什么/不做什么/裁决引用）。

## 6. 关键引用清单

- 路由机制：`apps/playground/src/route-model.ts`（L60-116）、`domain-route-entries.ts`、`domain-route-pages.tsx`（L207-303 + 对账测试 domain-route-pages.test.tsx L22-42）、`complex-pages/{complex-pages-model.ts（L67 起 43 entry）, schema-page.tsx L10-16, complex-pages-registry.tsx L19-21（D5 深审勘误 MIN-5：原引 L25-27）, page-data.ts}`、`home-families.ts`（complex-pages 不需要 home family 映射）
- axe 棘轮：`tests/e2e/a11y-axe-baseline.spec.ts`（L15-27/L34-63）、`tests/e2e/__fixtures__/axe-baseline.json`（\_header 结构）、`docs/plans/781-ph17-axe-gate-plan.md`（L77 map-demo 排除修订）
- focus：`docs/plans/782-ph18-focus-ledger-plan.md`（Status Note L134-136）、`scripts/audit/build-focus-ledger.mjs`、`docs/testing/focus-management-ledger.md`、断言先例 `tests/e2e/component-handles.spec.ts` L34-42、`tests/e2e/form-sync-validation-focus.spec.ts` L30-41
- e2e 设施：`playwright.config.ts`（L43-101 双 webServer、workers 2、fixtures.js）、`tests/e2e/helpers/visual-assert.ts`（getComputedStyleValue）、mock 先例 `apps/playground/src/complex-pages/shared/{mock-backend.ts, showcase-env.ts L102-153, mock-backend-airtable*.ts}`、交互先例 `tests/e2e/{crud-demo, airtable-replica-interactions, spreadsheet-visual-tokens}.spec.ts`
- 数据契约：`flux-guide/03-api-config.md` L50（{items,total}）
