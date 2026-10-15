# 602 RM-0 政策与基线：Runtime Schema-Retention Policy + 元模型权威声明 + 两处死代码清理

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-0；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` §5.2/§5.4（下称"分析报告"）
> Related: renderer-metamodel 轨道首项（RM-1~RM-8 依赖本项裁决表）；mission `missions/renderer-metamodel.json`

## Purpose

把"编译后原始 schema 保留与读取"从零散记载升级为有 owner 的政策文档：12 条 raw 通道逐条裁决（契约保留钉面 / 迁移编译产物 / 删除），终结"无政策裁决"状态；同步钉面 `RendererComponentProps` 多通道权威关系；清理两处零行为死代码。本 plan 收口后，RM-7/RM-8 的执行范围由裁决表最终钉定。

## 授权链（保护区与公开契约裁决）

- 本 plan 代码面仅触 `packages/flux-react/src/` 两文件死代码（非 flux-core、非 renderer definition fields、非 schema validation、非公开导出链——`getNodeSchemaFrameWrap` 未入 `flux-react/src/index.tsx` 再导出）。
- 裁决表 #7~#12 属公开契约通道范围决策：roadmap 授权边界节（L11）裁定"公开导出面增删属结构性重构，执行前人工确认授权链落字"；Phase Details RM-0（L77）进一步要求"#7~#12 裁决值为迁移/删除时"才触发人工确认门。本裁决六值全为"契约保留"，roadmap 条件门不触发；本 plan 仍加码落字授权链：**用户 goal 指令（2026-10-15）四要素**——①执行 `renderer-metamodel-roadmap.md`；②直到彻底完成；③每个工作项按 plan guide 拟制计划完成；④每个计划完成后自动提交一次。该指令构成 RM-0~RM-8 全轨道执行授权（CX-20 plan 600 先例：用户 goal 指令四要素落字 = plan 授权链）。裁决值全部取保守值"契约保留钉面"（无公开面删除/收缩），并经独立 fresh 子 agent draft review 复核裁决论证后方生效。

## Current Baseline（live 核对 2026-10-15，HEAD 6c27d1dc8）

- `docs/architecture/renderer-runtime.md`（1494 行）无任何 "Schema-Retention" 内容；"Renderer Component Contract" 节（L190-241）已记载各通道语义但无通道权威声明；`schema.frameWrap` 在 L233 记载为 per-instance override。
- 两处死代码核实成立：
  - `packages/flux-react/src/node-frame-wrapper.tsx:26`——`const _schema = props.templateNode.schema as Record<string, unknown>;` 声明后全文件零引用。
  - `packages/flux-react/src/node-renderer-utils.ts:65-69`——`getNodeSchemaFrameWrap` 全仓 grep（packages/apps/tests，排除 dist）仅定义本体命中，零调用方；该符号不在 `flux-react/src/index.tsx` 导出链（`node-renderer.tsx:32` 仅再导出同模块的 `resolveFrameWrapMode`）。
- `RendererResolvedProps` Omit 清单（`packages/flux-core/src/types/renderer-core.ts:95-97`）= `when | visible | hidden | disabled | className | frameClassName | testid | readOnly | required`；`BaseSchema`（`packages/flux-core/src/types/schema.ts:116`）控制字段含 `frameWrap?: FrameWrapMode`，不在 Omit 清单。**运行时路由核实（R1 M1 勘正）**：`frameWrap` 在 `META_FIELDS`（`packages/flux-core/src/constants.ts:10`）中被编译器归类 `kind: 'meta'`（`packages/flux-compiler/src/schema-compiler/fields.ts:36-37`）编入 metaProgram，props bag 从 propsProgram 组装（`packages/flux-runtime/src/node-runtime.ts:277-291`）——运行时默认路径 authored `frameWrap` **不进 props bag**，权威读取通道即 `resolvedMeta.frameWrap`；漏项后果是**纯类型层**的（`RendererResolvedProps` 保留 `props.frameWrap` 类型读位，制造"类型允许读、运行时无值"的双通道面）。
- 12 条 raw 通道 live 锚点复核（本 plan 裁决表行号即以此次枚举为准）：#1 `TemplateNode.schema` 编译共享引用（`node-identity.ts:139`）；#2 `packages/flux-react/src/node-renderer-resolved.tsx:410`（`props.node.schema.name`）；#3 `packages/flux-react/src/schema-renderer.tsx:277-279`（`modalContainer`）；#4/#5 见上；#6 `packages/flux-react/src/use-node-debug-data.ts:34`；#7 `renderer-core.ts:198`（`RendererComponentProps.schema`；组装源 `node-renderer-resolved.tsx:384` `schema: templateNode.schema`）；#8 `render-fragment-types.ts:37`（`RenderNodeInput`）；#9 `renderer-core.ts:299`（`dispatch` raw 重载）；#10 `renderer-core.ts:303`（`executeSource`）；#11 `renderer-core.ts:250`（`evaluate(target: unknown)`）；#12 `renderer-core.ts:277`（`resolvePreparedImports`；根收集/准备点 `schema-renderer.tsx:394-397` `collectSchemaImports(props.schema)` 与 `:426` `prepareSchema(props.schema)`，通道级裁决同覆盖）。
- 基线全绿状态：HEAD 6c27d1dc8（WA-16 收口后的 docs 计数修正，单文件）；其前 ed054a4d7 为 WA-16 收口提交（隔离五门禁全链 exit 0 含 check）。主工作树另有并行会话脏路径（14 M + 7 untracked：其中 4 个属本轨道自身文件——分析报告/roadmap/mission/本 plan 文件，3 个属并行会话——ai-gallery/、pih test、home-families.ts），本 plan 零触碰并行路径、提交严格限定本 plan 路径。

## Goals

- `renderer-runtime.md` 增 "Runtime Schema-Retention Policy" owner 节：12 条通道逐条裁决表（三值 + 逐行理由）+ 政策正文（终态语义、新增通道的裁决义务）。
- `renderer-runtime.md` "Renderer Component Contract" 节增通道权威声明：`templateNode` 为权威、`schema`/`id`/`path` 为便利投影；`props` 与 `meta` 对 disabled/className/testid 的镜像关系钉面；`RendererResolvedProps` Omit 清单 frameWrap 漏项勘误钉面。
- 两处死代码删除，零行为。
- RM-8 范围钉定：#7~#12 全部裁决"契约保留"→ RM-8 = 保留通道钉文档 + 禁止新增 raw schema 读的 scanner 级门禁。

## Non-Goals

- 不改 #2/#3 的 raw 读本身（RM-7 迁移）；不动 #1/#6 通道。
- 不修 `RendererResolvedProps` Omit 清单（只钉面勘误；把 `frameWrap` 加入 Omit 会移除 `props` 类型位、属行为面——roadmap 显式排除清单已裁定该漏项"并入 RM-0 钉面，不单独立项"，后续如需修清单单独立 plan）。
- 不动 `FrameWrapMode` 词表与帧族生效路径（RM-2）；不新增 scanner 门禁（RM-8）。
- 不改 quick-reference.md（#7 通道在彼处"正式通道"的既有记载与本裁决一致，无需同步）。

## Scope

### In Scope

- `docs/architecture/renderer-runtime.md`：新增 "Runtime Schema-Retention Policy" 节 + "Renderer Component Contract" 节权威声明增补。
- `packages/flux-react/src/node-frame-wrapper.tsx`：删 `_schema` 死变量（含随之失用的 import 若有）。
- `packages/flux-react/src/node-renderer-utils.ts`：删 `getNodeSchemaFrameWrap` 死函数（含随之失用的 `TemplateNode` import）。
- `docs/backlog/renderer-metamodel-roadmap.md`：Phase Status RM-0 状态流转（review 过 `todo`→`planned`；closure audit 过 `planned`→`done`）。
- `docs/logs/2026/10-15.md`：收口条目。**提交纪律（R1 m1）**：该文件当前含并行会话未提交 hunks，收口提交须做 hunk 级 staging（`git show HEAD:<file>` 为底 + 仅拼入本 plan 条目 → `git hash-object -w` + `git update-index --cacheinfo`），禁止整文件 `git add` 吞并并行 hunks。

### Out Of Scope

- RM-1~RM-8 全部代码面；flux-core/flux-compiler 任何文件。
- 任何测试文件增删（死代码无测试引用；docs 无行为）。

## Failure Paths

不适用：纯文档增补 + 零行为死代码删除，无错误处理/API 行为/外部集成面。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯文档增补与零行为死代码删除；删除位点无任何调用方与测试引用（grep 判别即证明）。验证 = focused typecheck + 删除位点归零 grep + 全仓四命令收口（Closure Gates）。

## Execution Plan

### Phase 1 - Retention Policy owner 节 + 通道权威声明（docs）

Status: completed
Targets: `docs/architecture/renderer-runtime.md`

- Item Types: `Decision`

- [x] "Renderer Component Contract" 节增补通道权威声明：`templateNode` 为权威结构通道（`schema`/`id`/`path` 为便利投影，分叉时以 `templateNode` 为准）；`props`（渲染面投影）与 `meta`（控制面投影）对 disabled/className/testid 的镜像关系钉面（渲染可展示属性读 `props`，控制态/lifecycle/wrapper 读 `meta`）；frameWrap 权威读取通道为 `resolvedMeta.frameWrap`（经 NodeFrameWrapper），`schema.frameWrap` 是 authored 输入。
- [x] 同节增补 `RendererResolvedProps` Omit 清单 frameWrap 漏项勘误钉面：漏项事实 + 后果（**类型层双通道面**：Omit 清单漏 `frameWrap` 使 `RendererResolvedProps` 保留 `props.frameWrap` 类型读位；运行时默认路径 authored `frameWrap` 经 `META_FIELDS` 归类入 metaProgram、props bag 不携带该值，权威读取通道为 `resolvedMeta.frameWrap`）+ 纪律（renderer 禁从 `props` 读 frameWrap）。
- [x] 新增 "Runtime Schema-Retention Policy" 节（置于 "Related Documents" 前）：政策正文（编译不深拷贝、`TemplateNode.schema` 为保留之根、新增 raw 读通道须先入裁决表的义务）+ 12 条通道逐条裁决表（列：#、通道、live 位置锚点、裁决值、理由）。
- [x] 裁决值落定（保守值，理由逐行写）：#1 契约保留（保留之根，编译共享引用契约）；#2 迁移（RM-7 迁 resolved 通道）；#3 迁移（RM-7 迁编译产物）；#4 删除（本 plan Phase 2）；#5 删除（本 plan Phase 2）；#6 契约保留（debugger 调试语义）；#7~#12 契约保留（公开契约：quick-reference 正式通道/已记载 RenderNodes normalize/公开派发·执行·求值·imports 入口），其中 #9~#12 补"类型面可见、政策本文钉面"的文档状态。

Exit Criteria:

- [x] `renderer-runtime.md` 含 "Runtime Schema-Retention Policy" 节，裁决表恰 12 行，每行含 live 位置锚点 + 三值之一的裁决值 + 理由；锚点与本文 Current Baseline 枚举一致。（L1493 节落位 Related Documents 前，表 12 行 grep 实测）
- [x] "Renderer Component Contract" 节含 templateNode 权威声明、props/meta 镜像钉面、frameWrap 漏项勘误三块内容，且与 live code 行为一致（抽查 `node-renderer-resolved.tsx` 组装点、`node-frame-wrapper.tsx` frameWrap 读取点、`constants.ts` META_FIELDS 与 `flux-compiler` fields.ts 分类点）。（L243 子节落位；抽查点均经 R1/R2 审查员 live 亲证）

### Phase 2 - 两处死代码删除（零行为）

Status: completed
Targets: `packages/flux-react/src/node-frame-wrapper.tsx`、`packages/flux-react/src/node-renderer-utils.ts`

- Item Types: `Fix`（分析报告 §5.4 #4/#5 裁定删除的死代码）、`Proof`

- [x] 删 `node-frame-wrapper.tsx:26` `_schema` 死变量行。
- [x] 删 `node-renderer-utils.ts:65-69` `getNodeSchemaFrameWrap` 函数及随之失用的 `TemplateNode` import（`collectSchemaImports`/`resolveFrameWrapMode`/`shouldWarnOnImportFailure` 不动）。
- [x] Proof（判别）：`grep -rn "getNodeSchemaFrameWrap" packages/*/src` 归零；`grep -n "_schema" packages/flux-react/src/node-frame-wrapper.tsx` 归零；`pnpm --filter @nop-chaos/flux-react typecheck` 通过。

Exit Criteria:

- [x] 两删除位点在 src 中归零（grep 判别），flux-react focused typecheck 通过。（双 grep exit 1 归零 + typecheck 无错，2026-10-15 实测）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_4aa23bb8（独立 fresh 子 agent，亲证 live HEAD 6c27d1dc8 全锚点）
- Verdict: `pass`（R1 fail 0B/1M/4m → 按 M1+四 m 修订 → R2 pass 0B/0M/1m）
- Rounds: 2
- Findings addressed: R1 M1=frameWrap 漏项后果子句与 live 运行时路由冲突（实况：`META_FIELDS`→metaProgram、props bag 出自 propsProgram，泄漏纯类型层）——已按审查员最小修订重写为类型层双通道陈述，Baseline/Phase 1/Exit Criteria 三处同步；m1=10-15.md hunk 级 staging 纪律落字 Scope；m2=WA-16 收口提交归因校正（ed054a4d7 五门禁，6c27d1dc8 为其后 docs 修正）；m3=#7~#12 人工确认门引用收紧至 roadmap Phase Details RM-0 条件门（契约保留不触发，plan 仍加码落字授权链）；m4=#12 锚点扩至 `schema-renderer.tsx:394-397/:426` 根收集点、#7 补组装源 `node-renderer-resolved.tsx:384`；R2 m5=本轨道 untracked 计数 3→4（补列本 plan 文件）已修。

## Closure Gates

- [x] 裁决表 12 行全部落字且经独立 draft review 复核（含 #7~#12 授权链生效确认）（R1 fail 0B/1M/4m → 修订 → R2 pass 0B/0M/1m）
- [x] 两处死代码删除落地且判别 grep 归零（双 grep exit 1；flux-react focused typecheck exit 0）
- [x] docs 增补与 live code 一致（权威声明/锚点抽查；closure audit 独立复核对账 12 锚点逐行命中 + 运行时路由逐点亲证）
- [x] 无 in-scope 缺口被静默降级（本 plan 零 deferred 项；Omit 漏项修复延后属类型层勘误后裁定，successor 归属 roadmap L115 落字）
- [x] owner docs 已同步：`renderer-runtime.md` 即 owner 文档本体；分析报告 §2.C frameWrap 表述就地勘误附注（closure audit M1）；roadmap Phase Status 状态流转；daily log 收口条目
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_5203f11c，R1 issues 1M/1m → M1 勘误附注落地后单点确认批准）
- [x] `pnpm typecheck`（42/42 exit 0，`_tmp/rm0-gates-typecheck.log`）
- [x] `pnpm build`（42/42 exit 0；flux-react 另 --force 真实构建复跑 exit 0）
- [x] `pnpm lint`（42/42 exit 0；flux-react 另 --force 复跑 exit 0）
- [x] `pnpm test`（14,974 passed / 0 failed，42 包，`_tmp/rm0-gates-test.log`）
- [x] `pnpm check` 零新增红（exit 0；既有登记红=flux-i18n 两条 locale oversized 已注册豁免[Plan 2026-08-07-1053-1]，与本 plan 无关；e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- RM-8 落地 scanner 门禁时，如扫描器对 `props.node.schema` 形态的既有合法读点（如 #6 调试通道）产生治理噪音，按登记制处理，不在本 plan 范围。

## Closure

Status Note: RM-0 三件交付全部落地——①"Runtime Schema-Retention Policy" owner 节（12 条 raw 通道逐条裁决：#4/#5 删除、#2/#3 迁移 RM-7、#1/#6/#7~#12 契约保留钉面，RM-8 范围随之钉定=保留通道钉文档+scanner 门禁）；②"Channel Authority" 通道权威声明（templateNode 权威/三投影、props-meta 镜像、frameWrap 权威通道与 Omit 漏项类型层勘误）；③两处死代码删除（`_schema` 死变量 + `getNodeSchemaFrameWrap` 死函数，判别 grep 归零）。分析报告 §2.C frameWrap 前提表述经 closure audit M1 就地勘误。全量验证：typecheck/build/lint 42/42 exit 0、test 14,974/0、check exit 0 零新增红；e2e 未重跑（纯文档+零行为死代码删除，已在提交信息披露）。裁决表生效授权：用户 goal 指令四要素（见授权链节）+ 独立 draft review R2 复核。

Closure Audit Evidence:

- Auditor / Agent: agent_5203f11c（独立 fresh 子 agent，R1 issues 1M/1m → 有条件批准；M1=分析报告 L81 就地勘误已落地、m1=check 红口径已按实测修正后单点确认通过）
- Evidence: 12 裁决锚点逐行 live 命中亲证；权威声明与运行时路由逐点一致亲证（node-renderer-resolved.tsx:381-384 / node-runtime.ts:19-32+277-291+357-360 / node-frame-wrapper.tsx:17-19 / constants.ts:10 / fields.ts:36-37）；双死代码符号全仓 grep 归零独立复跑；test 14,974 passed/0 failed awk 独立求和；并行 14 M + 3 untracked 零触碰实证；文本一致性五处核对通过

Follow-up:

- RM-8 落地 scanner 门禁时，如扫描器对 `props.node.schema` 形态的既有合法读点（如 #6 调试通道）产生治理噪音，按登记制处理，不在本 plan 范围。
- 其余：no remaining plan-owned work（RM-7/RM-8 由 roadmap 后续工作项承接，非本 plan 悬空）。
