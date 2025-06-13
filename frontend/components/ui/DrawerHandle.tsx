import React from 'react';

/**
 * Shared drag handle for mobile drawers.
 * Provides consistent look and spacing across drawers.
 */
export const DrawerHandle = () => (
  <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
    <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
  </div>
);

