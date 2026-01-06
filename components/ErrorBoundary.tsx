import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error using logger (will be sent to monitoring service in production)
    logger.error('Uncaught error in ErrorBoundary', error, 'ErrorBoundary');
    logger.error('Error Info', errorInfo, 'ErrorBoundary');
    
    // Store error info for display
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-bold mb-4 text-red-500">حدث خطأ</h1>
            <p className="text-muted-foreground mb-4">
              عذراً، حدث خطأ غير متوقع. يرجى تحديث الصفحة.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              تحديث الصفحة
            </button>
            {(this.state.error || this.state.errorInfo) && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">تفاصيل الخطأ (للمطورين)</summary>
                <pre className="mt-2 text-xs bg-secondary p-2 rounded overflow-auto max-h-40">
                  {this.state.error?.toString()}
                  {this.state.errorInfo && (
                    <div className="mt-2 text-muted-foreground">
                      Component Stack: {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

