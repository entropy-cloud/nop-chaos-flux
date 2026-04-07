import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import type {
  BaseSchema,
  CompiledCidState,
  CompiledSchemaNode,
  CompiledRegion,
  CompileNodeOptions,
  CompileSchemaOptions,
  ExpressionCompiler,
  RendererDefinition,
  RendererPlugin,
  RendererRegistry,
  SchemaCompiler,
  SchemaInput
} from '@nop-chaos/flux-core';
import {
  attachCompiledCidState,
  buildCompiledValidationOrder,
  createCompiledCidState,
  createNodeId,
  isPlainObject,
  isSchemaInput,
  META_FIELDS,
  normalizeRootPath
} from '@nop-chaos/flux-core';
import { normalizeValidationTriggers, normalizeValidationVisibilityTriggers } from './validation';
import { createCompiledRegion } from './schema-compiler/regions';
import { DEEP_FIELD_NORMALIZERS } from './schema-compiler/tables';
import { classifyField, buildCompiledMeta, isCompiledStatic, createNodeRuntimeState } from './schema-compiler/fields';
import { collectValidationModel } from './schema-compiler/validation-collection';
import {
  appendJsonPointer,
  createSchemaCompilerDiagnosticsContext,
  schemaPathToJsonPointer,
  type SchemaCompilerDiagnosticsContext
} from './schema-compiler/diagnostics';

function applyWrapComponentPlugins(renderer: RendererDefinition, plugins?: RendererPlugin[]): RendererDefinition {
  return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}

function isNamespacedSchemaKey(key: string): boolean {
  const separatorIndex = key.indexOf(':');
  return separatorIndex > 0;
}

function getSchemaNamespace(key: string): string | undefined {
  if (!isNamespacedSchemaKey(key)) {
    return undefined;
  }

  return key.slice(0, key.indexOf(':'));
}

function hasClosedPropModel(renderer: RendererDefinition): boolean {
  return Object.keys(renderer.propSchema ?? {}).length > 0;
}

function getAcceptedSchemaKeys(renderer: RendererDefinition): Set<string> {
  const keys = new Set<string>(['type']);

  for (const key of META_FIELDS) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.defaultSchema ?? {})) {
    keys.add(key);
  }

  for (const key of Object.keys(renderer.propSchema ?? {})) {
    keys.add(key);
  }

  for (const region of renderer.regions ?? []) {
    keys.add(region);
  }

  for (const field of renderer.fields ?? []) {
    keys.add(field.key);
  }

  return keys;
}

function emitSchemaDiagnostic(
  diagnostics: SchemaCompilerDiagnosticsContext,
  issue: {
    code: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['code'];
    message: string;
    path: string;
    severity?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['severity'];
    source?: Parameters<SchemaCompilerDiagnosticsContext['emit']>[0]['source'];
  },
  enabled: boolean
) {
  if (!enabled) {
    return;
  }

  diagnostics.emit(issue);
}

function validateDependsOnRoots(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-source-shape' = 'invalid-property-shape'
) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path,
      message: 'dependsOn must be an array of lexical root strings.'
    }, enabled);
    return;
  }

  value.forEach((entry, index) => {
    const itemPath = appendJsonPointer(path, index);

    if (typeof entry !== 'string' || entry.length === 0) {
      emitSchemaDiagnostic(diagnostics, {
        code,
        path: itemPath,
        message: 'dependsOn entries must be non-empty strings.'
      }, enabled);
      return;
    }

    if (normalizeRootPath(entry) !== entry) {
      emitSchemaDiagnostic(diagnostics, {
        code,
        path: itemPath,
        message: 'dependsOn entries must use lexical root bindings, not deep member paths.'
      }, enabled);
    }
  });
}

function validateApiSchemaShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean,
  code: 'invalid-property-shape' | 'invalid-action-shape' | 'invalid-source-shape'
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path,
      message: 'api must be an object.'
    }, enabled);
    return;
  }

  if (typeof value.url !== 'string' || value.url.length === 0) {
    emitSchemaDiagnostic(diagnostics, {
      code,
      path: appendJsonPointer(path, 'url'),
      message: 'api.url must be a non-empty string.'
    }, enabled);
  }
}

function validateActionShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      validateActionShape(entry, appendJsonPointer(path, index), diagnostics, enabled);
    });
    return;
  }

  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path,
      message: 'Action entries must be objects.'
    }, enabled);
    return;
  }

  if (typeof value.action !== 'string' || value.action.length === 0) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'action'),
      message: 'Action objects require a non-empty action field.'
    }, enabled);
  }

  if (value.args !== undefined && !isPlainObject(value.args)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'args'),
      message: 'Action args must be an object when provided.'
    }, enabled);
  }

  if (value.api !== undefined) {
    validateApiSchemaShape(value.api, appendJsonPointer(path, 'api'), diagnostics, enabled, 'invalid-action-shape');
  }

  if (value.parallel !== undefined && !Array.isArray(value.parallel)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-action-shape',
      path: appendJsonPointer(path, 'parallel'),
      message: 'Action parallel must be an array when provided.'
    }, enabled);
  } else if (Array.isArray(value.parallel)) {
    validateActionShape(value.parallel, appendJsonPointer(path, 'parallel'), diagnostics, enabled);
  }

  if (value.then !== undefined) {
    validateActionShape(value.then, appendJsonPointer(path, 'then'), diagnostics, enabled);
  }

  if (value.onError !== undefined) {
    validateActionShape(value.onError, appendJsonPointer(path, 'onError'), diagnostics, enabled);
  }
}

function validateSourceShape(
  value: unknown,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
) {
  if (!isPlainObject(value)) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path,
      message: 'Source values must be objects.'
    }, enabled);
    return;
  }

  const hasFormula = value.formula !== undefined;
  const hasAction = typeof value.action === 'string' && value.action.length > 0;
  const hasApi = value.api !== undefined;

  if (!hasFormula && !hasAction && !hasApi) {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path,
      message: 'Source values require formula, action, or api.'
    }, enabled);
  }

  if (value.action !== undefined && typeof value.action !== 'string') {
    emitSchemaDiagnostic(diagnostics, {
      code: 'invalid-source-shape',
      path: appendJsonPointer(path, 'action'),
      message: 'Source action must be a string when provided.'
    }, enabled);
  }

  if (hasApi) {
    validateApiSchemaShape(value.api, appendJsonPointer(path, 'api'), diagnostics, enabled, 'invalid-source-shape');
  }

  validateDependsOnRoots(value.dependsOn, appendJsonPointer(path, 'dependsOn'), diagnostics, enabled, 'invalid-source-shape');
}

function findNamespaceValidator(
  diagnostics: SchemaCompilerDiagnosticsContext,
  namespace: string
) {
  return diagnostics.validation.namespaceValidators.find((validator) => validator.namespace === namespace);
}

function inspectSchemaNodeFields(
  schema: BaseSchema,
  renderer: RendererDefinition,
  path: string,
  diagnostics: SchemaCompilerDiagnosticsContext,
  enabled: boolean
): {
  extensions?: Readonly<Record<string, unknown>>;
  skippedPropKeys: ReadonlySet<string>;
} {
  const pointer = schemaPathToJsonPointer(path);
  const acceptedKeys = getAcceptedSchemaKeys(renderer);
  const skippedPropKeys = new Set<string>();
  const extensions: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const keyPath = appendJsonPointer(pointer, key);

    if (isNamespacedSchemaKey(key)) {
      const namespace = getSchemaNamespace(key)!;
      const validator = findNamespaceValidator(diagnostics, namespace);

      skippedPropKeys.add(key);

      if (validator) {
        validator.validate({
          namespace,
          key,
          value,
          path: keyPath,
          add(issue) {
            emitSchemaDiagnostic(diagnostics, {
              code: issue.code,
              message: issue.message,
              path: issue.path ?? keyPath,
              severity: issue.severity,
              source: issue.source ?? 'namespace'
            }, enabled);
          }
        });
      } else if (diagnostics.validation.namespacedPropertyPolicy === 'error') {
        emitSchemaDiagnostic(diagnostics, {
          code: 'invalid-namespace-property',
          path: keyPath,
          message: `Unknown namespaced property "${key}".`,
          source: 'namespace'
        }, enabled);
      }

      if (diagnostics.validation.extensionPassthroughPolicy === 'namespaced-only') {
        extensions[key] = value;
      }

      continue;
    }

    if (key === 'dependsOn') {
      validateDependsOnRoots(value, keyPath, diagnostics, enabled);
      continue;
    }

    const rule = classifyField(renderer, key);

    if (rule.kind === 'event') {
      validateActionShape(value, keyPath, diagnostics, enabled);
      continue;
    }

    const sourceCandidate = value as Record<string, unknown> | undefined;

    if (isPlainObject(sourceCandidate) && sourceCandidate.type === 'source') {
      validateSourceShape(sourceCandidate, keyPath, diagnostics, enabled);
    }

    if (
      hasClosedPropModel(renderer) &&
      !acceptedKeys.has(key) &&
      diagnostics.validation.unknownBarePropertyPolicy !== 'ignore'
    ) {
      emitSchemaDiagnostic(diagnostics, {
        code: 'unknown-property',
        path: keyPath,
        message: `Unknown property "${key}" for renderer type "${renderer.type}".`,
        severity: diagnostics.validation.unknownBarePropertyPolicy === 'warn' ? 'warning' : 'error'
      }, enabled);

      if (diagnostics.validation.unknownBarePropertyPolicy === 'error') {
        skippedPropKeys.add(key);
      }
    }
  }

  if (schema.type === 'data-source') {
    const hasFormula = schema.formula !== undefined;
    const hasApi = schema.api !== undefined;

    if ((hasFormula && hasApi) || (!hasFormula && !hasApi)) {
      emitSchemaDiagnostic(diagnostics, {
        code: 'invalid-source-shape',
        path: pointer,
        message: 'data-source requires exactly one of formula or api.'
      }, enabled);
    }

    if (hasApi) {
      validateApiSchemaShape(schema.api, appendJsonPointer(pointer, 'api'), diagnostics, enabled, 'invalid-source-shape');
    }
  }

  if (schema.type === 'reaction') {
    validateActionShape(schema.actions, appendJsonPointer(pointer, 'actions'), diagnostics, enabled);
  }

  if (enabled && renderer.schemaValidator) {
    renderer.schemaValidator({
      schema,
      path,
      emit(issue) {
        diagnostics.emit({
          code: issue.code,
          message: issue.message,
          path: issue.path ?? pointer,
          severity: issue.severity,
          source: issue.source ?? 'renderer'
        });
      }
    });
  }

  return {
    extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
    skippedPropKeys
  };
}

function analyzeSchemaInput(
  inputValue: unknown,
  path: string,
  registry: RendererRegistry,
  plugins: readonly RendererPlugin[] | undefined,
  diagnostics: SchemaCompilerDiagnosticsContext
) {
  if (diagnostics.hasReachedLimit()) {
    return;
  }

  if (Array.isArray(inputValue)) {
    inputValue.forEach((entry, index) => {
      analyzeSchemaInput(entry, `${path}[${index}]`, registry, plugins, diagnostics);
    });
    return;
  }

  if (!isPlainObject(inputValue)) {
    diagnostics.emit({
      code: path === '$' ? 'invalid-root' : 'expected-object',
      path: schemaPathToJsonPointer(path),
      message: path === '$'
        ? 'Schema root must be an object or an array of schema objects.'
        : 'Schema nodes must be objects.'
    });
    return;
  }

  if (typeof inputValue.type !== 'string' || inputValue.type.length === 0) {
    diagnostics.emit({
      code: 'missing-required-field',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: 'Schema nodes require a non-empty type field.'
    });
    return;
  }

  const renderer = registry.get(inputValue.type);

  if (!renderer) {
    diagnostics.emit({
      code: 'unknown-renderer-type',
      path: appendJsonPointer(schemaPathToJsonPointer(path), 'type'),
      message: `Renderer not found for type: ${inputValue.type}`
    });
    return;
  }

  const wrappedRenderer = applyWrapComponentPlugins(renderer, plugins as RendererPlugin[] | undefined);
  const schema = inputValue as BaseSchema;
  inspectSchemaNodeFields(schema, wrappedRenderer, path, diagnostics, true);

  for (const key of Object.keys(schema)) {
    const value = schema[key];
    const rule = classifyField(wrappedRenderer, key);

    if (rule.kind === 'region') {
      if (value === undefined) {
        continue;
      }

      if (!isSchemaInput(value)) {
        diagnostics.emit({
          code: 'invalid-region-node',
          path: appendJsonPointer(schemaPathToJsonPointer(path), key),
          message: `Region "${rule.regionKey ?? key}" must contain schema input.`
        });
        continue;
      }

      analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, registry, plugins, diagnostics);
      continue;
    }

    if (rule.kind === 'value-or-region' && isSchemaInput(value)) {
      analyzeSchemaInput(value, `${path}.${rule.regionKey ?? key}`, registry, plugins, diagnostics);
    }
  }
}

function collectCompiledNodes(entry: CompiledSchemaNode | CompiledSchemaNode[], out: CompiledSchemaNode[]) {
  if (Array.isArray(entry)) {
    entry.forEach((item) => collectCompiledNodes(item, out));
    return;
  }

  out.push(entry);

  for (const region of Object.values(entry.regions)) {
    if (!region.node) {
      continue;
    }
    collectCompiledNodes(region.node, out);
  }
}

function rewriteActionTargets(
  value: unknown,
  byId: Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }>
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteActionTargets(item, byId));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const source = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, candidate] of Object.entries(source)) {
    output[key] = rewriteActionTargets(candidate, byId);
  }

  if (typeof source.action === 'string' && source.action.startsWith('component:')) {
    if (typeof source.componentId === 'string') {
      const resolvedTarget = byId.get(source.componentId);
      if (resolvedTarget) {
        output._targetCid = resolvedTarget.cid;

        if (resolvedTarget.templateGraphId && typeof resolvedTarget.templateNodeId === 'number') {
          output.__componentTarget = {
            staticPlan: {
              kind: 'static',
              templateGraphId: resolvedTarget.templateGraphId,
              templateNodeId: resolvedTarget.templateNodeId
            }
          };
        }
      }
    }
  }

  return output;
}

function indexNodeIds(nodes: readonly CompiledSchemaNode[], cidState: CompiledCidState): void {
  for (const node of nodes) {
    const id = typeof (node.schema as Record<string, unknown>).id === 'string'
      ? (node.schema as Record<string, unknown>).id as string
      : undefined;

    if (!id || typeof node.cid !== 'number') {
      continue;
    }

    const paths = cidState.idPaths.get(id) ?? [];
    paths.push(node.path);
    cidState.idPaths.set(id, paths);

    if (paths.length === 1 && !cidState.duplicateIds.has(id)) {
      cidState.byId.set(id, node.cid);
      continue;
    }

    cidState.duplicateIds.add(id);
    cidState.byId.delete(id);
    console.warn(
      `[SchemaCompiler] Duplicate component id "${id}" detected. Static cid resolution is disabled for this id. Paths: ${paths.join(', ')}`
    );
  }
}

function createResolvedIdMap(nodes: readonly CompiledSchemaNode[], cidState: CompiledCidState): Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }> {
  const resolved = new Map<string, { cid: number; templateGraphId?: string; templateNodeId?: number }>();

  for (const node of nodes) {
    const id = typeof (node.schema as Record<string, unknown>).id === 'string'
      ? (node.schema as Record<string, unknown>).id as string
      : undefined;

    if (!id || typeof node.cid !== 'number') {
      continue;
    }

    const paths = cidState.idPaths.get(id) ?? [];

    if (paths.length !== 1 || cidState.duplicateIds.has(id)) {
      continue;
    }

    const resolvedCid = cidState.byId.get(id);
    if (resolvedCid !== undefined) {
      resolved.set(id, {
        cid: resolvedCid,
        templateGraphId: node.templateGraphId,
        templateNodeId: node.templateNodeId
      });
    }
  }

  return resolved;
}

function enrichCompiledComponentTargets(
  compiled: CompiledSchemaNode | CompiledSchemaNode[],
  cidState: CompiledCidState
): CompiledSchemaNode | CompiledSchemaNode[] {
  const nodes: CompiledSchemaNode[] = [];
  collectCompiledNodes(compiled, nodes);

  for (const node of nodes) {
    cidState.nextTemplateNodeId += 1;
    node.templateGraphId = cidState.templateGraphId;
    node.templateNodeId = cidState.nextTemplateNodeId;
    cidState.nextCid += 1;
    node.cid = cidState.nextCid;
    attachCompiledCidState(node, cidState);
  }

  indexNodeIds(nodes, cidState);
  const resolvedIds = createResolvedIdMap(nodes, cidState);

  for (const node of nodes) {
    const nextActions: Record<string, unknown> = {};
    for (const key of node.eventKeys) {
      nextActions[key] = rewriteActionTargets(node.eventActions[key], resolvedIds);
    }
    node.eventActions = nextActions;
  }

  return compiled;
}

export function createSchemaCompiler(input: {
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
}): SchemaCompiler {
  const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
  const noopDiagnostics = createSchemaCompilerDiagnosticsContext(undefined, 'compile');

  function applyBeforeCompilePlugins(schema: SchemaInput): SchemaInput {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
  }

  function applyAfterCompilePlugins(node: CompiledSchemaNode | CompiledSchemaNode[]): CompiledSchemaNode | CompiledSchemaNode[] {
    return (input.plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, node);
  }

  function compileSingleNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
    diagnostics: SchemaCompilerDiagnosticsContext = noopDiagnostics
  ): CompiledSchemaNode {
    const renderer = options.renderer;
    const path = options.path;
    const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
    const meta = buildCompiledMeta(schema, renderer, expressionCompiler);
    const propSource: Record<string, unknown> = {};
    const sourcePropKeys = new Set<string>();
    const sourceStatePropKeys: Record<string, string> = {};
    const regions: Record<string, CompiledRegion> = {};
    const eventActions: Record<string, unknown> = {};
    const eventKeys: string[] = [];
    const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};

    for (const key of Object.keys(schema)) {
      if (fieldInspection.skippedPropKeys.has(key) || isNamespacedSchemaKey(key)) {
        continue;
      }

      const rule = classifyField(renderer, key);
      const value = schema[key];

      if (rule.kind === 'ignored' || rule.kind === 'meta') {
        continue;
      }

      if (rule.kind === 'event') {
        eventActions[key] = value;
        eventKeys.push(key);
        continue;
      }

      if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
        regions[rule.regionKey ?? key] = createCompiledRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          compileSchema
        );
        continue;
      }

      propSource[key] = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema
          })
        : value;

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const props = expressionCompiler.compileValue(propSource);

    const flags = {
      hasVisibilityRule: !!meta.visible,
      hasHiddenRule: !!meta.hidden,
      hasDisabledRule: !!meta.disabled,
      isContainer: Object.keys(regions).length > 0,
      isStatic:
        Object.values(meta).every((value) => isCompiledStatic(value)) &&
        props.kind === 'static' &&
        Object.values(regions).every((region) => region.node == null)
    };

    return {
      id: createNodeId(path, schema),
      type: schema.type,
      path,
      schema,
      extensions: fieldInspection.extensions,
      component: renderer,
      meta,
      props,
      sourcePropKeys: Array.from(sourcePropKeys).sort(),
      sourceStatePropKeys,
      validation:
        renderer.scopePolicy === 'form'
          ? collectValidationModel(
              Object.values(regions)
                .map((region) => region.node)
                .filter((candidate): candidate is CompiledSchemaNode | CompiledSchemaNode[] => candidate != null),
              {
                defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, ['touched', 'submit'])
              }
            )
          : undefined,
      regions,
      eventActions,
      eventKeys,
      flags,
      createRuntimeState() {
        return createNodeRuntimeState(this);
      }
    };
  }

  function compileSchema(schema: SchemaInput, options: CompileSchemaOptions = {}): CompiledSchemaNode | CompiledSchemaNode[] {
    const prepared = applyBeforeCompilePlugins(schema);
    const diagnostics = createSchemaCompilerDiagnosticsContext(options, 'compile');
    const cidState = options.cidState ?? createCompiledCidState();

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.'
      });
      throw new Error('Invalid schema root');
    }

    if (diagnostics.enabled) {
      analyzeSchemaInput(prepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    }

    if (Array.isArray(prepared)) {
      const compiled = prepared.map((item, index) => {
        const path = options.basePath ? `${options.basePath}[${index}]` : `$[${index}]`;
        const renderer = input.registry.get(item.type);

        if (!renderer) {
          throw new Error(`Renderer not found for type: ${item.type}`);
        }

        const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

        return compileSingleNode(item, {
          path,
          parentPath: options.parentPath,
          renderer: wrappedRenderer
        }, diagnostics);
      });
      return enrichCompiledComponentTargets(applyAfterCompilePlugins(compiled) as CompiledSchemaNode | CompiledSchemaNode[], cidState);
    }

    const path = options.basePath ?? '$';
    const renderer = input.registry.get(prepared.type);

    if (!renderer) {
      throw new Error(`Renderer not found for type: ${prepared.type}`);
    }

    const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);

    return enrichCompiledComponentTargets(
      applyAfterCompilePlugins(
        compileSingleNode(prepared, {
          path,
          parentPath: options.parentPath,
          renderer: wrappedRenderer
        }, diagnostics)
      ) as CompiledSchemaNode | CompiledSchemaNode[],
      cidState
    );
  }

  function validateSchemaInput(schema: SchemaInput, options: CompileSchemaOptions = {}) {
    const diagnostics = createSchemaCompilerDiagnosticsContext(options, 'validate');
    const prepared = applyBeforeCompilePlugins(schema);

    if (!isSchemaInput(prepared)) {
      diagnostics.emit({
        code: 'invalid-root',
        path: schemaPathToJsonPointer(options.basePath ?? '$'),
        message: 'Schema root must be an object or an array of schema objects.'
      });
      return diagnostics.diagnostics;
    }

    analyzeSchemaInput(prepared, options.basePath ?? '$', input.registry, input.plugins, diagnostics);
    return diagnostics.diagnostics;
  }

  return {
    compile: compileSchema,
    compileNode(schema, options) {
      return compileSingleNode(schema, options);
    },
    validate(schema, options) {
      return validateSchemaInput(schema, options);
    }
  };
}

export function validateSchema(input: {
  schema: SchemaInput;
  registry: RendererRegistry;
  expressionCompiler?: ExpressionCompiler;
  plugins?: RendererPlugin[];
  options?: CompileSchemaOptions;
}) {
  const compiler = createSchemaCompiler({
    registry: input.registry,
    expressionCompiler: input.expressionCompiler,
    plugins: input.plugins
  });

  return compiler.validate?.(input.schema, input.options) ?? [];
}

export function createValidationTraversalOrder(
  nodes: Record<string, import('@nop-chaos/flux-core').CompiledValidationNode>,
  rootPath: string | undefined
): string[] {
  return buildCompiledValidationOrder(nodes, rootPath);
}
