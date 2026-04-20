# v7 下一代内核与当前 Flux 的对比

## 状态

- 状态: revised-draft-for-review
- 对比对象:
  1. `docs/experiments/next-gen-low-code-runtime-kernel-design-v7.md`
  2. 当前 Flux 规范基线
  3. 当前 Flux 已落地实现采样
- v7 来源约束:
  1. `docs/low-code-dsl-runtime-requirements.md`
  2. `docs/architecture/flux-design-principles.md`
- 当前 Flux 规范来源:
  1. `docs/architecture/frontend-programming-model.md`
  2. `docs/architecture/flux-core.md`
  3. `docs/architecture/dependency-tracking.md`
  4. `docs/architecture/scope-ownership-and-isolation.md`
  5. `docs/architecture/renderer-runtime.md`
  6. `docs/architecture/action-algebra-formal-spec.md`
  7. `docs/architecture/form-validation.md`
- 当前实现采样锚点:
  1. `packages/flux-runtime/src/runtime-factory.ts`
  2. `packages/flux-runtime/src/schema-compiler.ts`
  3. `packages/flux-runtime/src/scope.ts`
  4. `packages/flux-runtime/src/source-registry.ts`
  5. `packages/flux-runtime/src/reaction-runtime.ts`
  6. `packages/flux-runtime/src/action-runtime.ts`
  7. `packages/flux-runtime/src/page-runtime.ts`
  8. `packages/flux-runtime/src/form-runtime.ts`
  9. `packages/flux-react/src/schema-renderer.tsx`
  10. `packages/flux-react/src/node-renderer.tsx`

## 1. 如何阅读这份对比

本文严格区分四个判断维度:

1. **clean-slate 设计纯度**: 只比较 v7 设计与当前 Flux 规范谁更紧、更统一、更理想。
2. **规范成熟度**: 只比较当前 Flux 顶层架构文档与 v7 设计文档谁更完整、更稳定。
3. **实现成熟度**: 只比较当前仓库里哪些东西已经真实落地，v7 目前没有参与这一维度。
4. **迁移代价**: 判断当前 Flux 吸收 v7 需要改动多大，而不是判断谁“绝对胜出”。

如果不区分这四层，就很容易把“v7 的 clean-slate 设计更优”误读成“当前 Flux 设计失败”，或者把“当前 Flux 已落地更多”误读成“v7 设计不够好”。

## 2. 结论先行

结论分四句。

1. 在 **clean-slate 设计纯度** 上，v7 优于当前 Flux 当前规范基线，因为它在不违背 Flux 原则的前提下，把 primitive、resource/capability 边界、transaction 模型、execution package 叙事收得更紧。
2. 在 **规范成熟度** 上，当前 Flux 优于 v7，因为它已经形成完整的 primitive closure、owner 文档体系、细分专题文档和明确的 precedence 关系，而 v7 仍是一份单文档 clean-slate 设计稿。
3. 在 **实现成熟度** 上，当前 Flux 大幅领先，因为 page/form/surface/runtime factory/schema compiler/action runtime/React host/source/reaction/form validation 都已有真实代码；v7 仍未实现。
4. 在 **迁移意义** 上，v7 不是“替代当前 Flux 的新路线”，更合理的定位是“下一代理想内核草案”，用来反向牵引当前 Flux 继续收敛。

## 3. 总体对比

### 3.1 平台中心

当前 Flux 规范的中心是 `Final Execution Schema + 七原语闭包`，见 `docs/architecture/frontend-programming-model.md:45-57`, `:160-181`。

v7 的中心是 `Execution Package + 六个语义原语 + 派生 surface service`。

对比判断:

1. 从 clean-slate 设计看，v7 更紧。
2. 从规范稳定性看，当前 Flux 更成熟。

### 3.2 复杂度放置位置

当前 Flux 明确倾向“能在结构层或编译层解决的问题，不进入 runtime surface”，见 `docs/architecture/flux-design-principles.md:37-63` 与 `docs/architecture/frontend-programming-model.md:107-109`。

v7 完全继承这个方向，但把更多运行时边界集中表述为一个 `Execution Package` 合同，而不是分散在多篇 owner 文档中。

对比判断:

1. 当前 Flux 更像成熟的分层架构体系。
2. v7 更像一次更完整的 clean-slate 收口。

### 3.3 领域隔离

当前 Flux 已明确复杂域只能通过窄边界进入核心，包括只读 host snapshot、Capability invocation、explicit instance targeting、special host node kinds，以及在满足条件时的 `Resource`，见 `docs/architecture/frontend-programming-model.md:171-180`, `:290-297`。

v7 保持了相同边界，但用 projection manifest、capability manifest、dynamic assembly boundary 把这套边界做得更集中。

对比判断:

1. 当前 Flux 的边界原则更成熟。
2. v7 的合同表达更集中。

## 4. 编译模型

### 4.1 当前 Flux 规范层

当前 Flux 的规范层已经明确 runtime 执行的是 `Final Execution Schema`，且动态 fragment 也必须跨过相同边界后才能进入执行，见 `docs/architecture/frontend-programming-model.md:123-158`。

这说明当前 Flux 在规范上已经拥有明确的“编译完成后再执行”的总体边界。

### 4.2 当前 Flux 实现层

当前实现的 `schema-compiler.ts` 直接生成 `TemplateNode` 树，并把 props、meta、event、region、scope、validation 计划挂到节点上，见 `packages/flux-runtime/src/schema-compiler.ts:157-306`。

这说明当前代码现实是“结构树 + 编译值程序 + 节点计划”。

### 4.3 v7 设计层

v7 进一步把这套边界系统化为 `Execution Package`，其中显式包含:

1. typed manifests
2. compiled value IR
3. compiled action pipelines
4. validation graph
5. template instantiation plan
6. i18n diagnostics

### 4.4 判断

1. 从规范成熟度看，当前 Flux 已有明确编译边界。
2. 从 clean-slate 设计纯度看，v7 的 `Execution Package` 叙事更完整。
3. 从实现成熟度看，当前 Flux 的编译器显然领先，因为它已经存在。

## 5. 原语模型

### 5.1 当前 Flux 规范层

当前 Flux 顶层文档明确坚持七原语:

1. `Base Tree`
2. `ScopeRef`
3. `Value`
4. `Resource`
5. `Reaction`
6. `Capability`
7. `Host Projection`

见 `docs/architecture/frontend-programming-model.md:160-181`。

### 5.2 v7 设计层

v7 把 clean-slate primitive 收敛为:

1. `Template`
2. `Scope`
3. `Value`
4. `Capability`
5. `Resource`
6. `Reaction`

并把 `surface` 降为派生 kernel service，把 `ValueProgram`/`CapabilityProgram` 明确降为 compiled form。

### 5.3 判断

1. 从 clean-slate 设计纯度看，v7 更紧。
2. 从规范成熟度看，当前 Flux 更成熟，因为 primitive closure、promotion rule、derived system 关系都已固化。
3. 这里不存在“当前 Flux 原语设计失败”的结论，只存在“v7 在 clean-slate 收缩上更进一步”的结论。

## 6. Scope 与词法所有权

### 6.1 当前 Flux 规范层

当前 Flux 已经明确:

1. 默认词法继承
2. `data` 是 own scope 初始 patch
3. `isolate` 是窄特例
4. 不提供 `$parentScope`
5. table row 默认隔离
6. loop item 默认继承

见 `docs/architecture/scope-ownership-and-isolation.md:20-27`, `:48-67`, `:99-160`, `:162-231`。

### 6.2 当前 Flux 实现层

当前实现的 `ScopeRef` 仍然是对象快照 + 父链 + prototype-backed visible view，且写入默认进入 own store，见 `packages/flux-runtime/src/scope.ts:82-185`, `:265-376`。

### 6.3 v7 设计层

v7 在 scope 上的关键改进是:

1. semantic contract first
2. storage strategy not normative
3. explicit scope bootstrap order
4. live projected bindings
5. selector kinds 明确化

### 6.4 判断

1. 从规范成熟度看，当前 Flux 已经把词法所有权、row isolate、loop inherit 讲得很清楚。
2. 从 clean-slate 设计纯度看，v7 更进一步补齐了 scope bootstrap 与 projected binding 的长期合同。
3. 从实现成熟度看，当前 Flux 明显领先，因为它已经有稳定 scope/store/runtime 基线。

## 7. 依赖追踪

### 7.1 当前 Flux 规范层

当前 Flux 的规范基线是 `explicit roots first, lexical-root fallback`，并且明确说 validation dependency 可暂时保持独立 substrate，见 `docs/architecture/dependency-tracking.md:270-305`, `:438-447`。

### 7.2 当前 Flux 实现层

当前实现通过 Proxy 记录 root 级读取，source/reaction 分别按 root hit 触发 refresh/trigger，见 `packages/flux-runtime/src/source-registry.ts:96-166` 与 `packages/flux-runtime/src/reaction-runtime.ts:340-359`。

### 7.3 v7 设计层

v7 试图把 renderer props/meta、resource、reaction、validation、semantic-owner selector 全部统一到一套依赖模型，并配上 deterministic transaction model。

### 7.4 判断

1. 从 clean-slate 设计纯度看，v7 的统一依赖叙事更强。
2. 从规范成熟度看，当前 Flux 的“validation separate by design”是一个有意识选择，不应被误写成单纯未完成。
3. 从实现成熟度看，当前 Flux 已落地 root-level dependency substrate，而 v7 仍未实现。

## 8. Action、Capability 与 Operation Control

### 8.1 当前 Flux 规范层

当前 Flux 已把 Action Algebra 明确为 derived system，且作者表面保持 `when` / `then` / `onError` / `parallel` 渐进模型，见 `docs/architecture/action-algebra-formal-spec.md:39-88`, `:239-318`。

### 8.2 当前 Flux 实现层

当前实现的 `action-runtime.ts` 已支持:

1. sequential dispatch
2. parallel
3. then/onError/onSettled
4. retry
5. timeout
6. debounce
7. continueOnError

见 `packages/flux-runtime/src/action-runtime.ts:97-411`。

### 8.3 v7 设计层

v7 的 clean-slate 选择更克制:

1. 核心 action pipeline 更小
2. `retry` / `timeout` / `debounce` 明确退到 operation-control metadata
3. Capability 与 action control-flow 的边界更纯

### 8.4 判断

1. 从 clean-slate 设计纯度看，v7 更紧。
2. 从规范成熟度和实现成熟度看，当前 Flux 更成熟、更完整。
3. 这里的结论不是“谁对谁错”，而是“v7 更像 clean-slate 收缩，当前 Flux 更像成熟体系”。

## 9. Resource 与 Reaction

### 9.1 当前 Flux 规范层

当前 Flux 明确要求 `Resource`、`Reaction` 与 `Capability` 保持 distinct primitive roles，见 `docs/architecture/frontend-programming-model.md:75-78`, `:177-180`, `:197-207`。

### 9.2 当前 Flux 实现层

当前实现已经有 scope-owned source/reaction sidecar registry，且 self-write guard、dependsOn fallback、async debug snapshot 都已存在，见 `packages/flux-runtime/src/source-registry.ts:73-309` 与 `packages/flux-runtime/src/reaction-runtime.ts:367-503`。

### 9.3 v7 设计层

v7 的核心改进是把 Resource 语义收紧为“lifecycle-owned refresh contract”，并要求实际 effect 仍经由 Capability 通道执行。

### 9.4 判断

1. 从 clean-slate 设计纯度看，v7 在原则一致性上更强。
2. 从 Flux 现行规范看，当前设计是有意维持 Resource/Capability 区分，而不是简单落后。
3. 从实现成熟度看，当前 Flux 显著领先。

## 10. Rendering 与 React Host

### 10.1 当前 Flux 规范层

当前 Flux 的设计目标本来就包含 `browser + TypeScript + React or equivalent UI host`，见 `docs/architecture/frontend-programming-model.md:60-67`，因此它并不以“彻底宿主无关”作为唯一目标。

`renderer-runtime.md` 也已经把 boundary ownership、React hooks、compiled node resolution、surface/page/form ownership 讲得很细，见 `docs/architecture/renderer-runtime.md:116-170`, `:651-679`。

### 10.2 当前 Flux 实现层

`SchemaRenderer` 会创建 runtime、page runtime、surface runtime、root action scope、root component registry，并默认使用 `page.scope` 作为 root render scope；若传入 `parentScope`，则复用该 scope，见 `packages/flux-react/src/schema-renderer.tsx:31-50`, `:86-93`, `:120-131`。

`NodeRenderer` 已按 dependency hit 精确重解 props/meta，见 `packages/flux-react/src/node-renderer.tsx:74-107`。

### 10.3 v7 设计层

v7 更强调 framework-agnostic prepared render contract 与 dynamic assembly boundary。

### 10.4 判断

1. 从 clean-slate 设计纯度看，v7 更适合作为长期 host-agnostic kernel。
2. 从当前 Flux 自身目标看，它并不以完全 host-agnostic 为优先目标，因此不能把这一点简单写成当前 Flux 劣势。
3. 从规范成熟度和实现成熟度看，当前 Flux 在 React host 上都更强。

## 11. Validation

### 11.1 当前 Flux 规范层

当前 Flux 的 validation 规范非常完整，明确了:

1. compile-time graph first
2. `ValidationScopeRuntime` / `FormRuntime` 分层目标
3. owner-local async cancellation
4. partial validation
5. child contracts
6. draft isolation

见 `docs/architecture/form-validation.md:15-54`, `:123-167`, `:497-544`, `:883-905`, `:1046-1058`。

但要注意，文档也明确说多 owner owner-resolution 和 full child-contract coordination 仍有 future/phase work，见 `docs/architecture/form-validation.md:303-360`, `:908-949`, `:1032-1044`。

### 11.2 当前 Flux 实现层

当前已读实现中心仍然是 `FormRuntime`，而不是一个完全泛化、全面落地的 `ValidationScopeRuntime` 体系，见 `packages/flux-runtime/src/form-runtime.ts:53-507`。

### 11.3 v7 设计层

v7 在 validation 上的 clean-slate 方案更紧凑，强调:

1. compiled validation graph
2. display policy 与 execution timing 分离
3. latest-only async cancellation
4. draft island 为语义 owner 边界的一部分

### 11.4 判断

1. 从规范成熟度看，当前 Flux 明显更强。
2. 从 clean-slate 设计纯度看，v7 更简洁。
3. 从实现成熟度看，当前 Flux 领先，但必须承认其多 owner validation 仍未完全闭合。

## 12. Surface 与语义 owner

### 12.1 当前 Flux 规范层

当前 Flux 已明确 page/form/surface 是不同 owner family，dialog/drawer 共享 `SurfaceRuntime` / `SurfaceStore`，见 `docs/architecture/renderer-runtime.md:826-839`。

### 12.2 当前 Flux 实现层

`SchemaRenderer` 会创建 `surfaceRuntime`，runtime factory 会创建 `createSurfaceRuntime()`；同时 runtime factory 已把 `openDrawer` 与 `createDialogScope` 等 surface 打开路径接到 action dispatcher 组装上，见 `packages/flux-react/src/schema-renderer.tsx:49-50` 与 `packages/flux-runtime/src/runtime-factory.ts:167-177`, `:443-504`。

这里只能证明 surface family 的 runtime wiring 已经存在，不能单靠这些文件就推断所有 built-in surface action 全部端到端细节都已在本文采样中完全验证。

### 12.3 v7 设计层

v7 没有把 surface 升格为 primitive，但补上了 closed semantic owners:

1. `page`
2. `form`
3. `surface`

### 12.4 判断

1. 方向上两者接近。
2. v7 在 clean-slate 叙事上更整洁。
3. 当前 Flux 在规范成熟度和实现成熟度上更强。

## 13. 宿主集成与复杂域

### 13.1 当前 Flux 规范层

当前 Flux 的稳定边界是:

1. `Host Projection` 负责只读 host snapshot admission
2. `Capability` 负责 effect authority
3. `ActionScope` 与 `ComponentHandleRegistry` 分别承担 lexical namespaced action 与实例定向能力查找

见 `docs/architecture/frontend-programming-model.md:171-180`, `:219-225` 与 `docs/architecture/flux-core.md:215-227`。

`DomainBridge` 这种说法更多出现在设计原则文档对 host-private protocol 的解释语境里；就本文采样的实现文件而言，不能把它与 `ActionScope`、`ComponentHandleRegistry`、`Host Projection` 一样当成已被同等强度证明的现行实现构件。

### 13.2 当前 Flux 实现层

runtime factory 的确显式创建 `ActionScope` 与 `ComponentHandleRegistry`，并且明确不把它们折叠进 `ScopeRef`，见 `packages/flux-runtime/src/runtime-factory.ts:121-138`。

### 13.3 v7 设计层

v7 在 clean-slate 方案里进一步增加了:

1. typed projection manifest
2. typed capability manifest
3. dynamic fragment assembly boundary

### 13.4 判断

1. 从规范成熟度看，当前 Flux 的 host/domain boundary 已很成熟。
2. 从 clean-slate 设计纯度看，v7 把这些边界集中进 execution package 叙事，更完整。
3. 从实现成熟度看，当前 Flux 依然领先。

## 14. 当前实现成熟度与 v7 的现实距离

### 14.1 当前 Flux 已真实落地的部分

从已读实现可确认:

1. runtime factory 已落地，且能创建 page/form/surface/source/reaction/action 子系统，见 `packages/flux-runtime/src/runtime-factory.ts:76-523`
2. schema compiler 已稳定输出 `TemplateNode` 树，见 `packages/flux-runtime/src/schema-compiler.ts:157-306`
3. scope/store 已是稳定运行时基线，见 `packages/flux-runtime/src/scope.ts:21-376`
4. action runtime 已完整支持结构化分支、并发、控制语义，见 `packages/flux-runtime/src/action-runtime.ts:97-411`
5. React adapter 已形成稳定使用面，见 `packages/flux-react/src/schema-renderer.tsx:23-139`, `packages/flux-react/src/node-renderer.tsx:45-374`

### 14.2 当前 Flux 仍未完全闭合的部分

从文档可确认:

1. validation 仍有 phased implementation 的未来部分，见 `docs/architecture/form-validation.md:303-360`, `:1032-1044`
2. dependency tracking 的 row reconciliation 等仍有 follow-up，见 `docs/architecture/dependency-tracking.md:253-267`, `:541-550`
3. 当前 dependency substrate 与 validation substrate 仍未统一，但这在现行规范里带有明确的有意分离成分，见 `docs/architecture/dependency-tracking.md:438-447`

### 14.3 v7 的现实情况

v7 目前仍是纯设计文档，没有实现。

因此在实现成熟度维度上，v7 暂时不适合和当前 Flux 做直接同比分。

## 15. v7 真正更强的地方

以下判断只属于 clean-slate 设计纯度维度。

v7 真正更强的地方是:

1. primitive 更少，compiled form 与 semantic primitive 边界更清楚。
2. scope bootstrap 语义被集中表达，而不是散在多篇 owner 文档中。
3. Resource 被原则化收敛回 Capability effect path，语义一致性更高。
4. transaction publication model 更集中。
5. dynamic assembly boundary 更清晰。
6. execution package 视角更适合未来做 diagnostics、tooling、typed host contract checking。

这些都不是在说当前 Flux 错了，而是在说 v7 作为 clean-slate 草案更紧。

## 16. 当前 Flux 真正更强的地方

以下判断分两层。

### 16.1 规范成熟度

当前 Flux 更强在:

1. 七原语闭包已经稳定。
2. precedence 关系明确。
3. owner 文档体系完整。
4. validation、renderer runtime、dependency tracking、action algebra 都有专题 owner 文档。

### 16.2 实现成熟度

当前 Flux 更强在:

1. page/form/surface/source/reaction/action 都已有 runtime 子系统。
2. React host 与 renderer contract 已大量落地。
3. debugger 与宿主 tooling 已开始围绕这些 runtime surface 工作。
4. 它是一条真实可演进的工程基线，而不只是理想方案。

## 17. 迁移代价

从当前 Flux 走向 v7，不是小改，但也不像 v5/v6 那样接近换道重启。

主要代价在于:

1. 要重新审视七原语闭包是否保持不变。
2. 要把当前分散在多份 owner 文档里的部分语义重新抽回 execution-package 叙事。
3. 要进一步收紧 Resource 与 Capability 的边界。
4. 要把 dependency/resource/reaction/validation 的 transaction contract 再统一一步。
5. 要补齐 host projection、dynamic assembly、i18n baseline 的统一编译合同。

这意味着更合理的迁移方式是“吸收”，不是“替代”。

## 18. 更现实的吸收方向

最适合吸收进当前 Flux 的 v7 优点:

1. 更严格的 execution-package 叙事
2. 更完整的 scope bootstrap contract
3. 更彻底的 Resource through Capability 原则化收敛
4. 更清晰的 transaction publication model
5. 更统一的 dynamic assembly boundary
6. 更集中化的 host manifest / projection / capability diagnostics

不适合直接硬塞回当前 Flux 的部分:

1. 立即推翻现有七原语闭包
2. 为追求 clean-slate 而对当前 React host/runtime 分层做大规模重写
3. 为了统一叙事而牺牲现有 validation/documentation/owner runtime 成熟基线

## 19. 最终判断

最终判断分四句。

1. v7 在当前这轮实验里，已经形成一份较完整的、既遵循 Flux 原则、又真正指向下一代 clean-slate 内核的方案。
2. 当前 Flux 不是被 v7 否定的旧路线，而是一个已经相当成熟、并且大量能力已经落地的工程化架构基线。
3. 两者最合理的关系不是“替代”，而是“v7 作为更优 clean-slate 理想内核，反向牵引当前 Flux 的下一轮规范收敛”。
4. 如果未来真的吸收 v7，正确方向也应是“让当前 Flux 更像一个严格的 execution-package runtime”，而不是重新发明一个完全不同的 world kernel。

## 20. 当前评审结论占位

- 当前状态: 待独立子 agent 复审
- 目标共识标准:
  1. 对当前 Flux 的描述不违背已读架构文档与实现锚点
  2. 不把“v7 设计更紧”偷换成“当前 Flux 设计失败”
  3. 全文稳定区分 clean-slate 设计纯度、规范成熟度、实现成熟度、迁移代价四个判断维度
