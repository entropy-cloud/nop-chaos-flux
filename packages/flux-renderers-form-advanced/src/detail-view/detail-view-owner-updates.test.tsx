import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import { useScopeSelector } from '@nop-chaos/flux-react';
import { beforeEach, describe, expect, it } from 'vitest';
import { baseEnv, createPageSchemaRenderer, formulaCompiler } from '../test-support.js';

let viewerMountCount = 0;

beforeEach(() => {
  // C-23: reset module-level mutable counters in beforeEach for test isolation
  // instead of relying on ad-hoc inline resets scattered across individual tests.
  viewerMountCount = 0;
});

function DetailViewerLifecycleProbe() {
  const title = useScopeSelector((data: any) => data.summary?.title);

  React.useEffect(() => {
    viewerMountCount += 1;
  }, []);

  return <span data-testid="viewer-lifecycle">{String(title ?? '')}</span>;
}

const detailViewerLifecycleProbeRenderer: RendererDefinition = {
  type: 'detail-viewer-lifecycle-probe',
  component: DetailViewerLifecycleProbe,
};

describe('detail-view renderer owner update behavior', () => {
  it('confirm with data projection applies changes via confirm flow', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#1"
        schema={{
          type: 'page',
          body: [
            {
              type: 'detail-view',
              data: { theme: 'dark', locale: 'en-US' },
              triggerLabel: 'Edit Config',
              surface: { mode: 'dialog', title: 'Edit Config' },
              content: [
                { type: 'input-text', name: 'theme', label: 'Theme' },
                { type: 'input-text', name: 'locale', label: 'Locale' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit Config')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'light' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Theme')).toBeNull());

    fireEvent.click(screen.getByText('Edit Config'));
    await waitFor(() => expect(screen.getByLabelText('Theme')).toBeTruthy());
  });

  it('viewer updates after first confirm when using name as scopePath', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#2"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  viewer: [{ type: 'text', text: '${summary.title}', testid: 'viewer-title' }],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' },
                  ],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-title')).toBeTruthy());
    expect(screen.getByTestId('viewer-title').textContent).toBe('Original Title');

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('First Edit'));
  });

  it('viewer updates after second confirm when using name as scopePath', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#3"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  viewer: [{ type: 'text', text: '${summary.title}', testid: 'viewer-title' }],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' },
                  ],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-title')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('First Edit'));

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('First Edit');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Second Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('Second Edit'));
  });

  it('second edit dialog is pre-populated with values from first confirm', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#4"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: { summary: { title: 'Original Title', author: 'Alice' } },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  label: 'Summary',
                  triggerLabel: 'Edit',
                  surface: { mode: 'dialog', title: 'Edit Summary' },
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' },
                  ],
                },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('Edit')).toBeTruthy());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'First Edit' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());

    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('First Edit');
    expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('Alice');
  });

  it('preserves viewer subtree content when unrelated sibling fields change', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer();

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#5"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: {
                summary: { title: 'Original Title', author: 'Alice' },
                note: 'before',
              },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  viewer: [
                    { type: 'text', text: '${summary.title}', testid: 'viewer-title' },
                    { type: 'text', text: '${note}', testid: 'sibling-note' },
                  ],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' },
                  ],
                },
                { type: 'input-text', name: 'note', label: 'Note' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-title').textContent).toBe('Original Title'));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'after' } });

    await waitFor(() => expect(screen.getByTestId('sibling-note').textContent).toBe('after'));
    expect(screen.getByTestId('viewer-title').textContent).toBe('Original Title');
  });

  it('refreshes viewer content after confirm without remounting the viewer subtree', async () => {
    cleanup();
    const SchemaRenderer = createPageSchemaRenderer([detailViewerLifecycleProbeRenderer]);

    render(
      <SchemaRenderer
        schemaUrl="test://flux-renderers-form-advanced/detail-view/detail-view-owner-updates.test.tsx#6"
        schema={{
          type: 'page',
          body: [
            {
              type: 'form',
              name: 'testForm',
              data: {
                summary: { title: 'Original Title', author: 'Alice' },
                note: 'before',
              },
              body: [
                {
                  type: 'detail-view',
                  name: 'summary',
                  triggerLabel: 'Edit',
                  viewer: [{ type: 'detail-viewer-lifecycle-probe' }],
                  content: [
                    { type: 'input-text', name: 'title', label: 'Title' },
                    { type: 'input-text', name: 'author', label: 'Author' },
                  ],
                },
                { type: 'input-text', name: 'note', label: 'Note' },
              ],
            },
          ],
        }}
        env={baseEnv}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('viewer-lifecycle').textContent).toBe('Original Title'));
    expect(viewerMountCount).toBe(1);

    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'after' } });
    await waitFor(() =>
      expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('after'),
    );
    expect(screen.getByTestId('viewer-lifecycle').textContent).toBe('Original Title');
    expect(viewerMountCount).toBe(1);

    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByLabelText('Title')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed Title' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => expect(screen.queryByLabelText('Title')).toBeNull());
    await waitFor(() => expect(screen.getByTestId('viewer-lifecycle').textContent).toBe('Changed Title'));
    expect(viewerMountCount).toBe(1);
  });

});
