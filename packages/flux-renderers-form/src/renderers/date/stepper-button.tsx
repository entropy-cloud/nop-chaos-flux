import { Button } from '@nop-chaos/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface StepperButtonProps {
  direction: 'up' | 'down';
  label: string;
  onClick: () => void;
  testid?: string;
  /** [G2-R2-视角3-01] step channels must honor the disabled/readOnly gate. */
  disabled?: boolean;
}

export function StepperButton({ direction, label, onClick, testid, disabled }: StepperButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label={label}
      data-testid={testid}
      className="size-5 p-0"
      disabled={disabled || undefined}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}