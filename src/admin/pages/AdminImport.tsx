import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, CheckCircle, Play, Zap, ArrowRightLeft, Database } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import CsvUploader from '../components/CsvUploader';
import CsvPreview from '../components/CsvPreview';
import ValidationReport from '../components/ValidationReport';
import ImportProgress from '../components/ImportProgress';
import ImportReport from '../components/ImportReport';
import ImportHistory from '../components/ImportHistory';
import AiWriterPanel from '../components/AiWriterPanel';
import WooPipelinePanel from '../components/WooPipelinePanel';
import ProductSyncPanel from '../components/ProductSyncPanel';
import { readFileAsCsv } from '../lib/csvParser';
import { validateCsv } from '../lib/csvValidator';
import { runImport } from '../lib/importEngine';
import { saveImportLog, createLogEntry } from '../lib/auditLog';
import { useAuth } from '@/hooks/useAuth';
import { useImportStore } from '../stores/importStore';
import type { ImportType } from '../types/import';

interface AdminImportProps {
  onLogout: () => void;
}

export default function AdminImport({ onLogout }: AdminImportProps) {
  const store = useImportStore();
  const aiWriterEnabled = import.meta.env.VITE_ENABLE_AI_PRODUCT_WRITER !== 'false';

  const handleTabChange = (value: string) => {
    if (value === 'ai-writer' || value === 'woo-pipeline' || value === 'smart-sync') return;
    store.reset();
    store.setImportType(value as ImportType);
  };

  const handleFileSelected = useCallback(async (file: File) => {
    store.setStatus('parsing');
    try {
      const csv = await readFileAsCsv(file);
      store.setCsv(csv, file.name);
      store.setStatus('idle');
    } catch {
      store.addLog('Errore nel parsing del CSV');
      store.setStatus('error');
    }
  }, []);

  const handleValidate = () => {
    if (!store.csv) return;
    store.setStatus('validating');
    const result = validateCsv(store.csv, store.importType);
    store.setValidation(result);
    store.setStatus('idle');
  };

  const handleDryRun = async () => {
    if (!store.csv) return;
    store.setStatus('dry-run');
    try {
      const result = await runImport(store.csv.rows, store.importType, true);
      store.setResult(result);
      store.setStatus('done');
    } catch {
      store.setStatus('error');
    }
  };

  const handleSync = async () => {
    if (!store.csv) return;
    store.setStatus('syncing');
    try {
      const result = await runImport(store.csv.rows, store.importType, false);
      store.setResult(result);
      store.setStatus('done');

      const session = getAdminSession();
      if (session) {
        saveImportLog(createLogEntry(session.email, store.fileName, store.importType, result));
      }
    } catch {
      store.setStatus('error');
    }
  };

  const isWorking = store.status === 'dry-run' || store.status === 'syncing' || store.status === 'parsing';

  return (
    <AdminLayout onLogout={onLogout}>
      <Tabs defaultValue="customers" onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="customers" className="gap-2">
            <Users className="h-4 w-4" /> Import Clienti
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" /> Import Prodotti
          </TabsTrigger>
          {aiWriterEnabled && (
            <TabsTrigger value="ai-writer" className="gap-2">
              <Zap className="h-4 w-4" /> AI Writer
            </TabsTrigger>
          )}
          <TabsTrigger value="woo-pipeline" className="gap-2">
            <ArrowRightLeft className="h-4 w-4" /> WooCommerce → Shopify
          </TabsTrigger>
          <TabsTrigger value="smart-sync" className="gap-2">
            <Database className="h-4 w-4" /> Catalogo DB
          </TabsTrigger>
        </TabsList>

        {['customers', 'products'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <CsvUploader onFileSelected={handleFileSelected} disabled={isWorking} />

            {store.csv && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anteprima: {store.fileName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CsvPreview csv={store.csv} />

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={handleValidate} disabled={isWorking} className="gap-2">
                      <CheckCircle className="h-4 w-4" /> Valida
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDryRun} disabled={isWorking || (store.validation && !store.validation.valid)} className="gap-2">
                      <Play className="h-4 w-4" /> Dry Run
                    </Button>
                    <Button size="sm" onClick={handleSync} disabled={isWorking || (store.validation && !store.validation.valid)} className="gap-2">
                      <Zap className="h-4 w-4" /> Sync Shopify
                    </Button>
                  </div>

                  {store.validation && <ValidationReport validation={store.validation} />}
                  <ImportProgress />
                  {store.result && <ImportReport result={store.result} />}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}

        {aiWriterEnabled && (
          <TabsContent value="ai-writer">
            <AiWriterPanel />
          </TabsContent>
        )}
        <TabsContent value="woo-pipeline">
          <WooPipelinePanel />
        </TabsContent>
        <TabsContent value="smart-sync">
          <ProductSyncPanel />
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <ImportHistory />
      </div>
    </AdminLayout>
  );
}
