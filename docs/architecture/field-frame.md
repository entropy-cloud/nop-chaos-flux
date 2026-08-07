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
- `packages/flux-react/src/node-frame-wrapper.tsx` for the normalized wrapper handoff into `FieldFrame`

## Why This Is Needed

Without a shared wrapper, each form control (input, select, textarea, etc.) would need to manually compose label, hint, description, and validation feedback with similar JSX structure. This leads to:

1. **Code duplication** - Every control repeats the same label/error/hint layout pattern
2. **Inconsistent behavior** - Different controls may handle edge cases differently
3. **Harder to maintain** - Changes to label/error display require updating multiple files
4. **Missing features** - AMIS FormItem provides remark, description, caption, hint etc. but implementing them in each control is tedious

The current baseline solves this through `RendererDefinition.wrap` + `NodeFrameWrapper` + `FieldFrame`, so wrap-compatible renderers can stay focused on control semantics while the outer field chrome remains centralized.

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
2. **Hint** - focus-time guidance (shown when control is focused and no error)
3. **Description** - fallback helper text (shown when no error and the hint is not currently visible)

**Remark** and **LabelRemark** are independent icon tooltips that are always visible and do **not** participate in the error/hint/description priority chain.

### Layout flexibility

FieldFrame may switch semantic wrapper structure (`<label>` vs `<fieldset>`), but it must not hardcode visual layout classes. Visual spacing and arrangement remain schema-/host-driven styling concerns.

### Normalized wrapper handoff

FieldFrame is the final field-chrome renderer, not the place where schema fields are classified.

- renderer metadata decides whether `label` is a plain prop or a `value-or-region` field
- `NodeFrameWrapper` resolves normalized wrapper inputs such as `name`, `label`, `required`, `className`, `testid`, and `cid`
- `FieldFrame` renders those normalized values and current form state; it should not reach back into raw schema to rediscover field semantics

In the common path, concrete input/select/textarea renderers do not manually instantiate `FieldFrame`; they opt into `wrap: true` and let the wrapper layer supply the field chrome.

## Styling Contract

FieldFrame follows the same renderer styling contract as the rest of Flux:

- root marker stays `nop-field`
- root marker is semantic, not visual
- internal regions use `data-slot`
- field state uses `data-*`
- visual spacing, grid/flex, borders, and typography come from schema `className`, `classAliases`, host CSS, or the wrapped control library

That means FieldFrame should not bake in classes such as `grid`, `gap-*`, `flex`, padding, or color utilities as part of its default contract.

## Component API

```tsx
interface FieldRemarkProps {
  icon?: string;
  content: ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: ('click' | 'hover' | 'focus')[];
}

interface FieldFrameProps {
  name?: string;
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  description?: ReactNode;
  remark?: FieldRemarkProps;
  labelRemark?: FieldRemarkProps;
  layout?: 'default' | 'checkbox' | 'radio';
  labelAlign?: 'top' | 'left' | 'right';
  labelWidth?: string | number;
  rootTag?: 'label' | 'div';
  validationBehavior?: CompiledValidationBehavior;
  className?: string;
  testid?: string;
  cid?: number;
  renderer?: string;
  rootProps?: Record<string, string | number | undefined>;
  children: ReactNode;
}
```

Key props:

| Prop                 | Type                                  | Purpose                                                                                                                                                                             |
| -------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`               | `string?`                             | Field name used to select current form state, aggregate errors, and compiled validation behavior.                                                                                   |
| `label`              | `ReactNode?`                          | Resolved field label content. In the common path this already comes from normalized `props.label` / `regions.label` via `NodeFrameWrapper`.                                         |
| `required`           | `boolean?`                            | Explicit required override. The final required marker may also come from compiled validation rules such as `requiredWhen` / `requiredUnless`.                                       |
| `hint`               | `ReactNode?`                          | Hint text shown when no error is present and the control is focused.                                                                                                                |
| `description`        | `ReactNode?`                          | Fallback helper text shown when no error is present and the hint is not currently visible.                                                                                          |
| `remark`             | `FieldRemarkProps?`                   | Icon tooltip rendered next to the control. Always visible, independent of error/hint/description priority.                                                                          |
| `labelRemark`        | `FieldRemarkProps?`                   | Icon tooltip rendered next to the label. Always visible, independent of error/hint/description priority.                                                                            |
| `layout`             | `'default' \| 'checkbox' \| 'radio'?` | Layout mode. `checkbox`/`radio` render a `<fieldset>` + `<legend>` wrapper; `default` renders `<label>` + `<span>`.                                                                 |
| `labelAlign`         | `'top' \| 'left' \| 'right'?`         | Override label alignment for this field. Falls back to form-level `labelAlign`. Default: `'top'` when `mode='normal'`, `'right'` when `mode='horizontal'`.                          |
| `labelWidth`         | `string \| number?`                   | Override label column width for this field in horizontal mode. Falls back to form-level `labelWidth`.                                                                               |
| `validationBehavior` | `CompiledValidationBehavior?`         | Override the per-field validation behavior (controls when errors become visible). Falls back to form-level behavior.                                                                |
| `className`          | `string?`                             | Additional CSS classes on the semantic root marker.                                                                                                                                 |
| `testid`             | `string?`                             | Test anchoring attribute, rendered as `data-testid`.                                                                                                                                |
| `cid`                | `number?`                             | Mounted node id published as `data-cid` for debugger/inspection tooling.                                                                                                            |
| `renderer`           | `string?`                             | Renderer type anchor, rendered as `data-renderer` on the root for debugger/inspection tooling. `NodeFrameWrapper` passes `templateNode.rendererType` (`node-frame-wrapper.tsx:62`). |
| `children`           | `ReactNode`                           | The actual form control.                                                                                                                                                            |

Related schema contract:

- `BaseSchema.frameWrap?: boolean | 'label' | 'group' | 'none'`

## Internal Behavior

When `name` is provided, FieldFrame manages validation state internally:

1. **Form lookup**: `useCurrentForm()` to get the current form context
2. **Field state**: `useCurrentFormFieldState(...)` to get `touched`, `dirty`, `visited`, `submitting`, `submittingAttempted`, `validating`, and `error`
3. **Aggregate errors**: `useAggregateError(...)` to collect the highest-priority current error for the field
4. **Per-field behavior**: `getCompiledValidationField(form.validation, name)` to get field-specific `CompiledValidationBehavior`
5. **Behavior fallback**: `validationBehavior` prop → field behavior → form behavior → default (`{ triggers: ['blur'], showErrorOn: ['touched', 'submit'] }`)
6. **Conditional required tracking**: FieldFrame subscribes to `form.values` only when the field's compiled validation rules include `requiredWhen` or `requiredUnless`; `isFieldEffectivelyRequired(...)` then decides the final marker without broad-subscribing every field to all value changes
7. **Error visibility**: `shouldShowFieldError(behavior, state)` checks whether any trigger in `showErrorOn` matches the current field state
8. **Hint visibility and ARIA wiring**: hint content is only rendered while the real control is focused; when hint is hidden, `description` becomes the fallback helper surface and `aria-describedby` switches between `error`, `hint`, and `description` ids so the live accessibility chain matches the visible helper text

This means renderers do **not** need to manually manage outer `error`/`showError` chrome. In the common path they expose normalized field props, opt into `wrap: true`, and the wrapper layer passes `name` into `FieldFrame`.

## Render Structure

```tsx
export function FieldFrame(props: FieldFrameProps) {
  const {
    name, label, required, hint, description, remark, labelRemark,
    layout, labelAlign: labelAlignProp, labelWidth: labelWidthProp,
    rootTag, validationBehavior, className, testid, cid, rootProps, children,
  } = props;

  const formLayout = useFormLayout();
  const reactId = useId();
  const currentForm = useCurrentForm();
  const currentValidationScope = useCurrentValidationScope();

  const rawFieldState = useCurrentFormFieldState(name ?? '', {
    path: name ?? '', ownerPath: name ?? '',
  });
  const fieldState = name ? rawFieldState : EMPTY_FORM_FIELD_STATE;
  const aggregateError = useAggregateError(name ?? '', { enabled: Boolean(name) });
  const validationModel = currentForm?.validation ?? currentValidationScope?.validation;
  const validationField = name ? getCompiledValidationField(validationModel, name) : undefined;
  const fieldBehavior = validationField?.behavior;
  const behavior =
    validationBehavior ?? fieldBehavior ?? validationModel?.behavior ?? defaultBehavior;
  const dynamicRequiredPaths = name
    ? getDynamicRequiredDependencyPaths(validationField)
    : EMPTY_DYNAMIC_REQUIRED_PATHS;

  // Dynamic required from form or non-form validation values
  const dynamicRequired = useCurrentFormState(...) || useCurrentValidationValues(...);

  const error = aggregateError ?? fieldState.error;
  const showError = shouldShowFieldError(behavior, {
    touched: fieldState.touched, dirty: fieldState.dirty,
    visited: fieldState.visited, submitting: fieldState.submitting,
    submitAttempted: fieldState.submitAttempted,
  });
  const [focused, setFocused] = useState(false);

  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : (rootTag ?? 'label');
  const LabelTag = isGroup ? 'legend' : 'span';
  const effectiveRequired =
    Boolean(required) || Boolean(currentForm ? dynamicRequired : nonFormDynamicRequired);

  // ARIA ids for error/hint/description wiring
  const errorId = name ? `${name}-error` : undefined;
  const controlId = name ? `${name}-control` : undefined;
  const labelId = label && Tag === 'div' ? `${name ?? reactId}-label` : undefined;
  const hintId = (showValidating || showHint) ? `${name}-hint` : undefined;
  const descriptionId = showDescription ? `${name}-description` : undefined;
  const describedBy = mergeDescribedBy(showError ? errorId : undefined, hintId, descriptionId);

  // Clone child with ARIA props (id, aria-labelledby, aria-describedby,
  // aria-errormessage, aria-invalid, onFocus/onBlur for focus tracking)
  const child = cloneElement(children, {
    id: childProps?.id ?? controlId,
    'aria-labelledby': mergeDescribedBy(childProps?.['aria-labelledby'], labelId),
    'aria-describedby': mergeDescribedBy(childProps?.['aria-describedby'], describedBy),
    'aria-errormessage': showError ? errorId : undefined,
    'aria-invalid': (childProps?.['aria-invalid'] ?? showError) || undefined,
    onFocus: (event) => { setFocused(true); childProps?.onFocus?.(event); },
    onBlur: (event) => { setFocused(false); childProps?.onBlur?.(event); },
  });

  const effectiveLabelAlign = labelAlignProp ?? formLayout.labelAlign;
  const isLabelTop =
    effectiveLabelAlign === 'top' || (formLayout.mode === 'normal' && !effectiveLabelAlign);

  return (
    <Tag
      {...rootProps}
      className={cn('nop-field', className)}
      data-label-align={resolvedLabelAlign}
      data-testid={testid || undefined}
      data-cid={cid != null ? cid : undefined}
      data-field-visited={fieldState.visited ? '' : undefined}
      data-field-touched={fieldState.touched ? '' : undefined}
      data-field-dirty={fieldState.dirty ? '' : undefined}
      data-field-invalid={showError ? '' : undefined}
      data-field-mode={formLayout.mode}
      aria-required={effectiveRequired || undefined}
    >
      {label ? (
        <LabelTag data-slot="field-label" style={labelStyle}>
          {labelId ? <span id={labelId}>{label}</span> : label}
          {effectiveRequired ? (
            <span data-slot="field-required" aria-hidden="true">*</span>
          ) : null}
          {labelRemark ? (
            <span data-slot="field-label-remark"
              title={typeof labelRemark.content === 'string' ? labelRemark.content : undefined}>
              {labelRemark.icon ?? '?'}
            </span>
          ) : null}
        </LabelTag>
      ) : null}

      <div data-slot="field-control"
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        aria-errormessage={showError ? errorId : undefined}
        aria-invalid={showError || undefined}>
        {child}
        {remark ? (
          <span data-slot="field-remark"
            title={typeof remark.content === 'string' ? remark.content : undefined}>
            {remark.icon ?? '?'}
          </span>
        ) : null}
      </div>

      {showError && error ? (
        <span data-slot="field-error" id={errorId} role="alert" aria-live="assertive">
          {error.message}
        </span>
      ) : fieldState.validating ? (
        <span data-slot="field-hint" id={hintId}>{t('flux.common.validating')}</span>
      ) : showHint ? (
        <span data-slot="field-hint" id={hintId}>{hint}</span>
      ) : showDescription ? (
        <span data-slot="field-description" id={descriptionId}>{description}</span>
      ) : null}
    </Tag>
  );
}
```

## Usage Examples

### Renderer-definition opt-in

```tsx
const inputTextDefinition: RendererDefinition = {
  type: 'input-text',
  component: InputRenderer,
  wrap: true,
  fields: [formLabelFieldRule],
};
```

Once a renderer opts into `wrap: true`, `NodeFrameWrapper` resolves normalized `name` / `label` / `required` / `className` / `testid` / `cid` and renders `FieldFrame` around the control.

Wrapped-field interaction rule:

- the default `layout: 'default'` path still renders a real `<label>` root
- internal secondary action controls inside that subtree must not rely on native labelable elements such as `<button>` if non-control area clicks must stay inert
- for those cases, use a non-labelable button-like pattern (`role="button"`, keyboard handling, shared button classes) or move the action outside the wrapped label subtree through an allowed portal/opt-out path

### Control renderer stays focused on control semantics

```tsx
function InputRenderer(props: RendererComponentProps<InputSchema>) {
  const name = String(props.props.name ?? '');
  const { value, handlers } = useFormFieldController(name);

  return (
    <Input
      value={value == null ? '' : String(value)}
      disabled={props.meta.disabled}
      placeholder={
        typeof props.props.placeholder === 'string' ? props.props.placeholder : undefined
      }
      onFocus={handlers.onFocus}
      onChange={(event) => handlers.onChange(event.target.value)}
      onBlur={handlers.onBlur}
    />
  );
}
```

The renderer does not manually create `<FieldFrame>` and does not read `props.schema.label`; outer field chrome comes from the wrapper path.

### Wrapper handoff into `FieldFrame`

```tsx
<FieldFrame
  name={fieldName}
  label={labelContent}
  required={Boolean(props.resolvedPropsValue.required)}
  layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
  className={props.resolvedMeta.className}
  testid={props.resolvedMeta.testid}
  cid={props.resolvedMeta.cid}
>
  {children}
</FieldFrame>
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

When a renderer still needs shared field chrome but cannot safely host secondary action controls under a real `<label>`, the owner renderer may also choose a local `FieldFrame rootTag="div"` path, as long as that renderer explicitly preserves the intended `frameWrap` semantics and tests the resulting wrapper contract.

### Grouped field chrome via `frameWrap: 'group'`

```json
{
  "type": "radio-group",
  "name": "role",
  "label": "Role",
  "frameWrap": "group",
  "options": [
    { "label": "Viewer", "value": "viewer" },
    { "label": "Admin", "value": "admin" }
  ]
}
```

This keeps the radio-group renderer focused on rendering the control body while the wrapper path switches the field chrome to grouped `<fieldset>/<legend>` semantics.

## CSS Class Mapping

### Structural Classes

| Class                           | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `nop-field`                     | Root semantic field marker                      |
| `data-slot="field-label"`       | Label text                                      |
| `data-slot="field-required"`    | Required asterisk                               |
| `data-slot="field-control"`     | Control wrapper                                 |
| `data-slot="field-error"`       | Error message                                   |
| `data-slot="field-hint"`        | Hint/focus message or "Validating..." indicator |
| `data-slot="field-description"` | Fallback helper text when hint is not visible   |

### Data Attributes (State)

| Attribute            | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `data-field-visited` | Set when field has been visited               |
| `data-field-touched` | Set when field has been focused and blurred   |
| `data-field-dirty`   | Set when field value has changed              |
| `data-field-invalid` | Set when field has a visible validation error |

These data attributes follow the convention documented in `docs/architecture/renderer-markers-and-selectors.md` — state is communicated via data attributes rather than BEM modifier classes.

## Comparison with AMIS FormItem

FieldFrame corresponds to AMIS's `FormItem` / `FormItemWrap` — the per-field chrome wrapper. It does **not** correspond to `Group` (row layout) or `FieldSet` (multi-field grouping), which are independent container components in both AMIS and Flux.

| Feature                       | AMIS FormItem                          | FieldFrame                                                                    |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Scope                         | Single field chrome                    | Single field chrome                                                           |
| Label                         | Yes                                    | Yes                                                                           |
| Required indicator            | Yes                                    | Yes                                                                           |
| Error message                 | Yes                                    | Yes                                                                           |
| Hint (focus)                  | Yes                                    | Yes                                                                           |
| Description fallback          | Yes                                    | Yes                                                                           |
| Remark (icon tooltip)         | Yes                                    | Yes                                                                           |
| LabelRemark (label tooltip)   | Yes                                    | Yes                                                                           |
| Layout modes                  | 5 modes (in FormItem)                  | CSS-based; form-level `mode`/`labelAlign`/`labelWidth` propagated via context |
| wrap: false                   | Yes                                    | Definition-level `wrap: false` or instance-level `frameWrap: false`           |
| Internal validation state     | External                               | Yes (via `name` prop)                                                         |
| Per-field validation behavior | No                                     | Yes (`validationBehavior` prop)                                               |
| Multi-field grouping          | **No** (handled by `Group`/`FieldSet`) | **No** (handled by `fieldset`/`flex` components)                              |

For multi-field grouping, see:

- `docs/components/form/design.md` §13 — `fieldset` (grouping container) and `flex` (row layout)
- AMIS `FieldSet` → Flux `fieldset` (independent renderer)
- AMIS `Group` → Flux `flex` (existing renderer)

## Future Extensions

1. **Label width / align per-field** — propagated from form context, with per-field override via `labelAlign` / `labelWidth` props
2. **Size variants** — xs/sm/md/lg

## Related Documents

- `docs/architecture/field-metadata-slot-modeling.md` - field semantics model
- `docs/architecture/field-binding-and-renderer-contract.md` - normalized channel ownership for `name`, `label`, `title`, and field chrome inputs
- `docs/architecture/form-validation.md` - validation behavior
- `docs/architecture/renderer-runtime.md` - renderer component contracts
- `docs/architecture/renderer-markers-and-selectors.md` - data attribute convention
