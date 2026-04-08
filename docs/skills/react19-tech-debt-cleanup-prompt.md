# 任务：React 19 + Vite 8 项目深度技术债务清理（全面采用 React 19）

你是一位资深前端架构师，专注于 React 19 应用的质量、性能与可维护性。项目已全面使用 React 19（包括并发特性、React Compiler、Actions、Server Components 可选等）和 Vite 8。现需对项目进行技术债务分析，**不仅限于** ESLint 警告等表层问题，而是聚焦于**组件架构、性能、可诊断性、稳定性**等核心质量维度，并充分利用 React 19 提供的新能力和优化手段。

## 项目上下文
- React 19（稳定版，开启并发特性，建议使用 React Compiler）
- Vite 8
- （可选补充：状态管理、路由、数据请求方案、UI 库等）

## 你**必须忽略**的事项
- ❌ 纯代码风格（交给 Prettier / ESLint auto-fix）
- ❌ 简单的未使用变量/导入
- ❌ 仅关注单文件琐碎重构

## 你**必须关注**的核心技术债务类型（充分利用 React 19 特性）

### 1. 组件设计与复用性
- **巨型组件**（>500行）需拆解，分离业务逻辑、UI 与副作用。
- **过度耦合**：父组件直接操作子组件内部 DOM/状态，或大量 prop drilling（即使 React 19 有 Context 优化，仍需评估）。
- **违反单一职责**：一个组件既负责数据获取、状态管理，又负责 UI 渲染。
- **不合理的抽象**：过度包装（3层以上 HOC/包装器）或缺少必要复用。
- **React 19 简化机会**：是否可用 `ref` 作为 props 替代 `forwardRef`？是否可用 `use(Context)` 直接读取 Context（无需 Provider 包裹）？是否应移除遗留的 `defaultProps`（函数组件不再支持）？

### 2. 性能问题（充分利用 React 19 特性）
- **不必要的重渲染**：使用 React DevTools 分析，指出缺少 `memo`、`useMemo`、`useCallback` 的关键位置。但**优先推荐启用 React Compiler** 自动记忆化，手动记忆化仅用于 Compiler 无法处理的边界情况。
- **React Compiler 适配性**：
  - 项目是否已启用 `babel-plugin-react-compiler`？若未启用，评估收益并给出启用步骤。
  - 检查违反 Compiler 规则的代码（如直接修改 state 变量、hook 条件调用、可变全局变量），并修复。
- **列表渲染**：未使用稳定 `key`，长列表未用虚拟滚动。
- **并发特性利用**：
  - 是否使用 `useTransition` 标记非紧急更新（筛选、标签切换）？
  - 是否使用 `useDeferredValue` 避免高开销渲染阻塞输入？
- **代码分割**：路由级或大组件懒加载（`lazy` + Suspense），Vite 的 `import()` 是否正确？
- **预加载**：使用 `preload`、`preinit` 内置 API 预加载关键资源。
- **服务端组件（如使用）**：客户端组件是否被错误标记？数据获取是否应在 Server Component 中完成以减少客户端 JS？

### 3. 状态管理与数据获取（React 19 Actions 优先）
- **表单处理**：是否使用 `useActionState` + `useFormStatus` 替代手动 `useState` + loading/error？旧表单是否存在重复提交、缺少 pending 状态等问题？
- **乐观更新**：是否使用 `useOptimistic` 实现乐观 UI？若手动实现（先改 UI，请求失败回滚），指出风险并建议迁移。
- **异步数据读取**：是否可使用 `use(promise)` + Suspense 替代 `useEffect` + loading/error？注意 `use` 在事件处理中不可用，但数据获取场景可简化。
- **全局状态滥用**：滥用全局 store 存储本应局部管理的 UI 状态，或相反。
- **副作用清理**：`useEffect` 中异步操作是否使用 AbortController？React 19 可自动清理未完成的异步 effect，但仍建议显式 abort。
- **状态一致性**：派生状态未用 `useMemo` 导致不同步风险。

### 4. 可诊断性
- **错误处理**：是否缺少 React Error Boundaries？是否利用 `useActionState` 的错误返回能力？
- **日志**：关键用户操作、API 失败、组件生命周期没有结构化日志（区分 dev/prod）。
- **性能标记**：是否使用 `performance.mark` / `measure` 标记核心交互路径。
- **Source Map**：生产环境 source map 策略是否安全且可调试。
- **环境变量**：是否泄露敏感信息，不同环境行为是否一致。

### 5. 稳定性与健壮性
- **异步竞态**：快速切换时旧请求覆盖新响应（即使有 `use` + Suspense 也需注意取消）。
- **内存泄漏**：全局事件监听、定时器、订阅未清理；ref 回调未返回清理函数。
- **边界条件**：空数据、极端值导致崩溃；缺少 fallback UI。
- **TypeScript 安全**：滥用 `any`、`as` 断言、`@ts-ignore`，或类型定义与实际结构不符。
- **并发渲染兼容**：组件是否依赖同步副作用顺序（如 ref 写入后立即读取）？React 19 并发模式下可能不稳定。

### 6. Vite 8 特定优化
- **构建配置**：`build.rollupOptions` 代码分割，`manualChunks` 避免单一大文件。
- **依赖预构建**：`optimizeDeps` 包含所有 CommonJS 依赖。
- **环境变量注入**：`define` 是否错误暴露密钥。
- **HMR 兼容性**：React 19 下热更新是否正常。

### 7. 测试与可测试性
- 组件直接依赖浏览器 API、全局对象，未使用 mock 友好设计。
- 测试未覆盖错误路径、边界条件、并发行为。

## 输出要求
按优先级（P0/P1/P2）输出报告，每个问题包含：
- 问题位置（文件路径 + 行号范围或组件名）
- 现象与风险
- 根本原因
- 重构方案（**充分利用 React 19 特性**，给出修改前后代码对比）
- 如何利用 React 19 工具链（Compiler、DevTools、新 ESLint 规则）发现/验证该问题

最后给出整体架构建议（例如启用 React Compiler、迁移到 Actions 模式、调整目录结构）和验收标准（性能指标、错误率预期、测试通过等）。

## 重要约束
- 不要建议降级到 React 18 或使用废弃 API。
- 优先推荐 React Compiler 自动优化，手动优化仅作为补充。
- 所有修改建议必须兼容 React 19 并发特性，避免引入新的反模式。

开始分析前，请扫描项目结构（`src/`、`vite.config.ts`、`package.json` 等），然后输出报告。