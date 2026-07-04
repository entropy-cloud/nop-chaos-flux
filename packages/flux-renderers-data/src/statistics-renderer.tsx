import React from 'react';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';
import type { StatisticsSchema } from './schemas.js';

export function StatisticsRenderer(props: RendererComponentProps<StatisticsSchema>) {
  const total = props.props.total;
  return (
    <div
      className={cn('text-sm text-muted-foreground', props.meta.className)}
      data-slot="statistics-root"
    >
      {t('flux.pagination.total', { count: total ?? 0 })}
    </div>
  );
}
