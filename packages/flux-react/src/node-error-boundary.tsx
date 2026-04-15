import { Component } from 'react';
import type { ReactNode } from 'react';

interface NodeErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

export class NodeErrorBoundary extends Component<{ children: ReactNode; nodeId?: string }, NodeErrorBoundaryState> {
  constructor(props: { children: ReactNode; nodeId?: string }) {
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

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}
