import { authorized, jsonResponse, readLimited, type AIEnv } from './ai-server';
import { validateBackup } from './domain';

export type StoredObject = { etag: string; text: () => Promise<string> };
export type FamilyEnv = AIEnv & {
  TISCH_SETUP_TOKEN?: string; TISCH_CONFIG_ENCRYPTION_KEY?: string;
  BUCKET?: { get: (key: string) => Promise<StoredObject | null>; head: (key: string) => Promise<{ etag: string } | null>; put: (key: string, value: string, options?: { onlyIf: { etagMatches?: string; etagDoesNotMatch?: string }; httpMetadata?: { contentType: string } }) => Promise<{ etag: string } | null> };
};
const configPath = 'private/config-v1.json';
const cookbookPath = 'private/family-cookbook-v1.json';
const toHex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2,'0')).join('');
const fromHex = (value: string) => Uint8Array.from(value.match(/.{2}/g) || [], x => parseInt(x,16));
async function configKey(env: FamilyEnv) {
  if (!env.TISCH_CONFIG_ENCRYPTION_KEY || !/^[a-f0-9]{64}$/.test(env.TISCH_CONFIG_ENCRYPTION_KEY)) throw new Error('Die Einrichtung ist noch nicht vorbereitet.');
  return crypto.subtle.importKey('raw', fromHex(env.TISCH_CONFIG_ENCRYPTION_KEY), 'AES-GCM', false, ['encrypt','decrypt']);
}
export async function resolveFamilyEnv(env: FamilyEnv): Promise<FamilyEnv> {
  if (env.OPENROUTER_API_KEY && env.TISCH_ACCESS_KEY) return env;
  const object = await env.BUCKET?.get(configPath); if (!object) return env;
  const { iv, data } = JSON.parse(await object.text()) as { iv: string; data: string };
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromHex(iv) }, await configKey(env), fromHex(data));
  const config = JSON.parse(new TextDecoder().decode(bytes)) as AIEnv;
  return { ...env, OPENROUTER_API_KEY: config.OPENROUTER_API_KEY, TISCH_ACCESS_KEY: config.TISCH_ACCESS_KEY };
}
export async function setupFamily(request: Request, env: FamilyEnv) {
  if (!env.BUCKET || !env.TISCH_SETUP_TOKEN || !await authorized(request, { TISCH_ACCESS_KEY: env.TISCH_SETUP_TOKEN })) return jsonResponse({ error: 'Bitte den privaten Einrichtungslink aus deinem Chat öffnen.' },401);
  if (request.method === 'GET') return jsonResponse({ configured: !!await env.BUCKET.head(configPath) });
  if (request.method !== 'POST') return jsonResponse({ error: 'Bitte die Einrichtung ausfüllen.' },405);
  try {
    if (await env.BUCKET.head(configPath)) return jsonResponse({ error: 'Die Familie ist bereits eingerichtet. Bitte mit eurem Familiencode verbinden.' },409);
    const raw = await readLimited(request,10000) as { apiKey?: unknown; familyCode?: unknown };
    if (typeof raw.apiKey !== 'string' || !/^sk-or-[a-zA-Z0-9_-]{20,240}$/.test(raw.apiKey.trim())) throw new Error('Bitte einen gültigen OpenRouter-API-Schlüssel eintragen.');
    if (typeof raw.familyCode !== 'string' || raw.familyCode.trim().length < 16 || raw.familyCode.length > 200) throw new Error('Der Familiencode braucht mindestens 16 Zeichen.');
    const keyResponse = await fetch('https://openrouter.ai/api/v1/key', { headers: { authorization: `Bearer ${raw.apiKey.trim()}` }, signal: AbortSignal.timeout(15000) });
    if (!keyResponse.ok) throw new Error('OpenRouter konnte den Schlüssel nicht bestätigen. Bitte im OpenRouter-Konto prüfen.');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const bytes = new TextEncoder().encode(JSON.stringify({ OPENROUTER_API_KEY: raw.apiKey.trim(), TISCH_ACCESS_KEY: raw.familyCode.trim() }));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await configKey(env), bytes);
    const saved = await env.BUCKET.put(configPath, JSON.stringify({ iv: toHex(iv), data: toHex(new Uint8Array(encrypted)) }), { onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: 'application/json' } });
    if (!saved) return jsonResponse({ error: 'Die Familie wurde gerade bereits eingerichtet. Bitte mit eurem Familiencode verbinden.' },409);
    return jsonResponse({ ready: true });
  } catch (e) { return jsonResponse({ error: e instanceof Error ? e.message : 'Die Einrichtung konnte nicht gespeichert werden.' },422); }
}
export async function handleFamily(request: Request, env: FamilyEnv, statusOnly = false) {
  if (!await authorized(request, env)) return jsonResponse({ error: 'Bitte euren Familiencode prüfen und erneut verbinden.' },401);
  if (!env.BUCKET) return jsonResponse({ error: 'Die gemeinsame Speicherung ist noch nicht bereit.' },503);
  try {
    if (statusOnly && request.method === 'GET') { const object = await env.BUCKET.head(cookbookPath); return jsonResponse({ etag: object?.etag || null, aiReady: !!env.OPENROUTER_API_KEY }); }
    if (request.method === 'GET') { const object = await env.BUCKET.get(cookbookPath); return jsonResponse({ etag: object?.etag || null, data: object ? JSON.parse(await object.text()) : null }); }
    if (request.method !== 'POST') return jsonResponse({ error: 'Methode nicht unterstützt.' },405);
    const body = await readLimited(request, 15_500_000) as { data: unknown; etag: unknown };
    if (!(body.etag === null || typeof body.etag === 'string' && /^[a-f0-9-]{1,100}$/i.test(body.etag))) throw new Error('Bitte zuerst den aktuellen Familienstand laden.');
    const data = validateBackup(body.data);
    const serialized = JSON.stringify(data);
    if (new TextEncoder().encode(serialized).length > 15_000_000) throw new Error('Das gemeinsame Kochbuch ist grösser als 15 MB. Bitte grosse Fotos verkleinern und vorher eine Sicherung herunterladen.');
    const saved = await env.BUCKET.put(cookbookPath, serialized, { onlyIf: body.etag === null ? { etagDoesNotMatch: '*' } : { etagMatches: body.etag as string }, httpMetadata: { contentType: 'application/json' } });
    if (!saved) return jsonResponse({ error: 'Auf einem anderen Gerät gibt es Änderungen. Bitte zuerst den aktuellen Stand abgleichen.', conflict: true },409);
    return jsonResponse({ etag: saved.etag });
  } catch (e) { return jsonResponse({ error: e instanceof Error ? e.message : 'Der Familienstand konnte nicht gespeichert werden.' },422); }
}
