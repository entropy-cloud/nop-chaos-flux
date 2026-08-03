import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { StatisticsSchema } from './schemas.js';

export function StatisticsRenderer(props: RendererComponentProps<StatisticsSchema>) {
  const total = props.props.total;
  return (
    <div
      className={cn('nop-statistics text-sm text-muted-foreground', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-slot="statistics-root"
      data-total={total ?? 0}
    >
      {t('flux.pagination.total', { count: total ?? 0 })}
    </div>
  );
}
