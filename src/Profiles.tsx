import { useState } from 'react';
import { Users, Check } from 'lucide-react';
import type { Profile } from './types';
import { diets } from './kitchen';
export default function Profiles({ profiles,onSave }: { profiles:Profile[];onSave:(p:Profile[],original:Profile[])=>Promise<void> }) {
  const [original,setOriginal]=useState(()=>structuredClone(profiles));
  const [draft,setDraft]=useState(()=>structuredClone(profiles));const [active,setActive]=useState('anne');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const profile=draft.find(p=>p.id===active)!;
  const change=(patch:Partial<Profile>)=>{setDraft(d=>d.map(p=>p.id===active?{...p,...patch}:p));setMessage('');};
  return <section className="kitchen-panel"><h2><Users size={24}/>Eure Profile</h2><div className="profile-tabs">{draft.map(p=><button className={p.id===active?'active':''} aria-pressed={p.id===active} key={p.id} onClick={()=>setActive(p.id)}>{p.name}</button>)}</div>
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(draft,original);setOriginal(structuredClone(draft));setMessage('Profile gespeichert.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
      <label>Tagesziel in kcal <span className="optional">optional</span><input type="number" min={1} max={10000} step={1} inputMode="numeric" value={profile.calories??''} placeholder="Deine eigene Vorgabe" onChange={e=>change({calories:e.target.value?Number(e.target.value):null})}/></label><p className="field-hint">Eigene Orientierung, keine automatisch berechnete Empfehlung. Leer lassen, wenn du kein Kalorienziel nutzen möchtest.</p>
      <div className="filters">{diets.map(d=><button key={d} type="button" aria-pressed={profile.diets.includes(d)} className={profile.diets.includes(d)?'active':''} onClick={()=>change({diets:profile.diets.includes(d)?profile.diets.filter(x=>x!==d):[...profile.diets,d]})}>{d}</button>)}</div>
      <label>Das mag {profile.name}<textarea rows={3} maxLength={2000} value={profile.preferences} onChange={e=>change({preferences:e.target.value})} placeholder="Zum Beispiel mediterran, mild, viel Gemüse, schnelle Gerichte …"/></label>
      <label>Diese Zutaten vermeiden<input maxLength={1000} value={profile.excluded} onChange={e=>change({excluded:e.target.value})} placeholder="Zum Beispiel Erdnüsse, Sellerie, Pilze"/></label>
      <p className="fineprint">Zutaten mit Komma trennen. Bei Unverträglichkeiten Zutaten und Verpackungsangaben zusätzlich prüfen; Rezeptvorschläge sind keine Allergenprüfung.</p><button className="btn primary" disabled={busy}><Check size={18}/>Profile speichern</button>{message&&<p className="notice" role="status">{message}</p>}
    </form></section>;
}
