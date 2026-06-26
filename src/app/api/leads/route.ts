import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { createLead, listLeads } from "@/lib/leads";

export async function GET(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const leads = await listLeads({
    stage: searchParams.get("stage") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return NextResponse.json({ leads });
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const lead = await createLead(body);
  return NextResponse.json({ lead });
}
