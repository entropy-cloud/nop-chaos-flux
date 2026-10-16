# 619 RM-14 RM-9 Deferred 收尾：A8 类型载体语义文档化（保留 `type`）+ §5.3 快照体积机器化

> Plan Status: active
> Last Reviewed: 2026-10-16
> Source: `docs/plans/611-rm9-residue-scan-plan.md` `## Deferred But Adjudicated`（A8 类型载体收敛 + §5.3 静态快照体积机器化两条遗留）；roadmap Phase Status RM-13 行的轨道收口注（终态六条含 RM-13 补完项，均已成立）
> Related: roadmap Cross-Cutting 2（静态快照体积不增）/ Rule 6（工作项增删人工确认）；RM-13 plan 615（`type`/`rendererType` 分叉的发现出处）

## Purpose

RM-9 收口时登记的两条 Deferred，经 2026-10-16 用户指令「按照你认为最合适的方式执行」授权，按 AI 判定收尾：

1. **A8 类型载体收敛 → 改判为「保留 `type` + 分叉语义文档化」**。RM-13 拟制期的 live 发现否证了「`TemplateNode.type` 是纯冗余副本」的前提：**`type`（作者声明类型）与 `rendererType`（生效渲染器类型）在编译失败路径分叉**——失败节点由 `compileFailureRenderer` 顶替（`node-compiler-helpers.ts:59` `rendererType: compileFailureRenderer.type`），而 `type` 保留作者写的原始类型（`node-compiler.ts:566` 成功路径两者一致）。删除 `type` 虽不丢失信息本体（`schema.type` 仍存），但会丢失**第一 class 的便利访问点与 `type`/`rendererType` 并列对照**——诊断工具与读者将须自行经 `schema.type` 间接取值并知晓失败路径分叉。改判：**保留全部四个载体中的 `type` 与 `rendererType`**（`schema.type` 随 `schema` 载体存在、`component.type` 为 `rendererType` 的副本——见 Deferred 的逐载体裁定），在 TemplateNode 的 owner doc 落字分叉语义；RM-9 的 A8 successor（收敛删除）就此**以"不删"结案**。
2. **§5.3 静态快照体积不增 → 机器化落地**。以「代表性 fixture 编译产物的序列化字节预算」作为 Cross-Cutting 2 的机器门禁：固定 fixture + 固定编译入口，断言编译产物序列化字节数 ≤ 已登记基线；基线只许人工有意上调（棘轮），使「快照体积增长」从政策约束变为编译期可检测回归。

## 授权链

①**2026-10-16 用户显式指令**（本次会话原话："按照你认为最合适的方式执行"）——针对上一条消息呈报的两项待决事项（A8 处置建议=保留+文档化；§5.3 机器化），授权按 AI 判断的方式执行，同时构成 roadmap Rule 6「工作项增删先报人工确认」所要求的人工确认（新增 RM-14）；②roadmap Cross-Cutting 2（快照体积不增，本 plan Phase 2 即其机器化）与 Cross-Cutting 6（门禁棘轮：新门禁入 CI 后只增不减）；③RM-9 plan Deferred 两条目的登记与 successor 指向（本 plan 即其承接，编号由「RM-13 候选」顺延为 RM-14——RM-13 已被 data 族行键项占用）。

## Current Baseline（live 核对 2026-10-16，HEAD c135a421b）

- **A8 四载体实况**：
  - `TemplateNode.type: S['type']`（`node-identity.ts:138` 附近）——生产码**零读取**；编译写入两处：成功路径 `node-compiler.ts:566`（`type: schema.type`，与 `rendererType: renderer.type` 同值）+ 失败路径 `node-compiler-helpers.ts:55/59`（`type: input.schema.type` 与 `rendererType: compileFailureRenderer.type` **分叉**）。
  - `TemplateNode.rendererType: string`——**活载体**：nop-debugger 组件检查器（`controller-component-inspector.ts:96-98/412-425`）、诊断查询（`diagnostics-core.ts:128/270`）、playground 性能页（`performance-table/runtime.tsx:282/295`）。
  - `CompiledRendererContract.type: S['type']`（`compiled-renderer-contract.ts:28`，写入 `:66` `type: definition.type`）——生产码零读取；语义 = 生效渲染器类型（失败路径为 `compileFailureRenderer.type`），是 `rendererType` 的副本。
  - `TemplateNode.schema: S`——**活载体**（RM-7 后的规范 schema 拷贝），其 `.type` 即作者类型；`type` 成员与之同值（两路径皆是），故 `type` 对 `schema.type` 是**便利访问点**而非唯一信息源；但对 `rendererType` 是**分叉信息源**。
- **A8 文档现状**：`docs/architecture/template-instantiation-and-node-identity.md` 的 `TemplateNode` 成员表记载 `type: string` 与 `rendererType: string`（`:85`/`:88`）但**无分叉语义说明**；RM-13 owner doc（`table-row-identity…`）已有「Vocabulary split」注先例可循格式。
- **§5.3 现状**：Cross-Cutting 2 为政策约束，无机器门禁；RM-9 registry 条目承载。编译入口：`createSchemaCompiler({ registry }).compileNode(schema, { path, renderer })`（`schema-compiler.ts:224`），返回 TemplateNode（含 `propsProgram`/`metaProgram`/`eventPlans`/`regions`/`compiledSources` 等）；既有测试用合成 fixture definition + `compileNode`（`schema-compiler-schema-definition-compile.test.ts:40-47` 先例）。
- **基线验证**：HEAD c135a421b = RM-13 收口提交；data/form-advanced/basic/compiler 等范围包五门禁绿。全仓红（playground vite.config 栈深、xlang-debug build/test）属并行会话已提交工作，与本 plan 无关（RM-13 收口已归因披露，范围口径先例）。

## Goals

- **A8 文档化**：`docs/architecture/template-instantiation-and-node-identity.md` 的 `TemplateNode` 成员表处落字 `type`（作者声明类型，失败路径与 `rendererType` 分叉）与 `rendererType`（生效渲染器类型，诊断/工具链活载体）的语义分工； RM-9 plan 的 A8 Deferred 条目就地更新为「已裁定保留 + 文档化，successor 结案」。
- **§5.3 机器门禁**：新增 `packages/flux-compiler/src/compiled-snapshot-size.test.ts`——固定代表性 fixture（多节点、含 props/events/regions/validation 的 page 片段），编译后序列化产物（剔除函数值的 JSON）字节数 ≤ 基线常量；基线只许随有意变更上调并在提交信息说明（棘轮协议）。
- **两条 RM-9 Deferred 就地结案**：RM-9 plan 的 A8 条目（改判保留+文档化，successor 结案）与 §5.3 条目（已机器化，指向新门禁）就地更新。
- **收口验证**：flux-compiler 包测试全绿（含新门禁）+ 全仓五门禁范围口径 + 判别变异自证（快照门禁：向 fixture 加一个会使产物增长的字段 → 红 → 恢复 → 绿）。

## Non-Goals

- **不删除任何 `type` 成员**（`TemplateNode.type`、`CompiledRendererContract.type` 均保留——本 plan 的核心裁定即「不删」）；不改任何运行时行为。
- 不做全量页面编译快照（fixture 为代表性问题样张，非全 registry 语料）；不做快照体积的跨版本对比存储（仅单基线上限棘轮）。
- 不动历史面 docs；不新增 roadmap 终态条目（RM-14 为 RM-9 Deferred 收尾，不改变终态六条）。
- e2e 不适用（纯文档 + 编译期测试）。

## Scope

### In Scope

- `docs/architecture/template-instantiation-and-node-identity.md`（`TemplateNode` 成员表处分叉语义注）。
- `docs/plans/611-rm9-residue-scan-plan.md`（Deferred 两条目就地结案更新）。
- `packages/flux-compiler/src/compiled-snapshot-size.test.ts`（新门禁）。
- roadmap RM-14 增补 + 状态流转；daily log。

### Out Of Scope

- 删除 `type`/`component.type` 成员（本 plan 裁定保留）；`schema.type` 相关通道；e2e；历史 docs。

## Failure Paths

不适用：纯文档 + 新增编译期测试；测试自身不稳定风险由「固定 fixture + 确定性序列化」控制（无时间/随机因素）。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——Phase 2 的交付物本身就是自动化门禁（快照字节预算）；其判别性由判别变异自证承载（向 fixture 注入增长字段 → 门禁红 → 恢复 → 绿）。Phase 1 为纯文档，文档与 live 一致性由「分叉语义描述引用具体行号/文件」+ closure audit 抽验承载。

## Execution Plan

### Phase 1 - A8 语义文档化 + RM-9 Deferred 结案

Status: planned
Targets: `docs/architecture/template-instantiation-and-node-identity.md`、`docs/plans/611-rm9-residue-scan-plan.md`

- Item Types: `Fix`、`Decision`、`Proof`

- [ ] `template-instantiation-and-node-identity.md` 的 `TemplateNode` 成员表（`type: string` / `rendererType: string` 行）落字分叉语义注：`type` = 作者声明类型（编译失败路径保留原值，`node-compiler-helpers.ts:55/59` vs `rendererType: compileFailureRenderer.type`）；`rendererType` = 生效渲染器类型（诊断/调试工具链消费）；`component.type` 为 `rendererType` 的同值副本（RM-9/A8 裁定保留，见 RM-9 plan Deferred）；内部行身份等其余成员不受影响。
- [ ] RM-9 plan 的 A8 Deferred 条目就地更新：保留裁定 + 文档化落点 + successor 结案（「RM-13 候选」编号已顺延为 RM-14 即本 plan）。**改写带日期与指向注**（「2026-10-16 由 RM-14/plan 619 结案」），使历史条目自洽可读（R1 m6）。
- [ ] Proof：文档分叉描述与 live 代码逐点对应（行号引用可核）；RM-9 Deferred 更新后与 roadmap 状态一致。

Exit Criteria:

- [ ] 分叉语义注在案且行号可核；RM-9 A8 条目结案落字。

### Phase 2 - §5.3 快照体积机器门禁

Status: planned
Targets: `packages/flux-compiler/src/compiled-snapshot-size.test.ts`（新）

- Item Types: `Fix`、`Proof`

- [ ] 固定代表性 fixture：合成 registry（含 fields contracts：prop/event/region/validation 条目）+ 多节点 schema（page → 容器 → 叶子，含 events/regions/validation），经 `createSchemaCompiler().compileNode` 编译。
- [ ] 体积度量：`JSON.stringify(node, replacer省略函数值).length`（确定性、无时间/随机因素）；断言 ≤ 基线常量（基线 = 当前树实测值，写死于测试内 + 注明棘轮协议：合法增长须有意上调并在提交信息说明理由）。
- [ ] 判别变异自证：向 fixture 注入一个使产物增长的条目 → 门禁红 → 恢复 → 绿（实录）。
- [ ] Proof：门禁测试绿；变异自证实录在案。

Exit Criteria:

- [ ] 门禁测试在 flux-compiler 套件内绿；变异自证（红→恢复→绿）实录在案。

### Phase 3 - RM-9 Deferred 结案 + 验证

Status: planned

- Item Types: `Fix`、`Proof`

- [ ] RM-9 plan §5.3 Deferred 条目就地更新：已机器化，指向 `compiled-snapshot-size.test.ts`（棘轮协议注明）。
- [ ] flux-compiler 包测试全绿（focused 套件）。

Exit Criteria:

- [ ] RM-9 §5.3 条目结案落字；flux-compiler focused 套件绿（全量五门禁属 Closure Gates，不入本 Phase——Minimum Rule 18）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_e8cd3848（R1~R2，独立 fresh 子 agent，分叉实锤核验 + JSON.stringify 可行性核验 + roadmap 六处同步核验）
- Verdict: `pass`（R2 零 Blocker/零 Major，达成共识 → 升 active；1 条非阻塞 Minor：§5.3 日期指向注在执行 Phase 3 时按 Phase 1 同款格式落）
- Rounds: 2（R1 fail 0B/1M/5m → 修订；R2 pass）
- Findings addressed: M1=Phase 3 全量门禁撤出（Minimum Rule 18，改 focused 套件）；m1=Purpose 收紧（删 `type` 丢第一 class 便利访问点与并列对照，非信息本体丢失）；m2=Verdict 占位回词表；m3=roadmap Phase Details 补 RM-14 bullet；m4=Header 补共识审查记录指引（R2 通过后回填 Verdict/轮次）；m6=RM-9 Deferred 改写带日期指向注。

## Closure Gates

- [ ] A8 分叉语义注在案（owner doc + RM-9 Deferred 结案，行号可核）
- [ ] §5.3 机器门禁在案（fixture 字节预算 + 棘轮协议 + 判别变异自证实录）
- [ ] flux-compiler 套件全绿 + 全仓五门禁范围口径（含并行归因披露）
- [ ] roadmap RM-14 状态流转 + daily log 条目
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`（范围口径：flux-compiler 等 615 范围包 exit 0；全仓红=并行回归，归因披露）
- [ ] `pnpm build`（范围口径）
- [ ] `pnpm lint`
- [ ] `pnpm test`（范围口径）
- [ ] `pnpm check`
- [ ] e2e 意图声明与披露义务落字【e2e 不适用——纯文档 + 编译期测试，无渲染行为变更】

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- `component.type`（`rendererType` 的同值副本）若日后欲收缩，属公开类型面变更单独立项（本 plan 裁定保留）。
- 快照体积基线如需跨 fixture 扩展（多语料样张），在现门禁上追加用例即可。

## Closure

Status Note: （收口时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立 fresh 子 agent）
- Evidence: （task id / 核对摘要）

Follow-up:

- （收口时填写或写 no remaining plan-owned work）
