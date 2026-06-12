import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { Button, cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';
import type { ScopeDebugSchema } from './schemas.js';

const OMIT = Symbol('scope-debug-omit');

type SanitizedDebugValue =
  | null
  | boolean
  | number
  | string
  | SanitizedDebugValue[]
  | { [key: string]: SanitizedDebugValue };

function sanitizeDebugValue(
  value: unknown,
  seen: WeakSet<object>,
  inArray: boolean,
): SanitizedDebugValue | typeof OMIT {
  if (value === undefined) {
    return inArray ? null : OMIT;
  }

  if (typeof value === 'function') {
    return '@function';
  }

  if (typeof value === 'symbol') {
    return `@symbol:${String(value.description ?? '')}`;
  }

  if (typeof value === 'bigint') {
    return `@bigint:${value.toString()}`;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack ?? '',
    };
  }

  if (!value || typeof value !== 'object') {
    return value as SanitizedDebugValue;
  }

  if (seen.has(value)) {
    return '@circular';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => {
      const sanitized = sanitizeDebugValue(entry, seen, true);
      return sanitized === OMIT ? null : sanitized;
    });
  }

  const result: Record<string, SanitizedDebugValue> = {};

  for (const [key, entry] of Object.entries(value)) {
    const sanitized = sanitizeDebugValue(entry, seen, false);
    if (sanitized !== OMIT) {
      result[key] = sanitized;
    }
  }

  return result;
}

function stringifyDebugValue(value: unknown) {
  const seen = new WeakSet<object>();
  const sanitized = sanitizeDebugValue(value, seen, false);

  if (sanitized === OMIT) {
    return 'undefined';
  }

  return JSON.stringify(sanitized, null, 2);
}

export function ScopeDebugRenderer(props: RendererComponentProps<ScopeDebugSchema>) {
  const [expanded, setExpanded] = React.useState(props.props.defaultExpand === true);
  const title =
    typeof props.props.title === 'string' && props.props.title.length > 0
      ? props.props.title
      : 'Scope Debug';
  const dataPaths = Array.isArray(props.props.dataPaths)
    ? props.props.dataPaths.filter((path): path is string => typeof path === 'string' && path.length > 0)
    : undefined;
  const shouldSubscribe = expanded;
  const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData), Object.is, {
    enabled: shouldSubscribe,
    fallback: 'Expand to inspect scope.',
    paths: dataPaths,
  });

  return (
    <section
      className={cn('nop-scope-debug', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      <div data-slot="scope-debug-header">
        <span data-slot="scope-debug-kind">{t('flux.scopeDebug.debug')}</span>
        <h3 data-slot="scope-debug-title">{title}</h3>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => setExpanded((value) => !value)}
          data-slot="scope-debug-toggle"
          aria-expanded={expanded}
        >
          {expanded ? t('flux.scopeDebug.collapse') : t('flux.scopeDebug.expand')}
        </Button>
      </div>
      <div data-slot="scope-debug-body">
        <pre data-slot="scope-debug-json">{scopeText}</pre>
      </div>
    </section>
  );
}
