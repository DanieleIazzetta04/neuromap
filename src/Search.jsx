import React from 'react';
import { useStore } from './store.jsx';

/* NeuroMap — Search view
   Ricerca trasversale: lista raggruppata per cartella + vista grafo
   con la parola evidenziata.
*/

// Highlight every search token inside `text` as <mark>. Tokens are
// space-separated; case-insensitive substring matches.
function Highlight({ text, q }) {
  const tokens = (q || '').trim().split(/\s+/).filter((t) => t.length >= 1);
  if (tokens.length === 0) return <>{text}</>;
  const pattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(${pattern})`, 'gi');
  const lowers = tokens.map((t) => t.toLowerCase());
  return (
    <>
      {String(text).split(re).map((p, i) => (
        lowers.includes(p.toLowerCase())
          ? <mark key={i} className="hit">{p}</mark>
          : <React.Fragment key={i}>{p}</React.Fragment>
      ))}
    </>
  );
}

// Build a lowercase haystack of everything a note actually contains: every
// block's text/caption/cells/labels, plus region labels and source metadata.
function noteHaystack(note, store) {
  const parts = [];
  for (const b of (note.blocks || [])) {
    if (b.text) parts.push(b.text);
    if (b.caption) parts.push(b.caption);
    if (Array.isArray(b.head)) parts.push(b.head.join(' '));
    if (Array.isArray(b.rows)) parts.push(b.rows.flat().join(' '));
    if (Array.isArray(b.data)) parts.push(b.data.map((d) => d.label || '').join(' '));
  }
  for (const rid of (note.regions || [])) {
    const r = store.getRegion(rid);
    if (r && r.label) parts.push(r.label);
  }
  for (const sid of (note.refs || [])) {
    const s = store.getSource(sid);
    if (s) parts.push([s.title, s.authors, s.journal].filter(Boolean).join(' '));
  }
  return parts.join(' \n ').toLowerCase();
}

// Multi-token search: every space-separated token must appear somewhere in
// the note (title, excerpt, body, captions, table cells, chart labels,
// region labels, bibliography). Score weighs title > excerpt > body.
function searchNotes(notes, q, store) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return [];
  const tokens = query.split(/\s+/).filter(Boolean);
  return notes
    .map((n) => {
      const title = (n.title || '').toLowerCase();
      const excerpt = (n.excerpt || '').toLowerCase();
      const body = noteHaystack(n, store);
      let score = 0;
      for (const t of tokens) {
        const inTitle = title.includes(t);
        const inExcerpt = excerpt.includes(t);
        const inBody = body.includes(t);
        if (!inTitle && !inExcerpt && !inBody) return null;
        score += (inTitle ? 5 : 0) + (inExcerpt ? 2 : 0) + (inBody ? 1 : 0);
      }
      return { note: n, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

// ─── List mode ───────────────────────────────────────────────────────────
function SearchList({ results, q, onOpenNote }) {
  const { getFolder, getRegion } = useStore();
  // Group by folder
  const grouped = {};
  for (const r of results) {
    (grouped[r.note.folder] ??= []).push(r);
  }
  const folderIds = Object.keys(grouped).sort((a, b) => grouped[b].length - grouped[a].length);

  if (results.length === 0) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--ink-2)', marginBottom: 6 }}>
          Nessun risultato per "<em>{q}</em>"
        </div>
        <div style={{ fontSize: 13 }}>Prova con un sinonimo o una parola più corta.</div>
      </div>
    );
  }

  return (
    <>
      {folderIds.map((fid) => {
        const f = getFolder(fid) || { name: 'Senza cartella', color: 'var(--ink-3)' };
        return (
          <div key={fid} className="results-group">
            <div className="results-group-head">
              <span className="side-dot" style={{ '--c': f.color }} />
              <h3>{f.name}</h3>
              <span className="results-group-count">
                · {grouped[fid].length}&nbsp;{grouped[fid].length === 1 ? 'nota' : 'note'}
              </span>
            </div>
            <div className="results-grid">
              {grouped[fid].map(({ note }) => (
                <div key={note.id} className="result-card" onClick={() => onOpenNote(note.id)}>
                  <h4><Highlight text={note.title || 'Senza titolo'} q={q} /></h4>
                  <p className="result-excerpt"><Highlight text={note.excerpt || ''} q={q} /></p>
                  <div className="result-meta">
                    {(note.regions || []).map((rid) => {
                      const r = getRegion(rid);
                      if (!r) return null;
                      return <span key={rid} className="chip" style={{
                        '--c': 'var(--ink-3)', '--cs': 'transparent', padding: '1px 6px 1px 0',
                        fontSize: 10.5, fontWeight: 500,
                      }}>{r.label}</span>;
                    })}
                    <span style={{ marginLeft: 'auto' }}>{note.updated}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── Graph mode ──────────────────────────────────────────────────────────
function SearchGraph({ results, q, onOpenNote }) {
  const { getNote, getFolder } = useStore();
  const W = 1100, H = 560;
  const cx = W / 2, cy = H / 2;

  const hitIds = new Set(results.map((r) => r.note.id));
  const hitNotes = results.map((r) => r.note);

  // Position hit notes on an inner ring, related neighbours on an outer ring.
  const innerR = Math.max(150, 60 + hitNotes.length * 22);
  const nodes = [];
  hitNotes.forEach((n, i) => {
    const a = (i / Math.max(hitNotes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ id: n.id, note: n, hit: true, x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR });
  });

  const neighbours = new Set();
  hitNotes.forEach((n) => (n.related || []).forEach((rid) => { if (!hitIds.has(rid)) neighbours.add(rid); }));
  const neighbourNotes = [...neighbours].map(getNote).filter(Boolean);
  const outerR = innerR + 140;
  neighbourNotes.forEach((n, i) => {
    const a = (i / Math.max(neighbourNotes.length, 1)) * Math.PI * 2 - Math.PI / 2;
    nodes.push({ id: n.id, note: n, hit: false, x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR });
  });

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges = [];
  nodes.forEach((n) => {
    (n.note.related || []).forEach((rid) => {
      if (nodeById[rid] && rid > n.id) {
        edges.push({ from: n, to: nodeById[rid], isHit: n.hit && nodeById[rid].hit });
      }
    });
  });

  // ── Pan & zoom ──────────────────────────────────────────────────────────
  const svgRef = React.useRef(null);
  const moved = React.useRef(false);
  const [view, setView] = React.useState({ scale: 1, x: 0, y: 0 });

  const clampScale = (s) => Math.min(3, Math.max(0.4, s));
  const zoomBy = (factor) => setView((v) => ({ ...v, scale: clampScale(v.scale * factor) }));
  const resetView = () => setView({ scale: 1, x: 0, y: 0 });

  React.useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      // Proportional, gentle zoom — small trackpad deltas barely move it.
      const d = Math.max(-100, Math.min(100, e.deltaY));
      zoomBy(Math.exp(-d * 0.001));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const toUnits = (px) => {
    const rect = svgRef.current ? svgRef.current.getBoundingClientRect() : { width: W };
    return px * (W / (rect.width || W));
  };
  // Pan via window listeners. Note: setPointerCapture would re-target the
  // click to the <svg> and swallow node clicks — so we deliberately avoid it.
  // `moved` distinguishes a click (open note) from a drag (pan).
  const onPointerDown = (e) => {
    const start = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
    moved.current = false;
    const onMove = (ev) => {
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setView((v) => ({ ...v, x: start.x + toUnits(dx), y: start.y + toUnits(dy) }));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const transform = `translate(${view.x} ${view.y}) translate(${cx} ${cy}) `
    + `scale(${view.scale}) translate(${-cx} ${-cy})`;

  return (
    <div className="graph-stage">
      <div className="graph-hint">
        <i /> <b>{hitNotes.length}</b>&nbsp;risultati ·&nbsp;
        <span style={{ color: 'var(--ink-3)' }}>{neighbourNotes.length} note vicine collegate</span>
      </div>
      <div className="graph-zoom">
        <button type="button" onClick={() => zoomBy(1 / 1.2)} aria-label="Rimpicciolisci">−</button>
        <button type="button" className="graph-zoom-pct" onClick={resetView}
                title="Reimposta la vista">{Math.round(view.scale * 100)}%</button>
        <button type="button" onClick={() => zoomBy(1.2)} aria-label="Ingrandisci">+</button>
      </div>
      <svg ref={svgRef} className="graph-svg" viewBox={`0 0 ${W} ${H}`}
           preserveAspectRatio="xMidYMid meet"
           onPointerDown={onPointerDown}>
        <g transform={transform}>
          <g opacity=".25">
            <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="var(--rule)" strokeDasharray="2 4" />
            <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="var(--rule)" strokeDasharray="2 6" />
          </g>

          <g>
            {edges.map((e, i) => (
              <line key={i} className={`graph-edge ${e.isHit ? 'is-hit' : ''}`}
                    x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} />
            ))}
          </g>

          <g pointerEvents="none">
            <text x={cx} y={cy - 6} textAnchor="middle"
                  style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontStyle: 'italic', fill: 'var(--ocra)' }}>
              "{q}"
            </text>
            <text x={cx} y={cy + 14} textAnchor="middle"
                  style={{ fontFamily: 'var(--font-body)', fontSize: 11,
                           letterSpacing: '.08em', textTransform: 'uppercase', fill: 'var(--ink-3)' }}>
              {hitNotes.length} note · {Object.keys(
                hitNotes.reduce((a, n) => { a[n.folder] = 1; return a; }, {})
              ).length} materie
            </text>
          </g>

          <g>
            {nodes.map((n) => {
              const f = getFolder(n.note.folder) || { color: 'var(--accent)', name: '' };
              const title = n.note.title || 'Senza titolo';
              return (
                <g key={n.id} className="graph-node"
                   onClick={() => { if (!moved.current) onOpenNote(n.id); }}>
                  <circle className={`graph-node-circ ${n.hit ? 'is-hit' : ''}`}
                          style={{ '--c': f.color }}
                          cx={n.x} cy={n.y} r={n.hit ? 28 : 22} />
                  <text className="graph-node-folder" style={{ '--c': f.color }}
                        x={n.x} y={n.y - 36}>{f.name}</text>
                  <text className="graph-node-label" x={n.x} y={n.y + 50}>
                    {title.length > 28 ? `${title.slice(0, 26)}…` : title}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
    </div>
  );
}

// ─── Search view ─────────────────────────────────────────────────────────
function SearchView({ initialQ, onOpenNote }) {
  const store = useStore();
  const { notes } = store;
  const [q, setQ] = React.useState(initialQ || '');
  const [mode, setMode] = React.useState('list'); // 'list' | 'graph'
  const results = React.useMemo(() => searchNotes(notes, q, store), [notes, q, store]);

  React.useEffect(() => { setQ(initialQ || ''); }, [initialQ]);

  const folderCount = new Set(results.map(r => r.note.folder)).size;

  return (
    <div className="search-view">
      <div className="search-head">
        <h2>Risultati per <em>"{q || '…'}"</em></h2>
        <div className="search-meta">
          {results.length} {results.length === 1 ? 'nota' : 'note'} in {folderCount} {folderCount === 1 ? 'materia' : 'materie'}
          {' · '}la parola evidenziata in <mark className="hit" style={{ fontSize: 12 }}>giallo</mark>
        </div>
        <div className="search-modes">
          <button className={mode === 'list' ? 'is-active' : ''} onClick={() => setMode('list')}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M3 3.5h7M3 6.5h7M3 9.5h7" />
            </svg>
            Lista
          </button>
          <button className={mode === 'graph' ? 'is-active' : ''} onClick={() => setMode('graph')}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4">
              <circle cx="3" cy="3.5" r="1.4" /><circle cx="10" cy="4.2" r="1.4" /><circle cx="6.5" cy="9.8" r="1.4" />
              <path d="M4.2 4 8.9 4.6M4 4.8l1.8 4.2M9 5l-1.8 4.2" strokeLinecap="round" />
            </svg>
            Grafo
          </button>
        </div>
      </div>
      <div className="search-results">
        {q.trim().length === 0 ? (
          <div className="view-empty">
            <p>Digita una parola nella barra di ricerca in alto.
               La ricerca legge titolo, testo, didascalie, tabelle, regioni e fonti.</p>
          </div>
        ) : mode === 'list' ? (
          <SearchList results={results} q={q} onOpenNote={onOpenNote} />
        ) : (
          <SearchGraph results={results} q={q} onOpenNote={onOpenNote} />
        )}
      </div>
    </div>
  );
}

export { SearchView };
