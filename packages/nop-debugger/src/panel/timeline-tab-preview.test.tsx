// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { TimelineTab, type TimelinePreviewApi } from './timeline-tab.js';
import type { NopDebugEvent } from '../types.js';
import { createForestSnapshotCollector } from '../snapshot-repository.js';

function makeEvents(count: number): NopDebugEvent[] {
  return Array.from({ length: count }, (_, index) => ({
    id: count - index,
    sessionId: 's',
    timestamp: 1000 + index,
    kind: 'action:end',
    group: 'action',
    level: 'info',
    source: 'test',
    summary: `event-${index}`,
  })) as unknown as NopDebugEvent[];
}

function makePreviewApi(): TimelinePreviewApi & { enterPreview: ReturnType<typeof vi.fn> } {
  const collector = createForestSnapshotCollector();
  collector.observe({ scopeId: 'root', revision: 1, snapshot: { a: 1 }, change: { paths: ['a'], revision: 1 } });
  collector.flush();
  collector.observe({ scopeId: 'root', revision: 2, snapshot: { a: 2, b: 3 }, change: { paths: ['a', 'b'], revision: 2 } });
  collector.flush();
  const enterPreview = vi.fn((epoch: number) => collector.getSnapshotAt(epoch) !== null);
  return {
    getSnapshotEpochs: () => collector.getEpochs(),
    getSnapshotAt: (epoch: number) => collector.getSnapshotAt(epoch),
    enterPreview,
    leavePreview: vi.fn(),
    setPreviewPinned: vi.fn(),
    isPreviewActive: () => true,
  } as never;
}

function renderTab(previewApi?: TimelinePreviewApi) {
  return render(
    <TimelineTab
      filters={[]}
      searchText=""
      setSearchText={() => {}}
      submitSearch={() => {}}
      searchHistory={[]}
      applySearchHistory={() => {}}
      errorsOnly={false}
      toggleErrorsOnly={() => {}}
      filterLabels={{ action: 'action', api: 'api' } as never}
      toggleFilter={() => {}}
      errorGroups={[]}
      errorGroupExpanded={null}
      setErrorGroupExpanded={() => {}}
      activeTimelineEvents={makeEvents(3)}
      expandedId={null}
      setExpandedId={() => {}}
      previewApi={previewApi}
    />,
  );
}

describe('TimelineTab preview scrub (M2)', () => {
  it('renders the scrub section only when previewApi is wired', () => {
    const { container } = renderTab();
    expect(container.querySelector('[data-testid="ndbg-timeline-scrub"]')).toBeNull();
  });

  it('range input change enters preview for the selected epoch and renders the diff list', () => {
    const api = makePreviewApi();
    const { container, getByTestId } = renderTab(api);
    const range = getByTestId('ndbg-preview-range') as HTMLInputElement;
    expect(range).not.toBeNull();
    fireEvent.change(range, { target: { value: '1' } });
    expect(api.enterPreview).toHaveBeenCalledWith(2);
    const state = getByTestId('ndbg-preview-state');
    expect(state.textContent).toContain('epoch 2');
    const diff = container.querySelector('[data-testid="ndbg-snapshot-diff"]');
    expect(diff).not.toBeNull();
    expect(diff!.textContent).toContain('root.a');
    expect(diff!.textContent).toContain('root.b');
  });

  it('exit button leaves preview and clears the diff list', () => {
    const api = makePreviewApi();
    const { getByTestId } = renderTab(api);
    const range = getByTestId('ndbg-preview-range') as HTMLInputElement;
    fireEvent.change(range, { target: { value: '1' } });
    fireEvent.click(getByTestId('ndbg-preview-exit'));
    expect(api.leavePreview).toHaveBeenCalled();
    expect(getByTestId('ndbg-preview-state').textContent).toContain('live');
  });
});
