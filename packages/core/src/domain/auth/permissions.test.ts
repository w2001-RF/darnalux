import { describe, expect, it } from 'vitest';
import { hasAllPermissions, hasAnyPermission, hasPermission, hasRole } from './permissions';
import type { AuthorizationContext } from './types';

function context(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    isActive: true,
    roles: ['OWNER'],
    permissions: ['profile.view', 'profile.update'],
    ...overrides,
  };
}

describe('hasPermission', () => {
  it('returns true when the permission exists', () => {
    expect(hasPermission(context(), 'profile.view')).toBe(true);
  });

  it('returns false when the permission is missing', () => {
    expect(hasPermission(context(), 'users.view')).toBe(false);
  });

  it('returns false for an inactive user even if the permission exists', () => {
    expect(hasPermission(context({ isActive: false }), 'profile.view')).toBe(false);
  });

  it('returns false for a null/undefined context', () => {
    expect(hasPermission(null, 'profile.view')).toBe(false);
    expect(hasPermission(undefined, 'profile.view')).toBe(false);
  });

  it('returns false when permissions are empty', () => {
    expect(hasPermission(context({ permissions: [] }), 'profile.view')).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  it('returns true when at least one permission matches', () => {
    expect(hasAnyPermission(context(), ['users.view', 'profile.view'])).toBe(true);
  });

  it('returns false when none of the permissions match', () => {
    expect(hasAnyPermission(context(), ['users.view', 'roles.view'])).toBe(false);
  });

  it('returns false for an inactive user', () => {
    expect(hasAnyPermission(context({ isActive: false }), ['profile.view'])).toBe(false);
  });
});

describe('hasAllPermissions', () => {
  it('returns true when every permission matches (multiple permissions)', () => {
    expect(hasAllPermissions(context(), ['profile.view', 'profile.update'])).toBe(true);
  });

  it('returns false when only some permissions match', () => {
    expect(hasAllPermissions(context(), ['profile.view', 'users.view'])).toBe(false);
  });

  it('returns true for an empty permission requirement', () => {
    expect(hasAllPermissions(context(), [])).toBe(true);
  });

  it('returns false for an inactive user', () => {
    expect(hasAllPermissions(context({ isActive: false }), ['profile.view'])).toBe(false);
  });
});

describe('hasRole', () => {
  it('supports multiple roles', () => {
    expect(hasRole(context({ roles: ['ADMIN', 'MANAGER'] }), 'MANAGER')).toBe(true);
    expect(hasRole(context({ roles: ['ADMIN', 'MANAGER'] }), 'OWNER')).toBe(false);
  });
});
