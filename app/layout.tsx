import type { Metadata } from "next";
import { IBM_Plex_Mono, VT323 } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '700'],
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
});

const vt323 = VT323({
  weight: '400',
  variable: "--font-vt323",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "15 Minutes - Build Great Things",
  description: "A productivity tool for tracking work in focused 15-minute increments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ibmPlexMono.variable} ${vt323.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
