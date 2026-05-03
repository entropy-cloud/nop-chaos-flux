import { describe, expect, it } from 'vitest';
import * as fluxReact from '../index';
import * as fluxReactUnstable from '../unstable';

describe('flux-react public surface', () => {
  it('keeps internal orchestration exports off the root entry', () => {
    expect('RenderNodes' in fluxReact).toBe(false);
    expect('createHelpers' in fluxReact).toBe(false);
    expect('mergeActionContext' in fluxReact).toBe(false);
    expect('rendererHooks' in fluxReact).toBe(false);
    expect('FormContext' in fluxReact).toBe(false);
    expect('publishOwnerStatus' in fluxReact).toBe(false);
  });

  it('exposes internal orchestration exports through the unstable entry', () => {
    expect(typeof fluxReactUnstable.RenderNodes).toBe('function');
    expect(typeof fluxReactUnstable.createHelpers).toBe('function');
    expect(typeof fluxReactUnstable.mergeActionContext).toBe('function');
    expect(typeof fluxReactUnstable.rendererHooks).toBe('object');
    expect(fluxReactUnstable.FormContext).toBeTruthy();
    expect(typeof fluxReactUnstable.publishOwnerStatus).toBe('function');
  });
});
