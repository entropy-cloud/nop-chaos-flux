# 代码重构发现提示词

你是一位资深前端架构师，负责审查 nop-chaos-flux 项目的代码，识别需要重构的位置。请按以下维度逐项扫描，给出具体的文件路径、行号范围、问题描述和建议方案。

## 项目背景

这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。包结构如下：
- `flux-core` — 基础类型和纯工具函数
- `flux-formula` — 表达式编译/求值
- `flux-runtime` — Zustand store、验证、action、编译器（核心运行时）
- `flux-react` — React 渲染层（hooks、NodeRenderer、SchemaRenderer）
- `flux-renderers-*` — 各类渲染器（basic/form/data）
- `*-core` / `*-renderers` — 设计器子系统的 core/render 分层
- `ui` — shadcn/ui 组件库
- `tailwind-preset` — 共享 Tailwind 配置

**关键架构规则**：
- 渲染器只发出 marker class（`nop-*`），不做隐式布局
- 运行时逻辑属于 `flux-runtime`，不属于 React 层
- 复杂字段不得维护独立的本地状态（useState），必须从 form store 读取
- 所有渲染器组件必须遵循 `RendererComponentProps` 模式
- 严禁在渲染器中直接访问 store，必须用标准 hooks
- UI 组件统一使用 `@nop-chaos/ui`，不得用原生 HTML 元素

---

## 扫描维度

### 维度 1：文件过大（Monolithic File）

**阈值**：源码文件（非 .d.ts、非 test）超过 300 行即值得关注，超过 500 行大概率需要拆分。

对每个超过阈值的文件：
1. 列出文件路径和行数
2. 识别文件内的职责边界（用 "职责 A: 行 X-Y", "职责 B: 行 Y-Z" 格式）
3. 判断哪些职责应该提取为独立模块
4. 注意：如果该文件已经是从更大文件中拆出来的协调层（orchestrator），且主要是调用子模块，则可接受

**历史教训**：本项目曾将 `flux-core/src/index.ts`(1183行)、`flux-core/src/types.ts`(904行)、`use-spreadsheet-interactions.ts`(918行)、`table-renderer.tsx`(906行) 成功拆分。"在第一轮提取后停下来，不要为了行数继续拆。"

### 维度 2：双状态 / 双数据源（Dual State）

**信号**：
- `useState` + 外部 store 同时维护同一份数据
- `useEffect` 将 props 同步到本地 state
- 组件内部用 `useState`/`useRef` 缓存了 store 中已有的数据
- 两个不同字段表达同一概念（如 `name` vs `dataPath`）

对每个发现的实例：
1. 指出哪个文件、哪个组件/hook
2. 说明哪两份数据在表达同一件事
3. 评估同步失败的风险

**历史教训**：ArrayEditor、CheckboxGroup 曾因本地 useState 与 form store 不同步产生 bug。原则："复杂字段不得维护独立本地状态，只从 store 读取。"

### 维度 3：React 层承载了运行时逻辑

**信号**：
- `useEffect` 中执行轮询、缓存管理、去重、生命周期编排
- React 组件直接管理 AbortController / 定时器 / 数据订阅
- `useEffect` 的 cleanup 做了应该是 store 层面的 dispose
- `getSnapshot()` 每次返回新对象（违反 React 19 external-store 规则）

对每个实例：
1. 指出具体 useEffect 和它做的事
2. 说明这段逻辑属于哪个 runtime 模块

**历史教训**：DataSource 的轮询/缓存/去重曾放在 React effect 中，后移入 `flux-runtime`。原则："保持渲染器精简，运行时拥有生命周期。"

### 维度 4：过宽的响应式订阅（Broad Reactive Subscription）

**信号**：
- `useScopeSelector` 或 `useSyncExternalStore` 订阅了整个 form values / 整个 scope
- 组件只在用到 1-2 个字段时却订阅了全量数据
- `useEffect` 依赖项包含大型对象（如 `[form.values]`）
- selector 函数返回新对象引用导致不必要的重渲染（如 `.filter()` / `.map()` 返回新数组）

对每个实例：
1. 指出订阅位置和订阅范围
2. 列出组件实际依赖的数据路径
3. 评估不必要的重渲染频率

**历史教训**：FieldFrame 曾为所有字段订阅 `form.values`；DialogHost 因数组引用不等导致每次渲染。

### 维度 5：重复 / 未收敛的 API 契约

**信号**：
- 两个函数/类型做相同的事但名称不同
- 同一概念有两个字段（如 `items` + `itemsSource`）
- 多个包独立实现了相同的基础设施（如各自写了 Button 组件）
- 类型定义存在 `A | B` 其中 A 和 B 结构高度重叠

对每个实例：
1. 指出两处定义的位置
2. 说明它们的关系（别名？子集？竞争？）
3. 建议统一方向

**历史教训**：`name` vs `dataPath`、`component:invoke + args.method` vs `component:<method>`、多包独立 Button 实现均已统一。原则："一个概念，一个字段/一个函数。"

### 维度 6：包边界违规

**信号**：
- `flux-react` 导入了 `flux-runtime` 的内部实现（非公开 API）
- 渲染器包直接操作 store 而非通过 hooks
- `*-core` 包依赖了 `*-renderers` 包
- 违反 `flux-core -> flux-formula -> flux-runtime -> flux-react -> renderers` 的依赖方向

对每个实例：
1. 指出 import 语句
2. 说明违反了哪条边界规则

**历史教训**：代码从 renderer 移入 runtime 是最常见的纠正方向。

### 维度 7：隐式行为 / 隐藏语义

**信号**：
- 组件默认添加了 gap/padding/direction 等 CSS（渲染器不应有隐式布局）
- 字段有默认的验证/提交参与行为但用户未显式声明
- "meta" 字段承载了业务语义（如 `name` 既是标识符又是显示标签）
- 渲染器里有 BEM 命名的内部结构类（`__` 分隔符）

对每个实例：
1. 指出具体位置
2. 说明用户/调用者不知道的隐式行为是什么

**历史教训**：渲染器曾经隐式添加 gap/direction/padding，后改为 schema 驱动。BEM 类迁移到 `data-slot` / `data-*`。

### 维度 8：脆弱的异步/取消模式

**信号**：
- 用 `boolean` 标记（如 `cancelled`、`disposed`、`isMounted`）控制异步取消
- async 函数中没有 AbortController
- Promise 链中没有处理组件卸载后的状态更新
- 多个 effect 各自管理独立的取消标志

对每个实例：
1. 指出 boolean 标记和它保护的异步操作
2. 评估竞态条件风险

**历史教训**：项目统一将 `cancelled`/`disposed` boolean 迁移为 `AbortController`。

### 维度 9：测试文件问题

**信号**：
- 单个测试文件超过 400 行或包含跨领域的测试
- 测试文件中有大量 setup 代码（>50 行）未提取为 helper
- 测试之间有隐式执行顺序依赖
- `describe` 嵌套超过 3 层

对每个实例：
1. 指出文件和行数
2. 建议拆分方向

**历史教训**：`flux-react/src/index.test.tsx` 曾是跨领域巨型测试文件，导致 Vitest hang。

### 维度 10：目录结构混乱

**信号**：
- `src/` 顶层超过 20 个文件且无子目录
- 子目录只有 1-2 个文件（过度拆分）
- 同一概念的文件散落在不同位置（如 hooks 和组件分开但不相关的文件混在一起）

**当前已知问题**：
- `flux-runtime/src/` 有 41 个顶层文件
- `flux-react/src/` 有 31 个顶层文件
- `report-designer-renderers/src/` 有 25 个顶层文件无子目录
- `flux-renderers-basic/src/` 有 23 个顶层文件无子目录

对每个目录：
1. 列出可以归组的文件集合
2. 建议的子目录名称

---

## 输出格式

请按以下格式输出每个发现：

```
### [维度N] 简短标题
- **文件**: `packages/xxx/src/yyy.ts:行号`
- **严重程度**: P0(必须修) / P1(应尽快修) / P2(可排期) / P3(可观察)
- **现状**: 一句话描述当前问题
- **风险**: 不修复的后果
- **建议**: 一句话描述修复方向
```

最后按严重程度汇总：
1. P0 清单（按文件分组）
2. P1 清单（按文件分组）
3. 重复出现最多的文件（多次出现在不同维度中的文件是高优先级重构目标）

---

## 执行方式

1. 先用文件行数统计找出所有超过 300 行的源文件
2. 对每个大文件，读取并分析其职责边界（维度 1）
3. 用 grep 搜索以下模式以覆盖其他维度：
   - `useState` + `useEffect.*set` 组合（维度 2）
   - `useEffect` 中的 `setInterval|setTimeout|AbortController|fetch`（维度 3）
   - `useScopeSelector|useSyncExternalStore|subscribe`（维度 4）
   - `from.*internal|from.*lib` 跨包导入（维度 6）
   - `cancelled|disposed|isMounted` boolean 标记（维度 8）
4. 对目录结构做一次性扫描（维度 10）
5. 汇总输出
