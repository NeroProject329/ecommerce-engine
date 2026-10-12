import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const projectRoot = process.cwd();
const composePath = resolve(projectRoot, 'infrastructure/local/docker-compose.yml');
const source = await readFile(composePath, 'utf8');
const compose = parse(source);

for (const serviceName of ['postgres', 'redis']) {
  const service = compose.services?.[serviceName];
  if (!service) throw new Error(`Serviço ausente no Compose: ${serviceName}`);
  if (!service.image || String(service.image).includes(':latest')) {
    throw new Error(`Imagem não fixada para ${serviceName}`);
  }
  if (!service.healthcheck?.test) throw new Error(`Healthcheck ausente para ${serviceName}`);
}

if (compose.services.postgres.ports?.[0] !== '127.0.0.1:5432:5432') {
  throw new Error('PostgreSQL não está restrito ao loopback local.');
}
if (compose.services.redis.ports?.[0] !== '127.0.0.1:6379:6379') {
  throw new Error('Redis não está restrito ao loopback local.');
}

console.log('[OK] Compose local possui PostgreSQL e Redis fixados, isolados e com healthchecks.');
