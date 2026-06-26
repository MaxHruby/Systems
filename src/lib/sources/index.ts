import type { FoundCompany } from "@/lib/types";
import { searchOverpass } from "@/lib/sources/overpass";
import { engineEnabled, searchEngine } from "@/lib/sources/engine";

export type SourceKey = "overpass" | "engine";

export type SearchParams = {
  source: SourceKey;
  region: string;
  trade: string;
  query?: string; // volný text (využije engine)
  limit: number;
};

export async function searchCompanies(p: SearchParams): Promise<FoundCompany[]> {
  if (p.source === "engine") {
    if (!engineEnabled()) {
      throw new Error(
        "Engine není nakonfigurovaný. Doplň ENGINE_API_KEY do prostředí, nebo použij free zdroj (Firmy z mapy)."
      );
    }
    return searchEngine(p.region, p.trade, p.query ?? "", p.limit);
  }
  return searchOverpass(p.region, p.trade, p.limit);
}

export function availableSources(): { key: SourceKey; label: string; enabled: boolean }[] {
  return [
    { key: "overpass", label: "Firmy z mapy (zdarma)", enabled: true },
    { key: "engine", label: "Engine — Google Maps", enabled: engineEnabled() },
  ];
}
