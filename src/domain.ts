import type { AppData, Ingredient, Recipe, ShoppingItem } from './types';

const fractions: Record<string, string> = { '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3', '⅛': '1/8' };
const unitAliases: Record<string, string> = { gramm: 'g', kilogramm: 'kg', liter: 'l', milliliter: 'ml', teelöffel: 'TL', tl: 'TL', esslöffel: 'EL', el: 'EL', stück: 'Stück', st: 'Stück', stk: 'Stück', dose: 'Dose', dosen: 'Dose', bund: 'Bund', packung: 'Packung', packungen: 'Packung', prise: 'Prise', prisen: 'Prise', zehe: 'Zehe', zehen: 'Zehe', tasse: 'Tasse', tassen: 'Tasse' };
export const uid = () => crypto.randomUUID();

export function parseAmount(value: string): number | null {
  const parts = value.trim().replace(',', '.').split(/\s+/);
  let total = 0;
  for (const p of parts) {
    const pair = p.split('/').map(Number);
    const n = pair.length === 2 ? pair[0] / pair[1] : pair[0];
    if (!Number.isFinite(n) || n < 0 || pair.length > 2) return null;
    total += n;
  }
  return total;
}

export function parseIngredient(input: string): Ingredient {
  const line = input.replace(/^\s*[-•*]\s*/, '').trim();
  const normalized = line.replace(/(\d)([½¼¾⅓⅔⅛])/g, '$1 $2').replace(/[½¼¾⅓⅔⅛]/g, x => fractions[x]);
  // Ranges and approximate quantities stay intact instead of becoming a false exact sum.
  if (/^(?:ca\.?|etwa|circa)|^\d+(?:[.,]\d+)?\s*(?:[-–]|bis)\s*\d/i.test(normalized)) return { amount: null, unit: '', name: line };
  const match = normalized.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)\s*([\s\S]*)$/);
  if (!match || !match[2].trim()) return { amount: null, unit: '', name: line };
  const rest = match[2].trim();
  const unitMatch = rest.match(/^(kg|g|ml|l|gramm|kilogramm|milliliter|liter|tl|el|teelöffel|esslöffel|stück|stk\.?|st\.?|dosen?|bund|packungen?|prisen?|zehen?|tassen?)\s+(.+)$/i);
  const rawUnit = unitMatch?.[1].toLowerCase().replace('.', '') || '';
  return { amount: parseAmount(match[1]), unit: unitAliases[rawUnit] || rawUnit, name: unitMatch ? unitMatch[2].trim() : rest };
}

export function formatAmount(amount: number | null): string {
  return amount === null ? '' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(amount);
}
export function ingredientText(i: Ingredient, factor = 1): string {
  return [formatAmount(i.amount === null ? null : i.amount * factor), i.unit, i.name].filter(Boolean).join(' ');
}

export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function monday(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return localDate(d);
}
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); return localDate(d);
}
export function weekDates(week: string): string[] { return Array.from({ length: 7 }, (_, i) => addDays(week, i)); }
export function weekLabel(week: string): string {
  const f = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return `${f(week)} – ${f(addDays(week, 6))}`;
}

function category(name: string): string {
  if (/tomat|gurk|zucchini|spinat|brokkoli|paprika|zwiebel|knoblauch|karotte|möhre|zitrone|limette|avocado|salat|apfel|äpfel|banane|beere|pilz|kartoffel|petersilie|basilikum|minze|rucola|lauch/i.test(name)) return 'Obst & Gemüse';
  if (/joghurt|quark|milch|feta|käse|butter|sahne|parmesan|tofu|^eier?$|ei\b/i.test(name)) return 'Kühlregal';
  if (/reis|nudel|pasta|kichererbse|linse|bohne|öl|salz|pfeffer|mehl|hafer|couscous|bulgur|quinoa|honig|essig|nuss|nüsse|mandel|brühe/i.test(name)) return 'Vorrat & Gewürze';
  return 'Sonstiges';
}

export function shoppingList(data: AppData, week: string): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const day of weekDates(week)) for (const entry of data.plan[day] || []) {
    const recipe = data.recipes.find(r => r.id === entry.recipeId);
    if (!recipe) continue;
    for (const ingredient of recipe.ingredients) {
      let { amount, unit } = ingredient;
      if (amount !== null) amount *= entry.servings / recipe.servings;
      if (unit === 'kg') { unit = 'g'; if (amount !== null) amount *= 1000; }
      if (unit === 'l') { unit = 'ml'; if (amount !== null) amount *= 1000; }
      const normalizedName = ingredient.name.trim().toLocaleLowerCase('de').replace(/\s+/g, ' ');
      const key = `${normalizedName}|${unit}|${amount === null ? 'unbestimmt' : 'menge'}`;
      const existing = map.get(key);
      if (existing) {
        if (amount !== null && existing.amount !== null) existing.amount += amount;
        if (!existing.recipeTitles.includes(recipe.title)) existing.recipeTitles.push(recipe.title);
      } else map.set(key, { ...ingredient, amount, unit, key, category: category(ingredient.name), recipeTitles: [recipe.title] });
    }
  }
  for (const e of data.extras.filter(x => x.week === week)) map.set(`extra:${e.id}`, { key: `extra:${e.id}`, name: e.name, amount: null, unit: '', category: category(e.name), recipeTitles: [], extraId: e.id });
  const order = ['Obst & Gemüse', 'Kühlregal', 'Vorrat & Gewürze', 'Sonstiges'];
  return [...map.values()].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name, 'de'));
}
export function shoppingSignature(i: ShoppingItem): string { return `${i.amount === null ? '?' : Math.round(i.amount * 10000) / 10000}|${i.unit}`; }
export function isChecked(data: AppData, week: string, i: ShoppingItem) { return data.checked[`${week}|${i.key}`] === shoppingSignature(i); }
export function safeUrl(value: string): string {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function blankRecipe(): Recipe {
  return { id: uid(), title: '', description: '', servings: 2, minutes: null, ingredients: [], steps: [], image: '', photos: [], source: '', sourceUrl: '', favorite: false, sample: false, tags: [], createdAt: new Date().toISOString() };
}

export function parseRecipeText(text: string): Partial<Recipe> {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const ingredients: Ingredient[] = [], steps: string[] = [];
  let mode = 'intro'; let title = ''; let servings = 2; let minutes: number | null = null;
  for (const raw of lines) {
    const line = raw.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '');
    if (/^(?:zutaten|ingredients)\b/i.test(line)) { mode = 'ingredients'; const s = line.match(/(\d+)\s*(?:portion|person)/i); if (s) servings = Number(s[1]); continue; }
    if (/^(?:zubereitung|anleitung|schritte|instructions|directions|methode)\s*[:：]?$/i.test(line)) { mode = 'steps'; continue; }
    const portion = line.match(/^(?:für\s+)?(\d+)\s*(?:portionen?|personen?|servings?)|^(?:portionen?|personen?|servings?)\s*:\s*(\d+)/i);
    if (portion) { servings = Number(portion[1] || portion[2]); continue; }
    const timing = line.match(/^(?:(?:gesamtzeit|zubereitungszeit|zeit|dauer)\s*:\s*)?(\d+)\s*(?:minuten|min\.?)$/i);
    if (timing) { minutes = Number(timing[1]); continue; }
    if (!title && mode === 'intro') { title = line; continue; }
    if (mode === 'ingredients') ingredients.push(parseIngredient(line));
    else steps.push(line.replace(/^\d+[.)]\s*/, ''));
  }
  return { title: title.slice(0, 150), ingredients, steps, servings: Math.min(100, Math.max(1, servings)), minutes };
}

export function validateBackup(input: unknown): AppData {
  const fail = () => { throw new Error('Diese Datei ist keine gültige Tisch-&-Tag-Sicherung. Deine Daten wurden nicht verändert.'); };
  if (!input || typeof input !== 'object') return fail();
  const d = input as AppData;
  const str = (x: unknown, max = 10000) => typeof x === 'string' && x.length <= max;
  const num = (x: unknown, max = 1000000) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
  if (d.version !== 1 || !Array.isArray(d.recipes) || d.recipes.length > 5000 || !d.plan || typeof d.plan !== 'object' || Array.isArray(d.plan) || !d.checked || typeof d.checked !== 'object' || Array.isArray(d.checked) || !Array.isArray(d.extras)) return fail();
  const ids = new Set<string>();
  for (const r of d.recipes) {
    if (!r || !str(r.id, 100) || ids.has(r.id) || !str(r.title, 150) || !r.title.trim() || !str(r.description) || !num(r.servings, 100) || r.servings < 1 || !Number.isInteger(r.servings) || !(r.minutes === null || num(r.minutes, 1440)) || !str(r.source) || !str(r.sourceUrl) || typeof r.favorite !== 'boolean' || typeof r.sample !== 'boolean' || !str(r.createdAt, 50)) return fail();
    if (r.imageNote !== undefined && !str(r.imageNote, 1000) || r.servingsNote !== undefined && !str(r.servingsNote, 1000)) return fail();
    if (r.kcalPerServing !== undefined && r.kcalPerServing !== null && !num(r.kcalPerServing, 10000) || r.nutritionNote !== undefined && !str(r.nutritionNote, 1000)) return fail();
    ids.add(r.id);
    if (!Array.isArray(r.ingredients) || r.ingredients.length > 300 || r.ingredients.some(i => !i || !str(i.name, 500) || !str(i.unit, 30) || !(i.amount === null || num(i.amount)))) return fail();
    if (!Array.isArray(r.steps) || r.steps.length > 300 || !r.steps.every(x => str(x)) || !Array.isArray(r.tags) || !r.tags.every(x => str(x, 100))) return fail();
    const img = (x: unknown) => str(x, 12_000_000) && (x === '' || /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(x as string) || /^images\/[a-z0-9-]+\.(webp|jpg|svg)$/.test(x as string));
    if (!img(r.image) || !Array.isArray(r.photos) || r.photos.length > 6 || !r.photos.every(img)) return fail();
  }
  for (const [day, entries] of Object.entries(d.plan)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Array.isArray(entries) || entries.length > 30 || entries.some(e => !e || !str(e.id, 100) || !ids.has(e.recipeId) || !num(e.servings, 100) || e.servings < 1 || !Number.isInteger(e.servings))) return fail();
  }
  if (Object.entries(d.checked).some(([k, v]) => !str(k, 1000) || !str(v, 100))) return fail();
  if (d.extras.some(e => !e || !str(e.id, 100) || !str(e.name, 500) || !/^\d{4}-\d{2}-\d{2}$/.test(e.week))) return fail();
  if (d.profiles !== undefined && (!Array.isArray(d.profiles) || d.profiles.length !== 3 || new Set(d.profiles.map(p => p?.id)).size !== 3 || d.profiles.some(p => !p || !['anne', 'joel', 'mathis'].includes(p.id) || !str(p.name, 80) || !(p.calories === null || num(p.calories, 10000) && p.calories > 0) || !str(p.preferences, 2000) || !str(p.excluded, 1000) || !Array.isArray(p.diets) || p.diets.length > 20 || !p.diets.every(x => str(x, 100))))) return fail();
  if (d.pantry !== undefined && (!Array.isArray(d.pantry) || d.pantry.length > 500 || new Set(d.pantry.map(p => p?.id)).size !== d.pantry.length || d.pantry.some(p => !p || !str(p.id, 100) || !str(p.name, 200) || !p.name.trim() || !str(p.quantity, 100) || !['fridge', 'cupboard'].includes(p.location) || !(p.expires === '' || /^\d{4}-\d{2}-\d{2}$/.test(p.expires))))) return fail();
  for (const entries of Object.values(d.plan)) for (const e of entries) {
    if (e.batchId !== undefined && !str(e.batchId, 100) || e.cookDay !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(e.cookDay)) return fail();
    if (e.profileIds !== undefined && (!Array.isArray(e.profileIds) || e.profileIds.length > 3 || !e.profileIds.every(x => ['anne', 'joel', 'mathis'].includes(x))) || e.slot !== undefined && !['Frühstück', 'Mittagessen', 'Abendessen'].includes(e.slot) || e.kcalPerServing !== undefined && e.kcalPerServing !== null && !num(e.kcalPerServing, 10000)) return fail();
  }
  return d;
}
