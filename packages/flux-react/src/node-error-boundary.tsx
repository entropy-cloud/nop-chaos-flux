import { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';

interface NodeErrorBoundaryProps {
  children: ReactNode;
  nodeId?: string;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: unknown;
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
        this.state.error instanceof Error ? this.state.error.message : String(this.state.error ?? '');

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
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nodeId}: {message || 'Render error'}
          </span>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              background: 'none',
              border: 'none',
              padding: '0 0.25rem',
              cursor: 'pointer',
              fontSize: '0.6875rem',
              lineHeight: '1rem',
              color: 'inherit',
              opacity: 0.7,
              flexShrink: 0,
            }}
          >
            retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
