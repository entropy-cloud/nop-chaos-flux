import type { ReactNode } from 'react';

export function FieldError(props: { children?: ReactNode }) {
  if (!props.children) {
    return null;
  }

  return <span data-slot="field-error">{props.children}</span>;
}
