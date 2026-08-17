import React from 'react';
import type {
  RendererComponentProps,
  RendererRenderOutput,
  ResponsiveBreakpoint,
  ResponsiveSchema,
  ResponsiveVariantSchema,
} from '@nop-chaos/flux-core';
import { unwrapPreservedLiteral } from '@nop-chaos/flux-react';
import { cn, useBreakpoints } from '@nop-chaos/ui';

const BREAKPOINT_WIDTHS: Record<ResponsiveBreakpoint, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

type CompiledResponsiveVariant = ResponsiveVariantSchema & {
  bodyRegionKey?: string;
};

/** Literal fields arrive compiler-wrapped (`{ __nopPreserveLiteral, value }`). */
function unwrapLiteral(value: unknown): unknown {
  return unwrapPreservedLiteral(value) ?? value;
}

function resolvePx(value: ResponsiveBreakpoint | number | undefined): number | undefined {
  const raw = unwrapLiteral(value);
  if (typeof raw === 'number') {
    return raw;
  }
  if (typeof raw === 'string') {
    return BREAKPOINT_WIDTHS[raw as ResponsiveBreakpoint];
  }
  return undefined;
}

function resolveKey(variant: CompiledResponsiveVariant): string {
  const raw = unwrapLiteral(variant.key);
  if (typeof raw === 'string' && raw !== '') {
    return raw;
  }
  return '';
}

/**
 * Build the media query for a variant. `min` is inclusive (`min-width`),
 * `max` is exclusive (`max-width: <max - 1>px`) so `min: 900` and `max: 900`
 * never overlap.
 */
function buildVariantQuery(variant: ResponsiveVariantSchema): string {
  const min = resolvePx(variant.min);
  const max = resolvePx(variant.max);
  const parts: string[] = [];
  if (min !== undefined) {
    parts.push(`(min-width: ${min}px)`);
  }
  if (max !== undefined) {
    parts.push(`(max-width: ${max - 1}px)`);
  }
  return parts.join(' and ');
}

function hasBounds(variant: ResponsiveVariantSchema): boolean {
  return resolvePx(variant.min) !== undefined || resolvePx(variant.max) !== undefined;
}

function asReactNode(value: RendererRenderOutput): React.ReactNode {
  return value as React.ReactNode;
}

export function ResponsiveRenderer(props: RendererComponentProps<ResponsiveSchema>) {
  const variants = (props.props.variants ?? []) as CompiledResponsiveVariant[];
  const queries = variants.map(buildVariantQuery);
  const matches = useBreakpoints(queries);

  let activeIndex = -1;
  for (let i = 0; i < variants.length; i++) {
    if (!hasBounds(variants[i])) {
      continue;
    }
    if (matches[i] === true) {
      activeIndex = i;
      break;
    }
    // matches[i] === null (no matchMedia) or false → keep scanning.
  }

  if (activeIndex === -1) {
    const defaultIndex = variants.findIndex((v) => !hasBounds(v));
    activeIndex = defaultIndex === -1 ? 0 : defaultIndex;
  }

  const selected = variants[activeIndex];
  const bodyRegion =
    typeof selected?.bodyRegionKey === 'string' ? props.regions[selected.bodyRegionKey] : undefined;
  const bodyContent = bodyRegion ? asReactNode(bodyRegion.render()) : null;

  return (
    <div
      className={cn('nop-responsive', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
      data-active-variant={resolveKey(selected) || String(activeIndex)}
      data-variant-count={String(variants.length)}
    >
      {bodyContent}
    </div>
  );
}
