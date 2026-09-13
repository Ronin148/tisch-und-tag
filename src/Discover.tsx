import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Globe, Plus, Check, LoaderCircle, ArrowUpRight, BookOpen, RefreshCw } from 'lucide-react';
import { RecipeImage, RecipeDetail } from './components';
import { discoverRecipes, keepRecipeImage, searchLiveRecipes } from './discovery';
import type { Recipe } from './types';

export default function Discover({ ownRecipes, onAdd, onOpenOwn }: { ownRecipes: Recipe[]; onAdd: (recipe: Recipe) => Promise<void>; onOpenOwn: (id: string) => void }) {
  const [search, setSearch] = useState(''); const [tag, setTag] = useState('Alle'); const [source, setSource] = useState('de');
  const [showTags,setShowTags]=useState(false);
  const [remote, setRemote] = useState<Recipe[]>([]); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(''); const [error, setError] = useState(''); const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Recipe | null>(null); const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  const available = source === 'de' ? discoverRecipes.filter(r => !r.sample) : source === 'ideas' ? discoverRecipes.filter(r => r.sample) : remote;
  const tags = ['Alle', ...new Set(available.flatMap(r => r.tags))];
  const visible = useMemo(() => available.filter(r => (tag === 'Alle' || r.tags.includes(tag)) && (source === 'web' || `${r.title} ${r.tags.join(' ')} ${r.ingredients.map(i => i.name).join(' ')}`.toLowerCase().includes(search.toLowerCase()))), [available, search, tag, source]);
  const saved = (r: Recipe) => ownRecipes.some(o => o.id === r.id || r.sourceUrl && o.sourceUrl === r.sourceUrl);
  async function add(recipe: Recipe) {
    if (saving) return;
    if (saved(recipe)) { setSelected(null); onOpenOwn(ownRecipes.find(r => r.id === recipe.id || r.sourceUrl && r.sourceUrl === recipe.sourceUrl)!.id); return; }
    setSaving(recipe.id); setError('');
    try { const local = await keepRecipeImage(recipe); await onAdd(local); setSelected(null); } catch (e) { setError((e as Error).message); } finally { setSaving(''); }
  }
  async function loadLive(query = search) {
    controllerRef.current?.abort(); const controller = new AbortController(); controllerRef.current = controller;
    setBusy(true); setError('');
    try { const recipes = await searchLiveRecipes(query, controller.signal); if (!controller.signal.aborted) { setRemote(recipes); setTag('Alle'); setSearched(true); } } catch (e) { if (!controller.signal.aborted) setError((e as Error).message); } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <>
    <div className="page-title compact-title"><h1>Rezepte entdecken</h1><p>Nur deine Auswahl kommt ins Kochbuch.</p></div>
    <div className="source-tabs" aria-label="Rezeptquellen">{[{ id: 'de', label: 'Deutsch' }, { id: 'web', label: 'Websuche' }, { id: 'ideas', label: 'Beispiele' }].map(s => <button key={s.id} aria-pressed={source === s.id} className={source === s.id ? 'active' : ''} onClick={() => { controllerRef.current?.abort(); setSource(s.id); setSearch(''); setTag('Alle'); setBusy(false); setError(''); }}>{s.label}</button>)}</div>
    <form className="collection-tools" onSubmit={e => { e.preventDefault(); if (source === 'web') void loadLive(); }}><div className="search-field"><Search size={18} /><input aria-label="Entdecken durchsuchen" placeholder={source === 'web' ? 'Englischer Suchbegriff, z. B. curry, salad, chicken …' : 'Rezept, Zutat oder Schlagwort …'} value={search} onChange={e => setSearch(e.target.value)} /></div>{source === 'web' && <button className="btn primary" disabled={busy}><Globe size={17} />Suchen</button>}</form>
    <div className="filters discover-tags">{(showTags?tags:[...new Set([...tags.slice(0,3),tag])]).map(t => <button key={t} className={t === tag ? 'active' : ''} aria-pressed={t === tag} onClick={() => setTag(t)}>{t}</button>)}{tags.length>3&&<button aria-expanded={showTags} onClick={()=>setShowTags(!showTags)}>{showTags?'Weniger':'Filter'}</button>}</div>
    {source === 'de' && <details className="discovery-info"><summary>{available.length} deutsche Rezepte · Infos zur Quelle</summary><p className="discovery-note">Aus Wikibooks, mit Quellenangabe und gekennzeichneten Symbolbildern. Tags sind Orientierung; „Low Carb“ ist keine berechnete Nährwertangabe.</p></details>}
    {source === 'web' && <p className="discovery-note">Live-Rezepte mit Originalbildern von TheMealDB. Die Quelle liefert englische Texte. Portionszahlen und Zubereitungszeit fehlen dort häufig – bitte beim Übernehmen ergänzen.</p>}
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy ? <div className="empty-state"><LoaderCircle size={32} className="spin" /><p>Neue Rezepte werden gesucht …</p></div> : visible.length ? <div className="recipe-grid">{visible.map(r => <article className="recipe-card discovery-card" key={r.id}><div className="card-image"><button className="image-button" aria-label={`${r.title} ansehen`} onClick={() => setSelected(r)}><RecipeImage recipe={r} /></button><span className="sample-label">{source === 'de' ? 'Symbolbild' : source === 'web' ? 'Originalbild' : 'Serviervorschlag'}</span>{saved(r) && <span className="saved-badge"><Check size={13} />Im Kochbuch</span>}</div><div className="card-body"><div className="card-tags">{r.tags.slice(0,3).map(t => <span key={t}>{t}</span>)}</div><h3><button onClick={() => setSelected(r)}>{r.title}</button></h3><div className="discovery-source"><Globe size={12} />{source === 'de' ? 'Wikibooks · Deutsch' : source === 'web' ? 'TheMealDB · Englisch' : 'Tisch & Tag'}</div><button className={`btn full ${saved(r) ? '' : 'primary'}`} disabled={!!saving} onClick={() => void add(r)}>{saving === r.id ? <LoaderCircle className="spin" size={15} /> : saved(r) ? <BookOpen size={15} /> : <Plus size={15} />}{saved(r) ? 'Im Kochbuch öffnen' : 'Ins Kochbuch'}</button></div></article>)}</div> : <div className="empty-state"><Globe size={39} strokeWidth={1.2} /><h3>{source === 'web' && !searched ? 'Worauf hast du Appetit?' : 'Noch kein passendes Rezept.'}</h3><p>{source === 'web' ? 'Suche zum Beispiel nach curry, pasta oder salad. Mit einem Klick speicherst du dein Lieblingsrezept samt Bild.' : 'Probiere einen anderen Suchbegriff oder entferne den Tagfilter.'}</p>{source === 'web' && <button className="btn primary" onClick={() => { setSearch(''); void loadLive(''); }}><RefreshCw size={16} />Rezepte entdecken</button>}</div>}
    {selected && <RecipeDetail recipe={selected} onClose={() => setSelected(null)} onEdit={() => { void add(selected); }} onPlan={() => { void add(selected); }} onDelete={() => {}} onFavorite={() => {}} discovery onImport={() => void add(selected)} importBusy={saving === selected.id} alreadySaved={saved(selected)} importError={error} />}
    {source === 'de' && <p className="fineprint">Rezepttexte: Wikibooks-Mitwirkende, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0 <ArrowUpRight size={11} /></a>. Automatisch strukturiert; Tags und Symbolbilder ergänzt. Jede Rezeptansicht verlinkt ihre Quelle und deren Versionsgeschichte.</p>}
  </>;
}
