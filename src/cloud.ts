import { createClient } from '@supabase/supabase-js';
import { get, set, createStore } from 'idb-keyval';
import { validateBackup } from './domain';
import type { AppData } from './types';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloud = url && key ? createClient(url, key) : null;
const meta = createStore('tisch-und-tag-sync', 'revisionen');
export async function cloudUser() { if (!cloud) return null; const { data, error } = await cloud.auth.getUser(); if (error) return null; return data.user; }
export async function sendLogin(email: string) {
  if (!cloud) throw new Error('Die geräteübergreifende Speicherung ist noch nicht eingerichtet.');
  const { error } = await cloud.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + import.meta.env.BASE_URL } });
  if (error) throw new Error('Der Anmeldelink konnte nicht gesendet werden. Bitte E-Mail-Adresse und Verbindung prüfen.');
}
export async function pushCloud(data: AppData): Promise<void> {
  const user = await cloudUser(); if (!cloud || !user) throw new Error('Bitte zuerst anmelden.');
  if (JSON.stringify(data).length > 15_000_000) throw new Error('Das Kochbuch ist für diese erste Cloud-Version zu gross. Bitte eine Sicherung herunterladen.');
  const revision: number | undefined = await get(user.id, meta);
  const next = (revision ?? 0) + 1;
  const row = { user_id: user.id, data, revision: next, updated_at: new Date().toISOString() };
  if (revision === undefined) {
    const { error } = await cloud.from('tisch_kochbuch').insert(row);
    if (error?.code === '23505') throw new Error('Es gibt bereits einen Cloud-Stand. Lade ihn zuerst herunter, bevor du Änderungen von diesem Gerät hochlädst. Deine lokalen Daten bleiben erhalten.');
    if (error) throw new Error('Die Cloud-Sicherung konnte nicht gespeichert werden. Deine lokalen Daten bleiben erhalten.');
  } else {
    const { data: rows, error } = await cloud.from('tisch_kochbuch').update(row).eq('user_id', user.id).eq('revision', revision).select('revision');
    if (error) throw new Error('Die Cloud ist gerade nicht erreichbar. Deine lokalen Daten bleiben erhalten.');
    if (!rows?.length) throw new Error('Auf einem anderen Gerät wurde etwas geändert. Sichere deinen lokalen Stand und lade dann den aktuellen Cloud-Stand herunter.');
  }
  await set(user.id, next, meta);
}
export async function pullCloud(): Promise<{ data: AppData; revision: number; userId: string }> {
  const user = await cloudUser(); if (!cloud || !user) throw new Error('Bitte zuerst anmelden.');
  const { data, error } = await cloud.from('tisch_kochbuch').select('data,revision').eq('user_id', user.id).maybeSingle();
  if (error) throw new Error('Der Cloud-Stand konnte nicht geladen werden.');
  if (!data) throw new Error('Noch keine Cloud-Sicherung vorhanden. Lade dein Kochbuch zuerst hoch.');
  return { data: validateBackup(data.data), revision: data.revision, userId: user.id };
}
export async function acceptCloudRevision(userId: string, revision: number) { await set(userId, revision, meta); }
