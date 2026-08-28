# 2 flux-bundle facade 宿主契约收口（打包类型面 TS2307 + props 静默丢弃）（component-audit-round2）

> Plan Status: completed
> Last Reviewed: 2026-08-24
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

Status: completed
Targets: `packages/flux-bundle/types/public-types.d.ts`、`scripts/pack-flux-bundle.mjs`、`scripts/check-flux-bundle-pack.mjs`、`packages/flux-bundle/package.json`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：`scripts/__tests__/` 新增 check-flux-bundle-pack 回归用例：构造含未声明 `from '@nop-chaos/...'` 引用的模拟 dist/index.d.ts → 断言门禁失败（先红后绿）
- [x] Decision：裁决 d.ts 依赖闭合方案：(a) public-types.d.ts 类型内联/经构建脚本改写（不 import flux-core）；或 (b) 将 flux-core 加入 release manifest peerDependencies 并放宽「manifest 不得含 flux-core」检查。按「宿主安装面最小隐式依赖」原则裁决，记录于 phase 内
- [x] Fix：按裁决落地（改 public-types.d.ts / pack-flux-bundle.mjs / package.json manifest 生成），tarball 内 dist/index.d.ts 不再引用未声明包
- [x] Fix：`check-flux-bundle-pack.mjs` 扩展：解包扫描 `dist/index.d.ts` 的 `from '@nop-chaos/...'`（含 `import type`）逐一断言已声明；报告缺失项精确到包名
- [x] Proof：临时目录干净安装真实 tarball + `tsc --skipLibCheck false` 复验零 TS2307（记录于 phase 证据；该步骤在本地可重复执行，脚本化进门禁或文档化验证命令）

**Decision Record（2026-08-24）**：选 **(a) 类型自包含**——`@nop-chaos/flux-core` 不发布到任何 registry，(b) 会要求宿主安装不可获取的包（干净安装必然失败），且门禁「manifest 不得含 flux-core」是既有发布策略（运行时 JS 已全量内联自包含），按「宿主安装面最小隐式依赖」原则类型面必须同等自包含。(a) 内部再裁决：手写内联被否（RendererEnv/SchemaRendererProps 传递引用 flux-core 约 1500+ 行类型树，漂移风险高）；采用**构建期 d.ts 打包**——`scripts/prepare-flux-bundle-dist.mjs`（flux-bundle build 第二步）以 `dts-bundle-generator`（root 新增 devDep，配 `typescript@^6.0.3`）从 `types/public-types.d.ts` 生成自包含 `dist/index.d.ts`（引用类型全部内联；react 保持外部 import，为已声明 peer）。源文件 `types/public-types.d.ts` 仍是公开面唯一 authoring 源（工作区内经 devDep `@nop-chaos/flux-core` 正常解析）。

**Phase 1 证据（2026-08-24）**：

- 先红后绿（回归用例）：`scripts/__tests__/check-flux-bundle-pack.test.ts` 4 用例（纯函数 findUndeclaredTypeReferences 正/负样本 + 模拟 tarball 门禁失败 + 自包含通过）——实现前 4/4 红（exports 不存在），实现后 4/4 绿；`pnpm test:scripts` 9 files / 51 tests 全绿。
- 先红后绿（真实工件）：门禁升级后对 live 缺陷工件复跑 `node scripts/check-flux-bundle-pack.mjs` → 红：`dist/index.d.ts references undeclared @nop-chaos packages: @nop-chaos/flux-core`；d.ts 打包落地后复跑 → 绿：`Verified tarball nop-chaos-flux-0.1.0.tgz`。
- clean-install tsc 实证（`_tmp/clean-install-host-0824/`，可重复命令见下）：`npm init -y && npm install <repo>/dist-packages/nop-chaos-flux-0.1.0.tgz react@^19 react-dom@^19 --legacy-peer-deps && npm install -D @types/react@^19 typescript@~6.0.3 --legacy-peer-deps && ./node_modules/.bin/tsc --skipLibCheck false -p tsconfig.json`（check.ts 使用 createFluxSchemaRenderer/createDefaultFluxEnv/FluxSchemaRendererProps/RendererPlugin + createElement）→ **exit 0，零 TS2307**；tarball `package/dist/index.d.ts` 含 `@nop-chaos` 引用计数 = 0。
- 门禁脚本重构：`check-flux-bundle-pack.mjs` 拆出可导入的 `verifyTarball({ tarballPath })` / `findUndeclaredTypeReferences`（run-as-main guard 使 import 无副作用），`main()` 仍走完整 pack → 校验链；prepare 侧同步内置自检（打包产物若残留 `@nop-chaos/*` import 即构建失败）。

Exit Criteria:

- [x] 门禁回归测试先红后绿落地；check:flux-bundle-pack 能拦截未声明 d.ts 依赖
- [x] 重新打包后 tarball 解包扫描零未声明 `@nop-chaos/*` 引用；clean-install tsc 复验通过
- [x] 局部验证：`pnpm --filter @nop-chaos/flux typecheck` + `pnpm test:scripts`

### Phase 2 - FluxSchemaRendererProps 类型面与实现透传对齐（P1-02）

Status: completed
Targets: `packages/flux-bundle/types/public-types.d.ts`、`packages/flux-bundle/src/index.tsx`、`packages/flux-bundle/src/__tests__/index.test.tsx`

- Item Types: `Proof | Fix | Decision`

- [x] Proof：`index.test.tsx` 新增 props 透传断言：传 `plugins`/`parentScope`/`onRuntimeChange`/`componentRegistry` 等全字段 props → mock 底层 SchemaRenderer 断言收到完整转发集合（先红后绿，暴露当前只转发 6 个的缺陷）
- [x] Decision：裁决收敛方向——(a) 完整转发全部 10 个消费 props（与底层 SchemaRenderer 语义对齐）；或 (b) 显式声明允许字段集合（Omit 列表与实现一致，排除未转发字段）。默认 (a)（类型契约承诺能力则行为必须兑现），除非某项确实无法透传
- [x] Fix：按裁决落地：index.tsx 转发集合与 public-types.d.ts 的 Omit/声明完全一致
- [x] Fix：`docs/architecture/frontend-baseline.md:96-130` facade 段落同步（若公开面/行为有变化）；如选 (b) 则声明「facade 有意裁剪 props」并列出允许集合
- [x] Proof：运行时断言或测试断言「类型可传即被转发」（与 Phase 1 的 tarball 验证合并为一个验证命令）

**Decision Record（2026-08-24）**：选 **(a) 完整转发**。底层 `SchemaRenderer`（`packages/flux-react/src/schema-renderer.tsx`）对全部 10 个缺失 props 均有真实消费点（plugins/pageStore/moduleCache → createRendererRuntime :150-159；parentScope → rootScope :276；surfaceRuntime :280；actionScope :282；componentRegistry :288；onRuntimeChange/onComponentRegistryChange/onActionScopeChange :347-370），无一项「确实无法透传」，故类型面（Omit 仅排除 schema/env/onActionError 窄化再声明 + facade 自有 formulaCompiler/registry）保持不变，实现面补齐转发——「类型可传即被转发」以逐字段 identity 断言钉住。

**Phase 2 证据（2026-08-24）**：

- 先红后绿：`packages/flux-bundle/src/__tests__/index-props-forwarding.test.tsx`（新文件；vi.mock `@nop-chaos/flux-react` 的 `createSchemaRenderer` 为 props 捕获组件，importOriginal 保真 createLazyRendererComponent 等传递依赖）——修复前红：`expected undefined to be [ { name: 'fixture-plugin' } ]`（plugins 被静默丢弃实证）；`index.tsx` 补齐 10 个透传后绿：16 个类型可传 props 逐字段 `toBe` identity + `registry` 闭包注入 + facade 自有 formulaCompiler 实例断言。flux-bundle 3 files / 8 tests 全绿。
- 公开面核对：`FluxSchemaRendererProps` Omit 集合（'schema'|'env'|'onActionError'|'formulaCompiler'|'registry'）与实现转发集合逐字段一致（测试以 `Object.entries(props)` 全量遍历类型面全集做运行时核对）；`types/public-types.d.ts` 与 `src/types.ts` 文本未变（类型面本就承诺 10 props，无需改动）。
- frontend-baseline.md Host-Facing Release Baseline 段已补两条：自包含类型面（构建期 d.ts 打包 + 门禁扫描）与 props 完整转发契约（注明钉住测试路径）。
- 合并 tarball 验证（与 Phase 1 同一命令链）：重打包 → `check-flux-bundle-pack` 绿（`Verified tarball nop-chaos-flux-0.1.0.tgz`）→ clean-install `tsc --skipLibCheck false` exit 0；并 grep 实证 tarball `package/dist/index.js` 内含 `plugins/parentScope/onRuntimeChange/componentRegistry/onActionScopeChange: props.*` 转发实码。

Exit Criteria:

- [x] props 透传测试通过（先红后绿）；类型面与实现面逐字段核对一致（人工核对表或编译期断言）
- [x] frontend-baseline.md facade 段落与 live 行为一致
- [x] 局部验证：`pnpm --filter @nop-chaos/flux typecheck` + 相关单测通过

## Draft Review Record

> 起草后、执行前的独立审查证据。见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent fresh session（round 1 `ses_00efef550ffe9e8YB08gqugdDr`；round 2 `ses_00ef5f528ffe9HWl7q5uXS7HIp`；round 3 `ses_00eeca7efffe8K596ShPfA17uo`）
- Verdict: `pass`
- Rounds: 3（round 1 即 pass；round 2/3 复核确认）
- Findings addressed: 0 Blocker / 0 Major / 0 Minor；基线引用 `renderer-hooks.ts` 补全路径 `packages/flux-core/src/types/renderer-hooks.ts:127-146`、onRuntimeChange 消费点补 :348-353

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1-01 TS2307、P1-02 props 丢弃）
- [x] check-flux-bundle-pack 门禁覆盖 d.ts 依赖面且回归测试 committed（先红后绿记录在案）
- [x] clean-install tsc 实证（`--skipLibCheck false`）零 TS2307 记录于 plan/日志
- [x] 受影响 owner docs（frontend-baseline.md）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（37/37）
- [x] `pnpm build`（37/37）
- [x] `pnpm lint`（37/37）
- [x] `pnpm test`（68/68 task 绿；e2e 未在本轮 scope，不声明 full-green）

## Deferred But Adjudicated

无。

## Non-Blocking Follow-ups

- 无（本 plan 其余发现均入 `docs/backlog/audit-followups-2026-08-11-1929.md`）

## Closure

Status Note: 两 Phase 全 completed（2026-08-24 执行 + 收口）：P1-01 以构建期 dts-bundle-generator 打包收口（tarball 类型面自包含，clean-install tsc --skipLibCheck false 零 TS2307 实证），门禁升级为解包扫描 dist/index.d.ts 断言 @nop-chaos/\* 引用全部声明（带 committed 回归测试，先红后绿）；P1-02 按方向 (a) 补齐全部 10 个透传 props，类型面不变、实现面对齐，逐字段 identity 断言钉住。owner doc（frontend-baseline.md）同步；Closure Gates 全勾（全量 typecheck/build/lint/test 37/37/37/68 + pnpm check exit 0）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent session（`ses_fce9f61d4ffeDNNZu6sM6fCscf`，2026-08-24）
- Evidence: **Verdict: approved，0 Blocker / 0 Major / 1 Minor（cosmetic：prepare-flux-bundle-dist.mjs:49-50 对 dist/index.js 的 byte-identical no-op 重写，预存行为保留，无行为影响）+ 1 Informational（工作区未提交，commit 属 human gate）**。审计独立复验：回归测试 4/4 绿；`node scripts/check-flux-bundle-pack.mjs` exit 0；flux-bundle typecheck + 3 files/8 tests 绿；d.ts 扫描正则覆盖 from/import() 两种形态 + 子路径→包根映射核对；index.tsx 转发集与 renderer-hooks.ts SchemaRendererProps − 5 个 Omit 字段逐字段一致（消费点 :154-156/:276/:280/:282/:288/:348-370 核对）；`git diff` 证实 public-types.d.ts / src/types.ts 类型面零改动；fresh tarball d.ts @nop-chaos 引用计数 0 + index.js 含全部 5 个转发实码抽查 + manifest 5 peer 齐备 + 独立 clean-install tsc 复现 exit 0；`pnpm test:scripts` 9 files / 51 tests 绿；deferred/follow-up 节诚实（无 in-scope 残留）；frontend-baseline.md 契约断言与 live 行为一致。

Follow-up:

- 无 remaining plan-owned work。源 multi-audit（`docs/audits/2026-08-11-1929-multi-audit-component-audit-round2.md`）保持 planned——P1-03..P1-06 归 plan 1929-3 等其余路由计划收口，本 plan 仅覆盖 P1-01/P1-02。cosmetic no-op 重写（prepare-flux-bundle-dist.mjs:49-50）为预存行为，不构成本 plan 债务。
