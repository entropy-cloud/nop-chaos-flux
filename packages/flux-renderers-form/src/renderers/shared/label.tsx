import type { ReactNode } from 'react';

export function FieldLabel(props: { content?: ReactNode; as?: 'span' | 'legend'; htmlFor?: string }) {
  if (!props.content) {
    return null;
  }

  if (props.as === 'legend') {
    return <legend data-slot="field-label">{props.content}</legend>;
  }

  return <label data-slot="field-label" htmlFor={props.htmlFor}>{props.content}</label>;
}
