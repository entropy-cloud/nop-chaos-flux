export interface ExpressionErrorMonitorPayload {
  phase: 'expression';
  error: unknown;
  details?: Record<string, unknown>;
}

export interface ExpressionExecutionEnv {
  monitor?: {
    onError?(payload: ExpressionErrorMonitorPayload): void;
  };
}
