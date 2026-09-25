import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ColorPicker, normalizeColorValue } from './color-picker.js';

afterEach(cleanup);

describe('normalizeColorValue', () => {
  it('normalizes hex (3/6 digit) in hex format', () => {
    expect(normalizeColorValue('#abc', 'hex')).toBe('#aabbcc');
    expect(normalizeColorValue('#AABBCC', 'hex')).toBe('#aabbcc');
  });

  it('converts rgb/rgba into the requested format', () => {
    expect(normalizeColorValue('rgb(12, 34, 56)', 'hex')).toBe('#0c2238');
    expect(normalizeColorValue('rgba(12, 34, 56, 0.5)', 'rgba')).toBe('rgba(12, 34, 56, 0.5)');
    expect(normalizeColorValue('#0c2238', 'rgba')).toBe('rgba(12, 34, 56, 1)');
  });

  it('drops alpha when committing in hex format', () => {
    expect(normalizeColorValue('rgba(255, 0, 0, 0.5)', 'hex')).toBe('#ff0000');
  });

  it('returns null for invalid input (never commits)', () => {
    expect(normalizeColorValue('not-a-color', 'hex')).toBeNull();
    expect(normalizeColorValue('', 'hex')).toBeNull();
  });
});

describe('ColorPicker', () => {
  function openPanel() {
    const trigger = screen.getByRole('button', { name: 'color picker' });
    fireEvent.click(trigger);
  }

  it('commits a preset swatch normalized per format', async () => {
    const onValueChange = vi.fn();
    render(<ColorPicker value="" format="rgba" onValueChange={onValueChange} />);

    openPanel();
    const preset = await waitFor(() => {
      const el = document.querySelector('[data-slot="color-picker-preset"][data-color="#dc2626"]');
      expect(el).toBeTruthy();
      return el as HTMLElement;
    });
    fireEvent.click(preset);
    expect(onValueChange).toHaveBeenCalledWith('rgba(220, 38, 38, 1)');
  });

  it('commits a free-form hex input on Enter and clear on empty (controlled loop)', () => {
    const onValueChange = vi.fn();
    function Harness() {
      const [value, setValue] = React.useState<string | undefined>('');
      return (
        <ColorPicker
          value={value}
          onValueChange={(next) => {
            onValueChange(next);
            setValue(next);
          }}
        />
      );
    }
    render(<Harness />);

    openPanel();
    const input = screen.getByPlaceholderText('#rrggbb 或 rgba(…)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '#00ff00' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onValueChange).toHaveBeenCalledWith('#00ff00');
    expect(input.value).toBe('#00ff00');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenCalledWith(undefined);
  });

  it('does not commit invalid input', () => {
    const onValueChange = vi.fn();
    render(<ColorPicker value="#123456" onValueChange={onValueChange} />);

    openPanel();
    const input = screen.getByPlaceholderText('#rrggbb 或 rgba(…)');
    fireEvent.change(input, { target: { value: 'not-a-color' } });
    fireEvent.blur(input);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('shows the current value swatch on the trigger', () => {
    render(<ColorPicker value="#dc2626" />);

    const swatch = document.querySelector('[data-slot="color-picker-swatch"]') as HTMLElement;
    expect(swatch).toBeTruthy();
    expect(swatch.style.backgroundColor).toMatch(/#dc2626|rgb\(220, 38, 38\)/);
  });
});
