'use client';

import React, { useState } from 'react';
import { parseHuggingFaceUrl } from '../lib/huggingface';
import QRCodeWithLogo from './QRCodeWithLogo';
import { saveAs } from 'file-saver';
import * as htmlToImage from 'html-to-image';

const HuggingFaceQRGenerator = () => {
  const [inputUrl, setInputUrl] = useState('');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrCodeInstance, setQrCodeInstance] = useState(null);

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
    } catch (err) {
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
        const dataUrl = await htmlToImage.toPng(cardElement, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2, // Higher quality
          style: {
            margin: '0',
            padding: '20px',
            borderRadius: '16px'
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

      } else if (format === 'svg' && qrCodeInstance) {
        // Download QR as SVG
        const blob = await qrCodeInstance.download({
          name: `huggingface-${profileData.username}`,
          extension: 'svg'
        });
        saveAs(blob, `huggingface-${profileData.username}.svg`);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleShare = (platform) => {
    const shareText = `Check out my Hugging Face profile!`;
    const shareUrl = profileData?.qrValue || '';

    const shareLinks = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    };

    if (shareLinks[platform]) {
      window.open(shareLinks[platform], '_blank', 'width=600,height=400');
    }
  };

  const isValid = inputUrl.trim().length > 0;

  return (
    <div className="qr-generator">
      <div className="hf-card">
        <div className="hf-header">
          <div className="hf-emoji">🤗</div>
          <div className="hf-title-wrap">
            <h1 className="hf-title">Hugging Face</h1>
            <p className="hf-subtitle">Roast your favorite Hugging Face user!</p>
          </div>
        </div>

        <div className="hf-form">
          <div className="hf-field">
            <label className="hf-label">HUGGING FACE USERNAME</label>
            <div className="hf-input-wrap">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://huggingface.co/"
                className="hf-input"
                onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <span className={`hf-valid ${isValid ? 'active' : ''}`} aria-hidden="true">✓</span>
            </div>
          </div>

          <div className="hf-field">
            <label className="hf-label">LANGUAGE</label>
            <select className="hf-select" defaultValue="en">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!inputUrl || loading}
            className="hf-cta"
          >
            {loading ? 'Roasting in progress...' : 'Roast'}
          </button>

          {error && (
            <div className="error-message" role="alert">{error}</div>
          )}
        </div>
      </div>

      {profileData && (
        <div className="result-section">
          <div className="profile-info">
            <img
              src={profileData.avatarUrl}
              alt={profileData.fullName}
              className="profile-avatar"
              crossOrigin="anonymous"
            />
            <div className="profile-details">
              <h2>{profileData.fullName}</h2>
              <p className="profile-username">@{profileData.username}</p>
              <a
                href={profileData.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-link"
              >
                View Profile →
              </a>
            </div>
          </div>

          <div className="qr-preview">
            <div className="qr-phone-bg">
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
                      size={260}
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
            </div>
          </div>

          <div className="actions-section">
            <div className="download-actions">
              <h3>Download Options</h3>
              <div className="button-group">
                <button
                  onClick={() => handleDownload('card')}
                  className="download-btn primary"
                >
                  Download Card (PNG)
                </button>
                <button
                  onClick={() => handleDownload('qr-only')}
                  className="download-btn secondary"
                >
                  QR Code Only
                </button>
              </div>
            </div>

            <div className="share-actions">
              <h3>Share Profile</h3>
              <div className="button-group">
                <button
                  onClick={() => handleShare('twitter')}
                  className="share-btn twitter"
                  aria-label="Share on Twitter"
                >
                  𝕏 Twitter
                </button>
                <button
                  onClick={() => handleShare('facebook')}
                  className="share-btn facebook"
                  aria-label="Share on Facebook"
                >
                  f Facebook
                </button>
                <button
                  onClick={() => handleShare('linkedin')}
                  className="share-btn linkedin"
                  aria-label="Share on LinkedIn"
                >
                  in LinkedIn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HuggingFaceQRGenerator;