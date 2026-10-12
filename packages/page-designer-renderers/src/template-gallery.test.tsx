/**
 * 模板画廊测试（S4-2）：保存当前文档（宿主回调 store）、空态（gallery-empty
 * 失败路径）、实例化（onInstantiate 命令面）、删除模板、异步 store 支持。
 */

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SchemaInput } from '@nop-chaos/flux-core';
import { createInMemoryTemplateStore, TemplateGallery } from './template-gallery.js';
import type { PageDesignerTemplate, PageDesignerTemplateStore } from './template-gallery.js';

afterEach(cleanup);

const DOC: SchemaInput = { type: 'page', body: [{ type: 'text', text: 'hello' }] };
const EXPORT_JSON = JSON.stringify(DOC, null, 2);

function seed(templates: PageDesignerTemplate[] = []) {
  return createInMemoryTemplateStore(templates);
}

describe('TemplateGallery', () => {
  // WA-pager-002 (plan 573): a rejecting host store previously produced an
  // unhandled rejection and a silently dead panel — failures must surface.
  it('surfaces a load failure toast when store.list rejects', async () => {
    const { toast } = await import('@nop-chaos/ui');
    const errorSpy = vi.spyOn(toast, 'error').mockImplementation(() => Number.NaN);
    const rejectingStore = {
      list: vi.fn().mockRejectedValue(new Error('store exploded')),
      save: vi.fn(),
      remove: vi.fn(),
    };
    render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={rejectingStore as unknown as PageDesignerTemplateStore}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    errorSpy.mockRestore();
  });

  it('surfaces an error toast instead of success when store.save rejects', async () => {
    const { toast } = await import('@nop-chaos/ui');
    const errorSpy = vi.spyOn(toast, 'error').mockImplementation(() => Number.NaN);
    const successSpy = vi.spyOn(toast, 'success').mockImplementation(() => Number.NaN);
    const rejectingStore = {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockRejectedValue(new Error('quota exceeded')),
      remove: vi.fn(),
    };
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={rejectingStore as unknown as PageDesignerTemplateStore}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    fireEvent.change(document.getElementById('page-designer-template-name') as HTMLInputElement, {
      target: { value: 'T1' },
    });
    fireEvent.click(view.getByTestId('page-designer-template-save'));
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(successSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    successSpy.mockRestore();
  });

  it('surfaces an error toast and keeps the row when store.remove rejects', async () => {
    const { toast } = await import('@nop-chaos/ui');
    const errorSpy = vi.spyOn(toast, 'error').mockImplementation(() => Number.NaN);
    const store = seed([{ id: 'tpl-1', name: 'A', document: DOC, createdAt: 1 }]);
    store.remove = vi.fn().mockRejectedValue(new Error('locked'));
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(view.getByText('A')).toBeTruthy());
    const item = view.getByTestId('page-designer-template-item');
    fireEvent.click(item.querySelector('[data-testid="page-designer-template-remove"]') as HTMLElement);
    await waitFor(() => expect(errorSpy).toHaveBeenCalled());
    expect(view.getByText('A')).toBeTruthy();
    errorSpy.mockRestore();
  });


  it('shows the empty state (template-gallery-empty failure path)', async () => {
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={seed()}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(view.getByTestId('page-designer-template-empty')).toBeTruthy());
  });

  it('saves the current exported document through the host store', async () => {
    const store = seed();
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    fireEvent.change(view.getByLabelText('模板名称'), { target: { value: '我的模板' } });
    fireEvent.click(view.getByTestId('page-designer-template-save'));
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    const listed = (await store.list())[0];
    expect(listed.name).toBe('我的模板');
    expect(listed.document).toEqual(DOC);
  });

  it('falls back to an untitled name and still saves', async () => {
    const store = seed();
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    fireEvent.click(view.getByTestId('page-designer-template-save'));
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    expect((await store.list())[0].name).toBe('未命名模板');
  });

  it('rejects saving when the export projection is not JSON (keeps store untouched)', async () => {
    const store = seed();
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson='{not json'
        onInstantiate={vi.fn(() => true)}
      />,
    );
    fireEvent.click(view.getByTestId('page-designer-template-save'));
    await waitFor(() => expect(view.getByTestId('page-designer-template-empty')).toBeTruthy());
    expect(await store.list()).toHaveLength(0);
  });

  it('hides the remove affordance for stores without removal support', async () => {
    const template: PageDesignerTemplate = { id: 'tpl-1', name: 'Landing', document: DOC };
    const store = { list: () => [template], save: (input: { name: string; document: SchemaInput }) => ({ id: 'x', ...input }) };
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    expect(view.queryByTestId('page-designer-template-remove')).toBeNull();
  });

  it('instantiates a template via the host callback and closes on success', async () => {
    const template: PageDesignerTemplate = { id: 'tpl-1', name: 'Landing', document: DOC };
    const onInstantiate = vi.fn(() => true);
    const onOpenChange = vi.fn();
    const view = render(
      <TemplateGallery
        open
        onOpenChange={onOpenChange}
        store={seed([template])}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={onInstantiate}
      />,
    );
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    fireEvent.click(view.getByTestId('page-designer-template-instantiate'));
    expect(onInstantiate).toHaveBeenCalledWith(DOC);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog open when instantiation is rejected (rt-unknown-type path)', async () => {
    const template: PageDesignerTemplate = { id: 'tpl-1', name: 'Landing', document: DOC };
    const onInstantiate = vi.fn(() => false);
    const onOpenChange = vi.fn();
    const view = render(
      <TemplateGallery
        open
        onOpenChange={onOpenChange}
        store={seed([template])}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={onInstantiate}
      />,
    );
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    fireEvent.click(view.getByTestId('page-designer-template-instantiate'));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('removes templates when the store supports removal', async () => {
    const template: PageDesignerTemplate = { id: 'tpl-1', name: 'Landing', document: DOC };
    const store = seed([template]);
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(view.getAllByTestId('page-designer-template-item')).toHaveLength(1));
    fireEvent.click(view.getByTestId('page-designer-template-remove'));
    await waitFor(() => expect(view.queryByTestId('page-designer-template-empty')).toBeTruthy());
    expect(await store.list()).toHaveLength(0);
  });

  it('supports async stores', async () => {
    const template: PageDesignerTemplate = { id: 'tpl-9', name: 'Async', document: DOC };
    const store = {
      list: () => Promise.resolve([template]),
      save: (input: { name: string; document: SchemaInput }) =>
        Promise.resolve({ id: 'tpl-x', createdAt: undefined, ...input }),
    };
    const view = render(
      <TemplateGallery
        open
        onOpenChange={vi.fn()}
        store={store}
        currentExportedJson={EXPORT_JSON}
        onInstantiate={vi.fn(() => true)}
      />,
    );
    await waitFor(() => expect(view.getByText('Async')).toBeTruthy());
  });
});

describe('createInMemoryTemplateStore', () => {
  it('lists seeded templates and assigns ids on save', async () => {
    const store = createInMemoryTemplateStore([{ id: 's1', name: 'Seed', document: DOC }]);
    expect(await store.list()).toHaveLength(1);
    const saved = await store.save({ name: 'New', document: DOC });
    expect(saved.id).toMatch(/^tpl-/);
    expect(await store.list()).toHaveLength(2);
    await store.remove?.('s1');
    expect(await store.list()).toHaveLength(1);
  });
});
