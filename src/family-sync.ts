import { useEffect, useRef, useState, type RefObject } from 'react';
import { api, familyCode, saveFamilyCode } from './api';
import { validateBackup } from './domain';
import type { AppData } from './types';

type Meta = { etag: string | null; dirty: boolean };
const metaKey = 'tisch-family-sync';
const readMeta = (): Meta => { try { return JSON.parse(localStorage.getItem(metaKey) || 'null') || { etag: null, dirty: false }; } catch { return { etag: null, dirty: true }; } };
const writeMeta = (m: Meta) => localStorage.setItem(metaKey,JSON.stringify(m));
let generation = 0;
export function markFamilyDirty() { generation++; if (familyCode()) writeMeta({ ...readMeta(), dirty: true }); }
export function useFamilySync(dataRef: RefObject<AppData | null>, receive: (d: AppData) => Promise<void>) {
  const [code,setCode] = useState(familyCode);
  const [status,setStatus] = useState(code ? 'Verbindung wird geprüft …' : 'Nur auf diesem Gerät');
  const [conflict,setConflict] = useState(false);
  const [busy,setBusy] = useState(false);
  const busyRef = useRef(false); const receiveRef = useRef(receive); receiveRef.current = receive;
  const run = async (choice?: 'remote' | 'local') => {
    if (!familyCode() || !dataRef.current || busyRef.current || !navigator.onLine) return;
    busyRef.current = true; setBusy(true);
    const startGeneration = generation; const snapshot = dataRef.current; const connectionCode = familyCode();
    try {
      const remote = await api<{etag: string | null}>('family/status');
      if (connectionCode !== familyCode()) return;
      const meta = readMeta();
      if (!choice && remote.etag !== meta.etag && (meta.dirty || !meta.etag && snapshot.recipes.length > 0)) { setConflict(true); setStatus('Änderungen auf beiden Geräten – bitte abgleichen.'); return; }
      if (choice === 'remote' || !choice && remote.etag !== meta.etag && !meta.dirty) {
        const fresh = await api<{etag: string | null; data: unknown}>('family');
        if (connectionCode !== familyCode()) return;
        if (startGeneration !== generation) { setConflict(true); setStatus('Neue lokale Änderungen – bitte erneut abgleichen.'); return; }
        if (fresh.data) await receiveRef.current(validateBackup(fresh.data));
        writeMeta({etag:fresh.etag,dirty:startGeneration !== generation}); setConflict(false); setStatus('Mit der Familie synchronisiert'); return;
      }
      if (choice === 'local' || meta.dirty || !remote.etag) {
        const uploaded = await api<{etag:string}>('family', {etag: remote.etag, data:snapshot});
        if (connectionCode !== familyCode()) return;
        writeMeta({etag:uploaded.etag,dirty:startGeneration !== generation});
      }
      setConflict(false); setStatus('Mit der Familie synchronisiert');
    } catch(e) { setStatus((e as Error).message); }
    finally { busyRef.current=false; setBusy(false); }
  };
  const runRef=useRef(run); runRef.current=run;
  useEffect(() => {
    if (!code) return;
    const tick=()=>{ if(document.visibilityState === 'visible') void runRef.current(); };
    tick(); const timer=setInterval(tick,15000); window.addEventListener('online',tick); document.addEventListener('visibilitychange',tick);
    return()=>{ clearInterval(timer); window.removeEventListener('online',tick); document.removeEventListener('visibilitychange',tick); };
  },[code]);
  async function connect(value:string) { const normalized=value.trim(); await api('family/status',undefined,undefined,normalized); saveFamilyCode(normalized); writeMeta({etag:null,dirty:!!dataRef.current?.recipes.length}); setCode(normalized); setStatus('Verbindung hergestellt'); }
  function disconnect() { saveFamilyCode(''); localStorage.removeItem(metaKey); setCode(''); setConflict(false); setStatus('Nur auf diesem Gerät'); }
  return { connected:!!code,status,conflict,busy,connect,disconnect,sync:run };
}
export type FamilySync = ReturnType<typeof useFamilySync>;
