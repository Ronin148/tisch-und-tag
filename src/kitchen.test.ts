import { describe, expect, it } from 'vitest';
import { defaultProfiles, adoptPlan, pantryMatch, profileConflicts, type PlanProposal } from './kitchen';
import { initialData, exampleRecipes } from './seed';
import { parseIngredient, shoppingList, validateBackup } from './domain';
import { remainingSeconds, stepMinutes } from './cooking';
import { inSeason, seasonalIngredients } from './seasons';

describe('family profiles and pantry',()=>{
  it('keeps legacy backups readable and round-trips the new fields',()=>{
    expect(validateBackup(initialData()).recipes).toEqual([]);
    const data={...initialData(),profiles:defaultProfiles(),pantry:[{id:'p',name:'Tomaten',quantity:'500 g',location:'fridge' as const,expires:'2026-09-17'}]};
    expect(validateBackup(JSON.parse(JSON.stringify(data)))).toEqual(data);
    expect(data.profiles.map(p=>p.calories)).toEqual([null,null,null]);
  });
  it('rejects damaged profiles and pantry values without discarding saved data',()=>{
    expect(()=>validateBackup({...initialData(),profiles:[...defaultProfiles(),defaultProfiles()[0]]})).toThrow();
    expect(()=>validateBackup({...initialData(),pantry:[{id:'p',name:'',quantity:'',location:'fridge',expires:''}]})).toThrow();
  });
  it('applies the exclusions of every participating person',()=>{
    const profiles=defaultProfiles();profiles[0].diets=['Laktosefrei'];profiles[1].excluded='Tomaten';
    const conflicts=profileConflicts(exampleRecipes[0],profiles);
    expect(conflicts.some(x=>x.includes('Anne'))).toBe(true);expect(conflicts.some(x=>x.includes('Joel'))).toBe(true);
    expect(profileConflicts({...exampleRecipes[0],ingredients:['100 ml laktosefreie Milch','200 ml Kokosmilch'].map(parseIngredient)},[profiles[0]])).toEqual([]);
  });
  it('matches foods without claiming that quantities are sufficient',()=>{
    const result=pantryMatch(exampleRecipes[0],[{id:'p',name:'Tomaten',quantity:'1 Stück',location:'fridge',expires:''}]);
    expect(result.have.map(i=>i.name)).toContain('Tomaten');expect(result.missing.length).toBe(exampleRecipes[0].ingredients.length-1);
  });
});
describe('meal prep and proposals',()=>{
  it('adds only selected recipes and counts all eating portions once',()=>{
    const r={...exampleRecipes[0],id:'test-recipe',servings:2,ingredients:[parseIngredient('200 g Reis')]};
    const data=initialData();const proposal:PlanProposal={recipes:[r],meals:[0,1,2].map(dayIndex=>({dayIndex,slot:'Abendessen',recipeId:r.id,reason:'Meal Prep',kcalPerServing:400})),note:'',mealPrep:true};
    const result=adoptPlan(data,proposal,'2026-09-14',['anne','joel','mathis']);
    expect(data.recipes).toHaveLength(0);expect(result.recipes).toHaveLength(1);
    expect(shoppingList(result,'2026-09-14')[0].amount).toBe(900);
    expect(new Set(Object.values(result.plan).flat().map(e=>e.batchId)).size).toBe(1);
    expect(Object.values(result.plan).flat()[0].cookDay).toBe('2026-09-14');
    expect(validateBackup(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });
  it('keeps existing planned meals and resolves previously saved web recipes',()=>{
    const r=exampleRecipes[0];const existing={...r,id:'saved',sourceUrl:'https://example.com/recipe'};
    const data={...initialData(),recipes:[existing],plan:{'2026-09-14':[{id:'old',recipeId:'saved',servings:1}]}};
    const result=adoptPlan(data,{recipes:[{...r,sourceUrl:existing.sourceUrl}],meals:[{dayIndex:0,slot:'Abendessen',recipeId:r.id,reason:'',kcalPerServing:null}],note:''},'2026-09-14',['anne']);
    expect(result.recipes).toHaveLength(1);expect(result.plan['2026-09-14']).toHaveLength(2);expect(result.plan['2026-09-14'][1].recipeId).toBe('saved');
  });
});
describe('cooking timers',()=>{
  it('uses a deadline so sleeping phones cannot slow down the timer',()=>{
    const timer={id:'t',label:'Pasta',endAt:100000,remaining:60,done:false};
    expect(remainingSeconds(timer,70000)).toBe(30);expect(remainingSeconds(timer,150000)).toBe(0);
    expect(remainingSeconds({...timer,endAt:null,remaining:24},150000)).toBe(24);
  });
  it.each([['5 Minuten köcheln',5],['15–20 Minuten backen',20],['1,5 Stunden garen',90],['Gut vermischen',null]])('suggests a timer for %s',(step,expected)=>expect(stepMinutes(step as string)).toBe(expected));
});
describe('seasonal recipe matching',()=>{
  it('never treats garlic or wild garlic as leek and ignores optional alternatives',()=>{
    const r={...exampleRecipes[0],ingredients:['1 Zehe Knoblauch','1 Bund Bärlauch','1 Zwiebel (alternativ Lauch)'].map(parseIngredient)};
    expect(seasonalIngredients(r,9)).not.toContain('Lauch');
    expect(seasonalIngredients({...r,ingredients:[parseIngredient('1 Stange Lauch')]},9)).toContain('Lauch');
    expect(pantryMatch({...r,ingredients:[parseIngredient('1 Zehe Knoblauch')]},[{id:'p',name:'Lauch',quantity:'1 Stück',location:'fridge',expires:''}]).have).toEqual([]);
  });
  it('distinguishes harvest and storage and matches actual ingredients',()=>{
    expect(inSeason(9).some(p=>p.name==='Kürbis')).toBe(true);expect(inSeason(1).find(p=>p.name==='Äpfel')?.stored).toContain(1);
    expect(seasonalIngredients({...exampleRecipes[0],ingredients:[parseIngredient('1 Kürbis')]},9)).toContain('Kürbis');
    expect(seasonalIngredients({...exampleRecipes[0],ingredients:[parseIngredient('1 Kürbis')]},4)).not.toContain('Kürbis');
  });
});
