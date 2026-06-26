"use client";

import { useState } from "react";
import Link from "next/link";
import { TRADES } from "@/lib/trades";
import type { FoundCompany } from "@/lib/types";
import type { SourceKey } from "@/lib/sources";

type SourceOpt = { key: SourceKey; label: string; enabled: boolean };

export function FindClient({ sources }: { sources: SourceOpt[] }) {
  const [source, setSource] = useState<SourceKey>("overpass");
  const [region, setRegion] = useState("Praha");
  const [trade, setTrade] = useState("vse");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<FoundCompany[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importMsg, setImportMsg] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setImportMsg("");
    setResults(null);
    try {
      const res = await fetch("/api/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, region, trade, query, limit }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Hledání selhalo.");
      const list = j.companies as FoundCompany[];
      setResults(list);
      setSelected(new Set(list.map((c) => c.external_id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function importSelected() {
    if (!results) return;
    const picked = results.filter((c) => selected.has(c.external_id));
    if (picked.length === 0) return;
    setImportMsg("Importuji…");
    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companies: picked }),
    });
    const j = await res.json();
    if (!res.ok) {
      setImportMsg("Chyba: " + (j.error ?? "import selhal"));
      return;
    }
    setImportMsg(`Naimportováno ${j.inserted}, přeskočeno ${j.skipped} (duplicity).`);
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Najít firmy</h1>
      <p className="mb-4 text-sm text-slate-500">
        Vyhledej cílové firmy podle regionu a oboru a naimportuj je rovnou do pipeline.
      </p>

      <form onSubmit={search} className="card mb-5 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label">Zdroj</label>
          <select className="input" value={source} onChange={(e) => setSource(e.target.value as SourceKey)}>
            {sources.map((s) => (
              <option key={s.key} value={s.key} disabled={!s.enabled}>
                {s.label}{!s.enabled ? " (vypnuto)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Region</label>
          <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Praha, Brno…" />
        </div>
        <div>
          <label className="label">Obor</label>
          <select className="input" value={trade} onChange={(e) => setTrade(e.target.value)}>
            {TRADES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Max výsledků</label>
          <input
            type="number" min={1} max={200} className="input"
            value={limit} onChange={(e) => setLimit(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Hledám…" : "Hledat"}
          </button>
        </div>
        {source === "engine" && (
          <div className="sm:col-span-2 lg:col-span-5">
            <label className="label">Volný dotaz (engine, nepovinné)</label>
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="např. rekonstrukce bytových jader" />
          </div>
        )}
      </form>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {results && (
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <span className="text-sm font-semibold">{results.length} nalezeno</span>
            <button className="btn-ghost text-xs" onClick={() => setSelected(new Set(results.map((c) => c.external_id)))}>Vybrat vše</button>
            <button className="btn-ghost text-xs" onClick={() => setSelected(new Set())}>Zrušit výběr</button>
            <button className="btn-primary ml-auto text-xs" onClick={importSelected} disabled={selected.size === 0}>
              Importovat vybrané ({selected.size})
            </button>
          </div>
          {importMsg && <p className="border-b border-slate-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{importMsg} <Link href="/" className="underline">Zpět na pipeline →</Link></p>}
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              Nic nenalezeno. Zkus jiný region (přesný název města/kraje) nebo obor „Vše".
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-2"></th>
                  <th className="px-3 py-2">Firma</th>
                  <th className="px-3 py-2">Telefon</th>
                  <th className="px-3 py-2">Web</th>
                  <th className="px-3 py-2">Adresa</th>
                </tr>
              </thead>
              <tbody>
                {results.map((c) => (
                  <tr key={c.external_id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selected.has(c.external_id)} onChange={() => toggle(c.external_id)} />
                    </td>
                    <td className="px-3 py-2 font-medium">{c.company_name}</td>
                    <td className="px-3 py-2 text-slate-600">{c.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">web</a>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{c.address ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
