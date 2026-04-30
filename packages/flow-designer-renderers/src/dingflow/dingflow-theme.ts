import type { CSSProperties } from 'react';

export const DINGFLOW_CONNECTOR_COLOR = 'var(--fd-edge-stroke, #cacaca)';

export const DINGFLOW_PLUS_BUTTON_CLASSNAME = [
  'flex items-center justify-center rounded-full',
  'bg-[var(--fd-primary,#3296fa)] text-primary-foreground',
  'shadow-[0_2px_4px_color-mix(in_srgb,var(--fd-primary,#3296fa)_40%,transparent)]',
].join(' ');

export const DINGFLOW_CONDITION_BADGE_CLASSNAME = [
  'cursor-pointer whitespace-nowrap rounded-[20px] px-[14px] py-[4px] text-xs',
  'border border-[var(--fd-success-border,#b3e19d)]',
  'bg-[var(--fd-success-bg,#ffffff)] text-[var(--fd-success-text,#67c23a)]',
].join(' ');

export const DINGFLOW_EDGE_LABEL_STYLE: CSSProperties = {
  fontSize: 12,
  background: 'var(--fd-panel-bg, var(--nop-surface, #fff))',
  border: '1px solid var(--fd-border, var(--nop-border, #e0e0e0))',
  borderRadius: 9999,
  padding: '2px 8px',
  pointerEvents: 'all',
};
