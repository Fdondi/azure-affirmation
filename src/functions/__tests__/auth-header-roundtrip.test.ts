import { encodeClientPrincipalForHeader, parseAuthenticatedUserFromHeaders } from '../shared/auth';

describe('Auth header roundtrip (frontend -> function)', () => {
  const clientPrincipal = {
    identityProvider: 'aad',
    userId: 'test-user-id',
    userDetails: 'francesco.dondi@hotmail.com',
    userRoles: ['anonymous', 'authenticated']
  };

  test('X-User-Token constructed like frontend is parsed by function helper', () => {
    const token = encodeClientPrincipalForHeader(clientPrincipal);

    const headers = {
      'x-user-token': token
    };

    const user = parseAuthenticatedUserFromHeaders(headers);
    expect(user).toBeTruthy();
    expect(user!.userDetails).toBe(clientPrincipal.userDetails);
    expect(user!.userRoles).toContain('authenticated');
  });

  test('x-ms-client-principal constructed is parsed by function helper', () => {
    const token = encodeClientPrincipalForHeader(clientPrincipal);

    const headers = {
      'x-ms-client-principal': token
    };

    const user = parseAuthenticatedUserFromHeaders(headers);
    expect(user).toBeTruthy();
    expect(user!.userDetails).toBe(clientPrincipal.userDetails);
  });

  test('missing headers return null', () => {
    const headers = {} as Record<string, string>;
    const user = parseAuthenticatedUserFromHeaders(headers);
    expect(user).toBeNull();
  });

  test('invalid role is rejected for X-User-Token', () => {
    const cp = { ...clientPrincipal, userRoles: ['anonymous'] };
    const token = encodeClientPrincipalForHeader(cp);
    const headers = { 'x-user-token': token };
    const user = parseAuthenticatedUserFromHeaders(headers);
    expect(user).toBeNull();
  });
});


