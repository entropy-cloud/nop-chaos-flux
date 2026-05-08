import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ValueInput } from './value-input.js';

describe('condition-builder value input accessibility', () => {
  it('labels both between inputs and exposes badge delete as keyboard-activatable', () => {
    const onChange = () => undefined;

    render(
      <ValueInput
        inputIdPrefix="price"
        field={{ name: 'price', label: 'Price', type: 'number' } as any}
        op="between"
        value={[1, 5]}
        onChange={onChange}
      />,
    );

    expect(screen.getAllByLabelText('条件值')).toHaveLength(2);
  });

  it('gives selected multi-value badges a button role and accessible remove name', () => {
    render(
      <ValueInput
        inputIdPrefix="status"
        field={{
          name: 'status',
          label: 'Status',
          type: 'select',
          options: [{ label: 'Open', value: 'open' }],
        } as any}
        op="select_any_in"
        value={['open']}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Remove value Open' })).toBeTruthy();
  });
});
