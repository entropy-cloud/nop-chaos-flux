import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils.js';
import { Button } from './button.js';
import { type InputProps } from './input.js';
import { Input } from './input.js';
import { Textarea } from './textarea.js';

// WA-ui-006: the addon's focus delegation addresses controls by registration
// (the module-owned control components self-register here), falling back to
// the `input-group-control` slot contract for foreign controls (command-style
// raw inputs). It must never address controls by tag name — that silently
// missed InputGroupTextarea.
// External refs are forwarded at mount only (React 19 ref-callback semantics:
// the registry delete is the detach — refs are not re-called with null on
// unmount), so consumers must not rely on unmount null-calls.
type InputGroupControlsRegistry = { current: Set<HTMLElement> };

const InputGroupControlsContext = React.createContext<InputGroupControlsRegistry | null>(null);

function focusFirstInputGroupControl(registry: InputGroupControlsRegistry | null, group: HTMLElement | null): void {
  const first = registry?.current.values().next().value;
  if (first) {
    first.focus();
    return;
  }
  group?.querySelector<HTMLElement>('[data-slot="input-group-control"]')?.focus();
}

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  const controlsRef = React.useRef<Set<HTMLElement>>(new Set());
  return (
    <InputGroupControlsContext.Provider value={controlsRef}>
      <div
        data-slot="input-group"
        role="group"
        className={cn(
          'nop-input-group ',
          'group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5',
          className,
        )}
        {...props}
      />
    </InputGroupControlsContext.Provider>
  );
}

const inputGroupAddonVariants = cva(
  // [G6-视角3-01] the addon is a focusable proxy for the input (tabIndex=0 +
  // Enter/Space focus delegation), so it must expose a visible focus state.
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground outline-none select-none focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]',
        'inline-end': 'order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]',
        'block-start':
          'order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2',
        'block-end':
          'order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) {
  const controlsRef = React.useContext(InputGroupControlsContext);
  return (
    <div
      role="group"
      tabIndex={0}
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        focusFirstInputGroupControl(controlsRef, e.currentTarget.parentElement);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          focusFirstInputGroupControl(controlsRef, e.currentTarget.parentElement);
        }
      }}
      {...props}
    />
  );
}

const inputGroupButtonVariants = cva('flex items-center gap-2 text-sm shadow-none', {
  variants: {
    size: {
      xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
      sm: '',
      'icon-xs': 'size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0',
      'icon-sm': 'size-8 p-0 has-[>svg]:p-0',
    },
  },
  defaultVariants: {
    size: 'xs',
  },
});

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'size' | 'type'> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: 'button' | 'submit' | 'reset';
  }) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, ref, ...props }: InputProps) {
  const controlsRef = React.useContext(InputGroupControlsContext);
  return (
    <Input
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        if (!node || !controlsRef) return;
        controlsRef.current.add(node);
        return () => {
          controlsRef.current.delete(node);
        };
      }}
      data-slot="input-group-control"
      className={cn(
        'flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

function InputGroupTextarea({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<'textarea'>) {
  const controlsRef = React.useContext(InputGroupControlsContext);
  return (
    <Textarea
      ref={(node) => {
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
        if (!node || !controlsRef) return;
        controlsRef.current.add(node);
        return () => {
          controlsRef.current.delete(node);
        };
      }}
      data-slot="input-group-control"
      className={cn(
        'flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent',
        className,
      )}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
