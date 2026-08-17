import test from "node:test";
import assert from "node:assert/strict";

import { authorizeAction, isCommandAction, isKnownAction } from "../../supabase/functions/product-admin-api/permissions.ts";
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
    { title: "Titolo originale" },
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
