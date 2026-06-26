import { redirect, notFound } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { getLead, getNotes } from "@/lib/leads";
import { LeadDetailClient } from "@/components/LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadPage({ params }: { params: { id: string } }) {
  if (!isAuthed()) redirect("/login");
  const lead = await getLead(params.id);
  if (!lead) notFound();
  const notes = await getNotes(params.id);
  return <LeadDetailClient lead={lead} notes={notes} />;
}
