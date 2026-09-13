import { useState } from 'react';
import { Cloud, KeyRound, Download, RefreshCw } from 'lucide-react';
import { Modal } from './components';
import { api } from './api';
import type { AppData } from './types';
import type { FamilySync } from './family-sync';
import { downloadBackup } from './storage';

export function FamilyPanel({ family, data }: { family:FamilySync; data:AppData }) {
  const [code,setCode]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  return <section className="kitchen-panel"><h2><Cloud size={24}/>Familie & KI</h2><p>Ein gemeinsames Kochbuch auf iPhone, Android und Computer. Nach dem Verbinden werden Änderungen automatisch abgeglichen, solange die App geöffnet und online ist.</p>
    {family.connected ? <><p className="notice" role="status">{family.status}</p><div className="button-row"><button className="btn primary" disabled={family.busy} onClick={()=>void family.sync()}><RefreshCw size={18}/>Jetzt abgleichen</button><button className="btn" onClick={family.disconnect}>Dieses Gerät trennen</button></div></> : <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await family.connect(code);setCode('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}><label>Privater Familiencode<input type="password" autoComplete="current-password" minLength={16} required value={code} onChange={e=>setCode(e.target.value)}/></label><button className="btn primary" disabled={busy}><KeyRound size={18}/>{busy?'Verbinden …':'Mit Familie verbinden'}</button><p className="fineprint">Den Familiencode auf allen Geräten eingeben. Für die erste Einrichtung nutze den privaten Einrichtungslink aus deinem Chat. Der OpenRouter-API-Schlüssel gehört ausschliesslich auf diese Einrichtungsseite.</p></form>}
    {family.conflict && <div className="notice"><h3>Beide Geräte haben Änderungen</h3><p>Beide Stände bleiben erhalten, bis du dich entscheidest. Sichere zuerst diesen Gerätestand als Datei.</p><div className="button-row"><button className="btn" onClick={()=>downloadBackup(data)}><Download size={18}/>Gerätestand sichern</button><button className="btn" disabled={family.busy} onClick={()=>void family.sync('remote')}>Familienstand auf dieses Gerät laden</button><button className="btn" disabled={family.busy} onClick={()=>void family.sync('local')}>Familienstand durch dieses Gerät ersetzen</button></div></div>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    <p className="fineprint">Bei KI-Aktionen werden die ausgewählten Profile, Rezepttexte und gegebenenfalls Fotos an OpenRouter und das verwendete KI-Modell übertragen. KI-Aufrufe nutzen dein OpenRouter-Guthaben. Der Schlüssel wird verschlüsselt auf dem Server gespeichert.</p>
  </section>;
}
export function SetupFamily({ token,onDone,onClose }: { token:string;onDone:(code:string)=>Promise<void>;onClose:()=>void }) {
  const [key,setKey]=useState('');const [code,setCode]=useState('');const [repeat,setRepeat]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  return <Modal title="Familienküche einrichten" onClose={()=>{if(!busy)onClose();}}><form className="modal-body" onSubmit={async e=>{e.preventDefault();if(code!==repeat){setError('Die Familiencodes stimmen noch nicht überein.');return;}setBusy(true);setError('');try{await api('setup',{apiKey:key,familyCode:code},undefined,token);setKey('');await onDone(code);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>
    <p>Einmal einrichten, danach auf allen Geräten mit eurem Familiencode verbinden.</p>
    <label>OpenRouter-API-Schlüssel<input type="password" autoComplete="off" required maxLength={260} value={key} onChange={e=>setKey(e.target.value)} placeholder="sk-or-v1-…"/></label>
    <label>Neuer Familiencode<input type="password" autoComplete="new-password" minLength={16} maxLength={200} required value={code} onChange={e=>setCode(e.target.value)}/></label><p className="field-hint">Mindestens 16 Zeichen, beispielsweise mehrere zufällige Wörter. Diesen Code mit deiner Familie teilen.</p>
    <label>Familiencode wiederholen<input type="password" autoComplete="new-password" minLength={16} maxLength={200} required value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>
    <p className="fineprint">Der API-Schlüssel wird über eine verschlüsselte Verbindung übertragen und serverseitig verschlüsselt gespeichert. Die KI nutzt dein OpenRouter-Guthaben. Dieser Einrichtungslink funktioniert nur einmal.</p>
    {error&&<p className="notice error" role="alert">{error}</p>}<button className="btn primary full" disabled={busy}>{busy?'Verbindung prüfen …':'Familienküche aktivieren'}</button>
  </form></Modal>;
}
