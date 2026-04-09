# Integrating Third-Party React Components as Flux Renderers

## Purpose

This document is a practical guide for wrapping any React component — from npm packages, internal libraries, or ad hoc code — as a flux renderer.

It complements the architecture-level contract in `docs/architecture/renderer-runtime.md` and the interface reference in `docs/references/renderer-interfaces.md`.

## Core Idea

Every flux renderer is a `(props: RendererComponentProps) => ReactNode` function registered under a unique `type` string. The runtime compiles a JSON schema node, resolves dynamic expressions, and passes the results to your component via a structured props object.

Your wrapper component's job is to **bridge** from `RendererComponentProps` to the third-party component's own props API.

## Minimum Viable Renderer

The only required fields on `RendererDefinition` are `type` and `component`:

```ts
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-runtime';

function ChartRenderer(props: RendererComponentProps) {
  return <Chart data={props.props.data} options={props.props.options} />;
}

const registry = createRendererRegistry([
  { type: 'chart', component: ChartRenderer }
]);
```

Schema usage:

```json
{ "type": "chart", "data": "${chartData}", "options": { "animated": true } }
```

## Props Mapping Reference

`RendererComponentProps` provides everything the runtime has resolved. Use these fields based on what your wrapper needs:

| Field | What it contains | Typical use |
|---|---|---|
| `props.props` | Resolved runtime values (all schema fields after expression evaluation) | Primary data input: `label`, `data`, `options`, etc. |
| `props.meta` | Control meta: `className`, `disabled`, `visible`, `testid`, `cid`, `label` | Style, accessibility, and control state |
| `props.events` | Runtime event handlers keyed by event name | `onClick`, `onChange`, `onSubmit` |
| `props.regions` | Precompiled child region handles | Slot content via `.render()` |
| `props.schema` | The raw declared schema for this node | Reading static config not in `props.props` |
| `props.helpers` | Stable helpers: `render`, `evaluate`, `dispatch`, `createScope` | Ad hoc rendering, expression evaluation |

### Example: Mapping props and events

```tsx
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { DatePicker } from 'some-datepicker-lib';

function DatePickerRenderer(props: RendererComponentProps) {
  return (
    <DatePicker
      value={props.props.value as string}
      minDate={props.props.minDate as string}
      maxDate={props.props.maxDate as string}
      disabled={props.meta.disabled}
      className={props.meta.className}
      onChange={(value) => void props.events.onChange?.(value)}
      data-testid={props.meta.testid || undefined}
    />
  );
}
```

### Example: Rendering child regions (slot content)

```tsx
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { resolveRendererSlotContent, hasRendererSlotContent } from '@nop-chaos/flux-react';
import { Panel } from 'some-ui-lib';

function PanelRenderer(props: RendererComponentProps) {
  const headerContent = resolveRendererSlotContent(props, 'header');
  const bodyContent = props.regions.body?.render();

  return (
    <Panel
      header={hasRendererSlotContent(headerContent) ? headerContent : undefined}
      className={props.meta.className}
    >
      {bodyContent}
    </Panel>
  );
}
```

Use `resolveRendererSlotContent(props, key)` when a slot can come from either a literal value prop or a child region. Use `props.regions.key.render()` when the slot is always a region.

## Level 2: Form Field Integration

To integrate a third-party input component into the flux form system, you need to:

1. Connect to the form scope via `useFormFieldController`
2. Set `wrap: true` on the definition for automatic label/error chrome
3. Optionally add a `ValidationContributor`

### Example: Custom date picker as a form field

```tsx
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { useFormFieldController, useFieldPresentation } from '@nop-chaos/flux-renderers-form';
import { DatePicker } from 'some-datepicker-lib';

function FormDatePickerRenderer(props: RendererComponentProps) {
  const name = String(props.props.name ?? props.schema.name ?? '');
  const { value, handlers, currentForm } = useFormFieldController(name);
  const presentation = useFieldPresentation(name, currentForm, {
    disabled: props.meta.disabled,
    required: Boolean(props.props.required)
  });

  return (
    <DatePicker
      value={value as string}
      disabled={presentation.effectiveDisabled}
      aria-invalid={presentation.showError ? true : undefined}
      onChange={(next) => handlers.onChange(next)}
      onFocus={handlers.onFocus}
      onBlur={handlers.onBlur}
    />
  );
}
```

### Definition with validation

```ts
import type { RendererDefinition } from '@nop-chaos/flux-core';

const formLabelFieldRule = { key: 'label', kind: 'value-or-region', regionKey: 'label' } as const;

const definition: RendererDefinition = {
  type: 'form-datepicker',
  component: FormDatePickerRenderer,
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath: (schema) => schema.name,
    collectRules: (schema) => {
      const rules = [];
      if (schema.validate?.api) {
        rules.push({ kind: 'async', api: schema.validate.api, debounce: schema.validate.debounce });
      }
      return rules;
    }
  },
  wrap: true
};
```

The `wrap: true` flag tells `NodeRenderer` to automatically wrap the component in a `<FieldFrame>` that renders the label, required indicator, and validation error message. Your component only needs to render the actual input.

### Key hooks for form integration

| Hook | Package | Purpose |
|---|---|---|
| `useFormFieldController(name)` | `flux-renderers-form` | Returns `{ value, handlers, currentForm }` — the primary controller |
| `useFieldPresentation(name, form, options)` | `flux-renderers-form` | Returns `effectiveDisabled`, `showError`, `interactive`, etc. |
| `useCurrentForm()` | `flux-react` | Direct access to `FormRuntime` for advanced scenarios |
| `useRenderScope()` | `flux-react` | Direct scope access for non-form scope writes |

## Level 3: Factory Pattern for Variants

When a third-party library exposes one component with multiple modes, use a factory to generate multiple renderer definitions from a single template:

```ts
function createPickerRenderer(mode: 'date' | 'time' | 'datetime') {
  return function PickerRenderer(props: RendererComponentProps) {
    const name = String(props.props.name ?? props.schema.name ?? '');
    const { value, handlers, currentForm } = useFormFieldController(name);
    const presentation = useFieldPresentation(name, currentForm, {
      disabled: props.meta.disabled,
      required: Boolean(props.props.required)
    });

    return (
      <Picker
        mode={mode}
        value={value as string}
        disabled={presentation.effectiveDisabled}
        onChange={(next) => handlers.onChange(next)}
        onFocus={handlers.onFocus}
        onBlur={handlers.onBlur}
      />
    );
  };
}

const definitions: RendererDefinition[] = [
  { type: 'form-datepicker', component: createPickerRenderer('date'), wrap: true },
  { type: 'form-timepicker', component: createPickerRenderer('time'), wrap: true },
  { type: 'form-datetimepicker', component: createPickerRenderer('datetime'), wrap: true }
];
```

This pattern is used in the codebase for input variants — see `packages/flux-renderers-form/src/renderers/input.tsx:19`.

## Registration

### At application startup

Pass definitions when creating the registry:

```ts
import { createRendererRegistry } from '@nop-chaos/flux-runtime';

const registry = createRendererRegistry([
  chartDefinition,
  datePickerDefinition
]);
```

Or register onto an existing registry:

```ts
import { registerRendererDefinitions } from '@nop-chaos/flux-runtime';

registerRendererDefinitions(registry, myDefinitions);
```

### Override an existing renderer

```ts
registry.register(myBetterChartDefinition, { override: true });
```

Overrides emit a `console.warn` but do not throw. Use this for customization without forking.

### In a renderer package

Follow the existing package convention:

```ts
// src/index.tsx
export const myRendererDefinitions: RendererDefinition[] = [
  { type: 'chart', component: ChartRenderer },
  { type: 'form-datepicker', component: FormDatePickerRenderer, wrap: true }
];

export function registerMyRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, myRendererDefinitions);
}
```

## Common Mistakes

### 1. Accessing stores directly in renderers

**Wrong:**

```ts
function MyRenderer() {
  const store = useSomeZustandStore(); // breaks the renderer contract
}
```

**Correct:** Use the standard hooks from `@nop-chaos/flux-react` or the controller utilities from `@nop-chaos/flux-renderers-form`.

### 2. Hardcoding visual styles in renderer components

**Wrong:**

```tsx
function MyRenderer(props) {
  return <div className="flex gap-4 p-3">{props.regions.body?.render()}</div>;
}
```

Renderers should only emit marker classes. Visual styles come from schema `className` and `classAliases`. See `docs/architecture/styling-system.md`.

**Correct:**

```tsx
function MyRenderer(props) {
  return (
    <div className={cn('nop-my-widget', props.meta.className)}>
      {props.regions.body?.render()}
    </div>
  );
}
```

### 3. Reading raw schema values instead of resolved props

**Wrong:**

```ts
const label = props.schema.label; // skips expression evaluation
```

**Correct:**

```ts
const label = props.props.label; // runtime-resolved, expressions evaluated
```

Use `props.schema` only for static structural config that the compiler does not process as a dynamic field.

### 4. Mutating scope in render phase

**Wrong:**

```ts
function MyRenderer(props) {
  props.helpers.evaluate('x = 1'); // side effect in render
  return <div />;
}
```

**Correct:** Use effects or event handlers:

```tsx
function MyRenderer(props) {
  React.useEffect(() => {
    // side effects go in effects
  }, []);
  return <div onClick={() => void props.events.onClick?.()} />;
}
```

## Decision Table

| Your component is... | Use this pattern | Key options |
|---|---|---|
| Pure display, no children | Minimum viable renderer | — |
| Has slot/child content | Region-based renderer | `regions` in definition |
| Is a form input | Form field renderer | `wrap: true`, `validation`, `fields` |
| Has multiple variants | Factory pattern | `createXxxRenderer(mode)` |
| Needs custom scope or action boundary | Scoped renderer | `scopePolicy`, `actionScopePolicy` on definition |
| Needs component handle (imperative API) | Component registry | `componentRegistryPolicy: 'new'` |

## RendererDefinition Field Reference

| Field | Required | Default | Purpose |
|---|---|---|---|
| `type` | yes | — | Unique string matching `schema.type` |
| `component` | yes | — | The React component |
| `displayName` | no | — | Human-readable name for tooling |
| `category` | no | — | Grouping for tooling (e.g. `"content"`, `"form"`) |
| `icon` | no | — | Icon name for tooling |
| `sourcePackage` | no | — | Package name for tooling |
| `defaultSchema` | no | — | Default schema values when inserting |
| `regions` | no | — | Declared region names |
| `fields` | no | — | `SchemaFieldRule[]` for compiler field classification |
| `validation` | no | — | `ValidationContributor` for form validation |
| `wrap` | no | `false` | Wrap in `<FieldFrame>` (label + error chrome) |
| `scopePolicy` | no | — | Scope creation policy |
| `actionScopePolicy` | no | `'inherit'` | `'inherit'` or `'new'` action scope boundary |
| `componentRegistryPolicy` | no | `'inherit'` | `'inherit'` or `'new'` component registry boundary |

## Related Documents

- `docs/architecture/renderer-runtime.md` — Full renderer runtime architecture
- `docs/references/renderer-interfaces.md` — Interface reference for all renderer contracts
- `docs/architecture/styling-system.md` — Styling contract and marker class rules
- `docs/architecture/form-validation.md` — Form validation architecture
- `docs/architecture/field-metadata-slot-modeling.md` — Slot and field metadata semantics
