'use client';

import React, { useRef, useState, useLayoutEffect } from 'react';
import { normalizeUrl, detectPlatform, DetectedLink } from '../lib/platforms';
import QRCodeWithLogo from './QRCodeWithLogo';
import HalftoneQR from './HalftoneQR';
import CustomizePanel, { QrStyle, DEFAULT_QR_STYLE } from './CustomizePanel';
import { saveAs } from 'file-saver';
import * as htmlToImage from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, ChevronLeft, Copy, Palette, QrCode, Check, AlertCircle } from 'lucide-react';
import { FaFacebook, FaLinkedin } from 'react-icons/fa';
import { FaSquareXTwitter } from 'react-icons/fa6';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

const QRGenerator = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [link, setLink] = useState<DetectedLink | null>(null);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [gradientIndex, setGradientIndex] = useState(0);
  const [showCustomize, setShowCustomize] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [customColor, setCustomColor] = useState<string | null>('#f59e0b');
  const [cardStyle, setCardStyle] = useState<'solid' | 'image'>('solid');
  const [cardBg, setCardBg] = useState<string | null>(null); // solid tint; null = white
  const [cardImage, setCardImage] = useState<string>('/cards/card1.jpg');
  const [qrStyle, setQrStyle] = useState<QrStyle>(DEFAULT_QR_STYLE);
  const [dockStyle, setDockStyle] = useState<React.CSSProperties | undefined>(undefined);

  const gradients = [
    { name: 'Sunset', colors: ['#fa709a', '#fee140'] },
    { name: 'Ocean', colors: ['#4facfe', '#00f2fe'] },
    { name: 'Aurora', colors: ['#00c9ff', '#92fe9d'] },
    { name: 'Dusk', colors: ['#30cfd0', '#330867'] },
    { name: 'Candy', colors: ['#a18cd1', '#fbc2eb'] },
    { name: 'Peach', colors: ['#ffecd2', '#fcb69f'] },
    { name: 'Flare', colors: ['#f83600', '#f9d423'] },
    { name: 'Nebula', colors: ['#667eea', '#764ba2'] },
    { name: 'Rose', colors: ['#ff9a9e', '#fecfef'] },
    { name: 'Lime', colors: ['#d4fc79', '#96e6a1'] },
    { name: 'Royal', colors: ['#141e30', '#243b55'] },
    { name: 'Northern', colors: ['#43cea2', '#185a9d'] },
  ];

  const solidColors = [
    { name: 'White', color: '#ffffff' },
    { name: 'Orange', color: '#f59e0b' },
    { name: 'Blue', color: '#3b82f6' },
    { name: 'Green', color: '#10b981' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Red', color: '#ef4444' },
    { name: 'Yellow', color: '#eab308' },
    { name: 'Gray', color: '#6b7280' },
  ];

  const handleGenerate = () => {
    setError('');
    const normalized = normalizeUrl(inputUrl);
    if (!normalized) {
      setError('Please enter a valid link, e.g. https://github.com/yourname');
      setShowQR(false);
      return;
    }
    setLink(detectPlatform(normalized));
    setShowQR(true);
  };

  const handleBack = () => {
    setShowQR(false);
    setShowCustomize(false);
  };

  const updateQrStyle = (patch: Partial<QrStyle>) => {
    setQrStyle((prev) => ({ ...prev, ...patch }));
  };

  const handleCycleBackground = () => {
    setGradientIndex((prev) => (prev + 1) % gradients.length);
    setCustomColor(null);
  };

  const handleSelectGradient = (index: number) => {
    setGradientIndex(index);
    setCustomColor(null);
  };

  const handleSelectSolidColor = (color: string) => {
    setCustomColor(color);
  };

  const getBackgroundStyle = () => {
    if (customColor) {
      return { background: customColor };
    }
    const gradient = gradients[gradientIndex];
    return { background: `linear-gradient(135deg, ${gradient.colors.join(', ')})` };
  };

  const phoneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const qrHolderRef = useRef<HTMLDivElement | null>(null);

  // On wide screens, dock the Customize panel right beside the QR card so it
  // sits close to what you're editing (instead of pinned to the screen edge).
  useLayoutEffect(() => {
    if (!showCustomize) {
      setDockStyle(undefined);
      return;
    }
    const compute = () => {
      const el = phoneRef.current;
      if (!el || window.innerWidth < 1200) {
        setDockStyle(undefined);
        return;
      }
      const r = el.getBoundingClientRect();
      const W = 360;
      const gap = 24;
      const estH = Math.min(window.innerHeight * 0.88, 640);
      const left = Math.min(r.right + gap, window.innerWidth - W - 16);
      const top = Math.max(16, Math.min(r.top, window.innerHeight - estH - 16));
      setDockStyle({
        position: 'fixed',
        left,
        top,
        right: 'auto',
        width: W,
        margin: 0,
        transform: 'none',
      });
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [showCustomize, cardStyle]);

  // Center logo: user upload wins, then the auto-detected platform/favicon logo.
  const resolvedLogoUrl =
    qrStyle.logoMode === 'none'
      ? undefined
      : qrStyle.logoMode === 'custom'
        ? qrStyle.customLogoDataUrl ?? undefined
        : link?.logoUrl;

  // A center logo eats into the pattern, so raise error correction.
  const errorCorrectionLevel = resolvedLogoUrl ? 'H' : 'M';
  const imageSize = link?.logoSource === 'favicon' && qrStyle.logoMode === 'auto' ? 0.25 : 0.3;

  const fileBase = `qr-${link?.platform?.id ?? link?.hostname ?? 'code'}`;
  const displayName = link?.platform?.name ?? link?.hostname ?? '';

  const captureElement = async (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      style: { margin: '0' },
    });
    const response = await fetch(dataUrl);
    return response.blob();
  };

  const handleDownload = async (format = 'full') => {
    if (!link) return;

    try {
      if (format === 'full' && phoneRef.current) {
        const blob = await captureElement(phoneRef.current);
        saveAs(blob, `${fileBase}-phone.png`);
      } else if (format === 'qr-only' && qrHolderRef.current) {
        const blob = await captureElement(qrHolderRef.current);
        saveAs(blob, `${fileBase}.png`);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShare = (platform: string) => {
    const shareText = 'Check out this link!';
    const shareUrl = link?.url || '';

    const shareLinks: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ id: Date.now(), message, type });
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleCopyImage = async () => {
    if (!link || !phoneRef.current) return;

    try {
      const blob = await captureElement(phoneRef.current);
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ]);
      showToast('Image copied to clipboard');
    } catch (err) {
      console.error('Copy error:', err);
      showToast('Copy not supported in this browser', 'error');
    }
  };

  const inputIsInvalid = inputUrl.trim().length > 0 && normalizeUrl(inputUrl) === null;

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Toast notification */}
      {toast && (
        <div className={`qr-toast ${toast.type}`} role="status" key={toast.id}>
          <span className="qr-toast-icon">
            {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Input form - hidden when QR is shown */}
      {!showQR && (
        <div className="min-h-screen grid place-items-center p-4 sm:p-6 md:p-10 bg-white/80">
          <div className="w-full max-w-2xl mx-auto">
            {/* Input card */}
            <Card className="shadow-xl" style={{ padding: '1rem', fontFamily: 'var(--font-inter)', boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)' }}>
              <CardHeader className="pb-4 px-4 sm:px-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-6 w-6 sm:h-7 sm:w-7" />
                    <span className="text-lg sm:text-xl font-bold" style={{ fontFamily: 'var(--font-inter)' }}>QR Code Generator</span>
                  </div>
                  <CardDescription className="text-muted-foreground text-sm sm:text-base" style={{ fontFamily: 'var(--font-inter)' }}>Generate a clean, customizable QR code for any link — we detect the platform automatically.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-7">
                <div className="space-y-3">
                  <Label className="text-xs tracking-wider font-medium" style={{ fontFamily: 'var(--font-inter)' }}>LINK OR URL</Label>
                  <div className="relative">
                    <div className="flex flex-col sm:flex-row items-stretch overflow-hidden rounded-md border">
                      <Input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://github.com/yourname"
                        className="h-10 sm:h-12 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base"
                        style={{ paddingLeft: '12px', paddingRight: '12px', fontFamily: 'var(--font-inter)' }}
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                        aria-invalid={inputIsInvalid}
                        aria-describedby="link-input-help"
                        autoFocus
                      />
                    </div>
                  </div>
                  <p id="link-input-help" className="text-xs text-muted-foreground" style={{ paddingTop: '5px', paddingBottom: '4px', fontFamily: 'var(--font-inter)' }}>Paste any link — YouTube, GitHub, Hugging Face, Instagram, or your own website.</p>
                </div>

                <div className="pt-2 flex justify-center sm:justify-end">
                  <Button
                    onClick={handleGenerate}
                    disabled={!inputUrl.trim()}
                    className="rounded-md h-auto bg-neutral-900 text-white hover:bg-neutral-800 disabled:bg-neutral-700 disabled:opacity-100 w-full sm:w-auto text-sm sm:text-base cursor-pointer active:cursor-progress disabled:cursor-not-allowed transition-colors"
                    style={{ padding: '10px 16px' }}
                    aria-label="Generate QR Code"
                  >
                    Generate QR Code
                  </Button>
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Full screen QR preview - shown after successful generation */}
      {showQR && link && (
        <div
          className="fixed inset-0 bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 z-50 p-4 md:p-6 overflow-y-auto"
          style={getBackgroundStyle()}
        >
          {/* Back button moved outside of the phone so it won't appear in exports */}
          <div className="qr-topbar">
            <button onClick={handleBack} aria-label="Back"><ChevronLeft size={18} /></button>
          </div>
          <div className="qr-preview mx-auto flex justify-center py-6">
            <div
              className="qr-phone-bg"
              ref={phoneRef}
              style={
                cardStyle === 'image'
                  ? { backgroundImage: `url(${cardImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : getBackgroundStyle()
              }
              onClick={handleCycleBackground}
            >
              <div
                className={`qr-card-v2${cardBg === 'transparent' ? ' transparent' : ''}`}
                id="qr-card"
                ref={cardRef}
                style={cardBg ? { background: cardBg } : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="qr-card-inner">
                  <div
                    className={`qr-code-holder${cardStyle === 'image' ? ' on-image' : ''}`}
                    ref={qrHolderRef}
                    style={{ background: qrStyle.bgImageDataUrl ? '#FFFFFF' : qrStyle.qrBackgroundColor }}
                  >
                    {qrStyle.bgImageDataUrl ? (
                      <HalftoneQR
                        value={link.url}
                        imageDataUrl={qrStyle.bgImageDataUrl}
                        size={240}
                        imageVisibility={qrStyle.imageVisibility}
                        dotsType={qrStyle.dotsType}
                        cornersSquareType={qrStyle.cornersSquareType}
                        cornersDotType={qrStyle.cornersDotType}
                      />
                    ) : (
                      <QRCodeWithLogo
                        value={link.url}
                        logoUrl={resolvedLogoUrl}
                        size={240}
                        backgroundColor={qrStyle.qrBackgroundColor}
                        dotsColor={qrStyle.dotsColor}
                        cornersSquareColor={qrStyle.cornersSquareColor}
                        cornersDotColor={qrStyle.cornersDotColor}
                        dotsType={qrStyle.dotsType}
                        cornersSquareType={qrStyle.cornersSquareType}
                        cornersDotType={qrStyle.cornersDotType}
                        errorCorrectionLevel={errorCorrectionLevel}
                        imageSize={imageSize}
                      />
                    )}
                  </div>
                  <p className="qr-caption">Scan to open {displayName}</p>
                  <div className="qr-brand">
                    {link.logoSource !== 'generic' && (
                      <img src={link.logoUrl} alt={displayName} crossOrigin="anonymous" />
                    )}
                    <span>{displayName}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Share sheet placed below the phone (not part of exported element) */}
            <div className="qr-share-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="qr-download-group">
                <span className="qr-share-label">Actions</span>
                <div className="qr-download-actions">
                  <div className="qr-download-item">
                    <button onClick={() => handleDownload('full')} className="qr-circle" aria-label="Download">
                      <Download size={18} />
                    </button>
                    <span className="qr-action-text">Download</span>
                  </div>
                  <div className="qr-download-item">
                    <button onClick={() => handleDownload('qr-only')} className="qr-circle" aria-label="Download QR only">
                      <QrCode size={18} />
                    </button>
                    <span className="qr-action-text">QR only</span>
                  </div>
                  <div className="qr-download-item">
                    <button onClick={handleCopyImage} className="qr-circle" aria-label="Copy">
                      <Copy size={18} />
                    </button>
                    <span className="qr-action-text">Copy</span>
                  </div>
                  <div className="qr-download-item">
                    <button onClick={() => setShowCustomize(!showCustomize)} className="qr-circle" aria-label="Customize">
                      <Palette size={18} />
                    </button>
                    <span className="qr-action-text">Customize</span>
                  </div>
                </div>
              </div>
              <div className="qr-share-group">
                <span className="qr-share-label">Share to</span>
                <div className="qr-share-actions">
                  <button className="qr-circle" onClick={() => handleShare('linkedin')} aria-label="Share on LinkedIn"><FaLinkedin size={20} /></button>
                  <button className="qr-circle" onClick={() => handleShare('facebook')} aria-label="Share on Facebook"><FaFacebook size={20} /></button>
                  <button className="qr-circle" onClick={() => handleShare('twitter')} aria-label="Share on X (Twitter)"><FaSquareXTwitter size={20} /></button>
                </div>
              </div>
            </div>

            {/* Customize Panel */}
            {showCustomize && (
              <CustomizePanel
                qrStyle={qrStyle}
                onStyleChange={updateQrStyle}
                link={link}
                onClose={() => setShowCustomize(false)}
                gradients={gradients}
                solidColors={solidColors}
                gradientIndex={gradientIndex}
                customColor={customColor}
                onSelectGradient={handleSelectGradient}
                onSelectSolidColor={handleSelectSolidColor}
                cardStyle={cardStyle}
                onSetCardStyle={setCardStyle}
                cardBg={cardBg}
                onSetCardBg={setCardBg}
                cardImage={cardImage}
                onSetCardImage={setCardImage}
                dockStyle={dockStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;
