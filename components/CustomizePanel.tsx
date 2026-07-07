'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import type { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';
import type { DetectedLink } from '../lib/platforms';
import { checkQrContrast, MIN_QR_CONTRAST } from '../lib/contrast';
import ColorPicker from './ColorPicker';

export type LogoMode = 'auto' | 'custom' | 'none';

export interface QrStyle {
  dotsColor: string;
  cornersSquareColor: string;
  cornersDotColor: string;
  qrBackgroundColor: string;
  dotsType: DotType;
  cornersSquareType: CornerSquareType;
  cornersDotType: CornerDotType;
  logoMode: LogoMode;
  customLogoDataUrl: string | null;
  bgImageDataUrl: string | null;
  /** The uploaded photo before cropping, so re-cropping starts from it. */
  bgImageSrc: string | null;
  bgCropZoom: number;
  /** Pan offset normalized to the crop viewport side. */
  bgCropOffset: { x: number; y: number };
  imageVisibility: number;
}

export const DEFAULT_QR_STYLE: QrStyle = {
  dotsColor: '#000000',
  cornersSquareColor: '#000000',
  cornersDotColor: '#000000',
  qrBackgroundColor: '#FFFFFF',
  dotsType: 'rounded',
  cornersSquareType: 'extra-rounded',
  cornersDotType: 'dot',
  logoMode: 'auto',
  customLogoDataUrl: null,
  bgImageDataUrl: null,
  bgImageSrc: null,
  bgCropZoom: 1,
  bgCropOffset: { x: 0, y: 0 },
  imageVisibility: 0.45,
};

const DARK_PRESETS = ['#000000', '#1f2937', '#2563eb', '#7c3aed', '#dc2626', '#059669', '#db2777', '#b45309'];
const LIGHT_PRESETS = ['#FFFFFF', '#f1f5f9', '#fef9c3', '#dbeafe', '#dcfce7', '#fce7f3', '#111827', '#000000'];

const DOT_TYPES: { value: DotType; label: string }[] = [
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Round' },
  { value: 'square', label: 'Square' },
  { value: 'extra-rounded', label: 'Extra Round' },
];

const CORNER_SQUARE_TYPES: { value: CornerSquareType; label: string }[] = [
  { value: 'extra-rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
];

const CORNER_DOT_TYPES: { value: CornerDotType; label: string }[] = [
  { value: 'dot', label: 'Dot' },
  { value: 'square', label: 'Square' },
];

const MAX_LOGO_BYTES = 1024 * 1024;
const MAX_BG_DIMENSION = 1024;
const CROP_OUT = 512; // square output the QR pattern is cut from

// Light tints only: the card must keep dark text and QR contrast readable.
const CARD_COLORS: { name: string; value: string | null }[] = [
  { name: 'White', value: null },
  { name: 'Transparent', value: 'transparent' },
  { name: 'Silver', value: 'linear-gradient(135deg, #fdfbfb, #ebedee)' },
  { name: 'Peach Sky', value: 'linear-gradient(135deg, #fff1eb, #ace0f9)' },
  { name: 'Cream', value: 'linear-gradient(135deg, #fefce8, #fde68a)' },
  { name: 'Lavender', value: 'linear-gradient(135deg, #e0c3fc, #8ec5fc)' },
  { name: 'Cloud', value: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' },
  { name: 'Blush', value: '#fdf2f8' },
  { name: 'Mint', value: '#f0fdf4' },
];

const CARD_IMAGES = [
  '/cards/card1.jpg', '/cards/card2.jpg', '/cards/card3.jpg', '/cards/card4.jpg', '/cards/card5.jpg',
  '/cards/card6.jpg', '/cards/card7.jpg', '/cards/card8.jpg', '/cards/card9.jpg',
];

interface Gradient { name: string; colors: string[] }
interface SolidColor { name: string; color: string }

interface CustomizePanelProps {
  qrStyle: QrStyle;
  onStyleChange: (patch: Partial<QrStyle>) => void;
  link: DetectedLink;
  onClose: () => void;
  gradients: Gradient[];
  solidColors: SolidColor[];
  gradientIndex: number;
  customColor: string | null;
  onSelectGradient: (index: number) => void;
  onSelectSolidColor: (color: string) => void;
  cardStyle: 'solid' | 'image';
  onSetCardStyle: (style: 'solid' | 'image') => void;
  cardBg: string | null;
  onSetCardBg: (bg: string | null) => void;
  cardImage: string;
  onSetCardImage: (url: string) => void;
  dockStyle?: React.CSSProperties;
}

type PanelTab = 'colors' | 'shapes' | 'logo' | 'image';

// Very light swatches (e.g. white) need an outline + dark check to be visible
// against the white panel.
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // Perceived luminance (0–255); above ~230 reads as "near-white".
  return 0.299 * r + 0.587 * g + 0.114 * b > 230;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function downscaleImage(dataUrl: string, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      if (scale >= 1) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = dataUrl;
  });
}

// Bake the user's zoom/pan into a square image, matching exactly what the
// crop viewport shows: `view` is the on-screen viewport side in px, the image
// is object-fit: cover then scaled by `zoom` and shifted by `offset` px.
function renderCrop(
  src: string,
  zoom: number,
  offset: { x: number; y: number },
  view: number,
  out: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = out;
      canvas.height = out;
      const ctx = canvas.getContext('2d');
      if (!ctx || !w || !h) {
        resolve(src);
        return;
      }
      const cover = Math.max(view / w, view / h);
      const displayScale = cover * zoom;
      const k = out / view; // viewport px -> output px
      const destW = w * displayScale * k;
      const destH = h * displayScale * k;
      const cx = out / 2 + offset.x * k;
      const cy = out / 2 + offset.y * k;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out, out);
      ctx.drawImage(img, cx - destW / 2, cy - destH / 2, destW, destH);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

const CustomizePanel: React.FC<CustomizePanelProps> = ({
  qrStyle,
  onStyleChange,
  link,
  onClose,
  gradients,
  solidColors,
  gradientIndex,
  customColor,
  onSelectGradient,
  onSelectSolidColor,
  cardStyle,
  onSetCardStyle,
  cardBg,
  onSetCardBg,
  cardImage,
  onSetCardImage,
  dockStyle,
}) => {
  const [tab, setTab] = useState<PanelTab>('colors');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // Crop / zoom editor for the Image-QR photo
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropDimsRef = useRef({ w: 0, h: 0 });
  const cropViewRef = useRef<HTMLDivElement>(null);
  const pendingOffsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  // Keep the photo covering the frame — no empty gaps at the edges.
  const clampOffset = (x: number, y: number, zoom: number, view: number) => {
    const { w, h } = cropDimsRef.current;
    if (!w || !h) return { x, y };
    const displayScale = Math.max(view / w, view / h) * zoom;
    const maxX = Math.max(0, (w * displayScale - view) / 2);
    const maxY = Math.max(0, (h * displayScale - view) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };

  const openCrop = (src: string, zoom = 1, normOffset = { x: 0, y: 0 }) => {
    cropDimsRef.current = { w: 0, h: 0 };
    setCropZoom(zoom);
    pendingOffsetRef.current = normOffset;
    setCropOffset({ x: 0, y: 0 });
    setCropSrc(src);
  };

  // Restore the saved pan once the crop viewport exists; offsets are stored
  // normalized to the viewport side so they survive layout size changes.
  useLayoutEffect(() => {
    if (!cropSrc) return;
    const view = cropViewRef.current?.clientWidth ?? 240;
    setCropOffset({
      x: pendingOffsetRef.current.x * view,
      y: pendingOffsetRef.current.y * view,
    });
  }, [cropSrc]);

  const handleCropZoom = (zoom: number) => {
    const view = cropViewRef.current?.clientWidth ?? 240;
    setCropZoom(zoom);
    setCropOffset((o) => clampOffset(o.x, o.y, zoom, view));
  };

  const handleCropPointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Capture is best-effort; dragging still works without it.
    }
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: cropOffset.x, oy: cropOffset.y };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const view = cropViewRef.current?.clientWidth ?? 240;
    const nx = dragRef.current.ox + (e.clientX - dragRef.current.sx);
    const ny = dragRef.current.oy + (e.clientY - dragRef.current.sy);
    setCropOffset(clampOffset(nx, ny, cropZoom, view));
  };

  const handleCropPointerUp = () => {
    dragRef.current = null;
  };

  const applyCrop = async () => {
    if (!cropSrc) return;
    const view = cropViewRef.current?.clientWidth ?? 240;
    try {
      const out = await renderCrop(cropSrc, cropZoom, cropOffset, view, CROP_OUT);
      onStyleChange({
        bgImageDataUrl: out,
        bgImageSrc: cropSrc,
        bgCropZoom: cropZoom,
        bgCropOffset: { x: cropOffset.x / view, y: cropOffset.y / view },
      });
    } catch {
      alert('Could not process that image.');
    }
    setCropSrc(null);
  };

  const contrast = checkQrContrast(qrStyle.dotsColor, qrStyle.qrBackgroundColor);
  const imageQrActive = Boolean(qrStyle.bgImageDataUrl);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      alert('Logo image must be under 1 MB.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      onStyleChange({ customLogoDataUrl: dataUrl, logoMode: 'custom' });
    } catch {
      alert('Could not read that image file.');
    }
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const scaled = await downscaleImage(dataUrl, MAX_BG_DIMENSION);
      openCrop(scaled);
    } catch {
      alert('Could not read that image file.');
    }
  };

  const colorRow = (
    label: string,
    value: string,
    presets: string[],
    apply: (color: string) => void,
    disabled = false
  ) => (
    <div className={`qr-color-row${disabled ? ' disabled' : ''}`}>
      <span className="qr-color-row-label">{label}</span>
      <div className="qr-swatch-row">
        {presets.map((color) => (
          <button
            key={color}
            className={`qr-mini-swatch ${value.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
            style={{ background: color }}
            onClick={() => apply(color)}
            title={color}
            disabled={disabled}
          />
        ))}
        <ColorPicker value={value} onChange={apply} disabled={disabled} />
      </div>
    </div>
  );

  const shapeRow = <T extends string>(
    label: string,
    value: T,
    options: { value: T; label: string }[],
    apply: (v: T) => void
  ) => (
    <div className="qr-color-section">
      <h4>{label}</h4>
      <div className="qr-shape-grid">
        {options.map((opt) => (
          <button
            key={opt.value}
            className={`qr-shape-option ${value === opt.value ? 'active' : ''}`}
            onClick={() => apply(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="qr-customize-panel" style={dockStyle} onClick={(e) => e.stopPropagation()}>
      <div className="qr-color-picker-header">
        <h3>Customize</h3>
        <button onClick={onClose} className="qr-color-close" aria-label="Close">×</button>
      </div>

      <div className="qr-tabs">
        {([
          ['colors', 'Colors'],
          ['shapes', 'Shapes'],
          ['logo', 'Logo'],
          ['image', 'Image'],
        ] as [PanelTab, string][]).map(([id, label]) => (
          <button
            key={id}
            className={`qr-tab ${tab === id ? 'active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'colors' && (
        <>
          <div className="qr-color-section">
            <h4>QR Code</h4>
            {colorRow('Dots', qrStyle.dotsColor, DARK_PRESETS, (c) =>
              onStyleChange({ dotsColor: c }), imageQrActive
            )}
            {colorRow('Corners', qrStyle.cornersSquareColor, DARK_PRESETS, (c) =>
              onStyleChange({ cornersSquareColor: c }), imageQrActive
            )}
            {colorRow('Corner dots', qrStyle.cornersDotColor, DARK_PRESETS, (c) =>
              onStyleChange({ cornersDotColor: c }), imageQrActive
            )}
            {!qrStyle.bgImageDataUrl &&
              colorRow('Background', qrStyle.qrBackgroundColor, LIGHT_PRESETS, (c) =>
                onStyleChange({ qrBackgroundColor: c })
              )}
            {imageQrActive && (
              <p className="qr-panel-note">
                Dot and corner colors are disabled while an image QR is active.
                The photo shows through the dark modules, so they stay black to
                keep the code scannable.
              </p>
            )}
          </div>

          {!qrStyle.bgImageDataUrl &&
            !contrast.ok && (
              <div className="qr-contrast-warning">
                {contrast.inverted
                  ? 'Light dots on a dark background fail in many scanner apps.'
                  : `Low contrast (${contrast.ratio.toFixed(1)}:1, needs ${MIN_QR_CONTRAST}:1). This QR may not scan reliably.`}
                <button
                  className="qr-contrast-reset"
                  onClick={() =>
                    onStyleChange({
                      dotsColor: '#000000',
                      cornersSquareColor: '#000000',
                      cornersDotColor: '#000000',
                      qrBackgroundColor: '#FFFFFF',
                    })
                  }
                >
                  Reset to black &amp; white
                </button>
              </div>
            )}

          <div className="qr-color-section">
            <h4>Card Style</h4>
            <div className="qr-shape-grid qr-shape-grid-2">
              <button
                className={`qr-shape-option ${cardStyle === 'solid' ? 'active' : ''}`}
                onClick={() => onSetCardStyle('solid')}
              >
                Solid
              </button>
              <button
                className={`qr-shape-option ${cardStyle === 'image' ? 'active' : ''}`}
                onClick={() => onSetCardStyle('image')}
              >
                Image
              </button>
            </div>
            {cardStyle === 'solid' && (
              <div className="qr-color-grid" style={{ marginTop: 10 }}>
                {CARD_COLORS.map((c) => (
                  <button
                    key={c.name}
                    className={`qr-color-swatch qr-card-swatch ${c.value === 'transparent' ? 'qr-swatch-transparent' : ''} ${cardBg === c.value ? 'active' : ''}`}
                    style={c.value === 'transparent' ? undefined : { background: c.value ?? '#ffffff' }}
                    onClick={() => onSetCardBg(c.value)}
                    title={c.name}
                  />
                ))}
              </div>
            )}
            {cardStyle === 'image' && (
              <div className="qr-color-grid" style={{ marginTop: 10 }}>
                {CARD_IMAGES.map((src) => (
                  <button
                    key={src}
                    className={`qr-color-swatch qr-card-image-swatch ${cardImage === src ? 'active' : ''}`}
                    style={{ backgroundImage: `url(${src})` }}
                    onClick={() => onSetCardImage(src)}
                    title="Card image"
                  />
                ))}
              </div>
            )}
          </div>
          {/* The background sections tint the area behind the card, which only
              shows for solid cards — hide them when the card is a photo. */}
          {cardStyle !== 'image' && (
            <>
              <div className="qr-color-section">
                <h4>Card Background</h4>
                <div className="qr-color-grid">
                  {gradients.map((gradient, index) => (
                    <button
                      key={index}
                      className={`qr-color-swatch ${gradientIndex === index && !customColor ? 'active' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${gradient.colors.join(', ')})` }}
                      onClick={() => onSelectGradient(index)}
                      title={gradient.name}
                    />
                  ))}
                </div>
              </div>
              <div className="qr-color-section">
                <h4>Card Solid Colors</h4>
                <div className="qr-color-grid">
                  {solidColors.map((color, index) => (
                    <button
                      key={index}
                      className={`qr-color-swatch ${isLightColor(color.color) ? 'qr-card-swatch' : ''} ${customColor === color.color ? 'active' : ''}`}
                      style={{ background: color.color }}
                      onClick={() => onSelectSolidColor(color.color)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'shapes' && (
        <>
          {shapeRow('Dots', qrStyle.dotsType, DOT_TYPES, (v) => onStyleChange({ dotsType: v }))}
          {shapeRow('Corner frames', qrStyle.cornersSquareType, CORNER_SQUARE_TYPES, (v) =>
            onStyleChange({ cornersSquareType: v })
          )}
          {shapeRow('Corner dots', qrStyle.cornersDotType, CORNER_DOT_TYPES, (v) =>
            onStyleChange({ cornersDotType: v })
          )}
        </>
      )}

      {tab === 'logo' && (
        <div className="qr-color-section">
          <h4>Center Logo</h4>
          <div className="qr-logo-options">
            <button
              className={`qr-logo-option ${qrStyle.logoMode === 'auto' ? 'active' : ''}`}
              onClick={() => onStyleChange({ logoMode: 'auto' })}
            >
              <img src={link.logoUrl} alt="" className="qr-logo-thumb" />
              <span>Auto ({link.platform?.name ?? link.hostname})</span>
            </button>
            <button
              className={`qr-logo-option ${qrStyle.logoMode === 'custom' ? 'active' : ''}`}
              onClick={() =>
                qrStyle.customLogoDataUrl
                  ? onStyleChange({ logoMode: 'custom' })
                  : logoInputRef.current?.click()
              }
            >
              {qrStyle.customLogoDataUrl ? (
                <img src={qrStyle.customLogoDataUrl} alt="" className="qr-logo-thumb" />
              ) : (
                <span className="qr-logo-thumb qr-logo-thumb-empty">+</span>
              )}
              <span>Your logo</span>
            </button>
            <button
              className={`qr-logo-option ${qrStyle.logoMode === 'none' ? 'active' : ''}`}
              onClick={() => onStyleChange({ logoMode: 'none' })}
            >
              <span className="qr-logo-thumb qr-logo-thumb-empty">∅</span>
              <span>No logo</span>
            </button>
          </div>
          <div className="qr-upload-row">
            <button className="qr-upload-btn" onClick={() => logoInputRef.current?.click()}>
              {qrStyle.customLogoDataUrl ? 'Replace uploaded logo' : 'Upload a logo'}
            </button>
            {qrStyle.customLogoDataUrl && (
              <button
                className="qr-upload-btn danger"
                onClick={() => onStyleChange({ customLogoDataUrl: null, logoMode: 'auto' })}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: 'none' }}
            onChange={handleLogoUpload}
          />
        </div>
      )}

      {tab === 'image' && (
        <div className="qr-color-section">
          <h4>Image QR</h4>
          {cropSrc ? (
            <>
              <div
                ref={cropViewRef}
                className="qr-crop-view"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              >
                <img
                  src={cropSrc}
                  alt="Crop preview"
                  className="qr-crop-img"
                  draggable={false}
                  style={{ transform: `translate(${cropOffset.x}px, ${cropOffset.y}px) scale(${cropZoom})` }}
                  onLoad={(e) => {
                    cropDimsRef.current = {
                      w: e.currentTarget.naturalWidth,
                      h: e.currentTarget.naturalHeight,
                    };
                  }}
                />
                <div className="qr-crop-grid" />
              </div>
              <div className="qr-slider-row">
                <span className="qr-color-row-label">Zoom</span>
                <input
                  type="range"
                  className="qr-slider"
                  min={100}
                  max={300}
                  value={Math.round(cropZoom * 100)}
                  onChange={(e) => handleCropZoom(Number(e.target.value) / 100)}
                />
                <span className="qr-slider-value">{cropZoom.toFixed(1)}x</span>
              </div>
              <div className="qr-upload-row">
                <button className="qr-upload-btn primary" onClick={applyCrop}>
                  Apply
                </button>
                <button className="qr-upload-btn" onClick={() => setCropSrc(null)}>
                  Cancel
                </button>
              </div>
              <p className="qr-panel-note">Drag to reposition and zoom to fill the frame.</p>
            </>
          ) : qrStyle.bgImageDataUrl ? (
            <>
              <img src={qrStyle.bgImageDataUrl} alt="Background preview" className="qr-bg-preview" />
              <div className="qr-slider-row">
                <span className="qr-color-row-label">Visibility</span>
                <input
                  type="range"
                  className="qr-slider"
                  min={0}
                  max={100}
                  value={Math.round(qrStyle.imageVisibility * 100)}
                  onChange={(e) =>
                    onStyleChange({ imageVisibility: Number(e.target.value) / 100 })
                  }
                />
                <span className="qr-slider-value">{Math.round(qrStyle.imageVisibility * 100)}%</span>
              </div>
              <div className="qr-upload-row">
                <button
                  className="qr-upload-btn"
                  onClick={() =>
                    openCrop(
                      qrStyle.bgImageSrc ?? qrStyle.bgImageDataUrl!,
                      qrStyle.bgCropZoom,
                      qrStyle.bgCropOffset
                    )
                  }
                >
                  Crop / Zoom
                </button>
                <button className="qr-upload-btn" onClick={() => bgInputRef.current?.click()}>
                  Replace
                </button>
                <button
                  className="qr-upload-btn danger"
                  onClick={() =>
                    onStyleChange({
                      bgImageDataUrl: null,
                      bgImageSrc: null,
                      bgCropZoom: 1,
                      bgCropOffset: { x: 0, y: 0 },
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </>
          ) : (
            <div className="qr-upload-row">
              <button className="qr-upload-btn" onClick={() => bgInputRef.current?.click()}>
                Upload an image
              </button>
            </div>
          )}
          <input
            ref={bgInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleBgUpload}
          />
        </div>
      )}
    </div>
  );
};

export default CustomizePanel;
