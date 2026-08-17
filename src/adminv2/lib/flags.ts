// F6 — Feature flag tecnici (transizione). Nessun flag abilita scritture:
// lo stato di sola lettura arriva sempre dal server (product-admin-api).
const read = (key: string, fallback: string) =>
  (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ?? fallback;

/** Strumenti e route legacy: visibili solo a tech_admin durante la transizione. */
export const LEGACY_TOOLS_ENABLED = read('VITE_ADMIN_LEGACY_TOOLS', 'true') !== 'false';
