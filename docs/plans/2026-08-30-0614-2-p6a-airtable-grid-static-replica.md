# P6a Airtable grid 网格编辑复刻 — 分析与静态复刻

> Plan Status: active
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

> Phase 1 Decision 落字节；CSS 侧同步声明于 `airtable-replica.css` 文件头注（两处一致）。

- **D1 页面粒度**：默认提案**单页 `airtable-grid`**（视图栏 + 网格主视图 + 列头菜单 + Hide fields 面板 + record modal + 分组态样本全部页内承载——G-D 压测对象是"同页双态网格与浮层族"，跨页 navigate 会稀释压测，沿 P5a D1 型制）；实测单页过载则裁定拆分（候选：`airtable-grid` + `airtable-record`）并落字理由（一页一文件终态清单必出）。
- **D2 浮层与替代承载**：①列头菜单 = dialog（分析篇 §4.2 条目静态形态：Hide field（🌐 官方证实）+ edit field/换型别/sort/insert left-right/delete（📊 标准项）——条目裁剪注记落字）；②Hide fields 面板 = drawer（逐字段 toggle 形态 + Find a field 搜索形态 + 主字段不可隐藏注记（🌐））；③record 展开 modal = dialog（全字段表单静态形态 + 上一条/下一条导航形态 + 字段分区；⌘⇧>/< 键盘导航缺口注记）；④分组/行高/筛选控件 = 视图栏静态控件形态（分组态经 mock `group=` 参数化承载样本）；⑤网格底座按 Phase 1 三候选裁定落字；⑥collaborator 头像 = container + 缩写 + `.at-avatar` 彩色圆底（P3a/P4a/P5a 自绘先例）；⑦28 型别 glyph = 按型别语义自绘的彩色小方块/字符近似（不复制原图）；⑧rating = badge/文本近似承载（零 renderer 实测）。
- **D3 令牌差异**：§2 全部色值/px 为 📊 社区口径——落 CSS 前标注"逆向近似"，主蓝 `#2d7ff9` 类定位为风格参考并声明与 flux 主令牌的关系（替换为自有主色 or 保留，Phase 1 裁定落字）；专有字体（Colfax 类）→ `Inter, -apple-system, "Segoe UI", sans-serif` 近似栈；网格正文 13px、表头 12–13px、summary bar 12px；行高四档 ≈32/48/80/160px（📊 口径标注）；chip 圆角 3–4px、按钮 4–6px、record modal 8px；light-only（无暗色映射）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`airtable-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--at-*` 令牌在 `.at-root` 子树可解析 / 行高 Short 档 ≈32px 实测 / 型别分派样本列可辨识 / 无 "Airtable" 商标字样断言；截图仅作视觉证据附件）。单元格编辑提交/键盘双态/fill handle 等交互契约的先红后绿锁定归 P6b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（底座裁定/CSS/mock/注册是后续每页的依赖）；Phase 2 网格主视图；Phase 3 浮层族 + G-D 静态实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与网格底座裁定 + 复刻 CSS + mock 读端点 + 注册

Status: planned
Targets: `apps/playground/src/airtable-replica/airtable-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-airtable.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/airtable-mock-backend.test.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision——页面粒度裁定：分析篇 §3 七页面（Grid ★★★★★ / record modal ★★★★ / 批量选区+填充 ★★★★ / Group 分组态 ★★★★ / 列头菜单 ★★★ / 行高切换 ★★ / Hide fields ★★）映射为 schema 集的默认切分——默认提案单页 `airtable-grid`（D1），过载则拆分并落字理由（终态清单必出）
- [ ] Decision——网格底座裁定（G-D 压测核心）：三候选 ①`input-table`（form 值域，form 预载数据路径需实测）②`table`/`crud` 只读网格 + record modal form 编辑（双态近似）③混合——按 Phase 内 live 实测（含 form 预载可行性试做）裁定并落字理由、保真度边界与 G-D 证据；`crud columnSettings: {enabled: true}`（P2b 回写 ③ 实测在库）适用性一并评估
- [ ] Decision——浮层与替代承载裁定：列头菜单/Hide fields/record modal/分组与行高控件载体（D2 ①–④）+ 型别裁剪清单终态（28 → 裁剪清单落字：Formula/Lookup/Rollup/长尾与付费能力裁剪；rating/attachment/collaborator/barcode 承载裁定）——各项裁定结论与理由落字
- [ ] Decision——令牌差异裁定：按分析篇 §2 提取 `--at-*` 变量架构；📊 社区口径逐项标注、主蓝定位裁定、Inter 近似栈、行高四档 px、light-only——结果写入本计划「差异声明（P6a 裁定）」节 + CSS 文件头注
- [ ] Fix——`airtable-replica.css`：令牌块声明于 `.at-root, .at-dialog` 双作用域，变量名 `--at-*`、类名 `.at-*`；13px 网格密度、行高四档密度类、行 hover、选中单元格蓝框静态态、chip pill 模式、collaborator 头像盘、型别 glyph 近似等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类与 container props（双轨规则，P5a container-body 教训注记）
- [ ] Fix——`styles.css` 在头部 @import 簇内追加 `@import './airtable-replica/airtable-replica.css';`（仅此一行，置于 `@source` 指令之前）
- [ ] Fix——`mock-backend-airtable.ts`：类型 + 工厂 + 过滤/分组/分页助手；数据结构真实（records ≥30 行满足默认页大小 10 至少 3 页，裁剪清单内型别全覆盖：Single line text/Long text/Single select/Multiple select/Date/Number/Currency/Percent/Checkbox/Attachment/Collaborator/Email/URL/Phone/Duration/Rating 近似/Barcode/Autonumber 只读/Created·Modified 只读样本、彩色 chip 盘、头像样本；`group=` 参数化分组形态 + 组内计数 + summary bar 预计算；record 明细端点沿 `Notion__record?id=` 先例）；沿既有 fetcher 分支工厂模式导出分支，全部 get-only；行数以 wc + 门禁切分双口径记录
- [ ] Fix——`showcase-env.ts` 追加 `Airtable__` 分支委托（`replicaBranches` 数组条目 + handler 下沉）；总行数 ≤700 且 antdpro/cal/linear/notion 全部既有端点零回归（既有单测证明）；`mock-backend.ts` 零触碰
- [ ] Fix——`COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名、features 4 个机制词标签——P1 README 硬规则 6 + P4a 惯例）
- [ ] Proof——`airtable-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、型别覆盖、group 参数化、summary 预计算、空过滤路径、未知 view/group 兜底）

Exit Criteria:

- [ ] 页面粒度、网格底座、浮层与型别裁剪、令牌差异四类 Decision 全部落字
- [ ] `Airtable__` 端点经 fetcher 分支可命中且全部 get-only；showcase-env 总行数 ≤700，既有四 slug 端点零回归（既有单测全绿证明）
- [ ] CSS/mock/注册/test 四类文件落盘；`pnpm --filter @nop-chaos/flux-playground test -- airtable-mock-backend` 全绿
- [ ] showcase 页面列表可见全部 `airtable-*` 条目（注册生效）

### Phase 2 - airtable-grid：网格主视图（导航态网格 + 型别分派样本 + 列头 + 行高档）

Status: planned
Targets: `page-schemas/airtable-*.json`、`tests/e2e/airtable-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 视图栏形态：视图 switcher（grid 即选态样本）+ Hide fields 入口形态 + 行高档位控件形态 + 搜索/筛选入口形态（`airtable-*` testid 逐节点落位，P1 README 硬规则 3）
- [ ] 网格主视图（按 Phase 1 底座裁定承载）：列头行（型别彩色 glyph 近似 + 字段名 + 列头菜单入口形态按钮 + 主字段标识）+ 记录行 ≥30 行经 mock 流动（行号列 + 裁剪清单型别分派静态样本：text 截断/long text 截断+展开按钮形态/select 彩色 chip/multi-select chips 换行/date 本地化串/number 右对齐/checkbox/attachment 缩略图形态/collaborator 头像+名 chip/email·url 蓝链接形态/barcode 串/rating 近似/只读自动字段灰显）+ 底部插行形态行 + 行 hover 铺底 + 选中单元格蓝框静态样本（纯 CSS `:hover`/静态选中列，G-F 口径沿 P5a）
- [ ] summary bar 形态（组内计数 + 按字段型别聚合预计算值）+ 分组态样本（`group=` 参数化：组头 = 分组值 + 组内计数 + 折叠形态 + summary 行；折叠展开为零动作静态形态注记，生效归 P6b）
- [ ] 行高四档静态样本（Short/Medium/Tall/Extra Tall 密度类各 ≥1 样本行或档位注记；切换生效的 schema 表达缺口注记归 G-E/G-F2 证据）
- [ ] e2e：初屏结构用例 ≥1 条（网格列头/行字段来自 mock/型别样本列辨识/`getComputedStyle` 断言 `--at-*` 令牌与 Short 档行高/无 "Airtable" 商标字样）

Exit Criteria:

- [ ] `#/complex-pages/airtable-grid` 可达且初屏结构 e2e 用例绿
- [ ] 网格型别分派样本矩阵与列头结构在 schema 中可辨识；网格底座裁定对照落字（承载形态与保真度边界）

### Phase 3 - airtable-grid：浮层族（列头菜单/Hide fields/record modal）+ G-D 静态实测结论收口

Status: planned
Targets: `page-schemas/airtable-*.json`、`tests/e2e/airtable-replica-visual.spec.ts`、本计划、`docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`（仅事实勘误时）

- Item Types: `Fix | Proof | Decision`

- [ ] 列头菜单 dialog 静态形态（D2①：Hide field/edit field/换型别/sort A-Z·Z-A/insert left-right/delete 条目 + 条目裁剪注记；无 popover 原语约束落字）
- [ ] Hide fields 面板 drawer 静态形态（D2②：逐字段 toggle + Find a field 搜索形态 + Hide all/Show all 形态 + 主字段不可隐藏注记）
- [ ] record 展开 modal 静态形态（D2③：全字段表单分区 + 上一条/下一条导航形态按钮；数据经 record 端点；键盘导航缺口注记）——打开动作 = 行展开入口最小静态动作（沿 P5a peek 先例）
- [ ] e2e：三类浮层可打开断言 + 分组分支断言 + 全部浮层走查用例；网格主视图零回归
- [ ] G-D 静态实测结论清单落字（供 P6b 起点与 C2 回写携带）：网格底座承载度终判、双态近似边界（导航态网格/编辑态 modal 的近似差距）、型别矩阵覆盖度逐型别对照、键盘缺口静态证据清单（键位↔承载物↔缺口↔可模拟性初判，沿 P4a 先例）、列头菜单/分组/行高的 schema 表达边界——不接线、不裁决
- [ ] AI 模板感自查（P1 README §4.2）+ 样式契约自查（§4.3）：浮层全部有真实打开行为、数据经 mock 端点流动、新 CSS 全在 `.at-*` scope、零 renderer 包改动、`git status` 变更面仅 In Scope
- [ ] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；`upload`→`input-file`/`input-image` 型别名勘误候选在此落字；无矛盾则不动）
- [ ] `npx playwright test tests/e2e/airtable-replica-visual.spec.ts --reporter=list` 全绿；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）
- [ ] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

Exit Criteria:

- [ ] 三类浮层可达，浮层走查 e2e 绿
- [ ] G-D 静态实测结论清单节落字（含承载度 ↔ 缺口对照与键盘证据清单）
- [ ] 两维自查记录落字（通过/打回处置结论）
- [ ] 目标 e2e 与包级检查全绿记录落字；变更面核查记录落字

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb05df864ffeBQsSWCYP7XeySM`
- Verdict: `pass`
- Rounds: 1
- Findings addressed: R1 `pass`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 styles.css 行数引用勘正（notion @import 实为 :23、`@source` 实为 :24；@import 先于 `@source` 的实质规则不受影响）；Minor-2 input-table renderer 注册引用收敛（`input-table-renderer.tsx:425` 为 renderer 定义注册，:262 附近为组件句柄声明的松散引用已移除）。审阅者并经 live 复核确认：composite-schemas.ts:104–130 InputTableSchema 契约、`input-file`:15/`input-image`:42、rating 零 renderer、render-host 7 包、airtable 零存在、oversized 脚本扫描口径、roadmap P5a done / P5b·P6a todo 均准确。

## Closure Gates

- [ ] 全部（或 Phase 1 裁定终态数量）`airtable-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（含浮层走查）
- [ ] 差异声明已裁定并落字（📊 社区口径标注/主蓝定位/Inter 近似栈/28 型别裁剪清单/glyph 自绘/light-only 逐项）→ 「差异声明（P6a 裁定）」D3 + CSS 头注
- [ ] `airtable-mock-backend.test.ts` 全绿；`Airtable__` 端点全部 get-only；`mock-backend.ts` 零触碰；既有 antdpro/cal/linear/notion 端点零回归
- [ ] `showcase-env.ts` 总行数 ≤700（wc 实测记录于本计划）
- [ ] G-D 静态实测结论清单落字（P6b 起点与 C2 回写可引用）→ 对应落字节
- [ ] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [ ] 无品牌资产复制（产出界面无 "Airtable" 名称与商标；logo/插画/原文案/28 型别 glyph 原图全部隔离）→ e2e 断言 + 数据集自拟中文
- [ ] AI 模板感治理与样式契约自查完成并落字
- [ ] roadmap Phase Status 区 P6a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [ ] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 目标 e2e：`npx playwright test tests/e2e/airtable-replica-visual.spec.ts` 全绿

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
