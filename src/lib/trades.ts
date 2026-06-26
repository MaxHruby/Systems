// Řemesla / cílové obory a jejich mapování na OpenStreetMap tagy (craft=*, shop=*).
// `osm` = seznam "klíč=hodnota" dvojic, které se sloučí do Overpass dotazu.
export const TRADES = [
  { key: "vse", label: "Vše (stavební obory)", osm: [
      "craft=plumber", "craft=electrician", "craft=hvac", "craft=builder",
      "craft=carpenter", "craft=roofer", "craft=painter", "craft=tiler",
      "craft=plasterer", "craft=stonemason", "craft=glaziery",
    ] },
  { key: "instalater", label: "Instalatér", osm: ["craft=plumber"] },
  { key: "elektrikar", label: "Elektrikář", osm: ["craft=electrician"] },
  { key: "topenar", label: "Topenář / VZT", osm: ["craft=hvac", "craft=plumber"] },
  { key: "stavebni", label: "Stavební firma", osm: ["craft=builder"] },
  { key: "tesar", label: "Tesař", osm: ["craft=carpenter"] },
  { key: "pokryvac", label: "Pokrývač", osm: ["craft=roofer"] },
  { key: "malir", label: "Malíř / fasády", osm: ["craft=painter"] },
  { key: "obkladac", label: "Obkladač", osm: ["craft=tiler"] },
  { key: "zednik", label: "Zedník / omítkář", osm: ["craft=plasterer", "craft=stonemason"] },
] as const;

export type TradeKey = (typeof TRADES)[number]["key"];

export function tradeOsmTags(key: string): string[] {
  return [...(TRADES.find((t) => t.key === key) ?? TRADES[0]).osm];
}

export function tradeLabel(key: string): string {
  return (TRADES.find((t) => t.key === key) ?? TRADES[0]).label;
}
