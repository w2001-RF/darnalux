-- Operations platform (SPEC-001): owners, properties, listings, guests,
-- reservations, tasks, finance, check-in/out, contracts, documents, support,
-- marketing. Every table has RLS enabled; the anon role has no table access
-- (guest check-in goes through the SECURITY DEFINER RPCs of the next migration).

create extension if not exists btree_gist with schema extensions;

-- ==========================================================================
-- 1. Owners and properties
-- ==========================================================================

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  first_name text not null check (length(btrim(first_name)) > 0),
  last_name text not null check (length(btrim(last_name)) > 0),
  email text,
  phone text,
  address text,
  city text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  internal_notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index owners_last_name_idx on public.owners (last_name);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  type text not null default 'APARTMENT'
    check (type in ('APARTMENT', 'VILLA', 'RIAD', 'STUDIO', 'HOUSE', 'ROOM', 'OTHER')),
  description text,
  address text,
  city text not null check (length(btrim(city)) > 0),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  capacity integer not null default 1 check (capacity between 1 and 999),
  bedrooms integer not null default 0 check (bedrooms between 0 and 999),
  beds integer not null default 0 check (beds between 0 and 999),
  bathrooms integer not null default 0 check (bathrooms between 0 and 999),
  amenities text[] not null default '{}',
  house_rules text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED')),
  commission_rate numeric(5, 2) not null default 20 check (commission_rate between 0 and 100),
  cover_image_path text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index properties_city_idx on public.properties (city);
create index properties_status_idx on public.properties (status);

create table public.property_owners (
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references public.owners(id) on delete restrict,
  is_primary boolean not null default false,
  share_percent numeric(5, 2) not null default 100 check (share_percent > 0 and share_percent <= 100),
  created_at timestamptz not null default now(),
  primary key (property_id, owner_id)
);

create unique index property_owners_single_primary on public.property_owners (property_id) where is_primary;
create index property_owners_owner_idx on public.property_owners (owner_id);

-- Sensitive operational data is split from properties so it can be protected
-- by its own permission (properties.access.view).
create table public.property_access (
  property_id uuid primary key references public.properties(id) on delete cascade,
  arrival_procedure text,
  departure_procedure text,
  access_instructions text,
  door_code text,
  key_location text,
  wifi_name text,
  wifi_password text,
  cleaning_procedure text,
  maintenance_procedure text,
  updated_at timestamptz not null default now()
);

create table public.property_listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  platform text not null check (platform in ('AIRBNB', 'BOOKING', 'DIRECT', 'WEBSITE', 'PHONE', 'WHATSAPP', 'OTHER')),
  external_id text,
  listing_url text check (listing_url is null or listing_url ~* '^https://'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (platform, external_id)
);

create index property_listings_property_idx on public.property_listings (property_id);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index property_images_property_idx on public.property_images (property_id, position);

-- ==========================================================================
-- 2. Guests and reservations
-- ==========================================================================

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(btrim(first_name)) > 0),
  last_name text not null check (length(btrim(last_name)) > 0),
  email text,
  phone text,
  nationality text,
  document_type text check (document_type in ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE')),
  document_number text,
  verification_status text not null default 'NOT_STARTED'
    check (verification_status in ('NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED')),
  is_blacklisted boolean not null default false,
  blacklist_reason text,
  blacklisted_at timestamptz,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_blacklisted or length(btrim(coalesce(blacklist_reason, ''))) >= 5)
);

create index guests_name_idx on public.guests (last_name, first_name);
create index guests_blacklist_idx on public.guests (is_blacklisted) where is_blacklisted;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('DL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  property_id uuid not null references public.properties(id) on delete restrict,
  guest_id uuid references public.guests(id) on delete set null,
  source text not null default 'DIRECT'
    check (source in ('AIRBNB', 'BOOKING', 'DIRECT', 'WEBSITE', 'PHONE', 'WHATSAPP', 'OTHER')),
  external_reference text,
  check_in date not null,
  check_out date not null,
  guests_count integer not null default 1 check (guests_count between 1 and 999),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'CONFIRMED', 'CHECK_IN', 'IN_PROGRESS', 'CHECK_OUT', 'COMPLETED', 'CANCELLED', 'NO_SHOW')),
  gross_amount numeric(12, 2) not null default 0 check (gross_amount >= 0),
  commission_rate numeric(5, 2) not null default 20 check (commission_rate between 0 and 100),
  platform_fees numeric(12, 2) not null default 0 check (platform_fees >= 0),
  currency text not null default 'MAD',
  smart_lock_code text,
  notes text,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in),
  check (platform_fees <= gross_amount),
  -- Double bookings are impossible: blocking stays on a property cannot overlap.
  constraint reservations_no_overlap exclude using gist (
    property_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status not in ('CANCELLED', 'NO_SHOW'))
);

create index reservations_property_dates_idx on public.reservations (property_id, check_in);
create index reservations_check_in_idx on public.reservations (check_in);
create index reservations_check_out_idx on public.reservations (check_out);
create index reservations_status_idx on public.reservations (status);
create index reservations_guest_idx on public.reservations (guest_id);

-- ==========================================================================
-- 3. Finance
-- ==========================================================================

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete set null,
  category text not null default 'OTHER'
    check (category in ('CLEANING', 'MAINTENANCE', 'SUPPLIES', 'UTILITIES', 'TAX', 'OTHER')),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  incurred_on date not null default current_date,
  charged_to_owner boolean not null default true,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index expenses_property_date_idx on public.expenses (property_id, incurred_on);

-- ==========================================================================
-- 4. Tasks and interventions
-- ==========================================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reservation_id uuid references public.reservations(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  type text not null default 'CLEANING'
    check (type in ('CLEANING', 'CHECK_IN', 'CHECK_OUT', 'MAINTENANCE', 'INSPECTION', 'REPAIR', 'SUPPLY', 'EMERGENCY')),
  title text not null check (length(btrim(title)) > 0),
  notes text,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  status text not null default 'TODO'
    check (status in ('TODO', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assignee_idx on public.tasks (assigned_to, status);
create index tasks_due_idx on public.tasks (due_at);
create index tasks_property_idx on public.tasks (property_id);
create index tasks_reservation_idx on public.tasks (reservation_id);

-- ==========================================================================
-- 5. Contracts, check-in settings, check-ins and check-outs
-- ==========================================================================

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  kind text not null default 'CUSTOM' check (kind in ('DEFAULT', 'CUSTOM')),
  body text not null check (length(btrim(body)) > 0),
  is_active boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index contract_templates_single_active on public.contract_templates (is_active) where is_active;

create table public.checkin_settings (
  singleton boolean primary key default true check (singleton),
  document_step boolean not null default true,
  selfie_step boolean not null default true,
  contract_step boolean not null default true,
  document_number_required boolean not null default false,
  welcome_message text check (welcome_message is null or length(welcome_message) <= 1000),
  updated_at timestamptz not null default now()
);

insert into public.checkin_settings (singleton) values (true);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  -- 244 random bits; this token is the only credential of the public check-in link.
  token text not null unique
    default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'REJECTED')),
  expires_at timestamptz not null default (now() + interval '60 days'),
  guest_full_name text,
  guest_email text,
  guest_phone text,
  nationality text,
  document_type text check (document_type in ('ID_CARD', 'PASSPORT', 'DRIVING_LICENSE')),
  document_number text,
  document_path text,
  selfie_path text,
  signature_path text,
  consent_given_at timestamptz,
  contract_snapshot text,
  signed_at timestamptz,
  user_agent text,
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index checkins_status_idx on public.checkins (status);

create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  condition text not null default 'GOOD' check (condition in ('GOOD', 'MINOR_ISSUES', 'DAMAGED')),
  incident_reported boolean not null default false,
  notes text,
  photo_paths text[] not null default '{}',
  inspected_by uuid default auth.uid() references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==========================================================================
-- 6. Documents
-- ==========================================================================

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'OTHER'
    check (category in ('CONTRACT', 'OWNER', 'PROPERTY', 'GUEST', 'INVOICE', 'REPORT', 'OTHER')),
  title text not null check (length(btrim(title)) > 0),
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  owner_id uuid references public.owners(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  reservation_id uuid references public.reservations(id) on delete set null,
  guest_id uuid references public.guests(id) on delete set null,
  visible_to_owner boolean not null default false,
  expires_on date,
  uploaded_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index documents_owner_idx on public.documents (owner_id);
create index documents_property_idx on public.documents (property_id);
create index documents_reservation_idx on public.documents (reservation_id);

-- ==========================================================================
-- 7. Support
-- ==========================================================================

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  subject text not null check (length(btrim(subject)) between 1 and 140),
  category text not null default 'OTHER' check (category in ('TECHNICAL', 'OPERATIONS', 'BILLING', 'OTHER')),
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'OPEN' check (status in ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_tickets_creator_idx on public.support_tickets (created_by, last_message_at desc);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index support_messages_ticket_idx on public.support_messages (ticket_id, created_at);

-- ==========================================================================
-- 8. Marketing (manual metrics; no ad platform is connected)
-- ==========================================================================

create table public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  property_id uuid references public.properties(id) on delete set null,
  objective text not null default 'BOOKINGS' check (objective in ('BOOKINGS', 'LEADS', 'TRAFFIC', 'AWARENESS', 'MESSAGES')),
  channel text not null default 'META' check (channel in ('META', 'GOOGLE', 'TIKTOK', 'INSTAGRAM', 'OTHER')),
  budget numeric(12, 2) not null default 0 check (budget >= 0),
  starts_on date,
  ends_on date,
  audience text,
  landing_url text check (landing_url is null or landing_url ~* '^https://'),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED')),
  created_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.marketing_metrics (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  metric_date date not null,
  spend numeric(12, 2) not null default 0 check (spend >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  reach integer not null default 0 check (reach >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  leads integer not null default 0 check (leads >= 0),
  bookings integer not null default 0 check (bookings >= 0),
  revenue numeric(12, 2) not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now(),
  unique (campaign_id, metric_date)
);

-- ==========================================================================
-- 9. updated_at maintenance
-- ==========================================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'owners', 'properties', 'property_access', 'guests', 'reservations', 'expenses', 'tasks',
    'contract_templates', 'checkin_settings', 'checkins', 'checkouts', 'support_tickets', 'marketing_campaigns'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at',
      table_name
    );
  end loop;
end;
$$;

-- ==========================================================================
-- 10. Ownership helpers (SECURITY DEFINER to avoid recursive RLS)
-- ==========================================================================

create function public.current_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.id from public.owners o where o.profile_id = auth.uid() limit 1;
$$;

create function public.owns_property(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.property_owners po
    join public.owners o on o.id = po.owner_id
    join public.profiles pr on pr.id = o.profile_id
    where po.property_id = p_property_id
      and o.profile_id = auth.uid()
      and pr.is_active
  );
$$;

-- Names of staff members tasks can be assigned to, without granting users.view.
create function public.assignable_users()
returns table (id uuid, full_name text, role_codes text[])
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select pr.id,
         nullif(btrim(coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')), '') as full_name,
         array_agg(r.code order by r.code) as role_codes
  from public.profiles pr
  join public.user_roles ur on ur.user_id = pr.id
  join public.roles r on r.id = ur.role_id
  where pr.is_active
    and r.code in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'AGENT', 'TEAM_MEMBER')
    and (public.has_permission('tasks.manage') or public.has_permission('tasks.view') or pr.id = auth.uid())
  group by pr.id, pr.first_name, pr.last_name;
$$;

revoke all on function public.current_owner_id() from public, anon;
revoke all on function public.owns_property(uuid) from public, anon;
revoke all on function public.assignable_users() from public, anon;
grant execute on function public.current_owner_id() to authenticated;
grant execute on function public.owns_property(uuid) to authenticated;
grant execute on function public.assignable_users() to authenticated;

-- ==========================================================================
-- 11. Integrity guards
-- ==========================================================================

-- Assignees without tasks.manage may only move their task forward and add notes.
create function public.guard_task_executor_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.has_permission('tasks.manage') then
    if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
    return new;
  end if;
  if new.property_id is distinct from old.property_id
     or new.reservation_id is distinct from old.reservation_id
     or new.assigned_to is distinct from old.assigned_to
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.priority is distinct from old.priority
     or new.due_at is distinct from old.due_at
     or new.created_by is distinct from old.created_by then
    raise exception 'Seuls le statut et les notes de la tâche peuvent être modifiés' using errcode = '42501';
  end if;
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    new.completed_at := now();
  end if;
  return new;
end;
$$;

create trigger tasks_guard_executor_update
  before update on public.tasks
  for each row
  execute function public.guard_task_executor_update();

-- Blacklisting requires the dedicated guests.blacklist permission.
create function public.guard_guest_blacklist()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' and new.is_blacklisted)
     or (tg_op = 'UPDATE' and (new.is_blacklisted is distinct from old.is_blacklisted
                               or new.blacklist_reason is distinct from old.blacklist_reason)) then
    if auth.uid() is not null and not public.has_permission('guests.blacklist') then
      raise exception 'Permission liste noire requise' using errcode = '42501';
    end if;
    new.blacklisted_at := case when new.is_blacklisted then coalesce(new.blacklisted_at, now()) end;
    if not new.is_blacklisted then
      new.blacklist_reason := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger guests_guard_blacklist
  before insert or update on public.guests
  for each row
  execute function public.guard_guest_blacklist();

-- The default contract can be activated but not edited or deleted.
create function public.guard_locked_contract()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_locked then
      raise exception 'Ce contrat ne peut pas être supprimé' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.is_locked and (new.body is distinct from old.body or new.name is distinct from old.name
                        or new.kind is distinct from old.kind or new.is_locked is distinct from old.is_locked) then
    raise exception 'Ce contrat ne peut pas être modifié' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger contract_templates_guard_locked
  before update or delete on public.contract_templates
  for each row
  execute function public.guard_locked_contract();

-- Activating a template deactivates the previous one (single active contract).
create function public.activate_contract_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_permission('contracts.manage') then
    raise exception 'Permission contrats requise' using errcode = '42501';
  end if;
  if not exists (select 1 from public.contract_templates where id = p_template_id) then
    raise exception 'Contrat introuvable' using errcode = 'P0002';
  end if;
  update public.contract_templates set is_active = false where is_active and id <> p_template_id;
  update public.contract_templates set is_active = true where id = p_template_id;
end;
$$;

revoke all on function public.activate_contract_template(uuid) from public, anon;
grant execute on function public.activate_contract_template(uuid) to authenticated;

-- Every reservation gets its own check-in link.
create function public.create_reservation_checkin()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.checkins (reservation_id, expires_at)
  values (new.id, greatest(now() + interval '7 days', (new.check_out + 1)::timestamptz))
  on conflict (reservation_id) do nothing;
  return new;
end;
$$;

create trigger reservations_create_checkin
  after insert on public.reservations
  for each row
  execute function public.create_reservation_checkin();

-- Reviewing a check-in updates the guest file (creating it when needed).
create function public.sync_checkin_review()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guest_id uuid;
  v_first text;
  v_last text;
begin
  if new.status is not distinct from old.status or new.status not in ('VERIFIED', 'REJECTED', 'SUBMITTED') then
    return new;
  end if;

  if new.status in ('VERIFIED', 'REJECTED') then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  select guest_id into v_guest_id from public.reservations where id = new.reservation_id;

  if v_guest_id is null and new.status = 'VERIFIED' and new.guest_full_name is not null then
    v_first := split_part(btrim(new.guest_full_name), ' ', 1);
    v_last := nullif(btrim(substr(btrim(new.guest_full_name), length(v_first) + 1)), '');
    insert into public.guests (first_name, last_name, email, phone, nationality)
    values (v_first, coalesce(v_last, v_first), new.guest_email, new.guest_phone, new.nationality)
    returning id into v_guest_id;
    update public.reservations set guest_id = v_guest_id where id = new.reservation_id;
  end if;

  if v_guest_id is not null then
    update public.guests
    set verification_status = case new.status when 'SUBMITTED' then 'PENDING' else new.status end,
        document_type = coalesce(new.document_type, document_type),
        document_number = coalesce(new.document_number, document_number)
    where id = v_guest_id;
  end if;

  return new;
end;
$$;

create trigger checkins_sync_review
  before update of status on public.checkins
  for each row
  execute function public.sync_checkin_review();

revoke all on function public.guard_task_executor_update() from public, anon, authenticated;
revoke all on function public.guard_guest_blacklist() from public, anon, authenticated;
revoke all on function public.create_reservation_checkin() from public, anon, authenticated;
revoke all on function public.sync_checkin_review() from public, anon, authenticated;

-- ==========================================================================
-- 12. Row Level Security
-- ==========================================================================

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'owners', 'properties', 'property_owners', 'property_access', 'property_listings', 'property_images',
    'guests', 'reservations', 'expenses', 'tasks', 'contract_templates', 'checkin_settings', 'checkins',
    'checkouts', 'documents', 'support_tickets', 'support_messages', 'marketing_campaigns', 'marketing_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
  end loop;
end;
$$;

-- owners: staff only (internal notes are never exposed to the owner portal).
create policy owners_select on public.owners for select to authenticated
  using (public.has_permission('owners.view'));
create policy owners_insert on public.owners for insert to authenticated
  with check (public.has_permission('owners.manage'));
create policy owners_update on public.owners for update to authenticated
  using (public.has_permission('owners.manage')) with check (public.has_permission('owners.manage'));
create policy owners_delete on public.owners for delete to authenticated
  using (public.has_permission('owners.manage'));

-- properties: staff, or the owner of the property.
create policy properties_select on public.properties for select to authenticated
  using (public.has_permission('properties.view') or public.owns_property(id));
create policy properties_insert on public.properties for insert to authenticated
  with check (public.has_permission('properties.manage'));
create policy properties_update on public.properties for update to authenticated
  using (public.has_permission('properties.manage')) with check (public.has_permission('properties.manage'));
create policy properties_delete on public.properties for delete to authenticated
  using (public.has_permission('properties.manage'));

create policy property_owners_select on public.property_owners for select to authenticated
  using (public.has_permission('properties.view') or public.has_permission('owners.view') or public.owns_property(property_id));
create policy property_owners_write on public.property_owners for all to authenticated
  using (public.has_permission('properties.manage')) with check (public.has_permission('properties.manage'));

create policy property_access_select on public.property_access for select to authenticated
  using (public.has_permission('properties.access.view'));
create policy property_access_write on public.property_access for all to authenticated
  using (public.has_permission('properties.manage')) with check (public.has_permission('properties.manage'));

create policy property_listings_select on public.property_listings for select to authenticated
  using (public.has_permission('properties.view') or public.owns_property(property_id));
create policy property_listings_write on public.property_listings for all to authenticated
  using (public.has_permission('properties.manage')) with check (public.has_permission('properties.manage'));

create policy property_images_select on public.property_images for select to authenticated
  using (public.has_permission('properties.view') or public.owns_property(property_id));
create policy property_images_write on public.property_images for all to authenticated
  using (public.has_permission('properties.manage')) with check (public.has_permission('properties.manage'));

-- guests: staff only (owners never see guest personal data).
create policy guests_select on public.guests for select to authenticated
  using (public.has_permission('guests.view'));
create policy guests_insert on public.guests for insert to authenticated
  with check (public.has_permission('guests.manage'));
create policy guests_update on public.guests for update to authenticated
  using (public.has_permission('guests.manage') or public.has_permission('guests.blacklist'))
  with check (public.has_permission('guests.manage') or public.has_permission('guests.blacklist'));
create policy guests_delete on public.guests for delete to authenticated
  using (public.has_permission('guests.manage'));

-- reservations: staff, or the owner of the property (read-only).
create policy reservations_select on public.reservations for select to authenticated
  using (public.has_permission('reservations.view') or public.owns_property(property_id));
create policy reservations_insert on public.reservations for insert to authenticated
  with check (public.has_permission('reservations.manage'));
create policy reservations_update on public.reservations for update to authenticated
  using (public.has_permission('reservations.manage')) with check (public.has_permission('reservations.manage'));
create policy reservations_delete on public.reservations for delete to authenticated
  using (public.has_permission('reservations.manage'));

-- expenses: finance staff, or the owner for expenses charged to them.
create policy expenses_select on public.expenses for select to authenticated
  using (public.has_permission('finance.view') or (charged_to_owner and public.owns_property(property_id)));
create policy expenses_write on public.expenses for all to authenticated
  using (public.has_permission('finance.manage')) with check (public.has_permission('finance.manage'));

-- tasks: supervisors, the assignee, or the owner of the property (read-only).
create policy tasks_select on public.tasks for select to authenticated
  using (
    public.has_permission('tasks.view')
    or (assigned_to = auth.uid() and public.has_permission('tasks.execute'))
    or public.owns_property(property_id)
  );
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.has_permission('tasks.manage'));
create policy tasks_update on public.tasks for update to authenticated
  using (public.has_permission('tasks.manage') or (assigned_to = auth.uid() and public.has_permission('tasks.execute')))
  with check (public.has_permission('tasks.manage') or (assigned_to = auth.uid() and public.has_permission('tasks.execute')));
create policy tasks_delete on public.tasks for delete to authenticated
  using (public.has_permission('tasks.manage'));

-- contracts and check-in settings.
create policy contract_templates_select on public.contract_templates for select to authenticated
  using (public.has_permission('contracts.manage') or public.has_permission('checkins.view'));
create policy contract_templates_write on public.contract_templates for all to authenticated
  using (public.has_permission('contracts.manage')) with check (public.has_permission('contracts.manage'));

create policy checkin_settings_select on public.checkin_settings for select to authenticated
  using (public.has_permission('checkins.view') or public.has_permission('settings.manage'));
create policy checkin_settings_update on public.checkin_settings for update to authenticated
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

-- checkins: staff only (identity documents are never shown to owners).
create policy checkins_select on public.checkins for select to authenticated
  using (public.has_permission('checkins.view'));
create policy checkins_insert on public.checkins for insert to authenticated
  with check (public.has_permission('checkins.manage') or public.has_permission('reservations.manage'));
create policy checkins_update on public.checkins for update to authenticated
  using (public.has_permission('checkins.manage')) with check (public.has_permission('checkins.manage'));

-- checkouts: staff and field agents record them; owners can read their properties' reports.
create policy checkouts_select on public.checkouts for select to authenticated
  using (
    public.has_permission('checkins.view')
    or exists (select 1 from public.reservations r where r.id = reservation_id and public.owns_property(r.property_id))
  );
create policy checkouts_write on public.checkouts for all to authenticated
  using (public.has_permission('checkins.manage') or public.has_permission('tasks.execute'))
  with check (public.has_permission('checkins.manage') or public.has_permission('tasks.execute'));

-- documents: staff, or owners for documents explicitly shared with them.
create policy documents_select on public.documents for select to authenticated
  using (
    public.has_permission('documents.view')
    or (visible_to_owner and (owner_id = public.current_owner_id() or (property_id is not null and public.owns_property(property_id))))
  );
create policy documents_insert on public.documents for insert to authenticated
  with check (public.has_permission('documents.manage'));
create policy documents_update on public.documents for update to authenticated
  using (public.has_permission('documents.manage')) with check (public.has_permission('documents.manage'));
create policy documents_delete on public.documents for delete to authenticated
  using (public.has_permission('documents.manage'));

-- support: the author of a ticket and support staff.
create policy support_tickets_select on public.support_tickets for select to authenticated
  using (created_by = auth.uid() or public.has_permission('support.manage'));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (created_by = auth.uid());
create policy support_tickets_update on public.support_tickets for update to authenticated
  using (public.has_permission('support.manage') or created_by = auth.uid())
  with check (public.has_permission('support.manage') or created_by = auth.uid());

create policy support_messages_select on public.support_messages for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id and (t.created_by = auth.uid() or public.has_permission('support.manage'))
  ));
create policy support_messages_insert on public.support_messages for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id
        and t.status <> 'CLOSED'
        and (t.created_by = auth.uid() or public.has_permission('support.manage'))
    )
  );

-- Ticket authors may only close their own ticket, not change its other fields.
-- SECURITY INVOKER on purpose: current_user is 'authenticated' for API
-- requests, but the function owner when touch_support_ticket() updates the row.
create function public.guard_support_ticket_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user <> 'authenticated' or public.has_permission('support.manage') then
    return new;
  end if;
  if new.subject is distinct from old.subject
     or new.category is distinct from old.category
     or new.priority is distinct from old.priority
     or new.created_by is distinct from old.created_by
     or (new.status is distinct from old.status and new.status <> 'CLOSED') then
    raise exception 'Vous pouvez uniquement clôturer votre demande' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_support_ticket_update() from public, anon, authenticated;

create trigger support_tickets_guard_update
  before update on public.support_tickets
  for each row
  execute function public.guard_support_ticket_update();

create function public.touch_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.support_tickets
  set last_message_at = new.created_at,
      status = case
        when status in ('RESOLVED', 'PENDING') and new.author_id = created_by then 'OPEN'
        else status
      end
  where id = new.ticket_id;
  return new;
end;
$$;

revoke all on function public.touch_support_ticket() from public, anon, authenticated;

create trigger support_messages_touch_ticket
  after insert on public.support_messages
  for each row
  execute function public.touch_support_ticket();

-- marketing
create policy marketing_campaigns_select on public.marketing_campaigns for select to authenticated
  using (public.has_permission('marketing.view'));
create policy marketing_campaigns_write on public.marketing_campaigns for all to authenticated
  using (public.has_permission('marketing.manage')) with check (public.has_permission('marketing.manage'));
create policy marketing_metrics_select on public.marketing_metrics for select to authenticated
  using (public.has_permission('marketing.view'));
create policy marketing_metrics_write on public.marketing_metrics for all to authenticated
  using (public.has_permission('marketing.manage')) with check (public.has_permission('marketing.manage'));

-- ==========================================================================
-- 13. Reference data: default contract (locked, active)
-- ==========================================================================

insert into public.contract_templates (name, kind, body, is_active, is_locked) values (
  'Contrat de location par défaut',
  'DEFAULT',
  $contract$CONTRAT DE LOCATION SAISONNIÈRE

Référence : {{reservation_reference}}

1. Parties
Le présent contrat est conclu entre {{company_name}}, agissant pour le compte du propriétaire du logement, et {{guest_full_name}} (pièce n° {{guest_document_number}}), ci-après « le Locataire ».

2. Logement
{{property_name}}, {{property_address}}, {{property_city}}.

3. Durée du séjour
Du {{check_in}} au {{check_out}} ({{nights}} nuit(s)), pour {{guests_count}} voyageur(s) au maximum.

4. Obligations du Locataire
Le Locataire s'engage à :
• utiliser le logement paisiblement et le restituer dans l'état où il l'a reçu ;
• respecter le nombre maximal de voyageurs prévu à la réservation ;
• respecter le règlement intérieur du logement et la tranquillité du voisinage ;
• respecter les lois et règlements en vigueur au Maroc ;
• signaler sans délai tout dommage ou dysfonctionnement.

5. Responsabilité
Le Locataire est responsable des dégradations causées pendant le séjour. Le gestionnaire ne peut être tenu responsable des objets personnels perdus ou volés dans le logement.

6. Signature électronique
Le Locataire reconnaît que la signature électronique du présent contrat a la même valeur qu'une signature manuscrite. La date et l'heure de signature ainsi que les informations fournies lors de l'enregistrement sont conservées comme preuve.

Fait le {{today}}.$contract$,
  true,
  true
);
