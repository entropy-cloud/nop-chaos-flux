# Components Design Audit

> 审计日期: 2026-04-07
> 审计范围: `docs/components/` 下全部 52 个组件目录
> 对照基线: `docs/components/index.md`、`docs/components/examples.manifest.json`、相关组件 `design.md`/`example.json`

---

## 1. 总体结论

本次复核后，原审计文档中的大部分基础结论成立，但有几处统计口径和问题定性需要修正。

| 维度                | 复核结果                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 目录结构合规        | **52/52** - 每个组件目录均包含 `design.md` 和 `example.json`                                                              |
| 12 节覆盖           | **52/52** - 全部 `design.md` 都包含 `## 1.` 到 `## 12.` 的建议章节                                                        |
| example.json 有效性 | **52/52** - 全部 `example.json` 语法合法                                                                                  |
| manifest 分类统计   | **已修正** - `runtime` 实际为 **36**，`targetContract` 为 **14**，`declaredButUnregistered` 为 **2**                      |
| 已完成修复          | **7 项** - 已完成 `showAndOr` / `readOnly` 重命名、`chart` 示例收敛、`report-toolbar` 说明补充、以及 6 个缺失事件示例补齐 |
| 仍属说明类事项      | **2 个** - `report-designer-page` region 写法可再统一、AMIS 映射章节若继续扩写需拆分"语义承接"和"type 保留"口径           |

复核方法说明：

- 已用脚本验证 52 个组件目录的文件完整性、12 节标题覆盖和 JSON 语法。
- 已逐项复核原文列出的 5 个问题，并交叉检查 `index.md`、`examples.manifest.json`、相关组件设计文档与计划文档。

---

## 2. 基础事实核对

### 2.1 目录与文件完整性

- `docs/components/` 实际共有 **52** 个组件目录。
- 全部组件目录都包含 `design.md` 和 `example.json`。
- `docs/components/index.md` 中"当前组件目录"清单与实际目录一致。

### 2.2 design.md 章节覆盖

- `index.md` 要求的 12 个建议章节，在 52/52 个 `design.md` 中都能找到。
- 原文"12 节覆盖 52/52"结论成立。

### 2.3 example.json 有效性

- 52 个 `example.json` 全部可被 JSON 解析。
- 原文"example.json 有效性 52/52"结论成立。

### 2.4 manifest 分类统计

`docs/components/examples.manifest.json` 的实际数量为：

| manifest 分类             | 实际数量 | 复核结论              |
| ------------------------- | -------- | --------------------- |
| `runtime`                 | **36**   | 原文写成 35，统计错误 |
| `targetContract`          | 14       | 正确                  |
| `declaredButUnregistered` | 2        | 正确                  |

对应关系说明：

- `runtime` = 26 个通用已注册 renderer + 10 个领域已注册 renderer = **36**。
- `targetContract` = 14 个已文档化但尚未实现的通用 renderer。
- `declaredButUnregistered` = `designer-node-card`、`designer-edge-row`。

---

## 3. 逐项问题复核与处理结果

### 3.1 已确认并已处理的问题

#### 问题 #1: `condition-builder` - `showANDOR` 不符合 camelCase

- 文件: `docs/components/condition-builder/example.json`
- 原现状: `"showANDOR": true`
- 判定: **已修复**
- 依据: `docs/components/index.md` 明确要求 JSON key 使用 camelCase。
- 处理结果: 已统一改为 `showAndOr`，并同步到 renderer schema、测试、架构文档和 playground 示例。
- 严重程度: 中

#### 问题 #2: `spreadsheet-page` - `readonly` 与命名基线不一致

- 文件: `docs/components/spreadsheet-page/example.json`
- 相关文档: `docs/components/spreadsheet-page/design.md`
- 原现状: 设计文档和示例都使用 `readonly`
- 判定: **已修复**
- 依据: `docs/components/index.md` 在"标准名称速查"里明确以 `readOnly` 作为只读字段基线。
- 处理结果: 已统一改为 `readOnly`，并同步到 `spreadsheet-renderers` schema helper、page renderer、示例与回归测试。
- 严重程度: 低

#### 问题 #3: `chart` 示例存在双数据入口语义冲突

- 文件: `docs/components/chart/example.json`
- 原现状: 同时存在 `source` 和 `series[].data`
- 判定: **已修复，但属于文档自洽性问题，不是命名问题**
- 依据:
  - `chart/design.md` 第 4 节和第 12 节都明确提到 `series` 与 `source` 双入口需要持续规范。
  - 现有示例同时给出两套数据承载方式，会让"最终以哪条通道为准"变得不清楚。
- 处理结果: `example.json` 已改为使用 `source` + `series[].dataRegionKey` 的单一路径，不再混用内联数组。
- 严重程度: 中

### 3.2 需要改判的问题

#### 原问题 #3: `report-designer-page` region 形状不一致

- 文件: `docs/components/report-designer-page/example.json`
- 原判定: region 必须是数组，因此 `toolbar` / `fieldPanel` / `inspector` 使用裸对象应判错。
- 复核结论: **不成立，至少不能依据当前基线直接判错**。

理由：

- `docs/architecture/field-metadata-slot-modeling.md` 明确说明：当字段是 `region` 或 `value-or-region` 时，原始值可以是单个 schema object 或 schema array，都会被编译为 region。
- `report-designer-page/design.md` 只把 `toolbar`、`fieldPanel`、`inspector` 定义为 region，并没有要求"必须写成数组"。
- 因此，这里的裸对象写法更适合归类为"示例风格未统一"，不应直接当成 schema 违规。

更准确的表述应为：

- `report-designer-page/example.json` 当前混用了"单对象 region"与"数组 region"两种写法。
- 如果团队希望减少作者心智负担，可以在 `index.md` 或组件设计文档里补充"region 示例推荐写法"。

#### 原问题 #4: `report-toolbar` action 约定偏离

- 文件: `docs/components/report-toolbar/example.json`
- 原判定: `"action": "report-designer:save"` 偏离 `onClick: ActionSchema` 标准。
- 复核结论: **不应直接判为错误，更准确地说是"需要补充契约说明"**。

理由：

- `report-toolbar/design.md` 明确 `itemsOverride` 的元素类型是 `ToolbarItem`，不是任意子 schema。
- `docs/archive/plans/32-report-designer-schema-driven-refactor-plan.md` 和 `docs/logs/2026/04-04.md` 都明确记录了 `ToolbarItem` 契约，其中字段就是 `action?: string`。
- 这说明它是领域特定的轻量 item 配置协议，而不是通用 renderer 事件字段。

因此更合理的结论是：

- `report-toolbar` 示例本身与当前 `ToolbarItem` 契约一致。
- 原先的说明确实偏少，但现已在 `report-toolbar/design.md` 中补充该契约说明。

---

## 4. 原文统计与分组问题

除具体组件问题外，原审计文档还存在几处统计层面的错误或不严谨之处。

### 4.1 小节组件数量写错

原文分组标题中的数量与表格实际行数不一致：

| 分组                 | 原文标题 | 实际数量  |
| -------------------- | -------- | --------- |
| 通用基础与内容组件   | 21 个    | **22** 个 |
| 表单组件             | 14 个    | 14 个     |
| 数据与逻辑组件       | 4 个     | 4 个      |
| 领域宿主与设计器组件 | 13 个    | **12** 个 |

说明：

- 通用基础与内容组件表格从 `page` 到 `empty` 共 22 行。
- 领域宿主与设计器组件表格从 `designer-page` 到 `spreadsheet-page` 共 12 行。

### 4.2 "命名规范 49/52" 结论不准确

原文把 3 个问题都算进"命名问题"，但复核后：

- 命名问题只有 2 个: `showANDOR`、`readonly`
- `chart` 是数据入口语义冲突，不属于命名问题
- `report-designer-page` 与 `report-toolbar` 原先也不应计入命名问题

因此"49/52 合规，3 个组件存在命名问题"需要改成更准确的口径，例如：

- "命名规范已确认 2 个问题"
- "另有 1 个示例语义问题、2 个需要补充契约说明的问题"

---

## 5. 跨组件改进建议复核

### 5.1 event 示例覆盖不足

原文列出的这部分总体方向是成立的。

已复核的示例：

| 组件     | design.md 声明事件                                                                               | example.json 是否展示      |
| -------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| `button` | `onClick`                                                                                        | 是                         |
| `dialog` | `onOpen`, `onClose`                                                                              | 是                         |
| `drawer` | `onOpen`, `onClose`                                                                              | 是                         |
| `table`  | `onRowClick`, `onSortChange`, `onFilterChange`, `onPageChange`, `onSelectionChange`, `onRefresh` | 已补最小 `onRowClick` 示例 |
| `image`  | `onClick`, `onLoadError`                                                                         | 已补最小 `onClick` 示例    |
| `link`   | `onClick`                                                                                        | 是                         |

本轮已补齐最小事件示例。后续如果这些组件继续扩展事件面，再按组件重要性补更多代表性事件即可。

### 5.2 过渡态字段追踪

原文这部分也基本成立：

| 组件       | 字段             | 复核结论                         |
| ---------- | ---------------- | -------------------------------- |
| `tag-list` | `tags`           | design.md 已明确标注为过渡态     |
| `flex`     | `body` / `items` | 示例与设计中确实存在双入口待收敛 |
| `text`     | `text` / `body`  | 示例与设计中确实存在双入口待收敛 |

建议继续保留，并把后续动作写得更明确：

- 若短期内不收敛，应在对应 `design.md` 明确"正式推荐入口"和"兼容入口"。
- 若计划收敛，应在 `roadmap.md` 或日常开发日志中记录迁移节点。

---

## 6. AMIS 映射章节复核

原文第 5 节最主要的问题不是"方向错"，而是"口径混杂"。

### 6.1 可以保留的判断

以下判断基本成立：

- Flux 组件目录不是 AMIS 全量镜像，而是经过简化和重命名后的目标 DSL。
- `button` 是对 AMIS `action` / `submit` / `reset` 语义的统一收敛点。
- `separator`、`json-view`、`data-source`、`radio-group`、`checkbox-group` 这类名称，属于 Flux 侧重命名与语义收敛。
- 领域组件如 `designer-page`、`report-designer-page`、`spreadsheet-page` 确实是 Flux 独有。

### 6.2 需要修正的地方

原文把以下两种说法混写到了同一层：

- "AMIS type 与 Flux 组件的语义承接关系"
- "Flux 是否保留该 type 作为正式 renderer 名"

这会导致自相矛盾，例如：

- 表 5.1 里把 `tpl` 映射到了 `html`
- 但后面又写"`tpl` 不保留，由 text/markdown/html 承接"

以及：

- 表 5.1 里把 `action` 映射到了 `button`
- 后面又写"`action` 不保留，统一到 button"

更合理的写法应拆成两层：

| 口径          | 应如何表述                                            |
| ------------- | ----------------------------------------------------- |
| 语义承接      | "AMIS 的某类能力在 Flux 中主要由哪个组件承接"         |
| type 保留策略 | "Flux 是否保留 AMIS 原 type 名作为正式 renderer type" |

也就是说：

- `action` 可以说"语义由 `button` 承接"，但不能同时说它既"已映射"为 Flux type，又"有意不映射"为 Flux type。
- `tpl` 可以说"相关能力分流到 `text` / `markdown` / `html`"，但不应在"已映射 type"表里把它写成对 `html` 的一一对应。

### 6.3 关于"31/181"覆盖率

原文的 "31/181 个 AMIS primary type" 在当前仓库内没有直接可复算的数据源支撑；审计文档也没有说明这 181 的统计方法。

因此更稳妥的写法是：

- 保留"当前覆盖的是一小部分高频核心能力，非 AMIS 全量镜像"的定性结论。
- 删除或弱化 `31/181` 这类无法在仓库内直接复核的精确比例。
- 如果必须保留该数字，应补充统计脚本、口径说明或外部清单来源。

---

## 7. 当前剩余建议

### P1

- 统一 region 示例写法风格，减少"单对象 region / 数组 region"混用带来的阅读噪音

### P2

- 在 `roadmap.md` 或相应组件文档中持续追踪 `tag-list.tags`、`flex.body/items`、`text.text/body` 的收敛计划

---

## 8. 建议后的审计口径

如果继续维护这份审计文档，建议后续按以下口径写，避免再次混淆：

| 类别       | 应包含内容                                             |
| ---------- | ------------------------------------------------------ |
| 已验证事实 | 目录数、文件完整性、章节覆盖、JSON 语法、manifest 计数 |
| 已确认问题 | 可以直接从当前仓库基线推导出的违规或不一致             |
| 需补充说明 | 现有设计可成立，但解释不足、示例风格不统一             |
| 改进建议   | 事件示例、迁移说明、术语收敛、文档可读性优化           |

按这个口径，文档既能保留"审计"价值，也能避免把设计选择误写成错误。

---

## 9. 2026-04-10 后续审计补充

> 审计日期: 2026-04-10
> 审计范围: `index.md` 清单一致性、`examples.manifest.json` 与实际目录核对、`@nop-chaos/ui` 导出与 renderer 文档覆盖交叉分析

### 9.1 文件完整性复核

通过 glob 确认所有 `design.md` 文件均存在（含 `select`、`switch`、`wizard`、`list`、`spinner` 等此前被怀疑缺失的目录）。前次会话中 agent 探索截断导致的误报，现已消除。

实际存在 59 个含 `design.md` 的组件目录（含结构层 `fragment`、`loop`、`recurse` 以及 `declaredButUnregistered` 的 `designer-node-card`、`designer-edge-row`）。`index.md` 主清单列出 52 个，差值来自这些未进主清单的条目，无文件遗漏。

### 9.2 index.md 过期条目修复

`index.md` 的"已文档化但尚未实现"清单中包含 `fragment`、`loop`、`recurse`，但 `examples.manifest.json` 已将三者列为 `runtime`，且代码已注册实现。

**已修复**：已从该清单中移除这三个条目，使其与 `examples.manifest.json` 保持一致。

> 注：本次（2026-04-10）修复仅覆盖 `fragment`/`loop`/`recurse` 三个结构节点。后续复核发现该清单仍残留约 42 个已 shipped 的内容/布局/数据/复合表单 renderer（`alert`/`card`/`carousel`/`combo`/`editor`/`grid`/`list`/`markdown`/`html`/`pagination`/`picker`/`service`/`steps`/`timeline`/`transfer`/`wizard` 等），已于 2026-06-25（`docs/plans/2026-06-25-0630-3-docs-baseline-remediation.md`，C-25）整体重建：全部已注册类型移入“当前代码已注册的通用 renderer”，“已文档化但 runtime 尚未注册的 retained renderer”清单已清空。`schema 已声明但尚未注册的领域 renderer` 中的 `designer-node-card`/`designer-edge-row` 同期确认已在 `flowDesignerRendererDefinitions` 注册并移出该清单。

### 9.3 @nop-chaos/ui 覆盖分析

当前 `@nop-chaos/ui/src/index.ts` 共导出 59 项。其中 utility 或仅作实现工具的 primitive（`cn`、`kbd`、`item`、`field`、`direction`、`toolbar`、`command`、`scroll-area`、`resizable`、`native-select`、`button-group`、`collapsible`、`hover-card`、`context-menu`、`dropdown-menu`、`menubar`、`input-group`、`sidebar`、`popover`）不需要独立 renderer type。

**目前无对应 renderer 文档、但属于合理 renderer 候选的 UI primitive**（按优先级排序）：

| UI primitive              | 候选 renderer type         | 优先级建议                                            |
| ------------------------- | -------------------------- | ----------------------------------------------------- |
| `pagination`              | `pagination`               | P1 — 表格/列表分页配套，高频需求                      |
| `skeleton`                | `skeleton`                 | P1 — loading placeholder，场景明确                    |
| `combobox`                | `combobox`                 | P1 — 可搜索选择器，扩展 `select` 能力                 |
| `alert`                   | `alert`                    | P2 — 内联提示 banner                                  |
| `slider`                  | `input-slider`             | P2 — 数值/范围输入 form field                         |
| `avatar`                  | `avatar`                   | P2 — 用户头像展示                                     |
| `breadcrumb`              | `breadcrumb`               | P2 — 导航路径                                         |
| `accordion`               | `accordion`                | P2 — 可折叠内容组                                     |
| `toggle` / `toggle-group` | `toggle` / `toggle-group`  | P2 — 单选/多选按钮组 form field                       |
| `sheet`                   | `sheet` 或作 `drawer` 别名 | P3 — 当前 `drawer` 已覆盖主要场景                     |
| `carousel`                | `carousel`                 | P3 — 图片/内容轮播                                    |
| `navigation-menu`         | `navigation-menu`          | P3 — 导航菜单                                         |
| `input-otp`               | `input-otp`                | P3 — 验证码输入 form field                            |
| `tooltip`                 | N/A                        | N/A — 作为 renderer 元属性注入更合适，不需要独立 type |

这些候选项均可在 UI primitive 已就绪的情况下直接创建 `docs/components/<type>/design.md`，实现不受 UI 库制约。

### 9.4 结论

| 维度                  | 结果                                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| 文件完整性            | 无遗漏，前次误报已消除                                                                                    |
| `index.md` 清单准确性 | 已修复 1 处过期条目（`fragment`/`loop`/`recurse` 已移出"未实现"清单）                                     |
| manifest 与目录一致性 | 一致，无需修改                                                                                            |
| UI primitive 覆盖缺口 | 3 个 P1 候选（`pagination`、`skeleton`、`combobox`）尚无 docs，可优先补充                                 |
| 仍存在的设计质量问题  | 同 §7：region 示例写法混用（P1）；`tag-list.tags`/`flex.body/items`/`text.text/body` 过渡态字段收敛（P2） |

### 9.5 AMIS 基线差集补充

> 补充审计日期: 2026-04-12
> 对照基线: `docs/amis-types/*.d.ts` 与 `docs/components/` 当前目录

这次补充审计回答的是一个与前文不同的问题：

- 前文主要审计“当前已存在的组件目录是否完整、自洽、命名一致”。
- 本节审计“AMIS 已有的组件能力范围，与当前 `docs/components/` 的设计覆盖范围之间还差多少”。

这两个问题不能混为一谈。

前文 `52/52`、`59 个含 design.md 目录` 一类结论，只能说明“现有目录内部相对完整”，**不能推出**“已经系统覆盖了 AMIS 的重要组件范围”。

#### 9.5.1 核心结论

- 当前 `docs/components/` 并不是一次性按 AMIS 全量类型差集推导后形成的完整覆盖面。
- 它更接近“围绕当前 Flux 已落地 renderer、明确高优先级目标契约、以及少量领域宿主组件”的逐步沉淀结果。
- 因此，像 `crud` 这样的 AMIS 高价值核心组件，理论上不应该缺席，但在此前流程里确实可能因为没有做“AMIS baseline -> Flux docs coverage”差集检查而遗漏。

#### 9.5.2 已承接或有意重命名的类型

以下类型不能简单视为“缺文档”，因为 Flux 已明确采用合并/改名策略：

| AMIS type                     | Flux 承接方式                | 说明                                                 |
| ----------------------------- | ---------------------------- | ---------------------------------------------------- |
| `action` / `submit` / `reset` | `button`                     | `docs/components/index.md` 已明确统一收敛到 `button` |
| `tpl` / `plain`               | `text` / `html` / `markdown` | 文本展示能力已拆分，不保留原 type                    |
| `divider`                     | `separator`                  | 命名按 Flux/UI primitive 收敛                        |
| `each`                        | `loop`                       | 结构节点改用 Flux 术语                               |
| `checkboxes`                  | `checkbox-group`             | 统一 group 命名                                      |
| `radios`                      | `radio-group`                | 统一 group 命名                                      |
| `input-array`                 | `array-editor`               | 以 Flux 当前对象/数组字段体系承接                    |

#### 9.5.3 当前已明确缺失、且优先级不低的 AMIS 能力

按 `docs/amis-types/` 与当前 `docs/components/` 目录差集复核，以下组件族目前仍没有对应组件 owner 文档，且其中不少属于高频或企业场景常用能力：

| AMIS type / 能力族                              | 当前状态     | 备注                                                                                    |
| ----------------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `crud`                                          | **已补文档** | 2026-04-12 新增 `docs/components/crud/`                                                 |
| `cards`                                         | 缺失         | `crud` 的 cards mode、独立卡片集合场景都需要                                            |
| `pagination` / `pagination-wrapper`             | 缺失         | 高频基础数据能力；此前只在 UI primitive 审计里被提到                                    |
| `service`                                       | 缺失         | AMIS 中重要的数据装配/局部请求容器，需判断与 `data-source` / `page` / `fragment` 的边界 |
| `alert`                                         | 缺失         | 高频反馈组件                                                                            |
| `input-number`                                  | 缺失         | 基础表单控件，不应长期缺位                                                              |
| 日期时间族                                      | 缺失         | `input-date`、`input-datetime`、`input-time`、range、month/quarter/year 系列            |
| `input-file` / `input-image`                    | 缺失         | 企业表单高频能力                                                                        |
| `editor` / `input-rich-text`                    | 缺失         | 与现有 `code-editor` 不同，属于富文本内容编辑                                           |
| `button-group` / `dropdown-button`              | 缺失         | 常见动作编排组件                                                                        |
| `collapse` / `collapse-group`                   | 缺失         | 常用容器交互组件                                                                        |
| `grid`                                          | 缺失         | 经典布局能力，需判断与 `flex` / `container` 的边界                                      |
| `audio` / `video` / `carousel` / `qrcode`       | 缺失         | 内容展示族缺口                                                                          |
| `mapping` / `status`                            | 缺失         | AMIS 中常用的业务展示小组件                                                             |
| `search-box`                                    | 缺失         | 可由 `form + input-text` 承接，但目前无正式 owner 结论                                  |
| `combo` / `picker` / `transfer` / `input-table` | 缺失         | 复杂表单能力族，后续需结合 Flux 组合字段体系重新建模                                    |

#### 9.5.4 根因分析

`crud` 之所以此前会遗漏，不是因为它不重要，而是因为此前的组件文档流程有一个明显缺口：

1. 有 `docs/amis-types/` 作为上游能力参考。
2. 有 `docs/components/` 作为 Flux 组件 owner 文档目录。
3. 但缺少一个持续维护的“AMIS 基线类型 -> Flux 正式 type / 承接策略 / owner 文档路径 / 当前状态”矩阵。

结果就是：

- 已存在组件目录时，审计能检查内部质量。
- 但组件目录根本没建立时，旧审计方法不会报警。

`crud` 正是这个流程缺口暴露出来的典型案例。

#### 9.5.5 后续建议

- 不再把“组件目录完整性审计”表述成“组件能力覆盖完整性审计”。
- 后续应新增一份 AMIS 基线映射矩阵，至少包含：
  - AMIS 原 type
  - Flux 是否保留同名 type
  - 若不保留，由哪个 Flux 组件/架构概念承接
  - 对应 `docs/components/<type>/design.md` 路径
  - 当前状态：runtime / targetContract / candidate / intentionally-not-kept
- 在该矩阵落地前，`roadmap.md` 中的候选清单应被理解为“当前项目关注项”，而不是“AMIS 重要组件已经系统过表后的完整优先级表”。

## 10. 2026-04-12 Plan 78 执行后补充

> 补充审计日期: 2026-04-12
> 审计范围: `docs/amis-types/*.d.ts`、`docs/components/`、`docs/components/amis-baseline-matrix.md`、`docs/components/examples.manifest.json`

### 10.1 结论

- 9.5 节记录的“高价值 retained family 仍有明显目录缺口”结论，现已被 Plan 78 执行结果取代。
- `docs/components/amis-baseline-matrix.md` 现在是 AMIS -> Flux retained/notRetained 决策的主入口。
- `docs/components/` 当前共有 92 个组件目录，全部包含 `design.md` 与 `example.json`。
- 当前基线已对审计到的 137 个 AMIS 顶层 `type` literal 给出显式 retained 或 notRetained 决策，不再存在“未写进矩阵的 audited AMIS type”。

### 10.2 当前 manifest 基线

同步后 `docs/components/examples.manifest.json` 现按当前 owner-doc 基线分为：

| manifest 分类             | 数量 | 说明                                                         |
| ------------------------- | ---- | ------------------------------------------------------------ |
| `runtime`                 | 48   | 已注册实现且有 owner doc 的组件                              |
| `targetContract`          | 44   | owner doc 已落地、当前尚未注册实现的 retained canonical 组件 |
| `declaredButUnregistered` | 2    | `designer-node-card`、`designer-edge-row`                    |

说明：

- `code-editor`、`fragment`、`loop`、`recurse`、`wizard` 现已补齐 `example.json` 并与 manifest 对齐。
- `fieldset` 已按 live runtime 收入 `runtime` 基线；`word-editor-page` 已补齐 `example.json` 并收入 `runtime` manifest。
- `wizard` 以及 Plan 78 新增 retained family 现已纳入 manifest，不再存在“目录已存在但 manifest 未登记”的漂移。

### 10.3 口径更新

后续再看 AMIS 组件覆盖时，应以以下口径为准：

- retained canonical family 是否有 owner doc：看 `docs/components/amis-baseline-matrix.md` + 实际目录
- 每个目录是否完整：看 `docs/components/components-audit.md`
- 示例校验状态：看 `docs/components/examples.manifest.json`

因此：

- `slider`、`rating`、`avatar`、`calendar`、`nav`、`iframe` 等仍未进入 owner-doc 目录的类型，只有在 matrix 把它们改判为 retained 时，才应被视为覆盖缺口。
- 对于已明确标为 `notRetained` 的 AMIS type，不应再继续把“没有组件目录”记为文档缺陷。
