import { lazy, Suspense, type ReactNode, type ReactElement } from 'react';
import type { BaseSchema, RendererComponentProps, RendererResolvedProps } from '@nop-chaos/flux-core';
import { Spinner } from '@nop-chaos/ui';

export interface LazyRendererOptions {
  fallback?: ReactNode;
}

const defaultFallback = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '48px',
      padding: '12px',
    }}
  >
    <Spinner className="size-5" />
  </div>
);

export function createLazyRendererComponent<
  S extends BaseSchema = BaseSchema,
  P extends Record<string, unknown> = RendererResolvedProps<S>,
>(
  load: () => Promise<
    (props: RendererComponentProps<S, P>) => ReactElement | null
  >,
  options?: LazyRendererOptions,
): (props: RendererComponentProps<S, P>) => ReactElement | null {
  const LazyComp = lazy(() =>
    load().then((comp) => ({ default: comp })),
  );

  const fallback = options?.fallback ?? defaultFallback;

  return function LazyRendererComponent(
    props: RendererComponentProps<S, P>,
  ) {
    return (
      <Suspense fallback={fallback}>
        <LazyComp {...props} />
      </Suspense>
    );
  };
}
