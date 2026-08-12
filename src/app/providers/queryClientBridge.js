let activeClient = null;

export function setActiveQueryClient(client) {
  activeClient = client ?? null;
}

export function getActiveQueryClient() {
  return activeClient;
}
