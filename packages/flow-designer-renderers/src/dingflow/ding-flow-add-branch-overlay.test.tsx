// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { DingFlowAddBranchOverlay } from './ding-flow-add-condition-overlay';
import { DingFlowPlusButton } from './ding-flow-plus-button';
import { DingFlowMergeOverlay } from './ding-flow-merge-overlay';

describe('DingFlowAddBranchOverlay', () => {
  beforeEach(async () => {
    resetFluxI18n();
    initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
    await changeLanguage('en-US');
  });

  afterEach(() => {
    resetFluxI18n();
  });

  it('renders branch-native wording', () => {
    render(<DingFlowAddBranchOverlay onClick={vi.fn()} />);

    expect(screen.getByText('Add Branch')).toBeTruthy();
  });

  it('uses accessible labels for plus and merge controls', () => {
    render(
      <>
        <DingFlowPlusButton onClick={vi.fn()} />
        <DingFlowMergeOverlay onClick={vi.fn()} />
      </>,
    );

    expect(screen.getByRole('button', { name: 'Add node' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add merge node' })).toBeTruthy();
  });
});
