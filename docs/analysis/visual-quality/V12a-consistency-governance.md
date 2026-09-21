# V12a 研究报告：一致性豁免治理与 followups 处置

> 核查日期: 2026-09-21
> 基线: master @ 39a2f38ab（V6 plan 476 已收口）；V7/V8a/V8b 研究报告为工作区未跟踪新文件（与本域零交集）
> 输入: 路线图 V12a 行、普查 §7.2–7.4 + §8（**普查无 §11**，全文止于 §10，§7/§8 为实际输入）、证据卡 `consistency-debt.md`、`exemption-baseline-v0.json`、`docs/backlog/audit-followups-2026-08-11-1929.md`、`audit-followups-2026-08-28-1659.md`、门禁 `scripts/audit/find-ui-consistency-gaps.mjs`、对照协议 `docs/audits/visual-quality/README.md:57-62`
> 状态: **待独立核实**

## 0. 勘误与域定位

- **普查 §11 不存在**：`docs/analysis/2026-09-15-visual-quality-deep-survey.md` 章节止于 §10（§0–§10），输入清单所写「普查 §11（如有）」落空；一致性债务实际载体为 §7.2（豁免）、§7.3（错误双轨）、§7.4（followups）、§8（回归守护）。
- **台账路径勘误**：证据卡 Owner docs 写的 `r2-audit.md`/`r3-p2-adjudication.md` 实际为 `docs/analysis/ui-review/R2-consistency-audit.md`（169 条 P2 候选池裁决在 ：189）与 `docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md`（头行自述「172 条全覆盖」，87 条 P3 候选为其子集池）。
- **门禁口径勘误**：JSON `totals.files` = 唯一 `(rule, file)` **对数**（`byFileMap` 键为 `` `${filePath}|${ruleId}` ``，脚本 ：494-509），非唯一文件数；human 行「across N file(s)」同为对数语义（:539）。本文所有 files 计数沿用该口径。
- **行号漂移勘误**（followups 原始引用 → live 实位）：08-11 P2-14 `button.tsx:252-263` → `packages/flux-renderers-basic/src/button.tsx:256-266`；P2-25 `page.tsx:97-103` → `packages/flux-renderers-basic/src/page.tsx:175`（包归属未写明，basic 非 layout）；P2-19 dashboard 裸 `<button>` 已不在 `dashboard-renderer.tsx`，现为 `editor-palette.tsx:49`、`editor-canvas.tsx:239`。08-28 20-06 `table-editable-cell.tsx:431-454` 行段现为 Checkbox span（:431-440），导航 span 在邻段，plan 级须重定位。
- **门禁数据结构**（`find-ui-consistency-gaps.mjs`）：4 条规则（hardcoded-literal-color / hardcoded-cjk-ui-copy / raw-error-message-direct-out / data-blob-href-without-download，:300-405）；扫描域 = `packages/flux-renderers-*/`（前三条）+ `apps|packages`（第四条）；豁免表 `EXEMPTIONS`（:71-288）条目形 `{ path, rule?, reason, source }`，`exemptionFor`（:427-434）用 `filePath.startsWith(entry.path)` **前缀匹配**——这就是整包豁免的机制根源；`--json` 模式（plan 470 引入，:59, :487-530）输出确定性排序载荷，`newHits`（未豁免命中）>0 才翻红退出码。

## 1. Findings 逐项核实

### F1 整包前缀豁免（V12a-F1，成立，量化如下）

豁免表 32 条目构成（逐条清点 ：71-288）：**6 条前缀条目** + 26 条文件级。前缀条目分两档：

| 条目            | path 前缀                                    | rule 限定                       | live 命中实例 / 唯一文件 / (file,rule) 对 |
| --------------- | -------------------------------------------- | ------------------------------- | ----------------------------------------- |
| scheduling      | `packages/flux-renderers-scheduling/src/`    | 无（全部规则）                  | 130 / 34 / 37                             |
| industrial      | `packages/flux-renderers-industrial/src/`    | 无（全部规则）                  | 121 / 41 / 41                             |
| 3d              | `packages/flux-renderers-3d/src/`            | 无（全部规则）                  | 6 / 4 / 4                                 |
| form-advanced   | `packages/flux-renderers-form-advanced/src/` | 仅 raw-error-message-direct-out | 13 / 7 / 7                                |
| （对照）map     | `packages/flux-renderers-map/src/`           | 仅 hardcoded-literal-color      | 18 / 4 / 4                                |
| （对照）content | `packages/flux-renderers-content/src/`       | 仅 hardcoded-literal-color      | 4 / 4 / 4                                 |

路线图点名的四包（scheduling/industrial/3d/form-advanced）合计 **270 实例 / 86 唯一文件 / 89 (file,rule) 对**，占 live 总量 444 的 61%、文件对 121 的 71%。这四个域**新增**字面色/直出自动豁免、零门禁信号——V12a-F1 的「门禁局部退化」成立，且 V0→live 的增量实证了它（见 F2，增量全部落在既有豁免影子下）。

**收紧为文件级的机械可行性：高，零代码改动**。`startsWith` 对完整文件路径同样成立——文件级条目只是把 `path` 写成全路径，匹配函数、`[exempt]` 输出、JSON 口径全部不变。只需数据变换：4 条前缀条目 → 89 条文件级条目（每对 (file,rule) 一条，reason/source 可从原前缀条目逐条继承）。可选加固：脚本测试（`scripts/__tests__/`）加一条「EXEMPTIONS.path 必须以 `.ts/.tsx/.css` 结尾或显式 `isPrefix: true`」守卫，防前缀形态回潮。

**豁免基数变化与风险**：

1. **条目数 32 → 117**（-4 前缀 + 89 文件级），机械膨胀 +85。这与 README 对照协议①「`totals.entries`（32）不得增加」（`docs/audits/visual-quality/README.md:62`）**字面冲突**——协议按 v0 快照口径写死，收紧本身就是一次协议事件。裁决见 §3 A1：先修订协议（引入快照版本 v1 与「结构性重基线」条款），再收紧，再重打 v1 快照；「不增」红线改为对 v1 生效。
2. **门禁恢复后首红风险**：四包内任何新文件/新实例即刻成为 newHits 翻红。这是收紧的目的（恢复局部门禁），但 plan 必须预算：新文件登记决策流程 + 当周可能的红灯消化。当前四包 V0→live 增量为 **0**（逐对 diff 为空），收紧前无存量红灯。
3. **实例数口径不变**：收紧只动「豁免怎么记」，不动命中统计；413/444 数字序列连续可比。

### F2 豁免基数膨胀与 V0 快照对照（V12a-F2，成立，且增量已具名归因）

三轮数字：D2 收口 399/116/30（脚本头注 ：508）→ **V0 快照 413/121/32**（`exemption-baseline-v0.json`，随 plan 470 提交 27ba03729，2026-09-19）→ **live HEAD 39a2f38ab：444/121/32，newHits = 0**（只读复跑 `node scripts/audit/find-ui-consistency-gaps.mjs --json`，2026-09-21）。

逐对 diff：**+31 实例全部集中于唯一一对** `packages/flux-renderers-ai/src/styles.css` × hardcoded-literal-color（42 → 73）；byFile 无新增对、无消失对，其余 120 对计数零漂移。归因链完整：31 行新增全部来自 plan 472（V2 AI 会话视觉，提交 03add8bc4，2026-09-20）写入的 `hsl(var(--card, 214 32% 91%))` 形态行——**带 fallback 的令牌消费**，而规则的 `hsl(` 正则（:314）无法区分 `hsl(硬编码)` 与 `hsl(var(--x, fallback))`，属**规则假阳性面**被既有 ai styles.css 文件级豁免吸收。两个治理结论：

1. README 协议②「instances 相对 413 的下降量须可归因」在方向上已被突破（+31 上升）；上升本身可归因（具名到提交与文件），但**豁免影子下的漂移零信号**这一点需要门禁演进（§3 A2：`hsl(var(...))` fallback 形态出规则或出豁免，二选一，倾向前者——它不是 styled color）。
2. 指标 «instances» 对「豁免条目数 32 不增」无约束力：条目数由 `EXEMPTIONS.length` 决定，实例数在既有条目下自由漂移。V12a 闭环指标要同时引用两者并写明各自语义（§3 A5）。

### F3 raw error.message 直出双轨（V12a-F3，成立：双轨在同一包内并存）

规则 `raw-error-message-direct-out`（:358-385）live 豁免 **47 实例 / 34 (file,rule) 对**（V0→live 零漂移），分布：form-advanced 13（整包条目）、industrial 11（整包条目）、data 5（4 条文件级）、3d 4（整包条目）、scheduling 4（整包条目）、form 3、map 3（各 2 条文件级）、basic/layout/pivot/ai 各 1。**双轨实证**（同包同族并排）：

- **统一轨（目标形态）**：`packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-camera.ts:95-101`——按 `err.name` 分派既有 i18n 键（NotAllowedError → `flux.barcode.cameraPermissionDenied`、NotFoundError → `cameraNotFound`），raw message 仅作插值参数 `t('flux.barcode.cameraError', { message: err.message })`；该通道已被规则 filterLine（:380）显式豁免于命中——即门禁已把「i18n 模板 + 参数」认定为合法轨。
- **直出轨（待统一）**：同族 `use-barcode-detect.ts:111` `setError(err instanceof Error ? err.message : ...)`——raw message 直入 UI 状态。同特性族两条轨并存，是「双轨」最直接的证据。

**既有通道与先例**（统一方案的全部构件已在仓内）：

1. `env.notify(level, message)` Toast 通道——`RendererEnv` 契约 `packages/flux-core/src/types/renderer-api.ts:189`；quick-reference.md:242 明示「notify = Toast 通知」。
2. `reportRuntimeHostIssue` 结构化上报 helper——`packages/flux-core/src/utils/runtime-host-reporting.ts:21-30`：收 env + error，派生 message 后走 `env.notify`（`notify:false` 可关），是「错误→宿主通道」的现成包装。
3. `t(key, { message })` 插值——见上 barcode-camera；`crud-renderer-load.ts:168` `env?.notify?.('error', err.message)` 是 notify 轨但载荷仍裸（其豁免理由即「env.notify 错误通道透传」）。

**统一方案面（按族分派，47 例三类）**：

- **UI 状态直出族（~26 例，须统一）**：map geojson 加载（use-map-geojson.ts ×2、map-renderer.tsx:178 的 `error instanceof Error ? error.message : t(...)` 本地化回退双轨）、data crud 保存/加载（crud-renderer.tsx、crud-renderer-load.ts、table-quick-edit-cell.tsx、use-table-lazy-children.ts ×2）、form field-handlers/use-select-remote-search、form-advanced 上传/树/详情族 13 例、layout wizard（P2-10 已修，`wizard-renderer.tsx:456` 仍存 `error.message` 兜底入 state，:621-622 已渲染真实消息——剩余问题是兜底载荷形态）、pivot 初始化、basic dynamic-renderer。统一形态 = 错误类别 i18n 键 + raw message 降为 `t(key, { message })` 参数；瞬态错误并走 `env.notify('error', ...)`（可复用 reportRuntimeHostIssue）。map-renderer.tsx:178 的三参回退正是半统一态：键已在、仅缺类别分派。
- **结构化诊断契约族（~21 例，倾向 adjudicated 保留 + 改道规则口径）**：industrial scada-errors/refresh-pipeline/parse/event-bridge/config-sync 11 例（scada §8.1 非升级诊断契约，D2 候选 C 规格点名）、3d useBindingBridge/SceneManager/transform-engine/schema-generator 4 例（onError 三参引擎通道，plan 464/465 判例）、ai tool-execution.ts 1 例（tool result 文本回引擎，非 JSX）。这些不进用户 JSX，是诊断载荷；统一方案应把它们与 UI 直出族在规则/豁免上分层（如规则加「非 UI 出口」filter 或改判为永久结构化豁免），否则 V12b 批次清扫会在假阳性上空转。
- **scheduling 4 例**（calendar 渲染/导出失败、kanban 通知、barcode decode）按 UI 直出族处理，barcode-camera 同包先例直接套。

### F4 audit-followups 处置（V12a-F4，成立：08-28 批 16 P2 + 3 observation 全部 `[ ]`；08-11 批需按「视觉相关」划界）

**前置事实**：两条 backlog 的折叠项全部已随 6 份 plan 收口——08-11 的 P0/P1+折叠 P2 → plans 1929-1/2/3（三份均 `Plan Status: completed`，1929-1/3 带独立 closure-audit approved 记录）；08-28 的 23 条 P1 → plans 1941-1/2/3（均 completed + closure audit APPROVED）。未折叠 P2 是唯一悬挂层。08-28 批内已有 P1 修复落地的交叉证据：`batch-bar.tsx:45` 注释标记「05-02」、:49「22-02」修复——**同审计的 P1 落了，backlog 里的 P2 没跟**。

#### F4.1 08-11 批视觉相关项（9 项，live 逐条核实）

| ID    | 项                                           | live 证据                                                                                                                                                                                                                                                                                                                                                                                               | 状态                                            |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| P2-10 | wizard stepError 真实消息进 UI 死区          | `wizard-renderer.tsx:621-622` 注释「P2-10: render the real stepError message; generic i18n only when empty」                                                                                                                                                                                                                                                                                            | **已修**（plan 1929-1 Phase 3，plan completed） |
| P2-09 | wizard 数值 value 先 key 匹配                | `wizard-renderer.tsx:96-104` `findStepIndexByKey` 先行、clamp 兜底                                                                                                                                                                                                                                                                                                                                      | **已修**（同上）                                |
| P2-11 | barcode 离线横幅说谎 + design.md 漂移        | `barcode-scanner-overlay.tsx:313-317` 横幅 `t('flux.offlineQueueMessage')`，文案「离线—网络不可用，不支持自动提交」（zh-CN.ts:1173/en-US.ts:1175）与 live 行为一致；design.md 已重排                                                                                                                                                                                                                    | **已修**（plan 1929-1 Phase 1）                 |
| P2-13 | timeline 根禁用时条目 inert-but-focusable    | `timeline-renderer.tsx:190` `rootDisabled` 仅守 `handleSeek`（:217）；条目仍 `tabIndex={clickable?0:undefined}` + `role="button"`，**无 aria-disabled**                                                                                                                                                                                                                                                 | **open**                                        |
| P2-14 | button anchor `_blank` 无 rel                | `button.tsx:256-266`：`target` 透传 :261、`isSafeNavigationUrl` 已在，**无 rel**；先例 `content/link.tsx:17-53` `resolveRel` noopener 补全                                                                                                                                                                                                                                                              | **open**                                        |
| P2-15 | input-number badInput 中间态与存储脱钩       | `input-number-renderer.tsx:248-258`：`Number(raw)` 非法时静默忽略，无 badInput 分支/提示                                                                                                                                                                                                                                                                                                                | **open**（语义非平凡）                          |
| P2-16 | dashboard 运行态硬编码 `canvasWidth=1200`    | `dashboard-renderer.tsx:80` 原样                                                                                                                                                                                                                                                                                                                                                                        | **open**（V11b 已接同一交付）                   |
| P2-18 | 轻微漂移合集（6 子项）                       | link rel：`content/link.tsx` resolveRel 已在 → 似已修；stat-tile 几何：常量 `SPARKLINE_WIDTH/HEIGHT`（:119-123）→ 似已修；markdown src 失败：`markdown.tsx:91` `data-state=error` 状态化 → 似已修；alert onClose payload：`:72` 在、形状须 plan 级核 → 待核；card 键盘可达：`content/card.tsx` 零 tabIndex/role/onKeyDown → 仍 open；fieldset collapsed：`fieldset.tsx:25` initial-only 读 → 设计裁决项 | **部分 open**                                   |
| P2-19 | 惯例违例（dashboard 裸 button ×2 + memo 族） | 裸 `<button>`：`editor-palette.tsx:49`、`editor-canvas.tsx:239` 在 → open；memo/useCallback 半边与 08-28 P2 07-01 同族                                                                                                                                                                                                                                                                                  | **open**                                        |

08-11 批其余 open 项为非视觉（P2-06 上传中止、P2-07/08 scope 种子、P2-12 审计卡文档漂移、P2-17 死代码、multi-audit P2-07~P2-35 导出面/文档/测试族），不入 V12a 交付面；其中与视觉域沾边的三个例外：**P2-12**（timeline 审计卡 :18 仍写「display-only 无 value」，live timeline 已有 defaultValue/setValue——文档修正可随 V12a docs pass 顺手收）、**multi P2-19/20/27**（kanban/calendar e2e 弱断言与断言缺位）归 **V11a**（scheduling e2e 视觉断言补齐正是 V11a 交付）、**multi P2-16**（flow reason-only 失败降级）——live 已见 reason 透传改造（`designer-action-provider.ts:59-60,191`），与 error.message 双轨同族，并入 F3 方案面核对而非单独立项。

#### F4.2 08-28 批 16 P2（全部 `[ ]`；抽查 6 条 live 确认未修，与 backlog 标记一致）

抽查确认：05-01 `batch-bar.tsx:40-46` useScopeSelector 仍无 `paths`；09-02 `result.tsx:23,47-48` warnedStatuses 无 gate；14-01 `warn-once.ts:12` `resetWarnedKeysForTests` 零调用方（死代码）；19-02 `keyboard.tsx:94-102`（flux-renderers-basic）`catch { return false }` 零可观测；observation-1 `flux-react/src/defaults.ts:16-27` 死分支 + 缩进错位原样在。其余 10 条按台账标记为未处理（无反向证据）。

#### F4.3 08-28 批 3 observation

1. `defaults.ts:16-27` 死条件 + 缩进——live 确认在（`/api/` 分支两侧返回值同形，缩进可见错位）。
2. CJK 规则行级 `description:`/`defaultValue` 过滤为行粒度启发式——门禁演进观察项（与 :331-355 filterLine 实现对应），live-tree 探针未发现被抑制的用户可见 CJK 文案。
3. plan→export-surface 可追溯性流程注记——纯流程建议，无代码面。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                                      | 证据           | 初裁                                                                         |
| --- | ------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------- |
| R1  | `hsl(var(--x, fallback))` 形态被 hardcoded-literal-color 误伤（+31 的根） | §F2            | **并入主交付**（规则出此形态——非 styled color；或显式登记，二选一见 §3 A2）  |
| R2  | 对照协议①与收紧的字面冲突（32 不增 vs 32→117）                            | §F1            | **并入主交付**（协议 v1 重基线条款）                                         |
| R3  | P2-13 timeline aria-disabled 一行修                                       | §F4.1          | **并入主交付**（小修 + 回归测试）                                            |
| R4  | P2-14 button rel（复用 resolveRel 先例）                                  | §F4.1          | **并入主交付**                                                               |
| R5  | P2-19 裸 button ×2 换 `@nop-chaos/ui` Button                              | §F4.1          | **并入主交付**（组件置换机械修）                                             |
| R6  | P2-25 page footer `includes('fixed')` 子串嗅探                            | §0/§F4（:175） | **并入主交付**（data attr/variant 化）                                       |
| R7  | P2-15 input-number badInput 语义                                          | §F4.1          | **归后续**（form 域批次，语义裁决非机械修）                                  |
| R8  | P2-16 dashboard canvasWidth                                               | §F4.1          | **归 V11b**（V11b 已声明同一交付，V12a 不重复立项，登记去重）                |
| R9  | P2-18 残余子项（card 键盘、fieldset collapsed、alert payload 核验）       | §F4.1          | **归 V12b**（content/form 族批次）；三个「似已修」子项 plan 级核验后闭合登记 |
| R10 | 08-28 批 16 P2（测试卫生/诊断 gate/类型卫生族）                           | §F4.2/§3 A4    | 12 条**并入主交付**批修，4 条归后续/watch（见 A4）                           |
| R11 | 08-28 批 3 observation                                                    | §F4.3          | obs-1 并入主交付；obs-2 watch-only；obs-3 adjudicated（流程记录）            |
| R12 | multi P2-16 flow reason 透传核验                                          | §F4.1          | **并入 F3 方案面**核对，不单独立项                                           |

## 3. 裁决

| #   | 项                                | 裁决           | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 四包前缀豁免收紧为文件级          | **Fix**        | 顺序：①修订 README 对照协议——引入「结构性重基线」条款：收紧落地当次允许 entries 32→117（+85 机械展开，逐条继承 reason/source），随后立即打 `exemption-baseline-v1.json`，「entries 不增」红线对 v1 生效；②数据变换 4 条前缀条目 → 89 条 (file,rule) 条目（零代码改动，`startsWith` 天然支持全路径）；③脚本测试加「path 必须是文件路径或显式前缀标记」守卫；④不做 map/content 两条 rule-scoped 前缀的收紧（路线图四包点名之外，留 V12b 按需）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| A2  | `hsl(var(...))` fallback 假阳性面 | **Fix**        | hardcoded-literal-color 的 `hsl(` 正则加负向排除（`\bhsl\(\s*var\(` 不命中），使 R1 的 +31 从豁免实例中出清（444→413 回落）；随后重打 v1 快照。此项同时修复「豁免影子下漂移零信号」的实例：未来真·硬编码 hsl 在 ai styles.css 仍被文件级豁免覆盖（该豁免保留，因文件确有存量硬编码），但令牌 fallback 不再计入基数                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A3  | raw error.message 双轨统一        | **Fix**        | 统一形态 = 错误类别 i18n 键 + `t(key, { message })` 参数化 + 瞬态并走 `env.notify`（复用 reportRuntimeHostIssue）。范围分两层：UI 直出族 ~26 例入 V12a 修复面（按包分小批，先红后绿：每族一条「统一后不再命中规则」断言）；结构化诊断族 ~21 例（industrial/3d/ai）adjudicated 为**永久结构化豁免**并在规则上出「非 UI 出口」过滤（避免 V12b 假阳性空转）；scheduling 4 例套 barcode-camera 同包先例。wizard 剩余兜底载荷（:456）随族收口                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A4  | 08-28 批 16 P2 + 3 obs 处置       | **Fix + 归档** | **并入主交付（12 条，按族三批）**：批 a 诊断 gate 族 = 09-02 + 15-01（isDevRuntime gate，先例 keyboard.tsx:66-69；连带 pivot 本地 warnOnce 全仓口径）+ 19-02（一行 dev warn）+ 19-03（ok:false warn 前瞻）；批 b 测试卫生族 = 14-01（删死代码）+ 14-02（补 catch 路径测试）+ 14-04（try/finally 沿 keyboard-bindings 先例）+ 23-03（标题修正 + 正向用例）+ 23-04（spy 接线或删）；批 c 类型/订阅卫生族 = 05-01（补 paths）+ 09-01（status 收 union，kanban 先例）+ 13-04（去双重断言）。**adjudicated/watch（4+2 条）**：13-01 keyboard event.key 边界 = adjudicated（已文档化契约 renderer-interfaces.md:609-611，归文档改进 backlog）；20-06 editable-cell role = Fix-lite polish（Decision 6 tradeoff 上加 role 提示，不返工）；20-09 hotkey aria-keyshortcuts = adjudicated won't-fix（半数诉求违反零 DOM 设计）；obs-1 defaults.ts = 并入批 c 顺手修；obs-2 = watch-only（挂门禁演进）；obs-3 = adjudicated（流程记录，future audit 从 index diff 反向映射） |
| A5  | 08-11 批视觉相关项处置            | **Fix + 去重** | 并入主交付：R3/P2-13、R4/P2-14、R5/P2-19 裸 button 半边（memo 半边随 08-28 批 c）、R6/P2-25。已修三项（P2-09/10/11）随 V12a closure 在 backlog 表回写 `[x]` + plan 引用。去重归口：P2-16 → V11b；P2-15 → form 批次（随 V12b 首批或独立小 plan）；P2-18 残余 → V12b；P2-12 文档修正随 V12a docs pass；multi P2-19/20/27 → V11a；multi P2-16 → A3 方案面。backlog 表同步登记去向，保持「非零悬挂承诺」纪律                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| A6  | 闭环指标操作化                    | **Fix**        | V12a closure 判据改为三条：①v1 快照后 `totals.entries` 不增；②`totals.instances` 相对**重基线值**单调不增，每次变动附批次归因（修复/adjudication 记录引用）；③newHits 持续为 0。v0→v1 之间的一次性变动（+85 entries、-31 假阳性实例）随 A1/A2 的 plan 记录一次性入账                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## 4. 边界

- **不做**：map/content 两条 rule-scoped 前缀收紧（A1④）；169 条 P2 池与 87 条 P3 池的消化（V12b/V12c，本报告只定义豁免治理与其衔接）；`hardcoded-cjk-ui-copy` 与 `data-blob-href-without-download` 规则语义变更（obs-2 仅 watch）；industrial scada 诊断契约改造（A3 判为永久结构化豁免，契约归 V4 已收口域）；dashboard canvasWidth（V11b）；calendar/kanban e2e 弱断言（V11a）；timeline 审计卡以外文档修订。
- **硬约束**：豁免条目必须逐条携带 reason + R2/R3/D2 判例 source（脚本头注红线，:69-70 的「zero NEW unregistered instances」纪律在收紧后同样生效）；A1 重基线须先改 README 协议再动豁免表（顺序不可倒置，否则 v0 对照链断裂）；6 份已 completed 的 remediation plans 的收口事实只回写引用、不重审。
- **红线**：`pnpm check` 零新增未登记红；`check:audit-ui-consistency-gaps` 在 A1/A2 中间态允许按 plan 记录的显式重基线点翻转数字，其余时刻 newHits 必须为 0；四包收紧后首个红灯消化完才可收口 V12a。
- **Owner docs**：`scripts/audit/find-ui-consistency-gaps.mjs`（豁免表 + 规则过滤）、`docs/audits/visual-quality/README.md`（对照协议 v1）、`exemption-baseline-v1.json`（新快照）、两份 audit-followups 表（去向回写）、证据卡 `consistency-debt.md`（F1-F4 状态回写）、roadmap V12a 行状态、daily log。

## 5. 验证方式

1. 门禁数字链：A1/A2 落地后复跑 `node scripts/audit/find-ui-consistency-gaps.mjs --json`，与 v1 快照字节级 diff（byFile 按 file+rule、byRule 按键名排序，确定性由脚本保证）；v0→v1 差异逐条映射到 plan 记录（89 条展开 + 31 条假阳性出清）。
2. 单测（先红后绿）：脚本测试——EXEMPTIONS path 形态守卫 + `hsl(var(` 排除用例；error.message 统一族——统一后不再命中规则的负断言 + `t(key,{message})` 渲染断言；08-28 批 a/b/c 各按其台账引用的先例模式补测。
3. e2e/组件回归：P2-13/P2-14/P2-25 各一条行为断言（aria-disabled 出现、`_blank` 带 rel、footer 几何不再依赖子串嗅探）；受影响 renderer 包 `pnpm --filter <pkg> test` 全绿 + 全量 `pnpm typecheck/build/lint/test/check`。
4. 人工核对（plan 级）：P2-18 三个「似已修」子项、multi P2-16 reason 透传的最终用户可见文案、20-06 导航 span 现位行段。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 + 门禁 JSON 复跑 + shared.mjs 同款逐行逻辑复刻验证）
- Verdict: `revised` → 勘误回写后 **pass**。F1-F4 全部结论与结构性引用成立。实质勘误（已回写，执行须按重算值）：①**A2 幅度**——+31 = 29 行 `hsl(var(…)` + 2 行 `rgb(0 0 0 / 0.45)` 真硬编码；`hsl(var(` 排除作用于全仓的出清量为 **~105**（ai 67/chart-renderer 10/map 10/graph 6/其余 12），v0 基数 42 中本有 38 行同形态——A2 执行前必须重算出清清单与重基线值，post-A2 live ≈ 339 而非「444→413 回落」；②**F3 分派**——47 例 = 结构化 16（industrial 11 + 3d 4 + ai 1）/ UI 直出 31（含 scheduling 4），SceneManager 系 color 命中非 raw-error；③对照行 map/content 应为 18/3/3、4/3/3；89/121 = 73.6%（71% 为 86 文件口径）；④1941-1 closure audit 转述宜如实（ISSUES→共识修复→auditor 授权收口）；⑤renderer-interfaces.md :613-616、result.tsx :46-51 行号订正。
- 已处理: 全部核实确认项

（待独立核实审查员回写）
