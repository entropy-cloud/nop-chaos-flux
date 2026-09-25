import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rating } from './rating.js';

afterEach(cleanup);

describe('Rating', () => {
  it('renders count stars in a radiogroup', () => {
    render(<Rating count={5} name="score" />);

    const group = screen.getByRole('radiogroup');
    expect(group.getAttribute('data-slot')).toBe('rating');
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('commits the clicked star value (controlled)', () => {
    const onValueChange = vi.fn();
    render(<Rating count={5} value={2} onValueChange={onValueChange} />);

    fireEvent.click(screen.getAllByRole('radio')[3]!);
    expect(onValueChange).toHaveBeenCalledWith(4);
  });

  it('supports uncontrolled usage with defaultValue', () => {
    function Harness() {
      const [value, setValue] = React.useState<number | undefined>(1);
      return <Rating count={5} defaultValue={value} onValueChange={setValue} />;
    }
    render(<Harness />);

    fireEvent.click(screen.getAllByRole('radio')[3]!);
    const checked = screen.getAllByRole('radio').filter((el) => el.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(4);
  });

  it('keyboard ArrowRight increments and Shift+ArrowRight steps a half star when allowHalf', () => {
    const onValueChange = vi.fn();
    render(<Rating count={5} value={1} allowHalf onValueChange={onValueChange} />);

    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(group, { key: 'ArrowRight', shiftKey: true });
    expect(onValueChange).toHaveBeenLastCalledWith(1.5);
  });

  it('marks half stars visually when value lands on x.5', () => {
    render(<Rating count={5} value={1.5} allowHalf />);

    const half = screen.getAllByRole('radio')[1];
    expect(half!.getAttribute('data-level')).toBe('half');
  });

  it('clears to undefined on repeat click when allowClear', () => {
    const onValueChange = vi.fn();
    render(<Rating count={5} value={3} allowClear onValueChange={onValueChange} />);

    fireEvent.click(screen.getAllByRole('radio')[2]!);
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it('clamps keyboard increment to count when bound value exceeds count', () => {
    const onValueChange = vi.fn();
    render(<Rating count={5} value={9} onValueChange={onValueChange} />);

    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onValueChange).toHaveBeenCalledWith(5);
  });

  it('readOnly and disabled suppress interaction', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Rating count={5} value={2} readOnly onValueChange={onValueChange} />);
    fireEvent.click(screen.getAllByRole('radio')[4]!);
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(<Rating count={5} value={2} disabled onValueChange={onValueChange} />);
    const group = screen.getByRole('radiogroup');
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
