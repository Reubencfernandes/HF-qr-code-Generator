---
title: Hugging Face QR Code Generator
emoji: 🤗
colorFrom: yellow
colorTo: red
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# Hugging Face QR Code Generator 🤗

A beautiful and responsive web application that generates QR codes for Hugging Face profiles, models, datasets, and spaces. Create stunning, shareable QR codes with custom designs that perfectly represent your Hugging Face identity.

## Features ✨

- **Profile QR Codes**: Generate QR codes for any Hugging Face user profile
- **Resource Support**: Create QR codes for models, datasets, and spaces
- **Beautiful Design**: Modern, clean interface with animated gradients
- **Responsive**: Works perfectly on all devices - desktop, tablet, and mobile
- **Multiple Export Options**: Download as image, copy to clipboard, or share directly
- **Social Sharing**: Built-in sharing to Twitter/X, LinkedIn, and Facebook
- **Dark Mode Support**: Automatically adapts to your system preferences

## How to Use 📖

1. **Enter a Hugging Face URL or username**:
   - Full URL: `https://huggingface.co/username`
   - Just username: `username`
   - Model URL: `https://huggingface.co/username/model-name`
   - Dataset URL: `https://huggingface.co/datasets/username/dataset-name`
   - Space URL: `https://huggingface.co/spaces/username/space-name`

2. **Click "Generate QR Code"** to create your custom QR code

3. **Customize and Share**:
   - Click the background to cycle through different gradient colors
   - Download the complete design or just the QR code
   - Copy to clipboard for easy sharing
   - Share directly to social media

## Technology Stack 🛠️

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Custom CSS
- **UI Components**: shadcn/ui
- **QR Generation**: qrcode.js
- **Image Export**: html-to-image
- **Icons**: Lucide React + React Icons

## Local Development 💻

### Prerequisites
- Node.js 20 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/huggingface-qr-generator.git
cd huggingface-qr-generator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm run start
```

## Docker Deployment 🐳

### Build and Run with Docker

1. Build the Docker image:
```bash
docker build -t hf-qr-generator .
```

2. Run the container:
```bash
docker run -p 7860:7860 hf-qr-generator
```

3. Access the application at [http://localhost:7860](http://localhost:7860)

### Deploy to Hugging Face Spaces

This application is configured for easy deployment to Hugging Face Spaces:

1. Create a new Space on Hugging Face
2. Choose "Docker" as the SDK
3. Push this repository to your Space
4. The application will automatically build and deploy

## Environment Variables 🔐

No environment variables are required for basic functionality. The application uses Next.js API routes to handle CORS and proxy requests.

## API Routes 🌐

- `/api/huggingface` - Fetches Hugging Face profile data
- `/api/proxy-image` - Proxies avatar images to avoid CORS issues

## Browser Support 🌍

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- Hugging Face for the amazing platform and API
- shadcn/ui for the beautiful UI components
- The Next.js team for the excellent framework
- All contributors and users of this application

## Support 💬

If you encounter any issues or have questions:
- Open an issue on GitHub
- Contact through Hugging Face Spaces discussions

---

Made with ❤️ for the Hugging Face community