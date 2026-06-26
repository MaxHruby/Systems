import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { allLeads, followUps, recentActivity, type ActivityItem } from "@/lib/leads";
import { STAGES, stageMeta } from "@/lib/stages";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  note: "Poznámka", call: "Telefonát", email: "Email", meeting: "Schůzka", stage: "Fáze",
};

export default async function DashboardPage() {
  if (!isAuthed()) redirect("/login");

  let leads: Lead[];
  let buckets;
  let activity: ActivityItem[];
  try {
    [leads, buckets, activity] = await Promise.all([allLeads(), followUps(), recentActivity(8)]);
  } catch (err) {
    return (
      <div className="card mx-auto max-w-2xl p-6">
        <h1 className="text-lg font-bold">Databáze není připravená</h1>
        <p className="mt-2 text-sm text-slate-600">Spusť <code>supabase/schema.sql</code> a nastav env. Viz README.</p>
        <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs text-red-300">
          {err instanceof Error ? err.message : String(err)}
        </pre>
      </div>
    );
  }

  const total = leads.length;
  const byStage: Record<string, number> = {};
  for (const s of STAGES) byStage[s.key] = 0;
  for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const contactedWeek = leads.filter((l) => l.last_contacted_at && new Date(l.last_contacted_at).getTime() >= weekAgo).length;

  const klienti = byStage["klient"] ?? 0;
  const conversion = total > 0 ? Math.round((klienti / total) * 100) : 0;
  const novych = byStage["nova"] ?? 0;
  const dnesCount = buckets.today.length;
  const poTerminu = buckets.overdue.length;
  const maxStage = Math.max(1, ...STAGES.map((s) => byStage[s.key] ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Přehled</h1>

      {/* Statistické karty */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Leady celkem" value={total} href="/" />
        <Stat label="Nové k oslovení" value={novych} href="/outreach" accent="#0ea5e9" />
        <Stat
          label="Follow-up dnes"
          value={dnesCount}
          sub={poTerminu > 0 ? `+ ${poTerminu} po termínu` : undefined}
          subTone="#dc2626"
          href="/followup"
          accent="#f59e0b"
        />
        <Stat label="Klienti" value={klienti} sub={`${conversion}% konverze`} href="/" accent="#16a34a" />
      </div>

      {/* Pipeline rozpad */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Pipeline</h2>
          <span className="text-xs text-slate-400">kontaktováno za 7 dní: <strong>{contactedWeek}</strong></span>
        </div>
        <div className="space-y-2">
          {STAGES.map((s) => {
            const n = byStage[s.key] ?? 0;
            return (
              <Link key={s.key} href="/" className="flex items-center gap-3 text-sm hover:opacity-80">
                <span className="w-28 shrink-0 text-slate-600">{s.label}</span>
                <span className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <span className="block h-full rounded" style={{ width: `${(n / maxStage) * 100}%`, background: s.color, minWidth: n > 0 ? "6px" : "0" }} />
                </span>
                <span className="w-8 shrink-0 text-right font-semibold">{n}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* K vyřízení dnes */}
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">K vyřízení dnes</h2>
            <Link href="/followup" className="text-xs text-sky-600 hover:underline">vše →</Link>
          </div>
          {buckets.overdue.length + buckets.today.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Nic naplánovaného. 🎉</p>
          ) : (
            <ul className="space-y-1.5">
              {[...buckets.overdue, ...buckets.today].slice(0, 8).map((l) => {
                const overdue = l.next_action_at && new Date(l.next_action_at) < new Date(new Date().toDateString());
                return (
                  <li key={l.id}>
                    <Link href={`/leads/${l.id}`} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageMeta(l.stage).color }} />
                      <span className="truncate">{l.company_name}</span>
                      {overdue && <span className="ml-auto shrink-0 text-xs font-semibold text-red-600">po termínu</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Poslední aktivita */}
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-bold">Poslední aktivita</h2>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Zatím žádná aktivita.</p>
          ) : (
            <ul className="space-y-2.5">
              {activity.map((a) => (
                <li key={a.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <Link href={`/leads/${a.lead_id}`} className="font-semibold hover:underline">{a.company_name}</Link>
                  <span className="ml-2 text-xs text-slate-400">
                    {KIND_LABEL[a.kind] ?? a.kind} · {new Date(a.created_at).toLocaleDateString("cs-CZ")}
                  </span>
                  <p className="truncate text-slate-600">{a.body.replace(/\n/g, " ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label, value, sub, subTone, href, accent,
}: {
  label: string;
  value: number;
  sub?: string;
  subTone?: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link href={href} className="card p-4 transition hover:shadow-md">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold" style={{ color: accent ?? "#0f172a" }}>{value}</div>
      {sub && <div className="text-xs font-medium" style={{ color: subTone ?? "#64748b" }}>{sub}</div>}
    </Link>
  );
}
