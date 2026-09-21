# 483 视觉质量 V12a：一致性豁免治理与 followups 处置 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V12a-consistency-governance.md`（独立核实 revised → 勘误回写后 pass；执行遵其 §6 勘误——A2 出清量按执行前重算值（预期 ~105）、raw-error 分派 16 结构化 / 31 UI 直出、89/121 = 73.6%）、`docs/backlog/visual-quality-roadmap.md` V12a 行（:32/:112-115）、`docs/audits/visual-quality/consistency-debt.md`、`docs/audits/visual-quality/README.md:55-62`（对照协议）、`exemption-baseline-v0.json`、`docs/backlog/audit-followups-2026-08-11-1929.md`、`docs/backlog/audit-followups-2026-08-28-1659.md`
> Related: `docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（门禁 `--json` 与 v0 快照来源）；successor 归口：roadmap V11a / V11b / V12b / V12c 行（plan 未起草，roadmap 行即 successor 声明）

## Purpose

把路线图 V12a 收口：豁免治理三步（README 协议 v1 修订 → 四包前缀豁免收紧为文件级 → `exemption-baseline-v1.json` 落定）恢复四包局部门禁；A2 规则收敛消除 `hsl(var(…))` 假阳性出清面；raw `error.message` 双轨按 16 结构化 / 31 UI 直出分派统一；08-11 / 08-28 两批 audit-followups 逐条处置回写；闭环指标对 v1 基线可归因（entries 不增、instances 单调不增、newHits 恒 0）。

## Current Baseline

- **门禁机制**：`scripts/audit/find-ui-consistency-gaps.mjs` 四规则（hardcoded-literal-color / hardcoded-cjk-ui-copy / raw-error-message-direct-out / data-blob-href-without-download，:300-405）；扫描域 = `packages/flux-renderers-*/`（前三条）+ `apps|packages`（第四条）；豁免表 `EXEMPTIONS`（:71-288）共 32 条目（**6 条前缀** + 26 文件级），`exemptionFor`（:427-434）用 `filePath.startsWith(entry.path)` 前缀匹配——整包豁免的机制根源；`--json`（:487-530）输出确定性排序载荷，`newHits` > 0 翻红退出码；`totals.files` 为唯一 `(rule,file)` 对数（非文件数）。已挂 `pnpm check` 链（package.json:8）；脚本单测 `scripts/__tests__/find-ui-consistency-gaps.test.ts` 已在。
- **四包前缀条目**：scheduling（:74，全规则，130 实例/37 对）、industrial（:82，全规则，121/41）、3d（:90，全规则，6/4）、form-advanced（:206，仅 raw-error，13/7）；对照用 rule-scoped 前缀 map / content（18/3/3、4/3/3，勘误③）不收紧。四包合计 270 实例 / 86 文件 / 89 对 = 121 对的 73.6%（勘误③）。
- **数字链（勘误①后）**：D2 收口 399/116/30 → v0 快照 413/121/32（2026-09-19，随 plan 470 提交）→ live HEAD 39a2f38ab 444/121/32、newHits=0（2026-09-21 只读复跑）。+31 全部落在 `flux-renderers-ai/src/styles.css` × hardcoded-literal-color（42→73）：29 行 `hsl(var(--x, fallback))` 令牌消费（plan 472 提交 03add8bc4 写入）+ 2 行 `rgb(0 0 0 / 0.45)` 真硬编码。`hsl(` 正则（:314）无法区分 var fallback，属规则假阳性面；**全仓同形态出清量执行前须重算，研究测算 ~105**（ai 67 / chart-renderer 10 / map 10 / graph 6 / 其余 12；v0 基数 42 中本有 38 行同形态），post-A2 live ≈ 339。
- **raw error.message 双轨（勘误②后分派 16/31）**：规则 live 豁免 47 实例 / 34 对，V0→live 零漂移。**结构化诊断族 16**（industrial 11 + 3d 4 + ai 1）不进用户 JSX，是诊断载荷；SceneManager 系 color 命中非 raw-error。**UI 直出族 31**（form-advanced 13、data 5、scheduling 4、form 3、map 3、layout 1、pivot 1、basic 1）。双轨实证同族并排：统一轨 `use-barcode-camera.ts:95-101`（`err.name` 分派 i18n 键 + `t(key, { message })` 插值，filterLine :380 显式豁免该通道）vs 直出轨 `use-barcode-detect.ts:111`（raw message 直入 UI 状态，live 复核在）。既有通道构件齐备：`env.notify`（`flux-core/src/types/renderer-api.ts:189`）、`reportRuntimeHostIssue`（`flux-core/src/utils/runtime-host-reporting.ts:21-30`）。
- **08-11 批**：P2-09/10/11 已修（plan 1929-1 completed，live 注释/实现在）；open 视觉项 live 复核——P2-13 `flux-renderers-layout/src/timeline-renderer.tsx:190/:218`（rootDisabled 仅守 seek，条目无 aria-disabled）、P2-14 `flux-renderers-basic/src/button.tsx:256-266`（anchor 透传 target 无 rel；先例 `content/link.tsx` resolveRel）、P2-19 裸 button `flux-renderers-dashboard/src/editor/editor-palette.tsx:49`、`editor-canvas.tsx:239`（memo 半边随 08-28 批 c）、P2-25 `flux-renderers-basic/src/page.tsx:175`（`footerClassName.includes('fixed')` 子串嗅探）、P2-18 部分残余（link rel / stat-tile 常量 / markdown data-state 似已修待核；card 键盘、fieldset collapsed open）、P2-15 input-number badInput（语义非机械修）、P2-16 dashboard `canvasWidth=1200`（roadmap V11b 节 :110-112（canvasWidth 交付在 :112） 已声明同一交付）。P2-12 timeline 审计卡（`docs/audits/per-component/timeline.md` dim 3 仍写 display-only，live 已有 defaultValue/setValue）随 docs pass 收。其余 open 项非视觉，不入本 plan。
- **08-28 批**：16 P2 + 3 observation 全部 `[ ]`（抽查 05-01/09-02/14-01/19-02/obs-1 live 确认未修）；23 条 P1 已随 plans 1941-1/2/3 收口（均 completed + closure audit，1941-1 转述按核实勘误④口径）。12 条入批修（批 a 诊断 gate：09-02/15-01/19-02/19-03；批 b 测试卫生：14-01/14-02/14-04/23-03/23-04；批 c 类型/订阅卫生：05-01/09-01/13-04），4 条 adjudicated/watch（07-01、13-01、20-06、20-09），obs-1 并入批 c、obs-2 watch、obs-3 流程记录。
- **协议冲突在案**：README:62 协议①「`totals.entries`（32）不得增加」按 v0 口径写死，与收紧（32→至多 117）字面冲突——须先修订协议再动豁免表，顺序不可倒置（否则 v0 对照链断裂）。台账勘误：169 条 P2 池裁决在 `docs/analysis/ui-review/R2-consistency-audit.md`（:189），87 条 P3 池见 `docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md`；V12b/V12c 均 `todo`，非本 plan 交付面。

## Goals

- A1：四包前缀豁免收紧为文件级（`startsWith` 对全路径天然成立，零匹配逻辑改动；上界 89 对，A2/A3 落地后按余量实收）+ EXEMPTIONS path 形态守卫，防前缀形态回潮。
- A2：hardcoded-literal-color 规则排除 `hsl(var(` 形态；出清清单执行前重算并入账（预期 ~105），live instances 回落 ≈339。
- A3：raw error.message 双轨统一——31 例 UI 直出按族分批统一到「错误类别 i18n 键 + `t(key, { message })` 参数化 + 瞬态并走 `env.notify`（复用 reportRuntimeHostIssue）」；16 例结构化裁定为永久结构化通道并出规则「非 UI 出口」过滤；scheduling 4 例套 barcode-camera 同包先例；wizard :456 兜底载荷随族收口。
- A5：08-11 批视觉 open 项修复（P2-13 / P2-14 / P2-19 裸 button 半边 / P2-25）+ 去重登记（P2-16→V11b、P2-15→V12b form 批次、P2-18 残余→V12b、multi P2-19/20/27→V11a）+ 已修三项（P2-09/10/11）与 P2-18「似已修」三子项核验回写。
- A4：08-28 批 12 条按批 a/b/c 修复 + 20-06 fix-lite + obs-1 顺手修 + 07-01/13-01/20-09 三条 P2 + obs-2/obs-3 两条 obs 共 5 条 adjudicated/watch 显式落卡。
- A6：闭环指标操作化——v1 快照后 `totals.entries` 不增、`totals.instances` 相对 v1 重基线值单调不增且每次变动附批次归因、`newHits` 持续为 0；v0→v1 一次性变动随 plan 记录一次性入账。

## Non-Goals

- V12b（169 条 P2 池按族消化）与 V12c（87 条 P3 池裁决）——本 plan 只收 V12a 面；P2-15 / P2-18 残余等仅做去向登记。
- map / content 两条 rule-scoped 前缀的收紧（A1④：路线图四包点名之外，留 V12b 按需；本 plan 仅为其加显式前缀标记以过守卫）。
- `hardcoded-cjk-ui-copy` 与 `data-blob-href-without-download` 规则语义变更（obs-2 仅 watch）。
- industrial scada 诊断契约改造（A3 判为永久结构化豁免通道，契约归 V4 已收口域）。
- dashboard `canvasWidth=1200`（V11b）；calendar/kanban e2e 弱断言（V11a）；input-number badInput 语义（V12b form 批次）；card 键盘可达 / fieldset collapsed（V12b）。
- 08-11 批非视觉 open 项（P2-06/07/08/17、multi 导出面/死代码/文档族）——不属视觉域，留 backlog。

## Scope

### In Scope

- `scripts/audit/find-ui-consistency-gaps.mjs`（hardcoded-literal-color 正则负向排除、raw-error 规则「非 UI 出口」过滤、EXEMPTIONS 四包条目变换 + map/content 前缀标记）、`scripts/__tests__/find-ui-consistency-gaps.test.ts`（守卫与规则单测）。
- `docs/audits/visual-quality/README.md`（对照协议 v1）、`docs/audits/visual-quality/exemption-baseline-v1.json`（新快照，唯一新建资产）。
- 31 例 UI 直出统一落点：`flux-renderers-form-advanced`（上传/树/详情族 13）、`flux-renderers-data`（crud-renderer / crud-renderer-load:168 / table-quick-edit-cell / use-table-lazy-children ×2）、`flux-renderers-scheduling`（calendar/kanban/barcode 4）、`flux-renderers-map`（use-map-geojson ×2、map-renderer.tsx:178）、`flux-renderers-form`（field-handlers / use-select-remote-search 3）、`flux-renderers-layout`（wizard-renderer.tsx:456）、pivot 1、`flux-renderers-basic`（dynamic-renderer 1）；对应 flux-i18n zh/en 新键。
- 修复落点：`flux-renderers-layout/src/timeline-renderer.tsx`（P2-13）、`flux-renderers-basic/src/button.tsx`（P2-14）、`flux-renderers-basic/src/page.tsx`（P2-25）、`flux-renderers-dashboard/src/editor/editor-palette.tsx` + `editor-canvas.tsx`（P2-19 裸 button 半边）；08-28 批 a/b/c 落点（result.tsx、warn-once.ts、table-editable-cell、keyboard.tsx、batch-bar、defaults.ts、data-schema-validation、content-renderer-definitions、相关测试文件）；20-06 editable-cell 导航 span role 提示（行段执行前重定位）。
- Owner docs：两份 audit-followups 表（勾选/去向回写）、证据卡 `consistency-debt.md`（F1-F4 状态回写）、roadmap V12a 行状态、`docs/audits/per-component/timeline.md`（P2-12）、daily log。

### Out Of Scope

- V12b / V12c 池；flux-core `RendererEnv` 契约变更（notify/reportRuntimeHostIssue 均为既有 API）；六份已 completed remediation plans 的收口事实重审（只回写引用）；`exemption-baseline-v0.json` 删除或重写（保留为历史对照点）。

## Failure Paths

| 场景                      | 触发                            | 行为                                                                 | 可重试           | 用户可见表现                                  |
| ------------------------- | ------------------------------- | -------------------------------------------------------------------- | ---------------- | --------------------------------------------- |
| unified-key-missing       | 统一后 i18n 键缺失/未知错误类别 | `t()` 走既有 fallback（defaultValue/键字面），不直出 raw message     | 否               | 通用类别文案 + `t(key, { message })` 插值详情 |
| transient-error-channel   | 瞬态错误（网络/权限/加载）      | `env.notify('error', t(key, { message }))` toast，不写入侵久 UI 状态 | 是（由操作重试） | toast 通知，无永久错误盒                      |
| structured-diagnostic-out | 引擎/桥接层错误（非 UI 出口）   | 走结构化 onError/诊断通道；规则过滤后不命中门禁                      | 否               | 无直接 UI 呈现（诊断面板/日志）               |
| new-hit-after-tighten     | 四包出现未登记新实例            | `newHits>0` 门禁翻红；按协议登记豁免（带 reason+source）或修复后消化 | 是               | 无（CI/本地 check 信号）                      |
| snapshot-drift            | v1 快照与 live 复跑不一致       | 字节级 diff 定位漂移对；修复或按协议登记后重打 v1                    | 是               | 无（验证失败）                                |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——门禁与守卫即测试：EXEMPTIONS/规则是已入 `pnpm check` 的固定静态规则（不可降级硬约束），其变更必须以脚本单测先红后绿锁定；每族统一以「先删豁免/先写负断言翻红 → 统一后不再命中规则转绿」证明；P2-13/14/25 各一条行为断言（aria-disabled 出现、`_blank` 带 rel、footer 几何不依赖子串嗅探）；数字链以 `--json` 字节级 diff 验证。Proof 项在各 Phase 先于 Fix 项。

## Execution Plan

> 硬顺序约束（研究 §4）：①README 协议修订必须先于任何豁免表/规则变更；②`exemption-baseline-v1.json` 在 A2/A3/A1 全部落地后一次性落定（红线对 v1 生效，避免双重重基线）；③A1/A2 中间态允许按本 plan 记录的显式重基线点翻转数字，其余时刻 `newHits` 必须为 0；④四包收紧后首个红灯（如有）消化完才可收口。

### Phase 1 - README 对照协议修订（v1 条款先行）

Status: completed
Targets: `docs/audits/visual-quality/README.md:55-62`

- Item Types: `Decision`

- [x] Decision：改写「豁免基线快照（V12 对照起点）」节为协议 v1——快照版本化（v0 保留为历史对照点、v1 为现行基线）；新增「结构性重基线」条款：V12a 重基线事件一次性允许 `totals.entries` 32→至多 117（四包前缀展开上界，实收以 A2/A3 落地后余量为准）与 `totals.instances` 一次性出清（A2 假阳性出清按执行前重算清单——研究测算 ~105、A3 结构化 16 裁定 + UI 直出 31 统一），每条变动须归因到本 plan 记录；「entries 不增」「instances 相对基线可归因」两条红线自 v1 快照落定起对 v1 生效；重基线终值占位，Phase 5 回填
- [x] Proof：核对 README 其余章节与 v0 快照引用未被误改（协议条款只动 :55-62 语义域）；确认协议先行的顺序红线（豁免表/规则零改动）在 git diff 可证

> 执行记录（2026-09-21）：README `豁免基线快照` 节重写为协议 v1（版本化 / 结构性重基线条款 / 红线绑定 v1 / v1 终值占位四要素齐备），diff 仅该节（+9/−5），其余章节零改动。顺序红线核验：`git diff scripts/` 仅含 plan 482 执行代理的**先在**未提交改动（`hsl(var(` 负向排除 + graph styles.css 豁免摘除，属 V11b 交付，另见 Phase 2 执行记录），本 plan Phase 1 对 scripts/ 零改动——协议先行约束对本 plan 的改动序成立。

Exit Criteria:

- [x] README 协议 v1 条款落字：版本化、结构性重基线条款、红线绑定 v1 三要素齐备，任何人可据文复判
- [x] live 侧门禁脚本与 EXEMPTIONS 零改动（`git diff scripts/` 为空——执行口径：本 plan 对 scripts/ 零改动；`git diff scripts/` 中 plan 482 先在未提交 diff 已在上方执行记录归档，非本 plan 产生）

### Phase 2 - A2 规则收敛：`hsl(var(…))` 假阳性出清

Status: completed
Targets: `scripts/audit/find-ui-consistency-gaps.mjs`、`scripts/__tests__/find-ui-consistency-gaps.test.ts`

- Item Types: `Proof | Fix | Decision`

- [x] Proof（先红）：脚本单测新增——①`hsl(var(--x, 214 32% 91%))` 形态不命中 hardcoded-literal-color；②真硬编码 `hsl(…)`/`rgb(0 0 0 / 0.45)` 字面仍命中；③ai `styles.css` 中 2 行真硬编码在既有文件级豁免下仍计 `[exempt]`（豁免保留——文件确有存量硬编码）
- [x] Decision + Proof：执行前重算出清清单——复跑 `--json` 逐对 diff 出 `hsl(var(` 形态实例清单（研究测算 ~105：ai 67 / chart-renderer 10 / map 10 / graph 6 / 其余 12），重算终值与文件×规则×计数清单登记本 Phase 记录；post-A2 live 实测值入账（预期 ≈339）
- [x] Fix：`hsl(` 正则加负向排除（`\bhsl\(\s*var\(` 不命中）；单测转绿；复跑门禁确认 `newHits=0` 保持、命中下降全部落在重算清单内

> 执行记录（2026-09-21）：单测三条落在 `scripts/__tests__/find-ui-consistency-gaps.test.ts`（fixtures `color-var-token/color-var-fallback/ai-styles-real-literal.fixture.css`）。**先红**：A2 负向排除当时已由 plan 482 执行代理以未提交 diff 先行写入工作区（其 V11b graph 豁免摘除所需）——为取得红证据，将正则行**瞬时还原**为旧形态 `\b(?:hsl|hsla|rgb|rgba)\s*\(`（备份/cmp 字节级复原验证）后复跑：①②两条红（var fallback 命中、门禁 exit 1），③绿（该行为 A2 前即成立，正确）；复原后 3/3 绿。Fix 行归因：负向排除 `/\b(?:hsl|hsla|rgb|rgba)\s*\(\s*(?!var\()/g` 由 plan 482 diff 携入、本 plan Phase 2 确认采纳为 A2 交付并承担其治理语义，未重写。
> **出清清单（执行前重算终值，非估算；同树仅切正则复跑 `--json` 逐对 diff，并经源文件 `grep -cE '\b(hsl|hsla|rgb|rgba)\s*\(\s*var\('` 逐文件核对相等）**：合计 **163**——ai styles.css 86、form/form-renderers.css 21、form-advanced/styles.css 19（pre-A2 为 newHits 红灯，A2 同时清红）、data/chart-renderer.tsx 10、map/styles.css 10、graph/styles.css 8（newHits）、data/chart-heatmap.tsx 3、data/sparkline-renderer.tsx 3、data/stat-tile-renderer.tsx 3。全部为 hardcoded-literal-color 单规则。**数字链**：pre-A2（旧正则同树）exempt 408/106 对 + newHits 27 → post-A2 **exempt 272/102 对 + newHits 0**（entries 均为 31，见 Phase 1 记录的 482 graph 条目摘除）。**偏差登记**：重算 163 ＞ 研究测算 ~105、post-A2 live 272 ＜ 预期 ≈339——原因是研究快照（HEAD 39a2f38ab）之后 plan 477–482 执行代理将更多 CSS 字面色令牌化为 `hsl(var(…, fallback))` 形态（form/map/graph/form-advanced 全部来自该窗口），放大了同形态出清面；这正是「执行前须重算」条款的作用，v0→v1 差异中该并发漂移在 Phase 5 台账单列归因。

Exit Criteria:

- [x] 单测先红后绿有记录（var fallback 排除 + 真硬编码仍命中两向）
- [x] 出清清单重算值（非估算）登记于本 Phase；`--json` 复跑 instances 下降量与清单逐对一致、`newHits=0`

### Phase 3 - A3 raw error.message 双轨统一（16 结构化 / 31 UI 直出）

Status: completed
Targets: 结构化族（industrial/3d/ai 16 例）、UI 直出 31 例（form-advanced 13、data 5、scheduling 4、form 3、map 3、layout 1、pivot 1、basic 1）、flux-i18n、门禁脚本规则层

- Item Types: `Proof | Fix | Decision`

- [x] Proof（先红）+ Decision：规则层「非 UI 出口」过滤单测先红——结构化形态（onError 三参引擎通道、桥接/解析层诊断载荷、tool result 回引擎文本）不命中 raw-error 规则，JSX/UI 状态直出仍命中；落地过滤后，16 例结构化（industrial 11 + 3d 4 + ai 1）裁定为永久结构化豁免通道（规则注释引用本 plan 裁决），不再消耗豁免条目
- [x] Fix（族批 ①form-advanced 13）：每族先以负断言锁红（统一形态测试：错误路径产出 `t(类别键)` / notify 调用而非裸 `error.message` 入 UI 状态），再统一为「错误类别 i18n 键 + `t(key, { message })` 参数化 + 瞬态并走 `env.notify`（复用 reportRuntimeHostIssue）」；zh/en 键对称
- [x] Fix（族批 ②data 5）：crud-renderer / crud-renderer-load.ts:168（notify 轨载荷 i18n 化）/ table-quick-edit-cell / use-table-lazy-children ×2
- [x] Fix（族批 ③scheduling 4）：calendar 渲染/导出失败、kanban 通知、barcode decode——套 `use-barcode-camera.ts:95-101` 同包先例（`err.name` 类别分派）
- [x] Fix（族批 ④map 3 + form 3 + layout 1 + pivot 1 + basic 1）：map-renderer.tsx:178 补类别分派（键已在的三参回退半统一态）；wizard-renderer.tsx:456 兜底载荷随族收口（:621-622 真实消息渲染保留）
- [x] Proof：multi P2-16（flow reason-only 失败）随本 Phase 核对——live 已见 reason 透传（`designer-action-provider.ts:59-60,191`），核对最终用户可见文案非通用 "Action failed"，结论登记（不单独立项）

> 执行记录（2026-09-21）：**结构化 16**——`STRUCTURED_ERROR_CHANNEL_FILES` 登记落脚本（12 文件：industrial 8 文件/11 例、3d 3 文件/4 例、ai tool-execution 1 例，注释引用本 plan 裁决；`matchRuleLine`/`filterLine` 增 filePath 通道），先红证据：单测 `filters adjudicated structured diagnostic channels...`（staged fixture 于 scada-errors.ts/transform-engine.ts/tool-execution.ts）在过滤落地前红（前缀豁免下仍列 `[exempt]`）、落地后绿且三文件零输出。**UI 直出 31**——22 文件统一为 `t(类别键, { message })` 单行形态（`.message` 仅现于 t 参数行，兼容规则 filterLine 单行匹配），26 个新键（zh/en 各 13 组，`check-i18n-keys` 对称 1412/1412）；键名：`flux.common.saveFailedDetail/queryFailedDetail`、`flux.crud.loadFailedDetail`、`flux.table.loadChildrenFailedDetail`、`flux.tree.remoteSearchFailed(Detail)/loadChildrenFailed`、`flux.form.searchFailedDetail/fieldUpdateFailed(Detail)/uploadFailedDetail/deleteFailedDetail/validationFailedDetail/variantUpdateFailedDetail`、`flux.map.mapLoadFailedDetail/loadRegionDataFailedDetail`、`flux.wizard.commitFailedDetail`、`flux.pivot.initFailedDetail`、`flux.dynamicRenderer.errorDetail`、`flux.scheduling.calendar.loadActionFailed(Detail)/pngExportFailed(Detail)`、`flux.scheduling.kanban.filterCompileFailed(Detail)`、`flux.barcode.decodeError`。**删豁免翻红/删条目转绿（Gate 级负断言）**：删 13 条 raw-error 豁免（12 文件级 + form-advanced 前缀）+ 22 文件还原未统一态 → 门禁 exit 1、newHits=7 精确落在 tree-control-sources ×4 + upload-field ×3（scheduling 前缀按 Phase 4 排程未动，其内 calendar/barcode 由前缀覆盖不翻红，其统一绿由最终门禁 raw-error 0 对佐证）；恢复统一态 → GREEN 229 instances / 69 对 / 18 entries、raw-error 0 对 0 实例、newHits=0、23/23 测试绿。旧 `[exempt] map-renderer` 测试改为「统一文件裸 message 即 newHit」负断言（dual-track 状态已消灭）。**multi P2-16 核对结论**：`designer-action-provider.ts:59-60` reason 透传 + `:191` `notifyCommandFailure`（`designer-context.ts:107-113`）以真实 `error.message`（reason-only 场景为空则不 notify）toast 用户，非通用 "Action failed"——已闭合，backlog 回写随 Phase 6。
> **执行环境事故记录（供 closure audit 与主线程知悉）**：执行期间存在多代理并发写战——10:03 一记 `git stash`（stash@{0}）与本 plan 无关但卷走了本 plan 的未提交产物（plan 文件/README v1/单测/fixtures/脚本），随后 plan 479 的 sweep commit 将 18 个已统一源文件卷入 HEAD（33135a45a）；本 plan 从 stash@{0} 按路径提取恢复（plan/README/测试/脚本全量找回），4 个被 clobber 的源文件自 `_tmp/a3-mine` 快照恢复、locale 26 键重放（idempotent）。恢复后全部验证绿；calendar.tsx 与 481 在途工作对齐到最新 HEAD（其已含本 plan 编辑与 481 token 化）。残留风险：stash@{0} 仍归属未知所有者，主线程收口时不得 pop 后丢弃本 plan 路径。

Exit Criteria:

- [x] 16/31 分派账本与 live 一致：16 例结构化过滤后不命中、31 例统一后其 `(file,rule)` 不再需要豁免（负断言 + 删条目后门禁对该文件绿）
- [x] 族批先红后绿有记录；flux-i18n zh/en 键对称校验绿；受影响包 focused test 绿

### Phase 4 - A1 四包前缀豁免收紧为文件级 + 路径形态守卫

Status: completed
Targets: `scripts/audit/find-ui-consistency-gaps.mjs`（EXEMPTIONS :74/:82/:90/:206 及 map/content 对照条目）、`scripts/__tests__/find-ui-consistency-gaps.test.ts`

- Item Types: `Proof | Fix | Decision`

- [x] Proof（先红）：EXEMPTIONS path 形态守卫单测先红——`EXEMPTIONS[].path` 必须以 `.ts`/`.tsx`/`.css` 结尾或显式 `isPrefix: true`（防前缀形态回潮）；现存四包前缀条目 + map/content 前缀条目使该测试红
- [x] Fix（数据变换，零匹配逻辑改动）：4 条前缀条目 → 按 Phase 3 落地后 live `--json` byFile 余量逐对生成文件级条目（每对 `(file,rule)` 一条，继承原前缀条目 reason/source 并追加本 plan 引用；上界 89 对，实收 < 上界，实值登记）；map/content 两条 rule-scoped 前缀加显式 `isPrefix: true` 标记（语义不变，留 V12b 按需收紧）
- [x] Proof：收紧前后 `--json` 对照——instances/pairs 零漂移（纯豁免记账变换，命中统计不动）、entries 变化逐条可映射；`newHits=0` 保持；若四包出现红灯（V0→live 增量为 0，预期无），登记消化后方可进 Phase 5

> 执行记录（2026-09-21）：**守卫**——脚本启动即校验（fail-fast 硬约束，`pnpm check` 链生效）：EXEMPTIONS path 必须为文件路径（`.ts/.tsx/.css` 结尾）或显式 `isPrefix: true`；守卫单测先红（未加守卫时 clean fixture 扫描照常通过 → 红），落地后以「双侧金丝雀」定稿：断言守卫存在于脚本源码 + live 表合规门禁绿（防守卫被摘、防前缀回潮两向）。**变换**——form-advanced 前缀已随 Phase 3 删除（13 例统一后零余量）；scheduling/industrial/3d 三条全规则前缀按 live byFile 逐对展开为 **54 条文件级条目**（scheduling 20 + industrial 33 + 3d 1，全部 hardcoded-literal-color；closure audit F-2 勘误；CJK/raw-error 对已随 Phase 3 消灭），reason/source 继承原前缀条目并追加 `plan 483 A1 文件级展开`；map/content 两条 rule-scoped 前缀加 `isPrefix: true`（语义不变，V12b 按需收紧）。上界 89 对 vs 实收 **54 对**（< 上界，因 A2/A3 清掉了 CJK/raw-error 面）。旧 prefix 语义测试三条重指向已登记真实文件路径。**数字链**：收紧前 225 instances / 68 对 / 18 entries → 收紧后 **225 / 68 / 69 entries**，byFile 逐对零漂移、`newHits=0`；entries 18→69 = −3 前缀 + 54 文件级，逐条可映射（13 文件级条目保持）。既有 3 条四包红灯：无（V0→live 增量 0，展开后 newHits 保持 0）。

Exit Criteria:

- [x] 守卫单测先红后绿；EXEMPTIONS 中不再存在无标记的目录前缀条目
- [x] 收紧实收条目数登记（32−4+N）；`--json` 复跑 `newHits=0` 且命中统计与收紧前零漂移

### Phase 5 - v1 快照落定与数字链验证

Status: completed
Targets: `docs/audits/visual-quality/exemption-baseline-v1.json`（新建）、`docs/audits/visual-quality/README.md`（终值回填）

- Item Types: `Proof`

- [x] Proof：`node scripts/audit/find-ui-consistency-gaps.mjs --json > docs/audits/visual-quality/exemption-baseline-v1.json`；live 复跑输出与快照字节级 diff 一致（byFile 按 file+rule、byRule 按键名，确定性由脚本保证）；`newHits=0`
- [x] Proof：v0→v1 差异逐条映射到本 plan 记录并回填 Phase 1 协议条款终值——entries 展开 N 条、A2 假阳性出清重算值、A3 结构化 16 过滤 + UI 直出 31 统一；A6 基线成立（v1 的 entries/instances 即后续对照基线）

> 执行记录（2026-09-21）：`exemption-baseline-v1.json` 入库（**225 instances / 68 (rule,file) pairs / 69 entries、newHits=0**），复跑 `cmp` 字节级一致；README 协议 v1 终值已回填。snapshot 字段保留 v0 字面（文件名即版本标识，draft review 4 Minor 口径）。
> **v0→v1 一次性变动台账**（对照锚：v0 = 413/121/32，`exemption-baseline-v0.json`）：
> ① **entries 32 → 69**：−1 graph styles.css 摘除（plan 482 随 graph styles.css token 化，执行窗口内先在）；−13 raw-error 豁免（Phase 3：12 文件级 + form-advanced 前缀，统一后零余量）；−3 前缀 + 54 文件级（Phase 4 逐对展开，map/content 两条 isPrefix 标记不改计数）。
> ② **instances −188（413 → 225）**，plan-owned 三笔：**A2 −163**（Phase 2 重算清单，逐对与源文件 grep 核对）；**A3 −16**（结构化 16 出规则登记，industrial 11 + 3d 4 + ai 1）；**A3 −31**（UI 直出 31 统一为 `t(key,{message})` 后不再命中，raw-error 对 47→0）。
> ③ **并发窗口净残差 +22**：v0 快照（2026-09-19）与本 plan 执行窗口之间，plans 472–482 的并发交付（print/word/scheduling/dashboard/graph/map token 化与新增组件面）带来「新增字面色存量 − 各自 token 化清理」的净 +22 实例与若干对数迁移；该残差归属各 sibling plan 提交，不逐笔展开于本台账（其提交信息即归因），v1 起按协议红线冻结。
> ④ **pairs 121 → 68**：上三条的连带（A2 清空纯 var-form 对、A3 清空 raw-error 全部 34 对、A1 前缀展开 +54 对），全量对级对照以 `exemption-baseline-v0.json` 与 v1 快照两文件为准。
> **A6 基线成立**：自本快照起 `totals.entries`（69）不增、`totals.instances`（225）单调不增且变动附批次归因、`newHits` 持续 0（Phase 6/7 与后续批次受此约束）。

Exit Criteria:

- [x] `exemption-baseline-v1.json` 入库且与 live 复跑字节级一致；`newHits=0`
- [x] v0→v1 一次性变动台账完整（每条变动可映射到 Phase 2/3/4 记录）；README 终值回填完成

### Phase 6 - A5 08-11 批视觉项修复与去重登记

Status: completed
Targets: `flux-renderers-layout/src/timeline-renderer.tsx`、`flux-renderers-basic/src/button.tsx`、`flux-renderers-basic/src/page.tsx`、`flux-renderers-dashboard/src/editor/`、`docs/audits/per-component/timeline.md`、`docs/backlog/audit-followups-2026-08-11-1929.md`

- Item Types: `Proof | Fix | Decision | Follow-up`

- [x] Proof（先红）：行为断言三条——①P2-13：rootDisabled 时条目携带 `aria-disabled` 且不响应 seek（timeline-renderer.tsx :190/:218）；②P2-14：anchor `target=_blank` 渲染 `rel` 含 noopener noreferrer（复用 `content/link.tsx` resolveRel 先例，button.tsx :256-266）；③P2-25：page footer 几何改 data attr/variant 驱动，断言不再依赖 `includes('fixed')`（page.tsx :175）
- [x] Fix：三条落地；P2-19 裸 button 半边——editor-palette.tsx:49、editor-canvas.tsx:239 置换 `@nop-chaos/ui` Button（memo 半边随 Phase 7 批 c 口径）
- [x] Proof：P2-18 三个「似已修」子项核验闭合——link rel（resolveRel 在）、stat-tile 几何（SPARKLINE 常量在）、markdown src 失败（data-state=error 在）；结论回写 backlog `[x]`
- [x] Follow-up（去向回写）：P2-16→V11b（roadmap V11b 行已声明同一交付，backlog 登记去重指针）；P2-15→V12b form 批次；P2-18 残余（card 键盘可达、fieldset collapsed、alert onClose payload 形状核验）→V12b；multi P2-19/20/27→V11a；multi P2-16→Phase 3 核对结论回写；已修三项 P2-09/10/11 回写 `[x]` + plan 1929-1 引用
- [x] Fix：P2-12 timeline 审计卡修正（dim 3 「display-only」表述改为 live 三态 ownership 现状）

Exit Criteria:

- [x] 三条行为断言先红后绿；受影响包 focused test 绿（timeline-root-disabled / button-anchor-rel / page-footer-fixed 三新测试文件在包；basic 606/606、layout/dashboard focused 绿）
- [x] 08-11 backlog 表逐条状态/去向与本 plan 一致（已修 `[x]`、去重指针、successor 登记），无零去向悬挂

### Phase 7 - A4 08-28 批修复 + 处置回写 + owner docs 收口

Status: completed
Targets: 批 a/b/c 各落点文件、`table-editable-cell.tsx`（20-06）、两份 audit-followups、`docs/audits/visual-quality/consistency-debt.md`、roadmap、daily log

- Item Types: `Fix | Proof | Decision`

- [x] Fix（批 a 诊断 gate 族）：09-02（result.tsx warnedStatuses 加 isDevRuntime gate，先例 keyboard.tsx:66-69）+ 15-01（warn-once dev gate；editable-cell gd-\* warn 收敛；连带 pivot 本地 warnOnce 全仓口径）+ 19-02（keyboard.tsx:94-102 `catch` 加一行 dev warn，沿同文件 warnOnce 标准）+ 19-03（batch-bar handleClear 对 `ok:false` 加 warn 前瞻）
- [x] Fix（批 b 测试卫生族）：14-01（删 `resetWarnedKeysForTests` 死代码）+ 14-02（expandableWhen catch 降级路径测试）+ 14-04（console.warn spy `mockRestore` 改 try/finally，沿 keyboard-bindings.test 先例）+ 23-03（标题修正 + 正向用例）+ 23-04（button 测试 spy 接线或删）
- [x] Fix（批 c 类型/订阅卫生族）：05-01（batch-bar `useScopeSelector` 补 `paths`）+ 09-01（result `status` propContract 收闭合 union，kanban 先例——**执行后裁决回退**，见下方偏差注记）+ 13-04（去 `(column as unknown as …).editable` 双重断言）+ obs-1（defaults.ts 死分支清理 + 缩进）
- [x] Fix（fix-lite）：20-06 editable-cell 导航 span 加 role/aria 提示——执行前先重定位行段（:431-440 现为 Checkbox span，导航 span 在邻段）；不返工 Decision 6 tradeoff
- [x] Decision（adjudicated 登记回写）：13-01（`event.key` 匹配系已文档化契约 `renderer-interfaces.md:613-616`，剩余价值归文档改进 backlog）、20-09（won't-fix——半数诉求违反零 DOM 设计）、obs-2（watch-only 挂门禁演进）、obs-3（流程记录：future audit 从 index diff 反向映射）、07-01（optimization candidate，风格收敛）——全部落 `Deferred But Adjudicated` + backlog 去向列
- [x] Fix（owner docs）：两份 backlog 全表勾选/去向回写（含 P2-09/10/11 追认）；证据卡 `consistency-debt.md` F1-F4 状态与裁决回写（V12a 面收口；V12b-F5/V12c-F6 不动）；roadmap V12a 行状态流转（执行起 `planned`、closure audit 后 `done`）；daily log 记录

Exit Criteria:

- [x] 批 a/b/c 按各台账先例补齐测试且绿；20-06 重定位 + polish 落地有断言（09-01 裁决回退后既有 result-status-invalid 回归测试恢复并保持绿，content 317/317）
- [x] 两份 backlog 与 live 一致（无未勾选且无去向的条目）；证据卡/roadmap/daily log 同步完成

执行偏差注记（2026-09-21，收口会话记录）：09-01 闭合 union 与批 a 09-02 渲染期 dev-warn 契约冲突——union 使运行时在渲染前剥除非法 `status` 值（收口会话探针实测 `rawStatus=undefined`），`result-status-invalid: an unknown status degrades to info with a dev warn` 既有回归测试转红，且定义 description「validated at render, not by the shape gate」自相矛盾。裁决：**保留 09-02 渲染期可见 dev-warn 契约（既有测试钉住的行为面），`status` propContract 回退为开放 `string`**；闭合 union 的编辑器枚举面在该字段无消费方，收益为零。backlog 09-01 条目已按裁决改写。kanban「同批一致」诉求让位于行为契约，登记为显式 adjudicated 而非静默回退。

执行偏差注记 2（2026-09-21，收口会话记录）：A3 统一 upload-field 时把 `toUploadError`（本地化前缀）同时用于 DOM 消息与 `onUploadError` 事件 payload 的 `error` 字段，后者击穿 CX-10/bug-83 既有机器契约（`${error}` 在 action args 中须解析为服务器原始消息，HEAD 既有测试钉住 `/error-rejected`）。裁决：**双轨拆分**——DOM 面维持 A3 本地化形态（`Upload failed: <detail>`），payload `error` 恢复原始消息（`toUploadErrorMessage` 纯提取）。该原始读取通道属 schema 动作机器通道（同「tool result 回引擎」判例），已登记 `STRUCTURED_ERROR_CHANNEL_FILES`（17th 条目，附裁决引注；过滤发生在豁免记账前，v1 基线数字不受影响），偏差注记同步 plan 483 Phase 7 与 daily log。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（追溯性重建评审，2026-09-21）
- Verdict: `pass-with-minors`（零 Blocker / 零内容 Major）
- Rounds: 1（回溯补录轮）
- Findings addressed: （追溯背景）本 plan 在早期 session 中跳过 draft review 门禁即进入执行；本记录为执行完成后由独立 fresh session 依 guide §Plan Review Rule 重建，评审对象为 plan 文本 + 起草时点 live repo（脚本锚点按 plan-470 提交版、被 sweep 文件按 `33135a45a^` 核对）。四项检查结论：①可想象性——七 Phase 顺序硬约束（协议先行→规则收敛→豁免变换→v1 一次性落定）自洽，Proof-before-Fix 与 Failure Paths 可执行，唯一设计 gap 为 Minor：Phase 7 的 09-01（闭合 union）与 09-02（render 期 dev warn）同域 `result.tsx status` 契约面未做交互分析，执行中实测冲突并已按显式裁决回退（裁决既定，不要求返工）；②格式——模板必填段齐备，Rule 17/18（owner-doc 与全量验证归位）合规；③内容——Goals/Non-Goals 清晰、七 Phase 单结果面拆分合理、exit criteria repo-observable（三新测试文件、门禁负断言、54 条 A1 展开条目等均已落地可查）、Deferred 九卡分类诚实且 successor 指针经 live 核对；④引用——25+ 处 file:line/symbol 逐一对照起草时点状态全部命中（含 v0 快照逐包 130/37、121/41、6/4、13/7 = 270/86/89、raw-error 47/34、ai styles.css 42/86/2 的独立重算），并发现 plan 对 08-11 backlog P2-25 陈旧锚点（:97-103）做了 live 校正（:175），佐证起草时经过现场核实。Minor 四条（09-01/09-02 交互 gap、v1 快照 `snapshot` 字段保留 v0 字面、Goals/协议文本内嵌研究测算值 ~105/≈339 已被重算值 163/272 取代须按 Phase 2/5 记录读、Goals A4/A5 序号与 Phase 顺序交错），均不阻塞。执行期 multi-agent 并发事故（stash 卷走、479 sweep 卷入）已在 Phase 3/5 记录中如实登记，归 closure audit 复核面，不影响本评审结论。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–7 Exit Criteria 全勾）
- [x] in-scope confirmed live defects 已修复、confirmed contract drift 已收敛（F1 前缀豁免局部退化、F3 双轨、协议与豁免表字面冲突、P2-13/14/19/25、08-28 批 a/b/c、20-06、obs-1）
- [x] v1 豁免基线落定：README「结构性重基线」条款 + `exemption-baseline-v1.json` 入库 + entries/instances 红线对 v1 生效；v0→v1 一次性变动（四包展开、假阳性出清按执行前重算清单、结构化 16、UI 直出 31）逐条有 plan 归因
- [x] A6 闭环指标成立：post-v1 `totals.entries` 不增、`totals.instances` 相对 v1 重基线值单调不增且每次变动附批次归因、`newHits` 持续为 0（含四包收紧后首个红灯如有已登记消化）
- [x] 行为/契约结果已达成（aria-disabled / rel / footer 几何 / 统一错误通道的行为断言在单测与组件测试成立）
- [x] 必要 focused verification 已完成（门禁脚本单测先红后绿 + 族负断言 + `--json` 字节级 diff）
- [x] 两份 audit-followups backlog 勾选/去向回写完成（含 P2-09/10/11 追认与 P2-18 似已修三子项核验闭合），无零去向悬挂项
- [x] 全部 deferred/adjudicated 项显式落卡，不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步（README 协议 v1、consistency-debt.md、两份 backlog、roadmap V12a 行、per-component/timeline.md、daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增未登记红）

## Deferred But Adjudicated

### P2-16 dashboard 运行态硬编码 `canvasWidth=1200`

- Classification: moved to explicit successor ownership
- Why Not Blocking Closure: roadmap V11b 行已声明同一交付（「dashboard `canvasWidth=1200` 解硬编码」），V12a 重复立项违反去重纪律
- Successor Required: `yes`
- Successor Path: `docs/backlog/visual-quality-roadmap.md` V11b 行 → 届时 owner plan；08-11 backlog 登记指针

### P2-15 input-number badInput 中间态与存储脱钩

- Classification: moved to explicit successor ownership
- Why Not Blocking Closure: 语义裁决项（badInput 分支/提示设计）非机械修，归 form 域批次
- Successor Required: `yes`
- Successor Path: roadmap V12b（form 族批次或独立小 plan）

### P2-18 残余子项（card 键盘可达、fieldset collapsed、alert onClose payload 形状核验）

- Classification: moved to explicit successor ownership
- Why Not Blocking Closure: content/form 族批次语义项；三个「似已修」子项在 Phase 6 核验闭合，不随本项延期
- Successor Required: `yes`
- Successor Path: roadmap V12b（content/form 族批次）

### multi P2-19/20/27（kanban/calendar e2e 弱断言与断言缺位）

- Classification: moved to explicit successor ownership
- Why Not Blocking Closure: scheduling e2e 视觉断言补齐正是 V11a 交付面
- Successor Required: `yes`
- Successor Path: roadmap V11a 行

### 07-01 新模块手写 useMemo/useCallback（React Compiler 基线）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 订阅/渲染卫生对齐项，equality 函数保证零重渲染、无行为缺陷；reviewer 已剔出存量/shadcn 原样文件并裁定保留例外
- Successor Required: `no`
- Successor Path: 08-28 backlog 去向列登记，随 V12b 卫生批次机制吸收

### 13-01 keyboard `event.key` 匹配边界

- Classification: `watch-only residual`
- Why Not Blocking Closure: `event.key` 比较是已文档化现行契约（`renderer-interfaces.md:613-616`）；`+` 拒绝已有 dev 诊断；剩余价值为作者侧诊断/文档改进
- Successor Required: `no`
- Successor Path: 文档改进 backlog 承载

### 20-09 hotkey 面板 `aria-keyshortcuts`

- Classification: `watch-only residual`
- Why Not Blocking Closure: 无 WCAG SC 要求 hotkey 可发现性；半数诉求违反零 DOM 文档化契约
- Successor Required: `no`
- Successor Path: adjudicated won't-fix，随契约文档常驻

### obs-2 CJK 规则行级 `description:`/`defaultValue:` 过滤启发式

- Classification: `watch-only residual`
- Why Not Blocking Closure: live-tree 探针未发现被抑制的用户可见 CJK 文案；挂门禁演进观察，不动规则语义（Non-Goals）
- Successor Required: `no`
- Successor Path: 门禁演进时复核

### obs-3 plan→export-surface 可追溯性流程注记

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 纯流程建议、无代码面；结论（future audit 从 index diff 反向映射）随本 plan 登记即完成裁定
- Successor Required: `no`
- Successor Path: 流程记录，随 08-28 backlog 回写常驻

## Non-Blocking Follow-ups

- 1941-1 closure audit 转述口径（ISSUES→共识修复→auditor 授权收口）已按核实勘误④在研究报告 §6 记录；已 completed 历史计划不回写（guide Rule 21）。
- `exemption-baseline-v0.json` 保留为历史对照点；v0→v1 差异以本 plan 台账为唯一归因源。
- 08-11 multi 族非视觉项（导出/文档/测试池）去向随 V12b 池机制裁定，本 plan 不预判。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: verdict `issues`→修复闭环——F-1 修复证据：`docs/backlog/audit-followups-2026-08-11-1929.md:49` P2-25 行 `[x]` + plan 483 Phase 6 路由；F-2 修复证据：plan Phase 4 记录拆分数字勘误；A6 字节级 cmp 与 raw-error 零命中由审计独立复跑在案。

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
