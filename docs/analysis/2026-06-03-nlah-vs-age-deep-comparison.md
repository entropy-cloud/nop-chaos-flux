# NLAHs vs AGE: Deep Comparison

**Date**: 2026-06-03
**Paper**: _Natural-Language Agent Harnesses_ (NLAHs), arXiv:2603.25723v2, Pan et al., 2026
**Methodology**: _Attractor-Guided Engineering_ (AGE), canonical-entropy
**Sample project**: `nop-chaos-flux` (this repository)

---

## 1. One-Sentence Summary

NLAHs asks **"can harness policy be externalized as executable natural language?"** — a question about _representation medium_. AGE asks **"what stable structure should a project keep converging toward, and how do harnesses serve that convergence?"** — a question about _trajectory ontology_. They overlap at the harness layer but diverge in foundational priority, scope, and what they consider the primary problem.

> **修正历史**：初版称"NLAHs 没有吸引子概念"。第二版修正为"NLAHs 有 run-level 隐含吸引子"。经重新审视吸引子的动力学定义，确认初版判断正确：NLAHs 的 harness pattern 是**控制目标**（control target），不是**吸引子**（attractor）。两者的区别不是层次差异，而是本体论差异——控制层 vs 方向层。详见第 10 节。

---

## 2. Conceptual Hierarchy

### NLAHs

```
Code harness (tangled) → NLAH (policy NL) + IHR (shared runtime) + Scripts (deterministic)
```

Four-layer stack:

1. Base agent (LLM + terminal)
2. Runtime policy (fixed NL charter)
3. NLAH (replaceable per-harness NL policy)
4. Scripts/adapters (deterministic code hooks)

The core separation: **NL carries policy, code carries mechanism**. The paper proves this separation is viable, compact, and auditable.

### AGE

```
State space → Attractor → Trajectory → Control
```

Four foundational objects (mutually defining):

1. **State space**: all repo states reachable under constraints
2. **Attractor**: the stable structure the system converges toward over long-term evolution
3. **Trajectory**: the actual evolution path from generation, verification, correction
4. **Control**: local mechanisms (harnesses) that influence trajectory toward attractor

The core claim: **attractor is logically prior to control**. Harnesses only become meaningful after the attractor exists.

### Structural Mapping

| NLAHs layer      | AGE analogue                                        | Relationship                                                                   |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Base agent       | (not addressed — tooling substrate)                 | NLAHs assumes a runtime; AGE is methodology-agnostic about runtime             |
| Runtime policy   | (closest: `AGENTS.md` operating rules)              | Both are fixed NL charters that agents must follow                             |
| NLAH             | AGE **harness** (plans, verification, audits)       | Both are replaceable policy documents; NLAHs per-benchmark, AGE per-work-slice |
| Scripts/adapters | (code-level verification infrastructure)            | Both keep deterministic code where precision matters                           |
| _(missing)_      | AGE **attractor** (`docs/architecture/` owner docs) | NLAHs has no equivalent — it does not model what the system converges toward   |
| _(missing)_      | AGE **trajectory memory** (logs, bugs, discussions) | NLAHs focuses on single-run lifecycle; AGE models cross-session evolution      |

**Key asymmetry**: NLAHs has no attractor concept and no trajectory concept. AGE has them as first-class objects. This is not a gap in NLAHs — it operates at a different level.

---

## 3. What They Share

### 3.1 Externalized NL Policy over Tangled Code

Both reject the idea that harness logic should be buried in tightly coupled controller code.

- NLAHs proves this for **single-run agent harnesses**: 60k tokens of code → 2.9k tokens of NL policy (Table 2 in the paper).
- AGE proves this for **project-level development governance**: `AGENTS.md` + `docs/architecture/` owner docs replace implicit architectural knowledge in humans' heads.

### 3.2 Separation of Policy and Mechanism

- NLAHs: "natural language carries the harness policy, while code and the runtime carry exact mechanisms"
- AGE: "owner docs define the attractor (direction), while plans/tests/audits are harnesses (control)"

Both insist that the inspectable, editable layer should be separated from the deterministic execution layer.

### 3.3 File-Backed State Is More Reliable Than In-Context Memory

- NLAHs RQ3 finding: file-backed state improves both benchmarks (+2.6 SWE, +13.9 OSWorld); context compression hurts both.
- AGE practice: `docs/logs/`, `docs/bugs/`, `docs/architecture/` are all file-backed externalized memory. The principle "repo is the source of truth, chat is temporary working surface" matches the NLAHs finding directly.

### 3.4 Explicit Module Boundaries Enable Analysis

- NLAHs RQ3: modules that tighten state and acceptance discipline (file-backed state, self-evolution, evidence-backed answering) help most. Extra branching (multi-candidate search) is not the same as better control.
- AGE practice: plan closure audits, independent subagent reviews, and owner-doc adjudication are all modules that can be enabled/disabled and whose effect is measured against the attractor.

### 3.5 Evidence-Backed Completion over Self-Report

- NLAHs: "do not finalize without evidence from the target file" — completion requires observable artifacts.
- AGE: "do not let the same context both implement and judge completion" — closure must come from fresh-session audit of the live repo.

Both reject checklist-based completion in favor of evidence-based completion.

---

## 4. Where They Diverge

### 4.1 Foundational Question

|                          | NLAHs                                                                        | AGE                                                                       |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Primary question**     | Can harness policy be represented as executable NL?                          | What structure should the system converge toward over the long term?      |
| **Implied precondition** | The correct harness behavior is already known (from existing code harnesses) | The correct structure may not be known yet and must be discovered/defined |
| **Evaluation**           | Benchmark task performance                                                   | Trajectory convergence toward owner-doc baseline                          |

NLAHs takes the harness behavior as given (from existing code harnesses like Live-SWE-Agent, MHTBA) and asks whether it can be externalized. AGE takes the attractor as something that must be actively defined and evolved.

### 4.2 Temporal Scope

|                | NLAHs                                               | AGE                                                        |
| -------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| **Scope**      | Single task run (hours)                             | Project lifetime (months to years)                         |
| **State**      | Run-level state (files within one Docker container) | Repository-level state (code + docs + tests + logs + bugs) |
| **Memory**     | In-run: task state files, evidence files            | Cross-session: logs, bugs, discussions, architecture docs  |
| **Trajectory** | Not modeled                                         | First-class object                                         |

NLAHs optimizes a single run. AGE optimizes a sequence of runs over project history. The NLAHs finding that "information handoff recall drops to 0.32 under parent-child execution" is a single-run handoff problem. AGE's trajectory problem is the cross-session analog: will the next AI session recover the current system truth from repository files?

### 4.3 Where the Attractor Lives

NLAHs has no attractor concept. The paper's "contract" (task input, expected output, completion condition) is a **run-level specification**, not a **long-term structural invariant**. The closest NLAHs comes is the "runtime policy / charter" layer, which is fixed and shared — but this is execution semantics, not architectural convergence.

AGE's attractor is carried by `docs/architecture/` with explicit precedence:

- Design principles (direction layer)
- Programming model (normative layer)
- Architecture baseline (current state layer)
- Local contracts (module boundaries)

This is not a specification of one run's behavior. It is the "equation layer" that defines which structures belong to the correct state space.

### 4.4 Who Defines the Attractor

NLAHs: the NLAH author (usually a researcher) writes the harness policy based on an existing code harness. The policy is a translation from code to NL.

AGE: **the human architect defines the attractor**. AGE explicitly states: "The responsibility for defining a new attractor cannot be outsourced to AI by default." New conceptual cuts, boundary redefinitions, and architectural languages require humans to propose them first.

This is a deep difference. NLAHs assumes the harness pattern already exists and needs better representation. AGE assumes the pattern may need to be discovered and that this discovery is a human cognitive act.

### 4.5 Harness Purpose

|                       | NLAHs                                                  | AGE                                                                               |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **Harness purpose**   | Execute a task run correctly                           | Keep the system trajectory close to the attractor                                 |
| **Success criterion** | Benchmark metric (issue resolution rate, task success) | Trajectory convergence (does the repo keep returning to the owner-doc baseline?)  |
| **Failure mode**      | Task fails, wrong answer                               | Drift: everything passes locally but the system is moving away from the attractor |

AGE explicitly distinguishes: "A change can pass tests and still fail AGE if it contradicts the owner-doc baseline, hides changed behavior only in a plan, or leaves future sessions unable to recover the current truth from repository files."

### 4.6 Representation Medium

|                    | NLAHs                                               | AGE                                                              |
| ------------------ | --------------------------------------------------- | ---------------------------------------------------------------- |
| **Policy carrier** | NLAH document (NL)                                  | `docs/` directory tree with typed responsibilities               |
| **Execution**      | IHR (shared runtime) interprets NL into agent calls | Human + AI agents read `docs/` and execute against the attractor |
| **Verification**   | Benchmark autograder                                | `typecheck` + `build` + `lint` + `test` + independent audit      |

NLAHs is more formal about the execution substrate (IHR runtime). AGE is more formal about the attractor definition (owner-doc precedence). They make opposite bets about where formality matters most.

---

## 5. nop-chaos-flux as an AGE Example Mapped to NLAHs Concepts

### 5.1 What NLAHs Would Recognize

If NLAHs researchers examined `nop-chaos-flux`, they would recognize:

- `AGENTS.md` as a **runtime policy / charter** — fixed NL instructions that all agents must follow
- `docs/plans/` as **per-slice NLAHs** — replaceable policy documents describing stages, goals, exit criteria, validation gates
- `docs/plans/00-plan-authoring-and-execution-guide.md` as writing principles similar to NLAHs Section 3.2
- `docs/references/quick-reference.md` as a **tool documentation** analog
- The verification stack (`pnpm typecheck`, `build`, `lint`, `test`) as **scripts/adapters**
- The independent closure audit practice as a **validation gate**

### 5.2 What NLAHs Would Not Model

NLAHs would not recognize:

- **`docs/architecture/` as attractor** — NLAHs has no concept of long-term structural convergence
- **`docs/logs/` as trajectory memory** — NLAHs is scoped to single runs
- **Owner-doc precedence** — NLAHs has no concept that some documents are more authoritative than others for different questions
- **Plan closure audit** — NLAHs has validation gates within a run, but not independent cross-session re-judgment of whether completion claims are real
- **The attractor-before-harness priority** — NLAHs starts from harness engineering; AGE starts from attractor definition

### 5.3 Specific nop-chaos-flux Practices Mapped

| nop-chaos-flux practice                                 | AGE concept                    | NLAHs equivalent (if any)                                 |
| ------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `docs/architecture/` with precedence                    | Attractor (carrier layer)      | None — NLAHs does not model long-term convergence targets |
| `docs/architecture/flux-design-principles.md`           | Attractor (structural layer)   | None                                                      |
| `AGENTS.md` operating rules                             | Control (routing harness)      | Runtime policy / charter                                  |
| `docs/plans/` with closure gates                        | Control (plan harness)         | NLAH (per-run policy)                                     |
| `pnpm typecheck/build/lint/test`                        | Control (verification harness) | Scripts/adapters                                          |
| Independent closure audit                               | Control (audit harness)        | Validation gate (weaker — single-run scope)               |
| `docs/logs/`, `docs/bugs/`                              | Trajectory memory              | None — NLAHs does not model cross-session trajectory      |
| Owner-doc adjudication ("No owner-doc update required") | Attractor maintenance          | None                                                      |
| `docs/skills/`                                          | Control (method selectors)     | Skill bundles (NLAHs references these in Related Work)    |

---

## 6. Where They Could Learn From Each Other

### 6.1 What AGE Could Learn from NLAHs

1. **Quantitative harness evaluation.** NLAHs defines rigorous metrics (pattern-preservation, artifact-contract compliance, orchestration reliability, information handoff recall). AGE currently evaluates harness effectiveness qualitatively (does the audit find real problems? does the plan close?). Adding quantitative trajectory-convergence metrics would strengthen AGE's empirical claims.

2. **Module ablation as a methodology.** NLAHs RQ3 shows that explicit modules can be ablated under a shared runtime. AGE could adopt this for its own harness layers: does adding closure audit actually change trajectory convergence? Does removing the plan requirement cause measurable drift? Currently these claims are supported by practice experience but not by controlled ablation.

3. **Compact NL policy representation.** NLAHs reduces 60k tokens of code to 2.9k tokens of NL. AGE's `AGENTS.md` + `docs/architecture/` is already compact relative to the codebase it governs, but the NLAHs approach of measuring policy-to-implementation ratio could formalize this claim.

4. **Information handoff analysis.** NLAHs identifies handoff as the main mechanism weakness (recall drops to 0.32). AGE's cross-session handoff (from one AI session to the next via repo files) has the same problem. NLAHs' handoff metrics could be adapted to measure cross-session information preservation in AGE projects.

### 6.2 What NLAHs Could Learn from AGE

1. **Attractor concept.** NLAHs' "contract" (task input/output/completion) is a run-level specification. AGE's attractor concept adds a layer above: what long-term structure should the harness pattern itself converge toward? Without this, NLAH research can optimize single runs but cannot reason about whether the harness patterns being evaluated are themselves converging toward correct structural knowledge.

2. **Trajectory memory.** NLAHs is scoped to single runs. For real engineering projects, the question is not just "did this run succeed" but "did 100 runs keep the project converging?" AGE's trajectory memory (`logs/`, `bugs/`, `discussions/`) provides the cross-run context that NLAHs currently lacks.

3. **Attractor-before-harness priority.** NLAHs starts from the assumption that harness engineering is the primary problem. AGE argues that attractor definition is logically prior: "Where is correction supposed to correct toward?" This is not just a philosophical difference — it has engineering consequences. If the attractor is wrong, better harness representation only makes wrong convergence more efficient.

4. **Self-verification trap.** AGE explicitly identifies that in AI collaboration, all verification evidence can be consistently biased because types, tests, and documents are produced by the same context. NLAHs' benchmark autograder avoids this for evaluation, but real engineering deployments would face this problem. AGE's solution — independent fresh-session audit — addresses a failure mode that NLAHs does not model.

5. **Source-of-truth precedence.** AGE defines clear ownership: architecture docs own the attractor, code owns current implementation, logs own trajectory history. When these conflict, the precedence is explicit. NLAHs has no equivalent framework for resolving conflicts between its layers.

---

## 7. The Deeper Difference: Two Different Ontologies

NLAHs operates within what AGE calls the **"state-centered paradigm"** — evaluating whether a run is correct at a point in time. Its contributions are about representation quality: can harness policy be more inspectable, portable, and analyzable?

AGE operates within a **trajectory ontology** — evaluating whether a sequence of changes keeps the system converging toward a stable structure. Its contributions are about foundational categories: attractor, trajectory, control as mutually defining concepts.

These are not competing solutions to the same problem. They address different levels:

- **NLAHs**: How should a single agent run be organized and controlled? (micro level)
- **AGE**: How should a project's long-term evolution be kept on track? (macro level)

An AGE project like `nop-chaos-flux` could in principle use NLAHs at the micro level — representing per-plan execution policies as NLAHs executed by a shared runtime — while using AGE at the macro level to define what the project is converging toward and whether the trajectory is healthy.

---

## 8. Concrete Example: How Plan 371 in nop-chaos-flux Would Look Under Both Frameworks

### AGE (actual)

1. Deep audit finds 64 deviations from owner-doc baseline
2. Plan 371 routes each finding to an owner bucket with priority and successor plan
3. No ownerless issue, no multiply-owned issue, no silent downgrade
4. Subsequent plans (382, 388, 400...) close local trajectories with focused proof
5. Owner-doc adjudication decides whether the baseline changed
6. Independent closure audit re-judges from the live repo

### NLAHs (hypothetical)

1. A single NLAH document would describe the audit-to-closure workflow as stages: inspect, route, close, adjudicate, audit
2. IHR would execute this as parent orchestrator + child executor agents
3. Each child would handle one finding or one plan
4. Validation gates would check that evidence exists before marking items complete
5. File-backed state would preserve findings, routing decisions, and closure evidence
6. No attractor concept — no way to judge whether the 64 findings themselves indicate the system is drifting away from a correct structure

The NLAHs version would likely execute efficiently and leave good artifacts, but it would not answer the question AGE considers primary: "is the system converging?"

---

## 9. Synthesis

| Dimension                      | NLAHs                                          | AGE                                              |
| ------------------------------ | ---------------------------------------------- | ------------------------------------------------ |
| **Primary object**             | Harness policy (NL document)                   | Attractor (stable structure)                     |
| **Temporal scope**             | Single run                                     | Project lifetime                                 |
| **Foundational question**      | Can NL represent harness policy?               | What should the system converge toward?          |
| **Representation medium**      | NLAH document                                  | Owner-doc tree with precedence                   |
| **Execution substrate**        | IHR runtime                                    | Human + AI agents reading docs                   |
| **Evaluation**                 | Benchmark metrics                              | Trajectory convergence                           |
| **Module ablation**            | Rigorous (RQ3)                                 | Practice-based                                   |
| **Quantitative metrics**       | Rich (Tables 1-5)                              | Qualitative                                      |
| **Attractor concept**          | None                                           | First-class                                      |
| **Trajectory concept**         | None                                           | First-class                                      |
| **Cross-session memory**       | None                                           | File-backed (logs, bugs, discussions)            |
| **Source-of-truth precedence** | Implicit in layering                           | Explicit in ownership rules                      |
| **Self-verification trap**     | Not modeled (autograder avoids it)             | Explicitly addressed (independent audit)         |
| **Who defines direction**      | Researcher (translates existing code harness)  | Human architect (defines attractor)              |
| **Maturity**                   | Published research with controlled experiments | Practiced methodology with real project evidence |

**Bottom line**: NLAHs is a rigorous research contribution on harness _representation_. AGE is a methodology contribution on harness _purpose_. They are complementary: NLAHs can make AGE's harnesses more precise and measurable; AGE can give NLAHs the attractor concept that turns harness engineering from "controlling a run" into "guiding a trajectory."

---

## 10. NLAHs、OpenProse 与 AGE：控制目标 vs 吸引子

> 参见 `docs/articles/openprose-vs-age-two-paths-to-consistency.md`

### 吸引子不是控制目标

AGE 文章明确警告过三个常见混淆：把吸引子当作边界、当作更强的护栏、当作控制目标的另一个说法。NLAHs 的 harness pattern 恰好落入了第三种混淆。

**吸引子**（动力系统意义）：由系统自身动力学产生的、使得周围区域内所有初始状态都会随时间演化向其收敛的结构。关键性质：

- 它是**涌现的**——由系统动力学定义，不是外部强加的指令
- **扰动-恢复**——推走它，动力学自然把它拉回来
- 系统**不需要"知道"它**——水不需要知道洛伦兹吸引子就按它运动
- 它是**方程定义的流形**——不枚举每个正确状态，只定义约束关系

**控制目标**：控制框架已经建立后，定义"控制应该朝向哪里"。假设控制框架本身已经存在。

AGE 文章原文："把吸引子当作控制目标的另一个说法。'控制目标'这个词看起来很接近，但它假设控制框架已经建立。在轨迹本体论下，吸引子的角色是为控制提供最终因。它在控制之前，不在控制之内。"

### NLAHs 的 harness pattern 是控制目标，不是吸引子

NLAH 文档告诉 IHR 应该怎么组织一次 task run。IHR 执行这个指令。如果 agent 偏离，是**指令把它拉回来**，不是系统动力学自然收敛。

- NLAH 是一份 **specification**（操作手册），IHR 是 **interpreter**（执行者）
- Agent 的行为是被**驱动**去符合 specification，不是被系统动力学**吸引**向一个涌现结构
- 没有"扰动后系统自动恢复"的动态——只有"指令要求这样做"
- "behavior is flexible but still policy-guided" 不是吸引子语义，是 **软约束下的程序执行**

打个比方：操作手册告诉工人怎么组装零件。工人按手册做，偏离了对照手册纠正。手册本身不是吸引子——它是控制目标。重力井才是吸引子——不管你怎么推，物体的动力学自然把它拉回来。

### OpenProse 的 Responsibility 也是控制目标

OpenProse 的 Responsibility（Goal/Maintains/Continuity）同样是外部定义的 specification。运行时通过指纹比对检测是否偏离。偏离了就重新 render。这也是控制目标 + 确定性执行，不是吸引子。

OpenProse 文章中区分了 fixed point（OpenProse）和 attractor（AGE）。这个区分是正确的。但更准确地说，OpenProse 的 fixed point **检测**是一种控制机制，fixed point 本身是一个控制目标，不是吸引子。吸引子不要求精确到达，fixed point 要求精确相等——但这不是吸引子与控制目标的区别，这是两种控制目标的区别。

### 三方对比

| 维度                         | OpenProse                       | NLAHs                       | AGE                                                     |
| ---------------------------- | ------------------------------- | --------------------------- | ------------------------------------------------------- |
| **不变量载体**               | Responsibility (Goal/Maintains) | NLAH (contract + stages)    | Owner-doc tree (`docs/architecture/`)                   |
| **不变量性质**               | 控制目标（specification）       | 控制目标（specification）   | **吸引子**（emergent structure）                        |
| **收敛机制**                 | 指纹比对（确定性执行）          | IHR 解释 NL（软约束执行）   | 扰动-恢复动力学（test→audit→fix）                       |
| **收敛是涌现的还是驱动的？** | 驱动的（runtime 强制）          | 驱动的（runtime + NL 指导） | **涌现的**（工程过程自然产生）                          |
| **时间尺度**                 | 单次 render → 持续 serve        | 单次 task run               | 项目全生命周期                                          |
| **扰动后恢复靠什么**         | Runtime 重新执行 specification  | Runtime 重新执行 NL policy  | 工程动力学：下次 session 读 owner-doc → 发现偏离 → 修正 |
| **跨会话记忆**               | Receipt ledger                  | 无                          | 有（logs/bugs/discussions/plans）                       |
| **策略与机制分离**           | 编译期 vs 运行期                | NL policy vs 确定性 hooks   | Owner docs（方向）vs plans/tests/audits（控制）         |

### 为什么 AGE 的吸引子是真的吸引子

AGE 的 owner-doc 体系具备吸引子的关键性质：

1. **扰动-恢复动态**：AI 改了代码 → test/audit 发现偏离 → 修正 → 系统回到结构附近。这是一个真正的动力学过程。
2. **隐式定义的流形**：`docs/architecture/` 不是枚举每个正确状态，而是定义约束方程。满足约束的状态构成流形，局部实现多样，整体被拉向同一类结构。
3. **跨会话涌现**：上百次 commit、几十个 plan、多次审计叠加后的长期收敛——这是"系统行为"，不是"某次执行"。
4. **恢复不需要外部指令**：下次 AI session 读到 owner docs + 当前代码，自然发现偏离并修正。不是被"告知"要修正，而是 owner-doc 作为真值源 + CI 作为检测构成了收敛动力学。

### NLAHs 和 OpenProse 属于同一类——但不是"run-level 吸引子"

NLAHs 和 OpenProse 都是 **runtime/workflow 级别的行为控制机制**，不是"run-level 吸引子"。它们定义控制目标，通过 runtime 执行。AGE 定义吸引子（方向层的最终因），控制机制服务于它。

三者的关系不是层次关系（project-level attractor ⊃ run-level attractor），而是**本体论差异**：

```
方向层（Attractor）——AGE: owner-doc 定义的长期收敛结构
  ↑ 为控制提供最终因
  │
控制层（Control Target）——NLAHs/OpenProse: specification + runtime 执行
  ↑ 控制机制的实现
  │
机制层（Mechanism）——IHR/reactor/CI: 具体的检测、执行、恢复
```

AGE 文章的核心论点正是：**方向层先于控制层。** 没有定义"朝哪里收敛"，控制机制就没有统一意义。NLAHs 和 OpenProse 都在控制层做创新——NLAHs 用 NL 提高策略的可审计性和可移植性，OpenProse 用确定性 runtime 提高执行的精确性和成本效率。但它们都不能回答方向层的问题：**系统应该向什么结构长期收敛？**

一个 AGE 项目可以用 NLAHs 或 OpenProse 作为控制层的实现技术。但 NLAHs 和 OpenProse 本身不包含吸引子。

---

## 11. Appendix: Paper Source

Full paper text saved to: `docs/analysis/2026-06-03-nlah-paper-source.txt`

Paper citation: Pan, L., Zou, L., Guo, S., Ni, J., & Zheng, H.-T. (2026). Natural-Language Agent Harnesses. arXiv:2603.25723v2.
