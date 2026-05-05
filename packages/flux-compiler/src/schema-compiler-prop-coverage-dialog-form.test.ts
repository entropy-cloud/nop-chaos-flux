import { describe, expect, it } from 'vitest';
import type { RendererDefinition } from '@nop-chaos/flux-core';
import {
  compileNode,
  createCompiler,
  dialogRenderer,
  drawerRenderer,
  formRenderer,
  noop,
} from './schema-compiler-prop-coverage.test-support';

describe('schema property coverage - dialog', () => {
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(dialogRenderer, textRenderer);

  it('compiles dialog with actions region', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'My Dialog',
      actions: [{ type: 'text', text: 'OK' }],
    });
    expect(root.regions.actions).toBeDefined();
  });

  it('compiles dialog with container prop', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      container: 'body',
    });
    expect(root.propsProgram.value.container).toBe('body');
  });

  it('compiles dialog with onClose event', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      onClose: { action: 'closeDialog' },
    });
    expect(root.eventPlans.onClose).toBeDefined();
  });

  it('compiles dialog with onOpen event', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      onOpen: { action: 'showToast', args: { message: 'opened' } },
    });
    expect(root.eventPlans.onOpen).toBeDefined();
  });

  it('compiles dialog with showMask prop', () => {
    const root = compileNode(compiler, {
      type: 'dialog',
      title: 'Dialog',
      showMask: false,
    });
    expect(root.propsProgram.value.showMask).toBe(false);
  });
});

describe('schema property coverage - drawer', () => {
  const textRenderer: RendererDefinition = {
    type: 'text',
    component: noop,
    fields: [{ key: 'text', kind: 'prop' }],
  };
  const compiler = createCompiler(drawerRenderer, textRenderer);

  it('compiles drawer with actions region', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      actions: [{ type: 'text', text: 'Close' }],
    });
    expect(root.regions.actions).toBeDefined();
  });

  it('compiles drawer with container prop', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      container: 'body',
    });
    expect(root.propsProgram.value.container).toBe('body');
  });

  it('compiles drawer with onClose event', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      onClose: { action: 'closeDrawer' },
    });
    expect(root.eventPlans.onClose).toBeDefined();
  });

  it('compiles drawer with onOpen event', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      onOpen: { action: 'showToast', args: { message: 'opened' } },
    });
    expect(root.eventPlans.onOpen).toBeDefined();
  });

  it('compiles drawer with showMask prop', () => {
    const root = compileNode(compiler, {
      type: 'drawer',
      title: 'Drawer',
      showMask: true,
    });
    expect(root.propsProgram.value.showMask).toBe(true);
  });
});

describe('schema property coverage - form', () => {
  const compiler = createCompiler(formRenderer);

  it('compiles form with labelWidth', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      labelWidth: 120,
    });
    expect(root.propsProgram.value.labelWidth).toBe(120);
  });

  it('compiles form with shape (mode, labelAlign as layout props)', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      mode: 'horizontal',
      labelAlign: 'left',
    });
    expect(root.propsProgram.value.mode).toBe('horizontal');
    expect(root.propsProgram.value.labelAlign).toBe('left');
  });

  it('compiles form with statusPath', () => {
    const root = compileNode(compiler, {
      type: 'form',
      body: [],
      statusPath: 'formStatus',
    });
    expect(root.propsProgram.value.statusPath).toBe('formStatus');
  });
});
