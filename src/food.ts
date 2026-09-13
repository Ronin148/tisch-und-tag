export const normalizeFood = (text: string) => text.toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');

// Match ingredient words and common plurals, never arbitrary parts of another food.
export function containsFoodTerm(name: string, term: string): boolean {
  const escaped = normalizeFood(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:n|en|e|er|ern|s|es|y|ies|roschen)?(?=$|[^\\p{L}\\p{N}])`, 'u').test(normalizeFood(name));
}

export function sameFood(a: string, b: string): boolean {
  // Stock deductions require the same food name; suggestions may be more permissive.
  return normalizeFood(a).trim().replace(/\s+/g, ' ') === normalizeFood(b).trim().replace(/\s+/g, ' ');
}
