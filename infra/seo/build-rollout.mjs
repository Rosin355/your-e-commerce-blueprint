// Generazione locale. Nessun comando Wrangler, accesso di rete o modifica della zona.
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {createMappedHandler} from './legacy-redirects.mjs';

const [stage, output] = process.argv.slice(2);
const sizes = {pilot: 1, '50': 50, '250': 250, '500': 500, '1000': 1000, full: Infinity};
if (!Object.hasOwn(sizes, stage) || !output || process.argv.length !== 4) {
  throw Error('Uso: node infra/seo/build-rollout.mjs pilot|50|250|500|1000|full DIRECTORY_NUOVA');
}
const report = new URL('../../docs/seo/recupero-massivo/', import.meta.url);
const digest = data => createHash('sha256').update(data).digest('hex');
const mappingBytes = readFileSync(new URL('mapping.json', report));
const registryBytes = readFileSync(new URL('registro-redirect.csv', report));
const release = JSON.parse(readFileSync(new URL('release.json', report)));
if (digest(mappingBytes) !== release.mapping_sha256 || digest(registryBytes) !== release.registro_sha256) {
  throw Error('Registro o mappatura diversi dalla release verificata');
}
const mapping = JSON.parse(mappingBytes);
const curated = JSON.parse(readFileSync(new URL('./redirect-candidates.json', import.meta.url))).rules;
const first = curated.map(r => r.oldPath).filter(path => Object.hasOwn(mapping, path));
if (first[0] !== '/prodotto/rose/rosa-jasmina-rampicante/' || mapping[first[0]] !== curated[0].newUrl) throw Error('Pilota divergente');
const paths = [...new Set([...first, ...Object.keys(mapping).sort()])];
if (paths.length !== release.approved) throw Error('Conteggio divergente');
const pairs = paths.slice(0, sizes[stage]).map(path => [path, mapping[path]]);
createMappedHandler(pairs);
const source = readFileSync(new URL('./legacy-redirects.mjs', import.meta.url), 'utf8');
const worker = source + '\nexport default createMappedHandler(' + JSON.stringify(pairs) + ');\n';
const routes = ['onlinegarden.it', 'www.onlinegarden.it'].map(host => ({pattern: host + '/prodotto/*', zone_name: 'onlinegarden.it'}));
const config = {name: 'onlinegarden-301-redirects', main: 'worker.mjs', compatibility_date: '2026-11-28', workers_dev: false, preview_urls: false, routes};
const dir = resolve(output);
mkdirSync(dir, {mode: 0o700});
for (const [file, data] of Object.entries({
  'worker.mjs': worker, 'wrangler.json': JSON.stringify(config, null, 2) + '\n',
  'mapping.json': JSON.stringify(Object.fromEntries(pairs), null, 2) + '\n',
  'lotto.json': JSON.stringify({stage, paths: pairs.length, worker_sha256: digest(worker), source_sha256: release.mapping_sha256}, null, 2) + '\n',
})) writeFileSync(join(dir, file), data);
console.log(stage, pairs.length, 'percorsi, 2 route, Worker SHA-256', digest(worker));
