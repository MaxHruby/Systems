import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import { availableSources } from "@/lib/sources";
import { FindClient } from "@/components/FindClient";

export const dynamic = "force-dynamic";

export default function FindPage() {
  if (!isAuthed()) redirect("/login");
  return <FindClient sources={availableSources()} />;
}
