import { beforeEach, describe, expect, it } from 'vitest';
import { createNopDebugger } from './index.js';

describe('controller inspector — basic lookup', () => {
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

  it('inspectByElement climbs to the nearest inspectable owner marker', () => {
    const ctrl = createNopDebugger({ id: 'inspect-closest-owner', enabled: true });
    const owner = document.createElement('div');
    owner.setAttribute('data-cid', '98');
    owner.className = 'owner-node';
    const child = document.createElement('span');
    owner.appendChild(child);
    document.body.appendChild(owner);

    const result = ctrl.inspectByElement(child);

    expect(result).toMatchObject({
      cid: 98,
      mounted: true,
      tagName: 'div',
      className: 'owner-node',
    });
  });

  it('inspectByElement returns undefined for foreign-runtime elements', () => {
    const ctrl = createNopDebugger({ id: 'inspect-foreign-runtime-element', enabled: true });

    const localRoot = document.createElement('div');
    localRoot.setAttribute('data-runtime-id', 'runtime-local');
    const localOwner = document.createElement('div');
    localOwner.setAttribute('data-cid', '98');
    localOwner.className = 'local-owner';
    localRoot.appendChild(localOwner);

    const foreignRoot = document.createElement('div');
    foreignRoot.setAttribute('data-runtime-id', 'runtime-foreign');
    const foreignOwner = document.createElement('div');
    foreignOwner.setAttribute('data-cid', '98');
    foreignOwner.className = 'foreign-owner';
    foreignRoot.appendChild(foreignOwner);

    document.body.appendChild(localRoot);
    document.body.appendChild(foreignRoot);

    ctrl.setRuntime({ runtimeId: 'runtime-local' } as never);
    ctrl.setComponentRegistry({ id: 'reg-foreign-runtime', getHandleByCid: () => undefined } as never);

    expect(ctrl.inspectByElement(foreignOwner)).toBeUndefined();
    expect(ctrl.inspectByElement(localOwner)).toMatchObject({
      cid: 98,
      mounted: true,
      className: 'local-owner',
    });
  });

  it('inspectByCid requires setComponentRegistry to find elements', () => {
    const ctrl = createNopDebugger({ id: 'inspect-reg-required', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '77');
    document.body.appendChild(div);
    expect(ctrl.inspectByCid(77)).toBeUndefined();

    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(77);
    expect(result).toMatchObject({ cid: 77, mounted: true });
  });

  it('inspectByCid returns undefined when element not found', () => {
    const ctrl = createNopDebugger({ id: 'inspect-missing', enabled: true });
    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
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

    const mockHandle = {
      id: 'handle-1',
      name: 'testForm',
      type: 'form',
      _cid: 100,
      _mounted: true,
    };
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 100 ? mockHandle : undefined),
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(100);
    expect(result).toMatchObject({ cid: 100, mounted: true });
  });

  it('inspectByCid prefers registry inspectCid instancePath data when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-instance-path', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '101');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 101
          ? {
              kind: 'resolved',
              payload: {
                cid: 101,
                instancePath: [],
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(101);
    expect(result).toMatchObject({
      cid: 101,
      mounted: true,
      instancePath: [],
    });
  });

  it('inspectByCid preserves registry scopeChain snapshots when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-registry-scope-chain', enabled: true });
    const div = document.createElement('div');
    div.setAttribute('data-cid', '111');
    document.body.appendChild(div);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 111
          ? {
              kind: 'resolved',
              payload: {
                cid: 111,
                scopeChain: [
                  {
                    id: 'form-1',
                    path: '$form',
                    label: '$form',
                    data: { departmentId: 'runtime' },
                  },
                ],
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(111)).toMatchObject({
      cid: 111,
      mounted: true,
      scopeChain: [
        { id: 'form-1', path: '$form', label: '$form', data: { departmentId: 'runtime' } },
      ],
    });
  });

  it('inspectByCid resolves mounted handles by cid', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-by-cid', enabled: true });
    const mockHandle = {
      id: 'handle-106',
      name: 'locatorForm',
      type: 'form',
      _cid: 106,
      _mounted: true,
    };
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: (cid: number) => (cid === 106 ? mockHandle : undefined),
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(106)).toMatchObject({
      cid: 106,
      mounted: true,
      handleId: 'handle-106',
    });
  });

  it('inspectByCid returns undefined when cid is not found', () => {
    const ctrl = createNopDebugger({ id: 'inspect-node-not-found', enabled: true });
    const mockRegistry = {
      id: 'reg-1',
      getHandleByCid: () => undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByCid(107)).toBeUndefined();
  });

  it('inspectByElement uses registry inspect payload for instancePath and scopeChain when available', () => {
    const ctrl = createNopDebugger({ id: 'inspect-element-rich-payload', enabled: true });
    const owner = document.createElement('div');
    owner.setAttribute('data-cid', '210');
    const child = document.createElement('span');
    owner.appendChild(child);
    document.body.appendChild(owner);

    const mockRegistry = {
      id: 'reg-1',
      inspectCid: (cid: number) =>
        cid === 210
          ? {
              kind: 'resolved',
              payload: {
                cid: 210,
                instancePath: [{ repeatedTemplateId: 'rows', instanceKey: '1' }],
                scopeChain: [{ id: 'row-1', path: '$rows.1', label: '$rows.1', data: { id: 1 } }],
                state: { mounted: true, metaState: {} },
              },
            }
          : { kind: 'notFound' },
      getHandleByCid: () => undefined,
    };

    ctrl.setComponentRegistry(mockRegistry as never);

    expect(ctrl.inspectByElement(child)).toMatchObject({
      cid: 210,
      mounted: true,
      instancePath: [{ repeatedTemplateId: 'rows', instanceKey: '1' }],
      scopeChain: [{ id: 'row-1', path: '$rows.1', label: '$rows.1', data: { id: 1 } }],
    });
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
      className: 'my-component active',
    });
  });

  it('inspectByCid passes element to buildInspectResult for tagName', () => {
    const ctrl = createNopDebugger({ id: 'inspect-cid-element', enabled: true });
    const span = document.createElement('span');
    span.setAttribute('data-cid', '400');
    span.className = 'test-span';
    document.body.appendChild(span);

    const mockRegistry = { id: 'reg-1', getHandleByCid: () => undefined };
    ctrl.setComponentRegistry(mockRegistry as never);
    const result = ctrl.inspectByCid(400);
    expect(result).toMatchObject({
      cid: 400,
      mounted: true,
      tagName: 'span',
      className: 'test-span',
    });
  });
});
