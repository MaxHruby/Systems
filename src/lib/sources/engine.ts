import type { FoundCompany } from "@/lib/types";
import { tradeLabel } from "@/lib/trades";

// Volitelný zdroj: hostovaný engine (engine.zaigla.com) — Google Maps přes Apify.
// Aktivní jen když je nastaven ENGINE_API_KEY. Flow: vytvoř job → poll status → stáhni leady.

type EngineConfig = {
  baseUrl: string;
  apiKey: string;
  projectId: string;
  source: string;
  searchPath: string;
  statusPath: string;
  resultsPath: string;
  pollIntervalMs: number;
  maxWaitMs: number;
  pageLimit: number;
};

export function engineEnabled(): boolean {
  return !!process.env.ENGINE_API_KEY;
}

function cfg(): EngineConfig {
  return {
    baseUrl: process.env.ENGINE_API_BASE_URL ?? "https://engine.zaigla.com",
    apiKey: process.env.ENGINE_API_KEY ?? "",
    projectId: process.env.ENGINE_PROJECT_ID ?? "systems",
    source: process.env.ENGINE_SOURCING_SOURCE ?? "apify_google_maps",
    searchPath: process.env.ENGINE_SOURCING_SEARCH_PATH ?? "/api/v1/lead-sourcing/search",
    statusPath: process.env.ENGINE_SOURCING_STATUS_PATH ?? "/api/v1/sourcing/jobs/{jobId}",
    resultsPath: process.env.ENGINE_SOURCING_RESULTS_PATH ?? "/api/v1/sourcing/jobs/{jobId}/leads",
    pollIntervalMs: Number(process.env.ENGINE_SOURCING_POLL_INTERVAL_MS ?? 3000),
    maxWaitMs: Number(process.env.ENGINE_SOURCING_MAX_WAIT_MS ?? 120000),
    pageLimit: Number(process.env.ENGINE_SOURCING_PAGE_LIMIT ?? 20),
  };
}

function headers(c: EngineConfig): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${c.apiKey}`,
    "X-Project-Id": c.projectId,
  };
}

const DONE = new Set(["completed", "complete", "done", "succeeded", "success"]);
const FAILED = new Set(["failed", "error", "errored", "cancelled", "canceled"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function searchEngine(
  region: string,
  tradeKey: string,
  query: string,
  limit: number
): Promise<FoundCompany[]> {
  const c = cfg();
  const q = [query, region].filter(Boolean).join(" ").trim() || tradeKey;

  // 1) vytvoř job
  const createRes = await fetch(c.baseUrl + c.searchPath, {
    method: "POST",
    headers: headers(c),
    body: JSON.stringify({ query: q, projectId: c.projectId, limit, source: c.source }),
    cache: "no-store",
  });
  if (!createRes.ok) throw new Error(`Engine search HTTP ${createRes.status}`);
  const job = (await createRes.json()) as { jobId?: string; data?: { jobId?: string } };
  const jobId = job.jobId ?? job.data?.jobId;
  if (!jobId) throw new Error("Engine nevrátil jobId.");

  // 2) poll
  const deadline = Date.now() + c.maxWaitMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const statusRes = await fetch(c.baseUrl + c.statusPath.replace("{jobId}", encodeURIComponent(jobId)), {
      headers: headers(c),
      cache: "no-store",
    });
    const sj = (await statusRes.json()) as { status?: string; data?: { status?: string } };
    const status = String(sj.status ?? sj.data?.status ?? "").toLowerCase();
    if (DONE.has(status)) break;
    if (FAILED.has(status)) throw new Error(`Engine job selhal: ${status}`);
    if (Date.now() > deadline) throw new Error("Engine job nestihl dokončit (timeout).");
    await sleep(c.pollIntervalMs);
  }

  // 3) stáhni leady (stránkovaně)
  const base = c.baseUrl + c.resultsPath.replace("{jobId}", encodeURIComponent(jobId));
  const all: any[] = [];
  let page = 1;
  while (page <= 1000 && all.length < limit) {
    const sep = base.includes("?") ? "&" : "?";
    const res = await fetch(`${base}${sep}page=${page}&limit=${c.pageLimit}`, {
      headers: headers(c),
      cache: "no-store",
    });
    const json = (await res.json()) as { data?: { leads?: any[]; total?: number } };
    const leads = json.data?.leads ?? [];
    all.push(...leads);
    const total = typeof json.data?.total === "number" ? json.data.total : all.length;
    if (leads.length === 0 || all.length >= total) break;
    page += 1;
  }

  return all.slice(0, limit).map((l) => mapLead(l, region, tradeKey));
}

function mapLead(l: any, region: string, tradeKey: string): FoundCompany {
  return {
    external_id: String(l.id ?? l.place_id ?? l.website ?? l.company_name ?? Math.random()),
    source: "engine",
    company_name: (l.company_name ?? l.name ?? "").trim() || "Neznámá firma",
    category: l.category ?? tradeLabel(tradeKey),
    phone: l.phone ?? null,
    email: l.email ?? null,
    website: l.website ?? null,
    address: l.address ?? null,
    region: region || l.country || null,
    maps_url: l.google_maps_url ?? null,
  };
}
