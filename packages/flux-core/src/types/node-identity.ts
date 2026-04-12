import type { CompiledRuntimeValue, RuntimeValueState } from './compilation';
import type { BaseSchema, SchemaPath } from './schema';
import type { ScopeDependencySet, ScopeRef } from './scope';
import type { CompiledSchemaMeta } from './renderer-compiler';

export type TemplateNodeId = number;
export type RepeatedTemplateId = string;
export type RuntimeId = string;
export type InstanceKey = string;

export interface InstanceFrame {
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
}

export interface TemplateRegion {
  key: string;
  path: SchemaPath;
  node: TemplateNode | readonly TemplateNode[] | null;
  /**
   * Declared parameter names for parameterized regions (see CompiledRegion.params).
   * Preserved from CompiledRegion into the template artifact so the runtime can
   * publish a reserved $slot frame during instantiation.
   */
  params?: readonly string[];
  /**
   * When true, the child scope created for this parameterized region is
   * isolated from parent lexical scope.
   */
  isolate?: boolean;
}

export type ScopePlan =
  | { kind: 'inherit' }
  | { kind: 'child'; bindings?: Readonly<Record<string, CompiledRuntimeValue<unknown>>> }
  | { kind: 'form' }
  | { kind: 'dialog' }
  | {
      kind: 'repeated-item';
      item?: string;
      index?: string;
      key?: string;
      record?: string;
    };

export type RegistryPlan = Readonly<Record<string, unknown>>;
export type ValidationPlan = import('./validation').CompiledFormValidationModel;
export type RuntimeProgramState<T = unknown> = RuntimeValueState<T>;

export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  templateNodeId: TemplateNodeId;
  id: string;
  type: S['type'];
  schema: S;
  templatePath: SchemaPath;
  rendererType: string;
  component: import('./renderer-core').RendererDefinition<S>;
  propsProgram: CompiledRuntimeValue<Record<string, unknown>>;
  metaProgram: CompiledSchemaMeta;
  eventPlans: Readonly<Record<string, unknown>>;
  lifecycleActions?: Readonly<{
    onMount?: unknown;
    onUnmount?: unknown;
  }>;
  regions: Readonly<Record<string, TemplateRegion>>;
  scopePlan: ScopePlan;
  registryPlan?: RegistryPlan;
  validationPlan?: ValidationPlan;
  sourcePropKeys: readonly string[];
  sourceStatePropKeys: Readonly<Record<string, string>>;
}

export interface RepeatedTemplate {
  repeatedTemplateId: RepeatedTemplateId;
  root: TemplateNode | readonly TemplateNode[];
  itemBindings: {
    item?: string;
    index?: string;
    key?: string;
    record?: string;
  };
}

export interface CompiledTemplate {
  root: TemplateNode | readonly TemplateNode[];
  repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>;
}

export interface NodeState {
  metaState: Record<string, RuntimeProgramState<unknown>>;
  propsState?: RuntimeProgramState<Record<string, unknown>>;
  metaDependencies?: ScopeDependencySet;
  propsDependencies?: ScopeDependencySet;
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
  mounted: boolean;
}

export interface NodeInstance<S extends BaseSchema = BaseSchema> {
  cid: number;
  instancePath?: readonly InstanceFrame[];
  templateNode: TemplateNode<S>;
  scope: ScopeRef;
  state: NodeState;
}

export interface ResolutionContext {
  runtimeId: RuntimeId;
  instancePath?: readonly InstanceFrame[];
}

export interface ScopeSnapshot {
  id?: string;
  path?: string;
  label?: string;
  data: Record<string, unknown>;
}

export interface NodeInspectPayload {
  cid: number;
  instancePath?: readonly InstanceFrame[];
  state?: NodeState;
  scopeChain?: readonly ScopeSnapshot[];
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
}

export type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; cid?: number }
  | { kind: 'notFound' };

export interface NodeRefRegistry {
  resolveCid(cid: number): NodeInstance | undefined;
  inspectCid(cid: number): InspectResult;
}

export function normalizeInstancePath(instancePath?: readonly InstanceFrame[] | null): readonly InstanceFrame[] | undefined {
  if (!instancePath || instancePath.length === 0) {
    return undefined;
  }

  return instancePath;
}
