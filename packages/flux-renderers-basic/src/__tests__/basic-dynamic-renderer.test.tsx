import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support';

describe('basicRendererDefinitions dynamic-renderer', () => {
  it('renders body content while loading', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'dynamic-renderer', schemaApi: { url: '/api/schema' }, body: { type: 'text', text: 'Loading...' } }] }} env={env} formulaCompiler={formulaCompiler} />);
    expect(screen.getByText('Loading...')).toBeTruthy();
    cleanup();
  });

  it('replaces body with loaded schema on success', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { type: 'text', text: 'Dynamic content loaded' } })) as RendererEnv['fetcher'];
    const SchemaRenderer = createBasicSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'dynamic-renderer', schemaApi: { url: '/api/schema' }, body: { type: 'text', text: 'Loading...' } }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Dynamic content loaded')).toBeTruthy());
    expect(fetcher).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it('shows error message on fetch failure', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('Failed to load schema');
    }) as RendererEnv['fetcher'];
    const SchemaRenderer = createBasicSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'dynamic-renderer', schemaApi: { url: '/api/schema' }, body: { type: 'text', text: 'Loading...' } }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Error: Failed to load schema')).toBeTruthy());
    cleanup();
  });

  it('shows an error when the API returns an invalid schema payload', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: { text: 'Missing type field' } })) as RendererEnv['fetcher'];
    const SchemaRenderer = createBasicSchemaRenderer();
    render(<SchemaRenderer schema={{ type: 'page', body: [{ type: 'dynamic-renderer', schemaApi: { url: '/api/schema' }, body: { type: 'text', text: 'Loading...' } }] }} env={{ ...env, fetcher }} formulaCompiler={formulaCompiler} />);
    await waitFor(() => expect(screen.getByText('Error: Invalid schema received from API')).toBeTruthy());
    cleanup();
  });
});
