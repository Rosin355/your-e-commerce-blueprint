// CI driver only: every .test.ts runs under its native runtime, with no live services.
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const runtime = process.argv[2];
const lock = process.argv[3];
if (!['node', 'deno'].includes(runtime) || (runtime === 'deno' && !lock)) {
  throw new Error('Usage: node ci/run-domain.mjs node|deno [lockfile]');
}
const files = readdirSync('scripts/tests').filter(name => name.endsWith('.test.ts')).sort().map(name => 'scripts/tests/' + name);
const selected = files.filter(file => /Deno\.test/.test(readFileSync(file, 'utf8')) === (runtime === 'deno'));
if (!selected.length) throw new Error('Empty suite: unexpected test discovery');
console.log(`Running ${runtime} domain tests: ${selected.length} files`);
const guard = fileURLToPath(new URL('./offline-network.cjs', import.meta.url));
const executable = runtime === 'node' ? process.execPath : 'deno';
const args = runtime === 'node'
  ? ['--require', guard, '--import', 'tsx', '--test', ...selected]
  : ['test', '--no-config', '--no-npm', '--frozen', '--lock=' + lock, '--no-check', '--allow-read', '--allow-env', ...selected];
const result = spawnSync(executable, args, { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
