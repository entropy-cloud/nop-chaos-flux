import type {
  ActionSchema,
  BaseSchema,
  CompiledActionProgram,
  CompileNodeOptions,
  CompileSchemaOptions,
  DataSourceSchema,
  ExpressionCompiler,
  PreparedImportSpec,
  ReactionSchema,
  SchemaInput,
  ScopePlan,
  TemplateNode,
  TemplateRegion,
  XuiImportSpec,
} from '@nop-chaos/flux-core';
import { createNodeId, isSchemaInput } from '@nop-chaos/flux-core';
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
    const propSource: Record<string, unknown> = {};
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

    const rawStructuralItemData =
      schema.type === 'loop' || schema.type === 'recurse'
        ? ((schema as { itemData?: Record<string, unknown> }).itemData ?? undefined)
        : undefined;

    const structuralItemData =
      rawStructuralItemData !== undefined
        ? expressionCompiler.compileValue(
            rawStructuralItemData,
            {
              symbolTable,
              sourcePath: `${path}.itemData`,
              reportDiagnostic: (issue) => diagnostics.emit(issue),
            },
          )
        : undefined;

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

      propSource[key] = deepNormalizers[key]
        ? deepNormalizers[key]({
            value,
            path,
            regions,
            compileSchema: (s: SchemaInput, o?: CompileSchemaOptions) =>
              compileSchemaToTemplateNodes(
                s,
                {
                  ...o,
                  schemaUrl: o?.schemaUrl ?? options.schemaUrl,
                  preparedImports: o?.preparedImports ?? options.preparedImports,
                },
                depth + 1,
              ),
          })
        : value;

      if ((schema.type === 'loop' || schema.type === 'recurse') && key === 'itemData') {
        delete propSource[key];
        continue;
      }

      if (rule.allowSource) {
        sourcePropKeys.add(key);

        if (rule.sourceStateKey) {
          sourceStatePropKeys[key] = rule.sourceStateKey;
        }
      }
    }

    const propsProgram = expressionCompiler.compileValue(propSource, {
      symbolTable,
      sourcePath: path,
      reportDiagnostic: (issue) => diagnostics.emit(issue),
    });
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
      structuralItemData,
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
                defaultHiddenFieldPolicy: (schema as { hiddenFieldPolicy?: unknown })
                  .hiddenFieldPolicy as
                  | import('@nop-chaos/flux-core').HiddenFieldPolicy
                  | undefined,
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
