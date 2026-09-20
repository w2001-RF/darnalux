-- Phase 1: authentication, profiles, roles, permissions, RLS.
--
-- Design notes:
-- * DarnaLux is a single organization (no multi-tenant scoping needed).
-- * Public self-signup is disabled (see supabase/config.toml auth.enable_signup = false);
--   accounts are provisioned by administrators via Supabase Auth, so the default role
--   assigned below is intentionally the lowest-privilege role (OWNER), never an admin role.
-- * has_role()/has_permission() are SECURITY DEFINER so they can be reused inside RLS
--   policies without causing recursive RLS evaluation on profiles/user_roles.

-- ==========================================================================
-- 1. Tables
-- ==========================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index user_roles_role_id_idx on public.user_roles(role_id);
create index role_permissions_permission_id_idx on public.role_permissions(permission_id);

-- ==========================================================================
-- 2. updated_at maintenance for profiles
-- ==========================================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ==========================================================================
-- 3. Reference data: roles and permissions (Phase 1 scope only)
-- ==========================================================================

insert into public.roles (code, name, description) values
  ('SUPER_ADMIN', 'Super administrateur', 'Accès complet à la plateforme.'),
  ('ADMIN', 'Administrateur', 'Gestion des utilisateurs, rôles et permissions.'),
  ('MANAGER', 'Manager', 'Accès de supervision opérationnelle.'),
  ('AGENT', 'Agent', 'Membre d''équipe opérationnel.'),
  ('TEAM_MEMBER', 'Membre d''équipe', 'Membre d''équipe.'),
  ('OWNER', 'Propriétaire', 'Propriétaire de biens DarnaLux.');

insert into public.permissions (code, name, description) values
  ('dashboard.view', 'Voir le dashboard', 'Accès au tableau de bord authentifié.'),
  ('users.view', 'Voir les utilisateurs', 'Consulter la liste et les profils utilisateurs.'),
  ('users.create', 'Créer des utilisateurs', 'Provisionner de nouveaux comptes.'),
  ('users.update', 'Modifier les utilisateurs', 'Modifier profils et statut actif/inactif.'),
  ('users.disable', 'Désactiver les utilisateurs', 'Désactiver un compte utilisateur.'),
  ('roles.view', 'Voir les rôles', 'Consulter les rôles disponibles.'),
  ('roles.manage', 'Gérer les rôles', 'Créer/modifier les rôles.'),
  ('permissions.view', 'Voir les permissions', 'Consulter les permissions disponibles.'),
  ('permissions.manage', 'Gérer les permissions', 'Modifier les permissions et leur attribution aux rôles.'),
  ('profile.view', 'Voir son profil', 'Consulter son propre profil.'),
  ('profile.update', 'Modifier son profil', 'Modifier son propre profil.');

-- SUPER_ADMIN: full Phase 1 administrative scope.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'SUPER_ADMIN';

-- ADMIN: user/role/permission administration + profile.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.code in (
    'dashboard.view', 'users.view', 'users.create', 'users.update', 'users.disable',
    'roles.view', 'permissions.view', 'profile.view', 'profile.update'
  )
where r.code = 'ADMIN';

-- MANAGER: basic dashboard + own profile access.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.code in ('dashboard.view', 'profile.view', 'profile.update')
where r.code = 'MANAGER';

-- AGENT / TEAM_MEMBER / OWNER: own profile access only (no administrative permissions).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p
  on p.code in ('profile.view', 'profile.update')
where r.code in ('AGENT', 'TEAM_MEMBER', 'OWNER');

-- ==========================================================================
-- 4. SECURITY DEFINER helpers for RLS and the Web client
--
-- These functions run with the privileges of their owner (bypassing RLS
-- internally) so that RLS policies on profiles/user_roles/role_permissions can
-- call them without triggering recursive RLS evaluation. search_path is
-- pinned to prevent search_path hijacking, and EXECUTE is restricted to
-- `authenticated` only (never `anon`).
-- ==========================================================================

create function public.has_role(role_code text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code = role_code
  );
$$;

create function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles pr
    join public.user_roles ur on ur.user_id = pr.id
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.permissions p on p.id = rp.permission_id
    where pr.id = auth.uid()
      and pr.is_active = true
      and p.code = permission_code
  );
$$;

create function public.my_roles()
returns table (code text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.code
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid();
$$;

create function public.my_permissions()
returns table (code text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct p.code
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  join public.profiles pr on pr.id = ur.user_id
  where ur.user_id = auth.uid()
    and pr.is_active = true;
$$;

revoke all on function public.has_role(text) from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.my_roles() from public, anon;
revoke all on function public.my_permissions() from public, anon;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.my_roles() to authenticated;
grant execute on function public.my_permissions() to authenticated;

-- ==========================================================================
-- 5. Automatic profile provisioning + safe default role
--
-- Public self-signup is disabled; accounts are created by administrators via
-- Supabase Auth. The new profile is always assigned the lowest-privilege
-- role (OWNER) by default. Elevated roles must be granted explicitly and
-- separately by an administrator via user_roles, never automatically.
-- ==========================================================================

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  default_role_id uuid;
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  select id into default_role_id from public.roles where code = 'OWNER';

  if default_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, default_role_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- ==========================================================================
-- 6. Row Level Security
-- ==========================================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;

-- profiles: a user can read/update their own profile; users.view/update
-- permission holders can read/update any profile. No insert policy is
-- defined for authenticated clients: profile rows are only ever created by
-- the SECURITY DEFINER trigger above, never directly by a client.
create policy profiles_select_self_or_authorized
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.has_permission('users.view'));

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_authorized
  on public.profiles for update
  to authenticated
  using (public.has_permission('users.update'))
  with check (public.has_permission('users.update'));

-- roles: read restricted to roles.view/manage holders. Every authenticated
-- user can still discover their own role codes via my_roles() (SECURITY
-- DEFINER), so this stays strict without breaking the Web UI.
create policy roles_select_authorized
  on public.roles for select
  to authenticated
  using (public.has_permission('roles.view') or public.has_permission('roles.manage'));

create policy roles_manage_authorized
  on public.roles for all
  to authenticated
  using (public.has_permission('roles.manage'))
  with check (public.has_permission('roles.manage'));

-- permissions: read restricted to permissions.view/manage holders.
create policy permissions_select_authorized
  on public.permissions for select
  to authenticated
  using (public.has_permission('permissions.view') or public.has_permission('permissions.manage'));

create policy permissions_manage_authorized
  on public.permissions for all
  to authenticated
  using (public.has_permission('permissions.manage'))
  with check (public.has_permission('permissions.manage'));

-- user_roles: a user can see their own role assignments; users.view holders
-- can see all. Mutations require users.update AND must never target the
-- acting user's own row, so an administrator cannot grant/revoke their own
-- roles (prevents self privilege escalation).
create policy user_roles_select_self_or_authorized
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.has_permission('users.view'));

create policy user_roles_insert_authorized
  on public.user_roles for insert
  to authenticated
  with check (public.has_permission('users.update') and user_id <> auth.uid());

create policy user_roles_delete_authorized
  on public.user_roles for delete
  to authenticated
  using (public.has_permission('users.update') and user_id <> auth.uid());

-- role_permissions: read restricted to permissions/roles viewers; mutations
-- require the explicit permissions.manage permission (SUPER_ADMIN only by
-- default). The Phase 1 Web UI exposes this data read-only.
create policy role_permissions_select_authorized
  on public.role_permissions for select
  to authenticated
  using (public.has_permission('permissions.view') or public.has_permission('roles.view'));

create policy role_permissions_manage_authorized
  on public.role_permissions for all
  to authenticated
  using (public.has_permission('permissions.manage'))
  with check (public.has_permission('permissions.manage'));
