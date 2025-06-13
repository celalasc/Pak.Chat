import { Outlet } from 'react-router';

export default function ChatLayout() {
  return (
    <div className="w-full h-full">
      <Outlet />
    </div>
  );
}
