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
  SchemaCompileDiagnosticsOptions,
} from './schema-diagnostics-types.js';
import type { SchemaCompileValidationOptions } from './schema-validation-types.js';
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

export interface RendererDeepFieldRegionRule {
  key: string;
  regionKeySuffix: string;
  compiledKey: string;
  params?: readonly string[];
  isolate?: boolean;
}

export interface RendererDeepFieldNormalizeInput {
  value: unknown;
  path: string;
  regions: Record<string, import('./node-identity.js').TemplateRegion>;
  compileSchema: (
    input: import('./schema.js').SchemaInput,
    options?: {
      basePath?: string;
      parentPath?: string;
      schemaUrl?: string;
      signal?: AbortSignal;
      parentScopePolicy?: import('./schema.js').ScopePolicy;
      cidState?: import('../compiled-cid.js').CompiledCidState;
      symbolTable?: import('./compilation.js').CompileSymbolTable;
      preparedImports?: ReadonlyMap<string, import('./compilation.js').PreparedImportSpec>;
      importLoader?: import('./actions.js').ImportedLibraryLoader;
      resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
      diagnostics?: SchemaCompileDiagnosticsOptions;
      validation?: SchemaCompileValidationOptions;
    },
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => import('./node-identity.js').TemplateNode | import('./node-identity.js').TemplateNode[];
}

export interface RendererDeepFieldDefinition {
  key: string;
  nestedRegions?: readonly RendererDeepFieldRegionRule[];
  booleanKeys?: readonly string[];
  normalize?: (input: RendererDeepFieldNormalizeInput) => unknown;
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
  deepFields?: readonly RendererDeepFieldDefinition[];
  compilation?: RendererCompilationDefinition;
  wrap?: boolean;
  frameRootTag?: 'div' | 'label';
  staticCapable?: boolean;
  hostContract?: RendererHostContract;
}
