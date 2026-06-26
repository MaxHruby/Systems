"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STAGES } from "@/lib/stages";
import type { Lead } from "@/lib/types";

export function Board({ initial }: { initial: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const okQ = !q || l.company_name.toLowerCase().includes(q.toLowerCase());
      const okR = !region || (l.region ?? "").toLowerCase().includes(region.toLowerCase());
      return okQ && okR;
    });
  }, [leads, q, region]);

  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const s of STAGES) map[s.key] = [];
    for (const l of filtered) (map[l.stage] ??= []).push(l);
    return map;
  }, [filtered]);

  async function moveStage(id: string, stage: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, last_contacted_at: new Date().toISOString() }),
    });
  }

  async function addLead() {
    const name = window.prompt("Název firmy / kontaktu:");
    if (!name) return;
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: name }),
    });
    const j = await res.json();
    if (j.lead) setLeads((prev) => [j.lead, ...prev]);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Hledat firmu</label>
          <input className="input w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder="název…" />
        </div>
        <div>
          <label className="label">Region</label>
          <input className="input w-44" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Praha…" />
        </div>
        <button className="btn-ghost" onClick={addLead}>+ Ruční lead</button>
        <Link href="/find" className="btn-primary">Najít firmy →</Link>
        <a href="/api/export" className="btn-ghost ml-auto">⬇ Export CSV</a>
        <span className="text-sm text-slate-500">{filtered.length} leadů</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => (
          <div key={s.key} className="w-72 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="text-sm font-semibold">{s.label}</span>
              </div>
              <span className="text-xs text-slate-400">{byStage[s.key]?.length ?? 0}</span>
            </div>
            <div className="space-y-2">
              {(byStage[s.key] ?? []).map((l) => (
                <LeadCard key={l.id} lead={l} onMove={moveStage} />
              ))}
              {(byStage[s.key]?.length ?? 0) === 0 && (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                  prázdné
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextActionBadge({ iso }: { iso: string }) {
  const when = new Date(iso);
  const today = new Date();
  const overdue = when < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return (
    <span className={overdue ? "font-semibold text-red-600" : "text-amber-600"}>
      {overdue ? "⚠ Po termínu " : "⏰ "}
      {when.toLocaleDateString("cs-CZ")}
    </span>
  );
}

function LeadCard({ lead, onMove }: { lead: Lead; onMove: (id: string, stage: string) => void }) {
  return (
    <div className="card p-3">
      <Link href={`/leads/${lead.id}`} className="block font-semibold leading-tight hover:underline">
        {lead.company_name}
      </Link>
      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
        {lead.category && <div>{lead.category}</div>}
        {lead.phone && <div>📞 {lead.phone}</div>}
        {lead.region && <div>📍 {lead.region}</div>}
        {lead.next_action_at && <NextActionBadge iso={lead.next_action_at} />}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <select
          className="w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
          value={lead.stage}
          onChange={(e) => onMove(lead.id, e.target.value)}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
