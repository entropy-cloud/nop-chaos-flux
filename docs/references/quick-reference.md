# Quick Reference

Single-file compressed reference for the types, hooks, and APIs most frequently needed
when writing renderer components. Reading this file replaces reading 10+ source files
(`renderer-core.ts`, `runtime.ts`, `schema.ts`, `actions.ts`, `hooks.ts`, etc.).

This is not the architecture source of truth — it is a lookup table.
Code source of truth: `packages/flux-core/src/types/`, `packages/flux-react/src/`.

---

## Package Directory Map

| Directory                    | npm name                                | Layer |
| ---------------------------- | --------------------------------------- | ----- |
| flux-core                    | @nop-chaos/flux-core                    | 1     |
| flux-formula                 | @nop-chaos/flux-formula                 | 2     |
| flux-compiler                | @nop-chaos/flux-compiler                | 3     |
| flux-action-core             | @nop-chaos/flux-action-core             | 4     |
| flux-runtime                 | @nop-chaos/flux-runtime                 | 5     |
| flux-react                   | @nop-chaos/flux-react                   | 6     |
| flux-renderers-basic         | @nop-chaos/flux-renderers-basic         | 7     |
| flux-renderers-form          | @nop-chaos/flux-renderers-form          | 7     |
| flux-renderers-form-advanced | @nop-chaos/flux-renderers-form-advanced | 7     |
| flux-renderers-data          | @nop-chaos/flux-renderers-data          | 7     |
| ui                           | @nop-chaos/ui                           | 7     |
| flux-code-editor             | @nop-chaos/flux-code-editor             | 7     |
| flux-i18n                    | @nop-chaos/flux-i18n                    | 7     |
| nop-debugger                 | @nop-chaos/nop-debugger                 | 7     |
| flux-bundle                  | @nop-chaos/flux-bundle                  | 8     |
| flow-designer-core           | @nop-chaos/flow-designer-core           | 5     |
| flow-designer-renderers      | @nop-chaos/flow-designer-renderers      | 7     |
| spreadsheet-core             | @nop-chaos/spreadsheet-core             | 5     |
| spreadsheet-renderers        | @nop-chaos/spreadsheet-renderers        | 7     |
| word-editor-core             | @nop-chaos/word-editor-core             | 5     |
| word-editor-renderers        | @nop-chaos/word-editor-renderers        | 7     |
| report-designer-core         | @nop-chaos/report-designer-core         | 5     |
| report-designer-renderers    | @nop-chaos/report-designer-renderers    | 7     |
| tailwind-preset              | @nop-chaos/tailwind-preset              | -     |
| theme-tokens                 | @nop-chaos/theme-tokens                 | -     |

Renderer packages use `{feature}-renderers` naming, NOT `flux-renderers-{feature}`.

---

## Project Conventions

- Test files: `*.test.ts` / `*.test.tsx` (NOT `.spec.tsx`)
- Build tool: Vite 8 (NOT webpack/rollup)
- Package manager: pnpm workspace
- CSS: Tailwind v4 CSS-based config in `apps/playground/src/styles.css`
- No `tailwind.config.js`, no `postcss.config.js`, no `.eslintrc` file
- Testing: Vitest (NOT Jest)
- State management: Zustand vanilla stores
- Type strict mode: enabled
- ESM: `"type": "module"` in all packages
- Styling: use `cn()` from `@nop-chaos/ui`, `data-slot` markers, no BEM
- Components: always use `@nop-chaos/ui` components, never raw HTML

---

## RendererComponentProps — Every renderer receives this

```ts
interface RendererComponentProps<S = BaseSchema, P = RendererResolvedProps<S>> {
  id: string;
  path: SchemaPath; // dot-separated: "form.fields[0]"
  schema: S; // raw schema node
  templateNode: TemplateNode<S>; // compiled template node
  node: NodeInstance<S>; // runtime instance
  props: Readonly<P>; // RESOLVED schema-driven values
  meta: ResolvedNodeMeta; // RESOLVED meta state
  regions: Readonly<Record<string, RenderRegionHandle>>; // precompiled child regions
  events: Readonly<Record<string, RendererEventHandler>>; // event handlers from schema
  helpers: RendererHelpers; // render, evaluate, dispatch, createScope
}
```

### How to read data from props

| Source          | What it provides                                       | When to use                               |
| --------------- | ------------------------------------------------------ | ----------------------------------------- |
| `props.props`   | Resolved runtime values (label, variant, placeholder…) | Reading schema-driven values              |
| `props.meta`    | Resolved meta (disabled, visible, className, testid)   | Checking control state                    |
| `props.regions` | Precompiled child render handles                       | Rendering child fragments via `.render()` |
| `props.events`  | Runtime event handlers from schema                     | Attaching click/change/submit handlers    |
| `props.helpers` | Stable runtime helpers                                 | render, evaluate, dispatch                |

### Field lifecycle: schema type → field rule → runtime channel

The table above shows **runtime consumption** channels. It does NOT mean these are different _kinds_ of fields. Every runtime channel originates from the **same author-facing schema**. A single schema field flows through three layers:

```
Layer 1 — Schema type (author contract)
  The TypeScript interface declares ALL fields the author can write,
  including props, regions, and events.

  interface MySchema extends BaseSchema {
    type: 'my-widget';
    title?: string;          // will become a prop
    body?: SchemaInput;      // will become a region
    onClose?: ActionSchema;  // will become an event
  }

  Author writes in JSON:
  { "type": "my-widget", "title": "Hello", "body": [...], "onClose": {...} }

    ↓

Layer 2 — Renderer definition field rules (compiler directive)
  The `fields` array tells the compiler HOW to process each declared field:
  which channel it goes into (prop / region / event / meta / value-or-region).

  fields: [
    { key: 'title',   kind: 'prop' },
    { key: 'body',    kind: 'region' },
    { key: 'onClose', kind: 'event' },
  ]

  The compiler reads the field rule, then pre-compiles the raw schema
  value into the appropriate compiled form (resolved value, TemplateRegion,
  compiled action program, etc.).

    ↓

Layer 3 — Runtime channels (renderer consumption)
  The compiled results appear on RendererComponentProps as separate channels:

  props.props.title     → resolved string "Hello"
  props.regions.body    → RenderRegionHandle (call .render() to get JSX)
  props.events.onClose  → RendererEventHandler (call to dispatch action)
```

**Key rule**: the schema type (Layer 1) must declare **every** author-facing field, including those that will become regions or events. The field rule (Layer 2) tells the compiler what to _do_ with the field — it does not replace the type declaration. Omitting `body` from the schema type while declaring `{ key: 'body', kind: 'region' }` in the renderer definition is an error: the author still needs to write `"body": [...]` in JSON, and the type must reflect that.

For the full field-to-channel mapping, see `docs/architecture/field-binding-and-renderer-contract.md` Frozen Contract Matrix.

---

## RendererHelpers

```ts
interface RendererHelpers {
  render(input: RenderNodeInput, options?: RenderFragmentOptions): RendererRenderOutput;
  evaluate<T>(target: unknown, scope?: ScopeRef): T;
  evaluateCompiled<T>(target: CompiledRuntimeValue<T>, scope?: ScopeRef): T;
  createScope(patch?: object, options?: CreateScopeOptions): ScopeRef;
  disposeScope(scopeId: string): void;
  dispatch(
    action: ActionSchema | ActionSchema[],
    ctx?: Partial<ActionContext>,
  ): Promise<ActionResult>;
  executeSource(source: SourceSchema, options?: { scope?: ScopeRef }): Promise<ActionResult>;
}
```

---

## RendererResolvedProps

```ts
type RendererResolvedProps<S extends BaseSchema = BaseSchema> = {
  [key: string]: unknown;
} & Partial<
  Omit<
    S,
    | 'when'
    | 'visible'
    | 'hidden'
    | 'disabled'
    | 'className'
    | 'frameClassName'
    | 'testid'
    | 'readOnly'
    | 'required'
  >
> & {
    type?: S['type'];
    id?: string;
    className?: string;
    frameClassName?: string;
    disabled?: boolean;
    testid?: string;
    cid?: number;
    readOnly?: boolean;
    required?: boolean;
  };
```

---

## RendererDefinition — Register a renderer

```ts
interface RendererDefinition<S extends BaseSchema = BaseSchema, P = RendererResolvedProps<S>> {
  type: S['type'];
  component?: (props: RendererComponentProps<S, P>) => RendererRenderOutput;
  validation?: ValidationContributor<S>;
  validationDefaults?: RendererValidationDefaults;
  deepFields?: readonly RendererDeepFieldDefinition[];
  compilation?: RendererCompilationDefinition;
}
```

Register: `registry.register({ type: 'my-type', component: MyRenderer })`

---

## RendererRuntime — Central orchestrator

Key methods (full definition in `packages/flux-core/src/types/renderer-core.ts`):

```ts
interface RendererRuntime {
  runtimeId: string;
  registry: RendererRegistry;
  env: RendererEnv;
  expressionCompiler: ExpressionCompiler;
  schemaCompiler: SchemaCompiler;
  plugins: readonly RendererPlugin[];
  importStack: ImportStack;
  strictMode: boolean;
  moduleCache: ModuleCache;

  compile(schema: SchemaInput): CompiledTemplate;
  evaluate<T>(target: unknown, scope: ScopeRef): T;
  evaluateCompiled<T>(target: CompiledRuntimeValue<T>, scope: ScopeRef): T;

  createChildScope(parent: ScopeRef, patch?: object, options?: CreateScopeOptions): ScopeRef;
  disposeScope(scopeId: string): void;

  dispatch(action: ActionSchema | ActionSchema[], ctx: ActionContext): Promise<ActionResult>;
  executeSource(input: {
    source: SourceSchema;
    scope: ScopeRef;
    ctx?: Partial<ActionContext>;
  }): Promise<ActionResult>;

  createFormRuntime(input: {
    id?;
    name?;
    initialValues?;
    parentScope;
    page?;
    validation?;
    lifecycle?;
    statusPath?;
    valuesPath?;
  }): FormRuntime;
  createValidationScopeRuntime(input: {
    id?;
    parentScope;
    scopePath?;
    validation?;
    initialValues?;
  }): ValidationScopeRuntime;
  createSurfaceRuntime(input?): SurfaceRuntime;
  createPageRuntime(data?): PageRuntime;
  createDataSourceController(input: {
    action;
    scope;
    targetPath?;
    interval?;
    stopWhen?;
    silent?;
    initialData?;
  }): DataSourceController;
  createActionScope(input?): ActionScope;

  resolveNodeMeta(node: TemplateNode, scope: ScopeRef, state?): ResolvedNodeMeta;
  resolveNodeProps(node: TemplateNode, scope: ScopeRef, state?): ResolvedNodeProps;
  resolveTarget(target: ComponentTarget, ctx): NodeInstance | undefined;

  registerDataSource(input: { id; scope; compiledSource }): DataSourceRegistration;
  refreshDataSource(input: { name; scope? }): Promise<boolean>;
  registerReaction(input: { id; scope; compiledReaction; dispatch }): { id; dispose() };

  dispose(): void;
}
```

---

## FormRuntime — Form runtime (extends ValidationScopeRuntime)

```ts
interface FormRuntime extends ValidationScopeRuntime {
  id: string;
  name?: string;
  store: FormStoreApi;
  scope: ScopeRef;
  validation?: CompiledFormValidationModel;
  readonly canSubmit: boolean;
  readonly allTouched: boolean;

  validateField(path: string, reason?: ValidationReason): Promise<ValidationResult>;
  validateForm(reason?: ValidationReason): Promise<FormValidationResult>;
  getError(path: string): ValidationError[] | undefined;
  isValidating(path: string): boolean;
  isTouched / isDirty / isVisited(path: string): boolean;
  touchField / visitField(path: string): void;
  clearErrors(path?: string): void;

  submit(options?: { interactionId?: string; signal?: AbortSignal }): Promise<ActionResult>;
  reset(values?: object): void;
  setValue(name: string, value: unknown): void;
  setValues(values: Record<string, unknown>): void;

  appendValue(path: string, value: unknown): void;
  prependValue(path: string, value: unknown): void;
  insertValue(path: string, index: number, value: unknown): void;
  removeValue(path: string, index: number): void;
  moveValue(path: string, from: number, to: number): void;
  swapValue(path: string, a: number, b: number): void;
  replaceValue(path: string, value: unknown): void;

  getField(path: string): CompiledFormValidationField | undefined;
  getDependents(path: string): string[];
  findByPrefix(prefix: string): string[];
  getChildren(path: string): string[];
  setLifecycleHandlers(handlers?: FormLifecycleHandlers): void;
}
```

---

## ValidationScopeRuntime — Base validation owner

```ts
interface ValidationScopeRuntime {
  readonly scopeId: string;
  readonly rootPath: string;
  readonly lifecycleState: ValidationOwnerLifecycleState;
  readonly modelGeneration: number;
  readonly store?: ValidationStoreApi;
  readonly scope?: ScopeRef;
  readonly validation?: CompiledFormValidationModel;

  validateAt(
    path: string,
    reason?: ValidationReason,
    options?: { signal? },
  ): Promise<ValidationResult>;
  validateSubtree(path: string, reason?: ValidationReason): Promise<FormValidationResult>;
  validateAll(reason?: ValidationReason): Promise<FormValidationResult>;
  applyChangesAndRevalidate(input: ApplyScopeChangesInput): Promise<FormValidationResult>;
  applyExternalErrors(input: ApplyExternalErrorsInput): ScopeValidationStateSnapshot;

  getFieldState(path: string): { ownerId; path; errors; validating };
  getScopeState(): ScopeValidationStateSnapshot;
  isPathOwned(path: string): boolean;

  registerField(registration: RuntimeFieldRegistration): FieldRegistrationHandle;
  updateFieldRegistration(id: string, patch): void;
  notifyFieldHidden(path: string, hidden: boolean): void;
  refreshCompiledModel(newModel: CompiledFormValidationModel | undefined): void;
  dispose(): void;
}
```

---

## Store State Types

```ts
interface FormStoreState {
  values: Record<string, any>;
  fieldStates: Record<string, FieldState>;
  submitting: boolean;
  submitAttempted: boolean;
}

interface FieldState {
  touched?: true;
  dirty?: true;
  visited?: true;
  validating?: true;
  errors?: ValidationError[];
}

interface FormFieldPresentationSnapshot extends FormFieldStateSnapshot {
  effectiveDisabled: boolean;
  effectiveRequired: boolean;
  showError: boolean;
  interactive: boolean;
  readOnly: boolean;
}

interface FormStatusSummary {
  submitting: boolean;
  validating: boolean;
  dirty: boolean;
  touched: boolean;
  valid: boolean;
  invalid: boolean;
  hasErrors: boolean;
  errorCount: number;
}

interface DataSourceStatusSummary {
  started: boolean;
  loading: boolean;
  ready: boolean;
  stale: boolean;
  hasData: boolean;
  hasError: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  inFlightCount: number;
  error?: { message: string };
}

interface SurfaceStatusSummary {
  id: string;
  kind: 'dialog' | 'drawer' | 'sheet';
  open: boolean;
  active: boolean;
  opening: boolean;
  closing: boolean;
}
```

---

## SurfaceRuntime / PageRuntime

```ts
interface SurfaceRuntime {
  store: SurfaceStoreApi;
  open(input: {
    kind: 'dialog' | 'drawer' | 'sheet';
    surface;
    scope;
    surfaceId?;
    options?;
  }): string;
  close(surfaceId?: string): void;
  closeTop(): void;
  upsert(entry: SurfaceEntry): void;
  publishStatus(surfaceId?: string): void;
  publishClosed(input: { surfaceId; kind; scope; statusPath? }): void;
  dispose(): void;
}

interface PageRuntime {
  store: PageStoreApi;
  scope: ScopeRef;
  validationOwner?: ValidationScopeRuntime;
  refresh(): void;
  modalContainer?: string;
}
```

---

## React Hooks — @nop-chaos/flux-react

### Core hooks

| Hook                                               | Returns                                | Purpose                                   |
| -------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| `useRendererRuntime()`                             | `RendererRuntime`                      | Get runtime instance                      |
| `useRenderScope()`                                 | `ScopeRef`                             | Get current scope ref                     |
| `useRendererEnv()`                                 | `RendererEnv`                          | Get renderer environment                  |
| `useScopeSelector<T,S>(selector, eqFn?, options?)` | `T`                                    | Reactive selector over scope data         |
| `useOwnScopeSelector<T,S>(selector, eqFn?)`        | `T`                                    | Selector over own scope (excludes parent) |
| `useDataSourceStatus(path, options?)`              | `DataSourceStatusSummary \| undefined` | Reactive data source status               |
| `useActionDispatcher()`                            | `Runtime['dispatch']`                  | Get dispatch function                     |

`useScopeSelector` options: `{ enabled?: boolean; fallback?: T; paths?: readonly string[] }`

### Form hooks

| Hook                                   | Returns                               | Purpose                                        |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `useCurrentForm()`                     | `FormRuntime \| undefined`            | Get current form                               |
| `useCurrentValidationScope()`          | `ValidationScopeRuntime \| undefined` | Get validation scope                           |
| `useCurrentFormState(selector)`        | `T`                                   | Reactive selector over form store state        |
| `useCurrentValidationValues(selector)` | `T`                                   | Reactive selector over validation scope values |
| `useCurrentFormErrors()`               | `ValidationError[]`                   | All current form errors                        |
| `useCurrentFormError(path)`            | `ValidationError[] \| undefined`      | Error for specific path                        |
| `useCurrentFormFieldState(path)`       | `FormFieldPresentationSnapshot`       | Field state + presentation                     |
| `useFieldError(path)`                  | `ValidationError[] \| undefined`      | Error for a field                              |
| `useOwnedFieldState(path)`             | field state                           | Owned field state                              |
| `useChildFieldState(path)`             | field state                           | Child field state                              |
| `useAggregateError(path)`              | aggregated error                      | Aggregated error for a path                    |
| `useValidationNodeState(node)`         | validation state                      | Validation state for a node                    |
| `useCurrentFormModelGeneration()`      | `number`                              | Reactive model generation counter              |

### Context hooks

| Hook                            | Returns                    | Purpose                          |
| ------------------------------- | -------------------------- | -------------------------------- |
| `useCurrentPage()`              | `PageRuntime \| undefined` | Get current page                 |
| `useCurrentSurfaceRuntime()`    | `SurfaceRuntime`           | Get surface runtime              |
| `useCurrentNodeMeta()`          | `ResolvedNodeMeta`         | Get current node metadata        |
| `useCurrentNodeInstance()`      | `NodeInstance`             | Get current node instance        |
| `useCurrentActionScope()`       | `ActionScope`              | Get action scope                 |
| `useCurrentComponentRegistry()` | `ComponentHandleRegistry`  | Get component handle registry    |
| `useCurrentImportFrame()`       | `ImportFrame`              | Get current import frame         |
| `useRenderInstancePath()`       | `string`                   | Get current render instance path |
| `useFormLayout()`               | `FormLayoutContextValue`   | Get form layout context          |
| `useStrictMode()`               | `boolean`                  | Whether strict mode enabled      |

### Utility hooks

| Hook                       | Returns                          | Purpose                                |
| -------------------------- | -------------------------------- | -------------------------------------- |
| `useSchemaProps<S>(props)` | `RendererResolvedProps<S>`       | Type-safe props bridge (`props.props`) |
| `useRenderFragment()`      | `(input, options?) => ReactNode` | Render ad-hoc fragments                |

---

## Typical Renderer Component Pattern

```tsx
import type { RendererComponentProps, BaseSchema } from '@nop-chaos/flux-core';
import { useRendererRuntime, useRenderScope, useScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';

interface MySchema extends BaseSchema {
  type: 'my-renderer';
  label?: string;
  variant?: 'default' | 'primary';
}

export function MyRenderer(props: RendererComponentProps<MySchema>) {
  const { props: resolved, meta, regions, events, helpers } = props;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();

  const label = resolved.label;
  const variant = resolved.variant ?? 'default';

  if (!meta.visible) return null;

  const body = regions.body?.render();
  const onClick = events.onClick;

  return (
    <div data-testid={meta.testid} className={cn('my-renderer', meta.className)}>
      {body}
    </div>
  );
}
```

---

## ScopeRef — Key methods

```ts
interface ScopeRef {
  readonly id: string;
  readonly path: string;
  store?: ScopeStore;
  readVisible(): Record<string, unknown>;
  readOwn(): Record<string, unknown>;
  update(patch: object): void;
  merge(data: Record<string, any>): void;
  replace(data: Record<string, any>): void;
  dispose(): void;
}
```

---

## ScopeStore

```ts
createScopeStore(initialData: Record<string, any>): ScopeStore
createScopeRef(input: { id; path; initialData?; parent?; store?; isolate?; update?; onDispose? }): ScopeRef
```

---

## Action Types Quick Reference

| Action type        | Schema interface            | Key args                  |
| ------------------ | --------------------------- | ------------------------- |
| `ajax`             | `AjaxActionSchema`          | api, adaptor              |
| `submit`           | `SubmitFormActionSchema`    | formId, validate          |
| `openDialog`       | `OpenDialogActionSchema`    | title, body               |
| `openDrawer`       | `OpenDrawerActionSchema`    | title, body               |
| `closeDialog`      | `CloseDialogActionSchema`   | surfaceId                 |
| `closeDrawer`      | `CloseDrawerActionSchema`   | surfaceId                 |
| `closeSurface`     | `CloseSurfaceActionSchema`  | surfaceId                 |
| `refreshTable`     | `RefreshTableActionSchema`  | target                    |
| `refreshSource`    | `RefreshSourceActionSchema` | sourceName                |
| `setValue`         | `SetValueActionSchema`      | path, value               |
| `setValues`        | `SetValuesActionSchema`     | path, values              |
| `showToast`        | `ShowToastActionSchema`     | level, message            |
| `navigate`         | `NavigateActionSchema`      | url, replace, back        |
| `component:method` | `ComponentActionSchema`     | \_targetCid, method, args |
| `ns:method`        | `NamespacedActionSchema`    | namespace, method, args   |

---

## Data Source Schemas

```ts
type DataSourceSchema = FormulaDataSourceSchema | ActionDataSourceSchema;

interface FormulaDataSourceSchema {
  type: 'formula';
  formula: string;
  mergeToScope?: boolean;
  resultMapping?: string;
}

interface ActionDataSourceSchema {
  type: 'action';
  action: ActionSchema;
  interval?: number;
  stopWhen?: string;
  mergeToScope?: boolean;
  resultMapping?: string;
}
```

---

## Compilation Types Summary

```ts
interface CompiledTemplate {
  nodes: TemplateNode[];
}

interface CompiledRuntimeValue<T> { /* evaluated by expressionCompiler */ }
interface CompiledExpression { /* compiled formula */ }
interface CompiledStringTemplate { /* compiled template with interpolation */ }
interface CompiledDataSource { /* fully compiled data source */ }
interface CompiledReaction { watch; when; action; debounce; etc. */ }
interface CompiledActionProgram { nodes: CompiledActionNode[]; isFullyStatic: boolean; }
```
