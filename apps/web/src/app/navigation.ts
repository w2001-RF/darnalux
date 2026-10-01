import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  History,
  Home,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Ban,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  BarChart3,
  Bell,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PermissionCode } from '@darnalux/core';
import { PERMISSIONS } from '@darnalux/core';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  anyOf: PermissionCode[];
  portalOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const P = PERMISSIONS;

// Navigation from the specification (§40), filtered by permission at render time.
export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Espace',
    items: [
      { to: '/app/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, anyOf: [P.DASHBOARD_VIEW] },
      { to: '/app/portal', label: 'Mon espace', icon: Home, anyOf: [P.OWNER_PORTAL], portalOnly: true },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { to: '/app/properties', label: 'Biens', icon: Building2, anyOf: [P.PROPERTIES_VIEW, P.OWNER_PORTAL] },
      { to: '/app/reservations', label: 'Réservations', icon: ClipboardCheck, anyOf: [P.RESERVATIONS_VIEW, P.OWNER_PORTAL] },
      { to: '/app/calendar', label: 'Calendrier', icon: CalendarDays, anyOf: [P.RESERVATIONS_VIEW, P.OWNER_PORTAL] },
      { to: '/app/guests', label: 'Voyageurs', icon: UsersRound, anyOf: [P.GUESTS_VIEW] },
      { to: '/app/tasks', label: 'Tâches', icon: ClipboardList, anyOf: [P.TASKS_VIEW, P.TASKS_EXECUTE, P.OWNER_PORTAL] },
      { to: '/app/checkins', label: 'Check-in / Check-out', icon: KeyRound, anyOf: [P.CHECKINS_VIEW] },
      { to: '/app/blacklist', label: 'Liste noire', icon: Ban, anyOf: [P.GUESTS_VIEW] },
    ],
  },
  {
    title: 'Propriétaires',
    items: [
      { to: '/app/owners', label: 'Propriétaires', icon: Users, anyOf: [P.OWNERS_VIEW] },
      { to: '/app/finance', label: 'Revenus & finances', icon: Wallet, anyOf: [P.FINANCE_VIEW, P.OWNER_PORTAL] },
      { to: '/app/documents', label: 'Documents', icon: FileText, anyOf: [P.DOCUMENTS_VIEW, P.OWNER_PORTAL] },
    ],
  },
  {
    title: 'Marketing',
    items: [{ to: '/app/marketing', label: 'Campagnes & analytics', icon: Megaphone, anyOf: [P.MARKETING_VIEW] }],
  },
  {
    title: 'Pilotage',
    items: [
      { to: '/app/reports', label: 'Rapports', icon: BarChart3, anyOf: [P.REPORTS_VIEW] },
      { to: '/app/import', label: 'Import', icon: Upload, anyOf: [P.IMPORT_RUN] },
      { to: '/app/notifications', label: 'Notifications', icon: Bell, anyOf: [] },
      { to: '/app/support', label: 'Support', icon: LifeBuoy, anyOf: [] },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { to: '/app/contracts', label: 'Contrats', icon: FileSignature, anyOf: [P.CONTRACTS_MANAGE] },
      { to: '/app/verification-settings', label: 'Vérification', icon: Settings2, anyOf: [P.SETTINGS_MANAGE] },
      { to: '/app/users', label: 'Utilisateurs', icon: UserRound, anyOf: [P.USERS_VIEW] },
      { to: '/app/roles', label: 'Rôles', icon: ShieldCheck, anyOf: [P.ROLES_VIEW, P.ROLES_MANAGE] },
      { to: '/app/audit', label: 'Audit', icon: History, anyOf: [P.AUDIT_VIEW] },
    ],
  },
];
