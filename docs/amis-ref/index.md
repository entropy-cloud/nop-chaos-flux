# AMIS Component JSON Schema Reference

Split from unified `amis@6.13.0` schema (301 definitions).

## Overview

这是从 AMIS 6.13.0 统一 schema.json 拆分出来的组件级 JSON Schema 定义。

**设计目标**：
- 每个组件一个独立文件，方便查阅和验证
- 共享定义按功能分组，避免重复
- 通过 `$ref` 引用，保持文件精简

## File Structure

```
amis-ref/
├── index.md              # 本文件
│
├── ── 分组定义文件 (15 files, 147 definitions) ──
├── base.json             # 核心类型: SchemaObject, SchemaClassName, SchemaCollection...
├── schema-features.json  # Schema 特性: remark, copyable, popover, quickEdit...
├── api.json              # API 定义: SchemaApi, BaseApi...
├── actions.json          # 动作类型: AjaxAction, DialogAction, Button...
├── expressions.json      # 表达式: ExpressionSimple, ExpressionFormula...
├── events.json           # 事件/条件: ListenerAction, ConditionBuilder...
├── form-base.json        # 表单基础: FormSchemaBase, FormBaseControl...
├── options.json          # 选项: Option, DataProvider...
├── table-base.json       # 表格基础: BaseTableSchema, TableColumn...
├── cards-base.json       # 卡片/列表: BaseCardsSchema, ListBodyField...
├── crud-base.json        # CRUD: CRUDToolbarObject...
├── dialog-base.json      # 弹窗: DialogSchemaBase, DrawerSchemaBase...
├── grid-layout.json      # 布局: Grid, HBox...
├── collapse-base.json    # 折叠: BaseCollapseSchema, TabsMode...
├── misc.json             # 其他: Badge, Color, Spinner...
│
└── ── 组件文件 (152 files, 每个 1 definition) ──
    ├── form.json         # FormSchema → refs FormSchemaBase, ActionSchema
    ├── button.json       # ButtonSchema → refs ActionSchema
    ├── table.json        # TableSchema → refs BaseTableSchema, TableColumn
    └── ...
```

## Definition Groups

| File | # Defs | 说明 |
|------|--------|------|
| [base.json](base.json) | 19 | 核心类型，几乎所有组件都依赖 |
| [schema-features.json](schema-features.json) | 11 | 可复用的 schema 特性（备注、复制、弹出等） |
| [api.json](api.json) | 6 | API 配置类型 |
| [actions.json](actions.json) | 16 | 所有动作类型（按钮、AJAX、弹窗触发等） |
| [expressions.json](expressions.json) | 6 | 表达式类型 |
| [events.json](events.json) | 13 | 事件监听、条件构建器 |
| [form-base.json](form-base.json) | 24 | 表单控件基础类型 |
| [options.json](options.json) | 6 | 选项、数据源 |
| [table-base.json](table-base.json) | 6 | 表格列、行选择 |
| [cards-base.json](cards-base.json) | 6 | 卡片、列表字段 |
| [crud-base.json](crud-base.json) | 4 | CRUD 工具栏、过滤器 |
| [dialog-base.json](dialog-base.json) | 3 | 弹窗/抽屉基础 |
| [grid-layout.json](grid-layout.json) | 8 | Grid/HBox 布局 |
| [collapse-base.json](collapse-base.json) | 2 | 折叠面板、标签页模式 |
| [misc.json](misc.json) | 17 | 其他杂项 |

## How References Work

每个组件文件只包含自己的定义，共享定义通过 `$ref` 引用分组文件。

**引用关系示例**：

```
form.json
  ├── $ref: #/definitions/FormSchemaBase     → form-base.json
  ├── $ref: #/definitions/ActionSchema        → actions.json
  ├── $ref: #/definitions/SchemaCollection    → base.json
  └── $ref: #/definitions/BaseSchemaWithoutType → base.json
```

**为什么分组文件较大？**

`base.json` (5124 行) 和 `form-base.json` (3423 行) 较大，因为：
- `SchemaObject` 和 `SchemaObjectLoose` 是 AMIS 核心类型，用 `allOf` 组合了所有基础属性
- 这些是原子定义，不能再拆分
- 但这是共享的，所有组件文件都很小

**文件大小对比**：

| 文件 | 旧方案 (内联) | 新方案 (引用) |
|------|--------------|--------------|
| form.json | 33,816 行 | **114 行** |
| button.json | 33,817 行 | **~50 行** |
| 每个组件 | 30,000+ 行 | **~100 行** |

## Usage

### Python 验证示例

```python
import json
import jsonschema

def load_schema(component_name):
    """加载组件 schema（合并所有 definitions）"""
    # 1. 加载所有分组定义
    all_defs = {}
    groups = [
        "base", "schema-features", "api", "actions", "expressions",
        "events", "form-base", "options", "table-base", "cards-base",
        "crud-base", "dialog-base", "grid-layout", "collapse-base", "misc"
    ]
    for g in groups:
        with open(f"{g}.json", encoding="utf-8") as f:
            all_defs.update(json.load(f)["definitions"])
    
    # 2. 加载组件定义
    with open(f"{component_name}.json", encoding="utf-8") as f:
        comp = json.load(f)
    all_defs.update(comp["definitions"])
    
    # 3. 返回完整 schema
    return {
        "$schema": comp["$schema"],
        "$ref": comp["$ref"],
        "definitions": all_defs
    }

# 验证表单配置
form_schema = load_schema("form")
form_config = {
    "type": "form",
    "body": [
        {"type": "input-text", "name": "name", "label": "姓名"}
    ]
}
jsonschema.validate(form_config, form_schema)
```

### 查找组件定义

1. 在下方组件表查找名称
2. 打开对应 `.json` 文件
3. 文件内的 `$ref` 指向主定义
4. 主定义的 `$ref` 会引用分组文件中的共享定义

## Components

### Layout & Container

| Component | File | Type |
|-----------|------|------|
| PageSchema | [page.json](page.json) | `page` |
| FlexSchema | [flex.json](flex.json) | `flex` |
| GridSchema | [grid.json](grid.json) | `grid` |
| HBoxSchema | [h-box.json](h-box.json) | `h-box` |
| VBoxSchema | [v-box.json](v-box.json) | `v-box` |
| ContainerSchema | [container.json](container.json) | `container` |
| PanelSchema | [panel.json](panel.json) | `panel` |
| WrapperSchema | [wrapper.json](wrapper.json) | `wrapper` |
| TabsSchema | [tabs.json](tabs.json) | `tabs` |
| CollapseSchema | [collapse.json](collapse.json) | `collapse` |
| CollapseGroupSchema | [collapse-group.json](collapse-group.json) | `collapse-group` |
| AnchorNavSchema | [anchor-nav.json](anchor-nav.json) | `anchor-nav` |
| StepsSchema | [steps.json](steps.json) | `steps` |
| TimelineSchema | [timeline.json](timeline.json) | `timeline` |
| PortletSchema | [portlet.json](portlet.json) | `portlet` |
| DividerSchema | [divider.json](divider.json) | `divider` |
| EachSchema | [each.json](each.json) | `each` |

### Form

| Component | File | Type |
|-----------|------|------|
| FormSchema | [form.json](form.json) | `form` |
| TextControlSchema | [text-control.json](text-control.json) | `input-text` |
| NumberControlSchema | [number-control.json](number-control.json) | `input-number` |
| SelectControlSchema | [select-control.json](select-control.json) | `select` |
| CheckboxControlSchema | [checkbox-control.json](checkbox-control.json) | `checkbox` |
| CheckboxesControlSchema | [checkboxes-control.json](checkboxes-control.json) | `checkboxes` |
| RadioControlSchema | [radio-control.json](radio-control.json) | `radio` |
| RadiosControlSchema | [radios-control.json](radios-control.json) | `radios` |
| DateControlSchema | [date-control.json](date-control.json) | `input-date` |
| DateTimeControlSchema | [date-time-control.json](date-time-control.json) | `input-datetime` |
| TimeControlSchema | [time-control.json](time-control.json) | `input-time` |
| DateRangeControlSchema | [date-range-control.json](date-range-control.json) | `input-date-range` |
| FileControlSchema | [file-control.json](file-control.json) | `input-file` |
| ImageControlSchema | [image-control.json](image-control.json) | `input-image` |
| ComboControlSchema | [combo-control.json](combo-control.json) | `combo` |
| TableControlSchema | [table-control.json](table-control.json) | `input-table` |
| TransferControlSchema | [transfer-control.json](transfer-control.json) | `transfer` |
| TreeControlSchema | [tree-control.json](tree-control.json) | `input-tree` |
| TreeSelectControlSchema | [tree-select-control.json](tree-select-control.json) | `tree-select` |
| SwitchControlSchema | [switch-control.json](switch-control.json) | `switch` |
| TextareaControlSchema | [textarea-control.json](textarea-control.json) | `textarea` |
| RichTextControlSchema | [rich-text-control.json](rich-text-control.json) | `input-rich-text` |
| EditorControlSchema | [editor-control.json](editor-control.json) | `editor` |
| HiddenControlSchema | [hidden-control.json](hidden-control.json) | `hidden` |

### Data Display

| Component | File | Type |
|-----------|------|------|
| TableSchema | [table.json](table.json) | `table` |
| CRUDSchema | [crud.json](crud.json) | `crud` |
| CRUD2Schema | [crud2.json](crud2.json) | `crud2` |
| ListSchema | [list.json](list.json) | `list` |
| CardsSchema | [cards.json](cards.json) | `cards` |
| CardSchema | [card.json](card.json) | `card` |
| JsonSchema | [json.json](json.json) | `json` |
| MappingSchema | [mapping.json](mapping.json) | `mapping` |
| ProgressSchema | [progress.json](progress.json) | `progress` |
| StatusSchema | [status.json](status.json) | `status` |
| TagSchema | [tag.json](tag.json) | `tag` |
| AvatarSchema | [avatar.json](avatar.json) | `avatar` |
| ImageSchema | [image.json](image.json) | `image` |
| ImagesSchema | [images.json](images.json) | `images` |
| ColorSchema | [color.json](color.json) | `color` |
| QRCodeSchema | [qr-code.json](qr-code.json) | `qrcode` |

### Actions

| Component | File | Type |
|-----------|------|------|
| ButtonSchema | [button.json](button.json) | `button` |
| ButtonGroupSchema | [button-group.json](button-group.json) | `button-group` |
| ButtonToolbarSchema | [button-toolbar.json](button-toolbar.json) | `button-toolbar` |
| DropdownButtonSchema | [dropdown-button.json](dropdown-button.json) | `dropdown-button` |

### Navigation

| Component | File | Type |
|-----------|------|------|
| NavSchema | [nav.json](nav.json) | `nav` |
| PaginationSchema | [pagination.json](pagination.json) | `pagination` |
| PaginationWrapperSchema | [pagination-wrapper.json](pagination-wrapper.json) | `pagination-wrapper` |

### Media

| Component | File | Type |
|-----------|------|------|
| AudioSchema | [audio.json](audio.json) | `audio` |
| VideoSchema | [video.json](video.json) | `video` |
| ChartSchema | [chart.json](chart.json) | `chart` |
| CarouselSchema | [carousel.json](carousel.json) | `carousel` |
| CalendarSchema | [calendar.json](calendar.json) | `calendar` |

### Feedback

| Component | File | Type |
|-----------|------|------|
| DialogSchema | [dialog.json](dialog.json) | `dialog` |
| DrawerSchema | [drawer.json](drawer.json) | `drawer` |
| AlertSchema | [alert.json](alert.json) | `alert` |
| SpinnerSchema | [spinner.json](spinner.json) | `spinner` |
| TooltipWrapperSchema | [tooltip-wrapper.json](tooltip-wrapper.json) | `tooltip-wrapper` |
| RemarkSchema | [remark.json](remark.json) | `remark` |

### Other

| Component | File | Type |
|-----------|------|------|
| WizardSchema | [wizard.json](wizard.json) | `wizard` |
| ServiceSchema | [service.json](service.json) | `service` |
| LinkSchema | [link.json](link.json) | `link` |
| PlainSchema | [plain.json](plain.json) | `plain` |
| SearchBoxSchema | [search-box.json](search-box.json) | `search-box` |
| SliderSchema | [slider.json](slider.json) | `slider` |

### Form Controls (continued)

| Component | File | Type |
|-----------|------|------|
| PickerControlSchema | [picker-control.json](picker-control.json) | `picker` |
| NestedSelectControlSchema | [nested-select-control.json](nested-select-control.json) | `nested-select` |
| ChainedSelectControlSchema | [chained-select-control.json](chained-select-control.json) | `chained-select` |
| MatrixControlSchema | [matrix-control.json](matrix-control.json) | `matrix-checkboxes` |
| LocationControlSchema | [location-control.json](location-control.json) | `location-picker` |
| IconPickerControlSchema | [icon-picker-control.json](icon-picker-control.json) | `icon-picker` |
| InputCityControlSchema | [input-city-control.json](input-city-control.json) | `input-city` |
| InputColorControlSchema | [input-color-control.json](input-color-control.json) | `input-color` |
| InputSignatureSchema | [input-signature.json](input-signature.json) | `input-signature` |
| UUIDControlSchema | [uuid-control.json](uuid-control.json) | `uuid` |

---

*Generated from amis@6.13.0 • 152 components • 147 grouped definitions*
