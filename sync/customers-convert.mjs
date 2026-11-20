// Replaces the legacy importable CSV exporter with aggregate-only offline review.
import { runCustomerPreflight } from './lib/customer-preflight-cli.mjs';
process.exitCode = await runCustomerPreflight();
