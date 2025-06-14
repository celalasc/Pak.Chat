import Error from './Error';

export function ErrorBoundary({ error }: { error: Error }) {
  return <Error message={error.message} />;
}
