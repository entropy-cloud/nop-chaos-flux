# 651 最终成熟度审计 FM-7：系统性根因整改·首批（FM-018 官方 asReactNode 契约缝）

> Plan Status: active
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-7；`docs/audits/final-maturity-audit/ledger.md` FM-018；`missions/final-maturity-audit.json` T4.2
> Related: `packages/flux-core/src/types/renderer-core.ts:91`（RendererRenderOutput=unknown）；49 个渲染器文件本地 asReactNode shim（163 处引用）；plan 649（FM-6 首批先例：批量机械清扫 + 判别纪律）

## Purpose

消化台账 systemic 族首批（FM-018）：为 `RendererRenderOutput = unknown` 渲染出口提供**唯一官方洗型缝** `asReactNode(output): React.ReactNode`（落 flux-react），并以机械清扫替换全仓 49 个文件的手写本地 shim（163 处引用）——收敛契约层缺口，消除 shim 形态漂移土壤。纯类型/导入层重构，零运行时行为变更。

## Current Baseline（2026-10-18 live 核对）

- **契约现状**：`packages/flux-core/src/types/renderer-core.ts:91` `export type RendererRenderOutput = unknown;`——渲染出口类型 unknown 迫使每个渲染器自铸 `value as React.ReactNode` 洗型。
- **shim 普查（live 2026-10-18）**：grep 排除 test/dist = **49 文件 / 163 引用**；其中 **30 个含本地定义**（23 非导出 + 7 导出，形态基本为纯 cast `value as React.ReactNode`）、**19 个为纯导入消费方**。已核实唯一非纯 cast 变体 = `packages/flux-renderers-industrial/src/editor/canvas-view-helpers.ts`（`(value ?? null)` 形态；对应 workaround 注册在其消费方 `renderer/scada-canvas.tsx:4` 头部 WA-industrial-008 ③；全部 9 处调用点——scada-editor-canvas.tsx ×7 + scada-canvas.tsx ×2——均为 `asReactNode(x) ?? fallback`，null/undefined 在 `??` 语义下等价）。清扫按三类处置：本地定义删除→导入 / 导出型改 re-export 或删定义改消费方 import / 纯导入方改 import 来源。
- **ledger 原文修复方向**：FM-018 = "收窄返回类型或提供官方洗型 helper"。本批采 helper 方向（低爆炸半径）；返回类型收窄（unknown → ReactNode|null|string 联合）为后续字母批候选（触及全部渲染器签名，另立裁决）。
- **护栏（单选）**：flux-core **零改动**（React-free 包，`React.ReactNode` 返回类型本就不可落 flux-core；保护区零接触——不触 renderer-core.ts 注释或类型本体）。
- **FM-6 先例机制复用**：批量机械清扫的逐文件核对表（类比 FM-6 审计卡）、全量门禁收口、独立收口审计。

## Goals

- flux-react 导出官方 `asReactNode`（JSDoc 记录其为 RendererRenderOutput 唯一洗型缝 + 为何 unknown 是既定契约）。
- 49 文件清扫完成：本地定义删除 → 导入（或 re-export 保 API 兼容）；非纯 cast 变体逐个裁定并落卡。
- 类型层守卫：新测试钉住官方 shim 的类型面（unknown 入参 / ReactNode 出参）；全仓 `grep -c` 本地定义归零（re-export 除外）。
- ledger FM-018 翻转（found→fixed→verified，附"32 处手写副本"→live 30 定义/49 文件/163 引用的勘误对账注记）；批次记录落账。

## Non-Goals

- RendererRenderOutput 返回类型收窄（字母批候选，独立裁决）；渲染器返回语义变更；flux-core 类型本体修改；任何运行时行为变化。

## Scope

### In Scope

- `packages/flux-react`：新增官方 helper（实现 + JSDoc + 单测 + 入口导出）。
- 49 个 shim 文件清扫，live grep 实际命中 **13 包**：flux-renderers-basic、flux-renderers-content、flux-renderers-data、flux-renderers-layout、flux-renderers-industrial（含唯一变体 canvas-view-helpers）、flux-renderers-pivot、flow-designer-renderers、report-designer-renderers、spreadsheet-renderers、word-editor-renderers、flux-renderers-form-advanced、flux-renderers-dashboard、flux-renderers-graph。
- 各包 barrel 如需 re-export 的最小接线。

### Out Of Scope

- 返回类型收窄；shim 调用点语义重构（只替换定义来源，不改调用形态）；test/dist 文件；并发会话领地（form.tsx IME 面、xlang）。

## Failure Paths

| 编号         | 触发                                    | 行为                                                                                                                                                 | 可重试 | 用户可见表现 |
| ------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| shim-variant | 本地 shim 含非纯 cast 逻辑（变换/降级） | **改名迁移**（保留语义，如 `asReactNodeOrNull`）并落裁定卡；头部 workaround 注册（WA-industrial-008）同步对账；退出 grep 以官方落点 + 改名件为白名单 | 是     | 无           |
| api-break    | 本地 shim 被**包外**消费（跨包 import） | 改 re-export 保 API 兼容；若为私有误用则收紧并落卡                                                                                                   | 是     | 无           |
| circular-dep | 导入官方 helper 造成循环依赖            | 官方 helper 落点下沉至无依赖层或该文件保留本地 cast + 注记指向官方缝                                                                                 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——官方 helper 补类型面单测（已知入参形态的出参断言）；清扫本体为纯导入重构，以 typecheck 全绿 + 全量套件 + grep 归零核验为判别（无行为可测面，如 One might say "Not applicable"，但 helper 单测构成判别面）。

## 口径执行模型声明

- **执行载体**：主会话机械清扫（grep 驱动逐文件核对表），shadcn 式小步提交粒度（按包分组推进），每包 typecheck 即时验证。
- **bounded 单轮**：49 文件上界；含非纯 cast 变体超预期（>10%）时按 shim-variant 路径收紧本批范围。
- **保护区域**：flux-core 零类型本体修改；renderer 定义字段零接触。

## Execution Plan

### Phase 1 - 官方 helper + 类型面测试

Status: done（2026-10-18）
Targets: `packages/flux-react/src/`（落点如 renderer-contracts 或 react-node.ts，行级定）

- Item Types: `Proof | Fix`

- [x] Proof：官方 `asReactNode` 类型面单测——**类型级断言**（`expectTypeOf` 或可赋值性检查钉住 unknown 入参/ReactNode 出参，含 `@ts-expect-error` 反例拒绝非 cast 误用）+ null/string/element 透传语义对照（运行时断言仅作辅助，不构成判别）。
- [x] Fix：实现（`packages/flux-react/src/as-react-node.ts`）+ JSDoc + index 导出。

Exit Criteria:

- [x] helper 单测 2/2 绿（expectTypeOf + @ts-expect-error 反例）；flux-react 套件全绿。

### Phase 2 - 49 文件机械清扫

Status: done（2026-10-18；23 删除→导入 + 6 re-export + 19 导入方改源 + 1 变体改名迁移 = 49）
Targets: grep 命中的 13 渲染器包（49 文件清单执行期生成，工作副本 `_tmp/fm7-sweep.md`，裁定摘要持久化至 ledger）

- Item Types: `Fix | Decision`

- [x] Fix：三类处置——非导出定义（23）删除→import 官方缝；导出型定义（7）改 re-export 或删定义改消费方 import（零跨包消费已核实，优先删定义）；纯导入消费方（19）改 import 来源。变体文件（canvas-view-helpers）按 shim-variant 路径改名迁移 + WA-industrial-008 对账 + 裁定卡。
- [ ] 每包 typecheck + 该包套件即时验证；清扫核对表落 `_tmp/fm7-sweep.md`（文件 → 处置 → 变体注记）。

Exit Criteria:

- [x] 归零核验：`grep -rlnE "function asReactNode\(|const asReactNode = " packages`（排 test/dist）= 仅官方 `as-react-node.ts`（变体已改名 asReactNodeOrNull）；全量 typecheck 绿（唯 playground 既有红）；核对表裁定摘要 + 归零核验持久化至 ledger FM-7 批次记录（`_tmp/fm7-sweep.md` 工作副本）。清扫附产：35 处 vi.mock('@nop-chaos/flux-react') factory 补 asReactNode 透传、6 处残留未用 RendererRenderOutput 导入清扫、gantt.test.tsx 触 700 行限按 10-16 先例压缩回收、metamodel-residue 白名单行号位移维护（98→95）。

### Phase 3 - 全量门禁 + 收口

Status: done（2026-10-18）
Targets: ledger、roadmap、mission、daily log

- Item Types: `Proof | Fix`

- [x] Proof：全量门禁（typecheck/build/lint/test/check 并发归属口径）。
- [x] Fix：ledger FM-018 翻转（found→fixed→verified，附 30 定义/49 文件/163 引用 勘误对账注记）+ FM-7 批次记录；roadmap FM-7 行裁决；mission T4.2 翻转；daily log（随收口提交落盘）。

Exit Criteria:

- [x] 门禁基线达标（lint 44/44、test 82/82、typecheck/build 唯 playground 既有红、check 零新红）；多面回写一致（ledger/roadmap/mission）；uncovered=0 维持。

## Draft Review Record

- Reviewer / Agent: agent_a3ee280d（fresh session 独立子 agent，单轮，live 抽查 19 tool-uses）
- Verdict: `revised`（R1 0B/3M/6m → 全量修订；评审实证数字底座 49/163、纯 cast 29/30、13 包依赖方向、React-free 护栏全部为真）
- Rounds: 2
- R2 复审（agent_d1974fc8）：verdict `approved`（无需第三轮）——R1 九项全数核实修复，数字底座独立复核为真；4 项 m 级残余随激活本次编辑顺手修正（m-A 13 包实名补齐 / m-B WA 注册落点改 scada-canvas.tsx:4 / m-C 调用点 8→9 / m-D Last Reviewed 落日期），并采纳非阻塞观察：flux-react 自家 test-support 两处本地 shim 在收官时补 Non-Blocking Follow-ups。
- Findings addressed: M1 mission 任务号 T5.1→T4.2（Source/Phase 3/Exit 三处）；M2 变体豁免机制改为改名迁移（asReactNodeOrNull 形态）+ WA-industrial-008 对账 + 白名单退出 grep，消除与归零判定的自斥；M3 In Scope 改 live 实际 13 包清单；m1 三类处置拆分（30 定义=23 非导出+7 导出 / 19 纯导入方）；m2 核对表证据持久化至 ledger、\_tmp 降级工作副本；m3 ledger 勘误对账注记 + 翻转路径 found→fixed→verified；m4 flux-core 零改动单选（删注释分支，绕开保护区张力）；m5 Phase 1 Proof 补类型级断言（expectTypeOf/@ts-expect-error 反例）；m6 Phase 2/3 补 Item Types。

## Closure Gates

- [x] 官方 helper + 类型面测试在案；本地 shim 归零（re-export 除外）核验在案（grep 收敛 = 仅官方 as-react-node.ts）
- [x] 非纯 cast 变体全部裁定并落卡（唯一变体 canvas-view-helpers 改名 asReactNodeOrNull，裁定注记在文件头 + ledger 批次记录；核对表 `_tmp/fm7-sweep.md` + ledger 持久摘要）
- [x] ledger FM-018 翻转 + 批次记录一致，uncovered=0（含 32→30/49/163 勘误对账）
- [x] 受影响 owner docs 已同步或明确 No owner-doc update required——No owner-doc update required（纯类型/导入重构，零行为变更；flux-core 零接触）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure 节）
- [x] `pnpm typecheck`（唯一 playground vite.config 既有红，归属在案）
- [x] `pnpm build`（唯同红）
- [x] `pnpm lint`（44/44）
- [x] `pnpm test`（82/82 tasks exit 0）
- [x] `pnpm check`（审计 B1 处置后全链复跑：exit 1 唯一残余 = knip xlang mock-server【并发线领地，多批在案披露】；oversized 三文件均登记豁免、gantt.test.tsx 触限已按先例压缩回收；metamodel-residue 白名单行号位移维护；链末 3 子检查单独补跑全净。首轮门禁陈述曾漏读 oversized 短路——审计抓出后如实更正）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Closure

Status Note: completed（2026-10-18 独立收口审计首轮 `issues`（1B/1M/1m 三组），处置后按审计授权签署收口）

Closure Audit Evidence:

- Auditor / Agent: agent_0580eee5（fresh session 独立收口审计员，只读，60 tool-uses，复验日志 `_tmp/fm7-audit-check.log`）
- Evidence: 首轮 verdict `issues`——**工程本体全绿**（A 归零 grep 独立复现；B 变体 9 处调用点逐字节等价改名、WA-industrial-008 对账在案；C 纯 cast 抽查 7+6 文件定义体/import 无混入；D mock 透传语法无扰 + data 1254/1254；E 三受影响包实跑 flux-react 629/629 + data 1254/1254 + industrial 1721/1721；F 回写三面一致、closure 门留空纪律正确；G **flux-core 零 diff**、保护区零接触、form.tsx IME 面归属可区分）。**处置清单**：B1 gantt.test.tsx 被 mock 补丁推过 700 行限（首轮"check 零新红"证词失实——check 链在 oversized 短路致漏读，审计实测复现）→ 按 10-16 先例压缩回收 699 行 + **全链复跑**（链末 3 子检查因 knip 红短路未达，单独补跑：raw-schema-reads 净 / metamodel-residue 净〔白名单行号位移 98→95 维护〕/ designer-conformance 净）+ gate 行如实更正；M1 收口提交显式逐文件 stage（并发 form.tsx IME 面等排除，严禁 add -A）；m1 数字更正（vi.mock 透传 16→35、清扫分解 23+6+19+1=49、163 为 grep -c 行口径）。

Follow-up:

- RendererRenderOutput 返回类型收窄裁决（FM-7-b 字母批候选）；flux-react test-support 两处遗留 shim 切官方缝（Non-Blocking Follow-ups 在案）。

## Non-Blocking Follow-ups

- RendererRenderOutput 返回类型收窄裁决（字母批候选）；FM-032 等 watch-only systemic 项维持原处置。
- flux-react 自家 test-support（test-support-core.tsx / test-support-runtime.tsx）两处本地 asReactNode shim 在 test 排除口径外遗留——收官切换官方缝（不影响生产面）。
