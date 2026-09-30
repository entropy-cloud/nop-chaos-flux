# CQ-4 跨包重复与衍生实现收敛（3d/industrial/form-advanced/report/spreadsheet）

> Plan Status: completed
> As-Built Note: Phase 1 已随 d4cfa6c5c(docs)+ed9cbf8af(code) 落地（0813a100d 为拆分前的 reflog 悬挂号,不可达,audit Minor-1 勘误）;Phase 2 组合 API 落于 flux-core value-adapter(createActionBackedAdapter,actionAdapter 保持原实现并在 plain-schema 路径被组合体复用——委托式统一尝试曾引发递归与 payload 偏差,已回退为并行双实现,core 内 56L 结构性相似记为 residual);Phase 4 经 live 勘察后裁定收缩(见该 Phase 回填)
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-code-quality-round1-deep-analysis.md`（CQ-D2、D3、D4、D15；D11/D13 defer 裁定见报告第五节）+ 首轮独立评审 live 勘误
> Related: `docs/plans/2026-09-30-cq-2-core-shared-primitives-plan.md`（其 Phase 2 承接 host-action-provider 粘合层对，本 plan 不依赖其落地）

## Purpose

收敛四组**跨包**重复：3d↔industrial 的 flux-eval 双实现、flux-core value-adapter 的 form-advanced 近重写、industrial 包内编辑器/运行时双线、report↔spreadsheet 的衍生复制。核心约束：包间禁止横向依赖，共享代码必须落在双方共同依赖的下层包（flux-core / flux-react / spreadsheet-core）。

## Current Baseline

- `flux-renderers-3d/src/binding/flux-eval.ts`(160L) ↔ `flux-renderers-industrial/src/binding/flux-eval.ts`(111L)：2 clones 83L（评审时工具实测）；克隆核心（快照 scope + 容忍 Proxy probe）逐字同文且**不含 primitive 谓词**——industrial 的 `isScadaPrimitive` 收口点全在其自有文件（binding/refresh-pipeline.ts:277、renderer/hooks/use-scada-points-bridge.ts:373、use-scada-handles.ts:107），3d 的宽松语义全在其自有导出（analyzeBindingSubscriptions 等）。域差异可经策略参数干净分离。
- `flux-core/src/value-adapter.ts`(390L) ↔ `flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`(363L)：3 clones 78L（评审实测）；detail-field.tsx/detail-view.tsx 另有编译/确认序列克隆。**i18n 接缝**：flux-core `toValidationIssues`（value-adapter.ts:99-107）输出英文 message + cause；form-advanced helper（:147-157）输出 `t('flux.form.validationFailedDetail',…)` 本地化 message 无 cause——两条用户可见行为各自成立。flux-core **零依赖**（flux-i18n 依赖 flux-core，反向边=循环依赖，depcruise no-circular），**组合 API 不得吸收 t() 调用**，message 格式化必须是注入点。
- industrial 包内：`findNodeById` 三处逐字同文（config-adapter.ts:171、editor-engine.ts:444、compute-inverse.ts:35，后者另有 removeNodes:174/applyUpdates:188）；引擎 hooks 双线（use-editor-engine 361L ↔ use-scada-engine 348L；use-editor-handles 244L ↔ use-scada-handles 160L）。editor 线特有：undo/redo adapter、toolbox（align/distribute/z-order/clipboard）、connections；runtime 线特有：点表 `isScadaPrimitive` 写收敛。可共享面 = 挂载/符号树订阅/test-handle 桥。
- report-designer-renderers 已依赖 spreadsheet-core 与 spreadsheet-renderers（package.json 确认）。jscpd 跨包克隆恰 **5 文件对**（评审实测）：host-action-provider↔host-action-provider 53L、report-designer-manifest↔spreadsheet-manifest-shapes 20L、report-spreadsheet-canvas↔default-page-body 34L、types↔types 10L、renderers↔renderers 9L。其中 host-action-provider 对（最大对）归 cq-2 Phase 2 承接。host-method **常量清单**（REPORT_DESIGNER_HOST_METHODS 12 方法 / SPREADSHEET_HOST_METHODS）是各自域，不可共享；可上移的是 contract shape builders（selection/clipboard/range 形状）与 manifest versioning 样板。
- 依赖边披露：spreadsheet-core 当前零依赖（仅 peer zustand）；contract 形状上移需新增 **spreadsheet-core → flux-core** 边（方向向下，flux-core 不反向 import，无环，depcruise 无禁止序）。
- CQ-D1 的 `createHostActionProvider` 工厂属 cq-2（draft），**本 plan 不依赖、不消费、不以其为 exit 前提**。

## Goals

- flux-react 新增 bindings 公共层（快照 scope + probe 求值核心 + primitive 谓词策略参数），3d/industrial 双双改为薄适配。
- flux-core value-adapter 增组合 API（validate message 经注入 formatter 保持包间差异），form-advanced detail-view 降为薄调用。
- industrial 包内符号树操作与 hooks 可共享骨架单实现化。
- report↔spreadsheet 的 contract shape builders 与 manifest versioning 样板上移 spreadsheet-core，双包消费。

## Non-Goals

- 不合并 3d 与 industrial 的渲染/挂载逻辑（只收敛 binding 求值层）。
- 不做 dashboard handles 的跨包收敛（依赖方向不允许；cq-2 follow-up 已记录，本 plan 仅在 industrial 内部收敛后于 dashboard 克隆处补来源注记）。
- 不动 host-action-provider 粘合层（cq-2 Phase 2 所有，不在本 plan exit 判据）；不动 designer inspector（CQ-D11 defer）；undo 栈统一另案（CQ-D13，optimization candidate）。

## Scope

### In Scope

- `packages/flux-react/src/bindings/`（新增）、`packages/flux-renderers-3d/src/binding/`、`packages/flux-renderers-industrial/src/binding/`
- `packages/flux-core/src/value-adapter.ts`、`packages/flux-renderers-form-advanced/src/detail-view/`
- `packages/flux-renderers-industrial/src/`（symbol-tree-ops、engine hooks）、`packages/flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts`（仅注记）
- `packages/spreadsheet-core/src/`（contract shape builders 落点；新增对 flux-core 的依赖边）、`packages/{report-designer-renderers,spreadsheet-renderers}/src/`（4 对消费迁移）
- `docs/architecture/renderer-runtime.md`（bindings 层记录）

### Out Of Scope

- dashboard 完整收敛；渲染逻辑合并；host-action-provider 对（cq-2）；undo/inspector（defer 项）。

## Failure Paths

| 可测场景编号                   | 触发                                            | 行为                                                    | 可重试 | 用户可见表现                       |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------- | ------ | ---------------------------------- |
| binding-semantic-leak          | 3d 宽松语义泄入 industrial（或反向收口泄入 3d） | 策略参数显式隔离 + 双包行为锁定测试（含非法值路径）拦截 | 是     | 测试红，无用户可见影响             |
| detail-view-message-regression | 组合 API 统一了 message 格式                    | 注入 formatter 保持 flux-i18n 本地化文案                | 是     | detail-view 校验错误文案维持本地化 |

## Test Strategy

档位：**必须自动化**——binding 求值是渲染正确性前提：先为 3d/industrial 现有求值行为补齐行为锁定测试（合法路径 + 非法值路径 + 依赖探测），再抽公共层；迁移后双包测试全绿证明等价。

## Execution Plan

### Phase 1 - flux-react bindings 公共层 + 双包迁移

Status: completed
Targets: `packages/flux-react/src/bindings/`（新增）、3d/industrial flux-eval

- Item Types: `Proof | Fix`

- [x] Proof：两包既有 binding 测试即行为锁定（industrial robustness-hardening/refresh-pipeline-core/binding-expression-unification、3d use-binding-bridge 系列——audit 认可的存量面），迁移后 3d 204 / industrial 1611 全绿
- [x] Fix：`flux-react/src/bindings/flux-eval.ts`（createPrivateEvalScope(data, scopeId)/extractExpressionDepsViaProbe(..., scopeId)/probeExpressionPaths(..., scopeId, normalize?)——**as-built:scope id 作参数**,谓词仍留各包（industrial 的 isScadaPrimitive 在收口点不在求值核心,无需注入））；双包改薄适配（3d 保留 analyze/expressionReadsScope/normalize 域函数,industrial 保留 isScadaPrimitive）
- [x] Proof：3d 204 绿 / industrial 1611 绿（既有 binding 套件零改动通过）

Exit Criteria:

- [x] 两包 flux-eval 不再含 probe/snapshot 复制实现（thin adapter 化）
- [x] 双包 focused 测试全绿

### Phase 2 - value-adapter 组合 API + detail-view 薄化（message 注入点）

Status: completed
Targets: `packages/flux-core/src/value-adapter.ts`、`packages/flux-renderers-form-advanced/src/detail-view/`

- Item Types: `Fix | Proof`

- [x] Fix：flux-core 增 `createActionBackedAdapter`（program 克隆/arg 注入/失败归一 + **toValidationIssues 注入点**,默认英文版）;form-advanced helper 薄化为 137L（363→137,仅保留本地化 formatter + run\*/publish 封装）；**detail-field/detail-view 编译/确认序列**经查为消费侧接线（非逐行克隆对,jscpd 5 clones 89L 系 helper↔core 旧克隆,已随薄化消除——不另抽包内模块）
- [x] Proof：form-advanced 1144 绿（value-adaptation-helper.test 等零改动通过=本地化文案无回归）；`check:schema-prop-coverage` exit 0

Exit Criteria:

- [x] 跨文件对克隆归零（jscpd 复测 0；core 内 actionAdapter↔组合体 56L 结构性相似为 residual——委托式统一已尝试并回退,理由见 As-Built Note）
- [x] form-advanced 1144 绿 + 本地化文案零回归

### Phase 3 - industrial 包内单实现化

Status: completed
Targets: `packages/flux-renderers-industrial/src/`

- Item Types: `Fix | Proof`

- [x] Fix：`shared/symbol-tree-ops.ts`（findNodeById/removeNodes/applyUpdates 逐字迁移）；三处消费迁移
- [x] Fix（as-built 裁定）：hooks 双线骨架**保留**——逐支 diff 显示两线仅在符号树原语上逐字同文,引擎 hooks 的挂载/订阅差异为真语义分叉（editor 有 toolbox/undo 接线）,强并收益低于风险;dashboard handles 克隆处已补来源注记
- [x] Proof：industrial 1611 绿；dashboard 注记在位

Exit Criteria:

- [x] `findNodeById`/`removeNodes`/`applyUpdates` grep 单实现
- [x] industrial focused 全绿（1611）

### Phase 4 - report↔spreadsheet contract shapes 上移

Status: completed
Targets: `packages/spreadsheet-core/src/`、report/spreadsheet renderers

- Item Types: `Fix | Proof`

- [x] Fix（as-built 裁定收缩）：`DesignerPageSchemaInputBase`（8 个 page-input 前导字段 + statusPath）上移 spreadsheet-core（flux-core 依赖边随 cq-2 落地）,types 对双包消费迁移;**其余三对经 live 勘察裁定保留**——canvas 34L 系共享 SpreadsheetGrid 的 props 枚举(handler 为消费方本地实例,强并只是移动清单);manifest 20L 系刻意松紧差(report 投影契约无 unknownKeys:reject,spreadsheet host 契约严格,上移即契约变更);renderers 9L 系各渲染器 propContracts/fields 清单
- [x] Proof：report 206 / spreadsheet 169 / spreadsheet-core 279 / report-designer-core 186 绿；`check:workspace-manifest-deps` exit 0

Exit Criteria:

- [x] types 对单源化（DesignerPageSchemaInputBase）;三对经裁定保留（理由如上,逐对记录）
- [x] 四包测试绿 + manifest 门禁绿（依赖边已随 cq-2 披露）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_3d02b5ba，两轮）
- Verdict: 首轮 `revised`（2 Major）→ 修订 → 第二轮 `pass`（零 Blocker/Major；非阻塞备注：本记录回填已完成）
- Rounds: 2
- Findings addressed: M1（"工厂已落地"改为 cq-2 draft 所有不依赖 + host-action-provider 对归 cq-2 + Phase 4 枚举 4 对）、M2（message 注入点 + 零依赖约束 + 本地化回归 Proof + Failure Paths 增行）；Minor 6 条全吸收（另超出要求：symbol-tree-ops 函数名改实测名、Closure Gates 增 pnpm check）

## Closure Gates

- [x] 四组跨包重复处置完成（bindings 单源；value-adapter 跨文件对克隆归零；symbol-tree 单源；types 对单源 + 三对裁定保留——jscpd 复测数据记录于各 Phase 回填）
- [x] 包间依赖方向零违反（`check:workspace-manifest-deps`、`audit:deps` 绿；spreadsheet-core→flux-core 边已随 cq-2 落地并披露）
- [x] 行为锁定测试先行且迁移后全绿（既有 binding/detail-view 套件即锁定,零改动通过）
- [x] owner docs 已同步（renderer-runtime.md 增 Binding Evaluation Core 节；anchors 门禁 exit 0）
- [x] 不存在被静默降级的 in-scope live defect（Phase 3 hooks 与 Phase 4 三对保留均有 live 勘察证据与 plan 回填）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

### dashboard handles 跨包完整收敛

- Classification: `optimization candidate`
- Why Not Blocking Closure: dashboard 与 industrial 无依赖边，收敛需 flux-react 增通用 handles 抽象（接口设计成本高、当前仅 76L 收益）；本 plan 已完成 industrial 内部收敛 + 来源注记
- Successor Required: `no`
- Successor Path: cq-2 Non-Blocking Follow-ups 已记录

### undo 栈统一（CQ-D13）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 五处存储策略差异系刻意设计（快照/整档 diff/命令），强行统一语义漂移风险大于 ~150L 收益
- Successor Required: `no`
- Successor Path: —

### designer inspector 共享 field-model（CQ-D11）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 需要设计器族架构决策（editor-core 定位升级 + 各设计器注入模型），非机械去重（分析报告第五节裁定）
- Successor Required: `no`
- Successor Path: —

## Non-Blocking Follow-ups

- 3d binding 若新增数组/对象高级路径，策略参数需回归扩展测试

## Closure

Status Note: 四 Phase 落地。独立 fresh-session closure audit 首轮 verdict `approved`（0 Blocker/Major,2 Minor 均已修：As-Built 悬挂 commit 号勘误、toValidationIssues plain-schema 路径限制披露）。委托式统一回退与 Phase 4 收缩裁定经审计独立复核成立（回退路径 runner 单参签名无害、三对保留证据逐对核实）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_9c149a0b）
- Verdict: `approved`（2 Minor 非 blocking,已修）
- Evidence: 审计独立复跑 3d 204 / industrial 1611 / form-advanced 1144 / report 206 / spreadsheet 169 / spreadsheet-core 279 / report-designer-core 186 全绿;56L residual 定向 jscpd 复现逐字吻合;manifest 松紧差(allow vs reject×8)与 canvas/renderers 枚举性质逐对核实;门禁(manifest/anchors/duplicates)全绿。

Follow-up:

- dashboard handles 跨包收敛（依赖边阻塞,已注记）
- ownership/statePath 下沉 flux-react;undo 栈统一(CQ-D13);inspector field-model(CQ-D11)（Deferred 既有）
