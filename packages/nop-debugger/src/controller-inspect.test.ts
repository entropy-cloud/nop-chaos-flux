// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { createNopDebugger } from './index';

describe('controller inspector methods', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined when no component registry is set', () => {
    const ctrl = createNopDebugger({ id: 'inspect-no-reg', enabled: true });
    const result = ctrl.inspectByCid(42);
    expect(result).toBeUndefined();
  });

  it('returns undefined when element has no data-cid attribute', () => {
    const ctrl = createNopDebugger({ id: 'inspect-nocid', enabled: true });
    const div = document.createElement('div');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toBeUndefined();
  });

  it('returns mounted result for element with data-cid when no registry', () => {
    const ctrl = createNopDebugger({ id: 'inspect-mounted', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '99');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toMatchObject({ cid: 99, mounted: true });
    expect(result?.handleId).toBeUndefined();
  });

  it('inspectByCid requires setComponentRegistry to find elements', () => {
    const ctrl = createNopDebugger({ id: 'inspect-reg-required', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '77');
    document.body.appendChild(div);
    expect(ctrl.inspectByCid(77)).toBeUndefined();

    const mockRegistry = { id: 'reg-1', handles: new Map() };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(77);
    expect(result).toMatchObject({ cid: 77, mounted: true });
  });

  it('inspectByCid returns undefined when element not found', () => {
    const ctrl = createNopDebugger({ id: 'inspect-missing', enabled: true });
    const mockRegistry = { id: 'reg-1', handles: new Map() };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(999);
    expect(result).toBeUndefined();
  });

  it('inspectByElement returns undefined for non-numeric data-cid', () => {
    const ctrl = createNopDebugger({ id: 'inspect-nan', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', 'not-a-number');
    document.body.appendChild(div);
    const result = ctrl.inspectByElement(div);
    expect(result).toBeUndefined();
  });

  it('setComponentRegistry stores registry and inspectByCid finds handle', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '100');
    document.body.appendChild(div);

    const mockHandle = { id: 'handle-1', name: 'testForm', type: 'form', _cid: 100, _mounted: true };
    const mockRegistry = {
      id: 'reg-1',
      handles: new Map([[1, mockHandle]])
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(100);
    expect(result).toMatchObject({ cid: 100, mounted: true });
  });

  it('fills formState from handle capabilities.store', () => {
    const ctrl = createNopDebugger({ id: 'inspect-formstate', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '200');
    document.body.appendChild(div);

    const mockStore = {
      getState: () => ({
        values: { username: 'Alice' },
        errors: {},
        touched: { username: true },
        dirty: { username: true },
        visited: {},
        submitting: false
      })
    };

    const mockHandle = {
      id: 'form-1',
      name: 'userForm',
      type: 'form',
      _cid: 200,
      _mounted: true,
      capabilities: { store: mockStore }
    };

    const mockRegistry = {
      id: 'reg-1',
      handles: new Map([[1, mockHandle]])
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(200);
    expect(result).toBeDefined();
    expect(result?.formState).toMatchObject({
      values: { username: 'Alice' },
      errors: {},
      touched: { username: true },
      dirty: { username: true },
      visited: {},
      submitting: false
    });
    expect(result?.scopeData).toMatchObject({ username: 'Alice' });
  });

  it('fills tagName and className from element', () => {
    const ctrl = createNopDebugger({ id: 'inspect-dom', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '300');
    div.className = 'my-component active';
    document.body.appendChild(div);

    const result = ctrl.inspectByElement(div);
    expect(result).toMatchObject({
      cid: 300,
      mounted: true,
      tagName: 'div',
      className: 'my-component active'
    });
  });

  it('inspectByCid passes element to buildInspectResult for tagName', () => {
    const ctrl = createNopDebugger({ id: 'inspect-cid-element', enabled: true });
    const span = document.createElement('span');
    span.setAttribute('data-cid', '400');
    span.className = 'test-span';
    document.body.appendChild(span);

    const mockRegistry = { id: 'reg-1', handles: new Map() };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(400);
    expect(result).toMatchObject({
      cid: 400,
      mounted: true,
      tagName: 'span',
      className: 'test-span'
    });
  });
});
