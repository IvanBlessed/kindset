import { App } from '@/components/App.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.tsx';

function ErrorBoundaryError({ error }: { error: unknown }) {
  return (
    <div className="ks-pad">
      <p>Something went wrong. Close and reopen the app.</p>
      <code className="ks-small">{error instanceof Error ? error.message : String(error)}</code>
    </div>
  );
}

export function Root() {
  return (
    <ErrorBoundary fallback={ErrorBoundaryError}>
      <App />
    </ErrorBoundary>
  );
}
