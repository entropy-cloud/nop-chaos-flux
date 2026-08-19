import { Button } from '@nop-chaos/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface StepperButtonProps {
  direction: 'up' | 'down';
  label: string;
  onClick: () => void;
  testid?: string;
}

export function StepperButton({ direction, label, onClick, testid }: StepperButtonProps) {
  const Icon = direction === 'up' ? ChevronUp : ChevronDown;
  return (
    <Button
      type="button"
      size="icon-xs"
      variant="ghost"
      aria-label={label}
      data-testid={testid}
      className="size-5 p-0"
      onClick={onClick}
    >
      <Icon className="size-3.5" />
    </Button>
  );
}