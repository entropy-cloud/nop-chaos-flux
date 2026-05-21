import React from 'react';
import type {
  FormRuntime,
  FrameWrapMode,
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
  descriptionContent: React.ReactNode;
  effectiveDisabled: boolean;
  hintContent: React.ReactNode;
  meta: ResolvedNodeMeta;
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
  descriptionContent,
  effectiveDisabled,
  hintContent,
  meta,
  onVariantSwitch,
  readOnly,
  schemaProps,
  selectorMode,
  variantForm,
  variantScope,
  variantValidationOwner,
  variants,
}: VariantFieldViewProps) {
  const frameWrap = schemaProps.frameWrap;
  const frameWrapMode: FrameWrapMode =
    frameWrap === false || frameWrap === 'none'
      ? 'none'
      : frameWrap === 'group'
        ? 'group'
        : 'label';
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
  return (
    (() => {
      const body = (
        <div
          data-slot="variant-field-body"
          data-active-variant={frameWrapMode === 'none' ? activeKey : undefined}
          className={cn('nop-variant-field', meta.className)}
          data-testid={frameWrapMode === 'none' ? meta.testid : undefined}
          data-cid={frameWrapMode === 'none' ? meta.cid : undefined}
          data-frame-wrap={schemaProps.frameWrap}
        >
          {renderSelector()}
          {renderReadOnlyContent()}
        </div>
      );

      if (frameWrapMode === 'none') {
        return body;
      }

      const labelAlign =
        schemaProps.labelAlign === 'inherit' ? undefined : schemaProps.labelAlign;
      const remark =
        typeof schemaProps.remark === 'object' && schemaProps.remark !== null
          ? toFieldRemarkProps(schemaProps.remark)
          : undefined;
      const labelRemark =
        typeof schemaProps.labelRemark === 'object' && schemaProps.labelRemark !== null
          ? toFieldRemarkProps(schemaProps.labelRemark)
          : undefined;

      return (
        <FieldFrame
          name={typeof schemaProps.name === 'string' ? schemaProps.name : undefined}
          label={schemaProps.label as React.ReactNode}
          required={schemaProps.required === true}
          hint={hintContent}
          description={descriptionContent}
          remark={remark}
          labelRemark={labelRemark}
          labelAlign={labelAlign}
          labelWidth={schemaProps.labelWidth}
          rootTag="div"
          layout={frameWrapMode === 'group' ? 'checkbox' : 'default'}
          className={meta.frameClassName}
          testid={meta.testid}
          cid={meta.cid}
          rootProps={{
            'data-active-variant': activeKey,
            'data-frame-wrap':
              typeof schemaProps.frameWrap === 'string' ? schemaProps.frameWrap : undefined,
          }}
        >
          {body}
        </FieldFrame>
      );
    })()
  );
}
