# Detail View 组件设计

## 1. 组件定位

- `detail-view` 是**独立详情编辑**复合字段：不绑定父表单字段，从 `scopePath` 或静态 `data` 读取数据，点击按钮打开 dialog/drawer 在 draft form 中编辑，确认后更新 scope 或 data。
- 与 `detail-field` 的区别：不需要 `name` 绑定父表单，验证为 `container` 级别，使用场景为页面级独立详情编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS 的 `dialog` + `data` 组合模式（独立详情编辑）。
- Flux 收敛为独立 `detail-view` type：值 owner = scope（`scopePath`）或静态 data；编辑态归内部 draft form。

## 3. Flux 中的 renderer/type 定义

- `type: 'detail-view'`
- `category: 'Form Advanced'`，`sourcePackage: '@nop-chaos/flux-renderers-form-advanced'`
- `scopePolicy: 'form'`；**无 `wrap`**（裸渲染，不挂 FieldFrame）
- 定义位置：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:601-627`

## 4. schema 设计

继承 `BaseSchema`（**非 BoundFieldSchemaBase**）：

```typescript
interface DetailViewSchema extends BaseSchema {
  type: 'detail-view';
  /** 只读摘要模板（region，可选） */
  viewer?: SchemaInput;
  /** 弹窗内编辑表单字段模板（region，必填） */
  content: SchemaInput;
  /** 数据读取路径（缺省回退 name） */
  scopePath?: string;
  /** 静态数据（优先于 form/scope 读取） */
  data?: SchemaObject;
  /** 弹窗配置：mode dialog|drawer、title、size、placement */
  surface?: DetailSurfaceConfig;
  /** 编辑触发按钮文案 */
  triggerLabel?: string;
  /** 只读模式 */
  readOnly?: boolean;
  /** 值进入编辑界面时的转换（raw → draft） */
  transformInAction?: ActionSchema | ActionSchema[];
  /** 自定义校验逻辑 */
  validateValueAction?: ActionSchema | ActionSchema[];
  /** 编辑确认时的转换（draft → committed） */
  transformOutAction?: ActionSchema | ActionSchema[];
}
```

## 5. 字段分类

- `viewer`、`content`: `region`
- `name`、`scopePath`、`data`、`triggerLabel`、`surface`、`readOnly`、`transformInAction`、`transformOutAction`、`validateValueAction`: `value`
- `label`: `value-or-region`（formFieldRules；无字段参与语义）

## 6. regions 与 slot 约定

- `viewer`：只读摘要（缺省回退当前值文本）。
- `content`：draft form 内的编辑字段模板。

## 7. 运行期状态归属

- `scopePath = schemaProps.scopePath ?? schemaProps.name`。
- 值读取优先级：schema 静态 `data` > `useCurrentFormState(getIn(values, scopePath))`（在 form 内）> `useScopeSelector(getIn(data, scopePath))`（scope-only）。
- 打开：`transformIn` → 创建 `detail-view-draft:*` form。
- 确认：`validateAll('submit')` → `validateValueAction` → `transformOut` → `buildCommittedWrites`（支持 `patch[]` / `updates{}` / `__value` / 普通对象形状）→ `applyCommittedWrites`（`parentForm.setValue/setValues` 或 `parentScope.merge/update`）→ `settleParentValidation`（scopePath 子树校验，失败回滚）→ `bumpViewerRevision()` 刷新 viewer → 关闭。
- 打开期间挂 `summary-gate` 子契约。

## 8. 事件、动作与组件句柄能力

- 无自定义事件、无组件句柄能力。
- 适配 action payload：transformIn `{ rawValue, readOnly }`；validateValue `{ workingValue, originalValue }`；transformOut `{ workingValue, originalValue, readOnly }`。

## 9. 数据源、表达式、导入能力接入点

- `data`（静态）/ `scopePath`（动态 scope 或 form values）双入口。
- 确认写回支持多路径 patch 形状（`patch[]`/`updates{}`），适配复杂提交面。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-detail-view` marker + `data-testid`/`data-cid`（裸渲染，无 FieldFrame）。
- 字段标签 `data-slot="field-label"`（复用 form 包 `FieldLabel`）。
- viewer 区 `data-slot="detail-view-viewer"`；触发按钮 `aria-label`/`aria-busy`。
- surface：`data-slot="detail-view-surface-body"`、`data-slot="detail-view-draft-body"`、`data-slot="detail-view-draft-error"`（`role="status"` + `aria-live="assertive"`）。

## 11. 实现拆分建议

- **渲染层**：`DetailViewRenderer` + 复用 `DetailSurface`（与 detail-field 共享）。
- **值适配**：复用 `value-adaptation-helper.ts`。
- **写回形状**：`buildCommittedWrites`（patch/updates/\_\_value 归一化）与 `applyCommittedWrites` 独立成模块，供 detail-field/宿主复用。

## 12. 风险、取舍与后续阶段

- 主要风险是与 `detail-field` 重复建模——surface/值适配/写回机制已共享。
- 无 FieldFrame：自身不参与字段校验 chrome，校验走 `container` 级别（create-owner + summary-gate）。
- 静态 data 优先于动态 scope 的优先级需保持冻结（测试已覆盖）。
