# P5a Notion database 多视图复刻 — 分析与静态复刻

> Plan Status: active
> Mission: ui-review
> Work Item: P5a. Notion database 多视图复刻 — 分析与静态复刻
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P5a 条目 + Phase Details P5 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（slug `notion`/前缀 `nt`/端点 `Notion__` 分配表 + §1–§5 全部硬规则）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/notion-database.md`（令牌 §2、页面清单 §3、交互清单 §4 I1–I14、能力映射 §5 含视图切换状态机 L4 风险判定、差异声明 §6.2、转 C2 候选 §7）
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/2026-08-29-1819-2-p4a-linear-tracker-static-replica.md`（Pi-a 先例：分支体下沉 mock 模块、styles.css @import 簇、最小静态动作边界、kanban `draggable` 显式声明教训、自绘头像先例）；`docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md`（P4b，draft——虚线前置）
> 执行顺序约束：roadmap 虚线 `P4b -.-> P5a`（一次一应用、先静态后交互）——本计划在 P4b `done` 前不得开始执行；执行启动时必须重新 live 复核本节 baseline

## Purpose

消费 P1 已产出的复刻工程规范与 Notion database 分析篇，把 roadmap P5 点名的"多视图同一数据集"品类标杆（视图 tab 条 + table/board/gallery/calendar/list 五视图 + filter/sort/search/group 面板 + 记录展开 peek + 属性头类型系统）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，验证 tabs+visible+每视图配置集模拟对 G-C（多视图数据库状态机）的承载度，并为 P5b（交互接线与测试）提供全部静态落点与 G-C 可模拟性实测结论。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `cd86e9686`）：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1、P2a/P2b、P3a/P3b、P4a 均 `done`；P4b plan `docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md` 已起草（draft）。P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（`notion` slug/`nt` CSS 前缀/`Notion__` 端点前缀分配表 + 目录/mock/e2e/验收规范）与 `notion-database.md`（§2 浅色令牌结构含 10 色语义盘三套、§3 九页面复杂度 ★★★★~★、§4 交互清单 I1–I14、§5 能力映射三态 + 视图切换状态机 L4 风险判定（风险高——配置集双层权限/类型↔布局↔peek 隐式联动/嵌套 filter 求值三处超出现有 crud/tabs 状态模型，建议 P5a 先以"tab + visible + 每视图一套 filter/sort 参数对象"模拟并压测重渲染成本）、§6.2 差异声明要求、§7 两个转 C2 候选）已落盘。
- **`notion` 复刻产物零存在**（`ls apps/playground/src/complex-pages/page-schemas/`、`tests/e2e/`、`complex-pages/__tests__/` 实测无 notion 条目；`showcase-env.ts` 无 `Notion__` 分支），本计划为该 slug 的建立者。
- 复刻基建先例在库：`mock-backend-linear.ts` 的 `createLinearFetcherBranch`（按 slug 拆分 mock 模块 + fetcher 分支体下沉，`board` 形态经 `view=board` 参数化返回不新增端点——P4a Phase 3 先例）；`styles.css` 头部 @import 簇（cal/linear 先例；@import 必须位于 `@source` 指令之前，执行启动时复核实际行号）；`complex-pages-model.ts` `COMPLEX_PAGE_ENTRIES` 注册（category `app-replica`）；`linear-replica-visual.spec.ts`（389 行）e2e 骨架（openPage 模式）。
- **治理线——showcase-env 余量是本计划的硬前置**：`showcase-env.ts` 现 **699 行**（700 行 MUST-split 红线），而 antdpro/cal/linear 三条 slug 委托分支各占 ~6 行（2 注释 + 4 代码）——**直接追加 `Notion__` 胶水分支（~6 行）必然突破 700 红线**。Phase 1 必须先做头部余量整理（候选：把三条 `url.includes('/r/<App>__')` 委托压缩为 `[prefix, handler]` 数组派发循环，playground 层零 `packages/` 改动），腾出 `Notion__` 委托空间；整理后总行数 ≤700 且 antdpro/cal/linear 全部端点零回归（现有单测证明）。`mock-backend.ts`（463 行）零触碰。
- **render-host registry 已注册 7 包**（`apps/playground/src/complex-pages/shared/render-host.tsx:5-22`：basic/form/form-advanced/data/content/layout/scheduling）——本计划所需型别全部可达，预期零 render-host 改动：`tabs`/`list`/`dialog`（basic 定义面）/`drawer`（`surface-renderer-definitions.ts:197`）、`table`/`crud`（data）、`kanban`/`calendar`（scheduling）、`condition-builder`（flux-renderers-form-advanced，包内 `condition-builder/` 模块 + 包级注册在库）。`avatar` 无 schema renderer 型别（P4a 实测口径维持）——Person 属性头像沿 P4a `container + 缩写文本 + .nt-*` CSS 圆形自绘先例。
- **关键承载实测结论（先例证据，Phase 1 Decision 输入）**：
  1. **calendar 月视图形态差**：calendar renderer 月视图为资源时间轴横条（`packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:148-243`，P3b G-C 证据），**非 Notion 式 6 周竖向月网格**——Notion calendar 视图承载需 Phase 1 裁定（候选：①calendar renderer 原样承载 + 形态差落字 G-C 证据；②container grid + loop 自绘静态月网格——P4a ⌘K 壳自组装先例，静态月格 + 日期落格卡样本可行）。
  2. **kanban `draggable` 默认开启**（`kanban-board.tsx:46`，P4a 教训）——board 视图静态复刻必须显式声明 `draggable: false`。
  3. **无 popover 原语**（P4a 全仓定义文件零命中实测维持）——View settings 滑杆面板、列头菜单、`+New` 视图类型选择菜单等弹层形态载体为 drawer/dialog（P4a Display 抽屉先例）。
  4. **hover 显控件**（分析篇 §2.4：行 hover 出 OPEN、⋮⋮ 把手等）——G-F 典型变体；C2 G-F 行已实测双渲染维护成本（plan460 settings rail 5×2），**静态 hover 显隐优先纯 CSS `:hover`**（`.nt-*` scope 类，L1 载体），可见性表达式双渲染仅留给状态分支（Phase 1 Decision 落字）。
  5. **tabs 同页切换为内建能力**——五视图 visible 分支 + tabs 值绑定属"可见可点"静态边界内（Cal 时长 tabs 静态选中态先例），视图间 filter/sort/group 参数生效属 P5b。
- **schema JSON 不入 oversized 门禁**：`scripts/check-oversized-code-files.mjs:13` 仅扫描 `.js/.jsx/.ts/.tsx/.mjs/.cjs`——多视图单页 schema 体积不触发行数门，但 Phase 1 页面粒度裁定仍需以可维护性为准（先例：`linear-issues.json` 1047 行单视图页）。
- C2 对应行：G-C（多视图数据库——本应用主对照行，状态机 L4 风险）、G-D（网格编辑深度——table 视图边缘对照）、G-F（hover/选中态 schema 表达）、G-E（高密度行排版/属性 chip）、G-A（页面骨架）、G-B3（批量/右键记录操作）——P5a 只做实测证据记录，不做裁决与接线（回写义务归 P5b）。
- roadmap P4a closure follow-up 惯例（本计划起执行）：showcase 目录 chrome 的 `features` 标签用机制词，`Notion__` 端点名仅入 `description`。

## Goals

- （Phase 1 裁定终态数量的）`notion-*` 页面 schema 落盘并注册（category `app-replica`），覆盖分析篇 §3 九页面形态中裁剪后的复刻清单（视图 tab 条 + 五视图 + View settings 面板 + 记录展开 peek + 属性头类型系统；类型裁剪与形态裁剪按 §6.2 声明）。
- `notion-replica.css` 落盘：浅色令牌架构（页面底/侧栏底/hover 灰/正文（两值并存取一套并注明逆向）、次级文本、边框、主操作蓝 `#2383E2`、10 色语义盘三套（文本/背景/图标））声明于 `.nt-root, .nt-dialog` 双作用域（变量 `--nt-*`、类 `.nt-*`）；差异声明（两值取舍、10 色盘子集或全集声明范围、emoji 原生字符、light-only、营销紫 `#5645d4` 隔离）落字本计划。
- `shared/mock-backend-notion.ts` + `showcase-env.ts` fetcher 追加 `Notion__` 读端点分支（get-only：records 数据集含 ≥30 行 × 属性型别样本（Text/Number/Select/Status/Multi-select/Date/Person/File/Checkbox/URL 等裁剪清单内型别）且分页 ≥3 页、`view` 参数化多视图形态（board 分组形态沿 `Linear__issues?view=board` 先例）、视图配置集（每视图私有 filter/sort/group/layout 参数对象）；分支体下沉，showcase-env 整理后 ≤700）。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/notion-replica-visual.spec.ts`）全绿；`notion-mock-backend.test.ts` 单测全绿。
- G-C 静态模拟实测结论落字（tab + visible + 每视图配置集数据预载的承载度、切换分支可见性、重渲染观察）供 P5b 起点与 C2 回写携带。
- 完成复刻验收自查（P1 README §4.2 两维 + §4.3 样式契约）。

## Non-Goals

- 不做交互接线与写端点（行内单元格编辑 I6、新建行插行聚焦 I8、拖拽重排/改期 I9、filter/sort 生效 I3/I4、搜索过滤 I5、group 切换 I11、条件配色生效 I12、记录右键 I14 等属 P5b；Pi-a 只做"可见可点"的静态形态——tabs 视图切换（内建 visible 分支）、面板/peek/列头菜单形态的打开类最小静态动作沿 P2a/P3a/P4a 先例允许）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）；本计划只落字"G-C 静态证据与可模拟性结论"供 P5b 携带。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；冻结列/列类型切换/board 列聚合/popover 原语/option-row（G-F）等产品化归 D1 流程。
- 属性类型裁剪维持分析篇 §6.2：Formula/Relation/Rollup/Place/Button/ID 等长尾类型与 Chart 视图（付费）不进复刻清单，裁剪声明落字；块编辑器（自由块区）、协同权限（Can edit content/Lock database）、500 属性上限不复刻；"Save for everyone" 双层权限以静态演示替代。
- 不复制任何 Notion 品牌资产（logo/wordmark/插画/catLookingUp 等营销素材/原文案）；文案全部自拟中文，产出界面不得出现 "Notion" 名称与商标；emoji 图标体系用开源 picker 字符 + 原生字符实现（免版权，分析篇 §2.5）；营销站品牌紫 `#5645d4` 不得混入 App 复刻令牌。
- 不复刻分析篇 §3 未列的 Notion 面（团队空间管理/成员管理/回收站等），仅复刻裁剪后清单内条目。
- 不做暗色适配（Notion App 为浅色原生；dark 映射关系不落双主题 CSS）。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/notion-*.json`（一页一文件；页面集与浮层归属仅限 Phase 1 Decision 裁定）
- `apps/playground/src/notion-replica/notion-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './notion-replica/notion-replica.css';`，限头部 @import 簇内——不得置于 `@source` 指令之后）
- `apps/playground/src/complex-pages/shared/mock-backend-notion.ts`
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（头部余量整理 + `Notion__` 分支委托；整理后总行数 ≤700，分支体在 mock-backend-notion.ts）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目；features 用机制词、端点名仅入 description——P4a 惯例）
- `apps/playground/src/complex-pages/__tests__/notion-mock-backend.test.ts`
- `tests/e2e/notion-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P5a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见终期 Phase）、`mock-backend.ts`、`mock-backend-antdpro.ts`/`mock-backend-cal.ts`/`mock-backend-linear.ts`（showcase-env 余量整理只压缩 showcase-env 内的委托分支，不触碰任何 mock 模块实现）。

## Failure Paths

> 涉及 mock 读端点，列最小集。

| 可测场景编号     | 触发                       | 行为                             | 可重试 | 用户可见表现                             |
| ---------------- | -------------------------- | -------------------------------- | ------ | ---------------------------------------- |
| nt-records-miss  | records 端点过滤参数无匹配 | 返回空数组                       | 是     | 视图空态文案，不报错                     |
| nt-view-unknown  | `view` 参数非五视图枚举值  | 返回兜底 table 形态数据          | 是     | 默认 table 视图，不崩                    |
| nt-peek-miss     | 记录展开端点 id 无匹配     | 返回兜底记录，页面不崩           | 是     | 占位标题/属性（linear 先例）             |
| nt-page-unknown  | 注册 id 拼写不一致         | 复刻页不可达（开发期发现即修）   | 否     | showcase 列表无该页                      |
| nt-panel-missing | 浮层 testid/目标配置不一致 | 静态浮层打不开（开发期发现即修） | 否     | 面板/peek/菜单按钮无响应（P5b 接线对象） |

> Failure Paths 编号沿用 `nt-` 简名仅为表格紧凑，非 testid 约定——schema testid 一律 `notion-<语义名>`（P1 README 硬规则 3，slug 为 `notion`；CSS 类/变量才用 `nt` 缩写）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`notion-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--nt-*` 令牌在 `.nt-root` 子树可解析 / 视图 tab 切换分支可见性（tabs 内建 + visible 分支）/ 无 "Notion" 商标字样断言；截图仅作视觉证据附件）。行内编辑/拖拽/过滤生效等交互契约的先红后绿锁定归 P5b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（余量整理/CSS/mock/注册是后续每页的依赖）；Phase 2–4 每区块落 schema 即补 e2e；Phase 5 实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与承载裁定 + showcase-env 余量整理 + 复刻 CSS + mock 读端点 + 注册

Status: planned
Targets: `apps/playground/src/notion-replica/notion-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-notion.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/notion-mock-backend.test.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision——页面粒度裁定：分析篇 §3 九页面（table ★★★★ / filter-sort-search-group 面板 ★★★★ / board ★★★★☆ / 记录展开 ★★★☆ / 视图 tab 条 ★★★ / calendar ★★★ / gallery ★★ / list ★ / 属性头类型系统 ★★★★）映射为 schema 集的默认切分。默认提案：**1 张页面 schema `notion-database`**——视图 tab 条 + 五视图（table/board/gallery/calendar/list，tabs 内建切换 + visible 分支）+ View settings 面板 + 记录展开 peek + 新建视图入口形态，全部页内承载（G-C 状态机的诚实压测对象是"同页多视图切换"，跨页 navigate 会稀释该压测——分析篇 §5 L4 风险判定原文）；schema JSON 不入 oversized 门禁（Baseline 实测），但以每 Phase 落盘后的可维护性实测为准，若单页过载则裁定拆分（候选：`notion-database`（tab 条 + table/list + 面板 + peek）+ `notion-database-views`（board/gallery/calendar））并落字理由（一页一文件终态清单必出）
- [ ] Decision——浮层与替代承载裁定：①View settings 滑杆面板载体（`drawer` 型别，无 popover 原语——P4a Display 抽屉先例）；②记录展开 peek 三态（side peek = drawer 右侧（table/board/list 默认）+ center peek = dialog（gallery/calendar 默认）——分析篇 §4 I10 默认规则，full page 三态裁剪为形态注记）；③新建视图菜单载体（dialog + 类型选择形态，I2 静态）；④列头菜单形态（I7：改名字/换型别/排序/隐藏/冻结等条目静态形态——载体 dialog 或 dropdown 形态自组装，无 popover 原语约束下落字）；⑤filter 构建器承载（候选：①condition-builder renderer 静态内嵌（可见可点、过滤生效归 P5b——需落字"静态不生效"边界防模板感误判；②自绘简化 filter 行形态）；⑥calendar 视图承载（候选：①calendar renderer 原样 + 资源时间轴形态差落字 G-C 证据；②container grid + loop 自绘静态月网格——Notion 6 周竖网格形态，P4a ⌘K 壳自组装先例）；⑦Person 头像自绘（container + 缩写 + `.nt-avatar`，P3a/P4a 先例）；⑧emoji 图标 = 原生字符 text 节点（零新依赖）——各项裁定结论与理由落字
- [ ] Decision——令牌差异裁定：按分析篇 §2 提取 `--nt-*` 变量架构；§6.2 要求逐项落字——正文两值并存取一套（`#37352F`，注明社区逆向）；侧栏 `#FBFBFA`/hover `#F7F7F5`/主蓝 `#2383E2` 为社区共识值非官方 token（声明"逆向近似"）；10 色语义盘三套（文本/背景/图标）声明范围裁定（全集 30 变量 or 裁剪清单内型别用到的子集，Phase 内裁定并落字）；营销紫 `#5645d4` 隔离声明；light-only 声明；结果写入本计划「差异声明（P5a 裁定）」节 + CSS 文件头注
- [ ] Fix——showcase-env 头部余量整理：antdpro/cal/linear 三条委托分支压缩（候选：`[prefix, handler]` 数组派发循环），腾出 `Notion__` 委托空间；整理后追加 `Notion__` 分支委托；**总行数 ≤700 且 antdpro/cal/linear 全部既有端点零回归**（`__tests__/` 三套 mock 单测 + 目标 e2e 抽查证明）
- [ ] Fix——`notion-replica.css`：令牌块声明于 `.nt-root, .nt-dialog` 双作用域，变量名 `--nt-*`、类名 `.nt-*`；hover 显控件（行 OPEN/⋮⋮ 把手/hover `+`）纯 CSS `:hover` 形态、属性 chip pill 模式（10 色盘低饱和 pastel 底 + 中饱和字）、表格 ~33px 行高密度、视图 tab 条形态、卡片三档圆角（3–6px 标签/按钮、4–8px 卡片）等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类（双轨规则）
- [ ] Fix——`styles.css` 在头部 @import 簇内追加 `@import './notion-replica/notion-replica.css';`（仅此一行，置于 `@source` 指令之前——cal/linear 先例）
- [ ] Fix——`mock-backend-notion.ts`：类型 + 工厂 + 过滤/排序助手；数据结构真实（records ≥30 行满足默认页大小 10 至少 3 页，裁剪清单内属性型别全覆盖：Text/Number/Select/Status/Multi-select/Date/Person/File/Checkbox/URL/Email/Phone/Created/Edited 样本、10 色盘 chip 样本、hover 显隐状态样本；`view` 参数化返回五视图形态（board 分组 `{groups, columns}` 沿 linear board 先例、calendar 日期落格样本、gallery 封面/卡片样本、list 单列样本）；视图配置集 `viewConfig`（每视图私有 filter/sort/group/layout 参数对象——G-C per-view config set 的数据载体）；沿 `createLinearFetcherBranch` 模式导出 fetcher 分支工厂，全部 get-only
- [ ] Fix——`COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名、features 4 个机制词标签——P1 README 硬规则 6 + P4a 惯例：端点名仅入 description）
- [ ] Proof——`notion-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、属性型别覆盖、五视图形态参数化、视图配置集 per-view 完整性、空过滤路径、未知 view 兜底）

Exit Criteria:

- [ ] 页面粒度、浮层与替代承载（面板/peek 三态/新建视图/列头菜单/filter 构建器/calendar 视图/头像/emoji）、令牌差异三类 Decision 全部落字
- [ ] showcase-env 余量整理完成：总行数 ≤700，既有三 slug 端点零回归（既有单测全绿证明），`Notion__` 端点经 fetcher 分支可命中（mock 单测证明）
- [ ] CSS/mock/注册/test 四类文件落盘；`pnpm --filter @nop-chaos/flux-playground test -- notion-mock-backend` 全绿
- [ ] showcase 页面列表可见全部 `notion-*` 条目（注册生效）

### Phase 2 - notion-database：视图 tab 条 + table 视图 + View settings 面板

Status: planned
Targets: `page-schemas/notion-database.json`、`tests/e2e/notion-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 库名 + emoji 图标 + 视图 tab 条形态（tab name/icon/both 三态样本 + `+` 新建视图入口形态 + 溢出 `more` 形态注记；tabs 内建切换，五视图 visible 分支骨架就位——每分支容器带 `notion-views-<type>` testid）
- [ ] table 视图（默认 active）：属性行头（属性名 + 型别 icon 形态 + 列头菜单入口形态按钮）+ 记录行（单元格按型别分派静态样本：text/number/select chip/status chip/multi-select chips/date/person 头像/checkbox/url）+ 首列 hover 出 OPEN + ⋮⋮ 把手形态（纯 CSS `:hover`）+ 底部 `+ New` 行形态 + 行条件配色静态样本；数据经 `Notion__records?view=table` 流动，默认分页 ≥3 页
- [ ] View settings 面板静态形态（Phase 1 裁定载体：Layout/属性可见性/Filter/Sort/Group/条件配色 分节形态；filter 构建器按 Phase 1 裁定承载，sort 多键静态行组；打开动作 = 设置入口按钮最小静态动作）+ 搜索入口形态（I5 静态）+ 右上 New 按钮形态（I8 静态）
- [ ] 每区块带 `data-testid="notion-<语义名>"`（P1 README 硬规则 3）
- [ ] e2e：初屏结构用例 ≥1 条（库名/tab 条/table 行字段来自 mock/hover OPEN 形态（CSS `:hover` 经 `page.hover` + 可见性断言）/面板可打开/`getComputedStyle` 断言 `--nt-*` 令牌在 `.nt-root` 子树可解析/无 "Notion" 商标字样）

Exit Criteria:

- [ ] `#/complex-pages/notion-database` 可达且初屏结构 e2e 用例绿
- [ ] 视图 tab 条 + table 视图型别分派样本 + View settings 面板在 schema 中可辨识；filter 构建器承载裁定结论对照落字

### Phase 3 - notion-database：board + gallery 视图（visible 分支）

Status: planned
Targets: `page-schemas/notion-database.json`、`tests/e2e/notion-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] board 视图：按 Select/Status 属性分组列（kanban renderer：`columnsConfig` 分组列 + 列头计数 + 卡片三档尺寸样本（small/medium/large）+ 封面样本；`draggable: false` **显式声明**（P4a 教训）+ 静态注记；列头聚合数字（Count/Percent）为 mock 预计算静态值——聚合计算语义缺口落字 §7 候选）；数据经 `Notion__records?view=board`
- [ ] gallery 视图：卡片网格 + 封面（Files&media 样本）+ 属性 chip 行 + 末尾空卡 `+New` 形态；hover 出控制条形态（纯 CSS）；数据经 `Notion__records?view=gallery`
- [ ] e2e：tab 切换到 board/gallery 分支可见 + 各自结构断言（分组列集与计数来自 mock、卡片字段/封面可断言、`draggable: false` 声明存在性由 schema 单测锁定）；table 视图零回归

Exit Criteria:

- [ ] board/gallery 分支切换可达，e2e 用例绿
- [ ] kanban `draggable: false` 显式声明落字；列聚合静态承载与语义缺口注记落字

### Phase 4 - notion-database：calendar + list 视图 + 记录展开 peek

Status: planned
Targets: `page-schemas/notion-database.json`、`tests/e2e/notion-replica-visual.spec.ts`

- [ ] calendar 视图：按 Phase 1 裁定承载（renderer 原样 or 自绘静态月网格）——日期属性落格卡样本 + hover 日格 `+` 形态（自绘时纯 CSS）+ 今日强调；数据经 `Notion__records?view=calendar`（落格样本）
- [ ] list 视图：极简单列 + 行内属性 chip + 底部 `+ New` 形态；数据经 `Notion__records?view=list`
- [ ] 记录展开 peek：行 OPEN / 卡片点击（最小静态动作）→ side drawer（table/board/list 语境）与 center dialog（gallery/calendar 语境）双形态样本——属性逐行（图标 + 名 + 值 chip）+ 下部内容区形态（分析篇 §6.2 裁剪：自由块区不复刻，静态注记）；数据经 `Notion__records` 行内数据或独立 id 参数（Phase 内裁定）
- [ ] e2e：calendar/list 分支切换可见 + peek 双形态打开断言（drawer/dialog 载体 + 属性行可断言）；全部五视图切换链路走查用例（tab → 五分支逐一可见）；table 视图零回归

Exit Criteria:

- [ ] calendar/list 分支可达，peek 双形态 e2e 绿
- [ ] calendar 视图承载裁定对照落字（形态差或自绘结论）；peek 三态裁剪声明落字

### Phase 5 - G-C 静态实测结论、复刻验收自查与事实勘误

Status: planned
Targets: 本计划、`docs/analysis/ui-review/P1-reference-apps/notion-database.md`（仅事实勘误时）

- Item Types: `Proof | Decision`

- [ ] G-C 静态实测结论清单落字（供 P5b 起点与 C2 回写携带）：tab + visible + 每视图配置集（`viewConfig` 数据预载）模拟的状态机承载度逐项记录——切换分支可见性成立面、每视图 filter/sort/group 参数对象的数据形态、切换重渲染观察（C1-4 预测的 tab 模拟重渲染成本实测点：五分支并存 visible 切换的表现）、与 §5 L4 风险三处（配置集双层权限/类型↔布局↔peek 联动/嵌套 filter 求值）的静态对照——不接线、不裁决
- [ ] AI 模板感自查（P1 README §4.2）：无"demo 占位"按钮——面板/peek/列头菜单/tab 切换全部有真实打开或切换行为；hover/空态/选中态成对可见；数据经 mock 端点流动（静态 rail 类除外：新建视图菜单类型清单、帮助性注记等）；对照 §2 令牌表抽查密度（~33px 行高）/圆角/主蓝/10 色盘 pill 模式与原版结构一致性
- [ ] 缺口注记核对：无 popover 原语、冻结列/类型切换（G-D 边缘）、board 聚合计算（§7 候选）、个人视图偏好存储层（§7 候选）、hover 显控件 CSS 模拟口径（G-F），确认已随 Phase 1–4 落字并可被 P5b 的 C2 回写引用
- [ ] 样式契约自查（§4.3）：新 CSS 全部在 `notion-replica.css` scope 专用类；零 renderer 包改动；`git status` 确认变更面仅 In Scope 清单
- [ ] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [ ] `npx playwright test tests/e2e/notion-replica-visual.spec.ts --reporter=list` 全绿（全部初屏用例）；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）
- [ ] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

Exit Criteria:

- [ ] G-C 静态实测结论清单节落字（含状态机承载度 ↔ 缺口对照）
- [ ] 两维自查记录落字（通过/打回处置结论）
- [ ] 目标 e2e 与包级检查全绿记录落字
- [ ] 变更面核查记录落字

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb1927b7bffeqTLpboIxsYZSWY`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1 `pass-with-minors`（零 Blocker/零 Major，4 Minor）——2 Minor 已随共识修复（Phase 1 末五项 checklist 补 `Fix`/`Proof` 型别前缀；showcase-env 胶水分支行数算术修正为 ~6 行/2 注释 + 4 代码）。R2 复核维持 `pass-with-minors` 零 Blocker/零 Major 达成共识；余 2 Minor 为咨询级不阻塞（linear 委托实际 5 行的近似口径；drawer 引用 :196/:197 与勘误条款双述），处置表与 Closure Gate 为准。

## Closure Gates

- [ ] 全部（或 Phase 1 裁定终态数量）`notion-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（含五视图切换链路走查）
- [ ] 差异声明已裁定并落字（两值取舍/10 色盘范围/营销紫隔离/emoji 替代/light-only 逐项）
- [ ] showcase-env 余量整理完成且总行数 ≤700；`notion-mock-backend.test.ts` 全绿；`Notion__` 端点全部 get-only；`mock-backend.ts` 零触碰；既有 antdpro/cal/linear 端点零回归
- [ ] G-C 静态实测结论清单落字（P5b 起点与 C2 回写可引用）
- [ ] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [ ] 无品牌资产复制（产出界面无 "Notion" 名称与商标；logo/插画/原文案/营销紫全部隔离）
- [ ] AI 模板感治理与样式契约自查完成并落字
- [ ] roadmap Phase Status 区 P5a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [ ] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 目标 e2e：`npx playwright test tests/e2e/notion-replica-visual.spec.ts` 全绿

## Deferred But Adjudicated

### 交互接线全谱（行内编辑/插行/拖拽/过滤生效/group 切换/右键——I3–I6/I8/I9/I11/I12/I14）

- Classification: `watch-only residual`（对 P5a 而言非缺口，为 Pi-b 既定范围）
- Why Not Blocking Closure: 两段式边界（P1 README §5）固定 Pi-a = 静态形态；交互接线与先红后绿契约锁定属 P5b 义务，roadmap 既有 work item
- Successor Required: `yes`
- Successor Path: P5b plan（本 roadmap 既有 work item，无需新建）

### 个人视图偏好存储层（activeViewId/display 三态"仅本人生效"配置）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 分析篇 §5 L4 风险判定为 schema 外偏好存储层缺口（G-C 伴生），P5a 以静态配置集数据预载模拟，不影响"多视图静态复刻"结果面成立
- Successor Required: `yes`
- Successor Path: P5b C2 回写一并处理（分析篇 §7 既有登记）

### board 列聚合计算（Count/Sum/Avg/Percent 动态语义）

- Classification: `optimization candidate`
- Why Not Blocking Closure: kanban 语义增强候选（分析篇 §7），P5a 以 mock 预计算静态值承载列头聚合形态，不影响 board 视图结构复刻成立
- Successor Required: `yes`
- Successor Path: P5b C2 回写一并处理（分析篇 §7 既有登记）

## Non-Blocking Follow-ups

- `Notion__` mock 数据集若在 P5b 接线中发现状态样本不足（编辑中间态/插入行/拖拽 ghost 等），在 `mock-backend-notion.ts` 内补样本属 P5b Fix 范围
- 10 色语义盘若裁定为子集声明，全集扩补属 `notion-replica.css` 内追加（Phase 1 裁定记录处注记）
- `--nt-*` 变量架构共享复刻基建抽取（P3a/P4a follow-up 沿袭）：不入本计划

## Closure

Status Note: <<完成或关闭时填写：为什么这个 plan 可以关闭>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
