import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ApiSchema,
  ApiRequestContext,
  BaseSchema,
  CompiledDataSource,
  RendererComponentProps,
  RendererDefinition,
  RendererEnv,
} from '@nop-chaos/flux-core';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import {
  createSchemaRenderer,
  useRendererRuntime,
  useRenderScope,
} from '@nop-chaos/flux-react';
import { useEffect } from 'react';
import { formRendererDefinitions } from '../index.js';
import { env as sharedEnv, formStateProbeRenderer } from './form-test-support.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
});

function StubDataSourceRenderer(props: RendererComponentProps) {
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const compiledSource = props.templateNode.compiledSources?.[0] as CompiledDataSource | undefined;

  useEffect(() => {
    if (!compiledSource) {
      return;
    }
    const registration = runtime.registerDataSource({
      id: props.id,
      scope,
      compiledSource,
    });
    return () => {
      registration.dispose();
    };
  }, [props.id, runtime, scope, compiledSource]);

  return null;
}

const stubDataSourceDefinition: RendererDefinition = {
  type: 'data-source',
  sourcePackage: '@nop-chaos/flux-renderers-form',
  component: StubDataSourceRenderer,
  compilation: {
    artifacts: ['data-source'],
  },
};

function makeEnv(fetcher: RendererEnv['fetcher']): RendererEnv {
  return {
    ...sharedEnv,
    fetcher,
  };
}

function defaultSuggestionsFetcher() {
  return async function <T>(_api: ApiSchema, _ctx: ApiRequestContext) {
    const all = [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Apricot', value: 'apricot' },
    ];
    return { ok: true, status: 200, data: all as T };
  };
}

function renderForm(schema: BaseSchema, fetcher: RendererEnv['fetcher'] = defaultSuggestionsFetcher()) {
  const SchemaRenderer = createSchemaRenderer([
    ...basicRendererDefinitions,
    ...formRendererDefinitions,
    stubDataSourceDefinition,
    formStateProbeRenderer,
  ]);
  return render(
    <SchemaRenderer
      schemaUrl="test://form/input-suggest"
      schema={schema}
      env={makeEnv(fetcher)}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

const SUGGEST_SCHEMA = {
  type: 'form',
  data: { city: '' },
  body: [
    {
      type: 'data-source',
      action: 'ajax',
      args: { url: '/api/cities', params: { q: '${city}' } },
      name: 'citySuggestions',
      initFetch: false,
      sendOn: 'city.length >= 2',
    } as BaseSchema,
    {
      type: 'input-text',
      name: 'city',
      label: 'City',
      suggestSource: 'citySuggestions',
      suggestDebounce: 50,
      suggestMinInputLength: 2,
    } as BaseSchema,
  ],
} as BaseSchema;

async function typeAndExpectSuggestions(input: HTMLInputElement, value: string) {
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value } });
  await waitFor(() => {
    expect(screen.queryByText('Apple')).toBeTruthy();
  });
}

describe('input-text suggest — trigger=input (default)', () => {
  it('dispatches refreshSource on debounced input change and renders suggestions popover', async () => {
    const fetcher = vi.fn(defaultSuggestionsFetcher()) as RendererEnv['fetcher'];
    renderForm(SUGGEST_SCHEMA, fetcher);

    const input = screen.getByLabelText('City') as HTMLInputElement;
    expect(fetcher).not.toHaveBeenCalled();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ap' } });

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('Apple')).toBeTruthy();
      expect(screen.queryByText('Apricot')).toBeTruthy();
    });

    const list = document.querySelector('[data-slot="input-suggest-list"]');
    expect(list).toBeTruthy();
  });

  it('suggestions popover is not shown immediately before debounce fires', async () => {
    const fetcher = vi.fn(defaultSuggestionsFetcher()) as RendererEnv['fetcher'];
    renderForm(SUGGEST_SCHEMA, fetcher);

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'ap' } });

    expect(fetcher).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
  });
});

describe('input-text suggest — suggestMinInputLength gate', () => {
  it('does not dispatch refreshSource when input length < suggestMinInputLength', async () => {
    const fetcher = vi.fn(defaultSuggestionsFetcher()) as RendererEnv['fetcher'];
    renderForm(SUGGEST_SCHEMA, fetcher);

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    await new Promise((r) => setTimeout(r, 120));
    expect(fetcher).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
  });
});

describe('input-text suggest — disabled / readOnly', () => {
  it('does not dispatch refreshSource when field is disabled', async () => {
    const fetcher = vi.fn(defaultSuggestionsFetcher()) as RendererEnv['fetcher'];
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            disabled: true,
          } as BaseSchema,
        ],
      } as BaseSchema,
      fetcher,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'apple' } });

    await new Promise((r) => setTimeout(r, 120));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not dispatch refreshSource when field is readOnly', async () => {
    const fetcher = vi.fn(defaultSuggestionsFetcher()) as RendererEnv['fetcher'];
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            readOnly: true,
          } as BaseSchema,
        ],
      } as BaseSchema,
      fetcher,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'apple' } });

    await new Promise((r) => setTimeout(r, 120));
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('input-text suggest — select writeback', () => {
  it('clicking a suggestion writes suggestion.value back to the field and closes popover', async () => {
    renderForm(SUGGEST_SCHEMA);

    const input = screen.getByLabelText('City') as HTMLInputElement;
    await typeAndExpectSuggestions(input, 'ap');

    const item = screen.getByText('Apple');
    fireEvent.click(item);

    await waitFor(() => {
      expect(input.value).toBe('apple');
    });
    await waitFor(() => {
      expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
    });
  });
});

describe('input-text suggest — empty / error state', () => {
  it('shows suggestEmpty state when suggestions array is empty', async () => {
    const fetcher = async function <T>() {
      return { ok: true, status: 200, data: [] as T };
    };
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
            suggestEmpty: 'No matches found',
          } as BaseSchema,
        ],
      } as BaseSchema,
      fetcher,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.queryByText('No matches found')).toBeTruthy();
    });
    const empty = document.querySelector('[data-slot="input-suggest-empty"]');
    expect(empty).toBeTruthy();
  });

  it('shows empty state when fetch fails (does not throw, does not block input)', async () => {
    const fetcher = async function <T>() {
      return { ok: false, status: 500, data: null as T };
    };
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
            suggestEmpty: 'Error loading',
          } as BaseSchema,
        ],
      } as BaseSchema,
      fetcher,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'xyz' } });

    await waitFor(() => {
      expect(screen.queryByText('Error loading')).toBeTruthy();
    });
    expect(input.value).toBe('xyz');
  });
});

describe('input-text suggest — no source configured', () => {
  it('does not show popover and warns when suggestDebounce declared without suggestSource', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
          } as BaseSchema,
        ],
      } as BaseSchema,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });

    await new Promise((r) => setTimeout(r, 120));
    expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('input-text suggest — suggestTemplate region', () => {
  it('renders suggestion via suggestTemplate region when declared', async () => {
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
            suggestTemplate: [
              {
                type: 'text',
                text: 'SUGGEST:${$slot.suggestion.label}',
              } as BaseSchema,
            ],
          } as BaseSchema,
        ],
      } as BaseSchema,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.queryByText('SUGGEST:Apple')).toBeTruthy();
    });
  });

  it('degrades gracefully when suggestTemplate references a missing field', async () => {
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
            suggestTemplate: [
              {
                type: 'text',
                text: 'SUGGEST:${$slot.suggestion.label} [${$slot.suggestion.missingField}]',
              } as BaseSchema,
            ],
          } as BaseSchema,
        ],
      } as BaseSchema,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.queryByText('SUGGEST:Apple []')).toBeTruthy();
    });
  });
});

describe('input-text suggest — nativeAutoComplete coexistence', () => {
  it('suggest popover and native autocomplete attribute coexist without conflict', async () => {
    renderForm(
      {
        type: 'form',
        data: { city: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/cities' },
            name: 'citySuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-text',
            name: 'city',
            label: 'City',
            suggestSource: 'citySuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
            nativeAutoComplete: 'off',
          } as BaseSchema,
        ],
      } as BaseSchema,
    );

    const input = screen.getByLabelText('City') as HTMLInputElement;
    expect(input.getAttribute('autocomplete')).toBe('off');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.queryByText('Apple')).toBeTruthy();
    });
    expect(input.getAttribute('autocomplete')).toBe('off');
  });
});

describe('input-text suggest — keyboard navigation', () => {
  it('Escape closes the popover without selecting', async () => {
    renderForm(SUGGEST_SCHEMA);

    const input = screen.getByLabelText('City') as HTMLInputElement;
    await typeAndExpectSuggestions(input, 'ap');

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(document.querySelector('[data-slot="input-suggest-list"]')).toBeNull();
    });
    expect(input.value).toBe('ap');
  });
});

describe('input-text suggest — shared across text family', () => {
  it('input-email renders suggest popover', async () => {
    renderForm(
      {
        type: 'form',
        data: { email: '' },
        body: [
          {
            type: 'data-source',
            action: 'ajax',
            args: { url: '/api/emails' },
            name: 'emailSuggestions',
            initFetch: false,
          } as BaseSchema,
          {
            type: 'input-email',
            name: 'email',
            label: 'Email',
            suggestSource: 'emailSuggestions',
            suggestDebounce: 50,
            suggestMinInputLength: 1,
          } as BaseSchema,
        ],
      } as BaseSchema,
    );

    const input = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'a' } });

    await waitFor(() => {
      expect(screen.queryByText('Apple')).toBeTruthy();
    });
  });
});
