# 610 RM-8 公开 API raw-schema 通道按政策收口：保留通道钉面 + scanner 门禁

> Plan Status: completed
> Last Reviewed: 2026-10-16
> Source: `docs/backlog/renderer-metamodel-roadmap.md` RM-8；`docs/analysis/2026-10-15-renderer-definition-metamodel-review.md` §5.4 #7~#12；plan 602 裁决表（#7~#12 全契约保留）
> Related: RM-0 裁决表 owner 文档（renderer-runtime.md Runtime Schema-Retention Policy）；既有 scanner `scripts/audit/find-runtime-raw-schema-reads.mjs`

## Purpose

按 RM-0 裁决表执行 #7~#12 六公开通道的裁决值（全部"契约保留"）：钉文档（保留通道登记册，逐通道契约状态+守卫引用）+ 守卫（raw 读 scanner 门禁扩展到框架包 flux-react/flux-runtime，retained 通道以行级标记白名单，未登记 raw 读=红）。

## 授权链（保护区）

scanner 门禁属 `scripts/`（非保护区）+ flux-react/flux-runtime 读点标记注释（非行为面）。公开 API 零增删（纯钉面）。人工授权链：**用户 goal 指令（2026-10-15）四要素**（同 603-609）。roadmap RM-0 行："RM-8 范围钉定=保留通道钉文档+scanner 门禁"。

## Current Baseline（live 核对 2026-10-16，HEAD 33c25e9e3）

- **scanner 现状**：`scripts/audit/find-runtime-raw-schema-reads.mjs`（`runtimeRawSchemaReadRules`，rules.mjs:502-585）include 覆盖 renderer 包+code-editor+nop-debugger，**不含 flux-react/flux-runtime**（RM-5 audit 证伪记录在案）；模式=`templateNode.schema`/`props.schema`/`as TemplateNode).schema`/`as BaseSchema).schema`；`filterMatch` 已有豁免逻辑（useSchemaProps/normalize/variant-field 白名单）。当前 hits=3（flux-renderers-data echarts-renderer.tsx:76,77、flux-renderers-industrial scada-editor-canvas:79）——未登记、scanner 不在 `pnpm check` 链（package.json:31 独立脚本）。
- **框架包盘点（live 实测 2026-10-16，R1 M1 scanner 引擎口径勘正）**：flux-react/src+flux-runtime/src = **3 文件 9 处 scanner 可见命中**，全部为 retained 通道读取——①`node-renderer-resolved.tsx:384` `schema: templateNode.schema`（#7 便利投影组装本体）；②`schema-renderer.tsx:92,125` 编译输入（#1 根载体+#12 imports 准备）；③`schema-renderer.tsx:394-395,425,460,481` collectSchemaImports/prepareSchema 及其依赖数组/向下透传（#12+#1）；④`use-node-debug-data.ts:34`（#6 调试通道）。flux-runtime/src 零命中。`:156` 为注释行——既有 filterMatch 的注释感知 getCodeTextForLine 本已豁免（scanner 实测无 :156），**无需改写**（初稿"改写消解假命中"前提错误）。
- **渲染器包既有 hits=3**：echarts-renderer.tsx:76,77（`props.schema(.|?)?.events`，#7 家族用法）、scada-editor-canvas:79（`props.schema as ScadaEditorCanvasSchema`，#7）——同为保留通道使用。
- **RM-7 后状态**：name/modalContainer 两内部读已迁移（#2/#3 Migrated），不在本盘点内。
- 基线验证：HEAD 33c25e9e3 五门禁全绿（RM-7 收口提交）。**验证 provenance（audit m4）**：本 plan 五链绿实测于含并行会话改动的共享工作树（含 RM-9/词汇会话 9 个非本 plan 文件；受影响包 typecheck/test 均 cache miss 实跑，scanner 全树扫描不受并行改动掩盖）；收口提交严格限定本 plan 路径清单。并发 RM-9 在途（roadmap 混合脏，hunk 级 staging）。

## Goals

- 行级标记约定：`// raw-schema: retained(#N)`——scanner `filterMatch` 对含标记行豁免；12 处 scanner 可见命中全部按裁决表编号标注（9 框架+3 渲染器）。
- scanner include 扩展 flux-react/src+flux-runtime/src；scanner 入 `pnpm check` 链；未标记 raw 读=红（判别：临时加未标记读→红→恢复）。
- docs 保留通道登记册（renderer-runtime.md Retention Policy 节增 subsection：#7~#12 逐通道契约状态+守卫引用+标记约定说明+**守卫覆盖边界**——4 pattern 仅覆盖 schema 读形[#1/#6/#7/#12 面]；#8/#9/#10/#11 raw 入参调用点 scanner 不可见，全族覆盖属 RM-9）。

## Non-Goals

- 不迁移任何 retained 读取（裁决即保留）；不动 #1~#6 已收口行；不改 scanner 既有 renderer 包规则与豁免（仅 additive include+filter）。

## Scope

### In Scope

- `scripts/audit/rules.mjs`（include 扩展+filter 豁免标记）、`scripts/audit/find-runtime-raw-schema-reads.mjs`（**B1：入口 exit 语义**——results>0 → 打印+exit 1，零命中 → 0；不得改共享 runScanner[其余 ~12 个 advisory scanner 依赖 exit 0]）、flux-react 三文件（9 处标记）、flux-renderers-data/industrial 两文件（3 处标记）、`package.json`（check 链挂载）、`scripts/__tests__/find-runtime-raw-schema-reads.test.ts`（M2：positive 用例适配 exit-1 语义+新 include 域 fixture 扩展）。
- renderer-runtime.md Retention Policy 节增 "Retained channel register" subsection。
- 判别测试（scanner 既有回归套件 `scripts/__tests__/find-runtime-raw-schema-reads.test.ts` 适配扩展+新 include 域 fixture，见 In Scope）+ roadmap 状态流转 + daily log。

### Out Of Scope

- RM-9；迁移任何 retained 读点；scanner 规则重构。

## Test Strategy

档位选择：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**——门禁本身即判别器械。红腿=临时插入未标记 `props.schema` 读→scanner 红→恢复绿（实录）；绿腿=全链 check 含新挂载 scanner exit 0。

## Execution Plan

### Phase 1 - 标记+scanner 扩展+门禁挂载

Status: completed
Targets: rules.mjs、flux-react 三文件、flux-renderers-data/industrial 两文件、package.json

- Item Types: `Fix`、`Proof`

- [x] Proof 先行（判别器械就位）：入口脚本 exit 语义改造（B1）——初版误用 runScanner（返回 void，B1 即此缺口本体）→ 改调 scanFilesWithRules+printResults 原语 + results>0→exit 1；红腿实录（use-node-debug-data 插未标记读→exit 1→恢复 sha 6fd7e9c5→exit 0）；测试适配=runGate 捕获 exit code+断言 exit 1/hits（4 用例：comment-negative exit 0/as-cast-positive exit 1/新 include 域 flux-react 未标记 exit 1/标记 exempt exit 0，fixture 置于 `<pkg>/src/__raw_schema_fixture__` 使新 include 命中）。
- [x] scanner：include 增 `/flux-react/src/` 与 `/flux-runtime/src/`（execution note：首版编辑漏包裹括号致 `&&` 守卫仅作用于首分支——12 hits 实测暴露后修正）；filterMatch 首行增 `raw-schema: retained(#` 豁免。
- [x] 12 处 retained 读点标注（9 框架[#1×3/#6×1/#7×1/#12×4]+3 渲染器[#7]），scanner 归零（No suspect matches, exit 0）。
- [x] package.json `check:` 链挂载（knip-baseline 与 designer-conformance 之间；json 校验通过）。
- [x] 全链五门禁 exit 0（`_tmp/rm8-closure-gates.log`，scanner 入链后 check 零新增红）。

Exit Criteria:

- [x] scanner 扩展后全仓零未标记命中（exit 0）；check 链含 scanner 且五链绿；红腿+测试 4 用例实录在案。

### Phase 2 - docs 登记册 + 收口

Status: completed

- Item Types: `Fix`

- [x] renderer-runtime.md Retention Policy 节增 "Retained channel register"（含 #1/#6/#7/#12 行[实标通道]、标记约定、守卫覆盖边界声明——4 pattern 仅读形，#8-#11 raw 入参属 RM-9）。
- [x] roadmap 状态流转 + daily log（10-16.md 追加，随本提交）。

Exit Criteria:

- [x] 登记册与 live 一致；daily log 落字。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立 fresh 子 agent 填写。

- Reviewer / Agent: agent_f0c25856（独立 fresh 子 agent，scanner 同款引擎实跑交叉验证）
- Verdict: `pass`（R1 fail 1B/2M/4m → 修订 → R2 fail 1M 残留[Gates :95 "13 处"计数未同步] → 修正 → 按 R2 意见直接对账达 active 门槛）
- Rounds: 2
- Findings addressed: R1 B1=scanner 入口 exit 语义缺口（现报 3 hits 仍 exit 0，共享 runScanner 无退出码——entry 改 sibling-gate 语义 results>0→exit 1，不得改共享 runScanner）；M1=框架包盘点 10→9 处勘正（:156 注释行本被 getCodeTextForLine 豁免；补 :460/:481 漏列）；M2=既有测试套件 find-runtime-raw-schema-reads.test.ts 记入（positive 适配 exit-1+新 include 域 fixture）；m1=echarts:76 补列；m2=rules.mjs :502-585；m3=守卫覆盖边界声明（4 pattern 仅读形，#8-#11 全族属 RM-9）；m4=Proof 先行+Follow-ups 节补齐。R2 残留=Gates 计数 13→12+两处顺手（已修）。

## Closure Gates

- [x] 12 处标记落位（9 框架+3 渲染器）且 scanner 零未标记命中
- [x] scanner 扩展（include+filter）且 check 链挂载、红腿实录在案（scanner 归零 exit 0；红腿 exit 1→恢复 exit 0；测试 4 用例）
- [x] 全仓 typecheck/build/lint/test 全绿 + check 零新增红（scanner 挂载后；五链 exit 0）
- [x] 登记册 docs 与 live 一致（裁决表后 subsection+#7~#12 行+覆盖边界）
- [x] roadmap RM-8 状态流转 + daily log 条目（随本提交 hunk 级 staging）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_f461dc8b，R1 approved 0B/0M/5m；m1 频道计数勘正/m3 挂载点措辞/m4 provenance 披露/m5 标记编号校验 follow-up——均随回写落地；m2 由本轮 dev log 落字满足）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`
- [x] e2e 不重跑之披露义务已在本表与提交信息落字

## Deferred But Adjudicated

（无——执行中如有推翻/改判，当场落本节）

## Non-Blocking Follow-ups

- #8/#9/#10/#11 raw 入参调用点的全族守卫覆盖：RM-9 启发式扫描范围裁定。
- 豁免标记编号有效性校验（audit m5：`retained(#99)` 亦被豁免，机器层不校验编号——标记本身即显式评审信号，风险低）：并入 RM-9 规则族评估。

## Closure

Status Note: RM-8 两件交付全部落地——①保留通道钉面：renderer-runtime.md 增 "Retained channel register"（#1/#6/#7/#12 实标行+标记约定+守卫覆盖边界声明[4 pattern 仅读形，#8-#11 raw 入参属 RM-9]）；②守卫：`check:audit-runtime-raw-schema-reads` 入口改 enforcement 语义（scanFilesWithRules+printResults 原语，results>0→exit 1——runScanner 返回 void 即 plan B1 缺口本体）、include 扩展 flux-react/src+flux-runtime/src、`raw-schema: retained(#N)` 行级豁免；12 处 retained 读点标注（9 框架+3 渲染器）；scanner 入 `pnpm check` 链（knip-baseline 与 designer-conformance 之间）。判别：红腿实录（未标记读→exit 1→sha 6fd7e9c5 恢复→exit 0）+测试 4 用例（comment-negative/as-cast-positive/新域未标记/标记 exempt）；audit 独立变异复现。全链五门禁 exit 0（16,538 passed）；e2e 未重跑（提交披露）。**RM-0 裁决表 #7~#12 六通道全"契约保留"的落地形态至此完备：钉面（登记册）＋守卫（scanner 门禁）**。

Closure Audit Evidence:

- Auditor / Agent: agent_f461dc8b（独立 fresh 子 agent，R1 approved 0B/0M/5m；m1=Phase 1 标记频道计数转置勘正、m3=挂载点措辞勘正、m4=验证 provenance 披露（共享脏树上测得）、m5=标记编号有效性校验记入 follow-up——均随回写落地；m2=dev log 条目由收口提交落字）
- Evidence: 入口 exit 语义亲跑（No suspect/exit 0）；12 处标记逐处核对（行+编号）；测试 4/4 亲跑；advisory scanner 抽 3 个 exit 0 亲证（runScanner 未污染）；独立变异（植入未标记读→exit 1→清除→exit 0）；登记册逐行与 live 吻合；误报抽查 4 处语义真 retained；门禁日志 16,538 passed/0 FAIL 亲核（受影响包 cache miss 非缓存）

Follow-up:

- 豁免标记编号有效性校验（m5）：并入 RM-9 规则族评估。
- 其余：no remaining plan-owned work。
