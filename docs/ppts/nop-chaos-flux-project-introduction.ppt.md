# NOP Chaos Flux 项目介绍与开发经验分享（PPT 大纲）

## 演讲信息

- **时长建议**：60~90 分钟
- **受众**：前端工程师、架构师、低代码平台团队、AI 辅助开发实践者
- **结构**：四部分 — 项目概览（20%）→ 架构与设计（30%）→ 开发历史与演变（25%）→ AI 开发经验（25%）

---

## 第一部分：项目概览

### 第 1 页：封面

**NOP Chaos Flux：从零构建现代低代码运行时**

- 副标题：项目介绍、架构演变与 AI 辅助大规模开发实践
- 讲者信息、日期

---

### 第 2 页：一句话定位

**"Schema that executes, not just renders."**

- Flux 不是一个 UI 组件库，也不是一个应用框架
- 它是一个 Schema 驱动的前端运行时——JSON 描述的不仅是页面外观，还参与执行
- 围绕七个原语构建的完整概念模型，表单/表格/对话框/设计器都是派生系统

---

### 第 3 页：为什么要重写 AMIS

**AMIS 的两个结构性限制：**

- **Schema 层**：平行字段膨胀——每个属性都需要 `xxx` + `xxxOn` 变体（`disabled`/`disabledOn`、`visible`/`visibleOn`...），字段数量翻倍，维护成本飙升
- **运行时层**：MobX-State-Tree 紧耦合——每个渲染器实例对应一个 MST store 节点，store 树与组件树深度绑定，创建销毁开销大，跨组件通信必须冒泡

**Flux 的核心转变：**

- 从"运行时解释 JSON"到"编译期分类 + 运行时执行编译产物"
- 一个字段名统一静态值与动态表达式，编译器区分，而非 schema 作者区分

---

### 第 4 页：NOP 平台中的定位

| 维度     | NOP Chaos Flux             | NOP Chaos Next       |
| -------- | -------------------------- | -------------------- |
| 定位     | 低代码运行时和渲染框架     | 前端应用框架和脚手架 |
| 核心能力 | 基于七个原语的运行时       | 扩展系统 + 插件系统  |
| 渲染层   | 自定义渲染器架构           | 基于 AMIS            |
| 用途     | 平台团队构建低代码基础设施 | 业务团队构建企业应用 |

- Flux = "如何从 JSON 生成 UI"（基础运行时）
- Next = "如何构建可扩展业务应用"（应用框架）
- 两者可协作：Next 可集成 Flux 的设计器和运行时能力

---

### 第 5 页：项目规模一览

| 指标               | 数值                                   |
| ------------------ | -------------------------------------- |
| 开发周期           | 50 天（2026-03-15 ~ 05-03），48 天活跃 |
| Workspace packages | 27 个                                  |
| TypeScript 源文件  | 1,207 个（.ts 737 + .tsx 470）         |
| 源代码总量         | 199,769 行（有效代码 175,596 行）      |
| 测试代码           | 80,410 行（422 个测试文件，占比 39%）  |
| 文档文件           | 922 个 Markdown                        |
| 文档总量           | 230,116 行                             |
| Git 变更量         | +765K / -291K                          |
| 开发日志           | 46 天完整日志                          |
| 投入               | 1 名开发者 + AI                        |

---

### 第 6 页：技术栈与模块结构

**技术栈：**

- React 19 · TypeScript 6 · Zustand · Vite 8 · Vitest 4 · Tailwind CSS 4 · pnpm workspace

**核心流水线（6 层依赖链）：**

```
flux-core → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react
```

**功能家族：**

| 层           | 包                                                                       | 职责                                   |
| ------------ | ------------------------------------------------------------------------ | -------------------------------------- |
| 核心合约     | `flux-core`                                                              | 类型、常量、纯工具                     |
| 公式层       | `flux-formula`                                                           | 表达式/模板编译                        |
| 编译层       | `flux-compiler`                                                          | Schema 编译、归一化、诊断              |
| 动作核心     | `flux-action-core`                                                       | 动作降低、控制流                       |
| 运行时       | `flux-runtime`                                                           | Scope、Action、验证、Form/Page Runtime |
| React 桥接   | `flux-react`                                                             | Hooks、Render Handles                  |
| 渲染器       | `flux-renderers-basic/form/form-advanced/data`                           | 页面/表单/数据渲染                     |
| 设计器       | `flow-designer-*`, `report-designer-*`, `spreadsheet-*`, `word-editor-*` | 领域编辑器                             |
| 共享基础设施 | `ui`, `tailwind-preset`, `theme-tokens`, `flux-i18n`                     | UI 组件/样式/国际化                    |
| 诊断         | `nop-debugger`                                                           | 框架级调试基础设施                     |
| 集成展示     | `apps/playground`                                                        | Playground 应用                        |

---

## 第二部分：架构与设计

### 第 7 页：七个原语

Flux 的核心词汇被刻意保持精简。七个原语是一切功能的基础：

| 原语                | 职责                                         |
| ------------------- | -------------------------------------------- |
| **Template**        | 编译时不可变程序结构，区域组合，生命周期锚定 |
| **ScopeRef**        | 词法数据环境（数据链）                       |
| **Value**           | 统一值语义——字面量/表达式/模板/数组/对象     |
| **Resource**        | 运行时拥有的值生产者（如数据加载）           |
| **Reaction**        | 声明式 watch/effect 原语                     |
| **Capability**      | 副作用的唯一授权通道                         |
| **Host Projection** | 只读宿主状态投影到 schema 可见 scope         |

**核心观点**：表单、表格、对话框、设计器运行时、验证，都是这七个原语之上的派生系统。

---

### 第 8 页：核心设计理念 — 统一值语义

**AMIS 的问题**：`disabled` / `disabledOn` / `classNameExpr` — 值的语义差异被提升到对象结构层面

**Flux 的解法**：一个字段名，编译器区分值的类型

```typescript
type CompiledValueNode<T> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledStringTemplate<T> }
  | { kind: 'array-node'; items: CompiledValueNode[] }
  | { kind: 'object-node'; keys: string[]; entries: Record<string, CompiledValueNode> };
```

**收益**：

- Schema 字段减半，`disabled` 就是 `disabled`
- 组合与继承无歧义
- 静态值走零成本快路径，动态值独立追踪引用

---

### 第 9 页：执行管线 — 编译优先

```
Schema/JSON → 编译期分类 → 运行时实例化 → React 渲染 → 渲染器/设计器/Debugger
```

**AMIS vs Flux 的根本差异：**

| AMIS 运行时行为       | Flux 编译产物                                    |
| --------------------- | ------------------------------------------------ |
| 值类型运行时判断      | `CompiledValueNode` 五种静态节点                 |
| Schema 运行时遍历     | `TemplateNode` 不可变图（编译一次，实例化多次）  |
| 动作运行时解析        | `CompiledActionProgram` IR                       |
| 宿主合约运行时接线    | `CapabilityProjectionManifest` 编译期可见/可校验 |
| Schema 问题运行时暴露 | 编译期诊断（未知属性、合约形状校验）             |

**核心原则**：运行时只执行编译产物，不做额外判断。

---

### 第 10 页：ScopeRef — 词法作用域与数据链

- `ScopeRef` 是纯数据作用域，通过 prototype 链实现惰性词法查找
- `readVisible()` 提供惰性视图，`materializeVisible()` 仅在显式展平边界调用
- per-path 精细订阅：字段 A 变更不唤醒字段 B 的订阅者
- 数据与能力正交分离：`ScopeRef` 承载数据，`ActionScope` 承载能力

---

### 第 11 页：渲染器合约

所有渲染器遵循统一的 `RendererComponentProps` 模式：

| 数据源          | 提供内容         | 用途              |
| --------------- | ---------------- | ----------------- |
| `props.props`   | 编译后的运行时值 | Schema 驱动的值   |
| `props.meta`    | 编译后的元数据   | 控制状态          |
| `props.regions` | 预编译子渲染句柄 | 渲染子片段        |
| `props.events`  | 运行时事件处理器 | 事件绑定          |
| `props.helpers` | 稳定运行时辅助   | dispatch/evaluate |

**禁止**：渲染器直接访问 store，必须通过标准 hooks。

---

### 第 12 页：域桥接模式 — 复杂设计器的集成方式

复杂设计器（Flow Designer、Report Designer、Spreadsheet）通过域桥接模式集成：

```
Renderer UI Events → Bridge Callbacks → Command Adapter → Core Mutations
```

- 核心包提供纯逻辑运行时（零 React 依赖）
- 渲染器包提供 React 集成
- 画布通过桥接回调解耦，可替换而不影响核心逻辑
- 宿主投影通过 `HostCapabilityProjectionManifest` 收紧为编译期可见合约

---

### 第 13 页：样式系统设计

**两条规则：**

1. **布局渲染器**（container, flex, page）只发射标记类（`nop-container`, `nop-flex`），标记类零视觉样式
2. **Widget 渲染器**（table, condition-builder 等）是完整自包含的 UI 控件

- 间距通过 `stack-*`/`hstack-*` 别名在 schema 中显式声明
- 使用 shadcn/ui + Tailwind CSS 作为视觉基线
- `classAliases` 机制实现可复用的 Tailwind 类定义
- 无 BEM，使用 `data-slot` + 语义标记 + Tailwind visual classes

---

## 第三部分：开发历史与演变

### 第 14 页：时间线总览

| 阶段     | 时间          | 主题                                                                |
| -------- | ------------- | ------------------------------------------------------------------- |
| 第一阶段 | 03-20 ~ 03-23 | 核心概念确立、Bug 分析修复、调试器诞生、ActionScope/Import 语义     |
| 第二阶段 | 03-23 ~ 03-27 | Flow Designer 从概念验证到生产级                                    |
| 第三阶段 | 03-25 ~ 03-29 | AMIS→Flux 重命名、样式系统、shadcn/ui 迁移、Report/Spreadsheet 迁移 |
| 第四阶段 | 03-28 ~ 03-31 | Code Editor、Condition Builder、Word Editor、首次架构审计           |
| 第五阶段 | 04-01 ~ 04-03 | 代码审计修复、全面整改、数据源重设计                                |
| 第六阶段 | 04-04 ~ 04-06 | 依赖追踪、源注册表、反应运行时、编程模型文档                        |
| 第七阶段 | 04-06 ~ 04-11 | 编程模型定型、验证设计、HiddenFieldPolicy、Owner Status             |
| 第八阶段 | 04-07 ~ 04-08 | 模板实例化、节点身份体系、编译器诊断                                |
| 第九阶段 | 04-12 ~ 04-20 | 深度审计、性能优化系列、form-advanced 拆分、i18n、动作预编译        |
| 第十阶段 | 04-21 ~ 04-25 | 编译器/动作核心包提取、Import Boundary 收敛、DingFlow 树模式        |

---

### 第 15 页：第一阶段 — 核心概念确立（03-20 ~ 03-23）

**起点**：系统性 Bug 分析和首轮修复

- 5 个运行时 Bug 确认并修复（双状态反同步、并发提交竞争、验证覆盖等）
- 创建 `@nop-chaos/amis-debugger`（后更名 `nop-debugger`），从一开始就定位为 AI 优先的结构化诊断工具

**核心概念确立**：

- `ScopeRef`（数据）与 `ActionScope`（能力）正交分离
- `xui:import` 声明式导入语义
- Flow Designer 包创建，催生分层文档体系

**关键决策**：文档分为"目标态"和"快照态"，避免目标架构与当前实现混淆

---

### 第 16 页：第三~四阶段 — 从 AMIS 到 Flux 的全面迁移（03-25 ~ 03-31）

**重命名浪潮**：

- `amis-schema` → `flux-core`、`amis-runtime` → `flux-runtime`、`amis-react` → `flux-react`
- Window 全局变量从 `__NOP_AMIS_*` 更名为 `__NOP_FLUX_*`

**基础设施成型**：

- `flux-core` 从 1183 行单文件拆分为模块化结构
- shadcn/ui 组件库全量迁移
- `RendererComponentProps` 合约确立
- Code Editor（CodeMirror 6）、Condition Builder、Word Editor 创建

**关键决策**：渲染器合约统一 — 数据来自 `props.props`/`meta`/`regions`/`events`/`helpers`，不直接访问 store

---

### 第 17 页：第六~七阶段 — 运行时架构收敛（04-04 ~ 04-11）

**Formily 对比分析与性能方向**：

- 响应性模型是最关键短板：Pull Model O(节点数 × 表达式数) → Push Model O(依赖者数)
- 决策：保持编译优先平台基线，只允许表单子域本地的薄能力扩展

**核心运行时建设**：

- 依赖追踪与 per-path 精细订阅
- 源注册表 + 反应运行时（自级联保护）
- 动作控制流扩展（`when`/`parallel`/`timeout`/`retry`）
- 表格三级状态所有权（local/controlled/scope）
- `frontend-programming-model.md` 确立为顶层架构基线

**验证体系**：异步运行身份五元组、两种生命周期路径、HiddenFieldPolicy

---

### 第 18 页：第九阶段 — 深度审计与性能优化（04-12 ~ 04-20）

**这是项目密度最高的收敛期**：

- **架构文档一致性审计**：首次全范围检查 `docs/architecture/` 与代码和彼此之间的一致性
- **Plan 82 合约收敛**：xui:imports 生命周期收紧、Surface 家族提取、值适配合约收敛
- **性能优化系列（Plans 100~110）**：9 个并行优化计划，覆盖 Playground 加载、Flux React 热路径、Formula 运行时、Spreadsheet 虚拟化、表单失效、集合渲染器可伸缩性、API 缓存等
- **form-advanced 拆分**：从 `flux-renderers-form`（~15,800 行）拆出 11 个高级渲染器
- **动作预编译 IR**：`CompiledActionProgram` / `CompiledActionNode`，运行时不再混合原始 schema 执行
- **异步治理收敛**：共享 `async-governance.ts` 统一三类运行时异步所有者

---

### 第 19 页：第十阶段 — 编译器独立与包边界硬化（04-21 ~ 04-25）

**最终的三层拆分**：

| 包                 | 职责                                     |
| ------------------ | ---------------------------------------- |
| `flux-compiler`    | 把 Schema 变成可执行产物                 |
| `flux-action-core` | 动作调度、控制流和统一调用出口           |
| `flux-runtime`     | 把编译产物和宿主环境接起来并持有生命周期 |

**关键里程碑**：

- `Base Tree` → `Template` 重命名，强调编译时不可变程序定义的本质
- `Data Domain Owner` 架构基线：复合字段成为显式数据域所有者
- Import Boundary 语义收敛：模块加载去重与作用域命名空间独立运作
- 运行时消除对原始 Schema 对象的回退读取

---

### 第 20 页：三条演变主线

纵观整个历史，有三条并行且同等重要的主线：

**主线 1：编译前移**

- 值分类 → 模板实例化 → 动作预编译 → 宿主合约静态化 → 编译器包提取
- 每一步都是把运行时判断前移到编译期

**主线 2：所有权收敛**

- 隐式双状态 → 显式 staged owner
- object/array/variant-field 对齐 Data Domain Owner
- detail-field/detail-view 保持 staged（确认/取消）语义

**主线 3：边界显式化**

- 运行时接线约定 → 编译期可见合约
- host contract / import boundary / capability manifest
- Capability Projection Manifest 让宿主协议从约定升级为可校验的静态契约

---

## 第四部分：AI 辅助大规模开发经验

### 第 21 页：效率对比

| 维度     | AI 辅助（实际）                                               | 传统团队（估计）                       |
| -------- | ------------------------------------------------------------- | -------------------------------------- |
| 投入     | 1 名开发者 + AI，50 天（1.7 人月）                            | 4-6 名高级前端，3-4 个月（12-24 人月） |
| 产出     | 完整编译-运行时-渲染三层框架 + 4 个设计器 + 调试器 + 文档体系 | 同等范围                               |
| 效率倍数 | 约 **8~16 倍**                                                | —                                      |

**但**：AI 不是加速了每一行代码，而是改变了"一个人能覆盖多大系统"的上限。

---

### 第 22 页：AI 在这个项目里真正替代了什么

**交给了 AI：**

- 大量代码实现
- 文档整理、重构、测试补齐、批量替换、命名收敛
- 方案展开、隐含前提暴露、歧义识别
- 审计候选问题生成

**没有交给 AI：**

- 架构裁决（"这个能力属于哪一层"）
- 完成判定（"是否真的做完了"）
- 方案淘汰（"哪些方案不应该选"）

**形成的人机分工模式：**

- 人定义边界、基线和收口标准
- AI 展开方案、实现代码、补文档、跑验证
- 独立审计把结果拉回当前基线

---

### 第 23 页：最核心的一条教训

**AI 最大的问题不是"不会写"，而是太容易"看起来做完了"。**

仓库历史中反复出现三类问题：

1. 代码、类型、测试、文档都在，但真实路径没打通
2. 旧前提在长上下文里不断被复用，整组文件一起漂移
3. 测试绑定了偶然实现，后来反过来阻碍重构

**在大型框架里比在普通应用里严重得多**——错的不是一个按钮，而是一个抽象边界。

---

### 第 24 页：实践 1 — 文档是权威链，不是知识仓库

**先解决"读什么""信谁""冲突时以谁为准"**

- `docs/index.md` — 统一入口，告诉 AI 和人"遇到什么问题先读什么"
- `docs/architecture/` — 只描述当前成立的设计基线（normative）
- `docs/analysis/` — 比较、探索、审计，不直接当现行合同
- `docs/plans/` — 执行文档，不替代 architecture
- `docs/logs/` — 开发记忆，不是 source of truth

**关键洞察**：AI 不怕材料少，就怕材料没有权威关系。没有优先级的文档体系，AI 会把不同阶段的材料平均成一个错误现实。

---

### 第 25 页：实践 2 — Plan 是收口机制，不是路线图

**一份有用的 plan 必须能回答六个问题：**

1. 当前基线到底是什么？
2. 这次明确要收敛什么？
3. 这次明确不做什么？
4. 每个 slice 的 exit criteria 是什么？
5. 要经过什么验证才算真正落地？
6. 关闭之前由谁来独立审计？

**`completed` 必须来自单独的 closure audit，不允许实现者顺手宣布 done。**

---

### 第 26 页：实践 3 — 开发日志是 AI 的外部化工作记忆

**日志最少记录四件事：**

- 改了什么
- 为什么这么改
- 相关代码/文档/计划路径
- 下一步是什么

**日志的隐藏价值**：保留"为什么不这么做"——某个方向被回滚了、某个能力先收敛文档不强推运行时——这类信息如果不进仓库，后续 AI 容易重走同样的失败路线。

---

### 第 27 页：实践 4 — 验证体系必须比普通项目更强

**根级质量门：**

```bash
pnpm check          # React 19 旧 API / src 构建产物 / 超大文件 / i18n keys
pnpm typecheck      # 全仓类型检查
pnpm build          # 全仓构建
pnpm lint           # eslint + 上述专项检查
pnpm test           # Vitest 全仓测试
```

**高信号规则直接升到 error：**

- `react-hooks/exhaustive-deps: 'error'`
- `react-compiler/react-compiler: 'error'`
- i18n 硬编码字符串检查（先 `warn` → 分批迁移 → 升 `error`）

**核心思想**：能靠机器提前失败的，就不要留给 review。

---

### 第 28 页：实践 5 — 完成判定必须和实现过程解耦

**在这个项目里，"完成"至少要满足：**

1. Live code path 真的经过了这段逻辑
2. Focused verification 有证据
3. Full repo verification 收口
4. 文档已同步到当前基线
5. 计划里的 leftover work 已明确归属
6. 最后还要有独立 closure audit

**接口存在 ≠ 行为落地**。AI 特别容易把类型、接口、方法名的出现当成行为完成。

---

### 第 29 页：实践 6 — 让 AI 做方案展开器，不做架构裁判

**在架构和边界问题上，让 AI 输出 2~4 套方案，然后要求它明确：**

- 这套方案的概念中心是什么
- 哪些复杂度留在核心
- 哪些推给宿主
- 哪些点半年后最可能后悔
- 验证成本和迁移成本

**AI 适合做架构推导，不适合独占架构裁决。**

---

### 第 30 页：实践 7 — 多模型审查要收敛成共识

**三段式审查工作流：**

1. **第一轮**：多个独立审查单元从不同维度发现问题
2. **第二轮**：meta-review 过滤假问题和架构洁癖
3. **第三轮**：独立复核确认哪些问题仍真实存在

**只有经过收敛的结论，才允许进入 owner doc、plan 或正式总结。**

**反例**：同一个模型、同一批上下文复制 18 份，并不会得到 18 份独立判断。

---

### 第 31 页：实践 8 — 调试基础设施按"AI 可消费"设计

`nop-debugger` 不是给人看的面板，而是框架级诊断基础设施：

- 结构化事件模型
- 可查询的自动化诊断 API（`queryEvents`、`getLatestError`、`waitForEvent`）
- inspection 以 live `cid` 为中心
- AI 和 E2E 优先消费调试 API，不读截图

**UI 调试规则**：禁止靠截图分析 UI 问题，优先使用 `innerHTML`、`getComputedStyle`、事件驱动等待。

---

### 第 32 页：一套可复制的 AI 原生开发流程

```
1. 先进对上下文 → docs/index.md
2. 先做边界判断 → 属于哪一层
3. AI 展开多个方案 → 暴露隐含前提
4. Owner doc 固定当前基线
5. 可关闭的 owner plan 推动执行
6. 执行中持续写 docs/logs/
7. 先 focused verification → 再 full repo verification
8. 复杂问题走多源审查 → 再 reconciliation
9. 关闭前强制独立 closure audit
10. 高信号问题持续下沉到 lint/check/test/debugger API
```

---

## 收尾部分

### 第 33 页：架构演变的关键原则

| 原则               | 含义                                                   |
| ------------------ | ------------------------------------------------------ |
| 编译优先           | 运行时只执行编译产物，不做额外判断                     |
| 数据与能力分离     | ScopeRef 承载数据，ActionScope 承载能力，正交分离      |
| 渲染器合约一致性   | 统一 props 模式，不直接访问 store                      |
| 标记类不携带样式   | 布局渲染器零视觉样式，间距显式声明                     |
| 域桥接模式         | 核心包纯逻辑，渲染器包 React 集成，画布可替换          |
| 文档即架构         | 目标态与快照态分离，讨论与规范性文档分离               |
| AI 优先可观测性    | 调试器从第一天起为 AI 设计，非仅给人看                 |
| 设计先行，实现逼近 | 核心设计早在理论研究阶段确立，实现是对设计的逐步精确化 |

---

### 第 34 页：适用边界

**更适合：**

- 大型框架、平台 SDK
- 多包 monorepo
- 长周期、抽象稳定性要求高的系统
- AI 深度参与的开发场景

**不必照搬：**

- 普通 CRUD、短期 MVP
- 单点业务页面
- 局部小需求

**判断标准**：系统是否需要维护一组跨模块共享、长期稳定的抽象边界。

---

### 第 35 页：总结

**关于项目：**

- Flux 证明了围绕精简原语集构建的 Schema 驱动运行时是可行的
- 编译优先 + 正交作用域 + 模板实例化 + 域桥接 = 现代低代码运行时的清晰参考架构

**关于开发方法：**

- AI 项目最重要的不是 prompt，而是约束结构
- 文档是 AI 的路由和基线系统，不是附属品
- Plan 是收口机制，不是路线图
- 完成判定必须和实现过程解耦
- AI 不会自动降低大型框架的开发难度——它只会把你的工程方法同时放大，好的放大，坏的也放大

---

## 附录页

### 附录 A：项目数据速查表

| 指标               | 数值                         |
| ------------------ | ---------------------------- |
| Workspace packages | 27                           |
| TypeScript 文件    | 1,207                        |
| 总代码行数         | ~199,800                     |
| 非测试代码         | 102,156                      |
| 测试代码           | 80,410（422 文件，占比 39%） |
| 文档文件           | 922 个 Markdown              |
| 文档行数           | ~230,100                     |
| 开发周期           | 50 天（48 天活跃）           |
| 日均代码产出       | ~1,830 行（含测试和文档）    |
| 效率倍数           | 约 8~16 倍（vs 传统团队）    |

### 附录 B：推荐阅读

- 项目 README：`README.md` / `README.zh-CN.md`
- 架构导航：`docs/index.md`
- 设计哲学：`docs/articles/flux-design-introduction.md`
- 架构演变史：`docs/articles/flux-architecture-evolution.md`
- AI 开发方法论：`docs/articles/ai-assisted-framework-development-methodology.md`
- AI 最佳实践：`docs/articles/ai-assisted-large-framework-best-practices.md`
- AI 开发经验总结：`docs/articles/ai-native-large-system-development-lessons.md`
- Plan 方法论：`docs/plans/00-plan-authoring-and-execution-guide.md`
- 现有 PPT 大纲（AI 开发专题）：`docs/ppt/nop-chaos-flux-ai-large-scale-development-outline.md`

### 附录 C：演示建议

- 每页建议 1.5~2.5 分钟
- 第三部分（架构）适合配合代码/文档截图
- 第四部分（AI 经验）适合配合仓库实际文件和 git log
- 可选 Live Demo：`pnpm install && pnpm dev` → Playground 展示
- 可选 30 分钟压缩版：跳过第三部分细节，保留第 14~16 页时间线 + 第 20 页三条主线
