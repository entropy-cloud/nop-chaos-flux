import React from 'react';
import type {
  FormRuntime,
  RendererComponentProps,
  RenderRegionHandle,
  ResolvedNodeMeta,
  ScopeRef,
  ValidationScopeRuntime,
} from '@nop-chaos/flux-core';
import { FieldFrame, toFieldRemarkProps } from '@nop-chaos/flux-react';
import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
import {
  cn,
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
import type { VariantFieldSchema } from '../composite-field/composite-schemas.js';
import type { VariantResolvedOption } from './variant-field-helpers.js';

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

function VariantFieldProviders({
  children,
  form,
  scope,
  validationOwner,
}: {
  children?: React.ReactNode;
  form: FormRuntime | undefined;
  scope: ScopeRef;
  validationOwner: ValidationScopeRuntime | undefined;
}) {
  return (
    <FormContext.Provider value={form}>
      <ScopeContext.Provider value={scope}>
        <ValidationContext.Provider value={validationOwner}>{children}</ValidationContext.Provider>
      </ScopeContext.Provider>
    </FormContext.Provider>
  );
}

interface VariantFieldViewProps {
  activeContentRegion: RenderRegionHandle | undefined;
  activeKey: string | undefined;
  activeViewerRegion: RenderRegionHandle | undefined;
  effectiveDisabled: boolean;
  labelContent: React.ReactNode;
  meta: ResolvedNodeMeta;
  name: string;
  onVariantSwitch: (key: string) => void;
  readOnly: boolean;
  schemaProps: RendererComponentProps<VariantFieldSchema>['props'];
  selectorMode: string;
  variantForm: FormRuntime | undefined;
  variantScope: ScopeRef;
  variantValidationOwner: ValidationScopeRuntime | undefined;
  variants: VariantResolvedOption[];
}

export function VariantFieldView({
  activeContentRegion,
  activeKey,
  activeViewerRegion,
  effectiveDisabled,
  labelContent,
  meta,
  name,
  onVariantSwitch,
  readOnly,
  schemaProps,
  selectorMode,
  variantForm,
  variantScope,
  variantValidationOwner,
  variants,
}: VariantFieldViewProps) {
  const renderActiveRegion = (region: RenderRegionHandle | undefined) => (
    <VariantFieldProviders form={variantForm} scope={variantScope} validationOwner={variantValidationOwner}>
      {asReactNode(region?.render())}
    </VariantFieldProviders>
  );

  const renderSelector = () => {
    if (readOnly || effectiveDisabled) {
      return null;
    }

    if (selectorMode === 'select') {
      return (
        <div data-slot="variant-field-selector">
          <Select
            value={activeKey ?? ''}
            onValueChange={(value) => {
              if (value) {
                onVariantSwitch(value);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variants.map((variant) => (
                <SelectItem key={variant.key} value={variant.key}>
                  {variant.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderActiveRegion(activeContentRegion)}
        </div>
      );
    }

    return (
      <div data-slot="variant-field-selector">
        <Tabs value={activeKey ?? ''} onValueChange={onVariantSwitch}>
          <TabsList>
            {variants.map((variant) => (
              <TabsTrigger key={variant.key} value={variant.key}>
                {variant.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {variants.map((variant) => (
            <TabsContent key={variant.key} value={variant.key}>
              {variant.key === activeKey ? renderActiveRegion(activeContentRegion) : null}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  const renderReadOnlyContent = () => {
    if (!readOnly && !effectiveDisabled) {
      return null;
    }

    return (
      <div data-slot="variant-field-readonly-body">
        {renderActiveRegion(activeViewerRegion ?? activeContentRegion)}
      </div>
    );
  };

  const labelAlignValue = schemaProps.labelAlign as 'top' | 'left' | 'right' | 'inherit' | undefined;
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
    <div
      data-slot="variant-field-body"
      data-active-variant={activeKey}
      className={cn('nop-variant-field', meta.className)}
    >
      {renderSelector()}
      {renderReadOnlyContent()}
    </div>
  );

  if (frameWrapMode === 'none') {
    return (
      <div
        data-slot="variant-field-body"
        data-active-variant={activeKey}
        className={cn('nop-variant-field', meta.className)}
        data-testid={meta.testid}
        data-cid={meta.cid}
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
      required={schemaProps.required === true || undefined}
      hint={schemaProps.hint as string | undefined}
      description={schemaProps.description as string | undefined}
      remark={remarkValue}
      labelRemark={labelRemarkValue}
      labelAlign={labelAlignValue === 'inherit' ? undefined : labelAlignValue}
      labelWidth={schemaProps.labelWidth as string | number | undefined}
      rootTag="div"
      layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
      className={meta.frameClassName}
      testid={meta.testid}
      cid={meta.cid}
      rootProps={{ 'data-active-variant': activeKey, 'data-frame-wrap': frameWrapMode }}
    >
      {body}
    </FieldFrame>
  );
}
