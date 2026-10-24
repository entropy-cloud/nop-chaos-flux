# Arc Gap G2D — inline-edit 落点裁决与设计（`detail-field` `editMode` 能力扩展）

> Plan Status: completed
> Last Reviewed: 2026-10-22
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G2 / §6 Wave 2 G2D / §7 G2D（roadmap work item G2D，`todo`）
> Related: `missions/arc-component-gap.json`（commitFormat：`feat(arc-component-gap): <description>`）、G1D 先例 `docs/plans/arc-gap-g1d-password-strength-design-plan.md`

## Purpose

把 G2D 收口为：inline-edit（点即编辑）落点**一票裁决** + 协议在 owner doc（`docs/components/detail-field/design.md`）定稿 + `existing-components-improvement-analysis.md` 登记 + 命名 pass。纯文档计划，为 G2I 提供唯一契约事实源。

## Current Baseline（live 实测 2026-10-22，worktree `arc-component-gap`）

- `docs/components/detail-field/design.md`（12 节齐备）：detail-field = "表单绑定的详情编辑复合字段"——viewer 摘要 + 触发按钮 + dialog/drawer draft form，确认写回父表单字段（`applyParentWriteback`：`parentForm.setValue` 或 `parentScope.update` 双通道）。
- **`detail-view` 实况勘误（roadmap 前提修正）**：`detail-view` 并非只读对——它是 **scope 级独立编辑复合字段**（`detail-view/design.md:5` "独立详情编辑复合字段"，live `detail-view.tsx` 有 `handleConfirm`/`applyCommittedWrites`/draft form）；它与 detail-field 的真正差异是**缺 `name` 绑定**（scope 级 vs 字段级）。roadmap §3/§5.1 G2 中"只读对"表述据此就地勘误（closure 回写时附注）。
- 实现落点：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`（446 行；viewer :332-338、触发按钮 :339-356、surface 编排 :358-386、写回 :165-180、校验收敛 :134-155、adaptation 链 runTransformIn/runValidate/runTransformOut）。
- 可复用机制（零重建）：值适配链（`value-adaptation-helper.ts`）、写回与校验回滚（`applyParentWriteback`/`rollbackParentWriteback`/`settleParentValidation`）、presentation 门控（`useFieldPresentation`）、错误上报（`setDraftErrorSafe` + `env.notify` 模式）。
- Arc 对照（`~/sources/arc-library/registry/components/inline-edit/inline-edit.tsx`，live 实测）：点文本即编辑、Enter 保存/Escape 回滚、`onSave` promise 失败回滚、`validate`、`multiline`、motion 动效。
- flux 详情侧现状：详情字段编辑只能整弹窗（detail-field），无字段级就地轻编辑；AMIS 仅有表格 cell editable。
- 保护区域：renderer 定义字段 = `plan-first`（本 plan 即流程覆盖）；不触 `packages/ui/src/index.ts`；无新 retained type（裁决 (a) 则零 matrix 门禁）。

## Goals

- 落点二选一**一票裁决**并写入 design.md 决策表（被拒方理由成文，防止反复）。
- inline 编辑协议定稿：触发、编辑态原语、提交/取消/焦点、disabled/只读降级、错误表现、与既有 adaptation/写回链的关系。
- 登记 improvement-analysis + 命名 pass 记录。
- G2I 可仅凭 design.md + 本 plan 无歧义实现。

## Non-Goals

- 不写产品代码 / 测试代码（G2I 的事）。
- 不动 `detail-view`（排除理由见 Phase 1 裁决：inline 是**字段级**编辑，需要 `name` 绑定 → 归属绑定态的 detail-field；detail-view 是 scope 级独立编辑复合字段，不承载字段级 inline）——closure 回写时对 roadmap "只读对"原文就地勘误。
- 不做 `multiline`（首版单行 scalar；多行内容仍走 surface 模式——理由写入 design.md）。
- 不引入 Arc motion 动效（arc-component-gap §5.4 动效边界）。
- 不新增 ui primitive、不新增 retained type。

## Scope

### In Scope

- `docs/components/detail-field/design.md` 更新（§2 新增 Flux 决策表 + §4 schema 字段 + §5 字段分类（`editMode` 归类）+ §7 状态归属 + §10 DOM/a11y + §12 风险与裁决记录）。
- `docs/components/existing-components-improvement-analysis.md` 登记（G2 行）。
- `docs/backlog/arc-component-gap-roadmap.md` closure 回写时就地勘误（§3/§5.1 G2 "只读对"表述 → detail-view 实为 scope 级独立编辑复合字段；§2/§7 暂定名 `detail-field.editable` → 定稿 `editMode`）——义务在 Baseline/Non-Goals/Phase 2 已成文，此处入册 scope。
- 本 plan 内命名 checklist 核对记录。

### Out Of Scope

- `docs/components/detail-view/design.md`（零改动）。
- example/lab/e2e/manifest/quick-reference/i18n keys（交付铁律 3/5/6 归 G2I）。

## Failure Paths

| 可测场景编号            | 触发                                 | 行为（设计语义）                                                                                                                                         | 可重试 | 用户可见表现              |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| inline-surface-default  | `editMode` 未声明 / 声明 `surface`   | 既有弹窗行为逐字节不变（判别测试归 G2I）                                                                                                                 | 是     | 现状 detail-field         |
| inline-readOnly         | `readOnly: true` / disabled          | viewer 不可点击进入编辑（`presentation.interactive` 门控；较 surface 的 readOnly-可开弹窗为新增分歧）                                                    | 是     | 纯只读展示                |
| inline-commit-fail      | 提交后 `settleParentValidation` 失败 | 写回回滚到前一值，编辑态保持，内联错误（`role="status"` + `aria-live="assertive"`，与协议错误表现 clause 及 draft-error 家族一致）+ `env.notify` warning | 是     | 错误可见、值未变          |
| inline-escape           | 编辑态按 Escape                      | 放弃草稿回到 viewer，无写回                                                                                                                              | 是     | 原值                      |
| inline-blur             | 编辑态失焦（点击别处）               | 视为提交（同 Enter），失败回滚、编辑态保持                                                                                                               | 是     | 提交或回滚                |
| inline-validate-fail    | 提交时 `runValidate` 返回无效        | 不提交、不写回，编辑态保持，焦点留在编辑器，内联错误可见                                                                                                 | 是     | 错误信息 + 原值仍在编辑器 |
| inline-transformin-fail | 进入编辑时 `runTransformIn` 失败     | 不进入编辑态，viewer 保持 + `env.notify` warning                                                                                                         | 是     | viewer 原样 + 警告通知    |

## Test Strategy

档位选择（三选一）：`必须自动化 / 建议有测 / 不适用：理由`

本档选择：`不适用：纯文档计划，无行为变更`（G2I 承担自动化测试；`inline-surface-default` 的判别性测试要求已在本 plan 中预登记给 G2I）。

## Execution Plan

### Phase 1 — 落点裁决与协议定稿（owner doc 更新）

Status: completed
Targets: `docs/components/detail-field/design.md`

- Item Types: `Decision`

- [x] **§2 新增 Flux 决策表**（detail-field/design.md §2 现为 AMIS 对照 bullet，无表；按 `naming-conventions.md:168-170` X5 式 `能力 | 采纳 | 不采纳 | 理由` 范本新建）承载以下裁决与对照行
- [x] **落点裁决（一票）**：(a) `detail-field` 能力扩展 `editMode?: 'surface' | 'inline'`（默认 `surface`）。被拒方 (b) 独立 type `inline-edit` 的排除理由写入 design.md：name 绑定、写回双通道（parentForm/parentScope）、adaptation action 链（transformIn/validate/transformOut）、校验收敛与回滚、presentation 门控在两方案中完全相同——(b) 仅 surface 壳不同，机制复用率 ~80%，独立 type 属 type 增殖（违背 `naming-conventions.md` 约束与 gap 裁决口径）且需 matrix 增行 human gate；detail 家族语义（"详情字段的编辑"）内含轻编辑形态，不偏离家族
- [x] §4 schema：`editMode?: 'surface' | 'inline'` 字段定义 + 默认值语义（未声明 = `surface`，零行为变化）
- [x] 协议核心写定——**inline 模式交互契约**：
  - 触发：viewer 区渲染为按钮语义（`<button>` 包裹或等价 a11y 实现），点击 / Enter / Space 进入编辑态；`aria-label` = `triggerLabel`（键 `flux.common.editItem`，默认文案 `编辑{{item}}`，zh-CN.ts:51）；不可触发门控 = `presentation.interactive`（即 `!disabled && !readOnly`，field-presentation.tsx:118）。**注意这是较 surface 新增的分歧行为**：surface 模式下 readOnly 仍可打开弹窗（只读预览 + close-only footer，design.md §12:91），inline 模式下 readOnly 直接不可进入编辑（无只读编辑形态可展示）——分歧理由写入 design.md §12
  - 编辑态：单行 `Input` 原语就地替换 viewer（焦点自动移入，内容预填 transformIn 后值）；**不创建 draft form runtime**（inline 草稿为组件 local UI state，§7）
  - 提交：Enter 或 blur → `runValidate`（validateValueAction，失败不提交、编辑态保持、焦点留在编辑器）→ `transformOut` → `applyParentWriteback` → `settleParentValidation`（失败回滚 + 编辑态保持）→ `touchField` → 回 viewer
  - 取消：Escape → 丢弃草稿回 viewer（不写回）
  - **进入编辑（in-flight）**：点击触发后按钮进入 busy（`aria-busy` + Spinner，同 surface `opening` 模式），`runTransformIn` 落地后才切入编辑态；失败则保持 viewer + `env.notify` warning（复用 `reportOpenFailure` 模式）
  - **提交 in-flight**：提交链进行中（validate/transformOut/写回/收敛未落地）二次 Enter/blur/Escape 一律忽略（confirmSequencer 同款防重入守卫，detail-field.tsx:227-231 同构）；期间无状态可视变化则维持编辑态，成功后整体回 viewer
  - `runValidate` 失败与 `settleParentValidation` 失败均为**编辑态保持**（区别于 Arc 的提交失败退出编辑态 + failed 横幅 + 重试，inline-edit.tsx:258-268——该分歧记入 §2 对照行）
  - 焦点：viewer → editor 自动聚焦；提交/取消后焦点回 viewer 按钮
  - 错误表现：内联错误 `data-slot="detail-field-inline-error"` + `role="status"` + `aria-live="assertive"`（**与同组件 draft-error 家族约定一致**，design.md §10:78 同款，不用 role="alert"——同族一致性取齐）+ `env.notify` warning（复用 `reportConfirmFailure` 模式）
- [x] §5 字段分类：`editMode` 归 `value`（props 通道）
- [x] §7 状态归属：inline 草稿 = local UI state（不写表单值直到提交成功）；编辑中外部值到达的降级语义（编辑态不追踪外部更新，提交时以提交值为准——写入 §7）
- [x] §10 DOM：viewer `data-slot="detail-field-viewer"` 维持，inline 模式追加 `data-editable="true"`；编辑器 `data-slot="detail-field-inline-editor"`；错误 `data-slot="detail-field-inline-error"`（`role="status"` + `aria-live="assertive"`，与 draft-error 家族取齐）；根 marker `nop-detail-field` 不变
- [x] §2（新决策表内）补 Arc 对照采纳/不采纳行：采纳点即编辑/Enter 提交/Escape 回滚/失败回滚；**分歧行**——Arc 提交失败退出编辑态 + failed 横幅 + 重试，flux 裁定为编辑态保持（理由：与 surface 模式 confirm 失败语义同构、避免输入丢失）；不采纳 multiline（多行仍走 surface）、motion 动效（无动效引擎）

Exit Criteria:

- [x] design.md 六处（§2/§4/§5/§7/§10/§12）与协议一致，裁决与被拒理由成文，无 "Proposed vs Current" 残留
- [x] 协议要素（触发/原语/提交/取消/焦点/降级/错误）齐备互洽
- [x] `editMode` 默认语义明确（未声明 = 现状 surface，零行为漂移）

### Phase 2 — 登记与命名 pass

Status: completed
Targets: `docs/components/existing-components-improvement-analysis.md`

- Item Types: `Decision | Proof`

- [x] improvement-analysis §7.1 第 2 批表新增 G2 登记行（detail-field `editMode: 'inline'` 点即编辑 + ✅ 设计定稿标记 + 本 plan 交叉引用）（Decision）
- [x] 命名 pass：`editMode` 过 `naming-conventions.md` §5 checklist（§4.2 语义枚举，`treeMode` 同族先例 / 通道 = props / 无平行词汇 / 无 amis 判别树），结论记入本 plan『命名 Checklist 核对记录』节；附带裁定两点：(1) 枚举值 `'surface'` 与兄弟 schema 字段名 `surface`（弹窗配置对象）同词异义——保留 `'surface'` 值（语义 = "经 surface 编辑"，与 `surface.mode: 'dialog'|'drawer'` 正交），理由入 design.md；(2) roadmap §2/§7 暂定名 `detail-field.editable` 与定稿 `editMode` 的差异在 closure 回写时就地勘误（roadmap §9.7 授权 D 阶段定稿）（Proof）
- [x] G2I 输入核对：design.md + 本 plan 足以无歧义实现，且显式要求 G2I 落两类测试：(i) **inline 能力判别测试**（旧实现下必挂、新实现下过——验证新能力本体）；(ii) **surface 默认路径回归钉**（旧实现即过——验证 `editMode` 未声明时零漂移；不得与 (i) 混淆）（Proof）

Exit Criteria:

- [x] 登记行存在且指向本 plan 与 roadmap G2
- [x] 命名 checklist 九项逐项有结论
- [x] grep 全仓无第二处 inline-edit 契约定义（单一事实源 = detail-field/design.md；live 复核 2026-10-23：packages 下 `editMode.*inline` 仅 detail-field/design.md 与本 plan）

## Closure Gates

> 纯文档计划：`pnpm typecheck`/`build`/`lint`/`test` 条目按 guide 模板规则删除。

- [x] Phase 1 / Phase 2 Exit Criteria 全部 `[x]`
- [x] 受影响 owner docs（detail-field/design.md、improvement-analysis、roadmap 就地勘误）已同步且无内部矛盾
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Draft Review Record

- Reviewer / Agent: 独立子 agent R1（fresh session `agent_a1ddf051`，general-purpose，review-only）
- Verdict: `revised`（0 Blocker / 3 Major / 7 Minor）→ 修正后送 R2 复审
- Rounds: 3（R1 revised → 修正 → R2 revised → 修正 → R3 定点确认）
- Findings addressed:
  - R1-Major-1 "detail-view 纯只读对"失实（实为 scope 级独立编辑复合字段，缺的是 name 绑定）→ Baseline 改为实况勘误、Non-Goal 换真实排除理由、closure 回写时就地勘误 roadmap "只读对"原文
  - R1-Major-2 "readOnly 同既有触发按钮门控"失实（surface 下 readOnly 仍可开弹窗）→ 改为"新增分歧门控（`presentation.interactive`）"+ 分歧理由入 §12
  - R1-Major-3 提交 in-flight 并发语义缺失 → 协议补三条：进入编辑 busy 态（transformIn 落地后切入）、提交 in-flight 二次输入一律忽略（confirmSequencer 同构守卫）、validate 失败编辑态保持
  - R1-Minor-1 Failure Paths 补 inline-validate-fail / inline-transformin-fail 两行
  - R1-Minor-2 "§2 决策表补行"改"新增 Flux 决策表"（§2 现无表）
  - R1-Minor-3 内联错误 role 改 `role="status"` + aria-live assertive（与 draft-error 家族取齐）
  - R1-Minor-4 i18n 键点名 `flux.common.editItem`（`编辑{{item}}`）
  - R1-Minor-5 判别测试拆两类：inline 能力判别（旧必挂）+ surface 回归钉（旧即过）
  - R1-Minor-6 Arc 提交失败语义分歧写入 §2 对照行
  - R1-Minor-7 roadmap `editable`→`editMode` 勘误预记 + `'surface'` 枚举值同词异义裁定 + In Scope 补 §5
  - R2（fresh session `agent_06e12e50`）`revised`（0B/1M/2m）：R1 三 Major 全落地、in-flight 全链推演闭合；遗留 M-1（Failure Paths inline-commit-fail 行残留 role="alert"）+ m-1（inline-blur 行"不关闭"措辞）+ m-2（In Scope 补 roadmap 勘误入册）→ 三点修正后送 R3 定点确认
  - R3（fresh session `agent_ab8097c2`，定点确认轮）**`pass`**：三点修正全部落地（role 三处取齐、blur 措辞三处取齐、In Scope 入册），规范层零残留、无新增矛盾；非阻塞观察（`data-editable` DOM 属性与 schema `editMode` 属不同层，不冲突，维持原 design）。共识达成，plan 升 `active`

## Deferred But Adjudicated

（无——本计划无执行中改判）

## Non-Blocking Follow-ups

- （无）

## Closure

Status Note: 2026-10-23 关闭。inline-edit 落点裁决（能力扩展 `detail-field.editMode`，被拒方独立 type 理由成文）与 inline 全协议在 `docs/components/detail-field/design.md` 六处定稿；improvement-analysis G2 行登记；roadmap 五处就地勘误（"只读对"失实前提 ×2、`editable`→`editMode` 定稿 ×3）。audit 4 Minor 已随手消化：Minor-1 design.md §7 补错误呈现触发语义（本次回写落）；Minor-2 证据句措辞已修；Minor-3 roadmap §3 第三列勘误风格（信息无损，保留）；Minor-4 行号漂移记录在案（§ 指引仍有效）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `agent_385963fc`，general-purpose，review-only）
- Evidence: closure audit 报告：Phase 1/2 六项 Exit live 逐条成立（design.md:13-20/50-51/60/74-81/99/110）、Failure Paths 七行与 §7 逐行对应、role="alert" 规范层零残留、三项裁决（落点/分歧行/同词异义）经 live 机制与 Arc 源码核验如实、roadmap 五处勘误"保留原文+就地附注"格式合规且 G2D `planned` 无提前回写；verdict `approved`（0 Blocker / 0 Major / 4 Minor）

Follow-up:

- （无剩余 plan-owned work；实现归 G2I）

## 命名 Checklist 核对记录（Phase 2 产出，2026-10-23）

`editMode` 过 `docs/references/naming-conventions.md` §5 九项：

1. **shadcn 对齐** ✓ —— ui 无等价 prop；语义枚举保留领域命名（§4.2 `treeMode` 同族先例）。
2. **受控词表** ✓ —— 新受控词表 `editMode: 'surface' | 'inline'` 成文于 design.md §4；非 shadcn `variant`/`size` 词表范畴；`'surface'` 值与兄弟字段名 `surface` 同词异义已裁定保留（§12）。
3. **布尔肯定式** ✓ —— 暂定名 `editable`（布尔）定稿为枚举 `editMode`（双形态可扩展）；不受布尔规则约束，但保留正向语义。
4. **选项形状** ✓ —— 不适用（无选项集）。
5. **不采纳记录** ✓ —— 独立 type `inline-edit`、`multiline`、motion、Arc 提交失败退出语义均记入 design.md §2 决策表不采纳/分歧行并附理由。
6. **通道归属** ✓ —— `props` 通道（与兄弟 `surface` prop 同通道）；条件渲染走既有 `when`，无散落条件属性。
7. **无平行词汇表** ✓ —— 无 `editModeExpr`/`editModeHandler` 类平行命名；无组件级请求字段。
8. **出处可查** ✓ —— 契约出处 = `detail-field/design.md` §2/§4/§7/§10；对照出处 = Arc `inline-edit.tsx`（live）。
9. **词汇三单源** ✓ —— 不适用（非事件/ownership/行键字段）。
