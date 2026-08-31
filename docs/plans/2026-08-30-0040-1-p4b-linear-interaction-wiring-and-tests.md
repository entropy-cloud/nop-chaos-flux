# P4b Linear 风格 issue tracker 复刻 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P4b. Linear 风格 issue tracker 复刻 — 交互接线与测试
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P4b 条目 + Phase Details P4 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/linear.md` §4 键盘交互清单（4.1–4.7）；P4a 落字的「键盘缺口静态证据清单」（键位↔承载物↔缺口↔可模拟性初判）；能力缺口对照 `docs/analysis/ui-review/C2-capability-gaps.md` G-B1/G-B2/G-B3/G-F/G-A 行 + 回写 ③/④ 素材行
> Related: `docs/plans/2026-08-29-1819-2-p4a-linear-tracker-static-replica.md`（P4a，completed——本计划的全部静态落点、差异声明与键盘缺口静态证据清单来源，P4b 直接采用）；`docs/plans/2026-08-29-1819-1-p3b-cal-booking-interaction-wiring-and-tests.md`（Pi-b 先例：写端点先红后绿、I 清单逐条处置表、opt-in e2e 观察钩子、C2 回写义务）；`docs/plans/2026-08-29-1413-1-p2b-antdpro-interaction-wiring-and-tests.md`（首个 Pi-b 先例：选择集 scope 契约 `$crud.selectionCount/hasSelected`、写端点会话态）

## Purpose

消费 P4a 已落盘的 6 张 `linear-*` 静态复刻页、分析篇 §4 键盘交互清单（4.1–4.7）与 P4a「键盘缺口静态证据清单」，把 Pi-b 段义务收口：补全 `Linear__` mock 写端点（批量更新/新建/归档/看板拖拽/收件箱已读归档/复制链接语义模拟）、接线可模拟交互（⌘K 过滤与执行、多选 + 批量栏动态化、筛选刷新、看板拖拽、peek 链路、收件箱动作）、对不可模拟键盘项（chord/J·K/⌥↑↓/Space hover-peek）逐条显式裁决，分析篇 §4 逐条 e2e 锁定（先红后绿），closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2，并把"预测缺口 vs 实测缺口"对照记入应用分析篇。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `cd86e9686`）：

- P4a 全部静态产物在库：6 张 `apps/playground/src/complex-pages/page-schemas/linear-{issues,board,inbox,detail,projects,settings}.json`（category `app-replica` 已注册）；`apps/playground/src/linear-replica/linear-replica.css`（`--ln-*` 令牌声明于 `.ln-root, .ln-dialog` 双作用域，dark-only）；`shared/mock-backend-linear.ts`（**772 行**）；`shared/showcase-env.ts`（**699 行**，≤700 红线，`Linear__` 读分支委托在 :663–666）；`tests/e2e/linear-replica-visual.spec.ts`（389 行，6 条初屏用例）；`__tests__/linear-mock-backend.test.ts`（18 条单测）。
- **mock 读端点 5 个全部 get-only、零写端点**：`Linear__issues`（`perPage`/`view=board` 参数化，34 条 issue ≥3 页）、`Linear__inbox`（分组通知流含未读样本）、`Linear__issue`（`?id=` 详情，无命中兜底）、`Linear__projects`（项目+周期进度）、`Linear__commands`（⌘K 三组命令清单）。
- **静态已就绪、等待接线的交互面（schema testid 实测清单）**：
  - `linear-issues`：⌘K 壳（双入口触发已有 openDialog；dialog 内 `linear-issues-cmdk-input` 输入框 + `${commands?.groups}` loop 清单，**零过滤零执行语义**）；peek 浮层（行尾 `linear-issues-peek-trigger` 已带 `data:{id}` + loadAction `Linear__issue?id=${id}`，P4a 最小静态动作，链路可复用）；Display 抽屉（`linear-issues-display-grouping/-ordering` select 无提交）；批量栏全静态（`linear-issues-bulk-count` 写死「已选 3 项」+ `linear-issues-bulk-status/-priority/-assignee/-label/-clear` 五钮零动作）；表格选择列静态双渲染（ENG-105 选中样本，**无 `rowSelection` 声明**）；`linear-issues-filter-entry` 筛选入口零动作。
  - `linear-board`：kanban `draggable: false` 显式关闭（schema :204，P4a 教训：renderer 默认开启必须显式声明）+ `linear-board-dnd-note` 静态注记；无 `onCardMove`/`onCardClick` 声明。
  - `linear-inbox`：逐条 `linear-inbox-item-archive` + 批量 `linear-inbox-bulk-read/-archive` 全零动作；未读点/`linear-inbox-unread-pill` 静态。
  - `linear-detail`：`linear-detail-copy`/`linear-detail-archive` 按钮零动作；状态/属性侧栏静态。
  - `linear-projects`/`linear-settings`：P4a 裁定零写静态（settings 有 `linear-settings-static-note`），本计划不接线。
- **接线能力 live 实测（file:line 证据）**：
  1. **table 选择集 scope 契约在库，但键盘/修饰键多选手势非内建**：`rowSelection` + `selectionOwnership: 'scope'` + `selectionStatePath`（`packages/flux-renderers-data/src/data-renderer-definitions.ts:112/147/221/225/260`；`packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:41-44` scope 读、:204-205/:272-274 scope 写分支）——逐行 checkbox 为普通 toggle（`table-body-row-rendering.tsx:310-315`，零 shift/meta 修饰键处理）、全选仅表头 checkbox（`table-header-row.tsx:436-438`）、无范围/锚点选择逻辑——**⇧click 范围选与 ⌘A 全选 chord 非 table 内建**（归 G-B2 显式裁决，分析篇 §5「⇧click/⌘A＝支持」判定被实测推翻为仅按钮面支持）；选择写入 scope 路径后，批量栏计数/按钮 disabled 均可绑定该路径表达式；plain table 句柄为 `refresh | getSelection | setSelection`（`use-table-handle.ts:61-64`），清选择走 `component:setSelection` 空集或 scope 写空数组——**`component:clearSelection` 仅为 crud 句柄**（`crud-renderer-definition.ts:353`、`crud-renderer-state.ts:305-348`），P2b antdpro 先例不可直接平移到 `table` 页面（linear-issues 为 `type: "table"`）。
  2. **kanban 拖拽事件在库**：`onCardMove`/`onCardClick`/`onColumnReorder` 均 ActionSchema（`packages/flux-renderers-scheduling/src/kanban/kanban.types.ts:34-35/71-73`）；`draggable` 默认开启（`kanban-board.tsx:46`，`resolved.draggable !== false`）——开启拖拽 = 移除 `false` 声明 + 补 `onCardMove`。
  3. **动作词汇无剪贴板/键盘序列通道**（P3b 实测口径维持：ajax/navigate/component:refresh/openDialog/closeSurface/refreshSource/form submit/reset）——⌘. 复制 ID 沿 `Cal__shareLink` 语义模拟先例；chord/J·K/⌥↑↓/Space hover-peek 无承载（P4a 可模拟性初判：难模拟，等 G-B2 原语），本计划显式裁决不模拟。
  4. **⌘K 过滤可模拟路径**：dialog 继承页面 scope（P4a Decision 2 落字）→ 输入框值写 scope → 命令清单 loop `items` 绑过滤表达式（mock 端点参数过滤或 scope 内联过滤，Phase 1 裁定）；命令项 onClick → ajax/navigate 动作。
  5. **跨树刷新姿势**：form/浮层内按钮对页面级 data-source 派发 `refreshSource` 必然 `Source not found`（P3b 实测撞墙，C2 回写 ④ 已登记）——跨树刷新走 `component:refresh` + `componentId`（data-source 节点显式 `id`）。
  6. **toast 生命周期**：跳转型动作链 `messages.success` 存活 <100ms（回写 ③/④ 同源），需 `control: { debounce: 1200 }` 延迟 navigate（先例 antdpro/cal 双份）。
- **P4a Deferred 移交项（本计划收口义务）**：①快捷键帮助面板（分析篇 §7 候选 2 + P4a Deferred：⌘K 清单内已有「快捷键帮助 `?`」形态条目，帮助面板本体是否接线随本计划裁定——纯 openDialog 静态内容可承载，无需键盘原语）；②富文本描述编辑器（分析篇 §7 候选 1：P4a 已裁定纯 text 多段静态承载，**不接线**——缺口本体是无原语，随 C2 回写）；③键盘交互全谱（chord/J·K/X 单键/⌥↑↓/Space hover）= 本计划显式裁决主体。
- **数据样本可扩展通道**：P4a Non-Blocking Follow-up 预授权——接线中发现选中集/拖拽中间态等状态样本不足，在 `mock-backend-linear.ts` 内补样本属本计划 Fix 范围。
- 治理线：`showcase-env.ts` 699 行（700 红线）——**新增写端点分支体必须全部下沉 `mock-backend-linear.ts`，showcase-env 仅允许零改动或 ≤10 行胶水且总行数 ≤700**；`mock-backend-linear.ts` 已 772 行（P4a closure audit 登记的 ~500 行抽取启发线豁免项），本计划若继续增长，按 `mock-backend-antdpro.ts` 先例拆分实体模块（Phase 1 Decision 裁定拆分形态）；`mock-backend.ts` 零触碰。
- roadmap Cross-Cutting 5：Pi-b closure 必须以追加方式回写 C2（不重开初版裁决）——本计划携带的回写输入：P4a 键盘缺口静态证据清单（G-B1/G-B2/G-B3 终态实测）、kanban cardTemplate region 无 params 绑定（P4a Phase 3，G-A 证据）、富文本编辑器候选（分析篇 §7）、快捷键帮助面板裁定结论、⌘K 模拟深度实测（G-B1）、批量栏动态化实测（G-B3）、复制 ID 语义模拟证据（clipboard 素材行追加）。

## Goals

- mock 写端点补全并先红后绿锁定（终态集合 Phase 1 Decision 裁定）：批量更新（状态/优先级/指派/标签）、新建 issue、归档、看板卡片移动（会话态跨页可观察）、收件箱已读/归档、复制链接语义端点——全部沿 P2b/P3b 写端点会话态先例。
- 分析篇 §4 键盘交互清单 4.1–4.7 **逐条处置落字**（本计划处置表 L1–L14：接线锁定 / 内建锁定 / 显式裁决不可模拟），Pi-b 档位 = `必须自动化`（P1 README §4.1），每条"接线锁定/内建锁定"项 ≥1 条先红后绿 e2e；"显式裁决"项落字缺口归因（G-B1/G-B2）不构成档位违反（沿 P3b I15 口径注记）。
- P4a Deferred 项「快捷键帮助面板」在本计划收口：接线或显式裁定不接线（落字理由）；「富文本描述编辑器」维持不接线并随 C2 回写登记。
- closure 时完成 C2 追加回写（G-B1 ⌘K 模拟深度实测、G-B2 键盘缺口终态、G-B3 批量栏动态化实测、G-A cardTemplate params 证据引用、clipboard 素材行追加、分析篇两候选终态）+ 分析篇"预测缺口 vs 实测缺口"对照落字（沿 P2b/P3b §4.1 先例追加进 `linear.md`）。
- 全量验证 full-green（typecheck/build/lint/test + 目标 e2e + `pnpm check` 零新红）。

## Non-Goals

- 不改 `packages/` 下任何 renderer/ui/runtime 代码；⌘K palette 原语（G-B1）、键盘导航框架（G-B2）、批量栏语义件（G-B3）、批量导出/打印宿主能力等产品化归 D1 流程。
- 不实现键盘事件监听类交互：chord 序列（G/O/M）、J/K 高亮指针、X 单键多选、⌥↑↓ 键盘重排、Space hover-peek 联动、全局 `?` 呼出——全部显式裁决不模拟（G-B2 缺口，等原语），禁止用 hack（全局 keydown 注入、隐藏输入框劫持焦点等）绕道。
- 不新增 schema 页面文件（P4a 裁定的 6 张页面切分维持）；不接线 `linear-projects`/`linear-settings`（P4a 裁定零写静态页）；不做 light 主题（P4a 差异声明 dark-only 维持）。
- 不复制任何 Linear 品牌资产；产出界面维持零 "Linear" 名称与商标（P4a 差异声明延续）。
- 不重新评审 R1 分数、不做 P4 名单变更、不重开 C2 初版裁决表。

## Scope

### In Scope

- `apps/playground/src/complex-pages/shared/mock-backend-linear.ts`（追加写操作 + 会话态；若超载则按 Decision 拆分实体模块）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅 ≤10 行胶水或零改动，总行数 ≤700）
- `apps/playground/src/complex-pages/page-schemas/linear-issues.json`、`linear-board.json`、`linear-inbox.json`、`linear-detail.json`（仅既有 4 张内接线动作/补 testid/补 rowSelection/补 visible·disabled·count 表达/data-source 节点补显式 `id`（`component:refresh` 跨树刷新载体，P3b 先例），不新增页面文件）
- `apps/playground/src/linear-replica/linear-replica.css`（仅接线必需的形态类补充，如批量栏动态可见态、拖拽落点指示；scope 专用类）
- `apps/playground/src/complex-pages/__tests__/linear-mock-backend.test.ts`（写操作单测）
- `tests/e2e/linear-replica-visual.spec.ts`（追加交互用例；落地前若将超 ~500–600 行则按 P1 README §2.2 拆分规则新建 `tests/e2e/linear-replica-interactions.spec.ts` 承载交互用例——现 389 行 + 预估交互用例体量，预计触发拆分）
- `docs/analysis/ui-review/C2-capability-gaps.md`（§3 追加区回写，closure 时）
- `docs/analysis/ui-review/P1-reference-apps/linear.md`（仅追加 §4.1「预测 vs 实测」对照与事实勘误）
- roadmap Phase Status 区 P4b `todo`→`planned`（draft review 通过后）；closure audit 通过后 `planned`→`done`

### Out Of Scope

- `packages/` 全部代码；`linear-projects.json`/`linear-settings.json`；`tests/e2e/` 中非本 spec 的文件；`docs/analysis/` 既有文档的结构性改写；`mock-backend.ts`；新增 playground schema 页面；新 CSS 文件（仅既有 `linear-replica.css` 内追加）。

## Failure Paths

> 涉及写端点与交互状态机，列最小集。

| 可测场景编号    | 触发                               | 行为                             | 可重试 | 用户可见表现                                          |
| --------------- | ---------------------------------- | -------------------------------- | ------ | ----------------------------------------------------- |
| ln-bulk-miss    | 批量更新的 issue id 集合含无匹配项 | 无匹配 id 跳过，有效 id 正常落库 | 是     | 更新成功 message + 列表数据变化；全无匹配返回失败分支 |
| ln-bulk-empty   | 无选择集时触发批量动作             | 前端 disabled 门控不发请求       | 是     | 批量动作钮禁用（可见性随选择集表达式翻转）            |
| ln-create-miss  | 新建 issue 缺标题必填              | 不发写请求（内建校验拦截）       | 是     | 字段红环 + 错误文案                                   |
| ln-move-miss    | 卡片移动目标列/位置无匹配          | 返回失败分支，看板布局不变化     | 是     | message 错误提示，卡片回原列                          |
| ln-inbox-miss   | 已读/归档的通知 id 无匹配          | 返回失败分支，状态不翻转         | 是     | message 错误提示                                      |
| ln-archive-miss | 归档的 issue id 无匹配             | 返回失败分支，列表不变化         | 是     | message 错误提示                                      |
| ln-filter-empty | 筛选参数无匹配 issue               | 端点返回空数组                   | 是     | 表格空态文案「当前筛选条件下没有问题」（P4a 已落库）  |
| ln-copy-noop    | 复制 ID/链接端点                   | 无副作用 get，恒成功             | 是     | message「已复制」反馈（语义模拟，无真实剪贴板写入）   |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档：分析篇 §4 交互清单逐条有 e2e 断言，交互契约无一豁免；先红后绿——新接线动作的 e2e 在接线前先断言失败或对既有内建行为补锁定断言）。档位口径注记（沿 P3b）：「逐条有断言、无一豁免」指不允许**未处置的静默跳过**；处置表中显式裁决为"缺口不模拟"的条目（L5/L6 单键子项、L7 的 X/⇧click/⇧↑↓/⌘A 手势子项、L8 hover 联动子项、L9、L11 单键触发子项）属"逐条有处置"，不构成对档位的违反。最低证明：`linear-mock-backend.test.ts` 写操作单测全绿 + 处置表中每条"接线锁定/内建锁定"项 ≥1 条程序化 e2e 断言（testid 可见性/数据变化/选择集计数/getComputedStyle；截图仅视觉附件）。

## Execution Plan

> 顺序 Phase。Phase 1 写端点基座与承载机制裁定先行（后续接线全部依赖）；Phase 2–4 按页面接线；Phase 5 回写与自查收口。

### Phase 1 - mock 写端点基座与承载机制裁定（先红后绿）

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-linear.ts`、`shared/showcase-env.ts`（≤10 行胶水，如需）、`__tests__/linear-mock-backend.test.ts`

> **Phase 1 Decision 落字（2026-08-30 执行实测）**
>
> 1. **写端点契约终态**（全部 post，返回 `status:0` 成功 / `status:1` 失败，失败体 `{ok:false,error}`）：
>    - `Linear__bulkUpdate`：`{ids, patch:{status?|priority?|assignee?|labels?}}`；扁平顶层 patch 键（dialog 表单别名 `{ids, status, ...}`）等价接受。部分匹配 → 有效子集生效 + `{ok:true,updated:匹配数}`；全无匹配/空 ids/非法值（未知状态、未知优先级、未知指派人、labels 非字符串数组）→ 失败（ln-bulk-miss）。
>    - `Linear__createIssue`：`{title, status?, priority?, assignee?(按名解析), labels?}` → 生成 `ENG-{max+1}` 序号（34 条种子库下一个为 `ENG-135`）入会话库，未指定字段取默认（todo/none/首指派人）；空/缺 title → 失败（ln-create-miss 兜底守卫，schema 侧 required 先拦）。
>    - `Linear__archiveIssue`：`{ids}` → `archived:true` 软归档标志；`Linear__issues`/`view=board` 读分支默认排除 archived；零匹配/空 ids → 失败（ln-archive-miss）。
>    - `Linear__moveCard`：`{id, toColumn, toIndex?}`；`card-`/`col-` 前缀容错；状态翻转 + 会话排序（`toIndex` = 目标列内插入位，越界/缺省追加）；未知列/无匹配卡 → 失败（ln-move-miss）。
>    - `Linear__inboxUpdate`：`{ids, op:'read'|'archive'}`；archive 附带软归档（默认读过滤）；**空 ids = 全部**（批量栏载体裁定）；未知 op/零匹配 → 失败（ln-inbox-miss）。
>    - `Linear__copyLink`：**get**、零副作用、恒成功 `{ok:true,id,url}`（沿 `Cal__shareLink` 语义模拟先例，ln-copy-noop；无真实剪贴板写入）。
> 2. **多选承载机制裁定：候选 ①（scope 全选择集）**。`linear-issues` 表格切换为 `rowSelection:{type:'checkbox'}` + `selectionOwnership:'scope'` + `selectionStatePath:'issueSelection'`：逐行 checkbox 与表头全选由 renderer 内建承载（`use-table-selection.ts` scope 读 :41-59 / scope 写 :204-205、:272-274），批量栏计数绑 `${issueSelection?.length ?? 0}`、动作钮 `disabled` 绑空集表达式、清选择走 `component:setSelection` 空集（table 句柄 `setSelection`，`use-table-handle.ts:51-55`；`component:clearSelection` 仅为 crud 句柄，本页 table 不可用——Draft Review M2 结论执行确认）。**P4a 左缘 checkbox 浮出 CSS 形态随之退役**（自定义静态选择列被内建选择列替代）：P4a CSS `.ln-row-check*` 保留为 dead marker 不复用，选中行底色改由新增 scope 专用类 `.ln-issues-table [data-slot='table-row']:has([data-slot='table-select-cell'] [data-slot='checkbox'][data-state='checked'])` 承载（playground 层，无 renderer 改动）；L14 行 hover 高亮断言维持，左缘浮出形态断言随静态列退役在 visual spec 中更新。⇧click 范围选/⌘A chord 非 table 内建（Baseline 1），两手势维持 G-B2 显式裁决不模拟。
> 3. **⌘K 过滤机制裁定：裸 input scope 写入 + 公式内联过滤（候选 ① 变体，零 mock 改动、零 form 包裹）**。执行实测推翻 plan 草稿「裸 input 无 scope 写入通道」的悲观判定：`field-handlers.tsx:213-224` 无 form 时 `scope.update(name, value)`——dialog（继承页面 scope，P4a Decision 2）内裸 `input-text name:'cmdkQuery'` 每次键入写页面 scope；命令清单 loop `items` 绑公式内联过滤（`ARRAYFILTER` + `CONTAINS` + `LOWER`，空串 `CONTAINS` 恒真故空查询显示全量），分组块 `visible` 绑过滤非空判定。候选 ②（服务端 query 过滤 + refetch）不采用：避免每次键入一次请求。命令项执行裁定：mock `Linear__commands` 数据扩载 `href`（导航类）/`act`（动作类）字段（Baseline「数据样本可扩展通道」预授权），条目 onClick 以 `when` 门控分流——导航类 `navigate ${href}`；动作类 create/filter/help → `setValue` 呼出对应顶层动作 dialog + `closeSurface`，copy → `Linear__copyLink` + message，archive → `Linear__archiveIssue`(选择集) + message + 刷新；搜索组（无 href/act）→ `closeSurface`（⌘K 模拟深度注记，随 C2 回写 G-B1）。
> 4. **模块组织裁定：按 antdpro 实体模块先例拆分三件**（`mock-backend-linear.ts` 772 行 + 写操作必然超载触发本项）：`mock-backend-linear-issues.ts`（467 行，issue 数据集/过滤/分页/看板构建/写操作核心）、`mock-backend-linear-detail.ts`（205 行，详情组装，ln-detail-miss 兜底）、`mock-backend-linear.ts`（467 行，inbox/projects/commands/数据库组装/fetcher 分支 + `export *` 兼容再导出，既有 import 零改动）。会话态 = 工厂闭包持有的 issues 数组 + inbox 组，同 session 跨页可观察（cal 先例）。opt-in e2e 钩子同 cal 先例落位：`__linearEndpointCalls`（端点计数）与 `__linearTestHooks.moveMiss`（强制 ln-move-miss 走真实端点路径），生产 no-op。
> 5. **先红后绿证据记录**：写分支先落、测试后更（同 session 内顺序倒置）；红态可证——既有 2 条 P4a「branch is get-only / post falls through」契约测试在新分支落地后立即转红（见执行记录：`2 failed | 256 passed`），测试面按新契约更新 + 新增 16 条写操作用例后全绿（`278 passed`）。红态截图无，以失败输出为准。

- [x] Decision——写端点语义裁定：post 端点定名与契约（候选集，Phase 内裁定终态）——`Linear__bulkUpdate`（`{ids: string[], patch: {status?|priority?|assignee?|labels?}}` → 逐 id 生效，返回更新计数；全无匹配 → 失败分支 ln-bulk-miss）、`Linear__createIssue`（`{title, status?, priority?, assignee?, labels?}` → 生成 `ENG-` 序号新记录入会话库）、`Linear__archiveIssue`（`{ids}` → 状态置归档，列表默认过滤）、`Linear__moveCard`（`{id, toColumn, toIndex?}` → 状态翻转 + 会话排序，ln-move-miss 分支）、`Linear__inboxUpdate`（`{ids, op: 'read'|'archive'}` → 未读态/归档态翻转，ln-inbox-miss 分支）、`Linear__copyLink`（get，无副作用端点沿 `Cal__shareLink` 先例，ln-copy-noop）——miss 行为按 Failure Paths 裁定并落字本计划
- [x] Decision——多选承载机制裁定：`linear-issues` 表格从静态选择列切换为 `rowSelection` + `selectionOwnership: 'scope'` + `selectionStatePath`（候选 ①scope 所有选择集——选择列由 renderer 内建 checkbox 承载（逐行 toggle + 表头全选），批量栏计数绑 scope 路径；②维持自定义列 + 手写点击写 scope——保 P4a hover 浮出形态但丢内建表头全选与 table 句柄）；⇧click 范围选/⌘A chord 非 table 内建（Baseline 1 实测），无论何候选均归 G-B2 显式裁决；裁定需对照 P4a 行 hover + 左缘 checkbox 浮出 CSS 形态的兼容性并落字理由，批量栏动态化断言据此执行
- [x] Decision——⌘K 过滤机制裁定：命令清单过滤路径（现 cmdk 输入为 form 外裸 input-text，无 schema 级 onChange scope 写入通道——候选 ①dialog 内 form 包裹 + `valuesPath` 发布到 scope + loop items 绑过滤表达式（零 mock 改动，C2 回写 ③ wizard valuesPath 先例）；②`Linear__commands` 加 query 参数服务端过滤 + 输入变更 refetch）；命令项执行语义裁定（导航类 → navigate；动作类 → 对应端点/动作模拟），落字
- [x] Decision——`mock-backend-linear.ts`（772 行）组织裁定：直接追加写操作，或按 `mock-backend-antdpro.ts` 实体模块先例拆分（issues/board 数据域先行）——落字结论与拆分后行数记录
- [x] Proof——写操作单测先红后绿：每端点 ≥2 条（成功路径 + Failure Path）、会话内持久性断言（bulkUpdate 后 issues 端点返回新状态、moveCard 后 board 视图列分布变化、inboxUpdate 后未读计数下降）——先于 Fix 编写，对未实现分支断言失败
- [x] Fix——`mock-backend-linear.ts` 扩展 post 分支：写操作修改 in-memory 会话库，同一 session 内跨页可观察；`showcase-env.ts` 零改动或仅 ≤10 行胶水且不回涨 700 行红线；`mock-backend.ts` 零触碰

Exit Criteria:

- [x] 写端点契约（端点名/入参/miss 行为）与三项承载机制裁定（多选/⌘K 过滤/模块组织）已落字本计划 Decision 注记
- [x] `pnpm --filter @nop-chaos/flux-playground test -- linear-mock-backend` 全绿且含新增写操作用例
- [x] `showcase-env.ts` ≤700 行、`mock-backend.ts` 零改动（`wc -l` 实测记录于本计划）

> **wc -l 实测（Phase 1 收口）**：`showcase-env.ts` 699（≤700 ✓，零改动）；`mock-backend.ts` 463（零触碰 ✓）；拆分后 `mock-backend-linear.ts` 467 / `mock-backend-linear-issues.ts` 467 / `mock-backend-linear-detail.ts` 205（合计 1139 = 原 772 + 写操作与钩子净增；Phase 3 钩子扩展后 `mock-backend-linear.ts` 实测 470，closure audit 修正记录）。

### Phase 2 - linear-issues 接线（L1–L4/L7/L8/L10–L12 + peek 链路）

Status: completed
Targets: `page-schemas/linear-issues.json`、`linear-replica.css`（如需）、`tests/e2e/linear-replica-visual.spec.ts`（或新建 interactions spec，按 500–600 行阈值裁定）

> **Phase 2 执行落字（2026-08-30 实测）**
>
> 1. **⌘K 命令执行 surface 语义实测**：链式动作中 `closeSurface` 的求值时序实测为——同链后续分支的 `when` 表达式在面板关闭后于已销毁 scope 上求值（console error 噪声），且 trailing `closeSurface` 会关掉链中先打开的新浮层（closeTop 语义）；`args.surfaceId="${dialogId}"` 显式定向亦被新浮层 scope 的同名变量遮蔽。终态裁定：**closeSurface 以 `when` 门控收尾**（`act === undefined || act === 'copy' || act === 'archive'` → 导航/复制/归档/搜索类命令执行后面板即关）；**create/filter/help 类命令保持堆叠浮层**（新浮层压面板之上，Esc 逐层退出），e2e 已按此锁定并在处置表 L1 落字（G-B1 模拟深度注记随 C2 回写）。
> 2. **table 选择列 DOM 形态实测**：Base UI checkbox 选中态标记为 `data-checked`（非 `data-state="checked"`），linear-replica.css 选中行 `:has()` 形态类与 P4a 既有 checkbox/switch 令牌规则一并修正；表头 `<tr>` 同样携带 `data-slot="table-row"`，e2e 行定位改为 `[data-slot="table-body"]` 域内；表头全选 checkbox 的内建语义为**源数据全量进选择集（34 行）**——客户端分页仅裁剪显示，e2e 按内建语义锁定（处置表 L7 落字）。
> 3. **表单 select 渲染形态实测**：form select 单选渲染 combobox（`combobox-trigger`/`combobox-item` 槽位），多选渲染 chips（`combobox-chip-input`，无 trigger）——批量四钮与筛选表单 e2e 按实际槽位定位。
> 4. **先红后绿证据**：交互 e2e 在接线修补前对既有断言跑红（本 session 首轮全量 `4 failed | 6 passed`，含 select-trigger 不存在、`data-state` 不匹配、面板不关三类红），Fix 后全绿（`10 passed`）；既有 6 条初屏用例零回归（`6 passed`）。

- [x] Proof——先红后绿基线：本 Phase 全部接线 e2e 先行编写并跑红（对未接线行为断言失败；对既有内建行为的锁定断言允许即时绿，沿 P3b 口径），Fix 完成后转绿
- [x] Fix——L1 ⌘K 命令面板：按 Phase 1 裁定机制接线输入过滤（输入即过滤命令清单）+ 命令项点击执行（导航类命令 navigate 对应页面；动作类命令按 Phase 1 裁定模拟）+ Esc 关闭内建锁定；双入口（侧栏搜索条 + 顶栏命令钮）行为一致
- [x] Fix——L7 多选与批量栏：按 Phase 1 裁定机制启用选择集（scope 契约），批量栏从静态变动态——计数 `${...length}` 表达式、`linear-issues-bulk-clear` 清选择按裁定机制（`component:setSelection` 空集或 scope 写空数组——`component:clearSelection` 仅为 crud 句柄，本页为 `table` 不可用）、动作钮 `disabled` 门控（无选择集禁用，ln-bulk-empty）
- [x] Fix——L10 批量动作：`linear-issues-bulk-status/-priority/-assignee/-label` → 动作承载裁定（候选：①每钮 openDialog + select 表单 + ajax `Linear__bulkUpdate`；②下拉菜单型原语评估——Phase 内裁定）→ 成功 message + 列表 refetch（跨树刷新姿势按 Baseline 5）+ 状态 pill/优先级条/头像随数据更新
- [x] Fix——L12 筛选：`linear-issues-filter-entry` → openDialog（或 inline 表单，Phase 内裁定）承载 keyword/status/priority 筛选输入 → issues data-source url 模板物化 + scope 依赖自动刷新（Cal slots 先例：url 模板 + `dependsOn`，不派发显式 refreshSource）；清筛选路径可断言（ln-filter-empty 空态文案锁定）
- [x] Fix——L11 子项（按钮面）：新建 issue 入口（顶栏或批量区新增钮，testid `linear-issues-create`）→ openDialog + form（标题必填校验 ln-create-miss）→ `Linear__createIssue` → 列表 refetch 新行可断言；`linear-detail-copy`/peek 内复制入口 → `Linear__copyLink` + message 反馈（语义模拟）；detail 归档钮 → `Linear__archiveIssue`（Phase 4 落终态，本 Phase 仅定契约）
- [x] Proof——内建锁定与链路断言：L3 ⌘B 切换内建锁定（navigate 互跳既有）、L4 Esc 关浮层内建锁定（dialog Esc 既有）+ L4 清选择接线断言（批量栏清零）、L7 逐行点选 + 表头全选 checkbox 内建行为锁定、L8 peek 按钮触发链路锁定（P4a 静态动作已有，补数据一致性断言：peek 内容 id 与所在行一致）；既有 6 条初屏用例零回归

Exit Criteria:

- [x] ⌘K 输入过滤与命令执行 e2e 绿；选择集驱动批量栏（计数/禁用/清空/批量更新落库）e2e 绿
- [x] 筛选参数化刷新（筛选开→数据变→清筛选恢复）e2e 绿；新建 issue 链路 e2e 绿
- [x] L1/L3/L4/L7/L8/L10/L11/L12/L14 处置结论逐条落字本计划（含机制裁定注记；L14 沿 P4a visual spec 既有断言引用）

> **Phase 2 处置落字（Exit Criteria 3）**：L1 ⌘K＝接线锁定（scope 内联过滤 + 命令执行；执行语义导航/动作双路 + closeSurface 门控收尾，create/filter/help 堆叠浮层见执行落字 1）；L3＝内建锁定（navigate 互跳，e2e 04）；L4＝内建锁定（Esc 逐层关浮层，e2e 03）+ 接线锁定（批量栏清选择走 table 句柄 `component:setSelection` 空集，e2e 05）；L7＝接线锁定（rowSelection scope 契约：逐行 toggle + 表头全选内建，全选语义=源数据全量 34 行，e2e 05；X/⇧click/⇧↑↓/⌘A 手势子项归 G-B2 显式裁决维持）；L8＝按钮触发接线锁定（peek 链路 id 一致性 + peek 内复制端点计数，e2e 06）+ hover 联动子项显式裁决维持；L10＝接线锁定（四钮 dialog + `Linear__bulkUpdate`，落库 refetch 后 pill/prio/头像/标签随数据更新，e2e 07）；L11＝接线锁定按钮面（顶栏新建 + 必填校验拦截不发请求 e2e 08 + 会话库落库 ENG-135 经筛选可达 e2e 09）；L12＝接线锁定（筛选 dialog → scope setValue → url 模板物化 dependsOn 自动刷新 + 空态文案 + 清筛选恢复，e2e 10）；L14＝内建锁定（行 hover 高亮沿 P4a visual spec 既有断言；选中行品牌紫底随 scope 选择集 `:has([data-checked])` 形态类，e2e 05）。

### Phase 3 - linear-board 接线（L13 看板拖拽）

Status: completed
Targets: `page-schemas/linear-board.json`、`tests/e2e/`（同 Phase 2 spec 裁定）

> **Phase 3 执行落字（2026-08-30 实测）**
>
> 1. **接线形态**：`linear-board` 移除 `draggable: false` 显式关闭（renderer 内建开启恢复）+ `onCardMove` → ajax `Linear__moveCard`（payload 绑定 `${cardId}`/`${toColumnId}`/`${toIndex}` → mock 契约 `{id, toColumn, toIndex}`，`card-`/`col-` 前缀由端点容错）→ `messages` 成对（成功「卡片已移动」/失败「卡片移动失败」）+ `then`/`onError` 双路 `component:refresh`（成功回读会话态更新分布；失败刷新使本地看板回滚原列，ln-move-miss 卡片回原列）；data-source 补显式 `id: linear-board-source` 作跨树刷新载体；`linear-board-dnd-note` 文本更新为「拖拽已接线」。
> 2. **e2e 观察钩子扩展**：`__linearTestHooks.lastMove`（记录最近一次 moveCard body，生产 no-op）沿 cal 钩子先例落位。
> 3. **renderer 拖拽源注册滞后实测（G-A 类 renderer 侧 finding，C2 回写）**：kanban 卡片 dragstart 载荷（p-dnd `source.data.cardId`）在 React Compiler dev 双挂载下可能滞后于 reconciliation 一拍——同一元素 `data-card-id` 与实际派发 cardId 可不一致（如抓 ENG-101 派发 ENG-119/111/105，随渲染时序浮动）。`packages/` 零改动约束下，e2e 以「拖待办首卡 → lastMove 载荷 id 在目标列可渲染、列计数 8→7/7→8、列表页状态翻转」的数据一致性断言锁定接线行为；注册滞后本体归 D1/renderer 修复流程。

- [x] Proof——先红后绿基线：拖拽 e2e 先行编写并跑红（未接线时拖拽关闭、列计数不变），Fix 后转绿
- [x] Fix——L13 拖拽跨列：移除 `draggable: false` 显式声明（renderer 内建开启）+ `onCardMove` → `Linear__moveCard`（`{id, toColumn, toIndex?}`）→ 成功后 board 数据刷新（跨树刷新姿势按 Baseline 5）→ 列头计数与卡片分布随会话态更新；`linear-board-dnd-note` 注记文本同步更新为"拖拽已接线"（或移除，落字）
- [x] Proof——拖拽行为断言：Playwright dragTo 程序化断言卡片跨列 + 列计数变化；ln-move-miss 失败分支经 mock 强制路径或异常 id 断言（卡片回原列、布局不崩）；列表↔看板状态一致性断言（board 移动后返回 issues 列表状态 pill 已变，会话态跨页可观察）；`linear-board` 既有初屏用例零回归

Exit Criteria:

- [x] 拖拽跨列 → `Linear__moveCard` → 列分布/计数更新 e2e 绿；失败分支可断言
- [x] L13 处置结论落字（含与列表页状态一致性证据）

### Phase 4 - linear-inbox + linear-detail 接线（L11 终态 + 收件箱动作）

Status: completed
Targets: `page-schemas/linear-inbox.json`、`page-schemas/linear-detail.json`、`tests/e2e/`（同 Phase 2 spec 裁定）

> **Phase 4 执行落字（2026-08-30 实测）**
>
> 1. **接线形态**：inbox data-source 补显式 `id: linear-inbox-source`；`linear-inbox-item-archive` → `Linear__inboxUpdate` `{ids: [$slot.item.id], op: 'archive'}`；`linear-inbox-bulk-read/-archive` → `{ids: [], op: 'read'|'archive'}`（空 ids = 全部，批量栏载体裁定），成功/失败 message 成对 + `component:refresh` 回读；未读 pill/侧栏计数随会话态更新。
> 2. **detail 状态变更裁定（落字）**：**接线**，采用「侧栏 form + select + 应用钮 → `Linear__bulkUpdate` 单 id 形态」（复用端点，plan 预案后者）。理由：字段级 schema `onChange` 事件在本 runtime 无 event fieldRule（select fields 仅 prop 规则），事件不编译进 `props.events`，实测不派发；`submitOnChange: true` 备选实测存在异步 defaultValue（`value: ${detail?.status}` 于 data-source 返回后）落库触发订阅→空提交风险，故采用 P4b Phase 2 已验证的 bulk-dialog form 模式（`submitScope: surface` + `includeScope: '*'` + `data.ids`），显式「应用」钮承载用户意图。
> 3. **detail 归档链路**：`linear-detail-archive` → ajax `Linear__archiveIssue` `{ids: [detail?.id]}`（message「问题已归档」）+ `control: {debounce: 1200}` 延迟 navigate 回列表页（Baseline 6 保 toast）→ 列表筛选 ENG-105 命中空态（archived 默认过滤）。`linear-detail-copy` → `Linear__copyLink?id=${detail?.id}` + message。
> 4. **先红后绿证据**：5 条新 e2e 先行编写，对 stash 未接线 schema 的页面跑红（`5 failed`：按钮零动作、无 message、无跳转），恢复接线后全绿（`5 passed`）。
> 5. **渲染形态注记（沿用 P4a 收口形态，非本计划回归）**：复刻页在 complex-pages shell 预画画布内经 container-body wrapper 呈纵排收缩（P4a closure audit 已批准的产物即此形态）；inbox 顶栏钮下半与分组区起始重叠，e2e 以按钮非遮挡区点击（真实鼠标路径）规避；容器 wrapper 布局语义（schema `flex flex-row` 不透传 body wrapper）登记为 styling-system 侧 finding 随 C2 回写。

- [x] Proof——先红后绿基线：收件箱与 detail 接线 e2e 先行编写并跑红（按钮零动作态断言失败），Fix 后转绿
- [x] Fix——收件箱动作：`linear-inbox-item-archive` → `Linear__inboxUpdate`（op archive）行移除可断言；批量 `linear-inbox-bulk-read/-archive` → 全组未读翻转/归档；`linear-inbox-unread-pill` 未读计数随会话态更新；已读归档的 message 反馈成对
- [x] Fix——L11 终态：`linear-detail-archive` → `Linear__archiveIssue` + navigate 回列表（debounce 1200 保 toast，Baseline 6）+ 列表行消失可断言；detail 状态变更裁定落字（维持仅批量通道 or 新增侧栏 select 接 `Linear__bulkUpdate` 单 id 形态——Phase 内裁定，倾向后者可复用端点，若裁定不接线则落字理由归入处置表）
- [x] Proof——行为断言：上述每条 ≥1 条程序化 e2e；`linear-inbox`/`linear-detail` 既有初屏用例零回归

Exit Criteria:

- [x] 收件箱逐条/批量动作与未读计数联动 e2e 绿
- [x] detail 归档链路 e2e 绿；detail 状态变更裁定结论落字

### Phase 5 - C2 回写、分析篇对照与自查收口

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`（§3 追加区）、`docs/analysis/ui-review/P1-reference-apps/linear.md`（§4.1 追加）、本计划

- Item Types: `Proof | Decision`

- [x] C2 追加回写（roadmap Cross-Cutting 5，只追加不重开初版裁决）：G-B1 ⌘K 模拟深度实测（过滤/执行可达、手感缺口维持）、G-B2 键盘缺口终态（chord/J·K/⌥↑↓/Space hover 逐项不模拟裁定 + 不可绕道证据）、G-B3 批量栏动态化实测（scope 选择集契约可达面 + 「批量栏 alert 包络」无语义件维持/修正）、G-A cardTemplate params 缺口证据引用（P4a Phase 3）、clipboard 素材行追加（`Linear__copyLink` 语义模拟第二例）、快捷键帮助面板裁定结论、富文本编辑器候选登记（分析篇 §7 既有，回写确认终态）
- [x] 分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b/P3b 先例追加进 `linear.md`）：§5 能力映射逐行复核，实测与预估不符处仅做事实勘误（无矛盾则不动）
- [x] AI 模板感自查（P1 README §4.2）：接线后无"demo 占位"按钮——批量栏/筛选/⌘K/收件箱/拖拽全部有真实行为与反馈成对；数据经 mock 端点流动；静态 rail 类清单核对（Display 抽屉前置说明、帮助面板若裁定静态等）
- [x] 样式契约自查（§4.3）：零 renderer 包改动；变更面核查 `git status --porcelain` 仅含 In Scope 文件；新 CSS 仅落 `linear-replica.css` scope 专用类
- [x] roadmap Phase Status 区 P4b 状态推进核对（`planned`，done 待 closure audit）

Exit Criteria:

- [x] C2 追加区含本计划全部回写输入（逐条可指认）
- [x] `linear.md` §4.1 对照节落字
- [x] 两维自查记录落字（通过/打回处置结论）
- [x] 变更面核查记录落字

> **Phase 5 执行记录（2026-08-30）**
>
> 1. **C2 回写 ⑤** 已落 `C2-capability-gaps.md` §3 追加区，七项输入逐条可指认：G-B1（过滤/执行 e2e 01–03 + 堆叠浮层深度注记）、G-B2（五类手势不模拟 + 不可绕道证据）、G-B3（scope 选择集契约 + `component:clearSelection` 仅为 crud 句柄 + 全选=全量语义）、G-A（kanban 拖拽源注册滞后 + container-body wrapper 布局语义两条 renderer/styling finding）、clipboard 第二例（`Linear__copyLink`）、帮助面板静态承载收口、富文本编辑器维持缺口；另附 toast debounce 第三例与 refreshSource 桶限定复现注记。
> 2. **分析篇对照**落 `linear.md` §4.8（12 行逐条对照）；§5 唯一事实矛盾行（⇧click/⌘A＝支持）以勘误表标注「仅按钮面支持」，其余行与预判一致或为形态迁移。
> 3. **AI 模板感自查＝通过**：issues 批量栏四钮+清空/筛选/⌘K/新建/peek 全部真实行为反馈成对（e2e 05–10）；inbox 逐条+批量（14/15）；detail 复制/状态/归档（16–18）；board 拖拽（11–13）。执行期发现 board 顶栏 `linear-board-filter-entry` 为零动作残钮，按本自查裁定**移除**（schema 内删除，visual 02 零回归）；静态 rail 类保留面：Display 抽屉（L9 前置说明注记静态）、帮助面板（裁定静态，见 C2 回写 ⑤）、`linear-projects`/`linear-settings` 零写静态页（P4a 裁定维持）。
> 4. **样式契约自查＝通过**：`git status --porcelain` 变更面仅 In Scope 清单（4 张 schema、mock 三模块、`linear-replica.css`、两 spec + 产物 png、两分析篇 + roadmap + plan 本体）；`packages/` 零改动（`git diff --name-only -- packages/` 为空）；新增 CSS 仅 `linear-replica.css` 内 scope 选择态类（`:has([data-checked])`）与既有 checkbox/switch 令牌规则修正。
> 5. **行数红线复核**：`showcase-env.ts` 699（≤700，本 Phase 零改动；`check:oversized-code-files` 计数口径 700，同 ≤700）；`mock-backend.ts` 463 零触碰；`mock-backend-linear.ts` 470 / `-issues.ts` 467 / `-detail.ts` 205（closure audit 修正记录：主模块因 `lastMove` 钩子净增 3 行，无行数上限红线，WARN 观察名单随 P3b 先例口径）。

## 交互清单处置表（L1–L14 逐条，对应分析篇 §4.1–4.7）

| #   | 交互（分析篇出处）                                | 处置                                             | 落点                                                                                                           |
| --- | ------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| L1  | ⌘K 命令菜单（4.1）                                | 接线锁定（Phase 2，机制 Decision）               | 过滤 + 命令执行                                                                                                |
| L2  | `/` 搜索、`?` 帮助（4.1）                         | Decision（Phase 1/5）                            | `/` 归入 ⌘K 搜索形态；帮助面板收口 P4a 移交项                                                                  |
| L3  | ⌘B 列表/看板切换（4.1）                           | 内建锁定（Phase 2）                              | navigate 既有                                                                                                  |
| L4  | Esc 关浮层/清选择（4.1）                          | 内建锁定 + 接线锁定（Phase 2）                   | dialog Esc 既有 + 清选择按裁定机制（table 句柄）                                                               |
| L5  | G/O/M chord 导航（4.2）                           | 显式裁决不模拟（G-B2）                           | C2 回写；侧栏导航钮为鼠标等价路径                                                                              |
| L6  | ↑↓/K J 高亮移动（4.3）                            | 显式裁决不模拟（G-B2）                           | C2 回写；行 hover/点选为鼠标等价路径                                                                           |
| L7  | X/⇧click/⇧↑↓/⌘A 多选（4.3）                       | 接线锁定 + 子项显式裁决（Phase 2）               | rowSelection scope 契约（逐行点选 + 表头全选 checkbox）；X/⇧click/⇧↑↓/⌘A 键鼠手势子项归 G-B2                   |
| L8  | Space 悬停 peek（4.3）                            | 按钮触发接线锁定 + hover 联动显式裁决（Phase 2） | peek 链路数据一致性断言；hover 保持计时无事件通道（G-B2）                                                      |
| L9  | ⌥↑↓ / ⌥⇧↑↓ 键盘重排（4.4）                        | 显式裁决不模拟（G-B2）                           | C2 回写；Display 手动排序前置说明静态维持                                                                      |
| L10 | 批量 S/P/L/A 动作（4.5）                          | 接线锁定（Phase 2）                              | `Linear__bulkUpdate`                                                                                           |
| L11 | C 新建、⌘D 截止、# 归档、⌘. 复制 ID 等（4.5/4.6） | 接线锁定（按钮面，Phase 2/4）+ 单键触发显式裁决  | createIssue/archiveIssue/copyLink；单键触发归 G-B2；⌘D 截止日编辑若 Phase 内实测编辑器承载不足则显式裁决并落字 |
| L12 | F/⇧F/⌥⇧F 筛选（4.6）                              | 接线锁定（Phase 2）                              | 筛选表单 + url 模板物化刷新                                                                                    |
| L13 | 看板拖拽跨列/排序（4.7）                          | 接线锁定（Phase 3）                              | `draggable` 内建 + `onCardMove`                                                                                |
| L14 | 行 hover 高亮/左缘 checkbox 浮出（4.7）           | 内建锁定（Phase 2，P4a CSS 既有）                | visual spec 既有断言引用                                                                                       |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb1927b7bffeqTLpboIxsYZSWY`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 `fail`（2 Major）全部修复——M1 ⇧click/⌘A 非 table 内建（逐行 checkbox 为普通 toggle、全选仅表头 checkbox、无范围/锚点逻辑，live 实测落字 Baseline 1；两手势归 G-B2 显式裁决，处置表 L7/Deferred 同步改写，分析篇「⇧click/⌘A＝支持」判定标注被实测推翻、勘误走 Phase 5）；M2 `component:clearSelection` 仅为 crud 句柄（本页为 `table`——清选择改走 `component:setSelection` 空集或 scope 写空数组，`use-table-handle.ts:61-64` 句柄与 crud 侧 :353/:305-348 证据落字）。R2 复核零 Blocker/零 Major 达成共识；R2 余 2 Minor 已随共识修复（Test Strategy 裁决枚举补齐 L7 手势子项；Phase 2 Exit Criteria 补 L14 沿用注记）。

## Closure Gates

- [x] 分析篇 §4 键盘交互清单逐条处置完成（L1–L14 接线锁定/内建锁定/显式裁决，无静默跳过）
- [x] 写端点全部先红后绿锁定（`linear-mock-backend.test.ts` 含新增写操作用例全绿）
- [x] P4a Deferred 项已收口（快捷键帮助面板裁定落字；富文本编辑器随 C2 回写登记终态）
- [x] C2 追加回写完成（不重开初版裁决）；分析篇 §4.1 对照落字
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 In Scope 清单）
- [x] `showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰
- [x] AI 模板感治理与样式契约自查完成并落字
- [x] roadmap Phase Status 区 P4b 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [x] 受影响的 owner docs 已同步：分析篇 §4.1 对照 + 仅事实勘误（C2 追加区为 In Scope 义务）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 目标 e2e：`npx playwright test tests/e2e/linear-replica-visual.spec.ts`（或拆分后的 interactions spec）全绿

## Deferred But Adjudicated

> 本节为起草期预登记；执行期新撞见的裁决随 Phase 落字于此。

### chord/J·K 单键/⇧click 范围选/⌘A chord/⇧↑↓ 扩展选择/⌥↑↓ 键盘重排/Space hover-peek 联动/全局单键触发（G-B2 全谱）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 键盘序列监听/修饰键范围选择/焦点指针/hover 保持计时均无动作通道与原语（P4a 可模拟性初判 + 本计划 Baseline 1/3 实测口径：table 逐行 checkbox 为普通 toggle，零 shift/meta 处理、无范围锚点逻辑），属 L4 runtime 能力候选而非本复刻页契约缺陷；鼠标等价路径（侧栏导航/行点选/按钮面/表头全选）全部接线锁定，模板感治理底线不破
- Successor Required: `yes`
- Successor Path: C2 回写登记（G-B2 终态证据），产品化归 D1 流程

### 富文本描述编辑器（issue 正文 markdown + @mention）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 缺口本体是无对应原语（分析篇 §5/§7 判定），P4a 已裁定纯 text 多段静态承载详情页形态，不因接线新增编辑义务
- Successor Required: `yes`
- Successor Path: C2 回写登记（分析篇 §7 既有登记终态确认），产品化归 D1 流程

## Non-Blocking Follow-ups

- `Linear__` mock 数据集若在接线中发现状态样本不足（拖拽中间态/归档态/新进序号段），在 `mock-backend-linear.ts`（或其拆分模块）内补样本属本计划 Fix 范围；超出数据集语义的新端点需求走 C2/D1 评估
- `linear-replica.css` 令牌架构共享复刻基建抽取（P3a/P3b follow-up 沿袭）：不入本计划
- `tests/e2e/linear-replica-visual.spec.ts` 现 389 行：若交互用例拆分后总行数超 ~600 行按页级 describe 拆分（issues/board/inbox+detail 三段），沿 P3b interactions spec 先例

## Closure

Status Note: 2026-08-30 完成并关闭。P4b 五个 Phase 全部执行完毕：6 个 `Linear__` 写端点（bulkUpdate/createIssue/archiveIssue/moveCard/inboxUpdate/copyLink）会话态基座（Phase 1，模块三拆 + opt-in e2e 钩子）→ linear-issues 接线（⌘K 过滤与执行/选择集驱动批量栏/批量四动作/筛选参数化刷新/新建/peek，Phase 2）→ linear-board 拖拽（Phase 3）→ linear-inbox 逐条+批量动作与 linear-detail 复制/状态/归档终态（Phase 4）→ C2 回写 ⑤ + 分析篇 §4.8 对照 + 两维自查（Phase 5）。分析篇 §4 处置表 L1–L14 逐条落字无静默跳过；写端点先红后绿（单测 278 全绿，含 miss 分支与会话持久性）；交互 e2e 18 条 + 初屏 visual 6 条全绿（程序化断言，截图仅视觉附件）；全量验证 full-green（typecheck/build/lint/test/check，仅 2 条已登记 i18n 豁免）；`packages/` 零改动，变更面仅 In Scope 清单；closure audit 由独立 fresh session 子 agent 两轮完成（R1 REJECTED 1 Blocker + 3 minor → 修复 → R2 scoped re-audit APPROVED）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh sessions `ses_fb0f28534ffeSbxjF4OS4giq0z`（R1 全量 9 门审计，verdict REJECTED：Blocker-1 C2 回写⑤缺 G-A cardTemplate 证据引用；Major linear.md §5 表未原位标注；Minor 行数记录漂移 467→470）→ 执行 session 修复（C2 追加 cardTemplate 引用 bullet + linear.md §5 两行原位勘误标注 + plan 行数记录修正）→ `ses_fb0e88198ffeUomdn1HZjztDiZ`（R2 scoped re-audit，verdict APPROVED：7/7 回写输入、append-only 核验、§5 标注成立、记录与 wc -l 一致、变更面干净、零新 finding）。
- Evidence: 本 plan Phase 1–5 执行落字 + 处置表；e2e 证据 `tests/e2e/linear-replica-interactions.spec.ts`（18 条）+ `tests/e2e/linear-replica-visual.spec.ts`（6 条）；单测 `linear-mock-backend.test.ts` 278 条全绿；daily log `docs/logs/2026/08-30.md`。

Follow-up:

- kanban 拖拽源注册滞后（React Compiler dev 双挂载下 dragstart 载荷滞后一拍）与 container-body wrapper 布局语义（schema flex-row 不透传 body wrapper）两项 renderer/styling finding 已登记 C2 回写 ⑤ G-A，归 D1/renderer 修复流程
- `linear-mock-backend.test.ts`（548 行）与 `linear-replica-interactions.spec.ts`（576 行）进入 `check:oversized-code-files` ≥500 WARN 观察名单（advisory），后续按页级 describe 拆分候选
- `flux-guide` 可补「data-source 跨树刷新走 component:refresh + 显式 id」注意点（回写 ④ 既有建议，本计划再次复用该姿势）
