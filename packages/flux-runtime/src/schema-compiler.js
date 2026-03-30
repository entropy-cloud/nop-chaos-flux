import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
import { META_FIELDS, buildCompiledFormValidationModel, buildCompiledValidationOrder, createNodeId, isSchemaInput } from '@nop-chaos/flux-core';
import { collectSchemaValidationRules, compileValidationRules, mergeValidationRules, normalizeValidationTriggers, normalizeValidationVisibilityTriggers } from './validation';
const TABLE_COLUMN_REGION_FIELDS = [
    { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
    { key: 'buttons', regionKeySuffix: 'buttons', compiledKey: 'buttonsRegionKey' },
    { key: 'cell', regionKeySuffix: 'cell', compiledKey: 'cellRegionKey' }
];
function extractNestedSchemaRegions(input) {
    const nextValue = { ...input.candidate };
    let changed = false;
    for (const rule of input.rules) {
        const fieldValue = input.candidate[rule.key];
        if (!isSchemaInput(fieldValue)) {
            continue;
        }
        const regionKey = `${input.itemRegionKeyPrefix}.${rule.regionKeySuffix}`;
        input.regions[regionKey] = createCompiledRegion(regionKey, fieldValue, `${input.itemRegionPath}.${rule.regionKeySuffix}`, input.compileSchema);
        delete nextValue[rule.key];
        nextValue[rule.compiledKey] = regionKey;
        changed = true;
    }
    return {
        value: changed ? nextValue : input.candidate,
        changed
    };
}
function normalizeTableColumns(value, path, regions, compileSchema) {
    if (!Array.isArray(value)) {
        return value;
    }
    return value.map((column, index) => {
        if (!column || typeof column !== 'object') {
            return column;
        }
        return extractNestedSchemaRegions({
            candidate: column,
            itemRegionPath: `${path}.columns[${index}]`,
            itemRegionKeyPrefix: `columns.${index}`,
            rules: TABLE_COLUMN_REGION_FIELDS,
            regions,
            compileSchema
        }).value;
    });
}
const DEEP_FIELD_NORMALIZERS = {
    table: {
        columns(input) {
            return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
        }
    }
};
const DEFAULT_FIELD_RULES = {
    body: { key: 'body', kind: 'region', regionKey: 'body' },
    actions: { key: 'actions', kind: 'region', regionKey: 'actions' },
    header: { key: 'header', kind: 'region', regionKey: 'header' },
    footer: { key: 'footer', kind: 'region', regionKey: 'footer' },
    toolbar: { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
    dialog: { key: 'dialog', kind: 'prop' },
    columns: { key: 'columns', kind: 'prop' }
};
function classifyField(renderer, key) {
    const explicit = renderer.fields?.find((field) => field.key === key);
    if (explicit) {
        return explicit;
    }
    if (META_FIELDS.has(key)) {
        return { key, kind: 'meta' };
    }
    if (renderer.regions?.includes(key)) {
        return { key, kind: 'region', regionKey: key };
    }
    if (/^on[A-Z]/.test(key)) {
        return { key, kind: 'event' };
    }
    return DEFAULT_FIELD_RULES[key] ?? { key, kind: 'prop' };
}
function buildCompiledMeta(schema, renderer, expressionCompiler) {
    const meta = {};
    for (const key of META_FIELDS) {
        if (classifyField(renderer, key).kind !== 'meta') {
            continue;
        }
        const value = schema[key];
        if (value === undefined) {
            continue;
        }
        switch (key) {
            case 'id':
            case 'name':
            case 'label':
            case 'title':
            case 'className':
            case 'visible':
            case 'hidden':
            case 'disabled':
            case 'testid':
                meta[key] = expressionCompiler.compileValue(value);
                break;
        }
    }
    return meta;
}
function isCompiledStatic(compiled) {
    return !compiled || compiled.kind === 'static';
}
function createNodeRuntimeState(node) {
    const metaEntries = {};
    for (const key of Object.keys(node.meta)) {
        const value = node.meta[key];
        if (value?.kind === 'dynamic') {
            metaEntries[key] = value.createState();
        }
    }
    return {
        meta: metaEntries,
        props: node.props.kind === 'dynamic' ? node.props.createState() : undefined
    };
}
function createCompiledRegion(key, value, path, compileSchema) {
    if (value == null) {
        return {
            key,
            path,
            node: null
        };
    }
    if (!isSchemaInput(value)) {
        throw new Error(`Region ${path} must contain schema input.`);
    }
    return {
        key,
        path,
        node: compileSchema(value, { basePath: path, parentPath: path })
    };
}
function poolValidationBehavior(pool, triggers, showErrorOn) {
    const key = `${triggers.join('|')}::${showErrorOn.join('|')}`;
    const existing = pool.get(key);
    if (existing) {
        return existing;
    }
    const behavior = {
        triggers,
        showErrorOn
    };
    pool.set(key, behavior);
    return behavior;
}
function collectValidationModel(node, options = {}) {
    if (!node) {
        return undefined;
    }
    const nodes = [];
    const queue = Array.isArray(node) ? [...node] : [node];
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            continue;
        }
        if (Array.isArray(current)) {
            queue.unshift(...current);
            continue;
        }
        nodes.push(current);
    }
    const validationNodes = {
        '': {
            path: '',
            kind: 'form',
            rules: [],
            children: [],
            parent: undefined
        }
    };
    const behaviorPool = new Map();
    let rootBehavior = poolValidationBehavior(behaviorPool, options.defaultTriggers ?? ['blur'], options.defaultShowErrorOn ?? ['touched', 'submit']);
    const visit = (entry) => {
        if (!entry.component) {
            return;
        }
        if (entry.type === 'form') {
            rootBehavior = poolValidationBehavior(behaviorPool, normalizeValidationTriggers(entry.schema.validateOn, ['blur']), normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, ['touched', 'submit']));
        }
        const contributor = entry.component.validation;
        if (contributor?.kind === 'field') {
            const ctx = {
                schema: entry.schema,
                renderer: entry.component,
                path: entry.path
            };
            const fieldPath = contributor.getFieldPath?.(entry.schema, ctx);
            if (fieldPath) {
                const compiledRules = compileValidationRules(fieldPath, mergeValidationRules(collectSchemaValidationRules(entry.schema), contributor.collectRules?.(entry.schema, ctx)));
                const parentPath = fieldPath.includes('.') ? fieldPath.split('.').slice(0, -1).join('.') : '';
                const nodeKind = contributor.valueKind === 'array' ? 'array' : contributor.valueKind === 'object' ? 'object' : 'field';
                const behavior = poolValidationBehavior(behaviorPool, normalizeValidationTriggers(entry.schema.validateOn, rootBehavior.triggers), normalizeValidationVisibilityTriggers(entry.schema.showErrorOn, rootBehavior.showErrorOn));
                const label = typeof entry.schema.label === 'string' ? entry.schema.label : undefined;
                validationNodes[fieldPath] = {
                    path: fieldPath,
                    kind: nodeKind,
                    controlType: entry.type,
                    label,
                    rules: compiledRules,
                    behavior,
                    children: [],
                    parent: parentPath
                };
                if (validationNodes[parentPath]) {
                    validationNodes[parentPath].children.push(fieldPath);
                }
            }
        }
        for (const region of Object.values(entry.regions)) {
            if (!region.node) {
                continue;
            }
            const childNodes = Array.isArray(region.node) ? region.node : [region.node];
            childNodes.forEach(visit);
        }
    };
    nodes.forEach(visit);
    return buildCompiledFormValidationModel({
        behavior: rootBehavior,
        nodes: validationNodes,
        rootPath: ''
    });
}
function applyWrapComponentPlugins(renderer, plugins) {
    return (plugins ?? []).reduce((current, plugin) => plugin.wrapComponent?.(current) ?? current, renderer);
}
function collectCompiledNodes(entry, out) {
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
function rewriteActionTargets(value, byId, byName) {
    if (Array.isArray(value)) {
        return value.map((item) => rewriteActionTargets(item, byId, byName));
    }
    if (!value || typeof value !== 'object') {
        return value;
    }
    const source = value;
    const output = {};
    for (const [key, candidate] of Object.entries(source)) {
        output[key] = rewriteActionTargets(candidate, byId, byName);
    }
    if (typeof source.action === 'string' && source.action.startsWith('component:')) {
        if (typeof source.componentId === 'string') {
            const resolvedCid = byId.get(source.componentId);
            if (resolvedCid !== undefined) {
                output._targetCid = resolvedCid;
            }
        }
        else if (typeof source.componentName === 'string') {
            const resolvedCid = byName.get(source.componentName);
            if (resolvedCid !== undefined) {
                output._targetCid = resolvedCid;
            }
        }
    }
    return output;
}
function enrichCompiledComponentTargets(compiled) {
    const nodes = [];
    collectCompiledNodes(compiled, nodes);
    const byId = new Map();
    const byName = new Map();
    let cid = 0;
    for (const node of nodes) {
        const schemaRecord = node.schema;
        const id = typeof schemaRecord.id === 'string' ? schemaRecord.id : undefined;
        const name = typeof schemaRecord.name === 'string' ? schemaRecord.name : undefined;
        cid += 1;
        schemaRecord._cid = cid;
        if (!id && !name) {
            continue;
        }
        if (id) {
            byId.set(id, cid);
        }
        if (name) {
            byName.set(name, cid);
        }
    }
    for (const node of nodes) {
        const nextActions = {};
        for (const key of node.eventKeys) {
            nextActions[key] = rewriteActionTargets(node.eventActions[key], byId, byName);
        }
        node.eventActions = nextActions;
    }
    return compiled;
}
export function createSchemaCompiler(input) {
    const expressionCompiler = input.expressionCompiler ?? createExpressionCompiler(createFormulaCompiler());
    function applyBeforeCompilePlugins(schema) {
        return (input.plugins ?? []).reduce((current, plugin) => plugin.beforeCompile?.(current) ?? current, schema);
    }
    function applyAfterCompilePlugins(node) {
        return (input.plugins ?? []).reduce((current, plugin) => plugin.afterCompile?.(current) ?? current, node);
    }
    function compileSingleNode(schema, options) {
        const renderer = options.renderer;
        const path = options.path;
        const meta = buildCompiledMeta(schema, renderer, expressionCompiler);
        const propSource = {};
        const regions = {};
        const eventActions = {};
        const eventKeys = [];
        const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};
        for (const key of Object.keys(schema)) {
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
                regions[rule.regionKey ?? key] = createCompiledRegion(rule.regionKey ?? key, value, `${path}.${rule.regionKey ?? key}`, compileSchema);
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
        }
        const props = expressionCompiler.compileValue(propSource);
        const flags = {
            hasVisibilityRule: !!meta.visible,
            hasHiddenRule: !!meta.hidden,
            hasDisabledRule: !!meta.disabled,
            isContainer: Object.keys(regions).length > 0,
            isStatic: Object.values(meta).every((value) => isCompiledStatic(value)) &&
                props.kind === 'static' &&
                Object.values(regions).every((region) => region.node == null)
        };
        return {
            id: createNodeId(path, schema),
            type: schema.type,
            path,
            schema,
            component: renderer,
            meta,
            props,
            validation: renderer.scopePolicy === 'form'
                ? collectValidationModel(Object.values(regions)
                    .map((region) => region.node)
                    .filter((candidate) => candidate != null), {
                    defaultTriggers: normalizeValidationTriggers(schema.validateOn, ['blur']),
                    defaultShowErrorOn: normalizeValidationVisibilityTriggers(schema.showErrorOn, ['touched', 'submit'])
                })
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
    function compileSchema(schema, options = {}) {
        const prepared = applyBeforeCompilePlugins(schema);
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
                });
            });
            return enrichCompiledComponentTargets(applyAfterCompilePlugins(compiled));
        }
        const path = options.basePath ?? '$';
        const renderer = input.registry.get(prepared.type);
        if (!renderer) {
            throw new Error(`Renderer not found for type: ${prepared.type}`);
        }
        const wrappedRenderer = applyWrapComponentPlugins(renderer, input.plugins);
        return enrichCompiledComponentTargets(applyAfterCompilePlugins(compileSingleNode(prepared, {
            path,
            parentPath: options.parentPath,
            renderer: wrappedRenderer
        })));
    }
    return {
        compile: compileSchema,
        compileNode(schema, options) {
            return compileSingleNode(schema, options);
        }
    };
}
export function createValidationTraversalOrder(nodes, rootPath) {
    return buildCompiledValidationOrder(nodes, rootPath);
}
//# sourceMappingURL=schema-compiler.js.map