import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  getSourceErrorMessage,
  useTreeOptionListController,
  useTreeSelectController,
} from './tree-control-controllers';
import { buildTreeOptionMetaList, getTreeOptionConfig, type TreeOptionMeta } from './tree-options';

function FilterHarness(props: { options: TreeOptionMeta[]; searchable: boolean }) {
  const { query, setQuery, filteredOptions } = useTreeOptionListController(props);

  return (
    <div>
      <input aria-label="query" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div data-testid="labels">
        {filteredOptions.map((option) => (
          <span key={option.valueKey}>{option.pathLabel}</span>
        ))}
      </div>
      <div data-testid="child-counts">
        {filteredOptions.map((option) => (
          <span key={`${option.valueKey}:count`}>{String(option.children.length)}</span>
        ))}
      </div>
    </div>
  );
}

function TriggerHarness(props: {
  options: TreeOptionMeta[];
  value: unknown;
  multiple: boolean;
  placeholder?: string;
}) {
  const result = useTreeSelectController({
    options: props.options,
    treeConfig: getTreeOptionConfig({ showPathLabel: true }),
    value: props.value,
    multiple: props.multiple,
    placeholder: props.placeholder,
  });

  return (
    <div>
      <span data-testid="trigger-text">{result.triggerText ?? ''}</span>
      <span data-testid="trigger-label">{result.triggerLabel}</span>
      <span data-testid="has-selection">{String(result.hasSelection)}</span>
    </div>
  );
}

describe('tree control controllers', () => {
  it('returns object message and fallback source errors', () => {
    expect(getSourceErrorMessage({ status: 'error', error: { message: 'Boom' } } as any)).toBe(
      'Boom',
    );
    expect(getSourceErrorMessage({ status: 'error', error: { code: 500 } } as any)).toBe(
      'Failed to load tree options.',
    );
    expect(getSourceErrorMessage({ loading: true } as any)).toBeUndefined();
  });

  it('filters tree options by child path label and keeps matching parents visible', () => {
    cleanup();
    const options = buildTreeOptionMetaList([
      {
        label: 'Engineering',
        value: 'eng',
        children: [{ label: 'Platform', value: 'platform' }],
      },
      {
        label: 'Design',
        value: 'design',
      },
    ]);

    render(<FilterHarness options={options} searchable />);

    fireEvent.change(screen.getByLabelText('query'), { target: { value: 'platform' } });

    expect(screen.getByTestId('labels').textContent).toContain('Engineering');
    expect(screen.getByTestId('child-counts').textContent).toContain('1');
    expect(screen.getByTestId('labels').textContent).not.toContain('Design');
  });

  it('joins selected labels in checkbox mode and falls back to placeholder when empty', () => {
    cleanup();
    const options = buildTreeOptionMetaList([
      { label: 'Platform', value: 'platform' },
      { label: 'Design', value: 'design' },
    ]);

    const { rerender } = render(
      <TriggerHarness
        options={options}
        value={['platform', 'design']}
        multiple
        placeholder="Choose department"
      />,
    );

    expect(screen.getByTestId('trigger-text').textContent).toBe('Platform, Design');
    expect(screen.getByTestId('has-selection').textContent).toBe('true');

    rerender(
      <TriggerHarness
        options={options}
        value={''}
        multiple={false}
        placeholder="Choose department"
      />,
    );

    expect(screen.getByTestId('trigger-text').textContent).toBe('');
    expect(screen.getByTestId('trigger-label').textContent).toBe('Choose department');
    expect(screen.getByTestId('has-selection').textContent).toBe('false');
  });
});
