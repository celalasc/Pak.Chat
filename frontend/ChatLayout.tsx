import { Outlet } from 'react-router';
import ErrorBoundary from './components/ErrorBoundary';

export default function ChatLayout() {
  return (
    <ErrorBoundary>
      <div className="w-full h-full">
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
