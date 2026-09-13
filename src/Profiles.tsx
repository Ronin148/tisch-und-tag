import { useEffect, useState } from 'react';
import { Users, Check } from 'lucide-react';
import type { Profile } from './types';
import { diets } from './kitchen';
import { validateBackup } from './domain';
const draftKey = 'tisch-profile-draft-v1';
function restoreDraft(profiles: Profile[]) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
    if (saved) {
      for (const p of [saved.original, saved.draft]) {
        if (!p) throw new Error('Invalid draft');
        validateBackup({ version: 1, recipes: [], plan: {}, checked: {}, extras: [], profiles: p });
      }
      return saved as { original: Profile[]; draft: Profile[] };
    }
  } catch { /* Retain family profiles if the device draft is unreadable. */ }
  return { original: structuredClone(profiles), draft: structuredClone(profiles) };
}
export default function Profiles({ profiles,onSave,onDirtyChange }: { profiles:Profile[];onSave:(p:Profile[],original:Profile[])=>Promise<void>;onDirtyChange:(dirty:boolean)=>void }) {
  const [initial]=useState(()=>restoreDraft(profiles));
  const [original,setOriginal]=useState(initial.original);
  const [draft,setDraft]=useState(initial.draft);const [active,setActive]=useState('anne');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  const dirty=JSON.stringify(draft)!==JSON.stringify(original);
  useEffect(()=>{onDirtyChange(dirty);},[dirty,onDirtyChange]);
  useEffect(()=>{if(!dirty){setOriginal(profiles);setDraft(profiles);}},[profiles,dirty]);
  useEffect(()=>{
    try { if(dirty)sessionStorage.setItem(draftKey,JSON.stringify({original,draft}));else sessionStorage.removeItem(draftKey); } catch { /* Mounted editor keeps the draft in memory. */ }
    if(!dirty)return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[draft,original,dirty]);
  const profile=draft.find(p=>p.id===active)!;
  const change=(patch:Partial<Profile>)=>{setDraft(d=>d.map(p=>p.id===active?{...p,...patch}:p));setMessage('');};
  return <section className="kitchen-panel profile-panel"><h2><Users size={24}/>Eure Profile</h2><div className="profile-tabs">{draft.map(p=><button disabled={busy} className={p.id===active?'active':''} aria-pressed={p.id===active} key={p.id} onClick={()=>setActive(p.id)}>{p.name}</button>)}</div>
    <form onSubmit={async e=>{e.preventDefault();setBusy(true);try{await onSave(draft,original);setOriginal(structuredClone(draft));setMessage('Profile gespeichert.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}}>
      <fieldset disabled={busy}><label>Tagesziel in kcal <span className="optional">optional</span><input type="number" min={1} max={10000} step={1} inputMode="numeric" value={profile.calories??''} placeholder="Deine eigene Vorgabe" onChange={e=>change({calories:e.target.value?Number(e.target.value):null})}/></label><p className="field-hint">Eigene Orientierung, keine automatisch berechnete Empfehlung. Leer lassen, wenn du kein Kalorienziel nutzen möchtest.</p>
      <div className="filters">{diets.map(d=><button key={d} type="button" aria-pressed={profile.diets.includes(d)} className={profile.diets.includes(d)?'active':''} onClick={()=>change({diets:profile.diets.includes(d)?profile.diets.filter(x=>x!==d):[...profile.diets,d]})}>{d}</button>)}</div>
      <label>Das mag {profile.name}<textarea rows={3} maxLength={2000} value={profile.preferences} onChange={e=>change({preferences:e.target.value})} placeholder="Zum Beispiel mediterran, mild, viel Gemüse, schnelle Gerichte …"/></label>
      <label>Diese Zutaten vermeiden<input maxLength={1000} value={profile.excluded} onChange={e=>change({excluded:e.target.value})} placeholder="Zum Beispiel Erdnüsse, Sellerie, Pilze"/></label>
      <p className="fineprint">Zutaten mit Komma trennen. Bei Unverträglichkeiten Zutaten und Verpackungsangaben zusätzlich prüfen; Rezeptvorschläge sind keine Allergenprüfung.</p></fieldset><div className={`profile-save-bar ${dirty?'has-draft':''}`}><p role="status">{dirty?'Ungespeicherter Entwurf · bleibt beim Bereichswechsel erhalten':message||'Alle Änderungen gespeichert'}</p><div className="button-row"><button className="btn primary" disabled={busy||!dirty}><Check size={18}/>{busy?'Wird gespeichert …':'Profile speichern'}</button>{dirty&&<button type="button" className="text-btn" disabled={busy} onClick={()=>{setDraft(profiles);setOriginal(profiles);setMessage('Entwurf verworfen.');}}>Entwurf verwerfen</button>}</div>{dirty&&message&&<p className="notice error" role="alert">{message}</p>}</div>
    </form></section>;
}
