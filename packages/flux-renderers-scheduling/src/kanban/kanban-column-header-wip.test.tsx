import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { KanbanColumnHeader } from './kanban-column-header.js';
import type { BoardItem } from './kanban.types.js';

afterEach(() => {
  cleanup();
  resetFluxI18n();
});

const column: BoardItem = {
  id: 'col1',
  type: 'column',
  children: [],
  data: { title: 'To Do' },
  meta: {},
};

function renderHeader(overrides: Partial<Parameters<typeof KanbanColumnHeader>[0]> = {}) {
  return render(
    <KanbanColumnHeader
      column={column}
      cardCount={5}
      collapsed={false}
      onToggleCollapse={() => {}}
      wipWarning
      wipText="5/3"
      {...overrides}
    />,
  );
}

describe('kanban column header WIP non-color channel (a11y 20-07)', () => {
  it('exposes an sr-only WIP-exceeded announcement inside the badge when the limit is exceeded (en-US)', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    renderHeader();

    // Real key resolution (not a t() mock): a bare key would render as
    // "scheduling.kanban.wipExceeded" and fail this text assertion.
    expect(screen.getByText('WIP limit exceeded')).toBeTruthy();
    const announcement = screen.getByText('WIP limit exceeded');
    expect(announcement.closest('[data-slot="kanban-column-header"]')).toBeTruthy();
    expect(announcement.className).toContain('sr-only');
  });

  it('resolves the zh-CN wording through the registered key', async () => {
    initFluxI18n({ lng: 'zh-CN', fallbackLng: 'zh-CN' });
    await changeLanguage('zh-CN');
    renderHeader();

    expect(screen.getByText('超出 WIP 上限')).toBeTruthy();
  });

  it('renders no exceeded announcement while the column is within its WIP limit', async () => {
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
    renderHeader({ wipWarning: false, wipText: undefined });

    expect(screen.queryByText('WIP limit exceeded')).toBeNull();
  });
});
