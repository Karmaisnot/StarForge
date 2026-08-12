import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { subscribeToSession } from '@/data/http/authToken.js';
import { setActiveQueryClient } from './queryClientBridge.js';

/** Shared server-state cache. A fresh client is created for every app/test tree. */
export function QueryProvider({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: 0 },
        },
      }),
  );

  useEffect(
    () =>
      subscribeToSession((_session) => {
        // Identity changes are a hard privacy boundary. No query result from a
        // previous staff account may be reused by the next browser session.
        client.clear();
      }),
    [client],
  );

  useEffect(() => {
    setActiveQueryClient(client);
    return () => setActiveQueryClient(null);
  }, [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
