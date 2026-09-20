// Typed authentication/authorization domain errors.
// UI layers must catch these and render safe, translated messages instead of
// forwarding raw Supabase/PostgreSQL error text to end users.

export abstract class AuthError extends Error {
  abstract readonly code: string;
}

export class InvalidCredentialsError extends AuthError {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Invalid email or password.');
  }
}

export class SessionExpiredError extends AuthError {
  readonly code = 'SESSION_EXPIRED';
  constructor() {
    super('The session has expired.');
  }
}

export class InactiveUserError extends AuthError {
  readonly code = 'INACTIVE_USER';
  constructor() {
    super('This user account is disabled.');
  }
}

export class UnauthorizedError extends AuthError {
  readonly code = 'UNAUTHORIZED';
  constructor() {
    super('Authentication is required.');
  }
}

export class ForbiddenError extends AuthError {
  readonly code = 'FORBIDDEN';
  constructor(public readonly permission?: string) {
    super('You do not have permission to perform this action.');
  }
}

export class PasswordResetError extends AuthError {
  readonly code = 'PASSWORD_RESET_ERROR';
  constructor() {
    super('Unable to process the password reset request.');
  }
}

export class AuthNetworkError extends AuthError {
  readonly code = 'NETWORK_ERROR';
  constructor() {
    super('A network error occurred during authentication.');
  }
}
