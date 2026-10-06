import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DIFFICULTY_OPTIONS,
  deserializeValueForAdminDisplay,
  FieldPolicyError,
  MONTHS,
  deserializeMonthsFromShopify,
  normalizeMonths,
  resolveShopifyTarget,
  sameShopifyValue,
  serializeMonthsForShopify,
  serializeValueForShopify,
  syncStateFromPublishState,
  validateConstrainedFieldValue,
} from "../../supabase/functions/_shared/admin-v2-field-policy.ts";
import {
  buildShopifyWritePlan,
  performVerifiedShopifyFieldWrite,
  readExactMetafieldTarget,
  readExactVariantTarget,
  ShopifyFieldSyncError,
  type ExactShopifyTargetRead,
  type ShopifyGraphQL,
  type ShopifyVariantSnapshot,
} from "../../supabase/functions/_shared/admin-v2-shopify-field-sync.ts";
import { validateValue } from "../../supabase/functions/_shared/admin-v2-validation.ts";
import type { FieldDefinition } from "../../supabase/functions/_shared/admin-v2-types.ts";
import { editorKind, parseFaqValue } from "../../src/adminv2/lib/fieldValueCodecs.ts";

function definition(overrides: Partial<FieldDefinition> = {}): FieldDefinition {
  return {
    key: "periodo_di_fioritura",
    label: "Periodo di fioritura",
    field_group: "botanical",
    editor_type: "multiselect",
    data_type: "array",
    visible: true,
    editable: true,
    ai_allowed: true,
    manual_only: false,
    publishable: true,
    required: false,
    protected_on_reimport: true,
    applies_to: "both",
    sort_order: 1,
    help_text: "Seleziona uno o più mesi.",
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

const exactVariant: ShopifyVariantSnapshot = {
  id: "gid://shopify/ProductVariant/2",
  productId: "gid://shopify/Product/1",
  sku: "OG_1",
  price: "12.00",
  compareAtPrice: "15.00",
  barcode: "123",
};

function variantTargetRead(variant = exactVariant): ExactShopifyTargetRead {
  return { value: variant.price, variant };
}

function expectBlockSync(error: unknown): boolean {
  assert.ok(error instanceof ShopifyFieldSyncError);
  assert.equal(error.code, "BLOCK_SYNC");
  return true;
}

test("month multiselect accetta solo mesi validi e usa ordine canonico", () => {
  assert.deepEqual(normalizeMonths(["Maggio", "Marzo", "Maggio"]), ["Marzo", "Maggio"]);
  assert.equal(MONTHS.length, 12);
  assert.throws(() => normalizeMonths(["Marzo", "Primavera"]), FieldPolicyError);
});

test("serializer mesi e round-trip Shopify sono deterministici", () => {
  const serialized = serializeMonthsForShopify(["Maggio", "Marzo", "Aprile"]);
  assert.equal(serialized, '["Marzo","Aprile","Maggio"]');
  assert.deepEqual(deserializeMonthsFromShopify(serialized), ["Marzo", "Aprile", "Maggio"]);
  assert.equal(serializeMonthsForShopify(deserializeMonthsFromShopify(serialized)), serialized);
});

test("difficoltà usa l'enum verificato e il testo libero non aggira i vincoli", () => {
  assert.deepEqual(DIFFICULTY_OPTIONS, ["Facile", "Media", "Difficile"]);
  assert.equal(validateConstrainedFieldValue("difficolta_di_coltivazione", "Media"), "Media");
  assert.throws(
    () => validateConstrainedFieldValue("difficolta_di_coltivazione", "Esperto"),
    FieldPolicyError,
  );
  assert.throws(
    () => validateConstrainedFieldValue("periodo_di_fioritura", "Marzo, Aprile"),
    FieldPolicyError,
  );
  assert.equal(validateValue(definition(), "Marzo, Aprile").ok, false);
  assert.equal(validateValue(definition(), ["Maggio", "Marzo"]).ok, false);
  assert.equal(validateValue(definition(), ["Marzo", "Maggio"]).ok, true);
});

test("mapping Shopify è derivato dalla definizione server-side e limitato", () => {
  assert.deepEqual(resolveShopifyTarget(definition()), {
    kind: "metafield",
    namespace: "custom",
    key: "periodo_di_fioritura",
    valueType: "list.single_line_text_field",
  });
  assert.equal(resolveShopifyTarget(definition({
    shopify_mapping: { type: "metafield", namespace: "private", key: "admin_override" },
  })), null);
  assert.equal(resolveShopifyTarget(definition({ publishable: false })), null);
});

test("serializer Shopify usa solo il target registrato", () => {
  assert.equal(
    serializeValueForShopify(definition(), ["Aprile", "Marzo"]),
    '["Marzo","Aprile"]',
  );
  assert.deepEqual(
    deserializeValueForAdminDisplay(definition(), '["Marzo","Aprile"]'),
    ["Marzo", "Aprile"],
  );
});

test("stati publish_state hanno una rappresentazione Admin non ambigua", () => {
  assert.equal(syncStateFromPublishState("draft", true), "INTERNAL_ONLY");
  assert.equal(syncStateFromPublishState("pending_publish", true), "PENDING_SYNC");
  assert.equal(syncStateFromPublishState("published", true), "SYNCED");
  assert.equal(syncStateFromPublishState("failed", true), "SYNC_ERROR");
  assert.equal(syncStateFromPublishState("published", false), "INTERNAL_ONLY");
});

test("drift confronta valori canonici e rileva uno stato esterno diverso", () => {
  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  assert.equal(sameShopifyValue(target, '["Marzo","Aprile"]', '["Aprile","Marzo"]'), true);
  assert.equal(sameShopifyValue(target, '["Marzo"]', '["Aprile"]'), false);
});

test("mutation metafield contiene un solo campo e nessun target client arbitrario", () => {
  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  const plan = buildShopifyWritePlan({
    productId: "1",
    target,
    value: '["Marzo"]',
  });
  assert.equal(plan.operation, "metafieldsSet");
  if (plan.operation !== "metafieldsSet") return;
  assert.equal(plan.variables.metafields.length, 1);
  assert.deepEqual(plan.variables.metafields[0], {
    ownerId: "gid://shopify/Product/1",
    namespace: "custom",
    key: "periodo_di_fioritura",
    type: "list.single_line_text_field",
    value: '["Marzo"]',
  });
});

test("mutation core include solo id e singolo attributo", () => {
  const def = definition({
    key: "title",
    data_type: "text",
    editor_type: "text",
    shopify_mapping: { type: "core", field: "title" },
  });
  const target = resolveShopifyTarget(def);
  assert.ok(target);
  const plan = buildShopifyWritePlan({ productId: "1", target, value: "Nuovo" });
  assert.deepEqual(plan, {
    operation: "productUpdate",
    variables: { product: { id: "gid://shopify/Product/1", title: "Nuovo" } },
  });
});

test("variant write richiede una corrispondenza SKU esatta e univoca", () => {
  const def = definition({
    key: "price",
    data_type: "number",
    editor_type: "number",
    shopify_mapping: { type: "variant", field: "price" },
  });
  const target = resolveShopifyTarget(def);
  assert.ok(target);
  const plan = buildShopifyWritePlan({
    productId: "1",
    target,
    value: "13",
    resolvedTarget: variantTargetRead(),
  });
  assert.equal(plan.operation, "productVariantsBulkUpdate");
  assert.throws(
    () => buildShopifyWritePlan({ productId: "1", target, value: "13" }),
    expectBlockSync,
  );
});

test("metafield target oltre i primi 100 usa il lookup singolare esatto", async () => {
  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  let inspectedQuery = "";
  let inspectedVariables: Record<string, unknown> | undefined;
  const graphql: ShopifyGraphQL = async <T>(query: string, variables?: Record<string, unknown>) => {
    inspectedQuery = query;
    inspectedVariables = variables;
    return {
      product: {
        id: "gid://shopify/Product/1",
        metafield: {
          namespace: "custom",
          key: "periodo_di_fioritura",
          type: "list.single_line_text_field",
          value: '["Marzo"]',
        },
      },
    } as T;
  };

  const result = await readExactMetafieldTarget("1", target, graphql);
  assert.equal(result?.value, '["Marzo"]');
  assert.match(inspectedQuery, /metafield\(namespace: \$namespace, key: \$key\)/);
  assert.doesNotMatch(inspectedQuery, /metafields\s*\(\s*first:/);
  assert.deepEqual(inspectedVariables, {
    id: "gid://shopify/Product/1",
    namespace: "custom",
    key: "periodo_di_fioritura",
  });
});

test("metafield esatto assente restituisce null", async () => {
  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  const graphql: ShopifyGraphQL = async <T>() => ({
    product: { id: "gid://shopify/Product/1", metafield: null },
  }) as T;
  assert.equal(await readExactMetafieldTarget("1", target, graphql), null);
});

test("namespace e key client arbitrari non possono raggiungere la lettura Shopify", async () => {
  const maliciousDefinition = definition({
    shopify_mapping: { type: "metafield", namespace: "private", key: "admin_override" },
  });
  assert.equal(resolveShopifyTarget(maliciousDefinition), null);

  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  const variablesSeen: Record<string, unknown>[] = [];
  const graphql: ShopifyGraphQL = async <T>(_query, variables) => {
    variablesSeen.push(variables ?? {});
    return { product: { id: "gid://shopify/Product/1", metafield: null } } as T;
  };
  await readExactMetafieldTarget("1", target, graphql);
  assert.equal(variablesSeen[0].namespace, "custom");
  assert.equal(variablesSeen[0].key, "periodo_di_fioritura");
});

test("SKU oltre la prima pagina di 100 varianti viene risolto esattamente", async () => {
  let call = 0;
  const graphql: ShopifyGraphQL = async <T>(_query, variables) => {
    call += 1;
    if (call === 1) {
      assert.equal(variables?.after, null);
      assert.equal(variables?.query, 'product_id:1 AND sku:"OG_1"');
      return {
        productVariants: {
          pageInfo: { hasNextPage: true, endCursor: "cursor-100" },
          nodes: Array.from({ length: 100 }, (_, index) => ({
            id: `gid://shopify/ProductVariant/${index + 10}`,
            sku: `ALTRO_${index}`,
            price: "1.00",
            compareAtPrice: null,
            barcode: null,
            product: { id: "gid://shopify/Product/1" },
          })),
        },
      } as T;
    }
    assert.equal(variables?.after, "cursor-100");
    return {
      productVariants: {
        pageInfo: { hasNextPage: false, endCursor: null },
        nodes: [{
          id: "gid://shopify/ProductVariant/999",
          sku: "OG_1",
          price: "12.00",
          compareAtPrice: "15.00",
          barcode: "123",
          product: { id: "gid://shopify/Product/1" },
        }],
      },
    } as T;
  };
  const result = await readExactVariantTarget("1", "OG_1", graphql);
  assert.equal(result.id, "gid://shopify/ProductVariant/999");
  assert.equal(call, 2);
});

test("SKU assente blocca la sync", async () => {
  const graphql: ShopifyGraphQL = async <T>() => ({
    productVariants: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [],
    },
  }) as T;
  await assert.rejects(() => readExactVariantTarget("1", "OG_1", graphql), expectBlockSync);
});

test("lookup variante non usa mai la prima variante come fallback", async () => {
  const graphql: ShopifyGraphQL = async <T>() => ({
    productVariants: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [{
        id: "gid://shopify/ProductVariant/first",
        sku: "ALTRO",
        price: "999.00",
        compareAtPrice: null,
        barcode: "wrong",
        product: { id: "gid://shopify/Product/1" },
      }],
    },
  }) as T;
  await assert.rejects(() => readExactVariantTarget("1", "OG_1", graphql), expectBlockSync);
});

test("SKU duplicato blocca la sync", async () => {
  const graphql: ShopifyGraphQL = async <T>() => ({
    productVariants: {
      pageInfo: { hasNextPage: false, endCursor: null },
      nodes: [
        { ...exactVariant, product: { id: exactVariant.productId }, productId: undefined },
        {
          ...exactVariant,
          id: "gid://shopify/ProductVariant/3",
          product: { id: exactVariant.productId },
          productId: undefined,
        },
      ],
    },
  }) as T;
  await assert.rejects(() => readExactVariantTarget("1", "OG_1", graphql), expectBlockSync);
});

test("verifica post-write rilegge lo stesso metafield esatto", async () => {
  const target = resolveShopifyTarget(definition());
  assert.ok(target);
  let value = '["Febbraio"]';
  let exactReads = 0;
  const graphql: ShopifyGraphQL = async <T>(query, variables) => {
    if (query.includes("AdminV2ExactMetafieldTarget")) {
      exactReads += 1;
      assert.equal(variables?.namespace, "custom");
      assert.equal(variables?.key, "periodo_di_fioritura");
      assert.doesNotMatch(query, /metafields\s*\(\s*first:/);
      return {
        product: {
          id: "gid://shopify/Product/1",
          metafield: {
            namespace: "custom",
            key: "periodo_di_fioritura",
            type: "list.single_line_text_field",
            value,
          },
        },
      } as T;
    }
    assert.match(query, /metafieldsSet/);
    value = String((variables?.metafields as Array<{ value: string }>)[0].value);
    return { metafieldsSet: { userErrors: [] } } as T;
  };

  const result = await performVerifiedShopifyFieldWrite({
    productId: "1",
    sku: "OG_1",
    target,
    expected: '["Marzo"]',
    previousVerifiedAt: null,
    previousVerifiedValue: null,
    graphql,
  });
  assert.deepEqual(result, { verifiedValue: '["Marzo"]', writePerformed: true });
  assert.equal(exactReads, 2);
});

test("FAQ resta strutturata e JSON legacy opaco resta read-only", () => {
  assert.equal(parseFaqValue([{ question: "Quando?", answer: "In primavera." }]).kind, "supported");
  assert.equal(parseFaqValue('{"struttura":"ignota"}').kind, "unsupported");
  assert.equal(editorKind({ key: "raw", editorType: "json", dataType: "json", validationRules: {}, required: false }), "unsupported_json");
});

test("select senza tassonomia verificata è read-only, non input libero", () => {
  assert.equal(editorKind({ key: "status", editorType: "select", dataType: "text", validationRules: {}, required: false }), "unsupported_select");
});

test("migration rende il save PENDING_SYNC e la completion verifica la versione", async () => {
  const sql = await readFile(
    new URL("../../supabase/migrations/20261006143000_admin_client_safe_field_sync.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /NEW\.publish_state := 'pending_publish'/);
  assert.match(sql, /v_cur\.version <> p_expected_version/);
  assert.match(sql, /WHEN p_success THEN 'published' ELSE 'failed'/);
  assert.match(sql, /product_admin_command_log/);
});
