"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STAGES } from "@/lib/stages";
import type { Lead, LeadNote } from "@/lib/types";

const FIELDS: { key: keyof Lead; label: string }[] = [
  { key: "company_name", label: "Firma" },
  { key: "contact_name", label: "Kontaktní osoba" },
  { key: "phone", label: "Telefon" },
  { key: "email", label: "Email" },
  { key: "website", label: "Web" },
  { key: "address", label: "Adresa" },
  { key: "region", label: "Region" },
  { key: "category", label: "Obor" },
];

const NOTE_KINDS = [
  { key: "note", label: "Poznámka" },
  { key: "call", label: "Telefonát" },
  { key: "email", label: "Email" },
  { key: "meeting", label: "Schůzka / audit" },
];

export function LeadDetailClient({ lead: initial, notes: initialNotes }: { lead: Lead; notes: LeadNote[] }) {
  const router = useRouter();
  const [lead, setLead] = useState<Lead>(initial);
  const [notes, setNotes] = useState<LeadNote[]>(initialNotes);
  const [saving, setSaving] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState("note");

  function set<K extends keyof Lead>(key: K, value: Lead[K]) {
    setLead((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    setSaving(false);
  }

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function setNextAction(date: string | null) {
    const iso = date ? new Date(date + "T09:00:00").toISOString() : null;
    set("next_action_at", iso);
    await patch({ next_action_at: iso });
  }

  function plusDays(n: number) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  async function changeStage(stage: string) {
    set("stage", stage);
    await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, last_contacted_at: new Date().toISOString() }),
    });
  }

  async function addNote() {
    if (!noteBody.trim()) return;
    const res = await fetch(`/api/leads/${lead.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, kind: noteKind }),
    });
    const j = await res.json();
    if (j.note) {
      setNotes((prev) => [j.note, ...prev]);
      setNoteBody("");
    }
  }

  async function remove() {
    if (!window.confirm(`Smazat lead „${lead.company_name}"?`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="btn-ghost text-xs">← Pipeline</button>
          <h1 className="text-xl font-bold">{lead.company_name}</h1>
          {lead.maps_url && (
            <a href={lead.maps_url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline">
              Google Maps ↗
            </a>
          )}
          <button onClick={remove} className="btn-ghost ml-auto text-xs text-red-600">Smazat</button>
        </div>

        {(lead.phone || lead.email || lead.website) && (
          <div className="flex flex-wrap gap-2">
            {lead.phone && (
              <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="btn-ghost text-sm">📞 Zavolat {lead.phone}</a>
            )}
            {lead.email && (
              <a href={`/outreach?lead=${lead.id}`} className="btn-primary text-sm">✉️ Napsat email</a>
            )}
            {lead.website && (
              <a href={lead.website} target="_blank" rel="noreferrer" className="btn-ghost text-sm">🌐 Web ↗</a>
            )}
          </div>
        )}

        <div className="card p-4">
          <div className="mb-3 flex items-center gap-3">
            <label className="label mb-0">Fáze</label>
            <select className="input w-56" value={lead.stage} onChange={(e) => changeStage(e.target.value)}>
              {STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">zdroj: {lead.source}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  value={(lead[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value as Lead[typeof f.key])}
                />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="label">Rychlá poznámka na kartě</label>
            <textarea
              className="input min-h-[60px]"
              value={lead.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          <button onClick={save} className="btn-primary mt-3" disabled={saving}>
            {saving ? "Ukládám…" : "Uložit změny"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Další akce / follow-up</h2>
          {lead.next_action_at ? (
            <p className="mb-2 text-sm text-slate-600">
              Naplánováno na <strong>{new Date(lead.next_action_at).toLocaleDateString("cs-CZ")}</strong>
            </p>
          ) : (
            <p className="mb-2 text-sm text-slate-400">Bez naplánované akce.</p>
          )}
          <input
            type="date"
            className="input mb-2"
            value={lead.next_action_at ? new Date(lead.next_action_at).toISOString().slice(0, 10) : ""}
            onChange={(e) => setNextAction(e.target.value || null)}
          />
          <div className="flex flex-wrap gap-1">
            <button className="btn-ghost text-xs" onClick={() => setNextAction(plusDays(3))}>+3 dny</button>
            <button className="btn-ghost text-xs" onClick={() => setNextAction(plusDays(7))}>+1 týden</button>
            <button className="btn-ghost text-xs" onClick={() => setNextAction(plusDays(30))}>+1 měsíc</button>
            {lead.next_action_at && (
              <button className="btn-ghost text-xs text-slate-500" onClick={() => setNextAction(null)}>Zrušit</button>
            )}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Přidat aktivitu</h2>
          <select className="input mb-2" value={noteKind} onChange={(e) => setNoteKind(e.target.value)}>
            {NOTE_KINDS.map((k) => (
              <option key={k.key} value={k.key}>{k.label}</option>
            ))}
          </select>
          <textarea
            className="input min-h-[80px]"
            placeholder="Co se stalo? (volal jsem, domluvili audit na…)"
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <button onClick={addNote} className="btn-primary mt-2 w-full">Přidat</button>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">Časová osa</h2>
          {notes.length === 0 && <p className="text-sm text-slate-400">Zatím žádné aktivity.</p>}
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="border-l-2 border-slate-200 pl-3">
                <div className="text-xs text-slate-400">
                  {NOTE_KINDS.find((k) => k.key === n.kind)?.label ?? n.kind} ·{" "}
                  {new Date(n.created_at).toLocaleString("cs-CZ")}
                </div>
                <div className="whitespace-pre-wrap text-sm">{n.body}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
