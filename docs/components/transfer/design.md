# Transfer 组件设计

## 1. 组件定位

- `transfer` 是双栏或双区转移选择字段 renderer。
- 它承接“候选集 <-> 已选集”语义，不替代普通 `select` 或 `checkbox-group`。
- **边界裁定（W4c 收敛）**：transfer 承接“候选集 ↔ 已选集”双栏穿梭语义（一次性多选 + 可见候选全量），`select`/`tree-select` 是单弹层下拉选择。transfer 复用 `select` 的 options 归一化思路，但 select 用固定 `{label,value}` 形态、**无 valueKey/labelKey**（`schemas.ts:39`），故 transfer 在 form-advanced 内新建最小 valueKey/labelKey 归一化 helper（`option-normalize.ts`，候选项→统一 `{label,value}`），渲染为左右双栏 + 穿梭按钮，不复制 select 的下拉协议。`options` 可由表达式/source value 提供（请求下沉：不声明挂载期 source 字段）。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `transfer`。
- Flux 正式契约应聚焦值模型、候选项来源、已选项呈现与移动动作，不复制历史展示 mode 细节为第一优先级。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'transfer'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威；本节早期写作 `flux-renderers-form` 为 drift，W4c 收敛）。随 `registerFormAdvancedRenderers` 注册。

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`options`、`multiple`、`valueKey`、`labelKey`、`searchable`、`searchPlaceholder`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`options`、`multiple`、`valueKey`、`labelKey`、`searchable`、`searchPlaceholder`、`required`: `value`
- `onAdd`、`onRemove`、`onChange`: `event`

## 6. regions 与 slot 约定

- 首版不要求开放自由 regions。

## 7. 运行期状态归属

- 选中值归最近表单或 owner scope。
- 左右栏搜索与临时高亮属于组件内部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`。

## 9. 数据源、表达式、导入能力接入点

- `options` 可由表达式或 source-enabled value 提供。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-transfer` marker；左右栏分别输出 `nop-transfer__candidate` / `nop-transfer__selected` marker。

## 11. 实现拆分建议

- options 归一化（valueKey/labelKey helper）、双栏状态桥接、值写回分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `select`、`tree-select` 的能力边界再次重叠——已通过新建 valueKey/labelKey 归一化 helper + 双栏穿梭语义（非下拉协议）收敛，边界见 §1。大量数据虚拟滚动为首版 Non-Goal。
