import React from 'react';
import { useStore, useConfirm } from './store.jsx';
import { Dropdown, ColorSwatches } from './ui.jsx';

/* NeuroMap — Sidebar
   Left rail: nuova nota, Cerca, Recenti, Preferite, Cartelle (create / rename /
   recolour / delete), Bibliografia, Esporta.
*/

// ─── Icons (16x16, 1.5px stroke) ─────────────────────────────────────────
const Icon = {
  search: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13.5 13.5" />
    </svg>
  ),
  menu: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  ),
  book: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5h6c1.1 0 2 .9 2 2v9" />
      <path d="M3 2.5v9c0 1.1.9 2 2 2h8" />
      <path d="M3 11.5h8" />
    </svg>
  ),
  download: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.5V10M4.5 7l3.5 3 3.5-3M3 13h10" />
    </svg>
  ),
  plus: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M8 2.5l1.8 3.6 3.9.6-2.8 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.3 6.7l4-.6L8 2.5z" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2L10 10" />
    </svg>
  ),
  more: () => (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
      <circle cx="3.4" cy="8" r="1.3" /><circle cx="8" cy="8" r="1.3" /><circle cx="12.6" cy="8" r="1.3" />
    </svg>
  ),
  pencil: () => (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2.5l3 3M11.6 3.4 4 11l-.5 2.5L6 13l7.6-7.6z" />
    </svg>
  ),
  trash: () => (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.8 4.5l.5 8h5.4l.5-8" />
    </svg>
  ),
};

// ─── A single folder row — open / rename inline / colour + delete menu ───
function FolderRow({ folder, count, active, onOpen, onRename, onSetColor, onDelete }) {
  const [renaming, setRenaming] = React.useState(false);
  const [draft, setDraft] = React.useState(folder.name);
  const escaped = React.useRef(false);

  const startRename = () => {
    setDraft(folder.name);
    escaped.current = false;
    setRenaming(true);
  };

  const finishRename = () => {
    setRenaming(false);
    if (escaped.current) { escaped.current = false; return; }
    onRename(draft);
  };

  if (renaming) {
    return (
      <div className="side-item folder-row" style={{ '--c': folder.color }}>
        <span className="side-dot" />
        <input
          className="inline-input"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finishRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') { escaped.current = true; e.currentTarget.blur(); }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`side-item folder-row ${active ? 'is-active' : ''}`}
         style={{ '--c': folder.color }} onClick={onOpen}>
      <span className="side-dot" />
      <span>{folder.name}</span>
      <span className="side-count">{count}</span>
      <Dropdown
        align="right"
        className="folder-menu"
        trigger={(
          <button type="button" className="row-action" aria-label="Azioni cartella">
            <Icon.more />
          </button>
        )}
      >
        <div className="menu-swatches">
          <ColorSwatches value={folder.color} onChange={onSetColor} />
        </div>
        <button type="button" className="menu-item" onClick={startRename}>
          <Icon.pencil /> Rinomina
        </button>
        <button type="button" className="menu-item menu-item--danger" onClick={onDelete}>
          <Icon.trash /> Elimina
        </button>
      </Dropdown>
    </div>
  );
}

// ─── Inline "new folder" panel — name + colour ───────────────────────────
function NewFolderRow({ onCreate }) {
  const { palette } = useStore();
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState(palette[0]);

  const reset = () => { setAdding(false); setName(''); setColor(palette[0]); };
  const create = () => {
    const clean = name.trim();
    if (clean) onCreate(clean, color);
    reset();
  };

  if (adding) {
    return (
      <div className="new-folder">
        <input
          className="inline-input"
          autoFocus
          placeholder="Nome cartella…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
            if (e.key === 'Escape') reset();
          }}
        />
        <ColorSwatches value={color} onChange={setColor} />
        <div className="new-folder-actions">
          <button type="button" className="btn btn-ghost" onClick={reset}>Annulla</button>
          <button type="button" className="btn btn-primary" onClick={create}>Crea</button>
        </div>
      </div>
    );
  }

  return (
    <div className="side-item side-add" onClick={() => setAdding(true)}>
      <span className="side-icon"><Icon.plus /></span>
      <span>Nuova cartella</span>
    </div>
  );
}

function Sidebar({ route, onRoute, open = false, onClose }) {
  const store = useStore();
  const confirm = useConfirm();
  const { folders } = store;

  // Mobile drawer: Escape closes it.
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isSearch  = route.kind === 'search';
  const isBiblio  = route.kind === 'biblio';
  const isRecenti = route.kind === 'recenti';
  const isStar    = route.kind === 'star';
  const isFolder  = route.kind === 'folder';

  const newNote = () => {
    const folderId = route.kind === 'folder' ? route.id : (folders[0] && folders[0].id);
    onRoute({ kind: 'note', id: store.createNote(folderId) });
  };

  const removeFolder = async (folder) => {
    const n = store.folderCount(folder.id);
    const message = n > 0
      ? `Eliminare la cartella "${folder.name}" e le sue ${n} ${n === 1 ? 'nota' : 'note'}?`
      : `Eliminare la cartella "${folder.name}"?`;
    if (await confirm(message)) {
      store.deleteFolder(folder.id);
      if (route.kind === 'folder' && route.id === folder.id) onRoute({ kind: 'recenti' });
    }
  };

  return (
    <>
      <div className={`sidebar-scrim ${open ? 'is-open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
      <button className="side-new-btn" onClick={newNote}>
        <Icon.plus /> Nuova nota
      </button>

      <div className="side-group-label">Workspace</div>

      <div className={`side-item ${isSearch ? 'is-active' : ''}`}
           onClick={() => onRoute({ kind: 'search', q: '' })}>
        <span className="side-icon"><Icon.search /></span>
        <span>Cerca</span>
        <span className="side-count">⌘K</span>
      </div>

      <div className={`side-item ${isRecenti ? 'is-active' : ''}`}
           onClick={() => onRoute({ kind: 'recenti' })}>
        <span className="side-icon"><Icon.clock /></span>
        <span>Recenti</span>
      </div>

      <div className={`side-item ${isStar ? 'is-active' : ''}`}
           onClick={() => onRoute({ kind: 'star' })}>
        <span className="side-icon"><Icon.star /></span>
        <span>Preferite</span>
        <span className="side-count">{store.starredCount()}</span>
      </div>

      <div className="side-group-label">Cartelle</div>
      {folders.map((f) => (
        <FolderRow
          key={f.id}
          folder={f}
          count={store.folderCount(f.id)}
          active={isFolder && route.id === f.id}
          onOpen={() => onRoute({ kind: 'folder', id: f.id })}
          onRename={(name) => store.renameFolder(f.id, name)}
          onSetColor={(color) => store.setFolderColor(f.id, color)}
          onDelete={() => removeFolder(f)}
        />
      ))}
      <NewFolderRow onCreate={(name, color) => onRoute({ kind: 'folder', id: store.createFolder(name, color) })} />

      <div className="side-group-label">Strumenti</div>

      <div className={`side-item ${isBiblio ? 'is-active' : ''}`}
           onClick={() => onRoute({ kind: 'biblio' })}>
        <span className="side-icon"><Icon.book /></span>
        <span>Bibliografia</span>
        <span className="side-count">{store.sources.length}</span>
      </div>

      <div className="side-item" onClick={() => window.print()}>
        <span className="side-icon"><Icon.download /></span>
        <span>Esporta PDF</span>
      </div>
      </aside>
    </>
  );
}

export { Sidebar, Icon as AppIcon };
