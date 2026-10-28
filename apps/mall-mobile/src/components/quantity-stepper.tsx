export interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  atMinBehavior?: 'delete';
  onChange: (next: number) => void;
  onMinusAtMin?: () => void;
}

export function QuantityStepper({
  value,
  min = 1,
  max = 999,
  disabled = false,
  atMinBehavior = 'delete',
  onChange,
  onMinusAtMin,
}: QuantityStepperProps) {
  const atMin = value <= min;

  const handleDecrease = () => {
    if (disabled) return;
    if (atMin) {
      if (atMinBehavior === 'delete') onMinusAtMin?.();
      return;
    }
    onChange(Math.max(min, value - 1));
  };

  const handleIncrease = () => {
    if (disabled) return;
    if (value >= max) return;
    onChange(value + 1);
  };

  return (
    <div className="mall-stepper" data-testid="mall-stepper">
      <button
        type="button"
        className="mall-touch-target mall-stepper-btn"
        onClick={handleDecrease}
        disabled={disabled}
        aria-label="减少数量"
        data-testid="stepper-minus"
      >
        {atMin && atMinBehavior === 'delete' ? '🗑' : '−'}
      </button>
      <span className="mall-stepper-num" data-testid="stepper-value">
        {value}
      </span>
      <button
        type="button"
        className="mall-touch-target mall-stepper-btn"
        onClick={handleIncrease}
        disabled={disabled || value >= max}
        aria-label="增加数量"
        data-testid="stepper-plus"
      >
        +
      </button>
    </div>
  );
}
