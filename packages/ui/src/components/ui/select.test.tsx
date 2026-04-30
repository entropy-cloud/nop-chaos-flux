import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select, SelectTrigger, SelectValue } from './select';

describe('Select', () => {
  it('renders trigger with data-slot', () => {
    const { container } = render(
      <Select defaultValue="a">
        <SelectTrigger>
          <SelectValue placeholder="Choose one" />
        </SelectTrigger>
      </Select>,
    );

    const trigger = container.querySelector('[data-slot="select-trigger"]');
    expect(trigger).toBeTruthy();
  });
});
