import { FilterXSS } from 'xss';
const filter = new FilterXSS({ whiteList: { p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [], ul: [], ol: ['start'], li: [], h1: [], h2: [], h3: [], h4: [], h5: [], h6: [], blockquote: [], hr: [], a: ['href', 'title', 'target', 'rel'] }, stripIgnoreTag: true, stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'svg', 'math'], css: false });
export const sanitizeEditorialHtml = (html: string): string => filter.process(html);
