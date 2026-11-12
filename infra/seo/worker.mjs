// Example adapter only; deliberately no wrangler config, route binding or deploy workflow.
import candidates from './redirect-candidates.json' with { type: 'json' };
import { createHandler } from './legacy-redirects.mjs';
export default createHandler(candidates);
