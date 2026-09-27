# QA.4 集成审计 #3 — missing-components（gate = L3 + L4 完成）

> Auditor / Agent: 独立 fresh 子 agent（QA.4 集成审计员，2026-09-27，与 L3/L4 执行会话无关）
> 审计对象: env 通道 INV 复核（`renderer-env.md` §2/§4/§5 vs `renderer-api.ts`：print/clipboard/location/stream/openSocket 五通道）；capability check 降级路径 live 核对；QA.1-L3 4 Minor 修复复审；QA.1-L4 4 Minor 复审；replica retrofit 后旧 replica e2e 定向实跑；`pnpm check` 复跑
> 审计基线: HEAD `fe5636a09`（516-519 retrofit + 521 L5 closeout 已入库）。**工作树含另一 agent 进行中的 L5.3–L5.5 未提交改动**（flux-renderers-industrial inspector/binding/station/template 面 + docs）——按审计指令不做 stash，改用「HEAD worktree 对照 + 逐 hit 归因」消化干扰（见 §6）
> 审计依据: `docs/backlog/missing-components-and-designer-roadmap.md` §11（QA.4 行 + Pass 标准「同 QA.2」= 全绿 + 0 新增 check 红）/ §13；`docs/architecture/renderer-env.md`；契约文档 `docs/discussions/2026-09-26-host-channels-print-clipboard-download-toast-url.md`；`docs/audits/missing-components/QA.1-L3-line-exit-audit.md`（4 Minor）/ `QA.1-L4-line-exit-audit.md`（4 Minor）；`docs/audits/00-audit-execution-guide.md`（Pass = 0 Blocker 且 0 Major）
> 审计输入: Fresh Context 三件套（审计依据文档 + live 仓库 + 实跑验证输出），未读执行会话历史；格式先例 `QA.2/QA.3-integration-audit.md`

## 1. env 通道 INV 审计复核（§2/§4 vs live 接口面）

| 通道         | renderer-api.ts（live）                                                                                      | renderer-env.md 登记                                                | capability check 消费点（live）                                                                                                                   | 结论 |
| ------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `stream`     | `:199 stream?: StreamFetcher`（optional + capability check 注释）                                            | §2 :26 / §3.2（含自动处理矩阵）/ §4.3 :257 已实施 / §5 :268 host 表 | `flux-renderers-ai/ai-connector-factory.ts:43` `typeof env.stream !== 'function'` → 显式报错（host helper 语义，响亮非静默）                      | ✅   |
| `openSocket` | `:204 openSocket?: WebSocketOpener`（optional + 注释）                                                       | §2 :27 / §3.3 / §4.3 :258 / §5 :269                                 | `flux-renderers-3d/industrial-adapter.ts:54` `typeof env.openSocket !== 'function'` → `socket-unavailable` 一次性上报（优雅降级）                 | ✅   |
| `print`      | `:211 print?: () => void`（optional + 评审来源注释指向契约文档）                                             | §2 :28 / §4.3 :259「已实施（plan 512，2026-09-26 收口）」/ §5 :274  | `flux-runtime/action-adapter.ts:457` `if (!env.print)`                                                                                            | ✅   |
| `clipboard`  | `:188-191 ClipboardWriter` + `:217 clipboard?`（optional + 评审来源注释）                                    | §2 :29 / §4.3 :259 / §5 :275                                        | `action-adapter.ts:432` `if (!env.clipboard)`                                                                                                     | ✅   |
| `location`   | `:181-186 EnvLocation`（getQuery/setQuery 值域 string、undefined 删键）+ `:223 location?`（optional + 注释） | §2 :30 / §4.3 :259 / §5 :276（hash/history router + SSR 静态桩）    | `flux-renderers-data/use-url-filter-sync.ts:92` `!location` 失活 + `:86-91` 一次性 dev 警告；`use-crud-url-sync.ts:8/:51-54` 经同一 helper 单实现 | ✅   |

- **接口形状逐字一致**：§2 接口块（:23-60）五字段与 live 逐一相符；:16 状态声明锚点已刷新（「2026-09-26 位于 :193 起；QA.1-L3 Minor-4 刷新」，live `RendererEnv` 实测 :193）。
- **decorator hooks 八字段齐**：`flux-core/utils/renderer-env.ts:12-50` `RendererEnvDecoratorHooks` 含 print/clipboardWriteText/locationSetQuery 三新 hook；`:108-124` 包装语义保 capability check（字段缺席原样透传）。§8 文本（:313/:326）仍只枚举 fetcher/notify/navigate/stream/openSocket 五 hook——三新 hook 未入文（Observation-1，纯文档卫生）。
- **INV-1/INV-2 合规**：五通道全 optional + 消费方 capability check；renderers/runtime 层零浏览器直调（print/copy 经 built-in action、URL 写回经 `env.location.setQuery`）；stream/openSocket 消费面（ai/3d 两 adapter）均缺失时响亮报错或一次性上报，无静默假成功。

**本项结论：五通道 INV 面 docs↔live 零契约级 drift。**

## 2. capability check 降级路径逐条 live 核对

| 路径                              | live 实现                                                                                                                               | 降级行为                                           | 结论 |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---- |
| print 缺失                        | `action-adapter.ts:457-463`                                                                                                             | `notify('warning', printUnsupported)` + `ok:false` | ✅   |
| clipboard 缺失                    | `action-adapter.ts:432-436`                                                                                                             | warning `copyUnsupported` + `ok:false`             | ✅   |
| clipboard 写入 reject             | `action-adapter.ts:446-448`                                                                                                             | error `copyFailed` + `ok:false`（不假成功）        | ✅   |
| download 非成功 envelope / 无 url | `runtime-action-helpers.ts:370-415`（三态：:370 api blob / :388-390 `data:` 直存 / :393+ envelope `url` 字段二段消解）；`:420-424` fail | error `downloadFailed` + `ok:false`                | ✅   |
| location 失活                     | `use-url-filter-sync.ts:22-24`（module 级 session-once 标志）+ `:86-91`（`enabled && !location` → 一次性 `console.warn` + 失活）        | syncUrl 关闭 + dev 一次性警告 + `false`            | ✅   |
| location 多实例冲突               | `use-url-filter-sync.ts:93-101`                                                                                                         | 后到降级 disabled + console.warn（先到优先）       | ✅   |

- **focused 单测 live 复跑**：`pnpm --filter @nop-chaos/flux-renderers-data test` → **168 files / 1175 passed**（含警告双用例：`:124`「is inactive without env.location and warns the host once (QA.1-L3 Minor-1)」断言 warn 恰一次 + 失活返回 false；`:144`「stays silent when syncLocation is not requested」负例零 warn）。
- `pnpm --filter @nop-chaos/flux-runtime test` → **1449 passed + 1 skipped**（含 print/copy/download 降级 focused 双分支用例，与 plan 512 声称的 1449 基线一致）。
- `renderer-api.ts:220` 字段注释「静默关闭并提示一次」与实现（session-once warn）一致；契约 §5「静默关闭 + dev 一次性警告」措辞复归准确。

**本项结论：print/copy/download/location 四降级路径 + stream/openSocket 先例语义全部按契约落地，零静默假成功，单测 live 全绿。**

## 3. replica retrofit 后旧 replica e2e 定向实跑

命令：`npx playwright test tests/e2e/airtable-replica-interactions.spec.ts tests/e2e/antdpro-replica-interactions.spec.ts tests/e2e/linear-replica-interactions.spec.ts --reporter=list`

结果：**56 passed / 2 flaky / 0 failed（1.7m，exit 0）**——58 用例终态全绿。两 flaky 均为 airtable spec 头两例（:57 A1 搜索 / :92 A5 列头排序）首轮 `complex-page-title` 15s 超时（dev server 冷启动首次进该路由的按需编译延迟；超时后页面快照显示页面**已完整渲染**，纯加载时序非功能失败），重试轮即绿。该模式为**在册预置噪声**：plan 518 Status Note 明文「airtable 交互 13 + visual 6 = 19/19 e2e 全绿（首轮冷启动 flaky 重试过，517 同款预置噪声）」。另实跑 airtable 单 spec 复跑对照：**11 passed / 2 flaky / 0 failed（38.7s，exit 0）**——同两例同位复现，13 用例（= plan 518 口径「airtable 交互 13」）终态全绿，证明非本批改动引入的新增红。

- 三 spec 不触 industrial 面；L5.3–L5.5 未提交改动（inspector/binding/station/template）与 replica 页面无模块交集，实跑结果不受其影响（工作树实跑 = 有效性证据）。
- **顺带复核**（plan 513 Phase 9 挂账「layout-family-enhancements:58 负载 flake……新观察项随 QA.4 复核」）：`npx playwright test tests/e2e/layout-family-enhancements.spec.ts:58` 隔离实跑 → **exit 0（1 flaky 重试绿）**，与在册「page aside 负载 flake、隔离复跑全绿」口径一致，挂账销项。

**本项结论：replica retrofit 后旧 replica e2e 无回归（58/58 终态绿 + 挂账 flake 项隔离复绿）。**

## 4. QA.1-L3 4 Minor 修复复审（全部闭环）

| Minor                                    | 声称修复                  | 本审计验真                                                                                                                                                                                                                        | 结论 |
| ---------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| Minor-1 location 失活 dev 警告未实现     | 警告实现 + 2 focused 单测 | `use-url-filter-sync.ts:24/:86-91`（session-once）；单测 `:124-142`（warn 恰一次 + 失活）+ `:144-161`（未开启零 warn 负例）——data 1175/1175 live 全绿；契约 §5 与 `renderer-api.ts:220` 注释措辞复归准确                          | ✅   |
| Minor-2 契约 §3 download 第 2 态措辞漂移 | 契约 §3 按实施回写        | 契约 :63「args 三态（2026-09-26 按实施回写，QA.1-L3 Minor-2——不提供裸 http(s) 文件 URL 的 GET 直存形态）①api blob ②data: URL 直存 ③envelope url 字段二段消解」——与 `runtime-action-helpers.ts:329-332/:370/:388-393` 实现逐态一致 | ✅   |
| Minor-3 toast 宿主约定缺 §5 注记         | §5 notify 行补单例注记    | `renderer-env.md:270`「toast 渲染层须 app-shell 单例常驻……宿主约定出处契约 §4，playground 落点 playground-experience.md Core Rule 6；QA.1-L3 Minor-3 补记」在案                                                                   | ✅   |
| Minor-4 :16 陈旧锚点                     | 锚点刷新                  | `renderer-env.md:16`「live 锚点随字段追加下移，2026-09-26 位于 :193 起；QA.1-L3 Minor-4 刷新」——live `RendererEnv` 实测 :193；同批 Observation-1 亦消解（§4.3 :259 状态「已实施（plan 512，2026-09-26 收口）」）                  | ✅   |

**本项结论：QA.1-L3 全部 4 Minor 闭环，无残留。**

## 5. QA.1-L4 4 Minor 复审（3 闭环 + 1 带残留；另发现新增台账漂移见 §6 Minor-1）

| Minor                        | 声称修复                                  | 本审计验真                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 结论    |
| ---------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Minor-1 oversized 台账勘误   | 205w 口径 + schemas.ts 登记               | 消化时点闭环：`schemas.ts` 实测 **501 行**（warn 档登记，非拆分路径）；`table-renderer.tsx` 实测 **699 行**（顶格观察）；台账 205w 落 roadmap :233/:241 + dev log :121/:153。**但** live 复跑 checker = **206w**/2e/2exempt——较在册 205w **+1**，新增 warn 档文件 = `flux-renderers-industrial/src/editor/toolbox/toolbox-panel.test.tsx: 528`（plan 521 toolbox 收口新增；521 仅记「零新增红」未记 oversized 计数）。归因见 §6 Minor-1                    | ✅→漂移 |
| Minor-2 overlay 拖拽测试补齐 | focused 补测                              | `table-column-drag.test.tsx:79-90` 新 describe「table column drag reorder — overlay form (QA.1-L4 Minor-2)」——`overlay: true, draggable: true` 菜单 portal 面把手渲染 + drop 重排断言在案，随 data 1175/1175 live 全绿（原风险面 Base UI portal 原生 DnD 已钉住）                                                                                                                                                                                          | ✅      |
| Minor-3 记账勘误（三处）     | roadmap 四行→五行 + plan 内联计数加注终值 | **roadmap 半边闭环**：§13 L4 行已重写（全表 grep 零「四行」/「204w」残留；plan :230「五行」；dev log :121 ② 中央勘误载明终态 1174/1038）。**plan 513 半边未动**：`:106`「data 1172/1172」、`:136`「scheduling 1036/1036」无终值注记；`:210`/`:236`/`:287` 三处仍写「oversized 204w/2e/2exempt **在册口径**」（:287 Status Note 为现在时表述）—— prescribed fix 的「plan 内联加注终值」一半未执行，由 dev log :121 中央勘误 + 本审计代位留痕。见 §6 Minor-2 | ⚠️      |
| Minor-4 dev log 补记         | closure audit 记录补一句                  | dev log 09-26 新增「### plan 513 closure audit + QA.1-L4 线出口审计（双 pass）」节——closure audit r1（0B/2M/4m）→ delta approved（0B/0M）+ QA.1-L4 pass（0B/0M/4m）+ 4 Minor 消化明细全在案                                                                                                                                                                                                                                                                | ✅      |

## 6. `pnpm check` 复跑（受工作树在制品干扰，逐 hit 归因 + HEAD 基线对照）

全链实跑（工作树）：**exit 1**。逐 sub-check 归因：

- 15 sub-check 中 **14 个 exit 0**（react19 / src-artifacts / oversized / active-doc-code-anchors 354 docs / package-css-exports / flux-bundle-pack / workspace-manifest-deps / schema-prop-coverage / scada-symbol-keys / audit-suspects / audit-renderer-browser-io / audit-event-dispatch-ctx / ai-engine-invariants / audit-ui-consistency-gaps——后 8 个因链在 i18n 处中断未达，本审计逐个单跑补齐，全部 exit 0）。
- 唯一红 = `check-i18n-keys`：**57 undefined keys，100% 落在另一 agent 进行中 L5.3–L5.5 的 4 个未提交文件**（binding-panel.tsx ×25 / station-dialog.tsx ×21 / template-dialog.tsx ×15 / toolbox-panel.tsx ×2，全部 `flux.industrial.scada.editor.*` 键；flux-i18n locales 该批次尚未更新——会话仍在进行）。**L3+L4 审计面（env 通道 / url-sync / 三 replica / L3-L4 touched 包）零 hit。**
- **HEAD 基线对照**（`git worktree` 于 `fe5636a09` 另挂临时树实跑，未触碰工作树）：`check-i18n-keys` **exit 0 ✅**；`check-oversized-code-files` **206w/2e/2exempt exit 0**，且 warn 文件集与工作树**逐条 diff 相同**（在制品改动贡献零 warn 漂移）；再对 1e9edc7b0（205w 记录时点）同法实跑 = **205w**，两者 diff 定位新增 warn 唯一文件即 `toolbox-panel.test.tsx: 528`（committed plan 521 面，非在制品、非本 gate 窗口引入）。
- oversized 2 errors = flux-i18n locales 双文件在册豁免（事由完整），exit 语义不受 206w 影响。

**结论：L3+L4 基线（HEAD）check 链可证全绿；工作树唯一红为在制品 L5.3–L5.5 的 i18n 暂态欠账（随该批次补 locales 键即消解），不计入本 gate 新增红。台账漂移 205w→206w 见 Minor-1。**

## 7. Findings

**Blocker：无。Major：无。**

### Minor-1 oversized 台账漂移：在册 205w → 实跑 206w（+1 warn 档文件，plan 521 面）

- 位置：roadmap §13（:233/:241）与 dev log 09-26（:121/:153）在册口径 205w；本审计实跑 **206w/2e/2exempt**（HEAD 与工作树一致）。
- 新增 warn 档文件：`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.test.tsx`（528 行，plan 521 toolbox UI 收口新增测试）；plan 521 Closure Gates（:113/:137）仅记「`pnpm check` 零新增红」未记 oversized 计数，台账未随更新。2e 仍为 locales 双文件在册豁免，exit 0 语义不受影响。
- 影响：与 QA.1-L4 Minor-1 同类（warn 档不翻 exit 但「在册口径」须准确；AGENTS.md 要求新增 hit split/register before finishing）。
- 建议：QA.7 前随簿记批次二选一——`toolbox-panel.test.tsx` 拆分，或按豁免机制登记 + 台账（roadmap/dev log）统一改 206w 口径。**登记 QA.7 ⑥ 残余债登记册。**

### Minor-2 QA.1-L4 Minor-3 的 plan 内联加注半边未执行

- 位置：plan 513 `:106`（data 1172/1172）、`:136`（scheduling 1036/1036）无终值注记；`:210`/`:236`/`:287` 三处「oversized 204w/2e/2exempt 在册口径」未勘误（:287 Status Note 为现在时「在册口径」表述，与 live 206w 及 dev log :121 中央勘误相左）。
- 实况：QA.1-L4 Minor-3 的处方为「roadmap 四行改五行 + plan 两处内联计数加注终值」；roadmap 半边与中央勘误（dev log :121 ①②③）已闭环，plan 内联注记未动。权威面（roadmap/dev log/两份审计档）数值已全部正确，残留仅限 plan 513 文档内部的历史记录层。
- 建议：随 Minor-1 同批在 plan 513 三处 204w 加「（勘误：实况 205w，后 206w——见 QA.1-L4/QA.4 审计档）」一类一行注记 + 两处内联计数加终值。**登记 QA.7 ⑥ 残余债登记册。**

### Observation-1 renderer-env.md §8 decorator 枚举滞后

- §8（:313/:326）仍只枚举 fetcher/notify/navigate/stream/openSocket 五 decorator hook；print/clipboardWriteText/locationSetQuery 三 hook 已在 `renderer-env.ts:40-49` 实装（包装语义保 capability check）。纯文档卫生，后续触碰该文件时顺手补一句即可，不单列 gate 要求。

### Observation-2 工作树在制品 i18n 暂态红（非本 gate 发现，归属声明）

- `check-i18n-keys` 57 个 undefined key 全部来自另一 agent 进行中的 L5.3–L5.5 未提交文件（`flux.industrial.scada.editor.*` 键族，locales 未随批更新）；HEAD（fe5636a09）同 checker exit 0。该批次收口时必须补齐 locales 双语键并复跑全链，否则将构成其自身 gate 的新增红——此义务归 L5 线出口/QA.5，不归 QA.4。

### Observation-3 「全绿」口径

- §3 实跑两例 airtable 冷启动 flaky 按 playwright retries=1 设计意图（config 注记「one retry absorbs environment-level flakes」）+ plan 517/518 在册「首轮冷启动 flaky 重试过」同款口径消化（终态 58/58 绿、exit 0、失败快照证明页面完整渲染）。与 QA.2 Observation-2 确立的「在册 flake + 隔离复跑绿 ≠ 持久功能失败」口径一脉相承，留痕于此。

## 8. Verdict

**pass**（0 Blocker / 0 Major / 2 Minor + 3 Observation）

- 依据 `docs/audits/00-audit-execution-guide.md`：Pass = zero Blockers AND zero Majors。Minor 登记 QA.7 ⑥ 残余债登记册，不阻断本 gate。
- 六项审计内容逐项结论：①五通道 env INV 面 docs↔live 零契约 drift（§1）；②print/copy/download/location 降级路径 + stream/openSocket 先例逐条 live 核对成立，data 1175/1175 + runtime 1449/1449 实跑全绿（§2）；③三 replica interactions spec 定向实跑 58/58 终态绿（exit 0，冷启动 flaky 为 plan 517/518 在册噪声），plan 513 挂账 layout-family:58 隔离复绿销项（§3）；④QA.1-L3 4 Minor 全部闭环（§4）；⑤QA.1-L4 4 Minor 中 3 全闭环、Minor-3 带文档注记残留（§5）；⑥check 链 HEAD 基线可证全绿、工作树唯一红为在制品 i18n 暂态欠账且 100% 归因于 L5.3–L5.5 未提交文件（§6）。
- Minor-1（oversized 台账 205w→206w 漂移，plan 521 面）/ Minor-2（plan 513 内联注记残留）登记 QA.7 ⑥ 残余债登记册；Observation-1/2/3 留痕无动作或归属他线。
- QA.4 集成审计 #3 通过；roadmap §11 QA.4 行与 QA.1 行「复核并入 QA.4」的状态回写由编排层/执行 session 执行（本审计不代写）。
