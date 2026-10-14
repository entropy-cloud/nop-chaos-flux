# 592 CX-14 共性重构：flux-renderers-form-advanced 包内复制沉积收敛批（repeatable-items 容器骨架）

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-14 条目（WA-5 批立案 WA-fadv-001，台账 127 行 successor-required→本批）；先例：cq-3 续波（5ad81bbf2 止步 item-view 层）+plan 588-591
> Related: `docs/architecture/renderer-runtime.md`

## Purpose

cq-3 去重波续波：把 repeatable-items **容器骨架层**（双订阅+keys+add/remove/move+能力句柄+结果码）的五份手写收敛为共享 controller——漂移面参数化保持（minItems 缺省两派/焦点恢复两派/校验深度两形），零申报行为变更。

## Current Baseline（2026-10-14 基线取证实测，HEAD `6617acd0f`；行号全部 live 重推）

- **五容器**（全在 `flux-renderers-form-advanced/src/`，包内零在途）：combo-renderer.tsx（560L）/input-table-renderer.tsx（489L）/composite-field/array-field.tsx（613L）/array-editor.tsx（642L）/key-value.tsx（493L）[R1 m1 勘误：wc 权威，原引各 +1]。冗余复制体 ~450 行=双订阅 19 行 ×4 一致+array-field 变体（无 enabled 选项+root 回退选择器 ：215-224，非孪生）+操作处理器 ~70 行 ×5+能力句柄块 ~55 行 ×4（combo:377-443↔input-table:258-324↔array-editor:400-477↔key-value:225-308[R1 m2 收紧]；孪生级=combo↔input-table 逐字（唯一差=newItem/newRow 命名），array-editor↔key-value 第二近孪生对（entry 形 {id,value}/{id,key,value}+块内焦点副作用[R1 m3]）。
- **array-field=最漂移成员**：无 move/无 max-minItems/无能力句柄/无焦点恢复/自派 scalar-keys state（keys 第三变体 :240-333）/collectRules 返回空（:587-589）。
- **漂移三点（台账）+新增一点（本批取证）**：①minItems 缺省两派——0 派 combo:196-199+input-table:71-74（未配置不推规则）vs 1 派 array-editor:232-235+key-value:43-46（恒推缺省 1；钉=array-keyvalue-min-max-reorder.test.tsx:97）；②combo 双 add 路径校验不对称——UI add=validateSubtree（:312）vs 能力 add=validateField（write-field-value.ts，CX-11 G4 落地）；input-table 同构（:196 subtree vs :273 field）；array-editor/key-value 内部一致（均 field）；③焦点恢复两派——array-editor=refs+rAF（:245-247/:299-320）vs key-value=refs+queueMicrotask（:55/:181-185/:281-285）vs 其余三容器无；④**新增漂移（取证发现）**=removeWhen 处理器门——combo handleRemove 有 isRemoveBlockedAt 门（:335-337），input-table 处理器无门（仅行按钮禁用+能力 removeItem 门，:287-289）——**cq-3 plan 曾称此差异「已收敛」，live 否证=就地勘误材料**。
- **结果码协议两层**：内层 CompositeFieldHandleOpResult（flux-runtime/src/composite-field-handle.ts:5-9 单一定义）字面量返回手写 ×4（combo/input-table/array-editor/key-value 的 skipped/outOfBounds/index 返回）；外层翻译（{ok,code,skipped,data.index}）在 createCompositeFieldHandle.invoke 单源（:49-103）；方法清单已共享（composite-editor-capability-contracts.ts:3-34）。
- **同 tick 双操作用例：全仓不存在**（取证穷举 fadv/runtime/form/react 套件+「tick/双操作」全文检索零命中；唯一「同 tick」先例=flux-ai 会话引擎探针与 wizard 双击分析，均非数组容器）——**roadmap「移植」措辞勘误：实为新拟**（Must-automate 新钉）。
- **cq-3 先例定位**：5ad81bbf2 只做 item-view 层（useArrayItemContext+ArrayItemActionButtons，array-item-shared.tsx:38-225；combo/input-table-row 消费）；array-editor 未迁（计划明记「不强迁」）；removeWhen 门控差异原样保留（Non-Goals 明记）——本批=该波向容器骨架层的直接续波。
- **基线**：fadv 168 文件/1172 用例（实测）；出生考古=9e97ba665（combo+input-table 同 commit 双落）+aa2afdf3c（array-editor/key-value/array-field 自 form 包提取携入）。
- **授权链**：包内零公共 API 变更，非结构性（roadmap 预裁定，无门标记）；主工作树在途 14 文件与本批零交集（form-advanced 零在途）；提交严格限定本批路径。

## Goals

- **G1**：新包内共享件 `useArrayContainerController`（roadmap 命名；**参数面=R1 M1 审查员交付**）：identity{keyProp 'itemKey'|'rowKey', compatPrefix 'combo-'|'row-'|'item-'|'pair-', repeatedTemplateIdPrefix[combo/input-table], buildItemInstancePath[combo/input-table=true; array-editor/key-value=false], newEntryFactory}+minItemsDefault 0|1+minItemsGuard 'handler'|'button-only'+validate{uiAddDepth subtree|field, capabilityAddDepth 'field', removeDepth 'subtree', removeValidateGate 'shouldValidateOn'|'always'[key-value=always 无门]}+focusRestore{timing none|rAF|microtask, on: Array<'add'|'remove'>}[array-editor add+remove; key-value 仅 remove]+removeGate 'handler+capability'|'capability-only'|'none'+events{onAdd?,onRemove?,onReorder?}——**只收原始/稳定输入，返回身份稳定处理器**[ComboItem/InputTableRow memo 比较器比较 onRemove/onMoveUp/onMoveDown 身份 combo:160-179；itemsRef/pendingFocusRef 经 effect 同步禁 render 写；knip 导出最小化]；结果索引语义=全部返回 pre-add 长度（陈旧渲染快照）+bounds→minItems→gate 判定序保持。吸收：双订阅/keys+itemEntries/writeValue 同步/add-remove-move 处理器+结果码/能力句柄块 ×4。
- **G2**：同 tick 双操作判别用例**新拟**（**R1 M2 逐格规范，期望值从代码推导**）：①UI 双 add（combo/input-table handleAdd 陈旧闭包两次写 `[...itemsArray, {}]`→**一次 add 丢失**+compatAppend 触发两次[key 计数漂移]）②能力双 add（appendValue 两次均落 live form state+invoke 恒返回 `{index: <pre-add 陈旧长度>}` 两次）③双 remove 跨门不对称对（**[R2 后 G2-③ 就地勘误 2026-10-14，closure m2：同 tick 实测推翻本格原速写——四容器第二下 remove 均可达 0**；minItems 门只在新到 at-floor 闭包上咬合，且按钮禁用守卫先行截断 UI 路径；key-value 读 pairsRef 新值同 tick 可破下限仍成立]）④混合 add+remove 各 1。
- **G3（R1 裁定=排除）**：array-field **不进本批 controller 消费**——追加排除理由=非孪生订阅（无 enabled+root 回退）+handler-only removeWhen 门（:409-411）+add/remove 均 validateSubtree+**完全无 minItems 下限**（可删至 0，不属于 0/1 任一派）+有状态 scalar-key 旁路（:251-333）+object 稳定 keys 双机制并存+collectRules 空——纳入将引入 6+ 单成员旗标组合无孪生对照=行为变更风险无判别力；本批=四份吸收，roadmap/台账按 When-Closing 11 部分收敛标注（五份清单保持、四份 absorbed）。
- 台账 WA-fadv-001 `found → verified`（closure 后）；roadmap CX-14 `todo → done`。

## Non-Goals

- minItems 缺省两派统一/焦点恢复两派统一/combo-input-table 校验深度不对称统一/removeWhen 处理器门统一（四者统一=申报行为变更，归 successor[与 CX-11 validateSubtree successor 同向]）；array-item-shared item-view 层（cq-3 已收敛）；key-value-row/input-table-row 行件。

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/`：combo-renderer.tsx、input-table-renderer.tsx、array-editor.tsx、key-value.tsx、新共享件与测试（array-field.tsx=R1 G3 已裁定排除，不消费 controller）
- ledger/roadmap/dev log

### Out Of Scope

- 主工作树在途 14 文件；上述四项统一（successor）；runtime composite-field-handle 契约。

## Failure Paths

不适用（纯包内收敛零行为变更；controller 参数化不当处由特征化钉+判别承载）。

## Test Strategy

档位：**必须自动化**。特征化先钉（四容器 minItems 边界[既有 :97 钉核对]/UI add vs 能力 add 校验深度两形+remove-validate 门三派/removeWhen 门 combo-handler-有-input-table-无/焦点恢复 rAF-vs-microtask+触发面 add-remove 差异/结果码 skipped-outOfBounds-index 全 face+pre-add 陈旧索引[既有 composite-field-handles 套件核对]）→**同 tick 双操作新钉[四格：UI 双 add/能力双 add/双 remove 跨门不对称/混合]**（G2）→提取→套件同绿+判别变异恰红；fadv filter 四门禁+哨兵+隔离五门禁（新文件 git add -N）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: completed（2026-10-14：漂移钉+结果码钉+同 tick 四格钉全绿落盘；基线 168/1172 实测；closure audit agent_1c89a7e6 后据实回勾）
Targets: fadv 测试

- Item Types: `Proof`

- [x] Proof：漂移钉——minItems 0/1 两派边界（核对既有钉+缺口补）+UI/能力 add 校验深度两形+removeWhen 处理器门 combo-有/input-table-无+焦点恢复 rAF-vs-microtask 时序。（Status 2026-10-14: `cx14-container-drift-pins.test.tsx` 18 用例全绿——0/1 两派边界含 kv 缺省下限+collectRules 两派 submit 面；UI-add validateSubtree vs 能力 writeFieldValue **行为可见不对称**（root minItems 错误 UI add 浮现/能力 add 不浮现，combo+input-table 双钉）+array-editor/key-value 双路 field-depth 沉默面；remove-validate 门三派=still-violating 协议（4 seed×maxItems 2→移除后仍违规：gated 三派错误保持消失/kv 无门重浮现+array-editor change 门 toggle 证明仅门差异）；removeWhen=combo 能力面补钉（input-table 已有）+勘误取证：handler 级 isRemoveBlockedAt 门在一切可达 DOM 态被共享按钮守卫先制（同一 removeBlocked 源），无按钮级行为对照=defense-in-depth，已落测试头注；焦点恢复触发面=kv add 不夺焦新钉（rAF-vs-microtask 时序本体为源码事实，行为钉=array-editor add+remove/kv remove 已有套件承载））
- [x] Proof：结果码全 face 核对（composite-field-handles 套件现有覆盖+缺口补）。（Status 2026-10-14: `cx14-composite-result-code-pins.test.tsx` 8 用例全绿——combo/input-table 组件级 skipped/outOfBounds/index/非交互外层面补齐+四容器 **pre-add 陈旧 index** 面全钉（invoke 返回 `{index:<pre-add 长度>}` 同时 live 数组 +1）；factory 级翻译既有覆盖核对无缺口）
- [x] Proof：**同 tick 双操作新钉**（G2 四格：UI 双 add/能力双 add/双 remove 跨门不对称/混合——期望值按推导落盘）。（Status 2026-10-14: `cx14-same-tick-double-op-pins.test.tsx` 14 用例全绿，单 `act` 内双 dispatch/双 invoke 仪表。逐格实测：①UI 双 add=combo/input-table 一次 add 丢失（快照 setValue 后写胜出，2→3 非 4）+**array-editor/key-value 子派=appendValue 双落（2→4）**（推导新增面）；compatAppend×2 key 计数漂移=源码级事实（append 无条件先于写），DOM 不可观测，resync 后行数一致已钉；②能力双 add=四容器双落+恒返回 pre-add 陈旧 index 两次（逐字 conform G2 M2）；③双 remove（floor+1 同 tick 双击）=**实测四容器同达 0**（combo/input-table 陈旧闭包门第二下仍放行+removeValue clamp；key-value 无门+读 pairsRef 新值同 tick 破下限；array-editor 无 handler 门）——计划 shorthand「combo/input-table handler 门挡第二下」在同 tick 仪表下不成立（门仅对 fresh at-floor 闭包生效，而该态被按钮守卫先制），按实测值落钉=勘误材料归 Phase 3；④混合 add+remove=combo add 存活+原首项被移除（[b,{}]）/kv 同向经 fresh ref）
- [x] Proof：基线落字（fadv 168/1172 实测）。（Status 2026-10-14: HEAD 6617acd0f 复跑 `pnpm test` = 168 files / 1172 tests 全绿，172.7s）

Exit Criteria:

- [x] 钉全绿；同 tick 新钉在案（勘误注记：新拟非移植）。（Status 2026-10-14: 三新钉文件 40 用例全绿；新钉非移植在案；cell ③ 计划 shorthand 与实测差异=就地勘误材料，见上条 Status）

### Phase 2 - 提取与消费改引

Status: completed（2026-10-14：controller 590L 吸收四容器骨架[R1 M1 参数面全量]；**前后双腿实证=stash 重建 40/40 绿[手写实现]→pop 后 40/40 绿**；判别=removeItem minItems 分支变异恰 2 红外科手术式→sha256 恢复[执行+审计员亲手复现同数]；knip 15 条收私[14 类型 un-export+死常量删]；骨架标记 grep 四容器归零；closure audit 后据实回勾）
Targets: 四容器+新共享件（array-field 排除[R1 G3]）

- Item Types: `Fix | Decision`

- [x] Decision：array-field 参与面裁定=**排除**（R1 G3，理由六条落 Baseline；部分收敛标注随 Phase 3 回写）。
- [x] Fix：controller 提取（R1 M1 交付参数面全量）+四容器消费改引；身份稳定处理器契约（memo 比较器钉）+结果索引陈旧语义保持。（Status 2026-10-14: `composite-field/array-container-controller.ts`（590L）落地 R1 M1 全参数面——identity{mode object-key|entry-id/keyProp/compatPrefix ×4/repeatedTemplateId/buildItemInstancePath（combo/input-table=true）/parentInstancePath/onDuplicateKeys/uiNewEntryFactory/newEntryFactory}+minItemsDefault 0|1（combo/input-table=0 派，array-editor/key-value=1 派）+minItemsGuard handler|button-only+validate 四轴（uiAddDepth subtree|field/removeValidateGate shouldValidateOn|always[kv=always 无门]）+uiAddMechanics snapshot-replace|live-append+handlerReads snapshot|itemsRef（kv）+syncRefOnMutate+uiMoveBounds both-bounds|to-bounds+removeGate handler+capability|capability-only|none（combo=handler+capability/input-table=capability-only/ae+kv=none）+focusRestore{timing none|rAF|microtask, on}（ae=rAF add+remove/kv=microtask remove-only）+events 转发——四容器漂移面逐项与 G1 清单一致（diff 实测）；处理器全 useCallback 身份稳定（memo 比较器原样保持）+结果索引 pre-add 陈旧语义保持（`{ index: items.length }`）；array-field.tsx 零触碰（G3）。执行 session 收口补刀：knip 新增 15 命中修复——controller 14 个未消费导出类型去 export（G1「knip 导出最小化」；实测仅 hook+UseArrayContainerControllerParams 被四容器消费）+key-value-normalizer `EMPTY_RAW_KEY_VALUE_PAIRS` 随双订阅吸收失去末位消费方→删除；knip 复跑 no new hits（29 registered 命中全他包存量））
- [x] Proof：全部钉同绿；判别变异恰红→sha256 恢复。（Status 2026-10-14: Proof-before-Fix 两腿重建（death-session 未及留证）——`git stash push` 限四容器路径（stash `--stat`=本批 415+/1018- 原样，controller+钉文件为 untracked 不入 stash），三钉文件 40/40 绿（6.83s）=**钉在 PRE-refactor 手写实现下同成立**（无一钉按新行为书写，零重写）；pop 后五文件 sha256 逐字节复核一致；POST-refactor 腿复跑 40/40 绿（6.49s）——前后同绿在案。判别变异：controller 先备份 repo 外（sha256 432148a0…）→ removeItem minItems 分支结果字面量 `{skipped:true}`→`{}` → drift 18+same-tick 14 全绿、result-code 8 用例**恰 2 红**（combo+input-table minItems-skipped face）=外科手术式恰红→备份还原 sha256 一致→全量套件 171/1212 绿证无残留；红日志 `_tmp/cx14-mutation-red.log`）

Exit Criteria:

- [x] 骨架块归零计数落字（双订阅 ×1/处理器 ×1/句柄块 ×1）；套件同绿。（Status 2026-10-14: grep 实测四容器 `useCurrentFormState`/`useScopeSelector`/`useCompositeFieldHandle`/`useCompatibilityItemKeys`/`isRemoveBlockedByWhen` 全=0，唯一副本落 controller（文件内 import+调用点 ×2 形态）=双订阅/keys/处理器/句柄块各 ×1；套件同绿=fadv **171 files / 1212 tests** 全绿（knip 收口后于提交态 HEAD bbb63ed00 终态复跑）；fadv typecheck/build exit 0，lint 0 error+1 warning=transfer-renderer.tsx 既有（非本批路径）；哨兵 flux-react 65/580+flux-renderers-ai 103/850 精确同数（提交态复跑）；`check:oversized-code-files` exit 0（controller 590L=WARN 带非门禁红，与 upload-field 693L 等同带，提取评估归 successor/审计裁断））

### Phase 3 - 回写与收口

Status: done（2026-10-14：台账 WA-fadv-001 verified[220=found 59+verified 161/未处置 0]；roadmap CX-14 done[部分收敛标注+两勘误]；dev log 10-14；HEAD 态五门禁诚实轨迹[首跑 check 红=runtime-factory 701[并行会话 feature 提交顶过阈值]→拆 module-cache.ts 670+31→终态全绿]；closure audit agent_1c89a7e6 R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账 WA-fadv-001 verified；roadmap CX-14 回写（含「移植」措辞勘误+removeWhen 勘误注记）；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_1c89a7e6 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_6808cb67-58db-4b53-af86-181f1c1cc87c，review-only，R1+R2 同审查线）
- Verdict: R1 `fail`（0B/2M/3m）→全修；R2 `pass`（0B/0M/2m[m4 三处一 liner 同步已随 activation 折入/m5 本条])
- Rounds: 2
- Findings addressed: **M1** 最小参数面不足以零行为吸收七处逐容器差异→**审查员交付完整参数面**（identity 五件/minItemsGuard 两形/validate 四轴[含 removeValidateGate 三派:key-value 无门]/focusRestore{timing,on 触发面}/removeGate 三形枚举/events 转发）+身份稳定处理器契约（memo 比较器）+结果索引陈旧语义+判定序保持；**M2** 同 tick 钉四格逐格规范（期望值推导：UI 双 add 丢失一次+key 计数漂移/能力双 add 双落+陈旧 index 两次/双 remove 跨门不对称可破下限/混合）；**G3 裁定=array-field 排除**（六条追加理由：非孪生订阅/handler-only 门/双 validateSubtree/无 minItems 下限/scalar-key 旁路/collectRules 空）；**m1** 行数 +1 勘误（wc 权威）；**m2** 句柄块行号收紧；**m3** 孪生级措辞（两对近孪生+entry 形/焦点副作用差）。R1 verified-clean：双订阅 ×5 位点/minItems 两派+钉 :97/校验不对称/焦点两派/removeWhen 门/结果码两层/同 tick 全仓不存在/fadv 168/1172 实测复跑/在途零交集/模板合规。

## Closure Gates

- [x] controller 落地+骨架块归零（array-field 裁定在案）
- [x] 行为保持判别（特征化同绿[stash 前后双腿]+同 tick 新钉+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_1c89a7e6 R1 approved，据实回勾）
- [x] `pnpm typecheck`（HEAD 态 worktree cx14-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——首跑 check 红[runtime-factory 701，并行 feature 提交所顶]→拆 module-cache→终态全链 exit 0）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 四项漂移统一（minItems 缺省/焦点恢复时序/UI-能力校验深度/removeWhen 处理器门）——均申报行为变更，归 successor；**R1 M1 追加三项 successor**=key-value 无门 remove-validate 统一/handler 级 minItems 门不对称统一/结果索引陈旧快照语义（successor 禁顺手「修」）
- validateSubtree ×12 门控块吸收（与 CX-11 validateSubtree successor 合流）。

## Closure

Status Note: 2026-10-14 收口。controller 590L 吸收四容器骨架（array-field 三裁定排除；四份 absorbed 部分收敛）；前后双腿实证（stash 重建 40/40+pop 后 40/40）；判别 2 红外科手术式双留证；knip 15 收私；**批次代码经并行会话提交 bbb63ed00 落地（标题无 full-green 标记=合规，提交时点验证未完成[审计员裁定]）**，验证与回写由本链完成；连带 MUST-split=runtime-factory 701→module-cache.ts 拆分（并行 feature 提交所顶，共享门禁解锁）；实施=中断恢复两段（实施 agent 配额中断+收尾 agent 接力），本会话编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_1c89a7e6-1dc4-4c2e-abba-081784d1a9c8，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M+3 收口义务 m1=Phase 1/2 slice status 回勾[已落]/m2=G2-③ 就地勘误[已落]/m3=收口提交纪律[title 带 full-green verification+body 带 bbb63ed00 出处注记+只扫 4 收口文件]——随本提交履行）
- Findings addressed: 审计员逐项对账（参数面全量+四容器映射逐格/分歧面零压平[骨架标记 grep 全 0]/G3 array-field 零触碰/module-cache 拆分逐字[vs 4dc34b02e :58-88]+导出 SET 不变+671-vs-670=检查脚本计数口径/门禁日志实跑核验/在途并行 plan-593 文件零触碰）+**亲手判别**（removeItem minItems 分支变异→恰 2 红[combo+input-table minItems-skipped 面]→sha256 086b4f49… 逐字节恢复→40/40 绿）+bbb63ed00 标题归属裁定（无标记=非违规）。

Follow-up:

- 四项漂移统一（minItems 缺省/焦点恢复时序/UI-能力校验深度/removeWhen 处理器门）+key-value 无门 remove-validate+handler minItems 门不对称+结果索引陈旧语义——均申报行为变更归 successor。
- validateSubtree 门控块吸收（与 CX-11 validateSubtree successor 合流；CX-14 后实测五容器内 12 处）。
- array-field 排除面（无 minItems 下限等）与 controller 的后续一体化裁定。
