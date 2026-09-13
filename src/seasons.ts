import type { Recipe } from './types';
import { containsFoodTerm } from './food';

export const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const seasonSource = 'https://www.verbraucherzentrale.de/sites/default/files/2023-01/saisonkalender_poster_a3.pdf';
export type Produce = { name: string; terms: string[]; fresh: number[]; stored: number[] };
// Approximate German harvest windows; stored produce is shown separately.
export const produce: Produce[] = [
  { name: 'Äpfel', terms: ['apfel', 'äpfel', 'apple'], fresh: [8,9,10], stored: [11,12,1,2,3,4,5] },
  { name: 'Birnen', terms: ['birne', 'pear'], fresh: [8,9,10], stored: [11,12,1] },
  { name: 'Erdbeeren', terms: ['erdbeer', 'strawberr'], fresh: [5,6,7], stored: [] },
  { name: 'Rhabarber', terms: ['rhabarber', 'rhubarb'], fresh: [4,5,6], stored: [] },
  { name: 'Kirschen', terms: ['kirsch', 'cherr'], fresh: [6,7,8], stored: [] },
  { name: 'Pflaumen', terms: ['pflaume', 'zwetschg', 'plum'], fresh: [7,8,9], stored: [] },
  { name: 'Spargel', terms: ['spargel', 'asparagus'], fresh: [4,5,6], stored: [] },
  { name: 'Spinat', terms: ['spinat', 'spinach'], fresh: [3,4,5,6,9,10,11], stored: [] },
  { name: 'Radieschen', terms: ['radieschen', 'radish'], fresh: [4,5,6,7,8,9,10], stored: [] },
  { name: 'Kohlrabi', terms: ['kohlrabi'], fresh: [5,6,7,8,9,10], stored: [11] },
  { name: 'Blumenkohl', terms: ['blumenkohl', 'cauliflower'], fresh: [5,6,7,8,9,10], stored: [] },
  { name: 'Brokkoli', terms: ['brokkoli', 'broccoli'], fresh: [6,7,8,9,10], stored: [] },
  { name: 'Tomaten', terms: ['tomate', 'tomato'], fresh: [7,8,9,10], stored: [] },
  { name: 'Gurken', terms: ['gurke', 'cucumber'], fresh: [6,7,8,9], stored: [] },
  { name: 'Zucchini', terms: ['zucchini', 'courgette'], fresh: [6,7,8,9,10], stored: [] },
  { name: 'Paprika', terms: ['paprika', 'bell pepper'], fresh: [7,8,9,10], stored: [] },
  { name: 'Kürbis', terms: ['kürbis', 'hokkaido', 'butternut', 'pumpkin', 'squash'], fresh: [8,9,10,11], stored: [12,1,2] },
  { name: 'Karotten', terms: ['karotte', 'möhre', 'carrot'], fresh: [6,7,8,9,10,11], stored: [12,1,2,3,4,5] },
  { name: 'Kartoffeln', terms: ['kartoffel', 'potato'], fresh: [6,7,8,9,10], stored: [11,12,1,2,3,4,5] },
  { name: 'Lauch', terms: ['lauch', 'porree', 'leek'], fresh: [1,2,3,7,8,9,10,11,12], stored: [] },
  { name: 'Rote Bete', terms: ['rote bete', 'rote beete', 'beetroot'], fresh: [7,8,9,10,11], stored: [12,1,2,3] },
  { name: 'Rosenkohl', terms: ['rosenkohl', 'brussels sprout'], fresh: [10,11,12,1,2], stored: [] },
  { name: 'Grünkohl', terms: ['grünkohl', 'kale'], fresh: [11,12,1,2], stored: [] },
  { name: 'Feldsalat', terms: ['feldsalat', 'lambs lettuce'], fresh: [1,2,3,10,11,12], stored: [] },
  { name: 'Rotkohl', terms: ['rotkohl', 'rotkraut', 'red cabbage'], fresh: [6,7,8,9,10,11], stored: [12,1,2,3] },
];
export const inSeason = (month: number) => produce.filter(p => p.fresh.includes(month) || p.stored.includes(month));
export function seasonalIngredients(recipe: Recipe, month: number): string[] {
  return inSeason(month).filter(p => recipeHasProduce(recipe, p)).map(p => p.name);
}
export function recipeHasProduce(recipe: Recipe, item: Produce): boolean {
  return recipe.ingredients.some(i => {
    const primary = i.name.split(/\(?\s*(?:alternativ|optional|wahlweise|oder)\b/i)[0];
    return item.terms.some(term => containsFoodTerm(primary, term));
  });
}
