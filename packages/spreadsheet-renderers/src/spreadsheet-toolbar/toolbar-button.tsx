import type { ReactNode } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@nop-chaos/ui';

export interface ToolbarButtonProps {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'ghost' | 'outline';
  className?: string;
  active?: boolean;
  children?: ReactNode;
}

export function ToolbarButton(props: ToolbarButtonProps) {
  const button = (
    <Button
      variant={props.variant ?? 'ghost'}
      size="icon-sm"
      onClick={props.onClick}
      disabled={props.disabled}
      className={props.className}
      data-toolbar-active={props.active || undefined}
      aria-label={t(props.label)}
      title={t(props.label)}
    >
      {props.children ?? props.icon}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{t(props.label)}</TooltipContent>
    </Tooltip>
  );
}
