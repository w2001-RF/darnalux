import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from '../auth/types';
import type { AuthorizationContext } from '../auth/types';
import { NAV_SECTIONS, isPortalUser, visibleNavSections } from './index';

const user = (permissions: AuthorizationContext['permissions']): AuthorizationContext => ({ isActive: true, roles: [], permissions });
const ids = (u: AuthorizationContext | null) => visibleNavSections(u).flatMap((s) => s.items.map((i) => i.id));

describe('navigation', () => {
  it('shows only open items to a signed-out or inactive user', () => {
    expect(ids(null)).toEqual(['notifications', 'support']);
    expect(ids({ ...user([PERMISSIONS.DASHBOARD_VIEW]), isActive: false })).toEqual(['notifications', 'support']);
  });

  it('filters items by permission', () => {
    const list = ids(user([PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.MARKETING_VIEW]));
    expect(list).toContain('dashboard');
    expect(list).toContain('leads');
    expect(list).not.toContain('finance');
  });

  it('shows the portal entry only to owner-portal users', () => {
    const owner = user([PERMISSIONS.OWNER_PORTAL]);
    expect(isPortalUser(owner)).toBe(true);
    expect(ids(owner)).toContain('portal');
    const staff = user([PERMISSIONS.OWNER_PORTAL, PERMISSIONS.PROPERTIES_VIEW]);
    expect(isPortalUser(staff)).toBe(false);
    expect(ids(staff)).not.toContain('portal');
  });

  it('uses unique ids', () => {
    const all = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(all).size).toBe(all.length);
  });
});
