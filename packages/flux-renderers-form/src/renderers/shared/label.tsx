import type { ReactNode } from 'react';

export function FieldLabel(props: {
  content?: ReactNode;
  as?: 'span' | 'legend';
}) {
  if (!props.content) {
    return null;
  }

  if (props.as === 'legend') {
    return <legend data-slot="field-label">{props.content}</legend>;
  }

  return <span data-slot="field-label">{props.content}</span>;
}
