import { Outlet } from 'react-router';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  isMobile: boolean;
}
export default function ChatLayout({ isMobile }: ChatLayoutProps) {
  return (
    <div className={cn('w-full h-full', isMobile && 'overflow-hidden')}>
      <Outlet />
    </div>
  );
}
