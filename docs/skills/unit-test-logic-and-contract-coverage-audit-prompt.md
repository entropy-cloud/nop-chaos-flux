# 单元测试逻辑覆盖与契约覆盖审计提示词

## 目标

对当前仓库执行一次**面向现有单元测试有效性**的审计，判断这些测试是否真的约束了稳定契约、跨层逻辑和高风险行为，而不是只提供 line/branch coverage、helper-level coverage 或 happy-path confidence。

这份提示词的核心问题不是：

1. 覆盖率百分比够不够高。
2. 测试文件数量够不够多。
3. 哪些分支还没 hit。

而是：

1. 当前测试到底在保护什么契约。
2. 哪些关键逻辑虽然“被跑到了”，但其实没有被断言约束。
3. 哪些跨层缺陷类型会在高 coverage 下继续漏出。

## 适用场景

在以下情况优先使用这份提示词：

1. 仓库已经有较高 unit test coverage，但审计或线上验证仍不断发现真实缺陷。
2. 需要解释“为什么 80%/90% coverage 仍然不够”。
3. 需要评估某个包、某个 feature、某条运行链路的测试是否真正覆盖了稳定契约。
4. 需要找出“看起来很多测试，但其实保护力很弱”的位置。

这份提示词**补充**而不替代：

1. `docs/skills/deep-audit-prompts.md` 的“测试覆盖与质量”维度。
2. `docs/skills/exploratory-contract-testing-prompt.md` 的主动找 bug / 写最小复现测试流程。
3. `docs/skills/code-quality-audit-prompt.md` 的通用代码质量审计。

区别在于：这里专门检查**现有单元测试与稳定契约之间的覆盖关系**。

与 `docs/skills/open-ended-adversarial-review-prompt.md` 一样，这份提示词在真正执行时也要求：

1. 把审计结果按轮次落盘到 `docs/analysis/` 下的新结果目录。
2. 使用子 agent 做多轮处理，而不是单轮读完后一次性给总评。
3. 每轮如果发现了值得记录的问题，就先写入当前执行目录中的新文件，再开始下一轮。

## 开始前必须读

1. `docs/index.md`
2. `AGENTS.md`
3. 当前目标区域对应的 owner architecture docs
4. 当前目标区域的公共 API / `src/index.ts`
5. 当前目标区域已有测试
6. 相关 bug notes / analysis / plan，尤其是那些已经证明“高 coverage 也漏掉了真实问题”的案例
7. `docs/analysis/` 中已有的相关测试审计/测试策略报告，至少快速扫标题、总评和主要发现类型

如果审计的是 compiler / runtime / renderer / host boundary 一类跨层行为，必须同时阅读它的上层 owner doc，而不是只看单个实现文件。

## 核心原则

1. **先识别稳定契约，再看测试。** 不要反过来根据测试去猜契约。
2. **以 public behavior 和 owner contract 为准。** 不要把 helper 当前实现细节当成覆盖目标本身。
3. **区分 hit 到代码 与 约束了逻辑。** branch 被执行过，不代表错误行为会被测试拦住。
4. **区分单层正确 与 跨层正确。** helper、adapter、renderer 各自 unit green，不代表整条 compile -> runtime -> render 链路被约束。
5. **优先找虚假的安全感。** 最有价值的发现是“看起来已有充分测试，但其实守不住真实 defect family”。

## 去重与新鲜度

为了减少重复劳动，在开始前先快速浏览 `docs/analysis/` 中已有的相关审计报告。

1. 这一步的目的只是避免重复撞进同一批老结论，不是把你限制在“只能找新类别”。
2. 如果某个旧问题今天仍然是高价值问题，或者你发现了它更大的影响范围、不同根因、或更严重的后果，仍然应该再次报告。
3. 如果历史 bug note 已经解释过“为什么旧测试没拦住这个问题”，那是高价值证据，必须引用，而不是只复述现象。

## 审计目标

围绕下面四个问题给结论：

1. 现有单元测试覆盖了哪些稳定契约？
2. 哪些关键契约没有对应测试，或只被非常间接地覆盖？
3. 哪些测试虽然很多，但主要在覆盖实现细节、helper 路径或 mock 行为，而不是外部承诺？
4. 哪些 defect family 必须依赖 integration / e2e / exploratory contract test 才能拦住，不能被当前 unit suite 误当成“已覆盖”？

## 重点识别的假覆盖模式

审计时优先寻找这些模式：

1. **绕过真实入口**
   - 例如直接构造 config / runtime state / props / store snapshot，绕过 compiler、owner 初始化或桥接层。
   - 这类测试可能覆盖了 renderer/helper，但没有覆盖真实生产路径。

2. **只测局部 helper，不测公开契约**
   - helper 测试很密，但公共 API、公开 action、renderer contract、schema contract 没有直接断言。

3. **只测 happy path**
   - 有初始化和成功路径，没有空值、缺字段、错误类型、异常传播、竞态、重复执行、销毁后行为。

4. **分支 hit 但断言弱**
   - 测试只是 `toBeDefined`、`not.toThrow`、snapshot、或宽泛 truthy/falsy，无法证明语义正确。

5. **mock 抹平真实风险**
   - 把 compiler、host bridge、scope、network、async runtime mock 得过厚，导致真实边界错误永远不会暴露。

6. **同层假闭环**
   - 输入和预期都由同一套内部 helper 组装，测试只是证明“实现和实现自己一致”。

7. **跨层契约断裂**
   - compile、runtime、react、renderer 各层分别有测试，但没有任何测试约束层与层之间的语义传递。

8. **缺少回归类型映射**
   - 历史 bug 已说明某类缺陷会发生，但测试集中没有对应 defect family 的防回归用例。

9. **错把低层 coverage 当高层 coverage**
   - table/select/helper 已测，并不自动代表 CRUD / form / designer page 的上层 contract 已测。

10. **没有负面证明**

- 只证明“正确输入能工作”，没有证明“不该工作的路径会失败、拒绝、忽略、报错或维持不变”。

## 特别关注的高风险逻辑类型

优先检查这些最容易在高 coverage 下漏掉的问题：

1. owner boundary / truth-surface convergence
2. compile-time lowering 与 runtime 行为的一致性
3. host projection / capability read result / external bridge contract
4. current-scope vs cross-instance targeting 语义
5. error propagation / cancellation / stale-result governance
6. lifecycle: mount / unmount / dispose / reset / owner switch
7. readonly contract 是否真的不能通过外部引用级 mutation 被突破
8. 历史 bug notes 中已经证明脆弱的 defect family

## 执行步骤

### 1. 建立契约清单

先列出目标区域的稳定契约来源：

1. architecture docs 的明确承诺
2. public API / renderer props / action schema / manifest contract
3. 用户可观察行为：返回值、状态变化、错误语义、渲染结果
4. 已记录 bug note 中被确认的重要负面契约

不要一上来先数测试文件数量。

### 2. 建立“契约 -> 测试”映射

对每个关键契约，回答：

1. 哪个测试直接约束它？
2. 是 unit、integration、e2e，还是根本没有？
3. 测试是否走真实入口？
4. 测试断言是否足够在错误实现下失败？

如果只能找到“间接相关测试”，默认视为弱覆盖，而不是已充分覆盖。

### 3. 识别逻辑断层

重点检查：

1. 哪些测试绕过了真实 compile / lowering / owner setup 流程。
2. 哪些行为只在 helper 粒度被测，但在 public entrypoint 没有验证。
3. 哪些关键分支虽然 hit 了，但断言不能区分正确结果和错误结果。
4. 哪些跨层逻辑没有任何一条测试贯穿完整路径。
5. 哪些历史 bug 所属 defect family 仍然没有被稳定回归测试覆盖。

### 4. 判断缺口类型

把每个缺口分类为以下之一：

1. 契约未覆盖
2. 入口错误覆盖（测了 helper，没测真实入口）
3. 断言过弱
4. 过度 mock
5. 跨层断层
6. 缺少负面场景
7. 缺少历史 bug family 回归保护
8. unit test 本身不适合作为主防线，需依赖 integration / e2e

### 5. 评估“coverage 为何误导”

对每个高价值发现，明确说明 coverage 数字为什么会给出假安全感，例如：

1. 代码被执行，但真实生产入口未被覆盖。
2. 同一根因的多个内部 helper 被测，抬高了 lines/branches，但关键 contract 仍未被证明。
3. mock 让危险分支无法真实发生。
4. 测试只证明“不会崩”，没有证明“结果正确”。

### 6. 给出最小补强建议

不要泛泛说“多加测试”。每个建议都应说明：

1. 最值得补哪一个稳定契约测试。
2. 最小应该走哪条真实入口。
3. 应断言什么结果，才能真正拦住这类问题。
4. 这条补强更适合 unit / integration / e2e 中的哪一层。

### 7. 多轮与子 agent 执行要求

这份提示词在真正执行时，必须仿照 `docs/skills/open-ended-adversarial-review-prompt.md` 的方式做**多轮处理**，而不是单轮扫完后一次性给结论。

执行规则：

1. 至少启动一轮主审计子 agent，并鼓励按需要启动额外子 agent 做独立复核、特定包深挖、或历史 bug family 对照。
2. 不要把子 agent 退化成机械的固定维度派工；每轮应围绕 live code 中已经暴露出的高价值线索推进。
3. 每一轮都应回答：这一轮新发现了什么？和上一轮相比新增了什么证据、实例、根因或影响范围？
4. 如果某一轮没有发现任何新的高价值问题，才可以停止；不要因为已经写出一版结论就提前结束。
5. 如果上一轮暴露出某类问题可能还存在更多实例、更多根因或更大的影响范围，应继续沿该方向深挖；如果该方向已经挖得充分，就切换新的切入点。

## 输出格式

先给 findings，再给总结。

每个发现至少包含：

1. 严重度：`P0` / `P1` / `P2` / `P3`
2. 类别：`契约未覆盖` / `入口错误覆盖` / `断言过弱` / `过度 mock` / `跨层断层` / `缺少负面场景` / `历史回归缺口`
3. 契约：被漏掉或被弱覆盖的稳定契约是什么
4. 位置：相关实现文件 + 测试文件路径
5. 现状：现在的测试为什么不足
6. 为什么 coverage 会误导
7. 建议：最小补强方式

然后补两段总结：

1. **Coverage Assessment**
   - 当前测试更接近 line/branch coverage、helper coverage、还是 contract coverage。
   - 当前最强和最弱的 coverage 面分别是什么。

2. **Recommended Next Tests**
   - 只列最高 ROI 的 3-7 个补强方向。
   - 说明每项应该在哪一层补：unit / integration / e2e。

## 重要提醒

1. 不要把 coverage 百分比本身当结论。
2. 不要因为某个文件有很多测试就默认它被充分保护。
3. 不要因为某个 bug 能写成 unit test，就否认 integration / e2e contract proof 的必要性。
4. 反过来也不要把所有问题都推给 e2e；很多 owner/runtime/contract 问题仍然应该有 focused regression unit/integration proof。
5. 如果已有 bug note 明确说明“旧测试为什么没拦住这个问题”，那是高价值证据，必须引用。

## 执行方式

1. 先读 `AGENTS.md`、`docs/index.md`、相关 owner docs、公共 API、已有测试，以及 `docs/analysis/` 中已有的相关审计结果。
2. 先建立稳定契约清单，再启动子 agent 做第一轮“契约 -> 测试”映射；不要先按文件数量或 coverage 数字做排序。
3. 充分利用子 agent 做多轮独立处理，例如：
   - 一轮聚焦 public API / owner contract 与现有测试映射
   - 一轮聚焦历史 bug family 与现有 regression coverage 的断层
   - 一轮聚焦跨层链路（compiler -> runtime -> react -> renderer）是否只有分段测试、缺少贯通证明
4. 每轮如果发现了值得报告的问题，先保存到 `docs/analysis/` 当前执行目录中的一个新文件，再开始下一轮。
5. 后续轮次应把前面轮次作为去重背景和线索来源，但不应把它们当作新的检查边界。
6. 只有某一轮确实没有发现新的高价值问题时，才停止并输出最终汇总。

## 结果落盘与重复执行

每次真正执行这份提示词时，都必须遵守下面的落盘规则：

1. 在一次新的执行开始时，先在 `docs/analysis/` 下创建一个**新的结果目录**，用于保存这次执行的全部轮次结果；不要复用旧目录，也不要把不同执行混写到同一个目录里。
2. 结果目录名应能体现这次执行的先后顺序或时间，例如包含日期、时间或执行序号，确保后续能区分不同批次。
3. 每一轮只要发现了任何值得报告的问题，就立刻把这一轮的发现保存到当前执行结果目录下的一个**新文件**中，不要覆盖同目录中的上一轮文件。
4. 每轮文件名都应体现轮次或先后顺序，例如 `round-01.md`、`round-02.md`，避免后续无法判断目录中的哪一份报告对应哪一轮。
5. 下一轮不要重复报告已经写过的同一个问题；但如果发现的是新的实例、新的根因、此前未记录的影响范围、或更严重的后果，仍应视为新发现并单独记录。
6. 如果某一轮没有发现任何新的高价值问题，才可以停止，并在最终回复中明确说明“本轮未发现新的问题”。
7. 换句话说：`开始一次执行 -> 创建本次执行目录 -> 启动子 agent 做一轮审计 -> 发现问题则单独写入 round 文件 -> 继续下一轮`，直到某一轮确实没有新的高价值发现为止。

## 可直接复用的提示词正文

```text
请对当前仓库执行一次“单元测试逻辑覆盖与契约覆盖审计”。

要求：
1. 不要把 line/branch coverage 当成结论。
2. 先识别稳定契约，再评估现有测试是否真正约束这些契约。
3. 必须区分：代码被执行过，和错误行为会被测试拦住，这两件事。
4. 重点找出高 coverage 下仍会漏掉真实 defect family 的原因。
5. 必须指出哪些测试绕过真实入口、哪些断言过弱、哪些地方被过度 mock、哪些缺口属于跨层断层。
6. 如果历史 bug note 已经说明旧测试为何失效，必须把它作为证据纳入结论。
7. 必须先快速浏览 `docs/analysis/` 中已有的相关报告，避免重复，但不要因此忽略旧问题的新影响范围或新根因。
8. 必须使用子 agent 做多轮处理，而不是单轮扫完后一次性给总评。
9. 每次真正执行时，先在 `docs/analysis/` 下创建一个新的结果目录；这一轮执行中的每一轮检查结果，都要作为该目录中的一个单独文件保存。
10. 只要某一轮发现了值得报告的问题，就先把这一轮结果写入 `docs/analysis/` 当前执行目录中的新文件，再开始下一轮。
11. 只有当某一轮确实没有发现新的高价值问题时，才可以停止，并在最终结论中明确说明“本轮未发现新的问题”。

输出格式：
1. Findings
   - 每条包含：严重度、类别、契约、相关实现/测试位置、现状、coverage 为什么会误导、最小补强建议。
2. Coverage Assessment
   - 判断当前测试更像 helper coverage、branch coverage，还是 contract coverage。
3. Recommended Next Tests
   - 只列最高 ROI 的补强测试，并说明适合 unit / integration / e2e 哪一层。

结论必须基于 live code、owner docs、已有测试与 bug notes，而不是只基于 coverage report。
```
