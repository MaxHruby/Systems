import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { allLeads } from "@/lib/leads";
import { listTemplates } from "@/lib/templates";
import { emailEnabled, fromAddress, fromName } from "@/lib/email";
import { OutreachClient } from "@/components/OutreachClient";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  if (!isAuthed()) redirect("/login");

  let leads, templates;
  try {
    [leads, templates] = await Promise.all([allLeads(), listTemplates()]);
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

  const withEmail = leads.filter((l) => l.email && l.email.includes("@"));
  const emailTemplates = templates.filter((t) => t.channel === "email");
  const signature = (process.env.OUTREACH_SIGNATURE || fromName() || "").trim();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Načítám…</div>}>
      <OutreachClient
        leads={withEmail}
        templates={emailTemplates}
        signature={signature}
        senderName={fromName()}
        fromAddr={fromAddress()}
        emailReady={emailEnabled()}
      />
    </Suspense>
  );
}
