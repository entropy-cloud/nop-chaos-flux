import { t } from '@nop-chaos/flux-i18n';
import { cn } from '@nop-chaos/ui';

type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

const LEVEL_ORDER: PasswordStrengthLevel[] = ['weak', 'fair', 'good', 'strong'];

const LEVEL_SEGMENT_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: 'bg-destructive',
  fair: 'bg-warning',
  good: 'bg-muted-foreground',
  strong: 'bg-success',
};

const LEVEL_LABEL_CLASS: Record<PasswordStrengthLevel, string> = {
  weak: 'text-destructive',
  fair: 'text-warning',
  good: 'text-muted-foreground',
  strong: 'text-success',
};

const LEVEL_LABEL_KEY: Record<PasswordStrengthLevel, string> = {
  weak: 'flux.common.pwdStrengthWeak',
  fair: 'flux.common.pwdStrengthFair',
  good: 'flux.common.pwdStrengthGood',
  strong: 'flux.common.pwdStrengthStrong',
};

// docs/components/input-password/design.md §4a: strong is evaluated before
// good's "len ≥ 10 with 2 classes" branch; both branches reach fair otherwise.
export function computePasswordStrength(value: string | undefined | null): PasswordStrengthLevel | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  const length = value.length;
  let classes = 0;
  if (/[a-z]/.test(value)) classes += 1;
  if (/[A-Z]/.test(value)) classes += 1;
  if (/[0-9]/.test(value)) classes += 1;
  if (/[^A-Za-z0-9]/.test(value)) classes += 1;
  if (length < 8 || classes <= 1) {
    return 'weak';
  }
  if (length >= 12 && classes >= 3) {
    return 'strong';
  }
  if ((length >= 8 && classes >= 3) || (length >= 10 && classes >= 2)) {
    return 'good';
  }
  return 'fair';
}

export function PasswordStrengthMeter(props: { level: PasswordStrengthLevel; describedById?: string }) {
  const levelIndex = LEVEL_ORDER.indexOf(props.level) + 1;
  return (
    <div
      data-slot="input-password-strength"
      role="meter"
      aria-label={t('flux.common.pwdStrengthLabel')}
      aria-valuemin={0}
      aria-valuemax={4}
      aria-valuenow={levelIndex}
      className="mt-1.5 flex items-center gap-2"
    >
      <div className="flex flex-1 gap-1">
        {LEVEL_ORDER.map((level) => {
          const active = LEVEL_ORDER.indexOf(level) < levelIndex;
          return (
            <span
              key={level}
              data-slot="input-password-strength-segment"
              data-level={level}
              data-active={active ? 'true' : 'false'}
              className={cn('h-1 flex-1 rounded-full bg-muted', active && LEVEL_SEGMENT_CLASS[props.level])}
            />
          );
        })}
      </div>
      <span
        id={props.describedById}
        data-slot="input-password-strength-label"
        aria-live="polite"
        className={cn('text-xs', LEVEL_LABEL_CLASS[props.level])}
      >
        {t(LEVEL_LABEL_KEY[props.level])}
      </span>
    </div>
  );
}
