import type { ActionContext, ActionScope } from './actions';
import type { FormulaCompiler, ModuleCache } from './compilation';
import type { CompiledTemplate, InstanceFrame, NodeInstance, TemplateNode } from './node-identity';
import type { ComponentHandleRegistry } from './renderer-component';
import type { RendererEnv } from './renderer-api';
import type {
  RendererHelpers,
  RendererRegistry,
  RendererRenderOutput,
  RendererRuntime,
} from './renderer-core';
import type { RendererPlugin } from './renderer-plugin';
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
} from './runtime';
import type { SchemaInput, SchemaPath } from './schema';
import type { ScopeRef } from './scope';
import type { ValidationError } from './validation';

export interface RenderFragmentOptions {
  /**
   * Local bindings to inject into the child scope created for this fragment.
   * For parameterized regions, these values are published under the reserved $slot
   * frame rather than flattened into ordinary top-level scope names.
   */
  bindings?: Record<string, unknown>;
  scope?: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistry;
  ownerNodeInstance?: NodeInstance;
}

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
  renderBody(
    slotBindings: Record<string, unknown>,
    instancePath: readonly InstanceFrame[],
  ): RendererRenderOutput;
}

export interface RenderRegionHandle<R = RendererRenderOutput> {
  key: string;
  templateNode: TemplateNode | readonly TemplateNode[] | null;
  /**
   * Declared parameter names for this region (from renderer metadata).
   * When present, bindings passed to render() will be published under the
   * reserved $slot frame rather than flattened into ordinary scope names.
   * The $slot frame also carries $parent to support nested slot ancestry.
   */
  params?: readonly string[];
  render(options?: {
    scope?: ScopeRef;
    /**
     * Local slot bindings to publish as $slot.xxx in the region subtree.
     * For parameterized regions (params is declared), these are wrapped in
     * a $slot frame: { $slot: { ...bindings, $parent: outerSlotFrame } }.
     * For unparameterized regions, these are merged into the scope directly.
     */
    bindings?: Record<string, unknown>;
    instancePath?: readonly InstanceFrame[];
    scopeKey?: string;
    isolate?: boolean;
    pathSuffix?: string;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    ownerNodeInstance?: NodeInstance;
  }): R;
}

export type RenderNodeInput =
  | SchemaInput
  | TemplateNode
  | readonly TemplateNode[]
  | CompiledTemplate
  | null
  | undefined;

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
  useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn?: (a: T, b: T) => boolean,
    options?: { enabled?: boolean; fallback?: T },
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

export interface RenderNodeMeta {
  id: string;
  path: SchemaPath;
  type: string;
  cid?: number;
  templateNode: TemplateNode;
  node: NodeInstance;
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
