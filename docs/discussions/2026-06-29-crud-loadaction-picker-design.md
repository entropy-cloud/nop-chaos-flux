# CRUD loadAction 与 Picker 设计讨论

## 第 1 轮

### 用户原始表述

分析了 amis-react19 的 CRUD 控件初始化和提交方式后，对比 flux 现有实现。讨论是否应该放弃 `source`，引入 `loadAction` 作为 amis `api` 的等价设计。

### AI 复述

用户关心 flux CRUD 以下问题：

1. amis CRUD 通过 `api` 属性声明式获取数据，flux 用 `source` + `data-source` + `onRefresh` 事件三件套实现相同功能，过于繁琐
2. 后端 PageBean 返回的 `page`、`totalPages` 等字段在 `normalizeCrudSourceValue` 中被丢弃
3. CRUD 无法信任后端返回的分页状态
4. 事件协调是 fire-and-forget，没有完整生命周期

### AI 分析

已产出详细分析报告：`docs/analysis/crud-data-flow-analysis.md`

结论：引入 `loadAction` 作为 ActionSchema 类型的 CRUD 数据获取入口，与 `quickSaveAction` 处于同一抽象层级。`source` 保留为降级/兼容路径。

随后讨论扩展到 Picker 组件——Picker 本质是 "Dialog + CRUD/Table"，需要有和 CRUD 一致的数据获取机制。

### 待澄清问题

1. CRUD scope 的变量命名约定——扁平化还是命名空间分组？
2. queryForm 字段注入 scope 的规则——是否保留 `values` 包装层？
3. `includeScope` 的范围——仅 CRUD scope 还是包含父 scope？
4. Picker label 解析策略——选中后如何显示已选值？

---

## 第 2 轮

### 用户回答

1. scope 变量名使用 `pagination.pageSize` 这种全路径结构
2. queryForm 字段直接用 `query.keyword`，不要 `query.values.keyword`
3. `includeScope` 仅限 CRUD scope
4. `loadAction` 表达式严格按 scope 路径匹配，无别名无回退
5. 每个 CRUD 实例创建独立 scope，Picker 内部 CRUD 与父 scope 隔离
6. Picker 默认 `extractValue: true`（只存 value，不存整行）。label 从行数据捕获缓存
7. 已有 value 但未打开过 Dialog 时，通过 `labelResolveAction` 反查 label
8. `labelResolveAction` 典型为 `__batchGet` 端点
9. URL 格式为 `/r/EntityName__method`
10. `loadAction` 失败时：保持当前数据 + toast 错误消息（A+D）
11. `source` 和 `loadAction` 的关系：loadAction 返回结果直接作为 CRUD 内部数据源，两条路径汇合到同一份内部数据
12. `includeScope` 仅包含 CRUD 自身 scope 变量，父 scope 变量需显式访问

### AI 整理

已确认的设计决策：

**CRUD Scope 结构**：

- `pagination.currentPage`、`pagination.pageSize`
- `query.*`（queryForm 字段值，扁平展开，无 `values` 包装）
- `sort.column`、`sort.direction`
- `filters.*`、`selection`

**loadAction 设计**：

- 严格 scope 路径匹配，无别名
- 失败时保持当前数据 + toast 错误，`onError` 可覆盖
- 结果直接作为内部数据源，不写入 scope

**Picker 设计**：

- 两个 action：`loadAction`（弹窗列表）+ `labelResolveAction`（回填 label）
- `extractValue: true` 默认
- label 缓存机制：选中时从行数据捕获，组件未卸载时 reopen 直接读缓存
- 重新挂载时通过 `labelResolveAction` 反查

**全局原则**：

- 显式声明优先
- CRUD 实例独立 scope
- Nop URL 格式 `/r/EntityName__method`

### 待澄清问题

1. 已选中并存储到表单的 value 在重新打开 Dialog 时，如何与对话框中的选择状态同步？比如之前选了第 1 页的 3 条，此时再打开 Dialog，这 3 条应该在 Dialog 中显示为已勾选——但 Dialog 默认加载第 1 页，这 3 条可能分布在多页中。

---

## 第 3 轮

### 用户回答

Picker 重新打开 Dialog 时，已选 value 通过 selection 路径传入内部 CRUD 即可逐行匹配勾选，足够。不用考虑后端返回数据中 valueKey 缺失的问题。

### AI 整理

已确认：

- Picker 打开 Dialog 时将 `formFieldValue`（已选 value 数组）传入内部 CRUD 的 `selection`
- CRUD 在每行数据中查找 `valueKey` 字段匹配勾选状态
- 后端 `loadAction` 返回的 `items` 默认包含 `valueKey` 字段，不处理缺失情况

至此大部分设计决策已确认。

---

## 总结

### 最终需求

在 flux CRUD 中引入 `loadAction`（ActionSchema 类型）作为数据获取入口，替代 `source` + `data-source` + `onRefresh` 事件三件套。Picker 作为 CRUD 的 Dialog 包装，复用同一套机制。

### 关键设计决策

**1. CRUD Scope**

- 每个 CRUD 定义独立虚拟 scope
- `pagination.currentPage`, `pagination.pageSize`
- `query.*`（queryForm 字段值扁平展开，不带 `values` 包装，不暴露 `refreshCount`）
- `sort.column`, `sort.direction`
- `filters.*`, `selection`
- 严格路径匹配，无快捷别名，无父 scope 回退

**2. loadAction**

- ActionSchema 类型，不限于 ajax（formula、custom 等）
- 参数显式声明：`args.params` / `args.data`，无隐式注入
- `includeScope: "*"` 可选，仅包含 CRUD scope 变量
- 翻页/搜索/排序自动触发，内置联动
- 失败时保持当前数据 + toast 错误（`onError` 可覆盖）
- 返回结果 CRUD 内部 `normalizeCrudSourceValue` 直接消化，不写 scope

**3. source 兼容**

- 保留 `source` 表达式路径，无 `loadAction` 时使用
- `loadAction` 和 `source` 是同一入口的两条路径，内部汇合
- 两者同时存在无意义

**4. Picker**

- 两个显式 action：`loadAction`（弹窗列表）、`labelResolveAction`（回填 label）
- 默认 `extractValue: true`（只存 value）
- Label 缓存：选中时从行数据捕获，组件未卸载 reopen 直接读缓存，重新挂载走 `labelResolveAction`
- `labelResolveAction` 典型值为 `__batchGet` 端点
- 打开 Dialog 时已选 value 传给内部 CRUD selection 匹配勾选状态
- Picker 内部 CRUD 独立 scope，与父 scope 隔离

**5. scope 变量传递**

- `loadAction` 自身的 scope 通过 `evaluationBindings` 注入 action 上下文
- 表达式 `${pagination.currentPage}` 等经 action 引擎求值
- 不需要 CRUD 额外组装

**6. queryForm 校验**

- 提交前先 `form.validate()`，失败返回并显示错误
- 通过后 `form.getValues()` 收集值到 `query.*`

**7. URL 格式**

- Nop 平台：`/r/EntityName__method`

**8. loadAllData 模式**

- `loadAllData: true` 时，首次加载调用 `loadAction` 获取全部数据，后续分页/排序/筛选在前端完成
- `loadAction` 始终由用户显式声明，`loadAllData` 只控制调用频率
- 默认 `false`（服务端分页）

### 待定事项

无。

### 后续行动

- 更新 `docs/architecture/` 中相关文档
- 更新 `docs/analysis/crud-data-flow-analysis.md` 增添最终设计摘要
- 实现 `loadAction` + CRUD 内部 scope + 内置联动
- 重构 Picker 接入 CRUD/Table + loadAction
- 记录到 `docs/logs/2026/06-29.md`
