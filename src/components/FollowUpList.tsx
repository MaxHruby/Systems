"use client";

import { useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/types";
import { stageMeta } from "@/lib/stages";

type Buckets = { overdue: Lead[]; today: Lead[]; thisWeek: Lead[]; later: Lead[] };

const SECTIONS: { key: keyof Buckets; label: string; tone: string }[] = [
  { key: "overdue", label: "Po termínu", tone: "text-red-600" },
  { key: "today", label: "Dnes", tone: "text-amber-600" },
  { key: "thisWeek", label: "Tento týden", tone: "text-sky-600" },
  { key: "later", label: "Později", tone: "text-slate-500" },
];

export function FollowUpList({ initial }: { initial: Buckets }) {
  const [buckets, setBuckets] = useState<Buckets>(initial);

  async function reschedule(lead: Lead, days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const iso = new Date(d.toISOString().slice(0, 10) + "T09:00:00").toISOString();
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_action_at: iso, last_contacted_at: new Date().toISOString() }),
    });
    // Přesuň lead do "později" lokálně (nebo prostě odeber a uživatel refreshne).
    removeFromAll(lead.id);
  }

  async function done(lead: Lead) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ next_action_at: null }),
    });
    removeFromAll(lead.id);
  }

  function removeFromAll(id: string) {
    setBuckets((prev) => ({
      overdue: prev.overdue.filter((l) => l.id !== id),
      today: prev.today.filter((l) => l.id !== id),
      thisWeek: prev.thisWeek.filter((l) => l.id !== id),
      later: prev.later.filter((l) => l.id !== id),
    }));
  }

  const totalOpen = buckets.overdue.length + buckets.today.length;

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-bold">Follow-up</h1>
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
          {totalOpen} k vyřízení dnes
        </span>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((s) => {
          const list = buckets[s.key];
          if (list.length === 0) return null;
          return (
            <section key={s.key}>
              <h2 className={`mb-2 text-sm font-bold ${s.tone}`}>
                {s.label} <span className="text-slate-400">({list.length})</span>
              </h2>
              <div className="space-y-2">
                {list.map((l) => (
                  <Row key={l.id} lead={l} onReschedule={reschedule} onDone={done} />
                ))}
              </div>
            </section>
          );
        })}

        {buckets.overdue.length + buckets.today.length + buckets.thisWeek.length + buckets.later.length === 0 && (
          <div className="card p-8 text-center text-slate-500">
            Žádné naplánované follow-upy. Nastav „další akci" u leadu v detailu nebo na nástěnce.
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  lead, onReschedule, onDone,
}: {
  lead: Lead;
  onReschedule: (l: Lead, days: number) => void;
  onDone: (l: Lead) => void;
}) {
  const st = stageMeta(lead.stage);
  return (
    <div className="card flex flex-wrap items-center gap-3 p-3">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} title={st.label} />
      <Link href={`/leads/${lead.id}`} className="font-semibold hover:underline">
        {lead.company_name}
      </Link>
      <span className="text-xs text-slate-400">{st.label}</span>
      {lead.next_action_at && (
        <span className="text-xs text-slate-500">
          {new Date(lead.next_action_at).toLocaleDateString("cs-CZ")}
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1">
        {lead.phone && (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="btn-ghost text-xs">📞 {lead.phone}</a>
        )}
        {lead.email && <a href={`mailto:${lead.email}`} className="btn-ghost text-xs">✉️</a>}
        <button className="btn-ghost text-xs" onClick={() => onReschedule(lead, 3)}>+3 dny</button>
        <button className="btn-ghost text-xs" onClick={() => onReschedule(lead, 7)}>+1 týden</button>
        <button className="btn-ghost text-xs text-emerald-600" onClick={() => onDone(lead)}>Hotovo</button>
      </div>
    </div>
  );
}
