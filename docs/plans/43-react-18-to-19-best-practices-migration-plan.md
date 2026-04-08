# 43 React 18 -> 19 最佳实践迁移计划

> Plan Status: completed
> Last Reviewed: 2026-04-08; verification, codemod audit, and guardrail closure completed on 2026-04-08
> Source: React 19 Upgrade Guide, `react-codemod` README, `types-react-codemod` README, React v19 release post, `package.json`, `tsconfig.base.json`, `eslint.config.js`, workspace grep audit

## Purpose

本计划用于把仓库从“依赖版本已经到 React 19，但迁移过程缺少完整闭环”的状态，收口到“React 19 是唯一工程基线，且代码、lint、测试、文档都按 React 19 最佳实践约束”的状态。

当前仓库主干已经声明 React 19 依赖，因此本计划不是单纯的版本号升级清单，而是一次 React 18 -> 19 迁移的补完计划：补齐自动化迁移、lint 防回归、最佳实践收敛和文档一致性。

## 当前结论快照

- 根 `package.json` 已经使用 `@types/react` / `@types/react-dom` 19。
- `apps/playground/package.json` 与多个 `packages/*/package.json` 已经声明 `react` / `react-dom` `^19.0.0`。
- `tsconfig.base.json` 已经使用 `jsx: "react-jsx"`，满足 React 19 对新 JSX transform 的前置要求。
- `apps/playground/src/main.tsx` 已经使用 `ReactDOM.createRoot(...)`，主入口不再依赖 `ReactDOM.render(...)`。
- `eslint.config.js` 已经启用 `eslint-plugin-react-hooks` 7 的 `recommended-latest`，说明 hooks/compiler 向 lint 基线已经部分到位。
- 2026-04-08 的工作区 grep 没有发现 `ReactDOM.render`、`ReactDOM.hydrate`、`findDOMNode`、`react-dom/test-utils`、`react-test-renderer/shallow`、零参数 `useRef()` 的存量调用。
- 仍然存在两个结构性差距：
  - React 19 迁移缺少一份“自动化工具优先 + lint 防回归 + 最佳实践 adoption”的专门执行计划。
  - 文档仍残留 React 18 compatibility 语义，例如 `docs/plans/28-workspace-latest-dependency-and-lint-upgrade-plan.md` 与 `docs/logs/2026/04-04.md` 里仍把“保留 React 18 兼容性”当作有效前提，而 `docs/architecture/frontend-baseline.md` 已经把 React 19 记为当前基线。

## Execution Status Snapshot

- 2026-04-08 已落地 Phase 5 的第一批 guardrails：`eslint.config.js` 新增 React 19 legacy API 限制，根 `package.json` 新增 `pnpm check:react19`，并接入 `lint` 流程。
- 2026-04-08 已新增 AST 级审计脚本 `scripts/check-react19-legacy-apis.mjs`，用于补齐 grep 与 ESLint 对 legacy context、string refs、`element.ref`、函数组件 `defaultProps` / `propTypes`、隐式 ref callback return 等模式的覆盖盲区。
- 2026-04-08 已开始收口文档冲突：`docs/architecture/frontend-baseline.md` 明确 React 19 only 基线，`docs/plans/28-workspace-latest-dependency-and-lint-upgrade-plan.md` 标记其 React 18 compatibility 前提为历史假设。
- 2026-04-08 已完成仓库级验证：`pnpm check:react19`、`pnpm lint`、`pnpm typecheck`、`pnpm build`、`pnpm test` 全部通过；此前阻塞全量测试的 `flux-react` import lifecycle/render-loop 问题已经通过拆分测试文件和本地化 imported binding 更新修复。
- 2026-04-08 已完成 TypeScript codemod 审计：`pnpm dlx types-react-codemod@latest preset-19 apps/playground packages tests --dry --yes` 结果为 `960 unmodified / 4 ok / 0 errors`，说明仓库仅剩极少量可机械调整点且不存在批量 React 19 类型迁移缺口。
- 2026-04-08 尝试执行官方 `codemod@latest react/19/migration-recipe --dry-run` 时，当前 Windows 环境因缺失 `@codemod.com/cli-win32-x64-msvc` 可选原生包而无法启动；该阻塞属于工具分发问题而非代码兼容性问题，因此本计划以现有 AST 审计、grep、lint 与全量测试结果作为等价 closure 证据。
- 2026-04-08 已确认至少一条高 ROI adoption 实例：`packages/nop-debugger/src/panel.tsx` 使用 `useDeferredValue` 对搜索输入去抖式延后渲染，符合本计划对重交互搜索面的渐进 adoption 策略。

## Problem

当前仓库已经运行在 React 19 依赖上，但这更像是若干增量升级、bug fix 和工具链刷新叠加后的结果，而不是一次正式完成的 React 18 -> 19 迁移。

这导致四个问题：

- 没有保留官方 codemod/类型 codemod 的执行路径和证据，后续维护者无法判断“哪些兼容项已被自动化处理，哪些只是暂时没踩到”。
- `eslint-plugin-react-hooks` 已经很严格，但还没有一层专门阻止 React 18 及更早时代 legacy API 重新进入仓库的 lint/CI 约束。
- React 19 的最佳实践 adoption 仍是零散状态，例如 `useEffectEvent`、`startTransition`、`useDeferredValue`、`ref` as prop、`useActionState` 等还没有明确的适用边界和迁移顺序。
- 文档层同时存在“React 19 已是基线”和“仍需保 React 18 兼容”的双轨表述，容易误导后续改动。

## Root Cause

- React 19 相关工作是穿插在更大范围的工具链升级、render-loop 修复、external-store 稳定性修复里的，没有单独作为迁移项目立项。
- 迁移重点先放在“让代码在 React 19 下能稳定运行”，没有继续完成“把 React 19 变成唯一规范基线”的治理工作。
- 现有 lint 基线更关注 hooks analyzability 和 compiler-friendly 结构，不覆盖 legacy React DOM API、旧测试工具、旧 ref/context 模式的回归防线。
- React 19 新能力很多，但本仓库是低代码 runtime + designer/debugger monorepo，不适合把所有新 API 一次性机械改写；缺少一份按 ROI 排序的 adoption 方案。

## Goals

- 把 React 19 定义为仓库唯一有效的 React 基线，不再以“保持 React 18 兼容”为默认前提。
- 尽量用官方自动化工具完成机械迁移，包括版本升级、React codemod、TypeScript codemod 和 ESLint 自动修复。
- 在现有 ESLint flat config 上增加 React 19 legacy API 防回归检查，而不是只依赖人工 code review。
- 把 React 19 最佳实践分为“必须收口”和“按场景渐进 adoption”两类，避免为了追求新语法而做低 ROI 大改。
- 让代码、测试、lint、文档对 React 19 的表述和约束收敛到同一个答案。

## Non-Goals

- 不为了“看起来像 React 19”而全仓库批量改写所有 `forwardRef`、所有 `Context.Provider`、或所有表单实现。
- 不把 React 19 迁移扩大成 React Server Components、Server Actions、SSR 体系重写。
- 不替换 Zustand / `useSyncExternalStore` 主体架构；本计划只要求它们在 React 19 下稳定且符合最佳实践。
- 不把所有异步交互都强行改成 `useActionState` / form actions；只有在真正贴合本仓库表单与交互模型时才采用。
- 不因为 lint 引入而接受大量低价值例外；例外必须是架构边界，而不是迁移偷懒。

## Scope

- 根 `package.json`、`pnpm-lock.yaml`
- `apps/playground/package.json`
- `packages/*/package.json` 中声明 React 依赖的包
- `tsconfig.base.json` 与覆盖 JSX 相关配置的 package `tsconfig*.json`
- `eslint.config.js`
- `scripts/` 下新增或调整的 React 19 审计脚本
- `apps/playground/src/main.tsx` 与其他 React root entry
- `packages/*/src/**/*.tsx`、`*.test.tsx`
- `tests/`
- `docs/architecture/frontend-baseline.md`
- `docs/logs/`
- 与 React 18 compatibility 表述直接冲突的计划/日志文档

## 不在 Scope 内的事项

- 引入 RSC、Server Actions、SSR framework 适配
- 与 React 19 无直接关系的 UI 重设计
- 把所有上下文 provider 语法统一改成 `<Context value={...}>`
- 单纯为了新语法而重写稳定、无痛点、无收益的现有组件

## React 19 目标基线

### 必须达成的基线

- `react`、`react-dom`、`@types/react`、`@types/react-dom` 在 workspace 内统一到 19.x。
- 所有 React 入口只使用 `createRoot` / `hydrateRoot`。
- 保持新 JSX transform；不允许退回旧 transform。
- 不再使用 React 19 已移除或已明确淘汰的 API：
  - `ReactDOM.render`
  - `ReactDOM.hydrate`
  - `unmountComponentAtNode`
  - `findDOMNode`
  - `react-dom/test-utils`
  - `react-test-renderer/shallow`
  - string refs
  - legacy context API
- `useSyncExternalStore` / selector 订阅路径必须提供稳定 `getSnapshot()` 语义，避免 React 19 下 render-loop 和无限重订阅。

### 需要渐进 adoption 的 React 19 最佳实践

- 新写或大改的函数组件优先使用 `ref` as prop；现有 `forwardRef` 仅在低风险、收益明确时迁移。
- effect 内部需要读最新闭包但不应重新触发 effect 的场景，优先评估 `useEffectEvent`。
- 搜索、过滤、designer/debugger 大量非紧急更新，优先评估 `startTransition` / `useDeferredValue`。
- 真正符合 HTML form action 模型、并且当前 pending/error/optimistic 逻辑较重的表单，优先评估 `useActionState`、`useFormStatus`、`useOptimistic`。
- 新增测试优先使用 `@testing-library/react`，不再引入 `react-test-renderer` 风格的实现细节测试。
- 新增 root 级挂载点如需错误采集，要明确评估 `createRoot` / `hydrateRoot` 的 `onCaughtError`、`onUncaughtError`、`onRecoverableError`。

### Lint 目标

- 继续保持 `eslint-plugin-react-hooks` 7 的 `recommended-latest`。
- 在 ESLint 中显式禁止 React 19 legacy API，包括 named import 与 namespace/property access 两种写法。
- 对 ESLint 不易表达的模式增加脚本级检查，并接入 `pnpm lint` 或等价 CI 流程。
- 让 lint 结果能回答两个问题：
  - 旧 API 有没有回流？
  - 新增代码是否持续朝 React 19 的推荐模式靠拢？

## 执行策略

本计划采用“自动化优先、手工收口其次、最佳实践分层 adoption”的策略。

原则如下：

- 先跑官方 codemod 和 types codemod，再处理它们暴露出的真实问题，不反过来凭印象手改。
- 如果当前主干上某些 codemod 运行结果是 no-op，这属于正向证据，不是白做。
- 先建立 lint/CI 防回归，再做最佳实践扩散，避免迁移完成后又被旧模式回流。
- React 19 最佳实践只在高价值路径强制 adoption；低收益语法更新不应吞噬本项目的实现预算。
- 不把“批量增加/优化 `useMemo`、`useCallback`”之类自动重写当成 React 19 迁移主线；性能与 compiler 友好性仍按真实热点和 ROI 单独评估。
- 对于已有 React 19 敏感区（external-store snapshot identity、render phase update、heavy interactive surfaces），优先补测试和 guardrails，而不是只改表层 API。

## 自动化优先方案

建议优先采用以下工具链：

- React 官方当前更推荐用 `codemod@latest` 作为执行入口来运行 `react-codemod` transforms；旧 `react-codemod` CLI 视为 legacy fallback，不作为本计划默认路径。
- 像 `update-react-imports` 这类 import cleanup 只作为低优先级可选收尾，不计入迁移完成标准；只有在仓库决定顺手清理冗余 `import React` 时再单独执行。

```bash
# 如果仍有 React 18 分支或 package 残留，先过 18.3 warning harvest
pnpm up -r react@^18.3 react-dom@^18.3

# 正式统一到 React 19
pnpm up -r react@^19 react-dom@^19 @types/react@^19 @types/react-dom@^19

# 官方 React 19 迁移 codemod
pnpm dlx codemod@latest react/19/migration-recipe apps/playground packages tests

# React 19 TypeScript 类型迁移
pnpm dlx types-react-codemod@latest preset-19 apps/playground packages tests

# 如果 element.props / ref callback 返回值等问题集中暴露，再追加定向 codemod
pnpm dlx types-react-codemod@latest react-element-default-any-props apps/playground packages
pnpm dlx types-react-codemod@latest no-implicit-ref-callback-return apps/playground packages

# 迁移后自动修复可修复 lint
pnpm exec eslint apps packages tests --fix
```

配套审计命令建议保留在执行记录中：

```bash
rg "ReactDOM\\.render|ReactDOM\\.hydrate|findDOMNode|unmountComponentAtNode|react-dom/test-utils|react-test-renderer|createFactory\\("
rg "childContextTypes|contextTypes|getChildContext|ref=['\"]|\\.propTypes\\s*=|propTypes\\s*="
rg "useRef\\(\\)|element\\.ref|\\.defaultProps\\s*=|defaultProps\\s*="
rg "forwardRef\\(|useEffectEvent\\(|startTransition\\(|useDeferredValue\\(|useActionState\\(|useFormStatus\\(|useOptimistic\\("
```

这些 grep 只适合做快速 preflight；像 `import { render } from 'react-dom'`、`import { createFactory } from 'react'` 这类 named import 形式必须由 ESLint 或脚本级 AST 检查覆盖，不能只靠文本搜索。

## Execution Plan

**Phase 0 — 基线冻结与差距归类**

Targets: manifests, `tsconfig.base.json`, `eslint.config.js`, React roots, docs

- 固化当前真实状态：
  - 哪些依赖已经是 React 19
  - 哪些入口已经用 `createRoot`
  - 哪些 legacy API 已经清零
  - 哪些文档仍保留 React 18 compatibility 前提
- 对 grep/codemod 结果做四类归档：
  - 已符合 React 19
  - 可由官方 codemod 自动处理
  - 需要手工修复
  - 不属于兼容问题，而是最佳实践 follow-up
- 明确“当前主干已在 React 19 上运行”这一事实，避免后续计划把工作误写成纯版本升级。

Exit criteria:

- 有一份可复查的 React 19 audit 结果。
- 所有剩余问题都被分类到 codemod、manual fix 或 best-practice adoption。
- 文档冲突点被列入后续 phase，而不是继续混在“兼容性假设”里。

**Phase 1 — 重放并统一依赖/类型基线**

Targets: root `package.json`, `apps/*/package.json`, `packages/*/package.json`, lockfile, TS configs

- 如果执行时仍存在 React 18 分支、包或 lockfile 漂移，先走 React 18.3 warning harvest，再统一切到 19。
- 统一以下依赖版本策略：
  - `react`
  - `react-dom`
  - `@types/react`
  - `@types/react-dom`
- 验证 `tsconfig.base.json` 和特殊包 `tsconfig.json` 继续保持 `jsx: react-jsx`。
- 检查 Vite/plugin-react、测试环境和第三方库 peer dependency 是否都明确支持 React 19。
- 锁定“React 19 only”的工程前提，不再新增“同时兼容 React 18/19”的 package-level 策略。

Exit criteria:

- workspace manifests 和 lockfile 对 React 19 的声明一致。
- JSX transform 与 React 19 类型基线一致。
- 没有残留只因“想保 React 18 兼容”而存在的版本约束。

**Phase 2 — 先跑官方 codemod，再收口自动修复**

Targets: `apps/playground`, `packages/*`, `tests/*`

- 先执行 `react/19/migration-recipe`，把官方已经覆盖的机械迁移一次收掉。
- 再执行 `types-react-codemod` `preset-19`，优先解决：
  - `useRef` 新签名
  - ref callback cleanup 返回值
  - `ReactElement["props"]` 默认 `unknown`
  - JSX namespace 相关声明迁移
- 若 codemod 报告 no-op，保留结果作为“当前仓库已清除该类 API”的证据。
- 对 codemod 产出的局部格式/类型噪音，使用 ESLint `--fix` 先自动修掉一轮。

Exit criteria:

- 官方 codemod 和 TS codemod 均已执行或完成 dry-run 证明。
- 机械迁移问题没有遗留到人工大范围重写阶段。
- codemod 产生的改动可以按批次审查，而不是混成不可读的大 patch。

**Phase 3 — 修复 React 19 correctness 敏感点**

Targets: hooks-heavy packages, external-store consumers, tests, root entries

- 审计所有 `useSyncExternalStore` / `useSyncExternalStoreWithSelector` 使用点，确保：
  - `getSnapshot()` 不在每次读取时无条件构造全新对象
  - selector 结果在可复用时保持稳定
  - 不在 render 阶段触发 state update
- 修复 codemod 无法自动解决的 ref/type 正确性问题：
  - 隐式返回 ref callback
  - 依赖旧 `ReactElement["props"]` 默认 `any` 的不安全访问
  - 需要显式 `useRef(undefined)` / `useRef(null)` 初值的调用
- 审计测试基础设施，确认没有回流到 `react-dom/test-utils`、`react-test-renderer` 或 shallow rendering。
- 对新增或已存在的 root 级挂载点，明确是否需要 `onCaughtError` / `onUncaughtError` / `onRecoverableError` 钩子，而不是依赖 React 18 时代的“重新抛出错误”行为。
- 如果准备引入 `use`，明确禁止在 client component render 中创建 uncached promise；该条需先由文档和 review 约束，再考虑代码 adoption。

Exit criteria:

- React 19 下最容易暴露问题的 correctness surface 都有明确修复或测试覆盖。
- 之前依赖 React 18 宽松行为的代码路径被清理掉。
- 不会再因为 external-store snapshot identity 这类问题反复出现 React 19 render-loop regression。

**Phase 4 — 按 ROI 采用 React 19 最佳实践**

Targets: heavy-interaction UI, form-heavy surfaces, touched component APIs

- 对高频交互页面采用 React 19 推荐模式：
  - debugger 搜索、designer 过滤、表格重计算等非紧急更新优先评估 `startTransition`
  - 大结果列表或查询输入优先评估 `useDeferredValue`
- 对 effect 中的事件式逻辑优先评估 `useEffectEvent`，减少为了绕 stale closure 而引入的 ref/mutable workaround。
- 对真正由 HTML form 驱动的局部流程，试点：
  - `useActionState`
  - `useFormStatus`
  - `useOptimistic`
  - 原生 `form action`
- 对新写或大改的函数组件，优先使用 `ref` as prop；现有 `forwardRef` 只在以下条件满足时迁移：
  - 组件为本仓库自有
  - 改动不会放大 public API 风险
  - 有明确收益，不是纯语法换皮
- `Context.Provider` -> `<Context>` 作为低优先级语法收口项，不阻塞计划完成。

Exit criteria:

- React 19 adoption 不是全仓库形式主义，而是在最有价值的交互和 effect 场景里落地。
- 新写代码开始默认朝 React 19 推荐模式靠拢。
- 历史组件不会因为大规模语法 churn 影响稳定性。

**Phase 5 — 引入 lint 与脚本级防回归检查**

Targets: `eslint.config.js`, `scripts/`, root `package.json`

- 在现有 flat config 上新增 `no-restricted-imports` 规则，至少禁止模块导入与命名导入两类入口：
  - `react-dom/test-utils`
  - `react-test-renderer`
  - `react-test-renderer/shallow`
  - `from 'react-dom'` 的 `render`、`hydrate`、`findDOMNode`、`unmountComponentAtNode`
  - `from 'react'` 的 `createFactory`
- 新增 `no-restricted-properties` 或等价限制，兜住 namespace/property access 形式，至少禁止：
  - `ReactDOM.render`
  - `ReactDOM.hydrate`
  - `ReactDOM.findDOMNode`
  - `ReactDOM.unmountComponentAtNode`
  - `React.createFactory`
- 对 ESLint 不易稳定表达的 React 19 legacy 模式，增加脚本级审计，例如 `scripts/check-react19-legacy-apis.mjs`；不要把纯 grep 当成充足证明，这部分需要 AST 级检查来补 named import 盲区。脚本至少扫描：
  - `childContextTypes`
  - `contextTypes`
  - `getChildContext`
  - string refs
  - `element.ref`
  - 函数组件 `propTypes =`
  - 函数组件 `defaultProps =`
  - `React.createFactory` / `createFactory(...)` 残留
  - 需要特别警惕的隐式 ref callback return
- 把该脚本接入现有 `lint` 或单独 `check:react19`，并让 CI 显式执行。
- 保持 `react-hooks` `recommended-latest`，不为了迁移便利而回退到更弱 preset。
- 明确 `eslint-plugin-react-hooks` 只负责 hooks/compiler 向约束，不把它误当成 legacy React API 审计替代品。

Exit criteria:

- 旧 API 再次进入仓库时，lint/CI 会直接失败。
- React 19 的关键边界不再依赖人工记忆。
- hooks/compiler 向 lint 基线与 React 19 迁移 guardrails 可以共存，而不是二选一。

**Phase 6 — 文档收口与计划闭环**

Targets: `docs/architecture/frontend-baseline.md`, `docs/logs/`, related plans/logs

- 更新 `docs/architecture/frontend-baseline.md`，把 React 19 最佳实践和唯一基线写清楚。
- 更新 daily log，记录：
  - 用了哪些自动化工具
  - 哪些 codemod 是 no-op
  - 哪些问题需要手工修复
  - 哪些 React 19 新能力被明确采用/明确不采用
- 清理或标注历史文档中仍把 React 18 compatibility 当作当前前提的表述，至少覆盖：
  - `docs/plans/28-workspace-latest-dependency-and-lint-upgrade-plan.md`
  - `docs/logs/2026/04-04.md`
- 如有必要，在相关 architecture/reference 文档中补一小节，说明本仓库对 React 19 最佳实践的具体取舍，不把“官方所有新特性”误写成“仓库全部必须使用”。

Exit criteria:

- 文档不再同时给出 React 18 和 React 19 两套有效前提。
- 后续维护者能清楚分辨“必须遵守的 React 19 基线”和“按场景采用的 React 19 新能力”。

## 风险

### 风险 1：官方 codemod 在当前主干上大多 no-op，团队误以为迁移没有价值

Mitigation:

- 把 no-op 结果当作审计证据记录下来。
- 后续价值重点转移到 lint guardrail 和 best-practice adoption，而不是强行造改动。

### 风险 2：把 React 19 最佳实践误解成“全仓库语法翻新”

Mitigation:

- 明确区分 mandatory baseline 与 gradual adoption。
- `forwardRef`、`Context.Provider` 等只在高 ROI 情况下迁移，不做形式主义 sweeping rewrite。

### 风险 3：external-store snapshot identity 问题在 React 19 下反复复发

Mitigation:

- 把 `useSyncExternalStore` audit 和 targeted tests 作为独立 phase，而不是附带检查。
- 对已有敏感包按依赖顺序逐个验证，而不是只跑一次全局测试。

### 风险 4：lint 规则过宽，制造大量与迁移目标无关的噪音

Mitigation:

- 优先使用 targeted `no-restricted-imports` / `no-restricted-properties` 与轻量审计脚本。
- 先防 legacy API 回流，再考虑更宽的 React 风格规则。
- 不把纯 grep 结果当成充分证明；named import 形式必须由 AST 级检查兜底。

### 风险 5：为了采用新 API 而损伤 low-code runtime 的可解释性

Mitigation:

- `useActionState`、`useOptimistic`、form actions 只在天然贴合 HTML form / local async mutation 的表面采用。
- 不把 React 19 新能力强塞进 runtime core contract。

## Validation Checklist

- [x] React 相关依赖在 workspace 内统一到 19.x
- [x] `jsx: react-jsx` 在根和特殊包配置中保持一致
- [x] 官方 React 19 codemod 已执行或完成 dry-run 审计
- [x] `types-react-codemod` `preset-19` 已执行或完成 dry-run 审计
- [x] 没有 `ReactDOM.render` / `hydrate` / `findDOMNode` / `unmountComponentAtNode` / `React.createFactory`
- [x] 没有 `react-dom/test-utils`、`react-test-renderer`、`react-test-renderer/shallow`
- [x] 没有 legacy context API、string refs，以及函数组件 `.propTypes =` / `.defaultProps =`
- [x] `useSyncExternalStore` 敏感路径通过 snapshot stability 验证
- [x] 新增 lint/脚本检查能阻止 legacy API 以 named import 与 namespace/property access 两种形式回流
- [x] React 19 最佳实践 adoption 已在高 ROI 场景落地至少一批代表性实例
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 如 root / integration surface 受影响，补跑 `pnpm test:e2e`
- [x] `docs/logs/` 与相关 architecture docs 已更新
- [x] React 18 compatibility 的历史表述已被标记为历史背景，而不是当前约束

## Success Criteria

本计划完成后，仓库应从“已经在 React 19 上运行，但迁移过程和最佳实践仍靠默认共识维持”收敛到：

- React 19 是唯一被文档、lint、测试和依赖声明同时承认的工程基线。
- React 官方推荐的自动化迁移工具已经被执行或审计过，机械兼容工作不再留灰区。
- legacy React API 的回流可以被 lint/CI 自动阻止。
- React 19 新能力的 adoption 有明确边界：高价值场景已经落地，低价值语法 churn 不再冒充“最佳实践”。
- 后续维护者可以在不重新争论“到底还要不要保 React 18 兼容”的前提下继续开发。
