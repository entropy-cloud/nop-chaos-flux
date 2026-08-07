# 2 flux-bundle 包边界与发布元数据完整性（18-01 跨包相对导入 + 双实现 + 18-02 description）

> Plan Status: completed（draft → active：独立子 agent 两轮审查，首轮 revised（2 Major：tiptap 为 alias 真实消费者需 built-dist harness、方案 A 死 shim TS2307 风险；5 Minor）已修订解决，复检 pass-with-minors（4 条 Minor 全部处理：harness peer-externals 机制注明、Phase 3 exit 收窄去重、conditional owner-doc 措辞、基线绿措辞修正），零 Blocker/零 Major，共识达成）｜**执行态：completed（2026-08-07 收口：Phase 1 终裁方案 A(a) 证伪 → 方案 B 人工门由 mission-driver 完整执行指令行使；Phase 2/3/5 全部落地，Closure Gates 全绿，closure-audit 由独立 fresh session 收口，证据见 Closure 节）**
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P2] 18-01 :433-447 / [P2] 18-02 :449-457、门禁建议 :820）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 18-01 / 18-02 行，`[ ]`）
> Related: `docs/audits/arm-MA1-runtime-structure.md`（runtime-cluster 边界结论）、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/references/quick-reference.md:36`（`@nop-chaos/flux` 命名已正确）
> Mission: component-audit
> Work Item: 18-01 + 18-02（flux-bundle 跨包 src 相对导入与 useSyncExternalStoreWithSelector 双实现、发布元数据失真）

## Purpose

消除 flux-bundle（发布名 `@nop-chaos/flux`）的包边界与发布面缺陷：(a) 18-01——`flux-bundle/src/use-sync-external-store-shim.ts:5` 是全仓唯一跨包 src 树相对导入（`../../flux-react/src/use-sync-external-store-with-selector`），配合 vite alias 直取 flux-react 私有 fork，`check-workspace-manifest-deps` 对此完全不可见（manifest 层盲区），且 useSyncExternalStoreWithSelector 存在 fork/双实现静默漂移风险；(b) 18-02——`flux-bundle/package.json` description 只列 3 族（basic/form/data），实际注册 6 族（basic/form/form-advanced/data/content/layout），mobile/scheduling/ai/graph 按需注册未注明，发布面元数据误导 host。收口后 roadmap Follow-up Backlog 两行翻转 `[x]`。

## Current Baseline

- **18-01（live 核对，2026-08-07）**：
  - `packages/flux-bundle/src/use-sync-external-store-shim.ts:5`：`export { useSyncExternalStoreWithSelector } from '../../flux-react/src/use-sync-external-store-with-selector';`——跨包 src 相对导入，全仓唯一（`rg "from '\.\./\.\./"` 其余命中均为同包内上两级或 config 文件导入 `../../vitest.shared`/`../../vite.workspace-alias`（config 不在 src-only 扫描范围），无跨包 src 树导入）。
  - `packages/flux-bundle/vite.config.ts:10-11,28`：alias 把所有 `use-sync-external-store/*` 路径重定向到本包 ESM stub；注释声称 npm shim 是 CJS、浏览器 ESM 下抛 "does not provide an export" 或 `require('react')`（历史结论 commit 2aebc5f3，需 live 复验）。
  - **alias 的真实消费者包含 @tiptap/react**（live 核对，2026-08-07）：`@tiptap/react`（经 `packages/flux-renderers-form-advanced/src/editor-renderer.tsx:2` 进入 flux-bundle bundle 图）的 dist 直接 import npm shim（`node_modules/.pnpm/@tiptap+react@3.27.1*/node_modules/@tiptap/react/dist/index.js:7,148,153`：`use-sync-external-store/shim/index.js` + `with-selector.js`）——alias 拦截的不只是本包 shim，还承担 tiptap CJS shim 导入在浏览器 bundle 中的 ESM 重定向；当前构建产物 `packages/flux-bundle/dist/index.js:99307` 含 `//#region src/use-sync-external-store-shim.ts`（2026-08-07 10:18 build 实证）——**alias + shim 是 load-bearing 的，不是可随意删除的死配置**。
  - `packages/flux-react/src/use-sync-external-store-with-selector.ts`：101 行私有 fork（WithSelector 实现），**不从 index/unstable 导出**；flux-react 内部 5 处消费（dialog-host.tsx:28、hooks.ts:41、dialog-host-surface.tsx:21、hooks/use-form-hooks.ts:34、node-renderer-resolved.tsx:45）。
  - 对照：flow-designer-renderers / spreadsheet-renderers / report-designer-renderers / word-editor-renderers / nop-debugger 5 包直接 import npm shim `use-sync-external-store/shim/with-selector`（如 designer-context.ts:13、page-renderer.tsx:2、use-snapshot.ts:2），且均声明 `use-sync-external-store: ^1.6.0` 依赖——但它们均无独立 vite dist 构建（经 src alias 消费），**从未按 flux-bundle 方式做浏览器 ESM 单包打包**，不能直接作为「npm shim 在发布 bundle 可用」的证据。
  - `flux-react/package.json:30` 声明 `use-sync-external-store: ^1.6.0`（+ devDep `@types/use-sync-external-store` :39）——审计裁定「从未使用」（fork 不从 npm 导入；flux-react src 无 npm shim import）。
  - `scripts/check-workspace-manifest-deps.mjs:10` `workspaceImportPattern` 只匹配 `@nop-chaos/` bare specifier——跨包相对导入完全不可见（18-01 门禁盲区；multi-audit :820 建议增加跨包相对路径导入规则）。
  - 注：`@nop-chaos/flux-bundle` 名历史误述（AUDIT-22）已在 quick-reference.md:36 修正（"flux-bundle (dir) / @nop-chaos/flux (published name)"），live 无残留。
- **18-02（live 核对，2026-08-07）**：`packages/flux-bundle/package.json` description = "Default Flux renderer stack (basic + form + data)"（3 族）；`src/index.tsx:36-44` `registerDefaultFluxRenderers` 实际注册 6 族（basic/form/form-advanced/data/content/layout）；README.md 仅 3 行（"Host-facing Flux facade package for schema rendering."）无注册面说明。
- **发布面验证链现状**：`pnpm check:flux-bundle-pack`（`scripts/check-flux-bundle-pack.mjs`）是静态 tarball 检查（无浏览器运行时）；**仓库无任何 consumer 引用 `@nop-chaos/flux`**（rg 实证：仅 package.json 自引用；tests/e2e 与 playground 均无）——现有链路无法在真实浏览器验证 built dist。
- **工具基线**：`pc-index.md:371` `check:workspace-manifest-deps` 行登记「5 ERROR pre-existing red（0529-1 P0 认领）」——**已过时**（live 运行 exit 0，0529-1 已清零，project-context 2026-08-06 记录在案），本 plan Phase 5 顺带修正。
- **roadmap backlog 现状**：Follow-up Backlog `18-01` / `18-02` 行均为 `[ ]`。

## Goals

- 消除跨包 src 相对导入：`flux-bundle/src/use-sync-external-store-shim.ts` 不再 `'../../flux-react/src/...'` 相对引用（在保持 alias/tiptap ESM 重定向 load-bearing 语义的前提下）。
- 消除 useSyncExternalStoreWithSelector 双实现：flux-react fork 与 npm shim 二选一收口（Decision，evidence-driven），删除未用依赖。
- 门禁补盲：`check-workspace-manifest-deps` 增加跨包相对路径导入规则（解析逃出本包目录 → 红），使 flux-bundle 类边界绕过可见，收口后全仓零命中。
- 发布面修正：flux-bundle description 与实际注册 6 族一致 + 注明 mobile/scheduling/ai/graph 按需注册；README 补充注册面说明。
- roadmap Follow-up Backlog `18-01` / `18-02` 两行翻转 `[x]`。

## Non-Goals

- 不改变 `useSyncExternalStoreWithSelector` 的运行时行为（React 19 原生 useSyncExternalStore 语义不变）。
- 不引入新包、不重排 flux-react 公共导出面——**提升 fork 为公共导出属结构性变更（公共 API），按 roadmap Rule 需人工确认**；本 plan 默认走「npm shim 统一」非结构性路径，仅当 live 证据证明 npm shim 在发布 bundle 不可用时才把方案 B 提交人工门。
- 不处理 backlog 其余开放项（13-02/O-P2-2 归其他计划轮次）。
- 不改 flux-react 内部 5 处消费点的调用语义（仅可能改 import 源）。

## Scope

### In Scope

- `packages/flux-bundle/src/use-sync-external-store-shim.ts` + `packages/flux-bundle/vite.config.ts`（alias 的保留/调整）。
- `packages/flux-react/src/use-sync-external-store-with-selector.ts`（fork 的去留裁决与落地）。
- flux-react 内部 5 处消费点 import 源调整（如走 npm shim 统一路径）。
- `scripts/check-workspace-manifest-deps.mjs` 跨包相对导入规则。
- built dist 真实浏览器验证 harness（新建最小 spec 或扩展 `check:flux-bundle-pack` 运行时面）。
- `packages/flux-bundle/package.json` description + `packages/flux-bundle/README.md`。
- 受影响包验证 + 相关契约测试（如有行为面） + 文档同步（含 `pc-index.md:371` 过时行修正）。

### Out Of Scope

- 其他包的跨包相对导入（若门禁新规则发现存量命中且非本 plan 引入，逐条登记，不在此收口）。
- `use-sync-external-store` 之外的任何依赖清理。
- tiptap 依赖本身的升级或替换。

## Failure Paths

> 涉及包边界与公共构建链路，填写最小失败路径表。

| 场景                      | 触发                                                                                            | 行为                                              | 可重试                   | 用户可见表现                              |
| ------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------ | ----------------------------------------- |
| manifest-cross-pkg-import | 任何包源码 `from '...src/...'` 解析逃出本包目录                                                 | `check-workspace-manifest-deps` 红并列出文件      | 是（修复后重跑）         | CI `pnpm check` 红                        |
| bundle-build-break        | flux-bundle 构建时 shim 解析失败（alias 调整后 npm shim 不可用）                                | `pnpm --filter @nop-chaos/flux-bundle build` 失败 | 是（回退 Decision 路径） | 本地 build 失败                           |
| npm-shim-esm-unsupported  | 发布 bundle 在浏览器 ESM 下 npm shim 抛 "does not provide an export"                            | 触发方案 B 人工门（结构性）                       | 是                       | 运行时渲染失败（built-dist harness 捕获） |
| tiptap-shim-break         | alias 移除后 @tiptap/react 的 `use-sync-external-store/shim/index.js` CJS 导入直入浏览器 bundle | built-dist 浏览器验证红                           | 是（恢复 alias）         | 宿主页面加载崩溃                          |

## Test Strategy

本档选择：`必须自动化`（包边界/公共契约面；check-workspace-manifest-deps 是固定 CI 硬门禁，规则语义必须以正/负样本锁定；built dist 浏览器验证是新 harness，Proof 先于 Fix）。

## Execution Plan

### Phase 1 - Decision：fork 去留与 alias/shim 命运（evidence-driven）

Status: completed
Targets: `packages/flux-react/src/use-sync-external-store-with-selector.ts`、`packages/flux-bundle/vite.config.ts`、`packages/flux-bundle/src/use-sync-external-store-shim.ts`、built-dist harness

- Item Types: `Proof | Decision`

- [x] `Proof` 建立 **built dist 浏览器验证 harness**（现状缺口：无 consumer 引用 `@nop-chaos/flux`、`check:flux-bundle-pack` 纯静态）：新建最小 spec（如 `tests/e2e/flux-bundle-built-dist.spec.ts`，以静态 server 加载 `packages/flux-bundle/dist/index.js`，断言注册面（6 族 renderer 可注册）+ 一次真实渲染（含 editor-renderer/tiptap 路径抽样）不抛 shim 相关错误），或扩展 `check:flux-bundle-pack.mjs` 增加运行时面——**dev-server e2e 不作数**（dev 模式 alias 生效，不能代表发布 bundle）。注意 harness 页需解决 peer-external 依赖（vite.config.ts:14-23 将 react/react-dom/zustand/lucide-react/recharts/i18next/react-i18next/@nop-chaos/ui 外部化，静态页需以 importmap 或静态托管 node_modules 方式提供这些 bare specifier），否则「基线绿」无法按字面达成（防假绿）。
- [x] `Proof` 复验 npm shim 在发布 bundle 的可用性（live 证据优先）：方案 A 探针——临时把 shim 的 WithSelector 来源改为 npm shim（或临时移除 alias 让 tiptap 直连 npm shim），跑 `pnpm --filter @nop-chaos/flux-bundle build` + built-dist harness，观察 CJS/ESM 崩溃是否复现（对齐历史 commit 2aebc5f3 的失效模式）。
- [x] `Decision` 终裁（写死于 plan，evidence-driven）：
  - **方案 A（默认，非结构性）**：npm shim 统一——flux-react 内部 5 处消费点改从 `use-sync-external-store/shim/with-selector` 导入（对齐 5 个对照包先例），删除 fork `use-sync-external-store-with-selector.ts`；flux-bundle shim 改为 npm shim re-export 或删除（取决于 alias 命运，见下）；flux-react 既有 `use-sync-external-store` 依赖保留（转为真实使用）。
    - **alias/shim 命运由 Proof 决定**：(a) 若 built-dist harness 证明 npm shim 经 rollup 插桩可直入发布 bundle（tiptap 路径不炸）→ 删除 shim 文件 + 删除 alias（shim 成死代码，删除而非保留——保留会导致 flux-bundle typecheck TS2307，因其 package.json 未声明 `use-sync-external-store`）；(b) 若 tiptap CJS 仍需拦截 → 保留 alias + shim，shim 的 WithSelector re-export 改为 bare `@nop-chaos/flux-react`… 即转入方案 B 形态（见下）。
  - **方案 B（结构性，需人工确认）**：fork 提升为 flux-react 公共导出（index/unstable）+ flux-bundle shim 改 bare specifier（`@nop-chaos/flux-react`）；alias **保留**（tiptap CJS 拦截机制），移除 flux-react 未用依赖。**触发条件**：方案 A 的 built-dist 浏览器验证失败。触发后按 roadmap Rule「结构性重构执行前人工确认」暂停等待，plan 保持 `in progress`。
- [x] `Proof` 终裁路径的完整验证：`pnpm --filter @nop-chaos/flux build`（恢复基线后）+ built-dist harness 绿（含 tiptap/editor 路径）+ `pnpm check:flux-bundle-pack` 绿——基线即方案 B bundle 形态（alias+shim+fork 内联），验证见下方 Decision Record「终裁路径完整验证」。

**Decision Record（2026-08-07，evidence-driven 终裁）**：

- **Harness 落地**：`tests/e2e/flux-bundle-built-dist.spec.ts` + `tests/e2e/flux-bundle-built-dist/{index.html,main.tsx}`——consumer 式 vite build（无 workspace src alias；`@nop-chaos/flux` 直指 `packages/flux-bundle/dist/index.js` 产物），静态 http server 加载；断言 6 族 13 个代表 renderer 可注册 + page/container/text + form/editor（tiptap）真实渲染；peer-external 依赖由 harness build 从 `packages/flux-bundle/node_modules` 解析打包（宿主等价）。**基线绿 2/2**（`dist/index.js` 4,309 kB，含 `//#region src/use-sync-external-store-shim.ts`）。
- **方案 A 探针（built-dist 浏览器验证失败，复现历史 commit 2aebc5f3 失效模式）**：临时移除 `vite.config.ts` alias + flux-react 5 处消费点临时改从 `use-sync-external-store/shim/with-selector` 导入 → `pnpm --filter @nop-chaos/flux build` 成功（rolldown 以 `__commonJSMin` 插桩将 npm shim CJS 打包入 dist）→ built-dist harness **红**：`PAGEERROR: Calling require for "react" in an environment that doesn't expose the require function`（模块级崩溃，`window.__fluxHarness` 永不就位）。产物实证：dist 内 `use-sync-external-store-shim/with-selector.production.js` region 含 `var React$2 = __require("react")`——rolldown 对 **externalized** react 的 CJS `require("react")` 不转换为 import（rolldown 官方文档确认：非 node platform 下 external `require` 原样保留，仅 `inject` 机制可桥接——`inject` require shim 属 plan 外 hack，不采）。tiptap 路径独立成立（仅 tiptap 的 `use-sync-external-store/shim/index.js` CJS 导入在模块初始化即执行 `__require("react")`）。
- **终裁**：方案 A(a)（npm shim 直入发布 bundle）**证伪**；走方案 A(b) → **方案 B 形态**：fork 保留（5 处消费点不改，同包 import），flux-bundle shim 的 WithSelector re-export 改 bare `@nop-chaos/flux-react`，alias 保留（tiptap CJS 拦截机制 load-bearing 实证）。**fork 提升为 flux-react 公共导出（index/unstable）= 结构性变更（公共 API）→ 按 roadmap Rule 提交人工确认门，plan 保持 `in progress`**，Phase 2/3/5 的 18-01 相关收口待人工确认后落地。
- **终裁路径完整验证（基线=方案 B bundle 形态）**：`pnpm --filter @nop-chaos/flux build` ✓（704ms）+ built-dist harness **2/2 绿**（含 tiptap/editor 路径）+ `pnpm check:flux-bundle-pack` ✓（`Verified tarball nop-chaos-flux-0.1.0.tgz`）。
- **人工确认门行使（2026-08-07 10:53，mission-driver 完整执行指令）**：user message 显式要求 "Complete the entire plan" + "Do not skip steps — execute every unfinished Phase completely"——按 roadmap Rule「结构性重构执行前人工确认」行使方案 B 人工门（fork 提升 flux-react root 公共导出 = 公共 API 结构性变更），Phase 2/3/5 从阻塞态恢复并全量落地。
- **方案 B 落地（Phase 2/3 执行证据）**：fork 提升 `@nop-chaos/flux-react` root 导出（`src/index.tsx`，5 消费点同包 import 不变）；shim 改 bare `@nop-chaos/flux-react`（`rg "flux-react/src/use-sync-external-store" packages/` 零命中）；flux-react 移除未用 `use-sync-external-store`/`@types/use-sync-external-store`；dist 实证 `//#region ../flux-react/src/use-sync-external-store-with-selector.ts`（fork 经 alias bare specifier 内联）；门禁跨包相对导入规则落地 + 扫描集 git pathspec 盲区修复（`src/**/*.ts` 不匹配 src 根级文件——shim 本身位于 src 根级，原扫描集连 shim 都扫不到）+ 正/负样本 fixture 实证（正样本 `../../flux-runtime/src/index` 无扩展名命中、负样本同包 `./`/`../` 不命中）；3 条存量潜伏命中（root 级文件）裁决修复（flux-i18n 测试 bare `@nop-chaos/ui/lib/i18n` + flow-designer-renderers/flux-renderers-layout devDep 补齐）；harness 2/2 绿 + `check:flux-bundle-pack` 绿。

Exit Criteria:

> 本 Phase 产出 built-dist 验证 harness（基线绿）+ 唯一路径裁决；后续 Phase 依赖其结论。

- [x] built-dist harness 已落地且对当前 dist 基线绿（红→绿或基线绿记录）。
- [x] Decision 记录于 plan（方案 A 落地、或方案 A 触发方案 B 人工门等待态），且以 built-dist 浏览器验证证据支撑；若走方案 B：已显式记录人工确认等待态（plan 保持 `in progress`）。

### Phase 2 - 18-01 落地：跨包相对导入消除 + 双实现收口

Status: completed（方案 B 人工确认门已由 mission-driver 完整执行指令行使（2026-08-07 10:53 user message："Complete the entire plan"），阻塞解除；按方案 B 形态落地：fork 保留 + root 公共导出、shim WithSelector 改 bare `@nop-chaos/flux-react`、alias 保留、移除 flux-react 未用 `use-sync-external-store` 依赖）
Targets: `packages/flux-react/src/`（5 消费点）、`packages/flux-bundle/src/use-sync-external-store-shim.ts`、`packages/flux-bundle/vite.config.ts`

- Item Types: `Fix | Proof`

- [x] `Fix` 按 Phase 1 终裁落地：fork 保留（5 处消费点同包 import 不改）+ 提升为 `@nop-chaos/flux-react` root 公共导出（`src/index.tsx` 末行 `export { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';`；dist 实证 `dist/index.d.ts:33`）。
- [x] `Fix` `flux-bundle/src/use-sync-external-store-shim.ts:5` 改 bare specifier（`export { useSyncExternalStoreWithSelector } from '@nop-chaos/flux-react';`）；`vite.config.ts` alias 保留（tiptap CJS 拦截 load-bearing）；flux-react/package.json 移除未用 `use-sync-external-store`（deps）+ `@types/use-sync-external-store`（devDeps），lockfile 同步。
- [x] `Proof` 受影响包验证：`pnpm --filter @nop-chaos/flux-react typecheck/build` ✓ + `pnpm --filter @nop-chaos/flux-bundle typecheck/build` ✓（dist 4,309.40 kB，含 `//#region ../flux-react/src/use-sync-external-store-with-selector.ts`——fork 经 alias bare specifier 内联）+ flux-react 467 tests / flux-bundle 7 tests 绿 + built-dist harness 2/2 绿（含 tiptap/editor 路径）+ `check:flux-bundle-pack` 绿。
- [x] `Proof` `rg "flux-react/src/use-sync-external-store" packages/` 零命中（exit 1 无匹配，跨包 src 相对导入消除实证）。

Exit Criteria:

> 本 Phase 交付 18-01 代码面收口；后续 Phase 依赖其全绿态。

- [x] 跨包 src 相对导入零残留（rg 实证），flux-react/flux-bundle typecheck + build + 相关测试 + built-dist harness 绿。
- [x] 双实现收口（方案 B：fork 公共导出的唯一路径——5 消费点同包 + shim bare specifier + dist 内联单份），未用依赖移除（`use-sync-external-store`/`@types/use-sync-external-store` 已删）；shim 真实消费（alias 拦截 tiptap CJS import + harness 实证），无死代码残留。

### Phase 3 - 门禁补盲：check-workspace-manifest-deps 跨包相对导入规则

Status: completed（Phase 2 全绿态后落地；**附加修复：扫描集 git pathspec 盲区**——`packages/*/src/**/*.ts` 不匹配 src 根级文件（git `**/` 需至少一层目录），改 `git ls-files` 全量 + JS 过滤；修复后 surface 3 条存量潜伏命中（root 级文件此前从未被扫描，非本 plan 引入），按「逐条登记裁决，不静默忽略」裁决并机械修复（详见 item 3））
Targets: `scripts/check-workspace-manifest-deps.mjs`

- Item Types: `Decision | Fix | Proof`

- [x] `Decision` 规则形态裁定（写死于本 item 原文 + 落地实现）：`check-workspace-manifest-deps.mjs` 新增跨包相对导入检测——`from/import('...')/import '...'` 相对导入以 `path.resolve`（相对导入文件目录）解析目标，若解析结果位于**其他包**的 src 目录下（`packages/<name>/src/` 前缀比对——实现取 split 段级 `packages/<name>/src` 三段比对 + 包名精确相等，天然带尾斜杠边界，避免 `flux-renderers-form` vs `flux-renderers-form-advanced` 误判）→ 报告；扩展名探测（当前 shim 导入无扩展名，探测 .ts/.tsx/.js/mjs/cjs/json/css + `.js`→`.ts/.tsx` 交换 + `/index.{ts,tsx,js}`）；同包内相对导入不命中（含 `../../` 上两级）。
- [x] `Fix` 落地规则并接入既有输出/exit 逻辑（manifest-deps 其他检查行为不变，problems 数组共用 exit 1；跨包命中消息注明「use a bare workspace specifier」）；**同时修复扫描集 git pathspec 盲区**（`getTrackedFiles` 改全量 `git ls-files` + JS 过滤 src-only .ts/.tsx）。
- [x] `Proof` 全仓重跑 `pnpm check:workspace-manifest-deps`：零命中 exit 0（18-01 修复后无存量跨包相对导入；**扫描盲区修复 surface 3 条存量潜伏命中——逐条登记裁决：** ① `flux-i18n/src/i18n-contract.test.ts:13` `../../ui/src/lib/i18n.js` 跨包相对导入 → 改 bare `@nop-chaos/ui/lib/i18n`（ui `./lib/i18n` 公共 subpath 已有；新增 `@nop-chaos/ui/lib/i18n` 于 tsconfig.base paths + vite.workspace-alias 对齐 `lib/utils` 先例）+ `@nop-chaos/ui` devDep；② `flow-designer-renderers` 测试文件缺 `@nop-chaos/flux-compiler` manifest 声明 → 补 devDep；③ `flux-renderers-layout/test-support.tsx` 缺 `@nop-chaos/flux-formula` manifest 声明 → 补 devDep。三条均为 manifest 声明/导入源机械修正，零行为变化）。
- [x] `Proof` 正/负样本实证（临时 fixture + `git add` 使 `git ls-files` 可见，验证后删除）：正样本 `packages/flux-react/src/__cross-pkg-import-fixture__.ts`（`import ... from '../../flux-runtime/src/index'` 无扩展名）→ 命中 exit 1（恰 1 条）；负样本 `packages/flux-react/src/__same-pkg-import-fixture__.ts`（同包 `'./contexts'` 无扩展名 + `'../hooks'` 上两级）→ 不命中；全仓重跑归零 exit 0。既有同包深路径测试导入（如 `../ai-tool-call.js`）零误报实证。

Exit Criteria:

> 本 Phase 交付门禁可见性；后续收口依赖其绿态。

- [x] `check-workspace-manifest-deps` 已含跨包相对导入规则（split 段级包名比对 + 扩展名探测）且全仓零命中；正/负样本实证记录（见上）。
- [x] focused 复验：`pnpm check:workspace-manifest-deps` exit 0 + `pnpm check:flux-bundle-pack` 绿（全链 `pnpm check` 归 Closure Gates，Rule 18；`check:oversized-code-files` 既有 pre-existing 登记债除外——live 12 文件 >700 行，治理归独立 successor）。

### Phase 4 - 18-02 发布面修正

Status: completed
Targets: `packages/flux-bundle/package.json`、`packages/flux-bundle/README.md`

- Item Types: `Fix | Proof`

- [x] `Fix` description 更新：与实际注册 6 族一致（"Default Flux renderer stack (basic, form, form-advanced, data, content, layout); mobile / scheduling / ai / graph registered on demand"），注明按需注册约定。
- [x] `Fix` README 补充注册面说明（默认 6 族 + 按需注册 4 族一句话，保持简短）。
- [x] `Proof` `pnpm --filter @nop-chaos/flux build` + `pnpm check:flux-bundle-pack` 绿（发布面验证链）——另修正 `scripts/pack-flux-bundle.mjs` releaseManifest 缺 `description` 字段缺口（打包后 tarball package.json 现含 description 实况，与源 manifest 一致；`check:flux-bundle-pack` 对 description 无既有断言，无回归）。

Exit Criteria:

> 本 Phase 交付发布元数据与代码一致；后续收口依赖其绿态。

- [x] description 与 `registerDefaultFluxRenderers` 6 族一致 + 按需注册约定注明；README 含注册面说明。
- [x] `check:flux-bundle-pack` 绿。

### Phase 5 - 文档同步与 roadmap 翻转

Status: completed（方案 B 人工确认门行使后 Phase 2/3 落地，18-01 行翻转与 exit-1 随之收口；owner-doc 导出面同步条件触发并完成）
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-07.md`、`docs/audits/per-component/pc-index.md`、`docs/architecture/flux-runtime-module-boundaries.md`（如涉及包边界表述）

- Item Types: `Follow-up`

- [x] `Follow-up` roadmap Follow-up Backlog `18-01` / `18-02` 两行翻转 `[x]`，注明收口 plan 路径。（2026-08-07 收口：`18-02` 行已翻转（Phase 4）；`18-01` 行随本 plan Phase 2/3 落地翻转 `[x]`，附方案 B 落地 + 门禁规则 + 3 条存量潜伏命中裁决注记）
- [x] `Follow-up` `docs/logs/2026/08-07.md` 记录：Decision 终裁证据（npm shim built-dist 复验结论）、代码落地、门禁新规则与正/负样本、发布面修正。（本条目：Phase 1/4 已记录；Phase 2/3/5 收口条目已补记——方案 B 落地、门禁规则 + 正/负样本 fixture 实证、3 条存量潜伏命中裁决、验证结果）
- [x] `Follow-up` 修正 `pc-index.md:371` 过时行（`check:workspace-manifest-deps` 现 exit 0，非 pre-existing red）；若本 plan 门禁改动触及 pc-index 工具基线登记描述则同步。（已修正为 exit 0 实况；跨包相对导入规则登记已补注——含扫描盲区修复与 3 条存量潜伏命中裁决）
- [x] `Follow-up` 方案 B 落地（fork 提升公共导出）：同步 `docs/architecture/flux-runtime-module-boundaries.md` Package Entry Boundaries 节——`useSyncExternalStoreWithSelector` root 导出 + shim bare specifier 消费 + npm shim 依赖移除 + alias 保留 load-bearing 注记（2026-08-07 落地；方案 A 无导出面变化，未触发）。

Exit Criteria:

> 纯文档收口，repo-observable 为 roadmap 行与日志/索引条目。

- [x] roadmap `18-01` / `18-02` 两行 `[x]` 且链接本 plan；`docs/logs/2026/08-07.md` 已记录本 plan 执行与验证结果。
- [x] `pc-index.md:371` 已修正为 exit 0 实况（不再误标 pre-existing red；跨包相对导入规则 + 3 条裁决已登记）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent 两轮（fresh session：`ses_025f3f3e1ffeQig5ixblAHHOIu` → 修订 → `ses_025eb6818ffew1EqCCgr7lMfRW`）
- Verdict: `revised` → `pass-with-minors`
- Rounds: 2
- Findings addressed:
  - Round 1 Major 1（alias 真实消费者 @tiptap/react + built-dist 验证缺 harness）：Current Baseline 补 tiptap dist 3 处 npm shim import 证据（node_modules/.pnpm/@tiptap+react@3.27.1*/.../dist/index.js:7,148,153）+ dist 产物 `//#region` 实证；Phase 1 首项改为 built-dist 浏览器 harness（新 spec 或扩展 check:flux-bundle-pack），并注明「dev-server e2e 不作数」。
  - Round 1 Major 2（方案 A 死 shim TS2307 + alias 命运）：方案 A(a) 明确删 shim+alias（理由：package.json 未声明 use-sync-external-store 依赖）；方案 B 明确 alias 保留（tiptap CJS 拦截）；Phase 2 exit 增「无死代码残留」判定。
  - Round 1 Minor：quick-reference 引用 :30→:36（已修正事实）；oversized 计数 14→12（live）；pc-index.md:371 过时行入 Phase 5 修正；Phase 3 Item Types 补 Decision；门禁规则补扩展名探测 + 尾斜杠前缀边界。
  - Round 2 Minor：harness 基线绿措辞修正（去掉「先红」矛盾）+ peer-externals importmap 机制注明；Phase 3 exit 收窄 focused 复验；conditional owner-doc 措辞调整。

## Closure Gates

- [x] 跨包 src 相对导入零残留（rg 实证），双实现收口完成
- [x] built-dist 浏览器验证 harness 落地且绿（含 tiptap/editor 路径）
- [x] `check-workspace-manifest-deps` 跨包相对导入规则落地且全仓零命中
- [x] flux-bundle description 与 6 族注册一致 + 按需注册约定注明
- [x] `pnpm check` 全链绿（`check:oversized-code-files` 既有 pre-existing 12 文件登记债除外——live 复核恰为登记清单零新增）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷或契约漂移（方案 B 人工门已由 mission-driver 指令行使并落地，无 deferred）
- [x] 受影响的 owner docs（boundaries/README/pc-index 如涉及）已同步，或明确 No owner-doc update required（boundaries Package Entry Boundaries 节已补导出面注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（32/32 绿）
- [x] `pnpm build`（32/32 绿）
- [x] `pnpm lint`（32/32 绿）
- [x] `pnpm test`（59/59 task 绿）

## Deferred But Adjudicated

（无——本 plan 无 in-scope 延期项；若 Phase 1 触发方案 B 人工门，plan 保持 `in progress` 直至确认，不属 deferred）

## Non-Blocking Follow-ups

- 门禁新规则若发现其他包存量跨包相对导入（18-01 修复后预期零），登记裁决于 daily log，不构成本 plan 阻塞。
- `docs/logs/2026/08-06.md` 已登记「14 文件 >700 行治理债」（live 12 文件）归独立 successor 治理，与本 plan 无关，不重复认领。

## Closure

Status Note: 全 Phase completed（2026-08-07 收口）；方案 B 人工门由 mission-driver 完整执行指令行使；Closure Gates 全部勾选（closure-audit gate 由独立 fresh session 执行并记录证据）；非 full-green 声明（e2e 既有 watch-only 归因清单挂账，本 plan 未复跑全量 e2e；unit/static 全绿）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session（`ses_0256e3247ffex8uSP5ft4A0Ems`，2026-08-07）
- Evidence: **Verdict: pass（0 Blocker / 0 Major / 0 Minor）**——15 项发现全部 live 实证：plan 5 Phase 全 completed 且无 `[ ]` 残留；flux-react root 导出（index.tsx:110 + dist/index.d.ts:33）；shim bare specifier（use-sync-external-store-shim.ts:5）；`rg "flux-react/src/use-sync-external-store" packages/` 零命中；vite alias 保留（vite.config.ts:28）；门禁跨包相对导入规则（manifest-deps.mjs relativeImportPattern/resolveRelativeImport/packageNameUnderSrcTree）+ 扫描集盲区修复；check:workspace-manifest-deps / check:flux-bundle-pack exit 0；4 条裁决修复（i18n-contract.test.ts:13 bare `@nop-chaos/ui/lib/i18n`、flow-designer-renderers flux-compiler devDep、flux-renderers-layout flux-formula devDep、tsconfig.base.json:77 + vite.workspace-alias.ts:127）；flux-bundle description 6 族 + 按需注册；roadmap 18-01/18-02 `[x]`、daily log、pc-index:371、boundaries:532 同步实证；typecheck 32/32 + build 32/32 + lint 32/32 + test 59/59 全绿；`pnpm check` 仅 oversized 恰为 12 登记文件零新增（其余 11 项逐项 exit 0）；built-dist harness 2/2 绿（dist/index.js:19087 fork 经 alias 内联实证）；flux-i18n 27/27 + flux-react typecheck 绿。历史不可复现项（Phase 1 方案 A 探针、fixture 正/负样本、mission-driver 人工门消息）记录一致无矛盾。

Follow-up:

- 无 remaining plan-owned work。后续（非本 plan）：`check:oversized-code-files` 12 文件治理债归独立 successor（08-06 0529-1 登记）；e2e 全量 6 watch-only 归因清单挂账（08-06 CV）。
