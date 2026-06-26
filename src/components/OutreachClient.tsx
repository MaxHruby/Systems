"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Lead, Template } from "@/lib/types";
import { STAGES, stageMeta } from "@/lib/stages";

type Props = {
  leads: Lead[];
  templates: Template[];
  signature: string;
  senderName: string;
  fromAddr: string;
  emailReady: boolean;
};

function render(body: string, lead: Lead | null, signature: string, senderName: string): string {
  if (!lead) return body;
  let out = body
    .replaceAll("{jmeno}", (lead.contact_name || "").trim())
    .replaceAll("{firma}", (lead.company_name || "").trim())
    .replaceAll("{podpis}", signature)
    .replaceAll("{moje_jmeno}", senderName);
  out = out.replace(/Dobr(ý|y) den\s+,/g, "Dobrý den,").replace(/[ \t]{2,}/g, " ");
  return out;
}

export function OutreachClient(props: Props) {
  const { templates, fromAddr, emailReady } = props;
  const params = useSearchParams();
  const [mode, setMode] = useState<"single" | "bulk">(params.get("lead") ? "single" : "single");

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Psát</h1>
        {emailReady ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            Email napojen: {fromAddr}
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Email zatím nenapojen
          </span>
        )}
        <div className="ml-auto flex rounded-lg border border-slate-300 p-0.5 text-sm">
          <button
            onClick={() => setMode("single")}
            className={`rounded-md px-3 py-1 ${mode === "single" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          >
            Jednotlivě
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`rounded-md px-3 py-1 ${mode === "bulk" ? "bg-slate-900 text-white" : "text-slate-600"}`}
          >
            Hromadně
          </button>
        </div>
      </div>

      {!emailReady && (
        <div className="card mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Napojení emailu (jednorázově):</strong> v Gmailu si vytvoř{" "}
          <a className="underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">App Password</a>{" "}
          a nastav <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code>,{" "}
          <code>SMTP_FROM_NAME</code>. Postup je v README. Psát můžeš i teď — odeslání jen vyhodí chybu, dokud klíče nedoplníš.
        </div>
      )}

      {mode === "single" ? <Single {...props} /> : <Bulk {...props} />}
    </div>
  );
}

/* ───────────────────────── Jednotlivě ───────────────────────── */
function Single({ leads, templates, signature, senderName, fromAddr }: Props) {
  const params = useSearchParams();
  const [list, setList] = useState<Lead[]>(leads);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(params.get("lead"));
  const [tplId, setTplId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const selected = useMemo(() => list.find((l) => l.id === selectedId) ?? null, [list, selectedId]);
  const visible = useMemo(
    () => list.filter((l) => !search || l.company_name.toLowerCase().includes(search.toLowerCase())),
    [list, search]
  );

  useEffect(() => {
    if (!selected) return;
    setTo(selected.email ?? "");
    if (tplId) applyTemplate(tplId, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function applyTemplate(id: string, lead: Lead | null) {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setSubject(render(tpl.subject ?? "", lead, signature, senderName));
    setBody(render(tpl.body, lead, signature, senderName));
  }
  function onPickTemplate(id: string) {
    setTplId(id);
    if (id) applyTemplate(id, selected);
  }

  async function send() {
    if (!selected) return;
    setSending(true);
    setMsg(null);
    const res = await fetch(`/api/leads/${selected.id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, body }),
    });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ kind: "ok", text: "Odesláno ✓ — zalogováno, fáze → Kontaktován, follow-up za 3 dny." });
      setList((prev) => prev.map((l) => (l.id === selected.id ? { ...l, stage: l.stage === "nova" ? "kontaktovan" : l.stage } : l)));
    } else {
      setMsg({ kind: "err", text: j.error ?? "Odeslání selhalo." });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-2">
          <input className="input" placeholder="Hledat lead…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {visible.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Žádné leady s emailem.</p>}
          {visible.map((l) => {
            const st = stageMeta(l.stage);
            return (
              <button
                key={l.id}
                onClick={() => setSelectedId(l.id)}
                className={`flex w-full items-start gap-2 border-b border-slate-100 p-3 text-left transition hover:bg-slate-50 ${
                  selectedId === l.id ? "bg-slate-100" : ""
                }`}
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: st.color }} title={st.label} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{l.company_name}</span>
                  <span className="block truncate text-xs text-slate-500">{l.email}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-4">
        {!selected ? (
          <p className="py-16 text-center text-slate-400">Vyber lead vlevo a začni psát.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Link href={`/leads/${selected.id}`} className="font-bold hover:underline">{selected.company_name}</Link>
              <span className="text-xs text-slate-400">{stageMeta(selected.stage).label}</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Příjemce</label>
                <input className="input" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="label">Šablona</label>
                <select className="input" value={tplId} onChange={(e) => onPickTemplate(e.target.value)}>
                  <option value="">— vlastní text —</option>
                  {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Předmět</label>
              <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="label">Text</label>
              <textarea className="input min-h-[260px] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            {msg && (
              <p className={`rounded-lg px-3 py-2 text-sm ${msg.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>
            )}
            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={send} disabled={sending || !to || !subject || !body}>
                {sending ? "Odesílám…" : "Odeslat email"}
              </button>
              <span className="text-xs text-slate-400">Z {fromAddr || "(nenapojeno)"}; odpovědi chodí do tvé schránky.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Hromadně ───────────────────────── */
function Bulk({ leads, templates }: Props) {
  const [list] = useState<Lead[]>(leads);
  const [stageFilter, setStageFilter] = useState<string>("nova");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [tplId, setTplId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; skipped: number; overCap: number; cap: number; results: { name: string; status: string; reason?: string }[] } | null>(null);

  const visible = useMemo(
    () => list.filter((l) => stageFilter === "all" || l.stage === stageFilter),
    [list, stageFilter]
  );

  function onPickTemplate(id: string) {
    setTplId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setSubject(tpl.subject ?? "");
      setBody(tpl.body); // placeholdery NECHÁVÁME — personalizují se per lead na serveru
    }
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const allVisibleChecked = visible.length > 0 && visible.every((l) => checked.has(l.id));

  async function send() {
    const ids = Array.from(checked);
    if (ids.length === 0) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/outreach/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: ids, subject, body }),
    });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setResult(j);
      setChecked(new Set());
    } else {
      setResult({ sent: 0, failed: 0, skipped: 0, overCap: 0, cap: 0, results: [{ name: "Chyba", status: "failed", reason: j.error }] });
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      {/* Výběr leadů */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-200 p-2">
          <select className="input" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">Všechny fáze</option>
            {STAGES.map((s) => (<option key={s.key} value={s.key}>{s.label}</option>))}
          </select>
          <button
            className="btn-ghost whitespace-nowrap text-xs"
            onClick={() => setChecked(allVisibleChecked ? new Set() : new Set(visible.map((l) => l.id)))}
          >
            {allVisibleChecked ? "Zrušit" : "Vybrat vše"}
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {visible.length === 0 && <p className="p-4 text-center text-sm text-slate-400">Žádné leady s emailem v této fázi.</p>}
          {visible.map((l) => (
            <label key={l.id} className="flex cursor-pointer items-center gap-2 border-b border-slate-100 p-2.5 hover:bg-slate-50">
              <input type="checkbox" checked={checked.has(l.id)} onChange={() => toggle(l.id)} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{l.company_name}</span>
                <span className="block truncate text-xs text-slate-500">{l.email}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="border-t border-slate-200 p-2 text-center text-xs font-semibold text-slate-600">
          Vybráno {checked.size}
        </div>
      </div>

      {/* Šablona + odeslání */}
      <div className="card p-4">
        <div className="space-y-3">
          <div>
            <label className="label">Šablona (povinné u hromadného)</label>
            <select className="input" value={tplId} onChange={(e) => onPickTemplate(e.target.value)}>
              <option value="">— vyber šablonu —</option>
              {templates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Předmět</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label">Text — značky {"{jmeno}"} / {"{firma}"} / {"{podpis}"} se nahradí u každého leadu zvlášť</label>
            <textarea className="input min-h-[240px] font-mono text-sm leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={send} disabled={sending || checked.size === 0 || !subject || !body}>
              {sending ? `Odesílám ${checked.size}…` : `Odeslat ${checked.size} emailů`}
            </button>
            <span className="text-xs text-slate-400">Max 25 na dávku · ~1 mail/s, ať to Gmail nebere jako spam.</span>
          </div>

          {result && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold">
                Odesláno {result.sent} · chyb {result.failed} · přeskočeno {result.skipped}
                {result.overCap > 0 && ` · ${result.overCap} nad limit (pošli zbytek v další dávce)`}
              </p>
              {result.results.some((r) => r.status !== "sent") && (
                <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                  {result.results.filter((r) => r.status !== "sent").map((r, i) => (
                    <li key={i}>{r.status === "skipped" ? "⏭️" : "⚠️"} {r.name}{r.reason ? ` — ${r.reason}` : ""}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
