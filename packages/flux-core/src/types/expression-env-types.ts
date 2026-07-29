export interface ExpressionErrorMonitorPayload {
  phase: 'expression';
  error: unknown;
  details?: Record<string, unknown>;
}

export interface UndefinedVariableInfo {
  variableName: string;
  expression?: string;
  scopeSnapshot?: Record<string, unknown>;
}

export interface ExpressionExecutionEnv {
  monitor?: {
    onError?(payload: ExpressionErrorMonitorPayload): void;
  };
  onUndefinedVariable?: (info: UndefinedVariableInfo) => void;
}
