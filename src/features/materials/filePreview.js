export function safeFileUrl(value, origin = globalThis.location?.origin || 'https://localhost') {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, origin);
    const localDevelopment = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const sameOriginBlob = url.protocol === 'blob:' && url.origin === new URL(origin).origin;
    if ((url.protocol !== 'https:' && !localDevelopment && !sameOriginBlob) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function previewKind(contentType) {
  const value = String(contentType || '').toLowerCase();
  if (value === 'application/pdf') return 'pdf';
  if (value.startsWith('image/')) return 'image';
  if (value.startsWith('video/')) return 'video';
  if (value.startsWith('audio/')) return 'audio';
  if (value.startsWith('text/') || ['application/json', 'application/xml'].includes(value)) return 'document';
  return 'external';
}

export function fileTypeLabel(contentType) {
  const value = String(contentType || '').toLowerCase();
  const known = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  };
  if (known[value]) return known[value];
  if (value.includes('/')) return value.split('/')[1].split(/[;+]/)[0].toUpperCase();
  return 'FILE';
}
