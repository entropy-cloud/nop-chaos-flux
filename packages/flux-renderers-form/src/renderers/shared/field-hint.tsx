import { t } from '@nop-chaos/flux-i18n';
import { FieldError } from './error.js';
import { FieldHelpText } from './help-text.js';

export function FieldHint(props: {
  errorMessage?: string;
  validating?: boolean;
  showError?: boolean;
}) {
  if (props.errorMessage && props.showError) {
    return <FieldError>{props.errorMessage}</FieldError>;
  }

  if (props.validating) {
    return <FieldHelpText>{t('flux.common.validating')}</FieldHelpText>;
  }

  return null;
}
