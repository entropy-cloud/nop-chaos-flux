# 测试

> Flux 测试栈：**Vitest**（单元/组件）+ **Playwright**（E2E）+ **happy-dom/node** 双环境。**所有测试默认开启 schema 严格校验**，schema 有 error 级 diagnostic 直接挂测试。

---

## 测试栈

| 层               | 框架            | 环境                                 | 配置位置                                                                    |
| ---------------- | --------------- | ------------------------------------ | --------------------------------------------------------------------------- |
| 单元/组件        | Vitest 4        | `node`（纯逻辑）/ `happy-dom`（DOM） | `vitest.workspace.ts` + `packages/*/vitest.config.ts`                       |
| 共享配置         | —               | —                                    | `vitest.shared.ts:13` `createSharedVitestConfig({ environment, coverage })` |
| 全局 setup       | —               | —                                    | `test-setup/strict-validation.ts`（注入两个 strict 开关）                   |
| E2E              | Playwright 1.59 | Chromium only                        | `playwright.config.ts:46`，baseURL `http://127.0.0.1:4175`                  |
| 变异测试（可选） | Stryker         | —                                    | `stryker.runtime.conf.mjs`（仅 mutate `flux-runtime/src/validation`）       |

顶层脚本（`package.json`）：

- `pnpm test` = `turbo run test --concurrency=2`
- `pnpm test:coverage` = 加 `--coverage`
- `pnpm test:e2e` = `playwright test`

---

## 文件命名约定

| 命名                              | 位置                                              | 用途              |
| --------------------------------- | ------------------------------------------------- | ----------------- |
| `*.test.ts` / `*.test.tsx`        | 与源码同目录 colocated，或集中到 `src/__tests__/` | 单元/组件测试     |
| `*.spec.ts`                       | 仅 `tests/e2e/`                                   | Playwright E2E    |
| `test-support.{ts,tsx}`           | 包根 `src/`                                       | 顶层 helper       |
| `<feature>.test-support.{ts,tsx}` | feature 子目录                                    | feature 内 helper |

不约定统一的 `index.test.ts` 入口。

---

## 严格校验默认开启

`vitest.shared.ts:26-30` 在所有 Vitest 测试中注入：

```ts
env.__FLUX_STRICT_VALIDATION__ = 'true';
env.__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__ = 'true';
```

效果：schema 编译产生的 error 级 diagnostic 会直接抛 `Error('Schema compile diagnostics failed: ...')`，测试用例无需自己断言。Playwright 的 webServer 同样注入这两个开关 + `PLAYWRIGHT=true`（`playwright.config.ts:82-83`）。

---

## Mock helper 清单（按用途）

### Mock 渲染器 props（绕过完整编译）

`createMockRendererProps<S>(options)` 造完整的 `RendererComponentProps<S>`：

- `packages/flux-renderers-mobile/src/test-support.ts:18`
- `packages/flux-renderers-content/src/test-support.ts:18`

```tsx
const props = createMockRendererProps<MySchema>({ props: { msg: 'hi' } });
render(<MyRenderer {...props} />);
```

### Mock env / adapter / runtime / dispatcher（action 层一站式）

`packages/flux-action-core/src/__tests__/action-dispatcher-test-support.ts` 导出全套：

- `createMockEnv()` — `fetcher / notify / confirm / alert / monitor` 全 `vi.fn()`
- `createMockAdapter(overrides?)` — action adapter 三类调用全 `vi.fn()`
- `createMockRuntime(env?)` / `createMockScope()` / `createMockEvaluator()`
- `createActionCtx(overrides?)` — 构造 ActionContext
- `makeCompiledProgram(nodes)` — 构造编译好的 action 节点数组
- `createTestDispatcher(options?)` — 一站式装配 dispatcher + adapter + env + evaluator + runtime

### React runtime + scope providers（flux-react）

`packages/flux-react/src/test-support.tsx` 聚合导出（注意：**不在** package.json `exports`，需相对路径 import）：

- `env` — 默认 fetcher 返回 `{ ok:true, status:200, data:null }`，notify noop
- `sharedFormulaCompiler`
- stub 渲染器：`textRenderer` / `eventTextRenderer` / `pageRenderer` / `fragmentRenderer` / `formRenderer` / `probeInputRenderer` 等（用作 schema 内探针）
- `createScope(data)` — 构造最小可用 `ScopeRef`
- `renderWithRuntimeProviders({ runtime, page, surfaceRuntime?, schema, strictValidation? })` — 6 层 provider 包裹后 `render()`（定义在 `test-support-runtime.tsx:392`）

### 各渲染器包的 test-support（每个包一份）

| 包                       | 入口                   | 导出                                                                                                        |
| ------------------------ | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `flux-renderers-basic`   | `src/test-support.tsx` | `env`、`formulaCompiler`、`scopeProbeRenderer`、`createBasicSchemaRenderer(extra)`                          |
| `flux-renderers-form`    | `src/test-support.tsx` | `env`（fetcher 记录 scope 到 `submitCalls`）、`buttonRenderer`、`formStateProbeRenderer`、`formTestHarness` |
| `flux-renderers-data`    | `src/test-support.tsx` | `env`、`createDataSchemaRenderer(extra)`、`registerProbeNamespace`                                          |
| `flux-renderers-layout`  | `src/test-support.tsx` | `createLayoutSchemaRenderer(extra)`（内联 wizard/grid/collapse 等渲染器）                                   |
| `flux-renderers-mobile`  | `src/test-support.ts`  | `createMockRendererProps`                                                                                   |
| `flux-renderers-content` | `src/test-support.ts`  | `createMockRendererProps`                                                                                   |

DOM polyfills（happy-dom 缺失 API）：`packages/flux-renderers-form/src/test-dom-polyfills.ts` 给 `Element.prototype.scrollIntoView` 和 `globalThis.PointerEvent` 打补丁，import `test-support.tsx` 即自动启用。

---

## 渲染 schema 的标准做法

**flux 不提供顶层 `renderSchema`**。惯例：在测试文件或 test-support 里写一个本地 `renderSchema`，内部用 `createSchemaRenderer([...definitions])` + `@testing-library/react` 的 `render()`。

```tsx
// 标准模板（参考 flux-renderers-basic/src/__tests__/surface-enhancements.test.tsx:6）
import { render } from '@testing-library/react';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support';

function renderSchema(schema, data?, overrides?: { env? }) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://..."
      schema={schema}
      data={data}
      env={overrides?.env ?? env}
      formulaCompiler={formulaCompiler}
    />,
  );
}
```

---

## Mock `env.fetcher` / `loadDict` / `loadPage`

| 字段           | Mock 方式                                                                                                                           | 范例位置                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `env.fetcher`  | 默认返回空 200（包内 test-support 的 `env`）；记录型（fetcher 内把 scope 写 `submitCalls` 数组）；`vi.fn()` 版（`createMockEnv()`） | `flux-action-core/src/__tests__/action-dispatcher-test-support.ts:67` |
| `env.loadDict` | `vi.mock('@nop-chaos/flux-react', ...)` 替换 hook，再 `vi.mocked(useRendererEnv).mockReturnValue({ loadDict: mockLoadDict })`       | `flux-renderers-form/src/__tests__/select-dict-loading.test.tsx:4,48` |
| `env.loadPage` | 无专门 mock 入口；playground 的 `showcase-env.ts` 也未实现 `loadPage`，参考该文件整体 env 结构自行实现                              | —                                                                     |

**整套 mock 后端范例**：`apps/playground/src/complex-pages/shared/showcase-env.ts`（493 行）+ `mock-backend.ts`（`createMockDatabase`、`MOCK_DICTS` 等）。

**整模块替换**：渲染器单测常 `vi.mock('@nop-chaos/flux-react', () => ({ useRenderScope: ..., useScopeSelector: ... }))` 把 React 集成层替换为 stub；重外部依赖（recharts / @tanstack/react-virtual / @dnd-kit/\* / @nop-chaos/ui）也常用 `vi.mock(...)`。

---

## Action / formula 测试

### Action 链（动作程序）

在 `packages/flux-action-core/src/__tests__/` 下，约定 `createTestDispatcher` + `makeCompiledProgram([...nodes])` + `createActionCtx({ runtime })`：

- `action-dispatcher-routing.test.ts` — 路由（built-in / component / namespaced）
- `action-dispatcher-control-flow.test.ts` — 顺序 / `continueOnError` / parallel / retry / timeout
- `action-dispatcher-error-guard.test.ts` — 错误防护
- `contract-control-flow-*.test.ts` — 控制流契约
- `built-in-confirm-and-alert.test.ts` — 内置动作

runtime 层 adapter 测试在 `packages/flux-runtime/src/__tests__/action-adapter.*.test.ts`，用 `action-adapter.test-support.ts:10` 的 `createAdapter()` / `createCtx()`。

### Formula / 表达式

在 `packages/flux-formula/src/` 下，直接用 `createFormulaCompiler()` + `createExpressionCompiler(createFormulaCompiler())`：

```ts
import { createFormulaCompiler, createExpressionCompiler } from '@nop-chaos/flux-formula';

const compiler = createExpressionCompiler(createFormulaCompiler());
const compiled = compiler.compileExpression('${1 + 2}');
const result = compiled.exec(scope, env).value; // 3
```

参考 `packages/flux-formula/src/index.test.ts:43`（`describe('createFormulaCompiler')`）、`:50`（`detects template expressions`）、`:56`（`parses ternary expressions in templates`）。

---

## E2E（Playwright）

- 配置：`playwright.config.ts:46`（testDir `./tests/e2e`，baseURL `:4175`，dev server 注入 strict 开关 + `PLAYWRIGHT=true`）
- 共享 fixture：`tests/e2e/fixtures.ts` 扩展 `base` test，提供：
  - `consoleErrors` / `pageErrors` — 错误数组
  - `assertZeroPageErrors()` — 显式断言零错误
  - `allowConsoleErrors(count)` / `allowPageErrors(count)` — 放宽配额
  - `errorMonitor` — `scope:'test', auto:true` 自动 fixture，每条用例结束自动断言零 `console.error` / `pageerror`（带白名单与噪声过滤）
- 导航模式：绝大多数 spec 用 hash 路由直跳，`await page.goto('/#/page-id', { waitUntil: 'commit' })`（少数根路由场景用 `page.goto('/')`，如 debugger、flow-designer-ui 等）
- Component Lab helper：`tests/e2e/component-lab/helpers.ts:24` 提供 `openRendererDirect(page, id)` → `/#/lab/${id}`、`openLabHome(page)` → `/#/lab`，以及 `ComponentLabHelper` 类

**约定：E2E 默认零容忍 console.error / pageerror**。需要放宽时显式调用 `allowConsoleErrors(n)`。

---

## 推荐参考的 3 个测试范例

| 排序 | 范例                                                                                                                    | 学什么                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `packages/flux-renderers-basic/src/__tests__/surface-enhancements.test.tsx`                                             | 最干净的 `renderSchema(schema, data?, { env? })` 全渲染 + DOM 断言模板，覆盖 dialog/drawer 行为                                |
| 2    | `packages/flux-action-core/src/__tests__/action-dispatcher-routing.test.ts` + 配套 `action-dispatcher-test-support.ts`  | action 动作链测试标准入口；配套 test-support 是 `createMockEnv` / `createMockAdapter` / `createTestDispatcher` 的源头          |
| 3    | `packages/flux-renderers-form/src/__tests__/markdown-editor.test.tsx` + 配套 `flux-renderers-form/src/test-support.tsx` | 表单类渲染器测试：i18n 初始化、`buildForm` schema 工厂、stub 渲染器避免跨包依赖、通过 `formTestHarness.submitCalls` 断言提交值 |

可选补充：

- 公式测试最简范例：`packages/flux-formula/src/index.test.ts`
- E2E 入口：`tests/e2e/boolean-control-value-contract.spec.ts` + `tests/e2e/fixtures.ts` + `tests/e2e/component-lab/helpers.ts`

---

## 测试惯例速查

| 维度            | 惯例                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 断言风格        | 偏 marker / data-attribute / data-testid（如 `.nop-markdown-editor`、`.nop-field`、`[data-slot="dialog-surface"]`），**不用快照**（全仓 `toMatchSnapshot` 零命中） |
| 清理            | `afterEach(() => { cleanup(); vi.restoreAllMocks(); })`                                                                                                            |
| i18n 隔离       | test-support 顶层或 `beforeEach` 调 `resetFluxI18n(); initFluxI18n({ lng:'en-US', fallbackLng:'en-US' })`                                                          |
| 表单 scope 记录 | 通过 fetcher 把 scope 写入 `submitCalls` 数组再断言（见 `flux-renderers-form/src/test-support.tsx:176`）                                                           |
| 覆盖度          | 多数包 vitest.config.ts 配 `thresholds: { branches/functions/lines/statements: 80 }`                                                                               |
