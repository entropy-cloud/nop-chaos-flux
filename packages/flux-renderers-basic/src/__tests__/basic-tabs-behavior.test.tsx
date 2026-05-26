import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createSchemaRenderer } from '@nop-chaos/flux-react';
import { basicRendererDefinitions } from '../index.js';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';
import { formRendererDefinitions } from './basic-page-layout.test-support.js';

describe('basicRendererDefinitions tabs behavior', () => {
  afterEach(() => {
    cleanup();
  });

  it('passes tab item slot bindings to title, toolbar, and body regions', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'tabs',
          value: 'second',
          items: [
            {
              key: 'first',
              title: { type: 'text', text: 'title:${$slot.item.key}:${$slot.index}:${$slot.key}' },
              toolbar: {
                type: 'text',
                text: 'toolbar:${$slot.item.key}:${$slot.index}:${$slot.key}',
              },
              body: { type: 'text', text: 'body:${$slot.item.key}:${$slot.index}:${$slot.key}' },
            },
            {
              key: 'second',
              title: { type: 'text', text: 'title:${$slot.item.key}:${$slot.index}:${$slot.key}' },
              toolbar: {
                type: 'text',
                text: 'toolbar:${$slot.item.key}:${$slot.index}:${$slot.key}',
              },
              body: { type: 'text', text: 'body:${$slot.item.key}:${$slot.index}:${$slot.key}' },
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('title:first:0:first')).toBeTruthy();
      expect(screen.getByText('title:second:1:second')).toBeTruthy();
      expect(screen.getByText('toolbar:second:1:second')).toBeTruthy();
      expect(screen.getByText('body:second:1:second')).toBeTruthy();
    });
  });

  it('keeps disabled tabs non-interactive after compiler normalization', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout-tabs-disabled"
        schema={{
          type: 'tabs',
          items: [
            { key: 'overview', title: 'Overview', body: [{ type: 'text', text: 'Overview body' }] },
            { key: 'settings', title: 'Settings', disabled: true, body: [{ type: 'text', text: 'Settings body' }] },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Settings' }).getAttribute('aria-disabled')).toBe('true');
      expect(screen.getByText('Overview body')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Overview' }).getAttribute('aria-selected')).toBe('true');
      expect(screen.getByRole('tab', { name: 'Settings' }).getAttribute('aria-selected')).toBe('false');
      expect(screen.getByText('Overview body')).toBeTruthy();
    });
  });

  it('keeps nested form values when switching tabs', async () => {
    const SchemaRenderer = createSchemaRenderer([...basicRendererDefinitions, ...formRendererDefinitions]);
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout-tabs-form-retention"
        schema={{
          type: 'tabs',
          items: [
            {
              key: 'info',
              title: 'Basic Info',
              body: [
                {
                  type: 'form',
                  body: [{ type: 'input-text', name: 'firstName', label: 'First Name' }],
                },
              ],
            },
            {
              key: 'contact',
              title: 'Contact',
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

    await waitFor(() => expect(screen.getByLabelText('First Name')).toBeTruthy());
    const firstNameInput = screen.getByLabelText('First Name') as HTMLInputElement;
    fireEvent.change(firstNameInput, { target: { value: 'Alice' } });
    expect(firstNameInput.value).toBe('Alice');

    fireEvent.click(screen.getByText('Contact'));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeTruthy());

    fireEvent.click(screen.getByText('Basic Info'));
    await waitFor(() => {
      expect((screen.getByLabelText('First Name') as HTMLInputElement).value).toBe('Alice');
    });
  });

  it('keeps inactive tab panels mounted as the supported baseline', async () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout-tabs-mounted-panels"
        schema={{
          type: 'tabs',
          value: 'first',
          items: [
            { key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] },
            { key: 'second', title: 'Second', body: [{ type: 'text', text: 'Second body' }] },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('First body')).toBeTruthy();
      expect(screen.getByText('Second body')).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'First' }).getAttribute('aria-selected')).toBe('true');
      expect(screen.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected')).toBe('false');
    });

    const panels = Array.from(document.querySelectorAll('[data-slot="tabs-content"]'));
    expect(panels).toHaveLength(2);

    fireEvent.click(screen.getByRole('tab', { name: 'Second' }));

    await waitFor(() => {
      const nextPanels = Array.from(document.querySelectorAll('[data-slot="tabs-content"]'));
      expect(nextPanels).toHaveLength(2);
      expect(screen.getByText('First body')).toBeTruthy();
      expect(screen.getByText('Second body')).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'First' }).getAttribute('aria-selected')).toBe('false');
      expect(screen.getByRole('tab', { name: 'Second' }).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('uses data-slot markers for tabs internal structure instead of nop-tabs region classes', () => {
    const SchemaRenderer = createBasicSchemaRenderer();
    render(
      <SchemaRenderer
        schemaUrl="test://basic/page-layout"
        schema={{
          type: 'page',
          body: [
            {
              type: 'tabs',
              items: [{ key: 'first', title: 'First', body: [{ type: 'text', text: 'First body' }] }],
            },
          ],
        }}
        env={env}
        formulaCompiler={formulaCompiler}
      />,
    );
    const tabsRoot = document.querySelector('[data-slot="tabs-root"]');
    const tabsContent = document.querySelector('[data-slot="tabs-content"]');

    expect(tabsRoot).toBeTruthy();
    expect(tabsContent).toBeTruthy();
    expect(document.querySelector('.nop-tabs-root')).toBeNull();
    expect(document.querySelector('.nop-tabs-content')).toBeNull();
  });
});
