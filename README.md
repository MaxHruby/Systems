# Systems CRM

Akviziční CRM pro **Systémy & Automatizace** — sledování leadů (stavební firmy / řemeslníci)
v prodejní pipeline + hledání firem podle regionu a oboru.

- **Pipeline**: Nová → Kontaktován → Audit domluven → Audit proběhl → Nabídka → Klient / Ztracený
- **Najít firmy**: vyhledá firmy a naimportuje je rovnou jako leady
  - **Firmy z mapy (zdarma)** — OpenStreetMap / Overpass, bez API klíče
  - **Engine — Google Maps** (volitelně) — přes `engine.zaigla.com`, aktivní po doplnění `ENGINE_API_KEY`
- **Detail leadu**: kontakty (klikací tel/email), fáze, časová osa aktivit; změna fáze se loguje sama
- **Follow-up**: termín další akce u leadu + přehled „Po termínu / Dnes / Tento týden" s rychlým přeplánováním
- **Šablony**: LinkedIn zpráva, cold email sekvence (3 e-maily), telefonní/audit skript — editovatelné, s kopírováním
- **Export CSV**: stáhne všechny leady (Excel-friendly, s diakritikou)

Stack: Next.js 14 (App Router) · Supabase (Postgres) · Tailwind · nasazení na Vercel.

---

## 1. Lokální spuštění

```bash
npm install
cp .env.example .env.local   # a doplň hodnoty (viz níže)
npm run dev                  # http://localhost:3000
```

## 2. Supabase (databáze)

1. Založ projekt na [supabase.com](https://supabase.com) (free tier stačí).
2. **SQL Editor → New query** → vlož obsah [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. **Project Settings → API** → zkopíruj:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (TAJNÉ — nikdy do gitu / do prohlížeče)

## 3. Proměnné prostředí

Viz [`.env.example`](.env.example). Minimum k běhu = `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
Doporučeně nastav `APP_PASSWORD` (jinak appka běží bez přihlášení).

## 4. Hledání firem

- **Zdarma (výchozí)**: zadej region (přesný název města/kraje, např. `Praha`, `Brno`,
  `Jihomoravský kraj`) a obor. Data jdou z OpenStreetMap — nejlepší pokrytí ve městech a
  u firem s vyplněným kontaktem.
- **Engine**: doplň `ENGINE_API_KEY` → ve formuláři přibude zdroj „Engine — Google Maps"
  s lepším pokrytím a volným textovým dotazem.

## 5. Nasazení na Vercel

1. Push do GitHubu (repo `MaxHruby/Systems`).
2. Na [vercel.com](https://vercel.com) → **Add New → Project** → import repa.
3. Do **Environment Variables** zkopíruj vše z `.env.local`.
4. Deploy. Hotovo.

---

## Struktura

```
src/
  app/
    page.tsx              Pipeline (kanban nástěnka)
    find/                 Hledání firem
    leads/[id]/           Detail leadu
    login/                Přihlášení
    api/                  REST: leads, notes, find, import, auth
  lib/
    sources/              Zdroje hledání (overpass = free, engine = volitelný)
    leads.ts              Datová vrstva (Supabase)
    stages.ts, trades.ts  Číselníky fází a oborů
supabase/schema.sql       Databázové schéma
```
