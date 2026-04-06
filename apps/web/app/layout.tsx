import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { PlausibleAnalytics } from "@/components/plausible-analytics";
import { SeoJsonLd } from "@/components/seo-json-ld";
import { defaultSiteMetadata } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = defaultSiteMetadata();

const themeInitScript = `
(function(){
  try {
    var s = localStorage.getItem('gn-theme');
    var r = document.documentElement;
    if (s === 'light') { r.classList.remove('dark'); }
    else { r.classList.add('dark'); }
  } catch (e) {}
})();`;

/** Default theme is dark; `gn-theme` in localStorage overrides before paint. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="gn-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <SeoJsonLd />
        <PlausibleAnalytics />
        {children}
      </body>
    </html>
  );
}
