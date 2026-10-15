# 606 RM-4 fields+propContracts 合并·阶段二：全量迁移 + 旧形态删除

> Plan Status: completed
> Last Reviewed: 2026-10-15
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-4；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` A2；plan 605（阶段一，completed）
> Related: Cross-Cutting 3（过渡期双读，阶段二收口后旧形态必须删除——本 plan 即该收口）

## Purpose

把现存 `propContracts` 双写声明全量机械迁移为 RM-3 内联形态（`fields[].contract`），随后删除旧形态（`RendererDefinitionShape.propContracts` 字段 + helper 权威底座分支），终结双声明通道。迁移前后每个 renderer 的 contract 视图逐字节等价（结构等价验证），coverage/finite-prop-contracts 门禁适配，flux-guide 同步。

## 授权链（保护区）

flux-core（Shape 字段删除）+ renderer definition fields（全量声明改写）+ schema/contract validation（门禁脚本适配）均 plan-first ✓ 本 plan 即载体。公开导出面**收缩**：`RendererDefinitionShape.propContracts` 字段删除（RM-4 明文授权："旧形态与双读分支删除"）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 plan 603-605；CX-20 先例）。

## Current Baseline（live 核对 2026-10-15，HEAD c94ca8ce7）

- **双形态并存**：RM-3 后 `fields[].contract` 新形态全消费面生效（`resolveRendererPropContracts` 集中双读：propContracts 权威底座 + 内联补充）；66/41 双写声明原样未动（零迁移）。
- **迁移面清点（live 实测 2026-10-15，R1 M-1 口径勘正——声明口径与提及口径分列）**：
  - **声明文件（机械映射对象）84 = 生产 47 + 测试 37**：生产 47 = flux-renderers-\* 41（roadmap 口径精确）+ 跨包 5（flow-designer-renderers/flux-code-editor/spreadsheet-renderers/report-designer-renderers/word-editor-renderers 各 1）+ flux-compiler `schema-compiler-registry-fixtures.ts` 1；测试声明 37（`.test.*`/`__tests__`/test-support 内含 `propContracts:` 声明字面量）。
  - **只读消费位 ~24 文件**（引用 propContracts 符号/类型但无声明字面量）：Phase 3 删字段时由 `pnpm -r --no-bail typecheck` 直跑枚举兜底（非机械映射对象，改读点即可）。
  - 附带面：flux-guide 5 文件（README/07-structural-nodes/schema.d.ts 生成产物/generate-types.mjs:132,158 生成逻辑/shared.mjs）+ 2 门禁脚本（check-schema-prop-coverage.mjs:199 提取分支 + :210 propSchema 死分支顺手删[R1 m-3]；check-finite-prop-contracts.mjs 锚定块——**R1 M-4 勘误：实为 8 项检查/7 渲染器面**：button.variant+size、tabs.orientation+variant、form.mode+labelAlign、table ownership 四键、crud ownership、crud.pagination.mode、dialog/drawer.size、report-toolbar.intent，非'三渲染器'）。
- **机械映射（RM-4 Phase Details："同 key 的 propContracts 元数据吸收进字段条目"）**：
  1. key K 同时在 fields（kind 'prop'）与 propContracts：把 propContracts[K] 对象整体挂为该 fields 条目的 `contract: <原对象>`；
  2. key K 仅在 propContracts：新增 fields 条目 `{ key: K, kind: 'prop', contract: <原对象> }`（保持 propContracts 声明顺序插入 fields 尾部或邻近位）；
  3. **shared spread 形态**（如 form 的 `propContracts: { ...formFieldContracts, ...xxx }` + `fields: [...formFieldRules]`）：共享模块的每条 rule 增 `contract: formFieldContracts.K` 引用（对象引用共享，非拷贝）；共享 contract 模块类型注解 `Record<string, RendererPropContract>` → `Record<string, RendererFieldContract>`（结构兼容）；
  4. `RendererPropContract` 中仅 `displayName` 必填、`RendererFieldContract` 仅 `shape` 必填——现存 propContracts 条目恒有 shape，吸收恒可构造。
- **等价性保证链（R1 m-1 口径勘正）**：迁移前 helper 底座 spread 保对象引用；迁移后 helper 对 fields contract **重建输出对象**（引用不保、键序固定）——故等价判据为 **JSON 层逐字节等价**（递归键排序的规范化 stringify[R1 m-2]；undefined 值键被 stringify 省略、displayName 迁移条目恒携带故无缺省化漂移），非 605 的"三层恒等"口径。删除底座后 helper 退化为 fields 单源。
- **contract-honesty 零改动裁定（R1 M-5 显式记载）**：roadmap RM-4 点名"contract-honesty 适配"——live 亲证 `contract-honesty.ts:439-445` 只读 `eventContracts` 与 `fields`、**不读 propContracts**（RM-3 零改动集第 4 项裁定延续），本 plan 无需适配、零改动。
- **strict 语料纳入验证链（R1 M-5）**：roadmap 复用节点名 validate-pages --strict——Phase 2 迁移后跑 `page-schemas-validation.test.ts`（playground 44 用例 strictMode 全语料；CLI 独立跑有既有 exit 2，以测试形态承载，plan 604 同口径）。
- **门禁现状**：`check-schema-prop-coverage.mjs:199` propContracts 提取分支（迁移后死分支→删）；`check-finite-prop-contracts.mjs` regex 锚旧形态块、**8 项检查/7 渲染器面**（迁移后必失配→8 项逐项重锚）；`apps/playground/src/renderer-prop-coverage-audit.test.ts` 经 live registry 消费（自动）。
- 基线验证：HEAD c94ca8ce7 五门禁全绿（RM-3 收口提交）。并行会话 RM-9 在途（roadmap/dev log 混合脏，收口提交 hunk 级 staging）。

## Goals

- 全部 `propContracts` 声明（生产+测试+fixture）按机械映射迁移为 fields 内联 contract；迁移前后 `resolveRendererPropContracts` 输出逐 renderer 逐字节等价（快照 diff 零差异）。
- 旧形态删除：`RendererDefinitionShape.propContracts` 字段、helper 权威底座分支、`check-schema-prop-coverage.mjs` 死分支；全仓生产+测试 `propContracts:` 声明归零（docs/历史文本除外）。
- 门禁适配：finite-prop-contracts 重锚 contract 块（editorType 断言保义）；coverage 扫描器单分支化。
- flux-guide 同步（README/07/schema.d.ts 生成器重跑）+ docs（renderer-runtime/quick-reference/renderer-interfaces 过渡期表述改单源终态）。

## Non-Goals

- 不动 eventContracts/scopeExportContracts/injectedLocals（RM-5/6）；不改任何校验语义（迁移 = 结构重排，行为面零变更，无判别变异义务[roadmap 行为面列表 RM-4 在列——但本 plan 的"行为"由结构等价快照承载，见 Test Strategy]）。
- 不动 fields 既有编译语义成员（kind/regionKey/params/...）；不改 `RendererPropContract` 类型本体（helper 返回与 authoring 面仍用）。

## Scope

### In Scope

- 84 声明文件迁移（生产 47 + 测试 37；两轮子代理清扫，RM-1 先例）+ ~24 只读消费位（Phase 3 typecheck 直跑枚举兜底）。
- flux-core：Shape.propContracts 删除 + helper 底座分支删除 + helper 单测更新（恒等组改为"无 propContracts 输入"语义）。
- 门禁脚本：check-schema-prop-coverage.mjs 分支删除、check-finite-prop-contracts.mjs 重锚。
- flux-guide：generate-types.mjs/shared.mjs 适配 + schema.d.ts 重生成 + README/07 文档同步。
- docs：renderer-runtime.md Coverage Discipline（单源终态）、quick-reference、renderer-interfaces。
- 结构等价快照（\_tmp 前后 diff，判别基建不入库）+ roadmap 状态流转 + daily log。

### Out Of Scope

- RM-5~RM-9；fields 声明风格的进一步归一（spread 结构保留）；e2e。

## Failure Paths

不适用：结构重排零行为。风险（漏迁/错挂 key）由"删除字段后 typecheck 全仓枚举归零 + 快照零差异 + 五链"三重兜底。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——RM-4 在 roadmap 行为面列表。判别承载=**结构等价快照**：迁移前对全部注册 renderer dump `resolveRendererPropContracts` JSON 快照，迁移后重跑 diff 必须零差异（旧实现下必然有差异——凡迁移错挂/漏挂即 diff 非零），这是"旧实现下必红"的判别测试形态；辅以既有 570+706 回归与五链。

## Execution Plan

### Phase 1 - 结构等价快照基建（判别基建）

Status: completed
Targets: playground 临时探针测试（不入库）+ `_tmp/rm4-pre-snapshot.json`

- Item Types: `Proof`

- [x] 临时探针测试（playground，验后删除）：显式 import **全部 ≥20 个 register 入口**（15 个 flux-renderers register 含 `@nop-chaos/flux-renderers-industrial/editor` 子路径与 form-advanced/3d/graph/industrial/map/pivot[先例 coverage-audit 只 import 9 个，不足] + 5 个跨包 register：flow-designer/code-editor/spreadsheet/report-designer/word-editor），汇总全部 definition，dump **递归键排序的规范化 JSON**（R1 m-2）`resolveRendererPropContracts(d)` 与 `resolveRendererAuthoringContract(d).editableProps` → `_tmp/rm4-pre-snapshot.json`。
- [x] 判别力自证（R1 M-2）：清扫子代理执行变异（改 3d `scene.displayName`）→ 复跑快照 diff **非零**（两视图各 1 处）→ 恢复 → diff 归零，实录在案。

Exit Criteria:

- [x] 快照落盘（`_tmp/rm4-pre-snapshot.json`/`_tmp/rm4-snapshot.json`）覆盖 **155 renderer**（探针 21 register 入口汇总，>50 门通过，集合与迁移文件清单对账）；探针可重复运行（前后各 ≥3 次复跑）；判别变异自证实录在案。

### Phase 2 - 生产声明全量迁移（47 文件）

Status: completed
Targets: flux-renderers-\* 41 文件 + 跨包 5 文件 + flux-compiler registry-fixtures 1 文件（声明口径，R1 M-1）

- Item Types: `Fix`

- [x] 子代理清扫（机械映射 1/2/3 三形态）：53 生产文件全量（47 计划对象 + 4 共享支持模块 + wizard 拆分新文件[oversized 消解]）——双写挂载约 40 文件、only-key 补条目（compiler fixtures/validate/echarts·editor events ignored 条目共存[classifyField 首匹配保 ignored，快照零差异背书]）、shared spread 改 per-key 引用（form 家族 `formFieldContractRules` 共享变体、basic 5 共享模块、surface 11 条目按渲染器下沉[同 key 不同值特例]）。铁律遵守：contract 对象逐字同源、零运行时语义改动。
- [x] 快照复跑 diff 零差异（155 renderer 规范化 JSON 逐字节等价）。
- [x] flux-compiler 570/570 + flux-core 706/706 focused 绿；strict 语料 `page-schemas-validation.test.ts` 绿；另抽验 form 1125/1125 + data 1231/1231（大迁移包）。

Exit Criteria:

- [x] 生产 `propContracts:` 声明归零（grep 判别；唯一字面残留=node-fields 局部参数名，Phase 3 改名 `contracts` 后全仓归零）。

### Phase 3 - 旧形态删除 + 测试面迁移（37 声明文件 + ~24 只读消费位）

Status: completed
Targets: `packages/flux-core/src/types/renderer-definition-types.ts`、`renderer-prop-contracts.ts`、`packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts:50`（R1 M-3 补列：getAcceptedSchemaKeys 旧形态分支删除，accepted 并集语义经映射规则 2 补条目保持）、测试面声明文件

- Item Types: `Fix`

- [x] 删 `RendererDefinitionShape.propContracts` 字段；删 helper 权威底座分支；helper JSDoc 改单源终态；恒等组单测改写为 fields-only 语义（同键首现胜出钉，断言等强）。
- [x] `pnpm -r --no-bail typecheck` 直跑枚举残余（77 错/31 文件+9 cast 掩蔽文件）→ 测试面子代理清扫（AST codemod+手工收尾：34 声明文件+2 读点文件+9 掩蔽文件+3 特殊位）→ 归零；node-fields 局部参数名 propContracts→contracts（grep 字面归零）。
- [x] flux-guide：generate-types.mjs 改经 `shared.mjs#loadFluxCore()` 取 helper 视图、shared.mjs 注明 resolved view、重建 dist 后重新生成 schema.d.ts（propContracts 计数 0）+ README/07 单源表述。

Exit Criteria:

- [x] 全仓 src+apps `propContracts:` 声明归零（grep 判别=0）；`pnpm -r typecheck` exit 0（`_tmp/rm4-p3-typecheck2.log`）；flux-guide schema.d.ts 无 propContracts。

### Phase 4 - 门禁适配 + docs 终态 + 收口验证

Status: completed
Targets: `scripts/check-schema-prop-coverage.mjs`、`scripts/check-finite-prop-contracts.mjs`、docs 三处

- Item Types: `Fix`、`Proof`

- [x] check-schema-prop-coverage.mjs：propContracts 提取分支删 + :210 propSchema 死分支删（fields 单分支，fields key regex 对规则 2 新增条目照常命中）。
- [x] check-finite-prop-contracts.mjs：**全部 8 项检查逐项重锚**（锚 `key:'X'`+editorType 断言保义，逐项 node 预验 MATCH，零断言丢弃）——由 Phase 2 清扫代理完成（7 项失配现场重锚），Phase 4 复核确认。
- [x] docs 三处终态化（renderer-runtime Coverage Discipline 单源段/quick-reference/renderer-interfaces）。
- [x] 全量五门禁（五链 exit 0，`_tmp/rm4-closure-gates.log`）+ `pnpm check`（两门禁脚本在链上；knip 2 新红消解=upload-schemas 双常量去 export）。

Exit Criteria:

- [x] 两门禁脚本在 `pnpm check`/`pnpm lint` 链绿且 **8/8 检查语义保持、零断言丢弃**；docs 与 live 单源终态一致；五门禁全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_668d1ad8（独立 fresh 子 agent，计数口径 live 复算 + 门禁脚本亲读）
- Verdict: `pass`（R1 fail 0B/5M/3m → 修订 → R2 fail 1M 残留[Scope :50 旧计数未同步] → 修正 → R3 pass 0B/0M）
- Rounds: 3
- Findings addressed: R1 M-1=迁移面计数混合口径（勘正 84=生产 47+测试 37+只读 ~24 分列，含 Scope 残留行 R2 收口）；M-2=快照探针钉死 ≥20 register 入口+递归键排序+判别变异自证+集合对账；M-3=Phase 3 补 shape-validation-utils.ts:50；M-4=finite-prop-contracts 勘误 8 项检查/7 渲染器面+exit 改 8/8 零断言丢弃；M-5=contract-honesty 零改动裁定落字（:439-445 live 证据）+strict 语料 44 用例入 Phase 2 链；m-1/m-2/m-3=JSON 层等价口径+递归排序+:210 死分支顺手删。执行备注：判别自证可在迁移前对旧形态声明变异达到同等效力（时序交错非阻塞）。

## Closure Gates

- [x] 全量迁移完成且结构等价快照 diff 零差异（155 renderer 三次 diff 逐字节零差异；判别变异自证双重独立执行）
- [x] 旧形态删除（Shape 字段+helper 底座+utils 分支+coverage 死分支）且全仓声明归零 grep 判别=0 在案
- [x] 门禁脚本适配且 check/lint 链绿、finite-prop-contracts 8/8 语义保持零断言丢弃（audit 亲读逐项对照）
- [x] flux-guide schema.d.ts 重生成（propContracts=0）且文档同步（6 文件——audit m1 勘正：原计划写 5，index.ts 同生成器产物）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红 + 契约门禁零豁免新增（audit 亲核 16,533/0/43 包）
- [x] docs 与 live 单源终态一致（closure audit M2 三处周边清残后复验）
- [x] roadmap RM-4 状态流转 + daily log 条目（hunk 级 staging 随本提交）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_2bcd8d11，R1 issues 2M/3m 有条件批准 → M1 coverage 双死分支实际删除 + M2 docs 三处周边清残 → 复验 lint/coverage/finite 全绿后批准）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（e2e 不重跑，本条与提交信息披露）

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- `RendererPropContract` 类型在 helper 返回/authoring 面继续使用；若 RM-5/6 后出现更单一载体，另议。

## Closure

Status Note: RM-4 三件交付全部落地——①84 声明文件全量迁移（映射三形态，contract 对象逐字同源）；②旧形态五处全删（Shape 字段/helper 底座/utils 分支/coverage 双死分支/finite-prop-contracts 重锚），全仓 src `propContracts:` grep 归零；③结构等价快照 155 renderer 三次 diff 逐字节零差异（判别力变异自证双重独立执行）。closure audit 首轮 issues 2M/3m（M1=coverage 死分支 [x] 失实、M2=docs 周边旧口径残留）已全部修复并复验（lint/coverage/finite 三脚本重跑绿），批准后回写。生产声明 53=47 声明+4 共享+wizard 拆分（audit m3 口径注记）。五链 exit 0（16,533/0/43 包）；e2e 未重跑（结构重排零行为，判别由快照承载）。RM-5 承接事件契约单源化。

Closure Audit Evidence:

- Auditor / Agent: agent_2bcd8d11（独立 fresh 子 agent，R1 issues 2M/3m 有条件批准；M1/M2 修复后复验通过）
- Evidence: 快照零差异亲跑（sha256 f22405e6 双份一致）+ 变异亲证（displayName→恰两视图各 1 处→sha256 3c3690bd 恢复）；crud 31/31 + spreadsheet 4/4 逐字同源比对；finite-prop-contracts 8/8 逐项新旧对照+直跑 exit 0；三删位点 git show HEAD 对照；范围纪律亲证（RM-9 路径零交集）；门禁日志 80 处 "failed" 逐一甄别=0 真实失败

Follow-up:

- src 内注释残留旧概念（inspector-schema.ts/node-compiler.ts:339 等，audit m2）：RM-5/6 前顺手项，非阻塞。
- 其余：no remaining plan-owned work。
