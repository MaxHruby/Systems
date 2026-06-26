import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deleteLead, updateLead } from "@/lib/leads";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const patch = await req.json().catch(() => ({}));
  const lead = await updateLead(params.id, patch);
  return NextResponse.json({ lead });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  await deleteLead(params.id);
  return NextResponse.json({ ok: true });
}
