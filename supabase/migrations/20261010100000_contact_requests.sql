-- Public landing-page requests: free-estimate quote requests and contact messages.
--
-- Visitors are not authenticated. The anon role gets no table access at all:
-- it can only call submit_contact_request(), which validates every field,
-- requires consent and throttles repeated submissions. Staff read and triage
-- requests through RLS using the existing marketing permissions.

-- ==========================================================================
-- 1. Table
-- ==========================================================================

create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('QUOTE', 'CONTACT')),
  status text not null default 'NEW' check (status in ('NEW', 'IN_PROGRESS', 'QUOTED', 'CLOSED')),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) between 6 and 30),
  message text check (message is null or char_length(message) <= 2000),
  zone_id text check (zone_id is null or char_length(zone_id) <= 40),
  zone_label text check (zone_label is null or char_length(zone_label) <= 80),
  address text check (address is null or char_length(address) <= 300),
  config_id text check (config_id is null or char_length(config_id) <= 40),
  config_label text check (config_label is null or char_length(config_label) <= 80),
  situation text check (situation is null or char_length(situation) <= 80),
  support text check (support is null or char_length(support) <= 80),
  preferred_slot text check (preferred_slot is null or char_length(preferred_slot) <= 120),
  -- Indicative range computed in the browser by @darnalux/core; informational only.
  estimate_low integer check (estimate_low is null or estimate_low >= 0),
  estimate_high integer check (estimate_high is null or estimate_high >= estimate_low),
  consent boolean not null check (consent),
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_requests_quote_fields check (
    kind <> 'QUOTE'
    or (phone is not null and zone_id is not null and address is not null and config_id is not null)
  ),
  constraint contact_requests_contact_message check (kind <> 'CONTACT' or message is not null)
);

create index contact_requests_created_idx on public.contact_requests (created_at desc);
create index contact_requests_status_idx on public.contact_requests (status, created_at desc);
create index contact_requests_email_idx on public.contact_requests (lower(email), created_at desc);

create trigger contact_requests_set_updated_at
  before update on public.contact_requests
  for each row execute function public.set_updated_at();

-- ==========================================================================
-- 2. RLS: staff only
-- ==========================================================================

alter table public.contact_requests enable row level security;

revoke all on public.contact_requests from public, anon, authenticated;
grant select on public.contact_requests to authenticated;
grant update (status, notes) on public.contact_requests to authenticated;

create policy contact_requests_select on public.contact_requests
  for select to authenticated
  using (public.has_permission('marketing.view'));

create policy contact_requests_update on public.contact_requests
  for update to authenticated
  using (public.has_permission('marketing.manage'))
  with check (public.has_permission('marketing.manage'));

-- ==========================================================================
-- 3. Public submission RPC
-- ==========================================================================

create function public.submit_contact_request(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kind text := upper(coalesce(p->>'kind', ''));
  v_name text := btrim(coalesce(p->>'full_name', ''));
  v_email text := lower(btrim(coalesce(p->>'email', '')));
  v_phone text := nullif(btrim(coalesce(p->>'phone', '')), '');
  v_message text := nullif(btrim(coalesce(p->>'message', '')), '');
  v_id uuid;
begin
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'Demande invalide.' using errcode = '22023';
  end if;
  if v_kind not in ('QUOTE', 'CONTACT') then
    raise exception 'Type de demande invalide.' using errcode = '22023';
  end if;
  if coalesce((p->>'consent')::boolean, false) is not true then
    raise exception 'Le consentement est requis pour envoyer la demande.' using errcode = '22023';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'Indiquez votre nom.' using errcode = '22023';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Adresse e-mail invalide.' using errcode = '22023';
  end if;
  if v_kind = 'QUOTE' and v_phone is null then
    raise exception 'Indiquez un numéro de téléphone.' using errcode = '22023';
  end if;
  if v_kind = 'CONTACT' and v_message is null then
    raise exception 'Écrivez votre message.' using errcode = '22023';
  end if;

  -- Light anti-abuse throttle (no client IP is available inside PostgREST RPCs).
  if (select count(*) from public.contact_requests
      where lower(email) = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Trop de demandes récentes. Réessayez plus tard.' using errcode = 'P0001';
  end if;

  insert into public.contact_requests (
    kind, full_name, email, phone, message,
    zone_id, zone_label, address, config_id, config_label,
    situation, support, preferred_slot, estimate_low, estimate_high, consent
  ) values (
    v_kind, v_name, v_email, v_phone, v_message,
    nullif(btrim(coalesce(p->>'zone_id', '')), ''),
    nullif(btrim(coalesce(p->>'zone_label', '')), ''),
    nullif(btrim(coalesce(p->>'address', '')), ''),
    nullif(btrim(coalesce(p->>'config_id', '')), ''),
    nullif(btrim(coalesce(p->>'config_label', '')), ''),
    nullif(btrim(coalesce(p->>'situation', '')), ''),
    nullif(btrim(coalesce(p->>'support', '')), ''),
    nullif(btrim(coalesce(p->>'preferred_slot', '')), ''),
    (p->>'estimate_low')::integer,
    (p->>'estimate_high')::integer,
    true
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_contact_request(jsonb) from public;
grant execute on function public.submit_contact_request(jsonb) to anon, authenticated;
