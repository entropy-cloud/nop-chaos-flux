import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import rpcEnvelopeSchema from '../../protocol/rpc-envelope.schema.json';
import methodsSchema from '../../protocol/methods.schema.json';
import interceptFrameSchema from '../../protocol/intercept-frame.schema.json';
import screenshotResultSchema from '../../protocol/screenshot-result.schema.json';
import devSessionSchema from '../../protocol/dev-session.schema.json';
import visualBaselineSchema from '../../protocol/visual-baseline.schema.json';
import { PROTOCOL_METHODS, type ProtocolMethod } from './methods';
import type { RpcEvent, RpcMessage, RpcRequest, RpcResponse } from './types';

export class ProtocolError extends Error {
  code: string;
  details?: string;

  constructor(code: string, message: string, details?: string) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.details = details;
  }
}

const BASE_URI = 'https://nop-chaos.dev/schemas/devtools/';

type EnvelopeKind = 'rpcRequest' | 'rpcResponse' | 'rpcEvent';

let ajvInstance: Ajv | null = null;

function getAjv(): Ajv {
  if (ajvInstance) return ajvInstance;
  const ajv = new Ajv({ strict: false, allErrors: true });
  ajv.addSchema([rpcEnvelopeSchema, methodsSchema, interceptFrameSchema, screenshotResultSchema, devSessionSchema, visualBaselineSchema]);
  ajvInstance = ajv;
  return ajv;
}

const validatorCache = new Map<string, ValidateFunction>();

function getValidator(schemaId: string, schemaPointer?: string): ValidateFunction {
  const key = schemaPointer ? `${schemaId}${schemaPointer}` : schemaId;
  const cached = validatorCache.get(key);
  if (cached) return cached;
  const ajv = getAjv();
  const $ref = schemaPointer ? `${BASE_URI}${schemaId}${schemaPointer}` : `${BASE_URI}${schemaId}`;
  const validate = ajv.compile({ $ref });
  validatorCache.set(key, validate);
  return validate;
}

function formatErrors(validate: ValidateFunction): string {
  return (validate.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`).join('; ');
}

export function validateAgainst(schemaId: string, value: unknown, schemaPointer?: string): void {
  const validate = getValidator(schemaId, schemaPointer);
  if (!validate(value)) {
    throw new ProtocolError('schema-violation', `value does not conform to ${schemaId}${schemaPointer ?? ''}`, formatErrors(validate));
  }
}

export function encodeRequest(method: ProtocolMethod, params?: unknown, id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`): RpcRequest {
  const request: RpcRequest = { id, method, ...(params !== undefined ? { params } : {}) };
  validateEnvelope('rpcRequest', request);
  if (!PROTOCOL_METHODS.includes(method as ProtocolMethod)) {
    throw new ProtocolError('unknown-method', `method ${method} is not in the frozen v1 method registry`);
  }
  return request;
}

export function encodeResponse(id: string, resultOrError: { result?: unknown } | { error: { code: string; message: string } }): RpcResponse {
  const response: RpcResponse = { id, ...resultOrError };
  validateEnvelope('rpcResponse', response);
  return response;
}

export function encodeEvent(event: string, payload: unknown): RpcEvent {
  const message: RpcEvent = { event, payload };
  validateEnvelope('rpcEvent', message);
  return message;
}

function validateEnvelope(kind: EnvelopeKind, message: unknown): void {
  validateAgainst('rpc-envelope.schema.json', message, `#/definitions/${kind}`);
}

export function detectEnvelopeKind(raw: unknown): EnvelopeKind {
  if (typeof raw !== 'object' || raw === null) {
    throw new ProtocolError('invalid-envelope', 'message must be a JSON object');
  }
  const record = raw as Record<string, unknown>;
  if (typeof record.event === 'string' && 'payload' in record) return 'rpcEvent';
  if (typeof record.id === 'string' && typeof record.method === 'string') return 'rpcRequest';
  if (typeof record.id === 'string') return 'rpcResponse';
  throw new ProtocolError('invalid-envelope', 'message matches no RPC envelope shape');
}

export function decodeMessage(raw: unknown): RpcMessage {
  const kind = detectEnvelopeKind(raw);
  validateEnvelope(kind, raw);
  return raw as RpcMessage;
}

export function isProtocolError(value: unknown): value is ProtocolError {
  return value instanceof ProtocolError;
}
