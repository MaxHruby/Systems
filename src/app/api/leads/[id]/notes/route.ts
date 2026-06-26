import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { addNote } from "@/lib/leads";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const { body, kind } = (await req.json().catch(() => ({}))) as { body?: string; kind?: string };
  if (!body || !body.trim()) {
    return NextResponse.json({ error: "Prázdná poznámka." }, { status: 400 });
  }
  const note = await addNote(params.id, body.trim(), kind ?? "note");
  return NextResponse.json({ note });
}
