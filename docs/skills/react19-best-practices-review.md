# React 19 最佳实践与代码 Review 指南

> **来源**: 基于 Vercel Engineering 的 React Best Practices，并结合 nop-chaos-flux 的 React 19 / Vite 8 / Zustand / TypeScript 基线收敛
> **适用**: React 19, Zustand, TypeScript 5.9, Vite 8, Vitest
> **定位**: 本项目应以本文档作为唯一的 React 19 review / tech-debt 清理工作流

---

## 目标

- 先自动化，再人工 review。
- 能由当前 lint 或静态脚本稳定发现的问题，不再保留为人工常驻 review 条目。
- 如果某类问题可以通过当前项目可配置的 lint 或静态检查解决，优先补规则，而不是继续扩人工清单。
- 本文档已经吸收 `docs/skills/react19-tech-debt-cleanup-prompt.md` 中仍然有价值的架构、稳定性、可诊断性、Vite 8、测试和 TypeScript 安全维度。

## 使用方式

1. 先读取上下文：`package.json`、`eslint.config.js`、`apps/playground/vite.config.ts`，以及与改动相关的 architecture 文档。
2. 先跑自动化：`pnpm lint`、`pnpm check`。有问题先修，不要直接进入人工 review。
3. 再做人工 review：只报告当前自动化没有稳定覆盖的问题。
4. 遇到重复出现的机械问题时，优先给出“如何加 lint / 静态检查”的方案。

## 当前项目已启用的自动化基线

| 主题 | 当前机制 | 已覆盖的问题 | 处理方式 |
| --- | --- | --- | --- |
| Hook 正确性 | `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | 条件调用 Hook、依赖数组缺失、`useEffectEvent` 被错误放进依赖数组 | 先修 lint，不再当人工 review 条目 |
| 组件稳定性 | `react-hooks/static-components`, `react-hooks/component-hook-factories` | render 内定义组件 / Hook 工厂，导致组件重建、状态丢失 | 先修 lint |
| 渲染纯度 | `react-hooks/refs`, `react-hooks/immutability`, `react-hooks/purity`, `react-hooks/globals`, `react-hooks/set-state-in-render`, `react-hooks/set-state-in-effect` | render 期 ref 读写、直接修改 props/state、render/effect 中同步 `setState` | 先修 lint |
| 错误边界误用 | `react-hooks/error-boundaries` | 用 `try/catch` 包裹子组件渲染，误当 Error Boundary 替代方案 | 先修 lint |
| Memo / Compiler | `react-hooks/use-memo`, `react-hooks/void-use-memo`, `react-hooks/preserve-manual-memoization`, `react-compiler/react-compiler` | 明显错误的 `useMemo`、compiler-hostile 写法、破坏手动 memo 边界 | 先修 lint |
| React 19 遗留 API | `no-restricted-imports`, `no-restricted-properties`, `scripts/check-react19-legacy-apis.mjs` | legacy `react-dom` API、`react-test-renderer`、常见 `Component.defaultProps` / `Component.propTypes` 回退、legacy context、string ref、`element.ref`、JSX inline arrow ref callback 的隐式返回 | 先修 lint / check |
| 文件规模 | `scripts/check-oversized-code-files.mjs` 通过 `pnpm check` 运行 | `git ls-files` 收录的 `apps/`、`packages/`、`scripts/`、`tests/` 代码文件超过 500 行 | 先修 `pnpm check` |

### 已从人工 review 清单移除的问题

以下问题已经适合交给当前自动化基线，不再保留为本文档的人工 review 项：

- render 内定义组件
- Hook 条件调用
- 依赖数组遗漏
- `useEffectEvent` 被放进依赖数组
- 在 render 中 `setState`
- 在 effect 中同步 `setState` 推导派生状态
- 用 `try/catch` 包裹子组件渲染代替 Error Boundary
- props / state / ref 的明显不纯写法
- compiler-hostile 模式
- `defaultProps`、`propTypes`、string ref、legacy context、legacy ReactDOM API
- 被 `pnpm check` 覆盖的 tracked code files 超过 500 行

### 自动化基线的边界

自动化并不等于全部覆盖。以下情况仍需要人工判断：

- 虽然不报 lint，但 `useMemo`、`useCallback` 的收益很低，或者本该直接删除
- 没有语法错误，但存在真实 waterfall、bundle 膨胀、竞态、无取消异步、结构性职责混杂
- 没有违反 Hook 规则，但组件分层、store 边界、renderer 契约明显不合理
- `scripts/check-react19-legacy-apis.mjs` 目前只扫描 `apps/`、`packages/`、`tests/`，不是整个仓库
- callback ref 的静态检查目前只覆盖 JSX inline arrow function 的 expression body 隐式返回
- `scripts/check-oversized-code-files.mjs` 只检查 tracked code files，不检查未纳入 `git ls-files` 的临时文件

## 当前项目可配置、但尚未启用的 lint / 静态检查候选

这些问题不应长期靠人工 review 反复指出；如果开始高频出现，优先落规则。

### 1. `forwardRef` 迁移到 React 19 `ref as a prop`

当前仓库没有禁止 `forwardRef`。如果团队决定系统迁移，可以直接用现有 ESLint 的 `no-restricted-imports` 收敛。

```js
{
  rules: {
    'no-restricted-imports': ['error', {
      paths: [
        {
          name: 'react',
          importNames: ['forwardRef'],
          message: 'Prefer ref as a prop in React 19 unless a compatibility boundary requires forwardRef.'
        }
      ]
    }]
  }
}
```

只在以下条件都成立时启用：

- 目标包不再需要 React 18 兼容写法
- 已评估公共 API、泛型组件和第三方封装边界
- 团队确认这不是局部试验，而是统一方向

### 2. 重型 barrel import

`lucide-react` 这类根入口导入如果已经被确认有体积成本，更适合用 `no-restricted-imports` 直接限制。

```js
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['lucide-react'],
          message: 'Prefer icon subpath imports or a measured build-time transform for Vite.'
        }
      ]
    }]
  }
}
```

说明：

- 只对已经证明有成本的库启用，不要一刀切限制所有 barrel import。
- Vite 8 没有 Next.js 风格的 `optimizePackageImports` 现成选项；优先显式子路径导入，或引入经过验证的构建转换方案。

### 3. 列表 key 规则

当前仓库没有启用 `eslint-plugin-react`，因此缺失 `key` 或使用数组索引 `key` 还需要人工 review。若开始频繁出现，建议补这个插件。

安装：

```bash
pnpm add -D eslint-plugin-react
```

配置示例：

```js
const react = require('eslint-plugin-react');

{
  files: ['**/*.{jsx,tsx}'],
  plugins: { react },
  rules: {
    'react/jsx-key': 'error',
    'react/no-array-index-key': 'warn'
  }
}
```

### 4. 仓库专用 AST 检查

当某种模式连续多次被人工指出时，优先扩 `scripts/check-react19-legacy-apis.mjs` 这类脚本。

适合脚本化的例子：

- 禁止新增 `forwardRef`
- 禁止某些已确认高成本的根入口导入
- 禁止无说明的 `eslint-disable react-compiler/react-compiler`
- 禁止在 renderer 中直接导入底层 store 实现

## 人工 Review 重点

这里只保留自动化当前抓不到、但确实影响质量的问题。

### P0: Waterfall、加载边界与竞态

#### 1. 消除 waterfall

Waterfall 仍然是优先级最高的问题。重点看：

- 独立 async 是否仍然顺序 `await`
- 是否在便宜的同步条件判断之前就触发了昂贵 async
- 数据源、导入链、动作链里是否存在本可并行却串行执行的步骤

```ts
// ❌ 顺序等待
const user = await fetchUser()
const posts = await fetchPosts()

// ✅ 并行等待
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()])
```

#### 2. 异步取消与覆盖竞态

重点看：

- 快速切换筛选、分页、标签、路由时，旧请求是否覆盖新结果
- `useEffect` 发起的请求是否带 `AbortController` 或等价取消逻辑
- 保存、自动补全、搜索联想是否可能发生后返回覆盖先返回

```ts
useEffect(() => {
  const controller = new AbortController()

  void fetch(url, { signal: controller.signal })
    .then(readJson)
    .then((data) => setData(data))
    .catch((error) => {
      if (error.name !== 'AbortError') throw error
    })

  return () => controller.abort()
}, [url])
```

#### 3. 主包体积与懒加载边界

重点看：

- 代码编辑器、图表、设计器、报表、词编辑器等重型模块是否仍落在主 chunk
- `lazy`、`Suspense`、动态 `import()` 是否对应真实用户路径边界
- 是否存在首屏永远不会用到但初始化就加载的第三方库
- 是否应该用 `preload`、`preinit` 或用户意图预加载缩短下一步等待

```tsx
const CodeEditor = lazy(() => import('./code-editor'))
```

### P1: 交互延迟与渲染代价

#### 4. 非紧急更新

重点看：

- 筛选、排序、分页、标签切换、批量勾选等是否应使用 `startTransition` 或 `useTransition`
- 大型筛选结果、搜索结果、树/表格派生结果是否适合 `useDeferredValue`
- 不要机械地把所有事件处理都包进 transition，只延迟派生更新

#### 5. 长列表与可见性

重点看：

- 长列表是否缺少虚拟滚动
- 不能虚拟化时，是否至少可用 `content-visibility`
- 列表项是否存在明显 O(n^2) 派生、重复排序或重复查找

#### 6. JS 热路径

重点看：

- 重复查找是否可以改为 `Map` / `Set`
- DOM 读写是否交错造成 layout thrashing
- 正则、排序器、大对象是否在热 render 路径重复创建
- 多次遍历只有在热路径且有证据时才值得合并

#### 7. 低价值 memo

当前 lint 不会自动抓出所有“虽然合法但几乎没有收益”的 `useMemo` / `useCallback`。人工 review 要重点识别：

- 只包一层简单布尔表达式或字符串拼接
- 仅返回原依赖，不做任何计算
- 为了压依赖数组而强行引入 memo

```tsx
// ❌ 低价值 memo
const isLoading = useMemo(() => user.isLoading || notifications.isLoading, [user.isLoading, notifications.isLoading])

// ✅ 直接计算
const isLoading = user.isLoading || notifications.isLoading
```

### P1: React 19 状态与数据模式

#### 8. 表单提交模式

重点看：

- 手写 `isPending`、`error`、`submitted` 是否可以改为 `useActionState` + `useFormStatus`
- 是否存在重复提交、pending 不一致、错误显示散落的问题

```tsx
const [state, formAction] = useActionState(submitAction, initialState)

<form action={formAction}>
  <SubmitButton />
  {state.error ? <p>{state.error}</p> : null}
</form>
```

#### 9. 乐观更新与异步读取

重点看：

- 手写乐观回滚逻辑是否应迁移到 `useOptimistic`
- `useEffect + loading/error` 是否可以改成 `use(promise)` + `Suspense`
- `use(context)` 只有在明显简化控制流时才值得采用，不做无收益批量迁移

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (state, newTodo) => [...state, { ...newTodo, sending: true }]
)
```

#### 10. Store 边界与派生状态

重点看：

- 全局 store 是否承载了本应局部的 UI 状态，或反过来把共享状态埋进局部组件
- lint 没拦住的“外部状态同步到本地 state”是否真的必要
- 派生状态是否仍通过额外 state 存储，导致一致性问题

### P1: 组件设计与项目契约

#### 11. 组件职责与耦合

重点看：

- 一个组件是否同时承担数据获取、状态编排、UI 渲染和副作用
- 父组件是否直接操作子组件 DOM 或内部状态
- 是否存在 3 层以上 wrapper/HOC 但没有清晰收益
- 即使未超过 500 行，也要审查职责是否已经过度混杂

#### 12. Renderer 组件规范

所有 renderer 组件必须遵循 `RendererComponentProps` 模式，并通过标准 hooks 访问运行时能力。

```tsx
import type { RendererComponentProps } from '@nop-chaos/flux-react'
import { Button } from '@nop-chaos/ui'

function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  return (
    <Button
      variant={props.props.variant}
      size={props.props.size}
      disabled={props.meta.disabled}
      className={props.meta.className}
      onClick={() => props.events.onClick?.()}
      data-testid={props.meta.testid}
    >
      {props.props.label}
    </Button>
  )
}
```

数据来源：

- `props.props`: 解析后的运行时值
- `props.meta`: 解析后的元数据
- `props.regions`: 预编译的子渲染句柄
- `props.events`: 运行时事件处理器
- `props.helpers`: 稳定的运行时助手

禁止：

- 在 renderer 中直接访问 store
- 绕过 `useRendererRuntime()`、`useRenderScope()`、`useScopeSelector()`、`useActionDispatcher()`

#### 13. 样式与 UI 组件约束

重点看：

- Renderer 仅发出 marker classes，如 `nop-container`、`nop-flex`
- Renderer 内不硬编码 `gap-*`、`flex`、`p-*`、`grid` 这类隐式布局
- 使用 `cn()` 合并 class
- 布局通过 `stack-*`、`hstack-*` 或 schema 驱动 `className` 表达
- JSX 中优先使用 `@nop-chaos/ui` 组件，而不是回退到原生 `button`、`input`、`label`、`select`

### P1: 可诊断性、稳定性与 Vite 8

#### 14. 错误边界与 fallback

重点看：

- 页面级、surface 级、异步片段级是否缺少 Error Boundary 或 Suspense fallback
- 边界放置粒度是否合理；lint 只能拦住明显误用，不能判断哪里应该有边界
- 是否利用 `useActionState` 的返回状态承载用户可见错误，而不是只打日志

#### 15. 可诊断性

重点看：

- 关键用户操作、API 失败、恢复路径是否缺少结构化日志
- 核心交互路径是否缺少 `performance.mark` / `measure`
- 生产 source map 策略是否兼顾可诊断和信息暴露边界
- 环境变量是否通过 `define` 或客户端构建泄露不该暴露的内容

#### 16. 并发兼容性与资源清理

重点看：

- 组件是否依赖 ref 写入后立刻同步读取的顺序假设
- 全局事件、定时器、订阅、观察器是否完整清理
- callback ref 是否需要显式清理
- 快速切换场景下是否有未取消的异步副作用

#### 17. Vite 8 与测试

重点看：

- 新增重型包后，`build.rollupOptions.output.manualChunks` 是否需要扩展
- 只有在 dev 启动或 HMR 确有问题时，再评估 `optimizeDeps`
- 组件是否直接绑定浏览器全局对象，导致测试难以 mock
- 测试是否覆盖错误路径、边界值、并发交互和取消逻辑

#### 18. TypeScript 安全逃生口

重点看：

- 是否新增了无边界的 `any`
- 是否通过高风险 `as` 断言掩盖真实数据形状问题
- 是否出现 `@ts-ignore` 或长期不清理的 `@ts-expect-error`
- 运行时真实结构和声明类型是否已经漂移，导致 React 19 并发或异步路径下更难诊断

## 不要报告的内容

- 纯格式化或 Prettier 问题
- 简单未使用变量或导入
- 已被当前 `pnpm lint` 或 `pnpm check` 稳定拦住的问题
- 以“多加一点 `useMemo` / `useCallback`”作为默认答案的评论
- 建议回退到 React 18 或重新引入 legacy API 的方案

## Review 输出格式

按优先级 P0 / P1 / P2 输出，每个问题包含：

1. 位置：文件路径 + 行号范围或组件名
2. 问题：现象与风险
3. 原因：根本原因分析
4. 方案：修复代码对比或结构调整方案
5. 验证：如何验证修复
6. 自动化建议：当前哪个 lint / check 本应拦住它；如果没有，应该新增哪条规则或脚本

## 验收标准

- 没有新增 `pnpm lint` 或 `pnpm check` 违规
- 受影响包的 `pnpm typecheck`、`pnpm build`、`pnpm test` 通过
- 性能相关结论有 profile、bundle、waterfall 或交互实测证据
- 对重复出现的机械问题给出自动化收敛方案，而不是只留下口头规范

## 参考

- `eslint.config.js`
- `scripts/check-react19-legacy-apis.mjs`
- `scripts/check-oversized-code-files.mjs`
- `apps/playground/vite.config.ts`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/form-validation.md`
- [React 19 文档](https://react.dev)
- [React Compiler](https://react.dev/learn/react-compiler)
- [Vercel React Best Practices](https://vercel.com/blog/how-we-made-the-vercel-dashboard-twice-as-fast)
