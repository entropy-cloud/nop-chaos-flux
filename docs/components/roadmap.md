# Components Roadmap

## Purpose

本文档取代历史上的 `docs/component-list.md`，用于维护 Flux 组件的当前实现面、近期待补齐项和中长期候选项。

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
- `tag-list`
- `key-value`
- `array-editor`
- `condition-builder`
- `table`
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
- `tree`
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
- `tree-select`
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

### P2

- 在表单和数据展示主线稳定后，再评估时间日期、上传、多媒体和导航族组件。

## 迁移原则

- 不再维护 AMIS 风格的大而全组件枚举文档。
- 组件规划只保留在 `docs/components/` 目录下。
- 新组件一律先创建目录，再补 `design.md` 和 `example.json`。
- 批量验证示例时，使用 `docs/components/examples.manifest.json` 区分当前可运行示例与目标契约示例。
- 如果组件尚未实现，文档必须明确写出“目标契约”而不是伪装成已落地能力。