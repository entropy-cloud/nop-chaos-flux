# 2 flux-bundle facade 宿主契约收口（打包类型面 TS2307 + props 静默丢弃）（component-audit-round2）

> Plan Status: active
> Last Reviewed: 2026-08-11
> Source: `docs/audits/2026-08-11-1929-multi-audit-component-audit-round2.md`（P1-01, P1-02）
> Related: `docs/plans/2026-08-11-1929-1-renderer-core-path-defect-remediation.md`、`docs/plans/2026-08-11-1929-3-claim-vs-reality-plan-doc-contract-integrity-remediation.md`（独立 closure surface）

## Purpose

收口 flux-bundle 作为文档指定唯一 host-facing 发布面的两处契约失信：打包产物 `dist/index.d.ts` 引用未声明的 `@nop-chaos/flux-core`（干净宿主安装必然 TS2307 / 类型静默退化 any），以及 `FluxSchemaRendererProps` 类型承诺 10 个可传 props 而 facade 实现只转发 6 个（宿主按公开类型配置得到静默 no-op）。同时消除 `check:flux-bundle-pack` 门禁「只查 manifest 不查 d.ts」的覆盖盲区。

## Current Baseline

- `packages/flux-bundle/types/public-types.d.ts:15`（构建时复制为 `dist/index.d.ts` 进入 tarball）存在 `import type ... from '@nop-chaos/flux-core'`；`packages/flux-bundle/package.json` peerDependencies 对该包零声明（门禁还主动禁止 manifest 含 flux-core）。真实 tarball（dist-packages/nop-chaos-flux-0.1.1.tgz）+ 临时目录干净安装 + `tsc --skipLibCheck false` 已实证复现 `TS2307: Cannot find module '@nop-chaos/flux-core'`；`skipLibCheck: true` 时错误被压制但公开类型静默退化为 any。
- `scripts/check-flux-bundle-pack.mjs:82-100` 只检查 manifest 文本是否含 `'@nop-chaos/flux-core'` 字符串 + js/css 结构，从不读取 `dist/index.d.ts` 内容——门禁通过但缺陷仍在（live 已核对）。
- `packages/flux-bundle/src/index.tsx:60-75`：`createFluxSchemaRendererWithRegistry` 只透传 `schema/schemaUrl/env/data/strictValidation/onActionError`（+ 闭包内 formulaCompiler/registry）；`public-types.d.ts:39-44` 的 `FluxSchemaRendererProps extends Omit<SchemaRendererProps, ...>` 仅排除 5 个字段，`plugins/pageStore/surfaceRuntime/moduleCache/parentScope/actionScope/componentRegistry/onRuntimeChange/onComponentRegistryChange/onActionScopeChange` 均被底层 `SchemaRenderer` 消费（`schema-renderer.tsx:154-156, 276-292, 348-353`）但 facade 全部丢弃（live 已核对 `packages/flux-react/src/schema-renderer.tsx` 与 `packages/flux-core/src/types/renderer-hooks.ts:127-146` 的 SchemaRendererProps）。
- flux-bundle 测试 `index.test.tsx` 未覆盖 props 透传。

## Goals

- tarball 内 `dist/index.d.ts` 对 `@nop-chaos/...` 的每个引用都被 release manifest 声明（或类型自包含），干净宿主安装 `tsc --skipLibCheck false` 零 TS2307。
- `FluxSchemaRendererProps` 的类型面与实现透传面完全一致：要么类型排除集合与实现一致，要么完整转发——不允许「类型可传但行为缺失」。
- `check-flux-bundle-pack` 门禁升级：解包扫描 `dist/index.d.ts` 的 `from '@nop-chaos/...'` 引用逐一断言已声明（带 committed 回归测试，先红后绿）。
- 「类型可传即被转发」有运行时/测试断言钉住。

## Non-Goals

- 不重排 flux-bundle 的 renderer 注册清单（`registerDefaultFluxRenderers` 内容不变）。
- 不处理 flux-compiler/flux-action-core/flux-runtime 等其它包根入口的零消费者导出（P2-08/09/29/30/31，入 follow-up backlog）。
- 不改动 `@nop-chaos/ui` peer 依赖的既有豁免（ui 是显式 peer，不属本 plan 范围）。

## Scope

### In Scope

- `packages/flux-bundle/types/public-types.d.ts`
- `packages/flux-bundle/src/index.tsx`（props 转发面）
- `packages/flux-bundle/package.json`（peerDependencies 声明，如采用方案 (b)）
- `scripts/pack-flux-bundle.mjs`（如类型改写走构建脚本）
- `scripts/check-flux-bundle-pack.mjs`（门禁升级 + committed 回归测试）
- `packages/flux-bundle/src/__tests__/index.test.tsx`（props 透传断言）
- `docs/architecture/frontend-baseline.md`（facade 契约说明，如改动公开面）

### Out Of Scope

- 其它宿主面契约（onActionError 语义、env 合并等既有行为，审计未报缺陷）
- e2e 宿主安装演练（clean-install 验证以 tsc + tarball 解包脚本为门禁载体）

## Failure Paths

| 场景                       | 触发                                                      | 预期行为                                             | 可重试 | 用户可见表现                 |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------------- | ------ | ---------------------------- |
| 宿主安装 tarball           | 干净目录 `pnpm add` tarball 后 `tsc --skipLibCheck false` | 零 TS2307；类型完整解析                              | 否     | 编译通过，编辑器类型提示完整 |
| 宿主传 plugins/parentScope | `createFluxSchemaRenderer()` 结果传 props                 | props 被完整转发，行为生效（或类型面明确排除该字段） | 否     | 不再出现静默 no-op           |
| pack 门禁                  | 新增未声明 d.ts 依赖                                      | check:flux-bundle-pack exit 1 + 明确报告缺失声明     | 否     | CI 拦截                      |

## Test Strategy

本档选择：`必须自动化` —— 宿主安装是公开 API 契约面（对外发包），门禁与 tsc 实证均为自动化载体。Proof 项（门禁/测试先红）必须排在 Fix 之前。

## Execution Plan

### Phase 1 - 打包类型面依赖闭合 + 门禁升级（P1-01）

Status: planned
Targets: `packages/flux-bundle/types/public-types.d.ts`、`scripts/pack-flux-bundle.mjs`、`scripts/check-flux-bundle-pack.mjs`、`packages/flux-bundle/package.json`

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：`scripts/__tests__/` 新增 check-flux-bundle-pack 回归用例：构造含未声明 `from '@nop-chaos/...'` 引用的模拟 dist/index.d.ts → 断言门禁失败（先红后绿）
- [ ] Decision：裁决 d.ts 依赖闭合方案：(a) public-types.d.ts 类型内联/经构建脚本改写（不 import flux-core）；或 (b) 将 flux-core 加入 release manifest peerDependencies 并放宽「manifest 不得含 flux-core」检查。按「宿主安装面最小隐式依赖」原则裁决，记录于 phase 内
- [ ] Fix：按裁决落地（改 public-types.d.ts / pack-flux-bundle.mjs / package.json manifest 生成），tarball 内 dist/index.d.ts 不再引用未声明包
- [ ] Fix：`check-flux-bundle-pack.mjs` 扩展：解包扫描 `dist/index.d.ts` 的 `from '@nop-chaos/...'`（含 `import type`）逐一断言已声明；报告缺失项精确到包名
- [ ] Proof：临时目录干净安装真实 tarball + `tsc --skipLibCheck false` 复验零 TS2307（记录于 phase 证据；该步骤在本地可重复执行，脚本化进门禁或文档化验证命令）

Exit Criteria:

- [ ] 门禁回归测试先红后绿落地；check:flux-bundle-pack 能拦截未声明 d.ts 依赖
- [ ] 重新打包后 tarball 解包扫描零未声明 `@nop-chaos/*` 引用；clean-install tsc 复验通过
- [ ] 局部验证：`pnpm --filter @nop-chaos/flux-bundle typecheck` + `pnpm test:scripts`

### Phase 2 - FluxSchemaRendererProps 类型面与实现透传对齐（P1-02）

Status: planned
Targets: `packages/flux-bundle/types/public-types.d.ts`、`packages/flux-bundle/src/index.tsx`、`packages/flux-bundle/src/__tests__/index.test.tsx`

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：`index.test.tsx` 新增 props 透传断言：传 `plugins`/`parentScope`/`onRuntimeChange`/`componentRegistry` 等全字段 props → mock 底层 SchemaRenderer 断言收到完整转发集合（先红后绿，暴露当前只转发 6 个的缺陷）
- [ ] Decision：裁决收敛方向——(a) 完整转发全部 10 个消费 props（与底层 SchemaRenderer 语义对齐）；或 (b) 显式声明允许字段集合（Omit 列表与实现一致，排除未转发字段）。默认 (a)（类型契约承诺能力则行为必须兑现），除非某项确实无法透传
- [ ] Fix：按裁决落地：index.tsx 转发集合与 public-types.d.ts 的 Omit/声明完全一致
- [ ] Fix：`docs/architecture/frontend-baseline.md:96-130` facade 段落同步（若公开面/行为有变化）；如选 (b) 则声明「facade 有意裁剪 props」并列出允许集合
- [ ] Proof：运行时断言或测试断言「类型可传即被转发」（与 Phase 1 的 tarball 验证合并为一个验证命令）

Exit Criteria:

- [ ] props 透传测试通过（先红后绿）；类型面与实现面逐字段核对一致（人工核对表或编译期断言）
- [ ] frontend-baseline.md facade 段落与 live 行为一致
- [ ] 局部验证：`pnpm --filter @nop-chaos/flux-bundle typecheck` + 相关单测通过

## Draft Review Record

> 起草后、执行前的独立审查证据。见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_00efef550ffe9e8YB08gqugdDr`；round 2 `ses_00ef5f528ffe9HWl7q5uXS7HIp`；round 3 `ses_00eeca7efffe8K596ShPfA17uo`）
- Verdict: `pass`
- Rounds: 3（round 1 即 pass；round 2/3 复核确认）
- Findings addressed: 0 Blocker / 0 Major / 0 Minor；基线引用 `renderer-hooks.ts` 补全路径 `packages/flux-core/src/types/renderer-hooks.ts:127-146`、onRuntimeChange 消费点补 :348-353

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（P1-01 TS2307、P1-02 props 丢弃）
- [ ] check-flux-bundle-pack 门禁覆盖 d.ts 依赖面且回归测试 committed（先红后绿记录在案）
- [ ] clean-install tsc 实证（`--skipLibCheck false`）零 TS2307 记录于 plan/日志
- [ ] 受影响 owner docs（frontend-baseline.md）已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

无。

## Non-Blocking Follow-ups

- 无（本 plan 其余发现均入 `docs/backlog/audit-followups-2026-08-11-1929.md`）

## Closure

Status Note: 待完成

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 待完成时填写
