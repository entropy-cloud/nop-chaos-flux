import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils.js';
import { Spinner } from './spinner.js';

const buttonVariants = cva(
  // [G1-R2-视角3-02] pressed-state visual branches live in the VARIANT table
  // (below): consumers that emit `aria-pressed` / `data-active` (flux button
  // renderer) get a subtle pressed treatment consistent with each variant's
  // hover weight. Attribute-gated — buttons that never set the tokens render
  // byte-identical to before.
  "nop-haptic group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground [a]:hover:bg-primary/80 aria-pressed:bg-primary/85 data-active:bg-primary/85',
        // [G1-视角2-01][G7-视角2-01]: `primary` is the schema-facing main-action
        // convention (styling-system.md) — resolve it to the same filled weight
        // instead of falling out of the cva table as bare text.
        primary:
          'bg-primary text-primary-foreground [a]:hover:bg-primary/80 aria-pressed:bg-primary/85 data-active:bg-primary/85',
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground data-active:bg-muted data-active:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground aria-pressed:bg-secondary/80 data-active:bg-secondary/80',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground aria-pressed:bg-muted aria-pressed:text-foreground data-active:bg-muted data-active:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 aria-pressed:bg-destructive/20 data-active:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:aria-pressed:bg-destructive/30 dark:data-active:bg-destructive/30 dark:focus-visible:ring-destructive/40',
        link: 'text-primary underline-offset-4 hover:underline aria-pressed:opacity-70 data-active:opacity-70',
        info: 'bg-info text-info-foreground [a]:hover:bg-info/80 aria-pressed:bg-info/80 data-active:bg-info/80',
        success:
          'bg-success text-success-foreground [a]:hover:bg-success/80 aria-pressed:bg-success/80 data-active:bg-success/80',
        warning:
          'bg-warning text-warning-foreground [a]:hover:bg-warning/80 aria-pressed:bg-warning/80 data-active:bg-warning/80',
        danger:
          'bg-danger text-danger-foreground [a]:hover:bg-danger/80 aria-pressed:bg-danger/80 data-active:bg-danger/80',
        light:
          'bg-muted text-foreground hover:bg-muted/80 aria-pressed:bg-muted/80 data-active:bg-muted/80',
        dark: 'bg-foreground text-background hover:bg-foreground/80 aria-pressed:bg-foreground/80 data-active:bg-foreground/80',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonLoadingProps {
  /** Busy state: shows a leading Spinner, disables interaction, sets aria-busy. */
  loading?: boolean;
}

function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & ButtonLoadingProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      type={type}
      disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants };
