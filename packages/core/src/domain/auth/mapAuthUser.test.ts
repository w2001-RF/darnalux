import { describe, expect, it } from 'vitest';
import { toAuthUser } from './mapAuthUser';

describe('toAuthUser', () => {
  it('maps a profile row with roles and permissions', () => {
    const user = toAuthUser(
      'u1',
      'a@b.c',
      { id: 'u1', first_name: 'Ada', last_name: null, phone: '+212', avatar_url: null, is_active: true },
      ['MANAGER'],
      ['dashboard.view'],
    );
    expect(user).toEqual({
      id: 'u1',
      email: 'a@b.c',
      isActive: true,
      roles: ['MANAGER'],
      permissions: ['dashboard.view'],
      profile: { id: 'u1', firstName: 'Ada', lastName: null, phone: '+212', avatarUrl: null, isActive: true },
    });
  });

  it('keeps inactive flag so callers can reject the account', () => {
    const user = toAuthUser(
      'u2',
      null,
      { id: 'u2', first_name: null, last_name: null, phone: null, avatar_url: null, is_active: false },
      [],
      [],
    );
    expect(user.isActive).toBe(false);
    expect(user.email).toBeNull();
  });
});
