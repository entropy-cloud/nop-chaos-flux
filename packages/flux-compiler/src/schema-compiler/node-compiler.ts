import type {
  ActionSchema,
  ArrayValueState,
  BaseSchema,
  CompiledActionProgram,
  CompiledRuntimeValue,
  CompileNodeOptions,
  CompileSchemaOptions,
  DataSourceSchema,
  ExpressionCompiler,
  FieldCompileContext,
  ObjectValueState,
  PreparedImportSpec,
  ReactionSchema,
  RuntimeValueState,
  SchemaInput,
  ScopePlan,
  TemplateNode,
  TemplateRegion,
  ValueEvaluationResult,
  RendererEnv,
  EvalContext,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createNodeId, isPlainObject, isSchemaInput, shallowEqual } from '@nop-chaos/flux-core';
import { createTemplateRegion } from './regions.js';
import { DEEP_FIELD_NORMALIZERS } from './tables.js';
import { classifyField, buildMetaProgram } from './fields.js';
import { collectValidationModel } from './validation-collection.js';
import {
  inspectSchemaNodeFields,
  isNamespacedSchemaKey,
} from './shape-validation.js';
import {
  extractLifecycleActions,
} from './target-enrichment.js';
import type { SchemaCompilerDiagnosticsContext } from './diagnostics.js';
import {
  normalizeImportSpecKey,
  pushImportSymbols,
  pushPreparedImportSymbols,
  pushInjectedLocalSymbols,
  pushRegionParamSymbols,
  pushNamedActionSymbols,
} from './symbol-helpers.js';
import {
  buildWrapProvidersClosure,
  computeStaticAnalysis,
} from './static-analysis.js';
import { compileActions } from '../action-compiler.js';
import { compileDataSource } from '../source-compiler.js';
import { compileReaction } from '../reaction-compiler.js';
import { createBaseCompileSymbolTable } from '../compile-symbol-table.js';
import {
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers,
} from '../validation-lowering.js';
import { normalizeHiddenFieldPolicy } from '@nop-chaos/flux-core';

export type CompileSingleNodeFn = (
  schema: BaseSchema,
  options: CompileNodeOptions,
  diagnostics: SchemaCompilerDiagnosticsContext,
  depth: number,
) => TemplateNode;

export type CompileSchemaToTemplateNodesFn = (
  schema: SchemaInput,
  options: CompileSchemaOptions,
  depth: number,
) => TemplateNode | TemplateNode[];

export function createCompileSingleNode(
  expressionCompiler: ExpressionCompiler,
  compileSchemaToTemplateNodes: CompileSchemaToTemplateNodesFn,
): CompileSingleNodeFn {
  function isCompiledRuntimeValue(value: unknown): value is CompiledRuntimeValue<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'kind' in value &&
      ((value as { kind?: unknown }).kind === 'static' ||
        (value as { kind?: unknown }).kind === 'dynamic') &&
      'isStatic' in value &&
      'node' in value
    );
  }

  function createStaticRuntimeValue<T>(value: T): CompiledRuntimeValue<T> {
    return {
      kind: 'static',
      isStatic: true,
      node: { kind: 'static-node', value },
      value,
    };
  }

  function createStateRootForValue(value: CompiledRuntimeValue<unknown>): RuntimeValueState<unknown>['root'] {
    if (value.kind === 'dynamic') {
      return value.createState().root;
    }

    return {
      kind: 'leaf-state',
      initialized: false,
    };
  }

  function evaluateValueWithState<T>(
    value: CompiledRuntimeValue<T>,
    context: EvalContext,
    env: RendererEnv,
    stateRoot: RuntimeValueState<unknown>['root'],
  ): ValueEvaluationResult<T> {
    if (value.kind === 'static') {
      return {
        value: value.value,
        changed: false,
        reusedReference: true,
      };
    }

    return value.exec(context, env, { root: stateRoot } as RuntimeValueState<T>);
  }

  function compileCustomFieldResult<T = unknown>(value: T): CompiledRuntimeValue<T> {
    if (isCompiledRuntimeValue(value)) {
      return value as CompiledRuntimeValue<T>;
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => compileCustomFieldResult(item));
      if (items.every((item) => item.kind === 'static')) {
        const staticItems = items as Array<Extract<CompiledRuntimeValue<unknown>, { kind: 'static' }>>;
        return createStaticRuntimeValue(staticItems.map((item) => item.value) as T);
      }

      const arrayNode = {
        kind: 'array-node' as const,
        items: items.map((item) => item.node),
      };

      return {
        kind: 'dynamic',
        isStatic: false,
        node: arrayNode,
        createState() {
          return {
            root: {
              kind: 'array-state',
              initialized: false,
              items: items.map((item) => createStateRootForValue(item)),
            },
          };
        },
        exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
          const resolvedState =
            state?.root.kind === 'array-state'
              ? (state as RuntimeValueState<T> & { root: ArrayValueState<any> })
              : ({
                  root: {
                    kind: 'array-state',
                    initialized: false,
                    items: items.map((item) => createStateRootForValue(item)),
                  },
                } as RuntimeValueState<T> & { root: ArrayValueState<any> });
          const stateRoot = resolvedState.root;

          if (stateRoot.items.length !== items.length) {
            stateRoot.items = items.map((item) => createStateRootForValue(item));
            stateRoot.initialized = false;
          }

          let anyChildChanged = false;
          const nextValue = items.map((item, index) => {
            const result = evaluateValueWithState(item, context, env, stateRoot.items[index]);
            if (result.changed) {
              anyChildChanged = true;
            }
            return result.value;
          });

          if (!anyChildChanged && stateRoot.initialized && stateRoot.lastValue) {
            return {
              value: stateRoot.lastValue as T,
              changed: false,
              reusedReference: true,
            };
          }

          if (
            stateRoot.initialized &&
            stateRoot.lastValue &&
            shallowEqual(stateRoot.lastValue, nextValue)
          ) {
            return {
              value: stateRoot.lastValue as T,
              changed: false,
              reusedReference: true,
            };
          }

          stateRoot.initialized = true;
          stateRoot.lastValue = nextValue as T;

          return {
            value: nextValue as T,
            changed: true,
            reusedReference: false,
          };
        },
      } as CompiledRuntimeValue<T>;
    }

    if (isPlainObject(value)) {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record);
      const entries = Object.fromEntries(keys.map((key) => [key, compileCustomFieldResult(record[key])])) as Record<
        string,
        CompiledRuntimeValue<unknown>
      >;

      if (keys.every((key) => entries[key].kind === 'static')) {
        const staticEntries = entries as Record<
          string,
          Extract<CompiledRuntimeValue<unknown>, { kind: 'static' }>
        >;
        return createStaticRuntimeValue(
          Object.fromEntries(keys.map((key) => [key, staticEntries[key].value])) as T,
        );
      }

      const objectNode = {
        kind: 'object-node' as const,
        keys,
        entries: Object.fromEntries(keys.map((key) => [key, entries[key].node])),
      };

      return {
        kind: 'dynamic',
        isStatic: false,
        node: objectNode,
        createState() {
          return {
            root: {
              kind: 'object-state',
              initialized: false,
              entries: Object.fromEntries(
                keys.map((key) => [key, createStateRootForValue(entries[key])]),
              ),
            },
          };
        },
        exec(context: EvalContext, env: RendererEnv, state?: RuntimeValueState<T>) {
          const resolvedState =
            state?.root.kind === 'object-state'
              ? (state as RuntimeValueState<T> & { root: ObjectValueState<any> })
              : ({
                  root: {
                    kind: 'object-state',
                    initialized: false,
                    entries: Object.fromEntries(
                      keys.map((key) => [key, createStateRootForValue(entries[key])]),
                    ),
                  },
                } as RuntimeValueState<T> & { root: ObjectValueState<any> });
          const stateRoot = resolvedState.root;

          const currentKeys = Object.keys(stateRoot.entries);
          const needsRebuild =
            keys.some((key) => !(key in stateRoot.entries)) ||
            currentKeys.some((key) => !keys.includes(key));
          if (needsRebuild) {
            stateRoot.entries = Object.fromEntries(
              keys.map((key) => [key, createStateRootForValue(entries[key])]),
            );
            stateRoot.initialized = false;
          }

          let anyChildChanged = false;
          const nextValue: Record<string, unknown> = {};
          for (const key of keys) {
            const result = evaluateValueWithState(entries[key], context, env, stateRoot.entries[key]);
            if (result.changed) {
              anyChildChanged = true;
            }
            nextValue[key] = result.value;
          }

          if (!anyChildChanged && stateRoot.initialized && stateRoot.lastValue) {
            return {
              value: stateRoot.lastValue as T,
              changed: false,
              reusedReference: true,
            };
          }

          if (
            stateRoot.initialized &&
            stateRoot.lastValue &&
            shallowEqual(stateRoot.lastValue, nextValue)
          ) {
            return {
              value: stateRoot.lastValue as T,
              changed: false,
              reusedReference: true,
            };
          }

          stateRoot.initialized = true;
          stateRoot.lastValue = nextValue as T;

          return {
            value: nextValue as T,
            changed: true,
            reusedReference: false,
          };
        },
      } as CompiledRuntimeValue<T>;
    }

    return createStaticRuntimeValue(value);
  }

  return function compileSingleNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
    diagnostics: SchemaCompilerDiagnosticsContext,
    depth: number,
  ): TemplateNode {
    const renderer = options.renderer;
    const path = options.path;
    const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
    const metaProgram = buildMetaProgram(schema, renderer, expressionCompiler);
    const structuralWhen = metaProgram.when;
    const compiledPropEntries: Record<string, CompiledRuntimeValue<unknown>> = {};
    const sourcePropKeys = new Set<string>();
    const sourceStatePropKeys: Record<string, string> = {};
    const regions: Record<string, TemplateRegion> = {};
    const rawLifecycleActions = extractLifecycleActions(schema);
    const rawEventPlans: Record<string, ActionSchema | ActionSchema[]> = {};
    const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};

    const nodeImports = Array.isArray(fieldInspection.extensions?.['xui:imports'])
      ? (fieldInspection.extensions?.['xui:imports'] as XuiImportSpec[])
      : undefined;

    let symbolTable = pushInjectedLocalSymbols(
      options.symbolTable ?? createBaseCompileSymbolTable(),
      renderer,
      `${path}:owner-symbols`,
    );
    symbolTable = options.schemaUrl
      ? pushPreparedImportSymbols(
          symbolTable,
          nodeImports,
          options.preparedImports,
          options.schemaUrl,
          `${path}:imports`,
        )
      : pushImportSymbols(symbolTable, nodeImports, `${path}:imports`);

    const rawXuiActions =
      typeof schema['xui:actions'] === 'object' &&
      schema['xui:actions'] !== null &&
      !Array.isArray(schema['xui:actions'])
        ? (schema['xui:actions'] as Record<string, ActionSchema>)
        : undefined;
    const xuiActionNames = rawXuiActions ? Object.keys(rawXuiActions) : [];
    if (xuiActionNames.length > 0) {
      symbolTable = pushNamedActionSymbols(symbolTable, xuiActionNames, `${path}:xui-actions`);
    }

    const lazyEvalRules =
      renderer.fields?.filter((f) => f.lazyEval) ?? [];
    const lazyEvalKeys = new Set(lazyEvalRules.map((f) => f.key));

    const structuralFields: Record<string, import('@nop-chaos/flux-core').CompiledRuntimeValue<unknown>> = {};
    for (const rule of lazyEvalRules) {
      const rawValue = (schema as Record<string, unknown>)[rule.key];
      if (rawValue === undefined) continue;

      const params = rule.params;
      const lazySymbolTable =
        params?.length
          ? symbolTable.push({
              id: `${path}.${rule.key}:lazy-eval`,
              kind: 'region',
              symbols: Object.fromEntries(
                params.map((p) => [p, { name: p, kind: 'ambient' as const }]),
              ),
            })
          : symbolTable;

      structuralFields[rule.key] = expressionCompiler.compileValue(rawValue, {
        symbolTable: lazySymbolTable,
        sourcePath: `${path}.${rule.key}`,
        reportDiagnostic: (issue) => diagnostics.emit(issue),
      });
    }

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
        rawEventPlans[key] = value as ActionSchema | ActionSchema[];
        continue;
      }

      if (lazyEvalKeys.has(key)) {
        continue;
      }

      if (rule.kind === 'region' || (rule.kind === 'value-or-region' && isSchemaInput(value))) {
        const regionMeta =
          rule.kind === 'region' || isSchemaInput(value)
            ? { params: rule.params, isolate: rule.isolate }
            : undefined;
        const compileAtNextDepth = (s: SchemaInput, o?: CompileSchemaOptions) =>
          compileSchemaToTemplateNodes(s, o ?? {}, depth + 1);
        regions[rule.regionKey ?? key] = createTemplateRegion(
          rule.regionKey ?? key,
          value,
          `${path}.${rule.regionKey ?? key}`,
          (inputValue, regionOptions) =>
            compileAtNextDepth(inputValue, {
              ...regionOptions,
              schemaUrl: regionOptions?.schemaUrl ?? options.schemaUrl,
              preparedImports: options.preparedImports,
              diagnostics: diagnostics.enabled
                ? {
                    enabled: true,
                    continueOnError: diagnostics.continueOnError,
                    maxIssues: diagnostics.maxIssues,
                    reporter: (issue) => diagnostics.emit(issue),
                  }
                : regionOptions?.diagnostics,
              symbolTable: pushRegionParamSymbols(
                symbolTable,
                rule.params,
                `${path}.${rule.regionKey ?? key}:slot`,
              ),
            }),
          regionMeta,
        );
        continue;
      }

      if (rule.compile) {
        const fieldContext: FieldCompileContext = {
          expressionCompiler,
          symbolTable,
          sourcePath: `${path}.${key}`,
          compileValue: <T = unknown>(input: T, sourcePathOverride?: string) =>
            expressionCompiler.compileValue(input, {
              symbolTable,
              sourcePath: sourcePathOverride ?? `${path}.${key}`,
              reportDiagnostic: (issue) => diagnostics.emit(issue),
            }),
          compileSchema: (input: SchemaInput, compileOptions?: CompileSchemaOptions) =>
            compileSchemaToTemplateNodes(
              input,
              {
                ...compileOptions,
                schemaUrl: compileOptions?.schemaUrl ?? options.schemaUrl,
                preparedImports: compileOptions?.preparedImports ?? options.preparedImports,
                symbolTable: compileOptions?.symbolTable ?? symbolTable,
              },
              depth + 1,
            ),
        };

        try {
          compiledPropEntries[key] = compileCustomFieldResult(rule.compile(value, fieldContext));
        } catch (error) {
          diagnostics.emit({
            code: 'invalid-schema' as import('@nop-chaos/flux-core').SchemaDiagnosticCode,
            path: `${path}.${key}`,
            message:
              error instanceof Error
                ? `Custom field compilation failed: ${error.message}`
                : 'Custom field compilation failed.',
            severity: 'error',
          });
        }
        continue;
      }

      const normalizedValue = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema: (
              s: SchemaInput,
              o?: CompileSchemaOptions,
              regionMeta?: { params?: readonly string[]; isolate?: boolean },
            ) =>
              compileSchemaToTemplateNodes(
                s,
                {
                  ...o,
                  schemaUrl: o?.schemaUrl ?? options.schemaUrl,
                  preparedImports: o?.preparedImports ?? options.preparedImports,
                  diagnostics: diagnostics.enabled
                    ? {
                        enabled: true,
                        continueOnError: diagnostics.continueOnError,
                        maxIssues: diagnostics.maxIssues,
                        reporter: (issue) => diagnostics.emit(issue),
                      }
                    : o?.diagnostics,
                  symbolTable: regionMeta?.params?.length
                    ? pushRegionParamSymbols(
                        o?.symbolTable ?? symbolTable,
                        regionMeta.params,
                        `${path}.${key}:slot`,
                      )
                    : (o?.symbolTable ?? symbolTable),
                },
                depth + 1,
              ),
          })
        : value;

      compiledPropEntries[key] = expressionCompiler.compileValue(normalizedValue, {
        symbolTable,
        sourcePath: `${path}.${key}`,
        reportDiagnostic: (issue) => diagnostics.emit(issue),
      });

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const propsProgram = compileCustomFieldResult(compiledPropEntries) as CompiledRuntimeValue<
      Record<string, unknown>
    >;
    const compileOptions = {
      symbolTable,
      sourcePath: path,
      reportDiagnostic: (issue: {
        code: import('@nop-chaos/flux-core').SchemaDiagnosticCode;
        message: string;
        path: string;
        severity?: import('@nop-chaos/flux-core').SchemaDiagnosticSeverity;
        source?: import('@nop-chaos/flux-core').SchemaDiagnosticSource;
      }) => diagnostics.emit(issue),
    };

    const eventPlans: Record<string, CompiledActionProgram> = {};
    for (const [key, rawActions] of Object.entries(rawEventPlans)) {
      eventPlans[key] = compileActions(rawActions, expressionCompiler, {
        ...compileOptions,
        basePath: `${path}.${key}`,
      });
    }

    const lifecycleActions:
      | {
          onMount?: CompiledActionProgram;
          onUnmount?: CompiledActionProgram;
        }
      | undefined = rawLifecycleActions
      ? {
          onMount: rawLifecycleActions.onMount
            ? compileActions(
                rawLifecycleActions.onMount as ActionSchema | ActionSchema[],
                expressionCompiler,
                {
                  ...compileOptions,
                  basePath: `${path}.onMount`,
                },
              )
            : undefined,
          onUnmount: rawLifecycleActions.onUnmount
            ? compileActions(
                rawLifecycleActions.onUnmount as ActionSchema | ActionSchema[],
                expressionCompiler,
                {
                  ...compileOptions,
                  basePath: `${path}.onUnmount`,
                },
              )
            : undefined,
        }
      : undefined;

    const scopePlan: ScopePlan =
      renderer.scopePolicy === 'form'
        ? { kind: 'form' }
        : nodeImports
          ? { kind: 'child' }
          : { kind: 'inherit' };

    const classAliasesPlan =
      schema.classAliases && Object.keys(schema.classAliases as Record<string, unknown>).length > 0
        ? {
            aliases: schema.classAliases as Record<string, string>,
          }
        : undefined;

    const preparedNodeImports =
      options.schemaUrl && nodeImports?.length
        ? nodeImports
            .map((spec) =>
              options.preparedImports?.get(normalizeImportSpecKey(options.schemaUrl!, spec)),
            )
            .filter((entry): entry is PreparedImportSpec => Boolean(entry))
        : [];

    const importsPlan = nodeImports?.length
      ? {
          imports: nodeImports,
          resolvedImports:
            preparedNodeImports.length > 0
              ? preparedNodeImports.map((entry) => entry.resolvedSpec)
              : nodeImports,
          preparedImports: preparedNodeImports,
          staticMeta:
            preparedNodeImports.length > 0
              ? Object.fromEntries(
                  preparedNodeImports.map((entry) => [entry.spec.as, entry.staticMeta ?? {}]),
                )
              : undefined,
        }
      : undefined;

    const providerPlan = {
      actionScope: renderer.actionScopePolicy === 'new',
      componentRegistry: renderer.componentRegistryPolicy === 'new',
      classAliases: Boolean(classAliasesPlan),
    };

    const providerWrap = buildWrapProvidersClosure(providerPlan);
    const validationOwnerPlan =
      renderer.scopePolicy === 'form'
        ? {
            boundary: 'create-owner' as const,
            childContractMode:
              renderer.validation?.childContractMode ??
              (schema.type === 'form' ? 'ignore' : 'summary-gate'),
          }
        : renderer.validation?.ownerResolution
          ? {
              boundary: renderer.validation.ownerResolution,
              childContractMode: renderer.validation.childContractMode,
            }
          : undefined;

    const namedActionPlans: Record<string, CompiledActionProgram> | undefined = rawXuiActions
      ? Object.fromEntries(
          Object.entries(rawXuiActions).map(([name, actionSchema]) => {
            if (typeof actionSchema !== 'object' || actionSchema === null) {
              diagnostics.emit({
                code: 'invalid-namespace-property' as import('@nop-chaos/flux-core').SchemaDiagnosticCode,
                path: `${path}.xui:actions.${name}`,
                message: `xui:actions entry "${name}" must be an ActionSchema object.`,
                severity: 'error',
              });
              return [name, compileActions({ action: 'noop' }, expressionCompiler, compileOptions)];
            }
            return [
              name,
              compileActions(actionSchema, expressionCompiler, {
                ...compileOptions,
                basePath: `${path}.xui:actions.${name}`,
              }),
            ];
          }),
        )
      : undefined;

    const node: TemplateNode = {
      templateNodeId: 0,
      id: createNodeId(path, schema),
      type: schema.type,
      schema,
      templatePath: path,
      schemaUrl: (options as CompileNodeOptions & { schemaUrl?: string }).schemaUrl,
      rendererType: renderer.type,
      component: renderer,
      propsProgram,
      metaProgram,
      structuralWhen,
      structuralFields: Object.keys(structuralFields).length > 0 ? structuralFields : undefined,
      eventPlans,
      lifecycleActions,
      regions,
      providerPlan,
      providerWrap,
      classAliasesPlan,
      importsPlan,
      scopePlan,
      validationOwnerPlan,
      validationPlan:
        renderer.scopePolicy === 'form' || schema.type === 'page'
          ? collectValidationModel(
              Object.values(regions)
                .map((region) => region.node)
                .filter(
                  (candidate): candidate is TemplateNode | TemplateNode[] => candidate != null,
                ),
              {
                defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, [
                  'touched',
                  'submit',
                ]),
                defaultHiddenFieldPolicy: normalizeHiddenFieldPolicy(
                  (schema as { hiddenFieldPolicy?: unknown }).hiddenFieldPolicy,
                ),
              },
            )
          : undefined,
      sourcePropKeys: Array.from(sourcePropKeys).sort(),
      sourceStatePropKeys,
      ...(namedActionPlans && Object.keys(namedActionPlans).length > 0 ? { namedActionPlans } : {}),
    };

    node.staticAnalysis = computeStaticAnalysis(node, schema);

    if (schema.type === 'data-source') {
      node.compiledSources = [
        compileDataSource(node.id, schema as DataSourceSchema, expressionCompiler, {
          ...compileOptions,
          basePath: path,
        }),
      ];
    }

    if (schema.type === 'reaction') {
      node.compiledReactions = [
        compileReaction(node.id, schema as ReactionSchema, expressionCompiler, {
          ...compileOptions,
          basePath: path,
        }),
      ];
    }

    return node;
  };
}
