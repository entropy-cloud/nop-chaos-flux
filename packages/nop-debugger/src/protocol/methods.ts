import type {
  BaselineGetParams,
  BaselineGetResult,
  BaselinePutParams,
  CaptureUploadParams,
  CaptureUploadResult,
  InterceptRegisterParams,
  InterceptResolveParams,
  LogEmitParams,
  OkResult,
  SessionAttachParams,
  SessionAttachResult,
  SessionDetachParams,
  SessionHeartbeatParams,
  SessionHeartbeatResult,
} from './types';

export const PROTOCOL_METHODS = [
  'session.attach',
  'session.detach',
  'session.heartbeat',
  'log.emit',
  'intercept.register',
  'intercept.resolve',
  'capture.upload',
  'baseline.get',
  'baseline.put',
] as const;

export type ProtocolMethod = (typeof PROTOCOL_METHODS)[number];

export interface ProtocolMethodMap {
  'session.attach': { params: SessionAttachParams; result: SessionAttachResult };
  'session.detach': { params: SessionDetachParams; result: OkResult };
  'session.heartbeat': { params: SessionHeartbeatParams; result: SessionHeartbeatResult };
  'log.emit': { params: LogEmitParams; result: OkResult };
  'intercept.register': { params: InterceptRegisterParams; result: OkResult };
  'intercept.resolve': { params: InterceptResolveParams; result: OkResult };
  'capture.upload': { params: CaptureUploadParams; result: CaptureUploadResult };
  'baseline.get': { params: BaselineGetParams; result: BaselineGetResult };
  'baseline.put': { params: BaselinePutParams; result: OkResult };
}
