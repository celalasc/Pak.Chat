import { Link, useSearchParams } from 'react-router';
import { buttonVariants } from '../components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import SettingsDrawer from '@/frontend/components/SettingsDrawer';
import { useState } from 'react';
import ErrorBoundary from '@/frontend/components/ErrorBoundary';

export default function Settings() {
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get('from');
  const [isOpen, setIsOpen] = useState(true);

  return (
    <ErrorBoundary>
      <section className="flex w-full h-full">
        <Link
          to={{
            pathname: `/chat${chatId ? `/${chatId}` : ''}`,
          }}
          className={buttonVariants({
            variant: 'default',
            className: 'w-fit fixed top-10 left-40 z-10',
          })}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Chat
        </Link>
        <div className="flex items-center justify-center w-full h-full pt-24 pb-44 mx-auto">
          <SettingsDrawer isOpen={isOpen} setIsOpen={setIsOpen}>
            <div />
          </SettingsDrawer>
        </div>
      </section>
    </ErrorBoundary>
  );
}
