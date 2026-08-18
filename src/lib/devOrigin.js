const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

/** Use a distinct development hostname because cookies are not isolated by port. */
export function isolatedDevelopmentUrl(locationLike, appHostname) {
  if (!locationLike?.href || !LOOPBACK_HOSTS.has(locationLike.hostname)) return '';
  const target = new URL(locationLike.href);
  target.hostname = appHostname;
  return target.href;
}
