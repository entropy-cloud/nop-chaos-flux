import type { ReactNode } from 'react';

export function FieldLabel(props: {
  content?: ReactNode;
  as?: 'span' | 'legend';
}) {
  if (!props.content) {
    return null;
  }

  if (props.as === 'legend') {
    return <legend className="nop-field__label">{props.content}</legend>;
  }

  return <span className="nop-field__label">{props.content}</span>;
}
