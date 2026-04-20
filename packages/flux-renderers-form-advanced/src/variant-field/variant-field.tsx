import React from 'react';
import type {
  ActionSchema,
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  SchemaObject,
} from '@nop-chaos/flux-core';
import { actionAdapter, getIn } from '@nop-chaos/flux-core';
import {
  FormContext,
  FieldFrame,
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
  TabsTrigger,
} from '@nop-chaos/ui';
import type { VariantFieldSchema, VariantOption } from '../composite-field/composite-schemas';
import { formLabelFieldRule, resolveFieldLabelContent } from '@nop-chaos/flux-renderers-form';
import { detectMatchedVariant, extractDetectedVariant, resolveInitialVariant } from './variant-field-matching';
import { createVariantFormProxy, createVariantScope } from './variant-field-runtime';

type BaseNodeInstance = RendererComponentProps['node'];

function injectDetectVariantArgs(
  actionSchema: ActionSchema | ActionSchema[],
  payload: { value: unknown; variants: string[] }
): ActionSchema | ActionSchema[] {
  const schemaPayload = payload as SchemaObject;

  if (Array.isArray(actionSchema)) {
    return actionSchema.map((entry) => (entry.args === undefined ? { ...entry, args: schemaPayload } : entry));
  }

  return actionSchema.args === undefined ? { ...actionSchema, args: schemaPayload } : actionSchema;
}


export function VariantFieldRenderer(props: RendererComponentProps<VariantFieldSchema>) {
  const parentForm = useCurrentForm();
  const parentScope = useRenderScope();
  const schema = props.schema as VariantFieldSchema;
  const name = String(props.props.name ?? '');
  const readOnly = Boolean(props.props.readOnly);
  const variants = React.useMemo(() => (schema.variants ?? []) as VariantOption[], [schema.variants]);
  const selectorMode = (schema.selector as { mode?: string } | undefined)?.mode ?? schema.selectorMode ?? 'tabs';
  const defaultVariant = schema.defaultVariant;

  const rawValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const currentValue = parentForm ? rawValue : scopeValue;

  const labelContent = resolveFieldLabelContent(props);
  const effectiveDisabled = Boolean(props.meta.disabled);

  const matchedKey = detectMatchedVariant(variants, currentValue, props.helpers.evaluate, parentScope, props.helpers.createScope);
  const initialKey = resolveInitialVariant(variants, currentValue, defaultVariant, props.helpers.evaluate, parentScope, props.helpers.createScope);
  const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
  const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);

  const activeKey = React.useMemo(() => {
    if (matchedKey) return matchedKey;
    if (userSelectedKey) return userSelectedKey;
    if (detectedKey) return detectedKey;
    return initialKey;
  }, [matchedKey, userSelectedKey, detectedKey, initialKey]);

  const activeOption = variants.find((v) => v.key === activeKey) ?? variants[0];

  const runDetectVariantAction = React.useCallback(
    async () => {
      if (!schema.detectVariantAction || matchedKey) {
        setDetectedKey(undefined);
        return;
      }

      const result = await props.helpers.dispatch(injectDetectVariantArgs(schema.detectVariantAction, {
        value: currentValue,
        variants: variants.map((variant) => variant.key)
      }), {
        scope: parentScope,
        form: parentForm ?? undefined,
        page: undefined,
        nodeInstance: props.node as BaseNodeInstance
      });

      if (!result.ok) {
        setDetectedKey(undefined);
        return;
      }

      const nextKey = extractDetectedVariant(result.data);
      setDetectedKey(nextKey && variants.some((variant) => variant.key === nextKey) ? nextKey : undefined);
    },
    [currentValue, matchedKey, parentForm, parentScope, props.helpers, props.node, schema.detectVariantAction, variants]
  );

  React.useEffect(() => {
    void runDetectVariantAction();
  }, [runDetectVariantAction]);

  async function handleVariantSwitch(key: string) {
    if (key === activeKey) return;

    if (parentForm) {
      parentForm.clearErrors(name);
    }

    const nextOption = variants.find((v) => v.key === key);
    if (nextOption && parentForm && name) {
      let nextValue = nextOption.initialValue !== undefined ? nextOption.initialValue : null;

      if (nextOption.transformInAction) {
        const adapter = actionAdapter(nextOption.transformInAction, undefined, undefined, (action, ctx) =>
          props.helpers.dispatch(action as any, {
            scope: ctx?.scope ?? parentScope,
            form: ctx?.form ?? parentForm,
            page: undefined,
            nodeInstance: props.node as BaseNodeInstance
          })
        );

        const migratedValue = await adapter.in(currentValue, {
          name: key,
          readOnly,
          scope: parentScope,
          form: parentForm
        });

        nextValue = (migratedValue as VariantOption['initialValue']) ?? null;
      }

      parentForm.setValue(name, nextValue);
      parentForm.touchField(name);
    }

    setUserSelectedKey(key);
  }

  const activeContent = activeOption?.content ?? null;
  const activeViewer = activeOption?.viewer ?? activeContent;

  const variantScope = React.useMemo(
    () => createVariantScope(parentScope, name, activeKey, readOnly),
    [activeKey, name, parentScope, readOnly]
  );

  const variantForm = React.useMemo(
    () => (parentForm ? createVariantFormProxy(parentForm, name) : undefined),
    [parentForm, name]
  );

  const renderSelector = () => {
    if (readOnly || effectiveDisabled) return null;

    if (selectorMode === 'select') {
      return (
        <div data-slot="variant-field-selector">
          <Select
            value={activeKey ?? ''}
            onValueChange={(value) => { if (value) void handleVariantSwitch(value); }}
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
          onValueChange={(value) => { void handleVariantSwitch(value); }}
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
    if (!readOnly && !effectiveDisabled) return null;

    return (
      <div data-slot="variant-field-readonly-body">
        <FormContext.Provider value={variantForm}>
          <ScopeContext.Provider value={variantScope}>
            {props.helpers.render(activeViewer as any)}
          </ScopeContext.Provider>
        </FormContext.Provider>
      </div>
    );
  };

  return (
    <FieldFrame
      name={name || undefined}
      label={labelContent}
      rootTag="div"
      className={props.meta.className}
      testid={props.meta.testid}
      cid={props.meta.cid}
      rootProps={{ 'data-active-variant': activeKey }}
    >
      {renderSelector()}
      {renderReadOnlyContent()}
    </FieldFrame>
  );
}

export const variantFieldRendererDefinition: RendererDefinition = {
  type: 'variant-field',
  component: VariantFieldRenderer as any,
  regions: ['content'],
  fields: [
    formLabelFieldRule,
    { key: 'variants', kind: 'ignored' },
    { key: 'selector', kind: 'ignored' },
    { key: 'defaultVariant', kind: 'ignored' },
    { key: 'detectVariantAction', kind: 'ignored' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' }
  ],
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
