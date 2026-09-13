import type { AppData, MealSlot, PantryItem, Profile, Recipe } from './types';
import { addDays, blankRecipe, parseIngredient, uid } from './domain';

export const defaultProfiles = (): Profile[] => ['Anne', 'Joel', 'Mathis'].map(name => ({ id: name.toLowerCase(), name, calories: null, preferences: '', excluded: '', diets: [] }));
export const diets = ['Vegetarisch', 'Vegan', 'Laktosefrei', 'Glutenfrei', 'Low Carb', 'Proteinreich'];
export type PlanSource = 'own' | 'web' | 'mixed' | 'creative';
export type SuggestedMeal = { dayIndex: number; slot: MealSlot; recipeId: string; reason: string; kcalPerServing: number | null };
export type PlanProposal = { recipes: Recipe[]; meals: SuggestedMeal[]; note: string; mealPrep?: boolean };
export const normalize = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
export const splitTerms = (s: string) => s.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);
export function ingredientMatches(a: string, b: string): boolean {
  const x = normalize(a), y = normalize(b);
  return x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x));
}
export function pantryMatch(recipe: Recipe, pantry: PantryItem[]) {
  const have = recipe.ingredients.filter(i => pantry.some(p => ingredientMatches(i.name, p.name)));
  return { have, missing: recipe.ingredients.filter(i => !have.includes(i)), score: have.length / Math.max(1, recipe.ingredients.length) };
}

// Conservative ingredient checks complement AI suggestions; they are no allergen certification.
export function profileConflicts(recipe: Recipe, profiles: Profile[]): string[] {
  const conflicts = new Set<string>();
  const ingredients = recipe.ingredients.map(i => normalize(i.name));
  const words = ingredients.join(' ');
  for (const profile of profiles) {
    for (const term of splitTerms(profile.excluded)) if (ingredients.some(i => ingredientMatches(i, term))) conflicts.add(`${profile.name}: ${term}`);
    for (const diet of profile.diets) {
      if (diet === 'Laktosefrei' && ingredients.some(i => !/laktosefrei|lactose.free|hafer|soja|mandel|kokos|oat|almond|coconut|soy|vegan/.test(i) && /milch|sahne|rahm|quark|joghurt|jogurt|butter|kase|feta|parmesan|mozzarella|milk|cream|cheese|yogurt/.test(i))) conflicts.add(`${profile.name}: Milchprodukt prüfen`);
      if (diet === 'Glutenfrei' && ingredients.some(i => !/glutenfrei|gluten.free/.test(i) && /weizen|roggen|gerste|dinkel|bulgur|couscous|nudel|pasta|mehl|brot|panier|hafer|wheat|flour|bread|oats|soy sauce|sojasauce/.test(i))) conflicts.add(`${profile.name}: Gluten prüfen`);
      if (['Vegetarisch', 'Vegan'].includes(diet) && /fleisch|hack|hahnchen|huhn|rind|schwein|speck|schinken|wurst|fisch|lachs|thunfisch|garnele|sardelle|gelatine|chicken|beef|pork|bacon|ham\b|fish|salmon|tuna|prawn|shrimp/.test(words)) conflicts.add(`${profile.name}: tierische Zutat`);
      if (diet === 'Vegan' && ingredients.some(i => !/vegan|hafer|soja|mandel|kokos|oat|almond|coconut|soy/.test(i) && /milch|sahne|rahm|quark|joghurt|butter|kase|feta|parmesan|mozzarella|honig|\beier?\b|milk|cream|cheese|honey|\beggs?\b/.test(i))) conflicts.add(`${profile.name}: nicht vegan`);
    }
  }
  return [...conflicts];
}

export function adoptPlan(data: AppData, proposal: PlanProposal, week: string, profiles: string[]): AppData {
  const recipes = [...data.recipes];
  const plan = { ...data.plan };
  const ids = new Map<string, string>();
  const batchIds = new Map<string, string>();
  for (const recipe of proposal.recipes) {
    const existing = recipes.find(r => r.id === recipe.id || recipe.sourceUrl && r.sourceUrl === recipe.sourceUrl);
    if (existing) ids.set(recipe.id, existing.id);
    else { recipes.push(recipe); ids.set(recipe.id, recipe.id); }
  }
  for (const meal of proposal.meals) {
    const recipeId = ids.get(meal.recipeId);
    if (!recipeId || meal.dayIndex < 0 || meal.dayIndex > 6) throw new Error('Der Wochenvorschlag ist unvollständig. Bitte neu erstellen.');
    const day = addDays(week, meal.dayIndex);
    const group = `${recipeId}-${meal.dayIndex < 3 ? 0 : 3}`;
    const repeated = proposal.mealPrep && proposal.meals.filter(m => m.recipeId === meal.recipeId && (m.dayIndex < 3) === (meal.dayIndex < 3)).length > 1;
    if (repeated && !batchIds.has(group)) batchIds.set(group, uid());
    const cookIndex = Math.min(...proposal.meals.filter(m => m.recipeId === meal.recipeId && (m.dayIndex < 3) === (meal.dayIndex < 3)).map(m => m.dayIndex));
    plan[day] = [...(plan[day] || []), { id: uid(), recipeId, servings: Math.max(1, profiles.length), profileIds: profiles, slot: meal.slot, kcalPerServing: meal.kcalPerServing, ...(repeated ? { batchId: batchIds.get(group), cookDay: addDays(week, cookIndex) } : {}) }];
  }
  return { ...data, recipes, plan };
}
export function generatedRecipe(raw: { id: string; title: string; description: string; servings: number; minutes: number; ingredientLines: string[]; steps: string[]; tags: string[]; kcalPerServing: number | null }): Recipe {
  return { ...blankRecipe(), id: raw.id, title: raw.title, description: raw.description, servings: raw.servings, minutes: raw.minutes, ingredients: raw.ingredientLines.map(parseIngredient), steps: raw.steps, tags: raw.tags, kcalPerServing: raw.kcalPerServing, source: 'KI-Rezept · Tisch & Tag', nutritionNote: 'Kalorien sind eine KI-Schätzung pro Portion.' };
}
