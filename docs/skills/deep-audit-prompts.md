# nop-chaos-flux 深度审核提示词手册

> **定位**: 本文档是一份面向 AI 的多维度深度审核提示词集合。每个维度独立成章，由一个专用子 agent 执行。
> **前提**: 执行审核前必须先阅读 `AGENTS.md` 和相关架构文档，以当前代码和文档为准。
> **输出格式**: 每个发现按统一格式输出（见附录 A）。

---

## 审核总览

本手册覆盖以下 **18 个审核维度**，分为 5 大类：

| 类别 | 维度编号 | 维度名称 | 审核目标 |
|------|---------|---------|---------|
| **A. 架构与模块边界** | 01 | 依赖图与包边界 | 包间依赖是否合规 |
| | 02 | 模块职责与文件边界 | 单一职责、文件大小、入口文件纯度 |
| | 03 | API 表面积与契约一致性 | 导出接口是否收敛、是否有多余暴露 |
| **B. 运行时与状态** | 04 | 状态所有权与单一事实来源 | 双状态、同步链、事实来源冲突 |
| | 05 | 响应式订阅精度 | 订阅范围、selector 稳定性、不必要重渲染 |
| | 06 | 异步模式与取消安全 | AbortController、竞态、并发保护 |
| | 07 | 生命周期与副作用归属 | useEffect 职责、runtime vs React 层归属 |
| | 08 | 验证系统一致性 | 验证时机、owner 归属、隐藏字段策略 |
| **C. 渲染器与 UI** | 09 | 渲染器契约合规性 | RendererComponentProps 遵循、marker class、无隐式布局 |
| | 10 | 样式系统合规性 | classAliases、stack/hstack、BEM 残留、主题独立性 |
| | 11 | UI 组件使用合规性 | 原生 HTML 替代、shadcn/ui 集成 |
| | 12 | 表单字段与 Slot 建模 | field-metadata 规则、value-or-region、事件字段 |
| **D. 工程质量** | 13 | 类型安全与动态边界 | any 收敛、类型逃逸口、边界类型声明 |
| | 14 | 测试覆盖与质量 | 测试边界、setup 膨胀、跨域测试、遗漏路径 |
| | 15 | 安全与性能红线 | eval/new Function、O(n^2)、不可变更新、观察性 |
| **E. 文档与一致性** | 16 | 文档-代码一致性 | owner 漂移、文档过时、计划状态失真 |
| | 17 | 命名与术语一致性 | 双词汇、术语偏离、命名模式不统一 |
| | 18 | 跨包模式一致性 | 相同概念在不同包中的实现是否一致 |

---

## 子 Agent 执行模型

### 执行方式

每个维度由一个独立的子 agent（Task tool）执行。子 agent 拥有独立的上下文窗口，可以充分阅读代码文件而不与其他维度争夺上下文空间。

**调度模式**：

```
主 Agent（协调者）
  ├── Task(subagent_type="explore") → 维度 01: 依赖图与包边界
  ├── Task(subagent_type="explore") → 维度 02: 模块职责与文件边界
  ├── Task(subagent_type="explore") → 维度 03: API 表面积
  ...
  └── Task(subagent_type="explore") → 维度 18: 跨包模式一致性
```

**调度方法**：

1. 主 agent 读取本文档，选择要执行的维度
2. 主 agent 将该维度的「子 Agent 提示词」完整复制到 Task tool 的 prompt 参数中
3. 可以并行派发多个维度（同批次的维度之间无依赖关系）
4. 所有子 agent 完成后，主 agent 汇总结果，生成「深度审核汇总报告」（格式见附录 A）

**并行策略**：同批次的维度可以并行派发。批次之间有依赖关系：

| 批次 | 维度 | 可否并行 |
|------|------|---------|
| 第一批 | 01, 04, 15 | 互相独立，可并行 |
| 第二批 | 05, 06, 09 | 互相独立，可并行 |
| 第三批 | 02, 07, 08, 14 | 互相独立，可并行 |
| 第四批 | 03, 10, 13 | 互相独立，可并行 |
| 第五批 | 11, 12, 16, 17, 18 | 互相独立，可并行 |

**单次调度示例**（主 agent 视角）：

```
请用 Task tool 并行派发以下 3 个子 agent：

1. subagent_type="explore", description="维度01: 依赖图与包边界"
   prompt = （复制下面维度 01 的「子 Agent 提示词」全文）

2. subagent_type="explore", description="维度04: 状态所有权"
   prompt = （复制下面维度 04 的「子 Agent 提示词」全文）

3. subagent_type="explore", description="维度15: 安全与性能红线"
   prompt = （复制下面维度 15 的「子 Agent 提示词」全文）
```

### 子 Agent 提示词结构

每个维度的提示词都是自包含的，包含以下部分：

```
1. 项目背景（固定，所有维度相同）
2. 通用审计口径（固定，所有维度相同）
3. 本维度目标
4. 必读参考文档列表
5. 执行步骤（具体的搜索/阅读/分析指令）
6. 输出格式要求
```

---

## 通用审计口径

以下口径会嵌入每个子 agent 的提示词中，所有维度的审核员必须遵守：

1. **以当前代码为准**，不以历史日志、已关闭的计划或口头约定为准。
2. **不重复报告已收敛的问题**。如果代码中已按架构规则实现，不再标记为问题。
3. **不把"看起来不优雅"当问题**。必须有结构性原因或可量化风险。
4. **对低代码动态边界保持克制**。`any`、`Record<string, unknown>`、动态 schema 对象在边界上是合理的。
5. **每个发现必须可定位**：文件路径 + 行号范围 + 具体代码片段。
6. **区分已自动化 vs 需人工发现**。已被 lint/check 覆盖的问题只在"自动化有漏洞"时才报告。

---

## 固定项目背景

以下背景会嵌入每个子 agent 的提示词头部：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

包结构：
- flux-core — 基础类型和纯工具函数（无依赖）
- flux-formula — 表达式编译/求值（依赖 flux-core）
- flux-runtime — Zustand store、验证、action、编译器（依赖 flux-core、flux-formula）
- flux-react — React 渲染层：hooks、NodeRenderer、SchemaRenderer（依赖 flux-runtime）
- flux-renderers-basic — 基础渲染器（page、text、container 等）
- flux-renderers-form — 表单渲染器
- flux-renderers-data — 数据渲染器
- ui — shadcn/ui 组件库
- tailwind-preset — 共享 Tailwind 配置
- theme-tokens — CSS 变量主题令牌
- flow-designer-core / flow-designer-renderers — 流程设计器
- spreadsheet-core / spreadsheet-renderers — 电子表格
- report-designer-core / report-designer-renderers — 报表设计器
- word-editor-core / word-editor-renderers — 文档编辑器
- nop-debugger — 调试器
- flux-code-editor — 代码编辑器
- flux-playground — 开发 Playground

依赖流：flux-core → flux-formula → flux-runtime → flux-react → renderers-*
         *-core → *-renderers
         spreadsheet-core → report-designer-core → report-designer-renderers
         tailwind-preset → ui

关键架构规则：
- 渲染器只发出 marker class（nop-*），不做隐式布局
- 运行时逻辑属于 flux-runtime，不属于 React 层
- 复杂字段不得维护独立的本地状态（useState），必须从 form store 读取
- 所有渲染器组件必须遵循 RendererComponentProps 模式
- 严禁在渲染器中直接访问 store，必须用标准 hooks
- UI 组件统一使用 @nop-chaos/ui，不得用原生 HTML 元素
```

---

## A. 架构与模块边界

### 维度 01：依赖图与包边界

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 01：依赖图与包边界

目标：确保包间依赖严格遵守 flux-core → flux-formula → flux-runtime → flux-react → renderers 的单向依赖流，以及各 domain 的 core/renderers 分层。

必读文档：
- AGENTS.md 的 Dependency Flow 章节
- docs/architecture/flux-runtime-module-boundaries.md

执行步骤：

1. 读取所有 packages/*/package.json，提取 dependencies 和 peerDependencies 中所有 @nop-chaos/* 引用。
2. 构建完整的内部依赖图，以文本形式绘制。
3. 对照以下规则逐条检查：
   a. flux-core 不能依赖任何其他 @nop-chaos/* 包
   b. flux-formula 只能依赖 flux-core
   c. flux-runtime 只能依赖 flux-core 和 flux-formula
   d. flux-react 不能依赖任何 renderers 包
   e. 所有 renderers 包只能依赖 flux-react（不直接依赖 flux-runtime 内部模块）
   f. *-core 包不能依赖 *-renderers 包
   g. spreadsheet-core 不能依赖 report-designer-core（反向可以）
   h. ui 不依赖任何 @nop-chaos/* 包（peerDependencies 除外）
   i. tailwind-preset 和 theme-tokens 不依赖任何运行时包
4. 对每个违规，指出：
   - 哪个包的 package.json
   - 违规的依赖声明
   - 违反了哪条规则
   - 是否存在合理的例外理由（如类型引用）
5. 额外检查：是否有 import 语句实际引用了其他包的内部路径（非 index 导出），例如 from '@nop-chaos/flux-runtime/src/internal/xxx'。
6. 检查是否存在循环依赖的迹象（A 导入 B，B 又间接导入 A）。
7. 检查所有包的 exports 字段是否一致（都使用 types + default 双条件导出）。
8. 检查是否有包缺少 tsconfig.build.json 或 build 脚本。

输出格式：

对每个发现：
### [维度01] 简短标题
- **文件**: packages/xxx/package.json
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向

最后输出：
1. 完整的依赖图（ASCII art 或文本）
2. 违规清单（按严重程度排序）
3. 合规的包清单
4. 总结评估
```

---

### 维度 02：模块职责与文件边界

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 02：模块职责与文件边界

目标：识别职责混合的超大文件、入口文件泄露实现细节、目录结构混乱等问题。

必读文档：
- docs/architecture/flux-runtime-module-boundaries.md
- AGENTS.md Code Organization 章节

历史教训：本项目曾将 flux-core/src/index.ts(1183行)、flux-core/src/types.ts(904行)、use-spreadsheet-interactions.ts(918行)、table-renderer.tsx(906行) 成功拆分。"在第一轮提取后停下来，不要为了行数继续拆。"

执行步骤：

1. 统计所有 packages/*/src/ 下非测试、非 .d.ts 文件的行数。列出超过 300 行的所有文件，按行数降序排列。
2. 对每个超过 300 行的文件：
   a. 读取文件内容，识别其中的职责边界
   b. 用 "职责 A: 行 X-Y"、"职责 B: 行 Y-Z" 格式标注
   c. 判断哪些职责应该提取为独立模块
   d. 如果文件是 orchestrator（组装调用子模块），标注为可接受
   e. 如果文件已做过拆分但重新吸入了实现细节，标注为"二次膨胀"
3. 检查每个包的 index.ts：
   a. 是否仅做 re-export（理想情况）
   b. 是否包含具体实现逻辑（应提取）
   c. 导出项数量是否超过 50 个（可能表明包的职责范围过大）
4. 统计每个包 src/ 顶层文件数量，超过 20 个的列出来并建议子目录归组方案。
5. 检查是否存在只有 1-2 个文件的子目录（过度拆分）。
6. 对照 docs/architecture/flux-runtime-module-boundaries.md 的文件所有权映射，检查实际文件是否偏离文档定义。

输出格式：

对每个发现：
### [维度02] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
- **为什么值得现在做**: 当前 ROI
- **误报排除**: 为什么不是合理的 orchestrator 或动态边界
- **历史模式对应**: 本仓库哪一类高频重构模式

最后输出：
1. 超大文件清单（带职责分析）
2. 入口文件问题清单
3. 目录结构建议
4. 文档-代码偏离清单
```

---

### 维度 03：API 表面积与契约一致性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 03：API 表面积与契约一致性

目标：确保每个包的公开 API 表面积收敛、无多余暴露、跨包契约一致。

必读文档：
- docs/references/renderer-interfaces.md
- docs/references/terminology.md

执行步骤：

1. 读取所有 packages/*/src/index.ts，列出每个包的全部导出项（类型导出 vs 值导出分开列）。
2. 对每个包，检查：
   a. 是否有仅内部使用但被公开导出的函数/类型
   b. 是否有"内部实现泄露到公开 API"的痕迹（如导出了 helper、util、internal 前缀的项）
   c. 导出的类型是否有对应的 JSDoc 或在 docs/references/ 中有文档
3. 检查跨包接口一致性：
   a. RendererComponentProps 在 flux-react 和各 renderers 包中的使用是否一致
   b. ScopeRef 接口在 flux-core 定义和 flux-runtime 实现是否匹配
   c. RendererDefinition 的注册协议在各 renderers 包中是否统一
   d. FormStoreApi / PageStoreApi 的公开方法是否在文档中有完整描述
4. 检查是否有类型通过 import type 从 A 包导出，又在 B 包 re-export 且添加了不同的约束。
5. 检查 packages/*/src/ 下是否有未被 index.ts 导出的"死代码"文件（整个文件没有被任何地方引用）。
6. 检查 exports map：package.json 的 exports 字段与实际 index.ts 导出是否对齐。

输出格式：

对每个发现：
### [维度03] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向

最后输出每个包的 API 表面积报告 + 问题清单。
```

---

## B. 运行时与状态

### 维度 04：状态所有权与单一事实来源

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 04：状态所有权与单一事实来源

目标：发现双状态（local state + store 维护同一份数据）、props-to-state 同步链、多来源事实冲突。

必读文档：
- docs/architecture/form-validation.md
- docs/architecture/scope-ownership-and-isolation.md

历史教训：ArrayEditor、CheckboxGroup 曾因本地 useState 与 form store 不同步产生 bug。原则："复杂字段不得维护独立本地状态，只从 store 读取。"

执行步骤：

1. 在所有 packages/ 下搜索 useState 声明。对每个 useState：
   a. 判断它维护的数据是否在 form store / scope store / runtime store 中也存在
   b. 检查是否有 useEffect 将 props 或 store 数据同步到这个 state
   c. 检查这个 state 的值是否影响提交/验证/持久化（如果是，则不应是 local state）
2. 搜索 useRef 缓存数据的模式：
   a. ref.current 被用来缓存 store 中已有的数据
   b. ref 被用来做"上一次值"对比，但 store 本身已支持 selector
3. 搜索 useEffect + setState/setXxx 模式（props-to-state 同步链）：
   a. useEffect 依赖中包含 props 并设置本地 state
   b. 这种模式应该改为 derived value（useMemo）或直接从 store selector 读取
4. 检查复杂表单字段渲染器（如 ArrayEditor、CheckboxGroup、TreeSelect 等）：
   a. 是否用 local state 维护了表单值
   b. 是否有"先更新 local state 再同步到 store"的模式（应直接写 store）
5. 检查 Dialog / Drawer / Surface 相关代码：
   a. 打开状态是否同时存在于 local state 和 SurfaceStore
   b. 数据是否在组件 state 和 scope 中双存
6. 检查设计器组件（flow-designer、spreadsheet、report-designer）：
   a. 是否有设计器状态同时在 Zustand store 和 React state 中维护
   b. 选区、缩放、历史记录等状态是否有单一来源

输出格式：

对每个发现：
### [维度04] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
- **双状态详情**: 哪两份数据在表达同一件事
- **同步失败症状**: 用户可见的故障表现
```

---

### 维度 05：响应式订阅精度

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 05：响应式订阅精度

目标：发现过宽订阅、selector 引用不稳定、不必要重渲染等性能问题。

必读文档：
- docs/architecture/performance-design-requirements.md（P7 per-path subscription）
- docs/architecture/renderer-runtime.md

历史教训：FieldFrame 曾为所有字段订阅 form.values；DialogHost 因数组引用不等导致每次渲染。

执行步骤：

1. 搜索所有 useScopeSelector 调用：
   a. selector 函数返回了什么（单个值 vs 对象 vs 数组）
   b. 如果返回对象/数组，是否每次调用都创建新引用
   c. 是否有 useSyncExternalStore 的 getSnapshot 返回新对象
2. 搜索所有 useSyncExternalStore 调用：
   a. subscribe 和 getSnapshot 是否稳定引用
   b. getSnapshot 是否返回原始 store slice 而非衍生计算
3. 检查 useEffect 依赖项：
   a. 依赖中是否包含大型对象（如 [form.values]、[scope.data]）
   b. 依赖中是否包含每次 render 都新建的引用（如 inline object/array）
4. 检查 Context provider 的 value prop：
   a. 是否每次 render 都创建新对象（违反 react/jsx-no-constructed-context-values）
   b. 特别是 FormContext、ScopeContext、RuntimeContext 等
5. 检查 useFormFieldController 或类似 hook：
   a. 它订阅了多大范围的 form 数据
   b. 是否只订阅了当前字段的路径
   c. 是否支持 per-path subscription（P7 要求）
6. 检查 NodeRenderer / RenderNodes：
   a. 子组件重渲染时父组件是否也被迫重渲染
   b. regions.render() 是否每次返回新 React 元素引用
7. 搜索 useMemo / useCallback 使用：
   a. 是否有 "void useMemo"（返回值未使用）的痕迹
   b. 是否有 React Compiler 已能处理但仍手动 memo 的位置
   c. 是否有缺少 memo 但有明显性能问题的位置

输出格式：

对每个发现：
### [维度05] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **订阅位置**: 具体的 hook 调用位置
- **订阅范围**: 当前订阅了什么
- **实际需要**: 组件实际依赖的数据路径
- **重渲染频率**: 估算不必要重渲染的触发频率
- **建议**: 收窄方向
```

---

### 维度 06：异步模式与取消安全

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 06：异步模式与取消安全

目标：确保所有异步操作都有取消机制、并发保护、竞态防护。

必读文档：
- docs/architecture/performance-design-requirements.md（P5 AbortController）
- docs/bugs/07-submit-concurrent-guard.md

历史教训：双击 submit 曾触发重复 API 调用；cancelled/disposed boolean 已统一迁移为 AbortController。

执行步骤：

1. 搜索所有 async 函数（packages/ 下，非 test 文件）：
   a. 检查是否有 AbortController / AbortSignal 支持
   b. 检查是否使用了 cancelled / disposed / isMounted 等布尔标记（应迁移到 AbortController）
2. 搜索所有 fetch / API 调用：
   a. 是否有 AbortController 传递
   b. 快速连续触发时（如搜索框输入、快速切换 tab）是否有去抖/取消旧请求机制
   c. 响应到达时是否检查请求是否已过时（stale response guard）
3. 检查 submit 相关代码：
   a. 是否有并发保护（防止双击提交）
   b. submitting 标志是否在方法入口而非仅 UI 层检查
4. 搜索所有 setInterval / setTimeout：
   a. 是否有对应的清理逻辑
   b. 在组件卸载时是否清理
   c. 轮询场景是否支持停止（如 dialog 关闭时停止轮询）
5. 搜索所有 Promise / then / catch：
   a. 是否有未处理的 rejection（缺少 catch 或 try/catch）
   b. async 函数是否总是返回 Promise 且调用方正确 await
6. 检查 DataSource / ApiDataSource 相关代码：
   a. 轮询场景是否在组件卸载或 dialog 关闭时停止
   b. 缓存失效策略是否有竞态风险
   c. 多个并发请求是否正确处理了 out-of-order 响应
7. 检查设计器的异步操作：
   a. 拖拽、自动保存、远程校验等是否有取消机制
   b. 大文件加载是否有超时和取消

输出格式：

对每个发现：
### [维度06] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **异步操作**: 具体的异步操作描述
- **竞态场景**: 步骤 1 用户做 X → 步骤 2 在操作完成前用户做 Y → 结果 Z
- **用户可见故障**: 用户会看到什么
- **建议**: 防护方案
```

---

### 维度 07：生命周期与副作用归属

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 07：生命周期与副作用归属

目标：确保 useEffect 中的逻辑属于 React 层而非 runtime 层；副作用的生命周期由正确的层级管理。

必读文档：
- docs/architecture/renderer-runtime.md
- docs/bugs/15-setstate-during-render.md

历史教训：RenderNodes 曾在 render 阶段调用 store.setSnapshot()（Bug 15）；DataSource 轮询/缓存/去重曾放在 React effect 中，后移入 flux-runtime。

执行步骤：

1. 搜索所有 useEffect（非 test 文件）：
   a. 按职责分类：数据获取、订阅管理、DOM 操作、状态同步、轮询、缓存管理、定时器、事件监听
   b. 对每个判断：这个职责应该属于 React 层还是 runtime 层
2. 识别 "runtime 逻辑误放在 React effect" 的模式：
   a. useEffect 中管理 AbortController、数据订阅、缓存（应属于 runtime/store）
   b. useEffect 的 cleanup 做了应该是 store dispose 的操作
   c. useEffect 中执行轮询、去重、重试（应属于 runtime DataSource）
3. 检查 useEffect 依赖项正确性：
   a. 是否有遗漏的依赖（exhaustive-deps 未覆盖的）
   b. 是否有不必要的依赖导致 effect 过频执行
   c. 是否有依赖了 ref.current 的情况（ref 变化不触发 effect）
4. 检查 useEffect 中直接修改 Zustand store 的模式：
   a. 是否在 render 阶段调用了 store.setState（Bug 15 教训）
   b. 是否有 "pending buffer" 模式来避免 render 中 setState
5. 检查组件卸载清理：
   a. useEffect cleanup 是否清理了所有副作用
   b. 是否有全局事件监听器在卸载后仍然活跃
   c. 是否有 store 订阅在组件卸载后仍然存在
6. 检查 useLayoutEffect vs useEffect 选择是否合理：
   a. DOM 测量/修改应使用 useLayoutEffect
   b. 数据获取应使用 useEffect
7. 检查 React 19 特有模式：
   a. 是否有可以用 use(promise) + Suspense 替代的数据获取 effect
   b. 是否有可以用 useActionState 替代的表单 effect

输出格式：

按"应迁移到 runtime"和"正确位于 React 层"分类的 effect 清单。

对每个发现：
### [维度07] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **effect 职责**: 一句话描述
- **应归属层级**: React 层 / runtime 层
- **现状**: 当前问题
- **建议**: 修复方向
```

---

### 维度 08：验证系统一致性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 08：验证系统一致性

目标：确保验证逻辑严格遵守 form-validation.md 定义的架构契约。

必读文档：
- docs/architecture/form-validation.md
- docs/references/form-validation-execution-details.md

执行步骤：

1. 验证所有权检查：
   a. 搜索所有执行验证的代码位置
   b. 对照"验证由最近的 validation-capable scope runtime 拥有"规则
   c. 是否有 React 组件直接触发验证（应通过 FormRuntime / ValidationScopeRuntime）
2. 验证时机检查：
   a. showErrorOn 策略（blur / change / submit）是否正确实现
   b. 是否有字段在不应验证时被验证（如 hidden 字段）
   c. 隐藏字段的验证参与策略是否符合文档规定
3. 验证状态管理：
   a. fieldStates 是否使用 single flat map（true | undefined 模式）
   b. 是否有组件为单个字段维护独立的验证状态（应从 store 订阅）
   c. touched / dirty / visited 状态是否由 FormRuntime 统一管理
4. 异步验证：
   a. 是否有 generation-aware stale run suppression
   b. submit/commit 是否 bypasses debounce
   c. 异步验证的取消机制是否正确
5. 编译时 vs 运行时验证结构：
   a. 验证结构是否优先在编译时确定
   b. 运行时参与是否仅作为补充
6. 验证错误显示：
   a. 错误信息是否从 FormRuntime 读取（而非组件本地 state）
   b. 错误信息是否在 field 级别可订阅（per-path）
   c. 是否存在全局重渲染来显示单个字段错误
7. 跨 scope 验证：
   a. dialog 内表单的验证是否独立于外部表单
   b. 嵌套 scope 的验证传播是否正确

输出格式：

按验证生命周期分类（编译 → 注册 → 触发 → 执行 → 结果展示）。

对每个发现：
### [维度08] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **验证生命周期阶段**: 编译/注册/触发/执行/结果展示
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
```

---

## C. 渲染器与 UI

### 维度 09：渲染器契约合规性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 09：渲染器契约合规性

目标：确保所有渲染器组件严格遵循 RendererComponentProps 模式和渲染器样式契约。

必读文档：
- docs/architecture/renderer-runtime.md
- docs/architecture/styling-system.md
- docs/architecture/renderer-markers-and-selectors.md

执行步骤：

1. 读取所有 flux-renderers-*/src/ 下的渲染器组件文件。
2. 对每个渲染器组件检查：
   a. 是否使用 RendererComponentProps<SchemaType> 类型
   b. 数据是否从正确的来源读取：
      - props.props（schema 驱动的值）
      - props.meta（控制状态）
      - props.regions（子渲染句柄）
      - props.events（事件处理器）
      - props.helpers（运行时辅助）
   c. 是否直接访问了 store（应使用标准 hooks）
   d. 是否在组件内部创建了 ad-hoc React context（应使用标准 hooks）
   e. 是否有 prop-drilling chain（应使用 useCurrentForm / useCurrentPage 等 hooks）
3. 检查渲染器注册：
   a. 每个渲染器是否正确导出 RendererDefinition
   b. 注册函数是否遵循 registerXxxRenderers(registry) 模式
   c. field metadata 是否完整定义（type、rules、slots 等）
4. 检查渲染器样式契约：
   a. 是否只发出 marker class（nop-* 前缀）
   b. 是否有隐式布局（硬编码 gap、padding、flex、grid）
   c. 是否在渲染器中使用 BEM 命名（__ 分隔符，应改用 data-slot）
   d. className 是否使用 cn() 合并（非 classNames 或模板字符串）
5. 检查 data-testid 和 data-cid 是否从 props.meta 正确传递
6. 检查 regions.render() 调用是否正确传递 key
7. 检查事件处理器是否使用 void 返回模式：onClick={(e) => void props.events.onClick?.(e)

输出格式：

对每个渲染器输出合规评分和具体违规项：
### [维度09] 渲染器名: xxx-renderer
- **合规评分**: A/B/C/D（A=完全合规，D=严重违规）
- **违规项**: 列表

对每个违规项：
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **契约条款**: 违反了哪条契约
- **现状**: 当前问题
- **建议**: 修复方向
```

---

### 维度 10：样式系统合规性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 10：样式系统合规性

目标：确保样式系统严格遵循 styling-system.md 定义的分层契约。

必读文档：
- docs/architecture/styling-system.md
- docs/architecture/theme-compatibility.md
- docs/architecture/report-designer/spreadsheet-canvas-css.md（如有 spreadsheet 相关）

执行步骤：

1. Marker class 检查：
   a. 列出所有渲染器中使用的 nop-* marker class
   b. 检查是否有 marker class 带有隐式视觉样式（应为零样式纯标记）
   c. 检查是否有渲染器使用了非 marker class 作为布局类
2. classAliases 检查：
   a. 搜索所有 classAliases 定义和使用
   b. 检查递归展开是否正确实现
   c. 检查 scope 继承（子是否正确覆盖父）是否正确
   d. 在 playground schema 中检查 classAliases 是否被正确使用
3. 间距约定检查：
   a. 搜索 stack-* / hstack-* 别名的使用
   b. 检查是否有渲染器内部硬编码了 gap / padding / margin
   c. 检查 playground 的 styles-theme-utilities.css 中定义的别名是否覆盖了所有使用场景
4. BEM 残留检查：
   a. 搜索所有 __ 分隔符的 CSS class（如 .nop-button__icon）
   b. 检查是否已迁移为 data-slot / data-* 属性
5. 主题独立性检查：
   a. 是否有组件依赖 React ThemeProvider（应使用 CSS 变量）
   b. 是否有渲染器硬编码了颜色值（应使用 CSS 变量或 Tailwind 语义色）
   c. CSS 变量是否集中在 theme-tokens 包中定义
6. Tailwind 集成检查：
   a. apps/playground/src/styles.css 中的 @source 指令是否覆盖了所有包
   b. 是否有包使用了 Tailwind 类但未被 content scan 覆盖
   c. tailwind-safelist.txt 是否有未使用的条目或缺少的条目
7. Spreadsheet 画布 CSS 特殊规则：
   a. 检查 spreadsheet-renderers 中的 CSS 是否遵循 hybrid 策略
   b. 预定义 ss-* class + inline style + data-* 的组合是否正确
   c. 是否有 spreadsheet 画布区域使用了 Tailwind（不应使用）

输出格式：

按 renderer 分类的样式违规清单。

对每个发现：
### [维度10] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **违规类别**: marker/classAlias/间距/BEM/主题/Tailwind/spreadsheet
- **现状**: 一句话描述
- **建议**: 修复方向
```

---

### 维度 11：UI 组件使用合规性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 11：UI 组件使用合规性

目标：确保所有 JSX 中没有使用原生 HTML 元素替代 @nop-chaos/ui 组件。

必读文档：
- AGENTS.md "MANDATORY: UI Component Usage" 章节

执行步骤：

1. 读取 packages/ui/src/index.ts 获取完整的可用组件列表。
2. 在所有 packages/*/src/ 和 apps/*/src/ 下搜索以下原生 HTML 元素的使用（排除 test 文件）：
   a. <button> → 应使用 <Button>
   b. <input> → 应使用 <Input>
   c. <textarea> → 应使用 <Textarea>
   d. <select>/<option> → 应使用 <Select> 或 <NativeSelect>
   e. <label> → 应使用 <Label>
   f. <dialog> → 应使用 <Dialog>
   g. <table>/<tr>/<td> → 应使用 <Table> 系列
   h. <div role="checkbox"> → 应使用 <Checkbox>
   i. <div role="radio"> → 应使用 <RadioGroup>
   j. <div role="switch"> → 应使用 <Switch>
   k. <input type="range"> → 应使用 <Slider>
   l. <hr> → 应使用 <Separator>
   m. <div role="tooltip"> → 应使用 <Tooltip>
3. 对每个发现的违规：
   a. 判断是否在渲染器组件中（渲染器中违规优先级更高）
   b. 判断是否在 ui 包本身的内部实现中（ui 包内部使用原生元素是合理的）
   c. 评估替换的可行性和风险
4. 检查 @nop-chaos/ui 的导入模式是否一致（所有导入都从 '@nop-chaos/ui' 统一入口）。
5. 检查是否有包直接依赖了 radix-ui / @base-ui 而不通过 @nop-chaos/ui（ui 包除外）。

输出格式：

原生 HTML 使用清单（排除 ui 包内部实现）。

对每个发现：
### [维度11] 简短标题
- **文件**: packages/xxx/src/yyy.tsx:行号
- **严重程度**: P0/P1/P2/P3
- **原生元素**: 使用的 HTML 元素
- **应替换为**: 对应的 @nop-chaos/ui 组件
- **所在层**: 渲染器/flux-react/其他
- **替换可行性**: 高/中/低
```

---

### 维度 12：表单字段与 Slot 建模

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 12：表单字段与 Slot 建模

目标：确保 field metadata、value-or-region、事件字段等建模严格遵循 field-metadata-slot-modeling.md 的契约。

必读文档：
- docs/architecture/field-metadata-slot-modeling.md
- docs/architecture/field-frame.md

执行步骤：

1. 读取所有渲染器的 RendererDefinition 中的 field metadata。
2. 对每个字段规则检查：
   a. 规则类型（meta / prop / region / value-or-region / event / ignored）是否正确声明
   b. value-or-region 字段的编译器决策逻辑是否正确
   c. event 字段是否被正确识别为函数 props（而非 JSON 值）
3. 检查 deep region extraction：
   a. 嵌套字段（如 table.columns[].label）是否被编译器提取为稳定的 region key
   b. 数组类型的 region 是否正确处理了动态增删
4. 检查 render props 合成：
   a. 是否有 JSON schema 中出现了函数类型的 props（不应存在）
   b. render props 是否都在 renderer adapter layer 中合成
5. 检查 Slot 分类：
   a. field slot（标签、提示、错误）是否通过 FieldFrame 正确渲染
   b. content slot（自定义区域）是否通过 regions.render() 正确渲染
   c. 两种 slot 的数据来源是否隔离
6. 检查 FieldFrame 集成：
   a. 表单字段渲染器是否正确使用 FieldFrame
   b. frameWrap 是否按实例控制（per-instance）
   c. label / hint / error 的渲染是否由 FieldFrame 统一管理
7. 检查 resolveRendererSlotContent 的使用是否正确：
   a. 调用位置是否在渲染器组件中
   b. 返回值是否正确处理（ReactNode vs 空值）

输出格式：

对每个渲染器的 field metadata 审计报告：
### [维度12] 渲染器名: xxx
- **field metadata 完整性**: 完整/部分/缺失
- **违规项**: 列表

对每个违规项：
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **违规类别**: field-rule/value-or-region/event/deep-region/slot/field-frame
- **现状**: 当前问题
- **建议**: 修复方向
```

---

## D. 工程质量

### 维度 13：类型安全与动态边界

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

特别说明：
- 本项目是低代码引擎，any / Record<string, unknown> 在 schema、runtime payload、动态表单值等边界是合理的。
- 不要把"出现 any"本身当成问题，要关注 any 是否从边界扩散到了核心路径。

---

审核维度 13：类型安全与动态边界

目标：确保 any 的使用被限制在合理的动态边界内，不向核心路径扩散。

必读文档：
- docs/skills/react19-best-practices-review.md "低代码项目例外" 章节

执行步骤：

1. 搜索所有 explicit any 使用（: any, as any, <any>, any[]）：
   a. 按包分组统计 any 使用频率
   b. 对每个 any 判断其合理性：
      - 合理：schema 动态对象、runtime payload、外部数据源返回值、action args
      - 可疑：核心数据路径、scope.get() 返回值、编译器内部、验证逻辑
      - 危险：React 组件 props 类型、hook 返回类型、公开发布的类型
2. 检查类型逃逸口：
   a. any 是否通过函数返回值传播到调用方
   b. any 是否通过泛型参数传播到更广范围
   c. as unknown as Xxx 双重断言是否合理
3. 检查 Record<string, unknown> 的使用是否在正确的边界：
   a. schema 类型定义中使用（合理）
   b. 内部计算逻辑中使用（可能需要更具体的类型）
4. 检查泛型约束：
   a. 是否有 <T = any> 的默认约束应更严格
   b. 是否有泛型参数完全未被使用
5. 检查 @ts-expect-error 和 @ts-ignore：
   a. 是否有说明注释（eslint 要求）
   b. 注释的原因是否仍然有效
   c. 是否可以通过更好的类型设计消除
6. 检查 packages/types/ 下的全局类型声明：
   a. 是否有应该被模块化类型替代的全局声明
   b. 是否有类型冲突的风险

输出格式：

1. any 使用统计（按包分组，每包统计合理/可疑/危险数量）
2. 可疑/危险项详细清单：
### [维度13] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **分类**: 合理/可疑/危险
- **现状**: 当前用法
- **逃逸路径**: any 如何传播
- **建议**: 收敛方案
```

---

### 维度 14：测试覆盖与质量

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 14：测试覆盖与质量

目标：评估测试覆盖的完整性、测试质量、以及测试结构是否有利于维护。

必读文档：
- AGENTS.md Testing 章节

执行步骤：

1. 统计每个包的测试文件数量和测试代码行数。列出测试文件数量为 0 的包。
2. 识别测试覆盖缺口：
   a. 列出所有 src/ 下有 .ts/.tsx 实现文件但没有对应 .test.ts/.test.tsx 的模块
   b. 特别关注：runtime 核心、scope 操作、验证逻辑、action 执行器、表达式编译器
3. 对每个超过 400 行的测试文件：
   a. 检查是否包含跨领域测试（应按领域拆分）
   b. 检查 setup 代码是否超过 50 行且未提取为 helper
   c. 检查 describe 嵌套是否超过 3 层
   d. 检查测试之间是否有隐式执行顺序依赖
4. 检查测试隔离性：
   a. 是否有测试依赖全局状态且未在 beforeEach/afterEach 中重置
   b. 是否有 mock 未正确清理
   c. 是否有测试依赖执行顺序
5. 检查测试模式一致性：
   a. 是否所有包都使用 Vitest
   b. mock 模式是否一致（vi.fn() vs jest.fn()）
   c. 测试环境声明是否一致（node vs jsdom）
6. 检查 E2E 测试：
   a. tests/ 目录下的 e2e 测试覆盖了哪些场景
   b. 是否有关键的渲染器/表单/验证场景缺少 e2e 覆盖
7. 检查测试可读性：
   a. 测试描述是否清晰描述了"在什么条件下应该得到什么结果"
   b. 是否有测试名是空的或过于泛化（如 "works correctly"）

输出格式：

1. 测试覆盖统计（按包）
2. 覆盖缺口清单
3. 测试质量问题清单：

### [维度14] 简短标题
- **文件**: packages/xxx/src/yyy.test.ts:行号
- **严重程度**: P0/P1/P2/P3
- **类别**: 覆盖缺口/跨域/setup膨胀/隔离性/一致性/可读性
- **现状**: 一句话描述
- **建议**: 改进方向

4. 优先级排序的测试改进建议
```

---

### 维度 15：安全与性能红线

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 15：安全与性能红线

目标：确保不违反安全红线（eval/new Function）和性能红线（O(n^2)、不可变更新、观察性）。

必读文档：
- docs/architecture/security-design-requirements.md
- docs/architecture/performance-design-requirements.md

执行步骤：

安全部分：
1. 搜索所有 eval( 和 new Function( 使用：
   a. 在 packages/**/src 或 apps/**/src 中出现即为违规（R2 规则）
   b. 检查是否有动态代码生成的替代方案（如表达式编译器）
2. 检查 fail-closed 行为：
   a. 权限检查 / 策略判断在异常时是否默认拒绝（而非默认允许）
   b. 条件分支中的 else / default 是否安全
3. 检查安全敏感边界的假设是否文档化（R5 规则）

性能部分：
4. 搜索 O(n^2) 模式：
   a. 嵌套循环中两个都依赖数据长度
   b. .find() / .filter() 在循环内部调用
   c. Array.indexOf 在大数组上重复调用
   d. 字符串拼接在循环中（大集合场景）
5. 检查不可变更新（P3 规则）：
   a. 是否有直接修改 store state 的情况（应通过 immutable update）
   b. 是否有 sort() / splice() 等原位修改操作
   c. Zustand store 的 set 是否正确使用 immer 或 spread
6. 检查热路径性能（P1 规则）：
   a. 是否有 JSON.stringify 用于变更检测（应使用 revision counter）
   b. 是否有全量数据对比用于渲染决策（应使用 per-path subscription）
7. 检查观察性（P6 规则）：
   a. 性能敏感路径是否有 performance.mark/measure
   b. 错误路径是否有结构化日志
   c. 异步失败是否有 telemetry 支持
8. 检查 React Compiler 兼容性：
   a. 是否有不必要移除 useMemo/useCallback 的情况（必须有 profiling 证据）
   b. startTransition 的使用是否合理（仅用于非紧急更新）
9. 检查虚拟化需求：
   a. 长列表渲染（如 table、select options、tree）是否使用了虚拟化
   b. 大型数据集的渲染是否有 content-visibility 或懒加载

输出格式：

分安全违规和性能违规两部分。

对每个发现：
### [维度15] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **类别**: 安全/性能
- **规则编号**: R2/R3/R5/P1/P3/P5/P6/P7
- **现状**: 一句话描述
- **风险**: 不修复的后果
- **建议**: 修复方向
```

---

## E. 文档与一致性

### 维度 16：文档-代码一致性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 16：文档-代码一致性

目标：确保架构文档准确反映当前代码状态，没有 owner 漂移或过时描述。

必读文档：
- docs/plans/00-plan-authoring-and-execution-guide.md
- docs/references/maintenance-checklist.md

执行步骤：

1. 读取 docs/architecture/ 下的所有文档。对每个文档：
   a. 识别文档中描述的文件路径、模块名、函数名、类型名
   b. 检查这些路径和名称是否在当前代码库中仍然存在
   c. 检查文档描述的行为是否与当前代码行为一致
2. 重点检查以下文档的准确性：
   a. flux-runtime-module-boundaries.md：文件所有权映射是否与实际文件匹配
   b. renderer-runtime.md：描述的 hooks 和 contexts 是否与 flux-react 导出一致
   c. styling-system.md：描述的 classAliases 机制是否与 flux-core 实现一致
   d. form-validation.md：描述的验证阶段是否与当前实现匹配
3. 检查 docs/references/terminology.md：
   a. 术语定义是否与代码中的实际命名一致
   b. 是否有新增的概念缺少术语定义
4. 检查 docs/plans/ 下的活跃计划：
   a. 状态标记是否与实际代码状态匹配
   b. 是否有标记为 "in progress" 但已完成的计划
   c. 是否有标记为 "completed" 但检查清单未全部通过的计划
   d. Last Reviewed 日期是否在合理范围内
5. 检查 AGENTS.md 中的路由表：
   a. 文档路由表的路径是否都有效
   b. 包结构描述是否与实际包列表匹配
6. 检查 docs/bugs/ 的历史教训：
   a. "Notes For Future Refactors" 中提到的问题是否已解决
   b. 是否有 bug 修复后又重新引入了相同模式

输出格式：

### [维度16] 简短标题
- **文档路径**: docs/xxx.md:行号
- **代码路径**: packages/xxx/src/yyy.ts:行号（如果有对应代码）
- **严重程度**: P0/P1/P2/P3
- **漂移类型**: 路径失效/行为不一致/owner漂移/术语过时/计划状态失真
- **文档描述**: 文档说了什么
- **代码现状**: 代码实际是什么
- **建议**: 更新方向
```

---

### 维度 17：命名与术语一致性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 17：命名与术语一致性

目标：确保同一概念在代码库中只有一个名称，不存在双词汇问题。

必读文档：
- docs/references/terminology.md
- docs/references/flux-json-conventions.md

执行步骤：

1. 对照 docs/references/terminology.md 检查代码中的命名：
   a. ScopeRef / scope / scopeRef 是否混用
   b. RendererRuntime / runtime / env 是否混用
   c. CompiledSchemaNode / compiledNode / templateNode 是否混用
   d. FormStoreApi / FormRuntime / form 是否混用
   e. PageStoreApi / PageRuntime / page 是否混用
2. 检查字段命名一致性：
   a. 是否有 name vs dataPath 双字段问题
   b. 是否有 items vs itemsSource 双字段问题
   c. 是否有 onClick vs handleClick 命名不一致
3. 检查 JSON schema 约定：
   a. 所有 key 是否为 camelCase
   b. 命名空间扩展是否使用 namespace:suffix 格式
   c. 图标命名是否遵循 kebab-case（config）和 PascalCase（runtime）
4. 检查函数命名模式：
   a. 工厂函数是否统一使用 create* 前缀
   b. 注册函数是否统一使用 register* 前缀
   c. use* 前缀是否仅用于 React hooks
   d. is* / has* 前缀是否仅用于布尔返回值函数
5. 检查文件命名模式：
   a. 同类文件是否使用一致的命名模式（如 *-renderer.tsx vs *.renderer.tsx）
   b. 测试文件是否统一使用 .test.ts / .test.tsx 后缀
   c. 工具文件命名是否一致（utils.ts vs utilities.ts vs helpers.ts）
6. 检查跨包命名一致性：
   a. flow-designer 和 report-designer 中相同概念是否使用相同名称
   b. 各 renderers 包中的注册函数是否遵循相同模式

输出格式：

命名冲突清单 + 统一建议。

对每个发现：
### [维度17] 简短标题
- **文件**: packages/xxx/src/yyy.ts:行号
- **严重程度**: P0/P1/P2/P3
- **冲突名称**: 名称 A vs 名称 B
- **冲突位置**: 两处使用位置
- **统一建议**: 应统一为哪个名称
```

---

### 维度 18：跨包模式一致性

**子 Agent 提示词**：

```
你正在审核 nop-chaos-flux 项目。这是一个 React 19 + Zustand + TypeScript 的低代码渲染引擎 monorepo（pnpm workspace）。

[固定项目背景 — 见上文"固定项目背景"章节]

通用审计口径：
1. 以当前代码为准，不以历史日志或口头约定为准。
2. 不重复报告已收敛的问题。
3. 不把"看起来不优雅"当问题，必须有结构性原因。
4. 对低代码动态边界保持克制。
5. 每个发现必须可定位：文件路径 + 行号范围。
6. 区分已自动化 vs 需人工发现。

---

审核维度 18：跨包模式一致性

目标：确保相同概念在不同包中的实现模式一致，不出现"各自实现一套"的情况。

必读文档：
- docs/architecture/flux-design-principles.md
- docs/references/integrating-third-party-components.md

执行步骤：

1. 渲染器注册模式一致性：
   a. 比较所有 flux-renderers-* 包的注册模式
   b. 是否都使用 RendererDefinition[] + registerXxxRenderers
   c. field metadata 定义模式是否一致
   d. 导出结构是否一致
2. Domain core/renderers 分层一致性：
   a. 比较 flow-designer、spreadsheet、report-designer 的分层模式
   b. core 包是否都只包含状态、逻辑、类型（无 React 依赖）
   c. renderers 包是否都只包含 React 组件和适配器
   d. 两层之间的桥接模式是否一致
3. Hook 使用模式一致性：
   a. 所有渲染器是否都使用相同的 hook 组合
   b. 表单字段渲染器是否都使用 useFormFieldController 或等价 hook
   c. 事件处理是否都使用 void props.events.xxx?.() 模式
4. 错误处理模式一致性：
   a. 异步操作的错误处理是否使用统一模式
   b. 验证错误是否使用统一的展示路径
   c. 运行时错误是否有统一的日志格式
5. Store 创建模式一致性：
   a. 所有 Zustand store 是否使用相同的创建模式
   b. 是否都使用 vanilla store + use-sync-external-store
   c. dispose/destroy 模式是否一致
6. 国际化 / 文本硬编码一致性：
   a. 用户可见文本是否集中管理（如错误消息、占位符）
   b. 是否有渲染器硬编码了中文/英文字符串

输出格式：

跨包不一致清单 + 统一方向建议。

对每个发现：
### [维度18] 简短标题
- **涉及包**: 包 A vs 包 B
- **文件**: packages/xxx/src/yyy.ts 和 packages/zzz/src/www.ts
- **严重程度**: P0/P1/P2/P3
- **不一致类别**: 注册模式/分层/hook/错误处理/store/文本
- **包 A 模式**: 描述
- **包 B 模式**: 描述
- **统一建议**: 应统一为哪种模式
```

---

## 附录 A：统一输出格式

### 单维度发现格式

每个维度的审核结果应按以下格式输出：

```markdown
### [维度NN] 简短标题

- **文件**: `packages/xxx/src/yyy.ts:行号范围`
- **严重程度**: P0（必须修）/ P1（应尽快修）/ P2（可排期）/ P3（可观察）
- **现状**: 一句话描述当前问题
- **风险**: 不修复的后果
- **建议**: 一句话描述修复方向
- **为什么值得现在做**: 当前 ROI，而非泛泛说"更优雅"
- **误报排除**: 说明为什么这不是合理 orchestrator、动态边界或刻意保留的兼容层
- **历史模式对应**: 对应到本仓库哪一类高频问题模式
- **参考文档**: 相关架构文档路径
```

### 汇总报告格式

主 agent 收到所有子 agent 的结果后，输出汇总报告：

```markdown
# 深度审核汇总报告

## 审核范围
- 执行的维度：[列表]
- 覆盖的包：[列表]
- 审核日期：YYYY-MM-DD
- 执行方式：每个维度一个子 agent，共 N 个子 agent

## P0 清单（按文件分组）
[table]

## P1 清单（按文件分组）
[table]

## 高频问题文件（出现在多个维度中的文件）
[table]

## 跨维度模式（多个维度报告的同类问题）
[描述]

## 已自动化的检查项（lint/check 已覆盖，不需人工跟进）
[list]

## 建议新增的自动化检查
[list]

## 可暂缓项（有问题但 ROI 暂时不高）
[list]

## 误报排除清单（看起来像问题但不建议动）
[list]
```

---

## 附录 B：执行优先级与并行策略

如果时间有限，建议按以下批次执行维度。同批次的维度互相独立，可以并行派发。

| 批次 | 维度 | 原因 | 并行度 |
|------|------|------|--------|
| **第一批** | 01 包边界 | 架构基础，影响所有其他维度 | 3 并行 |
| | 04 状态所有权 | 历史高频 bug 来源 | |
| | 15 安全与性能红线 | 有硬性规则要求 | |
| **第二批** | 05 订阅精度 | 直接影响用户可感知的性能 | 3 并行 |
| | 06 异步模式 | 历史高频 bug 来源 | |
| | 09 渲染器契约 | 代码量最大，影响面最广 | |
| **第三批** | 02 模块职责 | 可渐进改进 | 4 并行 |
| | 07 生命周期归属 | 架构分层关键 | |
| | 08 验证系统 | 复杂度最高的子系统 | |
| | 14 测试覆盖 | 质量保障基础 | |
| **第四批** | 03 API 表面积 | 长期维护性 | 3 并行 |
| | 10 样式系统 | 视觉一致性 | |
| | 13 类型安全 | 低代码项目的特殊约束 | |
| **第五批** | 11 UI 组件使用 | 规则简单，可批量修正 | 5 并行 |
| | 12 字段 Slot 建模 | 专业领域审核 | |
| | 16 文档-代码一致性 | 收尾完善 | |
| | 17 命名与术语一致性 | 收尾完善 | |
| | 18 跨包模式一致性 | 收尾完善 | |

---

## 附录 C：执行注意事项

1. **子 agent 类型**: 所有维度使用 `subagent_type="explore"`，因为审核以代码搜索和阅读为主。
2. **子 agent 提示词必须完整**: 每个维度的提示词是自包含的，派发时必须包含完整的项目背景和审计口径，不能省略。
3. **上下文隔离**: 每个子 agent 有独立的上下文窗口，不需要担心维度之间互相干扰。
4. **结果汇总**: 主 agent 负责收集所有子 agent 的输出，去重（同一问题可能被多个维度发现），按严重程度排序，生成汇总报告。
5. **增量审核**: 可以只选择部分维度执行，不必每次全量审核。用维度编号指定要执行的维度即可。
6. **与现有检查的关系**: 审核发现的机械问题应优先转化为 lint 规则或 check 脚本，而非持续依赖审核。
7. **结果归档**: 审核结果应保存在 `docs/logs/` 对应日期的日志中，作为后续改进的参考基线。

---

## 附录 D：快速调度模板

主 agent 可以使用以下模板快速派发子 agent：

### 单维度调度

```
Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界",
  prompt=<复制上面维度 01 的完整「子 Agent 提示词」>
)
```

### 批量并行调度（第一批示例）

```
同时派发 3 个 Task：

Task(
  subagent_type="explore",
  description="维度01: 依赖图与包边界",
  prompt=<维度 01 完整提示词>
)

Task(
  subagent_type="explore",
  description="维度04: 状态所有权与单一事实来源",
  prompt=<维度 04 完整提示词>
)

Task(
  subagent_type="explore",
  description="维度15: 安全与性能红线",
  prompt=<维度 15 完整提示词>
)
```

### 全量调度

```
按 5 个批次顺序派发，每批次内的维度并行：

批次 1: Task(01) + Task(04) + Task(15)
批次 2: Task(05) + Task(06) + Task(09)
批次 3: Task(02) + Task(07) + Task(08) + Task(14)
批次 4: Task(03) + Task(10) + Task(13)
批次 5: Task(11) + Task(12) + Task(16) + Task(17) + Task(18)
```
