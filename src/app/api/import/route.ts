import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { importCompanies } from "@/lib/leads";
import type { FoundCompany } from "@/lib/types";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const { companies } = (await req.json().catch(() => ({}))) as { companies?: FoundCompany[] };
  if (!Array.isArray(companies) || companies.length === 0) {
    return NextResponse.json({ error: "Nic k importu." }, { status: 400 });
  }
  const result = await importCompanies(companies);
  return NextResponse.json(result);
}
