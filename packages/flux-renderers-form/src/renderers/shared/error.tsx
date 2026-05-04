import type { ReactNode } from 'react';

export function FieldError(props: { children?: ReactNode; id?: string }) {
  if (!props.children) {
    return null;
  }

  return (
    <span data-slot="field-error" id={props.id} role="alert" aria-live="assertive">
      {props.children}
    </span>
  );
}
