# 复杂组件设计流程

本文档描述引入复杂组件（如 Flow Designer、Report Designer）的标准设计流程。

## 1. 核心原则

### 1.1 AMIS JSON 是核心 DSL

AMIS JSON 是最重要的设计产出，它：
- 反映领域的组合规律
- 定义用户可配置的边界
- 决定运行时的灵活性上限

设计顺序：**先 JSON Schema，后实现**。

### 1.2 充分利用 AMIS Runtime

复杂组件不是独立再造一套渲染引擎，而是：
- 复用 SchemaRenderer 渲染 UI 片段
- 复用 FormulaCompiler 处理表达式
- 复用 ActionScope 分发动作
- 复用 FormRuntime 处理表单
- 只在必要处引入专用引擎（如 xyflow 处理画布交互）

### 1.3 分层设计

```
┌─────────────────────────────────────────────────────┐
│ AMIS JSON Schema（用户可配置层）                     │
│ - 领域 DSL 定义                                      │
│ - 组合规则                                           │
│ - 默认值和约束                                       │
├─────────────────────────────────────────────────────┤
│ Compiled Config（编译层）                            │
│ - 预计算索引（Map）                                  │
│ - 预编译表达式                                       │
│ - 验证规则                                           │
├─────────────────────────────────────────────────────┤
│ Runtime Engine（运行时层）                           │
│ - 专用引擎（xyflow 等）                              │
│ - React 组件                                         │
│ - 状态管理                                           │
├─────────────────────────────────────────────────────┤
│ CSS Theme（样式层）                                  │
│ - 独立 CSS 文件                                      │
│ - CSS 变量对接主题 token                             │
└─────────────────────────────────────────────────────┘
```

## 2. 设计流程

### 2.1 阶段一：领域分析

**目标**：理解领域概念和组合规律

**产出**：
- 领域词汇表
- 核心概念关系图
- 用户操作场景

**问题清单**：
- 领域中有哪些核心实体？
- 实体之间如何组合？
- 用户需要哪些操作？
- 哪些需要持久化？哪些是运行时状态？

### 2.2 阶段二：JSON Schema 设计

**目标**：定义 AMIS JSON DSL

**产出**：
- 页面级 Schema 定义（如 `designer-page`）
- 配置 Schema 定义（如 `DesignerConfig`）
- 实例数据 Schema 定义（如 `GraphDocument`）
- 示例 JSON

**设计要点**：
- **Config 与 Document 分离**：类型配置与实例数据分开
- **复用现有 Renderer**：用 `type: container`、`type: flex` 等组合
- **Schema 片段嵌入**：`inspector.body`、`createDialog.body` 直接用标准 schema
- **表达式复用**：权限、规则等用现有表达式语法

**审查清单**：
- [ ] Schema 是否反映了领域组合规律？
- [ ] 是否充分复用了现有 AMIS 能力？
- [ ] Config 和 Document 是否清晰分离？
- [ ] 是否有冗余的自定义字段？
- [ ] 是否便于后端存储和版本迁移？

### 2.3 阶段三：编译层设计

**目标**：定义从 JSON 到运行时的中间格式

**产出**：
- Compiled Config 类型定义
- 编译器实现
- 预计算索引结构

**设计要点**：
- `Map<string, Config>` 替代数组查找
- 预编译表达式为可执行函数
- 预计算连接规则、匹配规则
- 缓存友好

### 2.4 阶段四：运行时设计

**目标**：实现底层引擎

**产出**：
- 专用引擎集成（如 xyflow）
- React 组件
- 状态管理（Zustand）
- Action 注册

**设计要点**：
- 运行时不解析 JSON，只消费 Compiled Config
- 内置操作标准化（undo/redo/select...）
- 事件和生命周期钩子
- 性能优化（局部订阅、增量更新）

### 2.5 阶段五：CSS 与主题

**目标**：独立样式，对接主题

**产出**：
- 独立 CSS 文件（如 `styles.css`）
- CSS 变量定义（如 `--fd-*`）
- 主题 token 映射（如 `--na-*` → `--fd-*`）

**设计要点**：
```css
/* 主题 token 定义 */
.theme-root {
  --na-primary: #3b82f6;
  --na-surface: #ffffff;
  --na-border: rgba(0,0,0,0.1);
}

/* 组件变量引用主题 token */
.fd-component-root {
  --fd-node-bg: var(--na-surface);
  --fd-node-border: var(--na-border);
  --fd-primary: var(--na-primary);
}

/* 组件样式使用组件变量 */
.fd-node {
  background: var(--fd-node-bg);
  border: 1px solid var(--fd-node-border);
}
```

## 3. 设计检查清单

### 3.1 JSON Schema 检查

- [ ] 类型定义完整且有 TypeScript 对应
- [ ] Config（类型配置）和 Document（实例数据）分离
- [ ] 充分复用现有 AMIS renderer
- [ ] 表达式使用现有语法
- [ ] 可序列化，便于持久化
- [ ] 版本字段支持迁移

### 3.2 编译层检查

- [ ] 预计算索引结构
- [ ] 表达式预编译
- [ ] 编译结果可缓存
- [ ] 编译错误友好报告

### 3.3 运行时检查

- [ ] 不直接解析 JSON
- [ ] 内置操作标准化
- [ ] 性能优化到位
- [ ] 事件钩子完整

### 3.4 CSS 检查

- [ ] 独立 CSS 文件
- [ ] 使用 CSS 变量
- [ ] 对接主题 token
- [ ] 响应式支持

## 4. 已应用组件

| 组件 | 状态 | 文档位置 |
|------|------|----------|
| Flow Designer | 进行中 | `docs/architecture/flow-designer/` |
| Report Designer | 待设计 | `docs/architecture/report-designer/` |

## 5. 反模式

### 5.1 先实现后设计

错误：先写代码，再补 JSON Schema
正确：先设计 JSON Schema，再实现

### 5.2 重复造轮子

错误：复杂组件自己实现表单引擎、表达式引擎
正确：复用 AMIS Runtime 的 FormRuntime、FormulaCompiler

### 5.3 Config 与 Document 混杂

错误：把类型配置和实例数据放在同一结构
正确：`config` 定义类型，`document` 存储实例

### 5.4 CSS 散落

错误：样式写在 JS 中或散落多处
正确：独立 CSS 文件，使用 CSS 变量

### 5.5 运行时解析

错误：运行时每次都解析 JSON 配置
正确：编译时预处理，运行时消费 Compiled Config
