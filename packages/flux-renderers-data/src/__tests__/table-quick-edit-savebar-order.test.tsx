// @vitest-environment jsdom

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import {
  RowQuickEditSaveBar,
  type RowQuickEditDraftApi,
} from '../table-renderer/use-row-quick-edit-draft.js';

function makeRowDraft(overrides: Partial<RowQuickEditDraftApi> = {}): RowQuickEditDraftApi {
  return {
    isRowDirty: true,
    saving: false,
    runSave: vi.fn(),
    cancelEditing: vi.fn(),
    ...overrides,
  } as unknown as RowQuickEditDraftApi;
}

describe('RowQuickEditSaveBar button order (G3-视角2-02, plan 486 Phase 2 proof)', () => {
  beforeEach(() => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  });

  afterEach(() => {
    cleanup();
    resetFluxI18n();
  });

  it('renders [Cancel(secondary/outline), Save(primary)] in DOM order', () => {
    const { container } = render(<RowQuickEditSaveBar rowDraft={makeRowDraft()} />);
    const bar = container.querySelector('[data-slot="table-row-save-bar"]');
    expect(bar).not.toBeNull();
    const buttons = bar!.querySelectorAll('button');
    expect(buttons).toHaveLength(2);
    // [secondary, primary] contract: Cancel (outline) first, Save (primary) last.
    expect(buttons[0].textContent).toBe('Cancel');
    expect(buttons[0].className).toContain('bg-background');
    expect(buttons[1].textContent).toBe('Save');
    expect(buttons[1].className).toContain('bg-primary');
  });

  it('keeps the saving state on a Spinner status (no order surface)', () => {
    const { container } = render(
      <RowQuickEditSaveBar rowDraft={makeRowDraft({ saving: true })} />,
    );
    const status = container.querySelector('[data-slot="table-quick-edit-saving"]');
    expect(status).not.toBeNull();
    expect(status!.querySelector('.nop-spinner')).not.toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});

describe('RowQuickEditSaveBar without provider context (perf P7 gate)', () => {
  it('renders nothing when no rowDraft prop and no provider context exist', () => {
    const { container } = render(<RowQuickEditSaveBar />);
    expect(container.firstChild).toBeNull();
  });
});
