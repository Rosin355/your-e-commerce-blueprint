// Synthetic catalogue only. No customer data or live API access.
export const makeProduct = (id, overrides = {}) => ({ node: {
  id: `gid://shopify/Product/${id}`, handle: `pianta-test-${id}`,
  title: id === 1 ? 'Rosa di prova — balcone e giardino' : `Pianta di prova ${id}`,
  description: 'Prodotto sintetico per verificare il percorso di acquisto. Non in vendita.',
  publishedAt: '2026-01-01T00:00:00Z',
  collections: {edges:[{node:{handle:'rose',title:'Rose'}}]},
  productType: 'Rose', tags: ['giardino'], vendor: 'Vivaio di prova',
  priceRange: { minVariantPrice: { amount: '19.90', currencyCode: 'EUR' } },
  images: { edges: [{ node: { url: '/src/assets/categories/rose.jpg', altText: 'Rosa di prova' } }] },
  variants: { edges: [{ node: {
    id: `gid://shopify/ProductVariant/${id}`, title: 'Vaso 14 cm',
    availableForSale: true, price: { amount: '19.90', currencyCode: 'EUR' },
    selectedOptions: [{ name: 'Formato', value: 'Vaso 14 cm' }],
  } }] },
  options: [{ name: 'Formato', values: ['Vaso 14 cm'] }],
  botanicalName: { value: 'Rosa test' }, commonName: { value: 'Rosa di prova' },
  cultivationDifficulty: { value: 'Media' },
  floweringPeriod: { value: '["maggio","giugno"]' },
  plantingPeriod: { value: '["marzo","aprile"]' },
  productAttributes: { value: JSON.stringify([{ key: 'Esposizione', value: 'Sole (dato sintetico)' }, { key: 'Altezza', value: '60 cm (dato sintetico)' }]) },
  ...overrides,
} });
export const products = Array.from({length: 14}, (_, index) => makeProduct(index + 1));
export async function mockStorefront(context, state = {}) {
  state.checkoutCalls ??= 0;
  state.blocked ??= [];
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/graphql.json')) {
      const { query, variables } = request.postDataJSON();
      if (query.includes('cartCreate')) {
        state.checkoutCalls++;
        state.lines = variables.input.lines;
        if (state.checkoutDelay) await new Promise(r => setTimeout(r, state.checkoutDelay));
        if (state.checkoutError) return route.fulfill({json:{data:{cartCreate:{cart:null,userErrors:[{message:'Quantità non disponibile'}]}}}});
        return route.fulfill({json:{data:{cartCreate:{userErrors:[],cart:{id:'test-cart',checkoutUrl:'https://checkout.example.test/checkouts/test'}}}}});
      }
      if (state.apiError) return route.fulfill({status:503,json:{error:'Synthetic failure'}});
      state.requests ??= [];
      state.requests.push({ query, variables });
      const selection = product => ({node:{
        id:product.node.id,title:product.node.title,handle:product.node.handle,
        availableForSale:product.node.availableForSale ?? product.node.variants.edges.some(edge=>edge.node.availableForSale),
        priceRange:product.node.priceRange,
        images:{edges:product.node.images.edges.slice(0,Number(query.match(/images\(first:\s*(\d+)/)?.[1] ?? 1))},
        options:product.node.options,
        ...(query.includes('description') ? {description:product.node.description} : {}),
        ...(query.includes('productType') ? {productType:product.node.productType} : {}),
        ...(query.includes('tags') ? {tags:product.node.tags} : {}),
        ...(query.includes('vendor') ? {vendor:product.node.vendor} : {}),
        ...(query.includes('publishedAt') ? {publishedAt:product.node.publishedAt} : {}),
        ...(query.includes('collections(') ? {collections:product.node.collections} : {}),
        ...(query.includes('variants(') ? {variants:{edges:product.node.variants.edges.slice(0,Number(query.match(/variants\(first:\s*(\d+)/)?.[1] ?? 1))}} : {}),
      }});
      const variantPage = (product, offset, first) => ({
        edges: product.node.variants.edges.slice(offset, offset + first),
        pageInfo: { hasNextPage: offset + first < product.node.variants.edges.length, endCursor: String(offset + first) },
      });
      if (query.includes('GetProductVariants')) {
        if (state.variantPageError) return route.fulfill({status:503,json:{error:'Synthetic variant-page failure'}});
        const product = (state.products ?? products).find(p => p.node.id === variables.id);
        return route.fulfill({json:{data:{product: product ? {id:product.node.id,variants:variantPage(product,Number(variables.after),100)} : null}}});
      }
      if (query.includes('GetProductByHandle')) {
        const handle = variables.handle;
        if (state.delays?.[handle]) await new Promise(r => setTimeout(r, state.delays[handle]));
        const product = (state.products ?? products).find(p=>p.node.handle===handle);
        return route.fulfill({json:{data:{productByHandle: product ? {...product.node, variants:variantPage(product,0,Number(query.match(/variants\(first:\s*(\d+)/)?.[1] ?? 100))} : null}}});
      }
      if (query.includes('GetCollection')) {
        if (variables.after && state.collectionPageError) return route.fulfill({status:503,json:{error:'Synthetic second-page failure'}});
        const entries=state.products??products;
        const offset=variables.after ? Number(variables.after) : 0;
        const end=offset + variables.first;
        return route.fulfill({json:{data:{collection:variables.handle==='missing'?null:{title:'Rose di prova',description:'Collezione sintetica',handle:variables.handle,products:{edges:entries.slice(offset,end).map(selection),pageInfo:{hasNextPage:end<entries.length,endCursor:String(end)}}}}}});
      }
      for (const [term, delay] of Object.entries(state.catalogDelays ?? {})) {
        if (variables.query?.includes(term)) await new Promise(resolve => setTimeout(resolve, delay));
      }
      if (query.includes('GetProductsPage') && state.catalogPageDelay) await new Promise(resolve=>setTimeout(resolve,state.catalogPageDelay));
      if (variables.after && state.catalogPageError) return route.fulfill({status:503,json:{error:'Synthetic catalog-page failure'}});
      const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      // Fixture evaluator only; does NOT certify Shopify tokenization/accent behavior.
      const terms = [...(variables.query ?? '').matchAll(/title:"((?:\\.|[^"\\])*)"/g)].map(match => JSON.parse('"'+match[1]+'"'));
      const entries = (state.products ?? products).filter(product => terms.every(term => normalize([product.node.title,product.node.vendor,product.node.productType,...(product.node.tags??[])].join(' ')).includes(normalize(term))));
      const offset = Number(variables.after ?? 0);
      const end = offset + variables.first;
      return route.fulfill({json:{data:{products:{edges:entries.slice(offset,end).map(selection),pageInfo:{hasNextPage:end<entries.length,endCursor:String(end)}}}}});
    }
    if (url.hostname === 'checkout.example.test') return route.fulfill({contentType:'text/html',body:'<h1>Checkout simulato</h1>'});
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    // External calls (including Supabase and fonts) cannot reach live systems.
    state.blocked.push(url.hostname);
    return route.fulfill({status:200,contentType:'application/json',body:'{}'});
  });
}
