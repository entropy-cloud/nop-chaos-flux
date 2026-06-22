import type { RefObject } from 'react';

export type InputModeValue =
  | 'none'
  | 'text'
  | 'tel'
  | 'url'
  | 'email'
  | 'numeric'
  | 'decimal'
  | 'search';

const INPUT_TYPE_INPUT_MODE_MAP: Record<string, InputModeValue | undefined> = {
  email: 'email',
  tel: 'tel',
  search: 'search',
  url: 'url',
};

export function resolveInputMode(
  inputType: string,
  override?: unknown,
): InputModeValue | undefined {
  if (typeof override === 'string' && override.length > 0) {
    return override as InputModeValue;
  }
  return INPUT_TYPE_INPUT_MODE_MAP[inputType];
}

export function scrollFocusedControlIntoView(
  isMobile: boolean,
  el: HTMLElement | null,
): void {
  if (!isMobile || !el) {
    return;
  }
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

export function scrollRefIntoViewOnMobile(
  isMobile: boolean,
  ref: RefObject<HTMLElement | null>,
): void {
  scrollFocusedControlIntoView(isMobile, ref.current);
}

export const MOBILE_CHOICE_STACK_THRESHOLD = 3;

export function shouldStackChoicesVertically(
  isMobile: boolean,
  optionCount: number,
): boolean {
  return isMobile && optionCount > MOBILE_CHOICE_STACK_THRESHOLD;
}
