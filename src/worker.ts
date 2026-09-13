import { parseHTML } from 'linkedom';
import type { Ingredient, Recipe } from './types';
import { parseIngredient } from './domain';

type Env = { ASSETS?: { fetch: (request: Request) => Promise<Response> } };
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const htmlLimit = 1_600_000;
const imageLimit = 4_500_000;
const badHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
}

function clean(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(stringList);
  const text = clean(value, 2000);
  return text ? [text] : [];
}

function typeIncludes(value: unknown, type: string): boolean {
  return Array.isArray(value) ? value.some(v => typeIncludes(v, type)) : typeof value === 'string' && value.toLowerCase() === type.toLowerCase();
}

function graphItems(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== 'object') return [];
  const item = value as Record<string, unknown>;
  const own = typeIncludes(item['@type'], 'Recipe') ? [item] : [];
  const graph = Array.isArray(item['@graph']) ? item['@graph'].flatMap(graphItems) : [];
  return [...own, ...graph];
}

function parseDuration(value: unknown): number | null {
  const text = clean(value, 80);
  const iso = text.match(/^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso) return (Number(iso[1] || 0) * 60) + Number(iso[2] || 0) || null;
  const plain = text.match(/(\d+)\s*(?:min|minute|minutes|minuten)/i);
  return plain ? Number(plain[1]) : null;
}

function parseYield(value: unknown): { servings: number; note?: string } {
  const text = stringList(value).join(' ');
  const match = text.match(/(\d{1,3})/);
  const servings = match ? Math.min(100, Math.max(1, Number(match[1]))) : 2;
  return { servings, note: match ? undefined : 'Die Webseite nennt keine eindeutige Portionszahl. Bitte beim Übernehmen prüfen; vorläufig sind 2 eingetragen.' };
}

function parseInstructions(value: unknown): string[] {
  if (typeof value === 'string') return value.split(/\r?\n|(?<=\.)\s+(?=\d|[A-ZÄÖÜ])/).map(s => clean(s, 3000)).filter(Boolean);
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') result.push(clean(item, 3000));
    else if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj.itemListElement)) result.push(...parseInstructions(obj.itemListElement));
      else result.push(clean(obj.text || obj.name, 3000));
    }
  }
  return result.filter(Boolean);
}

function imageUrl(value: unknown, base: URL): string {
  const candidates = Array.isArray(value) ? value : [value];
  for (const item of candidates) {
    const raw = typeof item === 'string' ? item : item && typeof item === 'object' ? (item as Record<string, unknown>).url || (item as Record<string, unknown>).contentUrl : '';
    const text = clean(raw, 2000);
    if (!text) continue;
    try {
      const url = new URL(text, base);
      if (url.protocol === 'https:') return url.href;
    } catch { /* ignore malformed image URLs */ }
  }
  return '';
}

function tagsFrom(value: unknown): string[] {
  const raw = [...stringList(value).flatMap(v => v.split(/[,;]/)), ...stringList((value as Record<string, unknown> | null)?.['@type'])];
  const tags = raw.map(t => clean(t, 80)).filter(t => t && !/^recipe$/i.test(t));
  return [...new Set(tags)].slice(0, 20);
}

function assertPublicUrl(input: string): URL {
  const url = new URL(input);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Bitte einen normalen Webseitenlink mit http oder https einfügen.');
  if (url.username || url.password) throw new Error('Links mit Zugangsdaten können nicht importiert werden.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Links mit Sonder-Port können nicht importiert werden.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes('.') || badHostnames.has(host) || /^10\.|^127\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(host)) throw new Error('Dieser Link ist nicht öffentlich abrufbar.');
  return url;
}

async function fetchText(url: URL): Promise<{ url: URL; text: string }> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(current, { redirect: 'manual', headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'Tisch-und-Tag-Rezeptimport/1.0' }, signal: AbortSignal.timeout(12000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Die Webseite leitet ungültig weiter.');
      current = assertPublicUrl(new URL(location, current).href);
      continue;
    }
    if (!response.ok) throw new Error('Die Rezeptseite konnte nicht geöffnet werden.');
    const type = response.headers.get('content-type') || '';
    if (!/html|xml/i.test(type)) throw new Error('Der Link sieht nicht wie eine Rezept-Webseite aus.');
    const reader = response.body?.getReader();
    if (!reader) return { url: current, text: await response.text() };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > htmlLimit) throw new Error('Die Webseite ist zu gross für den schnellen Import.');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { url: current, text: new TextDecoder().decode(bytes) };
  }
  throw new Error('Die Webseite leitet zu oft weiter.');
}

function parseRecipe(html: string, pageUrl: URL): { recipe: Recipe; imageUrl: string } {
  const { document } = parseHTML(html);
  const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
  const recipes: Record<string, unknown>[] = [];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || 'null') as Json;
      recipes.push(...(Array.isArray(parsed) ? parsed.flatMap(graphItems) : graphItems(parsed)));
    } catch { /* ignore broken JSON-LD blocks */ }
  }
  const data = recipes[0];
  if (!data) throw new Error('Ich habe auf dieser Seite kein strukturiertes Rezept gefunden.');
  const title = clean(data.name, 150) || clean(document.querySelector('h1')?.textContent, 150);
  if (!title) throw new Error('Das Rezept hat keinen erkennbaren Titel.');
  const ingredients: Ingredient[] = stringList(data.recipeIngredient).map(parseIngredient).slice(0, 300);
  const steps = parseInstructions(data.recipeInstructions).slice(0, 300);
  if (!ingredients.length && !steps.length) throw new Error('Ich konnte weder Zutaten noch Zubereitung sicher erkennen.');
  const y = parseYield(data.recipeYield || data.yield);
  const image = imageUrl(data.image, pageUrl);
  const site = clean(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content'), 120) || pageUrl.hostname.replace(/^www\./, '');
  const recipe: Recipe = {
    id: crypto.randomUUID(), title,
    description: clean(data.description, 500) || `Importiert von ${site}`,
    servings: y.servings, servingsNote: y.note,
    minutes: parseDuration(data.totalTime) ?? ((parseDuration(data.prepTime) || 0) + (parseDuration(data.cookTime) || 0) || null),
    ingredients, steps, image: '', photos: [],
    source: `${site} · per Link importiert`, sourceUrl: pageUrl.href,
    favorite: false, sample: false,
    tags: tagsFrom(data.keywords || data.recipeCategory || data.recipeCuisine),
    createdAt: new Date().toISOString(),
  };
  return { recipe, imageUrl: image };
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function fetchImageDataUrl(raw: string, base: URL): Promise<string> {
  if (!raw) return '';
  const url = assertPublicUrl(new URL(raw, base).href);
  if (url.protocol !== 'https:') return '';
  const response = await fetch(url, { redirect: 'follow', headers: { accept: 'image/avif,image/webp,image/png,image/jpeg' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) return '';
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return '';
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > imageLimit) return '';
  return `data:${type};base64,${toBase64(bytes)}`;
}

async function importRecipe(request: Request) {
  let body: { url?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'Bitte einen Rezeptlink einfügen.' }, 400); }
  try {
    const input = clean(body.url, 2000);
    const initialUrl = assertPublicUrl(input);
    const { url, text } = await fetchText(initialUrl);
    const { recipe, imageUrl: rawImage } = parseRecipe(text, url);
    recipe.image = await fetchImageDataUrl(rawImage, url);
    if (rawImage && !recipe.image) recipe.imageNote = 'Das Originalbild konnte nicht dauerhaft gespeichert werden. Du kannst später ein eigenes Bild hinzufügen.';
    return json({ recipe });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Der Link konnte nicht importiert werden.' }, 422);
  }
}

async function serveAsset(request: Request, env: Env): Promise<Response> {
  if (!env.ASSETS) return new Response('Assets unavailable', { status: 503 });
  const url = new URL(request.url);
  let response = await env.ASSETS.fetch(request);
  if (response.status !== 404 || /\.[a-z0-9]{2,8}$/i.test(url.pathname)) return response;
  response = await env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  return response.status === 404 ? await env.ASSETS.fetch(new Request(new URL('/client/index.html', url), request)) : response;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/import-recipe' && request.method === 'POST') return importRecipe(request);
    if (url.pathname.startsWith('/api/')) return json({ error: 'Nicht gefunden.' }, 404);
    return serveAsset(request, env);
  },
};

export const __test = { parseRecipe, assertPublicUrl };
