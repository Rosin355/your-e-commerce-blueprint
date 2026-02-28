import type { CsvRow, ImportType, ImportResult, ImportRecordResult, ProxyRequest } from '../types/import';
import { mapToShopifyCustomerInput, mapToShopifyProductInput } from './shopifyMapper';
import { sanitizeRow } from './csvValidator';
import { useImportStore } from '../stores/importStore';
import { supabase } from '@/integrations/supabase/client';

const BATCH_SIZE = 10;

async function callProxy(request: ProxyRequest) {
  const { data, error } = await supabase.functions.invoke('shopify-admin-proxy', {
    body: request,
  });
  if (error) throw new Error(error.message || 'Errore proxy');
  return data;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runImport(
  rows: CsvRow[],
  type: ImportType,
  dryRun: boolean,
): Promise<ImportResult> {
  const store = useImportStore.getState();
  const validRows = rows.map(sanitizeRow);
  let created = 0, updated = 0, skipped = 0, errors = 0;
  const records: ImportRecordResult[] = [];

  store.setProgress(0, validRows.length);
  store.addLog(`Avvio ${dryRun ? 'dry run' : 'sync'} per ${validRows.length} ${type}...`);

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j;
      const row = batch[j];
      const identifier = type === 'customers'
        ? row.email || `riga ${rowIndex + 2}`
        : row.title || row.name || row.post_title || `riga ${rowIndex + 2}`;

      try {
        if (dryRun) {
          // Simulate: search for existing record
          const searchAction = type === 'customers' ? 'search_customer' : 'search_product';
          const searchKey = type === 'customers' ? row.email : (row.title || row.name || row.post_title);
          const searchResult = await callProxy({ action: searchAction, data: { query: searchKey } });

          const exists = searchResult?.found;
          const status = exists ? 'updated' : 'created';
          if (exists) updated++; else created++;

          const result: ImportRecordResult = { row: rowIndex + 2, status, identifier, message: dryRun ? `(simulato) Verrebbe ${status === 'created' ? 'creato' : 'aggiornato'}` : undefined };
          records.push(result);
          store.addRecordResult(result);
        } else {
          // Real sync: search then create/update
          const searchAction = type === 'customers' ? 'search_customer' : 'search_product';
          const searchKey = type === 'customers' ? row.email : (row.title || row.name || row.post_title);
          const searchResult = await callProxy({ action: searchAction, data: { query: searchKey } });

          const exists = searchResult?.found;
          const mapped = type === 'customers'
            ? mapToShopifyCustomerInput(row)
            : mapToShopifyProductInput(row);

          if (exists) {
            const updateAction = type === 'customers' ? 'update_customer' : 'update_product';
            await callProxy({ action: updateAction, data: { id: searchResult.id, ...mapped } });
            updated++;
            records.push({ row: rowIndex + 2, status: 'updated', identifier });
            store.addRecordResult({ row: rowIndex + 2, status: 'updated', identifier });
          } else {
            const createAction = type === 'customers' ? 'create_customer' : 'create_product';
            await callProxy({ action: createAction, data: mapped });
            created++;
            records.push({ row: rowIndex + 2, status: 'created', identifier });
            store.addRecordResult({ row: rowIndex + 2, status: 'created', identifier });
          }
        }
      } catch (err: any) {
        errors++;
        const msg = err?.message || 'Errore sconosciuto';
        records.push({ row: rowIndex + 2, status: 'error', identifier, message: msg });
        store.addRecordResult({ row: rowIndex + 2, status: 'error', identifier, message: msg });
        store.addLog(`❌ Errore riga ${rowIndex + 2} (${identifier}): ${msg}`);
      }

      store.setProgress(rowIndex + 1, validRows.length);
    }

    store.addLog(`Batch ${Math.floor(i / BATCH_SIZE) + 1} completato (${Math.min(i + BATCH_SIZE, validRows.length)}/${validRows.length})`);

    // Small delay between batches to respect rate limits
    if (i + BATCH_SIZE < validRows.length) {
      await sleep(500);
    }
  }

  const result: ImportResult = {
    created, updated, skipped, errors,
    records,
    timestamp: new Date().toISOString(),
  };

  store.addLog(`✅ Completato: ${created} creati, ${updated} aggiornati, ${skipped} saltati, ${errors} errori`);
  return result;
}
