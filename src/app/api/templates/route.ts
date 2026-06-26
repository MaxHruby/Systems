import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { listTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const templates = await listTemplates();
  return NextResponse.json({ templates });
}
