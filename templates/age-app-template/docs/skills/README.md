# Skills Index

Use this directory for reusable prompts and workflow playbooks.

These are not one-off chat messages. They are reusable repo memory.

Skills should primarily capture reusable work methods, review methods, or audit methods. Do not use a skill as a substitute for requirement truth, design truth, or architecture truth.

These prompts are generic defaults for copied projects. After copying the template, you MUST customize them to the project's real owner docs, protected areas, verification stack, naming conventions, known failure modes, and false-positive tolerance.

## Skill Routing Rule

Before choosing a skill:

1. Read the relevant requirement and owner docs first.
2. Classify the task type using `AGENTS.md`.
3. Choose the skill by matching the work method, not just the business label.
4. If no existing skill clearly fits, record `Skill: none` and proceed with the normal docs-driven workflow.

## Skill Registry

| Skill                                     | Use when                                                                           | Do not use when                               | Required inputs                                                              | Expected output                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------- |
| `document-audit-prompt.md`                | requirement, design, or architecture docs may be incomplete or inconsistent        | the task is trivial and local                 | target doc paths, relevant input or owner docs                               | audit findings and revision targets            |
| `plan-audit-prompt.md`                    | a non-trivial plan is ready for challenge before implementation                    | no plan exists yet                            | plan file, related requirement and owner docs                                | pass/fail audit with concrete issues           |
| `closure-audit-prompt.md`                 | implementation claims completion and needs independent closure review              | work is still mid-flight                      | plan, verification evidence, relevant changed docs                           | closure verdict and remaining gaps             |
| `requirement-gap-retrospective-prompt.md` | landed work still missed expectations and the requirement pipeline needs diagnosis | the requirement is still being drafted        | original input, requirement/discussion docs, delivered result                | retrospective findings and process corrections |
| `multi-dimensional-audit-prompt.md`       | high-risk work needs challenge across multiple dimensions at once                  | a single-object audit is already sufficient   | relevant requirement/owner docs, plan or changed area, verification evidence | findings grouped across dimensions             |
| `open-ended-audit-prompt.md`              | hidden problems may exist outside the normal checklist                             | the work only needs a narrow structured audit | relevant requirement/owner docs, plan if any, logs, live changed code        | adversarial findings and unknown-risk notes    |

## Starter Skills

- `document-audit-prompt.md`
- `plan-audit-prompt.md`
- `closure-audit-prompt.md`
- `requirement-gap-retrospective-prompt.md`
- `multi-dimensional-audit-prompt.md`
- `open-ended-audit-prompt.md`
