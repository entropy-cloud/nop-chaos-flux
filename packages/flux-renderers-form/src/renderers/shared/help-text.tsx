import type { ReactNode } from 'react';

export function FieldHelpText(props: { children?: ReactNode }) {
  if (!props.children) {
    return null;
  }

  return <span className="na-field__hint">{props.children}</span>;
}
