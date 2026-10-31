/**
 * Catches a render failure, reports it once with a correlation id the person can quote, and offers a reload — the app never
 * shows a blank page. The reference is the telemetry event id, so support can find the report if a tracker is configured.
 */
import { Component, type ReactNode } from 'react';
import { Button, Notice } from '@empathia/ui';
import { telemetry, routeOf } from '../telemetry.js';

interface State { failed: boolean; reference: string }
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false, reference: '' };
  static getDerivedStateFromError(): Partial<State> { return { failed: true }; }
  override componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const reference = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    this.setState({ reference });
    void telemetry.captureException(error, { correlationId: reference, route: routeOf(), tags: { kind: 'render' }, extra: { componentStack: (info.componentStack || '').split('\n').slice(0, 8).join('\n') } });
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app__crash" data-testid="crash">
        <Notice tone="bad">
          <p><b>This page stopped working.</b> Nothing you entered was sent anywhere by this failure, and your session is still valid.</p>
          <p className="ui-meta">Reference for support: <code data-testid="crash-reference">{this.state.reference}</code> · telemetry: {telemetry.transport.kind === 'none' ? 'not configured (the report stayed in this browser)' : 'reported'}</p>
          <Button kind="primary" onClick={() => location.reload()}>Reload the page</Button>
        </Notice>
      </main>
    );
  }
}
