import type { FoundCompany } from "@/lib/types";
import { tradeLabel, tradeOsmTags } from "@/lib/trades";

// Free zdroj: OpenStreetMap přes Overpass API.
// Žádný API klíč, žádná platba. Pokrytí je nejlepší ve městech a u řemesel,
// která mají vyplněný kontakt (telefon/web). Pro ČR slušné.
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

type OsmElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function buildQuery(region: string, tradeKey: string, limit: number): string {
  const tags = tradeOsmTags(tradeKey);
  // area[name=...] najde administrativní oblast (město/kraj) podle názvu.
  const safeRegion = region.replace(/"/g, '\\"');
  const selectors = tags
    .map((t) => {
      const [k, v] = t.split("=");
      return `  nwr["${k}"="${v}"](area.searchArea);`;
    })
    .join("\n");

  return `[out:json][timeout:50];
area["name"="${safeRegion}"]["boundary"="administrative"]->.searchArea;
(
${selectors}
);
out center tags ${Math.max(1, Math.min(limit, 500))};`;
}

function pick(tags: Record<string, string>, keys: string[]): string | null {
  for (const k of keys) {
    if (tags[k]) return tags[k];
  }
  return null;
}

function buildAddress(tags: Record<string, string>): string | null {
  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const city = [tags["addr:postcode"], tags["addr:city"]].filter(Boolean).join(" ");
  const full = [street, city].filter(Boolean).join(", ");
  return full || null;
}

function mapElement(el: OsmElement, region: string, tradeKey: string): FoundCompany | null {
  const tags = el.tags ?? {};
  const name = tags.name || tags["operator"] || tags["brand"];
  if (!name) return null; // bez jména nemá v CRM smysl

  const coord = el.center ?? (el.lat != null && el.lon != null ? { lat: el.lat, lon: el.lon } : null);
  const maps_url = coord
    ? `https://www.google.com/maps/search/?api=1&query=${coord.lat},${coord.lon}`
    : null;

  return {
    external_id: `${el.type}/${el.id}`,
    source: "overpass",
    company_name: name,
    category: tags.craft ? tradeLabel(tradeKey) : tradeLabel(tradeKey),
    phone: pick(tags, ["contact:phone", "phone", "contact:mobile"]),
    email: pick(tags, ["contact:email", "email"]),
    website: pick(tags, ["contact:website", "website", "url"]),
    address: buildAddress(tags),
    region,
    maps_url,
  };
}

export async function searchOverpass(
  region: string,
  tradeKey: string,
  limit: number
): Promise<FoundCompany[]> {
  const query = buildQuery(region, tradeKey, limit);
  let lastErr: unknown = null;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Overpass odmítá (HTTP 406) požadavky bez identifikujícího User-Agent.
          "User-Agent": "SystemsCRM/1.0 (lead sourcing; kontakt: max.hruby.cz@gmail.com)",
        },
        body: "data=" + encodeURIComponent(query),
        cache: "no-store",
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass HTTP ${res.status}`);
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      const elements = json.elements ?? [];
      const seen = new Set<string>();
      const out: FoundCompany[] = [];
      for (const el of elements) {
        const company = mapElement(el, region, tradeKey);
        if (!company) continue;
        const dedup = (company.company_name + (company.phone ?? company.website ?? "")).toLowerCase();
        if (seen.has(dedup)) continue;
        seen.add(dedup);
        out.push(company);
        if (out.length >= limit) break;
      }
      return out;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `Hledání přes OpenStreetMap selhalo. Zkus jiný region (např. "Praha", "Brno") nebo to zopakuj za chvíli. Detail: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}
