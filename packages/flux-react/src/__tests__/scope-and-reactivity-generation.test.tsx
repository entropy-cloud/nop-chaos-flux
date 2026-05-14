import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FormContext, ValidationContext } from '../contexts.js';
import { useCurrentFormModelGeneration } from '../hooks.js';

describe('createSchemaRenderer model generation subscriptions', () => {
  it('subscribes useCurrentFormModelGeneration to the dedicated generation channel', async () => {
    let notifyGeneration: (() => void) | undefined;
    const form = {
      modelGeneration: 1,
      store: {
        subscribe: () => () => undefined,
      },
      subscribeToModelGeneration(listener: () => void) {
        notifyGeneration = listener;
        return () => {
          notifyGeneration = undefined;
        };
      },
    } as any;
    let renders = 0;

    function Probe() {
      const generation = useCurrentFormModelGeneration();
      React.useEffect(() => {
        renders += 1;
      });
      return <span data-testid="generation">{String(generation)}</span>;
    }

    render(
      <FormContext.Provider value={form}>
        <Probe />
      </FormContext.Provider>,
    );

    expect(screen.getByTestId('generation').textContent).toBe('1');
    await waitFor(() => expect(renders).toBe(1));

    form.modelGeneration = 2;
    notifyGeneration?.();

    await waitFor(() => expect(screen.getByTestId('generation').textContent).toBe('2'));
    expect(renders).toBe(2);
  });

  it('subscribes useCurrentFormModelGeneration to validation owners outside forms', async () => {
    let notifyGeneration: (() => void) | undefined;
    const owner = {
      modelGeneration: 4,
      store: {
        subscribe: () => () => undefined,
      },
      subscribeToModelGeneration(listener: () => void) {
        notifyGeneration = listener;
        return () => {
          notifyGeneration = undefined;
        };
      },
    } as any;

    function Probe() {
      const generation = useCurrentFormModelGeneration();
      return <span data-testid="generation-owner">{String(generation)}</span>;
    }

    render(
      <ValidationContext.Provider value={owner}>
        <Probe />
      </ValidationContext.Provider>,
    );

    expect(screen.getByTestId('generation-owner').textContent).toBe('4');

    owner.modelGeneration = 5;
    notifyGeneration?.();

    await waitFor(() => expect(screen.getByTestId('generation-owner').textContent).toBe('5'));
  });
});
