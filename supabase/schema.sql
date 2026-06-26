-- =====================================================================
--  Systems CRM — databázové schéma
--  Spusť celé v Supabase: Dashboard → SQL Editor → New query → Run
--  Idempotentní: dá se pustit opakovaně bez chyby.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  LEADS — firmy/kontakty v akviziční pipeline
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null,
  contact_name    text,
  phone           text,
  email           text,
  website         text,
  address         text,
  region          text,                       -- kraj/město pro filtrování
  category        text,                       -- řemeslo: instalatér, elektrikář, ...
  source          text not null default 'manual',  -- manual | overpass | engine | firmycz
  maps_url        text,
  external_id     text,                        -- id z externího zdroje (dedup)
  stage           text not null default 'nova',
  score           int,                         -- volitelné: ruční priorita 0-100
  notes           text,                        -- rychlá souhrnná poznámka na kartě
  last_contacted_at timestamptz,
  next_action_at  timestamptz,                 -- kdy znovu oslovit / follow-up
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Dedup: stejná firma ze stejného zdroje se nenaimportuje dvakrát.
-- Plný (nečástečný) unikátní index — musí být plný, aby fungoval upsert
-- ON CONFLICT (source, external_id). Ruční leady mají external_id = NULL a
-- ty jsou v Postgresu brané jako vzájemně různé, takže jich může být víc.
drop index if exists public.leads_source_external_uidx;
create unique index if not exists leads_source_external_uidx
  on public.leads (source, external_id);

create index if not exists leads_stage_idx   on public.leads (stage);
create index if not exists leads_region_idx  on public.leads (region);
create index if not exists leads_created_idx on public.leads (created_at desc);

-- ---------------------------------------------------------------------
--  LEAD_NOTES — časová osa poznámek / aktivit u leadu
-- ---------------------------------------------------------------------
create table if not exists public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  body        text not null,
  kind        text not null default 'note',   -- note | call | email | meeting | stage
  created_at  timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------------
--  updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
--  TEMPLATES — akviziční šablony (LinkedIn / cold email / telefon)
-- ---------------------------------------------------------------------
create table if not exists public.templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- stabilní klíč pro seed
  channel     text not null,                   -- linkedin | email | phone
  name        text not null,
  subject     text,                            -- jen pro email
  body        text not null,
  sort        int  not null default 0,
  updated_at  timestamptz not null default now()
);

drop trigger if exists templates_set_updated_at on public.templates;
create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- Seed startovních šablon. ON CONFLICT (slug) DO NOTHING => bezpečné při
-- opakovaném spuštění a nepřepíše tvoje úpravy.
insert into public.templates (slug, channel, name, subject, body, sort) values
(
  'linkedin-cold', 'linkedin', 'LinkedIn — první zpráva majiteli', null,
$tpl$Dobrý den {jmeno},

koukám, že vedete {firma} — řemeslo/stavba je teď slušný nářez.

Spíš ze zvědavosti: jak u vás teď vzniká cesta od poptávky k hotové zakázce? Myslím ten kolotoč kolem toho — kdo drží poptávky, v čem se sleduje stav, jak se to fakturuje.

Ptám se proto, že u firem vaší velikosti (10–50 lidí) tohle bývá největší žrout času. Dělám s tím u stavebních part pořádek.

Nechci nic tlačit — zajímá mě, jak to máte vy.$tpl$,
  1
),
(
  'email-1', 'email', 'Cold email 1/3 — otázka na proces', 'rychlá otázka k zakázkám',
$tpl$Dobrý den {jmeno},

nebudu chodit kolem horké kaše. Jak u vás teď funguje cesta od poptávky k hotové zakázce — kde se poptávky sbíhají, kdo hlídá stav a jak z toho padá faktura?

U stavebních firem vaší velikosti je to skoro vždycky kombinace papírů, telefonů a hlavy jednoho člověka. Funguje to do chvíle, než to nefunguje.

Dělám na to firmám systém, který tenhle nepořádek srovná. Než ale cokoli nabízím, rád se podívám, jak to máte u vás — zdarma a nezávazně.

Dáte mi 15 minut příští týden?

{podpis}$tpl$,
  2
),
(
  'email-2', 'email', 'Cold email 2/3 — follow-up (+3 dny)', 'ještě k těm zakázkám',
$tpl$Dobrý den {jmeno},

posílám ještě jednou — vím, jak to v sezóně chodí.

Konkrétně: u jedné party (instalatéři, 18 lidí) jsme dali příjem poptávek, sledování stavu zakázky a fakturaci do jednoho místa. Majitel přestal být úzké hrdlo a přestaly padat zakázky pod stůl.

Není to krabicové řešení — proto začínám auditem, ať vím, co u vás vůbec dává smysl.

Stačí odepsat „pošli termín".

{podpis}$tpl$,
  3
),
(
  'email-3', 'email', 'Cold email 3/3 — break-up (+5 dní)', 'zavírám to',
$tpl$Dobrý den {jmeno},

tohle je ode mě poslední — nechci otravovat.

Jestli vás téma „srovnat poptávky a zakázky do jednoho systému" teď nezajímá, klidně to nechte být. Kdyby to bylo aktuální za měsíc za dva, ozvěte se, audit platí pořád a je zdarma.

Ať se daří v sezóně.

{podpis}$tpl$,
  4
),
(
  'phone-audit', 'phone', 'Telefon — skript na domluvení auditu', null,
$tpl$OTEVŘENÍ
„Dobrý den, {jmeno}? Tady {moje_jmeno}. Vím, že máte sezónu, tak budu rychlý — můžu na dvě minuty?"

OTÁZKA NA PROCES (neptám se, jestli něco chtějí — ptám se, jak to dělají)
„Jak teď u vás vzniká cesta od poptávky k hotové zakázce? Kde se poptávky sbíhají a kdo hlídá, v jakém je co stavu?"

ODHALENÍ PROBLÉMU (nechám je mluvit, pak zrcadlím)
„Takže to v podstatě drží hlava jednoho člověka a papíry / excel. Co se stane, když je toho moc — propadne občas nějaká poptávka?"

NABÍDKA AUDITU (ne produktu)
„Pojďme to udělat takhle: přijdu se nezávazně podívat, jak to máte, a řeknu vám rovnou, kde ztrácíte čas a co by šlo srovnat. Zdarma, bez závazku. Hodí se vám spíš dopoledne, nebo odpoledne?"

CENU NEŘEŠÍM PO TELEFONU
„Co to stojí vyřešíme, až budu vědět, co u vás vůbec dává smysl — proto ten audit."$tpl$,
  5
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
--  RLS — přístup pouze přes server (service role). Klient nikdy nečte
--  přímo. Zapneme RLS bez policy => anon/auth nemá přístup, service role
--  RLS obchází.
-- ---------------------------------------------------------------------
alter table public.leads      enable row level security;
alter table public.lead_notes enable row level security;
alter table public.templates  enable row level security;
