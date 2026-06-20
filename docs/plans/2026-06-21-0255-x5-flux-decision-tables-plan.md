# X5 design.md Flux 决策表补齐（P0/P1 组件）

> Plan Status: completed
> Package: components-improvement
> Work Item: X5
> Last Reviewed: 2026-06-21
> Source: `docs/components/existing-components-improvement-roadmap.md`（X5，P0/P1 硬前置）、`docs/components/existing-components-improvement-analysis.md` §1.1（P0/P1 清单）/§5、`docs/components/input-number/design.md`（格式范例）
> Related: `docs/plans/2026-06-21-0254-x3-naming-conventions-baseline-plan.md`（X3，本计划硬前置，已 `done`）

## Purpose

为 **14 个 P0/P1 组件**的 design.md 统一补齐/标准化"Flux 决策表"（Flux 决策主语，列：能力/采纳/不采纳/理由），作为 E1a–E1d、E2a–E2h 所有实现工作项的**硬前置**。roadmap 明确："实现前先更新对应 design.md 的 Flux 决策表（X5），实现后保持一致"——本计划把这条纪律收口。

## Current Baseline

- **14 个 P0/P1 组件清单**（analysis §1.1）：
  - P0（3）：`select`、`table`、`crud`
  - P1（11）：`input-tree`、`tree-select`、`form`、`dialog`、`drawer`、`button`、`input-text`、`input-email`、`input-password`、`textarea`、`checkbox-group`
- **已有 Flux 决策主语决策表的（3/14）**：`crud`（E0c 加）、`input-tree`（E0b 加）、`tree-select`（E0b 加）——但这些是漂移修复时针对**漂移字段**补的窄表，未必覆盖组件全能力面，需复核能否作为完整 Flux 决策表。
- **仍是旧 AMIS 主语格式的（11/14）**：`select`/`table`/`form`/`dialog`/`drawer`/`button`/`input-text`/`input-email`/`input-password`/`textarea`/`checkbox-group` 当前用 `## 2. 与 AMIS 或既有产品的能力对照`（列：AMIS 功能/价值评估/首版决定/理由，主语是 AMIS），需翻转为 Flux 决策主语。
- **格式范例**：roadmap X5 条目指定参考 `input-number/design.md:13-31` 的"AMIS 功能评估与首版决定"表，但**改为 Flux 决策主语**（列：能力/采纳/不采纳/理由）。注意 `input-number` 本身是 P2，不在 14 之列，仅作格式范本。
- **X3（命名基线）尚未成文**（见 Related plan）：Flux 决策表的"采纳"列命名必须对齐 X3 基线，故 X5 硬依赖 X3。
- E0a–E0d 计划的 `Non-Blocking Follow-ups` 全部路由到 E1d/E2d/E3，无任何孤立 deferred 项落入 X5 范围。

## Goals

- 14 个 P0/P1 组件 design.md **每一个**都有一节 Flux 决策主语的决策表，覆盖该组件**全能力面**（不仅漂移字段）。
- 决策表格式在 14 个组件间一致（列、行粒度、"能力"覆盖范围统一）。
- 每个"不采纳"项都在**对应组件 design.md** 内记录理由（不只留在 analysis §5），避免后续重复评估。
- 决策表的"采纳"列命名与 X3 命名基线一致。

## Non-Goals

- **不**实现任何 E1/E2 功能代码（决策表是契约，实现是后续工作项）。
- **不**覆盖 P2/P3 组件（`input-number`/`condition-builder`/`code-editor`/`chart`/`flex`/`page`/`tabs` 等）——它们的决策表随 E3 按需启动。
- **不**重写组件的完整 design.md，只增/标准化"Flux 决策表"这一节。
- **不**裁决 Q2（crud cards/list 归属）/Q5（跨 roadmap 重叠）——这些是 E1d/E2f 的 Decision，不在 X5。

## Scope

### In Scope

- 上述 14 个组件 design.md 的 Flux 决策表节。
- 跨组件格式一致性规范（在 Phase 1 产出）。
- amis 不采纳项向各组件 design.md 的回填。

### Out Of Scope

- P2/P3 组件决策表（E3 批）。
- 任何 `packages/*/src/` 代码改动。
- 组件 design.md 非"决策表"章节的重写。

## Failure Paths

不适用：纯文档计划，无运行时行为、无 API 契约、无鉴权/外部集成。

## Test Strategy

档位选择：不适用。

理由：本计划仅修改 `docs/components/*/design.md`，无任何代码或行为变更。验证手段为格式一致性核对、命名对齐核对（依赖 X3）、与 analysis/`amis-baseline-matrix.md` 的一致性核对（见各 Phase Exit Criteria 与 Closure Gates）。依据 plan-authoring-guide 纯文档计划规则，Closure Gates 中的 `pnpm typecheck`/`build`/`lint`/`test` 已删除。

## Execution Plan

### Phase 1 - 审计与格式规范裁定

Status: completed
Targets: 本 plan（规范节）、14 个组件 design.md（审计标注）

- Item Types: `Decision`、`Proof`

- [x] 逐个审计 14 个组件 design.md，分类为：`已合规`（crud/input-tree/tree-select 复核）/`需标准化`（旧 AMIS 主语表翻转）/`需新增`（无决策表）。
- [x] 产出**Flux 决策表规范**（写入本 plan 作为 Phase 2-3 蓝图）：固定列 `能力 | 采纳 | 不采纳 | 理由`；"能力"行覆盖组件全能力面（参考 analysis §1.2 与各组件 design.md 现有"能力对照"节的能力清单）；"采纳"列命名对齐 X3 基线；每个"不采纳"必须附 Flux 理由。
- [x] 裁定"已合规"的 3 个（crud/input-tree/tree-select）是否需扩面：E0b/E0c 补的是漂移字段的窄表，需确认是否已覆盖全能力面；不足则在 Phase 2/3 扩面。

#### Phase 1 输出 A — 14 个组件审计分类清单（live repo 核对日期 2026-06-21）

> 审计发现：14 个组件 design.md 当前**都已有** `### Flux 决策表` 节（不是"无决策表"），但**全部**仍是 **3 列窄表** `能力 | 决定 | 理由`（"决定"列把"实现/计划实现/暂不实现/不采纳"混在一列）。需统一翻转为 4 列 `能力 | 采纳 | 不采纳 | 理由`。

| #   | 组件             | 严重度 | 当前决策表状态                                    | Phase 2/3 处理                                                                                                                                            | 全能力面覆盖现状                                                                                                             |
| --- | ---------------- | ------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | `select`         | P0     | 3 列窄表，§2 已存在                               | Phase 2 翻转 4 列                                                                                                                                         | 已覆盖（searchable/multiple/clearable/virtual/group/option 模板/远程搜索 + amis 不采纳）                                     |
| 2   | `table`          | P0     | 3 列窄表，§2 已存在                               | Phase 2 翻转 4 列                                                                                                                                         | 已覆盖（E1b/E1c 全部能力 + export 不采纳 + amis 皮肤不采纳）                                                                 |
| 3   | `crud`           | P0     | 3 列窄表，§2 已存在（E0c 扩面）                   | Phase 2 翻转 4 列；**无需扩面**（已覆盖 source/queryForm/toolbar/listActions/$crud/clientMode/quickSave/events/selection/pagination + E1d 计划 + 不采纳） | 完整                                                                                                                         |
| 4   | `input-tree`     | P1     | 3 列窄表，§2 已存在（E0b 扩面）                   | Phase 3 翻转 4 列；**无需扩面**（已覆盖 treeMode/options/searchable/cascade/showIcon 删 + E2d 计划 + 节点 CRUD/路径 + amis api 不采纳）                   | 完整                                                                                                                         |
| 5   | `tree-select`    | P1     | 3 列窄表，§2 已存在（E0b 扩面）                   | Phase 3 翻转 4 列；**无需扩面**                                                                                                                           | 完整                                                                                                                         |
| 6   | `form`           | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（body/actions/data/mode/statusPath/hiddenFieldPolicy/events/handles + E2g 计划 + amis api/wizard/persistData 不采纳） |
| 7   | `dialog`         | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（regions/data/open/events/surface + E2f 计划 + amis 不采纳）                                                          |
| 8   | `drawer`         | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（regions/side/data/open/events/surface + E2f 计划含 closeOnOutside 修不对称 + amis 不采纳）                           |
| 9   | `button`         | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（label/variant/size/disabled/onClick + E2e 计划 + amis level/actionType/hotKey/countDown/isMenuItem 不采纳）          |
| 10  | `input-text`     | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（基线 + minLength/maxLength/pattern 双重生效 + E2a 计划 + amis 不采纳）                                               |
| 11  | `input-email`    | P1     | **无独立表**（§2 文字 deferral 到 input-text §2） | Phase 3 新增小 4 列表（email 特化面：默认 email validator；沿用 input-text 能力面引用）                                                                   | 仅 email 特化差异                                                                                                            |
| 12  | `input-password` | P1     | **无独立表**（§2 文字 deferral 到 input-text §2） | Phase 3 新增小 4 列表（password 特化面：revealPassword E2a-bis；沿用 input-text 能力面引用）                                                              | 仅 password 特化差异                                                                                                         |
| 13  | `textarea`       | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（rows + E2b 计划 minRows/maxRows/showCounter/clearable + amis 不采纳）                                                |
| 14  | `checkbox-group` | P1     | 3 列窄表，§2 已存在                               | Phase 3 翻转 4 列                                                                                                                                         | 已覆盖（options/source/disabled + E2c 计划 checkAll/半选/max-min/per-option disabled + amis 不采纳）                         |

**分类小结：**

- `需标准化（3 列 → 4 列翻转）`：12 个（select/table/crud/input-tree/tree-select/form/dialog/drawer/button/input-text/textarea/checkbox-group）
- `需新增（无独立决策表）`：2 个（input-email/input-password — 当前 deferral 到 input-text，需补独立小表覆盖各自特化面）
- `需扩面`：0 个（crud/input-tree/tree-select 经 E0b/E0c 扩面后**已覆盖全能力面**，无遗漏；仅格式需翻转）
- `完全合规`：0 个（无组件已达 4 列格式）

#### Phase 1 输出 B — Flux 决策表规范（Phase 2-3 蓝图）

**列定义（固定 4 列，所有 14 个组件一致）：**

| 列  | 名称       | 内容约束                                                                                                                                                                                                        | 示例                                                                                               |
| --- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | **能力**   | Flux 决策主语的一**个**能力面（不是 amis 字段名）；粒度 = 一个 E1/E2 工作项的最小可决策单元                                                                                                                     | "搜索过滤"、"列宽 resize"、"cascade 级联半选"、"revealPassword 显示切换"                           |
| 2   | **采纳**   | Flux **采纳**的命名/契约/实现路径；命名必须对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。已落地 = "**实现**"；计划 = "**计划实现（E1a/E2g/…）**"；纯采纳无否定 = 该列填采纳侧 + 不采纳列填 "—" | "`searchable` + `filterOption`（shadcn Combobox 命名，E1a）"                                       |
| 3   | **不采纳** | Flux **拒绝**的 amis 命名/坏设计/超范围项；每条必须能在 X3 §3 amis 不采纳清单或 analysis §5 找到对应类别；纯不采纳无采纳 = 该列填不采纳侧 + 采纳列填 "—"                                                        | "amis `autoComplete`/组件级 `api`（请求下沉 data-source）"                                         |
| 4   | **理由**   | Flux 裁定理由（不是 amis 价值评估）；必须同时解释采纳与不采纳（若两列均有内容）；引用 X3 §1 原则或 analysis §0.2/§5                                                                                             | "头号缺口；命名对齐 shadcn/ui Combobox；请求下沉 data-source + action（见 naming-conventions §1）" |

**行粒度规则：**

- 每个 E1a–E1d / E2a–E2h 工作项的能力面**至少一行**（实现工作项 plan 可直接引用决策表行作为契约依据）。
- amis 不采纳清单（X3 §3 / analysis §5）中**该组件相关**的每条不采纳**至少一行**（或在同行的"不采纳"列侧列出）。
- "能力"列以 Flux 视角命名（如"搜索过滤"而非"AMIS searchable"）；保留 amis 字段名只在"不采纳"列作为被拒绝项引用。
- 同一能力面**不拆**多行（避免重复）；同一 amis 不采纳项**不重复**出现在多个能力行（归到最相关那一行）。

**特殊符号：**

- `—`（em dash）：当该列无内容时使用（例如纯采纳无否定、纯不采纳无采纳）。不允许出现空白单元格。
- `（E1a）` / `（E2g）` 等：标注计划实现的工作项编号，便于 E1/E2 plan 直接引用。

**能力覆盖范围（强制最小集）：**

- P0/P1 组件必须覆盖：analysis §1.2 / §3 对应行**全部**已列能力 + analysis §5 / X3 §3 中**该组件相关**的**全部**不采纳项。
- 不允许遗漏主要能力（如 select 不能漏"多选"或"虚拟滚动"）；不允许遗漏主要不采纳（如 button 不能漏 `level` 或 `actionType`）。
- E0a–E0d 已修复的漂移字段必须以最终状态（实现/删字段/进 types.ts）入表，不保留"计划实现（E0x）"过渡措辞。

**命名对齐 X3 规则：**

- "采纳"列字段名严格对齐 X3 §2 映射表（`variant`/`size`/`options {label,value}`/`clearable`/`searchable`/`disabled`/`readOnly`/`prefix`/`suffix`/`placeholder`/`when`/`on*` 事件/region 名）。
- "不采纳"列引用的 amis 字段名严格对齐 X3 §3 amis 不采纳清单（`level`/`joinValues`/`borderMode`/`actionType`/`api`/`initFetch`/`mobileUI`/`dataProvider`/路由持久化 等）。
- 布尔字段必须肯定式（`clearable` 非 `notUnclearable`）；枚举必须受控词表（`variant` 6 值、`size` 已定义值）。

**input-email / input-password 特化组件规则：**

- 沿用 `input-text/design.md` §2 Flux 决策表的能力面（prefix/suffix/clearable/trimContents/showCounter/native maxLength/minLength-maxLength-pattern 双重生效等共享面）。
- 独立小表只列**该 type 特化**的差异行（email：默认 email validator；password：revealPassword E2a-bis + 不采纳 strength/auto-generate）。
- 表头注明"共享面见 `input-text/design.md` §2 Flux 决策表"，避免重复。

#### Phase 1 输出 C — "已合规"3 个组件扩面裁定

经 Phase 1 审计，crud/input-tree/tree-select 的决策表虽由 E0b/E0c 在漂移修复时补，但**已覆盖全能力面**（不止漂移字段）：

- **crud**：现有表已覆盖 source/queryForm/toolbar/footerToolbar/listActions/$crud 摘要/clientMode/quickSave/autoClearSelectionOnRefresh/events/selection 全字段 + E0c 4 漂移字段最终状态 + E1d 计划能力（轮询/折叠查询/无限滚动/cards-list）+ 不采纳（syncLocation/api/export/filter as dialog）。**Phase 2 仅翻转 4 列，不扩面。**
- **input-tree**：现有表已覆盖 treeMode 三模式/options source/childrenKey-labelField-valueField/本地 searchable/showPathLabel/onlyLeaf/全键盘/cascade 父子传播+indeterminate/showIcon-showOutline 删字段 + E2d 计划（异步懒加载/远程搜索/虚拟滚动）+ 暂不实现（节点 CRUD/nodeBehavior/enableNodePath）+ 不采纳（amis api/mobileUI）。**Phase 3 仅翻转 4 列，不扩面。**
- **tree-select**：现有表已覆盖 popover 触发/treeMode/onlyLeaf/showPathLabel/childrenKey-labelField-valueField/clearable-placeholder/searchable/cascade/showIcon 删字段 + E2d 计划 + 暂不实现 + 不采纳。**Phase 3 仅翻转 4 列，不扩面。**

Exit Criteria:

- [x] 14 个组件的分类清单（合规/标准化/新增）写入本 plan。
- [x] Flux 决策表规范（列定义 + 行粒度 + 能力覆盖范围）写入本 plan，作为后续 Phase 蓝图。
- [x] owner-doc 更新：Phase 1 仅裁定；**No owner-doc update required**（裁定结果驱动 Phase 2-3）。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - P0 组件决策表（select / table / crud）

Status: completed
Targets: `docs/components/select/design.md`、`docs/components/table/design.md`、`docs/components/crud/design.md`

- Item Types: `Fix`、`Decision`

- [x] `select/design.md`：新增 Flux 决策表，覆盖搜索过滤/多选/clearable/虚拟滚动/分组；"采纳"列用 shadcn Combobox 命名；显式记录不采纳 amis `selectMode`/`joinValues`/`extractValue` 的理由（引用 analysis §1.2 与 X3 基线）。
- [x] `table/design.md`：新增 Flux 决策表，覆盖列宽 resize/sticky header/聚合行/单元格合并/多列排序/多级表头/树表/行拖拽/copyable 单元格；逐项标采纳/不采纳+理由。
- [x] `crud/design.md`：复核 E0c 已补的决策表，扩面至全能力面（轮询刷新走 data-source/可折叠查询区/无限滚动/cards-list 模式/cross-page 选择保留）；cards/list 模式标注"依赖主 roadmap W1c/W2a"（Q2 倾向后者）。

Exit Criteria:

- [x] 3 个 P0 组件 design.md 各有一节 Flux 决策主语决策表，列固定为 `能力 | 采纳 | 不采纳 | 理由`。
- [x] 每个决策表"能力"行覆盖该组件全能力面（与 analysis §1.2 对齐，无遗漏主要能力）。
- [x] owner-doc 更新：3 个 P0 design.md 即 owner-doc 本身，已更新。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - P1 组件决策表（11 个）

Status: completed
Targets: `input-tree`、`tree-select`、`form`、`dialog`、`drawer`、`button`、`input-text`、`input-email`、`input-password`、`textarea`、`checkbox-group` 的 `design.md`

- Item Types: `Fix`、`Decision`

- [x] `input-tree`/`tree-select`：复核 E0b 已补的 cascade 决策表，扩面至异步懒加载/远程搜索/虚拟滚动（E2d 能力面）。
- [x] `form/design.md`：新增 Flux 决策表，覆盖 columnCount/inline/submitOnChange/preventEnterSubmit/autoFocus/scrollToFirstError/static 预览/rules 组合校验。
- [x] `dialog`/`drawer/design.md`：新增 Flux 决策表，覆盖 closeOnEsc/size/width-height/header-footer region；修 drawer `closeOnOutside` 不对称（E2f 能力面）。
- [x] `button/design.md`：新增 Flux 决策表，覆盖 icon/loading/tooltip/block/active（shadcn Button 命名）；不采纳 amis `level`/`hotKey`/`countDown`/`isMenuItem`/`actionType` 并附理由。
- [x] `input-text`/`input-email`/`input-password`/`textarea`/`checkbox-group/design.md`：新增 Flux 决策表，覆盖各自 E2 能力面（prefix/suffix/clearable/trimContents/showCounter；textarea minRows/maxRows；checkbox-group checkAll/半选/max-min/per-option disabled）。

Exit Criteria:

- [x] 11 个 P1 组件 design.md 各有一节 Flux 决策主语决策表，列格式与 Phase 1 规范一致。
- [x] E2a–E2h 各工作项的能力面在其对应组件决策表中均有"采纳/不采纳+理由"行（实现工作项可直接引用）。
- [x] owner-doc 更新：11 个 P1 design.md 即 owner-doc 本身，已更新。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - 跨组件一致性与验证

Status: completed
Targets: 14 个组件 design.md（交叉核对）、`docs/components/amis-baseline-matrix.md`、`docs/components/existing-components-improvement-analysis.md`

- Item Types: `Proof`、`Follow-up`

- [x] 跨组件格式一致性核对：14 个决策表列名、行粒度、"能力"覆盖口径统一。
- [x] 命名对齐核对：所有"采纳"列字段名与 X3 `naming-conventions.md` 基线一致（variant 非 level、{label,value}、clearable/searchable 等）；不一致处修正。
- [x] 不采纳项落位核对：analysis §5 的每条不采纳都能在**对应组件** design.md 决策表找到"不采纳+理由"行（不只留在 analysis）。
- [x] 与 `amis-baseline-matrix.md` 一致性核对：retained 决策变化（若有）同步到 matrix。
- [x] 文档锚点/引用检查脚本通过（决策表被 E1/E2 plan 引用的路径可解析）。

#### Phase 4 输出 — 一致性核对证据（live repo 核对日期 2026-06-21）

**1. 格式一致性（14/14 通过）：**

- 列头：全部 14 个 `### Flux 决策表` 节均以 `| 能力 | 采纳 | 不采纳 | 理由 |` 开头（grep 验证）。无残留 3 列 `| 能力 | 决定 | 理由 |`。
- prelude：全部 14 个表前均有 `> Flux 决策主语。amis 仅作参考之一，**非标尺**。... 列：能力 | 采纳 | 不采纳 | 理由。` blockquote，引用 X3 基线（§1/§2/§3）。
- 行粒度：每个 E1a–E1d / E2a–E2h 工作项能力面至少一行；amis 不采纳项归到最相关行（不重复跨行）。

**2. 命名对齐 X3（无不一致）：**

- `variant`（非 amis `level`）：button ✓（"视觉变体"行 采纳=`variant` 6 值，不采纳=`level`）。
- `options {label,value}`（非 amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue`/`delimiter`/`simpleValue`）：select ✓、checkbox-group ✓。
- `clearable`/`searchable`（肯定式布尔，非 amis 模糊枚举）：select ✓、input-tree ✓、tree-select ✓、input-text ✓、textarea ✓、checkbox-group ✓。
- `disabled`/`readOnly`（肯定式）：input-text ✓、textarea ✓、form ✓、checkbox-group ✓。
- `prefix`/`suffix`/`placeholder`：input-text ✓（X3 §2 出处引用）。
- `when`（统一条件渲染，非 amis `visibleOn`/`hiddenOn`/`disabledOn`）：crud `checkableWhen` ✓（行 scope 延迟求值，X3 §1 "核心已简化"）。
- amis 名字仅出现在"不采纳"列（grep `joinValues`/`extractValue`/`borderMode`/`mobileUI`/`actionType`/`level` 验证：全部落位在 column 3 或表外 schema 节内引用决策表，未泄露进 column 2）。

**3. 不采纳项落位（analysis §5 全部回填到组件级）：**
| analysis §5 类别 | 涉及的 14 组件 | 落位行 |
| ---- | ---- | ---- |
| 前端导出（export-csv/excel） | table、crud | table "导出 Excel/CSV"、crud "导出 export-csv/export-excel" |
| 组件级请求（api/initFetch/...） | form、crud、select、input-tree、tree-select、input-text、textarea、checkbox-group、button、dialog、drawer | 各表对应"不采纳 amis 组件级 api"行 |
| 散落条件属性（visibleOn/hiddenOn/disabledOn） | crud（checkableWhen 用 raw expression + `when` 语义） | crud `checkableWhen` 行 |
| button amis 化（level/actionType/hotKey/countDown/isMenuItem/...） | button | button "视觉变体"行 + "动作触发协议"行 + 7 个纯不采纳行 |
| 值编码 amis 化（valueField/labelField/joinValues/...） | select、checkbox-group | select "amis 值编码"行、checkbox-group "amis 值编码"行 |
| 样式 amis 化（themeCss/wrapperCustomStyle/CustomStyle/borderMode） | input-text、textarea、table | input-text "amis borderMode"、textarea "amis borderMode"、table "amis rowClassNameExpr"+"amis tableLayout" |
| mobileUI 双实现 | dialog、drawer、button、input-tree、tree-select、checkbox-group、select | 各表 "amis mobileUI" 行 |
| 路由/持久化（syncLocation/promptPageLeave/persistData/redirect/...） | crud（syncLocation）、form（promptPageLeave/persistData/redirect） | crud "syncLocation"、form "persistData"/"promptPageLeave"/"redirect" |
| echarts 相关 / JS 函数串 / 杂项重 SDK | 不在 14 组件范围（chart/data-provider/iframe 等非 P0/P1） | 本计划 Non-Goals，P2/P3 随 E3 |

**4. amis-baseline-matrix.md 一致性：**

- 本计划**未改变**任何 retained/not-retained 决策（14 个组件均保持 `runtime` status，`landed` 实施状态）。
- 决策表只是把现有契约/计划/不采纳标准化为 4 列格式，矩阵的 ownership/status 列无需变更。
- **No owner-doc update required**（matrix retained 决策无变化）。

**5. 文档锚点/引用检查：**

- `node scripts/check-active-doc-code-anchors.mjs` 通过（233 active docs，无断链）。
- 决策表被 E1/E2 plan / roadmap 引用的路径（`docs/components/<type>/design.md` §2）均可解析。

Exit Criteria:

- [x] 14 个决策表格式统一、命名对齐 X3、不采纳项全部回填到组件级 design.md。
- [x] analysis §5 与组件级决策表的不采纳清单无矛盾。
- [x] owner-doc 更新：`amis-baseline-matrix.md` retained 决策无变化，**No owner-doc update required**。
- [x] `docs/logs/` 对应日期条目已更新。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子子 agent 在 REVIEW_PLANS 步骤填写。

- Reviewer / Agent: plan-review subagent（fresh session，REVIEW_PLANS 步骤）
- Verdict: pass
- Rounds: 1
- Findings addressed: 无 Blocker / 无 Major。已逐项核对：模板字段齐全、Item Types 合法（Decision/Proof/Fix/Follow-up）、纯文档计划 Closure Gates 正确删除 pnpm 项、14 组件清单与 analysis §1.1 完全一致、引用路径（14 个 design.md / analysis §1.1·§5 / input-number/design.md:13-31 / amis-baseline-matrix.md / X3 plan）经 live repo 核对均存在、Phase→Closure Gate 覆盖关系完整、Deferred（P2/P3）分类合规且带 Successor Path。
- Minor（不阻塞，留待下游 closure/deep audit）：
  - Test Strategy 用「档位选择：不适用」偏离模板「本档选择：」措辞，内容正确。
  - Current Baseline 称 X3「尚未成文」对 naming-conventions.md 文件成立，但未注明 X3 plan 已 active；Closure Gates 已正确把命名对齐硬依赖收口，不影响执行。

## Closure Gates

> 纯文档计划：依据 plan-authoring-guide，`pnpm typecheck`/`build`/`lint`/`test` 已删除（无代码变更）。
> **硬依赖**：本计划 Closure 前必须确认 X3（naming-conventions.md）已落地，否则命名对齐核对（Phase 4）无准绳。✅ X3 已 `done`（2026-06-21），`docs/references/naming-conventions.md` active。

- [x] 14 个 P0/P1 组件 design.md 各有一节 Flux 决策主语决策表，覆盖全能力面
- [x] 决策表格式（列、行粒度、能力覆盖口径）在 14 个组件间一致
- [x] 所有"采纳"列字段名与 X3 `naming-conventions.md` 基线一致
- [x] amis 不采纳项全部回填到对应组件 design.md（每条附 Flux 理由），不再仅存于 analysis §5
- [x] E0b/E0c 已补的窄表（crud/input-tree/tree-select）已复核并扩面至全能力面
- [x] 与 `amis-baseline-matrix.md` / analysis §5 无矛盾
- [x] 文档锚点/引用检查脚本通过（无断链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] 受影响 owner docs 已同步到 live baseline（14 个 design.md；matrix retained 决策无变化，No update required）
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据（本次为执行者 self-audit，由 mission driver 显式指令授权；如需可由独立子 agent 复核）

## Deferred But Adjudicated

### P2/P3 组件决策表

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 明确 P2/P3 组件决策表随 E3 批"按需启动"，非 E1/E2 实现的硬前置；X5 范围限定为 P0/P1（14 个）。
- Successor Required: yes
- Successor Path: E3 批启动时的新 plan（覆盖 input-number/condition-builder/code-editor/chart/flex/page/tabs 等）

## Non-Blocking Follow-ups

- Q2（crud cards/list 归属）/Q5（E2f surface 跨 roadmap 重叠）的最终裁决留待 E1d/E2f plan，本计划只在 crud/dialog/drawer 决策表标注依赖关系，不越权裁决。
- 若 E1/E2 实施中发现决策表遗漏某能力，回填对应组件 design.md 决策表（calibration，非阻塞）。

## Closure

Status Note: X5 完成。14 个 P0/P1 组件 design.md 的 Flux 决策表（4 列 `能力 | 采纳 | 不采纳 | 理由`，Flux 决策主语）全部就位，命名对齐 X3 `naming-conventions.md` 基线，amis 不采纳项全部回填到组件级，作为 E1a–E1d / E2a–E2h 所有实现工作项的硬前置契约。纯文档计划，无代码变更，依 plan-authoring-guide 不跑 `pnpm typecheck`/`build`/`lint`/`test`；anchor 前置脚本通过。

Closure Audit Evidence:

- Reviewer / Agent: 执行者 self-audit（mission driver 显式指令授权 self-close；如需独立 closure audit 可由 fresh sub-agent 复核）
- Evidence:
  - Phase 1 输出 A/B/C 写入本 plan：14 组件审计分类清单（12 需标准化 + 2 需新增 + 0 需扩面）、Flux 决策表规范（列定义/行粒度/能力覆盖范围/命名对齐 X3 规则）、crud/input-tree/tree-select 扩面裁定（已覆盖全能力面，仅翻转格式）
  - Phase 2-3 落地：14 个 `### Flux 决策表` 节全部翻转为 4 列格式（grep `^| 能力` 验证：14/14 通过；grep `决定.*理由` 验证：0 残留）
  - Phase 4 一致性证据写入本 plan：格式 14/14、命名对齐 X3（variant/options/clearable-searchable/disabled-readOnly/prefix-suffix-placeholder/when 全部对齐，amis 名字仅出现在"不采纳"列）、analysis §5 不采纳项全部回填到组件级（前端导出/组件级请求/散落条件属性/button amis 化/值编码 amis 化/样式 amis 化/mobileUI/路由持久化 8 类全部落位）
  - amis-baseline-matrix.md：retained 决策无变化（14 组件均 `runtime`/`landed`），No owner-doc update required
  - 文档锚点：`node scripts/check-active-doc-code-anchors.mjs` 通过（233 active docs，无断链）
  - Daily log：`docs/logs/2026/06-21.md` 新增 X5 Phase 1/2/3/4 四节执行记录

Follow-up:

- no remaining plan-owned work
- 独立 closure audit（如需）可由 fresh sub-agent 复核；E1/E2 实现工作项现在可以引用各组件 design.md §2 Flux 决策表行作为契约依据
