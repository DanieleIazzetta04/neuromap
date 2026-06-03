import React from 'react';
import { useStore, useConfirm, makeBlock } from './store.jsx';
import { AutoTextarea, Dropdown, SourceFormModal } from './ui.jsx';
import { ChartBlock } from './Charts.jsx';

/* NeuroMap — Note editor
   Editable title + blocks (paragrafo, titoli, callout, tabella, immagine,
   grafico) with add / remove / reorder, folder reassignment, star, delete.
*/

const TEXT_TYPES = ['p', 'h2', 'h3', 'callout'];

// ─── Icons ───────────────────────────────────────────────────────────────
const ico = {
  star: <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="M8 2.3l1.8 3.7 4 .6-2.9 2.8.7 4L8 11.5 4.4 13.4l.7-4L2.2 6.6l4-.6L8 2.3z" /></svg>,
  trash: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.8 4.5l.5 8h5.4l.5-8" /></svg>,
  download: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2.5V10M4.5 7l3.5 3 3.5-3M3 13h10" /></svg>,
  up: <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12.5V4M4.5 7.5 8 4l3.5 3.5" /></svg>,
  down: <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3.5V12M4.5 8.5 8 12l3.5-3.5" /></svg>,
  plus: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3.5v9M3.5 8h9" /></svg>,
  x: <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>,
  info: <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6.5" /><path d="M9 6v3.5M9 12.2v.1" /></svg>,
  image: <svg viewBox="0 0 18 18" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="3.5" width="13" height="11" rx="1.6" /><circle cx="6.6" cy="7.4" r="1.4" /><path d="M3.5 12.5l3.5-3 2.6 2.2 2.4-1.8 2.5 2.1" /></svg>,
  panel: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M10.5 3v10" /></svg>,
};

function placeholderFor(type) {
  if (type === 'h2') return 'Titolo sezione';
  if (type === 'h3') return 'Sottotitolo';
  if (type === 'callout') return 'Testo della nota evidenziata…';
  return 'Scrivi qualcosa…';
}

// Read an image file, downscale it on a canvas and hand back a data URL —
// keeps notes (and localStorage) from ballooning with full-res uploads.
function downscaleImage(file, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, 1400 / img.width);
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      try { cb(canvas.toDataURL('image/jpeg', 0.82)); } catch (e) { cb(reader.result); }
    };
    img.onerror = () => cb(reader.result);
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

// ─── Inline rich text — [[wiki-link]] popovers + <b>bold</b> ──────────────
// parseInline walks a single line; RichText below stitches lines together
// and recognises list markers ("1. " / "• " / "- " / "* ") at line starts.
function parseInline(text, ctx) {
  const { notes, getFolder, onLink } = ctx;
  const parts = [];
  let rest = text || '';
  let key = 0;
  const linkRe = /\[\[([^\]]+)\]\]/;
  const boldRe = /<b>([^<]+)<\/b>/;

  while (rest.length > 0) {
    const lm = rest.match(linkRe);
    const bm = rest.match(boldRe);
    let pick = null;
    if (lm && bm) pick = lm.index < bm.index ? 'link' : 'bold';
    else if (lm) pick = 'link';
    else if (bm) pick = 'bold';

    if (!pick) {
      parts.push(<React.Fragment key={key++}>{rest}</React.Fragment>);
      break;
    }
    const m = pick === 'link' ? lm : bm;
    if (m.index > 0) {
      parts.push(<React.Fragment key={key++}>{rest.slice(0, m.index)}</React.Fragment>);
    }
    if (pick === 'link') {
      const term = m[1];
      const target = notes.find((n) => n.title.toLowerCase() === term.toLowerCase())
        || notes.find((n) => n.title && n.title.toLowerCase().includes(term.toLowerCase()));
      const folder = target && getFolder(target.folder);
      parts.push(
        <span key={key++} className="autolink"
              onClick={(e) => { e.stopPropagation(); if (target) onLink(target.id); }}>
          {term}
          {target && (
            <span className="autolink-popover">
              <span className="autolink-pop-title">{target.title || 'Senza titolo'}</span>
              <span className="autolink-pop-text">{target.excerpt}</span>
              <span className="autolink-pop-meta"
                    style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-3)',
                             display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%',
                               background: folder ? folder.color : 'var(--accent)' }} />
                {folder ? folder.name : ''}
                <span style={{ marginLeft: 'auto' }}>→ Apri</span>
              </span>
            </span>
          )}
        </span>,
      );
    } else {
      parts.push(<b key={key++}>{m[1]}</b>);
    }
    rest = rest.slice(m.index + m[0].length);
  }
  return parts;
}

const LINE_NUM_RE = /^(\s*)(\d+)\.\s+(.*)$/;
const LINE_BUL_RE = /^(\s*)([•*\-])\s+(.*)$/;

function RichText({ text, onLink, multiline = false }) {
  const { notes, getFolder } = useStore();
  if (!text) return null;
  const ctx = { notes, getFolder, onLink };
  if (!multiline || !text.includes('\n')) {
    return <>{parseInline(text, ctx)}</>;
  }
  const lines = String(text).split('\n');
  return (
    <>
      {lines.map((line, i) => {
        const numMatch = line.match(LINE_NUM_RE);
        const bulMatch = line.match(LINE_BUL_RE);
        if (numMatch) {
          return (
            <div key={i} className="b-li b-li-num">
              <span className="b-li-marker">{numMatch[2]}.</span>
              <span className="b-li-body">{parseInline(numMatch[3], ctx)}</span>
            </div>
          );
        }
        if (bulMatch) {
          return (
            <div key={i} className="b-li b-li-bul">
              <span className="b-li-marker">•</span>
              <span className="b-li-body">{parseInline(bulMatch[3], ctx)}</span>
            </div>
          );
        }
        if (line.length === 0) return <div key={i} className="b-line b-line-empty" />;
        return <div key={i} className="b-line">{parseInline(line, ctx)}</div>;
      })}
    </>
  );
}

// ─── Editable table block ────────────────────────────────────────────────
function TableBlock({ block, onChange }) {
  const head = block.head || [];
  const rows = block.rows || [];
  const setHead = (i, v) => onChange({ ...block, head: head.map((h, j) => (j === i ? v : h)) });
  const setCell = (r, c, v) => onChange({
    ...block,
    rows: rows.map((row, ri) => (ri === r ? row.map((cell, ci) => (ci === c ? v : cell)) : row)),
  });
  const addRow = () => onChange({ ...block, rows: [...rows, head.map(() => '')] });
  const delRow = (r) => onChange({ ...block, rows: rows.filter((_, ri) => ri !== r) });
  const addCol = () => onChange({
    ...block,
    head: [...head, `Colonna ${head.length + 1}`],
    rows: rows.map((row) => [...row, '']),
  });
  const delCol = (c) => onChange({
    ...block,
    head: head.filter((_, i) => i !== c),
    rows: rows.map((row) => row.filter((_, i) => i !== c)),
  });

  return (
    <div className="table-edit">
      <table className="b">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>
                <div className="th-cell">
                  <input className="cell-input" value={h} placeholder={`Colonna ${i + 1}`}
                         onChange={(e) => setHead(i, e.target.value)} />
                  {head.length > 1 && (
                    <button type="button" className="col-del" title="Elimina colonna"
                            onClick={() => delCol(i)}>{ico.x}</button>
                  )}
                </div>
              </th>
            ))}
            <th className="table-gutter" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {row.map((cell, c) => (
                <td key={c}>
                  <input className="cell-input" value={cell}
                         onChange={(e) => setCell(r, c, e.target.value)} />
                </td>
              ))}
              <td className="table-gutter">
                <button type="button" className="row-action" title="Elimina riga"
                        onClick={() => delRow(r)}>{ico.x}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="table-actions">
        <button type="button" className="table-add-row" onClick={addRow}>{ico.plus} Riga</button>
        <button type="button" className="table-add-row" onClick={addCol}>{ico.plus} Colonna</button>
      </div>
    </div>
  );
}

// ─── Image block — upload (downscaled) or URL ────────────────────────────
function ImageBlock({ block, onChange }) {
  const fileRef = React.useRef(null);
  const [url, setUrl] = React.useState('');

  const pick = (file) => {
    if (file) downscaleImage(file, (src) => onChange({ ...block, src }));
  };

  if (!block.src) {
    return (
      <div className="image-empty">
        <input ref={fileRef} type="file" accept="image/*" hidden
               onChange={(e) => pick(e.target.files && e.target.files[0])} />
        <button type="button" className="image-pick"
                onClick={() => fileRef.current && fileRef.current.click()}>
          {ico.image}
          <span>Carica un'immagine</span>
        </button>
        <input className="image-url" value={url}
               placeholder="…oppure incolla un URL e premi Invio"
               onChange={(e) => setUrl(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && url.trim()) onChange({ ...block, src: url.trim() });
               }} />
        {block.caption && <div className="image-empty-cap">{block.caption}</div>}
      </div>
    );
  }

  return (
    <figure className="image-frame">
      <div className="image-photo">
        <img src={block.src} alt={block.caption || ''} />
        <button type="button" className="image-change"
                onClick={() => fileRef.current && fileRef.current.click()}>Cambia</button>
        <input ref={fileRef} type="file" accept="image/*" hidden
               onChange={(e) => pick(e.target.files && e.target.files[0])} />
      </div>
      <figcaption>
        <input className="cell-input" value={block.caption || ''} placeholder="Didascalia…"
               onChange={(e) => onChange({ ...block, caption: e.target.value })} />
      </figcaption>
    </figure>
  );
}

// ─── A single block — render mode + click-to-edit ────────────────────────
function Block({ block, editing, setEditing, onChange, onDelete, onMove, isFirst, isLast, onLink }) {
  const toolbar = (
    <div className="block-tools">
      <button type="button" disabled={isFirst} title="Sposta su"
              onClick={(e) => { e.stopPropagation(); onMove(-1); }}>{ico.up}</button>
      <button type="button" disabled={isLast} title="Sposta giù"
              onClick={(e) => { e.stopPropagation(); onMove(1); }}>{ico.down}</button>
      <button type="button" className="danger" title="Elimina blocco"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}>{ico.trash}</button>
    </div>
  );

  const isText = TEXT_TYPES.includes(block.type);

  const multilineType = block.type === 'p' || block.type === 'callout';

  if (isText && editing) {
    return (
      <div className="block is-editing">
        {toolbar}
        <AutoTextarea
          className={`block-input block-input--${block.type}`}
          value={block.text}
          autoFocus
          placeholder={placeholderFor(block.type)}
          lists={multilineType}
          onChange={(v) => onChange({ ...block, text: v })}
          onDone={() => setEditing(null)}
        />
      </div>
    );
  }

  if (isText) {
    const empty = !block.text || !block.text.trim();
    const inner = empty
      ? <span className="block-placeholder">{placeholderFor(block.type)}</span>
      : <RichText text={block.text} onLink={onLink} multiline={multilineType} />;
    let body;
    if (block.type === 'h2') body = <h2 className="b">{inner}</h2>;
    else if (block.type === 'h3') body = <h3 className="b">{inner}</h3>;
    else if (block.type === 'callout') {
      body = (
        <div className={`callout ${block.kind || ''}`}>
          <span className="callout-icon">{ico.info}</span>
          <div>{inner}</div>
        </div>
      );
    } else body = <div className="b para">{inner}</div>;
    return (
      <div className="block block--clickable" onClick={() => setEditing(block.id)}>
        {toolbar}
        {body}
      </div>
    );
  }

  if (block.type === 'table') {
    return <div className="block">{toolbar}<TableBlock block={block} onChange={onChange} /></div>;
  }
  if (block.type === 'image') {
    return <div className="block">{toolbar}<ImageBlock block={block} onChange={onChange} /></div>;
  }
  if (block.type === 'chart') {
    return <div className="block">{toolbar}<ChartBlock block={block} onChange={onChange} /></div>;
  }
  return null;
}

// ─── Bibliography side panel ─────────────────────────────────────────────
function BibliographyPanel({ note, onUpdate, onLink }) {
  const store = useStore();
  const [showForm, setShowForm] = React.useState(false);
  const noteRefs = (note.refs || []).map((rid) => store.getSource(rid)).filter(Boolean);
  const available = store.sources.filter((s) => !(note.refs || []).includes(s.id));
  const related = (note.related || []).map(store.getNote).filter(Boolean);

  const attach = (id) => onUpdate({ refs: [...(note.refs || []), id] });
  const detach = (id) => onUpdate({ refs: (note.refs || []).filter((x) => x !== id) });
  const createAndAttach = (data) => {
    attach(store.createSource(data));
    setShowForm(false);
  };

  return (
    <aside className="biblio">
      <div className="biblio-head">
        <h4>Bibliografia</h4>
        <span className="chip" style={{ '--c': 'var(--accent)' }}>{noteRefs.length} fonti</span>
      </div>

      <div className="biblio-list">
        {noteRefs.map((r, i) => (
          <div key={r.id} className="biblio-item">
            <div className="biblio-item-text">
              <span className="biblio-tag">[{i + 1}]</span>
              <span className="biblio-title">{r.authors || 'Autore ignoto'}</span>{' '}
              <span style={{ color: 'var(--ink-3)' }}>({r.year || 's.d.'}).</span>{' '}
              {r.title}.{' '}
              <span className="biblio-journal">{r.journal}</span>
            </div>
            <button type="button" className="row-action" title="Rimuovi fonte"
                    onClick={() => detach(r.id)}>{ico.x}</button>
          </div>
        ))}
        {noteRefs.length === 0 && (
          <div className="panel-empty">Nessuna fonte ancora. Aggiungine una qui sotto.</div>
        )}

        <Dropdown
          className="biblio-add"
          align="right"
          trigger={(
            <button type="button" className="btn btn-ghost panel-add-btn">
              {ico.plus} Aggiungi fonte
            </button>
          )}
        >
          <button type="button" className="menu-item menu-item--accent"
                  onClick={() => setShowForm(true)}>
            {ico.plus} Crea nuova fonte
          </button>
          {available.length > 0 && <div className="menu-sep" />}
          {available.map((s) => (
            <button key={s.id} type="button" className="menu-item menu-item--stacked"
                    onClick={() => attach(s.id)}>
              <span className="menu-item-title">{s.title}</span>
              <span className="menu-item-sub">
                {s.authors}{s.year ? ` · ${s.year}` : ''}
              </span>
            </button>
          ))}
        </Dropdown>
      </div>

      {related.length > 0 && (
        <div className="related">
          <h4>Note collegate</h4>
          <div className="related-list">
            {related.map((n) => {
              const f = store.getFolder(n.folder);
              return (
                <div key={n.id} className="related-item"
                     style={{ '--c': f ? f.color : 'var(--accent)' }}
                     onClick={() => onLink(n.id)}>
                  <span className="rel-dot" />
                  <span>{n.title || 'Senza titolo'}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--ink-4)', fontSize: 11 }}>
                    {f ? f.name : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <SourceFormModal onClose={() => setShowForm(false)} onSave={createAndAttach} />
      )}
    </aside>
  );
}

// ─── Editor view ─────────────────────────────────────────────────────────
function EditorView({ noteId, onOpenNote, onRoute }) {
  const store = useStore();
  const confirm = useConfirm();
  const note = store.getNote(noteId);
  const [editingId, setEditingId] = React.useState(null);
  const [newRegion, setNewRegion] = React.useState('');
  const [biblioHidden, setBiblioHidden] = React.useState(() => {
    try { return localStorage.getItem('neuromap.ui.biblioHidden') === '1'; } catch (e) { return false; }
  });
  React.useEffect(() => {
    try { localStorage.setItem('neuromap.ui.biblioHidden', biblioHidden ? '1' : '0'); } catch (e) { /* ignore */ }
  }, [biblioHidden]);

  if (!note) {
    return (
      <div className="view-missing">
        <p>Questa nota non esiste più.</p>
        <button className="btn" onClick={() => onRoute({ kind: 'recenti' })}>Torna a Recenti</button>
      </div>
    );
  }

  const folder = store.getFolder(note.folder);
  const patch = (p) => store.updateNote(note.id, p);
  const setBlocks = (blocks) => patch({ blocks });

  const updateBlock = (b) => setBlocks(note.blocks.map((x) => (x.id === b.id ? b : x)));
  const deleteBlock = (id) => {
    if (editingId === id) setEditingId(null);
    setBlocks(note.blocks.filter((x) => x.id !== id));
  };
  const moveBlock = (id, dir) => {
    const i = note.blocks.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= note.blocks.length) return;
    const next = note.blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };
  const addBlock = (type) => {
    const nb = makeBlock(type);
    setBlocks([...note.blocks, nb]);
    if (TEXT_TYPES.includes(nb.type)) setEditingId(nb.id);
  };

  const removeNote = async () => {
    if (await confirm(`Eliminare la nota "${note.title || 'Senza titolo'}"?`)) {
      store.deleteNote(note.id);
      onRoute({ kind: 'recenti' });
    }
  };

  const removeRegionFromCatalog = async (region) => {
    const used = store.notes.filter((n) => (n.regions || []).includes(region.id)).length;
    const message = used > 0
      ? `Eliminare la regione "${region.label}"? Verrà rimossa da ${used} ${used === 1 ? 'nota' : 'note'}.`
      : `Eliminare la regione "${region.label}" dal catalogo?`;
    if (await confirm(message)) store.deleteRegion(region.id);
  };

  return (
    <div className={`editor ${biblioHidden ? 'biblio-hidden' : ''}`}>
      <div className="editor-scroll">
        <div className="editor-doc">
          <div className="editor-meta">
            <Dropdown
              trigger={(
                <span className="chip" style={folder ? { '--c': folder.color } : undefined}>
                  {folder ? folder.name : 'Senza cartella'}
                  <span className="chip-caret">▾</span>
                </span>
              )}
            >
              {store.folders.map((f) => (
                <button key={f.id} type="button" className="menu-item"
                        onClick={() => patch({ folder: f.id })}>
                  <span className="menu-dot" style={{ background: f.color }} />
                  {f.name}
                </button>
              ))}
            </Dropdown>

            {note.regions.map((rid) => {
              const r = store.getRegion(rid);
              if (!r) return null;
              return (
                <span key={rid} className="region-tag">
                  {r.label}
                  <button type="button" className="region-tag-x" title="Rimuovi regione"
                          onClick={() => patch({ regions: note.regions.filter((x) => x !== rid) })}>
                    {ico.x}
                  </button>
                </span>
              );
            })}
            <Dropdown
              className="region-add"
              trigger={(
                <button type="button" className="region-add-btn">{ico.plus} Regione</button>
              )}
            >
              <div className="region-create" onClick={(e) => e.stopPropagation()}>
                <input
                  className="region-create-input"
                  placeholder="Crea una nuova regione…"
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRegion.trim()) {
                      patch({ regions: [...note.regions, store.createRegion(newRegion)] });
                      setNewRegion('');
                    }
                  }}
                />
              </div>
              {store.regions.some((r) => !note.regions.includes(r.id)) && (
                <div className="menu-sep" />
              )}
              {store.regions
                .filter((r) => !note.regions.includes(r.id))
                .map((r) => (
                  <div key={r.id} className="region-row">
                    <button type="button" className="menu-item"
                            onClick={() => patch({ regions: [...note.regions, r.id] })}>
                      {r.label}
                    </button>
                    <button type="button" className="region-row-del"
                            title="Elimina dal catalogo"
                            onClick={() => removeRegionFromCatalog(r)}>
                      {ico.trash}
                    </button>
                  </div>
                ))}
            </Dropdown>

            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>Aggiornata {note.updated}</span>

            <span className="editor-meta-actions">
              <button type="button" className={`icon-btn ${biblioHidden ? '' : 'is-active'}`}
                      title={biblioHidden ? 'Mostra bibliografia' : 'Nascondi bibliografia'}
                      onClick={() => setBiblioHidden((h) => !h)}>
                {ico.panel}
              </button>
              <button type="button" className={`icon-btn star-btn ${note.starred ? 'is-on' : ''}`}
                      title={note.starred ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                      onClick={() => store.toggleStar(note.id)}>
                {ico.star}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                {ico.download} Esporta PDF
              </button>
              <button type="button" className="btn btn-ghost btn-danger-ghost" onClick={removeNote}>
                {ico.trash} Elimina
              </button>
            </span>
          </div>

          <AutoTextarea
            className="editor-title"
            value={note.title}
            placeholder="Titolo della nota"
            singleLine
            autoFocus={!note.title}
            onChange={(v) => patch({ title: v })}
          />

          {note.blocks.map((b, i) => (
            <Block
              key={b.id}
              block={b}
              editing={editingId === b.id}
              setEditing={setEditingId}
              onChange={updateBlock}
              onDelete={() => deleteBlock(b.id)}
              onMove={(dir) => moveBlock(b.id, dir)}
              isFirst={i === 0}
              isLast={i === note.blocks.length - 1}
              onLink={onOpenNote}
            />
          ))}

          <Dropdown
            className="add-block"
            trigger={<button type="button" className="add-block-btn">{ico.plus} Aggiungi blocco</button>}
          >
            <button type="button" className="menu-item" onClick={() => addBlock('p')}>Paragrafo</button>
            <button type="button" className="menu-item" onClick={() => addBlock('h2')}>Titolo sezione</button>
            <button type="button" className="menu-item" onClick={() => addBlock('h3')}>Sottotitolo</button>
            <button type="button" className="menu-item" onClick={() => addBlock('callout')}>Nota evidenziata</button>
            <button type="button" className="menu-item" onClick={() => addBlock('table')}>Tabella</button>
            <button type="button" className="menu-item" onClick={() => addBlock('image')}>Immagine</button>
            <button type="button" className="menu-item" onClick={() => addBlock('chart')}>Grafico</button>
          </Dropdown>
        </div>
      </div>

      <BibliographyPanel note={note} onUpdate={patch} onLink={onOpenNote} />
    </div>
  );
}

export { EditorView };
