import { services as defaultServices } from '@/services/container.js';
import { ServicesContext } from './contexts.js';

/** Dependency-injection context carrying the service registry. */
/**
 * Injects the service container. Tests can pass a fake `value`.
 * @param {{ value?: object, children: any }} props
 */
export function ServicesProvider({ value = defaultServices, children }) {
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}
