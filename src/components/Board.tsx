"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STAGES } from "@/lib/stages";
import type { Lead } from "@/lib/types";

export function Board({ initial }: { initial: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initial);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [focus, setFocus] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

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
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
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

  function onDrop(stage: string) {
    if (dragId) moveStage(dragId, stage);
    setDragId(null);
    setDragOver(null);
  }

  const visibleStages = focus ? STAGES.filter((s) => s.key === focus) : STAGES;

  return (
    <div>
      {/* Hlavička + klikací chipy */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-xl font-bold tracking-tight">Pipeline</h1>
        <button
          onClick={() => setFocus(null)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            focus === null ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}
        >
          Vše {filtered.length}
        </button>
        {STAGES.map((s) => {
          const active = focus === s.key;
          const count = byStage[s.key]?.length ?? 0;
          return (
            <button
              key={s.key}
              onClick={() => setFocus(active ? null : s.key)}
              className="rounded-full px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
              style={{
                background: s.color,
                outline: active ? "2px solid #0f172a" : "none",
                outlineOffset: 2,
                opacity: focus && !active ? 0.45 : 1,
              }}
            >
              {s.label} {count}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Hledat firmu</label>
          <input className="input w-52" value={q} onChange={(e) => setQ(e.target.value)} placeholder="název…" />
        </div>
        <div>
          <label className="label">Region</label>
          <input className="input w-40" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Praha…" />
        </div>
        <button className="btn-ghost" onClick={addLead}>+ Ruční lead</button>
        <Link href="/find" className="btn-primary">Najít firmy →</Link>
        <a href="/api/export" className="btn-ghost ml-auto">⬇ Export CSV</a>
      </div>

      {focus && (
        <p className="mb-3 text-sm text-slate-500">
          Filtr: <strong>{STAGES.find((s) => s.key === focus)?.label}</strong> · přetáhni kartu nebo klikni na chip „Vše" pro celý board.
        </p>
      )}

      {/* Sloupce */}
      <div className={focus ? "" : "flex gap-4 overflow-x-auto pb-4"}>
        {visibleStages.map((s) => {
          const list = byStage[s.key] ?? [];
          const isOver = dragOver === s.key;
          return (
            <div
              key={s.key}
              onDragOver={(e) => { e.preventDefault(); setDragOver(s.key); }}
              onDragLeave={() => setDragOver((d) => (d === s.key ? null : d))}
              onDrop={() => onDrop(s.key)}
              className={`${focus ? "w-full" : "w-72 shrink-0"} rounded-xl transition ${
                isOver ? "bg-slate-200/70 ring-2 ring-slate-400" : "bg-slate-100/60"
              }`}
            >
              {/* Hlavička sloupce */}
              <div
                className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl px-3 py-2"
                style={{ background: s.color }}
              >
                <span className="text-sm font-bold text-white">{s.label}</span>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold text-white">{list.length}</span>
              </div>

              {/* Karty */}
              <div
                className={`p-2 ${
                  focus ? "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"
                }`}
              >
                {list.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    color={s.color}
                    dragging={dragId === l.id}
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onMove={moveStage}
                  />
                ))}
                {list.length === 0 && (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                    {isOver ? "Pusť sem" : "prázdné"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NextActionBadge({ iso }: { iso: string }) {
  const when = new Date(iso);
  const today = new Date();
  const overdue = when < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        overdue ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {overdue ? "⚠ Po termínu" : "⏰"} {when.toLocaleDateString("cs-CZ")}
    </span>
  );
}

function LeadCard({
  lead, color, dragging, onDragStart, onDragEnd, onMove,
}: {
  lead: Lead;
  color: string;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (id: string, stage: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads/${lead.id}`} className="font-semibold leading-tight hover:underline">
          {lead.company_name}
        </Link>
        <div className="flex items-center gap-1">
          {lead.email && (
            <Link
              href={`/outreach?lead=${lead.id}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded px-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-sky-600 group-hover:opacity-100"
              title="Napsat email"
            >
              ✉️
            </Link>
          )}
          <span className="select-none text-slate-300 group-hover:text-slate-400" title="Přetáhni">⋮⋮</span>
        </div>
      </div>
      <div className="mt-1.5 space-y-1 text-xs text-slate-500">
        {lead.category && <div>{lead.category}</div>}
        {lead.phone && (
          <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-sky-600 hover:underline" onClick={(e) => e.stopPropagation()}>
            📞 {lead.phone}
          </a>
        )}
        {lead.region && <div>📍 {lead.region}</div>}
        {lead.next_action_at && <div><NextActionBadge iso={lead.next_action_at} /></div>}
      </div>
      <select
        className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        value={lead.stage}
        onChange={(e) => onMove(lead.id, e.target.value)}
        title="Změnit fázi"
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
