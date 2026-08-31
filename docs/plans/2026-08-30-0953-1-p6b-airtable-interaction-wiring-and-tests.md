# P6b Airtable grid 网格编辑复刻 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P6b. Airtable grid 网格编辑复刻 — 交互接线与测试
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P6b 条目 + Phase Details P6 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架与拆分规则、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/airtable-grid.md` §4 交互清单（§4.1 编辑器矩阵 / §4.2 列头菜单·行操作·行高·分组 / §4.3 键盘导航全表）+ §7 转 C2 候选；P6a plan「G-D 静态实测结论（P6a 实测）」六节（P6b 接线落点与显式裁决清单）
> Related: `docs/plans/2026-08-30-0614-2-p6a-airtable-grid-static-replica.md`（P6a，completed——本计划全部静态落点、差异声明 D1–D3 与 G-D 六节结论来源，P6b 直接采用）；`docs/plans/2026-08-30-0614-1-p5b-notion-interaction-wiring-and-tests.md`（Pi-b 最近先例：搜索终态姿势、写端点会话态、mock 模块拆分、opt-in e2e 钩子、includeScope 键遮蔽坑、C2 回写 ⑥）；`docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md`（Pi-b 先例：交互清单逐条处置表、先红后绿、C2 回写 ⑤）
> 执行顺序约束：roadmap 实线 `P6a → P6b` 已满足（P6a `done`，2026-08-30 closure audit 通过）；roadmap 虚线 `P6b -.-> P7a`——P7a plan 已同批起草（`docs/plans/2026-08-30-0953-2-p7a-stripe-dashboard-static-replica.md`，draft），其在 P6b `done` 前不得开始执行；两计划无内容冲突，`showcase-env.ts` 与 roadmap Phase Status 区为顺序共写面（P7a 启动时按其 baseline 要求 live 复核）

## Purpose

消费 P6a 已落盘的单页 `airtable-grid` 静态复刻、分析篇 §4 交互清单（§4.1–§4.3）与 P6a「G-D 静态实测结论」接线落点清单，把 Pi-b 段义务收口：补全 `Airtable__` mock 写端点（record 保存/新建插行等，终态集合 Phase 1 裁定）、接线可模拟交互（搜索参数化、列头菜单排序生效、分组切换生效、行高档切换生效候选、record modal 编辑保存与上一条/下一条导航、底部插行），对不可模拟项（键盘双态全谱、fill handle/范围选区、列头菜单动态列模型、Space 键盘展开等）逐条显式裁决，分析篇 §4 逐条 e2e 先红后绿锁定，closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2（回写 ⑦：G-D 终态实测 + G-B2/G-B3 键盘全谱裁决 + 分析篇 §7 两候选终态 + P6a Deferred 三项终态），并把「预测缺口 vs 实测缺口」对照记入应用分析篇。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `6e69351be`）：

- P6a 全部静态产物在库（wc 实测）：单页 `apps/playground/src/complex-pages/page-schemas/airtable-grid.json`（**3119 行**，category `app-replica` 已注册）；`apps/playground/src/airtable-replica/airtable-replica.css`（**725 行**，`--at-*` 令牌声明于 `.at-root, .at-dialog` 双作用域，light-only）；mock 四件 `shared/mock-backend-airtable.ts`（**123 行**，入口 + get-only fetcher 分支）/`-types.ts`（**191 行**）/`-records.ts`（**243 行**，33 行数据集 + 行投影 + 过滤/分页/summary + 字段元数据投影）/`-views.ts`（**48 行**，group 参数化分组计算）；`shared/showcase-env.ts`（**699 行**（wc）、门禁切分口径 **700 行**——双口径零余量贴线，`Airtable__` 委托经 `replicaBranches` 数组条目已就位）；`tests/e2e/airtable-replica-visual.spec.ts`（**336 行**，6 条初屏/浮层走查用例全绿）；`__tests__/airtable-mock-backend.test.ts`（**236 行**，13 条单测）。
- **mock 读端点 2 个全部 get-only、零写端点**：`Airtable__records`（`perPage` 分页、`group=category` 参数化分组 + 组内 summary 预计算、`keyword` 过滤助手已在库（`filterAirtableRecords`，mock-backend-airtable-records.ts:188）、`view` 兜底）、`Airtable__record?id=`（modal 取数 + `prevId/nextId` 载荷 + miss 占位兜底）。排序助手 `sortAirtableRecords` 尚不存在（分析篇 §4.2 sort A→Z/Z→A 接线时需补，属本计划 Fix 范围）。
- **schema 静态面实测（live 证据）**：
  - 两个 data-source 节点**均已有显式 id**：`airtable-source-grid`（name `gridData`，url `/r/Airtable__records?perPage=100`）、`airtable-source-group`（name `groupData`，url `/r/Airtable__records?group=category`）——`component:refresh` 跨树刷新载体就位（P4b/P5b 先例姿势），但两源 url 均为固定串，无 keyword/sort/group 切换参数物化，零 `dependsOn`。
  - 动作面共 8 处：4 `openDialog`（record modal ×1 + title/category/amount 三列头菜单）+ 1 `openDrawer`（Hide fields）+ 3 `ajax`（loadAction）；**零 `submitForm`/`setValue`/`refreshSource`/`navigate`**。
  - 视图栏五控件中 `airtable-view-pill-grid`（选中态样本）与 `airtable-hide-fields-trigger`（真实 openDrawer）已就位；`airtable-rowheight-control`（四档分段控件形态）、`airtable-search-entry`、`airtable-filter-entry` **零动作静态形态**（P6a D2④ 裁定，接线归本计划）。
  - 列头菜单 dialog ×3（八条目 + 型别清单只读形态）全部条目零生效；Hide fields drawer 20 字段行 toggle 零生效；record modal form（loadAction 只读四分区）零编辑、`airtable-record-prev/next` 导航形态按钮零接线（P6a D2③：嵌套 openDialog 堆叠通道实测存在，静态边界不接线）；`airtable-grid-new-row` 底部插行形态零动作。
- **接线能力 live 实测（先例证据，Phase 1 Decision 输入）**：
  1. **dialog 内裸 input 不达页面 scope（P5b Phase 2 实测修正）**：裸 input 键入写 dialog 子 scope 自有 store，页面级 data-source `dependsOn` 观察不到——搜索接线必须沿 P5b 终态姿势：dialog 内包 `form`（`submitScope: 'surface'` + `submitOnChange` + `submitAction: setValue(path, value)` 写页面 scope）→ url 模板参数物化 + `dependsOn` 自动刷新。
  2. **写端点会话态模式在库**：工厂闭包持有数据集 + clone，post 修改 in-memory 会话库，同 session 跨页可观察（antdpro/cal/linear/notion 四 slug 先例）；opt-in e2e 钩子 `__linearTestHooks`/`__notionTestHooks`（端点计数 + 强制 miss + 载荷观察，生产 no-op）先例可直接照搬为 `__airtableEndpointCalls`/`__airtableTestHooks`。
  3. **动作词汇无键盘序列/修饰键/剪贴板通道**（C2 回写 ③/④/⑤ 三例同源）→ 键盘全谱（P6a G-D §4 十五键位清单）预期逐键位显式裁决；其中 P6a 初判「Space 展开记录可模拟（行选中 + keydown→openDialog）」须 Phase 内实测 table 行是否存在 keydown 事件通道——无通道则按 P5b I13 同类口径显式裁决，禁止 hack 绕道。
  4. **includeScope 键遮蔽坑（P5b 实测教训）**：`includeScope: '*'` 会把 loadAction 载入的整条记录合并进请求体、原始键遮蔽编辑值——record modal 编辑保存的请求契约（patch 键规范 / 编辑面规范键 / mock 侧优先级）Phase 1 裁定时必须预判该坑。
  5. **列显隐生效边界**：`table` 的 `columns` 为 schema 静态声明；P5b `updateViewConfig` 服务端预应用先例可达「数据过滤」，不可达「schema 列结构变更」——候选实测点：`columns[].visible` 表达式绑定会话隐藏集（`fields` 载荷已在 drawer 流动）是否生效；不可达则显式裁决 G-D 列模型缺口（P6a G-D §5 口径维持）。
  6. **表达式 className 机制可用（P6a 实测）**：选中单元格蓝框样本 `${id === 'AT-101' ? 'at-cell-selected' : ''}` 证实表达式 className 可承载——行高切换候选路径 = 分段控件 onClick `setValue` 写 scope + 密度行 className 表达式绑定档位变量；控件是否可挂 `onClick: setValue`、表达式在行级 className 求值时机，Phase 内实测裁定（G-E/G-F2「交互态驱动缺口」的实测素材）。
  7. **分组/排序生效机制候选**：`group=` 参数已参数化（`-views.ts` 支持）——候选 ①url 参数物化（`group=${atGroupBy}`/`sort=` 模板 + `dependsOn`，P3b slots 先例）②P5b `updateViewConfig` 会话态 + 服务端预应用变体；Phase 1 裁定。
  8. **toast 生命周期**：跳转型动作链 `messages.success` 存活 <100ms，需 `control: { debounce: 1200 }`（回写 ③/④/⑤ 三例先例；本计划如出现跳转链沿用）。
- **P6a Deferred 移交项（本计划收口义务）**：
  1. **交互接线全谱**（P6a Deferred #1：单元格编辑提交/插行/record 保存/列头菜单动作生效/分组与行高切换生效，Successor Path = 本计划）——本计划主体；
  2. **键盘双态模型/fill handle/范围选区/⌘ 多选/Space 展开记录**（P6a Deferred #2，G-B2/G-B3 缺口全谱）——本计划逐键位显式裁决 + C2 回写登记；
  3. **rating 原语/collaborator 选人原语/grid 分组聚合语义/范围选区+fill handle 编辑模型归属**（P6a Deferred #3 + 分析篇 §7 两候选：grid 分组聚合语义并入 G-D 或加行、范围选区+fill handle 超出 G-B3 语义的归属判断）——本计划 C2 回写一并处理。
- **数据样本可扩展通道**：P6a Non-Blocking Follow-up 预授权——接线中发现状态样本不足（编辑中间态/插行后分页边界/prev-next 首尾行等），在 `mock-backend-airtable*.ts` 内补样本属本计划 Fix 范围。
- **治理线**：`showcase-env.ts` 699/700 双口径**零余量贴线**——新增写端点分支体必须全部下沉 `mock-backend-airtable*.ts`，showcase-env **预期零改动**（`Airtable__` 数组条目已在 P6a 就位）；若实测确需胶水行，必须先做等价余量整理（零行为变化的行合并/压缩）并保持总行数 ≤700 双口径，落字记录；`mock-backend.ts`（463 行）零触碰。写操作模块落点：追加进 `-records.ts`（243 行）或新开 `-writes.ts`，新文件与既有文件全部 ≤500 WARN 线（超载按 linear/notion 实体模块先例拆分，Phase 1 Decision 裁定组织形态并记录拆分后行数，禁止以未登记 oversized WARN 为代价硬塞）。
- roadmap Cross-Cutting 5：Pi-b closure 必须以追加方式回写 C2（回写 ⑦，不重开初版裁决）——本计划携带的回写输入：G-D 终态实测（接线后底座承载度复核）、G-B2/G-B3 键盘十五键位终态表、分析篇 §7 两候选终态、P6a Deferred 三项终态、素材行（表达式 className 状态驱动实测、columns visible 表达式实测、对话框堆叠通道实测——若与既有回写口径有出入须落字）。

## Goals

- mock 写端点补全并先红后绿锁定（终态集合 Phase 1 Decision 裁定，候选：`Airtable__updateRecord`（record modal 编辑保存，patch 契约含 includeScope 遮蔽坑对策）、`Airtable__createRecord`（底部插行，id 生成/默认值/插行位次裁定）、（视生效机制裁定可选）`Airtable__updateViewConfig`（排序/分组/显隐会话态——若走 url 参数物化则不需要）——全部沿 P2b/P3b/P4b/P5b 写端点会话态先例；不发明分析篇 §4 清单外端点）。
- 分析篇 §4 交互清单逐条处置落字（本计划处置表 A1–A16，覆盖 §4.1 编辑器矩阵/§4.2 列头菜单·行操作·行高·分组/§4.3 键盘全表）：每条「接线锁定 / 内建锁定 / 显式裁决」终态落字，Pi-b 档位 = `必须自动化`（P1 README §4.1），每条「接线锁定/内建锁定」项 ≥1 条先红后绿 e2e；「显式裁决」项落字缺口归因（G-D/G-B2/G-B3/G-E）不构成档位违反（沿 P3b I15/P4b L/P5b N 口径）。
- 搜索参数化生效（⌘F/搜索入口 → keyword url 物化，沿 P5b 终态姿势）；排序 A→Z/Z→A 与分组切换生效机制 Phase 1 裁定落地；行高四档切换生效候选实测裁定（可达则接线锁定，不可达则显式裁决为 G-E 证据）。
- record modal 编辑链路（保存 → 会话库 → 网格/summary 随动）+ 上一条/下一条导航接线（嵌套 openDialog 堆叠 vs dialog 内数据重载通道，Phase 内实测裁定）；底部插行 → `createRecord`（P5b I8 新建链路先例：required 校验拦截 + `onSubmitSuccess` 刷新）。
- P6a Deferred 三项收口：接线全谱主体落地；键盘全谱与两个 §7 候选在本计划内显式裁决终态并随 C2 回写。
- closure 时完成 C2 追加回写（回写 ⑦）+ 分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b/P3b/P4b/P5b 先例追加进 `airtable-grid.md`）。
- 全量验证 full-green（typecheck/build/lint/test + 目标 e2e + `pnpm check` 零新红）。

## Non-Goals

- 不改 `packages/` 下任何 renderer/ui/runtime 代码；键盘双态原语（Enter/F2、方向键导航、⇧ 选区、⌘ 多选）、fill handle 等差填充、剪贴板通道、collaborator 选人原语、rating 原语、grid 分组聚合语义件、列 schema 动态变更语义（动态增删列/换型别生效）、密度档语义字段、popover 原语等产品化归 D1 流程。
- 不新增 schema 页面文件（P6a D1 单页裁定维持）；不做暗色适配（P6a 差异声明 light-only 维持）。
- 不实现以下项（显式裁决，禁止 hack 绕道）：单元格原位编辑与同格双态（导航态/编辑态空间分离近似维持，P6a G-D §2 口径）；fill handle/范围选区/⌘C·X·V/⌘Z·Y（G-B3/协同裁剪）；列头菜单「编辑字段/换型别/向左向右插入/删除字段」动态列模型生效（G-D 列菜单缺口）；Linked record 搜索选记录浮层与 Button 字段动作（P6a 裁剪清单「P6b 动作域」项在本计划处置表中显式裁决——若 Phase 1 实测发现低成本可模拟路径（如 select 远程源），可升级为接线锁定并落字，否则维持裁决）；⌘⇧>/< 键盘绑定（按钮接线可达，键盘绑定无通道）。
- 不接线 `linear-*`/`cal-*`/`antdpro-*`/`notion-*` 等其他 slug 页面；不触碰 `mock-backend.ts` 与其他 slug mock 模块。
- 不复制任何 Airtable 品牌资产；产出界面维持零 "Airtable" 名称与商标（P6a 差异声明延续）。
- 不重新评审 R1 分数、不做 P6 名单变更、不重开 C2 初版裁决表。

## Scope

### In Scope

- `apps/playground/src/complex-pages/shared/mock-backend-airtable.ts` 及其拆分模块 `-types.ts`/`-records.ts`/`-views.ts`（追加写操作 + 会话态 + 排序/过滤助手扩展；超载则按 Decision 新开 `-writes.ts` 等实体模块）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（预期零改动；如需胶水须先等价余量整理且总行数 ≤700 双口径）
- `apps/playground/src/complex-pages/page-schemas/airtable-grid.json`（仅既有单页内接线：动作声明/参数化 url/`dependsOn`/visible·disabled·className 表达式/补 testid——不新增页面文件）
- `apps/playground/src/airtable-replica/airtable-replica.css`（仅接线必需的形态类补充，如批量态/落点指示；scope 专用类）
- `apps/playground/src/complex-pages/__tests__/airtable-mock-backend.test.ts`（写操作单测）
- `tests/e2e/airtable-replica-visual.spec.ts`（追加交互用例；现 336 行 + 预估交互用例体量，超 ~500–600 行则按 P1 README §2.2 拆分规则新建 `tests/e2e/airtable-replica-interactions.spec.ts` 承载交互用例——沿 P4b/P5b 先例，拆分与否 Phase 2 落字）
- `docs/analysis/ui-review/C2-capability-gaps.md`（§3 回写 ⑦ 追加，closure 时）
- `docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`（仅追加 §4.1「预测 vs 实测」对照与事实勘误）
- roadmap Phase Status 区 P6b `todo`→`planned`（draft review 通过后）；closure audit 通过后 `planned`→`done`

### Out Of Scope

- `packages/` 全部代码；`tests/e2e/` 中非本 spec 的文件；`docs/analysis/` 既有文档的结构性改写；`mock-backend.ts`；`mock-backend-antdpro.ts`/`mock-backend-cal.ts`/`mock-backend-linear*.ts`/`mock-backend-notion*.ts`；新增 playground schema 页面；新 CSS 文件（仅既有 `airtable-replica.css` 内追加）。

## Failure Paths

> 涉及写端点与交互状态机，列最小集（`at-` 前缀沿 P6a 惯例；读路径 at-records-miss/at-view-unknown/at-group-unknown/at-record-miss 已在 P6a 落字并锁定，不重复）。

| 可测场景编号      | 触发                                                | 行为                                                     | 可重试 | 用户可见表现                         |
| ----------------- | --------------------------------------------------- | -------------------------------------------------------- | ------ | ------------------------------------ |
| at-update-miss    | updateRecord 的 id 无匹配                           | 失败分支，会话库不变化                                   | 是     | message 错误提示，modal/网格数据不变 |
| at-create-miss    | 新建缺必填主字段（title）                           | 不发写请求（前端校验拦截）                               | 是     | 字段红环 + 错误文案                  |
| at-sort-unknown   | sort 参数非枚举字段/方向                            | 返回原序兜底                                             | 是     | 默认顺序，不崩                       |
| at-search-empty   | keyword 参数无匹配记录                              | 端点返回空数组                                           | 是     | 网格空态文案，不报错                 |
| at-write-readonly | 对只读字段（autoNo/createdAt/modifiedAt）提交编辑值 | 端点拒绝该键或忽略（Phase 1 契约裁定），会话库对应键不变 | 是     | 只读列灰显维持                       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档：分析篇 §4 交互清单逐条有 e2e 断言，交互契约无一豁免；先红后绿——新接线动作的 e2e 在接线前先断言失败，或对既有内建行为补锁定断言）。档位口径注记（沿 P3b/P4b/P5b）：「逐条有断言、无一豁免」指不允许**未处置的静默跳过**；处置表 A1–A16 中显式裁决为「缺口不模拟」的条目属「逐条有处置」，不构成对档位的违反。最低证明：`airtable-mock-backend.test.ts` 写操作单测全绿 + 处置表中每条「接线锁定/内建锁定」项 ≥1 条程序化 e2e 断言（testid 可见性/数据变化/会话态跨源一致/getComputedStyle；截图仅视觉附件）。

## Execution Plan

> 顺序 Phase。Phase 1 写端点基座与生效机制裁定先行（后续接线全部依赖）；Phase 2–3 按区块接线；Phase 4 回写与自查收口。

### Phase 1 - mock 写端点基座与生效机制裁定（先红后绿）

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-airtable*.ts`、`shared/showcase-env.ts`（预期零改动）、`__tests__/airtable-mock-backend.test.ts`

> **Phase 1 Decision 落字（2026-08-30 执行实测）**
>
> 1. **写端点契约终态**（post 全部 `status:0` 成功 / `status:1` 失败，失败体 `{ok:false,error}`；`updateViewConfig` **不设立**——排序/分组裁定走 url 参数物化（见注记 2），无会话配置态需求）：
>    - `Airtable__updateRecord`：`{id, patch:{title?|notes?|category?|tags?|date?|amount?|score?|progress?|done?|email?|site?|phone?|durationSeconds?|rating?|barcode?}}`；平铺顶层 patch 键（form `includeScope:'*'` 别名）等价接受；**`atEdit*` 编辑面规范键优先于同名载荷键**（`includeScope:'*'` 会把 loadAction 载入的整条记录合并进请求体、原始键遮蔽编辑值——P5b `ntPeek*` 同坑同解，单测锁定）；字段校验：category ∈ 4 枚举标签、tags ∈ 6 标签数组、date `YYYY-MM-DD`、progress 0–1、rating 整数 1–5、done boolean、amount/score/durationSeconds 非负数、email 含 `@`；**只读键（autoNo/createdAt/modifiedAt）一律忽略**（at-write-readonly：端点忽略该键、会话库对应键不变；全部为只读键的有效 patch 为空 → `empty patch` 失败）；命中即改会话库并 bump `modifiedAt`（stamp `2026-08-30 14:00` 确定性样本）；无匹配/`forceMiss` 钩子 → 失败（at-update-miss）。
>    - `Airtable__createRecord`：`{title, category?|date?|amount?|…}` → 生成 `AT-{max+1}`（33 行种子库下首个为 `AT-134`）入会话库；**插行位次 = 会话库表尾**（grid total +1、keyword 检索可达、分组源组内计数 +1）；未指定字段取默认（分类=需求评审、标签=[客户端]、日期=2026-09-15、预算=1000、工作量=3、完成度=0、已交付=false、负责人=文清鹤、rating=3、barcode `AT-8800-{5位序号}` 满足条码格式校验、autoNo=行序）；空/缺 title 或非法字段 → 失败（at-create-miss，schema 侧 required 先拦）。
> 2. **搜索/排序/分组/行高生效机制裁定（A1/A5/A8/A9）：候选 ① url 参数物化（A1/A5/A8）+ 候选 ③ className 表达式状态驱动（A9）**。
>    - **A1 搜索 = 候选①**：搜索浮层 dialog 内 form（`submitScope:'surface'` + `submitOnChange` + `submitAction: setValue('atSearchKeyword')`，P5b 终态姿势——裸 input 写 dialog 子 scope 不达页面 dependsOn）→ `airtable-source-grid` url 追加 `keyword=${atSearchKeyword ?? ''}` + `dependsOn:['atSearchKeyword']`；mock keyword 匹配域从「标题+说明+分类+id+负责人」扩展为「+标签+邮箱」（分析篇"匹配标题+属性值"语义对齐，Baseline 数据样本预授权）。断言口径：输入即过滤（行数变化）+ at-search-empty 空态文案 + 清空恢复全量 + 端点计数。
>    - **A5 排序 = 候选①**：列头菜单「排序 A→Z/Z→A」条目以 **mini-form 载体**接线（dialog 子 scope 内 setValue 不可达页面 dependsOn——P5b 实测教训；form `submitScope:'surface'` + `submitAction: setValue('atSortKey', '<field>:<asc|desc>')`）→ grid url 追加 `sort=${atSortKey ?? ''}` + `dependsOn:['atSortKey']`；mock `sortAirtableRecords(rows, sort)` 按裁剪清单全字段 accessor 表排序（category 按枚举序、数值列数值比较、其余 localeCompare zh）；**未知字段/方向 → 原序兜底**（at-sort-unknown）。断言口径：点排序条目后网格首行变化可观察。其余 17 列入口形态菜单不批量接线（无菜单 dialog 载体，见 Phase 2 处置表 A5 行），但端点 `sort=` 参数对任意字段可达（落字 Phase 2）。
>    - **A8 分组 = 候选①**：视图栏新增分组切换控件（page body 域内 onClick `setValue('atGroupBy')`，非 dialog 子 scope——page body 域 setValue 直写页面 scope，P4b 批量栏同域先例）→ `airtable-source-group` url 改 `group=${atGroupBy ?? 'category'}` + `dependsOn:['atGroupBy']`；`-views.ts` `groupAirtableRecords(rows, field)` 泛化为 category（枚举标签+色 chip）/owner（协作者名+人像色）/done（已交付绿/未交付灰）三字段，组内计数/金额/交付 summary 全随动；**未知字段 → 平铺兜底维持**（at-group-unknown）。断言口径：切分组后组头集合与计数变化可观察；写操作后组头计数随会话刷新。
>    - **A9 行高 = 候选③ className 表达式状态驱动**：`airtable-rowheight-control` 四档分段控件（page body 域容器 onClick `setValue('atRowDensity', 'short|medium|tall|extra')`）→ 网格 wrapper container className 表达式 `${'at-density-live-' + (atRowDensity ?? 'short')}` → CSS `.at-density-live-*` 覆写 `[data-slot='table-row']` 行高（复用既有 `--at-row-*` 令牌）；分段控件选中态同步表达式 className。断言口径：切档后网格行 getComputedStyle height 变化 + 选中态类变化。**求值时机风险已识别**：静态节点 className 表达式对 scope 变量的响应性以 e2e 实测裁决——不可达则显式裁决 G-E 证据（Phase 2 落终态）。
> 3. **record modal 编辑/prev-next 通道裁定（A11 = A11a + A11b）**：
>    - **A11a 编辑保存**：modal form（已挂 loadAction `Airtable__record?id=`）追加**编辑区**（15 字段可编辑子集 = P6a 裁剪清单"text/long text/select/multi-select/date/number/currency/percent/checkbox/email/url/phone/duration/rating 近似/barcode 串"全集；字段 name 用 `atEdit*` 规范键、`value` 绑 loadAction 数据回显；只读三字段维持只读灰显、owner/attachments 不进编辑子集——collaborator 选人/附件上传原语缺口，Phase 3 落字）+ 保存钮（submitForm）→ `submitScope:'surface'` + `submitAction: ajax Airtable__updateRecord`（`includeScope:'*'` + `data:{id}`）→ dialog `closeOnSubmit` + `onSubmitSuccess` 双源 `component:refresh`。断言口径：modal 内编辑 → 保存 → toast → 网格对应行随动 → summary 随动 → 跨源一致（group 源刷新后同值）。
>    - **A11b prev/next 导航 = 候选① 嵌套 openDialog（堆叠通道，P6a 实测存在）**：`airtable-record-prev/next` 容器 onClick `openDialog` 复用同一 modal schema，`data:{id:'${prevId}'}`/`data:{id:'${nextId}'}` 载荷驱动重取（prevId/nextId 已在 record 载荷）；**首尾行边界 = prevId/nextId 为 undefined 时按钮 className 表达式加 `at-btn-disabled`（pointer-events:none 视觉禁用）**；⌘⇧>/< 键盘绑定无通道（显式裁决落字 Phase 3）。堆叠代价落字：每次导航浮层栈 +1，Esc 逐层退出——为 modal 内数据重载通道（候选②，form refresh 无 action 词汇）不可达下的已证通道。断言口径：next 后新浮层显示下一条标题 + 首行 prev 禁用。
> 4. **mock 模块组织裁定：新开 `-writes.ts`（P5b 先例）**——写操作核心 + patch 解析落新模块（终态 198 行）；`sortAirtableRecords`/`airtableWriteStamp`/过滤域扩展落 `-records.ts`（243→295 行）；分组泛化落 `-views.ts`（48→85 行）；fetcher 分支 + 钩子 + 端点计数落主模块（123→189 行）；`-types.ts` 191 行零改动。**Phase 1 时点行数（wc，中期值——后续 Phase 扩展后终值见下）：main 189 / types 191 / records 295 / views 85 / writes 198 = 958，五件全部 ≤500 WARN 线（oversized 门禁零命中）**。opt-in e2e 钩子沿 linear/notion 先例落位主模块：`__airtableEndpointCalls`（端点计数）与 `__airtableTestHooks`（`updateMiss` 强制 miss + `lastUpdate` 载荷观察），生产 no-op。`showcase-env.ts` **零改动**（699/700 双口径维持——post 请求经既有 `replicaBranches` 数组条目流入分支，分支内按 method 分派；`mock-backend.ts` 463 行零触碰）。
> 5. **先红后绿证据记录**：执行顺序按计划口径（Proof 先于 Fix）——新增 8 条写操作用例对 pre-P6b 实现（get-only 分支）跑红 = **`7 failed | 314 passed`**（红态证据；第 8 条为既有 registration 组内回归面不涉写端点故即时绿，沿 P3b/P4b/P5b"内建锁定即时绿"口径）；Fix 落地后迭代转绿 = **321 passed 全绿（32 files）**（中途 2 处测试面自身修正：分组计数断言卷积式改直值、barcode 5 位序号格式生成 bug 修复）。红态截图无，以失败输出为准。

- Item Types: `Decision | Proof | Fix`

- [x] Decision——写端点语义裁定：post 端点定名与契约（候选集，Phase 内裁定终态）——`Airtable__updateRecord`（`{id, patch:{title?|category?|tags?|date?|score?|amount?|progress?|done?|email?|site?|phone?|duration?|rating?|barcode?|notes?…}}` → 会话库生效返回更新记录；includeScope 键遮蔽对策（patch 规范键 or 编辑面规范键优先级）落字；只读字段键拒绝/忽略语义落字；无匹配失败 at-update-miss）、`Airtable__createRecord`（`{title, …}` → 生成 id 入会话库，插行位次（表尾/视图序）与默认值裁定，at-create-miss 守卫）、（可选）`Airtable__updateViewConfig`（`{patch:{sort?|groupBy?|hiddenFields?}}` → 会话配置态——仅当排序/分组/显隐裁定走会话态而非 url 物化时设立）——miss 行为按 Failure Paths 裁定并落字本计划 → **已落字（Phase 1 Decision 注记 1）：`updateRecord`（atEdit\* 规范键优先 + 平铺别名等价 + 只读键忽略/空 patch 失败 + modifiedAt bump）+ `createRecord`（AT-134 表尾插行 + 默认值）；`updateViewConfig` 不设立（排序/分组走 url 物化，注记 2）**
- [x] Decision——搜索/排序/分组/行高生效机制裁定（A1/A5/A8/A9）：候选 ①**url 参数物化**——`setValue` 写页面 scope（搜索沿 P5b 终态姿势 form `submitScope:'surface'` + `submitOnChange` + `submitAction: setValue`）→ data-source url 模板（`keyword=`/`sort=`/`group=`）+ 显式 `dependsOn` 自动刷新，mock 端点按参数预应用（P3b slots 先例）；②**会话写端点 + 服务端预应用**（P5b updateViewConfig 变体）；③**表达式 className 状态驱动**（行高专属候选：分段控件 `onClick: setValue` + 密度行 className 表达式绑定档位 scope 变量——P6a 已证表达式 className 机制可用，控件挂 setValue 与行级求值时机 Phase 内实测）——裁定需含逐项断言口径（如：切分组后组头计数/summary 随动可观察；行高切换后密度行 getComputedStyle 变化可观察）并落字 → **已落字（注记 2）：A1/A5/A8 = 候选① url 物化（keyword/sort/group + dependsOn；A5 条目经 mini-form 载体跨 dialog 子 scope）+ A9 = 候选③ className 表达式（响应性 e2e 实测裁决，风险预登记）；逐项断言口径随项落字**
- [x] Decision——record modal 编辑/prev-next 通道裁定（A11 = A11a 编辑保存 + A11b prev/next 导航）：候选 ①嵌套 openDialog（堆叠通道 P6a 实测存在）②dialog 内 form 数据重载（`Airtable__record?id=${nextId}` 重取 + 表单值刷新——表达式/setValue 载体实测）③关闭重开链；编辑保存链 includeScope 遮蔽对策落字；裁定含断言口径（modal 内编辑 → 保存 → 网格对应行刷新 → prev 切换后表单值随动）并落字 → **已落字（注记 3）：A11a = 编辑区 15 字段子集 + atEdit\* 规范键 + surface submit 链 + 双源刷新；A11b = 候选① 嵌套 openDialog 载荷驱动（prevId/nextId 已在载荷）+ 首尾边界 className 禁用 + ⌘⇧>/< 无通道裁决（Phase 3 落字）**
- [x] Decision——mock 模块组织裁定：写操作落 `-records.ts` 追加（现 243 行，评估 ≤500 余量）或新开 `-writes.ts`（沿 P5b `-writes.ts` 先例）——落字结论、终态行数记录（wc + 门禁切分双口径）；opt-in e2e 钩子沿 linear/notion 先例评估落位（`__airtableEndpointCalls`/`__airtableTestHooks`，生产 no-op）→ **已落字（注记 4）：新开 `-writes.ts`（198 行）+ records 295 / views 85 / main 189 / types 191，五件全 ≤500；钩子落主模块；showcase-env 零改动 699/700 双口径**
- [x] Proof——写操作单测先红后绿：每端点 ≥2 条（成功路径 + Failure Path）、会话内持久性断言（updateRecord 后 records 端点返回新值且 summary 随动、createRecord 后行数/分页 +1 且新行 keyword 检索可达）——先于 Fix 编写，对未实现分支断言失败（红态证据记录落字，沿 P5b 注记 4 口径） → **8 条新用例先行：红态 `7 failed | 314 passed`（第 8 条 registration 面即时绿）→ 绿态 321 passed（注记 5）**
- [x] Fix——mock 模块扩展 post 分支：写操作修改 in-memory 会话库（clone 工厂先例），同一 session 内跨页跨源可观察；`sortAirtableRecords` 等接线所需助手补齐；`showcase-env.ts` 零改动（如需胶水：先等价余量整理且 ≤700 双口径并落字）；`mock-backend.ts` 零触碰 → **已完成：post 分支（update/create）+ sort/group/keyword 参数化读路径 + 钩子计数；showcase-env 零改动、mock-backend.ts 零触碰（git diff 核查）**

Exit Criteria:

- [x] 写端点契约（端点名/入参/miss 行为）与三项机制裁定（生效机制/modal 通道/模块组织）已落字本计划 Decision 注记 → **注记 1–4 全部落字**
- [x] `pnpm --filter @nop-chaos/flux-playground test -- airtable-mock-backend` 全绿且含新增写操作用例（先红后绿证据落字） → **321 passed（32 files），含 8 条新增写操作/排序/分组用例；红态 `7 failed | 314 passed` 落字注记 5**
- [x] `showcase-env.ts` ≤700（wc 与门禁切分双口径）、`mock-backend.ts` 零改动（wc 实测记录于本计划） → **showcase-env 699（wc）/ 700（门禁切分）双口径零改动；mock-backend.ts 463 行零触碰（git diff 空）**

### Phase 2 - 视图栏与网格接线（搜索/排序/分组/行高/插行）+ 处置表落字

Status: completed
Targets: `page-schemas/airtable-grid.json`、`airtable-replica.css`（如需）、`tests/e2e/`（同 Phase 1 spec 拆分裁定）

> **Phase 2 执行落字（2026-08-30 实测）**
>
> 1. **拆分裁定落地**：交互用例落新建 `tests/e2e/airtable-replica-interactions.spec.ts`（visual spec 337 行 + 交互用例预估体量按 P1 README §2.2 触发拆分，visual 保留初屏与浮层走查；现 interactions 7 条，Phase 3 追加编辑链路用例）。
> 2. **A5 排序机制实测修正（重要，Phase 1 候选① 的 in-table 裁决翻转）**：列头菜单 dialog 自 table 列头内打开，**dialog 内 surface form 的写入域（lifecycle write scope）与 dialog 级 `onSubmitSuccess` 的 ownerScope 均为 table 局部子 scope**——页面级 data-source `dependsOn` 观察不到（live 探针证据：`_tmp/airtable-sort-inspect.mjs` 点击排序条目后 records 端点零重取、`setValue` 落点不可达页面 scope；搜索 dialog 同机制可用因入口在视图栏 page body 域）。**终态机制 = Phase 1 候选②（P5b updateViewConfig 变体）**：排序条目以 mini-form（`submitScope:'surface'` + `submitAction: ajax Airtable__updateViewConfig`，`data:{viewId:'grid', patch:{sort:'<field>:<dir>'}}` 字面量）提交 → 会话排序配置 → dialog 级 `onSubmitSuccess` 双源 `component:refresh` → 读端点按会话配置预应用（url `sort=` 参数显式覆盖会话配置，单测锁定）。`Airtable__updateViewConfig` 因此**补设立**（Phase 1 注记 1 的"不设立"结论依此修正：`{viewId:'grid', patch:{sort?}}`，未知 viewId 失败 at-viewcfg-miss、`null` 清除、非法 sort 载荷失败）。e2e 02：amount Z→A 后首页金额降序单调 + A→Z 翻转恢复 + 端点计数 ≥2。
> 3. **A9 行高候选③实测成立（接线锁定）**：视图栏分段控件（page body 域容器 `onClick: setValue('atRowDensity')`）→ 网格 wrapper container className 表达式 `${'at-density-live-' + (atRowDensity ?? 'short')}` + 分段控件选中态表达式 className——**scope 变量驱动的静态节点表达式 className 响应性实测成立**（e2e 04：切「中」后网格行 getComputedStyle 32→48px（±2px）、切「超高」→160px、`at-seg-item-active` 类随动）；CSS `.at-density-live-*` 四档覆写复用既有 `--at-row-*` 令牌（css 725→778 行）。G-E/G-F2「交互态驱动缺口」实测收窄：**表达式 className 状态驱动可达**（缺口收窄至选中集/键盘移动等交互态状态源，素材行随 C2 回写 ⑦）。
> 4. **A13 Space 展开记录显式裁决（通道实测结论）**：P6a 初判"可模拟"**部分证实**——renderer 行 keydown 中继通道实测存在（`table-body-row-rendering.tsx:196-227`：声明 `onRowClick` 事件后行 `tabIndex=0` + Enter/Space 内建中继派发 `onRowClick`，零 hack），但**不接线**，两条理由落字：①激活需把 record modal 体（~950 行）整份复制进 `onRowClick` 声明（无 schema ref/复用原语，P6a 17 列菜单裁剪同口径的 schema 膨胀 + 双份维护漂移风险）；②`onRowClick` 同时绑走单击行，与「单击=格选中」导航语义冲突（G-B2 双态缺口的进一步偏离）。e2e 07 锁定裁决不回归（行无 `data-interactive` + 聚焦行按 Space 不开 modal + 注记在库）。通道证据随 C2 回写 ⑦（G-B2 正面素材：renderer 已有行级 keydown a11y 中继可复用）。
> 5. **A1/A8/A10 接线落位**（机制沿 Phase 1 裁定，全部 e2e 绿）：A1 搜索 = P5b 终态姿势（dialog 内 form `submitScope:'surface'` + `submitOnChange` + `submitAction: setValue('atSearchKeyword')`，dialog 级 `onSubmitSuccess` `$formData` 链兜底；url `keyword=` 物化 + dependsOn；mock 匹配域扩展 +标签+邮箱）；A8 分组 = 视图栏新增 `airtable-group-control` 三档控件（按阶段/按负责人/按交付，page body 域 onClick setValue `atGroupBy`）→ group 源 url `group=${atGroupBy ?? 'category'}` + dependsOn → `-views.ts` 泛化分组（owner/done 组头 + 组内计数/金额随会话）；A10 插行 = `airtable-grid-new-row` openDialog → form（title required + category select + amount input-number）`submitAction: ajax Airtable__createRecord`（includeScope '\*'）+ `closeOnSubmit` + 双源 refresh（e2e 05 required 拦截零写请求；e2e 06 创建后 summary 33→34、新行 keyword 检索可达、默认值落库）。
> 6. **先红后绿证据**：interactions 7 条先行编写，对未接线 HEAD（schema+css stash 后）跑红 = **`7 failed`**；接线后迭代转绿（A5 经 3 轮：closeOnSubmit 显式声明 → setValue/表单载体探针排除 → 候选② 机制落地；红态截图无，以失败输出为准）。visual 既有 6 用例零回归，一处注记更新类微调落字：visual 02 `airtable-group-note` 断言 '归 P6b' → '已接线'（分组切换接线后注记措辞更新，沿 P5b visual 02 先例）。
> 7. **Phase 2 时点行数（wc，中期值；终值见 Phase 3 注记 7）**：schema 3119→3541 行；css 725→778 行；interactions spec 新建 257 行（visual 337 行）；mock 五件 199/193/295/85/225=997 全 ≤500（门禁零新增命中）；单测 236→425 行 22 用例。

- Item Types: `Fix | Proof | Decision`

- [x] 搜索接线（A1）：`airtable-search-entry` 入口 → 搜索浮层（dialog/drawer 沿 P5b 搜索面板形态）内 form `submitScope:'surface'` + `submitOnChange` + `submitAction: setValue('atSearchKeyword')` → `airtable-source-grid` url 追加 `keyword=${atSearchKeyword ?? ''}` + `dependsOn` ——输入即过滤 e2e 锁定（含 at-search-empty 空态文案断言） → **已接线（P5b 终态姿势 + dialog 级 `$formData` 链兜底；匹配域扩展 +标签+邮箱）；e2e 01 绿（过滤/属性值命中/at-search-empty/清空恢复/端点计数）**
- [x] 排序接线（A5）：三列头菜单「排序 A→Z/Z→A」条目按 Phase 1 裁定机制生效（url `sort=` 物化 or 会话态）→ 网格行序变化 + at-sort-unknown 兜底单测；其余 17 列入口形态菜单的排序条目显式裁决或批量接线（`sortAirtableRecords` 按任意裁剪清单字段排序可达性实测后落字） → **已接线（机制实测修正为候选② 会话端点——执行落字 2；mini-form → `Airtable__updateViewConfig` → dialog `onSubmitSuccess` 双源 refresh）；e2e 02 绿（amount 降序单调 + A→Z 翻转 + 端点计数）；at-sort-unknown 单测锁定；17 列维持入口形态（无菜单 dialog 载体——批量接线即 17×dialog schema 膨胀，端点 `sort=` 对任意字段可达落字）**
- [x] 分组接线（A8）：视图栏分组控件（现有 `airtable-group-section` 样本区 + 视图栏控件形态）按 Phase 1 裁定机制生效——切换分组字段（category/owner/done 等裁剪清单字段）→ 组头计数/组内 summary 随动（`-views.ts` group 计算泛化实测）+ at-group-unknown 平铺兜底维持 → **已接线（视图栏新增 `airtable-group-control` 三档控件 setValue → group url 物化 + dependsOn；`-views.ts` 泛化 owner/done 分组）；e2e 03 绿（组头集合 4→5→2、计数合计 33）；at-group-unknown 单测维持**
- [x] 行高接线（A9）：`airtable-rowheight-control` 四档分段控件按 Phase 1 裁定机制生效（③ className 表达式候选实测；不可达则显式裁决落字 G-E 证据 + 分段控件选中态样本维持）——档位切换后密度行 getComputedStyle 断言 → **已接线（候选③ 实测成立——执行落字 3：setValue + 网格 wrapper className 表达式 + `.at-density-live-*` CSS）；e2e 04 绿（32→48→160px getComputedStyle + 选中态类随动）**
- [x] 底部插行接线（A10）：`airtable-grid-new-row` → 新建 dialog（沿 P5b I8 先例：form required 校验 + `submitScope:'surface'` + `submitAction: ajax Airtable__createRecord` + `onSubmitSuccess` 双源 refresh + 关闭）；⇧Enter/⌘⇧Enter 键盘子项显式裁决；插行后分页边界（新行所在页/总数 +1）e2e 锁定 → **已接线（新建 dialog + required 拦截 + createRecord 表尾插行 + closeOnSubmit + 双源 refresh）；e2e 05 绿（空提交拦截零写请求）/06 绿（summary 33→34 + 新行 keyword 检索可达 + 默认值落库）；⇧Enter/⌘⇧Enter 键盘子项显式裁决（G-B2，注记落字）**
- [x] 键盘全谱显式裁决落字（A15/A16）：P6a G-D §4 十五键位逐键位终态表（键位 ↔ 实测通道 ↔ 终态（接线锁定/显式裁决）↔ 缺口归因 G-B2/G-B3）落字本计划——含 Space 展开记录 keydown 通道实测结论（A13）、⌘; 日期置今天、⌥↑↓/Alt+拖 移动复制记录 → **已落字「交互清单处置表」后「键盘十五键位终态表」（含 A13 通道实测结论与分组态补充键位）**
- [x] 处置表 A1–A16 终态落字（覆盖分析篇 §4.1–§4.3 逐条：A2 单元格原位编辑/A3 附件·协作人·关联·按钮字段编辑器/A4 ⇧Space 大编辑浮层/A6 隐藏字段/A7 动态列模型/A12 summary 随动/A14 Hide fields 搜索与批量键——终态在对应 Phase 落字后汇总；分析篇 §4.2 拖拽三处——拖拽表头重排/列宽拖拽/表头底缘拖高——显式归入 A7 处置域单列裁决行（无拖拽通道，与回写 ⑤ kanban 拖拽口径同源）；分组态键位——组头折叠/展开生效归 A8 处置行、⌘⇧+D 开分组菜单与 Enter 折叠/展开全部归 A15 键盘表补充行（P6a G-D §4 十五键位之外的分析篇 §4.2/§4.3 键位一并入表，杜绝枚举盲区）） → **已落字「交互清单处置表（A1–A16）」节：接线锁定 8 条（A1/A5/A8/A9/A10/A11a/A11b/A12）/内建锁定 0 条/显式裁决 8 条（A2/A3/A4/A6/A7/A13/A14/A15/A16 复合计），无静默跳过**
- [x] e2e 先红后绿：Phase 2 各接线项用例先行编写对 HEAD 断言失败（红态证据落字），接线后迭代转绿；visual spec 既有 6 用例零回归（或注记更新类微调落字，沿 P5b visual 02 先例） → **红态 `7 failed`（stash 法）→ 绿；visual 6 用例零回归（visual 02 group-note 断言微调落字，执行落字 6）**

Exit Criteria:

- [x] A1/A5/A8/A9/A10 五项接线终态落字（可达→接线锁定 + e2e 绿；不可达→显式裁决 + 缺口归因） → **五项全部接线锁定 + e2e 01–06 绿；A5 机制修正（候选②）与 A9 候选③实测成立落字（执行落字 2/3）**
- [x] 键盘十五键位终态表 + 处置表 A1–A16 汇总落字 → **「键盘十五键位终态表」+「交互清单处置表（A1–A16）」两节落字**
- [x] 目标 e2e 全绿（visual 既有用例零回归）；`tests/e2e/` 拆分与否落字（新建 interactions spec 则其用例全绿） → **拆分落字（执行落字 1）：新建 interactions spec 承载交互用例 11 条全绿；visual 6 条零回归**

### Phase 3 - record modal 编辑链路 + 浮层动作收口（列头菜单/Hide fields/summary 随动）

Status: completed
Targets: `page-schemas/airtable-grid.json`、`airtable-replica.css`（如需）、`mock-backend-airtable*.ts`（如需补样本）

> **Phase 3 执行落字（2026-08-30 实测）**
>
> 1. **A11a 编辑保存接线**：modal form 追加编辑区 `airtable-record-edit`（15 字段可编辑子集全集 = atEditTitle (required)/atEditNotes (textarea)/atEditCategory (select)/atEditTags (multi-select)/atEditDate (input-date)/atEditAmount·Score·Progress·DurationSeconds·Rating (input-number)/atEditDone (checkbox)/atEditEmail (input-email)/atEditSite·Phone·Barcode (input-text)，`value` 绑 loadAction 数据回显，两列 flex-wrap 布局 `.at-edit-field`）+ form `submitScope:'surface'` + `submitAction: ajax Airtable__updateRecord`（`includeScope:'*'` + `data:{id}`，atEdit\* 规范键优先于载荷残留键——Phase 1 契约）+ 保存钮 `airtable-record-save` + dialog `closeOnSubmit` + `onSubmitSuccess` 双源 refresh。**协作人与附件不进编辑子集**（选人/上传原语缺口，D1；只读三字段维持只读灰显）。e2e 08：编辑 → 保存 → toast → 网格行/summary 随动 + 组内计数合计跨源一致；e2e 09：`__airtableTestHooks.updateMiss` 强制 miss → 失败 toast + modal 不关（closeOnSubmit 只绑提交成功）+ 网格不变。
> 2. **A11b 通道裁定修正（Phase 1 候选① → 候选② 实测可达）**：Phase 1 预判「dialog 内 form 数据重载无动作词汇」**不成立**——`component:refresh` 为通用 component-action（`component:<method>` + componentId → 组件句柄），而 form 组件句柄注册 `refresh` 方法（重跑 loadAction）。终态通道：prev/next onClick 动作链 `[{setValue id→${prevId}/${nextId}}, {component:refresh airtable-record-form-component}]`——**setValue 写 form 域 id → form loadAction url `?id=` 重物化 → dialog 内数据重载**，零浮层堆叠、零 schema 复制（对比候选① 嵌套 openDialog 的栈增长 + ~950 行 modal 体复制）。**首尾行边界 = className 表达式 `${prevId/nextId ? 'at-btn' : 'at-btn at-btn-disabled'}`**（pointer-events:none，CSS `.at-btn-disabled`）。⌘⇧>/< 键盘绑定维持显式裁决（无键盘通道，G-B2）。e2e 10：next → AT-102 标题随动（只读分区 + 编辑输入框双面断言）→ prev 回 AT-101 → 首行 prev 禁用往返。
> 3. **A6/A7 终态（显式裁决）**：A6 隐藏字段——`columnSettings:{enabled:true}` + `toggledStatePath` 机制**在库**（`use-table-visible-columns.ts:44-80` scope 驱动列显隐）、drawer 域 setValue 可达 page scope（视图栏入口），但**不接线**：启用即引入表格设置按钮 chrome（`TableColumnSettings` 挂载 table 内，与 Airtable 极简网格形态冲突）且 20 toggle 需表达式数组手术（ARRAYFILTER lambda 链，保真度不成比例）——动态列模型缺口归 G-D，drawer 维持形态样本 + 裁决注记落字（e2e 11 锁定）；列头菜单「隐藏字段」条目随 A6 同口径。A7 编辑字段/换型别/向左向右插入/删除字段 = 动态列模型显式裁决（G-D，P6a 口径维持）；**分析篇 §4.2 拖拽三处**（拖拽表头重排/列宽拖拽/表头底缘拖高）显式归入 A7 处置域：table renderer 有内建列宽拖拽（`use-column-resize`）但与复刻 colgroup 锁定宽 + 无列头拖拽重排 schema 通道，不模拟（回写 ⑤ kanban 拖拽口径同源）。
> 4. **A12 summary 随动裁定（内建锁定）**：summary bar 读载荷即端点重算（`summarizeAirtable` 按会话库实时计算），写操作后随源刷新重算——无静态预计算退役问题（P6a 交付即端点动态，非 P5a board 预计算条形态）；per-column 聚合语义件缺口维持（§7 候选，随 C2 回写）。e2e 06/08 锁定（创建后计数 33→34；编辑后行值随动）。
> 5. **A14 终态**：Hide fields 搜索输入/全部隐藏/全部显示子项随 A6 显式裁决维持形态（e2e 11：hideall 点击后列结构不变——形态按钮不伪装生效）。
> 6. **先红后绿证据**：Phase 3 用例 4 条（08/09/10/11）先行编写，对 Phase 2 后（modal 未接线）schema（stash 法）跑红 = **`4 failed`**；接线后全绿。interactions 终态 **11 passed** + visual 6 用例零回归（visual 05 断言 `airtable-record-kbd-note` 含 'G-B2' 随注记更新措辞维持命中）。
> 7. **终态行数（wc，closure audit R1 后 live 复核修正——本注记初稿 4095/800 为未实测估计值，P6a R1 Major-1 同类错误已纠正）**：schema 3119→**3769** 行；css 725→**796** 行；interactions spec 新建 **390** 行。

- Item Types: `Fix | Proof | Decision`

- [x] record modal 编辑保存接线（A11a）：modal form 追加编辑区（20 字段可编辑子集按 P6a 裁剪清单：text/long text/select/multi-select/date/number/currency/percent/checkbox/email/url/phone/duration/rating 近似/barcode 串编辑形态；只读灰显字段维持）+ 保存钮（`submitForm` → `Airtable__updateRecord` 按 Phase 1 契约）+ 失败分支（at-update-miss message）；编辑 → 保存 → 网格行/summary 随动 e2e 锁定（含跨源一致：grid 源与 group 源刷新后同值） → **已完成（执行落字 1）：15 字段编辑子集 + atEdit\* 保存链 + 双源刷新；e2e 08（随动 + 跨源一致）/09（updateMiss 强制 miss 失败分支）绿；owner/attachments 不进子集落字**
- [x] record prev/next 导航接线（A11b）：`airtable-record-prev/next` 按 Phase 1 裁定通道生效（prevId/nextId 载荷已在库）——切换后表单值随动 + 首尾行边界（prev 于首行/next 于末行的 disabled 或兜底）e2e 锁定；⌘⇧>/< 键盘子项显式裁决 → **已完成（执行落字 2）：通道修正为候选② dialog 内数据重载（component:refresh → form refresh 句柄，Phase 1"无动作词汇"预判实测推翻）；首尾边界 className 表达式禁用；⌘⇧>/< 裁决维持；e2e 10 绿**
- [x] 列头菜单动作终态（A6/A7）：「隐藏字段」条目与 Hide fields drawer 显隐按 Phase 1 裁定终态（visible 表达式候选实测；不可达则显式裁决 G-D 列模型缺口 + drawer 维持形态样本）；「编辑字段/换型别/插入/删除」显式裁决落字 → **已落字（执行落字 3）：A6/A14 显式裁决（机制在库证据 + chrome/表达式手术成本 + G-D 归因，e2e 11 锁定）；A7 含拖拽三处归入裁决域**
- [x] summary bar/组头计数随会话更新裁定（A12）：写操作后 summary 预计算随会话重算（P5b board 聚合动态化先例）或维持静态预计算的裁定落字 + 单测/e2e 锁定 → **已落字（执行落字 4）：summary 读载荷即端点重算（P6a 交付即动态，无静态条退役问题），随源刷新随动，e2e 06/08 锁定；per-column 聚合语义件缺口维持随回写**
- [x] Hide fields 搜索/全部隐藏/全部显示子项终态（A14）：随 A6 裁定终态接线或裁决落字 → **已落字（执行落字 5）：随 A6 显式裁决维持形态，e2e 11 锁定不伪装生效**
- [x] e2e 先红后绿：Phase 3 各接线项用例先行红、接线后转绿（证据落字）；浮层走查零回归 → **红态 `4 failed`（stash 法对未接线 modal）→ interactions 11 passed 全绿 + visual 6 用例零回归（执行落字 6）**

Exit Criteria:

- [x] record modal 编辑链路与 prev/next 导航接线锁定 + e2e 绿（含 Failure Path 断言） → **e2e 08/09/10 全绿（成功路径 + at-update-miss 失败分支 + 边界禁用）**
- [x] A6/A7/A12/A14 终态落字（接线锁定或显式裁决 + 缺口归因） → **执行落字 3/4/5 + 处置表终态行**
- [x] 目标 e2e 全绿（visual + interactions 全部用例） → **visual 6/6 + interactions 11/11 = 17/17 全绿**

### Phase 4 - C2 回写 ⑦ + 对照落字 + 自查收口

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`、`docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`、本计划

- Item Types: `Fix | Proof`

> **Phase 4 执行记录（2026-08-30）**
>
> 1. **C2 回写 ⑦** 已落 `C2-capability-gaps.md` §3 追加区，全部回写输入逐条可指认：G-D 终态实测（接线后可达面 e2e 01–10 vs 零承载面终判维持）、G-B2/G-B3 十五键位终态（**G-B2 正面新素材：table 行 keydown 中继在库**（onRowClick a11y 面），缺口收敛至框架层焦点管理/roving/chord；G-B3 跨应用维持 + §7 候选 2 并入观察面）、P6a §7 两候选终态（分组聚合语义并入 G-D；范围选区+fill handle 并入 G-B3 观察面）、P6a Deferred 三项终态、素材行五条（component:refresh form 句柄数据重载通道——G-L 关联正面证据；dialog surface 写入域随开启位置精化——A5 候选①否决根因；表达式 className 状态驱动成立——G-F2 缺口面收窄；columns 显隐 scope 通道在库——较初判乐观；includeScope 遮蔽坑第五例 atEdit\*）。初版裁决表零改动。
> 2. **分析篇对照**落 `airtable-grid.md` **§4.4**（§4.1 已被"单元格编辑器矩阵"占用，追加节按 linear §4.8 先例顺延编号）：14 行逐条「预判 vs 实测」对照 + §5 两行勘误（网格底座行：input-table → table+modal 混合；行高四档行：切换生效可达）+ §7 两候选终态段。其余行与预判一致或为形态注记，无矛盾行不动。
> 3. **两维自查（P1 README §4.2）＝通过**：产品完成度——接线后无"demo 占位"按钮：搜索/排序/分组/行高/插行/编辑保存/prev-next 全部真实行为 + 反馈成对（interactions e2e 01–10）；显式裁决项全部携带裁决注记（grid-note Space 裁决/hide-fields-note A6·A14/column-menu-note 动态列模型/new-record-note 键盘缺口/kbd-note ⌘⇧>/<）且有锁定断言（e2e 07/11）；数据全部经 mock 端点流动。视觉原创性——对照分析篇 §2 令牌抽查维持（密度 13px/32px 行高实测、9 色盘、主蓝 `--at-blue`、light-only）；新增 CSS 全在 `.at-*` scope（`.at-density-live-*`/`.at-menu-form`/`.at-menu-item-btn`/`.at-btn-disabled`/`.at-edit-grid`/`.at-edit-field`）。
> 4. **样式契约自查（§4.3）＋变更面核查＝通过**：`git diff --name-only -- packages/` 为空（零 renderer/ui/runtime 改动）；`mock-backend.ts` 与 antdpro/cal/linear/notion slug mock 零触碰（git diff 空）；变更面 = schema 单页 + mock 五件（-writes.ts 新建）+ css + 单测 + 两 spec + interactions spec 新建 + C2/分析篇/roadmap/plan 本体 + e2e artifacts——全部 In Scope；`_tmp/` 探针脚本已清理。
> 5. **全量验证 full-green**：`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 68/68 任务（playground 32 files / 322 tests）、`pnpm check` exit 0 零新增红（mock 五件 199/193/295/85/225 全 ≤500，oversized 零新命中）、目标 e2e visual 6/6 + interactions 11/11 = 17/17。

- [x] Proof——C2 追加回写 ⑦（roadmap Cross-Cutting 5，只追加不重开初版裁决）：G-D 终态实测（接线后底座承载度复核：读流动/编辑链路可达面 vs 键盘/选区/填充零承载终判）、G-B2/G-B3 键盘十五键位终态表、分析篇 §7 两候选终态（grid 分组聚合语义并入 G-D 或加行；范围选区+fill handle 编辑模型归属判断）、P6a Deferred 三项终态、素材行（表达式 className 状态驱动、columns visible 表达式、对话框堆叠通道——实测证据 + 与回写 ③–⑥ 既有口径的对齐注记） → **已追加（执行记录 1）**
- [x] Proof——分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b/P3b/P4b/P5b 先例格式追加进 `airtable-grid.md`）；§5 逐行复核如与实测矛盾做事实勘误（无矛盾则不动） → **已落 §4.4（编号顺延，§4.1 已占用——linear §4.8 先例）+ §5 两行勘误 + §7 终态段（执行记录 2）**
- [x] Proof——两维自查（P1 README §4.2 产品完成度/视觉原创性 + §4.3 样式契约）：浮层全部有真实行为或显式注记、数据经 mock 端点流动、新 CSS 全在 `.at-*` scope、零 renderer 包改动、light-only 维持——记录落字 → **自查通过（执行记录 3/4）**
- [x] Proof——变更面核查：`git status --porcelain` 仅含 In Scope 文件（`packages/` 零改动、`mock-backend.ts` 与其他 slug mock 零触碰）——记录落字 → **核查通过（执行记录 4）**
- [x] Proof——全量验证记录落字：`pnpm typecheck`/`build`/`lint`/`test` + 目标 e2e + `pnpm check` 零新增红 → **full-green（执行记录 5）**

Exit Criteria:

- [x] 回写 ⑦ 已追加 C2 §3 且初版裁决零改动 → **执行记录 1**
- [x] 分析篇对照落字；两维自查与变更面核查记录落字 → **执行记录 2/3/4**
- [x] 全量验证 full-green 记录落字 → **执行记录 5**

## 交互清单处置表（A1–A16，对应分析篇 §4.1–§4.3；终态 2026-08-30 执行落定）

> 起草期预登记处置方向；执行期按 Phase 落终态（接线锁定 / 内建锁定 / 显式裁决），无静默跳过。**全部 16 条已落终态**：接线锁定 8 条（A1/A5/A8/A9/A10/A11 复合/A12 内建随动）、显式裁决 8 条（A2/A3/A4/A6/A7/A13/A14/A15/A16，部分复合）。每条接线锁定项 ≥1 条程序化 e2e（interactions 01–10）；显式裁决项以注记锁定断言（e2e 07/11）或单测承载，不构成档位违反（沿 P3b I15/P4b L/P5b N 口径）。

| #   | 交互（分析篇出处）                                        | 终态                                  | 落点与证据                                                                                                                                                                               |
| --- | --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | ⌘F/搜索入口参数化搜索（§4.3 ⌘F + §2.4）                   | **接线锁定**                          | 搜索 dialog form submitOnChange + setValue → url keyword 物化 + dependsOn；e2e 01（过滤/属性值命中/空态/恢复）                                                                           |
| A2  | 单元格原位编辑 + 同格双态（§4.1 Enter/F2 进编辑）         | **显式裁决**                          | 无原位编辑通道；空间分离双态维持 P6a 口径；编辑态收敛 record modal（A11a）；归因 G-D                                                                                                     |
| A3  | 附件/协作人/Linked record/Button 字段编辑器（§4.1）       | **显式裁决**                          | 选人浮层/上传/搜索选记录/按钮动作原语缺口（P6a 裁剪 P6b 动作域复核维持）；其余 15 型别编辑子集由 A11a 承载；归因 G-D/D1                                                                  |
| A4  | ⇧Space 大编辑浮层（§4.1 long text）                       | **显式裁决**                          | 修饰键组合无通道（G-B2）；长文本编辑以 textarea 承载（A11a）                                                                                                                             |
| A5  | 列头菜单排序 A→Z/Z→A（§4.2）                              | **接线锁定**（机制实测修正为候选②）   | 菜单 mini-form → `Airtable__updateViewConfig` 会话排序 → 服务端预应用；e2e 02；url sort= 参数覆盖通道单测锁定                                                                            |
| A6  | 隐藏字段（列头菜单条目 + drawer 显隐，§4.2 🌐）           | **显式裁决**                          | 机制在库（columnSettings+toggledStatePath）但 chrome 冲突 + 表达式数组手术保真度不成比例；动态列模型归 G-D；e2e 11                                                                       |
| A7  | 动态列模型（edit/换型别/insert/delete）+ 拖拽三处（§4.2） | **显式裁决**                          | 列 schema 静态声明无运行时变更通道（G-D 列菜单缺口维持）；拖拽表头重排/列宽拖拽/表头底缘拖高无 schema 通道（列宽拖拽 renderer 内建与复刻 colgroup 锁定冲突），回写 ⑤ kanban 拖拽口径同源 |
| A8  | Group by 分组切换 + 组头折叠（§4.2）                      | **切换接线锁定 + 折叠显式裁决**       | 视图栏控件 setValue → group url 物化 → 泛化分组（category/owner/done）；e2e 03；组头折叠 chevron 零动作形态（G-D 分组折叠语义）                                                          |
| A9  | 行高四档切换（§4.2）                                      | **接线锁定**（候选③ 实测成立）        | 分段控件 setValue + className 表达式状态驱动 → CSS 密度档；e2e 04（32→48→160px 实测）；G-E 缺口实测收窄随回写                                                                            |
| A10 | 底部插行 ⇧Enter/⌘⇧Enter（§4.2）                           | **按钮面接线锁定 + 键盘子项显式裁决** | 新建 dialog → createRecord 表尾插行 + required 拦截；e2e 05/06；⇧Enter/⌘⇧Enter 无键盘通道（G-B2）                                                                                        |
| A11 | record modal 编辑（A11a）+ prev/next（A11b）（§3/§4.2）   | **接线锁定 + ⌘⇧>/< 键盘显式裁决**     | 15 字段编辑保存链 + dialog 内数据重载导航（候选② 通道实测推翻 Phase 1 预判）+ 首尾边界禁用；e2e 08/09/10                                                                                 |
| A12 | summary bar/组内计数随会话（§4.2）                        | **内建锁定（端点动态）**              | summary 读载荷即端点重算，写后随源刷新随动；e2e 06/08；per-column 聚合语义件缺口维持（§7 候选随回写）                                                                                    |
| A13 | Space 展开记录（§4.3）                                    | **显式裁决（通道实测存在但不接线）**  | renderer 行 keydown 中继实测存在（onRowClick a11y 面）但激活需复制 modal 体且单击行语义冲突；e2e 07 锁定；归因 G-B2                                                                      |
| A14 | Hide fields 搜索/全部隐藏/全部显示（§4.2）                | **显式裁决**                          | 随 A6 同口径维持形态（hideall 点击后列结构不变——不伪装生效）；e2e 11                                                                                                                     |
| A15 | 键盘导航全表（§4.3 十五键位 + 分组态键位）                | **显式裁决**                          | 见「键盘十五键位终态表」；Esc 内建锁定；插行/搜索/prev-next 按钮面等价路径已接线（A1/A10/A11）                                                                                           |
| A16 | 批量选区/fill handle/⌘ 多选/⌘C·X·V/⌘Z·Y（§4.3 批量族）    | **显式裁决**                          | 选区层/剪贴板/撤销原语全缺口（G-B3/D1 输入池；协同裁剪 §6.2）                                                                                                                            |

## 键盘十五键位终态表（P6a G-D §4 清单的 P6b 终态；含分析篇 §4.2/§4.3 分组态补充键位）

| 键位                              | Airtable 行为           | P6b 实测通道                                                    | 终态                                        | 归因         |
| --------------------------------- | ----------------------- | --------------------------------------------------------------- | ------------------------------------------- | ------------ |
| 方向键 / Tab / ⌘+方向键           | 单元格移动/跳边缘       | 无（行无 keydown 通道、无 selectedCell 状态）                   | 显式裁决不模拟                              | G-B2         |
| Enter / F2                        | 进编辑（双态分离）      | 无单元格编辑态（编辑态收敛 record modal，A11a）                 | 显式裁决（modal 编辑锁定承载主语义）        | G-B2/G-D     |
| Esc                               | 退出编辑/关浮层/关查找  | dialog/drawer Esc 内建                                          | **内建锁定**（visual 03–06 锁定）           | —            |
| ⇧+方向键 / ⇧+点击                 | 范围选区                | 无修饰键处理、无范围锚点                                        | 显式裁决不模拟                              | G-B3         |
| ⌘+点击                            | 非相邻多选              | 同上                                                            | 显式裁决不模拟                              | G-B3         |
| ⌘C / ⌘X / ⌘V                      | 单元格/范围复制剪切粘贴 | 无剪贴板 action 词汇（回写 ③/④/⑤ 三例同源）                     | 显式裁决不模拟                              | G-B3/D1      |
| Space                             | 展开记录                | **renderer 行 keydown 中继实测存在**（onRowClick a11y 面，A13） | 显式裁决（通道证据落字，不接线）；⇧Space 无 | G-B2         |
| ⇧Enter / ⌘⇧Enter                  | 下插行 / 末尾插行       | 键盘无通道；插行按钮面已接线（A10）                             | 按钮面接线锁定 + 键盘显式裁决               | G-B2         |
| ⌘F                                | 视图内查找              | 键盘绑定无通道；搜索入口按钮面已接线（A1）                      | 按钮面接线锁定 + 键盘显式裁决               | G-B2         |
| ⌘Z / ⌘Y                           | 撤销/重做               | 无                                                              | 显式裁决（协同裁剪，分析篇 §6.2）           | G-B3（裁剪） |
| ⌘;                                | 选中日期置今天          | 无键盘通道（编辑子集日期经 input-date 承载）                    | 显式裁决不模拟                              | G-B2         |
| ⌘⇧> / ⌘⇧<                         | record 上一条/下一条    | 键盘绑定无通道；prev/next 按钮面已接线（A11b dialog 内重载）    | 按钮面接线锁定 + 键盘显式裁决               | G-B2         |
| fill handle 拖拽                  | 等差/重复填充           | 无拖拽原语与选区层                                              | 显式裁决不模拟（§7 候选② 随回写）           | G-B3         |
| ⌥↑ / ⌥↓                           | 移动记录序              | 无通道                                                          | 显式裁决不模拟                              | G-B2         |
| Alt+拖                            | 复制记录/字段           | 无拖拽+修饰键通道                                               | 显式裁决不模拟                              | G-B2/G-B3    |
| ⌘⇧+D（分组态补充）                | 开分组菜单              | 无键盘通道；分组切换按钮面已接线（A8 视图栏控件）               | 按钮面接线锁定 + 键盘显式裁决               | G-B2         |
| Enter 折叠/展开全部（分组态补充） | 折叠/展开全部组         | 无键盘通道                                                      | 显式裁决不模拟                              | G-B2         |
| 组头点击折叠/展开（分组态补充）   | 折叠/展开单组           | chevron 为零动作静态形态（分组折叠语义件缺口）                  | 显式裁决不模拟                              | G-D          |
| ⌘↑ / ⌘↓（分组态补充）             | 跳组顶/组底             | 无键盘通道                                                      | 显式裁决不模拟                              | G-B2         |

> 终态计数：内建锁定 1（Esc）；按钮面接线锁定 + 键盘显式裁决复合 4（插行/查找/prev-next/分组菜单——按钮面等价路径全部真实可用，模板感治理底线不破）；纯显式裁决 14。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_faf94f6d4ffeq6yERh5IxyuQu8`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: R1 `pass-with-minors`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 A1 编号碰撞（Phase 3 record modal 编辑保存误标 A1）已改为 A11 = A11a 编辑保存 + A11b prev/next 导航并同步 Phase 1 Decision 与 Phase 3 两项标签；Minor-2 处置表枚举盲区（分析篇 §4.2 拖拽三处 + 分组态键位 ⌘⇧+D/Enter 全折叠展开/组头折叠生效未点名）已在 Phase 2 处置表项内显式归入 A7/A8/A15 处置域并落字要求单列裁决行。审阅者并经 live 复核确认：行数全表（showcase-env 699/700 双口径、mock 四件 123/191/243/48、schema 3119、CSS 725、spec 336/6 例、单测 236/13 例）、8 动作面（4 openDialog/1 openDrawer/3 ajax、零 submitForm/setValue/refreshSource/dependsOn）、九个 testid、`filterAirtableRecords`:188、`sortAirtableRecords` 零存在、render-host 7 包、@import 先于 `@source`、C2 回写最新 ⑥、roadmap P6b/P7a todo、HEAD `6e69351be` 全部准确。

## Closure Gates

- [x] 写端点契约终态与生效机制裁定全部落字，无 in-scope live defect 或 contract drift 被静默降级 → **Phase 1 Decision 注记 1–5 + Phase 2 执行落字 2（A5 候选② 机制修正依实测裁决并落字）+ Phase 3 执行落字 2（A11b 通道修正）**
- [x] 分析篇 §4 交互清单逐条处置落字（接线锁定/内建锁定/显式裁决三态，无未处置静默跳过） → **处置表 A1–A16 全部落终态（接线锁定 8 / 显式裁决 8 复合计）**
- [x] `airtable-mock-backend.test.ts` 全绿且含写操作用例（先红后绿证据落字）；`Airtable__` 新增写端点会话态同 session 可观察；既有 antdpro/cal/linear/notion/airtable 读端点零回归 → **22 用例全绿（红态 7 failed | 314 passed 落字）；写后会话可观察断言（records/record/group 跨源）在 08/06 用例；全量 playground 322 用例绿（既有端点零回归）**
- [x] `showcase-env.ts` ≤700 双口径（或零改动）；`mock-backend.ts` 零触碰；mock 模块全部 ≤500 无未登记 oversized WARN → **showcase-env 699/700 双口径零改动；mock-backend.ts 463 零触碰；mock 五件 199/193/295/85/225 全 ≤500，`pnpm check` oversized 零新命中**
- [x] 处置表 A1–A16 终态落字 + 键盘十五键位终态表落字；P6a Deferred 三项收口终态落字 → **「交互清单处置表（A1–A16）」+「键盘十五键位终态表」两节 + C2 回写 ⑦ Deferred 三项终态**
- [x] C2 回写 ⑦ 已追加且初版裁决零改动；分析篇对照落字 → **C2 §3 回写 ⑦（执行记录 1）；分析篇 §4.4 对照 + §5 两行勘误 + §7 终态段（执行记录 2）**
- [x] 两维自查 + 样式契约自查 + 变更面核查记录落字（`packages/` 零改动） → **Phase 4 执行记录 3/4（`git diff -- packages/` 为空实测）**
- [x] 无品牌资产复制维持（e2e 无 "Airtable" 字样断言零回归） → **visual 01 副树文本断言零回归（17/17 绿）**
- [x] roadmap Phase Status 区 P6b 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` → **`planned` 已就位（2026-08-30 draft review）；`done` 翻转随 closure audit 收口（见 Closure 节）**
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 → **closure audit 通过（fresh session 独立子 agent 两轮）：R1 `ses_faf349015ffeR7LLlG3AimCygf` verdict `ISSUES`（3 Major：①schema 两处可见 text 文案含 "Airtable\_\_" 端点名——品牌边界违规；②plan/dev log 行数记录为未实测估计值（schema 4095 实 3769、css 800 实 796）——P6a R1 Major-1 同类；③Phase 2 五项接线 item 未勾选；1 Minor：Phase 1 中期行数标"终态"）→ 执行 session 全部修复（文案改写为"更新/新建端点会话库"并扩展浮层子树品牌断言至 e2e 06/08、行数按 live wc 刷新并加中期值注记、五项补勾+注记、Phase 1/2 中期值标注）→ R2 `ses_faf28ff66ffe3z64YF8uT7UiQI` scoped re-audit verdict **APPROVED** 零 Blocker/零 Major（1 Trivial cosmetic 已随收口修正；5/5 项 live 复核通过：品牌串/schema 行数/勾选完整性/中期值注记/回归复跑 322 单测 + 17 e2e 全绿）**
- [x] `pnpm typecheck` → **37/37 全绿**
- [x] `pnpm build` → **37/37 全绿**
- [x] `pnpm lint` → **37/37 全绿**
- [x] `pnpm test` → **68/68 任务全绿（playground 直接复跑 32 files / 322 tests 确认）**
- [x] 目标 e2e：`npx playwright test tests/e2e/airtable-replica-visual.spec.ts`（及拆分后的 interactions spec）全绿 → **visual 6/6 + interactions 11/11 = 17/17 全绿**

## Deferred But Adjudicated

（草案期无预登记项；执行期如有延期项按 Anti-Slacking Rule 在本节登记分类并写明 Why Not Blocking Closure——已确认的 live defect/contract drift/硬门禁失败项不得进入本节。）

## Non-Blocking Follow-ups

- 处置表显式裁决项中若发现 D1 产品化候选新增（超出分析篇 §7 两候选与 P6a Deferred #3 已登记面），随回写 ⑦ 登记素材行，不新开 work item
- `--at-*` 变量架构共享复刻基建抽取（P6a follow-up 沿袭）：不入本计划

## Closure

Status Note: 四个 Phase 全部 `completed`、Exit Criteria 全勾：Pi-b 义务收口（mock 写端点 3 个会话态 + 排序/分组/过滤助手 + opt-in 钩子；单页 schema 交互接线 A1/A5/A8/A9/A10/A11a/A11b 七项接线锁定 + A2/A3/A4/A6/A7/A13/A14/A15/A16 显式裁决，处置表与键盘十五键位终态表落字，无静默跳过）；P6a Deferred 三项收口；C2 回写 ⑦（append-only，初版裁决零改动）+ 分析篇 §4.4 对照 + §5 两行勘误；全量验证 full-green（typecheck/build/lint 37/37、test 68/68 任务 playground 32 files/322 tests、check exit 0 零新增红、目标 e2e 17/17）；`packages/` 零改动、mock-backend.ts 与其他 slug mock 零触碰、showcase-env 699/700 双口径零改动。执行期三项机制裁定实测修正（A5 候选② 会话端点、A11b 候选② dialog 内数据重载、A9 候选③ 实测成立）均落字；无 in-scope live defect 或 contract drift 被降级（R1 audit 3 Major 已修复并经 R2 APPROVED）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session ×2——R1 `ses_faf349015ffeR7LLlG3AimCygf`（全量审计，10 项 checklist）、R2 `ses_faf28ff66ffe3z64YF8uT7UiQI`（scoped re-audit）
- Evidence: R1 verdict `ISSUES`（3 Major：品牌串入可见文案 / 行数记录未实测 / Phase 2 五项未勾选；1 Minor：中期值标"终态"）→ 执行 session 全部修复 → R2 verdict **APPROVED** 零 Blocker/零 Major（1 Trivial cosmetic 随收口修正；5/5 项 live 复核通过：schema 品牌 grep 11 处全 URL 串、wc 三件精确匹配 3769/796/390、全 plan 勾选完整性（唯一未勾=本 gate 本体，现随本证据关闭）、中期值注记、回归复跑 unit 322 绿 + e2e 17 绿）；R1 checklist 通过项：变更面 In Scope（packages/ 零改动、showcase-env 零 diff）、写端点契约抽查（atEdit\* 优先/tail-insert/viewId 校验）、C2 回写 ⑦ append-only（单 hunk 纯追加）、分析篇纯追加、红绿数字落字、pnpm check 零 airtable 命中；收口记录见 `docs/logs/2026/08-30.md`（P6b 执行条目，unit + e2e 双全绿）

Follow-up:

- 处置表显式裁决项的 D1 产品化候选新增随回写 ⑦ 素材行登记（component:refresh form 句柄数据重载通道 / surface 写入域随开启位置 deep-audit 候选）；除此之外 no remaining plan-owned work
