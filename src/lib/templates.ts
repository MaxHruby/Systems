import { supabaseAdmin } from "@/lib/supabase";
import type { Template } from "@/lib/types";

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabaseAdmin()
    .from("templates")
    .select("*")
    .order("sort", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Template[];
}

export async function updateTemplate(
  id: string,
  patch: { name?: string; subject?: string | null; body?: string }
): Promise<Template> {
  const clean: Record<string, unknown> = {};
  if ("name" in patch) clean.name = patch.name;
  if ("subject" in patch) clean.subject = patch.subject;
  if ("body" in patch) clean.body = patch.body;
  const { data, error } = await supabaseAdmin()
    .from("templates")
    .update(clean)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Template;
}

export const CHANNELS: Record<string, string> = {
  linkedin: "LinkedIn",
  email: "Cold email",
  phone: "Telefon",
};
