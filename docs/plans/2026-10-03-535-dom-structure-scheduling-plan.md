# 535 flux-renderers-scheduling 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约，含 Canvas a11y 既有规定）、`docs/backlog/dom-structure-audit-roadmap.md`（W8）、`docs/audits/dom-structure-checklist.md`（D6）
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）；`docs/bugs/78`（canvas a11y 教训来源）

## Purpose

把 flux-renderers-scheduling 全部 renderer type 的 DOM 结构收口到契约 6 维。本包 canvas 密集，已知必修项：gantt/kanban/calendar 三个画布根补 `role="application"` + i18n `aria-label`（既有契约欠账，属性级断言必测），以及 gantt-layout 重复 `nop-gantt` 根标记整改；barcode-input 为自绘字段 chrome 的表单域控件，D6 定性 n-a。

## Current Baseline

> **执行发现（2026-10-03）**：gantt 画布语义已由既有键盘 a11y 层命令式落（use-gantt-keyboard.ts:139-142：role="grid"+tabindex+chartLabel，行/列 roving :35-37）——W8 裁定**保留 grid 语义**（比 application 更精确），JSX 不双写；kanban/calendar 无任何画布语义（真缺口，补 role="application"+i18n aria-label，新 key scheduling.{kanban,calendar}CanvasLabel zh/en 成对）。barcode-input wrap:false 行号实为 :350。

- 组件清单（type 注册于 `scheduling-renderer-definitions.ts`）：gantt → `gantt/gantt.tsx` + `gantt/gantt-layout.tsx`；kanban；calendar；barcode-input——前三者为 canvas/引擎容器 composite，barcode-input 为表单域控件。
- `nop-*` 根类全覆盖（gantt 根在 `gantt.tsx:580`）；`data-cid` 显式携带（gantt:582、calendar:428）；`data-slot` 普遍。
- 必修缺口（D6）：三个画布根均无 `role="application"` + aria-label——`renderer-markers-and-selectors.md` "Canvas / scene-graph interaction surfaces" 节的既有规定，5 包盘点中零命中。
- 已点名嫌疑：`gantt-layout.tsx:100-121` 内层容器**重复输出 `nop-gantt`**（根已在 `gantt.tsx:580`）→ flex 行 → grid 列/分隔条/timeline 列（4 层）。
- 层数基线（列出不解释，审计卡归因）：gantt 根→header/layout→grid+timeline→scroll→bars 6 层；kanban 根→columns(489)→column(232)→body(265)→card(105)→content(95) 6 层；calendar 根→toolbar/view→grid→event 4 层；barcode-input 根(287)→InputGroup→input 3 层。
- **barcode-input 非 FieldFrame 通道**：`scheduling-renderer-definitions.ts:352` `wrap: false` → node-frame-wrapper 裸渲染，组件自绘字段 chrome（`:287` `nop-barcode-input nop-input-text`，无 FieldFrame import）——D6 定性为 `n-a`（非 canvas/引擎容器），豁免依据必须按此真实事实落卡。
- 盘点未发现本包自带设计器 frame。

## Goals

- 全部 type 六维判定落卡
- 必修：三个画布根 `role="application"` + i18n aria-label（`flux.common` 或领域 i18n key，禁止硬编码文案）
- gantt-layout 重复根标记改为 `data-slot="gantt-layout"` 区域标记
- barcode-input D6 `n-a` 登记（自绘字段 chrome 的表单域控件，非 canvas/引擎容器；`wrap:false` 不走 FieldFrame）
- 产出 D6 属性级断言模式（供未来 canvas 类渲染器复用），`dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；甘特/看板/日历交互与布局行为变更
- 画布引擎（自绘/三方）内部 DOM
- 键盘导航等 a11y 行为扩展（本计划只补既有契约的 role/label）

## Failure Paths

| 场景 | 触发 | 行为 | 可重试 | 用户可见表现 |
| ---- | ---- | ---- | ------ | ------------ |
| i18n key 缺失 | 画布 aria-label key 未注册 | 落 key 后再交付（不得回退硬编码） | 是 | 无（label 仅供 AT） |

## Test Strategy

档位选择：`必须自动化`——D6 为可访问性契约且属"检测盲区"（纯逻辑单测测不出），必须属性级断言（`getAttribute('role')` / `getAttribute('aria-label')`）；gantt-layout 标记整改同步断言。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 4 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（4 张，六维判定齐全）；三画布层数归因完整
- [x] barcode-input D6 `n-a` 登记（wrap:false :350 + 自绘字段 chrome :287）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（4/4）；层数归因完整

### Phase 2 - 整改

Status: completed
Targets: `gantt/gantt-layout.tsx`、`kanban/kanban-board.tsx`、`calendar/calendar.tsx`、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`

- Item Types: `Fix | Proof`

- [x] kanban/calendar 根补 `role="application"` + i18n aria-label（新 key scheduling.kanbanCanvasLabel/calendarCanvasLabel，zh/en 成对；Proof 先行失败断言）
- [x] gantt 裁定：既有键盘 a11y 层（role=grid+tabindex+chartLabel）保留，JSX 不双写——D6 由既有层满足
- [x] `gantt-layout.tsx:100` 容器 `nop-gantt` → `data-slot="gantt-layout"`（单根标记）
- [x] barcode-input `n-a` 落卡确认无 DOM 改动

Exit Criteria:

- [x] 属性级断言通过（gantt role=grid/kanban+calendar role=application，label 全非空）
- [x] gantt-layout 标记断言通过；既有包测试无回归（scheduling 1075/1075 = 1072 + 3）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/dom-structure-contract.test.tsx`（3 用例）

- Item Types: `Proof`

- [x] 契约测试冻结：gantt（role=grid 语义 + 三件套 + 单根标记 + layout slot）、kanban/calendar（role=application + label + 三件套）（使用 527 helper；schema 复制自既有集成测试）

Exit Criteria:

- [x] 契约测试落位并通过（3/3）
- [x] roadmap W8 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R3（fresh session，两轮）
- Verdict: pass（Round 1 issues → barcode-input Major 修订；Round 2 指出 Purpose :10 残留旧表述，已改写为 D6 n-a）
- Rounds: 2
- Findings addressed: ①barcode-input 全文统一为 n-a + wrap:false/自绘 chrome 真实依据 ②Purpose 残留清理 ③checklist D6 豁免示例同步改写

## Closure Gates

- [x] 全部 type 审计卡六维收口（4/4）
- [x] 画布 D6 必修项落地且有属性级 proof（kanban/calendar 补 application；gantt 既有 grid 语义层裁定保留）
- [x] gantt-layout 标记整改落地
- [x] `dom-structure` 契约测试冻结（3 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更；gantt grid 语义裁定落卡）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；scheduling 1075/1075 = 1072 + 3）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。kanban/calendar 补 role=application+i18n label（新 key 成对）；gantt 保留既有 grid 命令式语义层（裁定落卡）；gantt-layout 单根标记化；4 卡 + 3 用例契约测试。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_efe1fea1）
- Evidence: approved——4 卡/kanban-calendar role 核对（:452/:481，i18n key :1419-1420/:1424-1425 成对）、gantt JSX 无 role + 命令式层 :139-142 保留、gantt-layout 0 处 nop-gantt、契约 3/3、i18n-contract 19 用例绿；审计提出的 GANTT-DEBUG 探针残留已清理。

Follow-up:

- 见 Non-Blocking Follow-ups
