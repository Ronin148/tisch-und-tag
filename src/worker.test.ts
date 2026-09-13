import { describe, expect, it } from 'vitest';
import { __test } from './worker';

const html = String.raw`<!doctype html><html><head>
<meta property="og:site_name" content="Meine Rezeptseite">
<script type="application/ld+json">{
  "@context":"https://schema.org",
  "@type":"Recipe",
  "name":"Sommer-Pasta",
  "description":"Frisch und schnell.",
  "image":["https://example.com/pasta.jpg"],
  "keywords":"Vegetarisch, Schnell",
  "recipeYield":"4 Portionen",
  "totalTime":"PT25M",
  "recipeIngredient":["400 g Pasta","2 EL Olivenöl"],
  "recipeInstructions":[{"@type":"HowToStep","text":"Pasta kochen."},{"@type":"HowToStep","text":"Alles mischen."}]
}</script></head><body><h1>Fallback</h1></body></html>`;

describe('recipe link import', () => {
  it('extracts schema.org recipe data into the cookbook shape', () => {
    const { recipe, imageUrl } = __test.parseRecipe(html, new URL('https://recipes.example/sommer-pasta'));
    expect(recipe.title).toBe('Sommer-Pasta');
    expect(recipe.description).toBe('Frisch und schnell.');
    expect(recipe.servings).toBe(4);
    expect(recipe.minutes).toBe(25);
    expect(recipe.ingredients).toEqual([{ amount: 400, unit: 'g', name: 'Pasta' }, { amount: 2, unit: 'EL', name: 'Olivenöl' }]);
    expect(recipe.steps).toEqual(['Pasta kochen.', 'Alles mischen.']);
    expect(recipe.tags).toEqual(['Vegetarisch', 'Schnell']);
    expect(recipe.source).toBe('Meine Rezeptseite · per Link importiert');
    expect(imageUrl).toBe('https://example.com/pasta.jpg');
  });

  it('rejects local and credentialed URLs', () => {
    expect(() => __test.assertPublicUrl('http://127.0.0.1/secret')).toThrow('öffentlich');
    expect(() => __test.assertPublicUrl('https://user:pass@example.com/recipe')).toThrow('Zugangsdaten');
  });
});
