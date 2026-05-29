# Harness Engineering 之外：从非线性动力系统控制理解人工智能驱动的软件工程

> 本文面向已经熟悉 Harness Engineering 但还不熟悉 Attractor-Guided Engineering 的读者。
>
> Harness Engineering 关注如何约束、验证、审计人工智能生成；Attractor-Guided Engineering（吸引子引导工程）进一步追问：这些控制机制到底要把仓库轨迹拉回到什么长期结构？
>
> 本文不是试图把软件工程形式化为物理定律，也不是说吸引子引导工程可以从 port-Hamiltonian systems 中被严格推出。它要做的是一次概念迁移：借助 port-Hamiltonian systems 和 Immersion and Invariance 的语言，重新看清吸引子引导工程中一些已经存在、但尚未被充分命名的结构：语义承诺如何守恒，变化义务如何转换，文档拓扑如何保持结构，人工智能会话如何在跨时间的仓库中恢复同一个系统现实。

## 一、为什么需要这个类比

吸引子引导工程已经有一套核心语言：

**状态空间 → 吸引子 → 轨迹 → 控制**

这套语言解决了人工智能大规模开发中最重要的问题：当人工智能以高频、高幅度、无持续记忆的方式扰动仓库时，系统怎样仍然长期收敛到稳定结构。

更准确地说，吸引子引导工程是从**动力系统的思维图像**来审视人工智能驱动的软件工程。它不把一次人工智能任务看成孤立的输入输出，而是把仓库看成一个随时间演化的状态空间：人工智能、人、持续集成、审计、文档更新都是扰动和控制；owner docs 定义系统应反复回到的吸引子；plans、tests、audits、logs 则是让轨迹不断校准的局部控制机制。

port-Hamiltonian systems 则可以看成动力系统控制论中的一种高级结构化图像。它不是单纯多一套方程，而是用“能量—互联—阻尼—端口”统一描述复杂非线性系统：Hamiltonian 描述系统储能，斜对称互联描述无损能量路由，阻尼描述耗散，端口描述外部交换。它的高级之处不在于更复杂，而在于把本来散落在方程各处的结构显式化。

因此，本文讨论的不是“吸引子引导工程等于 port-Hamiltonian systems”，而是：既然吸引子引导工程已经把人工智能软件工程看成一个受控动力系统，那么 port-Hamiltonian systems 这套成熟的动力系统控制图像，能不能帮助我们进一步识别吸引子引导工程中的守恒量、相变量、互联拓扑、耗散机制和端口边界。

本文的术语约定如下：

- Attractor-Guided Engineering：本文译作“吸引子引导工程”。这个名字较长，正文尽量使用中文全称。
- Harness Engineering：本文保留英文，指围绕人工智能生成建立 guardrails、verification、review、audit、diagnostics 等执行支架的工程实践。
- port-Hamiltonian systems：本文保留英文，中文资料中可见“端口哈密顿系统”“端口受控哈密顿系统”等译法，但并不在本文中强行采用某个译名。
- Immersion and Invariance：本文译作“浸入与不变性”。这个名字不长，正文尽量不用缩写。
- Hamiltonian：本文按语境称为 Hamiltonian、哈密顿量或哈密顿函数。
- owner docs：指在仓库中拥有某类事实最终解释权的长期文档，例如架构基线、功能设计或组件合同。
- closure audit：指任务完成前沿着需求、owner docs、代码、测试和日志重新检查闭合证据的审计。
- Flux：本文所在项目使用的吸引子引导工程模板；读者可把它理解为一个具体落地实例，而不是理解本文所必需的专有前提。

但这套语言还有一个尚未展开的层面：

**在一次次输入、计划、实现、验证、审计、日志之间，到底有什么东西在被保持、被转换、被路由、被耗散？**

如果只用普通流程语言回答，很容易退回线性流水线：

```text
input → requirement → design → plan → code → test → log
```

这个图是误导性的。真实开发并不是只读上一阶段输出，然后生成下一阶段产物。写代码和检查代码时，人工智能必须同时参考：当前 requirement、owner docs、live code、tests、known-good baseline、bugs、logs、plan、audit、外部 contract，以及文档索引和架构层级给出的阅读路由。

换句话说，吸引子引导工程不是单向级联流程，而是一个多端口耦合系统。

port-Hamiltonian 视角的启发正在这里：不要把复杂耦合项当作必须消灭的噪音；很多耦合项本身就是系统保持结构的方式。电机控制中常用 d-q 坐标，也就是随转子旋转的直轴/交轴坐标；在这个坐标下出现的交叉耦合项不是扰动，而是能量在不同坐标之间无损流动的结构。类似地，吸引子引导工程中 `requirements`、`architecture`、`plans`、`code`、`tests`、`logs` 之间的交叉引用，不是文档冗余，而是语义承诺在不同载体之间保持可恢复性的拓扑。

## 二、port-Hamiltonian systems 的最小数学背景

port-Hamiltonian systems 的基本出发点，是把一个物理系统看成“储能、互联、耗散、端口交换”的组合。它不先问“怎样把系统线性化”，而是先问：系统的能量储存在哪里，能量如何在内部无损流动，哪里发生耗散，外部又通过哪些端口注入或取走能量。

这套语言来自 1990 年代 van der Schaft、Maschke、Ortega 等人围绕非线性系统、广义键合图和无源性控制建立的结构化建模框架。它和传统状态空间模型的区别不在于多写了几个矩阵，而在于它把“能量函数”和“互联拓扑”放到第一位置。机械系统、电路、电机、电力网络、流体网络都可以在这个视角下被看成储能元件、耗散元件和端口互联的组合。

后来的 Interconnection and Damping Assignment Passivity-Based Control（互联与阻尼配置无源性控制）进一步把这个思路用于控制设计：控制器不是简单抵消非线性，而是重新配置闭环系统的互联结构和阻尼分布，使新的闭环 Hamiltonian 具有期望形状。结构保持观测器、port-Hamiltonian 网络稳定性、微电网无源互联等方向，也都继承了同一个核心判断：保留结构往往比抹平结构更稳健。

最常见的有限维 port-Hamiltonian system 可以写成：

$$
\dot{x}=\bigl(J(x)-R(x)\bigr)\nabla H(x)+G(x)u,
\qquad
y=G(x)^T\nabla H(x).
$$

其中：

| 符号          | 含义                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------- |
| $x$           | 系统状态，例如机械位置/动量、电路磁链/电荷等                                                 |
| $H(x)$        | Hamiltonian，总储能函数                                                                      |
| $\nabla H(x)$ | 能量对状态的梯度，也常称为 co-energy variables；在具体端口选择下可对应力、电压、电流等共轭量 |
| $J(x)$        | 斜对称互联矩阵，满足 $J(x)^T=-J(x)$，表示无损能量路由                                        |
| $R(x)$        | 半正定耗散矩阵，满足 $R(x)=R(x)^T\succeq 0$，表示电阻、摩擦等耗散                            |
| $G(x)$        | 外部端口如何耦合进系统                                                                       |
| $u$           | 端口输入，例如外加电压、外力                                                                 |
| $y$           | 端口输出，通常与 $u$ 配对形成输入功率 $y^Tu$                                                 |

这个形式最关键的不是方程本身，而是它自动给出能量平衡式。沿系统轨迹对 $H$ 求导：

$$
\dot{H}
=\nabla H^T\dot{x}
=\nabla H^TJ\nabla H-\nabla H^TR\nabla H+\nabla H^TG u.
$$

由于 $J$ 斜对称，任意向量 $a$ 都满足：

$$
a^TJa=0.
$$

所以：

$$
\dot{H}=-\nabla H^TR\nabla H+y^Tu.
$$

这就是 port-Hamiltonian system 的核心能量账本：

- $J$ 只搬运能量，不创造也不消灭能量；
- $R$ 消耗系统内部能量；
- $y^Tu$ 是外部端口输入或输出的功率。

如果没有耗散和外部输入，即 $R=0$ 且 $u=0$，则：

$$
\dot{H}=0.
$$

能量守恒。若 $u=0$ 但 $R\succeq 0$，则：

$$
\dot{H}\le 0.
$$

系统能量单调不增。这就是 passivity-based control 和 energy shaping 能成立的基本原因。

把上式从 $0$ 积分到 $t$，得到无源性不等式：

$$
H(x(t))-H(x(0))\le \int_0^t y(\tau)^T u(\tau)\,d\tau.
$$

它表达的意思是：系统储能的增加不会超过外部端口输入的总能量。系统可以储能、释放能量、耗散能量，但不能无中生有地产生能量。

这个不等式解释了为什么 port-Hamiltonian systems 特别适合网络系统。若两个无源系统通过功率守恒方式互联，例如：

$$
u_1=-y_2,
\qquad
u_2=y_1.
$$

则两个端口功率相加为：

$$
y_1^Tu_1+y_2^Tu_2
=y_1^T(-y_2)+y_2^Ty_1
=0.
$$

互联本身不注入也不耗散能量，只是在两个子系统之间搬运能量。因此“无源系统的无损互联仍保持无源”。这条性质是 port-Hamiltonian systems 能从单个电机、机械臂、电路，扩展到微电网、网络化系统和大规模物理系统建模的关键。

最小的 canonical Hamiltonian 系统可以写成：

$$
x=(q,p),
\qquad
\begin{bmatrix}
\dot{q}\\
\dot{p}
\end{bmatrix}
=
\begin{bmatrix}
0&I\\
-I&0
\end{bmatrix}
\begin{bmatrix}
\frac{\partial H}{\partial q}\\
\frac{\partial H}{\partial p}
\end{bmatrix}.
$$

这里 $q$ 是位置类变量，$p$ 是动量类变量，中间的矩阵就是最基本的辛结构。它的作用不是耗散能量，而是让能量在“位置势能”和“动量动能”之间往复转换。

如果加入耗散和端口，就得到更一般的形式：

$$
\begin{bmatrix}
\dot{q}\\
\dot{p}
\end{bmatrix}
=
\begin{bmatrix}
0&I\\
-I&0
\end{bmatrix}
\begin{bmatrix}
\frac{\partial H}{\partial q}\\
\frac{\partial H}{\partial p}
\end{bmatrix}
-\text{damping terms}
+\text{port input terms}.
$$

电机中的 Park 变换之所以重要，是因为它把静止三相坐标中隐藏的旋转耦合，显式写成 d-q 坐标下的斜对称互联项。这个交叉项从能量角度看不是扰动，而是能量在 d 轴、q 轴和机械动量之间流动的结构通道。

可以用一个二维斜对称矩阵看出这个事实：

$$
S=
\begin{bmatrix}
0&-1\\
1&0
\end{bmatrix},
\qquad
S^T=-S.
$$

对任意二维向量 $z$，都有：

$$
z^TSz=0.
$$

如果一个局部动态里出现 $\omega Sz$，它会让 $z$ 的两个分量相互旋转、交换能量形态，但不会改变二次能量 $\frac{1}{2}z^Tz$：

$$
\frac{d}{dt}\left(\frac{1}{2}z^Tz\right)
=z^T\dot{z}
=z^T(\omega Sz)
=\omega z^TSz
=0.
$$

这就是为什么 port-Hamiltonian 视角会警惕“把交叉耦合项全部补偿掉”的直觉。某些交叉项并不是误差，而是系统拓扑在局部坐标中的表现。

因此，port-Hamiltonian 视角给吸引子引导工程的真正启发不是“给软件工程套一个公式”，而是三条方法论原则：

1. 先找倾向守恒的量，而不是先找要消灭的误差。
2. 区分无损路由和真实耗散，不要把“信息移动了”误认为“问题解决了”。
3. 把端口、互联拓扑和耗散机制显式化，而不是把所有耦合压平成一个线性任务链。

## 三、反馈线性化式的软件工程误区

在控制理论中，精确反馈线性化试图用坐标变换和反馈把非线性项消掉，让系统表现为一个线性对象。这在某些系统中有效，但也可能高度依赖精确参数，并破坏系统原有能量结构。

软件工程里有一种相似冲动：为了让人工智能更容易执行，把所有知识压进一种统一 artifact：spec、change、task list、issue、pull request description，或者某个总计划文档。

这种做法看似降低了复杂度，其实是在做工程意义上的“线性化”：

- raw input 中的语境被压平成需求条目；
- owner docs 的长期结构被压平成本轮任务说明；
- architecture precedence 被压平成 checklist；
- logs、bugs、analysis 中的历史判断被压平成“已知事项”；
- tests 和 audits 被压平成“已完成证明”。

局部看，这样更容易让人工智能执行。长期看，它会破坏仓库的语义拓扑。不同类型的事实被挤进同一个坐标系后，人工智能不再知道哪个材料回答“现在是什么”，哪个材料回答“应该向哪里收敛”，哪个材料只是“当时为什么这么做”。

吸引子引导工程反对的不是 spec，也不是 checklist。吸引子引导工程反对的是把所有知识强行变成同一种执行形态。`docs/architecture/`、`docs/components/`、`docs/plans/`、`docs/logs/`、`docs/bugs/`、`docs/analysis/` 必须保留不同职责，因为它们是同一个仓库系统中的不同能量端口和不同状态坐标。

## 四、吸引子引导工程的 Hamiltonian 不是混乱度

如果要在吸引子引导工程中创造性地定义一个 Hamiltonian，最容易犯的错误是把它定义成“混乱度”“风险”“未闭合问题总量”之类需要被降低的量。

这不对。

Hamiltonian 在物理系统中首先是某种倾向于守恒的量。对于吸引子引导工程，更合适的定义是：

$$
H_{repo}=\text{仓库中仍然有效、需要跨 session 被恢复并约束未来演化的语义承诺总量}.
$$

这里的“语义承诺”不是文件字数，也不是文档条目数，而是系统已经接受、不能随便丢失的承诺。例如：

- 某个用户可见行为必须存在；
- 某个 schema 字段具有确定语义；
- 某个 package dependency direction 不得反转；
- 某个 renderer contract 必须稳定；
- 某个历史 bug 的根因不能被再次引入；
- 某个 audit finding 已被证伪，不应继续驱动整改；
- 某个 owner doc 定义了当前规范基线，而不是未来设想。

所以 $H_{repo}$ 可以粗略分解为：

$$
H_{repo}
=H_{intent}
+H_{requirement}
+H_{owner}
+H_{contract}
+H_{behavior}
+H_{proof}
+H_{memory}.
$$

这些分量分别对应：

| 分量              | 含义                       | 典型载体                                      |
| ----------------- | -------------------------- | --------------------------------------------- |
| $H_{intent}$      | 外部输入带来的真实意图     | 用户请求、产品经理说明、外部材料              |
| $H_{requirement}$ | 当前切片必须兑现的需求承诺 | requirement、plan goals                       |
| $H_{owner}$       | 长期稳定结构承诺           | architecture docs、component design docs      |
| $H_{contract}$    | 可被外部或下游依赖的合同   | schema、API、public types、renderer contracts |
| $H_{behavior}$    | live repo 中真实运行的行为 | code、examples、playground                    |
| $H_{proof}$       | 可复查的证明               | tests、verification、audit evidence           |
| $H_{memory}$      | 未来不能遗忘的轨迹判断     | logs、bugs、retrospectives、analysis          |

这说明实现一个功能不是降低 $H_{repo}$。实现一个功能是让同一个语义承诺从“尚未兑现的变化义务”转换为“代码、测试、owner doc、日志中可恢复的稳定事实”。

## 五、能量分配变的是权威权重，不是文件数量

如果把每个文件夹看成能量仓，类比很快会失败。因为 requirement 转成 code 后，requirement 文件并不会消失；owner doc 更新后，input 文件也仍然存在。

真正发生变化的不是文件是否存在，而是同一语义承诺在不同载体中的 active authority，也就是解释权、约束权和证明权的重新分配。

例如，一个承诺最初出现在 raw input：

```text
“表单隐藏字段不应该参与提交。”
```

它进入 requirement 后，raw input 仍然保留，但当前实现的直接解释权转移到 requirement。它进入 architecture owner doc 后，长期基线解释权转移到 owner doc。它进入 code 和 tests 后，运行行为和证明权转移到实现与验证。它进入 bug note 或 log 后，历史判断变成未来 session 可恢复的记忆。

所以更准确的表述是：

```text
文件不守恒。
语义承诺的有效权重在多种载体之间重新分布。
```

在一个闭合切片内部，除非有明确的人类决策改变 scope，$H_{repo}$ 不应该凭空增加或减少。真正应该减少的是另一个量：未绑定、未归属、未验证的自由语义能。

可以把它记为：

$$
F_{repo}=\text{free semantic uncertainty}.
$$

吸引子引导工程的目标不是耗散 $H_{repo}$，而是：

$$
\text{preserve }H_{repo}\quad\text{while reducing }F_{repo}.
$$

需求澄清、owner-doc 对齐、测试、验证、closure audit 的作用，不是消灭承诺，而是把承诺从自由、模糊、可漂移的状态绑定到稳定、可恢复、可证明的形态。

这里和标准 port-Hamiltonian system 有一个重要差别必须提前说明：在物理 port-Hamiltonian system 中，$R$ 直接耗散的是 Hamiltonian $H$；而在吸引子引导工程类比中，我们把 $H_{repo}$ 定义成应尽量守恒的语义承诺总量，所以不能说 $R$ 在耗散 $H_{repo}$。吸引子引导工程中被“耗散”的更接近 $F_{repo}$：同一语义承诺尚未绑定、尚未归属、尚未验证时产生的自由不确定性。因此后文的 `R-flow` 是借用 port-Hamiltonian 的阻尼图像，而不是严格等同于物理 port-Hamiltonian system 的 $R\nabla H$ 项。

## 六、q 与 p：稳定状态表示和变化义务表示

如果把 $H_{repo}$ 看成定义在某个相空间上的标量，那么这个相空间至少需要两类共轭变量。

可以写成：

$$
H_{repo}(q,p).
$$

这里的 $q$ 和 $p$ 不是物理位置与动量的严格对应，而是吸引子引导工程中两个互补的语义表示。

$q$ 是稳定状态表示：

$$
q_i=\text{某个语义承诺当前以什么形式存在于仓库稳定结构中}.
$$

它回答：现在系统是什么。

$p$ 是变化义务表示：

$$
p_i=\text{某个语义承诺对未来演化施加的方向性压力}.
$$

它回答：系统接下来为什么必须动，以及往哪里动。

一个简单例子足以说明为什么一维情况下仍然需要 $q/p$ 对偶。假设语义承诺是：

$$
c=\text{管理员可以导出 CSV（逗号分隔值）文件}.
$$

当前代码都没有 CSV 导出时，可能有两种完全不同情况：

| 情况                                | $q_c$      | $p_c$      | 人工智能应如何行动 |
| ----------------------------------- | ---------- | ---------- | ------------------ |
| CSV 明确 out of scope               | 当前不支持 | 无变化义务 | 不应实现           |
| CSV 是最高优先级 active requirement | 当前不支持 | 强变化义务 | 应按计划实现       |

只看 $q$，二者都是“当前不支持”。但 $p$ 完全不同。

反过来，如果当前代码支持 CSV，但 owner doc 决定移除，$q_c$ 仍然是“当前支持”，而 $p_c$ 变成反向变化义务。没有 $p$，人工智能无法区分“稳定存在”和“应被删除但尚未删除”。

在 Flux / 吸引子引导工程文档体系中，$q$ 主要由这些材料承载：

- `docs/architecture/` 中的 current baseline；
- `docs/components/*/design.md` 中的组件合同；
- live code 和 exported types；
- passing tests 和 examples；
- schema、public contracts、runtime behavior。

$p$ 主要由这些材料承载：

- active plan；
- backlog 或 audit finding；
- failing test；
- bug report；
- open question；
- stale-doc conflict；
- closure gate；
- human decision pending。

但这不是固定目录映射。同一个文件可能同时携带 $q$ 和 $p$。Requirement 既描述目标状态，也携带实现义务；plan 既写 current baseline，也写 closure pressure；bug note 既记录历史事实，也给未来变化施加约束。

## 七、开发就是把合法的 p 转换成稳定的 q

吸引子引导工程中一次正确的实现，不是“完成任务”，而是把合法的变化义务转换为稳定状态承诺。

仍以 CSV 导出为例。

下表中的 $T(p)$ 表示变化义务的张力或压力总量，不是新的物理能量，只是为了标出“系统为什么还必须继续演化”。

实现前：

| 分量              | 状态                               |
| ----------------- | ---------------------------------- |
| $H_{requirement}$ | 高，requirement 承载“必须支持 CSV” |
| $H_{owner}$       | 低或待更新，owner doc 未吸收该能力 |
| $H_{behavior}$    | 低，代码未实现                     |
| $H_{proof}$       | 低，没有测试或验证                 |
| $T(p)$            | 高，plan/backlog 有变化压力        |

实现后：

| 分量              | 状态                     |
| ----------------- | ------------------------ |
| $H_{requirement}$ | 仍在，但未闭合义务下降   |
| $H_{owner}$       | 如果成为稳定能力，则上升 |
| $H_{behavior}$    | 上升，代码承载行为       |
| $H_{proof}$       | 上升，测试和验证承载证据 |
| $H_{memory}$      | 上升，log/audit 记录闭合 |
| $T(p)$            | 下降，变化义务被释放     |

这可以理解为：

$$
p\text{-energy}\rightarrow q\text{-energy}.
$$

也就是：

```text
active requirement / plan pressure
→ owner baseline / code behavior / proof / memory
```

承诺没有消失，只是从“未来必须做的义务”变成了“当前系统已经支持的稳定事实”。

这也解释了为什么 closure audit 不能只看 checkbox。`- [x]` 只能说明执行者声称某项完成了。真正的问题是：这个 $p$ 是否已经转换成稳定的 $q$，还是只是从 plan 挪到了 summary，从 summary 挪到了 log，从 log 挪到了下一轮 follow-up。

## 八、J-flow 与 R-flow：路由不是耗散

port-Hamiltonian system 中，$J$ 表示无损互联结构，$R$ 表示耗散。吸引子引导工程中也需要区分两类完全不同的动作。

这里的 `J-flow` 和 `R-flow` 是本文借用控制论语言创造的工程标签，不是标准控制理论术语。

`J-flow` 是语义承诺在正确拓扑中的搬运与转换。

例如：

- raw input 被记录到 `docs/input/`；
- 需求被合成到 requirement；
- 稳定规则进入 owner doc；
- 计划引用 owner doc 和 live baseline；
- code/test/log/audit 之间建立可追踪链接。

这些动作本身不一定降低不确定性。它们主要保证承诺沿着正确的拓扑流动，不被塞进错误位置。

`R-flow` 才真正降低 $F_{repo}$：

- 人类明确裁掉 scope；
- requirement 写出可测试 acceptance criteria；
- owner doc 吸收稳定 baseline；
- 自动化测试证明行为；
- focused verification 执行真实路径；
- independent closure audit 推翻或确认完成叙事；
- bug note 记录非显然根因，防止未来重复漂移。

这一区分非常关键。很多看似勤奋的文档工作其实只是 `J-flow`：

- 把歧义从 input 搬到 discussion；
- 把未决设计写进 plan；
- 把计划总结写进 log；
- 把 audit 初筛发现直接变成 backlog；
- 把“应该测试”写成 closure gate，但没有真实执行。

这些可能是必要步骤，但它们不是耗散。它们没有消除自由语义能，只是改变了它的位置。真正危险的是把 `J-flow` 误认为 `R-flow`，把“信息移动了”误认为“系统收敛了”。

## 九、Park 变换：从 chat 坐标到 repo 坐标

port-Hamiltonian 视角下，Park 变换的意义不是凭空制造哈密顿结构，而是把原本隐藏在时变坐标中的功率保持耦合和斜对称互联项显式化。

吸引子引导工程中也有类似动作。原始 chat、产品经理资料、长上下文中的讨论，是一个时变、强耦合、隐式坐标系。需求、架构、执行、证明、历史、假设混在一起。人工智能在这个坐标系中很容易把探索当基线，把计划当事实，把历史判断当现行合同。

`docs/` 体系的作用，就是把这个混合语义场变换到更稳定的 repo 坐标：

| 坐标                 | 职责                            |
| -------------------- | ------------------------------- |
| `docs/architecture/` | 当前规范架构和 owner precedence |
| `docs/components/`   | 组件级合同和 schema 语义        |
| `docs/plans/`        | 本轮工作如何收口                |
| `docs/logs/`         | 发生过什么和短期上下文          |
| `docs/bugs/`         | 非显然缺陷和回归风险            |
| `docs/analysis/`     | 探索、比较、被拒绝方向          |
| `docs/testing/`      | 手工或探索性证明                |
| live code/tests      | 当前实现事实和可执行证据        |

这不是文档洁癖，而是坐标变换。它让隐藏的语义互联结构变成可路由、可审计、可恢复的拓扑。

可以说：

```text
吸引子引导工程的文件体系，是人工智能开发过程的 Park 变换。
```

它把 chat 中时变、隐式、强耦合的语义系统，变换成 repo 中较稳定、可路由、可审计的结构坐标。

## 十、空间、时间与守恒

如果继续沿着 Hamiltonian 语言展开，吸引子引导工程中的“空间”和“时间”也可以获得更清晰的解释。

空间不是文件系统路径本身，而是语义责任空间：

$$
space=\text{一个承诺可以被安放、解释、约束、证明的位置集合}.
$$

也可以称为：

$$
space\simeq\text{semantic ownership topology}.
$$

例如同一个承诺“表单隐藏字段是否参与提交”，可能同时落在：

- `docs/architecture/form-validation.md`；
- `docs/architecture/data-domain-owner.md`；
- runtime code；
- validation tests；
- historical bug note；
- plan closure evidence。

这些位置不是阶段，而是坐标轴。它们共同定义这个承诺在仓库中的空间分布。

时间也不是自然日期，而是仓库状态的离散演化序列：

$$
time=\text{sequence of repository state transitions across sessions}.
$$

一次 plan closure、一次 audit overturn、一次 commit、一次 full-green baseline、一次 owner-doc update，都是吸引子引导工程时间中的事件。

人工智能没有人的连续记忆。因此，吸引子引导工程的时间不是心理时间，而是仓库可恢复的外部化时间。一个决定如果只存在聊天里，没有进入仓库，它在吸引子引导工程时间中几乎没有存在过。

由此可以定义两个重要的均一性。

**时间均一性**：同一个仓库状态在不同日期、不同人工智能会话、不同上下文窗口中被重新读取时，应恢复同一组有效承诺和执行规则。

这就是 file-in/file-out 的深层含义：

$$
\text{时间均一性}=\text{session 平移不变性}.
$$

如果今天人工智能知道某功能 out of scope，但明天换一个会话就不知道了，因为它只写在聊天里，那么时间均一性被破坏，$H_{repo}$ 发生语义泄漏。

**空间均一性**：同类语义承诺无论出现在哪个局部功能中，都应遵循同类 ownership、routing 和 proof 规则。

例如权限承诺不应因为它出现在 CSV 导出按钮里就绕过权限 owner doc；schema authoring 语义不应因为它出现在某个示例里就绕过 compiler/runtime contract；复杂宿主能力不应因为当前实现方便就直接泄漏进核心 scope。

但吸引子引导工程的空间不是均匀欧氏空间。它是带拓扑和曲率的责任空间：

- protected area 是高曲率区，进入后轨迹必须改变；
- owner doc 是势场中心，周围变化会被拉回 baseline；
- stale docs 是坐标奇点，不能直接当真；
- external integration 是开放端口，可能注入或移出承诺；
- audit 是观测面，不是事实源本身。

因此吸引子引导工程不要求所有空间点同质。它要求同类责任区域内部均一，跨区域转换遵守明确拓扑。

## 十一、浸入与不变性：不必知道所有参数，但必须落在不变流形上

浸入与不变性的启发在于：面对不可观测参数，系统不一定需要估计出所有真实值；更重要的是构造一个目标不变流形，使系统轨迹落到这个流形上，并在流形上保持自洽演化。

人工智能开发中也有大量永远无法完全知道的“参数”：

- 产品经理的全部真实意图；
- 用户未来行为；
- 外部系统完整边界；
- legacy code 的全部历史原因；
- 下一个人工智能会话会误解什么；
- 某个抽象半年后的真实演化压力。

传统做法容易陷入两个极端：要么试图把所有未知都问清楚后再动，要么把未知全部吞掉直接编码。

吸引子引导工程更接近浸入与不变性的折中：

```text
不要求知道所有参数，只要求当前 slice 被沉浸到一个可关闭的不变流形里。
```

这个流形由以下材料共同定义：

- goal；
- non-goal；
- owner-doc invariants；
- accepted assumptions；
- blocking assumptions；
- verification gates；
- closure audit；
- live code baseline。

一个计划真正应该写清楚：

```text
本 slice 允许忽略 X，因为 X 与本次 closure 正交。
本 slice 必须解决 Y，因为 Y 改变当前合同或用户可见行为。
```

这不是为模糊需求开绿灯。恰恰相反，它要求把不确定性分型：哪些未知可以保持未知，哪些未知必须通过人类决策或 owner-doc 对齐先消除。

## 十二、结构保持观测器：审计不是另一个叙事源

port-Hamiltonian 观测器的关键启发是：观测器应保持系统原有结构，而不是脱离系统拓扑另造一个估计器。

吸引子引导工程中的 audit 也应如此。一个好的 closure audit 不是重新讲一遍实现者的故事，而是沿着同一套 owner-doc precedence、live code、tests、logs、plan gates 重新观察系统状态。

这也是为什么 Flux 的 closure audit 不能只问“任务是否完成”，而要问：

- live behavior 是否真的落地；
- owner doc 是否仍描述当前基线；
- tests 是否保护承诺而非偶然实现；
- plan 的 `Goals`/`Non-Goals` 是否仍诚实；
- closure evidence 是否存在于 repo，而不是只存在于 summary；
- 有没有把 in-scope 缺陷降级成 vague follow-up；
- 有没有把 `J-flow` 误报成 `R-flow`。

审计若不保持结构，就会变成另一个高密度叙事源。它可能制造新的发现、制造新的 backlog、制造新的完成感，却没有真正降低 $F_{repo}$。

因此，吸引子引导工程中的 audit 应该像结构保持观测器：它不发明新的事实拓扑，而是按照既有事实拓扑重新估计系统状态，并用 live repo 证据校准估计。

## 十三、对 Flux 自身的启发

这个 port-Hamiltonian 类比对 Flux 和吸引子引导工程模板的价值，不在于引入一套炫目的新术语，而在于指出几个可以直接改进的方法论点。

### 1. Plan 应显式写 Reference Set

写代码和检查代码都不是只读上一阶段文件。Plan 可以更明确地要求列出本轮切片的 reference constellation：

```markdown
## Reference Set

- Context / routing:
- Active owner docs:
- Live code routes:
- Tests / verification baseline:
- Logs / bugs / known regressions:
- External contracts:
- Plan / audit evidence:
```

这可以防止人工智能把 plan 当作唯一事实源。

### 2. Plan 应显式写 Commitment Phase State

当前 plan 已经强调 baseline、goals、non-goals 和 closure gates。port-Hamiltonian 视角进一步要求写清 $q/p$：

```markdown
## Commitment Phase State

- Stable state now (`q`):
- Active change pressure (`p`):
- Target stable state after closure:
- Proof that `p` was converted into stable `q`:
- Remaining pressure and why it is non-blocking:
```

这能区分“当前没有这个行为，因为稳定地不需要”和“当前没有这个行为，但必须实现”。

### 3. Closure audit 应检查语义守恒

可以增加一个问题：

```text
Did any in-scope commitment disappear, weaken, or move to a non-authoritative artifact?
```

这比“文档是否更新”更准确。真正要防止的是承诺在转换过程中泄漏。

### 4. Owner docs 应写 Stable Commitments

对重要 owner docs，可以逐步增加这类结构：

```markdown
## Stable Commitments

## Allowed Variation

## Drift / Leakage Signals

## Correction Path
```

这让 owner docs 更像结构方程，而不是说明书。

### 5. Audit prompt 应区分 J-flow 和 R-flow

审计时应问：

```text
Which changes merely routed commitments between artifacts?
Which changes actually reduced free semantic uncertainty through decision, proof, or owner-doc alignment?
```

这样可以防止把“写了更多文档”误判为“系统更收敛”。

## 十四、类比的边界

必须明确，本文不是在主张吸引子引导工程已经具备物理系统那样的数学形式。

几个边界不能越过：

- $H_{repo}$ 不是可精确计算的标量，而是帮助识别语义承诺守恒的概念对象；
- $q/p$ 不是真实相空间坐标，而是稳定状态和变化义务的对偶表示；
- $J/R$ 不是矩阵，而是区分“结构保持路由”和“自由语义能降低”的方法；
- 时间均一性和空间均一性不是物理对称性，而是跨 session 可恢复性和同类承诺治理一致性；
- 浸入与不变性类比不能成为忽略需求澄清的借口，它只说明未知可以分型处理。

这些限制并不削弱类比的价值。恰恰相反，好的类比不是把两个领域说成同一个东西，而是把一个领域中已经成熟的区分，迁移到另一个领域中尚未充分命名的问题上。

## 十五、结语：吸引子引导工程的 port-Hamiltonian 化理解

如果把吸引子引导工程放在 port-Hamiltonian 视角下重新理解，它不是一套更复杂的流程，而是一种结构保持型人工智能工程控制系统。

可以压缩成几句话：

- $H_{repo}$ 是跨 session 应守恒的语义承诺总量；
- $q$ 是承诺的稳定状态表示；
- $p$ 是承诺的变化义务表示；
- 开发是把合法的 $p$ 转换成稳定的 $q$；
- `J-flow` 负责让承诺沿正确 owner topology 流动；
- `R-flow` 负责降低未绑定、未验证、未归属的自由语义能；
- docs 体系是从 chat 坐标到 repo 坐标的 Park 变换；
- file-in/file-out 维护时间均一性，也就是 session 平移不变性；
- owner docs、plans、tests、audits、logs 共同构成多端口耦合的收敛机制。

这篇类比真正想强调的是：

**人工智能开发中的混乱不只是噪音，它往往是尚未被正确坐标化的语义能量。吸引子引导工程的下一步，不是堆更多流程，而是更清楚地建模这些语义承诺如何注入、路由、储存、转换、证明和守恒。**

当这一点被看清后，吸引子引导工程就不只是“有 owner docs 和 audit 的流程实践”，而可以被理解为：

**面向人工智能高速扰动的软件工程 port-Hamiltonian 图像：用 owner docs 塑造势场，用 routing 保持结构，用 verification/audit 降低自由语义能，用 logs/bugs 保存跨时间的轨迹记忆。**
