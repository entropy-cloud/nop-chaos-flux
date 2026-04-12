import React from 'react';
import type {
  BaseSchema,
  RendererComponentProps,
  RendererDefinition
} from '@nop-chaos/flux-core';
import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
import {
  useCurrentForm,
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

function detectVariant(variants: VariantOption[], value: unknown, defaultVariant?: string): string | undefined {
  for (const option of variants) {
    if (option.match) {
      if (matchesVariant(option, value)) {
        return option.key;
      }
    }
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
  const schema = props.schema as VariantFieldSchema;
  const name = String(props.props.name ?? schema.name ?? '');
  const readOnly = Boolean(props.props.readOnly ?? schema.readOnly);
  const variants = (schema.variants ?? []) as VariantOption[];
  const selectorMode = (schema.selector as { mode?: string } | undefined)?.mode ?? 'tabs';
  const defaultVariant = schema.defaultVariant;

  const rawValue = useCurrentFormState(
    (state) => (name ? (state.values as Record<string, unknown>)[name] : undefined),
    Object.is
  );
  const scopeValue = useScopeSelector((data) => (name ? (data as Record<string, unknown>)[name] : undefined), Object.is);
  const currentValue = parentForm ? rawValue : scopeValue;

  const presentation = useFieldPresentation(name, parentForm, { readOnly });
  const labelContent = resolveFieldLabelContent(props);

  const detectedKey = detectVariant(variants, currentValue, defaultVariant);
  const [activeKey, setActiveKey] = React.useState<string | undefined>(detectedKey);

  React.useEffect(() => {
    if (detectedKey && !activeKey) {
      setActiveKey(detectedKey);
    }
  }, [detectedKey, activeKey]);

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

  const activeOption = variants.find((v) => v.key === activeKey) ?? variants[0];

  const activeContent = activeOption
    ? resolveRendererSlotContent(props, `variant_${activeOption.key}`)
    : null;

  const renderSelector = () => {
    if (readOnly || presentation.effectiveDisabled) return null;

    if (selectorMode === 'select') {
      return (
        <Select
          value={activeKey ?? ''}
          onValueChange={(value) => { if (value) handleVariantSwitch(value); }}
        >
          <SelectTrigger className="nop-variant-field-selector">
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
      );
    }

    return (
      <Tabs
        value={activeKey ?? ''}
        onValueChange={handleVariantSwitch}
        className="nop-variant-field-tabs"
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
            {v.key === activeKey ? activeContent : null}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  const renderReadOnlyContent = () => {
    if (!readOnly && !presentation.effectiveDisabled) return null;

    return (
      <div className="nop-variant-field-readonly-body">
        {activeContent}
      </div>
    );
  };

  return (
    <div
      className={`nop-field nop-variant-field ${presentation.className}`}
      data-field-visited={presentation['data-field-visited']}
      data-field-touched={presentation['data-field-touched']}
      data-field-dirty={presentation['data-field-dirty']}
      data-field-invalid={presentation['data-field-invalid']}
      data-active-variant={activeKey}
    >
      <FieldLabel content={labelContent} />
      {renderSelector()}
      {renderReadOnlyContent()}
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
  regions: [],
  fields: [formLabelFieldRule],
  validation: {
    kind: 'field',
    valueKind: 'object',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    }
  }
};
