import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { listLeads, stats } from "@/lib/leads";
import { Board } from "@/components/Board";
import { STAGES } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!isAuthed()) redirect("/login");

  let leads;
  let s;
  try {
    [leads, s] = await Promise.all([listLeads(), stats()]);
  } catch (err) {
    return <SetupNotice error={err instanceof Error ? err.message : String(err)} />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Pipeline</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-200 px-2.5 py-1 font-semibold">Celkem {s.total}</span>
          {STAGES.map((st) => (
            <span key={st.key} className="rounded-full px-2.5 py-1 font-medium text-white" style={{ background: st.color }}>
              {st.label} {s.byStage[st.key] ?? 0}
            </span>
          ))}
        </div>
      </div>
      <Board initial={leads} />
    </div>
  );
}

function SetupNotice({ error }: { error: string }) {
  return (
    <div className="card mx-auto max-w-2xl p-6">
      <h1 className="text-lg font-bold">Ještě potřebuje nastavit databázi</h1>
      <p className="mt-2 text-sm text-slate-600">
        Aplikace se nemůže připojit k Supabase nebo chybí tabulky. Postup je v <code>README.md</code>:
      </p>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Založ projekt na supabase.com</li>
        <li>Spusť <code>supabase/schema.sql</code> v SQL editoru</li>
        <li>Doplň <code>SUPABASE_URL</code> a <code>SUPABASE_SERVICE_ROLE_KEY</code> do <code>.env.local</code></li>
      </ol>
      <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs text-red-300">{error}</pre>
    </div>
  );
}
