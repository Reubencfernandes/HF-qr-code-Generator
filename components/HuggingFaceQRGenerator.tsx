'use client';

import React, { useRef, useState } from 'react';
import { parseHuggingFaceUrl } from '../lib/huggingface';
import QRCodeWithLogo from './QRCodeWithLogo';
import { saveAs } from 'file-saver';
import * as htmlToImage from 'html-to-image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Download, Twitter, Facebook, Linkedin, ChevronLeft } from 'lucide-react';

const HuggingFaceQRGenerator = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);
  const [showQR, setShowQR] = useState(false);
  const [gradientIndex, setGradientIndex] = useState(0);
  const gradients = [
    ['#f1c40f', '#f39c12'],
    ['#34d399', '#10b981'],
    ['#60a5fa', '#6366f1'],
    ['#fb7185', '#f472b6'],
    ['#f59e0b', '#ef4444']
  ];

  const handleGenerate = async () => {
    setError('');
    setLoading(true);
    setShowQR(false);

    try {
      // Parse the URL to extract username and resource info
      const parsed = parseHuggingFaceUrl(inputUrl);

      // Fetch profile data from our API
      const response = await fetch('/api/huggingface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: parsed.username,
          resourceType: parsed.resourceType,
          resourceName: parsed.resourceName
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();

      // Use proxy for the avatar to avoid CORS issues
      const proxiedAvatarUrl = `/api/proxy-image?url=${encodeURIComponent(data.avatarUrl)}`;

      setProfileData({
        ...data,
        avatarUrl: proxiedAvatarUrl,
        originalAvatarUrl: data.avatarUrl,
        qrValue: parsed.profileUrl
      });
      setShowQR(true);
    } catch (err: any) {
      setError(err.message || 'Invalid URL or username');
      setProfileData(null);
      setShowQR(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowQR(false);
  };

  const handleCycleBackground = () => {
    setGradientIndex((prev) => (prev + 1) % gradients.length);
  };

  const phoneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleDownload = async (format = 'png') => {
    if (!profileData) return;

    try {
      const cardElement = cardRef.current || document.getElementById('qr-card');
      const phoneElement = phoneRef.current;

      if (format === 'full' && phoneElement) {
        const rect = phoneElement.getBoundingClientRect();
        const dataUrl = await htmlToImage.toPng(phoneElement, {
          quality: 1.0,
          pixelRatio: 2,
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          style: { margin: '0' }
        });
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        saveAs(blob, `huggingface-${profileData.username}-phone.png`);
      } else if (format === 'png' || format === 'card') {
        // Download just the inner card
        const rect = cardElement!.getBoundingClientRect();
        const dataUrl = await htmlToImage.toPng(cardElement!, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
          style: {
            margin: '0',
            borderRadius: '12px'
          }
        });

        // Convert dataURL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        saveAs(blob, `huggingface-${profileData.username}-card.png`);

      } else if (format === 'qr-only' && qrCodeInstance) {
        // Download just the QR code
        const blob = await qrCodeInstance.download({
          name: `huggingface-${profileData.username}`,
          extension: 'png'
        });
        saveAs(blob, `huggingface-${profileData.username}-qr.png`);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShare = (platform: string) => {
    const shareText = `Check out my Hugging Face profile!`;
    const shareUrl = profileData?.qrValue || '';

    const shareLinks: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }
  };

  const handleShareSms = () => {
    const text = encodeURIComponent(`Check out my Hugging Face profile: ${profileData?.qrValue || ''}`);
    window.open(`sms:?&body=${text}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent('My Hugging Face Profile');
    const body = encodeURIComponent(`Hey! Check out my Hugging Face profile: ${profileData?.qrValue || ''}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  const handleShareNative = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Hugging Face Profile',
          text: 'Check out my Hugging Face profile!',
          url: profileData?.qrValue || ''
        });
      } else {
        await navigator.clipboard.writeText(profileData?.qrValue || '');
        alert('Link copied to clipboard');
      }
    } catch (e) {
      // ignore cancel
    }
  };

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'model': return '🤖';
      case 'dataset': return '📊';
      case 'space': return '🚀';
      default: return '👤';
    }
  };

  const isValid = inputUrl.trim().length > 0
  
  // Validate HuggingFace username format
  const validateInput = (input: string): boolean => {
    if (!input.trim()) return true; // empty is neutral
    // Check if it's a valid username (alphanumeric, hyphens, underscores)
    // or a valid HuggingFace URL
    const usernamePattern = /^[a-zA-Z0-9_-]+$/;
    const urlPattern = /huggingface\.co/i;
    
    return usernamePattern.test(input) || urlPattern.test(input);
  };
  
  const inputIsInvalid = inputUrl.trim().length > 0 && !validateInput(inputUrl);

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Input form - hidden when QR is shown */}
      {!showQR && (
        <div className="min-h-screen grid place-items-center p-6 md:p-10">
          <div className="w-full max-w-2xl mx-auto">
            {/* Input card */}
            <Card className="shadow-xl">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">🤗</span>
                  <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Hugging Face</CardTitle>
                    <CardDescription className="mt-1 text-muted-foreground">Generate a clean QR code for any Hugging Face profile or resource.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 md:p-8 space-y-7">
                <div className="space-y-3">
                  <Label className="text-xs tracking-wider font-medium">HUGGING FACE USERNAME</Label>
                  <div className="relative">
                    <div className="flex items-stretch overflow-hidden rounded-md border">
                      <span className="hidden sm:inline-flex items-center px-3 text-sm text-muted-foreground bg-secondary/40 select-none">
                        https://huggingface.co/
                      </span>
                      <Input
                        type="text"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="username or full URL"
                        className="h-11 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                        disabled={loading}
                        aria-invalid={inputIsInvalid}
                        aria-describedby="hf-input-help"
                      />
                    </div>
                  </div>
                  <p id="hf-input-help" className="text-xs text-muted-foreground">Paste a full URL or just the username, e.g. <span className="font-mono">reubencf</span>.</p>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={!inputUrl || loading}
                  size="lg"
                  className="rounded-md w-full sm:w-auto"
                >
                  {loading ? 'Generating…' : 'Generate QR Code'}
                </Button>

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
      {showQR && profileData && (
        <div
          className="fixed inset-0 bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 z-50 p-4 md:p-6 overflow-y-auto"
          style={{ background: `linear-gradient(135deg, ${gradients[gradientIndex][0]}, ${gradients[gradientIndex][1]})` }}
        >
          {/* Back button moved outside of the phone so it won't appear in exports */}
          <div className="qr-topbar">
            <button onClick={handleBack} aria-label="Back"><ChevronLeft size={18} /></button>
          </div>
          <div className="qr-preview mx-auto flex justify-center py-6">
            <div
              className="qr-phone-bg"
              ref={phoneRef}
              style={{ background: `linear-gradient(135deg, ${gradients[gradientIndex][0]}, ${gradients[gradientIndex][1]})` }}
              onClick={handleCycleBackground}
            >
              <div className="qr-card-v2" id="qr-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
                <div className="qr-avatar-wrap">
                  <img
                    src={profileData.avatarUrl}
                    alt={profileData.fullName}
                    className="qr-avatar"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="qr-card-inner">
                  <div className="qr-name">{profileData.fullName}</div>
                  <div className="qr-code-holder">
                    <QRCodeWithLogo
                      value={profileData.qrValue}
                      logoUrl="https://huggingface.co/front/assets/huggingface_logo.svg"
                      size={210}
                      onQRCodeReady={setQrCodeInstance}
                      backgroundColor="#FFFFFF"
                      dotsColor="#000000"
                    />
                  </div>
                  <p className="qr-caption">{(() => {
                    const t = profileData?.resourceType || profileData?.type;
                    if (t === 'model') return 'Scan to open this model on Hugging Face';
                    if (t === 'dataset') return 'Scan to open this dataset on Hugging Face';
                    if (t === 'space') return 'Scan to open this Space on Hugging Face';
                    if (profileData?.fullName) return `Scan to open ${profileData.fullName} on Hugging Face`;
                    return 'Scan to open on Hugging Face';
                  })()}</p>
                  <div className="qr-brand">
                    <img src="https://huggingface.co/front/assets/huggingface_logo.svg" alt="Hugging Face" />
                    <span>Hugging Face</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Share sheet placed below the phone (not part of exported element) */}
            <div className="qr-share-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="qr-download">
                <button onClick={() => handleDownload('full')} className="qr-circle">
                  <Download size={18} />
                </button>
                <span>Download</span>
              </div>
              <div className="qr-share-group">
                <span className="qr-share-label">Share to</span>
                <div className="qr-share-actions">
                  <button className="qr-circle" onClick={() => handleShare('linkedin')} aria-label="Share on LinkedIn"><Linkedin size={18} /></button>
                  <button className="qr-circle" onClick={() => handleShare('facebook')} aria-label="Share on Facebook"><Facebook size={18} /></button>
                  <button className="qr-circle" onClick={() => handleShare('twitter')} aria-label="Share on X (Twitter)"><Twitter size={18} /></button>
                </div>
                <div className="qr-share-texts">
                  <span>LinkedIn</span>
                  <span>Facebook</span>
                  <span>X</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HuggingFaceQRGenerator;