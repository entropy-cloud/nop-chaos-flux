# Components Design Audit

> 审计日期: 2026-04-07
> 审计范围: `docs/components/` 下全部 52 个组件目录
> 对照基线: `docs/components/index.md`、`docs/components/examples.manifest.json`、相关组件 `design.md`/`example.json`

---

## 1. 总体结论

本次复核后，原审计文档中的大部分基础结论成立，但有几处统计口径和问题定性需要修正。

| 维度 | 复核结果 |
|------|----------|
| 目录结构合规 | **52/52** - 每个组件目录均包含 `design.md` 和 `example.json` |
| 12 节覆盖 | **52/52** - 全部 `design.md` 都包含 `## 1.` 到 `## 12.` 的建议章节 |
| example.json 有效性 | **52/52** - 全部 `example.json` 语法合法 |
| manifest 分类统计 | **已修正** - `runtime` 实际为 **36**，`targetContract` 为 **14**，`declaredButUnregistered` 为 **2** |
| 已完成修复 | **7 项** - 已完成 `showAndOr` / `readOnly` 重命名、`chart` 示例收敛、`report-toolbar` 说明补充、以及 6 个缺失事件示例补齐 |
| 仍属说明类事项 | **2 个** - `report-designer-page` region 写法可再统一、AMIS 映射章节若继续扩写需拆分“语义承接”和“type 保留”口径 |

复核方法说明：

- 已用脚本验证 52 个组件目录的文件完整性、12 节标题覆盖和 JSON 语法。
- 已逐项复核原文列出的 5 个问题，并交叉检查 `index.md`、`examples.manifest.json`、相关组件设计文档与计划文档。

---

## 2. 基础事实核对

### 2.1 目录与文件完整性

- `docs/components/` 实际共有 **52** 个组件目录。
- 全部组件目录都包含 `design.md` 和 `example.json`。
- `docs/components/index.md` 中“当前组件目录”清单与实际目录一致。

### 2.2 design.md 章节覆盖

- `index.md` 要求的 12 个建议章节，在 52/52 个 `design.md` 中都能找到。
- 原文“12 节覆盖 52/52”结论成立。

### 2.3 example.json 有效性

- 52 个 `example.json` 全部可被 JSON 解析。
- 原文“example.json 有效性 52/52”结论成立。

### 2.4 manifest 分类统计

`docs/components/examples.manifest.json` 的实际数量为：

| manifest 分类 | 实际数量 | 复核结论 |
|--------------|----------|----------|
| `runtime` | **36** | 原文写成 35，统计错误 |
| `targetContract` | 14 | 正确 |
| `declaredButUnregistered` | 2 | 正确 |

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
- 依据: `docs/components/index.md` 在“标准名称速查”里明确以 `readOnly` 作为只读字段基线。
- 处理结果: 已统一改为 `readOnly`，并同步到 `spreadsheet-renderers` schema helper、page renderer、示例与回归测试。
- 严重程度: 低

#### 问题 #3: `chart` 示例存在双数据入口语义冲突

- 文件: `docs/components/chart/example.json`
- 原现状: 同时存在 `source` 和 `series[].data`
- 判定: **已修复，但属于文档自洽性问题，不是命名问题**
- 依据:
  - `chart/design.md` 第 4 节和第 12 节都明确提到 `series` 与 `source` 双入口需要持续规范。
  - 现有示例同时给出两套数据承载方式，会让“最终以哪条通道为准”变得不清楚。
- 处理结果: `example.json` 已改为使用 `source` + `series[].dataRegionKey` 的单一路径，不再混用内联数组。
- 严重程度: 中

### 3.2 需要改判的问题

#### 原问题 #3: `report-designer-page` region 形状不一致

- 文件: `docs/components/report-designer-page/example.json`
- 原判定: region 必须是数组，因此 `toolbar` / `fieldPanel` / `inspector` 使用裸对象应判错。
- 复核结论: **不成立，至少不能依据当前基线直接判错**。

理由：

- `docs/architecture/field-metadata-slot-modeling.md` 明确说明：当字段是 `region` 或 `value-or-region` 时，原始值可以是单个 schema object 或 schema array，都会被编译为 region。
- `report-designer-page/design.md` 只把 `toolbar`、`fieldPanel`、`inspector` 定义为 region，并没有要求“必须写成数组”。
- 因此，这里的裸对象写法更适合归类为“示例风格未统一”，不应直接当成 schema 违规。

更准确的表述应为：

- `report-designer-page/example.json` 当前混用了“单对象 region”与“数组 region”两种写法。
- 如果团队希望减少作者心智负担，可以在 `index.md` 或组件设计文档里补充“region 示例推荐写法”。

#### 原问题 #4: `report-toolbar` action 约定偏离

- 文件: `docs/components/report-toolbar/example.json`
- 原判定: `"action": "report-designer:save"` 偏离 `onClick: ActionSchema` 标准。
- 复核结论: **不应直接判为错误，更准确地说是“需要补充契约说明”**。

理由：

- `report-toolbar/design.md` 明确 `itemsOverride` 的元素类型是 `ToolbarItem`，不是任意子 schema。
- `docs/plans/32-report-designer-schema-driven-refactor-plan.md` 和 `docs/logs/2026/04-04.md` 都明确记录了 `ToolbarItem` 契约，其中字段就是 `action?: string`。
- 这说明它是领域特定的轻量 item 配置协议，而不是通用 renderer 事件字段。

因此更合理的结论是：

- `report-toolbar` 示例本身与当前 `ToolbarItem` 契约一致。
- 原先的说明确实偏少，但现已在 `report-toolbar/design.md` 中补充该契约说明。

---

## 4. 原文统计与分组问题

除具体组件问题外，原审计文档还存在几处统计层面的错误或不严谨之处。

### 4.1 小节组件数量写错

原文分组标题中的数量与表格实际行数不一致：

| 分组 | 原文标题 | 实际数量 |
|------|----------|----------|
| 通用基础与内容组件 | 21 个 | **22** 个 |
| 表单组件 | 14 个 | 14 个 |
| 数据与逻辑组件 | 4 个 | 4 个 |
| 领域宿主与设计器组件 | 13 个 | **12** 个 |

说明：

- 通用基础与内容组件表格从 `page` 到 `empty` 共 22 行。
- 领域宿主与设计器组件表格从 `designer-page` 到 `spreadsheet-page` 共 12 行。

### 4.2 “命名规范 49/52” 结论不准确

原文把 3 个问题都算进“命名问题”，但复核后：

- 命名问题只有 2 个: `showANDOR`、`readonly`
- `chart` 是数据入口语义冲突，不属于命名问题
- `report-designer-page` 与 `report-toolbar` 原先也不应计入命名问题

因此“49/52 合规，3 个组件存在命名问题”需要改成更准确的口径，例如：

- “命名规范已确认 2 个问题”
- “另有 1 个示例语义问题、2 个需要补充契约说明的问题”

---

## 5. 跨组件改进建议复核

### 5.1 event 示例覆盖不足

原文列出的这部分总体方向是成立的。

已复核的示例：

| 组件 | design.md 声明事件 | example.json 是否展示 |
|------|--------------------|-----------------------|
| `button` | `onClick` | 是 |
| `dialog` | `onOpen`, `onClose` | 是 |
| `drawer` | `onOpen`, `onClose` | 是 |
| `table` | `onRowClick`, `onSortChange`, `onFilterChange`, `onPageChange`, `onSelectionChange`, `onRefresh` | 已补最小 `onRowClick` 示例 |
| `image` | `onClick`, `onLoadError` | 已补最小 `onClick` 示例 |
| `link` | `onClick` | 是 |

本轮已补齐最小事件示例。后续如果这些组件继续扩展事件面，再按组件重要性补更多代表性事件即可。

### 5.2 过渡态字段追踪

原文这部分也基本成立：

| 组件 | 字段 | 复核结论 |
|------|------|----------|
| `tag-list` | `tags` | design.md 已明确标注为过渡态 |
| `flex` | `body` / `items` | 示例与设计中确实存在双入口待收敛 |
| `text` | `text` / `body` | 示例与设计中确实存在双入口待收敛 |

建议继续保留，并把后续动作写得更明确：

- 若短期内不收敛，应在对应 `design.md` 明确“正式推荐入口”和“兼容入口”。
- 若计划收敛，应在 `roadmap.md` 或日常开发日志中记录迁移节点。

---

## 6. AMIS 映射章节复核

原文第 5 节最主要的问题不是“方向错”，而是“口径混杂”。

### 6.1 可以保留的判断

以下判断基本成立：

- Flux 组件目录不是 AMIS 全量镜像，而是经过简化和重命名后的目标 DSL。
- `button` 是对 AMIS `action` / `submit` / `reset` 语义的统一收敛点。
- `separator`、`json-view`、`data-source`、`radio-group`、`checkbox-group` 这类名称，属于 Flux 侧重命名与语义收敛。
- 领域组件如 `designer-page`、`report-designer-page`、`spreadsheet-page` 确实是 Flux 独有。

### 6.2 需要修正的地方

原文把以下两种说法混写到了同一层：

- “AMIS type 与 Flux 组件的语义承接关系”
- “Flux 是否保留该 type 作为正式 renderer 名”

这会导致自相矛盾，例如：

- 表 5.1 里把 `tpl` 映射到了 `html`
- 但后面又写“`tpl` 不保留，由 text/markdown/html 承接”

以及：

- 表 5.1 里把 `action` 映射到了 `button`
- 后面又写“`action` 不保留，统一到 button”

更合理的写法应拆成两层：

| 口径 | 应如何表述 |
|------|------------|
| 语义承接 | “AMIS 的某类能力在 Flux 中主要由哪个组件承接” |
| type 保留策略 | “Flux 是否保留 AMIS 原 type 名作为正式 renderer type” |

也就是说：

- `action` 可以说“语义由 `button` 承接”，但不能同时说它既“已映射”为 Flux type，又“有意不映射”为 Flux type。
- `tpl` 可以说“相关能力分流到 `text` / `markdown` / `html`”，但不应在“已映射 type”表里把它写成对 `html` 的一一对应。

### 6.3 关于“31/181”覆盖率

原文的 “31/181 个 AMIS primary type” 在当前仓库内没有直接可复算的数据源支撑；审计文档也没有说明这 181 的统计方法。

因此更稳妥的写法是：

- 保留“当前覆盖的是一小部分高频核心能力，非 AMIS 全量镜像”的定性结论。
- 删除或弱化 `31/181` 这类无法在仓库内直接复核的精确比例。
- 如果必须保留该数字，应补充统计脚本、口径说明或外部清单来源。

---

## 7. 当前剩余建议

### P1

- 统一 region 示例写法风格，减少“单对象 region / 数组 region”混用带来的阅读噪音

### P2

- 在 `roadmap.md` 或相应组件文档中持续追踪 `tag-list.tags`、`flex.body/items`、`text.text/body` 的收敛计划

---

## 8. 建议后的审计口径

如果继续维护这份审计文档，建议后续按以下口径写，避免再次混淆：

| 类别 | 应包含内容 |
|------|------------|
| 已验证事实 | 目录数、文件完整性、章节覆盖、JSON 语法、manifest 计数 |
| 已确认问题 | 可以直接从当前仓库基线推导出的违规或不一致 |
| 需补充说明 | 现有设计可成立，但解释不足、示例风格不统一 |
| 改进建议 | 事件示例、迁移说明、术语收敛、文档可读性优化 |

按这个口径，文档既能保留“审计”价值，也能避免把设计选择误写成错误。
