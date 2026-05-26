import { describe, expect, it } from 'vitest';
import * as fluxReact from '../index.js';
import * as fluxReactUnstable from '../unstable.js';

describe('flux-react public surface', () => {
  it('keeps internal-only orchestration exports off the root entry', () => {
    expect('createHelpers' in fluxReact).toBe(false);
    expect('mergeActionContext' in fluxReact).toBe(false);
    expect('rendererHooks' in fluxReact).toBe(false);
    expect('publishOwnerStatus' in fluxReact).toBe(false);
  });

  it('exposes stable renderer-facing helpers on the root entry', () => {
    expect(typeof fluxReact.RenderNodes).toBe('function');
    expect(fluxReact.FormContext).toBeTruthy();
    expect(fluxReact.ScopeContext).toBeTruthy();
    expect(fluxReact.ValidationContext).toBeTruthy();
    expect(fluxReact.FormLayoutContext).toBeTruthy();
    expect(typeof fluxReact.StructuralLoopProvider).toBe('function');
    expect(typeof fluxReact.useCurrentImportFrame).toBe('function');
    expect(typeof fluxReact.usePublishedFormStatus).toBe('function');
    expect(typeof fluxReact.usePublishedFormValues).toBe('function');
    expect(typeof fluxReact.createFormComponentHandle).toBe('function');
    expect(typeof fluxReact.createReadonlyScopeBinding).toBe('function');
  });

  it('exposes internal orchestration exports through the unstable entry', () => {
    expect(typeof fluxReactUnstable.RenderNodes).toBe('function');
    expect(typeof fluxReactUnstable.createHelpers).toBe('function');
    expect(typeof fluxReactUnstable.mergeActionContext).toBe('function');
    expect(typeof fluxReactUnstable.rendererHooks).toBe('object');
    expect(typeof fluxReactUnstable.rendererHooks.useCurrentImportFrame).toBe('function');
    expect(fluxReactUnstable.FormContext).toBeTruthy();
    expect(typeof fluxReactUnstable.publishOwnerStatus).toBe('function');
  });
});
