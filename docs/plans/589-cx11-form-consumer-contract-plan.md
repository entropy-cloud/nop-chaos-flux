# 589 CX-11 共性重构：form 渲染器消费侧契约缺口与复制沉积收敛批

> Plan Status: completed
> Last Reviewed: 2026-10-14
> Source: `docs/backlog/workaround-code-smell-audit-roadmap.md` CX-11 条目（WA-4 批立案 WA-form-001/003/004/006 + WA-5/6/7/8 扩围 WA-fadv-002/006/007、WA-data-012、WA-layout-004、WA-scheduling 跨引用；台账 117/119/120/122/128/132/133/148/174 行 successor-required→本批）；先例：plan 579-588
> Related: `docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`

## Purpose

收敛 form 渲染器消费侧对 flux-react FieldFrame 注入契约的无类型 cast 链与四组复制沉积（injected-aria 消费矩阵、useInputComponentHandle 注册样板、date 族双实现、writeFieldValue 写原语），并对 getFocusTarget 补偿族与 choice 族 source-error 链做出显式收敛/裁定。

**勘误（draft review R1 B1 修正，2026-10-14）**：WA-4 台账行「choice 族整链丢弃」**不是** a11y 悬空缺陷——choice 族自派 cid 限定 `${instanceKey}-source-error` 且自渲染同 id error span（`checkbox-group-renderer.tsx:37-38/:232-235`，id 与引用同变量派生成对），引用恒可解析。真实结构=**双错误通道并存**：FieldFrame 注入链承载表单校验错误（`${fieldUid}-error`，shouldShowFieldError 门控），choice 族 source-error 链承载选项源加载错误（`getSourceErrorMessage(optionsSourceState)`，checkbox-group:34）——载荷不同，**并入注入链会丢失 source 错误显示能力，禁**。本批对该族的收敛=通道内惯用形共享（G1b），跨通道统一登记 follow-up。

## Current Baseline（2026-10-14 live 实测，HEAD `12e081b4a`；draft review R1 逐项核对修正）

- **上游注入面**：`flux-react/src/field-frame.tsx:186-211` cloneElement 注入 `id/aria-required/aria-labelledby/aria-describedby/aria-errormessage/aria-invalid`+包装 `onFocus/onBlur`（m1 勘误：原引 :186-202 漏后段）；error 元素 id=`${fieldUid}-error`；`${name}-control` 为冻结宿主契约（field-frame.tsx:171-176 注释），`${name}-error` 简直不存在（m1 勘误）。
- **消费矩阵（canonical 11 行，draft review M2 修正；台账 117 行「9 份」为单行 cast 子集口径，行号已漂移[m4]以本表为准）**：

  | #   | 位点                                                                                            | 档  | 键                                                           | fallback |
  | --- | ----------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------ | -------- |
  | 1   | input-number-renderer.tsx:73                                                                    | B   | describedby+errormessage                                     | errorId  |
  | 2   | input-datetime-renderer.tsx:55                                                                  | B   | 同上                                                         | errorId  |
  | 3   | date-range-renderer.tsx:123                                                                     | B   | 同上                                                         | errorId  |
  | 4   | input-date-renderer.tsx:34                                                                      | B   | 同上                                                         | errorId  |
  | 5   | textarea-renderer.tsx:42                                                                        | B   | 同上                                                         | errorId  |
  | 6   | input-time-renderer.tsx:60                                                                      | B   | 同上                                                         | errorId  |
  | 7   | input.tsx:218-221                                                                               | B   | 同上（多行 cast）                                            | errorId  |
  | 8   | markdown-editor-renderer.tsx:171                                                                | C   | 仅 describedby                                               | errorId  |
  | 9   | period-renderers.tsx:96                                                                         | C   | 仅 describedby                                               | errorId  |
  | 10  | upload-field.tsx:188（form-advanced，WA-fadv-007 第 10 份）                                     | C   | 仅 describedby                                               | errorId  |
  | 11  | input.tsx:107-116 `FrameInjectedAriaProps`+`InputGroupFieldControl`（own-vs-injected 逐键合并） | A   | 全键类型化（缺 aria-required——id 已声明并消费[R3 m-b 勘误]） | —        |

- **choice 族 source-error 链（B1 勘误后重定性；R2 M1 普查修正）**：**6 份实例 × 5 文件**——①checkbox-group-renderer（:38 派 id+:209-210 aria+:232-235 span）②input-choice-renderers select 路径（:138+:277-278+:444）③同文件 radio 路径（:572+:610-611+:631-634）④button-group-select-renderer（:50+:129，消息源 `dictState.errorMessage ?? getSourceErrorMessage` :46）⑤tree-controls#1（:130+:209，input-tree）⑥tree-controls#2（:316+:499，tree-select）；select-mobile 为接线-only 消费方（:151-152，经 input-choice:41/:350）；消息源方差留位点（`?? searchError` tree-controls:127/:313）；**两处显式裁定项**：(a) tree-controls id **未 cid 限定**（`${name}-source-error`，:130/:316；cid 在手 :139/:325）——cid 限定化属 id 字符串变更，需显式裁定为非行为变更或按位点参数化保持原串；(b) tree-controls 独有 loadingId 腿（`${name}-source-loading` :133/:319+loading span 分支）——吸收为第二成对 id 或排除归 follow-up，显式落字。惯用形参数面=`{name, cid, errorMessage} → {errorId, describedby, errormessage, spanProps}`（R2 实证：全副本保持"aria 属性存在 iff 成对 span 存在"不变量，可语义保持提取）。
- **useInputComponentHandle 样板**：form 包 live 21 调用块；`isInteractive/isVisible` 两行逐字 ×21；resetValue 三变体（onChange(undefined)/onChange('')/ref 初值恢复）；单选 checkbox 无 handle。
- **date 族**：date-field-control.tsx:60 `clamp`+:206 `clampToRange` ↔ date-range-renderer.tsx:48 `clamp`+:71 `clampDateToRange`（:66 注释自认 Mirrors）↔ input-time-renderer.tsx:93 `clampIntoWindow`；`date/date-utils.ts` 无命名冲突且已导出 `isWithinRange`（reviewer 实证）——收敛落位。
- **writeFieldValue（WA-fadv-002，draft review M3 修正）**：7 文件 20 处 `validateField` **全部**经 `shouldValidateOn` 门控（无门形不存在，台账「无门形」口径作废）；真实方差轴=①trigger 深度 change/blur（blur 位点 key-value-row :108-109/:117-118+:159-160/:168-169、array-editor:140-141）②门控目标与校验目标错位（key-value-row 门 name 校 keyPath）③owner form vs parentForm（combo/input-table）。原语参数面=`trigger('change'|'blur')+validatePath+owner`；`shouldValidateOn` 共享定义在 form 包 field-utils/field-validation.ts:37（台账 128 行行号漂移 ~4-8 行[m4]，以 live 为准）。
- **getFocusTarget 族**：form 包 21 位点两形——ref 直引型与 **querySelector 补偿型 ×6**（slider-thumb:29/verification-code input-otp:63/rating-star:30/color-picker button:31/region-trigger:59/org-select-trigger——reviewer 核对位点）；form-advanced tree-controls 两变体（:141/:327）+tree-option-list id 寻址+icon-picker roving（:176）；跨包邻接：data tree-focus-nav.ts:8（role 导航）×5 调用、layout wizard-renderer.tsx:148-155（APG 注释在案）、scheduling use-gantt-keyboard.ts:30-33（`data-task-id`）——非 ui 补偿形态。
- **ui 原语现状**：input/textarea/checkbox/slider 零 `forwardRef` 字样（React 19 函数组件；ref 支持面执行期实证）。
- **在途**：主工作树并行会话在途 14 文件，其中 flux-renderers-form 三件（**form.tsx / form-definition.ts / schemas.ts**，m3 勘误）全部禁触碰——本批计划位点均不落在该三件；提交严格限定本批路径。
- **授权链**：①flux-react 新增公共导出（注入类型+helper）=结构性，人工确认门=用户 goal 指令落字（见下）；②ui/src/index.ts 公共导出变更路径**不触发**（本计划不增 ui 导出；若执行中裁定需增，当场停手补门）；③其余均为包内非结构性。
- **人工确认门记录（契约 §7c）**：时间=2026-10-14；渠道=ZCode 会话 `/goal` 指令；引语=「执行workaround-code-smell-audit-roadmap.md直到彻底完成。每个工作项按照plan guide拟制计划完成。每个计划完成后自动提交一次」；可撤回=用户可随时以后续指令撤回（未撤回即持续有效）。本批 flux-react 公共导出新增在该授权下执行。
- **既有测试**：form/fadv 套件文件/用例数以执行首跑为准落字（Phase 1 基线项）；flux-react index.tsx:34-35 已有 field-frame 导出行（+2 导出模式成立）。

## Goals

- **G1a（WA-form-001/007 注入链收敛）**：flux-react 导出 `FieldFrameInjectedAria` 类型（**全注入面含 id/aria-required[m5]**，命名 draft review R2 复核）+`resolveFieldFrameErrorRefs` helper；矩阵 10 个 cast 位点（#1-#10）改 helper；#11 A 档改引共享类型（own-vs-injected 合并语义逐字保持，补齐 id/aria-required 两键）。
- **G1b（choice 族 source-error 链通道内去重）**：form 包内共享惯用形（`{name, cid, errorMessage} → {errorId, describedby, errormessage, spanProps}`，hook 或工厂，形态 R3 复核）吸收 **5 文件 6 份实例**（R2 M1 修正普查）+select-mobile 接线-only 消费随 radio/select 路径自动收敛；tree-controls cid 限定与 loadingId 腿两裁定项显式落字后执行；**语义保持零行为变更**（通道分离保持；跨通道统一归 follow-up）。
- **G2（WA-form-004）**：form 包内新 `useStandardFieldHandle`（或 options 工厂，形态 R2 裁定）吸收 21 位点 `isInteractive/isVisible` 逐字对+resetValue 缺省形；三变体与单选 checkbox 无 handle 现状保持。
- **G3（WA-form-006）**：date 族三对双实现收敛进 `date/` 共享模块；镜像注释删除。
- **G4（WA-fadv-002）**：form-advanced 包内 `writeFieldValue` 写原语（`trigger+validatePath+owner` 参数化，M3 修正面）吸收 7 文件 20 位点。
- **G5（WA-form-003/006 邻接）**：querySelector 补偿族 ×6 显式裁定收敛路径（R2 张力点：ui forwardRef vs 包内共享寻址 helper vs data-focus-target 契约）；tree-controls 两变体、跨包邻接位点显式去向（watch-only/successor，零静默）。
- 台账 WA-form-001/003/004/006+WA-fadv-002/006/007 七行 `found → fixed → verified`（closure 后）；roadmap CX-11 `todo → planned → done`。
- 相关包 filter 门禁+哨兵+隔离五门禁全绿；flux-react index 导出面 diff=仅新增两导出。

## Non-Goals

- FieldFrame 注入机制本体改造；**choice 族并入注入链/采 FieldFrame 校验门控**（通道载荷不同，B1 勘误禁改）；ui 原语全面 forwardRef 化（仅 G5 裁定范围）；form.tsx/form-definition.ts/schemas.ts（在途三件）任何触碰；WA-data-012/WA-layout-004/WA-scheduling 邻接位点行为改造（仅裁定去向）。

## Scope

### In Scope

- `packages/flux-react/src/`：field-frame.tsx（类型/helper 定义位）+index.tsx（+2 导出）
- `packages/flux-renderers-form/src/renderers/`：矩阵 #1-#11 位点文件、source-error 链位点（checkbox-group/button-group-select/input-choice）+form-advanced `tree-controls.tsx`（链位点）+date/ 共享模块、handle 样板 21 位点
- `packages/flux-renderers-form-advanced/src/`：upload-field + writeFieldValue 7 文件
- ledger/roadmap/dev log

### Out Of Scope

- 主工作树在途 14 文件（含 form 三件）；ui/src/index.ts；data/layout/scheduling 行为改造；choice 族跨通道统一。

## Failure Paths

不适用（纯内部收敛+语义保持；G1b 若执行中证实惯用形差异不可参数化吸收，按 Deferred 节裁定并回落为逐字保持+登记）。

## Test Strategy

档位：**必须自动化**。特征化先钉（矩阵 B/C/A 三档代表 aria 输出+own-vs-injected 合并优先序/source-error 链自洽性与六份实例同构面/handle focus 两类/date clamp 三形/writeFieldValue 门控+blur 深度+keyPath 错位+owner 两形）→收敛→套件同绿（本批**零申报行为变更**——B1 勘误后无修复项，判别=惯用形/原语变异恰红）；form/fadv filter 四门禁+哨兵（flux-react）+隔离五门禁（新文件 git add -N）。基线：form 122 文件/1096 用例+fadv 165 文件/1150 用例（2026-10-14 实测）。

## Execution Plan

### Phase 1 - 特征化钉住

Status: done（2026-10-14：26 钉全绿落盘——form `cx11-consumer-contract-pins.test.tsx` 17 钉+fadv 同名文件 9 钉；基线实测 form 122 文件/1096 用例、fadv 165 文件/1150 用例与计划一致，落钉后 123/1113+166/1159 全绿；执行期勘误=FieldFrame cloneElement 注入面实证为「注入 renderer 组件 props 顶层」而非 DOM 根元素——B/C 档 cast 读到的 injected 链在 FieldFrame harness 下=帧实例 id `${name}-${cid}-error` 单 token（本地 `${name}-error` 回退腿在该 harness 不可达），A 档 InputGroupFieldControl 的 element 级 injected 键结构性恒 undefined（注入落在 Comp 顶层），DOM 面以探针实测落钉）
Targets: flux-renderers-form/flux-renderers-form-advanced 测试

- Item Types: `Proof`

- [x] Proof：矩阵钉——B 档代表（textarea）aria-describedby/errormessage 输出+C 档代表（upload-field）+A 档（InputGroupFieldControl）own-vs-injected 合并优先序（own 优先逐键）。
- [x] Proof：source-error 链钉——渲染含 source error 时 aria-describedby/errormessage==`${instanceKey}-source-error` 且 `getElementById` 非空+span 文本==错误文案（六实例同构面，含 button-group-select 与 tree-controls 两实例）；无 error 时 aria 不出现。
- [x] Proof：handle 焦点行为钉——querySelector 补偿型 1 例（slider thumb）+ref 直引型 1 例（input）经 `focus()` 方法聚焦到位。
- [x] Proof：date 三形钉——clamp 基础形/clampToRange 形/clampIntoWindow 形边界（现有 date-utils.test 覆盖面核对+缺口补钉）。
- [x] Proof：writeFieldValue 钉——门控（shouldValidateOn false 不触发）/change+blur 双深度/keyPath 错位（门 name 校 keyPath）/owner 两形（form vs parentForm）。
- [x] Proof：基线计数落字——form/fadv 套件文件/用例数（执行首跑）+flux-react 导出面 diff 基线。

Exit Criteria:

- [x] 上述钉全绿落盘。

### Phase 2 - G1a 注入契约收敛

Status: done（2026-10-14：flux-react field-frame.tsx 新增 `FieldFrameInjectedAria` 全注入面类型（id+aria-required+labelledby/describedby/errormessage/invalid+onFocus/onBlur，内部 childProps 同型收编）+`resolveFieldFrameErrorRefs` helper；index.tsx diff=仅该两行各 +1 导出（git diff 核验）；#1-#10 十位点全改 helper（input-number/datetime/date-range/date/textarea/time/markdown/period/upload-field/input），`as unknown as`+aria 残留=0；#11 改引共享类型（InputGroupFieldControlProps=FieldFrameInjectedAria & {...}，FrameInjectedAriaProps 删除，显式解构保持 aria-required 有意不消费=零新合并腿）；矩阵钉 17+fadv 9 同绿；flux-react 哨兵 580/580 精确同数+typecheck/build/lint 绿）
Targets: flux-react/field-frame+index、矩阵 #1-#11 位点

- Item Types: `Fix | Proof`

- [x] Fix：flux-react 新增导出（全注入面类型+helper，field-frame.tsx 定义，index.tsx +2 行）。
- [x] Fix：#1-#10 cast 位点改 helper；#11 改引共享类型——**仅类型声明收编，零新合并腿**（R2 m2 勘误：#11 已声明并消费 id；唯 aria-required 未声明，补声明后 FieldFrame 注入的 aria-required 在 #11 保持**有意不消费**=现行为，因该组件显式解构无 rest 展开天然丢弃未声明键；若执行中裁定要消费 aria-required 则属申报行为变更须先停手落 Deferred）。

Exit Criteria:

- [x] renderers 目录 `grep -rn -A2 "as unknown as" | grep aria` = 0（R3 m-a 修正：-A2 上下文行覆盖 #7 多行 cast 键行；并对照 canonical 表逐行核销——后者为规范判据）；Phase 1 矩阵钉同绿；flux-react index diff=仅 +2 导出。

### Phase 3 - G1b source-error 链惯用形收敛

Status: done（2026-10-14：新件 `flux-renderers-form/src/renderers/source-error-refs.ts` 纯工厂 `resolveSourceErrorRefs({instanceKey, errorMessage}) → {errorId, describedby, errormessage, spanProps}`（R3 裁定=纯工厂/hook 禁用；类型模块内私有防 knip）；6 份实例全接入=checkbox-group/select/radio/button-group-select（form，instanceKey=cid 限定式）+input-tree/tree-select（fadv，instanceKey=name 原串保持）；select-mobile 接线经 errorId prop 自动收敛；cid 限定 id 派生式 4 处归零（3 文件 instanceKey 局部变量删除）+tree-controls 2 处 name-only 原串保持；判别=工厂后缀变异恰红（form 4 红+fadv 2 红）→sha1 恢复（89f93e9e 前后一致）；form 123/1113+fadv 166/1159 全绿+双包 typecheck/build/lint 绿）
Targets: checkbox-group/button-group-select/input-choice（radio+select）+form-advanced tree-controls（两实例）

- Item Types: `Decision | Fix | Proof`

- [x] Decision：tree-controls 两裁定项落字——(a) cid 限定化=按位点参数化保持原 id 串（语义保持优先）；(b) loadingId 腿吸收为第二成对 id 或排除归 follow-up。
- [x] Fix：共享惯用形件（`{name, cid, errorMessage} → {errorId, describedby, errormessage, spanProps}`，消息源留位点）+**6 份实例**接入；select-mobile 接线随 radio/select 路径收敛。
- [x] Proof：source-error 链钉同绿（语义保持，含 tree-controls id 串逐字保持钉）。

Exit Criteria:

- [x] 6 份手写惯用形归零（cid 限定 id 派生式收敛计数落字）；裁定项落 Deferred/台账；钉同绿。

### Phase 4 - G2 handle 样板收敛

Status: done（2026-10-14：新件 `flux-renderers-form/src/use-standard-field-handle.ts`——hook 形态（R3 允许两形，取 hook=位点同位替换最小 diff），`{interactive, visible}` 值参数缺省 isInteractive/isVisible+可覆盖（select 的 effectiveInteractive 走 interactive 值形、date-field-control 走 interactive/visible 值形，闭包新鲜度=底层 hook 每 commit 重存绑定，等价原内联箭头）；21 位点全接入（19 文件：17 单位点+input-choice-renderers ×3+signature 补漏后零残 `useInputComponentHandle` 引用），逐字对净删 42 行→42 行值参数替换；resetValue 三变体保持（①input-number ②textarea=Phase 1 钉 ③input=component-handles-input 既有钉）；判别=isVisible 缺省变异 `()=>false` 恰红 8 红（focus 钉×2+既有 handle 钉）→sha1 恢复（5ea47979 前后一致）；form 123/1113 全绿+typecheck/build/lint 绿；收口期 knip 收私=UseStandardFieldHandleOptions 接口 un-export（隔离 check 门 NEW dead-code 唯一命中，CX-8/9/10 同款；form typecheck+123/1113 复绿→五门禁终态 c 链复跑））
Targets: form 包 21 位点+新共享件

- Item Types: `Fix | Proof`

- [x] Fix：新 `useStandardFieldHandle`（形态 R2 裁定）+21 位点接入；isInteractive/isVisible 逐字对删除。
- [x] Proof：handle 焦点钉同绿；resetValue 三变体行为钉（Phase 1 未含则此处补钉先于改）。

Exit Criteria:

- [x] 21 位点 boilerplate 行净删计数落字；行为钉前后同绿。

### Phase 5 - G3 date 族收敛

Status: done（2026-10-14：`date/date-utils.ts` 新增共享三形=clamp（数字基础形）+clampToRange（undefined 透传+比较双分支统一形——实证 date-field-control 局部形的 isWithinRange 快速路径为纯快路径，含 NaN 输入全值域输出等价，双形合一）+clampIntoWindow（input-time 非对称形逐字，独立成函数防语义合流）；三文件改引=date-field-control（删局部 clamp+clampToRange，3 调用点带 min/max 参数化）/date-range-renderer（删局部 clamp+clampDateToRange+镜像注释，2 调用点改 clampToRange）/input-time-renderer（删局部 clampIntoWindow，1 调用点带参）；镜像注释零残留；判别=clampToRange 比较方向变异恰红 2 红（input-datetime min/max clamp 钉承载判别——17 钉内 clampToRange 仅走 within-window 路径为非判别面，执行期披露）→sha1 恢复（a01383d0 前后一致）；执行期披露=renderers 目录尚存 input-number-renderer 局部 clamp（序贯双侧+可选界形，与 date clamp 反界行为可证不等价，吸收=行为变更风险且零 date 族价值——按 G3 date 族范围解释退出判据，input-number 形注明不收敛）；form 123/1113 全绿+typecheck/build/lint 绿；**收口期拆分（2026-10-14 隔离 check 门逮出）**：date-utils.ts 达 737 行超 700 MUST-split 阈值[新增红]→按职责拆 `date/date-clamp.ts`（48 行承载 clamp/clampToRange/clampIntoWindow，自 date-utils 导入 isWithinRange）→date-utils 690 行+三渲染器改引 date-clamp→form typecheck/123/1113 全绿复验→五门禁终态复跑（首跑 check 红 cx11-gates-5-check.log 留证→终态 5b 全绿）——CX-3 拆分先例同款）
Targets: form 包 date/ 共享模块+三双实现文件

- Item Types: `Fix | Proof`

- [x] Fix：clamp/clampToRange/clampIntoWindow 收敛 date/ 共享模块；三文件改引；镜像注释删除。
- [x] Proof：date 三形钉同绿。

Exit Criteria:

- [x] renderers 目录 clamp 本地定义=0（date 族范围——input-number 局部 clamp 非等价不收敛已披露，closure m1 注记：G3 goal 限定 date 族，非隐藏缩水）；镜像注释零残留。

### Phase 6 - G4 写原语收敛

Status: done（2026-10-14：新件 `flux-renderers-form-advanced/src/write-field-value.ts` 写原语 `writeFieldValue(owner, gatePath, validatePath, trigger): boolean`（参数面=trigger+validatePath+owner 按 M3 面；gatePath 门与 validatePath 校验目标分离承载 keyPath 错位轴；返回 boolean 服务 tag-list 早退分支）；**26 位点**接入（9 文件）——执行期普查勘误：计划「7 文件 20 处」为 M3 普查时点计数（20=同名同名 validateField 子集口径），live HEAD 实测 shouldValidateOn 门控 validateField 组合块=26 处 9 文件（含 key-value-row ×4 keyPath 错位+array-editor ×7 itemPath/blur 变异轴位点，即计划方差轴①②③全量），按计划方差轴+退出判据「组合块归零」全量吸收；validateSubtree 门控块 ×8（combo 3/array-editor 2/input-table 3）+key-value 未门控 validateSubtree ×2 **不吸收**（方法轴不在 M3 参数面，未审定不扩面，落 Deferred 披露）；判别=门取反变异恰红 1 红（gating 钉）→sha1 恢复（108fbf49 前后一致）；fadv 166/1159 全绿+typecheck/build/lint 绿）
Targets: form-advanced 7 文件+新共享件

- Item Types: `Fix | Proof`

- [x] Fix：`writeFieldValue` 原语（trigger+validatePath+owner 参数化）+20 位点接入。
- [x] Proof：writeFieldValue 四钉同绿。

Exit Criteria:

- [x] 位点组合块归零计数落字；行为钉前后同绿。（组合块归零=门控 validateField 组合块 26/26 归零；validateSubtree 块按裁定排除并落字）

### Phase 7 - G5 补偿族裁定与邻接去向

Status: done（2026-10-14：G5 裁定=**包内共享寻址 helper**（R2 张力三选一，取最小风险零行为变更路径）——新件 `flux-renderers-form/src/renderers/focus-target.ts` `queryFocusTarget(root, selector)`（=原逐字形 `root?.querySelector<HTMLElement>(sel) ?? root`），form 包补偿型同构位点 ×6 全接入（slider-thumb/verification-code input-otp/rating-star/color-picker button/region-trigger/org-select-trigger）；ui forwardRef 与 data-focus-target 契约**均不采纳**（前者=跨包公共面+申报行为风险→successor 与 WA-ui-006 合流，后者=新 DOM 契约未审定）；判别=helper 置 null 变异恰红 1 红（slider focus 钉）→sha1 恢复（9ac7d6aa 前后一致）；form 123/1113 全绿+typecheck/lint 绿。**邻接去向（零静默）**：tree-controls 两变体（input-tree `?? rootRef.current`/tree-select `?? null` 回退形状不一+多选择器串）=watch-only→successor（需回退参数化第二形状，未审定不 improvisation）；icon-picker roving（:176 role=option 全查）与 tree-option-list id 寻址=非 `?? root` 形=watch-only→successor；跨包邻接 data tree-focus-nav.ts:8（role=treeitem 导航 ×5 调用）/layout wizard-renderer.tsx:165-169（APG 注释在案 ：154-158，行号较计划 148-155 漂移）/scheduling gantt/hooks/use-gantt-keyboard.ts:33（data-task-id 行导航）=**非 ui 补偿形态**（键盘导航原语，非 handle getFocusTarget 补偿）→watch-only/族外，无行为改造）
Targets: form 包 querySelector 位点+台账裁定行

- Item Types: `Decision | Fix | Proof`

- [x] Decision：补偿族收敛路径裁定（R2 张力点交付）并落地。
- [x] Decision：tree-controls 两变体+data/layout/scheduling 邻接位点去向落台账（零静默）。
- [x] Proof：焦点钉同绿。

Exit Criteria:

- [x] 台账裁定行落字；族内未收敛位点每条有显式去向。

### Phase 8 - 回写与收口

Status: done（2026-10-14：台账七行 verified[220=found 64+verified 156/未处置 0]；roadmap CX-11 done；dev log 10-14；隔离五门禁诚实轨迹[红→拆分→红→收私→终态全绿]；closure audit agent_6ba66e08 R1 approved 后据实回勾）
Targets: ledger、roadmap、dev log

- Item Types: `Proof | Decision`

- [x] Proof：台账七行 `found → fixed → verified`（closure 后）；roadmap CX-11 回写；dev log。
- [x] Proof：隔离五门禁；独立 closure audit。

Exit Criteria:

- [x] reconcile exit 0；closure audit approved。（closure audit agent_6ba66e08 approved 后据实回勾）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_63cdc537-0adb-4ba2-8fc8-fd4b5a88325d，review-only）
- Verdict: R1 `fail`（1B/2M/5m）→全修；R2 `fail`（1M/2m，R1 全项 verified addressed）→全修；R3 `pass`（0B/0M/2m 注记级 m-a/m-b 已并行折入）
- Rounds: 3
- Findings addressed: **R1-B1** choice 族「悬空 aria」否证→重定性双通道（执行会话补证 getSourceErrorMessage=source 加载错误通道，并入注入链将丢显示能力——R2 审查员亲证接受该方向 override）；**R1-M2** 矩阵 canonical 11 行表（B=7/C=3/A=1）；**R1-M3** writeFieldValue 无门形不存在（20/20 门控）→参数面 `trigger+validatePath+owner`；**R1-m1** :186-211+`${name}-control` 勘误；**R1-m2** select-mobile 同链子件；**R1-m3** 在途 form 三件全列禁触碰；**R1-m4** 台账行号漂移注记；**R1-m5** 共享类型全注入面；**R2-M1** G1b 普查修正=5 文件 6 份实例（补 button-group-select 第 5 份+tree-controls 两实例定性+cid 限定/loadingId 两裁定项）+Scope/Phase 3/钉面同步扩；**R2-m1** Phase 2 exit grep 改 `as unknown as|aria` 双段匹配（覆盖 #7 多行 cast）；**R2-m2** #11 勘误=仅缺 aria-required 声明+显式解构无 rest=类型收编零新合并腿（消费与否=申报变更须停手）；**R3-m-a** Phase 2 exit grep 改 `-A2` 上下文行匹配+逐行核销为规范判据；**R3-m-b** 矩阵 #11 键列勘误（缺 aria-required，id 已声明并消费）。**R3 审查员形态裁定（执行输入）**：G1b=纯工厂/纯 helper（不用 hook——惯用形无响应式状态，hook 徒增 React 约束；可附共享 span 组件）；G2=hook 或 options 工厂皆可，行为钉（focus+resetValue 三变体）为门。R2 verified-clean：8 phases 结构/钉面真实 id/零申报行为变更门禁姿态。

## Closure Gates

- [x] G1a/G1b/G2/G3/G4/G5 收敛/裁定落地
- [x] 行为保持判别（特征化同绿+变异恰红+filter 门禁+哨兵）
- [x] 台账/roadmap/dev log 齐
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（agent_6ba66e08 R1 approved，据实回勾）
- [x] `pnpm typecheck`（隔离 worktree cx11-verify，exit 0）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上）
- [x] `pnpm check`（同上——首跑 oversized 红[737]→拆分→knip 红[1]→收私→终态全链 exit 0；新文件 git add -N）

## Deferred But Adjudicated

- **G1b-(a) tree-controls id 串保持（2026-10-14，执行会话裁定）**：裁定=按位点参数化保持原 id 串逐字——`resolveSourceErrorRefs` 的 `instanceKey` 参数为位点自供（choice 族传 cid 限定式 `${name}-${cid}`，tree-controls 传 `${name}`），工厂不内置 cid 逻辑；理由=树 id 串为 host-visible 契约、cid 限定化属 id 字符串变更（计划 B1 已认非零风险），语义保持优先；钉=`cx11-consumer-contract-pins.test.tsx` `getElementById('tree-source-error')`/`'tsel-source-error'` 逐字断言。
- **G1b-(b) loadingId 腿（2026-10-14，执行会话裁定）**：裁定=**排除**、不吸收进共享工厂——`${name}-source-loading` 派生式与 loading span 分支原位保留于 tree-controls.tsx 两实例（R3 审定面 `{name,cid,errorMessage}→{errorId,describedby,errormessage,spanProps}` 无 loading 维度，吸收=未审定参数面扩张）；该腿非跨文件复制沉积（仅 tree-controls 一对，~4 行），去重价值低于面扩张风险；钉已落（loading span id 逐字断言）；跨通道统一/腿吸收归 Non-Blocking Follow-ups（successor 自行裁定）。
- **G4 位点普查漂移与 validateSubtree 排除（2026-10-14，执行会话裁定）**：live HEAD（12e081b4a）实测 shouldValidateOn 门控 **validateField** 组合块=26 处 9 文件（key-value 5/key-value-row 4/array-editor 7/combo 3/input-table 3/tag-list 1/transfer 1/picker 1/icon-picker 1），非计划字面「7 文件 20 处」（该口径=同名同名 validateField 子集，keyPath/itemPath 变异位点未计入，而计划方差轴①②③明确包含之）——按方差轴+退出判据「组合块归零」吸收 26/26。**validateSubtree 门控块 ×8 与 key-value 未门控 validateSubtree ×2 不吸收**：M3 参数面无方法（field/subtree）轴，扩面=未审定结构 improvisation 禁（约束#2），留 successor（与「validate 深度三派」ledger 原注记同向）；successor 若吸收需先审定 method 参数轴。

## Non-Blocking Follow-ups

- choice 族 source-error 通道与 FieldFrame 校验通道的跨通道统一（载荷语义设计项，非本批去重范围）。
- ui 原语全面 forwardRef 化（若 G5 裁定为包内 helper 方案，则 ui 侧根因修复留 successor——与 WA-ui-006 同根因方向合流）。
- WA-4 台账 117/128 行行号漂移勘误（closure 回写随台账行更新顺带注记）。

## Closure

Status Note: 2026-10-14 收口。六组收敛/裁定落地（G1a 注入链契约化/G1b source-error 通道内去重/G2 handle 样板/G3 date 族[含收口期拆分]/G4 写原语[普查修正落 Deferred]/G5 补偿族包内 helper 裁定）；零申报行为变更（B1 勘误后）；执行期披露三项（FieldFrame 注入面实证/G4 普查漂移/date-utils 超限拆分）+knip 收私一项全落字；实施=派驻 agent（68.9M tokens/322 工具调用），本会话执行编排/门禁/回写。

Closure Audit Evidence:

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_6ba66e08-7efe-40aa-9a67-adeb4d40573b，review-only）
- Rounds: 1
- Verdict: `approved`（0B/0M/3m 注记级：m1=Phase 5 退出判据 date 族限定注记[已随回勾落字]/m2=「6 份×5 文件」口径注记[第 5 文件为接线-only]/xm=在途 schemas.ts 路径层级注记）
- Findings addressed: 审计员 Phase 2-7 声称逐项对账（index +2 逐行/renderers 零 aria cast/26 位点逐文件数字对账/690+48 行数核对/邻接位点空 diff/保护文件零 CX-11 标识符/45 路径两树字节一致 10 点抽查）+亲手判别（source-error 后缀变异恰 4 红外科手术式→sha1 89f93e9e 逐字节恢复=与实施者记录一致）+门禁日志真实性核验（5-check 红 737/5b 红 knip/5c 终态绿）。

Follow-up:

- validateSubtree 门控块 ×10 吸收（需先审定 method 参数轴，successor）。
- choice 族 source-error 通道与 FieldFrame 校验通道跨通道统一（载荷语义设计项）。
- ui 原语 forwardRef 化 + tree-controls 双变体/icon-picker roving/tree-option-list id 寻址（与 WA-ui-006 合流，successor）。
