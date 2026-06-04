import React from 'react';
import { useStore, useConfirm } from './store.jsx';
import { SourceFormModal } from './ui.jsx';
import { openFile } from './files.js';

/* NeuroMap — List views: Recenti, Preferite, cartella, Bibliografia */

const xIcon = (
  <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
);

const fileIcon = (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor"
       strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5z" />
    <path d="M9 1.5V5.5H13" />
  </svg>
);

const regionLabels = (getRegion, regions) => (regions || [])
  .map((rid) => { const r = getRegion(rid); return r ? r.label : null; })
  .filter(Boolean)
  .join(' · ');

// Shared note card with a hover delete control.
function NoteCard({ note, eyebrow, metaRight, onOpen }) {
  const store = useStore();
  const confirm = useConfirm();
  const folder = store.getFolder(note.folder);

  const remove = async () => {
    if (await confirm(`Eliminare la nota "${note.title || 'Senza titolo'}"?`)) {
      store.deleteNote(note.id);
    }
  };

  return (
    <div className="result-card card-x" style={folder ? { '--c': folder.color } : undefined}
         onClick={onOpen}>
      <button type="button" className="card-delete" title="Elimina nota"
              onClick={(e) => { e.stopPropagation(); remove(); }}>
        {xIcon}
      </button>
      <div className="card-eyebrow"><span className="side-dot" />{eyebrow}</div>
      <h4>{note.title || 'Senza titolo'}</h4>
      <p className="result-excerpt">{note.excerpt || 'Nota senza contenuto.'}</p>
      <div className="result-meta">
        <span>{note.updated}</span>
        {metaRight && <span style={{ marginLeft: 'auto' }}>{metaRight}</span>}
      </div>
    </div>
  );
}

function FolderView({ folderId, onOpenNote }) {
  const store = useStore();
  const folder = store.getFolder(folderId);
  const notes = store.notesByFolder(folderId);

  if (!folder) {
    return <div className="view-missing"><p>Questa cartella non esiste più.</p></div>;
  }

  const create = () => onOpenNote(store.createNote(folderId));

  return (
    <div className="folder-view">
      <div className="folder-head">
        <div className="crumbs">Cartelle / <b style={{ color: 'var(--ink)' }}>{folder.name}</b></div>
        <div className="folder-head-row">
          <h2>{folder.name}</h2>
          <span className="chip" style={{ '--c': folder.color }}>
            {notes.length} {notes.length === 1 ? 'nota' : 'note'}
          </span>
          <button className="btn btn-primary head-action" onClick={create}>+ Nuova nota</button>
        </div>
        <div className="folder-sub">Tutte le note di {folder.name}.</div>
      </div>
      <div className="folder-list">
        {notes.length === 0 ? (
          <div className="view-empty">
            <p>Questa cartella è ancora vuota.</p>
            <button className="btn btn-primary" onClick={create}>+ Crea la prima nota</button>
          </div>
        ) : (
          <div className="folder-grid">
            {notes.map((n) => (
              <NoteCard
                key={n.id}
                note={n}
                eyebrow={regionLabels(store.getRegion, n.regions) || folder.name}
                metaRight={`${n.refs.length} ${n.refs.length === 1 ? 'fonte' : 'fonti'}`}
                onOpen={() => onOpenNote(n.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecentView({ mode, onOpenNote }) {
  const store = useStore();
  const isStar = mode === 'star';
  const notes = isStar ? store.notes.filter((n) => n.starred) : store.notes;

  return (
    <div className="folder-view">
      <div className="folder-head">
        <div className="crumbs">Workspace</div>
        <div className="folder-head-row">
          <h2>{isStar ? 'Preferite' : 'Recenti'}</h2>
          <button className="btn btn-primary head-action"
                  onClick={() => onOpenNote(store.createNote())}>+ Nuova nota</button>
        </div>
        <div className="folder-sub">
          {isStar
            ? 'Le note che hai contrassegnato come preferite.'
            : 'Tutte le tue note, dalla più recente.'}
        </div>
      </div>
      <div className="folder-list">
        {notes.length === 0 ? (
          <div className="view-empty">
            <p>{isStar
              ? 'Nessuna nota preferita. Apri una nota e tocca la stella.'
              : 'Nessuna nota. Creane una per iniziare.'}</p>
            {!isStar && (
              <button className="btn btn-primary"
                      onClick={() => onOpenNote(store.createNote())}>+ Crea una nota</button>
            )}
          </div>
        ) : (
          <div className="folder-grid">
            {notes.map((n) => {
              const f = store.getFolder(n.folder);
              return (
                <NoteCard
                  key={n.id}
                  note={n}
                  eyebrow={f ? f.name : 'Senza cartella'}
                  metaRight={regionLabels(store.getRegion, n.regions)}
                  onOpen={() => onOpenNote(n.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BiblioView({ onOpenNote }) {
  const store = useStore();
  const confirm = useConfirm();
  const [showForm, setShowForm] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);

  const removeSource = async (s) => {
    const used = store.notes.filter((n) => (n.refs || []).includes(s.id)).length;
    const message = used > 0
      ? `Eliminare la fonte "${s.title}"? Verrà rimossa da ${used} ${used === 1 ? 'nota' : 'note'}.`
      : `Eliminare la fonte "${s.title}" dal catalogo?`;
    if (await confirm(message)) store.deleteSource(s.id);
  };
  const openForm = (file = null) => { setPendingFile(file); setShowForm(true); };
  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) openForm(f);
  };

  return (
    <div className={`folder-view ${dragging ? 'is-drag' : ''}`}
         onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
         onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
         onDrop={onDrop}>
      <div className="folder-head">
        <div className="crumbs">Strumenti</div>
        <div className="folder-head-row">
          <h2>Bibliografia</h2>
          <button className="btn btn-primary head-action"
                  onClick={() => openForm()}>+ Nuova fonte</button>
        </div>
        <div className="folder-sub">
          Il catalogo delle fonti. Trascina un PDF qui per aggiungerlo. Collega una
          fonte a una nota dal pannello dell'editor.
        </div>
      </div>
      <div className="folder-list">
        {store.sources.length === 0 ? (
          <div className="view-empty">
            <p>Il catalogo è vuoto. Trascina qui un PDF o aggiungi una fonte.</p>
            <button className="btn btn-primary" onClick={() => openForm()}>+ Aggiungi una fonte</button>
          </div>
        ) : (
          <div className="folder-grid" style={{ maxWidth: 960, margin: '0 auto' }}>
            {store.sources.map((r, i) => {
              const usedBy = store.notes.filter((n) => (n.refs || []).includes(r.id));
              return (
                <div key={r.id} className="result-card card-x">
                  <button type="button" className="card-delete" title="Elimina fonte"
                          onClick={() => removeSource(r)}>{xIcon}</button>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5,
                                color: 'var(--accent)', marginBottom: 4 }}>
                    [REF-{String(i + 1).padStart(2, '0')}]
                  </div>
                  <h4 style={{ fontSize: 16 }}>{r.title}</h4>
                  <p className="result-excerpt" style={{ marginBottom: 6 }}>
                    <b style={{ color: 'var(--ink)' }}>{r.authors || 'Autore ignoto'}</b>{' '}
                    ({r.year || 's.d.'}).{' '}
                    <span style={{ fontStyle: 'italic' }}>{r.journal}</span>
                  </p>
                  {r.file && (
                    <button type="button" className="biblio-file" title={`Apri ${r.file.name}`}
                            onClick={() => openFile(r.file.id, r.file.name)}>
                      {fileIcon} {r.file.name}
                    </button>
                  )}
                  <div className="result-meta" style={{ flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ color: 'var(--ink-3)' }}>Usata in:</span>
                    {usedBy.map((n) => (
                      <span key={n.id}
                            style={{ color: 'var(--ink-2)', cursor: 'pointer',
                                     borderBottom: '1px dashed var(--rule)' }}
                            onClick={() => onOpenNote(n.id)}>
                        {n.title || 'Senza titolo'}
                      </span>
                    ))}
                    {usedBy.length === 0 && (
                      <span style={{ color: 'var(--ink-4)' }}>(non ancora citata)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showForm && (
        <SourceFormModal
          onClose={() => { setShowForm(false); setPendingFile(null); }}
          onSave={(d) => { store.createSource(d); setShowForm(false); setPendingFile(null); }}
          initialFile={pendingFile}
        />
      )}
    </div>
  );
}

export { FolderView, RecentView, BiblioView };
