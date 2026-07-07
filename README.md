---
title: QR Code Generator
emoji: 🔳
colorFrom: yellow
colorTo: red
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# QR Code Generator 🔳

A beautiful, responsive web app that generates highly scannable QR codes for **any link** — with automatic platform logos, full color and shape customization, custom logo uploads, and image-backed QR codes.

## Features ✨

- **Any link**: Paste any URL — the platform is detected automatically
- **Auto platform logos**: Hugging Face, YouTube, GitHub, Instagram, X (Twitter), LinkedIn, TikTok, Facebook, WhatsApp, Telegram, Reddit, Discord, Spotify, Twitch, Pinterest, Medium, Threads, Snapchat — plus automatic favicon fetching for any other website
- **QR colors**: Customize dots, corner markers, and background colors with presets or a free color picker
- **Shapes**: Six dot styles and multiple corner marker styles
- **Custom logo**: Upload your own logo for the QR center, or remove the logo entirely
- **Image QR**: Put your own photo behind the QR pattern with an adjustable fade
- **Scannability guard**: Automatic error-correction boosting, low-contrast and inverted-color warnings with one-click reset
- **Export**: Download the full card or just the QR, copy to clipboard, or share to social media
- **Card styling**: Gradient and solid color card backgrounds

## How to Use 📖

1. **Paste any link** — e.g. `https://github.com/yourname`, `youtu.be/xyz`, `huggingface.co/username`, or your own website
2. **Click "Generate QR Code"**
3. **Customize**: open the Customize panel to change colors, shapes, logo, or add a background image
4. **Export**: download, copy, or share

## Technology Stack 🛠️

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: shadcn/ui
- **QR Generation**: qr-code-styling
- **Image Export**: html-to-image
- **Icons**: Lucide React + React Icons

## Local Development 💻

### Prerequisites
- Node.js 20 or higher

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Docker Deployment 🐳

```bash
docker build -t qr-generator .
docker run -p 7860:7860 qr-generator
```

Access the application at [http://localhost:7860](http://localhost:7860).

## API Routes 🌐

- `/api/favicon?domain=example.com` - Fetches a website's favicon for the QR center logo (falls back to a generic globe icon)

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
