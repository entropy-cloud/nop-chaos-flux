# Form Validation Design

## Purpose

This document defines the preferred form validation architecture for `nop-amis`.

The goal is to support schema-driven validation without hard-wiring the core runtime to `React Hook Form`, `Yup`, or any other specific React-side library.

## Design Goals

- collect form field structure and validation rules at schema compile time
- keep renderer internals pluggable through registry-based validation contributors
- let runtime execute a unified validation model
- allow complex controls to provide extra runtime registration only when truly necessary
- avoid coupling `amis-runtime` to React-only form libraries

## Main Rule

Validation is primarily a compiled schema concern, not a renderer-instance side effect.

That means:

- the compiler should understand form structure, field paths, and nesting
- renderer definitions should declare how a control participates in validation
- runtime should consume a compiled validation model
- React components should render errors and update values, not invent the validation graph at runtime

## Why Not Hard-Wire RHF or Yup

`React Hook Form` and `Yup` can be useful integration tools, but they should not define the core architecture.

Reasons:

- `amis-runtime` should stay React-independent
- validation rules come from schema, not JSX registration
- future adapters may prefer `Zod`, custom async rules, or designer-generated rule sets
- low-code renderer compilation should work even outside a React form-library lifecycle

Recommended stance:

- core validation model is framework-neutral
- React integration may later add an adapter layer if it helps for specific controls
- no dependency on `React Hook Form` or `Yup` is required for the first version

## Architecture Layers

Validation should be split into four layers:

1. schema validation declarations
2. compile-time field and rule extraction
3. runtime validation execution
4. React rendering of validation state

Current implementation detail inside `amis-runtime`:

- rule extraction and trigger normalization live in `packages/amis-runtime/src/validation/rules.ts`
- default message building lives in `packages/amis-runtime/src/validation/message.ts`
- reusable error helpers live in `packages/amis-runtime/src/validation/errors.ts`
- built-in sync validators live in `packages/amis-runtime/src/validation/validators.ts`
- validator lookup and registration live in `packages/amis-runtime/src/validation/registry.ts`
- runtime sequencing stays in `packages/amis-runtime/src/validation-runtime.ts` and `packages/amis-runtime/src/form-runtime-validation.ts`

This split is intentional.

The validation directory owns reusable validation semantics.

Runtime flow files own execution order, debounce, and form lifecycle behavior.

## Compile-Time Responsibility

The compiler should walk the form subtree and collect:

- field paths such as `username`, `profile.email`, and `addresses.0.city`
- lexical nesting and container boundaries
- field control type
- explicit schema rules
- visibility and disabled conditions when they affect validation participation

The compiler should not hard-code the private details of every control implementation.

## Renderer Validation Registration

Each renderer definition may optionally describe how it participates in validation.

Example direction:

```ts
interface ValidationContributor {
  kind: 'field' | 'container' | 'none';
  getFieldPath?(schema: BaseSchema): string | undefined;
  collectRules?(schema: BaseSchema, ctx: ValidationCollectContext): ValidationRule[];
  normalizeValue?(value: unknown, schema: BaseSchema): unknown;
}

interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  type: string;
  component: React.ComponentType<any>;
  validation?: ValidationContributor;
}
```

This lets the compiler understand control semantics through the registry rather than through a growing list of hard-coded `if (type === ...)` branches.

## Compiled Validation Model

The compiler should produce a form-scoped validation model.

Example direction:

```ts
interface CompiledFormValidationField {
  path: string;
  controlType: string;
  label?: string;
  rules: ValidationRule[];
}

interface CompiledFormValidationModel {
  fields: Record<string, CompiledFormValidationField>;
  order: string[];
}
```

This model should live with the compiled form node or in form-specific compiled metadata.

## Validation Rule Model

Rules should use a runtime-neutral representation.

Example direction:

```ts
type ValidationRule =
  | { kind: 'required'; message?: string }
  | { kind: 'minLength'; value: number; message?: string }
  | { kind: 'maxLength'; value: number; message?: string }
  | { kind: 'pattern'; value: string; message?: string }
  | { kind: 'email'; message?: string }
  | { kind: 'custom'; name: string; args?: unknown; message?: string }
  | { kind: 'async'; api: ApiObject; debounce?: number; message?: string };
```

This rule model can later be mapped to adapters, but the compiler and runtime should treat it as the source of truth.

## Rule Sources

Rules should come from two places:

### Explicit schema rules

Examples:

- `required`
- `minLength`
- `maxLength`
- `pattern`
- `validate`

### Control semantic defaults

Examples:

- `input-email` contributes an `email` rule
- `input-number` contributes numeric normalization and numeric checks
- `date-range` contributes structured value validation

The merged rule list should be computed during compilation.

## Runtime Contract

`FormRuntime` should eventually expose validation-oriented APIs in addition to value mutation.

Example direction:

```ts
interface FormRuntime {
  id: string;
  validateField(path: string): Promise<ValidationResult>;
  validateForm(): Promise<FormValidationResult>;
  getError(path: string): ValidationError | undefined;
  clearError(path: string): void;
  clearErrors(): void;
  submit(api?: ApiObject): Promise<ActionResult>;
  setValue(name: string, value: unknown): void;
  reset(values?: Record<string, any>): void;
}
```

Submission flow should become:

1. validate relevant fields
2. stop on validation failure
3. only run requestAdaptor, fetcher, and responseAdaptor after validation passes

## Runtime State

The form store will likely need more than just `values`.

Expected additions:

- `errors`
- `submitting`
- `validating`
- field-level validation status for async rules

Current runtime behavior:

- sync and async field errors are stored in `errors`
- async field rules can expose field-level `validating` state while requests are in flight
- async field rules may declare `debounce`, and the runtime will suppress superseded runs before the request starts
- blur-triggered validation is now wired for the standard form renderers
- `visited`, `touched`, and `dirty` are tracked in the form store for standard controls
- standard form renderers show errors after touch, revalidate touched fields on change, and keep submit-time validation as the final gate

Validation timing is now configurable:

- `form.validateOn` sets the default trigger policy for descendant fields
- `field.validateOn` overrides the form default for a specific field
- supported triggers are `change`, `blur`, and `submit`
- field override wins over form default; form default wins over runtime fallback
- `submit` remains the final validation gate even when fields also validate earlier

Error visibility is configurable separately from validation timing:

- `form.showErrorOn` sets the default visibility policy for descendant fields
- `field.showErrorOn` overrides the form default for a specific field
- supported visibility triggers are `touched`, `dirty`, `visited`, and `submit`
- this lets a field validate on one schedule while revealing errors on a different schedule
- example: `validateOn: 'submit'` with `showErrorOn: 'visited'` delays validation until submit but only reveals the result after the user focuses the field

Renderer integration should keep this behavior centralized:

- standard controls should share one field-behavior helper path for focus/change/blur wiring
- adding a new control such as `checkbox` should reuse the same validation and visibility policy helpers rather than reimplementing policy rules per component
- the same shared path now covers text inputs, select, checkbox, textarea, radio-group, switch, and checkbox-group controls
- shared field chrome should prefer `packages/amis-renderers-form/src/renderers/shared/` for repeated label and hint markup

These should remain runtime concepts, not React-library-specific state shapes.

## Complex Controls and Runtime Registration

Most fields should be fully described at compile time.

Only complex controls should need optional runtime registration, for example:

- dynamic array item editors
- file uploaders
- rich text editors
- third-party composite widgets

Possible direction:

```ts
interface RuntimeFieldRegistration {
  path: string;
  getValue(): unknown;
  childPaths?: string[];
  syncValue?(): unknown;
  onRemove?(): void;
  validate?(): Promise<ValidationError[]> | ValidationError[];
}
```

This is a supplement, not the primary mechanism.

Current first implementation status:

- `FormRuntime.registerField(...)` now exists for controls that cannot be modeled fully by compile-time rules alone
- runtime registration can contribute field-level validation for paths that are missing or incomplete in the compiled model
- the current `tag-list` renderer is the first minimal example of this path
- `key-value` is the first composite editor example where runtime registration and local composite UI state stay synchronized through the form runtime
- `array-editor` now uses `childPaths` and `syncValue()` to show how runtime registration can expose deeper composite structure while still presenting one top-level field contract

## Recommended First-Version Scope

First implementation should aim for:

1. compile-time field extraction for standard form controls
2. unified validation rule model
3. `FormRuntime.validateField` and `FormRuntime.validateForm`
4. sync validation for `required`, `minLength`, `maxLength`, `pattern`, and `email`
5. async validation built on the existing request cancellation infrastructure

Do not start with:

- deep React Hook Form integration
- Yup-only rule modeling
- runtime-only field discovery as the main architecture

## Relationship to Legacy Notes

`docs/references/legacy-implementation-notes.md` contains some useful ideas, but it is not the architecture source of truth.

Useful pieces to borrow:

- compile-time rule extraction
- submit handler separation
- async validation request cancellation

Ideas to treat carefully:

- dialog extraction by `dialogId`, because the current runtime now prefers nearest-dialog close semantics
- mutable `setByPath`, because current public updates favor clearer immutable semantics

## Related Documents

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/plans/02-development-plan.md`
- `docs/references/legacy-implementation-notes.md`
