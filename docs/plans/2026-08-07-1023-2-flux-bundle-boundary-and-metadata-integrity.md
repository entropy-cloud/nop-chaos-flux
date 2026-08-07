# 2 flux-bundle 包边界与发布元数据完整性（18-01 跨包相对导入 + 双实现 + 18-02 description）

> Plan Status: active（draft → active：独立子 agent 两轮审查，首轮 revised（2 Major：tiptap 为 alias 真实消费者需 built-dist harness、方案 A 死 shim TS2307 风险；5 Minor）已修订解决，复检 pass-with-minors（4 条 Minor 全部处理：harness peer-externals 机制注明、Phase 3 exit 收窄去重、conditional owner-doc 措辞、基线绿措辞修正），零 Blocker/零 Major，共识达成）
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

Status: planned
Targets: `packages/flux-react/src/use-sync-external-store-with-selector.ts`、`packages/flux-bundle/vite.config.ts`、`packages/flux-bundle/src/use-sync-external-store-shim.ts`、built-dist harness

- Item Types: `Proof | Decision`

- [ ] `Proof` 建立 **built dist 浏览器验证 harness**（现状缺口：无 consumer 引用 `@nop-chaos/flux`、`check:flux-bundle-pack` 纯静态）：新建最小 spec（如 `tests/e2e/flux-bundle-built-dist.spec.ts`，以静态 server 加载 `packages/flux-bundle/dist/index.js`，断言注册面（6 族 renderer 可注册）+ 一次真实渲染（含 editor-renderer/tiptap 路径抽样）不抛 shim 相关错误），或扩展 `check:flux-bundle-pack.mjs` 增加运行时面——**dev-server e2e 不作数**（dev 模式 alias 生效，不能代表发布 bundle）。注意 harness 页需解决 peer-external 依赖（vite.config.ts:14-23 将 react/react-dom/zustand/lucide-react/recharts/i18next/react-i18next/@nop-chaos/ui 外部化，静态页需以 importmap 或静态托管 node_modules 方式提供这些 bare specifier），否则「基线绿」无法按字面达成（防假绿）。
- [ ] `Proof` 复验 npm shim 在发布 bundle 的可用性（live 证据优先）：方案 A 探针——临时把 shim 的 WithSelector 来源改为 npm shim（或临时移除 alias 让 tiptap 直连 npm shim），跑 `pnpm --filter @nop-chaos/flux-bundle build` + built-dist harness，观察 CJS/ESM 崩溃是否复现（对齐历史 commit 2aebc5f3 的失效模式）。
- [ ] `Decision` 终裁（写死于 plan，evidence-driven）：
  - **方案 A（默认，非结构性）**：npm shim 统一——flux-react 内部 5 处消费点改从 `use-sync-external-store/shim/with-selector` 导入（对齐 5 个对照包先例），删除 fork `use-sync-external-store-with-selector.ts`；flux-bundle shim 改为 npm shim re-export 或删除（取决于 alias 命运，见下）；flux-react 既有 `use-sync-external-store` 依赖保留（转为真实使用）。
    - **alias/shim 命运由 Proof 决定**：(a) 若 built-dist harness 证明 npm shim 经 rollup 插桩可直入发布 bundle（tiptap 路径不炸）→ 删除 shim 文件 + 删除 alias（shim 成死代码，删除而非保留——保留会导致 flux-bundle typecheck TS2307，因其 package.json 未声明 `use-sync-external-store`）；(b) 若 tiptap CJS 仍需拦截 → 保留 alias + shim，shim 的 WithSelector re-export 改为 bare `@nop-chaos/flux-react`… 即转入方案 B 形态（见下）。
  - **方案 B（结构性，需人工确认）**：fork 提升为 flux-react 公共导出（index/unstable）+ flux-bundle shim 改 bare specifier（`@nop-chaos/flux-react`）；alias **保留**（tiptap CJS 拦截机制），移除 flux-react 未用依赖。**触发条件**：方案 A 的 built-dist 浏览器验证失败。触发后按 roadmap Rule「结构性重构执行前人工确认」暂停等待，plan 保持 `in progress`。
- [ ] `Proof` 终裁路径的完整验证：`pnpm --filter @nop-chaos/flux-bundle build` + built-dist harness 绿（含 tiptap/editor 路径）+ `pnpm check:flux-bundle-pack` 绿。

Exit Criteria:

> 本 Phase 产出 built-dist 验证 harness（基线绿）+ 唯一路径裁决；后续 Phase 依赖其结论。

- [ ] built-dist harness 已落地且对当前 dist 基线绿（红→绿或基线绿记录）。
- [ ] Decision 记录于 plan（方案 A 落地、或方案 A 触发方案 B 人工门等待态），且以 built-dist 浏览器验证证据支撑；若走方案 B：已显式记录人工确认等待态（plan 保持 `in progress`）。

### Phase 2 - 18-01 落地：跨包相对导入消除 + 双实现收口

Status: planned
Targets: `packages/flux-react/src/`（5 消费点）、`packages/flux-bundle/src/use-sync-external-store-shim.ts`、`packages/flux-bundle/vite.config.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix` 按 Phase 1 终裁落地：flux-react 5 处消费点 import 源切换（方案 A：npm shim；方案 B：fork 保留 + 公共导出）与 fork 去留。
- [ ] `Fix` `flux-bundle/src/use-sync-external-store-shim.ts` 与 `vite.config.ts` 按终裁调整（方案 A(a)：删 shim + 删 alias；方案 A(b)/B：shim 改 bare specifier、alias 保留）。
- [ ] `Proof` 受影响包验证：`pnpm --filter @nop-chaos/flux-react typecheck` + `pnpm --filter @nop-chaos/flux-bundle typecheck/build` + 相关单测（flux-react/flux-bundle 测试绿）+ built-dist harness 绿。
- [ ] `Proof` `rg "flux-react/src/use-sync-external-store" packages/` 零命中（跨包 src 相对导入消除实证）。

Exit Criteria:

> 本 Phase 交付 18-01 代码面收口；后续 Phase 依赖其全绿态。

- [ ] 跨包 src 相对导入零残留（rg 实证），flux-react/flux-bundle typecheck + build + 相关测试 + built-dist harness 绿。
- [ ] 双实现收口（fork 删除或公共导出的唯一路径），无未用依赖残留（方案 A：`use-sync-external-store` 转真实使用；方案 B：移除未用依赖）；shim 无死代码残留（删除或真实消费，无「保留但无引用」状态）。

### Phase 3 - 门禁补盲：check-workspace-manifest-deps 跨包相对导入规则

Status: planned
Targets: `scripts/check-workspace-manifest-deps.mjs`

- Item Types: `Decision | Fix | Proof`

- [ ] `Decision` 规则形态裁定：在 `check-workspace-manifest-deps.mjs` 增加跨包相对导入检测——对每个 `packages/*/src/**/*.{ts,tsx}` 中 `from '...'` 相对导入，以 `path.resolve`（相对导入文件目录）解析目标路径，若解析结果位于**其他包**的 src 目录下（`packages/<name>/src/` 前缀比对，**前缀比对必须带尾斜杠边界**，避免 `flux-renderers-form` vs `flux-renderers-form-advanced` 误判）→ 报告；**解析需扩展名探测**（当前 shim 导入无扩展名 `'../../flux-react/src/use-sync-external-store-with-selector'`，需探测 .ts/.tsx/.js/index）；同包内相对导入不命中（对齐 multi-audit :820 建议）。Config 文件（`*.config.ts` 等不在 src-only 扫描范围）不受影响。
- [ ] `Fix` 落地规则并接入既有输出/exit 逻辑（保持现有 manifest-deps 其他检查行为不变）。
- [ ] `Proof` 全仓重跑 `pnpm check:workspace-manifest-deps`：零命中（18-01 修复后应无存量跨包相对导入；若有其他存量命中，逐条登记裁决，不静默忽略）。
- [ ] `Proof` 正/负样本实证：临时构造跨包相对导入 fixture 断言命中、同包相对导入 fixture（含 `../../` 上两级）断言不命中，验证后删除（或沉淀为 committed 测试——若该脚本已有 `scripts/__tests__/` 覆盖则直接补 committed 用例，对齐 plan 1 先例）。

Exit Criteria:

> 本 Phase 交付门禁可见性；后续收口依赖其绿态。

- [ ] `check-workspace-manifest-deps` 已含跨包相对导入规则（含尾斜杠边界与扩展名探测）且全仓零命中；正/负样本实证记录。
- [ ] focused 复验：`pnpm check:workspace-manifest-deps` + `pnpm check:flux-bundle-pack` 绿（全链 `pnpm check` 归 Closure Gates，Rule 18；`check:oversized-code-files` 既有 pre-existing 登记债除外——live 12 文件 >700 行，治理归独立 successor）。

### Phase 4 - 18-02 发布面修正

Status: planned
Targets: `packages/flux-bundle/package.json`、`packages/flux-bundle/README.md`

- Item Types: `Fix | Proof`

- [ ] `Fix` description 更新：与实际注册 6 族一致（"Default Flux renderer stack (basic, form, form-advanced, data, content, layout); mobile / scheduling / ai / graph registered on demand"），注明按需注册约定。
- [ ] `Fix` README 补充注册面说明（默认 6 族 + 按需注册 4 族一句话，保持简短）。
- [ ] `Proof` `pnpm --filter @nop-chaos/flux-bundle build` + `pnpm check:flux-bundle-pack` 绿（发布面验证链）。

Exit Criteria:

> 本 Phase 交付发布元数据与代码一致；后续收口依赖其绿态。

- [ ] description 与 `registerDefaultFluxRenderers` 6 族一致 + 按需注册约定注明；README 含注册面说明。
- [ ] `check:flux-bundle-pack` 绿。

### Phase 5 - 文档同步与 roadmap 翻转

Status: planned
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-07.md`、`docs/audits/per-component/pc-index.md`、`docs/architecture/flux-runtime-module-boundaries.md`（如涉及包边界表述）

- Item Types: `Follow-up`

- [ ] `Follow-up` roadmap Follow-up Backlog `18-01` / `18-02` 两行翻转 `[x]`，注明收口 plan 路径。
- [ ] `Follow-up` `docs/logs/2026/08-07.md` 记录：Decision 终裁证据（npm shim built-dist 复验结论）、代码落地、门禁新规则与正/负样本、发布面修正。
- [ ] `Follow-up` 修正 `pc-index.md:371` 过时行（`check:workspace-manifest-deps` 现 exit 0，非 pre-existing red）；若本 plan 门禁改动触及 pc-index 工具基线登记描述则同步。
- [ ] `Follow-up` 若方案 B 落地（fork 提升公共导出）：同步 `docs/architecture/flux-runtime-module-boundaries.md` 或相关 owner doc 的导出面表述（方案 A 无导出面变化）。

Exit Criteria:

> 纯文档收口，repo-observable 为 roadmap 行与日志/索引条目。

- [ ] roadmap `18-01` / `18-02` 两行 `[x]` 且链接本 plan；`docs/logs/2026/08-07.md` 已记录本 plan 执行与验证结果。
- [ ] `pc-index.md:371` 已修正为 exit 0 实况（不再误标 pre-existing red）。

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

- [ ] 跨包 src 相对导入零残留（rg 实证），双实现收口完成
- [ ] built-dist 浏览器验证 harness 落地且绿（含 tiptap/editor 路径）
- [ ] `check-workspace-manifest-deps` 跨包相对导入规则落地且全仓零命中
- [ ] flux-bundle description 与 6 族注册一致 + 按需注册约定注明
- [ ] `pnpm check` 全链绿（`check:oversized-code-files` 既有 pre-existing 12 文件登记债除外）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷或契约漂移（方案 B 人工门等待态不计入 deferred，plan 保持 in progress）
- [ ] 受影响的 owner docs（boundaries/README/pc-index 如涉及）已同步，或明确 No owner-doc update required
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（无——本 plan 无 in-scope 延期项；若 Phase 1 触发方案 B 人工门，plan 保持 `in progress` 直至确认，不属 deferred）

## Non-Blocking Follow-ups

- 门禁新规则若发现其他包存量跨包相对导入（18-01 修复后预期零），登记裁决于 daily log，不构成本 plan 阻塞。
- `docs/logs/2026/08-06.md` 已登记「14 文件 >700 行治理债」（live 12 文件）归独立 successor 治理，与本 plan 无关，不重复认领。

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）

Follow-up:

- （待填；预期 no remaining plan-owned work）
