import test from "node:test";
import assert from "node:assert/strict";

import {
  authorizeAction,
  canManageLockedManualValues,
  canWriteCanary,
  isCommandAction,
  isKnownAction,
} from "../../supabase/functions/product-admin-api/permissions.ts";
import {
  CANARY_ACTIONS,
  canonicalizeJson,
  isCanaryField,
  payloadHash,
} from "../../supabase/functions/product-admin-api/commands.ts";
import {
  isFieldEditable,
  isNoChange,
  normalizePageSize,
  validateCommand,
  validateValue,
} from "../../supabase/functions/product-admin-api/validation.ts";
import { apiError, serializeProductSummary, serializeSections } from "../../supabase/functions/product-admin-api/serializers.ts";
import type { CurrentValueRow, FieldDefinition } from "../../supabase/functions/product-admin-api/types.ts";

function def(over: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    key: "title",
    label: "Titolo prodotto",
    field_group: "main",
    editor_type: "text",
    data_type: "text",
    visible: true,
    editable: true,
    ai_allowed: true,
    manual_only: false,
    publishable: true,
    required: false,
    protected_on_reimport: true,
    applies_to: "both",
    sort_order: 10,
    help_text: null,
    validation_rules: {},
    review_policy: "none",
    ...over,
  };
}

function row(over: Partial<CurrentValueRow> = {}): CurrentValueRow {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    product_id: "22222222-2222-2222-2222-222222222222",
    sku: "OG_1",
    field_key: "title",
    entity_type: "product",
    value_text: "Rosa Rugosa",
    value_number: null,
    value_json: null,
    value_origin: "legacy_db_baseline",
    origin: "import",
    review_status: "approved",
    publish_blocked: false,
    protected_on_reimport: false,
    source_snapshot_id: null,
    is_locked: false,
    version: 1,
    updated_at: "2026-08-17T00:00:00Z",
    ...over,
  };
}

test("azioni: whitelist e classificazione", () => {
  assert.equal(isKnownAction("list_products"), true);
  assert.equal(isKnownAction("drop_table"), false);
  assert.equal(isCommandAction("update_field"), true);
  assert.equal(isCommandAction("get_product"), false);
});

test("permessi: anon e ruoli", () => {
  assert.equal(authorizeAction("get_product", []).allowed, false);
  assert.equal(authorizeAction("get_product", ["user"]).allowed, false);
  assert.equal(authorizeAction("get_product", ["publisher"]).allowed, true);
  assert.equal(authorizeAction("update_field", ["publisher"]).allowed, false);
  assert.equal(authorizeAction("update_field", ["publisher", "editor"]).allowed, true);
  assert.equal(authorizeAction("update_field", ["editor"]).allowed, true);
  assert.equal(authorizeAction("update_field", ["admin"]).allowed, true);
  assert.equal(authorizeAction("update_field", ["tech_admin"]).allowed, true);
});

test("campi protetti non modificabili", () => {
  assert.equal(isFieldEditable(def({ key: "sku" })).ok, false);
  assert.equal(isFieldEditable(def({ key: "inventory_quantity", field_group: "inventory" })).ok, false);
  assert.equal(isFieldEditable(def({ key: "shopify_product_id", field_group: "shopify_state" })).ok, false);
  assert.equal(isFieldEditable(def({ editable: false })).ok, false);
  assert.equal(isFieldEditable(def()).ok, true);
  // manual_only resta modificabile a mano
  assert.equal(isFieldEditable(def({ key: "nome_comune", field_group: "botanical", manual_only: true, ai_allowed: false })).ok, true);
});

test("tipizzazione valori", () => {
  assert.equal(validateValue(def(), "ok").ok, true);
  assert.equal(validateValue(def(), 12).ok, false);
  assert.equal(validateValue(def({ data_type: "number" }), 12).ok, true);
  assert.equal(validateValue(def({ data_type: "number" }), "12").ok, false);
  assert.equal(validateValue(def({ data_type: "array" }), ["a"]).ok, true);
  assert.equal(validateValue(def({ data_type: "array" }), "a").ok, false);
  assert.equal(validateValue(def({ data_type: "boolean" }), true).ok, true);
  assert.equal(validateValue(def({ validation_rules: { maxLength: 3 } }), "abcd").ok, false);
});

test("stringa vuota rifiutata: serve clear_field", () => {
  const res = validateCommand("update_field", def(), row(), "   ", { expectedVersion: 1 });
  assert.equal(res.ok, false);
  assert.equal(res.code, "VALIDATION_ERROR");
});

test("no-op non genera modifica", () => {
  assert.equal(isNoChange(row(), "Rosa Rugosa"), true);
  const res = validateCommand("update_field", def(), row(), "Rosa Rugosa", { expectedVersion: 1 });
  assert.equal(res.code, "NO_CHANGE");
});

test("expectedVersion obbligatorio", () => {
  const res = validateCommand("update_field", def(), row(), "Nuovo titolo", {});
  assert.equal(res.ok, false);
  assert.equal(res.code, "VALIDATION_ERROR");
});

test("creazione manual_only richiede Admin e expectedVersion zero", () => {
  const manual = def({ key: "nome_comune", manual_only: true, ai_allowed: false });
  assert.equal(validateCommand("update_field", manual, undefined, "Rosa", {
    expectedVersion: 0,
    allowLockedManual: true,
  }).ok, true);
  assert.equal(validateCommand("update_field", manual, undefined, "Rosa", {
    expectedVersion: 1,
    allowLockedManual: true,
  }).ok, false);
  assert.equal(validateCommand("update_field", manual, undefined, "Rosa", {
    expectedVersion: 0,
    allowLockedManual: false,
  }).code, "FIELD_NOT_EDITABLE");
  assert.equal(validateCommand("clear_field", manual, undefined, null, {
    expectedVersion: 0,
    allowLockedManual: true,
    confirm: true,
  }).code, "FIELD_NOT_EDITABLE");
});

test("manual_only locked è modificabile solo dal canale Admin esplicito", () => {
  const manual = def({ key: "nome_comune", manual_only: true, ai_allowed: false });
  const locked = row({ field_key: "nome_comune", is_locked: true });
  assert.equal(validateCommand("update_field", manual, locked, "Rosa", {
    expectedVersion: 1,
  }).code, "FIELD_NOT_EDITABLE");
  assert.equal(validateCommand("update_field", manual, locked, "Rosa", {
    expectedVersion: 1,
    allowLockedManual: true,
  }).ok, true);
  assert.equal(locked.is_locked, true);
});

test("hash idempotente canonicalizza ricorsivamente gli oggetti", async () => {
  const a = { z: [{ answer: "A", question: "Q" }], meta: { b: 2, a: 1 } };
  const b = { meta: { a: 1, b: 2 }, z: [{ question: "Q", answer: "A" }] };
  assert.deepEqual(canonicalizeJson(a), canonicalizeJson(b));
  assert.equal(await payloadHash(a), await payloadHash(b));
  assert.notEqual(await payloadHash(a), await payloadHash({ ...b, z: [...b.z].reverse().concat([{ question: "Q2", answer: "A2" }]) }));
});

test("clear esplicito: conferma e campi required", () => {
  assert.equal(validateCommand("clear_field", def(), row(), null, { expectedVersion: 1 }).ok, false);
  assert.equal(
    validateCommand("clear_field", def(), row(), null, { expectedVersion: 1, confirm: true }).ok,
    true,
  );
  assert.equal(
    validateCommand("clear_field", def({ required: true }), row(), null, {
      expectedVersion: 1,
      confirm: true,
    }).ok,
    false,
  );
});

test("review legacy: solo su legacy_unverified", () => {
  assert.equal(
    validateCommand("confirm_legacy_value", def(), row(), null, { expectedVersion: 1 }).code,
    "REVIEW_STATE_INVALID",
  );
  const legacy = row({ review_status: "legacy_unverified", publish_blocked: true });
  assert.equal(validateCommand("confirm_legacy_value", def(), legacy, null, { expectedVersion: 1 }).ok, true);
  assert.equal(validateCommand("reject_legacy_value", def(), legacy, null, { expectedVersion: 1 }).ok, true);
});

test("serializzazione errori: codici e HTTP", () => {
  assert.equal(apiError("VERSION_CONFLICT", "x").status, 409);
  assert.equal(apiError("IDEMPOTENCY_CONFLICT", "x").status, 409);
  assert.equal(apiError("WRITES_DISABLED", "x").status, 503);
  assert.equal(apiError("UNAUTHENTICATED", "x").status, 401);
  assert.equal(apiError("FORBIDDEN", "x").status, 403);
  const { body } = apiError("INTERNAL_ERROR", "Errore interno");
  assert.equal(JSON.stringify(body).includes("service_role"), false);
});

test("serializzazione sezioni e riepilogo", () => {
  const sections = serializeSections(
    [def(), def({ key: "seo_title", field_group: "seo", sort_order: 1 })],
    [row(), row({ field_key: "seo_title", review_status: "legacy_unverified", publish_blocked: true, version: 3 })],
    "simple",
    { roles: ["admin"], writesEnabled: true, writeMode: "full" },
    {
      fallbackSnapshot: {
        id: "33333333-3333-3333-3333-333333333333",
        product_id: "22222222-2222-2222-2222-222222222222",
        normalized: { title: "Titolo originale" },
        created_at: "2026-08-17T00:00:00Z",
      },
    },
  );
  assert.deepEqual(sections.map((s) => s.key), ["main", "seo"]);
  assert.equal(sections[0].fields[0].baselineValue, "Titolo originale");
  assert.equal(sections[1].fields[0].publishBlocked, true);

  const summary = serializeProductSummary(
    { id: "p1", sku: "OG_1", entity_type: "simple", parent_product_id: null, updated_at: "x" },
    [row(), row({ field_key: "seo_title", review_status: "legacy_unverified", publish_blocked: true })],
  );
  assert.equal(summary.reviewPendingCount, 1);
  assert.equal(summary.blockedCount, 1);
  assert.equal(summary.contentStatus, "incompleto");
});

test("page size limitata", () => {
  assert.equal(normalizePageSize(500), 50);
  assert.equal(normalizePageSize(undefined), 25);
  assert.equal(normalizePageSize(-3), 25);
  assert.equal(normalizePageSize(10), 10);
});

// F7 — modalità canary: ruoli e allowlist campi.
test("canary: solo admin e tech_admin possono scrivere", () => {
  assert.equal(canWriteCanary(["admin"]), true);
  assert.equal(canWriteCanary(["tech_admin"]), true);
  assert.equal(canWriteCanary(["editor"]), false);
  assert.equal(canWriteCanary(["publisher"]), false);
  assert.equal(canWriteCanary([]), false);
  assert.equal(canManageLockedManualValues(["admin"]), true);
  assert.equal(canManageLockedManualValues(["tech_admin"]), true);
  assert.equal(canManageLockedManualValues(["editor"]), false);
});

test("canary: allowlist campi testuali e manual_only", () => {
  assert.equal(isCanaryField({ key: "title", manual_only: false }), true);
  assert.equal(isCanaryField({ key: "seo_description", manual_only: false }), true);
  assert.equal(isCanaryField({ key: "optimized_description", manual_only: false }), true);
  assert.equal(isCanaryField({ key: "ibridatore", manual_only: true }), true);
  assert.equal(isCanaryField({ key: "price", manual_only: false }), false);
  assert.equal(isCanaryField({ key: "inventory_quantity", manual_only: false }), false);
  assert.equal(isCanaryField({ key: "handle", manual_only: false }), false);
});

test("canary: clear_field non è tra le azioni consentite", () => {
  assert.deepEqual(CANARY_ACTIONS.includes("clear_field"), false);
  assert.deepEqual(CANARY_ACTIONS.includes("update_field"), true);
  assert.deepEqual(CANARY_ACTIONS.includes("confirm_legacy_value"), true);
  assert.deepEqual(CANARY_ACTIONS.includes("reject_legacy_value"), true);
});
