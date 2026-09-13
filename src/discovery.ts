import type { Recipe } from './types';
import { parseIngredient } from './domain';
import { exampleRecipes } from './seed';
import catalog from './web-catalog.json';
import { compressPhoto } from './ocr';

export const suggestedTags = ['Vegetarisch', 'Vegan', 'Low Carb', 'Proteinreich', 'Schnell', 'Meal Prep', 'Frühstück', 'Hauptgericht', 'Salat', 'Suppe', 'Ofengericht', 'Dessert'];
export const discoverRecipes: Recipe[] = [
  ...catalog.map(r => ({ id: r.id, title: r.title, description: r.description, servings: r.servings || 2, servingsNote: r.servings ? undefined : 'Die Quelle nennt keine eindeutige Portionszahl. Bitte beim Übernehmen prüfen; vorläufig sind 2 eingetragen.', minutes: r.minutes, ingredients: r.ingredientLines.map(parseIngredient), steps: r.steps, image: r.image, photos: [], imageNote: 'Symbolbild · nicht das Originalgericht', source: r.source, sourceUrl: r.sourceUrl, favorite: false, sample: false, tags: r.tags, createdAt: r.fetchedAt })),
  ...exampleRecipes.map(r => ({ ...r, imageNote: 'Serviervorschlag · Beispielrezept' })),
];

export async function keepRecipeImage(recipe: Recipe): Promise<Recipe> {
  if (!recipe.image || recipe.image.startsWith('data:')) return { ...recipe, sample: false, createdAt: new Date().toISOString() };
  const src = recipe.image.startsWith('https://') ? recipe.image : `${import.meta.env.BASE_URL}${recipe.image}`;
  const response = await fetch(src, { signal: AbortSignal.timeout(15000), credentials: 'omit' });
  if (!response.ok) throw new Error('Das Rezeptbild konnte nicht gespeichert werden. Bitte die Verbindung prüfen und erneut versuchen.');
  const blob = await response.blob();
  const file = new File([blob], 'rezeptbild', { type: blob.type });
  const image = await compressPhoto(file);
  return { ...recipe, image, sample: false, createdAt: new Date().toISOString() };
}

const englishUnits: Record<string,string> = { tsp: 'TL', tbsp: 'EL', tbs: 'EL', teaspoons: 'TL', teaspoon: 'TL', tablespoons: 'EL', tablespoon: 'EL', cups: 'Tasse', cup: 'Tasse' };
export function mealToRecipe(meal: Record<string, string | null>): Recipe {
  const ingredients = [];
  for (let n = 1; n <= 20; n++) {
    const name = meal[`strIngredient${n}`]?.trim(); if (!name) continue;
    const measure = (meal[`strMeasure${n}`] || '').trim().replace(/\b(tsp|tbsp|tbs|teaspoons?|tablespoons?|cups?)\b/gi, u => englishUnits[u.toLowerCase()] || u);
    ingredients.push(parseIngredient(`${measure} ${name}`.trim()));
  }
  const tags = (meal.strTags || '').split(',').map(t => t.trim()).filter(Boolean);
  if (meal.strCategory === 'Vegetarian') tags.unshift('Vegetarisch');
  if (meal.strCategory === 'Vegan') tags.unshift('Vegan');
  if (meal.strCategory === 'Seafood') tags.unshift('Fisch');
  if (meal.strCategory === 'Dessert') tags.unshift('Dessert');
  const picture = meal.strMealThumb || '';
  return { id: `mealdb-${meal.idMeal}`, title: (meal.strMeal || 'Web-Rezept').slice(0,150), description: `${meal.strArea || 'Internationales'} Rezept · Originalsprache Englisch`, ingredients, steps: (meal.strInstructions || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean), image: /^https:\/\/www\.themealdb\.com\/images\/media\/meals\//.test(picture) ? picture : '', photos: [], minutes: null, servings: 2, servingsNote: 'Die Quelle nennt keine Portionszahl. Bitte beim Übernehmen prüfen; vorläufig sind 2 eingetragen.', source: 'TheMealDB · Originalrezept und Bild', sourceUrl: `https://www.themealdb.com/meal/${meal.idMeal}`, favorite: false, sample: false, tags: [...new Set(tags)], createdAt: new Date().toISOString() };
}
export async function searchLiveRecipes(query: string, signal: AbortSignal): Promise<Recipe[]> {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query.trim())}`;
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), credentials: 'omit' });
  if (!response.ok) throw new Error('Die Rezeptquelle ist gerade nicht erreichbar. Bitte später erneut versuchen.');
  const data = await response.json();
  if (!data || !(data.meals === null || Array.isArray(data.meals))) throw new Error('Die Rezeptquelle hat ungültige Daten geliefert.');
  return (data.meals || []).slice(0, 40).filter((m: Record<string, unknown>) => m && typeof m.idMeal === 'string' && /^\d+$/.test(m.idMeal) && typeof m.strMeal === 'string' && m.strMeal.trim()).map((m: Record<string, unknown>) => mealToRecipe(Object.fromEntries(Object.entries(m).map(([key, value]) => [key, typeof value === 'string' ? value : null]))));
}
