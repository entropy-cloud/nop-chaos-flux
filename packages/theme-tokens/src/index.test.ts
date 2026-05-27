import { describe, expect, it } from 'vitest';
import {
  BASE_TOKEN_NAMES,
  defineHostTokenExtension,
  type BaseTokenName,
} from './index.js';

describe('@nop-chaos/theme-tokens extension helpers', () => {
  it('exports the shared base token names', () => {
    expect(BASE_TOKEN_NAMES.BACKGROUND).toBe('--background');
    expect(BASE_TOKEN_NAMES.SURFACE_OVERLAY).toBe('--surface-overlay');

    const tokenName: BaseTokenName = BASE_TOKEN_NAMES.PRIMARY;
    expect(tokenName).toBe('--primary');
  });

  it('defines host extensions without widening the runtime shape', () => {
    const extension = defineHostTokenExtension({
      cssFile: './flux-host-token-extension.css',
      tokens: {
        hostPrimary: '--host-primary',
      },
      tailwindThemeExtension: {
        colors: {
          host: {
            primary: 'hsl(var(--host-primary))',
          },
        },
      },
    });

    expect(extension.cssFile).toBe('./flux-host-token-extension.css');
    expect(extension.tokens?.hostPrimary).toBe('--host-primary');
    expect(extension.tailwindThemeExtension).toMatchObject({
      colors: {
        host: {
          primary: 'hsl(var(--host-primary))',
        },
      },
    });
  });
});
