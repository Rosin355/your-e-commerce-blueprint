// Produces an ES module and route configuration in a new private directory. No provider calls.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';

const [stage, out] = process.argv.slice(2);
if (!['pilot', 'full'].includes(stage) || !out || process.argv.length !== 4) {
  throw new Error('Uso: node infra/seo/build-rollout.mjs pilot|full DIRECTORY_NUOVA');
}
const source = readFileSync(new URL('./redirect-candidates.json', import.meta.url));
const expected = '68f2da5641b1f52dde80fd43cdeeaada7c6bf6784da21f27fbfeaa3c0519f1eb';
if (createHash('sha256').update(source).digest('hex') !== expected) throw new Error('Inventario diverso dai 16 mapping verificati.');
const manifest = JSON.parse(source);
const rules = stage === 'pilot' ? manifest.rules.slice(0,1) : manifest.rules;
const approved = {enabled:true, approvalReference:'Online Garden 28 novembre 2026',rules:rules.map(r => ({...r,reviewApproved:true}))};
const handler = readFileSync(new URL('./legacy-redirects.mjs',import.meta.url),'utf8');
const directory = resolve(out);
mkdirSync(directory, {mode:0o700});
writeFileSync(join(directory,'worker.mjs'), handler + '\nexport default createHandler(' + JSON.stringify(approved) + ');\n');
const routes = rules.flatMap(r=>['onlinegarden.it','www.onlinegarden.it'].map(host=>({
  pattern:host+r.oldPath+'*',zone_name:'onlinegarden.it'
})));
writeFileSync(join(directory,'wrangler.json'), JSON.stringify({
  name:'og-legacy-products',main:'worker.mjs',compatibility_date:'2026-11-28',
  workers_dev:false,preview_urls:false,routes
},null,2)+'\n');
console.log(stage, rules.length, 'percorsi,', routes.length,'route');
