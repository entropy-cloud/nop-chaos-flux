import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBasicSchemaRenderer, env, formulaCompiler } from '../test-support.js';

function renderSchema(schema: unknown, data?: Record<string, unknown>, overrides?: { env?: RendererEnv }) {
  const SchemaRenderer = createBasicSchemaRenderer();
  return render(
    <SchemaRenderer
      schemaUrl="test://surface-enhancements"
      schema={schema as any}
      data={data}
      env={overrides?.env ?? env}
      formulaCompiler={formulaCompiler}
    />,
  );
}

function queryDialog() {
  return document.querySelector('[data-slot="dialog-surface"]') as HTMLElement | null;
}

function queryDrawer() {
  return document.querySelector('[data-slot="drawer-surface"]') as HTMLElement | null;
}

describe('surface family enhancements (E2f)', () => {
  afterEach(() => cleanup());

  describe('drawer closeOnOutside (asymmetric-bug fix)', () => {
    it('renders drawer with closeOnOutside wiring (default true mirrors dialog closeOnOutsideClick)', async () => {
      renderSchema({
        type: 'drawer',
        title: 'Outside-close drawer',
        open: true,
        closeOnOutside: true,
        body: [{ type: 'text', text: 'Drawer body' }],
      });

      await waitFor(() => expect(queryDrawer()).toBeTruthy());
      const surface = queryDrawer()!;
      expect(surface.getAttribute('data-close-on-outside')).toBe('true');
    });

    it('marks the drawer as outside-press locked when closeOnOutside is false', async () => {
      renderSchema({
        type: 'drawer',
        title: 'Outside-locked drawer',
        open: true,
        closeOnOutside: false,
        body: [{ type: 'text', text: 'Drawer body' }],
      });

      await waitFor(() => expect(queryDrawer()).toBeTruthy());
      const surface = queryDrawer()!;
      expect(surface.getAttribute('data-close-on-outside')).toBe('false');
    });
  });

  describe('closeOnEsc', () => {
    it('marks the dialog as escape-locked when closeOnEsc is false', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Esc-locked dialog',
        open: true,
        closeOnEsc: false,
        body: [{ type: 'text', text: 'Dialog body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      const surface = queryDialog()!;
      expect(surface.getAttribute('data-close-on-esc')).toBe('false');
    });

    it('marks the drawer as escape-locked when closeOnEsc is false', async () => {
      renderSchema({
        type: 'drawer',
        title: 'Esc-locked drawer',
        open: true,
        closeOnEsc: false,
        body: [{ type: 'text', text: 'Drawer body' }],
      });

      await waitFor(() => expect(queryDrawer()).toBeTruthy());
      const surface = queryDrawer()!;
      expect(surface.getAttribute('data-close-on-esc')).toBe('false');
    });
  });

  describe('size / width / height', () => {
    it('maps dialog size="full" to 100vw / 100vh inline styles', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Full dialog',
        open: true,
        size: 'full',
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      const content = queryDialog()!;
      expect(content.style.width).toBe('100vw');
      expect(content.style.height).toBe('100vh');
    });

    it('applies dialog width override as inline style in pixels', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Width override',
        open: true,
        size: 'md',
        width: 800,
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      const content = queryDialog()!;
      expect(content.style.width).toBe('800px');
    });
  });

  describe('confirm', () => {
    it('auto-generates Cancel/Confirm buttons when confirm is truthy and actions is omitted', async () => {
      const fetcher = vi.fn(async () => ({ ok: true, status: 200, data: null })) as RendererEnv['fetcher'];
      renderSchema(
        {
          type: 'dialog',
          title: 'Confirm dialog',
          defaultOpen: true,
          confirm: true,
          onConfirm: { action: 'ajax', args: { url: '/confirm' } },
          body: [{ type: 'text', text: 'Body' }],
        },
        undefined,
        { env: { ...env, fetcher } },
      );

      await waitFor(() => expect(queryDialog()).toBeTruthy());

      const footer = document.querySelector('[data-slot="dialog-footer"]');
      expect(footer).toBeTruthy();
      const cancel = (footer!.querySelector('[data-slot="surface-confirm-cancel"]') as HTMLButtonElement | null) ||
        screen.queryByTestId('surface-confirm-cancel');
      const confirm = (footer!.querySelector('[data-slot="surface-confirm-submit"]') as HTMLButtonElement | null) ||
        screen.queryByTestId('surface-confirm-submit');
      expect(cancel).toBeTruthy();
      expect(confirm).toBeTruthy();

      fireEvent.click(confirm!);
      await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
      await waitFor(() => {
        expect(queryDialog()).toBeNull();
      });
    });

    it('prefers explicit actions over confirm auto-generation', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Confirm with actions',
        open: true,
        confirm: true,
        actions: [{ type: 'button', label: 'Custom action' }],
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      expect(screen.getByText('Custom action')).toBeTruthy();
      expect(screen.queryByTestId('surface-confirm-cancel')).toBeNull();
      expect(screen.queryByTestId('surface-confirm-submit')).toBeNull();
    });

    it('uses a custom confirm button label when confirm is a string', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Custom confirm label',
        open: true,
        confirm: '保存',
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      expect(screen.getByTestId('surface-confirm-submit').textContent).toContain('保存');
    });
  });

  describe('showCloseButton', () => {
    it('omits the close button when showCloseButton is false', async () => {
      renderSchema({
        type: 'dialog',
        title: 'No close button',
        open: true,
        showCloseButton: false,
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());
      expect(document.querySelector('[data-slot="dialog-close"]')).toBeNull();
    });
  });

  describe('header / footer regions', () => {
    it('renders independent header and footer regions alongside title and actions', async () => {
      renderSchema({
        type: 'dialog',
        title: 'Region dialog',
        open: true,
        header: [{ type: 'text', text: 'Header region', testid: 'header-region' }],
        footer: [{ type: 'text', text: 'Footer region', testid: 'footer-region' }],
        actions: [{ type: 'button', label: 'Save' }],
        body: [{ type: 'text', text: 'Body', testid: 'body-region' }],
      });

      await waitFor(() => expect(queryDialog()).toBeTruthy());

      const headerSlot = document.querySelector('[data-slot="dialog-header"]');
      const footerSlot = document.querySelector('[data-slot="dialog-footer"]');
      expect(headerSlot).toBeTruthy();
      expect(footerSlot).toBeTruthy();
      expect(headerSlot!.textContent).toContain('Header region');
      expect(footerSlot!.textContent).toContain('Footer region');
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Region dialog')).toBeTruthy();
    });
  });

  describe('resizable drawer', () => {
    it('renders a resize handle when resizable is true', async () => {
      renderSchema({
        type: 'drawer',
        title: 'Resizable drawer',
        open: true,
        resizable: true,
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDrawer()).toBeTruthy());
      const handle = document.querySelector('[data-slot="drawer-resize-handle"]');
      expect(handle).toBeTruthy();
    });
  });

  describe('className overrides', () => {
    it('applies bodyClassName to DrawerBody', async () => {
      renderSchema({
        type: 'drawer',
        title: 'Body className',
        open: true,
        bodyClassName: 'p-8 custom-body',
        body: [{ type: 'text', text: 'Body' }],
      });

      await waitFor(() => expect(queryDrawer()).toBeTruthy());
      const body = document.querySelector('[data-slot="drawer-body"]') as HTMLElement | null;
      expect(body).toBeTruthy();
      expect(body!.className).toContain('p-8');
      expect(body!.className).toContain('custom-body');
    });
  });
});
