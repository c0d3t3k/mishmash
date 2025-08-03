import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Routes } from '@/routes.gen'

const container = document.getElementById('app')!

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // You could also report this to an error service
});

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  // Filter out benign ResizeObserver loop errors
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('ResizeObserver loop completed with undelivered notifications')) {
    // This is a benign warning that commonly occurs with React Flow's NodeResizer
    // and other libraries that use ResizeObserver. It doesn't affect functionality.
    return;
  }
  
  console.error('Uncaught error:', event.error || event.message || 'Unknown error');
  // You could also report this to an error service
});

createRoot(container).render(
  <ErrorBoundary 
    level="critical"
    showDetails={true}
    onError={(error, errorInfo) => {
      // Log to console in development
      console.error('Global Error Boundary:', { error, errorInfo });
      
      // In production, you might want to send to an error reporting service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      if (process.env.NODE_ENV === 'production') {
        // reportErrorToService(error, errorInfo);
      }
    }}
  >
    <Routes />
  </ErrorBoundary>
)
