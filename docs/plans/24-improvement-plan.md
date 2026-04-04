# NOP Chaos Flux 改善计划

> Plan Status: superseded
> Last Reviewed: 2026-04-04

> **Implementation Status: ⚠️ SUPERSEDED BY LATER SPECIALIZED PLANS**
> This document was a broad audit snapshot from 2026-03-31, not a realistic single execution plan anymore. Since then, many items here have either landed or moved into narrower active plans such as `docs/plans/20-nop-debugger-implementation-plan.md`, `docs/plans/24-word-editor-development-plan.md`, `docs/plans/25-code-audit-bug-fix-plan.md`, `docs/plans/26-performance-and-completeness-remediation-plan.md`, `docs/plans/32-report-designer-schema-driven-refactor-plan.md`, and `docs/plans/33-complex-control-platform-convergence-refactor-plan.md`.

> Keep this file as historical audit context only; do not treat it as a pending approval gate.


> 创建日期: 2026-03-31
> 状态: 已归档（被后续专项计划替代）
> 优先级: 按阶段排序

---

## 一、Flow Designer 功能缺口

> 基于源码与设计文档的完整对比分析 (packages/flow-designer-*/src/ vs docs/architecture/flow-designer/)
> 总体完成度: **45-50%**

### 1.1 已完全实现的功能 ✅

| 功能 | 实现位置 | 说明 |
|------|---------|------|
| 图数据模型 | core.ts | GraphDocument/GraphNode/GraphEdge |
| 节点/边 CRUD | core.ts | addNode/updateNode/moveNode/deleteNode/duplicateNode, addEdge/updateEdge/deleteEdge/reconnectEdge |
| 单选 | core.ts | selectNode/selectEdge/clearSelection |
| Undo/Redo | core.ts | 完整历史管理 |
| 剪贴板 | core.ts | copySelection/pasteClipboard (单节点) |
| 脏检测 | core.ts | isDirty tracking |
| Save/Restore/Export | core.ts | 完整实现 |
| 基础连接校验 | core.ts | 自环/重复边/节点存在性 |
| 事件订阅 | core.ts | subscribe(listener) + DesignerEvent |
| 自动布局 | elk-layout.ts | ELK 集成 |
| designer-page renderer | designer-page.tsx | 区域挂载 + ActionScope 注册 |
| Canvas 三层 adapter | designer-canvas.tsx | card/xyflow-preview/xyflow |
| 21 个 designer:* 动作 | designer-action-provider.ts | addNode/updateNodeData/deleteSelection/undo/redo 等 |
| 键盘快捷键 | designer-page.tsx | Ctrl+Z/Y/C/V, Delete |
| Viewport 控制 | DesignerXyflowCanvas | 缩放/平移/Fit view |

### 1.2 部分实现需要完善的功能 ⚠️

| 功能 | 当前状态 | 缺口 | 优先级 |
|------|---------|------|--------|
| **Port 级连接模型** | 类型定义 + 端口渲染 | Port role matching/maxConnections 校验未实现，仅用节点级校验 | 高 |
| **Host Scope 注入** | DesignerContext 暴露给 React | schema 表达式无法读取 `${activeNode.*}` 等字段 | 高 |
| **Auto-Layout 动作** | ELK 实现 + 工具栏按钮 | `designer:autoLayout` 未注册到 action provider | 中 |
| **Inspector 模式** | 默认 inspector 渲染 | mode (panel/drawer/dialog) 配置未使用 | 低 |

### 1.3 已设计但未实现的功能 ❌

| 功能 | 设计文档位置 | 优先级 | 预估工作量 | 说明 |
|------|-------------|--------|-----------|------|
| **事务边界** | design.md §10.1, api.md §251-277 | **P0** | 2 天 | beginTransaction/commitTransaction/rollbackTransaction 完全缺失；拖拽多节点产生多条历史 |
| **生命周期 Hooks** | design.md §13.1, api.md §364-385 | **P0** | 2-3 天 | beforeCreateNode/beforeConnect/beforeDelete/afterCommand 完全缺失 |
| **多选** | api.md §198-206 | **P0** | 2 天 | setSelection/moveNodes/updateMultipleNodes 缺失；UI 无框选/shift-click |
| **权限系统** | config-schema.md §348-398 | P1 | 2 天 | DesignerPermissions/NodePermissionConfig 类型存在但从未求值 |
| **约束系统** | config-schema.md §363-398 | P1 | 1-2 天 | maxInstances/allowMove/maxIncoming 等约束从未检查 |
| **文档迁移** | api.md §22-28 | P1 | 2 天 | migrateDesignerDocument 完全缺失 |
| **验证系统** | config-schema.md | P1 | 1-2 天 | validateConnection 表达式从未求值；validationFailed 事件从未发射 |
| **Create Dialog** | design.md §9.2 | P2 | 1 天 | createDialog.body 类型存在但从未调用 |
| **Quick Actions** | config-schema.md | P2 | 0.5 天 | quickActions schema 从未渲染 |
| **Inspector 开关动作** | design.md §10 | P2 | 0.5 天 | openInspector/closeInspector 缺失 |
| **缺失动作** | api.md | P2 | 0.5 天 | fitView/zoomIn/zoomOut/disconnect 作为动作缺失 |
| **节点分组/折叠** | 未明确设计 | P2 | 2-3 天 | 大图场景必需能力 |
|------|---------|------|--------|
| **Host Scope 完整注入** | DesignerContext 暴露给 React 组件 | schema 表达式 scope 未完整拿到 `${activeNode.*}` 等字段 | 高 |
| **Viewport Controls** | 基础缩放/平移 | Fit view、minimap 联动缺失 | 中 |
| **Inspector 读写路径** | 写路径稳定，读路径不完整 | 表达式引用 activeNode/activeEdge 未完全接线 | 高 |
| **Keyboard Shortcuts** | 基础快捷键映射 | 自定义快捷键配置、快捷键冲突处理 | 低 |
| **Canvas Adapter 失败语义** | 基础错误返回 | 错误恢复策略、用户反馈 UI | 中 |

---

## 二、统一验证模型

### 2.1 问题描述

当前 `CompiledFormValidationModel` 同时维护两套验证视图：

```typescript
interface CompiledFormValidationModel {
  fields: Record<string, CompiledFormValidationField>;  // ← field-centric
  nodes?: Record<string, CompiledValidationNode>;       // ← node-centric
  order: string[];
  dependents: Record<string, string[]>;
  validationOrder?: string[];
}
```

**field-centric 视图** (`fields`):
```typescript
interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior: CompiledValidationBehavior;
}
```

**node-centric 视图** (`nodes`):
```typescript
interface CompiledValidationNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';  // 支持树形结构
  controlType?: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior?: CompiledValidationBehavior;
  children: string[];    // ← 子节点关系，field 视图没有
  parent?: string;       // ← 父节点引用，field 视图没有
}
```

### 2.2 冗余分析

| 冗余项 | 说明 |
|--------|------|
| **数据重复** | `fields[path]` 和 `nodes[path]` 存储相同字段的 path/controlType/label/rules/behavior |
| **转换函数** | `validation-model.ts` 中有 `toCompiledValidationField()`, `buildCompiledValidationFieldMap()` 等转换函数在两套视图间转换 |
| **查询路径** | `getCompiledValidationField()` 先查 `fields[path]`，未找到再查 `nodes[path]` 并转换 |
| **维护成本** | 修改验证模型需要同时更新两套结构 |

### 2.3 改善方案

**方案 A: 保留 nodes 视图，消除 fields 视图** (推荐)
- `nodes` 视图更完整（包含树形关系）
- 删除 `fields` 字段和所有转换函数
- 修改所有消费 `fields` 的代码改用 `nodes`
- 需要 `field` 视图的地方通过 `nodes[path]` + 类型守卫获取

**方案 B: 保留 fields 视图，按需构建树**
- `fields` 视图更扁平，查询更快
- 删除 `nodes` 字段
- 需要树形遍历时从 `fields` + `children` 关系动态构建

**方案 C: 合并为单一视图**
- 扩展 `CompiledFormValidationField` 增加 `children`/`parent` 字段
- 删除 `CompiledValidationNode` 类型
- 最简洁但需要修改所有类型定义

**推荐方案 A 的理由**:
1. `nodes` 视图已经包含所有信息，`fields` 是其子集投影
2. 树形关系对复合控件（array-editor, key-value）的验证至关重要
3. 转换函数 (`toCompiledValidationField`, `buildCompiledValidationFieldMap`) 可以完全删除
4. 影响范围可控：主要修改 `validation-model.ts` 和消费方

### 2.4 实施步骤

| 步骤 | 内容 | 预估工作量 |
|------|------|-----------|
| 1 | 确定所有消费 `model.fields` 的代码位置 | 0.5 天 |
| 2 | 扩展 `getCompiledValidationField()` 直接返回 node 或统一查询接口 | 0.5 天 |
| 3 | 删除 `fields` 字段及相关转换函数 | 0.5 天 |
| 4 | 更新 `form-runtime-validation.ts` 消费方 | 0.5 天 |
| 5 | 更新 `form-runtime.ts` 消费方 | 0.5 天 |
| 6 | 类型检查 + 测试验证 | 0.5 天 |

**总工作量**: 2-3 天

---

## 三、Table/Chart 数据渲染器

### 3.1 当前状态评估

| 组件 | 状态 | 说明 |
|------|------|------|
| **table (基础)** | 🟡 部分实现 | 基础列渲染，缺少排序/筛选/分页 |
| **table (高级)** | 🔴 未实现 | 列拖拽、列固定、行展开、行选择、批量操作 |
| **crud** | 🔴 未实现 | AMIS 核心组件，增删改查一体化 |
| **chart** | 🔴 未实现 | 图表渲染器完全缺失 |
| **cards** | 🟡 部分实现 | 卡片列表基础渲染 |
| **list** | 🟡 部分实现 | 列表基础渲染 |
| **pagination** | 🔴 未实现 | 分页组件缺失 |
| **virtual-scroll** | 🔴 未实现 | 虚拟滚动完全缺失 |

### 3.2 Table 渲染器详细规划

#### 3.2.1 第一阶段：基础 Table

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 列定义 | columns 数组，支持 text/number/date 类型 | P0 |
| 数据源绑定 | api/data 两种数据源 | P0 |
| 行渲染 | 每行创建子作用域 `{ item, index }` | P0 |
| 列宽控制 | 固定宽度/百分比/自适应 | P1 |
| 空状态 | empty 区域渲染 | P1 |
| 加载状态 | loading 指示器 | P1 |
| 行点击事件 | onClick 动作绑定 | P1 |

#### 3.2.2 第二阶段：交互 Table

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 列排序 | 点击列头排序 | P0 |
| 列筛选 | 列头筛选菜单 | P0 |
| 分页 | 前后端分页支持 | P0 |
| 行选择 | 单选/多选 checkbox | P1 |
| 行展开 | expandable rows | P1 |
| 列固定 | fixed left/right | P2 |
| 列拖拽 | 拖拽调整列顺序 | P2 |
| 列显隐 | 列显示/隐藏控制 | P2 |

#### 3.2.3 第三阶段：高级 Table

| 功能 | 说明 | 优先级 |
|------|------|--------|
| 虚拟滚动 | 大数据量窗口化渲染 | P0 |
| 行内编辑 | 单元格直接编辑 | P1 |
| 树形表格 | 嵌套行数据 | P1 |
| 合并单元格 | rowSpan/colSpan | P2 |
| 导出 | CSV/Excel 导出 | P2 |

#### 3.2.4 虚拟滚动技术方案

```
方案选择: @tanstack/react-virtual (推荐)
  - 轻量 (~5KB)
  - 支持可变高度
  - 与 Zustand 兼容
  - 无外部依赖

实现要点:
  1. table renderer 创建 virtualizer
  2. 仅渲染 visible range 内的行
  3. 使用 CSS transform 定位
  4. 行高度预估 + 实际测量修正
  5. 滚动位置同步到 scope
```

### 3.3 Chart 渲染器规划

| 阶段 | 内容 | 说明 |
|------|------|------|
| **基础** | 图表类型注册表 | 支持 bar/line/pie/scatter 等基础类型 |
| **集成** | ECharts/AntV 适配器 | 不内建图表引擎，通过适配器接入 |
| **数据** | 数据源绑定 + 映射 | api/data → chart data format |
| **交互** | 点击/悬停事件 | 图表事件 → action dispatch |
| **联动** | 多图表联动 | 一个图表的选择影响其他图表的数据 |

### 3.4 CRUD 渲染器规划

CRUD 是 AMIS 最核心的组件，整合了 table + form + pagination + toolbar：

```
crud renderer
  ├── toolbar (批量操作、搜索、导出)
  ├── filter (筛选表单)
  ├── table (数据表格)
  ├── pagination (分页)
  └── dialogs (新增/编辑/详情弹窗)
```

**实现策略**: 不单独实现 CRUD，而是组合已有的 table/form/pagination 渲染器，通过 region 机制组装。

---

## 四、React 重渲染问题深度分析

### 4.1 当前设计中的防重渲染机制

| 机制 | 实现位置 | 原理 | 有效性 |
|------|---------|------|--------|
| **静态快路径** | node-renderer.tsx:65-84 | `isStatic` 节点跳过 `useSyncExternalStore` | ✅ 有效 |
| **引用复用** | compilation.ts | 动态值结果不变时返回同一引用 | ✅ 有效 |
| **精准订阅** | hooks.ts:49-62 | `useScopeSelector(selector, equalityFn)` | ✅ 有效 |
| **Context 拆分** | contexts.ts | 7 个独立 Context | ✅ 有效 |
| **useMemo 缓存** | node-renderer.tsx:131-178 | helpers/events/regions 缓存 | ✅ 有效 |
| **浅比较相等性** | node-renderer.tsx:80-83 | `prev.meta === next.meta && prev.resolvedProps === next.resolvedProps` | ⚠️ 有条件有效 |

### 4.2 潜在的重渲染风险点

| 风险点 | 严重度 | 根因 | 建议 |
|--------|--------|------|------|
| **scope.readOwn() 每次返回新对象** | 高 | `useSyncExternalStore` 的 `getSnapshot` 调用 `scope.readOwn()`，如果每次都返回新对象引用，selector 即使返回值相同也会因为输入对象变化而重新执行 | 确保 `readOwn()` 在数据未变化时返回同一引用 |
| **resolvedProps.value 解构** | 中 | `componentProps.props: resolvedProps.value` 解包后，如果 `value` 是每次新建的对象，会导致子组件重渲染 | 依赖 `RuntimeValueState` 的引用复用 |
| **helpers 对象依赖项过多** | 中 | `useMemo` 有 7 个依赖项，任何一个变化都会重建 helpers | helpers 内部方法引用稳定即可 |
| **events 对象每次重建** | 低 | `Object.fromEntries(props.node.eventKeys.map(...))` 每次渲染创建新对象 | 但 eventKeys 是 readonly，变化频率低 |
| **regions 对象每次重建** | 低 | 同上，但 region.node 是编译后节点，引用稳定 | 实际影响小 |
| **FormContext 变化传播** | 中 | 表单内任何字段变化都会导致 FormContext value 变化 | 已由 `useCurrentFormState(selector)` 缓解 |

### 4.3 关键路径分析

**场景: 用户在表单中输入一个字段**

```
1. 用户输入 → input onChange
2. formStore.setValue(path, value)
3. Zustand store 更新 → 触发所有 subscribe 回调
4. useCurrentFormState 的所有实例重新执行 selector
5. 但 equalityFn 会过滤掉无关组件的重渲染
6. 只有 selector 返回值变化的组件才重渲染
```

**结论**: 表单场景下，`useSyncExternalStoreWithSelector` + `equalityFn` 的组合是有效的。但前提是：
- selector 足够窄（只订阅需要的字段）
- equalityFn 正确实现

### 4.4 与 React 19 的兼容性

| React 19 特性 | 影响 | 当前状态 |
|--------------|------|----------|
| **use** hook | 可用于替代部分 selector 逻辑 | 未使用 |
| **useOptimistic** | 可用于表单乐观更新 | 未使用 |
| **useActionState** | 可用于表单提交状态 | 未使用 |
| **useTransition** | 可用于非紧急更新优先级 | 未使用 |
| **Server Components** | 不影响客户端渲染管线 | 不涉及 |

---

## 五、实施优先级排序

### Phase 1: 高价值低成本 (1-2 周)

| 项目 | 工作量 | 价值 |
|------|--------|------|
| 统一验证模型 (方案 A) | 2-3 天 | 消除技术债务，简化维护 |
| Table 基础渲染器 | 3-5 天 | 低代码平台核心组件 |
| Host Scope 完整注入 (Flow Designer) | 1-2 天 | 使 schema 表达式可访问设计器状态 |

### Phase 2: 高价值高成本 (2-4 周)

| 项目 | 工作量 | 价值 |
|------|--------|------|
| Table 交互功能 (排序/筛选/分页) | 5-7 天 | 生产可用 |
| 虚拟滚动集成 | 3-5 天 | 大数据量性能 |
| Flow Designer 事件系统 + 生命周期 | 2-3 天 | 扩展性基础 |
| Flow Designer 事务边界 | 1-2 天 | 用户体验 |
| Chart 渲染器基础 | 3-5 天 | 数据可视化能力 |

### Phase 3: 完善与优化 (4-8 周)

| 项目 | 工作量 | 价值 |
|------|--------|------|
| CRUD 渲染器 | 5-7 天 | AMIS 核心能力对标 |
| Flow Designer 自动布局 | 2-3 天 | 可用性提升 |
| Flow Designer 权限系统 | 2-3 天 | 企业级能力 |
| Table 高级功能 (虚拟滚动/树形/合并) | 5-7 天 | 完整能力 |
| Report Designer nop-report 适配器 | 5-7 天 | 首个重要适配目标 |


