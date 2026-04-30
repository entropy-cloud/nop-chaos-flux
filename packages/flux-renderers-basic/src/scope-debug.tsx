import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ScopeDebugSchema } from './schemas';

function stringifyDebugValue(value: unknown) {
  const seen = new WeakSet<object>();
  const json = JSON.stringify(value, (_key, currentValue: unknown) => {
    if (currentValue === undefined) {
      return '[undefined]';
    }

    if (typeof currentValue === 'function') {
      return '[function]';
    }

    if (typeof currentValue === 'bigint') {
      return `${currentValue.toString()}n`;
    }

    if (currentValue instanceof Error) {
      return {
        name: currentValue.name,
        message: currentValue.message,
        stack: currentValue.stack,
      };
    }

    if (currentValue && typeof currentValue === 'object') {
      if (seen.has(currentValue as object)) {
        return '[circular]';
      }

      seen.add(currentValue as object);
    }

    return currentValue;
  });

  if (json === undefined) {
    return '{\n  "value": "[undefined]"\n}';
  }

  return JSON.stringify(JSON.parse(json), null, 2);
}

export function ScopeDebugRenderer(props: RendererComponentProps<ScopeDebugSchema>) {
  const title =
    typeof props.props.title === 'string' && props.props.title.length > 0
      ? props.props.title
      : 'Scope Debug';
  const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData));

  return (
    <section
      className={cn('nop-scope-debug', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <div data-slot="scope-debug-header">
        <span data-slot="scope-debug-kind">{t('flux.scopeDebug.debug')}</span>
        <h3 data-slot="scope-debug-title">{title}</h3>
      </div>
      <div data-slot="scope-debug-body">
        <pre data-slot="scope-debug-json">{scopeText}</pre>
      </div>
    </section>
  );
}
