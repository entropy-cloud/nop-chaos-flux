# 714 Arc G2I — inline-edit 落地（`detail-field.editable`）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/arc-component-gap-roadmap.md` §5.1 G2 / §7 G2I（依赖 G2D done，plan 713）
> Related: 协议权威 `docs/components/detail-field/design.md` §4a（plan 713 裁决）

## Purpose

按 G2D 协议实现 `detail-field.editable` 点即编辑：schema 字段、内联编辑态、提交/取消/失败语义、focused 单测、交付铁律 3/5/6/8。

## Current Baseline（live 核对 2026-10-24）

- 协议已定稿：`docs/components/detail-field/design.md` §4a（内联仅标量契约、editable×transform\* 互斥降级 dialog、click/dblclick 于 viewer 容器、Enter/blur 提交、ESC 取消、`data-slot="detail-field-inline-editor"`）。
- 实现落点：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`（写回管线 :134-180 复用；dialog 路径 :182-388）；schema 类型 `composite-field/composite-schemas.ts:70-79`（`DetailFieldSchema`）。
- 字段规则表 `detailFieldRendererDefinition.fields`（:421-432）需增 `editable`/`editTrigger`。
- 测试先例：`detail-view/detail-field-basic.test.tsx`（`createFormSchemaRenderer` + `baseEnv` harness）；`formStateProbeRenderer` 定义并导出于**本包** `src/test-support.tsx:348`（审查 M2 勘误，非 flux-renderers-form），同包直接 import。
- i18n：内联路径无新增用户可见文案（aria-label 沿用 label，错误走既有链）——铁律 6 核对为零增量。

## Goals

- `editable: true`（且无 transform*/validateValue* 声明）时 viewer 点击/双击进入原位编辑，Enter/blur 提交写回父表单并过 `settleParentValidation`，ESC 取消，失败回滚。
- `editable` 与 transform\* 任一同时声明 → `editable` 无效走 dialog 路径（互斥降级）。
- disabled/readOnly 静态降级；`editTrigger: 'dblclick'` 生效。
- focused 单测（判别性）+ 既有 detail-field 套件零回归；full-green。

## Non-Goals

- 多行/富文本内联、内联×适配组合、scope-only owner 的特殊分支（`parentScope.update` 已由共享 `applyParentWriteback` 覆盖）、design.md 变更（协议已定稿）。

## Scope

### In Scope

- `composite-schemas.ts`：`DetailFieldSchema` 增 `editable?`/`editTrigger?`。
- `detail-field.tsx`：字段规则、互斥判定、内联编辑态（local state）、提交/取消/回滚编排、marker、viewer 点击区。
- 新测试 `detail-view/detail-field-inline.test.tsx`。

### Out Of Scope

- `detail-view.tsx`（纯只读）、surface/draft 控制器、其他组件。

## Failure Paths

（§4a 已定，测试断言面：校验失败保留编辑态且回滚 / ESC 丢弃 / blur 未变不触发 / 异步失败 notify + 回滚。）

## Test Strategy

本档选择：**必须自动化**（写回与取消语义是公共契约行为）。Proof 先行。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: completed
Targets: `packages/flux-renderers-form-advanced/src`

- Item Types: `Fix | Proof`

- [x] `DetailFieldSchema` 增 `editable?: boolean`、`editTrigger?: 'click'|'dblclick'`；definition fields 增两规则（editable `valueType: 'boolean'`）。
- [x] `detail-field.tsx`：`hasAdaptationActions` 判定 + `inlineEditable` 互斥；内联编辑 local state（draft 值 + 提交 token ref 防 blur/Enter 双触发，blur 在 token 非 current 时 no-op）；viewer 容器按 `editTrigger` 绑定 click/dblclick（`presentation.effectiveDisabled`/`readOnly` 时静态；viewer 内可交互子内容 stopPropagation 优先，M3）；编辑态渲染 `data-slot="detail-field-inline-editor"` 内单行 `Input`（autofocus 全选、`aria-label` 沿用 label）；Enter/blur 且值变更 → `applyParentWriteback` → `settleParentValidation` → 失败 `rollbackParentWriteback`（值回原状）、保持编辑态并 `touchField` 使 FieldFrame 错误链可见（M1 错误可见性裁决）；成功 `touchField` 退出编辑态；ESC 取消；`inlineEditable` 时隐藏触发按钮与 surface。
- [x] focused 单测 `detail-field-inline.test.tsx`（Proof，先写）：**判别性（正向）**——editable + click viewer 后 `[data-slot="detail-field-inline-editor"]` 出现且 input 值 = 初始值（`document.activeElement` 断言聚焦），Enter 提交后表单值更新（探针断言）；**错误可见性（M1 判别性断言）**——提交失败 → 仍编辑态、值未变、内联错误节点文本可见 + input `aria-describedby` 指向（`touchField` 同时解除 FieldFrame showError 的 touched 门控）；**回归防护**——默认不可点编辑；ESC 丢弃；blur 值未变不写回；editable+transformInAction 声明 → 触发按钮仍在、click 不进内联；readOnly 点击无编辑态；dblclick 触发生效（单击不进）；viewer 内含按钮 region 时按钮点击 stopPropagation 不进编辑态（M3）；编辑态 marker 存在。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced test -- detail-field` 全绿（新套件 + 既有 basic/commit/unmount/detail-view 套件零回归，判别性：内联编辑态出现断言在无实现时必挂）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 通过。

### Phase 2 — 交付铁律核对

Status: completed

> live 已核实（审查 m1）：`docs/components/detail-field/` 无 example.json；playground 已有 `detail-field-lab-page.tsx`。
> Targets: `docs/components/detail-field/example.json`（如存在）、playground lab、`examples.manifest.json`/`index.md`

- Item Types: `Proof | Follow-up`

- [x] 铁律 3/5：example.json 不存在 → 记录核对结论（detail-field 类型级登记在 manifest/index 已覆盖，能力扩展不单独建文件）；lab 页增 editable 场景。
- [x] 铁律 6：核对零新增 i18n 键（协议无新文案），记录结论。
- [x] e2e：如 lab 无 detail-field 场景路由，focused 单测承载行为证明（记录裁决），不新建 lab 页。

Exit Criteria:

- [x] 铁律 3/5/6 处置逐项落定（改或记录核对结论，无悬空）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-10-24）
- Verdict: `revised` → 共识达成（零 Blocker / 3 Major / 4 Minor，全部当场采纳）
- Rounds: 1
- Findings addressed: M1 内联失败错误可见性裁决（失败也 touchField 走 FieldFrame 错误链 + 判别性断言）；M2 formStateProbeRenderer 出处勘误（本包 test-support.tsx:348）；M3 viewer 可交互子内容 stopPropagation 处置 + 断言；m1 Phase 2 条件式收窄为已核实结论；m2 Failure Paths 指向 §4a 并逐条展开到断言面；m3 jsdom 聚焦断言用 activeElement；m4 blur 双触发与 confirmSequencer token 模式同构（token 非 current 时 no-op）

## Closure Gates

- [x] 所有 in-scope 行为已落地且 focused 单测证明（判别性断言存在）
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（协议已在 plan 713 落稿；本 plan 如有实现层偏离需就地勘误）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（82/82 task 全绿）
- [x] `pnpm check`（零新增未登记红项：scanner-baselines 两处 +2 嫌疑已用 .catch 收敛而非扩 baseline；knip 仅剩 2 条 HEAD 既有漂移，stash 已验证）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- 内联×适配组合（editable + transform\*）如有 demand 另立 plan。

## Closure

Status Note: G2I 全部交付面落地；closure audit R1 `issues`（0B/1M/2m）→ 修复（内联错误节点 role=alert + aria-invalid/aria-describedby、ESC 在途失败值无条件回滚、协议措辞勘误）→ 同 auditor 复验 `approved`（0B/0M/2m 文档对齐项，已在 closure commit 就地勘误）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，2026-10-24，R1 与复验同一 auditor 会话）
- Evidence: R1 issues（Major-1 错误不可见）→ 修复后复验 approved：settleParentValidation onError（detail-field.tsx:191-214）、内联错误节点（:458-466）、failure test 判别断言（detail-field-inline-failure.test.tsx:84-89）、1224/1224 全绿复跑、stash 复验 check 声称（scanner within baseline、knip 2 条 HEAD 既有）。
