import { FieldError } from './error';
import { FieldHelpText } from './help-text';

export function FieldHint(props: {
  errorMessage?: string;
  validating?: boolean;
  showError?: boolean;
}) {
  if (props.errorMessage && props.showError) {
    return <FieldError>{props.errorMessage}</FieldError>;
  }

  if (props.validating) {
    return <FieldHelpText>Validating...</FieldHelpText>;
  }

  return null;
}
