# Components Roadmap

## Purpose

本文档取代历史上的 `docs/component-list.md`，用于维护 Flux 组件的当前实现面、近期待补齐项和中长期候选项。

重要边界说明：

- 它当前是 Flux 组件规划文档，不是 `docs/amis-types/` 的完整覆盖矩阵。
- 因此它不能单独作为“AMIS 组件能力已经系统过表”的证明。
- 如果要判断某个 AMIS 组件是否已被 Flux 文档正式承接，必须同时核对 `docs/amis-types/`、`docs/components/`、以及后续应补齐的 baseline 映射矩阵。

它不是 AMIS 全量组件镜像，也不是逐字段能力说明。具体契约请看：

- `docs/components/index.md`
- `docs/components/examples.manifest.json`
- `docs/components/<type>/design.md`
- `docs/components/<type>/example.json`

## 状态分层

### 1. 当前代码已注册的通用 renderer

- `page`
- `container`
- `flex`
- `text`
- `button`
- `icon`
- `badge`
- `dynamic-renderer`
- `reaction`
- `form`
- `input-text`
- `input-email`
- `input-password`
- `textarea`
- `select`
- `checkbox`
- `switch`
- `radio-group`
- `checkbox-group`
- `input-tree`
- `tree-select`
- `tag-list`
- `key-value`
- `array-editor`
- `condition-builder`
- `table`
- `tree`
- `data-source`
- `chart`

### 2. 当前仓库已注册的领域 renderer

这里的“已注册”指对应 package 已提供 renderer definition；具体宿主是否启用这些 renderer，还取决于宿主 registry 装配情况。

- `designer-page`
- `designer-field`
- `designer-canvas`
- `designer-palette`
- `report-inspector-shell`
- `report-inspector`
- `report-field-panel`
- `report-designer-page`
- `report-toolbar`
- `spreadsheet-page`

### 3. 已文档化但尚未实现的高优先级通用 renderer

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

### 4. schema 已声明但尚未注册的领域 renderer

- `designer-node-card`
- `designer-edge-row`

### 5. 中长期候选项

- `grid`
- `collapse`
- `steps`
- `wizard`
- `timeline`
- `dropdown-button`
- `button-group`
- `pagination`
- `video`
- `audio`
- `qrcode`
- `datepicker`
- `date-range-picker`
- `time-picker`
- `upload`
- `editor`
- `transfer`
- `cascader`
- `input-tag`
- `input-color`
- `input-file`
- `input-image`
- `input-excel`

## 优先级建议

### P0

- 巩固当前已注册 renderer 的 schema、field metadata、example.json 和回归验证。
- 让 `docs/components/<type>/design.md` 与实际 renderer definition 持续保持一致。

### P1

- 实现并验证当前已文档化但尚未实现的高优先级通用 renderer，优先顺序建议：`tabs`、`dialog`、`drawer`、`list`、`card`、`link`、`empty`、`json-view`。
- `crud` 是高优先级复合数据 renderer，应在 `table`、`form`、`dialog`、`data-source` 的 owner 边界稳定后优先补齐；实现方式应走组合/编译 lowering，而不是回到单体巨型 JSX 组件。
- 结合 2026-04-12 的 AMIS 差集复核，`cards`、`pagination`、`service`、`alert`、`input-number`、日期时间族、`input-file` / `input-image`、`editor` / rich-text 也属于当前文档覆盖面里的重要缺口，不应继续默认视为“长尾再说”。

树相关边界已经稳定并落地首版：`tree` 是通用 UI renderer，`input-tree` / `tree-select` 是 form field family，`loop + recurse` 是结构层。

### P2

- 在表单和数据展示主线稳定后，再评估时间日期、上传、多媒体和导航族组件。

树相关组件建议一起看边界：`tree` 是通用 UI，`input-tree` / `tree-select` 是 form field family，`loop + recurse` 是结构层。

## 迁移原则

- 不再维护 AMIS 风格的大而全组件枚举文档。
- 组件规划只保留在 `docs/components/` 目录下。
- 新组件一律先创建目录，再补 `design.md` 和 `example.json`。
- 批量验证示例时，使用 `docs/components/examples.manifest.json` 区分当前可运行示例与目标契约示例。
- 如果组件尚未实现，文档必须明确写出“目标契约”而不是伪装成已落地能力。
