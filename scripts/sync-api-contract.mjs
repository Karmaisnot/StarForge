import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';

const schemaPath = resolve(
  process.argv[2] || process.env.STARFORGE_OPENAPI_PATH || '../starforge_edu/openapi.yaml',
);
const outputPath = resolve('contracts/api-methods.json');
const methodNames = new Set(['get', 'head', 'post', 'put', 'patch', 'delete']);

const schema = parse(await readFile(schemaPath, 'utf8'));
if (!schema?.paths || typeof schema.paths !== 'object') {
  throw new Error(`${schemaPath} is not an OpenAPI document with paths.`);
}

const methodsByPath = Object.fromEntries(
  Object.entries(schema.paths)
    .filter(([path]) => path.startsWith('/api/v1/'))
    .map(([path, operations]) => [
      path.replace(/\{[^/{}]+\}/g, '{id}'),
      Object.keys(operations)
        .filter((method) => methodNames.has(method.toLowerCase()))
        .map((method) => method.toUpperCase())
        .sort(),
    ])
    .sort(([left], [right]) => left.localeCompare(right)),
);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source: 'starforge_edu/openapi.yaml',
      generatedAt: new Date().toISOString(),
      paths: methodsByPath,
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(`Captured ${Object.keys(methodsByPath).length} API paths from ${schemaPath}.`);
