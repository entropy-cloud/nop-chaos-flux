# FieldFrame Design

## Purpose

This document defines the FieldFrame component that provides unified label, error, hint, and validation feedback rendering for form controls.

Use it when changing:

- form control layout and styling
- label/error/hint display behavior
- field wrapper logic
- shared form control patterns

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-react/src/field-frame.tsx` for FieldFrame component

## Why This Is Needed

Currently, each form control (input, select, textarea, etc.) manually composes `FieldLabel` and `FieldHint` components with similar JSX structure. This leads to:

1. **Code duplication** - Every control repeats the same label/error/hint layout pattern
2. **Inconsistent behavior** - Different controls may handle edge cases differently
3. **Harder to maintain** - Changes to label/error display require updating multiple files
4. **Missing features** - AMIS FormItem provides remark, description, caption, hint etc. but implementing them in each control is tedious

FieldFrame provides a single component that handles all common field wrapper concerns.

## Design Principles

### Composition over inheritance

FieldFrame is a presentational wrapper component. Controls pass their input element as `children`.

### Opt-in per control

Controls opt into FieldFrame at renderer-definition time through `RendererDefinition.wrap`.

Schema instances can then refine that default with `frameWrap` on `BaseSchema`:

- unset: follow the renderer definition's `wrap`
- `false` or `'none'`: suppress FieldFrame for this instance
- `true` or `'label'`: use the default `<label>` layout
- `'group'`: use the grouped `<fieldset>/<legend>` layout

`frameWrap` only customizes renderers that already declared `wrap: true`. It does not force wrapping onto a renderer that is not FieldFrame-compatible.

### Layered hints

Multiple hint types with priority:
1. **Error** - validation failure (highest priority, shown when `showError` is true)
2. **Hint** - focus-time guidance (shown when control is focused)
3. **Description** - always-visible helper text (lowest priority)

### Layout flexibility

FieldFrame supports different layout modes via CSS classes, not component variants.

## Component API

```tsx
interface FieldFrameProps {
  name?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  layout?: 'default' | 'checkbox' | 'radio';
  validationBehavior?: CompiledValidationBehavior;
  className?: string;
  testid?: string;
  children: ReactNode;
}
```

Key props:

| Prop | Type | Purpose |
|------|------|---------|
| `name` | `string?` | Field name in the form. When provided, FieldFrame internally calls `useOwnedFieldState(name)` and `useAggregateError(name)` to get validation state. |
| `label` | `ReactNode?` | Field label text. |
| `required` | `boolean?` | Shows a required asterisk next to the label. |
| `hint` | `ReactNode?` | Hint text shown when no error is present. |
| `description` | `ReactNode?` | Description text shown when no error or hint is present. |
| `layout` | `'default' \| 'checkbox' \| 'radio'?` | Layout mode. `checkbox`/`radio` render a `<fieldset>` + `<legend>` wrapper; `default` renders `<label>` + `<span>`. |
| `validationBehavior` | `CompiledValidationBehavior?` | Override the per-field validation behavior (controls when errors become visible). Falls back to form-level behavior. |
| `className` | `string?` | Additional CSS classes on the root element. |
| `testid` | `string?` | Test anchoring attribute, rendered as `data-testid`. |
| `children` | `ReactNode` | The actual form control. |

Related schema contract:

- `BaseSchema.frameWrap?: boolean | 'label' | 'group' | 'none'`

## Internal Behavior

When `name` is provided, FieldFrame manages validation state internally:

1. **Form lookup**: `useCurrentForm()` to get the current form context
2. **Field state**: `useOwnedFieldState(name)` to get `touched`, `dirty`, `visited`, `submitting`, `validating`, and `error`
3. **Aggregate errors**: `useAggregateError(name)` to collect validation errors from all rules
4. **Per-field behavior**: `getCompiledValidationField(form.validation, name)` to get field-specific `CompiledValidationBehavior`
5. **Behavior fallback**: `validationBehavior` prop → field behavior → form behavior → default (`{ triggers: ['blur'], showErrorOn: ['touched', 'submit'] }`)
6. **Error visibility**: `shouldShowFieldError(behavior, state)` checks whether any trigger in `showErrorOn` matches the current field state

This means controls do **not** need to call `useFieldState` or pass `error`/`showError` props — they simply pass `name` and FieldFrame handles everything.

## Render Structure

```tsx
export function FieldFrame(props: FieldFrameProps) {
  const { name, label, required, hint, description, layout,
          validationBehavior, className, testid, children } = props;

  const currentForm = useCurrentForm();
  const fieldState = useOwnedFieldState(name ?? '');
  const aggregateError = useAggregateError(name ?? '');
  const behavior = validationBehavior
    ?? getCompiledValidationField(currentForm?.validation, name)?.behavior
    ?? currentForm?.validation?.behavior
    ?? defaultBehavior;

  const error = aggregateError ?? fieldState.error;
  const showError = Boolean(
    error && shouldShowFieldError(behavior, {
      touched: fieldState.touched,
      dirty: fieldState.dirty,
      visited: fieldState.visited,
      submitting: fieldState.submitting
    })
  );

  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : 'label';
  const LabelTag = isGroup ? 'legend' : 'span';

  return (
    <Tag className={['nop-field grid gap-2', className].filter(Boolean).join(' ') || undefined}
         data-testid={testid || undefined}
         data-field-visited={fieldState.visited || undefined}
         data-field-touched={fieldState.touched || undefined}
         data-field-dirty={fieldState.dirty || undefined}
         data-field-invalid={showError || undefined}>
      {label ? (
        <LabelTag className="nop-field__label">
          {label}
          {required ? <span className="nop-field__required">*</span> : null}
        </LabelTag>
      ) : null}

      <div className="nop-field__control">
        {children}
      </div>

      {error && showError ? (
        <span className="nop-field__error">{error.message}</span>
      ) : fieldState.validating ? (
        <span className="nop-field__hint">Validating...</span>
      ) : !error && hint ? (
        <span className="nop-field__hint">{hint}</span>
      ) : !error && !hint && description ? (
        <span className="nop-field__description">{description}</span>
      ) : null}
    </Tag>
  );
}
```

## Usage Examples

### Basic input with label (no manual state management)

```tsx
function InputRenderer(props) {
  const { name, label, placeholder } = props.schema;
  // No useFieldState needed — FieldFrame handles validation via name prop
  return (
    <FieldFrame name={name} label={label}>
      <input type="text" placeholder={placeholder} />
    </FieldFrame>
  );
}
```

### Per-instance opt-out of FieldFrame

```json
{
  "type": "code-editor",
  "name": "script",
  "label": "Script",
  "frameWrap": false
}
```

This keeps the renderer's normal root element and skips the outer `<label>`/`<fieldset>` field chrome for that instance.

### Checkbox group with custom layout

```tsx
function CheckboxRenderer(props) {
  const { label, option } = props.schema;
  return (
    <FieldFrame name={props.schema.name} label={label} layout="checkbox">
      <span className="nop-checkbox">
        <input type="checkbox" />
        <span className="nop-checkbox__label">{option?.label}</span>
      </span>
    </FieldFrame>
  );
}
```

### Radio group with legend

```tsx
function RadioGroupRenderer(props) {
  const { label, options } = props.schema;
  return (
    <FieldFrame name={props.schema.name} label={label} layout="radio">
      <div className="nop-radio-group">
        {options.map(opt => (
          <label key={opt.value} className="nop-radio">
            <input type="radio" value={opt.value} />
            <span className="nop-radio__label">{opt.label}</span>
          </label>
        ))}
      </div>
    </FieldFrame>
  );
}
```

## CSS Class Mapping

### Structural Classes

| Class | Purpose |
|-------|---------|
| `nop-field` | Root wrapper (with `grid gap-2`) |
| `nop-field__label` | Label text |
| `nop-field__required` | Required asterisk |
| `nop-field__control` | Control wrapper |
| `nop-field__error` | Error message |
| `nop-field__hint` | Hint/focus message or "Validating..." indicator |
| `nop-field__description` | Description text |

### Data Attributes (State)

| Attribute | Purpose |
|-----------|---------|
| `data-field-visited` | Set when field has been visited |
| `data-field-touched` | Set when field has been focused and blurred |
| `data-field-dirty` | Set when field value has changed |
| `data-field-invalid` | Set when field has a visible validation error |

These data attributes follow the convention documented in `docs/architecture/renderer-markers-and-selectors.md` — state is communicated via data attributes rather than BEM modifier classes.

## Comparison with AMIS FormItem

| Feature | AMIS FormItem | FieldFrame |
|---------|---------------|------------|
| Label | Yes | Yes |
| Required indicator | Yes | Yes |
| Error message | Yes | Yes |
| Hint (focus) | Yes | Yes |
| Description | Yes | Yes |
| Remark (icon tooltip) | Yes | Not yet |
| Caption | Yes | Not yet |
| Layout modes | 5 modes | CSS-based |
| wrap: false | Yes | Opt-out by not using FieldFrame |
| Internal validation state | External | Yes (via `name` prop) |
| Per-field validation behavior | No | Yes (`validationBehavior` prop) |

## Future Extensions

1. **Remark** - icon tooltip next to label
2. **Caption** - inline description next to control
3. **Label width** - for horizontal layouts
4. **Label align** - left/right alignment
5. **Size variants** - xs/sm/md/lg

## Related Documents

- `docs/architecture/field-metadata-slot-modeling.md` - field semantics model
- `docs/architecture/form-validation.md` - validation behavior
- `docs/architecture/renderer-runtime.md` - renderer component contracts
- `docs/architecture/renderer-markers-and-selectors.md` - data attribute convention
