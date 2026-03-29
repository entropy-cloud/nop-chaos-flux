# Expression Processor Notes

## Purpose

This note explains what should be retained from the early prototype in `docs/archive/expression-processor.js` and what must not be carried into the production architecture.

This is a prototype-lesson note, not the implementation source of truth for current contracts.

## What the Prototype Got Right

The prototype captured three important semantic targets:

### Compile once, execute many times

- parse the input template once
- create a reusable executable representation
- avoid reparsing the same structure for every render

### Static fast path

- if a subtree contains no expression, treat it as static
- return the original reference directly
- avoid paying execution cost for static fragments

### Identity reuse for dynamic results

- remember the previous evaluation result
- if the next result is equal, reuse the previous object or array reference
- use shallow equality on object and array reconstruction paths

These goals remain valid and should stay part of the real renderer runtime.

## What Must Not Be Kept

The following prototype mechanisms are not acceptable for the production direction:

- `new Function(...)`
- `with(scope)`
- direct execution against an eagerly materialized scope object as the normal path

Reasons:

- unsafe execution model
- poor control over variable access
- weak alignment with lexical scope chain semantics
- difficult to evolve toward resolver-based evaluation

## What the Formal Design Replaces It With

The production direction is:

- use a modifiable `amis-formula`-based compiler and evaluator
- execute against `EvalContext`
- resolve variable access through `resolve(path)` and `has(path)`
- only materialize whole objects when truly necessary

## Mapping Prototype Lessons to Current Architecture

| Prototype lesson | Current target |
| --- | --- |
| compile once | compile schema values into `CompiledValueNode` trees |
| static fragments should be free | compile to `kind: 'static'` and return original references |
| unchanged dynamic results should reuse references | keep per-node runtime state and shallow reuse rules |
| scope object access is convenient | replace with resolver-driven `EvalContext` and `ScopeRef` |

## When to Read This Note

Read this file when:

- refactoring the expression layer
- checking whether an optimization idea should be preserved
- deciding whether a prototype behavior belongs in the real runtime

Then continue with:

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`

## Related Source

- prototype source: `docs/archive/expression-processor.js`
