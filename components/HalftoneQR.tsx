'use client';

import React, { useEffect, useRef } from 'react';
import qrcode from 'qrcode-generator';
import type { DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';

interface HalftoneQRProps {
  value: string;
  imageDataUrl: string;
  size?: number;
  /**
   * How much of the photo shows through the modules (0 to 1).
   * Lower = stronger black/white contrast, higher = more visible image.
   */
  imageVisibility?: number;
  dotsType?: DotType;
  cornersSquareType?: CornerSquareType;
  cornersDotType?: CornerDotType;
}

const PIXELS_PER_MODULE = 16;
const QUIET_ZONE_MODULES = 2;

// Alignment pattern center coordinates per QR version (1-40), ISO/IEC 18004.
const ALIGNMENT_POSITIONS: number[][] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

/**
 * Function-pattern modules (finders, separators, timing, alignment, format,
 * version info) must stay full-size for scanners to lock on; only data/EC
 * modules are safe to render in decorative shapes.
 */
function isFunctionModule(row: number, col: number, moduleCount: number, version: number): boolean {
  const n = moduleCount;
  // Finder patterns + separators (8x8 corner blocks)
  if (row < 8 && col < 8) return true;
  if (row < 8 && col >= n - 8) return true;
  if (row >= n - 8 && col < 8) return true;
  // Timing patterns
  if (row === 6 || col === 6) return true;
  // Format information (includes the fixed dark module at (n-8, 8))
  if (row === 8 && (col < 9 || col >= n - 8)) return true;
  if (col === 8 && (row < 9 || row >= n - 8)) return true;
  // Version information (versions >= 7)
  if (version >= 7) {
    if (row < 6 && col >= n - 11 && col < n - 8) return true;
    if (col < 6 && row >= n - 11 && row < n - 8) return true;
  }
  // Alignment patterns (5x5 blocks)
  const centers = ALIGNMENT_POSITIONS[version - 1] || [];
  for (const cr of centers) {
    for (const cc of centers) {
      // Skip the three would-be centers that overlap finder patterns
      if ((cr <= 8 && cc <= 8) || (cr <= 8 && cc >= n - 9) || (cr >= n - 9 && cc <= 8)) continue;
      if (Math.abs(row - cr) <= 2 && Math.abs(col - cc) <= 2) return true;
    }
  }
  return false;
}

/** The three 7x7 finder-pattern blocks, drawn separately as shaped frames. */
function isInFinderBlock(row: number, col: number, n: number): boolean {
  return (row < 7 && col < 7) || (row < 7 && col >= n - 7) || (row >= n - 7 && col < 7);
}

/** Rounded-rect subpath with per-corner radii [tl, tr, br, bl]. */
function addRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: [number, number, number, number]
) {
  const [tl, tr, br, bl] = radii.map((r) => Math.min(r, w / 2, h / 2)) as [number, number, number, number];
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

function addCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.moveTo(cx + r, cy);
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
}

/** One data module in the selected dot shape. */
function addDotPath(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, type: DotType) {
  switch (type) {
    case 'dots':
      addCircle(ctx, x + s / 2, y + s / 2, s * 0.44);
      break;
    case 'rounded':
      addRoundRect(ctx, x, y, s, s, [s * 0.3, s * 0.3, s * 0.3, s * 0.3]);
      break;
    case 'extra-rounded':
      addRoundRect(ctx, x, y, s, s, [s * 0.45, s * 0.45, s * 0.45, s * 0.45]);
      break;
    case 'classy':
      addRoundRect(ctx, x, y, s, s, [0, s * 0.5, 0, s * 0.5]);
      break;
    case 'classy-rounded':
      addRoundRect(ctx, x, y, s, s, [s * 0.15, s * 0.6, s * 0.15, s * 0.6]);
      break;
    default:
      ctx.rect(x, y, s, s);
  }
}

const HalftoneQR: React.FC<HalftoneQRProps> = ({
  value,
  imageDataUrl,
  size = 210,
  imageVisibility = 0.45,
  dotsType = 'rounded',
  cornersSquareType = 'extra-rounded',
  cornersDotType = 'dot',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const qr = qrcode(0, 'H');
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const version = (n - 17) / 4;
    const px = PIXELS_PER_MODULE;
    const total = (n + QUIET_ZONE_MODULES * 2) * px;
    canvas.width = total;
    canvas.height = total;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      // White canvas: light modules and quiet zone stay white so the
      // pattern itself is what carries the photo.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, total, total);

      const origin = QUIET_ZONE_MODULES * px;
      const area = n * px;
      const srcSide = Math.min(img.width, img.height);

      const v = Math.min(1, Math.max(0, imageVisibility));
      // Same linear curve as before, now spanning the full 0 to 100% range:
      // at 0% the modules are solid black, at 100% the photo is nearly raw.
      const dataDarkAlpha = Math.min(1, Math.max(0, 0.72 - (v - 0.3)));
      const funcDarkAlpha = Math.min(1, Math.max(0, 0.78 - 0.6 * (v - 0.3))); // finders/timing stay darker

      // Draw the photo through a clip path, then darken it so scanners
      // still read those areas as dark modules.
      const paintClipped = (buildPath: () => void, alpha: number, fillRule?: CanvasFillRule) => {
        ctx.save();
        ctx.beginPath();
        buildPath();
        ctx.clip(fillRule);
        ctx.drawImage(
          img,
          (img.width - srcSide) / 2,
          (img.height - srcSide) / 2,
          srcSide,
          srcSide,
          origin,
          origin,
          area,
          area
        );
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(origin, origin, area, area);
        ctx.restore();
      };

      // Data/EC modules in the selected dot shape
      paintClipped(() => {
        for (let row = 0; row < n; row++) {
          for (let col = 0; col < n; col++) {
            if (!qr.isDark(row, col)) continue;
            if (isFunctionModule(row, col, n, version)) continue;
            addDotPath(ctx, origin + col * px, origin + row * px, px, dotsType);
          }
        }
      }, dataDarkAlpha);

      // Non-finder function modules (timing, alignment, format, version info)
      // stay plain squares for reliability
      paintClipped(() => {
        for (let row = 0; row < n; row++) {
          for (let col = 0; col < n; col++) {
            if (!qr.isDark(row, col)) continue;
            if (!isFunctionModule(row, col, n, version)) continue;
            if (isInFinderBlock(row, col, n)) continue;
            ctx.rect(origin + col * px, origin + row * px, px, px);
          }
        }
      }, funcDarkAlpha);

      // Finder patterns as shaped frames (7x7 ring + 3x3 center)
      const finderOrigins: [number, number][] = [
        [0, 0],
        [n - 7, 0],
        [0, n - 7],
      ];
      const addFrame = (x: number, y: number, s: number, inset: boolean) => {
        if (cornersSquareType === 'dot') {
          addCircle(ctx, x + s / 2, y + s / 2, s / 2);
        } else if (cornersSquareType === 'extra-rounded') {
          const r = s * (inset ? 0.32 : 0.34);
          addRoundRect(ctx, x, y, s, s, [r, r, r, r]);
        } else {
          ctx.rect(x, y, s, s);
        }
      };
      for (const [fc, fr] of finderOrigins) {
        const fx = origin + fc * px;
        const fy = origin + fr * px;
        // Ring: outer 7x7 minus inner 5x5 (even-odd fill)
        paintClipped(() => {
          addFrame(fx, fy, 7 * px, false);
          addFrame(fx + px, fy + px, 5 * px, true);
        }, funcDarkAlpha, 'evenodd');
        // Center 3x3 eye
        paintClipped(() => {
          if (cornersDotType === 'dot') {
            addCircle(ctx, fx + 3.5 * px, fy + 3.5 * px, 1.5 * px);
          } else {
            ctx.rect(fx + 2 * px, fy + 2 * px, 3 * px, 3 * px);
          }
        }, funcDarkAlpha);
      }
    };
    img.src = imageDataUrl;

    return () => {
      cancelled = true;
    };
  }, [value, imageDataUrl, imageVisibility, dotsType, cornersSquareType, cornersDotType]);

  return (
    <canvas
      ref={canvasRef}
      className="qr-halftone-canvas"
      style={{ width: size, height: size }}
    />
  );
};

export default HalftoneQR;
