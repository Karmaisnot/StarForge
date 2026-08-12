import { useEffect, useState } from 'react';
import { ServicesContext } from './contexts.js';
import { loadServices, peekServices } from '@/services/serviceLoader.js';

/**
 * Loads only the selected data adapter. The router and session bootstrap render
 * immediately; authenticated service consumers suspend briefly if this chunk
 * has not finished loading in parallel.
 */
export function ServicesProvider({ value = null, children }) {
  const [services, setServices] = useState(() => value ?? peekServices());

  useEffect(() => {
    if (value) {
      setServices(value);
      return undefined;
    }
    let active = true;
    void loadServices().then((next) => {
      if (active) setServices(next);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}
