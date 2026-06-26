import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { followUps } from "@/lib/leads";
import { FollowUpList } from "@/components/FollowUpList";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  if (!isAuthed()) redirect("/login");
  let buckets;
  try {
    buckets = await followUps();
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
  return <FollowUpList initial={buckets} />;
}
