import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  title: "Systems CRM",
  description: "Akviziční CRM — Systémy & Automatizace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
