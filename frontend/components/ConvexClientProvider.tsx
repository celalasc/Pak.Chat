"use client";
import { ReactNode, useEffect, useState } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { useAuthStore } from "@/frontend/stores/AuthStore";
import { auth } from "@/firebase";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuthStore();
  const [idToken, setIdToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      setIdToken(null);
      return;
    }
    
    const getIdToken = async () => {
      try {
        const token = await user.getIdToken();
        setIdToken(token || null);
      } catch (error) {
        console.error("Failed to get id token:", error);
        setIdToken(null);
      }
    };
    getIdToken();
  }, [user, loading]);

  return (
    <ConvexProviderWithAuth client={convex} useAuth={(() => ({
      isLoading: idToken === undefined || loading,
      isAuthenticated: !!idToken,
      fetchAccessToken: async ({ forceRefreshToken }) => {
        if (!user) return null;
        
        try {
          const newToken = await user.getIdToken(forceRefreshToken);
          if (forceRefreshToken) {
            setIdToken(newToken);
          }
          return newToken || null;
        } catch (error) {
          console.error("Failed to get access token:", error);
          return null;
        }
      }
    }))}>
      {children}
    </ConvexProviderWithAuth>
  );
} 