import { describe, expect, it } from 'vitest';
import { basicRendererDefinitions } from '../index.js';

const LAYOUT_TYPES = ['page', 'container', 'flex', 'fragment'];
const SURFACE_TYPES = ['dialog', 'drawer'];

describe('renderer definition contract smoke tests', () => {
  it('every renderer definition has a type and component', () => {
    for (const def of basicRendererDefinitions) {
      expect(def.type).toBeTruthy();
      expect(def.component).toBeTypeOf('function');
    }
  });

  it('every renderer definition declares sourcePackage', () => {
    for (const def of basicRendererDefinitions) {
      expect(def.sourcePackage).toBe('@nop-chaos/flux-renderers-basic');
    }
  });

  it('layout renderers do not have rendererClass (they are not instance-renderers)', () => {
    for (const def of basicRendererDefinitions) {
      if (LAYOUT_TYPES.includes(def.type)) {
        expect(def.rendererClass).toBeUndefined();
      }
    }
  });

  it('button is the only instance-renderer in basic', () => {
    const instanceRenderers = basicRendererDefinitions.filter(
      (d) => d.rendererClass === 'instance-renderer',
    );
    expect(instanceRenderers.map((d) => d.type)).toEqual(['button']);
  });

  it('no renderer has hostContract (none are domain-host-renderers)', () => {
    for (const def of basicRendererDefinitions) {
      expect(def.hostContract).toBeUndefined();
    }
  });

  it('button has event contracts with onClick', () => {
    const button = basicRendererDefinitions.find((d) => d.type === 'button');
    expect(button?.eventContracts?.onClick).toBeTruthy();
    expect(button?.eventContracts?.onClick?.displayName).toBeTruthy();
  });

  it('layout renderers have region fields', () => {
    const page = basicRendererDefinitions.find((d) => d.type === 'page');
    const container = basicRendererDefinitions.find((d) => d.type === 'container');
    const flex = basicRendererDefinitions.find((d) => d.type === 'flex');

    expect(page?.fields?.some((f) => f.key === 'body' && f.kind === 'region')).toBe(true);
    expect(container?.fields?.some((f) => f.key === 'body' && f.kind === 'region')).toBe(true);
    expect(flex?.fields?.some((f) => f.key === 'body' && f.kind === 'region')).toBe(true);
  });

  it('text renderer supports value-or-source fields', () => {
    const text = basicRendererDefinitions.find((d) => d.type === 'text');
    const textField = text?.fields?.find((f) => f.key === 'text');
    expect(textField?.kind).toBe('prop');
    expect(textField?.allowSource).toBe(true);
  });

  it('dialog and drawer have onOpen and onClose events', () => {
    for (const type of SURFACE_TYPES) {
      const def = basicRendererDefinitions.find((d) => d.type === type);
      expect(def?.fields?.some((f) => f.key === 'onOpen' && f.kind === 'event')).toBe(true);
      expect(def?.fields?.some((f) => f.key === 'onClose' && f.kind === 'event')).toBe(true);
    }
  });

  it('tabs renderer has onChange event', () => {
    const tabs = basicRendererDefinitions.find((d) => d.type === 'tabs');
    expect(tabs?.fields?.some((f) => f.key === 'onChange' && f.kind === 'event')).toBe(true);
  });

  it('loop renderer declares params on body region', () => {
    const loop = basicRendererDefinitions.find((d) => d.type === 'loop');
    const bodyField = loop?.fields?.find((f) => f.key === 'body');
    expect(bodyField?.kind).toBe('region');
    expect(bodyField?.params).toEqual(['item', 'index']);
  });

  it('loop renderer declares lazyEval on itemData', () => {
    const loop = basicRendererDefinitions.find((d) => d.type === 'loop');
    const itemDataField = loop?.fields?.find((f) => f.key === 'itemData');
    expect(itemDataField?.lazyEval).toBe(true);
    expect(itemDataField?.params).toEqual(['item', 'index', 'key']);
  });

  it('page renderer has injectedLocals for $page', () => {
    const page = basicRendererDefinitions.find((d) => d.type === 'page');
    expect(page?.injectedLocals?.$page).toEqual({ kind: 'injected-local' });
  });
});
