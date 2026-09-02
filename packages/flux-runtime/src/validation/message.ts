import type { CompiledFormValidationField, ValidationRule } from '@nop-chaos/flux-core';
import { formatRegistry, getMessageFormatter } from '@nop-chaos/flux-core';

export function buildValidationMessage(
  rule: ValidationRule,
  field: CompiledFormValidationField,
): string {
  const label = field.label ?? field.path;
  const t = getMessageFormatter();

  switch (rule.kind) {
    case 'required':
      return rule.message ?? t('validation.required', { label });
    case 'requiredRange':
      return rule.message ?? t('validation.requiredRange', { label });
    case 'minLength':
      return rule.message ?? t('validation.minLength', { label, min: rule.value });
    case 'maxLength':
      return rule.message ?? t('validation.maxLength', { label, max: rule.value });
    case 'minItems':
      return rule.message ?? t('validation.minItems', { label, min: rule.value });
    case 'maxItems':
      return rule.message ?? t('validation.maxItems', { label, max: rule.value });
    case 'atLeastOneFilled':
      return rule.message ?? t('validation.atLeastOneFilled', { label });
    case 'allOrNone':
      return rule.message ?? t('validation.allOrNone', { label });
    case 'uniqueBy':
      return rule.message ?? t('validation.uniqueBy', { label, field: rule.itemPath });
    case 'atLeastOneOf':
      return rule.message ?? t('validation.atLeastOneOf', { label });
    case 'pattern':
      return rule.message ?? t('validation.pattern', { label });
    case 'email':
      return rule.message ?? t('validation.email', { label });
    case 'url':
      return rule.message ?? t('validation.url', { label });
    case 'integer':
      return rule.message ?? t('validation.integer', { label });
    case 'format': {
      // Look up format message from registry using i18n key
      const formatValidator = formatRegistry.get(rule.value);
      if (formatValidator) {
        return rule.message ?? t(formatValidator.messageKey, { label });
      }
      return rule.message ?? t('validation.format', { label, format: rule.value });
    }
    case 'equalsField':
      return rule.message ?? t('validation.equalsField', { label, field: rule.path });
    case 'notEqualsField':
      return rule.message ?? t('validation.notEqualsField', { label, field: rule.path });
    case 'requiredWhen':
      return rule.message ?? t('validation.required', { label });
    case 'requiredUnless':
      return rule.message ?? t('validation.required', { label });
    case 'async':
      return rule.message ?? t('validation.async', { label });
  }
}
