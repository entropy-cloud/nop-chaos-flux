import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { OperatorSelect } from './operator-select';
import type { ConditionOperatorInfo } from './operators';

vi.mock('@nop-chaos/ui', () => {
  const forwardRef = React.forwardRef;

  const MockSelectTrigger = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-trigger" {...props}>{children}</div>
  ));
  (MockSelectTrigger as any).displayName = 'SelectTrigger';

  const MockSelectContent = forwardRef(({ children, ...props }: any, ref: any) => (
    <div ref={ref} data-testid="select-content" {...props}>{children}</div>
  ));
  (MockSelectContent as any).displayName = 'SelectContent';

  const MockSelectItem = forwardRef(({ children, value, ...props }: any, ref: any) => (
    <div ref={ref} data-testid={`select-item-${value}`} data-value={value} {...props}>{children}</div>
  ));
  (MockSelectItem as any).displayName = 'SelectItem';

  const MockSelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;

  function MockSelect({ children, value, onValueChange, disabled }: any) {
    return (
      <div data-testid="mock-select" data-value={value} data-disabled={disabled ?? false}>
        <button type="button" data-testid="mock-select-trigger" onClick={() => onValueChange?.('equal')}>
          trigger
        </button>
        <div data-testid="mock-select-content">{children}</div>
      </div>
    );
  }

  return {
    cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
    Select: MockSelect,
    SelectTrigger: MockSelectTrigger,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
    SelectValue: MockSelectValue,
  };
});

resetFluxI18n();
initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });

afterEach(cleanup);

describe('OperatorSelect', () => {
  const operators: ConditionOperatorInfo[] = [
    { label: 'Equal', value: 'equal' },
    { label: 'Not equal', value: 'not_equal' },
    { label: 'Like', value: 'like' },
  ];

  it('returns null when operators array is empty', () => {
    const { container } = render(
      <OperatorSelect operators={[]} value="equal" onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders single operator as static label', () => {
    render(
      <OperatorSelect operators={[{ label: 'Equal', value: 'equal' }]} value="equal" onChange={() => {}} />,
    );
    expect(screen.getByText('Equal')).toBeTruthy();
    expect(screen.queryByTestId('mock-select')).toBeNull();
  });

  it('renders select for multiple operators', () => {
    render(
      <OperatorSelect operators={operators} value="equal" onChange={() => {}} />,
    );
    expect(screen.getByTestId('mock-select')).toBeTruthy();
  });

  it('calls onChange when value changes', () => {
    const onChange = vi.fn();
    render(
      <OperatorSelect operators={operators} value="equal" onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('mock-select-trigger'));
    expect(onChange).toHaveBeenCalledWith('equal');
  });

  it('passes disabled to select', () => {
    render(
      <OperatorSelect operators={operators} value="equal" onChange={() => {}} disabled={true} />,
    );
    expect(screen.getByTestId('mock-select').dataset.disabled).toBe('true');
  });

  it('passes current value to select', () => {
    render(
      <OperatorSelect operators={operators} value="like" onChange={() => {}} />,
    );
    expect(screen.getByTestId('mock-select').dataset.value).toBe('like');
  });

  it('passes empty string when value is undefined', () => {
    render(
      <OperatorSelect operators={operators} value={undefined} onChange={() => {}} />,
    );
    expect(screen.getByTestId('mock-select').dataset.value).toBe('');
  });
});
