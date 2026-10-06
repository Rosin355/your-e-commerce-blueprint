import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CLIENT_CREATABLE_MISSING_FIELD_KEYS,
  DIFFICULTY_OPTIONS,
  MONTHS,
  isClientCreatableMissingFieldKey,
} from "../../supabase/functions/_shared/admin-v2-field-policy.ts";
import { isCanaryField } from "../../supabase/functions/_shared/admin-v2-commands.ts";
import {
  validateCommand,
  validateValue,
} from "../../supabase/functions/_shared/admin-v2-validation.ts";
import {
  calculateFieldCapabilities,
} from "../../supabase/functions/product-admin-api/capabilities.ts";
import { serializeField } from "../../supabase/functions/product-admin-api/serializers.ts";
import type {
  FieldDefinition,
} from "../../supabase/functions/_shared/admin-v2-types.ts";
import {
  editorKind,
  isEditorValueSupported,
  normalizeEditorValue,
} from "../../src/adminv2/lib/fieldValueCodecs.ts";

function definition(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    key: "periodo_di_fioritura",
    label: "Periodo di fioritura",
    field_group: "botanical",
    editor_type: "multiselect",
    data_type: "array",
    visible: true,
    editable: true,
    ai_allowed: false,
    manual_only: false,
    publishable: true,
    required: false,
    protected_on_reimport: true,
    applies_to: "product",
    sort_order: 1,
    help_text: null,
    validation_rules: { enum: MONTHS },
    shopify_mapping: {
      type: "metafield",
      namespace: "custom",
      key: "periodo_di_fioritura",
    },
    review_policy: "none",
    ...overrides,
  };
}

const writable = {
  roles: ["admin"] as const,
  writesEnabled: true,
  writeMode: "canary" as const,
};

test("allowlist missing-value contiene soltanto i cinque campi approvati", () => {
  assert.deepEqual([...CLIENT_CREATABLE_MISSING_FIELD_KEYS], [
    "periodo_di_fioritura",
    "periodo_di_messa_a_dimora",
    "periodo_di_raccolta",
    "periodo_ottimale_di_potatura",
    "difficolta_di_coltivazione",
  ]);
  for (const key of CLIENT_CREATABLE_MISSING_FIELD_KEYS) {
    assert.equal(isClientCreatableMissingFieldKey(key), true, key);
    assert.equal(isCanaryField({ key, manual_only: false }), true, key);
  }
  for (const key of [
    "price",
    "inventory_quantity",
    "handle",
    "publication_status",
    "shopify_product_id",
    "faq",
    "raw_unmapped",
  ]) {
    assert.equal(isClientCreatableMissingFieldKey(key), false, key);
  }
});

test("campo stagionale mancante espone versione zero, capability e multiselect", () => {
  const def = definition();
  const capabilities = calculateFieldCapabilities(def, undefined, "simple", writable);
  assert.equal(capabilities.applicable, true);
  assert.equal(capabilities.definitionEditable, true);
  assert.equal(capabilities.currentValueExists, false);
  assert.equal(capabilities.canUpdate, true);
  assert.equal(capabilities.updateBlockReason, "allowed");

  const field = serializeField(def, undefined, "simple", writable);
  assert.equal(field.version, 0);
  assert.equal(field.value, null);
  assert.equal(editorKind(field), "month_multiselect");
  assert.equal(isEditorValueSupported(field, null), true);
});

test("missing periodo_di_fioritura accetta solo string[] canonico", () => {
  const def = definition();
  const value = ["Marzo", "Aprile"];
  assert.equal(validateCommand("update_field", def, undefined, value, {
    expectedVersion: 0,
  }).ok, true);
  assert.deepEqual(
    normalizeEditorValue(serializeField(def, undefined, "simple", writable), value),
    { ok: true, value },
  );

  assert.equal(validateCommand("update_field", def, undefined, "Marzo", {
    expectedVersion: 0,
  }).code, "VALIDATION_ERROR");
  assert.equal(validateCommand("update_field", def, undefined, ["Marzo", "Primavera"], {
    expectedVersion: 0,
  }).code, "VALIDATION_ERROR");
  assert.equal(validateCommand("update_field", def, undefined, ["Marzo", "Marzo"], {
    expectedVersion: 0,
  }).code, "VALIDATION_ERROR");
  assert.equal(validateCommand("update_field", def, undefined, ["Aprile", "Marzo"], {
    expectedVersion: 0,
  }).code, "VALIDATION_ERROR");
});

test("difficolta mancante usa select ed enum chiuso", () => {
  const def = definition({
    key: "difficolta_di_coltivazione",
    label: "Difficoltà",
    editor_type: "select",
    data_type: "text",
    validation_rules: { enum: DIFFICULTY_OPTIONS },
    shopify_mapping: {
      type: "metafield",
      namespace: "custom",
      key: "difficolta_di_coltivazione",
    },
  });
  assert.equal(validateCommand("update_field", def, undefined, "Media", {
    expectedVersion: 0,
  }).ok, true);
  assert.equal(validateCommand("update_field", def, undefined, "Esperto", {
    expectedVersion: 0,
  }).code, "VALIDATION_ERROR");
  const field = serializeField(def, undefined, "simple", writable);
  assert.equal(editorKind(field), "select");
  assert.equal(isEditorValueSupported(field, null), true);
});

test("campo mancante non allowlisted resta FIELD_NOT_EDITABLE", () => {
  const result = validateCommand(
    "update_field",
    definition({
      key: "description",
      editor_type: "textarea",
      data_type: "text",
      validation_rules: {},
      shopify_mapping: { type: "core", field: "descriptionHtml" },
    }),
    undefined,
    "Nuova descrizione",
    { expectedVersion: 0 },
  );
  assert.equal(result.code, "FIELD_NOT_EDITABLE");
});

test("creazione manual_only esistente resta riservata al canale Admin", () => {
  const manual = definition({
    key: "nome_comune",
    editor_type: "text",
    data_type: "text",
    manual_only: true,
    validation_rules: {},
  });
  assert.equal(validateCommand("update_field", manual, undefined, "Rosa", {
    expectedVersion: 0,
    allowLockedManual: true,
  }).ok, true);
  assert.equal(validateCommand("update_field", manual, undefined, "Rosa", {
    expectedVersion: 0,
    allowLockedManual: false,
  }).code, "FIELD_NOT_EDITABLE");
});

test("salvataggio interno resta separato dalla rete Shopify e dalla sync esplicita", async () => {
  const api = await readFile(
    new URL("../../supabase/functions/product-admin-api/index.ts", import.meta.url),
    "utf8",
  );
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20261006170000_admin_missing_field_creation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const drizzleMigration = await readFile(
    new URL(
      "../../drizzle/migrations/0012_admin_missing_field_creation.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const fieldCard = await readFile(
    new URL("../../src/adminv2/components/FieldCard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(api, /if \(action === "sync_field"\)/);
  assert.match(api, /syncFieldToShopify/);
  assert.match(fieldCard, /field\.capabilities\.currentValueExists/);
  assert.doesNotMatch(migration, /\b(?:fetch|curl|http_post|net\.http_)\b/i);
  assert.equal(drizzleMigration, migration);
  assert.match(migration, /'pending_publish'/);
  assert.match(migration, /'PENDING_SYNC'/);
  assert.equal(validateValue(definition(), ["Marzo", "Aprile"]).ok, true);
});
