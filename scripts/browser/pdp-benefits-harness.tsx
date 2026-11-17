// Synthetic only, no route in the application build.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {Pdp} from '../../src/components/storefront/Pdp';
import type {ShopifyProduct} from '../../src/lib/shopify';
import '../../src/index.css';
const mode=new URLSearchParams(location.search).get('mode');
const product:ShopifyProduct={node:{id:'gid://shopify/Product/123',title:'Prodotto sintetico',handle:'synthetic-only',description:'Descrizione tecnica sintetica.',priceRange:{minVariantPrice:{amount:'12.50',currencyCode:'EUR'}},images:{edges:[]},variants:{edges:[]},options:[],keyFeatures:{type:'multi_line_text_field',value:'Caratteristica esistente\nVoce comune'},specialBullets:{type:'multi_line_text_field',value:'Punto speciale'},keyBenefits:mode==='absent'?null:{type:'multi_line_text_field',value:mode==='empty'?'':mode==='duplicate'?'Voce comune\nPunto speciale':'Voce comune\nBeneficio & à 🌱\nSecondo beneficio'}}};
createRoot(document.getElementById('root')!).render(<BrowserRouter><Pdp product={product} selectedVariant={null} setSelectedVariant={()=>{}} careInfoContent="Cura sintetica"/></BrowserRouter>);
