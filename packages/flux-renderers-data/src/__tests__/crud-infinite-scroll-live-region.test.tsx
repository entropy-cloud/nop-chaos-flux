import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CrudInfiniteScrollArea } from '../crud-infinite-scroll-area.js';

afterEach(cleanup);

describe('20-02 crud infinite scroll live region (WCAG 4.1.3)', () => {
  it('exposes the status text inside a role="status" aria-live="polite" region', () => {
    render(
      <CrudInfiniteScrollArea
        loadDataOnce={false}
        filteredRowCount={0}
        atLastPage={false}
        infiniteState={{ loading: true, error: undefined, setError: () => {} }}
        infiniteSentinelRef={null}
        onRetry={() => {}}
      />,
    );

    const status = document.querySelector('[data-slot="crud-infinite-status"]');
    expect(status).toBeTruthy();
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('keeps the live region on the error state (error text is announced)', () => {
    render(
      <CrudInfiniteScrollArea
        loadDataOnce={false}
        filteredRowCount={0}
        atLastPage={false}
        infiniteState={{ loading: false, error: new Error('boom'), setError: () => {} }}
        infiniteSentinelRef={null}
        onRetry={() => {}}
      />,
    );

    const status = document.querySelector('[data-slot="crud-infinite-status"]');
    expect(status?.getAttribute('role')).toBe('status');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(status?.textContent).toBeTruthy();
  });
});
