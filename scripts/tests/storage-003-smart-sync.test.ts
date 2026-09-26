import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  buildProductSyncStoragePath,
  prepareSmartSyncCsv,
} from '../../src/admin/lib/smartSyncFlow.ts';
import {
  registerProductSyncSource,
  smartSyncBatchIsBlocked,
} from '../../supabase/functions/_shared/product-sync-source.ts';

const fixtureJobId = '11111111-1111-4111-8111-111111111111';

test('Smart Sync costruisce esclusivamente il path privato job-scoped', () => {
  assert.equal(
    buildProductSyncStoragePath(fixtureJobId),
    `product-sync/jobs/${fixtureJobId}/input.csv`,
  );
  for (const unsafe of ['', '../job', 'shopify-ready.csv', `${fixtureJobId}/../other`]) {
    assert.throws(() => buildProductSyncStoragePath(unsafe), /job non valido/i);
  }
});

test('Smart Sync esegue job, upload e registrazione nell’ordine richiesto', async () => {
  const events: string[] = [];
  const path = buildProductSyncStoragePath(fixtureJobId);
  const result = await prepareSmartSyncCsv(
    { name: 'fixture.csv' },
    'sync',
    'admin@example.invalid',
    {
      start: async () => { events.push('job'); return { job_id: fixtureJobId }; },
      upload: async (_file, jobId) => { events.push(`upload:${jobId}`); return path; },
      register: async (jobId, sourcePath) => {
        events.push(`register:${jobId}:${sourcePath}`);
        return { job: { id: jobId, sourcePath } };
      },
    },
  );

  assert.deepEqual(events, [
    'job',
    `upload:${fixtureJobId}`,
    `register:${fixtureJobId}:${path}`,
  ]);
  assert.equal(result.storagePath, path);
});

test('fallimento upload interrompe prima di registrazione e import', async () => {
  const events: string[] = [];
  await assert.rejects(
    prepareSmartSyncCsv(
      { name: 'fixture.csv' },
      'sync',
      'admin@example.invalid',
      {
        start: async () => { events.push('job'); return { job_id: fixtureJobId }; },
        upload: async () => { events.push('upload'); throw new Error('synthetic upload failure'); },
        register: async () => { events.push('register'); return { job: {} }; },
      },
    ),
    /upload failure/,
  );
  assert.deepEqual(events, ['job', 'upload']);
});

test('runtime non contiene più il CSV nel bucket pubblico né il downloader legacy', () => {
  const root = resolve(import.meta.dirname, '../..');
  const engine = readFileSync(resolve(root, 'src/admin/lib/productSyncEngine.ts'), 'utf8');
  const panel = readFileSync(resolve(root, 'src/admin/components/ProductSyncPanel.tsx'), 'utf8');
  const processorPath = resolve(root, 'supabase/functions/_shared/product-sync-processor.ts');

  assert.doesNotMatch(engine, /\.from\(["']sync["']\)[\s\S]{0,180}text\/csv/);
  assert.doesNotMatch(panel, /uploadSyncCsv/);
  assert.throws(() => readFileSync(processorPath, 'utf8'));
});

test('registrazione server-side accetta solo path esatto, è idempotente e blocca batch prematuri', () => {
  const baseReport = {
    mode: 'sync' as const,
    cursor: null,
    hasNextPage: true,
    processed: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    logs: [],
    startedAt: '2026-09-26T00:00:00.000Z',
    source_state: 'awaiting_upload' as const,
  };
  const expected = buildProductSyncStoragePath(fixtureJobId);
  const registered = registerProductSyncSource(fixtureJobId, 'pending', baseReport, expected);
  assert.equal(registered.ok, true);
  if (!registered.ok) return;
  assert.equal(registered.report.source_state, 'registered');
  assert.equal(registered.report.source_path, expected);
  assert.equal(smartSyncBatchIsBlocked(baseReport), true);
  assert.equal(smartSyncBatchIsBlocked(registered.report), false);

  const repeated = registerProductSyncSource(fixtureJobId, 'pending', registered.report, expected);
  assert.deepEqual(repeated, { ok: true, report: registered.report, unchanged: true });
  assert.deepEqual(registerProductSyncSource(fixtureJobId, 'pending', baseReport, 'jobs/other/input.csv'), {
    ok: false, status: 400, error: 'Percorso sorgente non consentito',
  });
  assert.deepEqual(registerProductSyncSource(fixtureJobId, 'processing', baseReport, expected), {
    ok: false, status: 409, error: 'Il job non accetta più una sorgente',
  });
  assert.equal(smartSyncBatchIsBlocked({ ...baseReport, source_state: undefined }), false, 'job legacy compatibile');
});

test('process-product-sync usa il gate testato e mantiene fallback legacy', () => {
  const root = resolve(import.meta.dirname, '../..');
  const source = readFileSync(resolve(root, 'supabase/functions/process-product-sync/index.ts'), 'utf8');
  assert.match(source, /smartSyncBatchIsBlocked\(job\.report_json\)/);
  assert.match(source, /Snapshot CSV non registrato/);
  assert.match(source, /job\.report_json\?\.source_path \|\| String\(body\?\.source_file \|\| "legacy-local-csv"\)/);
  assert.doesNotMatch(source, /shopify-ready\.csv/);
});
