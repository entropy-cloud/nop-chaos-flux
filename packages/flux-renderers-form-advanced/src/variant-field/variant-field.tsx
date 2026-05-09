import React from 'react';
import type {
  AdapterDispatch,
  ActionSchema,
  BaseSchema,
  RendererComponentProps,
  RendererDefinition,
  SchemaObject,
} from '@nop-chaos/flux-core';
import { actionAdapter, getIn } from '@nop-chaos/flux-core';
import {
  FieldFrame,
  useCurrentForm,
  useCurrentValidationScope,
  useRenderScope,
  useScopeSelector,
  useCurrentFormState,
  toFieldRemarkProps,
} from '@nop-chaos/flux-react';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
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
import type { VariantFieldSchema, VariantOption } from '../composite-field/composite-schemas.js';
import { formLabelFieldRule, resolveFieldLabelContent } from '@nop-chaos/flux-renderers-form';
import {
  detectMatchedVariant,
  extractDetectedVariant,
  resolveInitialVariant,
} from './variant-field-matching.js';
import { createVariantFormProxy, createVariantScope } from './variant-field-runtime.js';
import { createProjectedValidationRuntime } from '../detail-view/projected-validation-runtime.js';

function resolveVariantFrameWrap(
  frameWrap: boolean | 'label' | 'group' | 'none' | undefined,
): 'label' | 'group' | 'none' {
  if (frameWrap === false || frameWrap === 'none') {
    return 'none';
  }

  if (frameWrap === 'group') {
    return 'group';
  }

  return 'label';
}

function asReactNode(value: unknown): React.ReactNode {
  return value as React.ReactNode;
}

type BaseNodeInstance = RendererComponentProps['node'];

type VariantResolvedOption = VariantOption & {
  contentRegionKey?: string;
  viewerRegionKey?: string;
};

function collectNamedChildPaths(input: VariantOption['content']): string[] {
  const nodes = Array.isArray(input) ? input : [input];
  const names = new Set<string>();

  for (const node of nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      continue;
    }

    const candidateName = (node as { name?: unknown }).name;
    if (typeof candidateName === 'string' && candidateName.length > 0) {
      names.add(candidateName);
    }
  }

  return Array.from(names);
}

function collectNamedChildPathsFromTemplateNode(
  templateNode:
    | import('@nop-chaos/flux-core').TemplateNode
    | readonly import('@nop-chaos/flux-core').TemplateNode[]
    | null
    | undefined,
): string[] {
  const nodes = Array.isArray(templateNode) ? templateNode : templateNode ? [templateNode] : [];
  const names = new Set<string>();

  for (const node of nodes) {
    const candidateName = (node.schema as { name?: unknown }).name;
    if (typeof candidateName === 'string' && candidateName.length > 0) {
      names.add(candidateName);
    }
  }

  return Array.from(names);
}

function injectDetectVariantArgs(
  actionSchema: ActionSchema | ActionSchema[],
  payload: { value: unknown; variants: string[] },
): ActionSchema | ActionSchema[] {
  const schemaPayload = payload as SchemaObject;

  if (Array.isArray(actionSchema)) {
    return actionSchema.map((entry) =>
      entry.args === undefined ? { ...entry, args: schemaPayload } : entry,
    );
  }

  return actionSchema.args === undefined ? { ...actionSchema, args: schemaPayload } : actionSchema;
}

export function VariantFieldRenderer(props: RendererComponentProps<VariantFieldSchema>) {
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentScope = useRenderScope();
  const schemaProps = props.props;
  const name = String(schemaProps.name ?? '');
  const readOnly = Boolean(schemaProps.readOnly);
  const variants = React.useMemo(
    () => ((schemaProps.variants ?? []) as VariantResolvedOption[]),
    [schemaProps.variants],
  );
  const selectorMode =
    (schemaProps.selector as { mode?: string } | undefined)?.mode ??
    schemaProps.selectorMode ??
    'tabs';
  const defaultVariant = schemaProps.defaultVariant;

  const rawValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is,
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const currentValue = parentForm ? rawValue : scopeValue;

  const labelContent = resolveFieldLabelContent(props);
  const effectiveDisabled = Boolean(props.meta.disabled);

  const matchedKey = detectMatchedVariant(
    variants,
    currentValue,
    props.helpers.evaluate,
    parentScope,
    props.helpers.createScope,
  );
  const initialKey = resolveInitialVariant(
    variants,
    currentValue,
    defaultVariant,
    props.helpers.evaluate,
    parentScope,
    props.helpers.createScope,
  );
  const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
  const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);
  const detectRequestIdRef = React.useRef(0);
  const switchRequestIdRef = React.useRef(0);

  const activeKey = React.useMemo(() => {
    if (userSelectedKey) return userSelectedKey;
    if (matchedKey) return matchedKey;
    if (detectedKey) return detectedKey;
    return initialKey;
  }, [matchedKey, userSelectedKey, detectedKey, initialKey]);

  React.useEffect(() => {
    if (userSelectedKey && matchedKey === userSelectedKey) {
      setUserSelectedKey(undefined);
    }
  }, [matchedKey, userSelectedKey]);

  const activeOption = variants.find((v) => v.key === activeKey) ?? variants[0];

  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runDetectVariantAction = React.useCallback(async () => {
    const requestId = ++detectRequestIdRef.current;

    if (!schemaProps.detectVariantAction || matchedKey) {
      if (mountedRef.current && requestId === detectRequestIdRef.current) {
        setDetectedKey(undefined);
      }
      return;
    }

    try {
      const result = await props.helpers.dispatch(
        injectDetectVariantArgs(schemaProps.detectVariantAction, {
          value: currentValue,
          variants: variants.map((variant) => variant.key),
        }),
        {
          scope: parentScope,
          form: parentForm ?? undefined,
          page: undefined,
          nodeInstance: props.node as BaseNodeInstance,
        },
      );

      if (!mountedRef.current || requestId !== detectRequestIdRef.current) {
        return;
      }

      if (!result.ok) {
        setDetectedKey(undefined);
        return;
      }

      const nextKey = extractDetectedVariant(result.data);
      setDetectedKey(
        nextKey && variants.some((variant) => variant.key === nextKey) ? nextKey : undefined,
      );
    } catch (error: unknown) {
      if (!mountedRef.current || requestId !== detectRequestIdRef.current) {
        return;
      }

      setDetectedKey(undefined);
      console.warn('[variant-field] detectVariantAction failed', error);
    }
  }, [
    currentValue,
    matchedKey,
    parentForm,
    parentScope,
    props.helpers,
    props.node,
    schemaProps.detectVariantAction,
    variants,
  ]);

  const triggerDetectVariantAction = React.useCallback(() => {
    runDetectVariantAction().catch((error: unknown) => {
      console.warn('[variant-field] unexpected detectVariantAction failure', error);
    });
  }, [runDetectVariantAction]);

  React.useEffect(() => {
    triggerDetectVariantAction();
  }, [triggerDetectVariantAction]);

  const handleVariantSwitch = React.useCallback(
    async (key: string) => {
      if (key === activeKey) return;

      const requestId = ++switchRequestIdRef.current;

      if (parentForm) {
        parentForm.clearErrors(name);
      }

      const nextOption = variants.find((v) => v.key === key);
      if (nextOption && parentForm && name) {
        let nextValue = nextOption.initialValue !== undefined ? nextOption.initialValue : null;

        if (nextOption.transformInAction) {
          const dispatchAction: AdapterDispatch = (action, ctx) =>
            props.helpers.dispatch(action, {
              scope: ctx?.scope ?? parentScope,
              form: ctx?.form ?? parentForm,
              page: undefined,
              nodeInstance: props.node as BaseNodeInstance,
            });

          const adapter = actionAdapter(
            nextOption.transformInAction,
            undefined,
            undefined,
            dispatchAction,
          );

          const migratedValue = await adapter.in(currentValue, {
            name: key,
            readOnly,
            scope: parentScope,
            form: parentForm,
          });

          if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
            return;
          }

          nextValue = (migratedValue as VariantOption['initialValue']) ?? null;
        }

        if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
          return;
        }

        parentForm.setValue(name, nextValue);
        parentForm.touchField(name);
      }

      if (!mountedRef.current || requestId !== switchRequestIdRef.current) {
        return;
      }

      setUserSelectedKey(key);
    },
    [
      activeKey,
      currentValue,
      name,
      parentForm,
      parentScope,
      props.helpers,
      props.node,
      readOnly,
      variants,
    ],
  );

  const triggerVariantSwitch = React.useCallback(
    (key: string) => {
      handleVariantSwitch(key).catch((error: unknown) => {
        console.warn('[variant-field] variant switch failed', error);
      });
    },
    [handleVariantSwitch],
  );

  const activeContentRegion =
    typeof activeOption?.contentRegionKey === 'string'
      ? props.regions[activeOption.contentRegionKey]
      : undefined;
  const activeViewerRegion =
    typeof activeOption?.viewerRegionKey === 'string'
      ? props.regions[activeOption.viewerRegionKey]
      : undefined;

  const variantScope = React.useMemo(
    () => createVariantScope(parentScope, name, activeKey, readOnly),
    [activeKey, name, parentScope, readOnly],
  );

  const variantForm = React.useMemo(
    () => (parentForm ? createVariantFormProxy(parentForm, name) : undefined),
    [parentForm, name],
  );
  const variantValidationOwner = React.useMemo(() => {
    if (parentForm || !parentValidationOwner || !name) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: name,
      scalarValueAlias: 'value',
      prefixPath(path) {
        if (!path || path === 'value') {
          return name;
        }

        return path.startsWith('value.') ? `${name}.${path.slice('value.'.length)}` : `${name}.${path}`;
      },
    });
  }, [name, parentForm, parentValidationOwner]);

  const hiddenVariantChildPaths = React.useMemo(
    () =>
      variants
        .filter((variant) => variant.key !== activeKey)
        .flatMap((variant) => {
          const region =
            typeof variant.contentRegionKey === 'string'
              ? props.regions[variant.contentRegionKey]
              : undefined;

          return collectNamedChildPathsFromTemplateNode(region?.templateNode).length > 0
            ? collectNamedChildPathsFromTemplateNode(region?.templateNode)
            : collectNamedChildPaths(variant.content);
        }),
    [activeKey, props.regions, variants],
  );

  React.useLayoutEffect(() => {
    const owner = parentForm ?? parentValidationOwner;

    if (!owner || !name) {
      return;
    }

    for (const hiddenPath of hiddenVariantChildPaths) {
      owner.notifyFieldHidden(`${name}.${hiddenPath}`, true);
    }

    return () => {
      for (const hiddenPath of hiddenVariantChildPaths) {
        owner.notifyFieldHidden(`${name}.${hiddenPath}`, false);
      }
    };
  }, [hiddenVariantChildPaths, name, parentForm, parentValidationOwner]);

  React.useEffect(() => {
    const owner = parentForm ?? parentValidationOwner;
    const childOwner = parentForm ? variantForm : variantValidationOwner;

    if (!owner || !childOwner || !name) {
      return;
    }

    const childOwnerId = `${owner.scopeId}:${name}:variant-field`;

    owner.registerChildContract({
      childOwnerId,
      mode: 'recurse-submit',
      active: true,
      unregister() {
        owner.unregisterChildContract(childOwnerId);
      },
      getState() {
        const state = childOwner.getScopeState();
        return {
          ready: state.ready,
          validating: state.validating,
          valid: state.valid,
          hasErrors: state.hasErrors,
        };
      },
      async triggerValidation() {
        const result = await childOwner.validateAll('submit');
        return {
          ok: result.ok,
          errors: result.errors,
        };
      },
    });

    return () => {
      owner.unregisterChildContract(childOwnerId);
    };
  }, [name, parentForm, parentValidationOwner, variantForm, variantValidationOwner]);

  const renderSelector = () => {
    if (readOnly || effectiveDisabled) return null;

    if (selectorMode === 'select') {
      return (
        <div data-slot="variant-field-selector">
          <Select
            value={activeKey ?? ''}
            onValueChange={(value) => {
              if (value) triggerVariantSwitch(value);
            }}
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
                  <ValidationContext.Provider value={variantValidationOwner}>
                    {asReactNode(activeContentRegion?.render())}
                  </ValidationContext.Provider>
                </ScopeContext.Provider>
              </FormContext.Provider>
        </div>
      );
    }

    return (
      <div data-slot="variant-field-selector">
        <Tabs
          value={activeKey ?? ''}
          onValueChange={(value) => {
            triggerVariantSwitch(value);
          }}
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
                    <ValidationContext.Provider value={variantValidationOwner}>
                      {asReactNode(activeContentRegion?.render())}
                    </ValidationContext.Provider>
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
              <ValidationContext.Provider value={variantValidationOwner}>
                {asReactNode((activeViewerRegion ?? activeContentRegion)?.render())}
              </ValidationContext.Provider>
            </ScopeContext.Provider>
          </FormContext.Provider>
        </div>
    );
  };

  const labelAlignValue = schemaProps.labelAlign as
    | 'top'
    | 'left'
    | 'right'
    | 'inherit'
    | undefined;
  const remarkValue =
    typeof schemaProps.remark === 'object' && schemaProps.remark !== null
      ? toFieldRemarkProps(schemaProps.remark as Parameters<typeof toFieldRemarkProps>[0])
      : undefined;
  const labelRemarkValue =
    typeof schemaProps.labelRemark === 'object' && schemaProps.labelRemark !== null
      ? toFieldRemarkProps(schemaProps.labelRemark as Parameters<typeof toFieldRemarkProps>[0])
      : undefined;

  const frameWrapMode = resolveVariantFrameWrap(schemaProps.frameWrap);

  const body = (
    <div data-slot="variant-field-body" data-active-variant={activeKey}>
      {renderSelector()}
      {renderReadOnlyContent()}
    </div>
  );

  if (frameWrapMode === 'none') {
    return (
      <div
        data-slot="variant-field-body"
        data-active-variant={activeKey}
        className={props.meta.className}
        data-testid={props.meta.testid}
        data-cid={props.meta.cid}
      >
        {renderSelector()}
        {renderReadOnlyContent()}
      </div>
    );
  }

  return (
    <FieldFrame
      name={name || undefined}
      label={labelContent}
      required={Boolean(schemaProps.required) || undefined}
      hint={schemaProps.hint as string | undefined}
      description={schemaProps.description as string | undefined}
      remark={remarkValue}
      labelRemark={labelRemarkValue}
      labelAlign={labelAlignValue === 'inherit' ? undefined : labelAlignValue}
      labelWidth={schemaProps.labelWidth as string | number | undefined}
      rootTag="div"
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={props.meta.frameClassName}
      testid={props.meta.testid}
      cid={props.meta.cid}
      rootProps={{ 'data-active-variant': activeKey, 'data-frame-wrap': frameWrapMode }}
    >
      {body}
    </FieldFrame>
  );
}

export const variantFieldRendererDefinition: RendererDefinition<VariantFieldSchema> = {
  type: 'variant-field',
  component: VariantFieldRenderer,
  fields: [
    formLabelFieldRule,
    { key: 'variants', kind: 'prop' },
    { key: 'selector', kind: 'prop' },
    { key: 'selectorMode', kind: 'prop' },
    { key: 'defaultVariant', kind: 'prop' },
    { key: 'detectVariantAction', kind: 'prop' },
    { key: 'transformInAction', kind: 'prop' },
    { key: 'transformOutAction', kind: 'prop' },
    { key: 'validateValueAction', kind: 'prop' },
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
    },
  },
};
