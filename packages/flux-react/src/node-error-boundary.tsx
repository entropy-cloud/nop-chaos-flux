import { Component, Fragment } from 'react';
import type { ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, Button, cn } from '@nop-chaos/ui';

interface NodeErrorBoundaryProps {
  children: ReactNode;
  nodeId?: string;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

interface SchemaRootBoundaryProps {
  children: ReactNode;
}

interface SchemaRootBoundaryState {
  hasError: boolean;
  error: unknown;
  attemptKey: number;
}

function renderErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  const message = String(error ?? '');
  return message || fallback;
}

function SchemaRootFallback(props: {
  message: string;
  mode: 'loading' | 'error';
  onRetry?: () => void;
}) {
  const destructive = props.mode === 'error';

  return (
    <Alert
      data-slot={props.mode === 'loading' ? 'schema-root-status' : 'schema-root-error'}
      role={props.mode === 'loading' ? 'status' : 'alert'}
      variant={destructive ? 'destructive' : 'default'}
      data-mode={props.mode}
      className={cn('nop-schema-root-fallback')}
    >
      {destructive ? <AlertCircleIcon className="size-4 shrink-0" /> : null}
      <AlertDescription data-slot="schema-root-fallback-message">
        {props.message}
      </AlertDescription>
      {props.onRetry ? (
        <AlertAction>
          <Button type="button" variant="ghost" size="sm" onClick={props.onRetry}>
            retry
          </Button>
        </AlertAction>
      ) : null}
    </Alert>
  );
}

export function SchemaRootStatus(props: { message: string }) {
  return <SchemaRootFallback mode="loading" message={props.message} />;
}

export function SchemaRootError(props: { error: unknown }) {
  return (
    <SchemaRootFallback
      mode="error"
      message={`Schema render failed: ${renderErrorMessage(props.error, 'Unknown error')}`}
    />
  );
}

export class SchemaRootErrorBoundary extends Component<
  SchemaRootBoundaryProps,
  SchemaRootBoundaryState
> {
  constructor(props: SchemaRootBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined, attemptKey: 0 };
  }

  static getDerivedStateFromError(error: unknown): Partial<SchemaRootBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: import('react').ErrorInfo) {
    console.error('[SchemaRenderer] Root render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: undefined,
      attemptKey: prev.attemptKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <SchemaRootFallback
          mode="error"
          message={`Schema render failed: ${renderErrorMessage(this.state.error, 'Unknown error')}`}
          onRetry={this.handleRetry}
        />
      );
    }

    return <Fragment key={this.state.attemptKey}>{this.props.children}</Fragment>;
  }
}

export class NodeErrorBoundary extends Component<NodeErrorBoundaryProps, NodeErrorBoundaryState> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: unknown): NodeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: import('react').ErrorInfo) {
    const nodeId = this.props.nodeId ?? 'unknown';
    console.error(`[NodeRenderer] Render error in node "${nodeId}":`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const nodeId = this.props.nodeId ?? 'unknown';
      const message =
         renderErrorMessage(this.state.error, 'Render error');

      return (
        <Alert
          data-slot="node-error"
          role="alert"
          variant="destructive"
          className="nop-node-error"
        >
          <AlertCircleIcon className="size-3.5 shrink-0" />
          <AlertDescription data-slot="node-error-message">
            {nodeId}: {message || 'Render error'}
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={this.handleRetry}
              data-slot="node-error-retry"
            >
              retry
            </Button>
          </AlertAction>
        </Alert>
      );
    }
    return this.props.children;
  }
}
