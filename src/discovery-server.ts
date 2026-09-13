// Server catalogue: keep browser-only OCR and image handling out of the Worker.
import catalog from './web-catalog.json';
import { parseIngredient } from './domain';
import type { Recipe } from './types';
export const discoverRecipes: Recipe[] = catalog.map(r => ({ id: r.id, title: r.title, description: r.description, servings: r.servings || 2, servingsNote: r.servings ? undefined : 'Portionszahl aus der Quelle offen; bitte prüfen.', minutes: r.minutes, ingredients: r.ingredientLines.map(parseIngredient), steps: r.steps, image: r.image, photos: [], imageNote: 'Symbolbild · nicht das Originalgericht', source: r.source, sourceUrl: r.sourceUrl, favorite: false, sample: false, tags: r.tags, createdAt: r.fetchedAt }));
