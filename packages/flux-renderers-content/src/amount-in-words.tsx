import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { amountInWords } from '@nop-chaos/flux-core';
import { cn } from '@nop-chaos/ui';
import type { AmountInWordsSchema } from './schemas.js';

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

export function AmountInWordsRenderer(props: RendererComponentProps<AmountInWordsSchema>) {
  const value = props.props.value;
  const empty = isEmptyValue(value);
  const words = empty ? '' : amountInWords(value);
  const placeholder =
    typeof props.props.placeholder === 'string' && props.props.placeholder.length > 0
      ? props.props.placeholder
      : null;

  if (words === '') {
    return (
      <span
        data-testid={props.meta.testid || undefined}
        data-cid={props.meta.cid || undefined}
        data-slot="amount-in-words-root"
        data-state="empty"
        className={cn('nop-amount-in-words', props.meta.className)}
      >
        {placeholder}
      </span>
    );
  }

  return (
    <span
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="amount-in-words-root"
      data-state="resolved"
      className={cn('nop-amount-in-words', props.meta.className)}
    >
      {words}
    </span>
  );
}
