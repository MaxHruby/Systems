import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { searchCompanies, type SourceKey } from "@/lib/sources";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    source?: SourceKey;
    region?: string;
    trade?: string;
    query?: string;
    limit?: number;
  };

  const region = (body.region ?? "").trim();
  if (!region) return NextResponse.json({ error: "Zadej region (např. Praha, Brno, Jihomoravský kraj)." }, { status: 400 });

  try {
    const companies = await searchCompanies({
      source: body.source === "engine" ? "engine" : "overpass",
      region,
      trade: body.trade ?? "vse",
      query: body.query,
      limit: Math.max(1, Math.min(body.limit ?? 50, 200)),
    });
    return NextResponse.json({ companies });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Hledání selhalo." },
      { status: 502 }
    );
  }
}
