"use client";
import { ReactNode, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { auth } from "@/firebase";
import { onIdTokenChanged } from "firebase/auth";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore();
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);
  const cachedToken = useRef<string | undefined>(undefined);
  const cachedExp = useRef<number>(0); // ms timestamp when cached token expires

  useEffect(() => {
    if (!user) {
      setIdToken(null);
      cachedToken.current = undefined;
      cachedExp.current = 0;
      return;
    }

    // Reactively update token when Firebase refreshes it
    const unsub = onIdTokenChanged(auth, async (u) => {
      if (!u) {
        setIdToken(null);
        cachedToken.current = undefined;
        cachedExp.current = 0;
        return;
      }

      const token = await u.getIdToken();
      setIdToken(token);
      cachedToken.current = token;
      const res = await u.getIdTokenResult();
      cachedExp.current = Date.parse(res.expirationTime);
    });

    return unsub;
  }, [user]);

  // Get ID token, refreshing only when requested or expired
  const getFreshToken = useCallback(
    async (force = false) => {
      if (!user) return "";
      if (!force && cachedToken.current && Date.now() < cachedExp.current - 60_000) {
        // token is still valid for at least a minute
        return cachedToken.current;
      }

      const t = await user.getIdToken(force);
      cachedToken.current = t;
      const res = await user.getIdTokenResult();
      cachedExp.current = Date.parse(res.expirationTime);
      return t;
    },
    [user]
  );

  const authState = useMemo(
    () => ({
      isLoading: idToken === undefined || loading,
      isAuthenticated: !!idToken,
      fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) =>
        getFreshToken(forceRefreshToken),
    }),
    [idToken, loading, getFreshToken]
  );

  const useAuth = useCallback(() => authState, [authState]);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
