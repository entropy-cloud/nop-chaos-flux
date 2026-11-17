import { describe, expect, it } from 'vitest';
import fixtures from '../../protocol/fixtures.json';
import {
  ProtocolError,
  decodeMessage,
  detectEnvelopeKind,
  encodeEvent,
  encodeRequest,
  encodeResponse,
  isProtocolError,
  validateAgainst,
} from './codec';
import { PROTOCOL_METHODS } from './methods';

const BASE = 'https://nop-chaos.dev/schemas/devtools/';

interface FixtureSample {
  name: string;
  schema: string;
  valid: Array<Record<string, unknown>>;
  invalid: Array<{ sample: Record<string, unknown>; reason: string }>;
}

const samples = fixtures.samples as unknown as FixtureSample[];

describe('protocol conformance (frozen v1)', () => {
  it('covers every sample fixture declared in fixtures.json', () => {
    expect(samples.length).toBeGreaterThanOrEqual(10);
    expect(samples.every((s) => s.valid.length > 0 && s.invalid.length > 0)).toBe(true);
  });

  for (const sample of samples) {
    describe(sample.name, () => {
      const pointer = sample.schema.includes('#') ? `#${sample.schema.split('#')[1]}` : undefined;
      const schemaId = sample.schema.replace(BASE, '').split('#')[0];

      it('accepts all valid samples', () => {
        for (const valid of sample.valid) {
          expect(() => validateAgainst(schemaId, valid, pointer)).not.toThrow();
        }
      });

      it('rejects all invalid samples with ProtocolError', () => {
        for (const { sample: bad, reason } of sample.invalid) {
          try {
            validateAgainst(schemaId, bad, pointer);
            throw new Error(`expected rejection (${reason}) for ${JSON.stringify(bad)}`);
          } catch (e) {
            expect(isProtocolError(e), `expected ProtocolError for ${reason}`).toBe(true);
          }
        }
      });
    });
  }
});

describe('codec', () => {
  it('encodes requests only for registered methods', () => {
    expect(() => encodeRequest('session.attach', { sessionId: 's-1' }, 'req-1')).not.toThrow();
    expect(() => encodeRequest('definitely.not.a.method' as never)).toThrow(ProtocolError);
  });

  it('round-trips encode -> decode for all three envelopes', () => {
    const request = encodeRequest('log.emit', { log: { id: 'l1', kind: 'action', label: 'click', status: 'pending', startedAt: 1 } }, 'req-10');
    expect(decodeMessage(JSON.parse(JSON.stringify(request)))).toEqual(request);

    const response = encodeResponse('req-10', { result: { ok: true } });
    expect(decodeMessage(JSON.parse(JSON.stringify(response)))).toEqual(response);

    const event = encodeEvent('intercept.frame', {
      eventId: 'e-1',
      phase: 'before:handler',
      service: 'user/query',
      requestId: 'r-1',
      timeoutMs: 3000,
      args: { id: 1 },
    });
    expect(decodeMessage(JSON.parse(JSON.stringify(event)))).toEqual(event);
  });

  it('rejects responses carrying both result and error (mutual exclusion)', () => {
    const bad = { id: 'req-x', result: { ok: true }, error: { code: 'c', message: 'm' } };
    try {
      validateAgainst('rpc-envelope.schema.json', bad, '#/definitions/rpcResponse');
      throw new Error('expected rejection');
    } catch (e) {
      expect(isProtocolError(e)).toBe(true);
    }
  });

  it('detects envelope kinds', () => {
    expect(detectEnvelopeKind({ id: 'a', method: 'log.emit' })).toBe('rpcRequest');
    expect(detectEnvelopeKind({ id: 'a', result: {} })).toBe('rpcResponse');
    expect(detectEnvelopeKind({ event: 'x', payload: {} })).toBe('rpcEvent');
    expect(() => detectEnvelopeKind('nope')).toThrow(ProtocolError);
    expect(() => detectEnvelopeKind({ id: 42, method: 'x' })).toThrow(ProtocolError);
  });

  it('declares the frozen v1 method registry', () => {
    expect(PROTOCOL_METHODS).toEqual([
      'session.attach',
      'session.detach',
      'session.heartbeat',
      'log.emit',
      'intercept.register',
      'intercept.resolve',
      'capture.upload',
      'baseline.get',
      'baseline.put',
    ]);
  });
});

describe('mock gateway round-trip', () => {
  class MockGateway {
    readonly received: unknown[] = [];

    send(message: unknown): unknown {
      const decoded = decodeMessage(JSON.parse(JSON.stringify(message)));
      this.received.push(decoded);
      if ('method' in decoded) {
        if (decoded.method === 'session.attach') {
          return encodeResponse(decoded.id, { result: { sessionId: 'gw-session-1', heartbeatIntervalMs: 5000 } });
        }
        if (decoded.method === 'baseline.get') {
          return encodeResponse(decoded.id, {
            result: {
              baseline: {
                key: 'fp-1:1280x800:step-1',
                imageRef: 'oss://bucket/b.webp',
                createdAt: 1,
                ignoreRegions: [{ cid: 'c-1', reason: 'timestamp' }],
              },
            },
          });
        }
        return encodeResponse(decoded.id, { result: { ok: true } });
      }
      if ('event' in decoded && decoded.event === 'intercept.resolve') {
        return encodeResponse((decoded as { id?: string }).id ?? 'unknown', { result: { ok: true } });
      }
      return null;
    }
  }

  function connectFrontend(gateway: MockGateway): (message: unknown) => unknown {
    return (message) => gateway.send(message);
  }

  it('walks the full v1 lifecycle: attach -> heartbeat -> log.emit -> intercept.frame/resolve -> capture.upload -> baseline.get/put -> detach', () => {
    const gateway = new MockGateway();
    const rpc = connectFrontend(gateway);

    const attach = rpc(encodeRequest('session.attach', { appVersion: '1.0.0', schemaFingerprint: 'fp-1', capabilities: ['capture'] }, 'r1'));
    expect(decodeMessage(attach)).toMatchObject({ id: 'r1', result: { sessionId: 'gw-session-1' } });

    const heartbeat = rpc(encodeRequest('session.heartbeat', { sessionId: 'gw-session-1', ts: 1 }, 'r2'));
    expect(decodeMessage(heartbeat)).toMatchObject({ id: 'r2', result: { ok: true } });

    const logEmit = rpc(
      encodeRequest(
        'log.emit',
        { log: { id: 'log-1', parentId: undefined as unknown as string, kind: 'action', label: 'click', status: 'passed', startedAt: 1 } },
        'r3',
      ),
    );
    expect(decodeMessage(logEmit)).toMatchObject({ id: 'r3', result: { ok: true } });

    const frame = encodeEvent('intercept.frame', {
      eventId: 'e-1',
      phase: 'before:handler',
      service: 'user/query',
      requestId: 'r-9',
      timeoutMs: 3000,
      args: { id: 7 },
    });
    expect(decodeMessage(JSON.parse(JSON.stringify(frame)))).toEqual(frame);
    const resolve = rpc(
      encodeRequest('intercept.resolve', { eventId: 'e-1', action: 'modify', patch: [{ op: 'replace', path: '/id', value: 8 }] }, 'r4'),
    );
    expect(decodeMessage(resolve)).toMatchObject({ id: 'r4', result: { ok: true } });

    const upload = rpc(
      encodeRequest(
        'capture.upload',
        { id: 'shot-1', kind: 'screenshot', encoding: 'base64', bytes: 'AAAA', mime: 'image/webp', refs: { cid: 'c-1', tag: 'on-step' } },
        'r5',
      ),
    );
    expect(decodeMessage(upload)).toMatchObject({ id: 'r5', result: { ok: true } });

    const baselineGet = rpc(encodeRequest('baseline.get', { key: 'fp-1:1280x800:step-1' }, 'r6'));
    expect(decodeMessage(baselineGet)).toMatchObject({ id: 'r6', result: { baseline: { key: 'fp-1:1280x800:step-1' } } });

    const baselinePut = rpc(
      encodeRequest(
        'baseline.put',
        { baseline: { key: 'fp-1:1280x800:step-1', imageRef: 'oss://bucket/b.webp', createdAt: 1 } },
        'r7',
      ),
    );
    expect(decodeMessage(baselinePut)).toMatchObject({ id: 'r7', result: { ok: true } });

    const detach = rpc(encodeRequest('session.detach', { sessionId: 'gw-session-1', reason: 'done' }, 'r8'));
    expect(decodeMessage(detach)).toMatchObject({ id: 'r8', result: { ok: true } });

    expect(gateway.received.length).toBe(8);
  });

  it('a corrupted message is rejected at the receiving end', () => {
    const gateway = new MockGateway();
    expect(() => gateway.send({ id: 'x', method: 42 })).toThrow(ProtocolError);
    expect(() => gateway.send({ event: 'intercept.frame' })).toThrow(ProtocolError);
  });
});
