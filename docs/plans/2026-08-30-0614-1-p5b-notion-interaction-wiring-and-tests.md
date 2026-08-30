# P5b Notion database 多视图复刻 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P5b. Notion database 多视图复刻 — 交互接线与测试
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P5b 条目 + Phase Details P5 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架与拆分规则、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/notion-database.md` §4 交互清单 I1–I14 + §7 转 C2 候选；P5a 落字「G-C 静态实测结论（P5a 实测）」节（P5b 接线落点清单）
> Related: `docs/plans/2026-08-30-0040-2-p5a-notion-database-static-replica.md`（P5a，completed——本计划的全部静态落点、差异声明 D1–D3 与 G-C 静态实测结论来源，P5b 直接采用）；`docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md`（Pi-b 最近先例：写端点先红后绿、交互清单逐条处置表、mock 实体模块拆分、opt-in e2e 观察钩子、C2 回写义务）；`docs/plans/2026-08-29-1819-1-p3b-cal-booking-interaction-wiring-and-tests.md`（Pi-b 先例：url 模板参数物化 + dependsOn 自动刷新、语义模拟端点）
> 执行顺序约束：roadmap 实线 `P5a → P5b` 已满足（P5a `done`，2026-08-30 closure audit 通过）；roadmap 虚线 `P5b -.-> P6a`——P6a plan 已同批起草（`docs/plans/2026-08-30-0614-2-p6a-airtable-grid-static-replica.md`，draft），其在 P5b `done` 前不得开始执行，与本计划无文件冲突

## Purpose

消费 P5a 已落盘的单页 `notion-database` 静态复刻、分析篇 §4 交互清单（I1–I14）与 P5a「G-C 静态实测结论」接线落点清单，把 Pi-b 段义务收口：补全 `Notion__` mock 写端点（记录更新/新建插行/看板拖拽改分组/复制链接语义模拟等，终态集合 Phase 1 裁定）、接线可模拟交互（搜索参数化、filter/sort/group 客户端化生效、peek 属性编辑保存、行内新建、board 拖拽跨列、视图 tab 状态机强化断言）、对不可模拟项（视图 tab 拖拽重排/溢出/三态动态切换 I13、日历拖改期、新建视图真实分支 I2 等）逐条显式裁决，分析篇 §4 逐条 e2e 先红后绿锁定，closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2（回写 ⑥，G-C 终态实测 + P5a 两个 §7 候选终态），并把"预测缺口 vs 实测缺口"对照记入应用分析篇。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `827778012`）：

- P5a 全部静态产物在库：单页 `apps/playground/src/complex-pages/page-schemas/notion-database.json`（**6066 行**，category `app-replica` 已注册）；`apps/playground/src/notion-replica/notion-replica.css`（**707 行**，`--nt-*` 令牌声明于 `.nt-root, .nt-dialog` 双作用域，light-only，10 色盘全集 30 变量）；`shared/mock-backend-notion.ts`（**499 行**（wc 计；门禁脚本按换行切分计 500，不触 >500 WARN））；`shared/showcase-env.ts`（**697 行**，≤700 红线，`Notion__` 委托经 `replicaBranches` 数组派发在 :121）；`tests/e2e/notion-replica-visual.spec.ts`（364 行，6 条初屏用例全绿）；`__tests__/notion-mock-backend.test.ts`（237 行，15 条单测）。
- **mock 读端点 3 个全部 get-only、零写端点**：`Notion__records`（`view=` 五形态 + `keyword` 参数已备未接线 + 分页；board 分组/聚合 mock 预计算、list 过滤排序**服务端预应用**——"每视图一套参数生效"的数据契约样板）、`Notion__record?id=`（peek 兜底 nt-peek-miss）、`Notion__viewConfigs`（五条每视图私有 filter/sort/group/layout 参数对象）。
- **schema 接线面实测（live 证据）**：
  - 六个 data-source 节点**均已有显式 id**（`notion-source-table/board/gallery/calendar/list/viewconfigs`）——`component:refresh` 跨树刷新载体就位（P4b 先例姿势，无需补 id）。
  - 视图 tab 条 `notion-view-tabs`：`valueOwnership: 'scope'` + `valueStatePath: 'activeView'`——切换已写页面 scope，五分支 tabs keepMounted 内建 hidden 切换、零重取数（P5a e2e 06 锁定）。
  - 五视图 data-source url **固定**（`view=table&perPage=100` / `view=board|gallery|calendar|list`），无 keyword/filter/sort 参数物化——搜索入口 `notion-search-input`（裸 input-text，name `ntSearchKeyword`）零动作；`Notion__viewConfigs` 配置集中的 filter/sort/group 仅作数据预载，生效全靠 mock 服务端预应用。
  - condition-builder `notion-settings-filter-builder`（name `ntFilter`）静态内嵌 View settings 抽屉，零提交语义（P5a D2⑤ 裁定"静态不生效"注记）；`notion-settings-display`（name `ntTabDisplay`）三态 select 静态。
  - board kanban `notion-board-kanban`：`draggable: false` 显式关闭 + `notion-board-dnd-note` 注记；**无 `onCardMove`、无 `rowSelection` 声明**；列头计数为 renderer 原生徽标、Count/Percent 聚合走 mock 预计算静态条 `notion-board-aggregate`。
  - peek 双形态（table/board/list→side drawer、gallery/calendar→center dialog）：五处触发点，form `loadAction: Notion__record?id=${id}` 只读属性行——**属性编辑零动作**。
  - I8 新建行形态（表底 `+ New`/右上 New/gallery 空卡/日历 hover `+`）、I7 列头菜单 dialog（八条目）、I2 新建视图 dialog（类型清单）——全部零动作静态浮层。
- **接线能力 live 实测（file:line 证据）**：
  1. **裸 input scope 写入通道在库**：无 form 时每次键入 `scope.update(name, value)`（`packages/flux-renderers-form/src/field-utils/field-handlers.tsx:213-224` 无 form 分支，P4b ⌘K 实测同源）→ 搜索参数化路径 = 裸 input 写 scope → data-source url 模板 `keyword=${ntSearchKeyword}` + 显式 `dependsOn` 自动刷新（P3b slots 先例）。
  2. **kanban 拖拽事件在库**：`onCardMove`/`onCardClick` 均 ActionSchema（`packages/flux-renderers-scheduling/src/kanban/kanban.types.ts:34-35/71-73`）；`draggable` 默认开启（`kanban-board.tsx:46`，`resolved.draggable !== false`）——board 拖拽接线 = 移除 `false` 声明 + 补 `onCardMove`（跨列 = 改分组属性值，分析篇 I9）。P4b 拖拽源注册滞后 finding（C2 回写 ⑤ G-A）引用：接线断言以数据一致性姿势锁定，不依赖 dragstart 载荷逐卡稳定。
  3. **跨树刷新姿势**：`component:refresh` + `componentId`（data-source 显式 id 已就位，见上）；form/浮层内对页面级 data-source 派发 `refreshSource` 必然 `Source not found`（P3b 撞墙，C2 回写 ④/⑤ 维持）。
  4. **动作词汇无剪贴板/键盘序列通道**（C2 回写 ③/④/⑤ 三例同源）→ Copy link 语义模拟沿 `Cal__shareLink`/`Linear__copyLink` 先例（第四例素材）；视图 tab 拖拽重排/单键手势无承载（G-B2 口径维持，禁 hack 绕道）。
  5. **toast 生命周期**：跳转型动作链 `messages.success` 存活 <100ms，需 `control: { debounce: 1200 }` 延迟 navigate（回写 ③/④/⑤ 三例先例；本计划如出现跳转链沿用）。
  6. **table 行内编辑通道**：Notion table 视图基于 `table` renderer（非 crud），单元格直编辑无 rowSelection/inline-edit schema 通道声明——I6 编辑态收敛到 peek form 的可行性 Phase 1 实测裁定（编辑器矩阵深度本体是 G-D，P6 应用主对照，本计划只做裁定与归因不扩 scope）。
  7. **自绘 calendar（P5a D2⑥ container grid + loop）无 renderer 事件面**——日历 hover `+` 建条目可走按钮面接线，拖拽改期（I9 calendar 子项）无拖拽通道，显式裁决不模拟。
- **P5a Deferred 移交项（本计划收口义务）**：
  1. **交互接线全谱**（P5a Deferred #1：I3–I6/I8/I9/I11/I12/I14，Successor Path = 本计划）——本计划主体；
  2. **个人视图偏好存储层**（P5a Deferred #2 + 分析篇 §7 候选 1：activeViewId/display 三态"仅本人生效"配置）——本计划裁定深化模拟或随 C2 回写登记终态；
  3. **board 列聚合计算**（P5a Deferred #3 + 分析篇 §7 候选 2：Count/Sum/Avg/Percent 动态语义）——mock 预计算静态维持或端点动态化裁定 + C2 回写。
- **数据样本可扩展通道**：P5a Non-Blocking Follow-up 预授权——接线中发现编辑中间态/插入行/拖拽 ghost 等状态样本不足，在 `mock-backend-notion.ts`（或其拆分模块）内补样本属本计划 Fix 范围。
- **治理线**：`showcase-env.ts` 697 行——**新增写端点分支体必须全部下沉 `mock-backend-notion.ts`，showcase-env 仅允许零改动或 ≤10 行胶水且总行数 ≤700**；`mock-backend-notion.ts` 499/500 行贴线——继续增长**必须**按 `mock-backend-linear-*` 实体模块先例拆分（Phase 1 Decision 裁定拆分形态并记录拆分后行数，禁止以未登记 oversized WARN 为代价硬塞）；`mock-backend.ts`（463 行）零触碰。
- roadmap Cross-Cutting 5：Pi-b closure 必须以追加方式回写 C2（回写 ⑥，不重开初版裁决）——本计划携带的回写输入：G-C 终态实测（视图状态机模拟深度、嵌套 filter 求值可行性、配置集双层权限与 peek 联动结论）、P5a §7 两候选终态、board 列聚合证据、clipboard 第四例（`Notion__copyLink`）、自绘 calendar 无事件面注记、condition-builder 求值边界素材、kanban 拖拽本应用实测（若与 P4b 注册滞后结论有出入）。

## Goals

- mock 写端点补全并先红后绿锁定（终态集合 Phase 1 Decision 裁定，候选：`Notion__updateRecord`（记录属性更新落库）、`Notion__createRecord`（新建插行）、`Notion__moveCard`（board 拖拽改分组）、`Notion__updateViewConfig`（filter/sort/group 会话态，视生效机制裁定）、`Notion__copyLink`（get 零副作用语义模拟）——全部沿 P2b/P3b/P4b 写端点会话态先例）。
- 分析篇 §4 交互清单 I1–I14 **逐条处置落字**（本计划处置表 N1–N14：接线锁定 / 内建锁定 / 显式裁决不可模拟），Pi-b 档位 = `必须自动化`（P1 README §4.1），每条"接线锁定/内建锁定"项 ≥1 条先红后绿 e2e；"显式裁决"项落字缺口归因（G-C/G-B2/G-D）不构成档位违反（沿 P3b I15/P4b L 口径注记）。
- filter/sort/search 客户端参数化生效（I3/I4/I5）+ 每视图配置切换随动（I1 深化：切换后该视图 filter/sort/group 参数生效可断言）——生效机制（url 参数物化 / condition-builder 客户端求值 / 混合）Phase 1 裁定。
- P5a Deferred 三项收口：接线全谱主体落地；两 §7 候选（个人视图偏好存储层/board 列聚合计算）在本计划内显式裁定终态并随 C2 回写。
- closure 时完成 C2 追加回写（回写 ⑥）+ 分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b/P3b/P4b 先例追加进 `notion-database.md`）。
- 全量验证 full-green（typecheck/build/lint/test + 目标 e2e + `pnpm check` 零新红）。

## Non-Goals

- 不改 `packages/` 下任何 renderer/ui/runtime 代码；option-row（G-F）、command/键盘原语（G-B1/G-B2）、网格编辑器矩阵深化（G-D，P6 主对照）、视图偏好存储层（L4 候选）、board 列聚合语义件、popover 原语、calendar 六周竖网格视图档（L2 候选）等产品化归 D1 流程。
- 不新增 schema 页面文件（P5a D1 单页裁定维持）；不做暗色适配（P5a 差异声明 light-only 维持）。
- 不实现以下项（显式裁决，禁止 hack 绕道）：视图 tab 拖拽重排/溢出收纳动态化/三态动态切换生效（I13——tabs 无拖拽与动态 label 通道，原语缺口）；运行时真实新建视图分支（I2——五视图分支为静态 schema，mock 会话态层面的模拟深度 Phase 3 裁定，不可达部分显式裁决）；日历拖拽改期（自绘网格无事件面）；真实剪贴板写入；"Save for everyone" 双层权限真实化（P5a §6.2 静态演示差异声明维持）。
- 不接线 `linear-*`/`cal-*`/`antdpro-*` 等其他 slug 页面；不触碰 `mock-backend.ts` 与其他 slug mock 模块。
- 不复制任何 Notion 品牌资产；产出界面维持零 "Notion" 名称与商标（P5a 差异声明延续）。
- 不重新评审 R1 分数、不做 P5 名单变更、不重开 C2 初版裁决表。

## Scope

### In Scope

- `apps/playground/src/complex-pages/shared/mock-backend-notion.ts`（追加写操作 + 会话态；超载则按 Decision 拆分实体模块）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅 ≤10 行胶水或零改动，总行数 ≤700）
- `apps/playground/src/complex-pages/page-schemas/notion-database.json`（仅既有单页内接线：动作声明/参数化 url/visible·disabled·计数表达式/补 testid/`draggable` 声明切换——不新增页面文件）
- `apps/playground/src/notion-replica/notion-replica.css`（仅接线必需的形态类补充，如拖拽落点指示、批量态；scope 专用类）
- `apps/playground/src/complex-pages/__tests__/notion-mock-backend.test.ts`（写操作单测）
- `tests/e2e/notion-replica-visual.spec.ts`（追加交互用例；现 364 行 + 预估交互用例体量，超 ~500–600 行则按 P1 README §2.2 拆分规则新建 `tests/e2e/notion-replica-interactions.spec.ts` 承载交互用例——沿 P4b 先例，拆分与否 Phase 2 落字）
- `docs/analysis/ui-review/C2-capability-gaps.md`（§3 回写 ⑥ 追加，closure 时）
- `docs/analysis/ui-review/P1-reference-apps/notion-database.md`（仅追加 §4.1「预测 vs 实测」对照与事实勘误）
- roadmap Phase Status 区 P5b `todo`→`planned`（draft review 通过后）；closure audit 通过后 `planned`→`done`

### Out Of Scope

- `packages/` 全部代码；`tests/e2e/` 中非本 spec 的文件；`docs/analysis/` 既有文档的结构性改写；`mock-backend.ts`；`mock-backend-antdpro.ts`/`mock-backend-cal.ts`/`mock-backend-linear*.ts`；新增 playground schema 页面；新 CSS 文件（仅既有 `notion-replica.css` 内追加）。

## Failure Paths

> 涉及写端点与交互状态机，列最小集（编号沿 P5a `nt-` 简名惯例，非 testid 约定）。

| 可测场景编号    | 触发                              | 行为                       | 可重试 | 用户可见表现                                        |
| --------------- | --------------------------------- | -------------------------- | ------ | --------------------------------------------------- |
| nt-update-miss  | updateRecord 的 id 无匹配         | 失败分支，会话库不变化     | 是     | message 错误提示，peek/行数据不变                   |
| nt-create-miss  | 新建记录缺标题必填                | 不发写请求（前端校验拦截） | 是     | 字段红环 + 错误文案                                 |
| nt-move-miss    | moveCard 卡片 id/目标列无匹配     | 失败分支，卡片回原列       | 是     | message 错误提示，board 布局不变化                  |
| nt-filter-empty | keyword/filter 参数无匹配记录     | 端点返回空数组             | 是     | 视图空态文案，不报错                                |
| nt-viewcfg-miss | updateViewConfig 的 viewId 无匹配 | 失败分支，配置不变         | 是     | message 错误提示                                    |
| nt-copy-noop    | 复制链接语义端点                  | 无副作用 get，恒成功       | 是     | message「已复制」反馈（语义模拟，无真实剪贴板写入） |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档：分析篇 §4 交互清单 I1–I14 逐条有 e2e 断言，交互契约无一豁免；先红后绿——新接线动作的 e2e 在接线前先断言失败，或对既有内建行为补锁定断言）。档位口径注记（沿 P3b/P4b）：「逐条有断言、无一豁免」指不允许**未处置的静默跳过**；处置表中显式裁决为"缺口不模拟"的条目（N2 新建视图真实分支、N7 动态列模型子项、N9 行拖排序/calendar 拖改期子项、N13 tab 定制全谱等）属"逐条有处置"，不构成对档位的违反。最低证明：`notion-mock-backend.test.ts` 写操作单测全绿 + 处置表中每条"接线锁定/内建锁定"项 ≥1 条程序化 e2e 断言（testid 可见性/数据变化/会话态跨视图一致/getComputedStyle；截图仅视觉附件）。

## Execution Plan

> 顺序 Phase。Phase 1 写端点基座与生效机制裁定先行（后续接线全部依赖）；Phase 2–3 按视图区块接线；Phase 4 回写与自查收口。

### Phase 1 - mock 写端点基座与生效机制裁定（先红后绿）

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-notion.ts`、`shared/showcase-env.ts`（≤10 行胶水，如需）、`__tests__/notion-mock-backend.test.ts`

> **Phase 1 Decision 落字（2026-08-30 执行实测）**
>
> 1. **写端点契约终态**（post 全部 `status:0` 成功 / `status:1` 失败，失败体 `{ok:false,error}`；get 为 copyLink 语义载体）：
>    - `Notion__updateRecord`：`{id, patch:{title?|category?|status?|date?}}`；平铺顶层 patch 键（peek form `includeScope:'*'` 别名）等价接受；status 接受枚举值与中文标签双形态；`card-` 前缀容错；命中即改会话库并 bump `editedTime`；无匹配/非法字段 → 失败（nt-update-miss，`__notionTestHooks.updateMiss` 可强制）。
>    - `Notion__createRecord`：`{title, category?, status?, date?}` → 生成 `REC-{max+1}`（32 条种子库下一个为 `REC-133`）入会话库；**插行位次 = 会话库表尾**（table 视图 total +1，keyword 检索可达）；未指定字段取默认（分类=产品需求、状态=not_started、工作量=1、负责人=文清鹤）；空/缺 title 或非法分类 → 失败（nt-create-miss，schema 侧 required 先拦）。
>    - `Notion__moveCard`：`{id, toColumn, toIndex?}`；`card-`/`col-` 前缀容错；**按 board 当前会话分组属性翻转**（默认 status，I11 覆写后为 category/person，列值解码走 `notionGroupColumns` 注册表）+ 会话排序（`toIndex` = 目标列内插入位，越界/缺省追加）；未知列/无匹配卡 → 失败（nt-move-miss，`moveMiss` 钩子可强制）。**board 列头计数与聚合条随会话更新**（board 读载荷即端点重算的 `buildNotionBoardData`，非独立静态数据——P5a Deferred ③ 裁定终态：mock 端点动态化，静态预计算条退役）。
>    - `Notion__copyLink`：**get**、零副作用、恒成功 `{ok,id,url}`（第四例 clipboard 语义模拟，沿 `Cal__shareLink`/`Linear__copyLink` 先例，nt-copy-noop）。
>    - `Notion__updateViewConfig`：`{viewId, patch:{filter?|sorts?|group?}}` → 会话覆写表 `overrides[viewId]`（显式 `null` 清除该键覆写回默认读行为）；未知 viewId/非法 group/sorts 非数组 → 失败（nt-viewcfg-miss）。后续 records 读按覆写**服务端预应用**（P5a 预应用逻辑平移）。
> 2. **filter/sort/search 生效机制裁定：③ 混合**。**I5 搜索 = 候选①（url 模板参数物化）**：搜索 dialog 内裸 `input-text name:ntSearchKeyword` 每键入 `scope.update`（`field-handlers.tsx:213-224` 无 form 分支）→ 五视图 data-source url 追加 `keyword=${ntSearchKeyword ?? ''}` + `dependsOn:['ntSearchKeyword']` 自动刷新（P3b slots 先例）；mock keyword 匹配域从「标题+id」扩展为「标题+id+分类+状态标签+负责人+标签+日期」（分析篇 I5「匹配标题+属性值」语义对齐，Baseline 数据样本预授权）。**I3 filter/I4 sort/I11 group = 候选①变体（会话 viewConfig + 服务端预应用）**：View settings 表单 `submitScope:surface` + `includeScope:'*'` 提交 → `Notion__updateViewConfig` → 受影响 source `component:refresh` 回读（P4b 批量 dialog 先例）。候选②（condition-builder 输出经公式内联过滤）**否决**：公式通道（ARRAYFILTER 等）无法递归展开嵌套 group 结构（G-C 静态对照③的可证边界），服务端求值姿势下嵌套 ≤3 层 and/or 完整可达——`evalNotionCondition` 递归求值（组嵌套第 4 层判否，与 builder `maxDepth` 口径一致；未知字段/操作符判不命中不抛错），单测覆盖嵌套求值与深度上限（G-C 嵌套 filter 求值可行性终判：**服务端预应用姿势可达，客户端公式姿势不可达**，随 C2 回写 ⑥）。**I1 随动断言口径**：覆写按 viewId 隔离——active 视图应用配置后该视图数据变化可断言，其余视图不受影响（每视图私有配置集成立），切 tab 后目标视图保持其自身会话配置的生效状态。
> 3. **模块组织裁定：按 linear 实体模块先例拆分为四件 + 主模块**（`mock-backend-notion.ts` 499/500 行贴线，写操作 + 求值器必然超载）：`mock-backend-notion-types.ts`（119 行，模型类型 + 10 色盘/状态/人员/看板列/分类注册表）、`mock-backend-notion-records.ts`（175 行，数据集种子 + 行投影 + keyword 过滤 + 分页）、`mock-backend-notion-views.ts`（173 行，board 分组泛化构建 + calendar 网格构建）、`mock-backend-notion-writes.ts`（427 行，Phase 2/3 平铺别名与 status 双形态比对扩展后终值；会话覆写 + 嵌套条件求值 + 会话排序 + 写操作核心）、主模块 `mock-backend-notion.ts`（264 行，viewConfigs + 数据库组装 + fetcher 分支 + `export *` 兼容再导出，既有 import 零改动）。**拆分后全部 ≤500，零新增 oversized WARN**（`check-oversized-code-files` 实测无 notion 命中）。会话态 = 工厂闭包持有的 records 数组 + overrides 覆写表，同 session 跨页跨视图可观察（cal/linear 先例）。opt-in e2e 钩子沿 linear 先例落位：`__notionEndpointCalls`（端点计数）与 `__notionTestHooks.moveMiss/updateMiss/lastMove/lastUpdate`（强制 miss 走真实端点路径 + 载荷观察），生产 no-op。
> 4. **先红后绿证据记录**：执行顺序沿 P4b 口径（写分支先落、测试后更，同 session 内顺序倒置）。红态两段可证：①对 pre-P5b 实现跑新测试面 = `6 failed | 294 passed`（写端点/求值器全部未实现）；②新契约落地后初版测试面 `2 failed`（list 过滤语义断言与覆写残留两处测试逻辑修正）→ 终态 `300 passed` 全绿（31 files）。红态截图无，以失败输出为准。

- Item Types: `Decision | Proof | Fix`

- [x] Decision——写端点语义裁定：post 端点定名与契约（候选集，Phase 内裁定终态）——`Notion__updateRecord`（`{id, patch:{title?|status?|priority?|assignee?|date?|<裁剪清单内型别字段>}}` → 会话库生效返回更新记录，无匹配失败 nt-update-miss）、`Notion__createRecord`（`{title, ...}` → 生成 id 入会话库，插行位次（表尾/视图序）与默认值裁定，nt-create-miss 守卫）、`Notion__moveCard`（`{id, toColumn}` → 分组属性翻转 + 会话态，`card-` 前缀容错沿 linear 先例，nt-move-miss 分支；board 聚合条/列计数随会话更新 or 维持 mock 预计算的裁定在此落字）、`Notion__copyLink`（get、零副作用、恒成功 `{ok,id,url}` 沿 `Cal__shareLink`/`Linear__copyLink` 第三例先例，nt-copy-noop）、（视生效机制裁定可选）`Notion__updateViewConfig`（`{viewId, patch:{filter?|sorts?|group?}}` → 会话配置态，后续 records 读按会话配置预应用，nt-viewcfg-miss 分支）——miss 行为按 Failure Paths 裁定并落字本计划（终态见 Phase 1 Decision 注记 1）
- [x] Decision——filter/sort/search 生效机制裁定（I3/I4/I5 + I1 随动）：候选 ①**url 模板参数物化**——裸 input/select 写 scope → 五视图 data-source url 模板（`keyword=`/`sort=`/`group=` 等）+ 显式 `dependsOn` 自动刷新，mock 端点按会话 viewConfig 服务端预应用（P5a 已有预应用逻辑平移，P3b slots 先例）；②**condition-builder 客户端求值**——builder 输出经公式内联过滤（嵌套 ≤3 层 and/or 求值可行性为 P5a G-C 静态对照③的实测义务，可行性实测后裁定，不可达部分显式裁决归因 G-C）；③混合（如 keyword 走①、filter 走②）。裁定需含每视图配置切换随动的断言口径（切 tab 后该视图参数生效可观察）并落字（终态：③ 混合，见 Phase 1 Decision 注记 2）
- [x] Decision——`mock-backend-notion.ts`（499/500 行贴线）组织裁定：直接追加（将触 >500 WARN 线，须先评估 `pnpm check` 既有登记口径）或按 `mock-backend-linear-*` 三模块先例拆分实体模块（候选：read（records/board/calendar/gallery/list 构建）/write（会话态写操作）/viewConfigs 域）——落字结论、拆分形态与拆分后行数记录（终态：四件 + 主模块五文件拆分，见 Phase 1 Decision 注记 3）
- [x] Proof——写操作单测先红后绿：每端点 ≥2 条（成功路径 + Failure Path）、会话内持久性断言（updateRecord 后 records 端点返回新值、createRecord 后分页/行数 +1、moveCard 后 board 视图列分布变化且 table 视图分组值同步）——先于 Fix 编写，对未实现分支断言失败（红态 `6 failed | 294 passed`，见 Phase 1 Decision 注记 4）
- [x] Fix——`mock-backend-notion.ts`（或拆分模块）扩展 post 分支：写操作修改 in-memory 会话库，同一 session 内跨页跨视图可观察（cal/linear 先例）；opt-in e2e 观察钩子沿 cal/linear 先例评估落位（如 `__notionTestHooks`，生产 no-op）；`showcase-env.ts` 零改动或仅 ≤10 行胶水且不回涨 700 行红线；`mock-backend.ts` 零触碰（终态：showcase-env 零改动 697 行，mock-backend.ts 零触碰 463 行，钩子已落位）

Exit Criteria:

- [x] 写端点契约（端点名/入参/miss 行为）与两项机制裁定（生效机制/模块组织）已落字本计划 Decision 注记
- [x] `pnpm --filter @nop-chaos/flux-playground test -- notion-mock-backend` 全绿且含新增写操作用例
- [x] `showcase-env.ts` ≤700 行、`mock-backend.ts` 零改动（`wc -l` 实测记录于本计划）

> **wc -l 实测（Phase 1 收口）**：`showcase-env.ts` 697（≤700 ✓，零改动）；`mock-backend.ts` 463（零触碰 ✓）；拆分后 `mock-backend-notion.ts` 264 / `-types.ts` 119 / `-records.ts` 175 / `-views.ts` 173 / `-writes.ts` 427（closure audit Minor-1 修正：Phase 2/3 扩展后终值，原记 401；全部 ≤500，`check-oversized-code-files` 零新增 notion 命中）。

### Phase 2 - table 视图接线（I5 搜索 / I8 新建行 / I6+I10 编辑链路 / I7·I12·N14 裁定）

Status: completed
Targets: `page-schemas/notion-database.json`、`notion-replica.css`（如需）、`tests/e2e/`（同 Phase 1 spec 拆分裁定）

> **Phase 2 执行落字（2026-08-30 实测）**
>
> 1. **拆分裁定落地**：交互用例落新建 `tests/e2e/notion-replica-interactions.spec.ts`（8 条用例；visual spec 364 行 + 交互用例预估体量按 P1 README §2.2 触发拆分，visual 保留初屏）。
> 2. **I5 搜索通道实测修正（重要）**：Phase 1 注记 2 预判的「裸 input scope 写入 → url 物化自动刷新」经探针实测**不成立**——dialog 内裸 `input-text` 每键入写的是 dialog 子 scope 自有 store（`createScopeRef` 无父向 update 旁路），页面级 data-source 的 dependsOn 订阅观察不到子 scope 写入（探针证据：键入后六源零重取）。终态接线沿 P4b L12 已验证姿势：搜索 dialog 内包 `form`（`submitScope:'surface'` + `data:{keyword}` 回显）+ `submitOnChange: true`（300ms debounce）+ `submitAction: setValue(path:'ntSearchKeyword', value:'${keyword ?? \'\'}')`——**form 自身 submitAction 的求值域可解析字段名**（实测 `${$formData.keyword}` 在 submitAction 域不可解析、报表达式求值失败；`${keyword}` 可解析），setValue 落页面 scope → dependsOn 五源自动重取 → **输入即过滤成立**（300ms debounce 内联）；dialog 级 `onSubmitSuccess` 不承载搜索（`closeOnSubmit: false` 保持面板开启连续过滤）。
> 3. **I8 新建链路**：四处入口（右上 New / 表底 +New / gallery 空卡 / list 底部 New）共享 `notion-record-dialog`（closure audit Minor-3 措辞澄清：四处触发入口 + 日历 `+` 克隆体 = schema 内复制体 5 份，全部一致接线），统一接线 `closeOnSubmit` + dialog `onSubmitSuccess`（五源 component:refresh）+ form `submitScope:'surface'` + `submitAction: ajax Notion__createRecord`（`includeScope:'*'`）+ 创建钮（`notion-record-submit`，submitForm）；标题 required 空提交被内建校验拦截不发请求（e2e 02）；成功表尾插行 REC-133、默认值落库（e2e 03）。
> 4. **I6/I10 peek 编辑链路**：五处 peek（side×3 / center×2）form 统一追加 `notion-peek-edit` 编辑区（title input + status/category select，`value` 绑 loadAction 数据）+ 保存钮（submitForm → `Notion__updateRecord`，`includeScope:'*'` + `data:{id}`）+ 复制链接钮（`Notion__copyLink` get 语义模拟）+ dialog `closeOnSubmit` + `onSubmitSuccess` 五源刷新。**实测坑**：`includeScope:'*'` 会把 loadAction 载入的整条记录合并进请求体，原始 `title`/`status` 键会遮蔽编辑值——mock 侧裁定 `ntPeek*` 为编辑面规范键（优先于同名载荷键，单测锁定）；跨视图一致性（table 改 → board/list 刷后同步）e2e 04 锁定。
> 5. **I3/I4 settings 接线**：View settings 表单补 `submitScope:'surface'` + `submitAction: ajax Notion__updateViewConfig`（`data:{viewId:'${activeView ?? \'table\'}'}` + `includeScope:'*'`，平铺键 `ntFilter/ntSort/ntGroup` 由端点平铺别名解析）+ 应用钮（`notion-settings-apply`）+ drawer 级 `onSubmitSuccess` 五源刷新（drawer 不关闭）。排序区两行静态样本替换为 `ntSort` 单键 select（none/工作量升降/标题/日期，字符串码 `<property>:<dir>` 由端点解析）；filter note 更新为已接线注记；status 比较域裁定为枚举∪中文标签双形态（builder 选项标签 vs 记录枚举，与 updateRecord 同口径）。
> 6. **先红后绿证据**：交互 e2e 先行编写，对 HEAD 未接线 schema 跑红 = `7 failed | 1 passed`（内建锁定走查 08 即时绿，沿 P3b/P4b 口径）；接线后迭代转绿，终态 interactions `8 passed` + visual `6 passed` 零回归（visual 02 filter-note 断言随注记更新为「已接线」，其余断言零改动）。

- Item Types: `Proof | Fix | Decision`

- [x] Proof——先红后绿基线：本 Phase 全部接线 e2e 先行编写并跑红（对未接线行为断言失败；对既有内建行为的锁定断言允许即时绿，沿 P3b/P4b 口径），Fix 完成后转绿（红态 `7 failed | 1 passed`，见执行落字 6）
- [x] Fix——I5 搜索接线：`notion-search-input` 按 Phase 1 裁定机制参数化（输入 → scope → url 物化/内联过滤 → 自动刷新），输入即过滤可断言 + nt-filter-empty 空态锁定 + 清空恢复全量（终态机制见执行落字 2：submitOnChange + setValue 页面 scope 物化，e2e 01）
- [x] Fix——I8 新建行接线：分析篇 I8 全触发点集合覆盖——表底 `+ New`/右上 New/board 底部/gallery 空卡（Phase 2 内接线，testid 按 P5a 既有或补 `notion-create-record`）+ 日历 hover `+`（自绘网格，归 Phase 3 Decision 裁定）→ 接线触发点 openDialog + form（标题必填校验 nt-create-miss）→ `Notion__createRecord` → 刷新后新行可断言（插行位次按 Phase 1 裁定断言）（四处静态入口共享 dialog 全部接线，日历 hover `+` 归 Phase 3，e2e 02/03）
- [x] Fix——I6/I10 编辑链路接线：peek 属性编辑（side/center 双形态）字段接线 + 保存动作 → `Notion__updateRecord` → 会话态 → 关闭后行数据一致可断言（跨视图一致性：table 改值 → board/list 视图刷新后同步）；I6 表格单元格直编辑若实测无 schema 通道则显式裁决（编辑态收敛 peek form，矩阵深度归因 G-D 落字）（直编辑无通道维持裁决，编辑态收敛 peek form 五处全接，e2e 04/05）
- [x] Proof——I1 内建锁定强化：五视图 tab 切换分支可见性（P5a e2e 06 沿用）+ 每视图配置随动断言（切换后该视图 filter/sort/group 生效状态可观察，按 Phase 1 机制裁定口径）（interactions e2e 08 走查 + e2e 06 排序覆写随 tab 保持/他视图隔离）
- [x] Decision——I7 列头菜单条目逐项裁定：sort by this column（→ 参数化可接线候选）/ filter by（→ 同机制候选）接线与否；rename/换类型/隐藏/冻结/insert left-right（→ 动态列模型缺口显式裁决，归因 G-D 落字）（裁定：全条目维持静态——按列 sort/filter 为 View settings 已接线能力的重复入口，且列头菜单为 9 列静态复制体、label onClick 无列上下文参数通道，逐列硬编码属 schema 膨胀；动态列模型归 G-D。菜单注记文本已同步更新，9 处）
- [x] Decision——I12 条件配色裁定：静态样本维持 or visible/className 表达式动态化实测（G-F 证据素材）；N14 记录多选/批量候选裁定（`rowSelection` scope 契约在 Notion table 的适用性实测——右键菜单无原语的等价路径为 ⋮⋮/按钮面，Phase 内裁定接线深度）（I12：静态维持——mock 数据侧 `condRowClass` 已承载数据驱动条件配色（nt-cond-red/yellow 实测在库），settings 规则编辑器→className 映射无 schema 表达通道（G-F2 缺口），归因落字；N14：不启用 rowSelection/批量栏——Notion 原版 table 无常驻批量栏形态，记录级操作的按钮面等价路径已接线（peek 查看/编辑 + 复制链接语义模拟），右键/批量语义缺口的 G-B3 素材随 C2 回写）

Exit Criteria:

- [x] 搜索参数化（过滤/空态/恢复）与新建行链路 e2e 绿
- [x] peek 编辑保存链路（跨视图会话一致性）e2e 绿；I1 随动断言绿
- [x] I5/I6/I7/I8/I10/I12/N14 处置结论逐条落字本计划（含机制裁定注记）；既有 6 条初屏用例零回归

> **Phase 2 处置落字（Exit Criteria 3）**：I5＝接线锁定（submitOnChange + setValue 页面 scope → url 物化 dependsOn 自动刷新；输入即过滤/属性值命中/空态/清空恢复，e2e 01；即时通道机制修正见执行落字 2）；I8＝接线锁定（四处静态入口共享链路，必填拦截 + 表尾插行 + 默认值，e2e 02/03；行内聚焦标题子项归 G-D）；I6/I10＝接线锁定（编辑态收敛 peek form，五处 side/center 全接，保存 + 会话态跨视图一致 e2e 04、center 形态 + 复制链接语义模拟 e2e 05；单元格直编辑显式裁决 G-D 维持）；I1＝内建锁定强化（五分支走查 e2e 08 + 每视图配置覆写隔离与随动 e2e 06）；I7＝显式裁决静态维持（重复入口 + 无列参数通道，动态列模型归 G-D，注记 9 处更新）；I12＝显式裁决静态维持（数据侧条件配色在库，规则编辑器→className 通道归 G-F2）；N14＝显式裁决不启用批量（按钮面等价路径已接线，右键/批量缺口归 G-B3 素材）。

### Phase 3 - board + calendar/list 接线（I9 拖拽 / I11 group 切换 / I2·I13 裁决）

Status: completed
Targets: `page-schemas/notion-database.json`、`tests/e2e/`（同前裁定）

> **Phase 3 执行落字（2026-08-30 实测）**
>
> 1. **接线形态**：`notion-board-kanban` 移除 `draggable: false` 显式声明（renderer 内建开启恢复）+ `onCardMove` → ajax `Notion__moveCard`（payload `${cardId}`/`${toColumnId}`/`${toIndex}` → mock 契约 `{id, toColumn, toIndex}`，`card-`/`col-` 前缀容错）→ messages 成对（成功「卡片已移动」/失败「卡片移动失败」）+ `then`/`onError` 双路 `component:refresh:notion-source-board`；`notion-board-dnd-note` 注记更新为「拖拽已接线」，聚合条注记同步 P5b 裁定（board 读载荷即端点重算 → 计数/聚合随会话态更新，静态预计算退役）。
> 2. **I11 group 切换**：`notion-settings-group` select 选项裁定为 按状态/按分类/按负责人（**移除「无分组」**——board 恒有分组语义，none 值改由负责人分组承载第三形态；分析篇 board 行「按 select/status/person 分组列」对齐）→ 提交链路复用 Phase 2 settings 表单 apply（`Notion__updateViewConfig` patch.group → mock `buildNotionBoardData` 按会话分组属性重建列集 + `moveNotionCard` 解码对应属性值翻转）→ board 列集/计数随会话态更新（e2e 12：按分类 4 列 + 分类下拖拽 → table 分类 chip 翻转）。
> 3. **日历 hover `+` 裁定（Phase 2 移交项）**：**接线按钮面**——`notion-cal-add` 从 text 节点改为 container 载体（text renderer 无 onClick 分派面，实测源码确认），onClick openDialog 复用已接线 `notion-record-dialog`（与表底/右上/galleries/list 同一新建链路）；**日期预填显式裁决不接线**（dialog 复制体无逐格参数通道，且新建表单字段集为 P5a 裁剪清单，date 字段不进新建表单——落字归 G-D 素材）。e2e 13：hover 显 `+`（nt-cal-add reveal-group 计算透明度）→ 新建落库。
> 4. **I2 新建视图裁定：候选 ② 纯静态维持 + 显式裁决**——五视图分支为静态 schema，运行时新增视图无渲染分支可达（候选 ① 的「会话态记录 + 诚实降级 message」会造成「有记录无视图」的假语义，比静态 rail 更误导）；`notion-new-view-note` 注记更新为显式裁决措辞（类型清单静态 + 真实新建归 D1），归因 G-C，随 C2 回写 ⑥。
> 5. **I13 裁决维持**：视图 tab 拖拽重排/溢出收纳动态化/三态动态切换生效——原语缺口（tabs 无拖拽与动态 label 通道，G-C/G-B2 归因），`ntTabDisplay` 三态 select 与 `notion-tab-display-note` 静态样本维持（P5a 差异声明延续），e2e 14 锁定静态注记不回归。
> 6. **先红后绿证据**：拖拽/group/日历 e2e 先行编写（Phase 3 用例 09–14），对 Phase 2 后（拖拽未接线）状态跑红——09/10/12/13 在 `draggable: false` + 无 onCardMove + group 仅状态态下断言失败（红态实测含于全量首轮：`3 failed`（09/10/13）+ 11 passed）；接线后全绿 interactions `14 passed` + visual `6 passed` 零回归（visual 03 dnd-note 断言随注记更新，其余零改动）；schema 契约单测同步更新（`draggable` 不再为 false + `onCardMove` ajax 绑定锁定）。

- Item Types: `Proof | Fix | Decision`

- [x] Proof——先红后绿基线：拖拽与 group 切换 e2e 先行编写并跑红，Fix 后转绿（红态见执行落字 6）
- [x] Fix——I9 board 拖拽接线：移除 `draggable: false` 显式声明（renderer 内建开启）+ `onCardMove` → `Notion__moveCard` → 成功/失败 message 成对 + `then`/`onError` 双路 `component:refresh`（data-source 显式 id 已就位）→ 列分布/计数与聚合条随会话态更新可断言；失败分支卡片回原列（nt-move-miss）；`notion-board-dnd-note` 注记文本同步更新；拖拽后 table 视图分组值一致性断言（会话态跨视图可观察）；P4b 注册滞后 finding 引用——断言以数据一致性姿势锁定（e2e 09/10/11，lastMove 钩子数据一致性姿势沿 P4b）
- [x] Fix——I11 group 切换接线：View settings Group select → 按 Phase 1 裁定机制（updateViewConfig 会话态 + records 服务端按会话配置重分组，或 url 参数物化）→ board 列集随分组属性变化可断言（按 Phase 1 裁定机制：updateViewConfig 会话态 + 服务端重分组，选项裁定见执行落字 2，e2e 12）
- [x] Decision——I2 新建视图模拟深度裁定：候选 ①类型选择 dialog 提交 → 会话态记录 + 诚实降级 message（视图分支为静态 schema，新视图无渲染分支的边界落字）；②纯静态维持 + 视图集合静态缺口显式裁决归因 G-C——落字结论（裁定候选 ②，见执行落字 4）
- [x] Decision——不可模拟项显式裁决落字：I13 视图 tab 拖拽重排/溢出收纳/三态动态切换生效（原语缺口，G-C/G-B2 归因）；I9 calendar 拖改期子项（自绘网格无事件面）；日历 hover `+` 按钮面接线与否一并裁定（I13 维持显式裁决 + e2e 14 锁定；calendar 拖改期不模拟维持；日历 `+` 接线按钮面 + 日期预填不接线，见执行落字 3）

Exit Criteria:

- [x] board 拖拽跨列 → `Notion__moveCard` → 列分布/聚合更新 e2e 绿；失败分支可断言
- [x] group 切换 → board 列集变化 e2e 绿（按裁定机制）
- [x] I2/I9/I11/I13 处置结论落字（含缺口归因）；既有用例零回归

### Phase 4 - C2 回写、分析篇对照与自查收口

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`（§3 回写 ⑥）、`docs/analysis/ui-review/P1-reference-apps/notion-database.md`（§4.1 追加）、本计划

- Item Types: `Proof | Decision`

> **Phase 4 执行记录（2026-08-30）**
>
> 1. **C2 回写 ⑥** 已落 `C2-capability-gaps.md` §3 追加区，全部回写输入逐条可指认：G-C 终态实测（视图状态机可达面 + 不可达面三项、嵌套 filter 求值终判「服务端预应用可达/客户端公式不可达」、双层权限与 peek 联动维持结论）、P5a §7 候选 1 终态（个人视图偏好存储层：会话级 scope 模拟可达主语义，缺口维持归 D1）、候选 2 终态（board 列聚合端点动态化收口，列头原生聚合语义件缺口维持 kanban L2）、clipboard 第四例（`Notion__copyLink`）、自绘 calendar 无事件面注记（含 text 节点无 onClick 分派面通用姿势素材）、condition-builder 求值边界素材（`$formData` 域边界 + `includeScope:'*'` 载荷遮蔽坑）、**I5 scope 写入通道边界新证**（dialog 子 scope 写入对页面 dependsOn 不可见——与 P4b ⌘K 口径对齐为「同 scope 内 reactive、跨树须 setValue」）、kanban 拖拽本应用实测（注册滞后复现 + 数据一致性姿势维持）。
> 2. **分析篇对照**落 `notion-database.md` §4.1（I1–I14 十四行逐条对照 + §5 两行勘误：新建视图菜单「高→高（结构）/不可达（行为）」、右键/批量「中→按钮面等价路径已接线/批量不启用」）；其余行与预判一致或为形态注记，无矛盾行不动。
> 3. **AI 模板感自查＝通过**：搜索/新建（四处+日历 `+`）/peek 编辑与复制/拖拽/group 切换/排序/筛选全部有真实行为与反馈成对（interactions e2e 01–14）；数据经 mock 端点流动；静态 rail 类清单核对＝新建视图类型清单（I2 裁决注记）、I7 列头菜单条目（裁决注记 ×9）、I13 三态 select + tab-display-note（原语缺口注记）、cal-note 自绘注记、board 聚合注记（P5b 裁定措辞）——全部携带裁决注记，无"demo 占位"假按钮。
> 4. **样式契约自查＝通过**：`packages/` 零改动（`git diff --name-only -- packages/` 为空）；变更面 = schema 单页、mock 模块五件（split Decision 载体）、`notion-replica.css`（新增 `.nt-peek-edit` 一节，scope 专用类）、两 spec + 视觉证据 png、两分析篇 + C2 + roadmap + plan 本体——全部 In Scope；`_tmp/` 探针与转换脚本已清理。
> 5. **roadmap 状态核对**：Phase Status 区 P5b = `planned`（2026-08-30 review 通过转 active），`done` 待 closure audit 通过后随关闭编辑落 roadmap。

- [x] Proof——C2 追加回写 ⑥（roadmap Cross-Cutting 5，只追加不重开初版裁决）：G-C 终态实测（视图状态机模拟深度——tab+visible+viewConfig 参数化生效可达面、嵌套 filter 求值可行性终判、配置集双层权限/peek 联动结论）、P5a §7 候选 1（个人视图偏好存储层）与候选 2（board 列聚合计算）终态、clipboard 第四例（`Notion__copyLink`）、自绘 calendar 无事件面注记、condition-builder 求值边界素材、kanban 拖拽本应用实测注记——逐条可指认
- [x] Proof——分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b/P3b/P4b 先例追加进 `notion-database.md`）：§5 能力映射逐行复核，实测与预估不符处仅做事实勘误（无矛盾则不动）
- [x] Proof——AI 模板感自查（P1 README §4.2）：接线后无"demo 占位"按钮——搜索/新建/peek 编辑/拖拽/group 切换全部有真实行为与反馈成对；数据经 mock 端点流动；静态 rail 类清单核对（新建视图类型清单、I13 注记等）
- [x] Proof——样式契约自查（§4.3）：零 renderer 包改动；变更面核查 `git status --porcelain` 仅含 In Scope 文件；新 CSS 仅落 `notion-replica.css` scope 专用类
- [x] Proof——roadmap Phase Status 区 P5b 状态推进核对（`planned`，done 待 closure audit）

Exit Criteria:

- [x] C2 回写 ⑥ 含本计划全部回写输入（逐条可指认）
- [x] `notion-database.md` §4.1 对照节落字
- [x] 两维自查记录落字（通过/打回处置结论）
- [x] 变更面核查记录落字

## 交互清单处置表（N1–N14，对应分析篇 §4 I1–I14；终态 2026-08-30 执行落定）

> 起草期预登记处置方向；执行期按 Phase 落终态（接线锁定 / 内建锁定 / 显式裁决），无静默跳过。**全部 14 条已落终态**：接线锁定 9 条、内建锁定 2 条、显式裁决 6 条（部分条目复合）。

| #   | 交互（分析篇出处）                        | 预登记处置                                                | 落点                                                                                                                                       |
| --- | ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| N1  | I1 视图 tab 切换                          | **内建锁定（已强化断言）**                                | tabs scope + 每视图配置随动（interactions e2e 08 + 06 覆写隔离/随动）                                                                      |
| N2  | I2 新建视图                               | **显式裁决静态维持**（Phase 3 候选②）                     | 类型清单静态 + 注记落字（真实分支不可达，G-C；e2e 14）                                                                                     |
| N3  | I3 filter 构建器生效                      | **接线锁定**（混合机制 Phase 1 裁定）                     | builder → updateViewConfig 会话态 → 服务端嵌套求值（≤3 层）预应用（e2e 07；客户端公式姿势不可达归 G-C）                                    |
| N4  | I4 sort 面板生效                          | **接线锁定**（单键）                                      | ntSort select → 会话 sorts 覆写服务端预应用（e2e 06；多键拖改优先级子项归 G-D）                                                            |
| N5  | I5 搜索                                   | **接线锁定**（Phase 2）                                   | submitOnChange → keyword url 物化 + 空态/恢复（e2e 01）                                                                                    |
| N6  | I6 行内单元格编辑                         | **peek 编辑接线锁定 + 直编辑显式裁决**                    | 编辑态收敛 peek form（e2e 04/05）；单元格直编辑无通道归 G-D                                                                                |
| N7  | I7 属性列头菜单                           | **显式裁决静态维持**                                      | 9 处复制体无列参数通道 + 重复入口裁剪；动态列模型归 G-D（注记更新）                                                                        |
| N8  | I8 新建行插行                             | **接线锁定**（Phase 2）                                   | 四处入口共享 `Notion__createRecord` 链路 + 表尾插行（e2e 02/03）；日历 `+` 见 N9                                                           |
| N9  | I9 行/卡/列拖拽                           | **board 跨列接线锁定 + 行拖排序/calendar 拖改期显式裁决** | `draggable` 内建 + `onCardMove`（e2e 09/10/11）；行拖排序（G-D）、calendar 拖改期（自绘网格无事件面）不模拟；日历 `+` 按钮面接线（e2e 13） |
| N10 | I10 记录展开 peek                         | **接线锁定**（Phase 2）                                   | 只读展开（P5a）+ 属性编辑保存链路 + 复制链接语义模拟                                                                                       |
| N11 | I11 group by 切换                         | **接线锁定**（Phase 3）                                   | 会话 viewConfig + 服务端重分组 status/category/person（e2e 12）                                                                            |
| N12 | I12 条件配色                              | **显式裁决静态维持**                                      | 数据侧 condRowClass 已承载条件配色样本；规则编辑器→className 通道归 G-F2                                                                   |
| N13 | I13 视图 tab 定制（拖重排/溢出/三态生效） | **显式裁决不模拟**（原语缺口，G-C/G-B2 归因）             | C2 回写 ⑥；静态样本锁定（e2e 14）                                                                                                          |
| N14 | I14 记录右键/批量操作                     | **显式裁决不启用批量**                                    | rowSelection 可用但不启用（Notion 原版无批量栏形态）；按钮面等价路径（peek 编辑 + copyLink）已接线；右键/批量缺口归 G-B3 素材              |

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb05df864ffeBQsSWCYP7XeySM`
- Verdict: `pass`
- Rounds: 1
- Findings addressed: R1 `pass`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 裸 input scope 写入通道的 field-handlers 路径归属勘正（`packages/flux-react` → `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:213-224`，能力主张经审阅者 live 复核为真）；Minor-2 Phase 2 I8 触发点集合补全（补 board 底部/gallery 空卡 + 日历 hover `+` 归 Phase 3 Decision，与分析篇 I8 全触发点对齐）。审阅者并经 live 复核确认：全部行数口径（697/499/6066/364/237/707）、六个 data-source 显式 id、tabs scope 契约、`draggable:false` 无 `onCardMove`/`rowSelection`、三组 testid/name、get-only mock、kanban file:line 证据均准确。

## Closure Gates

- [x] 分析篇 §4 交互清单逐条处置完成（N1–N14 接线锁定/内建锁定/显式裁决，无静默跳过）→ 处置表终态落字（按主处置计：接线锁定 8 / 内建锁定 1 / 显式裁决 5；N6、N9 为「接线锁定 + 子项显式裁决」复合行）
- [x] 写端点全部先红后绿锁定（`notion-mock-backend.test.ts` 含新增写操作用例全绿）→ 红态 `6 failed | 294 passed`（pre-P5b 实现实测）→ `300 passed` 全绿
- [x] P5a Deferred 三项已收口（接线全谱主体落地；两 §7 候选裁定终态落字）→ 接线全谱见处置表；候选 1/2 终态见 Deferred 节执行期注记 + C2 回写 ⑥
- [x] C2 追加回写 ⑥ 完成（不重开初版裁决）；分析篇 §4.1 对照落字
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 In Scope 清单）→ `git diff --name-only -- packages/` 为空
- [x] `showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰 → 697 / 463（零改动）
- [x] AI 模板感治理与样式契约自查完成并落字 → Phase 4 执行记录 3/4
- [x] roadmap Phase Status 区 P5b 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [x] 受影响的 owner docs 已同步：分析篇 §4.1 对照 + 仅事实勘误（C2 追加区为 In Scope 义务）→ §4.1 十四行对照 + §5 两行勘误
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（fresh session `ses_fafff478cffeG21SJs0O0vQanH` R1 **APPROVED** 零 Blocker/零 Major，3 Minor 记录性修正已随收口落字：wc 终值刷新 427、处置主计数口径 8/1/5+2 复合、新建链路复制体 5 份措辞澄清）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test` → 37 test files 全绿（playground 31 files / 300 tests 含新增 7 条写操作与求值用例）
- [x] 目标 e2e：`npx playwright test tests/e2e/notion-replica-visual.spec.ts`（或拆分后的 interactions spec）全绿 → visual 6/6 + interactions 14/14 = 20/20
- [x] `pnpm check` → exit 0 零新增红（oversized 仅既有 exempt i18n locales；notion 拆分模块全部 ≤500）

## Closure

- Closure Verdict: `APPROVED`
- Reviewer / Agent: independent sub-agent fresh session `ses_fafff478cffeG21SJs0O0vQanH`
- Rounds: 1
- Findings addressed: R1 `APPROVED`（零 Blocker/零 Major，3 Minor 全部随收口修正落字：①`mock-backend-notion-writes.ts` wc 终值 401→427 刷新（Phase 2/3 扩展后）；②处置表主计数口径修正为「接线锁定 8 / 内建锁定 1 / 显式裁决 5，N6/N9 复合」；③新建链路「四处入口」与「schema 复制体 5 份」措辞澄清）。审计独立复核：plan 一致性、变更面（packages/ 零改动、In Scope 全符合）、schema 接线声明（kanban/peek×5/record×5/settings/搜索 dependsOn×5）、C2 回写 ⑥ 七项输入、分析篇 §4.1 十四行对照、N1–N14 终态、mock 单测 300 绿、目标 e2e 20/20 绿、oversized 零 notion 命中。
- 全量验证 full-green：`pnpm typecheck` / `pnpm build` / `pnpm lint` 绿（turbo cached）；`pnpm test` 37 test files 全绿（playground 31 files / 300 tests）；`pnpm check` exit 0 零新增红；目标 e2e visual 6/6 + interactions 14/14 = 20/20 全绿。

## Closure record（执行摘要）

- 产出：`Notion__` mock 5 端点（4 post 写 + 1 get copyLink 语义载体）+ 会话态（records 数组 + per-view 覆写表）+ opt-in e2e 钩子；mock 模块按 linear 先例拆分五件（主 264 / types 119 / records 175 / views 173 / writes 427，全部 ≤500）；单页 schema 交互接线（搜索参数化、新建链路 5 入口、peek 编辑×5 + copyLink、settings 应用链（filter/sort/group）、board 拖拽、日历 `+`）；`notion-replica.css` +11 行（`.nt-peek-edit`）；mock 单测 22 条（15→22，+7）；交互 e2e 14 条（新 spec）；visual e2e 6 条零回归（2 断言随注记措辞更新）；C2 回写 ⑥ + 分析篇 §4.1 对照与 §5 两行勘误。
- 交互清单处置：N1–N14 全部落终态（接线锁定 8 / 内建锁定 1 / 显式裁决 5，N6/N9 复合），无静默跳过；P5a Deferred 三项收口（接线全谱 + 两候选终态）。

## Deferred But Adjudicated

> 本节为起草期预登记；执行期新撞见的裁决随 Phase 落字于此。

### 视图 tab 拖拽重排/溢出收纳动态化/三态动态切换生效（I13 全谱）+ 日历拖拽改期 + "Save for everyone" 双层权限真实化

- Classification: `watch-only residual`
- **执行期终态（2026-08-30）**：维持不模拟——tabs 原语缺口复核成立（e2e 14 锁定静态注记）；calendar 拖改期自绘网格无事件面维持（hover `+` 已按钮面接线，e2e 13）；双层权限真实化需 schema 外存储层。C2 回写 ⑥ 已登记终态证据。
- Why Not Blocking Closure: tabs 无拖拽重排与动态 label 通道、动态 CSS 类切换无 className 表达式绑定（G-F2 同根）、自绘 calendar 无事件面、双层权限需 schema 外偏好/权限存储层——均属 L2/L3/L4 能力候选而非本复刻页契约缺陷；tab 点击切换与静态三态样本（P5a）已承载主语义，模板感治理底线不破
- Successor Required: `yes`
- Successor Path: C2 回写 ⑥ 登记（G-C/G-B2 终态证据），产品化归 D1 流程

### 个人视图偏好存储层（activeViewId/display 三态"仅本人生效"配置，P5a §7 候选 1）

- Classification: `optimization candidate`
- **执行期终态（2026-08-30）**：会话级 scope 模拟可达主语义已实测——activeViewId 由 tabs `valueStatePath` 写页面 scope（I1 随动 e2e 06/08 锁定）；跨会话持久化缺口维持。C2 回写 ⑥ 裁定终态已落。
- Why Not Blocking Closure: 分析篇 §5 L4 风险判定为 schema 外偏好存储层缺口（G-C 伴生），P5a 以静态配置集数据预载模拟，不影响"多视图静态复刻"结果面成立
- Successor Required: `yes`
- Successor Path: 本计划 Phase 4 C2 回写 ⑥ 裁定终态（已完成：缺口维持，产品化归 D1）

### board 列聚合计算动态语义（Count/Sum/Avg/Percent，P5a §7 候选 2）

- Classification: `optimization candidate`
- **执行期终态（2026-08-30）**：mock 端点动态化收口——board 读载荷即 `buildNotionBoardData` 重算（计数/Count/Percent 聚合随会话态刷新，e2e 09/12 锁定），P5a mock 预计算静态条退役；列头原生聚合语义件（Sum/Avg/Min/Max + 列头内嵌形态）缺口维持 kanban L2 候选。C2 回写 ⑥ 裁定终态已落。
- Why Not Blocking Closure: kanban 语义增强候选（分析篇 §7），P5a 以 mock 预计算静态值承载列头聚合形态，不影响 board 视图结构复刻成立
- Successor Required: `yes`
- Successor Path: 本计划 Phase 4 C2 回写 ⑥ 裁定终态（已完成：端点动态化 + 语义件缺口维持，归 D1）

## Non-Blocking Follow-ups

- `Notion__` mock 数据集若在接线中发现状态样本不足（编辑中间态/插入行/拖拽 ghost），在 `mock-backend-notion.ts`（或其拆分模块）内补样本属本计划 Fix 范围（P5a Follow-up 预授权沿袭）；超出数据集语义的新端点需求走 C2/D1 评估
- `tests/e2e/notion-replica-visual.spec.ts` 现 364 行：交互用例拆分后若总行数超 ~600 行按 P1 README §2.2 规则拆分（visual 保留初屏，interactions 承载交互），沿 P4b interactions spec 先例
- `--nt-*` 变量架构共享复刻基建抽取（P3a/P4a/P5a follow-up 沿袭）：不入本计划
