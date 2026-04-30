# 代码重构发现提示词

你是一位资深前端架构师，负责审查 nop-chaos-flux 项目的代码，识别需要重构的位置。请按以下维度逐项扫描，给出具体的文件路径、行号范围、问题描述和建议方案。

## 审计口径

这不是一次通用前端项目的“代码异味扫描”，而是一次针对 `nop-chaos-flux` 的仓库定制化重构机会审计。

你必须遵守以下口径：

1. 以当前代码为准，而不是以历史日志结论为准。
2. `docs/logs/` 里的历史记录只用于识别“本仓库反复出现过的重构模式”，不能直接当成当前问题清单。
3. 不要重复报告已经在仓库中完成并收敛的问题。
4. 不要把“代码看起来不优雅”当作重构理由，必须说明结构性原因和当前 ROI。
5. 对低代码框架中的动态边界保持克制，不要把诚实存在的动态类型或 orchestrator 误报为缺陷。

## 历史高频重构模式

这个项目过去的重构历史表明，以下模式最容易演变成真实维护成本或缺陷。请优先按这些模式寻找当前仍然存在的问题：

- 超大文件混合多种职责，而不是清晰的 orchestrator
- React 层或 renderer 层承载了本应属于 runtime 的生命周期与副作用编排
- 本地 state / ref 与 form store、scope、runtime 状态维护同一份事实来源
- 响应式订阅过宽，或 external-store snapshot/selector 引用不稳定
- 同一概念存在双词汇、双字段、双契约、双实现
- 兼容旧写法的过渡路径残留过久，开始污染主路径
- 复杂模块做过第一轮拆分后，入口文件继续堆积实现细节
- domain core / render / runtime / docs owner 边界漂移
- 测试文件过大、跨域、setup 过重，反过来拖累重构
- 顶层目录文件过多，但子域归组仍未完成
- 相同或高度相似的代码块在不同文件中复制粘贴（代码块级重复，非概念级重复）
- 一个子系统被拆成过多碎片文件，单个文件不大但整体认知成本高（过度拆分）

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

**阈值**：源码文件（非 .d.ts、非 test）超过 500 行即值得关注，超过 700 行必须拆分。

对每个超过阈值的文件：
1. 列出文件路径和行数
2. 识别文件内的职责边界（用 "职责 A: 行 X-Y", "职责 B: 行 Y-Z" 格式）
3. 判断哪些职责应该提取为独立模块
4. 注意：如果该文件已经是从更大文件中拆出来的协调层（orchestrator），且主要是调用子模块，则可接受
5. 如果该文件已经做过一轮拆分，请进一步判断它是否又重新吸入了实现细节

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

### 维度 5.5：代码块级重复（Copy-Paste Duplication）

**与维度 5 的区别**：维度 5 检测的是"概念级重复"——同一想法用不同名字/字段/接口表达了两遍。本维度检测的是"代码块级重复"——相同或高度相似的逻辑在两个或更多文件中各自实现了一遍，名字可能相同也可能不同。

**信号**：
- 两个文件中存在结构相同、仅参数或细节不同的代码段（如两个 switch 的 case 分支逻辑几乎一样）
- 同一模式（状态管理、生命周期编排、数据转换）在多个组件/hook 中各自手写一遍，而非提取为共享 hook/工具函数
- 同一个工具逻辑（如错误剥离、列表比较、key 构建）在多处内联实现
- 多个 hook 的订阅样板代码高度雷同，仅 selector 不同

对每个实例：
1. 指出每处重复代码的文件和行号范围
2. 估算重复次数和总冗余行数
3. 评估提取为共享 hook/工具函数的可行性
4. 说明不提取的维护成本（一处改了另一处忘改的风险）

**历史教训**：`action-adapter.ts` 和 `runtime-action-helpers.ts` 各有一份 ajax 执行逻辑；`dialog.tsx` 和 `drawer.tsx` 各有一份 surface 生命周期管理；6 个 form-runtime 文件各有一份 strip errors 逻辑。原则："一份逻辑，一份实现。"

### 维度 5.6：过度拆分（Over-Splitting）

**与维度 1 的关系**：维度 1 检测"文件过大"。本维度检测反面——"一个子系统被拆成过多碎片文件"，单个文件不大（可能只有 50-150 行），但属于同一子系统的文件数量过多（>8），且互相紧密耦合。

**信号**：
- 一个子系统（如 form-runtime、data-source、validation）有 10+ 个文件，每个文件只有 1-2 个导出函数
- 拆分后文件之间的 import 关系呈密集网状（几乎所有文件都互相导入）
- 每次修改一个行为需要同时修改 3+ 个同子系统的文件
- 文件名之间的区分仅靠后缀（如 `*-ops.ts`、`*-types.ts`、`*-helpers.ts`、`*-state.ts`），但实际职责边界模糊

对每个实例：
1. 指出子系统和涉及的文件列表
2. 统计文件间的交叉引用数量
3. 建议合并方案（哪些文件应合并为一个高内聚模块）
4. 评估合并后的预估行数（应控制在 500 行以内）

**历史教训**：`flux-runtime/src/form-runtime-*.ts` 曾被拆为 19 个文件（~3000 行），实际合并为 5-6 个高内聚模块后认知负担显著降低。`flux-formula` 的 AST walker 在 4 个文件中各自写了 `switch(node.type)` 遍历。原则："拆分是为了职责清晰，不是为了行数最小化。当拆分后交叉引用密度不降反升，说明拆错了边界。"

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

### 维度 6.5：兼容层 / 过渡路径残留

**信号**：
- `legacy`、`fallback`、`compat`、`migration` 路径长期保留
- 主路径已经稳定，但仍然到处保留旧字段映射或双写逻辑
- 过渡层不是隔离在边缘，而是污染了主实现

对每个实例：
1. 指出兼容层所在位置
2. 说明它保护的旧路径是什么
3. 判断它现在是必要兼容，还是已经开始阻碍主边界收敛

**历史教训**：这个仓库多次出现“第一轮迁移完成后兼容路径长期残留”的情况。原则：兼容层可以存在，但应尽量待在边界，不应反向污染主实现。

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

### 维度 11：文档 owner / 代码 owner 漂移

**信号**：
- 当前代码真实 owner 与文档路由/owner 描述不一致
- 历史迁移说明仍占据当前架构文档主体
- 文档会把后续维护者引向错误边界

对每个实例：
1. 指出文档路径和对应代码路径
2. 说明 owner 漂移会怎样干扰后续重构或实现判断
3. 判断这是 docs-only 问题，还是已经影响代码边界

**历史教训**：本仓库近期多次做过 architecture/component owner 收敛。原则：文档 owner 错位会持续制造错误实现方向。

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
- **为什么值得现在做**: 当前 ROI，而不是泛泛地说“更优雅”
- **误报排除**: 说明为什么这不是合理 orchestrator、动态边界或刻意保留的兼容层
- **历史模式对应**: 对应到本仓库哪一类高频重构模式
```

最后按严重程度汇总：
1. P0 清单（按文件分组）
2. P1 清单（按文件分组）
3. 重复出现最多的文件（多次出现在不同维度中的文件是高优先级重构目标）
4. 可暂缓项（有问题，但 ROI 暂时不高）
5. 误报排除清单（看起来像问题，但当前不建议动）

---

## 执行方式

1. 先用文件行数统计找出所有超过 500 行的源文件
2. 对每个大文件，读取并分析其职责边界（维度 1）
3. 用 grep 搜索以下模式以覆盖其他维度：
   - `useState` + `useEffect.*set` 组合（维度 2）
   - `useEffect` 中的 `setInterval|setTimeout|AbortController|fetch`（维度 3）
   - `useScopeSelector|useSyncExternalStore|subscribe`（维度 4）
   - `from.*internal|from.*lib` 跨包导入（维度 6）
   - `cancelled|disposed|isMounted` boolean 标记（维度 8）
   - `legacy|fallback|compat|migration`（维度 6.5）
4. 对目录结构做一次性扫描（维度 10）
5. 抽样核对关键文档 owner 与代码 owner 是否漂移（维度 11）
6. 在输出前做一次“已解决历史问题排除”检查，避免把历史日志里的已完成项当成当前问题
7. 汇总输出
