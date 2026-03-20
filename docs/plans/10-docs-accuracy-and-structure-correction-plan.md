# Documentation Accuracy and Structure Correction Plan

## Purpose

This plan defines how to correct and streamline the active documentation under `docs/` so that it better matches the current repository state and is easier to navigate.

This plan treats `docs/plans/` as historical working records unless a specific plan is being updated for a new task.

That means this effort focuses on:

- active architecture and reference documents
- index and navigation structure
- examples and source-of-truth notes
- research and analysis documents that are still presented as active guidance

It does not require older plan documents to match the latest code exactly.

## Background

The current `docs/` tree has a strong base, but it now has three problems:

1. some documents still describe older interface shapes or file names
2. several documents repeat the same design guidance in slightly different words
3. the documentation tree mixes source-of-truth material with research notes and historical analysis in a way that makes “what should I trust first?” less obvious than it should be

The goal of this correction pass is not to rewrite the architecture.

The goal is to make the current documentation set:

- more accurate
- less repetitive
- more explicit about what is normative versus illustrative versus historical

## Scope

### In scope

- `docs/index.md`
- `docs/architecture/*.md`
- `docs/references/*.md`
- `docs/examples/*.md`
- `docs/analysis/*.md` when it is still positioned as active guidance
- directory-level structure and cross-links inside `docs/`

### Out of scope

- forcing historical plan files to reflect current implementation
- large architecture redesign hidden inside doc edits
- archive files under `docs/archive/` except for cross-reference cleanup
- non-doc source changes, unless a tiny code reference is needed to keep docs honest later in a follow-up task

## Correction Principles

All document updates in this pass should follow these rules.

### 1. Prefer current exported types and implementation files over older design sketches

When a document describes interfaces, contracts, or file ownership, the current source of truth is the active code in:

- `packages/amis-schema/src/index.ts`
- `packages/amis-runtime/src/*.ts`
- `packages/amis-react/src/*.tsx`
- active renderer packages

If a document wants to describe a future direction instead of current code, it must say so clearly.

### 2. Keep one primary home per topic

When one topic already has a detailed home, other documents should link to it instead of re-explaining it in depth.

Examples:

- slot and `value-or-region` modeling belongs primarily in `docs/architecture/field-metadata-slot-modeling.md`
- runtime and React boundary rules belong primarily in `docs/architecture/renderer-runtime.md`
- validation architecture and current validation behavior belong primarily in `docs/architecture/form-validation.md`
- runtime file ownership belongs primarily in `docs/architecture/amis-runtime-module-boundaries.md`

### 3. Mark document role clearly

Each active document should be easy to classify as one of:

- source of truth
- implementation reference
- research note
- example
- historical archive

The document introduction should make that role obvious.

### 4. Prefer precise claims over broad claims

If the code does not implement something yet, the docs should not imply it is already part of the stable current contract.

Use distinctions such as:

- “current implementation”
- “current exported type”
- “recommended direction”
- “possible future refinement”

### 5. Keep indexes short and documents deep

`docs/index.md` should primarily route readers to the right file.

It should not duplicate half the content of the files it links to.

## Main Problems To Correct

## P1 - Outdated type and interface references

Known examples to correct:

- `DialogInstance` should be aligned to current `DialogState`
- field-rule descriptions must include `value-or-region` and `event`
- compiled value-node examples must match the current `*-node` kinds used in code
- validation examples must not present obsolete interface members as if they are current

## P2 - Outdated file and module references

Known examples to correct:

- references to `packages/amis-runtime/src/form-validation-errors.ts` must be replaced or removed because the current implementation uses `packages/amis-runtime/src/validation/errors.ts`
- file ownership notes must reflect the actual current runtime layout

## P3 - Example behavior that no longer matches runtime semantics

Known examples to correct:

- example action flows that imply page-level updates through `setValue` with `componentPath` where current runtime semantics do not guarantee that behavior
- examples that imply older dialog addressing behavior instead of current nearest-dialog default close behavior

## P4 - Repeated guidance across architecture and reference files

Known duplication areas:

- index page reading guide versus document role summaries
- slot and `value-or-region` guidance repeated across renderer and field-metadata docs
- validation module ownership described in both validation architecture and runtime module boundary docs
- overlapping conclusions repeated in research and analysis documents

## P5 - Unclear separation between current guidance and research notes

Known areas to tighten:

- template research notes should stay useful, but they should not look like the active implementation contract
- comparative analysis should either become a clearly marked report or be reduced if it mostly duplicates reference notes

## Target End State

After this correction pass:

- `docs/index.md` is a concise navigation page
- active architecture files are internally consistent and aligned with current code
- each major topic has one primary detailed document
- examples reflect real current runtime behavior or are clearly labeled as illustrative
- reference and analysis documents are visibly secondary to architecture source-of-truth files
- historical plans remain preserved without being forced into present-tense correctness

## Planned Workstreams

## W1 - Rebuild the documentation map and document roles

### Goal

Make it obvious which files are authoritative, which are reference notes, and which are historical.

### Planned changes

- shorten `docs/index.md`
- remove duplicated role descriptions where the reading guide already covers the same decision
- add a tighter “read this first” structure
- explicitly note that `docs/plans/` is historical working material unless a plan is being actively used
- make archive and analysis roles more explicit

### Acceptance criteria

- a new reader can identify the primary documents quickly
- the index page routes instead of repeating
- historical versus active docs are easier to distinguish

## W2 - Correct core architecture documents against current code

### Goal

Bring the main architecture set into alignment with current exported types and implementation structure.

### Files in focus

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/amis-runtime-module-boundaries.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/frontend-baseline.md`

### Planned changes

- update type sketches that no longer match current code exactly
- replace outdated file names and module paths
- convert over-strong present-tense claims into either current-state claims or explicit direction notes
- tighten any baseline claims against the current workspace layout and scripts
- keep current design intent, but distinguish it from non-implemented future refinements

### Known correction points

- align compiled value-node examples with current `static-node`, `expression-node`, `template-node`, `array-node`, and `object-node` naming
- keep `CompiledRuntimeValue` versus `CompiledValueNode` terminology distinct
- remove or correct `form-validation-errors.ts` references
- expand validation-rule examples so they do not understate current rule support
- mark optional future ideas such as normalization or richer validator context as direction, not current implementation

### Acceptance criteria

- no obvious type sketch contradicts current exported code
- file ownership references point to real current files
- architecture docs stay useful without pretending future ideas are already implemented

## W3 - Consolidate slot, field-metadata, and renderer-boundary guidance

### Goal

Reduce duplication around slot semantics and renderer normalization rules.

### Files in focus

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/references/renderer-interfaces.md`

### Planned changes

- keep the detailed slot and field-semantics treatment in `docs/architecture/field-metadata-slot-modeling.md`
- reduce repeated explanation in `docs/architecture/renderer-runtime.md` to a concise summary plus cross-link
- update `docs/references/renderer-interfaces.md` so its interface map matches current exported concepts
- ensure field-rule summaries include `meta`, `prop`, `region`, `value-or-region`, `event`, and `ignored`

### Acceptance criteria

- the slot-modeling doc becomes the clear detailed home for this topic
- runtime doc keeps only the renderer-facing implications it needs
- interface reference no longer uses stale names or stale field-rule categories

## W4 - Consolidate validation architecture versus validation module ownership

### Goal

Keep validation behavior and validation file ownership from repeating each other too much.

### Files in focus

- `docs/architecture/form-validation.md`
- `docs/architecture/amis-runtime-module-boundaries.md`
- validation-related reference and analysis notes

### Planned changes

- keep runtime validation behavior, rule model, triggers, visibility, and renderer integration in `docs/architecture/form-validation.md`
- keep file ownership and placement rules in `docs/architecture/amis-runtime-module-boundaries.md`
- replace repeated implementation breakdowns with short links where possible
- ensure “current behavior” sections accurately reflect touched, visited, dirty, async debounce, subtree validation, and array operations

### Acceptance criteria

- readers know where to look for behavior versus file-placement decisions
- validation docs no longer repeat long module lists in multiple places without adding new value

## W5 - Correct examples so they reflect real current semantics

### Goal

Ensure examples teach current behavior instead of outdated or ambiguous behavior.

### Files in focus

- `docs/examples/user-management-schema.md`
- any examples embedded inside architecture docs where semantics drifted

### Planned changes

- review action examples against current `action-runtime.ts`
- remove or rewrite flows that imply unsupported page-update semantics
- keep nearest-dialog close behavior consistent
- align wording with the current schema compiler and renderer event model

### Acceptance criteria

- examples do not contradict current runtime semantics
- example action chains are plausible against active code
- examples remain small and pedagogically useful

## W6 - Reclassify or compress secondary research and analysis material

### Goal

Preserve useful research without letting it compete with current architecture docs.

### Files in focus

- `docs/analysis/form-validation-comparison.md`
- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`
- `docs/references/expression-processor-notes.md`
- `docs/references/legacy-implementation-notes.md`

### Planned changes

- keep the two template notes as research notes, but trim clearly duplicated summary sections if needed
- decide whether `docs/analysis/form-validation-comparison.md` should stay as an active analysis file, move to archive, or be reduced to a short report summary
- update reference docs so they explicitly say they are not the implementation source of truth
- keep useful prototype lessons, but prevent obsolete details from reading like active contracts

### Acceptance criteria

- research docs remain useful but visibly secondary
- duplicated comparisons are reduced
- historical or comparative material does not dilute the active documentation baseline

## W7 - Final consistency pass across cross-links and terminology

### Goal

Make the whole `docs/` tree read like one curated set instead of several partially overlapping waves of writing.

### Planned changes

- unify terminology for compiled nodes, runtime values, regions, dialog state, and validation nodes
- normalize “source of truth” notes across active docs
- fix broken or stale cross-references
- ensure each major doc links to the smallest useful set of related files

### Acceptance criteria

- terminology is consistent across architecture and reference docs
- there are no obvious stale cross-links
- document introductions and related-doc sections reinforce a coherent reading path

## Document-by-Document Correction Checklist

## `docs/index.md`

- remove duplication between Reading Guide and Document Roles
- keep only concise routing and role notes
- add explicit note that `docs/plans/` is historical working material

## `docs/architecture/amis-core.md`

- correct compiled value-node examples to current naming
- distinguish current implementation types from architectural direction where they differ
- verify action and scope claims against current runtime behavior

## `docs/architecture/renderer-runtime.md`

- reduce repeated slot-modeling detail
- keep current renderer boundary, hooks, regions, and context split aligned with exported contracts
- ensure event and region language matches current renderer props shape

## `docs/architecture/amis-runtime-module-boundaries.md`

- replace stale file references
- verify each named module exists now
- keep ownership notes focused on placement rules rather than re-documenting validation behavior

## `docs/architecture/field-metadata-slot-modeling.md`

- keep as the detailed home for `value-or-region` and event-field semantics
- verify “current foundation in the codebase” against current field-rule and compiler types
- update any phrasing that still talks as if `value-or-region` is only future work where it is already implemented

## `docs/architecture/form-validation.md`

- separate current implementation from future direction more clearly
- update outdated interface sketches
- expand or qualify rule-model examples to match current support
- keep current behavior sections aligned with the active form runtime

## `docs/references/renderer-interfaces.md`

- replace stale names such as `DialogInstance`
- update field-rule descriptions
- keep it as a concise map, not a shadow architecture document

## `docs/examples/user-management-schema.md`

- correct any outdated action semantics
- keep example scope small and representative
- ensure the notes explain what is illustrative versus currently exact

## `docs/analysis/form-validation-comparison.md`

- decide whether to keep, compress, or reclassify
- if kept, add explicit framing that it is a comparative report, not the active contract

## Execution Order

Recommended order:

1. W1 documentation map and role cleanup
2. W2 core architecture accuracy corrections
3. W3 slot and renderer-boundary consolidation
4. W4 validation architecture versus module-boundary consolidation
5. W5 example corrections
6. W6 research and analysis reclassification
7. W7 final terminology and cross-link pass

This order fixes trust and navigation first, then corrects active documents, then cleans up secondary material.

## Editing Strategy

Use a small-number-of-files-at-a-time approach.

Suggested slices:

1. index and top-level navigation
2. core architecture docs
3. slot and renderer references
4. validation docs
5. examples
6. analysis and references
7. final link and terminology cleanup

Each slice should preserve readability on its own.

## Validation Checklist

For this documentation pass, validation means cross-checking claims against active code rather than only proofreading prose.

For each updated file:

- verify every named type or interface against the current exports
- verify every named file path exists
- verify every behavior claim against the current implementation when the claim is present-tense
- verify every related-doc link still points to the best current file

At the end of the pass:

- re-read `docs/index.md` as a first-time entry point
- spot-check architecture docs against `packages/amis-schema/src/index.ts`
- spot-check runtime behavior claims against `packages/amis-runtime/src/*.ts`
- spot-check React integration claims against `packages/amis-react/src/index.tsx`

## Definition of Done

This plan is complete when:

- active docs no longer contain known stale file names or obvious stale type names
- major duplicated guidance has been consolidated
- examples no longer teach outdated runtime semantics
- source-of-truth versus research versus historical roles are clear
- the documentation tree is easier to navigate without losing important context

## Related Documents

- `docs/index.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/amis-runtime-module-boundaries.md`
