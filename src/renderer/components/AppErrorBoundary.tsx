import { useI18n } from '../i18n';
import { captureException } from '@sentry/electron/renderer';
import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';

function ErrorFallback() {
  const i18n = useI18n();
  return (
    <main className="grid min-h-screen place-items-center bg-page px-6">
      <div className="max-w-md rounded-xl border bg-surface p-8 text-center">
        <h1 className="mt-0 mb-2 text-xl font-semibold">{i18n('errors.boundary.title')}</h1>
        <p className="mt-0 mb-6 text-sm leading-6 text-muted-foreground">
          {i18n('errors.boundary.description')}
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          {i18n('common.actions.reload')}
        </Button>
      </div>
    </main>
  );
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }

    return this.props.children;
  }
}
