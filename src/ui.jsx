import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from './store.jsx';
import { putFile, extractDocMeta, formatSize } from './files.js';

/* NeuroMap — Shared UI primitives */

// Dropdown — a trigger plus a click-away popover. The menu is rendered in a
// portal with fixed positioning, so it is never clipped by a scrolling
// ancestor; it flips above the trigger when there isn't room below.
export function Dropdown({ trigger, children, align = 'left', className = '' }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const triggerRef = React.useRef(null);
  const menuRef = React.useRef(null);

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const flip = below < 220 && r.top > below;
    setPos({
      top: flip ? null : Math.round(r.bottom + 4),
      bottom: flip ? Math.round(window.innerHeight - r.top + 4) : null,
      left: Math.round(r.left),
      right: Math.round(window.innerWidth - r.right),
      maxHeight: Math.round((flip ? r.top : below) - 16),
    });
  }, []);

  React.useEffect(() => {
    if (!open) return undefined;
    place();
    const onDown = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const reposition = (e) => {
      if (e && menuRef.current && menuRef.current.contains(e.target)) return;
      place();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, place]);

  return (
    <span className={`dropdown ${className}`}>
      <span ref={triggerRef} className="dropdown-trigger"
            onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        {trigger}
      </span>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="dropdown-menu"
          style={{
            position: 'fixed',
            top: pos.top != null ? pos.top : undefined,
            bottom: pos.bottom != null ? pos.bottom : undefined,
            left: align === 'right' ? undefined : pos.left,
            right: align === 'right' ? pos.right : undefined,
            maxHeight: pos.maxHeight,
          }}
          onClick={(e) => { e.stopPropagation(); setOpen(false); }}
        >
          {children}
        </div>,
        document.body,
      )}
    </span>
  );
}

// AutoTextarea — a textarea that grows to fit its content. Used for the note
// title and for editing text blocks.
const LIST_NUM_RE = /^(\s*)(\d+)\.\s+(.*)$/;
const LIST_BUL_RE = /^(\s*)([•*\-])\s+(.*)$/;

export function AutoTextarea({
  value, onChange, className = '', placeholder, autoFocus = false,
  singleLine = false, lists = false, onDone,
}) {
  const ref = React.useRef(null);
  // Cursor position to restore after a React-driven value change.
  const pendingCursor = React.useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
    if (pendingCursor.current != null) {
      el.selectionStart = el.selectionEnd = pendingCursor.current;
      pendingCursor.current = null;
    }
  };

  React.useLayoutEffect(resize, [value]);

  // Enter on a list line auto-inserts the next marker; an empty list line
  // exits the list. Shift+Enter falls through to the textarea's default
  // newline, preserving the soft break inside the same item.
  const handleListEnter = (e) => {
    if (!lists || e.key !== 'Enter' || e.shiftKey) return;
    const ta = e.currentTarget;
    const pos = ta.selectionStart;
    const text = ta.value;
    const before = text.substring(0, pos);
    const after = text.substring(pos);
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = before.substring(lineStart);
    const numMatch = currentLine.match(LIST_NUM_RE);
    const bulMatch = currentLine.match(LIST_BUL_RE);
    if (!numMatch && !bulMatch) return;
    e.preventDefault();
    const match = numMatch || bulMatch;
    const indent = match[1];
    const body = match[3];
    if (!body.trim()) {
      // Empty marker — exit the list by stripping the current line's marker.
      const newValue = text.substring(0, lineStart) + after;
      pendingCursor.current = lineStart;
      onChange(newValue);
      return;
    }
    const nextMarker = numMatch
      ? `${indent}${parseInt(numMatch[2], 10) + 1}. `
      : `${indent}${bulMatch[2]} `;
    const newValue = before + '\n' + nextMarker + after;
    pendingCursor.current = before.length + 1 + nextMarker.length;
    onChange(newValue);
  };

  return (
    <textarea
      ref={ref}
      className={className}
      value={value || ''}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.currentTarget.blur(); return; }
        if (singleLine && e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); return; }
        handleListEnter(e);
      }}
      onBlur={() => onDone && onDone()}
    />
  );
}

// ColorSwatches — the 13-colour folder scale plus a custom HEX picker as the
// 14th circle. Picking a custom colour prepends it to the palette, so it
// becomes the first swatch and the scale shifts down by one.
export function ColorSwatches({ value, onChange }) {
  const { palette, addPaletteColor } = useStore();
  const pickRef = React.useRef(null);
  const cbRef = React.useRef(null);
  cbRef.current = (c) => { addPaletteColor(c); onChange(c); };

  React.useEffect(() => {
    const el = pickRef.current;
    if (!el) return undefined;
    const onPick = () => cbRef.current(el.value);
    el.addEventListener('change', onPick);
    return () => el.removeEventListener('change', onPick);
  }, []);

  return (
    <div className="swatches" onClick={(e) => e.stopPropagation()}>
      {palette.map((c) => (
        <button
          key={c}
          type="button"
          className={`swatch ${value === c ? 'is-on' : ''}`}
          style={{ background: c }}
          aria-label={`Colore ${c}`}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="swatch swatch-pick" title="Scegli un colore personalizzato">
        <input ref={pickRef} type="color" aria-label="Colore personalizzato" />
      </label>
    </div>
  );
}

// SourceFormModal — add a bibliography source. A file (PDF or other) can be
// dropped or browsed: it is attached to the source and its metadata pre-fills
// the empty fields. The blob is only persisted to IndexedDB on save.
const fileIco = (
  <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor"
       strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1.5H4.5A1.5 1.5 0 0 0 3 3v10a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 13 13V5.5L9 1.5z" />
    <path d="M9 1.5V5.5H13" />
  </svg>
);

export function SourceFormModal({ onClose, onSave, initialFile = null }) {
  const [form, setForm] = React.useState({ title: '', authors: '', year: '', journal: '' });
  const [file, setFile] = React.useState(null);   // { raw, name, type, size }
  const [reading, setReading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const fileRef = React.useRef(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const acceptFile = React.useCallback(async (f) => {
    if (!f) return;
    setFile({ raw: f, name: f.name, type: f.type, size: f.size });
    setReading(true);
    try {
      const meta = await extractDocMeta(f);
      // Only fill fields the user hasn't already typed into.
      setForm((cur) => ({
        ...cur,
        title: cur.title.trim() ? cur.title : (meta.title || ''),
        authors: cur.authors.trim() ? cur.authors : (meta.authors || ''),
        year: cur.year.trim() ? cur.year : (meta.year || ''),
      }));
    } finally {
      setReading(false);
    }
  }, []);

  // If opened from a drop on the panel/view, ingest that file immediately.
  React.useEffect(() => {
    if (initialFile) acceptFile(initialFile);
  }, [initialFile, acceptFile]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) acceptFile(f);
  };

  const submit = async () => {
    if (!form.title.trim() || busy) return;
    setBusy(true);
    let fileMeta = null;
    if (file) {
      try {
        const id = await putFile(file.raw);
        fileMeta = { id, name: file.name, type: file.type, size: file.size };
      } catch (e) {
        /* storage failed — still save the source, just without the file */
      }
    }
    onSave({
      title: form.title.trim(),
      authors: form.authors.trim(),
      year: form.year.trim(),
      journal: form.journal.trim(),
      file: fileMeta,
    });
  };

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal modal--form" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Nuova fonte</h3>

        <input ref={fileRef} type="file" hidden
               accept=".pdf,application/pdf,.doc,.docx,.epub,.txt,.rtf"
               onChange={(e) => acceptFile(e.target.files && e.target.files[0])} />

        {file ? (
          <div className="source-file">
            <span className="source-file-ico">{fileIco}</span>
            <span className="source-file-text">
              <span className="source-file-name">{file.name}</span>
              <span className="source-file-meta">
                {reading ? 'Lettura metadati…' : formatSize(file.size)}
              </span>
            </span>
            <button type="button" className="source-file-x" title="Rimuovi file"
                    onClick={() => setFile(null)}>✕</button>
          </div>
        ) : (
          <div className={`source-drop ${dragging ? 'is-drag' : ''}`}
               onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
               onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }}
               onDrop={onDrop}
               onClick={() => fileRef.current && fileRef.current.click()}>
            <span className="source-drop-ico">{fileIco}</span>
            <span className="source-drop-text">
              <b>Trascina un file qui</b> o clicca per sfogliare
            </span>
            <span className="source-drop-hint">PDF, Word, ePub… i campi si compilano da soli</span>
          </div>
        )}

        <label className="field">
          <span>Titolo</span>
          <input autoFocus value={form.title} onChange={set('title')}
                 placeholder="Titolo dell'opera" />
        </label>
        <label className="field">
          <span>Autori</span>
          <input value={form.authors} onChange={set('authors')}
                 placeholder="Cognome NN, Cognome NN" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Anno</span>
            <input value={form.year} onChange={set('year')} placeholder="2024" />
          </label>
          <label className="field">
            <span>Rivista / editore</span>
            <input value={form.journal} onChange={set('journal')} placeholder="Editore" />
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Annulla</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Salvataggio…' : 'Aggiungi fonte'}
          </button>
        </div>
      </div>
    </div>
  );
}
