import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer } from '@nop-chaos/flux-react';

const mobileState = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@nop-chaos/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nop-chaos/ui')>();
  return {
    ...actual,
    useIsMobile: () => mobileState.isMobile,
  };
});

const { formRendererDefinitions } = await import('../index.js');
const { env } = await import('./form-test-support.js');

const SchemaRenderer = createSchemaRenderer([...formRendererDefinitions]);

beforeEach(() => {
  mobileState.isMobile = false;
});

afterEach(() => {
  cleanup();
  mobileState.isMobile = false;
});

function renderForm(body: Record<string, unknown>[]) {
  return render(
    <SchemaRenderer
      schemaUrl="test://form/choice-touch-adaptation"
      schema={{
        type: 'form',
        body,
      } as React.ComponentProps<typeof SchemaRenderer>['schema']}
      env={env}
      formulaCompiler={createFormulaCompiler()}
    />,
  );
}

describe('checkbox / switch / radio touch adaptation (M2b)', () => {
  it('enlarges the checkbox hit area (min-h-11) and enables nop-haptic on mobile', () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'checkbox',
        name: 'agree',
        label: 'Agree',
        option: { label: 'I accept the terms' },
      },
    ]);
    const wrapper = document.querySelector('[data-slot="checkbox-wrapper"]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('min-h-11');
    expect(wrapper.className).toContain('nop-haptic');
  });

  it('enlarges the switch hit area (min-h-11) and enables nop-haptic on mobile', () => {
    mobileState.isMobile = true;
    renderForm([{ type: 'switch', name: 'notify', label: 'Notify' }]);
    const wrapper = document.querySelector('[data-slot="switch-wrapper"]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.className).toContain('min-h-11');
    expect(wrapper.className).toContain('nop-haptic');
  });

  it('does not enlarge checkbox/switch hit area on desktop (no min-h-11)', () => {
    mobileState.isMobile = false;
    renderForm([
      {
        type: 'checkbox',
        name: 'agree',
        label: 'Agree',
        option: { label: 'I accept the terms' },
      },
      { type: 'switch', name: 'notify', label: 'Notify' },
    ]);
    const checkboxWrapper = document.querySelector(
      '[data-slot="checkbox-wrapper"]',
    ) as HTMLElement;
    const switchWrapper = document.querySelector('[data-slot="switch-wrapper"]') as HTMLElement;
    expect(checkboxWrapper.className).not.toContain('min-h-11');
    expect(switchWrapper.className).not.toContain('min-h-11');
  });

  it('keeps nop-haptic enabled on desktop too (desktop-safe按压反馈)', () => {
    mobileState.isMobile = false;
    renderForm([
      { type: 'switch', name: 'notify', label: 'Notify' },
    ]);
    const wrapper = document.querySelector('[data-slot="switch-wrapper"]') as HTMLElement;
    expect(wrapper.className).toContain('nop-haptic');
  });

  it('stacks checkbox-group vertically (flex-col + mobile-stack marker) on mobile when options > 3', () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'checkbox-group',
        name: 'perms',
        label: 'Permissions',
        options: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
          { label: 'Delete', value: 'delete' },
          { label: 'Admin', value: 'admin' },
        ],
      },
    ]);
    const wrapper = document.querySelector(
      '[data-slot="checkbox-group-wrapper"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute('data-mobile-stack')).toBe('true');
    expect(wrapper.className).toContain('flex-col');
    const items = document.querySelectorAll('[data-slot="checkbox-group-item"]');
    expect(items.length).toBe(4);
    items.forEach((item) => {
      expect((item as HTMLElement).className).toContain('min-h-11');
      expect((item as HTMLElement).className).toContain('nop-haptic');
    });
  });

  it('does not apply mobile-stack layout to checkbox-group on desktop', () => {
    mobileState.isMobile = false;
    renderForm([
      {
        type: 'checkbox-group',
        name: 'perms',
        label: 'Permissions',
        options: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
          { label: 'Delete', value: 'delete' },
          { label: 'Admin', value: 'admin' },
        ],
      },
    ]);
    const wrapper = document.querySelector(
      '[data-slot="checkbox-group-wrapper"]',
    ) as HTMLElement;
    expect(wrapper.getAttribute('data-mobile-stack')).toBeNull();
    const items = document.querySelectorAll('[data-slot="checkbox-group-item"]');
    items.forEach((item) => {
      expect((item as HTMLElement).className).not.toContain('min-h-11');
    });
  });

  it('does not stack checkbox-group vertically on mobile when options <= 3', () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'checkbox-group',
        name: 'perms',
        label: 'Permissions',
        options: [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
        ],
      },
    ]);
    const wrapper = document.querySelector(
      '[data-slot="checkbox-group-wrapper"]',
    ) as HTMLElement;
    expect(wrapper.getAttribute('data-mobile-stack')).toBeNull();
  });

  it('stacks radio-group vertically (mobile-stack marker) on mobile when options > 3 with enlarged items', () => {
    mobileState.isMobile = true;
    renderForm([
      {
        type: 'radio-group',
        name: 'color',
        label: 'Color',
        options: [
          { label: 'Red', value: 'red' },
          { label: 'Green', value: 'green' },
          { label: 'Blue', value: 'blue' },
          { label: 'Yellow', value: 'yellow' },
        ],
      },
    ]);
    const wrapper = document.querySelector(
      '[data-slot="radio-group-wrapper"]',
    ) as HTMLElement;
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute('data-mobile-stack')).toBe('true');
    const items = document.querySelectorAll('label[data-slot="radio-group-item"]');
    expect(items.length).toBe(4);
    items.forEach((item) => {
      expect((item as HTMLElement).className).toContain('min-h-11');
      expect((item as HTMLElement).className).toContain('nop-haptic');
    });
  });

  it('does not apply mobile-stack to radio-group on desktop', () => {
    mobileState.isMobile = false;
    renderForm([
      {
        type: 'radio-group',
        name: 'color',
        label: 'Color',
        options: [
          { label: 'Red', value: 'red' },
          { label: 'Green', value: 'green' },
          { label: 'Blue', value: 'blue' },
          { label: 'Yellow', value: 'yellow' },
        ],
      },
    ]);
    const wrapper = document.querySelector(
      '[data-slot="radio-group-wrapper"]',
    ) as HTMLElement;
    expect(wrapper.getAttribute('data-mobile-stack')).toBeNull();
    const items = document.querySelectorAll('label[data-slot="radio-group-item"]');
    items.forEach((item) => {
      expect((item as HTMLElement).className).not.toContain('min-h-11');
    });
  });
});
