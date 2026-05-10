# 01 Over-Abstracted Compiler Fix Before Minimal Branch-Point Check

## Problem Context

- Date: `2026-05-09`
- Active task: execute `docs/plans/239-schema-within-prop-custom-field-compilation-plan.md`
- Real requirement: add field-level `compile` handling so a renderer field can bypass default prop compilation when needed, while all other fields keep the existing default behavior.

The concrete live defect behind the task was the `flow-designer` graph-mode text regression: nested template expressions inside `designer-page.config` were being compiled in the wrong scope and node/edge text became empty.

## Initial Wrong Judgment

The first implementation direction drifted into this thought process:

- field-level custom compilation means the compiler now has two kinds of compiled prop values
- therefore the compiler may need a new structural carrier for those values
- therefore `TemplateNode` might need a new field or a broader redesign instead of using the existing field loop as the decision point

That was the wrong direction.

## Why The Judgment Looked Plausible

- `TemplateNode.propsProgram` is currently the single obvious compiled-props carrier, so any non-default field compilation can trigger an instinct to redesign the carrier rather than the branching point.
- Compiler/runtime work often rewards "unified model" thinking, so it is easy to overvalue internal structural neatness before confirming whether the existing local extension point is already sufficient.
- The task involved `CompiledRuntimeValue`, nested schemas, and renderer-owned compilation semantics, which makes the problem sound larger than it actually is.

## Why It Was Wrong

- The requirement was field-local, not node-global.
- `plan 239` already defined the correct decision boundary: the per-field compilation step inside the property loop.
- The minimal correct rule is simple:
  - if a field has `rule.compile`, use it for that field
  - otherwise keep the existing default compilation path
- Jumping to `TemplateNode` redesign before exhausting the field-loop branch point was a violation of the repo's minimal-change discipline.
- It also risked turning one concrete compiler extension into a wider runtime/model refactor with more surface area, more verification burden, and more opportunities to introduce unrelated regressions.

## Decisive Evidence

The strongest evidence that the broader structural idea was unnecessary came from the task statement itself and the user correction:

- `docs/plans/239-schema-within-prop-custom-field-compilation-plan.md` repeatedly frames the feature as a `SchemaFieldRule.compile` hook and a compiler integration point in `node-compiler.ts`, not as a template-node model redesign.
- The user immediately reduced the problem to its true local rule:
  - "如果是配置了compile，就使用compile来编译，否则就走缺省编译不就行了"
  - "不需要合并方案，针对属性循环的时候判断一下不行吗"
- That correction exposed the mistake clearly: the wrong turn came from solving a generalized internal model problem before validating whether the existing field loop already provided the needed branch point.

## Correct Decision Rule

When a task introduces a renderer metadata hook such as `SchemaFieldRule.compile`, first ask:

1. Is the behavior difference local to one field or one classification branch?
2. Does an existing per-field loop or classification site already exist?
3. Can the new behavior be expressed as "special-case this field, leave all others untouched"?

If the answer is yes, start there.

Do not redesign `TemplateNode`, runtime state carriers, or broad compiler output structures unless there is direct evidence that the local branch point is insufficient.

## Preventive Checklist

Before proposing any carrier/model expansion for compiler or runtime work, check all of the following:

- What is the smallest branch point that already exists in live code?
- Is the requirement field-local, renderer-local, node-local, or truly runtime-global?
- Does the owner plan mention a local integration point explicitly?
- Am I trying to make the internal model feel cleaner before proving the current model cannot express the requirement?
- Can the new behavior be stated as "only this field behaves differently"?

If the last question is yes, default to the field/classification loop first.

## Related Files / Docs

- `docs/plans/239-schema-within-prop-custom-field-compilation-plan.md`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/references/refactoring-guidelines.md`
