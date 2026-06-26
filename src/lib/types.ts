export type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  category: string | null;
  source: string;
  maps_url: string | null;
  external_id: string | null;
  stage: string;
  score: number | null;
  notes: string | null;
  last_contacted_at: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadNote = {
  id: string;
  lead_id: string;
  body: string;
  kind: string;
  created_at: string;
};

export type Template = {
  id: string;
  slug: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  sort: number;
  updated_at: string;
};

// Jednotný tvar firmy vrácený z libovolného zdroje hledání (Overpass, engine…).
export type FoundCompany = {
  external_id: string;
  source: string;
  company_name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  region: string | null;
  maps_url: string | null;
};
