import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion.js';

afterEach(() => {
  cleanup();
});

describe('Accordion', () => {
  it('renders slots and toggles expanded state through the trigger', async () => {
    render(
      <Accordion>
        <AccordionItem value="item-1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Section 1 body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );

    const trigger = screen.getByRole('button', { name: 'Section 1' });
    expect(trigger.getAttribute('data-slot')).toBe('accordion-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(screen.getByText('Section 1 body').closest('[data-slot="accordion-content"]')).toBeTruthy();
    });
  });
});
