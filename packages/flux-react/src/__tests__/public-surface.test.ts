import { describe, expect, it } from 'vitest';
import * as fluxReact from '../index.js';
import * as fluxReactUnstable from '../unstable.js';

describe('flux-react public surface', () => {
  it('keeps internal orchestration exports off the root entry', () => {
    expect('RenderNodes' in fluxReact).toBe(false);
    expect('createHelpers' in fluxReact).toBe(false);
    expect('mergeActionContext' in fluxReact).toBe(false);
    expect('rendererHooks' in fluxReact).toBe(false);
    expect('FormContext' in fluxReact).toBe(false);
    expect('publishOwnerStatus' in fluxReact).toBe(false);
  });

  it('exposes stable publication helpers on the root entry', () => {
    expect(typeof fluxReact.StructuralLoopProvider).toBe('function');
    expect(typeof fluxReact.usePublishedFormStatus).toBe('function');
    expect(typeof fluxReact.usePublishedFormValues).toBe('function');
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
