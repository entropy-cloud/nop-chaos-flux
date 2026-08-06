# Statistics 组件设计

## 1. 组件定位

- `statistics` 是**数据统计展示**组件：显示一个总数（如分页/查询结果总条数），纯展示、无交互、无值写回。
- 常见用途：CRUD 工具栏内的结果计数块。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `statistics` 组件的简化形态（本组件仅支持 total 数字展示，无动画/精度/前后缀配置）。

## 3. Flux 中的 renderer/type 定义

- `type: 'statistics'`
- `category: 'data'`，`sourcePackage: '@nop-chaos/flux-renderers-data'`
- 无 `wrap`、无 validation、无事件、无 capability contracts
- 定义位置：`packages/flux-renderers-data/src/w2a-data-composition-definitions.ts:107-124`（并入 `data-renderer-definitions.ts:599`）

## 4. schema 设计

继承 `BaseSchema`：

```typescript
interface StatisticsSchema extends BaseSchema {
  type: 'statistics';
  /** 总条数（支持表达式，如 ${count}） */
  total?: number;
}
```

## 5. 字段分类

- `total`: `prop`（`propContracts.total`：`{ shape: { kind: 'number' }, editorType: 'expression' }`）

## 6. regions 与 slot 约定

- 无 region。

## 7. 运行期状态归属

- 无 owner 状态；`total` 为**编译期解析的表达式 prop**（如 `'${count}'` 经编译器对页面 scope data 求值，天然响应式——statistics-rendering.test.tsx:38-76 验证 data 变化后 `data-total` 更新）。
- 未提供/非法时回退 `0`。

## 8. 事件、动作与组件句柄能力

- 无事件、无组件句柄能力（纯展示）。

## 9. 数据源、表达式、导入能力接入点

- `total` 支持表达式绑定（CRUD 内由工具栏插槽 `header/footer-toolbar-statistics` 注入统计值，见 `crud-renderer-toolbar.tsx:88-92`）。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-statistics` marker（`cn('nop-statistics text-sm text-muted-foreground', props.meta.className)`）+ `data-testid`/`data-cid`。
- 输出 `data-slot="statistics-root"` + `data-total={total ?? 0}`。
- 文案经 `t('flux.pagination.total', { count: total ?? 0 })`（如 "Total 60" / "共 60 条"）。

## 11. 实现拆分建议

- 渲染器极薄（statistics-renderer.tsx 20 行）；保持现状，不抽 helper。
- i18n 文案复用 `flux.pagination.total` 键，不新增私有键。

## 12. 风险、取舍与后续阶段

- 与 `status`/`text` 展示组件的边界：`statistics` 承载**数值统计语义**（data-total 契约 + pagination 文案），`status` 承载状态语义、`text` 承载自由文本。
- AMIS 完整 `statistics`（动画/精度/前后缀）为后续增强候选，非当前契约承诺。
