import { Outlet } from 'react-router';
import ErrorBoundary from './components/ErrorBoundary';

export default function ChatLayout() {
  return (
    <ErrorBoundary>
      <div className="w-full h-full">
        {/* React Router will render nested routes here */}
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
