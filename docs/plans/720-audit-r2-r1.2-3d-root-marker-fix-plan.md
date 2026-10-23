# 720 审计修复 R2·R1.2：结构契约修复—3d 语义根 marker 补齐（P1-MA1.5-001）

> Plan Status: active
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R1.2（MR1.0/plan 711 展开）；`docs/audits/2026-10-19-1307-arm2-MA1.5-domain-structure.md` §P1-MA1.5-001（修复方向在案：根元素补 `nop-three-canvas` + 判别测试）；`docs/architecture/renderer-markers-and-selectors.md` §Root Marker Rules（`nop-` 前缀、仅身份、不编码 region/state、不内嵌布局色彩）
> Related: live 锚点 `packages/flux-renderers-3d/src/renderer/three-canvas.tsx:144`（draft review 重钉，报告期 :125）；扫描器豁免盲区 = P2-MA1.5-002（本行不含，归 MG/MA8.3 工具面）
> 编号 runway：719 为 R1.1（本线）；720 本 plan；ARC 线后续从 721 起

## Purpose

为 flux-renderers-3d 根元素补 `nop-three-canvas` 语义 marker（全包唯一根身份锚点），使宿主 CSS/测试定位/审计工具按 renderer-markers-and-selectors.md Root Marker Rules 契约寻址；判别测试先红后绿（Cross-Cutting 11）。

## Current Baseline（2026-10-24 live，HEAD `51a796b00`）

- `three-canvas.tsx:144` 根元素 `className={cn('three-canvas', className)}`——裸类无 `nop-*` 语义 marker；3d 包 `nop-` 命中仅 `@nop-chaos/*` import 路径（`nop-three`/`nop-3d` 全仓零命中）。
- 对照组全部实存：industrial `nop-scada-*` 族、graph `nop-graph`、map `nop-map`、basic `nop-container` 等。
- owner doc §Root Marker Rules：`nop-` 前缀 + 仅身份（Examples 列表为示例非穷举——`nop-three-canvas` 命名合规，无需改 owner doc）。
- 现有测试 `three-canvas.test.tsx:67` 断言 `classList.contains('three-canvas')`、:75 用 `.three-canvas` 选择器——**追加类不破坏**（旧类保留向后兼容）。
- roadmap R1.2 行 `todo`；arm2-index P1-MA1.5-001 修复行 `R1.2`、状态 `open`。
- 同包内子元素用 `data-slot="three-canvas-loading"` 等模式——根 marker 用类、子元素用 data-slot，互不冲突。

## Goals

- 根元素 className 追加 `nop-three-canvas`（保留原 `three-canvas` 裸类）。
- 判别测试：断言根元素含 `nop-three-canvas`（旧实现必挂、新实现过，Cross-Cutting 11）。
- roadmap R1.2 `todo`→`planned`（激活）→`done`（收口）；arm2-index P1-MA1.5-001 回填 `closed`。

## Non-Goals

- 不修扫描器豁免逻辑（P2-MA1.5-002 独立，归 MG/MA8.3 工具面批）；不改裸 `three-canvas` 类（向后兼容）；不动 owner doc（Examples 非穷举）；不处理 MA1.5 报告 P2/P3 其他项。

## Scope（必填节）

### In Scope

- `packages/flux-renderers-3d/src/renderer/three-canvas.tsx`：根 className 追加 `nop-three-canvas`。
- `packages/flux-renderers-3d/src/renderer/three-canvas.test.tsx`：判别断言追加（新断言用例或既有用例内补断言——先红后绿纪律：在未改实现的工作树上先证新断言红）。
- `docs/audits/arm2-index.md`：P1-MA1.5-001 回填；本 plan 状态流转 + daily log + roadmap R1.2 翻转（激活/收口两提交）。

### Out Of Scope

- 扫描器修复；裸类移除；owner doc 改动；并发线（ARC 716/717 线、三项遗留）。

## Failure Paths

| 可测场景编号 | 触发                  | 行为                                                                                                                   | 可重试 |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| vis-reg-hit  | 视觉回归/快照因新类挂 | three-canvas-visual.spec.ts 无截图基线（实测），本行纯应急预案；如触发按基线重生成流程走 `_tmp/baselines/`，不提交 PNG | 否     |
| consumer-hit | 宿主选择器与新类冲突  | `nop-three-canvas` 全仓唯一性预检（Phase 1）                                                                           | 否     |

## Test Strategy

本档选择：**必须自动化**——marker 契约是公开样式契约；判别测试先红后绿（旧实现无 marker 必挂）。

## Execution Plan

### Phase 1 - 判别测试先行（红）

Status: planned
Targets: `packages/flux-renderers-3d/src/renderer/three-canvas.test.tsx`

- Item Types: `Proof`

- [ ] 唯一性预检：`nop-three-canvas` **代码面**（packages/ apps/ tests/）零命中（命名无冲突；docs 侧 4 处在案为审计/计划文档记载，不计）
- [ ] 新增判别断言（新用例或 :62 用例内补）：根元素 `classList.contains('nop-three-canvas')` ——运行证实**红**（旧实现无 marker）

Exit Criteria:

- [ ] 判别测试红在案（旧实现必挂实证）

### Phase 2 - marker 实装（绿）与收口

Status: planned
Targets: `three-canvas.tsx`、`docs/audits/arm2-index.md`、roadmap、daily log

- Item Types: `Fix | Proof`

- [ ] `three-canvas.tsx:144` className 改 `cn('nop-three-canvas', 'three-canvas', className)`
- [ ] 判别测试转绿 + 既有 3d 套件全绿（含 .three-canvas 选择器兼容实证）
- [ ] arm2-index P1-MA1.5-001 `open`→`closed` + 注记
- [ ] draft review 通过后：R1.2 `todo`→`planned` 翻转入激活提交，plan→`active`；closure audit approved 后 R1.2 `planned`→`done`、plan→`completed`
- [ ] daily log 追加；两提交显式路径、并发线不入 stage

Exit Criteria:

- [ ] 判别测试绿；3d 包测试全绿；两 finding 状态一致；R1.2 `done` 回读核验

## Draft Review Record

- Reviewer / Agent: 独立 fresh-session 审查子代理 `agent_9b08617d`（五项检查全 PASS——cn 参数序专项：twMerge 透传非工具类、全仓无 class 序/全串相等断言、追加类零副作用；:67/:75/:62/:144/:158 逐点命中）
- Verdict: R1 `pass-with-minors`（0B/0M/4m）→ **共识可升 active**
- Rounds: 1
- Findings addressed: m1 唯一性预检 scoped 代码面；m2 Closure Gates 补 build/lint；m3 Baseline「仅」字放宽（schema $id 例外在案）；m4 vis-reg 行改应急预案措辞不提交 PNG——均已落字

## Closure Gates

- [ ] 判别测试先红后绿在案（红证 + 绿证）
- [ ] 既有 3d 套件全绿（无回归）
- [ ] arm2-index P1-MA1.5-001 `closed` + 注记
- [ ] 不存在被静默降级的 in-scope 项
- [ ] 由独立子代理（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（待执行中落账。）

## Non-Blocking Follow-ups

- 扫描器豁免修复（P2-MA1.5-002）归 MG/MA8.3 工具面批。

## Closure

Status Note: （待收口）

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
