"use client";

import * as React from "react";

interface MSWProviderProps {
  children: React.ReactNode;
}

// Non-blocking MSW initialization - app renders immediately
export function MSWProvider({ children }: MSWProviderProps) {
  React.useEffect(() => {
    // Only initialize MSW in development when explicitly enabled
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'development' &&
      process.env.NEXT_PUBLIC_MSW_ENABLED === 'true'
    ) {
      // Initialize MSW in the background - don't block rendering
      import('@/mocks/browser')
        .then(({ worker }) => {
          worker.start({
            onUnhandledRequest: 'bypass', // Don't warn on unhandled requests
            quiet: true, // Reduce console noise
          });
          console.log('🔶 MSW worker started');
        })
        .catch((error) => {
          console.error('Failed to start MSW worker:', error);
        });
    }
  }, []);

  // Always render children immediately - no blocking
  return <>{children}</>;
}