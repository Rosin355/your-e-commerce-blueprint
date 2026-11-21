import fs from 'node:fs';
import { buildCustomerReport, PreflightError } from './customer-preflight.mjs';

const HELP = `Preflight clienti offline: nessuna rete, segreto o importazione.
node sync/customers-convert.mjs --input /percorso/privato/clienti-minimi.csv
  [--orders /percorso/privato/solo-id-orders.csv]
  [--snapshot /percorso/privato/shopify-minimo.csv
   --snapshot-metadata /percorso/privato/snapshot.json --shop negozio.myshopify.com]
  [--report /percorso/nuovo/report-aggregato.json] [--dry-run] [--email-only]
--synthetic usa esclusivamente la fixture incorporata, senza file privati.
Modalità predefinita: strict. --email-only richiede sempre review privata (exit 2).
Exit: 0 review strict completa, 2 bloccata/da revisionare, 1 input/argomenti/IO non validi.
Le opzioni write/apply/execute e le variabili legacy non sono supportate.
`;
const reject = (code) => { throw new PreflightError(code); };
function parseArgs(args) {
  const options = {};
  const flags = new Set(['--dry-run', '--synthetic', '--help', '--email-only']);
  const values = new Set(['--input', '--orders', '--snapshot', '--snapshot-metadata', '--shop', '--report']);
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if ((!flags.has(key) && !values.has(key)) || Object.hasOwn(options, key)) reject('ARGUMENTS_NOT_ALLOWED');
    if (flags.has(key)) options[key] = true;
    else {
      const value = args[++i];
      if (!value || value.startsWith('--')) reject('ARGUMENT_VALUE_REQUIRED');
      options[key] = value;
    }
  }
  return options;
}
function readLocal(file) {
  // No .env discovery; reject symlinks and non-regular files, cap memory consumption.
  const info = fs.lstatSync(file);
  if (!info.isFile() || info.size > 32 * 1024 * 1024) reject('INPUT_FILE_NOT_ALLOWED');
  return fs.readFileSync(file, 'utf8');
}
export async function runCustomerPreflight(args = process.argv.slice(2)) {
  try {
    const options = parseArgs(args);
    if (options['--help']) { console.log(HELP); return 0; }
    let input;
    if (options['--synthetic']) {
      if (['--input', '--orders', '--snapshot', '--snapshot-metadata', '--shop'].some((k) => options[k])) reject('SYNTHETIC_INPUT_CONFLICT');
      const { syntheticJoinScenario, syntheticEmailOnlyScenario } = await import('../tests/customer-fixtures.mjs');
      input = options['--email-only'] ? syntheticEmailOnlyScenario() : syntheticJoinScenario();
    } else {
      if (!options['--input']) reject('INPUT_REQUIRED');
      const snapshotOptions = ['--snapshot', '--snapshot-metadata', '--shop'].filter((k) => options[k]);
      if (snapshotOptions.length !== 0 && snapshotOptions.length !== 3) reject('SNAPSHOT_ARGUMENTS_INCOMPLETE');
      input = { sourceCsv: readLocal(options['--input']) };
      if (options['--orders']) input.ordersCsv = readLocal(options['--orders']);
      if (snapshotOptions.length) Object.assign(input, {
        snapshotCsv: readLocal(options['--snapshot']),
        snapshotMetadata: JSON.parse(readLocal(options['--snapshot-metadata'])),
        expectedShop: options['--shop'],
      });
    }
    const report = buildCustomerReport({ ...input, emailOnly: Boolean(options['--email-only']) });
    const output = `${JSON.stringify(report, null, 2)}\n`;
    // Explicit, exclusive output: never overwrite input, existing file or symlink.
    if (options['--report']) fs.writeFileSync(options['--report'], output, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    console.log(output.trimEnd());
    return report.status === 'OFFLINE_REVIEW_COMPLETE' ? 0 : 2;
  } catch (error) {
    // Never print raw errors, paths, arguments, CSV content or stack traces.
    console.error(JSON.stringify({ error: error instanceof PreflightError ? error.message : 'INPUT_OR_OUTPUT_ERROR' }));
    return 1;
  }
}
