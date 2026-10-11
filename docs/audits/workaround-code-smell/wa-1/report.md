# WA-1 编译与公式层 临时方案与坏味道审计报告

> 批次: WA-1（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: `docs/plans/561-workaround-audit-wa1-compile-formula-plan.md`
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-1 行，不手抄）

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。
> 声明口径：列出的模块 = 本批执行了 prompt §5 全量取证协议（字面扫描 → 模式扫描 → git 考古 →
> 重复块识别 → 抽读走读 → 误报排除）的对象。部分覆盖不得声明 audited（缩水走显式注记）。

| 模块 id       | 文件数 | 非测试行数 | 取证完成 | 备注                                                                                                                                                                                |
| ------------- | ------ | ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-core     | 71     | 9202       | ✅       | 对象清单取自 inventory.modules[flux-core].files（71 项，含 test-support）；全量字面/模式扫描 + 核心文件走读 + git 考古                                                              |
| flux-formula  | 20     | 3515       | ✅       | 对象清单取自 inventory.modules[flux-formula].files（20 项）；parser/evaluator/registry/template/compile 管线走读 + 重复块程序化比对                                                 |
| flux-compiler | 40     | 7762       | ✅       | 对象清单取自 inventory.modules[flux-compiler].files（40 项，含 test-support）；编译管线（schema-compiler → node-compiler → source/action/reaction-compiler）走读 + 重复块程序化比对 |

合计 131 文件 / 20,479 行，与 inventory 三模块计数逐字对齐（**审计时点快照**；批内修复后 live 为 core 9,211/compiler 7,744，漂移系本批修复自身所致——净 -9 行）。

### 取证执行记录（prompt §5 步骤逐条）

1. **字面扫描**：三包 `TODO|FIXME|HACK|WORKAROUND|XXX` = 0 命中；`临时|先这样|暂时|绕过|hotfix` = 0 命中（与 roadmap 基线节 per-module baseline 一致）。
2. **模式扫描**：typeBypass 13 处 live 命中（core 1 / formula 2（其中 1 处为注释）/ compiler 10（其中 1 处为注释），与 baseline 14 计数一致——compiler 侧 source-compiler.ts:18 为注释行）；`setTimeout(` = 1（core debounce.ts）；静默 catch、key 强刷、DOM 突袭、像素 nudge、测试环境分支（产品代码字面级）= 0。
3. **git 考古**：对全部 14 处 baseline 候选 + 各立案发现执行 `git log -L` / `git log -S` / `git blame`，出生 commit 读数逐条见下文；无一处出生 commit 为症状性 message（"修 xxx 不显示"型零命中）。
4. **重复块识别**：token 归一化探针（12 行滑窗、关键词保留/标识符字面量归零、过滤 import 头，跨文件 + 同文件双通道）放 `_tmp/`，覆盖 131 文件；63 个跨文件候选块 + 15 个同文件候选对，逐对人工对照同构性后裁定（结果见汇总 §2 与误报排除 §4）。探针用后已删除。
5. **门禁交叉核对**：`check:audit-suspects`（三包 9 处：catch-without-structured-failure-path 8 + json-stringify-change-detection 1）、`check:audit-async-failure-paths`（同上 8 处 catch）、`check:audit-hardcoded-type-dispatch`（三包 0）、`check:audit-runtime-raw-schema-reads`（三包 0）。9 处命中逐个打开定性，全部裁定误报排除（见 §4）；无 pre-existing 登记项需升级定性。
6. **范围结构走读**：全读/大部读文件——compiler 管线（`schema-compiler.ts`、`node-compiler.ts`、`node-compiler-helpers.ts`、`source-compiler.ts`、`action-compiler.ts`、`compile-symbol-table.ts`、`runtime-value-compilation.ts`、`shape-validation-rules-{reaction,source,structural}.ts`、`shape-validation-rules-action.ts`、`flux-value-shape-validation.ts`、`validation-lowering.ts` 关键段、`diagnostics.ts` 结构）；formula 引擎（`evaluate.ts` 全文、`evaluator.ts` 主体、`registry.ts`、`template.ts`、`pipe-syntax.ts` 全文、`lexer.ts` 字符串扫描段、`builtins.ts` 注册段、`compile-node.ts` 关键段）；core 契约与基建（`value-adapter.ts` 全文、`contract-honesty.ts`、`registry.ts`、`i18n-sink.ts`、`compiled-cid.ts`、`strict-mode.ts`、`nested-regions.ts`、`lazy-lib.ts`、`constants.ts` 定义表段、`types/renderer-api.ts`、`types/node-identity.ts`、`types/compilation.ts`、`types/renderer-core.ts` 头部）。grep 抓不到的信号（流程式复制、被注释分支、顺序耦合、静默兜底、无出口兼容层）按此走读取证。
7. **已收敛模式 live 复核**（roadmap 基线节三档）：
   - live 可证档：`createLazyLibLoader`（`flux-core/src/utils/lazy-lib.ts`）在位，live 消费者 3 处（echarts-renderer / map-ol-loader / barcode-detector-utils），无复发 → 不立案。
   - 历史教训档：strip errors 合一 / ajax 合一 / surface 生命周期（属 WA-2 / WA-4 模块，不在本批范围，未引用）；`name` vs `dataPath` 双词汇——三包 `dataPath` 零命中，收敛在位 → 不立案。
   - 显式排除档：`flux-runtime` form-runtime 文件族不属本批（WA-2）。
8. **误报排除复核**：汇总前逐条对照 §2 误报排除与 W1–W6，25 项排除记录见 §4。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记 `docs/audits/workaround-code-smell/ledger.md`
> （ID `WA-<pkg短名>-<seq>`），本节与台账一一对应，零静默。
> 审计产出后，批内修复（WA-compiler-001）见文末《批内修复记录》；其余各条 ROI 裁定为 CX-n/watch-only 显式去向。

### [类别I] `CompiledTemplate.repeatedTemplates` 转正的过渡契约字段（空壳 6 个月无出口）

- **位置**: `packages/flux-core/src/types/node-identity.ts:207-216`（契约声明）；`packages/flux-compiler/src/schema-compiler.ts:154,195,222`（恒空构造 `new Map()`）；唯一消费者 `packages/flux-react/src/render-nodes.tsx:81`（`instanceof Map` 类型守卫，包外，仅记录）
- **严重度**: P1
- **现状**: `CompiledTemplate` 契约携带 `repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>` 字段，编译器三处构造点全部传入空 Map，全仓无任何填充方。
- **按住的根因**: 一个计划中的"重复模板去重/复用"特性（Plan 40）。出生 commit `c6a3245a2`（2026-04-07）message 自述 _"add node-identity types and transitional template fields for Plan 40"_——契约壳先于特性发布，特性未落地，壳未回收。`git log --all -S "repeatedTemplates.set"` 全历史零命中：该字段**从未被填充过**。根因（特性未交付）可指认至 Plan 40 的未竟范围。
- **违约基准**: W2（无出口——无关联 bug/plan 链接、无 `@deprecated`、无清理登记）、W5（删除行为可回答——恒空 Map，删除字段+守卫是机械变更，但 6 个月无人执行）、I 类转正（"transitional"字样在 commit message 里，实体在契约里）。
- **为什么是临时方案**: 三要素全中——症状消失（编译 API 当年需要该形状即通过）；根因仍在（重复模板复用特性至今不存在，`repeatedTemplates` 语义无实现）；出口缺失（2026-04-07 至今 6 个月+，无退出条件登记，`deprecated-feature-cleanup.md` 流程未启动）。
- **风险**: 公共契约噪声：每个 `CompiledTemplate` 生产者必须永远提供空 Map；消费者（flux-react 类型守卫）为死字段维护判断分支；新贡献者会误以为重复模板机制存在。演进阻力：后续任何 CompiledTemplate 形状变更都被迫拖着死字段走。
- **重构方向**: 走 `docs/skills/deprecated-feature-cleanup.md`：`@deprecated` + 文档记录 → 删除 `repeatedTemplates`/`RepeatedTemplate`/`RepeatedTemplateId` 三者 + flux-compiler 三处空构造 + flux-react 守卫中的该分支。回归测试：现有编译-渲染全量套件（行为无变化是预期，typecheck 抓残余引用）。
- **重复组**（仅 H 类）: 不适用。
- **ROI 裁定**: CX-n 拟制（公共 API 删除，保护区 + 跨包消费者 flux-react，执行前需人工确认）。
- **误报排除复核**: 不属"描述历史为什么安全的说明性注释"——它是 live 契约字段而非注释；不属动态边界——它不承载任何运行时语义。

### [类别H] 复合运行时值"状态提交策略"块 4 份跨包重复（formula/evaluate ↔ compiler/runtime-value-compilation）

- **位置**: 4 份同构块——`packages/flux-formula/src/evaluate.ts:154-181`（array 分支）、`evaluate.ts:219-246`（object 分支）、`packages/flux-compiler/src/schema-compiler/runtime-value-compilation.ts:164-187`（array exec）、`runtime-value-compilation.ts:266-289`（object exec）
- **严重度**: P1（≥3 份同根因；已出现语义分叉——见漂移证据）
- **现状**: `!anyChildChanged → 返回 lastValue` / `shallowEqual(lastValue, nextValue) → 返回 lastValue` / 否则提交新值并返回 `changed: true` 的三段式引用稳定策略块（各份 25–30 行）在两个包的两个引擎里逐字重复 4 次，总冗余约 110 行。
- **按住的根因**: 复合运行时值（object/array）求值的引用稳定性契约（React 侧 memo/订阅依赖的基石）没有单一事实来源。两个引擎的 IR 不同（evaluate.ts 走 `CompiledValueNode` 树、rvc 走含 `CompiledRuntimeValue` 叶子的原始树），引擎不必要统一；但**状态提交策略**是同一机制。compiler 侧出生链：`9cf1aac10`/`60109b9f0`（compile-once 管线）从 node-compiler 内联代码起步，`8181fff2a`（2026-09，"extract runtime-value tree compilation from node-compiler"）提取成文件时**复制**了 evaluate.ts 的策略块而非共享。formula 侧早于 667d5d7c3（全仓格式化）即存在。
- **违约基准**: W3（策略变更需 4 处同步修）；漂移证据（下条）说明 W3 成本已部分兑现。
- **为什么是临时方案**: 症状消失（两引擎各自表现正确）；根因仍在（策略无单一事实来源，同类输入换个引擎走不同代码路径）；出口缺失（无共享化登记，8181fff2a 提取时选择了复制而非提取共享原语，无后续收敛计划）。
- **风险**: 策略漂移已在发生：object 分支 key 重建检查，evaluate.ts 是双向（`!(key in entries) || currentKeys.some(不在 keySet)`，支持 key 删除），rvc 是单向（仅 `!(key in entries)`，注释声明"keys 编译期固定"）。该分叉当前各有其理（rvc 的 keys 闭包确实固定），但正是复制结构的自然产物——下一个策略修 bug（如 shallowEqual 语义调整、changed 标志可信度修正）极易只落一处。
- **重构方向**: 在 flux-core 新增共享原语（如 `commitCompositeState(stateRoot, nextValue, anyChildChanged): ValueEvaluationResult`，flux-core 已有 `RuntimeValueState`/`ValueEvaluationResult` 类型，两包本就依赖 core，依赖方向干净）。回归测试：先为"引用稳定策略"写特征化测试（子值不变→同一引用；浅相等→同一引用；子值变→新引用+changed），四份共享后同套测试钉住两引擎。
- **重复组**（仅 H 类）: 4 份；位置见上；冗余约 110 行；漂移证据：object key 重建检查单向 vs 双向分叉（rvc.ts:245-248 注释自证）。
- **ROI 裁定**: CX-n 拟制（跨包共性，涉及求值语义的提取，建议随下一轮 compiler/formula 联合窗口执行）。
- **误报排除复核**: 不是"两份独立演化的巧合相似"——逐字同构且可追溯复制路径；不是引擎统一议题（本发现只提策略块，不动两引擎 IR）。

### [类别H] root-level 路径数组校验机制 3 份重复 + 诊断码复制粘贴残留

- **位置**: 3 份——`packages/flux-compiler/src/schema-compiler/shape-validation-rules-structural.ts:43-95`（`validateDependsOnRoots` 共享原语）；`shape-validation-rules-reaction.ts:126-169`（`validateReactionFieldShape` dependsOn 手写循环）；`shape-validation-rules-reaction.ts:172-215`（同函数 ignoreWritesTo 手写循环）。残留证据：`shape-validation-rules-reaction.ts:220-271`（immediate/debounce/once/control 四个"v1 不支持"块全部复用诊断码 `invalid-reaction-immediate`）
- **严重度**: P1（≥3 份同根因）
- **现状**: "数组 → 逐项非空字符串校验 → `normalizeRootPath` 根路径折叠检查 → 分级发诊断"的同一机制，共享原语（接受 code 参数）已存在；`validateReactionFieldShape` 因需要 per-entry 双码（error `invalid-reaction-deps` / warning `invalid-reaction-deep-path`）而**手写了两份逐行同构的循环**（各约 40 行，仅字段名与消息文本不同），未参数化复用原语。
- **按住的根因**: `validateDependsOnRoots` 的参数化面不够（不支持 severity 分级与 per-rule 码），2026-07-07 loadAction-reaction 特性（doc 注释指向 `docs/plans/2026-07-07-loadAction-reaction-kind-plan.md`，文件实体经 `81702c1e6`（2026-08-07，oversized 治理）拆分时定形）选择绕过而非扩展原语。出生 commit：`81702c1e6`；"v1 不支持"四连块的码复用源自 `9be4394e9`（2026-07-08）。
- **违约基准**: W3（根路径折叠语义变化需 3 处同步修）、W4 边缘（四连块中 debounce/once/control 的诊断码误标为 `invalid-reaction-immediate`——按码过滤诊断的消费者会把 debounce 误读成 immediate 问题，复制粘贴残留直接进入诊断输出面）。
- **为什么是临时方案**: 症状消失（三种场景诊断都出现且大体正确）；根因仍在（校验机制无单一事实来源，码语义已错仍在线上输出）；出口缺失（无登记）。
- **风险**: 漂移面已兑现（码误标）；未来给 ignoreWritesTo/dependsOn 增加校验规则（如长度上限、跨字段约束）需改三处。
- **重构方向**: 把 `validateDependsOnRoots` 参数化升级为 `validateRootPathArray({ value, path, field, required, codes: { typeMismatch, deepPath }, severity })`，三处收敛；四连"v1 不支持"块改表驱动（`const V1_FORBIDDEN = [...]`），并裁决 debounce/once/control 是否改用独立诊断码（改码涉诊断消费者面，属对外可见面 → 若改码需按废弃流程登记映射）。回归测试：三场景（标准/深路径 warning/空数组 error）× dependsOn/ignoreWritesTo 诊断码与 severity 的快照断言（先钉现状再提取，码变更另行走登记）。
- **重复组**（仅 H 类）: 3 份；位置见上；冗余约 80 行；漂移证据：`invalid-reaction-immediate` 码被 4 个字段共用（其中 3 个语义不符）。
- **ROI 裁定**: 批内修候选（同包提取、保持码与消息逐字不变是非结构性行为保持重构；码重命名部分挂账，见 Top 建议 2）。
- **误报排除复核**: reaction.ts 与 source.ts 的跨文件 12 行窗口命中多为 `emitSchemaDiagnostic` 调用惯用形，未据此立案——本发现只落在三份真实同构机制上。

### [类别H] `actionAdapter` 与 `createActionBackedAdapter` 的 in/out/validate 三联重复

- **位置**: `packages/flux-core/src/value-adapter.ts:286-390`（`actionAdapter`）与 `value-adapter.ts:503-599`（`createActionBackedAdapter` 编译程序路径）
- **严重度**: P2（双份大块、其中一份 2026-10-01 新落、仍处活跃修改期）
- **现状**: transformIn/transformOut/validate 三个适配器方法体（约 95 行）在两个工厂间近同构：相同的 payload 装配（value/originalValue/readOnly/name）、相同的 `!result?.ok → createActionFailureError` 处理、相同的 validate 结果解包（candidate.valid/issues 归一）。差异仅三点：`runAction` vs `runValueAdaptationAction`（后者支持 compiled program 的 payload 克隆）、`toValidationIssues` vs 可注入 `formatIssues` 接缝、runner 是否转发 ctx。
- **按住的根因**: cq-4 Phase 2（出生 commit `ccc4ac7ed`，2026-10-01，"value-adapter composition API"）为支持编译后动作程序（`CompiledActionProgram`）需要 payload 注入策略差异，选择了整段复制 actionAdapter 三联而非为 `actionAdapter` 增加 payload 策略参数。plain-schema 路径确实 fallthrough 复用了 actionAdapter（doc 注释 462-469 在案），但**只要有一个动作是编译程序，三联就整体走副本**。
- **违约基准**: W3（validate 结果解包或错误消息格式修 bug 需两处同步；formatIssues 接缝只在副本生效——doc 注释自己承认"plain-schema fallthrough 永远用 core 英文 formatter"，接缝覆盖不全）。
- **为什么是临时方案**: 症状消失（composition API 上线，full-green）；根因仍在（payload 注入策略没有统一参数面，两份工厂语义需人肉保持同步）；出口缺失（无收敛登记）。
- **风险**: 最新的一份（compiled 路径）是 form-advanced 详情视图主路径，活跃演进中；actionAdapter 侧修 bug 不落地副本的概率随时间上升（漂移未发生但结构已保证它会发生）。
- **重构方向**: `actionAdapter` 增加 `runStrategy`/`formatIssues` 参数（或内部抽 `buildActionBackedMethods({ run, formatIssues })` 共享三联骨架），`createActionBackedAdapter` 退化为配置装配。回归测试：两工厂在 transformIn 失败/validate 抛错/validate 返回 candidate.issues 非数组 四场景的行为一致化断言（先钉现状）。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 80 行；漂移证据：暂无行为分叉（formatIssues 差异是设计内），分叉风险由活跃度驱动。
- **ROI 裁定**: 排期进 plan（flux-core/src 保护区 → plan-first，不批内硬修；提取不动公共签名，行为保持）。
- **误报排除复核**: 不属"ajax 执行逻辑两份合一"已收敛项（那是 flux-action-core 的调度侧，本项是 value-adapter 适配侧，另一处重复）；不是接口多态的合理双实现——两份职责相同、仅策略参数不同。

### [类别H] pipe-syntax 顶层扫描器骨架两份复制

- **位置**: `packages/flux-formula/src/compile/pipe-syntax.ts:17-60`（`splitFilterArgs`）与 `pipe-syntax.ts:66-113`（`parseTopLevelFilterSegments`）
- **严重度**: P3（双份、约 35 行骨架、同文件、最后实质修改 2026-05-06 `a8002125c`——稳定）
- **现状**: 两函数共享同一"引号转义 + 括号深度追踪"扫描骨架（引号开关、`\\` 逃逸、三类括号配对），仅顶层边界谓词不同（`:` vs `isPipeBoundary`）。
- **按住的根因**: 管道语法（`a | filter: b`）预重写器需要两个方向的顶层切分，写第二个时复制了第一个的扫描骨架。出生链：`5f0964c18`（2026-04-25，split oversized modules 时期定形）→ `a8002125c`（2026-05-06，chained pipe 支持）。
- **违约基准**: W3（扫描器 bug 修复需两处同步——例如未来若 lexer 引入新引号形态）。
- **为什么是临时方案**: 症状消失（两方向切分都正确）；根因仍在（顶层感知扫描无单一实现）；出口缺失（无登记，但双份稳定不动）。
- **风险**: 低。已核对 lexer.ts:163 只认 `'`/`"` 起始字符串（表达式语言无反引号字符串），两份扫描器与语言引号集一致，无现行语义分叉（template.ts 的 `countBraceDepth` 反引号容忍是模板层文本段防御，与本处不构成矛盾）。
- **重构方向**: 提取 `scanTopLevelSegments(source, isBoundary)`，两函数各传谓词。回归测试：现有 pipe 语法套件 + 一条"引号内含分隔符"用例。
- **重复组**（仅 H 类）: 2 份；位置见上；冗余约 35 行；漂移证据：无。
- **ROI 裁定**: 挂账观察（watch-only；两份稳定不动，强行提取收益低，登记防漂移）。
- **误报排除复核**: 非概念级重复（归一化后逐字同构的骨架，控制流逐一对照成立）。

### [类别D] action-compiler 三处内联输出断言未走 `asRuntimeValue` 接缝（接缝半程收口）

- **位置**: `packages/flux-compiler/src/action-compiler.ts:121-135`（`when`/`preventDefault`/`stopPropagation` 三处 `as unknown as CompiledRuntimeValue<boolean>`）；对照接缝 `packages/flux-compiler/src/source-compiler.ts:13-22`
- **严重度**: P3
- **现状**: cq-6 Phase 1（`2c94d9d7f`）在 source-compiler.ts 建立了单一输出形状断言接缝 `asRuntimeValue`，注释明确其使命是"收拢输出断言，取代六处内联 `as unknown as` 断言"；接缝收口了 source-compiler 自己的断言，但 action-compiler 的三处同型内联断言（出生 `32a732686`，2026-06，X2 schema-driven preventDefault/stopPropagation；`when` 处更早）原样留存。
- **按住的根因**: `compileValue<T>(input: T): CompiledRuntimeValue<T>` 的类型参数沿输入流动，TS 无法表达"输出求值结果为 boolean"的契约，输出断言必然存在——接缝就是为此而生；断言本体不是坏味道（输入侧有 `shape-validation-rules-action.ts:185-223` 的 boolean-or-expression-string 编译期校验背书），**不一致在于同一关切两个写法并存**。同一三元组（when/preventDefault/stopPropagation）还在 `shape-validation-rules-action.ts:186-227` 有第三处声明式校验副本——新增一个布尔动作字段今天需同步 types/actions.ts、rules-action、action-compiler 三处（W3 弱违约）。
- **违约基准**: W3（断言收口点不唯一，接缝的"single named point"承诺未兑现）。
- **为什么是临时方案**: 症状消失（cq-6 收口批完成）；根因仍在（内联断言仍在产生点)；出口缺失（无"action-compiler 断言迁入接缝"的登记）。
- **风险**: 低。三处 5 行断言，语义稳定；主要是一致性债与接缝注释的误导性（注释宣称的六处收口在 live 只有三处兑现）。
- **重构方向**: 三处改为局部 `asRuntimeValue<boolean>(...)`（action-compiler 内自有或从共享点导入）；顺手在注释中修正"六处"表述。回归测试：typecheck + 现有 action 编译套件（纯等价重写）。
- **重复组**（仅 H 类）: 不适用（D 类）。
- **ROI 裁定**: 挂账观察（watch-only；约 15 分钟低成本修复候选，随 compiler 包下一次触碰顺带完成）。
- **误报排除复核**: 断言本身不立案（输出契约断言 + 输入侧编译期校验 + 动态边界，属 §2 D 类误报排除的正确用法）——立案对象是"接缝半程收口"这一 W3 不一致。

### [类别H] builtins ARRAY\* 函数家族 6 份同构注册

- **位置**: `packages/flux-formula/src/builtins.ts:100-150`（ARRAYMAP/ARRAYFILTER/ARRAYFIND/ARRAYFINDINDEX/ARRAYSOME/ARRAYEVERY）
- **严重度**: P3（协议 ≥3 份同根因默认 P1 起评；降档理由：每份 6 行、纯委托原生方法、零漂移、单文件内表状惯用形——按 §3"不提取是合法裁定"精神降为观察项，降档显式记录不静默）
- **现状**: 六个数组高阶函数注册共用同一形状（`toArray(input)` → 原生方法 → `Boolean(predicate(...))` 包装，map 除外），仅方法名不同。
- **按住的根因**: 内建函数注册表按函数逐个手写，无家族级注册辅助；机制同源（toArray 装箱语义变化需六处同步）。
- **违约基准**: W3（弱）。
- **为什么是临时方案**: 不满足三要素的"出口缺失"严重形态——这是风格债而非按住的问题；立案为观察项以保持台账零静默。
- **风险**: 极低；新增同类函数时继续复制会缓增。
- **重构方向**: `registerArrayHigherOrder(name, method, { wrapPredicate })` 表驱动注册（可选，非必须）。回归测试：现有 builtins 套件。
- **重复组**（仅 H 类）: 6 份；同文件；冗余约 24 行；漂移证据：无（`Boolean()` 包装的分布差异是语义性的，map 不包装）。
- **ROI 裁定**: 挂账观察（watch-only）。
- **误报排除复核**: 同文件表状注册与"跨模块各自手写同一基础设施"（§2 H 类核心场景）不同，风险等级不支撑 P1。

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID         | 位置                                              | 出生时间（git 考古）                                 | 风险                                                      | 处置                        |
| --------------- | ------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- | --------------------------- |
| WA-core-001     | `flux-core/src/types/node-identity.ts:207-216` 等 | `c6a3245a2`（2026-04-07，commit 自述 transitional）  | 公共契约死字段 6 个月+，生产者/消费者被迫永远携带空 Map   | CX-n（deprecated 清理流程） |
| WA-formula-001  | 4 份状态提交策略块（formula+compiler）            | formula 侧 <2026-06；compiler 侧 `8181fff2a` 复制    | 策略修 bug 单点落地的漂移风险（单向/双向 key 检查已分叉） | CX-n                        |
| WA-compiler-001 | `shape-validation-rules-reaction.ts` 校验家族     | `81702c1e6`（2026-08-07 定形；码复用自 `9be4394e9`） | 诊断码误标已进入诊断输出面（W4 边缘）                     | 批内修候选（下一执行窗口）  |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 各份位置                                                                                    | 冗余行数 | 漂移证据                                        | 裁定（三问句）                                                          |
| --- | ---- | ------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | 4    | evaluate.ts:154-181 / evaluate.ts:219-246 / runtime-value-compilation.ts:164-187 / :266-289 | ~110     | object key 重建单向 vs 双向（设计内但结构产物） | 同根因✅ 已漂移⚠️（有意分叉已文档化） 提取干净✅（flux-core 原语） → P1 |
| 2   | 2    | value-adapter.ts:286-390 / :503-599                                                         | ~80      | 无行为分叉；formatIssues 接缝单侧生效           | 同根因✅ 已漂移❌ 提取干净✅ → P2（活跃）                               |
| 3   | 3    | rules-structural.ts:43-95 / rules-reaction.ts:126-169 / :172-215                            | ~80      | 诊断码误标（invalid-reaction-immediate ×4）     | 同根因✅ 已漂移✅ 提取干净✅ → P1                                       |
| 4   | 2    | pipe-syntax.ts:17-60 / :66-113                                                              | ~35      | 无                                              | 同根因✅ 已漂移❌ 提取干净✅ → P3（稳定）                               |
| 5   | 6    | builtins.ts ARRAY\* 注册                                                                    | ~24      | 无                                              | 同根因✅ 已漂移❌ 提取干净✅ → P3（表状惯用形降档）                     |

### 3. Top 重构建议（默认 3 项）

1. **收敛复合运行时值状态提交策略（WA-formula-001）**：根因修复点 = flux-core 新增 `commitCompositeState` 共享原语；预期删除本体 = 四份 25-30 行策略块（-110 行）；回归测试 = 引用稳定性特征化矩阵（不变子树→同引用、浅相等→同引用、变更→新引用+changed=true，双引擎同套钉住）；影响面 = flux-formula/flux-compiler 两包求值路径，行为保持，test-first 先行。
2. **root 路径数组校验原语参数化 + 诊断码清理（WA-compiler-001）**：根因修复点 = `validateDependsOnRoots` 升级为可配码/severity 的 `validateRootPathArray`；预期删除本体 = reaction.ts 两段手写循环（-80 行）+ 四连复制块的码误标（是否给 debounce/once/control 独立码需人工裁决——诊断码是消费者可见面，改码走登记映射）；回归测试 = dependsOn/ignoreWritesTo × error/warning 诊断码快照（先钉现状）；影响面 = flux-compiler 单包、诊断输出面零变化（若不改码）。
3. **删除 `repeatedTemplates` 空壳契约字段（WA-core-001）**：根因修复点 = 契约收缩（Plan 40 未竟特性的壳）；预期删除本体 = 契约字段 + 2 个伴生类型 + 3 处空构造 + 1 处包外守卫分支；回归测试 = typecheck 抓残余 + 编译渲染全量套件（预期零行为变化）；影响面 = flux-core 公共 API（走 `deprecated-feature-cleanup.md`，公共 API 删除需人工确认 → CX-n）。

### 4. 误报排除清单

| 疑似点                                                                           | 位置                                                                                            | 排除理由（§2 误报排除/W1-W6 对照）                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setTimeout` 防抖                                                                | `flux-core/src/utils/debounce.ts:29`                                                            | C 类排除：防抖原语本体，延迟为调用方参数非调出的 magic 数；错误经 try/catch reject 返回的 promise（结构化路由+注释在位）。出生 `d7c8c41a0`（功能提交）                                                                                                                                                                                                                                                   |
| `Error as unknown as ErrorWithCaptureStack`                                      | `flux-core/src/types/renderer-api.ts:128`                                                       | D 类排除：V8 `captureStackTrace` 非标准 API 的能力探测，`typeof === 'function'` 运行时守卫，一次 性收窄带注释语境                                                                                                                                                                                                                                                                                        |
| evaluator.ts 注释提及 `(as any)`                                                 | `flux-formula/src/evaluator.ts:99`                                                              | 非断言，是 cq-6 Phase 1 修复的记录注释（断言已被显式 JS 语义替换并由特征化矩阵钉住）——修复后现场，非临时方案                                                                                                                                                                                                                                                                                             |
| `(objectValue as any)[key]`                                                      | `flux-formula/src/evaluator.ts:385`                                                             | D 类排除：求值器动态 member access 是语言本体；`DANGEROUS_MEMBER_KEYS` 守卫前置（`__proto__`/`constructor` 等显式拒绝）；objectValue 为 unknown，无可检查契约可破坏                                                                                                                                                                                                                                      |
| `Math/JSON as unknown as Record`                                                 | `flux-compiler/src/compile-symbol-table.ts:36-37`                                               | D 类排除：JS 内建命名空间枚举（TS 类型无索引签名），一次性收窄，`typeof !== 'undefined'` 过滤守卫                                                                                                                                                                                                                                                                                                        |
| `compile(schema as any)`                                                         | `flux-compiler/src/schema-compiler-prop-coverage.test-support.ts:19`                            | D 类排除：测试夹具接缝，helper 的职责就是接受任意 fixture schema                                                                                                                                                                                                                                                                                                                                         |
| `entry as unknown as T`                                                          | `flux-compiler/src/schema-compiler-schema-definition-unified-test-support.ts:60`                | D 类排除：测试 helper 泛化解包                                                                                                                                                                                                                                                                                                                                                                           |
| `compileValue(value as any)`                                                     | `flux-compiler/src/schema-compiler/fields.ts:83`                                                | D 类排除：schema→compiler 动态边界，meta 字段值任意形态（出生 `c8636c168`/`aa478a2e3` 功能提交，BOOLEAN_META_FIELDS 规整化在位）                                                                                                                                                                                                                                                                         |
| strict-mode 3 处空 catch                                                         | `flux-core/src/strict-mode.ts:32,42,56`                                                         | B 类排除：宿主环境探测（localStorage/URL/import.meta）降级，注释逐处在位，降级语义即设计（flag 本为 advisory）                                                                                                                                                                                                                                                                                           |
| `validation-lowering.ts` catch                                                   | `flux-compiler/src/validation-lowering.ts:235`                                                  | B 类排除：`console.warn` + 结构化 `{error, safe:false}` 返回，观测与路由双在位                                                                                                                                                                                                                                                                                                                           |
| value-adapter 2 处 catch                                                         | `flux-core/src/value-adapter.ts:382,592`                                                        | B 类排除：错误转 `AdapterValidationIssue[]` 结构化返回（校验契约语义：异常=校验失败+issues），非静默                                                                                                                                                                                                                                                                                                     |
| `catch { return { static: false } }`                                             | `flux-formula/src/compile/static-eval.ts:181`                                                   | B 类排除：静态分析失败回退动态求值是语义本体（同一表达式由动态路径重新求值并经表达式错误通道正常上报），注释在位                                                                                                                                                                                                                                                                                         |
| `JSON.stringify` 门禁命中                                                        | `flux-compiler/src/schema-compiler/flux-value-shape-validation.ts:138`                          | 门禁误报：仅用于诊断消息中给字符串加引号，非变更检测/依赖键控                                                                                                                                                                                                                                                                                                                                            |
| `shouldFailOnSchemaDiagnostics` 的 VITEST/PLAYWRIGHT 分支                        | `flux-compiler/src/schema-compiler.ts:44-55`                                                    | G 类排除：已登记治理机制——出生 `85de6853e`（2026-06-12，显式 feature "fail-fast schema diagnostics in test environments"），round2-p3-adjudication 与 2026-08-03 日志在案，共享 vitest 配置开启，带显式 `__FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__` 逃生门。注记：隐式 VITEST 键对下游库消费者的 Vitest 运行同样生效（fail-fast 行为差异），属有意策略非迁就；如未来收到消费者投诉可复议为仅 `__FLUX_*` 显式键 |
| json-merge "重复"                                                                | `flux-core/src/json-merge/diff-delta.ts` ↔ `merge-json.ts`                                      | 归一化假同构：diff 与 merge 是互逆操作，仅 shape-dispatch 序言形似，主体语义（marker 处理/remove/replace/列表折叠）完全不同                                                                                                                                                                                                                                                                              |
| openDialog/openDrawer/confirm/alert 定义块                                       | `flux-core/src/constants.ts:133-208`                                                            | 声明式 action 定义表（schema 驱动的 fieldRules 数据），非代码复制                                                                                                                                                                                                                                                                                                                                        |
| static-eval switch 对称分支 / parser 数组对象对称分支 / evaluator 比较操作数守卫 | `static-eval.ts:47-77`、`parser.ts:486-565`、`evaluator.ts:99-185`                              | 求值器/解析器的天然 case 对称（各 case 子表达式与语义不同）；操作数守卫是逐操作符的合法性门 + reportError 结构化路由                                                                                                                                                                                                                                                                                     |
| `analyzeSchemaInput(...createRegionTraversalState(...))` 调用形 ×4               | `flux-compiler/src/schema-compiler/shape-validation-analyze.ts:204,274,464,517`                 | 遍历递归惯用形，各站点处理不同 rule.kind 与路径构造，非块级逻辑复制                                                                                                                                                                                                                                                                                                                                      |
| tableRenderer 夹具双份                                                           | `schema-compiler-prop-coverage.test-support.ts:219` ↔ `schema-compiler-registry-fixtures.ts:41` | 测试夹具双份稳定且用途不同（prop-coverage 详版带内联 shape / registry-fixtures 简版），§3"两份稳定不立案"                                                                                                                                                                                                                                                                                                |
| types 文件头 import/re-export 块互同                                             | `types/compilation.ts` ↔ `types/renderer-core.ts` 等                                            | 探针噪声（barrel 形态），非逻辑重复                                                                                                                                                                                                                                                                                                                                                                      |
| `BuiltInActionSchema` union ↔ `FormulaAstNode` union                             | `types/actions.ts:262` ↔ `ast.ts:96`                                                            | 归一化噪声（union 类型列表形状巧合）                                                                                                                                                                                                                                                                                                                                                                     |
| nested-regions 双 sink（collector/errors）                                       | `flux-core/src/nested-regions.ts:26-54`                                                         | 2 份 ×10 行、单函数内、稳定——"为小而稳定的双份强行提取制造早熟抽象"的合法不提取情形                                                                                                                                                                                                                                                                                                                      |
| node-compiler 子编译选项装配 ×2                                                  | `flux-compiler/src/schema-compiler/node-compiler.ts:204-211,327-341`                            | 2 份 ×8 行 diagnostics/symbolTable 装配，稳定；提取收益边际（观察，不立案）                                                                                                                                                                                                                                                                                                                              |
| `supportsArgsInjection` 负名单                                                   | `flux-core/src/value-adapter.ts:71-79`                                                          | A 类排除：五个条目均为领域常量（语义上不接数据 payload 的动作类），schema 契约显式知识，非"已知会出问题的值"枚举                                                                                                                                                                                                                                                                                         |
| template.ts 反引号容忍 vs pipe 扫描器无反引号                                    | `flux-formula/src/template.ts` ↔ `pipe-syntax.ts`                                               | 语言一致性：lexer.ts:163 仅 `'`/`"` 起始字符串，表达式层无反引号字符串，pipe 扫描器与语言引号集一致；template.ts 的反引号分支是模板层文本段防御                                                                                                                                                                                                                                                          |

### 5. 范围整体判断

**零星个案，不是系统性临时方案文化。** 编译与公式层是全仓纪律最好的区域之一：字面临时标记为零、无静默吞错（8 处门禁 catch 全部有结构化路由或注释档案）、无时序贿赂、无 DOM 突袭、无测试迁就（唯一的 VITEST 键是已登记的治理机制）、14 处 baseline 类型断言候选中 13 处为合理动态边界/测试接缝/历史修复记录。沉积集中在**重复维度而非"按住"维度**：1 个无出口转正的空壳契约字段（WA-core-001）、3 个同根因重复热区（其中 2 个 ≥3 份）。所有 7 条立案均可指认被按住的根因——**根因失传：0 处**。共性模式（跨包策略块复制、校验家族手写、接缝半程收口）建议以 CX-n 承载，其余以 watch-only 登记防漂移。

## 批内修复记录（Auto-Remediation）

> roadmap 自动修复契约 §2–§4：P0/P1 单点行为缺陷先红后绿修复；P2 低成本（约 15 分钟内）当场修；
> 结构性/跨批共性发现一律不批内硬修，以 CX-n 拟制独立修改计划。每项修复验证临时方案本体已删除。
> 审计产出后，执行会话对裁定批内修的发现实施自动修复（roadmap 契约 §2-§4）；结构性/跨包共性发现以 CX-n 登记（见 §6 裁定更新）。

| 发现 ID         | 严重度 | 修复方式                                                                                                                                                                                                                                                                                                                                                                                                                            | 回归测试（先红后绿证据）                                                                                                                                                                                                                                     | 本体删除验证                                                                                                                                                                              | commit    |
| --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| WA-compiler-001 | P1     | **批内修**（两部分，均非结构性、行为保持/修复）：①`validateRootPathArray` 参数化原语落地于 rules-structural.ts，`validateDependsOnRoots` 重写为其薄封装（第 3 份收敛），reaction 两段手写循环（~80 行）替换为两次声明式调用（消息/路径/码/severity 逐字保持）；②v1 禁用四连块改表驱动，debounce/once/control 改用独立诊断码（`invalid-reaction-debounce/once/control`，flux-core `SchemaDiagnosticCode` union 增量扩展 3 个字面量） | 特征化测试先行：ignoreWritesTo not-array/entry/deep-path 与 dependsOn entry/deep-path 的码+severity+path+message 逐字断言（10 用例提取前全绿钉住现状）+ 3 个新码测试红（`invalid-reaction-immediate` 误码断言 3 failed）→ 修复后 13/13 绿；包全量 558/558 绿 | 两段手写循环已删（grep 无 `normalizeRootPath(entry) !== entry` 在 reaction 文件残留）；v1 四连复制块已删（表驱动单点）；`invalid-reaction-immediate` 发射点全仓收敛为 immediate 分支 1 处 | 本 commit |
| WA-formula-001  | P1     | CX-n（跨包 4 份提取 flux-core 共享原语，非结构性增量）                                                                                                                                                                                                                                                                                                                                                                              | 归 CX-1 plan                                                                                                                                                                                                                                                 | —                                                                                                                                                                                         | —         |
| WA-core-001     | P1     | CX-n（公共 API 删除走 deprecated-feature-cleanup 流程，结构性→执行前人工确认）                                                                                                                                                                                                                                                                                                                                                      | 归 CX-2 plan                                                                                                                                                                                                                                                 | —                                                                                                                                                                                         | —         |
| WA-core-002     | P2     | CX-n（同 CX-1 plan 内部提取，零 API 变更）                                                                                                                                                                                                                                                                                                                                                                                          | 归 CX-1 plan                                                                                                                                                                                                                                                 | —                                                                                                                                                                                         | —         |
| WA-formula-002  | P3     | watch-only                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                            | —                                                                                                                                                                                         | —         |
| WA-formula-003  | P3     | watch-only                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                            | —                                                                                                                                                                                         | —         |
| WA-compiler-002 | P3     | watch-only                                                                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                                                                                                                                                            | —                                                                                                                                                                                         | —         |

### 裁定更新（执行会话复核后落字，2026-10-11）

1. **WA-compiler-001 改码部分的人工裁决**：审计建议"改码涉诊断消费者面需人工裁决"。执行会话 consumer 分析实证：`SchemaDiagnosticCode` 全仓无非测试穷举 switch 消费（仅作 `code` 字段值类型）；新码为**纯增量 union 扩展**（不改签名/导出/包边界/编译期语义），per roadmap 契约 §7c 判定**非结构性**，mission 保护区代码变更授权覆盖，批内修复不需人工确认。既有钉住误码的测试（title 自述 "with invalid-reaction-immediate"）即 bug 的测试化记录，随修复更新断言（非放松——判别力增强：新增"immediate 码不得出现"负断言）。
2. **CX-n 合并裁定**：WA-formula-001（P1 跨包策略块）与 WA-core-002（P2 同文件三联）合并为 **CX-1**（同层复制沉积、相同验证面：flux-core+formula+compiler 三包 characterization + 五门禁）；WA-core-001 独立 **CX-2**（结构性人工确认门）。均插入 roadmap Phase Status，建议处理时机 = WA-16 收口前（不阻断后续批次线性审计）。

## 台账回写核对

- 本批新增 findings：7 条（WA-core-001、WA-core-002、WA-formula-001、WA-formula-002、WA-formula-003、WA-compiler-001、WA-compiler-002）
- modules 行翻转 audited：flux-core、flux-formula、flux-compiler
- `pnpm workaround:reconcile` 输出摘录：执行会话落账后回填（见下）
- 落账结果：reconcile exit 0，49 modules / audited 3 / uncovered 46 / findings 7 = fixed+verified 1 + found 6（去向：successor-required 3、watch-only 3）/ 未处置 0

## 附：台账行草稿（供执行会话回写 `docs/audits/workaround-code-smell/ledger.md`，status 一律 pending）

| id              | module        | category | severity | location                                                                                            | status      | disposition | note                                                                                                 |
| --------------- | ------------- | -------- | -------- | --------------------------------------------------------------------------------------------------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| WA-core-001     | flux-core     | I        | P1       | types/node-identity.ts:207-216（+ schema-compiler.ts:154,195,222 空构造）                           | pending     | CX-n        | 转正过渡字段，出生 c6a3245a2（Plan 40），全历史零填充；公共 API 删除走 deprecated 流程               |
| WA-core-002     | flux-core     | H        | P2       | value-adapter.ts:286-390 ↔ :503-599                                                                 | pending     | 排期进 plan | in/out/validate 三联 ~95 行双份；保护区 plan-first；出生 ccc4ac7ed（cq-4 Phase 2）                   |
| WA-formula-001  | flux-formula  | H        | P1       | evaluate.ts:154-181,219-246（跨包组含 flux-compiler/runtime-value-compilation.ts:164-187,:266-289） | pending     | CX-n        | 状态提交策略 4 份跨包 ~110 行；object key 检查已分叉；提取目标 flux-core 共享原语                    |
| WA-formula-002  | flux-formula  | H        | P3       | compile/pipe-syntax.ts:17-60 ↔ :66-113                                                              | pending     | watch-only  | 顶层扫描骨架 2 份 ~35 行稳定；与 lexer 引号集一致无现行分叉                                          |
| WA-formula-003  | flux-formula  | H        | P3       | builtins.ts:100-150（ARRAY\* ×6）                                                                   | pending     | watch-only  | 表状注册惯用形，零漂移；协议 P1 默认降档理由见报告条目                                               |
| WA-compiler-001 | flux-compiler | H        | P1       | schema-compiler/shape-validation-rules-reaction.ts:126-215,220-271（+ rules-structural.ts:43-95）   | found→fixed | （修复）    | 已批内修复：validateRootPathArray 收敛 3 份 + 码误标修正（独立码）；特征化+新码红→绿，包全量 558/558 |
| WA-compiler-002 | flux-compiler | D        | P3       | action-compiler.ts:121-135（对照 source-compiler.ts:13-22 接缝）                                    | pending     | watch-only  | asRuntimeValue 接缝半程收口（接缝注释宣称六处，live 仅 source-compiler 兑现）；~15 分钟修复候选      |
