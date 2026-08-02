import type {
  CapabilityMethodContract,
  FluxValueShape,
  RendererHostContract,
} from '../schema-diagnostics/index.js';
import type { BaseSchema, SchemaFieldRule, ScopePolicy } from './schema.js';
import type { SymbolInfo } from './compilation.js';
import type {
  RendererAuthoringTransformContextLike,
  RendererSchemaValidationContextLike,
} from './schema-diagnostics-types.js';
import type {
  ChildValidationMode,
  ValidationOwnerBoundaryKind,
  ValidationRule,
} from './validation.js';

export type RendererRendererClass =
  | 'instance-renderer'
  | 'flux-owner-renderer'
  | 'domain-host-renderer';

export interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
  required?: boolean;
}

export interface RendererEventContract {
  displayName: string;
  description?: string;
  payload?: FluxValueShape;
}

export interface RendererCapabilityContract extends CapabilityMethodContract {
  handle: string;
  displayName: string;
}

export interface RendererValidationDefaults {
  defaultChildContractMode?: ChildValidationMode;
  collectDescendantValidation?: boolean;
}

export interface RendererCompilationDefinition {
  artifacts?: readonly ('data-source' | 'reaction')[];
}

export interface ValidationCollectContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  renderer: RendererDefinitionShape<S>;
  path: string;
  fieldPathPrefix?: string;
}

export interface ValidationContributor<S extends BaseSchema = BaseSchema> {
  kind: 'field' | 'container' | 'none';
  valueKind?: 'scalar' | 'array' | 'object';
  ownerResolution?: ValidationOwnerBoundaryKind;
  childContractMode?: ChildValidationMode;
  getFieldPath?(schema: S, ctx: ValidationCollectContext<S>): string | undefined;
  collectRules?(schema: S, ctx: ValidationCollectContext<S>): ValidationRule[];
  getChildFieldPathPrefix?(schema: S, ctx: ValidationCollectContext<S>): string | false | undefined;
}

export interface RendererDefinitionShape<S extends BaseSchema = BaseSchema> {
  type: S['type'];
  displayName?: string;
  icon?: string;
  category?: string;
  defaultSchema?: Partial<S>;
  propSchema?: Record<string, unknown>;
  rendererClass?: RendererRendererClass;
  rendererTraits?: readonly string[];
  propContracts?: Readonly<Record<string, RendererPropContract>>;
  eventContracts?: Readonly<Record<string, RendererEventContract>>;
  componentCapabilityContracts?: readonly RendererCapabilityContract[];
  scopeExportContracts?: Readonly<Record<string, FluxValueShape>>;
  injectedLocals?: Readonly<Record<string, Omit<SymbolInfo, 'name'>>>;
  sourcePackage?: string;
  fields?: readonly SchemaFieldRule[];
  authoringTransform?: (context: RendererAuthoringTransformContextLike<S>) => S;
  schemaValidator?: (context: RendererSchemaValidationContextLike<S>) => void;
  scopePolicy?: ScopePolicy;
  actionScopePolicy?: 'inherit' | 'new';
  componentRegistryPolicy?: 'inherit' | 'new';
  validation?: ValidationContributor<S>;
  validationDefaults?: RendererValidationDefaults;
  compilation?: RendererCompilationDefinition;
  wrap?: boolean;
  frameRootTag?: 'div' | 'label';
  staticCapable?: boolean;
  hostContract?: RendererHostContract;
}