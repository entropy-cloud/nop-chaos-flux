# 728 审计修复 R2·R2.6：契约补测—mobile 族（P1-MA4.3-002/003/004）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.6（MR2.0/plan 713 展开）；`docs/audits/2026-10-21-1524-arm2-MA4.3-content-domain-tests.md` §P1-MA4.3-002/003/004（各含最小补强规格）；owner doc `docs/architecture/renderer-runtime.md`
> Related: M8-M11 新组件覆盖双峰族；先例 plan 723/724/726/727（同构契约补测链）
> 编号 runway：727 为 R2.5（本线）；728 本 plan；ARC 线从 729 起避开

## Purpose

为 mobile 族三条「组件级契约零守护」finding 补测：002 wheel-time-picker（16 个注册 renderer 唯一组件层空白——minuteStep 生成列 + confirm→HH:mm 值链）；003 wheel 家族表单写入**正路径**（单测只有无-owner 负分支、e2e 只查弹层关闭——有 form owner 的写入+校验链零断言，「只有负面没有正面」）；004 image-viewer 双指 pinch（9 例全单指，删掉 pointers 累积逻辑现有测试仍全绿）。三条 finding 回填 `closed`。

## Current Baseline（2026-10-24 live，HEAD `8f237d3f2` 实测）

- **002**：`packages/flux-renderers-mobile/src/wheel-time-picker.tsx:17-19`（minuteStep→wheelTimeColumns）、:39-54（confirm→encodeTime→setValue/validateField→onConfirm payload {type,value}）；`wheel-date-columns.ts:105-116`（wheelTimeColumns：24h + 60/step 分钟列）+ :118（encodeTime HH:mm）。现有测试仅 `mobile-markers-contract`/`mobile-renderer-definitions` 名单级命中。harness 惯用法：`wheel-picker-family.test.tsx`（createMockRendererProps + dragStrip touch 序 + `data-slot="wheel-picker-confirm/cancel"` + `data-column/data-active/data-index`）。
- **003**：同 confirm 链；负分支已测（`wheel-picker-family.test.tsx:141-158` capability-guarded skip）；正路径（有 form owner）零断言。mobile deps 无 flux-renderers-form——integration 需 devDep（form-advanced 先例：devDeps 含 flux-renderers-basic/data 作 integration 测试依赖）。
- **004**：`image-viewer.tsx:61-62`（pointers Map + pinchStartRef）、:92-137（onTouchStart 双指→pinchStart distance；onTouchMove 双指→resolveGesture('pinch')→pinchMatrix+panClamp→setTransform）、:225（`data-scale={t.scale}` 可观 surface）；`viewer-matrix.ts:10-11`（MIN_SCALE=1/MAX_SCALE=4，clampScale）。`image-viewer.test.tsx` 9 例全单指（grep pinch|PointerEvent=0）。
- roadmap R2.6 行 `todo`（:103）；arm2-index :147（002）/:148（003）/:149（004）状态 `open`、修复列 R2.6。

## Goals

- 三条契约测试落地（mobile 组件级 2 + integration 1），各带红证（临时变异实现，复员后提交）。
- 三 finding 回填 `closed`；roadmap R2.6 翻转。

## Non-Goals

- 不改任何实现代码（补测行纪律）；不处理 MA4.3 其余 finding（R2.7 独立行）；不新增 e2e；并发线隔离。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-mobile/src/wheel-time-picker.test.tsx`（新建，002——组件级 minuteStep 列 + HH:mm confirm 值链）
- `packages/flux-renderers-mobile/src/wheel-time-picker-form-write.test.tsx`（新建，003——真实 form owner integration）
- `packages/flux-renderers-mobile/package.json`（devDeps + `@nop-chaos/flux-renderers-form: workspace:*`，003 integration 依赖，form-advanced 先例）
- `packages/flux-renderers-mobile/src/image-viewer-pinch.test.tsx`（新建，004——双指 PointerEvent/touch 序缩放+边界）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.6 翻转（激活/收口两提交）

### Out Of Scope

- 实现代码变更；R2.7-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号 | 触发                                                             | 行为                                                                            | 可重试 | 用户可见表现         |
| ------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ | -------------------- |
| api-shape    | 集成 API 形状与规格不符（form schema 渲染/probe 接线/drag 步进） | 以既有同类测试先例校正规格，plan 补记                                           | 是     | 不适用（测试行为面） |
| contract-gap | 003 真实 form 下 confirm 写入不生效（写入链另有断点）            | 停：升级新 finding（live defect），不静默扩修复面                               | 否     | 不适用               |
| flake        | pinch 序在 jsdom 下不稳定                                        | 用确定性 touch 序（固定 clientX/Y 差值）+ data-scale 直接断言；仍不稳 plan 补记 | 是     | 不适用               |

## Test Strategy

本档选择：**必须自动化**——红证 = 临时变异实现（002/003/004 各一处），变异复员后提交，红证输出入 plan。判别机制（Rule 13）：002 删 minuteStep 归一（minuteStep 恒 1）→ 步进列断言红；003 删 setValue 写入（capability-guard 写路径短路）→ store 值断言红；004 仅禁 onTouchMove 的 pointers 更新（touchStart 保留 populate；外科化保既有单指用例全绿）→ move 距离冻结、data-scale 恒 1 → 新测试红。

## Execution Plan

### Phase 1 - 三测试落地（各先红后绿）

Status: planned
Targets: 三测试文件 + package.json devDep

- Item Types: `Proof`

- [ ] T1（002，wheel-time-picker.test.tsx，沿 family harness 惯用法）：**A** `wheelTimeColumns(5)` 纯断言（2 列、24 时、分钟 12 格 0..55 步进 5）+ minuteStep=5 组件 popup DOM 分钟列行数/首标签；**B** 值链：初始 '08:30' → trigger 开弹层 → 分钟列 drag 一格（-44px → +1 步进 35）→ confirm → onConfirm payload `{type:'confirm', value:'08:35'}` + 弹层关闭。红证：**M-A** wheel-time-picker.tsx:17 minuteStep 归一恒 1（`typeof slotProps.minuteStep === 'number' ? 1 : 1` 形态）→ A 步进列断言红。
- [ ] T2（003，wheel-time-picker-form-write.test.tsx，真 form owner integration）：createSchemaRenderer([...formRendererDefinitions, ...mobileRendererDefinitions]) + schema `form(data:{time:'08:30'}) > wheel-time-picker{name:'time', required}` + 自定义 store 探针 renderer（useCurrentFormState 读 values.time 与 fieldStates）；trigger → 弹层 → 分钟 drag 一格 → confirm → 断言 store `values.time === '08:35'`（写入生效，硬断言）+ **fieldStates['time'] === undefined**（诚实钉住 no-op 语义——review R1 M1 勘正：wheel-time-picker 无 validation contributor，required 属 FieldFrame 展示位，validateField 早退无状态提交，store.setValue 只写 values）。红证：**M-B** wheel-time-picker.tsx:41 写入分支短路（`if (false && slotProps.name && form)`）→ store 值断言红。
- [ ] T3（004，image-viewer-pinch.test.tsx，沿 image-viewer.test.tsx harness）：双指 touch 序——touchStart 双触点 **必须带 distinct identifier（0/1）**（review R1 M2：无 identifier 则 pointers Map 单键碰撞、size 恒 1、resolveGesture 永不 pinch）(100,300)+(300,300)（distance 200）→ touchMove 张开至 identifier 0/1 (50,300)+(350,300)（distance 400）→ 断言 `data-scale` ≈ 2（>1 即缩放生效；夹取 MAX_SCALE=4）；**边界**：继续张开至 distance 1200 → data-scale 夹取 4（clampScale）；touchEnd → 双指复位。红证：**M-C**（review R1 M3 外科化：仅 onTouchMove 的 `pointers.current.set(...)` 置 no-op——touchStart 照常 populate，pinchStart distance 200 冻结 → move 不更新 → requested 恒 1；若双 set 全禁将连带杀死 count===1 分支、既有 pull-down/paging 用例红，违审计「现有测试仍全绿」前提）→ 新测试 data-scale 恒 1 红、既有 9 例全绿（判别面精确）。

Exit Criteria:

- [ ] 三测试绿证 + 三红证留痕（实测计数填入；变异均复员，实现文件 diff 空——003 的 devDep 为唯一 package.json diff）
- [ ] mobile 包套件全绿（pnpm --filter 正确 cwd 口径，计数实测）

### Phase 2 - 索引回填与收口

Status: planned
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [ ] arm2-index 三行回填：:147（002）/:148（003）/:149（004）→ `closed` + 注记（含红证机制）；Last Updated 滚动
- [ ] roadmap R2.6 `planned`→`done` 翻转（IN closure commit；激活提交先行 `todo`→`planned`）

Exit Criteria:

- [ ] arm2-index 三行状态与注记实测一致（open 51→48）；roadmap R2.6 行 `done`（收口提交内）
- [ ] daily log R2.6 条目在场

## Closure Gates

- [ ] 全量门禁：typecheck / build / lint（44/44）+ test 82/82
- [ ] `pnpm check` 零新增红（scanner/knip 已登记口径沿 725-727；devDep 新增对 knip 的 unlisted/dep 影响核验）
- [ ] 三红证全部复员（实现文件 `git diff HEAD` 空）
- [ ] 独立 closure audit（fresh sub-agent，输入=plan+diff summary+验证输出）：三 finding 闭环判定、红证判别力复核（auditor 独立重演至少 2 个变异）、零实现变更确认
- [ ] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **003 校验状态断言深度**（review R1 M1 勘正后重述）：wheel-time-picker 无 validation contributor（validation-collection.ts :120 门排除），required 属 FieldFrame 展示位非编译规则——validateField('time','change') 为 no-op 且不产生 fieldStates 条目。断言面：store 值硬断言 + `fieldStates['time'] === undefined` 诚实钉住 no-op 语义；校验管道 live 性由同 harness 既有 form 字段面承担（非本测试构造完整校验模型）。Classification: watch-only residual。Why Not Blocking Closure: 审计最小补强核心=写入正路径（store 值），校验状态以真实语义（无 contributor→无条目）钉住而非假绿。Successor Required: 否。
- **004 e2e 双指**：审计证据段提及 e2e 也无双指——本行补组件级 integration 即最小补强；e2e 手势属 e2e-standards 范畴（R2.12/R2.13 门禁行）。Classification: out-of-scope improvement。Why Not Blocking Closure: 组件级已钉编排契约。Successor Required: 否。

## Draft Review Record

- R1（fresh sub-agent agent_206ab350，2026-10-24）：**FAIL** 0B/1M/3m——M1 T2 校验腿失实（wheel-time-picker 无 validation contributor、required 属 FieldFrame 展示位、validateField 早退无状态提交——改诚实 no-op 钉：values 硬断言 + fieldStates undefined）；M2 T3 必须 distinct identifier 0/1（无则 pointers Map 单键碰撞永不 pinch）；M3 M-C 外科化（仅禁 onTouchMove set，保既有单指用例全绿合审计前提）；M4 行号（:92-137/:225）。深链证据 validation-collection.ts:120 门 / form-runtime-validation.ts:519-521 / form-store.ts:586-591。
- R2（同一评审 agent 复审，2026-10-24）：M1-M4 全数确认已解；M5 残留一处修订伪影（T2 勾选预打 [x]）随本激活提交翻转 [ ]——**共识 pass**（评审者明示该单字符翻转后即达共识，无需再轮）。准予 `active`。

## Non-Blocking Follow-ups

- 无（002/003/004 最小补强即全量规格）。

## Closure

- [x] R2 共识（pass，M5 单字符翻转随激活落）后激活提交（Status→`active` + roadmap R2.6 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
