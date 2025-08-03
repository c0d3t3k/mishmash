import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    // Example: Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // reportErrorToService(error, errorInfo, this.state.errorId);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  getErrorLevel() {
    const { level = 'component' } = this.props;
    return level;
  }

  getErrorSeverity() {
    const { error } = this.state;
    if (!error) return 'low';

    // Categorize error severity based on error type/message
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'low'; // Likely a network/loading issue
    }
    
    if (errorMessage.includes('zustand') || errorMessage.includes('provider')) {
      return 'medium'; // Context/state management issue
    }
    
    if (errorMessage.includes('cannot read') || errorMessage.includes('undefined')) {
      return 'high'; // Likely a critical runtime error
    }
    
    return 'medium';
  }

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const level = this.getErrorLevel();
      const severity = this.getErrorSeverity();
      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl mx-auto shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {level === 'critical' ? 'Critical Error' : 'Something went wrong'}
              </CardTitle>
              
              <CardDescription className="text-lg mt-2">
                {level === 'critical' 
                  ? 'A critical error has occurred that requires immediate attention.'
                  : level === 'page'
                  ? 'This page encountered an error and cannot be displayed.'
                  : 'A component on this page has encountered an error.'
                }
              </CardDescription>

              <div className="flex justify-center gap-2 mt-4">
                <Badge variant={severity === 'high' ? 'destructive' : severity === 'medium' ? 'default' : 'secondary'}>
                  {severity === 'high' ? 'High Priority' : severity === 'medium' ? 'Medium Priority' : 'Low Priority'}
                </Badge>
                <Badge variant="outline">
                  Error ID: {errorId}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {isDev && error && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Development Details
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Error Message:</p>
                      <code className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-2 rounded block mt-1 font-mono">
                        {error.message}
                      </code>
                    </div>
                    
                    {error.stack && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Stack Trace:</p>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded mt-1 overflow-auto max-h-32 font-mono">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {this.props.showDetails && errorInfo?.componentStack && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Component Stack:</p>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded mt-1 overflow-auto max-h-32 font-mono">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isDev && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    We've been notified of this error and are working to fix it. 
                    If the problem persists, please contact support with error ID: <strong>{errorId}</strong>
                  </p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-200 mb-2">
                  Suggested Actions:
                </h4>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Try refreshing the page</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Check your internet connection</li>
                  {level !== 'critical' && <li>• Try navigating to a different page</li>}
                </ul>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              {level !== 'critical' && (
                <Button 
                  onClick={this.handleRetry}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              )}
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </Button>

              {level === 'page' || level === 'critical' ? (
                <Button 
                  onClick={this.handleGoHome}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              ) : null}
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for error reporting from functional components
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: any) => {
    // This will trigger the nearest error boundary
    throw error;
  }, []);
}

// Simple error boundary for specific use cases
export function SimpleErrorBoundary({ 
  children, 
  message = "Something went wrong" 
}: { 
  children: ReactNode; 
  message?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary; 