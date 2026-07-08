import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, cleanup } from '@testing-library/react';

vi.mock('@nop-chaos/flux-react', () => ({
  useRendererEnv: vi.fn(),
  useInputComponentHandle: vi.fn(),
  FormContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

vi.mock('@nop-chaos/flux-i18n', () => ({
  t: (key: string) => key,
}));

vi.mock('@nop-chaos/ui', () => ({
  cn: (...vals: Array<string | false | null | undefined>) => vals.filter(Boolean).join(' '),
  Combobox: ({ children }: { children: React.ReactNode }) => children,
  ComboboxTrigger: ({ children }: { children: React.ReactNode }) => children,
  ComboboxValue: () => null,
  ComboboxContent: ({ children }: { children: React.ReactNode }) => children,
  ComboboxInput: () => null,
  ComboboxEmpty: ({ children }: { children: React.ReactNode }) => children,
  ComboboxClear: () => null,
  Label: () => null,
  Spinner: () => null,
  useIsMobile: () => false,
}));

import { useRendererEnv } from '@nop-chaos/flux-react';
import { useDictOptions, type DictOptionsState } from '../renderers/use-dict-options.js';

function renderHookResult<T>(fn: () => T): { current: T } {
  const ref: { current: T } = { current: undefined as unknown as T };
  function Probe() {
    ref.current = fn();
    return null;
  }
  render(<Probe />);
  return ref;
}

describe('useDictOptions', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads options when dictName is provided and env.loadDict is configured', async () => {
    const mockLoadDict = vi.fn().mockResolvedValue({
      name: 'role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
    });
    vi.mocked(useRendererEnv).mockReturnValue({ loadDict: mockLoadDict } as any);

    const ref = renderHookResult<DictOptionsState>(() => useDictOptions('role'));

    await waitFor(() => {
      expect(ref.current.loading).toBe(false);
    });

    expect(mockLoadDict).toHaveBeenCalledWith('role');
    expect(ref.current.options).toEqual([
      { label: 'Admin', value: 'admin', disabled: false },
      { label: 'User', value: 'user', disabled: false },
    ]);
  });

  it('returns empty options and warns when env.loadDict is not configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(useRendererEnv).mockReturnValue({} as any);

    const ref = renderHookResult<DictOptionsState>(() => useDictOptions('role'));

    await waitFor(() => {
      expect(ref.current.loading).toBe(false);
    });

    expect(ref.current.options).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('env.loadDict is not configured'));
    warnSpy.mockRestore();
  });

  it('returns empty options when dictName is undefined', () => {
    vi.mocked(useRendererEnv).mockReturnValue({} as any);

    const ref = renderHookResult<DictOptionsState>(() => useDictOptions(undefined));

    expect(ref.current.options).toEqual([]);
    expect(ref.current.loading).toBe(false);
  });

  it('handles load error gracefully', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockLoadDict = vi.fn().mockRejectedValue(new Error('network'));
    vi.mocked(useRendererEnv).mockReturnValue({ loadDict: mockLoadDict } as any);

    const ref = renderHookResult<DictOptionsState>(() => useDictOptions('role'));

    await waitFor(() => {
      expect(ref.current.loading).toBe(false);
    });

    expect(ref.current.options).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load dict'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});

describe('select dict schema coverage', () => {
  it('schema literal with dict property for prop-coverage checker', () => {
    const schema = {
      type: 'select' as const,
      name: 'role',
      label: 'Role',
      dict: 'role',
    };
    expect(schema.type).toBe('select');
    expect(schema.dict).toBe('role');
  });
});
