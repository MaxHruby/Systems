// Fáze akviziční pipeline. Pořadí = pořadí sloupců na nástěnce.
export const STAGES = [
  { key: "nova", label: "Nová", color: "#64748b" },
  { key: "kontaktovan", label: "Kontaktován", color: "#0ea5e9" },
  { key: "audit_domluven", label: "Audit domluven", color: "#6366f1" },
  { key: "audit_probehl", label: "Audit proběhl", color: "#a855f7" },
  { key: "nabidka", label: "Nabídka", color: "#f59e0b" },
  { key: "klient", label: "Klient", color: "#16a34a" },
  { key: "ztraceny", label: "Ztracený", color: "#dc2626" },
] as const;

export type StageKey = (typeof STAGES)[number]["key"];

export const STAGE_KEYS = STAGES.map((s) => s.key) as StageKey[];

export function stageMeta(key: string) {
  return STAGES.find((s) => s.key === key) ?? STAGES[0];
}

export function isStage(value: string): value is StageKey {
  return STAGE_KEYS.includes(value as StageKey);
}
