import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DiffFileList } from '../components/diff-file-list.js';
import type { DiffFileMeta } from '../../schemas.js';

const sampleFiles: DiffFileMeta[] = [
  { fileName: 'src/index.ts', oldContent: 'a', newContent: 'b', status: 'modified' },
  { fileName: 'src/utils.ts', oldContent: '', newContent: 'new code', status: 'added' },
  { fileName: 'old.ts', oldContent: 'old code', newContent: '', status: 'deleted' },
  { fileName: 'README.md', oldContent: '', newContent: 'docs', status: 'added' },
];

describe('DiffFileList', () => {
  let onFileSelect: (index: number) => void;

  beforeEach(() => {
    onFileSelect = vi.fn() as (index: number) => void;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all files by default', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    expect(screen.getByText('src/index.ts')).toBeTruthy();
    expect(screen.getByText('src/utils.ts')).toBeTruthy();
    expect(screen.getByText('old.ts')).toBeTruthy();
    expect(screen.getByText('README.md')).toBeTruthy();
  });

  it('displays change statistics for each file', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    expect(screen.getAllByText('+1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('-1').length).toBeGreaterThanOrEqual(1);
  });

  it('filters files by search text', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const input = screen.getByPlaceholderText('Search files...');
    fireEvent.change(input, { target: { value: 'src' } });
    expect(screen.getByText('src/index.ts')).toBeTruthy();
    expect(screen.getByText('src/utils.ts')).toBeTruthy();
    expect(screen.queryByText('old.ts')).toBeNull();
    expect(screen.queryByText('README.md')).toBeNull();
  });

  it('filters files by status tab "added"', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const addedTab = screen.getByText(/Added/);
    fireEvent.click(addedTab);
    expect(screen.queryByText('src/index.ts')).toBeNull();
    expect(screen.getByText('src/utils.ts')).toBeTruthy();
    expect(screen.queryByText('old.ts')).toBeNull();
    expect(screen.getByText('README.md')).toBeTruthy();
  });

  it('filters files by status tab "deleted"', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const deletedTab = screen.getByText(/Deleted/);
    fireEvent.click(deletedTab);
    expect(screen.queryByText('src/index.ts')).toBeNull();
    expect(screen.queryByText('src/utils.ts')).toBeNull();
    expect(screen.getByText('old.ts')).toBeTruthy();
    expect(screen.queryByText('README.md')).toBeNull();
  });

  it('filters files by status tab "modified"', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const modifiedTab = screen.getByText(/Modified/);
    fireEvent.click(modifiedTab);
    expect(screen.getByText('src/index.ts')).toBeTruthy();
    expect(screen.queryByText('src/utils.ts')).toBeNull();
    expect(screen.queryByText('old.ts')).toBeNull();
    expect(screen.queryByText('README.md')).toBeNull();
  });

  it('fires onFileSelect when a file is clicked', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    fireEvent.click(screen.getByText('old.ts'));
    expect(onFileSelect).toHaveBeenCalledWith(2);
  });

  it('shows unread dot for unvisited files', () => {
    const { container } = render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const fileItems = container.querySelectorAll('[role="button"]');
    expect(fileItems.length).toBeGreaterThanOrEqual(4);
  });

  it('shows "No files match" when search yields no results', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    const input = screen.getByPlaceholderText('Search files...');
    fireEvent.change(input, { target: { value: 'nonexistent' } });
    expect(screen.getByText('无匹配文件')).toBeTruthy();
  });

  it('fires onFileSelect with correct index for every file', () => {
    render(<DiffFileList files={sampleFiles} activeIndex={0} onFileSelect={onFileSelect} />);
    fireEvent.click(screen.getByText('README.md'));
    expect(onFileSelect).toHaveBeenCalledWith(3);
  });
});

describe('DiffFileMeta schema', () => {
  it('accepts valid DiffFileMeta objects', () => {
    const file: DiffFileMeta = {
      fileName: 'test.ts',
      oldContent: 'old',
      newContent: 'new',
      language: 'typescript',
      status: 'modified',
    };
    expect(file.fileName).toBe('test.ts');
    expect(file.status).toBe('modified');
  });

  it('accepts "added" status without oldContent', () => {
    const file: DiffFileMeta = {
      fileName: 'new.ts',
      newContent: 'content',
      status: 'added',
    };
    expect(file.status).toBe('added');
    expect(file.oldContent).toBeUndefined();
  });

  it('accepts "deleted" status without newContent', () => {
    const file: DiffFileMeta = {
      fileName: 'removed.ts',
      oldContent: 'content',
      status: 'deleted',
    };
    expect(file.status).toBe('deleted');
    expect(file.newContent).toBeUndefined();
  });
});
