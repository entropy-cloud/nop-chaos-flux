import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { t } from '@nop-chaos/flux-i18n';
import { DiffFileList } from '../components/diff-file-list.js';
import type { DiffFileMeta } from '../../schemas.js';

const sampleFiles: DiffFileMeta[] = [
  { fileName: 'src/index.ts', oldContent: 'a', newContent: 'b', status: 'modified' },
];

describe('11-02 diff-view file search input uses ui Input', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the search box as a ui Input (data-slot="input") without hand-written inline styles', () => {
    render(
      <DiffFileList
        files={sampleFiles}
        activeIndex={0}
        onFileSelect={vi.fn() as (index: number) => void}
      />,
    );
    const input = screen.getByPlaceholderText(t('flux.diff.searchFiles')) as HTMLInputElement;
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(input.getAttribute('aria-label')).toBeTruthy();
    // No hand-written inline styling on the input (ui Input owns the visual).
    expect(input.getAttribute('style')).toBeNull();
  });
});
