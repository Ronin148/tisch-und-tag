export type Ingredient = { amount: number | null; unit: string; name: string };
export type Recipe = {
  id: string; title: string; description: string; servings: number; minutes: number | null;
  ingredients: Ingredient[]; steps: string[]; image: string; photos: string[];
  source: string; sourceUrl: string; favorite: boolean; sample: boolean; tags: string[]; createdAt: string;
  imageNote?: string; servingsNote?: string;
};
export type PlanEntry = { id: string; recipeId: string; servings: number };
export type ExtraItem = { id: string; name: string; week: string };
export type AppData = {
  version: 1; recipes: Recipe[]; plan: Record<string, PlanEntry[]>;
  checked: Record<string, string>; extras: ExtraItem[];
};
export type ShoppingItem = Ingredient & { key: string; category: string; recipeTitles: string[]; extraId?: string };
export type View = 'recipes' | 'discover' | 'plan' | 'shopping';
