import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { allLeads } from "@/lib/leads";
import { stageMeta } from "@/lib/stages";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const leads = await allLeads();

  const header = [
    "Firma", "Kontakt", "Telefon", "Email", "Web", "Adresa", "Region",
    "Obor", "Fáze", "Zdroj", "Další akce", "Vytvořeno",
  ];
  const rows = leads.map((l) =>
    [
      l.company_name, l.contact_name, l.phone, l.email, l.website, l.address,
      l.region, l.category, stageMeta(l.stage).label, l.source,
      l.next_action_at, l.created_at,
    ].map(csvCell).join(",")
  );
  // BOM kvůli diakritice v Excelu
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leady-systems.csv"`,
    },
  });
}
