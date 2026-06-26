import nodemailer from "nodemailer";
import type { Lead } from "@/lib/types";

// Odesílání přes SMTP (typicky Gmail App Password). Maily chodí z reálné
// adresy uživatele, odpovědi se vrací do jeho schránky.

export function emailEnabled(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function fromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "";
}

export function fromName(): string {
  return process.env.SMTP_FROM_NAME || "";
}

let cachedTx: nodemailer.Transporter | null = null;

function transport(): nodemailer.Transporter {
  if (cachedTx) return cachedTx;
  const port = Number(process.env.SMTP_PORT || 465);
  cachedTx = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // Pool + rate-limit: u hromadného odeslání posílej max ~1 mail/1,2 s,
    // ať to Gmail nebere jako spam dávku.
    pool: true,
    maxConnections: 1,
    rateDelta: 1200,
    rateLimit: 1,
  });
  return cachedTx;
}

export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<void> {
  if (!emailEnabled()) {
    throw new Error(
      "Email není napojený. Nastav SMTP_HOST, SMTP_USER, SMTP_PASS (a SMTP_FROM_NAME) v prostředí. Postup je v README."
    );
  }
  const name = fromName();
  const addr = fromAddress();
  const from = name ? `"${name}" <${addr}>` : addr;

  await transport().sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    replyTo: addr,
  });
}

// Nahrazení zástupných značek v šabloně podle leadu.
export function renderTemplate(body: string, lead: Lead): string {
  const jmeno = (lead.contact_name || "").trim();
  const firma = (lead.company_name || "").trim();
  const podpis = (process.env.OUTREACH_SIGNATURE || fromName() || "").trim();
  const mojeJmeno = (fromName() || "").trim();

  let out = body
    .replaceAll("{jmeno}", jmeno)
    .replaceAll("{firma}", firma)
    .replaceAll("{podpis}", podpis)
    .replaceAll("{moje_jmeno}", mojeJmeno);

  // Když není jméno kontaktu, ať nezůstane "Dobrý den ," nebo dvojité mezery.
  out = out.replace(/Dobr(ý|y) den\s+,/g, "Dobrý den,").replace(/[ \t]{2,}/g, " ");
  return out;
}
