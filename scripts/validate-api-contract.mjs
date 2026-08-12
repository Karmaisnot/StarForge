import { readFile } from 'node:fs/promises';
import { STAFF_RESOURCES } from '../src/domain/staffResources.js';

const snapshot = JSON.parse(await readFile('contracts/api-methods.json', 'utf8'));
const failures = [];
const seenWorkspaceIds = new Set();
const seenPaths = new Set();

function contractPath(endpoint) {
  return `/api/v1/${String(endpoint).replace(/^\/+/, '')}`.replace(
    /\{[^/{}]+\}/g,
    '{id}',
  );
}

function requireMethod(collection, endpoint, method, alternatives = []) {
  const path = contractPath(endpoint);
  const available = snapshot.paths[path] ?? [];
  if (![method, ...alternatives].some((candidate) => available.includes(candidate))) {
    failures.push(
      `${collection}: ${path} declares ${method.toLowerCase()} in the UI but OpenAPI has ` +
        `${available.join(', ') || 'no operation'}.`,
    );
  }
}

for (const workspace of STAFF_RESOURCES) {
  if (seenWorkspaceIds.has(workspace.id)) failures.push(`Duplicate workspace id: ${workspace.id}.`);
  if (seenPaths.has(workspace.path)) failures.push(`Duplicate workspace path: ${workspace.path}.`);
  seenWorkspaceIds.add(workspace.id);
  seenPaths.add(workspace.path);

  const seenCollections = new Set();
  for (const collection of workspace.collections) {
    const label = `${workspace.id}/${collection.id}`;
    if (seenCollections.has(collection.id)) failures.push(`Duplicate collection id: ${label}.`);
    seenCollections.add(collection.id);
    if (!collection.endpoint.endsWith('/')) failures.push(`${label}: endpoint must end in '/'.`);
    if (!collection.permission) failures.push(`${label}: permission family is missing.`);

    requireMethod(label, collection.endpoint, 'GET');
    if (collection.create) requireMethod(label, collection.endpoint, 'POST');

    const detailEndpoint =
      collection.detailPattern ?? `${collection.endpoint}{id}/`;
    if (collection.update) requireMethod(label, detailEndpoint, 'PATCH', ['PUT']);
    if (collection.remove) requireMethod(label, detailEndpoint, 'DELETE');
  }
}

if (failures.length) {
  console.error(`Staff API contract check failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  const collections = STAFF_RESOURCES.reduce(
    (total, workspace) => total + workspace.collections.length,
    0,
  );
  console.log(
    `Validated ${STAFF_RESOURCES.length} workspaces and ${collections} collections against ` +
      `${Object.keys(snapshot.paths).length} OpenAPI paths.`,
  );
}
