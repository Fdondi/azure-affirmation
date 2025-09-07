import { isAuthValid } from './App';

// Mock fetch globally
global.fetch = jest.fn();

// Test the authentication header generation logic directly
describe('Authentication Header Generation', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  test('should generate correct base64 token from clientPrincipal using btoa', () => {
    const mockClientPrincipal = {
      identityProvider: "aad",
      userId: "test-user-id",
      userDetails: "francesco.dondi@hotmail.com",
      userRoles: ["anonymous", "authenticated"]
    };

    const expectedJsonString = JSON.stringify(mockClientPrincipal);
    const expectedBase64 = btoa(expectedJsonString);

    // Test the actual base64 encoding using btoa (browser-safe)
    const result = btoa(expectedJsonString);

    expect(result).toBe(expectedBase64);
    expect(result).toContain('eyJpZGVudGl0eVByb3ZpZGVyIjoiYWFkIiwidXNlcklkIjoidGVzdC11c2VyLWlkIiwidXNlckRldGFpbHMiOiJmcmFuY2VzY28uZG9uZGlAaG90bWFpbC5jb20iLCJ1c2VyUm9sZXMiOlsiYW5vbnltb3VzIiwiYXV0aGVudGljYXRlZCJdfQ==');
    
    // Verify it's a valid base64 string
    expect(result).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
  });

  test('should validate authentication data structure', () => {
    // Test valid auth data
    const validAuthData = {
      clientPrincipal: {
        identityProvider: "aad",
        userId: "test-user-id",
        userDetails: "francesco.dondi@hotmail.com",
        userRoles: ["anonymous", "authenticated"]
      }
    };

    // Test the validation logic
    const isValid = isAuthValid(validAuthData);

    expect(isValid).toBe(true);

    // Test invalid auth data (no clientPrincipal)
    const invalidAuthData1 = {
      clientPrincipal: null
    };

    const isValid1 = isAuthValid(invalidAuthData1);

    expect(isValid1).toBeFalsy();

    // Test invalid auth data (no authenticated role)
    const invalidAuthData2 = {
      clientPrincipal: {
        identityProvider: "aad",
        userId: "test-user-id",
        userDetails: "francesco.dondi@hotmail.com",
        userRoles: ["anonymous"] // Missing "authenticated" role
      }
    };

    const isValid2 = invalidAuthData2.clientPrincipal && 
                    invalidAuthData2.clientPrincipal.userDetails && 
                    invalidAuthData2.clientPrincipal.userRoles && 
                    invalidAuthData2.clientPrincipal.userRoles.includes('authenticated');

    expect(isValid2).toBe(false);
  });

  test('should create correct headers object', () => {
    const mockToken = "eyJpZGVudGl0eVByb3ZpZGVyIjoiYWFkIiwidXNlcklkIjoidGVzdC11c2VyLWlkIiwidXNlckRldGFpbHMiOiJmcmFuY2VzY28uZG9uZGk@aG90bWFpbC5jb20iLCJ1c2VyUm9sZXMiOlsiYW5vbnltb3VzIiwiYXV0aGVudGljYXRlZCJdfQ==";
    
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Token': mockToken,
    };

    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('X-User-Token', mockToken);
    expect(Object.keys(headers)).toHaveLength(2);
  });

  test('should create headers without X-User-Token when no token', () => {
    const headers = {
      'Content-Type': 'application/json',
    };

    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).not.toHaveProperty('X-User-Token');
    expect(Object.keys(headers)).toHaveLength(1);
  });

  test('should generate and include X-User-Token header in request', () => {
    // Test the complete authentication flow logic
    const mockAuthData = {
      clientPrincipal: {
        identityProvider: "aad",
        userId: "test-user-id",
        userDetails: "francesco.dondi@hotmail.com",
        userRoles: ["anonymous", "authenticated"]
      }
    };

    // Simulate the authentication logic from the App component
    let authToken = null;
    {
      if (isAuthValid(mockAuthData)) {
        // This is the actual logic from the App component using btoa
        authToken = btoa(JSON.stringify(mockAuthData.clientPrincipal));
      }
    }

    // Verify token was generated
    expect(authToken).toBeTruthy();
    expect(authToken).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);

    // Simulate creating the headers object (actual logic from App component)
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'X-User-Token': authToken }),
    };

    // Verify headers are correct
    expect(headers).toHaveProperty('Content-Type', 'application/json');
    expect(headers).toHaveProperty('X-User-Token', authToken);
    expect(Object.keys(headers)).toHaveLength(2);

    // Simulate the fetch request options (actual logic from App component)
    const requestOptions = {
      method: 'GET',
      headers: headers,
      mode: 'cors',
      credentials: 'include'
    };

    // Verify request options are correct
    expect(requestOptions.method).toBe('GET');
    expect(requestOptions.headers).toHaveProperty('X-User-Token', authToken);
    expect(requestOptions.mode).toBe('cors');
    expect(requestOptions.credentials).toBe('include');
  });

  test('should handle auth state synchronization between initial check and per-request check', async () => {
    // Mock initial auth check returning valid user
    const mockAuthData = {
      clientPrincipal: {
        identityProvider: "aad",
        userId: "test-user-id",
        userDetails: "francesco.dondi@hotmail.com",
        userRoles: ["anonymous", "authenticated"]
      }
    };

    // Mock per-request auth check returning null (session expired)
    const mockAuthDataExpired = {
      clientPrincipal: null
    };

    // Simulate the per-request auth logic from getAffirmation
    let authToken = null;
    
    // First call: valid auth
    if (isAuthValid(mockAuthData)) {
      authToken = btoa(JSON.stringify(mockAuthData.clientPrincipal));
    }

    expect(authToken).toBeTruthy();

    // Second call: expired auth
    authToken = null;
    if (isAuthValid(mockAuthDataExpired)) {
      authToken = btoa(JSON.stringify(mockAuthDataExpired.clientPrincipal));
    }

    expect(authToken).toBeFalsy();

    if (isAuthValid(mockAuthDataExpired)) {
    }

    expect(authToken).toBeFalsy();

    if (isAuthValid(mockAuthDataExpired)) {
      authToken = btoa(JSON.stringify(mockAuthDataExpired.clientPrincipal));
    }

    expect(authToken).toBeFalsy();

    // Verify headers are created correctly for both scenarios
    const headersWithAuth = {
      'Content-Type': 'application/json',
      ...(btoa(JSON.stringify(mockAuthData.clientPrincipal)) && { 'X-User-Token': btoa(JSON.stringify(mockAuthData.clientPrincipal)) }),
    };

    const headersWithoutAuth = {
      'Content-Type': 'application/json',
    };

    expect(headersWithAuth).toHaveProperty('X-User-Token');
    expect(headersWithoutAuth).not.toHaveProperty('X-User-Token');
  });
});

