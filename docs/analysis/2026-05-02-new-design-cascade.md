# NextGen LowCode Framework: **Cascade**

> **设计声明**：本设计基于前三轮审计中候选 α 的形式化结果。它**不是**一个"全新发明"，而是 **algebraic effects + RSC 编译边界 + typed capability** 三个相邻领域成熟思想在 JSON-authoring 低代码场景的精确合流。本文档以"已完成形式化、待工程验证"的成熟度呈现，但读者必须清楚：T1-T6 命题尚未被实测验证。
>
> **命名理由**：Cascade 取自"级联词法作用域"——能力沿 Provider 链级联可见，而不是全局可达。

---

## 第一部分：核心设计原则

### 1.1 三个根决定（Root Decisions）

Cascade 与所有主流低代码框架的根本分歧来自三个无法妥协的决定：

| 根决定                  | 主流方案                               | Cascade                                             |
| ----------------------- | -------------------------------------- | --------------------------------------------------- |
| **R1: name 的角色**     | 身份 ∧ 路径 ∧ 引用 ∧ 可见性（合一）    | 仅作为调试标签，不承担引用语义                      |
| **R2: action 的可见性** | 全局 registry，按字符串名查找          | 词法作用域 + provider 链 + 编译期解析               |
| **R3: JSON 的角色**     | 同时是 authoring surface 和 runtime IR | 仅是 authoring surface；runtime 消费的是编译后的 IR |

如果不能接受这三个根决定中的**任何一个**，Cascade 不适合你。请使用 AMIS / Formily / Retool。

### 1.2 七个核心术语（Minimal Vocabulary）

这是 Cascade 全部的最小术语系统。任何在文档之外引入的术语都不构成 Cascade 的一部分。

```
Capability       — 类型化能力契约
CapabilityImpl   — 能力的 runtime 实现（可缺席）
Provider         — 词法作用域内的能力提供节点
Requirement      — 节点对能力的需求声明
Binding          — 显式数据通道（source → sink）
ResolvedRef      — 编译期解析的稳定引用 token
CompilationUnit  — 编译边界 + 能力隔离单位
```

### 1.3 五个不变量（Invariants）

```
I1: runtime 不存在 lookupByName(string: string) 接口
I2: 每个节点的 Requirement 集合在编译期可枚举
I3: 所有 Binding 是有向的 (source → sink)，禁止隐式双向
I4: 跨 CompilationUnit 通信必须经过 typed Capability 接口
I5: 单个 application 的 Capability 总数受 lint 约束（默认 < 50）
```

---

## 第二部分：分层架构

```
┌─────────────────────────────────────────────────────────┐
│  Authoring Layer (作者面)                                 │
│  • JSON Schema with provides/requires/bindings           │
│  • Visual editor (与 JSON 双向同步)                       │
│  • TypeScript definitions for capabilities               │
└────────────────────────┬─────────────────────────────────┘
                         │ compile
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Compiler Layer (编译期)                                  │
│  • Requirement-Provider matching                         │
│  • String ref → ResolvedRef lowering                     │
│  • CompilationUnit boundary enforcement                  │
│  • Type checking for Bindings                            │
│  • Diagnostics & error reporting                         │
└────────────────────────┬─────────────────────────────────┘
                         │ emit IR
                         ▼
┌─────────────────────────────────────────────────────────┐
│  IR Layer (中间表示)                                       │
│  • Typed, ref-resolved, scope-flattened                  │
│  • No string lookups, no name-based queries              │
│  • Versioned, shippable, cacheable                       │
└────────────────────────┬─────────────────────────────────┘
                         │ load
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Runtime Core (运行时核心)                                  │
│  • Provider tree construction                            │
│  • Capability resolution via ResolvedRef                 │
│  • Binding execution (typed, directional)                │
│  • Effect lifecycle management                           │
└────────────────────────┬─────────────────────────────────┘
                         │ delegate
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Host Layer (宿主层)                                       │
│  • Root provider implementations                         │
│  • Cross-route session/store capabilities                │
│  • Browser/Node/Native integration                       │
└─────────────────────────────────────────────────────────┘
```

每一层有**明确的职责边界**，跨层调用必须通过 Capability 接口。

---

## 第三部分：详细设计

### 3.1 Capability 系统

**定义**：

```typescript
// Capability 是一个类型化的能力契约
interface Capability<Name extends string, Sig> {
  readonly name: Name
  readonly signature: Sig
  readonly version: SemVer
}

// 示例：表单提交能力
const FormSubmit = defineCapability({
  name: 'form.submit',
  version: '1.0.0',
  signature: {
    submit: (data: Record<string, unknown>) => Promise<SubmitResult>
    validate: (data: Record<string, unknown>) => Promise<ValidationResult>
    reset: () => void
  }
})

// 示例：数据查询能力
const DataQuery = defineCapability({
  name: 'data.query',
  version: '1.0.0',
  signature: {
    query: <T>(spec: QuerySpec) => Promise<T[]>
    invalidate: (key: string) => void
  }
})
```

**关键约束**：

- Capability 是**类别级**而不是动作级。`form.submit` 是一个 capability，包含三个方法；不是三个 capability
- Capability 数量受 I5 约束。如果业务需要 100+ 业务动作，应将它们组织为 ~10 个 capability，每个包含 ~10 个方法
- Capability 必须有 SemVer，breaking change 必须升主版本

### 3.2 Provider 与 Requirement

**Provider** 是声明"我在词法作用域内提供这些 capability"的节点：

```json
{
  "type": "FormProvider",
  "id": "userForm",
  "provides": [
    { "capability": "form.submit", "impl": "@./submitImpl" },
    { "capability": "form.state", "impl": "@./stateImpl" }
  ],
  "children": [...]
}
```

**Requirement** 是节点声明"我需要这些 capability 才能工作"：

```json
{
  "type": "SubmitButton",
  "requires": ["form.submit"],
  "on": {
    "click": { "use": "form.submit", "method": "submit" }
  }
}
```

**编译期检查**：

- 每个节点的 `requires` 必须能在词法祖先链的 `provides` 中找到匹配
- 找不到匹配 → 编译错误（非 runtime 错误）
- 类型签名不匹配 → 编译错误

**与 React Context 的关键差异**：

- React Context 是 runtime 概念，类型检查依赖 TypeScript 自觉
- Cascade Capability 是**编译期一等概念**，编译失败就无法生成 IR
- React Context 通过 hook 调用获取（runtime lookup），Cascade 通过 ResolvedRef 访问（编译期固化）

### 3.3 Binding 系统

**Binding** 是数据通道，**不是**表达式：

```json
{
  "type": "Input",
  "bindings": {
    "value": { "source": "@form.state.fields.username", "mode": "two-way" },
    "disabled": { "source": "@form.state.isSubmitting", "mode": "read" }
  }
}
```

**关键约束**：

- 所有 binding 是**显式的**——没有 `${...}` 字符串表达式自动解析
- `mode` 必须显式：`read` / `write` / `two-way`
- source 必须能编译期解析为 ResolvedRef
- 类型必须匹配（编译期检查）

**为什么不用表达式**：

- 表达式（如 `${formData.x + 1}`）混合了"取值"和"计算"
- Cascade 把它们分开：取值用 Binding，计算用 Computed（一种特殊 capability）

```json
{
  "type": "Display",
  "bindings": {
    "text": {
      "source": "@compute.fullName",
      "mode": "read"
    }
  }
}
```

其中 `compute.fullName` 是一个被 ComputeProvider 提供的 capability：

```json
{
  "type": "ComputeProvider",
  "provides": [
    {
      "capability": "compute.fullName",
      "impl": {
        "deps": ["@form.state.fields.firstName", "@form.state.fields.lastName"],
        "fn": "(first, last) => `${first} ${last}`"
      }
    }
  ]
}
```

这看起来更繁琐，但带来：

- 计算依赖**显式**（编译期可见）
- 计算结果**可缓存**（依赖明确）
- 计算逻辑**可测试**（不再藏在表达式字符串里）

### 3.4 ResolvedRef

**问题**：传统低代码用字符串引用（`@form.state.fields.username`），runtime 必须做字符串解析、name lookup、scope walking。

**Cascade 的方案**：编译期把所有字符串引用解析为稳定 token：

```typescript
// 作者写的 JSON
{ "source": "@form.state.fields.username" }

// 编译后的 IR
{
  "source": {
    "_ref": "ref_8a7f3c2e",  // 编译期分配的稳定 ID
    "_capability": "form.state",
    "_path": ["fields", "username"],
    "_type": "string"
  }
}
```

**runtime 接口**：

```typescript
interface Runtime {
  // 注意：没有 lookupByName(name: string)
  resolve<T>(ref: ResolvedRef<T>): T;
  bind<T>(source: ResolvedRef<T>, sink: ResolvedRef<T>, mode: BindingMode): Subscription;
}
```

**收益**：

- runtime 不再做字符串查找，性能可预测
- 重命名一个 capability 是**编译期重写**，不是 runtime 字符串替换
- 类型完全保留到 runtime，不再是 `any`

### 3.5 CompilationUnit

**CompilationUnit** 是编译边界 + 能力隔离单位。一个应用由多个 CompilationUnit 组成：

```
App
├── CompilationUnit: shell      (布局壳，提供 root capability)
│   └── CompilationUnit: page-A
│       └── CompilationUnit: form-X  (动态加载)
└── CompilationUnit: page-B
```

**跨单元通信的唯一方式**：通过 typed Capability 接口

```json
// shell unit 提供
{
  "provides": [
    { "capability": "session", "impl": "..." },
    { "capability": "navigation", "impl": "..." }
  ]
}

// page-A unit 必须显式声明它需要这些
{
  "exports": ["page.user.detail"],
  "requires": ["session", "navigation"],
  ...
}
```

**动态加载**：

```typescript
// 动态加载一个远程 unit
const formUnit = await runtime.loadUnit('https://cdn/form-x.cir');

// 类型检查在加载时发生
formUnit.requires; // ["form.submit", "data.query"]
formUnit.exports; // ["form.user-edit"]

// 必须显式 mount 到一个能满足其 requires 的位置
parent.mount(formUnit, {
  capabilities: { 'form.submit': mySubmit, 'data.query': myQuery },
});
```

如果 capability 接口不兼容，加载失败——**而不是 runtime 时崩溃**。

### 3.6 Effect 与生命周期

每个 CapabilityImpl 有明确的生命周期：

```typescript
interface CapabilityImpl<C extends Capability<any, any>> {
  setup(ctx: ProviderContext): C['signature'];
  teardown?(): void;
}
```

**与主流框架的差异**：

- 主流：effect 是组件 lifecycle 的副产品，难以独立管理
- Cascade：effect 是 capability 的一等公民，独立 setup/teardown

### 3.7 事件系统

**事件不是字符串名，而是绑定到 capability 方法**：

```json
{
  "type": "Button",
  "requires": ["form.submit", "navigation"],
  "on": {
    "click": [
      { "use": "form.submit", "method": "submit", "args": { "data": "@form.state" } },
      { "use": "navigation", "method": "push", "args": { "to": "/success" } }
    ]
  }
}
```

**关键约束**：

- `use` 必须出现在 `requires` 中（编译期检查）
- `method` 必须是 capability 签名中的方法（编译期检查）
- `args` 中的 ref 必须类型匹配（编译期检查）
- 数组语义是**顺序执行 + 短路于错误**（如果需要并行/条件，使用 flow capability）

### 3.8 条件与列表

**条件渲染**：

```json
{
  "type": "Conditional",
  "when": { "source": "@auth.isLoggedIn", "mode": "read" },
  "then": { "type": "Dashboard", ... },
  "else": { "type": "LoginForm", ... }
}
```

**列表渲染**：

```json
{
  "type": "List",
  "items": { "source": "@data.users", "mode": "read" },
  "itemKey": "id",
  "template": {
    "type": "UserCard",
    "bindings": {
      "user": { "source": "@item", "mode": "read" }
    }
  }
}
```

**关键约束**：

- 列表项的 `@item` 是**词法作用域内**的临时 capability
- 列表项可以有自己的 Provider（局部状态）
- 列表项的 capability 不会泄漏到外部

---

## 第四部分：作者面设计

### 4.1 三种 Authoring Surface

Cascade 支持三种作者面，**它们都编译到同一个 IR**：

#### A. JSON（机器友好，工具链入口）

```json
{
  "type": "FormProvider",
  "id": "userForm",
  "provides": ["form.submit", "form.state"],
  "children": [
    {
      "type": "Input",
      "bindings": { "value": "@form.state.fields.name" }
    },
    {
      "type": "Button",
      "requires": ["form.submit"],
      "on": { "click": { "use": "form.submit", "method": "submit" } }
    }
  ]
}
```

#### B. Visual Editor（用户友好，与 JSON 双向同步）

可视化编辑器**不是 JSON 之上的另一层抽象**，而是 JSON 的**结构化呈现**：

- 拖拽组件 = 修改 JSON 树
- 设置 binding = 通过下拉菜单选择可见的 ResolvedRef（编译期约束直接体现在 UI 中）
- 试图引用不可见的 capability = UI 上根本不显示该选项

**这是 Cascade 的关键 UX 创新**：编译期约束**不是错误提示**，而是**UI 上不可能犯错的设计**。

#### C. TypeScript DSL（程序员友好，类型完整）

```typescript
const userForm = FormProvider({
  id: 'userForm',
  provides: [FormSubmit, FormState],
  children: [
    Input({ value: bind(formState.fields.name) }),
    Button({
      requires: [FormSubmit],
      on: { click: use(FormSubmit).submit() },
    }),
  ],
});
```

TypeScript DSL 编译到同一 IR；它的优势是 IDE 完整支持，劣势是不能被可视化编辑器读取。

### 4.2 Authoring Surface 的选择策略

| 用户类型               | 推荐 surface         |
| ---------------------- | -------------------- |
| 业务用户、产品经理     | Visual Editor        |
| 前端开发者             | TypeScript DSL       |
| 自动化生成（AI、模板） | JSON                 |
| 跨工具协作             | JSON（作为交换格式） |

**关键**：三种 surface **不是分裂**，而是**同一 IR 的三种视图**。一个项目可以混用，因为它们最终都编译到同一 IR。

---

## 第五部分：与主流框架的详细对比

### 5.1 vs AMIS

| 维度        | AMIS                    | Cascade                         |
| ----------- | ----------------------- | ------------------------------- |
| Authoring   | JSON Schema             | JSON / Visual / TS DSL，统一 IR |
| Action 解析 | 全局 registry，字符串名 | 词法作用域，编译期 ResolvedRef  |
| 数据/能力   | 同一 scope，混用        | 分离，类型化                    |
| 编译边界    | 无（JSON = runtime）    | 有（compiler 强制）             |
| 类型检查    | 弱（JSON Schema 验证）  | 强（编译期 capability 类型）    |
| 错误时机    | 大部分 runtime          | 大部分 compile-time             |
| 学习曲线    | 低（拖拽即用）          | 中（需理解作用域）              |
| 重构成本    | 高（字符串引用）        | 低（编译期重写）                |

**Cascade 的代价**：作者必须理解作用域概念，不能像 AMIS 那样"任何地方都能引用任何东西"。

### 5.2 vs Formily

| 维度        | Formily                 | Cascade                             |
| ----------- | ----------------------- | ----------------------------------- |
| 核心抽象    | 响应式 schema + effects | Capability + Provider + Binding     |
| 副作用管理  | effects 是脚本式        | CapabilityImpl 是类型化、生命周期化 |
| 跨字段联动  | reactions 字符串        | typed Binding                       |
| Schema 驱动 | 是                      | 是                                  |
| 编译边界    | 无                      | 有                                  |

**Cascade 的代价**：Formily 的 reactions 写起来短，Cascade 的 Binding 写起来长但显式。

### 5.3 vs Retool / Appsmith

| 维度       | Retool             | Cascade                 |
| ---------- | ------------------ | ----------------------- |
| 定位       | 内部工具 SaaS 平台 | 框架（self-hosted）     |
| Query 系统 | runtime 解释       | 编译期类型化 capability |
| 多用户协作 | 平台原生           | 取决于宿主实现          |
| 部署模型   | SaaS / on-prem     | 任意（框架而非平台）    |

**Cascade 不与 Retool 直接竞争**——Retool 是平台，Cascade 是框架。Cascade 更像"用来构建下一代 Retool 的底层"。

### 5.4 vs Builder.io / Plasmic

| 维度            | Builder.io / Plasmic    | Cascade                     |
| --------------- | ----------------------- | --------------------------- |
| 编译策略        | 一次性 codegen 到 React | 持续编译到自有 IR + runtime |
| 跨框架          | 是（Mitosis）           | 否（专注一个 runtime）      |
| 词法 capability | 否                      | 是（核心创新）              |
| 类型化 effects  | 否                      | 是                          |

**关键差异**：Plasmic 把"编译"作为**逃离低代码运行时**的手段（生成代码后即放弃 runtime）；Cascade 把"编译"作为**强化低代码运行时**的手段（runtime 仍是核心，但消费的是固化后的 IR）。

### 5.5 vs JSON Schema Form / React Hook Form

这些是**纯表单库**，不在 Cascade 的对标范围。Cascade 的能力远超表单。

---

## 第六部分：相比主流框架的具体改进

### 改进 1：编译期捕获 80% 的 action 误用 bug

**主流痛点**：

```json
// AMIS 中
{ "type": "button", "actionType": "submitForm", "target": "userForm" }
// 如果 "userForm" 不存在，runtime 才报错（甚至静默失败）
```

**Cascade**：

```json
{ "type": "Button", "requires": ["form.submit"], "on": { ... } }
// 编译期就知道：作用域内是否有 form.submit；如果没有，编译失败
```

### 改进 2：重命名重构成本接近零

**主流痛点**：改一个 form 的 name = 全局搜索字符串 = 高风险

**Cascade**：name 仅是调试标签；引用是 ResolvedRef；改 name 不需要任何重写

### 改进 3：可见性是 UI 设计而非错误提示

**主流痛点**：作者写 `${formData.x}`，但 `formData` 在当前作用域不可见 → 写完后 runtime 报错 / 拼写错误难发现

**Cascade**：可视化编辑器的 binding 选择器**只显示当前作用域可见的 capability**——根本无法选择不可见的东西

### 改进 4：动态加载有类型边界

**主流痛点**：远程加载的 schema 与本地系统通过隐式约定耦合，加载失败时崩溃

**Cascade**：远程 unit 在加载时做 capability 接口匹配，不兼容则**加载失败而非运行时崩溃**

### 改进 5：性能可预测

**主流痛点**：runtime 字符串查找性能取决于数据结构和实现细节

**Cascade**：runtime 通过 ResolvedRef 直接访问，无字符串查找，性能可静态预测

### 改进 6：三种作者面共享一个 IR

**主流痛点**：可视化和 JSON 之间常有"导出后无法导入"的损失

**Cascade**：三种 surface 都编译到同一 IR，互相转换无损失

### 改进 7：能力升级有 SemVer

**主流痛点**：升级一个 action 的参数 = 全局搜索使用点 = 高风险

**Cascade**：Capability 有 SemVer，breaking change 在编译期被捕获

---

## 第七部分：明确不解决的问题

为避免 Cascade 被夸大，必须明确它**不解决**：

### 不解决 1：表达式求值的安全性

作者写 `(first, last) => \`${first} ${last}\`` 仍是 JS 字符串，仍需 sandbox 求值。Cascade 让依赖显式，但不让求值更安全。

### 不解决 2：非程序员的可达性

Capability / Requirement / Provider 是程序员心智。非程序员只能通过 Visual Editor 间接接触，且 Editor 必须做大量"概念隐藏"工作。**这是产品层问题，不是框架层问题**。

### 不解决 3：业务逻辑的复杂度

Cascade 让"能力如何流通"清晰；不让"业务逻辑如何写"更简单。一个复杂业务流程在 Cascade 下仍然复杂，只是边界更清楚。

### 不解决 4：跨路由广播

Cascade 的词法作用域天然不跨路由。跨路由必须通过 root provider（如 session capability）。这是显式的，但不是"零成本"的。

### 不解决 5：现有低代码生态的迁移

Cascade 是新框架。现有 AMIS / Formily 项目无法自动迁移。提供 codemod 协助，但**不承诺完全自动化**。

---

## 第八部分：实施路线图

### 阶段 0：概念验证（2 周）

- 用 TypeScript 类型系统模拟 Reachable<Required, Provided>
- 验证：TS 类型能否表达词法可见性？
- **失败信号**：TS 表达力不足 → 需自定义类型系统 → 成本上升

### 阶段 1：最小 runtime（1 月）

- 实现 Provider tree、Capability resolution、Binding execution
- 不做 compiler，runtime 直接消费手写 IR
- **失败信号**：行为本质等价于 React Context → 不构成 runtime 创新

### 阶段 2：最小 compiler（2 月）

- JSON → IR lowering
- Requirement check
- ResolvedRef generation
- **失败信号**：T1（编译期捕获率）< 60% → 编译器收益不足

### 阶段 3：作者面试用（3 月）

- 让 3-5 个真实开发者写 5 个真实场景
- 测量 T4（JSON 体积膨胀）和迁移摩擦
- **失败信号**：膨胀 > 2x → 作者面不可接受

### 阶段 4：生态与治理（3 月）

- Visual Editor MVP
- Codemod 从 AMIS / Formily
- Legacy mode 退役计划
- **失败信号**：legacy 占比 18 个月仍 > 60% → 治理失败

**总计**：11 个月，4-6 人。任一阶段触发失败信号 → 回退或放弃。

---

## 第九部分：放弃判据

继承前轮审计的明确放弃判据：

1. 阶段 0 失败：TS 类型系统不足
2. 阶段 1 发现：runtime 等价于 React Context
3. 阶段 2 测得 T1 < 60%
4. 阶段 3 测得 T4 > 2x
5. 任意阶段术语数 > 12
6. 阶段 4 测得 legacy 占比 18 月 > 70%

任一触发 → **不要再坚持**。

---

## 第十部分：诚实定位声明

Cascade **不是**：

- 革命性的新发明
- 适用于所有低代码场景的银弹
- 已被证实的下一代标准

Cascade **是**：

- 三个相邻领域成熟思想（algebraic effects + RSC 编译边界 + typed capability）在 JSON-authoring 低代码场景的精确合流
- 一组可证伪的工程假设（T1-T6）
- 一个值得用 11 个月、4-6 人投入去验证的研究项目
- 一个**带退路的押注**

**适合 Cascade 的团队**：

- 有 1 位深度理解类型系统 + compiler 的人
- 容忍阶段性失败回退
- 对"先把概念边界做清楚，再追求功能广度"有耐心
- 不需要在 6 个月内交付生产级框架

**不适合 Cascade 的团队**：

- 需要立即可用的低代码工具 → 用 AMIS / Formily / Retool
- 要求所有用户都是非程序员 → Cascade 的核心心智过高
- 不能投入 compiler 开发资源 → Cascade 仅有 runtime 不构成完整方案
- 期望"立刻就比主流好" → 主流盆地虽脏，但是已知的脏

---

## 结语

Cascade 不会让低代码"变简单"。它让低代码"变清晰"。

**简单 ≠ 清晰**：AMIS 是简单的（拖一拖就能跑），但不清晰（边界脏，bug 难定位）。
**清晰 ≠ 简单**：Cascade 是清晰的（每个引用、每个能力都有明确出处），但不简单（作者要理解作用域）。

如果你的痛点是"低代码做不出复杂应用"，Cascade 不是答案——能不能做出来取决于业务复杂度本身。
如果你的痛点是"做出来的低代码应用难维护、难重构、难调试"，Cascade 提供了一条可证伪的改进路径。

**最后一次提醒**：本文档是设计，不是已验证的事实。在 T1-T6 被实测之前，Cascade 仍是"工程化假设"，不是"成熟框架"。

请**冷却 2 周**再决定是否启动阶段 0。
