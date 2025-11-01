import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Poppins } from "next/font/google";
import "./globals.css";
import "../styles/qr-generator.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "HF QR Generator",
  description: "Generate clean and beautiful QR codes for Hugging Face user profiles, models, datasets, and spaces with custom avatars",
  icons: {
    icon: "/hf-logo.svg",
    apple: "/hf-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
