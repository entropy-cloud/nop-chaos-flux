import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import { formFieldRules } from '@nop-chaos/flux-renderers-form';
import { UploadFieldRenderer } from './upload-field.js';
import { imageFieldRules, type UploadResultItem } from './upload-schemas.js';
import type { ReactNode } from 'react';

function ImagePreview(props: { item: UploadResultItem; mode: 'thumbnail' | 'fill' }) {
  return (
    <img
      src={props.item.url}
      alt={props.item.name ?? 'uploaded image'}
      className={cn(
        'rounded border border-border object-cover',
        props.mode === 'fill' ? 'h-20 w-full' : 'size-12',
      )}
      data-testid="nop-input-image-thumbnail"
    />
  );
}

export function InputImageRenderer(props: RendererComponentProps) {
  const previewMode =
    props.props.previewMode === 'fill' ? 'fill' : 'thumbnail';
  const renderPreview = (item: UploadResultItem): ReactNode => (
    <ImagePreview item={item} mode={previewMode} />
  );
  return UploadFieldRenderer(props, {
    kind: 'image',
    marker: 'nop-input-image',
    renderPreview,
  });
}

export const inputImageRendererDefinition: RendererDefinition = {
  type: 'input-image',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: InputImageRenderer,
  fields: [...formFieldRules, ...imageFieldRules],
  validation: {
    kind: 'field',
    valueKind: 'scalar',
    getFieldPath(schema: BaseSchema) {
      return typeof schema.name === 'string' ? schema.name : undefined;
    },
    collectRules() {
      return [];
    },
  },
  componentCapabilityContracts: [
    {
      handle: 'clear',
      displayName: 'Clear',
      description: 'Clear the uploaded image value.',
    },
    {
      handle: 'focus',
      displayName: 'Focus',
      description: 'Focus the image upload trigger.',
    },
  ],
  wrap: true,
};
