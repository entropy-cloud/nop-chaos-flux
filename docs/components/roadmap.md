# Components Roadmap

## Purpose

本文档取代历史上的 `docs/component-list.md`，用于维护 Flux 组件的当前实现面、近期待补齐项和中长期候选项。

重要边界说明：

- 它当前是 Flux 组件规划文档，不是 `docs/amis-types/` 的完整覆盖矩阵。
- 因此它不能单独作为“AMIS 组件能力已经系统过表”的证明。
- 如果要判断某个 AMIS 组件是否已被 Flux 文档正式承接，必须同时核对 `docs/amis-types/`、`docs/components/`、以及 `docs/components/amis-baseline-matrix.md`。

它不是 AMIS 全量组件镜像，也不是逐字段能力说明。具体契约请看：

- `docs/components/index.md`
- `docs/components/examples.manifest.json`
- `docs/components/<type>/design.md`
- `docs/components/<type>/example.json`

## 状态分层

### 1. 当前代码已注册的通用 renderer

- `fragment`
- `loop`
- `recurse`
- `page`
- `container`
- `flex`
- `text`
- `button`
- `icon`
- `badge`
- `dynamic-renderer`
- `reaction`
- `dialog`
- `drawer`
- `tabs`
- `form`
- `code-editor`
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

### 3. 已文档化且当前尚未实现的 retained renderer

- `alert`
- `audio`
- `button-group`
- `card`
- `cards`
- `carousel`
- `collapse`
- `combo`
- `crud`
- `date-range`
- `dropdown-button`
- `editor`
- `separator`
- `grid`
- `list`
- `image`
- `input-date`
- `input-datetime`
- `input-file`
- `input-image`
- `input-month`
- `input-number`
- `input-quarter`
- `input-table`
- `input-time`
- `input-year`
- `progress`
- `link`
- `mapping`
- `markdown`
- `html`
- `json-view`
- `pagination`
- `picker`
- `qrcode`
- `service`
- `spinner`
- `empty`
- `status`
- `steps`
- `timeline`
- `transfer`
- `video`
- `wizard`

### 4. schema 已声明但尚未注册的领域 renderer

- `designer-node-card`
- `designer-edge-row`

### 5. 非 retained baseline 的可选后续项

- `slider` / future `input-slider`
- `rating`
- `avatar`
- `input-color`
- `icon-picker`
- `location-picker`
- `input-city`
- `input-signature`
- `calendar`
- `nav`
- `anchor-nav`
- `portlet`
- `iframe`

## 优先级建议

### P0

- 巩固当前已注册 renderer 的 schema、field metadata、example.json 和回归验证。
- 让 `docs/components/<type>/design.md` 与实际 renderer definition 持续保持一致。

### P1

- 继续实现并验证当前已文档化但尚未实现的 retained renderer，优先顺序建议：`list`、`card`、`link`、`empty`、`json-view`、`pagination`、`service`、`input-number`、日期时间 family。
- `crud` 是高优先级复合数据 renderer，应在 `table`、`form`、`dialog`、`data-source` 的 owner 边界稳定后优先补齐；实现方式应走组合/编译 lowering，而不是回到单体巨型 JSX 组件。
- Plan 78 已完成 retained family 的 owner-doc 覆盖，后续优先级应转向 retained renderer 的 runtime 实现与验证，而不是再把 retained doc 缺口重新留回候选区。

树相关边界已经稳定并落地首版：`tree` 是通用 UI renderer，`input-tree` / `tree-select` 是 form field family，`loop + recurse` 是结构层。

### P2

- 在表单和数据展示主线稳定后，再推进上传、多媒体、advanced form 与轻交互布局族的实现。

- `grid`、`collapse`、`button-group`、`dropdown-button`、`input-file`、`input-image`、`editor`、`transfer`、`combo`、`input-table`、`audio`、`video`、`carousel`、`qrcode` 已经进入 retained owner-doc 基线，但实现优先级仍低于 P1 主线。

树相关组件建议一起看边界：`tree` 是通用 UI，`input-tree` / `tree-select` 是 form field family，`loop + recurse` 是结构层。

## 迁移原则

- 不再维护 AMIS 风格的大而全组件枚举文档。
- 组件规划只保留在 `docs/components/` 目录下。
- 新组件一律先创建目录，再补 `design.md` 和 `example.json`。
- 批量验证示例时，使用 `docs/components/examples.manifest.json` 区分当前可运行示例与目标契约示例。
- 如果组件尚未实现，文档必须明确写出“目标契约”而不是伪装成已落地能力。
