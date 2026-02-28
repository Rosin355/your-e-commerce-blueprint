import type { ParsedCsv, ValidationResult, ValidationError, ImportType } from '../types/import';

const SENSITIVE_FIELDS = ['password', 'user_pass', 'session_token', 'session_tokens', 'wp_capabilities'];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isNumeric(val: string): boolean {
  return val !== '' && !isNaN(Number(val));
}

const CUSTOMER_REQUIRED = ['email'];
const PRODUCT_REQUIRED_OPTIONS = [['title'], ['name'], ['post_title']];

export function validateCsv(csv: ParsedCsv, type: ImportType): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Check for sensitive fields
  const sensitiveFound = csv.headers.filter(h => SENSITIVE_FIELDS.includes(h));
  if (sensitiveFound.length > 0) {
    warnings.push(`Campi sensibili trovati e ignorati: ${sensitiveFound.join(', ')}`);
  }

  if (type === 'customers') {
    if (!csv.headers.includes('email')) {
      errors.push({ row: 0, field: 'email', message: 'Colonna "email" mancante nel CSV' });
      return { valid: false, errors, warnings, validRowCount: 0, invalidRowCount: csv.rows.length };
    }
    csv.rows.forEach((row, i) => {
      if (!row.email || !isValidEmail(row.email)) {
        errors.push({ row: i + 2, field: 'email', message: `Email non valida: "${row.email || ''}"` });
      }
    });
  }

  if (type === 'products') {
    const hasTitleCol = PRODUCT_REQUIRED_OPTIONS.some(opts => opts.some(o => csv.headers.includes(o)));
    if (!hasTitleCol) {
      errors.push({ row: 0, field: 'title', message: 'Colonna "title" o "name" mancante nel CSV' });
      return { valid: false, errors, warnings, validRowCount: 0, invalidRowCount: csv.rows.length };
    }
    const titleKey = csv.headers.find(h => ['title', 'name', 'post_title'].includes(h)) || 'title';
    const priceKey = csv.headers.find(h => ['regular_price', 'price'].includes(h));

    csv.rows.forEach((row, i) => {
      if (!row[titleKey]?.trim()) {
        errors.push({ row: i + 2, field: titleKey, message: 'Titolo prodotto mancante' });
      }
      if (priceKey && row[priceKey] && !isNumeric(row[priceKey])) {
        errors.push({ row: i + 2, field: priceKey, message: `Prezzo non numerico: "${row[priceKey]}"` });
      }
    });
  }

  const invalidRows = new Set(errors.map(e => e.row));
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    validRowCount: csv.rows.length - invalidRows.size,
    invalidRowCount: invalidRows.size,
  };
}

export function sanitizeRow(row: Record<string, string>): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    if (SENSITIVE_FIELDS.includes(key)) continue;
    clean[key] = value;
  }
  return clean;
}
