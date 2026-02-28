import type { CsvRow, ShopifyCustomerInput, ShopifyProductInput } from '../types/import';
import { sanitizeRow } from './csvValidator';

export function mapToShopifyCustomerInput(row: CsvRow): ShopifyCustomerInput {
  const clean = sanitizeRow(row);
  const customer: ShopifyCustomerInput = {
    email: clean.email?.toLowerCase().trim(),
    first_name: clean.first_name || clean.billing_first_name || '',
    last_name: clean.last_name || clean.billing_last_name || '',
  };
  const phone = clean.billing_phone || clean.phone;
  if (phone) customer.phone = phone;

  const address1 = clean.billing_address_1 || clean.billing_address || clean.address_1;
  const city = clean.billing_city || clean.city;
  const zip = clean.billing_postcode || clean.postcode || clean.zip;
  const country = clean.billing_country || clean.country;
  if (address1 || city || zip || country) {
    customer.addresses = [{ address1, city, zip, country }];
  }
  return customer;
}

export function mapToShopifyProductInput(row: CsvRow): ShopifyProductInput {
  const clean = sanitizeRow(row);
  const title = clean.title || clean.name || clean.post_title || '';
  const product: ShopifyProductInput = { title };

  const desc = clean.description || clean.post_content || clean.short_description || '';
  if (desc) product.body_html = desc;
  if (clean.vendor) product.vendor = clean.vendor;
  if (clean.product_type || clean.type) product.product_type = clean.product_type || clean.type;

  const tags = clean.tags || clean.tag;
  const categories = clean.categories || clean.category;
  const allTags = [tags, categories].filter(Boolean).join(', ');
  if (allTags) product.tags = allTags;

  const price = clean.regular_price || clean.price || '';
  const salePrice = clean.sale_price || '';
  const sku = clean.sku || '';
  const qty = clean.stock_quantity || clean.stock || '';

  if (price || sku) {
    product.variants = [{
      price: price || '0',
      compare_at_price: salePrice && price ? price : undefined,
      sku: sku || undefined,
      inventory_quantity: qty ? parseInt(qty, 10) : undefined,
    }];
    if (salePrice) {
      product.variants[0].price = salePrice;
    }
  }

  const images = clean.images || clean.image;
  if (images) {
    product.images = images.split(/[,|]/).map(url => ({ src: url.trim() })).filter(i => i.src);
  }

  return product;
}
