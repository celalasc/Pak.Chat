'use client'
import { useContext } from 'react';
import { useQuery } from 'convex/react';
import { AuthContext } from '@/frontend/contexts/AuthContext';

/**
 * Wrapper around Convex's useQuery that waits for auth to be ready
 * and skips the request when args are null or auth is not ready.
 */
export function useSafeConvexQuery<Args extends Record<string, any>, Result>(
  fn: any,
  args: Args | null,
) {
  const authReady = useContext(AuthContext);
  const skip = !authReady || args === null;
  // Convex allows passing undefined to skip the query.
  return skip ? undefined : (useQuery as any)(fn, args) as Result;
}
