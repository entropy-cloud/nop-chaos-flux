# From Spec-Driven Development to Attractor-Guided Engineering

`nop-chaos-flux` is a low-code runtime framework built with React 19, Zustand 5, and Vite 8. It was inspired by Baidu AMIS, but reimplemented independently from scratch around a different conceptual model.

The interesting part is not only the framework itself. The project was developed with heavy AI assistance at unusually high speed without collapsing into quality decay. Module boundaries became clearer over time, documentation became more stable, tests and audits became better at catching real problems, and code quality improved instead of drifting downward.

I later named the working method behind that result `Attractor-Guided Engineering`, or `AGE`.

This article explains how AGE differs from spec-driven development and what ordinary business-application teams can borrow from that experience.

## Core Model

The core conceptual chain of AGE is:

**state space -> attractor -> trajectory -> control**

- **State space**: all implementation states the system can evolve into under the current constraints
- **Attractor**: the stable structure the system keeps getting pulled back toward over time
- **Trajectory**: the real path the repository takes across repeated rounds of generation, verification, and correction
- **Control**: the local mechanisms that keep influencing the trajectory

In an AI-heavy project, the problem is not only how to add more guardrails. The harder problem is deciding what stable structure the system should keep returning to as AI expands the state space at very high speed.

An attractor is not a complete blueprint and not a static end state. It is a stable structural region defined by a small set of high-value constraints. Local implementations can vary, but the overall system keeps being pulled back toward the same kind of shape.

In `nop-chaos-flux`, the first thing that defined the attractor was not plans, lint, tests, or audits. It was a set of architecture owner docs with precedence.

Those owner docs did not try to enumerate every correct implementation. They defined the stable relationships that mattered most: primitive boundaries, allowed dependency directions, ownership edges, and patterns that were no longer acceptable. Plans, verification, audits, logs, bugs, and testing came later as harnesses that kept the live repository near that attractor.

That is the main difference from a purely spec-driven model. AGE is not centered on the evolution of one spec tree. It is centered on defining long-term convergence structure and then keeping the repository trajectory close to it.

## What Real Repository History Shows

"Architecture docs define the attractor" can sound like ordinary documentation governance until you look at the actual repository history.

In `nop-chaos-flux`, plans often did not begin by editing code. They began by freezing what kind of deviation had to be closed and who owned the correction. A useful plan did not only list tasks. It declared the current baseline, the target, the non-goals, the proof needed, and the conditions for closure.

That is why AGE plans are better understood as closure contracts, not task lists.

The same pattern appears in bug notes and test harness fixes. Some changes were not business-feature fixes at all. They were corrections to the proof system itself, because earlier verification had become too weak or too coupled to old implementation details.

The logs were also not diary-like status summaries. They recorded focused proof, owner-doc decisions, repo-wide gates, independent audits, and known-good baselines.

Together, these artifacts formed a real chain:

- owner docs defined the long-term structure
- audits found drift
- plans routed and froze ownership for closure
- focused proof demonstrated the local result
- owner docs were updated only when the supported baseline had changed
- logs, bugs, and testing notes preserved memory across sessions
- closure audit rechecked the live repository before any plan was truly considered done

That is what harness means here. The goal is not to make each task feel more complete. The goal is to keep the system trajectory returning toward the attractor.

## Where Spec-Driven Workflows Are Strong

Spec-driven workflows such as OpenSpec are strong at one important job: they organize behavior changes in a structured and parseable way.

They usually give you:

- a current spec tree
- a structured change package
- explicit behavior deltas
- an archival path that writes accepted deltas back to the main specs

That is genuinely useful when behavior changes are explicit, formalized, and need consistent structural handling.

## Where Spec-Driven Workflows Become Tight Or Costly

The problem is that not all repository knowledge naturally fits into `requirement`, `scenario`, or `delta spec` form.

Many high-value facts in AI-assisted engineering are not behavior specs:

- architecture precedence
- terminology history and misreadings
- research notes and tradeoff analysis
- audit findings
- exploratory testing discoveries
- bug diagnosis paths
- reasons a plan could not be closed

If every one of those artifacts must first be translated into a spec/change workflow just to become durable repository memory, the conversion cost rises and the original context gets flattened.

AGE keeps a more heterogeneous repository memory model:

- architecture docs define the attractor
- plans define local closure
- logs record evolution
- bugs preserve complex diagnosis
- testing notes preserve human discovery
- analysis preserves research and rejected directions
- audits re-evaluate the live repository

Specs can still exist inside AGE, but they are one harness among others. They are not the only top-level organizing structure.

## Why Spec-Driven Work Can Drift Toward Task Orientation

Spec-driven workflows naturally center attention on a single change package: why this change exists, what it modifies, how it will be implemented, and which checks have been completed.

That is much better than loose chat-driven work, but it still tends to make completion feel local to the change package itself.

The hidden risk is that a change can feel complete even while the overall system has not moved closer to its long-term structure.

AGE tries to counter that by asking a different top-level question:

What should the repository keep converging toward, and what proof is required before we claim that a slice has actually landed?

## Tasks Are Not Plans

This distinction matters.

A task list helps execution within a session. It is useful working memory.

But a plan in AGE must answer a stronger set of questions:

- what is the current live baseline?
- what exactly is in scope?
- what is explicitly out of scope?
- what proof demonstrates completion?
- which leftovers must not be hidden?
- who independently checks closure?

That is why `- [x]` cannot be treated as proof. It only means an implementer claims a step is done.

The actual proof must come from the current code, tests, owner docs, and independent review of the live repository.

## Why File-In / File-Out Matters

One of the most practical AGE rules is simple: important work should not live only in chat.

Inputs should enter the repository as files. Outputs should leave the session as files.

This is not document theater. It is the only reliable way to give AI-assisted work a durable carrier.

Examples:

- raw inputs go to `docs/input/`
- architecture constraints go to `docs/architecture/`
- local execution closure goes to `docs/plans/`
- implementation memory goes to `docs/logs/`
- human testing observations go to `docs/testing/`
- complex diagnosis goes to `docs/bugs/`
- research and tradeoff judgment go to `docs/analysis/`

The point is not to write more prose. The point is that once conclusions are classified and stored in the right place, they become repository memory instead of transient chat context.

## Code Is The Current Fact, But Not The Only Fact

Code is the fact source for current implementation behavior. Types and tests protect current behavior. Owner docs define the structure the system should converge toward. Logs, bugs, analysis, and testing preserve trajectory and memory.

These facts do not conflict unless artifact boundaries are blurred.

Problems start when:

- documents begin duplicating fragile implementation detail
- document completion is mistaken for proof that code is correct

AGE keeps those roles separate on purpose.

## The Practical Difference

Spec-driven development answers:

How should behavior changes be organized as structured spec updates?

AGE answers:

When AI expands the repository state space at very high speed, how do we define the structure the system should converge toward, and what harnesses keep its trajectory returning there?

The two models solve different problems at different levels.

Spec-driven workflows are strong at structured behavior evolution.

AGE is strong at long-term convergence: owner-doc precedence, closure contracts, externalized memory, and independent proof before completion claims.

## What Ordinary Application Teams Can Reuse Immediately

Most teams do not need the full governance depth of `nop-chaos-flux`.

But many teams can benefit from four simple AGE moves right away:

1. **File-in / file-out**. Put inputs into files before asking AI to work. Persist conclusions back to files after the work lands.
2. **Define one owner doc for the current core area**. Do not write a code tour. Write source-of-truth boundaries, state transitions, ownership, and key misconceptions.
3. **Use lightweight plans for non-trivial changes**. Include baseline, goals, non-goals, proof, and closure gates.
4. **Turn repeated failures into repository memory**. Testing notes, bug notes, and analysis should keep teams from re-learning the same lesson every week.

Spec updates are still useful. They just are not enough by themselves.

Long-term convergence still needs an attractor.
