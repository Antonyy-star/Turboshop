import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TurboTeknik — Turborenovering & Bildelar",
    template: "%s | TurboTeknik",
  },
  description: "TurboTeknik erbjuder professionell turborenovering, OEM och eftermarknads turboladdare samt bildelar. Snabb leverans, expertsupport. Norsborg, Stockholm.",
  keywords: ["turborenovering", "turboladdare", "bildelar", "turbo", "garrett", "borgwarner", "turboteknik", "bilverkstad", "stockholm", "norsborg"],
  authors: [{ name: "TurboTeknik" }],
  creator: "TurboTeknik",
  metadataBase: new URL("https://turboshop-sigma.vercel.app"),
  openGraph: {
    type: "website",
    locale: "sv_SE",
    siteName: "TurboTeknik",
    title: "TurboTeknik — Turborenovering & Bildelar",
    description: "Professionell turborenovering och försäljning av turboladdare. Snabb leverans, expertsupport.",
  },
  twitter: {
    card: "summary_large_image",
    title: "TurboTeknik — Turborenovering & Bildelar",
    description: "Professionell turborenovering och försäljning av turboladdare.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link rel="preload" href="/3d%20Logo/Logo.obj" as="fetch" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="theme-color" content="#111827" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
