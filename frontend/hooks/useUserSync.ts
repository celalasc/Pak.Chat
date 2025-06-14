import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export function useUserSync() {
  const { user } = useAuthStore();
  const syncUser = useMutation(api.users.sync);

  useEffect(() => {
    if (user) {
      syncUser().catch(error => {
        console.error('Failed to sync user:', error);
      });
    }
  }, [user, syncUser]);
} 