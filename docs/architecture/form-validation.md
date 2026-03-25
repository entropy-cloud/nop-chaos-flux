# Form Validation Design

## Purpose

This document records the active form-validation architecture for `flux`.

Use it when changing:

- schema-driven validation rules
- renderer participation in validation
- form runtime validation behavior
- validation timing and error visibility behavior
- runtime registration for complex controls

For validation file placement and module ownership, use `docs/architecture/flux-runtime-module-boundaries.md`.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-core/src/index.ts` for validation contracts
- `packages/flux-runtime/src/validation/rules.ts` for rule extraction and trigger normalization
- `packages/flux-runtime/src/form-runtime-validation.ts` for field and subtree validation flow
- `packages/flux-runtime/src/form-runtime.ts` for form-level validation APIs and submit behavior
- `packages/flux-renderers-form/src/field-utils.tsx` for shared renderer-side validation behavior wiring

## Main Rule

Validation is primarily a compiled schema concern, not a renderer-instance side effect.

That means:

- the compiler understands form structure, field paths, and nesting
- renderer definitions describe how a control participates in validation
- runtime consumes compiled validation metadata
- React components render field state and call runtime APIs; they do not invent the validation graph at mount time

## Why Not Hard-Wire RHF Or Yup

`React Hook Form` and `Yup` are useful references, but they do not define the core architecture here.

Reasons:

- `flux-runtime` stays React-independent
- validation rules come from low-code schema, not JSX registration
- future adapters may prefer other validation engines or custom rules
- compilation and runtime validation should work even outside a React form-library lifecycle

## Architecture Layers

Validation is split into four layers:

1. schema validation declarations
2. compile-time field and rule extraction
3. runtime validation execution
4. React rendering of validation state

Current implementation split inside `flux-runtime`:

- rule extraction and trigger normalization live in `packages/flux-runtime/src/validation/rules.ts`
- default message building lives in `packages/flux-runtime/src/validation/message.ts`
- reusable error helpers live in `packages/flux-runtime/src/validation/errors.ts`
- built-in sync validators live in `packages/flux-runtime/src/validation/validators.ts`
- validator lookup and registration live in `packages/flux-runtime/src/validation/registry.ts`
- runtime sequencing lives in `packages/flux-runtime/src/validation-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, and `packages/flux-runtime/src/form-runtime.ts`

## Current Compile-Time Responsibility

The compiler walks the form subtree and collects:

- field paths such as `username`, `profile.email`, and `addresses.0.city`
- lexical nesting and node relationships
- field control type
- explicit schema rules
- validation trigger behavior
- error-visibility behavior
- dependency paths for relational rules

The compiler should not hard-code the private details of every renderer implementation.

## Renderer Validation Participation

Each renderer definition may optionally describe how it participates in validation.

Current exported shape is:

```ts
interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
  valueKind?: 'scalar' | 'array' | 'object';
  getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
  collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
}
```

This lets the compiler understand control semantics through the renderer registry rather than through a growing list of hard-coded `if (type === ...)` branches.

Important note:

- older design sketches sometimes mentioned `normalizeValue?` on `ValidationContributor`
- that is not part of the current exported contract
- normalization remains a possible future direction, not current runtime behavior

## Current Compiled Validation Model

Current active validation metadata is richer than the original early sketch.

Key exported types are:

```ts
interface CompiledValidationBehavior {
  triggers: ValidationTrigger[];
  showErrorOn: ValidationVisibilityTrigger[];
}

interface CompiledValidationRule {
  id: string;
  rule: ValidationRule;
  dependencyPaths: string[];
  precompiled?: {
    regex?: RegExp;
  };
}

interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior: CompiledValidationBehavior;
}

interface CompiledValidationNode {
  path: string;
  kind: 'field' | 'object' | 'array' | 'form';
  controlType?: string;
  label?: string;
  rules: CompiledValidationRule[];
  behavior?: CompiledValidationBehavior;
  children: string[];
  parent?: string;
}

interface CompiledFormValidationModel {
  fields: Record<string, CompiledFormValidationField>;
  order: string[];
  behavior: CompiledValidationBehavior;
  dependents: Record<string, string[]>;
  nodes?: Record<string, CompiledValidationNode>;
  validationOrder?: string[];
  rootPath?: string;
}
```

Current code still exposes both field-centric and node-centric views.

That duplication is part of the active implementation today, even though future refactors may reduce it.

## Current Validation Rule Model

The current exported `ValidationRule` union includes:

```ts
type ValidationRule =
  | { kind: 'required'; message?: string }
  | { kind: 'minLength'; value: number; message?: string }
  | { kind: 'maxLength'; value: number; message?: string }
  | { kind: 'minItems'; value: number; message?: string }
  | { kind: 'maxItems'; value: number; message?: string }
  | { kind: 'atLeastOneFilled'; itemPath?: string; message?: string }
  | { kind: 'allOrNone'; itemPaths: string[]; message?: string }
  | { kind: 'uniqueBy'; itemPath: string; message?: string }
  | { kind: 'atLeastOneOf'; paths: string[]; message?: string }
  | { kind: 'pattern'; value: string; message?: string }
  | { kind: 'email'; message?: string }
  | { kind: 'equalsField'; path: string; message?: string }
  | { kind: 'notEqualsField'; path: string; message?: string }
  | { kind: 'requiredWhen'; path: string; equals: unknown; message?: string }
  | { kind: 'requiredUnless'; path: string; equals: unknown; message?: string }
  | { kind: 'async'; api: ApiObject; debounce?: number; message?: string };
```

This means the active runtime already supports more than the original first-wave scalar-only rule set.

## Rule Sources

Rules come from two places:

### Explicit schema rules

Examples in current code include:

- `required`
- `minLength`
- `maxLength`
- `minItems`
- `maxItems`
- `pattern`
- `equalsField`
- `requiredWhen`
- `validate` for async API-backed validation

### Control semantic defaults

Examples:

- `input-email` contributes an `email` rule
- array-like or composite controls can contribute array or object semantics through their renderer validation contribution

The merged rule list is computed during compilation.

## Current Runtime Contract

Current `FormRuntime` is broader than the earliest design sketch.

It already includes:

- `validateField(path)`
- `validateSubtree(path)`
- `validateForm()`
- `getError(path)` returning `ValidationError[] | undefined`
- `isValidating(path)`
- `isTouched(path)`
- `isDirty(path)`
- `isVisited(path)`
- `touchField(path)`
- `visitField(path)`
- `clearErrors(path?)`
- `submit(api?)`
- `reset(values?)`
- `setValue(name, value)`
- first-class array operations such as `appendValue`, `prependValue`, `insertValue`, `removeValue`, `moveValue`, `swapValue`, and `replaceValue`

Submission flow is currently:

1. mark relevant fields touched when submit-time validation or submit-time error visibility applies
2. validate the form
3. stop if validation fails
4. only execute submit request behavior after validation passes

## Current Runtime State

The active form store tracks:

- `values`
- `errors`
- `validating`
- `touched`
- `dirty`
- `visited`
- `submitting`

Current runtime behavior includes:

- sync and async field errors are stored in `errors`
- async field rules can expose field-level `validating` state while requests are in flight
- async field rules may declare `debounce`, and superseded runs are suppressed before request execution
- blur-triggered validation is wired for standard form renderers
- standard form renderers show errors according to `showErrorOn`, not a hard-coded single policy

## Validation Timing And Error Visibility

Validation timing is configurable:

- `form.validateOn` sets the default trigger policy for descendant fields
- `field.validateOn` overrides the form default for a specific field
- supported validation triggers are `change`, `blur`, and `submit`
- field override wins over form default; form default wins over runtime fallback
- `submit` remains the final validation gate even when fields also validate earlier

Error visibility is configured separately:

- `form.showErrorOn` sets the default visibility policy for descendant fields
- `field.showErrorOn` overrides the form default for a specific field
- supported visibility triggers are `touched`, `dirty`, `visited`, and `submit`
- this lets a field validate on one schedule while revealing errors on another

## Error Model

Current runtime errors are structured.

Current exported shape is:

```ts
interface ValidationError {
  path: string;
  message: string;
  rule: ValidationRule['kind'];
  ruleId?: string;
  ownerPath?: string;
  sourceKind?: 'field' | 'object' | 'array' | 'form' | 'runtime-registration';
  relatedPaths?: string[];
}
```

This supports:

- direct field errors
- aggregate object and array errors
- runtime-registration-produced errors
- path ownership distinctions for composite controls

## Renderer Integration

Renderer integration should keep validation behavior centralized.

In current code:

- standard controls reuse shared validation/visibility helpers
- form hooks expose both field-level and aggregate state selectors
- shared field chrome lives under `packages/flux-renderers-form/src/renderers/shared/`

Important current renderer-facing utilities include:

- `useCurrentFormErrors(...)`
- `useCurrentFormFieldState(...)`
- `useFieldError(...)`
- `useAggregateError(...)`
- helper functions in `packages/flux-renderers-form/src/field-utils.tsx`

## Complex Controls And Runtime Registration

Most standard fields should be fully modeled at compile time.

Runtime registration remains the supplement for controls that cannot yet be described fully by compile-time rules alone.

Current exported shape is:

```ts
interface RuntimeFieldRegistration {
  path: string;
  getValue(): unknown;
  childPaths?: string[];
  syncValue?(): unknown;
  onRemove?(): void;
  validateChild?(path: string): Promise<ValidationError[]> | ValidationError[];
  validate?(): Promise<ValidationError[]> | ValidationError[];
}
```

Current implementation status:

- `FormRuntime.registerField(...)` exists
- runtime registration can contribute validation for paths missing or incomplete in the compiled model
- `tag-list` is a minimal example of this path
- `key-value` shows composite editor synchronization with runtime validation
- `array-editor` uses `childPaths` and `syncValue()` to expose deeper composite structure

## Current Limits And Future Direction

The following are still better described as future direction rather than stable current behavior:

- a formal normalization phase before validation
- richer custom-validator execution contexts
- less duplicated stored projection inside compiled validation metadata
- more compiler-described composite validation with less runtime registration
- richer introspection APIs such as `describeValidation(...)`

Those ideas are valid and documented elsewhere, but they are not the current implementation contract.

## Relationship To Research Notes

The following references contain useful ideas, but they are not the architecture source of truth:

- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`
- `docs/references/legacy-implementation-notes.md`

Borrow from them carefully:

- compile-time rule extraction
- centralized runtime orchestration
- async validation cancellation
- aggregate error ownership

But do not let them override the active low-code-first architecture described here.

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/references/react-hook-form-template-notes.md`
- `docs/references/yup-template-notes.md`

