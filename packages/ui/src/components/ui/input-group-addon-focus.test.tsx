import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from './input-group.js';

afterEach(() => cleanup());

// WA-ui-006: the addon is a focusable proxy for the group's control. The
// delegation must address controls by the input-group-control slot contract
// (registration context first, slot-selector fallback second) — NOT by the
// hardcoded `input` tag name, which silently missed InputGroupTextarea.

function getAddon(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('[data-slot="input-group-addon"]')!;
}

describe('WA-ui-006 — InputGroupAddon focus delegation', () => {
  it('delegates click focus to a registered InputGroupTextarea', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="notes" />
      </InputGroup>,
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.click(getAddon(container));
    expect(document.activeElement).toBe(textarea);
  });

  it('delegates Enter-key focus to a registered InputGroupTextarea', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="notes" />
      </InputGroup>,
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.keyDown(getAddon(container), { key: 'Enter' });
    expect(document.activeElement).toBe(textarea);
  });

  it('delegates Space-key focus to a registered InputGroupTextarea', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="notes" />
      </InputGroup>,
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.keyDown(getAddon(container), { key: ' ' });
    expect(document.activeElement).toBe(textarea);
  });

  it('still delegates focus to a registered InputGroupInput', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
        <InputGroupInput placeholder="url" />
      </InputGroup>,
    );
    const input = container.querySelector('input')!;
    fireEvent.click(getAddon(container));
    expect(document.activeElement).toBe(input);
  });

  it('falls back to the input-group-control slot contract for raw controls (command-style usage)', () => {
    const { container } = render(
      <InputGroup>
        <input data-slot="input-group-control" placeholder="raw" />
        <InputGroupAddon>
          <span>search</span>
        </InputGroupAddon>
      </InputGroup>,
    );
    const input = container.querySelector('input')!;
    fireEvent.click(getAddon(container));
    expect(document.activeElement).toBe(input);
  });

  it('prefers the first registered control in DOM order when several are registered', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <span>https://</span>
        </InputGroupAddon>
        <InputGroupInput placeholder="first" />
        <InputGroupInput placeholder="second" />
      </InputGroup>,
    );
    const first = container.querySelector('input')!;
    fireEvent.click(getAddon(container));
    expect(document.activeElement).toBe(first);
  });

  it('does not steal focus when clicking a nested button inside the addon', () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <button type="button">clear</button>
        </InputGroupAddon>
        <InputGroupTextarea placeholder="notes" />
      </InputGroup>,
    );
    const button = container.querySelector('button')!;
    button.focus();
    // The click originates on the button and bubbles up to the addon; the
    // addon's own handler must early-return for button targets.
    fireEvent.click(button);
    expect(document.activeElement).toBe(button);
  });
});
