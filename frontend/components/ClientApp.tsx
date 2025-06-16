"use client";

import dynamic from 'next/dynamic';
import AuthListener from '@/frontend/components/AuthListener';
import { AuthContext } from '@/frontend/contexts/AuthContext';

// Dynamically load the SPA only on the client to avoid Firebase errors
const App = dynamic(() => import('@/frontend/app'), { ssr: false });

export default function ClientApp() {
  return (
    <AuthListener>
      {(authReady) => (
        <AuthContext.Provider value={authReady}>
          <App />
        </AuthContext.Provider>
      )}
    </AuthListener>
  );
}
