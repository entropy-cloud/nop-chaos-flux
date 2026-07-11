# Transfer 组件设计

## 1. 组件定位

- `transfer` 是双栏穿梭选择字段 renderer。
- 承接"候选集 ↔ 已选集"双栏穿梭语义（一次性多选 + 可见候选全量），不替代普通 `select` 或 `checkbox-group`。
- 复用 `select` 的 options 归一化思路（`option-normalize.ts`，候选项 → 统一 `{label,value}`），渲染为左右双栏 + 穿梭按钮，不复制 select 的下拉协议。

## 2. 与 AMIS 能力对照

| 能力              | AMIS transfer                          | Flux 当前              | 优先级 |
| ----------------- | -------------------------------------- | ---------------------- | ------ |
| 双栏穿梭          | ✅                                     | ✅                     | —      |
| valueKey/labelKey | ✅                                     | ✅                     | —      |
| searchable 过滤   | ✅ 本地 + 异步 `onSearch`              | ✅ 本地                | —      |
| checkAll 全选     | ✅ 左侧标题栏 Checkbox + `toggleAll()` | ❌                     | P1     |
| clearAll 清空     | ✅ 右侧标题栏 "Clear" 链接             | ❌                     | P1     |
| statistics 统计   | ✅ `(available/total)`                 | ❌ 仅 `options.length` | P1     |
| selectMode        | ✅ list/table/tree/chained/associated  | ❌ 仅 list             | P2     |
| 级联选中          | ✅ `autoCheckChildren`                 | ❌                     | P2     |
| 结果面板搜索      | ✅ `resultSearchable`                  | ✅ 共用 searchable     | —      |
| 结果可排序        | ✅ `sortable` + `ResultList`           | ❌                     | P3     |
| 分页              | ✅ `pagination`                        | ❌                     | P3     |
| 虚拟滚动          | ✅ `virtualThreshold`                  | ❌ Non-Goal            | P3     |

## 3. Schema 定义

```typescript
// composite-schemas.ts
export interface TransferSchema extends BoundFieldSchemaBase {
  type: 'transfer';
  options?: SchemaValue;
  multiple?: boolean;
  valueKey?: string;
  labelKey?: string;
  searchable?: boolean;
  searchOnly?: boolean;
  searchPlaceholder?: string;
  checkAll?: boolean; // P1: 全选开关
  checkAllLabel?: string; // P1: 全选文字
  clearable?: boolean; // P1: 清空按钮
  selectTitle?: string; // P1: 左栏标题
  resultTitle?: string; // P1: 右栏标题
  onAdd?: ActionSchema | ActionSchema[];
  onRemove?: ActionSchema | ActionSchema[];
  onChange?: ActionSchema | ActionSchema[];
  onSelectAll?: ActionSchema | ActionSchema[]; // P1: 全选事件
}
```

## 4. 字段分类

- `label`: `value-or-region`
- `name`、`options`、`multiple`、`valueKey`、`labelKey`、`searchable`、`searchPlaceholder`、`required`、`checkAll`、`checkAllLabel`、`clearable`、`selectTitle`、`resultTitle`: `value`
- `onAdd`、`onRemove`、`onChange`、`onSelectAll`: `event`

## 5. 运行期状态归属

- 选中值归最近表单或 owner scope。
- 左右栏搜索与临时高亮属于组件内部交互状态。

## 6. 样式与 DOM marker

- 根节点: `data-slot="field-control"` + `nop-transfer`
- 左栏: `data-slot="transfer-pane-candidate"`
- 右栏: `data-slot="transfer-pane-selected"`
- 穿梭按钮: `data-slot="transfer-select"` / `data-slot="transfer-deselect"`
- 全选 Checkbox: `data-slot="transfer-toggle-all"` (P1)
- 清空按钮: `data-slot="transfer-clear-all"` (P1)

## 7. 已知 Bug

| Bug                    | 描述                                                  | 状态      |
| ---------------------- | ----------------------------------------------------- | --------- |
| #14 搜索图标重叠       | `SearchIcon` 与 Input 文字重叠，`pl-8` 被 `px-3` 覆盖 | ✅ 已修复 |
| #15 缺少全选/清空/统计 | 无 checkAll/clearAll/statistics 功能                  | ✅ 已实现 |

## 8. 改进计划

### Phase 1: 核心交互补全 (P1) ✅ 已完成

**目标**: 对齐 AMIS transfer 的基本交互能力

1. **checkAll 全选** ✅
   - 左侧标题栏 Checkbox，支持 indeterminate 状态
   - `toggleAllCandidates()` 方法：切换当前 filteredCandidates 的选中状态
   - schema: `checkAll?: boolean`（默认 true）

2. **clearAll 清空** ✅
   - 右侧标题栏 "Clear" 文字按钮
   - 清空所有已选项，写入空数组/undefined
   - schema: `clearable?: boolean`（默认 true）

3. **statistics 统计** ✅
   - 左栏标题: `${title}（${visibleCount}/${totalCount}）`
   - 右栏标题: `${title}（${selectedCount}）`
   - 搜索过滤时统计仅反映当前可见项

### Phase 2: 展示模式扩展 (P2)

**目标**: 支持更复杂的选项展示

1. **selectMode: table** — 表格模式，选项以表格行展示
2. **selectMode: tree** — 树形模式，支持级联选中
3. **autoCheckChildren** — 树形模式下父子级联选中

### Phase 3: 高级能力 (P3)

**目标**: 大数据量和复杂交互场景

1. **sortable** — 已选项可拖拽排序
2. **pagination** — 分页加载候选选项
3. **virtualThreshold** — 超过阈值自动启用虚拟滚动

## 9. 风险与取舍

- **与 select/tree-select 边界**: 已通过 valueKey/labelKey 归一化 + 双栏穿梭语义收敛，边界见 §1。
- **虚拟滚动首版 Non-Goal**: 大数据量场景归 P3，首版聚焦交互正确性。
- **selectMode 扩展**: tree/table/chained 等模式依赖 AMIS 的 `Tree`/`TableSelection` 等组件，Flux 需评估是否复用或重写。
