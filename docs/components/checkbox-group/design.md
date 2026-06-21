# Checkbox Group 组件设计

## 1. 组件定位

- `checkbox-group` 是离散多选集合字段控件。
- 它适合有限选项集合的多选编辑，不负责标签录入或树形多选。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已支持 `options`，并声明为 source-enabled field。
- 全选、分组、最大选择数等能力可作为后续增强，但仍围绕数组值输出。

### Flux 决策表

> Flux 决策主语。amis 仅作参考之一，**非标尺**。option 形状坚持 shadcn `{label,value}` 标准。Flux 按 `existing-components-improvement-analysis.md` §0.2 原则裁决，命名对齐 X3 基线（`docs/references/naming-conventions.md` §2/§3）。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                              | 采纳         | 不采纳     | 理由                                                                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 多选扁平 `options`（`{label,value}`）、数组值                     | **实现**     | —          | 当前基线；option 形状对齐 X3 §2/§4.3                                                                                                                                                                 |
| `options` source 加载态                                           | **实现**     | —          | 当前基线                                                                                                                                                                                             |
| group 级 `disabled`/`readOnly`/`required`                         | **实现**     | —          | 当前基线                                                                                                                                                                                             |
| `checkAll` + 半选 indeterminate                                   | **实现**     | —          | E2c：顶部全选 Checkbox，checked/indeterminate/unchecked 三态派生；全选只勾选非 disabled 可选 option；受 `maxSelected` 钳制（可选数 > 上限时全选只选到上限并显示 indeterminate）                      |
| `maxSelected`/`minSelected`                                       | **实现**     | —          | E2c：到达上限禁用未选项（已选项仍可取消释放配额）；下限即时阻止取消（已选数等于下限时不允许取消，与上限对称）；计数基于实际选中数组长度，不计 option.disabled 项                                     |
| per-option `disabled` + `disabledTip`                             | **实现**     | —          | E2c：修复「sanitizer 保留但 renderer 忽略」漂移 —— `option.disabled` 与 group 级 disabled 叠加锁项；`disabledTip` 通过 Label `title`（+ `data-disabled-tip`）原生 hover 提示，不响应 onCheckedChange |
| `columnsCount` 多列                                               | **暂不实现** | —          | 布局归 `flex`，场景窄                                                                                                                                                                                |
| `optionType: 'button'`（按钮式/分段）                             | **暂不实现** | —          | 后续按需                                                                                                                                                                                             |
| `menuTpl` 模板                                                    | **暂不实现** | —          | 受控 option region 未开放                                                                                                                                                                            |
| `creatable`/`addApi`、`editable`/`removable`                      | **暂不实现** | —          | 场景窄，后续按需                                                                                                                                                                                     |
| amis 值编码 `valueField`/`labelField`/`joinValues`/`extractValue` | —            | **不采纳** | 用 `{label,value}` 标准形状（X3 §3 值编码 amis 化）                                                                                                                                                  |
| amis 组件级 `api`                                                 | —            | **不采纳** | 请求下沉 data-source（X3 §1/§3）                                                                                                                                                                     |
| amis `mobileUI` 双实现                                            | —            | **不采纳** | 走响应式（见 mobile-roadmap，X3 §3）                                                                                                                                                                 |

## 3. Flux 中的 renderer/type 定义

- `type: 'checkbox-group'`
- `sourcePackage: '@nop-chaos/flux-renderers-form'`
- 当前 fields: `label` 为 `value-or-region`，`options` 为 `allowSource`

## 4. schema 设计

- 继承 `InputSchema` 并增加 `options`。
- E2c 新增：`checkAll?: boolean`（顶部全选项 + indeterminate）、`maxSelected?: number`、`minSelected?: number`（数量约束）。
- option 形状（`SelectOptionSchema`）新增 `disabledTip?: string`（disabled 时的 Tooltip 文案，可选增量）。
- `minSelected` 违反语义裁定为「即时阻止」：已选数等于下限时取消选中被禁用，与 `maxSelected` 的「到达上限禁用未选项」对称，提供即时反馈。

## 5. 字段分类

- `label`: `value-or-region`
- `options`: `value`，允许 source-enabled value
- `checkAll`: `prop`，`valueType:'boolean'`
- `maxSelected`/`minSelected`: `prop`（`SchemaFieldRule.valueType` 仅支持 `'boolean'`，number 字段无 valueType，值原样透传；renderer 内 `typeof === 'number' && >= 0` 守卫）

## 6. regions 与 slot 约定

- 与 `radio-group` 类似，不建议首版开放 option-level arbitrary schema。

## 7. 运行期状态归属

- 值是数组，归 form runtime 或 scope。
- UI 层只维护焦点等临时态。

## 8. 事件、动作与组件句柄能力

- 主要交互是 `onChange`。
- E2c 内建全选/清空句柄：`checkAll: true` 时顶部「Select All」Checkbox —— 点击（unchecked/indeterminate →）选中所有当前非 disabled 可选 option（受 `maxSelected` 钳制）；点击（checked →）清空所有可选 option 值。无需外部 action 组合。
- 选择约束：`maxSelected` 到达上限时未选项 disabled；`minSelected` 已选数等于下限时取消被阻止（即时反馈，对称）。

## 9. 数据源、表达式、导入能力接入点

- `options` 支持动态来源。
- 复杂依赖联动仍应由 loader 或 `data-source` 提供最终选项数组。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-checkbox-group` marker（`data-slot="checkbox-group-wrapper"`，`role="group"`）。
- 视觉层复用 `@nop-chaos/ui` Checkbox 与 field frame 组样式。
- E2c 新增 marker：
  - 全选项：`data-slot="checkbox-group-checkall"`（Checkbox）+ `checkbox-group-checkall-item`（Label）+ `checkbox-group-checkall-label`（span）。半选由 Checkbox `indeterminate`（DOM `data-indeterminate`）表达。
  - per-option disabled 提示：disabled 项 Label 的 `title`（原生 hover tooltip）+ `data-disabled-tip`（属性镜像，便于测试/选择器）。
  - source 态：`checkbox-group-loading` / `checkbox-group-error`（既有）。

## 11. 实现拆分建议

- 数组值映射、option 归一化和组级提示信息分离。
- E2c 后 `CheckboxGroupRenderer` 已从 `input-choice-renderers.tsx` 抽出到独立文件 `checkbox-group-renderer.tsx`（checkAll/max-min 约束/indeterminate 派生逻辑随 renderer 迁出，共享 `sanitizeChoiceOptions`/`getChoiceOptionKey`/`getSourceErrorMessage`/`ChoiceOption`/`checkboxGroupAdapter` 仍由 `input-choice-renderers.tsx` 导出）。

## 12. 风险、取舍与后续阶段

- 多选组件很容易演变成 `tag-list` 或树选择，需要严格维持"固定选项集合"的边界。
- E2c 裁定：`minSelected` 采用「即时阻止」（到达下限禁用取消），与 `maxSelected`「即时禁用未选项」对称，提供即时反馈；未采纳「允许低于下限但触发校验错误」。
- 全选与 `maxSelected` 极端组合（可选数 > 上限）：全选只选到 `maxSelected` 上限并据此显示 indeterminate（非全选 checked），归 watch-only residual（见 plan `Deferred But Adjudicated`）。
- `disabledTip` 用 Label `title` 原生 tooltip（而非 base-ui Tooltip overlay）：disabled 项 checkbox 不可 focus，base-ui Tooltip 在 jsdom 受 pointer/focus 触发限制；`title` 提供稳定可测的 hover 提示，后续如需富样式提示可升级到 Tooltip。
