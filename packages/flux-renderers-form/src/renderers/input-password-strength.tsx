import { cn } from '@nop-chaos/ui';
import { t } from '@nop-chaos/flux-i18n';

type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_TEXT_KEYS: Record<PasswordStrengthLevel, string> = {
  0: 'flux.common.passwordStrengthTooShort',
  1: 'flux.common.passwordStrengthWeak',
  2: 'flux.common.passwordStrengthFair',
  3: 'flux.common.passwordStrengthGood',
  4: 'flux.common.passwordStrengthStrong',
};

const LEVEL_FILL_CLASS: Record<PasswordStrengthLevel, string> = {
  0: 'bg-destructive',
  1: 'bg-destructive',
  2: 'bg-warning',
  3: 'bg-success',
  4: 'bg-success',
};

/**
 * Strength level of a non-empty password (docs/components/input-password/design.md §4).
 * Length reads JS `.length` (UTF-16 code units): empty → 0 (renderer hides the meter),
 * length < 6 → 0 (too short), otherwise max(1, met-criteria count) with criteria
 * length ≥ 8 / both letter cases / digit / non-alphanumeric symbol.
 */
export function computePasswordStrengthLevel(value: string): PasswordStrengthLevel {
  if (value.length === 0 || value.length < 6) {
    return 0;
  }
  let count = 0;
  if (value.length >= 8) {
    count += 1;
  }
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
    count += 1;
  }
  if (/[0-9]/.test(value)) {
    count += 1;
  }
  if (/[^a-zA-Z0-9]/.test(value)) {
    count += 1;
  }
  return Math.max(1, count) as PasswordStrengthLevel;
}

export function PasswordStrengthMeter({ value }: { value: string }) {
  const level = computePasswordStrengthLevel(value);
  const filled = Math.max(1, level);
  const levelText = t(LEVEL_TEXT_KEYS[level]);

  return (
    <div
      className="nop-input-password-strength flex items-center gap-2"
      data-slot="input-password-strength"
      role="meter"
      aria-label={t('flux.common.passwordStrength')}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={level}
      aria-valuetext={levelText}
    >
      {Array.from({ length: 4 }, (_, index) => (
        <span
          key={index}
          data-slot="input-password-strength-segment"
          aria-hidden
          className={cn(
            'h-1 flex-1 rounded-full',
            index < filled ? LEVEL_FILL_CLASS[level] : 'bg-muted',
          )}
        />
      ))}
      <span
        data-slot="input-password-strength-label"
        className="text-xs text-muted-foreground tabular-nums"
      >
        {levelText}
      </span>
    </div>
  );
}
