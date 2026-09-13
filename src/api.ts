export const apiBase = (import.meta.env.VITE_IMPORT_API_URL || '').replace(/\/$/, '');
const codeKey = 'tisch-family-code';
export function familyCode() { try { return localStorage.getItem(codeKey) || ''; } catch { return ''; } }
export function saveFamilyCode(code: string) { if (code) localStorage.setItem(codeKey, code); else localStorage.removeItem(codeKey); }
export async function api<T>(path: string, body?: unknown, signal?: AbortSignal, code = familyCode()): Promise<T> {
  const response = await fetch(`${apiBase}/api/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'omit', headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(code ? { authorization: `Bearer ${code}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'Die Verbindung ist gerade nicht verfügbar. Bitte erneut versuchen.');
  return payload as T;
}
