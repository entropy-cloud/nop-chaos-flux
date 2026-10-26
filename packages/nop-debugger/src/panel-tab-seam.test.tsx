import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { NopDebuggerPanel } from './panel.js';
import { createNopDebugger } from './controller.js';
import { createController, createSnapshot } from './panel.test-support.js';
import type { NopDebuggerPanelTabDescriptor } from './types.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

function makeDescriptor(id: string, label = 'Ext'): NopDebuggerPanelTabDescriptor {
  return {
    id: id as NopDebuggerPanelTabDescriptor['id'],
    label,
    render: () => <div data-testid="ext-tab-content">extension content</div>,
  };
}

describe('panel tab extension seam (AI-agnostic)', () => {
  it('rejects tab ids without the x- prefix', () => {
    const controller = createController(createSnapshot());
    expect(() => controller.registerPanelTab(makeDescriptor('ai'))).toThrow(/must use/);
    expect(controller.getPanelTabs()).toEqual([]);
  });

  it('rejects duplicate ids and keeps the first registration', () => {
    const controller = createController(createSnapshot());
    const first = makeDescriptor('x-ext', 'First');
    controller.registerPanelTab(first);
    expect(() => controller.registerPanelTab(makeDescriptor('x-ext', 'Second'))).toThrow(
      /already registered/,
    );
    expect(controller.getPanelTabs()).toEqual([first]);
  });

  it('unregisters on the returned dispose function (idempotent)', () => {
    const controller = createController(createSnapshot());
    const dispose = controller.registerPanelTab(makeDescriptor('x-ext'));
    expect(controller.getPanelTabs()).toHaveLength(1);
    dispose();
    expect(controller.getPanelTabs()).toHaveLength(1 - 1);
    dispose();
    expect(controller.getPanelTabs()).toHaveLength(0);
  });

  it('notifies subscribers on register and unregister', () => {
    const controller = createController(createSnapshot());
    const seen: number[] = [];
    const disposeListener = controller.subscribePanelTabs(() => seen.push(controller.getPanelTabs().length));
    const dispose = controller.registerPanelTab(makeDescriptor('x-ext'));
    dispose();
    expect(seen).toEqual([1, 0]);
    disposeListener();
  });

  it('renders the extension tab trigger; content mounts only while active', async () => {
    // Real controller: chrome updates must flow through the live store.
    const controller = createNopDebugger({ id: 'seam-panel', enabled: true });
    controller.show();
    controller.registerPanelTab(makeDescriptor('x-ext', 'Assistant'));
    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Assistant')).toBeTruthy();
    expect(screen.queryByTestId('ext-tab-content')).toBeNull();

    await act(async () => {
      controller.setActiveTab('x-ext');
    });
    expect(screen.getByTestId('ext-tab-content')).toBeTruthy();

    await act(async () => {
      controller.setActiveTab('timeline');
    });
    expect(screen.queryByTestId('ext-tab-content')).toBeNull();
  });

  it('hands the live inspect selection to the tab context', async () => {
    const controller = createNopDebugger({ id: 'seam-inspect', enabled: true });
    controller.show();
    let seenSelection: unknown = 'unset';
    controller.registerPanelTab({
      id: 'x-inspect',
      label: 'InspectProbe',
      render: ({ getInspectSelection }) => {
        seenSelection = getInspectSelection();
        return null;
      },
    });
    render(<NopDebuggerPanel controller={controller} />);
    await act(async () => {
      controller.setActiveTab('x-inspect');
    });
    expect(seenSelection).toBeNull();
  });

  it('keeps built-in tabs and automation surface unaffected by the seam', async () => {
    const controller = createNopDebugger({ id: 'seam-builtin', enabled: true });
    controller.show();
    controller.registerPanelTab(makeDescriptor('x-ext', 'Assistant'));
    render(<NopDebuggerPanel controller={controller} />);
    // 4 built-in triggers + 1 extension trigger.
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    await act(async () => {
      controller.setActiveTab('timeline');
    });
    expect(controller.getSnapshot().activeTab).toBe('timeline');
    // Window-facing automation API keeps the built-in four-value contract.
    expect(() => controller.automation.setActiveTab('timeline')).not.toThrow();
  });
});
