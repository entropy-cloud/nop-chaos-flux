# Integrating Third-Party React Components as Flux Renderers

## Purpose

This document is a practical guide for wrapping any React component — from npm packages, internal libraries, or ad hoc code — as a flux renderer.

It complements the architecture-level contract in `docs/architecture/renderer-runtime.md` and the interface reference in `docs/references/renderer-interfaces.md`.

## Core Idea

Every flux renderer is a `(props: RendererComponentProps) => ReactNode` function registered under a unique `type` string. The runtime compiles a JSON schema node, resolves dynamic expressions, and passes the results to your component via a structured props object.

Your wrapper component's job is to **bridge** from `RendererComponentProps` to the third-party component's own props API.

In the common case, a normal declarative React component can become a flux renderer with only a thin adapter layer:

- schema value fields become resolved `props.props.xxx`
- control metadata becomes `props.meta.xxx`
- declared child content becomes `props.regions.xxx.render()`
- declarative `onXxx` action fields become `props.events.onXxx`

This means many components are effectively "register + map props" integrations, not custom runtime implementations.

## When Registration Is Enough

Plain registration plus a thin adapter is usually enough when the component:

- takes normal serializable props
- emits behavior through `onXxx` callbacks
- exposes nested content through `children` or named slots
- does not create its own page, form, dialog, or other runtime ownership boundary

Typical examples:

- cards, panels, tabs, badges, charts
- basic inputs and pickers
- layout containers with `header` / `footer` / `body`

In those cases you normally only need to decide:

1. which schema fields are normal props
2. which fields are events
3. which fields are child regions
4. whether `wrap: true` or validation is needed

## Slot Mapping Patterns

Third-party components often expose child content through mixed slot APIs instead of one uniform `body` prop. Common examples:

- `children`
- `header`
- `footer`
- `title`
- `empty`
- `renderEmpty`

In flux, these should usually be normalized into declared `regions` and then mapped back into the component API inside the renderer adapter.

### Static or node-like slots

If the component expects `ReactNode` values, map them directly from regions:

```tsx
function PanelRenderer(props: RendererComponentProps) {
  return (
    <Panel
      header={props.regions.header?.render()}
      footer={props.regions.footer?.render()}
    >
      {props.regions.body?.render()}
    </Panel>
  );
}
```

### Mixed value-or-region slots

If a slot can come from either a literal prop or nested schema, use `resolveRendererSlotContent(...)`:

```tsx
const titleContent = resolveRendererSlotContent(props, 'title');
```

This covers APIs where authors may want either:

- `"title": "Orders"`
- or `"title": { "type": "text", ... }`

### Function-style slots

Some component libraries expose slots as callback props such as `renderEmpty={() => ...}`. If the callback does not need runtime arguments from the third-party component, it can still be backed by a normal region:

```tsx
function ListRenderer(props: RendererComponentProps) {
  return (
    <List
      renderEmpty={() => props.regions.empty?.render()}
    >
      {props.regions.body?.render()}
    </List>
  );
}
```

The important rule is: the schema still declares `empty` as a region. The renderer adapter only translates that region into the component's callback-shaped slot API.

### Runtime render props need a real adapter

If the component expects a callback that receives local runtime data, that is no longer a pure region mapping.

Examples:

- `renderRow(row, index)`
- `renderNode(node, state)`
- `itemRenderer(item, active)`

These cases need an adapter that explicitly bridges the callback arguments into flux rendering, usually by calling `props.helpers.render(...)` or `region.render(...)` with extra bindings or scope setup. They are still integrable, but they are not zero-thought registrations.

## Event Bridging And Normalization

Declaring a field as an `event` lets `NodeRenderer` expose it as `props.events.onXxx`, but your adapter still decides what payload is forwarded.

### Native DOM-style events

If the third-party component gives you a normal DOM or React event, forward it directly:

```tsx
onClick={(event) => void props.events.onClick?.(event)}
```

This is the preferred path because the runtime can normalize the event into the standard action-event shape.

### Value-style callbacks

Some components emit values instead of DOM events:

```tsx
onValueChange={(value) => void props.events.onChange?.({ type: 'change', value })}
```

Here the adapter is normalizing a library-specific callback into a stable semantic payload that actions can consume.

### Rich callbacks

For callbacks such as `onRowClick(row, index, event)`, forward the native event when present and put the extra callback data into action bindings:

```tsx
onRowClick={(row, index, event) =>
  void props.events.onRowClick?.(event, {
    evaluationBindings: { row, index }
  })
}
```

Use this pattern when the action should be able to access both:

- the user interaction event
- structured library payload such as `row`, `item`, `option`, or `index`

## Plain Renderer Versus Owner Renderer

The "register and map props" story applies to plain renderers. These components render UI but do not create new runtime ownership boundaries.

Plain renderers usually only consume:

- `props.props`
- `props.meta`
- `props.events`
- `props.regions`
- hooks for ambient context when needed

Owner renderers are different. They create and publish a new boundary for descendants, for example:

- `form` creates `FormRuntime` and publishes `FormContext` plus form scope
- page/surface hosts create page or surface ownership state
- loop/table/tree-like controls may create child scopes or repeated-instance boundaries

These still use the same `RendererDefinition` registration system, but they are not "simple wrapped controls" anymore. They own part of the runtime model.

## Minimum Viable Renderer

The minimum required registration surface on `RendererDefinition` is `type` plus one render entry: `component` or `reactComponent`.

```ts
import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { createRendererRegistry } from '@nop-chaos/flux-core';

function ChartRenderer(props: RendererComponentProps) {
  return <Chart data={props.props.data} options={props.props.options} />;
}

const registry = createRendererRegistry([
  { type: 'chart', component: ChartRenderer }
]);
```

If you already have a plain React component that accepts normal props, you can also register `reactComponent`; the runtime will auto-wrap it into the standard `RendererComponentProps` boundary.

Schema usage:

```json
{ "type": "chart", "data": "${chartData}", "options": { "animated": true } }
```

## Props Mapping Reference

`RendererComponentProps` provides everything the runtime has resolved. Use these fields based on what your wrapper needs:

| Field | What it contains | Typical use |
|---|---|---|
| `props.props` | Resolved runtime values (all schema fields after expression evaluation) | Primary data input: `label`, `data`, `options`, etc. |
| `props.meta` | Control meta: `className`, `disabled`, `visible`, `testid`, `cid` | Style, accessibility, and control state |
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
      if (schema.validate?.action) {
        rules.push({ kind: 'async', action: schema.validate.action, debounce: schema.validate.debounce });
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
| `useFieldPresentation(name, owner, options)` | `flux-renderers-form` | Returns `effectiveDisabled`, `showError`, `interactive`, etc.; the second parameter is `ValidationScopeRuntime | undefined`, not only `FormRuntime` |
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
import { createRendererRegistry } from '@nop-chaos/flux-core';

const registry = createRendererRegistry([
  chartDefinition,
  datePickerDefinition
]);
```

Or register onto an existing registry:

```ts
import { registerRendererDefinitions } from '@nop-chaos/flux-core';

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
| `component` | one of `component` / `reactComponent` | — | The standard Flux renderer component |
| `reactComponent` | one of `component` / `reactComponent` | — | Plain React component path auto-wrapped by the runtime |
| `displayName` | no | — | Human-readable name for tooling |
| `category` | no | — | Grouping for tooling (e.g. `"content"`, `"form"`) |
| `icon` | no | — | Icon name for tooling |
| `sourcePackage` | no | — | Package name for tooling |
| `defaultSchema` | no | — | Default schema values when inserting |
| `propSchema` | no | — | Renderer-local prop schema metadata |
| `regions` | no | — | Declared region names |
| `fields` | no | — | `SchemaFieldRule[]` for compiler field classification |
| `validation` | no | — | `ValidationContributor` for form validation |
| `wrap` | no | `false` | Wrap in `<FieldFrame>` (label + error chrome) |
| `scopePolicy` | no | — | Scope creation policy |
| `actionScopePolicy` | no | `'inherit'` | `'inherit'` or `'new'` action scope boundary |
| `componentRegistryPolicy` | no | `'inherit'` | `'inherit'` or `'new'` component registry boundary |
| `injectedLocals` | no | — | Static injected-local metadata for compile-time symbol resolution |
| `authoringTransform` | no | — | Optional renderer-local schema transform before compilation |
| `staticCapable` | no | `false` | Declares whether the renderer is static-rendering capable |

## Related Documents

- `docs/architecture/renderer-runtime.md` — Full renderer runtime architecture
- `docs/references/renderer-interfaces.md` — Interface reference for all renderer contracts
- `docs/architecture/styling-system.md` — Styling contract and marker class rules
- `docs/architecture/form-validation.md` — Form validation architecture
- `docs/architecture/field-metadata-slot-modeling.md` — Slot and field metadata semantics
