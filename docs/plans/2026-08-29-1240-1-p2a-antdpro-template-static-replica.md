# P2a Ant Design Pro 页面模板族 — 分析与静态复刻

> Plan Status: completed
> Mission: ui-review
> Work Item: P2a. Ant Design Pro 页面模板族 — 分析与静态复刻
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P2a 条目 + Phase Details P2 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`；能力缺口对照 `docs/analysis/ui-review/C2-capability-gaps.md` G-A 行
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/457-sundial-replica-interactions-plan.md`、`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（复刻先例）

## Purpose

消费 P1 已产出的复刻工程规范与 Ant Design Pro 分析篇，把 roadmap P2 点名的页面模板族（dashboard / list / form 四布局 / detail 基础+高级 / result）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，补齐 Flux"页面级模板"空白的第一个实证面（C2 G-A 行的复刻证据），并为 P2b（交互接线与测试）提供全部静态落点。

## Current Baseline

live 复核 2026-08-29，HEAD `b55761742`，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1 均 `done`；P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（命名分配表/目录规范/mock 与 e2e 模板/验收维度/两段式边界）与 `ant-design-pro.md`（令牌结构 §2、页面清单 §3、交互清单 §4、能力映射 §5、可复刻边界 §6）已落盘。
- playground 复刻先例全部在库：`apps/playground/src/complex-pages/page-schemas/` 19 张 schema；`shared/mock-backend-sundial.ts`（按 slug 拆分 mock 的先例）；`shared/showcase-env.ts` 666 行、`Sundial__` 端点分支在 481–620 行；`sundial-replica/sundial-replica.css` 707 行（令牌块先例 19–46 行）；`tests/e2e/sundial-replica-visual.spec.ts` 287 行（`openPage` 骨架）；`complex-pages/__tests__/sundial-mock-backend.test.ts`；`COMPLEX_PAGE_ENTRIES` 在 `complex-pages-model.ts:59`。
- `shared/mock-backend.ts` 当前 463 行，低于 500 行治理线（P1 README §2.1 硬规则 1：P2a 的新数据集必须落 `mock-backend-antdpro.ts`，不得回涨该文件）。
- **`antdpro` 相关产物零存在**（`grep -r "antdpro|adp-" apps/playground/src tests/e2e` 零命中），本计划为该 slug 的建立者。
- 本计划引用的 renderer 原语分两档实证：①既有 schema 实证（page、crud、form、wizard（form-wizard.json）、tabs、card、chart、container、flex、table、text、icon、button、select、input-text/number/date/table、textarea、radio-group、switch、fieldset、alert、picker、operation、link、data-source、dialog（3 张 sundial schema）、collapse、responsive）；②registry 实证但暂无 schema 用例——`steps`（`flux-renderers-layout/src/process-display-definitions.ts:6`，有 steps-renderer 测试），Phase 4 步骤条使用该档并按先例形态落 schema。drawer 面 renderer 在 `flux-renderers-basic/src/surface-renderer-definitions.ts`。
- 复刻 CSS 的加载路径先例：`apps/playground/src/styles.css:19` 以 `@import './sundial-replica/sundial-replica.css'` 引入复刻样式——P2a 需在 `styles.css` 追加一行同名 `@import`（该文件仅此一行改动，纳入 In Scope）。
- C2 G-A（页面模板层）裁决为 L2、状态"待 P2 回写"；其 L2 语义化产品化归 D1 流程，**本计划只做 L1 组合复刻**（schema + CSS + mock），不改任何 renderer/ui/runtime 包。
- 分析篇 §6.2 差异声明要求："复刻页建议主色或圆角至少换一项建立差异（P2a 决定，记入该 plan 差异声明）"——该裁定尚未做出，落入本计划 Phase 1 Decision 项。

## Goals

- 9 张 `antdpro-*` 页面 schema 落盘并注册（category `app-replica`）：`antdpro-list`（查询区+表格区标杆）、`antdpro-form-basic/grouped/dialog/step`（四布局）、`antdpro-detail-basic/advanced`、`antdpro-dashboard`、`antdpro-result`。
- `antdpro-replica.css` 落盘：令牌声明在 `.adp-root, .adp-dialog` 两个作用域，变量 `--adp-*`、类 `.adp-*`；令牌偏离裁定（主色或圆角至少一项）记入本计划差异声明节。
- `shared/mock-backend-antdpro.ts` + `showcase-env.ts` fetcher 追加 `AntdPro__` 读端点分支（≥3 个：列表分页/详情/仪表盘聚合）；列表数据集在 pageSize 10 时 ≥3 页。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/antdpro-replica-visual.spec.ts`）全绿；`antdpro-mock-backend.test.ts` 单测全绿。
- 完成复刻验收自查（P1 README §4.2 AI 模板感治理两维 + §4.3 样式契约三项）。

## Non-Goals

- 不做交互状态机接线与写端点（批量栏、展开/收起、密度切换、列设置、ModalForm 提交流转、分步校验前进、删除确认等属 P2b；Pi-a 只做"可见可点"的静态形态）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；G-A 的 L2 语义化（PageHeader/查询区/result 预设产品化）归 D1。
- 不复刻分析篇 §3 中 roadmap P2 名单外的页面（search-list 三态 / profile×2 / account×2 / basic-list / card-list / login / register / exception×3 / monitor / workplace）。
- 不复制任何 Ant Design 品牌资产（logo/SVG/官方插画/原文案/示例数据）；文案全部自拟中文，图标 lucide 近似。
- 不重新评审 R1 对标分数、不做 P2 名单变更。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/antdpro-*.json`（9 张，一页一文件）
- `apps/playground/src/antdpro-replica/antdpro-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './antdpro-replica/antdpro-replica.css';`，沿 styles.css:19 sundial 先例）
- `apps/playground/src/complex-pages/shared/mock-backend-antdpro.ts`
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅追加 `AntdPro__` fetcher 分支）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目）
- `apps/playground/src/complex-pages/__tests__/antdpro-mock-backend.test.ts`
- `tests/e2e/antdpro-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P2a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见 Phase 6）。

## Failure Paths

> 涉及 mock 端点与页面导航，列最小集。

| 可测场景编号     | 触发                             | 行为                           | 可重试 | 用户可见表现                      |
| ---------------- | -------------------------------- | ------------------------------ | ------ | --------------------------------- |
| adp-list-empty   | `AntdPro__orders` keyword 无匹配 | 返回空列表（total 0）          | 是     | 表格空态（ui Empty 语义），不报错 |
| adp-detail-miss  | 详情端点 id 无匹配               | 返回兜底记录或空对象，页面不崩 | 是     | 空态/占位文本                     |
| adp-page-unknown | 注册 id 拼写不一致               | 复刻页不可达（开发期发现即修） | 否     | showcase 列表无该页               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`antdpro-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点；截图仅作视觉证据附件）。交互契约的先红后绿锁定归 P2b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（CSS/mock/注册是后续每页的依赖）；Phase 2–5 每页落 schema 即补该页初屏 e2e；Phase 6 验收自查收口。

### Phase 1 - 基座：令牌差异裁定 + 复刻 CSS + mock 读端点 + 注册

Status: completed
Targets: `apps/playground/src/antdpro-replica/antdpro-replica.css`、`apps/playground/src/styles.css`（仅追加 @import 一行）、`apps/playground/src/complex-pages/shared/mock-backend-antdpro.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/antdpro-mock-backend.test.ts`

- Item Types: `Decision | Fix`

- [x] Decision——令牌偏离裁定：按分析篇 §2 令牌表提取 `#1677ff`/6px 圆角/8pt 间距/灰阶文本四级/控件高 32 等结构，并落实 §6.2 要求（主色或圆角至少换一项建立视觉差异，如圆角 6→8 或主色偏移），裁定结果与理由写入本计划下方「差异声明（P2a 裁定）」节 + CSS 文件头注（含 light-only 声明，沿 sundial 先例）
- [x] `antdpro-replica.css`：令牌块声明于 `.adp-root, .adp-dialog` 双作用域（P1 README 硬规则 2，dialog portal 子树可解析），类名/变量全部 `adp` 前缀；只写品牌专有视觉（令牌化颜色、密度、专有形态），布局/间距用 schema 内 Tailwind 工具类（双轨规则）
- [x] `styles.css` 在 line-19 `@import` 簇（1–19 行为 @import 区，其后是 @source/@theme 指令，@import 不可置于其后）内追加 `@import './antdpro-replica/antdpro-replica.css';`（仅此一行，令牌作用域在复刻页子树实际生效——sundial-replica.css styles.css:19 先例）
- [x] `mock-backend-antdpro.ts`：类型 + 工厂 + 过滤/分页助手；数据集结构真实（列表字段覆盖状态/金额/日期/操作所需型别；pageSize 10 时 ≥3 页；详情记录含 tabs/步骤所需分组字段；仪表盘含 KPI×4/折线序列/饼图序列/Top10）
- [x] `showcase-env.ts` fetcher 追加读端点分支（`/r/AntdPro__orders`（keyword+分页）、`/r/AntdPro__orderDetail`、`/r/AntdPro__dashboard`，按需增补但全部 get-only）；`mock-backend.ts` 不触碰（463 行维持）
- [x] `COMPLEX_PAGE_ENTRIES` 追加 9 条目（id/title/category: `app-replica`/description 写明复刻区块与端点名/features 4 个标签）
- [x] `antdpro-mock-backend.test.ts`：数据集规模断言（≥3 页）、过滤/分页助手行为、端点数据结构完整性

Exit Criteria:

- [x] 差异声明节在本计划内落字（偏离项 + 理由 + light-only 与否）
- [x] CSS/mock/注册/test 四类文件落盘，`AntdPro__` 三端点经 fetcher 分支可命中（mock 单测证明）；`--adp-*` 令牌子树解析的 e2e 证明由 Phase 2 首个落地页初屏用例承载（`getComputedStyle` 断言），本 Phase 不单独建探针页
- [x] `pnpm --filter @nop-chaos/flux-playground test -- antdpro-mock-backend` 全绿
- [x] showcase 页面列表可见 9 个 `antdpro-*` 条目（注册生效）

### Phase 2 - list 标杆页（查询区 + 表格区）

Status: completed
Targets: `page-schemas/antdpro-list.json`、`tests/e2e/antdpro-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] `antdpro-list.json`：PageHeader 区（面包屑 + 标题 + extra 按钮组，`.adp-*` 页头形态，G-A 复刻证据核心块）+ 查询区（form 族字段 + 查询/重置按钮静态排列 + 「展开」入口静态可见）+ crud 表格区（工具栏 icon 组静态 + 选择列 + 金额/状态列排版 + 行操作列 + 分页）；数据经 `AntdPro__orders` 流动
- [x] 每列/操作按钮带 `data-testid="antdpro-<语义名>"`（e2e 断言锚点；P1 README 硬规则 3 前缀=slug）
- [x] e2e：初屏结构用例 ≥1 条（页头文案、查询区字段、表格行数>0 来自 mock、分页总数 ≥31；含 `getComputedStyle` 断言 `--adp-*` 令牌在复刻页子树可解析——Phase 1 @import 生效的证明载体）

Exit Criteria:

- [x] `#/complex-pages/antdpro-list` 可达且初屏结构 e2e 用例绿
- [x] 查询区与表格区组合、PageHeader 区三块在 schema 中可辨识（对照分析篇 §5 能力映射前三行）

### Phase 3 - form 四布局（整页 / 分组 / 弹窗 / 分步）

Status: completed
Targets: `page-schemas/antdpro-form-basic.json`、`antdpro-form-grouped.json`、`antdpro-form-dialog.json`、`antdpro-form-step.json`、`tests/e2e/antdpro-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] `antdpro-form-basic.json`：整页单列表单 + 底部操作条（提交/重置静态按钮）
- [x] `antdpro-form-grouped.json`：区内分组（小标题 fieldset）+ 卡片分组双形态（对照 spec 表单梯度第 3/4 档）
- [x] `antdpro-form-dialog.json`：列表上下文 ModalForm 形态——触发按钮 + `dialog` 内嵌 form（静态形态；e2e 断言方式 = 初屏断言触发按钮可见，点击打开为 Pi-a"可见可点"范围内的最小静态动作，打开后断言弹窗内表单结构）
- [x] `antdpro-form-step.json`：`wizard` 三步分步表单（步骤条 + 分步字段组静态呈现，form-wizard.json 先例；步进校验/数据暂存归 P2b）
- [x] 四页 e2e 初屏结构用例各 ≥1 条

Exit Criteria:

- [x] 四张 schema 落盘且 `#/complex-pages/antdpro-form-*` 全部可达
- [x] 四布局各自初屏 e2e 用例绿（basic 单列+操作条 / grouped 分组标题可见 / dialog 触发按钮可见且点击后弹窗内表单结构可断言 / step 步骤条 3 步可见）

### Phase 4 - detail 基础 + 高级

Status: completed
Targets: `page-schemas/antdpro-detail-basic.json`、`antdpro-detail-advanced.json`、`tests/e2e/antdpro-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] `antdpro-detail-basic.json`：单卡 Descriptions 形态（分组分割线 + 字段行 + 操作按钮组），数据来自 `AntdPro__orderDetail`
- [x] `antdpro-detail-advanced.json`：多卡 + `tabs` 分组 + `steps` 步骤条（进度态；registry 实证原语，首次 schema 用例）+ 审批操作组（对照 spec 高级详情模板：多卡 + tabs/步骤条 + 审批操作）
- [x] 两页 e2e 初屏结构用例各 ≥1 条

Exit Criteria:

- [x] 两张 schema 落盘且页面可达，初屏 e2e 用例绿
- [x] 高级详情的三要素（tabs 分组 / 步骤条 / 审批操作组）在 schema 中可辨识——roadmap P2 focus 第三项落点

### Phase 5 - dashboard + result

Status: completed
Targets: `page-schemas/antdpro-dashboard.json`、`antdpro-result.json`、`tests/e2e/antdpro-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] `antdpro-dashboard.json`：KPI 卡×4 + 折线图 + 饼图 + Top10 排行卡（`chart` + `container`/`flex` 组合，数据来自 `AntdPro__dashboard`；dashboard.json 先例）
- [x] `antdpro-result.json`：result 成功页——结果图形区（lucide 近似自绘替代官方插画）+ 描述行 + 动作组（主按钮 + 次按钮，分析篇 I13 静态形态）
- [x] 两页 e2e 初屏结构用例各 ≥1 条（dashboard 断言 4 KPI 值与图表节点存在；result 断言成功态文案与动作组）

Exit Criteria:

- [x] 两张 schema 落盘且页面可达，初屏 e2e 用例绿
- [x] result 模板（G-A 直接证据 = C1-10）在 schema 中可辨识；无任何官方插画/品牌资产引用

### Phase 6 - 复刻验收自查与事实勘误

Status: completed
Targets: 本计划、`docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`（仅事实勘误时）

- Item Types: `Proof | Decision`

- [x] AI 模板感治理自查（P1 README §4.2）：无"demo 占位"按钮；hover/空态在静态范围内成对可见（列表空态、表单禁用态）；数据经 mock 端点流动非 schema 写死数组；对照 §2 令牌表抽查密度/圆角/语义色/等宽字与原版结构一致性
- [x] 样式契约自查（§4.3）：新 CSS 全部在 `antdpro-replica.css` scope 专用类；零 renderer 包改动；`git status` 确认变更面仅 In Scope 清单
- [x] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [x] 复刻实测中新撞见、分析篇 §7 未登记的能力缺口逐条记入本计划「Non-Blocking Follow-ups」（转 P2b 回写 C2 候选，不在本计划裁决）

Exit Criteria:

- [x] 两维自查记录落字本计划（通过/打回处置结论）
- [x] `npx playwright test tests/e2e/antdpro-replica-visual.spec.ts --reporter=list` 全绿（≥9 初屏用例）
- [x] `pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates，此处仅做解阻塞所需的包级检查）
- [x] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

### Phase 6 自查记录（执行 session 落字，2026-08-29）

**AI 模板感治理（§4.2）——结论：通过。**

- 产品完成度：功能按钮全部真实接线——刷新（component:refresh）、查询/重置（crud queryForm，e2e 用例 10 证明关键字→端点→空态全链路）、展开/收起（filterTogglable 内建）、弹窗打开/取消（openDialog/closeSurface，e2e 用例 4）、wizard 步进（渲染器内建）。批量删除带 `disabled: ${!$crud.hasSelection}` 门控（禁用态成对可见，e2e 用例 10 断言 toBeDisabled）。静态可见按钮（密度/列设置、行操作三键、页头新建/导出/打印/返回、审批通过/驳回、result 动作组）为 Pi-a"可见可点"静态边界，plan 明示归 P2b 接线，非占位伪装。hover 态：`.adp-btn-primary/-outline/-link/-danger-link:hover` 全部在复刻 CSS 声明。数据流动：9 页全部经 `AntdPro__*` 端点拉取（e2e 逐页断言已知记录值，无 schema 写死展示数组）。
- 视觉原创性：对照分析篇 §2 令牌表抽查——密度：控件高 32px（`.adp-btn`）、表格渲染器默认密度档；圆角：`--adp-radius: 8px`（差异声明裁定项，e2e 用例 1 `getComputedStyle` 断言）；语义色：`#52c41a/#faad14/#ff4d4f/#1677ff` 四组浅底标签（e2e 断言 computed backgroundColor）；等宽字：金额列 `tabular-nums`（e2e 用例 6 断言 fontVariantNumeric）。与原版令牌结构一致，抽查通过。

**样式契约（§4.3）——结论：通过。** 新 CSS 仅 `apps/playground/src/antdpro-replica/antdpro-replica.css`（令牌 `.adp-root/.adp-dialog` 双作用域 + `.adp-*` 专用类，light-only 头注）；`packages/` 零改动（git status 证明）；布局/间距全部走 schema 内 Tailwind 工具类（双轨）。执行中发现并就地修复一处治理线冲突：AntdPro 分支内联使 `showcase-env.ts` 涨至 704 行（`check:oversized-code-files` 700 行 MUST-split 红线），已将分支体下沉 `mock-backend-antdpro.ts`、showcase-env.ts 收敛至 680 行，`pnpm check` 恢复零新红。

**§5 能力映射逐行复核——结论：与预估无矛盾，分析篇不做事实勘误。** PageHeader 低（手拼组合成立，G-A 证据成立）；QueryFilter 中（成立，filterTogglable 内建展开收起略超预估）；ProTable 工具栏/密度/列设置 中（G-E 相符：刷新可接线，密度/列设置静态）；StepsForm 高（成立）；ModalForm 高（成立）；ProDescriptions/Statistic 高（成立）；图表 中高（折线/饼图成立；饼图为标准 Pie outerRadius 80%，初屏截图中扇形半径不齐系 recharts 入场动画中间帧，非形态缺口）；Result 中（成立，无预设可拼，G-A/C1-10 证据成立）；空状态 高（成立）。执行注记：steps 受控 value 需显式 `valueOwnership: 'controlled'`（local 档忽略 value prop）——系 registry 已文档化契约而非缺陷，作为 D1 schema 人体工学输入记入 Follow-ups。

**新撞见能力缺口（分析篇 §7 未登记）——结论：无新增登记项。** 上述 steps 人体工学与饼图动画帧均为已文档化语义或观察误判，不构成新缺口；页面模板层/批量栏等缺口均已在 §7 所列 G-A/G-B3/G-E 登记。

## 差异声明（P2a 裁定）

> Phase 1 Decision 项产出后落字。按分析篇 §6.2 要求记录：偏离项、保留项、light-only 与否。

- **偏离项（建立视觉差异）**：圆角 6px → **8px**（`--adp-radius: 8px`；`--adp-radius-lg` 同步 8px，`--adp-radius-sm` 保持 4px）。理由：分析篇 §6.2 允许"主色或圆角至少换一项"；AntD `#1677ff` 企业蓝是该复刻页族全部语义色（状态标签/主按钮/链接/焦点）的语义锚点，换色会连带破坏语义色抽查（P1 README §4.2）的一致性，故选择圆角偏移建立差异，同时 8px 与 flux 既有 shadcn 底座圆角语言更接近。
- **保留项**：主色族 `#1677ff / #4096ff / #0958d9`（含 hover/按压/浅底/描边四档）、语义色 `#52c41a/#faad14/#ff4d4f`（含浅底）、灰阶文本四级 `rgba(0,0,0,0.88/0.65/0.45/0.25)`、布局底 `#f5f5f5`、分割线 `rgba(5,5,5,0.06)`、控件高 32px、8pt 间距系、字体栈与 1.5714 行高、金额 tabular-nums 等宽排版、交互过渡 0.1s。
- **light-only**：是。复刻页仅声明浅色令牌（`antdpro-replica.css` 头注明示，沿 sundial 先例）。
- **品牌边界**：文案全部自拟中文（客户/商品/人名/数据均为原创），图标 lucide 近似，零 Ant Design 品牌资产引用。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb42bafc7ffeAjI6YMQRyheT8z`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1-Blocker1 复刻 CSS 无加载路径——`styles.css`（仅追加一行 @import）纳入 In Scope/Phase 1 Targets+条目+Exit，引用 styles.css:19 sundial 先例；R1-Major1 testid 前缀 `adp-`→`antdpro-`（P1 README 硬规则 3 前缀=slug）；R1-Minor1/2/3（dialog e2e 机制澄清、Phase 6 改包级检查、steps 原语两档实证表述）一并修正。R2 复核零 Blocker/零 Major，达成共识；R2 两条 Minor（Phase 1 令牌解析证明载体改由 Phase 2 首页 e2e 承载；@import 位置限定 line-19 @import 簇内）已随共识落字。

## Closure Gates

- [x] 9 张 `antdpro-*` schema 全部落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿
- [x] 差异声明已裁定并落字（主色或圆角至少一项偏离）
- [x] `antdpro-mock-backend.test.ts` 全绿；`AntdPro__` 端点全部 get-only；`mock-backend.ts` 行数未回涨（≤500 行治理线）
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [x] 无品牌资产复制（插画/文案/图标全部替换）
- [x] AI 模板感治理与样式契约自查完成并落字
- [x] roadmap Phase Status 区 P2a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 已随本关闭编辑落至 roadmap
- [x] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——Phase 6 复核无矛盾，分析篇未改
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 目标 e2e：`npx playwright test tests/e2e/antdpro-replica-visual.spec.ts` 全绿（补充目标 e2e 基线红清单核对：不引入新增红）

## Deferred But Adjudicated

### roadmap P2 名单外页面（search-list/profile/account/login/exception 等）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap P2 条目固定模板族为 dashboard/list/form×4/detail×2/result；名单外页面不在任何 work item 承诺内，不影响"页面级模板空白补齐"结果面成立
- Successor Required: `no`
- Successor Path: 无（如未来需要，属 roadmap 结构性变更，须人工确认）

## Non-Blocking Follow-ups

- 复刻实测撞见的新能力缺口（若 Phase 6 发现）：逐条登记，转 P2b closure 回写 C2 时一并裁决（roadmap Cross-Cutting 5 追加方式），不在本计划裁决
- G-A 的 L2 语义化（PageHeader/查询区/result 作为可复用预设产品化）：归 D1 流程，输入含本计划复刻实证

## Closure

Status Note: 全部 6 个 Phase 完成且 Exit Criteria 逐条勾选；9 张 `antdpro-*` 复刻页 schema + 复刻 CSS（圆角 6→8px 差异裁定）+ 3 个 `AntdPro__` get-only mock 读端点 + 10 条初屏结构 e2e + 12 条 mock 单测全部落盘并全绿（`pnpm typecheck`/`build`/`lint`/`test` 68 tasks、`pnpm check` 零新红）。执行中唯一治理线冲突（showcase-env.ts 触 700 行红线）已就地修复并将防线经验记入 Phase 6 自查。独立 closure audit 通过后本计划关闭；`planned`→`done` 已同步 roadmap。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_fb3e7a832ffe1Sy9XzXORpZMg9`
- Evidence: closure audit 报告（2026-08-29）：逐 Phase Exit Criteria 对照 live repo 复核通过；验证输出独立复跑确认（playground 单测 200/200、目标 e2e 10/10、typecheck/build/lint 零错误、`pnpm test` 68/68、`pnpm check` exit 0 仅含 2 个已登记 exempt i18n 红行）；`mock-backend.ts` 463 行未回涨、`showcase-env.ts` 680 行（warning 档非红线）；`git status` 变更面零 `packages/` 触碰；品牌资产 grep 零命中（"Ant Design Pro" 仅出现于描述复刻对象的合法语境）。Verdict: `approved`（零 Blocker/零 Major；2 Minor 均为关闭编辑内消化：Closure Gates 勾选时机、审计交接简报中单测计数口误 15→实际 12）。

Follow-up:

- no remaining plan-owned work（Non-Blocking Follow-ups 区两条均为跨计划归属项：C2 回写归 P2b closure、L2 语义化归 D1；steps `valueOwnership` 受控语义人体工学注记随复刻实证一并作为 D1 输入）
