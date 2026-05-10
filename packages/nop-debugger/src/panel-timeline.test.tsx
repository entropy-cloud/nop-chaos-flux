// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { NopDebuggerPanel } from './panel.js';
import { createSnapshot, createController } from './panel.test.js';

beforeEach(async () => {
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  await changeLanguage('en-US');
});

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

describe('NopDebuggerPanel – timeline search and filters', () => {
  it('filters events by search text', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'User login',
        actionType: 'login',
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 200,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'User logout',
        actionType: 'logout',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('User login')).toBeTruthy();
    expect(screen.getByText('User logout')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Search events, /regex/, or path:body.0'), {
      target: { value: 'login' },
    });

    expect(screen.getByText((_, element) => element?.textContent === 'User login')).toBeTruthy();
    expect(screen.queryByText('User logout')).toBeNull();
  });

  it('stores search history on enter and reuses it from chips', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'notify',
        group: 'notify',
        level: 'info',
        source: 'toast',
        summary: 'Saved successfully',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const search = screen.getByPlaceholderText('Search events, /regex/, or path:body.0');
    fireEvent.change(search, { target: { value: 'saved' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'saved' })).toBeTruthy();

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'saved' }));

    expect(
      (screen.getByPlaceholderText('Search events, /regex/, or path:body.0') as HTMLInputElement)
        .value,
    ).toBe('saved');
  });

  it('highlights plain-text search matches in event summaries', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'notify',
        group: 'notify',
        level: 'info',
        source: 'toast',
        summary: 'Saved successfully',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.change(screen.getByPlaceholderText('Search events, /regex/, or path:body.0'), {
      target: { value: 'saved' },
    });

    expect(document.querySelector('.ndbg-highlight')?.textContent?.toLowerCase()).toBe('saved');
  });

  it('filters timeline events by path: query', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'Submit body.0',
        path: 'body.0',
        actionType: 'submit',
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 200,
        kind: 'action:start',
        group: 'action',
        level: 'info',
        source: 'test',
        summary: 'Submit footer.0',
        path: 'footer.0',
        actionType: 'submit',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.change(screen.getByPlaceholderText('Search events, /regex/, or path:body.0'), {
      target: { value: 'path:body.0' },
    });

    expect(screen.getByText('Submit body.0')).toBeTruthy();
    expect(screen.queryByText('Submit footer.0')).toBeNull();
  });

  it('filters timeline events by regex query', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'notify',
        group: 'notify',
        level: 'info',
        source: 'toast',
        summary: 'Saved successfully',
      },
      {
        id: 2,
        sessionId: 'session-test',
        timestamp: 200,
        kind: 'notify',
        group: 'notify',
        level: 'info',
        source: 'toast',
        summary: 'Save failed',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    fireEvent.change(screen.getByPlaceholderText('Search events, /regex/, or path:body.0'), {
      target: { value: '/saved/i' },
    });

    expect(screen.getByText('Saved successfully')).toBeTruthy();
    expect(screen.queryByText('Save failed')).toBeNull();
  });

  it('virtualizes large timeline lists and reveals later items on scroll', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = Array.from({ length: 120 }, (_, index) => ({
      id: index + 1,
      sessionId: 'session-test',
      timestamp: index * 100,
      kind: 'action:start' as const,
      group: 'action' as const,
      level: 'info' as const,
      source: 'test',
      summary: `Event ${index}`,
      actionType: 'submit',
    }));
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    expect(screen.getByText('Event 0')).toBeTruthy();
    expect(screen.queryByText('Event 80')).toBeNull();

    const list = screen.getByTestId('ndbg-timeline-list');
    list.scrollTop = 80 * 96;
    fireEvent.scroll(list);

    expect(screen.getByText('Event 80')).toBeTruthy();
  });

  it('toggles the errors-only filter class and active marker', () => {
    const snapshot = createSnapshot();
    snapshot.activeTab = 'timeline';
    snapshot.events = [
      {
        id: 1,
        sessionId: 'session-test',
        timestamp: 100,
        kind: 'error',
        group: 'error',
        level: 'error',
        source: 'test',
        summary: 'Boom',
      },
    ];
    const controller = createController(snapshot);

    render(<NopDebuggerPanel controller={controller} />);

    const toggle = screen.getByRole('button', { name: 'Errors Only' });
    expect(toggle.className).toContain('ndbg-filter');
    expect(toggle.hasAttribute('data-active')).toBe(false);

    fireEvent.click(toggle);

    expect(toggle.className).toContain('ndbg-filter');
    expect(toggle.className).toContain('ndbg-errors-only-toggle');
    expect(toggle.hasAttribute('data-active')).toBe(true);
  });
});
