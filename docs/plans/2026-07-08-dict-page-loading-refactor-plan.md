# 2026-07-08 dict/page loading: env.loadDict + select dict property + framework boundary cleanup

> Plan Status: active
> Last Reviewed: 2026-07-08
> Source: design discussion on @dict/@page extension mechanism vs framework boundary
> Supersedes: `docs/plans/451-flux-page-dict-loading-and-precompile-plan.md` (reverses Phase 2-4 design: caches + @dict dispatch moved out of flux-runtime; provider interfaces flattened to env functions)
> Related: `docs/plans/2026-07-05-ajax-messages-config-plan.md`

## Purpose

将 dict/page 加载策略从 flux 框架移到应用层。flux 只保留接口和扩展点（`RendererEnv.loadDict` / `RendererEnv.loadPage`），应用提供具体实现（URL 解析、缓存、角色过滤）。同时为 select 渲染器增加 `dict` 声明式属性，通过 `env.loadDict` 异步加载选项。

## Design Reversal Rationale

Plan 451（2026-07-06 落地）将 `loadFluxPage`/`loadDict` + 全局缓存 + `@dict:` dispatch 放进 flux-runtime，使用 provider 对象接口（`FluxPageProvider`/`FluxDictProvider`）。经进一步设计讨论，认定以下架构原则：

- **flux 是前端框架**，不应决定"从哪个 URL 加载页面"或"缓存策略是什么"——这些是应用级策略。
- **缓存（LRU/TTL）、URL 解析、角色过滤**应该由每个应用自行实现（playground 用 mock，nop-chaos-next 用 GraphQL + LRU）。
- **provider 对象接口**（`{ getPage(): Promise<...> }`）不如扁平函数（`loadPage?: (path) => Promise<...>`）简洁，且与 `env.fetcher`/`env.notify` 等 flat function 风格一致。

因此本计划反转 451 的 Phase 2-4 设计：缓存和 dispatch 从 flux-runtime 移除，provider 接口扁平化为 env 函数。`DictBean` 类型保留（定义返回数据形状）。

## Current Baseline

### nop-chaos-flux（本仓库）

- `RendererEnv`（`flux-core/types/renderer-api.ts:93-113`）有 `pageProvider?: FluxPageProvider` 和 `dictProvider?: FluxDictProvider` 钩子，以及 `hasRole?` / `locale?`
- `FluxPageProvider` / `FluxDictProvider` 接口在 `flux-core/types/renderer-api.ts:47-55`，各只有单个方法 `getPage` / `getDict`
- `flux-runtime/special-url/` 包含完整的加载 + 缓存实现：
  - `loaders.ts`：`loadFluxPage()` / `loadDict()`，含 locale-keyed 缓存 + in-flight 去重 + clone-on-read
  - `page-cache.ts`：LRU（max 50），locale 键，error-evict
  - `dict-cache.ts`：TTL（20s），locale 键，error-evict
  - `dispatch.ts`：`splitSpecialPrefix()` URL 解析器
  - 有完整单元测试（`loaders.test.ts` / `dispatch.test.ts`）
- `request-runtime.ts:510-521` 的 `fetchWithSpecialUrlDispatch` 拦截 `@dict:` URL → `loadDict()` → 返回 `{ status: 0, data: dict.options }`
- `@page:` 尚未接入 request-runtime 分发
- select 渲染器（`input-choice-renderers.tsx:182`）从 `props.props.options` 读取选项，支持 `allowSource: true` + `sourceStateKey: 'optionsSourceState'` 的 source 机制
- crud-demo 的 role/status select 使用硬编码 `options` 数组（`crud-demo.json:87-102,246-265`）
- `DictBean` 接口（`flux-core/types/renderer-api.ts:39`）定义 `{ name, label?, options: [{value, label, code?}] }`
- `flux-runtime/src/index.ts` **不导出** special-url 任何符号（已核实）
- 当前**无生产 schema** 使用 `@dict:` URL（仅 special-url 测试）

### nop-chaos-next（消费方项目）

- Flux 通过 **tarball** 消费（`libs/nop-chaos-flux-0.1.0.tgz` → `@nop-chaos/flux`），不是 workspace 源码包
- Flux env 构建在 `apps/main/src/flux/adapter.ts` 的 `createMainFluxEnv()`：提供 `fetcher` / `notify` / `navigate` / `confirm`，**无 `loadDict` / `loadPage`**
- Flux page provider 在 `apps/main/src/flux/providers.ts` 的 `fetchFluxPage()`：**无缓存**，仅支持 mock 路径
- **Flux 无 dict provider**
- AMIS 侧有独立体系：page cache（`services/pageApi.ts` LRU 50 + locale 键）、dict API（`services/dictApi.ts` **无缓存**）
- `apps/main/src/amis/providers.ts` 提供 `mainAmisPageProvider` / `mainAmisDictProvider`
- `flux-lib/ui/` 仅共享 UI 组件库（`@nop-chaos/ui`），不桥接 flux runtime

## Goals

- select 渲染器支持 `dict: "role"` 声明式属性，通过 `env.loadDict(name)` 异步加载选项
- `RendererEnv` 用 `loadDict?: (name, signal?) => Promise<DictBean>` 和 `loadPage?: (path, signal?) => Promise<SchemaInput>` 替代 `dictProvider` / `pageProvider`
- `special-url/` 目录（loaders + caches + dispatch）从 flux-runtime 移除，缓存策略归应用层
- `request-runtime.ts` 不再包含 `@dict:` URL 分发
- crud-demo 的 role/status select 改用 `dict` 属性
- playground 提供 mock `loadDict` 实现

## Non-Goals

- `transformPageJson`（`xui:roles` 角色过滤）——应用层实现，本计划不做
- `bindActions`（嵌套 `@` URL 重写 + `xui:import`）——应用层实现，本计划不做
- `@page:` 完整加载管线——应用层通过 `env.loadPage` 提供，本计划只做接口接线
- 其他渲染器的 dict 支持（radio-group / checkbox-group）——后续扩展
- **nop-chaos-next 的 `loadDict` / `loadPage` 接线**——跨仓库，本计划提供缓存迁移指南但不在本仓库内验证（见 Deferred But Adjudicated）
- **`@dict:` source URL 模式不再支持**——`options: { type: "source", api: { url: "@dict:role" } }` 不再被框架拦截；需要字典选项的 select 应使用 `dict: "role"` 声明式属性

## Scope

### In Scope

- flux-core：`RendererEnv` API 变更（`loadDict` / `loadPage` 替代 providers）
- flux-core：移除 `FluxPageProvider` / `FluxDictProvider` 接口
- flux-runtime：删除 `special-url/` 目录
- flux-runtime：移除 `request-runtime.ts` 的 `@dict:` 分发
- flux-renderers-form：select 定义增加 `dict` 字段
- flux-renderers-form：select 渲染器实现 dict 异步加载
- playground：提供 mock `loadDict` 实现
- crud-demo：role/status select 改用 `dict`
- `docs/architecture/flux-page-dict-loading-and-precompile.md` 重写为最终设计

### Out Of Scope

- 完整的 `@page:` / `@dict:` URL 分发（留在应用层）
- 角色过滤 `transformPageJson`
- Action 绑定 `bindActions`
- radio-group / checkbox-group 的 dict 支持
- nop-chaos-next 仓库内的实现（跨仓库，Deferred）

## Failure Paths

| 场景                     | 触发                                                                 | 行为                                               | 用户可见表现              |
| ------------------------ | -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------- |
| dict-not-configured      | `dict: "role"` 但 `env.loadDict` 未配置                              | select 渲染空选项 + console.warn                   | select 无选项，控制台警告 |
| dict-load-error          | `env.loadDict("role")` reject                                        | select 渲染空选项 + console.warn                   | select 无选项             |
| dict-empty               | `env.loadDict` 返回 `DictBean` 但 `options` 为空数组                 | select 正常渲染，无选项                            | select 无选项             |
| dict-and-sourced-options | schema 同时指定 `dict: "role"` 和 `options: { type: "source", ... }` | `dict` 优先，sourced-options 被忽略 + console.warn | select 显示 dict 选项     |

## Test Strategy

本档选择：**建议有测**

select dict 加载是新渲染器行为，应有 focused 单测验证核心路径（dict 属性触发加载、选项映射、loading 状态、fallback）。缓存策略移到应用层后不再需要框架级缓存测试。全量 typecheck/build/lint/test 在 Closure Gates 执行。

## Execution Plan

### Phase 1 — flux-core: RendererEnv API 变更

Status: planned
Targets: `packages/flux-core/src/types/renderer-api.ts`

- Item Types: `Fix`

> **注意**：Phase 1 删除 `RendererEnv.dictProvider/pageProvider` 后，`special-url/loaders.ts:45,86`（读 `env.dictProvider`/`env.pageProvider`）会在 workspace typecheck 报错。Phase 1 + Phase 2 必须一起落地才不破坏 workspace。Phase 1 exit 只跑局部 flux-core typecheck（合规），workspace 级 typecheck 在 Phase 2 exit 验证。
>
> **命名碰撞**：Phase 1 新增的 `RendererEnv.loadDict` 字段与 `special-url/loaders.ts:81` 的 `export function loadDict` 同名。Phase 2 删除 loaders.ts 后碰撞消失。此为有意且短暂的跨包共存。

- [ ] 移除 `FluxPageProvider` / `FluxDictProvider` 接口（`renderer-api.ts:47-55`）
- [ ] `RendererEnv` 中 `pageProvider?: FluxPageProvider` → `loadPage?: (path: string, signal?: AbortSignal) => Promise<SchemaInput>`
- [ ] `RendererEnv` 中 `dictProvider?: FluxDictProvider` → `loadDict?: (name: string, signal?: AbortSignal) => Promise<DictBean>`
- [ ] 保留 `DictBean` 接口、`hasRole?`、`locale?`
- [ ] 局部 typecheck 通过（`pnpm --filter @nop-chaos/flux-core typecheck`）

Exit Criteria:

- [ ] `RendererEnv` 暴露 `loadDict?` / `loadPage?` 扁平函数，不再有 provider 对象
- [ ] `FluxPageProvider` / `FluxDictProvider` 从 flux-core 导出中移除

### Phase 2 — flux-runtime: 移除 special-url + @dict dispatch

Status: planned
Targets: `packages/flux-runtime/src/special-url/`, `packages/flux-runtime/src/async-data/request-runtime.ts`

- Item Types: `Fix`

- [ ] 删除 `packages/flux-runtime/src/special-url/` 整个目录（loaders.ts, loaders.test.ts, page-cache.ts, dict-cache.ts, dispatch.ts, dispatch.test.ts, index.ts）
- [ ] `request-runtime.ts`：移除 `fetchWithSpecialUrlDispatch` 函数及 `@dict:` 分支，移除 `import { loadDict }` 和 `import { splitSpecialPrefix }`
- [ ] `request-runtime.ts`：`createApiRequestExecutor` 直接使用 `ctx.env.fetcher`
- [ ] 确认 `flux-runtime/src/index.ts` 无 special-url 导出（当前已无，核验即可）
- [ ] 局部 typecheck + test 通过（`pnpm --filter @nop-chaos/flux-runtime typecheck && pnpm --filter @nop-chaos/flux-runtime test -- --run`）

Exit Criteria:

- [ ] `special-url/` 目录不存在
- [ ] `request-runtime.ts` 不包含 `@dict:` 或 `splitSpecialPrefix` 引用
- [ ] flux-runtime 所有现有单测通过（除被删除的 special-url 测试）

### Phase 3 — flux-renderers-form: select dict 属性

Status: planned
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`, `packages/flux-renderers-form/src/schemas.ts`

- Item Types: `Fix`, `Proof`

- [ ] `schemas.ts`：`SelectSchema` 增加 `dict?: string` 属性
- [ ] `input.tsx`：select renderer definition 的 `fields` 增加 `{ key: 'dict', kind: 'prop' }`
- [ ] `input-choice-renderers.tsx`：`SelectRenderer` 通过 `useRendererRuntime()`（`flux-react/hooks.ts`）取得 `runtime.env.loadDict(dictName)`，当 `props.props.dict` 存在时异步加载 `DictBean`，将 `bean.options` 映射为 select 选项
- [ ] 实现 `useDictOptions` hook（或内联 useEffect）：接收 dictName，返回 `{ options, loading, error }`，处理取消/清理
- [ ] 当 `dict` 和 `options` 同时存在时（包括 sourced-options），`dict` 优先 + console.warn
- [ ] 当 `env.loadDict` 未配置时，console.warn 并回退到 `props.props.options`
- [ ] 新增 focused 单测 `select-dict-loading.test.tsx`：验证 dict 属性触发加载、选项映射、loading 状态、env 未配置时的 fallback
- [ ] 新增 schema-prop-coverage 测试：在测试文件中包含 `{ type: 'select', dict: 'role' }` schema literal，使 `pnpm check:schema-prop-coverage` 通过
- [ ] 局部 typecheck + test + `pnpm check:schema-prop-coverage` 通过

Exit Criteria:

- [ ] select schema 支持 `dict: "role"` 属性
- [ ] `dict` 属性通过 `useRendererRuntime()` → `env.loadDict(name)` 加载，返回的 `DictBean.options` 映射为 select 选项
- [ ] `env.loadDict` 未配置时 warn + fallback 到 `options` 属性
- [ ] focused 单测覆盖核心路径
- [ ] schema prop coverage lint 通过（`dict` 属性有测试覆盖）

### Phase 4 — Playground: mock loadDict + crud-demo dict 改造

Status: planned
Targets: `apps/playground/src/pages/crud-demo-page.tsx`, `apps/playground/src/schemas/crud-demo.json`

- Item Types: `Fix`

- [ ] `crud-demo-page.tsx`：`env` 增加 `loadDict` 实现（mock 字典数据：role → 管理员/用户/访客，status → 启用/禁用；返回 `DictBean`；可选简单内存缓存）
- [ ] `crud-demo.json`：role select 从硬编码 `options` 改为 `"dict": "role"`
- [ ] `crud-demo.json`：status select 从硬编码 `options` 改为 `"dict": "status"`
- [ ] crud-demo e2e 全部通过（6/6）

Exit Criteria:

- [ ] playground `env` 提供 `loadDict` 函数
- [ ] crud-demo select 使用 `dict` 属性，e2e 全绿
- [ ] select 显示中文标签（管理员/用户/访客，启用/禁用）

### Phase 5 — 清理依赖引用 + 文档同步

Status: planned
Targets: 全仓库（nop-chaos-flux）

- Item Types: `Fix`

- [ ] 全仓库搜索 `dictProvider` / `pageProvider` / `FluxPageProvider` / `FluxDictProvider` / `loadFluxPage` / `splitSpecialPrefix` 引用，全部更新或移除
- [ ] `docs/architecture/flux-page-dict-loading-and-precompile.md` 重写为最终设计：`loadDict`/`loadPage` 扁平函数、缓存归应用层、`@dict:` dispatch 移除、select `dict` 属性；Rejected Alternatives 更新（注明 provider 接口已被替代及原因）；按 Guide Rule 14 写最终状态，不写 "Proposed vs Current"
- [ ] 将 Plan 451 状态改为 `superseded`，注明被本计划替代
- [ ] `pnpm lint` 通过

Exit Criteria:

- [ ] 无残留的 `dictProvider` / `pageProvider` / `FluxPageProvider` / `FluxDictProvider` / `splitSpecialPrefix` 引用
- [ ] 架构文档反映最终设计
- [ ] Plan 451 标记为 `superseded`

## Closure Gates

- [ ] `RendererEnv` 用 `loadDict` / `loadPage` 扁平函数替代 provider 接口
- [ ] `special-url/` 从 flux-runtime 移除
- [ ] `request-runtime.ts` 不含 `@dict:` 分发
- [ ] select 支持 `dict` 属性，通过 `env.loadDict` 加载
- [ ] crud-demo select 使用 `dict`，e2e 全绿
- [ ] playground 提供 mock `loadDict` 实现
- [ ] 无残留旧 API 引用
- [ ] `docs/architecture/flux-page-dict-loading-and-precompile.md` 重写为最终设计
- [ ] Plan 451 标记为 `superseded`
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`（nop-chaos-flux）
- [ ] `pnpm build`（nop-chaos-flux）
- [ ] `pnpm lint`（nop-chaos-flux）
- [ ] `pnpm test`（nop-chaos-flux）

## Deferred But Adjudicated

### nop-chaos-next flux env 接入 loadDict / loadPage + 缓存迁移

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 跨仓库实现，无法在 nop-chaos-flux 仓库内验证。nop-chaos-next 通过 tarball 消费 flux，需先 rebuild tarball 再在 nop-chaos-next 仓库内实现。
- Successor Required: yes
- Successor Path: nop-chaos-next 仓库的独立 plan。迁移指南：
  1. Rebuild flux tarball（`pnpm build` in nop-chaos-flux），更新 nop-chaos-next 的 `libs/nop-chaos-flux-0.1.0.tgz`
  2. 将 flux-runtime/special-url/ 的缓存逻辑迁移到 `apps/main/src/flux/cache.ts`（LRU page cache max 50 + TTL dict cache 20s，locale-keyed，clone-on-read，in-flight 去重，error-evict）
  3. `providers.ts`：基于 cache.ts 实现 `loadFluxPage(path, signal?)`（包裹 `fetchFluxPage` + LRU 缓存）和 `loadFluxDict(name, signal?)`（`@query:DictProvider__getDict/static,options{value,label}` + TTL 缓存 → `DictBean`）
  4. `adapter.ts`：`createMainFluxEnv` 增加 `loadPage` / `loadDict`
  5. AMIS 侧不受影响

### transformPageJson / bindActions

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 角色过滤和 action 绑定是应用层实现，不影响 flux 的 dict/page 加载接口。应用通过 `env.loadPage` 在返回 schema 前自行做 transform/bind。
- Successor Required: yes
- Successor Path: 待 nop-chaos-next 需要时单独开 plan

### @page: URL dispatch

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `@page:` 分发是应用层 URL 约定，flux 只提供 `env.loadPage` 接口，应用自行决定是否使用 `@page:` 前缀。
- Successor Required: no

## Non-Blocking Follow-ups

- radio-group / checkbox-group 的 `dict` 属性支持（与 select 同模式，后续扩展）
- nop-chaos-next AMIS 侧 dict cache 补齐（当前 AMIS dict 无缓存；flux 侧缓存已移至应用层，见 Deferred 迁移指南）

## Draft Review Record

- Reviewer / Agent: independent sub-agent (fresh session, task ses_0bf5fadf1ffeZcgt5XH960ajcC)
- Verdict: `pass-with-minors` (Round 2: 0 Blocker, 0 Major, 2 Minor — both fixed)
- Rounds: 2
- Findings addressed:
  - B1 (missing 451 supersede) → Added Supersedes header + Design Reversal Rationale section + Phase 5 item to mark 451 as superseded
  - B2 (missing arch doc sync) → Added to Phase 5 + Closure Gates
  - M1 (Phase 6 cross-repo) → Moved to Deferred But Adjudicated with migration guide
  - M2 (schema-prop-coverage in Phase 3) → Moved coverage test item into Phase 3
  - M3 (dict + sourced-options conflict) → Added to Failure Paths + Phase 3 behavior
  - M4 (specify useRendererRuntime hook) → Phase 3 now explicitly specifies `useRendererRuntime()`
  - m1-m6 (minors) → Fixed line numbers, Phase 2 index.ts step, Phase 1↔2 coupling note, @dict: removal note, Draft Review Record added, loadDict naming collision noted
  - Round 2 minors: crud-demo.json line range corrected (206-221 → 246-265), follow-up "flux 侧有了" wording fixed
