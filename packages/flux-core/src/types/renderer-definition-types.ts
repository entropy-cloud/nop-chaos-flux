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

export type RendererClass =
  | 'instance-renderer'
  | 'flux-owner-renderer'
  | 'domain-host-renderer';

/**
 * @deprecated Transitional alias for `RendererClass` (RM-1, plan 603).
 * Migrate imports to `RendererClass`; removal tracked by the renderer
 * metamodel roadmap follow-up.
 */
export type RendererRendererClass = RendererClass;

export interface RendererPropContract {
  shape: FluxValueShape;
  displayName: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
  required?: boolean;
}

/**
 * Field-entry contract carrier (RM-3, plan 605): a `fields` entry may carry
 * its value shape + tooling metadata inline via `contract`, so a prop no
 * longer needs a second declaration in `propContracts`. `shape` is required,
 * matching `RendererPropContract`. `required` carries the same dual
 * semantics as `propContracts.required`: a compile-time missing-property
 * diagnostic plus the tooling surface (distinct from `SchemaFieldRule.required`,
 * which is nested-validation semantics). `payload` is reserved for the RM-5
 * event-contract convergence (`resolveRendererEventContracts` consumes
 * `payload` since RM-5/plan 607). The contract never
 * materializes into `TemplateNode` — it is read through
 * `resolveRendererPropContracts` at authoring/validation time.
 */
export interface RendererFieldContract {
  shape: FluxValueShape;
  displayName?: string;
  description?: string;
  editorType?: string;
  defaultValue?: unknown;
  required?: boolean;
  payload?: FluxValueShape;
}

/**
 * Event-entry contract carrier (RM-5, plan 607): a `fields` entry with
 * `kind: 'event'` may carry its authoring metadata inline via `contract` —
 * the single-source replacement for the removed
 * `RendererDefinitionShape.eventContracts` record. Read through
 * `resolveRendererEventContracts`; never materialized into `TemplateNode`.
 * Unlike `RendererFieldContract` (prop entries) it carries no `shape` member:
 * the payload shape lives in `payload`.
 */
export interface RendererEventFieldContract {
  displayName?: string;
  description?: string;
  payload?: FluxValueShape;
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
  rendererClass?: RendererClass;
  rendererTraits?: readonly string[];
  componentCapabilityContracts?: readonly RendererCapabilityContract[];
  injectedLocals?: Readonly<Record<string, Omit<SymbolInfo, 'name'> & { shape?: FluxValueShape }>>;
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
  /**
   * Default `frameWrap` for this renderer type when the schema does not
   * declare one. Group-choice renderers (radio-group / checkbox-group) declare
   * `'group'` so their multi-option control area is wrapped in fieldset/legend
   * instead of a `<label>` — a label wrapper forwards gap-area clicks to the
   * first option control and silently selects it (plan 460 B3).
   */
  frameWrap?: 'label' | 'group' | 'none';
  staticCapable?: boolean;
  hostContract?: RendererHostContract;
}