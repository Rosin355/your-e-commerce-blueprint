const DEFAULT_ADMIN_EMAILS = [
  "admin@onlinegarden.it",
  "info@onlinegarden.it",
  "romesh.singhabahu@gmail.com",
];

function normalizeEmail(value: string | null): string {
  return String(value || "").trim().toLowerCase();
}

function loadAllowedEmails(): Set<string> {
  const configured = Deno.env.get("ADMIN_SYNC_EMAILS");
  const source = configured
    ? configured.split(",").map((entry) => normalizeEmail(entry))
    : DEFAULT_ADMIN_EMAILS;
  return new Set(source.filter(Boolean));
}

export function assertAdminRequest(request: Request): string {
  const adminToken = Deno.env.get("ADMIN_SYNC_TOKEN");
  const tokenHeader = request.headers.get("x-admin-token");

  if (adminToken) {
    if (!tokenHeader || tokenHeader !== adminToken) {
      throw new Error("Unauthorized admin token");
    }
  }

  const email = normalizeEmail(request.headers.get("x-admin-email"));
  const allowedEmails = loadAllowedEmails();

  if (!email || !allowedEmails.has(email)) {
    throw new Error("Unauthorized admin email");
  }

  return email;
}
