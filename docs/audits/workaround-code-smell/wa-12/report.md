# WA-12 设计器内核层审计批（editor-core + page-designer-core + flow-designer-core + report-designer-core + spreadsheet-core + word-editor-core）临时方案与坏味道审计报告

> 批次: WA-12（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 572（`docs/plans/572-workaround-audit-wa12-designer-cores-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-12 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账）

## 快照基准注记

plan 572 基线记载 HEAD = `502d6be7e`（WA-11 收口提交）；本报告取证实跑时 HEAD = `502d6be7e6d7e6bad9540eff3ede65d93d8ee757`，**基线与实跑同锚**。六包**零在途**：`git status -s` 对六包全目录 = 0 文件，live = HEAD。

**三口径行数逐文件分解**（103 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀，脚本化精确比对）：

| 口径           | 全集行数 | 说明                                                                                                          |
| -------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| inventory 口径 | 17,108   | WA-0 枚举器值（editor 701 + page 1,722 + flow 5,624 + report 2,443 + spreadsheet 4,742 + word 1,876）         |
| live wc        | 17,108   | = inventory **逐文件零差**（103/103 逐字吻合，零在途漂移文件——与 wa-11 的 ±2 差不同，本批连无尾换行差都没有） |
| HEAD wc        | 17,108   | = live（零在途）                                                                                              |

**基线候选 22 处全部复现**（grep/门禁实跑与 inventory + plan 572 Baseline 逐 file:line 吻合）：literalEn **0** + literalZh **0**（非测试面与测试面**双双全零**——wa-10 后连续第五个双零批组，本批连说明性命中都没有）+ typeBypass **4**（flow tree-validation.ts:284/:289 + page commands.ts:181/keyboard-navigation.ts:38，逐处落字见误报排除清单 #1）+ setTimeout **0** + domRaid **0** + keyRemount **0** + pixelNudge **0** + testEnvBranch **0** + silentCatch **0**（七探针全零——历批最少候选量坐实）。

oversized 门禁口径：六包 ≥500 行非测试源 **6 件**全部 WARN 档（gate 读数各 +1 系无尾换行差，plan 572 m4 注记精确复现）：flow core.ts 698 / tree-projection.ts 675 / types.ts 512、report core.ts 537、spreadsheet formula/formula-engine.ts 552、word document-io.ts 550。**6 件全部逐行精读**（见覆盖声明）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id              | 文件数 | 非测试行数                                             | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------- | ------ | ------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| editor-core          | 5      | 701（inventory）/ 701（live wc）/ 701（HEAD wc）       | ✅       | 5/5 **全文覆盖读取**（零抽样档）：editor-core.ts 339 / types.ts 196 / undo-command-stack.ts 121 / domain-registry.ts 26 / index.ts 19 全读；async 3 行逐条定性；六门禁 0；**零立案包**（全批最干净）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| page-designer-core   | 13     | 1,722（inventory）/ 1,722（live wc）/ 1,722（HEAD wc） | ✅       | 13/13 **全文覆盖读取**：commands 254 / tree-navigation 258 / tree-patch 242 / round-trip 194 / types 114 / command-serialization 136 / session 101 / palette-filter 101 / keyboard-navigation 85 / data-binding 61 / classify 51 / index 107 / inspector-schema 18 全读；typeBypass 2 逐个定性；INV-A..F 不变量注释链走读；git 考古 2 commit（dbd3c327b/0e5c670c3 邻域）                                                                                                                                                                                                                                                                                                                                                                                                         |
| flow-designer-core   | 29     | 5,624（inventory）/ 5,624（live wc）/ 5,624（HEAD wc） | ✅       | 29/29 **全文覆盖读取**：≥500 行 3 件全读（core.ts 698 / tree-projection.ts 675 / types.ts 512 逐行精读）+ tree-session-impl 491 / tree-validation 393 / tree-structure 399 / core-node-commands 199 / core-edge-commands 234 / graph-command-gate 223 / core/ 子目录 12 件 / tree-projection-nodes / tree-domain / elk-layout / designer-core-types / designer-store-adapter / config / config-migration / index 全读；typeBypass 2 + perf 3 + async 4 逐个定性；`Math.random`/`Date.now` 盲区探针 2 处定性；plan 544 种子（viewport keep/resetViewport 移除留痕、**fdChainGap/**fdBranchGroupOwner 投影装饰、tree-projection-nodes 抽取注释）按不翻案条款作考古锚核对一致；git 考古 8 commit（0e5c670c3/04e504f30/5a0dcc401/0529fe984/c936fcc38/d322c2195/b8ef4a555/1f54fb1ed） |
| report-designer-core | 14     | 2,443（inventory）/ 2,443（live wc）/ 2,443（HEAD wc） | ✅       | 14/14 **全文覆盖读取**：≥500 行 1 件全读（core.ts 537 逐行精读）+ core-dispatch 373 / types 401 / adapters 178 / metadata 368 / editor-core-adapter 90 / commands 93 / runtime 6 件（adapter-context/codec-commands/field-sources/inspector-panels/preview-commands/registry）/ index 全读；async 2 行逐个定性；AbortController 三通道纪律与 structuredClone 契约封印注释走读；git 考古 4 commit（dccce0022/eb99fc99f/fbd3cb6c2/13f1eeae3）                                                                                                                                                                                                                                                                                                                                      |
| spreadsheet-core     | 28     | 4,742（inventory）/ 4,742（live wc）/ 4,742（HEAD wc） | ✅       | 28/28 **全文覆盖读取**：≥500 行 1 件全读（formula/formula-engine.ts 552 逐行精读）+ core-dispatch 44 / commands.ts 228 / commands-base 275 / commands-style 153 / types 395 / core.ts 170 / command-handlers 9 件（cell 239/clipboard 67/history 125/sheet 213/structure 59/search 72/selection 148/types 18/index 38）/ core/ 9 件（cell-operations 426/clipboard-operations 197/document-access 104/filter 65/internal-state 101/search 222/sheet 207/sort 108/structure 169）/ formula/recalc-document 122 / editor-core-adapter 71 / index 155 全读；async 2 行逐个定性；ux-r4/P1.2（plan 547）注释链走读；git 考古 5 commit（d2b7bef55/eb99fc99f/053bbef4c/1928b710e/62a97fe18）                                                                                            |
| word-editor-core     | 14     | 1,876（inventory）/ 1,876（live wc）/ 1,876（HEAD wc） | ✅       | 14/14 **全文覆盖读取**：≥500 行 1 件全读（document-io.ts 550 逐行精读）+ canvas-editor-bridge 226 / template-expr 240 / template-tags 157 / dataset-store 158 / editor-store 143 / dataset-model 106 / chart-model 59 / code-model 49 / canvas-editor-types 38 / paper-settings 22 / template-model 21 / host-status 11 / index 97 全读；async 4 行逐个定性（可注入错误通道 setRecoveryLoadErrorHandler 正面样板）；wa-13b 转发两项（titleId 契约/无头预览搜索计数）在 core 侧完成根因取证（见转发评估节）；git 考古 3 commit（8e82c74f4/dccce0022 邻域/44e455aa8 族）                                                                                                                                                                                                           |

全集 **103/103**（17,108 行，无抽样档）。重复块探针双版（存 `_tmp/wa12-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 可执行行占比 ≥0.5，103 非测试文件 15,756 窗 → **75 组**[跨文件 33 + 同文件 42]；`_tmp/wa12-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6 + 均匀表剔除，15,486 窗 → **551 组**）。逐字 33 组跨文件命中人工同构复核坐实 **5 簇**：report↔spreadsheet editor-core-adapter deepEqual 逐字 15 行窗（→ CX-18 候选并案）、flow core.ts buildNodeCtx↔buildEdgeCtx getter 块（排除，见误报 #13）、designer-core-types:95-109 ↔ tree-session-impl:75-90 TreeSessionSurface 接口逐字镜像（排除，见误报 #11）、tree-session-impl 同文件 TreeSessionContext↔Input 镜像 29 行 ×2（其 4 个值拷贝字段 = WA-flow-designer-core-001 立案位点本体）、spreadsheet commands.ts 三方类型清单镜像（排除，见误报 #9）。归一 551 组按文件对聚类复核：最大簇全部为**平行结构族与声明式契约镜像**（node↔edge-operations 70 窗、cell↔sheet-handlers 62 窗、commands-base↔style 59 窗、report↔spreadsheet 命令接口 52 窗、四包 index.ts barrel 32 窗）——真实跨区命中与逐字版坐实簇一致 + 走读补 3 组探针盲区（applyMergeCellsCenter 同名同体双份[WA-spreadsheet-core-001]、树克隆三机制[WA-flow-designer-core-002]、word id 生成器四胞胎[WA-word-editor-core-001]）——与走读全并集，零漏检。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                     | 读数                                                                                                                                                                                                                                                                                           | 处置                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`        | **15 行命中**（editor-core ×3[editor-core.ts:34,126,148] + flow ×4[core-edge-commands:86,215/core-node-commands:51,155] + report core-dispatch ×2[221,370] + spreadsheet ×2[core-dispatch:41/search-operations:19] + word document-io ×4[403,415,505,517]——与 plan 572 基线逐 file:line 吻合） | 15 行逐个定性、未批量放行亦未批量立案：**15 处全豁免**（结构化 in-band 协议 / lifecycleHookError 事件路由 / 可注入错误通道 / console.warn 观测 / 契约注释降级——逐条见 async 定性表）+ **0 行独立立案** + 1 处 watch 微注记（editor cloneDocument fallback 静默降级）。六包 async 面整体是「命令边界 in-band 协议 + 可注入错误通道」的正面样本。 |
| `check:audit-performance-suspects`       | **3 行命中**（flow clone.ts:59 双报 + tree-validation.ts:79——与基线吻合）                                                                                                                                                                                                                      | 逐个定性：clone.ts:59 = documentsEquivalent 的 per-node stringify fallback（引用等价快路径前置 + plan 2026-09-29-4 R2-P14 注释锚——设计内豁免，双报系同位点两窗）；tree-validation.ts:79 = canonicalizeJsonValue 的字符串 JSON.stringify（canonical 序列化本体非比较滥用——豁免）。                                                               |
| `check:audit-reactive-render-reads`      | **0**                                                                                                                                                                                                                                                                                          | 实跑确认（六包为纯逻辑内核层，store 消费面全部经 subscribe/getState 投影）                                                                                                                                                                                                                                                                      |
| `check:audit-runtime-raw-schema-reads`   | **0**                                                                                                                                                                                                                                                                                          | 实跑确认（schema 面全部经 isSchema/registry 契约通道）                                                                                                                                                                                                                                                                                          |
| `check:audit-hardcoded-type-dispatch`    | **0**                                                                                                                                                                                                                                                                                          | 实跑确认（page/page-dispatch switch on command.kind 判别联合、spreadsheet/report registry Map 分派、flow gate——均非 type 字面量分派红形态）                                                                                                                                                                                                     |
| `check:audit-renderer-browser-io`        | **0**                                                                                                                                                                                                                                                                                          | 实跑确认（六包零 fetch/localStorage 直连；word localStorage 全部经 document-io getStorage 宿主封装——wa-13b 转发时已核验的封装面本轮全读确认）                                                                                                                                                                                                   |
| `check:oversized-code-files`（六包过滤） | 六包非测试 ≥500 行 **6 件**（gate 行数各 +1 无尾换行差）                                                                                                                                                                                                                                       | 6 件全部结构走读逐行精读；无新增超限（flow 系 plan 544 已抽 tree-projection-nodes 收敛后的稳态）                                                                                                                                                                                                                                                |

### async 门禁 15 行逐条定性（prompt §5 第 3 步留痕）

| 位点                                                          | 外层机制                                                                                                          | 判定                                                                                                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| editor-core.ts:34                                             | `cloneDocument` structuredClone catch → 浅拷贝/原引用回退                                                         | 豁免 + **watch 微注记 #1**——JSDoc 契约注释在案（「领域文档约定为可序列化 JSON 形态……回退浅拷贝并保守处理」），降级契约封闭但触发不可观测                                           |
| editor-core.ts:126                                            | applyDiff catch → `console.warn('[editor-core] applyDiff failed', error)` + false                                 | 豁免——有观测 + 返回值即结构化失败信号（undo/redo 调用方检查）                                                                                                                      |
| editor-core.ts:148                                            | runCommit serialize catch → `{ ok: false, error }` in-band                                                        | 豁免——命令边界结构化本体                                                                                                                                                           |
| flow core-edge-commands.ts:86 / core-node-commands.ts:51,:155 | beforeConnect/beforeCreateNode/beforeDelete 生命周期钩子 catch → `emit({type:'lifecycleHookError', hook, error})` | 豁免——钩子异常结构化路由到 DesignerEvent 事件通道（三处同构、事件即契约面）                                                                                                        |
| flow core-edge-commands.ts:215                                | 同上（beforeDelete edge 变体）                                                                                    | 豁免——同族                                                                                                                                                                         |
| report core-dispatch.ts:221                                   | preview catch → isAbortError 分流 + `{ok:false, cancelled                                                         | error}` in-band                                                                                                                                                                    | 豁免——AbortError 三态判别 + requestId 竞态守卫（:190-228 双通道） |
| report core-dispatch.ts:370                                   | dispatch 整体 catch → `{ ok: false, changed: false, error: err }`                                                 | 豁免——in-band 错误协议本体（与 spreadsheet core-dispatch:41 同构，跨包命令边界协议平行设计）                                                                                       |
| spreadsheet core-dispatch.ts:41                               | dispatch 整体 catch → `{ ok: false, changed: false, error: err }`                                                 | 豁免——同上；wa-13b 已核验其为 spreadsheet-renderers `fire()` 安全性的成立基础                                                                                                      |
| spreadsheet search-operations.ts:19                           | `new RegExp(query)` catch → null（regex 搜索静默禁用）                                                            | 豁免 + **watch 微注记 #3**——UNSAFE_REGEX_PATTERN 前置过滤在案，但用户输入非法 regex 得到「无匹配」无错误信号（W4 弱）；顺带注记 createSearchRegex 在 per-cell 循环内重编译的微低效 |
| word document-io.ts:403,:415,:505,:517                        | localStorage getItem/JSON.parse catch → `reportRecoveryLoadError({target, reason, error})`                        | 豁免——可注入错误通道（setRecoveryLoadErrorHandler）+ reason 枚举结构化 + 降级返回 null/[]；恢复链观测纪律正面样板                                                                  |

## 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` 非测试 = **0 命中**（含测试面亦零）；`临时|先这样|暂时|绕过|workaround|hotfix` 非测试 = **0 命中**（含测试面亦零）——与 inventory literalEn 0 + literalZh 0 双零基线逐字吻合（wa-10 之后连续第五个双零批组，且为**双探针含测试面全零**的最干净读数）。
2. **模式候选 22 处逐个定性**（grep/门禁复现与 inventory + plan Baseline 逐字吻合）：typeBypass 4 = **4 处全豁免**（flow tree-validation ×2 = host payload 契约校验保护区动态边界[watch 微注记 #2：签名可改 `tree: unknown` 收窄，保护区 plan-first]；page commands:181/keyboard-navigation:38 = schema 节点 Record 化读取动态边界，与 page 包内 getSessionId 同一防御家族）；setTimeout/domRaid/keyRemount/pixelNudge/testEnvBranch/silentCatch 六探针全零实跑复核；盲区探针：`Math.random|Date.now` 17 处（id 生成族 4 份立案 WA-word-editor-core-001 微、flow createTreeNodeId 注释在案豁免、page session seed+counter wa-10 #24 正面家族豁免、纯时间戳字段 ×11 豁免）、`requestAnimationFrame`/`dispatchEvent`/`location.reload`/`window.__` 全零；**模块顶层求值面单列定性 1 处**：`elk-layout.ts:4` 模块顶层 `new ELK()`（非状态污染的重库顶层构造轻形态——watch 微注记 #5，不属 WA-content-009 全局状态家族）。
3. **门禁交叉**：上表 7 项实跑；async 15 行逐条定性（15 豁免 + 0 独立立案 + 1 watch）；perf 3 位点定性（全豁免）。
4. **重复块识别**：双探针 + 人工同构复核坐实 **7 组**（跨包孪生 2 → editor-core-adapter deepEqual[CX-18 并案] + reportr-008 快照切片族[承接，见转发评估]；包内复制 4 → 树克隆三机制[WA-flow-designer-core-002]、applyMergeCellsCenter 死副本[WA-spreadsheet-core-001]、clamp 三写[WA-flow-designer-core-004]、word id 生成器四胞胎[WA-word-editor-core-001]；声明双写 1 → 树常量+TreeChangeReason 双声明族[WA-flow-designer-core-003]，page SessionNodeId 同族另立[WA-page-designer-core-001]），其余 550+ 组为平行结构族/声明式契约镜像/barrel 镜像/框架接线惯用形（判据见误报排除清单）。
5. **范围结构走读**：**103/103 全文覆盖**（17,108 行 live wc，无抽样档）。≥500 行 6 件全读（flow core 698 / tree-projection 675 / types 512、report core 537、spreadsheet formula-engine 552、word document-io 550 逐行精读）。分档落字：核心实现（flow core.ts + core/ 全目录 + 树族五件 + 双命令文件 + gate；report core/core-dispatch/types/metadata/adapters；spreadsheet core.ts + dispatch + 三命令声明件 + handler 九件 + core/ 九件 + formula 两件；word bridge/document-io/双 store/模型五件；page 全 13 件）逐行精读约 70 件；类型声明件/barrel/契约件全文过读 + 信号扫描约 33 件。特别条款三件独立取证：①plan 544 种子（tree-projection/tree-session、**fdChainGap/**fdBranchGroupOwner）按考古锚条款核对——tree-projection-nodes.ts 头注释、tree-session-impl.ts:217-221/:296-298 plan 544 seed 2 adjudication 注释逐字在案，**不翻案**（WA-flow-designer-core-001 的 ctx 陈旧修复不触碰种子裁定行为）；②模块顶层求值面候选（elk-layout new ELK()）单列定性入 watch；③保护区核对——tree-validation.ts 与各 core-dispatch 校验逻辑未立案任何批内修改，变更方向全部写 CX-n/watch。
6. **已收敛模式三档复核**：①cq-2 clone 收口（`5a0dcc401`）——flow core/clone.ts:36-38 注释自称「the only remaining hand-rolled JSON deep-clone branch——flux-core cloneDeep is the shared implementation for all other call sites」，**live 复核发现该断言不完整**：tree-structure.ts 手写克隆族（0e5c670c3 出生，早于 cq-2 两月）未被收口波扫入——本批唯一一处「收口波范围缺口」复发（立案 WA-flow-designer-core-002，与 wa-13b flowr-010/wordr-001 收口缺口家族同型）；②cq-3/cq-4 包内收敛（`5ad81bbf2`/`ccc4ac7ed`）——spreadsheet document-access replaceSheet combinator 注释逐字在案 ✅、DesignerPageSchemaInputBase 共享 preamble 在案 ✅；③cq-5 test-placement——report/word 两处 `__tests__/test-utils` 为测试基建非生产面误置（与 ai-test-support 不同：位置已在 `__tests__/` 内），记不适用；④cq-6 debug residue（`2c94d9d7f`）——`window.__` 六包全零 ✅ 零复发。
7. **git 考古**：21 commit 溯源（详见逐条发现）。锚点核验——`eb99fc99f`（2026-03-25 report+spreadsheet 包首提交：canonical cellAddress 出生锚）、`dccce0022`（2026-04-26 report runtime 分模块：metadata 内联列地址公式出生）、`d2b7bef55`（2026-04-03 spreadsheet core.ts 抽取：applyMergeCellsCenter 双份 + applySimpleDocumentMutation 同日出生）、`0e5c670c3`（2026-08-06 plan-2026-08-06-0324 tree session：树常量双声明 + tree-structure 手写克隆 + tree-session ctx 值捕获 + `void commandType` 同 commit 出生）、`1928b710e`/`fbd3cb6c2`（2026-10-04 P1.2/P1.3 同日双 commit：deepEqual 逐字孪生 + undo/redo 操作时点骨架孪生的复制链实证）、`13f1eeae3`（2026-07-20 readOnly 门出生）、`0529fe984`（2026-03-30 elk-layout 出生）、`8e82c74f4`（2026-04-04 chart/code 模型：id 生成器孪生出生）。**症状性 message 专项**：抽检六包 2026-06-01 以来 commit 40 条（全集 44 条，4 条为 merge/chore 与 wip——wip 1 条[b3afb10bd]为诚实在途标记带已知问题描述，非症状性修复落库），40/40 带 plan 引用/根因链/full-green 标记/审计锚——**症状性 message 0**。
8. **误报排除复核**：20 项全记录（§误报排除清单）；与 wa-7..11/13a/13b 判例互通（registry 双形态注释豁免、命令 ctx 组装双份、声明式契约镜像、收口缺口家族、knip 收私候选定性）；与 CX-10/CX-13/CX-16/CX-17 交界按 plan 572 条款逐一核对记不适用（本批纯 core，无菜单壳/ghost/Tree 渲染层位点）。

## 逐条发现（Findings）

> 每条按 12 字段模板（id/位置/信号类别/症状/根因/考古/严重度+判据/修复方向/去向/验证方式/现状/跨批关联）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-editor-core-001`/`WA-page-designer-core-001`/`WA-flow-designer-core-001`/`WA-report-designer-core-001`/`WA-spreadsheet-core-001`/`WA-word-editor-core-001` 起三位零填充，与既有前缀零撞号——live 核验通过），本节与台账一一对应，零静默。
> ID 编排说明：立案 **13 条 = P1 ×3 + P2 ×1 + P3 ×9；零 P0；editor-core 零立案**。严重度按本批任务口径映射（P0/P1=行为缺陷；P2=结构性复制漂移/W4 静默守卫族；P3=沉积/注释/命名）。

### WA-flow-designer-core-001 [B·行为缺陷] 树会话 ctx 按值捕获陈旧 transactionStack：事务内树命令中途入栈 + treeChanged 提前发射

- **位置**: `packages/flow-designer-core/src/core.ts:679`（`buildTreeSessionContext({ ... transactionStack, ... })` 按值传递）↔ 同文件 `:257-259`/`:281-283`（buildNodeCtx/buildEdgeCtx 用 `get transactionStack() { return transactionStack; }` live getter）+ `packages/flow-designer-core/src/tree-session-impl.ts:214`/`:225`（`ctx.transactionStack.length === 0` 双消费位点）+ `:153-156`（`historyState`/`savedTreeDocument`/`savedRevision` 同批按值捕获——**零消费死契约面**）+ `:190`（`void commandType` 弃参）
- **信号类别**: B 邻（陈旧快照守卫——守卫读的是永不变的初值）+ W3（同包两套 ctx 边界语义不一致）+ W5（死契约面无人能答「删掉会怎样」）
- **症状/根因**: `beginTransactionState` 以不可变更新返回**新数组**（transactions.ts:23-31），core.ts 闭包变量随之重指向；而 TreeSessionContext 在 core 创建时一次性捕获初始 `[]`，此后 `ctx.transactionStack.length === 0` **恒真**。后果：树命令（insertChainNode/updateTreeNodeData 等 11 个）在事务内执行时 ①`ctx.pushHistory()` **中途入栈**（破坏「一次手势 = 一条 undo 步」契约），②`ctx.emitTreeChanged` 即时发射（core.ts:565-572 的设计是延至 commit 以 `commandType:'transaction'` 发射），commitTransaction 时 `shouldPushHistory=true` **再入栈一次**——同一手势产生双 undo 条目 + 双 treeChanged。**可达性已钉定**：core.test.ts:225-241 「tree rollback」测试显式组合 `beginTransaction → updateTreeNodeData → rollbackTransaction`（组合是受支持场景），测试仅断言回滚后文档态未断言历史深度，故双入栈未被现有绿测捕获。
- **考古**: 全部出生同一 commit `0e5c670c3`（2026-08-06 plan-2026-08-06-0324 flow tree session + single projection）——tree-session 从 core.ts 抽取时，node/edge ctx 用 live getter 而树 ctx 六个可变字段中只给 doc/docRevision/currentTreeDocument 配了 getter/setter（tree-session-impl.ts:133-152），另三个（historyState/savedTreeDocument/savedRevision）连同 transactionStack 按值拷贝且前三个从未被 surface 消费。
- **严重度**: **P1**（行为缺陷：公开 API 组合路径下 undo 语义被破坏；降 P0 缓解因子显式记录——renderers 层当前零组合用法[grep 证]，触发面限宿主/测试组合）
- **修复方向**: core.ts 的 buildTreeSessionContext 入参改 live 通道（`getTransactionStack: () => transactionStack` + TreeSessionContext 补 getter；或最小修=树命令内改用 core 已有 `isInTransaction()` 语义通道）；随修删除 ctx 三个零消费字段与 `void commandType` 弃参（或补齐 commandType 透传——二选一需 Phase 2 拍板）。**plan 544 种子裁定（viewport keep、rollback 文档态）必须保持**——core.test.ts:232 「tree rollback」用例为现成回归守卫；新增判别测试：事务内树命令 → 断言 `canUndo()` 不中途翻转/commit 后 undoDepth 增量恰为 1（先红后绿）。
- **去向**: 批内修候选（Phase 2；不触 index.ts 公共导出面——TreeSessionContext 为包内接口）
- **验证方式**: flow 包 filter 四门禁全绿；core.test.ts 既有 197 用例零回归 + 新增历史深度判别测试先红后绿；`grep -n "void commandType" tree-session-impl.ts` = 0
- **现状**: live（本报告 HEAD 快照）
- **跨批关联**: plan 544 种子邻域（修复不翻案）；knip 四条 TreeSessionContext 族 type 登记即本案死契约面的旁证

### WA-flow-designer-core-002 [H] 树文档深克隆三机制并存：cq-2 收口断言与 live 不符（收口波范围缺口）

- **位置**: `packages/flow-designer-core/src/core/clone.ts:34-43`（cloneTreeDocument：structuredClone 主 + JSON round-trip fallback；:36-38 注释自称「the only remaining hand-rolled JSON deep-clone branch——flux-core cloneDeep is the shared implementation for all other call sites, cq-2 Phase 1」）↔ `packages/flow-designer-core/src/tree-structure.ts:13-62`（cloneTreeValue + cloneTreeNode + cloneTreeDocument 手写结构克隆 ~50 行，10 个树命令全部经此克隆）↔ `packages/flow-designer-core/src/tree-session-impl.ts:33-35`（cloneTreeDocumentValue 经 flux-core cloneDeep）
- **信号类别**: H（同一基础设施多处手写——TreeDocument 深隔离三机制）
- **症状/根因**: 同一文档类型在同一包内有三套深克隆实现；core/clone.ts 的 cq-2 收口注释断言「其余全部调用点已单源 cloneDeep」与 live 不符（tree-structure 家族在其出生两个月后的 cq-2 收口波中被遗漏）——出口注释本身已失真（W2 出口过期形态）；树 validate 后均为 JSON-safe，三机制语义当前等价、零行为漂移，但未来任一机制改动（如 structuredClone 环境守卫调整）即三处同步税。
- **考古**: tree-structure 手写克隆族出生 `0e5c670c3`（2026-08-06）；core/clone.ts structuredClone 版 `04e504f30`（2026-09-29）→ cq-2 收口 `5a0dcc401`（2026-10-01）落注释——收口波未回扫 tree-structure（与 wa-13b flowr-010/wordr-001「收口波范围缺口」家族同型）。
- **严重度**: **P2**（判据：≥3 份同根因按 prompt §3 P1 起评；**降档显式记录**——单包内封闭、树 JSON-safe 契约下三机制行为等价、无已兑现漂移，按本批任务口径「结构性复制漂移」归 P2）
- **修复方向**: tree-structure.ts 删手写克隆族改 import core/clone.ts 的 cloneTreeDocument（或统一 flux-core cloneDeep——随 Phase 2 拍板单源落点）；core/clone.ts 注释同步改写为真单源声明
- **去向**: 批内修候选
- **验证方式**: flow 包 filter 四门禁全绿；clone-equivalence.test.ts（既有多向克隆等价测试）直通；`grep -c "function cloneTreeValue" tree-structure.ts` = 0
- **现状**: live
- **跨批关联**: cq-2（`5a0dcc401`）收口范围缺口家族第三例（wa-13b flowr-010/wordr-001 前例）；knip tree-structure.ts#cloneTreeDocument/cloneTreeNode 两条登记为旁证

### WA-flow-designer-core-003 [I 邻] 树域常量与 TreeChangeReason 双声明：同一 commit 出生即双写、barrel 双路径遮蔽

- **位置**: ①`packages/flow-designer-core/src/tree-validation.ts:10-12`（TREE_INTERNAL_ID_PREFIX / TREE_EMPTY_SLOT_NODE_TYPE / TREE_VIRTUAL_DATA_KEY）↔ `packages/flow-designer-core/src/types.ts:490-492`（同三常量第二份）；②`packages/flow-designer-core/src/types.ts:494`（TreeChangeReason）↔ `packages/flow-designer-core/src/core.ts:52`（同类型第二份——knip 登记 core.ts#TreeChangeReason 未消费）；③index.ts 双路径导出（:1 `export * from './types.js'` + :9-15/:33 显式 named re-export 自 tree-projection——ESM 语义下显式导出遮蔽 `export *`，外部消费者实取 tree-validation 份，types.ts 份成死值）
- **信号类别**: I 邻（声明双写/化石特征——词汇无单源，WA-sheetr-004 StyleToolType 双声明同族跨包第 2 例）
- **症状/根因**: 改任一份（尤其 types.ts 份）另一份静默漂移；当前零漂移（逐字核对同值）。根因 = `0e5c670c3` 单 commit 同时落两份声明，无人收口。
- **考古**: `0e5c670c3`（2026-08-06）双份同 commit 出生；knip 基线对 tree-projection/tree-validation 两层重导出各记一条（本批定性 = 常量双声明的导出面症状）。
- **严重度**: P3（判据：双声明零漂移、编译器在 barrel 遮蔽处兜底[types.ts 份改动不影响外部——但会误导内部读者]）
- **修复方向**: types.ts:490-494 删四份死声明改 `export type { TreeChangeReason }`/`export { TREE_... }` 自 tree-validation（或反向，以消费面为准单源）；包内私有变更零公共面影响（barrel 输出符号集不变）
- **去向**: 批内修候选
- **验证方式**: flow 包 filter 四门禁全绿；`grep -c "TREE_INTERNAL_ID_PREFIX = " src` = 1；knip 基线遇符号路径变化沿 plan 571 先例以修代重立基线
- **现状**: live
- **跨批关联**: WA-sheetr-004（spreadsheet-renderers StyleToolType 双声明）跨包同族；knip 登记债定性输入

### WA-flow-designer-core-004 [H 微] 坐标 clamp 三写：commands 内联双份绕开既有单源

- **位置**: `packages/flow-designer-core/src/core-node-commands.ts:69-71`（addNodeCommand 内联 `Math.max(-10000, Math.min(10000, Math.round(...)))`）+ `:122-125`（moveNodeCommand 内联同式）↔ `packages/flow-designer-core/src/core/node-operations.ts:3-13`（COORD_MIN/COORD_MAX + clampCoordinate 单源）
- **信号类别**: H 微（同文件族绕开 60 行外既有 helper）
- **症状/根因**: COORD 常量若在 node-operations 调整，两处内联副本静默漂移（clamp 边界不一致）。updateMultipleNodes/layoutNodes 路径已正确走 clampPosition——同文件族内即不一致。
- **考古**: `c936fcc38`（2026-04-03 core.ts 抽取波）——抽取时命令文件与 operations 文件各自落笔。
- **严重度**: P3（判据：2 份 ×3 行微复制、零现行漂移）
- **修复方向**: 两处改 import clampPosition
- **去向**: 批内修候选
- **验证方式**: flow 包 filter 四门禁全绿；`grep -c "Math.max(-10000" core-node-commands.ts` = 0
- **现状**: live
- **跨批关联**: 无

### WA-flow-designer-core-005 [I 邻] constraints 错误消息「playground example」措辞沉积：demo 时代字符串随抽取进 core

- **位置**: `packages/flow-designer-core/src/core/constraints.ts:3-5`（EDGE_SELF_LOOP_ERROR / EDGE_DUPLICATE_ERROR 消息含「in the playground example」）
- **信号类别**: I 邻（演进残留——包角色措辞失真；core 包错误消息向宿主描述自己为 playground 示例）
- **症状/根因**: 字符串经 reconnectEdgeCommand reason 映射消费（用户/宿主可见面）；「playground example」描述与 core 包角色不符，误导宿主侧错误归因。根因 = playground 时代内联消息随 `c936fcc38`（2026-04-03 core.ts 抽取）整体搬迁未回改。
- **考古**: `c936fcc38`（2026-04-03）；后续 zero 触及。
- **严重度**: P3（判据：措辞沉积零行为面）
- **修复方向**: 两串改「Self-loop edges are not allowed.」/「Duplicate edges are not allowed.」（消费方 reconnectEdgeCommand 以 `=== EDGE_MISSING_NODE_ERROR` 字符串比较映射 reason——改值须同文件同步，单源常量本身即守卫）；注意 EDGE_MISSING_NODE_ERROR 无 playground 字样不动
- **去向**: 批内修候选
- **验证方式**: flow 包 filter 四门禁全绿（reconnectEdge reason 映射测试直通）；`grep -c "playground example" src` = 0
- **现状**: live
- **跨批关联**: wa-13b wordr-009（裸英文用户面串）低配同族——本例非 i18n 缺失而是措辞失真

### WA-page-designer-core-001 [I 邻] SessionNodeId 类型双声明：types.ts 与 round-trip.ts 各持一份

- **位置**: `packages/page-designer-core/src/types.ts:18`（`export type SessionNodeId = string`，barrel 消费版）↔ `packages/page-designer-core/src/round-trip.ts:37`（同名第二份——knip 登记 `round-trip.ts#SessionNodeId` 未消费）
- **信号类别**: I 邻（声明双写——WA-flow-designer-core-003 同族，page 包第 1 例）
- **症状/根因**: 语义别名双写零漂移（同字面 `string`）；round-trip 份死导出。根因 = types 层与 round-trip 层各自声明会话词汇。
- **考古**: 包首提交波（`a48bb04c8` 2026-09-27 page-designer MVP）两件同日落笔。
- **严重度**: P3（判据：类型别名双写、编译器零风险、纯词汇治理）
- **修复方向**: round-trip.ts 改 `import type { SessionNodeId } from './types.js'`（或删除本地声明用 types 份）；round-trip 的 index.ts 导出行（:31 SidRandom/SchemaNodeEntry）不受影响
- **去向**: 批内修候选
- **验证方式**: page 包 filter 四门禁全绿；knip 遇路径变化以修代重立基线（plan 571 先例）
- **现状**: live
- **跨批关联**: WA-flow-designer-core-003 同族（跨包第 2 例——双声明家族在六包内累计 3 例[含 sheetr-004 前例]，已够共性观察注记）

### WA-report-designer-core-001 [A·行为缺陷] 列地址内联手写 `String.fromCharCode(65 + col)`：col≥26 越界产出非法键，canonical 早生 32 天未被引用

- **位置**: `packages/report-designer-core/src/runtime/metadata.ts:336`（`applyFieldDrop` range 分支 entryKey 生成）
- **信号类别**: A 邻（魔法公式内联——单字母列假设的越界特判缺失）+ W3（canonical `cellAddress` 在本包已依赖的 spreadsheet-core 公共导出中）
- **症状/根因**: `65 + col` 仅对 col 0-25（A-Z）正确；col≥26 产出 `[`/`\`… 非法字符键，与 `SpreadsheetCellRef.address`（canonical cellAddress 双字母/三字母口径）脱钩——**范围列宽 >26 的 range drop 元数据落不可达键**（getMetadata 按 canonical 地址查询永不命中，元数据孤儿化）。修复路径已有包内先例：wa-13b WA-reportr-001 修的正是本包 renderers 侧同病（改 import 后 fixed）。**依赖已在**：report-designer-core/package.json `"@nop-chaos/spreadsheet-core": "workspace:*"`、types.ts:3-7 已 import 其类型——import 函数零新增依赖。
- **考古**: canonical `eb99fc99f`（2026-03-25 spreadsheet 包首提交）→ 内联公式 `dccce0022`（2026-04-26 runtime 分模块，-S 溯源该行此 commit 落入 metadata.ts）——**canonical 早生 32 天**而手写第二份，W1 根因可指认（分模块重构时未查依赖包既有导出）。
- **严重度**: **P1**（行为缺陷：宽 range 触发元数据静默丢失；缓解因子——demo/常见报表 range 宽度多 <26 列，故不升 P0）
- **修复方向**: `const entryKey = cellAddress(row, col)`（`import { cellAddress } from '@nop-chaos/spreadsheet-core'`）；**零公共导出变更**（消费既有导出）
- **去向**: 批内修候选（P1 先红后绿）
- **验证方式**: report/spreadsheet filter 四门禁全绿；新增判别测试：`endCol: 27` range drop → `getMetadata({kind:'cell', cell:{address:'AA2',...}})` 命中（先红后绿）；`grep -c "String.fromCharCode(65" src` = 0（测试文件内的同式用法[adapters-and-helpers.test.ts:299]属测试自身小 range 断言，随案顺手改用 cellAddress 亦可）
- **现状**: live
- **跨批关联**: WA-reportr-001（wa-13b，renderers 侧同病已修）——同包同病灶第 2 例，本例在 core 侧（WA-12 范围内）

### WA-report-designer-core-002 [B·行为缺陷] getTargetMeta range 分支恒取 `rangeEntries[0].meta`：不按 range id 匹配，多 range 场景读错档 + drop 交叉污染

- **位置**: `packages/report-designer-core/src/types.ts:361-367`（getTargetMeta 'range' 分支 `return rangeEntries[0].meta`）↔ 同文件 `:280-301`（updateMetadata range 分支按 `${sheetId}:${startRow}:${startCol}:${endRow}:${endCol}` 派生 id 精确读写）
- **信号类别**: B 邻（读写不对称的静默错档——读侧守卫语义与写侧契约脱节）+ W3（id 派生逻辑单点应在、读侧未复用）
- **症状/根因**: ①显示错档——buildSnapshot activeMeta（core.ts:67-69）与 getMetadata(range target)（core.ts:463-465）在 sheet 内存在多个 range meta 时恒返回**第一个** range 的 meta；②**交叉污染**——core-dispatch.ts:109（dropFieldToTarget adapter 路径）与 :140（updateMeta）以 `mergeMetadata(getTargetMeta(...)=首个 range meta, patch)` 生成 nextMeta，再经 updateMetadata 按**所选** range id 写入：首个 range 的元数据键值被并入选中 range 的 meta（A 的 meta 泄漏进 B）。写侧 updateMetadata 的 range id 派生是现成单源。
- **考古**: types.ts range 族随包首提交波落位（`eb99fc99f` 2026-03-25）；后续 D3.3 report surface audit（`7b8907daf` 2026-08-08 关 7 卡）未触读侧；现有测试只覆盖空 semantic 下单 range drop（adapters-and-helpers.test.ts:278-305 走 applyFieldDrop per-cell fallback，不经污染路径）。
- **严重度**: **P1**（行为缺陷：多 range + adapter/merge 路径下元数据错档与交叉污染；缓解因子——触发需同 sheet 存量 range meta + 另一 range 目标的组合，不升 P0）
- **修复方向**: getTargetMeta range 分支复用 updateMetadata 同款 id 派生（提取包内私有 `rangeMetaId(range)` 单源），`rangeEntries.find(item => item.id === id)?.meta`；判别测试：两个 range 各自 setRangeMeta → getTargetMeta(range B) 返回 B 的 meta（先红后绿）+ dropFieldToTarget(range B) 后 range A meta 不变（先红后绿）
- **去向**: 批内修候选（P1 先红后绿）
- **验证方式**: report filter 四门禁全绿；`grep -n "rangeEntries\[0\]" src` = 0
- **现状**: live
- **跨批关联**: 无（包内封闭；isSameTarget/updateMetadata 写侧均正确——仅此一读点）

### WA-report-designer-core-003 [I 邻·W3] MUTATION_COMMAND_TYPES 裸 `Set<string>`：同包已有编译期穷尽技术而 readonly 门未采用

- **位置**: `packages/report-designer-core/src/core.ts:372-382`（MUTATION_COMMAND_TYPES 12 字符串 Set）↔ `packages/report-designer-core/src/editor-core-adapter.ts:47-60`（COMMAND_TYPE_MAP `Record<ReportDesignerCommand['type'], true>` 编译期穷尽映射，:41-45 注释自证「closure audit Minor 修正：从手维护数组升级为类型面穷尽映射派生」）
- **信号类别**: I 邻 + W3（同一包内同一问题域[命令词汇表]两套技术档位——readonly 门落后于域 adapter 面）
- **症状/根因**: 新增 mutation 命令未同步 Set → readonly 门静默放行该命令（isReadonly 检查 `MUTATION_COMMAND_TYPES.has(command.type)`，Set<string> 对新命令返回 false 即放行）——编译器沉默。同包 COMMAND_TYPE_MAP 已证明该技术可行且经历过 closure audit 修正。
- **考古**: `13f1eeae3`（2026-07-20 report readOnly support）出生；COMMAND_TYPE_MAP 升级 `fbd3cb6c2`（2026-10-04 P1.3）——**门未随技术升级**。
- **严重度**: P3（判据：W3 潜伏缺口——现 12 命令逐字核对 Set 与联合一致[零现行漂移]，缺口在新命令增加时兑现）
- **修复方向**: `Set<ReportDesignerCommand['type']>` 类型化（最小修，新增未登记命令即编译错）或从带 mutation 标记的 Record 派生（与 COMMAND_TYPE_MAP 合并单源——Phase 2 择一）
- **去向**: 批内修候选（低成本当场修档）
- **验证方式**: report filter 四门禁全绿；临时向 commands.ts 加测试联合成员断言编译失败（开发期验证后移除）
- **现状**: live
- **跨批关联**: spreadsheet READ_ONLY_COMMANDS（command-handlers/index.ts:28-38）同型无类型化白名单——跨包 W3 注记随 watch 微注记 #4；两包 readonly 门极性相反（黑名单 vs 白名单）属各自设计内

### WA-spreadsheet-core-001 [H] applyMergeCellsCenter 同名同体双份：抽取同日双写、副本零消费

- **位置**: `packages/spreadsheet-core/src/core/cell-operations.ts:220-227`（活体——cell-handlers.ts:37/:86 消费）↔ `packages/spreadsheet-core/src/core/sheet-operations.ts:200-207`（**零消费死副本**——knip 登记 `sheet-operations.ts#applyMergeCellsCenter`）
- **信号类别**: H（同包同名同体函数双份——字面 `applyMergeRange + applyCellStyleChange(center, middle)` 组合逐字两份）
- **症状/根因**: 死副本在 sheet-operations 公共模块上伪装为可用 API（未来消费者可能 import 到任一[均从包内相对路径可达]）；任一份改动另一份静默漂移。根因 = `d2b7bef55`（2026-04-03 core.ts 抽取为 core/ 模块）同一 commit 把该函数写进两个目标文件。
- **考古**: `d2b7bef55`（2026-04-03）双份同 commit 出生；此后零收敛波触及（knip 在案登记为未消费导出）。
- **严重度**: P3（判据：死副本 ~8 行、删除即消、knip 出口在案）
- **修复方向**: 删 sheet-operations.ts:200-207；knip 基线遇符号删除以修代重立基线（plan 571 先例）
- **去向**: 批内修候选
- **验证方式**: spreadsheet filter 四门禁全绿；`grep -rn "applyMergeCellsCenter" src` 仅存 cell-operations 定义 + cell-handlers 消费
- **现状**: live
- **跨批关联**: knip 登记债定性输入；与 document-access.ts#getCell（同批 knip 死导出，~5 行）随案并删

### WA-spreadsheet-core-002 [B 邻] no-op 命令无条件入 undo 栈 + 翻 dirty：applySimpleDocumentMutation 无守卫 × handler 无条件 `changed: true`

- **位置**: `packages/spreadsheet-core/src/core/internal-state.ts:92-101`（applySimpleDocumentMutation 无条件 `pushUndo` + `dirty: true`）× `packages/spreadsheet-core/src/command-handlers/*.ts`（cell/clipboard/sheet/structure/search 五文件 ~30 个 handler 无条件 `return { ok: true, changed: true }`）↔ 同包反例：selection-handlers.ts:52（selectionsEqual no-op 短路）、:69（setViewport 等值短路）、cell-operations.ts:399/:418（applyEditComment/applyDeleteComment 缺目标返回原 doc——但 handler 仍报 changed:true）
- **信号类别**: B 邻（W4 镜像——「无变化」不可观测）+ 包内 no-op 语义不一致 + 跨包漂移（report 侧 updateMetadata 计算 changed 后跳过入栈——report core.ts:469-474 有守卫）
- **症状/根因**: 同值覆写（setCellValue 相同值/同字体重设/空格清除等）→ 新文档引用 → ①undo 栈推入一条「undo 后无可见变化」的幻影步（用户按 undo 消耗步数无效果）②dirty 翻 true（与 saved 无差异却标脏）③dispatch 层触发一次 recalc。观测面：无任何信号区分真变更与 no-op。同包 selection/viewport 有守卫、document mutator 无守卫——不一致即漂移证据。
- **考古**: applySimpleDocumentMutation 出生 `d2b7bef55`（2026-04-03 抽取）；P1.2 迁移（`1928b710e` 2026-10-04 plan 547）以「与旧数组实现逐字节一致」保留语义——**历史语义按设计保留，非回归**；但 report 侧 P1.3 同期实现了 changed 守卫——双包分化。
- **严重度**: P3（判据：UX 质量缺口——undo 步消耗 + dirty 假阳，无数据损坏；fix 有跨 30 handler 面成本）
- **修复方向**: 最小修 = applySimpleDocumentMutation 增 `nextDoc === state.document` 短路（apply* 全部产生新引用故此路不通）→ 实际修 = handler 层比较 `nextDoc !== state.document` 后置 changed/dirty（或 apply* 族补 no-op 返原引用语义——Phase 2 拍板档位）；判别测试：同值 setCellValue → undoDepth 不变 + dirty 不翻转（先红后绿）
- **去向**: 排期进 plan（跨 30 handler 面超低成本档；report 侧守卫先例在案）
- **验证方式**: spreadsheet filter 四门禁全绿；undo/dirty 判别测试先红后绿；既有 314 用例零回归
- **现状**: live
- **跨批关联**: report core.ts:469-474（changed 守卫正面先例）；plan 547 P1.2「逐字节一致」迁移裁定（修时须显式推翻该语义并记录——非本批擅动）

### WA-spreadsheet-core-003 [A 邻] applyProtectSheet `void password;`：保护密码静默忽略的占位转正

- **位置**: `packages/spreadsheet-core/src/core/sheet-operations.ts:174`（`void password;`——ProtectSheetCommand.password 声明在 commands-base.ts:130、handler 透传、operation 丢弃）
- **信号类别**: A 邻（占位实现转正——「带密码保护」的假语义）
- **症状/根因**: `spreadsheet:protectSheet` 带密码调用 → protected:true 落文档、password 零效果零存储零告警——宿主/用户面得到「已密码保护」假象。`void` 使弃用诚实于代码但无出口登记（W2 弱）。
- **考古**: handler registry 波落位（`053bbef4c` 2026-04-16 dispatch 抽取前后）；零后续波触及。
- **严重度**: P3（判据：误导性占位无数据风险；canvas-editor 级真保护涉能力面）
- **修复方向**: 二选一：①命令契约收缩（ProtectSheetCommand 删 password 字段——**公共导出类型变更留人工**）；②最小修 = `void password;` 处补注释声明占位 + watch（「password unsupported until host-side protection model exists」）。推荐②随登记
- **去向**: watch-only（公共面决策留人工；本行即登记，不允许静默）
- **验证方式**: 若走①：spreadsheet filter 四门禁 + renderers 消费面 grep；现态：protectSheet 行为用例保持
- **现状**: live
- **跨批关联**: wa-13b wordr-005/006（假预览/假计数占位族）跨包第 3 例——「占位假语义」家族三包各一

### WA-word-editor-core-001 [H 微] id 生成器四胞胎：同包四份「前缀+时间戳+熵」手写、dataset-store 份已漂移（substr 弃用 API + 缩进残迹）

- **位置**: `packages/word-editor-core/src/dataset-model.ts:18-22`（`ds_${Date.now()}_${++_idCounter}` + 模块级计数器）↔ `chart-model.ts:14-18`（`chart_...` 同式）↔ `code-model.ts:11-15`（`code_...` 同式）↔ `dataset-store.ts:72-73`（`col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`——**已漂移**：熵源换成 Math.random + `substr` 弃用 API + :72 注释缩进脱离层级）
- **信号类别**: H 微（同一惯用形四份手写 + 单份已漂移）
- **症状/根因**: 「业务 id 形状」无单源；dataset-store 份与三个模型份机制分叉（counter vs Math.random），且使用了 `String.prototype.substr`（deprecated）——lint 未拦（无对应规则启用）。dataset-store:72 注释「Deliberately not flux-core genId: `col_` underscore-prefixed column-name shape」自证形状刻意性——形状需保留但机制可单源。
- **考古**: 模型三份 `8e82c74f4`（2026-04-04 chart and code models）同波出生；dataset-store 份随 dataset store 波——后续无人统一。
- **严重度**: P3（判据：4 份微惯用形 + 单份漂移为弃用 API 与机制分叉，无行为缺陷）
- **修复方向**: 包内共享 `createPrefixedId(prefix: string): string`（Date.now+counter 机制单源，col\_ 前缀形状经参数保留）；四处改调用；`substr` 随收敛消除
- **去向**: 批内修候选
- **验证方式**: word filter 四门禁全绿；`grep -c "substr(" src` = 0；`grep -cE "_[Cc]idCounter|_idCounter" src` 收敛到共享件本体
- **现状**: live
- **跨批关联**: wa-10 #24 / ai utils messageSeq（id 计数器正面家族）——本立案是该家族的「未收口多份」变体

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID                     | 位置                                      | 出生时间（git 考古）                                     | 风险                                                | 处置       |
| --------------------------- | ----------------------------------------- | -------------------------------------------------------- | --------------------------------------------------- | ---------- |
| WA-flow-designer-core-001   | tree-session ctx 值捕获（core.ts:679 等） | 0e5c670c3（2026-08-06 tree session 抽取）                | 事务×树命令组合双入栈/双发射；ctx 三死字段+弃参随案 | 批内修     |
| WA-report-designer-core-001 | metadata.ts:336 内联列地址                | dccce0022（2026-04-26）；canonical 早生 32 天未被引用    | 宽 range 元数据孤儿化                               | 批内修     |
| WA-report-designer-core-002 | types.ts:361-367 range 读侧 [0]           | eb99fc99f（2026-03-25 包首）；surface audit 未触         | 多 range 读错档 + drop 交叉污染                     | 批内修     |
| WA-flow-designer-core-002   | 树克隆三机制                              | 0e5c670c3（2026-08-06）→ cq-2 收口断言失真（2026-10-01） | 出口注释已失真；三处同步税                          | 批内修     |
| WA-report-designer-core-003 | MUTATION_COMMAND_TYPES 裸 Set             | 13f1eeae3（2026-07-20）；10-04 技术升级未随              | 新命令 readonly 绕过（编译器沉默）                  | 批内修     |
| WA-spreadsheet-core-003     | protectSheet `void password`              | 053bbef4c 波（2026-04 前后）                             | 占位假语义无出口                                    | watch-only |

**「按住未修问题且无出口」的经典转正件为零**——头部风险是三处行为缺陷（均为抽取/迁移时的边界不完整，非特判兜底按住）与一处收口断言失真；literalEn/literalZh 双双全零 + 症状性 message 0（40/40 抽检）+ async 15 行全豁免佐证。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数      | 各份位置                                                                                                       | 冗余行数 | 漂移证据                                                 | 裁定（三问句）                                           |
| --- | --------- | -------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------- | -------------------------------------------------------- |
| 1   | 3 机制    | 树克隆族：core/clone.ts ↔ tree-structure.ts ×3 函数 ↔ tree-session-impl.ts（WA-flow-designer-core-002）        | ~65      | cq-2 出口注释断言失真（声称已收口实漏一份）              | 同根因✅ 提取干净✅（单包）→ 批内修                      |
| 2   | 2（跨包） | report editor-core-adapter deepEqual ↔ spreadsheet editor-core-adapter deepEqual（逐字 15 行）                 | ~15      | 零漂移（同日孪生 commit 1928b710e/fbd3cb6c2 互证复制链） | 同根因✅ 稳定双份 → **CX-18 并案**（home=editor-core）   |
| 3   | 2（跨包） | report core-dispatch undo/redo ↔ spreadsheet history-handlers undo/redo（操作时点骨架 ~30 行 ×2）              | ~60      | 零漂移（P1.2/P1.3 注释各自完备、语义确有包内差异项）     | 同根因✅ 稳定双份 → **CX-18 并案**                       |
| 4   | 2（跨包） | 快照切片族 report page-renderer-snapshots ↔ spreadsheet-renderers page-renderer（WA-reportr-008 承接）         | ~40      | 零漂移（逐字，wa-13b 已证）                              | 同根因✅ home=spreadsheet-core → **CX-18**（见转发评估） |
| 5   | 2         | applyMergeCellsCenter 同名同体（WA-spreadsheet-core-001）                                                      | ~8       | 一份零消费（死副本）                                     | 同根因✅ → 批内修（删副本）                              |
| 6   | 2         | flow core-node-commands clamp 内联 ×2 ↔ node-operations clampCoordinate（WA-flow-designer-core-004）           | ~6       | 零漂移（常量同值）                                       | 同根因✅ → 批内修                                        |
| 7   | 4         | word id 生成器四胞胎（WA-word-editor-core-001）                                                                | ~16      | dataset-store 份机制分叉 + substr 弃用 API               | 同根因✅ → 批内修                                        |
| 8   | 2+2       | 树常量+TreeChangeReason 双声明（WA-flow-designer-core-003）+ SessionNodeId 双声明（WA-page-designer-core-001） | ~6       | 零漂移（barrel 遮蔽兜底）                                | 同根因✅ → 批内修 ×2                                     |

（归一探针 551 组中其余大簇均为平行结构族[node↔edge-operations 70 窗]、registry handler 惯用形[62 窗]、声明式契约镜像[59+52 窗]、barrel 镜像[32 窗]——裁定见误报排除 #7-#10。）

### 3. Top 重构建议（默认 3 项）

1. **report 元数据读写双缺陷同车修（WA-report-designer-core-001 + 002）**：根因修复点 = metadata.ts 改 import cellAddress + getTargetMeta range 分支复用 rangeMetaId 单源；预期删除本体 = 内联列地址公式 + `rangeEntries[0]` 错档读；回归 = 双判别测试先红后绿（AA2 地址命中 + range B 隔离断言）+ report 既有 196 用例零回归；影响面 = 2 文件包内私有修复，零公共导出变更。
2. **flow tree-session ctx 边界补全（WA-flow-designer-core-001 单车，随车 003/004/005 清扫）**：根因修复点 = core.ts 树 ctx 改 live 通道（getTransactionStack）+ 死字段/弃参删除；预期删除本体 = 恒真守卫 + ctx.historyState/savedTreeDocument/savedRevision 死面 + `void commandType`；回归 = core.test.ts:232 rollback 用例 + 新增事务内 undoDepth 判别测试（先红后绿）+ flow 197 用例零回归；影响面 = core.ts + tree-session-impl.ts 两文件包内接口，零公共导出变更（plan 544 种子行为保持）。
3. **克隆/声明单源收敛（WA-flow-designer-core-002 + 003 + WA-page-designer-core-001 同车）**：根因修复点 = 树克隆统一单源落点（core/clone.ts 或 cloneDeep）+ 双声明族收口；预期删除本体 = tree-structure 手写克隆族 + types.ts 双声明四份 + round-trip SessionNodeId 死声明 + core/clone.ts 失真注释；回归 = clone-equivalence.test.ts + 四门禁；影响面 = 4 文件包内私有重构；knip 符号路径变化沿 plan 571 先例以修代重立基线。

### 4. 误报排除清单（20 项）

| #   | 疑似点                                                                                                   | 位置                                                                              | 排除理由                                                                                                                                                                                                                                                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | typeBypass 4 处分档                                                                                      | flow tree-validation.ts:284/:289 + page commands.ts:181/keyboard-navigation.ts:38 | tree-validation ×2 = host payload 契约校验保护区**动态边界**（isPlainJsonObject 守卫语义内的一次性收窄；watch 微注记 #2 建议签名改 `tree: unknown`——保护区 plan-first 不批内改）；page ×2 = BaseSchema 无 index signature 的 schema 节点 Record 化读取动态边界（D 类判例；与包内 getSessionId 同一防御家族）                                                    |
| 2   | async 15 行                                                                                              | 见 async 定性表                                                                   | 15 处全豁免（in-band 协议/lifecycleHookError 事件路由/可注入错误通道/console.warn/契约降级注释）；0 独立立案；1 watch 微注记                                                                                                                                                                                                                                    |
| 3   | perf 3 位点                                                                                              | clone.ts:59（双报）+ tree-validation.ts:79                                        | 引用等价快路径前置的 stringify fallback（R2-P14 plan 锚）与 canonical 序列化本体——非「stringify 做重对象变更检测」红形态                                                                                                                                                                                                                                        |
| 4   | `Math.random                                                                                             | Date.now` 17 处                                                                   | editor/report/spreadsheet 时间戳字段 ×11 + flow tree-structure.ts:66 + page session.ts:39 + word id 族 ×4                                                                                                                                                                                                                                                       | 时间戳字段 = 纯元数据；tree-structure createTreeNodeId = 注释自证刻意非 genId（会话种子形状）+ 树内唯一性由 validation 兜底；page session seed = wa-10 #24 正面家族（seed+counter 混合）；word ×4 = WA-word-editor-core-001 立案位点本体不在此重复 |
| 5   | elk-layout.ts:4 模块顶层 `new ELK()`                                                                     | elk-layout.ts:4 + index.ts:7 公共导出                                             | 模块求值面单列定性：ELK 实例无全局状态写入（非 WA-content-009 家族）；风险面为 bundle 静态可达 + 顶层构造——**watch 微注记 #5**（懒加载拆分涉公共导出组织，留人工）                                                                                                                                                                                              |
| 6   | editor domain-registry ↔ flow tree-domain 注册表孪生（归一 8 窗）                                        | editor-core/domain-registry.ts ↔ flow-designer-core/tree-domain.ts                | 2 份稳定双份且**双向注释在案**（domain-registry.ts:3-9 明示覆盖语义差异及裁定出处 editor-core.md §3；tree-domain 以 throw 为反差）——文档化刻意分化，提取反制造早熟抽象（§3 问句 1 否——覆盖 vs 拒绝是两种注册契约）                                                                                                                                              |
| 7   | node-operations ↔ edge-operations 平行族（归一 70 窗最大簇）                                             | flow core/node-operations.ts ↔ core/edge-operations.ts                            | 边/节点各自的 add/update/replace/remove 平行结构族——每操作语义各随其域（边连接性/节点 id 定位），提取参数化反失真；概念级重复（归 code-refactor-discovery 维度不立案）                                                                                                                                                                                          |
| 8   | cell-handlers ↔ sheet-handlers handler 惯用形（归一 62 窗）                                              | spreadsheet command-handlers 两文件                                               | registry 框架接线形态（getState→apply→setState→return 四行惯用形）；其中的 no-op 缺口已单独立案（WA-spreadsheet-core-002——修守卫语义而非提取惯用形）                                                                                                                                                                                                            |
| 9   | 命令接口声明镜像（commands-base↔style 59 窗 + report↔spreadsheet 命令接口 52 窗 + commands.ts 三方清单） | spreadsheet/report 命令声明件                                                     | 声明式契约镜像（各包自有命令词汇的 interface 声明 + barrel re-export 清单）——wa-11 #6/#7 契约镜像判例族                                                                                                                                                                                                                                                         |
| 10  | 四包 index.ts barrel 镜像（归一 32/31 窗）                                                               | page/report/spreadsheet index.ts + word canvas-editor-types.ts                    | barrel 导出清单镜像——框架接线形态                                                                                                                                                                                                                                                                                                                               |
| 11  | TreeSessionSurface 接口逐字双声明（designer-core-types:95-109 ↔ tree-session-impl:75-90）                | flow designer-core-types.ts ↔ tree-session-impl.ts                                | 编译期接线点兜底（createTreeSessionSurface 返回值 spread 进 DesignerCore 对象字面量，漂移以编译错误形式拦截）——WA-sheetr-004 判例族（编译器在接线点兜底 = 类型保护存在）；其伴生 TreeSessionContext↔Input 镜像中 4 个值拷贝字段 = WA-flow-designer-core-001 位点本体，不在此重复立案                                                                            |
| 12  | graph-command-gate isTreeMode 守卫臂 ×11                                                                 | flow core/graph-command-gate.ts:77-207                                            | 表状守卫臂（每臂 `rejectTreeMutation(methodName)` 方法名各异、树模式拒绝契约本体）——wa-11 #10 switch 守卫臂判例族                                                                                                                                                                                                                                               |
| 13  | core.ts buildNodeCtx ↔ buildEdgeCtx getter 块孪生（逐字 ~22 行）                                         | flow core.ts:248-293                                                              | 两命令边界各自 ctx 组装（NodeCommandContext 多 addNodeFn 一键），live getter 语义正确——提取收益低于间接层成本（wa-11 #10 判例族）；与 WA-flow-designer-core-001 的树 ctx 缺 getter 形成对照（恰证明 node/edge 侧形态是正型）                                                                                                                                    |
| 14  | report/spreadsheet core.ts zustand shell 惯用形（归一 14 窗）                                            | report core.ts:133/446-453 ↔ spreadsheet core.ts:67/75-82                         | createStore + cachedState/cachedSnapshot 快照 memo 框架惯用形（各自文档模型 buildSnapshot 不同）——概念级                                                                                                                                                                                                                                                        |
| 15  | codec-commands ↔ preview-commands（归一 16 窗）                                                          | report runtime 两文件                                                             | adapter 调用包装平行（resolve + run 两段式，各 ~25 行）——2 份小而稳定（§3 两份稳定 → 可观察）                                                                                                                                                                                                                                                                   |
| 16  | sheet-operations 轴向四胞胎（ResizeRow/HideRow/ResizeColumn/HideColumn）                                 | spreadsheet core/sheet-operations.ts:10-60                                        | rows/columns 轴向平行 10 行族（键/维度名各异）——参数化收益边际，概念级                                                                                                                                                                                                                                                                                          |
| 17  | designer-store-adapter getState/getSnapshot 双方法                                                       | flow adapters/designer-store-adapter.ts:13-19                                     | useSyncExternalStore 的 getState/getSnapshot 双协议面（React 18 两种消费形态）——刻意双出                                                                                                                                                                                                                                                                        |
| 18  | BUILTIN_TEMPLATE_TAGS 声明表 / document-io normalize 族                                                  | word template-tags.ts:11-138 / document-io.ts:102-212                             | 声明式注册表与动态边界声明式 guard（normalize+validate+create 三段式，逐字段守卫）——wa-13a 契约形状平行判例族                                                                                                                                                                                                                                                   |
| 19  | knip 六包 135 条登记死代码面                                                                             | scripts/baselines/knip-baseline.json（exports 105 + types 29 + dependencies 1）   | 逐条定性（本节下方「knip 登记债定性」）：editor-core 0；spreadsheet 66 条 handle\* 为 registry 模式 in-file 消费的导出关键字冗余（**系统性收私候选**，非行为死代码）；flow/report/word/page 共 ~15 条为 in-file 消费收私候选与测试基建豁免；行为死代码仅 2 条（applyMergeCellsCenter 死副本[立案 WA-spreadsheet-core-001] + document-access#getCell[随案并删]） |
| 20  | CX 交界四项核对                                                                                          | CX-10 event 键契约 / CX-13 Tree 族 / CX-16 菜单壳 / CX-17 drag ghost              | 本批纯 core 层：CX-10 消费面在 renderers（flow core 仅 emit 结构体无键名契约）；CX-13 Tree 族渲染层裁定不涉 core（tree-projection 投影装饰为 plan 544 考古锚不翻案）；CX-16/CX-17 均为 renderers 层发现——core 侧无对应位点，四项记**不适用**                                                                                                                    |

**knip 登记债定性（plan Baseline ③条款，135 条逐档落字）**：

- **editor-core 0 条**——全批唯一零登记包。
- **page-designer-core 1 条**（types）：round-trip#SessionNodeId → WA-page-designer-core-001 立案位点本体。
- **flow-designer-core 41 条**（exports 29 + types 12）：tree-validation/tree-projection 重导出面 ~16 条 = 双声明/双路径导出症状（WA-flow-designer-core-003 收口后大部分随消）；tree-structure 6 条 = 文件内自用+测试消费的导出关键字冗余（收私候选，随 WA-flow-designer-core-002 克隆收敛部分随消）；core/clone cloneEdge、constraints 3 条、shell-state 2 条、viewport clampZoom、config-migration 2 条 = in-file 消费收私候选（零行为面）；types 12 条中 TreeSessionContext 族 4 条 = WA-flow-designer-core-001 死契约面旁证、其余 8 条接口/历史类型收私候选。
- **report-designer-core 13 条**（exports 7 + types 6）：metadata 3 条 + field-sources/registry 2 条 = in-file 消费收私候选；`__tests__/test-utils` 2+1 条 = 测试基建（cq-5 摆放合规——位置已在 `__tests__/` 内，与 wa-11 ai-test-support 误置不同型）豁免；commands 4 类型单名 = 联合成员别名（契约面完整性保留——删除反破坏 import 习惯）豁免注记；ReportDesignerInternalState = core.ts re-export 面（core.ts:29 `export type`）收私候选。
- **spreadsheet-core 73 条**（exports 68 + types 5）：**66 条 handle\* 函数为 registry 模式的系统性导出关键字冗余**（每 handler 同文件被 registerXHandlers 消费，export 关键字仅为测试可达性保留）——占六包 exports 基线 63%，定性为**机械收私候选批**（de-export 零行为面、但跨 7 文件 ~66 符号建议独立小批或随下次该目录触碰顺带）；applyMergeCellsCenter = WA-spreadsheet-core-001 本体；getCell = 死导出随案并删；types 5 条 = re-export/内部类型收私候选。
- **word-editor-core 6 条**（exports 1 + types 5）：document-io-test-utils = 测试基建豁免；RecoveryLoad 三类型 + SaveDocumentFailureReason = 可注入错误通道的形状声明（宿主 handler 签名引用面——保留理由成立，弱消费注记）；WordEditorRangeStyle = bridge re-export 收私候选。
- **dependencies 1 条**：`apps/playground/package.json#@nop-chaos/page-designer-core` = playground 侧依赖声明消费面问题——**转发 WA-15a**（playground 批）注记。

### 5. 范围整体判断

**不是系统性临时方案文化——本批是「六包纯逻辑内核 + 全轨道最小候选量」的批次，问题形态是「抽取/迁移波的结构边界不完整 + canonical 已在依赖包时的手写复发 + demo 通道措辞沉积」，而非「按住问题的特判/兜底」。** 正面证据七件：①literalEn/literalZh 含测试面**双双全零**（连续第五个双零批组的最干净读数——连说明性命中都没有）；②六探针（setTimeout/domRaid/keyRemount/pixelNudge/testEnvBranch/silentCatch）全零，typeBypass 4 处全为契约保护区动态边界——零断言销毁真实报警；③async 15 行逐条定性全豁免——六包命令边界全部走 in-band 协议（`{ok:false,error}`）或结构化事件路由（lifecycleHookError）或可注入错误通道（word setRecoveryLoadErrorHandler），失败观测纪律是六包的公共底色；④症状性 commit message 0（40/40 抽检全带 plan 锚与根因链，唯一 wip 为诚实在途标记）；⑤≥500 行 6 件全部是「设计注释锚密度高 + 模块职责单一」形态（report core.ts 的 AbortController 三通道 + structuredClone 契约封印注释、flow tree-projection 的 plan 475/544 几何常量单源注释是内核层的正面样板），非「过大失控」；⑥editor-core 5 文件零立案 + knip 零登记——领域无关内核层的单源纪律（UndoCommandStack 被 report/spreadsheet P1.2/P1.3 双迁移消费）恰是六包解耦方向正确的实证；⑦P1 三条全部有显式可达性缓解因子（宽 range/多 range 组合、宿主事务组合）且互不叠加。问题集中三处：**「抽取波边界不完整」**（flow tree-session ctx 值捕获 + 树克隆漏收口 + applyMergeCellsCenter 双份——三次模块抽取各漏一处收尾，与 wa-13b「收口波范围缺口」家族同型但发生在抽取侧而非清扫侧）、**「canonical 在依赖包时的手写复发」**（report 列地址公式——wa-13b renderers 侧已修同病，core 侧为同包第 2 例，说明「先查依赖包导出」在 report 域仍是未内化习惯）、**「读侧守卫落后于写侧」**（report getTargetMeta range 分支、spreadsheet no-op 守卫缺失、report MUTATION_COMMAND_TYPES 类型化缺位——三处均为写侧契约已严密而读侧/门侧未跟上）。整体判断：零星个案级，无需 roadmap 层面对策；13 条立案预期批内修 11 条（P1×3 先红后绿 + P2×1 + P3×7）、watch 2 条（spreadsheet-core-003 公共面留人工 + 转发评估 2 项入 CX-18/watch）；CX-18 候选一项（report↔spreadsheet 跨包孪生三件并案：快照切片族导出 + deepEqual + undo/redo 骨架，home=editor-core/spreadsheet-core）；六包 index.ts 公共导出面在全部批内修路径下零变更（report-001 消费既有导出、flow-001/002/003 等全部包内私有）。

## 承接转发评估（plan 572 必查三项，评估落字、不批内实施）

1. **WA-reportr-008（report↔spreadsheet 快照切片族 spreadsheet-core 侧导出评估）**：**「应导出」结论成立**。评估依据：①SpreadsheetRuntimeSnapshot 类型已居 spreadsheet-core（types.ts:249-259），slice/selector/equal 三符号是其投影家族，natural home 成立；②report-designer-core 已依赖 spreadsheet-core（package.json workspace:\* + types.ts import 在案），core 侧导出后 report-renderers 改 import 零新增依赖边；③spreadsheet-renderers 侧三符号（page-renderer.tsx:35-75）可改为消费 core 单源。**但涉两个公共导出面新增**（spreadsheet-core index + spreadsheet-renderers 消费改写）——按 plan 572 六包 index.ts 零变更条款，**登记 CX-18（建议编号，roadmap 现最大 CX-17，插入归主会话拍板）**，批内零实施；两份现状维持（与 wa-13b 转发时状态一致）。
2. **word-editor-core 两项只读参考（wa-13b 转发）**：两项根因均在本包**确证**——①**titleId 契约完整性**（WA-wordr-007 兜底根因）：core 载入/回读链（document-io.ts:91-100 normalizeWordElements 只滤对象形态、:166-180 normalizeWordDocument 重组五区）对 title 级元素**无 id/titleId 保证**，bridge.getValue（canvas-editor-bridge.ts:117-119）透传 canvas-editor 内部元素形态——renderers 侧 outline 的 `titleId || id || Math.random` 兜底正是此契约缺口的下游症状；修复方向 = normalizeWordElements 或目录投影处保证 title 级元素稳定 id（公共契约扩展，留人工；wordr-007 修复批执行时应携本注记做 core 侧配套）。②**无头预览/搜索计数能力缺口**（WA-wordr-005/006 占位根因）：CanvasEditorBridge 构造需 DOM 容器（mount(container,...) → `new Editor(container, data, ...)`，canvas-editor-bridge.ts:53-73），无无头实例化面（真预览需离屏 mount 或库级 headless 支持）；bridge 未包装任何搜索计数 API（wordr-006 假计数的 core 侧缺口本体；canvas-editor 的搜索匹配 API 未上桥）。两项均登记 watch + 后续 word 域批必读线索，非本批立案。
3. **WA-13a pager-004 评估注记（page 侧 getSchemaType helper 归属 core 更优否）**：评估结论 = **「core 归属更优但非必要」——watch-only 留人工**。依据：getSchemaType（page-designer-renderers/src/schema-type.ts，WA-pager-004 plan 573 产物，4 行纯函数带注释）现消费方 7 文件 11 位点**全部在 renderers 包**；page-designer-core 是「读 opaque schema 节点字段」typed reader 的自然 home（与 getSessionId 同族），但搬迁 = page-designer-core index.ts 公共导出新增（违零变更条款）且当前零漂移、收益为词汇单源的长期一致性；触发条件 = core 侧出现同类读取需求或 renderers 消费面再扩散时随批搬迁（届时 core 侧 keyboard-navigation.ts:38-39 的 `record.type as string` 读取可同车收敛）。

## CX-n 裁定

**建议新增 CX-18（编号以 roadmap 插入时为准）——report↔spreadsheet 跨包 editor-domain 孪生并案**，三个构件同车：①快照切片族三符号 spreadsheet-core 导出（WA-reportr-008 承接，见转发评估 1）；②editor-core-adapter deepEqual 逐字孪生（15 行，home=editor-core 共享判等工具或 flux-core）；③undo/redo 操作时点骨架孪生（~30 行 ×2，home=editor-core 域工具层）。三构件同根因（P1.2/P1.3 同日双波互抄）、两份各自稳定（§3 双份稳定档）、跨包提取涉公共层归属决策——沿 CX-16/CX-17 先例留人工确认。本批不再另立其他 CX-n：双声明家族（3 例）均为批内可修的包内私有收口；readonly 门跨包注记随 watch 微注记 #4；spreadsheet handle\* 66 条收私批为机械清理（建议随 knip 基线下次触碰顺带，不满足「跨包/公共层机制」共性门槛）。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **editor cloneDocument 降级静默**（editor-core.ts:32-39）：structuredClone 失败回退浅拷贝无日志——契约注释在案、领域文档 JSON 形态契约封闭，但触发不可诊断；建议接 console.debug（对齐 editor-core.ts:108 warnEmptyStack 先例形态）。
2. **tree-validation 签名收窄候选**（tree-validation.ts:284/:289）：`validateTreeDocument(tree: TreeDocument)` 签名已称 TreeDocument 而体内双断言按 unknown 形态校验——改 `tree: unknown` 可删双断言（保护区 contract 校验，plan-first 留 record）。
3. **spreadsheet 非法 regex 静默 + 每 cell 重编译**（search-operations.ts:12-22/:51）：invalid regex → 「无匹配」无错误信号（W4 弱）；createSearchRegex 在 findInDocument per-cell 循环内重编译——下次触碰 search 面时顺手提出循环外。
4. **readonly 门跨包 W3 注记**（report MUTATION_COMMAND_TYPES ↔ spreadsheet READ_ONLY_COMMANDS）：两包 readonly 门均为无类型化 Set（极性相反属设计内）——CX-18 并案时顺带评估类型化统一。
5. **elk-layout 顶层构造**（elk-layout.ts:4）：bundle 面重库静态可达（index.ts:7 导出）——若 bundle 预算触发再评估懒加载拆分（涉公共导出组织，留人工）。
6. **knip dependencies 条目转发 WA-15a**：`apps/playground/package.json#@nop-chaos/page-designer-core` 依赖消费面问题归 playground 批核验。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID                     | 严重度 | 建议去向    | 修复要点                                                                    | 约束/验收判据                                                                       |
| --------------------------- | ------ | ----------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| WA-flow-designer-core-001   | P1     | 批内修      | 树 ctx 改 live 通道（getTransactionStack）+ 死字段/弃参删除                 | rollback 用例保持 + 事务内 undoDepth 判别测试先红后绿；plan 544 种子行为保持        |
| WA-report-designer-core-001 | P1     | 批内修      | `import { cellAddress }` 替换内联公式                                       | AA2 判别测试先红后绿；`String.fromCharCode(65` grep = 0；零 index 变更              |
| WA-report-designer-core-002 | P1     | 批内修      | rangeMetaId 单源 + getTargetMeta range 分支按 id 匹配                       | 双判别测试先红后绿（range B 隔离 + getTargetMeta 精确）；`rangeEntries[0]` grep = 0 |
| WA-flow-designer-core-002   | P2     | 批内修      | 树克隆单源（core/clone.ts 或 cloneDeep）+ 失真注释改写                      | clone-equivalence 套件直通；cloneTreeValue grep = 0                                 |
| WA-flow-designer-core-003   | P3     | 批内修      | types.ts 双声明收口（四符号单源）                                           | `TREE_INTERNAL_ID_PREFIX = ` grep = 1；knip 以修代重立基线                          |
| WA-flow-designer-core-004   | P3     | 批内修      | 两处内联 clamp 改 import clampPosition                                      | `Math.max(-10000` grep = 0                                                          |
| WA-flow-designer-core-005   | P3     | 批内修      | 两错误串去「playground example」措辞                                        | reason 映射测试直通；`playground example` grep = 0                                  |
| WA-page-designer-core-001   | P3     | 批内修      | round-trip.ts 改 import types 份 SessionNodeId                              | 四门禁直通；knip 以修代重立基线                                                     |
| WA-report-designer-core-003 | P3     | 批内修      | MUTATION_COMMAND_TYPES 类型化（Set<...['type']）或 Record 派生              | 四门禁直通；新命令未登记即编译错（开发期验证）                                      |
| WA-spreadsheet-core-001     | P3     | 批内修      | 删 sheet-operations applyMergeCellsCenter（+ document-access getCell 随案） | 四门禁直通；grep 仅存 cell-operations 定义；knip 以修代重立基线                     |
| WA-word-editor-core-001     | P3     | 批内修      | createPrefixedId 单源（col\_ 前缀形状经参数保留）                           | 四门禁直通；`substr(` grep = 0                                                      |
| WA-spreadsheet-core-002     | P3     | 排期进 plan | handler 层 no-op 守卫（changed/dirty 判定）                                 | 同值覆写 undoDepth 判别测试先红后绿；须显式记录对 plan 547「逐字节一致」语义的推翻  |
| WA-spreadsheet-core-003     | P3     | watch-only  | `void password` 处补占位注释（公共契约收缩留人工）                          | 本行即登记                                                                          |

**批内修合计 11 项**（P1×3 + P2×1 + P3×7），排期 1 项，watch 1 项，CX-18 候选 1 项；六包 `index.ts` 公共导出面在全部批内修路径下**零变更**（report-001 消费既有导出、其余全部包内私有；Phase 2 以六包 index.ts `git diff --exit-code` 为验收判据之一）。

## 批内修复记录（Auto-Remediation）

> 本报告为 review-only 取证产出；本节由 Phase 2 执行会话按 roadmap 自动修复契约 §2–§4 回填（每项验证临时方案本体已删除）。

| 发现 ID                     | 严重度 | 修复方式（fix/CX-n/watch-only/…）                                                                                                                                                                                                                                          | 回归测试（先红后绿证据）                                                                                                                                                                 | 本体删除验证                                                                            | commit      |
| --------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------- |
| WA-flow-designer-core-001   | P1     | fix——core.ts 树 ctx 改 getTransactionStack live 通道 + ctx.historyState/savedTreeDocument/savedRevision 三死字段删除 + void commandType 弃参删除（拍板=删：11 调用方零传参）                                                                                               | 判别测试先红后绿：「defers tree-command history entry to transaction commit」（事务内 canUndo 不翻转+commit 后恰一条 undo 步）红态恰 1 failed→198/198；plan 544 种子 rollback 用例保持绿 | 按值 transactionStack 入参消亡（getTransactionStack 取代）；三死字段与弃参 grep=0       | 本批 commit |
| WA-report-designer-core-001 | P1     | fix——metadata.ts 改 import cellAddress（消费 spreadsheet-core 既有导出，零依赖新增）                                                                                                                                                                                       | 判别测试先红后绿：endCol=26 range drop → getCellMeta AA2 命中+非法键不存在；红态 2 文件各 1 failed（index.test bundle 入口+本文件）→200/200                                              | `String.fromCharCode(65` src grep=0（含测试断言改 cellAddress、两处说明注释去字面自引） | 本批 commit |
| WA-report-designer-core-002 | P1     | fix——rangeMetaId 单源提取（types.ts 包内导出，index.ts 显式具名不泄漏公共面）+getTargetMeta range 分支按 id find+metadata.ts 写侧改引                                                                                                                                      | 判别测试先红后绿：两 range 各自 updateMetadata→getTargetMeta 各取各的 meta；红态=2 文件各 1 failed[index.test bundle 入口双注册]→200/200                                                 | rangeEntries[0] src grep=0（含说明注释去字面自引）                                      | 本批 commit |
| WA-flow-designer-core-002   | P2     | fix——tree-structure 删手写克隆族改 import core/clone.ts canonical（10 调用点经签名窄化包装保持不变）+失真注释改写真单源声明                                                                                                                                                | clone-equivalence 套件直通；flow 198/198                                                                                                                                                 | cloneTreeValue/cloneTreeNode 定义 grep=0                                                | 本批 commit |
| WA-flow-designer-core-003   | P3     | fix——types.ts 为单源（叶子模块避免循环导入拍板）+tree-validation 改 import+re-export+core.ts 删第二份 TreeChangeReason 改 import                                                                                                                                           | flow 198/198（含 tree-projection/tree-session 全套件）                                                                                                                                   | TREE_INTERNAL_ID_PREFIX 声明 grep=1（types.ts）；knip core.ts#TreeChangeReason 随消     | 本批 commit |
| WA-flow-designer-core-004   | P3     | fix——node-operations 导出 clampPosition+两处内联改引（均在 isFinite 守卫后语义等价）                                                                                                                                                                                       | flow 198/198                                                                                                                                                                             | Math.max(-10000 grep=0                                                                  | 本批 commit |
| WA-flow-designer-core-005   | P3     | fix——两错误串去「playground example」措辞改直述规则（消费方同文件常量比较单源守卫）                                                                                                                                                                                        | flow 198/198（reconnectEdge reason 映射用例直通）                                                                                                                                        | playground example grep=0                                                               | 本批 commit |
| WA-page-designer-core-001   | P3     | fix——round-trip.ts 删本地声明改 import types 份（type-only 引用无循环风险）                                                                                                                                                                                                | page 123/123                                                                                                                                                                             | round-trip 本地 SessionNodeId 声明 grep=0；knip 条目随消                                | 本批 commit |
| WA-report-designer-core-003 | P3     | fix——Set<ReportDesignerCommand['type']> 类型化（最小修档；9 字符串全为合法联合成员 typecheck 直通）                                                                                                                                                                        | report typecheck+200/200                                                                                                                                                                 | 裸 Set<string> 形态消亡（新命令未登记即编译错）                                         | 本批 commit |
| WA-spreadsheet-core-001     | P3     | fix——删 sheet-operations 死副本+随案清三未用导入；**执行期披露**：getCell 系 document-access 文件内 setCell 消费（knip unused-export≠可删函数），首删致 24 用例红[setCellFontFamily 家族]、314 复绿验证后改收私（去 export 保留函数+注记）——报告原「随案并删」建议据此更正 | spreadsheet 314/314（含收私后全量复跑）                                                                                                                                                  | sheet-operations 死副本 grep=0；getCell 导出关键字消亡（函数私有保留）                  | 本批 commit |
| WA-word-editor-core-001     | P3     | fix——新建 src/id.ts createPrefixedId 单源（col\_ 前缀形状经参数保留+刻意性注释随迁）四处改调用                                                                                                                                                                             | word 274/274                                                                                                                                                                             | substr( src grep=0；三个模型计数器变量消亡                                              | 本批 commit |
| WA-spreadsheet-core-002     | P3     | successor-required（跨 30 handler 面+须显式推翻 plan 547「逐字节一致」语义——留独立 successor 裁决，可随 CX-18 或 spreadsheet 域批并案）                                                                                                                                    | —                                                                                                                                                                                        | —（本行即登记）                                                                         | —           |
| WA-spreadsheet-core-003     | P3     | watch-only+批内最小修②——void password 处补占位契约注释（公共契约收缩留人工）                                                                                                                                                                                               | —                                                                                                                                                                                        | —（占位本体按 watch 保留，注释即出口登记）                                              | 本批 commit |

批内修 11 项全部落地（P1×3 先红后绿+P2×1+P3×7）+watch 登记注释 1 项；六包 index.ts 公共导出面零变更（六包 filter typecheck/build/lint/test 全绿：flow 198/page 123/report 200/spreadsheet 314/word 274/editor-core 39）。

## 台账回写核对

- 本批新增 findings：13 条（WA-flow-designer-core-001…005 + WA-page-designer-core-001 + WA-report-designer-core-001…003 + WA-spreadsheet-core-001…003 + WA-word-editor-core-001）——已登记 ledger（fixed 11 + found/successor-required 1 + found/watch-only 1；editor-core 零立案，前缀零撞号）
- modules 行翻转 audited：editor-core / page-designer-core / flow-designer-core / report-designer-core / spreadsheet-core / word-editor-core（六行 ✅）
- `pnpm workaround:reconcile` 输出摘录：181 findings = pending 0 + found 86 + fixed 11 + verified 84；modules 49/audited 36/uncovered 13/orphan 0；未处置 0；violations 0
