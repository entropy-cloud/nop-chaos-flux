import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Button } from '@nop-chaos/ui';

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
  return (
    <div
      data-slot={props.mode === 'loading' ? 'schema-root-status' : 'schema-root-error'}
      role={props.mode === 'loading' ? 'status' : 'alert'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem',
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
        borderRadius: '0.375rem',
        border:
          props.mode === 'loading'
            ? '1px solid var(--border, #d4d4d8)'
            : '1px solid var(--destructive, #b53b2c)',
        color:
          props.mode === 'loading'
            ? 'var(--foreground, inherit)'
            : 'var(--destructive, #b53b2c)',
        backgroundColor: 'var(--background, transparent)',
      }}
    >
      {props.mode === 'error' ? (
        <AlertCircleIcon style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>{props.message}</span>
      {props.onRetry ? (
        <Button type="button" variant="ghost" size="sm" onClick={props.onRetry}>
          retry
        </Button>
      ) : null}
    </div>
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
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: unknown): SchemaRootBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: import('react').ErrorInfo) {
    console.error('[SchemaRenderer] Root render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
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

    return this.props.children;
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
        <div
          data-slot="node-error"
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            lineHeight: '1rem',
            color: 'var(--destructive, #b53b2c)',
            border: '1px dashed var(--destructive, #b53b2c)',
            borderRadius: '0.25rem',
            backgroundColor: 'var(--nop-surface, transparent)',
          }}
        >
          <AlertCircleIcon style={{ width: '0.875rem', height: '0.875rem', flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nodeId}: {message || 'Render error'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={this.handleRetry}
            style={{
              padding: '0 0.25rem',
              fontSize: '0.6875rem',
              lineHeight: '1rem',
              color: 'inherit',
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
