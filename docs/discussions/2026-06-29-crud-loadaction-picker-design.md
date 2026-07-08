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

---

## 第 4 轮 — amis-react19 Picker 架构对标分析

### 研究目标

深入分析 amis-react19 的 Picker 实现，为 nop-chaos-flux 的 Picker 重构提供对标参考。

### amis-react19 Picker 架构

**核心文件**：`packages/amis/src/renderers/Form/Picker.tsx`（911 行，Class 组件）

**关键设计**：

1. **Schema 结构**：
   - `type: 'picker'`，继承 `OptionsControl`（amis 的选项控件基类）
   - `pickerSchema`：Dialog 内嵌的 CRUD schema（用户可自定义 columns、mode、toolbar 等）
   - `source`：API 地址或变量表达式，用于加载选项数据
   - `valueField` / `labelField`：值字段和标签字段映射
   - `modalMode`：`'dialog'` | `'drawer'`
   - `modalSize`：弹窗尺寸
   - `embed`：内嵌模式 vs 弹窗模式

2. **CRUD 嵌入机制**：
   - `buildSchema()` 方法构造 CRUD schema：
     ```typescript
     {
       type: 'crud',
       pickerMode: true,        // 标记为 picker 内部 CRUD
       checkOnItemClick: true,  // 点击行切换选中
       api: props.source,       // 数据源 API
       keepItemSelectionOnPageChange: true,
       valueField: props.valueField,
       labelField: props.labelField,
       ...props.pickerSchema    // 用户自定义 CRUD 配置
     }
     ```
   - `renderBody()` 调用 `render('modal-body', schema, {...})` 渲染 CRUD

3. **选中值写回**：
   - `handleModalConfirm(values, action, ctx, components)`：从 components 中提取 CRUD 组件的 `values[idx].items`
   - `handleChange(items)`：根据配置转换选中项：
     - `joinValues: true` → 用 delimiter 连接 valueField 值
     - `extractValue: true` → 返回 value 数组或单值
     - 否则 → 存储完整选项对象

4. **数据加载**：
   - `fetchOptions()`：支持 API source 和变量 source
   - 构造函数中 hook 到 form 生命周期，设置 MobX reaction 监听 value 变化重新加载

5. **与 nop-chaos-flux 的差异**：
   - amis 用 MobX observable state，flux 用 Zustand
   - amis 用 Class 组件 + `@OptionsControl` 装饰器，flux 用函数组件 + hooks
   - amis 的 CRUD 通过 `render('crud', schema)` 动态渲染，flux 需要显式 import CrudRenderer
   - amis 的 `pickerMode: true` 标记 CRUD 进入 picker 模式，flux 需要类似的机制

### 当前实现差距

**Plan 448 Phase 3 标记为 "completed"，但实际实现存在差距**：

| 维度                             | Plan 声称                                            | 实际状态                               |
| -------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| PickerSchema 字段                | `loadAction`, `columns`, `labelResolveAction` 已定义 | ✅ 已在 `composite-schemas.ts:169-182` |
| PickerRenderer 嵌入 CrudRenderer | Dialog 内嵌 CrudRenderer                             | ❌ 仍用 `<ul><li>` 列表                |
| loadAction 支持                  | 通过 CrudRenderer 触发 loadAction                    | ❌ PickerRenderer 未使用 loadAction    |
| columns 支持                     | CrudRenderer 渲染表格列                              | ❌ PickerRenderer 未使用 columns       |
| labelResolveAction               | mount 时反查 label                                   | ❌ PickerRenderer 未实现               |
| autoFill                         | 选中后自动填充表单字段                               | ❌ PickerRenderer 未实现               |

**根本原因**：Plan Phase 3 的 Exit Criteria 被标记为完成，但 `picker-renderer.tsx` 的实际代码仍停留在静态 `options` 阶段，未进行 CrudRenderer 嵌入重构。

### 实现方案

**Phase 3 重新实施**：

1. **PickerRenderer 分支逻辑**：
   - 当 `loadAction` 存在时 → 嵌入 CrudRenderer（CRUD 模式）
   - 当 `loadAction` 不存在时 → 保留现有 `<ul><li>` 列表（静态 options 模式）

2. **CRUD 模式 Picker 流程**：

   ```
   PickerRenderer
   ├── trigger 按钮（显示选中 label）
   ├── Dialog
   │   ├── 搜索框（searchable: true 时）
   │   ├── CrudRenderer（loadAction + columns + selection）
   │   └── Footer（取消 / 确认）
   └── 确认 → 提取选中行 valueKey → writeValue → 关闭 Dialog
   ```

3. **关键实现点**：
   - Picker 构造 CrudRenderer schema：`{ type: 'crud', loadAction, columns, selection, pickerMode: true }`
   - 打开 Dialog 时将已选 value 传入 CrudRenderer 的 selection
   - CrudRenderer 独立 scope，与父 form 隔离
   - 确认时从 CrudRenderer 提取选中行，按 extractValue 配置转换后写入表单

4. **依赖关系**：
   - `@nop-chaos/flux-renderers-data` 需从 devDependencies 提升到 dependencies
   - CrudRenderer 需支持 `pickerMode` 标记（可选，用于禁用某些 picker 不需要的 CRUD 功能）

### 后续行动

- 重新实施 Phase 3：PickerRenderer 嵌入 CrudRenderer
- 更新 `crud-demo.json` 的 picker 示例：使用 `loadAction` + `columns` 替代静态 `options`
- 编写单测验证 CRUD 模式 Picker 的完整流程
- 记录到 `docs/logs/`
