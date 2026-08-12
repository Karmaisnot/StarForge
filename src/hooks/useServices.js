import { useContext } from 'react';
import { ServicesContext } from '@/app/providers/contexts.js';
import { loadServices } from '@/services/serviceLoader.js';

/** Access the injected service registry. */
export function useServices() {
  const services = useContext(ServicesContext);
  if (!services) throw loadServices();
  return services;
}
