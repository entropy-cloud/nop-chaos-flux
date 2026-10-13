import { useInputComponentHandle, type UseInputComponentHandleOptions } from '@nop-chaos/flux-react';

/**
 * Standard-field flavor of `useInputComponentHandle`: absorbs the per-renderer
 * boilerplate pair `isInteractive: () => presentation.interactive` /
 * `isVisible: () => props.meta.visible !== false` behind two value props. The
 * underlying hook re-stores its bindings on every commit, so the per-render
 * closures are exactly as fresh as the previous inline arrows.
 *
 * Variants stay expressible: `select` overrides `isInteractive` with its
 * effective-interactive gate; per-site `clearValue`/`resetValue` variants
 * (onChange(undefined) / onChange('') / ref initial restore) pass through
 * unchanged.
 */
interface UseStandardFieldHandleOptions
  extends Omit<UseInputComponentHandleOptions, 'isInteractive' | 'isVisible'> {
  /** `presentation.interactive` — default `isInteractive` binding. */
  interactive: boolean;
  /** `props.meta.visible !== false` — default `isVisible` binding. */
  visible: boolean;
  /** Override for non-standard interactive gates (e.g. select's effectiveInteractive). */
  isInteractive?: () => boolean;
  /** Override for non-standard visibility gates. */
  isVisible?: () => boolean;
}

export function useStandardFieldHandle(options: UseStandardFieldHandleOptions) {
  const { interactive, visible, isInteractive, isVisible, ...rest } = options;
  useInputComponentHandle({
    ...rest,
    isInteractive: isInteractive ?? (() => interactive),
    isVisible: isVisible ?? (() => visible),
  });
}
