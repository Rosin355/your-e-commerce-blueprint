import fs from "node:fs";
import path from "node:path";

export function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

function stripBom(input) {
  return input.replace(/^\uFEFF/, "");
}

export function parseCsv(csvText) {
  const text = stripBom(String(csvText || ""));
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);
  return rows;
}

export function readCsvHeaders(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(raw);
  if (!rows.length) return [];
  return rows[0].map((h) => String(h || "").trim());
}

export function readCsvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const rows = parseCsv(raw);
  if (rows.length <= 1) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((csvRow, idx) => {
    const row = { __rowNumber: idx + 2 };
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = String(csvRow[i] || "");
    }
    return row;
  });
}

function toCsvCell(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function writeCsvFile(filePath, rows, headers) {
  const out = [];
  out.push(headers.map(toCsvCell).join(","));
  for (const row of rows) {
    out.push(headers.map((h) => toCsvCell(row?.[h] ?? "")).join(","));
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${out.join("\n")}\n`, "utf8");
}

export function writeJsonFile(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export function nowIso() {
  return new Date().toISOString();
}

// backward-compatible helpers used by older scripts
export function loadCsv(filePath) {
  return { headers: readCsvHeaders(filePath), rows: readCsvFile(filePath) };
}

export function writeCsv(filePath, headers, rows) {
  return writeCsvFile(filePath, rows, headers);
}

export function writeJson(filePath, payload) {
  return writeJsonFile(filePath, payload);
}
