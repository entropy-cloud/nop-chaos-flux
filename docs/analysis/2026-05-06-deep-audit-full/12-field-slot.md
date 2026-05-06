# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### P2 发现（2 个）

1. Table: header/footer 缺少 value-or-region 声明。TableSchema 允许 SchemaInput | string，但 DEFAULT_FIELD_RULES 归类为 region，字符串形式无法通过编译。
2. detail-view/detail-field/variant-field/object-field: xxxAction 字段分类为 prop 而非 event。form 的 initAction/submitAction 正确分类为 event，跨渲染器 xxxAction 分类不一致。

### P3 发现（5 个）

1. Loop: empty 使用 region 而非 value-or-region（推荐模式偏差）
2. Table: quickSaveAction/quickSaveItemAction 未声明
3. Chart: 部分字段未显式声明
4. CRUD: 大量配置型 prop 未显式声明（可接受的省略）
5. Array-editor: 缺少 item region params 声明

### 正面发现

- formLabelFieldRule 共享常量统一了 label 处理
- allowSource + sourceStateKey 标记正确
- Deep region extraction 通用 helper 可复用
- wrap: true + NodeFrameWrapper 声明式 FieldFrame 集成
- event 命名规范严格合规
- ignored 分类正确使用
