# P4a Linear 风格 issue tracker 复刻 — 分析与静态复刻

> Plan Status: active
> Mission: ui-review
> Work Item: P4a. Linear 风格 issue tracker 复刻 — 分析与静态复刻
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P4a 条目 + Phase Details P4 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（slug `linear`/前缀 `ln`/端点 `Linear__` 分配表 + §1–§5 全部硬规则）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/linear.md`（令牌 §2、页面清单 §3、键盘交互清单 §4、能力映射 §5、差异声明 §6.2、转 C2 候选 §7）
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/2026-08-29-1240-1-p2a-antdpro-template-static-replica.md`（Pi-a 先例：分支体下沉 mock 模块、styles.css @import 簇、最小静态动作边界）；`docs/plans/2026-08-29-1819-1-p3b-cal-booking-interaction-wiring-and-tests.md`（P3b，draft）
> 执行顺序约束：roadmap 虚线 `P3b -.-> P4a`（一次一应用、先静态后交互）——本计划在 P3b `done` 前不得开始执行；执行启动时必须重新 live 复核本节 baseline

## Purpose

消费 P1 已产出的复刻工程规范与 Linear 分析篇，把 roadmap P4 点名的 issue tracker 核心界面（列表 / board / ⌘K 面板壳 / peek 浮层 / inbox / 详情 / 项目周期 / 设置）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，验证 table/list/kanban/dialog 族在"键盘优先工作台"品类下的承载度（R1 判定的 flux 交互深度两级台阶之一），并为 P4b（交互接线与测试）提供全部静态落点与键盘缺口实测结论。

## Current Baseline

live 复核 2026-08-29，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1、P2a/P2b、P3a 均 `done`；P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（`linear` slug/`ln` CSS 前缀/`Linear__` 端点前缀分配表 + 目录/mock/e2e/验收规范）与 `linear.md`（§2 深色令牌结构、§3 八页面复杂度 ★★★★~★★、§4 键盘交互清单 4.1–4.7、§5 能力映射三态标注、§6.2 差异声明要求、§7 两个转 C2 候选）已落盘。
- **`linear` 复刻产物零存在**（`grep -rEn "Linear__|linear-replica|linear-issues" apps/playground/src tests/e2e` 零命中），本计划为该 slug 的建立者。
- 复刻基建先例在库：`mock-backend-antdpro.ts` 的 `createAntdProFetcherBranch`（按 slug 拆分 mock 模块 + fetcher 分支体下沉，showcase-env 零涨线模式）；`styles.css` 头部 @import 簇（:19 sundial/:20 antdpro/:21 cal 先例；@import 必须位于 `@source` 指令之前，执行启动时复核实际行号）；`complex-pages-model.ts` `COMPLEX_PAGE_ENTRIES` 注册（category `app-replica`）；`antdpro-replica-visual.spec.ts` / `cal-replica-visual.spec.ts` e2e 骨架（openPage 模式）。
- 治理线：`showcase-env.ts` 现 691 行（700 行 MUST-split 红线）——`Linear__` 分支体必须全部下沉 `mock-backend-linear.ts`，showcase-env 仅允许 ≤10 行胶水（antdpro/cal 双先例）；**余量算术注记**：691 + 胶水（antdpro 先例 = 注释 3 行 + 分支 if 4 行）落在 ~698–700，胶水必须压缩注释块、必要时用单行委托，不得超 700。
- **render-host registry 已注册 basic/data/scheduling 三包**（`apps/playground/src/complex-pages/shared/render-host.tsx:16/19/22`，scheduling 为 P3a 执行期缺口修复补入）——本计划所需型别可达，预期零 render-host 改动：`table`（`data-renderer-definitions.ts:23`）、`list`（`:429`）、`crud`（`crud-renderer-definition.ts`）、`kanban`（`flux-renderers-scheduling/src/kanban/kanban.types.ts`：`BoardData`/`KanbanColumnConfig`/`KanbanCardConfig`/`draggable`/`onCardMove/onCardClick`）、`dialog`（`flux-renderers-basic/src/surface-renderer-definitions.ts:147`）/`drawer`（`:197`）、`tabs`/`badge`/`button`/`icon`（basic 定义面 :487/:374/:213/:359）。**`avatar` 无 schema renderer 型别**（全仓 `type: 'avatar'` 零命中；`packages/ui` 导出 Avatar 组件但未注册 renderer，与 command.tsx 同情况）——指派头像按 Phase 1 Decision 以替代原语承载（候选：container + 缩写文本 + `ln-*` CSS 圆形，P3a `cal-confirm-avatar` 自绘先例）。
- **⌘K 面板载体实测**：`packages/ui/src/components/ui/command.tsx` 在库但**无 renderer type**（分析篇 §5 G-B1 判定一致）——⌘K 壳的静态形态按"dialog/dialog 内 input + list·loop 命令列表 + `ln-*` 专有形态"组装，Phase 1 Decision 裁定载体，不改 ui 包。
- **键盘交互全谱为 P4b 范围**（分析篇 §5 三态标注：chord/J·K/X/⌥↑↓ 重排均为缺口或模拟；⇧click/⌘A 多选为支持）——本计划只做键盘时代 UI 的**静态形态**（批量栏、Display 抽屉、⌘K 壳、peek 浮层；快捷键帮助面板静态样本是否落地随 Phase 1 浮层与替代承载裁定一并处置，已登记 Deferred），零键盘事件接线。
- **富文本描述缺口**（分析篇 §7 候选 1）：issue 详情页描述区无对应原语——本计划 Phase 1 Decision 裁定静态承载方式（纯文本/简化 markdown 展示/占位 + C2 证据），不改 renderer 包。
- 深色主题为 Linear 默认（分析篇 §2.1）：`linear-replica.css` 以 dark 令牌为唯一主题基准（light 映射关系记录于差异声明，不落双主题）；色值源为第三方逆向 DESIGN.md（分析篇已声明），CSS 落地前按 §6.2 要求做抽样比对裁定。
- C2 对应行：G-B1（⌘K 命令面板原语）、G-B2（键盘导航框架）、G-B3（批量栏）、G-F（行 hover/选中态）、G-A（列表/看板/详情骨架）、G-E（高密度行排版）——P4a 只做实测证据记录，不做裁决与接线（回写义务归 P4b）。

## Goals

- 6 张（或 Phase 1 裁定终态数量）`linear-*` 页面 schema 落盘并注册（category `app-replica`），覆盖分析篇 §3 八页面形态（peek/⌘K 壳/批量栏/Display 抽屉可裁定为页内静态浮层）。
- `linear-replica.css` 落盘：深色令牌架构（背景四层/文本四级/品牌紫三档/语义 pill rgba 模式/边框 rgba 三档/圆角层级 2·4·6·8·12·9999）声明于 `.ln-root, .ln-dialog` 双作用域（文件名按 slug `linear-replica.css`，变量/类前缀按 `ln`——P1 README §1 硬规则 2 的 slug/abbr 分工）；差异声明（逆向源抽样比对、priority 色等效、510 字重近似、等宽字体替代、dark-only）落字本计划。
- `shared/mock-backend-linear.ts` + `showcase-env.ts` fetcher 追加 `Linear__` 读端点分支（get-only：issues 数据集含状态/标签/优先级/指派/日期且分页 ≥3 页、inbox 通知流、issue 详情含子 issue/活动流、项目周期概览、⌘K 命令清单；分支体下沉，showcase-env 零涨线）。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/linear-replica-visual.spec.ts`）全绿；`linear-mock-backend.test.ts` 单测全绿。
- 键盘时代 UI 静态形态成对可见（批量栏/Display 抽屉/⌘K 壳/peek），并落字"缺口静态证据"清单供 P4b 与 C2 回写携带。
- 完成复刻验收自查（P1 README §4.2 两维 + §4.3 样式契约）。

## Non-Goals

- 不做键盘交互接线与写端点（⌘K 呼出、G/O/M chord、J/K 高亮、X 多选、⌥↑↓ 重排、Space peek、批量动作、卡片拖拽、行内编辑等属 P4b；Pi-a 只做"可见可点"的静态形态——dialog 打开类最小静态动作沿 P2a/P3a 先例允许）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）；本计划只落字"键盘缺口静态证据与可模拟性结论"供 P4b 携带。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；⌘K 原语（G-B1）、键盘框架（G-B2）、密度档（G-E）等产品化归 D1 流程。
- 不复制任何 Linear 品牌资产（logo/wordmark/favicon/渐变光晕素材/营销文案）；文案全部自拟中文，产出界面不得出现 "Linear" 名称与商标（分析篇 §6.2 要求）；通用状态词（Backlog/Todo/In Progress/Done）可保留。
- 不复刻分析篇 §3 未列的 Linear 面（团队管理/集成/API key 等设置子页），仅复刻八页面形态清单内条目。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/linear-*.json`（一页一文件；页面集与浮层归属仅限 Phase 1 Decision 裁定）
- `apps/playground/src/linear-replica/linear-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './linear-replica/linear-replica.css';`，限头部 @import 簇内——不得置于 `@source` 指令之后）
- `apps/playground/src/complex-pages/shared/mock-backend-linear.ts`
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅追加 `Linear__` fetcher 分支委托，分支体在 mock-backend-linear.ts）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目）
- `apps/playground/src/complex-pages/__tests__/linear-mock-backend.test.ts`
- `tests/e2e/linear-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P4a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见终期 Phase）。

## Failure Paths

> 涉及 mock 读端点，列最小集。

| 可测场景编号      | 触发                       | 行为                             | 可重试 | 用户可见表现                         |
| ----------------- | -------------------------- | -------------------------------- | ------ | ------------------------------------ |
| ln-issues-miss    | issues 端点过滤参数无匹配  | 返回空数组                       | 是     | 列表空态文案，不报错                 |
| ln-detail-miss    | 详情端点 id 无匹配         | 返回兜底记录，页面不崩           | 是     | 占位标题/描述                        |
| ln-inbox-empty    | inbox 分组无通知           | 返回空分组                       | 是     | 分组空态文案                         |
| ln-page-unknown   | 注册 id 拼写不一致         | 复刻页不可达（开发期发现即修）   | 否     | showcase 列表无该页                  |
| ln-dialog-missing | 浮层 testid/目标配置不一致 | 静态浮层打不开（开发期发现即修） | 否     | peek/⌘K 壳按钮无响应（P4b 接线对象） |

> Failure Paths 编号沿用 `ln-` 简名仅为表格紧凑，非 testid 约定——schema testid 一律 `linear-<语义名>`（见 Phase 2）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`linear-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--ln-*` 令牌在 `.ln-root` 子树可解析 / 无 "Linear" 商标字样断言；截图仅作视觉证据附件）。键盘交互契约（chord/多选/重排/拖拽）的先红后绿锁定归 P4b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（CSS/mock/注册是后续每页的依赖）；Phase 2–5 每页落 schema 即补该页初屏 e2e；Phase 6 实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与令牌差异裁定 + 复刻 CSS + mock 读端点 + 注册

Status: planned
Targets: `apps/playground/src/linear-replica/linear-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-linear.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/linear-mock-backend.test.ts`

- Item Types: `Decision | Fix`

- [ ] Decision——页面粒度裁定：分析篇 §3 八页面（列表 ★★★★ / board ★★★★ / inbox ★★★★ / 详情全页 ★★★ / ⌘K 面板 ★★★ / peek ★★★ / 项目周期 ★★ / 设置 ★★）映射为 schema 集的默认切分是否成立。默认提案：6 张页面 schema（`linear-issues` / `linear-board` / `linear-inbox` / `linear-detail` / `linear-projects` / `linear-settings`），⌘K 壳与 peek 作为页内静态浮层（dialog 载体 + 最小打开动作，P2a/P3a 先例边界）；若单页 schema 过载或浮层承载不可行，裁定替代切分并落字理由（一页一文件终态清单必出）
- [ ] Decision——浮层与替代承载裁定：⌘K 壳（dialog + input + list·loop 命令清单 + `ln-*` 形态）与 peek（dialog 浮层形态）的 schema 落点；Display Options 抽屉载体（`drawer` 型别在库——**无 popover renderer 原语**，全仓定义文件零命中，不列 popover 选项）；头像呈现替代原语（无 avatar renderer 型别，候选：container + 缩写文本 + `ln-*` CSS 圆形，P3a `cal-confirm-avatar` 自绘先例）；快捷键帮助面板静态样本是否落地；富文本描述区静态承载方式（候选：纯 text 展示 / `markdown` renderer 评估（flux-renderers-content 在库）/ 占位 + C2 证据）——各项裁定结论与理由落字
- [ ] Decision——令牌差异裁定：按分析篇 §2 提取 `--ln-*` 变量架构；§6.2 要求逐项落字——第三方逆向色值抽样比对结论（至少背景四层 + 品牌紫对照 linear.app 实际渲染抽查）、priority 色按 `rgba(主色,0.15)` pill 模式等效拟定、Inter 510 字重 → 静态 500 近似、Berkeley Mono → 开源等宽栈（如 JetBrains Mono 声明栈，不打包字体文件）、dark-only 声明；结果写入本计划「差异声明（P4a 裁定）」节 + CSS 文件头注
- [ ] `linear-replica.css`：令牌块声明于 `.ln-root, .ln-dialog` 双作用域，变量名 `--ln-*`、类名 `.ln-*`；行 hover 高亮 + 左缘浮出 checkbox 形态、状态 pill（rgba 底 + 同色字、全圆角）、优先级条、批量栏、高密度行（36–40px 行高、12px 元信息）、头像圆形形态等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类（双轨规则）
- [ ] `styles.css` 在头部 @import 簇内追加 `@import './linear-replica/linear-replica.css';`（仅此一行，置于 `@source` 指令之前——cal-replica.css :21 先例）
- [ ] `mock-backend-linear.ts`：类型 + 工厂 + 过滤/排序助手；数据结构真实（issues ≥30 行满足默认页大小 10 至少 3 页，覆盖 status 分组/label/优先级条/指派头像/截止日期/估算；inbox 含分组与已读/未读样本；issue 详情含描述/子 issue/关系/活动流；项目周期含进度；⌘K 命令清单含导航/动作/搜索三类）；沿 `createAntdProFetcherBranch` 模式导出 fetcher 分支工厂，全部 get-only
- [ ] `showcase-env.ts` 追加 `Linear__` 读端点分支委托（`/r/Linear__issues`、`/r/Linear__inbox`、`/r/Linear__issue`、`/r/Linear__projects`、`/r/Linear__commands`，分支体在 mock-backend-linear.ts，showcase-env.ts 不得回涨 700 行红线）
- [ ] `COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名/features 4 个标签，P1 README 硬规则 6）
- [ ] `linear-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、状态/优先级/标签型别覆盖、inbox 分组、详情关系、命令清单三类完整、空过滤路径）

Exit Criteria:

- [ ] 页面粒度、浮层与替代承载（⌘K 壳/peek/Display 抽屉载体/头像呈现/帮助面板/富文本承载）、令牌差异三类 Decision 全部落字
- [ ] CSS/mock/注册/test 四类文件落盘，`Linear__` 五端点经 fetcher 分支可命中（mock 单测证明）
- [ ] `pnpm --filter @nop-chaos/flux-playground test -- linear-mock-backend` 全绿
- [ ] showcase 页面列表可见全部 `linear-*` 条目（注册生效）

### Phase 2 - linear-issues（列表视图 + 批量栏/Display 抽屉/⌘K 壳/peek 静态浮层）

Status: planned
Targets: `page-schemas/linear-issues.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 三栏骨架：左侧边栏（工作区切换形态/导航组/收藏组，`ln-*` 形态）+ 顶栏（视图切换 tabs 形态 list/board + 筛选/Display 入口形态）+ 高密度 issue 表（table 或 list 载体按 Phase 1 裁定：状态点 + 标识符 + 标题 + 标签 pill + 优先级条 + 指派头像（按 Phase 1 头像裁定承载） + 日期，数据经 `Linear__issues` 流动，默认分页 ≥3 页）
- [ ] 行 hover 高亮 + 左缘 checkbox 浮出形态（`.ln-*` CSS 形态，静态 hover 样本）；选中行态静态样本（品牌紫焦点/选中语义）
- [ ] 底部批量操作栏静态形态（G-B3：已选 N 项文案 + 状态/优先级/指派/标签动作钮形态，`data-testid="linear-issues-bulk-bar"`）
- [ ] Display Options 抽屉静态形态（Grouping/Ordering 下拉形态 + Manual 重排前置说明文案，载体 = Phase 1 已裁定的 drawer）
- [ ] ⌘K 壳静态浮层（dialog 载体 + 搜索输入形态 + 命令清单来自 `Linear__commands` + 分组标签；打开动作按 P2a/P3a 最小静态动作边界允许）+ peek 浮层静态形态（行级浮层 dialog：标题/状态/描述摘要/属性侧栏形态）
- [ ] 每区块带 `data-testid="linear-<语义名>"`（P1 README 硬规则 3 前缀=slug，slug 为 `linear`；CSS 类/变量才用 `ln` 缩写）
- [ ] e2e：初屏结构用例 ≥1 条（三栏可辨、issue 行字段来自 mock、批量栏/⌘K 壳/peek 可见、`getComputedStyle` 断言 `--ln-*` 令牌在 `.ln-root` 子树可解析——Phase 1 @import 生效的证明载体、无 "Linear" 商标字样）

Exit Criteria:

- [ ] `#/complex-pages/linear-issues` 可达且初屏结构 e2e 用例绿
- [ ] 高密度行排版（行高/元信息字号/pill 形态）与批量栏/⌘K 壳/peek 静态浮层在 schema 中可辨识；键盘缺口静态证据清单落字（供 P4b）

### Phase 3 - linear-board（看板视图）

Status: planned
Targets: `page-schemas/linear-board.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 按状态分列 board（kanban renderer：`columnsConfig` 状态列 + 列头计数 + 卡片形态：标识符/标题/标签/优先级/指派/估算；数据与 issues 同源经 `Linear__issues` 复用或独立端点参数化，Phase 内裁定）
- [ ] 卡片 hover 形态与列内静态排序样本；拖拽不接线（P4b，`draggable` 不声明或维持默认关闭，落字注记）
- [ ] e2e：初屏结构用例 ≥1 条（列集与列头计数来自 mock、卡片字段可断言、令牌抽查）

Exit Criteria:

- [ ] schema 落盘且页面可达，初屏 e2e 用例绿
- [ ] board 列布局与卡片形态在 schema 中可辨识；拖拽不接线注记落字

### Phase 4 - linear-inbox + linear-detail（收件箱 + 详情全页）

Status: planned
Targets: `page-schemas/linear-inbox.json`、`page-schemas/linear-detail.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] inbox：通知流分组（时间/类型分组标签）+ 通知行（未读点/标题/摘要/时间）+ 逐条已读归档按钮形态 + 批量已读栏形态（数据经 `Linear__inbox`）
- [ ] detail：标题区（标识符 + 状态 pill + 左右分区）+ 描述区（按 Phase 1 富文本裁定承载）+ 子 issue 列表形态 + 关系区形态 + 活动流（评论/状态变更时间线样本）+ 属性侧栏（状态/优先级/指派/标签/周期/项目字段形态，数据经 `Linear__issue`）
- [ ] e2e：两页各 ≥1 条初屏结构用例（inbox 分组与未读样本、detail 分区与活动流可断言、富文本裁定结论对照）

Exit Criteria:

- [ ] 两页 schema 落盘且可达，初屏 e2e 用例绿
- [ ] inbox 三要素（分组流/逐条动作形态/批量栏形态）与 detail 六分区（标题/描述/子 issue/关系区/活动流/属性侧栏）在 schema 中可辨识

### Phase 5 - linear-projects + linear-settings（项目周期 + 设置）

Status: planned
Targets: `page-schemas/linear-projects.json`、`page-schemas/linear-settings.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] projects：项目卡（进度条 + 周期归类 + 分组摘要）+ 周期概览行（周期名/时间窗/进度/状态 pill，数据经 `Linear__projects`）
- [ ] settings：左侧子导航 + 右侧表单区（form 族：工作区名/图标形态/偏好开关组 + tabs 分节，零写提交——静态形态）
- [ ] e2e：两页各 ≥1 条初屏结构用例（进度数据来自 mock、表单字段族可断言）

Exit Criteria:

- [ ] 两页 schema 落盘且可达，初屏 e2e 用例绿
- [ ] 项目周期进度形态与设置表单分节在 schema 中可辨识

### Phase 6 - 键盘缺口静态证据、复刻验收自查与事实勘误

Status: planned
Targets: 本计划、`docs/analysis/ui-review/P1-reference-apps/linear.md`（仅事实勘误时）

- Item Types: `Proof | Decision`

- [ ] 键盘缺口静态证据清单落字（供 P4b 起点与 C2 回写携带）：逐项记录分析篇 §4.1–4.7 各键位在静态形态下的承载物（批量栏/⌘K 壳/Display 抽屉/peek/帮助面板形态）与接线缺口（G-B1/G-B2/G-B3 对应）；含"可模拟性初判"（哪些键位可经表达式/事件模拟、哪些必须等框架原语），不接线、不裁决
- [ ] AI 模板感自查（P1 README §4.2）：无"demo 占位"按钮；hover/空态/骨架态静态成对可见；数据经 mock 端点流动（静态 rail 类除外）；对照 §2 令牌表抽查密度/圆角/品牌紫/深色层级/pill 模式/等宽字用法与原版结构一致性
- [ ] 缺口注记核对：⌘K 无 renderer type、富文本描述区承载裁定、G-E 密度档实测口径，确认已随 Phase 1/2 落字并可被 P4b 的 C2 回写引用
- [ ] 样式契约自查（§4.3）：新 CSS 全部在 `linear-replica.css` scope 专用类；零 renderer 包改动；`git status` 确认变更面仅 In Scope 清单
- [ ] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [ ] `npx playwright test tests/e2e/linear-replica-visual.spec.ts --reporter=list` 全绿（全部初屏用例）；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）
- [ ] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

Exit Criteria:

- [ ] 键盘缺口静态证据清单节落字（含键位 ↔ 承载物 ↔ 缺口对照）
- [ ] 两维自查记录落字（通过/打回处置结论）
- [ ] 目标 e2e 与包级检查全绿记录落字
- [ ] 变更面核查记录落字

## 差异声明（P4a 裁定）

> 按 Phase 1 Decision 落字（占位骨架，执行时填写终态）。

### 页面粒度裁定（Phase 1 Decision 1）

- <<执行时落字：6 张页面 schema 终态清单与浮层归属，或替代切分理由>>

### 令牌差异裁定（Phase 1 Decision 3）

- <<执行时落字：逆向源抽样比对结论、priority 色等效方案、510→500 近似、等宽字体替代栈、dark-only 声明、品牌边界自查>>

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb2ecb628ffe9AVbcoSat7Gxin`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 `fail`（1 Blocker + 3 Major）全部修复——B1 `avatar` 非 renderer 型别（baseline 改为口径声明 + Phase 1 替代承载 Decision，`cal-confirm-avatar` 自绘先例经审验在库）；M1 testid 前缀改 `linear-`（slug 口径，`ln` 仅 CSS 类/变量）；M2 CSS 文件名改 `linear-replica.css`（slug 文件名 + `ln` 前缀分工，全 plan 零 `ln-replica` 残留）；M3 Display 抽屉载体收敛为 `drawer`（无 popover 原语）并入 Phase 1 Decision。R2 复核零 Blocker/零 Major 达成共识；R2 新增 3 Minor 已随共识修复（帮助面板裁定并入 Decision 2 消除悬挂、Phase 1 Exit 裁定枚举对齐、差异声明 Decision 编号对齐）。

## Closure Gates

- [ ] 全部（或 Phase 1 裁定终态数量）`linear-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿
- [ ] 差异声明已裁定并落字（逆向源比对/priority 等效/字重近似/字体替代/dark-only 逐项）
- [ ] `linear-mock-backend.test.ts` 全绿；`Linear__` 端点全部 get-only；`showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰
- [ ] 键盘缺口静态证据清单落字（P4b 起点与 C2 回写可引用）
- [ ] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [ ] 无品牌资产复制（产出界面无 "Linear" 名称与商标；logo/字体文件/光晕素材/文案全部替换）
- [ ] AI 模板感治理与样式契约自查完成并落字
- [ ] roadmap Phase Status 区 P4a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [ ] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 目标 e2e：`npx playwright test tests/e2e/linear-replica-visual.spec.ts` 全绿

## Deferred But Adjudicated

### 键盘交互全谱接线（chord/J·K/X/⌥↑↓/Space peek/拖拽重排）

- Classification: `watch-only residual`（对 P4a 而言非缺口，为 Pi-b 既定范围）
- Why Not Blocking Closure: 两段式边界（P1 README §5）固定 Pi-a = 静态形态；键盘接线与先红后绿契约锁定属 P4b 义务，roadmap 既有 work item
- Successor Required: `yes`
- Successor Path: P4b plan（本 roadmap 既有 work item，无需新建）

### 富文本描述编辑器（issue 正文 markdown + @mention）

- Classification: `optimization candidate`（若 Phase 1 裁定静态承载可满足详情页形态，则本项仅为形态保真度让步；否则升级 C2 候选随 P4b 回写）
- Why Not Blocking Closure: 分析篇 §7 已预登记为 C2 未登记候选，明确"随 P4b 回写追加"；P4a 详情页以裁定后的静态承载落地，不影响"详情页结构复刻"结果面成立
- Successor Required: `yes`
- Successor Path: P4b C2 回写一并处理（分析篇 §7 既有登记）

### 快捷键帮助面板（`?` 呼出、可搜索）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 分析篇 §7 判定为 G-B2 伴生 UI 件，是否并入 G-B2 范围随 P4b 判断；P4a 若裁定落静态形态则在本计划内呈现，否则不影响结果面
- Successor Required: `yes`
- Successor Path: P4b（分析篇 §7 既有登记）

## Non-Blocking Follow-ups

- `Linear__` mock 数据集若在 P4b 接线中发现状态样本不足（选中集/拖拽中间态等），在 `mock-backend-linear.ts` 内补样本属 P4b Fix 范围
- light 主题映射表（分析篇 §2.1 已记录一一映射关系）：dark-only 裁定下不落 CSS，登记为后续主题扩展候选，不入本计划

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
