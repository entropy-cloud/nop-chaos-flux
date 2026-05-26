import type { ActionScope } from './actions.js';
import type { CompiledTemplate } from './node-identity.js';
import type { InstanceFrame, NodeInstance, TemplateNode } from './node-identity.js';
import type { ComponentHandleRegistryCore } from './component-handle-core.js';
import type { SchemaInput, SchemaPath } from './schema.js';
import type { ScopeRef } from './scope.js';

export interface RenderFragmentOptions {
  bindings?: Record<string, unknown>;
  scope?: ScopeRef;
  instancePath?: readonly InstanceFrame[];
  scopeKey?: string;
  isolate?: boolean;
  pathSuffix?: string;
  actionScope?: ActionScope;
  componentRegistry?: ComponentHandleRegistryCore;
  ownerNodeInstance?: NodeInstance;
}

export interface RenderRegionHandle<R = unknown> {
  key: string;
  templateNode: TemplateNode | readonly TemplateNode[] | null;
  params?: readonly string[];
  render(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>;
    instancePath?: readonly InstanceFrame[];
    scopeKey?: string;
    isolate?: boolean;
    pathSuffix?: string;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistryCore;
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

export interface RenderNodeMeta {
  id: string;
  path: SchemaPath;
  type: string;
  cid?: number;
  templateNode: TemplateNode;
  node: NodeInstance;
}
