export type KitchenTimer = { id:string; label:string; endAt:number|null; remaining:number; done:boolean };
export const remainingSeconds = (timer:KitchenTimer,now=Date.now()) => timer.endAt===null?timer.remaining:Math.max(0,Math.ceil((timer.endAt-now)/1000));
export function stepMinutes(step:string):number|null {
  const match=step.match(/(\d+(?:[.,]\d+)?)\s*(?:[-–]|bis)?\s*(\d+)?\s*(Minuten?|Min\.?|Stunden?|Std\.?)/i);
  if(!match)return null;const minutes=Number(match[2]||match[1].replace(',','.'))*(/^st/i.test(match[3])?60:1);return minutes>0&&minutes<=1440?minutes:null;
}
