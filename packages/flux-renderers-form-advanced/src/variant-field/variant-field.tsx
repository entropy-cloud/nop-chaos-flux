import React from 'react';
import type {
  BaseSchema,
  CompileSchemaOptions,
  RendererComponentProps,
  RendererDefinition,
  SchemaInput,
  TemplateNode,
  TemplateRegion,
} from '@nop-chaos/flux-core';
import { extractNestedSchemaRegions, getIn, isSchema, isSchemaArray } from '@nop-chaos/flux-core';
import {
  resolveRendererSlotContent,
  useCurrentForm,
  useCurrentFormState,
  useRenderFragment,
  useCurrentValidationScope,
  useRenderScope,
  useRendererRuntime,
  useScopeSelector,
} from '@nop-chaos/flux-react';
import { formFieldRules } from '@nop-chaos/flux-renderers-form';
import type { VariantFieldSchema } from '../composite-field/composite-schemas.js';
import { useVariantFieldController } from './variant-field-controller.js';
import type { VariantResolvedOption } from './variant-field-helpers.js';
import { useVariantFieldOwners } from './variant-field-owner.js';
import { VariantFieldView } from './variant-field-view.js';

export function VariantFieldRenderer(props: RendererComponentProps<VariantFieldSchema>) {
  const runtime = useRendererRuntime();
  const authoredSchema = props.templateNode.schema as VariantFieldSchema | undefined;
  const parentForm = useCurrentForm();
  const parentValidationOwner = useCurrentValidationScope();
  const parentScope = useRenderScope();
  const renderFragment = useRenderFragment();
  const schemaProps = props.props;
  const name = String(schemaProps.name ?? '');
  const readOnly = schemaProps.readOnly === true;
  const variants = React.useMemo(
    () => ((schemaProps.variants ?? []) as VariantResolvedOption[]),
    [schemaProps.variants],
  );
  const selectorMode =
    (schemaProps.selector as { mode?: string } | undefined)?.mode ?? schemaProps.selectorMode ?? 'tabs';
  const rawValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is,
    { enabled: Boolean(parentForm), path: name || undefined },
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is, {
    enabled: !parentForm,
    paths: name ? [name] : undefined,
  });
  const currentValue = parentForm ? rawValue : scopeValue;

  const { activeContentRegion, activeKey, activeViewerRegion, triggerVariantSwitch } =
    useVariantFieldController({
      currentValue,
      defaultVariant: schemaProps.defaultVariant,
      name,
      parentForm,
      parentScope,
      props,
      readOnly,
      runtimeNotify: runtime.env.notify,
      variants,
    });
  const { variantForm, variantScope, variantValidationOwner } = useVariantFieldOwners({
    name,
    activeKey,
    readOnly,
    parentForm,
    parentScope,
    parentValidationOwner,
    regions: props.regions,
    validationOwnerPlan: props.templateNode.validationOwnerPlan,
    variants,
  });
  const resolvedHintContent = resolveRendererSlotContent(props, 'hint');
  const resolvedDescriptionContent = resolveRendererSlotContent(props, 'description');
  const rawHintContent =
    isSchema(authoredSchema?.hint) || isSchemaArray(authoredSchema?.hint)
      ? authoredSchema.hint
      : resolvedHintContent;
  const rawDescriptionContent =
    isSchema(authoredSchema?.description) || isSchemaArray(authoredSchema?.description)
      ? authoredSchema.description
      : resolvedDescriptionContent;
  const toReactNode = (value: unknown): React.ReactNode => value as React.ReactNode;
  const renderSlotContent = (value: unknown): React.ReactNode => {
    if (isSchema(value) || isSchemaArray(value)) {
      return toReactNode(renderFragment(value));
    }

    return toReactNode(value);
  };
  const hintContent =
    renderSlotContent(rawHintContent);
  const descriptionContent = renderSlotContent(rawDescriptionContent);

  return (
    <VariantFieldView
      activeContentRegion={activeContentRegion}
      activeKey={activeKey}
      activeViewerRegion={activeViewerRegion}
      descriptionContent={descriptionContent}
      effectiveDisabled={schemaProps.disabled === true}
      hintContent={hintContent}
      meta={props.meta}
      onVariantSwitch={triggerVariantSwitch}
      readOnly={readOnly}
      schemaProps={schemaProps}
      selectorMode={selectorMode}
      variantForm={variantForm}
      variantScope={variantScope}
      variantValidationOwner={variantValidationOwner}
      variants={variants}
    />
  );
}

function normalizeVariantItems(
  value: unknown,
  path: string,
  regions: Record<string, TemplateRegion>,
  compileSchema: (
    input: SchemaInput,
    options?: CompileSchemaOptions,
    regionMeta?: { params?: readonly string[]; isolate?: boolean },
  ) => TemplateNode | TemplateNode[],
) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      return item;
    }

    const normalized = extractNestedSchemaRegions({
      candidate: item as Record<string, unknown>,
      itemRegionPath: `${path}.variants[${index}]`,
      itemRegionKeyPrefix: `variants.${index}`,
      rules: [
        {
          key: 'content',
          regionKeySuffix: 'content',
          compiledKey: 'contentRegionKey',
        },
        {
          key: 'viewer',
          regionKeySuffix: 'viewer',
          compiledKey: 'viewerRegionKey',
        },
      ],
      regions,
      compileSchema,
    }).value as Record<string, unknown>;

    const match = normalized.match as { kind?: unknown; when?: unknown } | undefined;
    if (!match || typeof match !== 'object' || Array.isArray(match)) {
      return normalized;
    }

    if (match.kind !== 'expression' || typeof match.when !== 'string') {
      return normalized;
    }

    return {
      ...normalized,
      match: {
        ...match,
        when: { __nopPreserveLiteral: true, value: match.when },
      },
    };
  });
}

export const variantFieldRendererDefinition: RendererDefinition<VariantFieldSchema> = {
  type: 'variant-field',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: VariantFieldRenderer,
  deepFields: [
    {
      key: 'variants',
      nestedRegions: [
        {
          key: 'content',
          regionKeySuffix: 'content',
          compiledKey: 'contentRegionKey',
        },
        {
          key: 'viewer',
          regionKeySuffix: 'viewer',
          compiledKey: 'viewerRegionKey',
        },
      ],
      normalize(input) {
        return normalizeVariantItems(input.value, input.path, input.regions, input.compileSchema);
      },
    },
  ],
  fields: [
    ...formFieldRules,
    { key: 'variants', kind: 'prop' },
    { key: 'selector', kind: 'prop' },
    { key: 'selectorMode', kind: 'prop' },
    { key: 'defaultVariant', kind: 'prop' },
    { key: 'detectVariantAction', kind: 'event' },
    { key: 'transformInAction', kind: 'ignored' },
    { key: 'transformOutAction', kind: 'ignored' },
    { key: 'validateValueAction', kind: 'ignored' },
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
