import test from 'node:test';
import assert from 'node:assert/strict';
import {formatMoney, formatProductPrice, hasPriceRange, formatCartSubtotal} from '../../src/lib/storefront-money';
const money=(amount:string,currencyCode='EUR')=>({amount,currencyCode});
const compact=(value:string)=>value.replace(/\s/g,' ');
test('Shopify currency drives EUR, USD and JPY formatting and fraction digits',()=>{
 assert.equal(compact(formatMoney(money('19.90'))),'19,90 €');
 assert.equal(compact(formatMoney(money('19.90','USD'))),'19,90 USD');
 assert.equal(compact(formatMoney(money('19000','JPY'))),'19.000 JPY');
 assert.equal(formatMoney(money('bad')),'Prezzo non disponibile');
 assert.equal(formatMoney(money('19.90','')),'Prezzo non disponibile');
});
test('Da requires a verified same-currency minimum/maximum interval, not variant counts',()=>{
 for(const max of [undefined,money('19.900'),money('18.00'),money('29.90','USD'),money('bad')]) {
  const range={minVariantPrice:money('19.90'),maxVariantPrice:max};
  assert.equal(hasPriceRange(range),false);assert.ok(!formatProductPrice(range).startsWith('Da '));
 }
 const range={minVariantPrice:money('19.9'),maxVariantPrice:money('29.90')};
 assert.equal(hasPriceRange(range),true);assert.equal(compact(formatProductPrice(range)),'Da 19,90 €');
 assert.equal(hasPriceRange({minVariantPrice:money('9007199254740992.01'),maxVariantPrice:money('9007199254740992.02')}),true);
});
test('Cart subtotal uses exact decimal sums, quantities and separate currencies',()=>{
 assert.equal(compact(formatCartSubtotal([{price:money('0.1'),quantity:3},{price:money('0.20'),quantity:1}])),'0,50 €');
 assert.equal(compact(formatCartSubtotal([{price:money('19.90'),quantity:2},{price:money('7','USD'),quantity:1}])),'39,80 € + 7,00 USD');
 assert.equal(formatCartSubtotal([]),'—');
 assert.equal(formatCartSubtotal([{price:money('19.90'),quantity:NaN}]),'Prezzo non disponibile');
});
