# Cascade vs nop-chaos-flux: Deep Comparative Analysis

> **分析日期**: 2026-05-02
> **对标文档**: `docs/analysis/2026-05-02-new-design-cascade.md`
> **当前项目基线**: nop-chaos-flux (以下称 Flux)

---

## 0. Executive Summary

Cascade 是一个**学术级设计提案**，以 Capability + Provider + Requirement 为核心，追求编译期完全解析、runtime 零字符串查找的理想架构。nop-chaos-flux 是一个**工程级生产框架**，以七原语闭包（Template/ScopeRef/Value/Resource/Reaction/Capability/Host Projection）为骨架，已在表单、表格、设计器、电子表格等多个领域落地。

**核心结论**：

- Cascade 在**概念纯粹性**和**编译期安全**维度更优，但尚未经过工程验证
- Flux 在**架构完备性**、**可落地性**、**已有生态**维度显著领先
- 两者共享大量深层设计直觉（词法作用域、编译/运行时分离、能力隔离），但 Cascade 更激进、更理想化
- Cascade 对 Flux 的参考价值集中在**编译期能力检查**和**Binding 显式化**两个方向

---

## 1. 哲学与根决定对比

### 1.1 核心分歧点

| 根决定            | Cascade                                                                                      | Flux                                                                                      | 判定                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **name 的角色**   | 仅调试标签，不承担引用语义                                                                   | `name` 同时是字段路径和数据绑定路径；`componentId`/`componentName` 承担实例定位           | Cascade 更纯粹但更激进；Flux 更务实但更混乱                           |
| **action 可见性** | 编译期词法解析 + ResolvedRef                                                                 | 词法 `ActionScope` 链 + runtime 分发                                                      | **方向一致**，Cascade 更激进（编译期固化），Flux 更务实（运行时查链） |
| **JSON 角色**     | 仅是 authoring surface；runtime 消费编译后 IR                                                | JSON 是主要 authoring surface，编译为 `TemplateNode`/`CompiledTemplate` 后由 runtime 消费 | **方向一致**，Flux 已有编译管线                                       |
| **原始语义**      | 7 个术语：Capability/CapabilityImpl/Provider/Requirement/Binding/ResolvedRef/CompilationUnit | 7 个原语：Template/ScopeRef/Value/Resource/Reaction/Capability/Host Projection            | 术语体系不同但数量相同（均为 7）；Flux 原语覆盖更广                   |

### 1.2 哲学定位差异

| 维度           | Cascade                                        | Flux                                                        |
| -------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| **设计目标**   | 让低代码"变清晰"——引用/能力都有明确出处        | 让低代码"可执行"——从 JSON 到可交互 UI 的完整运行时          |
| **取舍倾向**   | 宁可繁琐也要显式（Binding 写法冗长但依赖明确） | 允许隐式便利（`${expr}` 语法糖、全局 action registry 兼容） |
| **定位层级**   | 框架内核（类似"下一代 Retool 的底层"）         | 完整平台执行核心（含表单、验证、数据源、设计器等）          |
| **设计成熟度** | 设计阶段，T1-T6 未验证                         | 生产级，多领域已落地                                        |

---

## 2. 架构分层对比

### 2.1 Cascade 五层架构

```
Authoring Layer → Compiler Layer → IR Layer → Runtime Core → Host Layer
```

### 2.2 Flux 五层架构

```
SchemaCompiler → ExpressionCompiler → RendererRuntime → Store/Scope → React Renderer
```

加上平台层：

```
Authoring Model → Loader/Assembly → Flux Execution Model → Host/Domain Runtimes
```

### 2.3 分层对比分析

| 维度             | Cascade                                             | Flux                                                                                           | 评价                              |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------- |
| **编译边界强度** | 极强：JSON→IR 是硬边界，runtime 消费 IR 不消费 JSON | 强：Schema→TemplateNode 是编译边界，但 runtime 仍保留一些字符串查找（action 分发、scope path） | Cascade 理论更优；Flux 实际更灵活 |
| **IR 独立性**    | IR 是独立可分发产物（`.cir` 文件），可远程加载      | `CompiledTemplate`/`TemplateNode` 是内存产物，不可独立分发                                     | Cascade 更有野心；Flux 当前够用   |
| **跨单元通信**   | 只能通过 typed Capability 接口                      | 通过 `ActionScope` 词法查找 + `ComponentHandleRegistry` 实例定位 + built-in 分发               | 方向一致但 Flux 多通道            |
| **编译单元边界** | `CompilationUnit` 是一等概念，可嵌套，可动态加载    | 编译边界隐含在 Template 中；动态加载通过 `dynamic-renderer` 实现                               | Cascade 更明确                    |

**判定**：架构分层方向高度一致。Flux 已有完整编译管线和分层设计，Cascade 的额外贡献在于 IR 可分发性和 CompilationUnit 作为一等概念。

---

## 3. Capability/Action 系统对比

### 3.1 Cascade 的 Capability 模型

```typescript
interface Capability<Name extends string, Sig> {
  name: Name; // 类型化能力名
  signature: Sig; // 完整签名
  version: SemVer; // 语义化版本
}
```

- Provider 声明 provides，节点声明 requires
- 编译期检查 requires ≤ provides
- 通过 ResolvedRef 固化引用
- `form.submit` 是一个 capability，包含 submit/validate/reset 三个方法

### 3.2 Flux 的 Capability 模型

Flux 的 Capability 是七原语之一：

- **built-in platform actions**: `ajax`、`setValue`、`openDialog` 等
- **instance-targeted**: `component:submit`、`component:refresh`（通过 `ComponentHandleRegistry`）
- **namespace-targeted**: `designer:addNode`、`demo:open`（通过 `ActionScope`）
- `ActionNamespaceProvider` 提供 `invoke(method, payload, ctx)` 接口

### 3.3 深度对比

| 维度           | Cascade                                                      | Flux                                                                                  | 评价               |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------ |
| **类型化程度** | 强：每个 capability 有完整签名和 SemVer                      | 中：`FluxValueShape` + `CapabilityMethodContract` 描述签名，但 runtime 查找仍按字符串 | Cascade 更严格     |
| **编译期检查** | requires/provides 在编译期完全匹配                           | 编译期有 host action 验证和 diagnostics；运行时仍有可能找不到 handler                 | Cascade 理论上更好 |
| **版本化**     | 每个 capability 有 SemVer，breaking change 必须升主版本      | 无 capability 版本化概念                                                              | Cascade 独有优势   |
| **引用稳定性** | ResolvedRef 是编译期分配的稳定 token，runtime 不做字符串查找 | `action: "designer:addNode"` 仍是字符串分发                                           | Cascade 更激进     |
| **能力粒度**   | 类别级（`form.submit` 包含多个方法）                         | 分散在多个 runtime 层                                                                 | 各有优劣           |
| **实例定位**   | 无单独概念，通过 capability 绑定隐式定位                     | `ComponentHandleRegistry` 显式按 componentId/componentName 定位                       | Flux 更实际        |

### 3.4 关键洞察

Flux 的 Capability 系统（`ActionScope` + `ComponentHandleRegistry`）在**概念上**已经接近 Cascade 的 Provider/Requirement 模型：

- `ActionScope` 的词法命名空间查找 ≈ Cascade 的 Provider 链
- `xui:imports` 的声明式导入 ≈ Cascade 的 Requirement 声明
- `ComponentHandleRegistry` 的实例定位 = Cascade 没有的额外维度

但 Flux 缺少：

1. **编译期 requires/provides 匹配**
2. **ResolvedRef 稳定引用**
3. **Capability SemVer**

---

## 4. 数据绑定与表达式对比

### 4.1 Cascade 的 Binding 模型

```json
{
  "type": "Input",
  "bindings": {
    "value": { "source": "@form.state.fields.username", "mode": "two-way" },
    "disabled": { "source": "@form.state.isSubmitting", "mode": "read" }
  }
}
```

- 所有 binding 显式声明 source、mode、type
- 没有 `${...}` 字符串表达式自动解析
- 计算通过 `ComputeProvider` 显式声明

### 4.2 Flux 的 Value 模型

```json
{
  "type": "input-text",
  "name": "username",
  "disabled": "${isSubmitting}"
}
```

- `name` 隐式建立双向绑定
- `${...}` 表达式模板语法
- 字段规则通过 renderer field metadata 由编译器分类

### 4.3 深度对比

| 维度           | Cascade                                            | Flux                                                                     | 评价                    |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------- |
| **表达式系统** | 不用表达式；取值用 Binding，计算用 ComputeProvider | 完整表达式引擎（`flux-formula`）：字面量、表达式、模板、数组、对象       | **Flux 显著更强**       |
| **作者体验**   | 繁琐：每个数据通道都需要显式 binding 声明          | 灵活：`${expr}` 一行搞定                                                 | Flux 更友好             |
| **依赖显式性** | 极强：所有依赖编译期可见                           | 编译期通过 `CompiledValueNode` 分类依赖，`ScopeDependencyCollector` 收集 | Cascade 更显式          |
| **双向绑定**   | 显式 `mode: "two-way"`                             | 通过 `name` + 表单 runtime 隐式建立                                      | 各有优劣                |
| **计算缓存**   | ComputeProvider 声明 deps，结果可缓存              | `CompiledRuntimeValue` identity reuse + scope subscription               | 方向一致，Flux 已有实现 |
| **模板能力**   | 无内联模板语法                                     | 完整模板编译（`` `Hello ${name}` ``）                                    | Flux 显著更强           |

**判定**：在数据绑定和表达式维度，**Flux 明显优于 Cascade**。Cascade 为追求显式性放弃了表达式引擎，导致作者面极其冗长。Flux 的 `flux-formula` 是核心资产，不应放弃。

---

## 5. 编译系统对比

### 5.1 Cascade 编译器

- JSON → IR：字符串引用 → ResolvedRef
- Requirement-Provider 匹配检查
- 类型检查
- CompilationUnit 边界强制
- 输出：可分发、可缓存、可远程加载的 IR

### 5.2 Flux 编译器

- Schema → `TemplateNode`：region 提取、字段分类、表达式编译
- `CompiledTemplate`/`CompiledValueNode` 价值树编译
- 验证模型编译
- Action precompile（`compileAction`/`compileActions`）
- Host action 验证和 diagnostics
- 输出：内存中的 `CompiledTemplate`

### 5.3 深度对比

| 维度                 | Cascade                                              | Flux                                                                   | 评价             |
| -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- | ---------------- |
| **编译深度**         | 极深：所有引用编译期固化                             | 深：表达式预编译、验证预编译，但 action 名仍运行时解析                 | Cascade 更激进   |
| **编译产物可分发性** | 可分发 `.cir` 文件                                   | 内存产物，不可独立分发                                                 | Cascade 独有     |
| **编译期诊断**       | 极强：引用不存在、类型不匹配、作用域越界全是编译错误 | 强：host action 验证、diagnostics，但部分错误仍运行时暴露              | Cascade 理论更优 |
| **实现成熟度**       | 未实现                                               | 完整实现（`SchemaCompiler` + `ExpressionCompiler` + `ActionCompiler`） | Flux 远超        |

---

## 6. Scope 和作用域对比

### 6.1 Cascade

- Provider 链级联可见
- Capability 沿词法作用域传播
- 跨 CompilationUnit 必须经过 typed Capability 接口
- 列表项的 `@item` 是临时词法 capability

### 6.2 Flux

- `ScopeRef` 词法链：`parent` 指针形成原型链
- `readVisible()` 基于原型链的零分配可见视图
- `ActionScope` 词法链：命名空间沿 action-scope 链向上查找
- `ImportFrame`/`ImportStack` 管理导入的词法可见性
- 片段渲染通过 `render({ bindings })` 创建子作用域

### 6.3 深度对比

| 维度             | Cascade                                    | Flux                                                      | 评价                               |
| ---------------- | ------------------------------------------ | --------------------------------------------------------- | ---------------------------------- |
| **数据作用域**   | Provider 链 + Binding                      | `ScopeRef` 原型链 + `readVisible()`                       | **概念等价**，Flux 已有完整实现    |
| **行为作用域**   | Provider 提供 Capability，Requirement 消费 | `ActionScope` 词法链 + `ComponentHandleRegistry` 实例定位 | 方向一致，Flux 多了实例定位维度    |
| **作用域隔离**   | CompilationUnit 强制隔离                   | `inherit-owner`/`create-owner`/`no-owner` 编译期分类      | 方向一致，Flux 已有实现            |
| **跨作用域通信** | 只能通过 typed Capability                  | `ActionScope` 继承 + Host Projection 只读快照             | Flux 的 Host Projection 是额外维度 |

**判定**：在作用域设计上，**两者高度一致**。Cascade 的 Provider/Requirement 是 Flux 的 `ActionScope` + `xui:imports` 的更形式化表达。

---

## 7. 表单和验证对比

### 7.1 Cascade

- 表单提交是 `form.submit` capability
- 验证是 capability 签名的一部分
- 无详细验证模型

### 7.2 Flux

- `FormRuntime` 是完整的表单运行时
- `ValidationScopeRuntime` 抽象出验证所有权
- 编译期验证图 + 运行时参与
- 字段级/对象级/数组级/作用域根级验证
- 异步验证去抖、取消、优先级
- `create-owner`/`inherit-owner`/`no-owner` 边界分类
- 子作用域 `ChildValidationContract`（ignore/summary-gate/recurse-submit）

**判定**：**Flux 在表单和验证维度远超 Cascade**。Cascade 文档中完全没有详细验证设计，只提到"validate 是 form.submit capability 的一个方法"。Flux 的验证系统是经过深思熟虑的完整架构，包含编译期图、运行时状态、依赖追踪、跨作用域协调等。

---

## 8. 作者面对比

### 8.1 Cascade

三种 Authoring Surface：

1. **JSON** — 机器友好，工具链入口
2. **Visual Editor** — 用户友好，与 JSON 双向同步
3. **TypeScript DSL** — 程序员友好，类型完整

关键 UX 创新：可视化编辑器的 binding 选择器**只显示当前作用域可见的 capability**——不可能犯错。

### 8.2 Flux

单一 Authoring Surface + 工具链：

1. **JSON Schema** — 主要编写面
2. **Playground** — 开发调试环境
3. **Designer** — 未来可视化编辑器

### 8.3 对比

| 维度           | Cascade                        | Flux                    | 评价             |
| -------------- | ------------------------------ | ----------------------- | ---------------- |
| **多面支持**   | 三种 surface 编译到同一 IR     | 当前只有 JSON surface   | Cascade 理论更优 |
| **类型化 DSL** | 有 TypeScript DSL              | 无                      | Cascade 独有     |
| **可视化约束** | 编辑器利用编译约束限制可选范围 | 未实现                  | Cascade 理论更优 |
| **实用成熟度** | 设计阶段                       | JSON surface 已生产可用 | Flux 更实际      |

---

## 9. 运行时性能对比

| 维度           | Cascade                           | Flux                                                      | 评价              |
| -------------- | --------------------------------- | --------------------------------------------------------- | ----------------- |
| **字符串查找** | 不存在（ResolvedRef 直达）        | action 名仍运行时字符串匹配；scope path 查找有优化        | Cascade 理论更优  |
| **静态快路径** | 理论上所有静态路径在 IR 层已消除  | `CompiledRuntimeValue` 区分 static/dynamic，static 零成本 | Flux 已实现       |
| **选择性订阅** | 未设计                            | `useScopeSelector` + scope change paths + 依赖交集过滤    | **Flux 显著更强** |
| **缓存策略**   | ComputeProvider 显式依赖 → 可缓存 | `CompiledRuntimeValue` identity reuse + expression cache  | 方向一致          |

---

## 10. 总体评价矩阵

| 维度         | Cascade | Flux  | 胜出    | 说明                                           |
| ------------ | ------- | ----- | ------- | ---------------------------------------------- |
| 概念纯粹性   | ★★★★★   | ★★★★☆ | Cascade | 7 术语极简，invariant 清晰                     |
| 编译期安全   | ★★★★★   | ★★★☆☆ | Cascade | ResolvedRef + requires/provides 完全编译期检查 |
| 表达式系统   | ★★☆☆☆   | ★★★★★ | Flux    | Cascade 放弃了表达式引擎                       |
| 表单/验证    | ★☆☆☆☆   | ★★★★★ | Flux    | Cascade 无详细验证设计                         |
| 架构完备性   | ★★★☆☆   | ★★★★★ | Flux    | Flux 有完整 7 原语闭包                         |
| 可落地性     | ★★☆☆☆   | ★★★★★ | Flux    | Cascade 未实现                                 |
| 性能优化深度 | ★★★☆☆   | ★★★★☆ | Flux    | Flux 有选择性订阅、依赖追踪                    |
| 作者体验     | ★★☆☆☆   | ★★★★☆ | Flux    | Cascade 的 Binding 太冗长                      |
| 类型化程度   | ★★★★★   | ★★★☆☆ | Cascade | SemVer + 签名 + 编译期检查                     |
| 动态加载     | ★★★★☆   | ★★★☆☆ | Cascade | CompilationUnit + capability 接口匹配          |
| 多面支持     | ★★★★☆   | ★★☆☆☆ | Cascade | 三种 surface 编译到同一 IR                     |
| 已有生态     | ★☆☆☆☆   | ★★★★★ | Flux    | Flux 多领域已落地                              |

---

## 11. 哪个设计更好？

### 短回答：Flux 更好，因为它是一个可工作的完整系统。

### 长回答：

**如果只看架构内核的纯粹性**：Cascade 更好。它的 ResolvedRef、编译期 requires/provides 匹配、no-string-lookup invariant 是更理想的设计。

**如果看工程完备性**：Flux 远超。Flux 有：

- 完整的表达式引擎（`flux-formula`）
- 成熟的验证架构（`ValidationScopeRuntime`）
- 多层能力系统（built-in + instance + namespace）
- React 集成层（hooks、contexts、fragment rendering）
- 多领域落地（表单、表格、设计器、电子表格、报表、流程图）
- 模块化包结构（22 个 workspace packages）
- 完善的文档体系

**Cascade 的代价**（它自己也承认）：

- 作者必须理解作用域概念
- Binding 写法极其冗长（JSON 体积膨胀风险 > 2x）
- 没有表达式引擎（或不使用表达式引擎）
- 需要编译器专家投入
- 11 个月、4-6 人的验证周期

**Flux 的代价**：

- 部分 action 错误只能在运行时暴露
- name 承担了路径和定位双重角色
- 没有统一的 IR 可分发格式

---

## 12. 参考价值分析

### 12.1 高参考价值的设计点

#### 参考 1：编译期能力检查（requires/provides 匹配）

**Cascade 的设计**：

```json
// Provider
{ "type": "FormProvider", "provides": ["form.submit", "form.state"] }

// Consumer
{ "type": "Button", "requires": ["form.submit"], "on": { ... } }

// 编译期检查：requires 的每个 capability 必须在词法祖先链中找到 provides
```

**Flux 现状**：

- `ActionScope` 提供词法命名空间查找
- `xui:imports` 声明依赖
- 但没有编译期 requires/provides 匹配

**如何参考**：

在 `SchemaCompiler` 中增加一个编译阶段：

1. 编译阶段收集每个节点的 action 引用（从 event fields、reaction actions 等中提取 `action` 字段值）
2. 对于 `namespace:method` 形式的 action，检查当前节点的词法祖先链中是否存在对应的 `xui:imports` 声明或 host manifest publication
3. 未匹配的 namespace action 发出 compiler diagnostic（warning 级别，不阻塞编译）
4. 未来可升级为 error 级别

**具体步骤**：

- 在 `packages/flux-compiler/src/schema-compiler/` 新增 `capability-check.ts`
- 在 `SchemaCompiler.compile()` 的 template 组装后、diagnostics 输出前执行
- 利用已有的 `compile-symbol-table.ts` 的 `$` 符号可见性基板
- 参考 `host-action-validation.ts` 的现有验证模式

**预期收益**：将 Cascade 声称的"编译期捕获 80% action 误用 bug"引入 Flux，而不改变 Flux 的 runtime 行为。

---

#### 参考 2：CapabilityMethodContract 强化

**Cascade 的设计**：

```typescript
interface Capability<Name extends string, Sig> {
  name: Name;
  signature: Sig; // 完整方法签名
  version: SemVer; // 语义化版本
}
```

**Flux 现状**：

已有 `CapabilityMethodContract`（`args`/`result`/`description`/`deprecated`）和 `FluxValueShape`，但没有版本化。

**如何参考**：

1. 在 `HostCapabilityProjectionManifest` 的 `capabilities` 中增加 `version?: string` 字段
2. 编译期检查 host manifest version 与消费方期望的 version 兼容性
3. 不引入 SemVer 硬约束（过于激进），而是：
   - manifest 声明 version
   - 消费方可选声明 `minVersion`
   - 编译期比较并发出 diagnostic

**具体步骤**：

- 扩展 `packages/flux-core/src/schema-diagnostics/manifest.ts` 中的 manifest 类型
- 在 `host-action-validation.ts` 中增加 version 兼容性检查
- `domain-host-renderer`（designer-page、report-designer-page 等）在 manifest 中声明 version

---

#### 参考 3：编译期静态引用 token（轻量版 ResolvedRef）

**Cascade 的设计**：

```typescript
// 编译后 IR 不含字符串引用
{ "source": { "_ref": "ref_8a7f3c2e", "_capability": "form.state", ... } }
// Runtime 接口：resolve(ref: ResolvedRef<T>): T
```

**Flux 现状**：

- action 仍通过字符串名分发
- scope path 通过字符串查找

**如何参考（轻量版）**：

不做 Cascade 式的完全 ResolvedRef（成本太高、风险太大），而是：

1. 编译期为每个 `namespace:method` action 引用分配一个稳定 numeric id（`actionRefId`）
2. `CompiledActionProgram` 携带 `actionRefId` 而非原始字符串
3. `ActionScope` 内部维护 `actionRefId → handler` 映射
4. 分发时通过 numeric id 查找而非字符串匹配

**具体步骤**：

- 在 `CompiledActionProgram` 中增加可选 `actionRefId?: number`
- `ActionScope.registerNamespace()` 返回注册的 method → id 映射
- `flux-action-core` 分发时优先使用 `actionRefId` 走快速路径
- 字符串查找降级为 fallback

**预期收益**：分发路径避免字符串匹配，性能可预测。不改作者面，纯内部优化。

---

### 12.2 中等参考价值的设计点

#### 参考 4：ComputeProvider 模式（显式计算依赖）

**Cascade 的设计**：

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

**Flux 现状**：`${firstName + ' ' + lastName}` 表达式已经自动追踪依赖。

**如何参考**：

- 不替代 Flux 的表达式系统（它更有表现力）
- 在需要**显式声明计算依赖**的场景（如可视化编辑器需要展示依赖图）中，可选增加 `xui:computed` 声明式计算
- 这是工具链层面的增强，不改变运行时

---

#### 参考 5：CompilationUnit 作为一等概念

**Cascade 的设计**：

CompilationUnit 是可嵌套、可远程加载、有类型边界的编译单位。

**Flux 现状**：

`dynamic-renderer` 支持延迟加载 fragment，但没有编译单元的概念。

**如何参考**：

- 在 `dynamic-renderer` 的远程加载路径中，引入编译期 capability 接口检查
- 远程 fragment 声明它需要的 namespace，加载时验证宿主环境能提供
- 参考 Cascade 的 `loadUnit` + `mount(capabilities)` 模式

---

#### 参考 6：Binding 显式化（可视化编辑器场景）

**Cascade 的设计**：

binding 选择器只显示当前作用域可见的选项——不可能选择不可见的东西。

**Flux 现状**：

表达式字段接受任意字符串，运行时才能发现引用错误。

**如何参考**：

- 在未来可视化编辑器中，利用 Flux 已有的编译期信息（`ActionScope` 链、`ScopeRef` 结构、host projection 可见字段）构建受约束的选择器
- 利用 `ResolvedAuthoringContract` 和 `RendererDefinition` 的 metadata 提供受限选项
- 这是编辑器/工具链层面的设计，不影响 schema 语法和 runtime

---

### 12.3 低参考价值的设计点

| 设计点                      | Cascade                      | Flux 现状                     | 为何不参考                                                  |
| --------------------------- | ---------------------------- | ----------------------------- | ----------------------------------------------------------- |
| 放弃表达式引擎              | 所有计算通过 ComputeProvider | `flux-formula` 完整表达式引擎 | Flux 的表达式系统是核心资产，放弃它意味着丧失大部分作者体验 |
| name 仅调试标签             | name 不承担引用语义          | name 同时是字段路径           | 改变太激进，破坏所有现有 schema                             |
| 完全消灭 runtime 字符串查找 | ResolvedRef 直达             | 仍有字符串分发                | 成本/收益不成比例；Flux 的字符串查找已足够快                |
| IR 可分发                   | `.cir` 文件远程加载          | 内存编译产物                  | 可通过 `dynamic-renderer` + 预编译缓存实现类似效果          |
| TypeScript DSL              | 类型完整                     | 无                            | 非核心优先级，未来可加                                      |

---

## 13. 参考实施优先级

| 优先级 | 设计点                                                       | 实施难度     | 预期收益               |
| ------ | ------------------------------------------------------------ | ------------ | ---------------------- |
| **P0** | 编译期 namespace action 引用检查（requires/provides 轻量版） | 中           | 编译期发现 action 误用 |
| **P1** | CapabilityMethodContract 版本化                              | 低           | host manifest 版本治理 |
| **P2** | 编译期 action numeric ref 优化                               | 中-高        | 分发路径性能提升       |
| **P3** | 可视化编辑器受约束选择器                                     | 高（工具链） | 作者体验改进           |
| **P4** | ComputeProvider 显式计算声明                                 | 中           | 依赖图可视化、测试     |

---

## 14. 结论

Cascade 是一份**高质量的学术设计文档**，它在编译期安全、类型化 capability、IR 分层等维度的设计思路值得借鉴。但它也是一份**诚实的文档**——它明确承认自己未经验证、需要 11 个月 4-6 人来验证、且有明确的放弃判据。

nop-chaos-flux 是一个**已落地的工程系统**，它在 Flux 的七原语闭包下已经解决了 Cascade 试图解决的问题的大部分，且在表达式系统、表单验证、React 集成、多领域落地等维度远超 Cascade。

**最终建议**：

1. **不要**试图将 Flux 重写为 Cascade——代价远大于收益
2. **应该**从 Cascade 汲取编译期能力检查的设计思路，增强 Flux 的编译期诊断能力
3. **应该**参考 Cascade 的 CapabilityMethodContract 版本化，为 host manifest 增加版本治理
4. **应该**将 Cascade 的"不可能犯错的可视化编辑器"理念作为未来编辑器工具链的设计目标
5. **不应该**为了追求 Cascade 的纯粹性而放弃 Flux 的表达式引擎和灵活的 authoring 体验

Cascade 最大的价值不是作为 Flux 的替代方案，而是作为一面**设计镜子**——它照亮了 Flux 在编译期安全维度可以改进的地方，同时验证了 Flux 在运行时架构上的选择是正确的。
