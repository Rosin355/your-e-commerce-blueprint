const ADMIN_EMAILS = [
  'admin@onlinegarden.it',
  'info@onlinegarden.it',
];

const SESSION_KEY = 'admin_session';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

interface AdminSession {
  email: string;
  expiresAt: number;
}

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

export function loginAdmin(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  if (!isAdminEmail(normalized)) return false;
  const session: AdminSession = {
    email: normalized,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return true;
}

export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function logoutAdmin(): void {
  localStorage.removeItem(SESSION_KEY);
}
