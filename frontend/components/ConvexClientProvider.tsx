"use client";
import { ReactNode, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { auth } from "@/firebase";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIdToken(null);
      return;
    }
    const getIdToken = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        setIdToken(token || null);
      } catch (error) {
        console.error("Failed to get id token:", error);
        setIdToken(null);
      }
    };
    getIdToken();
  }, [user]);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={(() => ({
      isLoading: idToken === undefined,
      isAuthenticated: !!idToken,
      fetchAccessToken: async ({ forceRefreshToken }) => {
        if (forceRefreshToken) {
          const newToken = await auth.currentUser?.getIdToken(true);
          return newToken || null;
        }
        return idToken;
      }
    }))}>
      {children}
    </ConvexProviderWithAuth>
  );
} 