import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '../index.js';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { formRendererDefinitions } from './basic-page-layout.test-support.js';

// L9 regression anchor: locks the mountOnEnter / unmountOnExit owner lifecycle.
// (a) mountOnEnter:true → an inactive tab's body is NOT mounted until first
//     activation, then loads+renders on enter (no blank panel).
// (b) unmountOnExit:true → switching away unmounts the inner owner; re-entering
//     cleanly re-initializes it (form draft reset, no subscriber accumulation /
//     duplication). This is the opposite axis of the default keepMounted draft
//     retention pinned in basic-tabs-behavior.test.tsx.
describe('TabsRenderer — mountOnEnter / unmountOnExit owner lifecycle (L9)', () => {
  afterEach(() => {
    cleanup();
  });

  it('(a) mountOnEnter defers mounting an inactive tab body until first activation', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/mountOnEnter"
        schema={{
          type: 'tabs',
          value: 'first',
          items: [
            { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
            {
              key: 'second',
              title: 'Second',
              mountOnEnter: true,
              body: [{ type: 'text', text: 'Second body' }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('First body')).toBeTruthy());

    // inactive mountOnEnter tab body is not yet mounted
    expect(screen.queryByText('Second body')).toBeNull();

    // activating mounts + renders the deferred body
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByText('Second body')).toBeTruthy());
    expect(screen.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected')).toBe('true');
  });

  it('(b) unmountOnExit cleanly re-initializes the inner owner on re-entry (no accumulation)', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
    render(
      <SchemaRenderer
        schemaUrl="test://tabs/unmountOnExit"
        schema={{
          type: 'tabs',
          value: 'first',
          items: [
            { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
            {
              key: 'second',
              title: 'Second',
              unmountOnExit: true,
              body: [
                {
                  type: 'form',
                  body: [{ type: 'input-text', name: 'email', label: 'Email' }],
                },
              ],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => expect(screen.getByText('First body')).toBeTruthy());

    // enter the unmountOnExit tab and type a draft
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: 'draft@example.com' } });
    expect(emailInput.value).toBe('draft@example.com');

    // leave → inner owner unmounts (no Email input in the DOM)
    fireEvent.click(screen.getByRole('tab', { name: 'First' }));
    await waitFor(() => expect(screen.queryByLabelText('Email')).toBeNull());

    // re-enter → clean re-initialization: exactly one Email input (no
    // duplication/accumulation), and the draft is reset (unmountOnExit semantics)
    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());
    expect(screen.getAllByLabelText('Email')).toHaveLength(1);
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  });
});
