"use client";

import dynamic from 'next/dynamic';

// Dynamically load the SPA only on the client to avoid Firebase errors
const App = dynamic(() => import('@/frontend/app'), { ssr: false });

export default function ClientApp() {
  return <App />;
}
