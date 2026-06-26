import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Systems CRM",
  description: "Akviziční CRM — Systémy & Automatizace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <nav className="flex items-center gap-1">
              <Link href="/" className="mr-3 text-sm font-bold tracking-tight">
                Systems<span className="text-slate-400">CRM</span>
              </Link>
              <Link href="/dashboard" className="btn-ghost border-0 hover:bg-slate-100">
                Přehled
              </Link>
              <Link href="/" className="btn-ghost border-0 hover:bg-slate-100">
                Pipeline
              </Link>
              <Link href="/followup" className="btn-ghost border-0 hover:bg-slate-100">
                Follow-up
              </Link>
              <Link href="/outreach" className="btn-ghost border-0 hover:bg-slate-100">
                Psát
              </Link>
              <Link href="/find" className="btn-ghost border-0 hover:bg-slate-100">
                Najít firmy
              </Link>
              <Link href="/templates" className="btn-ghost border-0 hover:bg-slate-100">
                Šablony
              </Link>
            </nav>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
