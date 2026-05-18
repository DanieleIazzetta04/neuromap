import React from 'react';
import {
  FOLDERS as SEED_FOLDERS,
  NOTES as SEED_NOTES,
  BIBLIO as SEED_BIBLIO,
  REGIONS as SEED_REGIONS,
} from './data.js';

/* NeuroMap — Store
   Single source of truth for folders, notes & bibliography sources,
   persisted to localStorage. Exposes CRUD actions through React context;
   also hosts the confirm dialog.
*/

const STORAGE_KEY = 'neuromap.v1';

// Folder colour palette — also offered in the folder colour picker.
export const FOLDER_PALETTE = [
  'oklch(42% 0.060 178)',
  'oklch(64% 0.130 72)',
  'oklch(48% 0.090 145)',
  'oklch(57% 0.150 25)',
  'oklch(47% 0.100 320)',
  'oklch(52% 0.100 250)',
  'oklch(58% 0.130 52)',
  'oklch(50% 0.095 200)',
  'oklch(46% 0.110 290)',
  'oklch(55% 0.120 350)',
];

let _seq = 0;
function uid(prefix) {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}${_seq.toString(36)}`;
}

// Build a fresh block of the given type, ready to drop into a note.
export function makeBlock(type) {
  const id = uid('b');
  if (type === 'table') {
    return { id, type: 'table', head: ['Colonna 1', 'Colonna 2'], rows: [['', ''], ['', '']] };
  }
  if (type === 'callout') return { id, type: 'callout', kind: '', text: '' };
  if (type === 'image') return { id, type: 'image', src: '', caption: '' };
  if (type === 'chart') {
    return {
      id, type: 'chart', chartType: 'bar',
      data: [
        { label: 'Gen', value: 30 },
        { label: 'Feb', value: 52 },
        { label: 'Mar', value: 41 },
      ],
    };
  }
  return { id, type, text: '' };
}

// Card previews come from the first meaningful paragraph, with wiki/bold
// markup stripped so the snippet reads cleanly.
function deriveExcerpt(note) {
  const para = (note.blocks || []).find(
    (b) => (b.type === 'p' || b.type === 'callout') && b.text && b.text.trim(),
  );
  const raw = para ? para.text : '';
  return raw.replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/<\/?b>/g, '').trim().slice(0, 220);
}

function normalizeNote(n) {
  return {
    regions: [], refs: [], related: [], excerpt: '', starred: false, updated: 'adesso',
    ...n,
    blocks: (n.blocks || []).map((b) => (b.id ? b : { ...b, id: uid('b') })),
  };
}

function seedSources() {
  return Object.entries(SEED_BIBLIO).map(([id, b]) => ({ id, ...b }));
}

function seedRegions() {
  return SEED_REGIONS.map((r) => ({ id: r.id, label: r.label }));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.folders) && Array.isArray(parsed.notes)) {
        return {
          folders: parsed.folders,
          notes: parsed.notes.map(normalizeNote),
          sources: Array.isArray(parsed.sources) ? parsed.sources : seedSources(),
          regions: Array.isArray(parsed.regions) ? parsed.regions : seedRegions(),
        };
      }
    }
  } catch (e) {
    /* corrupt storage — fall through to the seed */
  }
  return {
    folders: SEED_FOLDERS.map((f) => ({ ...f })),
    notes: SEED_NOTES.map((n) => normalizeNote({ ...n })),
    sources: seedSources(),
    regions: seedRegions(),
  };
}

const StoreContext = React.createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = React.useState(loadState);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore quota / private-mode write failures */
    }
  }, [state]);

  const { folders, notes, sources, regions } = state;

  const api = React.useMemo(() => ({
    folders,
    notes,
    sources,
    regions,
    getFolder: (id) => folders.find((f) => f.id === id),
    getNote: (id) => notes.find((n) => n.id === id),
    getSource: (id) => sources.find((s) => s.id === id),
    getRegion: (id) => regions.find((r) => r.id === id),
    notesByFolder: (fid) => notes.filter((n) => n.folder === fid),
    folderCount: (fid) => notes.reduce((c, n) => c + (n.folder === fid ? 1 : 0), 0),
    starredCount: () => notes.reduce((c, n) => c + (n.starred ? 1 : 0), 0),

    createNote: (folderId) => {
      const folder = folderId || (folders[0] && folders[0].id) || null;
      const note = {
        id: uid('n'), title: '', folder,
        regions: [], refs: [], related: [], updated: 'adesso',
        excerpt: '', starred: false,
        blocks: [makeBlock('p')],
      };
      setState((s) => ({ ...s, notes: [note, ...s.notes] }));
      return note.id;
    },

    updateNote: (id, patch) => {
      setState((s) => {
        const target = s.notes.find((n) => n.id === id);
        if (!target) return s;
        const updated = { ...target, ...patch, updated: 'adesso' };
        updated.excerpt = deriveExcerpt(updated);
        // Most-recently-touched note floats to the front (drives "Recenti").
        return { ...s, notes: [updated, ...s.notes.filter((n) => n.id !== id)] };
      });
    },

    deleteNote: (id) => {
      setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    },

    toggleStar: (id) => {
      setState((s) => ({
        ...s,
        notes: s.notes.map((n) => (n.id === id ? { ...n, starred: !n.starred } : n)),
      }));
    },

    createFolder: (name, color) => {
      const fallback = FOLDER_PALETTE[folders.length % FOLDER_PALETTE.length];
      const folder = {
        id: uid('f'),
        name: (name || '').trim() || 'Nuova cartella',
        color: color || fallback,
      };
      setState((s) => ({ ...s, folders: [...s.folders, folder] }));
      return folder.id;
    },

    renameFolder: (id, name) => {
      const clean = (name || '').trim();
      if (!clean) return;
      setState((s) => ({
        ...s,
        folders: s.folders.map((f) => (f.id === id ? { ...f, name: clean } : f)),
      }));
    },

    setFolderColor: (id, color) => {
      setState((s) => ({
        ...s,
        folders: s.folders.map((f) => (f.id === id ? { ...f, color } : f)),
      }));
    },

    // Removing a folder also removes the notes filed under it.
    deleteFolder: (id) => {
      setState((s) => ({
        ...s,
        folders: s.folders.filter((f) => f.id !== id),
        notes: s.notes.filter((n) => n.folder !== id),
      }));
    },

    createSource: (data) => {
      const src = {
        id: uid('src'), title: '', authors: '', year: '', journal: '',
        ...data,
      };
      setState((s) => ({ ...s, sources: [...s.sources, src] }));
      return src.id;
    },

    // Removing a source also detaches it from every note that cited it.
    deleteSource: (id) => {
      setState((s) => ({
        ...s,
        sources: s.sources.filter((x) => x.id !== id),
        notes: s.notes.map((n) => (
          (n.refs || []).includes(id) ? { ...n, refs: n.refs.filter((r) => r !== id) } : n
        )),
      }));
    },

    createRegion: (label) => {
      const region = { id: uid('reg'), label: (label || '').trim() || 'Nuova regione' };
      setState((s) => ({ ...s, regions: [...s.regions, region] }));
      return region.id;
    },

    // Removing a region also detaches it from every note that used it.
    deleteRegion: (id) => {
      setState((s) => ({
        ...s,
        regions: s.regions.filter((r) => r.id !== id),
        notes: s.notes.map((n) => (
          (n.regions || []).includes(id)
            ? { ...n, regions: n.regions.filter((x) => x !== id) }
            : n
        )),
      }));
    },
  }), [folders, notes, sources, regions]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}

/* ─── Confirm dialog ──────────────────────────────────────────────────────
   useConfirm() returns an async confirm(message) that resolves to a boolean,
   so destructive actions can simply `if (await confirm(...))`.
*/
const ConfirmContext = React.createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = React.useState(null);

  const confirm = React.useCallback(
    (message, confirmLabel = 'Elimina') =>
      new Promise((resolve) => setDialog({ message, confirmLabel, resolve })),
    [],
  );

  const settle = (result) => {
    if (dialog) dialog.resolve(result);
    setDialog(null);
  };

  React.useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { dialog.resolve(false); setDialog(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-scrim" onMouseDown={() => settle(false)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <p className="modal-msg">{dialog.message}</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => settle(false)}>Annulla</button>
              <button className="btn btn-danger" onClick={() => settle(true)}>
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}
