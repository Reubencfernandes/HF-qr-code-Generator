'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* ---------- color math ---------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(input: string): string | null {
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) return '#' + h.toLowerCase();
  return null;
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const norm = normalizeHex(hex) ?? '#ffffff';
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

/* ---------- component ---------- */

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange }) => {
  const safeValue = value === 'transparent' ? '#ffffff' : value;
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(safeValue));
  const [hexText, setHexText] = useState(normalizeHex(safeValue) ?? '#ffffff');
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragTarget = useRef<'sv' | 'hue' | null>(null);

  // Keep internal state synced when the value changes from outside (presets).
  useEffect(() => {
    if (open) return; // don't fight the user mid-edit
    setHsv(hexToHsv(safeValue));
    setHexText(normalizeHex(safeValue) ?? '#ffffff');
  }, [safeValue, open]);

  const emit = useCallback(
    (next: { h: number; s: number; v: number }) => {
      const hex = hsvToHex(next.h, next.s, next.v);
      setHexText(hex);
      onChange(hex);
    },
    [onChange]
  );

  const updateFromPointer = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      if (dragTarget.current === 'sv' && svRef.current) {
        const r = svRef.current.getBoundingClientRect();
        const s = clamp((e.clientX - r.left) / r.width, 0, 1);
        const v = clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
        setHsv((prev) => {
          const next = { h: prev.h, s, v };
          emit(next);
          return next;
        });
      } else if (dragTarget.current === 'hue' && hueRef.current) {
        const r = hueRef.current.getBoundingClientRect();
        const h = clamp((e.clientX - r.left) / r.width, 0, 1) * 360;
        setHsv((prev) => {
          const next = { h, s: prev.s, v: prev.v };
          emit(next);
          return next;
        });
      }
    },
    [emit]
  );

  // Global drag listeners so dragging keeps working outside the strip/box.
  useEffect(() => {
    if (!open) return;
    const move = (e: PointerEvent) => {
      if (dragTarget.current) {
        e.preventDefault();
        updateFromPointer(e);
      }
    };
    const up = () => {
      dragTarget.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [open, updateFromPointer]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        popRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Position the fixed popover relative to the trigger (panel clips absolute).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const W = 236;
    const H = 232;
    const margin = 8;
    let left = r.right - W;
    left = clamp(left, margin, window.innerWidth - W - margin);
    let top = r.bottom + 8;
    if (top + H > window.innerHeight - margin) top = r.top - H - 8;
    top = clamp(top, margin, window.innerHeight - H - margin);
    setPos({ top, left });
  }, [open]);

  const startDrag = (target: 'sv' | 'hue') => (e: React.PointerEvent) => {
    dragTarget.current = target;
    updateFromPointer(e);
  };

  const commitHex = () => {
    const norm = normalizeHex(hexText);
    if (norm) {
      setHsv(hexToHsv(norm));
      onChange(norm);
      setHexText(norm);
    } else {
      setHexText(normalizeHex(safeValue) ?? '#ffffff');
    }
  };

  const hueColor = hsvToHex(hsv.h, 1, 1);
  const current = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="qr-color-input-wrap"
        title="Custom color"
        aria-label="Open custom color picker"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="qr-color-input-chip" style={{ background: current }} />
      </button>

      {open && pos && (
        <div
          ref={popRef}
          className="qr-cp-pop"
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
        >
          <div
            ref={svRef}
            className="qr-cp-sv"
            style={{ background: hueColor }}
            onPointerDown={startDrag('sv')}
          >
            <div className="qr-cp-sv-white" />
            <div className="qr-cp-sv-black" />
            <div
              className="qr-cp-thumb"
              style={{
                left: `${hsv.s * 100}%`,
                top: `${(1 - hsv.v) * 100}%`,
                background: current,
              }}
            />
          </div>

          <div
            ref={hueRef}
            className="qr-cp-hue"
            onPointerDown={startDrag('hue')}
          >
            <div
              className="qr-cp-hue-thumb"
              style={{ left: `${(hsv.h / 360) * 100}%`, background: hueColor }}
            />
          </div>

          <div className="qr-cp-foot">
            <span className="qr-cp-preview" style={{ background: current }} />
            <input
              className="qr-cp-hex"
              value={hexText}
              spellCheck={false}
              onChange={(e) => setHexText(e.target.value)}
              onBlur={commitHex}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitHex();
                  (e.target as HTMLInputElement).blur();
                }
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ColorPicker;
