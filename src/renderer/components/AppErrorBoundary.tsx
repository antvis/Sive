import { captureException } from '@sentry/electron/renderer';
import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    captureException(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-page px-6">
          <div className="max-w-md rounded-xl border bg-surface p-8 text-center">
            <h1 className="mt-0 mb-2 text-xl font-semibold">页面遇到问题</h1>
            <p className="mt-0 mb-6 text-sm leading-6 text-muted-foreground">
              请重新加载工作台。如果问题持续出现，可以到开源项目提交反馈。
            </p>
            <Button variant="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
