import React from 'react';
import type {
  BaseSchema,
  FormRuntime,
  FormStoreApi,
  FormStoreState,
  RendererComponentProps,
  RendererDefinition,
  ScopeRef
} from '@nop-chaos/flux-core';
import { getIn } from '@nop-chaos/flux-core';
import {
  FormContext,
  ScopeContext,
  useCurrentForm,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState
} from '@nop-chaos/flux-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@nop-chaos/ui';
import type { VariantFieldSchema, VariantOption } from './composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent, useFieldPresentation } from '../field-utils';
import { FieldHint, FieldLabel } from './shared';

function createVariantStore(parentStore: FormStoreApi, prefix: string): FormStoreApi {
  const prefixDot = prefix ? `${prefix}.` : '';
  let lastParentState: FormStoreState | undefined;
  let lastProjectedState: FormStoreState | undefined;

  function mapPath(path: string) {
    if (!path) {
      return '';
    }

    if (path === prefix) {
      return '';
    }

    if (prefixDot && path.startsWith(prefixDot)) {
      return path.slice(prefixDot.length);
    }

    return undefined;
  }

  function projectState(state: FormStoreState): FormStoreState {
    if (state === lastParentState && lastProjectedState !== undefined) {
      return lastProjectedState;
    }

    const subValue = prefix ? getIn(state.values, prefix) : state.values;
    const values = (subValue !== undefined ? subValue : null) as FormStoreState['values'];

    const errors: Record<string, any> = {};
    for (const [key, val] of Object.entries(state.errors)) {
      const mapped = mapPath(key);
      if (mapped === undefined) continue;
      errors[mapped] = (val as any[]).map((e: any) => ({
        ...e,
        path: mapPath(typeof e.path === 'string' ? e.path : '') ?? e.path,
        ownerPath: mapPath(typeof e.ownerPath === 'string' ? e.ownerPath : '') ?? e.ownerPath
      }));
    }

    const projectBoolMap = (map: Record<string, boolean>): Record<string, boolean> => {
      const result: Record<string, boolean> = {};
      for (const [key, val] of Object.entries(map)) {
        const mapped = mapPath(key);
        if (mapped !== undefined) {
          result[mapped] = val;
        }
      }
      return result;
    };

    const projected = {
      ...state,
      values,
      errors,
      validating: projectBoolMap(state.validating),
      touched: projectBoolMap(state.touched),
      dirty: projectBoolMap(state.dirty),
      visited: projectBoolMap(state.visited)
    };

    lastParentState = state;
    lastProjectedState = projected;
    return projected;
  }

  return {
    ...parentStore,
    getState() {
      return projectState(parentStore.getState());
    },
    subscribe(listener) {
      return parentStore.subscribe(listener);
    }
  };
}

function createVariantFormProxy(parentForm: FormRuntime, prefix: string): FormRuntime {
  function prefixPath(path: string) {
    if (!prefix) {
      return path;
    }

    return path ? `${prefix}.${path}` : prefix;
  }

  const variantStore = createVariantStore(parentForm.store, prefix);

  return {
    ...parentForm,
    get store() {
      return variantStore;
    },
    get validation() {
      return parentForm.validation;
    },
    get lifecycleState() {
      return parentForm.lifecycleState;
    },
    get modelGeneration() {
      return parentForm.modelGeneration;
    },
    get scopeId() {
      return parentForm.scopeId;
    },
    get rootPath() {
      return parentForm.rootPath;
    },
    get canSubmit() {
      return parentForm.canSubmit;
    },
    get allTouched() {
      return parentForm.allTouched;
    },
    isPathOwned(path) { return parentForm.isPathOwned(prefixPath(path)); },
    getFieldState(path) { return parentForm.getFieldState(prefixPath(path)); },
    validateAt(path, reason) { return parentForm.validateAt(prefixPath(path), reason); },
    validateField(path, reason) { return parentForm.validateField(prefixPath(path), reason); },
    getField(path) { return parentForm.getField(prefixPath(path)); },
    getDependents(path) { return parentForm.getDependents(prefixPath(path)); },
    findByPrefix(path) { return parentForm.findByPrefix(prefixPath(path)); },
    getChildren(path) { return parentForm.getChildren(prefixPath(path)); },
    getError(path) { return parentForm.getError(prefixPath(path)); },
    isValidating(path) { return parentForm.isValidating(prefixPath(path)); },
    isTouched(path) { return parentForm.isTouched(prefixPath(path)); },
    isDirty(path) { return parentForm.isDirty(prefixPath(path)); },
    isVisited(path) { return parentForm.isVisited(prefixPath(path)); },
    touchField(path) { parentForm.touchField(prefixPath(path)); },
    visitField(path) { parentForm.visitField(prefixPath(path)); },
    clearErrors(path) { parentForm.clearErrors(path === undefined ? undefined : prefixPath(path)); },
    setValue(path, value) { parentForm.setValue(prefixPath(path), value); },
    setValues(values) {
      const prefixed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(values)) {
        prefixed[prefixPath(key)] = value;
      }
      parentForm.setValues(prefixed);
    },
    appendValue(path, value) { parentForm.appendValue(prefixPath(path), value); },
    prependValue(path, value) { parentForm.prependValue(prefixPath(path), value); },
    insertValue(path, index, value) { parentForm.insertValue(prefixPath(path), index, value); },
    removeValue(path, index) { parentForm.removeValue(prefixPath(path), index); },
    moveValue(path, from, to) { parentForm.moveValue(prefixPath(path), from, to); },
    swapValue(path, a, b) { parentForm.swapValue(prefixPath(path), a, b); },
    replaceValue(path, value) { parentForm.replaceValue(prefixPath(path), value); },
    registerField(registration) {
      return parentForm.registerField({
        ...registration,
        path: prefixPath(registration.path),
        childPaths: registration.childPaths?.map((path) => prefixPath(path))
      });
    },
    notifyFieldHidden(path, hidden) { parentForm.notifyFieldHidden(prefixPath(path), hidden); },
    validateSubtree(path, reason) { return parentForm.validateSubtree(prefixPath(path), reason); }
  };
}

function createVariantScope(parentScope: ScopeRef, name: string): ScopeRef {
  return {
    id: `${parentScope.id}:variant:${name || 'root'}`,
    path: `${parentScope.path}.${name || '$value'}`,
    parent: parentScope.parent,
    store: parentScope.store,
    get value() {
      return this.readOwn();
    },
    get(path) {
      return path ? parentScope.get(name ? `${name}.${path}` : path) : parentScope.get(name);
    },
    has(path) {
      return path ? parentScope.has(name ? `${name}.${path}` : path) : parentScope.has(name);
    },
    readOwn() {
      return (parentScope.get(name) as Record<string, any>) ?? {};
    },
    read() {
      return (parentScope.get(name) as Record<string, any>) ?? {};
    },
    update(path, value) {
      parentScope.update(path ? (name ? `${name}.${path}` : path) : name, value);
    },
    merge(data) {
      if (name) {
        parentScope.update(name, data);
        return;
      }
      parentScope.merge(data);
    },
    replace(data) {
      parentScope.update(name, data);
    }
  };
}

function matchesVariant(option: VariantOption, value: unknown): boolean {
  const match = option.match;
  if (!match) return false;
  const kind = match.kind;
  if (kind === 'typeof') {
    return typeof value === match.value;
  }
  if (kind === 'array') {
    return Array.isArray(value);
  }
  if (kind === 'has-key') {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && match.key !== undefined && match.key in (value as object);
  }
  if (kind === 'shape') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Array.isArray(match.requiredKeys) ? (match.requiredKeys as string[]) : [];
    return keys.every((k) => k in (value as object));
  }
  return false;
}

function detectMatchedVariant(variants: VariantOption[], value: unknown): string | undefined {
  for (const option of variants) {
    if (option.match) {
      if (matchesVariant(option, value)) {
        return option.key;
      }
    }
  }
  return undefined;
}

function resolveInitialVariant(variants: VariantOption[], value: unknown, defaultVariant?: string): string | undefined {
  const matchedKey = detectMatchedVariant(variants, value);
  if (matchedKey) {
    return matchedKey;
  }
  if (defaultVariant && variants.some((v) => v.key === defaultVariant)) {
    return defaultVariant;
  }
  if (variants.length > 0) {
    return variants[0].key;
  }
  return undefined;
}

export function VariantFieldRenderer(props: RendererComponentProps<VariantFieldSchema>) {
  const parentForm = useCurrentForm();
  const parentScope = useRenderScope();
  const schema = props.schema as VariantFieldSchema;
  const name = String(props.props.name ?? schema.name ?? '');
  const readOnly = Boolean(props.props.readOnly ?? schema.readOnly);
  const variants = React.useMemo(() => (schema.variants ?? []) as VariantOption[], [schema.variants]);
  const selectorMode = (schema.selector as { mode?: string } | undefined)?.mode ?? 'tabs';
  const defaultVariant = schema.defaultVariant;

  const rawValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const currentValue = parentForm ? rawValue : scopeValue;

  const presentation = useFieldPresentation(name, parentForm, { readOnly });
  const labelContent = resolveFieldLabelContent(props);

  const matchedKey = detectMatchedVariant(variants, currentValue);
  const initialKey = resolveInitialVariant(variants, currentValue, defaultVariant);
  const [activeKey, setActiveKey] = React.useState<string | undefined>(initialKey);
  const activeOption = variants.find((v) => v.key === activeKey) ?? variants[0];

  React.useEffect(() => {
    if (matchedKey && matchedKey !== activeKey) {
      setActiveKey(matchedKey);
      return;
    }

    if (!activeKey) {
      setActiveKey(initialKey);
      return;
    }

  }, [matchedKey, activeKey, initialKey]);

  function handleVariantSwitch(key: string) {
    if (key === activeKey) return;

    if (parentForm) {
      parentForm.clearErrors(name);
    }

    const nextOption = variants.find((v) => v.key === key);
    if (nextOption && parentForm && name) {
      const initial = nextOption.initialValue !== undefined ? nextOption.initialValue : null;
      parentForm.setValue(name, initial);
      parentForm.touchField(name);
    }

    setActiveKey(key);
  }

  const activeContent = activeOption?.content ?? null;

  const variantScope = React.useMemo(
    () => createVariantScope(parentScope, name),
    [parentScope, name]
  );

  const variantForm = React.useMemo(
    () => (parentForm ? createVariantFormProxy(parentForm, name) : undefined),
    [parentForm, name]
  );

  const renderSelector = () => {
    if (readOnly || presentation.effectiveDisabled) return null;

    if (selectorMode === 'select') {
      return (
        <div data-slot="variant-field-selector">
          <Select
            value={activeKey ?? ''}
            onValueChange={(value) => { if (value) handleVariantSwitch(value); }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => (
                <SelectItem key={v.key} value={v.key}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormContext.Provider value={variantForm}>
            <ScopeContext.Provider value={variantScope}>
              {props.helpers.render(activeContent as any)}
            </ScopeContext.Provider>
          </FormContext.Provider>
        </div>
      );
    }

    return (
      <div data-slot="variant-field-selector">
        <Tabs
          value={activeKey ?? ''}
          onValueChange={handleVariantSwitch}
        >
          <TabsList>
            {variants.map((v) => (
              <TabsTrigger key={v.key} value={v.key}>
                {v.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {variants.map((v) => (
            <TabsContent key={v.key} value={v.key}>
              {v.key === activeKey ? (
                <FormContext.Provider value={variantForm}>
                  <ScopeContext.Provider value={variantScope}>
                    {props.helpers.render(activeContent as any)}
                  </ScopeContext.Provider>
                </FormContext.Provider>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  const renderReadOnlyContent = () => {
    if (!readOnly && !presentation.effectiveDisabled) return null;

    return (
      <div data-slot="variant-field-readonly-body">
        <FormContext.Provider value={variantForm}>
          <ScopeContext.Provider value={variantScope}>
            {props.helpers.render(activeContent as any)}
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
    );
  };

  return (
    <div
      className="nop-field"
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
      data-active-variant={activeKey}
    >
      <FieldLabel content={labelContent} />
      <div data-slot="field-control">
        {renderSelector()}
        {renderReadOnlyContent()}
      </div>
      <FieldHint
        errorMessage={presentation.fieldState.error?.message}
        showError={presentation.showError}
      />
    </div>
  );
}

export const variantFieldRendererDefinition: RendererDefinition = {
  type: 'variant-field',
  component: VariantFieldRenderer as any,
  regions: ['content'],
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
    getChildFieldPathPrefix(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    }
  }
};
