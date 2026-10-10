import type { AuthorizationContext, PermissionCode } from '../auth/types';
import { PERMISSIONS } from '../auth/types';
import { hasAnyPermission, hasPermission } from '../auth/permissions';

// Role-aware application menu shared by Web and Mobile. Clients map each item
// `id` to their own route and icon. Frontend checks are UX only: RLS decides access.

export interface NavItemDef {
  /** Route segment under /app on the Web, e.g. 'reservations'. */
  id: string;
  label: string;
  /** Empty means visible to every signed-in user. */
  anyOf: PermissionCode[];
  portalOnly?: boolean;
}

export interface NavSectionDef {
  title: string;
  items: NavItemDef[];
}

const P = PERMISSIONS;

export const NAV_SECTIONS: readonly NavSectionDef[] = [
  {
    title: 'Espace',
    items: [
      { id: 'dashboard', label: 'Tableau de bord', anyOf: [P.DASHBOARD_VIEW] },
      { id: 'portal', label: 'Mon espace', anyOf: [P.OWNER_PORTAL], portalOnly: true },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { id: 'properties', label: 'Biens', anyOf: [P.PROPERTIES_VIEW, P.OWNER_PORTAL] },
      { id: 'reservations', label: 'Réservations', anyOf: [P.RESERVATIONS_VIEW, P.OWNER_PORTAL] },
      { id: 'calendar', label: 'Calendrier', anyOf: [P.RESERVATIONS_VIEW, P.OWNER_PORTAL] },
      { id: 'guests', label: 'Voyageurs', anyOf: [P.GUESTS_VIEW] },
      { id: 'tasks', label: 'Tâches', anyOf: [P.TASKS_VIEW, P.TASKS_EXECUTE, P.OWNER_PORTAL] },
      { id: 'checkins', label: 'Check-in / Check-out', anyOf: [P.CHECKINS_VIEW] },
      { id: 'blacklist', label: 'Liste noire', anyOf: [P.GUESTS_VIEW] },
    ],
  },
  {
    title: 'Propriétaires',
    items: [
      { id: 'owners', label: 'Propriétaires', anyOf: [P.OWNERS_VIEW] },
      { id: 'finance', label: 'Revenus & finances', anyOf: [P.FINANCE_VIEW, P.OWNER_PORTAL] },
      { id: 'documents', label: 'Documents', anyOf: [P.DOCUMENTS_VIEW, P.OWNER_PORTAL] },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { id: 'marketing', label: 'Campagnes & analytics', anyOf: [P.MARKETING_VIEW] },
      { id: 'leads', label: 'Demandes', anyOf: [P.MARKETING_VIEW] },
    ],
  },
  {
    title: 'Pilotage',
    items: [
      { id: 'reports', label: 'Rapports', anyOf: [P.REPORTS_VIEW] },
      { id: 'import', label: 'Import', anyOf: [P.IMPORT_RUN] },
      { id: 'notifications', label: 'Notifications', anyOf: [] },
      { id: 'support', label: 'Support', anyOf: [] },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { id: 'contracts', label: 'Contrats', anyOf: [P.CONTRACTS_MANAGE] },
      { id: 'verification-settings', label: 'Vérification', anyOf: [P.SETTINGS_MANAGE] },
      { id: 'users', label: 'Utilisateurs', anyOf: [P.USERS_VIEW] },
      { id: 'roles', label: 'Rôles', anyOf: [P.ROLES_VIEW, P.ROLES_MANAGE] },
      { id: 'audit', label: 'Audit', anyOf: [P.AUDIT_VIEW] },
    ],
  },
];

// Owner-portal users read their own data through RLS ownership checks; screens
// then hide staff-only data (guests, internal notes, check-in documents).
export function isPortalUser(user: AuthorizationContext | null | undefined): boolean {
  return hasPermission(user, PERMISSIONS.OWNER_PORTAL) && !hasPermission(user, PERMISSIONS.PROPERTIES_VIEW);
}

export function isNavItemVisible(user: AuthorizationContext | null | undefined, item: NavItemDef): boolean {
  const portal = isPortalUser(user);
  return (!item.portalOnly || portal) && (item.anyOf.length === 0 || hasAnyPermission(user, item.anyOf));
}

export function visibleNavSections(user: AuthorizationContext | null | undefined): NavSectionDef[] {
  return NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter((item) => isNavItemVisible(user, item)) })).filter(
    (section) => section.items.length > 0,
  );
}
