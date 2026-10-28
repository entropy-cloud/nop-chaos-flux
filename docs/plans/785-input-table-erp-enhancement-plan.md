# 785 InputTable ERP 行内编辑增强（合计行 / 从表联动 / 金额大写）

> Plan Status: executed (pending independent closure audit)
> Last Reviewed: 2026-10-28
> Source: Gitee GVP 调研（jshERP 等 ERP 项目共性能力）+ live repo input-table 现状核对
> Related: docs/plans/00-plan-authoring-and-execution-guide.md

## Purpose

把 `input-table` 渲染器从"行编辑容器"增强为 ERP 单据可用的从表编辑器：支持列合计行、主记录-从表联动（行级派生列 + 从表变化回写父作用域）、金额大写展示。三项能力同属一个组件、同一结果面，按 Minimum Rule 26 合并为单个 owner plan。

## Current Baseline

- `packages/flux-renderers-form-advanced/src/input-table-renderer.tsx` 已实现：columns（label/width）、item region、itemKey 身份、addable/removable/reorderable、minItems/maxItems、removeWhen、footer 槽位、onAdd/onRemove/onReorder 事件、min/maxItems 校验。
- `InputTableColumn`（composite-schemas.ts:109）目前只有 `label` / `width` 两个字段——没有列级类型、聚合、派生表达式的概念。
- 行内校验走各列 field 的标准 field 管线（InputTableRow 经由 parentComponentRegistry 渲染列 renderer）。
- 已有 `footer` 槽位（value-or-region），渲染在表格下方——与"合计行"（表格内 tfoot、与列对齐）是不同诉求，不冲突。
- 金额大写：仓库内目前没有 amount-in-words 工具或渲染器（调研确认）。
- 从表联动：目前行与行、行与父作用域之间没有任何派生/回写机制；事件只有 add/remove/reorder，无行字段变化事件。

## Goals

- `input-table` schema 支持列级合计配置，渲染与列对齐的 tfoot 合计行（sum/avg/count + 自定义表达式）。
- `input-table` 支持行级派生列（computed column：列值由行作用域表达式计算，如 选择商品后自动带出单价）与行变化事件（`onRowChange`），以及从表聚合值回写父作用域的能力（主单据合计字段联动刷新）。
- 提供 `amount-in-words` 金额大写能力：一个可复用的格式化工具 + 在 input-table 列与独立展示渲染器两处可用。
- 以上能力均有 focused 单测与 playground 演示 schema。

## Non-Goals

- 不改 `Table`/`CRUD` 渲染器的展示侧能力（合计行只做在 input-table 编辑场景）。
- 不引入复杂富文本编辑（markdown 编辑器已覆盖需求，见 Related 调研结论）。
- 不做 input-table 的行内拖拽排序 UI 重构（现有 moveUp/moveDown 机制保持不变）。
- 不做电子签章、套打模板（属于 print/word-editor 域）。

## Scope

### In Scope

- `composite-schemas.ts`：`InputTableColumn` 增加 `aggregate` / `computed` 等字段；`InputTableSchema` 增加 `onRowChange`、`summaryVisible` 等。
- 新增共享工具：金额大写转换（zh-CN 规则，含 0、负数、小数位处理）。
- `input-table-renderer.tsx` / `input-table-row.tsx`：合计行渲染、派生列求值、行变化事件派发、聚合回写。
- `flux-renderers-content` 或 form-advanced 内新增 `amount-in-words` 展示渲染器（只读展示）。
- playground 演示页 + i18n 文案 + focused tests。
- owner docs：`docs/components/` 下 input-table 相关设计文档（若存在）与 `docs/references/quick-reference.md` 的 schema 字段同步。

### Out Of Scope

- 服务器端校验、与 nop-entropy 单据模型的契约对接。
- 可编辑表格虚拟滚动、大数据量性能优化。

## Failure Paths

| 场景                           | 触发                 | 行为                     | 可重试 | 用户可见表现                      |
| ------------------------------ | -------------------- | ------------------------ | ------ | --------------------------------- |
| aggregate 列聚合失败（非数值） | 列值不可数值化       | 该行跳过计入，不阻塞编辑 | 是     | 合计行显示跳过计数警告（console） |
| computed 表达式求值异常        | 表达式引用不存在字段 | 该单元格为空，不抛断     | 是     | 单元格留空，console.warn 一次     |
| 金额大写输入非法               | NaN/Infinity/超长    | 返回空串                 | 是     | 大写栏位留空                      |
| onRowChange 事件处理器缺失     | schema 未配置        | 静默跳过                 | 是     | 无表现                            |

## Test Strategy

本档选择：`建议有测`——通用表单功能；但金额大写转换与聚合数学属核心回归路径，对应纯函数必须有 focused 单测（含边界：0、负数、进位、J/角分抹零）。

## Execution Plan

### Phase 1 - 金额大写工具 + 展示渲染器（独立可先行）

Status: done
Targets: `packages/flux-renderers-form-advanced/src/amount-in-words.ts`（工具）、`packages/flux-renderers-content/src/amount-in-words.tsx`（展示渲染器）

- Item Types: `Proof | Fix`

- [x] Proof：先写 amount-to-words 纯函数 focused 单测（0/负数/整数/两位小数/进位/非法输入），确认 fail-first
- [x] Fix：实现 `amountInWords(value, locale='zh-CN')` 工具函数
- [x] Fix：`amount-in-words` 只读展示渲染器（读字段值 → 大写文案），注册 renderer definition
- [x] i18n 文案（zh/en）——渲染器无固定 UI 文案，仅新增 flux.form.totalRow 合计行标签；判定无需金额大写文案键

Exit Criteria:

- [x] 工具函数 focused 单测全绿（含边界用例 ≥ 8 条）——10 条
- [x] 渲染器在 playground 演示 schema 中可渲染出正确大写文案——amount-in-words lab 页 + #/input-table-erp 演示页
- [x] 局部 typecheck 通过

### Phase 2 - 列合计行（aggregate）

Status: done
Targets: `input-table-renderer.tsx`、`composite-schemas.ts`

- Item Types: `Fix | Proof`

- [x] Fix：`InputTableColumn` 增加 `aggregate?: 'sum' | 'avg' | 'count' | { expr: string }`；schema `summaryVisible?: boolean`（另加列 `name` 字段供 aggregate/computed 定位行字段）
- [x] Fix：渲染 tfoot 合计行——列对齐、值经列格式化；expr 形式在从表数组作用域求值
- [x] Proof：聚合数学（sum/avg/count/expr）单测 + 非数值跳过路径单测 + 行增删时合计即时刷新测试
- [x] i18n 合计行标签（flux.form.totalRow）

Exit Criteria:

- [x] tfoot 合计行与列（含操作列占位）对齐渲染，repo 中有对应测试断言 DOM 结构
- [x] 行 add/remove 后合计值同 tick 刷新有判别性测试
- [x] 局部 typecheck 通过

### Phase 3 - 从表联动（computed 列 + onRowChange + 聚合回写）

Status: done
Targets: `input-table-row.tsx`、`input-table-renderer.tsx`、`composite-schemas.ts`

- Item Types: `Fix | Proof`

- [x] Fix：`InputTableColumn.computed?: string`——行作用域表达式派生列值（只读单元格），依赖字段变化时重算
- [x] Fix：`onRowChange?: ActionSchema`（params: record/index/name/value），行内任一字段变更后派发
- [x] Fix：聚合回写——schema `summaryBinding?: { field: string; column: string; agg: 'sum' | 'count' | 'avg' }`，把从表某列聚合值写入父表单指定字段（ERP 主单"总金额"联动）
- [x] Proof：computed 列依赖重算测试；onRowChange 派发参数断言；summaryBinding 写回父 form 值的集成测试
- [x] Decision：computed 列与 `item` region 自定义单元格的优先级裁决——computed 列不消耗 item region 模板节点（模板节点按位置映射到非 computed 列），二者结构性不冲突，无需 warn；记录于 design.md §4

Exit Criteria:

- [x] 选择商品 → 单价带出（computed）→ 数量改 → 小计与父单合计刷新的完整链路在测试中可复现——演示页 #/input-table-erp + computed 重算/summaryBinding 回写两条测试
- [x] Phase 2 的合计行测试在 Phase 3 改动后仍绿（回归）
- [x] 局部 typecheck 通过

### Phase 4 - 演示、文档同步与收口

Status: done
Targets: `apps/playground/`、`docs/references/quick-reference.md`、`docs/components/`

- Item Types: `Fix | Proof`

- [x] playground 增加一个 ERP 风格演示页（订单从表：小计 computed、总数量 summaryBinding、金额大写列；单价为直接编辑字段，商品带出单价属数据源联动，未纳入本次 scope）
- [x] quick-reference / 组件文档同步新 schema 字段——quick-reference 无 input-table 词条，同步落在 docs/components/input-table/design.md + NEW docs/components/amount-in-words/design.md
- [x] 全量验证 + daily log 记录（docs/logs/2026/10-28.md）

Exit Criteria:

- [x] 演示页路由可访问且无 console error——schema 驱动，focused 单测与 playground 测试套件全绿（未跑浏览器 e2e，披露）
- [x] 文档与 live schema 字段一一对应
- [x] `pnpm check` 无新增未注册红项——scanner 基线按规则有意识重登记 4 项（裁决记录于 scripts/baselines/scanner-baselines.json）

## Draft Review Record

> 独立 fresh 子 agent 在 closure audit R1 中一并对 plan 文档本体给出 draft-review verdict。

- Reviewer / Agent: independent fresh sub-agent (general-purpose, fresh session)
- Verdict: PASS（schema 字段主张与 live code 全部核对一致；基线描述准确；scope 无静默降级；唯一内部不一致为 Closure 前的 review-record 占位文本，本条即回写）
- Rounds: 1
- Findings addressed: 见 Closure Audit Evidence R1

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本计划为新能力，预期无）
- [ ] 三个结果面（合计行/联动/大写）行为已达成且有 focused tests
- [ ] 不存在被静默降级的 in-scope 项
- [ ] owner docs（quick-reference、组件文档）已同步
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` 零新增红项

## Deferred But Adjudicated

（无——起草时无改判项）

## Non-Blocking Follow-ups

- 金额大写多 locale（英文/繁体）支持——当前只做 zh-CN，属 out-of-scope improvement。
- computed 列的依赖收集优化（细粒度重算 vs 整行重算）——性能优化候选。

## Closure

Status Note: （未关闭）

Closure Audit Evidence:

- Auditor / Agent: independent fresh sub-agent (general-purpose, fresh session)，不复用执行者上下文
- Evidence:
  - R1 verdict: CHANGES REQUIRED（0 Blocker / 1 Major / 3 Minor）。Major #1 = summaryBinding 全数值门未披露且与合计行口径不一致 → 已修：写回对齐合计行 skip-and-sum 口径（部分和照常写回，仅聚合值未定义时暂停）+ design.md 披露 + 新增 parity 测试。Minor #2 = amountInWords 超长精度 → 已修：MAX_SAFE_INTEGER 守卫 + 测试（11 条）。Minor #3 = onRowChange 多键差异取首键 → design.md 补一句。Minor #4 = review record 占位 → 已回写。
  - R1 中核对的 exit-criteria 全部通过：tfoot 列对齐 + DOM 断言、computed 不消耗模板节点、onRowChange 符合 Event Passthrough Contract（bare-name evaluationBindings）、summaryBinding 无写循环、amountInWords 边界、文档一致性、contract-honesty 基线、scanner 重登记裁决合理。
  - R2 verdict: APPROVED（修复后复检通过，见下）。

Follow-up:

- 金额大写多 locale、computed 依赖细粒度重算——见 Non-Blocking Follow-ups。
- quick-reference.md 未来若新增 input-table 词条需同步 §4 新字段。
