import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NodeErrorBoundary } from '../node-error-boundary';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function ThrowingComponent({ error }: { error?: unknown }): React.ReactElement | null {
  throw error ?? new Error('Test error');
}

function NormalComponent() {
  return <span data-testid="normal">Normal content</span>;
}

describe('NodeErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <NodeErrorBoundary nodeId="test-node">
        <NormalComponent />
      </NodeErrorBoundary>,
    );
    expect(screen.getByTestId('normal')).toBeTruthy();
  });

  it('catches error and displays error message with default nodeId', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <NodeErrorBoundary>
        <ThrowingComponent />
      </NodeErrorBoundary>,
    );
    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert).toBeTruthy();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(alert?.textContent).toContain('unknown');
    expect(alert?.textContent).toContain('Test error');
    consoleSpy.mockRestore();
  });

  it('catches error and displays error message with custom nodeId', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <NodeErrorBoundary nodeId="my-node">
        <ThrowingComponent />
      </NodeErrorBoundary>,
    );
    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert?.textContent).toContain('my-node');
    consoleSpy.mockRestore();
  });

  it('handles non-Error throw values', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <NodeErrorBoundary nodeId="string-error">
        <ThrowingComponent error="String error message" />
      </NodeErrorBoundary>,
    );
    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert?.textContent).toContain('String error message');
    consoleSpy.mockRestore();
  });

  it('handles null error value', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function ThrowNull(): React.ReactElement | null {
      throw null;
    }
    render(
      <NodeErrorBoundary nodeId="null-error">
        <ThrowNull />
      </NodeErrorBoundary>,
    );
    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert?.textContent).toContain('Render error');
    consoleSpy.mockRestore();
  });

  it('retries and recovers when retry button is clicked', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let shouldThrow = true;

    function ConditionalThrower() {
      if (shouldThrow) {
        throw new Error('Temporary error');
      }
      return <span data-testid="recovered">Recovered</span>;
    }

    const { container } = render(
      <NodeErrorBoundary nodeId="retry-node">
        <ConditionalThrower />
      </NodeErrorBoundary>,
    );

    const alert = container.querySelector('[data-slot="node-error"]');
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain('Temporary error');

    shouldThrow = false;
    const retryButton = container.querySelector('button');
    expect(retryButton).toBeTruthy();
    fireEvent.click(retryButton!);

    await waitFor(() => {
      expect(screen.getByTestId('recovered')).toBeTruthy();
    });

    consoleSpy.mockRestore();
  });

  it('renders alert with correct slot attribute', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <NodeErrorBoundary nodeId="slot-test">
        <ThrowingComponent />
      </NodeErrorBoundary>,
    );
    const alert = document.querySelector('[data-slot="node-error"]');
    expect(alert).toBeTruthy();
    expect(alert?.getAttribute('role')).toBe('alert');
    consoleSpy.mockRestore();
  });
});
