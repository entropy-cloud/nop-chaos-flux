import {
  toCompiledRendererContract,
} from '@nop-chaos/flux-core';
import type {
  ActionSchema,
  BaseSchema,
  CompiledActionProgram,
  CompiledRuntimeValue,
  CompileNodeOptions,
  CompileSchemaOptions,
  DataSourceSchema,
  ExpressionCompiler,
  FieldCompileContext,
  PreparedImportSpec,
  ReactionSchema,
  RendererDefinition,
  SchemaInput,
  ScopePlan,
  TemplateNode,
  TemplateRegion,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createNodeId, createTemplateRegion, isSchemaInput } from '@nop-chaos/flux-core';
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
import { compileRuntimeValueTree } from './runtime-value-compilation.js';
import { compileActions } from '../action-compiler.js';
import { compileDataSource } from '../source-compiler.js';
import { compileReaction } from '../reaction-compiler.js';
import { createBaseCompileSymbolTable } from '../compile-symbol-table.js';
import {
  normalizeValidationTriggers,
  normalizeValidationVisibilityTriggers,
} from '../validation-lowering.js';
import { extractNestedSchemaRegions, normalizeHiddenFieldPolicy } from '@nop-chaos/flux-core';

function normalizeDeepFieldNestedRegions(input: {
  value: unknown;
  path: string;
  key: string;
  rules?: readonly import('@nop-chaos/flux-core').RendererDeepFieldRegionRule[];
  regions: Record<string, TemplateRegion>;
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[];
}) {
  const rules = input.rules;

  if (!rules?.length) {
    return input.value;
  }

  if (Array.isArray(input.value)) {
    return input.value.map((item, index) => {
      if (!item || typeof item !== 'object') {
        return item;
      }

      return extractNestedSchemaRegions({
        candidate: item as Record<string, unknown>,
        itemRegionPath: `${input.path}.${input.key}[${index}]`,
        itemRegionKeyPrefix: `${input.key}.${index}`,
        rules,
        regions: input.regions,
        compileSchema: input.compileSchema,
      }).value;
    });
  }

  if (!input.value || typeof input.value !== 'object') {
    return input.value;
  }

  return extractNestedSchemaRegions({
    candidate: input.value as Record<string, unknown>,
    itemRegionPath: `${input.path}.${input.key}`,
    itemRegionKeyPrefix: input.key,
    rules,
    regions: input.regions,
    compileSchema: input.compileSchema,
  }).value;
}

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

function isImportSpecCandidate(value: unknown): value is XuiImportSpec {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function createCompileSingleNode(
  expressionCompiler: ExpressionCompiler,
  compileSchemaToTemplateNodes: CompileSchemaToTemplateNodesFn,
): CompileSingleNodeFn {
  const compileFailureRenderer: RendererDefinition = {
    type: '__compile-failure__',
    component: (props) => String(props.props.message ?? 'Schema compilation failed'),
  };

  function isSourceCarrier(value: unknown): value is { type: 'source' } {
    return !!value && typeof value === 'object' && !Array.isArray(value) && (value as { type?: unknown }).type === 'source';
  }

  function normalizeBooleanLikeCandidate(candidate: unknown): boolean | undefined {
    return typeof candidate === 'boolean' ? candidate : undefined;
  }

  function createCompileFailureNode(input: {
    schema: BaseSchema;
    path: string;
    message: string;
    schemaUrl?: string;
  }): TemplateNode {
    return {
      templateNodeId: 0,
      id: createNodeId(input.path, input.schema),
      type: input.schema.type,
      schema: input.schema,
      templatePath: input.path,
      schemaUrl: input.schemaUrl,
      rendererType: compileFailureRenderer.type,
      component: compileFailureRenderer,
      propsProgram: compileRuntimeValueTree({
        message: input.message,
        originalType: input.schema.type,
      }) as CompiledRuntimeValue<Record<string, unknown>>,
      metaProgram: {},
      eventPlans: {},
      regions: {},
      providerPlan: {
        actionScope: false,
        componentRegistry: false,
        classAliases: false,
      },
      providerWrap: buildWrapProvidersClosure({
        actionScope: false,
        componentRegistry: false,
        classAliases: false,
      }),
      scopePlan: { kind: 'inherit' },
      sourcePropKeys: [],
      sourceStatePropKeys: {},
    };
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
    const nodeImports = Array.isArray(fieldInspection.extensions?.['xui:imports'])
      ? (fieldInspection.extensions?.['xui:imports'] as unknown[]).filter(isImportSpecCandidate)
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

      const treatValueOrRegionAsRegion =
        rule.kind === 'value-or-region' && isSchemaInput(value) && !(rule.allowSource && isSourceCarrier(value));

      if (rule.kind === 'region' || treatValueOrRegionAsRegion) {
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
          compileValue: <T = unknown>(
            input: T,
            sourcePathOverride?: string,
            compileValueOptions?: Omit<
              import('@nop-chaos/flux-core').ExpressionCompileOptions,
              'sourcePath'
            >,
          ) =>
            expressionCompiler.compileValue(input, {
              ...compileValueOptions,
              symbolTable: compileValueOptions?.symbolTable ?? symbolTable,
              sourcePath: sourcePathOverride ?? `${path}.${key}`,
              reportDiagnostic:
                compileValueOptions?.reportDiagnostic ?? ((issue) => diagnostics.emit(issue)),
            }),
          compileActions: (
            input: ActionSchema | ActionSchema[],
            sourcePathOverride?: string,
            compileActionOptions?: Omit<
              import('@nop-chaos/flux-core').ExpressionCompileOptions,
              'sourcePath'
            >,
          ) =>
            compileActions(input, expressionCompiler, {
              ...compileActionOptions,
              symbolTable: compileActionOptions?.symbolTable ?? symbolTable,
              sourcePath: sourcePathOverride ?? `${path}.${key}`,
              basePath: sourcePathOverride ?? `${path}.${key}`,
              reportDiagnostic:
                compileActionOptions?.reportDiagnostic ?? ((issue) => diagnostics.emit(issue)),
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
          compiledPropEntries[key] = compileRuntimeValueTree(rule.compile(value, fieldContext));
        } catch (error) {
          const message =
            error instanceof Error
              ? `Custom field compilation failed: ${error.message}`
              : 'Custom field compilation failed.';
          diagnostics.emit({
            code: 'invalid-schema' as import('@nop-chaos/flux-core').SchemaDiagnosticCode,
            path: `${path}.${key}`,
            message,
            severity: 'error',
          });

          if (!diagnostics.continueOnError) {
            throw new Error(message, { cause: error });
          }

          return createCompileFailureNode({
            schema,
            path,
            message,
            schemaUrl: (options as CompileNodeOptions & { schemaUrl?: string }).schemaUrl,
          });
        }
        continue;
      }

      const deepField = renderer.deepFields?.find((field) => field.key === key);
      const normalizedValue = deepField
        ? (deepField.normalize
            ? deepField.normalize({
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
            : normalizeDeepFieldNestedRegions({
                value,
                path,
                key,
                rules: deepField.nestedRegions,
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
              }))
        : value;

      compiledPropEntries[key] = expressionCompiler.compileValue(normalizedValue, {
        symbolTable,
        sourcePath: `${path}.${key}`,
        transform: rule.valueType === 'boolean' ? normalizeBooleanLikeCandidate : undefined,
        reportDiagnostic: (issue) => diagnostics.emit(issue),
      });

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const propsProgram = compileRuntimeValueTree(compiledPropEntries) as CompiledRuntimeValue<
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
    const explicitOwnerResolution = renderer.validation?.ownerResolution;
    const validationOwnerPlan =
      explicitOwnerResolution || renderer.scopePolicy === 'form'
        ? {
            boundary: (explicitOwnerResolution ?? 'create-owner') as
              | 'inherit-owner'
              | 'create-owner'
              | 'no-owner',
            childContractMode:
              renderer.validation?.childContractMode ??
              renderer.validationDefaults?.defaultChildContractMode ??
              'summary-gate',
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
      component: toCompiledRendererContract(renderer),
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
        renderer.scopePolicy === 'form' || renderer.validationDefaults?.collectDescendantValidation === true
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

    for (const artifact of renderer.compilation?.artifacts ?? []) {
      if (artifact === 'data-source') {
        node.compiledSources = [
          compileDataSource(node.id, schema as DataSourceSchema, expressionCompiler, {
            ...compileOptions,
            basePath: path,
          }),
        ];
        continue;
      }

      if (artifact === 'reaction') {
        node.compiledReactions = [
          compileReaction(node.id, schema as ReactionSchema, expressionCompiler, {
            ...compileOptions,
            basePath: path,
          }),
        ];
      }
    }

    return node;
  };
}
