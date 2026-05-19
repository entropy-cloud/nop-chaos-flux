# Attractor Before Harness: AI 大规模开发的方法论

> 在 AI 大规模参与开发的系统里，第一性的问题从来不是“如何约束 AI 的行为”，而是“系统应该向哪里长期收敛”。
> 只有当这个方向被定义清楚之后，harness、guardrail、verification、audit、closure 这些机制才真正有意义。否则，它们只是在更高效地维持一套错误基线。

## 一、为什么一谈 AI 工程，大家先想到 Harness

现在关于 AI 辅助开发的主流话语，最常出现的是这些词：

- `guardrail`
- `verification`
- `review`
- `feedback loop`
- `agent harness`

这套直觉默认了一个前提：

**系统正确的方向已经知道了。**

在此前提下，问题自然会变成：

- 怎么限制偏离
- 怎么尽早失败
- 怎么让 review 更严
- 怎么让 agent 不胡来

这套语言在小任务里通常够用。一个脚本、一页 CRUD、一个局部 bug 修复，大多数时候你已经知道“对的结果长什么样”，剩下的主要是执行和验证问题。

但大型系统真正困难的地方，往往不是“怎么防止越线”，而是“到底哪条路才是长期正确的结构”。

这就是为什么，AI 大规模开发的第一性问题不是 harness，而是 attractor。

这里的 `attractor` 指系统长期会被拉回的稳定结构，`harness` 指持续测量和纠偏的执行支架。

## 二、动力系统语言为什么适合描述这个问题

在数学物理中，**动力系统**指的是一个状态会随时间持续演化、并且下一步状态依赖当前状态的系统。我们关心的不只是某一个时刻对不对，而是它在时间中会走出什么样的**轨迹**。

放到 AI 大规模开发里，这套语言对应四个层级：

- `状态空间`：系统所有可能演化到的实现状态
- `吸引子`：系统长期会被拉回去的稳定结构
- `轨迹`：每一轮生成、验证、纠偏之后真实留下来的演化路径
- `控制`：用局部信号持续影响轨迹的各种机制

仓库在当前约束下所有可能长成的代码、文档、测试组合，就是状态空间；人、AI、review、CI、文档更新这些持续作用，就是演化规则；它们叠加出来的 live repo 历史，就是轨迹；attractor 则是这套系统在长期迭代中会被反复拉回的稳定结构。

**吸引子不是一个单点终局，也不是一块“允许活动区域”，而是由少量高阶结构关系隐式定义出来、能够持续拉回系统演化的稳定形态。**

这四个层级的关系是：

**状态空间 -> 吸引子 -> 轨迹 -> 控制**

这里的 `before` 说的是逻辑优先，不是瀑布式时序。工程实践里，attractor 和 harness 会在闭环中共同演化，但只有先知道什么样的结构值得被拉回，后面的 harness、guardrail、verification、audit、closure 才有统一意义。

以广为人知的Lorenz 吸引子为例，它由方程隐式定义，不是把所有正确轨迹预先列出来的清单，也不是一个简单边界。局部轨迹非常复杂，短期看上去甚至近乎混沌，但整体并不是随机乱飞，而是始终被拉回同一类几何形态。

![Lorenz attractor](../ppts/assets/lorenz-attractor.png)

_Lorenz attractor：局部轨迹高度复杂，整体仍被稳定结构约束。混沌不等于随机；局部不可预测，不等于整体失控。_

工程里的 attractor 也一样。它不是某个具体功能，也不是某个单独模块的完成态，而是系统长期应该收敛到什么结构。它更像一组决定系统一阶结构的高阶约束：职责怎么分，边界怎么立，哪些结构关系不能被破坏，哪些旧模式一出现就说明系统又被拖回了错误基线。

如果借一个数学类比，它更像“方程定义流形”，而不是“把所有合法点一一列出来”。方程不会提前写出流形上的每一个点，它只规定哪些关系必须成立；满足这些关系的点，自然就落在同一个结构里。工程里的 attractor 也是这样：owner doc 不会预先写完所有正确实现，但它会先固定少量不能破的结构关系，后续实现只能在这些关系约束下展开。

## 三、为什么这个问题在 AI 时代会变成主问题

AI 并不是把旧问题简单放大了一点，而是把系统展开状态空间的速度提高了太多。

人类工程师写一个功能，通常是渐进展开；AI 往往会在极短时间内同时给你：

- 一段代码
- 一套类型
- 几个测试
- 一段说明
- 一句“已经完成”的总结

危险不在明显胡说，而在局部信号高度像对。接口有了，类型有了，测试也补了，文档也更新了，解释还特别流畅。只看这些局部信号，很容易产生一种错觉：系统正在稳步前进。

真实情况可能是，系统整体已经开始偏航。

**不是某一步明显做错，而是每一步都像合理，整体却持续漂移。**

规模一上来，这个问题就会突然变得尖锐。一个长期演化的大仓库会同时出现：

- 多 session
- 多 agent
- 多轮计划
- 多层文档
- 多个局部成功信号

于是“局部都像对的”就不再是小毛病，而会变成系统性风险。

在 `nop-chaos-flux` 的历史里，Plan 76 是一个很典型的例子。那次尝试移除 `array-editor` / `key-value` 的本地状态镜像，结果直接引出 11 个测试失败。暴露出来的不是一个孤立 bug，而是更麻烦的事实：**测试本身也已经绑定在旧实现时序上了。**

更通用的场景是：团队想把“数据获取”和“页面渲染”拆开，AI 很快补齐了接口、类型和测试，CI 也全绿；但如果这些测试仍然默认旧的耦合时序，那么系统只是把旧结构包上了一层新名字。表面在重构，实际仍在原地打转。

一旦出现这种现象，传统那套“哪一步违规了”“哪条规则没过”“哪个 PR 有问题”的语言就不够用了。因为问题不只是点上的错误，而是轨迹本身错了。

## 四、仓库开始承担系统真相，Harness 因而变成基础设施

AI 深度参与以后，仓库不再只是认知的外化，而开始承担系统真相的载体。下一个 session 能重新读取的，不是作者脑中的完整意图，而是代码、diff、日志、测试和文档。

这会带来一个直接的工程后果：

**生成和验收被真正拆开了。**

生成动作可以在同一个上下文里高速完成，但验收已经不能再依赖那个生成上下文本身。你必须回到仓库里的外部证据，重新判断：

- 行为是不是真的落地了
- 当前基线到底是什么
- 哪些材料是权威的
- 这次“完成”是不是只是一种完成感

正因为 repo 开始承担系统真相，generation 和 evaluation 才必须分离；也正因为 generation 和 evaluation 分离，harness 才从一种“更稳妥的工程习惯”变成必要基础设施。它不再只是帮你管流程，而是在 repo truth 条件下，把生成重新接回可独立复核的验收。

在 repo truth 条件下：

- `test / lint / audit` 更像测量
- `owner doc / plan / closure` 更像约束
- `logs / bugs / discussions` 更像轨迹记录和外部化记忆

## 五、三个最容易发生的误解

第一，**吸引子不是边界**。

边界回答的是“什么不能做”，吸引子回答的是“系统应向哪里长期收敛”。边界定义禁区，吸引子定义稳定区。两者不是强弱关系，而是层级关系。

第二，**吸引子不是更强的护栏**。

把它理解成更严格的治理、更密的约束、更强的审计，仍然是在把第一性问题降格。护栏属于执行层，吸引子属于方向层。

第三，**吸引子不是控制目标的另一种说法**。

`control target` 这个词看起来很接近，但它默认控制已经成立了。这里真正要强调的是：如果没有先定义 attractor，那么所谓控制就没有目标，harness、guardrail、verification、audit 这些机制也没有统一含义。

## 六、在这个仓库里，Attractor 首先是 `docs/architecture/`

如果 attractor 只停留在抽象层面，它就还没有真正的工程意义。对 `nop-chaos-flux` 来说，首先承担 attractor 的，不是泛泛的“架构意识”，而是 **`docs/architecture/` 中带 precedence 的 owner-doc 体系**。

在本仓库里，工程落点很明确：`docs/architecture/` 下的规范定义在前，plan、verification、audit、logs 等收敛机制在后。

在 `docs/architecture/` 内部，这种“方程层”也有明确 precedence：

- `docs/architecture/README.md` 负责说明 architecture hierarchy 和 reading order
- `flux-design-principles.md` 负责方向层，解释设计意图和稳定原则
- `frontend-programming-model.md` 负责顶层规范层，定义 primitive identity、macro boundary 和 hard invariants
- `flux-core.md` 负责当前 codebase-wide baseline
- narrower architecture doc 再在各自主题内定义局部 contract

在 `nop-chaos-flux` 里，这个 attractor 也不是抽象的“正确架构”，而是由少数高价值不变量共同定义出来的：七个原语闭合集、编译优先的流水线、Template/Instance 分离、Data/Capability 正交、统一 renderer/hook contract，以及 `flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime -> flux-react` 的依赖方向。

它们不是并列的治理材料，而是 `docs/architecture/` owner docs 固定下来的结构方程。架构的价值不在于描述一切，而在于让错误结构无法继续合法存在。

**在这个仓库里，首先定义 attractor 的不是 plan、lint、audit、logs，而是 `docs/architecture/` 下带 precedence 的 owner-doc 体系。其他机制都在它之后。**

也正因为如此，这个仓库里很多真正重要的收敛动作，最后都会表现成“某个旧结构被排除出合法状态空间”。

`CompiledSchemaNode` 被最终移除，就是一个典型例子。它不是单纯的重构清理，而是说明：模板/实例分离这条新基线成立之后，旧的中间结构虽然还能工作，但已经不再属于正确结构，于是被排除出去。

同样，`flux-compiler` / `flux-action-core` / `flux-runtime` 三层拆分也不是“多拆了两个包”这么简单，而是在说明 attractor 变得更精确了：系统不只是“能跑”，而是被进一步收敛到更稳定的职责结构。

## 七、什么是 Harness

如果 attractor 解决的是“方向是什么”，那么 harness 解决的就是：

**如何通过局部信号，持续地测量、纠偏、更新系统轨迹。**

这里说的 harness，不是狭义的测试 harness，而是更广义的执行支架。它通常包括：

- 上下文路由
- 实现与验收分离
- 计划与关闭条件
- 验证机制
- 审计机制
- 诊断工具
- 外部化记忆

harness engineering 关心的是：

- AI 该读什么，不该读什么
- 哪些结论能进入当前基线，哪些只能停留在探索层
- 什么算完成，谁来判定完成
- 漂移如何被尽早发现
- 同一个错误如何不在新 session 中重复出现

它不是“几条测试规则”，也不是“再加点 lint”，而是一整套让局部信号持续作用于系统轨迹的工程支架。

放到这个仓库里，至少可以看到五层 harness：

### 1. 路由 harness

`docs/index.md` 和 `docs/architecture/README.md` 决定：碰到什么问题先读什么，什么是 current baseline，什么只是 analysis、plan 或 history。

### 2. Plan harness

`docs/plans/` 解决的是“这一轮扩张如何收口”，不是“系统是什么”。

`current baseline`、`goals / non-goals`、`exit criteria`、`validation checklist`、`closure audit evidence` 这些字段定义的是局部轨迹怎样才能合法闭合。

Plan 145 在 closure/audit 之后把新确认的跟进面拆到 Plan 146，Plan 143 的 closure assumption 被 fresh audit 连续推翻，直到 live repo 真正过线后才允许关闭。这说明 plan 在这里不是待办列表，而是局部收敛器。它不是把“现在有哪些事要做”列出来，而是规定这一轮扩张要收口到哪里、满足什么退出条件，以及 closure 需要哪些独立证据。

### 3. Verification harness

`lint`、`check`、`typecheck`、`build`、`test` 负责的不是方向定义，而是尽量把高频、明确、可自动化的偏离检测提前到机器层。

### 4. Audit harness

并非所有偏离都能被自动化规则抓住。更高层的语义漂移、结构偏差、假完成、局部自洽但整体失真的问题，仍然需要独立审计。

审计在这里本身也是一个闭环：发散发现、过滤冲突和伪问题、回看 live repo 再确认。高质量审计的重点，不是堆出更多问题，而是尽快排除不成立的问题。

在这个仓库里，最关键的 harness 规则之一就是：不要让同一个上下文既做实现，又做完成判定。完成必须由 fresh session 或独立审计重新回看 live repo；Plan 143 和 Plan 145 的 closure 之所以有意义，正是因为“完成”不是实现者自报，而是独立收敛裁决。

### 5. Memory harness

`docs/logs/`、`docs/bugs/`、`docs/discussions/` 构成了跨 session 的外部化记忆。

这一层特别重要，因为对 AI 来说，“为什么不能那样理解”本身也是系统记忆的一部分。只保留最终结论还不够，很多时候还必须保留：

- 哪个前提已经被证伪
- 哪条路径已经证明会发散
- 哪种术语翻译会把问题降格
- 哪个“已完成”判断后来被 live repo 推翻

没有这层 memory harness，系统每次都会丢失一部分历史势能。

真正的闭环不是“定义一次 attractor，然后永久执行 harness”，而是“定义 attractor -> 扩张 -> 纠偏 -> 更新 attractor -> 再扩张”。`flux-compiler` / `flux-action-core` / `flux-runtime` 的三层拆分，就是 attractor 被实践校正后再继续扩张的例子。

## 八、为什么新 Attractor 通常不是 AI 自己长出来的

即使已经有了 harness，也不能指望 AI 在高速迭代中自己慢慢长出新的 attractor。

- 当前主流 AI 很擅长围绕既有 attractor 高速展开和收敛
- 但它通常会回到自己见过的平均方案
- 真正新的概念切分、边界重定义、结构语言，通常仍然需要人先给出

**不能把新 attractor 的发明权默认外包给 AI。**

在大型框架开发里，人和 AI 的分工不能简单理解成“AI 写代码，人做 review”。更真实的分工是：

- 人定义新的 attractor
- AI 围绕既定 attractor 高速展开
- harness 持续把轨迹压回去

像 `ActionScope` 和 `Data Scope` 分离、词法作用域这类真正改变系统结构语言的东西，并不是让 AI 自己自由采样平均方案就会自然长出来的。它们更像是新 attractor 先被提出，然后 AI 才能在这个新基线上做大规模展开。

## 九、结语

AI 大规模开发真正困难的地方，不在于让 AI 多写一点代码，而在于让系统在高速扩张中仍然向正确结构收敛。谁提出新的 attractor，谁就在定义系统后续演化的结构基线。

把这套方法压缩到最后，核心只有一句：

**状态空间 -> 吸引子 -> 轨迹 -> 控制**

这个顺序不能反。先有系统应向哪里长期收敛的结构，才有轨迹是否跑偏的判断；先有轨迹是否跑偏的判断，后面的 harness、guardrail、verification、audit、closure 才有统一意义。

AI 时代真正稀缺的，不是更多会写代码的 agent，而是能先回答“系统该向哪里收敛”的人。

---

**nop-chaos-flux 已开源：**

- GitHub: https://github.com/entropy-cloud/nop-chaos-flux
- Gitee: https://gitee.com/canonical-entropy/nop-chaos-flux
