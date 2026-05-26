/**
 * Host Capability Projection Manifest Types
 *
 * These types define the static contract layer between Flux schema and complex domain hosts.
 * They are used by the compiler for validation and by runtime for contract publication.
 *
 * See: docs/architecture/capability-projection-manifest.md
 */

/**
 * Structural shape types for manifest field and method declarations.
 * These are compiler/tooling shapes, not author-visible Flux primitives.
 */
export type FluxValueShapeKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'record'
  | 'array'
  | 'union'
  | 'literal'
  | 'unknown';

export interface FluxValueShapeBase {
  kind: FluxValueShapeKind;
  description?: string;
}

export interface FluxStringShape extends FluxValueShapeBase {
  kind: 'string';
}

export interface FluxNumberShape extends FluxValueShapeBase {
  kind: 'number';
}

export interface FluxBooleanShape extends FluxValueShapeBase {
  kind: 'boolean';
}

export interface FluxNullShape extends FluxValueShapeBase {
  kind: 'null';
}

export interface FluxObjectShape extends FluxValueShapeBase {
  kind: 'object';
  fields: Readonly<Record<string, FluxValueShape>>;
  optional?: readonly string[];
  unknownKeys?: 'allow' | 'reject';
}

export interface FluxRecordShape extends FluxValueShapeBase {
  kind: 'record';
  value: FluxValueShape;
}

export interface FluxArrayShape extends FluxValueShapeBase {
  kind: 'array';
  item: FluxValueShape;
}

export interface FluxUnionShape extends FluxValueShapeBase {
  kind: 'union';
  anyOf: readonly FluxValueShape[];
}

export interface FluxLiteralShape extends FluxValueShapeBase {
  kind: 'literal';
  value: string | number | boolean | null;
}

export interface FluxUnknownShape extends FluxValueShapeBase {
  kind: 'unknown';
}

export type FluxValueShape =
  | FluxStringShape
  | FluxNumberShape
  | FluxBooleanShape
  | FluxNullShape
  | FluxObjectShape
  | FluxRecordShape
  | FluxArrayShape
  | FluxUnionShape
  | FluxLiteralShape
  | FluxUnknownShape;

/**
 * Host projection field declaration.
 * Describes a readonly field that schema expressions may read from the host boundary.
 */
export interface HostProjectionField {
  schema: FluxValueShape;
  description?: string;
  deprecated?: boolean;
}

/**
 * Host projection contract.
 * Declares the readonly fields visible to schema expressions inside the host boundary.
 */
export interface HostProjectionContract {
  fields: Readonly<Record<string, HostProjectionField>>;
}

/**
 * Host capability method declaration.
 * Describes a namespaced method that schema may dispatch.
 */
export interface HostCapabilityMethod {
  args?: FluxValueShape;
  result?: FluxValueShape;
  description?: string;
  idempotent?: boolean;
  deprecated?: boolean;
}

/**
 * Shared method contract language used by both host manifests and ordinary renderer metadata.
 *
 * Host manifests keep their own family/version/projection envelope, while ordinary renderers
 * reuse this shape inside renderer-local prop/event/capability metadata.
 */
export interface CapabilityMethodContract {
  args?: FluxValueShape;
  result?: FluxValueShape;
  description?: string;
  deprecated?: boolean;
}

/**
 * Host capability contract.
 * Declares the namespaced methods schema may dispatch.
 */
export interface HostCapabilityContract {
  namespace: string;
  methods: Readonly<Record<string, HostCapabilityMethod>>;
}

/**
 * Host manifest compatibility metadata.
 * Used for versioning and migration guidance.
 */
export interface HostManifestCompatibility {
  minRuntimeVersion?: string;
  deprecatedProjectionPaths?: readonly string[];
  deprecatedMethods?: readonly string[];
  replacedBy?: Readonly<Record<string, string>>;
}

/**
 * Host manifest metadata.
 * Optional documentation and discovery metadata.
 */
export interface HostManifestMetadata {
  title?: string;
  description?: string;
  docsPath?: string;
}

/**
 * Host Capability Projection Manifest.
 * The full static contract published for one host family version.
 */
export interface HostCapabilityProjectionManifest {
  family: string;
  version: string;
  projection: HostProjectionContract;
  capabilities: HostCapabilityContract;
  compatibility?: HostManifestCompatibility;
  metadata?: HostManifestMetadata;
}

/**
 * Input for manifest resolution.
 */
export interface HostManifestResolverInput {
  family: string;
  versionSelector: string;
}

/**
 * Manifest resolution result.
 */
export type HostManifestResolverResult =
  | { kind: 'resolved'; manifest: HostCapabilityProjectionManifest }
  | { kind: 'unknown-family' }
  | { kind: 'unsupported-version'; availableVersions?: readonly string[] };

/**
 * Host manifest resolver contract.
 * Resolves a version selector to a concrete manifest bundle.
 */
export interface HostManifestResolver {
  resolve(input: HostManifestResolverInput): HostManifestResolverResult;
}

/**
 * Capability publication attribution mode.
 *
 * Defines how the publishing owner publishes its host capabilities to descendant fragments.
 *
 * - 'whole-owner': All descendants of the publishing owner node receive the host capability scope.
 *   This is the simplest mode and is appropriate when the host always renders all its regions
 *   with the same capability context.
 *
 * - 'region-scoped': Only specific named regions receive the host capability scope.
 *   The publishing owner explicitly passes `render({ actionScope })` only to selected regions.
 *   Descendants outside those regions do not receive host capabilities.
 *
 * The compiler uses this attribution to decide which subtrees are valid targets for
 * host-family action validation.
 */
export type CapabilityPublicationMode = 'whole-owner' | 'region-scoped';

/**
 * Capability publication attribution model.
 *
 * Describes which parts of a publishing owner's descendant tree receive the host capability scope.
 * This model is used by the compiler to determine where host-family action validation is sound.
 *
 * Rules:
 * - A publishing owner declaring `hostContract` does NOT automatically prove that every descendant
 *   executes inside that host capability scope.
 * - Capability validation is only sound for fragments whose execution path is known to receive
 *   the relevant host `actionScope`.
 * - Compiler-owned action validation needs this attribution model, not only nearest-owner discovery.
 *
 * See: docs/architecture/capability-projection-manifest.md "Capability Publication Attribution"
 */
export interface CapabilityPublicationAttribution {
  /**
   * The publication mode.
   */
  mode: CapabilityPublicationMode;

  /**
   * For 'region-scoped' mode: the region keys that receive the host capability scope.
   * Descendants rendered through these regions can validly dispatch host-family actions.
   * Regions not listed here do not receive the host capability scope.
   *
   * For 'whole-owner' mode: this field should be omitted or empty.
   */
  capableRegions?: readonly string[];

  /**
   * Whether descendants of capable regions inherit the capability scope transitively.
   *
   * When true (default): once a fragment is rendered inside a capable region, all its
   * descendants also have access to the host capabilities.
   *
   * When false: only the immediate children of the capable region have access; deeper
   * descendants must be re-attributed explicitly.
   *
   * Most host families should use true (transitive inheritance) for simplicity.
   */
  transitiveInheritance?: boolean;
}

/**
 * Host contract metadata on a publishing owner renderer definition.
 * Establishes the default host family and version, plus resolution entry.
 */
export interface RendererHostContract {
  family: string;
  defaultVersion: string;
  resolveManifest(versionSelector: string): HostCapabilityProjectionManifest | undefined;

  /**
   * Capability publication attribution.
   *
   * Describes which subtrees receive the host capability scope.
   * Required for compiler-owned host-family action validation to be enabled.
   *
   * If omitted, the compiler will not perform host-family action validation for this host,
   * because it cannot prove which descendants are valid validation targets.
   */
  capabilityPublication?: CapabilityPublicationAttribution;
}

/**
 * Host contract context for standalone fragment validation.
 * Provides an already-resolved manifest when no enclosing publishing owner node is present.
 */
export interface HostContractContext {
  family: string;
  version: string;
  manifest: HostCapabilityProjectionManifest;

  /**
   * Capability publication attribution for standalone validation.
   *
   * When validating a standalone fragment, this tells the compiler whether to treat
   * the fragment as being inside a capable region.
   *
   * If omitted, the compiler assumes the fragment is inside a capable region
   * (most permissive mode for standalone validation).
   */
  capabilityPublication?: CapabilityPublicationAttribution;
}
