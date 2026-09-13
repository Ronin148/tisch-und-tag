import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialData } from './seed';
import { validateBackup } from './domain';
import { discoverRecipes, keepRecipeImage, mealToRecipe, searchLiveRecipes } from './discovery';
import { compressPhoto } from './ocr';

vi.mock('./ocr', () => ({ compressPhoto: vi.fn(async () => 'data:image/jpeg;base64,YWJj') }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('Entdecken bleibt getrennt vom Kochbuch', () => {
  it('starts with an empty personal book and a source-attributed catalogue', () => {
    expect(initialData().recipes).toEqual([]);
    const web = discoverRecipes.filter(r => !r.sample);
    expect(web.length).toBeGreaterThanOrEqual(15);
    expect(web.every(r => r.sourceUrl.startsWith('https://de.wikibooks.org/') && r.source.includes('CC BY-SA'))).toBe(true);
    expect(web.some(r => r.tags.includes('Low Carb'))).toBe(true);
    expect(() => validateBackup({ ...initialData(), recipes: web })).not.toThrow();
  });
  it('stores picture bytes with the selected recipe without changing its source', async () => {
    const original = discoverRecipes[0];
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['picture'], { type: 'image/webp' }))));
    const saved = await keepRecipeImage(original);
    expect(saved.image).toBe('data:image/jpeg;base64,YWJj');
    expect(saved.sourceUrl).toBe(original.sourceUrl);
    expect(original.image).toMatch(/^images\//);
    expect(compressPhoto).toHaveBeenCalledOnce();
    expect(validateBackup({ ...initialData(), recipes: [saved] }).recipes[0].image).toBe(saved.image);
  });
  it('reports a failed image download instead of saving a broken link', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    await expect(keepRecipeImage(discoverRecipes[0])).rejects.toThrow('Rezeptbild');
  });
});

describe('live web recipe import', () => {
  it('preserves uncertain servings and translates measurable units', () => {
    const r = mealToRecipe({ idMeal: '123', strMeal: 'Pasta', strIngredient1: 'Oil', strMeasure1: '1 1/2 tbsp', strIngredient2: 'Flour', strMeasure2: '2 cups', strInstructions: 'Mix.\r\nCook.', strCategory: 'Vegetarian', strMealThumb: 'https://www.themealdb.com/images/media/meals/test.jpg' });
    expect(r.ingredients).toEqual([{ amount: 1.5, unit: 'EL', name: 'Oil' }, { amount: 2, unit: 'Tasse', name: 'Flour' }]);
    expect(r.servingsNote).toBeTruthy(); expect(r.minutes).toBeNull(); expect(r.steps).toHaveLength(2); expect(r.tags).toContain('Vegetarisch');
  });
  it('does not display third-party or executable image URLs', () => {
    expect(mealToRecipe({ idMeal: '123', strMealThumb: 'javascript:alert(1)' }).image).toBe('');
    expect(mealToRecipe({ idMeal: '123', strMealThumb: 'https://other.example/photo.jpg' }).image).toBe('');
  });
  it('handles no results and malformed fields from the remote API', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ meals: null }))).mockResolvedValueOnce(new Response(JSON.stringify({ meals: [null, { idMeal: '123', strMeal: 'Soup', strIngredient1: 47, strTags: ['bad'] }] })));
    vi.stubGlobal('fetch', fetcher);
    expect(await searchLiveRecipes('missing', new AbortController().signal)).toEqual([]);
    const results = await searchLiveRecipes('Soup', new AbortController().signal);
    expect(results).toHaveLength(1); expect(results[0].ingredients).toEqual([]);
  });
});
