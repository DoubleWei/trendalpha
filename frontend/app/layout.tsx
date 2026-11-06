import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TrendAlpha — 台股全球趨勢預測",
  description: "海納全球總經、美股、原物料與籌碼事件，動態預測台股大盤走勢。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} min-h-screen font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {/* 背景：點陣格線 + 極光 */}
          <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
            <div className="bg-aurora absolute inset-0" />
            <div className="bg-grid absolute inset-0" />
          </div>
          <Navbar />
          <main className="container pb-20 pt-8">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
