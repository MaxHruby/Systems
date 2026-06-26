import { supabaseAdmin } from "@/lib/supabase";
import type { FoundCompany, Lead, LeadNote } from "@/lib/types";
import { isStage, stageMeta } from "@/lib/stages";

const stageLabel = (key: string) => stageMeta(key).label;

export async function listLeads(filter?: { stage?: string; region?: string; q?: string }): Promise<Lead[]> {
  let query = supabaseAdmin().from("leads").select("*").order("created_at", { ascending: false });
  if (filter?.stage && isStage(filter.stage)) query = query.eq("stage", filter.stage);
  if (filter?.region) query = query.ilike("region", `%${filter.region}%`);
  if (filter?.q) query = query.ilike("company_name", `%${filter.q}%`);
  const { data, error } = await query.limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export async function getLead(id: string): Promise<Lead | null> {
  const { data, error } = await supabaseAdmin().from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

export async function getNotes(leadId: string): Promise<LeadNote[]> {
  const { data, error } = await supabaseAdmin()
    .from("lead_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadNote[];
}

export async function createLead(input: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .insert({
      company_name: input.company_name ?? "Nová firma",
      contact_name: input.contact_name ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      address: input.address ?? null,
      region: input.region ?? null,
      category: input.category ?? null,
      source: input.source ?? "manual",
      maps_url: input.maps_url ?? null,
      stage: input.stage && isStage(input.stage) ? input.stage : "nova",
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead> {
  const clean: Record<string, unknown> = {};
  const fields: (keyof Lead)[] = [
    "company_name", "contact_name", "phone", "email", "website", "address",
    "region", "category", "stage", "score", "notes", "last_contacted_at", "next_action_at",
  ];
  for (const f of fields) {
    if (f in patch) clean[f] = patch[f];
  }
  if ("stage" in clean && typeof clean.stage === "string" && !isStage(clean.stage)) {
    delete clean.stage;
  }

  // Při změně fáze zapiš automaticky záznam do časové osy.
  let stageChangedTo: string | null = null;
  if (typeof clean.stage === "string") {
    const { data: current } = await supabaseAdmin().from("leads").select("stage").eq("id", id).maybeSingle();
    if (current && (current as { stage: string }).stage !== clean.stage) {
      stageChangedTo = clean.stage as string;
    }
  }

  const { data, error } = await supabaseAdmin().from("leads").update(clean).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);

  if (stageChangedTo) {
    await addNote(id, `Přesun do fáze: ${stageLabel(stageChangedTo)}`, "stage").catch(() => {});
  }
  return data as Lead;
}

export async function addNote(leadId: string, body: string, kind = "note"): Promise<LeadNote> {
  const { data, error } = await supabaseAdmin()
    .from("lead_notes")
    .insert({ lead_id: leadId, body, kind })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as LeadNote;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await supabaseAdmin().from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Hromadný import nalezených firem. Dedup přes (source, external_id). Vrací počet vložených. */
export async function importCompanies(companies: FoundCompany[]): Promise<{ inserted: number; skipped: number }> {
  if (companies.length === 0) return { inserted: 0, skipped: 0 };
  const rows = companies.map((c) => ({
    company_name: c.company_name,
    phone: c.phone,
    email: c.email,
    website: c.website,
    address: c.address,
    region: c.region,
    category: c.category,
    source: c.source,
    maps_url: c.maps_url,
    external_id: c.external_id,
    stage: "nova",
  }));

  // upsert s ignorováním konfliktů na (source, external_id)
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .upsert(rows, { onConflict: "source,external_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  const inserted = data?.length ?? 0;
  return { inserted, skipped: companies.length - inserted };
}

// Leady s naplánovanou akcí, rozdělené na po termínu / dnes / tento týden / později.
export type FollowUpBuckets = {
  overdue: Lead[];
  today: Lead[];
  thisWeek: Lead[];
  later: Lead[];
};

const OPEN_STAGES = ["nova", "kontaktovan", "audit_domluven", "audit_probehl", "nabidka"];

export async function followUps(): Promise<FollowUpBuckets> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .not("next_action_at", "is", null)
    .in("stage", OPEN_STAGES)
    .order("next_action_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error(error.message);

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);
  const endWeek = new Date(startToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  const buckets: FollowUpBuckets = { overdue: [], today: [], thisWeek: [], later: [] };
  for (const row of (data ?? []) as Lead[]) {
    const t = row.next_action_at ? new Date(row.next_action_at) : null;
    if (!t) continue;
    if (t < startToday) buckets.overdue.push(row);
    else if (t < endToday) buckets.today.push(row);
    else if (t < endWeek) buckets.thisWeek.push(row);
    else buckets.later.push(row);
  }
  return buckets;
}

export async function allLeads(): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

export type ActivityItem = {
  id: string;
  body: string;
  kind: string;
  created_at: string;
  lead_id: string;
  company_name: string;
};

export async function recentActivity(limit = 8): Promise<ActivityItem[]> {
  const { data, error } = await supabaseAdmin()
    .from("lead_notes")
    .select("id, body, kind, created_at, lead_id, leads(company_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    body: row.body,
    kind: row.kind,
    created_at: row.created_at,
    lead_id: row.lead_id,
    company_name: row.leads?.company_name ?? "—",
  }));
}

export async function stats(): Promise<{ total: number; byStage: Record<string, number> }> {
  const { data, error } = await supabaseAdmin().from("leads").select("stage");
  if (error) throw new Error(error.message);
  const byStage: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = (row as { stage: string }).stage;
    byStage[s] = (byStage[s] ?? 0) + 1;
  }
  return { total: data?.length ?? 0, byStage };
}
