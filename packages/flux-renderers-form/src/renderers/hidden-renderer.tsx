import type { RendererComponentProps, RendererDefinition } from '@nop-chaos/flux-core';
import { formFieldRules, useFormFieldFromProps } from '../field-utils.js';
import { useHiddenFieldPolicy } from '../field-utils/field-hidden-policy.js';
import type { HiddenSchema } from '../schemas.js';
import { validateHiddenFieldPolicySchema } from './hidden-field-policy-schema.js';
import { createFieldValidation } from './input.js';

export function validateHiddenFieldSchema(context: Parameters<typeof validateHiddenFieldPolicySchema>[0]) {
  validateHiddenFieldPolicySchema(context);
}

export function HiddenRenderer(props: RendererComponentProps<HiddenSchema>) {
  const name = String(props.props.name ?? '');
  const { value } = useFormFieldFromProps(props);
  useHiddenFieldPolicy(name, true);

  return <input type="hidden" name={name || undefined} value={String(value ?? '')} data-slot="hidden-input" />;
}

export const hiddenRendererDefinition: RendererDefinition = {
  type: 'hidden',
  displayName: 'Hidden',
  category: 'form',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  component: HiddenRenderer,
  fields: [...formFieldRules, { key: 'hiddenFieldPolicy', kind: 'prop' }],
  validation: createFieldValidation(),
  schemaValidator: validateHiddenFieldSchema,
};
