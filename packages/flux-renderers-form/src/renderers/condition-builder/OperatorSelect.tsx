import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nop-chaos/ui';
import type { ConditionOperatorInfo } from './operators';

interface OperatorSelectProps {
  operators: ConditionOperatorInfo[];
  value: string | undefined;
  onChange: (op: string) => void;
  disabled?: boolean;
}

export function OperatorSelect({ operators, value, onChange, disabled }: OperatorSelectProps) {
  if (operators.length === 0) return null;
  if (operators.length === 1) {
    return (
      <span className="inline-flex items-center h-7 px-2 text-xs text-muted-foreground bg-muted/50 rounded-md">
        {operators[0].label}
      </span>
    );
  }

  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="h-7 text-xs min-w-[80px] max-w-[120px]">
        <SelectValue placeholder="条件" />
      </SelectTrigger>
      <SelectContent>
        {operators.map((op) => (
          <SelectItem key={op.value} value={op.value}>
            {op.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
