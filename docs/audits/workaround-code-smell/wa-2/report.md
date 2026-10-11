# WA-2 动作核心与运行时 临时方案与坏味道审计报告

> 批次: WA-2（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/562-workaround-audit-wa2-runtime-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-2 行，不手抄）

## 快照基准注记（本批特有）

主工作树存在并行会话对 flux-runtime 的未提交在途变更（`runtime-factory.ts`/`scope.ts`/`__tests__/runtime-dialogs-scope.dialog-state.test.ts` 等，`git status` 可见）。**本报告全部走读取证与扫描基于 HEAD 提交态 `e44bd6965` 的隔离 worktree（`/tmp/wa2-audit`）**；门禁（`check:audit-*`）在主树执行，输出已剔除并行在途文件路径。inventory 的 flux-runtime loc=18,420 为生成时主树计数（含在途漂移）；HEAD 基线实测 18,416（差 4 行，全部来自在途文件）。flux-action-core 主树与 HEAD 一致（2,087 行逐字吻合）。勘误（closure audit Minor-3，2026-10-11）：该审计 worktree 首版注记"审计后拆除"时实际仍注册在盘，已于收口时实际拆除并 `git worktree prune`。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。
> 声明口径：列出的模块 = 本批执行了 prompt §5 全量取证协议（字面扫描 → 模式扫描 → git 考古 →
> 重复块识别 → 抽读走读 → 误报排除）的对象。部分覆盖不得声明 audited（缩水走显式注记）。

| 模块 id          | 文件数 | 非测试行数    | 取证完成 | 备注                                                                                                                                                                                                                |
| ---------------- | ------ | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-action-core | 11     | 2087          | ✅       | 对象清单取自 inventory.modules[flux-action-core].files（11 项）；调度管线（action-core → action-execution → runners/built-in-actions/operation-control）全读 + 重复块程序化比对 + git 考古                          |
| flux-runtime     | 84     | 18416（HEAD） | ✅       | 对象清单取自 inventory.modules[flux-runtime].files（84 项）；**form-runtime\*.ts 文件族 21 平铺文件按 H 类全量取证（roadmap 必做项，专项小节见下）**；store/scope/字段运行时/动作管线/abort/factory 走读 + git 考古 |

合计 95 文件 / 20,503 行（HEAD 口径）。inventory 计数 2,087 + 18,420 = 20,507；差 4 行系 inventory 生成时点含主树并行在途漂移，本批以 HEAD 为准并已注记。

### form-runtime\*.ts 文件族 H 类取证专项小节（roadmap 明文必做项）

族范围：`form-runtime*.ts` 平铺 21 文件（form-runtime.ts / form-runtime-{array,array-ops,derived-state,field-ops,lifecycle,registration,state,status,submit,submit-flow,subtree,types,validation,validation-array-template,values}.ts / form-runtime-owner{,-external-errors,-field-states,-lifecycle,-validation-utils}.ts），合计 4,891 行。

- **方法**：token 归一化探针（12 行滑窗、字符串/数字/标识符归零、控制关键字保留、同文件去重叠、跨文件双通道，`_tmp/wa2-dup-probe.mjs` 用后已删）覆盖族内 21 文件 + 两包全范围 97 文件交叉对照；候选块逐对人工对照同构性（控制流/错误处理/边界条件逐一比对）。
- **族内坐实 4 组同根因重复**（详见逐条发现 WA-runtime-002/003 与汇总 §2）：
  1. FormStore summary 五计数器机制 3 份（form-store / form-store-owned / form-runtime-status），~110 行；
  2. FieldState 原位更新"移植/清除"骨架 6 份（owner / registration / array / validation / field-ops×2）；
  3. FieldState 五键条件合并 2 份（form-store.mergeFieldState ↔ field-ops.updateFieldStateInMap，逐字）；
  4. field-ops 文件内孪生对（clearRegisteredSubtreeFieldStates ↔ clearHiddenSubtreesFieldStates，20 行核心逐字）——计入第 2 组的其中两份。
- **族外关联组**：ScopeRef store 装配 2 份（form-runtime.ts ↔ page-runtime.ts）、component-handle 工厂骨架 4 份（含 form-component-handle 的 methods 数组字面量双写）。
- **总冗余**：族内约 260 行 + 族外关联约 80 行 ≈ **340 行**。
- **漂移证据**（同构块的维护成本已兑现的部分）：summary 的 owned 副本已缺失 `emptySummary()` helper（形态漂移）、status 版退化为全量重算语义（与增量版分叉）；FieldState graft 族三个 dirty 变体的键集处理已不一致（array 版先删 validating/errors，owner/registration 版不删）。
- **结构性裁定**：族内 H 类**坐实**，但"21 文件合并为 5-6 模块"属于结构性收敛，一律 **CX-n**（本批为该 CX 提供主证据组与提取目标清单）；族内未发现单点可测行为缺陷（所有同构块当前行为一致，风险在前瞻漂移面）。

### 取证执行记录（prompt §5 步骤逐条）

1. **字面扫描**：两包 `TODO|FIXME|HACK|WORKAROUND|XXX` = 0 命中；`临时|先这样|暂时|绕过|workaround|hotfix` = 0 命中（与 inventory baseline 一致）。
2. **模式扫描**（HEAD worktree 口径）：typeBypass 1 处（status-owner.ts:62，与 baseline 一致）；`setTimeout(` 7 处（action-core 2 + runtime 5，与 baseline 2+5 一致）；静默 catch、key 强刷、DOM 突袭、像素 nudge、测试环境分支（产品代码字面级）= 0；`dataPath` = 0 命中（wa-1 收敛结论在 runtime 侧同样成立，互通引用）。
3. **git 考古**：对全部 8 处 baseline 候选 + 全部 10 条立案发现执行 `git log -L`/`git log -S`/`git log --follow`，出生 commit 读数见各条目。1 处出生 commit 为症状性 message（`994bf58a6` "Catch null-member access errors in stopWhen evaluation and return false instead of error state"——只描述处理方式不描述根因，W1 弱化的强信号），即 WA-runtime-001 的出生点。
4. **重复块识别**：token 归一化探针覆盖两包 97 文件（12 行窗口），去头部噪声后 322 个候选块（其中跨文件 8 组），逐组人工定性：坐实 10 组（见汇总 §2 热区表），其余归入误报排除 §4。探针用后已删除。
5. **门禁交叉核对**：`check:audit-suspects` / `check:audit-async-failure-paths`（两包命中 catch 站点 20 处：action-core 5 + runtime 15，逐个打开定性，19 处误报排除、1 处升级立案即 WA-runtime-001 的 stopWhen 特判）；`check:audit-hardcoded-type-dispatch`（两包 0）；`check:audit-runtime-raw-schema-reads`（两包 0）。无 pre-existing 登记项需升级定性。
6. **范围结构走读**：全读文件——action-core 侧 `action-core.ts`（全文）、`operation-control.ts`（withTimeout/withRetry 全文）、`action-runners.ts`（全文）、`built-in-actions.ts`（全文）、`action-parsing.ts`（全文）、`program-utils.ts`（全文）、`action-execution.ts`（85-580 主体段）；runtime 侧 `scope.ts`（全文）、`runtime-factory.ts`（全文）、`abort-signal-helpers.ts`（全文）、`status-owner.ts`（全文）、`form-store.ts`（1-260 + 全文结构）、`form-store-owned.ts`（全文）、`form-runtime-lifecycle.ts`（全文）、`page-runtime.ts`（全文）、`component-handle` 四件套（全文）、`form-runtime-registration.ts`（全文）、`form-runtime-owner.ts`（60-134/160-599 主体段）、`form-runtime-validation.ts`（95-170 段）、`form-runtime-field-ops.ts`（1-60/210-400 段）、`form-runtime-array.ts`（140-230 段）、`form-runtime-array-ops.ts`（100-200 段）、`form-runtime-submit-flow.ts`（245-300/320-420/445-480 段）、`form-runtime-status.ts`、`form-runtime-derived-state.ts`、`async-data/reaction-runtime.ts`（30-110/360-420/470-520 段）、`async-data/source-registry.ts`（70-150/325-370 段）、`async-data/api-data-source-controller{,-state,-runtime}.ts` 关键段、`blob-download.ts`、`action-adapter.ts` ajax 分支段、`runtime-action-helpers.ts` 结构段、`form-component-handle.ts`（全文）。grep 抓不到的信号（流程式复制、被注释分支、顺序耦合、静默兜底、无出口兼容层）按此走读取证。
7. **已收敛模式 live 复核**（roadmap 基线节三档）：
   - live 可证档 `AbortController`：`abort-signal-helpers.ts` 的 `composeAbortSignals` 在位（native `AbortSignal.any` 快路径 + 手写回退 + AbortSignalLike 桥接，注释在案），消费者 renderer-reaction-handle / flux-runtime action-execution。**未复发**的是"多信号合并"维度的 runtime 侧；但 flux-action-core 侧存在一份平行实现（`mergeAbortSignals`，见 WA-action-core-002——层级约束导致的平行收敛，非复发）。
   - 历史教训档 strip errors 合一：**收敛在位未复发**——`form-runtime-owner-external-errors.ts` 是唯一实现（`rebuildStoreErrorsFromExternal` + `overlayFieldErrorsWithExternal`），validation/values/owner/form-runtime 五处全部委托共享函数，零手写副本。
   - 历史教训档 ajax 两份合一：**收敛在位未复发**——`action-adapter.ts` case 'ajax' → `executeRuntimeAjaxAction`（runtime-action-helpers.ts）→ `executeApiSchema`/`executeApiRequest`（request-runtime.ts 单管线），双入口单实现。
   - `name` vs `dataPath` 双词汇：两包 `dataPath` 零命中，直接引用 wa-1 结论。
8. **误报排除复核**：汇总前逐条对照 §2 误报排除与 W1–W6，28 项排除记录见 §4。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记 `docs/audits/workaround-code-smell/ledger.md`
> （ID `WA-<pkg短名>-<seq>`），本节与台账一一对应，零静默。
> 本报告为审计产出；批内修复由执行会话按 roadmap 契约 §2–§4 实施（见《批内修复记录》节）。

### [类别H+A] `isUnpopulatedScopeError` 错误消息字符串嗅探谓词 3 份（含 stopWhen 症状特判）

- **位置**: 3 份同构谓词——`packages/flux-runtime/src/node-runtime.ts:92-98`（命名谓词，消费者 :115、:316）；`packages/flux-runtime/src/async-data/formula-data-source-controller.ts:61-68`（逐字副本，消费者 :213）；`packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:139-152`（内联副本 + NODE_ENV 门控 warn）。被嗅探的消息源：`packages/flux-formula/src/evaluator.ts:57-59`（`createExpressionError` 返回裸 `new Error(message)`，无判别字段）、`:362`（抛出点）
- **严重度**: P1（≥3 份同根因 + 症状特判字面量无语义解释）
- **现状**: 表达式求值对 null/undefined 的成员访问抛裸 Error，runtime 三个消费点（节点 props 容错、公式数据源容错、数据源 stopWhen 门）需要区分"scope 未发布/未就绪"与真实错误，各自用 `error.cause.message === 'Cannot access member of null or undefined'` 字符串比对识别。
- **按住的根因**: flux-formula 错误通道没有机器可读判别码（错误类/`code`/导出哨兵常量均无），"scope 未发布"这一**时序状态**在表达式层只能以异常形态冒泡，runtime 被迫按消息文本反推语义。上游位置：flux-formula evaluator 错误构造（evaluator.ts:57）+ 求值层无"未就绪"信号通道。
- **违约基准**: W3（判别语义变更需 3 处同步修）、W6（比对字面量是引擎实现细节——evaluator 的错误文案——而非领域常量或导出契约，文案一改三处静默失明）、W2（stopWhen 内联副本无任何出口登记；e0fcebbf3 建立命名谓词时选择复制而非共享，无收敛登记）。
- **为什么是临时方案**: 三要素——症状消失（未发布 scope 不再炸出错误状态，公式数据源安静等待重发布）；根因仍在（错误通道无判别码，"未就绪"仍是异常；换条消息文案或改 cause 包装层次即回归）；出口缺失（994bf58a6 出生时零登记；e0fcebbf3 收敛了 node-runtime 的用法但把谓词复制进 formula-data-source-controller 而未共享，stopWhen 内联第三份原样留存）。
- **风险**: 跨包字符串契约（flux-formula 文案 ↔ flux-runtime 行为）无类型保护；漂移已现形态——内联版长出了 NODE_ENV 门控 warn 分支而命名版没有；未来若给表达式加 optional-chain 之外的 null 容错语义，三处需人肉同步。
- **重构方向**: flux-formula 为表达式错误引入判别（`Error` 子类或 `code` 字段或至少导出共享消息常量到 flux-core），flux-runtime 三处收敛为单一共享谓词（放 flux-core 或 flux-runtime 单文件）。回归测试：先写"三消费点对同一错误形态行为一致"的特征化测试，再改判别通道（改通道涉公共契约 → CX-n）。
- **重复组**（仅 H 类）: 3 份；位置见上；冗余约 30 行（含内联分支）；漂移证据：内联版独有 NODE_ENV warn 分支，命名版无。
- **ROI 裁定**: CX-n 拟制（flux-formula 错误通道是包间契约，判别码新增属公共面变更，执行前需契约评审；与 CX-1 同窗口可并行）。
- **误报排除复核**: 不是动态边界收窄（比对的是消息文本而非形状）；不是合理防御——防御的降级路径（容错等待）本身正确，但识别手段（字符串嗅探）是把引擎实现细节当契约按住；git 出生 message 为症状性（"Catch null-member access errors ... return false"），W1 根因描述缺失的强信号成立。

### [类别H] FormStore summary 五计数器机制 3 份

- **位置**: 3 份——`packages/flux-runtime/src/form-store.ts:14-24`（interface+type 声明）与 `:37-105`（`countFieldStateErrors`/`getFieldStateCounterFlags`/`diffSummaryCounters`/`addSummaryDelta`/`computeSummaryFromFieldStates` 增量机制）；`packages/flux-runtime/src/form-store-owned.ts:12-22` 与 `:27-85`（出生即逐字复制）；`packages/flux-runtime/src/form-runtime-status.ts:10-18`（第三次 interface 声明 `FormStoreStateWithSummary`）与 `:20-48`（手写全量重算 `summarizeFieldStates` fallback）
- **严重度**: P1（≥3 份同根因）
- **现状**: errorCount/dirtyCount/touchedCount/visitedCount/validatingCount 五计数器的"per-field diff → summary 累加"机制在 form-store 与 form-store-owned 逐字重复（~77 行），form-runtime-status 又独立手写了第三份实现（重算语义）并第三次声明了 summary 形状。
- **按住的根因**: `createOwnedFormStore`（owner 隔离投影 store）需要在投影视图上维护同一套 summary 计数，但 form-store.ts 未导出其 summary 原语，2026-05-15（`ef50cb72a`，owner-isolate 提交）选择整段复制；status 侧（`164ad132a` 同日引入增量 summary）需要"store 不带 summary 时"的兜底，又手写一份重算。机制无单一事实来源。
- **违约基准**: W3（五计数器语义/新增 FieldState 键的计数口径变更需 3 处同步修）、W2（无收敛登记）。
- **为什么是临时方案**: 症状消失（三处各自计数正确）；根因仍在（计数原语未导出、无共享实现，同类机制换个消费点就再抄一份——status 版即为实例）；出口缺失（无登记）。
- **风险**: 漂移已部分兑现：owned 版已缺失 `emptySummary()` helper（内联字面量，形态漂移）；status 版是全量重算而 store 版是增量 diff——语义当前等价，但"增量一致性"若有 bug（如 diff 漏计），status 的重算版反而正确，两套实现会掩盖此类缺陷的发现。同包内提取零依赖障碍（form-store-owned 可直接相对导入 form-store）。
- **重构方向**: form-store.ts 导出 `FormStoreSummaryState`/`computeSummaryFromFieldStates`/`emptySummary`（包内模块导出，不进包公共 API 面），form-store-owned 删除其 77 行副本改为导入，form-runtime-status 的 `summarizeFieldStates` 改为薄委托。回归测试：现有 form-store 套件 + owned-store 投影视图 summary 断言 + status 汇总断言（行为保持）。
- **重复组**（仅 H 类）: 3 份；位置见上；冗余约 110 行；漂移证据：owned 版 emptySummary 缺失、status 版全量重算 vs 增量 diff 分叉。
- **ROI 裁定**: CX-n 拟制（跨 3 文件提取 + 测试面，属 form-runtime 族复制沉积收敛批的主证据组之一；同包行为保持，但超出 15 分钟低成本窗口）。
- **误报排除复核**: 非"两份独立演化的巧合相似"——owned 版与 store 版逐字同构且出生同日可追溯复制路径；status 版形状同构（同五键同口径）非概念级重复。

### [类别H] FieldState 原位更新语义 8 份（graft/clear 骨架 6 份 + 五键条件合并 2 份）

- **位置**: graft/clear 骨架（"spread 既有 FieldState → 键级 set/delete → 空对象回收 → 从 map keep-or-delete → batchUpdate"）6 份——`form-runtime-owner.ts:94-118`（revalidateDependents，dirty 变体）、`form-runtime-registration.ts:48-74`（syncRegisteredFieldValue，dirty 变体）、`form-runtime-array.ts:177-201`（replaceManagedArrayValue，dirty+清除变体）、`form-runtime-validation.ts:113-145`（commitPathValidationState，errors/validating 变体）、`form-runtime-field-ops.ts:248-286`（clearRegisteredSubtreeFieldStates）与 `:339-381`（clearHiddenSubtreesFieldStates，与前者 20 行核心逐字）。五键条件合并（touched/dirty/visited/validating/errors 的 true=set/falsy=delete）2 份——`form-store.ts:161-193`（mergeFieldState）↔ `form-runtime-field-ops.ts:16-62`（updateFieldStateInMap，逐字同构）
- **严重度**: P1（≥3 份同根因；变体键集已分叉）
- **现状**: "对一个 path 的 FieldState 做键级修补、空态回收、map 原位替换"这一语义在 form-runtime 族内手写了 6 份骨架 + 2 份五键合并谓词，共 8 份、约 150 行冗余。
- **按住的根因**: `FieldState` 的键级真值语义（true=置位、falsy=删除、空对象=整个条目回收）没有共享原语。`87d5587ce`（2026-04-16，fieldStates map 迁移）在 form-store 落了 mergeFieldState 后，form-runtime 侧的六个写入点各自手写了自己的变体而不是复用/参数化；field-ops 的两份 clear 函数更是同文件内第二次复制（hidden-subtree 版从 registered-subtree 版复制后加 root 匹配与 hiddenFieldPolicy 分支）。
- **违约基准**: W3（键语义或回收规则变更需 8 处同步修）、W2（无收敛登记）。
- **为什么是临时方案**: 症状消失（8 处行为当前一致）；根因仍在（语义无单一来源，第 7 个写入点出现时最省事的路仍是再抄一份——field-ops 内部孪生对证明该路径已被走过）；出口缺失（无登记）。
- **风险**: 漂移面已兑现——三个 dirty 变体键集处理已不一致（array 版先删 validating/errors 再置 dirty，owner/registration 版不删，语义各有其理但结构上是复制的自然产物）；未来给 FieldState 增键（如 disabledAt）或改空态回收规则时，8 处同步是高概率漏改点，而漏改的表现是微妙的字段状态残留（正是本机制要防的）。
- **重构方向**: 单一原语 `patchFieldStateInMap(fieldStates, path, patch: Partial<FieldState> & {clear?: keys[]})`（吸收 mergeFieldState 的五键条件语义 + graft 的 dirty 变体 + clear 的键删除变体，统一空态回收），8 份收敛；`clearRegisteredSubtreeFieldStates`/`clearHiddenSubtreesFieldStates` 的差异保留在各自的匹配谓词层。回归测试：先为"五键语义 + 空态回收"写特征化矩阵（每键 set/clear/不清空、空态删除条目、非空保留），8 份共享后同套钉住。
- **重复组**（仅 H 类）: 8 份；位置见上；冗余约 150 行；漂移证据：dirty 变体键集分叉（array vs owner/registration）；field-ops 孪生对逐字（20 行）。
- **ROI 裁定**: CX-n 拟制（form-runtime 族结构性收敛的核心证据组；单点行为缺陷不成立——当前 8 处行为一致，故不走批内红绿修，走 CX 提取批）。
- **误报排除复核**: 非遍历惯用形——逐份对照控制流（spread/delete/empty-check/keep-or-delete/batchUpdate 五段结构逐一同构）；非各自独立演化（registration/array 版与 owner 版的 IIFE 空回收写法逐字相同，可追溯同源）。

### [类别H] ScopeRef store 装配骨架 2 份（form-runtime ↔ page-runtime）

- **位置**: `packages/flux-runtime/src/form-runtime.ts:131-206`（setLastChange revision 包装 + createScopeRef store adapter：getSnapshot/getLastChange/setSnapshot/subscribe/update 五件套）与 `packages/flux-runtime/src/page-runtime.ts:24-87`（同构骨架，data 版）
- **严重度**: P2（双份大块、form-runtime 侧活跃修改期）
- **现状**: "把一个 values/data store 包装成 ScopeRef 的 store adapter"的 ~50 行骨架（revision 递增的 setLastChange、setSnapshot 的 change 归一、subscribe 的快照比对去重、update 的 Object.is 短路）写了两份，page-runtime 是 form-runtime 版的简化复制。
- **按住的根因**: "store → ScopeRef" 装配无共享工厂；`e9fad5eb0`（2026-03-19，modularize 时期）拆出 page-runtime 时复制了 form-runtime 的装配段。
- **违约基准**: W3（装配语义修 bug 需两处同步——form 版的 Plan 552 fieldStates 门控修复就是单侧落地的实例）、W2（无收敛登记）。
- **为什么是临时方案**: 症状消失（两个 runtime 各自正确）；根因仍在（装配机制两份人肉同步）；出口缺失（无登记）。
- **风险**: 漂移已现——form 版 subscribe 有 Plan 552 的 fieldStates 门控与双段通知逻辑，page 版只有 values 比对；该分叉当前是需求差异（page 无 fieldStates），但任何"订阅去重/通知顺序"级别的 bug 修复天然只落活跃的 form 侧。
- **重构方向**: 提取 `createStoreBackedScopeAdapter({ id, path, getSnapshot, setSnapshot, subscribe, sourceScopeId, gate? })` 共享工厂（runtime 包内部模块），form/page 各传自己的门控谓词。回归测试：page-scope 与 form-scope 的变更通知特征化（setSnapshot 路径归一、subscribe 去重、update 短路）先钉后改。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 50 行；漂移证据：Plan 552 门控单侧落地。
- **ROI 裁定**: 排期进 plan（CX-n；涉及两个 runtime 核心文件的装配路径，test-first 先行）。
- **误报排除复核**: 非接口多态合理双实现——两份职责相同（同一契约 ScopeStore 的适配），仅数据域不同。

### [类别H] 全局 cascade 深度守卫骨架 2 份（reaction-runtime ↔ source-registry）

- **位置**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:18`（`MAX_GLOBAL_CASCADE_DEPTH = 200`）与 `:52-77`（ReactionCascadeState + tryEnterGlobalCascade + leaveGlobalCascade + 两个 test hooks）；`packages/flux-runtime/src/async-data/source-registry.ts:15`（`MAX_SOURCE_CASCADE_DEPTH = 100`）与 `:42-46,111-130`（同构五件套）
- **严重度**: P2（双份、source-registry 侧 2026-10-06 仍活跃修改）
- **现状**: "全局级联深度计数守卫"（state + tryEnter 上限拒绝 + leave 回退 + get/set 测试钩子）在两个 registry 各手写一份，五件套骨架逐字同构，仅名称与上限常量不同（200 vs 100）。
- **按住的根因**: 反应与数据源是两个独立 registry，但"全局重入门控"是同一基础设施；`7353e3a39`（2026-05-06）为 source-registry 加守卫时复制了 reaction 侧骨架（reaction 侧更早）。
- **违约基准**: W3（守卫语义修 bug——如 leave 的 `Math.max(0,...)` 防负、tryEnter 的原子性——需两处同步）、W2（无收敛登记；200/100 的常量分叉是调参还是复制走样不可考）。
- **为什么是临时方案**: 症状消失（两个 registry 都有守卫）；根因仍在（门控原语无单一实现）；出口缺失（无登记）。
- **风险**: 低但真实——深度上限常量的语义差异（reaction 200 / source 100）无注释解释，后续调参者会困惑哪个是基准；守卫 bug 修复单侧落地会造成难查的"一边保护一边裸奔"。
- **重构方向**: 提取 `createCascadeGuard(maxDepth)` 工厂（async-data 内部共享模块），两 registry 各传常量并注释常量依据。回归测试：现有 cascade 契约测试 + 新增"guard 工厂达到上限拒绝/leave 回退/test hook 读数"三用例。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 40 行；漂移证据：上限常量 200 vs 100（来源不可考）。
- **ROI 裁定**: 排期进 plan（CX-n 或随 async-data 下次触碰顺带；提取约 30 分钟、行为保持）。
- **误报排除复核**: 不是"两个资源各自独立演化的巧合相似"——五件套函数体逐字（仅标识符不同）；MAX_CASCADE_DEPTH（reaction-runtime-helpers.ts:19，per-reaction 深度）是另一维度机制，不计入本组。

### [类别H] component-handle 工厂骨架 4 份（含 form 版 methods 数组字面量双写）

- **位置**: `composite-field-handle.ts:34-48`、`input-component-handle.ts:33-47`、`surface-component-handle.ts:22-35`、`form-component-handle.ts:15-29` 四个工厂共享"`{id,name,type}` 透传 + capabilities.hasMethod（methods.includes）+ listMethods（返回 methods）+ switch/default 错误分支"骨架；另 `form-component-handle.ts:23-29` 同一 methods 数组字面量在同一文件内出现两次
- **严重度**: P3（≥3 份但每份 ~10 行、表状工厂惯用形——按 §3"不提取是合法裁定"精神与 wa-1 builtins ARRAY\* 降档先例降档，降档显式记录）
- **现状**: 四个 ComponentHandle 工厂重复同一脚手架；form 版还在 hasMethod/listMethods 各写一遍同一数组字面量（新增方法需同步两处 + switch，W3 微违约）。
- **按住的根因**: ComponentHandle 工厂脚手架无共享构造器；`4252eea59`（2026-06-22，composite editor handles factory plan）建立模式后按件复制。
- **违约基准**: W3（弱——脚手架变更 4 处同步；form 版字面量双写是同文件内的最小实例）。
- **为什么是临时方案**: 不满足三要素的严重形态——风格债与惯用形，立案为观察项保持台账零静默。
- **风险**: 低；新增 handle 类型时继续复制会缓增。
- **重构方向**: 可选提取 `createMethodDispatchHandle({ id, name, type, methods, invoke })`（hasMethod 从 listMethods 派生，form 版双写即消）；非必须。回归测试：现有 handle 套件。
- **重复组**（仅 H 类）: 4 份；位置见上；冗余约 30 行；漂移证据：无语义分叉（surface 版无 name 字段是契约差异）。
- **ROI 裁定**: 挂账观察（watch-only）。
- **误报排除复核**: 各 handle 的 switch 主体语义不同，立案对象仅为脚手架与字面量双写，不是概念级"handle 都长像"。

### [类别H] built-in-actions switch 同构 case 群（close×3 + confirm/alert×2 + download/copy×2）

- **位置**: `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:149-162`（closeDrawer）↔ `:218-231`（closeDialog）↔ `:232-245`（closeSurface）——三份**逐字相同**（均归一为 closeSurface invocation，surfaceId/dialogId 三元完全一致）；`:174-195`（confirm）↔ `:196-217`（alert）——两份逐字相同（message/title 提取 ~22 行）；`:311-327`（download）↔ `:328-344`（copy）——两份逐字相同（payload 校验 + invocation 装配 ~17 行）
- **严重度**: P3（close 组 ≥3 份同根因按协议 P1 起评；降档理由：七份全部逐字零漂移、行为保持的收敛是 case fallthrough/共享 helper 一类的纯表达改动、单文件 dispatch 表稳定——降档显式记录不静默）
- **现状**: 21 个 case 中 7 个属于三组逐字复制组；每个 case 还各自重复 invocation 公共字段装配（targeting/actionNode/signal/break）。
- **按住的根因**: 内建动作的 invocation 装配无按形态分组的辅助（payload-required / surface-close / message-title 三形态）；case 逐个手写时复制了相邻 case。
- **违约基准**: W3（surfaceId/dialogId 归一逻辑修 bug 需 3 处同步；close 三份逐字等价恰恰说明 fallthrough 才是正确表达——复制 obscures 了等价性）。
- **为什么是临时方案**: 症状消失；根因仍在（等价 case 未表达为等价）；出口缺失（无登记）。
- **风险**: 低——下一组新 case 大概率继续复制装配样板（缓增）；surface 归一逻辑若加新 targeting 字段需改 3 处。
- **重构方向**: close 三 case 合并为 fallthrough（`case 'closeDrawer': case 'closeDialog': case 'closeSurface':`）；confirm/alert 与 download/copy 各提取 ~5 行装配 helper 或同法 fallthrough+局部变量。回归测试：现有 built-in action 套件（逐字行为保持，typecheck 抓残余）。
- **重复组**（仅 H 类）: 3 组 7 份；位置见上；冗余约 70 行；漂移证据：无（逐字）。
- **ROI 裁定**: 批内修候选（close fallthrough ~5 分钟；全组 ~30 分钟，行为保持）——由执行会话决定是否随批实施。
- **误报排除复核**: 不是声明式定义表（wa-1 排除的 constants.ts fieldRules 是数据；本处是可执行代码路径）；21-case dispatch 本身是 orchestrator 惯用形，不立案。

### [类别H] abort 信号合并双实现跨包（action-core mergeAbortSignals ↔ runtime composeAbortSignals）

- **位置**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:92-137`（私有 `mergeAbortSignals`：手写监听两信号 + cleanup 卸载，无 native 快路径）与 `packages/flux-runtime/src/abort-signal-helpers.ts:18-54`（`composeAbortSignals`：n 信号 + `AbortSignal.any` 快路径 + 手写回退）
- **严重度**: P2（双份大块、action-execution 侧 2026-10-04 活跃修改）
- **现状**: "把多个 abort 信号合成一个"同一机制两份手写。契约有真实差异：merge 版返回 cleanup（detach 不 abort，per-dispatch 收尾需要）；compose 版支持 n 信号与 AbortSignalLike 桥接、有 native 快路径。
- **按住的根因**: 共享原语没有落在层级公共点上——`composeAbortSignals` 住在 flux-runtime，而 flux-action-core 在层级上位于 flux-runtime 之下（flux-core → … → flux-action-core → flux-runtime）不可反向导入，于是 `e68fe452f`（2026-05-15，dispatcher dispose abort）在 action-core 手写了第二份。
- **违约基准**: W3（合并语义修 bug 两处同步；native 快路径只有 runtime 版享受——action-core 版在 Node20 走手写监听路径，功能等价但实现债双份）、W2（无收敛登记）。
- **为什么是临时方案**: 症状消失（两包各自取消语义正确）；根因仍在（原语家不在公共层，第二份的存在是层级结构的直接产物）；出口缺失（无登记）。
- **风险**: `AbortSignal.any` 兼容性回退、`signal.reason` 透传、监听清理等细节今后修任何一处都要人肉检查另一处；action-core 是被 8 个 renderer 包依赖的底层，语义偏差影响面大。
- **重构方向**: 把组合原语下沉到 flux-core（如 `utils/abort.ts`：`composeAbortSignals(signals): { signal, cleanup }` 超集 API 同时满足两用例），两包各自薄封装。回归测试：合并/单信号/零信号/已中止入参/cleanup 不触发 abort 五用例，两包消费点同套钉住。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 40 行；漂移证据：native 快路径单侧存在；cleanup 契约单侧存在（提取时的超集约束，非 bug）。
- **ROI 裁定**: CX-n 拟制（flux-core 新增公共工具 = 包边界/公共面变更，执行前需人工确认；与 CX-1 同窗口可并行）。
- **误报排除复核**: 不是"cleanup 差异说明两机制不同不该合"——cleanup 是超集 API 的一等参数，契约差异是提取约束而非排除理由；单信号 `addEventListener('abort', ..., {once:true})` 的 7 处直订（validation/submit-flow/operation-control/request-runtime 等）是"订阅一个信号"非"合并多信号"，不属本组。

### [类别H] runNamespacedAction ↔ runNamedAction 尾块双份

- **位置**: `packages/flux-action-core/src/action-dispatcher/action-runners.ts:116-145`（runNamespacedAction 尾块：evaluateActionArgs → NamespacedActionInvocation → try attachResultMetadata(normalizeActionResult(await invokeNamespacedAction)) catch attachThrownMetadata）与 `:163-189`（runNamedAction 同构尾块，仅 namespace/providerKind 默认值不同）
- **严重度**: P3（双份 ~20 行、同文件、2026-08-08 后稳定）
- **现状**: runNamedAction（`3d63d983d`，2026-04-28）添加时复制了 runNamespacedAction 的 invoke+metadata+try/catch 尾块。
- **按住的根因**: "调用 namespaced adapter 并附加元数据"的尾流程无共享 helper。
- **违约基准**: W3（弱——metadata 字段装配或错误包装变更两处同步）。
- **为什么是临时方案**: 不满足三要素严重形态——观察项。
- **风险**: 低；providerKind 默认值差异（'host' vs 'import'）是语义性的，但共享化时需保留为参数。
- **重构方向**: 提取 `invokeResolvedNamespaced(invocation, metadata)` 尾 helper。回归测试：现有 action dispatch 套件。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 18 行；漂移证据：无。
- **ROI 裁定**: 挂账观察（watch-only）。
- **误报排除复核**: 两函数的解析入口不同（parse vs resolve 合成名），立案对象仅为尾块；非接口多态。

### [类别H] array-ops executeArrayMutation 装配 ×7

- **位置**: `packages/flux-runtime/src/form-runtime-array-ops.ts:28,44,68,91,131,174,201`（append/prepend/insert/remove/move/swap/replace 七个 op 各自重复 ~10 行 executeArrayMutation 上下文装配：sharedState/scope/formId/setLastChange/getArrayValue/cancelValidationDebounce/revalidateDependent s/reportDependentRevalidationFailure 八字段逐一转发，仅 arrayPath/arrayOperation/indexTransform 不同）
- **严重度**: P3（7 份但为同文件表状注册惯用形——wa-1 builtins ARRAY\* ×6 降档先例直接适用；降档显式记录）
- **现状**: 新增一个数组操作需复制 10 行装配样板。
- **按住的根因**: ArrayMutationContext → executeArrayMutation 入参的部分应用无工厂；`58a93b026`（2026-04-14，oversized 治理拆分）定形时按件复制。
- **违约基准**: W3（弱）。
- **为什么是临时方案**: 风格债非按住问题；观察项保持零静默。
- **风险**: 极低；新增同类 op 时缓增。
- **重构方向**: 可选 `const withArrayCtx = (ctx, path) => ({ ...八个字段, arrayPath: path })`；非必须。回归测试：现有 array ops 套件。
- **重复组**（仅 H 类）: 7 份；同文件；冗余约 60 行；漂移证据：无。
- **ROI 裁定**: 挂账观察（watch-only）。
- **误报排除复核**: 表状惯用形与"跨模块各自手写基础设施"不同，风险等级不支撑 P1。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID            | 位置                                                                                                          | 出生时间（git 考古）                                                            | 风险                                               | 处置                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------- |
| WA-runtime-001     | node-runtime.ts:92-98 / formula-data-source-controller.ts:61-68 / api-data-source-controller-state.ts:139-152 | `994bf58a6`（2026-05-08，症状性 message）→ `e0fcebbf3`（2026-09-06 复制第二份） | 跨包字符串契约，文案一改三处静默失明               | CX-n                   |
| WA-runtime-003     | FieldState 更新语义 8 份（form-runtime 族 6 + form-store 1 + field-ops 1）                                    | `87d5587ce`（2026-04-16）迁移定形；field-ops 孪生对为同文件二次复制             | 键语义/回收规则变更 8 处同步；dirty 变体键集已分叉 | CX-n                   |
| WA-runtime-002     | summary 计数器 3 份                                                                                           | `164ad132a`/`ef50cb72a`（同为 2026-05-15，当日复制）                            | 计数口径变更 3 处同步；双实现会掩盖增量 bug        | CX-n                   |
| WA-action-core-002 | action-execution.ts:92-137 ↔ abort-signal-helpers.ts:18-54                                                    | `e68fe452f`（2026-05-15，层级约束下手写第二份）                                 | abort 语义修 bug 两处同步；native 快路径单侧       | CX-n（下沉 flux-core） |
| WA-runtime-004     | form-runtime.ts:131-206 ↔ page-runtime.ts:24-87                                                               | `e9fad5eb0`（2026-03-19，modularize 复制）                                      | Plan 552 级修复单侧落地的先例已发生                | CX-n                   |
| WA-runtime-005     | cascade 守卫 2 份                                                                                             | reaction 侧更早；source 侧 `7353e3a39`（2026-05-06）                            | 守卫 bug 单侧落地；200/100 常量依据不可考          | CX-n                   |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 各份位置                                                                                                      | 冗余行数 | 漂移证据                                          | 裁定（三问句）                                                             |
| --- | ---- | ------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | 8    | FieldState 更新语义（见 WA-runtime-003 位置清单）                                                             | ~150     | dirty 变体键集分叉；field-ops 孪生对逐字          | 同根因✅ 已漂移✅ 提取干净✅（runtime 包内原语） → P1                      |
| 2   | 3    | form-store.ts:14-105 / form-store-owned.ts:12-85 / form-runtime-status.ts:10-48                               | ~110     | owned 版 emptySummary 缺失；status 版全量重算分叉 | 同根因✅ 已漂移⚠️ 提取干净✅（同包导出） → P1                              |
| 3   | 3    | node-runtime.ts:92-98 / formula-data-source-controller.ts:61-68 / api-data-source-controller-state.ts:139-152 | ~30      | 内联版独有 NODE_ENV warn 分支                     | 同根因✅ 已漂移⚠️ 提取需先修错误判别通道（flux-formula） → P1              |
| 4   | 2    | form-runtime.ts:131-206 ↔ page-runtime.ts:24-87                                                               | ~50      | Plan 552 门控单侧落地                             | 同根因✅ 已漂移✅ 提取干净✅ → P2                                          |
| 5   | 2    | action-execution.ts:92-137 ↔ abort-signal-helpers.ts:18-54                                                    | ~40      | native 快路径/cleanup 契约单侧                    | 同根因✅ 已漂移⚠️ 提取目标 flux-core（层级约束） → P2                      |
| 6   | 2    | reaction-runtime.ts:52-77 ↔ source-registry.ts:42-130                                                         | ~40      | 上限常量 200 vs 100 依据不可考                    | 同根因✅ 已漂移⚠️ 提取干净✅ → P2                                          |
| 7   | 4    | component-handle 四件套脚手架（+form 版 methods 字面量双写）                                                  | ~30      | 无语义分叉                                        | 同根因✅ 已漂移❌ 提取干净✅ → P3（惯用形降档）                            |
| 8   | 7    | built-in-actions.ts 三组逐字 case（close×3/confirm-alert×2/download-copy×2）                                  | ~70      | 无（逐字）                                        | 同根因✅ 已漂移❌ 提取干净✅ → P3（逐字零漂移+表达问题降档，降档显式记录） |
| 9   | 2    | action-runners.ts:116-145 ↔ :163-189                                                                          | ~18      | 无                                                | 同根因✅ 已漂移❌ 提取干净✅ → P3（稳定）                                  |
| 10  | 7    | form-runtime-array-ops.ts executeArrayMutation 装配                                                           | ~60      | 无                                                | 同根因✅ 已漂移❌ 提取干净✅ → P3（表状惯用形降档）                        |

### 3. Top 重构建议（默认 3 项）

1. **表达式错误判别码化 + 三处嗅探收敛（WA-runtime-001）**：根因修复点 = flux-formula `createExpressionError` 增加机器判别（`code` 字段或错误子类或导出哨兵常量至 flux-core）；预期删除本体 = 三份消息字符串比对（node-runtime.ts:92-98、formula-data-source-controller.ts:61-68、api-data-source-controller-state.ts:139-152 的内联嗅探与 NODE_ENV warn 特判）；回归测试 = 三消费点对同一错误形态行为一致的特征化矩阵（容错等待 vs 错误状态路由）+ 文案变更不破坏判别的负断言；影响面 = flux-formula 公共错误通道（契约变更需评审）+ flux-runtime 三消费点，建议与 CX-1 同窗口。
2. **FieldState 更新语义原语化（WA-runtime-003）**：根因修复点 = runtime 包内新增 `patchFieldStateInMap` 单一原语（吸收五键条件 + dirty graft + 键清除 + 空态回收四变体）；预期删除本体 = 8 份手写骨架（~150 行），含 field-ops 同文件孪生对；回归测试 = 先写五键语义+空态回收特征化矩阵（每键 set/clear、空态删条目、非空保留、batchUpdate 触发）钉住 8 处现状，再收敛同套共享；影响面 = form-runtime 族 6 文件 + form-store 1 文件，行为保持，test-first 先行。
3. **summary 计数器单一来源（WA-runtime-002）**：根因修复点 = form-store.ts 导出 `FormStoreSummaryState`/`computeSummaryFromFieldStates`/`emptySummary`（包内模块导出）；预期删除本体 = form-store-owned.ts 77 行副本 + form-runtime-status.ts 手写重算与第三次 interface 声明；回归测试 = form-store 套件 + owned 投影 summary 断言 + status 汇总断言；影响面 = 同包 3 文件零公共 API 变化，可与建议 2 同批执行。

### 4. 误报排除清单

| 疑似点                                                                      | 位置                                                                                                                                                                                                       | 排除理由（§2 误报排除/W1-W6 对照）                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `setTimeout` 超时原语                                                       | flux-action-core/src/operation-control.ts:95                                                                                                                                                               | C 类排除：`withTimeout` 本体，延迟为调用方参数 `ms` 非调出 magic 数；abort 传播与 settle 语义完备。出生 commit 为功能提交                                                                                                                       |
| `setTimeout` 重试退避                                                       | flux-action-core/src/operation-control.ts:176                                                                                                                                                              | C 类排除：`withRetry` 的 `waitWithAbort(delay)`，指数退避策略有协议依据（prompt §2C 明示排除项），delay 为策略计算值                                                                                                                            |
| validatingDelay 防抖                                                        | flux-runtime/src/form-runtime-validation.ts:318                                                                                                                                                            | C 类排除：延迟值来自 schema 配置 `inputValue.validatingDelay ?? 0`，是 schema 显式配置驱动的 UI 状态防抖，非等待他系统就绪                                                                                                                      |
| submittingDelay 防抖                                                        | flux-runtime/src/form-runtime-submit-flow.ts:271                                                                                                                                                           | 同上：schema 配置 `submittingDelay` 驱动，else 分支零延迟直设                                                                                                                                                                                   |
| revokeObjectURL 延迟                                                        | flux-runtime/src/async-data/blob-download.ts:57                                                                                                                                                            | C 类排除：浏览器宿主边界——DOM 无"下载已开始"事件可订阅，`REVOKE_DELAY_MS` 常量带注释（并记录了对 100ms 前例的改进）；无协议替代即非贿赂                                                                                                         |
| reaction debounce                                                           | flux-runtime/src/async-data/reaction-runtime.ts:390                                                                                                                                                        | C 类排除：`debounceSource` schema 配置驱动，dispose 时 clearTimeout 生命周期完备                                                                                                                                                                |
| 数据源轮询                                                                  | flux-runtime/src/async-data/api-data-source-controller.ts:68                                                                                                                                               | C 类排除：轮询是该特性本体（`input.interval` schema 配置），stop 检查 + 结构化错误路由（reportRuntimeHostIssue）双在位                                                                                                                          |
| `value as unknown as SummaryVersion`                                        | flux-runtime/src/status-owner.ts:62                                                                                                                                                                        | D 类排除：泛型 `T` 与 `TSummary` 无静态关联（TS 无法表达"T 为 TSummary 的原始子值"），前置 `typeof !== 'object'` 运行时守卫，下游 `summaryVersionEqual` 对 keys/values 形状做结构再校验；union 两臂自文档。出生 `0d651a009`（功能提交非症状性） |
| preventDefault/stopPropagation catch 降级                                   | flux-action-core/src/action-core.ts:381,404                                                                                                                                                                | B 类排除：`console.error` + 语义化降级（falsy = 不阻止），路由注释在案——降级可观测且语义即设计                                                                                                                                                  |
| JSON.stringify 消息兜底                                                     | flux-action-core/src/action-dispatcher/action-execution.ts:184                                                                                                                                             | B 类排除：错误消息格式化的 `String()` 回退，纯展示层兜底                                                                                                                                                                                        |
| dispatch catch / onError catch                                              | flux-action-core/src/action-dispatcher/action-execution.ts:341,576                                                                                                                                         | B 类排除：isAbortError 分流 + `reportActionError`（onActionError + plugin.onError 各自 try/catch 保护）结构化路由                                                                                                                               |
| action-adapter compile catch                                                | flux-runtime/src/action-adapter.ts:108                                                                                                                                                                     | B 类排除：`reportRuntimeHostIssue` level:'error' 结构化上报                                                                                                                                                                                     |
| sendOn/initFetch/stopWhen 求值 catch（除 stopWhen 消息嗅探外）              | api-data-source-controller-runtime.ts:70 / api-data-source-controller.ts:36                                                                                                                                | B 类排除：reportRuntimeHostIssue + 保守方向回退（false/true 各有注释依据），观测在位。注：stopWhen 的**null-member 特判分支**不在排除之列——已升级为 WA-runtime-001 立案                                                                         |
| blob 下载 envelope catch                                                    | flux-runtime/src/async-data/blob-download.ts:18,113                                                                                                                                                        | B 类排除：:18 为 content-disposition 解码回退（信任边界解析）；:113 结构化错误 envelope 且注释说明设计意图（不静默落成功）                                                                                                                      |
| reaction run catch                                                          | flux-runtime/src/async-data/reaction-runtime.ts:315                                                                                                                                                        | B 类排除：abort 分流 + asyncGovernance.settleRun 结构化结算                                                                                                                                                                                     |
| request-runtime 两处 catch                                                  | flux-runtime/src/async-data/request-runtime.ts:241,447                                                                                                                                                     | B 类排除：:241 query 参数序列化回退；:447 是 **M-08 已修复的历史静默 catch**——注释记录了从 bare catch 到 console.warn+结构化的修复史，现为可观测降级（正面案例，收敛在位）                                                                      |
| source-observer/source-registry catch ×4                                    | source-observer.ts:101 / source-registry.ts:68,341,435                                                                                                                                                     | B 类排除：:101 Promise.reject 透传给聚合处理器；:341/:435 leaveCascade + reportRefreshFailure；:68 为 observability 辅助函数（filter key 提取，输入为编译产物非用户数据）失败返回空的降级——warn 基建自身的非关键降级                            |
| submit-flow 两处 catch                                                      | form-runtime-submit-flow.ts:132,461                                                                                                                                                                        | B 类排除：attachLifecycleError / toSubmitFailureResult + onSubmitError 生命周期路由，注释在案                                                                                                                                                   |
| `resolveSetValuePayload`/`resolveSetValuesPayload` 尾块同构                 | flux-action-core/src/action-core.ts:325-355                                                                                                                                                                | §3 阈值下排除：兄弟函数惯用形，共享段 <10 行，各校验语义不同                                                                                                                                                                                    |
| attempts/failureCount typeof 提取 ×2                                        | flux-action-core/src/action-dispatcher/action-execution.ts:388-407,428-451                                                                                                                                 | 排除：两处语义不同（request 结果/错误双通道 vs retry 计数器保留），各 ~20 行且方向不同，非同构复制                                                                                                                                              |
| submit-flow failure 装配 ×4                                                 | form-runtime-submit-flow.ts:320-332,373-381,389-403,408-420                                                                                                                                                | 排除：每处 ~8 行声明式对象装配（ok/error/data 三键），低于块级阈值；装配差异是真实语义差异                                                                                                                                                      |
| form-runtime-owner 聚合尾扫描双循环                                         | form-runtime-owner.ts:543-555 ↔ :557-569                                                                                                                                                                   | 排除：12 行×2 同函数内双份（validatedPaths/pathsToPreserve 两集合同谓词），稳定且提取收益边际——"小而稳定双份不强提"合法情形                                                                                                                     |
| surface opening-scope 配对处置                                              | flux-runtime/src/runtime-factory.ts:605-637                                                                                                                                                                | 排除：tree-dispose 前缀匹配的局限被显式注释并单点配对处置（dispose 两者），顺序耦合有文档、无静默                                                                                                                                               |
| `normalizeActionResult` 的 `'ok' in result` 收窄                            | flux-action-core/src/action-core.ts:214-223                                                                                                                                                                | D 类排除：宿主 adapter 返回值的动态边界一次性收窄，守卫在位                                                                                                                                                                                     |
| cascade/AbortSignal 测试钩子（`__getGlobalCascadeDepthForTests` 等）        | reaction-runtime.ts:71-77 / source-registry.ts:124-130                                                                                                                                                     | G 类排除：标准可测性设计（状态注入钩子），非测试迁就                                                                                                                                                                                            |
| `isRequestBackedAction` 的 `'ajax'                                          | 'submit'` 字面量                                                                                                                                                                                           | flux-action-core/src/action-dispatcher/program-utils.ts:9-11                                                                                                                                                                                    | A 类排除：协议规定的动作名领域常量，W6 满足 |
| H35/M-06/M-08/M-09/AUDIT-07/14/15/V18/H34/Plan 550/552/Plan 552(P12) 注释群 | action-core.ts:70、runtime-action-helpers.ts:203、form-runtime-array.ts:265、form-runtime-owner.ts:101,239,316,413、reaction-runtime.ts:409、request-runtime.ts:449、scope.ts:258,285、form-runtime.ts:164 | I 类排除：带编号的登记出口（docs/plans 与 analysis 文档在案），描述"为什么安全"的说明性注释，非待办                                                                                                                                             |
| `dataPath` 双词汇                                                           | 两包 0 命中                                                                                                                                                                                                | 直接引用 wa-1 结论：收敛在位                                                                                                                                                                                                                    |

### 5. 范围整体判断

**零星个案叠加一个结构性重复热区，不是系统性临时方案文化。** 动作核心与运行时是行为纪律严格的区域：字面临时标记为零、无根因失传（10 条立案全部可指认被按住的根因）、20 处门禁 catch 中 19 处有结构化路由或可观测降级（1 处升级立案）、时序类 setTimeout 7 处全部为配置驱动/协议原语/宿主边界、登记出口文化良好（M-xx/AUDIT-xx/Plan-xxx 注释群 + 文档在案）。沉积集中在**重复维度**：form-runtime\*.ts 族是全仓已审计批次中冗余行数最高的热区（族内 ~260 行同根因副本 + 明确的复制出生链），叠加一个真正的跨包契约弱点（错误消息字符串嗅探，WA-runtime-001——本批唯一"按住"型发现，其余 9 条为纯复制沉积）。与 wa-1 结论一致：该仓库的问题形态不是"用临时方案换进度"，而是**"机制落地时不提取共享原语，事后也无收敛登记"**——建议 CX-n（form-runtime 族复制沉积收敛批 + 错误判别通道）承载，处置时机 WA-16 收口前，不阻断后续批次线性审计。

## 批内修复记录（Auto-Remediation）

> roadmap 自动修复契约 §2–§4：P0/P1 单点行为缺陷先红后绿修复；P2 低成本（约 15 分钟内）当场修；
> 结构性/跨批共性发现一律不批内硬修，以 CX-n 拟制独立修改计划。每项修复验证临时方案本体已删除。
> Phase 1 报告由纯审计会话产出（只读）；下表为执行会话接手后的裁定与实施结果。

| 发现 ID            | 严重度 | 修复方式（fix/CX-n/watch-only/…）                                                                                                 | 回归测试（先红后绿证据）                                                                                                                                 | 本体删除验证                                                                                      | commit          |
| ------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------- |
| WA-runtime-001     | P1     | CX-n（flux-formula 错误判别通道 = 包间契约变更，执行前人工确认）                                                                  | 归 CX-4 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-runtime-002     | P1     | CX-n（form-runtime 族复制沉积收敛批；同包行为保持提取）                                                                           | 归 CX-3 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-runtime-003     | P1     | CX-n（同上，本批核心证据组）                                                                                                      | 归 CX-3 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-runtime-004     | P2     | CX-n（跨 runtime 核心文件装配路径，test-first 先行）                                                                              | 归 CX-3 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-runtime-005     | P2     | CX-n（可随 async-data 下次触碰顺带，~30 分钟）                                                                                    | 归 CX-3 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-runtime-006     | P3     | watch-only                                                                                                                        | —                                                                                                                                                        | —                                                                                                 | —               |
| WA-action-core-001 | P3     | 批内修（close×3 fallthrough + confirm/alert、download/copy 合并提取 extractMessageTitleArgs/resolveCloseSurfaceArgs，净删 54 行） | 特征化测试 8 条先钉现状（220/220 绿）→ 重构 → 复跑 220/220 绿（built-in-close-download-copy.test.ts 新增）；filter 四门禁 typecheck/build/lint/test 全过 | 三组逐字块删除验证（grep 残留=0，仅 ajax/openDialog/openDrawer 独立语义分支保留）；类别清扫无兄弟 | 本批收口 commit |
| WA-action-core-002 | P2     | CX-n（flux-core 新增公共工具 = 公共面，执行前人工确认）                                                                           | 归 CX-5 plan                                                                                                                                             | —                                                                                                 | —               |
| WA-action-core-003 | P3     | watch-only                                                                                                                        | —                                                                                                                                                        | —                                                                                                 | —               |
| WA-action-core-004 | P3     | watch-only                                                                                                                        | —                                                                                                                                                        | —                                                                                                 | —               |

共性裁定：CX-3（form-runtime 族复制沉积收敛批，WA-runtime-002/003/004/005）、CX-4（表达式错误判别码化与嗅探收敛，WA-runtime-001）、CX-5（abort 组合原语下沉 flux-core，WA-action-core-002）已插入 roadmap Phase Status（CX-2 与 WA-16 之间）。

## 台账回写核对

- 本批新增 findings：10 条（WA-action-core-001…004、WA-runtime-001…006）
- modules 行翻转 audited：flux-action-core、flux-runtime
- `pnpm workaround:reconcile` 输出摘录（收口终态）：modules 49 total / audited 5 / uncovered 44 / orphan 0；findings 17 total = pending 0 + found 15 + fixed 0 + verified 2（WA-action-core-001 于 closure audit 通过后 fixed→verified）；dispositions watch-only 6 / successor-required 9 / withdrawn 0 / n-a 0；未处置 0（pending 0 + found-without-disposition 0）；violations 0（uncovered 44 为未执行批次，WA-16 关闭前置为归零）

## 附：台账行草稿（供执行会话回写 `docs/audits/workaround-code-smell/ledger.md`，status 一律 pending）

| id                 | module           | category | severity | location                                                                                                                             | status  | disposition | note                                                                                                                                               |
| ------------------ | ---------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| WA-runtime-001     | flux-runtime     | H+A      | P1       | node-runtime.ts:92-98 / async-data/formula-data-source-controller.ts:61-68 / async-data/api-data-source-controller-state.ts:139-152  | pending | CX-n        | 错误消息字符串嗅探 3 份（跨包契约：flux-formula evaluator.ts:57,362 无判别码）；出生 994bf58a6 症状性 message → e0fcebbf3 复制；判别码化需契约评审 |
| WA-runtime-002     | flux-runtime     | H        | P1       | form-store.ts:14-105 ↔ form-store-owned.ts:12-85 ↔ form-runtime-status.ts:10-48                                                      | pending | CX-n        | summary 五计数器 3 份 ~110 行（ef50cb72a 出生即复制）；owned 版 emptySummary 缺失 + status 版重算分叉；同包导出即可收敛                            |
| WA-runtime-003     | flux-runtime     | H        | P1       | form-runtime-{owner,registration,array,validation,field-ops}.ts 6 份 graft/clear + form-store.ts:161-193 ↔ field-ops.ts:16-62 合并对 | pending | CX-n        | FieldState 更新语义 8 份 ~150 行；dirty 变体键集已分叉；field-ops 孪生对 20 行逐字；提取 patchFieldStateInMap 原语                                 |
| WA-runtime-004     | flux-runtime     | H        | P2       | form-runtime.ts:131-206 ↔ page-runtime.ts:24-87                                                                                      | pending | CX-n        | ScopeRef store 装配 2 份 ~50 行（e9fad5eb0 复制）；Plan 552 门控单侧落地先例                                                                       |
| WA-runtime-005     | flux-runtime     | H        | P2       | async-data/reaction-runtime.ts:18,52-77 ↔ async-data/source-registry.ts:15,42-130                                                    | pending | CX-n        | cascade 守卫骨架 2 份 ~40 行（7353e3a39 复制）；上限 200 vs 100 依据不可考；提取 createCascadeGuard                                                |
| WA-runtime-006     | flux-runtime     | H        | P3       | composite/input/surface/form-component-handle.ts 脚手架 ×4（form-component-handle.ts:23-29 数组字面量双写）                          | pending | watch-only  | 工厂脚手架惯用形 ~30 行；降档显式记录（builtins ARRAY\* 先例）                                                                                     |
| WA-action-core-001 | flux-action-core | H        | P3       | action-dispatcher/built-in-actions.ts:149-162,218-245（close×3）/174-217（confirm-alert×2）/311-344（download-copy×2）               | pending | 批内修候选  | 三组逐字 case ~70 行零漂移；close fallthrough ~5 分钟行为保持；降档显式记录（≥3 份 P1 起评 → 逐字零漂移纯表达问题）                                |
| WA-action-core-002 | flux-action-core | H        | P2       | action-dispatcher/action-execution.ts:92-137 ↔ flux-runtime/abort-signal-helpers.ts:18-54                                            | pending | CX-n        | abort 合并 2 份 ~40 行（e68fe452f 层级约束手写）；提取目标 flux-core 超集 API（cleanup + n-signal）；公共面需人工确认                              |
| WA-action-core-003 | flux-action-core | H        | P3       | action-dispatcher/action-runners.ts:116-145 ↔ :163-189                                                                               | pending | watch-only  | namespaced 尾块 2 份 ~18 行稳定（3d63d983d 复制）                                                                                                  |
| WA-action-core-004 | flux-action-core | n/a      | P3       | （归属 flux-runtime）form-runtime-array-ops.ts:28,44,68,91,131,174,201                                                               | pending | watch-only  | executeArrayMutation 装配 ×7 ~60 行同文件表状惯用形；module 归 flux-runtime                                                                        |
