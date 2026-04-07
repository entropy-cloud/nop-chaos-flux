import type { CompiledRuntimeValue, RuntimeValueState } from './compilation';
import type { BaseSchema, SchemaPath } from './schema';
import type { ScopeDependencySet, ScopeRef } from './scope';
import type { ComponentHandle } from './renderer-component';

export type TemplateGraphId = string;
export type TemplateNodeId = number;
export type RepeatedTemplateId = string;
export type RuntimeId = string;
export type InstanceKey = string;

export interface InstanceFrame {
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
}

export interface NodeLocator {
  runtimeId: RuntimeId;
  templateGraphId: TemplateGraphId;
  templateNodeId: TemplateNodeId;
  instancePath?: readonly InstanceFrame[];
}

export interface TemplateRegion {
  key: string;
  path: SchemaPath;
  node: TemplateNode | readonly TemplateNode[] | null;
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
export type ValidationPlan = Readonly<Record<string, unknown>>;
export type RuntimeProgramState<T = unknown> = RuntimeValueState<T>;

export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  templateNodeId: TemplateNodeId;
  id: string;
  type: S['type'];
  schema: S;
  templatePath: SchemaPath;
  rendererType: string;
  propsProgram: CompiledRuntimeValue<Record<string, unknown>>;
  metaProgram: CompiledRuntimeValue<Record<string, unknown>>;
  eventPlans: Readonly<Record<string, unknown>>;
  regions: Readonly<Record<string, TemplateRegion>>;
  scopePlan: ScopePlan;
  registryPlan?: RegistryPlan;
  validationPlan?: ValidationPlan;
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
  templateGraphId: TemplateGraphId;
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
  cid?: number;
  locator: NodeLocator;
  templateNode: TemplateNode<S>;
  scope: ScopeRef;
  state: NodeState;
}

export interface StaticTargetPlan {
  kind: 'static';
  templateGraphId: TemplateGraphId;
  templateNodeId: TemplateNodeId;
}

export interface RepeatedTargetPlan {
  kind: 'repeated';
  templateGraphId: TemplateGraphId;
  templateNodeId: TemplateNodeId;
  repeatedTemplateId: RepeatedTemplateId;
}

export interface RepeatedInstanceSelector {
  templateGraphId: TemplateGraphId;
  repeatedTemplateId: RepeatedTemplateId;
  instanceKey: InstanceKey;
  templateNodeId: TemplateNodeId;
}

export interface ResolutionContext {
  runtimeId: RuntimeId;
  instancePath?: readonly InstanceFrame[];
  instancePathFor?(repeatedTemplateId: RepeatedTemplateId): readonly InstanceFrame[] | undefined;
  instancePathForExplicit?(repeatedTemplateId: RepeatedTemplateId, instanceKey: InstanceKey): readonly InstanceFrame[] | undefined;
}

export type ResolutionResult =
  | { kind: 'resolved'; locator: NodeLocator; handle?: ComponentHandle }
  | { kind: 'notMaterialized'; locator: NodeLocator }
  | { kind: 'notFound' }
  | { kind: 'ambiguous'; matches: readonly NodeLocator[] };

export interface ScopeSnapshot {
  id?: string;
  path?: string;
  label?: string;
  data: Record<string, unknown>;
}

export interface NodeInspectPayload {
  cid?: number;
  locator: NodeLocator;
  state?: NodeState;
  scopeChain?: readonly ScopeSnapshot[];
  resolvedMeta?: unknown;
  resolvedProps?: unknown;
}

export type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; locator?: NodeLocator }
  | { kind: 'notFound' };

export interface RuntimeNodeResolver {
  resolveNode(locator: NodeLocator): ResolutionResult;
}

export interface NodeRefRegistry {
  resolveCid(cid: number): NodeLocator | undefined;
  inspectCid(cid: number): InspectResult;
}

export function normalizeInstancePath(instancePath?: readonly InstanceFrame[] | null): readonly InstanceFrame[] | undefined {
  if (!instancePath || instancePath.length === 0) {
    return undefined;
  }

  return instancePath;
}

export function normalizeNodeLocator(locator: NodeLocator): NodeLocator {
  const instancePath = normalizeInstancePath(locator.instancePath);

  if (instancePath === locator.instancePath) {
    return locator;
  }

  return {
    ...locator,
    instancePath,
  };
}

export function serializeNodeLocator(locator: NodeLocator): string {
  const normalized = normalizeNodeLocator(locator);

  return JSON.stringify([
    normalized.runtimeId,
    normalized.templateGraphId,
    normalized.templateNodeId,
    normalized.instancePath ?? null,
  ]);
}

export function isNodeLocator(value: unknown): value is NodeLocator {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.runtimeId !== 'string' || candidate.runtimeId.length === 0) {
    return false;
  }

  if (typeof candidate.templateGraphId !== 'string' || candidate.templateGraphId.length === 0) {
    return false;
  }

  if (typeof candidate.templateNodeId !== 'number' || !Number.isInteger(candidate.templateNodeId)) {
    return false;
  }

  if (candidate.instancePath === undefined) {
    return true;
  }

  if (!Array.isArray(candidate.instancePath)) {
    return false;
  }

  return candidate.instancePath.every((frame) => {
    if (!frame || typeof frame !== 'object') {
      return false;
    }

    const typedFrame = frame as Record<string, unknown>;
    return typeof typedFrame.repeatedTemplateId === 'string' && typeof typedFrame.instanceKey === 'string';
  });
}
