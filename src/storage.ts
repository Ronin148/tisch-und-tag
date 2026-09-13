import { createStore, get, set } from 'idb-keyval';
import { initialData } from './seed';
import { validateBackup } from './domain';
import type { AppData } from './types';

const db = createStore('tisch-und-tag', 'kochbuch');
let pending = Promise.resolve();
export async function loadData(): Promise<AppData> {
  const saved = await get('data', db);
  return saved === undefined ? initialData() : validateBackup(saved);
}
export function saveData(data: AppData): Promise<void> {
  const next = pending.catch(() => {}).then(() => set('data', data, db));
  pending = next; return next;
}
export function downloadBackup(data: AppData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = href; a.download = `tisch-und-tag-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
