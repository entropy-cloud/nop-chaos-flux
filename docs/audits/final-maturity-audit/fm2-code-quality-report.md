# FM-2 代码质量终审报告（plan 643，2026-10-18）

> 口径：`docs/skills/code-quality-audit-prompt.md` 七维度 + deep-audit 核心维度（03 契约一致性/16 文档-代码一致性/02+23 死代码相关面/19 错误传播保真度）+ adversarial 信号驱动抽查（Phase 3）。
> 方法：fresh sub-agent 分片并行（核心五包全量分片 D + 渲染器抽样/新包抽查分片 E + adversarial 分片 F），执行会话合并复核。
> 与 plan 628 / FM-0 的去重注记在各分片的 Dedup notes 与本报告汇总。

## 覆盖与抽样记录

- **全量**：flux-core、flux-compiler、flux-runtime、flux-action-core、flux-react（核心五包）。
- **抽样**：flux-renderers-data（table-virtual-body/table-editable-cell/quick-edit 族/column-settings/filter+sort hooks——理由：最大渲染器家族 + FM-0 新契约面）、flux-renderers-basic（container 新契约/flex/page/panel/slot 渲染链——641/641+ 刚改契约面）、flux-renderers-form（form.tsx/提交与校验链——并发 IME 修复按实况判读）。
- **新包抽查**：flux-renderers-content/layout/scheduling 各 1-2 个最大交互面模块（理由：最近落地的 app-level 包，审计历史最薄）。
- **未抽样包不作全维度结论**；全仓信号驱动 adversarial 抽查补覆盖。
- **排除**：xlang 域（并发领地）；plan 628 登记项（11 条核心类型债/静态债/文档缺口归 628，见各分片 Dedup notes）；ratchet 基线存量。

## Findings 汇总

| 分片                           | P0  | P1  | P2  | P3                                                     |
| ------------------------------ | --- | --- | --- | ------------------------------------------------------ |
| 核心五包（D）                  | 0   | 2   | 3   | 5                                                      |
| 渲染器抽样+新包（E）           | 0   | 0   | 3   | 9                                                      |
| adversarial（F）               | 0   | 0   | 2   | 3                                                      |
| workaround 残余复核（Phase 1） | 0   | 0   | 0   | 0（48 still-watch / 2 resolved / 0 stale / 0 revived） |

### P1（当批修复，先红后绿）

1. **P1-1 编译缓存跨实例污染**（`packages/flux-react/src/render-nodes.tsx`）：模块级缓存键缺 runtime 身份——组件与 providerPlan 均为编译期内嵌（`compiled-renderer-contract.ts:67`/`node-renderer-resolved.tsx:401`），跨 registry 复用同一 schema 对象时第二个 runtime 拿到首个 runtime 的组件与策略。**修复**：缓存改二级 WeakMap（input → runtime → entry）。**真判别测试（closure R1 后补）**：`compile-cache-runtime-identity.test.ts` 直调 `normalizeNodeInput` 断言两 runtime 各自内嵌组件——旧单级缓存实测红（临时回退实验在案）、新实现绿；`schema-renderer-compile-cache.test.tsx` 为渲染路径守卫（走 per-instance useMemo，对模块缓存无判别力，头注已说明）。
2. **P1-2 validateRegisteredChildren 裸抛击穿收敛契约**（`packages/flux-runtime/src/form-runtime-owner.ts`）：第四条 dependent-validation 入口未走 V18/M-09 诊断缝，validator 抛错直接 reject validateForm/applyChangesAndRevalidate。**修复**：套用 validateFormPath 同款 catch（AbortError 透传 + reportDependentRevalidationFailure 缝 + form-level error）。**判别**：`owner-registration-contracts.test.ts`「contains validateChild throw failures…」红→绿（旧实现 reject 必挂）。

### P2（7 条，归族裁定见 §Disposition）

### P3（14 条，归族裁定见 §Disposition）

## Disposition（三态归族）

- **当批修复**：P1-1、P1-2（上）。
- **watch-only 留观**（台账 FM-2 批登记）：P2 全部 7 条 + P3 全部 14 条——逐条 Why Not Blocking：P2-1/P2-2 属 628 §D 错误处理缺口同族无主实例（628 评审可并入）；P2-3 fragment-scope 状态机为必要复杂度热点（adversarial 分片复检结论见下）；渲染器 P2-1 ownership 误配静默（RM-11 同族，修复方向已获背书，留 FM-6 候选）；其余 P3 为局部重复/死导出/组织问题，无行为风险。
- **owned by 628**：核心分片 Dedup notes 11 条 + 错误处理同族注记。

## Adversarial

计数：0 P0 / 0 P1（两个 P1 信号热点经证伪式复核确认成立——系主报告已拥有项，处置见 P1 节）/ 2 P2 / 3 P3；2 个热点 verified-clean（fragment-scope 状态机五类攻击序列收敛、form-store summary 双路一致）。

---

## Shard D — 核心五包全量

# FM-2 code-quality audit — core five packages

- 审计口径：`docs/skills/code-quality-audit-prompt.md`（真实实现质量导向），叠加 deep-audit 核心维度（03 契约一致性 / 16 文档-代码一致性 / 02 模块职责 / 23 测试有效性 / 19 错误传播保真度）。
- 范围：`packages/flux-core/src`、`flux-compiler/src`、`flux-runtime/src`、`flux-action-core/src`、`flux-react/src` 全量（xlang 域排除）。
- 方法：实读核心源文件（runtime-factory.ts、form-store 族、form-runtime-owner/validation/submit-flow、scope.ts、schema-renderer.tsx、render-nodes.tsx、node-renderer(-resolved).tsx、use-node-source-props.ts、hook-subscriptions.ts、scope-change.ts、action-execution/runners/operation-control、action-adapter.ts、schema-compiler.ts、target-enrichment.ts、form-store(-owned).ts、contract-honesty.ts 等），辅以 grep 全量错误吞噬扫描与基线/628 归属核对。
- 日期：2026-10-18。只读审计；本文件为唯一写产物。
- 去重：plan 628（active）已登记项一律不立案，见 Dedup notes。

## Findings

计数：P0 × 0　P1 × 2　P2 × 3　P3 × 5（未含 628 已拥有项；见 Dedup notes）

---

### P1-1 模块级 compile 缓存键缺 runtime/registry 身份 → 跨实例编译产物污染

- 严重度：P1（热点设计错误 / 契约漂移，低频触发但静默出错、极难定位）
- 类别：React 桥接 / 编译缓存正确性
- 位置：`packages/flux-react/src/render-nodes.tsx:133-143`（`normalizedInputCompileCache` 定义）、`:205-212`、`:230-238`（读写点）；对照 `packages/flux-compiler/src/schema-compiler.ts:122,161,245`（compile 依赖 registry）、`packages/flux-compiler/src/schema-compiler/node-compiler.ts:519-520`（编译产物内嵌 `renderer.actionScopePolicy`/`componentRegistryPolicy` 及 `templateNode.component` 组件引用）
- 现状：`normalizedInputCompileCache` 是模块级 WeakMap（跨所有 SchemaRenderer 实例共享），键 = 输入对象身份 + `${strictMode}:${JSON.stringify(compileOptions)}`，完全不含 runtime、registry、plugins 身份；而编译产物深度依赖三者（节点上嵌着第一个 registry 的 React 组件引用与 scope/registry 策略）。
- 风险：两个 runtime（不同 registryDefinitions 或不同 plugins）对同一 raw schema 对象（模块级常量、嵌套共享子 schema、经 `canonicalizeSchemaInput` 透传保身份——`authoring-transform.ts:21,51,72` 同对象直返）做 fragment 编译时，后者命中前者缓存，渲染出前者的组件与策略，静默错渲染。触发面窄但后果是无告警的行为漂移；且 plan 628 即将实现"跨实例编译缓存"，若复用同样的弱键纪律会把该缺陷放大到主路径。
- 修复方向：缓存键补 runtime 身份（WeakMap 二级键 `runtime → input → optionsKey`），或在 CompiledTemplate/节点上打 runtimeId 标记命中校验；628 的跨实例缓存设计应直接采纳"身份键 + epoch"并以此条为判别性测试用例。

### P1-2 validateRegisteredChildren 缺错误收口，击穿 M-09/V18 "三入口收敛" 契约

- 严重度：P1（文档化契约漂移 + 高概率回归面）
- 类别：运行时逻辑 / 错误传播保真度
- 位置：`packages/flux-runtime/src/form-runtime-owner.ts:441-454`（`validateRegisteredChildren` 内 `:447` 裸 `await validatePath(...)`，无 try/catch）、`:456-481`（validateForm 主循环直接调用）；对照 `:388-435`（`validateFormPath` 对同一 `validatePath` 有完整 catch：AbortError 透传、其余走 `reportDependentRevalidationFailure` + form-level error）；`packages/flux-runtime/src/form-runtime-validation.ts:442-462,570-580`（`validateCompiledField`/`validatePath` 确认可抛非 abort 错误——用户态 `registration.validate/validateChild` 与 async rule 传输失败均裸抛）
- 现状：`validateForm` 内两条验证路径错误收口不对称——编译路径（validateFormPath）按 M-09/V18 把非 abort 异常转成 form-level error 并上报诊断缝，而 runtime-registration 子路径（validateRegisteredChildren）裸抛，直接从 `validateForm`/`applyChangesAndRevalidate` 拒绝。
- 风险：代码注释（form-runtime-owner.ts:407-419）明确声称三条 dependent-revalidation 入口全部收敛到同一诊断缝；registered-children 是第四条未收敛入口。submit 路径被 `executeFormSubmit` 顶层 catch 兜住但语义错位（validator 崩溃走 `onSubmitError` 而非 `onValidateError`，fieldErrors 不聚合）；host 直调 `applyChangesAndRevalidate`（ValidationScopeRuntime 公共面）则收到裸 rejection。后续任何人按注释理解 validateForm 的错误语义即中招。
- 修复方向：给 `validateRegisteredChildren` 的 `validatePath` 调用套用 validateFormPath 同款 catch（AbortError 透传 + reportFailure + form-level error），并把注释里的"三入口"改成准确清单。

### P2-1 失效 monitor 层遗留四处死遥测接线，错误对象在 dependent-revalidation 失败路径降级为纯字符串

- 严重度：P2（错误传播保真度 / 概念残留）
- 类别：契约漂移 / 死代码族
- 位置（同一族，四处）：
  1. `packages/flux-runtime/src/form-runtime-values.ts:26-48`——`createDependentRevalidationFailureHandler` 的 `onError?: (payload: ErrorMonitorPayload) => void` 参数全仓无一处传入（唯一两个工厂调用点 `runtime-owned-factories.ts:248-251,303-306` 只传 `notify`），是死参数；实际效果：诊断只发 `env.notify('error', message)`，error 对象/栈/phase/details 全部丢弃。
  2. `packages/flux-core/src/utils/import-failure.ts:15-31`——`reportImportFailure` 接受 `imports/nodeId/path/phase/reason` 五个参数全部忽略，只 notify message 字符串。
  3. `packages/flux-core/src/utils/runtime-host-reporting.ts:3-28`——`RuntimeHostIssueInput` 的 `phase/nodeId/path/details/monitor` 字段注释自认"保留兼容性，当前不再转发到 monitor（monitor 已移除）"，纯摆设。
  4. `packages/flux-core/src/types/renderer-api.ts:195-201`——`ErrorMonitorPayload` 导出类型仅剩死参数与注释引用（plugin.onError 是唯一活通道）。
- 风险：遥测半通道化——用户 toast 有，host 遥测对象丢失；四处死面持续诱导后续开发者把遥测接回不存在的 `env.monitor`（form-runtime-owner.ts:407-419 注释就写着"routed through env.monitor.onError + env.notify"，与 monitor 已移除的事实相悖，见 P2-3 关联注记/16 维度）。
- 修复方向：二选一收敛——要么在 RendererEnv 上立一个真实的 `onError` 遥测缝并把四处接上，要么删掉死参数/死字段/死类型并修正注释；不要维持"参数在、接线无"的状态。

### P2-2 form-runtime.setValues 顶层 catch 仅 console，绕过全部上报通道

- 严重度：P2（错误吞噬）
- 类别：错误传播保真度
- 位置：`packages/flux-runtime/src/form-runtime.ts:581-596`（`:593-595` `executeSetValues(...).catch((error) => console.error('[form-runtime] executeSetValues unexpected error:', error))`）
- 现状：`executeSetValues` 内部的 dependent-revalidation 失败已按缝上报，但函数体其余部分（applyFieldValuePatch、batchUpdate、external-errors 重建）若抛出，唯一处置是 console.error——无 notify、无 monitor、无 async-governance 记录。同文件 `setValue`（:574-578）与 executeSetValues 内部（form-runtime-values.ts:137-143）都有缝化处理，唯独这个顶层兜底例外。
- 风险：生产环境 console 不可见（或被采集忽略），setValues 失败对终端用户与遥测双双静默；与 M-09 明确确立的"console-only 不是上报"的仓库口径不一致。
- 修复方向：该 catch 改走 `reportRuntimeHostIssue`（notify + 预留遥测字段）或复用 `reportDependentRevalidationFailure` 缝；至少补一条判别性测试。

### P2-3 RenderNodes 的 fragment-scope 版本状态机：三 ref + 两 state + 微任务延迟处置的手工同步机

- 严重度：P2（复杂度热点，真实维护成本；底层约束成立，非机械判坏味道）
- 类别：复杂度热点 / React 桥接
- 位置：`packages/flux-react/src/render-nodes.tsx:342-489`（`fragmentScopeVersion`/`committedFragmentScopeVersion` 两 state + `pendingFragmentScopeVersionRef`/`fragmentScopeVersionRef`/`committedFragmentScopeVersionRef`/`activeFragmentScopeOwnerRef` 四 ref + 两个 layout effect + 一个带 `queueMicrotask` 防重复处置的卸载 effect）；配合 `:523-525`（scope 未提交前整树渲染 null）与模块级 `fragmentScopeCacheByRuntime`（:92-106）
- 现状：为满足"store 不能在 render 期创建 + StrictMode 双挂载安全 + 同 key 立即被兄弟重用时不误删"三重约束，手工实现了一个 pending/committed 双相版本同步机。每条约束都有真实来源（React 并发渲染契约、StrictMode 语义），判定为必要复杂度接近上限，而非失控：但版本字段有 5 个、状态迁移分散在 4 个 effect，无单一状态文档。
- 风险：任何对 RenderNodes 的后续改动（比如 628 给编译缓存加 epoch）都要同时推理 5 个版本变量与微任务时序；这是全仓最容易出现"改一处、破一处"的渲染桥接热点。当前无注释把这五个字段的状态机画出来。
- 修复方向：在文件头补一段状态机说明（状态、迁移、不变量），并把"pending→committed"收敛为单一 useReducer；不要求行为变更。

### P3-1 CompiledCidState 大半字段是只写死状态

- 严重度：P3（观察项）
- 类别：死代码 / 概念残留
- 位置：`packages/flux-core/src/compiled-cid.ts:3-9`；`packages/flux-compiler/src/schema-compiler/target-enrichment.ts:61-118`；`packages/flux-runtime/src/runtime-factory.ts:98,318-321`
- 现状：`nextCid` 从不自增（全仓仅两处读、零处写）、`byId`/`idPaths`/`duplicateIds` 只被 clone 后 attach 回节点、无任何消费方；唯一活着的语义是 `nextTemplateNodeId` 每次编译重排。`allocateMountedCid` 用的是 factory 本地计数器，与 cidState 完全独立。
- 风险：误导（"cid 全局唯一"的暗示不成立）+ 每次编译白 clone 三份 Map；内存影响小（同编译所有节点共享一个 state 对象）。
- 修复方向：trim 成 `{ nextTemplateNodeId }` 或删除 clone，只保留 duplicate-id 诊断所需局部状态。

### P3-2 sanitizeSnapshot 的深度清洗被危险键门控，常态下休眠

- 严重度：P3（不一致观察项）
- 类别：运行时逻辑 / 语义一致性
- 位置：`packages/flux-runtime/src/scope.ts:89-152`（`:98` 无危险键即整对象原样返回；`:143` 嵌套层同样门控）
- 现状：NaN/Infinity→null、Date→ISO、Map/Set→数组的规范化只在同层存在 `__proto__` 族键时才执行；普通快照（99.9% 的情形）完全不做深度清洗。原型污染防护本身是对的，但深度清洗与其耦合在同一开关上语义含混。
- 风险：低——表达式层对 NaN 宽容；主要是"这个函数声称做什么"与"它实际做什么"的漂移，后来者可能依赖清洗行为。
- 修复方向：拆分 `defangPrototypeKeys` 与 `normalizeValues` 两个关注点，或注释明确"深度清洗仅在危险键出现时付费"是刻意的性能取舍。

### P3-3 RendererRuntime.createValidationScopeRuntime 公共契约比实现窄

- 严重度：P3（契约宽度漂移）
- 类别：类型与契约
- 位置：`packages/flux-core/src/types/renderer-core.ts:322-328`（`parentScope: ScopeRef` 必填）vs `packages/flux-runtime/src/runtime-owned-factories.ts:94-103`（实现侧 `parentScope?: ScopeRef` 可选）、`:187-193`（第一方 page-root 路径就不传 parentScope）
- 现状：公共类型要求必传 parentScope，而 flux 自己创建 page 校验域时不传；TS 因参数逆变恰好通过。
- 风险：外部调用方按类型被迫构造 parentScope，或困惑于"必填"与官方用法的矛盾。
- 修复方向：公共类型改 `parentScope?`，或 page 路径补传 `$root` scope，二选一。

### P3-4 匿名表单 formId 默认值可碰撞

- 严重度：P3（边界观察项）
- 类别：运行时逻辑
- 位置：`packages/flux-runtime/src/form-runtime.ts:91`（`id ?? \`${parentScope?.id ?? 'scope'}-form\``）
- 现状：同一 parentScope 下创建两个未命名表单（或无 parentScope 的两个匿名表单）得到相同 formId；formId 兼作 scopeId、`sourceScopeId`、owned-store 字段态前缀（form-store-owned.ts:21,74-76）。
- 风险：共享 existingStore 的场景下字段态命名空间互串、诊断 ownerId 不可区分。常规 schema 流每表单有唯一 id，触发面窄。
- 修复方向：默认 id 拼接随机段（runtime-factory 已有同款先例）或注册时查重。

### P3-5 excludeHiddenFieldPaths 对数组元素置 undefined 而非剔除，提交载荷含 null 洞

- 严重度：P3（数据形状观察项）
- 类别：运行时逻辑
- 位置：`packages/flux-runtime/src/form-runtime-submit-flow.ts:187-227`（`:197-204` 数组分支置 undefined；`:216-220` 仅对象键被剔除）
- 现状：隐藏字段剔除对对象键是"删除"，对数组元素是"留位undefined"（序列化后成 null），且后续元素仍按原始索引命名路径。
- 风险：host 后端若按"无该字段"语义处理会收到 null；数组索引语义与路径命名绑定，属实现权衡而非明显错误。
- 修复方向：在 flux-guide/15 或 submit 契约文档写明数组元素语义，一行即可。

## Deep-audit core dimensions

### 03 契约一致性（deep-audit 03）

- **结论：公共类型面整体诚实、集中（`flux-core/src/types/` 单点导出），但存在三处宽度/身份漂移**：P1-1（compile 缓存键与"编译产物绑定 registry"的隐含契约不符）、P3-3（createValidationScopeRuntime 必填宽度）、P2-1 族（ErrorMonitorPayload 死参数面）。`registerRendererReaction` 类型（renderer-core.ts:377-385）与 factory 实现（runtime-factory.ts:483-502 多传一个 `runtime` 字段）结构兼容，无实质漂移。
- 正面锚点：`contract-honesty.ts`（469 行）把"声明契约必须被实现引用"做成可测纯函数（stripComments + 事件通道/能力句柄锚定正则），是全仓对付契约漂移最有效的自研基建。
- `runtime-host-projection-scope`、`RendererComponentProps`（props/meta/regions/events/reactions/helpers 五通道）在 renderer-core.ts、node-renderer-resolved.tsx、docs/references/quick-reference 三处口径一致，抽测无漂移。

### 16 文档-代码一致性（deep-audit 16）

- **结论：代码内注释与 live 行为的吻合度显著高于一般仓库**——抽验 AUDIT-14/15（form-runtime-owner.ts:103-107,310-313）、plan 552（form-runtime.ts:151-169、scope.ts:258-268）、P12/P14（scope.ts:285-306、hook-subscriptions 相关）、RM-7（schema-renderer.tsx:154-163）均与实现一致。**唯一实锤失配**：`form-runtime-owner.ts:411` 注释仍写 "env.monitor.onError + env.notify"，而 monitor 通道已移除（runtime-host-reporting.ts:9 自认 "monitor 已移除"；RendererEnv 无 monitor 成员，仅 ExpressionExecutionEnv 保留 expression 相位）——该注释归入 P2-1 收口。
- `flux-guide/15-error-handling.md` 自认的 5 个缺口与 live 代码核对成立（其中 action-execution.ts onSettled catch :608-618 已有 notify，但 onSettled 子链内"失败结果"（非 throw）因 `reportUnhandledFailureClass` 的合成事件名单（:186-188, :574-575）仍被静默——与 628 D③/D⑤ 描述吻合，owned by 628）。
- 628 D 节其余项（schema-renderer strict 覆盖 :75-112、reportActionError 空 catch :127-144、渲染期 throw 仅 console、reportUnhandledFailureClass 硬编码名单）逐条在 live 代码核实存在，均 owned by 628。

### 02 模块职责（deep-audit 02）

- **form-runtime 家族是全仓职责拆分最好的部分**：form-store（事实存储）/ form-store-owned（命名空间组合视图）/ form-runtime-owner（验证所有权）/ form-runtime-values / -validation / -submit-flow / -array-ops 各自单一职责、依赖单向，649-691 行的大文件是横向分散而非纵向上帝对象——判定为必要复杂度。
- **runtime-factory.ts（670 行）组装热点** owned by 628（宽门面 + 无跨实例缓存）。补充观察：四处 `*Ref` 后向引用（runtimeRef/actionDispatcherRef/executeSourceRef/runtimeNodeResolverRef）属工厂互指的必要模式，初始化前访问有明确 throw 文案，不算坏味道。
- **RenderNodes 三重职责**（输入归一化+编译缓存、fragment scope 缓存、版本状态机）见 P2-3；`action-execution.ts` 头部有明确的"评估过、不拆"决策记录（plan 444/02-N2，:38-45），管线链路 dispatch→debounce→retry→timeout→runners 可读，尊重该裁决。
- flux-compiler 根目录 23 个 `*.test.ts` 未归位 `__tests__/`（`__tests__/` 已存在且仅 5 文件）——owned by 628（C 节"结构不一致"）。

### 23 测试有效性（deep-audit 23，记录面 — 归 FM-3/FM-4 展开）

- schema-renderer 的 runtime/page 创建失败路径（P0 级 UX 承诺，628 FP-1）当前**没有端到端测试**钉住：`__tests__/error-boundary.test.tsx` 只直接渲染 `SchemaRootError` 组件本身，未触发真实创建失败 → 守卫不可达（见 Dedup notes 第 1 条行为证据）从未被任何测试暴露。
- `render-diagnostics-fail-fast.test.tsx` 钉住了 normalizeNodeInput fail-fast；validation 族有 owner 级测试文件（未逐一展开）；flux-compiler 测试量大（根目录 23 文件含 400-666 行的契约探索测试），有效性评估移交 FM-3/FM-4。
- P1-1（缓存身份键）当前无判别性测试，属"关键测试缺失"面，建议随 628 编译缓存工作一并补。

### 19 错误传播保真度（deep-audit 19）

- **结论：整体保真度高于典型前端运行时**。正面机制（逐条实读核实）：action 管线 `caughtFailureResults` WeakSet 标记 + 无诊断通道时 notify 兜底（action-execution.ts:199-212）；runner 层 thrown error 附着 namespace/sourceScopeId 元数据（action-runners.ts:28-43）；withRetry/withTimeout 全程 abort 传播 + attempts/failureCount 元数据保真（operation-control.ts）；async-data 族统一走 `reportRuntimeHostIssue`（notify 通道）且 silent 模式有门控；reaction 失败 settle 进 async-governance 且 dispatch 内层已有 reportUnhandledFailureClass 兜底；submit 流 lifecycle handler 自失败并入 settledError 不吞（form-runtime-submit-flow.ts:104-135）。
- 缺口（本报告立案）：P1-2（registered-children 裸抛）、P2-2（setValues console-only）、P2-1 族（遥测对象降级字符串/死接线）。
- 空 catch 全量扫描结论：五包未命名 catch 共 15 处，逐一核对均为正当防御性回退（localStorage/URL/序列化/事件方法调用/探针求值），且大多带路由注释——无新增立案。

## Overall Assessment

**质量高的部分及原因**：

1. **form-runtime/form-store 族**（flux-runtime）：所有权模型、生命周期门控（AUDIT-14）、防抖/中止/generation 失效判据、错误去重键、external-errors 叠加，全部有判据、有注释、有测试锚点；复杂度来自问题本身（表单验证语义），组织方式是"按职责横向拆"而非堆积。
2. **scope.ts 可见视图**：原型链组合视图 + 命中缓存 + 父变更 shadow 短路 + 危险键防护，是在正确性约束下把性能做满的实现；plan 552 修复注释与实现严格对应。
3. **action 管线**（flux-action-core）：debounce/retry/timeout/parallel/then/onError/onSettled 的正交组合清晰，abort 全程贯通，错误分类（cancelled/timedOut/failureHandled/failureHandled 标记）语义自洽。
4. **契约防漂移基建**：contract-honesty + finite-prop-contracts + renderer-metamodel-residue + depcruise 环形/跨包源码导入规则，构成同类仓库少见的自检网。
5. 注释文化：几乎所有非显然实现都带 plan/审计编号溯源，且抽验吻合率高（16 维度）。

**风险高的部分及原因**：

1. **编译缓存的身份键纪律**（P1-1）：现有一处模块级缓存缺 runtime 身份，而 628 马上要建更大的跨实例缓存——同一类错误在主路径重演的代价是静默错渲染。这是本次审计最高优先的前瞻性风险。
2. **文档化错误契约的完整性**（P1-2/P2-2/P2-1）：错误传播的"缝"体系（reportFailure/notify/reportRuntimeHostIssue）设计良好，但存在一条未收敛入口、一个 console-only 兜底、一族死遥测接线；这类缺口的特点是平时无感、故障时丢现场。
3. **RenderNodes 版本状态机**（P2-3）：必要复杂度已接近无文档可维持的上限，是渲染桥接层最脆弱的改动热点。
4. （628 已拥有）schema-renderer 失败态、宽门面、依赖归一化双写——结构性类型债已在册，本次核实均仍存在于 live code。

## Automation

### 已有且有效（继续保留）

- `audit:deps`（dependency-cruiser：no-circular、no-cross-package-src-imports、no-app-to-package-internals）——分层与封装的机器防线。
- 七类 scanner count-ratchet（scanner-baselines.json，含 async 无失败路径、as-any、todo-exitless 等）+ knip/duplicates/console-log 基线 + oversized-files：防增有效（注意：count-only ratchet 只封增量，不评估存量严重度）。
- `contract-honesty` 族 + `check:schema-prop-coverage` + `check:finite-prop-contracts`：契约漂移的自研检测，全仓最有价值的自制门禁。
- `audit:mutants`（Stryker，runtime 配置）、semgrep、react-doctor：已配置（本次未评估运行效果，归 FM-4）。

### 建议补充（高 ROI）

1. **depcruise 显式 react-free 层规则**：`flux-core/flux-compiler/flux-action-core/flux-runtime from react/react-dom` 禁止。当前该不变量只靠 pnpm 隔离 + manifest-deps 间接保证（本次实测四包 `from 'react'` 零命中），一条规则即可把架构意图变成机器断言。
2. **编译缓存身份键判别性测试**：两个不同 registry 的 runtime 编译同一 schema 对象必须得到不同节点（组件引用不同）。先钉 P1-1 现状，再随 628 跨实例缓存升级为身份键 + epoch 的守卫。
3. **错误吞噬 lint 规则**：`flux-runtime/flux-react` 内 `catch` 体仅含 `console.*` 且无 `notify`/`report*` 调用 → 告警（基线登记存量）。本次 P2-2 类问题可机检。
4. **schema-renderer 创建失败集成测试**：真实触发 createRendererRuntime throw，断言 SchemaRootError 可达。当前守卫不可达（见 Dedup notes）正因缺此测试。

### 不应过度依赖

- 覆盖率百分比：不区分断言强度；form-store 族高覆盖不等于 P1-2 类路径级缺口可见。
- count-only ratchet 的"达标"：基线内存量（如 41 处 as-any、330 处 async 无失败路径）不因达标而免审。
- 文件行数门禁：649-691 行的 form-runtime 族是合理横向拆分，行数红线（500 WARN）在此处会产生错误信号；应结合职责评判（628 已采此口径）。

## Dedup notes（628 归属，未立案）

1. **schema-renderer.tsx 失败态类型伪造**（`undefined as unknown as` ×3，:229/:246/:258）——owned by 628（A 节 / FP-1）。**补充行为证据供 FP-1 修复参考**：守卫 `if (creationErrorRef.current) return <SchemaRootError/>`（:464-466）在主失败路径上**不可达**——`:322` `props.parentScope ?? page.scope` 与 `:327` `runtime.createActionScope` 在守卫之前无条件执行，`page`/`runtime` 为 undefined 时先抛 TypeError，错误卡片 UI 根本渲染不出来（仅 `prepareError` 路径可达同类 UI）。628 的判别联合改法会一并消除，但 FP-1 的验收应包含"创建失败时 SchemaRootError 实际可达"（对应 Automation 建议 4）。
2. **flux-core runtime.ts:590 `renderSurface: any`**——owned by 628（A 节），live 核实仍在。
3. **flux-react 双重断言 19 处**——owned by 628（A 节）。
4. **test-support-runtime.tsx devDep 耦合**（:12 引 flux-compiler）——owned by 628（A 节）。
5. **action-adapter.ts:27 flux-i18n 耦合**（`import { t } from '@nop-chaos/flux-i18n'`，实读核实 :27、:429、:433、:442、:457、:460、:469）——owned by 628（A 节）。
6. **依赖集归一化双写**——owned by 628（A 节）。补充证据：两份实现不仅重复，且**归一化语义不同**（flux-react `hook-subscriptions.ts:41-83` 用 `parsePath(trimmed).join('.')`；flux-runtime `scope-change.ts:96-116` 用 `normalizeRootPaths`），同一声明依赖在两侧可能归一出不同键——这正是 628 要求收敛的实质风险，收敛时应统一到单一归一化函数。
7. **RendererRuntime/FormRuntime 宽门面**（renderer-core.ts:242-404 约 47 成员；runtime.ts FormRuntime 约 40 成员；runtime-factory.ts 670 行组装）——owned by 628（A 节 + 拆装目标）。
8. **runtime-factory 编译无跨实例缓存**（runtime-factory.ts:240-242 纯转发；schema-renderer.tsx:72-133 仅实例内 useMemo）——owned by 628（A 节 + 缓存目标）。注意与 P1-1 的关系：628 建缓存时应直接吸收 P1-1 的键纪律要求。
9. **628 D 节错误处理 5 缺口**（strict 覆盖开关、reportActionError 空 catch、onSettled 静默、渲染 throw 仅 console、合成事件名单硬编码）——owned by 628；本审计在 16/19 维度逐条 live 核实存在，其中 onSettled 静默的确切机制是"失败结果 + 合成事件名单抑制 notify"（action-execution.ts:186-188,574-575），供 628 修复定位。
10. **flux-compiler 根目录测试未归位**（23 个根级 \*.test.ts）——owned by 628（C 节）。
11. ratchet 存量（scanner-baselines 七类计数、knip-baseline 949、duplicates 597）内的既有条目均未作为新发现立案；本报告 findings 与上述基线无重叠。

---

## Shard E — 渲染器抽样 + 新包抽查

# FM-2 code-quality audit — renderer sampling + new packages

> Auditor: FM-2 shard E (fresh session), 2026-10-18. Scope: renderer sampling + new-package spot check, per `docs/skills/code-quality-audit-prompt.md` with deep-audit core dimensions (contract drift / dead code / error swallowing) overlaid. §5/§7 recorded as observations only (annotation belongs to FM-3/FM-4). Read-only audit; sole written artifact is this file.

## Sampling record

Rationale (adjudicated upstream): data/basic/form are the largest renderer families carrying the post-FM-0 contract surface; content/layout/scheduling are the newest app-level packages with the thinnest audit history.

| Package                   | Files read (live)                                                                                                                                                                                                                                                                                                                               | Selection reason                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-data       | `table-renderer/table-virtual-body.tsx`, `table-renderer/table-editable-cell.tsx`, `table-renderer/table-quick-edit-cell.tsx`, `table-renderer/table-quick-edit-controller.ts`, `table-renderer/column-settings-state.ts`, `table-renderer/table-column-settings.tsx`, `table-renderer/use-table-filter.ts`, `table-renderer/use-table-sort.ts` | Mandated sample. FM-0 files (`use-column-resize.ts` / `fixed-columns.ts` / `table.css` / `table-renderer.tsx` main body) excluded per brief.                                                                               |
| flux-renderers-basic      | `container.tsx`, `flex.tsx`, `page.tsx`, `utils.ts`, `status-hooks.ts`, `structural-loop-scratch.ts`; slot/region chain read at the owner level: `flux-react/src/render-nodes.tsx` (+ `resolveRendererSlotContent` / `hasRendererSlotContent` consumers)                                                                                        | Mandated sample. "Panel family" does not exist in basic (only a11y tab-panel roles in tabs.tsx; `PanelRenderer` lives only in report-designer-renderers) — container/flex/page are the structural family actually present. |
| flux-renderers-form       | `renderers/form.tsx`, `renderers/form-init-action.ts`, `renderers/form-load-action.ts`, `renderers/form-lifecycle-helpers.ts`, `renderers/form-rules.ts`, `schemas.ts` (FormCrossFieldRule), `renderers/form.schema-validator.test.ts` (coverage probe)                                                                                         | Mandated sample. No `use-form-submit` hook exists; the submit/init/load lifecycle hooks (`form-init-action.ts` / `form-load-action.ts`) are the "use-form-submit 类" family in live code.                                  |
| flux-renderers-content    | `carousel.tsx`, `sanitize.ts`, `html.tsx`                                                                                                                                                                                                                                                                                                       | Carousel = largest timer/race interaction surface (autoplay + pause sources + IntersectionObserver + registry handle); sanitize/html = the package's security-relevant surface.                                            |
| flux-renderers-layout     | `wizard-renderer.tsx` (677 lines, largest file in package)                                                                                                                                                                                                                                                                                      | Largest interaction face: guard dispatch, two-layer state, commit lock, capability handle.                                                                                                                                 |
| flux-renderers-scheduling | `gantt/gantt.tsx` (675 lines), `shared/scheduling-event-ctx.ts`, `gantt/gantt-store.ts` (revision/destroy contract probe)                                                                                                                                                                                                                       | Gantt = largest and most interaction-dense family (drag/zoom/undo/keyboard/links); shared event-ctx is the package-wide dispatch contract.                                                                                 |

Live-state note: `packages/flux-renderers-form/src/renderers/form.tsx` carries an uncommitted concurrent-session diff (IME fix). Judged as-is: the working tree adds `isComposing || keyCode === 229` guard at the Enter-submit path (form.tsx:520-525); the guard is correct and placed before `preventEnterSubmit`/defaultPrevented checks. No finding raised against it.

Working-tree check: only form.tsx (+ its test), vite.config, playwright.config, docs are modified; everything else read is committed state.

## Findings

Counts: **P0 = 0, P1 = 0, P2 = 3, P3 = 9.**

### P2-1 — Table filter/sort ownership: read/write guard mismatch leaves `scope`-without-path silently dead, missing the RM-11 degrade+warn standard

- 严重度: P2 (one adjudication away from P1 — RM-11 already ruled the identical semantics a defect for tabs)
- 类别: 运行时逻辑 / 契约漂移 (contract drift vs ownership primitive standard)
- 位置: `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts:63-71, 88-100`; `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:139-155, 168-181, 226-237, 272-280`
- 现状: Read side merges on `filterOwnership === 'scope'` / `sortOwnership === 'scope'` alone (filter: `scopeFilterState ?? {}`; sort: `scopeSingleSort ?? {column:'',direction:null}` / `scopeMultiEntries ?? []`), while `useOwnershipScopeValue` internally activates only on `ownership === 'scope' && Boolean(statePath)` (`packages/flux-react/src/ownership.ts:76`). With `filterOwnership:'scope'` but no `filterStatePath`, filter reads are permanently `{}` while `commitFilters` writes into `setLocalFilterState` — a dead local state the read path never sees. With `sortOwnership:'scope'` but no `sortStatePath`, writes are skipped entirely (both branches gated on `&& sortStatePath`) — sort clicks fire `onSortChange` but table sort state stays empty forever. Neither hook calls `resolveOwnershipMode`, so neither gets the one-shot dev warn.
- 为什么重要: RM-11 (plan 613) established the canonical semantics — "scope 无 statePath 降级 local + 一次性 dev warn" — and its closure record (613-rm11-ownership-unification-plan.md:185) explicitly labels the old tabs behavior under the same combo a "silent no-op defect (un-recoverable control)" and fixed it. The two table hooks kept pre-RM-11 hand-rolled resolution: reads were migrated onto `useOwnershipScopeValue` but ownership resolution and the write channel were not routed through the primitive, so the degrade+warn semantics were not carried. A schema author gets zero signal; the UI just never reflects filter/sort changes. Sort even has a DEV warn for the sibling misconfiguration (`multiSort`+controlled without entries, use-table-sort.ts:142-149) but not for this one.
- 修复方向: Route `sortOwnership`/`filterOwnership` resolution through `resolveOwnershipMode` (degrade to local + one-shot warn when the path is missing) and align the read-side merge guards with the resolved mode; pin with a discriminating test asserting the warn + local-degrade behavior (mirror of the tabs fix and `list-pagination-infinite.test.tsx:134` precedent).

### P2-2 — Surface submit-hook failures swallowed to console.warn only

- 严重度: P2
- 类别: 错误传播保真度 (error swallowing)
- 位置: `packages/flux-renderers-form/src/renderers/form.tsx:229-237` (`triggerSurfaceSubmitHook`, inside the lifecycle-registration effect 190-335)
- 现状: When a form with `submitScope: 'surface'` finishes submit, the enclosing surface's `submit:success`/`submit:error` hooks run via `surfaceRuntime.triggerHook`; a hook that returns `{ok:false}` or rejects is reduced to `console.warn('[form] surface submit hook failed:', ...)`. No `env.notify`, no `monitor.onError`, no `reportRuntimeHostIssue` (the seam used 30 lines away by `reportFormInitActionError` in form-lifecycle-helpers.ts:92-106), no surfaced state.
- 为什么重要: The surface submit hook is the documented place where hosts close the dialog/drawer after submit (surface-lifecycle-callbacks.md). If it fails, the user-visible flow silently diverges (dialog stays open / success path continues as if the hook ran), and host telemetry sees nothing. This is not one of the five error-handling gaps owned by plan 628 §D (those cover strict diagnostics, onActionError self-failure, onSettled, render-throw, reportUnhandledFailureClass) — it is an adjacent, unowned instance of the same class.
- 修复方向: Route the failure through `reportRuntimeHostIssue` (phase 'action', path = form path) and optionally a `notify` downgrade; add a test asserting the failure is observable outside console.

### P2-3 — `RendererRenderOutput = unknown` forces a cast shim at every consumer: 32 hand-rolled `asReactNode` copies

- 严重度: P2
- 类别: 类型契约 / 重复实现 (framework-level concept duplication)
- 位置: Contract root: `packages/flux-core/src/types/renderer-core.ts:91` (`export type RendererRenderOutput = unknown`) and `:76/:203` (region handle `render(): RendererRenderOutput`). Consumer copies (32, all in business src): e.g. `packages/flux-renderers-basic/src/utils.ts:3`, `flux-renderers-data/src/crud-renderer-delegate.ts:6` + 5 more local copies in the table-renderer dir, `flux-renderers-layout/src/wizard-step-helpers.ts:35` + 4 file-local copies in the same package, `flux-renderers-content/src/cards-renderer.tsx:21`, `flux-renderers-form-advanced` × 6, `spreadsheet-renderers`, `word-editor-renderers`, `pivot`, `graph`, `dashboard` × 2, `industrial`, `flow-designer-renderers`, `report-designer-renderers`, `flux-react/test-support-*` × 2.
- 现状: Every renderer that renders a region (`props.regions.x.render()`) must launder `unknown` into `React.ReactNode`; each package (often each file) redefines the same 3-line cast shim with varying signatures (`unknown` vs `RendererRenderOutput`), some exported, some private.
- 为什么重要: This is concept duplication at the type-contract level: one framework decision (`unknown`) is paid for by 32 per-consumer shims that have already drifted in shape and visibility. Any future hardening of the render-output type (e.g. excluding `string[]` or adding brand) must be replicated 32 times; the shims are exactly the kind of boundary casts that defeat the type system at the framework's most-used seam. Plan 628 §A tracks `as unknown as` counts and the `renderSurface: any` debt but does not own this.
- 修复方向: Type the region-handle output as `React.ReactNode` (or `ReactNode | Promise<ReactNode>` if async needs it) in flux-core, or ship the single canonical `asReactNode` from `@nop-chaos/flux-core`/`flux-react` and delete the 32 copies; ratchet with a grep check forbidding new local `function asReactNode` definitions.

### P3-1 — Dead re-export in table-column-settings

- 类别: 死代码
- 位置: `packages/flux-renderers-data/src/table-renderer/table-column-settings.tsx:277` — `export type { RendererComponentProps };`
- 现状: The module's only consumer (`table-renderer.tsx:23`) imports `TableColumnSettings` only; the re-export has zero consumers in src.
- 风险: Noise; may or may not sit inside the registered knip export baseline (949 entries) — flagging for the FM-4 baseline triage rather than as a fresh surface claim.
- 修复方向: Delete the line (subject to knip-baseline reconciliation).

### P3-2 — Checkbox toggle duplicates the cell-save pipeline with divergent error handling

- 类别: 重复实现
- 位置: `packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx:355-408` (`toggleCheckbox`/`commitToggle`) vs `:257-331` (`commit`)
- 现状: ~40 lines of generation-guard + snapshot + dispatch + merge + notify copied from `commit`. Already diverged: the checkbox path never calls `setError` (no inline error surface, unlike text/number/select/date paths) and skips the unchanged-value short-circuit.
- 风险: Next change to the save contract (e.g. new failure payload) must be made twice; the divergence is undocumented.
- 修复方向: Extract a shared `runCellSave(nextValue)` used by both paths, parameterizing the post-failure UI.

### P3-3 — Twin draft-scope ScopeRef overrides (controller vs editable cell)

- 类别: 重复实现 / 可维护性
- 位置: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:141-240` (`draftRowScope`) vs `packages/flux-renderers-data/src/table-renderer/table-editable-cell.tsx:78-161` (`createCellDraftScope`)
- 现状: Two ~80-line ScopeRef override implementations with comments asserting "identical draft-store semantics", already semantically diverged: the controller supports `$slot.record` whole-object writes in `update()` (controller.ts:227-234); the cell version does not.
- 风险: Draft-scope contract changes must be replicated; divergence is silent because the "identical" comments assert what is no longer true.
- 修复方向: Extract a parameterized `createDraftRowScope(rowScope, draftRecordRef, field)` into the controller module (it already exports the shared store factory) and consume from both.

### P3-4 — Dead parameters and dead locals in form lifecycle scope factory

- 类别: 死代码
- 位置: `packages/flux-renderers-form/src/renderers/form-lifecycle-helpers.ts:3-77`
- 现状: `createFormLifecycleScope(scope, importBindings, _formName, _getFormValues)` — `_formName` and `_getFormValues` are accepted and ignored (both call sites in form.tsx:161-180 still compute and pass a values getter); local `visibleView`/`materialized` are assigned in `readVisible()`/`materializeVisible()` and never read.
- 风险: Signature suggests behavior (form-name scoping, values mirror) that does not exist; misleads maintainers and costs an allocation per call.
- 修复方向: Drop the two parameters and the two dead locals, or implement what the signature advertises.

### P3-5 — Identity-forwarding shim status-hooks.ts

- 类别: 死代码 / 抽象失衡
- 位置: `packages/flux-renderers-basic/src/status-hooks.ts:1-10`; consumers `page.tsx:28`, `tabs.tsx:29`
- 现状: The module re-exports `useStatusPathPublication` from flux-react with an identical signature and zero added behavior.
- 风险: One more indirection layer with no contract of its own.
- 修复方向: Import from `@nop-chaos/flux-react` directly and delete the file.

### P3-6 — Unknown cross-field rule kinds silently dropped

- 类别: 错误吞噬 / 契约漂移
- 位置: `packages/flux-renderers-form/src/renderers/form-rules.ts:11-28` (`toValidationRule` default → `undefined`); type at `packages/flux-renderers-form/src/schemas.ts:13-23`
- 现状: At the JSON schema boundary an unrecognized `rule` value (typo or future kind) yields `undefined` and is skipped without any warn; `form.schema-validator.test.ts` contains no coverage for `rules`. Sibling surfaces (table editable/quick-edit config resolution) warn-once on invalid declarations.
- 风险: Author believes a cross-field rule is enforced; the form silently submits without it.
- 修复方向: `warnOnce` on unknown kinds (mirroring `gd-cell-edit-no-editor`) and add a schema-validator case.

### P3-7 — Asymmetric result unwrapping between the with-action and default submit-success paths

- 类别: 契约漂移
- 位置: `packages/flux-renderers-form/src/renderers/form.tsx:265-277`
- 现状: With `onSubmitSuccess`, the surface hook payload is `r.ok ? r.data : result` when `r` has `ok`, else `result?.data`; without an action, it is `result.data` when `data` in result, else `result`. For an action returning a plain object without `ok`/`data`, path A sends `undefined`, path B sends the object itself.
- 风险: Surface hooks receive differently shaped payloads depending on whether an (otherwise transparent) success action is declared.
- 修复方向: Unify on one unwrap function for both branches.

### P3-8 — Capability `invoke` signature forces garbage-arg laundering

- 类别: 类型契约
- 位置: `packages/flux-renderers-form/src/renderers/form.tsx:391`, `packages/flux-renderers-layout/src/wizard-renderer.tsx:382`, `packages/flux-renderers-data/src/crud-renderer-ownership.ts:241` — all `capabilities.invoke(method, payload, {} as never)`
- 现状: The production call sites must pass a third argument typed `never`, so every caller writes `{}` with a `as never` cast.
- 风险: The signature communicates "this argument must not exist" while requiring it; new capability consumers will copy the laundering pattern.
- 修复方向: Make the third parameter optional (or typed as an options record) in the `ComponentHandle` capability contract in flux-core.

### P3-9 — Dev-warn-once convention fragmented per package

- 类别: 重复实现 / 可维护性
- 位置: `packages/flux-renderers-data/src/table-renderer/warn-once.ts` (canonical local util) vs `packages/flux-renderers-layout/src/wizard-renderer.tsx:32-42` (module-level `Set<'blocked'|'threw'>` — keyed only by kind, so one blocked guard in any wizard suppresses the warn for all other wizards app-wide) vs `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:142-148` (raw `console.warn` inside a `useMemo`, no once-semantics)
- 现状: Three different hand-rolled dev-warn conventions in the sampled face, with different keying and suppression semantics.
- 风险: Diagnostic behavior varies by package; the wizard variant can hide a second, different schema's guard bug during development.
- 修复方向: Promote `warn-once` into a shared low-level package (flux-core or flux-react dev utils) with explicit key support; migrate the three sites.

## Deep-audit core dimensions

### Contract drift (API contract vs consumption surface; docs vs code)

- P2-1 is the primary drift: the RM-11 ownership primitive standard (degrade+warn) vs the table filter/sort hooks' hand-rolled guards, including a read-side/write-side guard mismatch inside each hook.
- P2-3 is structural drift: `RendererRenderOutput = unknown` vs what every consumer actually does with it (casts to ReactNode), expressed as 32 local shims. P3-8 is the same family on the capability `invoke` seam.
- Checked clean: wizard commit/nav contracts (interaction vs lifecycle state separation, P1-03 commit lock, WA-layout-003 guard observability) match their in-code contract notes; gantt revision contract (`layoutRevision` as render gate + `recalcLayout()` after non-bumping mutations, gantt.tsx:146-150) is internally consistent and deliberately documented; scheduling event-ctx (`useSchedulingEventCtxStable`) honors its "mount effects must not re-fire" contract via `[]`-deps identity; carousel handle stability contract (activeIndexRef mirroring, carousel.tsx:49-55) is implemented as documented; form `data-load-state` C1 vocabulary (form-load-action.ts:8-26) matches implementation including first-frame-honest `loading`.
- container.tsx post-641 contract face verified clean: `noWrapperBody` correctly composes `bodyClassName` onto the root only in the no-wrapper branch (container.tsx:58-65, 109-119) and `data-container-bare` is emitted only there. The container-vs-flex `meta.disabled` divergence on the clickable branch is NOT counted as a finding — adjudicated in plan 588/CX-10 (commit 12e081b4a: "不带 disabled 门[M1 禁从 flex 引入]", flex residual registered as follow-up); see Dedup notes.

### Dead code (module responsibility; unconsumed exports)

- P3-1, P3-4, P3-5 above. Beyond that, the sampled face is clean: `structural-loop-scratch.ts`, `column-settings-state.ts` have live consumers and single responsibilities; no orphaned modules found in the sample. knip baseline (949 entries, plan 628 §C) owns the systematic sweep — sample-level hits are flagged for triage, not double-counted as new debt.

### Error propagation fidelity

- P2-2 (surface submit hook → console.warn) and P3-6 (silent rule-kind drop) are the gaps found.
- Positive: the sampled save paths are unusually rigorous — generation refs guard concurrent saves (editable cell, quick-edit controller, form-load/init abort-supersede with controller-identity-guarded key clearing); explicit `ok:false` action failures are rethrown into the notify channel (`isExplicitActionFailure`); DOMPurify sanitize fails closed on SSR (sanitize.ts:36-39); form-load refresh handler rethrows after recording state, leaving reporting to the dispatch pipeline that owns the invocation — asymmetric with the autoLoad path (which reports via `reportFormInitActionError`) but defensible since the refresh invoker owns the error; noted as observation only.
- plan 628 §D five error-handling gaps remain the owning record for that family; nothing found here duplicates them.

### Test-effectiveness observations (§5 — record only, FM-3 owns annotation)

- The sampled interaction surfaces are heavily pinned (guard-warn, dialog-accessor split IS-crud-002, C1 load-state vocabulary, StrictMode store self-heal 119 each carry named tests). Notable unpinned behaviors: the ownership scope-without-path combos (P2-1 — zero coverage, same gap RM-11 found for tabs), and the P3-7 unwrap asymmetry.

### Automation observations (§7 — record only, FM-4 owns annotation)

- Existing and effective: oversized-file gate (drove the table-renderer/ and virtual-body splits), ratchet baselines, dom-structure/contract-honesty test conventions in the new packages.
- High-ROI additions: a grep ratchet for local `function asReactNode` definitions (directly enforces P2-3's fix), and a repo check that `*Ownership` fields' scope mode always flows through `resolveOwnershipMode` (enforces P2-1's fix class).
- Not to over-rely on: knip (already at 949-entry baseline; the dead-code findings here are contract-shaped, not graph-shaped) and duplicate-ratio metrics (P3-2/P3-3 are near-miss clones that token-similarity tooling reads as acceptable).

## Overall Assessment

The sampled renderer face is in materially better condition than its file sizes suggest. The recurring quality pattern is explicit, locally-documented contract adjudication: nearly every subtle behavior (virtual-body radio group, quick-edit dialog accessor split, wizard commit lock, gantt StrictMode store self-heal, C1 load-state vocabulary) carries an inline record of the decision that produced it, and the save/abort paths consistently implement generation guards, snapshots, and controller-identity-guarded cleanup. Error handling on the primary paths is deliberate rather than incidental. The weaknesses are systemic rather than local: (1) the ownership-mode abstraction is unified in vocabulary but not fully in semantics — two table hooks still run pre-standard resolution with silent dead states (P2-1); (2) the framework's two widest seams (`RendererRenderOutput`, capability `invoke`) push type-laundering onto every consumer, accumulating 32 copies of one shim (P2-3, P3-8); (3) one lifecycle error path still drains to console (P2-2). Nothing found in the sample is currently wrong for a correctly-configured schema; all three P2s require either author misconfiguration or a host hook failure to bite — which is exactly why they have survived four audit waves. The new packages (content/layout/scheduling) sample at the same quality level as the established families; their audit-history disadvantage is not visible in the code read here.

## Dedup notes

- **Not counted — plan 588/CX-10 owned (commit 12e081b4a)**: container clickable branch intentionally lacks the `meta.disabled` gate that flex has (aria-disabled/data-disabled/tabIndex-1); M1 adjudication explicitly forbade importing the gate from flex ("真先例=notice-bar.tsx 非 flex"), flex 双树残差 registered as follow-up. Verified live: container.tsx:67-69 has no disabled read while flex.tsx:68-81 gates both handlers. Any future unification must go through the registered CX-10 follow-up, not a new finding.
- **Not counted — plan 628 §A**: wide `RendererRuntime`/`FormRuntime` facades, `renderSurface: any` (runtime.ts:590), failure-state type forgery, compile-cache absence (partially mitigated in the render path by `normalizedInputCompileCache`, render-nodes.tsx:133-143 — module-level, survives remount with same schema identity; the runtime-factory-level cache remains 628-owned).
- **Not counted — plan 628 §C**: knip 949 / scanner 2,093 / duplicates 597 baselines own the systematic dead-export and clone inventory; P3-1 is flagged for triage within that stock, and P3-2/P3-3-style near-clone debt is representative of the 597-clone stock rather than newly surfaced.
- **Not counted — plan 628 §D**: the five error-handling gaps (flux-guide/15-error-handling.md), monitor event gaps, surface-lifecycle planned sections. P2-2 was checked against all five and is a distinct site (surface `triggerHook` failure path, not `reportActionError`/`onSettled`/render-throw).
- **Not counted — FM-0 / plan 642 territory**: `use-column-resize.ts`, `fixed-columns.ts`, `table.css`, `table-renderer.tsx` main body, `use-table-column-layout.ts` — excluded from rescan per brief; the sampled virtual body consumes the FM-0 outputs (`fixedColumnLayout`) without contract violation.
- **In-flight concurrent session**: form.tsx IME guard — judged as live state, correct; owned by the concurrent session's closure, not this audit.
- **RM-11 (plan 613) relationship to P2-1**: 613 migrated the read sides of `use-table-filter`/`use-table-sort` onto `useOwnershipScopeValue` and is closed; its closure record already adjudicated the identical silent-no-op semantics a defect and fixed it for tabs. P2-1 is therefore the remaining tail of a fix whose direction is pre-approved, not a re-litigation of a decided plan item.

---

## Shard F — adversarial 信号驱动抽查

# FM-2 adversarial review

- 执行者：FM-2 对抗性审查员（plan 643 Phase 3，fresh session，信号驱动抽查）
- 口径：`docs/skills/open-ended-adversarial-review-prompt.md`（假设"此处有 bug"证伪式读码）
- 日期：2026-10-18
- 去重基线：`docs/audits/final-maturity-audit/fm2-code-quality-report.md`（FM-2 主报告，P1-1/P1-2/P2-_/P3-_ 已拥有项不计新）；plan 628 拥有项与 ratchet 存量不计新
- 工作区实况核查：`git status` 显示在途改动仅 docs + `flux-renderers-form/src/renderers/form.tsx` + 其测试；**flux-runtime / flux-react / flux-action-core / flux-renderers-data 四个热点包源码均无在途修复**，FM-2 P1-1/P1-2 在本树仍是 live 状态

---

## Spot 1 — render-nodes.tsx:342-489 fragment-scope 版本状态机

**攻击面**：微任务与 React 提交交错、StrictMode 双调用、fragment 卸载竞态。

**试探（均构造了时序并逐行核对）**：

1. **StrictMode 双调用**：`useLayoutEffect` A（:369）与 B（:414）双跑——A 第二跑命中 `matchesFragmentScopeEntry` 不重复建 scope；B 的无 scope 分支有 `pendingFragmentScopeVersionRef !== nextVersion` 守卫（:422），双跑只是版本单调 1→2，committed 追平后收敛（最多 3 个 render pass，无死循环）。被动 effect C（:460）双跑：cleanup 先置空 `activeFragmentScopeOwnerRef` 并排队微任务，setup 同步重设 owner——微任务回调里 `activeOwner?.runtime === disposedRuntime && cacheKey 相同` 早退（:474-478），scope 不误删。
2. **卸载→同位重挂（useId 同位复用）**：cleanup C 排队微任务 → 新实例 setup C 在同一任务内同步重设 owner → 微任务早退；若 layout A 已换条目，`cache.get(key) !== cachedEntry` 二重守卫（:481-483）兜底。
3. **真卸载竞态**：cleanup 后微任务运行前无任何代码可再取该 cacheKey（useId 全树唯一、runtime 换代时 owner.runtime 不等），`disposeScope` 经 `ownedScopeDisposers`（runtime-factory.ts:102-108）幂等（disposer 取后即删）。
4. **并发渲染丢弃 render**：render 期对 cache 只读（:350），全部突变在 layout effect；`'use no memo'`（:296）隔离编译器。
5. **effect B 的 mismatch 分支（:432-441）可达性**：A 的 dep 集是 B 的超集（除 fragmentScope）且 A 先跑、读 live cache，B 走到该分支时 cache 已被 A 修正——该分支实际近不可达，无害。

**结论**：verified-clean。五个版本变量 + 微任务处置在上述攻击序列下均收敛，与 FM-2 主报告 P2-3"必要复杂度热点、非行为缺陷"的复检结论一致。唯一残留是该状态机零文档（P2-3 已拥有，不计新）。

---

## Spot 2 — form-runtime-owner.ts validateForm / validateFormPath / applyChangesAndRevalidate 链

**工作区实况**：`validateRegisteredChildren` 错误收口修复**不在本树**（form-runtime-owner.ts 无在途改动）——FM-2 P1-2 描述的裸抛仍 live，本抽查独立复核确认（`:444-453` 裸 `await validatePath`，`:456-481` 主循环无 catch，`form-runtime-validation.ts:442-462,570-580` 确认可抛非 abort 错误；key-value/array-editor/condition-builder 三处真实 `validateChild` 注册可达）。**归 FM-2 P1-2 已拥有，不计新**。

**并发 validate 攻击**：两个并发 `validateAll('submit')`——后者 `supersedeLowerPriorityWork` 使前者在途 runId 失配 → 前者各路径返回 cancelled→`[]`（ok:true）→ 前者调用方拿到假"valid"。经 `submit()` 入口有 `isSubmitting` 互斥，仅直调 validateAll 可触发；语义上"被更新一轮取代"可辩护，informational，不立案。

### Finding A（新，P3）：M-09/V18"收敛缝"仍有第五、第六条未收口入口，且其中一条是 fire-and-forget 未处理拒绝

- **位置**：`packages/flux-runtime/src/form-runtime-owner.ts:223-231`（applyChangesAndRevalidate 的 `reason === 'change'` 分支裸 `await input.getThisForm().validateField(path, reason)`，无 try/catch——仅 12 行之下 revalidateDependents 有完整 catch+缝（:245-263），对照刺眼）；`packages/flux-runtime/src/form-runtime-owner.ts:596-637`（validateSubtree 两条路径的裸 `await validatePath`）；`packages/flux-runtime/src/form-runtime-validation.ts:603-626`（validateSubtreeByNode 同款裸调用）；消费端 `packages/flux-runtime/src/form-runtime-field-ops.ts:429`——`notifyFieldHidden` 以 `void revalidateSubtree?.(path, 'system')` fire-and-forget，无任何 catch。
- **触发序列**：字段取消隐藏 → notifyFieldHidden → validateSubtree → 子树内任一 async rule 传输失败或用户态 validate/validateChild 抛错 → validatePath 裸抛 → Promise 拒绝被 `void` 丢弃 → unhandled rejection：无 notify、无诊断缝、无 console。另一序列：host 直调 `applyChangesAndRevalidate`（ValidationScopeRuntime 公共面，detail-view 投影亦无 catch）change 分支首个 changedPath 的 validator 抛错 → 整体裸 reject，dependents 循环根本不执行。
- **是什么**：FM-2 P1-2 只收口 validateRegisteredChildren（第四条）；本条是同族的第五（applyChangesAndRevalidate change 分支）、第六（validateSubtree/validateSubtreeByNode）条未收口入口，且第六条因 `void` 丢弃升级为 unhandled rejection。
- **为什么值得关心**：M-09 注释（form-runtime-owner.ts:407-419）声称所有入口收敛；任何按注释理解错误语义的调用方中招。P1-2 的修复方案只改 children 循环，落了也修不到这两条。
- **严重度**：P3（同族已有 P1 立案；本条是补充位点 + 一处更差的处理等级）。
- **信心**：确定（代码路径逐行核实）。
- **修复方向**：与 P1-2 同款 catch 套用到 change 分支与 validateSubtree 两族；`notifyFieldHidden` 的 `void` 改 `promise.catch(缝)`。

---

## Spot 3 — render-nodes.tsx:133-143,195-246 编译缓存

**工作区实况**：缓存键修复**不在本树**。独立复核确认 FM-2 P1-1 成立：键 = 输入身份 + `${strictMode}:${JSON.stringify(compileOptions)}`，不含 runtime/registry 身份；而 `createSchemaCompiler`（runtime-factory.ts:76-82）闭包捕获 per-runtime `registry` 与 `defaultCidState`（cid 序列），`schema-compiler.ts:122,161,245` 编译期查 registry。**归 FM-2 P1-1 已拥有，不计新**；附带确认"diagnostics 与缓存交互"一致：失败 schema 在 `finishCompile` 抛出、先于 `cache.set`，永不缓存、每次重编译重报——FP-4 语义不受缓存影响（plan 628 Phase 4 前置问题的一个子答案）。

### Finding B（新，P3）：缓存槽位单键单值——同一 schema 对象在多个 compileOptions 间轮换时 100% 失效重编译

- **位置**：`packages/flux-react/src/render-nodes.tsx:133-136,205-212,230-238`——`WeakMap<object, {key, result}>` 每 input 对象仅一个槽位。
- **触发序列**：同一 schema 数组对象被两个不同 `ownerTemplatePath` 的 fragment 复用（compileOptions.basePath 不同）→ 两个 RenderNodes 交替渲染（tab 切换）→ 每次都 key 失配 → 每次全量重编译。P14 注释声称的"memoize"在交替场景退化为纯开销（WeakMap 写 + JSON.stringify 每渲染）。
- **为什么值得关心**：plan 628 Phase 4 的二级 WeakMap（input → runtime）方案**不解决**此形态（仍一 runtime 一槽）；列表-详情往返是 628 自己点名的场景。
- **严重度**：P3（纯性能，无正确性影响）。
- **信心**：确定（键比较逻辑直接可读）。
- **修复方向**：槽位键升级为 `optionsKey → result` 的 Map（input → Map<key, result>），628 设计时一并采纳。

---

## Spot 4 — flux-action-core action-runners 执行链

**namespaced 路由攻击**：built-in → component → named → namespaced 顺序核对；含 `:` 的 action 跳过 named（:153），解析失败返回结构化 `{ok:false}` 而非 throw（:109-114）；未解析 provider 时 invokeNamespacedAction 返回结构化失败（action-adapter.ts:648-657）。verified-clean。

**异步取消攻击**：H35 锁定 cancelled=failure-class 触发 onError/onSettled 清理；withRetry 以 `cancelled/timedOut` 为终止谓词（:412）不计 failureCount；debounce 取消解析为 cancelled result。链路本身自洽，但发现下述两条：

### Finding C（新，P2）：attachThrownMetadata 包装 Error 丢失 `name`/`code`，AbortError 被降级为 action failure

- **位置**：`packages/flux-action-core/src/action-dispatcher/action-runners.ts:28-43`（Error 分支 `new Error(error.message, { cause: error })`，仅 Object.assign namespace/componentId 等元数据，不复制 `name`/`code`）；判别器 `packages/flux-core/src/runtime-inspection.ts:8-14`（isAbortError 只看顶层 `name === 'AbortError' || code === 'ABORT_ERR'`，不走 cause 链）；可达路径：`runComponentAction` catch（:90-94）与 `runNamespacedAction` catch（:137-143）；adapter 侧 `action-adapter.ts:618`（`handle.capabilities.invoke` 无 try/catch）与 `:665`（`resolved.provider.invoke` 裸返回）均不拦截。
- **触发序列**：component/namespaced 动作执行中 rootAbortController.abort()（页面卸载/对话框关闭）→ 宿主方法内部 fetch 以注入的 `ctx.signal`（action-adapter.ts:608-612 注入）发起请求 → fetch 抛 `DOMException(name='AbortError')` → 穿透 invoke → runComponentAction 包装成 `name='Error'` 的新 Error → runSingleAction catch（action-execution.ts:328）`isAbortError(wrapped) === false` → 走失败分支：reportActionError（对一次有意取消触发 monitor/plugin 诊断噪音）+ 结果标记 `{ok:false}` + 进入 caughtFailureResults → 若无 onError 分支，reportUnhandledFailureClass 向用户 toast 取消"错误"。
- **是什么**：三个 runner 的 throw 元数据附加手段（重新包装）与全局 abort 判别契约（顶层 name/code）互相破坏；同时包装破坏原始错误 `instanceof`（HTTPError 等类型判断全失效）。
- **为什么值得关心**：取消被当作失败是静默的语义漂移——用户看到莫须有的错误 toast，遥测里取消被计为 action error；任何依赖错误类型的下游（重试分类、错误码路由）拿到的是无名克隆。
- **严重度**：P2。
- **信心**：很可能（静态路径逐环核实；未运行时复现 DOMException 穿透，但 adapter 两处裸透传已确证无拦截层）。
- **修复方向**：三选一——Error 分支改 `Object.assign(error, metadata)` 不包装；或包装时复制 `name`/`code`/`stack`；或（根治全仓同类包装点）isAbortError 增加 cause 链遍历（单一正典实现处改，一处修全部）。

### Finding D（新，P2）：并行聚合结果丢弃 `cancelled`/`timedOut` 旗标——全取消批次被归类为纯失败

- **位置**：`packages/flux-action-core/src/action-dispatcher/action-execution.ts:248-253`（runParallelActions 聚合 `{ok, data, results, error}`，不透传任何成员的 `cancelled`/`timedOut`/`skipped`）。
- **触发序列**：并行批执行中 root signal abort → 每个成员经各自 runSingleAction 返回 `createCancelledResult`（cancelled=true）→ Promise.all 全量 resolve → 聚合结果 `ok:false` 且**无 cancelled 旗标** → `classifyActionResult` 判 'failure' 而非 'cancelled' → H35 语义（cancelled 归 failure-class 但保留旗标供下游区分）在聚合边界失效：`reportUnhandledFailureClass`（:572）不豁免、聚合不在 caughtFailureResults（:205 的诊断通道豁免也不适用）→ `notify('error', …)` 无条件触发；onSettled 以 `actionSettledError` 派发。
- **是什么**：成员级取消语义正确，聚合级旗标丢失；下游（onError 分支、event.result、调用方 classifySubmitResult 等一切按 `cancelled` 区分的消费点）把"用户取消/页面销毁"当真实失败。
- **为什么值得关心**：与 Finding C 叠加后，取消场景的失败化在并行批是**结构性**的（不依赖包装错误）；拆分 `failureHandled`/取消统计/重试判定都会误判。测试面核查：`contract-control-flow-parallel.test.ts` 仅覆盖"一失败不取消兄弟"，无取消旗标传播用例。
- **严重度**：P2。
- **信心**：很可能（聚合形状与判类逻辑确定；最终用户可见性取决于 env.notify 在卸载期的存活，未运行时验证）。
- **修复方向**：聚合按成员全同透传 `cancelled`/`timedOut`（全部取消→cancelled:true；混合→保留 failure 但附 results 供下游判定），并补判别测试。

---

## Spot 5 — table-quick-edit-controller.ts + use-row-quick-edit-draft.tsx 快速编辑链

**草稿态 vs 行切换 / 外部刷新**：controller 的同步 effect（:242-272）`honestReset` 三条件（field 换 / 值变 / record 变）均有意让外部值胜出本地草稿——冲突策略成立；`runSave` 的 H20 快照提交语义（:335-349）注释已明示"generation 只防并发保存、不防 record 换血、提交快照"——快照在外部刷新后仍 merge 回行是**已文档化的取舍**，不立案。保存失败路径仅 onSaveError/saveError，草稿保留可重试/可取消（closeDialog→restoreSavedValue），verified。

**并发单元格**：row-draft 是每行单草稿多字段，同行并发字段写共享 `draftRecordRef`，跨行实例隔离；`isFieldDirty` 回调直读 ref 恒新鲜。verified。

**与 FM-2 P3-3（双胞胎 draft-scope 已漂移）去重**：P3-3 是重复实现/契约漂移；下条是行为缺陷，不同根因，计新。

### Finding E（新，P3）：use-row-quick-edit-draft 外部 record 重置后 `isRowDirty` 惰性缓存不失效

- **位置**：`packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx:160-164`（重置 effect 只置两 ref + `draftScopeStore.publish`，**漏 `setDraftVersion`**）；对照 `:187-193`（`isRowDirty = useMemo(..., [draftVersion])`——唯一失效键）与 `:176-182`（setFieldValue/cancelEditing/update 均正确 bump）。
- **触发序列**：用户编辑 A 字段（draftVersion=1，isRowDirty=true，保存钮亮）→ 父级轮询/外部刷新换 record → 重置 effect 把 draft=saved=新 record、publish 通知订阅者重渲染——但 `draftVersion` 不变 → memo 沿用旧计算 → `isRowDirty` 恒 true：脏标记误亮、保存钮可点，按下后 `runSave` 门（`!isRowDirty` 直返）放行，以"无变化"的记录快照发起一次**多余的真实保存请求**。
- **是什么**：双 hook 不对称——controller 版本重置走 setState（dirty 立即重算），row-draft 版本依赖手 bump 的 memo 键而重置路径漏 bump。
- **为什么值得关心**：静默多发保存请求（幂等接口尚可，非幂等接口产生副作用）；脏态指示器失真直接误导用户。消费面已证实：`ui-review/r2-audit/round-01.md:1084` 保存钮 `disabled={!rowDraft.isRowDirty || rowDraft.saving}`。
- **严重度**：P3。
- **信心**：确定（deps 数组与两条写路径逐行对照）。
- **修复方向**：重置 effect 补 `setDraftVersion((v) => v + 1)`（与同文件 cancelEditing 对齐）；或 isRowDirty 改用 `useSyncExternalStore` 订阅 draftScopeStore。

---

## Spot 6 — form-store.ts summary/status 路径

**summary 派生一致性攻击**：fieldStates 的全部写入面收敛于 `updateFieldState`（增量 delta，:521-544）与 `batchUpdate`（全量重算 `computeSummaryFromFieldStates`，:623-672）——grep 全包证实无裸 `store.setState` 绕过（scope.ts/surface-store.ts 命中均是他店）；两路径对 `undefined` 清键、errors 长度计数、布尔旗标严格 `=== true` 的语义经 `mergeFieldStatePatch`（form-field-state-patch.ts:13-53）统一；`updateFieldState` 读-算-写同步无 await 窗口，无交错漂移。批量更新路径（patchFieldStateInMap → batchUpdate）全量重算，天然一致。

**disabled 字段计入**：FieldState 无 disabled 旗标；验证隐藏豁免只看 hiddenFields（validatePath :523-537），disabled 字段的值参与校验、错误计入 summary 与 submit 门。与 AMIS 常见语义（disabled 仍随表单校验/提交）一致，无契约文档相悖。verified。

**循环更新**：listener 内回写由 `fieldStateEqual` 无变化短路兜底；真正的回写风暴需 listener 每次写出不同值（编程错误面），与 zustand 通用风险同层，无本仓特有放大器。

**双语义注记**：`computeSummaryFromFieldStates`（严格 === true，:90-106）vs `summarizeFieldStates`（真值计数，:111-135）——注释明示"deliberately different, must not be unified"，且 plan 581 CX-3 已裁定"漂移语义零统一归 follow-ups"。verified-clean（既有裁定，不重报）。

---

## Summary

**计数**：新 findings 5 条——P0: 0，P1: 0，P2: 2（Finding C、D），P3: 3（Finding A、B、E）。另有 2 个热点（Spot 2 的 P1-2、Spot 3 的 P1-1）独立复核确认为 **live 未修**但归 FM-2 主报告已拥有项，不计新。

**P0/P1 明细**：无新 P0/P1。两个 P1 级信号点（validateRegisteredChildren 裸抛、编译缓存键缺 runtime 身份）经证伪式复核均**确认成立且在本工作区未修**——建议 plan 643 P1-2 修复落地时按 Finding A 一并收口 change 分支与 validateSubtree 族（其现行修复方案覆盖不到），且 `notifyFieldHidden` 的 `void` 丢弃是其中唯一会产 unhandled rejection 的点。

**方向性总评**：本轮 6 个热点中 4 个（Spot 1/2/3/6）的核心质疑被实现本身的防御机制挡住——两相版本状态机、supersede runId、delta+全量双路 summary、H35 锁定语义都经得起构造性攻击；真正的裂缝集中在**边界转换处**：错误包装丢元数据（C）、聚合丢旗标（D）、两条 hook 的重置路径不对称（E）、收敛缝清单与实际入口数不符（A）。这与 FM-2 主报告"复杂度热点本身无行为缺陷、缺陷在旁路"的判断互相印证。

**盲区自评**：本轮全部为静态读码推演，未运行任何判别性复现（C/D 的用户可见后果依赖 env.notify 存活时序、E 依赖轮询刷新时序）；Spot 4 的 built-in ajax 取消是否真的以 throw 形态穿透未逐行验证（按 adapter 模式推断走结构化结果）；plan 628 Phase 4 缓存设计若采纳"input→runtime 二级键"，Finding B 的 options 轮换失效仍会存活，该交互未与 628 作者对齐。
