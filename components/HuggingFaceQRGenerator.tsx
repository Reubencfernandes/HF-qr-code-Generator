'use client';

import React, { useState } from 'react';
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
import { Download, Loader2, QrCode, Twitter, Facebook, Linkedin, Sparkles, ExternalLink, CheckCircle2, MessageCircle, Mail, MoreHorizontal, ChevronLeft, Menu } from 'lucide-react';

const HuggingFaceQRGenerator = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeInstance, setQrCodeInstance] = useState<any>(null);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);

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
    } catch (err: any) {
      setError(err.message || 'Invalid URL or username');
      setProfileData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format = 'png') => {
    if (!profileData) return;

    try {
      const cardElement = document.getElementById('qr-card');

      if (format === 'png' || format === 'card') {
        // Download the entire card with user info
        const dataUrl = await htmlToImage.toPng(cardElement!, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
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

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'model': return '🤖';
      case 'dataset': return '📊';
      case 'space': return '🚀';
      default: return '👤';
    }
  };

  const isValid = inputUrl.trim().length > 0

  return (
    <div className="min-h-screen grid place-items-center bg-linear-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-4 md:p-8">
      <div className="w-full max-w-3xl">
        {/* Screenshot-1 inspired input card */}
        <Card className="shadow-xl" style={{ fontFamily: 'var(--font-inter)' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🤗</span>
              <CardTitle className="text-2xl">Hugging Face</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>HUGGING FACE USERNAME</Label>
              <div className="relative">
                <div className="flex items-stretch">
                  <span className="hidden sm:flex items-center px-3 text-sm text-muted-foreground bg-secondary/60 border border-input rounded-l-md">
                    https://huggingface.co/
                  </span>
                  <Input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="username or full URL"
                    className="h-11 sm:rounded-l-none sm:border-l-0 pr-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                    disabled={loading}
                  />
                </div>
                <CheckCircle2
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isValid ? 'text-emerald-500' : 'text-muted-foreground/30'}`}
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!inputUrl || loading}
              className="rounded-full px-6 bg-muted text-foreground hover:bg-muted/80 dark:bg-input/40"
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

        {/* Result Section - Phone-like preview matching screenshot */}
        {profileData && (
          <div className="qr-preview flex justify-center">
            <div className="qr-phone-bg">
              <div className="qr-topbar">
                <button aria-label="Back"><ChevronLeft size={18} /></button>
                <button aria-label="Menu"><Menu size={18} /></button>
              </div>

              <div className="qr-card-v2" id="qr-card">
                <div className="qr-avatar-wrap">
                  <img
                    src={profileData.originalAvatarUrl || profileData.avatarUrl}
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
                  <p className="qr-caption">Share your QR code so others can follow you</p>
                  <div className="qr-brand">
                    <img src="https://huggingface.co/front/assets/huggingface_logo.svg" alt="Hugging Face" />
                    <span>Hugging Face</span>
                  </div>
                </div>
              </div>

              <div className="qr-bg-help">Tap background to change color</div>

              <div className="qr-share-sheet">
                <div className="qr-download">
                  <button onClick={() => handleDownload('card')} className="qr-circle">
                    <Download size={18} />
                  </button>
                  <span>Download</span>
                </div>
                <div className="qr-share-group">
                  <span className="qr-share-label">Share to</span>
                  <div className="qr-share-actions">
                    <button className="qr-circle"><MessageCircle size={18} /></button>
                    <button className="qr-circle"><Mail size={18} /></button>
                    <button className="qr-circle"><MoreHorizontal size={18} /></button>
                  </div>
                  <div className="qr-share-texts">
                    <span>SMS</span>
                    <span>Email</span>
                    <span>Other</span>
                  </div>
                </div>
                <button className="qr-close" aria-label="Close">×</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HuggingFaceQRGenerator;