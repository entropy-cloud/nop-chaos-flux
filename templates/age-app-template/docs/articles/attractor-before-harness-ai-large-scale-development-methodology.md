# Attractor Before Harness: A Methodology For Large-Scale AI-Assisted Development

> In systems where AI participates deeply in development, the first-principles question is not "how to constrain AI behavior," but "what long-term structure the system should converge toward."
> Only after this direction is clearly defined can harnesses, guardrails, verification, audits, and closure mechanisms become truly meaningful. Otherwise, they merely solidify a wrong baseline more efficiently.
> This claim is necessary because AI collaboration pushes a problem that software engineering methodologies have long treated as an external add-on, trajectory convergence, into a position where it must be modeled explicitly.

## 1. Why Discussions Of AI Engineering Start With Harnesses

Current discussions of AI-assisted development most often use terms such as:

- `guardrail`
- `verification`
- `review`
- `feedback loop`
- `agent harness`

This intuition assumes one premise:

**The correct direction of the system is already known.**

Under this premise, the problem naturally becomes:

- how to restrict deviation
- how to expose failures as early as possible
- how to make review stricter
- how to prevent the agent from acting recklessly

This language is sufficient for small tasks. For a script, a CRUD page, or a local bug fix, you usually already know what the correct result looks like. What remains is mainly execution and verification.

But in large systems, the real difficulty is often not "how to prevent crossing the line," but "which path is actually the long-term correct structure."

To answer this, we must first see one thing clearly: **all current harness-like mechanisms are built on an implicit premise, namely that the evaluation unit is primarily a state, while trajectory convergence is covered by humans' implicit sense of direction**. AI collaboration is precisely what removes this fallback mechanism.

## 2. The Removed Fallback Mechanism

Open any mainstream engineering methodology, TDD, DDD, Clean Architecture, Agile, or code review culture. Their first-class evaluation objects are almost always states:

- evaluate whether "this PR is correct," not whether "the direction accumulated by the past 100 PRs is correct"
- evaluate whether "the current architecture is clear," not whether "the architecture is being continuously pushed toward a stable form during evolution"
- evaluate whether "tests cover current behavior," not whether "the test suite itself has been corroded by implementation details"

Traditional methodologies are not completely unaware of trajectory. Refactoring, technical debt, bad smells, evolutionary architecture, and Lehman's laws of software evolution all involve trajectory. But the status of these concepts in the system is that of **correction mechanisms and diagnostic vocabulary**, not foundational objects. When a theory has to continuously introduce negative concepts such as "debt," "fragility," and "erosion" to retrospectively recognize trajectory problems, it reflects precisely that its foundational categories do not contain a positive trajectory object.

This state-centered paradigm was long sufficient because human engineers themselves were low-frequency disturbance sources with stable directionality. A person writes hundreds of lines of code in a day, each disturbance is small, and the person continuously carries direction in their head. State-level quality assurance plus the programmer's implicit sense of direction is enough to keep the trajectory from drifting.

AI collaboration removes this fallback mechanism. AI is not a faster programmer. It is a **structurally different disturbance source**:

- **high frequency**: one session may generate hundreds of lines of code touching multiple modules within minutes
- **high amplitude**: each generation may introduce structural changes across boundaries
- **no continuous sense of direction**: each session is independent and lacks cross-session implicit architectural judgment
- **locally highly reasonable**: interfaces, types, tests, and documentation can all be produced together, and each item may pass inspection when viewed alone

The last point is crucial. **In AI collaboration, all state-level checks can pass while the overall system keeps drifting.**

Plan 76 in `nop-chaos-flux` is a typical example. An attempt to remove local state mirrors from `array-editor` / `key-value` directly produced 11 test failures. But what it exposed was not a single bug. It exposed a deeper fact: **the tests themselves had become tightly coupled to the timing of the old implementation**. From the state perspective, each accumulated change had passed review and CI. From the trajectory perspective, the test suite had unknowingly drifted into a position where it could no longer support structural evolution.

Traditional theory has the **symptom name** "test fragility." But a symptom name is a cross-sectional diagnosis. It does not name the process in which "100 legal commits accumulate into fragility." Trajectory problems are process problems, and process problems need process language.

So the issue is not that AI makes old problems more severe. The issue is that AI pushes trajectory problems from **occasional repair objects** into **high-frequency first-class objects**. To bring such problems into methodological view, engineering methodology must make "trajectory" a foundational category.

## 3. Dynamical-Systems Language: Making Trajectory Problems Explicit

In mathematical physics, a **dynamical system** is a system whose state evolves continuously over time and whose next state depends on the current state. We care not only whether it is correct at one moment, but what **trajectory** it traces through time.

In large-scale AI-assisted development, this language maps to four mutually defining foundational objects:

- **State space**: all implementation states the system may evolve into under current constraints
- **Attractor**: the stable structure the system is repeatedly pulled back toward over long-term evolution
- **Trajectory**: the actual evolution path left behind after each round of generation, verification, and correction
- **Control**: the mechanisms that continuously influence the trajectory through local signals

All combinations of code, documentation, and tests that the repository may evolve into under existing constraints form the state space. Humans, AI, review, CI, document updates, and other continuing actions form the evolution rules. The live repository history produced by the superposition of the two is the trajectory. The attractor is the stable structure the system is repeatedly pulled back toward during long-term iteration.

**One point must be made explicit here: this language is not "a more elegant way to say the same thing," but the foundational language of a new ontology**. The four concepts, state space, attractor, trajectory, and control, define each other. If one is missing, the other three cannot be expressed rigorously. Trying to translate these concepts into the language of the old ontology, architecture, constraints, goals, process, inevitably loses information. This is exactly the source of misunderstandings such as "Isn't Attractor-Guided Engineering just harness?"

The relationship among the four objects is:

**state space -> attractor -> trajectory -> control**

**This is not a rhetorical ordering. It is a logical dependency.** If state space is not defined, there is no attractor to speak of. If the attractor is not defined, it is impossible to judge whether the trajectory is drifting. If trajectory judgment does not exist, control has no goal.

Here, "before" means **logical priority**. In execution, attractor and harness co-evolve in a loop. But conceptually, attractor can be defined without harness, while harness cannot be defined without attractor. Where is correction supposed to correct toward? This asymmetry corresponds to the relation between final cause and efficient cause in dynamical systems. Acknowledging co-evolution does not weaken the "before" claim. Final cause and efficient cause also act together in physical systems, but final cause remains the logical precondition of efficient cause.

## 4. What Exactly Is An Attractor?

Take the well-known Lorenz attractor as an example. It is implicitly defined by differential equations. It is not a checklist that enumerates all correct trajectories in advance, nor is it a simple boundary. Local trajectories inside the attractor are very complex and may look almost chaotic in the short term. But the whole does not fly around randomly. It is always pulled back toward the same kind of geometric shape.

![Lorenz attractor](https://gitee.com/canonical-entropy/nop-chaos-flux/raw/master/docs/ppts/assets/lorenz-attractor.png)

_Lorenz attractor: local trajectories are highly complex, yet the whole is still constrained by a stable structure. Chaos is not randomness; local unpredictability is not global loss of control._

Engineering attractors are the same. **They are more like "equations defining a manifold" than "a list of every legal point."** Equations do not write every point on the manifold in advance. They only specify which relationships must hold. Points satisfying those relationships naturally fall into the same structure.

**The key difference from traditional architecture concepts**: DDD and Clean Architecture also emphasize long-term structure, but they treat long-term structure as a **target state**. The methodology's work is to "reach X." Trajectory ontology treats long-term structure as an **attractor**. The methodology's work is to "return near X no matter how far it is pushed away." **The second perspective handles stability under disturbance.** This is the core problem in AI collaboration, and it is precisely the problem traditional methodologies lack first-class conceptual tools to handle.

To prevent conceptual drift, attractor in engineering can be strictly divided into three layers:

- **structural layer, the attractor itself**: a small number of high-level invariants, such as how responsibilities are divided, how boundaries are established, and which structural relationships must not be broken
- **carrier layer, the engineering carrier of the attractor**: externalizing those invariants into versionable and auditable documents
- **implementation layer, the attractor's instantaneous projection**: the parts of current code that actually embody those invariants

**The attractor is not the document; the document is the carrier of the attractor. The attractor is not the code; the code is the instantaneous projection of the attractor.**

This layering matters because it resolves a common confusion: "when the architecture doc and code conflict, which one should we obey?" The answer is not "which one is more authoritative," but "what question are you asking?" If you ask about current implementation behavior, code is authoritative. If you ask where the system should converge, docs are authoritative. If you ask why a path was abandoned, logs, bugs, or analysis are authoritative. Each layer is authoritative only for the question corresponding to it.

## 5. The Repository Starts Carrying System Truth, So Harness Becomes Infrastructure

After AI participates deeply, the repository is no longer only an external projection of human cognition. It starts becoming the only carrier of system truth. No one fully grasps the design details of the whole system anymore. No one can answer questions about system design without looking at the project source. What the next session can reload is not the author's complete intent in their mind, but code, diffs, logs, tests, and documents.

This brings a direct engineering consequence:

**Generation and acceptance must be truly separated.**

The generation action can be completed rapidly by AI within the same context. But acceptance can no longer depend on that generation context itself. You must return to external evidence in the repository and judge again:

- whether the behavior really landed
- what the current baseline actually is
- which materials are authoritative
- whether this "completion" is only a feeling of completion

It is precisely because the repository begins to carry system truth that generation and evaluation must be separated. It is precisely because generation and evaluation are separated that harness is upgraded from a "more careful engineering habit" into necessary infrastructure.

**In traditional collaboration, harness is optional discipline. In AI collaboration, harness is a necessary condition for trajectory judgment to become possible.** The reason is that while AI generates code, it also generates all materials used to judge whether the code is correct, types, tests, documents, and completion summaries are all produced by the same context based on the same understanding. If this understanding itself is biased, all "verification evidence" will be consistently biased in the same direction. It will not contradict itself, but the whole may be wrong. This **self-verification trap** is naturally weakened in human collaboration. CI rules, reviewers, and normative documents are external standards independent of the current generation action and maintained by different cognitive subjects. AI collaboration breaks this independence, so engineering methods, fresh sessions, independent audits, and evidence collection from the live repository, must artificially rebuild the separation between generation and acceptance.

Under repo-truth conditions:

- `test / lint / audit` are more like measurement
- `owner doc / plan / closure` are more like constraints
- `logs / bugs / discussions` are more like trajectory records and externalized memory

## 6. The Three Ontological Confusions That Happen Most Easily

First, **treating the attractor as a boundary**.

A boundary answers "what cannot be done." Violating it immediately causes an error. An attractor answers "where the system should converge over the long term." A single violation may not immediately cause an error, but continuous deviation corrupts structure. Boundaries define forbidden zones. Attractors define stable zones. Confusing the two downgrades the attractor into a stricter guardrail and misses its core ability to handle "stability under disturbance."

Second, **treating the attractor as a stronger guardrail**.

Guardrails operate at the execution layer, where every action is checked. Attractors operate at the direction layer, where we judge whether accumulated actions are moving closer to them. Understanding the attractor as stricter governance, denser constraints, or stronger audits still downgrades the primary problem to the control layer. The root of this downgrade is failing to realize that the two belong to different levels.

Third, **treating the attractor as another phrase for control target**.

The phrase `control target` looks close, but it assumes the control framework is already established. Under trajectory ontology, the role of the attractor is to **provide the final cause for control**. It is before control, not inside control. Without defining the attractor first, so-called control has no target, and harnesses, guardrails, verification, and audits have no unified meaning.

## 7. In The `nop-chaos-flux` Repository, The Attractor Is First `docs/architecture/`

If the attractor remains abstract, it has no real engineering meaning yet. For `nop-chaos-flux`, the first thing carrying the attractor is the **owner-doc system with precedence under `docs/architecture/`**.

In this repository, the engineering landing point is clear: normative definitions under `docs/architecture/` come first, and convergence mechanisms such as plans, verification, audits, and logs come afterward.

Inside `docs/architecture/`, this "equation layer" also has explicit precedence:

- `docs/architecture/README.md` explains the architecture hierarchy and reading order
- `flux-design-principles.md` owns the direction layer, explaining design intent and stable principles
- `frontend-programming-model.md` owns the top-level normative layer, defining primitive identity, macro boundary, and hard invariants
- `flux-core.md` owns the current codebase-wide baseline
- narrower architecture docs define local contracts within their respective topics

In `nop-chaos-flux`, the structural layer of the attractor is not an abstract "correct architecture." It is jointly defined by a small number of high-value invariants: the closed set of seven primitives, the compile-first pipeline, Template/Instance separation, Data/Capability orthogonality, the unified renderer/hook contract, and the dependency direction `flux-core -> flux-formula -> flux-compiler -> flux-action-core -> flux-runtime -> flux-react`.

These are not parallel governance materials. They are structural equations fixed by owner docs. The value of architecture is not to describe everything, but to make wrong structures unable to continue existing legally.

Precisely because of this, many genuinely important convergence actions in this repository eventually appear as "some old structure was excluded from the legal state space."

The final removal of `CompiledSchemaNode` is a typical example. It was not merely refactoring cleanup. It showed that after the new Template/Instance separation baseline was established, the old intermediate structure could still work, but it no longer belonged to the correct structure, so it was excluded.

Similarly, the split into `flux-compiler` / `flux-action-core` / `flux-runtime` was not simply "splitting out two more packages." It meant the attractor had become more precise: the system was not merely "able to run," but was further converged into a more stable responsibility structure.

## 8. What Is Harness?

If the attractor solves "what is the direction," then harness solves:

**How to continuously measure, correct, and update the system trajectory through local signals.**

The harness discussed here is not a narrow testing harness, but a broader execution scaffold. It usually includes context routing, separation of implementation and acceptance, plans and closure conditions, verification mechanisms, audit mechanisms, diagnostic tools, and externalized memory.

In this repository, at least five layers of harness can be seen:

### 1. Routing Harness

`docs/index.md` and `docs/architecture/README.md` decide what to read first when encountering a problem, what is the current baseline, and what is merely analysis, plan, or history.

### 2. Plan Harness

`docs/plans/` solves "how this round of expansion closes," not "what the system is."

Fields such as `current baseline`, `goals / non-goals`, `exit criteria`, `validation checklist`, and `closure audit evidence` define how a local trajectory can close validly.

After closure/audit, Plan 145 split newly confirmed follow-up surfaces into Plan 146. Plan 143's closure assumption was repeatedly overturned by fresh audits until the live repository truly passed the line. A plan here is not a todo list, but a local convergence mechanism. It does not list "what needs to be done now"; it specifies where this round of expansion must close, which exit conditions it must satisfy, and which independent evidence closure requires.

### 3. Verification Harness

`lint`, `check`, `typecheck`, `build`, and `test` push high-frequency, explicit, automatable deviation detection down to the machine layer.

### 4. Audit Harness

Not all deviations can be caught by automated rules. Higher-level semantic drift, structural deviation, false completion, and local self-consistency that is globally distorted still require independent audit.

Audit itself is also a closed loop: find deviations, filter conflicts and false issues, then return to the live repository to confirm. High-quality audit is not about piling up more findings, but about excluding invalid findings as quickly as possible.

In this repository, one of the most important harness rules is: **do not let the same context both implement and judge completion**. Completion must come from a fresh session or independent audit that rechecks the live repository. The closures of Plan 143 and Plan 145 carry weight precisely because "completion" was not self-reported by the implementer, but came from an independent convergence judgment.

### 5. Memory Harness

`docs/logs/`, `docs/bugs/`, and `docs/discussions/` form externalized memory across sessions.

This layer is especially important because, for AI, "why not to understand it that way" is itself part of system memory. Keeping only final conclusions is not enough. In many cases, it is also necessary to preserve:

- which premise has been falsified
- which path has been proven to diverge
- which terminology translation downgrades the problem
- which "completed" judgment was later overturned by the live repository

Without this memory harness, the system loses part of its historical trajectory information every time.

The real loop is not "define the attractor once, then execute the harness forever." It is "define the attractor -> expand -> correct -> update the attractor -> expand again." The three-layer split of `flux-compiler` / `flux-action-core` / `flux-runtime` is an example of the attractor being corrected by practice and then continuing to expand.

## 9. Why New Attractors Usually Are Not Evolved By AI Itself

Even with harness, we cannot expect AI to slowly evolve a new attractor by itself during high-speed iteration.

At least under the training distribution and biases of current mainstream models, this usually should not be expected to happen naturally.

More specifically:

- current mainstream AI is very good at high-speed expansion and convergence around an existing attractor
- but it usually returns to average solutions it has seen before
- genuinely new conceptual cuts, boundary redefinitions, and architectural languages still require humans to propose them first

**The responsibility for defining a new attractor cannot be outsourced to AI by default.**

In large framework development, the division of labor between humans and AI cannot simply be understood as "AI writes code, humans review." A more realistic division of labor is:

- humans define new attractors
- AI expands rapidly around the established attractor
- harness continuously pulls the trajectory back on course

Concepts that genuinely change the structural language of the system, such as the separation of `ActionScope` and `Data Scope`, and lexical scoping, cannot grow merely by letting AI freely sample average solutions. They are new attractors proposed first, after which AI can perform large-scale expansion on the new baseline.

One limitation must be acknowledged: **this means the effectiveness of the methodology depends on having people in the team who can define attractors**. This is not a weakness of the methodology, but a fact it correctly identifies: architectural judgment is a scarce resource. In traditional collaboration, this judgment can partly remain in an architect's head and be transmitted through oral explanation and code review. AI has no cross-session memory; any architectural judgment not explicitly externalized does not exist to AI. The engineering contribution of this methodology is precisely to externalize this scarce resource into a versionable, auditable, inheritable repository structure so that it does not leave with one person. But if no one in the team can make this judgment at all, the methodology cannot generate it out of nothing.

## 10. Conclusion

The genuinely difficult part of large-scale AI-assisted development is not making AI write more code, but making the system keep converging toward the correct structure during high-speed expansion.

This convergence problem has **no positive object** in traditional methodologies where state is the first-class citizen. It can only be retrospectively recognized through negative vocabulary such as "debt," "fragility," and "erosion." To make convergence a first-class object that can be expressed, discussed, and engineered, methodology must include trajectory in its foundational categories.

Whoever proposes the new attractor defines the structural baseline for the system's subsequent evolution.

Compressed to one sentence, the core of the method is:

**state space -> attractor -> trajectory -> control.**

This is not a more complicated engineering process. It is a more foundational engineering conceptual structure. Only after there is a structure toward which the system should converge over the long term can we judge whether the trajectory has drifted. Only after there is judgment about trajectory drift can harnesses, guardrails, verification, audits, and closure have unified meaning.

In the AI era, what is truly scarce is not more agents that can write code, but people who can answer first: "where should the system converge?"

---

**nop-chaos-flux is open source:**

- GitHub: https://github.com/entropy-cloud/nop-chaos-flux
- Gitee: https://gitee.com/canonical-entropy/nop-chaos-flux
