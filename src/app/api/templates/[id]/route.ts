import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { updateTemplate } from "@/lib/templates";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAuthed()) return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
  const patch = await req.json().catch(() => ({}));
  const template = await updateTemplate(params.id, patch);
  return NextResponse.json({ template });
}
