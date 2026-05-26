import type { ActionContext, ActionScope } from './actions.js';
import type { FormulaCompiler, ImportFrame, ModuleCache } from './compilation.js';
import type { InstanceFrame, NodeInstance } from './node-identity.js';
import type {
  RenderNodeMeta,
} from './render-fragment-types.js';
import type { ComponentHandleRegistry } from './renderer-component.js';
import type { RendererEnv } from './renderer-api.js';
import type {
  RendererHelpers,
  RendererRegistry,
  RendererRenderOutput,
  RendererRuntime,
} from './renderer-core.js';
import type { RendererPlugin } from './renderer-plugin.js';
import type {
  DataSourceStatusSummary,
  FormErrorQuery,
  FormFieldStateSnapshot,
  FormRuntime,
  FormStoreState,
  PageRuntime,
  PageStoreApi,
  SurfaceRuntime,
  ValidationScopeRuntime,
} from './runtime.js';
import type { SchemaInput } from './schema.js';
import type { ScopeRef } from './scope.js';
import type { ValidationError } from './validation.js';

export interface StructuralLoopBindings {
  itemName: string;
  indexName: string;
  keyName?: string;
}

export interface StructuralLoopRenderContext {
  bindings: StructuralLoopBindings;
  itemData?: Record<string, unknown>;
  keyBy?: unknown;
  instancePath?: readonly InstanceFrame[];
  depth: number;
  evaluateItemData?: (
    item: unknown,
    index: number,
    itemKey: string,
  ) => Record<string, unknown> | undefined;
  renderBody(
    slotBindings: Record<string, unknown>,
    instancePath: readonly InstanceFrame[],
  ): RendererRenderOutput;
}

export type {
  RenderFragmentOptions,
  RenderNodeInput,
  RenderNodeMeta,
  RenderRegionHandle,
} from './render-fragment-types.js';

/**
 * The reserved $slot frame published into child scopes for parameterized regions.
 *
 * Reserved fields (must not be used as param names in SchemaFieldRule.params):
 * - $parent: access to the outer slot frame (for nested slot ancestry)
 * - $name: reserved for future use
 * - $key: reserved for future use
 * - $depth: reserved for future use
 *
 * Author-facing expression access:
 * - $slot.xxx     — current slot param
 * - $slot.$parent.xxx  — outer slot param (for nested slots)
 */
export interface SlotFrame {
  [param: string]: unknown;
  $parent?: SlotFrame;
}

export interface RendererHookApi {
  useRendererRuntime(): RendererRuntime;
  useRenderScope(): ScopeRef;
  useRenderInstancePath(): readonly InstanceFrame[] | undefined;
  useCurrentActionScope(): ActionScope | undefined;
  useCurrentComponentRegistry(): ComponentHandleRegistry | undefined;
  useCurrentImportFrame(): ImportFrame | undefined;
  useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn?: (a: T, b: T) => boolean,
    options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
  ): T;
  useOwnScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn?: (a: T, b: T) => boolean,
  ): T;
  useRendererEnv(): RendererEnv;
  useActionDispatcher(): RendererRuntime['dispatch'];
  useCurrentForm(): FormRuntime | undefined;
  useCurrentValidationScope(): ValidationScopeRuntime | undefined;
  useCurrentFormErrors(query?: FormErrorQuery): ValidationError[];
  useCurrentFormError(query: FormErrorQuery): ValidationError | undefined;
  useCurrentFormFieldState(path: string, query?: FormErrorQuery): FormFieldStateSnapshot;
  useValidationNodeState(path: string): FormFieldStateSnapshot;
  useFieldError(path: string): ValidationError | undefined;
  useDataSourceStatus(
    path: string,
    options?: { enabled?: boolean },
  ): DataSourceStatusSummary | undefined;
  useOwnedFieldState(path: string): FormFieldStateSnapshot;
  useChildFieldState(path: string): FormFieldStateSnapshot;
  useAggregateError(path: string, options?: { enabled?: boolean }): ValidationError | undefined;
  useCurrentPage(): PageRuntime | undefined;
  useCurrentFormState<T>(
    selector: (state: FormStoreState) => T,
    equalityFn?: (a: T, b: T) => boolean,
    options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
  ): T;
  useCurrentFormModelGeneration(): number;
  useFormLayout(): { mode?: 'normal' | 'horizontal'; labelAlign?: 'top' | 'left' | 'right'; labelWidth?: string | number };
  useStrictMode(): boolean;
  useCurrentSurfaceRuntime(): SurfaceRuntime | undefined;
  useCurrentNodeMeta(): RenderNodeMeta;
  useCurrentNodeInstance(): NodeInstance | undefined;
  useStructuralLoopContext(): StructuralLoopRenderContext | undefined;
  useRenderFragment(): RendererHelpers['render'];
}

export interface SchemaRendererProps {
  schema: SchemaInput;
  schemaUrl: string;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  surfaceRuntime?: SurfaceRuntime;
  moduleCache?: ModuleCache;
  parentScope?: ScopeRef;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  strictValidation?: boolean;
  onRuntimeChange?: (runtime: RendererRuntime | null) => void;
  onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
