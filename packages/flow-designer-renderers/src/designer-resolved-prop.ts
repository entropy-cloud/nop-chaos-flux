import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { DesignerPageSchema } from './schemas.js';

// WA-flowr-003 (plan 573): four renderer files hand-wrote the same
// resolved-prop reader; shared here so the resolved-props access seam stays
// single-sourced.
export function readDesignerResolvedProp<T>(
  props: RendererComponentProps<DesignerPageSchema>,
  key: string,
): T | undefined {
  return props.props[key] as T | undefined;
}
