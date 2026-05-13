# 253 Flux Host-Facing Facade Package And Release Integration Plan

> Plan Status: completed
> Last Reviewed: 2026-05-12
> Source: `C:/can/nop/nop-chaos-next/docs/design/amis-flux-rendering-engine-integration.md`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `.gitignore`, `scripts/sync-flux-lib.sh`, `scripts/check-package-css-exports.mjs`, `scripts/check-workspace-manifest-deps.mjs`, `packages/flux-react/package.json`, `packages/flux-runtime/package.json`, `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-renderers-form/src/index.tsx`, `packages/flux-renderers-data/src/index.tsx`, `docs/architecture/frontend-baseline.md`, `docs/architecture/flux-runtime-module-boundaries.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

为 `nop-chaos-flux` 增加一个面向宿主消费的稳定 facade 发布形态 `@nop-chaos/flux`，让 `nop-chaos-next` 按设计文档通过 tarball/registry 消费 Flux 页面渲染能力，而不是继续把 `flux-core`、`flux-react`、`flux-renderers-*` 等内部 workspace 包同步进消费侧工作区。

完成态要求：仓库内存在可构建、可打包、可类型检查、可导出 CSS 的宿主入口包；打包后的 manifest 不再泄漏对 Flux 内部 `workspace:*` 包的宿主依赖要求；核心包只暴露稳定渲染入口与必要公共类型；现有同步脚本和文档被收敛到新发布边界；并且计划关闭前要有独立子 agent 复核该方案已与 live repo 基线一致。

## Current Baseline

- 当前 workspace 只有按内部职责拆分的 `@nop-chaos/flux-core`、`@nop-chaos/flux-runtime`、`@nop-chaos/flux-react`、`@nop-chaos/flux-renderers-*` 等包，还没有 `packages/flux-bundle` 或任何宿主 facade 包。
- 当前各内部包 manifest 大量使用 `workspace:*` 依赖，例如 `packages/flux-react/package.json`、`packages/flux-runtime/package.json`、`packages/flux-renderers-form/package.json`、`packages/flux-renderers-data/package.json`；这些 manifest 不能直接作为 `nop-chaos-next` 的发布形态依赖。
- 当前根工作区只包含 `apps/*` 与 `packages/*`；`frontend-baseline.md` 记录的 repo baseline 也仍是内部多包开发仓库，没有“host-facing release package”这一层；`tsconfig.json` references、`tsconfig.base.json` paths、`vite.workspace-alias.ts` aliases 也都还没有 `@nop-chaos/flux` 或其 CSS 子路径。
- 当前 `scripts/sync-flux-lib.sh` 仍会把 `flux-core`、`flux-react`、`flux-renderers-*`、designer 包及 `ui` 直接复制到消费项目 `flux-lib/`，并建议消费侧把这些目录纳入 workspace；这与目标设计中“主项目只消费独立发布产物”的边界相冲突。
- 当前 `vite.workspace-alias.ts` 与 `tsconfig.base.json` 主要服务于仓库内部源码开发，对外发布所需的 facade `exports`、packed manifest 清理、tarball 内容验证、host-owned peer 依赖策略、以及 facade 类型声明收敛尚未建立。
- 当前 renderer 注册 API 已具备组合宿主 facade 的基础能力：`flux-react` 暴露 `createSchemaRenderer`，`flux-renderers-basic/form/data` 暴露 `register*Renderers` 与定义集合；但这些仍是内部包级 API，而不是宿主稳定入口。
- 当前第一阶段核心渲染链路涉及的第三方依赖归属还未被面向宿主发布场景明确裁定；除 `react`、`react-dom`、`zustand`、`lucide-react`、`@nop-chaos/ui` 外，`flux-react` 与 `flux-renderers-data` 还引入了 `use-sync-external-store`、`@tanstack/react-virtual`、`recharts` 等依赖，现状并没有宿主 facade 级别的 external/bundled/public-manifest 策略。
- 当前还没有针对 facade 包的 registry-ready manifest 策略、`private: true` 处理策略、`build.rolldownOptions`/sourcemap 决策、或“核心包是否允许动态 import/chunk 拆分”的发布约束。
- 当前也没有把“Flux CSS 必须在宿主中保持隔离、避免污染 AMIS/Shell/普通页面”收敛为 facade 包的明确验证项。
- 仓库已经有不可降级的 manifest/CSS 类硬门禁：根 `package.json` 暴露 `check:package-css-exports` 与 `check:workspace-manifest-deps`，前者校验 `packages/*/package.json` 的 CSS export 是否指向 `./dist/*`，后者校验包源码中的 workspace import 是否已在本地 manifest 声明；但当前计划目标所需的 facade pack 形态、tarball 内容、以及 packed manifest 约束还没有对应验证。

## Goals

- 新增一个宿主可消费的核心 facade 包 `@nop-chaos/flux`，收口 Flux 页面渲染所需的稳定公共入口。
- 让宿主发布形态不再要求消费方理解 Flux 内部多包结构，也不再依赖内部 `workspace:*` manifests。
- 明确 `react`、`react-dom`、`zustand`、`lucide-react`、`@nop-chaos/ui` 等 host-owned 依赖在 facade 构建与 manifest 中的 external/peer 策略。
- 明确第一阶段核心 facade 触达的全部第三方依赖的归属策略，包括哪些依赖 external 给宿主、哪些被内联、哪些需要出现在 facade manifest 中。
- 提供可验证的 CSS、类型声明、pack 产物和 tarball 内容，确保宿主能安装并消费 `@nop-chaos/flux`。
- 收敛 `@nop-chaos/flux` 的发布策略，包括 `build.rolldownOptions`、sourcemap、chunk/dynamic-import 策略、以及 tarball/registry-ready manifest 形态。
- 确保 facade 输出的 CSS 在宿主中保持边界清晰，不污染 AMIS、Shell、或普通页面。
- 收敛过时的 `sync-flux-lib.sh` 交付路径和相关文档，使 owner docs 反映新的发布边界。

## Non-Goals

- 不在本计划内实现 `nop-chaos-next` 侧的路由、adapter、provider、或页面加载代码；这些属于消费项目工作。
- 不在本计划内拥有 `nop-chaos-next` 的产品代码变更；但会要求基于实际 `.tgz` 做一次宿主消费验证，作为 `nop-chaos-flux` 发布形态的 closure proof。
- 不在本计划内交付 `@nop-chaos/flux-designers`、远程模块、或设计器重量级能力打包；当前范围只覆盖核心页面渲染包。
- 不把当前 Flux 内部多包仓库改造成单包仓库，也不取消现有内部模块边界。
- 不在本计划内统一或替换 `@nop-chaos/ui` 的来源；host UI 继续由宿主拥有。
- 不为了 facade 包引入大规模公共 API 扩张；只暴露宿主必须依赖的稳定入口、稳定类型、和 CSS 子路径。

## Scope

### In Scope

- `packages/flux-bundle/` 新包及其 `package.json`、`src/`、`vite.config.ts`、类型声明与样式入口
- 根级工作区接线：`package.json` scripts、`tsconfig.json` project references、如有必要的 build tooling 依赖与 alias/path 同步
- facade 公共导出收敛所需的 `packages/flux-react`、`packages/flux-renderers-basic`、`packages/flux-renderers-form`、`packages/flux-renderers-data` 最小辅助调整
- `scripts/sync-flux-lib.sh` 与可能新增的 pack/manifest 校验脚本
- 与宿主发布边界直接相关的测试、pack 验证和文档更新
- `docs/architecture/frontend-baseline.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- 如 facade CSS 隔离规则或宿主样式边界发生 owner-doc drift，则更新 `docs/architecture/theme-compatibility.md`
- 如新增发布边界 owner doc，则同步更新 `docs/index.md` 与必要的 docs routing
- `docs/logs/2026/05-12.md`

### Out Of Scope

- `nop-chaos-next` 仓库内的任何代码或计划变更
- `@nop-chaos/flux-designers` 或 designer-family 可选包实现
- 重做当前 Flux 内部 renderer/runtime/compiler 架构
- 与 facade 发布无关的现有深度审计缺陷修复
- 把所有内部包都变成可单独发布包；本计划的宿主稳定入口仅要求 `@nop-chaos/flux`

## Execution Plan

### Phase 1 - Audit The Live Release Gaps And Freeze The Facade Contract

Status: completed
Targets: `C:/can/nop/nop-chaos-next/docs/design/amis-flux-rendering-engine-integration.md`, `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `packages/*/package.json`, `scripts/sync-flux-lib.sh`, `docs/architecture/frontend-baseline.md`, `docs/architecture/flux-runtime-module-boundaries.md`

- Item Types: `Decision | Proof`

- [x] [Proof] Re-audited the live repo against `C:/can/nop/nop-chaos-next/docs/design/amis-flux-rendering-engine-integration.md` and recorded the gap between the old sync-based internal-package delivery model and the target host-facing tarball delivery model.
- [x] [Decision] Froze the first public facade surface for `@nop-chaos/flux` around `createFluxRendererRegistry()`, `registerDefaultFluxRenderers()`, `createDefaultFluxEnv()`, `createFluxSchemaRendererWithRegistry()`, `createFluxSchemaRenderer()`, the published public type template, and `./style.css`.
- [x] [Decision] Fixed the host-owned dependency policy to keep `react`, `react-dom`, `zustand`, `lucide-react`, and `@nop-chaos/ui` as facade peers rather than leaking internal Flux package dependencies to the host.
- [x] [Decision] Adjudicated the first-facade third-party dependency policy: singleton host-owned dependencies stay external, while renderer-internal runtime dependencies needed by the bundled facade stay behind the packed artifact instead of becoming consumer-facing Flux package requirements.
- [x] [Decision] Froze the core build policy in `packages/flux-bundle/vite.config.ts` to use explicit `build.rolldownOptions`, `sourcemap: true`, and `cssCodeSplit: false` with `output.codeSplitting: false` for the core facade entry.
- [x] [Decision] Chose a release-manifest strategy where the workspace package remains `private: true` in-repo while `scripts/pack-flux-bundle.mjs` rewrites a registry/tarball-safe manifest during packing.
- [x] [Decision] Fixed the host CSS isolation contract around `.nop-flux-root` and added tests/assertions that the facade stylesheet is scoped to that root rather than global page selectors.
- [x] [Decision] Narrowed `scripts/sync-flux-lib.sh` to the only still-supported sync target (`flux-lib/ui`) and moved Flux core consumption to the packed `@nop-chaos/flux` tarball path.
- [x] [Proof] Identified and updated the owner docs and repo checks that changed with the supported baseline, including `docs/architecture/frontend-baseline.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/theme-compatibility.md`, `pnpm check:package-css-exports`, and `pnpm check:workspace-manifest-deps`.

Exit Criteria:

- [x] The plan records a repo-observable baseline gap between current sync-based delivery and target facade release delivery.
- [x] The initial public contract of `@nop-chaos/flux` is explicit enough to implement without exposing internal package structure.
- [x] Host dependency ownership and bundling policy is explicitly adjudicated.
- [x] Third-party dependency policy, build policy, registry-manifest policy, and CSS isolation policy are explicitly adjudicated for the first facade package.
- [x] Required doc owners and verification surfaces are enumerated, including concrete ownership for package-baseline docs and package-entry-boundary docs.
- [x] `docs/architecture/frontend-baseline.md`, `docs/architecture/flux-runtime-module-boundaries.md`, and `docs/architecture/theme-compatibility.md` were updated to the live baseline.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 2 - Implement The `@nop-chaos/flux` Facade Package And Build Pipeline

Status: completed
Targets: `packages/flux-bundle/**`, `package.json`, `tsconfig.json`, `tsconfig.base.json`, `vite.workspace-alias.ts`, build tooling config, any minimal supporting source files

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Created `packages/flux-bundle/` with the package-local scaffolding, package scripts, public entry, CSS entry, type templates, `vite.config.ts`, `vitest.config.ts`, and tests required for the host-facing facade.
- [x] [Fix] Implemented the facade public API so hosts can create/register the default Flux renderer stack without importing Flux internal packages directly.
- [x] [Fix] Wired the facade entry and package exports so consumers can load packaged CSS through `@nop-chaos/flux/style.css`.
- [x] [Fix] Implemented the chosen Vite 8 build policy with explicit `build.rolldownOptions`, `sourcemap`, and single-entry chunk behavior.
- [x] [Fix] Added declaration-generation/public-type emission for the facade through the repo-owned public type template copied into `dist/index.d.ts`.
- [x] [Fix] Integrated the new package into workspace references and root build flow without breaking the multi-package development baseline.
- [x] [Fix] Added `@nop-chaos/flux` and `@nop-chaos/flux/style.css` to `tsconfig.base.json` paths and `vite.workspace-alias.ts` aliases.
- [x] [Fix] Added the root/package-local wiring needed for facade type emission and pack preparation (`scripts/prepare-flux-bundle-dist.mjs`).
- [x] [Decision] Kept the facade API minimal and used local facade wrapping instead of widening root public package surfaces unnecessarily.
- [x] [Proof] Added focused tests/assertions in `packages/flux-bundle/src/index.test.tsx` for facade exports, peer policy, CSS scope assumptions, and renderer registration behavior.

Exit Criteria:

- [x] `packages/flux-bundle/` builds successfully as a workspace package.
- [x] The facade exposes a stable host entry for default renderer registration and schema renderer creation.
- [x] Packaged CSS and public types are emitted and reachable through package exports.
- [x] The implemented build configuration matches the adjudicated `rolldownOptions`/sourcemap/chunk policy.
- [x] Public declarations do not require consumers to install or import hidden Flux internal packages.
- [x] Workspace alias/path wiring is updated so `@nop-chaos/flux` works in local source-based development as well as packaged consumption.
- [x] Owner docs affected by the new supported package baseline were updated in this phase.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 3 - Harden Release Manifests, Pack Validation, And Legacy Sync Boundaries

Status: completed
Targets: `packages/flux-bundle/package.json`, release scripts/checks, `.gitignore`, `scripts/sync-flux-lib.sh`, possibly new validation scripts, relevant docs

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Added pack-oriented validation so the workspace verifies the real `@nop-chaos/flux` tarball, not only local `dist/` output.
- [x] [Fix] Ensured the packed manifest contains no internal Flux `workspace:*` dependencies and correctly reflects external host-owned singleton dependencies.
- [x] [Fix] Ensured the packed manifest reflects the adjudicated third-party publication policy for the first facade package and does not leak internal Flux package requirements.
- [x] [Fix] Added release-shape checks and scripts (`pack:flux-bundle`, `check:flux-bundle-pack`) while preserving compatibility with the existing hard checks.
- [x] [Fix] Narrowed `scripts/sync-flux-lib.sh` so it no longer promotes syncing Flux internal packages into the consumer workspace as the supported integration model.
- [x] [Decision] Explicitly kept legacy multi-package sync out of the supported Flux core integration path; only `flux-lib/ui` remains as a temporary host-owned sync target.
- [x] [Decision] Explicitly kept the near-term supported baseline tarball-first while leaving registry publication as a future-ready path once publish flow is needed.
- [x] [Fix] Introduced the stable repo-owned tarball output convention `dist-packages/` and updated `.gitignore` accordingly.
- [x] [Proof] Captured the real commands that produce the `.tgz` used for host validation through `scripts/pack-flux-bundle.mjs`, `pnpm pack:flux-bundle`, and `pnpm check:flux-bundle-pack`.

Exit Criteria:

- [x] A real tarball generation workflow exists for `@nop-chaos/flux`.
- [x] Packed manifest and tarball contents satisfy the agreed host-consumption constraints.
- [x] Registry-readiness is explicitly adjudicated rather than left ambiguous.
- [x] Repo checks cover the critical release-shape regressions introduced by the new facade package, including explicit adjudication of `check:package-css-exports` and `check:workspace-manifest-deps`.
- [x] Legacy sync workflow is explicitly constrained so it no longer conflicts with the supported release boundary.
- [x] Affected owner docs are updated to the final supported release model.
- [x] `docs/logs/2026/05-12.md` updated.

### Phase 4 - Verify Workspace Baseline And Record Host-Consumption Proof

Status: completed
Targets: `packages/flux-bundle/**`, updated docs/logs, verification outputs, `C:/can/nop/nop-chaos-next`

- Item Types: `Proof | Follow-up`

- [x] [Proof] Ran required workspace verification: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.
- [x] [Proof] Ran required hard checks beyond `pnpm lint`: `pnpm check:package-css-exports`, `pnpm check:workspace-manifest-deps`, and `pnpm check:flux-bundle-pack`.
- [x] [Proof] Ran focused facade verification, including `pnpm --filter @nop-chaos/flux typecheck`, `build`, `test`, and `lint`, plus the real pack flow.
- [x] [Proof] Inspected the produced tarball/packed manifest and verified that the public CSS, public types, and public JS entry points are present and internally consistent.
- [x] [Proof] Verified the chosen chunk/dynamic-import policy against the built artifact through `scripts/check-flux-bundle-pack.mjs`, which enforces the single-entry tarball shape.
- [x] [Proof] Performed a real consumer-side validation in `C:/can/nop/nop-chaos-next` using the generated `.tgz` through disposable host projects under `temp/flux-bundle-verify*`; after syncing the supported `flux-lib/ui` package and removing its residual `@nop-chaos/flux-i18n` workspace dependency, `pnpm install`, `pnpm typecheck`, `pnpm build`, and `pnpm lint` all succeeded there.
- [x] [Proof] Re-audited this plan text against the live repo after implementation and synchronized statuses, exit criteria, and closure gates honestly.
- [x] [Proof] Ran an independent closure audit with a fresh subagent session after implementation landed.
- [x] [Follow-up] No non-blocking residuals remain inside this plan's scope.

Exit Criteria:

- [x] Required workspace verification is recorded with passing results.
- [x] Required hard checks beyond `pnpm lint` are recorded with passing results.
- [x] Focused facade build/pack verification is recorded with a real packed artifact.
- [x] Tarball contents and manifest shape are explicitly audited.
- [x] Chunk/dynamic-import behavior is explicitly verified against the chosen release policy.
- [x] Real consumer-side validation against `nop-chaos-next` is recorded.
- [x] Plan text and repo state are in sync.
- [x] Closure-phase doc-sync adjudication is explicit; no additional owner-doc drift remains after the final sync.
- [x] `docs/logs/2026/05-12.md` updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见 `docs/plans/00-plan-authoring-and-execution-guide.md`。

- [x] `@nop-chaos/flux` exists as the supported host-facing core package.
- [x] The host-facing package no longer requires the consumer to depend on Flux internal workspace packages directly.
- [x] Public JS, CSS, and type exports are present and consumer-usable.
- [x] Packed manifest contains no in-scope internal `workspace:*` dependency leakage.
- [x] Third-party dependency publication policy is fully reflected in the built artifact and packed manifest.
- [x] Legacy sync-based integration no longer conflicts with the supported release boundary.
- [x] Necessary focused verification for build, pack shape, and public contract is complete.
- [x] Real `nop-chaos-next` consumption proof exists for the generated `.tgz`, and the host-side blockers found during proof were fixed before closure.
- [x] No in-scope release defect or contract drift is silently deferred.
- [x] Affected owner docs are synced to the live baseline.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm check:package-css-exports`
- [x] `pnpm check:workspace-manifest-deps`
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Optional Heavyweight Host Entrypoints

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: the design doc explicitly recommends a staged rollout where the first phase ships only the core page-rendering package and excludes designers/debugger-heavy bundles.
- Successor Required: `yes`
- Successor Path: `future plan for @nop-chaos/flux-designers or separate optional host packages`

## Non-Blocking Follow-ups

- Add a successor plan for `@nop-chaos/flux-designers` only after the core facade package, tarball verification path, and host boundary are stable.
- Consider a small pack-inspection helper if manual tarball inspection remains noisy after the first implementation, but only if current release-shape checks already cover closure-critical regressions.

## Closure

Status Note: completed

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1e3525fcaffema29AlKKyABaMY`
- Evidence: independent closure audit returned `PASS` after re-checking the packed tarball shape, the narrowed `ui` sync boundary, workspace verification, and real host-consumption proof in `C:/can/nop/nop-chaos-next/temp/flux-bundle-verify-file`.

Follow-up:

- none
