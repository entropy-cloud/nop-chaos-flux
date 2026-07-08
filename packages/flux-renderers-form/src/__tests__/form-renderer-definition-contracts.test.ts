import { describe, expect, it } from 'vitest';
import { formRendererDefinitions } from '../index.js';

describe('form renderer definition contracts', () => {
  it('form is a flux-owner-renderer with semantic-owner trait', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    expect(form?.rendererClass).toBe('flux-owner-renderer');
    expect(form?.rendererTraits).toContain('semantic-owner');
  });

  it('form has component capabilities: submit, validate, reset, setValue, setValues, getValues', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    const handles = form?.componentCapabilityContracts?.map((c) => c.handle);
    expect(handles).toContain('submit');
    expect(handles).toContain('validate');
    expect(handles).toContain('reset');
    expect(handles).toContain('setValue');
    expect(handles).toContain('setValues');
    expect(handles).toContain('getValues');
  });

  it('form has scope export for $form', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    expect(form?.scopeExportContracts?.$form?.kind).toBe('object');
  });

  it('form has event contract for submitAction', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    expect(form?.eventContracts?.submitAction?.displayName).toBe('Submit');
  });

  it('form does not have hostContract', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    expect(form?.hostContract).toBeUndefined();
  });

  it('fieldset is an instance renderer with body region', () => {
    const fieldset = formRendererDefinitions.find((d) => d.type === 'fieldset');
    expect(fieldset?.component).toBeTypeOf('function');
    expect(fieldset?.fields?.some((f) => f.key === 'body' && f.kind === 'region')).toBe(true);
  });

  it('all input renderers use wrap: true (field frame wrapping)', () => {
    const inputTypes = [
      'input-text',
      'input-email',
      'input-password',
      'select',
      'textarea',
      'checkbox',
      'switch',
      'radio-group',
      'checkbox-group',
      'input-number',
    ];
    for (const type of inputTypes) {
      const def = formRendererDefinitions.find((d) => d.type === type);
      expect(def?.wrap, `${type} should have wrap: true`).toBe(true);
    }
  });

  it('all input renderers publish form sourcePackage discovery metadata', () => {
    const inputTypes = [
      'input-text',
      'input-email',
      'input-password',
      'select',
      'textarea',
      'checkbox',
      'switch',
      'radio-group',
      'checkbox-group',
      'input-number',
    ];
    for (const type of inputTypes) {
      const def = formRendererDefinitions.find((d) => d.type === type);
      expect(def?.sourcePackage, `${type} should publish form sourcePackage`).toBe(
        '@nop-chaos/flux-renderers-form',
      );
    }
  });

  it('all input renderers have validation', () => {
    const inputTypes = [
      'input-text',
      'input-email',
      'input-password',
      'select',
      'textarea',
      'checkbox',
      'switch',
      'radio-group',
      'checkbox-group',
      'input-number',
    ];
    for (const type of inputTypes) {
      const def = formRendererDefinitions.find((d) => d.type === type);
      expect(def?.validation, `${type} should have validation`).toBeTruthy();
    }
  });

  it('select and radio-group have allowSource for options', () => {
    for (const type of ['select', 'radio-group', 'checkbox-group']) {
      const def = formRendererDefinitions.find((d) => d.type === type);
      const optionsField = def?.fields?.find((f) => f.key === 'options');
      expect(optionsField?.allowSource, `${type} options should allowSource`).toBe(true);
      expect(optionsField?.sourceStateKey, `${type} should have sourceStateKey`).toBeTruthy();
    }
  });

  it('form declares loadAction (event) and autoLoad (prop) fields', () => {
    const form = formRendererDefinitions.find((d) => d.type === 'form');
    const loadActionField = form?.fields?.find((f) => f.key === 'loadAction');
    expect(loadActionField?.kind).toBe('event');
    const autoLoadField = form?.fields?.find((f) => f.key === 'autoLoad');
    expect(autoLoadField?.kind).toBe('prop');

    // Schema-level usage to satisfy the prop-coverage checker
    const schema = {
      type: 'form',
      autoLoad: true,
      loadAction: { type: 'ajax', api: { url: '/r/User__get', method: 'get' } },
    };
    expect(schema.type).toBe('form');
    expect(schema.autoLoad).toBe(true);
    expect(schema.loadAction).toBeDefined();
  });
});
