import type { ComponentType } from 'react';
import { t } from '@nop-chaos/flux-i18n';
import { Button, Separator } from '@nop-chaos/ui';
import { cn } from '@nop-chaos/ui';

export interface ToolbarButtonProps {
  icon?: ComponentType<{ className?: string }>;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  label?: string;
  testId?: string;
}

export function ToolbarButton({
  icon: Icon,
  onClick,
  active,
  disabled,
  title,
  label,
  testId,
}: ToolbarButtonProps) {
  const localizedTitle = t(title);
  const localizedLabel = label ? t(label) : undefined;
  if (label) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={onClick}
        disabled={disabled}
        title={localizedTitle}
        aria-pressed={active}
        data-testid={testId}
        className={cn('flex-shrink-0', active && 'bg-accent text-accent-foreground')}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span>{localizedLabel}</span>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      title={localizedTitle}
      aria-label={localizedTitle}
      aria-pressed={active}
      data-testid={testId}
      className={cn('flex-shrink-0', active && 'bg-accent text-accent-foreground')}
    >
      {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
    </Button>
  );
}

export function ToolbarSeparator() {
  return <Separator orientation="vertical" className="h-6 mx-1 flex-shrink-0" />;
}

export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}
