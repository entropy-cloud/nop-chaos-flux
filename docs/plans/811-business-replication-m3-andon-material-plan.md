# 811 M3-M3 MES 异常叫料移动页复刻（business-page-replication roadmap M3-M3）

> Plan Status: active
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-M3（依赖 M2 done；前置 M1/M2 done——mes mock 模块已建，M2 delegate 拆分先例在案）
> Related: D1 总体设计；D3 §2.6/§4.4/§4.5/§5.6（M3 页设计）；R2 §2 M3；R4 §1 M3（G14 既有控件扩展——accept 注入临时口径 §6.3）；W1 先例（mobile host override + 分支 B axe）

## Purpose

落地 M3-M3「MES 异常叫料移动页」：mobile 族全战场（notice-bar 播报 / pull-refresh 下拉刷新 / infinite-scroll 翻页 / swipe-cell 催单·关闭 / countdown 响应倒计时+超时标红 / floating-bubble → action-sheet grid 快捷动作 / floating-panel 半屏发起表单：wheel-picker 异常类型 + input-image 现场拍照 uploadAction + image-viewer 预览放大 + input-table 叫料明细 + number-keyboard 数量录入），mes mock 扩展（M3 子集端点）+ mobile host override + focused e2e + axe 分支 B 登记。收口为 roadmap §2 M3 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication 六件套、`/r/ReplMes__` 分支已接（M1）、M2 delegate 拆分先例（`mock-backend-repl-mes-reporting.ts`，W2→stock 同型）、W1 mobile host override 先例（`wms-pda-receiving-host.tsx` + registry 特例 + `.repl-mobile-canvas*` 375×667）、axe 分支 B describe（MOBILE_ROUTES + hasTouch）、CDP touch 手势 helper（swipe/pull/tap）。
- D3 §2.6 M3 设计（D5 核对 + D6 MAJ-C 裁决 mobile host override 形态）：notice-bar 播报 + pull-refresh(onRefresh→refreshSource) + infinite-scroll(onLoadMore 翻页) + swipe-cell(催单/关闭) + countdown(targetTime=respondDeadline epoch-ms，onFinish 超时标红) + floating-bubble→action-sheet(display grid) + floating-panel(anchors 两档)半屏表单（wheel-picker 异常类型/input-text 工位/textarea 描述/input-image uploadAction=uploadAndonPhoto〔G14 §6.3〕/image-viewer/叫料明细 input-table+number-keyboard）。
- mock 端点：M3 子集逐名对齐 D3 §4.4（andonFindPage ≥25 行 ANDON|MATERIAL 过滤/andonCreate〔联动生成 MaterialIssue docNo 回显〕/andonEscalate escalationLevel+1/materialIssueUpdate 叫料明细录入·关闭/uploadAndonPhoto 返回 URL——e2e 走文件注入）。
- live 能力盘点（2026-10-31 起草核对）：`CONCAT` 数组拼接 builtin 在（翻页 append 机制）；formula 无 `NOW()`（超时行标红以 fixture 派生 `expired` 布尔承担）；ActionSheet 无受控 open、FloatingPanel 无受控 height（展开/收起以手势与 e2e CDP 拖拽承担）；**infinite-scroll `loading` 为 host 运行时受控值——in-flight 守卫仅在 `loading`/`error` prop 跳变时释放，不绑定则首次加载后永久锁死（infinite-scroll.tsx L92-111）；`immediateCheck` 默认 true 挂载即触发（须显式 false）**；ImageViewer 有受控 open+initialIndex+onChange（无内置触发器，须页面按钮 setValues 点火）；input-image uploadAction 经 child scope `__uploadFile` 派发 ajax，mock 端点回 `{url}` 即入字段值（`data-testid="nop-input-image-input"` 文件注入入口）。

## Goals

- mock 扩展（M3 子集端点 + 写镜像）+ `page-schemas/mes-andon-material.json` + mobile host override（registry 特例）+ entry + e2e `tests/e2e/replication-mes-andon-material.spec.ts` + axe 分支 B 登记。
- e2e 断言按 D3 §5.6 M3 清单（**经勘误后口径**——「选『发起叫料』→ floating-panel 展开」链式口径因 ActionSheet 无受控 open/FloatingPanel 无受控 height 不可达，落地为分立断言并在 D3 §5.6 就地勘误；其余照清单）：首屏行 ≥5+notice-bar 播报/pull-refresh→andonFindPage 计数增量/infinite-scroll 翻页计数+行数增长+到底 finishedText/拍照上传 uploadAndonPhoto===1+缩略渲染+image-viewer 受控打开定位+onChange index 断言/action-sheet grid 选「发起叫料」→toast+关闭/floating-panel anchors 两档拖拽/叫料提交 andonCreate===1+docNo 渲染/swipe-cell 催单 andonEscalate===1+escalationLevel+1 回显/countdown 已过 deadline 行 onFinish 超时标红/number-keyboard open+onConfirm 写回断言/G14 accept 注入口径/focus 3 条。

## Non-Goals

- 不实现 S1 及后续页；不做升级链多级可视化（R2 ⑦ Andon 升级链以 escalationLevel 数值回显承担，不做链图）；不做领料单状态跟踪专页（R2 ⑩，materialIssue docNo/状态行内回显承担）；不落 G14 capture 属性断言。

## Scope

### In Scope

- M3 页 schema + mock 扩展 + mobile host override + entry + e2e + axe 分支 B 登记；roadmap §2 M3 回写；D3 §2.6 与 §5.6 实现勘误就地落档（「发起叫料→面板展开」链式口径改判、image-viewer 受控点火、countdown 超时行确定性口径等；勘误引用行号以 live 文件实测为准，不沿用 D3 旧行号——评审 Minor-3）。

### Out Of Scope

- 其余 8 页；升级链链图；领料单跟踪专页；flux-renderers-mobile 新类型/新 prop（缺口只登记不扩约）。

## Failure Paths

| 编号          | 触发                      | 行为                                                                                  | 可重试 | 用户可见表现 |
| ------------- | ------------------------- | ------------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail      | focused e2e 失败          | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D3 §2.6     | 是     | e2e 全绿     |
| upload-bridge | uploadAction 结果桥接不符 | 以 upload-field.tsx `readResultItem` live 契约为准（result.data.url）调整 schema/mock | 是     | 缩略渲染     |
| gesture-flake | CDP touch 手势偶发不触发  | 加大位移/步数或显式 settle 等待；swipe-cell 用 swipeReplicationCell 先例参数          | 是     | 手势稳定     |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿；手势类断言走既有 CDP helper 先例参数（防 flake 参数在 Failure Paths 预案）。

## Execution Plan

### Phase 1 - M3 页全链实现

Status: planned
Targets: `mock-backend-repl-mes-andon.ts`（新建 delegate）、`mock-backend-repl-mes.ts`（接线）、`replication/mes-andon-material-host.tsx`（新建）、`complex-pages-registry.tsx`（特例）、`page-schemas/mes-andon-material.json`、`complex-pages-entries.ts`（entry）、`tests/e2e/replication-mes-andon-material.spec.ts`、axe spec MOBILE_ROUTES/JSON

- Item Types: `Fix | Proof`

- [ ] mock 扩展：新建 `mock-backend-repl-mes-andon.ts` delegate（M2 拆分先例），端点**逐名对齐 D3 §4.4**——`andonFindPage`（get，≥25 行确定性 ladder，ANDON|MATERIAL 两型全占，page/pageSize 分页 + type 过滤；MATERIAL 行带 materialIssue{docNo,lines[material/requiredQty/issuedQty/location]}；**含已过 deadline fixture 行——确定性锁定：首页恰 1 条已过期，全 ladder 共 2 条**〔respondDeadline 固定过去 epoch-ms + 派生 expired 布尔〕）/`andonCreate`（post，ANDON→`AD-2026-xxxx`、MATERIAL→联动生成 MaterialIssue `MI-2026-xxxx` docNo 回显，session 列表前插）/`andonEscalate`（post，escalationLevel+1 回显）/`materialIssueUpdate`（post，op=close→status CLOSED）/`uploadAndonPhoto`（post，回 `{url:svg data-url, name}`）；写镜像 lastAndonCreateBody/lastEscalateBody/lastIssueUpdateBody（G2 同族）；接线进 `createReplMesFetcherBranch`（M2 delegate 同位）
- [ ] mobile host override：`replication/mes-andon-material-host.tsx`（W1 同构：375×667 `.repl-mobile-canvas*` + testid `mes-andon-material-canvas/-screen` + data 种子 andonItems/andonPage/andonHasMore/andonLoading/docNo/viewerOpen/viewerIndex/panelAnchor 等）+ `complex-pages-registry.tsx` 特例
- [ ] schema JSON（D3 §2.6 组件树：notice-bar 播报未关闭数〔ARRAYFILTER 现算〕/pull-refresh onRefresh→ajax page=1 重置 accumulator+toast/**infinite-scroll 绑定 hasMore+loading 双受控值+immediateCheck:false，onLoadMore 链=setValues{loading:true}→ajax(page+1)→then〔setValues{andonItems:CONCAT(andonItems,result.data.items), andonHasMore, andonPage:+1, loading:false}〕**（in-flight 守卫靠 loading 跳变释放）/loop×swipe-cell 行（催单 andonEscalate+关闭 materialIssueUpdate op=close+countdown targetTime=${respondDeadline}+onFinish toast+行标红 className=${$slot.item.expired}〔loop 行作用域，W1 约定〕）/floating-bubble→openDialog action-sheet display grid 三项〔发起异常/发起叫料/刷新指引——onSelect toast+closeSurface，对话框作用域隔离 W1 先例〕/floating-panel anchors [220,480]+onChange 写回 anchor index/panel 内 form：wheel-picker 异常类型〔ANDON/MATERIAL〕+input-text 工位+textarea 描述+input-image photos uploadAction+「查看照片」按钮 setValues{viewerOpen:true,viewerIndex:0} 点火 image-viewer（open 受控+initialIndex+onChange index 写回）+叫料明细 input-table（物料/应领数量/库位，addable）+快捷数量 input-number+number-keyboard 受控 open+onKey 拼接+onConfirm 收盘/submitAction→andonCreate→then setValues docNo+成功 toast；testid `<pageId>-<element>`；strict 零 error）
- [ ] complex-pages-entries.ts 加 mes-andon-material entry
- [ ] e2e spec（D3 §5.6 断言清单**经勘误后口径**：前置〔canvas 375×667+首屏 ≥5 行+notice-bar 播报+findPage ≥1〕/交互① pull-refresh 手势→计数+1+toast/交互② infinite-scroll 翻页→计数+1+行数 10→20+到底 finishedText/交互③ swipe-cell 催单→escalate===1+镜像 escalationLevel+1+pull-refresh 后行回显/交互④ swipe-cell 关闭→materialIssueUpdate===1+CLOSED 回显/交互⑤ countdown 已过 deadline 行→**行作用域断言**（countdown data-finished+行标红 class=${expired}）+超时 toast 以消息 locator 计数 ≥1 界定〔fixture 首页恰 1 条已过期〕/交互⑥ bubble→action-sheet grid→发起叫料→toast+dialog 关闭〔§5.6 链式口径改判的分立断言，勘误随收口落 D3 §5.6〕/交互⑦ floating-panel 拖拽 anchor 两档→onChange 写回断言/交互⑧ 拍照上传 setInputFiles 选 1 张→uploadAndonPhoto===1+缩略+「查看照片」点火 viewer 定位该图（**DOM 页面态断言**——单图 viewer 无翻页，onChange 不可达，§5.6 勘误登记）〔G14 accept 注入口径〕/交互⑨ 叫料提交→andonCreate===1+docNo 渲染+镜像逐字段/交互⑩ number-keyboard open→onKey→onConfirm 写回断言/focus ① action-sheet 展开焦点**落入面板（非首项——D2 勘误 7 既有口径：不支持首项 autofocus，Tab 兜底）**+dialog 关闭焦点返 bubble（assertDialogFocusRoundTrip 链）〔§5.6 勘误登记〕/focus ② panel 表单首字段可达/focus ③ swipe-cell 操作钮 tab 可达；显式 --retries=0）
- [ ] axe 分支 B 登记：MOBILE_ROUTES + `complex-pages/mes-andon-material` JSON 键（首跑实测回填+\_notes）
- [ ] 验证：`npx playwright test tests/e2e/replication-mes-andon-material.spec.ts --retries=0` 全绿 + axe spec 绿 + M1/M2 回归 + playground unit + strict 校验

Exit Criteria:

- [ ] M3 页 mobile canvas 可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replMesCalls 计数证据）
- [ ] axe 分支 B 基线登记绿
- [ ] roadmap §2 M3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（general-purpose，2026-10-31）
- Verdict: pass（round-2；round-1 fail 2 Major + 3 Minor 全部修复并经复核）
- Rounds: 2
- Findings addressed: round-1 Major-1〔infinite-scroll loading 受控契约/immediateCheck 显式 false+onLoadMore 链写实〕、Major-2〔§5.6 链式口径改判显式化+Scope In/Goals/Closure Gate 措辞对齐〕、Minor-1〔image-viewer「查看照片」受控点火〕、Minor-2〔已过期 fixture 确定性锁定+行作用域断言〕、Minor-3〔勘误行号以 live 实测为准〕；round-2 Minor-A〔单图 viewer onChange 不可达→DOM 页面态断言+勘误登记〕、Minor-B〔focus ① 采用 D2 勘误 7 既有口径〔焦点入面板+Tab 兜底〕+dialog 关闭返 bubble 链、§5.6 勘误点名〕、Minor-C〔Closure Gate §2.6 与 §5.6 勘误对齐 Scope In〕

## Closure Gates

- [ ] in-scope 工作全部落地（M3 页 + mock 扩展 + host override + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.6 M3 断言清单**经勘误后口径**全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；D3 §2.6 与 §5.6 勘误——已在 Scope In 裁定为无条件在案工作）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [ ] `pnpm check`（触达面零新增红口径；scanner-baselines 增量如触发就地注册+note）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- 行级状态写回（onFinish→行级标红/escalate→行级即时回显）受 B3.2 V6 行级路径绑定缺口约束，live 以 fixture 派生布尔+pull-refresh 重同步承担——归 roadmap B7 successor（与 M2 勘误同族）

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
