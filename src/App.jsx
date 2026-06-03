/* NeuroMap — App entry */

import React from 'react';
import { useTweaks, TweaksPanel, TweakSection, TweakSelect, TweakRadio, TweakToggle } from './TweaksPanel.jsx';
import { Sidebar, AppIcon } from './Sidebar.jsx';
import { EditorView } from './Editor.jsx';
import { SearchView } from './Search.jsx';
import { FolderView, RecentView, BiblioView } from './MiscViews.jsx';
import { useStore } from './store.jsx';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "petrolio",
  "density": "regular",
  "showHints": true
}/*EDITMODE-END*/;

function Logo() {
  // Stylised brain-in-body brand mark.
  // The brand identity hinges on this little body silhouette with a node-cluster head.
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" fill="none">
      {/* tiny body silhouette */}
      <ellipse cx="14" cy="7.2" rx="4" ry="4.2"
               fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.1" />
      {/* nodes in the head */}
      <g fill="var(--accent)">
        <circle cx="12.3" cy="6.4" r="0.8" />
        <circle cx="15.5" cy="6.0" r="0.8" />
        <circle cx="13.6" cy="8.4" r="0.8" />
      </g>
      <g stroke="var(--accent)" strokeWidth=".7" opacity=".6">
        <line x1="12.3" y1="6.4" x2="15.5" y2="6.0" />
        <line x1="12.3" y1="6.4" x2="13.6" y2="8.4" />
        <line x1="15.5" y1="6.0" x2="13.6" y2="8.4" />
      </g>
      {/* body */}
      <path d="M 10 12 Q 9 15 9 18 L 10 22 L 10.5 26
               M 18 12 Q 19 15 19 18 L 18 22 L 17.5 26
               M 9.5 15 L 18.5 15"
            stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopBar({ query, onQueryChange, dark, onToggleDark, onMenu }) {
  return (
    <header className="topbar">
      <button className="icon-btn topbar-menu" onClick={onMenu} aria-label="Apri menu">
        <AppIcon.menu />
      </button>
      <div className="brand">
        <span className="brand-mark"><Logo /></span>
        <span className="brand-name"><b>Neuro</b>Map</span>
      </div>

      <div className="topbar-search"
           onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        <AppIcon.search />
        <input
          placeholder="Cerca attraverso tutte le note…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query
          ? (
            <button type="button" className="search-clear" aria-label="Cancella ricerca"
                    onClick={() => onQueryChange('')}>
              <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
                   strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
            </button>
          )
          : <span className="kbd">⌘K</span>}
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={onToggleDark}
                aria-label={dark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
                title={dark ? 'Tema chiaro' : 'Tema scuro'}>
          {dark ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                 strokeWidth="1.4" strokeLinecap="round">
              <circle cx="8" cy="8" r="3" />
              <path d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.5 3.5l1.2 1.2M11.3 11.3l1.2 1.2M3.5 12.5l1.2-1.2M11.3 4.7l1.2-1.2" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.4 9.7A5.7 5.7 0 0 1 6.3 2.6 5.7 5.7 0 1 0 13.4 9.7z" />
            </svg>
          )}
        </button>
        <div style={{
          width: 28, height: 28, marginLeft: 4,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--ocra))',
          color: 'var(--paper)',
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 14,
          display: 'grid', placeItems: 'center',
        }} title="Profilo">M</div>
      </div>
    </header>
  );
}

function App() {
  const { notes } = useStore();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState({ kind: 'recenti' });
  const [navOpen, setNavOpen] = React.useState(false);
  // The search query lives here so the topbar field and the results view
  // share one source of truth — typing filters live, no Enter needed.
  const [query, setQuery] = React.useState('');
  // Where to return when the search box is cleared (the route before search).
  const prevRoute = React.useRef({ kind: 'recenti' });

  const [dark, setDark] = React.useState(
    () => document.documentElement.dataset.theme === 'dark',
  );
  React.useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#23252e' : '#f4f1e8');
    try {
      localStorage.setItem('neuromap.theme', dark ? 'dark' : 'light');
    } catch (e) { /* ignore */ }
  }, [dark]);

  // Plain navigation (sidebar, opening a note) clears the search box.
  const navigate = (r) => {
    setQuery('');
    prevRoute.current = r;
    setRoute(r);
    setNavOpen(false);
  };
  const onOpenNote = (id) => navigate({ kind: 'note', id: id || (notes[0] && notes[0].id) });

  // Live search: every keystroke filters. Empty query returns to the
  // previous route instead of stranding the user on an empty results page.
  const onQueryChange = (q) => {
    setQuery(q);
    if (q.trim()) {
      if (route.kind !== 'search') prevRoute.current = route;
      setRoute({ kind: 'search' });
    } else {
      setRoute(prevRoute.current);
    }
  };

  // Keyboard: ⌘K focuses the topbar search field.
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const el = document.querySelector('.topbar-search input');
        if (el) el.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app" data-palette={t.palette} data-density={t.density}>
      <TopBar query={query} onQueryChange={onQueryChange} dark={dark}
              onToggleDark={() => setDark((d) => !d)}
              onMenu={() => setNavOpen(true)} />
      <Sidebar route={route}
               onRoute={navigate}
               open={navOpen}
               onClose={() => setNavOpen(false)} />
      <main className="main">
        {route.kind === 'note'    && <EditorView noteId={route.id} onOpenNote={onOpenNote} onRoute={navigate} />}
        {route.kind === 'search'  && <SearchView q={query} onOpenNote={onOpenNote} />}
        {route.kind === 'folder'  && <FolderView folderId={route.id} onOpenNote={onOpenNote} />}
        {route.kind === 'recenti' && <RecentView mode="recenti" onOpenNote={onOpenNote} />}
        {route.kind === 'star'    && <RecentView mode="star" onOpenNote={onOpenNote} />}
        {route.kind === 'biblio'  && <BiblioView onOpenNote={onOpenNote} />}
      </main>

      <TweaksPanel title="NeuroMap · Tweaks">
        <TweakSection label="Identità visiva" />
        <TweakSelect label="Palette" value={t.palette}
                     options={[
                       { value: 'petrolio', label: 'Verde petrolio · biblioteca' },
                       { value: 'ambra',    label: 'Ambra · vintage anatomy' },
                       { value: 'bordeaux', label: 'Bordeaux · medicina classica' },
                       { value: 'indaco',   label: 'Indaco · sereno notturno' },
                     ]}
                     onChange={(v) => setTweak('palette', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Densità" value={t.density}
                    options={['compact', 'regular', 'comfy']}
                    onChange={(v) => setTweak('density', v)} />

        <TweakSection label="Comportamento" />
        <TweakToggle label="Mostra suggerimenti" value={t.showHints}
                     onChange={(v) => setTweak('showHints', v)} />

        <TweakSection label="Vista veloce" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <button className="twk-btn secondary" onClick={() => navigate({ kind: 'recenti' })}>Recenti</button>
          <button className="twk-btn secondary" onClick={() => navigate({ kind: 'star' })}>Preferite</button>
          <button className="twk-btn secondary" onClick={() => navigate({ kind: 'folder' })}>Cartelle</button>
          <button className="twk-btn secondary" onClick={() => navigate({ kind: 'biblio' })}>Bibliografia</button>
        </div>
      </TweaksPanel>
    </div>
  );
}

export default App;
