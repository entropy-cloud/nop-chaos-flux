# AMIS Component Baseline Matrix

## Purpose

这份文档是 `docs/amis-types/` 与 `docs/components/` 之间的长期对照总表。

它解决 4 件事：

1. 哪些 AMIS 组件在 Flux 中保留为正式 renderer / component owner doc
2. 哪些 AMIS 组件被改名、合并或由更高层架构承接
3. 哪些 AMIS 组件明确不进入当前 Flux 正式组件文档范围
4. 后续文档补齐和实现时，应该按什么波次推进

它也是 Plan 78 结束时必须交付的额外对齐文档：

- 按分组解释全部 retained 组件的作用定位
- 说明它们和 AMIS 组件的对应关系
- 说明保留、合并、替代、废弃的原因
- 说明文档/实现时的逐步推进顺序

这份文档不是 AMIS React 实现翻译，也不是最终 schema 细节说明。单组件契约仍以 `docs/components/<type>/design.md` 为准。

## Status Vocabulary

| Status | Meaning |
| --- | --- |
| `runtime` | 当前仓库已注册实现 |
| `targetContract` | 已有正式设计文档，但尚未注册实现 |
| `docPlanned` | 已决定保留，文档尚未补齐 |
| `fluxOnly` | Flux 特有组件，不来自 AMIS 对应 type |
| `notRetained` | 不保留为独立 Flux 正式组件 |

## Retention Rules

默认保留到 Flux 正式组件文档体系的 AMIS 组件，应满足至少一项：

- 高频业务价值高
- 能映射为稳定的 Flux 语义边界
- 不会因为保留而引入明显重复 type
- 不需要过重宿主依赖或平台私有 SDK 才能成立

默认不保留为独立正式组件的 AMIS type，通常属于：

- 历史别名或重复 type
- 已被 Flux 现有组件统一收敛
- 更适合由结构节点、owner 架构或组合模式承接
- 强宿主依赖、重外部 SDK、低通用价值
- 已被 `code-editor` / `condition-builder` / 组合字段体系替代

## Grouped Retained Components

### 1. Structural And Layout

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `fragment` | 无 UI 分组节点 | `fragment`-like grouping, 部分 `wrapper`/grouping 用法 | `runtime` | landed |
| `loop` | 重复结构节点 | `each` | `runtime` | landed |
| `recurse` | 递归结构节点 | 无直接单一 AMIS type，对树/递归模板做结构承接 | `runtime` | landed |
| `page` | 页面级壳层 | `page` | `runtime` | landed |
| `container` | 通用视觉容器 | `container`, 部分 `wrapper` / `panel` 语义 | `runtime` | landed |
| `flex` | 通用布局容器 | `flex`, 部分 `hbox` / `vbox` 语义 | `runtime` | landed |
| `separator` | 视觉分隔线 | `divider` | `targetContract` | wave 1 |
| `card` | 单卡片容器 | `card` | `targetContract` | wave 1 |
| `tabs` | 标签页交互容器 | `tabs` | `targetContract` | wave 1 |
| `wizard` | 多步骤流程容器 | `wizard` | `targetContract` | wave 2 |
| `dialog` | 模态表面 | `dialog` | `targetContract` | wave 1 |
| `drawer` | 抽屉表面 | `drawer` | `targetContract` | wave 1 |
| `collapse` | 折叠容器 | `collapse`, `collapse-group` | `docPlanned` | wave 3 |
| `grid` | 栅格布局容器 | `grid` | `docPlanned` | wave 3 |
| `steps` | 轻量步骤条展示 | `steps` | `docPlanned` | wave 4 |
| `timeline` | 时间线展示 | `timeline` | `docPlanned` | wave 4 |

### 2. Actions, Content, And Feedback

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `button` | 统一动作触发器 | `button`, `action`, `submit`, `reset` | `runtime` | landed |
| `button-group` | 动作分组容器 | `button-group` | `docPlanned` | wave 3 |
| `dropdown-button` | 菜单型动作按钮 | `dropdown-button` | `docPlanned` | wave 3 |
| `text` | 普通文本展示 | `text`, `plain`, 部分 `tpl` | `runtime` | landed |
| `markdown` | Markdown 内容展示 | 部分 `tpl` / markdown 场景 | `targetContract` | wave 1 |
| `html` | 受控 HTML 内容展示 | `html`, 部分 `tpl` | `targetContract` | wave 1 |
| `link` | 链接展示/跳转 | `link` | `targetContract` | wave 1 |
| `image` | 单图片展示 | `image`, `static-image` | `targetContract` | wave 1 |
| `icon` | 图标展示 | AMIS icon-capable content/action semantics | `runtime` | landed |
| `badge` | 状态徽标 | 部分 `status` / badge 场景 | `runtime` | landed |
| `progress` | 进度展示 | `progress` | `targetContract` | wave 1 |
| `spinner` | loading 指示 | `spinner` | `targetContract` | wave 1 |
| `empty` | 空态 | `placeholder` / no-result family | `targetContract` | wave 1 |
| `json-view` | JSON 展示 | JSON-oriented debug/content scenes | `targetContract` | wave 1 |
| `alert` | 内联反馈框 | `alert` | `docPlanned` | wave 2 |
| `mapping` | 映射展示 | `map`, `mapping` | `docPlanned` | wave 3 |
| `status` | 业务状态展示 | `status` | `docPlanned` | wave 3 |
| `audio` | 音频展示 | `audio` | `docPlanned` | wave 4 |
| `video` | 视频展示 | `video` | `docPlanned` | wave 4 |
| `carousel` | 轮播展示 | `carousel` | `docPlanned` | wave 4 |
| `qrcode` | 二维码展示 | `qrcode`, `qr-code` | `docPlanned` | wave 4 |

### 3. Data And Workflow

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `data-source` | 命名 source owner | `service` 中的非 UI 请求/装配语义、统一 API/source 模型 | `runtime` | landed |
| `reaction` | 声明式副作用 watcher | AMIS 局部联动 / visibility / action side-effect family | `runtime` | landed |
| `dynamic-renderer` | 运行时动态切换 renderer | AMIS schema switching / renderer indirection scenes | `runtime` | landed |
| `table` | 结构化数据表格 | `table`, 部分 `static-table` | `runtime` | landed |
| `crud` | 复合数据工作流 | `crud` | `targetContract` | wave 1 |
| `list` | 顺序集合展示 | `list`, `static-list` | `targetContract` | wave 1 |
| `cards` | 卡片集合展示 | `cards` | `docPlanned` | wave 2 |
| `pagination` | 独立分页交互组件 | `pagination` | `docPlanned` | wave 2 |
| `service` | 可视/局部数据装配容器 | `service` | `docPlanned` | wave 2 |
| `tree` | 层级展示组件 | tree display family | `runtime` | landed |
| `chart` | 图表展示 | `chart` | `runtime` | landed |

说明：

- `data-source` 不是对 `service` 的一比一重命名；它承接的是统一 producer owner 语义。
- 仍建议补一份 `service` owner doc，专门说明它和 `data-source` / `page` / `fragment` 的边界，而不是继续让这块空着。

### 4. Form Core

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `form` | 表单 owner | `form` | `runtime` | landed |
| `input-text` | 文本输入 | `input-text` | `runtime` | landed |
| `input-email` | 邮箱输入 | `input-email` | `runtime` | landed |
| `input-password` | 密码输入 | `input-password` | `runtime` | landed |
| `textarea` | 多行文本输入 | `textarea` | `runtime` | landed |
| `input-number` | 数字输入 | `input-number` | `docPlanned` | wave 2 |
| `select` | 选择输入 | `select`, 部分 `multi-select` | `runtime` | landed |
| `checkbox` | 单复选输入 | `checkbox` | `runtime` | landed |
| `radio-group` | 单选组 | `radio`, `radios` | `runtime` | landed |
| `checkbox-group` | 复选组 | `checkboxes` | `runtime` | landed |
| `switch` | 开关输入 | `switch` | `runtime` | landed |
| `input-tree` | 树形输入控件 | `input-tree` | `runtime` | landed |
| `tree-select` | 弹出树选择 | `tree-select` | `runtime` | landed |
| `tag-list` | 轻量标签集合字段 | tags/list-like field scenes | `runtime` | landed |
| `key-value` | 键值编辑字段 | KV/editor-like form scenes | `runtime` | landed |
| `array-editor` | 数组值编辑 | `input-array` | `runtime` | landed |

### 5. Form Advanced And Composite

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `condition-builder` | 条件表达式构建器 | `condition-builder` | `runtime` | landed |
| `code-editor` | 代码/公式/表达式编辑统一入口 | `editor`, `formula`, 部分 `json-schema-editor` / `input-formula` 场景 | `runtime` | landed |
| `combo` | 组合值字段容器 | `combo` | `docPlanned` | wave 4 |
| `picker` | 选择弹层字段 | `picker` | `docPlanned` | wave 4 |
| `transfer` | 双栏/树/表格转移选择 | `transfer` | `docPlanned` | wave 4 |
| `input-table` | 表格式对象数组字段 | `input-table` | `docPlanned` | wave 4 |
| `input-date` | 日期字段 | `input-date` | `docPlanned` | wave 2 |
| `input-datetime` | 日期时间字段 | `input-datetime` | `docPlanned` | wave 2 |
| `input-time` | 时间字段 | `input-time` | `docPlanned` | wave 2 |
| `date-range` | 范围日期字段 | `input-date-range`, `input-datetime-range`, `input-time-range` | `docPlanned` | wave 2 |
| `input-month` | 月份字段 | `input-month` | `docPlanned` | wave 3 |
| `input-quarter` | 季度字段 | `input-quarter` | `docPlanned` | wave 3 |
| `input-year` | 年份字段 | `input-year` | `docPlanned` | wave 3 |
| `input-file` | 文件上传字段 | `input-file` | `docPlanned` | wave 3 |
| `input-image` | 图片上传字段 | `input-image` | `docPlanned` | wave 3 |
| `editor` | 富文本编辑字段 | `input-rich-text` | `docPlanned` | wave 3 |

说明：

- 这里的 `editor` 指 rich-text editor，不是 code editor。
- `code-editor` 已承接表达式、代码、公式等文本型专业编辑能力，但不应吞并 rich-text WYSIWYG 场景。

### 6. Flux-Only Domain Components

| Flux component | Role | AMIS source | Status | Suggested wave |
| --- | --- | --- | --- | --- |
| `designer-page` | Flow Designer host renderer | none | `runtime` | landed |
| `designer-field` | Designer field renderer | none | `runtime` | landed |
| `designer-canvas` | Designer canvas bridge | none | `runtime` | landed |
| `designer-palette` | Designer palette renderer | none | `runtime` | landed |
| `designer-node-card` | Designer node card | none | `docPlanned` |
| `designer-edge-row` | Designer edge row | none | `docPlanned` |
| `report-inspector-shell` | Report inspector shell | none | `runtime` | landed |
| `report-inspector` | Report inspector | none | `runtime` | landed |
| `report-field-panel` | Report field panel | none | `runtime` | landed |
| `report-toolbar` | Report toolbar | none | `runtime` | landed |
| `report-designer-page` | Report Designer host | none | `runtime` | landed |
| `spreadsheet-page` | Spreadsheet host | none | `runtime` | landed |

## Suggested Documentation And Implementation Waves

### Wave 1

- `crud`
- `tabs`
- `dialog`
- `drawer`
- `separator`
- `card`
- `list`
- `image`
- `progress`
- `link`
- `markdown`
- `html`
- `json-view`
- `spinner`
- `empty`

目标：先补齐当前已经进入 `targetContract` 且最接近现有 runtime 装配能力的组件族。

### Wave 2

- `cards`
- `pagination`
- `service`
- `alert`
- `input-number`
- `input-date`
- `input-datetime`
- `input-time`
- `date-range`

目标：补齐高频通用缺口，使列表、查询、提示、基础表单族不再明显短板。

### Wave 3

- `collapse`
- `grid`
- `mapping`
- `status`
- `input-month`
- `input-quarter`
- `input-year`
- `input-file`
- `input-image`
- rich-text `editor`
- `button-group`
- `dropdown-button`

目标：补齐中高频通用组件与上传/内容编辑族。

### Wave 4

- `combo`
- `picker`
- `transfer`
- `input-table`
- `steps`
- `timeline`
- `audio`
- `video`
- `carousel`
- `qrcode`

目标：补齐 advanced form / media / lower-frequency workflow family。

## Not Retained As Standalone Flux Components

### 1. Duplicate Or Alias Types

| AMIS type | Why not retained | Flux replacement |
| --- | --- | --- |
| `action` | 与 `button` 重复 | `button` |
| `submit` | 与 `button` + action 语义重复 | `button` |
| `reset` | 与 `button` + action 语义重复 | `button` |
| `plain` | 文本别名 | `text` |
| `tpl` | 历史模板型入口过宽 | `text` / `markdown` / `html` |
| `static-image` | image alias | `image` |
| `static-images` | images alias | future image-collection or composition |
| `static-list` | list alias | `list` |
| `table2` | 新旧 table 双轨不应长期并存 | `table` |
| `crud2` | 新旧 crud 双轨不应长期并存 | `crud` |
| `qrcode` / `qr-code` 双名并存 | 只保留一个正式 type | `qrcode` |

### 2. Replaced By Flux Architecture Or Composition

| AMIS type | Why not retained | Flux replacement |
| --- | --- | --- |
| `each` | 结构展开已由无 UI 结构节点承接 | `loop` |
| `wrapper` | 仅是通用包裹语义，价值过低 | `container` / `fragment` |
| `panel` | 可由 `card` / `container` / `collapse` 组合表达 | composition |
| `hbox` / `vbox` | 布局语义已被 `flex` 收敛 | `flex` |
| `fieldset` | 更适合 field chrome / group composition | `form` + composition |
| `group` | 更适合 layout / field grouping composition | `container` / `flex` / `fragment` |
| `input-group` | 更适合 UI primitive projection 或 field composition | composition |
| `pagination-wrapper` | 属于组合容器，不应成为独立核心 type | `pagination` + collection renderer |
| `switch-container` | 条件分支可由 `when` / `dynamic-renderer` / structural nodes 承接 | composition |
| `subform` | Flux 已有 object/detail/composite field 路线 | object/detail field family |

### 3. Replaced By `code-editor` Or Related Flux Editors

| AMIS type | Why not retained | Flux replacement |
| --- | --- | --- |
| `formula` | 公式编辑不再单独保留 type | `code-editor` |
| `editor` 中的代码编辑语义 | 与 rich-text 语义不同，代码编辑已统一 | `code-editor` |
| `json-schema-editor` | 复杂文本/structured schema editing 优先收敛到 code-editor family 或未来 specialized designer | `code-editor` / future specialized editor |

说明：

- rich-text `input-rich-text` 不在这一类；它应保留为独立内容编辑家族。

### 4. Low-Value, Narrow, Or Heavy-Dependency Components

| AMIS type | Why not retained in current doc mandate | Note |
| --- | --- | --- |
| `location-picker` | 强地图 SDK 依赖，通用价值有限 | future optional integration |
| `input-city` | 强地区数据依赖，通用性弱 | future optional integration |
| `input-signature` | 外设/画板依赖较重，优先级较低 | future optional integration |
| `map` / `calendar` | 依赖和场景耦合较重，当前不是核心 DSL 优先项 | later optional family |
| `tasks` | 业务专用度高，不适合作为首批通用 renderer | maybe future domain renderer |
| `words` / `multiline-text` | 价值可由 `text` / `tag-list` / `collapse` 组合覆盖 | composition |
| `remark` / `tooltip-wrapper` | 更适合作为 metadata/decoration，而不是独立 renderer type | metadata / wrapper behavior |
| `nav` / `anchor-nav` / `portlet` | 与宿主导航和页面结构强耦合，当前不作为首批通用组件 owner 任务 | later navigation family |

## Maintenance Rule

后续新增或补齐组件文档时，先更新本文件，再补单组件 `design.md`。

如果只补单组件目录、不更新这份矩阵，就等于重新打开 `crud` 之前暴露过的流程缺口。
