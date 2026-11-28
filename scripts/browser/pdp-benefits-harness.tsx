// Synthetic only, no route in the application build.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {Pdp} from '../../src/components/storefront/Pdp';
import type {ShopifyProduct} from '../../src/lib/shopify';
import '../../src/index.css';
const mode=new URLSearchParams(location.search).get('mode');
const product:ShopifyProduct={node:{id:'gid://shopify/Product/123',title:'Prodotto sintetico',handle:'synthetic-only',description:'Descrizione tecnica sintetica.',shortIntro:{type:'multi_line_text_field',value:'Sintesi distinta.'},priceRange:{minVariantPrice:{amount:'12.50',currencyCode:'EUR'}},images:{edges:[]},variants:{edges:[]},options:[],keyFeatures:{type:'multi_line_text_field',value:'Caratteristica esistente\nVoce comune'},specialBullets:{type:'multi_line_text_field',value:'Punto speciale'},keyBenefits:mode==='absent'?null:{type:'multi_line_text_field',value:mode==='empty'?'':mode==='duplicate'?'Voce comune\nPunto speciale':'Voce comune\nBeneficio & à 🌱\nSecondo beneficio'}}};
if (mode === 'json' || mode === 'list.single_line_text_field') {
  product.node.keyFeatures = {type:mode, value:JSON.stringify(['Caratteristica esistente','Voce comune'])};
  product.node.keyBenefits = {type:mode, value:JSON.stringify(['Voce comune','Beneficio distinto','Secondo beneficio'])};
}
createRoot(document.getElementById('root')!).render(<BrowserRouter><Pdp product={product} selectedVariant={null} setSelectedVariant={()=>{}} careInfoContent="Cura sintetica"/></BrowserRouter>);
