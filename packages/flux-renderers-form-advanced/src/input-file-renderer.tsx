import type { BaseSchema, RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { formFieldRules } from '@nop-chaos/flux-renderers-form';
import { UploadFieldRenderer } from './upload-field.js';
import { uploadFieldRules } from './upload-schemas.js';

export function InputFileRenderer(props: RendererComponentProps) {
  return UploadFieldRenderer(props, { kind: 'file', marker: 'nop-input-file' });
}

export const inputFileRendererDefinition: RendererDefinition = {
  type: 'input-file',
  sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
  component: InputFileRenderer,
  fields: [...formFieldRules, ...uploadFieldRules],
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
      description: 'Clear the uploaded file value.',
    },
    {
      handle: 'focus',
      displayName: 'Focus',
      description: 'Focus the upload trigger.',
    },
  ],
  wrap: true,
};
