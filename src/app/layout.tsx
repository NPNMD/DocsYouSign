import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "SignToSeal — Sign, Send & Seal Your Documents",
  description: "Upload PDFs, fill ready-made templates, send documents for signature, and seal every agreement — all in one private, secure place. No subscription required.",
  keywords: ["e-signature", "document signing", "NDA", "PDF sign", "send for signature", "electronic signature", "free document signing"],
  openGraph: {
    title: "SignToSeal — Sign, Send & Seal Your Documents",
    description: "Upload PDFs, fill ready-made templates, send documents for signature, and seal every agreement.",
    url: "https://signtoseal.com",
    siteName: "SignToSeal",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignToSeal — Sign, Send & Seal Your Documents",
    description: "Upload PDFs, fill ready-made templates, send documents for signature, and seal every agreement.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
