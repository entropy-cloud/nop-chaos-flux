# 2026-08-05 工业组态表达式收口与点表可选间接层讨论

> 状态：**已确认（2026-08-05，人工确认 + 用户修正）** —— 用户两条修正已落地：① 平台唯一语法为 `${expr}`，不存在 `$xxx` 简写（`$` 开头标识符是保留内置命名空间 `$Math`/`$JSON`/`$Date`）；② 决策 D1-D6 经人工确认（对话「继续」），I18 已按 Rule 3 结构性调整立项写入 `docs/components/roadmap-industrial-hmi.md`（Phase Status / Work Items / Phase Details / Dependency Graph / 复用表）。后续：起草 I18 execution plan（Must automate 档）→ 实施 → 文档同步 + 闭环审计。
> 关联产物：`packages/flux-renderers-industrial/src/binding/expression-evaluator.ts`、`binding/reverse-index.ts`、`binding/dirty-collector.ts`、`renderer/hooks/use-scada-points-bridge.ts`；`docs/components/industrial-hmi/design-data-binding.md`、`design-symbols.md`、`design-renderer.md`；`docs/components/roadmap-industrial-hmi.md`

## 文档共识审查记录（本文件）

> 本文件起草于 2026-08-05，起草阶段共识审查**未启动**（先经人工确认决策项 §七，再按 roadmap Cross-Cutting「文档共识审查」条款以独立子 agent fresh session 启动 ≤3 轮循环）。Decision 与用户此前的 Q3 用户裁决（双轨自包含，见 `docs/discussions/2026-08-03-industrial-hmi-scada-mission-scope-discussion.md` §九）存在约束关系，§七 D2/D3 按相同口径提请人工裁决。

---

## 一、问题背景与本次讨论触发点

用户在评审时对 SCADA 图元的表达式设计提出三个递进质疑：

1. **`@{pointId}` 语法从何而来**，为何没有直接复用链路中已有 2 个 `@nop-chaos/flux-formula` 求值通道（粗定位在 I6.2）；
2. **表达式解析器/执行器为什么要手写**（`expression-evaluator.ts` 404 行：tokenizer + 递归下降 parser + evaluator + 依赖缓存 + 环检测），平台复用表要求「既有能力禁止重复实现」（roadmap-industrial-hmi.md:369）；
3. **是否需要 `points.` 这类固定的命名约定**——从 data-source 之类来源获取连续数据后直接绑定不行吗？数据如何准备、形状如何完全按需求定，不应内置固化约定。

**结论预览**（§五）：三条质疑均成立，且桥接层 `$xxx` 简写本身也与平台内置变量规范冲突（§三 6）。表达式语法应收口为**唯一 flux `${expr}` 语法**（`${}` 内是普通 scope 标识符，无保留名；`@{pointId}` 与 `$xxx` 形式一并弃用）；点表降级为**可选间接层**而非语法强制；保留点表的唯一硬约束是**高频遥测不进 React scope（INV-4）**的 out-of-band 通道。

## 二、现状：两套并存的表达式通道

### 通道 A：组态内点表达式 `@{pointId}`

- **语法**：`@{pointId}` 引用 + 算术/比较/三元/字符串拼接子集（`config-types.ts` `ScadaBinding.expression`、`ScadaPointDeclaration.expression`、`scale.expression`）。
- **实现**：`binding/expression-evaluator.ts` 从零手写 tokenizer（:75-126）+ 递归下降 parser（:130-230）+ evaluator（:232-334）+ 语法级依赖链 `extractPointIdRefs` 缓存与失效（:344-404）。依赖注入：`getPointValue`/`hasPoint`/`getPointExpression`。
- **装配**：`binding/dirty-collector.ts:147-187` 将 `ExpressionEvaluator` 与 `BindResolver` 组装进点表刷新流水线；`:218` 变更后重算表达式点，`:280-307` `evaluatePoint` + `invalidate`（点间依赖失效 + 环检测）。

### 通道 B：flux scope 表达式 `${...}`（平台能力复用的正确通道）

- **语法（规范）**：**唯一形式 `${expr}`**（`${}` 内为普通 scope 标识符，如 `${analog.temp}`）。**不存在 `$xxx` 简写**——`$` 开头的标识符是平台保留的内置命名空间（`$Math`/`$JSON`/`$Date`，flux-formula.md:196,205），`$xxx` 若直接进入公式解析会按内置命名空间解析，与内置变量规范冲突。
- **实现**：`renderer/hooks/use-scada-points-bridge.ts` —— `normalizeFluxExpression`（:194-198）当前额外接受了 `$xxx` 简写与裸路径 `analog.temp`（剥离 `$`/直接包成 `${...}`）——这是 scada 域本地扩张，**不是平台语法**，且 `$xxx` 与保留命名空间冲突，属待清理设计债（§三 6）；规范路径为 `${expr}` → `flux-formula`/`flux-compiler` 编译求值；`extractFluxScopePaths`（:186-191）+ 探针依赖收集 `extractExpressionDepsViaProbe` 产出订阅路径 → `useScopeSelector(paths)` 精准订阅；求值上下文为 `createPrivateEvalScope({ ...pointValues, ...scopeData })`（:366，**点表值与 scope 数据已合并进同一私有求值 scope**）。
- **INV-4 边界**：点表值是域内部状态，不进 schema-visible scope（design-data-binding.md:84,208,221,341；renderer-boundary-audit.md:39）——高频遥测不落 React 状态。

### 历史成因（为何会出现通道 A）

记录在案的设计决策：① 讨论 Q3 双轨数据模型（组态文件自包含）；② `$`=flux scope、`@{}`=组态点表的前缀隔离（design-data-binding.md:340）——**此前提建立在 `$xxx` 简写之上，而 `$xxx` 恰与平台保留 `$` 命名空间冲突**，前缀隔离因此是双缺陷的设计（见 §三 6）；③ INV-3「表达式能力以 flux-formula 为主」的能力收窄边界（design-data-binding.md:343）；④ I6.2（Wave 2）早于 I10.3 桥接层，当时配合「binding/ 为无 React 依赖的域核心」的分层约束，纯逻辑自建求值器是最短路径（plan `2026-08-03-2307-1` §19-23、§119-121）。

## 三、评估：为什么不自然（事实层面）

1. **双语法并存**：组态 JSON 内同时存在 `@{pointId}`（自造）与 `${...}`（平台），作者与编辑器需要掌握两套、编辑器工具链需要双解析。
2. **自建即最小 DSL，与「防 DSL 膨胀」动机构图自相矛盾**：设计文档以 INV-3「避免自研 DSL 膨胀」为由收窄 `@{}` 子集，结果落地了 404 行自建 parser/evaluator/缓存/环检测——这本身就是最小 DSL 实现，比「复用 flux-formula + 薄适配」更重，并新增需长期维护的私有语法与语法级依赖收集。
3. **「无 React 依赖」复用障碍不成立**：`@nop-chaos/flux-formula` 的 package.json 仅依赖 `@nop-chaos/flux-core`，src 内零 React 引用——binding 层直接 import 不引入 React 依赖（roadmap 复用表 REQUIRED 项可满足）。
4. **统一已被证明可行**：通道 B 的 `createPrivateEvalScope` 已把点表值注入求值 scope 供 flux-formula 求值（bridge :366）——`@{x}` 语义可归一化为普通标识符（`${x}`，root 注入），不存在技术障碍。
5. **参考项目对照**：meta2d（`dataId` 绑定点号）、FUXA（`variableId`→tag 主绑定）也是**命名数据源引用**，无旁路表达式语法；点引用本来就可以是数据源命名空间里的普通成员。
6. **`$xxx` 与平台内置变量规范冲突（新增事实）**：平台以 `$` 开头的标识符为**保留的内置命名空间**（`$Math`/`$JSON`/`$Date`，flux-formula.md:196,205）。桥接层把 `$` 当作「scope 引用标记」的 `$xxx` 简写（demo `$flow`/`$temp` 载体）一旦不经 `normalizeFluxExpression` 规整而直接交给公式解析，会落入内置命名空间解析路径——`$xxx` 简写本身即与内置变量规范冲突，连同 `@{}` 一并加入弃用面，收敛后唯一合法语法是 `${expr}`。

## 四、点表能否去掉：直连 data-source 绑定评估

用户方案：从 data-source 获取连续数据后，图元属性直接绑定 scope 表达式；数据形状完全由 host 决定，无内置固化约定。平台已有 `data-source` renderer 先例（flux-renderers-data：`data-source` type + `compiledSources[0].onSuccess/onError` + CRUD polling 指挥上游控制器）。

点表（变量表）职能拆解——直接绑定能否承接：

| #   | 点表职能                                                       | 直接绑定能否承接 | 说明                                                                                                                   |
| --- | -------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | map/scale/format 换算                                          | ✅               | 已在 `ScadaBinding` 上，与点表无关                                                                                     |
| 2   | 值→状态判定（valueMap/ranges/booleanMap）                      | ✅               | 已在 symbol 的 `states` 声明上（demo 即此用法）                                                                        |
| 3   | 表达式求值                                                     | ✅               | 通道 B 探针依赖收集 + useScopeSelector paths + 编译缓存已具备                                                          |
| 4   | **高频遥测 out-of-band 通道（INV-4）**                         | ❌               | data-source 推 scope 走 React 状态；万级点高频刷新触发订阅风暴（design-data-binding.md:341,221——正是点表存在的硬理由） |
| 5   | **画面自包含离线能力**（static/expression 点无外部数据可渲染） | ❌               | 依赖 host 供数；丢失「组态文件自包含可复用」（Q3 用户此前裁决）                                                        |
| 6   | **协议适配器稳定归口**（adapter 写 setPointValues，不改 UI）   | ❌               | 丢一个与 UI 解耦的数据写入边界                                                                                         |

**裁定**：点表应降级为**可选间接层**，而非语法强制。绑定语法统一为 `${expr}`（唯一形式）；点表是 host 可选使用的声明工具（需要自包含/量程/死区/协议归口时声明），不声明时绑定直连 scope/data-source。`points` 名称不固化、非保留字——若作者把某成员命名为 `points.x`，访问即 `${points.x}`，仅为普通 scope 标识符，无内置约定。

## 五、收敛方案（推荐，决策项见 §七）

- **D1 单一语法（仅 `${expr}`）**：`binding.expression` / `ScadaPointDeclaration.expression` / `scale.expression` 统一为 flux **`${expr}` 唯一语法**；`@{pointId}` 与 `$xxx` 简写一并弃用。点引用即普通 scope 标识符——若点表声明存在，其值注入求值 scope（复用 `createPrivateEvalScope` 合并机制）；否则表达式直接读 host 注入 scope。`normalizeFluxExpression` 的 `$xxx`/裸路径规整逻辑移除（只接受 `${` 开头）；demo 等地 `flux: '$flow'` 改写为 `flux: '${flow}'`。
- **D2 点表 = 可选间接层**：三源声明（static/expression/flux）保留为**可选**声明，`variables` 可缺省；不声明时绑定直连 scope。`ScadaConfig.variables` 从必选区语义改为可选区（`schemas.ts`/`validate.ts` 同步）。
- **D3 无保留命名空间**：点表值注入求值 scope，不固化 `points.` 前缀；与 scope 数据冲突时的合并优先级按既有 contract 文档化（当前 root 合并 `{...pointValues, ...scopeData}`，scope 胜出，design-data-binding.md §9.1 已锁定）。分 $5 场景（无点表/有点表/同名冲突）各出一用例。
- **D4 移除自建求值器**：`expression-evaluator.ts` 及 `@{}` 语法删除；其职责迁移——依赖收集交给 flux 依赖收集（`extractFluxScopePaths`/探针同源），表达式点重算失效关键在 point generation 缓存失效（bridge 已实现 generation-memoize，:354-365），点间环检测保留为流水线一层守卫。
- **D5 高频通道不变**：INV-4 out-of-band 点表 + 脏收集合帧通道保留，scope 绑定承接低频/中频；性能红线（V2/V4 spike 口径）不回退。
- **D6 迁移不做大爆炸**：validator 兼容旧 `@{}`（warn + 指向迁移）可选受宽容忍期，配置 codemod 提供改写；单元测试改写（expression-evaluator.test.ts / reverse-index.test.ts / bind-resolver.test.ts 相关用例迁移为 flux-formula parity 测试），playground 生产配置已确认无 `@{}` 引用（全部 `binding.point`），无 demo 迁移。

## 六、影响面清单（后续 plan 输入，不在本文档执行）

- **代码（binding/ 域核心）**：删除 `expression-evaluator.ts`；`reverse-index.ts`（`extractPointIdRefs` 语法级提取 → flux 依赖收集）；`dirty-collector.ts` 装配（resolver 的 evaluate 依赖改为 flux 编译求值）；`bind-resolver.ts`（expression/scale.expression 求值入口同源）；`serialization/validate.ts` + `schemas.ts`（`@{}` 不再校验、`variables` 可选）。
- **代码（bridge 层）**：`use-scada-points-bridge.ts` 求值 scope 合并与 generation 失效复用，表达式点重算接入。
- **测试**：同 §五 D6。
- **文档**：`design-data-binding.md`（§4.1/§4.2/§9.1/决策表「双轨数据模型」行）、`design-symbols.md`（§4.2 bindings 容器）、`design-renderer.md`（§4.2 组态 schema）、`roadmap-industrial-hmi.md`（「数据模型：双轨」行、I2.2/I6.2/I10.3 行、平台复用表 formula compiler 行、INV-3 措辞）。
- **roadmap 结构变更**：新增 successor work item「表达式一元化 + 点表可选间接层」；按 Rule 3 人工确认后落 `## Phase Status` / Work Items / Dependency Graph。
- **非目标**：本次不动 meta2d 关键帧动画差距（§参考项目「更好方案」，另行评估）；不动 data-source renderer 本身；不动 INV-4 边界。

## 七、待确认决策（提交人工/gate）

- **D1** 单一声明语法 = flux `${...}`，`@{}` 弃用 —— 确认/否决
- **D2** 点表降为可选间接层（`variables` 可缺省，绑定直连 scope）—— 确认/否决
- **D3** 不固化 `points.` 命名空间；冲突优先级沿用 root 合并 scope 胜出契约 —— 确认/否决
- **D4** 移除 `expression-evaluator.ts`，表达点重算并入 flux 依赖收集 + generation 失效 —— 确认/否决
- **D5** 高频遥测 INV-4 out-of-band 通道保持不变 —— 确认/否决
- **D6** 迁移策略：validator 可选容忍 + codemod，不做大爆炸 —— 确认/否决
- **范围确认**：收敛（D1-D6）是否本期实施；还是仅收口语法先改文档、实施后置（不建议，双语法并存时间越长维护成本越高）

## 八、小结

`@{pointId}` 是 I6.2 在 I10.3 桥接层存在之前的权宜产物，其合理内核（纯逻辑、依赖失效、环检测、自包含）在 flux-formula + 私有求值 scope + generation 缓存失效体系下**全部有替代**；兑现平台复用表与「语法一元化」后的收益：一套表达式语法、编辑器单解析、无私有 DSL 维护成本、绑定直连 data-source 的灵活性。点表不再强制，但其 INV-4 out-of-band 价值（高频遥测）是直接 scope 绑定不可替代的，故保留为可选间接层。

**后续动作（本文档确认后）**：① roadmap 增 successor work item（Rule 3 人工确认后）；② 起草实施 plan（Test Strategy：表达式语法为 public API 面 + 迁移回归路径 → Must automate 档，failing-first Proof 先行）；③ 依 §五/§六 执行；④ 文档同步 + 闭环审计。
