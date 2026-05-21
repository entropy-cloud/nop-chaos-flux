import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  getSourceErrorMessage,
  useTreeOptionNodeController,
  useTreeOptionListController,
  useTreeSelectController,
} from './tree-control-controllers.js';
import { buildTreeOptionMetaList, getTreeOptionConfig, type TreeOptionMeta } from './tree-options.js';

function FilterHarness(props: { options: TreeOptionMeta[]; searchable: boolean }) {
  const { query, setQuery, filteredOptions } = useTreeOptionListController({
    ...props,
    disabled: false,
  });

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

function NodeControllerHarness(props: {
  disabled?: boolean;
  onChange: (value: unknown) => void;
}) {
  const option = buildTreeOptionMetaList([
    {
      label: 'Engineering',
      value: 'eng',
      children: [{ label: 'Platform', value: 'platform' }],
    },
  ])[0];
  const [expanded, setExpanded] = React.useState(true);
  const controller = useTreeOptionNodeController({
    option,
    value: '',
    multiple: false,
    disabled: props.disabled ?? false,
    onChange: props.onChange,
    expanded,
    focused: true,
    itemId: 'tree-item-1',
    onToggleExpanded: (_option, nextExpanded) => setExpanded(nextExpanded),
    onMoveFocus: vi.fn(),
    onFocusItem: vi.fn(),
  });

  return (
    <>
      <button type="button" onKeyDown={controller.handleChevronKeyDown} data-testid="chevron">
        chevron
      </button>
      <div onKeyDown={controller.handleKeyDown} data-testid="row" tabIndex={0}>
        row
      </div>
      <span data-testid="expanded">{String(controller.expanded)}</span>
    </>
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

  it('toggles chevron by keyboard without selecting the row', () => {
    cleanup();
    const onChange = vi.fn();

    render(<NodeControllerHarness onChange={onChange} />);

    fireEvent.keyDown(screen.getByTestId('chevron'), { key: 'Enter' });
    expect(screen.getByTestId('expanded').textContent).toBe('false');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByTestId('chevron'), { key: ' ' });
    expect(screen.getByTestId('expanded').textContent).toBe('true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('routes tree keyboard navigation through the shared move-focus callback', () => {
    cleanup();
    const option = buildTreeOptionMetaList([
      {
        label: 'Engineering',
        value: 'eng',
        children: [{ label: 'Platform', value: 'platform' }],
      },
    ])[0];
    const onMoveFocus = vi.fn();

    function Harness() {
      const controller = useTreeOptionNodeController({
        option,
        value: '',
        multiple: false,
        disabled: false,
        onChange: vi.fn(),
        expanded: true,
        focused: true,
        itemId: 'tree-item-1',
        onToggleExpanded: vi.fn(),
        onMoveFocus,
        onFocusItem: vi.fn(),
      });

      return <div onKeyDown={controller.handleKeyDown} data-testid="row" tabIndex={0} />;
    }

    render(<Harness />);

    fireEvent.keyDown(screen.getByTestId('row'), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByTestId('row'), { key: 'ArrowUp' });
    fireEvent.keyDown(screen.getByTestId('row'), { key: 'Home' });
    fireEvent.keyDown(screen.getByTestId('row'), { key: 'End' });

    expect(onMoveFocus.mock.calls).toEqual([
      ['next'],
      ['prev'],
      ['first'],
      ['last'],
    ]);
  });

  it('keeps the same joined label output in checkbox mode', () => {
    cleanup();
    const options = buildTreeOptionMetaList([
      { label: 'Platform', value: 'platform' },
      { label: 'Design', value: 'design' },
    ]);

    render(
      <TriggerHarness
        options={options}
        value={['platform', 'design']}
        multiple
        placeholder="Choose department"
      />,
    );

    expect(screen.getByTestId('trigger-text').textContent).toBe('Platform, Design');
  });
});
