# P6a Airtable grid 网格编辑复刻 — 分析与静态复刻

> Plan Status: completed
> Mission: ui-review
> Work Item: P6a. Airtable grid 网格编辑复刻 — 分析与静态复刻
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P6a 条目 + Phase Details P6 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（slug `airtable`/前缀 `at`/端点 `Airtable__` 分配表 + §1–§5 全部硬规则）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`（令牌 §2、页面清单 §3、交互清单 §4.1–4.3、能力映射 §5 含矩阵缺口六处初判、差异声明 §6.2、转 C2 候选 §7）
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/2026-08-30-0040-2-p5a-notion-database-static-replica.md`（Pi-a 最近先例：单页裁定型制、差异声明节、mock 模块行数双口径记录、自绘/替代承载先例）；`docs/plans/2026-08-29-1413-1-p2b-antdpro-interaction-wiring-and-tests.md`（回写 ③ crud `columnSettings` 实测证据）
> 执行顺序约束：roadmap 虚线 `P5b -.-> P6a`——本计划在 P5b `done` 前不得开始执行；执行启动时必须重新 live 复核本节 baseline（尤其 `showcase-env.ts` 行数预算与 P5b 对 `mock-backend-notion.ts` 的模块组织改动）

## Purpose

消费 P1 已产出的复刻工程规范与 Airtable grid 分析篇，把 roadmap P6 点名的"电子表格体验的关系型网格"（G-D 原型参照：导航态/编辑态双态分离、单元格型别分派渲染、列头菜单、行高四档密度、分组聚合汇总、record 展开 modal）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，压测 `table`/`crud`/`input-table` 底座对 G-D（网格编辑深度）的承载度，并为 P6b（交互接线与测试）提供全部静态落点与 G-D 静态实测结论。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `827778012`）：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1、P2a/P2b、P3a/P3b、P4a/P4b、P5a 均 `done`；P5b plan 已起草（`docs/plans/2026-08-30-0614-1-p5b-notion-interaction-wiring-and-tests.md`，draft——虚线前置，无文件冲突）。P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（`airtable` slug/`at` CSS 前缀/`Airtable__` 端点前缀分配表 + 目录/mock/e2e/验收规范）与 `airtable-grid.md`（§2 浅色令牌结构（📊 社区口径须标注）、§3 七页面复杂度 ★~★★★★★、§4.1 28 型别编辑器矩阵 + §4.2 列头菜单/行高/分组 + §4.3 键盘导航全表、§5 能力映射与矩阵缺口六处初判、§6.2 差异声明要求、§7 两个转 C2 候选）已落盘。
- **`airtable` 复刻产物零存在**（`ls apps/playground/src/complex-pages/page-schemas/`、`tests/e2e/`、`complex-pages/__tests__/`、`shared/` 实测无 airtable 条目；`showcase-env.ts` 无 `Airtable__` 分支），本计划为该 slug 的建立者。
- 复刻基建先例在库（四 slug）：`showcase-env.ts`（**697 行** ≤700 红线）`replicaBranches` `[prefix, handler]` 数组派发循环（P5a Phase 1 整理后形态）——追加 `Airtable__` 委托为数组条目 + handler 下沉，胶水 ~1–2 行；`styles.css` 头部 @import 簇（:23 notion 行，@import 必须位于 :24 `@source` 指令之前）；`complex-pages-model.ts` `COMPLEX_PAGE_ENTRIES` 注册（category `app-replica`）；`tests/e2e/notion-replica-visual.spec.ts`（364 行）e2e 骨架（openPage 模式）。`mock-backend.ts`（463 行）零触碰红线。
- **render-host registry 已注册 7 包**（`apps/playground/src/complex-pages/shared/render-host.tsx:5-22`：basic/form/form-advanced/data/content/layout/scheduling）——本计划所需型别全部可达，预期零 render-host 改动。
- **关键承载实测结论（先例证据，Phase 1 Decision 输入）**：
  1. **网格底座三候选（G-D 压测核心，Phase 1 裁定）**：①`input-table`（`packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:104-130`，renderer 定义注册 `input-table-renderer.tsx:425`）——form 值域的行编辑表格：`columns` 仅 label/width、单元格经 `item` region 内嵌 form 字段按行 scope 渲染、`addable/removable/reorderable` 在库；**值归 form field 不走 data-source**（静态复刻需 form 预载数据路径实测）；②`table`/`crud` 只读网格 + record modal form 编辑（导航态/编辑态双态分离的近似承载——Airtable"单击选中、Enter 进编辑"的双态以"网格只读 + modal 全字段编辑"近似）；③混合（网格展示 table + 型别分派静态样本 + record modal 承载编辑器矩阵样本）。playground 既有 `inline-edit-table.json` 页即 crud 底座（crud + input-number 实测）。
  2. **`rating` 型别零 renderer**：起草时全仓 grep 零 renderer 命中（仅 `flux-renderers-ai` 无关文件）——缺口候选，静态以 badge/文本近似承载并落字（分析篇 §5 "rating 原语存疑"实测收敛为"无"）。
  3. **`upload` 型别名不存在**：附件承载为 form-advanced `input-file`（`input-file-renderer.tsx:15`）/`input-image`（`input-image-renderer.tsx:42`）——分析篇 §5 "Attachment→`upload`" 映射行以实际型别名修正（事实勘误候选，终期 Phase 落字）。
  4. **其余矩阵底座**：`input-text`/`input-number`/`input-date`（popover 月历已落地）/`input-datetime`/`select`（多选 chips）/`checkbox`（form 包，P5a/P4b 实测）；`condition-builder`（form-advanced，已注册）；`BarcodeInput`（scheduling 包，已注册）；Email/URL/Phone 以 `input-text` + 校验承载（P3b input-phone 口径）；Formula/Lookup/Rollup 只读列以表达式/mock 预计算承载。
  5. **无 popover 原语**（P4a/P5a 实测口径维持）——列头菜单、Hide fields 面板、分组菜单载体为 drawer/dialog（P5a D2 先例）；`condition-builder` 静态内嵌 filter 面板（P5a D2⑤ 先例）。
  6. **键盘双态模型全谱无承载**：Enter/F2 进编辑、方向键导航、⇧ 范围选区、⌘ 点击多选、fill handle 等差填充、Space 展开记录——非任何网格底座内建（G-B2/G-B3 缺口，P4b 实测口径同源：table 逐行 checkbox 为普通 toggle、零修饰键处理）——Pi-a 静态不复刻，**键盘缺口静态证据清单落字**（键位↔承载物↔缺口↔可模拟性初判，沿 P4a 先例）供 P6b 显式裁决与 C2 回写。
  7. **行高四档**：纯 CSS 密度档（`.at-*` 类）承载静态档位样本——`density` 语义字段零命中维持（P2b 回写 ③ 实测），档位切换生效的 schema 表达缺口归 G-E 证据（className 表达式绑定 G-F2 同根）。
- **schema JSON 不入 oversized 门禁**：`scripts/check-oversized-code-files.mjs` 仅扫描 `.js/.jsx/.ts/.tsx/.mjs/.cjs`——但 Phase 1 页面粒度裁定仍以可维护性为准，且**新落盘 ts 文件行数必须以 wc 与门禁切分双口径诚实记录**（P5a closure audit Major 教训：行数记录不实即打回）。
- C2 对应行：**G-D（网格编辑深度——本应用主对照行）**、G-B3（批量选区/填充——"待 P6/P7 回写"行）、G-E（密度档）、G-F（hover/选中态 schema 表达）、G-B2（键盘导航）——P6a 只做静态实测证据记录，不做裁决与接线（回写义务归 P6b）。
- 分支纪律与命名（P1 README §0 分配表）：文件名 `airtable-*.json`、CSS 类/变量 `.at-*`/`--at-*`、mock 端点 `Airtable__`、页面 id `airtable-grid`；testid 一律 `airtable-<语义名>`（P1 README 硬规则 3）。

## Goals

- （Phase 1 裁定终态数量的）`airtable-*` 页面 schema 落盘并注册（category `app-replica`），覆盖分析篇 §3 裁剪后的复刻清单（Grid 主视图 + record 展开 modal + Hide fields 面板 + 列头菜单 + 分组态样本 + 行高档位样本；28 型别按 §6.2 裁剪清单落字；fill handle/批量选区为键盘层缺口——静态证据清单落字不复刻）。
- `airtable-replica.css` 落盘：浅色令牌架构（页面白底/浅灰面板/网格白底/行分隔浅灰/主蓝（📊 社区口径 `#2d7ff9` 类，标注逆向近似与风格参考定位）/行 hover 灰/collaborator 彩色头像盘/字段彩色 chip 盘）声明于 `.at-root, .at-dialog` 双作用域（变量 `--at-*`、类 `.at-*`）；13px 网格正文密度、行高四档密度档样本、chip 圆角 3–4px；差异声明（社区口径标注、Inter 近似栈、28 型别 glyph 自绘近似、light-only）落字本计划 + CSS 头注。
- `shared/mock-backend-airtable.ts` + `showcase-env.ts` fetcher 追加 `Airtable__` 读端点分支（get-only：records ≥30 行 × 裁剪清单型别全覆盖且分页 ≥3 页、`group=` 参数化分组形态 + summary 预计算、record 明细端点（modal 取数，沿 `Notion__record?id=` 先例）；分支体下沉，showcase-env 整理后 ≤700）。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/airtable-replica-visual.spec.ts`）全绿；`airtable-mock-backend.test.ts` 单测全绿。
- G-D 静态实测结论落字（网格底座三候选承载度终判、双态近似边界、型别矩阵覆盖度、键盘缺口静态证据清单、列头菜单/分组/行高的 schema 表达边界）供 P6b 起点与 C2 回写携带。
- 完成复刻验收自查（P1 README §4.2 两维 + §4.3 样式契约）。

## Non-Goals

- 不做交互接线与写端点（单元格编辑提交、插行、record modal 保存、列头菜单动作生效、分组/筛选/排序切换生效、行高切换生效等属 P6b；Pi-a 只做"可见可点"的静态形态——浮层/菜单/modal 的打开类最小静态动作沿 P2a/P3a/P4a/P5a 先例允许）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）；本计划只落字"G-D 静态证据与可模拟性结论"供 P6b 携带。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；网格双态键盘模型、fill handle、范围选区、rating 原语、collaborator 选人原语、分组聚合语义件、列 schema 动态变更菜单语义、密度档语义字段等产品化归 D1 流程。
- 属性型别裁剪维持分析篇 §6.2：付费能力（视图锁定/高级权限）与长尾型别不进复刻清单（裁剪清单 Phase 1 落字终态）；协同权限/撤销重做/跨表 lookup 真实化不复刻。
- 不复制任何 Airtable 品牌资产（logo/wordmark/插画/原文案）；文案全部自拟中文，产出界面不得出现 "Airtable" 名称与商标；28 型别 glyph 按型别语义自绘近似，不复制原图。
- 不复刻分析篇 §3 未列的 Airtable 面（Base/Workspace 管理、Interface Designer、Automations 等），仅复刻裁剪后清单内条目。
- 不做暗色适配（Airtable grid 以浅色为默认场景；dark 映射关系不落双主题 CSS，light-only 声明落字）。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/airtable-*.json`（一页一文件；页面集与浮层归属仅限 Phase 1 Decision 裁定）
- `apps/playground/src/airtable-replica/airtable-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './airtable-replica/airtable-replica.css';`，限头部 @import 簇内——不得置于 `@source` 指令之后）
- `apps/playground/src/complex-pages/shared/mock-backend-airtable.ts`
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（`Airtable__` 分支委托；必要时沿 P5a Phase 1 先例做余量整理，总行数 ≤700，分支体在 mock-backend-airtable.ts）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目；features 用机制词、端点名仅入 description——P4a 惯例）
- `apps/playground/src/complex-pages/__tests__/airtable-mock-backend.test.ts`
- `tests/e2e/airtable-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P6a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见终期 Phase）、`mock-backend.ts`、`mock-backend-antdpro.ts`/`mock-backend-cal.ts`/`mock-backend-linear*.ts`/`mock-backend-notion.ts`、新增 playground 非 airtable schema 页面、新 CSS 文件（仅 `airtable-replica.css`）。

## Failure Paths

> 涉及 mock 读端点，列最小集。

| 可测场景编号     | 触发                       | 行为                         | 可重试 | 用户可见表现                               |
| ---------------- | -------------------------- | ---------------------------- | ------ | ------------------------------------------ |
| at-records-miss  | records 端点过滤参数无匹配 | 返回空数组                   | 是     | 网格空态文案，不报错                       |
| at-view-unknown  | `view` 参数非枚举值        | 返回兜底 grid 形态数据       | 是     | 默认 grid 视图，不崩                       |
| at-record-miss   | record 端点 id 无匹配      | 返回兜底记录                 | 是     | 占位字段（linear/notion peek 先例）        |
| at-group-unknown | `group` 参数非枚举字段     | 返回无分组平铺形态           | 是     | 平铺网格，不崩                             |
| at-page-unknown  | 注册 id 拼写不一致         | 复刻页不可达（开发期即修）   | 否     | showcase 列表无该页                        |
| at-panel-missing | 浮层 testid/目标配置不一致 | 静态浮层打不开（开发期即修） | 否     | 面板/菜单/modal 按钮无响应（P6b 接线对象） |

## 差异声明（P6a 裁定）

> Phase 1 Decision 落字节（已全部裁定，见 Phase 1 勾选项内逐条理由）；CSS 侧同步声明于 `airtable-replica.css` 文件头注（两处一致）。

- **D1 页面粒度（已裁定）**：**单页 `airtable-grid`**（视图栏 + 网格主视图 + 列头菜单 + Hide fields 面板 + record modal + 分组态样本 + 行高档样本全部页内承载——G-D 压测对象是"同页双态网格与浮层族"，三浮层分别锚定网格列头/视图栏入口/行展开入口，跨页 navigate 会稀释压测，沿 P5a D1 型制）。实测不触发过载拆分：P5a 单页 `notion-database`（7191 行 JSON、五视图 + 六类浮层页内承载）先例证明单页可承载且 e2e 可走查。终态清单：`page-schemas/airtable-grid.json` 一页一文件（页面 id 与文件名一致——P1 README 硬规则 1）。
- **D2 浮层与替代承载（已裁定）**：①列头菜单 = dialog（条目：隐藏字段（🌐 官方证实）/ 编辑字段 / 换型别 / 排序 A→Z / 排序 Z→A / 向左插入字段 / 向右插入字段 / 删除字段（📊 标准项）；条目裁剪注记：换型别以型别清单只读展示形态呈现（动态改列 schema 归 G-D 列菜单缺口，不复刻生效）、冻结列不在 Airtable grid 菜单语义内不入清单）；②Hide fields 面板 = drawer（side right，逐字段 toggle 形态 + "查找字段"搜索输入形态 + 全部隐藏/全部显示形态按钮 + 主字段不可隐藏注记（🌐），toggle 零生效注记——显隐生效归 P6b）；③record 展开 modal = dialog（全字段 form 分区静态形态（基本信息/数值与进度/人员与联系/系统字段四分区）+ 上一条/下一条导航形态按钮（载荷携带 prevId/nextId，点击 openDialog 换 id 重取——打开类最小静态动作先例）+ ⌘⇧>/< 键盘导航缺口注记 + 数据经 `Airtable__record?id=` 端点 + miss 兜底占位）；④分组/行高/筛选/搜索控件 = 视图栏静态控件形态（行高四档分段控件形态、筛选/搜索入口按钮形态——零生效，切换生效归 P6b；分组态经 mock `group=category` 参数化承载样本区）；⑤**网格底座 = 三候选之 ③ 混合**（导航态网格 = `table` renderer 只读 + 20 字段型别分派静态样本 + mock 端点流动；编辑态 = record modal form 全字段编辑器形态——"网格只读 + modal 编辑"近似双态分离；键盘双态 Enter/F2 无承载（G-B2 缺口）落字键盘缺口清单）；⑥collaborator 头像 = container + 缩写 + `.at-avatar-*` 彩色圆底（P3a/P4a/P5a 自绘先例）；⑦20 字段型别 glyph = 语义字符 + `.at-glyph-*` 彩色小方块自绘近似（不复制原图）；⑧rating = ★/☆ 字符序列近似承载（零 renderer 实测收敛）；⑨attachment 网格形态 = `.at-thumb-*` 彩色缩略方块 + 计数 chip（编辑器形态承载为 form-advanced `input-file`/`input-image`——分析篇 §5 "Attachment→`upload`" 映射行 `upload` 型别名全仓零命中，勘误候选终期落字）。
- **D3 令牌差异（已裁定）**：§2 全部色值/px 为 📊 社区口径——CSS 落字"逆向近似"头注；主蓝 `#2d7ff9` 定位为**风格参考保留**为复刻层独立令牌 `--at-blue`（不映射 flux `--primary` hsl 体系，与 sundial/notion 复刻层独立令牌先例一致）；专有字体（Colfax 类）→ `Inter, -apple-system, "Segoe UI", sans-serif` 近似栈；网格正文 13px、表头 12px、summary bar 12px；行高四档 ≈32/48/80/160px（📊 口径标注，CSS 变量 `--at-row-short/medium/tall/extra`）；chip 圆角 4px、按钮 4–6px、record modal 8px；字段彩色盘 9 色（gray/red/orange/yellow/green/teal/blue/purple/pink）× text/bg/icon 三套（📊 吸管近似）；light-only（无暗色映射，头注声明）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`airtable-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--at-*` 令牌在 `.at-root` 子树可解析 / 行高 Short 档 ≈32px 实测 / 型别分派样本列可辨识 / 无 "Airtable" 商标字样断言；截图仅作视觉证据附件）。单元格编辑提交/键盘双态/fill handle 等交互契约的先红后绿锁定归 P6b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（底座裁定/CSS/mock/注册是后续每页的依赖）；Phase 2 网格主视图；Phase 3 浮层族 + G-D 静态实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与网格底座裁定 + 复刻 CSS + mock 读端点 + 注册

Status: completed
Targets: `apps/playground/src/airtable-replica/airtable-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-airtable.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/airtable-mock-backend.test.ts`

- Item Types: `Decision | Fix | Proof`

- [x] Decision——页面粒度裁定：分析篇 §3 七页面（Grid ★★★★★ / record modal ★★★★ / 批量选区+填充 ★★★★ / Group 分组态 ★★★★ / 列头菜单 ★★★ / 行高切换 ★★ / Hide fields ★★）映射为 schema 集的默认切分——默认提案单页 `airtable-grid`（D1），过载则拆分并落字理由（终态清单必出）→ **裁定单页不拆分（D1 已落字「差异声明（P6a 裁定）」）：三浮层分别锚定网格列头/视图栏入口/行展开入口，与网格共处一个压测面，跨页拆分稀释 G-D 压测；P5a 单页 7191 行 JSON 先例证明可承载。终态清单 = `page-schemas/airtable-grid.json` 一页一文件**
- [x] Decision——网格底座裁定（G-D 压测核心）：三候选 ①`input-table`（form 值域，form 预载数据路径需实测）②`table`/`crud` 只读网格 + record modal form 编辑（双态近似）③混合——按 Phase 内 live 实测（含 form 预载可行性试做）裁定并落字理由、保真度边界与 G-D 证据；`crud columnSettings: {enabled: true}`（P2b 回写 ③ 实测在库）适用性一并评估 → **裁定 ③ 混合（D2⑤ 已落字）。live 实测证据：①`InputTableSchema extends BoundFieldSchemaBase`（composite-schemas.ts:95–130 复核）——值域是 form field 体系、`columns` 仅 label/width、单元格经 item region 按行 scope 渲染，无 source/data-source 读通道，30+ 行 mock 数据只能经 form 值预载进入，且行号列/分页（form 值域不分页）/summary bar/分组形态零承载，"数据经 mock 端点流动"（P1 README §4.2）在 ① 上是 form 预载变通、与 G-D 网格读端点流动压测目标错位 → 不选；②table renderer（`source`/`columns[].cell`/`pagination`/`empty`）经 notion P5a/linear P4a 先例实测全通（端点流动+型别 cell 分派+客户端分页 ≥3 页+行 hover），crud 相对 table 多工具栏/查询 chrome（与 Airtable 极简网格形态偏差更大）→ 底座选 table 不用 crud；`crud columnSettings:{enabled:true}` 可承载列显隐但形态保真度低于 drawer（D2②）且引入多余 chrome → 不采用；③混合 = 导航态 table 只读网格 + record modal 编辑态近似；双态近似边界：Enter/F2 键盘双态无承载（G-B2），键盘缺口清单 Phase 3 落字**
- [x] Decision——浮层与替代承载裁定：列头菜单/Hide fields/record modal/分组与行高控件载体（D2 ①–④）+ 型别裁剪清单终态（28 → 裁剪清单落字：Formula/Lookup/Rollup/长尾与付费能力裁剪；rating/attachment/collaborator/barcode 承载裁定）——各项裁定结论与理由落字 → **九项载体裁定 + 裁剪清单终态全部落字（D2 ①–⑨ 已更新）：列头菜单 dialog（八条目+裁剪注记）/Hide fields drawer/record modal dialog（prev/next 导航载荷实测支持）/视图栏静态控件/网格底座 ③/collaborator 自绘头像/型别 glyph 自绘/rating ★序列近似/attachment 缩略块近似。型别裁剪清单终态（28 型 → 20 字段 / 19 型别族）：保留 单行文本/长文本/单选/多选/日期/数字/货币/百分比/复选框/附件/协作人/邮箱/URL/电话/时长/评分(近似)/条码/自动编号(只读)/创建·修改时间(只读×2)；裁剪：Formula/Lookup/Rollup（计算类只读，以只读灰显样本注记承载不单列）、Linked record（搜索选记录浮层型，P6b 动作域）、Button（动作字段，接线归 P6b）、Count（与自动编号合并只读数字样本）、付费能力（视图锁定/高级权限 🌐）。事实修正：分析篇 §5 "Attachment→`upload`" 行 `upload` 型别名全仓零命中，实际承载 `input-file`(input-file-renderer.tsx:15)/`input-image`(input-image-renderer.tsx:42)——勘误候选登记，终期 Phase 落字**
- [x] Decision——令牌差异裁定：按分析篇 §2 提取 `--at-*` 变量架构；📊 社区口径逐项标注、主蓝定位裁定、Inter 近似栈、行高四档 px、light-only——结果写入本计划「差异声明（P6a 裁定）」节 + CSS 文件头注 → **D3 已裁定并落字（「差异声明（P6a 裁定）」D3 + airtable-replica.css 头注两处一致）：全部色值/px 标注 📊 逆向近似；主蓝 `#2d7ff9` 保留为复刻层独立令牌 `--at-blue`（不映射 flux `--primary`，sundial/notion 先例）；Inter 近似栈；13px 正文/12px 表头/12px summary；行高四档 `--at-row-short/medium/tall/extra` = 32/48/80/160px；chip 4px/按钮 4–6px/modal 8px；9 色盘 ×3 套；light-only**
- [x] Fix——`airtable-replica.css`：令牌块声明于 `.at-root, .at-dialog` 双作用域，变量名 `--at-*`、类名 `.at-*`；13px 网格密度、行高四档密度类、行 hover、选中单元格蓝框静态态、chip pill 模式、collaborator 头像盘、型别 glyph 近似等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类与 container props（双轨规则，P5a container-body 教训注记）→ **已落盘 `apps/playground/src/airtable-replica/airtable-replica.css`（wc 实测 725 行——终态，含执行期 container-body 实测修正与 min-width 滚动承载；oversized 门禁仅扫 `.js/.jsx/.ts/.tsx/.mjs/.cjs`，CSS 不入门禁——Baseline 已声明）：§1 令牌块双作用域 + §2 工具栏控件 + §3 网格 13px/Short 密度/hover/选中蓝框/hover 显行工具 + §4 glyph + §5 chip/头像/链接/评分/缩略块/checkbox/长文本截断 + §6 行高四档密度类 + §7 summary bar/组头/组 summary + §8 菜单条目/字段行/记录分区；布局/间距未入 CSS（双轨规则）**
- [x] Fix——`styles.css` 在头部 @import 簇内追加 `@import './airtable-replica/airtable-replica.css';`（仅此一行，置于 `@source` 指令之前）→ **已追加于 notion 行后（:24）、`@source` 指令（现 :25）之前，仅此一行**
- [x] Fix——`mock-backend-airtable.ts`：类型 + 工厂 + 过滤/分组/分页助手；数据结构真实（records ≥30 行满足默认页大小 10 至少 3 页，裁剪清单内型别全覆盖：Single line text/Long text/Single select/Multiple select/Date/Number/Currency/Percent/Checkbox/Attachment/Collaborator/Email/URL/Phone/Duration/Rating 近似/Barcode/Autonumber 只读/Created·Modified 只读样本、彩色 chip 盘、头像样本；`group=` 参数化分组形态 + 组内计数 + summary bar 预计算；record 明细端点沿 `Notion__record?id=` 先例）；沿既有 fetcher 分支工厂模式导出分支，全部 get-only；行数以 wc + 门禁切分双口径记录 → **已落盘四模块（沿 P5b notion 五件拆分先例）：`mock-backend-airtable.ts`（wc 123 行，入口 + get-only fetcher 分支）/`-types.ts`（wc 191 行，类型 + 9 色盘 + 20 字段注册表 + 协作者/单选/多选注册表 + fields 载荷类型）/`-records.ts`（wc 243 行，33 行确定性数据集 + 行投影 + 过滤/分页/summary + 字段元数据投影）/`-views.ts`（wc 48 行，group 参数化分组计算）；wc 双口径：四文件全部 ≤500 WARN 线（oversized 门禁零命中）、合计 605 行；行数为收口终值（closure audit Major-1 修正：初稿记录 122/174/216/46=558 为中间态未刷新）；33 行数据集默认页大小 10 → 4 页 ≥3 页；`prevId/nextId` 载荷支持 modal 上一条/下一条导航**
- [x] Fix——`showcase-env.ts` 追加 `Airtable__` 分支委托（`replicaBranches` 数组条目 + handler 下沉）；总行数 ≤700 且 antdpro/cal/linear/notion 全部既有端点零回归（既有单测证明）；`mock-backend.ts` 零触碰 → **数组条目一行（`['/r/Airtable__', createAirtableFetcherBranch(createAirtableDatabase(), clone)]`，工厂内联与 linear 条目先例同型）+ import 一行，胶水 2 行；wc 实测 699 行、门禁切分口径（`split(/\r?\n/).length`，check-oversized-code-files.mjs:83）= 700 行——双口径均 ≤700（零余量贴线受控）；既有单测全绿（32 文件 313 用例，antdpro/cal/linear/notion 零回归）；`mock-backend.ts` 零触碰（git status 核查）**
- [x] Fix——`COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名、features 4 个机制词标签——P1 README 硬规则 6 + P4a 惯例）→ **`airtable-grid` 条目已追加（id `airtable-grid`/title「网格任务跟踪 · 电子表格网格」/category `app-replica`/description 含 `Airtable__records`/`Airtable__record` 端点名/features 4 机制词），单测锁定（features 不含端点名——P4a 惯例）**
- [x] Proof——`airtable-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、型别覆盖、group 参数化、summary 预计算、空过滤路径、未知 view/group 兜底）→ **已落盘（13 用例全绿）：数据集 ≥30 行 + 分页 ≥3 页（默认页大小 10 服务器分页口径 `paginateAirtable(records,1,10).pages ≥3` + 端点默认请求 10 行/总数 33 双证）、20 字段注册表 + 逐记录型别覆盖断言、9 色盘三套断言、行投影 `at-*` 类与预计算标签断言、group 参数化（4 组计数/金额/交付/样本行）、summary 预计算、at-records-miss 空过滤、at-view-unknown 兜底、at-group-unknown 平铺兜底、at-record-miss 占位 + prev/next、get-only 契约（post/put 拒绝）、showcase-env 路由、注册断言**

Exit Criteria:

- [x] 页面粒度、网格底座、浮层与型别裁剪、令牌差异四类 Decision 全部落字 → **D1/D2（含⑤底座）/D3 + D2 内型别裁剪清单终态全部落字「差异声明（P6a 裁定）」节**
- [x] `Airtable__` 端点经 fetcher 分支可命中且全部 get-only；showcase-env 总行数 ≤700，既有四 slug 端点零回归（既有单测全绿证明） → **单测证明：get-only 契约用例（post/put → status 1）+ showcase-env 路由用例绿；wc 699 ≤700；playground 全量单测 32 文件 313 用例绿（含 antdpro/cal/linear/notion 既有端点）**
- [x] CSS/mock/注册/test 四类文件落盘；`pnpm --filter @nop-chaos/flux-playground test -- airtable-mock-backend` 全绿 → **13 用例全绿（`Test Files 32 passed`）**
- [x] showcase 页面列表可见全部 `airtable-*` 条目（注册生效） → **`COMPLEX_PAGE_ENTRIES` 条目已注册（单测锁定 category/features/description 契约）；页面可达性 e2e 证明归 Phase 2（schema 落盘后 `#/complex-pages/airtable-grid` 初屏用例）**

### Phase 2 - airtable-grid：网格主视图（导航态网格 + 型别分派样本 + 列头 + 行高档）

Status: completed
Targets: `page-schemas/airtable-*.json`、`tests/e2e/airtable-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] 视图栏形态：视图 switcher（grid 即选态样本）+ Hide fields 入口形态 + 行高档位控件形态 + 搜索/筛选入口形态（`airtable-*` testid 逐节点落位，P1 README 硬规则 3）→ **已落位：`airtable-view-pill-grid`（at-pill-active 选中态 + 内建 icon）/`airtable-hide-fields-trigger`（openDrawer 静态动作）/`airtable-rowheight-control`（短|中|高|超高 四档分段控件形态，短为 at-seg-item-active 选中样本，零生效）/`airtable-search-entry`/`airtable-filter-entry` 入口按钮形态（零浮层，接线归 P6b）；按钮 renderer 以 `variant: "ghost"` 承载（默认 primary 蓝与 Airtable 中性工具钮形态不符——实测修正）**
- [x] 网格主视图（按 Phase 1 底座裁定承载）：列头行（型别彩色 glyph 近似 + 字段名 + 列头菜单入口形态按钮 + 主字段标识）+ 记录行 ≥30 行经 mock 流动（行号列 + 裁剪清单型别分派静态样本：text 截断/long text 截断+展开按钮形态/select 彩色 chip/multi-select chips 换行/date 本地化串/number 右对齐/checkbox/attachment 缩略图形态/collaborator 头像+名 chip/email·url 蓝链接形态/barcode 串/rating 近似/只读自动字段灰显）+ 底部插行形态行 + 行 hover 铺底 + 选中单元格蓝框静态样本（纯 CSS `:hover`/静态选中列，G-F 口径沿 P5a）→ **已落位：20 列全部裁剪清单型别（行号列即自动编号只读样本 + 19 型别列）；33 行经 `Airtable__records?perPage=100` 一次流动、table 客户端分页 pageSize 10（首页 10 行 e2e 锁定）；列头 = glyph 彩方块 + 字段名 + chevron 菜单入口形态（title/category/amount 三列挂真实 openDialog 菜单，其余入口形态——21 列全量内联 dialog 与 schema 可维护性冲突，裁剪注记落字 Phase 3）；选中单元格蓝框 = 首行任务名称 `${id === 'AT-101' ? 'at-cell-selected' : ''}` 静态样本；行 hover 铺底 + `at-row-tools` hover 展开入口（纯 CSS）；底部插行形态 `airtable-grid-new-row`。实测修正（P5a container-body 教训现场再确认）：**container 行布局必须用 `direction/align/gap/wrap` props**——Tailwind flex 类落在外层 div、children 在内层 container-body（默认 flex-col）导致全页首渲染纵向堆叠；20 列自然宽经 `.at-grid { min-width: max-content }` + schema `overflow-x-auto` wrapper 承载横向滚动（renderer colgroup 列宽锁定 32px 行高不换行）**
- [x] summary bar 形态（组内计数 + 按字段型别聚合预计算值）+ 分组态样本（`group=` 参数化：组头 = 分组值 + 组内计数 + 折叠形态 + summary 行；折叠展开为零动作静态形态注记，生效归 P6b）→ **已落位：`airtable-summary`（计数/预算合计/平均完成度/已交付/平均评分，全为 mock `summarizeAirtable` 预计算，e2e 锁定 33 条）；`airtable-group-section` 经 `Airtable__records?group=category` 流动：4 组头（chevron 折叠形态 + 组值 chip + `N 条` 计数）+ 组内 summary 行（预算合计/已交付，`formatAirtableAmount` 预计算）+ 组内样本行 ≤3 行/组；`airtable-group-note` 零动作注记**
- [x] 行高四档静态样本（Short/Medium/Tall/Extra Tall 密度类各 ≥1 样本行或档位注记；切换生效的 schema 表达缺口注记归 G-E/G-F2 证据）→ **已落位：`airtable-density-section` 四样本行（`at-density-short/medium/tall/extra` = 32/48/80/160px，e2e getComputedStyle 实测 ±2px）+ `airtable-density-note` G-E/G-F2 缺口注记**
- [x] e2e：初屏结构用例 ≥1 条（网格列头/行字段来自 mock/型别样本列辨识/`getComputedStyle` 断言 `--at-*` 令牌与 Short 档行高/无 "Airtable" 商标字样）→ **用例 01+02 全绿：01 初屏（列头 20 testid/10 行 mock 数据/逐型别样本列断言/选中蓝框 box-shadow/hover 展开入口 reveal-opacity 轮询/summary 预计算值/`--at-blue`=#2d7ff9 + `--at-row-short`=32px + 13px 正文/行高 ≤34px/无品牌字样）；02 分组样本 + 密度四档 + 缺口注记**

Exit Criteria:

- [x] `#/complex-pages/airtable-grid` 可达且初屏结构 e2e 用例绿 → **e2e 01/02 全绿（`complex-page-title` 含「网格任务跟踪 · 电子表格网格」断言即注册+可达双证）**
- [x] 网格型别分派样本矩阵与列头结构在 schema 中可辨识；网格底座裁定对照落字（承载形态与保真度边界） → **20 列 colhead/cell testid 逐列可断言；底座裁定对照见「差异声明（P6a 裁定）」D2⑤（table 读端点流动 + 型别分派 + 客户端分页可承载；键盘双态/fill handle/范围选区不可承载——键盘缺口清单 Phase 3 落字）**

### Phase 3 - airtable-grid：浮层族（列头菜单/Hide fields/record modal）+ G-D 静态实测结论收口

Status: completed
Targets: `page-schemas/airtable-*.json`、`tests/e2e/airtable-replica-visual.spec.ts`、本计划、`docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`（仅事实勘误时）

- Item Types: `Fix | Proof | Decision`

- [x] 列头菜单 dialog 静态形态（D2①：Hide field/edit field/换型别/sort A-Z·Z-A/insert left-right/delete 条目 + 条目裁剪注记；无 popover 原语约束落字）→ **已落位（title/category/amount 三列头挂真实 openDialog，其余 17 列为 chevron 入口形态——21 列全量内联 dialog 与 schema 可维护性冲突的裁剪注记）：八条目（隐藏字段/编辑字段/换型别/排序 A→Z/排序 Z→A/向左插入/向右插入/删除字段（danger 色））+ `airtable-column-menu-type` 型别清单只读形态（当前型别 chip + G-D 列菜单缺口注记）+ `airtable-column-menu-note` 裁剪注记（无 popover 原语 dialog 承载、隐藏字段 🌐、其余 📊、动作生效归 P6b）；e2e 03 锁定**
- [x] Hide fields 面板 drawer 静态形态（D2②：逐字段 toggle + Find a field 搜索形态 + Hide all/Show all 形态 + 主字段不可隐藏注记）→ **已落位：side-right drawer `airtable-hide-fields-drawer`，form 内 `airtable-hide-fields-search` 查找字段输入形态 + 全部隐藏/全部显示按钮形态（ghost）+ `airtable-hide-fields-note` 零生效+主字段注记 + 20 字段行 loop（glyph/名称/型别来自 `gridData.fields` 端点载荷 + toggle 静态形态 + 首行 `airtable-field-lock`「主字段不可隐藏」来自 mock lockNote）；e2e 04 锁定**
- [x] record 展开 modal 静态形态（D2③：全字段表单分区 + 上一条/下一条导航形态按钮；数据经 record 端点；键盘导航缺口注记）——打开动作 = 行展开入口最小静态动作（沿 P5a peek 先例）→ **已落位：行号列 hover 展开入口（at-row-tools 纯 CSS）→ openDialog `airtable-record-modal`；form loadAction `Airtable__record?id=${id}`；四分区（基本信息/数值与进度/人员与联系/系统字段只读灰显）覆盖 20 字段行；`airtable-record-prev/next` 导航形态按钮（at-btn 容器形态，点击接线归 P6b——嵌套 openDialog 会堆叠浮层，实测 channel 存在但静态边界不接线）+ `airtable-record-kbd-note` ⌘⇧>/< G-B2 缺口注记；miss 兜底（占位样本）单测锁定；e2e 05 锁定**
- [x] e2e：三类浮层可打开断言 + 分组分支断言 + 全部浮层走查用例；网格主视图零回归 → **用例 03（列头菜单×2 列头 + 条目数 + 型别清单 + 注记 + Esc 关闭）/04（drawer + 20 字段行 + lock 注记 + toggle 计数）/05（record modal + 端点数据 + 四分区 + 只读灰显 getComputedStyle + 导航形态）/06（菜单→抽屉→modal 走查 + Esc 全闭 + 网格零回归 10 行 mock 数据）全绿**
- [x] G-D 静态实测结论清单落字（供 P6b 起点与 C2 回写携带）：网格底座承载度终判、双态近似边界（导航态网格/编辑态 modal 的近似差距）、型别矩阵覆盖度逐型别对照、键盘缺口静态证据清单（键位↔承载物↔缺口↔可模拟性初判，沿 P4a 先例）、列头菜单/分组/行高的 schema 表达边界——不接线、不裁决 → **落字本计划「G-D 静态实测结论（P6a 实测）」节**
- [x] AI 模板感自查（P1 README §4.2）+ 样式契约自查（§4.3）：浮层全部有真实打开行为、数据经 mock 端点流动、新 CSS 全在 `.at-*` scope、零 renderer 包改动、`git status` 变更面仅 In Scope → **自查通过，记录见 Phase 3 Exit Criteria 后「两维自查记录」**
- [x] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；`upload`→`input-file`/`input-image` 型别名勘误候选在此落字；无矛盾则不动）→ **逐行复核完成，一处事实勘误已落分析篇：§5 Attachment 行 `upload` 型别名全仓零命中（live grep 复核）→ 勘误为 form-advanced `input-file`(input-file-renderer.tsx:15)/`input-image`(input-image-renderer.tsx:42) 编辑器承载 + 自绘缩略块网格静态形态；rating 行按该行自身口径落实测结果（零 renderer 确认 + ★ 序列近似承载）；其余 20 行无矛盾（逐行对照结论见「G-D 静态实测结论」§5 对照行）**
- [x] `npx playwright test tests/e2e/airtable-replica-visual.spec.ts --reporter=list` 全绿；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）→ **e2e 6/6 全绿（21.2s）；typecheck 绿；playground test 32 文件 313 用例全绿**
- [x] 变更面核查：`git status --porcelain` 仅含 In Scope 文件 → **核查通过：`apps/playground/src/airtable-replica/airtable-replica.css`、`apps/playground/src/styles.css`、`apps/playground/src/complex-pages/shared/mock-backend-airtable{,-types,-records,-views}.ts`、`apps/playground/src/complex-pages/shared/showcase-env.ts`、`apps/playground/src/complex-pages/complex-pages-model.ts`、`apps/playground/src/complex-pages/__tests__/airtable-mock-backend.test.ts`、`apps/playground/src/complex-pages/page-schemas/airtable-grid.json`、`tests/e2e/airtable-replica-visual.spec.ts` + `tests/e2e/artifacts/airtable-replica/`（spec 截图视觉证据附件，antdpro/cal 先例同轨入库）+ 文档面（roadmap/本计划/分析篇勘误/dev log）；`packages/` 零改动、`mock-backend.ts`/`mock-backend-antdpro|cal|linear*|notion*.ts` 零触碰**

## G-D 静态实测结论（P6a 实测）

> 供 P6b 起点与 C2 回写携带。只记录静态实测证据，不接线、不裁决；裁决义务归 P6b（roadmap Cross-Cutting 5）。

### 1. 网格底座承载度终判（三候选裁定 ③ 混合）

- **①`input-table` 不可作 G-D 读网格底座（实测）**：`InputTableSchema extends BoundFieldSchemaBase`（composite-schemas.ts:95–130）——值域属 form field 体系，无 source/data-source 读通道；33 行 mock 只能经 form 值预载；行号列/客户端分页/summary bar/分组形态零承载。**可承载面**：单行编辑态（P6b 若做单元格直编辑可回看，但双态键盘仍缺）。
- **②`table` renderer 为导航态网格最优承载（实测全通）**：`source` 端点流动（33 行）+ `columns[].cell` 型别分派（20 列）+ 客户端分页（pageSize 10）+ 行 hover 纯 CSS + 列宽锁定（colgroup 实测宽度 + `min-width: max-content` 横向滚动）全成立。**crud 不采用**：工具栏/查询 chrome 与 Airtable 极简网格形态偏差大；`columnSettings:{enabled:true}` 可作列显隐但保真度低于 drawer 形态。
- **终判**：G-D 的"网格读端点流动 + 型别矩阵静态呈现"为**高承载**；"编辑态/选区/键盘/填充"为**零承载**（见 §4 键盘清单）；双态分离只能近似（§2）。

### 2. 双态近似边界（导航态网格 / 编辑态 modal）

- Airtable 双态 = 单击选中导航 + Enter/F2 进编辑，**同格双态**。复刻近似 = **空间分离双态**：导航态（table 只读网格）+ 编辑态（record modal 全字段 form）。近似差距：①无同格原位编辑（编辑器矩阵不在网格内）；②无选中单元格导航态（仅一个静态选中蓝框样本——表达式 className `${id === 'AT-101' ? 'at-cell-selected' : ''}` 实测可用，证明 **className 表达式绑定本身可承载**，G-F2 缺口在"交互态驱动"（选中集状态 + 键盘移动），非表达式机制）；③modal 与网格数据经同一 record id 联动（`Airtable__record?id=`），P6b 接线编辑提交时该 id 通道可直接复用。
- 浮层堆叠通道实测存在（dialog-host stackIndex），modal 内 prev/next 若 P6b 接线可走嵌套 openDialog（本级静态边界未接线）。

### 3. 型别矩阵覆盖度逐型别对照（裁剪清单 20 字段 / 19 型别族 vs 分析篇 §4.1 28 型）

| 分析篇 §4.1 型别        | 复刻字段              | 网格静态形态                       | record modal 形态              | 实测结论                                                          |
| ----------------------- | --------------------- | ---------------------------------- | ------------------------------ | ----------------------------------------------------------------- |
| Single line text        | title（主字段）       | 截断 + 选中蓝框样本                | 文本行                         | 高保真                                                            |
| Long text               | notes                 | 截断 + 展开图标形态                | 多行文本                       | 高保真（富文本工具栏/@mention 不复刻，§6.2）                      |
| Single select           | category              | 彩色 chip                          | chip                           | 高保真                                                            |
| Multiple select         | tags                  | chips 换行                         | chips                          | 高保真                                                            |
| Date & Time             | date                  | 本地化中文串                       | 串（日历 popover 未静态展开）  | 中高（日历编辑器归 P6b/D1）                                       |
| Number/Currency/Percent | score/amount/progress | 右对齐 + 千分位/¥/%（mock 预计算） | 同                             | 高保真（格式化 mock 预计算，schema 表达式格式化未用——P6b 可对比） |
| Checkbox                | done                  | 蓝底勾选态                         | （modal 内省略，网格样本已足） | 高保真                                                            |
| Attachment              | attachments           | 彩色缩略方块 + 溢出计数 chip       | 同                             | 近似（编辑器 `input-file`/`input-image` 见分析篇勘误行）          |
| Collaborator            | owner                 | 彩色圆底缩写 + 名字                | avatar + 名                    | 近似（选人原语缺口确认，§7 候选）                                 |
| Email/URL/Phone         | email/site/phone      | 蓝链接 / mono 串                   | 蓝链接 / 串                    | 高保真                                                            |
| Duration                | duration              | `h:mm:ss` mono                     | 同                             | 高保真                                                            |
| Rating                  | rating                | ★/☆ 字符序列（金色）               | 同                             | 近似（零 renderer 确认，分析篇 §5 已落）                          |
| Barcode                 | barcode               | 等宽 + 字距串                      | 同                             | 近似（BarcodeInput 编辑器未静态展开，scheduling 包在库可回看）    |
| Autonumber              | autoNo（行号列）      | 只读灰显 mono                      | 只读灰显                       | 高保真（Count 合并样本）                                          |
| Created/Modified        | createdAt/modifiedAt  | 只读灰显                           | 只读灰显                       | 高保真                                                            |
| Formula/Lookup/Rollup   | —（裁剪）             | 只读灰显注记承载不单列             | —                              | 裁剪声明一致（§6.2）                                              |
| Linked record / Button  | —（裁剪）             | —                                  | —                              | P6b 动作域（分析篇 §5 两行保留）                                  |

### 4. 键盘缺口静态证据清单（键位 ↔ 承载物 ↔ 缺口 ↔ 可模拟性初判，沿 P4a 先例）

| 键位（分析篇 §4.3）     | Airtable 行为        | 静态复刻承载物                                                                       | 缺口                            | 可模拟性初判                                      |
| ----------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------- | ------------------------------------------------- |
| 方向键 / Tab / ⌘+方向键 | 单元格移动/跳边缘    | 无                                                                                   | 全缺口（G-B2）                  | 需 L4 selectedCell 状态 + keydown 层（D1 产品化） |
| Enter / F2              | 进编辑（双态分离）   | 无                                                                                   | 全缺口（G-B2）                  | 同上 + 单元格编辑器挂载                           |
| Esc                     | 退出编辑/关浮层      | **已承载**（dialog/drawer Esc 关闭内建，e2e 全部锁定）                               | 仅浮层域                        | —                                                 |
| ⇧+方向键 / ⇧+点击       | 范围选区             | 无                                                                                   | 全缺口（G-B3）                  | 选区层 + 修饰键（D1）                             |
| ⌘+点击                  | 非相邻多选           | 无                                                                                   | 全缺口（G-B3）                  | 同上                                              |
| ⌘C/X/V                  | 单元格/范围复制粘贴  | 无                                                                                   | 全缺口（G-B3）                  | 剪贴板通道 + 选区层                               |
| Space / ⇧Space          | 展开记录/单元格      | Space 展开记录**可模拟**（行选中 + keydown→openDialog，P6b 先红后绿候选）；⇧Space 无 | 部分                            | P6b 可锁 Space                                    |
| ⇧Enter / ⌘⇧Enter        | 下插行/末尾插行      | 插行形态行静态（`airtable-grid-new-row`）                                            | 动作缺口                        | P6b 写端点 + 快捷键                               |
| ⌘F                      | 视图内查找           | 搜索入口形态静态                                                                     | 参数化搜索接线缺口              | P6b 沿 P5b I5 先例可模拟                          |
| ⌘Z / ⌘Y                 | 撤销/重做            | 无                                                                                   | 协同裁剪（分析篇 §6.2）         | D1                                                |
| ⌘;                      | 选中日期置今天       | 无                                                                                   | 全缺口（G-B2）                  | 动作通道（P6b）                                   |
| ⌘⇧>/<                   | record 上一条/下一条 | modal 导航形态按钮 + `prevId/nextId` 端点载荷**已在库**                              | 键盘绑定缺口（点击接线亦未做）  | P6b 双通道可模拟（按钮 + 键盘）                   |
| fill handle 拖拽        | 等差/重复填充        | 无                                                                                   | 全缺口（G-B3，分析篇 §7 候选②） | 拖拽原语 + 选区层（D1）                           |
| ⌥↑/↓、Alt+拖            | 移动/复制记录        | 无                                                                                   | 全缺口                          | P6b 拖拽域                                        |

### 5. 列头菜单 / 分组 / 行高 / summary 的 schema 表达边界

- **列头菜单**：dialog 承载成立（八条目 + Esc）；**全部条目零生效**——`columns` 为 schema 静态声明，动态变更列模型（隐藏/删列/换型别/插列）无通道（G-D 列菜单缺口确认，P5a notion 同源）；排序 A→Z/Z→A 若 P6b 接线可走 mock `sortRows` 先例参数化。
- **分组**：mock `group=category` 服务端预分组 + 组内计数 + summary 预计算 + 样本行成立；**分组切换/折叠生效无 schema 表达**（视图栏控件 → 数据源 URL 参数绑定无通道；P5b I11 先例为写端点 override，P6b 可沿）；折叠为零动作静态形态（chevron）。
- **行高四档**：密度类 CSS 成立（32/48/80/160 实测）；**档位切换生效无绑定**——视图栏分段控件零动作；className 表达式机制可用（选中单元格样本证实）但切换控件无状态通道（G-E 确认；G-F2 精确化为"交互态驱动缺口"）。
- **summary bar**：预计算静态值成立（计数/合计/均值 mock 侧）；table 无内建 per-column 聚合语义（§7 候选确认，C2 回写 P6b 携带）。
- **hide-fields**：字段注册表经端点载荷流动成立（`fields` 数组 → drawer loop）；显隐生效无通道（P6b 沿 P5b `updateViewConfig` override 先例候选）。

### 6. 分析篇 §5 逐行复核结论

22 行映射逐行复核：**一处事实勘误**（Attachment 行 `upload` → `input-file`/`input-image`，已落分析篇）+ **一处实测结果落字**（rating 行零 renderer 确认，已落分析篇）；其余 20 行实测与预估无矛盾——底座行预估"中"成立且边界更明确（读流动高承载/编辑态零承载）、分组行"缺口~中"成立（预计算静态可承载、切换生效缺口）、行高行"中高"成立、hover/选中"高"成立（含表达式 className 机制可用性证实）、record modal"高"成立。

Exit Criteria:

- [x] 三类浮层可达，浮层走查 e2e 绿 → **e2e 03/04/05/06 全绿（列头菜单×3 列头、Hide fields drawer、record modal、全走查 + 零回归）**
- [x] G-D 静态实测结论清单节落字（含承载度 ↔ 缺口对照与键盘证据清单） → **「G-D 静态实测结论（P6a 实测）」节：底座终判（§1）/双态近似边界（§2）/型别逐型对照表（§3）/键盘缺口证据清单 15 键位（§4）/schema 表达边界四项（§5）/分析篇 §5 逐行复核（§6）**
- [x] 两维自查记录落字（通过/打回处置结论） → **「两维自查记录（P6a 收口）」节，自查通过**
- [x] 目标 e2e 与包级检查全绿记录落字；变更面核查记录落字 → **e2e 6/6 + typecheck + playground test 32 文件 313 用例全绿（本文件 Phase 3 item 行）；变更面 git status 核查通过（In Scope + docs，`packages/` 零改动）**

## 两维自查记录（P6a 收口）

> P1 README §4.2（AI 模板感）+ §4.3（样式契约）逐项自查。结论：**通过**（零打回项）。

- **产品完成度**：复刻页无 demo 占位按钮——视图栏五控件中 Hide fields 为真实打开动作，行高/搜索/筛选为零生效入口形态且带归 P6b 注记（D2④ 裁定形态）；三类浮层全部有真实打开行为 + Esc 关闭（e2e 03–06 锁定）；数据全部经 mock 端点流动（网格 33 行 `Airtable__records`、分组 `group=` 参数化、modal `Airtable__record?id=`、drawer 字段注册表 `fields` 载荷——e2e 逐层断言 mock 值）；hover/空态成对（行 hover 铺底 + hover 展开入口 / empty 文案块在 schema）。
- **视觉原创性**：对照分析篇 §2 令牌抽查——密度（32px Short 行高实测、13px 网格正文）、圆角（chip 4px/按钮 4–6px/modal 8px）、语义色（9 色盘 chip/低饱和 pastel）、主蓝 `#2d7ff9`、行 hover `#f5f5f5` 与分析篇 §2 结构一致；零品牌资产（e2e 无 "Airtable" 字样断言 + 全自拟中文文案 + glyph 语义字符自绘 + 无 logo/插画/原文案）。
- **样式契约（§4.3）**：复刻 CSS 全部落 `apps/playground/src/airtable-replica/airtable-replica.css`（令牌 `.at-root,.at-dialog` 双作用域 + `.at-*` 类）；零 renderer 包改动（`git status` 证明）；主题独立性 light-only（CSS 头注 + D3 声明）；布局/间距走 container props + Tailwind 工具类双轨（P5a container-body 教训现场再确认并落字 Phase 2）。
- **处置结论**：两维全部通过，无打回项；`pnpm check` 归 Closure Gates 全量验证。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb05df864ffeBQsSWCYP7XeySM`
- Verdict: `pass`
- Rounds: 1
- Findings addressed: R1 `pass`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 styles.css 行数引用勘正（notion @import 实为 :23、`@source` 实为 :24；@import 先于 `@source` 的实质规则不受影响）；Minor-2 input-table renderer 注册引用收敛（`input-table-renderer.tsx:425` 为 renderer 定义注册，:262 附近为组件句柄声明的松散引用已移除）。审阅者并经 live 复核确认：composite-schemas.ts:104–130 InputTableSchema 契约、`input-file`:15/`input-image`:42、rating 零 renderer、render-host 7 包、airtable 零存在、oversized 脚本扫描口径、roadmap P5a done / P5b·P6a todo 均准确。

## Closure Gates

- [x] 全部（或 Phase 1 裁定终态数量）`airtable-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（含浮层走查） → **单页 `airtable-grid.json`（D1 终态）落盘注册可达；e2e 6/6 全绿（01/02 初屏 + 03–06 浮层走查）**
- [x] 差异声明已裁定并落字（📊 社区口径标注/主蓝定位/Inter 近似栈/28 型别裁剪清单/glyph 自绘/light-only 逐项）→ 「差异声明（P6a 裁定）」D3 + CSS 头注 → **D1/D2/D3 全部落字（含 D2①–⑨ 载体 + 型别裁剪清单终态 20 字段/19 型别族），CSS 头注两处一致**
- [x] `airtable-mock-backend.test.ts` 全绿；`Airtable__` 端点全部 get-only；`mock-backend.ts` 零触碰；既有 antdpro/cal/linear/notion 端点零回归 → **13 条单测全绿；get-only 契约用例锁定（post/put → status 1）；`mock-backend.ts` 零触碰（git status）；playground 全量 32 文件 313 用例绿（既有端点零回归）**
- [x] `showcase-env.ts` 总行数 ≤700（wc 实测记录于本计划） → **wc 实测 699 行、门禁切分口径 700 行——双口径均 ≤700（Phase 1 item 行记录，closure audit Minor-1 补齐门禁口径）**
- [x] G-D 静态实测结论清单落字（P6b 起点与 C2 回写可引用）→ 对应落字节 → **「G-D 静态实测结论（P6a 实测）」§1–§6（底座终判/双态边界/型别对照/键盘 15 键位清单/schema 表达边界五项/分析篇逐行复核）**
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs） → **git status 核查：`packages/` 零条目**
- [x] 无品牌资产复制（产出界面无 "Airtable" 名称与商标；logo/插画/原文案/28 型别 glyph 原图全部隔离）→ e2e 断言 + 数据集自拟中文 → **e2e 01 子树文本断言无 "Airtable"；全自拟中文文案；glyph 语义字符自绘；数据集（任务清单/发布跟踪表语义域）零品牌词**
- [x] AI 模板感治理与样式契约自查完成并落字 → **「两维自查记录（P6a 收口）」节，通过零打回**
- [x] roadmap Phase Status 区 P6a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap → **roadmap 现为 `planned`（本次执行同步更新执行完成记录）；`done` 翻转随 closure audit 收口**
- [x] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字 → **分析篇 §5 两处更新：Attachment 行事实勘误（`upload`→`input-file`/`input-image`）+ rating 行实测结果落字；逐行复核结论见 G-D §6**
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 → **closure audit 通过（fresh session 独立子 agent 两轮）：R1 `ses_fafb62ebdffeubGr72pTIkBsrh` verdict `issues`（1 Major：plan/dev log 行数记录为中间态未刷新（CSS 601、mock 122/174/216/46）——正是 Baseline 声明的打回类；3 Minor：showcase-env 门禁切分口径未记录（700 贴线）/artifacts 目录缺出变更面记录/plan:128-129 重复 Status 块）→ 执行 session 全部修复（wc 终值刷新 CSS 725、mock 123/191/243/48=605、双口径 showcase-env wc 699/门禁 700、重复块移除、artifacts 目录入变更面）→ R2 `ses_fafaea25effeFLo6S4feG0t0qs` scoped re-audit verdict **APPROVED** 零 finding（5/5 项 live 复核通过，零新发现）**
- [x] `pnpm typecheck` → **37/37 全绿**
- [x] `pnpm build` → **37/37 全绿**
- [x] `pnpm lint` → **37/37 全绿**
- [x] `pnpm test` → **68/68 任务全绿（playground 直接复跑 32 文件 313 用例确认）**
- [x] 目标 e2e：`npx playwright test tests/e2e/airtable-replica-visual.spec.ts` 全绿 → **6/6 全绿（21.2s）**

## Deferred But Adjudicated

### 交互接线全谱（单元格编辑提交/插行/record 保存/列头菜单动作生效/分组与行高切换生效——分析篇 §4.1–4.3 交互清单主体）

- Classification: `watch-only residual`（对 P6a 而言非缺口，为 Pi-b 既定范围）
- Why Not Blocking Closure: 两段式边界（P1 README §5）固定 Pi-a = 静态形态；交互接线与先红后绿契约锁定属 P6b 义务，roadmap 既有 work item
- Successor Required: `yes`
- Successor Path: P6b plan（本 roadmap 既有 work item，无需新建）

### 键盘双态模型/fill handle/范围选区/⌘ 多选/Space 展开记录（G-B2/G-B3 缺口全谱）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 键盘序列监听/修饰键范围选/等差填充拖拽均无动作通道与原语（分析篇 §5 缺口初判④ + P4b 实测口径同源），属 L4 runtime 能力候选而非本复刻页契约缺陷；键盘缺口静态证据清单落字（Phase 3）供 P6b 显式裁决
- Successor Required: `yes`
- Successor Path: P6b 显式裁决 + C2 回写登记，产品化归 D1 流程

### rating 原语 / collaborator 选人原语 / grid 分组聚合语义 / 范围选区+fill handle 编辑模型归属

- Classification: `optimization candidate`
- Why Not Blocking Closure: 分析篇 §5 缺口初判①②③⑥ 与 §7 两候选——P6a 以静态近似承载（rating badge 近似、collaborator 自绘头像、summary 预计算、分组样本），不影响静态复刻结果面成立；裁决与归属判断（并入 G-D 行或加行）归 P6b 回写
- Successor Required: `yes`
- Successor Path: P6b C2 回写一并处理（分析篇 §7 既有登记）

## Non-Blocking Follow-ups

- `Airtable__` mock 数据集若在 P6b 接线中发现状态样本不足（编辑中间态/插行/fill 序列样本），在 `mock-backend-airtable.ts` 内补样本属 P6b Fix 范围（P5a follow-up 惯例沿袭）
- 28 型别 glyph 全套自绘的深化（本计划仅裁剪清单内型别近似）：不入本计划
- `--at-*` 变量架构共享复刻基建抽取（P3a/P4a/P5a follow-up 沿袭）：不入本计划
