import { describe, expect, it } from 'vitest';
import { addDays, blankRecipe, ingredientText, isChecked, monday, parseIngredient, parseRecipeText, parseStockQuantity, safeUrl, shoppingList, shoppingSignature, validateBackup } from './domain';
import { initialData } from './seed';
import type { AppData } from './types';

describe('importing real-world ingredient quantities', () => {
  it.each([
    ['200g Tomaten', { amount: 200, unit: 'g', name: 'Tomaten' }],
    ['• 1,5 kg Kartoffeln', { amount: 1.5, unit: 'kg', name: 'Kartoffeln' }],
    ['½ TL Salz', { amount: 0.5, unit: 'TL', name: 'Salz' }],
    ['1½ EL Olivenöl', { amount: 1.5, unit: 'EL', name: 'Olivenöl' }],
    ['1 1/2 l Milch', { amount: 1.5, unit: 'l', name: 'Milch' }],
    ['2 Zehen Knoblauch', { amount: 2, unit: 'Zehe', name: 'Knoblauch' }],
    ['1 Zwiebel', { amount: 1, unit: '', name: 'Zwiebel' }],
    ['Salz nach Geschmack', { amount: null, unit: '', name: 'Salz nach Geschmack' }],
    ['2–3 Tomaten', { amount: null, unit: '', name: '2–3 Tomaten' }],
    ['ca. 100 g Feta', { amount: null, unit: '', name: 'ca. 100 g Feta' }],
  ])('%s', (input, expected) => expect(parseIngredient(input)).toEqual(expected));
  it('keeps comma decimals while scaling', () => expect(ingredientText(parseIngredient('1,5 EL Olivenöl'), 2)).toBe('3 EL Olivenöl'));
});

describe('recipe text', () => {
  it('recognizes OCR spelling of portion metadata without adding a cooking step', () => {
    expect(parseRecipeText('Testpasta\nFuer 6 Portionen\n20 Minuten\nZutaten\n600 g Pasta\nZubereitung\n1. Pasta kochen.')).toMatchObject({ servings: 6, steps: ['Pasta kochen.'] });
    expect(parseRecipeText('Pasta\nZubereitung\n2 Portionen beiseitestellen.').steps).toEqual(['2 Portionen beiseitestellen.']);
  });
  it('extracts a copied recipe and keeps its steps', () => {
    const parsed = parseRecipeText('Schnelle Pasta\nFür 4 Portionen\n20 Minuten\n\nZutaten\n400 g Pasta\n2 EL Olivenöl\n\nZubereitung\n1. Wasser aufkochen.\n2. Pasta kochen.');
    expect(parsed).toMatchObject({ title: 'Schnelle Pasta', servings: 4, minutes: 20, steps: ['Wasser aufkochen.', 'Pasta kochen.'] });
    expect(parsed.ingredients).toHaveLength(2);
  });
  it('does not pretend to know ingredients when headings are absent', () => {
    const parsed = parseRecipeText('Ein Rezept\nMit Tomaten und Gemüse kochen.');
    expect(parsed.ingredients).toEqual([]); expect(parsed.steps).toEqual(['Mit Tomaten und Gemüse kochen.']);
  });
});

function planned(): AppData {
  const r = { ...blankRecipe(), title: 'Tomatenreis', servings: 2, ingredients: ['0,5 kg Tomaten', '100 g Reis', '1 EL Olivenöl', 'Salz'].map(parseIngredient) };
  const second = { ...blankRecipe(), title: 'Tomatensalat', servings: 2, ingredients: ['250 g tomaten', '50 ml Olivenöl'].map(parseIngredient) };
  return { version: 1, recipes: [r, second], plan: { '2026-09-14': [{ id: 'one', recipeId: r.id, servings: 4 }], '2026-09-15': [{ id: 'two', recipeId: second.id, servings: 2 }] }, checked: {}, extras: [] };
}
describe('shopping list', () => {
  it('deducts compatible stock once and offers the original total when disabled', () => {
    const d=planned();d.plan['2026-09-14'][0].servings=12;
    d.pantry=[{id:'stock',name:'Reis',quantity:'0,5 kg',location:'cupboard',expires:''}];
    const item=shoppingList(d,'2026-09-14',true,'2026-09-13').find(i=>i.name==='Reis')!;
    expect(item).toMatchObject({amount:100,requiredAmount:600,pantryAmount:500});
    expect(shoppingList(d,'2026-09-14',false).find(i=>i.name==='Reis')?.amount).toBe(600);
    expect(d.pantry[0].quantity).toBe('0,5 kg');
  });
  it('marks fully covered stock ready and reopens it after a quantity change', () => {
    const d=planned();d.pantry=[{id:'stock',name:'Reis',quantity:'200 g',location:'cupboard',expires:''}];
    const item=shoppingList(d,'2026-09-14').find(i=>i.name==='Reis')!;
    expect(item.amount).toBe(0);expect(isChecked(d,'2026-09-14',item)).toBe(true);
    d.plan['2026-09-14'][0].servings=6;
    expect(isChecked(d,'2026-09-14',shoppingList(d,'2026-09-14').find(i=>i.name==='Reis')!)).toBe(false);
  });
  it('keeps uncertain, incompatible, different-food and expired stock on the list', () => {
    const d=planned();
    d.pantry=[
      {id:'a',name:'Reis',quantity:'1 Packung',location:'cupboard',expires:''},
      {id:'b',name:'Reis',quantity:'ca. 500 g',location:'cupboard',expires:''},
      {id:'c',name:'Reis',quantity:'500 g',location:'cupboard',expires:'2026-09-13'},
      {id:'d',name:'Reisnudeln',quantity:'500 g',location:'cupboard',expires:''},
    ];
    expect(shoppingList(d,'2026-09-14',true,'2026-09-13').find(i=>i.name==='Reis')?.amount).toBe(200);
    expect(parseStockQuantity('ca. 500 g')).toBeNull();expect(parseStockQuantity('2–3 Stück')).toBeNull();
  });
  it('converts litres and shares piece stock across equivalent recipe units without double counting', () => {
    const r={...blankRecipe(),title:'Test',servings:1,ingredients:['2 Paprika','3 Stück Paprika','500 ml Milch'].map(parseIngredient)};
    const d:AppData={...initialData(),recipes:[r],plan:{'2026-09-14':[{id:'p',recipeId:r.id,servings:1}]},pantry:[{id:'one',name:'Paprika',quantity:'3 Stück',location:'fridge',expires:''},{id:'two',name:'Milch',quantity:'0,2 l',location:'fridge',expires:''}]};
    const items=shoppingList(d,'2026-09-14');
    expect(items.filter(i=>i.name==='Paprika').reduce((sum,i)=>sum+(i.amount||0),0)).toBe(2);
    expect(items.find(i=>i.name==='Milch')?.amount).toBe(300);
  });
  it('scales servings and sums grams and kilograms', () => { const items = shoppingList(planned(), '2026-09-14'); expect(items.find(i => i.name === 'Tomaten')?.amount).toBe(1250); expect(items.find(i => i.name === 'Reis')?.amount).toBe(200); });
  it('never mixes tablespoons with milliliters', () => expect(shoppingList(planned(), '2026-09-14').filter(i => i.name === 'Olivenöl')).toHaveLength(2));
  it('leaves unknown quantities unknown', () => expect(shoppingList(planned(), '2026-09-14').find(i => i.name === 'Salz')?.amount).toBeNull());
  it('only includes the selected week', () => expect(shoppingList(planned(), '2026-09-21')).toEqual([]));
  it('reopens a checked item after portions increase', () => {
    const d = planned(); const week = '2026-09-14'; const item = shoppingList(d, week).find(i => i.name === 'Reis')!;
    d.checked[`${week}|${item.key}`] = shoppingSignature(item); expect(isChecked(d, week, item)).toBe(true);
    d.plan[week][0].servings = 6; expect(isChecked(d, week, shoppingList(d, week).find(i => i.name === 'Reis')!)).toBe(false);
  });
  it('keeps manually added items in their own week', () => { const d = planned(); d.extras.push({ id: 'extra', name: 'Brot', week: '2026-09-21' }); expect(shoppingList(d, '2026-09-14').find(i => i.name === 'Brot')).toBeUndefined(); expect(shoppingList(d, '2026-09-21')[0].name).toBe('Brot'); });
});
describe('dates and personal backups', () => {
  it('handles Sunday and a year boundary', () => { expect(monday(new Date('2026-09-13T12:00:00'))).toBe('2026-09-07'); expect(addDays('2026-12-28', 7)).toBe('2027-01-04'); });
  it('round-trips recipes, quantities and week plans', () => { const d = planned(); expect(validateBackup(JSON.parse(JSON.stringify(d)))).toEqual(d); expect(validateBackup(initialData()).recipes).toHaveLength(0); });
  it('rejects corrupt backups without treating them as empty data', () => { expect(() => validateBackup({ version: 1 })).toThrow(); const d = planned(); d.recipes[0].servings = 0; expect(() => validateBackup(d)).toThrow(); });
  it('rejects orphaned plans and duplicate recipe identifiers', () => { const d = planned(); d.plan['2026-09-14'][0].recipeId = 'missing'; expect(() => validateBackup(d)).toThrow(); const e = planned(); e.recipes[1].id = e.recipes[0].id; expect(() => validateBackup(e)).toThrow(); });
  it('rejects active content and external tracking images in backups', () => { const d = planned(); d.recipes[0].image = 'data:image/svg+xml,<svg onload=alert(1) />'; expect(() => validateBackup(d)).toThrow(); d.recipes[0].image = 'https://tracker.example/image.png'; expect(() => validateBackup(d)).toThrow(); expect(safeUrl('javascript:alert(1)')).toBe(''); expect(safeUrl('https://example.com/recipe')).toBe('https://example.com/recipe'); });
});
