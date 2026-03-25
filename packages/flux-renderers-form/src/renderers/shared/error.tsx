import type { ReactNode } from 'react';

export function FieldError(props: { children?: ReactNode }) {
  if (!props.children) {
    return null;
  }

  return <span className="na-field__error">{props.children}</span>;
}
