import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { addNote, getLead, updateLead } from "@/lib/leads";
import { renderTemplate, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PER_BATCH = 25;

type Result = { id: string; name: string; status: "sent" | "skipped" | "failed"; reason?: string };

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { leadIds, subject, body } = (await req.json().catch(() => ({}))) as {
    leadIds?: string[];
    subject?: string;
    body?: string;
  };

  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "Nevybrán žádný lead." }, { status: 400 });
  }
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Vyplň předmět i text." }, { status: 400 });
  }

  const batch = leadIds.slice(0, MAX_PER_BATCH);
  const overCap = leadIds.length - batch.length;
  const results: Result[] = [];

  for (const id of batch) {
    const lead = await getLead(id);
    if (!lead) {
      results.push({ id, name: id, status: "skipped", reason: "nenalezen" });
      continue;
    }
    if (!lead.email || !lead.email.includes("@")) {
      results.push({ id, name: lead.company_name, status: "skipped", reason: "bez emailu" });
      continue;
    }

    try {
      await sendEmail({
        to: lead.email.trim(),
        subject: renderTemplate(subject, lead),
        text: renderTemplate(body, lead),
      });
    } catch (err) {
      results.push({
        id,
        name: lead.company_name,
        status: "failed",
        reason: err instanceof Error ? err.message : "chyba odeslání",
      });
      continue;
    }

    // Log + posun pipeline + follow-up za 3 dny.
    await addNote(id, `✉️ Odeslán email (hromadně) — „${renderTemplate(subject, lead)}"`, "email").catch(() => {});
    const followUp = new Date();
    followUp.setDate(followUp.getDate() + 3);
    const patch: Record<string, unknown> = {
      last_contacted_at: new Date().toISOString(),
      next_action_at: followUp.toISOString(),
    };
    if (lead.stage === "nova") patch.stage = "kontaktovan";
    await updateLead(id, patch).catch(() => {});

    results.push({ id, name: lead.company_name, status: "sent" });
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return NextResponse.json({ results, sent, failed, skipped, overCap, cap: MAX_PER_BATCH });
}
