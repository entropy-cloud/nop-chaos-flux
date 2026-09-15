import { cleanup, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreeCanvasRenderer } from '../three-canvas.js';
import type { RendererComponentProps } from '@nop-chaos/flux-core';
import type { IndustrialTagConfig } from '../../data-source/industrial-adapter.js';
import type { ThreeCanvasSchema } from '../../schemas.js';
import { ThreeTestProviders, createThreeTestEnvironment } from '../../test-support/renderer-test-support.js';
import type { ThreeTestEnvironment } from '../../test-support/renderer-test-support.js';

vi.mock('../../engine/scene-manager.js', () => import('../../test-support/scene-manager-mock.js'));

interface MockSocket {
  url: string;
  sent: string[];
  onopen: ((ev?: unknown) => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
  onclose: ((ev?: unknown) => void) | null;
  onerror: ((ev?: unknown) => void) | null;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeSocketEnv(): { environment: ThreeTestEnvironment; sockets: MockSocket[]; openSocket: ReturnType<typeof vi.fn> } {
  const environment = createThreeTestEnvironment();
  const sockets: MockSocket[] = [];
  const openSocket = vi.fn((url: string) => {
    const socket: MockSocket = {
      url,
      sent: [],
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
      close: vi.fn(),
      send: vi.fn((data: string) => {
        socket.sent.push(data);
      }),
    };
    sockets.push(socket);
    return socket;
  });
  (environment.env as { openSocket?: unknown }).openSocket = openSocket;
  return { environment, sockets, openSocket };
}

function tagConfig(overrides: Partial<IndustrialTagConfig> = {}): IndustrialTagConfig {
  return {
    id: 'plc-1',
    url: 'wss://gateway.example.com/ws',
    tags: [{ name: 'VALVE_001', address: 'VALVE_001.position', type: 'float32' }],
    polling: 1000,
    ...overrides,
  };
}

function buildProps(overrides: Partial<Record<string, unknown>> = {}) {
  const schema = {
    type: 'three-canvas',
    id: 'three-1',
    scene: {
      camera: { position: [0, 0, 5] },
      lights: [{ type: 'ambient', intensity: 0.5 }],
      models: [{ id: 'valve', url: 'valve.glb' }],
    },
    ...overrides,
  } as unknown as ThreeCanvasSchema;
  return {
    id: 'three-1',
    path: 'three-1',
    schema,
    templateNode: {} as never,
    node: {} as never,
    props: {
      scene: schema.scene,
      bindings: overrides.bindings,
      animations: overrides.animations,
      events: overrides.events,
      dataSources: overrides.dataSources,
    },
    meta: { visible: true },
    regions: {},
    events: {},
    reactions: {},
    helpers: {
      dispatch: vi.fn(),
      render: vi.fn(() => null),
    },
  } as unknown as RendererComponentProps<ThreeCanvasSchema> & { helpers: { dispatch: ReturnType<typeof vi.fn> } };
}

function renderThree(
  props: RendererComponentProps<ThreeCanvasSchema>,
  environment: ThreeTestEnvironment,
): RenderResult {
  return render(
    <ThreeTestProviders environment={environment}>
      <ThreeCanvasRenderer {...props} />
    </ThreeTestProviders>,
  );
}

function dispatchedText(props: ReturnType<typeof buildProps>): string {
  return JSON.stringify(props.helpers.dispatch.mock.calls);
}

afterEach(() => {
  cleanup();
});

describe('three-canvas data source wiring (plan 470 Phase 2, I3.2: mock env.openSocket + real IndustrialAdapter)', () => {
  it('connects declared dataSources and sends the subscribe frame on open', () => {
    const { environment, sockets, openSocket } = makeSocketEnv();
    const dataSource = tagConfig({ tags: [
      { name: 'VALVE_001', address: 'VALVE_001.position', type: 'float32' },
      { name: 'RUNNING', address: 'PLC.RUNNING', type: 'bool' },
    ] });
    const props = buildProps({ dataSources: [dataSource] });
    renderThree(props, environment);
    expect(openSocket).toHaveBeenCalledTimes(1);
    expect(openSocket).toHaveBeenCalledWith('wss://gateway.example.com/ws');
    expect(sockets[0]).toBeDefined();
    sockets[0].onopen?.();
    expect(sockets[0].sent).toHaveLength(1);
    const frame = JSON.parse(sockets[0].sent[0]) as { type: string; tags: string[]; polling?: number };
    expect(frame.type).toBe('subscribe');
    expect(frame.tags).toEqual(['VALVE_001.position', 'PLC.RUNNING']);
    expect(frame.polling).toBe(1000);
  });

  it('writes converted data frames into scope dataSources members', () => {
    const { environment, sockets } = makeSocketEnv();
    const dataSource = tagConfig({ tags: [
      { name: 'VALVE_001', address: 'VALVE_001.position', type: 'float32' },
      { name: 'RUNNING', address: 'PLC.RUNNING', type: 'bool' },
    ] });
    const props = buildProps({ dataSources: [dataSource] });
    renderThree(props, environment);
    sockets[0].onmessage?.({
      data: JSON.stringify({ type: 'data', payload: { 'VALVE_001.position': '42.5', 'PLC.RUNNING': 1 } }),
    });
    expect(environment.scope.get('dataSources.VALVE_001')).toBe(42.5);
    expect(environment.scope.get('dataSources.RUNNING')).toBe(true);
  });

  it('closes all connections on unmount (disconnectAll)', () => {
    const { environment, sockets } = makeSocketEnv();
    const props = buildProps({ dataSources: [tagConfig()] });
    const { unmount } = renderThree(props, environment);
    expect(sockets).toHaveLength(1);
    unmount();
    expect(sockets[0].close).toHaveBeenCalledTimes(1);
  });

  it('reports socket-unavailable once via events.onError and keeps the scene state machine intact', () => {
    const environment = createThreeTestEnvironment();
    const props = buildProps({ dataSources: [tagConfig()], events: { onError: {} } });
    const { container } = renderThree(props, environment);
    expect(props.helpers.dispatch).toHaveBeenCalledTimes(1);
    const dispatched = dispatchedText(props);
    expect(dispatched).toContain('datasource:error');
    expect(dispatched).toContain('socket-unavailable');
    expect(container.querySelector('[data-three-scene-state="error"]')).toBeNull();
  });

  it('never touches openSocket when dataSources is not declared', () => {
    const { environment, openSocket } = makeSocketEnv();
    const props = buildProps();
    renderThree(props, environment);
    expect(openSocket).not.toHaveBeenCalled();
  });

  it('disconnects and reconnects when the dataSources array identity changes', () => {
    const { environment, sockets, openSocket } = makeSocketEnv();
    const first = buildProps({ dataSources: [tagConfig()] });
    const result = renderThree(first, environment);
    const firstSocket = sockets[0];
    const second = buildProps({ dataSources: [tagConfig({ id: 'plc-2', url: 'wss://other.example.com/ws' })] });
    result.rerender(
      <ThreeTestProviders environment={environment}>
        <ThreeCanvasRenderer {...second} />
      </ThreeTestProviders>,
    );
    expect(firstSocket.close).toHaveBeenCalledTimes(1);
    expect(openSocket).toHaveBeenCalledTimes(2);
    expect(openSocket).toHaveBeenLastCalledWith('wss://other.example.com/ws');
  });

  it('surfaces connect-failed diagnostics through events.onError', () => {
    const { environment, sockets } = makeSocketEnv();
    const props = buildProps({ dataSources: [tagConfig()], events: { onError: {} } });
    renderThree(props, environment);
    sockets[0].onclose?.();
    const dispatched = dispatchedText(props);
    expect(dispatched).toContain('datasource:error');
    expect(dispatched).toContain('socket-connect-failed');
  });

  it('ignores non-array dataSources defensively (no connections, no crash)', () => {
    const { environment, openSocket } = makeSocketEnv();
    const props = buildProps({ dataSources: 'not-an-array' });
    expect(() => renderThree(props, environment)).not.toThrow();
    expect(openSocket).not.toHaveBeenCalled();
  });
});
