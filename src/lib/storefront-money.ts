/** Shopify amounts stay decimal strings; never infer a currency from the locale. */
export interface StorefrontMoney { amount: string; currencyCode: string }
export interface StorefrontPriceRange {
  minVariantPrice: StorefrontMoney;
  // Optional for cached responses from before this field was requested.
  maxVariantPrice?: StorefrontMoney;
}
const unavailable = 'Prezzo non disponibile';
const decimal = (value: string) => {
  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return { units: BigInt(whole + fraction), scale: fraction.length };
};
const validMoney = (money: StorefrontMoney) => /^[A-Z]{3}$/.test(money.currencyCode) && decimal(money.amount) !== null;

export function formatMoney(money: StorefrontMoney): string {
  if (!validMoney(money)) return unavailable;
  try {
    // ECMA-402 accepts decimal strings without first losing precision in Number().
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: money.currencyCode })
      .format(money.amount as unknown as number);
  } catch { return unavailable; }
}

export function hasPriceRange(range: StorefrontPriceRange): boolean {
  const min = range.minVariantPrice;
  const max = range.maxVariantPrice;
  if (!max || min.currencyCode !== max.currencyCode || !validMoney(min) || !validMoney(max)) return false;
  const low = decimal(min.amount)!;
  const high = decimal(max.amount)!;
  const scale = Math.max(low.scale, high.scale);
  return high.units * 10n ** BigInt(scale - high.scale) > low.units * 10n ** BigInt(scale - low.scale);
}

export function formatProductPrice(range: StorefrontPriceRange): string {
  return `${hasPriceRange(range) ? 'Da ' : ''}${formatMoney(range.minVariantPrice)}`;
}

/** Display subtotals separately when persisted lines contain different currencies. No conversion. */
export function formatCartSubtotal(lines: ReadonlyArray<{ price: StorefrontMoney; quantity: number }>): string {
  if (!lines.length) return '—';
  const totals = new Map<string, { units: bigint; scale: number }>();
  for (const {price, quantity} of lines) {
    if (!validMoney(price) || !Number.isSafeInteger(quantity) || quantity < 1) return unavailable;
    const value = decimal(price.amount)!;
    const previous = totals.get(price.currencyCode) ?? { units: 0n, scale: 0 };
    const scale = Math.max(previous.scale, value.scale);
    totals.set(price.currencyCode, {
      units: previous.units * 10n ** BigInt(scale - previous.scale) + value.units * BigInt(quantity) * 10n ** BigInt(scale - value.scale),
      scale,
    });
  }
  return [...totals].map(([currencyCode, {units, scale}]) => {
    const digits = units.toString().padStart(scale + 1, '0');
    const amount = scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits;
    return formatMoney({ amount, currencyCode });
  }).join(' + ');
}
