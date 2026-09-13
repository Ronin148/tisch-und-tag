import { useState } from 'react';
import type { AppData, Recipe } from './types';
import { defaultProfiles } from './kitchen';
import Profiles from './Profiles';
import SeasonCalendar from './SeasonCalendar';
import Pantry from './Pantry';
import { FamilyPanel } from './FamilyPanel';
import type { FamilySync } from './family-sync';
export default function Kitchen({ data,onChange,onAdd,onOpen,family,initialTab='pantry' }: { data:AppData;onChange:(update:(d:AppData)=>AppData)=>Promise<void>;onAdd:(r:Recipe)=>Promise<void>;onOpen:(id:string)=>void;family:FamilySync;initialTab?:string }) {
  const [tab,setTab]=useState(initialTab);
  return <><div className="page-title"><h1>Unsere Küche</h1><p>Vorräte nutzen, saisonal kochen, gemeinsam planen.</p></div><div className="source-tabs kitchen-tabs">{[{id:'pantry',label:'Vorräte'},{id:'season',label:'Saison'},{id:'profiles',label:'Profile'},{id:'family',label:'Familie & KI'}].map(t=><button key={t.id} className={t.id===tab?'active':''} aria-pressed={t.id===tab} onClick={()=>setTab(t.id)}>{t.label}</button>)}</div>
    {tab==='pantry'&&<Pantry data={data} onChange={onChange} onAdd={onAdd} onOpen={onOpen}/>}
    {tab==='season'&&<SeasonCalendar ownRecipes={data.recipes} onAdd={onAdd} onOpen={onOpen}/>}
    {tab==='profiles'&&<Profiles profiles={data.profiles||defaultProfiles()} onSave={(profiles,original)=>onChange(d=>{
      const changed=profiles.filter(p=>JSON.stringify(p)!==JSON.stringify(original.find(o=>o.id===p.id)));
      const current=d.profiles||defaultProfiles();
      if(changed.some(p=>JSON.stringify(current.find(c=>c.id===p.id))!==JSON.stringify(original.find(o=>o.id===p.id))))throw new Error('Ein bearbeitetes Profil wurde inzwischen auf einem anderen Gerät geändert. Bitte die Angaben sichern und das Profil neu öffnen.');
      return {...d,profiles:current.map(p=>changed.find(c=>c.id===p.id)||p)};
    })}/>}
    {tab==='family'&&<FamilyPanel data={data} family={family}/>}
  </>;
}
