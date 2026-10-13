import type {
  FieldCompileContext,
  SchemaFieldRule,
} from '@nop-chaos/flux-core';

/** Compile-time sentinel marking the resolved `open` wrapper object (see compileOpenBinding). */
export const OPEN_BINDING_KIND = 'command-palette-open' as const;

export interface SurfaceOpenBinding {
  kind: typeof OPEN_BINDING_KIND;
  path?: string;
  value?: unknown;
}

/**
 * Compile-time capture of the controlled `open` binding. A simple `${path}`
 * expression records its scope path so user-initiated closes can write `false`
 * back (dialog plan-459 reopen parity) WITHOUT a runtime raw-schema read
 * (compile-once: the raw value is only ever seen by this compile hook).
 */
export const compileOpenBinding: SchemaFieldRule = {
  key: 'open',
  kind: 'prop',
  compile: (value: unknown, context: FieldCompileContext) => {
    let path: string | undefined;
    if (typeof value === 'string') {
      const match = value.trim().match(/^\$\{([a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)*)\}$/);
      path = match?.[1];
    }
    return {
      kind: OPEN_BINDING_KIND,
      path,
      value: context.compileValue(value),
    };
  },
};
