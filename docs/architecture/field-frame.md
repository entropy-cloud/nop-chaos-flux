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

- `packages/flux-renderers-form/src/renderers/shared/field-frame.tsx` for FieldFrame component
- `packages/flux-renderers-form/src/renderers/shared/label.tsx` for FieldLabel component
- `packages/flux-renderers-form/src/renderers/shared/field-hint.tsx` for FieldHint component
- `packages/flux-renderers-form/src/renderers/input.tsx` for control implementations using FieldFrame
- `packages/flux-renderers-form/src/field-utils.tsx` for shared field utilities

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

Controls decide whether to use FieldFrame. Not all controls need wrapping (e.g., hidden fields).

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
  // Label
  label?: ReactNode;
  labelTag?: 'span' | 'legend';  // default: 'span'
  required?: boolean;

  // Error
  error?: string;
  showError?: boolean;

  // Hints
  hint?: ReactNode;
  showHint?: boolean;
  description?: ReactNode;
  validating?: boolean;

  // Layout
  className?: string;
  layout?: 'default' | 'checkbox' | 'radio';  // default: 'default'

  // Children (the actual control)
  children: ReactNode;
}
```

## Render Structure

```tsx
function FieldFrame(props: FieldFrameProps) {
  const { label, labelTag, required, error, showError, hint, showHint, 
          description, validating, className, layout, children } = props;

  const Tag = layout === 'checkbox' || layout === 'radio' ? 'fieldset' : 'label';
  const LabelTag = Tag === 'fieldset' ? 'legend' : (labelTag ?? 'span');

  return (
    <Tag className={className}>
      {label && (
        <LabelTag className="nop-field__label">
          {label}
          {required && <span className="nop-field__required">*</span>}
        </LabelTag>
      )}
      
      <div className="nop-field__control">
        {children}
      </div>

      {/* Error - highest priority */}
      {error && showError && (
        <span className="nop-field__error">{error}</span>
      )}

      {/* Hint - shown on focus */}
      {!error && hint && showHint && (
        <span className="nop-field__hint">{hint}</span>
      )}

      {/* Validating indicator */}
      {validating && (
        <span className="nop-field__hint">Validating...</span>
      )}

      {/* Description - lowest priority, always visible when no error/hint */}
      {!error && !hint && description && (
        <span className="nop-field__description">{description}</span>
      )}
    </Tag>
  );
}
```

## Usage Examples

### Basic input with label and error

```tsx
function InputRenderer(props) {
  const { name, label, placeholder } = props.schema;
  const { value, error, showError } = useFieldState(name);

  return (
    <FieldFrame label={label} error={error} showError={showError}>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(name, e.target.value)}
      />
    </FieldFrame>
  );
}
```

### Checkbox with custom layout

```tsx
function CheckboxRenderer(props) {
  const { label, option } = props.schema;
  const { value, error, showError } = useFieldState(name);

  return (
    <FieldFrame
      label={label}
      error={error}
      showError={showError}
      layout="checkbox"
    >
      <span className="nop-checkbox">
        <input type="checkbox" checked={value} />
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
    <FieldFrame label={label} layout="radio">
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

| Class | Purpose |
|-------|---------|
| `nop-field` | Root wrapper |
| `nop-field__label` | Label text |
| `nop-field__required` | Required asterisk |
| `nop-field__control` | Control wrapper |
| `nop-field__error` | Error message |
| `nop-field__hint` | Hint/focus message |
| `nop-field__description` | Description text |
| `nop-field--invalid` | State: has validation error |
| `nop-field--touched` | State: has been focused+blurred |
| `nop-field--dirty` | State: value changed |

## Comparison with AMIS FormItem

| Feature | AMIS FormItem | FieldFrame |
|---------|---------------|------------|
| Label | ✓ | ✓ |
| Required indicator | ✓ | ✓ |
| Error message | ✓ | ✓ |
| Hint (focus) | ✓ | ✓ |
| Description | ✓ | ✓ |
| Remark (icon tooltip) | ✓ | Not yet |
| Caption | ✓ | Not yet |
| Layout modes | 5 modes | CSS-based |
| wrap: false | ✓ | Opt-out by not using FieldFrame |

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
