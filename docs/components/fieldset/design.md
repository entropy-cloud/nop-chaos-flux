# FieldSet 组件设计

## 1. 组件定位

- `fieldset` 是表单分组容器 renderer，用来将多个表单字段组织在一个带标题的区域内。
- 它是独立的容器组件，不使用 FieldFrame，不嵌入 FieldFrame 的 label/error/hint 逻辑。
- 它渲染 `<fieldset>/<legend>` 结构，可选支持折叠/展开。
- 它不是通用内容壳层；非表单内容分组应优先使用 `container`。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `FieldSet` renderer（upstream `FieldSet.tsx` implementation）。
- AMIS 的 FieldSet 委托给 `Collapse` 组件渲染，用 `wrapperComponent="fieldset"` 和 `headingComponent="legend"` 控制 DOM。
- Flux 的 `fieldset` 应同样复用折叠逻辑，但保持为独立 type，不混入 FieldFrame 或 collapse 的通用交互。
- 当前 collapsible baseline 已收敛到 `@nop-chaos/ui` `Collapsible` primitive；`fieldset` 通过 `CollapsibleTrigger` / `CollapsibleContent` 承载 disclosure 契约，但仍保留 `<legend>` 作为标题 host，而不是把分组标题降级为普通按钮容器。

## 3. Flux 中的 renderer/type 定义

- `type: 'fieldset'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 不是 FieldFrame 变体，不参与 `wrap` / `frameWrap` 机制
- 不创建自己的 scope，子字段继承外层 form scope

## 4. schema 设计

```ts
interface FieldsetSchema extends BaseSchema {
  type: 'fieldset';
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  body: SchemaCollection;
}
```

| 字段          | 类型               | 默认值  | 说明                        | 对应 AMIS              |
| ------------- | ------------------ | ------- | --------------------------- | ---------------------- |
| `title`       | `string?`          | —       | 分组标题，渲染为 `<legend>` | `FieldSet.title`       |
| `collapsible` | `boolean?`         | `false` | 是否可折叠                  | `FieldSet.collapsable` |
| `collapsed`   | `boolean?`         | `false` | 初始折叠状态                | `FieldSet.collapsed`   |
| `body`        | `SchemaCollection` | —       | 子字段区域                  | `FieldSet.body`        |

fieldset 不传播 mode/labelAlign/labelWidth。AMIS 的 `subFormMode` / `subFormHorizontal` 在 Flux 中不需要，因为布局配置只有两级（form 全局 + 字段 FieldFrame 覆盖），fieldset 作为中间容器只需透传 context。

## 5. 字段分类

- `title`、`collapsible`、`collapsed`: `value`
- `body`: `region`

## 6. regions 与 slot 约定

- `body` 承接子字段区域，每个子字段各自拥有自己的 FieldFrame（通过 renderer 的 `wrap: true`）。

## 7. 运行期状态归属

- `fieldset` 不创建 scope，不持有表单数据。
- 折叠/展开状态是 `fieldset` 自身的 UI 交互状态。
- 当 `collapsible: true` 时，折叠状态由组件内部管理；外部可通过 `collapsed` 设置初始值。
- `collapsible: true` 时，受控/非受控 disclosure 语义、`aria-expanded`、`aria-controls` 与键盘切换行为由共享 `Collapsible` primitive 提供，`fieldset` 只保留组装与样式职责。
- 子字段的验证状态归外层 `FormRuntime`，不归 `fieldset`。

## 8. 事件、动作与组件句柄能力

- 无专用事件。折叠/展开是 UI 交互，不暴露为 action。
- 未来可扩展 `component:expand` / `component:collapse` 句柄。

## 9. 样式与 DOM marker 约定

```
<fieldset class="nop-fieldset [className]">
  <legend data-slot="fieldset-title">{title}</legend>
  <div
    id="{cid}-body"             <!-- collapsible 时 -->
    data-slot="fieldset-body"
  >
    ...子字段
  </div>
</fieldset>
```

- 根节点 marker: `nop-fieldset`
- `data-slot="fieldset-title"`: 标题区域
- `data-slot="fieldset-body"`: 子字段内容区域
- 当 `collapsible: true` 时，body 区域可折叠，根节点添加 `data-collapsible` 和 `data-collapsed` 属性
- collapsible fieldset 使用 `@nop-chaos/ui` `Collapsible` primitive，标题 host 仍是 `<legend>`，并通过 primitive 注入 `role="button"`、`tabindex="0"`、`aria-expanded`、`aria-controls` 与键盘切换行为
- 视觉样式（边框、间距、标题样式）由 schema `className` 和 host CSS 控制，不在 renderer 中硬编码

## 10. 布局配置

fieldset 不涉及布局配置。`mode`/`labelAlign`/`labelWidth` 通过 React context 从 form 直接传到 FieldFrame，fieldset 作为中间层无需感知。

## 11. 与其他组件的关系

| 组件         | 职责                                          | 与 fieldset 的区别                                                       |
| ------------ | --------------------------------------------- | ------------------------------------------------------------------------ |
| `FieldFrame` | 单字段 chrome（label/error/hint/description） | fieldset 不负责单字段包装                                                |
| `flex`       | 多字段行布局                                  | fieldset 不负责行布局，但 body 内可以嵌套 flex                           |
| `collapse`   | 通用折叠容器                                  | fieldset 专注表单分组，固定 `<fieldset>/<legend>` 结构，可传播 form mode |
| `container`  | 通用视觉容器                                  | container 不传播 form mode，不使用 `<fieldset>` 语义                     |

补充选型规则：

- 需要表单字段分组，用 `fieldset`。
- 需要普通说明区、摘要区、卡片样 section，用 `container`。
- 需要行布局或栅格替代时，在 `fieldset.body` 内嵌 `flex` 或其他布局 renderer，而不是让 `fieldset` 自己承担布局原语角色。

## 12. 风险、取舍与后续阶段

- 需要避免把折叠逻辑耦合到 form runtime。
- `fieldset` 已按当前 live runtime 收入口径矩阵；后续重点是保持 matrix、manifest 与实现同步，避免再次漂移。
