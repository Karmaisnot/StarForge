import { DATA_SOURCE } from '@/data/http/apiConfig.js';

let resolvedServices = null;
let pendingServices = null;

const loaders = {
  remote: () => import('./containers/remoteServices.js'),
  local: () => import('./containers/localServices.js'),
  mock: () => import('./containers/mockServices.js'),
};

export function peekServices() {
  return resolvedServices;
}

export function loadServices() {
  if (resolvedServices) return Promise.resolve(resolvedServices);
  if (!pendingServices) {
    pendingServices = loaders[DATA_SOURCE]().then((module) => {
      resolvedServices = module.services;
      return resolvedServices;
    });
  }
  return pendingServices;
}
