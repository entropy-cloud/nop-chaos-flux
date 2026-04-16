# React 19 最佳实践与代码 Review 指南

> **来源**: 基于 Vercel Engineering 的 React Best Practices，并结合 nop-chaos-flux 的 React 19 / Vite 8 / Zustand / TypeScript 基线收敛
> **适用**: React 19, Zustand, TypeScript 5.9, Vite 8, Vitest
> **定位**: 本项目唯一的 React 19 review / tech-debt 清理文档

---

## 目标

- 先跑自动化，再做人工 review。
- 能被当前 lint / check 稳定发现的问题，不再保留为人工常驻清单。
- 低代码项目允许弱类型 schema/runtime 对象；不要引入会把这类对象全量打成噪音的规则。
- 发现重复机械问题时，优先补 lint / 静态检查，而不是继续扩文档。

## 先跑什么

先运行：

- `pnpm lint`
- `pnpm check`

人工 review 只报告这两步没有稳定拦住的问题。

## 当前已启用的 lint / check 基线

### 1. React Hook / Compiler 正确性

通过这些规则保证：

- `react-hooks/rules-of-hooks`
- `react-hooks/exhaustive-deps`
- `react-hooks/static-components`
- `react-hooks/component-hook-factories`
- `react-hooks/refs`
- `react-hooks/immutability`
- `react-hooks/purity`
- `react-hooks/globals`
- `react-hooks/set-state-in-render`
- `react-hooks/set-state-in-effect`
- `react-hooks/error-boundaries`
- `react-hooks/use-memo`
- `react-hooks/void-use-memo`
- `react-hooks/preserve-manual-memoization`
- `react-compiler/react-compiler`

这些规则主要确保：

- Hook 调用顺序正确
- 依赖数组不缺项
- `useEffectEvent` 不会被错误放进依赖数组
- render 内不动态定义组件 / Hook 工厂
- render / effect 中不出现明显不纯写法
- 不引入 React Compiler 不兼容模式
- 不用 `try/catch` 伪装 Error Boundary

### 2. React JSX / DOM 基础安全

通过这些规则保证：

- `react/jsx-key`
- `react/jsx-no-comment-textnodes`
- `react/jsx-no-duplicate-props`
- `react/jsx-no-target-blank`
- `react/jsx-no-script-url`
- `react/jsx-no-undef`
- `react/button-has-type`
- `react/no-children-prop`
- `react/no-danger-with-children`
- `react/no-deprecated`
- `react/no-direct-mutation-state`
- `react/no-find-dom-node`
- `react/no-is-mounted`
- `react/no-render-return-value`
- `react/no-string-refs`
- `react/no-unknown-property`
- `react/no-array-index-key`
- `react/jsx-no-constructed-context-values`

这些规则主要确保：

- JSX 基本正确性
- 原生按钮不会因为默认 submit 行为埋坑
- 不重新引入旧 React API 和危险 JSX 写法
- Context provider 的 `value` 不能每次 render 都新建对象
- 列表必须提供显式稳定 key；没有天然业务 id 时，先显式计算 `rowKey` 再传给 `key`

### 3. TypeScript / ESLint 基础保护

通过这些规则保证：

- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/ban-ts-comment`
- `reportUnusedDisableDirectives`

这些规则主要确保：

- 不保留无效参数和废代码
- `@ts-expect-error` 必须带说明
- 禁止 `@ts-ignore` / `@ts-nocheck`
- 当前不禁止 `@ts-check`
- 禁止失效的 `eslint-disable`

说明：

- **没有启用** `@typescript-eslint/no-explicit-any` 和一组 `no-unsafe-*` 规则。
- 原因不是忽视类型安全，而是本项目是大型低代码引擎，schema、runtime payload、动态表单值、设计器节点数据里会存在大量弱类型对象；这些规则会把正常边界代码打成海量噪音。
- TypeScript 安全仍要人工 review，但要关注真正危险的逃生口，而不是机械禁止所有弱类型。

### 4. React 19 遗留 API 与结构性检查

通过这些机制保证：

- `no-restricted-imports`
- `no-restricted-properties`
- `scripts/check-react19-legacy-apis.mjs`
- `scripts/check-oversized-code-files.mjs`

这些检查主要确保：

- 不重新引入 legacy `react-dom` API
- 不重新引入 `react-test-renderer`
- 不回退到 `defaultProps` / `propTypes` / legacy context / string ref
- tracked code files 不超过 500 行

## 低代码项目例外

### Lucide 图标不要裁剪

本项目是低代码引擎，运行时会根据字符串名称解析图标：

- `packages/flux-renderers-basic/src/icon.tsx`
- `packages/flow-designer-renderers/src/designer-icon.tsx`

因此：

- **必须保留 `lucide-react` 全量图标集合**
- **不要**为 bundle 优化而禁止 `lucide-react` 根入口导入
- **不要**在本文档中再建议 icon subpath import 或图标裁剪

这不是优化遗漏，而是运行时按名称取图标的产品约束。

### 弱类型对象是受控现实，不是默认问题

以下对象在低代码引擎中天然偏弱类型：

- schema 片段
- 动态表单值
- designer / runtime payload
- action args / scope 数据
- 外部数据源返回值

因此：

- 不要把“出现 `any` / `unknown` / `Record<string, unknown>`”本身当成问题
- 要关注的是：边界是否清晰、是否有收敛、是否把危险断言扩散到了业务核心路径

## 已由自动化覆盖，不必重复做人工 review 的问题

- Hook 条件调用
- 依赖数组遗漏
- `useEffectEvent` 被放进依赖数组
- render 内定义组件 / Hook 工厂
- render 中 `setState`
- effect 中同步 `setState` 推导派生状态
- 明显的 props / state / ref 不纯写法
- compiler-hostile 模式
- `try/catch` 伪装 Error Boundary
- legacy ReactDOM API / string ref / legacy context / `defaultProps`
- 缺失 JSX key
- 缺失按钮 `type`
- 无说明的 `@ts-ignore` / `@ts-nocheck`
- 失效的 `eslint-disable`
- tracked code files 超过 500 行

## 自动化没有完全覆盖的点

- `scripts/check-react19-legacy-apis.mjs` 只扫描 `apps/`、`packages/`、`tests/`
- callback ref 的静态检查目前只覆盖 JSX inline arrow function 的隐式返回
- lint 不能判断 waterfall、bundle 边界、竞态、取消逻辑、组件职责是否真的合理
- lint 不能判断弱类型对象是否在正确边界内被收敛

## 人工 Review 重点

### P0: Waterfall、竞态、加载边界

重点看：

- 独立 async 是否仍然顺序 `await`
- 快速切换时旧请求是否覆盖新结果
- `useEffect` 异步是否有 `AbortController` 或等价取消
- 代码编辑器、图表、设计器、报表、词编辑器等重型模块是否仍落在主 chunk

### P1: 交互与渲染成本

重点看：

- 非紧急更新是否应使用 `startTransition` / `useTransition`
- 大型派生结果是否适合 `useDeferredValue`
- 长列表是否应虚拟化或至少使用 `content-visibility`
- 当前不报 lint 但明显低价值的 `useMemo` / `useCallback`

### P1: React 19 模式迁移

重点看：

- 表单是否应改为 `useActionState` + `useFormStatus`
- 乐观更新是否应改为 `useOptimistic`
- `useEffect + loading/error` 是否应改为 `use(promise)` + `Suspense`

### P1: 低代码引擎边界

重点看：

- 全局 store 和局部状态边界是否合理
- renderer 是否通过标准 hooks 工作，而不是直接接触底层 store
- 弱类型对象是否被限制在 schema / runtime 边界，而不是扩散进核心逻辑
- 组件是否同时承担数据获取、状态编排、UI 渲染和副作用

### P1: 可诊断性与稳定性

重点看：

- 页面级 / surface 级 / 异步片段级是否缺少合适的 Error Boundary / Suspense fallback
- 是否缺少结构化日志、`performance.mark` / `measure`
- 是否有未清理的全局事件、定时器、订阅、观察器
- source map、环境变量、Vite 构建边界是否合理

## 不要默认开启的规则

以下规则在低代码引擎里要非常谨慎，不要因为“看起来更严格”就直接全局开启：

- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-return`

原因：它们会把 schema/runtime 的动态边界全部打成噪音，反而削弱真正问题的可见性。

## Review 输出格式

按 P0 / P1 / P2 输出，每个问题包含：

1. 位置：文件路径 + 行号范围或组件名
2. 问题：现象与风险
3. 原因：根本原因分析
4. 方案：修复代码对比或结构调整方案
5. 验证：如何验证修复
6. 自动化建议：当前哪个 lint / check 本应拦住它；如果没有，是否值得新增规则

## 验收标准

- `pnpm lint` 没有 error
- `pnpm check` 通过
- 对重复出现的机械问题优先给出自动化收敛方案
- 不为了追求静态类型“纯度”而破坏低代码运行时边界

## 参考

- `eslint.config.js`
- `scripts/check-react19-legacy-apis.mjs`
- `scripts/check-oversized-code-files.mjs`
- `apps/playground/vite.config.ts`
- `packages/flux-renderers-basic/src/icon.tsx`
- `packages/flow-designer-renderers/src/designer-icon.tsx`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/form-validation.md`
