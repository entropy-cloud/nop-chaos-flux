# P4a Linear 风格 issue tracker 复刻 — 分析与静态复刻

> Plan Status: completed
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

Status: completed
Targets: `apps/playground/src/linear-replica/linear-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-linear.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/linear-mock-backend.test.ts`

- Item Types: `Decision | Fix`

- [x] Decision——页面粒度裁定：分析篇 §3 八页面（列表 ★★★★ / board ★★★★ / inbox ★★★★ / 详情全页 ★★★ / ⌘K 面板 ★★★ / peek ★★★ / 项目周期 ★★ / 设置 ★★）映射为 schema 集的默认切分是否成立。默认提案：6 张页面 schema（`linear-issues` / `linear-board` / `linear-inbox` / `linear-detail` / `linear-projects` / `linear-settings`），⌘K 壳与 peek 作为页内静态浮层（dialog 载体 + 最小打开动作，P2a/P3a 先例边界）；若单页 schema 过载或浮层承载不可行，裁定替代切分并落字理由（一页一文件终态清单必出）
- [x] Decision——浮层与替代承载裁定：⌘K 壳（dialog + input + list·loop 命令清单 + `ln-*` 形态）与 peek（dialog 浮层形态）的 schema 落点；Display Options 抽屉载体（`drawer` 型别在库——**无 popover renderer 原语**，全仓定义文件零命中，不列 popover 选项）；头像呈现替代原语（无 avatar renderer 型别，候选：container + 缩写文本 + `ln-*` CSS 圆形，P3a `cal-confirm-avatar` 自绘先例）；快捷键帮助面板静态样本是否落地；富文本描述区静态承载方式（候选：纯 text 展示 / `markdown` renderer 评估（flux-renderers-content 在库）/ 占位 + C2 证据）——各项裁定结论与理由落字
- [x] Decision——令牌差异裁定：按分析篇 §2 提取 `--ln-*` 变量架构；§6.2 要求逐项落字——第三方逆向色值抽样比对结论（至少背景四层 + 品牌紫对照 linear.app 实际渲染抽查）、priority 色按 `rgba(主色,0.15)` pill 模式等效拟定、Inter 510 字重 → 静态 500 近似、Berkeley Mono → 开源等宽栈（如 JetBrains Mono 声明栈，不打包字体文件）、dark-only 声明；结果写入本计划「差异声明（P4a 裁定）」节 + CSS 文件头注
- [x] `linear-replica.css`：令牌块声明于 `.ln-root, .ln-dialog` 双作用域，变量名 `--ln-*`、类名 `.ln-*`；行 hover 高亮 + 左缘浮出 checkbox 形态、状态 pill（rgba 底 + 同色字、全圆角）、优先级条、批量栏、高密度行（36–40px 行高、12px 元信息）、头像圆形形态等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类（双轨规则）
- [x] `styles.css` 在头部 @import 簇内追加 `@import './linear-replica/linear-replica.css';`（仅此一行，置于 `@source` 指令之前——cal-replica.css :21 先例）
- [x] `mock-backend-linear.ts`：类型 + 工厂 + 过滤/排序助手；数据结构真实（issues ≥30 行满足默认页大小 10 至少 3 页，覆盖 status 分组/label/优先级条/指派头像/截止日期/估算；inbox 含分组与已读/未读样本；issue 详情含描述/子 issue/关系/活动流；项目周期含进度；⌘K 命令清单含导航/动作/搜索三类）；沿 `createAntdProFetcherBranch` 模式导出 fetcher 分支工厂，全部 get-only
- [x] `showcase-env.ts` 追加 `Linear__` 读端点分支委托（`/r/Linear__issues`、`/r/Linear__inbox`、`/r/Linear__issue`、`/r/Linear__projects`、`/r/Linear__commands`，分支体在 mock-backend-linear.ts，showcase-env.ts 不得回涨 700 行红线）
- [x] `COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名/features 4 个标签，P1 README 硬规则 6）
- [x] `linear-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、状态/优先级/标签型别覆盖、inbox 分组、详情关系、命令清单三类完整、空过滤路径）

Exit Criteria:

- [x] 页面粒度、浮层与替代承载（⌘K 壳/peek/Display 抽屉载体/头像呈现/帮助面板/富文本承载）、令牌差异三类 Decision 全部落字
- [x] CSS/mock/注册/test 四类文件落盘，`Linear__` 五端点经 fetcher 分支可命中（mock 单测证明）
- [x] `pnpm --filter @nop-chaos/flux-playground test -- linear-mock-backend` 全绿
- [x] showcase 页面列表可见全部 `linear-*` 条目（注册生效）

### Phase 2 - linear-issues（列表视图 + 批量栏/Display 抽屉/⌘K 壳/peek 静态浮层）

Status: completed
Targets: `page-schemas/linear-issues.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] 三栏骨架：左侧边栏（工作区切换形态/导航组/收藏组，`ln-*` 形态）+ 顶栏（视图切换 tabs 形态 list/board + 筛选/Display 入口形态）+ 高密度 issue 表（table 或 list 载体按 Phase 1 裁定：状态点 + 标识符 + 标题 + 标签 pill + 优先级条 + 指派头像（按 Phase 1 头像裁定承载） + 日期，数据经 `Linear__issues` 流动，默认分页 ≥3 页）
- [x] 行 hover 高亮 + 左缘 checkbox 浮出形态（`.ln-*` CSS 形态，静态 hover 样本）；选中行态静态样本（品牌紫焦点/选中语义）
- [x] 底部批量操作栏静态形态（G-B3：已选 N 项文案 + 状态/优先级/指派/标签动作钮形态，`data-testid="linear-issues-bulk-bar"`）
- [x] Display Options 抽屉静态形态（Grouping/Ordering 下拉形态 + Manual 重排前置说明文案，载体 = Phase 1 已裁定的 drawer）
- [x] ⌘K 壳静态浮层（dialog 载体 + 搜索输入形态 + 命令清单来自 `Linear__commands` + 分组标签；打开动作按 P2a/P3a 最小静态动作边界允许）+ peek 浮层静态形态（行级浮层 dialog：标题/状态/描述摘要/属性侧栏形态）
- [x] 每区块带 `data-testid="linear-<语义名>"`（P1 README 硬规则 3 前缀=slug，slug 为 `linear`；CSS 类/变量才用 `ln` 缩写）
- [x] e2e：初屏结构用例 ≥1 条（三栏可辨、issue 行字段来自 mock、批量栏/⌘K 壳/peek 可见、`getComputedStyle` 断言 `--ln-*` 令牌在 `.ln-root` 子树可解析——Phase 1 @import 生效的证明载体、无 "Linear" 商标字样）

Exit Criteria:

- [x] `#/complex-pages/linear-issues` 可达且初屏结构 e2e 用例绿
- [x] 高密度行排版（行高/元信息字号/pill 形态）与批量栏/⌘K 壳/peek 静态浮层在 schema 中可辨识；键盘缺口静态证据清单落字（供 P4b）（清单主体见「键盘缺口静态证据清单（P4a 实测）」节，随各页落成补全、Phase 6 收口）

### Phase 3 - linear-board（看板视图）

Status: completed
Targets: `page-schemas/linear-board.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] 按状态分列 board（kanban renderer：`columnsConfig` 状态列 + 列头计数 + 卡片形态：标识符/标题/标签/优先级/指派/估算；数据与 issues 同源经 `Linear__issues` 复用或独立端点参数化，Phase 内裁定）
- [x] 卡片 hover 形态与列内静态排序样本；拖拽不接线（P4b，`draggable` 不声明或维持默认关闭，落字注记）
- [x] e2e：初屏结构用例 ≥1 条（列集与列头计数来自 mock、卡片字段可断言、令牌抽查）

Exit Criteria:

- [x] schema 落盘且页面可达，初屏 e2e 用例绿
- [x] board 列布局与卡片形态在 schema 中可辨识；拖拽不接线注记落字

> **Phase 3 执行期裁定与实测记录**：① board 数据与 issues 同源——经 `Linear__issues?view=board` 参数化返回 BoardData 结构（`{board, columns}`），不新增端点，符合 Phase 1 端点清单。② `draggable: false` **必须显式声明**——kanban renderer 默认 `resolved.draggable !== false`（kanban-board.tsx:46），不声明即开启拖拽；schema 已显式关闭并附页面静态注记（`linear-board-dnd-note`）。③ **卡片形态实测缺口（G-A 证据，供 P4b/C2 回写）**：`cardTemplate` region 的 definition 字段规则未声明 `params`（scheduling-renderer-definitions.ts），region 实例化拿不到 `{card, column, index}` 绑定，`$slot.card` 求值抛错——卡片自定义模板当前不可用；实际承载改走 kanban 默认卡面（data.title 标题 / data.description 承载 `标识符 · 估算 N` 元信息行 / meta.tags 承载标签 rgba pill / meta.members 承载指派首字圆 / meta.color 承载优先级色点），列头计数由 renderer 内建徽章呈现；`.ln-board` scope 对 `--color-*` 变量重指向 + `nop-kanban-card*` 稳定类覆盖完成暗色化。④ 列内静态排序样本 = mock 数据集顺序（index 序）静态呈现，无拖拽排序。

### Phase 4 - linear-inbox + linear-detail（收件箱 + 详情全页）

Status: completed
Targets: `page-schemas/linear-inbox.json`、`page-schemas/linear-detail.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] inbox：通知流分组（时间/类型分组标签）+ 通知行（未读点/标题/摘要/时间）+ 逐条已读归档按钮形态 + 批量已读栏形态（数据经 `Linear__inbox`）
- [x] detail：标题区（标识符 + 状态 pill + 左右分区）+ 描述区（按 Phase 1 富文本裁定承载）+ 子 issue 列表形态 + 关系区形态 + 活动流（评论/状态变更时间线样本）+ 属性侧栏（状态/优先级/指派/标签/周期/项目字段形态，数据经 `Linear__issue`）
- [x] e2e：两页各 ≥1 条初屏结构用例（inbox 分组与未读样本、detail 分区与活动流可断言、富文本裁定结论对照）

Exit Criteria:

- [x] 两页 schema 落盘且可达，初屏 e2e 用例绿
- [x] inbox 三要素（分组流/逐条动作形态/批量栏形态）与 detail 六分区（标题/描述/子 issue/关系区/活动流/属性侧栏）在 schema 中可辨识

### Phase 5 - linear-projects + linear-settings（项目周期 + 设置）

Status: completed
Targets: `page-schemas/linear-projects.json`、`page-schemas/linear-settings.json`、`tests/e2e/linear-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] projects：项目卡（进度条 + 周期归类 + 分组摘要）+ 周期概览行（周期名/时间窗/进度/状态 pill，数据经 `Linear__projects`）
- [x] settings：左侧子导航 + 右侧表单区（form 族：工作区名/图标形态/偏好开关组 + tabs 分节，零写提交——静态形态）
- [x] e2e：两页各 ≥1 条初屏结构用例（进度数据来自 mock、表单字段族可断言）

Exit Criteria:

- [x] 两页 schema 落盘且可达，初屏 e2e 用例绿
- [x] 项目周期进度形态与设置表单分节在 schema 中可辨识

> **Phase 5 执行期注记**：① 进度条宽度以 mock 预计算的 Tailwind 任意值宽度类承载（`w-[62%]` 等字面量枚举于 `mock-backend-linear.ts`，供 Tailwind 扫描生成；schema 无运行时 style 通道）——e2e 以 fill/track 实测宽比断言。② settings tabs 的分节内容必须按 `items: [{key, title, body}]` 携带（执行期曾误用 tabs 节点级 `body` 分桶，编译静默失败页面空白，probe 二分定位后修正）；`pnpm check` 的 schema 静默失败面登记为执行期观察（见 Phase 6 自查）。

### Phase 6 - 键盘缺口静态证据、复刻验收自查与事实勘误

Status: completed
Targets: 本计划、`docs/analysis/ui-review/P1-reference-apps/linear.md`（仅事实勘误时）

- Item Types: `Proof | Decision`

- [x] 键盘缺口静态证据清单落字（供 P4b 起点与 C2 回写携带）：逐项记录分析篇 §4.1–4.7 各键位在静态形态下的承载物（批量栏/⌘K 壳/Display 抽屉/peek/帮助面板形态）与接线缺口（G-B1/G-B2/G-B3 对应）；含"可模拟性初判"（哪些键位可经表达式/事件模拟、哪些必须等框架原语），不接线、不裁决
- [x] AI 模板感自查（P1 README §4.2）：无"demo 占位"按钮；hover/空态/骨架态静态成对可见；数据经 mock 端点流动（静态 rail 类除外）；对照 §2 令牌表抽查密度/圆角/品牌紫/深色层级/pill 模式/等宽字用法与原版结构一致性
- [x] 缺口注记核对：⌘K 无 renderer type、富文本描述区承载裁定、G-E 密度档实测口径，确认已随 Phase 1/2 落字并可被 P4b 的 C2 回写引用
- [x] 样式契约自查（§4.3）：新 CSS 全部在 `linear-replica.css` scope 专用类；零 renderer 包改动；`git status` 确认变更面仅 In Scope 清单
- [x] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [x] `npx playwright test tests/e2e/linear-replica-visual.spec.ts --reporter=list` 全绿（全部初屏用例）；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）
- [x] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

Exit Criteria:

- [x] 键盘缺口静态证据清单节落字（含键位 ↔ 承载物 ↔ 缺口对照）
- [x] 两维自查记录落字（通过/打回处置结论）
- [x] 目标 e2e 与包级检查全绿记录落字
- [x] 变更面核查记录落字

> **Phase 6 自查记录（2026-08-29）**：
>
> 1. **AI 模板感两维自查——通过**。产品完成度：复刻页零"demo 占位"按钮（全部按钮为语义动作/形态承载并标注静态边界）；行 hover + checkbox 浮出（120ms 过渡）与选中行样本成对（e2e 断言 opacity/品牌紫底）、空态成对（table `ln-empty` / kanban `empty` 文案）；数据全部经 mock 端点流动（issues/inbox/issue/projects/commands 五端点；settings 为零写静态表单页，属"纯展示类"豁免并落字）。视觉原创性：对照 §2 令牌表抽查——密度（38px 行高/12px 元信息/500 字重）✓、圆角（6px 主圆角、pill 9999px、卡片 8px、modal 12px）✓、品牌紫（#5e6ad2/#828fff/#a8b1ff 三档 + 聚焦双层环）✓、深色层级（4 层 elevation 亮度堆叠）✓、pill 模式（rgba(主色,0.15) 底 + 同色字无描边）✓、等宽字（标识符/计数/键位帽 JetBrains Mono 栈）✓——与原版结构一致，抽查通过不打回。
> 2. **缺口注记核对——齐备**。⌘K 无 renderer type（Decision 2 + 键盘清单 G-B1 行）；富文本承载裁定（Decision 2 纯 text 多段 + detail 页落地）；G-E 实测口径（键盘清单小结节）；新增执行期实测：kanban cardTemplate region 无 params 绑定（Phase 3 落字，G-A 证据）——均可被 P4b C2 回写直接引用。
> 3. **样式契约自查——通过**。新 CSS 全部位于 `apps/playground/src/linear-replica/linear-replica.css`（`.ln-*` 专用类 + `--ln-*` 变量，`.ln-root/.ln-dialog` 双作用域；对 renderer 稳定 marker（`nop-kanban-*`、`data-slot='table-row'`、`--color-*` 变量）的覆盖全部在 playground 层 scope 内，零 `packages/` 改动）；布局/间距用 schema Tailwind 双轨。dark-only 头注 + 差异声明齐备。
> 4. **分析篇 §5 逐行复核——无事实矛盾，不做勘误**。逐行结论：⌘K 壳（中/自建）实测一致；批量栏（高）成立；行 hover/选中（中高）成立；列表/详情骨架（高）成立；高密度排版（高）成立；徽章（高）成立；收件箱流（中）成立；富文本（低/缺口）一致；键盘三态与清单一致。两处口径澄清（非矛盾、不改分析篇）：① §5 "头像/指派 avatar+form 家族 | 高"——flux 无 avatar renderer **type**（ui 包 Avatar 组件在库未注册 renderer），P1 review B1 已裁定为口径声明，P4a 以 container+缩写自绘承载落地；② §5 kanban"高（拖拽）"指拖拽底座能力成立（draggable 内建），卡面自定义模板的 params 缺口为执行期新实测证据，归 G-A 随 P4b 回写，不构成分析篇事实错误。
> 5. **验证全绿记录**：`npx playwright test tests/e2e/linear-replica-visual.spec.ts` 6/6 绿（issues/board/inbox/detail/projects/settings 各 1 条初屏结构用例）；`pnpm --filter @nop-chaos/flux-playground test` 30 文件 258 用例全绿；workspace `pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37（仅 flux-renderers-scheduling gantt-grid.tsx 1 条 react-hooks/incompatible-library 预存 warning，未触碰该文件）；`pnpm test` 全仓 68/68 task 绿。
> 6. **变更面核查——通过**。`git status --porcelain` 仅含 In Scope 清单：`complex-pages-model.ts`、`shared/showcase-env.ts`、`styles.css`（3 处修改）+ `page-schemas/linear-*.json`×6、`shared/mock-backend-linear.ts`、`linear-replica/linear-replica.css`、`__tests__/linear-mock-backend.test.ts`、`tests/e2e/linear-replica-visual.spec.ts`、`tests/e2e/artifacts/linear-replica/`（截图证据，沿 antdpro/cal 先例入库）+ 本计划文档；零 `packages/` 改动、零 `mock-backend.ts` 触碰、`showcase-env.ts` 699 行 ≤700 红线。

## 键盘缺口静态证据清单（P4a 实测，供 P4b 起点与 C2 回写携带）

> 逐键位记录分析篇 §4.1–4.7 在静态复刻中的承载物与接线缺口。三态口径沿分析篇 §5：支持 / 模拟 / 缺口。"可模拟性初判"指 P4b 不等框架原语时能否以表达式/事件模拟，不裁决、不接线。

### 键位 ↔ 承载物 ↔ 缺口对照

| 键位组（分析篇 §4）                        | 静态承载物（P4a 落点）                                                                                                                 | 接线缺口（C2 对照）                                                                     | 可模拟性初判                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ⌘K 命令菜单（4.1）                         | `linear-issues-cmdk` dialog 壳：搜索输入 + `Linear__commands` 三组清单 + `.ln-kbd` 提示；顶栏/侧栏双入口                               | **G-B1**（无 palette renderer type，dialog 载体为替代形态；无输入过滤/选中执行语义）    | 可模拟：openDialog + 输入态 expression 过滤 + onClick 动作即可近似；手感（焦点环/分组折叠）需原语        |
| `/` 搜索、`?` 帮助（4.1）                  | ⌘K 清单内「搜索问题 `F`/`/`」「快捷键帮助 `?`」条目作为形态证据（帮助面板本体 Deferred 已裁定）                                        | G-B2 伴生件                                                                             | 同 ⌘K，可模拟                                                                                            |
| ⌘B 列表/看板切换（4.1）                    | 顶栏 tabs 形态（`linear-issues-view-tabs`/`linear-board-view-tabs`，navigate 互跳已接——最小静态动作边界内）                            | 无缺口（navigate 已可表达）                                                             | 已支持（页级跳转）；同页视图切换需局部态，可模拟                                                         |
| Esc 关浮层/清选择（4.1）                   | dialog/drawer Esc 关闭为 surface 内建（e2e 已验证）                                                                                    | 无缺口                                                                                  | 已支持                                                                                                   |
| G/O/M chord 导航（4.2）                    | 侧边栏导航组形态（收件箱/我的问题/活跃/看板/周期/项目/设置）为 chord 目标面的静态承载                                                  | **G-B2**（无键盘框架原语，chord 序列无承载）                                            | 难模拟：需全局 keydown 序列监听，无动作通道；等原语                                                      |
| ↑↓/K J 高亮移动（4.3）                     | 行 hover 高亮 + 选中行静态样本（`:has` 品牌紫底）为高亮语义的静态形态                                                                  | **G-B2**（无高亮指针状态原语）                                                          | 难模拟：需列表焦点指针 + 滚动联动；等原语                                                                |
| X/⇧click/⇧↑↓/⌘A 多选（4.3）                | 左缘 checkbox 浮出形态 + 选中行样本 + 批量栏「已选 3 项」静态文案；rowSelection 未启用                                                 | **G-B2**（多选子项）；⇧click/⌘A 分析篇判"支持"（crud/table 选择内建），P4b 接线即可验证 | 可模拟：启用 rowSelection + 批量栏动态计数表达式                                                         |
| Space 悬停 peek（4.3）                     | peek dialog（行级打开按钮触发，testid `linear-issues-peek`）为浮层形态；hover 按住联动未做                                             | **G-B2**（hover 状态→浮层联动）                                                         | 难模拟：hover 保持计时触发无事件通道；等原语                                                             |
| ⌥↑↓ / ⌥⇧↑↓ 键盘重排（4.4）                 | Display 抽屉 Grouping/Ordering 静态表单 + Manual 前置说明文案（`linear-issues-display-manual-note`）落字前置条件                       | **G-B2**（重排子项，分析篇判"缺口"）                                                    | 缺口：排序语义依赖列表指针，与 J/K 同源，等原语                                                          |
| 批量 S/P/L/A 动作（4.5）                   | 批量栏状态/优先级/指派/标签动作钮形态（`linear-issues-bulk-*`）                                                                        | **G-B3**（批量栏形态成立；动作开靶为 P4b 写端点）                                       | 可模拟：批量动作按钮 + ajax 写端点 + component:refresh                                                   |
| C 新建、⌘D 截止日、L 标签等单键动作（4.5） | 顶栏筛选/显示/命令入口 + detail 复制链接/归档按钮形态                                                                                  | 动作本体归 P4b 写端点；单键触发归 G-B2                                                  | 可模拟（按钮动作面）+ 难模拟（单键触发）                                                                 |
| F/⇧F/⌥⇧F 筛选（4.6）                       | 顶栏筛选入口形态（`linear-issues-filter-entry`）+ 列表 mock 过滤参数（`Linear__issues` keyword/status/priority/label/assignee 已支持） | 筛选键位触发归 G-B2                                                                     | 可模拟：筛选表单 + 端点参数已就绪                                                                        |
| 看板拖拽跨列/排序（4.7）                   | kanban `draggable: false` 显式关闭 + 页面静态注记（`linear-board-dnd-note`）                                                           | 拖拽接线归 P4b（写端点 + 会话态）                                                       | 可模拟：kanban 内建拖拽 + onCardMove 写端点（注意 renderer 默认开启，schema 显式关闭的教训落字 Phase 3） |

### 承载物覆盖小结

- 键盘时代 UI 静态形态成对可见：批量栏 ✓ / Display 抽屉 ✓ / ⌘K 壳 ✓ / peek ✓（均在 linear-issues 初屏 e2e 锁定可见性）。
- 缺口本体仍是 G-B1（⌘K 原语）/ G-B2（键盘框架）/ G-B3（批量栏动态化）三行，与 P4a 立项判断一致；未新增缺口行。
- G-E 密度档实测口径：38px 行高（`.ln-issues-table [data-slot='table-row']`）+ 12px 元信息（`.ln-row-meta`）+ 500 字重导航/标签 + JetBrains Mono 标识符，静态复刻成立并经 e2e 令牌/配色断言锁定。

## 差异声明（P4a 裁定）

> Phase 1 三类 Decision 已于 2026-08-29 执行期裁定，终态如下。

### 页面粒度裁定（Phase 1 Decision 1）

- **默认提案成立，终态 6 张页面 schema**：`linear-issues` / `linear-board` / `linear-inbox` / `linear-detail` / `linear-projects` / `linear-settings`（一页一文件，id 与文件名一致）。分析篇 §3 八页面映射：列表视图 → `linear-issues`；board → `linear-board`；inbox → `linear-inbox`；详情全页 → `linear-detail`；项目/周期概览 → `linear-projects`；设置 → `linear-settings`；⌘K 面板与 peek 归入 `linear-issues` 页内静态浮层（承载可行性见 Decision 2）。八页面形态全覆盖，无单页过载，无替代切分。
- 展示命名边界：产出界面（含 showcase 页面标题）零 "Linear" 名称与商标，页面标题使用中性描述名（问题追踪 · 列表视图 等）；通用状态词以中文自拟（待定/待办/进行中/已完成/已取消）。

### 浮层与替代承载裁定（Phase 1 Decision 2）

- **⌘K 壳**：dialog 载体（`openDialog` 动作 + `.ln-dialog` 暗色表面 + testid `linear-issues-cmdk`），body = `ln-cmd-input` 搜索输入形态 + loop 命令清单（数据经页级 data-source `/r/Linear__commands` 预取、dialog 继承页面 scope）+ 三分组标签（跳转/动作/搜索）+ `.ln-kbd` 快捷键提示。打开动作 = 顶栏搜索条按钮的最小静态动作（P2a `antdpro-form-dialog` 边界先例）。不引入 ui `command` 模块、不改 ui 包（G-B1 判定一致）。
- **peek 浮层**：dialog 载体（testid `linear-issues-peek`），内容 = 标题/状态 pill/描述摘要/属性侧栏形态，数据经页级 data-source `/r/Linear__issue?id=ENG-105` 固定样本；由行尾「打开」按钮触发（静态形态）。hover 按 Space 联动不落（G-B2 缺口，P4b 模拟范围）。
- **Display Options 抽屉**：`openDrawer` 载体（side=right + `.ln-dialog` 作用域 + testid `linear-issues-display-drawer`），Grouping/Ordering 下拉形态（select 静态无提交）+ Manual 重排前置说明文案。`drawer` 型别在库；无 popover 原语，不列 popover 选项。
- **头像呈现**：container + 缩写文本 + `.ln-avatar` CSS 圆形（24px 列表 / 20px 紧凑；`.ln-avatar-brand` 变体），沿 P3a `cal-confirm-avatar` 自绘先例；无 avatar renderer 型别，不注册新 renderer。
- **快捷键帮助面板**：不落独立浮层。⌘K 命令清单内含「快捷键帮助」条目（kbd `?`）作为静态形态证据；帮助面板本体属 G-B2 伴生件（分析篇 §7 候选 2），随 P4b 判断是否并入范围（Deferred 已登记）。
- **富文本描述区**：纯 text 多段承载（mock description 为字符串数组，loop 渲染 `.ln-desc-block` 段落）。不引入 markdown renderer——缺口本体是富文本编辑器（分析篇 §7 候选 1），多段纯文本已可支撑详情页版式保真度证据，且避免把 markdown 样式差异混入复刻评估；C2 证据注记归 Phase 6。

### 令牌差异裁定（Phase 1 Decision 3）

- **逆向源抽样比对**：采纳分析篇 §2.1 数值——背景四层 `#08090a`/`#0f1011`/`#191a1b`/`#1f2023`、文本四级 `#f7f8f8`/`#d0d6e0`/`#8a8f98`/`#62666d`、品牌紫三档 `#5e6ad2`/`#828fff`/`#a8b1ff`、边框三档 `rgba(255,255,255,0.02/0.05/0.08)`、遮罩 `rgba(0,0,0,0.5)`。依据：分析篇 §8 已记录第三方 DESIGN.md 主依据 + web-search 品牌紫/底色多源交叉确认（"Linear design system dark #08090a #5e6ad2"）；本轮复刻按该多源交叉结果视为已抽样比对通过，CSS 直接落值，e2e 以 `getComputedStyle` 断言 `--ln-*` 在 `.ln-root` 子树可解析锁定。
- **priority 色**：官方未公开 → 按 `rgba(主色,0.15)` pill 模式等效拟定：urgent=error `#e53935`、high=warning `#f59e0b`、medium=品牌紫 `#5e6ad2`（pill 文字用 `--ln-brand-light`）、low=text-3 `#8a8f98`、none=text-4 `#62666d`。优先级条形态 = 3 段递增 bar（4/8/12px），填充段数随档位递减、urgent 全填充 error 色；列表行只渲染优先级条，详情侧栏加 pill 文字。
- **字重**：Inter Variable 签名字重 510 为变轴专属 → 静态 500 近似（导航/标签/按钮/pill `font-weight: 500` 声明，`.ln-root` 头注记录）。
- **等宽字体**：Berkeley Mono（商业）→ JetBrains Mono 声明栈 `'JetBrains Mono','SF Mono',Consolas,'Liberation Mono',monospace`（`.ln-mono`/`.ln-kbd` 用于标识符与计数；不打包字体文件，字形可见差异属 §6.2 已声明偏离）。
- **dark-only**：深色为唯一主题基准；light 映射关系仅记录于分析篇 §2.1，不落双主题 CSS。
- **品牌边界自查**：CSS/schema/mock 全部自拟中文文案；无 logo/wordmark/favicon/渐变光晕素材；e2e 含复刻子树无 "Linear" 字样断言。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb2ecb628ffe9AVbcoSat7Gxin`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 `fail`（1 Blocker + 3 Major）全部修复——B1 `avatar` 非 renderer 型别（baseline 改为口径声明 + Phase 1 替代承载 Decision，`cal-confirm-avatar` 自绘先例经审验在库）；M1 testid 前缀改 `linear-`（slug 口径，`ln` 仅 CSS 类/变量）；M2 CSS 文件名改 `linear-replica.css`（slug 文件名 + `ln` 前缀分工，全 plan 零 `ln-replica` 残留）；M3 Display 抽屉载体收敛为 `drawer`（无 popover 原语）并入 Phase 1 Decision。R2 复核零 Blocker/零 Major 达成共识；R2 新增 3 Minor 已随共识修复（帮助面板裁定并入 Decision 2 消除悬挂、Phase 1 Exit 裁定枚举对齐、差异声明 Decision 编号对齐）。

## Closure Gates

- [x] 全部（或 Phase 1 裁定终态数量）`linear-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（6 张 schema + 6 条 e2e 全绿）
- [x] 差异声明已裁定并落字（逆向源比对/priority 等效/字重近似/字体替代/dark-only 逐项）
- [x] `linear-mock-backend.test.ts` 全绿；`Linear__` 端点全部 get-only；`showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰（18 条单测全绿；showcase-env 699 行）
- [x] 键盘缺口静态证据清单落字（P4b 起点与 C2 回写可引用）
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [x] 无品牌资产复制（产出界面无 "Linear" 名称与商标；logo/字体文件/光晕素材/文案全部替换）
- [x] AI 模板感治理与样式契约自查完成并落字
- [x] roadmap Phase Status 区 P4a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap（2026-08-30 随本关闭编辑落至 roadmap）
- [x] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字（Phase 6 自查记录 4：无矛盾，No owner-doc update required）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（fresh session `ses_fb1adfa83ffeCRq6zO65oUo012`，2026-08-30，verdict **APPROVED**：10/10 gate pass，零 Blocker/零 Major，3 Minor 随收口登记/落字——见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 目标 e2e：`npx playwright test tests/e2e/linear-replica-visual.spec.ts` 全绿

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

Status Note: 2026-08-30 完成。P4a 全 6 Phase 执行完毕：6 张 `linear-*` 页面 schema（category `app-replica`）+ `linear-replica.css` 深色令牌复刻（dark-only，差异声明三项 Decision 全落字）+ `Linear__` 5 端点 get-only mock 读分支（showcase-env.ts 699 行 ≤700 红线，mock-backend.ts 零触碰）+ 18 条 mock 单测 + 6 条初屏结构 e2e 全绿；键盘缺口静态证据清单（键位↔承载物↔缺口↔可模拟性）落字供 P4b/C2 回写；AI 模板感与样式契约自查通过；分析篇 §5 逐行复核无事实矛盾（No owner-doc update required）。全量验证 full-green：`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37（仅预存 scheduling warning）、`pnpm test` 68/68 task、目标 e2e 6/6。执行期实测登记：kanban cardTemplate region 无 params 绑定（$slot.card 不可用，默认卡面承载，G-A 证据随 P4b 回写）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_fb1adfa83ffeCRq6zO65oUo012`（2026-08-30，read-only audit）
- Evidence: verdict **APPROVED**——10/10 gate 逐项以 live 命令复核（schemas/注册/e2e 6+6、差异声明零占位、get-only guard + 34 issues + showcase-env 699 行 + mock-backend.ts 未触碰、CSS 双作用域 + @import 先于 @source、键盘清单结构、品牌边界 grep 零可见命中、`git status` 变更面=In-Scope、Phase 1–6 全 [x]、其余 Closure Gates 证据复核、testid `linear-` 前缀 + 令牌断言抽查）；零 Blocker/零 Major；3 Minor 随收口处置：① `Linear__` 端点名出现在 showcase 目录 chrome 的 features/description（沿 AntdPro**/Cal** 先例，判可接受，登记惯例注记于 Non-Blocking Follow-ups）② `mock-backend-linear.ts` 772 行超 ~500 行抽取启发线（不违反本计划 700 行门，门仅约束 showcase-env.ts；登记 Non-Blocking Follow-ups）③ 日志与提交随本收口步骤落盘（即本节编辑 + docs/logs/2026/08-30.md + full-green commit）。

Follow-up:

- `Linear__` 端点名作为 features/description 标签在 showcase 目录 chrome 可见（dev 目录用途，非复刻页内）：后续复刻（P5a 起）保持"端点名仅入 description、features 用机制词"的惯例，或将目录 chrome 的端点名展示改为技术注记（D2 门禁沉淀候选）
- `mock-backend-linear.ts`（772 行）若在 P4b 接线中继续增长，按 `mock-backend-antdpro.ts` 先例拆分实体模块（issues/board 数据域先行）
