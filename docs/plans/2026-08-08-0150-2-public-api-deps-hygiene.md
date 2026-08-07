# 2 公共 API 面与依赖卫生（flux-react fork JSDoc/直接单测 + graph 死依赖移除）

> Plan Status: active
> Mission: component-audit
> Work Item: P2-backlog:public-api-deps-hygiene
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（03-01/03-02）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」
> Related: `docs/plans/2026-08-07-1023-2-flux-bundle-boundary-and-metadata-integrity.md`（completed，fork 提升为 flux-react root 公共导出 + 5 处消费点 + shim bare specifier 出处）、`docs/plans/2026-08-07-2228-3-runtime-action-form-p2-remediation.md`（completed，本批 2 条为其余工程治理轮次）、`docs/plans/2026-08-08-0150-1-audit-tooling-gates-remediation.md`（active，manifest-deps 未跟踪扫描工具链）

## Purpose

把 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」中 **公共 API 面与依赖卫生** 的 2 条 P2 收口：flux-react root 公共导出 fork `useSyncExternalStoreWithSelector` 无 JSDoc 且无直接单测（03-01）、flux-renderers-graph 声明未使用的 `use-sync-external-store` 死依赖（03-02）。契约/公共层修复按「必须自动化」纪律 test-first。

## Current Baseline

- **fork `useSyncExternalStoreWithSelector` 无 JSDoc 且零直接单测**（03-01，确定）：`packages/flux-react/src/use-sync-external-store-with-selector.ts:20-26` 全 101 行无 JSDoc；`packages/flux-react/src/index.tsx:110` `export { useSyncExternalStoreWithSelector } from './use-sync-external-store-with-selector.js';` 为 root 公共导出（2026-08-07 1023-2 提升）。**真实消费点（live 核对）**：同包相对导入 5 处（`hooks.ts:41`、`dialog-host.tsx:28`、`dialog-host-surface.tsx:21`、`hooks/use-form-hooks.ts:34`、`node-renderer-resolved.tsx:45`）+ 跨包 bare 导入 1 处（`flux-bundle/src/use-sync-external-store-shim.ts:5` `@nop-chaos/flux-react`）——共 6 处消费点（**其中跨包仅 1 处**，其余 5 处为 flux-react 同包内）。注意：`flow-designer-renderers/src/designer-context.ts:13`、`report-designer-renderers/src/page-renderer.tsx:2`、`word-editor-renderers/src/hooks/use-word-editor-state.ts:2`、`word-editor-renderers/src/toolbar/ribbon-toolbar.tsx:2` 导入的是 **npm shim** `'use-sync-external-store/shim/with-selector'`，非本 fork，不属于 fork 维护同步面（1023-2 只把 flux-bundle shim 切到 fork，其余 npm shim 消费方保留）。fork 签名与 npm shim 差异：`getServerSnapshot` 由必传放宽为可选（React 19 原生第三参语义）；`src/__tests__/` 下 grep `useSyncExternalStoreWithSelector` 零命中——无直接单测（selector 相等性缓存、getServerSnapshot 回退、isEqual 自定义），仅 dialog-host-surface.test.tsx 间接覆盖。`docs/architecture/flux-runtime-module-boundaries.md:542` 已登记该模块（:532 为无关段落）。
- **getServerSnapshot 回退语义的可测边界**：flux-react 测试环境为 happy-dom 客户端渲染（`vitest.config.ts`），**客户端渲染从不调用 `getServerSnapshot`**，且 `flux-react/package.json` 无 react-dom 依赖（deps 仅 workspace 包；`require.resolve('react-dom/server')` 不可达）——因此「SSR 场景 server 快照回退」**无法在 flux-react 单测内直接观测**。可测部分：getServerSnapshot 参数可选性（省略第三参不报错、类型契约）、客户端渲染时 fork 的 selector 缓存/isEqual 行为。SSR 分支行为超出单测面，以 JSDoc 记录语义 + 1023-2 兼容性验收背书（见 Goals/Non-Goals 边界）。
- **flux-renderers-graph 声明未使用的 `use-sync-external-store` 死依赖**（03-02，确定）：`packages/flux-renderers-graph/package.json:27` `"use-sync-external-store": "^1.6.0"`；`packages/flux-renderers-graph/src/` 下 grep 零命中（graph 仅用 zustand `useStore`）。18-01 清理（1023-2）只从 flux-react 移除该依赖，graph 侧自包创建（08-04 模板带入）起未使用，清理范围未覆盖。`check:workspace-manifest-deps` 只校验"源码导入未声明"方向，不校验"声明未使用"。
- 验证基线：`pnpm check` 聚合 exit 0；flux-react 包测试（vitest run，`src/__tests__/` 既有 container-hooks/dialog-host-surface 等 renderHook 先例）；`pnpm test:scripts` 独立跑脚本测试。

## Goals

- fork `useSyncExternalStoreWithSelector` 补 JSDoc（来源、与 npm 签名差异、维护提示——同步面为 6 处真实消费点）并新增直接单测，锁定 selector 相等性缓存、getServerSnapshot 可选签名契约、isEqual 自定义三组**客户端可观测**语义（SSR server 快照分支超出 happy-dom 测试面，以 JSDoc 记录语义）。
- flux-renderers-graph 移除 `use-sync-external-store` 死依赖并同步 pnpm-lock.yaml；裁决「声明未使用」反向检查是否纳入 manifest-deps 门禁。
- 两条 roadmap Follow-up Backlog 条目勾选并注明 plan 引用。

## Non-Goals

- 不改变 fork 的函数签名/行为（兼容性验收已过，本 plan 只补文档与测试）。
- 不迁移 graph 的 zustand 使用面（不在本 plan 结果面）。
- 不重跑全量 e2e；验证以 focused 单测 + `pnpm check` + 全量 typecheck/build/lint/test（Closure Gates）为准。

## Scope

### In Scope

- `packages/flux-react/src/use-sync-external-store-with-selector.ts`：补 JSDoc（fork 来源、getServerSnapshot 可选签名差异、维护警示——同步面 6 处真实消费点）。
- `packages/flux-react/src/__tests__/use-sync-external-store-with-selector.test.tsx`（新建）：renderHook 直接单测（仿 `dialog-host-surface.test.tsx` 的 renderHook 用法先例）——selector 相等性缓存、getServerSnapshot **可选签名契约**（省略第三参渲染正常；SSR 分支不可在 happy-dom 观测，不作为用例断言）、isEqual 自定义、订阅清理。
- `packages/flux-renderers-graph/package.json`：删除 `use-sync-external-store` 依赖；`pnpm-lock.yaml` 同步（`pnpm install` 后确认 lockfile 中 graph 的 importer 声明消失；包条目本身因 zustand peer 依赖与其他 5 个声明方（flow-designer-renderers/report-designer-renderers/spreadsheet-renderers/nop-debugger/word-editor-renderers）仍保留属预期，不要求全仓条目消失）。
- `scripts/check-workspace-manifest-deps.mjs`（可选，Decision）：裁决是否加「声明但未引用」反向检查规则——若实施，补规则 + `scripts/__tests__/` 合成夹具测试（graph 死依赖类问题可见化）。
- Roadmap Follow-up Backlog 两条勾选 + daily log 登记。

### Out Of Scope

- `check-workspace-manifest-deps` 未跟踪文件扫描修复（归 `2026-08-08-0150-1`）。
- 其他包的同类死依赖全仓排查（本 plan 只收 graph 已知面；反向检查落地后由门禁防回归）。

## Failure Paths

| 可测场景编号    | 触发                                         | 行为                                                                                                       | 可重试 | 用户可见表现                                                     |
| --------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| fork-ssr        | SSR hydrate 且 server/client snapshot 不一致 | React 在 getServerSnapshot 存在时以 server 快照初值 + 客户端立即校正（React 原生语义；本 fork 未改该通道） | 是     | 首帧可能短暂显示 server 值后校正（React 原生行为，非 fork 缺陷） |
| fork-concurrent | 并发渲染/选择器抛错                          | selector 抛错在渲染期传播（React 错误边界兜底）；订阅在 unmount 时清理（用例 (d) 锁定）                    | 否     | 渲染错误由宿主错误边界呈现                                       |

> 说明：SSR 分支行为在 flux-react happy-dom 单测环境中不可观测（无 react-dom 依赖），以 JSDoc 记录语义 + 上表声明预期行为；单测锁定客户端可观测部分。

## Test Strategy

本档选择：`必须自动化`（03-01 为公共导出契约行为——行为锁定用例先行（fork 行为已存在，用例为锁定语义而非改行为，不适用"先写失败测试"的改行为语义，但 Proof 仍先于 JSDoc Fix 交付）；03-02 为依赖移除，行为不变量由 `pnpm check:workspace-manifest-deps` + build 验证）。

## Execution Plan

### Phase 1 - fork 直接单测 + JSDoc（03-01）

Status: planned
Targets: `packages/flux-react/src/__tests__/use-sync-external-store-with-selector.test.tsx`、`packages/flux-react/src/use-sync-external-store-with-selector.ts`

- Item Types: `Fix | Proof`

- [ ] Proof：新建 `use-sync-external-store-with-selector.test.tsx`，test-first 用例——(a) selector 相等性缓存：同一 snapshot 值重复通知时 selection 结果稳定且 selector 不重复调用（spy 计数）；(b) getServerSnapshot 可选签名契约：第三参显式传 `undefined`（签名 `(() => TSnapshot) | undefined` 位置参数，不能字面省略否则 strict TS 报错）时 renderHook 正常渲染且订阅走 `getSnapshot`（spy 断言），提供真实函数时客户端渲染**不调用** getServerSnapshot（spy 零调用断言——锁定 React 客户端语义）；SSR server 快照分支不可在 happy-dom 观测，写入用例注释而非断言（与 Goal 边界一致）；(c) isEqual 自定义：默认 objectIs（引用相等）vs 自定义 `(a,b)=>a.x===b.x`（浅比较时 snapshot 变化但 selection 稳定不重渲染）；(d) 订阅生命周期：unsubscribe 清理正确、selector 抛错路径。以用例本身为契约锁定（fork 行为已存在，本批用例为锁定而非改行为）。
- [ ] Fix：补 fork JSDoc——来源（hand-copied from npm `use-sync-external-store/with-selector`）、与 npm 签名差异（`getServerSnapshot` 可选化，React 19 原生第三参语义）、维护警示（行为变更需同步 6 处真实消费点：flux-react 同包 5 处 + flux-bundle shim bare 1 处；全仓另有 12 处 npm shim 消费点（5 包，含 nop-debugger/spreadsheet-renderers 及测试文件）不属于 fork 同步面）。

Exit Criteria:

- [ ] 新增单测全绿（相等性缓存/getServerSnapshot 可选签名契约/isEqual 自定义/订阅清理）；`pnpm --filter @nop-chaos/flux-react test` 全绿（含既有用例零回归）
- [ ] fork 文件头 JSDoc 已补（含来源、签名差异说明、6 处真实消费点同步警示）

### Phase 2 - graph 死依赖移除（03-02）

Status: planned
Targets: `packages/flux-renderers-graph/package.json`、`pnpm-lock.yaml`

- Item Types: `Fix | Proof`

- [ ] Fix：`package.json:27` 删除 `"use-sync-external-store": "^1.6.0"`。
- [ ] Fix：`pnpm install`（或 `pnpm install --lockfile-only` 按仓库惯例）同步 `pnpm-lock.yaml`，确认 lockfile 中 graph 的 importer 依赖声明消失（包条目因 zustand peer 依赖与其他声明方保留属预期，不要求全仓条目消失）。
- [ ] Proof：`rg "use-sync-external-store" packages/flux-renderers-graph/` 零命中（package.json 与 lockfile importer 节均无）；`pnpm --filter @nop-chaos/flux-renderers-graph typecheck && build && test` 绿。

Exit Criteria:

- [ ] `rg "use-sync-external-store" packages/flux-renderers-graph/` 零命中；graph 包 typecheck/build/test 绿
- [ ] `pnpm check:workspace-manifest-deps` exit 0（无新增警告）

### Phase 3 - 「声明但未引用」反向检查裁决（03-02 可选建议）

Status: planned
Targets: `scripts/check-workspace-manifest-deps.mjs`、`scripts/__tests__/check-workspace-manifest-deps.test.ts`

- Item Types: `Decision | Fix`

- [ ] Decision：裁决是否在 `check-workspace-manifest-deps` 增加「package.json 声明但 src 零引用」反向规则——依据：审计 §9.1 建议 + 03-02 暴露盲区；成本：单脚本规则 + 合成夹具测试；收益：死依赖可见化防回归。倾向实施（若裁决实施则继续本 Phase 两条；若裁决不实施，将理由记入 Deferred But Adjudicated 并跳过）。
- [ ] Fix（若实施）：反向规则——对 renderer 包 dependencies 声明的非 workspace 依赖做 src 引用计数，零引用时报红；排除字段（如 peerDependencies 语义、类型引用仅 `import type` 也算引用）按仓库惯例定义。
- [ ] Proof（若实施）：合成夹具测试——声明但零引用依赖被检出（先红）；既有 graph `use-sync-external-store` 移除后反向规则对真实仓库 exit 0。

Exit Criteria:

- [ ] 裁决已记录（实施/不实施 + 理由）；若实施：反向规则测试先红后绿 + `pnpm check:workspace-manifest-deps` exit 0；若不实施：Deferred But Adjudicated 登记
- [ ] `pnpm test:scripts` 全绿（若实施）；`pnpm check` 聚合 exit 0

### Phase 4 - 收口

Status: planned
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-08.md`

- Item Types: `Follow-up`

- [ ] roadmap Follow-up Backlog 两条（03-01/03-02）勾选并注明本 plan 引用；daily log 登记执行记录与反向检查裁决。

Exit Criteria:

- [ ] roadmap 两条 `[ ]`→`[x]`（附 plan 引用）；daily log 收口记录已写

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session）两轮：`ses_022a4fd53ffegKnhJoyT4TA2w4`（round 1）、`ses_0229b2c81ffe07Y99o41Q33Zzk`（round 2）
- Verdict: `pass`（round 2；round 1 fail 2 Major + 5 Minor，均修订后归零）
- Rounds: 2
- Findings addressed:
  - M-1（round 1）：消费点枚举不实——修订为 live 核对：fork 真实消费 6 处（flux-react 同包 5 处相对导入 + flux-bundle shim bare 1 处），npm shim 消费方 4 文件明确排除于 fork 同步面
  - M-2（round 1）：getServerSnapshot 回退用例在 happy-dom 不可实现——修订为「可选签名契约」用例（第三参显式 `undefined` 渲染正常 + 客户端渲染 spy 零调用），SSR 分支标注不可测边界并写入 Failure Paths
  - Minor（round 1/2）：module-boundaries 锚点 :532→:542、renderHook 先例收窄至 dialog-host-surface.test.tsx、lockfile 表述修正（条目因 zustand peer + 5 声明方保留属预期）、声明方计数 4→5、npm shim 消费点计数 4→12（5 包）、Failure Paths 表补齐、Test Strategy 措辞（行为锁定非改行为）

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] 03-01 fork JSDoc + 直接单测（四组语义锁定）已落地
- [ ] 03-02 graph 死依赖已移除 + lockfile 同步（rg 零命中）
- [ ] 反向检查裁决已记录并落地（或 Deferred But Adjudicated 登记理由）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷
- [ ] roadmap Follow-up Backlog 两条已勾选并注明 plan 引用；daily log 已登记
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 「声明但未引用」反向检查（若 Phase 3 裁决不实施）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 03-02 修复本体（死依赖移除）已落地；反向检查是防回归增强，不实施不构成当前 supported baseline 缺陷。
- Successor Required: `no`
- Successor Path: 无（不实施时审计 §9.1 建议视为已裁决不采纳）

## Non-Blocking Follow-ups

- 全仓其他包的同类死依赖排查——反向检查（若实施）落地后由门禁统一覆盖，无需人工逐包。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- <<或者明确写 no remaining plan-owned work>>
