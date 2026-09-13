import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ShoppingBasket, Plus, Search, ChevronLeft, ChevronRight, ArrowRight, Leaf, Heart, Clock, Camera, ClipboardPaste, Check, X, Settings2, Smartphone, Sprout, Download, Copy, Trash2, LoaderCircle, Utensils, WifiOff, Compass, Link as LinkIcon } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import type { AppData, Recipe, View } from './types';
import { addDays, blankRecipe, ingredientText, isChecked, localDate, monday, shoppingList, shoppingSignature, uid, weekDates, weekLabel, validateBackup } from './domain';
import { loadData, saveData } from './storage';
import { Modal, Portions, RecipeCard, RecipeDetail, RecipeEditor, RecipeImage } from './components';
import Settings from './Settings';
import Discover from './Discover';
import Kitchen from './Household';
import AIPlanner from './AIPlanner';
import { useFamilySync, markFamilyDirty } from './family-sync';
import { SetupFamily } from './FamilyPanel';
import { MealPrepBatches, MealPrepEditor } from './MealPrep';
import CookingMode from './CookingMode';

const nav = [{ id: 'discover', label: 'Entdecken', mobile: 'Ideen', icon: Compass }, { id: 'recipes', label: 'Meine Rezepte', mobile: 'Rezepte', icon: BookOpen }, { id: 'plan', label: 'Wochenplan', mobile: 'Plan', icon: CalendarDays }, { id: 'shopping', label: 'Einkaufsliste', mobile: 'Einkauf', icon: ShoppingBasket }, { id: 'kitchen', label: 'Unsere Küche', mobile: 'Küche', icon: Utensils }] as const;
type EditorState = { recipe?: Recipe; tab: 'photo' | 'link' | 'text' | 'manual' };

function WeekPicker({ week, setWeek }: { week: string; setWeek: (s: string) => void }) {
  return <div className="week-picker"><button className="icon-btn" aria-label="Vorherige Woche" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft size={19} /></button><button className="week-label" title="Zur aktuellen Woche" onClick={() => setWeek(monday())}>{weekLabel(week)}</button><button className="icon-btn" aria-label="Nächste Woche" onClick={() => setWeek(addDays(week, 7))}><ChevronRight size={19} /></button></div>;
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null); const dataRef = useRef<AppData | null>(null);
  const [bootError, setBootError] = useState(''); const [saveError, setSaveError] = useState('');
  const [view, setView] = useState<View>('recipes'); const [week, setWeek] = useState(monday());
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [sort, setSort] = useState('new'); const [tagFilter, setTagFilter] = useState('Alle');
  const [detailId, setDetailId] = useState<string | null>(null); const [editor, setEditor] = useState<EditorState | null>(null);
  const [planDialog, setPlanDialog] = useState<{ recipeId: string; day: string; servings: number } | null>(null);
  const [planning, setPlanning] = useState(false);
  const [aiPlanner, setAiPlanner] = useState(false); const [mealPrep, setMealPrep] = useState(false);
  const [cookingBatch, setCookingBatch] = useState<{recipe: Recipe; servings: number} | null>(null);
  const [kitchenTab, setKitchenTab] = useState('pantry');
  const [setupToken, setSetupToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('einrichten') || '');
  useEffect(() => { if (setupToken) window.history.replaceState(null, '', window.location.pathname + window.location.search); }, []);
  const family = useFamilySync(dataRef, async next => { dataRef.current = next; setData(next); await saveData(next); });
  const [chooseDay, setChooseDay] = useState<string | null>(null); const [chooseSearch, setChooseSearch] = useState('');
  const [settings, setSettings] = useState(false); const [extra, setExtra] = useState(''); const [toast, setToast] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [undo, setUndo] = useState<{ recipe: Recipe; plan: AppData['plan'] } | null>(null);
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW();
  useEffect(() => { let active = true; void loadData().then(d => { if (active) { dataRef.current = d; setData(d); } }).catch(() => { if (active) setBootError('Deine gespeicherten Daten konnten nicht geöffnet werden. Bitte erlaube die lokale Speicherung im Browser und lade die Seite neu. Es wurde nichts überschrieben.'); }); return () => { active = false; }; }, []);
  useEffect(() => { const on = () => setOnline(navigator.onLine); window.addEventListener('online', on); window.addEventListener('offline', on); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', on); }; }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);

  async function commit(update: AppData | ((d: AppData) => AppData)) {
    if (!dataRef.current) return;
    const next = typeof update === 'function' ? update(dataRef.current) : update;
    validateBackup(next);
    markFamilyDirty();
    // Keep the visible state even on quota failure, and explicitly ask the user to export it.
    dataRef.current = next; setData(next);
    try { await saveData(next); setSaveError(''); } catch { setSaveError('Die letzte Änderung konnte nicht dauerhaft gespeichert werden. Bitte lade unter „Mein Kochbuch“ eine Sicherung herunter.'); throw new Error('Speichern fehlgeschlagen. Bitte eine Sicherung herunterladen; deine Eingaben sind noch geöffnet.'); }
  }
  const mutate = (update: (d: AppData) => AppData) => { void commit(update).catch(() => {}); };
  const favorite = (id: string) => mutate(d => ({ ...d, recipes: d.recipes.map(r => r.id === id ? { ...r, favorite: !r.favorite } : r) }));
  const showView = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const items = useMemo(() => data ? shoppingList(data, week) : [], [data, week]);
  const checkedCount = data ? items.filter(i => isChecked(data, week, i)).length : 0;
  const plannedCount = data ? weekDates(week).reduce((n, day) => n + (data.plan[day]?.length || 0), 0) : 0;
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.recipes.filter(r => (tagFilter === 'Alle' || r.tags.includes(tagFilter)) && (!search || `${r.title} ${r.description} ${r.tags.join(' ')} ${r.ingredients.map(i => i.name).join(' ')}`.toLocaleLowerCase('de').includes(search.toLocaleLowerCase('de'))) && (filter === 'all' || filter === 'favorites' && r.favorite || filter === 'mine' && !r.sample || filter === 'quick' && r.minutes !== null && r.minutes <= 30)).sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title, 'de') : sort === 'time' ? (a.minutes ?? Infinity) - (b.minutes ?? Infinity) : Number(a.sample) - Number(b.sample) || b.createdAt.localeCompare(a.createdAt));
  }, [data, search, filter, sort, tagFilter]);
  const detail = data?.recipes.find(r => r.id === detailId);
  function startPlan(recipe: Recipe, servings = recipe.servings, day = week === monday() ? localDate(new Date()) : week) { setPlanDialog({ recipeId: recipe.id, day, servings }); setDetailId(null); setChooseDay(null); }
  async function addToPlan() {
    if (!planDialog || planning) return;
    setPlanning(true);
    try { await commit(d => ({ ...d, plan: { ...d.plan, [planDialog.day]: [...(d.plan[planDialog.day] || []), { id: uid(), recipeId: planDialog.recipeId, servings: planDialog.servings }] } })); setWeek(monday(new Date(`${planDialog.day}T12:00:00`))); setPlanDialog(null); setToast('Rezept eingeplant. Die Einkaufsliste ist aktualisiert.'); } catch { /* persistent banner */ } finally { setPlanning(false); }
  }
  async function saveRecipe(recipe: Recipe) {
    if (editor?.recipe && JSON.stringify(dataRef.current?.recipes.find(r => r.id === recipe.id)) !== JSON.stringify(editor.recipe)) throw new Error('Dieses Rezept wurde inzwischen auf einem anderen Gerät geändert. Deine Eingaben bleiben geöffnet; bitte sichere deinen Text und öffne danach den aktuellen Rezeptstand.');
    await commit(d => ({ ...d, recipes: d.recipes.some(r => r.id === recipe.id) ? d.recipes.map(r => r.id === recipe.id ? recipe : r) : [recipe, ...d.recipes] }));
    setEditor(null); setDetailId(recipe.id); setToast('Dein Rezept ist gespeichert.');
  }
  function deleteRecipe(recipe: Recipe) {
    if (!data) return; setUndo({ recipe, plan: data.plan });
    mutate(d => ({ ...d, recipes: d.recipes.filter(r => r.id !== recipe.id), plan: Object.fromEntries(Object.entries(d.plan).map(([day, entries]) => [day, entries.filter(e => e.recipeId !== recipe.id)])) })); setDetailId(null);
  }
  async function copyShopping() {
    if (!data) return; const text = `Einkaufsliste · ${weekLabel(week)}\n\n${items.map(i => `${isChecked(data, week, i) ? '✓' : '☐'} ${ingredientText(i)}`).join('\n')}`;
    try { await navigator.clipboard.writeText(text); setToast('Einkaufsliste kopiert.'); } catch { const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'einkaufsliste.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('Einkaufsliste als Textdatei heruntergeladen.'); }
  }

  if (!data) return <main className="boot"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width="60" /><h1>Tisch & Tag</h1>{bootError ? <><p role="alert">{bootError}</p><button className="btn primary" onClick={() => location.reload()}>Neu laden</button></> : <p className="inline"><LoaderCircle className="spin" size={18} />Dein Kochbuch wird geöffnet …</p>}</main>;
  return <div className="app-shell">
    <a className="skip-link" href="#main">Zum Inhalt</a>
    <aside className="sidebar"><button className="brand" onClick={() => showView('recipes')} aria-label="Tisch und Tag – Start"><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" /><span>Tisch <span className="amp">&</span> Tag<small>GUT ESSEN. EINFACH LEBEN.</small></span></button>
      <div className="nav-caption">DEINE KÜCHE</div><nav aria-label="Hauptnavigation">{nav.map(n => <button key={n.id} className={`nav-item ${view === n.id ? 'active' : ''}`} aria-current={view === n.id ? 'page' : undefined} onClick={() => showView(n.id)}><n.icon size={20} strokeWidth={1.7} /><span>{n.label}</span>{n.id === 'shopping' && items.length > 0 && <span className="nav-count">{items.length - checkedCount}</span>}</button>)}</nav>
      <div className="sidebar-note"><Sprout size={31} strokeWidth={1.3} /><h3>Ein guter Tag beginnt<br />mit etwas Gutem.</h3><p>Deine Lieblingsrezepte.<br />Ein bisschen Planung.<br />Mehr Zeit zum Geniessen.</p></div>
      <button className="account-btn" onClick={() => setSettings(true)}><span className="account-avatar"><Utensils size={17} /></span><span>Mein Kochbuch<small>Sicherung & Geräte</small></span><Settings2 size={17} /></button>
    </aside>
    <div className="mobile-top"><button className="brand" onClick={() => showView('recipes')}><img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" /><span>Tisch <span className="amp">&</span> Tag</span></button><button className="icon-btn" aria-label="Mein Kochbuch – Sicherung und Geräte" onClick={() => setSettings(true)}><Settings2 size={21} /></button></div>
    <main id="main" className="main-content">
      <header className="topline"><span>DEIN PERSÖNLICHES KOCHBUCH</span><button onClick={() => setSettings(true)}><span className="status-dot" /><Smartphone size={14} />Auf diesem Gerät</button></header>
      {family.conflict && <div className="notice"><p>Es gibt Änderungen auf mehreren Geräten.</p><button className="btn" onClick={() => {setKitchenTab('family'); showView('kitchen');}}>Familienstand abgleichen</button></div>}
      {!online && <div className="notice inline"><WifiOff size={18} />Du bist offline. Dein gespeichertes Kochbuch ist weiter da.</div>}
      {saveError && <div className="notice error" role="alert">{saveError}<button className="text-btn" onClick={() => setSettings(true)}>Sicherung öffnen <ArrowRight size={15} /></button></div>}
      {view === 'kitchen' && <Kitchen key={kitchenTab} data={data} family={family} initialTab={kitchenTab} onChange={commit} onAdd={saveRecipe} onOpen={setDetailId} />}
      {view === 'discover' && <Discover ownRecipes={data.recipes} onAdd={async r => { await commit(d => ({ ...d, recipes: d.recipes.some(x => x.id === r.id) ? d.recipes : [r, ...d.recipes] })); setToast('Rezept samt Bild in deinem Kochbuch gespeichert.'); }} onOpenOwn={id => setDetailId(id)} />}
      {view === 'recipes' && <>
        <section className="hero"><div className="hero-copy"><div className="hero-eyebrow"><Leaf size={15} />DEINE KÜCHE. DEIN RHYTHMUS.</div><h1>Weniger überlegen.<br />Mehr <em>geniessen.</em></h1><p>Deine liebsten Rezepte an einem Ort.<br />Und eine gute Antwort auf „Was essen wir heute?“</p><button className="btn primary" onClick={() => setEditor({ tab: 'photo' })}><Plus size={18} />Rezept hinzufügen</button></div><div className="hero-photo"><img src={`${import.meta.env.BASE_URL}images/bowl.webp`} alt="Bunte Schale mit frischem Gemüse" /><span className="hero-photo-note"><Sprout size={17} />Gutes Essen, ganz einfach.</span></div><div className="hero-decoration" aria-hidden="true">✳</div></section>
        <div className="section-heading"><div className="section-title"><h2>Deine Rezeptsammlung</h2><span className="count-pill">{data.recipes.length}</span></div><div className="quick-import"><button onClick={() => setEditor({ tab: 'photo' })}><Camera size={17} />Foto scannen</button><span /><button onClick={() => setEditor({ tab: 'link' })}><LinkIcon size={17} />Link importieren</button><span /><button onClick={() => setEditor({ tab: 'text' })}><ClipboardPaste size={17} />Text einfügen</button></div></div>
        <div className="collection-tools"><div className="search-field"><Search size={19} /><input aria-label="Rezepte suchen" placeholder="Nach Rezept oder Zutat suchen …" value={search} onChange={e => setSearch(e.target.value)} />{search && <button className="icon-btn" aria-label="Suche löschen" onClick={() => setSearch('')}><X size={16} /></button>}</div><label className="sort-label"><span className="sr-only">Rezepte sortieren</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="new">Zuletzt hinzugefügt</option><option value="az">Name A–Z</option><option value="time">Kürzeste Zubereitung</option></select></label></div>
        <div className="filters" aria-label="Rezeptfilter">{[{ id: 'all', label: 'Alle Rezepte', icon: BookOpen }, { id: 'favorites', label: 'Lieblingsrezepte', icon: Heart }, { id: 'mine', label: 'Meine eigenen', icon: PencilIcon }, { id: 'quick', label: 'Bis 30 Minuten', icon: Clock }].map(f => <button className={filter === f.id ? 'active' : ''} aria-pressed={filter === f.id} key={f.id} onClick={() => setFilter(f.id)}><f.icon size={15} />{f.label}</button>)}</div>
        {data.recipes.some(r => r.tags.length) && <div className="tag-filter"><label>Schlagwort<select aria-label="Nach Schlagwort filtern" value={tagFilter} onChange={e => setTagFilter(e.target.value)}><option>Alle</option>{[...new Set(data.recipes.flatMap(r => r.tags))].sort().map(t => <option key={t}>{t}</option>)}</select></label></div>}{filtered.length ? <div className="recipe-grid">{filtered.map(r => <RecipeCard key={r.id} recipe={r} onOpen={() => setDetailId(r.id)} onFavorite={() => favorite(r.id)} onPlan={() => startPlan(r)} />)}</div> : <div className="empty-state"><BookOpen size={40} strokeWidth={1.3} /><h3>{search ? 'Noch kein Treffer.' : filter === 'favorites' ? 'Platz für deine Lieblinge.' : 'Hier beginnt deine Sammlung.'}</h3><p>{search ? 'Probiere einen anderen Namen oder eine Zutat.' : filter === 'favorites' ? 'Tippe auf das Herz bei einem Rezept, um es hier zu sammeln.' : 'Fotografiere deine erste Rezeptseite oder füge einen Rezepttext ein.'}</p><button className="btn primary" onClick={() => search ? setSearch('') : setEditor({ tab: 'photo' })}>{search ? 'Suche zurücksetzen' : 'Rezept hinzufügen'}</button>{!search && <button className="text-btn" onClick={() => showView('discover')}>Oder neue Rezepte entdecken <ArrowRight size={15} /></button>}</div>}
        {data.recipes.some(r => r.sample) && <p className="collection-footnote"><Sprout size={16} />Ein paar Beispielrezepte helfen beim Start. Deine eigenen kommen einfach dazu.</p>}
      </>}
      {view === 'plan' && <>
        <div className="page-title"><div className="eyebrow">EIN BISSCHEN VORFREUDE</div><h1>Deine Woche, gut geplant.</h1><p>Ein Lieblingsrezept für jeden Tag. Die Einkaufsliste denkt mit.</p></div>
        <div className="section-heading"><WeekPicker week={week} setWeek={setWeek} /><span className="muted small">{plannedCount} {plannedCount === 1 ? 'Gericht' : 'Gerichte'} eingeplant</span></div>
        <div className="button-row plan-tools"><button className="btn primary" onClick={() => setAiPlanner(true)}>Woche mit KI planen</button><button className="btn" disabled={!data.recipes.length} onClick={() => setMealPrep(true)}>Meal Prep planen</button><button className="text-btn" onClick={() => {setKitchenTab('profiles'); showView('kitchen');}}>Profile & Vorlieben</button></div>
        <MealPrepBatches data={data} week={week} onCook={(recipe, servings) => setCookingBatch({recipe,servings})} />
        <div className="plan-layout"><section className="week-days" aria-label="Wochenplan">{weekDates(week).map(day => {
          const date = new Date(`${day}T12:00:00`); const today = day === localDate(new Date());
          return <article className={`day-card ${today ? 'today' : ''}`} key={day}><div className="day-heading"><span>{date.toLocaleDateString('de-DE', { weekday: 'long' })}<small>{date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</small></span>{today && <span className="today-label">Heute</span>}</div><div className="day-meals">{(data.plan[day] || []).map(entry => { const r = data.recipes.find(x => x.id === entry.recipeId); if (!r) return null; return <div className="planned-meal" key={entry.id}><button className="planned-recipe" onClick={() => setDetailId(r.id)}><RecipeImage recipe={r} /><span><strong>{r.title}</strong><small>{r.minutes ? `${r.minutes} Min. · ` : ''}{entry.servings} Portionen{entry.slot ? ` · ${entry.slot}` : ''}{entry.batchId ? ' · Meal Prep' : ''}{entry.kcalPerServing ? ` · ca. ${Math.round(entry.kcalPerServing)} kcal/Port. (geschätzt)` : ''}</small></span></button><div className="planned-actions"><label className="sr-only" htmlFor={`portion-${entry.id}`}>Portionen für {r.title} am {day}</label><select id={`portion-${entry.id}`} value={entry.servings} onChange={e => mutate(d => ({ ...d, plan: { ...d.plan, [day]: d.plan[day].map(x => x.id === entry.id ? { ...x, servings: Number(e.target.value) } : x) } }))}>{Array.from({ length: 100 }, (_, i) => <option key={i} value={i + 1}>{i + 1} Pers.</option>)}</select><button className="icon-btn" aria-label={`${r.title} am ${day} aus dem Plan entfernen`} onClick={() => mutate(d => ({ ...d, plan: { ...d.plan, [day]: d.plan[day].filter(x => x.id !== entry.id) } }))}><X size={17} /></button></div></div>; })}<button className="add-meal" onClick={() => { setChooseSearch(''); setChooseDay(day); }}><Plus size={16} />{data.plan[day]?.length ? 'Weiteres Rezept' : 'Rezept auswählen'}</button></div></article>;
        })}</section><aside className="plan-aside"><div className="shopping-summary"><span className="round-icon"><ShoppingBasket size={28} strokeWidth={1.5} /></span><h2>Plan steht.<br />Liste auch.</h2><p>Alle Zutaten deiner geplanten Gerichte landen automatisch auf deiner Einkaufsliste.</p><div className="summary-number"><strong>{items.length - checkedCount}</strong><span>Zutaten noch offen</span></div><button className="btn primary full" onClick={() => showView('shopping')}>Zur Einkaufsliste <ArrowRight size={17} /></button></div><div className="little-tip"><Leaf size={21} /><p><strong>Einmal kochen, zweimal freuen.</strong>Plane eine Portion mehr ein und geniesse die Reste am nächsten Tag.</p></div></aside></div>
      </>}
      {view === 'shopping' && <>
        <div className="page-title"><div className="eyebrow">ALLES DABEI. KOPF FREI.</div><h1>Deine Einkaufsliste.</h1><p>Aus deinem Wochenplan. Was du schon hast, hakst du einfach ab.</p></div>
        <div className="section-heading"><WeekPicker week={week} setWeek={setWeek} /><button className="btn" disabled={!items.length} onClick={() => void copyShopping()}><Copy size={17} />Liste kopieren</button></div>
        <div className="shopping-layout"><section className="shopping-paper"><div className="shopping-progress"><div><ShoppingBasket size={20} /><strong>{items.length - checkedCount} {items.length - checkedCount === 1 ? 'Zutat fehlt' : 'Zutaten fehlen'} noch</strong><span>{checkedCount} von {items.length} erledigt</span></div><progress value={checkedCount} max={items.length || 1} /></div>
          {items.length ? [...new Set(items.map(i => i.category))].map(cat => <div className="shopping-category" key={cat}><h3>{cat}<span>{items.filter(i => i.category === cat).length}</span></h3>{items.filter(i => i.category === cat).map(i => <div className={`shopping-item ${isChecked(data, week, i) ? 'checked' : ''}`} key={i.key}><label><input type="checkbox" checked={isChecked(data, week, i)} onChange={() => mutate(d => { const checked = { ...d.checked }; const key = `${week}|${i.key}`; if (isChecked(d, week, i)) delete checked[key]; else checked[key] = shoppingSignature(i); return { ...d, checked }; })} /><span className="custom-check"><Check size={14} /></span><span className="shopping-name"><strong>{i.name}</strong><small>{i.recipeTitles.length ? i.recipeTitles.join(' · ') : 'Selbst ergänzt'}</small></span><span className="shopping-amount">{i.amount === null ? i.extraId ? '' : 'nach Bedarf / prüfen' : ingredientText({ ...i, name: '' })}</span></label>{i.extraId && <button className="icon-btn" aria-label={`${i.name} entfernen`} onClick={() => mutate(d => ({ ...d, extras: d.extras.filter(e => e.id !== i.extraId) }))}><X size={16} /></button>}</div>)}</div>) : <div className="empty-state compact"><ShoppingBasket size={42} strokeWidth={1.2} /><h3>Deine Liste wartet auf dich.</h3><p>Plane ein Rezept ein oder ergänze unten, was du einkaufen möchtest.</p><button className="btn primary" onClick={() => showView('plan')}>Woche planen <ArrowRight size={16} /></button></div>}
          <form className="add-shopping" onSubmit={e => { e.preventDefault(); if (!extra.trim()) return; mutate(d => ({ ...d, extras: [...d.extras, { id: uid(), name: extra.trim(), week }] })); setExtra(''); }}><Plus size={19} /><input aria-label="Eigene Zutat ergänzen" maxLength={200} value={extra} onChange={e => setExtra(e.target.value)} placeholder="Was brauchst du sonst noch?" /><button type="submit" className="btn primary" disabled={!extra.trim()}>Hinzufügen</button></form>
        </section><aside className="shopping-aside"><div className="little-tip"><Leaf size={24} /><p><strong>Erst ein Blick in den Vorrat.</strong>Schon zu Hause? Einfach abhaken. Die Liste bleibt gespeichert, auch wenn du die App schliesst.</p></div>{plannedCount > 0 && <div className="list-origin"><CalendarDays size={21} /><strong>Für {plannedCount} geplante {plannedCount === 1 ? 'Mahlzeit' : 'Mahlzeiten'}</strong><button className="text-btn" onClick={() => showView('plan')}>Wochenplan ansehen <ArrowRight size={15} /></button></div>}{weekDates(week).some(day => data.plan[day]?.some(e => !data.recipes.find(r => r.id === e.recipeId)?.ingredients.length)) && <div className="notice">Bei mindestens einem geplanten Rezept fehlen noch Zutaten. Ergänze sie im Rezept, damit die Liste vollständig ist.</div>}</aside></div>
      </>}
      <footer className="page-footer"><span>Tisch & Tag</span><span>Ein guter Platz für gutes Essen.</span></footer>
    </main>
    <nav className="mobile-nav" aria-label="Mobile Hauptnavigation">{nav.map(n => <button key={n.id} className={view === n.id ? 'active' : ''} aria-current={view === n.id ? 'page' : undefined} onClick={() => showView(n.id)}><n.icon size={21} /><span>{n.mobile}</span></button>)}</nav>
    {detail && <RecipeDetail recipe={detail} onClose={() => setDetailId(null)} onEdit={() => { setDetailId(null); setEditor({ recipe: detail, tab: 'manual' }); }} onPlan={servings => startPlan(detail, servings)} onDelete={() => deleteRecipe(detail)} onFavorite={() => favorite(detail.id)} />}
    {editor && <RecipeEditor recipe={editor.recipe} initialTab={editor.tab} onClose={() => setEditor(null)} onSave={saveRecipe} />}
    {planDialog && <Modal title="Ein Platz in deiner Woche" onClose={() => setPlanDialog(null)}><div className="modal-body plan-modal"><h3>{data.recipes.find(r => r.id === planDialog.recipeId)?.title}</h3><label>An welchem Tag?<input type="date" required value={planDialog.day} onChange={e => setPlanDialog({ ...planDialog, day: e.target.value })} /></label><div><p className="field-label">Für wie viele?</p><Portions value={planDialog.servings} onChange={servings => setPlanDialog({ ...planDialog, servings })} /></div><p className="fineprint">Die Zutaten werden passend zu den Portionen in deine Einkaufsliste übernommen.</p></div><div className="modal-footer"><button className="btn" onClick={() => setPlanDialog(null)}>Abbrechen</button><button className="btn primary" disabled={planning || !/^\d{4}-\d{2}-\d{2}$/.test(planDialog.day)} onClick={() => void addToPlan()}><Check size={18} />Einplanen</button></div></Modal>}
    {chooseDay && <Modal title={`Was gibt’s am ${new Date(`${chooseDay}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'long' })}?`} onClose={() => setChooseDay(null)}><div className="modal-body"><div className="search-field"><Search size={18} /><input autoFocus aria-label="Rezept für den Wochenplan suchen" placeholder="Dein Rezept suchen …" value={chooseSearch} onChange={e => setChooseSearch(e.target.value)} /></div><div className="recipe-chooser">{data.recipes.filter(r => r.title.toLocaleLowerCase('de').includes(chooseSearch.toLocaleLowerCase('de'))).map(r => <button key={r.id} onClick={() => startPlan(r, r.servings, chooseDay)}><RecipeImage recipe={r} /><span><strong>{r.title}</strong><small>{r.minutes ? `${r.minutes} Min. · ` : ''}{r.servings} Portionen</small></span><Plus size={19} /></button>)}</div>{!data.recipes.length && <p>Füge zuerst dein erstes Rezept hinzu.</p>}</div></Modal>}
    {aiPlanner && <AIPlanner data={data} week={week} onClose={() => setAiPlanner(false)} onApply={commit} />}
    {mealPrep && <MealPrepEditor data={data} week={week} onSave={commit} onClose={() => setMealPrep(false)} />}
    {cookingBatch && <CookingMode recipe={cookingBatch.recipe} servings={cookingBatch.servings} onClose={() => setCookingBatch(null)} />}
    {setupToken && <SetupFamily token={setupToken} onDone={family.connect} onClose={() => setSetupToken('')} />}
    {settings && <Settings data={data} onReplace={commit} onClose={() => setSettings(false)} />}
    {toast && <div className="toast" role="status"><Check size={18} />{toast}</div>}
    {undo && <div className="undo-banner" role="status"><span>Rezept entfernt.</span><button onClick={() => { mutate(d => { const plan = { ...d.plan }; for (const [day, entries] of Object.entries(undo.plan)) { const removed = entries.filter(e => e.recipeId === undo.recipe.id); if (removed.length) plan[day] = [...(plan[day] || []), ...removed]; } return { ...d, recipes: [...d.recipes, undo.recipe], plan }; }); setUndo(null); }}>Rückgängig</button><button className="icon-btn" aria-label="Hinweis schliessen" onClick={() => setUndo(null)}><X size={16} /></button></div>}
    {needRefresh && <div className="update-banner" role="status"><span>Eine neue Version ist bereit.</span><button className="btn primary" onClick={() => { if (!editor && !aiPlanner && !mealPrep && !cookingBatch && !setupToken) void updateServiceWorker(true); else setToast('Bitte speichere zuerst dein geöffnetes Rezept.'); }}>Aktualisieren</button><button className="icon-btn" aria-label="Update später" onClick={() => setNeedRefresh(false)}><X size={17} /></button></div>}
  </div>;
}

function PencilIcon({ size = 15 }: { size?: number }) { return <ClipboardPaste size={size} />; }
