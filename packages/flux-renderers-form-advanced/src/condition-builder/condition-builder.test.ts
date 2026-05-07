import { describe, expect, it } from 'vitest';
import { changeLanguage, initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { formAdvancedRendererDefinitions } from '../index.js';

describe('condition-builder renderer', () => {
  it('registers in formAdvancedRendererDefinitions', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def).toBeDefined();
    expect(def!.type).toBe('condition-builder');
    expect(def!.component).toBeDefined();
  });

  it('has wrap enabled', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def!.wrap).toBe(true);
  });

  it('has label field rule', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    expect(def!.fields).toBeDefined();
    expect(def!.fields!).toHaveLength(1);
    expect(def!.fields![0]!.key).toBe('label');
  });

  it('has field validation kind', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, unknown> | undefined;
    expect(v).toBeDefined();
    expect(v!.kind).toBe('field');
  });

  it('has valueKind scalar', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, unknown> | undefined;
    expect(v!.valueKind).toBe('scalar');
  });

  it('getFieldPath returns name from schema', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    expect(v!.getFieldPath({ name: 'myField' })).toBe('myField');
    expect(v!.getFieldPath({})).toBeUndefined();
  });

  it('collects required validation rule when required is true', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('zh-CN');

    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ required: true, name: 'test' });
    expect(rules).toHaveLength(1);
    expect(rules[0].kind).toBe('required');
    expect(rules[0].message).toContain('不能为空');
  });

  it('uses flux-i18n required message after language switch', async () => {
    resetFluxI18n();
    initFluxI18n();
    await changeLanguage('en-US');

    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ required: true, label: 'Rule' });

    expect(rules[0].message).toBe('Rule cannot be empty');
  });

  it('collects no rules when required is not set', () => {
    const def = formAdvancedRendererDefinitions.find((d) => d.type === 'condition-builder');
    const v = def?.validation as Record<string, any> | undefined;
    const rules = v!.collectRules({ name: 'test' });
    expect(rules).toHaveLength(0);
  });
});
