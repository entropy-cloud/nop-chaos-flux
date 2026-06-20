# Checkbox Group 组件设计

## 1. 组件定位

- `checkbox-group` 是离散多选集合字段控件。
- 它适合有限选项集合的多选编辑，不负责标签录入或树形多选。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `options`，并声明为 source-enabled field。
- 全选、分组、最大选择数等能力可作为后续增强，但仍围绕数组值输出。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。option 形状坚持 shadcn `{label,value}` 标准。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决，命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                              | 采纳                | 不采纳     | 理由                                                |
| ----------------------------------------------------------------- | ------------------- | ---------- | --------------------------------------------------- |
| 多选扁平 `options`（`{label,value}`）、数组值                     | **实现**            | —          | 当前基线；option 形状对齐 X3 §2/§4.3                |
| `options` source 加载态                                           | **实现**            | —          | 当前基线                                            |
| group 级 `disabled`/`readOnly`/`required`                         | **实现**            | —          | 当前基线                                            |
| `checkAll` + 半选 indeterminate                                   | **计划实现（E2c）** | —          | 真实高频需求                                        |
| `maxSelected`/`minSelected`                                       | **计划实现（E2c）** | —          | design §4 已提及，补 schema field                   |
| per-option `disabled` + `disabledTip`                             | **计划实现（E2c）** | —          | 常见表单需求                                        |
| `columnsCount` 多列                                               | **暂不实现**        | —          | 布局归 `flex`，场景窄                               |
| `optionType: 'button'`（按钮式/分段）                             | **暂不实现**        | —          | 后续按需                                            |
| `menuTpl` 模板                                                    | **暂不实现**        | —          | 受控 option region 未开放                           |
| `creatable`/`addApi`、`editable`/`removable`                      | **暂不实现**        | —          | 场景窄，后续按需                                    |
| amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue` | —                   | **不采纳** | 用 `{label,value}` 标准形状（X3 §3 值编码 amis 化） |
| amis 组件级 `api`                                                 | —                   | **不采纳** | 请求下沉 data-source（X3 §1/§3）                    |
| amis `mobileUI` 双实现                                            | —                   | **不采纳** | 走响应式（见 mobile-roadmap，X3 §3）                |

## 3. Flux 中的 renderer/type 定义

- `type: 'checkbox-group'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `allowSource`

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- 建议后续补充 `inline`、`maxSelected`、`minSelected` 等字段。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value

## 6. regions 与 slot 约定

- 与 `radio-group` 类似，不建议首版开放 option-level arbitrary schema。

## 7. 运行期状态归属

- 值是数组，归 form runtime 或 scope。
- UI 层只维护焦点等临时态。

## 8. 事件、动作与组件句柄能力

- 主要交互是 `onChange`。
- 如需全选、清空选择，可通过统一 field handle 或外部 action 组合实现。

## 9. 数据源、表达式、导入能力接入点

- `options` 支持动态来源。
- 复杂依赖联动仍应由 loader 或 `data-source` 提供最终选项数组。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-checkbox-group` marker。
- 视觉层复用 `@nop-chaos/ui` Checkbox 与 field frame 组样式。

## 11. 实现拆分建议

- 数组值映射、option 归一化和组级提示信息分离。

## 12. 风险、取舍与后续阶段

- 多选组件很容易演变成 `tag-list` 或树选择，需要严格维持“固定选项集合”的边界。
