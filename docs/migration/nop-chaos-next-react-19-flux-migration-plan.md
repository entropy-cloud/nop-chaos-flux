# Nop Chaos Next React 19 + Flux 迁移计划

> Plan Status: draft
> Last Reviewed: 2026-04-09
> Target Repo: `C:\can\nop\nop-chaos-next-wt\nop-chaos-next-master`
> Reference Repo: `C:\can\nop\nop-chaos-flux`
> Related Plan: `docs/migration/amis-react-19-minimal-change-plan.md`
> Scope: 只产出迁移分析与计划，不在目标仓库执行代码修改

## 目标

让 `nop-chaos-next-master` 完成两件事：

- 主仓从 React 18 升级到 React 19。
- 在主仓中接入 `nop-chaos-flux` 的最新 runtime 与 renderer 包。

同时满足兼容性要求：

- 历史 AMIS 页面继续可访问。
- 但 AMIS React 19 升级本身是独立项目，不在本计划内解决实现细节；本计划只负责为升级后的 AMIS runtime 预留接入位置。

换句话说：

- `templates/amis` 解决“AMIS 自己怎么升 React 19”。
- `nop-chaos-next-master` 解决“主应用怎么升 React 19、怎么接入 Flux、怎么同时挂接升级后的 AMIS runtime”。

## 当前基线

### 根仓状态

- 根 `package.json` 仍固定：
  - `react@^18.3.1`
  - `react-dom@^18.3.1`
  - `@types/react@^18.3.12`
  - `@types/react-dom@^18.3.1`
- 根 `pnpm.overrides` 强制全工作区锁在 React 18。
- `tsconfig.base.json` 已经使用 `jsx: react-jsx`，所以 JSX transform 不是 blocker。

### 工作区现状

`nop-chaos-next-master` 当前有这些内部包：

- `@nop-chaos/shared`
- `@nop-chaos/amis-core`
- `@nop-chaos/amis-react`
- `@nop-chaos/plugin-bridge`
- `@nop-chaos/theme-tokens`
- `@nop-chaos/tailwind-preset`
- `@nop-chaos/core`
- `@nop-chaos/ui`

而 `nop-chaos-flux` 当前核心包是：

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-renderers-basic`
- `@nop-chaos/flux-renderers-form`
- `@nop-chaos/flux-renderers-data`
- `@nop-chaos/ui`
- `@nop-chaos/tailwind-preset`

### 历史 AMIS 接入面

`nop-chaos-next-master` 当前历史 AMIS 接入集中在：

- `packages/amis-react/src/components/AmisSchemaPage.tsx`
  - 直接从 `amis` 使用 `render`、`clearStoresCache`、`setDefaultLocale`
- `packages/amis-react/src/components/AmisPageRoute.tsx`
- `packages/amis-react/src/env.ts`
- `packages/amis-core/src/page/*`
- `packages/amis-core/src/core/ajax.ts`
- `apps/main/src/amis/*`
- `apps/main/src/router/RouteRenderer.tsx`

这说明 `next` 对 AMIS 的直接耦合并不深，主要是一个 runtime 适配层。

### 路由分发现状

`packages/shared/src/types/menu.ts` 当前定义：

- `pageType: 'builtin' | 'plugin' | 'amis' | 'iframe' | 'external'`

而 `apps/main/src/router/RouteRenderer.tsx` 已经明确按 `pageType === 'amis'` 走 `AmisRouteRenderer`。

这给 Flux 接入提供了天然双栈切点。

## 关键判断

## 1. `next` 迁移和 `amis` 迁移必须分开，但顺序有关

它们是两个独立问题：

- `templates/amis` 负责把 AMIS runtime 升到 React 19。
- `nop-chaos-next-master` 负责主仓 React 19、Flux 接入、以及升级后 AMIS runtime 的消费接入。

但顺序上有依赖关系：

- `next` 可以先完成主仓 React 19 + Flux 接入骨架。
- 但最终要让 `pageType === 'amis'` 继续工作，仍然需要升级后的 AMIS runtime 产物可被 `next` 消费。

## 2. `next` 的主问题是主仓 React 19 与基础包替换，不是 AMIS 细节

`flux` 当前关键包都是 React 19 基线：

- `@nop-chaos/flux-react`
- `@nop-chaos/ui`
- `@nop-chaos/flux-renderers-*`

所以 `next` 迁移的首要任务是：

- 主仓切 React 19
- 基础 UI 包切到 Flux 版本
- 再把 Flux runtime/renderers 引进来

历史 AMIS runtime 兼容是第二层问题，不应阻塞主仓底座升级方案设计。

## 3. 同名包替换不是 blocker，且应该直接替换

你已明确可接受的路线是：

- 直接拷贝 `flux` 源码
- 删除 `next` 中同名旧包
- 统一改为引用 `flux` 版本

当前已核对：`nop-chaos-next-master` 现有对 `@nop-chaos/ui` 的实际导入导出面，在 `flux` 的 `@nop-chaos/ui` 中都存在。

这意味着：

- `packages/ui`
- `packages/tailwind-preset`

应直接替换成 `flux` 版本，而不是长期双轨维护。

## 4. `flux` 进入 `next` 时，不能只拷 package 目录

`flux` 的 `tsconfig.base.json` 里还依赖根级 `types/`：

- `types/style-imports.d.ts`
- `types/use-sync-external-store-shim.d.ts`
- `types/hufe921__canvas-editor.d.ts`

因此把 `flux` 接入 `next` 时，至少要一起处理：

- `packages/flux-*`
- `packages/ui`
- `packages/tailwind-preset`
- `types/`
- `tsconfig.base.json` paths

## 5. `next` 应采用双栈路由，而不是立即替换 AMIS 页面

最小改动路线不是把现有 AMIS 页面立刻重写成 Flux，而是新增一条 Flux 页面类型。

建议：

- 在 `pageType` 中新增 `'flux'`
- 保留现有 `'amis'`

这样：

- 新页面走 Flux renderer 栈
- 旧页面继续走升级后的 AMIS runtime
- 后续可按页面逐步迁移，而不是一次性替换

## 最小化迁移原则

- 不把所有历史 AMIS 页面立即迁移到 Flux schema。
- 不在本轮对 `next` 引入 editor 相关 Flux 包。
- 不保留两套 `@nop-chaos/ui` / `@nop-chaos/tailwind-preset` 长期并存。
- 优先替换基础包和 React 基线，再接 Flux 业务包。
- 优先复用现有 `pageType === 'amis'` 路由切点，新增 `pageType === 'flux'`。

## 推荐迁移架构

### A. 主仓 React 19 基线

把 `nop-chaos-next-master` 全工作区统一到 React 19：

- `react`
- `react-dom`
- `@types/react`
- `@types/react-dom`

同步升级这些工作区包：

- `apps/main`
- `packages/core`
- `packages/plugin-bridge`
- `packages/amis-react`
- `packages/ui`（随后由 Flux 版本替换）
- `examples/plugin-demo`
- `examples/extension-demo`

同时对齐基础依赖版本：

- `lucide-react`
- 相关插件/host shared modules 中暴露的 React 运行时

### B. 基础同名包直接替换

从 `flux` 直接替换：

- `packages/ui`
- `packages/tailwind-preset`

原因：

- `flux` 包直接依赖它们
- `next` 现有 UI 使用面已确认可被 `flux` 的 `ui` 包覆盖
- 继续维护两套同名基础包没有意义

### C. 引入 Flux runtime/renderers

首轮引入这些 package：

- `flux-core`
- `flux-formula`
- `flux-runtime`
- `flux-react`
- `flux-renderers-basic`
- `flux-renderers-form`
- `flux-renderers-data`

首轮不要求一起引入：

- `nop-debugger`
- `flow-designer-*`
- `report-designer-*`
- `spreadsheet-*`
- `word-editor-*`
- `flux-code-editor`

除非 `next` 当前页面马上需要这些能力。

### D. 历史 AMIS 作为升级后 runtime 依赖接入

本计划不定义 `amis` 内部怎么升 React 19，只定义 `next` 如何消费它：

- `packages/amis-react` 继续承担 React 页面壳层
- `packages/amis-core` 继续承担 host adapter、schema transform、action binding
- `packages/amis-react` 中对 `amis` 的依赖切到升级后的 React 19 版本产物

也就是说：

- `next` 里保留 `@nop-chaos/amis-core` / `@nop-chaos/amis-react`
- 但它们依赖的底层 `amis` runtime 应来自升级后的 `templates/amis` 结果

### E. 路由双栈

建议把：

- `packages/shared/src/types/menu.ts`
- `packages/shared/src/utils/menuConfig.ts`

从当前的：

- `'builtin' | 'plugin' | 'amis' | 'iframe' | 'external'`

扩展成：

- `'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external'`

然后在 `apps/main/src/router/RouteRenderer.tsx` 中形成：

- `pageType === 'amis'` -> `AmisRouteRenderer`
- `pageType === 'flux'` -> `FluxRouteRenderer`

## 分阶段计划

### Phase 0: 划清和 AMIS 独立迁移的边界

- 明确本计划不处理 `templates/amis` 内部实现细节。
- 明确 `amis` 的 React 19 升级结果会被 `next` 作为外部前提消费。
- 明确 `next` 主线先搭好 React 19 + Flux + 双栈路由骨架。

### Phase 1: 主仓 React 19 基线切换

- 更新根 `package.json`：
  - `react`
  - `react-dom`
  - `@types/react`
  - `@types/react-dom`
- 更新 `pnpm.overrides`，删除 React 18 锁定，改成 React 19。
- 同步修改以下 package 的 React 版本声明：
  - `apps/main/package.json`
  - `packages/core/package.json`
  - `packages/plugin-bridge/package.json`
  - `packages/amis-react/package.json`
  - `packages/ui/package.json`
  - `examples/plugin-demo/package.json`
  - `examples/extension-demo/package.json`
- 升级 `lucide-react` 到与 `flux` 对齐的主版本。
- 运行：
  - `pnpm install`
  - `pnpm typecheck`

### Phase 2: 替换基础同名包并引入 Flux 核心包

- 从 `nop-chaos-flux` 拷贝：
  - `packages/flux-core`
  - `packages/flux-formula`
  - `packages/flux-runtime`
  - `packages/flux-react`
  - `packages/flux-renderers-basic`
  - `packages/flux-renderers-form`
  - `packages/flux-renderers-data`
  - `packages/ui`
  - `packages/tailwind-preset`
  - `types/`
- 删除 `next` 中旧的：
  - `packages/ui`
  - `packages/tailwind-preset`
- 更新 `tsconfig.base.json` 路径映射。
- 检查 `examples/extension-demo` 中 `@nop-chaos/ui/base.css` 的导入是否仍正确指向新包导出。

### Phase 2 Gate: 主仓底座接入判定

通过标准：

- React 19 下可以完成安装。
- `@nop-chaos/ui` 已成功替换为 Flux 版本。
- `apps/main` 与两个 example 至少能通过 typecheck。

若失败，优先修底座，不进入路由与 AMIS 兼容层阶段。

### Phase 3: 调整插件共享模块与 host runtime

- 更新 `apps/main/src/plugins/sharedModules.ts`，确保暴露的：
  - `react`
  - `react-dom`
  - `react/jsx-runtime`
  - `react/jsx-dev-runtime`
  - `@nop-chaos/ui`
  与主仓 React 19 / 新 UI 版本一致。
- 评估是否需要额外暴露 `react-dom/client` 给插件侧；若插件构建或运行确实依赖，应显式加入 shared modules 或 external 约束策略。
- 对齐 `examples/plugin-demo` 的 external 设定与 React 19 host 模块约定。

### Phase 4: 建立 Flux 页面接入链

- 参考 `flux` playground，构建 `next` 内部最小 Flux registry：
  - `createDefaultRegistry`
  - `registerBasicRenderers`
  - `registerFormRenderers`
  - `registerDataRenderers`
- 新建例如：
  - `apps/main/src/flux/registry.ts`
  - `apps/main/src/flux/FluxRouteRenderer.tsx`
  - 如有需要，再拆 `apps/main/src/flux/env.ts`
- 先让一个最小 demo 页面走 Flux：
  - 路由可进入
  - schema 可渲染
  - host env 可注入

### Phase 5: 菜单与路由双栈

- 修改：
  - `packages/shared/src/types/menu.ts`
  - `packages/shared/src/utils/menuConfig.ts`
- 新增 `pageType: 'flux'`。
- 修改 `apps/main/src/router/RouteRenderer.tsx`：
  - 保留 `pageType === 'amis'`
  - 新增 `pageType === 'flux'`
- 首轮不要求把现有后端菜单立即改完，只要前端具备双栈支持即可。

### Phase 6: 接入升级后的 AMIS runtime

- 在 `templates/amis` 独立迁移完成后，更新 `next` 对 `amis` runtime 的消费版本。
- 核对 `packages/amis-react/src/components/AmisSchemaPage.tsx` 依赖的三个导出仍成立：
  - `render`
  - `clearStoresCache`
  - `setDefaultLocale`
- 核对 `apps/main/src/amis/init.ts` 的样式入口在升级后的 AMIS 包中仍可用。
- 保持 `@nop-chaos/amis-core` / `@nop-chaos/amis-react` 接口尽量不变，以减少 host 侧改动。

### Phase 7: Vite chunk 与 workspace 识别修正

`apps/main/vite.config.ts` 目前默认：

- `/packages/<dir>/` -> `@nop-chaos/<dir>`

当新引入更多 `flux` 包、以及未来可能存在独立 AMIS runtime 消费路径时，需要重新检查：

- `getWorkspacePackageName`
- `getWorkspaceChunkName`
- `manualChunks`

目标是：

- `flux-*` 包能被正确分块
- `amis` bridge 与 host runtime 分块仍清晰
- 不因为路径推断而错误归类 chunk

### Phase 8: 回归与收口

执行：

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`

人工 smoke 至少覆盖：

- 主应用基础路由启动
- 一个 Flux 页面可渲染
- 一个历史 AMIS 页面可渲染
- 插件页面仍可挂载
- extension demo 仍可独立启动
- `@nop-chaos/ui/base.css` 与主应用样式正常

## 建议的实际改动顺序

1. 主仓切 React 19。
2. 替换 `packages/ui` 与 `packages/tailwind-preset`。
3. 拷贝 `flux-core` / `formula` / `runtime` / `react` / `renderers-*` / `types`。
4. 修 `tsconfig.base.json` 路径映射。
5. 调整 plugin shared modules。
6. 建立 `FluxRouteRenderer`。
7. 扩展 `pageType: 'flux'`。
8. 接入升级后的 AMIS runtime。
9. 修 Vite chunk 逻辑。
10. 完整回归。

## 必改文件清单

### 根与工作区配置

- `package.json`
- `tsconfig.base.json`
- `pnpm-workspace.yaml`（若需要显式调整包范围）

### package 依赖声明

- `apps/main/package.json`
- `packages/core/package.json`
- `packages/plugin-bridge/package.json`
- `packages/amis-react/package.json`
- `examples/plugin-demo/package.json`
- `examples/extension-demo/package.json`

### 直接从 Flux 带入

- `packages/flux-core`
- `packages/flux-formula`
- `packages/flux-runtime`
- `packages/flux-react`
- `packages/flux-renderers-basic`
- `packages/flux-renderers-form`
- `packages/flux-renderers-data`
- `packages/ui`
- `packages/tailwind-preset`
- `types/`

### 主应用接入层

- `apps/main/src/router/RouteRenderer.tsx`
- `packages/shared/src/types/menu.ts`
- `packages/shared/src/utils/menuConfig.ts`
- `apps/main/src/plugins/sharedModules.ts`
- `apps/main/vite.config.ts`
- `apps/main/src/flux/*` 新增

## 非目标

- 不在本计划内实现 `templates/amis` 的 React 19 迁移细节。
- 不要求首轮把所有 AMIS 页面替换成 Flux。
- 不要求首轮引入 `flow-designer-*`、`report-designer-*`、`spreadsheet-*`、`word-editor-*`、`flux-code-editor`。
- 不要求首轮改造后端菜单协议，只要求前端具备双栈能力。

## 风险清单

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| React 19 切换后，主仓和 example 的 React 版本不一致 | 安装、typecheck、运行异常 | 统一根和各 package React 声明与 overrides |
| `@nop-chaos/ui` 替换后样式或导出面细节回归 | 主应用/extension/plugin 页面异常 | 先做 Phase 2 Gate，再进入业务层接入 |
| 漏拷 `flux/types/` | typecheck 失败 | 把 `types/` 作为必拷资产写入计划 |
| plugin shared modules 仍按 React 18 假设运行 | plugin demo 或 host 挂载异常 | 单列 Phase 3 调整 shared modules |
| `pageType` 不扩展导致 Flux 页面只能走 builtin hack | 后续迁移路径混乱 | 正式新增 `pageType: 'flux'` |
| 升级后的 AMIS runtime 接口变化 | `AmisSchemaPage` 无法直接消费 | 把 `render` / `clearStoresCache` / `setDefaultLocale` 作为接入契约检查项 |
| `apps/main/vite.config.ts` 的 workspace package 推断过于简单 | chunk 分类错误 | 单列 Phase 7 修 manualChunks 逻辑 |

## Go / No-Go 标准

### Go

- `nop-chaos-next-master` 已完成 React 19 基线切换。
- `flux` 核心包已进入工作区并通过 typecheck/build。
- `@nop-chaos/ui` 已成功替换为 Flux 版本。
- 前端已具备 `amis` / `flux` 双栈路由能力。
- 升级后的 AMIS runtime 可被 `next` 消费并保持历史页面可访问。

### No-Go

- 主仓 React 19 基线切换后，主应用基础页面都无法稳定启动。
- `@nop-chaos/ui` 替换导致大量现有页面 API 不兼容。
- 升级后的 AMIS runtime 无法维持 `next` 当前 `amis-react` 接口契约。

## 结论

`nop-chaos-next-master` 的迁移应被定义为一个独立项目，但它依赖于另一个独立前提：

- `templates/amis` 先完成自己的 React 19 runtime 迁移。

在此前提下，`next` 的主线非常清晰：

- 主仓 React 19
- 基础 UI 包替换为 Flux 版本
- 引入 Flux runtime/renderers
- 路由层双栈并存
- 最后挂接升级后的 AMIS runtime

这条路线可以让 `next` 在不一次性抛弃历史 AMIS 页面前提下，逐步转向 Flux。
