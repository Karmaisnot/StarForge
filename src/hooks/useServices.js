import { useContext } from 'react';
import { ServicesContext } from '@/app/providers/contexts.js';

/** Access the injected service registry. */
export function useServices() {
  return useContext(ServicesContext);
}
