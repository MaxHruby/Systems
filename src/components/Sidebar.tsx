"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LogoutButton } from "./LogoutButton";

type Item = { href: string; label: string; icon: ReactNode };

const I = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
    {path}
  </svg>
);

const items: Item[] = [
  { href: "/dashboard", label: "Přehled", icon: I(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
  { href: "/", label: "Pipeline", icon: I(<><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></>) },
  { href: "/followup", label: "Follow-up", icon: I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { href: "/outreach", label: "Psát", icon: I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>) },
  { href: "/find", label: "Najít firmy", icon: I(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>) },
  { href: "/templates", label: "Šablony", icon: I(<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>) },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname.startsWith("/leads");
  return pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-black text-white shadow-sm">S</span>
      <span className="text-[15px] font-bold tracking-tight">Systems<span className="text-slate-400"> CRM</span></span>
    </Link>
  );
}

function Links({ vertical }: { vertical?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={vertical ? "flex flex-col gap-1" : "flex items-center gap-1 overflow-x-auto"}>
      {items.map((it) => {
        const on = active(pathname, it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
              on ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <span className={on ? "text-indigo-600" : "text-slate-400"}>{it.icon}</span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60 md:flex-col md:border-r md:border-slate-200 md:bg-white/80 md:backdrop-blur">
      <div className="px-5 py-5">
        <Brand />
      </div>
      <div className="flex-1 overflow-y-auto px-3">
        <Links vertical />
      </div>
      <div className="border-t border-slate-200 p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Brand />
        <LogoutButton />
      </div>
      <div className="border-t border-slate-100 px-2 py-2">
        <Links />
      </div>
    </header>
  );
}
