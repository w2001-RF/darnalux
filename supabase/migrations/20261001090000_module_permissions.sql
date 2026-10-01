-- Operations platform (SPEC-001): module permissions and their role mapping.
--
-- * Permissions stay data-driven; codes mirror PERMISSIONS in @darnalux/core.
-- * OWNER accounts get no global *.view permission: they reach their own
--   data through ownership checks in RLS (see owns_property()).
-- * Also closes a gap from Phase 1: a user could flip their own
--   profiles.is_active through the profiles_update_self policy.

insert into public.permissions (code, name, description) values
  ('owners.view', 'Voir les propriétaires', 'Consulter les fiches propriétaires.'),
  ('owners.manage', 'Gérer les propriétaires', 'Créer, modifier et archiver les propriétaires.'),
  ('properties.view', 'Voir les biens', 'Consulter les biens et leurs annonces.'),
  ('properties.manage', 'Gérer les biens', 'Créer et modifier les biens, photos, annonces et accès.'),
  ('properties.access.view', 'Voir les accès sensibles', 'Codes, clés, Wi-Fi et procédures des biens.'),
  ('reservations.view', 'Voir les réservations', 'Consulter réservations et calendrier.'),
  ('reservations.manage', 'Gérer les réservations', 'Créer, modifier et annuler des réservations.'),
  ('guests.view', 'Voir les voyageurs', 'Consulter les fiches voyageurs.'),
  ('guests.manage', 'Gérer les voyageurs', 'Créer et modifier les fiches voyageurs.'),
  ('guests.blacklist', 'Gérer la liste noire', 'Ajouter ou retirer un voyageur de la liste noire.'),
  ('tasks.view', 'Voir toutes les tâches', 'Consulter toutes les tâches et interventions.'),
  ('tasks.manage', 'Gérer les tâches', 'Créer, assigner et modifier les tâches.'),
  ('tasks.execute', 'Exécuter ses tâches', 'Mettre à jour le statut des tâches qui vous sont assignées.'),
  ('checkins.view', 'Voir les check-ins', 'Consulter les check-in/check-out et pièces fournies.'),
  ('checkins.manage', 'Gérer les check-ins', 'Valider ou refuser les vérifications voyageurs.'),
  ('contracts.manage', 'Gérer les contrats', 'Modifier et activer les modèles de contrat.'),
  ('finance.view', 'Voir les finances', 'Consulter revenus, commissions et dépenses.'),
  ('finance.manage', 'Gérer les finances', 'Saisir et modifier les dépenses.'),
  ('documents.view', 'Voir les documents', 'Consulter les documents.'),
  ('documents.manage', 'Gérer les documents', 'Ajouter et supprimer des documents.'),
  ('marketing.view', 'Voir le marketing', 'Consulter campagnes et performances.'),
  ('marketing.manage', 'Gérer le marketing', 'Créer des campagnes et saisir leurs métriques.'),
  ('reports.view', 'Voir les rapports', 'Consulter les rapports.'),
  ('reports.export', 'Exporter', 'Exporter les données en CSV/PDF.'),
  ('import.run', 'Importer', 'Importer biens, propriétaires et réservations.'),
  ('settings.manage', 'Gérer les paramètres', 'Paramètres de vérification et configuration.'),
  ('audit.view', 'Voir l''audit', 'Consulter l''historique des actions.'),
  ('support.manage', 'Gérer le support', 'Répondre et clôturer les demandes de support.'),
  ('owner_portal.view', 'Espace propriétaire', 'Accéder à son espace propriétaire.')
on conflict (code) do nothing;

-- SUPER_ADMIN keeps every permission, including the new ones.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'SUPER_ADMIN'
on conflict do nothing;

-- ADMIN: every module permission (role/permission management stays SUPER_ADMIN only).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'owners.view', 'owners.manage', 'properties.view', 'properties.manage', 'properties.access.view',
  'reservations.view', 'reservations.manage', 'guests.view', 'guests.manage', 'guests.blacklist',
  'tasks.view', 'tasks.manage', 'tasks.execute', 'checkins.view', 'checkins.manage', 'contracts.manage',
  'finance.view', 'finance.manage', 'documents.view', 'documents.manage', 'marketing.view', 'marketing.manage',
  'reports.view', 'reports.export', 'import.run', 'settings.manage', 'audit.view', 'support.manage'
)
where r.code = 'ADMIN'
on conflict do nothing;

-- MANAGER: day-to-day operations supervision, read-only finance/marketing.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'owners.view', 'owners.manage', 'properties.view', 'properties.manage', 'properties.access.view',
  'reservations.view', 'reservations.manage', 'guests.view', 'guests.manage', 'guests.blacklist',
  'tasks.view', 'tasks.manage', 'tasks.execute', 'checkins.view', 'checkins.manage',
  'finance.view', 'documents.view', 'documents.manage', 'marketing.view', 'reports.view', 'reports.export'
)
where r.code = 'MANAGER'
on conflict do nothing;

-- AGENT: field operations (check-in/out, assigned tasks, property access info).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in (
  'dashboard.view', 'properties.view', 'properties.access.view', 'reservations.view',
  'guests.view', 'tasks.execute', 'checkins.view'
)
where r.code = 'AGENT'
on conflict do nothing;

-- TEAM_MEMBER: assigned tasks only.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('dashboard.view', 'properties.view', 'tasks.execute')
where r.code = 'TEAM_MEMBER'
on conflict do nothing;

-- OWNER: owner portal only; data scope enforced by ownership in RLS.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.code in ('owner_portal.view')
where r.code = 'OWNER'
on conflict do nothing;

-- A user may edit their own name/phone, but never their own activation flag.
-- Requests without a JWT (SQL editor, service role) are not restricted.
create function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Identifiant de profil non modifiable' using errcode = '42501';
  end if;
  if new.is_active is distinct from old.is_active
     and auth.uid() is not null
     and not public.has_permission('users.update') then
    raise exception 'Modification du statut du compte non autorisée' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_profile_update() from public, anon, authenticated;

create trigger profiles_guard_update
  before update on public.profiles
  for each row
  execute function public.guard_profile_update();
