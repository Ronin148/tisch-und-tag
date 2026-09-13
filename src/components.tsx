import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X, Camera, ClipboardPaste, Pencil, LoaderCircle, ScanText, Plus, Minus, Clock, Users, ExternalLink, ChefHat, Heart, CalendarPlus, Trash2, ArrowRight, ImagePlus, Check, Link as LinkIcon } from 'lucide-react';
import type { Recipe } from './types';
import { blankRecipe, ingredientText, parseIngredient, parseRecipeText, safeUrl } from './domain';
import { compressPhoto, recognizePhotos } from './ocr';
import { suggestedTags } from './discovery';
import CookingMode from './CookingMode';

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current!; d.showModal(); return () => { d.close(); }; }, []);
  return <dialog className={`modal ${wide ? 'wide' : ''}`} ref={ref} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) { const r = ref.current.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }} aria-label={title}>
    <div className="modal-head"><h2>{title}</h2><button className="icon-btn" aria-label="Schliessen" onClick={onClose}><X size={21} /></button></div>{children}
  </dialog>;
}

export function RecipeImage({ recipe, className = '' }: { recipe: Recipe; className?: string }) {
  const src = recipe.image || recipe.photos[0];
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img className={`recipe-image ${className}`} alt={recipe.title} src={src.startsWith('data:') || safeUrl(src) ? src : `${import.meta.env.BASE_URL}${src}`} loading="lazy" onError={() => setFailed(true)} /> : <div className={`image-placeholder ${className}`}><ChefHat size={44} strokeWidth={1.1} /><span>Aus deiner Küche</span></div>;
}

export function RecipeCard({ recipe, onOpen, onFavorite, onPlan }: { recipe: Recipe; onOpen: () => void; onFavorite: () => void; onPlan: () => void }) {
  return <article className="recipe-card">
    <div className="card-image"><button className="image-button" aria-label={`${recipe.title} öffnen`} onClick={onOpen}><RecipeImage recipe={recipe} /></button><button className={`favorite-btn ${recipe.favorite ? 'is-favorite' : ''}`} aria-label={`${recipe.title}: ${recipe.favorite ? 'Favorit entfernen' : 'als Favorit speichern'}`} aria-pressed={recipe.favorite} onClick={onFavorite}><Heart size={19} fill={recipe.favorite ? 'currentColor' : 'none'} /></button>{recipe.sample && <span className="sample-label">Zum Ausprobieren</span>}</div>
    <div className="card-body"><div className="card-tags">{recipe.tags.slice(0, 2).map(t => <span key={t}>{t}</span>)}{!recipe.tags.length && <span>Mein Rezept</span>}</div><h3><button onClick={onOpen}>{recipe.title}</button></h3><div className="card-bottom"><div className="recipe-meta"><span><Clock size={14} />{recipe.minutes ? `${recipe.minutes} Min.` : 'Zeit offen'}</span><span><Users size={14} />{recipe.servings}</span></div><button className="card-plan" aria-label={`${recipe.title} einplanen`} onClick={onPlan}><Plus size={17} /><span>Einplanen</span></button></div></div>
  </article>;
}

export function Portions({ value, onChange, label = 'Portionen' }: { value: number; onChange: (v: number) => void; label?: string }) {
  return <div className="portions"><button type="button" aria-label={`${label} verringern`} disabled={value <= 1} onClick={() => onChange(value - 1)}><Minus size={15} /></button><span>{value} <span>{label}</span></span><button type="button" aria-label={`${label} erhöhen`} disabled={value >= 100} onClick={() => onChange(value + 1)}><Plus size={15} /></button></div>;
}

export function RecipeDetail({ recipe, onClose, onEdit, onPlan, onDelete, onFavorite, discovery = false, onImport, importBusy, alreadySaved, importError, importLabel }: { discovery?: boolean; importLabel?: string; onImport?: () => void; importBusy?: boolean; alreadySaved?: boolean; importError?: string; recipe: Recipe; onClose: () => void; onEdit: () => void; onPlan: (portions: number) => void; onDelete: () => void; onFavorite: () => void }) {
  const [portions, setPortions] = useState(recipe.servings);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [cooking, setCooking] = useState(false);
  if (cooking) return <CookingMode recipe={recipe} servings={portions} onClose={() => setCooking(false)} />;
  return <Modal title="Dein Rezept" wide onClose={onClose}>
    <div className="detail-cover"><RecipeImage recipe={recipe} /><div className="detail-cover-tag">{recipe.imageNote || (recipe.sample ? 'Beispielrezept · Bild als Serviervorschlag' : recipe.source || 'Aus deiner Sammlung')}</div></div>
    <div className="modal-body detail"><div className="detail-title"><div><div className="eyebrow">{recipe.tags.join(' · ') || 'MEIN KOCHBUCH'}</div><h1>{recipe.title}</h1></div>{!discovery && <button className={`icon-btn ${recipe.favorite ? 'is-favorite' : ''}`} aria-label="Favorit" aria-pressed={recipe.favorite} onClick={onFavorite}><Heart fill={recipe.favorite ? 'currentColor' : 'none'} /></button>}</div><p className="muted">{recipe.description}</p>
      <div className="detail-toolbar"><span className="inline"><Clock size={17} />{recipe.minutes ? `${recipe.minutes} Minuten` : 'Zeit noch offen'}</span>{!discovery && <button className="btn subtle" onClick={onEdit}><Pencil size={16} />Bearbeiten</button>}</div>
      {recipe.steps.length > 0 && <button className="btn primary full" onClick={() => setCooking(true)}><ChefHat size={20} />Kochen starten · Schritte & Timer</button>}
      {recipe.kcalPerServing != null && <p className="fineprint">ca. {Math.round(recipe.kcalPerServing)} kcal je Portion · {recipe.nutritionNote || 'Angabe bitte prüfen'}</p>}
      {recipe.servingsNote && <p className="notice">{recipe.servingsNote}</p>}<div className="detail-columns"><section><div className="section-mini"><h3>Zutaten</h3></div><Portions value={portions} onChange={setPortions} />{recipe.ingredients.length ? <ul className="ingredient-list">{recipe.ingredients.map((i, n) => <li key={n}>{ingredientText(i, portions / recipe.servings)}</li>)}</ul> : <p className="notice">Ergänze Zutaten, damit sie auf deiner Einkaufsliste erscheinen.</p>}</section>
        <section><h3>So geht’s</h3>{recipe.steps.length ? <ol className="steps">{recipe.steps.map((s, i) => <li key={i} className={checkedSteps.includes(i) ? 'done' : ''}><button aria-label={`Schritt ${i + 1} ${checkedSteps.includes(i) ? 'wieder öffnen' : 'abhaken'}`} aria-pressed={checkedSteps.includes(i)} onClick={() => setCheckedSteps(checkedSteps.includes(i) ? checkedSteps.filter(n => n !== i) : [...checkedSteps, i])}>{checkedSteps.includes(i) ? <Check size={15} /> : i + 1}</button><p>{s}</p></li>)}</ol> : <p className="muted">Die Zubereitung kannst du über „Bearbeiten“ ergänzen.</p>}</section></div>
      {recipe.photos.length > 0 && <details className="originals"><summary>Originalfotos ansehen ({recipe.photos.length})</summary>{recipe.photos.map((photo, i) => <img src={photo} alt={`Originalseite ${i + 1}`} key={i} />)}</details>}
      {safeUrl(recipe.sourceUrl) && <a className="source-link" href={safeUrl(recipe.sourceUrl)} target="_blank" rel="noopener noreferrer">Originalrezept öffnen <ExternalLink size={14} /></a>}
      {!discovery && (deleting ? <div className="delete-confirm"><p>„{recipe.title}“ und seine Einträge im Wochenplan entfernen?</p><div className="button-row"><button className="btn danger" onClick={onDelete}>Rezept entfernen</button><button className="btn" onClick={() => setDeleting(false)}>Behalten</button></div></div> : <button className="text-btn muted" onClick={() => setDeleting(true)}><Trash2 size={14} />Rezept entfernen</button>)}
    {recipe.source && <p className="fineprint">{recipe.source}</p>}{importError && <div className="notice error" role="alert">{importError}</div>}</div><div className="modal-footer">{discovery ? <button className="btn primary" onClick={onImport} disabled={importBusy}>{importBusy ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}{importLabel || (alreadySaved ? 'Im Kochbuch öffnen' : 'Mit Bild ins Kochbuch übernehmen')}</button> : <button className="btn primary" onClick={() => onPlan(portions)}><CalendarPlus size={18} />In die Woche einplanen</button>}</div>
  </Modal>;
}

type ImportTab = 'photo' | 'link' | 'text' | 'manual';

export function RecipeEditor({ recipe, initialTab = 'photo', onClose, onSave }: { recipe?: Recipe; initialTab?: ImportTab; onClose: () => void; onSave: (r: Recipe) => Promise<void> }) {
  const [draft, setDraft] = useState<Recipe>(() => recipe ? structuredClone(recipe) : blankRecipe());
  const [tab, setTab] = useState<ImportTab>(recipe ? 'manual' : initialTab);
  const [ingredients, setIngredients] = useState(recipe?.ingredients.map(i => ingredientText(i)).join('\n') || '');
  const [steps, setSteps] = useState(recipe?.steps.join('\n\n') || '');
  const [tagText, setTagText] = useState(recipe?.tags.join(', ') || '');
  const [raw, setRaw] = useState(''); const [link, setLink] = useState(''); const [error, setError] = useState('');
  const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false); const [progress, setProgress] = useState({ label: '', value: 0 });
  const [dirty, setDirty] = useState(false); const [confirmClose, setConfirmClose] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => { abortRef.current?.abort(); }, []);
  const change = (patch: Partial<Recipe>) => { setDraft(d => ({ ...d, ...patch, ...('image' in patch ? { imageNote: undefined } : {}), ...('servings' in patch ? { servingsNote: undefined } : {}) })); setDirty(true); };
  const requestClose = () => { if (saving) return; if (dirty || busy) setConfirmClose(true); else onClose(); };
  const importText = (text: string) => {
    const parsed = parseRecipeText(text);
    setDraft(d => ({ ...d, ...parsed, title: parsed.title || d.title }));
    setIngredients(parsed.ingredients?.map(i => ingredientText(i)).join('\n') || ''); setSteps(parsed.steps?.join('\n\n') || '');
    setDirty(true); setTab('manual'); setNotice('Bitte Titel, Mengen und Schritte kurz prüfen. Die automatische Zuordnung kann Fehler enthalten.');
  };
  async function importLink() {
    const value = link.trim();
    if (!value) return;
    setError(''); setNotice(''); setBusy(true);
    try {
      const apiBase = (import.meta.env.VITE_IMPORT_API_URL || '').replace(/\/$/, '');
      const response = await fetch(`${apiBase}/api/import-recipe`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: value }), signal: AbortSignal.timeout(25000) });
      const payload = await response.json().catch(() => null) as { recipe?: Recipe; error?: string } | null;
      if (!response.ok || !payload?.recipe) throw new Error(payload?.error || 'Der Link konnte nicht importiert werden.');
      const next = payload.recipe;
      setDraft(d => ({ ...d, ...next, id: d.id, favorite: false, sample: false, createdAt: d.createdAt }));
      setIngredients(next.ingredients.map(i => ingredientText(i)).join('\n'));
      setSteps(next.steps.join('\n\n'));
      setTagText(next.tags.join(', '));
      setRaw('');
      setDirty(true); setTab('manual');
      setNotice(next.image ? 'Bitte Rezept kurz prüfen. Das Bild wurde mitgespeichert.' : 'Bitte Rezept kurz prüfen. Das Bild konnte nicht automatisch gespeichert werden.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return; setError(''); setBusy(true);
    try {
      if (files.length + draft.photos.length > 6) throw new Error('Du kannst bis zu sechs Fotos pro Rezept hinzufügen.');
      const photos: string[] = [];
      for (const file of files) photos.push(await compressPhoto(file));
      change({ photos: [...draft.photos, ...photos], source: draft.source || 'Aus meiner Rezeptsammlung' });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function scan() {
    setBusy(true); setError(''); const controller = new AbortController(); abortRef.current = controller;
    try {
      const text = await recognizePhotos(draft.photos, (label, value) => setProgress({ label, value }), controller.signal);
      if (controller.signal.aborted) return;
      if (text.trim().length < 10) throw new Error('Es wurde zu wenig Text erkannt. Bitte ein schärferes Foto wählen oder das Rezept von Hand ergänzen.');
      setRaw(text); importText(text);
    } catch (e) { if (!controller.signal.aborted) setError(`Die Texterkennung hat nicht geklappt. ${(e as Error).message}`); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      if (!draft.title.trim()) throw new Error('Bitte gib deinem Rezept einen Namen.');
      if (draft.sourceUrl && !safeUrl(draft.sourceUrl)) throw new Error('Bitte einen gültigen Webseitenlink mit https:// eintragen.');
      const next = { ...draft, title: draft.title.trim(), tags: [...new Set(tagText.split(',').map(t => t.trim().slice(0,100)).filter(Boolean))].slice(0, 20), ingredients: ingredients.split('\n').filter(l => l.trim()).map(parseIngredient), steps: steps.split(/\n\s*\n|\n(?=\d+[.)]\s)/).map(x => x.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean), sample: false };
      await onSave(next);
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return <Modal title={recipe ? 'Rezept bearbeiten' : 'Ein neues Lieblingsrezept'} onClose={requestClose} wide>
    <form onSubmit={save}><div className="modal-body editor">
      {!recipe && <><p className="muted intro-copy">Von der Magazinseite bis zum Rezeptlink. Alles findet hier seinen Platz.</p><div className="import-tabs" role="tablist" aria-label="Rezept hinzufügen">{([{ id: 'photo', icon: Camera, text: 'Foto' }, { id: 'link', icon: LinkIcon, text: 'Link' }, { id: 'text', icon: ClipboardPaste, text: 'Text' }, { id: 'manual', icon: Pencil, text: 'Selbst' }] as const).map(t => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} disabled={busy} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}><t.icon size={18} />{t.text}</button>)}</div></>}
      {tab === 'photo' && <section className="import-panel"><label className="upload-zone"><span className="round-icon"><Camera size={28} strokeWidth={1.5} /></span><strong>Deine Rezeptseiten, bitte.</strong><span>Fotos auswählen oder mit dem Handy aufnehmen</span><small>Bis zu 6 Bilder · JPG, PNG, WebP oder HEIC</small><input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={busy} onChange={e => { void addPhotos(e.target.files); e.target.value = ''; }} /></label>
        {draft.photos.length > 0 && <><div className="photo-strip">{draft.photos.map((p, i) => <div key={i}><img src={p} alt={`Rezeptseite ${i + 1}`} /><button type="button" disabled={busy} aria-label={`Foto ${i + 1} entfernen`} onClick={() => change({ photos: draft.photos.filter((_, n) => n !== i) })}><X size={14} /></button></div>)}</div><button type="button" className="btn primary full" disabled={busy} onClick={() => void scan()}>{busy ? <LoaderCircle className="spin" size={18} /> : <ScanText size={18} />}Text aus Fotos lesen</button><button type="button" className="text-btn center" disabled={busy} onClick={() => { if (!draft.title) change({ title: 'Mein fotografiertes Rezept' }); setTab('manual'); }}>Foto speichern und Angaben selbst ergänzen <ArrowRight size={15} /></button></>}
        <p className="fineprint">Die Texterkennung läuft auf deinem Gerät. Fotografiere möglichst gerade, hell und ohne Schatten.</p>{busy && <div role="status"><p>{progress.label || 'Fotos werden vorbereitet …'}</p><progress value={progress.value} max={1} /></div>}
      </section>}
      {tab === 'link' && <section className="import-panel"><label>Rezeptlink<input type="url" value={link} maxLength={2000} autoComplete="url" inputMode="url" placeholder="https://…" onChange={e => { setLink(e.target.value); setDirty(true); }} /></label><p className="fineprint">Gut geeignet sind öffentliche Rezeptseiten mit strukturierten Rezeptdaten. Geschützte Seiten, Instagram und TikTok liefern oft keinen sauberen Rezepttext.</p><button type="button" className="btn primary full" disabled={busy || !link.trim()} onClick={() => void importLink()}>{busy ? <LoaderCircle className="spin" size={18} /> : <LinkIcon size={18} />}Rezept aus Link lesen</button></section>}
      {tab === 'text' && <section className="import-panel"><label>Rezepttext<textarea className="raw-text" value={raw} maxLength={60000} onChange={e => { setRaw(e.target.value); setDirty(true); }} placeholder={'Rezeptname\nFür 2 Portionen\n\nZutaten\n200 g Pasta\n400 g Tomaten\n\nZubereitung\n1. Tomaten halbieren …'} /></label><p className="fineprint">Kopiere den Rezepttext aus einer Webseite, Instagram, TikTok oder einem KI-Chat. Mit den Überschriften „Zutaten“ und „Zubereitung“ klappt die Zuordnung am besten.</p><button type="button" className="btn primary full" disabled={!raw.trim()} onClick={() => importText(raw)}><ClipboardPaste size={18} />In Rezept umwandeln</button></section>}
      {tab === 'manual' && <>
        {notice && <div className="notice">{notice}</div>}
        <label>Rezeptname<input autoComplete="off" required maxLength={150} value={draft.title} placeholder="Zum Beispiel: Omas Zitronenpasta" onChange={e => change({ title: e.target.value })} /></label>
        <label>Eine kleine Beschreibung <span className="optional">optional</span><input maxLength={500} value={draft.description} placeholder="Was macht dieses Rezept besonders?" onChange={e => change({ description: e.target.value })} /></label>
        <div className="form-two"><label>Portionen<input type="number" min="1" max="100" required value={draft.servings} onChange={e => change({ servings: Number(e.target.value) })} /></label><label>Zeit in Minuten <span className="optional">optional</span><input type="number" min="1" max="1440" value={draft.minutes ?? ''} onChange={e => change({ minutes: e.target.value ? Number(e.target.value) : null })} /></label></div>
        <label>Kalorien pro Portion <span className="optional">optional</span><input type="number" min="1" max="10000" value={draft.kcalPerServing ?? ''} onChange={e => change({ kcalPerServing: e.target.value ? Number(e.target.value) : null, nutritionNote: 'Eigene Angabe pro Portion' })} /></label>
        <label>Schlagwörter<input value={tagText} maxLength={800} placeholder="Low Carb, Vegetarisch, Schnell …" onChange={e => { setTagText(e.target.value); setDirty(true); }} /></label><div className="filters tag-suggestions">{suggestedTags.slice(0,8).map(t => { const selected = tagText.split(',').map(x => x.trim()).includes(t); return <button type="button" key={t} aria-pressed={selected} className={selected ? 'active' : ''} onClick={() => { const tags = tagText.split(',').map(x => x.trim()).filter(Boolean); setTagText((selected ? tags.filter(x => x !== t) : [...tags, t]).join(', ')); setDirty(true); }}>{t}</button>; })}</div><label>Zutaten<textarea rows={6} value={ingredients} maxLength={30000} placeholder={'Eine Zutat pro Zeile, zum Beispiel:\n200 g Pasta\n400 g Tomaten\n2 EL Olivenöl'} onChange={e => { setIngredients(e.target.value); setDirty(true); }} /></label><p className="field-hint">Menge, Einheit und Zutat. Daraus entsteht später deine Einkaufsliste.</p>
        <label>Zubereitung<textarea rows={7} value={steps} maxLength={60000} placeholder={'Was ist zu tun?\n\nTrenne einzelne Schritte mit einer Leerzeile.'} onChange={e => { setSteps(e.target.value); setDirty(true); }} /></label>
        <div className="form-two"><label>Quelle <span className="optional">optional</span><input value={draft.source} maxLength={300} placeholder="Magazin, Instagram, eigener Einfall …" onChange={e => change({ source: e.target.value })} /></label><label>Original-Link <span className="optional">optional</span><input type="url" value={draft.sourceUrl} maxLength={2000} placeholder="https://…" onChange={e => change({ sourceUrl: e.target.value })} /></label></div>
        <div className="button-row wrap"><label className="btn file-btn"><ImagePlus size={17} />Rezeptbild hinzufügen<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={busy} onChange={async e => { const file = e.target.files?.[0]; if (!file) return; setBusy(true); try { change({ image: await compressPhoto(file) }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }} /></label>{draft.image && <button type="button" className="text-btn" onClick={() => change({ image: '' })}>Bild entfernen</button>}</div>
        {draft.photos.length > 0 && <p className="fineprint">{draft.photos.length} Originalfoto(s) werden beim Rezept aufbewahrt.</p>}
        {raw && <details className="originals"><summary>Ursprünglichen Text ansehen</summary><pre>{raw}</pre></details>}
      </>}
      {error && <div className="notice error" role="alert">{error}</div>}
      {confirmClose && <div className="delete-confirm" role="alert"><p>Deine Änderungen sind noch nicht gespeichert.</p><div className="button-row"><button type="button" className="btn danger" onClick={onClose}>Verwerfen</button><button type="button" className="btn" onClick={() => setConfirmClose(false)}>Weiter bearbeiten</button></div></div>}
    </div>{tab === 'manual' && <div className="modal-footer"><button type="button" className="btn" onClick={requestClose}>Abbrechen</button><button type="submit" className="btn primary" disabled={saving || busy}>{saving ? <LoaderCircle size={18} className="spin" /> : <Check size={18} />}Rezept speichern</button></div>}</form>
  </Modal>;
}
