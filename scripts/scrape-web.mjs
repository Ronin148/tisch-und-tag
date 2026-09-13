import { parseHTML } from 'linkedom';
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Deliberately selected openly licensed sources. No login/paywall bypass, no proxy.
const sources = [
  ['Brokkoligratin mit dreierlei Käse', ['Vegetarisch', 'Low Carb', 'Ofengericht'], 'vegetables'],
  ['Guacamole', ['Vegan', 'Low Carb', 'Dip'], 'salad'],
  ['Paprikagemüse', ['Vegetarisch', 'Gemüse'], 'vegetables'],
  ['Avocadosuppe', ['Vegetarisch', 'Suppe'], 'salad'],
  ['Zucchinifächer', ['Vegetarisch', 'Low Carb', 'Ofengericht'], 'vegetables'],
  ['Überbackene Aubergine', ['Vegetarisch', 'Ofengericht'], 'vegetables'],
  ['Ingwer-Linsen-Suppe', ['Vegetarisch', 'Suppe'], 'curry'],
  ['Limetten-Möhren', ['Vegetarisch', 'Gemüse'], 'vegetables'],
  ['Grünes Gemüse', ['Vegetarisch', 'Gemüse'], 'salad'],
  ['Haferbrei', ['Vegetarisch', 'Frühstück'], 'oats'],
  ['Apfelmüsli', ['Vegetarisch', 'Frühstück'], 'oats'],
  ['Spargel-Spinat-Gratin', ['Vegetarisch', 'Ofengericht'], 'vegetables'],
  ['Curry-Gemüse', ['Vegan', 'Curry'], 'curry'],
  ['Pesto', ['Vegetarisch', 'Dip'], 'pasta'],
  ['Salsa mexicana', ['Vegan', 'Low Carb', 'Dip'], 'salad'],
  ['Aubergine mit Salsa', ['Vegetarisch', 'Gemüse'], 'vegetables'],
];
const clean = el => (el?.textContent || '').replace(/\[\s*Bearbeiten\s*\]/g, '').replace(/\s+/g, ' ').trim();
const recipes = [];
for (const [name, tags, image] of sources) {
  const url = `https://de.wikibooks.org/wiki/Kochbuch/_${encodeURIComponent(name.replaceAll(' ', '_'))}`;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'TischUndTag/0.1 (personal recipe catalogue; https://github.com/Ronin148/tisch-und-tag)' }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { document } = parseHTML(await response.text());
    const root = document.querySelector('.mw-parser-output');
    if (!root) throw new Error('No recipe content');
    root.querySelectorAll('.mw-editsection, .navbox, .toc, script, style, sup.reference').forEach(el => el.remove());
    const ingredients = [], steps = []; let mode = '';
    for (const node of root.children) {
      const heading = /^H[2-4]$/.test(node.tagName) ? node : node.querySelector('h2,h3,h4');
      if (heading) { const t = clean(heading); mode = /^Zutaten/i.test(t) ? 'ingredients' : /^(Zubereitung|Vorbereitung)/i.test(t) ? 'steps' : ''; continue; }
      if (!mode) continue;
      if (['UL', 'OL'].includes(node.tagName)) {
        for (const li of node.querySelectorAll('li')) {
          const nested = li.querySelector('ul,ol');
          if (mode === 'ingredients' && nested) continue;
          const clone = li.cloneNode(true); clone.querySelectorAll('ul,ol').forEach(el => el.remove());
          const text = clean(clone); if (text) (mode === 'ingredients' ? ingredients : steps).push(text);
        }
      } else if (node.tagName === 'P' && clean(node)) {
        if (mode === 'steps') steps.push(clean(node));
        // Ingredient-section prose is a note, not an ingredient quantity.
      }
    }
    if (!ingredients.length || !steps.length) throw new Error('Incomplete ingredients/steps');
    let servings = null, minutes = null;
    for (const row of root.querySelectorAll('tr')) {
      const text = clean(row);
      if (/Portionen|Rezeptmenge|Personen|Menge:/i.test(text)) { const n = text.match(/(?:für\s*:?\s*)?(\d+)\s*(?:Personen|Portionen)/i); if (n) servings = Number(n[1]); }
      if (/Zeitbedarf|Zubereitungszeit|Gesamtzeit/i.test(text)) { const n = text.match(/(\d+)\s*Min/i); if (n) minutes = Number(n[1]); }
    }
    const revision = document.querySelector('#t-permalink a')?.getAttribute('href');
    recipes.push({ id: `web-${createHash('sha256').update(url).digest('hex').slice(0,12)}`, title: name, description: 'Aus dem freien Wikibooks-Kochbuch. Zutaten und Schritte vor dem Kochen prüfen.', servings, minutes, ingredientLines: ingredients, steps, image: `images/${image}.webp`, imageIsIllustration: true, source: 'Wikibooks-Mitwirkende · CC BY-SA 4.0 · strukturiert übernommen', sourceUrl: revision ? new URL(revision,url).href : url, canonicalUrl: url, tags, fetchedAt: new Date().toISOString() });
    console.log(`${name}: ${ingredients.length} ingredients, ${steps.length} steps`);
  } catch (error) { console.error(`${name}: ${error.message}`); }
}
if (recipes.length < 8) throw new Error('Too few complete recipes; previous catalogue retained.');
await mkdir('src', { recursive: true });
await writeFile('src/web-catalog.json', JSON.stringify(recipes, null, 2) + '\n');
console.log(`Saved ${recipes.length} German web recipes. Source texts: CC BY-SA 4.0. Photos are labelled illustrations.`);
