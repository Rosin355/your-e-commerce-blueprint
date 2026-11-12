// Intentionally no Shopify client or mutation path. Legacy command is offline-only.
// A future real import requires a separately reviewed implementation and approval.
import { runCustomerPreflight } from './lib/customer-preflight-cli.mjs';
process.exitCode = await runCustomerPreflight();
