// Reproducible shared sanitizer: npm ci --ignore-scripts, then run this script.
import { build } from 'esbuild';
await build({ entryPoints: ['scripts/vendor/editorial-html.ts'], bundle: true, format: 'esm', platform: 'browser', minify: true, outfile: 'supabase/functions/_shared/vendor/editorial-html.mjs', banner: { js: '// Generated from scripts/vendor/editorial-html.ts using locked xss/esbuild. Do not hand edit.' } });
