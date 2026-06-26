import { cookies } from "next/headers";
import { createHash } from "crypto";

const COOKIE = "systems_auth";

function expectedToken(): string {
  const pw = process.env.APP_PASSWORD ?? "";
  // Token = hash(heslo). V cookie nikdy není heslo v plaintextu.
  return createHash("sha256").update(`systems::${pw}`).digest("hex");
}

export function passwordMatches(input: string): boolean {
  const pw = process.env.APP_PASSWORD ?? "";
  return pw.length > 0 && input === pw;
}

export function authCookieValue(): string {
  return expectedToken();
}

export const AUTH_COOKIE = COOKIE;

/** Server-side kontrola, jestli je uživatel přihlášený. */
export function isAuthed(): boolean {
  if (!process.env.APP_PASSWORD) {
    // Když není nastaveno heslo, appka je otevřená (dev pohodlí).
    return true;
  }
  const token = cookies().get(COOKIE)?.value;
  return token === expectedToken();
}
