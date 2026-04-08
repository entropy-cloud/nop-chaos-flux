import type { ReactNode } from 'react';

export function FieldHelpText(props: { children?: ReactNode }) {
  if (!props.children) {
    return null;
  }

  return <span data-slot="field-hint">{props.children}</span>;
}
