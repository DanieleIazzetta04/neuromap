import React from 'react';
import { createPortal } from 'react-dom';
import { useStore } from './store.jsx';

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
export function AutoTextarea({
  value, onChange, className = '', placeholder, autoFocus = false,
  singleLine = false, onDone,
}) {
  const ref = React.useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  React.useLayoutEffect(resize, [value]);

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
        if (e.key === 'Escape') e.currentTarget.blur();
        if (singleLine && e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
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

// SourceFormModal — a small modal form for adding a bibliography source.
export function SourceFormModal({ onClose, onSave }) {
  const [form, setForm] = React.useState({ title: '', authors: '', year: '', journal: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    if (!form.title.trim()) return;
    onSave({
      title: form.title.trim(),
      authors: form.authors.trim(),
      year: form.year.trim(),
      journal: form.journal.trim(),
    });
  };

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="modal modal--form" onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Nuova fonte</h3>
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
          <button type="button" className="btn btn-primary" onClick={submit}>Aggiungi fonte</button>
        </div>
      </div>
    </div>
  );
}
