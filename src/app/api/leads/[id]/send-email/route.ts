import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { addNote, getLead, updateLead } from "@/lib/leads";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });

  const { subject, body, to } = (await req.json().catch(() => ({}))) as {
    subject?: string;
    body?: string;
    to?: string;
  };

  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead nenalezen." }, { status: 404 });

  const recipient = (to || lead.email || "").trim();
  if (!recipient) return NextResponse.json({ error: "Lead nemá email." }, { status: 400 });
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Vyplň předmět i text." }, { status: 400 });
  }

  try {
    await sendEmail({ to: recipient, subject: subject.trim(), text: body });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Odeslání selhalo." },
      { status: 502 }
    );
  }

  // Zaloguj aktivitu + posuň pipeline + naplánuj follow-up za 3 dny.
  await addNote(params.id, `✉️ Odeslán email — „${subject.trim()}"\n\n${body}`, "email").catch(() => {});

  const followUp = new Date();
  followUp.setDate(followUp.getDate() + 3);
  const patch: Record<string, unknown> = {
    last_contacted_at: new Date().toISOString(),
    next_action_at: followUp.toISOString(),
  };
  if (lead.stage === "nova") patch.stage = "kontaktovan"; // updateLead doplní auto-poznámku o fázi
  await updateLead(params.id, patch).catch(() => {});

  return NextResponse.json({ ok: true });
}
