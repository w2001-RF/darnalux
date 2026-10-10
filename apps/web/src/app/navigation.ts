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
  Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PermissionCode } from '@darnalux/core';
import { NAV_SECTIONS as CORE_NAV_SECTIONS } from '@darnalux/core';

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

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  portal: Home,
  properties: Building2,
  reservations: ClipboardCheck,
  calendar: CalendarDays,
  guests: UsersRound,
  tasks: ClipboardList,
  checkins: KeyRound,
  blacklist: Ban,
  owners: Users,
  finance: Wallet,
  documents: FileText,
  marketing: Megaphone,
  leads: Inbox,
  reports: BarChart3,
  import: Upload,
  notifications: Bell,
  support: LifeBuoy,
  contracts: FileSignature,
  'verification-settings': Settings2,
  users: UserRound,
  roles: ShieldCheck,
  audit: History,
};

// Menu structure and permissions come from @darnalux/core; this file only adds routes and icons.
export const NAV_SECTIONS: NavSection[] = CORE_NAV_SECTIONS.map((section) => ({
  title: section.title,
  items: section.items.map((item) => ({
    to: `/app/${item.id}`,
    label: item.label,
    icon: ICONS[item.id] ?? Home,
    anyOf: item.anyOf,
    portalOnly: item.portalOnly,
  })),
}));
