import { useEffect } from 'react';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useUserSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncUser = useMutation(api.users.sync);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      syncUser().catch(error => {
        console.error('Failed to sync user:', error);
      });
    }
  }, [isAuthenticated, isLoading, syncUser]);
}
